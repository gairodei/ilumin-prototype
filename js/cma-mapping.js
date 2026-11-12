/* CMA — assessment criterion mapping: per question or for the whole assessment (7 Nov 2026).
   Per question (the default, unchanged): each question maps to one or more criteria (q.crit); one criterion may be mapped by
   several questions. Whole assessment: d.mapMode = 'assessment' and d.acrit = the criteria (one or more) — no question carries
   them, so no question-level judgement is implied. Both are limited to the knowledge criteria of the assessment's scope in its
   programme version (module → that module, unit → that unit, full course → the programme); duplicate codes stay unmappable.
   The mode is chosen on a Draft that no learner has submitted; a change that would remove mappings lists them and asks first
   (nothing is converted). Published copies carry mapMode / acrit; the Assessor judges each whole-assessment criterion once
   (draft item "__asg", R3 judgement records with qid "__asg"); release applies only those judgements to the learner's criteria.
   The final Pass / Fail stays the Assessor's separate declaration (R3) — nothing here infers it.
   Follow-up (PD-CMA-08…12): the Coordinator gives draft / published criterion feedback per whole-assessment criterion (R3 panel, items
   "__asg_<n>"); an answer "Added to PD" carries the open whole-assessment criteria into the PD checklist; a mapping is fixed once any
   learner has submitted (both modes); duplicate codes are checked across the whole programme version (cbr-builder.js). */
const CMA_Q = '__asg';
const CMA_MODE = { question: 'Per question', assessment: 'Whole assessment' };
const cmaOrder = (pr, d, l) => { const o = cbrKnow(pr, d).map(x => x.c.code); return l.slice().sort((a, b) => (o.indexOf(a) < 0 ? 1e9 : o.indexOf(a)) - (o.indexOf(b) < 0 ? 1e9 : o.indexOf(b))); };

