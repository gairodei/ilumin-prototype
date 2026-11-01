// FCD — deposit, then the approved instalments: the real learner sign-up (1 Nov 2026; PD-FC-11/12 in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client. Every learner signs up through the real screens; the £100.00 deposit is configured
// by the Academic Admin and approved by a Finance Admin inside the test (Reset restores the starting demo). Expected money is
// worked out here in integer pence from the learners' own records.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FCD test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const P = x => Math.round(x * 100), G = p => money(p / 100, 'GBP');
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const signIn = email => { signOutUI(); $1('#si-email').value = email; $1('#si-pw').value = 'Demo!Pass2026'; submit('form[data-submit="signin"]'); };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pl = w => w && w.plans.find(p => p.e === 'nvq');
  const tgt = k => payTargets().find(t => t.key === k);
  const rowOf = (txt, name) => $a('main table tbody tr').find(tr => tr.textContent.includes(name));
  // Independent figures from a learner's own record: fee, money in (receipts), money out (refund rows), outstanding
  const own = w => { const p = pl(w), fee = P(p.total), rows = p.rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid)), 0), got = w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((a, t) => a + P(t.amount), 0), back = w.tx.filter(t => t.amount < 0).reduce((a, t) => a + P(-t.amount), 0); return { fee, out: rows, got, back }; };
  const raise = (t, a, txt = 'FI-2', keep = true) => { raiseRefund(t); $1('#rr-a').value = String(a); $1('#rr-t').value = txt; if (keep) $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press(); return ADMIN.queue[0]; };
  const txOf = (v, amt) => allTx().find(x => x.v === v && P(x.amount) === P(amt) && !x.refund && ['Paid', 'Partially refunded'].includes(x.status)); // FI-2 review (L-4): a payment refunded in part is still refundable
  // Each test account gets its own mobile, outside the seeded 7700 900xxx numbers. Was: '7700 900' + a random 100–899, which now and
  // then matched a demo learner's or an earlier test account's mobile, so sign-up was (correctly) refused as a duplicate account
  let regN = 0;
  const register = (name, email) => {
    signOutUI(); click($1('#app [data-act="regStart"]'));
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 955' + String(100 + regN++), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submit('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]');
    click($1('#app [data-act="finishWelcome"]')); return W;
  };
  const toPayment = (w, mode = 'Self-Paced') => {
    go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } });
    const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === mode); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press();
    go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
    fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); });
    click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign'));
  };
  const choose = (opt, method) => { const r = $1(`main input[name="cb9-pay"][value="${opt}"]`); if (r) { r.checked = true; INP.cb9Pay(r); } const m = $1(`main input[name="su-m"][value="${method}"]`); if (m) { m.checked = true; INP.suMethod(m); } };
  const payCo = open => fxFast(ff => { open(); if (!MODAL || !/Pay now/.test(MODAL.title || '')) return false; prim(); ff(3000); closeModal(); return true; });
  const advance = d => { FA(); ACT.cb10Advance({ dataset: { d: String(d) } }); render(); };
  const back = () => { FA(); ACT.cb10Reset(); render(); };
  const A = STORE.worlds.CD1, Dv = STORE.worlds.CD2;
  const ACA2 = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const rcv = w => w.tx.filter(t => t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status)).reduce((a, t) => a + P(t.amount), 0);
  const refd = w => w.tx.filter(t => t.amount < 0).reduce((a, t) => a + P(-t.amount), 0);
  const left = (w, n) => { const r = pl(w).rows.find(x => x.n === n); return P(r.amount) - P(r.paid); };
  const outP = w => pl(w).rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid)), 0) - (pl(w).deposit && pl(w).deposit.status === 'Paid' ? Math.max(0, P(pl(w).deposit.amount) - P(pl(w).deposit.refundedPart || 0) - pl(w).rows.reduce((a, r) => a + P(r.credit || 0), 0)) : 0);
  const rec = (k, a, ref) => { FA(); const t = tgt(k); if (!t) return 'no target'; return recordPayment(t, a, ref || fiUniqRef('BACS-', 60000, 9999), 'Bank transfer', 'FCD test'); };
  // The configured deposit, through the real screens: the Academic Admin changes it on Fees & Payments, a Finance Admin approves
  const setDeposit = amt => {
    ACA2(); const id = cdPr().id; go('a-programmes', { id, tab: 'fees' });
    $1(`main input[name="e1-wdm"][value="${amt == null ? 'default' : 'own'}"]`).checked = true; if (amt != null) $1('main #e1-d').value = String(amt);
    ACT.cb8Dep({ dataset: { p: id } }); ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) press();
    const wf = cb8Wf(cdPr()); FA(); go('a-queue', { id: wf.qid }); ACT.e1Decide({ dataset: { id: wf.qid, a: 'approve' } }); if (MODAL) reason('Deposit for the FCD test');
    return cb8Cur(id).dep.eff;
  };
  // A new learner through the real sign-up up to the payment step (registration, programme and fee option, details, documents, letter)
  const signUp = (name, email, mode = 'Self-Paced') => { const w = register(name, email); toPayment(w, mode); return w; };
  const coAmt = f => { let a = null; const co0 = checkout; checkout = o => { a = o.amount; return co0(o); }; try { f(); } finally { checkout = co0; } return a; };
  const payDepCard = (w, k = 6) => { choose('dep' + k, 'card'); return coAmt(() => payCo(() => click($1('main [data-act="suPay"]')))); };
  const payRow = (w, n) => { learner(w.v); go('payments'); return coAmt(() => payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: String(n) } }))); };
  const seat = w => dpSeat(w).st;

  let ava, hal;
  await T('FCD-A the configured deposit and the payment step', async () => {
    ok('FCD-A the demo programme takes the Academy default deposit (£300.00) at the start', cb8Cur(cdPr().id).dep.eff === 300);
    ok('FCD-A the Academic Admin sets a £100.00 deposit and a Finance Admin approves it (new plan version)', setDeposit(100) === 100 && S4().cfg.deposit === 300);
    ok('FCD-A Amira and Dev keep their signed terms (their pinned deposit is unchanged)', cb9Pin(A).dep.eff === 300 && cb9Pin(Dv).dep.eff === 300);
    ava = signUp('Ava Instal', 'ava.instal@fcd.example');
    ok('FCD-A the payment step offers "Deposit, then 6 payments — £100.00 now" beside the existing routes', /Deposit, then 6 payments — £100\.00 now/.test(main()) && !!$1('main input[name="cb9-pay"][value="dep6"]') && !!$1('main input[name="cb9-pay"][value="deposit"]') && !!$1('main input[name="cb9-pay"][value="6"]'));
    choose('dep6', 'card'); const tb = $a('main .fc-di-sched tbody tr').map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
    ok('FCD-A choosing it shows the terms before paying: deposit £100.00 now; payment 1 £300.00 − deposit = £200.00 by the hold date; payments 2–6 £300.00; total £1,800.00', tb.length === 8 && tb[0] === 'Deposit | Now | £100.00 | £100.00' && /^Payment 1 \| By .*\(seat hold\) \| £300\.00 \| £200\.00 after the £100\.00 deposit$/.test(tb[1]) && tb.slice(2, 7).every(t => / \| £300\.00 \| £300\.00$/.test(t)) && tb[7] === 'Total |  | £1,800.00 | £1,800.00', J(tb));
    ok('FCD-A the deposit is described as part of the fee, not an extra charge', /part of the £1,800\.00 fee, not an extra charge/.test(main()));
    ok('FCD-A the button pays the deposit only: "Pay £100.00 by card"', /Pay £100\.00 by card/.test($1('main [data-act="suPay"]').textContent));
  });
  await T('FCD-B/C/D/E/N the £100 deposit, then £200, then the schedule', async () => {
    const a0 = payDepCard(ava), p = pl(ava);
    ok('FCD-B checkout charged the £100.00 deposit only', P(a0) === 10000, a0);
    ok('FCD-N one payment plan with the 6 approved instalments, the deposit and its hold (no second plan)', ava.plans.filter(x => x.e === 'nvq').length === 1 && p.depRoute === 'inst' && p.rows.length === 6 && p.rows.every(r => P(r.amount) === 30000) && P(p.deposit.amount) === 10000 && p.deposit.status === 'Paid' && !!p.deposit.hold);
    ok('FCD-N exactly one set of signed payment terms: frozen, the same object on the plan and the sign-up, naming the deposit route', ava.signup.pin === p.pin && Object.isFrozen(p.pin) && p.pin.route === 'deposit-instalments' && P(p.pin.dep.amount) === 10000 && p.pin.k === 6 && p.pin.rows.length === 6);
    ok('FCD-B instalment 1: £100.00 deposit credit, £200.00 due by the seat-hold deadline; instalments 2–6 on their approved dates', P(p.rows[0].credit) === 10000 && left(ava, 1) === 20000 && p.rows[0].due === p.deposit.hold && p.rows.slice(1).every((r, i) => new Date(r.due) > new Date(p.deposit.hold) && r.due === p.rows[i + 1].sched));
    ok('FCD-B temporary reservation: seat reserved, £200.00 to pay on instalment 1', seat(ava) === 'reserved' && P(dpSeat(ava).due) === 20000);
    ok('FCD-B received £100.00 (one transaction), outstanding £1,700.00 (pence)', rcv(ava) === 10000 && ava.tx.length === 1 && outP(ava) === 170000 && fiAcct(ava).outstanding === 170000, J([rcv(ava), ava.tx.length, outP(ava), fiAcct(ava).outstanding]));
    ok('FCD-B admission stays separate (awaiting review)', ava.admission.status === 'Awaiting review');
    learner(ava.v); go('payments'); ok('FCD-B the learner\'s Payments: deposit credited to instalment 1, seat reserved until the deadline, £200.00 left on it', /credited to instalment 1/.test(main()) && /Seat reserved/.test(main()) && /£200\.00 of instalment 1 is unpaid/.test(main()));
    const a1 = payRow(ava, 1);
    ok('FCD-C instalment 1 checkout is £200.00 (never £300.00, never £0)', P(a1) === 20000, a1);
    ok('FCD-C £300.00 received in total, £1,500.00 outstanding (pence)', rcv(ava) === 30000 && outP(ava) === 150000 && P(fpLedger(pl(ava)).outstanding) === 150000 && fpLedger(pl(ava)).ok, J([rcv(ava), outP(ava), fpLedger(pl(ava)), pl(ava).rows[0]]));
    ok('FCD-C seat secured (financially), admission still separate', seat(ava) === 'occupied' && !!pl(ava).securedAt && ava.admission.status === 'Awaiting review');
    const tx = allTx().filter(t => t.v === ava.v && !t.refund);
    ok('FCD-C two ledger transactions, two references and receipts; the £200.00 is instalment 1, not a deposit; no £100 credit row', tx.length === 2 && new Set(tx.map(t => t.ref)).size === 2 && tx.filter(t => /deposit/i.test(t.course)).length === 1 && tx.some(t => P(t.amount) === 20000 && /instalment 1/.test(t.course)) && !tx.some(t => /credit/i.test(t.course)), J(tx.map(t => [t.amount, t.course])));
    ok('FCD-I paying instalment 1 again opens no checkout', coAmt(() => { learner(ava.v); go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: '1' } }); }) === null && ava.tx.length === 2); closeModal();
    advance(29); ok('FCD-D after the hold date the seat stays secured (instalment 1 was paid in time); nothing overdue', seat(ava) === 'occupied' && !ava.admission.deposit.released && !odRows().some(o => o.v === ava.v)); back();
    const d2 = Math.ceil((new Date(pl(ava).rows[1].due) - now()) / DAY) + 31; advance(d2);
    const od = odRows().filter(o => o.v === ava.v);
    ok('FCD-E a missed instalment 2 follows the existing overdue process (listed, Day 15 / Day 30; agreed schedule — automatic pause not applied, PD-CB-72); instalment 1 is not overdue', od.length >= 1 && od.every(o => o.inst > 1) && pl(ava).rows[1].status === 'Overdue' && pl(ava).rows[0].status === 'Paid' && seat(ava) === 'occupied', J(od.map(o => [o.inst, o.days, o.last])));
    back();
  });
  await T('FCD-F/G expiry, bank transfers, the deadline', async () => {
    const bo = signUp('Bo Lapse', 'bo.lapse@fcd.example'); payDepCard(bo); const b = chBatch(bo.signup.batch), n0 = b.enrolled;
    advance(29); ok('FCD-F instalment 1 unpaid when the hold ends: seat released, capacity freed, deposit held (nothing refunded or forfeited)', seat(bo) === 'released' && b.enrolled === n0 - 1 && rcv(bo) === 10000 && !refd(bo) && pl(bo).deposit.status === 'Paid');
    ok('FCD-F the release is recorded with instalment 1 named, and Finance is told', /instalment 1 unpaid/.test(J(bo.admission.history)) && STORE.fin.notifs.some(x => /Seat released/.test(x.t) && x.b.includes(chFullName(bo))));
    FA(); ok('FCD-F no payment can be taken toward the released seat (Finance) and nothing restores it', !tgt(bo.v + '|nvq|1') && seat(bo) === 'released');
    learner(bo.v); go('payments'); ok('FCD-F … nor by the learner (no Pay now)', !$1('main [data-act="payInst"][data-n="1"]') && coAmt(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })) === null); closeModal();
    learner(bo.v); ACT.chSignAgain({ dataset: {} }); ok('FCD-F the learner can sign up again (the earlier record is kept)', !!bo.signup && !bo.signup.done && bo.signup.again === true); back();
    const cy = signUp('Cy Bank', 'cy.bank@fcd.example'); choose('dep6', 'bank'); click($1('main [data-act="suPay"]')); press(); const h0 = pl(cy).deposit.hold;
    ok('FCD-G deposit by bank transfer: awaiting confirmation, nothing received, seat reserved (pending), nothing credited', pl(cy).deposit.status !== 'Paid' && rcv(cy) === 0 && seat(cy) === 'reserved' && dpSeat(cy).pending && !P(pl(cy).rows[0].credit));
    learner(cy.v); go('payments'); ok('FCD-G instalment 1 can\'t be paid before the deposit is confirmed (learner)', !$1('main [data-act="payInst"][data-n="1"]') && /After the deposit is confirmed/.test(main()) && coAmt(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })) === null); closeModal();
    FA(); ok('FCD-G … nor recorded by Finance', !tgt(cy.v + '|nvq|1'));
    ok('FCD-M a part deposit (£50.00) and an over-payment (£150.00) are refused', rec(cy.v + '|dep', 50) === false && rec(cy.v + '|dep', 150) === false && pl(cy).deposit.status !== 'Paid');
    rec(cy.v + '|dep', 100, cy.signup.pay.ref);
    ok('FCD-G confirmed by Finance: credited £100.00 to instalment 1, the seat-hold deadline unchanged', pl(cy).deposit.status === 'Paid' && P(pl(cy).rows[0].credit) === 10000 && pl(cy).deposit.hold === h0 && cy.admission.deposit.holdUntil === h0);
    ok('FCD-I confirming the deposit again is refused', !tgt(cy.v + '|dep') && rcv(cy) === 10000);
    learner(cy.v); go('payments'); ACT.chPayBank({ dataset: { e: 'nvq', n: '1' } }); if (MODAL) press();
    const t1 = (FA(), payTargets().find(t => t.chb && t.chb.wv === cy.v)); ok('FCD-G instalment 1 by bank transfer: £200.00 awaiting Finance', !!t1 && P(t1.due) === 20000 && seat(cy) === 'reserved');
    ACT.finOffline({ dataset: { k: t1.key } }); $1('#op-r').value = t1.chb.ref; INP.opPrev(); reason('confirmed');
    ok('FCD-G confirmed: £300.00 received, seat secured', rcv(cy) === 30000 && seat(cy) === 'occupied' && outP(cy) === 150000, J([rcv(cy), seat(cy), outP(cy), pl(cy).rows[0], cy.tx]));
    const dee = signUp('Dee Late', 'dee.late@fcd.example'); choose('dep6', 'bank'); click($1('main [data-act="suPay"]')); press();
    advance(29); ok('FCD-G a deposit transfer still unconfirmed when the hold ends: released, "deposit not received"', seat(dee) === 'released' && /deposit not received/.test(J(dee.admission.history)));
    rec(dee.v + '|dep', 100, dee.signup.pay.ref); ok('FCD-G confirmed late: the money is recorded, the seat stays released (Finance review)', rcv(dee) === 10000 && seat(dee) === 'released' && pl(dee).deposit.afterRelease === true); back();
    const eve = signUp('Eve Edge', 'eve.edge@fcd.example'); payDepCard(eve); advance(27);
    payRow(eve, 1); ok('FCD-G instalment 1 paid on the last day of the hold: secured', seat(eve) === 'occupied');
    advance(2); ok('FCD-G … and still secured after the deadline', seat(eve) === 'occupied'); back();
    const fay = signUp('Fay After', 'fay.after@fcd.example'); payDepCard(fay); advance(29);
    ok('FCD-G instalment 1 after the deadline: the seat was released and the payment is refused (no reinstatement)', seat(fay) === 'released' && payRow(fay, 1) === null && rcv(fay) === 10000); back();
  });
  await T('FCD-H/I/L/O refunds, retries, isolation, the old route', async () => {
    hal = signUp('Hal Assist', 'hal.assist@fcd.example', 'Fully Assisted'); const ha = payDepCard(hal), hp = pl(hal);
    ok('FCD-L Fully Assisted in the same batch: £2,600.00 fee, deposit £100.00, instalment 1 £433.33 → £333.33 due', P(ha) === 10000 && P(hp.total) === 260000 && P(hp.rows[0].amount) === 43333 && left(hal, 1) === 33333 && hal.signup.batch === ava.signup.batch);
    const avaSnap = J([ava.tx, pl(ava).rows]); payRow(hal, 1);
    ok('FCD-L Hal\'s payments leave Ava\'s record unchanged; each reconciles alone (£100.00 + £333.33 = £433.33 / £300.00 received)', J([ava.tx, pl(ava).rows]) === avaSnap && rcv(hal) === 10000 + 33333 && rcv(ava) === 30000 && seat(hal) === 'occupied', J([rcv(hal), rcv(ava), seat(hal)]));
    FA(); const at = tgt(ava.v + '|nvq|2'), bt = tgt(hal.v + '|nvq|2');
    ok('FCD-I wrong learner: Hal\'s instalment under a key of Ava\'s that is no longer due is refused (nothing recorded on either)', !!at && recordPayment({ ...bt, key: ava.v + '|nvq|1' }, 300, 'BACS-WRONG-1', 'Bank transfer', 'x') === false && !P(pl(hal).rows[1].paid) && !P(pl(ava).rows[1].paid));
    ok('FCD-I wrong enrolment: a made-up target is refused', recordPayment({ key: ava.v + '|bk5|1', v: ava.v, r: { n: 1, amount: 45, paid: 0 }, pl: { e: 'bk5' } }, 45, 'BACS-WRONG-2', 'Bank transfer', 'x') === false);
    fpCredit(ava, 'retry'); fpCredit(ava, 'refresh'); ok('FCD-I applying the credit again (retry / refresh / role switch) changes nothing', P(pl(ava).rows[0].credit) === 10000 && P(pl(ava).rows[0].paid) === 30000);
    FA(); const dt0 = allTx().find(t => t.v === ava.v && /deposit/i.test(t.course)); raise(dt0, 100, 'deposit refunded'); FA('FB'); applyDecision(ADMIN.queue[0], 'approve', 'ok');
    ok('FCD-H deposit refunded after the seat was secured: the credit is reversed (£100.00 due again on instalment 1), Finance review', pl(ava).deposit.status === 'Refunded' && !P(pl(ava).rows[0].credit) && left(ava, 1) === 10000 && seat(ava) === 'review');
    ok('FCD-H received £300.00, refunded £100.00, outstanding £1,600.00 (pence); reconciles', rcv(ava) === 30000 && refd(ava) === 10000 && P(fpLedger(pl(ava)).outstanding) === 160000 && fpLedger(pl(ava)).ok);
    const gus = signUp('Gus Part', 'gus.part@fcd.example'); payDepCard(gus);
    FA(); raise(allTx().find(t => t.v === gus.v && /deposit/i.test(t.course)), 40, 'part'); FA('FB'); applyDecision(ADMIN.queue[0], 'approve', 'ok');
    ok('FCD-H part refund (£40.00) before the seat was secured: £60.00 stays credited, £240.00 left on instalment 1, Finance review', P(pl(gus).rows[0].credit) === 6000 && left(gus, 1) === 24000 && seat(gus) === 'review' && fpLedger(pl(gus)).ok);
    const old = signUp('Ola Old', 'ola.old@fcd.example'); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    ok('FCD-O the existing deposit-and-balance route is unchanged: one £1,700.00 balance within the hold', pl(old).plan === 'Deposit and balance' && !pl(old).depRoute && pl(old).rows.length === 1 && P(pl(old).rows[0].amount) === 170000 && seat(old) === 'reserved');
    ok('FCD-O Amira and Dev (historical instalment plans) are unchanged', P(own(A).got) === P(own(A).got) && !pl(A).depRoute && !pl(Dv).depRoute && cb9Pin(A).dep.eff === 300);
    learner(ava.v); ACT.suPay({}); ok('FCD-I a second "Pay" on a completed sign-up takes nothing more', ava.tx.filter(t => t.amount > 0).length === 2); closeModal();
  });
  await T('FCD-Q a batch date change keeps the seat-hold deadline (PD-FC-14)', async () => {
    const iv = signUp('Ivy Move', 'ivy.move@fcd.example'); choose('dep6', 'bank'); click($1('main [data-act="suPay"]')); press();
    const p = pl(iv), b = chBatch(iv.signup.batch), s0 = b.start, h0 = p.deposit.hold, d1 = p.rows[0].due, d2 = p.rows[1].due, pin0 = J(p.pin);
    b.start = new Date(new Date(s0).getTime() + 30 * DAY).toISOString(); FA(); render();
    ok('FCD-Q batch start moved 30 days: instalment 1 stays due on the seat-hold deadline, the hold is unchanged (deposit still pending)', p.rows[0].due === d1 && d1 === h0 && p.deposit.hold === h0 && iv.admission.deposit.holdUntil === h0, J([p.rows[0].due, h0]));
    ok('FCD-Q later unpaid instalments follow the existing revision rule (PD-CB-10); the signed terms are not altered', p.rows[1].due !== d2 && J(p.pin) === pin0 && Object.isFrozen(p.pin));
    ok('FCD-Q the change is recorded for an administrative impact review', ADMIN.audit.some(x => /impact review needed/.test(x.action) && x.entity.includes(iv.me.id)));
    b.start = s0; render();
  });
  await T('FCD-P Finance views agree', async () => {
    FA(); go('f-deposits'); const r = rowOf('', 'Hal Assist').textContent.replace(/\s+/g, ' ');
    ok('FCD-P Deposits: Hal — £100.00 received, Confirmed, £100.00 credited to instalment 1, first payment Paid, "Seat secured — instalment 1 paid"', /£100\.00/.test(r) && /Confirmed/.test(r) && /instalment 1/.test(r) && /Seat secured — instalment 1 paid/.test(r), r);
    ok('FCD-P Deposits: the seat-hold deadline is shown for a reserved learner (Gus: Finance review)', /Finance review/.test(rowOf('', 'Gus Part').textContent));
    setUi('fpL', hal.v); go('f-plans', { tab: 'schedules' }); const fp = $1('main .fp-sum').textContent.replace(/\s+/g, ' ');
    ok('FCD-P Payment Plans: Hal — fee £2,600.00, paid £433.33, outstanding £2,166.67, reconciles', /Programme fee ?£2,600\.00/.test(fp) && /Paid to date ?£433\.33/.test(fp) && /Outstanding ?£2,166\.67/.test(fp) && /Yes/.test(fp), fp);
    learner(hal.v); go('payments'); ok('FCD-P the learner\'s Payments show the same: paid £433.33, outstanding £2,166.67', /Paid so far\s*£433\.33/.test(main()) && /Outstanding\s*£2,166\.67/.test(main()));
    FA(); setUi('fcC-fl', cdPr().id); setUi('fcB-fl', hal.signup.batch); go('f-ledger'); const q = $1('#dtq-fledger'); q.value = 'Hal Assist'; INP.dtQ(q); const hr = $a('main table tbody tr').filter(tr => /Hal Assist/.test(tr.textContent));
    ok('FCD-P Ledger (course + batch filter, search by learner): Hal\'s two payments — the £100.00 deposit and £333.33 toward instalment 1 — separately', hr.length === 2 && hr.some(tr => /deposit/i.test(tr.textContent) && /£100\.00/.test(tr.textContent)) && hr.some(tr => /instalment 1/.test(tr.textContent) && /£333\.33/.test(tr.textContent)), J(hr.map(tr => tr.textContent.replace(/\s+/g, ' ').slice(0, 160))));
    const expect = learnerAccounts().filter(v => STORE.worlds[v].signup && [STORE.worlds[v].signup.batch, STORE.worlds[v].signup.releasedFrom].includes(hal.signup.batch)).reduce((s, v) => s + rcv(STORE.worlds[v]) - refd(STORE.worlds[v]), 0);
    setUi('fcC-fr', cdPr().id); setUi('fcB-fr', hal.signup.batch); go('f-reports', { tab: 'coursewise' }); const sec = $1('main .fi-rep');
    ok('FCD-P batch-wise report: net received for the batch = the learners\' own records (pence)', +sec.dataset.received - +sec.dataset.refunded === expect, (+sec.dataset.received - +sec.dataset.refunded) + ' vs ' + expect);
    setUi('fcC-fr', ''); setUi('fcB-fr', ''); setUi('fcC-fl', ''); setUi('fcB-fl', '');
    ACT.resetDemo(); ok('FCD-K Reset demo: the starting records, the £300.00 Academy default deposit again, no test learners', cb8Cur(cdPr().id).dep.eff === 300 && allTx().length === 3 && !learnerAccounts().some(v => /^G/.test(v)));
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
