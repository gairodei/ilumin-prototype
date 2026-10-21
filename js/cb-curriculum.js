/* ============================================================
   CB4 — Section 2 Curriculum of the unified course builder (21 Oct 2026; PD-CB-26…31 in PROVISIONAL-DECISIONS.md).
   One curriculum editor for every NVQ programme — seeded (S3 trees, STORE.s3) and made with "New NVQ programme" (CH-8 trees,
   STORE.chProgTree). cbTree(pr, v) resolves the programme's own authoritative tree for a version (the draft, the current
   published version or a stored earlier version) and never another programme's: a missing tree is null and shown as unavailable.
   Nothing is copied into a new store. Every change goes through the store's existing action (nodeAdd / s3Rename / nodeState /
   loMove / loType / chModCode / chAnsUp for seeded programmes; ch8AddUnit … ch8Key / s3WRemove / ch8LoType for new ones), so
   their rules and audit entries are kept; two actions are added for both stores: Edit (cbCurEdit) and reorder (cbCurMove).
   Editing: a Draft programme directly; a published programme only through its draft version (created with "Create new version");
   Suspended keeps its existing rule (PD-CB-28); Retired is read-only. When Course Details says the course has no observations,
   Observation-type Learning Outcomes can't be added or chosen; existing ones are kept and flagged (N5a's D5 review).
   Every mutation checks the role in the action (Super Admin, Academic Admin, System Admin in the admin portal). Loads last.
   ============================================================ */
'use strict';

/* ---------- One accessor: the programme's own tree for a version ---------- */
const cbCurDv = pr => (!pr || cbRetired(pr) ? null : cbDraftV(pr));
// v omitted: what Section 2 edits or shows first — the draft while there is one, otherwise the current published version
function cbTree(pr, v) {
  if (!pr) return null;
  const dv = cbCurDv(pr); if (v == null) v = dv || pr.version; v = +v;
  const live = pr.chNew ? (STORE.chProgTree || {})[pr.id] : (STORE.s3 ? STORE.s3.trees[pr.id] : null);
  if (dv && v === dv) return pr.chNew || pr.status === 'Draft' ? live || null : s3Draft(pr.id).tree;
  if (pr.status === 'Draft') return null; // never published: only its draft exists
  const snap = s3Snap(pr)[v]; if (snap) return snap;
  return v === pr.version && !(pr.chNew && pr.nextDraft) ? live || null : null;
}
// Editing mode of a programme (Suspended keeps the S3 rule it had: see PD-CB-28)
function cbCurMode(pr) {
  if (cbRetired(pr)) return 'retired';
  if (pr.status === 'Draft') return 'draftProg';
  if (cbDraftV(pr)) return 'draftVer';
  if (pr.status === 'Suspended' && !pr.chNew) return 'suspended';
  return 'published';
}
const cbCurCan = () => cbAdmin(); // Super Admin, Academic Admin, System Admin, in the admin portal
// The version Section 2 can change: the draft, or (Suspended, existing rule) the current structure
const cbCurEditV = pr => { const m = cbCurMode(pr); return m === 'draftProg' || m === 'draftVer' ? cbDraftV(pr) : m === 'suspended' ? pr.version : null; };
// Versions that can be viewed: the draft, the current published version, earlier versions whose structure is stored
function cbCurVersions(pr) {
  const dv = cbCurDv(pr), out = [], missing = [];
  if (dv) out.push(dv);
  if (pr.status !== 'Draft') { out.push(pr.version); for (let k = pr.version - 1; k >= 1; k--) (cbTree(pr, k) ? out : missing).push(k); }
  return { list: out, missing };
}
const cbCurSel = pr => { const v = +ui('cbCurV.' + pr.id, 0), l = cbCurVersions(pr).list; return l.includes(v) ? v : l[0]; };
// Course Details answered "No" to observations for the version being edited
const cbCurObsNo = pr => { const d = typeof n5Shown === 'function' ? n5Shown(pr) : null; return !!d && d.required === false; };
const cbCurObsBlocked = (pr, type, cur) => !!type && type !== cur && critKind(type) === 'Observation' && cbCurObsNo(pr);
// The criteria CB6 uses for observation events: NVQ observation criteria of the version (N5a's own rule, nothing retired)
const cbCurObsCriteria = (pr, v) => n5NvqOf(cbTree(pr, v) || []);