/* ---------- Builder: the mode, and the whole-assessment criteria ---------- */
INP.cmaMode = el => {
  const d = s2Def(el.dataset.id), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change how an assessment is mapped'); if (!d || !pr) { render(); return; }
  const to = el.value, was = asgWhole(d) ? 'assessment' : 'question'; if (to === was || !CMA_MODE[to]) { render(); return; }
  if (d.status !== 'Draft' || s2HasSubs(d)) { s2Log(d, 'Blocked: change the mapping mode', CMA_MODE[was], CMA_MODE[to], d.status !== 'Draft' ? `${d.status} — fixed with its version` : 'Learners have submitted'); toast('Only a Draft assessment that no learner has submitted can change how it is mapped.', 'err'); render(); return; }
  const n = aafaQNums(d), act = d.qs.filter(q => q.status === 'Active');
  const lost = to === 'assessment' ? act.filter(q => q.crit.length).map(q => `${n[q.id]}: ${q.crit.join(', ')}`) : (d.acrit || []).length ? [`Whole assessment: ${d.acrit.join(', ')}`] : [];
  const apply = () => {
    if (to === 'assessment') { act.forEach(q => { q.crit = []; }); d.mapMode = 'assessment'; d.acrit = []; } else { delete d.mapMode; delete d.acrit; }
    s2Log(d, 'Criterion mapping mode changed', CMA_MODE[was], CMA_MODE[to], lost.length ? `Mappings removed: ${lost.join('; ')}` : ''); render();
    toast(to === 'assessment' ? 'Now mapped as a whole assessment — choose its criteria.' : 'Now mapped per question — map each question.');
  };
  if (!lost.length) { apply(); return; }
  render(); // the radio stays on the current mode until the change is confirmed
  openModal({ title: 'Change how this assessment is mapped?', sub: esc(d.title), body: `<div class="note b-amber">${ic('alert')}<div class="small"><strong>${CMA_MODE[was]} → ${CMA_MODE[to]}.</strong> These mappings will be removed:<ul class="cma-lost">${lost.map(x => `<li>${esc(x)}</li>`).join('')}</ul>Nothing is converted automatically: choose the ${to === 'assessment' ? 'whole-assessment criteria' : 'criteria of each question'} afterwards. The removed mappings are kept in the assessment's history.</div></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Change mapping', cls: 'btn-primary', fn: () => { if (!cbrAsgGate(pr, 'change how an assessment is mapped') || d.status !== 'Draft' || s2HasSubs(d)) { closeModal(); render(); return false; } closeModal(); apply(); } }] });
};
INP.cmaACrit = el => {
  const d = s2Def(el.dataset.id), pr = d && cbrAsgGate(cbPr(cbAsgPid(d)), 'change a criteria mapping'); if (!d || !pr) { render(); return; }
  const c = el.dataset.c, on = el.checked, no = (why, msg) => { s2Log(d, 'Blocked: ' + why, '—', c, cbrScopeTxt(pr, d)); toast(msg, 'err'); render(); };
  if (!asgWhole(d)) return no('map the whole assessment (mapped per question)', 'This assessment is mapped per question — switch it to whole-assessment mapping first.');
  if (d.status !== 'Draft') return no('change whole-assessment criteria (published)', 'A published assessment\'s whole-assessment criteria are fixed with its version.');
  if (on && !cbrKnow(pr, d).some(x => x.c.code === c)) return no('map a criterion outside the assessment scope', `${c} isn't a knowledge criterion of this assessment's scope (${cbrScopeTxt(pr, d)}).`);
  if (on && cbrAmbig(pr, cbrAsgV(pr, d)).has(c)) return no('map an ambiguous criterion code', `${c} is used by more than one criterion in this programme version (${cbrDupWhere(pr, cbrAsgV(pr, d), c)}), so it can't be mapped until the curriculum is corrected in a Draft version.`);
  const was = d.acrit || []; if (on === was.includes(c)) { render(); return; }
  d.acrit = cmaOrder(pr, d, on ? was.concat(c) : was.filter(x => x !== c));
  s2Log(d, 'Whole-assessment mapping changed', on ? '—' : c, on ? c : 'removed', ''); render();
};
// CMA follow-up: once a learner has submitted, an assessment's mapping is fixed with it — per question too (it was a reason dialog that
// changed the unsubmitted copies). Checked in the action from the record, not from the control, so a direct call is refused (logged).
const CMA_SUBS_MSG = d => 'Learners have submitted against this mapping, so it is fixed with their evidence. ' + asgFixedMsg(d);
const _mapCMA = INP.mapChange;
INP.mapChange = function (el) {
  const d = el && el.dataset && s2Def(el.dataset.id);
  if (d && s2HasSubs(d)) { const on = !!el.checked; el.checked = !on; s2Log(d, 'Blocked: change a mapping after submissions', `${el.dataset.q || '—'}: ${el.dataset.c || '—'}`, on ? 'add' : 'remove', 'Learners have submitted — a new assessment or programme version is needed'); toast(CMA_SUBS_MSG(d), 'err'); render(); return; }
  return _mapCMA.apply(this, arguments);
};

/* ---------- Learner, Coordinator and IQA question headings: a question of a whole-assessment copy has no criterion of its own ---------- */
const cmaBare = q => !!q && !q.crit && !qCrits(q).length;
const _qHeadCMA = qHead;
qHead = function (q, i) { if (!cmaBare(q)) return _qHeadCMA.apply(this, arguments); return `<div class="q-h"><span class="q-n">Q${i + 1}</span><div class="stack" style="gap:6px"><span class="q-t">${esc(q.text)}</span><span class="xs muted cma-qh">Assessed with the whole assignment</span></div></div>`; };
const _csQHeadCMA = csQHead;
csQHead = function (q, i) { if (!cmaBare(q)) return _csQHeadCMA.apply(this, arguments); return `<div class="q-h"><span class="q-n">Q${i + 1}</span><div class="stack" style="gap:6px"><span class="q-t">${esc(q.text)}</span><span class="xs muted cma-qh">Assessed with the whole assignment — see the criteria this assignment covers.</span></div></div>`; };
const cmaCritRow = (v, code) => withW(v || 'C', () => allCrit()).find(x => x.code === code) || {};

/* ---------- A whole-assessment criterion as a criterion item (id "__asg_<n>"): the existing Coordinator draft / publish and the
   Assessor's override work on it unchanged, recorded with qid "__asg" (never a question) ---------- */
const cmaVid = n => CMA_Q + '_' + n;
const _aqCMA = aqById;
aqById = function (a, id) {
  const m = /^__asg_(\d+)$/.exec(String(id || '')); if (!m) return _aqCMA.apply(this, arguments);
  const c = a && a.mapMode === 'assessment' ? (a.acrit || [])[+m[1]] : null;
  return c ? { id: String(id), baseId: CMA_Q, crit: c, crits: [c], text: 'Whole assessment', rounds: [], fb: [], state: 'open' } : null;
};

/* ---------- Assessor marking: one judgement per whole-assessment criterion ---------- */
function cmaWhy(el) {
  const k = el.dataset.k, c = el.dataset.c, w = r3MarkWhy(k); if (w) return { deny: w };
  const s = r3StaffSub(k), a = s && tasAsg(s); if (!a || a.mapMode !== 'assessment' || !(a.acrit || []).includes(c)) return { msg: 'That criterion isn\'t mapped to this assessment.' };
  if (s.L.status === 'Discontinued' || !s.toMark) return { msg: 'This submission is read-only.' };
  if (critLock(s, c)) return { msg: `${c} is already achieved and verified — corrections only via Data Correction.` };
  return { s, a };
}
const cmaGate = (el, what) => { const g = cmaWhy(el); if (g.deny) { r3Deny(String(el.dataset.k || '—'), what, g.deny, tasLog); return null; } if (g.msg) { toast(g.msg, 'err'); return null; } return g; };
ACT.cmaMet = el => {
  const g = cmaGate(el, 'record a criterion judgement'), v = el.dataset.v; if (!g) return false; if (!R3_VALS.includes(v)) return toast('Choose Met, Partially Met or Not Met.', 'err'), false;
  const x = itmC(el.dataset.k, CMA_Q, el.dataset.c); x.met = v; if (v !== 'Met') x.verified = false;
  r3Add(el.dataset.k, { aid: g.a.id, title: g.a.title, qid: CMA_Q, crit: el.dataset.c, value: v, by: TME().name, role: 'Assessor', round: g.a.round || 'Sub 1', published: false });
  mkSaved(dft(el.dataset.k)); render();
};
INP.cmaNote = el => { const g = cmaGate(el, 'change marking'); if (!g) return false; itmC(el.dataset.k, CMA_Q, el.dataset.c).note = el.value; mkSaved(dft(el.dataset.k)); };
ACT.cmaVerify = el => {
  const g = cmaGate(el, 'verify a criterion'); if (!g) return false; if (itmC(el.dataset.k, CMA_Q, el.dataset.c).met !== 'Met') return toast('Only a Met judgement can be verified.', 'err'), false;
  openModal({ title: `Verify ${esc(el.dataset.c)}?`, body: `<div class="note b-amber">${ic('lock')}<div><strong>Verification locks this decision.</strong> Later changes require a Data Correction Request.</div></div><p class="small">Your name and the time will be stamped on the criterion.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Verify and lock', cls: 'btn-primary', fn: () => { if (!cmaGate(el, 'verify a criterion')) return false; const x = itmC(el.dataset.k, CMA_Q, el.dataset.c); x.verified = true; x.vby = TME().name; x.vat = now().toISOString(); mkSaved(dft(el.dataset.k)); render(); toast('Criterion verified — locked on release.'); } }] });
};
function cmaMarkCard(s, a) {
  const d = dft(s.key), cj = (d.items[CMA_Q] || {}).cj || {}, ro = s.L.status === 'Discontinued' || !s.toMark || !!r3MarkWhy(s.key), dis = ro ? 'disabled' : '';
  return `<section class="card cma-mk"><h2>Whole-assessment criteria</h2><p class="xs muted">This assignment is mapped as a whole: judge each criterion once, against the whole submission. Each answer keeps its own feedback and exit above; neither decides the final Pass / Fail.</p>
    ${(a.acrit || []).map((c, n) => { const x = cj[c] || {}, lock = critLock(s, c), co = cmaCritRow(s.L.v, c), ac = (a.crit || []).find(z => z[0] === c) || [c, '', ''];
      const j = r3Latest(s.key, c, 'Academic Coordinator', true), ov = j && typeof dOvOf === 'function' ? dOvOf(s.key, j.id).slice(-1)[0] : null; // the Coordinator's published judgement: shown, never applied for the Assessor
      return `<div class="cma-c" data-crit="${esc(c)}"><h3><span class="code">${esc(c)}</span> <span class="small">${esc(co.d || ac[1])}</span></h3>${co.evReq || co.ev ? `<p class="xs muted">Evidence requirement: ${esc(co.evReq || co.ev)}.</p>` : ''}
        ${j ? `<div class="r3-pub r3-cooj"><span class="xs strong">Coordinator's published judgement</span>${r3PubRow(j)}</div>${ov ? `<p class="xs d-ov-note">${ic('edit', 12)} Overridden by ${esc(ov.by)} (Assessor) on ${fdt(ov.at)}: ${chip(ov.value, r3Tone(ov.value))}${ov.published ? '' : ' · not yet released to the learner'}</p>` : ''}${!ro && !lock && ACT.dOverride ? `<button class="btn btn-sm d-ov-btn" data-act="dOverride" data-k="${s.key}" data-q="${cmaVid(n)}">${ov ? 'Override again…' : 'Override the Coordinator\'s judgement…'}</button>` : ''}` : ''}
        ${lock ? `<div class="note b-green">${ic('lock')}<div class="small"><strong>Achieved — verified by ${esc(lock.by)} on ${fdt(lock.at)}.</strong> Locked; corrections only via Data Correction.</div></div>` : `<div class="met-pick" role="group" aria-label="Met, Partially Met or Not Met for ${esc(c)} (whole assessment)">${R3_VALS.map(v => `<button aria-pressed="${x.met === v}" data-act="cmaMet" data-k="${s.key}" data-c="${esc(c)}" data-v="${v}" ${dis}>${v}</button>`).join('')}</div>
        <div class="field"><label for="cma-note-${n}">Note on ${esc(c)}</label><input class="input" id="cma-note-${n}" value="${esc(x.note || '')}" data-oninput="cmaNote" data-k="${s.key}" data-c="${esc(c)}" ${dis}></div>
        ${x.met === 'Met' && CAN('verify') !== 'no' ? (x.verified ? `<p class="small" style="color:var(--green)">${ic('lock', 13)} Verified by ${esc(x.vby)} on ${fdt(x.vat)}</p>` : `<button class="btn btn-sm" data-act="cmaVerify" data-k="${s.key}" data-c="${esc(c)}" ${dis}>${ic('lock', 14)}Verify — I confirm this evidence satisfies ${esc(c)}</button>`) : ''}`}</div>`; }).join('')}</section>`;
}
const _tMarkCMA = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  let h = _tMarkCMA(p); if (typeof h !== 'string') return h;
  const s = typeof tasSubs === 'function' ? tasSubs(true).find(x => x.key === (p && p.id)) : null, a = s && tasAsg(s); if (!a || a.mapMode !== 'assessment') return h;
  h = h.replace(/<h3>Criterion decision<\/h3>[\s\S]*?(?=<h3>Feedback beside the answer<\/h3>)/, `<p class="small cma-qn">${ic('info', 13)} This assignment is mapped as a whole: its criteria are judged once, under "Whole-assessment criteria" below. Give this answer its feedback and exit.</p>`)
    .replace(/<div class="card flat"><p class="small"><strong>Learning Outcome[\s\S]*?(?=<div class="quiz-nav")/, `<div class="card flat cma-crits"><p class="small"><strong>Mapped as a whole assessment</strong></p><ul class="list xs">${(a.acrit || []).map(c => `<li><span class="code">${esc(c)}</span> ${esc(cmaCritRow(s.L.v, c).d || '')}</li>`).join('')}</ul></div>`)
    .replace(/<td class="small"><span class="code"><\/span> —<\/td>/g, '<td class="small muted">Whole assessment</td>')
    .replace('Learner will NOT rework this item; it joins the PD Consolidation Checklist.', 'Learner will NOT rework this item. This assignment is mapped as a whole: choose which of its criteria go to the PD under "Whole-assessment criteria" below (PDS).');
  const k = h.indexOf('<section class="card"><h2>Overall</h2>'); return k < 0 ? h + cmaMarkCard(s, a) : h.slice(0, k) + cmaMarkCard(s, a) + h.slice(k);
};
// Before sending: a whole-assessment criterion without a judgement, or Met but not verified, is pointed out (never decided for the Assessor)
const _consCMA = consistency;
consistency = function (a, d, s) {
  const w = _consCMA.apply(this, arguments); if (!a || a.mapMode !== 'assessment' || !d) return w;
  const cj = (d.items[CMA_Q] || {}).cj || {}; (a.acrit || []).forEach(c => { if (s && critLock(s, c)) return; const y = cj[c] || {}; if (!y.met) w.push(`Whole assessment: criterion ${c} has no judgement yet`); else if (y.met === 'Met' && !y.verified) w.push(`Whole assessment: criterion ${c} is Met but not verified`); });
  return w;
};
// Release: the whole-assessment judgements reach the learner's criteria (and stay on the copy for the Coordinator and IQA)
const _relCMA = releaseFeedback;
releaseFeedback = function (s, a, d) {
  const whole = !!(a && a.mapMode === 'assessment' && d && d.items), cj = whole ? JSON.parse(JSON.stringify((d.items[CMA_Q] || {}).cj || {})) : null, round = a && (a.round || 'Sub 1');
  const pdq = whole ? markable(a).filter(q => (d.items[q.id] || {}).exit === 'pd').map(q => ({ n: a.qs.indexOf(q) + 1, why: d.items[q.id].pdReason || '' })) : [], sel = whole ? ((d.items[CMA_Q] || {}).pdCrit || []).slice() : [];
  const r = _relCMA.apply(this, arguments); if (!cj) return r;
  cmaApply(s, a, cj, round); if (pdq.length) cmaToPd(s, a, pdq, sel);
  render(); return r;
};
// The Assessor's whole-assessment judgements reach the learner's criteria (and stay on the copy for the Coordinator and IQA)
function cmaApply(s, a, cj, round) {
  const me = TME().name, at = STORE.tas.marked[s.key] || now().toISOString(), tag = a.title.split(' —')[0], w = s.live && STORE.worlds[s.L.v];
  a.acj = a.acj || {};
  (a.acrit || []).forEach(code => { const y = cj[code] || {}; if (!y.met) return;
    a.acj[code] = { met: y.met, note: y.note || '', verified: !!y.verified, vby: y.vby, vat: y.vat, by: me, at, round };
    if (w) w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (c.code !== code || c.lock) return; if (y.met === 'Met' && y.verified) { c.st = 'Achieved'; c.date = at; c.lock = { by: me, at: y.vat || at }; c.src = `${tag} · whole assessment`; } else if (y.met === 'Not Met') c.st = 'Action Required'; else c.st = 'In Progress'; }))));
    else if (y.met === 'Met' && y.verified) STORE.tas.locks[s.L.lid + '|' + code] = { by: me, at: y.vat || at };
  });
}
/* Professional Discussion: an answer of a whole-assessment copy "Added to PD" carries the assessment's criteria (d.acrit), since no
   question has its own. Only the criteria the Assessor chose go (PDS: never one achieved, or verified Met in this marking), each once:
   an Open item for the same criterion and assignment isn't added again. The item records the questions and the Assessor's reasons;
   allocation, session, evidence and outcome rules are the existing PD workflow's. Earlier PD items are never changed. */
