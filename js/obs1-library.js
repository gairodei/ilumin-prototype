/* ============================================================
   OBS-1 — Observation Criteria Library (2 Nov 2026; PD-OBS1-* in PROVISIONAL-DECISIONS.md). Loads last.
   B1/B2 A shared library of observation criteria categories (STORE.ol1): a category (stable ID, unique code such as ABS, name,
       description) holds criteria (stable ID, unique code ABS-01…, title, instructions, order, evidence fields — any of Assessor
       notes, Photos, Videos, Documents, Authorised references — and which of them are required). Categories are edited in a draft
       and published as frozen versions; a changed criterion gets the next criterion version; published criteria are retired, never
       deleted; a category is retired, never deleted. Managed by the programme administrators (Super Admin, Academic Admin, System
       Admin — the N5a rule); viewed by them or a custom role with Courses & Programmes: View.
   B3/B4/B5 Course builder, Section 4: "Workplace Observation Criteria" (shown when observation is required and workplace observation
       is permitted) and "Academy Observation Criteria" (required and Academy office available) select categories — all or chosen
       criteria — from the library, or create a new category in place (saved to the library, published as Version 1 and selected).
       The Academy tab either uses the same criteria as Workplace (inheritance; inherited criteria can be excluded) or its own, plus
       Academy-only additions. Selections live in the programme version's N5a configuration (d.ol1), follow the categories' current
       published versions while the course version is a draft, and are frozen into the published configuration (cfg.ol1snap) when
       the version is published. Hidden tabs keep their draft selections; a location that isn't enabled publishes no criteria.
   B6–B8 The learner's observation location stays the Coordinator's per-event choice (D1); the location's criteria from the learner's
       pinned version are shown to the Coordinator, the learner and the observation assessor. The assessor records evidence per
       criterion (only the fields the criterion enables, author and time stamped) and chooses the outcome separately — evidence never
       sets Met. Sign-off needs an outcome for every criterion and the required evidence of every Met criterion; the result is frozen
       in the signed report (report.ol1). Fees, consent, bookings and sign-off rules are unchanged (D1, CH-38/40, MR-G2).
   B9 No automatic migration: legacy shared-list criteria, programme IA criteria and NVQ criteria stay where they are; the library
       page lists them for review. Records signed before OBS-1 are never rewritten.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE IT ON THE SERVER.
   ============================================================ */
'use strict';

/* ---------- Store ---------- */
const OL1 = () => (STORE.ol1 = STORE.ol1 || { cats: [], n: 0, m: 0 });
const _isO1 = initStore; initStore = function () { STORE.ol1 = null; const r = _isO1.apply(this, arguments); OL1(); return r; };
if (typeof STORE !== 'undefined' && STORE) OL1();
const ol1Cat = id => OL1().cats.find(c => c.id === id) || null;
const ol1Cur = c => (c && c.vers.length ? c.vers[c.vers.length - 1] : null);       // the latest published version
const ol1St = c => (c.retired ? 'Retired' : c.vers.length ? 'Published' : 'Draft');
const ol1Me = () => (ADMIN && ADMIN.me ? ADMIN.me.name : '—');
const ol1Ent = c => `${c.code} (${c.id})`;
const ol1Log = (c, action, before, after, r) => logA('Observation Criteria Library', c ? ol1Ent(c) : '—', action, before, after, r || '');
const OL1_EVL = k => (N5_EV.find(e => e[0] === k) || [k, k])[1];
const ol1EvTxt = it => (it.ev || []).map(k => OL1_EVL(k) + ((it.req || []).includes(k) ? ' (required)' : '')).join(', ') || 'none';
const ol1EvChips = it => (it.ev || []).map(k => `<span class="typebadge${(it.req || []).includes(k) ? ' ol1-req' : ''}">${esc(OL1_EVL(k))}${(it.req || []).includes(k) ? ' · required' : ''}</span>`).join(' ') || '<span class="muted small">None</span>';
const OL1_FILE = ['photos', 'videos', 'docs'], OL1_TEXT = ['notes', 'refs'];
const OL1_MOD = 'Observation Criteria Library';

/* ---------- Who may manage and see it (the N5a programme-administration rule) ---------- */
const ol1CanEdit = () => n5CanEdit();
const ol1CanView = () => n5CanView();
const OL1_WHY = 'Only the Super Admin, Academic Admin and System Admin (the programme administrators) manage the observation criteria library, in the admin console.';
const ol1Deny = (ent, what, why) => w0Deny(OL1_MOD, ent || '—', what, why || OL1_WHY);

/* ---------- Criteria: validation ---------- */
// A criterion is complete with a title, instructions and at least one evidence field; required fields must be enabled ones
function ol1CritErr(x, sibs) {
  if (!x.title) return 'Enter the criterion title';
  if (!x.instr) return 'Enter the description / instructions for the assessor';
  if (!x.ev.length) return 'Choose at least one evidence field';
  const bad = x.req.filter(k => !x.ev.includes(k)); if (bad.length) return `A required field must also be enabled: ${bad.map(OL1_EVL).join(', ')}`;
  if ((sibs || []).some(s => s.id !== x.id && s.status !== 'Retired' && s.title.trim().toLowerCase() === x.title.trim().toLowerCase())) return 'This category already has a criterion with this title';
  return '';
}
const OL1_CODE = /^[A-Z][A-Z0-9]{1,7}$/;
function ol1CodeErr(code) {
  if (!OL1_CODE.test(code)) return 'Use 2–8 capital letters or digits, starting with a letter (for example ABS)';
  if (OL1().cats.some(c => c.code.toUpperCase() === code.toUpperCase())) return `The code ${code} is already used by a category in the library (codes are never reused)`;
  return '';
}
// The editable copy of a category (the next version); created from the latest version on first change
function ol1Work(c) {
  if (c.work) return c.work; const cur = ol1Cur(c);
  c.work = { name: cur ? cur.name : c.name, desc: cur ? cur.desc : c.desc, crit: cur ? n5Clone(cur.crit) : [], from: cur ? cur.v : 0, at: now().toISOString(), by: ol1Me() };
  return c.work;
}
const ol1Shown = c => c.work || ol1Cur(c) || { name: c.name, desc: c.desc, crit: [] };
const ol1NextCode = c => { c.next = (c.next || 0) + 1; return `${c.code}-${String(c.next).padStart(2, '0')}`; };
function ol1NewCrit(c, x) { return { id: 'OCR-' + (++OL1().m), code: ol1NextCode(c), title: x.title, instr: x.instr, ev: x.ev.slice(), req: x.req.slice(), seq: 0, status: 'Active', v: 0 }; }
const ol1Seq = list => list.forEach((x, i) => { x.seq = i + 1; });
const ol1Same = (a, b) => JSON.stringify([a.title, a.instr, a.ev, a.req, a.status]) === JSON.stringify([b.title, b.instr, b.ev, b.req, b.status]);

function ol1Create(code, name, desc) {
  const c = { id: 'OCAT-' + (++OL1().n), code, name, desc, vers: [], work: null, next: 0, retired: null, created: { at: now().toISOString(), by: ol1Me() } };
  OL1().cats.push(c); c.work = { name, desc, crit: [], from: 0, at: c.created.at, by: c.created.by };
  ol1Log(c, 'Category created', '—', `${code} — ${name}`, 'Draft (not yet published)'); return c;
}
// Publish the draft as the next frozen version. Returns '' or why not.
function ol1PublishCat(c, note) {
  if (c.retired) return 'This category is retired.';
  const w = c.work; if (!w) return 'There are no draft changes to publish.';
  const live = w.crit.filter(x => x.status === 'Active'); if (!live.length) return 'Add at least one active criterion first.';
  const bad = w.crit.map(x => [x, ol1CritErr(x, w.crit)]).filter(([, e]) => e); if (bad.length) return `Complete ${bad[0][0].code}: ${bad[0][1]}.`;
  const prev = ol1Cur(c), v = (prev ? prev.v : 0) + 1;
  const crit = n5Clone(w.crit); ol1Seq(crit);
  crit.forEach(x => { const p = prev && prev.crit.find(y => y.id === x.id); x.v = !p ? 1 : ol1Same(p, x) ? p.v : p.v + 1; });
  c.vers.push(n5Freeze({ v, name: w.name, desc: w.desc, crit, at: now().toISOString(), by: ol1Me(), note: note || '' }));
  c.name = w.name; c.desc = w.desc; c.work = null;
  ol1Log(c, 'Category version published', prev ? `Version ${prev.v}` : 'Draft', `Version ${v} · ${plural(crit.filter(x => x.status === 'Active').length, 'active criterion', 'active criteria')}`, note);
  return '';
}

