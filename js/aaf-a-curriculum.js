/* ============================================================
   AA-FINAL Workstream A — NVQ curriculum and course builder clarity (3 Nov 2026; PD-AAF-A-* proposed). Loads after aa1-integrity.js.
   Everything here is explanation and read-only preview on top of the 8-step CBX builder; no record is stored differently and no
   identifier, mapping, judgement or published version is rewritten.
   AA-01  Course code: the awarding body course code (pr.ref) stays required (CH-8, PD-CB-19 "the existing rule that it is entered",
          PD-M-10 — no accepted decision makes it optional). The form now says why it is required and what it is used for, and shows
          the internal programme ID (pr.id, automatic, read-only — what batches, learners and records link to) separately, on the
          form and on the read-only details. Whether it may be left blank in a Draft is a client decision.
   AA-02  Unit code: the internal unit / module / criterion references are labelled "automatic" and stay read-only. The module's
          awarding-body code (the Ofqual-style unit reference, e.g. T/650/0001) is optional when adding a module in both stores
          (in place: ch-b8.js ch8AddMod and cb-curriculum.js cbCurEdit — g1 Low defect: it was required only for new-style courses);
          once recorded it can be corrected but not removed (as the S3 CH-15 field). The tree shows "Not recorded" and Review &
          Publish lists modules without one as a warning (not a blocker — PD-CB-74).
   AA-03  Evidence requirement: a plain-English hint with examples on Add / Edit criterion, and a "Three kinds of evidence setting"
          explainer separating the criterion's evidence requirement (what the learner must show; read by learners, Assessors and
          observers), the question's "Evidence to include" (guidance under one question) and the observation criterion's permitted
          evidence types (what the observer may record, Section 4). Validation is unchanged (still required, as before).
   AA-04  Curriculum → assignments: a guide (Unit → Module → Learning Outcome → Criterion → Assignment question → Assessment, and
          who sees what) on Sections 2 and 3; the mapping grid is labelled by module (it lists the whole unit, as before); a
          read-only "Coverage and learner preview" under the grid (which questions cover which criteria, unmapped criteria of the
          assignment's unit, what the learner sees per question); and a programme-level "Criteria coverage" table in Section 3.
          Multi-criterion questions (AA-1 D2: q.crit array on the definition, qCrits on copies) are read as they are.
   AA-17  Question numbering: a hint explains automatic numbering; a question retired from now on shows "Retired (was Qn)" (the number
          is recorded when it is retired; older retirements say "Retired"); question audit entries name the Q number with the
          stable id ("Q2 (q3)"). Ids, history and submissions are unchanged.
   ============================================================ */
'use strict';

const aafaHint = t => `<span class="hint aafa-hint">${t}</span>`;

/* ---------- AA-01: awarding body course code vs internal programme ID ---------- */
// AA-FOLLOWUP: the client's guidance first; this is the only course code entered (no Academy course code)
const AAFA_REF_WHY = 'Required. Enter the course code provided by NCFE or the relevant awarding body. It is the only course code you enter — the Academy doesn\'t use its own course code. Learners see it as the awarding body course code, and it is shown in the course header. The internal programme ID is assigned automatically and is what batches, learners and records link to.';
const aafaIdField = pr => `<div class="field aafa-pid"><span class="lbl">Internal programme ID</span><div class="mono cb-ro">${pr && pr.id ? esc(pr.id) : 'Assigned automatically when the draft is first saved'}</div>${aafaHint('Automatic and read-only. It never changes, so batches, learners, assignments and records stay linked even if a code or title is corrected.')}</div>`;
const _cbFormAAFA = cbForm;
cbForm = function (pr) {
  let h = _cbFormAAFA.apply(this, arguments);
  if (!/id="np-r"/.test(h)) return h;
  h = h.replace(/(<input class="input mono" id="np-r"[^>]*>)<span class="hint">[^<]*<\/span>/, (m, i) => `${i}<span class="hint aafa-refwhy">${esc(AAFA_REF_WHY)}</span>`);
  if (!/class="hint aafa-refwhy"/.test(h)) h = h.replace(/(<input class="input mono" id="np-r"[^>]*>)/, (m, i) => `${i}<span class="hint aafa-refwhy">${esc(AAFA_REF_WHY)}</span>`);
  return h.replace('<div class="field"><label for="np-r">', () => aafaIdField(pr) + '<div class="field"><label for="np-r">');
};
const _cbViewAAFA = cbDetailsView;
cbDetailsView = function (pr) {
  const h = _cbViewAAFA.apply(this, arguments); if (!pr || !pr.id || h.includes('aafa-pid')) return h;
  const row = `<dt>Internal programme ID</dt><dd class="aafa-pid"><span class="mono">${esc(pr.id)}</span> <span class="xs muted">automatic — batches, learners and records link to it</span></dd>`;
  if (h.includes("<dt>Awarding body</dt>")) return h.replace("<dt>Awarding body</dt>", () => row + "<dt>Awarding body</dt>"); // kept next to, not between, the awarding body and its code
  return h.includes(`<dt>${M_ABC}</dt>`) ? h.replace(`<dt>${M_ABC}</dt>`, () => row + `<dt>${M_ABC}</dt>`) : h;
};

