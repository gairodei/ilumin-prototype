/* R3 — Criterion judgements and the Assessor's final assignment outcome (client clarification, Oct 2026).
   Judgements: Academic Coordinators (their own batches) and Assessors (their allocated learners) record Met, Partially Met or Not Met
   per criterion. Every judgement is kept (never overwritten) with the evaluator, role, date / time, assignment, criterion and round.
   A Coordinator's criterion judgement and feedback are published to the learner straight away, without Assessor approval. An
   Assessor's judgements are part of their marking and reach the learner with it, when the Coordinator releases it (G6.3, unchanged).
   Final outcome: Pass or Fail for one assignment, declared only by the learner's allocated, Active Assessor (in the Assessor portal).
   Coordinators, Teachers, IQA, admins, custom roles and multi-role users acting in another role can't declare or change it — checked
   in the action itself, not only by hiding the control. Judgements, answer exits and release never derive it: G6.4's automatic
   "Completed" is superseded (staff.js releaseFeedback). Provisional (Provisional Decisions Register, PD-R3-*): the outcome doesn't
   change the assignment's status, attempts or evidence; one declaration per round; a correction goes through a Data Correction
   (System Admin first review, Super Admin final); the outcome is not shown to the learner or agency until the client confirms how it
   is published. Records from before R3 keep everything they had and no outcome is invented for them. Loads after R2. */
'use strict';

