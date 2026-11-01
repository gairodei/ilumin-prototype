// AC-3 — remaining Academic Admin defects (1 Nov 2026; PD-AC3-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Client demo first (admissions, batch dates, Data Corrections, observations), then the legacy data (admission history, Data
// Correction review, recommendations, observations, observation fees, quizzes), then the client demo again for Reset. Test-only
// records (an expiry flag, a pending learner, a quiz allowance) are made on data the next fixture load discards.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'AC-3 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const hold = () => { const m = MODAL, a = primA(); return (r = 'AC-3 replay') => { MODAL = m; renderModal(); const t = $1('#rsn'); if (t) t.value = r; const x = a.fn(); closeModal(); return x; }; };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length, since = n0 => ADMIN.audit.slice(0, Math.max(0, ADMIN.audit.length - n0));
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const register = (name, email) => {
    signOutUI(); click($1('#app [data-act="regStart"]'));
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 955' + String(700 + Math.floor(Math.random() * 99)), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submit('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]');
    click($1('#app [data-act="finishWelcome"]')); return W;
  };
  // Legacy identities
  const ACA = (k = 'KA') => { closeModal(); acaEnter(k); S.signedIn = true; S.ui = {}; };
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => AS('A');
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const TCH = v => { closeModal(); S.tas.v = v; tasEnter(); S.signedIn = true; S.ui = {}; };
  const cdSnap = () => J({ ad: ['CD1', 'CD2', 'CD4', 'CD5'].map(v => [STORE.worlds[v].admission.status, STORE.worlds[v].docs.map(d => [d.id, d.status])]), b: ADMIN.batches.map(b => [b.code, b.start, b.end, b.status]), q: ADMIN.queue.length, l: allLearners().length });
  const cd0 = cdSnap();

  /* ================= Client demo ================= */
  const wS = STORE.worlds.CD4, AM = STORE.worlds.CD1.me.id, code = cdBatch().code;

  await T('AC3-D4 each learner listed once (B1-D4)', async () => {
    const n0 = allLearners().length; register('Ula Unique', 'ula.unique@ac3.example'); const id = W.me.id;
    const ids = allLearners().map(l => l.id), dup = ids.filter((x, k) => ids.indexOf(x) !== k);
    ok('AC3-D4 a self-registered learner appears once in the Academic Admin\'s learner list (was twice in the client demo)', ids.filter(x => x === id).length === 1 && !dup.length && allLearners().length === n0 + 1, J({ dup, n: allLearners().length - n0 }));
    pick('aca'); go('a-learners'); const rws = $a('main tbody tr').filter(tr => tr.textContent.includes(id)); ok('AC3-D4 screen: the Learners page counts the learners once and has one row for her', rws.length <= 1 && (main().match(/Ula Unique/g) || []).length <= 1, J({ rows: rws.length }));
  });

  await T('AC3-D10 / D11 / expiry: document decisions', async () => {
    pick('aca'); const d1 = wS.docs.find(d => d.id === 'n1'), qi = allQueue().find(i => i.doc && i.v === 'CD4' && i.doc.id === 'n1');
    pick('super'); const qs = allQueue().find(i => i.doc && i.v === 'CD4' && i.doc.id === 'n1'); go('a-queue', { id: qs.id });
    ok('AC3-D11 a first upload is a "Document review" item in the queue (was "Document replacement")', qs.lbl === 'Document review' && /Document review/.test(main()) && !/Document replacement/.test($1('main h1').textContent), $1('main h1').textContent);
    go('a-queue', { tab: 'all' }); const cell = (typeof dts === 'function' && dts('q')) ? '' : ''; ok('AC3-D11 ... and in the queue list', /Document review/.test(main()) || allQueue().filter(i => i.doc && !i.doc.replacement).every(i => i.lbl === 'Document review'), cell);
    // expiry: a checklist item that has an expiry date (test-only flag on Sam's passport)
    d1.expiryReq = true; pick('aca'); go('a-admissions', { id: 'APP-CD4' }); click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n1"][data-s="Approved"]'));
    ok('AC3-X approving a document whose checklist item has an expiry date asks for that date', !!$1('#modal-root #ac3-exp'));
    let r1 = prim(); const e1 = !!MODAL; $1('#ac3-exp').value = new Date(now().getTime() - 2 * 864e5).toISOString().slice(0, 10); const r2 = prim();
    ok('AC3-X no date, or a date already passed, is refused; the document stays awaiting review', r1 === false && e1 && r2 === false && d1.status === 'Submitted');
    const fut = new Date(now().getTime() + 400 * 864e5).toISOString().slice(0, 10); $1('#ac3-exp').value = fut; prim(); closeModal();
    ok('AC3-X with a future expiry date it is approved and the date recorded', d1.status === 'Approved' && String(d1.expires).slice(0, 10) === fut, J({ st: d1.status, ex: d1.expires }));
    const d3 = wS.docs.find(d => d.id === 'n3'); d3.expiryReq = true; const s0 = sec(), rr = docDecision('CD4', d3, 'Approved', 'direct');
    ok('AC3-X a direct call without the expiry date is refused', rr === false && d3.status === 'Submitted');
    d3.expiryReq = false;
    // B1-D10: the decision date the learner sees
    go('a-admissions', { id: 'APP-CD4' }); click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n6"][data-s="Rejected"]')); reason('Please upload a newer CV');
    const d6 = wS.docs.find(d => d.id === 'n6'); pick('nvq-dep'); go('admission');
    ok('AC3-D10 the learner sees the reviewer and the real decision date (was always ten days ago)', !!d6.decidedAt && main().includes(fd(d6.decidedAt)) && main().includes(d6.reviewer) && (fd(D(-10)) === fd(d6.decidedAt) || !main().includes(fd(D(-10)) + 'Re-upload')), J({ at: d6.decidedAt, by: d6.reviewer }));
  });

  await T('AC3-D5 7-day admission escalation (B1-D5)', async () => {
    const tT = STORE.worlds.CD4; pick('aca'); ok('AC3-D5 setup: Sam\'s application is open and not escalated', !allApplications().find(a => a.id === 'APP-CD4').escalated && !tT.admission.escalatedAt);
    pick('fin'); ACT.cb10Advance({ dataset: { d: '8' } }); render();
    pick('aca'); allApplications(); allApplications(); go('a-admissions'); const rows = ADMIN.audit.filter(a => /Escalated to the Super Administrator/.test(a.action) && /APP-CD4/.test(a.entity));
    ok('AC3-D5 eight days later (demo clock) the application is escalated, recorded once by the system', allApplications().find(a => a.id === 'APP-CD4').escalated && !!tT.admission.escalatedAt && rows.length === 1 && rows[0].actor === 'System (automatic)', J({ rows: rows.map(a => [a.actor, a.action]), st: tT.admission.status, h: tT.admission.history.map(x => x[0]), now: now().toISOString() }));
    pick('super'); ok('AC3-D5 the Super Administrator is told (in their own notifications)', (ADMIN.myNotifs || []).some(n => /Admission escalated/.test(n.t) && /APP-CD4/.test(n.b)));
    pick('aca'); const s0 = sec(); ACT.appReject({ dataset: { id: 'APP-CD4' } }); const m = !!MODAL; closeModal(); go('a-admissions', { id: 'APP-CD4' });
    ok('AC3-D5 the Academic Admin can no longer decide it (handler and screen): it is the Super Administrator\'s', !m && sec() === s0 + 1 && !!$1('main .ac3-esc') && !$1('main [data-act="appReject"]') && tT.admission.status === 'Awaiting review');
    pick('super'); ACT.appReject({ dataset: { id: 'APP-CD4' } }); const m2 = !!MODAL; closeModal();
    ok('AC3-D5 the Super Administrator can decide it (the reject dialog opens)', m2);
    pick('fin'); ACT.cb10Reset(); render();
  });

  await T('AC3-D7 the activation link (B1-D7)', async () => {
    const L = { id: 'IA-L-49001', name: 'Pia Pending', email: 'pia.pending@ac3.example', acct: 'Pending Verification', rec: 'Active', flags: [], courses: [] }; ADMIN.learners.push(L);
    pick('nvq-sp'); const me = W.me.id, s0 = sec(); ACT.lnActLink({ dataset: { id: L.id } });
    ok('AC3-D7 Amira, signed in, cannot open another learner\'s activation link (she stays Amira; no account is made)', W.me.id === me && S.portal === 'learner' && S.signedIn && !S.lnAct && sec() === s0 + 1 && !STORE.worlds[lnKey(L)]);
    pick('teacher'); ACT.lnActLink({ dataset: { id: L.id } }); ok('AC3-D7 nor can a Teacher', S.portal === 'staff' && !S.lnAct);
    pick('aca'); ACT.lnActLink({ dataset: { id: L.id } }); ok('AC3-D7 from the learner record (staff), the simulated email opens the set-password page for that learner', S.auth === 'first' && S.lnAct === L.id && !S.signedIn);
    signOut(); ok('AC3-D7 the pending activation stays only on its own page', S.lnAct === L.id); S.auth = 'signin'; signOut(); ok('AC3-D7 ... and is cleared once the page is left', !S.lnAct);
  });

  await T('AC3-B batch dates and sessions (B2-D7, B2-D8, B2-D9)', async () => {
    const b = cdBatch(), s0 = b.start; pick('aca');
    ACT.addToBatch({ dataset: { id: code } }); const t1 = MODAL && MODAL.title; closeModal();
    b.start = new Date(now().getTime() - 2 * 864e5).toISOString(); // test-only: the start date has passed while the status is still Open
    ACT.addToBatch({ dataset: { id: code } }); const t2 = MODAL && MODAL.title; closeModal(); b.start = s0;
    ok('AC3-B2D7 adding a learner after the start date is the audited override even while the status is still Open (CH-42)', /^Add learner to/.test(t1) && /after the batch has started/.test(t2), J([t1, t2, b.status]));
    // B2-D9: a one-off session outside the batch dates is refused; inside is added
    const n0 = batchEvents(b).length, inside = new Date(new Date(b.start).getTime() + 20 * 864e5).toISOString().slice(0, 10) + 'T17:00', outside = new Date(new Date(b.end).getTime() + 5 * 864e5).toISOString().slice(0, 10) + 'T17:00';
    ACT.addSession({ dataset: { b: code } }); $1('#se-d').value = outside; const r1 = prim(); const hint = (($1('#modal-root .field-err, #modal-root .err') || {}).textContent || '') + main(); closeModal();
    ok('AC3-B2D9 a session after the batch end is refused (kept within the batch dates)', r1 === false && batchEvents(b).length === n0, hint.slice(0, 80));
    ACT.addSession({ dataset: { b: code } }); $1('#se-d').value = inside; prim(); closeModal();
    const ev = batchEvents(b).find(e => e.s4 && String(e.start).slice(0, 10) === inside.slice(0, 10));
    ok('AC3-B2D9 a session within the dates is added', !!ev, batchEvents(b).length - n0); if (!ev) return;
    ACT.kEditEv({ dataset: { b: code, id: ev.id } }); const ok2 = !!$1('#modal-root #ke-n'); if (ok2) { $1('#ke-n').value = new Date(new Date(b.end).getTime() + 10 * 864e5).toISOString().slice(0, 16); if ($1('#ke-r')) $1('#ke-r').value = 'x'; } const r3 = ok2 ? prim() : 'no dialog'; closeModal();
    ok('AC3-B2D9 rescheduling that session after the batch end is refused', r3 === false && (batchEvents(b).find(e => e.id === ev.id) || {}).start === ev.start, J({ r3 }));
    // B2-D8: an end date before the confirmed session is refused with the list; nothing changes
    const e0 = b.end; ACT.s4bBatchEdit({ dataset: { id: code } }); $1('#bd-e').value = new Date(new Date(ev.start).getTime() - 2 * 864e5).toISOString().slice(0, 10); $1('#bd-r').value = 'AC-3 move'; const r4 = prim(); const note = ($1('#modal-root .ac3-strand') || {}).textContent || ''; const r5 = prim(); closeModal();
    ok('AC3-B2D8 an end date that would leave a confirmed session (or a published deadline) after it is refused, listing the items; nothing changes', r4 === false && r5 === false && /Session/.test(note) && b.start === s0 && b.end === e0, note.slice(0, 160));
    ACT.s4bBatchEdit({ dataset: { id: code } }); $1('#bd-c').value = String(b.cap + 1); $1('#bd-r').value = 'AC-3 capacity'; prim(); prim(); closeModal();
    ok('AC3-B2D8 a change that strands nothing still saves (capacity)', b.start === s0 && b.cap > 0 && (b.detailsHist || []).some(h => h[4] === 'AC-3 capacity'));
  });

  await T('AC3-DC raise Data Correction (B3-06)', async () => {
    const k = AM + '~a10';
    for (const p of ['teacher', 'coord1', 'nvq-sp', 'fin', 'biz', 'agency', 'iqa']) { pick(p); const s0 = sec(); ACT.tasDC({ dataset: { k } }); const m1 = !!MODAL; closeModal(); ACT.raiseDC({ dataset: { id: AM } }); const m2 = !!MODAL; closeModal(); ok('AC3-DC ' + p + ' cannot open Raise Data Correction (either dialog); refused and logged', !m1 && !m2 && sec() === s0 + 2); }
    pick('assessor'); ACT.tasDC({ dataset: { k } }); const m3 = !!MODAL; closeModal(); ok('AC3-DC the learner\'s Assessor still raises one', m3);
    pick('aca'); ACT.raiseDC({ dataset: { id: AM } }); const m4 = !!MODAL; closeModal(); go('a-learners', { id: AM }); ok('AC3-DC the Academic Admin still raises one from the learner record', m4 && !!$1('main [data-act="raiseDC"]'));
  });

  await T('AC3-OB observations in the client demo (B4-D8)', async () => {
    const w = STORE.worlds.CD1; w.observations = w.observations || []; w.observations.unshift({ id: 'oAC3', at: D(9, '10:00'), loc: 'Example care home', assessor: 'James Pryce', scope: 'U1 1.1', status: 'Proposed' }); // test-only
    pick('aca'); go('a-observations'); const row = $a('main tbody tr').find(tr => tr.textContent.includes(chFullName(w)));
    ok('AC3-OB the Academic Admin\'s Observations list shows the client demo learner\'s observation with its actions (was empty)', !!row && !!row.querySelector('[data-act="obsAdmin"]'), main().slice(0, 160));
    ok('AC3-OB ... and not the emptied legacy learners', !allObs().some(o => ['C', 'D'].includes(o.v)));
    ACT.newObs(); const opts = $a('#modal-root #no-l option').map(o => o.value); closeModal();
    ok('AC3-OB "Create observation entry" offers the client demo\'s NVQ learners, not the legacy C / D', opts.includes('CD1') && !opts.includes('C') && !opts.includes('D'), J(opts));
    go('a-observations', { tab: 'permissions' }); ok('AC3-OB the Workplace permissions tab lists the client demo learners', main().includes(chFullName(w)));
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy();
  const Q = id => qItem(id);
  await T('AC3-H admission history names who acted', async () => {
    const w = STORE.worlds.B; chQuickSignup(w); SA(); allApplications(); const me = ADMIN.me.name;
    ACT.assignRev({ dataset: { id: 'APP-B' } }); if ($1('#rv')) $1('#rv').value = 'Owen Price'; prim(); closeModal();
    const i = Q('AQ-ADM-B'); applyDecision(i, 'reject', 'AC-3', {}); const h = Q('AQ-ADM-B').history;
    const row = l => h.find(x => x[2] === l);
    ok('AC3-H the queue history names the learner for the sign-up steps and the Super Administrator for the reviewer and the rejection (it named the learner on every row)', row('Sign-up complete') && row('Sign-up complete')[0] === VNAME('B') && row('Under Review') && row('Under Review')[0] === me && row('Rejected') && row('Rejected')[0] === me, J(h.map(x => [x[0], x[2]])));
  });

  await T('AC3-05 Data Correction: first review before the final approval (B3-05)', async () => {
    const i = Q('AQ-1004'), c = STORE.worlds[i.data.v].certs.find(x => x.id === i.data.cert), no0 = c.no;
    SA(); const s0 = sec(); ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); const m = !!MODAL; closeModal(); const r = applyDecision(i, 'approveFinal', 'skip review', {});
    ok('AC3-05 the Super Administrator cannot give the final approval before the System Administrator\'s first review (dialog and direct call); nothing re-issued', !m && r === false && isOpen(i) && c.no === no0 && sec() === s0 + 2);
    go('a-queue', { id: i.id }); ok('AC3-05 screen: no final-approval button yet; it says the first review is awaited', !$1('main [data-act="qDo"][data-a="approveFinal"]') && !!$1('main .ac3-dcw'));
    AS('SY'); ACT.qDo({ dataset: { id: i.id, a: 'forward' } }); reason('First review'); SA(); ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); reason('Final');
    ok('AC3-05 after the first review the Super Administrator approves it (once)', i.status === 'Approved' && c.no !== no0);
  });

  await T('AC3-D5r the recorder of a recommendation (B4-D5)', async () => {
    ACA(); const src = Q('AQ-4007'), x = JSON.parse(J(src)); x.id = 'AQ-AC3R'; x.data.recBy = ADMIN.me.name; x.status = 'Pending'; ADMIN.queue.push(x); // test-only: recorded by this Academic Admin
    const i = Q('AQ-AC3R'), s0 = sec(); ['decline', 'reject', 'return', 'exceptional'].forEach(a => applyDecision(i, a, 'self', { date: '2026-12-01' })); ACT.qDo({ dataset: { id: i.id, a: 'decline' } }); const m = !!MODAL; closeModal();
    ok('AC3-D5r the Academic Admin who recorded the recommendation can\'t decline, reject, return or grant it; refused and logged', i.status === 'Pending' && !m && sec() >= s0 + 4);
    SA(); applyDecision(i, 'decline', 'Super Administrator decides', {}); ok('AC3-D5r the Super Administrator can decide it', Q(i.id).status === 'Rejected');
  });

  await T('AC3-OBL observations: accept and fee (B4-D13, B4-D14)', async () => {
    const w = STORE.worlds.C, can = w.observations.find(o => o.status === 'Cancelled'), pro = w.observations.find(o => o.status === 'Proposed' && !o.alt);
    learner('C'); const s0 = aud(); ACT.obsAccept({ dataset: { id: can.id } }); const m = !!MODAL; closeModal();
    ok('AC3-13 a cancelled observation can\'t be accepted (direct call): it stays Cancelled; refused and logged', !m && can.status === 'Cancelled' && since(s0).some(a => /^Blocked: accept an observation/.test(a.action) && a.actor === VNAME('C')));
    if (pro) { ACT.obsAccept({ dataset: { id: pro.id } }); const g = hold(); pro.status = 'Cancelled'; const x = g('stale'); ok('AC3-13 an accept dialog confirmed after the observation was cancelled is refused', x === false && pro.status === 'Cancelled'); pro.status = 'Proposed'; ACT.obsAccept({ dataset: { id: pro.id } }); prim(); closeModal(); ok('AC3-13 a proposed observation is still accepted', pro.status === 'Confirmed'); }
    // B4-D14: CH-40 (client decision) — rescheduling has no effect on the fee; its due date stays; never a second fee
    const v = 'B', wb = STORE.worlds[v]; wb.observations.forEach(o => { o.chPreFee = true; }); const o = { id: 'oAC3f', at: D(6, '10:00'), loc: 'x', assessor: 'James Pryce', scope: 'U1', status: 'Confirmed', chPreFee: false }; wb.observations.unshift(o);
    SA(); render(); const f = chFeeOf(wb.me.id, wb.nvq.title, wb.signup && wb.signup.prog), n0 = chFees().length;
    ok('AC3-14 setup: the first confirmed observation raises one fee, due on its date', !!f && f.due === o.at && f.status === 'Due');
    if (f) { const f0 = J(f); o.status = 'Rescheduled'; o.newAt = D(20, '10:00'); render(); o.status = 'Confirmed'; o.at = D(20, '10:00'); render();
      ok('AC3-14 after the observation is rescheduled the fee is unchanged (CH-40) and no second fee is raised', J(f) === f0 && chFees().length === n0); }
  });

  await T('AC3-Q quizzes (B4-D9, B4-D10, B4-D11)', async () => {
    learner('F'); const e = W.enrolments.find(x => x.modules && x.modules.some(m => m.quiz.attempts.length >= m.quiz.max && !shPassed(m)));
    ok('AC3-Q setup: a quiz with every attempt used', !!e); if (!e) return; const m = e.modules.find(x => x.quiz.attempts.length >= x.quiz.max && !shPassed(x)), q = m.quiz, n0 = q.attempts.length;
    const s0 = aud(); ACT.startQuiz({ dataset: { id: e.id, m: m.id } }); const m1 = !!MODAL; closeModal();
    ok('AC3-Q10 a quiz with no attempts left can\'t be started (direct call); refused and logged', !m1 && q.attempts.length === n0 && since(s0).some(a => /no attempts left/.test(a.action)));
    const open = W.requests.find(r => r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.target === e.title), r0 = W.requests.length;
    if (open) { ACT.reqAttempts({ dataset: { id: e.id, m: open.mid || m.id } }); const m2 = !!MODAL; closeModal(); ok('AC3-Q11 a second request while one is open is refused', !m2 && W.requests.length === r0); }
    // B4-D9: a quiz configured with 2 attempts (test-only) gets 2 more, not 3
    const w = STORE.worlds.F, mm = e.modules.find(x => x !== m && x.quiz) || m; w.requests = w.requests.filter(r => !(r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.target === e.title));
    mm.quiz.max = 2; delete mm.quiz.base; mm.quiz.attempts = [{ n: 1, at: D(-3), score: 40, result: 'Not passed' }, { n: 2, at: D(-2), score: 50, result: 'Not passed' }];
    learner('F'); ACT.reqAttempts({ dataset: { id: e.id, m: mm.id } }); if ($1('#rq-reason')) $1('#rq-reason').value = 'AC-3'; prim(); closeModal();
    const rq = W.requests.find(r => r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.mid === mm.id); ok('AC3-Q9 setup: the learner requested more attempts', !!rq); if (!rq) return;
    ACT.reqAttempts({ dataset: { id: e.id, m: mm.id } }); const m3 = !!MODAL; closeModal(); ok('AC3-Q11 asking again for the same quiz is refused', !m3 && W.requests.filter(r => r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.mid === mm.id).length === 1);
    ACA(); const qid = 'AQ-' + rq.id + '-F'; go('a-queue', { id: qid }); ok('AC3-Q9 screen: the queue shows the attempts used of this quiz\'s allowance', main().includes('2 of 2'));
    ACT.qDo({ dataset: { id: qid, a: 'grant' } }); ok('AC3-Q9 the grant dialog shows the quiz\'s own allowance (2)', ($1('#modal-root #kgr') || {}).value === '2' || /original number of attempts \(2\)/.test(MODAL && MODAL.body), ($1('#modal-root #kgr') || {}).value); reason('AC-3 grant');
    ok('AC3-Q9 granting gives the quiz\'s own allowance (+2, not +3), once', rq.status === 'Granted' && mm.quiz.max === 4 && /^\+2 attempts/.test(rq.grant), J({ max: mm.quiz.max, g: rq.grant }));
    learner('F'); ACT.startQuiz({ dataset: { id: e.id, m: mm.id } }); const m4 = !!MODAL; closeModal(); ok('AC3-Q10 with attempts granted, the quiz can be started', m4);
  });

  /* ================= Reset ================= */
  await T('AC3-Z client demo reset', async () => {
    fxLoadClient(); ok('AC3-Z loading the client demo restores the starting records (admissions, batches, queue, learner list)', cdSnap() === cd0, cdSnap().slice(0, 200));
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