/* ---------- AA-02 / AA-03: the curriculum dialogs ---------- */
const AAFA_EV_HINT = 'What the learner must produce or show to meet this criterion, in plain words — for example "A written account of how you agree a care plan", "Direct observation of supporting an individual at work" or "A reflective log with a witness statement". Learners see it on the assignments that cover this criterion; Assessors see it when they judge the criterion; observers see it on the observation checklist. It is guidance, not a file type: attachments are set per assignment question (Section 3) and permitted evidence types per observation criterion (Section 4).';
const AAFA_AB_HINT = 'Optional. The awarding body\'s reference for this unit of the qualification (for example its Ofqual unit reference, T/650/0001). Record it when known; once recorded it can be corrected but not removed. It is shown to learners next to the module name.';
const AAFA_INT = { 'Unit code': ['Internal unit reference (automatic)', 'Assigned automatically and never changes or is reused. Criterion references, assignment links, answer keys and learners\' evidence are built on it. The awarding body\'s reference is recorded on each module.'],
  'Module code': ['Internal module reference (automatic)', 'Assigned automatically and never changes: answer keys, assignment links and learners\' evidence are linked to it.'],
  'Learning Outcome code': ['Internal Learning Outcome reference (automatic)', 'Assigned automatically and never changes.'],
  'Criterion code': ['Criterion reference (automatic)', 'Built from the unit number and the Learning Outcome (e.g. 001 1.2 = unit 001, Learning Outcome 1, criterion 2). It never changes: learners\' evidence, assignment questions and judgements are linked to it.'] };
function aafaDlgText(b) {
  Object.entries(AAFA_INT).forEach(([k, [l, h]]) => {
    b = b.replace(new RegExp(`<span class="lbl">${k}</span>(<div class="mono cb-ro">[^<]*</div>)<span class="hint">[^<]*</span>`), (m, v) => `<span class="lbl">${l}</span>${v}<span class="hint">${esc(h)}</span>`);
  });
  b = b.replace(/(<label for="ce-ab">)Awarding-body code(<\/label><input[^>]*>)/, (m, a, c) => `${a}Awarding-body code (optional)${c}${aafaHint(esc(AAFA_AB_HINT))}`)
    .replace(/(<label for="(?:m-ab|nd-ab)">)Awarding-body code(<\/label><input[^>]*>)/, (m, a, c) => `${a}Awarding-body code (optional)${c}${aafaHint(esc(AAFA_AB_HINT))}`)
    .replace(/(<label for="(?:ce-e|c-e|nd-e)">Evidence requirements?<\/label>(?:<textarea[^>]*>[^<]*<\/textarea>|<input[^>]*>))/, (m, a) => `${a}${aafaHint(esc(AAFA_EV_HINT))}`);
  return b;
}
['cbCurEdit', 'ch8AddMod', 'ch8AddCrit', 'nodeAdd'].forEach(n => {
  const f = ACT[n]; if (typeof f !== 'function') return;
  ACT[n] = function () { const before = MODAL, r = f.apply(this, arguments); if (MODAL && MODAL !== before && typeof MODAL.body === 'string') { const b = aafaDlgText(MODAL.body); if (b !== MODAL.body) { MODAL.body = b; renderModal(); } } return r; };
});
// The tree: a module without an awarding-body code says so (it was a bare "—")
const AAFA_NR = '<span class="muted aafa-nr">Not recorded (optional)</span>';

