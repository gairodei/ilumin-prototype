/* ============================================================
   N5a — programme-specific observation configuration (architecture approved 20 Oct 2026; PD-N5a-* in PROVISIONAL-DECISIONS.md).
   Each NVQ programme version owns its observation configuration: whether observation is required, whether workplace
   observation is permitted, whether an Academy-office observation is available as the approved alternative (the established
   CH-37 / CH-43 workflow), its own Academy observation criteria (with an explicit mapping to the version's NVQ criteria) and the
   evidence settings of every criterion. NVQ observation criteria are not stored here: they come from the version's structure
   (Learning Outcomes whose type follows the Observation rules). The configuration is edited only in the programme's draft
   (a Draft programme, or a draft version) and is published with it; a published configuration is frozen and never rewritten.
   Workplace observations cover the programme's Academy criteria and the NVQ criteria; Academy-office observations the NVQ
   criteria only (G6.6). Nothing here records or decides an outcome.
   Migration: the shared S3-05 library is left as it is (it still supplies today's observation forms). Each current published
   version gets an independent copy of the library criteria that are Active, on observation forms and attached to it;
   anything else attached is reported, not copied. Older versions have no configuration recorded. Loads after setup-e2.js.
   ============================================================ */
'use strict';

const N5_EV = [['notes', 'Assessor notes'], ['photos', 'Photos'], ['videos', 'Videos'], ['docs', 'Documents'], ['refs', 'Authorised references']];
const N5_CAT = ['Professional conduct', 'Care standards', 'Safeguarding', 'Other'];
const N5 = () => (STORE.n5 = STORE.n5 || { pub: {}, draft: {}, mig: [], done: false });
const n5Ent = pr => `${pr.title} (${pr.id})`;
const n5Log = (pr, action, before, after, r) => logA('NVQ Programmes', n5Ent(pr), action, before, after, r || '');
const n5Clone = o => JSON.parse(JSON.stringify(o));
function n5Freeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(n5Freeze); } return o; }

/* ---------- Who may see and change it ---------- */
// The programme administration roles that already edit NVQ programmes (S3: Super Admin, Academic Admin, System Admin), in the admin portal only
const n5CanEdit = () => S.portal === 'admin' && !!S.signedIn && s3CanEdit();
// Read: those roles, or a custom role with "Courses & Programmes: View" (S5a). Nobody else: Coordinators, Assessors, learners,
// agencies, Finance, Business and IQA have no programme-administration responsibility.
const n5CanView = () => n5CanEdit() || (S.portal === 'admin' && !!S.signedIn && typeof s5Has === 'function' && s5Has('Courses & Programmes', 'V'));

/* ---------- Versions: which configuration is editable ---------- */
// The version number of the programme's editable draft, or null (published only, or retired)
function n5DraftV(pr) {
  if (!pr || pr.status === 'Retired') return null;
  if (pr.status === 'Draft') return pr.version || 1;
  if (pr.chNew) return pr.nextDraft ? pr.version + 1 : null;
  const dv = S3().drafts[pr.id]; return dv ? dv.v : null;
}
const n5DraftTree = pr => (pr.chNew ? ch8Tree(pr.id) : pr.status === 'Draft' ? s3Tree(pr.id) : (s3Draft(pr.id) || {}).tree || []);
const n5PubOf = (pid, v) => ((N5().pub[pid] || {})[v] || null);
const n5PubCur = pr => n5PubOf(pr.id, pr.version);

// NVQ observation criteria of a structure: Learning Outcomes that follow the Observation rules (S3-06), nothing retired
function n5NvqOf(tree) {
  const out = [];
  (tree || []).filter(u => u.status !== 'Retired').forEach(u => u.mods.filter(m => m.status !== 'Retired').forEach(m => m.los.filter(lo => lo.status !== 'Retired' && critKind(lo.type) === 'Observation').forEach(lo => lo.crit.filter(c => c.status !== 'Retired').forEach(c => {
    out.push({ code: c.code, d: c.d, unit: u.code, lo: lo.code, loTitle: lo.title, req: c.evReq || c.ev || '', st: [u, m, lo, c].some(x => x.status === 'Suspended') ? 'Suspended' : 'Active' });
  }))));
  return out;
}
// The NVQ criteria a configuration applies to: frozen at publication, live from the draft structure while editing
const n5Nvq = (pr, cfg) => (!cfg ? [] : cfg.state === 'Published' ? cfg.snap || [] : n5NvqOf(n5DraftTree(pr)));
const n5NvqOk = (pr, cfg) => n5Nvq(pr, cfg).filter(c => c.st === 'Active');

const n5Empty = (pr, v, origin) => ({ pid: pr.id, v, state: 'Draft', required: null, workplace: null, office: null, ia: [], nvq: {}, snap: null, origin, at: now().toISOString(), by: ADMIN && ADMIN.me ? ADMIN.me.name : '' });
// The draft configuration (created on first use): a copy of the current published version's configuration, else empty
function n5Draft(pr) {
  const v = n5DraftV(pr); if (!v) return null; const N = N5(); let d = N.draft[pr.id];
  if (d && d.v === v) return d;
  const base = v > pr.version || pr.status !== 'Draft' ? n5PubCur(pr) : null;
  // A new version copies everything except the decision itself: "Observation required" is chosen again for every version
  // (the previous version's answer is shown as a reminder only)
  if (base) { d = n5Clone(base); Object.assign(d, { state: 'Draft', v, snap: null, origin: `Copied from Version ${base.v}`, prevRequired: base.required, required: null, at: now().toISOString(), by: ADMIN.me.name }); delete d.pubAt; delete d.pubBy; d.ia.forEach(c => { c.pubV = c.v; }); }
  else d = n5Empty(pr, v, pr.status === 'Draft' ? 'New programme' : 'New version (no earlier configuration recorded)');
  N.draft[pr.id] = d; return d;
}
// What a programme screen shows: the draft while there is one, otherwise the current published version
const n5Shown = pr => (n5DraftV(pr) ? n5Draft(pr) : n5PubCur(pr));

