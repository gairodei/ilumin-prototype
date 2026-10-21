/* ============================================================
   CB5 — Section 3 Assessments of the unified course builder (21 Oct 2026; PD-CB-34…39 in PROVISIONAL-DECISIONS.md).
   Assignments are authored in the builder on the existing S2 definitions (STORE.s2Defs) — no new store. Each definition now
   carries its programme ID (pid, resolved from its title when unambiguous — the title is kept) and, for assignments created from
   now on, the programme version whose criteria it maps (pv; older ones say "not recorded" — nothing is invented). Criteria come
   from that programme version's own tree (cbTree), never from another programme's. Questions get evidence guidance and their
   own attachment limits; new assignments get a References section after the questions and no template by default (an optional
   template can be offered); seeded assignments are unchanged. Every assignment action checks the role in the action and logs
   refusals. Seeded answer keys stay programme-wide guidance (not versioned — client decision); every key record now notes the
   programme version it was made on and can't be changed afterwards. Submissions and resubmissions are untouched. Loads last.
   ============================================================ */
'use strict';

/* ---------- Programme and version of a definition ---------- */
const cbAsgCan = () => S.portal === 'admin' && !!S.signedIn && s2Can();
// pid: the definition's own, else resolved from its title when exactly one programme has it (recorded how)
function cbAsgPid(d) {
  if (!d) return null; if (d.pid !== undefined) return d.pid;
  const m = ((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.programmes) || []).filter(p => p.title === d.programme);
  d.pid = m.length === 1 ? m[0].id : null; d.pidFrom = m.length === 1 ? 'title' : 'unresolved'; return d.pid;
}
const _s2DefsCB5 = s2Defs;
s2Defs = function () { const L = _s2DefsCB5.apply(this, arguments); L.forEach(cbAsgPid); return L; };
// The criteria of a programme version, shaped as S2 reads them (units → modules → criteria with their type); nothing retired
function cbAsgTreeOf(pr, v) {
  const t = pr ? cbTree(pr, v != null ? v : undefined) : null; // no version: what the curriculum shows (the draft while one exists)
  return (t || []).filter(u => u.status !== 'Retired').map(u => ({ code: u.code, title: u.title, mods: u.mods.filter(m => m.status !== 'Retired').map(m => ({ code: m.code, title: m.title,
    crit: m.los.filter(l => l.status !== 'Retired').flatMap(lo => lo.crit.filter(c => c.status !== 'Retired').map(c => ({ code: c.code, d: c.d, type: critKind(lo.type || 'Knowledge'), typeName: lo.type || 'Knowledge', ev: c.evReq || c.ev || '' }))) })) }));
}
// S2 read criteria by title, and for any programme other than Level 2 used Level 3's learner tree (so Level 4 and 5 assignments
// were mapped against Level 3). They now come from the definition's own programme and version.
s2Tree = function (prog) { const m = ((ADMIN && ADMIN.programmes) || []).filter(p => p.title === prog); return m.length === 1 ? cbAsgTreeOf(m[0]) : []; };
s2Crit = function (d) {
  const pr = cbPr(cbAsgPid(d)), t = cbAsgTreeOf(pr, d.pv || (pr && !pr.chNew ? pr.version : undefined)), uc = s2UnitCode(d.unit), u = t.find(x => x.code === uc);
  if (!u) return Array.from(new Set(d.qs.flatMap(q => q.crit))).map(code => ({ code, d: code, type: 'Knowledge' })); // unit not in the tree: the criteria already mapped
  return u.mods.flatMap(m => m.crit || []);
};
const cbAsgVerTxt = d => (d.pv ? `Version ${d.pv}` : 'Version not recorded');

/* ---------- Role checks on every assignment action ---------- */
// The S2 actions (other than "New assignment") had no role check of their own: any signed-in role could save, publish or
// change mappings by calling them. They now refuse other roles (Super Admin, Academic Admin, System Admin, admin portal), logged.
const CB_ASG_ACT = { s2Save: 'save an assignment', s2QAdd: 'change assignment questions', s2QEdit: 'change assignment questions', s2QMove: 'change assignment questions', s2QRetire: 'change assignment questions',
  pubAsg: 'publish an assignment', s2Unpublish: 'unpublish an assignment', s2Retire: 'retire an assignment', kEditBrief: 'edit an assignment brief', newAsg: 'create an assignment' };
