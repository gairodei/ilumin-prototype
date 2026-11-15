/* ============================================================
   Client Feedback 2.0 — C1 Assignment display mode (15 Nov 2026; PD-CF2-C* in PROVISIONAL-DECISIONS.md). Loads after cf2-fixes.js.
   A programme-level setting at the top of the programme's Assessments step:
   - Questions + Criteria (default): the existing learner presentation — each question with the criteria mapped to it.
   - Criteria as Questions: each assessment criterion the assignment assesses (its mapped criteria, within its unit / module /
     programme scope — the programme version's own criteria, never synthetic) becomes an individually answerable item, with a stable
     link to its criterion (q.crit / q.crits / q.cq.code). The authored questions are unchanged and shown as guidance under the
     criterion they map to.
   Version safety: the mode is frozen onto an assignment definition when it is published (d.dispMode) and onto every learner copy
   issued from it (a.dispMode). Definitions published before this existed are frozen as Questions + Criteria. Changing the programme
   setting affects only assignments published afterwards: no submitted answer, round, mapping or copy is changed or remapped.
   Answer boxes, evidence uploads, References, drafts, submission history, resubmission rounds, Coordinator feedback and the
   Assessor's marking and final Pass / Fail all work on the copy's items exactly as before (they read a.qs and qCrits).
   ============================================================ */
'use strict';

const CF2_DISP = { qc: 'Questions + Criteria', cq: 'Criteria as Questions' };
const cf2DispRec = pid => (CF2().asgDisp[pid] = CF2().asgDisp[pid] || { mode: 'qc', hist: [] });
const cf2DispOf = pid => cf2DispRec(pid).mode === 'cq' ? 'cq' : 'qc';
// The mode a definition shows learners: frozen at publication; a definition published before CF2 is Questions + Criteria
const cf2DefMode = d => (d && d.dispMode) || (d && d.status === 'Draft' ? cf2DispOf(cbAsgPid(d)) : 'qc');
function cf2FreezeDef(d, why) { if (!d || d.dispMode) return; d.dispMode = d.status === 'Draft' ? cf2DispOf(cbAsgPid(d)) : 'qc'; d.dispModeAt = now().toISOString(); d.dispModeWhy = why || ''; }