function cmaToPd(s, a, pdq, sel) { // PDS: the criteria the Assessor chose (checked eligible before release)
  const me = TME().name, at = STORE.tas.marked[s.key] || now().toISOString(), tag = a.title.split(' —')[0], go = 'assignment.' + a.id;
  const from = `${tag} · whole assessment (${pdq.map(x => 'Q' + x.n).join(', ')})`, why = Array.from(new Set(pdq.map(x => x.why).filter(Boolean))).join(' '), codes = (a.acrit || []).filter(c => (sel || []).includes(c) && !critLock(s, c)), added = [];
  if (s.live) {
    const w = STORE.worlds[s.L.v]; if (!w || !w.pd) return;
    codes.forEach(code => { if (w.pd.items.some(i => i.ref === code && i.go === go && i.status === 'Open')) return;
      w.pd.items.unshift({ ref: code, unit: 'U' + code.split(' ')[0], from, reason: why, status: 'Open', go, by: me, at, aid: a.id, whole: true, pv: w.nvq ? w.nvq.progVersion || null : null }); added.push(code);
      w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (c.code === code && !c.lock) c.st = 'Added to PD'; })))); });
  } else {
    let t = STORE.tas.pd.find(x => x.lid === s.L.lid); if (!t) { t = { lid: s.L.lid, name: s.L.name, items: [], session: null, history: [] }; STORE.tas.pd.push(t); }
    t.meta = t.meta || {}; t.items = t.items.filter(i => i[0]); delete t.meta['']; delete t.meta.undefined; // a whole-assessment question has no criterion of its own (CO-1 would add a blank row)
    codes.forEach(code => { if (t.items.some(i => i[0] === code && i[3] === 'Open')) return; t.items.push([code, from, why, 'Open']); t.meta[code] = { by: me, at, aid: a.id, whole: true }; added.push(code); });
  }
  tasLog('PD', `${s.L.name} · ${a.title}`, 'Whole-assessment criteria added to PD', '—', added.join(', ') || 'none (already open or achieved)', why);
}
// The PD panel (Coordinator review, Assessor marking): the whole-assessment criteria carried into PD for this assignment
const _pdRowsCMA = co1PdRows;
co1PdRows = function (L, a, key) {
  const out = _pdRowsCMA.apply(this, arguments); if (!a || a.mapMode !== 'assessment') return out;
  const rows = out.filter(x => x.crit), go = 'assignment.' + a.id, ac = a.acrit || [];
  if (L.v && STORE.worlds[L.v]) { const w = STORE.worlds[L.v], ss = w.pd && w.pd.session; if (!w.pd) return rows;
    (w.pd.items || []).filter(i => i.go === go && ac.includes(i.ref) && !rows.some(x => x.crit === i.ref)).forEach(it => rows.push({ q: '', crit: it.ref, from: it.from, reason: it.reason || '', by: co1PdItemBy(w, it) || it.by || '', at: it.at, status: it.status, outcome: it.outcome, session: ss, who: co1PdWho(L.lid, ss, L.batch) }));
    return rows; }
  const t = STORE.tas.pd.find(x => x.lid === L.lid); if (!t) return rows;
  t.items.filter(i => ac.includes(i[0]) && ((t.meta || {})[i[0]] || {}).aid === a.id).forEach(i => { const m = t.meta[i[0]]; rows.push({ q: '', crit: i[0], from: i[1], reason: i[2], by: m.by, at: m.at, status: i[3], outcome: t.outcomes && t.outcomes[i[0]], session: t.session, who: co1PdWho(L.lid, t.session, L.batch), signOff: t.signOff }); });
  return rows;
};
// The learner's assignment page: the whole-assessment criteria carried into their Professional Discussion
const _asgCMA = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgCMA(p); if (typeof h !== 'string' || S.portal !== 'learner' || !W || !W.pd || !W.assignments) return h;
  const a = W.assignments.find(x => x.id === (p && p.id)); if (!a || a.mapMode !== 'assessment') return h;
  const its = (W.pd.items || []).filter(i => i.go === 'assignment.' + a.id && (a.acrit || []).includes(i.ref)); if (!its.length) return h;
  const card = `<section class="card cma-pd-l" aria-labelledby="cma-pdl-h"><h2 id="cma-pdl-h">Professional Discussion — criteria of this assignment</h2><p class="small">This assignment is assessed as a whole. These criteria will be covered in your Professional Discussion — you don't need to rework them.</p><ul class="list small">${its.map(i => `<li class="li" data-crit="${esc(i.ref)}"><span class="code">${esc(i.ref)}</span><div class="li-b"><span>${esc(((a.crit || []).find(z => z[0] === i.ref) || [i.ref, ''])[1])}</span><span class="xs muted">${esc(i.from)}${i.reason ? ' · ' + esc(i.reason) : ''}</span>${i.outcome ? `<span class="xs">Outcome: ${esc(i.outcome.result)} · ${esc(i.outcome.by)} · ${fd(i.outcome.at)}</span>` : ''}</div>${chip(i.status)}</li>`).join('')}</ul><a href="#progress..pd" data-go="progress" data-tab="pd" class="small">View PD checklist</a></section>`;
  const k = h.indexOf('<div class="paper">'); return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};