const cbAsgRefuse = (what, el) => { const d = el && el.dataset && s2Def(el.dataset.id); logA('Assignments', d ? d.title : '—', 'Blocked: ' + what, '—', '—', 'Role can\'t ' + what); toast('You can\'t ' + what + '.', 'err'); return false; };
Object.entries(CB_ASG_ACT).forEach(([n, what]) => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function (el) { if (!cbAsgCan()) return cbAsgRefuse(what, el); return f.apply(this, arguments); }; });
const _mapCB5 = INP.mapChange;
INP.mapChange = el => { if (!cbAsgCan()) { el.checked = !el.checked; cbAsgRefuse('change a criteria mapping', el); render(); return; } return _mapCB5(el); };
const _extCB5 = SUBMIT.asgExtend;
SUBMIT.asgExtend = f => (cbAsgCan() ? _extCB5(f) : cbAsgRefuse('extend a deadline', f));

/* ---------- New assignments: programme ID and version, References on, no template by default ---------- */
const cbAsgStamp = (d, pr) => { d.pid = pr ? pr.id : cbAsgPid(d); d.pidFrom = 'created'; d.pv = pr ? pr.version : null; d.template = false; d.refs = true; };
const _newAsgCB5 = ACT.newAsg;
ACT.newAsg = function () { const r = _newAsgCB5.apply(this, arguments), a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a) { const g = a.fn; a.fn = (...x) => { const n = s2Defs().length, res = g(...x); const d = s2Defs()[n]; if (d) { const pr = s3Progs().find(p => p.title === d.programme); cbAsgStamp(d, pr); } return res; }; } return r; };
function cbAsgCreate(pr, v) {
  let n = 10, id; while (s2Defs().some(x => x.id === (id = 'a' + n))) n++;
  const d = { id, title: v.title, programme: pr.title, unit: v.unit, due: v.due, status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: s2Html(v.brief || 'Answer each question using examples from your workplace.'), briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [], batches: [], copies: [] };
  cbAsgStamp(d, pr); s2Defs().push(d);
  s2Log(d, 'Assignment created (Draft)', '—', `${pr.title} (${pr.id}) · Version ${d.pv} · ${v.unit} · due ${fdt(d.due)}`, 'Course builder — Assessments'); return d;
}
ACT.cbAsgNew = el => {
  const pr = cbPr(el && el.dataset && el.dataset.p); if (!cbAsgCan()) return cbAsgRefuse('create an assignment');
  if (!pr) { toast('Programme not found.', 'err'); return; }
  if (cbRetired(pr)) { logA('Assignments', cbEnt(pr), 'Blocked: create an assignment (programme retired)', '—', '—', ADMIN.me.name); toast('This programme is retired, so no assignments can be added.', 'err'); return; }
  const t = cbAsgTreeOf(pr, pr.status === 'Draft' ? undefined : pr.version), opts = t.flatMap(u => u.mods.map((m, k) => [`${u.code} · Module ${k + 1}`, `${u.code} · Module ${k + 1} — ${u.title}: ${m.title}`]));
  if (!opts.length) { toast('Add units and modules in Section 2 — Curriculum first.', 'err'); return; }
  openModal({ title: 'New assignment — ' + esc(pr.title), size: 'lg', body: `<div class="cb-ctx"><span class="lbl">Linked to</span><span class="small"><strong>${esc(pr.title)}</strong> · Version ${pr.version}${pr.status === 'Draft' ? ' (draft programme)' : ' (published)'}</span><span class="xs muted">Its questions are mapped to this version's criteria.</span></div>
    <div class="form-grid"><div class="field full"><label for="cna-u">Unit / module</label><select class="select" id="cna-u">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></div><div class="field full"><label for="cna-t">Title</label><input class="input" id="cna-t"></div>
    <div class="field"><label for="cna-d">Deadline</label><input class="input" type="datetime-local" id="cna-d"></div><div class="field full"><label for="cna-b">Brief</label><textarea class="textarea" id="cna-b" rows="3">Answer each question using examples from your workplace.</textarea></div></div>
    <p class="xs muted">Learners answer in the boxes on the assignment page; no template download is needed. A References section follows the questions. Both can be changed while it is a Draft.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Create draft', cls: 'btn-primary', fn: () => {
      if (!cbAsgCan()) { closeModal(); return cbAsgRefuse('create an assignment'); }
      const v = { title: mval('#cna-t'), unit: mval('#cna-u'), due: mval('#cna-d'), brief: mval('#cna-b') };
      if (!v.title) return fieldErr('#cna-t', 'Enter a title'), false; if (s2Defs().some(x => x.title.toLowerCase() === v.title.toLowerCase())) return fieldErr('#cna-t', 'An assignment with this title already exists'), false;
      if (!v.due) return fieldErr('#cna-d', 'Choose a deadline'), false; v.due = new Date(v.due + ':00Z').toISOString();
      const d = cbAsgCreate(pr, v); setUi('cbAsg.' + pr.id, d.id); setUi('cbAsgT.' + pr.id, 'questions'); closeModal(); render(); toast('Draft created — add the questions next.');
    } }] });
};

/* ---------- Publishing: the mapping must belong to the linked version; stay in the builder ---------- */
const cbAsgStale = d => { const ok = new Set(s2Crit(d).filter(c => c.type === 'Knowledge').map(c => c.code)); return Array.from(new Set(d.qs.filter(q => q.status === 'Active').flatMap(q => q.crit))).filter(c => !ok.has(c)); };
const _pubCB5 = ACT.pubAsg;
ACT.pubAsg = el => {
  const d = el && el.dataset && s2Def(el.dataset.id); if (!d || d.status !== 'Draft') return _pubCB5(el);
  const pr = cbPr(cbAsgPid(d)), st = pr && d.pv ? cbAsgStale(d) : [];
  if (pr && cbRetired(pr)) { s2Log(d, 'Blocked: publish (programme retired)', 'Draft', 'Draft', cbEnt(pr)); toast('This programme is retired, so its assignments can\'t be published.', 'err'); return; }
  if (st.length) { s2Log(d, 'Blocked: publish (criteria not in the linked version)', 'Draft', 'Draft', `${cbAsgVerTxt(d)}: ${st.join(', ')}`); openModal({ title: 'Can\'t publish yet', body: `<div class="note b-red">${ic('alert')}<div class="small">These mapped criteria aren't knowledge criteria of ${esc(pr.title)} ${cbAsgVerTxt(d)}: ${esc(st.join(', '))}. Change the mapping first.</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  const back = S.route === 'a-programmes' && S.params ? { id: S.params.id, tab: 'assessments' } : null, r = _pubCB5(el);
  if (back && MODAL) { const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a) { const g = a.fn; a.fn = (...x) => { const res = g(...x); if (S.route !== 'a-programmes') go('a-programmes', back); return res; }; } }
  return r;
};
// Learners who get a published copy: those of the definition's programme (by ID) — never matched by a title alone when the ID is known
const _targetsCB5 = s2Targets;
s2Targets = function (d, codes) { const pid = cbAsgPid(d); if (!pid) return _targetsCB5.apply(this, arguments); return Object.keys(STORE.worlds || {}).filter(v => { const w = STORE.worlds[v]; return w && w.nvq && w.flags && w.flags.admitted && s3ProgOfW(w) === pid && codes.includes(s2BatchCodeOf(w)) && !(d.pv && w.nvq.progVersion && w.nvq.progVersion !== d.pv); }); };

/* ---------- Question evidence and attachment settings ---------- */
const CB_ATT_TYPES = ['PDF', 'DOCX', 'JPG', 'PNG'];
const _qDlgCB5 = s2QDlg;
s2QDlg = function (d, q) {
  const r = _qDlgCB5.apply(this, arguments); if (!MODAL) return r;
  const types = (q && q.attTypes) || CB_ATT_TYPES, max = (q && q.attMax) || 5;
  MODAL.body += `<div class="field"><label for="aq-ev">Evidence to include (shown to the learner under the question)</label><textarea class="textarea" id="aq-ev" rows="2" placeholder="e.g. A real example from your workplace">${esc((q && q.ev) || '')}</textarea></div>
    <fieldset class="field cb-aq-att" style="border:0;padding:0"><legend class="lbl">Attachments for this question (when allowed)</legend><div class="row"><label class="small" for="aq-n">Up to</label><input class="input num" type="number" min="1" max="5" id="aq-n" value="${max}" style="width:5em"><span class="small">files</span>${CB_ATT_TYPES.map(t => `<label class="check small"><input type="checkbox" class="aq-ty" value="${t}" ${types.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}</div><span class="hint">10 MB per file. At most 5 files.</span></fieldset>`;
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a) { const g = a.fn; a.fn = (...x) => {
    if (!cbAsgCan()) { closeModal(); return cbAsgRefuse('change assignment questions'); }
    const ev = mval('#aq-ev'), mx = +mval('#aq-n'), ty = $$('#modal-root .aq-ty:checked').map(e => e.value), att = !!($('#aq-a') || {}).checked;
    if (att && !(mx >= 1 && mx <= 5)) return fieldErr('#aq-n', 'Choose 1 to 5 files'), false;
    if (att && !ty.length) return fieldErr('#aq-n', 'Choose at least one file type'), false;
    const n = d.qs.length, res = g(...x); if (res === false) return false;
    const tq = q || d.qs[n]; if (tq) { const was = `${tq.ev || '—'} · ${tq.attMax || 5} · ${(tq.attTypes || CB_ATT_TYPES).join('/')}`; Object.assign(tq, { ev, attMax: mx || 5, attTypes: ty.length ? ty : CB_ATT_TYPES.slice() }); const now_ = `${ev || '—'} · ${tq.attMax} · ${tq.attTypes.join('/')}`; if (q && was !== now_) s2Log(d, 'Question evidence settings changed', was, now_, tq.id); }
    render(); return res;
  }; }
  renderModal(); return r;
};
// Published copies carry the question settings, the References section and the template choice of their definition
const _copyCB5 = s2CopyTo;
s2CopyTo = function (v, d) {
  const r = _copyCB5.apply(this, arguments); if (!r) return r;
  const a = STORE.worlds[v].assignments.find(x => x.id === d.id); if (!a) return r;
  a.qs.forEach(aq => { const q = d.qs.find(x => x.id === aq.id); if (q) { aq.attach = q.attach !== false; if (q.ev) aq.ev = q.ev; if (q.attMax) aq.attMax = q.attMax; if (q.attTypes) aq.attTypes = q.attTypes.slice(); } });
  if (d.refs) { a.refsOn = true; a.refRounds = []; }
  if (d.template === false) a.resources = a.resources.filter(x => !/Assignment template/i.test(x[0]));
  else if (d.template === true) a.resources = a.resources.map(x => /Assignment template/i.test(x[0]) ? ['Assignment template (DOCX) — optional'] : x);
  return r;
};
// The answer box shows the question's evidence guidance and its own attachment limits
const cbAttTxt = q => `Up to ${q.attMax || 5} file${(q.attMax || 5) === 1 ? '' : 's'} · ${(q.attTypes || CB_ATT_TYPES).join(', ')} · 10 MB each`;
const _rteCB5 = rte;
rte = function (a, q, n, opts = {}) {
  const h = _rteCB5.apply(this, arguments); if (!q || q.id === 'refs') return h;
  const ev = q.ev ? `<p class="xs cb-qev"><strong>Evidence to include:</strong> ${esc(q.ev)}</p>` : '';
  return ev + (q.attMax || q.attTypes ? h.replace('Up to 5 files · PDF, DOCX, JPG, PNG · 10 MB each', esc(cbAttTxt(q))) : h);
};
const _attachCB5 = INP.attach;
INP.attach = el => {
  const f = el.files && el.files[0], key = el.dataset.key || ''; if (!f || S.portal !== 'learner' || !W || !W.assignments) return _attachCB5(el);
  const [aid, qid] = key.split('.'), a = W.assignments.find(x => x.id === aid), q = a && a.qs.find(x => x.id === qid);
  if (q && q.attMax && (W.drafts['attid.' + key] || []).length >= q.attMax) { toast(`Up to ${q.attMax} file${q.attMax === 1 ? '' : 's'} for this question.`, 'err'); el.value = ''; return; }
  if (q && q.attTypes) { const ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1] || '', e = ext.toUpperCase() === 'JPEG' ? 'JPG' : ext.toUpperCase(); if (!q.attTypes.includes(e)) { toast(`${f.name}: this question accepts ${q.attTypes.join(', ')} only.`, 'err'); el.value = ''; return; } }
  return _attachCB5(el);
};

/* ---------- References: a section after all the questions (assignments created from CB5) ---------- */
const cbRefKey = a => `${a.id}.refs.${(a.refRounds || []).length}`;
const cbRefBox = a => `<section class="card cb-refs"><h3>References</h3><p class="xs muted">List the sources you used (books, websites, policies, guidance), one per line. Saved with your answers and submitted with them.</p>${_rteCB5(a, { id: 'refs', attach: false }, (a.refRounds || []).length).replace(/aria-label="Your answer to question [^"]*"/, 'aria-label="References"').replace('Type your answer here…', 'Your references…').replace(/<p class="xs muted w0-noatt">[^<]*<\/p>/, '')}</section>`;
const cbRefsDone = a => (a.refRounds || []).length ? `<section class="card cb-refs-done"><h3>References</h3>${a.refRounds.map((r, i) => `<div class="small"><span class="xs muted">${i ? 'Resubmission ' + i : 'Submission'} — ${fdt(r.at)}</span>${r.html && r.html.replace(/<[^>]+>|&nbsp;/g, '').trim() ? r.html : '<p><em>No references given</em></p>'}</div>`).join('')}</section>` : '';
const _sheetCB5 = answerSheet;
answerSheet = function (a) { const h = _sheetCB5.apply(this, arguments); if (!a.refsOn) return h; const k = h.lastIndexOf('<div class="row" style="justify-content:flex-end">'); return k < 0 ? h + cbRefBox(a) : h.slice(0, k) + cbRefBox(a) + h.slice(k); };
const _resubCB5 = resubView;
resubView = function (a) { const h = _resubCB5.apply(this, arguments); if (!a.refsOn) return h; const k = h.lastIndexOf('<div class="row" style="justify-content:flex-end">'); return cbRefsDone(a) + (k < 0 ? h + cbRefBox(a) : h.slice(0, k) + cbRefBox(a) + h.slice(k)); };
const _lockedCB5 = lockedView;
lockedView = function (a) { return _lockedCB5.apply(this, arguments) + (a.refsOn ? cbRefsDone(a) : ''); };
const _reviewCB5 = ACT.reviewSubmit;
ACT.reviewSubmit = el => { const r = _reviewCB5(el), a = asgById(el.dataset.id); if (MODAL && a && a.refsOn) { const v = W.drafts[cbRefKey(a)] || ''; MODAL.body = MODAL.body.replace('<p class="small muted">When you press Submit', `<div class="q cb-refs-rev"><div class="q-h"><span class="q-t"><strong>References</strong></span></div><div style="padding:6px">${v.replace(/<[^>]+>|&nbsp;/g, '').trim() ? v : '<em>No references given</em>'}</div></div><p class="small muted">When you press Submit`); renderModal(); } return r; };
const _finCB5 = finaliseSubmit;
finaliseSubmit = function (a, resub, at) { if (a && a.refsOn) { const k = cbRefKey(a); (a.refRounds = a.refRounds || []).push(Object.freeze({ at, html: W.drafts[k] || '' })); } return _finCB5.apply(this, arguments); };
// The assessor sees the submitted references with the answers
const _tMarkCB5 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => { const h = _tMarkCB5(p), s = typeof tasSubs === 'function' ? tasSubs(true).find(x => x.key === (p && p.id)) : null, a = s && tasAsg(s); return a && a.refsOn ? h + cbRefsDone(a) : h; };

/* ---------- Seeded answer keys: audited, each record frozen with the programme version it was made on ---------- */
// Answer keys stay programme-wide guidance per module code (CH-18 / S3-01): they reach the programme's learners at once and aren't
// versioned (client decision, PD-CB-38). What CB5 protects: a key record is never edited or removed — an upload or a removal adds
// a record, which notes the current programme version; older records say "version not recorded".
function cbKeyFreeze() { const K = (STORE.s3 && STORE.s3.keys) || {}; Object.values(K).forEach(m => Object.values(m || {}).forEach(l => (l || []).forEach(e => { if (e && !Object.isFrozen(e)) Object.freeze(e); }))); }
const _isCB5 = initStore; initStore = function () { const r = _isCB5.apply(this, arguments); cbKeyFreeze(); return r; };
['chAnsUp', 's3KeyRemove'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function (el) {
  const r = f.apply(this, arguments), pid = el && el.dataset && el.dataset.p, key = el && el.dataset && el.dataset.k, a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !pid || !key) return r;
  const g = a.fn; a.fn = (...x) => { const l0 = (s3Keys(pid)[key] || []).length, res = g(...x), l = s3Keys(pid)[key] || [], pr = s3Pr(pid); if (l.length > l0 && l[0] && !Object.isFrozen(l[0])) { l[0] = Object.freeze({ ...l[0], pv: pr ? pr.version : null }); } cbKeyFreeze(); return res; };
  return r; }; });
function cbKeysPanel(pr) {
  if (pr.chNew) { const t = cbTree(pr) || [], rows = t.flatMap(u => u.mods.map(m => [u, m])); return `<section class="card cb-keys"><h2>Answer keys (guidance)</h2><p class="small muted">For this programme the answer key of each module is part of its structure, so it belongs to a version: change it in Section 2 — Curriculum while the version is a draft.</p>${rows.length ? `<ul class="list">${rows.map(([u, m]) => `<li class="li"><div class="li-b"><strong><span class="code">${esc(u.code)} ${esc(m.code)}</span> ${esc(m.title)}</strong><span class="small muted">${m.key ? esc(m.key.file) + ' · ' + esc(m.key.by || '') : 'No answer key'}</span></div></li>`).join('')}</ul>` : '<p class="small">No modules yet.</p>'}</section>`; }
  cbKeyFreeze(); const K = s3Keys(pr.id), t = cbAsgTreeOf(pr), mods = t.flatMap(u => u.mods.map(m => u.code + ' ' + m.code)), keys = Array.from(new Set(mods.concat(Object.keys(K))));
  return `<section class="card cb-keys"><h2>Answer keys (guidance)</h2><div class="note b-amber" role="status">${ic('info')}<div class="small"><strong>Shared by every version of this programme.</strong> A module's answer key reaches the programme's learners as soon as it is uploaded or removed; it isn't tied to a programme version (pending a client decision). Every upload and removal is kept below and can't be changed; records made from now on note the programme version current at the time.</div></div>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Module</th><th>Current answer key</th><th>History</th></tr></thead><tbody>${keys.map(k => { const l = K[k] || [], c = s3KeyCur(pr.id, k); return `<tr data-k="${esc(k)}"><td class="mono">${esc(k)}</td><td>${c ? esc(c.file) : '<span class="muted">None</span>'}</td><td class="small">${l.length ? `<ul class="cb-keyh">${l.map(e => `<li>${e.removed ? 'Removed' : 'Uploaded'} ${esc(e.file)} · ${esc(e.by || '—')}, ${e.at ? fd(e.at) : '—'} · ${e.pv ? 'Programme version ' + e.pv : 'version not recorded'}</li>`).join('')}</ul>` : '<span class="muted">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="xs muted">Upload, replace or remove a key on the module in Section 2 — Curriculum (published version).</p></section>`;
}

/* ---------- Section 3: assignments of this programme, authored here ---------- */
const cbAsgOf = pr => s2Defs().filter(d => d.status !== 'Deleted' && cbAsgPid(d) === pr.id);
ACT.cbAsgOpen = el => { setUi('cbAsg.' + el.dataset.p, el.dataset.id || ''); setUi('cbAsgT.' + el.dataset.p, el.dataset.t || 'details'); render(); };
function cbAsgSettings(d) {
  const ed = d.status === 'Draft' && cbAsgCan();
  return `<section class="card cb-asg-set"><h3>Version, references and template</h3><dl class="kv"><dt>Programme version</dt><dd>${esc(cbAsgVerTxt(d))}${d.pv ? '' : ' <span class="xs muted">(created before assignments were linked to a version)</span>'}</dd>
    <dt>References section</dt><dd>${d.refs ? 'Yes — after the last question' : 'No'}${ed ? ` <button class="btn btn-sm btn-ghost" data-act="cbAsgSet" data-id="${d.id}" data-k="refs">${d.refs ? 'Remove' : 'Add'}</button>` : ''}</dd>
    <dt>Answer template</dt><dd>${d.template === true ? 'Optional template offered (DOCX)' : d.template === false ? 'None — learners answer in the boxes' : 'Seeded assignment: its existing template is kept'}${ed ? ` <button class="btn btn-sm btn-ghost" data-act="cbAsgSet" data-id="${d.id}" data-k="template">${d.template === true ? 'Stop offering' : 'Offer an optional template'}</button>` : ''}</dd></dl>
    ${d.status !== 'Draft' ? '<p class="xs muted">Settled when it was published.</p>' : ''}</section>`;
}
ACT.cbAsgSet = el => {
  const d = s2Def(el.dataset.id); if (!cbAsgCan()) return cbAsgRefuse('change an assignment', el); if (!d) return;
  if (d.status !== 'Draft') { s2Log(d, 'Blocked: change references or template (published)', d.status, d.status, ''); toast('Only a Draft assignment can be changed.', 'err'); return; }
  const k = el.dataset.k, was = k === 'refs' ? !!d.refs : d.template === true; if (k === 'refs') d.refs = !d.refs; else d.template = d.template === true ? false : true;
  s2Log(d, k === 'refs' ? 'References section changed' : 'Answer template changed', was ? 'On' : 'Off', was ? 'Off' : 'On', ''); render();
};
function cbAsgQSettings(d) {
  const act = d.qs.filter(q => q.status === 'Active'); if (!act.length) return '';
  return `<section class="card cb-asg-qset"><h3>Question evidence and attachments</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Question</th><th>Evidence to include</th><th>Attachments</th><th>Criteria</th></tr></thead><tbody>${act.map((q, i) => `<tr data-q="${q.id}"><td>Q${i + 1}</td><td class="small">${q.ev ? esc(q.ev) : '<span class="muted">—</span>'}</td><td class="small">${q.attach === false ? 'Not allowed' : esc(cbAttTxt(q))}</td><td class="mono small">${q.crit.length ? esc(q.crit.join(', ')) : '<span class="muted">Not mapped</span>'}</td></tr>`).join('')}</tbody></table></div><p class="xs muted">Change a question's settings with its Edit button (Draft only).</p></section>`;
}
function cbAssessPanel(pr) {
  const list = cbAsgOf(pr), can = cbAsgCan() && !cbRetired(pr), sel = ui('cbAsg.' + pr.id, ''), d = sel && list.find(x => x.id === sel), tab = ui('cbAsgT.' + pr.id, 'details');
  const head = `<section class="card cb-assess"><div class="row-b"><h2>Assignments</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="cbAsgNew" data-p="${pr.id}">${ic('plus', 14)}New assignment</button>` : ''}</div>
    <p class="small muted">${cbRetired(pr) ? 'Kept as a historical record: the assignments of this retired programme, read-only.' : `Written-answer assignments for this programme, mapped to the knowledge criteria of the programme version they are linked to. New assignments are linked to Version ${pr.version}${pr.status === 'Draft' ? ' (draft programme)' : ' (published)'}.`}</p>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Assignment</th><th>Unit / module</th><th>Version</th><th class="r">Questions</th><th>References</th><th>Status</th><th></th></tr></thead><tbody>${list.map(x => `<tr data-id="${x.id}"${x === d ? ' class="cb-sel"' : ''}><td><strong>${esc(x.title)}</strong></td><td class="small">${esc(x.unit || '—')}</td><td class="small">${esc(cbAsgVerTxt(x))}</td><td class="r">${x.qs.filter(q => q.status === 'Active').length}</td><td class="small">${x.refs ? 'Yes' : 'No'}</td><td>${chip(x.status, x.status === 'Published' ? 'green' : x.status === 'Draft' ? 'amber' : 'grey')}</td><td><button class="btn btn-sm btn-ghost" data-act="cbAsgOpen" data-p="${pr.id}" data-id="${x.id}">${x === d ? 'Open' : 'Open'}</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small">No assignments for this programme yet.</p>'}</section>`;
  if (!d) return head;
  const act = d.qs.filter(q => q.status === 'Active'), un = act.filter(q => !q.crit.length).length, edt = cbAsgCan() && !cbRetired(pr);
  const tabs = [['details', 'Details'], ['questions', 'Questions'], ['mapping', 'Criteria mapping']].map(([k, l]) => `<button class="tab" role="tab" aria-selected="${k === tab}" data-act="cbAsgOpen" data-p="${pr.id}" data-id="${d.id}" data-t="${k}">${l}</button>`).join('');
  const body = tab === 'questions' ? s2Questions(d) + cbAsgQSettings(d) : tab === 'mapping' ? s2Mapping(d) : s2Details(d) + cbAsgSettings(d);
  const btns = !edt ? '' : `<div class="row cb-asg-btns">${tab === 'details' && d.status !== 'Retired' ? `<button class="btn btn-primary" data-act="s2Save" data-id="${d.id}">Save</button>` : ''}${d.status === 'Draft' ? `<button class="btn" data-act="pubAsg" data-id="${d.id}">Publish</button>` : ''}${d.status === 'Published' ? `<button class="btn" data-act="kEditBrief" data-id="${d.id}">${ic('edit', 15)}Edit brief (new version)</button><button class="btn" data-act="s2Unpublish" data-id="${d.id}">Unpublish</button><button class="btn" data-act="s2Retire" data-id="${d.id}">Retire</button>` : ''}<button class="btn btn-ghost" data-go="a-assignments" data-id="${d.id}" data-tab="extensions">Deadline extensions</button></div>`;
  const note = d.status === 'Draft' && (!act.length || un) ? `<div class="note b-red">${ic('alert')}<div class="small"><strong>Publishing blocked:</strong> ${!act.length ? 'add at least one question' : `${plural(un, 'question')} not mapped to a criterion yet`}.</div></div>` : '';
  return head + `<section class="card cb-asg-ed" data-id="${d.id}"><div class="row-b"><h2>${esc(d.title)}</h2><span class="row">${chip(d.status, d.status === 'Published' ? 'green' : d.status === 'Draft' ? 'amber' : 'grey')}<span class="typebadge">Assignment version ${d.version}</span><button class="btn btn-sm btn-ghost" data-act="cbAsgOpen" data-p="${pr.id}" data-id="">Close</button></span></div>
    ${note}<div class="cb-panels cb-asg-tabs" role="tablist" aria-label="Assignment">${tabs}</div><div class="cb-asg-body">${body}</div>${btns}</section>`;
}
const _panelsCB5 = cbPanels;
cbPanels = function (pr, sec) {
  if (sec !== 'assessments') return _panelsCB5.apply(this, arguments);
  const H = f => () => { const dv = document.createElement('div'); dv.innerHTML = f(); return cbHtml(dv, pr); };
  return [['assessments', 'Assignments', H(() => cbAssessPanel(pr))], ['keys', 'Answer keys', H(() => cbKeysPanel(pr))]];
};
CB_ROUTE.keys = ['assessments', 'keys'];
// Section 3 is no longer read-only for programme administrators
const _badgesCB5 = cbBadges;
cbBadges = function (pr) { const b = _badgesCB5.apply(this, arguments); if (cbAsgCan() && !cbRetired(pr) && b.assessments) b.assessments = b.assessments.filter(x => !/Read-only/.test(x)); return b; };
['cbAsgNew', 'cbAsgSet'].forEach(n => CB_WRITE.push(n));

/* ---------- Records ---------- */
UXC.push(['CB5', 'Assessments — authoring in the course builder (21 Oct 2026)', [
  'Section 3 lists the programme\'s assignments (unit, programme version, questions, References, status) and opens each one in place: Details (with its programme version, References section and template choice), Questions (with each question\'s evidence guidance and attachment limits) and Criteria mapping. New assignment, Save, Publish, Edit brief, Unpublish and Retire work here; deadline extensions stay on the Assignments page.',
  'Assignments are linked to their programme by ID (older ones resolved from their exact title) and new ones to the programme version whose criteria they map; criteria come only from that programme version — Level 4 and Level 5 assignments no longer list Level 3\'s criteria. Publishing is refused if a mapped criterion isn\'t a knowledge criterion of the linked version.',
  'Questions: evidence to include (shown to the learner under the question), and when attachments are allowed, up to how many files (1–5) of which types; the answer box enforces them.',
  'New assignments have a References section after the last question (saved with the answers, submitted with them, kept per submission and shown to the assessor) and no answer template: learners answer in the boxes; an optional template can be offered. Seeded assignments are unchanged. Submissions and resubmissions are untouched.',
  'Every assignment action now checks the role in the action (Super Admin, Academic Admin, System Admin) and logs refusals — before, only "New assignment" did.',
  'Answer keys: a new "Answer keys" area lists each module\'s current key and its full history. Keys stay shared by every version of the programme (pending a client decision); records can\'t be changed and new ones note the programme version current at the time.']]);
const _aIdxCB5 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB5(p) + `<section class="card idx-sec"><h2>CB5 — Assessments</h2><ul class="idx-list">${[
  chIdxLi('Level 3 Diploma — Assessments (author assignments)', { act: 'aJump', t: 'a-programmes.NV-L3.assessments' }, 'CB5 — assignments authored in the builder.'),
  chIdxLi('Level 3 Diploma — Answer keys (history)', { act: 'aJump', t: 'a-programmes.NV-L3.keys' }, 'CB5 — answer-key records, not versioned.')].join('')}</ul></section>`;