/* ---------- Publication follows the programme's own publication ---------- */
function n5Publish(pr, d) {
  const N = N5(), tree = s3PubTree(pr, d.v) || n5DraftTree(pr), h = (s3Hist(pr) || []).find(x => x.v === d.v && !x.fixture);
  const nv = n5NvqOf(tree), keep = new Set(nv.map(c => c.code)), p = n5Clone(d);
  Object.assign(p, { state: 'Published', snap: nv, pubAt: h && h.at ? h.at : now().toISOString(), pubBy: h && h.by ? h.by : ADMIN.me.name });
  Object.keys(p.nvq).forEach(k => { if (!keep.has(k)) delete p.nvq[k]; }); p.ia.forEach(c => { delete c.pubV; });
  (N.pub[pr.id] = N.pub[pr.id] || {})[d.v] = n5Freeze(p); delete N.draft[pr.id];
  n5Log(pr, 'Observation configuration published', `Version ${d.v} (draft)`, `Version ${d.v}`, n5Summary(pr, p));
  // Part of the version's publication: listed just under its "… published" entry, which stays the latest
  const A = ADMIN.audit; if (A[1] && A[1].entity === n5Ent(pr) && /published/i.test(A[1].action)) [A[0], A[1]] = [A[1], A[0]];
}
// Keeps the configuration in step with the programme: creates the draft when a draft version exists, publishes it when the
// version is published, and drops a draft whose version was never published (logged).
function n5Sync() {
  if (!STORE.n5 || typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.programmes) return; const N = N5();
  ADMIN.programmes.forEach(pr => {
    const d = N.draft[pr.id], v = n5DraftV(pr);
    if (d && d.v !== v) { if (!v && d.v === pr.version && pr.status !== 'Draft') n5Publish(pr, d); else { delete N.draft[pr.id]; n5Log(pr, 'Observation configuration draft discarded', `Version ${d.v} (draft)`, '—', 'The draft version no longer exists'); } }
    if (v) n5Draft(pr);
  });
}
const n5Summary = (pr, c) => `Required: ${n5YN(c.required)} · Workplace: ${c.workplace || 'not recorded'} · Academy office: ${c.office || 'not recorded'} · ${plural(c.ia.filter(x => x.status === 'Active').length, 'Academy criterion', 'Academy criteria')} · ${plural(n5NvqOk(pr, c).length, 'NVQ criterion', 'NVQ criteria')}`;
const n5YN = b => (b === true ? 'Yes' : b === false ? 'No' : 'not recorded');

/* ---------- Migration from the shared S3-05 library (deterministic, non-destructive) ---------- */
function n5Migrate() {
  const N = N5(); if (N.done || !ADMIN || !ADMIN.programmes || !STORE.aca) return; N.done = true;
  const lib = typeof s3Lib === 'function' ? s3Lib() : [], ids = new Set(ADMIN.programmes.map(p => p.id));
  const copy = c => ({ code: c.code, title: c.title, desc: c.desc || '', cat: c.cat || 'Other', status: 'Active', v: 1, ev: { types: [], instr: '' }, map: [], src: { lib: c.code, libV: c.version || 1 } });
  ADMIN.programmes.forEach(pr => {
    const mine = lib.filter(c => c.form && c.status === 'Active' && (c.progs || []).includes(pr.id)).map(copy);
    if (pr.status === 'Draft') { const d = n5Draft(pr); if (d && mine.length) d.ia = mine; return; }
    const tree = s3PubTree(pr, pr.version); if (!tree) { N.mig.push({ pid: pr.id, code: '—', why: `No published structure found for Version ${pr.version} — no configuration recorded` }); return; }
    const p = { ...n5Empty(pr, pr.version, 'Pre-N5 migration'), state: 'Published', ia: mine, snap: n5NvqOf(tree), pubAt: null, pubBy: 'Migration (before N5)' };
    (N.pub[pr.id] = N.pub[pr.id] || {})[pr.version] = n5Freeze(p);
  });
  // Attachments that don't establish an observation-form relationship are reported, not copied
  lib.forEach(c => (c.progs || []).forEach(pid => {
    if (!ids.has(pid)) { N.mig.push({ pid, code: c.code, why: 'Attached to an unknown programme — not copied' }); return; }
    if (c.form && c.status === 'Active') return;
    N.mig.push({ pid, code: c.code, title: c.title, why: c.status !== 'Active' ? `Attached but ${c.status} in the shared library — not copied` : 'Attached but not used on observation forms — not copied (needs a decision)' });
  }));
}
function n5Init() { if (!STORE.worlds || typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.programmes) return; N5(); n5Migrate(); n5Sync(); }
// initStore() calls buildAdmin() before the other stages' initStore steps have run, so the migration waits for the end of initStore
let n5InInit = false;
const _isN5 = initStore; initStore = function () { STORE.n5 = null; n5InInit = true; let r; try { r = _isN5.apply(this, arguments); } finally { n5InInit = false; } n5Init(); return r; };
const _baN5 = buildAdmin; buildAdmin = function () { const r = _baN5.apply(this, arguments); if (STORE.worlds && !n5InInit) n5Init(); return r; };
const _renderN5 = render; render = function () { try { n5Sync(); } catch (e) { /* never block a render */ } return _renderN5.apply(this, arguments); };

/* ---------- Checklists a configuration produces (the established split, G6.6) ---------- */
// type: 'workplace' → the programme's Active Academy criteria + the NVQ criteria; 'office' → NVQ criteria only. Nothing is decided here.
function n5Checklist(pr, cfg, type) {
  if (!cfg || cfg.required === false) return { ok: false, why: 'Observation isn\'t required for this version', items: [] };
  const nvq = n5NvqOk(pr, cfg).map(c => ({ kind: 'NVQ', code: c.code, d: c.d, ev: cfg.nvq[c.code] || { types: [], instr: '' }, req: c.req }));
  if (type === 'office') return cfg.office === 'Not available' ? { ok: false, why: 'Academy-office observation isn\'t available for this version', items: [] } : { ok: true, items: nvq };
  if (cfg.workplace === 'Not permitted') return { ok: false, why: 'Workplace observation isn\'t permitted for this version', items: [] };
  return { ok: true, items: cfg.ia.filter(c => c.status === 'Active').map(c => ({ kind: 'Academy', code: c.code, d: c.title, ev: c.ev, map: c.map.slice() })).concat(nvq) };
}
// Exposed for later stages: the configuration a learner's pinned version uses (null when none was recorded)
const n5ConfigFor = (pid, v) => n5PubOf(pid, v);
// A criterion's identity is (programme, version, code): the display code alone is not unique across programmes
const n5Crit = (pid, v, code) => { const d = N5().draft[pid], cfg = n5PubOf(pid, v) || (d && d.v === v ? d : null); return cfg ? cfg.ia.find(c => c.code === code) || null : null; };