// Submitting a whole-assessment copy puts its criteria in progress, as a question's mapped criteria are (CO-1)
const _finCMA = finaliseSubmit;
finaliseSubmit = function (a, resub, at) {
  const w = W, r = _finCMA.apply(this, arguments);
  if (a && a.mapMode === 'assessment' && a.status === 'Submitted' && a.submittedAt === at && w && w.assignments && w.assignments.includes(a) && typeof co1Submitted === 'function') co1Submitted(w, (a.acrit || []).filter(c => !(a.acj && a.acj[c] && a.acj[c].verified)));
  return r;
};

/* ---------- Coordinator release screen and IQA record: the whole-assessment criteria, read-only (the Assessor's judgement; on the
   IQA record also the Coordinator's published one, beside it — neither replaces the other) ---------- */
const cmaJudgList = (a, get, coo) => `<section class="card cma-ro"><h2>Whole-assessment criteria</h2><p class="xs muted">Mapped to the whole assignment (not to a question). Judged once by the Assessor${coo ? '; the Coordinator\'s published feedback is shown beside it' : ''}.</p><ul class="list small">${(a.acrit || []).map(c => { const y = get(c) || {}, j = coo && coo(c); return `<li class="li" data-crit="${esc(c)}"><span class="code">${esc(c)}</span><div class="li-b"><span>${esc(((a.crit || []).find(z => z[0] === c) || [c, ''])[1])}</span>${y.met ? `<span class="xs">Assessor: ${chip(y.met, r3Tone(y.met))}${y.verified ? ` ${ic('lock', 12)} verified by ${esc(y.vby || '')}` : ''}${y.note ? ' · ' + esc(y.note) : ''}</span>` : '<span class="xs muted">No Assessor judgement yet</span>'}${j ? `<span class="xs cma-cooj">Coordinator: ${chip(j.value, r3Tone(j.value))} ${esc(j.by)} · ${fdt(j.pubAt || j.at)}${j.text ? ' · ' + esc(j.text) : ''}</span>` : ''}</div></li>`; }).join('')}</ul></section>`;
const _relSumCMA = relSummary;
relSummary = function (P) {
  const h = _relSumCMA.apply(this, arguments), s = withRelV(P, () => tasSubs(true).find(x => x.key === P.key)), a = s ? tasAsg(s) : null;
  if (!a || a.mapMode !== 'assessment') return h; const cj = ((P.draft.items || {})[CMA_Q] || {}).cj || {};
  return h.replace(/<span class="code"><\/span>/g, '') + cmaJudgList(a, c => cj[c]);
};
const _cpCMA = r3CritPanel;
r3CritPanel = function (s, a, q) { return cmaBare(q) && a && a.mapMode === 'assessment' ? '<div class="r3-cp cma-cp"><p class="small muted">Assessed with the whole assignment — see "Whole-assessment criteria".</p></div>' : _cpCMA.apply(this, arguments); };
// The Coordinator's review: each whole-assessment criterion gets the existing criterion panel — what the learner sees (the Coordinator's
// and the Assessor's published judgements, side by side), the Coordinator's own draft / publish form and history (R3, unchanged)
const _cSubCMA = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const h = _cSubCMA(p), s = typeof mySubmissions === 'function' ? mySubmissions(true).find(x => x.key === (p && p.id)) : null, a = s && synthAsg(s);
  if (typeof h !== 'string' || !a || a.mapMode !== 'assessment') return h;
  const why = r3CooWhy(s.key), card = `<section class="card cma-coo" aria-labelledby="cma-coo-h"><h2 id="cma-coo-h">Whole-assessment criteria</h2><p class="xs muted">This assignment is mapped as a whole: give each criterion your judgement and feedback once, against the whole submission. Published feedback reaches the learner straight away. The Assessor's judgement is recorded separately, and the final Pass / Fail is the Assessor's.</p>${(a.acrit || []).map((c, n) => r3CritPanel(s, a, aqById(a, cmaVid(n)), why)).join('')}</section>`;
  const k = h.indexOf('<div class="r3-coo">'); return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};