const R3_VALS = ['Met', 'Partially Met', 'Not Met'];
const R3 = () => (STORE.r3 = STORE.r3 || { judg: {}, out: {}, n: 0 });
const _isR3 = initStore; initStore = function () { STORE.r3 = null; return _isR3.apply(this, arguments); };
const r3Judg = key => (R3().judg[key] = R3().judg[key] || []);
const r3Out = key => R3().out[key] || null;
const r3Tone = v => v === 'Met' || v === 'Pass' ? 'green' : v === 'Partially Met' ? 'amber' : 'red';
function r3Add(key, rec) { const r = { id: 'CJ-' + (++R3().n), at: now().toISOString(), ...rec }; r3Judg(key).push(r); return r; }
// Latest judgement per role for one criterion (both roles are kept side by side; neither overrides the other)
const r3Latest = (key, crit, role, pubOnly) => r3Judg(key).filter(j => j.crit === crit && j.role === role && (!pubOnly || j.published)).slice(-1)[0] || null;
const r3Line = j => `${chip(j.value, r3Tone(j.value))} <span class="xs muted">${esc(j.by)} (${esc(j.role)}) · ${fdt(j.at)} · ${esc(j.round || '—')}${j.published ? '' : ' · not yet released to the learner'}</span>${j.text ? `<div class="small">${esc(j.text)}</div>` : ''}`;
const r3Deny = (where, what, why, logf) => {
  const who = S.portal === 'coord' ? `Academic Coordinator ${CME().name}` : S.portal === 'staff' ? `${TME().roles.join(' + ')} ${TME().name}` : S.portal === 'admin' ? `${(ADMIN.me.roles || [])[0] || 'Admin'} ${ADMIN.me.name}` : 'User';
  ADMIN.security.unshift({ id: 'SE-R3-' + (ADMIN.security.length + 1) + '-' + Date.now().toString(36), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${who} attempted: ${what} — ${why}`, reviewed: false });
  (logf || logA)('Assessment', where, 'Blocked: ' + what, '—', '—', why); toast(why + ' Attempt logged.', 'err'); return false;
};

/* ---------- Assessor: who may mark this submission (the same rule as the CH-17 screen check, now inside every action) ---------- */
const r3StaffSub = key => S.portal === 'staff' && typeof tasSubs === 'function' ? tasSubs(true).find(x => x.key === key) || null : null;
function r3MarkWhy(key) {
  if (S.portal !== 'staff') return 'Marking is done in the Assessor portal by the learner\'s assignment assessor.';
  if (CAN('mark') !== 'yes') return 'Only Assessors mark (G6.1).';
  const s = r3StaffSub(key); if (!s) { const raw = chRaw(() => tasSubs(true).find(x => x.key === key)); return raw ? `Only the allocated assignment assessor (${chEff(raw.L.lid, 'asg', raw.L.batch)}) can mark this submission.` : 'This submission isn\'t in your marking.'; }
  return '';
}
const R3_MK = { mkMet: 'record a criterion judgement', mkRag: 'set feedback colour', mkVerify: 'verify a criterion', mkRelease: 'send marking for release', mkRec: 'record a recommendation' };
Object.keys(R3_MK).forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => { const key = el && el.dataset && el.dataset.k, w = r3MarkWhy(key); if (w) return r3Deny(String(key || '—'), R3_MK[k], w, tasLog); return f(el, e); }; });
['mkExit', 'mkField'].forEach(k => { const f = INP[k]; if (!f) return; INP[k] = (el, e) => { const key = el && el.dataset && el.dataset.k, w = r3MarkWhy(key); if (w) return r3Deny(String(key || '—'), 'change marking', w, tasLog); return f(el, e); }; });
// Every Assessor judgement is logged when it is made (staff-only until the marking is released)
const _mkMetR3 = ACT.mkMet;
ACT.mkMet = (el, e) => {
  const key = el.dataset.k, s = r3StaffSub(key), v = el.dataset.v; if (!R3_VALS.includes(v)) return toast('Choose Met, Partially Met or Not Met.', 'err');
  const r = _mkMetR3(el, e); if (r === false || !s) return r;
  const a = tasAsg(s), q = a.qs.find(x => x.id === el.dataset.q); if (!q) return r;
  r3Add(key, { aid: a.id, title: a.title, qid: q.id, crit: q.crit, value: v, by: TME().name, role: 'Assessor', round: a.round || 'Sub 1', published: false });
  return r;
};
// Workspace: a third judgement (Partially Met — not verifiable), the outcome card and the judgement history
const _tMarkR3 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  let h = _tMarkR3(p); const s = p && p.id ? r3StaffSub(p.id) : null; if (!s) return h;
  const d = dft(s.key);
  h = h.replace(/aria-label="Met or Not Met for ([^"]+)"/, 'aria-label="Met, Partially Met or Not Met for $1"')
    .replace(/(<button aria-pressed="(?:true|false)" data-act="mkMet" data-k="([^"]+)" data-q="([^"]+)" data-v="Not Met"([^>]*)>Not Met<\/button>)/, (m, all, k, q, rest) => `<button aria-pressed="${((d.items[q] || {}).met === 'Partially Met')}" data-act="mkMet" data-k="${k}" data-q="${q}" data-v="Partially Met"${rest}>Partially Met</button>${all}`);
  const card = r3OutCard(s) + r3HistCard(s.key, 'staff');
  const k = h.indexOf('<details class="card"><summary class="strong" style="cursor:pointer">IQA findings');
  return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};
// Partially Met reaches the criterion as "In Progress" (it is neither Achieved nor Action Required); it can't be verified
const _consR3 = consistency;
consistency = function (a, d, s) { const w = _consR3.apply(this, arguments); markable(a).forEach(q => { const x = d.items[q.id] || {}; if (x.met === 'Partially Met' && x.exit === 'pass') w.push(`Q${a.qs.indexOf(q) + 1}: criterion ${q.crit} is Partially Met with exit Passed`); }); return w; };
// On release, the Assessor's judgements for this marking are published with it (and any set without the buttons are logged)
const _relR3 = releaseFeedback;
releaseFeedback = function (s, a, d) {
  const key = s.key, its = markable(a), round = a.round || 'Sub 1', me = TME().name;
  its.forEach(q => { const x = d.items[q.id] || {}; if (!R3_VALS.includes(x.met)) return; const last = r3Judg(key).filter(j => j.qid === q.id && j.role === 'Assessor' && j.round === round).slice(-1)[0]; if (!last || last.value !== x.met) r3Add(key, { aid: a.id, title: a.title, qid: q.id, crit: q.crit, value: x.met, by: me, role: 'Assessor', round, published: false }); });
  const r = _relR3.apply(this, arguments), at = now().toISOString();
  r3Judg(key).forEach(j => { if (j.role === 'Assessor' && !j.published) { j.published = true; j.pubAt = at; } });
  return r;
};

/* ---------- Final outcome: the allocated, Active Assessor only ---------- */
function r3OutWhy(key) {
  if (S.portal !== 'staff') return 'Only the learner\'s allocated Assessor can declare the final outcome, in the Assessor portal.';
  if (!hasRole('Assessor')) return 'Only an Assessor can declare the final outcome.';
  const me = TME().name, acc = ADMIN.staff.filter(x => x.name === me);
  if (acc.length > 1) return `${me}: more than one staff account has this name — the outcome can't be attributed safely.`;
  if (acc.length === 1 && acc[0].status !== 'Active') return `${me}'s account is ${String(acc[0].status).toLowerCase()} — only an Active Assessor can declare the final outcome.`;
  const s = chRaw(() => tasSubs(true).find(x => x.key === key)); if (!s) return 'This submission isn\'t in your marking.';
  if (s.L.short) return 'Final outcomes are recorded for NVQ assignments.';
  const asg = chEff(s.L.lid, 'asg', s.L.batch); if (asg !== me) return `Only the allocated assignment assessor (${asg}) can declare this outcome.`;
  if (s.L.batch && s.L.batch.coord === me) return 'The batch\'s Academic Coordinator can\'t declare outcomes for it (P-33).';
  if (s.L.status === 'Discontinued') return 'This learner\'s enrolment is Discontinued — read-only.';
  if (s.status === 'Not Started' || !s.at) return 'Nothing has been submitted for this assignment yet.';
  const o = r3Out(key), round = tasAsg(s).round || 'Sub 1';
  if (o && o.round === round) return `The outcome for ${round} is already declared (${o.result}). A correction goes through a Data Correction.`;
  return '';
}
function r3OutCard(s) {
  const a = tasAsg(s), o = r3Out(s.key), why = r3OutWhy(s.key), legacy = !o && a.status === 'Completed';
  return `<section class="card r3-out"><div class="row-b"><h2>Final assignment outcome</h2>${o ? chip(o.result, r3Tone(o.result)) : chip('Not declared', 'grey')}</div>
    <p class="xs muted">Your Pass or Fail for the whole assignment, recorded separately from the criterion judgements. It doesn't change the status, attempts or evidence, and the learner doesn't see it yet.</p>
    ${o ? `<p class="small">${chip(o.result, r3Tone(o.result))} for ${esc(o.round)} — declared by ${esc(o.by)} (Assessor) on ${fdt(o.at)}${o.corrected ? ' · corrected through a Data Correction' : ''}. <span class="xs muted">${esc(o.note)}</span></p>` : legacy ? `<p class="small r3-legacy">${ic('info', 13)} Completed before Assessor outcomes were recorded — no final outcome is recorded for it (it isn't assumed to be a Pass).</p>` : ''}
    ${o && o.hist.length > 1 ? `<details><summary class="small">Outcome history (${o.hist.length})</summary><ul class="list xs">${o.hist.map(x => `<li>${fdt(x[0])} · ${esc(x[1])} · ${esc(x[2])} → ${esc(x[3])} · ${esc(x[5])} · ${esc(x[4])}</li>`).join('')}</ul></details>` : ''}
    ${why ? `<p class="xs muted r3-why">${ic('lock', 12)} ${esc(why)}</p>` : `<div class="row"><button class="btn btn-sm btn-primary" data-act="r3Declare" data-k="${s.key}">Declare final outcome…</button></div>`}</section>`;
}
ACT.r3Declare = el => {
  const key = el && el.dataset && el.dataset.k, why = r3OutWhy(key); if (why) return r3Deny(String(key || '—'), 'declare the final outcome', why, S.portal === 'staff' ? tasLog : S.portal === 'coord' ? cooLog : logA);
  const s = chRaw(() => tasSubs(true).find(x => x.key === key)), a = tasAsg(s), round = a.round || 'Sub 1';
  reasonDlg({ title: 'Final outcome — ' + esc(a.title), ok: 'Declare outcome', label: 'Rationale (required)', extra: `<p class="small">${esc(s.L.name)} · ${esc(round)}. This is the final Pass or Fail for the whole assignment, separate from the criterion judgements.</p><div class="field"><fieldset class="stack" style="border:0;padding:0" id="r3-res"><legend class="lbl">Outcome</legend><label class="opt"><input type="radio" name="r3-res" value="Pass"> Pass</label><label class="opt"><input type="radio" name="r3-res" value="Fail"> Fail</label></fieldset></div><p class="xs muted">A declared outcome can't be changed here — a correction goes through a Data Correction (System Admin, then Super Admin). A Fail doesn't remove evidence, reset attempts or open a new attempt.</p>`,
    onOk: r => {
      const w = r3OutWhy(key); if (w) { r3Deny(String(key), 'declare the final outcome', w, tasLog); return false; }
      const res = ($('input[name="r3-res"]:checked') || {}).value; if (!['Pass', 'Fail'].includes(res)) { fieldErr('#r3-res', 'Choose Pass or Fail'); return false; }
      const at = now().toISOString(), me = TME().name, prev = r3Out(key);
      const o = R3().out[key] = { result: res, by: me, role: 'Assessor', at, round, aid: a.id, title: a.title, lid: s.L.lid, note: r, hist: (prev ? prev.hist : []).concat([[at, me, prev ? `${prev.result} (${prev.round})` : 'Not declared', res, r, round]]) };
      tasLog('Assessment', `${s.L.name} · ${a.title}`, 'Final outcome declared', prev ? `${prev.result} (${prev.round})` : 'Not declared', `${res} (${round})`, r);
      if (s.L.batch && s.L.batch.coord) chCooNotify(s.L.batch.coord, 'Final outcome recorded', `${s.L.name} · ${a.title}: ${res} (${round}), declared by ${me}`, 'c-sub.' + key);
      render(); toast(`Final outcome recorded: ${o.result}.`);
    } });
};

/* ---------- Coordinator: criterion judgements and feedback, published straight to the learner ---------- */
function r3CooWhy(key) {
  if (S.portal !== 'coord') return 'Coordinator criterion feedback is given in the Coordinator portal.';
  const s = mySubmissions(true).find(x => x.key === key); if (!s) return 'This submission isn\'t in your batches.';
  if (roBatch(s.L.batch)) return `This batch is ${s.L.batch.status} — read-only.`;
  if (s.L.status === 'Discontinued') return 'This learner\'s enrolment is Discontinued — read-only.';
  if (s.status === 'Not Started' || !s.at) return 'Nothing has been submitted for this assignment yet.';
  return '';
}
// The Coordinator's unpublished drafts (one per question / criterion) — never shown to the learner
const r3CDraft = key => { const s = R3(); s.cdraft = s.cdraft || {}; return (s.cdraft[key] = s.cdraft[key] || {}); };
const r3CritOf = (a, code) => a.crit.find(c => c[0] === code) || [code, '', ''];
const r3PubRow = j => `<div class="r3-pubrow">${chip(j.value, r3Tone(j.value))} <span class="xs muted">${j.role === 'Assessor' ? 'Assessor' : 'Coordinator'} · ${esc(j.by)} · ${fdt(j.pubAt || j.at)} · ${esc(j.round)}</span>${j.text ? `<div class="small">${esc(j.text)}</div>` : ''}</div>`;
// One criterion's assessment panel: what the learner already sees, the Coordinator's draft / publish form, history
function r3CritPanel(s, a, q, why) {
  const key = s.key, [code, desc, type] = r3CritOf(a, q.crit), mine = r3Latest(key, q.crit, 'Academic Coordinator', true), asr = r3Latest(key, q.crit, 'Assessor', true), d = r3CDraft(key)[q.id];
  const hist = r3Judg(key).filter(j => j.crit === q.crit && j.published);
  return `<div class="r3-cq-crit r3-crit" data-crit="${esc(code)}"><h3><span class="code">${esc(code)}</span> ${esc(desc)}</h3>${type ? critType(type) : ''}
    <div class="r3-pub"><span class="xs strong">Published to the learner</span>${mine ? r3PubRow(mine) : '<span class="xs muted">No coordinator judgement published yet.</span>'}${asr ? r3PubRow(asr) : ''}</div>
    ${why ? '' : `<div class="r3-cform"><div class="field"><label for="r3-cv-${q.id}">Your judgement</label><select class="select" id="r3-cv-${q.id}"><option value="">Choose…</option>${R3_VALS.map(v => `<option ${d && d.value === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="r3-ct-${q.id}">Feedback on this criterion</label><textarea class="textarea" rows="3" id="r3-ct-${q.id}">${esc(d ? d.text : '')}</textarea></div>
      ${d ? `<p class="xs r3-draft">${ic('edit', 12)} Draft saved ${fdt(d.at)} — not visible to the learner yet.</p>` : ''}
      <div class="row"><button class="btn btn-sm" data-act="r3CooDraft" data-k="${key}" data-q="${q.id}">Save draft</button><button class="btn btn-sm btn-primary" data-act="r3CooJudge" data-k="${key}" data-q="${q.id}">Publish to learner</button></div></div>`}
    ${hist.length > 1 ? `<details><summary class="xs">History (${hist.length} published)</summary><div class="r3-pub">${hist.slice().reverse().map(r3PubRow).join('')}</div></details>` : ''}</div>`;
}
// Publish one judgement (from the form or the saved draft); the draft is cleared
function r3CooPublish(s, a, q, v, t) {
  const key = s.key, at = now().toISOString(), j = r3Add(key, { aid: a.id, title: a.title, qid: q.id, crit: q.crit, value: v, text: t, by: CME().name, role: 'Academic Coordinator', round: s.round || a.round || 'Sub 1', published: true, pubAt: at });
  delete r3CDraft(key)[q.id];
  if (s.live && s.L.v) notifyLearner(s.L.v, 'Assignments', 'Criterion feedback from your Coordinator', `${a.title}: ${q.crit} — ${v}.`, 'assignment.' + a.id);
  cooLog('Assessment', `${s.L.name} · ${a.title}`, 'Criterion judgement published', '—', `${q.crit}: ${v} (${j.round})`, t);
  return j;
}
const r3CooCtx = (el, what) => { const key = el && el.dataset && el.dataset.k, why = r3CooWhy(key); if (why) { r3Deny(String(key || '—'), what, why, S.portal === 'coord' ? cooLog : logA); return null; } const s = mySubmissions(true).find(x => x.key === key), a = synthAsg(s); return { key, s, a }; };
const r3FormVal = qid => ({ v: ($('#r3-cv-' + qid) || {}).value || '', t: (($('#r3-ct-' + qid) || {}).value || '').trim() });
ACT.r3CooDraft = el => {
  const c = r3CooCtx(el, 'save a criterion draft'); if (!c) return false; const q = c.a.qs.find(x => x.id === el.dataset.q); if (!q) return;
  const { v, t } = r3FormVal(q.id); if (!v && !t) return fieldErr('#r3-cv-' + q.id, 'Choose a judgement or write feedback first');
  r3CDraft(c.key)[q.id] = { value: v, text: t, at: now().toISOString(), by: CME().name }; render(); toast('Draft saved — not visible to the learner.');
};
ACT.r3CooJudge = el => {
  const c = r3CooCtx(el, 'publish a criterion judgement'); if (!c) return false; const q = c.a.qs.find(x => x.id === el.dataset.q); if (!q) return;
  const f = r3FormVal(q.id), d = r3CDraft(c.key)[q.id] || {}, v = f.v || d.value || '', t = f.t || (d.text || '').trim();
  if (!R3_VALS.includes(v)) return fieldErr('#r3-cv-' + q.id, 'Choose Met, Partially Met or Not Met');
  if (!t) return fieldErr('#r3-ct-' + q.id, 'Enter the feedback');
  r3CooPublish(c.s, c.a, q, v, t); render(); toast('Published to the learner.');
};
ACT.r3CooPubAll = el => {
  const c = r3CooCtx(el, 'publish criterion judgements'); if (!c) return false; const dr = r3CDraft(c.key), ids = Object.keys(dr);
  const ready = ids.filter(id => R3_VALS.includes(dr[id].value) && (dr[id].text || '').trim()), open = ids.length - ready.length;
  if (!ready.length) return toast('No complete drafts — each needs a judgement and feedback.', 'err');
  confirmDlg({ title: 'Publish ' + plural(ready.length, 'draft') + ' to the learner?', ok: 'Publish', body: `<ul class="list small">${ready.map(id => { const q = c.a.qs.find(x => x.id === id); return `<li class="li"><span class="code">${esc(q.crit)}</span> ${chip(dr[id].value, r3Tone(dr[id].value))} <span class="small">${esc(dr[id].text)}</span></li>`; }).join('')}</ul>${open ? `<p class="xs muted">${plural(open, 'draft')} without a judgement or feedback stay as drafts.</p>` : ''}`,
    onOk: () => { if (!r3CooCtx(el, 'publish criterion judgements')) return false; ready.forEach(id => { const q = c.a.qs.find(x => x.id === id); r3CooPublish(c.s, c.a, q, dr[id].value, dr[id].text.trim()); }); render(); toast(plural(ready.length, 'judgement') + ' published to the learner.'); } });
};
// The Coordinator's assignment review: each answer beside its criterion assessment; the written comment is secondary
SCREENS['c-sub'] = p => {
  const s = mySubmissions(true).find(x => x.key === (p && p.id)); if (!s) return denied('submission ' + (p && p.id));
  const a = synthAsg(s), why = r3CooWhy(s.key), o = r3Out(s.key), ro = roBatch(s.L.batch) || s.L.status === 'Discontinued', drafts = Object.keys(r3CDraft(s.key)).length;
  const draft = STORE.coo.drafts[s.key] || { text: '', scope: 'Overall submission' };
  const qs = a.qs.map((q, k) => { const last = q.rounds.length - 1;
    const ans = last >= 0 ? `${roundBlock(q, last, q.rounds[last])}${last > 0 ? `<details><summary class="xs">Earlier rounds (${last})</summary>${q.rounds.slice(0, last).map((r, n) => roundBlock(q, n, r)).join('')}</details>` : ''}<div class="row"><button class="attach" data-act="viewFile" data-f="Q${k + 1}_attachment.pdf">${ic('clip2', 13)}Q${k + 1}_attachment.pdf</button></div>` : '<p class="small muted">No answer submitted for this question.</p>';
    return `<section class="card r3-cq" data-q="${q.id}"><div class="r3-cq-grid"><div class="r3-cq-ans">${qHead(q, k)}${ans}${q.state === 'pd' ? `<div class="pd-tag">${ic('users', 16)}<div><strong>Added to Professional Discussion — no rework needed</strong><div class="small">${esc(q.pdReason || '')}</div></div></div>` : ''}</div>${r3CritPanel(s, a, q, why)}</div></section>`; }).join('');
  return `${pageA(esc(a.title), `${esc(s.L.name)} · ${esc(s.L.batch.label)} · submitted ${fdt(s.at)}`, `${chip(s.status)}<span class="code">${s.round}</span>${s.pd ? chip('Added to PD', 'purple') : ''}`, [['Submissions & Feedback', 'c-submissions'], [s.L.name]])}
  <section class="card r3-csumc"><p class="small">Evaluate each criterion against the learner's answer, then publish your judgement and feedback — the learner sees it straight away. The final Pass / Fail is declared by the learner's allocated Assessor.</p>
    <dl class="r3-csum"><div><dt>Status</dt><dd>${chip(s.status)} <span class="code">${s.round}</span></dd></div><div><dt>Assessor</dt><dd>${esc(s.marker || '—')}</dd></div>
      <div><dt>Final outcome</dt><dd class="r3-cooout">${o ? `${chip(o.result, r3Tone(o.result))} (${esc(o.round)}) — declared by ${esc(o.by)}, Assessor` : 'Not declared'} <span class="xs muted">Only the learner's allocated Assessor declares it.</span></dd></div>
      <div><dt>Your drafts</dt><dd>${drafts ? `${drafts} not published <button class="btn btn-sm btn-primary" data-act="r3CooPubAll" data-k="${s.key}">Publish all drafts</button>` : 'None'}</dd></div></dl>
    ${why ? `<div class="note b-grey">${ic('lock')}<div class="small">${esc(why)}</div></div>` : ''}
    <details><summary class="small">Status history</summary>${statusTimeline(a)}</details></section>
  ${a.overall ? `<section class="card"><h2>Assessor's overall comment</h2><p class="small">${esc(a.overall)}</p><p class="xs muted">${esc(a.assessor || s.marker || '')}</p></section>` : ''}
  <div class="r3-coo">${inkLegend()}${qs}</div>
  <details class="card r3-cold"><summary class="strong" style="cursor:pointer">Overall written comment (optional)${s.coo.length ? ` · ${plural(s.coo.length, 'earlier comment')}` : ''}</summary>
    <p class="xs muted">A general comment for the learner, in addition to the criterion feedback above. It doesn't change the status or the outcome.</p>
    ${ro ? '' : `<div class="field"><label for="cf-scope">Comment on</label><select class="select" id="cf-scope" data-onchange="cfScope" data-k="${s.key}"><option ${draft.scope === 'Overall submission' ? 'selected' : ''}>Overall submission</option>${a.qs.map((q, k) => `<option ${draft.scope === 'Question ' + (k + 1) ? 'selected' : ''}>Question ${k + 1}</option>`).join('')}</select></div>
    <div class="rte"><div class="rte-tb" role="toolbar" aria-label="Formatting"><button type="button" data-act="fmtCmd" data-c="bold" aria-label="Bold"><b>B</b></button><button type="button" data-act="fmtCmd" data-c="italic" aria-label="Italic"><i>I</i></button><button type="button" data-act="fmtCmd" data-c="insertUnorderedList" aria-label="Bulleted list">•</button><button type="button" data-act="fmtCmd" data-c="insertOrderedList" aria-label="Numbered list">1.</button><span class="wc"><span class="save-chip ${draft.text ? 'ok' : ''}" id="cf-save">${draft.text ? ic('check', 12) + 'Draft saved' : 'Draft auto-saves'}</span></span></div>
    <div class="rte-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Overall written comment" id="cf-body" data-ph="Write a comment for ${esc(s.L.name)}…" data-oninput="cfInput" data-k="${s.key}">${draft.html || ''}</div></div>
    <div id="cf-prev">${cfPreview(draft)}</div><button class="btn btn-sm" data-act="cfPost" data-k="${s.key}">Post comment</button>`}
    <h3>Earlier coordinator comments</h3>${s.coo.length ? s.coo.map(c => `<div class="coord"><div class="c-h">${ic('users')}Coordinator comment${c.scope && c.scope !== 'Overall submission' ? ' · ' + esc(c.scope) : ''}</div><p class="small">${esc(c.text)}</p><p class="xs muted">${esc(c.by)} · ${fdt(c.at)}</p></div>`).join('') : '<p class="small muted">None.</p>'}</details>
  ${r3HistCard(s.key, 'coord')}`;
};

/* ---------- History (staff) and the learner's view (published judgements only; no outcome yet) ---------- */
function r3HistCard(key, who) {
  const l = r3Judg(key); if (!l.length) return '';
  return `<details class="card r3-hist"><summary class="strong" style="cursor:pointer">Criterion judgement history (${l.length})</summary><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Criterion</th><th>Judgement</th><th>By</th><th>Round</th><th>Learner sees it</th></tr></thead><tbody>${l.slice().reverse().map(j => `<tr><td class="nowrap small">${fdt(j.at)}</td><td><span class="code">${esc(j.crit)}</span></td><td>${chip(j.value, r3Tone(j.value))}</td><td class="small">${esc(j.by)}<div class="xs muted">${esc(j.role)}</div></td><td class="small">${esc(j.round)}</td><td class="small">${j.published ? 'Yes' + (j.pubAt ? ' · ' + fdt(j.pubAt) : '') : 'Not yet'}</td></tr>`).join('')}</tbody></table></div><p class="xs muted">Every judgement is kept; a later one never replaces an earlier one or the other person's. Judgements recorded before this log existed stay in the released feedback and criterion records.</p></details>`;
}
const _fbTopR3 = feedbackTop;
feedbackTop = function (a) {
  // only on the learner's own pages (the learner is the signed-in world)
  const h = _fbTopR3.apply(this, arguments), key = (!S.portal || S.portal === 'learner') && W && W.me ? W.me.id + '~' + a.id : '', l = key ? r3Judg(key).filter(j => j.published) : [];
  if (!l.length) return h;
  const crits = [...new Set(l.map(j => j.crit))];
  return h + `<section class="card r3-learner" aria-label="Feedback on each criterion"><h2>Feedback on each criterion</h2>${crits.map(c => { const [code, desc] = r3CritOf(a, c); return `<div class="r3-lc"><p class="small"><span class="code">${esc(code)}</span> ${esc(desc)}</p><div class="r3-pub">${l.filter(j => j.crit === c).slice().reverse().map(r3PubRow).join('')}</div></div>`; }).join('')}<p class="xs muted">Feedback on individual criteria doesn't by itself decide whether the assignment is passed.</p></section>`;
};

/* ---------- Corrections: a Data Correction for the final outcome (System Admin first review, Super Admin final) ---------- */
const _tasDCR3 = ACT.tasDC;
ACT.tasDC = el => {
  const key = el && el.dataset && el.dataset.k, r = _tasDCR3(el), o = key && r3Out(key); if (!o || !MODAL || !/Data Correction/.test(MODAL.title || '')) return r;
  MODAL.body = MODAL.body.replace('<option value="feedback">Feedback text</option>', `<option value="r3-outcome">Final assignment outcome (${esc(o.result)}, ${esc(o.round)})</option><option value="feedback">Feedback text</option>`); renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), f = a.fn;
  a.fn = () => {
    if (mval('#dc-rec') !== 'r3-outcome') return f();
    const to = mval('#dc-new'); if (!['Pass', 'Fail'].includes(to) || to === o.result) { fieldErr('#dc-new', `Enter the corrected outcome: ${o.result === 'Pass' ? 'Fail' : 'Pass'}`); return false; }
    $('#dc-cur').value = `${o.result} (${o.round})`;
    const n0 = ADMIN.queue.length, res = f(); if (res === false || ADMIN.queue.length === n0) return res;
    const it = ADMIN.queue[0]; it.data = { ...(it.data || {}), field: 'Final assignment outcome', current: `${o.result} (${o.round})`, proposed: to, crit: null, r3out: { key, from: o.result, to } };
    return res;
  };
  return r;
};
const _applyR3 = applyDecision;
applyDecision = function (i, a, r) {
  const res = _applyR3.apply(this, arguments);
  if (i && i.type === 'Data correction' && a === 'approveFinal' && i.data && i.data.r3out) {
    const x = i.data.r3out, o = r3Out(x.key);
    if (o && o.result === x.from) { const at = now().toISOString(); o.hist.push([at, ADMIN.me.name + ' (Data Correction ' + i.id + ')', `${o.result} (${o.round})`, x.to, r || '', o.round]); o.result = x.to; o.corrected = { id: i.id, at }; logA('Assessment', `${o.title} (${x.key})`, 'Final outcome corrected', x.from, x.to, `${i.id}: ${r || ''}`); }
  }
  return res;
};

/* ---------- Admin: Assessment Records shows the declared outcome (read-only; nothing derived from "Completed") ---------- */
const _recR3 = SCREENS['a-records'];
SCREENS['a-records'] = p => { const h = _recR3(p), outs = Object.entries(R3().out); if (!outs.length) return h; return h.replace(/(<\/h1>[\s\S]*?<\/div>)/, `$1<section class="card r3-recs"><h2>Final assignment outcomes declared</h2><ul class="list small">${outs.map(([k, o]) => `<li class="li"><div class="li-b"><strong>${esc(o.title)}</strong><span class="xs muted">${esc(k.split('~')[0])} · ${esc(o.round)} · ${esc(o.by)} (Assessor) · ${fdt(o.at)}${o.corrected ? ' · corrected (' + esc(o.corrected.id) + ')' : ''}</span></div>${chip(o.result, r3Tone(o.result))}</li>`).join('')}</ul><p class="xs muted">Records completed before R3 have no declared outcome; none is assumed.</p></section>`); };

/* ---------- Consistency: criterion feedback counts as the Coordinator's feedback; the Assessor sees it beside the criterion ---------- */
const r3CooPub = (key, me) => r3Judg(key).some(j => j.role === 'Academic Coordinator' && j.published && (!me || j.by === me));
if (typeof CSTABS !== 'undefined') {
  const mine0 = CSTABS.mine[1], none0 = CSTABS.none[1];
  CSTABS.mine = [CSTABS.mine[0], s => mine0(s) || r3CooPub(s.key, CME().name)];
  CSTABS.none = [CSTABS.none[0], s => none0(s) && !r3CooPub(s.key)];
}
const _tMarkR3b = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkR3b(p), s = p && p.id ? r3StaffSub(p.id) : null; if (!s) return h;
  const a = tasAsg(s), q = a.qs[Math.min(S.tas.qi, a.qs.length - 1)], j = q && r3Latest(s.key, q.crit, 'Academic Coordinator', true); if (!j) return h;
  return h.replace('<h3>Criterion decision</h3>', `<div class="r3-pub r3-cooj"><span class="xs strong">Coordinator's published judgement</span>${r3PubRow(j)}</div><h3>Criterion decision</h3>`);
};
// Phones: the floating main action of the review is "Publish all drafts" (the written comment is secondary)
(() => { const m = typeof MOB_MAIN !== 'undefined' && MOB_MAIN.find(x => x.r === 'c-sub'); if (m) m.sel = '#main [data-act="r3CooPubAll"]'; })();
// Coordinator screens' lock note: Coordinators evaluate criteria now; verification and the final outcome stay with the Assessor
const _lockNoteR3 = lockNote; lockNote = function (t) { return _lockNoteR3(t || 'Evidence verification and the final Pass / Fail are done by the Assessor'); };