/* ---------- The setting: top of the programme's Assessments step ---------- */
function cf2DispCard(pr) {
  const r = cf2DispRec(pr.id), m = cf2DispOf(pr.id), can = cbAsgCan() && !cbRetired(pr) && !(typeof cbrArch === 'function' && cbrArch(pr));
  const pubs = cbAsgOf(pr).filter(d => d.status !== 'Draft');
  const opt = (k, d) => `<label class="check cf2-dm"><input type="radio" name="cf2-dm" value="${k}" ${m === k ? 'checked' : ''} ${can ? '' : 'disabled'}><span><strong>${CF2_DISP[k]}</strong>${k === 'qc' ? ' <span class="xs muted">(default)</span>' : ''}<span class="hint" style="display:block">${d}</span></span></label>`;
  return `<section class="card cf2-disp" data-mode="${m}"><div class="row-b"><h2>Assignment display mode</h2>${chip(CF2_DISP[m], m === 'cq' ? 'blue' : 'grey')}</div>
    <p class="small muted">How this programme's assignments appear to learners. It applies to assignments published from now on; each published assignment keeps the mode it was published with, so learners' submitted work is never changed.</p>
    <fieldset class="stack" style="border:0;padding:0"><legend class="sr">Assignment display mode</legend>${opt('qc', 'Learners answer the questions; each question shows the criteria it is mapped to (the existing presentation).')}${opt('cq', 'Each assessment criterion the assignment assesses becomes its own answer box (module-based: the module\'s criteria; unit-based: the unit\'s). The questions are shown as guidance under the criterion they map to.')}</fieldset>
    ${can ? `<div class="row"><button class="btn btn-sm btn-primary" data-act="cf2DispSave" data-p="${pr.id}">Save display mode</button></div>` : ''}
    ${pubs.length ? `<p class="xs muted cf2-dispfix">Published: ${pubs.map(d => `${esc(d.title.split(' —')[0])} — ${CF2_DISP[cf2DefMode(d)]}`).join(' · ')}</p>` : ''}
    ${r.hist.length ? `<details class="xs"><summary>Change history (${r.hist.length})</summary><ul class="list small">${r.hist.map(h => `<li class="li">${fdt(h[0])} · ${esc(h[1])} · ${esc(CF2_DISP[h[2]])} → ${esc(CF2_DISP[h[3]])}${h[4] ? ' — ' + esc(h[4]) : ''}</li>`).join('')}</ul></details>` : ''}</section>`;
}
ACT.cf2DispSave = el => {
  const pr = cbPr(el && el.dataset && el.dataset.p), v = ($('input[name="cf2-dm"]:checked') || {}).value;
  if (!pr) { toast('Programme not found.', 'err'); return false; }
  if (!cbAsgCan() || cbRetired(pr)) { logA('NVQ Programmes', `${pr.title} (${pr.id})`, 'Blocked: change assignment display mode', '—', '—', cbRetired(pr) ? 'Programme retired' : 'Role can\'t change assessments'); toast('You can\'t change this programme\'s assignment display mode.', 'err'); return false; }
  if (!CF2_DISP[v]) { toast('Choose a display mode.', 'err'); return false; }
  const r = cf2DispRec(pr.id), was = cf2DispOf(pr.id); if (v === was) { toast('Nothing has changed.', 'info'); return; }
  const pubs = cbAsgOf(pr).filter(d => d.status !== 'Draft');
  reasonDlg({ title: 'Change assignment display mode', ok: 'Save', label: 'Reason (required)', body: `<p class="small">${esc(CF2_DISP[was])} → <strong>${esc(CF2_DISP[v])}</strong>.</p><div class="note b-blue">${ic('layers')}<div class="small">Applies to assignments of ${esc(pr.title)} published from now on.${pubs.length ? ` The ${plural(pubs.length, 'published assignment')} keep${pubs.length === 1 ? 's' : ''} the mode ${pubs.length === 1 ? 'it was' : 'they were'} published with; learners' answers and submissions are unchanged.` : ''}</div></div>`,
    onOk: rs => { pubs.forEach(d => cf2FreezeDef(d, 'Published before the display mode changed')); r.hist.unshift([now().toISOString(), cf2Me(), was, v, rs]); r.mode = v;
      logA('NVQ Programmes', `${pr.title} (${pr.id})`, 'Assignment display mode changed', CF2_DISP[was], CF2_DISP[v], rs); render(); toast(`Saved: ${CF2_DISP[v]} for assignments published from now on.`); } });
};
const _asgBodyCF2 = cbrAsgBody;
cbrAsgBody = function (pr) { const h = _asgBodyCF2.apply(this, arguments); return pr && typeof h === 'string' ? cf2DispCard(pr) + h : h; };
// The CBR-2 layout of the step (the one the builder shows): the same card at the top, and each assessment says what learners see
if (typeof cbr2Asgs === 'function') { const _a2CF2 = cbr2Asgs; cbr2Asgs = function (pr) { const h = _a2CF2.apply(this, arguments); return pr && typeof h === 'string' ? cf2DispCard(pr) + h : h; }; }
if (typeof cbr2Asg === 'function') { const _a1CF2 = cbr2Asg; cbr2Asg = function (pr, d) { const h = _a1CF2.apply(this, arguments); if (typeof h !== 'string' || !d) return h; const m = cf2DefMode(d), k = h.indexOf('</summary>'); const line = `<p class="xs cf2-defmode">Learners see: <strong>${esc(CF2_DISP[m])}</strong>${d.status === 'Draft' ? ' (the programme\'s current mode — fixed when published)' : ' (fixed at publication)'}</p>`; return k >= 0 ? h.slice(0, k + 10) + line + h.slice(k + 10) : h; }; }
// The assessment editor names the mode the assignment shows (frozen once published)
const _asgEdCF2 = cbrAsgEditor;
cbrAsgEditor = function (pr, d) {
  const h = _asgEdCF2.apply(this, arguments); if (typeof h !== 'string' || !d) return h; const m = cf2DefMode(d);
  return h.replace('<dt>Academic scope</dt>', `<dt>Learners see</dt><dd class="cf2-defmode">${esc(CF2_DISP[m])}${d.status === 'Draft' ? ' <span class="xs muted">(the programme\'s current mode — fixed when published)</span>' : ' <span class="xs muted">(fixed at publication)</span>'}</dd><dt>Academic scope</dt>`);
};
// Publishing freezes the mode on the definition (a refused or abandoned publish is undone)
const _pubAsgCF2 = ACT.pubAsg;
ACT.pubAsg = el => {
  const d = s2Def(el && el.dataset && el.dataset.id); if (!d || d.status !== 'Draft' || d.dispMode) return _pubAsgCF2(el);
  d.dispMode = cf2DispOf(cbAsgPid(d)); d.dispModeAt = now().toISOString(); d.dispModeWhy = 'Programme setting at publication';
  const r = _pubAsgCF2(el); if (!MODAL && d.status === 'Draft') { delete d.dispMode; delete d.dispModeAt; delete d.dispModeWhy; } // refused before any dialog
  return r; // a dialog closed without publishing is undone by closeModal below
};
const _closeCF2 = closeModal;
closeModal = function () { const r = _closeCF2.apply(this, arguments); s2Defs().forEach(d => { if (d.status === 'Draft' && d.dispModeWhy === 'Programme setting at publication') { delete d.dispMode; delete d.dispModeAt; delete d.dispModeWhy; } }); return r; };