/* ---------- Publishing checks ---------- */
// Only drafts are checked: a new programme or a new version. Published versions (migrated ones included) are never re-validated.
// review: contradictions flagged for review (D5) that don't stop publication
function n5Check(pr) {
  const block = [], warn = [], review = [], d = n5DraftV(pr) ? n5Draft(pr) : null; if (!d) return { block, warn, review };
  const all = n5Nvq(pr, d), ok = all.filter(c => c.st === 'Active'), okSet = new Set(ok.map(c => c.code)), ia = d.ia.filter(c => c.status === 'Active'), noEv = e => !e || !(e.types || []).length;
  const stale = ia.flatMap(c => c.map.filter(k => !okSet.has(k)).map(k => `${c.code} → ${k}`));
  if (d.required === null) block.push(`Observations: choose whether observation is required for Version ${d.v} (Yes or No) — every new programme and new version records it${d.prevRequired != null ? ` (Version ${d.v - 1}: ${n5YN(d.prevRequired)})` : ''}`);
  if (d.required === false) {
    // Not required: no criteria, routes or evidence are demanded; Academy criteria stay in the version for history
    if (ok.length) { const los = Array.from(new Set(ok.map(c => `${c.unit} ${c.lo}`))); review.push(`Review (D5): observation is set to "Not required", but ${plural(los.length, 'active Learning Outcome has', 'active Learning Outcomes have')} the Observation type (${los.slice(0, 5).join(', ')}${los.length > 5 ? '…' : ''}; ${plural(ok.length, 'criterion', 'criteria')}). Observation criteria are only met by observation, never through assignments — change the Learning Outcome type or set "Observation required" to Yes`); }
    if (ia.length) warn.push(`Observations: ${plural(ia.length, 'Academy criterion is', 'Academy criteria are')} kept in this version for history but not used while observation isn't required`);
  }
  if (d.required === true) {
    if (!ok.length) block.push('Observations: observation is required, but this version has no active NVQ observation criteria — give a Learning Outcome the Observation type (Hierarchy / Structure)');
    if (!d.workplace) block.push('Observations: choose whether workplace observation is permitted');
    if (!d.office) block.push('Observations: choose whether an Academy-office observation is available as the approved alternative');
    if (d.workplace === 'Not permitted' && d.office === 'Not available') block.push('Observations: no way to observe — workplace observation isn\'t permitted and Academy-office observation isn\'t available');
    if (d.workplace === 'Not permitted' && d.office === 'Available') warn.push('Observations: Academy-office observation only — the established workflow uses the Academy office as an approved alternative to the workplace; office-only programmes are pending client confirmation');
    const nvqNo = ok.filter(c => noEv(d.nvq[c.code])); if (nvqNo.length) block.push(`Observations: choose the permitted evidence for ${plural(nvqNo.length, 'NVQ criterion', 'NVQ criteria')}: ${nvqNo.slice(0, 6).map(c => c.code).join(', ')}${nvqNo.length > 6 ? '…' : ''}`);
    const iaNo = ia.filter(c => noEv(c.ev)); if (iaNo.length) block.push(`Observations: choose the permitted evidence for ${plural(iaNo.length, 'Academy criterion', 'Academy criteria')}: ${iaNo.map(c => c.code).join(', ')}`);
    if (stale.length) block.push(`Observations: Academy criteria mapped to NVQ criteria that aren't active observation criteria in this version: ${stale.join(', ')}`);
    const un = ia.filter(c => !c.map.length); if (un.length) warn.push(`Observations: ${plural(un.length, 'Academy criterion isn\'t', 'Academy criteria aren\'t')} mapped to an NVQ criterion: ${un.map(c => c.code).join(', ')}`);
    if (ia.length && d.workplace === 'Not permitted') warn.push('Observations: Academy criteria apply to workplace observations only — none will be used while workplace observation isn\'t permitted');
  }
  return { block, warn, review };
}
// Seeded programmes (S3 builder): refuse publication while the observation configuration has blocking items
const _pubN5 = ACT.kPubProg;
ACT.kPubProg = el => {
  const pr = s3Pr(el && el.dataset ? el.dataset.id : null);
  if (pr && !pr.chNew && n5CanEdit() && n5DraftV(pr)) {
    const { block, warn: w0, review } = n5Check(pr), warn = review.concat(w0), dv = s3Draft(pr.id), sb = s3Check(pr, pr.status === 'Draft' ? s3Tree(pr.id) : dv ? dv.tree : []);
    // The structure is checked first (S3-04, unchanged); the observation items join its refusal
    if (sb.block.length || sb.other.length) { const r = _pubN5(el); if (block.length && MODAL && /^Can't publish/.test(MODAL.title || '')) { MODAL.body += `<div class="note b-red n5-block">${ic('alert')}<div class="small"><strong>Observation configuration:</strong><ul>${block.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`; renderModal(); } return r; }
    if (block.length) { n5Log(pr, 'Blocked: publish (observation configuration)', `Version ${n5DraftV(pr)} (draft)`, '—', block.join(' · ')); openModal({ title: 'Can\'t publish this programme', body: `<div class="note b-red n5-block">${ic('alert')}<div class="small"><strong>Fix the observation configuration first.</strong><ul>${block.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`, actions: [{ label: 'Close' }, { label: 'Open Observations', cls: 'btn-primary', fn: () => { go('a-programmes', { id: pr.id, tab: 'obs' }); } }] }); return; }
    const r = _pubN5(el); if (warn.length && MODAL && /^Publish/.test(MODAL.title || '')) { MODAL.body = `<div class="note b-amber n5-warn">${ic('alert')}<div class="small">${warn.map(esc).join('<br>')}</div></div>` + MODAL.body; renderModal(); } return r;
  }
  return _pubN5(el);
};
// Wizard programmes: the same checks join the Review step and both publish actions (ch8Publish, s3WizPublish)
const _checkN5 = ch8Check;
ch8Check = function (pr) { const r = _checkN5.apply(this, arguments); if (pr && STORE.n5 && n5DraftV(pr)) { const o = n5Check(pr); r.block.push(...o.block); (r.warn = r.warn || []).push(...o.review, ...o.warn); } return r; };

/* ---------- Actions (every one checks the role and that the version is still a draft) ---------- */
function n5Gate(el, what) {
  const pid = el && el.dataset ? el.dataset.p : null, pr = s3Pr(pid), ent = pr ? n5Ent(pr) : pid || '—';
  if (!n5CanEdit()) { logA('NVQ Programmes', ent, 'Blocked: ' + what, '—', '—', 'Role can\'t change observation configuration'); toast('You can\'t change observation configuration.', 'err'); return null; }
  if (!pr) { toast('Programme not found.', 'err'); return null; }
  n5Sync(); if (!n5DraftV(pr)) { n5Log(pr, 'Blocked: ' + what, `Version ${pr.version}`, '—', pr.status === 'Retired' ? 'Retired programme' : 'Published versions can\'t be changed'); toast(pr.status === 'Retired' ? 'Retired programmes can\'t be changed.' : 'Published versions can\'t be changed — create a new version first.', 'err'); return null; }
  return { pr, d: n5Draft(pr) };
}
// The dialog's Save checks again (the draft may have been published, or the actor changed, while it was open)
const n5Still = g => n5CanEdit() && N5().draft[g.pr.id] === g.d && n5DraftV(g.pr) === g.d.v;
const n5Lost = g => { n5Log(g.pr, 'Blocked: save observation configuration', '—', '—', 'The draft or the role changed while the dialog was open'); toast('Not saved — the version is no longer an editable draft.', 'err'); closeModal(); render(); return false; };

const n5Radio = (name, v, opts, legend, hint) => `<fieldset class="field n5-fs"><legend class="lbl">${legend}</legend>${opts.map(([val, lab]) => `<label class="check"><input type="radio" name="${name}" value="${val}" ${v === val ? 'checked' : ''}>${lab}</label>`).join('')}${hint ? `<span class="hint">${hint}</span>` : ''}</fieldset>`;
const n5Pick = name => { const r = $(`#modal-root input[name="${name}"]:checked`); return r ? r.value : null; };
ACT.n5Settings = el => {
  const g = n5Gate(el, 'change observation settings'); if (!g) return; const { pr, d } = g;
  openModal({ title: 'Observation settings — Version ' + d.v, size: 'lg', body: `<p class="small muted">Saved in Version ${d.v} (draft) and published with it.</p>
    ${n5Radio('n5-req', d.required === true ? 'yes' : d.required === false ? 'no' : null, [['yes', 'Yes — learners on this version are observed'], ['no', 'No — no observation criteria or routes are needed']], 'Observation required', `Required for every new programme and new version.${d.prevRequired != null ? ` Version ${d.v - 1} recorded: ${n5YN(d.prevRequired)}.` : ''}`)}
    ${n5Radio('n5-wp', d.workplace, [['Permitted', 'Permitted — needs the workplace\'s permission (secure link)'], ['Not permitted', 'Not permitted']], 'Workplace observation')}
    ${n5Radio('n5-off', d.office, [['Available', 'Available as the approved alternative'], ['Not available', 'Not available']], 'Academy-office observation', 'The established workflow: the learner asks for it, or agrees to the Coordinator\'s advice after the workplace withdraws permission; the batch\'s Academic Coordinator or the Academic Admin approves it; the observation assessor books an office (CH-37, CH-43). Any other reason to use the office is pending client confirmation. No extra fee.')}`,
    actions: [{ label: 'Cancel' }, { label: 'Save settings', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return n5Lost(g);
      const req = n5Pick('n5-req'), next = { required: req === 'yes' ? true : req === 'no' ? false : null, workplace: n5Pick('n5-wp'), office: n5Pick('n5-off') };
      const was = n5Summary(pr, d), ch = ['required', 'workplace', 'office'].filter(k => next[k] !== d[k]); if (!ch.length) { toast('Nothing has changed.', 'info'); return false; }
      Object.assign(d, next); n5Log(pr, 'Observation settings changed', was, n5Summary(pr, d), `Version ${d.v} (draft)`); render(); toast(`Saved in Version ${d.v} (draft).`); } }] });
};
const n5EvFields = (ev, idp) => `<fieldset class="field n5-fs"><legend class="lbl">Permitted evidence</legend><div class="n5-evs">${N5_EV.map(([k, l]) => `<label class="check"><input type="checkbox" class="n5-ev" value="${k}" ${(ev.types || []).includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div><span class="hint">Tick the types an assessor may use for this criterion — not every type is needed. Authorised references link to evidence held in approved storage (for example a long video). Which types are mandatory is pending client confirmation.</span></fieldset>
  <div class="field"><label for="${idp}-i">Evidence instructions</label><textarea class="textarea" id="${idp}-i">${esc(ev.instr || '')}</textarea></div>`;
const n5EvRead = idp => ({ types: N5_EV.map(e => e[0]).filter(k => $$('#modal-root .n5-ev:checked').some(x => x.value === k)), instr: mval(`#${idp}-i`) });
const n5EvTxt = ev => ((ev && ev.types && ev.types.length) ? ev.types.map(k => (N5_EV.find(e => e[0] === k) || [k, k])[1]).join(', ') : 'none');
ACT.n5NvqEv = el => {
  const g = n5Gate(el, 'change observation evidence settings'); if (!g) return; const { pr, d } = g, c = n5NvqOk(pr, d).find(x => x.code === el.dataset.c);
  if (!c) { toast('This NVQ criterion isn\'t an active observation criterion in this version.', 'err'); return; }
  const ev = d.nvq[c.code] || { types: [], instr: '' };
  openModal({ title: 'Evidence — ' + esc(c.code), size: 'lg', body: `<p class="small"><strong>${esc(c.code)}</strong> ${esc(c.d)}</p><p class="xs muted">From the structure: ${esc(c.req || 'no evidence requirement recorded')}</p>${n5EvFields(ev, 'n5n')}`,
    actions: [{ label: 'Cancel' }, { label: 'Save evidence', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return n5Lost(g); const nx = n5EvRead('n5n'), was = `${n5EvTxt(ev)}${ev.instr ? ' · ' + ev.instr : ''}`;
      if (JSON.stringify(nx) === JSON.stringify({ types: ev.types || [], instr: ev.instr || '' })) { toast('Nothing has changed.', 'info'); return false; }
      d.nvq[c.code] = nx; n5Log(pr, 'Observation evidence changed', `${c.code}: ${was}`, `${n5EvTxt(nx)}${nx.instr ? ' · ' + nx.instr : ''}`, `Version ${d.v} (draft)`); render(); toast('Evidence settings saved.'); } }] });
};
// Next free code in this programme (codes are never reused). New codes also stay clear of the shared library's codes, which
// still name the criteria on today's observation forms, so one programme never shows two different criteria with one code.
function n5NextCode(pr) {
  const used = [N5().draft[pr.id]].concat(Object.values(N5().pub[pr.id] || {})).filter(Boolean).flatMap(c => c.ia.map(x => x.code)).concat((STORE.aca && STORE.aca.obsLib || []).map(x => x.code));
  return 'IA-' + (Math.max(0, ...used.map(x => +(/^IA-(\d+)$/.exec(x) || [0, 0])[1])) + 1);
}
ACT.n5IaEdit = el => {
  const g = n5Gate(el, el.dataset.c ? 'change an Academy observation criterion' : 'add an Academy observation criterion'); if (!g) return; const { pr, d } = g;
  const c = el.dataset.c ? d.ia.find(x => x.code === el.dataset.c) : null; if (el.dataset.c && !c) { toast('Criterion not found in this version.', 'err'); return; }
  if (c && c.status !== 'Active') { toast('Restore the criterion before changing it.', 'err'); return; }
  const nvq = n5NvqOk(pr, d), map = c ? c.map : [];
  openModal({ title: c ? `Edit ${esc(c.code)} — Version ${d.v}` : `Add Academy criterion — Version ${d.v}`, size: 'lg', body: `${c && c.pubV != null ? `<div class="note b-blue">${ic('layers')}<div class="small">Version ${d.v} gets criterion version ${c.v === c.pubV ? c.v + 1 : c.v}. Version ${pr.version} and observations already recorded keep theirs.</div></div>` : ''}
    <div class="field"><label for="n5-t">Title</label><input class="input" id="n5-t" value="${c ? esc(c.title) : ''}"></div>
    <div class="field"><label for="n5-d">Description</label><textarea class="textarea" id="n5-d">${c ? esc(c.desc) : ''}</textarea></div>
    <div class="field"><label for="n5-c">Category</label><select class="select" id="n5-c">${N5_CAT.map(x => `<option ${c && c.cat === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    ${n5EvFields(c ? c.ev : { types: [], instr: '' }, 'n5a')}
    <fieldset class="field n5-fs"><legend class="lbl">Mapped NVQ criteria (this version)</legend>${nvq.length ? `<div class="n5-maps">${nvq.map(n => `<label class="check"><input type="checkbox" class="n5-map" value="${esc(n.code)}" ${map.includes(n.code) ? 'checked' : ''}><span><span class="code">${esc(n.code)}</span> ${esc(n.d)}</span></label>`).join('')}</div>` : '<p class="small muted">This version has no active NVQ observation criteria yet.</p>'}<span class="hint">Academy criteria are assessed on workplace observations only, alongside the NVQ criteria.</span></fieldset>`,
    actions: [{ label: 'Cancel' }, { label: c ? 'Save criterion' : 'Add criterion', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return n5Lost(g); const t = mval('#n5-t'); if (!t) { fieldErr('#n5-t', 'Enter a title'); return false; }
      const nx = { title: t, desc: mval('#n5-d'), cat: mval('#n5-c'), ev: n5EvRead('n5a'), map: $$('#modal-root .n5-map:checked').map(x => x.value) };
      if (!c) { const code = n5NextCode(pr); d.ia.push({ code, status: 'Active', v: 1, pubV: null, src: { added: `Version ${d.v}` }, ...nx }); n5Log(pr, 'Observation criterion added', '—', `${code} ${t}`, `Version ${d.v} (draft)`); render(); toast(`${code} added to Version ${d.v} (draft).`); return; }
      const was = `${c.title} · ${c.cat} · evidence ${n5EvTxt(c.ev)} · mapped ${c.map.join(', ') || 'none'}`;
      if (JSON.stringify(nx) === JSON.stringify({ title: c.title, desc: c.desc, cat: c.cat, ev: c.ev, map: c.map })) { toast('Nothing has changed.', 'info'); return false; }
      Object.assign(c, nx); if (c.pubV != null && c.v === c.pubV) c.v = c.pubV + 1;
      n5Log(pr, 'Observation criterion changed', `${c.code}: ${was}`, `${c.title} · ${c.cat} · evidence ${n5EvTxt(c.ev)} · mapped ${c.map.join(', ') || 'none'}`, `Version ${d.v} (draft)`); render(); toast(`${c.code} saved in Version ${d.v} (draft).`); } }] });
};
// Retire (kept for history), restore, or remove a criterion that was added in this draft and never published
ACT.n5IaState = el => {
  const a = el.dataset.a, g = n5Gate(el, a === 'remove' ? 'remove an Academy observation criterion' : 'change an Academy observation criterion'); if (!g) return; const { pr, d } = g, c = d.ia.find(x => x.code === el.dataset.c); if (!c) return;
  if (a === 'remove' && c.pubV != null) { n5Log(pr, 'Blocked: remove an Academy observation criterion', c.code, '—', 'Published criteria are kept — retire it instead'); toast('Published criteria can\'t be removed — retire it instead.', 'err'); return; }
  const to = a === 'retire' ? 'Retired' : a === 'restore' ? 'Active' : null; if (to && c.status === to) return;
  reasonDlg({ title: `${a === 'remove' ? 'Remove' : a === 'retire' ? 'Retire' : 'Restore'} ${esc(c.code)} — Version ${d.v}`, ok: a === 'remove' ? 'Remove' : a === 'retire' ? 'Retire' : 'Restore', danger: a !== 'restore', body: `<p class="small">${a === 'remove' ? 'It was added in this draft and never published, so it is removed from the draft.' : a === 'retire' ? `It stays in Version ${d.v} for history but isn't on any observation from this version. Earlier versions keep it.` : 'It goes back on this version\'s workplace observations.'}</p>`,
    onOk: r => { if (!n5Still(g)) return n5Lost(g); if (a === 'remove') { d.ia.splice(d.ia.indexOf(c), 1); n5Log(pr, 'Observation criterion removed (never published)', `${c.code} ${c.title}`, '—', r); } else { const was = c.status; c.status = to; n5Log(pr, to === 'Retired' ? 'Observation criterion retired' : 'Observation criterion restored', `${c.code}: ${was}`, to, r); } render(); toast('Saved.'); } });
};

/* ---------- The Observations section (builder tab / wizard step) ---------- */
const n5EvChips = ev => ((ev && ev.types && ev.types.length) ? ev.types.map(k => `<span class="typebadge">${esc((N5_EV.find(e => e[0] === k) || [k, k])[1])}</span>`).join(' ') : '<span class="muted small">None chosen</span>');
const n5Val = (v, yes, no) => (v === true || v === yes ? chip(typeof v === 'boolean' ? 'Yes' : yes, 'green') : v === false || v === no ? chip(typeof v === 'boolean' ? 'No' : no, 'grey') : chip('Not recorded', 'amber'));
function n5Section(pr) {
  if (!n5CanView()) {
    const ent = n5Ent(pr); if (!(ADMIN.audit[0] && ADMIN.audit[0].action === 'Blocked: view observation configuration' && ADMIN.audit[0].entity === ent)) logA('NVQ Programmes', ent, 'Blocked: view observation configuration', '—', '—', 'Role has no programme administration responsibility');
    return `<section class="card n5-deny"><div class="note b-red">${ic('lock')}<div class="small"><strong>You can't view this programme's observation configuration.</strong> It is managed by programme administrators. This attempt has been logged.</div></div></section>`;
  }
  n5Sync(); const dv = n5DraftV(pr), d = n5Shown(pr), ed = !!dv && n5CanEdit(), P = `data-p="${pr.id}"`;
  const hist = Object.values(N5().pub[pr.id] || {}).sort((a, b) => b.v - a.v), mig = N5().mig.filter(m => m.pid === pr.id);
  const versions = `<section class="card n5-vers"><h2>Observation configuration by version</h2><ul class="list small">${dv ? `<li class="li"><div class="li-b"><strong>Version ${dv} (draft)</strong><span class="xs muted">${esc(d.origin)}</span></div>${chip('Draft', 'amber')}</li>` : ''}${hist.map(c => `<li class="li"><div class="li-b"><strong>Version ${c.v}</strong><span class="xs muted">${c.pubAt ? `Published ${fd(c.pubAt)} by ${esc(c.pubBy)}` : esc(c.pubBy)} · ${esc(c.origin)} · ${esc(n5Summary(pr, c))}</span></div>${chip(c.v === pr.version ? 'Current' : 'Superseded', c.v === pr.version ? 'green' : 'grey')}</li>`).join('')}${Array.from({ length: pr.version || 0 }, (_, k) => k + 1).filter(v => !hist.some(c => c.v === v) && !(dv === v)).reverse().map(v => `<li class="li"><div class="li-b"><strong>Version ${v}</strong><span class="xs muted">No observation configuration recorded (published before N5).</span></div>${chip('Not recorded', 'grey')}</li>`).join('')}</ul></section>`;
  if (!d) return `<section class="card n5-head"><h2>Observations</h2><p class="small muted">No observation configuration is recorded for Version ${pr.version}.${pr.status === 'Retired' ? ' Retired programmes are read-only.' : ' Create a new version to configure observations.'}</p></section>${versions}`;
  const nvqAll = n5Nvq(pr, d), nvq = nvqAll.filter(c => c.st === 'Active'), ia = d.ia, iaOn = ia.filter(c => c.status === 'Active'), wp = n5Checklist(pr, d, 'workplace'), off = n5Checklist(pr, d, 'office');
  const mappedTo = code => ia.filter(c => c.status === 'Active' && c.map.includes(code)).map(c => c.code);
  const head = `<section class="card n5-head"><div class="row-b"><h2>Observations — Version ${d.v}${d.state === 'Draft' ? ' (draft)' : ''}</h2>${chip(d.state === 'Draft' ? 'Draft' : 'Published', d.state === 'Draft' ? 'amber' : 'green')}</div>
    <p class="small">${d.state === 'Draft' ? `This programme's own observation configuration. It is edited in Version ${d.v} (draft) and published with it; learners on earlier versions keep theirs.` : `Version ${d.v} is published, so its observation configuration can't be changed.${pr.status === 'Retired' ? ' Retired programme — read-only.' : ' To change it, create a new version.'}`}</p>
    <p class="xs muted">${esc(d.origin)}${d.pubAt ? ` · published ${fd(d.pubAt)} by ${esc(d.pubBy)}` : ''}. Criteria here belong to this programme version only — other programmes and the shared library are unaffected.</p></section>`;
  const settings = `<section class="card n5-settings"><div class="row-b"><h2>Settings</h2>${ed ? `<button class="btn btn-sm" data-act="n5Settings" ${P}>${ic('edit', 14)}Edit settings</button>` : ''}</div>
    <dl class="kv"><dt>Observation required</dt><dd>${d.state === 'Draft' && d.required === null ? chip('Not chosen yet', 'red') + ' <span class="xs muted n5-req-hint">Choose Yes or No before publishing' + (d.prevRequired != null ? ` (Version ${d.v - 1}: ${n5YN(d.prevRequired)})` : '') + '.</span>' : n5Val(d.required) + (d.state !== 'Draft' && d.required === null ? ' <span class="xs muted">Published before N5 — not recorded.</span>' : '')}</dd><dt>Workplace observation</dt><dd>${n5Val(d.workplace, 'Permitted', 'Not permitted')} <span class="xs muted">Needs the workplace's permission before observations are booked.</span></dd><dt>Academy-office observation</dt><dd>${n5Val(d.office, 'Available', 'Not available')} <span class="xs muted">The approved alternative under the established workflow (CH-37, CH-43); other reasons are pending client confirmation.</span></dd></dl></section>`;
  const cover = `<section class="card n5-cover"><h2>What an observation covers in Version ${d.v}</h2><ul class="list small">
    <li class="li n5-cov-wp"><div class="li-b"><strong>Workplace observation</strong><span class="xs muted">${wp.ok ? `${plural(iaOn.length, 'Academy criterion', 'Academy criteria')} of this programme + ${plural(nvq.length, 'NVQ criterion', 'NVQ criteria')}` : esc(wp.why)}</span></div></li>
    <li class="li n5-cov-off"><div class="li-b"><strong>Academy-office observation</strong><span class="xs muted">${off.ok ? `${plural(nvq.length, 'NVQ criterion', 'NVQ criteria')} only — no Academy criteria` : esc(off.why)}</span></div></li></ul>
    <p class="xs muted">${ic('info', 12)} This configuration doesn't record or decide any outcome.</p></section>`;
  const nvqT = `<section class="card n5-nvq"><h2>NVQ observation criteria</h2><p class="small muted">From this version's structure: Learning Outcomes of the Observation type. Change them in the ${pr.chNew ? 'Structure step' : 'Hierarchy builder'}.</p>${nvqAll.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Code</th><th>Criterion</th><th>Permitted evidence</th><th>Instructions</th><th>Academy criteria mapped</th>${ed ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${nvqAll.map(c => { const ev = d.nvq[c.code] || { types: [], instr: '' }, live = c.st === 'Active'; return `<tr data-code="${esc(c.code)}"><td class="nowrap"><span class="code">${esc(c.code)}</span>${live ? '' : ' ' + chip(c.st, 'grey')}</td><td>${esc(c.d)}<div class="xs muted">${esc(c.unit)} ${esc(c.lo)} · structure: ${esc(c.req || '—')}</div></td><td>${n5EvChips(ev)}</td><td class="small">${esc(ev.instr || '—')}</td><td class="small">${mappedTo(c.code).join(', ') || '—'}</td>${ed ? `<td>${live ? `<button class="btn btn-sm" data-act="n5NvqEv" ${P} data-c="${esc(c.code)}">Evidence</button>` : ''}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted">This version has no NVQ observation criteria.</p>'}</section>`;
  const iaT = `<section class="card n5-ia"><div class="row-b"><h2>Academy observation criteria</h2>${ed ? `<button class="btn btn-sm" data-act="n5IaEdit" ${P} data-c="">${ic('plus', 14)}Add criterion</button>` : ''}</div><p class="small muted">Illumin Academy standards for this programme version — internal quality, not qualification competency. Used on workplace observations only.</p>${ia.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Code</th><th>Criterion</th><th>Status</th><th>Permitted evidence</th><th>Mapped NVQ criteria</th><th>Source</th>${ed ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${ia.map(c => `<tr data-code="${esc(c.code)}"><td class="nowrap"><span class="code">${esc(c.code)}</span><div class="xs muted">v${c.v}</div></td><td><strong>${esc(c.title)}</strong><div class="xs muted">${esc(c.desc)} · ${esc(c.cat)}</div>${c.ev.instr ? `<div class="xs">${esc(c.ev.instr)}</div>` : ''}</td><td>${chip(c.status, c.status === 'Active' ? 'green' : 'grey')}</td><td>${n5EvChips(c.ev)}</td><td class="small">${c.map.map(esc).join(', ') || '—'}</td><td class="xs muted">${c.src && c.src.lib ? `Copied from the shared library (${esc(c.src.lib)} v${c.src.libV})` : `Added in ${esc((c.src && c.src.added) || 'this programme')}`}</td>${ed ? `<td class="nowrap">${c.status === 'Active' ? `<button class="btn btn-sm" data-act="n5IaEdit" ${P} data-c="${esc(c.code)}">Edit</button> ` : ''}${c.pubV == null ? `<button class="btn btn-sm" data-act="n5IaState" ${P} data-c="${esc(c.code)}" data-a="remove">Remove</button>` : `<button class="btn btn-sm" data-act="n5IaState" ${P} data-c="${esc(c.code)}" data-a="${c.status === 'Active' ? 'retire' : 'restore'}">${c.status === 'Active' ? 'Retire' : 'Restore'}</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No Academy criteria in this version.</p>'}</section>`;
  const chk = d.state === 'Draft' ? (({ block, warn, review }) => `<section class="card n5-checks"><h2>Before publishing Version ${d.v}</h2><ul class="list small">${block.map(b => `<li class="li">${chip('Blocking', 'red')} ${esc(b.replace(/^Observations: /, ''))}</li>`).join('')}${review.map(w => `<li class="li n5-review">${chip('Review', 'amber')} ${esc(w.replace(/^Review \(D5\): /, ''))} (D5)</li>`).join('')}${warn.map(w => `<li class="li">${chip('Warning', 'amber')} ${esc(w.replace(/^Observations: /, ''))}</li>`).join('')}${!block.length && !warn.length && !review.length ? `<li class="li">${chip('OK', 'green')} Nothing missing</li>` : ''}</ul></section>`)(n5Check(pr)) : '';
  const migT = mig.length ? `<section class="card n5-mig"><h2>Shared-library attachments not copied</h2><p class="small muted">These shared-library criteria were attached to this programme but weren't on its observation forms, so the relationship isn't clear. They weren't copied into any version — add them as this programme's own criteria if they apply.</p><ul class="list small">${mig.map(m => `<li class="li"><span class="code">${esc(m.code)}</span><div class="li-b">${esc(m.title || '')}<span class="xs muted">${esc(m.why)}</span></div></li>`).join('')}</ul></section>` : '';
  return head + settings + cover + chk + nvqT + iaT + migT + versions + auditPanel(a => a.module === 'NVQ Programmes' && String(a.entity || '').includes('(' + pr.id + ')') && /bservation/.test(a.action), 'Observation configuration — audit');
}

/* ---------- Where the section appears ---------- */
// Seeded programmes: an "Observations" tab after the shared library tab (the same version header as the other tabs)
const _pbN5 = progBuilder;
progBuilder = function (id, t) {
  const pr = s3Pr(id); if (!pr || pr.chNew) return _pbN5.apply(this, arguments);
  const obs = t === 'obs', h = _pbN5.call(this, id, obs ? 'types' : t), a = h.indexOf('<div class="subtabs"'), z = a < 0 ? -1 : h.indexOf('</div>', a); if (z < 0) return h;
  let tabs = h.slice(a, z); if (obs) tabs = tabs.replace(/aria-selected="true"/g, 'aria-selected="false"');
  const btn = `<button class="tab" role="tab" aria-selected="${obs}" data-go="a-programmes" data-id="${id}" data-tab="obs">Observations</button>`, lib = tabs.indexOf('data-tab="library"'), end = lib < 0 ? -1 : tabs.indexOf('</button>', lib) + 9;
  tabs = (end > 8 ? tabs.slice(0, end) + btn + tabs.slice(end) : tabs + btn).replace('>Observation-criteria library</button>', '>Shared library (legacy)</button>');
  return h.slice(0, a) + tabs + (obs ? '</div>' + n5Section(pr) : t === 'library' ? '</div>' + n5Legacy(pr) : h.slice(z));
};
// The programme's old library tab: read-only, so there is one place to configure a programme. The shared library itself is
// still edited on its own page (it supplies today's observation forms until they read the programme configuration).
function n5Legacy(pr) {
  const tbl = s3LibTable().replace(/<button class="btn btn-sm" data-act="(kLib|kLibAttach|s3LibActivate|kLibRetire)"[^>]*>[\s\S]*?<\/button>/g, '');
  return `<div class="note b-amber n5-legacy-note">${ic('info')}<div class="small"><strong>Legacy — read-only here. This list doesn't configure ${esc(pr.title)}.</strong> Set this programme's observation requirement, its own Academy criteria, evidence and NVQ mapping on the <strong>Observations</strong> tab. The shared library below still supplies the criteria on today's observation forms; it is changed only on Academic → Observation Criteria Library.
    <div class="row" style="margin-top:6px"><button class="btn btn-sm btn-primary" data-go="a-programmes" data-id="${pr.id}" data-tab="obs">Open Observations</button><button class="btn btn-sm" data-go="k-obslib">Observation Criteria Library</button></div></div></div>
    <section class="card n5-legacy"><h2>Shared observation-criteria library (legacy)</h2><p class="small muted">Every programme's shared list, as used by today's observation forms. Read-only on this tab.</p>${tbl}</section>`;
}
// Wizard programmes: an "Observations" step after Structure
if (!CH8_STEPS.some(s => s[0] === 'obs')) CH8_STEPS.splice(CH8_STEPS.findIndex(s => s[0] === 'structure') + 1, 0, ['obs', 'Observations']);
const _setupN5 = ch8Setup;
ch8Setup = function (pr, t) {
  let h = _setupN5.apply(this, arguments); if (!pr) return h;
  if (t === 'obs') h = h.replace('</ol>undefined', '</ol>' + n5Section(pr));
  const d = n5Shown(pr), { block } = n5Check(pr);
  if (d && d.required !== null && !block.length) h = h.replace(`<li class="step "><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="obs">`, `<li class="step done"><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="obs">`);
  return h;
};
const _reviewN5 = ch8ReviewStep;
ch8ReviewStep = function (pr) { const h = _reviewN5.apply(this, arguments), d = pr && n5Shown(pr); if (!d) return h; return h.replace('<dt>Offer letter</dt>', `<dt>Observations</dt><dd class="small n5-rev">${esc(n5Summary(pr, d))}</dd><dt>Offer letter</dt>`); };

// The shared library now says what it does and doesn't change
const _libN5 = SCREENS['k-obslib'];
const N5_LIB_NOTE = `<div class="note b-amber n5-libnote">${ic('info')}<div class="small"><strong>Each NVQ programme version now has its own observation criteria</strong> (NVQ Programmes → programme → Observations). Changes to this shared library don't change any programme version's configuration. It still supplies the criteria on today's observation forms.</div></div>`;
SCREENS['k-obslib'] = p => { const h = _libN5(p), k = h.indexOf('<div class="note b-blue">'); return k < 0 ? N5_LIB_NOTE + h : h.slice(0, k) + N5_LIB_NOTE + h.slice(k); };

// Demo Scenario #28 publishes Level 3 Version 3: the demo first records the observation decision the version now needs
// (Yes, workplace permitted, Academy office available, assessor notes as evidence), through the same audited fields
const _sc28N5 = ACT.s3Sc28Pub;
ACT.s3Sc28Pub = () => {
  if (!s3Draft('NV-L3')) ACT.s3Sc28Edit(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
  const pr = s3Pr('NV-L3'), d = pr && n5Draft(pr);
  if (d && d.required === null) {
    const was = n5Summary(pr, d); Object.assign(d, { required: true, workplace: d.workplace || 'Permitted', office: d.office || 'Available' });
    n5NvqOk(pr, d).forEach(c => { if (!(d.nvq[c.code] && d.nvq[c.code].types.length)) d.nvq[c.code] = { types: ['notes'], instr: (d.nvq[c.code] || {}).instr || '' }; });
    d.ia.filter(c => c.status === 'Active' && !c.ev.types.length).forEach(c => { c.ev.types = ['notes']; if (c.pubV != null && c.v === c.pubV) c.v = c.pubV + 1; });
    n5Log(pr, 'Observation settings changed', was, n5Summary(pr, d), 'Demo Scenario #28'); toast('Demo: Version 3 records "Observation required: Yes" (see its Observations tab).', 'info');
  }
  return _sc28N5();
};

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) n5Init();

/* ---------- Records ---------- */
UXC.push(['N5a', 'Programme-specific observation configuration (N5 architecture approved 20 Oct 2026)', [
  'Every NVQ programme version has its own observation configuration on a new "Observations" tab (seeded programmes, after the shared library tab) or step (new-programme wizard, after Structure): Observation required (Yes / No), Workplace observation (Permitted / Not permitted), Academy-office observation (Available as the approved alternative / Not available), the programme\'s own Academy observation criteria, and permitted evidence plus instructions for every criterion (assessor notes, photos, videos, documents, authorised references — any subset; no file-size or retention rule).',
  'NVQ observation criteria come from the version\'s structure (Learning Outcomes of the Observation type) and are frozen with the version when it is published. Academy criteria carry an explicit mapping to those NVQ criteria. The tab shows what each observation type covers: workplace = the programme\'s Academy criteria + NVQ criteria; Academy office = NVQ criteria only (G6.6). Nothing records or decides an outcome.',
  'Lifecycle: edited only in a Draft programme or a draft version, published with it (both builders, both publish actions), then frozen. A new version starts as a copy; a changed criterion gets the next criterion version; published criteria are retired, never removed. Publishing is blocked when observation is required but the version has no active NVQ observation criteria, no way to observe, evidence settings missing, or stale mappings.',
  'Review corrections: every new programme and every new version must record "Observation required: Yes / No" before publishing (a new version doesn\'t inherit the answer; the previous one is shown as a reminder). "No" demands no criteria, routes or evidence and keeps any Academy criteria in the version for history; active Observation-type Learning Outcomes are flagged for review (D5) in the checks, the Review step and the publish dialog. Published versions migrated with unknown settings are never re-validated. The programme\'s old library tab is now "Shared library (legacy)": read-only, pointing to the Observations tab (the library page itself is unchanged and still supplies today\'s forms). Demo Scenario #28 records "Yes" for Level 3 Version 3 before publishing it.',
  'Ownership and migration: a criterion\'s identity is its programme, version and code — the same code may exist in several programmes with no shared state. The shared library is unchanged and still supplies today\'s observation forms; each current published version got an independent copy of the library criteria that were Active, on observation forms and attached to it (Level 2 and Level 3: IA-1–IA-4). Other attachments are listed on the tab, not copied. Earlier versions show "No observation configuration recorded".',
  'Access: only the Super Admin, Academic Admin and System Admin (the existing programme administrators) change it, in the admin portal; every action checks the role and that the version is still a draft, and refusals are logged. Viewing needs those roles or a custom role with Courses & Programmes: View. Coordinators, assessors, learners, agencies, Finance, Business and IQA get no access.']]);
const _aIdxN5 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxN5(p) + `<section class="card idx-sec"><h2>N5a — Programme observation configuration</h2><ul class="idx-list">${[
  chIdxLi('Level 3 → Observations (published, migrated)', { act: 'aJump', t: 'a-programmes.NV-L3.obs' }, 'N5a — the version\'s own settings, NVQ and Academy criteria, evidence and mapping; read-only once published.'),
  chIdxLi('Level 3 2027 update (Draft) → Observations', { act: 'aJump', t: 'a-programmes.NV-L3D.obs' }, 'N5a — a Draft programme: "Observation required" must be chosen, then the configuration is checked at publication.'),
  chIdxLi('Level 3 → Shared library (legacy)', { act: 'aJump', t: 'a-programmes.NV-L3.library' }, 'N5a — the old library tab, read-only, pointing to Observations.'),
  chIdxLi('New programme → Observations step', { act: 'aJump', t: 'a-programmes.NV-N1.obs' }, 'N5a — the same section in the new-programme wizard, after Structure.')].join('')}</ul></section>`;