/* ---------- Guards for the actions added here ---------- */
function cbCurTarget(pid, what, peek) {
  const pr = cbPr(pid);
  if (!pr) { logA('NVQ Programmes', pid || '—', 'Blocked: ' + what + ' (programme not found)', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('Programme not found.', 'err'); return null; }
  if (!cbCurCan()) { s3Refuse(what, cbEnt(pr)); return null; }
  const m = cbCurMode(pr);
  if (m === 'retired') { logA('NVQ Programmes', cbEnt(pr), 'Blocked: ' + what + ' (programme retired)', '—', '—', ADMIN.me.name); toast('This programme is retired, so it is read-only.', 'err'); return null; }
  if (m === 'published') { s3Log(pr, 'Blocked: ' + what + ' (published version)', `Version ${pr.version}`, '—', 'Published versions can\'t be changed — create a new version first'); toast('Version ' + pr.version + ' is published and can\'t be changed. Create a new version first.', 'err'); return null; }
  const tree = peek ? cbTree(pr) : pr.chNew ? ch8Tree(pr.id) : m === 'suspended' ? s3EditTree(pr.id, true) : pr.status === 'Draft' ? s3Tree(pr.id) : s3Draft(pr.id).tree;
  return { pr, tree, note: s3Draft(pr.id) && !pr.chNew ? `Version ${s3Draft(pr.id).v} (draft)` : pr.status === 'Draft' ? `Version ${pr.version} (draft programme)` : pr.nextDraft ? `Version ${pr.version + 1} (draft)` : 'Current version (suspended programme)' };
}
// A node addressed by its position and checked by its codes, so a stale page can't change another item
const CB_KIDS = [n => n.mods, n => n.los, n => n.crit];
function cbCurNode(tree, path, codes) {
  const ix = String(path).split('.').map(Number), cs = String(codes).split('|'), chain = []; let list = tree;
  for (let i = 0; i < ix.length; i++) { const n = list && list[ix[i]]; if (!n || n.code !== cs[i]) return null; chain.push(n); list = i < 3 ? CB_KIDS[i](n) : null; }
  return { chain, node: chain[chain.length - 1], lvl: ['unit', 'mod', 'lo', 'crit'][chain.length - 1], list: chain.length === 1 ? tree : CB_KIDS[chain.length - 2](chain[chain.length - 2]), i: ix[ix.length - 1] };
}
const cbCurName = n => [n.code, n.title || n.d].filter(Boolean).join(' ');
const cbCurPathTxt = chain => chain.map(n => n.code).join(' ');

/* ---------- Edit: one dialog for every level and both stores ---------- */
ACT.cbCurEdit = el => {
  const d = el.dataset, g = cbCurTarget(d.p, 'change the curriculum', true); if (!g) return;
  const n = cbCurNode(g.tree, d.path, d.codes); if (!n) { toast('This item has changed — the page has been refreshed.', 'err'); render(); return; }
  const x = n.node, wiz = !!g.pr.chNew, evK = wiz ? 'ev' : 'evReq', what = { unit: 'unit', mod: 'module', lo: 'Learning Outcome', crit: 'criterion' }[n.lvl];
  const ro = (l, v, hint) => `<div class="field"><span class="lbl">${l}</span><div class="mono cb-ro">${esc(v || '—')}</div>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const f = n.lvl === 'crit'
    ? `${ro('Criterion code', x.code, 'Codes don\'t change: learners\' evidence and assignment questions are linked to them.')}<div class="field"><label for="ce-t">Descriptor</label><input class="input" id="ce-t" value="${esc(x.d)}"></div><div class="field"><label for="ce-e">Evidence requirement</label><textarea class="textarea" id="ce-e">${esc(x[evK] || '')}</textarea></div>`
    : `${ro(n.lvl === 'unit' ? 'Unit code' : n.lvl === 'mod' ? 'Module code' : 'Learning Outcome code', x.code, 'Codes don\'t change: learners\' evidence, answer keys and mappings are linked to them.')}<div class="field"><label for="ce-t">${n.lvl === 'lo' ? 'Learning Outcome' : n.lvl === 'mod' ? 'Module title' : 'Unit title'}</label><input class="input" id="ce-t" value="${esc(x.title)}"></div>`
      + (n.lvl !== 'mod' ? '' : wiz ? `<div class="field"><label for="ce-ab">Awarding-body code</label><input class="input mono" id="ce-ab" value="${esc(x.ab || '')}" placeholder="e.g. T/650/0001"></div>` : ro('Awarding-body code', x.ab, 'Corrected with the awarding-body code field on the module (CH-15), in the version being edited only — published versions and learners\' records keep their code.'))
      + (n.lvl === 'lo' ? `<p class="xs muted">The assessment type is changed with the type list on the Learning Outcome.</p>` : '');
  openModal({ title: 'Edit ' + what + ' — ' + esc(cbCurPathTxt(n.chain)), size: 'lg', body: cbCurCtx(n.chain.slice(0, -1), cbCurNoteOf(g.pr)) + f, actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
    const t = mval('#ce-t'), ev = n.lvl === 'crit' ? mval('#ce-e') : null, ab = n.lvl === 'mod' && wiz ? mval('#ce-ab').toUpperCase() : null;
    if (!t) return fieldErr('#ce-t', n.lvl === 'crit' ? 'Enter the descriptor' : 'Enter a title'), false;
    if (n.lvl === 'crit' && !ev) return fieldErr('#ce-e', 'Enter the evidence requirement'), false;
    if (ab !== null && !ab) return fieldErr('#ce-ab', 'Enter the awarding-body code'), false;
    if (ab && !/^[A-Z]\/\d{3}\/\d{4}$/.test(ab)) return fieldErr('#ce-ab', 'Use the format T/650/0001'), false;
    const key = n.lvl === 'crit' ? 'd' : 'title', same = t === x[key] && (ev === null || ev === (x[evK] || '')) && (ab === null || ab === (x.ab || ''));
    if (same) return fieldErr('#ce-t', 'Nothing has changed'), false;
    const g2 = cbCurTarget(d.p, 'change the curriculum'); if (!g2) { closeModal(); return false; } // the role or the version may have changed meanwhile
    const n2 = cbCurNode(g2.tree, d.path, d.codes); if (!n2) { toast('This item has changed — nothing was saved.', 'err'); closeModal(); render(); return false; }
    const y = n2.node, was = [], now_ = [];
    if (t !== y[key]) { was.push(y[key]); now_.push(t); y[key] = t; }
    if (ev !== null && ev !== (y[evK] || '')) { was.push('Evidence: ' + (y[evK] || '—')); now_.push('Evidence: ' + ev); y[evK] = ev; }
    if (ab !== null && ab !== (y.ab || '')) { was.push('Awarding-body code ' + (y.ab || '—')); now_.push('Awarding-body code ' + ab); y.ab = ab; }
    s3Log(g2.pr, 'Node edited', was.join(' · '), now_.join(' · '), `${cbCurPathTxt(n2.chain)} — ${g2.note}`); cbCurOpenUnit(g2.pr.id, n2.chain[0].code); closeModal(); render(); toast('Saved and audited.');
  } }] });
};

/* ---------- Reorder units and modules (both stores) ---------- */
ACT.cbCurMove = el => {
  const d = el.dataset, g = cbCurTarget(d.p, 'change the curriculum'); if (!g) return;
  const n = cbCurNode(g.tree, d.path, d.codes); if (!n || !['unit', 'mod'].includes(n.lvl)) { toast('This item has changed — the page has been refreshed.', 'err'); render(); return; }
  const j = n.i + (+d.dir); if (j < 0 || j >= n.list.length) return;
  [n.list[n.i], n.list[j]] = [n.list[j], n.list[n.i]];
  s3Log(g.pr, n.lvl === 'unit' ? 'Units reordered' : 'Modules reordered', '—', n.list.map(x => x.code).join(' → '), `${n.lvl === 'mod' ? n.chain[0].code + ' — ' : ''}${g.note}`); cbCurOpenUnit(g.pr.id, n.chain[0].code); render();
};

/* ---------- Read-only: an assessment type explained ---------- */
const cbCurTypeInfo = t => { const ty = s3TypeOf(t), k = critKind(t), ev = ty ? ty.evidence : k === 'Knowledge' ? S3_EV_K : k === 'Observation' ? S3_EV_O : '';
  return { ty, k, ev, rule: k === 'Knowledge' ? 'Knowledge rules — assessed through assignment questions (Section 3 — Assessments)' : k === 'Observation' ? 'Observation rules — assessed by an assessor\'s observation (Section 4 — Observations); never through assignments' : 'No marking workflow yet — a programme that uses it can\'t be published' }; };
ACT.cbCurType = el => {
  const t = el.dataset.t, i = cbCurTypeInfo(t); if (!t) return;
  openModal({ title: 'Assessment type — ' + esc(critTypeLabel(t)), body: `<dl class="kv"><dt>Name</dt><dd>${esc(i.ty && i.ty.label || t)}</dd><dt>Evidence it uses</dt><dd>${esc(i.ev || 'Not set')}</dd><dt>Rules it follows</dt><dd>${esc(i.rule)}</dd><dt>Status</dt><dd>${esc(i.ty ? i.ty.status : 'Active')}${i.ty && i.ty.core ? ' · built in' : ''}</dd></dl><p class="xs muted">Assessment types are shared by every programme and managed in Curriculum → Assessment types. Every criterion under a Learning Outcome inherits its type.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};

/* ---------- Which unit stays open, and the version shown ---------- */
const cbCurOpenOf = pid => ui('cbCurOpen.' + pid, null);
function cbCurOpenUnit(pid, code) { const o = cbCurOpenOf(pid) || []; if (!o.includes(code)) setUi('cbCurOpen.' + pid, o.concat(code)); }
document.addEventListener('toggle', e => { const d = e.target; if (!d || !d.matches || !d.matches('details[data-cbu]')) return; const pid = d.dataset.cbp, code = d.dataset.cbu, o = (cbCurOpenOf(pid) || []).filter(c => c !== code); setUi('cbCurOpen.' + pid, d.open ? o.concat(code) : o); }, true);
// Acting inside a unit keeps that unit open when the page is redrawn
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.cb-cur [data-act], .cb-cur [data-onchange]'); const d = b && b.closest('details[data-cbu]'); if (d) cbCurOpenUnit(d.dataset.cbp, d.dataset.cbu); }, true);
ACT.cbCurVer = el => { setUi('cbCurV.' + el.dataset.p, +el.dataset.v); render(); };
ACT.cbCurAll = el => { const pr = cbPr(el.dataset.p), t = pr && cbTree(pr, cbCurSel(pr)); if (!t) return; setUi('cbCurOpen.' + pr.id, el.dataset.o === '1' ? t.map(u => u.code) : []); render(); };

/* ---------- Parent shown in every Add dialog ---------- */
const cbCurCtx = (chain, note) => `<div class="cb-ctx" role="note"><span class="lbl">${chain.length ? 'Adding to / editing in' : 'Saved to'}</span>${chain.length ? `<ol class="cb-ctx-path">${chain.map((n, i) => `<li><span class="xs muted">${['Unit', 'Module', 'Learning Outcome'][i]}</span> <strong><span class="code">${esc(n.code)}</span> ${esc(n.title)}</strong></li>`).join('')}</ol>` : ''}<span class="xs muted">${esc(note)}</span></div>`;
const cbCurNoteOf = pr => { const m = cbCurMode(pr), nv = `A new draft version (Version ${pr.version + 1}), created when you save`; return m === 'suspended' ? (s3HasLearners(pr.id) ? nv : 'Current version (suspended programme)') : m === 'published' ? nv : `Version ${cbDraftV(pr)} (draft)${m === 'draftProg' ? ' — draft programme' : ''}`; };
const cbObsHint = '<p class="xs cb-obs-hint">Observation isn\'t offered: Course Details says this course has no observations.</p>';
// Removes the types that follow the Observation rules from a type list inside a dialog
const cbStripObs = html => s3Types().filter(t => critKind(t.name) === 'Observation').reduce((h, t) => h.replace(new RegExp(`<option value="${esc(t.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[^<]*</option>`, 'g'), ''), html);
function cbAddCtx(name, ctxOf, typeSel) {
  const f = ACT[name]; if (typeof f !== 'function') return;
  ACT[name] = function (el) {
    const was = MODAL, r = f.apply(this, arguments); if (!MODAL || MODAL === was) return r;
    const c = ctxOf(el && el.dataset || {}); if (!c) return r;
    const obsNo = typeSel && typeSel(el.dataset) && cbCurObsNo(c.pr);
    MODAL.body = cbCurCtx(c.chain, cbCurNoteOf(c.pr)) + (obsNo ? cbStripObs(MODAL.body) + cbObsHint : MODAL.body);
    if (obsNo) { const a = MODAL.actions.find(x => /primary/.test(x.cls || '')), sel = typeSel(el.dataset); if (a) { const g = a.fn; a.fn = (...x) => { const v = mval(sel); if (cbCurObsBlocked(c.pr, v, null)) { s3Log(c.pr, 'Blocked: Observation type (course has no observations)', '—', v, 'Course Details: no observations'); return fieldErr(sel, 'Observation isn\'t available — this course has no observations (Course Details)'), false; } return g(...x); }; } }
    renderModal(); return r;
  };
}
const cbS3Ctx = d => { const pr = s3Pr(d.p); if (!pr) return null; const t = s3ViewTree(pr.id), n = s3Find(t, d.u, d.m, d.lo); return { pr, chain: [n.u, n.m, n.lo].filter(Boolean) }; };
const cbW8Ctx = d => { const pr = ch8Pr(d.id); if (!pr) return null; const n = ch8Find(pr, d.u != null ? +d.u : null, d.m != null ? +d.m : null, d.l != null ? +d.l : null); return { pr, chain: [n.u, n.m, n.lo].filter(Boolean) }; };
cbAddCtx('nodeAdd', cbS3Ctx, d => (d.lvl === 'lo' ? '#nd-y' : null));
cbAddCtx('ch8AddUnit', cbW8Ctx); cbAddCtx('ch8AddMod', cbW8Ctx); cbAddCtx('ch8AddLo', cbW8Ctx, () => '#lo-y'); cbAddCtx('ch8AddCrit', cbW8Ctx);

/* ---------- Observation type refused when the course has no observations (both stores) ---------- */
const _loTypeCB4 = INP.loType;
INP.loType = el => { const pr = s3Pr(el.dataset.p); if (pr && cbCurCan()) { const lo = (s3Find(s3ViewTree(pr.id), el.dataset.u).u || { mods: [] }).mods.flatMap(m => m.los).find(l => l.code === el.dataset.lo); if (lo && cbCurObsBlocked(pr, el.value, lo.type)) { s3Log(pr, 'Blocked: Observation type (course has no observations)', `${el.dataset.u} ${el.dataset.lo}: ${lo.type || 'none'}`, el.value, 'Course Details: no observations'); toast('Observation isn\'t available — Course Details says this course has no observations.', 'err'); render(); return; } } return _loTypeCB4(el); };

/* ---------- Role checks on the curriculum inputs that had none; no programme fallback ---------- */
// INP.ch8LoType and INP.chModCode saved for any role, and ACT.chAnsUp opened for any role; chAnsUp, chModCode and loMove fell back
// to Level 3 when no programme was given. They now refuse (logged) like the rest of the structure (s3CanEdit, admin portal).
const cbNoPid = (what, el) => { logA('NVQ Programmes', '—', 'Blocked: ' + what + ' (no programme given)', '—', '—', ADMIN.me ? ADMIN.me.name : '—'); toast('No programme was given — nothing was changed.', 'err'); if (el && 'value' in el) render(); return false; };
const _ch8LoTypeCB4 = INP.ch8LoType;
INP.ch8LoType = el => { const pr = ch8Pr(el.dataset.id); if (!cbCurCan()) { s3Refuse('change the structure', pr ? cbEnt(pr) : '—'); render(); return; }
  const n = pr && ch8Find(pr, +el.dataset.u, +el.dataset.m, +el.dataset.l); if (n && n.lo && cbCurObsBlocked(pr, el.value, n.lo.type)) { s3Log(pr, 'Blocked: Observation type (course has no observations)', `${n.u.code} ${n.m.code} ${n.lo.code}: ${n.lo.type || 'none'}`, el.value, 'Course Details: no observations'); toast('Observation isn\'t available — Course Details says this course has no observations.', 'err'); render(); return; }
  if (pr && cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), 'Blocked: ch8LoType (programme retired)', '—', '—', ADMIN.me.name); toast('This programme is retired, so it is read-only.', 'err'); render(); return; }
  return _ch8LoTypeCB4(el); };