/* ---------- The learner copy: criteria as the answerable items ---------- */
function cf2CqItems(d) {
  const used = asgCodes(d), crit = s2Crit(d), act = d.qs.filter(q => q.status === 'Active');
  const order = crit.map(c => c.code).filter(c => used.includes(c)).concat(used.filter(c => !crit.some(x => x.code === c)));
  return order.map((code, k) => { const c = crit.find(x => x.code === code) || {};
    return { code, k, d: c.d || code, type: c.typeName || c.type || 'Knowledge', guide: act.filter(q => (q.crit || []).includes(code)).map(q => q.text) }; });
}
const _copyCF2 = s2CopyTo;
s2CopyTo = function (v, d) {
  if (d && !d.dispMode) cf2FreezeDef(d, d.status === 'Draft' ? 'Programme setting at publication' : 'Published before display modes');
  const r = _copyCF2.apply(this, arguments), w = r && STORE.worlds[v], a = w && w.assignments.find(x => x.id === d.id); if (!a) return r;
  a.dispMode = d.dispMode || 'qc'; if (a.dispMode !== 'cq') return r;
  const first = d.qs.find(q => q.status === 'Active') || {}, items = cf2CqItems(d);
  a.qs = items.map(x => ({ id: 'cq' + (x.k + 1), text: x.d, crit: x.code, crits: [x.code], cq: { code: x.code, d: x.d, type: x.type, guide: x.guide.slice() }, attach: first.attach !== false, ...(first.attMax ? { attMax: first.attMax } : {}), ...(first.attTypes ? { attTypes: first.attTypes.slice() } : {}), rounds: [], fb: [], state: 'open' }));
  delete a.mapMode; delete a.acrit; // each item is its own criterion: whole-assessment mapping doesn't apply to a criteria-as-questions copy
  a.crit = items.map(x => [x.code, x.d, x.type]);
  return r;
};
// The answer box heading: the criterion itself (code, statement, type), with the authored questions as guidance
const cf2CqHead = (q, i) => `<div class="q-h cf2-cqh" data-crit="${esc(q.cq.code)}"><span class="q-n cf2-cqn">${esc(q.cq.code)}</span><div class="stack" style="gap:6px"><span class="q-t">${esc(q.cq.d)}</span><div class="row"><span class="xs muted">Assessment criterion ${i + 1}</span>${critType(q.cq.type)}</div>${q.cq.guide.length ? `<p class="xs cf2-cqg"><strong>Guidance:</strong> ${q.cq.guide.map(esc).join(' · ')}</p>` : ''}</div></div>`;
const _qHeadCF2 = qHead;
qHead = function (q, i) { return q && q.cq ? cf2CqHead(q, i) : _qHeadCF2.apply(this, arguments); };
// The learner's assignment page swaps in the client-sheet heading while it renders (clientsheet.js): the same rule there
if (typeof csQHead === 'function') { const _csCF2 = csQHead; csQHead = function (q, i) { return q && q.cq ? cf2CqHead(q, i) : _csCF2.apply(this, arguments); }; }
const _asgScrCF2 = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgScrCF2(p), a = W && W.assignments && W.assignments.find(x => x.id === (p && p.id)); if (!a || a.dispMode !== 'cq' || typeof h !== 'string') return h;
  const note = `<div class="note b-blue cf2-cqnote">${ic('info')}<div class="small"><strong>Answer each assessment criterion.</strong> This assignment shows its ${plural(a.qs.length, 'criterion', 'criteria')} as the questions: write your answer under each one, with your evidence. References are at the end, as usual.</div></div>`;
  const k = h.indexOf('<section class="stack">'); return k >= 0 ? h.slice(0, k) + note + h.slice(k) : h;
};

UXC.push(['CF2-C', 'Client Feedback 2.0 — assignment display mode (15 Nov 2026)', [
  'Programme → Assessments starts with "Assignment display mode": Questions + Criteria (default, the existing presentation) or Criteria as Questions (each criterion the assignment assesses is its own answer box; the questions appear as guidance under their criterion).',
  'The mode is fixed on each assignment when it is published and on every learner copy; changing the programme setting affects only assignments published afterwards. Answers, References, evidence, drafts, rounds, Coordinator feedback and Assessor marking work unchanged.']]);