/* ---------- AA-04: the guide on Sections 2 and 3 ---------- */
function aafaGuide(sec) {
  const steps = [['Unit', 'a block of the qualification (internal reference U001, automatic)'], ['Module', 'part of a unit, with the awarding body\'s code (optional) and its answer key'],
    ['Learning Outcome', 'what the learner will understand or be able to do; its assessment type decides how it is assessed (Knowledge → assignments, Observation → observed at work)'],
    ['Assessment criterion', 'one measurable statement (e.g. 001 1.1) with its evidence requirement'],
    ['Assignment question', 'Section 3: each question of a written assignment is mapped to one or more knowledge criteria'],
    ['Assessment', 'the Assessor judges every mapped criterion separately (Met / Partially Met / Not Met); observation criteria are judged in observations (Section 4)']];
  const here = sec === 'curriculum' ? 'You are setting up steps 1–4 here.' : 'You are setting up steps 5–6 here, on the criteria from Section 2.';
  return `<details class="aafa-guide card"><summary>${ic('info', 14)} <strong>How the curriculum and assignments fit together</strong> <span class="xs muted">${here}</span></summary>
    <ol class="aafa-chain">${steps.map(([t, d], i) => `<li${(sec === 'curriculum' ? i < 4 : i >= 4) ? ' class="aafa-here"' : ''}><strong>${t}</strong> — ${esc(d)}</li>`).join('')}</ol>
    <div class="aafa-who small"><p><strong>Who sees what.</strong> Learners see each assignment question with the criteria it covers and their evidence requirements, and their own progress per criterion. Assessors see the same criteria with the descriptor and evidence requirement when they mark. Coordinators see the criterion states on the competency map. A published version never changes: learners stay on their version and changes go into a new version.</p>
    ${aafaEvKinds()}</div></details>`;
}
function aafaEvKinds() {
  return `<div class="aafa-evk"><p class="small"><strong>Three kinds of evidence setting — which is which</strong></p><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Setting</th><th>Where</th><th>What it is</th><th>Who uses it</th></tr></thead><tbody>
    <tr><td><strong>Evidence requirement</strong></td><td class="small">Each criterion (Section 2)</td><td class="small">What the learner must show to meet the criterion — the standard. Free text.</td><td class="small">The learner submits evidence against it; the Assessor checks the submission meets it and records the judgement.</td></tr>
    <tr><td><strong>Evidence to include</strong></td><td class="small">Each assignment question (Section 3)</td><td class="small">Extra guidance under one question, e.g. "A real example from your workplace". Optional.</td><td class="small">Shown to the learner under that question only.</td></tr>
    <tr><td><strong>Permitted evidence types</strong></td><td class="small">Each observation criterion (Section 4)</td><td class="small">What the observer may record at an observation: assessor notes, photos, videos, documents, references.</td><td class="small">The observer records it; it is checked before sign-off.</td></tr></tbody></table></div></div>`;
}
const _panelsAAFA = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsAAFA.apply(this, arguments); if (!pr || !['curriculum', 'assessments'].includes(sec) || !Array.isArray(r) || !r.length) return r;
  return r.map((p, i) => {
    if (i !== 0) return p; const f = p[2];
    return [p[0], p[1], function () {
      let h = f.apply(this, arguments);
      if (sec === 'curriculum') h = h.replace(/Awarding-body code <span class="mono">—<\/span>/g, 'Awarding-body code ' + AAFA_NR) + aafaAbNote(pr);
      if (sec === 'assessments') h = h + aafaCoverage(pr);
      return aafaGuide(sec) + h;
    }];
  });
};
// Modules of the version being shown/edited without an awarding-body code (optional — listed, never blocking)
function aafaAbMissing(pr) {
  const t = (typeof cbTree === 'function' && cbTree(pr)) || [];
  return t.filter(u => u.status !== 'Retired').flatMap(u => u.mods.filter(m => m.status !== 'Retired' && !m.ab).map(m => u.code + ' ' + m.code));
}
const aafaAbNote = pr => { const l = aafaAbMissing(pr); return l.length ? `<p class="xs muted aafa-abmiss">${ic('info', 12)} ${plural(l.length, 'module has', 'modules have')} no awarding-body code recorded (${esc(l.join(', '))}). It is optional; add it with Edit when known.</p>` : ''; };
const _rvAAFA = cbRvChecks;
cbRvChecks = function (pr) {
  const out = _rvAAFA.apply(this, arguments); if (!pr || !out || !out.warn || !cbRvKind(pr)) return out;
  const l = aafaAbMissing(pr); if (!l.length) return out;
  const msg = `${plural(l.length, 'module has', 'modules have')} no awarding-body code recorded (${l.slice(0, 6).join(', ')}${l.length > 6 ? '…' : ''}) — optional; publishing is allowed`;
  const [sec, tab] = cbRvWhere(pr, msg); out.warn.push({ msg, sec, tab }); return out;
};