/* ---------- Course configuration: selections in the N5a draft, frozen at publication ---------- */
const OL1_NONE = Object.freeze({ wp: Object.freeze([]), off: Object.freeze({ mode: null, add: Object.freeze([]), excl: Object.freeze([]) }) });
const ol1Cfg = d => (d && d.ol1) || OL1_NONE;
const ol1CfgW = d => { d.ol1 = d.ol1 || { wp: [], off: { mode: null, add: [], excl: [] } }; return d.ol1; };
// "Same as Workplace" only exists while workplace observation is permitted; it is the default then
const ol1Mode = d => (d.workplace === 'Permitted' ? (ol1Cfg(d).off.mode || 'same') : 'own');
const ol1Item = (c, cur, x, from) => ({ id: x.id, code: x.code, title: x.title, instr: x.instr, ev: x.ev.slice(), req: x.req.slice(), seq: x.seq, critV: x.v, cat: c.id, catCode: c.code, catName: cur.name, catV: cur.v, from });
// The criteria of a selection list, from each category's current published version (a draft course version follows the library)
function ol1Items(sels, from) {
  const items = [], probs = [];
  (sels || []).forEach(s => {
    const c = ol1Cat(s.cat); if (!c) { probs.push({ block: true, t: `a selected category no longer exists (${s.cat})` }); return; }
    const cur = ol1Cur(c); if (!cur) { probs.push({ block: true, t: `${c.code} has no published version` }); return; }
    if (c.retired) probs.push({ block: true, t: `${c.code} is retired — remove it or choose another category` });
    const live = cur.crit.filter(x => x.status === 'Active'), pick = s.all ? live : live.filter(x => (s.crit || []).includes(x.id));
    const gone = s.all ? [] : (s.crit || []).filter(id => !live.some(x => x.id === id));
    if (gone.length) probs.push({ block: false, t: `${plural(gone.length, 'chosen criterion is', 'chosen criteria are')} no longer active in ${c.code} Version ${cur.v} and won't be used` });
    if (!pick.length) probs.push({ block: true, t: `no active criteria chosen from ${c.code}` });
    pick.forEach(x => items.push(ol1Item(c, cur, x, from)));
  });
  return { items, probs };
}
// The criteria of one location ('wp' | 'off'): live for a draft, the frozen snapshot for a published configuration
function ol1Resolve(d, loc) {
  if (!d) return { items: [], excluded: [], probs: [] };
  if (d.state !== 'Draft') { const s = d.ol1snap; return { items: s ? s[loc].slice() : [], excluded: [], probs: [], none: !s }; }
  const o = ol1Cfg(d), wp = ol1Items(o.wp, 'wp'); if (loc === 'wp') return { ...wp, excluded: [] };
  const inh = ol1Mode(d) === 'same' ? wp.items : [], excl = new Set(o.off.excl || []), add = ol1Items(o.off.add, 'office'), seen = new Set();
  const items = inh.filter(i => !excl.has(i.id)).map(i => ({ ...i, from: 'inherited' })); items.forEach(i => seen.add(i.id));
  add.items.forEach(i => { if (!seen.has(i.id)) { seen.add(i.id); items.push(i); } });
  return { items, excluded: inh.filter(i => excl.has(i.id)), probs: add.probs, inherited: inh.length > 0 };
}
// The published snapshot: only enabled locations, only when observation is required
function ol1Snap(d) {
  const on = d.required === true;
  return { wp: on && d.workplace === 'Permitted' ? ol1Resolve(d, 'wp').items : [], off: on && d.office === 'Available' ? ol1Resolve(d, 'off').items : [], mode: ol1Mode(d), excl: (ol1Cfg(d).off.excl || []).slice(), at: now().toISOString(), by: ol1Me() };
}
const _pubO1 = n5Publish;
n5Publish = function (pr, d) { if (d && d.ol1) { try { d.ol1snap = ol1Snap(d); } catch (e) { d.ol1snap = { wp: [], off: [], err: String(e && e.message) }; } } else if (d) delete d.ol1snap; return _pubO1.apply(this, arguments); };
// Publishing checks (draft only)
function ol1Problems(pr, d) {
  const block = [], warn = []; if (!d || d.state !== 'Draft' || !d.ol1) return { block, warn };
  const o = ol1Cfg(d), n = o.wp.length + o.off.add.length;
  if (d.required !== true) { if (n) warn.push(`Observations: library criteria selections are kept in Version ${d.v} (draft) but not used while observation isn't required`); return { block, warn }; }
  const chk = (sels, where, on) => {
    if (!on) { if (sels.length) warn.push(`Observations: ${where} criteria selections are kept in the draft but won't be published — ${where.toLowerCase()} observation isn't enabled`); return; }
    ol1Items(sels).probs.forEach(p => (p.block ? block : warn).push(`Observations: ${where} Observation Criteria — ${p.t}`));
  };
  chk(o.wp, 'Workplace', d.workplace === 'Permitted'); chk(o.off.add, 'Academy', d.office === 'Available');
  if (d.office === 'Available' && ol1Mode(d) === 'own' && o.off.mode === 'same') warn.push('Observations: Academy Observation Criteria were set to "same as Workplace", but workplace observation isn\'t permitted — only the Academy criteria selected are used');
  return { block, warn };
}
const _checkO1 = n5Check;
n5Check = function (pr) { const r = _checkO1.apply(this, arguments), d = pr && n5DraftV(pr) ? n5Draft(pr) : null; if (!d) return r; const p = ol1Problems(pr, d); r.block.push(...p.block); r.warn.push(...p.warn); return r; };

