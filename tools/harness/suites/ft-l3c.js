// L3-C — enrolment recovery when the batch starts before payment, client demo (suites.sh runs it with FIXTURE=client; a real reload,
// then Reset). Lena signs up for the Fully Assisted option; her batch then starts before she pays. Nothing is charged and she isn't
// enrolled into the started batch; the page says why and what she can do. With a later batch she moves her own application to it
// (confirmed) and pays there. Tom's bank deposit expires after the start (seat released); Finance confirms the money; he signs up
// again and the Academic Admin assigns the later batch. Ineligible batches (full, other fee option, other version, other payment terms)
// are never offered. Other roles are refused. Withdrawal and a new application work. Self-Paced deadlines and labels are checked.
(async function () {
  // P3 (PD-P3-02): the learner chooses their batch on sign-up step 1. Fixtures that relied on the automatic (CH-42) assignment now pick, on
  // the page, the earliest eligible batch (the one CH-42 assigned); a batch the fixture already set, and that is still eligible, is kept
  const p3Pick = () => { const w = W; if (!w || !p3Open(w) || chStepKey(w) !== 'details' || ui('suBatch', null) || (w.signup.batch && !p3Why(w, chBatch(w.signup.batch), { region: w.signup.l3cPin !== w.signup.batch }))) return; const r = S.route === 'admission' && document.querySelector('main input[name="su-batch"]'); if (r) { r.checked = true; INP.suBatch(r); } else { const b = p3Eligible(w)[0]; if (b) setUi('suBatch', b.code); } };
  const SS = window.sessionStorage, K = 'ft-l3c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = r => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const reset = () => { closeModal(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const at = iso => { CLOCK_SHIFT += new Date(iso).getTime() - now().getTime(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const later = (code, days, extra = {}) => { const c = JSON.parse(JSON.stringify(B())); Object.assign(c, { code, label: code, start: new Date(now().getTime() + days * 864e5).toISOString(), end: new Date(now().getTime() + (days + 365) * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], mcA: {}, mcH: [] }, extra); ADMIN.batches.push(c); return c; };
  const L = () => STORE.worlds.CD3, TOM = () => STORE.worlds.CD5;
  const opt = mode => r1Opts('NV-N1').find(x => x.mode === mode && x.status === 'Active');
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const r = $1(`#modal-root input[name="r1-opt"][value="${opt(mode).id}"]`); if (r) r.checked = true; press(); };
  const details = () => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d && !d.value) d.value = '1992-02-02'; if (a && !a.value) a.value = '5 Test Road, London'; lastToast = ''; (p3Pick(), ACT.suNext()); };
  const docsSign = () => { fxFast(ff => { W.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); }); (p3Pick(), ACT.suNext()); setUi('suSig', chFullName(W)); setUi('suDecl', true); ACT.suSign(); };
  const payCard = () => { setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); go('admission'); fxFast(ff => { click($1('main [data-act="suPay"]'), 'Pay'); if (MODAL) prim(); ff(3000); }); closeModal(); };
  const txOf = w => allTx().filter(x => x.v === w.v && !x.refund);
  // Lena: Fully Assisted; her batch then starts before payment. terms: she signs a letter version that carries {{payment_terms}}
  // (its payment wording includes the payment dates, which follow the batch start)
  const strandLena = (terms = false) => {
    if (terms) { as('aca'); ACT.cbrLetterUp({ dataset: { p: 'NV-N1' } }); setUi('chLetterFile', 'terms.docx'); const x = $1('#lt-x'); if (x) x.value = 'We offer you a place on the {{programme}}.\n\nTo accept, {{payment_terms}}.'; reason('L3C letter with payment terms'); }
    as('short'); apply('Fully Assisted'); details(); docsSign();
    B().start = new Date(now().getTime() - 2 * 864e5).toISOString(); // started two days ago; still Open
  };

  if (PH === 0) {
    await T('L3C-1 payment before the batch starts: unchanged', async () => {
      reset(); const n0 = B().enrolled, t0 = txOf(L()).length; as('short'); apply('Fully Assisted'); details(); docsSign(); payCard();
      ok('L3C-1 Lena pays before the start: enrolled in DEMO-L3-JAN27, one seat taken', L().signup.done && L().signup.batch === 'DEMO-L3-JAN27' && B().enrolled === n0 + 1 && txOf(L()).length === t0 + 1, J([L().signup.done, L().signup.batch, B().enrolled, n0, txOf(L()).length, lastToast]));
    });

    await T('L3C-2 the batch starts between signing and payment: nothing charged, the reason and next action shown', async () => {
      reset(); strandLena(true); const n0 = B().enrolled, t0 = txOf(L()).length, snap0 = J(L().signup.sig.snapshot), opt0 = J(L().signup.plan.opt);
      as('short'); go('admission');
      ok('L3C-2a the payment step says which batch started and when, and that nothing was charged', /DEMO-L3-JAN27 started on .*, before you paid/.test(main()) && /Nothing has been charged/.test(main()) && !$1('main [data-act="suPay"]'));
      ok('L3C-2b with no other batch: no batch can take her now — contact the Academy or withdraw', /No batch of this programme that hasn't started can take you/.test(main()) && !$1('main [data-act="l3cTake"]'));
      const a0 = ADMIN.audit.length; setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); lastToast = ''; const r = ACT.suPay();
      ok('L3C-2c ACT.suPay called directly is refused and logged; nothing charged, no plan, no seat', r === false && !MODAL && /* P3 (PD-P3-05): one refusal for every reason the chosen batch can't take her. Was: 'Blocked: pay for the sign-up (batch started before payment)' */ since(a0).some(x => x.action === 'Blocked: pay for the sign-up (chosen batch unavailable)') && !L().signup.done && txOf(L()).length === t0 && !(L().plans || []).some(p => p.e === 'nvq') && B().enrolled === n0, J([r, !!MODAL, since(a0).map(x => x.action), L().signup.done, txOf(L()).length, (L().plans || []).filter(p => p.e === 'nvq').length, B().enrolled, n0]));
      ok('L3C-2d her signed letter, fee option, delivery mode and status are unchanged (Payment Pending — nothing was paid)', J(L().signup.sig.snapshot) === snap0 && J(L().signup.plan.opt) === opt0 && l3bModeOf(L()).mode === 'Fully Assisted' && L().nvq.status === 'Payment Pending');
      as('aca'); go('a-learner', { id: L().me.id, tab: 'enrolments' });
      ok('L3C-2e Learner 360 shows the application\'s batch as started before payment, with Assign / change batch', /Started before payment/.test(main()) && !!$1('main .l3c-move [data-act="chMoveBatch"]'));
      ACT.chMoveBatch({ dataset: { id: L().me.id } });
      ok('L3C-2f the Academic Admin is told no batch can take her (no started batch is offered)', !!MODAL && /No batch can take this applicant/.test(mtxt()) && !$1('#l3c-b')); closeModal();
    });

    await T('L3C-3 ineligible batches are never offered: full, other fee option, other payment terms', async () => {
      const full = later('DEMO-L3-FULL', 40, { enrolled: 16, cap: 16 }), sp = later('DEMO-L3-SPONLY', 50, { w1opts: [opt('Self-Paced').id] }), soon = later('DEMO-L3-SOON', 10);
      as('short'); go('admission');
      ok('L3C-3a none of the three is offered to her', !$1('main [data-act="l3cTake"]') && !$1('main input[name="p3-re"]'));
      // P3 (PD-P3-03): listed among the batches she can't choose, with the reason. Was: /DEMO-L3-SOON: the payment terms there differ from your signed offer letter/
      ok('L3C-3b the batch with other payment terms is named as needing a new offer letter', /DEMO-L3-SOON — Payment terms differ from the signed offer letter — a new offer letter would be needed/.test(main()));
      ok('L3C-3c the reasons: no place, not taking her fee option, payment terms differ', l3cWhyNot(L(), full) === 'No place' && /fee option/.test(l3cWhyNot(L(), sp)) && /new offer letter/.test(l3cWhyNot(L(), soon)));
      const mar = later('DEMO-L3-MAR27x', 90); ok('L3C-3e her signed letter states payment dates from the batch start, so any later batch also needs a new offer letter (flagged, never rewritten)', /new offer letter/.test(l3cWhyNot(L(), mar)) && /due 3 Dec 2026/.test(L().signup.sig.snapshot.pay));
      ADMIN.batches = ADMIN.batches.filter(b => b !== mar);
      as('aca'); ACT.chMoveBatch({ dataset: { id: L().me.id } }); ok('L3C-3d the Academic Admin dialog lists them as not available, with the reasons', /No batch can take this applicant/.test(mtxt()) && /DEMO-L3-FULL.*No place/.test(mtxt()) && /DEMO-L3-SOON.*new offer letter/.test(mtxt())); closeModal();
      ADMIN.batches = ADMIN.batches.filter(b => ![full, sp, soon].includes(b));
    });

    await T('L3C-4 unauthorized changes are refused', async () => {
      const mar = later('DEMO-L3-MAR27', 90), lid = L().me.id;
      for (const p of ['fin', 'biz']) { as(p); lastToast = ''; ACT.chMoveBatch({ dataset: { id: lid } }); ok(`L3C-4 ${p}: Assign / change batch is refused`, !MODAL && /Only the Academic Admin or the Super Administrator/.test(lastToast) && L().signup.batch === 'DEMO-L3-JAN27'); }
      closeModal(); ACT.demoSignInAsTas({ dataset: { v: 'S' } }); S.signedIn = true; lastToast = ''; ACT.chMoveBatch({ dataset: { id: lid } }); ok('L3C-4 the staff portal is refused', !MODAL && L().signup.batch === 'DEMO-L3-JAN27');
      lastToast = ''; ACT.l3cTake({ dataset: { b: mar.code } }); ok('L3C-4 l3cTake outside the learner portal changes nothing', !MODAL && L().signup.batch === 'DEMO-L3-JAN27');
      as('nvq-sp'); lastToast = ''; ACT.l3cTake({ dataset: { b: mar.code } }); ok('L3C-4 another learner (Amira, enrolled) can\'t use it', !MODAL && /nothing to change/.test(lastToast) && STORE.worlds.CD1.signup.batch === 'DEMO-L3-JAN27');
      as('short'); const a0 = ADMIN.audit.length; lastToast = ''; ACT.l3cTake({ dataset: { b: 'DEMO-L3-JAN27' } });
      // P3 (PD-P3-05): l3cTake is the learner's own choice from the list; the batch that can't take her is refused. Was: 'Blocked: move application'
      ok('L3C-4 Lena can\'t pick a batch that isn\'t eligible (logged)', !MODAL && L().signup.batch === 'DEMO-L3-JAN27' && since(a0).some(x => x.action === 'Blocked: choose batch'));
    });

    await T('L3C-5 with a later batch she moves her own application (confirmed) and pays there', async () => {
      reset(); strandLena(); later('DEMO-L3-MAR27', 90); const t0 = txOf(L()).length;
      const mar = B('DEMO-L3-MAR27'), jan = B(), nJ = jan.enrolled, nM = mar.enrolled, snap0 = J(L().signup.sig.snapshot), opt0 = J(L().signup.plan.opt);
      as('short'); go('admission');
      // P3 (PD-P3-05): she chooses from the eligible batches (none preselected) instead of the one next batch. Was: "Next batch you can join:
      // DEMO-L3-MAR27" with an l3cTake button, "Move your application to …", history "Batch changed before payment", notice "Your batch has changed"
      ok('L3C-5a the page offers the batch she can join, none chosen for her', !!$1('main input[name="p3-re"][value="DEMO-L3-MAR27"]') && !$1('main input[name="p3-re"]:checked'), J([l3cWhyNot(L(), mar), l3cTermsIn(L(), mar), mar.start, main().slice(0, 400)]));
      { const r = $1('main input[name="p3-re"][value="DEMO-L3-MAR27"]'); r.checked = true; INP.p3Pick(r); } click($1('main [data-act="p3Rechoose"]'), 'Choose'); ok('L3C-5b a confirmation opens; nothing changes until she confirms', !!MODAL && /Choose DEMO-L3-MAR27/.test(MODAL.title) && L().signup.batch === 'DEMO-L3-JAN27');
      const a0 = ADMIN.audit.length; click(mbtn(/^Choose this batch$/), 'confirm');
      ok('L3C-5c moved: batch MAR27, history, notice, audit by the learner; no seat counts touched', L().signup.batch === 'DEMO-L3-MAR27' && L().admission.history.some(h => /Batch chosen again before payment: DEMO-L3-JAN27 → DEMO-L3-MAR27/.test(h[0])) && L().notifs.some(n => n.title === 'Your batch choice is saved') && since(a0).some(x => x.action === 'Batch chosen at sign-up' && /^Chosen by the learner/.test(x.reason)) && jan.enrolled === nJ && mar.enrolled === nM);
      ok('L3C-5d signed letter, fee option and mode unchanged', J(L().signup.sig.snapshot) === snap0 && J(L().signup.plan.opt) === opt0 && l3bModeOf(L()).mode === 'Fully Assisted');
      go('admission'); ok('L3C-5e the payment step is back, for MAR27', !!$1('main [data-act="suPay"]') && /DEMO-L3-MAR27/.test(main()));
      payCard(); const p = L().plans.find(x => x.e === 'nvq');
      ok('L3C-5f paid once: enrolled in MAR27 (one seat), JAN27 unchanged, payment 1 due at the MAR27 start', L().signup.done && L().signup.batch === 'DEMO-L3-MAR27' && mar.enrolled === nM + 1 && jan.enrolled === nJ && txOf(L()).length === t0 + 1 && p.rows[0].due.slice(0, 10) === mar.start.slice(0, 10), p && p.rows[0].due);
    });

    await T('L3C-6 withdrawal and a new application', async () => {
      reset(); strandLena(); const t0 = txOf(L()).length; as('short'); go('admission'); click($1('main [data-act="withdrawApp"]'), 'Withdraw'); press();
      ok('L3C-6a the stranded application is withdrawn; nothing was paid', L().admission.status === 'Withdrawn' && txOf(L()).length === t0, J([L().admission.status, txOf(L()).length, lastToast]));
      later('DEMO-L3-MAR27', 90); as('short'); apply('Fully Assisted'); details();
      ok('L3C-6b a new application is assigned the batch that hasn\'t started; the earlier one is kept', L().signup.batch === 'DEMO-L3-MAR27' && (L().nbPast || []).some(x => x.status === 'Withdrawn'));
    });

    await T('L3C-7 paid deposit, seat released after the start (Tom): Finance confirms, he signs up again, the Academy assigns a batch', async () => {
      reset(); at('2026-12-10T10:00:00Z'); as('nvq-bank'); go('dashboard');
      ok('L3C-7a setup: the hold expired after DEMO-L3-JAN27 started; seat released, deposit awaiting Finance', chReleased(TOM()) && chStarted(B()));
      as('fin'); ACT.finOffline({ dataset: { k: 'CD5|dep' } }); const r = $1('#op-r'); if (r) r.value = 'BACS-L3C'; reason('Transfer received');
      const tx0 = txOf(TOM()).length; ok('L3C-7b Finance confirms the deposit (one receipt)', tx0 === 1);
      as('nvq-bank'); ACT.chSignAgain(); details();
      // P3 (PD-P3-03): the details step says no batch can take him and lists JAN27 as started; Save and continue asks for a batch. Was: /DEMO-L3-JAN27: started/ in the toast and the page
      ok('L3C-7c signing up again: the details step says why no batch can be assigned (JAN27 started)', TOM().signup.again && TOM().signup.step === 1 && /Choose a batch to continue/.test(lastToast) && /can take you at the moment/.test(main()) && /DEMO-L3-JAN27 — Started on/.test(main()), lastToast);
      as('aca'); ACT.chMoveBatch({ dataset: { id: TOM().me.id } }); ok('L3C-7d the Academic Admin: no batch can take him yet', /No batch can take this applicant/.test(mtxt())); closeModal();
      const mar = later('DEMO-L3-MAR27', 83, { progVersion: 99 });
      ACT.chMoveBatch({ dataset: { id: TOM().me.id } }); ok('L3C-7e a batch on another programme version isn\'t offered to him (version fixed at his enrolment)', /Runs programme version 99/.test(mtxt()) && !$1('#l3c-b')); closeModal();
      mar.progVersion = TOM().nvq.progVersion; const a0 = ADMIN.audit.length;
      ACT.chMoveBatch({ dataset: { id: TOM().me.id } }); const sel = $1('#l3c-b'); ok('L3C-7f now eligible: the dialog offers DEMO-L3-MAR27', !!sel && sel.value === 'DEMO-L3-MAR27');
      reason('Seat released after the start; next batch');
      ok('L3C-7g assigned by the Academic Admin (reason audited); Tom notified', TOM().signup.batch === 'DEMO-L3-MAR27' && since(a0).some(x => x.action === 'Batch changed before payment' && /Seat released after the start/.test(x.reason)) && TOM().notifs.some(n => n.title === 'Your batch has changed'));
      const snap0 = J(TOM().signup.sig.snapshot), n0 = mar.enrolled; as('nvq-bank'); details(); go('admission');
      ok('L3C-7h he continues: the details step keeps the assigned batch and goes to payment (instalments only)', TOM().signup.batch === 'DEMO-L3-MAR27' && chStepKey(TOM()) === 'payment' && !!$1('main [data-act="suPay"]'));
      payCard();
      ok('L3C-7i paid: enrolled in MAR27; the confirmed deposit stays on his earlier record and isn\'t taken again', TOM().signup.done && mar.enrolled === n0 + 1 && txOf(TOM()).length === tx0 + 1 && (TOM().plansHist || []).some(p => p.deposit && p.deposit.status === 'Paid') && J(TOM().signup.sig.snapshot) === snap0);
    });

    await T('L3C-8 a Finance pause and enrolled learners: the existing rules stand', async () => {
      as('nvq-sp'); const lid = W.me.id; as('fin'); ACT.chPause({ dataset: { l: lid, e: 'nvq' } }); reason('L3C test');
      as('aca'); lastToast = ''; ACT.chMoveBatch({ dataset: { id: lid } });
      ok('L3C-8 an enrolled learner after the start can\'t be moved (CH-42 unchanged); her pause is kept', !MODAL && /can't be moved after their batch has started/.test(lastToast) && !!chPaused(lid, 'nvq'));
      CLOCK_SHIFT = 0;
    });

    await T('L3C-9 Self-Paced deadlines: a batch deadline change keeps resubmission deadlines; dashboard labels', async () => {
      reset(); const rd = '2026-12-20T20:59:00Z';
      ['CD1', 'CD2'].forEach(v => Object.assign(STORE.worlds[v].assignments.find(a => a.id === 'a10'), { status: 'Resubmission Required', resubDue: rd, round: 'Resub 1', resubUsed: 0 }));
      as('aca'); go('a-programmes', { id: 'NV-N1', tab: 'assessments' }); ACT.crDlEdit({ dataset: { b: 'DEMO-L3-JAN27', id: 'a10' } }); const d = $1('#cr-dl-d'); if (d) d.value = '2027-01-30T17:00'; reason('L3C deadline change');
      const A = (v, id) => STORE.worlds[v].assignments.find(a => a.id === id);
      ok('L3C-9a the batch deadline changed; Amira (Self-Paced) and Dev (Fully Assisted) keep their resubmission deadline', crDl('DEMO-L3-JAN27', 'a10').due === '2027-01-30T17:00:00.000Z' && A('CD1', 'a10').resubDue === rd && A('CD2', 'a10').resubDue === rd);
      ok('L3C-9b learners who hadn\'t submitted move with the batch deadline (unchanged rule)', A('CD4', 'a10').due === '2027-01-30T17:00:00.000Z');
      reset(); at('2027-01-19T12:00:00Z');
      as('nvq-sp'); go('dashboard');
      ok('L3C-9c Amira (Self-Paced) past the batch dates: no "Overdue — deadline passed", no overdue action, no "assignments" attention reason', !/Overdue — deadline passed/.test(main()) && /Past the batch due date — you can still submit/.test(main()) && !actionItems().some(x => x.cs === 'assignments') && !csReasons().includes('assignments'));
      A('CD1', 'a10').closed = true; go('dashboard');
      ok('L3C-9d a closed assignment is still overdue for her ("submission closed")', actionItems().some(x => x.cs === 'assignments' && /1 assignment overdue/.test(x.t) && /submission closed/.test(x.d)) && csReasons().includes('assignments'));
      A('CD1', 'a10').closed = false;
      as('nvq-fa'); go('dashboard');
      ok('L3C-9e Dev (Fully Assisted): unchanged — overdue, with the action and reason', /Overdue — deadline passed/.test(main()) && actionItems().some(x => x.cs === 'assignments' && /deadline passed/.test(x.d)) && csReasons().includes('assignments'));
      CLOCK_SHIFT = 0;
    });

    // For the refresh: Lena's application moved (not yet paid)
    await T('L3C-R0 setup for the refresh', async () => {
      reset(); strandLena(); later('DEMO-L3-MAR27', 90); as('short'); go('admission'); { const r = $1('main input[name="p3-re"][value="DEMO-L3-MAR27"]'); if (r) { r.checked = true; INP.p3Pick(r); } } click($1('main [data-act="p3Rechoose"]'), 'Choose'); click(mbtn(/^Choose this batch$/), 'confirm'); // P3: was l3cTake / "Move my application"
      ok('L3C-R0 Lena\'s application is for MAR27, unpaid', L().signup.batch === 'DEMO-L3-MAR27' && !L().signup.done);
      SS.setItem(K + 'snap', J(L().signup.sig.snapshot)); SS.setItem(K + 'tx', String(txOf(L()).length));
    });
    closeModal(); if (S.signedIn && ACT.logout) ACT.logout(); return next(1);
  }

  if (PH === 1) {
    await T('L3C-R after a real refresh', async () => {
      ok('L3C-R1 restored: her application is for MAR27, history and signed letter kept, nothing paid', FCP.st === 'saved' && !!FCP.restored && L().signup.batch === 'DEMO-L3-MAR27' && !L().signup.done && J(L().signup.sig.snapshot) === SS.getItem(K + 'snap') && /* P3: the learner's own choice is recorded in p3Hist (was signup.l3c) */ (L().signup.p3Hist || []).some(h => h.to === 'DEMO-L3-MAR27'));
      as('short'); go('admission'); ok('L3C-R2 the payment step is open for MAR27', !!$1('main [data-act="suPay"]'));
      payCard(); ok('L3C-R3 she pays once and is enrolled in MAR27', L().signup.done && L().signup.batch === 'DEMO-L3-MAR27' && txOf(L()).length === +SS.getItem(K + 'tx') + 1);
      ACT.resetDemo(); closeModal(); ok('L3C-R4 Reset demo: no MAR27 batch, Lena has no NVQ sign-up', !B('DEMO-L3-MAR27') && !(L().signup && L().signup.batch));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 'snap'); SS.removeItem(K + 'tx');
})();