/* ---------- AA-04: programme coverage (Section 3) ---------- */
const aafaDefCrits = q => (Array.isArray(q.crit) ? q.crit : q.crit ? [q.crit] : []).concat(Array.isArray(q.crits) ? q.crits : []).filter((c, i, a) => c && a.indexOf(c) === i);
const aafaQNums = d => { const m = {}; (d.qs || []).filter(q => q.status === 'Active').forEach((q, i) => { m[q.id] = 'Q' + (i + 1); }); return m; };
function aafaCoverage(pr) {
  const t = typeof cbAsgTreeOf === 'function' ? cbAsgTreeOf(pr) : []; if (!t.length) return '';
  const list = cbAsgOf(pr).filter(d => d.status !== 'Retired'), by = {};
  list.forEach(d => { const n = aafaQNums(d); d.qs.filter(q => q.status === 'Active').forEach(q => aafaDefCrits(q).forEach(c => (by[c] = by[c] || []).push(`${esc(d.title.split(' — ')[0])} · ${n[q.id]}${d.status === 'Draft' ? ' <span class="xs muted">(draft)</span>' : ''}`))); });
  let know = 0, un = 0;
  const rows = t.flatMap(u => u.mods.map((m, k) => {
    const cs = (m.crit || []); if (!cs.length) return '';
    return `<tr class="aafa-cov-m"><th colspan="3" scope="colgroup">${esc(u.code)} · Module ${k + 1} — ${esc(m.title)}</th></tr>` + cs.map(c => {
      const kn = c.type === 'Knowledge'; if (kn) { know++; if (!by[c.code]) un++; }
      return `<tr data-c="${esc(c.code)}"><td class="mono">${esc(c.code)}</td><td class="small">${esc(c.d)}</td><td class="small">${!kn ? `<span class="muted">${ic('lock', 11)} Assessed by observation (Section 4)</span>` : by[c.code] ? by[c.code].join('<br>') : '<span class="aafa-gap">Not covered by an assignment question yet</span>'}</td></tr>`;
    }).join('');
  })).join('');
  return `<section class="card aafa-cov"><h3>Criteria coverage (read-only)</h3><p class="small muted">Which assignment questions cover each criterion of ${esc(pr.title)} (the version shown in Section 2). ${know ? `${know - un} of ${plural(know, 'knowledge criterion', 'knowledge criteria')} covered.` : 'No knowledge criteria yet.'} Change the mapping in an assignment's Criteria mapping tab.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Criterion</th><th>Descriptor</th><th>Covered by</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/* ---------- AA-04: the mapping grid labelled by module, with a read-only coverage and learner preview ---------- */
function aafaModOf(d) {
  const pr = typeof cbPr === 'function' && cbPr(cbAsgPid(d)); if (!pr) return null;
  const t = cbAsgTreeOf(pr, d.pv || (pr && !pr.chNew ? pr.version : undefined)), uc = s2UnitCode(d.unit), u = t.find(x => x.code === uc); if (!u) return null;
  const k = +((/Module (\d+)/.exec(d.unit || '') || [])[1] || 0); return { u, own: u.mods[k - 1] || null, mods: u.mods };
}
const _mapAAFA = s2Mapping;
s2Mapping = function (d) {
  let h = _mapAAFA.apply(this, arguments); const x = d && aafaModOf(d); if (!x) return h;
  const all = s2Crit(d), know = all.filter(c => c.type === 'Knowledge'), obs = all.filter(c => c.type !== 'Knowledge'), modOf = code => x.mods.findIndex(m => (m.crit || []).some(c => c.code === code));
  // A module row above the criteria columns (columns are the whole unit's criteria, as before)
  const grp = l => { const g = []; l.forEach(c => { const k = modOf(c.code), last = g[g.length - 1]; if (last && last.k === k) last.n++; else g.push({ k, n: 1 }); }); return g; };
  const cell = ob => ({ k, n }) => `<th colspan="${n}" class="xs aafa-modh${x.own && x.mods[k] === x.own ? ' aafa-own' : ''}" scope="colgroup">${k >= 0 ? `Module ${k + 1}${x.mods[k] === x.own ? ' (this assignment)' : ''}` : 'Other'}${ob ? ' · observation' : ''}</th>`;
  if (know.length || obs.length) h = h.replace('<thead><tr><th>Question</th>', () => `<thead><tr class="aafa-modrow"><th class="xs muted">${esc(x.u.code)}</th>${grp(know).map(cell(false)).join('')}${grp(obs).map(cell(true)).join('')}</tr><tr><th>Question</th>`);
  const scope = `<p class="small aafa-scope">${ic('info', 13)} The columns are the knowledge criteria of the whole unit <strong>${esc(x.u.code)} ${esc(x.u.title)}</strong>, grouped by module${x.own ? ` — this assignment is linked to Module ${x.mods.indexOf(x.own) + 1} (${esc(x.own.title)})` : ''}. A question can be mapped to several criteria; the Assessor judges each one separately.</p>`;
  h = h.replace(/(<section class="card"><p class="small muted">Map every question)/, (m) => scope + m);
  return h + aafaPreview(d, all);
};
function aafaPreview(d, all) {
  const act = d.qs.filter(q => q.status === 'Active'), know = all.filter(c => c.type === 'Knowledge'), cm = {}; all.forEach(c => { cm[c.code] = c; });
  const used = new Set(act.flatMap(aafaDefCrits)), un = know.filter(c => !used.has(c.code));
  const qrow = (q, i) => { const cs = aafaDefCrits(q); return `<li class="aafa-pq"><div><strong>Q${i + 1}.</strong> ${esc(q.text)}</div>${cs.length ? `<ul class="aafa-pc">${cs.map(c => `<li><span class="mono">${esc(c)}</span> ${esc((cm[c] || {}).d || '')}<div class="xs muted">Evidence requirement: ${esc((cm[c] || {}).ev || '—')}</div></li>`).join('')}</ul>` : '<p class="xs aafa-gap">Not mapped yet — publishing is blocked until it is.</p>'}${q.ev ? `<p class="xs"><strong>Evidence to include:</strong> ${esc(q.ev)}</p>` : ''}</li>`; };
  return `<section class="card aafa-prev"><h3>Coverage and learner preview (read-only)</h3>
    <p class="small muted">How this assignment will look to the learner: each question with the criteria it covers and their evidence requirements. The Assessor marks the same criteria, one judgement each. Nothing here can be changed — use the grid above.</p>
    ${act.length ? `<ol class="aafa-pl">${act.map(qrow).join('')}</ol>` : '<p class="small muted">No questions yet.</p>'}
    <p class="small"><strong>Knowledge criteria of this unit not covered by this assignment:</strong> ${un.length ? un.map(c => `<span class="mono">${esc(c.code)}</span>`).join(', ') + ' <span class="xs muted">(another assignment may cover them — see Criteria coverage in the assignments list)</span>' : 'none'}</p></section>`;
}

/* ---------- AA-17: question numbering ---------- */
const AAFA_QN_HINT = 'Questions are numbered automatically (Q1, Q2 …) in their current order. Moving or retiring a question renumbers the ones after it while the assignment is a Draft; once it is published the numbers are fixed, and learners and Assessors see the same numbers. A question\'s number is not a criterion reference: Q1 is the first question, while 001 1.1 is unit 001, Learning Outcome 1, criterion 1.';
const _qsAAFA = s2Questions;
s2Questions = function (d) {
  const h = _qsAAFA.apply(this, arguments); if (!d) return h;
  const dv = document.createElement('div'); dv.innerHTML = h;
  dv.querySelectorAll('li.ch-retired').forEach(li => { const b = li.querySelector('[data-q]'), q = b && d.qs.find(x => x.id === b.dataset.q), n = li.querySelector('.q-n'); if (q && n) { n.textContent = q.retiredN ? `Retired (was ${q.retiredN})` : 'Retired'; n.classList.add('aafa-qret'); } });
  const p = dv.querySelector('p.small.muted'); if (p) p.insertAdjacentHTML('afterend', `<p class="xs muted aafa-qn">${esc(AAFA_QN_HINT)}</p>`);
  return dv.innerHTML;
};
// Audit entries name the displayed number with the stable id. The context is set only while one of these actions runs.
let aafaQCtx = null;
const aafaQL = (n, id) => (n[id] ? `${n[id]} (${id})` : id);
const _logAAAFA = logA;
logA = function (module, entity, action, before, after, reason) {
  const c = aafaQCtx;
  if (c && module === 'Assignments' && c.d && entity === c.d.title) {
    const post = aafaQNums(c.d), pre = c.pre, id = c.qid || (action === 'Question added' ? (c.d.qs[c.d.qs.length - 1] || {}).id : null);
    if (action === 'Questions reordered') { before = Object.keys(pre).sort((a, b) => +pre[a].slice(1) - +pre[b].slice(1)).map(k => `${pre[k]} (${k})`).join(', ') || before; after = Object.keys(post).sort((a, b) => +post[a].slice(1) - +post[b].slice(1)).map(k => `${post[k]} (${k})`).join(', '); }
    else if (action === 'Question retired' && id) { before = `${aafaQL(pre, id)}: ${before}`; after = `Retired (was ${pre[id] || id})`; }
    else if (action === 'Question restored' && id) { before = `${id}: ${before}`; after = `Active as ${post[id] || id}`; }
    else if (/^Mapping changed/.test(action) && id) { const f = s => String(s).replace(new RegExp('^' + id + ':'), aafaQL(post, id) + ':'); before = f(before); after = f(after); }
    else if (action === 'Question added' && id) after = `${aafaQL(post, id)}: ${after}`;
    else if (/^Question /.test(action) && id) before = `${aafaQL(post, id)}: ${before}`;
  }
  return _logAAAFA.call(this, module, entity, action, before, after, reason);
};
const aafaWithQ = (d, qid, f) => { const was = aafaQCtx; aafaQCtx = { d, qid, pre: aafaQNums(d) }; try { return f(); } finally { aafaQCtx = was; } };
// Wrap a dialog's confirm so it runs with the same context (reason dialogs and the question dialog confirm later)
const aafaWrapModal = (d, qid, before) => { if (!MODAL || MODAL === before) return; MODAL.actions.forEach(a => { if (a.fn && /primary|danger/.test(a.cls || '')) { const g = a.fn; a.fn = (...x) => aafaWithQ(d, qid, () => g(...x)); } }); };
['s2QMove', 's2QRetire'].forEach(n => {
  const f = ACT[n]; if (typeof f !== 'function') return;
  ACT[n] = function (el) {
    const d = el && el.dataset && s2Def(el.dataset.id), qid = el && el.dataset && el.dataset.q; if (!d) return f.apply(this, arguments);
    const q = d.qs.find(x => x.id === qid), was = q && q.status, num = aafaQNums(d)[qid];
    const r = aafaWithQ(d, qid, () => f.apply(this, arguments));
    if (n === 's2QRetire' && q && was === 'Active' && q.status === 'Retired' && num) q.retiredN = num; // recorded when it is retired; never back-filled
    return r;
  };
});
const _qDlgAAFA = s2QDlg;
s2QDlg = function (d, q) {
  const before = MODAL, r = _qDlgAAFA.apply(this, arguments); aafaWrapModal(d, q ? q.id : null, before);
  if (MODAL && MODAL !== before && typeof MODAL.body === 'string' && MODAL.body.includes('Evidence to include')) {
    MODAL.body = MODAL.body.replace(/(<label for="aq-ev">[^<]*<\/label><textarea[^>]*>[^<]*<\/textarea>)/, (m, a) => `${a}${aafaHint('Optional guidance for this question only. The evidence requirement of each mapped criterion is shown to the learner as well, so there is no need to repeat it.')}`); renderModal();
  }
  return r;
};
const _mapChAAFA = INP.mapChange;
INP.mapChange = function (el) {
  const d = el && el.dataset && s2Def(el.dataset.id), qid = el && el.dataset && el.dataset.q; if (!d) return _mapChAAFA.apply(this, arguments);
  const before = MODAL, r = aafaWithQ(d, qid, () => _mapChAAFA.apply(this, arguments)); aafaWrapModal(d, qid, before); return r;
};

/* ---------- Records ---------- */
UXC.push(['AAF-A', 'NVQ curriculum and assignment clarity (3 Nov 2026)', [
  'Course Details: the awarding body course code stays required and says why; the internal programme ID is shown separately (automatic, read-only).',
  'Curriculum: internal unit, module and criterion references are labelled automatic and read-only; the module\'s awarding-body code is optional in every programme (format checked when entered; once recorded it can be corrected, not removed); missing codes say "Not recorded" and are a Review & Publish warning, not a blocker.',
  'Evidence requirement: a plain-English hint with examples on Add and Edit criterion, and a table separating it from a question\'s "Evidence to include" and an observation criterion\'s permitted evidence types.',
  'Sections 2 and 3: a guide to Unit → Module → Learning Outcome → Criterion → Assignment question → Assessment and who sees what; Section 3 shows read-only criteria coverage; each assignment\'s mapping grid is grouped by module and followed by a coverage and learner preview.',
  'Questions: numbering is explained; a question retired from now on shows "Retired (was Qn)"; question audit entries show the Q number with the stable id.']]);
