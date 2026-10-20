// Demo Scenarios 1–15, end to end, step by step. Each step: open it from the Demo Scenarios page (role + screen), then act and assert.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false && MODAL && MODAL.actions.includes(a)) closeModal(); return r; } };
  const rsn = (v = 'Scenario test') => { const e = $('#rsn'); if (e) e.value = v; };
  // open step k (1-based) of scenario n exactly as the page button does
  const step = (n, k) => { const st = SC_LIST().find(x => x[0] === String(n))[3][k - 1]; ACT.scOpen(); if (st.act) { ACT[st.act](); return st; } ACT.scStep({ dataset: { r: st.r, t: st.t } }); const want = (st.t || '').split('.')[0]; ok(`#${n}.${k} opens ${st.r || '—'} → ${st.t || '—'}`, !want || (S.route === want && !/Page not found|couldn't find this|don't have permission/i.test(main())), S.route); return st; };
  const S_ = async (name, f) => { try { await f(); } catch (e) { R.push('FAIL ' + name + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };

  await S_('#1 Assignment loop', async () => {
    step(1, 1); const a = W.assignments.find(x => x.status === 'Not Started'); ok('#1.1 learner has an assignment to submit', !!a, a && a.title);
    a.qs.forEach(q => W.drafts[a.id + '.' + q.id + '.0'] = '<p>My answer with a workplace example.</p>');
    ACT.reviewSubmit({ dataset: { id: a.id } }); prim(); await wait(16500); closeModal();
    ok('#1.1 submitted after the 15-second undo window', a.status === 'Submitted', a.status);
    step(1, 2); const key = W.me ? null : null; const s = tasSubs(true).find(x => x.L.v === 'C' && tasAsg(x).id === a.id);
    ok('#1.2 in the assessor\'s queue', !!(s && s.toMark), s && s.key); if (!s) return;
    const d = dft(s.key), its = markable(tasAsg(s)); its.forEach((q, k) => { d.items[q.id] = k === 0 ? { exit: 'resub', rag: 'R', fb: 'Add an example.', corrections: 'Add a second example.', met: 'Not Met', days: 10 } : { exit: 'pass', rag: 'G', fb: 'Good.', met: 'Met', verified: true, vat: now().toISOString() }; });
    ACT.mkRelease({ dataset: { k: s.key } }); prim(); ok('#1.2 sent to Coordinator for release', !!STORE.tas.pending[s.key] && a.status === 'Submitted');
    step(1, 3); ok('#1.3 in the release queue', DT.crel && DT.crel.rows.some(P => P.key === s.key)); ACT.relOne({ dataset: { k: s.key } }); prim();
    ok('#1.3 released', !STORE.tas.pending[s.key] && a.status === 'Resubmission Required', a.status);
    step(1, 4); go('assignment', { id: a.id }); ok('#1.4 learner sees feedback + resubmission date', /Add an example/.test(main()) && main().includes(fd(a.resubDue)));
    step(1, 5); STORE.coo.drafts[s.key] = { text: 'Well structured — keep going.', kind: 'plain' }; go('c-sub', { id: s.key }); ACT.cfPost({ dataset: { k: s.key } }); prim();
    ACT.scStep({ dataset: { r: 'learner:C', t: 'assignment.' + a.id } }); ok('#1.5 Coordinator feedback posted and visible to the learner', /Well structured — keep going/.test(main()));
  });

  await S_('#2 Admission and deposit', async () => {
    // CH-07 / CH-10: the deposit is paid in the sign-up (step 4); the review comes after payment; then the balance
    step(2, 1); const need = W.docs.filter(x => x.mand && !['Approved', 'Submitted'].includes(x.status)); ok('#2.1 documents to upload', need.length > 0, need.map(x => x.id + ':' + x.status).join());
    need.forEach(x => ACT.sampleUpload({ dataset: { id: x.id } })); await wait(2500);
    ok('#2.1 uploaded (Submitted)', W.docs.filter(x => x.mand).every(x => ['Approved', 'Submitted'].includes(x.status) || x.replacement), W.docs.map(x => x.id + ':' + x.status).join());
    ACT.suNext(); setUi('suSig', 'Priya Raman'); setUi('suDecl', true); ACT.suSign(); ok('#2.1 offer letter signed (CH-08)', !!W.signup.sig && W.signup.step === 4);
    ACT.suPay(); prim(); await wait(3000); closeModal(); ok('#2.1 deposit paid at sign-up, seat held 28 days, learning started (CH-10)', W.signup.done && W.admission.deposit.paid && daysTo(W.admission.deposit.holdUntil) >= 27 && W.flags.admitted && W.admission.status === 'Awaiting review', W.admission.status);
    step(2, 2); go('a-admissions', { id: 'APP-B' }); const ap = allApplications().find(x => x.id === 'APP-B');
    ap.docs.filter(x => x.status === 'Submitted').forEach(x => ACT.docDec({ dataset: { a: 'APP-B', d: x.id, s: 'Approved' } }));
    ok('#2.2 documents approved', STORE.worlds.B.docs.filter(x => x.mand).every(x => x.status === 'Approved'), STORE.worlds.B.docs.map(x => x.id + ':' + x.status).join());
    ACT.appApprove({ dataset: { id: 'APP-B' } }); rsn('All checks complete'); prim(); ok('#2.2 admission approved — the batch assigned at sign-up is confirmed (CH-42)', STORE.worlds.B.admission.status === 'Approved' && STORE.worlds.B.admission.batch === 'Abu Dhabi Cohort 1 — L3AC-DEC26-AUH', STORE.worlds.B.admission.status);
    step(2, 3); const bal = W.plans.find(p => p.e === 'nvq').rows[0]; ACT.payInst({ dataset: { e: 'nvq', n: '1' } }); prim(); await wait(3000); closeModal(); ok('#2.3 balance paid within the 28-day seat hold', bal.status === 'Paid' && bal.paid === bal.amount, bal.status);
  });

  await S_('#3 Extra quiz attempts', async () => {
    step(3, 1); const e = W.enrolments.find(x => x.id === 'bls'), mq = e.modules[0].quiz; ok('#3.1 all attempts used on the Module 1 quiz (CH-16)', mq.attempts.length >= mq.max);
    go('course', { id: 'bls' }); ACT.reqAttempts({ dataset: { id: 'bls', m: 'm1' } }); $('#rq-reason').value = 'I have re-watched the videos.'; prim(); const r = W.requests[0]; ok('#3.1 request sent for the module (CH-16)', r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.mid === 'm1', r.id);
    step(3, 2); const qid = 'AQ-' + r.id; ok('#3.2 in the Academic Admin queue', !!qItem(qid), qid); go('a-queue', { id: qid }); ACT.qDo({ dataset: { id: qid, a: 'grant' } }); rsn(); prim();
    step(3, 3); ok('#3.3 learner can attempt the module quiz again (CH-16)', r.status === 'Granted' && mq.attempts.length < mq.max, r.status + ' ' + mq.attempts.length + '/' + mq.max);
  });

  await S_('#4 Overdue fees', async () => {
    step(4, 1); ok('#4.1 overdue shown to the learner', /Overdue/.test(main()));
    step(4, 2); const od = odRows(); ok('#4.2 self-paying learners at 15 and 30+ days; no sponsored NVQ', od.some(r => r.name === 'Ruby Clarke' && r.days === 15 && !r.sponsor) && od.some(r => r.name === 'Jack Thompson' && r.days >= 30 && !r.sponsor) && !od.some(r => r.sponsor && /Diploma/.test(r.course)) && /Ruby Clarke/.test(main()) && /Jack Thompson/.test(main()), od.map(r => r.name + ':' + r.days).join());
    step(4, 3); ACT.odRestore({ dataset: { id: 'W-Cnvq5' } }); rsn('Payment arrangement agreed'); prim(); ok('#4.3 Finance restored with a new due date', !!STORE.worlds.C.arrangeUntil && !STORE.worlds.C.accessPaused);
    step(4, 4); const o = (typeof odRows === 'function' ? odRows() : []).find(x => x.id === 'OD-IA-L-30385'); ok('#4.4 System Admin has Restore', !!document.querySelector('main [data-act="odRestore"]'));
    ACT.odRestore({ dataset: { id: 'OD-IA-L-30385' } }); rsn('Agreed'); prim(); ok('#4.4 System Admin restored', o && o.src.status === 'arrangement', o && o.src.status);
  });

  await S_('#5 Agency bundle and seats', async () => {
    step(5, 1); const p = STORE.biz.products.find(x => x.status === 'Draft' && !x.agency); ACT.bPublish({ dataset: { id: p.id } }); rsn('Ready'); prim(); ok('#5.1 bundle published', p.status === 'Published', p.id);
    step(5, 2); ok('#5.2 published bundle offered to the agency', AGY_CATALOGUE().some(c => c.id === p.id) || /Oral/.test(main()));
    const n0 = ADMIN.bundles.length; ACT.agBuy({ dataset: { id: 'CAT-2' } }); prim(); prim(); await wait(3000); closeModal();
    const b = ADMIN.bundles.slice(n0).find(x => x.agency === 'CarePlus Recruitment (demo)') || ADMIN.bundles.find(x => x.agency === 'CarePlus Recruitment (demo)' && x.courses.includes('Infection Prevention and Control') && bStatus(x) !== 'Expired' && left(x) > 0);
    ok('#5.2 bought by card — seats credited', !!b && ADMIN.bundles.length > n0, b && b.id + ' ' + b.seats);
    step(5, 3); const dan = STORE.worlds.A.me.id; S.agy.as = { step: 4, b: b.id, c: 'Infection Prevention and Control', sel: [dan] }; render(); ACT.agAsConfirm(); prim();
    const as = STORE.agy.assign.find(x => x.lid === dan && x.bundle === b.id); ok('#5.3 seat assigned', !!as, as && as.status);
    step(5, 4); ok('#5.4 learner sees the sponsored course', W.enrolments.some(e => e.sponsor === 'CarePlus Recruitment (demo)' && /Infection/.test(e.title)) && /Infection Prevention/.test(main()));
  });

  await S_('#6 Refund', async () => {
    step(6, 1); const q0 = ADMIN.queue.length; ACT.finRaise(); prim(); await wait(50); $('#rr-t').value = 'Duplicate payment on the same day'; prim(); const i = ADMIN.queue[0];
    ok('#6.1 Finance A raised a refund', ADMIN.queue.length > q0 && i.type === 'Refund' && i.status === 'Pending', i.id + ' ' + i.raisedBy + ' → ' + i.first);
    step(6, 2); go('a-queue', { id: i.id }); ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); rsn(); prim(); ok('#6.2 Finance B approved', i.status === 'Approved' || i.status === 'Paid/Processed', i.status + ' by ' + ADMIN.me.name);
    step(6, 3); ACT.raiseRefund(); rsn('Goodwill'); prim(); const j = ADMIN.queue[0]; ok('#6.3 Super Admin refund processed immediately', j.type === 'Refund' && j.status === 'Approved' && !!j.processed, j.id + ' ' + j.status);
  });

  await S_('#7 Observation', async () => {
    const w = STORE.worlds.C;
    step(7, 1); ACT.obPropose({ dataset: { l: w.me.id } }); $('#op-l').value = w.me.id; INP.obPerm($('#op-l')); $('#op-d').value = D(12, '09:00').slice(0, 16); prim();
    const o = w.observations[0]; ok('#7.1 workplace observation proposed', o.status === 'Proposed' && o.locType !== 'office', o.id);
    step(7, 2); wpcSync(); const l = STORE.wpc.links.find(x => x.kind === 'obs' && x.v === 'C' && x.oid === o.id && wState(x) === 'valid'); ok('#7.2 email with a secure link to the workplace', !!l && STORE.wpc.emails.some(e => e.token === l.token));
    if (l) { go('w-visit', { id: l.token, tab: 'accept' }); SUBMIT.wpcAccept({ dataset: { t: l.token } }); } ok('#7.2 workplace accepted the date', o.status === 'Confirmed', o.status);
    step(7, 3); const id = 'C-' + o.id; go('t-obsrec', { id }); const dr = curDr(); ok('#7.3 record opens', !!dr); if (dr) { parseScope(o.scope).forEach(c => dr.nvq[c] = { o: true, c: true }); ACT.orSign({ dataset: { id } }); prim(); } ok('#7.3 observation recorded and locked', o.status === 'Completed', o.status);
    step(7, 4); const pl = wLinkByKey('C:perm:seed'); ok('#7.4 withdraw page from the confirmation email', /Withdraw permission/.test(main())); ACT.wpcStep({ dataset: { t: pl.token, s: 'confirm' } }); SUBMIT.wpcWithdraw({ dataset: { t: pl.token } });
    ok('#7.4 permission Withdrawn', w.workplace.perm === 'Withdrawn');
    step(7, 5); setUi('obTab', 'all'); render(); ok('#7.5 assessor sees Withdrawn + notified', /Withdrawn/.test(main()) && /Academy office/.test(STORE.tas.notifs[0].b)); setUi('obTab', 'upcoming');
    ok('#7.5 completed observation still valid', o.status === 'Completed');
    step(7, 6); ok('#7.6 Coordinator told of the withdrawal (CH-43)', STORE.coo.notifs.some(n => /Workplace permission withdrawn/.test(n.t))); S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-learner', { id: w.me.id }); ACT.chOrAdvise({ dataset: { id: w.me.id } }); $('#rsn').value = 'Workplace withdrew permission.'; prim();
    const rq = STORE.chOffReq.find(r => r.lid === w.me.id); ok('#7.6 Coordinator advises an Academy office observation (CH-43)', !!rq && rq.status === 'Awaiting consent');
    step(7, 7); ACT.chOrConsent({ dataset: { id: rq.id, a: 'accept' } }); prim(); ok('#7.7 learner agrees → Office observation request (CH-37)', rq.status === 'Pending approval' && !!rq.qid);
    // W0 (PD-W0-05) supersedes "#7.8 Coordinator approves": the same Coordinator advised this request at #7.6, so separation of
    // duties refuses their decision; an Academic Admin (the other decider named by CH-37) approves it from the Approvals Queue.
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-learner', { id: w.me.id }); ACT.chOrDecide({ dataset: { id: rq.qid, a: 'approve' } });
    ok('#7.8 (negative) the Coordinator who advised it can\'t approve it (refused, logged)', !MODAL && rq.status === 'Pending approval' && /^Blocked/.test(ADMIN.audit[0].action) && !document.querySelector('main .ch-orcard [data-act="chOrDecide"]') && /Academic Admin decides/.test(document.querySelector('main .ch-orcard').textContent));
    step(7, 8); ACT.qDo({ dataset: { id: rq.qid, a: 'approve' } }); $('#rsn').value = 'Agreed.'; prim(); ok('#7.8 Academic Admin approves', rq.status === 'Approved' && rq.decidedBy === 'Rachel Hughes');
    step(7, 9); S.tas.v = 'A'; tasEnter(); S.signedIn = true; ACT.obPropose({ dataset: { l: w.me.id } }); $('#op-l').value = w.me.id; INP.obPerm($('#op-l')); $('input[name="op-lt"][value="office"]').checked = true; INP.obLt(); $('#op-d').value = D(15, '10:00').slice(0, 16); prim();
    const off = w.observations[0]; ok('#7.9 Academy office observation proposed at the Luton office (CH-37)', off.locType === 'office' && off.status === 'Proposed' && off.office && off.office.name === 'Luton office' && rq.status === 'Booked');
    step(7, 10); ACT.obsAccept({ dataset: { id: off.id } }); prim(); ok('#7.10 learner accepted the office visit', off.status === 'Confirmed', off.status);
    ok('#7 no extra fee: one observation fee for the course (CH-38 / CH-43)', STORE.chFees.filter(f => f.lid === w.me.id).length === 1);
  });

  await S_('#8 Data correction', async () => {
    const w = STORE.worlds.C, cert = w.certs.filter(c => c.status === 'Valid').sort((a, b) => a.issued < b.issued ? 1 : -1)[0], oldNo = cert.no;
    step(8, 1); ok('#8.1 Raise Data Correction in the marking workspace', !!document.querySelector('[data-act="tasDC"]')); ACT.tasDC({ dataset: { k: 'IA-L-18022~a1' } });
    $('#dc-rec').value = 'name'; INP.dcRec($('#dc-rec')); $('#dc-new').value = 'Aisha Rahman-Khan'; $('#dc-r').value = 'Name misspelt on the certificate — passport checked'; prim();
    const i = ADMIN.queue[0]; ok('#8.1 raised by the Assessor', i.type === 'Data correction' && i.raisedBy === 'Sarah Okonkwo' && i.data.cert === cert.id, i.id);
    step(8, 2); go('a-queue', { id: i.id }); const acts = [...document.querySelectorAll('main [data-act="qDo"]')].map(b => b.dataset.a); ok('#8.2 System Admin can review', acts.length > 0, acts.join()); ACT.qDo({ dataset: { id: i.id, a: acts.includes('approve') ? 'approve' : acts[0] } }); rsn('Checked against ID'); prim();
    ok('#8.2 first review recorded; waiting for Super Admin final approval', isOpen(i) && i.history.length >= 2 && i.history.some(h => /Owen Price|System/.test(h[0])), i.status + ' ' + i.history.map(h => h[0] + ':' + h[2]).join(' | '));
    step(8, 3); go('a-queue', { id: i.id }); ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); rsn('Approved'); prim(); ok('#8.3 certificate re-issued', cert.supersedes === oldNo && cert.no !== oldNo, oldNo + ' → ' + cert.no);
    step(8, 4); go('certificates'); ok('#8.4 learner sees the new certificate', main().includes(cert.no));
    step(8, 5); verOpen(oldNo, 'q'); ok('#8.5 old QR shows Replaced', /Replaced/.test(main())); ACT.vBack && S.vBack && ACT.vBack();
  });

  await S_('#9 Agency purchase by bank transfer', async () => {
    step(9, 1); ACT.agBuy({ dataset: { id: 'CAT-1' } }); const inv = $('#modal-root input[name="gpm"][value="inv"]'); ok('#9.1 bank transfer option', !!inv); if (inv) inv.checked = true; prim(); prim();
    const i = ADMIN.queue[0]; ok('#9.1 request raised (no invoice document)', i.type === 'Agency invoice (offline) purchase' && i.status === 'Pending', i.id);
    step(9, 2); go('a-queue', { id: i.id }); ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); rsn('PO checked'); prim(); ok('#9.2 approved — awaiting payment', i.stage === 'awaiting' || /awaiting/i.test(i.decision || ''), i.status + ' ' + i.stage);
    step(9, 3); ACT.invPay({ dataset: { id: i.id } }); const r = $('#ip-r'); if (r) r.value = 'BACS-77001'; rsn('Received'); prim(); ok('#9.3 payment recorded, seats credited', i.status === 'Paid/Processed', i.status);
    step(9, 4); ok('#9.4 agency sees it paid', agyPurchases().some(x => x.ref === i.id && /Paid/.test(x.status)) && !/Download invoice|Invoice PDF/.test(main()), (agyPurchases().find(x => x.ref === i.id) || {}).status);
    step(9, 5); ok('#9.5 sponsored NVQ learner: no deposit, no fee schedule (CH-38: only the observation fee can be paid)', /Your course fees are covered by/.test(main()) && !W.plans.length && !/Pay deposit/i.test(main()) && [...document.querySelectorAll('main button')].filter(b => /Pay now/i.test(b.textContent)).every(b => b.closest('.ch-feecard')));
  });

  await S_('#10 Registration', async () => {
    const before = ADMIN.referrals.find(r => r.code === 'WB-FATIMA07').regs;
    step(10, 1); ok('#10.1 referral code prefilled and locked', $('#rg-ref') && $('#rg-ref').value === 'WB-FATIMA07' && $('#rg-ref').readOnly);
    const fill = v => Object.entries(v).forEach(([k, x]) => { const el = $(k); if (el.type === 'checkbox') el.checked = x; else el.value = x; });
    fill({ '#rg-name': 'Meera Iyer', '#rg-email': 'meera.iyer@in.example', '#rg-dial': '+91', '#rg-mob': '98200 44556', '#rg-country': 'India', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-terms': true, '#rg-priv': true }); SUBMIT.regSubmit(); MODAL.actions.find(a => a.label === 'Confirm').fn(); /* CH-01: confirm the country */
    ok('#10.2 OTP screen', S.auth === 'regVerify'); $$('.otp-i').forEach((b, k) => b.value = '123456'[k]); SUBMIT.regCode(); ok('#10.2 welcome', S.auth === 'welcome'); ACT.finishWelcome(); ok('#10.2 learner dashboard', S.route === 'dashboard' && S.signedIn);
    step(10, 3); const L = allLearners().find(l => l.email === 'meera.iyer@in.example'); ok('#10.3 visible in admin with country and data region (CH-02 GBP, CH-03 region UK)', !!L && L.country === 'India' && L.cur === 'GBP' && L.region === 'UK', L && L.cur + ' ' + L.region);
    step(10, 4); ok('#10.4 attribution counted', ADMIN.referrals.find(r => r.code === 'WB-FATIMA07').regs === before + 1);
  });

  await S_('#11 Agency link with consent', async () => {
    step(11, 1); ok('#11.1 Awaiting learner consent', /Awaiting learner consent/.test(main()));
    step(11, 2); const c = agyConsents().find(x => x.agency === 'Hartwell Home Care (demo)' && x.status === 'Awaiting learner consent'); ok('#11.2 dashboard prompt', /Hartwell Home Care \(demo\) wants to sponsor you/.test(main())); ACT.consentDo({ dataset: { id: c.id, y: '1' } });
    step(11, 3); ok('#11.3 Linked, no queue item', c.status === 'Linked' && !c.qid && /Linked/.test(main()));
    step(11, 4); const c2 = agyConsents()[0]; ok('#11.4 request for an enrolled course', c2.status === 'Awaiting learner consent' && c2.agency === 'Hartwell Home Care (demo)', c2.course);
    step(11, 5); ACT.consentDo({ dataset: { id: c2.id, y: '1' } }); ok('#11.5 awaiting Academy approval', c2.status === 'Awaiting Academy approval');
    step(11, 6); go('a-queue', { id: c2.qid }); ACT.qDo({ dataset: { id: c2.qid, a: 'approve' } }); rsn('Consent on file'); prim();
    step(11, 7); ok('#11.7 Linked', c2.status === 'Linked');
  });

  await S_('#12 Discount rate change', async () => {
    step(12, 1); ok('#12.1 editable form', !!$('#dr-std') && !$('#dr-std').readOnly); const std0 = discNow().std; $('#dr-std').value = String(std0 + 2); $('#dr-r').value = 'Price match'; SUBMIT.discSave(); const it = ADMIN.queue[0];
    ok('#12.1 Discount rate change item, rate unchanged', it.type === 'Discount rate change' && discNow().std === std0);
    step(12, 2); go('a-queue', { id: it.id }); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); rsn('OK'); prim(); ok('#12.2 approved', it.status === 'Approved');
    step(12, 3); ok('#12.3 new rate applies to new purchases', discNow().std === std0 + 2 && /Applies to new purchases/.test(main()));
  });

  await S_('#13 Data request', async () => {
    step(13, 1); ACT.compose({ dataset: { to: 'Academic Admin', sub: 'Data request' } }); $('#m-body').value = 'Please send me a copy of my data.'; prim(); const t = ADMIN.threads.find(x => x.lv && x.subject === 'Data request'); ok('#13.1 message sent', !!t);
    step(13, 2); go('a-messages', { id: t.id }); ACT.logDsrThread({ dataset: { id: t.id } }); rsn('Access request'); prim(); const d = ADMIN.dsr[0]; ok('#13.2 logged with a one-month deadline', d.status === 'Open' && !!dsrDue(d));
    step(13, 3); ACT.dsrExport({ dataset: { id: d.id } }); render(); ACT.dsrDone({ dataset: { id: d.id } }); rsn('Sent'); prim(); ok('#13.3 export generated and completed', !!d.exported && d.status === 'Completed');
    step(13, 4); ok('#13.4 learner notified', /Your data request is complete/.test(main()));
  });

  await S_('#14 Name change with a certificate', async () => {
    const w = STORE.worlds.D, cert = w.certs.find(c => c.status === 'Valid' || c.status === 'Expiring soon'), oldNo = cert.no;
    step(14, 1); ACT.reqChange({ dataset: { f: 'Full name', v: VNAME('D') } }); $('#pc-new').value = 'Grace Mensah-Owusu'; $('#pc-r').value = 'Married — deed poll attached'; prim(); const r = W.requests[0]; ok('#14.1 request sent', r.type === 'Profile change' && r.target === 'Full name', r.id);
    step(14, 2); const qid = 'AQ-' + r.id + '-D'; go('a-queue', { id: qid }); ok('#14.2 Convert to Data Correction', !!document.querySelector('[data-act="sysConvertDC"]')); ACT.sysConvertDC({ dataset: { id: qid } }); rsn('Certificate carries the old name'); prim(); const dc = ADMIN.queue[0]; ok('#14.2 Data Correction created', dc.type === 'Data correction' && dc.data.fromProfile === qid, dc.id);
    step(14, 3); go('a-queue', { id: dc.id }); const acts = [...document.querySelectorAll('main [data-act="qDo"]')].map(b => b.dataset.a); ACT.qDo({ dataset: { id: dc.id, a: acts.includes('approveFinal') ? 'approveFinal' : acts[0] } }); rsn('Approved'); prim();
    if (cert.no === oldNo && dc.status !== 'Approved') { const a2 = [...document.querySelectorAll('main [data-act="qDo"]')].map(b => b.dataset.a); go('a-queue', { id: dc.id }); ACT.qDo({ dataset: { id: dc.id, a: 'approveFinal' } }); rsn('Approved'); prim(); }
    ok('#14.3 certificate re-issued', cert.supersedes === oldNo && cert.no !== oldNo, acts.join() + ' ' + oldNo + ' → ' + cert.no);
    step(14, 4); verOpen(oldNo, 'q'); ok('#14.4 old certificate shows Replaced', /Replaced/.test(main())); ACT.vBack && S.vBack && ACT.vBack();
  });

  await S_('#15 Academic reactivation', async () => {
    step(15, 1); const b = document.querySelector('main [data-act="tasReact"]'); ok('#15.1 Request reactivation button', !!b); ACT.tasReact({ dataset: { l: 'IA-L-30755' } }); rsn('Learner has returned to work and is ready to continue'); prim();
    const i = ADMIN.queue.find(x => x.type === 'Reactivate enrolment — academic' && x.raisedBy === 'Sarah Okonkwo'); ok('#15.1 request raised', !!i, i && i.id);
    step(15, 2); go('a-queue', { id: i.id }); ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); rsn('Agreed'); prim(); ok('#15.2 approved', i.status === 'Approved');
    step(15, 3); const L = learnerById('IA-L-30755'); ok('#15.3 enrolment Active again', !(L.flags || []).includes('Discontinued enrolment') && !/Discontinued/.test((document.querySelector('main .page-h') || {}).textContent || ''), (L.flags || []).join());
  });

  // CH-01: scenario #16 "Learner moves country" removed (a new #16 comes with the sign-up flow)
  await S_('#16 removed (CH-01)', async () => { ok('CH-01 no scenario #16 "Learner moves country"', !SC_LIST().some(x => x[1] === 'Learner moves country')); });

  await S_('#17 Coordinator vs Academic Admin edit', async () => {
    step(17, 1); const b = myBatches().find(x => !roBatch(x)), e = batchEvents(b).find(x => x.type === 'deadline'); ok('#17.1 own batch deadline', !!e, b.code + ' ' + (e && e.title));
    ACT.cooEditEv({ dataset: { b: b.code, id: e.id } }); $('#ee-n').value = D(25, '17:00').slice(0, 16); $('#ee-r').value = 'Bank holiday'; prim(); ok('#17.1 saved by the Coordinator', findEv(b.code, e.id).e.start.slice(0, 10) === D(25, '17:00').slice(0, 10));
    step(17, 2); ACT.kEditEv({ dataset: { b: b.code, id: e.id } }); $('#ke-n').value = D(27, '17:00').slice(0, 16); $('#ke-r').value = 'Aligned with the other cohort'; prim(); if (MODAL) prim(); ok('#17.2 Academic Admin\'s save wins', findEv(b.code, e.id).e.start.slice(0, 10) === D(27, '17:00').slice(0, 10));
    step(17, 3); ok('#17.3 Coordinator notified', /after your edit — see history/.test(main()));
    step(17, 4); ACT.cooEditEv({ dataset: { b: b.code, id: e.id } }); ok('#17.4 both versions in history', MODAL && /Version history/.test(MODAL.body) && /Academic Coordinator/.test(MODAL.body) && /Academic Admin/.test(MODAL.body)); closeModal();
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