// CB4 correction (PD-CB-33): the CH-15 awarding-body code correction changes the editable structure only — a Draft programme, a
// draft version, or a suspended programme's current structure under its existing rule (PD-CB-28). It no longer rewrites the
// published tree (for Level 3 that is Aisha's own record), earlier versions or learners' copies; on a published version without a
// draft it is refused and logged. A historical correction of published versions or learner records needs a client decision.
INP.chModCode = el => {
  const pid = el.dataset.p, key = el.dataset.k || '', v = String(el.value || '').trim().toUpperCase(); if (!pid) return cbNoPid('change a module code', el);
  const pr0 = cbPr(pid); if (pr0 && pr0.chNew && cbCurCan()) { toast('Change this module\'s code with Edit.', 'info'); render(); return; }
  if (cbCurCan() && pr0 && !cbRetired(pr0) && cbCurMode(pr0) !== 'published' && !/^[A-Z]\/\d{3}\/\d{4}$/.test(v)) { toast('Use the awarding-body format, for example T/652/0001.', 'err'); render(); return; }
  const g = cbCurTarget(pid, 'correct an awarding-body code'); if (!g) { render(); return; }
  const [uc, mc] = key.split(' '), u = g.tree.find(x => x.code === uc), m = u && u.mods.find(x => x.code === mc);
  if (!m) { toast('This module isn\'t in the version being edited.', 'err'); render(); return; }
  const old = m.ab || '—'; if (v === m.ab) { render(); return; }
  m.ab = v; logA('NVQ Programmes', `${pid} · ${key}`, 'Module awarding-body code changed', old, v, `Structure builder — ${g.note}; published versions and learners' records unchanged`);
  render(); toast(`${key}: code saved in ${g.note} (${v}). Published versions and learners' records keep their code.`);
};
const _ansUpCB4 = ACT.chAnsUp;
ACT.chAnsUp = el => { const pid = el && el.dataset && el.dataset.p, pr = pid && s3Pr(pid); if (!pid) return cbNoPid('upload an answer key'); if (!cbCurCan()) return s3Refuse('upload an answer key', pr ? cbEnt(pr) : pid); if (pr && cbRetired(pr)) { logA('NVQ Programmes', cbEnt(pr), 'Blocked: chAnsUp (programme retired)', '—', '—', ADMIN.me.name); toast('This programme is retired, so it is read-only.', 'err'); return; } return _ansUpCB4(el); };
const _loMoveCB4 = ACT.loMove;
ACT.loMove = el => (el && el.dataset && el.dataset.p ? _loMoveCB4(el) : cbNoPid('move a Learning Outcome'));
CB_WRITE.push('cbCurEdit', 'cbCurMove'); // also stripped from a retired programme's read-only page

