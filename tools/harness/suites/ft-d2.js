// Batch D2 — assessment feedback completion (PD-D-10…15): the allocated Assessor overrides a Coordinator judgement with a reason (the
// original kept), overall feedback with the final outcome, learner visibility only after release, no Teacher authority, no late submissions.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  // (the Assessor portal keeps its own state between tests: an unsaved marking draft would stop navigation with the 'Unsaved marking changes' prompt)
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  // N5a review (supersedes publishing without it): every new programme and new version records "Observation required" (Yes / No) first
  const obsDecide = (id, v = 'no') => { ACT.n5Settings({ dataset: { p: id } }); const r = document.querySelector(`#modal-root input[name="n5-req"][value="${v}"]`); if (r && MODAL) { r.checked = true; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); } closeModal(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { ACT.switchRole({ dataset: { r } }); S.signedIn = true; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'R test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const rebuildA = () => { INP.adminVariant({ value: Object.keys(ADMIN_VARIANTS).find(k => k !== 'A') }); INP.adminVariant({ value: 'A' }); SA(); };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const rsn = r => { const t = document.querySelector('#rsn'); if (t) t.value = r; };
  // Sarah (A) marks a live submission she is the allocated assessor for
  const liveSub = () => { TCH('A'); return tasSubs(true).find(x => x.live && x.toMark && markable(tasAsg(x)).length >= 1); };
  const sendAll = (s, item) => { const d = dft(s.key); markable(tasAsg(s)).forEach(q => { d.items[q.id] = { ...item }; }); ACT.mkRelease({ dataset: { k: s.key } }); prim(); };
  // (the release confirmation navigates back to the Release queue on a 0 ms timer — let it run so it doesn't fire in a later test)
  const relAs = async (coo, key) => { COO(coo); ACT.relOne({ dataset: { k: key } }); prim(); await wait(20); };
  const declare = (key, res, r = 'Assessed against the brief') => { ACT.r3Declare({ dataset: { k: key } }); if (!MODAL) return false; if (res) { const x = document.querySelector(`input[name="r3-res"][value="${res}"]`); if (x) x.checked = true; } rsn(r); return press(); };
  const ofb = (t = 'Overall: clear understanding; strengthen the examples.') => { const x = document.querySelector('#d-ofb'); if (x) x.value = t; };
  const declareFb = (key, res, r = 'Assessed against the brief', fb) => { ACT.r3Declare({ dataset: { k: key } }); if (!MODAL) return false; const x = document.querySelector(`input[name="r3-res"][value="${res}"]`); if (x) x.checked = true; ofb(fb); rsn(r); return press(); };
  const cooPub = (s, q, v, t = 'Coordinator feedback on this criterion.') => { COO('A'); go('c-sub', { id: s.key }); document.querySelector('#r3-cv-' + q.id).value = v; document.querySelector('#r3-ct-' + q.id).value = t; ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } }); };
  const override = (s, q, v, r) => { TCH('A'); go('t-mark', { id: s.key }); ACT.dOverride({ dataset: { k: s.key, q: q.id } }); if (!MODAL) return 'no dialog'; const x = document.querySelector(`input[name="d-ov"][value="${v}"]`); if (x) x.checked = true; rsn(r); return press(); };

  await T('D2-A Assessor overrides a Coordinator judgement with a reason; originals kept', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('D2-A live submission allocated to Sarah', false); const a = tasAsg(s), q = markable(a)[0], w = STORE.worlds[s.L.v];
    cooPub(s, q, 'Met'); const cj = r3Latest(s.key, q.crit, 'Academic Coordinator', true);
    ok('D2-A (setup) the Coordinator published Met', !!cj && cj.value === 'Met');
    TCH('A'); S.tas.qi = a.qs.indexOf(q); go('t-mark', { id: s.key });
    ok('D2-A the allocated Assessor sees the Coordinator\'s published judgement with "Override the Coordinator\'s judgement…"', !!app().querySelector('main .r3-cooj') && !!app().querySelector('main [data-act="dOverride"]'));
    ACT.dOverride({ dataset: { k: s.key, q: q.id } }); const x = document.querySelector('input[name="d-ov"][value="Partially Met"]'); if (x) x.checked = true; rsn('');
    ok('D2-A (negative) a reason is required', press() === false && !r3Judg(s.key).some(j => j.override)); closeModal();
    ACT.dOverride({ dataset: { k: s.key, q: q.id } }); rsn('No judgement chosen');
    ok('D2-A (negative) a judgement different from the Coordinator\'s must be chosen', press() === false && !r3Judg(s.key).some(j => j.override) && !document.querySelector('input[name="d-ov"][value="Met"]')); closeModal();
    const coord0 = JSON.stringify(cj), n0 = r3Judg(s.key).length;
    override(s, q, 'Partially Met', 'The second part of the criterion isn\'t evidenced.');
    const ov = r3Judg(s.key).find(j => j.override);
    ok('D2-A override recorded as the Assessor\'s judgement: what it overrides, by whom, why; not yet released', !!ov && ov.role === 'Assessor' && ov.by === 'Sarah Okonkwo' && ov.value === 'Partially Met' && ov.override.of === cj.id && ov.override.from === 'Met' && /isn't evidenced/.test(ov.override.reason) && !ov.published && r3Judg(s.key).length === n0 + 1);
    ok('D2-A the Coordinator\'s original judgement is unchanged and kept', JSON.stringify(r3Latest(s.key, q.crit, 'Academic Coordinator', true)) === coord0);
    ok('D2-A the Assessor\'s marking for that criterion follows the override; audited; the Coordinator is told', dft(s.key).items[q.id].met === 'Partially Met' && ADMIN.audit.some(x => x.action === 'Coordinator judgement overridden') && STORE.coo.notifs.some(n => /overridden by the Assessor/.test(n.t)));
    COO('A'); go('c-sub', { id: s.key }); ok('D2-A the Coordinator\'s review says their Met was overridden, with the reason', /was overridden by Sarah Okonkwo/.test(main()) && /isn't evidenced/.test(main()));
    learner(s.L.v); go('assignment', { id: a.id }); ok('D2-A before release the learner sees the Coordinator\'s judgement only (the override is staff-only)', /Coordinator · Dr Helen Carter/.test(main()) && !/Overrides the Coordinator/.test(main()));
    TCH('S'); const sec0 = ADMIN.security.length; ACT.dOverride({ dataset: { k: s.key, q: q.id } }); ok('D2-A (negative) another (unallocated) Assessor can\'t override — refused, logged', !MODAL && ADMIN.security.length > sec0);
    TCH('T'); ACT.dOverride({ dataset: { k: s.key, q: q.id } }); ok('D2-A (negative) the Teacher role can\'t override', !MODAL && r3Judg(s.key).filter(j => j.override).length === 1);
    COO('A'); ACT.dOverride({ dataset: { k: s.key, q: q.id } }); ok('D2-A (negative) the Coordinator portal can\'t override', !MODAL);
    TCH('A'); sendAll(s, { exit: 'pass', rag: 'A', fb: 'See criterion feedback.', met: 'Partially Met' }); await relAs('A', s.key);
    learner(s.L.v); go('assignment', { id: a.id }); const lc = (app().querySelector('.r3-learner') || { textContent: '' }).textContent;
    ok('D2-A after release the learner sees the override with its reason, beside the Coordinator\'s original', /Overrides the Coordinator's "Met"/.test(lc) && /isn't evidenced/.test(lc) && /Coordinator · Dr Helen Carter/.test(lc));
    ok('D2-A the full history keeps both judgements', r3Judg(s.key).some(j => j.id === cj.id && j.value === 'Met') && r3Judg(s.key).some(j => j.override && j.published));
  });

  await T('D2-B final outcome with overall feedback; learner sees it only after release; Teacher has no authority', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('D2-B live submission', false); const a = tasAsg(s), w = STORE.worlds[s.L.v];
    TCH('T'); const sec0 = ADMIN.security.length; ACT.r3Declare({ dataset: { k: s.key } }); ok('D2-B (negative) the Teacher role can\'t declare the final outcome', !MODAL && !r3Out(s.key) && ADMIN.security.length > sec0);
    TCH('A'); ACT.r3Declare({ dataset: { k: s.key } }); ok('D2-B the declaration asks for overall feedback for the learner', !!document.querySelector('#d-ofb'));
    document.querySelector('input[name="r3-res"][value="Pass"]').checked = true; rsn('Meets the brief'); ok('D2-B (negative) overall feedback is required', press() === false && !r3Out(s.key)); closeModal();
    const crit0 = JSON.stringify(w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code + c.st))))), st0 = a.status;
    declareFb(s.key, 'Pass', 'Meets the brief', 'A strong, well-evidenced assignment.');
    const o = r3Out(s.key);
    ok('D2-B Pass declared with overall feedback; history keeps it; status and criteria unchanged (not derived)', o && o.result === 'Pass' && o.feedback === 'A strong, well-evidenced assignment.' && o.hist.slice(-1)[0].includes('A strong, well-evidenced assignment.') && a.status === st0 && JSON.stringify(w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code + c.st))))) === crit0);
    go('t-mark', { id: s.key }); ok('D2-B the workspace shows the overall feedback, "Not yet released to the learner"', /A strong, well-evidenced assignment/.test(app().querySelector('main .r3-out').textContent) && /Not yet released to the learner/.test(main()));
    learner(s.L.v); go('assignment', { id: a.id }); ok('D2-B before release the learner doesn\'t see the outcome', !app().querySelector('main .d-lout'));
    TCH('A'); sendAll(s, { exit: 'pass', rag: 'G', fb: 'Good.', met: 'Met' }); await relAs('A', s.key);
    learner(s.L.v); go('assignment', { id: a.id }); const lo = app().querySelector('main .d-lout');
    ok('D2-B after the Coordinator\'s release the learner sees Pass, the declaring Assessor and the overall feedback', !!lo && /Pass/.test(lo.textContent) && /Sarah Okonkwo/.test(lo.textContent) && /A strong, well-evidenced assignment/.test(lo.textContent) && /isn't worked out from the individual criteria/.test(lo.textContent));
    ok('D2-B the agency course-level Pass / Fail is still not derived from the outcome', typeof passFail === 'function' && passFail({ status: 'Active' }) === '—');
  });

  await T('D2-C no late submissions, in the action', async () => {
    fresh(); learner('C'); const w = STORE.worlds.C, a = w.assignments.find(x => x.status === 'Not Started' && new Date(x.due) > now());
    if (!a) return ok('D2-C (setup) an open assignment', false);
    ACT.reviewSubmit({ dataset: { id: a.id } }); ok('D2-C before the deadline the review-and-submit dialog opens (unchanged)', !!MODAL); closeModal();
    const due0 = a.due; a.due = D(-1, '21:59'); const a0 = ADMIN.audit.length;
    ACT.reviewSubmit({ dataset: { id: a.id } }); ok('D2-C (negative) after the deadline a direct submit is refused and logged; nothing submitted', !MODAL && a.status === 'Not Started' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /Blocked: submit after the deadline/.test(x.action)));
    a.originalDue = due0; a.due = D(5, '21:59'); ACT.reviewSubmit({ dataset: { id: a.id } }); ok('D2-C with an extension (deadline moved) it can be submitted', !!MODAL); closeModal();
    a.due = due0; delete a.originalDue; ACT.reviewSubmit({ dataset: { id: a.id } }); const fn = MODAL && MODAL.actions.find(x => x.label === 'Submit'); a.due = D(-1, '21:59'); const r = fn ? fn.fn() : null; closeModal();
    ok('D2-C (negative) the deadline is checked again at Submit (dialog opened before the deadline)', r === false && a.status === 'Not Started');
    const rr = w.assignments.find(x => x.status === 'Resubmission Required'); if (rr) { const d0 = rr.resubDue; rr.resubDue = D(-1, '21:59'); ACT.reviewSubmit({ dataset: { id: rr.id } }); ok('D2-C (negative) a resubmission after its resubmission deadline is refused', !MODAL && rr.status === 'Resubmission Required'); rr.resubDue = d0; }
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
