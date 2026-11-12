// SEC-01 — learner action authorization (CBR correction batch 1, 6 Nov 2026). Legacy fixture: Priya (NVQ + short courses).
// A paused learner's protected actions are refused in the handler itself — direct calls, stale page buttons and dialogs confirmed after
// the pause — and nothing changes; the refusal is logged. The pause is per enrolment: her short courses stay usable while her NVQ is
// paused, and the reverse. Payments, messages and documents stay open. Restoring access lets the same actions work (real clicks).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent));
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const blocked = (a0, what) => ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === `Blocked: ${what} (access locked)`).length;
  const learner = () => { closeModal(); setVariant('C'); S.portal = 'learner'; S.signedIn = true; S.role = 'Learner'; S.edge = 'none'; W.accessPaused = false; };
  const pause = ek => { (STORE.chPause = STORE.chPause || {})[chPKey(W.me.id, ek)] = { by: 'Test Finance', role: 'Finance Admin', at: now().toISOString(), reason: 'SEC1 test' }; };
  const restore = ek => { delete STORE.chPause[chPKey(W.me.id, ek)]; };
  const snap = () => J({ a: W.assignments.map(a => [a.id, a.status, a.qs.map(q => q.rounds.length)]), d: W.drafts, o: W.observations.map(o => [o.id, o.status, !!o.alt]), pd: W.pd && W.pd.session && W.pd.session.status, wp: W.workplace && [W.workplace.name, W.workplace.perm, W.workplace.history.length], q: W.enrolments.map(e => (e.modules || []).map(m => m.quiz.attempts.length)), c: W.enrolments.map(e => (e.content || []).map(c => c.state + c.watch)) });
  // an active short course with a module quiz the learner can take now (attempts left, not passed, its content done — CF rule)
  const quizM = e => (e.modules || []).find(m => !m.quiz.attempts.some(a => a.result === 'Pass') && m.quiz.attempts.length < m.quiz.max && !cfQuizLocked(e, m));
  const shortE = () => W.enrolments.find(e => e.kind === 'short' && e.status === 'Active' && quizM(e));

  await T('SEC1-A direct calls while the NVQ is paused (CH-14 manual pause)', async () => {
    learner(); const ns = W.assignments.find(a => a.status === 'Not Started' && !a.closed), rs = W.assignments.find(a => a.status === 'Resubmission Required' && !a.closed);
    ok('SEC1 setup: Priya has a Not Started and a Resubmission Required assignment, and her NVQ is open', !!ns && !!rs && !lockFor('assignment'), J([ns && ns.id, rs && rs.id]));
    go('assignment', { id: ns.id }); const stale = $1('main [data-act="reviewSubmit"]'); // the page as it was before the pause
    pause('nvq'); const s0 = snap(), a0 = ADMIN.audit.length;
    ok('SEC1-A1 the page itself is locked (render policy unchanged)', !!(lockFor('assignment') && lockFor('assignment').title === 'Access paused'));
    lastToast = ''; const r1 = ACT.reviewSubmit({ dataset: { id: ns.id } });
    ok('SEC1-A2 ACT.reviewSubmit (submission) is refused before anything opens or changes', r1 === false && !MODAL && ns.status === 'Not Started' && /Access paused/.test(lastToast), lastToast);
    ok('SEC1-A3 resubmission is refused the same way', ACT.reviewSubmit({ dataset: { id: rs.id } }) === false && rs.status === 'Resubmission Required' && !MODAL);
    ok('SEC1-A4 startUndo and finaliseSubmit (finalisation) are refused when called directly', startUndo(ns, false) === false && finaliseSubmit(ns, false, now().toISOString()) === false && finaliseSubmit(rs, true, now().toISOString()) === false && ns.status === 'Not Started' && rs.status === 'Resubmission Required' && !$1('#undo-root .undo'));
    const k = ns.id + '.' + ns.qs[0].id + '.0', d0 = W.drafts[k];
    INP.rteInput({ dataset: { key: k }, innerHTML: '<p>typed while paused</p>', innerText: 'typed while paused' });
    INP.attach({ dataset: { key: k }, files: [{ name: 'paused.pdf' }] });
    ok('SEC1-A5 editing an answer, attaching a file and Save draft are refused (drafts unchanged)', W.drafts[k] === d0 && !(W.drafts['att.' + k] || []).includes('paused.pdf') && ACT.cfSaveDraft({ dataset: { id: ns.id } }) === false);
    const o = W.observations.find(x => x.status === 'Proposed');
    ok('SEC1-A6 observation booking (accept / ask another date / Academy-office requests / Coordinator advice) is refused', !!o && ACT.obsAccept({ dataset: { id: o.id } }) === false && ACT.obsAlt({ dataset: { id: o.id } }) === false && ACT.dObsReq({ dataset: { e: 'x' } }) === false && ACT.chOrRequest({ dataset: {} }) === false && ACT.chOrConsent({ dataset: { id: 'x', a: 'accept' } }) === false && o.status === 'Proposed' && !o.alt && !MODAL, o && o.id);
    ok('SEC1-A7 Professional Discussion confirm / another date are refused', ACT.pdConfirm({ dataset: {} }) === false && ACT.pdAlt({ dataset: {} }) === false && !MODAL);
    ok('SEC1-A8 workplace details, change and resend are refused', SUBMIT.wpSave({}) === false && ACT.changeWp({ dataset: {} }) === false && ACT.resendPerm({ dataset: {} }) === false);
    ok('SEC1-A9 NVQ resources: open / complete are refused', ACT.openRes({ dataset: { id: 'x' } }) === false && ACT.resScorm({ dataset: { id: 'x' } }) === false);
    ok('SEC1-A10 nothing changed: assignments, drafts, observations, PD, workplace, quizzes, content', snap() === s0);
    ok('SEC1-A11 each refusal is logged as a blocked action, with no invented success', blocked(a0, 'submit an assignment') === 3 && blocked(a0, 'finalise an assignment submission') === 2 && blocked(a0, 'accept an observation date') === 1 && blocked(a0, 'save workplace details') === 1 && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => !/^Blocked: /.test(x.action)), J(ADMIN.audit.slice(0, 4).map(x => x.action)));
    ok('SEC1-A12 the audit entry names the learner and the lock, not a success', /Priya|IA-L/.test(ADMIN.audit[0].entity) && /Access paused/.test(ADMIN.audit[0].reason) && ADMIN.audit[0].module === 'Learner access', J(ADMIN.audit[0]));
    // B: the page that was open before the pause — its real button
    S.route = 'assignment'; S.params = { id: ns.id }; document.querySelector('main').insertAdjacentElement('beforeend', stale); lastToast = '';
    click(stale); ok('SEC1-B1 a real click on the stale "Review & Submit" button is refused (no dialog, status unchanged)', !MODAL && ns.status === 'Not Started' && /Access paused/.test(lastToast), lastToast);
    go('assignment', { id: ns.id }); ok('SEC1-B2 opening the assignment shows "Access paused" and no submit button', /Access paused/.test($1('main').textContent) && !$1('main [data-act="reviewSubmit"]'));
    go('assignments'); ok('SEC1-B3 the Assignments list is locked too', /Access paused/.test($1('main').textContent));
    restore('nvq');
  });

  await T('SEC1-A dialog and undo window: access paused after the dialog opened', async () => {
    learner(); const a = W.assignments.find(x => x.status === 'Not Started' && !x.closed); go('assignment', { id: a.id });
    click($1('main [data-act="reviewSubmit"]')); ok('SEC1-A13 while open: the review dialog opens', !!MODAL && /^Review your/.test(MODAL.title));
    pause('nvq'); const a0 = ADMIN.audit.length; click(mbtn(/^Submit$/));
    ok('SEC1-A14 pressing Submit after the pause is refused (the dialog checks again); nothing is recorded', a.status === 'Not Started' && !$1('#undo-root .undo') && blocked(a0, 'submit an assignment') === 1);
    restore('nvq'); go('assignment', { id: a.id }); click($1('main [data-act="reviewSubmit"]')); click(mbtn(/^Submit$/));
    ok('SEC1-A15 open again: Submit starts the 15-second undo window', !!$1('#undo-root .undo') && a.status === 'Not Started');
    pause('nvq'); const a1 = ADMIN.audit.length; await wait(16500);
    ok('SEC1-A16 paused during the undo window: finalisation is refused, the assignment is not submitted', a.status === 'Not Started' && blocked(a1, 'finalise an assignment submission') === 1 && !$1('#undo-root .undo'));
    restore('nvq'); learner(); go('assignment', { id: a.id }); click($1('main [data-act="reviewSubmit"]')); click(mbtn(/^Submit$/)); click($1('#undo-root [data-act="undoSubmit"]'));
    ok('SEC1-A17 Undo still cancels a pending submission (it changes nothing)', !$1('#undo-root .undo') && a.status === 'Not Started');
  });

  await T('SEC1-C pause per enrolment: short courses stay open while the NVQ is paused', async () => {
    learner(); const e = shortE(); ok('SEC1-C setup: an active short course with a module quiz to take', !!e, e && e.id); if (!e) return;
    pause('nvq'); const m = quizM(e), n0 = m.quiz.attempts.length;
    ok('SEC1-C1 its course and quiz pages are open', !secLock('course', e.id) && !secLock('quiz', e.id));
    go('course', { id: e.id, tab: 'quiz' }); setUi('shMod-' + e.id, m.id); go('course', { id: e.id, tab: 'quiz' });
    const b = $1(`main [data-act="startQuiz"][data-id="${e.id}"]`); ok('SEC1-C2 Start quiz is shown', !!b);
    if (b) { click(b); const st = mbtn(/Start quiz/); ok('SEC1-C3 the start dialog opens and starting works (real clicks)', !!st); if (st) click(st); }
    ok('SEC1-C4 the attempt is in progress', !!W.quiz && W.quiz.e === e.id);
    if (W.quiz) { W.quiz.ans = { 0: 0 }; finishQuiz(false); }
    ok('SEC1-C5 submitting records the attempt (one more attempt, a result)', m.quiz.attempts.length === n0 + 1 && !!(W.quiz && W.quiz.result), `${n0} → ${m.quiz.attempts.length}`);
    W.quiz = null; restore('nvq');
  });

  await T('SEC1-C pausing a short course locks that course only', async () => {
    learner(); const e = shortE(); if (!e) return ok('SEC1-C6 setup', false, 'no short course');
    const m = quizM(e), n0 = m.quiz.attempts.length;
    W.quiz = { e: e.id, m: m.id, ans: { 0: 1 }, cur: 0, ends: Date.now() + 6e5, mode: 'one', conn: true }; // an attempt in progress
    pause(e.id); const a0 = ADMIN.audit.length;
    ok('SEC1-C6 startQuiz on the paused short course is refused (no dialog)', ACT.startQuiz({ dataset: { id: e.id, m: m.id } }) === false && !MODAL);
    finishQuiz(false);
    ok('SEC1-C7 the attempt in progress is not recorded (no attempt used) and is discarded, as an access-ended quiz is', m.quiz.attempts.length === n0 && W.quiz === null && blocked(a0, 'submit a quiz') === 1);
    const c = (e.content || []).find(x => x.state !== 'Completed');
    ok('SEC1-C8 its content (open / SCORM completion) is refused', !c || (ACT.openItem({ dataset: { e: e.id, id: c.id } }) === false && ACT.scormFinish({ dataset: { e: e.id, id: c.id } }) === false && c.state !== 'Completed'));
    ok('SEC1-C9 her NVQ stays open while only the short course is paused', !secLock('assignment', 'nvq') && !secLock('observations', 'nvq'));
    restore(e.id);
  });

  await T('SEC1 permitted while paused: payments, messages, documents, requests', async () => {
    learner(); pause('nvq');
    ok('SEC1-P1 Payments, Messages, Admission & Documents, My Requests, Certificates stay open', ['payments', 'messages', 'admission', 'requests', 'certificates', 'notifications', 'profile'].every(r => !lockFor(r)), ['payments', 'messages', 'admission'].map(r => (lockFor(r) || {}).title || 'open').join());
    go('payments'); const pay = $1('main [data-act="payInst"], main [data-act="payNow"], main [data-act="payBalance"]'); ok('SEC1-P2 a payment control is offered and opens checkout', !!pay && (click(pay), !!MODAL), pay && pay.dataset.act); closeModal();
    ACT.compose({ dataset: { to: 'Academy', sub: 'Paused' } }); ok('SEC1-P3 writing a message to the Academy still opens', !!MODAL); closeModal();
    restore('nvq');
  });

  await T('SEC1-D authorised learner: the same actions work', async () => {
    learner(); const a = W.assignments.find(x => x.status === 'Not Started' && !x.closed); go('assignment', { id: a.id });
    const body = $1('main .rte-body[contenteditable="true"]'); body.innerHTML = '<p>My answer</p>'; body.dispatchEvent(new Event('input', { bubbles: true }));
    ok('SEC1-D1 typing an answer is kept (INP.rteInput)', /My answer/.test(W.drafts[body.dataset.key] || ''));
    click($1('main [data-act="reviewSubmit"]')); click(mbtn(/^Submit$/)); await wait(16500);
    ok('SEC1-D2 Review & Submit → Submit → 15 s: the assignment is Submitted with the answer', a.status === 'Submitted' && /My answer/.test(a.qs[0].rounds[a.qs[0].rounds.length - 1].html));
    closeModal(); const o = W.observations.find(x => x.status === 'Proposed'); ACT.obsAccept({ dataset: { id: o.id } }); click(mbtn(/^Accept$/));
    ok('SEC1-D3 accepting a proposed observation works', o.status === 'Confirmed');
    ACT.pdConfirm({ dataset: {} }); click(mbtn(/Confirm this date/)); ok('SEC1-D4 confirming the Professional Discussion works', W.pd.session.status === 'Confirmed');
  });

  await T('SEC1 other locks of the same policy', async () => {
    learner(); const a = W.assignments.find(x => ['Not Started', 'Resubmission Required'].includes(x.status) && !x.closed && !dLate(x));
    S.edge = 'archived'; ok('SEC1-E1 an archived account is read-only: submit refused', ACT.reviewSubmit({ dataset: { id: a.id } }) === false && !MODAL);
    S.edge = 'paused'; ok('SEC1-E2 the overdue pause (demo state) refuses a submission', ACT.reviewSubmit({ dataset: { id: a.id } }) === false && !MODAL);
    S.edge = 'none'; ACT.reviewSubmit({ dataset: { id: a.id } }); ok('SEC1-E3 back to normal: the review dialog opens', !!MODAL && /^Review your/.test(MODAL.title)); closeModal();
    ok('SEC1-E4 one table of protected learner actions, every entry wired to an existing handler', SEC_ACTS.length >= 25 && SEC_ACTS.every(([w, n]) => typeof ({ ACT, INP, SUBMIT, fn: window })[w][n] === 'function'), SEC_ACTS.filter(([w, n]) => typeof ({ ACT, INP, SUBMIT, fn: window })[w][n] !== 'function').map(x => x[1]).join());
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