/* ---------- Learner records whose programme can't be identified (PD-CB-32) ----------
   chProgResolve (ch-b2.js) finds a learner's programme by its ID or an unambiguous title; when it can't, the programme's letter,
   terms, answer keys and resources aren't shown (they used to be Level 3's). The learner's own record is untouched. */
const cbProgNote = w => { const r = w && w.nvq && w.flags && w.flags.nvq ? chProgResolve(w) : null; return r && !r.pr ? `<div class="note b-amber cb-prog-unres" role="status">${ic('alert')}<div class="small"><strong>Your programme record needs to be linked.</strong> It names "${esc(w.nvq.title || '—')}", but ${esc(r.why)}, so the programme's offer letter, payment terms, answer keys and resources can't be shown. Nothing from another programme is shown in their place. Your own progress, assignments and evidence are kept. Contact the Academy to have your record linked.</div></div>` : ''; };
['admission', 'resources'].forEach(k => { const f = SCREENS[k]; if (typeof f !== 'function') return; SCREENS[k] = function (p) { const h = f.apply(this, arguments), n = S.portal === 'learner' ? cbProgNote(W) : ''; return n ? n + h.split('No offer letter has been uploaded for this course.').join('The offer letter can\'t be shown until your programme record is linked.') : h; }; });

/* ---------- The editor ---------- */
function cbCurMaps(pr, v) {
  const q = {}; (typeof s2Defs === 'function' ? s2Defs() : []).filter(d => d.programme === pr.title).forEach(d => (d.qs || []).forEach(x => (x.crit || []).forEach(c => { q[c] = (q[c] || 0) + 1; })));
  const cfg = v === cbCurDv(pr) ? (typeof n5Shown === 'function' && n5CanView() ? n5Shown(pr) : null) : (typeof n5PubOf === 'function' ? n5PubOf(pr.id, v) : null), ia = {};
  ((cfg && cfg.ia) || []).filter(c => c.status === 'Active').forEach(c => (c.map || []).forEach(k => { (ia[k] = ia[k] || []).push(c.code); }));
  return { q, ia };
}
function cbCurBanner(pr, sel, mode) {
  const dv = cbCurDv(pr), can = cbCurCan(), note = (tone, icon, html) => `<div class="note b-${tone} cb-cur-where" role="status">${ic(icon)}<div class="small">${html}</div></div>`;
  if (mode === 'retired') return note('grey', 'lock', `<strong>Retired — read-only.</strong> Version ${pr.version}'s curriculum is kept as a historical record. Nothing can be added or changed.`);
  if (sel !== cbCurEditV(pr)) return note('blue', 'lock', `<strong>Version ${sel} — ${sel === pr.version ? 'published' : 'an earlier version'}, read-only.</strong> ${sel === pr.version ? 'Learners on this version keep it' : 'Kept for learners who studied it'}; published curricula never change.${dv ? ` You're editing <button class="linklike" data-act="cbCurVer" data-p="${pr.id}" data-v="${dv}">Version ${dv} (draft)</button>.` : mode === 'published' ? ` To change the curriculum, ${can ? 'use <strong>Create new version</strong> above: a draft copy you edit and then publish.' : 'a programme administrator creates a new version.'}` : ''}`);
  if (mode === 'draftProg') return note('amber', 'layers', `<strong>Draft programme — Version ${pr.version}.</strong> ${can ? 'Changes are saved straight away and audited.' : 'Read-only for your role.'} Nothing reaches learners until the programme is published.`);
  if (mode === 'draftVer') return note('amber', 'layers', `<strong>Editing Version ${dv} (draft).</strong> Learners stay on <button class="linklike" data-act="cbCurVer" data-p="${pr.id}" data-v="${pr.version}">Version ${pr.version} (published)</button> until Version ${dv} is published; its curriculum doesn't change.${can ? '' : ' Read-only for your role.'}`);
  return note('amber', 'alert', `<strong>Suspended programme.</strong> ${s3HasLearners(pr.id) ? 'It has learners, so the first change creates a new draft version (the existing rule).' : 'It has no learners, so changes are saved to its current structure (the existing rule for suspended programmes, pending a lifecycle decision).'}${can ? '' : ' Read-only for your role.'}`);
}
function cbCurriculum(pr) {
  const mode = cbCurMode(pr), sel = cbCurSel(pr), tree = sel ? cbTree(pr, sel) : null, ed = !!sel && sel === cbCurEditV(pr) && cbCurCan(), wiz = !!pr.chNew, pid = pr.id;
  const vs = cbCurVersions(pr), obsNo = cbCurObsNo(pr) && sel === (cbCurDv(pr) || pr.version), cur = sel === pr.version || sel === cbCurDv(pr);
  const vbar = vs.list.length > 1 ? `<div class="cb-cur-vers" role="group" aria-label="Version shown">${vs.list.map(v => `<button class="btn btn-sm${v === sel ? ' btn-primary' : ''}" data-act="cbCurVer" data-p="${pid}" data-v="${v}" aria-pressed="${v === sel}">Version ${v} — ${v === cbCurDv(pr) ? 'draft' : v === pr.version ? 'published' : 'earlier'}</button>`).join('')}</div>` : '';
  const miss = vs.missing.length ? `<p class="xs muted cb-cur-miss">${plural(vs.missing.length, 'Earlier version', 'Earlier versions')} (${vs.missing.map(v => 'Version ' + v).join(', ')}) ${vs.missing.length === 1 ? 'was' : 'were'} recorded before versions were kept, so ${vs.missing.length === 1 ? 'its' : 'their'} structure isn't stored. Learners on ${vs.missing.length === 1 ? 'it' : 'them'} keep their own copy.</p>` : '';
  const head = `<div class="row-b"><h2>Curriculum structure</h2>${ed ? `<button class="btn btn-sm btn-primary" ${wiz ? `data-act="ch8AddUnit" data-id="${pid}"` : `data-act="nodeAdd" data-p="${pid}" data-lvl="unit"`}>${ic('plus', 14)}Add unit</button>` : ''}</div>
    <p class="small muted">Programme → Unit → Module (awarding-body code) → Learning Outcome (assessment type) → Assessment Criterion (descriptor and evidence requirement; the type is inherited). ${wiz ? (pr.status === 'Draft' ? 'While the programme is a Draft, items can be removed.' : 'Items are never removed after publishing.') : 'Items are never deleted: they can be suspended or retired, and their evidence is kept.'}</p>`;
  if (!tree) return `<section class="card cb-cur" data-p="${pid}">${head}${cbCurBanner(pr, sel || pr.version, mode)}${vbar}<div class="empty cb-cur-na"><p class="small"><strong>${sel && sel !== pr.version && sel !== cbCurDv(pr) ? `Version ${sel}'s curriculum isn't stored.` : 'No curriculum is recorded for this programme.'}</strong> Nothing from another programme is shown in its place.</p></div>${miss}</section>`;
  const live = tree.filter(u => u.status !== 'Retired'), los = live.flatMap(u => u.mods.filter(m => m.status !== 'Retired').flatMap(m => m.los.filter(l => l.status !== 'Retired')));
  const crit = los.reduce((s, l) => s + l.crit.filter(c => c.status !== 'Retired').length, 0), byType = {}; los.forEach(l => { const k = l.type || 'No type'; byType[k] = (byType[k] || 0) + 1; });
  const obsLos = los.filter(l => critKind(l.type) === 'Observation');
  const { q, ia } = cbCurMaps(pr, sel), open = cbCurOpenOf(pid) || (tree[0] ? [tree[0].code] : []);
  const sum = tree.length ? `<p class="small cb-cur-sum">${plural(live.length, 'unit')} · ${plural(live.reduce((s, u) => s + u.mods.filter(m => m.status !== 'Retired').length, 0), 'module')} · ${plural(los.length, 'Learning Outcome')} · ${plural(crit, 'criterion', 'criteria')}${Object.keys(byType).length ? ' — ' + Object.entries(byType).map(([k, n]) => `${esc(k === 'No type' ? k : critTypeLabel(k))} ${n}`).join(', ') : ''}</p>` : '';
  const obsWarn = obsNo && obsLos.length ? `<div class="note b-amber cb-cur-obsno" role="status">${ic('alert')}<div class="small"><strong>This course has no observations (Course Details), but ${plural(obsLos.length, 'Learning Outcome has', 'Learning Outcomes have')} the Observation type.</strong> They are kept, not converted or deleted. Observation criteria are only met by observation, so change their type or answer Yes in Course Details — publishing flags this for review (N5a). New Learning Outcomes can't use the Observation type.</div></div>` : obsNo ? `<p class="xs muted cb-cur-obsno">Course Details says this course has no observations, so the Observation type isn't offered for Learning Outcomes.</p>` : '';
  const tools = ed ? `<div class="row cb-cur-tools"><button class="btn btn-sm btn-ghost" data-act="cbCurAll" data-p="${pid}" data-o="1">Expand all</button><button class="btn btn-sm btn-ghost" data-act="cbCurAll" data-p="${pid}" data-o="0">Collapse all</button></div>` : tree.length ? `<div class="row cb-cur-tools"><button class="btn btn-sm btn-ghost" data-act="cbCurAll" data-p="${pid}" data-o="1">Expand all</button><button class="btn btn-sm btn-ghost" data-act="cbCurAll" data-p="${pid}" data-o="0">Collapse all</button></div>` : '';
  // Actions of each store, with the datasets its existing handlers read
  const DS = (o) => Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ');
  const pathOf = (...ix) => ix.join('.'), codesOf = (...n) => n.map(x => x.code).join('|');
  const editBtn = (lbl, path, codes) => ed ? `<button class="btn btn-sm btn-ghost" data-act="cbCurEdit" ${DS({ p: pid, path, codes })} aria-label="Edit ${esc(lbl)}">${ic('edit', 13)}Edit</button>` : '';
  const moveBtns = (lbl, path, codes, i, n) => ed ? `<button class="btn btn-sm btn-ghost" data-act="cbCurMove" ${DS({ p: pid, path, codes, dir: -1 })} aria-label="Move ${esc(lbl)} up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn btn-sm btn-ghost" data-act="cbCurMove" ${DS({ p: pid, path, codes, dir: 1 })} aria-label="Move ${esc(lbl)} down" ${i === n - 1 ? 'disabled' : ''}>↓</button>` : '';
  const stateBtn = (lbl, o, wi) => !ed ? '' : wiz ? (pr.status === 'Draft' ? `<button class="btn btn-sm btn-ghost" data-act="s3WRemove" ${DS({ id: pid, ...wi })} aria-label="Remove ${esc(lbl)}">Remove</button>` : '') : `<button class="btn btn-sm btn-ghost" data-act="nodeState" ${DS({ p: pid, ...o })} aria-label="Suspend or retire ${esc(lbl)}">Suspend / retire</button>`;
  const addBtn = (lbl, o, wact, wi) => !ed ? '' : wiz ? `<button class="btn btn-sm" data-act="${wact}" ${DS({ id: pid, ...wi })}>${ic('plus', 13)}${lbl}</button>` : `<button class="btn btn-sm" data-act="nodeAdd" ${DS({ p: pid, ...o })}>${ic('plus', 13)}${lbl}</button>`;
  const typeSel = (u, m, lo, ui_, mi, li) => {
    const names = critTypeNames(lo.type).filter(x => !(obsNo && critKind(x) === 'Observation' && x !== lo.type)), rt = x => s3TypeOf(x) && s3TypeOf(x).status === 'Retired' ? ' (retired)' : '';
    const id = wiz ? `lt-${ui_}-${mi}-${li}` : `lot-${u.code}${lo.code}`;
    return `<label class="xs cb-cur-tl" for="${id}">Assessment type</label><select class="select cb-cur-ty" id="${id}" ${wiz ? `data-onchange="ch8LoType" ${DS({ id: pid, u: ui_, m: mi, l: li })}` : `data-onchange="loType" ${DS({ p: pid, u: u.code, lo: lo.code })}`}>${wiz || !lo.type ? `<option value="" ${!lo.type ? 'selected' : ''}>No type yet</option>` : ''}${names.map(x => `<option value="${esc(x)}" ${x === lo.type ? 'selected' : ''}>${esc(wiz ? x : (s3TypeOf(x) || {}).label || x)}${rt(x)}</option>`).join('')}</select>`;
  };
  // Module identifiers and answer keys: seeded keys are kept per programme and module code (S3-01 / CH-15 / CH-18) and are
  // managed on the current version as before; a new programme's answer key belongs to its draft structure
  const modRow = (u, m, ui_, mi) => {
    if (wiz) return `<div class="cb-cur-mod small"><span>Awarding-body code <span class="mono">${esc(m.ab || '—')}</span></span><span>${ic('key', 13)} Answer key: ${m.key ? `<span class="mono">${esc(m.key.file)}</span>` : '<span class="muted">none</span>'}</span>${ed ? `<button class="btn btn-sm btn-ghost" data-act="ch8Key" ${DS({ id: pid, u: ui_, m: mi })}>${m.key ? 'Replace answer key' : 'Answer key (optional)'}</button>` : ''}</div>`;
    const key = u.code + ' ' + m.code, f = s3KeyCur(pid, key), mng = cur && sel === pr.version && mode !== 'retired' && cbCurCan(), codeEd = ed;
    return `<div class="cb-cur-mod small">${codeEd ? `<label class="ch-abc">Awarding-body code <input class="input mono" value="${esc(m.ab || '')}" data-onchange="chModCode" ${DS({ k: key, p: pid })} aria-label="Awarding-body code for ${esc(key)}"></label>` : `<span>Awarding-body code <span class="mono">${esc(m.ab || '—')}</span></span>`}<span>${ic('key', 13)} Answer key: ${f ? `<span class="mono">${esc(f.file)}</span>` : '<span class="muted">none</span>'}</span>${mng ? `<button type="button" class="btn btn-sm btn-ghost" data-act="chAnsUp" ${DS({ k: key, p: pid })}>${ic('upload', 13)}${f ? 'Replace answer key' : 'Upload answer key'}</button>${f ? `<button type="button" class="btn btn-sm btn-ghost" data-act="s3KeyRemove" ${DS({ k: key, p: pid })}>Remove</button>` : ''}` : sel === cbCurDv(pr) && !pr.chNew && pr.status !== 'Draft' ? '<span class="xs muted">Answer keys are managed on the published version (not versioned — under review before CB5)</span>' : ''}</div>`;
  };
  const loBlock = (u, m, lo, ui_, mi, li) => {
    const lbl = `${u.code} ${m.code} ${lo.code}`, info = lo.type ? cbCurTypeInfo(lo.type) : null, ev = !wiz && sel === pr.version && s3LoEvidence(pid, lo).n;
    const flags = [lo.type ? '' : chip('Type required', 'red'), s3Other(lo.type) ? chip('Not supported yet — blocks publishing', 'red') : '', obsNo && critKind(lo.type) === 'Observation' ? chip('Observation — no observations in this course', 'amber') : '', ev ? `<span class="chip t-blue" title="Has evidence — can be retired, never deleted">${ic('lock', 11)} Evidence</span>` : ''].join('');
    return `<div class="cb-cur-lo" data-lo="${esc(lo.code)}"><div class="cb-cur-loh"><div class="cb-cur-t"><span class="code">${esc(lo.code)}</span> <strong>${esc(lo.title)}</strong>${s3StatusChip(lo)} ${flags}</div>
      <div class="cb-acts">${ed ? typeSel(u, m, lo, ui_, mi, li) : `<span class="xs muted">Assessment type</span> ${lo.type ? critType(lo.type) : chip('No type', 'red')}`}${lo.type ? `<button class="btn btn-sm btn-ghost" data-act="cbCurType" data-t="${esc(lo.type)}">View type</button>` : ''}${editBtn(lbl, pathOf(ui_, mi, li), codesOf(u, m, lo))}${addBtn('Criterion', { lvl: 'crit', u: u.code, m: m.code, lo: lo.code }, 'ch8AddCrit', { u: ui_, m: mi, l: li })}${!wiz && ed ? `<button class="btn btn-sm btn-ghost" data-act="loMove" ${DS({ p: pid, u: u.code, m: m.code, lo: lo.code })}>Move</button>` : ''}${stateBtn(lbl, { u: u.code, m: m.code, lo: lo.code }, { u: ui_, m: mi, l: li })}</div></div>
      ${info ? `<p class="xs muted cb-cur-guide">Assessed by: ${esc(info.ev || 'not set')} · ${esc(info.rule)}</p>` : '<p class="xs cb-cur-guide" style="color:var(--red)">Choose an assessment type — required before publishing.</p>'}
      ${lo.crit.length ? `<ul class="cb-cur-crit">${lo.crit.map((c, ci) => { const k = critKind(lo.type), mp = k === 'Knowledge' ? (q[c.code] ? `Mapped to ${plural(q[c.code], 'assignment question')}` : 'Not yet covered by an assignment') : k === 'Observation' && (ia[c.code] || []).length ? `Linked to Academy observation criteria ${ia[c.code].join(', ')}` : '';
        return `<li class="cb-cur-c" data-c="${esc(c.code)}"><div class="cb-cur-t"><span class="code">${esc(c.code)}</span> <span>${esc(c.d)}</span>${s3StatusChip(c)}<div class="xs muted">Evidence requirement: ${esc(c.evReq || c.ev || '—')}${mp ? ` · ${esc(mp)}` : ''}</div></div><div class="cb-acts">${editBtn(lbl + ' ' + c.code, pathOf(ui_, mi, li, ci), codesOf(u, m, lo, c))}${stateBtn(c.code, { u: u.code, m: m.code, lo: lo.code, c: c.code }, { u: ui_, m: mi, l: li, c: ci })}</div></li>`; }).join('')}</ul>` : '<p class="xs muted">No criteria yet.</p>'}</div>`;
  };
  const body = tree.length ? `<div class="tree cb-cur-tree">${tree.map((u, ui_) => `<details class="lvl-1" data-cbu="${esc(u.code)}" data-cbp="${pid}" ${open.includes(u.code) ? 'open' : ''}><summary><span class="caret">${ic('chev', 16)}</span><span class="cb-cur-t"><span class="xs muted">Unit</span> <span class="code">${esc(u.code)}</span> <strong>${esc(u.title)}</strong>${s3StatusChip(u)}<span class="xs muted cb-cur-n"> · ${plural(u.mods.length, 'module')}</span></span><span class="cb-acts">${moveBtns(u.code, pathOf(ui_), codesOf(u), ui_, tree.length)}${editBtn(u.code, pathOf(ui_), codesOf(u))}${addBtn('Module', { lvl: 'mod', u: u.code }, 'ch8AddMod', { u: ui_ })}${stateBtn(u.code, { u: u.code }, { u: ui_ })}</span></summary>
      <div class="kids">${u.mods.map((m, mi) => `<details open class="cb-cur-m"><summary><span class="caret">${ic('chev', 16)}</span><span class="cb-cur-t"><span class="xs muted">Module</span> <span class="code">${esc(m.code)}</span> <strong>${esc(m.title)}</strong>${m.ab ? ` <span class="mono xs muted">(${esc(m.ab)})</span>` : ''}${s3StatusChip(m)}${(wiz ? m.key : s3KeyCur(pid, u.code + ' ' + m.code)) ? ' ' + chip('Answer key', 'blue') : ''}</span><span class="cb-acts">${moveBtns(u.code + ' ' + m.code, pathOf(ui_, mi), codesOf(u, m), mi, u.mods.length)}${editBtn(u.code + ' ' + m.code, pathOf(ui_, mi), codesOf(u, m))}${addBtn('Learning Outcome', { lvl: 'lo', u: u.code, m: m.code }, 'ch8AddLo', { u: ui_, m: mi })}${stateBtn(u.code + ' ' + m.code, { u: u.code, m: m.code }, { u: ui_, m: mi })}</span></summary>
        <div class="kids">${modRow(u, m, ui_, mi)}${m.los.map((lo, li) => loBlock(u, m, lo, ui_, mi, li)).join('') || '<p class="xs muted">No Learning Outcomes yet.</p>'}</div></details>`).join('') || '<p class="xs muted cb-cur-none">No modules yet.</p>'}</div></details>`).join('')}</div>`
    : `<div class="empty cb-cur-empty"><p class="small"><strong>No units yet.</strong> ${ed ? 'Add the first unit, then its modules, Learning Outcomes and assessment criteria.' : sel === pr.version && pr.status !== 'Draft' ? `No curriculum is recorded for Version ${sel}. Nothing from another programme is shown in its place.` : 'A programme administrator adds the units.'}</p>${ed ? `<button class="btn btn-sm btn-primary" ${wiz ? `data-act="ch8AddUnit" data-id="${pid}"` : `data-act="nodeAdd" data-p="${pid}" data-lvl="unit"`}>${ic('plus', 14)}Add the first unit</button>` : ''}</div>`;
  const hist = a => a.module === 'NVQ Programmes' && !/^Blocked/.test(a.action) && (String(a.entity || '').includes('(' + pid + ')') || String(a.entity || '').startsWith(pid + ' · ')) && /Node|Unit|Module|module|Learning Outcome|Learning outcome|Criterion|criterion|reordered|type|Answer key|awarding-body/.test(a.action);
  const nh = ADMIN.audit.filter(hist).length;
  return `<section class="card cb-cur" data-p="${pid}">${head}${cbCurBanner(pr, sel, mode)}${vbar}${obsWarn}${sum}${tools}${body}${miss}
    <p class="xs muted">Observation criteria are assessed only by observation, never through assignments. Criteria for observation events come from Learning Outcomes with the Observation type (Section 4 — Observations).</p></section>
    <details class="cb-cur-hist"><summary>${ic('clock', 14)} Curriculum change history (${nh})</summary>${auditPanel(hist, 'Curriculum change history')}</details>`;
}
// Assessment types panel: how this programme uses the shared types, then the shared list (unchanged)
function cbCurTypesUse(pr) {
  const sel = cbCurDv(pr) || pr.version, t = cbTree(pr, sel) || [], n = {}, obsNo = cbCurObsNo(pr);
  t.filter(u => u.status !== 'Retired').forEach(u => u.mods.filter(m => m.status !== 'Retired').forEach(m => m.los.filter(l => l.status !== 'Retired').forEach(l => { const k = l.type || ''; n[k] = (n[k] || 0) + 1; })));
  return `<section class="card cb-cur-types"><h2>Assessment types in this programme</h2><p class="small muted">Version ${sel}${sel === cbCurDv(pr) ? ' (draft)' : ''}. Each Learning Outcome uses one type; its criteria inherit it.${obsNo ? ' Course Details says this course has no observations, so the Observation type isn\'t offered for new Learning Outcomes.' : ''}</p>
    ${Object.keys(n).length ? `<ul class="list">${Object.entries(n).map(([k, c]) => { const i = k ? cbCurTypeInfo(k) : null; return `<li class="li"><div class="li-b"><strong>${k ? esc(critTypeLabel(k)) : 'No type yet'}</strong><span class="small muted">${plural(c, 'Learning Outcome')}${i ? ' · ' + esc(i.ev || 'evidence not set') + ' · ' + esc(i.rule) : ' · required before publishing'}</span></div>${k ? `<button class="btn btn-sm btn-ghost" data-act="cbCurType" data-t="${esc(k)}">View type</button>` : chip('Type required', 'red')}</li>`; }).join('')}</ul>` : '<p class="small">No Learning Outcomes yet.</p>'}</section>`;
}

/* ---------- Records ---------- */
UXC.push(['CB4', 'Curriculum — one editor for every programme (21 Oct 2026)', [
  'Section 2 → Structure is one curriculum editor for seeded programmes (Level 2–5, drafts, retired) and programmes made with "New NVQ programme": an expandable Unit → Module → Learning Outcome → Assessment Criterion hierarchy with the counts, each Learning Outcome\'s assessment type (with "View type"), what assesses it, each criterion\'s evidence requirement and whether it is mapped to assignment questions or linked to Academy observation criteria, module awarding-body codes and answer keys.',
  'Add unit, Add module, Add Learning Outcome, Add criterion, Edit (title; module awarding-body code for new programmes; criterion descriptor and evidence requirement), reorder units and modules, the assessment-type list, and — as before — suspend / retire and Move (seeded) or Remove while a Draft (new programmes). Every Add and Edit dialog shows the unit / module / Learning Outcome it goes into and the version it is saved to. Codes never change.',
  'Versions: a Draft programme is edited directly; a published programme shows its published version read-only until "Create new version", then the draft is edited while learners stay on the published version (both can be viewed); earlier versions whose structure is stored can be viewed; others say they weren\'t stored. Retired programmes are read-only. Suspended programmes keep their existing rule. A curriculum change history is listed under the editor.',
  'When Course Details says the course has no observations, the Observation type is not offered for new Learning Outcomes and choosing it is refused (logged); existing Observation Learning Outcomes are kept and flagged. With observations, Observation Learning Outcomes can be added and their criteria are the ones observation events use (Section 4).',
  'Security: the assessment-type list of new programmes, the module awarding-body code and the answer-key upload now check the role in the action (they accepted any role); answer keys, module codes and Learning Outcome moves no longer fall back to Level 3 when no programme is given; a programme without a stored tree shows "No curriculum is recorded" instead of Level 3\'s (refused and logged where it is a change).',
  'Correction: a learner\'s programme is found by its programme ID, or by a title that matches exactly one programme; otherwise it is unresolved and the learner sees "Your programme record needs to be linked" — never Level 3\'s letter, terms, answer keys or resources. Awarding-body code corrections (CH-15) change only the version being edited (a Draft, or a draft version); published versions and learners\' records keep their code, and a correction on a published version is refused and logged.']]);
const _aIdxCB4 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB4(p) + `<section class="card idx-sec"><h2>CB4 — Curriculum</h2><ul class="idx-list">${[
  chIdxLi('Level 3 Diploma — Curriculum (published, read-only)', { act: 'aJump', t: 'a-programmes.NV-L3.structure' }, 'CB4 — the published version; Create new version to edit.'),
  chIdxLi('Level 3 2027 update (Draft) — Curriculum', { act: 'aJump', t: 'a-programmes.NV-L3D.structure' }, 'CB4 — a seeded Draft, edited directly.'),
  chIdxLi('New programme NV-N1 (Draft) — Curriculum', { act: 'aJump', t: 'a-programmes.NV-N1.structure' }, 'CB4 — a programme made with "New NVQ programme".'),
  chIdxLi('Level 2 Certificate NV-N2 (published) — Curriculum', { act: 'aJump', t: 'a-programmes.NV-N2.structure' }, 'CB4 — published new programme; draft version after "Create new version".')].join('')}</ul></section>`;