/* ---------- Library actions ---------- */
function ol1Gate(el, what) {
  const k = el && el.dataset ? el.dataset.k : null, c = k ? ol1Cat(k) : null;
  if (!ol1CanEdit()) { ol1Deny(c ? ol1Ent(c) : k, what); return null; }
  if (k && !c) { toast('Category not found.', 'err'); return null; }
  if (c && c.retired) { ol1Log(c, 'Blocked: ' + what, '—', '—', 'Retired category — read-only'); toast('This category is retired, so it is read-only. Observations recorded with it keep it.', 'err'); return null; }
  return c || {};
}
const ol1Still = () => { if (ol1CanEdit()) return true; ol1Deny('—', 'save observation criteria library', OL1_WHY); closeModal(); render(); return false; };
const ol1EvBoxes = (x, idp) => `<fieldset class="field n5-fs ol1-evfs"><legend class="lbl">Evidence fields</legend><div class="n5-evs">${N5_EV.map(([k, l]) => `<label class="check"><input type="checkbox" class="ol1-ev${idp ? ' ' + idp + '-ev' : ''}" value="${k}" ${(x.ev || []).includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div><span class="hint">Tick every type of evidence the assessor may record for this criterion — one or more.</span></fieldset>
  <fieldset class="field n5-fs ol1-rqfs"><legend class="lbl">Required evidence (optional)</legend><div class="n5-evs">${N5_EV.map(([k, l]) => `<label class="check"><input type="checkbox" class="ol1-rq${idp ? ' ' + idp + '-rq' : ''}" value="${k}" ${(x.req || []).includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div><span class="hint">Only where the course needs it: a required field must have evidence before the criterion can be signed off as Met. Supplying evidence never sets the outcome.</span></fieldset>`;
const ol1Ticks = (root, cls) => [...root.querySelectorAll('.' + cls + ':checked')].map(x => x.value);

ACT.ol1CatNew = () => {
  if (!ol1Gate(null, 'create an observation criteria category')) return;
  openModal({ title: 'New observation criteria category', size: 'lg', body: `<p class="small muted">The category is saved to the shared library as a draft. Add its criteria, then publish it to make it available to courses.</p>
    <div class="form-grid"><div class="field"><label for="ol1-code">Code</label><input class="input mono" id="ol1-code" placeholder="e.g. ABS" maxlength="8"><span class="hint">Unique in the library and never reused. Criteria are numbered from it (ABS-01, ABS-02 …).</span></div>
    <div class="field"><label for="ol1-name">Name</label><input class="input" id="ol1-name" placeholder="e.g. Attitudes, behaviours and standards"></div></div>
    <div class="field"><label for="ol1-desc">Description</label><textarea class="textarea" id="ol1-desc"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Create category', cls: 'btn-primary', fn: () => {
      if (!ol1Still()) return false;
      const code = mval('#ol1-code').toUpperCase(), name = mval('#ol1-name'), e = ol1CodeErr(code);
      if (e) { fieldErr('#ol1-code', e); return false; } if (!name) { fieldErr('#ol1-name', 'Enter a name'); return false; }
      const c = ol1Create(code, name, mval('#ol1-desc')); go('k-ocl', { id: c.id }); toast(`${code} created as a draft. Add its criteria, then publish it.`);
    } }] });
};
ACT.ol1CatEdit = el => {
  const c = ol1Gate(el, 'change an observation criteria category'); if (!c || !c.id) return; const w = ol1Shown(c);
  openModal({ title: `Category details — ${esc(c.code)}`, body: `<p class="small muted">The code can't change. ${c.vers.length ? `Saved in the draft of Version ${ol1Cur(c).v + 1}; courses keep the version they published with.` : 'Saved in the draft.'}</p>
    <div class="field"><label for="ol1-name">Name</label><input class="input" id="ol1-name" value="${esc(w.name)}"></div><div class="field"><label for="ol1-desc">Description</label><textarea class="textarea" id="ol1-desc">${esc(w.desc || '')}</textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      if (!ol1Still()) return false; const name = mval('#ol1-name'), desc = mval('#ol1-desc'); if (!name) { fieldErr('#ol1-name', 'Enter a name'); return false; }
      if (name === w.name && desc === (w.desc || '')) { toast('Nothing has changed.', 'info'); return false; }
      const wk = ol1Work(c), was = `${wk.name} · ${wk.desc || '—'}`; Object.assign(wk, { name, desc }); if (!c.vers.length) Object.assign(c, { name, desc });
      ol1Log(c, 'Category details changed', was, `${name} · ${desc || '—'}`, 'Draft'); render(); toast('Saved in the draft.');
    } }] });
};
ACT.ol1CritEdit = el => {
  const c = ol1Gate(el, el && el.dataset && el.dataset.c ? 'change an observation criterion' : 'add an observation criterion'); if (!c || !c.id) return;
  const sh = ol1Shown(c), x = el.dataset.c ? sh.crit.find(y => y.id === el.dataset.c) : null; if (el.dataset.c && !x) { toast('Criterion not found.', 'err'); return; }
  if (x && x.status !== 'Active') { toast('Restore the criterion before changing it.', 'err'); return; }
  openModal({ title: x ? `Edit ${esc(x.code)}` : `Add a criterion to ${esc(c.code)}`, size: 'lg', body: `<p class="small muted">${x ? `${esc(x.code)} keeps its code and identity. ` : `It gets the next code (${esc(c.code)}-${String((c.next || 0) + 1).padStart(2, '0')}). `}${c.vers.length ? 'Saved in the category\'s draft; published course versions and recorded observations keep the version they used.' : 'Saved in the draft.'}</p>
    <div class="field"><label for="ol1-ct">Title</label><input class="input" id="ol1-ct" value="${x ? esc(x.title) : ''}"></div>
    <div class="field"><label for="ol1-ci">Description / instructions for the assessor</label><textarea class="textarea" id="ol1-ci">${x ? esc(x.instr) : ''}</textarea></div>${ol1EvBoxes(x || { ev: [], req: [] })}`,
    actions: [{ label: 'Cancel' }, { label: x ? 'Save criterion' : 'Add criterion', cls: 'btn-primary', fn: () => {
      if (!ol1Still()) return false; const m = $('#modal-root');
      const nx = { id: x ? x.id : null, title: mval('#ol1-ct'), instr: mval('#ol1-ci'), ev: ol1Ticks(m, 'ol1-ev'), req: ol1Ticks(m, 'ol1-rq') };
      const wk = ol1Work(c), cur = x ? wk.crit.find(y => y.id === x.id) : null, e = ol1CritErr(nx, wk.crit);
      if (e) { fieldErr(/title/i.test(e) && !/already/.test(e) ? '#ol1-ct' : /instructions/.test(e) ? '#ol1-ci' : /already/.test(e) ? '#ol1-ct' : '#ol1-ct', e + '.'); return false; }
      if (!x) { const n = ol1NewCrit(c, nx); wk.crit.push(n); ol1Seq(wk.crit); ol1Log(c, 'Criterion added', '—', `${n.code} ${n.title} · evidence ${ol1EvTxt(n)}`, 'Draft'); render(); toast(`${n.code} added to the draft.`); return; }
      if (!cur) { toast('Criterion not found in the draft.', 'err'); return false; }
      if (ol1Same(cur, { ...nx, status: cur.status })) { toast('Nothing has changed.', 'info'); return false; }
      const was = `${cur.title} · evidence ${ol1EvTxt(cur)}`; Object.assign(cur, { title: nx.title, instr: nx.instr, ev: nx.ev, req: nx.req });
      ol1Log(c, 'Criterion changed', `${cur.code}: ${was}`, `${cur.title} · evidence ${ol1EvTxt(cur)}`, 'Draft'); render(); toast(`${cur.code} saved in the draft.`);
    } }] });
};
ACT.ol1CritMove = el => {
  const c = ol1Gate(el, 'reorder observation criteria'); if (!c || !c.id) return; const wk = ol1Work(c), i = wk.crit.findIndex(x => x.id === el.dataset.c), j = i + (+el.dataset.dir);
  if (i < 0 || j < 0 || j >= wk.crit.length) return; [wk.crit[i], wk.crit[j]] = [wk.crit[j], wk.crit[i]]; ol1Seq(wk.crit);
  ol1Log(c, 'Criteria reordered', '—', wk.crit.map(x => x.code).join(' → '), 'Draft'); render();
};
// Retire (kept for history) / restore / remove (only a criterion that was never published)
ACT.ol1CritState = el => {
  const a = el.dataset.a, c = ol1Gate(el, a === 'remove' ? 'remove an observation criterion' : 'change an observation criterion'); if (!c || !c.id) return;
  const wk0 = ol1Shown(c), x0 = wk0.crit.find(y => y.id === el.dataset.c); if (!x0) return;
  const pub = c.vers.some(v => v.crit.some(y => y.id === x0.id));
  if (a === 'remove' && pub) { ol1Log(c, 'Blocked: remove an observation criterion', x0.code, '—', 'Published criteria are kept — retire it instead'); toast('Published criteria can\'t be removed — retire it instead.', 'err'); return; }
  reasonDlg({ title: `${a === 'remove' ? 'Remove' : a === 'retire' ? 'Retire' : 'Restore'} ${esc(x0.code)}`, ok: a === 'remove' ? 'Remove' : a === 'retire' ? 'Retire' : 'Restore', danger: a !== 'restore', body: `<p class="small">${a === 'remove' ? 'It was never published, so it is removed from the draft.' : a === 'retire' ? 'It stays in earlier versions and in every course version and observation that used it, but is not in the next version.' : 'It goes back into the next version.'}</p>`,
    onOk: r => { if (!ol1Still()) return false; const wk = ol1Work(c), x = wk.crit.find(y => y.id === x0.id); if (!x) return;
      if (a === 'remove') { wk.crit.splice(wk.crit.indexOf(x), 1); ol1Seq(wk.crit); ol1Log(c, 'Criterion removed (never published)', `${x.code} ${x.title}`, '—', r); }
      else { const was = x.status; x.status = a === 'retire' ? 'Retired' : 'Active'; ol1Log(c, a === 'retire' ? 'Criterion retired' : 'Criterion restored', `${x.code}: ${was}`, x.status, r); }
      render(); toast('Saved in the draft.'); } });
};
ACT.ol1CatPub = el => {
  const c = ol1Gate(el, 'publish an observation criteria category'); if (!c || !c.id) return;
  const pre = c.work ? (() => { const w = c.work; if (!w.crit.some(x => x.status === 'Active')) return 'Add at least one active criterion first.'; const b = w.crit.find(x => ol1CritErr(x, w.crit)); return b ? `Complete ${b.code}: ${ol1CritErr(b, w.crit)}.` : ''; })() : 'There are no draft changes to publish.';
  if (pre) { ol1Log(c, 'Blocked: publish category', '—', '—', pre); toast(pre, 'err'); return; }
  const v = (ol1Cur(c) ? ol1Cur(c).v : 0) + 1;
  reasonDlg({ title: `Publish ${esc(c.code)} Version ${v}`, ok: 'Publish', label: 'Version note (required)', body: `<p class="small">Version ${v} becomes available to course builders. Course versions already published, learners' requirements and recorded observations keep the version they used.</p>`,
    onOk: r => { if (!ol1Still()) return false; const e = ol1PublishCat(c, r); if (e) { toast(e, 'err'); return false; } render(); toast(`${c.code} Version ${v} published.`); } });
};
ACT.ol1CatDiscard = el => {
  const c = ol1Gate(el, 'discard draft changes'); if (!c || !c.id) return; if (!c.work || !c.vers.length) { toast('There are no draft changes to discard.', 'info'); return; }
  reasonDlg({ title: `Discard the draft changes to ${esc(c.code)}`, ok: 'Discard', danger: true, body: `<p class="small">The category goes back to Version ${ol1Cur(c).v}.</p>`, onOk: r => { if (!ol1Still()) return false; c.work = null; ol1Log(c, 'Draft changes discarded', 'Draft', `Version ${ol1Cur(c).v}`, r); render(); toast('Draft discarded.'); } });
};
ACT.ol1CatRetire = el => {
  const c = ol1Gate(el, 'retire an observation criteria category'); if (!c || !c.id) return;
  reasonDlg({ title: `Retire ${esc(c.code)}`, ok: 'Retire', danger: true, body: `<p class="small">It can no longer be selected for a course. Nothing is deleted: published course versions, learners' requirements and recorded observations keep it. Course drafts that still select it are blocked from publishing until it is removed there.</p>`,
    onOk: r => { if (!ol1Still()) return false; c.retired = { at: now().toISOString(), by: ol1Me(), why: r }; ol1Log(c, 'Category retired', ol1Cur(c) ? `Version ${ol1Cur(c).v}` : 'Draft', 'Retired', r); render(); toast(`${c.code} retired.`); } });
};
// Read-only inspection of any published version
ACT.ol1CatView = el => {
  if (!ol1CanView()) return ol1Deny(el && el.dataset && el.dataset.k, 'view an observation criteria category version', 'Only programme administrators can view the observation criteria library.');
  const c = ol1Cat(el.dataset.k), v = c && c.vers.find(x => x.v === +el.dataset.v); if (!v) { toast('Version not found.', 'err'); return; }
  openModal({ title: `${esc(c.code)} — Version ${v.v}`, sub: `Published ${fdt(v.at)} by ${esc(v.by)}${v.note ? ' · ' + esc(v.note) : ''}`, size: 'lg', body: `<p class="small"><strong>${esc(v.name)}</strong> ${esc(v.desc || '')}</p>${ol1CritTable(v.crit, false, c)}`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
INP.ol1Find = el => { const q = String(el.value || '').trim().toLowerCase(), box = el.closest(el.dataset.box || '.modal-b') || document; box.querySelectorAll('[data-ol1s]').forEach(r => { const on = !q || r.dataset.ol1s.toLowerCase().includes(q); r.hidden = !on; r.style.display = on ? '' : 'none'; }); };

/* ---------- Library screens ---------- */
function ol1CritTable(crit, ed, c) {
  if (!crit.length) return '<p class="small muted">No criteria yet.</p>';
  return `<div class="tbl-wrap"><table class="tbl dense ol1-crit"><thead><tr><th>#</th><th>Code</th><th>Criterion</th><th>Evidence fields</th><th>Status</th><th>Version</th>${ed ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${crit.map((x, i) => `<tr data-code="${esc(x.code)}" data-id="${x.id}"><td>${x.seq || i + 1}</td><td class="nowrap"><span class="code">${esc(x.code)}</span></td><td><strong>${esc(x.title)}</strong><div class="xs muted">${esc(x.instr)}</div></td><td>${ol1EvChips(x)}</td><td>${chip(x.status, x.status === 'Active' ? 'green' : 'grey')}</td><td class="xs">${x.v ? 'v' + x.v : 'new'}</td>${ed ? `<td class="nowrap">${x.status === 'Active' ? `<button class="btn btn-sm btn-ghost" data-act="ol1CritMove" data-k="${c.id}" data-c="${x.id}" data-dir="-1" aria-label="Move ${esc(x.code)} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-sm btn-ghost" data-act="ol1CritMove" data-k="${c.id}" data-c="${x.id}" data-dir="1" aria-label="Move ${esc(x.code)} down" ${i === crit.length - 1 ? 'disabled' : ''}>↓</button><button class="btn btn-sm" data-act="ol1CritEdit" data-k="${c.id}" data-c="${x.id}">Edit</button> ` : ''}${c.vers.some(v => v.crit.some(y => y.id === x.id)) ? `<button class="btn btn-sm" data-act="ol1CritState" data-k="${c.id}" data-c="${x.id}" data-a="${x.status === 'Active' ? 'retire' : 'restore'}">${x.status === 'Active' ? 'Retire' : 'Restore'}</button>` : `<button class="btn btn-sm" data-act="ol1CritState" data-k="${c.id}" data-c="${x.id}" data-a="remove">Remove</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
// Where a category is used: programme versions (published snapshots, drafts) and signed-off observation records
function ol1Usage(cid) {
  const progs = [], recs = [];
  (ADMIN.programmes || []).forEach(pr => {
    Object.values(N5().pub[pr.id] || {}).forEach(cfg => { const s = cfg.ol1snap; if (!s) return; const wp = s.wp.filter(i => i.cat === cid), off = s.off.filter(i => i.cat === cid); if (wp.length || off.length) progs.push({ pr, v: cfg.v, state: 'Published', wp, off, catV: Array.from(new Set(wp.concat(off).map(i => i.catV))).join(', ') }); });
    const d = N5().draft[pr.id]; if (d && d.ol1) { const o = d.ol1, n = o.wp.filter(s => s.cat === cid).length + o.off.add.filter(s => s.cat === cid).length; if (n) progs.push({ pr, v: d.v, state: 'Draft', wp: ol1Resolve(d, 'wp').items.filter(i => i.cat === cid), off: ol1Resolve(d, 'off').items.filter(i => i.cat === cid), catV: 'current' }); }
  });
  Object.values(STORE.worlds || {}).forEach(w => (w && w.observations || []).forEach(o => { const r = o.report; if (!r || !r.ol1) return; const its = r.ol1.filter(i => i.cat === cid); if (!its.length) return;
    const b = typeof chBatchOfLid === 'function' && w.me ? chBatchOfLid(w.me.id) : null; recs.push({ w, o, its, batch: b ? b.code : '—' }); }));
  return { progs, recs };
}
function ol1MigCard() {
  const lib = (STORE.aca && STORE.aca.obsLib) || [], ia = [], recs = [];
  (ADMIN.programmes || []).forEach(pr => Object.values(N5().pub[pr.id] || {}).forEach(c => { const n = (c.ia || []).length; if (n) ia.push(`${pr.title} Version ${c.v}: ${plural(n, 'criterion', 'criteria')} (${c.ia.map(x => x.code).join(', ')})`); }));
  Object.values(STORE.worlds || {}).forEach(w => (w && w.observations || []).forEach(o => { if (o.status === 'Completed' && !(o.report && o.report.ol1)) recs.push(o); }));
  return `<section class="card ol1-mig"><h2>Existing criteria — not migrated (review)</h2><p class="small muted">Nothing was copied into this library automatically: an existing criterion is only brought in when its identity and meaning are established, and none could be from the records alone. Everything below is kept exactly as it is and keeps working.</p>
    <ul class="list small"><li class="li"><div class="li-b"><strong>Shared criteria list (legacy, S3-05)</strong><span class="xs muted">${plural(lib.length, 'criterion', 'criteria')} (${esc(lib.slice(0, 8).map(x => x.code).join(', '))}${lib.length > 8 ? '…' : ''}). Still supplies the observation forms of learners outside the event journey. Not migrated: the same IA codes were copied into programme versions independently (PD-N5a-09), so one code is not one criterion.</span></div>${chip('Review', 'amber')}</li>
    <li class="li"><div class="li-b"><strong>Programme Academy standards (IA criteria in programme versions)</strong><span class="xs muted">${ia.length ? esc(ia.slice(0, 6).join(' · ')) + (ia.length > 6 ? ' …' : '') : 'None recorded.'} Kept in each version; editable only in that programme's draft, as before.</span></div>${chip('Kept', 'grey')}</li>
    <li class="li"><div class="li-b"><strong>NVQ observation criteria</strong><span class="xs muted">Part of each qualification's curriculum (Learning Outcomes of the Observation type) — not library content.</span></div>${chip('Kept', 'grey')}</li>
    <li class="li"><div class="li-b"><strong>Signed-off observations recorded before the library</strong><span class="xs muted">${plural(recs.length, 'record')} — unchanged and locked; they show no library criteria. Corrections only through Data Correction.</span></div>${chip('Locked', 'grey')}</li></ul></section>`;
}
function ol1ListPage() {
  const ed = ol1CanEdit(), cats = OL1().cats;
  const rows = cats.map(c => { const s = ol1Shown(c), cur = ol1Cur(c), u = ol1Usage(c.id), st = ol1St(c);
    return `<tr data-ol1s="${esc([c.code, s.name, s.desc].concat(s.crit.map(x => x.code + ' ' + x.title)).join(' '))}" data-k="${c.id}"><td class="nowrap"><span class="code">${esc(c.code)}</span></td><td><a href="#k-ocl.${c.id}" data-go="k-ocl" data-id="${c.id}" class="strong">${esc(s.name)}</a><div class="xs muted">${esc(s.desc || '')}</div></td><td>${chip(st, st === 'Published' ? 'green' : st === 'Draft' ? 'amber' : 'grey')}${c.work && cur ? ' ' + chip('Draft changes', 'amber') : ''}</td><td class="small">${cur ? 'Version ' + cur.v : '—'}</td><td class="small">${s.crit.filter(x => x.status === 'Active').length}</td><td class="small">${plural(u.progs.length, 'course version')}</td></tr>`; }).join('');
  return `${pageA('Observation Criteria Library', 'Reusable observation criteria, grouped in categories and shared by every course\'s Workplace and Academy observation criteria', ed ? `<button class="btn btn-primary" data-act="ol1CatNew">${ic('plus', 15)}New category</button>` : '')}
    <div class="note b-blue ol1-how">${ic('info')}<div class="small">Categories are edited in a draft and published as versions. Course builders select published categories — all criteria or chosen ones — for workplace and Academy-office observations. A course version keeps the criteria it was published with: editing or retiring a category never changes published course versions, learners' requirements or recorded observations.</div></div>
    <section class="card ol1-list"><div class="row-b"><h2>Categories</h2><div class="field dt-q" style="margin:0"><label class="sr" for="ol1-q">Search categories and criteria</label><input class="input" type="search" id="ol1-q" placeholder="Search codes, names, criteria…" data-oninput="ol1Find" data-box=".ol1-list"></div></div>
    ${cats.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Code</th><th>Category</th><th>Status</th><th>Published</th><th>Active criteria</th><th>Used by</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small muted">No categories yet.</p>'}</section>
    ${ol1MigCard()}${auditPanel(a => a.module === OL1_MOD, 'Observation Criteria Library — audit')}`;
}
function ol1CatPage(c) {
  const ed = ol1CanEdit() && !c.retired, cur = ol1Cur(c), sh = ol1Shown(c), st = ol1St(c), u = ol1Usage(c.id), K = `data-k="${c.id}"`;
  const acts = ed ? `<button class="btn" data-act="ol1CatEdit" ${K}>${ic('edit', 14)}Details</button><button class="btn" data-act="ol1CritEdit" ${K} data-c="">${ic('plus', 14)}Add criterion</button>${c.work ? `<button class="btn btn-primary" data-act="ol1CatPub" ${K}>Publish Version ${(cur ? cur.v : 0) + 1}</button>` : ''}${c.work && cur ? `<button class="btn" data-act="ol1CatDiscard" ${K}>Discard draft</button>` : ''}${cur ? `<button class="btn btn-danger" data-act="ol1CatRetire" ${K}>Retire</button>` : ''}` : '';
  const head = `<section class="card ol1-head"><div class="row-b"><h2>${c.work ? `Draft — Version ${(cur ? cur.v : 0) + 1}` : `Version ${cur ? cur.v : '—'}`}</h2>${chip(st, st === 'Published' ? 'green' : st === 'Draft' ? 'amber' : 'grey')}</div>
    <p class="small"><strong>${esc(sh.name)}</strong> ${esc(sh.desc || '')}</p>${c.retired ? `<div class="note b-grey">${ic('lock')}<div class="small">Retired ${fdt(c.retired.at)} by ${esc(c.retired.by)}: ${esc(c.retired.why)}. It can't be selected for courses; courses and observations that used it keep it.</div></div>` : ''}
    ${c.work && cur ? `<p class="xs muted">Draft changes to Version ${cur.v}. Courses select Version ${cur.v} until the draft is published.</p>` : ''}${ol1CritTable(sh.crit, ed, c)}${ed && cur && !c.work ? '<p class="xs muted">Editing a criterion starts the draft of the next version.</p>' : ''}</section>`;
  const vers = `<section class="card ol1-vers"><h2>Versions</h2>${c.vers.length ? `<ul class="list small">${c.vers.slice().reverse().map(v => `<li class="li"><div class="li-b"><strong>Version ${v.v}</strong><span class="xs muted">Published ${fdt(v.at)} by ${esc(v.by)} · ${plural(v.crit.filter(x => x.status === 'Active').length, 'active criterion', 'active criteria')}${v.note ? ' · ' + esc(v.note) : ''}</span></div><button class="btn btn-sm" data-act="ol1CatView" ${K} data-v="${v.v}">View</button></li>`).join('')}</ul>` : '<p class="small muted">Not published yet.</p>'}</section>`;
  const use = `<section class="card ol1-use"><h2>Where it is used</h2>${u.progs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme</th><th>Version</th><th>Workplace</th><th>Academy office</th><th>Category version</th></tr></thead><tbody>${u.progs.map(p => `<tr><td><a href="#a-programmes.${p.pr.id}" data-go="a-programmes" data-id="${p.pr.id}" data-tab="wpcrit">${esc(p.pr.title)}</a></td><td>${p.v} ${chip(p.state, p.state === 'Draft' ? 'amber' : 'green')}</td><td class="small mono">${esc(p.wp.map(i => i.code).join(', ') || '—')}</td><td class="small mono">${esc(p.off.map(i => i.code).join(', ') || '—')}</td><td class="small">${esc(String(p.catV))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Not selected by any course version.</p>'}
    <h3>Signed-off observations</h3>${u.recs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Programme / batch</th><th>Observation</th><th>Signed off</th><th>Criteria (outcome)</th></tr></thead><tbody>${u.recs.map(r => `<tr><td>${esc(chFullName(r.w))} <span class="xs muted mono">${esc(r.w.me.id)}</span></td><td class="small">${esc((r.o.report.dEv || {}).prog || '—')} Version ${esc(String((r.o.report.dEv || {}).v || '—'))} · ${esc(r.batch)}</td><td class="small">${esc((r.o.report.dEv || {}).name || '—')} · ${esc(dTxtLoc((r.o.report.dEv || {}).loc))}</td><td class="small">${fdt(r.o.signed)} · ${esc(r.o.signedBy || '')}</td><td class="small">${r.its.map(i => `${esc(i.code)} v${i.critV} (${esc(i.out)})`).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No signed-off observation has used it yet.</p>'}</section>`;
  return `${pageA(`${esc(c.code)} — ${esc(sh.name)}`, `Observation criteria category · ${esc(c.id)} · created ${fd(c.created.at)} by ${esc(c.created.by)}`, acts, [['Observation Criteria Library', 'k-ocl'], [esc(c.code)]])}${head}${vers}${use}${auditPanel(a => a.module === OL1_MOD && String(a.entity || '').includes('(' + c.id + ')'), 'Category — audit')}`;
}
SCREENS['k-ocl'] = p => {
  if (!ol1CanView()) {
    const k = 'k-ocl|' + ((ADMIN.me || {}).name || ''); if (S._ol1Deny !== k) { S._ol1Deny = k; logA(OL1_MOD, '—', 'Blocked: view observation criteria library', '—', '—', 'Role has no programme administration responsibility'); }
    return `${pageA('Observation Criteria Library', '')}<section class="card"><div class="note b-red">${ic('lock')}<div class="small"><strong>You can't view the observation criteria library.</strong> It is managed by programme administrators. This attempt has been logged.</div></div></section>`;
  }
  const c = p && p.id ? ol1Cat(p.id) : null; if (p && p.id && !c) return `${pageA('Observation Criteria Library', '')}<section class="card"><p class="small">This category doesn't exist.</p><button class="btn" data-go="k-ocl">Back to the library</button></section>`;
  return c ? ol1CatPage(c) : ol1ListPage();
};
// Navigation: the new library before the legacy shared list (renamed in the menu only)
[typeof KNAV !== 'undefined' ? KNAV : null, typeof ANAV !== 'undefined' ? ANAV : null].forEach(N => {
  if (!Array.isArray(N)) return; const g = N.find(x => x[1].some(y => y[0] === 'k-obslib')); if (!g || g[1].some(y => y[0] === 'k-ocl')) return;
  const i = g[1].findIndex(y => y[0] === 'k-obslib'); g[1][i] = [g[1][i][0], 'Shared criteria list (legacy)', g[1][i][2]]; g[1].splice(i, 0, ['k-ocl', 'Observation Criteria Library', 'checksq']);
});
if (typeof RG_ANAV !== 'undefined') RG_ANAV.add('k-ocl');
if (typeof ROUTE_PURPOSE !== 'undefined') ROUTE_PURPOSE['k-ocl'] = 'Reusable observation criteria categories, versions and where they are used.';
const _libO1 = SCREENS['k-obslib'];
SCREENS['k-obslib'] = p => _libO1(p).replace('Observation Criteria Library</h1>', 'Observation Criteria Library — legacy shared list</h1>').replace('<div class="note b-amber n5-libnote">', `<div class="note b-blue ol1-legnote">${ic('info')}<div class="small">Course observation criteria are now chosen from the <button class="linklike" data-go="k-ocl">Observation Criteria Library</button>. This legacy list is unchanged.</div></div><div class="note b-amber n5-libnote">`);

/* ---------- Course builder: Workplace / Academy Observation Criteria ---------- */
function ol1CbGate(el, what) {
  const pid = el && el.dataset ? el.dataset.p : null, pr = pid ? s3Pr(pid) : null;
  if (!ol1CanEdit()) { w0Deny('NVQ Programmes', pr ? n5Ent(pr) : pid || '—', what, 'Only programme administrators change a course\'s observation criteria.'); return null; }
  const g = n5Gate(el, what); if (!g) return null;
  const { d } = g, loc = el.dataset.loc;
  const why = d.required !== true ? 'Observation isn\'t required for this version (Observation required: No or not chosen).' : loc === 'wp' && d.workplace !== 'Permitted' ? 'Workplace observation isn\'t enabled for this version.' : loc === 'off' && d.office !== 'Available' ? 'Academy-office observation isn\'t enabled for this version.' : '';
  if (why) { n5Log(g.pr, 'Blocked: ' + what, `Version ${d.v} (draft)`, '—', why); toast(why, 'err'); return null; }
  return g;
}
const ol1Lost = g => n5Lost(g);
const ol1LocTxt = loc => (loc === 'wp' ? 'Workplace' : 'Academy');
// Add from library: step 1 (choose a published category) → step 2 (all or chosen criteria, with a preview)
ACT.ol1Sel = el => {
  const g = ol1CbGate(el, 'select observation criteria'); if (!g) return; const { pr, d } = g, loc = el.dataset.loc, o = ol1Cfg(d), sels = loc === 'wp' ? o.wp : o.off.add, P = `data-p="${pr.id}" data-loc="${loc}"`;
  const k = el.dataset.k;
  if (!k) {
    const cats = OL1().cats.filter(c => !c.retired && ol1Cur(c));
    openModal({ title: `Add from library — ${ol1LocTxt(loc)} Observation Criteria`, size: 'lg', body: `<div class="field"><label for="ol1-sq">Search categories and criteria</label><input class="input" type="search" id="ol1-sq" data-oninput="ol1Find" placeholder="Code, name or criterion…"></div>
      ${cats.length ? `<fieldset class="field n5-fs"><legend class="lbl">Published categories</legend>${cats.map(c => { const v = ol1Cur(c), on = sels.some(s => s.cat === c.id); return `<label class="check ol1-pick" data-ol1s="${esc([c.code, v.name, v.desc].concat(v.crit.map(x => x.code + ' ' + x.title)).join(' '))}"><input type="radio" name="ol1-cat" value="${c.id}"><span><span class="code">${esc(c.code)}</span> ${esc(v.name)} <span class="xs muted">Version ${v.v} · ${plural(v.crit.filter(x => x.status === 'Active').length, 'criterion', 'criteria')}${on ? ' · already selected (edit it)' : ''}</span></span></label>`; }).join('')}</fieldset>` : '<p class="small muted">No published categories yet. Create one with "Create new category".</p>'}`,
      actions: [{ label: 'Cancel' }, { label: 'Next — choose criteria', cls: 'btn-primary', fn: () => { const r = $('#modal-root input[name="ol1-cat"]:checked'); if (!r) { fieldErr('#ol1-sq', 'Choose a category'); return false; } ACT.ol1Sel({ dataset: { p: pr.id, loc, k: r.value } }); } }] });
    return;
  }
  const c = ol1Cat(k), v = ol1Cur(c); if (!c || !v) { toast('Category not found.', 'err'); return; }
  if (c.retired) { n5Log(pr, 'Blocked: select observation criteria', c.code, '—', 'Retired category'); toast(`${c.code} is retired and can't be selected.`, 'err'); return; }
  const s = sels.find(x => x.cat === c.id), live = v.crit.filter(x => x.status === 'Active'), all = !s || s.all;
  openModal({ title: `${esc(c.code)} — ${ol1LocTxt(loc)} Observation Criteria`, sub: `${esc(v.name)} · Version ${v.v}`, size: 'lg', body: `
    <fieldset class="field n5-fs"><legend class="lbl">Criteria to use</legend><label class="check"><input type="radio" name="ol1-all" class="ol1-all" value="all" ${all ? 'checked' : ''}>All criteria in ${esc(c.code)} (later versions of the category are picked up while this course version is a draft)</label><label class="check"><input type="radio" name="ol1-all" class="ol1-all" value="some" ${all ? '' : 'checked'}>Only the criteria ticked below</label></fieldset>
    <fieldset class="field n5-fs ol1-pickc"><legend class="lbl">Criteria (preview with evidence fields)</legend>${live.map(x => `<label class="check"><input type="checkbox" class="ol1-crit" value="${x.id}" ${!s || s.all || (s.crit || []).includes(x.id) ? 'checked' : ''}><span><span class="code">${esc(x.code)}</span> <strong>${esc(x.title)}</strong><span class="xs muted"> — ${esc(x.instr)}</span><br>${ol1EvChips(x)}</span></label>`).join('')}</fieldset>`,
    actions: [{ label: 'Cancel' }, { label: s ? 'Save selection' : 'Add to course', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return ol1Lost(g);
      const mode = ($('#modal-root input[name="ol1-all"]:checked') || {}).value || 'all', crit = mode === 'all' ? [] : ol1Ticks($('#modal-root'), 'ol1-crit').filter(id => live.some(x => x.id === id));
      if (mode === 'some' && !crit.length) { fieldErr('#modal-root .ol1-crit', 'Tick at least one criterion'); return false; }
      const cw = ol1CfgW(d), list = loc === 'wp' ? cw.wp : cw.off.add, cur = list.find(x => x.cat === c.id), nx = { cat: c.id, all: mode === 'all', crit };
      const txt = x => (x.all ? 'all criteria' : x.crit.map(id => (live.find(y => y.id === id) || {}).code).join(', '));
      if (cur) { if (JSON.stringify([cur.all, cur.crit]) === JSON.stringify([nx.all, nx.crit])) { toast('Nothing has changed.', 'info'); return false; } const was = txt(cur); Object.assign(cur, nx); n5Log(pr, `${ol1LocTxt(loc)} observation criteria changed`, `${c.code}: ${was}`, `${c.code}: ${txt(nx)}`, `Version ${d.v} (draft)`); }
      else { list.push(nx); n5Log(pr, `${ol1LocTxt(loc)} observation criteria selected`, '—', `${c.code} Version ${v.v}: ${txt(nx)}`, `Version ${d.v} (draft)`); }
      render(); toast(`${c.code} saved in ${ol1LocTxt(loc)} Observation Criteria (Version ${d.v} draft).`);
    } }] });
};
ACT.ol1SelRm = el => {
  const g = ol1CbGate(el, 'remove observation criteria'); if (!g) return; const { pr, d } = g, cw = ol1CfgW(d), list = el.dataset.loc === 'wp' ? cw.wp : cw.off.add, i = list.findIndex(x => x.cat === el.dataset.k); if (i < 0) return;
  const c = ol1Cat(el.dataset.k); list.splice(i, 1); n5Log(pr, `${ol1LocTxt(el.dataset.loc)} observation criteria removed`, c ? c.code : el.dataset.k, '—', `Version ${d.v} (draft)`); render(); toast('Removed from this course version (draft). The library is unchanged.');
};
ACT.ol1OffMode = el => {
  const g = ol1CbGate({ dataset: { ...el.dataset, loc: 'off' } }, 'change the Academy observation criteria choice'); if (!g) return; const { pr, d } = g, m = el.dataset.m;
  if (!['same', 'own'].includes(m)) return; if (m === 'same' && d.workplace !== 'Permitted') { toast('Workplace observation isn\'t enabled, so there are no workplace criteria to use.', 'err'); return; }
  const cw = ol1CfgW(d), was = ol1Mode(d); if (was === m && cw.off.mode === m) { toast('Nothing has changed.', 'info'); return; }
  cw.off.mode = m; n5Log(pr, 'Academy observation criteria choice changed', was === 'same' ? 'Same as Workplace' : 'Different criteria', m === 'same' ? 'Same as Workplace' : 'Different criteria', `Version ${d.v} (draft)`); render();
};
ACT.ol1Excl = el => {
  const g = ol1CbGate({ dataset: { ...el.dataset, loc: 'off' } }, 'exclude an inherited observation criterion'); if (!g) return; const { pr, d } = g, id = el.dataset.c;
  if (ol1Mode(d) !== 'same') { toast('Nothing is inherited from Workplace.', 'err'); return; }
  if (!ol1Resolve(d, 'wp').items.some(i => i.id === id)) { toast('That criterion isn\'t a workplace criterion of this version.', 'err'); return; }
  const cw = ol1CfgW(d), ex = cw.off.excl, on = ex.includes(id), it = ol1Resolve(d, 'wp').items.find(i => i.id === id);
  if (el.dataset.a === 'incl') { if (!on) return; ex.splice(ex.indexOf(id), 1); } else { if (on) return; ex.push(id); }
  n5Log(pr, el.dataset.a === 'incl' ? 'Inherited observation criterion included again (Academy office)' : 'Inherited observation criterion excluded (Academy office)', it.code, el.dataset.a === 'incl' ? 'Included' : 'Excluded', `Version ${d.v} (draft)`); render();
};
// Create a new category inside the course builder: saved to the library, published as Version 1, selected for this location
const ol1Row = i => `<div class="card flat ol1-row" data-i="${i}"><span class="eyebrow">Criterion ${i + 1}</span><div class="field"><label for="ol1-rt-${i}">Title</label><input class="input ol1-rt" id="ol1-rt-${i}"></div><div class="field"><label for="ol1-ri-${i}">Description / instructions</label><textarea class="textarea ol1-ri" id="ol1-ri-${i}"></textarea></div>${ol1EvBoxes({ ev: [], req: [] }, 'r' + i)}</div>`;
ACT.ol1Row = () => { const box = $('#modal-root .ol1-rows'); if (!box) return; box.insertAdjacentHTML('beforeend', ol1Row(box.querySelectorAll('.ol1-row').length)); };
ACT.ol1CbNew = el => {
  const g = ol1CbGate(el, 'create an observation criteria category'); if (!g) return; const { pr, d } = g, loc = el.dataset.loc;
  openModal({ title: `Create new category — ${ol1LocTxt(loc)} Observation Criteria`, size: 'lg', body: `<p class="small muted">Saved to the shared Observation Criteria Library, published as Version 1 and selected for this course version (draft). Your other course settings are kept.</p>
    <div class="form-grid"><div class="field"><label for="ol1-code">Category code</label><input class="input mono" id="ol1-code" maxlength="8" placeholder="e.g. ABS"></div><div class="field"><label for="ol1-name">Category name</label><input class="input" id="ol1-name"></div></div>
    <div class="field"><label for="ol1-desc">Description</label><textarea class="textarea" id="ol1-desc"></textarea></div><div class="ol1-rows">${[0, 1].map(ol1Row).join('')}</div><button class="btn btn-sm" data-act="ol1Row">${ic('plus', 14)}Add another criterion</button>`,
    actions: [{ label: 'Cancel' }, { label: 'Save to library and select', cls: 'btn-primary', fn: () => {
      if (!n5Still(g)) return ol1Lost(g);
      const code = mval('#ol1-code').toUpperCase(), name = mval('#ol1-name'), e = ol1CodeErr(code); if (e) { fieldErr('#ol1-code', e); return false; } if (!name) { fieldErr('#ol1-name', 'Enter a name'); return false; }
      const rows = $$('#modal-root .ol1-row').map(r => ({ i: +r.dataset.i, title: r.querySelector('.ol1-rt').value.trim(), instr: r.querySelector('.ol1-ri').value.trim(), ev: ol1Ticks(r, 'ol1-ev'), req: ol1Ticks(r, 'ol1-rq') }));
      const used = rows.filter(x => x.title || x.instr || x.ev.length || x.req.length); if (!used.length) { fieldErr('#ol1-rt-0', 'Add at least one criterion'); return false; }
      for (let k = 0; k < used.length; k++) { const x = used[k], err = ol1CritErr({ ...x, id: 'n' + k }, used.slice(0, k).map((y, j) => ({ ...y, id: 'n' + j, status: 'Active' }))); if (err) { fieldErr('#ol1-rt-' + x.i, `Criterion ${x.i + 1} is incomplete: ${err}.`); return false; } }
      const c = ol1Create(code, name, mval('#ol1-desc')); used.forEach(x => c.work.crit.push(ol1NewCrit(c, x))); ol1Seq(c.work.crit);
      ol1Log(c, 'Criteria added', '—', c.work.crit.map(x => `${x.code} ${x.title}`).join(' · '), `Course builder — ${pr.title} Version ${d.v}`);
      const pe = ol1PublishCat(c, `Created in the course builder for ${pr.title} Version ${d.v}`); if (pe) { toast(pe, 'err'); return false; }
      const cw = ol1CfgW(d); (loc === 'wp' ? cw.wp : cw.off.add).push({ cat: c.id, all: true, crit: [] });
      n5Log(pr, `${ol1LocTxt(loc)} observation criteria selected`, '—', `${c.code} Version 1: all criteria (new category)`, `Version ${d.v} (draft)`); render(); toast(`${code} saved to the library and selected.`);
    } }] });
};

function ol1PrevTable(items, opts) {
  opts = opts || {};
  if (!items.length) return `<p class="small muted ol1-empty">${opts.empty || 'No library criteria selected.'}</p>`;
  return `<div class="tbl-wrap"><table class="tbl dense ol1-prev"><thead><tr><th>Code</th><th>Criterion</th><th>Evidence fields</th><th>Category</th>${opts.origin ? '<th>Source</th>' : ''}${opts.act ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${items.map(i => `<tr data-code="${esc(i.code)}" data-id="${i.id}" data-from="${i.from || ''}"><td class="nowrap"><span class="code">${esc(i.code)}</span></td><td><strong>${esc(i.title)}</strong><div class="xs muted">${esc(i.instr)}</div></td><td>${ol1EvChips(i)}</td><td class="xs">${esc(i.catCode)} v${i.catV} · criterion v${i.critV}</td>${opts.origin ? `<td>${i.excluded ? chip('Excluded', 'grey') : i.from === 'inherited' ? chip('Inherited from Workplace', 'blue') : chip('Academy only', 'green')}</td>` : ''}${opts.act ? `<td>${opts.act(i)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function ol1Panel(pr, loc) {
  if (!n5CanView()) return n5Section(pr);
  n5Sync(); const d = n5Shown(pr); if (!d) return `<section class="card"><p class="small muted">No observation configuration is recorded for Version ${pr.version}.</p></section>`;
  const ed = !!n5DraftV(pr) && n5CanEdit() && d.state === 'Draft', P = `data-p="${pr.id}" data-loc="${loc}"`, o = ol1Cfg(d), res = ol1Resolve(d, loc), pub = d.state !== 'Draft';
  const sels = loc === 'wp' ? o.wp : o.off.add, nvq = n5NvqOk(pr, d);
  const btns = ed ? `<div class="row"><button class="btn btn-sm btn-primary" data-act="ol1Sel" ${P}>${ic('plus', 14)}Add from library</button><button class="btn btn-sm" data-act="ol1CbNew" ${P}>${ic('plus', 14)}Create new category</button></div>` : '';
  const selT = pub ? '' : `<section class="card ol1-sels"><div class="row-b"><h2>${loc === 'wp' ? 'Selected categories' : 'Academy-only categories'}</h2>${btns}</div>${sels.length ? `<ul class="list small">${sels.map(s => { const c = ol1Cat(s.cat), v = ol1Cur(c); return `<li class="li" data-k="${s.cat}"><div class="li-b"><strong><span class="code">${esc(c ? c.code : s.cat)}</span> ${esc(v ? v.name : '—')}</strong><span class="xs muted">${v ? `Version ${v.v}` : 'not published'} · ${s.all ? 'all criteria' : plural((s.crit || []).length, 'chosen criterion', 'chosen criteria')}${c && c.retired ? ' · retired' : ''}</span></div>${ed ? `<button class="btn btn-sm" data-act="ol1Sel" ${P} data-k="${s.cat}">Edit</button><button class="btn btn-sm btn-ghost" data-act="ol1SelRm" ${P} data-k="${s.cat}">Remove</button>` : ''}</li>`; }).join('')}</ul>` : `<p class="small muted">${loc === 'wp' ? 'No categories selected yet.' : 'No Academy-only categories.'}</p>`}</section>`;
  let modeT = '';
  if (loc === 'off') {
    const m = ol1Mode(d), can = d.workplace === 'Permitted';
    modeT = `<section class="card ol1-mode"><h2>Which criteria apply at the Academy office?</h2>${pub ? `<p class="small">${o.off && d.ol1snap ? (d.ol1snap.mode === 'same' ? 'A — the same criteria as Workplace Observation (with any exclusions and Academy-only additions below).' : 'B — criteria selected for the Academy office only.') : '—'}</p>` : `<div class="row ol1-modes" role="group" aria-label="Academy observation criteria choice"><button class="btn ${m === 'same' ? 'btn-primary' : ''}" data-act="ol1OffMode" data-p="${pr.id}" data-m="same" aria-pressed="${m === 'same'}" ${can && ed ? '' : 'disabled'}>A. Use the same criteria as Workplace Observation</button><button class="btn ${m === 'own' ? 'btn-primary' : ''}" data-act="ol1OffMode" data-p="${pr.id}" data-m="own" aria-pressed="${m === 'own'}" ${ed ? '' : 'disabled'}>B. Add / select different criteria from the library</button></div>
      <p class="xs muted">${can ? 'A is the default while workplace observation is enabled. With A you can still exclude an inherited criterion and add Academy-only criteria.' : 'Workplace observation isn\'t enabled for this version, so Academy criteria are selected independently.'}</p>`}</section>`;
  }
  const shown = loc === 'off' ? res.items.concat((res.excluded || []).map(i => ({ ...i, excluded: true }))) : res.items;
  const act = loc === 'off' && ed ? i => (i.from === 'inherited' && !i.excluded ? `<button class="btn btn-sm btn-ghost" data-act="ol1Excl" data-p="${pr.id}" data-c="${i.id}" data-a="excl">Exclude</button>` : i.excluded ? `<button class="btn btn-sm btn-ghost" data-act="ol1Excl" data-p="${pr.id}" data-c="${i.id}" data-a="incl">Include again</button>` : '') : null;
  const probs = !pub && (res.probs || []).length ? `<ul class="list small">${res.probs.map(p => `<li class="li">${chip(p.block ? 'Blocking' : 'Warning', p.block ? 'red' : 'amber')} ${esc(p.t)}</li>`).join('')}</ul>` : '';
  const prev = `<section class="card ol1-preview"><h2>${pub ? `Published criteria — Version ${d.v}` : 'Preview — every criterion selected'}</h2><p class="small muted">${pub ? (res.none ? `No library criteria were recorded for Version ${d.v} (published before the Observation Criteria Library).` : 'Frozen when this version was published: learners on it keep exactly these criteria and evidence fields, whatever later happens in the library.') : `Follows each category's current published version while Version ${d.v} is a draft; frozen when it is published.`}</p>${probs}${ol1PrevTable(shown, { origin: loc === 'off', act, empty: pub && res.none ? '—' : undefined })}</section>`;
  const nvqT = `<p class="xs muted ol1-nvqnote">${ic('info', 12)} ${loc === 'wp' ? `Also observed at the workplace (unchanged): the qualification's ${plural(nvq.length, 'NVQ observation criterion', 'NVQ observation criteria')} from the curriculum and this programme's Academy standards (IA criteria)` : `Also observed at the Academy office (unchanged): the qualification's ${plural(nvq.length, 'NVQ observation criterion', 'NVQ observation criteria')} from the curriculum`} — see Observation configuration. Nothing here records or decides an outcome.</p>`;
  const head = `<section class="card ol1-cbhead"><div class="row-b"><h2>${loc === 'wp' ? 'Workplace' : 'Academy'} Observation Criteria — Version ${d.v}${pub ? '' : ' (draft)'}</h2>${chip(pub ? 'Published' : 'Draft', pub ? 'green' : 'amber')}</div><p class="small">${loc === 'wp' ? 'Criteria from the Observation Criteria Library that the assessor observes when a learner\'s observation takes place at the workplace.' : 'Criteria from the Observation Criteria Library that the assessor observes when a learner\'s observation takes place at the Academy office.'} <button class="linklike" data-go="k-ocl">Open the library</button></p></section>`;
  return head + modeT + selT + prev + nvqT;
}
const _panelsO1 = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsO1.apply(this, arguments); if (sec !== 'observations') return r;
  const d = typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null, H = f => () => { const dv = document.createElement('div'); dv.innerHTML = f(); return cbHtml(dv, pr); }, add = [];
  if (d && d.required === true && d.workplace === 'Permitted') add.push(['wpcrit', 'Workplace Observation Criteria', H(() => ol1Panel(pr, 'wp'))]);
  if (d && d.required === true && d.office === 'Available') add.push(['offcrit', 'Academy Observation Criteria', H(() => ol1Panel(pr, 'off'))]);
  return [r[0]].concat(add, r.slice(1));
};
CB_ROUTE.wpcrit = ['observations', 'wpcrit']; CB_ROUTE.offcrit = ['observations', 'offcrit'];
// The configuration panel's own cards are named for what they are now that the location tabs exist
const _secO1 = n5Section;
n5Section = function () { return _secO1.apply(this, arguments).replace('<h2>NVQ observation criteria</h2>', '<h2>NVQ observation criteria (from the curriculum — both locations)</h2>').replace('<h2>Academy observation criteria</h2>', '<h2>Academy standards (this programme\'s IA criteria — workplace)</h2>'); };

/* ---------- Learners: the location's criteria from the pinned version ---------- */
const ol1Loc = l => (l === 'office' ? 'off' : 'wp');
const ol1SnapOf = (pid, v) => { const c = typeof n5ConfigFor === 'function' ? n5ConfigFor(pid, v) : null; return c && c.ol1snap ? c.ol1snap : null; };
// The criteria of an observation record: its programme version's snapshot for its location (D1 records only)
function ol1RecItems(o) { const s = o && o.src && o.src.dEv ? ol1SnapOf(o.src.dPid, o.src.dV) : null; return s ? s[ol1Loc(o.src.dLoc)] || [] : []; }
const ol1Done = (w, ctx, e) => dRecs(w, ctx, e).find(o => o.status === 'Completed' && o.report && o.report.ol1) || null;
function ol1EvRows(w, ctx, viewer) {
  const s0 = ctx.cfg.ol1snap; if (!s0) return '';
  return ctx.evs.map(e => {
    const s = dSel(w, e.id); if (!s) return `<li class="li" data-e="${e.id}"><div class="li-b"><strong>${esc(e.name)}</strong><span class="small muted">Location not chosen yet — the criteria for the chosen location appear here.</span></div></li>`;
    const items = s0[ol1Loc(s.loc)] || [], done = ol1Done(w, ctx, e), out = id => { const r = done && done.report.ol1.find(x => x.id === id); return r ? r : null; };
    return `<li class="li ol1-ev" data-e="${e.id}" data-loc="${s.loc}"><div class="li-b"><strong>${esc(e.name)} — ${esc(dTxtLoc(s.loc))}</strong>${items.length ? `<ul class="list small ol1-items">${items.map(i => { const r = out(i.id), n = r ? Object.values(r.evidence || {}).reduce((a, x) => a + x.length, 0) : 0; return `<li class="li" data-code="${esc(i.code)}"><div class="li-b"><span><span class="code">${esc(i.code)}</span> <strong>${esc(i.title)}</strong></span><span class="xs muted">${esc(i.instr)}</span><span class="xs">Evidence: ${esc(ol1EvTxt(i))}${viewer === 'coord' && r ? ` · ${plural(n, 'evidence item')} recorded` : ''}</span></div>${r ? chip(r.out, r.out === 'Met' ? 'green' : 'amber') : chip('Not yet assessed', 'grey')}</li>`; }).join('')}</ul>` : `<span class="small muted">No library criteria for the ${esc(dTxtLoc(s.loc).toLowerCase())} in this version.</span>`}</div></li>`;
  }).join('');
}
function ol1CoordCard(lid) {
  const w = dW(lid), ctx = dCtx(w); if (!ctx || !ctx.cfg.ol1snap) return '';
  return `<section class="card ol1-coord"><h2>Observation criteria for each chosen location</h2><p class="small muted">From ${esc(ctx.pr.title)} Version ${ctx.v} (the learner's pinned version). Only the chosen location's criteria are shown; outcomes appear when the observation assessor signs off.</p><ul class="list">${ol1EvRows(w, ctx, 'coord')}</ul></section>`;
}
const _cLearnerO1 = SCREENS['c-learner'];
SCREENS['c-learner'] = p => { const h = _cLearnerO1(p); return p && p.tab === 'observations' && p.id ? h + ol1CoordCard(p.id) : h; };
function ol1LearnerCard() {
  const w = W, ctx = dCtx(w); if (!ctx || !ctx.cfg.ol1snap) return '';
  return `<section class="card ol1-learner"><h2>What will be observed</h2><p class="small muted">The criteria for where each observation takes place, set by your programme version. Outcomes appear after your observation assessor signs the observation off.</p><ul class="list">${ol1EvRows(w, ctx, 'learner')}</ul></section>`;
}
const _dLcO1 = dLearnerCard;
dLearnerCard = function () { const h = _dLcO1.apply(this, arguments); return h ? h + ol1LearnerCard() : h; };
// The assessor's proposal dialog names the location's library criteria (preparation)
const _pickO1 = INP.dEvPick;
INP.dEvPick = el => {
  const r = _pickO1(el); const lid = mval('#op-l'), w = dW(lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === el.value), s = e && dSel(w, e.id), kv = document.querySelector('#modal-root .d-evkv');
  if (s && kv && ctx.cfg.ol1snap) { const its = ctx.cfg.ol1snap[ol1Loc(s.loc)] || []; kv.insertAdjacentHTML('beforeend', `<dt>Library criteria</dt><dd class="mono ol1-propc">${esc(its.map(i => i.code).join(', ') || '—')}</dd>`); }
  return r;
};
// Changing the location: never while submitted evidence or a sign-off depends on it (the D1 checks cover bookings and open requests)
const _locO1 = ACT.dObsLoc;
ACT.dObsLoc = el => {
  const lid = el && el.dataset && el.dataset.l, w = dW(lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === el.dataset.e);
  if (w && ctx && e && chIsMyBatchLid(lid)) {
    const recs = dRecs(w, ctx, e), dep = [];
    recs.forEach(o => { const dr = STORE.tas && STORE.tas.obsDraft ? STORE.tas.obsDraft[(w.v || chWorldKey(lid)) + '-' + o.id] : null, n = dr && dr.ol1 ? Object.values(dr.ol1).reduce((a, x) => a + Object.values(x.ev || {}).reduce((b, y) => b + y.length, 0) + (x.out ? 1 : 0), 0) : 0;
      if (o.status === 'Completed') dep.push(`a signed-off observation (${fd(o.signed || o.at)})`); else if (n) dep.push(`${plural(n, 'evidence item or outcome', 'evidence items or outcomes')} recorded on the ${String(o.status).toLowerCase()} observation of ${fd(o.at)}`); });
    if (dep.length && !recs.some(o => ['Proposed', 'Confirmed'].includes(o.status))) {
      const why = `${e.name}: the location can't change — it would separate ${dep.join('; ')} from the criteria they were recorded against. Nothing was discarded.`;
      chAudit('Observations', `${chFullName(w)} (${lid})`, 'Blocked: choose observation location', '—', '—', why); toast(why, 'err'); return false;
    }
  }
  return _locO1(el);
};

/* ---------- The assessor's record: evidence per criterion, outcome chosen separately ---------- */
// The record draft (created as the record screen creates it, when evidence is entered before the screen was opened)
const ol1Dr = id => { const dr = STORE.tas.obsDraft[id] = STORE.tas.obsDraft[id] || { started: now().toISOString(), nvq: {}, ia: {}, ctx: '', notes: '', evt: [] }; dr.ol1 = dr.ol1 || {}; return dr; };
const ol1En = (dr, cid) => (dr.ol1[cid] = dr.ol1[cid] || { out: null, ev: {} });
function ol1RecWhy(id, cid, t) {
  const w = g2ObsWhy(id, 'sign'); if (w) return w;
  const o = g2Obs(id), it = ol1RecItems(o).find(x => x.id === cid); if (!it) return 'That criterion isn\'t part of this observation (the learner\'s programme version and location).';
  if (t && !it.ev.includes(t)) return `${OL1_EVL(t)} isn't an evidence field of ${it.code}.`;
  return '';
}
const ol1RecDeny = (id, what, why) => { const o = g2Obs(id); w0Deny('Observations', o ? o.learner : String(id || '—'), what, why); return false; };
function ol1CritRec(o, it, en, ed) {
  const A = `data-id="${esc(o.id)}" data-c="${it.id}"`;
  const fields = it.ev.map(t => { const list = (en.ev[t] || []), req = it.req.includes(t);
    const items = list.map((x, k) => `<li class="li"><div class="li-b"><span class="small">${OL1_TEXT.includes(t) ? esc(x.t) : ic('clip', 14) + ' ' + esc(x.name)}</span><span class="xs muted">${esc(x.by)} · ${fdt(x.at)}</span></div>${ed ? `<button class="btn btn-sm btn-ghost" data-act="ol1EvRm" ${A} data-t="${t}" data-k="${k}" aria-label="Remove ${esc(OL1_EVL(t))} ${k + 1}">Remove</button>` : ''}</li>`).join('');
    const fid = `ol1-in-${it.id}-${t}`;
    const inp = !ed ? '' : t === 'notes' ? `<label class="sr" for="${fid}">Assessor note for ${esc(it.code)}</label><textarea class="textarea" id="${fid}" rows="2" placeholder="Assessor note"></textarea><button class="btn btn-sm" data-act="ol1EvAdd" ${A} data-t="notes">Add note</button>`
      : t === 'refs' ? `<label class="sr" for="${fid}">Authorised reference for ${esc(it.code)}</label><input class="input" id="${fid}" placeholder="Reference in approved storage (ID or link)"><button class="btn btn-sm" data-act="ol1EvAdd" ${A} data-t="refs">Add reference</button>`
      : `<label class="sr" for="${fid}">Upload ${esc(OL1_EVL(t))} for ${esc(it.code)}</label><input class="input" type="file" id="${fid}" multiple ${t === 'photos' ? 'accept="image/*"' : t === 'videos' ? 'accept="video/*"' : ''} data-onchange="ol1File" ${A} data-t="${t}">`;
    return `<div class="ol1-evf" data-t="${t}"><div class="row-b"><strong class="small">${esc(OL1_EVL(t))}</strong>${req ? chip('Required', 'amber') : '<span class="xs muted">Optional</span>'}</div>${list.length ? `<ul class="list small">${items}</ul>` : '<p class="xs muted">None supplied</p>'}${inp}</div>`; }).join('');
  const tg = v => `<button class="tgl ${en.out === v ? 'on' + (v === 'Met' ? '' : ' off') : ''}" data-act="ol1Out" ${A} data-v="${v}" aria-pressed="${en.out === v}" ${ed ? '' : 'disabled'}>${v}</button>`;
  return `<div class="obs-card ol1-critrec" data-c="${it.id}" data-code="${esc(it.code)}"><div class="row-b"><span class="code">${esc(it.code)}</span><span class="xs muted">${esc(it.catCode)} v${it.catV} · criterion v${it.critV}${it.from === 'inherited' ? ' · inherited from Workplace' : it.from === 'office' ? ' · Academy only' : ''}</span></div><p class="small"><strong>${esc(it.title)}</strong></p><p class="xs muted">${esc(it.instr)}</p>${fields}
    <div class="tgl-row" role="group" aria-label="Outcome for ${esc(it.code)}">${tg('Met')}${tg('Not yet met')}</div>${en.out ? `<p class="xs muted">Outcome chosen by ${esc(en.outBy)}, ${fdt(en.outAt)}</p>` : '<p class="xs muted">No outcome yet — evidence alone never decides it.</p>'}</div>`;
}
function ol1RecSection(o) {
  const items = ol1RecItems(o); if (!items.length) return '';
  const dr = STORE.tas.obsDraft[o.id]; if (!dr) return ''; dr.ol1 = dr.ol1 || {};
  return `<section class="ol1-rec"><h2>Observation criteria — ${esc(dTxtLoc(o.src.dLoc))}</h2><p class="xs muted">From the learner's programme version (frozen when it was published). Record the evidence each criterion permits; required evidence is needed before a criterion can be signed off as Met. Choose each outcome yourself — evidence never sets it.</p>${items.map(it => ol1CritRec(o, it, dr.ol1[it.id] || { out: null, ev: {} }, true)).join('')}</section>`;
}
const _recO1 = dRecScreen;
dRecScreen = function (o) {
  const h = _recO1.apply(this, arguments); if (!h) return h; const sec = ol1RecSection(o); if (!sec) return h;
  const k = h.indexOf('<fieldset class="field n5-fs"><legend class="lbl">Evidence recorded'); return k < 0 ? h.replace('<div class="sticky-actions">', sec + '<div class="sticky-actions">') : h.slice(0, k) + sec + h.slice(k);
};
ACT.ol1Out = el => {
  const ds = el.dataset, why = ol1RecWhy(ds.id, ds.c); if (why) return ol1RecDeny(ds.id, 'Record observation outcome', why);
  if (!['Met', 'Not yet met', ''].includes(ds.v)) return; const dr = ol1Dr(ds.id); if (!dr) return; const en = ol1En(dr, ds.c);
  en.out = ds.v || null; en.outBy = TME().name; en.outAt = now().toISOString(); render();
};
ACT.ol1EvAdd = el => {
  const ds = el.dataset, why = ol1RecWhy(ds.id, ds.c, ds.t); if (why) return ol1RecDeny(ds.id, 'Record observation evidence', why);
  if (!OL1_TEXT.includes(ds.t)) return; const f = document.getElementById(`ol1-in-${ds.c}-${ds.t}`), t = String(ds.text != null ? ds.text : f ? f.value : '').trim();
  if (!t) { toast(ds.t === 'notes' ? 'Write the note first.' : 'Enter the reference first.', 'err'); return; }
  const dr = ol1Dr(ds.id); if (!dr) return; const en = ol1En(dr, ds.c); (en.ev[ds.t] = en.ev[ds.t] || []).push({ t, by: TME().name, at: now().toISOString() }); render();
};
INP.ol1File = el => {
  const ds = el.dataset, why = ol1RecWhy(ds.id, ds.c, ds.t); if (why) return ol1RecDeny(ds.id, 'Record observation evidence', why);
  if (!OL1_FILE.includes(ds.t)) return; const dr = ol1Dr(ds.id); if (!dr) return; const en = ol1En(dr, ds.c), at = now().toISOString();
  (en.ev[ds.t] = en.ev[ds.t] || []).push(...[...(el.files || [])].map(f => ({ name: f.name, size: f.size || 0, by: TME().name, at }))); render();
};
ACT.ol1EvRm = el => {
  const ds = el.dataset, why = ol1RecWhy(ds.id, ds.c, ds.t); if (why) return ol1RecDeny(ds.id, 'Remove observation evidence', why);
  const dr = ol1Dr(ds.id); if (!dr) return; const list = (ol1En(dr, ds.c).ev[ds.t] || []), x = list[+ds.k]; if (!x) return;
  if (x.by !== TME().name) return ol1RecDeny(ds.id, 'Remove observation evidence', 'Only the person who recorded this evidence can remove it before sign-off.');
  list.splice(+ds.k, 1); render();
};
// Sign-off: every criterion has an outcome; a Met criterion has its required evidence. The result is frozen in the report.
function ol1Missing(o) {
  const items = ol1RecItems(o), dr = STORE.tas.obsDraft[o.id] || {}, d = dr.ol1 || {}, miss = [];
  items.forEach(i => { const en = d[i.id]; if (!en || !en.out) { miss.push(`${i.code}: choose Met or Not yet met`); return; }
    if (en.out === 'Met') { const lack = i.req.filter(t => !((en.ev || {})[t] || []).length); if (lack.length) miss.push(`${i.code}: required evidence missing (${lack.map(OL1_EVL).join(', ')})`); } });
  return miss;
}
const _signO1 = ACT.orSign;
ACT.orSign = el => {
  const id = (el && el.dataset && el.dataset.id) || (S.params || {}).id, o = g2Obs(id), items = ol1RecItems(o);
  if (!o || !items.length || g2ObsWhy(id, 'sign')) return _signO1(el); // the existing flow and its refusals
  const miss = ol1Missing(o);
  if (miss.length) { tasLog('Observations', o.learner, 'Blocked: sign off observation', '—', '—', miss.join('; ')); toast('Before signing off: ' + miss.join('; ') + '.', 'err'); return; }
  const m0 = MODAL, r = _signO1(el); if (!MODAL || MODAL === m0) return r;
  const a = MODAL.actions.find(x => x.label === 'Sign off and lock'); if (!a || a._o1) return r; const f = a.fn; a._o1 = true;
  a.fn = (...x) => {
    const m2 = ol1Missing(o); if (m2.length) { toast('Before signing off: ' + m2.join('; ') + '.', 'err'); return false; }
    const keep = n5Clone((STORE.tas.obsDraft[o.id] || {}).ol1 || {}), res = f(...x), rec = o.src;
    if (res !== false && rec && rec.status === 'Completed' && rec.report && !rec.report.ol1) {
      rec.report.ol1 = n5Freeze(items.map(i => { const en = keep[i.id] || {}; return { id: i.id, code: i.code, title: i.title, instr: i.instr, cat: i.cat, catCode: i.catCode, catV: i.catV, critV: i.critV, from: i.from, ev: i.ev.slice(), req: i.req.slice(), out: en.out, outBy: en.outBy, outAt: en.outAt, evidence: n5Clone(en.ev || {}) }; }));
      tasLog('Observations', o.learner, 'Observation criteria recorded', '—', rec.report.ol1.map(i => `${i.code} ${i.out}`).join(' · '), `${dTxtLoc(rec.dLoc)} · Version ${rec.dV}`); render();
    }
    return res;
  };
  return r;
};
// The signed report shows the criteria as signed off (read-only)
function ol1ReportHtml(r) {
  if (!r || !r.ol1) return '';
  return `<section class="card ol1-report"><h2>Observation criteria (as signed off)</h2>${r.ol1.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Criterion</th><th>Outcome</th><th>Evidence</th></tr></thead><tbody>${r.ol1.map(i => `<tr data-code="${esc(i.code)}"><td><span class="code">${esc(i.code)}</span> ${esc(i.title)}<div class="xs muted">${esc(i.catCode)} v${i.catV} · criterion v${i.critV}</div></td><td>${chip(i.out, i.out === 'Met' ? 'green' : 'amber')}<div class="xs muted">${esc(i.outBy || '')}${i.outAt ? ', ' + fdt(i.outAt) : ''}</div></td><td class="small">${i.ev.map(t => `${esc(OL1_EVL(t))}: ${((i.evidence || {})[t] || []).map(x => esc(x.t || x.name)).join('; ') || '—'}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">None.</p>'}<p class="xs muted">${ic('lock', 12)} Locked at sign-off. Corrections go through a Data Correction.</p></section>`;
}
const _scrO1 = SCREENS['t-obsrec'];
SCREENS['t-obsrec'] = p => { const h = _scrO1(p), o = p && p.id ? obById(p.id) : null; return o && o.status === 'Completed' && o.src && o.src.report && o.src.report.ol1 ? h + ol1ReportHtml(o.src.report) : h; };

/* ---------- Client demo (called by cdBuild, step 3): one small category, Workplace + Academy-office selections ---------- */
function ol1DemoBuild(pr, h) {
  const id = pr.id; go('k-ocl'); ACT.ol1CatNew(); h.put({ '#ol1-code': 'ABS', '#ol1-name': 'Attitudes, behaviours and standards (client demo)', '#ol1-desc': 'How the learner treats people and follows standards during practice.' }); h.ok1();
  const c = OL1().cats.find(x => x.code === 'ABS'); if (!c) throw new Error('Observation Criteria Library: ABS not created');
  [['Treats the individual with dignity and respect', 'Observe how the learner greets, addresses and involves the individual. Note any privacy measures.', ['notes', 'photos', 'docs'], ['notes']],
    ['Communicates clearly and checks understanding', 'Observe verbal and non-verbal communication, including how the learner checks the individual has understood.', ['notes', 'videos'], ['notes']],
    ['Follows the care plan and records accurately', 'Check the record the learner completes against the care plan. Use an authorised reference for records held in the workplace system.', ['docs', 'refs'], ['docs']],
    ['Follows the Academy-office practice briefing', 'Academy office only: the learner follows the simulation safety briefing before the practical task.', ['notes'], ['notes']]].forEach(([t, i, ev, req]) => {
    go('k-ocl', { id: c.id }); ACT.ol1CritEdit({ dataset: { k: c.id, c: '' } }); h.put({ '#ol1-ct': t, '#ol1-ci': i }); h.tick('.ol1-ev', ev); h.tick('.ol1-rq', req); h.ok1(); });
  ACT.ol1CatPub({ dataset: { k: c.id } }); h.ok1('Client demo — first version');
  const v = ol1Cur(c), wp = v.crit.slice(0, 3).map(x => x.id), off = [v.crit[3].id];
  go('a-programmes', { id, tab: 'wpcrit' }); ACT.ol1Sel({ dataset: { p: id, loc: 'wp', k: c.id } }); h.tick('.ol1-all', ['some']); h.tick('.ol1-crit', wp); h.ok1();
  go('a-programmes', { id, tab: 'offcrit' }); ACT.ol1OffMode({ dataset: { p: id, m: 'same' } });
  ACT.ol1Sel({ dataset: { p: id, loc: 'off', k: c.id } }); h.tick('.ol1-all', ['some']); h.tick('.ol1-crit', off); h.ok1();
}

/* ---------- Records ---------- */
UXC.push(['OBS-1', 'Observation Criteria Library (2 Nov 2026)', [
  'A shared Observation Criteria Library (Academic → Observation Criteria Library): categories with a unique code (e.g. ABS) and criteria ABS-01, ABS-02 … each with a title, instructions, order and one or more evidence fields (assessor notes, photos, videos, documents, authorised references), some of them optionally required. Drafts are published as versions; criteria and categories are retired, never deleted. Programme administrators manage it; the old shared list stays as "Shared criteria list (legacy)".',
  'Course builder, Observations: "Workplace Observation Criteria" (observation required + workplace permitted) and "Academy Observation Criteria" (observation required + Academy office available) select library categories — all or chosen criteria — or create a new category in place. The Academy tab uses the same criteria as Workplace (default when workplace is enabled; inherited criteria can be excluded) or its own, plus Academy-only criteria. Hidden tabs keep their draft selections; publishing freezes the criteria of the enabled locations into the version.',
  'Learners: the Coordinator\'s location choice (per observation) decides which criteria apply; the Coordinator, the learner and the observation assessor see only that location\'s criteria. The assessor records evidence per criterion and chooses Met / Not yet met separately; sign-off needs every outcome and the required evidence of each Met criterion, then freezes them in the report. No automatic migration of existing criteria; records signed before are unchanged.']]);
const _aIdxO1 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxO1(p) + `<section class="card idx-sec"><h2>OBS-1 — Observation Criteria Library</h2><ul class="idx-list">${[
  chIdxLi('Observation Criteria Library', { go: 'k-ocl' }, 'OBS-1 — categories, criteria, evidence fields, versions and where they are used.')].join('')}</ul></section>`;