const _qRecCMA = SCREENS['q-record'];
SCREENS['q-record'] = p => {
  const h = _qRecCMA(p), r = p && p.id && recById(p.id), a = r && r.kind === 'sub' ? recAsg(r) : null;
  if (typeof h !== 'string' || !a || a.mapMode !== 'assessment') return h;
  const card = cmaJudgList(a, c => (a.acj || {})[c], c => r.key ? r3Latest(r.key, c, 'Academic Coordinator', true) : null), k = h.indexOf('<h3 class="small">Status timeline</h3>');
  return (k < 0 ? h + card : h.slice(0, k) + card + h.slice(k)).replace(/<span class="code"><\/span>/g, '<span class="xs muted">whole assessment</span>');
};

/* ---------- Nothing submitted: the review and marking pages show "Not submitted yet" before any later panel (PD, criteria, CMA) is
   added, so no date is formatted or invented and no feedback or marking control appears. Access is checked first, as before. ---------- */
const _cSubNoSub = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const s = S.portal === 'coord' && typeof mySubmissions === 'function' ? mySubmissions(true).find(x => x.key === (p && p.id)) : null;
  return s && r3NoSub(s) ? r3NotSubPage(s, [['Submissions & Feedback', 'c-submissions'], [s.L.name]]) : _cSubNoSub(p);
};
const _tMarkNoSub = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const s = S.portal === 'staff' && typeof r3StaffSub === 'function' && p && p.id ? r3StaffSub(p.id) : null;
  return s && r3NoSub(s) ? r3NotSubPage(s, [['Marking Queue', 't-queue'], [s.L.name]]) : _tMarkNoSub(p);
};

/* ---------- Records ---------- */
UXC.push(['CMA', 'Assessment criterion mapping — per question or whole assessment (7 Nov 2026)', [
  'Course builder, Assessments: each assessment chooses "Per question" (each question maps to one or more criteria; one criterion may be mapped by several questions) or "Whole assessment" (the assessment maps to one or more criteria; its questions aren\'t mapped). Each list says "select one or more" and how many are selected.',
  'Both are limited to the knowledge criteria of the assessment\'s scope in its programme version: a module\'s, a unit\'s or the whole programme\'s. Observation criteria, retired criteria and duplicate codes can\'t be chosen; a direct call outside the scope is refused and logged.',
  'The mode is chosen on a Draft that no learner has submitted. Switching when mappings exist lists them and asks first; they are removed (and kept in the history), never converted. Published assessments keep their mode and mapping with their version.',
  'Publishing a whole-assessment Draft needs at least one criterion (questions still need no mapping). Coverage, the Review step and the Assignments page include whole-assessment criteria.',
  'Marking: the Assessor judges each whole-assessment criterion once (Met, Partially Met or Not Met, a note, Verify); each answer keeps its own feedback and exit. Release applies only those judgements to the learner\'s criteria. The final Pass / Fail is still declared separately by the Assessor.',
  'The Coordinator\'s release screen and the IQA record show the whole-assessment criteria with the Assessor\'s judgements, read-only (IQA also sees the Coordinator\'s). Learners see the criteria the assignment covers and, once released, the judgements — never answer keys.',
  'Follow-up: the Coordinator\'s review gives each whole-assessment criterion the usual criterion panel — Met / Partially Met / Not Met with feedback, Save draft, Publish to learner (seen at once, no Assessor approval, no outcome). The Assessor sees it beside their own judgement and can override it; only the Assessor\'s judgements are applied on release.',
  'Follow-up: an answer "Added to PD" on a whole-assessment assignment carries its criteria not yet achieved and verified into the PD checklist, once each. Once any learner has submitted, an assessment\'s mapping is fixed (both modes) — a new assessment or programme version is needed. Duplicate criterion and unit codes are detected across the whole programme version.',
  'Stability: an assignment with nothing submitted opens on "Not submitted yet" for the Coordinator and the Assessor (no date, feedback or marking; direct calls refused). A fixed mapping says what to do for this programme: add a new assessment to its current version, or create a new programme version for other criteria; retired and archived programmes keep the mapping as submitted.']]);
