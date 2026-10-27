// FP — deposit credit and instalments (Part A) and the optional short-course certificate (Part B), 27 Oct 2026.
// Every check acts through the screen or handler, then reads the consuming screen or record, with the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FP test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  let codeN = 0;
  // A Level 3 programme made in the builder, its package approved by the Super Administrator (D8), published, with a batch
  const prog = (o = {}) => {
    SA(); go('a-programmes'); ACT.chProgNew(); const n = ++codeN;
    fill({ '#np-t': 'CB9 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (4400 + n) + '/9', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    (document.querySelector('#np-code') || {}).value = 'CB9C' + n; document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    const rows = [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }];
    rows.forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = crT(ACT.cbDetCreate)(); closeModal(); const id = pr.id;
    // structure (an Observation Learning Outcome when the course has observations), letter, observation configuration
    go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U9' + n, '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/9' + n }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    if (o.obs) { add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Demonstrate practice', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe practice', '#c-e': 'Observed at work' });
      ACT.n5Settings({ dataset: { p: id } }); radio('n5-req', 'yes'); radio('n5-wp', 'Permitted'); radio('n5-off', 'Available'); press();
      const d = n5Draft(pr); n5NvqOk(pr, d).forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c: c.code } }); document.querySelectorAll('#modal-root .n5-ev').forEach(x => { x.checked = x.value === 'notes'; }); press(); });
      ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1'; document.querySelectorAll('#modal-root .ev-l, #modal-root .ev-c').forEach(x => { if (!x.disabled) x.checked = true; }); press(); }
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('First version');
    // the package: Fully Assisted in full, 4 or 6 payments; Self-Paced in full or 3; observation fees £70 workplace, £0 office
    const [a, b] = cb8Work(pr).opts, payTo = (oid, ks) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); };
    if (o.obs) [a, b].forEach(x => { ACT.cb8Opt({ dataset: { p: id, o: x.id } }); document.querySelector('#modal-root #c8-wp').value = '70'; document.querySelector('#modal-root #c8-off').value = '0'; press(); });
    payTo(a.id, [1, 4, 6]); payTo(b.id, [1, 3]);
    ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms');
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    if (pr.status !== 'Active') R.push('FAIL CB9 (setup) publish — ' + J(ch8Check(pr).block));
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'CB9B' + n }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const bt = ADMIN.batches.find(x => x.code === 'CB9B' + n); bt.start = o.start || D(40, '09:00'); bt.end = D(240, '17:00');
    return { pr, a: a.id, b: b.id, bt };
  };
  // A learner signs up (fee option), reaches the payment step in the given batch
  const signUp = (v, P, optId) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === P.pr.title); ACT.applyNvq({ dataset: { id: c.id } });
    const dlg = MODAL ? document.querySelector('#modal-root').textContent : ''; const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; prim(); closeModal();
    const w = W; chSetBatch(w, P.bt); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, P.bt); render();
    return { w, dlg };
  };
  const choose = k => { setUi('cb9Pay', String(k)); render(); };
  const payCard = (w, k) => { if (k != null) setUi('cb9Pay', String(k)); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-FP'); closeModal(); return { g, pl: w.plans.find(p => p.e === 'nvq') }; };
  const P2 = x => Math.round(x * 100);
  const nvq = w => w.plans.find(p => p.e === 'nvq');
  // Opens a checkout from fn() and returns what it asked for, without paying (or paying p when given)
  const grab = (fn, pay) => { const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { fn(); } finally { checkout = _co; } if (g && pay != null) g.onSuccess(pay, 'TXN-FP' + Math.floor(Math.random() * 1e4)); closeModal(); return g; };
  // A schedule worked out from the FULL fee with a deposit (no approved plan does this today — the model must still handle it)
  const gross = (w, rows, dep, st = 'Awaiting confirmation by Finance') => { const pl = { e: 'nvq', title: w.nvq.title, plan: 'Instalments', total: rows.reduce((a, x) => a + x, 0), partial: true, cur: 'GBP', depBasis: 'gross', deposit: { amount: dep, status: st, paidAt: null }, rows: rows.map((a, i) => ({ n: i + 1, amount: a, due: D(10 + i * 30), status: 'Pending', paid: 0 })) }; w.plans = w.plans.filter(p => p.e !== 'nvq'); w.plans.unshift(pl); return pl; };
  const depTarget = v => payTargets().find(t => t.v === v && t.dep);
  const rowTarget = (v, n) => payTargets().find(t => t.v === v && t.r && t.pl && t.pl.e === 'nvq' && t.r.n === n);

  /* ================= A1. What the existing model does (audit) ================= */
  await T('FP-A1 existing semantics', async () => {
    fresh(); const P = prog(), s = signUp('A', P, P.b).w; setUi('cb9Pay', 'deposit'); const r = payCard(s), L = fpLedger(r.pl);
    ok('FP-A1 deposit route: £300 deposit then ONE balance row of £1,500 = £1,800 − £300 (worked out from the balance: net basis)', r.g.amount === 300 && r.pl.rows.length === 1 && r.pl.rows[0].amount === 1500 && L.basis === 'net' && r.pl.depBasis === 'net');
    ok('FP-A1 deposit route reconciles: £300 paid + £1,500 outstanding = £1,800 fee; no credit applied twice', L.fee === 1800 && L.paid === 300 && L.outstanding === 1500 && L.ok && L.credit === 0);
    fresh(); const P2_ = prog(), s2 = signUp('F', P2_, P2_.a).w, r2 = payCard(s2, 6), L2 = fpLedger(r2.pl);
    ok('FP-A1 instalment route: no deposit, 6 rows totalling the £2,400 fee', !r2.pl.deposit && r2.pl.rows.length === 6 && L2.basis === 'none' && L2.sched === 2400 && L2.ok && L2.paid === 400 && L2.outstanding === 2000);
    fresh(); const w = STORE.worlds.C, L3 = fpLedger(nvq(w));
    ok('FP-A1 legacy learner: £300 deposit + 6 × £350 = £2,400 (instalments from the balance: net basis), reconciles', L3.basis === 'net' && L3.dep === 300 && L3.sched === 2100 && L3.fee === 2400 && L3.ok && L3.paid + L3.outstanding === 2400);
  });

  /* ================= A2. Gross schedule: £300 first instalment, £100 credited deposit → £200 ================= */
  await T('FP-A2 gross credit', async () => {
    fresh(); learner('C'); const w = W, pl = gross(w, [300, 300, 300], 100);
    go('payments'); ok('FP-A2 (unpaid deposit) nothing is taken off: instalment 1 still £300 to pay; deposit not counted as paid', fpLedger(pl).credit === 0 && fpLedger(pl).paid === 0 && fpLedger(pl).outstanding === 900 && /Deposit £100\.00 not paid yet/.test(main()));
    const g0 = grab(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })); ok('FP-A2 (unpaid deposit) checkout for instalment 1 asks £300', g0 && g0.amount === 300);
    FA(); const t = depTarget('C'); recordPayment(t, 100, 'BANK-FP1', 'Bank transfer', 'Deposit received');
    ok('FP-A2 Finance confirms the £100 deposit → credited to instalment 1: £300 − £100 = £200 left; rows 2–3 untouched', pl.deposit.status === 'Paid' && pl.rows[0].credit === 100 && pl.rows[0].amount - pl.rows[0].paid === 200 && pl.rows[0].status === 'Partially paid' && pl.rows[1].paid === 0 && pl.rows[2].paid === 0);
    ok('FP-A2 the credit is audited once', ADMIN.audit.filter(a => a.action === 'Deposit credited to instalments' && /instalment 1 £100\.00/.test(a.after)).length === 1);
    recordPayment(t, 0, 'BANK-FP1b', 'Bank transfer', 'again'); fpCredit(w, 'again'); ok('FP-A2 (negative) repeating the confirmation / credit never credits twice', pl.rows[0].credit === 100 && pl.rows.reduce((a, r) => a + (r.credit || 0), 0) === 100);
    ok('FP-A2 Finance\'s Record offline payment asks £200 for instalment 1', rowTarget('C', 1).due === 200);
    learner('C'); go('payments'); ok('FP-A2 learner Payments: "− £100.00 deposit credit" on instalment 1, the credit sentence, Paid £100 / Outstanding £800', /− £100\.00 deposit credit/.test(main()) && /credited to instalment 1 \(£100\.00\)/.test(main()) && /Paid £100\.00/.test(main()) && /Outstanding £800\.00/.test(main()));
    const g1 = grab(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } }), 200); ok('FP-A2 "Pay now" on instalment 1 charges £200 (not £300); the row is then Paid', g1.amount === 200 && pl.rows[0].status === 'Paid');
    const L = fpLedger(pl); ok('FP-A2 reconciles: £100 deposit + £200 paid + £600 scheduled = £900 fee', L.paid === 300 && L.outstanding === 600 && L.ok && L.paid + L.outstanding === L.fee);
  });

  /* ================= A3. Deposit larger than the first instalment ================= */
  await T('FP-A3 deposit > first instalment', async () => {
    fresh(); learner('C'); const w = W, pl = gross(w, [300, 300, 300], 450, 'Paid'); fpCredit(w, 'test');
    ok('FP-A3 £450 deposit: instalment 1 fully credited (£300, Paid), the £150 rest carried to instalment 2 (£150 left)', pl.rows[0].credit === 300 && pl.rows[0].status === 'Paid' && pl.rows[1].credit === 150 && pl.rows[1].amount - pl.rows[1].paid === 150 && !pl.rows[2].credit);
    ok('FP-A3 never a negative amount due; reconciles', pl.rows.every(r => r.amount - r.paid >= 0) && fpLedger(pl).outstanding === 450 && fpLedger(pl).ok);
    const pl2 = gross(w, [300, 300], 700, 'Paid'); fpCredit(w, 'over');
    ok('FP-A3 (negative) a deposit bigger than everything left is never pushed below zero — flagged for Finance ("Review")', pl2.rows.every(r => r.amount - r.paid === 0 && r.credit === 300) && !fpLedger(pl2).ok);
  });

  /* ================= A4. Net schedule: no second deduction; the balance is paid once ================= */
  await T('FP-A4 net, pay once', async () => {
    fresh(); const P = prog(), s = signUp('A', P, P.b).w; setUi('cb9Pay', 'deposit'); const pl = payCard(s).pl;
    fpCredit(s, 'again'); ok('FP-A4 the £1,500 balance row is never reduced by the deposit again', pl.rows[0].amount === 1500 && !pl.rows[0].credit && pl.rows[0].paid === 0);
    learner('A'); go('admission'); ok('FP-A4 deposit card: balance due £1,500; "View payments", no "Set up instalments"; the credit sentence', /Balance due\s*£1,500\.00/.test(main()) && !/Set up instalments/.test(main()) && /View payments/.test(main()) && /exclude it — it isn't charged again/.test(main()), (main().match(/Deposit[\s\S]{0,700}/) || ['no Deposit'])[0].replace(/\s+/g, ' '));
    const g = grab(() => ACT.payBalance(), 1500);
    ok('FP-A4 "Pay balance" asks £1,500 and pays the Payments balance row (one record)', g.amount === 1500 && pl.rows[0].status === 'Paid' && pl.rows[0].paid === 1500);
    ok('FP-A4 the admission balance follows: £0 and the seat hold ends', s.admission.deposit.balance === 0 && !s.admission.deposit.holdUntil);
    const g2 = grab(() => ACT.payBalance()); go('payments');
    ok('FP-A4 (negative) the balance can\'t be paid twice: no checkout, no "Pay now" left', !g2 && !document.querySelector('main [data-act="payInst"][data-e="nvq"]'));
    const L = fpLedger(pl); ok('FP-A4 reconciles: £300 + £1,500 = £1,800, nothing outstanding', L.paid === 1800 && L.outstanding === 0 && L.ok);
    // the other way round: Finance records the balance row → the learner's deposit card follows
    fresh(); const P2_ = prog(), s2 = signUp('F', P2_, P2_.b).w; setUi('cb9Pay', 'deposit'); payCard(s2); FA(); recordPayment(rowTarget('F', 1), 1500, 'BANK-FP2', 'Bank transfer', 'Balance');
    ok('FP-A4 Finance records the balance row → admission balance £0 and the hold ends (no "Pay balance" left)', s2.admission.deposit.balance === 0 && !s2.admission.deposit.holdUntil);
    ok('FP-A4 (negative) after Finance records the balance, Finance can\'t collect it again (no balance or deposit target)', !rowTarget('F', 1) && !depTarget('F'));
    learner('F'); const g3 = grab(() => ACT.payBalance()); go('payments');
    ok('FP-A4 (negative) …and the learner can\'t pay it again (no checkout from "Pay balance", no "Pay now")', !g3 && !document.querySelector('main [data-act="payInst"][data-e="nvq"]') && fpLedger(nvq(s2)).outstanding === 0 && fpLedger(nvq(s2)).paid === 1800);
  });

  /* ================= A5. Unpaid (bank transfer) deposit on the deposit route ================= */
  await T('FP-A5 deposit awaiting confirmation', async () => {
    fresh(); const P = prog(), s = signUp('A', P, P.b).w; setUi('cb9Pay', 'deposit'); setUi('suMethod', 'bank'); render(); ACT.suPay(); const pl = nvq(s), hold0 = s.admission.deposit.holdUntil;
    let L = fpLedger(pl); ok('FP-A5 a deposit awaiting confirmation is not paid: paid £0, outstanding £1,800 (the deposit and the £1,500 balance)', /Awaiting/.test(pl.deposit.status) && L.paid === 0 && L.outstanding === 1800 && L.ok);
    learner('A'); go('payments'); ok('FP-A5 learner Payments: Paid £0.00 / Outstanding £1,800.00 and "awaiting confirmation by Finance"', /Paid £0\.00/.test(main()) && /Outstanding £1,800\.00/.test(main()) && /awaiting confirmation by Finance\. It counts as paid only once confirmed/.test(main()));
    const t = chPlanTotals(s); ok('FP-A5 the dial agrees: £0 of £1,800 paid, £1,800 pending', t.paid === 0 && t.total === 1800 && t.pending === 1800);
    FA(); recordPayment(depTarget('A'), 300, 'BANK-FP3', 'Bank transfer', 'Deposit received'); L = fpLedger(pl);
    ok('FP-A5 confirmed: paid £300, outstanding £1,500; the seat hold stays the one agreed at sign-up', L.paid === 300 && L.outstanding === 1500 && pl.deposit.hold === hold0 && s.admission.deposit.paid);
  });

  /* ================= A6. No deposit ================= */
  await T('FP-A6 no deposit', async () => {
    fresh(); const P = prog(), s = signUp('F', P, P.a).w, pl = payCard(s, 4).pl, L = fpLedger(pl);
    learner('F'); go('payments');
    ok('FP-A6 no deposit: 4 payments of £600, nothing credited, no deposit sentence, reconciles', L.basis === 'none' && pl.rows.every(r => r.amount === 600) && !document.querySelector('main .fp-led') && L.ok && L.paid === 600 && L.outstanding === 1800);
  });

  /* ================= A7. Frozen plans are never recalculated ================= */
  await T('FP-A7 historical plans', async () => {
    fresh(); const snap = J(['A', 'B', 'C', 'D', 'E', 'F'].map(v => STORE.worlds[v] && STORE.worlds[v].plans));
    ['A', 'C', 'F'].forEach(v => { learner(v); go('payments'); go('admission'); }); FA(); ['C', 'A', 'F'].forEach(v => { setUi('fpL', v); go('f-plans'); });
    ok('FP-A7 viewing every learner and Finance screen changes no stored plan (legacy frozen schedules untouched)', J(['A', 'B', 'C', 'D', 'E', 'F'].map(v => STORE.worlds[v] && STORE.worlds[v].plans)) === snap);
    fresh(); const P = prog(), s = signUp('A', P, P.a).w, pl = payCard(s, 6).pl, pin = J(pl.pin), rows = J(pl.rows); fpCredit(s, 'x'); learner('A'); go('payments');
    ok('FP-A7 a pinned (signed) dated schedule keeps its amounts and pin', J(pl.pin) === pin && J(pl.rows) === rows);
  });

  /* ================= A8. The same totals everywhere ================= */
  await T('FP-A8 consistent views', async () => {
    fresh(); const w = STORE.worlds.C, L = fpLedger(nvq(w)), m = x => money(x, 'GBP');
    learner('C'); go('payments'); const lp = main();
    FA(); setUi('fpL', 'C'); go('f-plans'); const fp = main(); go('f-learner', { id: w.me.id, tab: 'payments' }); const fl = main();
    SA(); go('a-learner', { id: w.me.id, tab: 'payments' }); const al = main();
    const has = (t, k) => t.includes(`Paid to date${m(L.paid)}`) && t.includes(`Outstanding${m(L.outstanding)}`) && t.includes(`Programme fee${m(L.fee)}`);
    ok('FP-A8 learner Payments shows the ledger\'s paid and outstanding', lp.includes(`Paid ${m(L.paid)}`) && lp.includes(`Outstanding ${m(L.outstanding)}`));
    ok('FP-A8 Finance Payment Plans shows the deposit and the same totals (it didn\'t show the deposit before)', has(fp) && /Deposit£300\.00 — paid/.test(fp.replace(/\s+(?=£)/g, '')) && /Reconciles/.test(fp));
    ok('FP-A8 Finance learner → Payments and admin Learner 360 → Payments show the same totals', has(fl) && has(al));
    const t = chPlanTotals(w); ok('FP-A8 the learner\'s dial agrees with the ledger', t.paid === L.paid && t.pending === L.outstanding && t.total === L.fee);
  });

  /* ================= A9. Rounding ================= */
  await T('FP-A9 rounding', async () => {
    fresh(); learner('C'); const w = W, sch = e1Sched(1000, 3), pl = gross(w, sch, 333.34, 'Paid'); fpCredit(w, 'r');
    ok('FP-A9 £1,000 in 3 (£333.33, £333.33, £333.34) with a £333.34 deposit: £333.33 + £0.01 credited, in pence', J(sch) === J([333.33, 333.33, 333.34]) && pl.rows[0].credit === 333.33 && P2(pl.rows[1].credit) === 1 && P2(pl.rows[1].amount - pl.rows[1].paid) === 33332);
    const L = fpLedger(pl); ok('FP-A9 reconciles to the penny: paid £333.34 + outstanding £666.66 = £1,000.00', P2(L.paid) === 33334 && P2(L.outstanding) === 66666 && L.ok);
    const pl2 = gross(w, [0.1, 0.2], 0.3, 'Paid'); pl2.total = 0.3; fpCredit(w, 'f'); ok('FP-A9 floating-point: £0.10 + £0.20 with a £0.30 deposit → both rows Paid, £0 outstanding', pl2.rows.every(r => r.status === 'Paid') && fpLedger(pl2).outstanding === 0 && fpLedger(pl2).ok);
  });

  /* ================= A10. Refunded deposit ================= */
  await T('FP-A10 refunded deposit', async () => {
    fresh(); learner('C'); const w = W, pl = gross(w, [300, 300, 300], 100, 'Paid'); fpCredit(w, 't'); w.admission.deposit.paid = true;
    refundEffect({ id: 'RQ-FP', amount: 100, cur: 'GBP', data: { depV: 'C' } });
    ok('FP-A10 refunded: the deposit no longer counts as paid and its credit is taken back (instalment 1 is £300 to pay again)', pl.deposit.status === 'Refunded' && !pl.rows[0].credit && pl.rows[0].paid === 0 && fpLedger(pl).paid === 0 && fpLedger(pl).outstanding === 900);
    ok('FP-A10 audited, and Record offline payment doesn\'t offer the refunded deposit', ADMIN.audit.some(a => a.action === 'Deposit credit reversed') && !depTarget('C'));
    go('payments'); ok('FP-A10 learner Payments: deposit row "Refunded" and "no longer counts"', /no longer counts towards the programme fee/.test(main()) && /Refunded/.test(main()));
  });

  /* ================= A11. A schedule that doesn't reconcile is shown, not changed ================= */
  await T('FP-A11 mismatch', async () => {
    fresh(); learner('C'); const w = W, pl = gross(w, [300, 200], 100, 'Paid'); delete pl.depBasis; pl.total = 900; const before = J(pl); fpCredit(w, 'm');
    FA(); setUi('fpL', 'C'); go('f-plans');
    ok('FP-A11 deposit £100 + rows £500 ≠ fee £900: "Review", nothing changed', fpLedger(pl).basis === 'mismatch' && !fpLedger(pl).ok && J(pl) === before && /Review/.test(main()));
  });

  /* ================= B. Certificate on completion ================= */
  const q8 = e => { // pass every module quiz through the real quiz screen
    shMods(e).forEach(m => { ACT.startQuiz({ dataset: { id: e.id, m: m.id } }); press(); const qs = S1Q(); qs.forEach((x, i) => { W.quiz.ans[i] = x[2]; }); finishQuiz(false); W.quiz = null; });
  };
  const doContent = e => { e.content.forEach(x => { x.state = 'Completed'; x.watch = 100; }); recalcShort(e); };
  const buy = id => { learner('A'); s1Sync(); go('browse'); const c = CATALOGUE.find(x => x.course === id); const g = grab(() => { ACT.buyCourse({ dataset: { id: c.id } }); const f = document.querySelector('#modal-root #sf-f1'); if (f) { f.value = 'Care Co'; prim(); } }); if (g) g.onSuccess(g.amount, 'TXN-FPB'); closeModal(); return W.enrolments.find(x => x.courseId === id); };
  const setCert = (id, on, r = 'FP cert') => { go('a-courses', { id, tab: 'certificate' }); const x = document.querySelector(`main input[name="fc-on"][value="${on ? 'yes' : 'no'}"]`); if (x) x.checked = true; ACT.s1Save({ dataset: { id, t: 'certificate' } }); return reason(r); };

  await T('FP-B1 new course setting', async () => {
    fresh(); SA(); go('a-courses'); ACT.newCourse(); const c = ADMIN.courses[ADMIN.courses.length - 1]; go('a-courses', { id: c.id, tab: 'certificate' });
    ok('FP-B1 a new short course shows "Certificate on completion" with Yes chosen by default', /Certificate on completion/.test(main()) && document.querySelector('main input[name="fc-on"][value="yes"]').checked && s1Spec(c).certOn === true);
    const v0 = c.version; setCert(c.id, false, 'Induction course — no certificate');
    ok('FP-B1 saving No: the course says No, a new version, audited with the reason', s1Spec(c).certOn === false && c.version === v0 + 1 && ADMIN.audit.some(a => a.action === `Certificate on completion changed — version ${c.version}` && a.before === 'Yes' && a.after === 'No' && /no certificate/.test(a.reason)));
    go('a-courses', { id: c.id, tab: 'details' }); ok('FP-B1 the course header and Details show "Certificate: No"', /Certificate: No/.test(main()) && /Certificate on completion: No/.test(main()));
    go('a-courses', { id: c.id, tab: 'validity' }); ok('FP-B1 Validity says validity applies only to courses that issue a certificate', /apply only to courses that issue a certificate/.test(main()));
    FA(); go('a-courses', { id: c.id, tab: 'certificate' }); const n0 = ADMIN.audit.length; ACT.s1Save({ dataset: { id: c.id, t: 'certificate' } });
    ok('FP-B1 (negative) a Finance Admin can\'t change it: refused and logged, unchanged', s1Spec(c).certOn === false && !MODAL && ADMIN.audit.slice(0, ADMIN.audit.length - n0 + 1).some(a => a.action === 'Blocked: certificate setting'));
  });

  await T('FP-B2 Yes course', async () => {
    fresh(); SA(); const c = s1DemoCourse(); ACT.pubCourse({ dataset: { id: c.id } }); const dlg = document.getElementById('modal-root').textContent; reason('Publish');
    ok('FP-B2 publishing states "Certificate on completion: Yes — …"', /Certificate on completion: Yes — a digital certificate is issued when every completion requirement is met/.test(dlg) && c.status === 'Published');
    const e = buy(c.id); go('browse'); ok('FP-B2 Browse: "Certificate on completion · Certificate validity: 24 months"', /Certificate on completion · Certificate validity: 24 months/.test(main()));
    ok('FP-B2 the enrolment pins Yes', e && e.certOn === true);
    const n0 = W.certs.length; doContent(e); shComplete(e); const early = W.certs.length; q8(e);
    ok('FP-B2 completion follows the existing rule: content alone doesn\'t issue it; passing every module quiz does', early === n0 && W.certs.length === n0 + 1 && e.status === 'Completed' && W.certs.some(x => x.id === e.certId && x.status === 'Valid'));
  });

  await T('FP-B3 Yes never issues early', async () => {
    fresh(); SA(); const c = s1DemoCourse(); c.status = 'Published'; const e = buy(c.id), n0 = W.certs.length;
    doContent(e); const m = shMods(e)[0]; ACT.startQuiz({ dataset: { id: e.id, m: m.id } }); press(); S1Q().forEach((x, i) => { W.quiz.ans[i] = x[2]; }); finishQuiz(false); W.quiz = null;
    ok('FP-B3 (negative) one module quiz still to pass: not completed, no certificate', e.status !== 'Completed' && W.certs.length === n0 && !e.certId);
    go('course', { id: e.id, tab: 'certificate' }); ok('FP-B3 the Certificate tab says "No certificate yet"', /No certificate yet/.test(main()));
  });

  await T('FP-B4 No course', async () => {
    fresh(); SA(); const c = s1DemoCourse(); setCert(c.id, false); ACT.pubCourse({ dataset: { id: c.id } }); const dlg = document.getElementById('modal-root').textContent; reason('Publish');
    ok('FP-B4 publishing states "Certificate on completion: No — no certificate is issued"', /Certificate on completion: No — no certificate is issued for this course/.test(dlg));
    const e = buy(c.id); learner('A'); go('browse'); ok('FP-B4 Browse: "No certificate on completion"', /No certificate on completion/.test(main()) && e.certOn === false);
    go('course', { id: e.id, tab: 'overview' }); ok('FP-B4 the course overview: "Certificate: Not issued for this course"', /Certificate\s*Not issued for this course/.test(main()) && /doesn't issue a certificate/.test(main()));
    const n0 = W.certs.length, cq = J(W.certs); doContent(e); q8(e);
    ok('FP-B4 completing it: Completed, and NO certificate issued', e.status === 'Completed' && e.noCert && !e.certId && W.certs.length === n0 && J(W.certs) === cq);
    ok('FP-B4 the learner is told it is completed, without a certificate', W.notifs[0].title === 'Course completed' && /doesn't issue a certificate/.test(W.notifs[0].body) && !W.notifs.slice(0, 3).some(x => x.title === 'Certificate issued' && x.body.includes(e.title)));
    go('course', { id: e.id, tab: 'certificate' }); ok('FP-B4 the Certificate tab: "No certificate for this course" with the completion date', /No certificate for this course/.test(main()) && /You completed this course on/.test(main()));
  });

  await T('FP-B5 issued certificates and enrolled learners', async () => {
    fresh(); learner('A'); const certs = J(STORE.worlds.A.certs), row = ADMIN.courses.find(c => c.title === 'Moving and Handling People');
    SA(); setCert(row.id, false, 'Turn off');
    ok('FP-B5 turning a course to No changes no issued certificate', J(STORE.worlds.A.certs) === certs);
    learner('A'); go('certificates'); ok('FP-B5 the learner\'s Certificates page still lists them', W.certs.length > 0 && document.querySelectorAll('main .cert-card, main article').length > 0);
    const old = W.enrolments.find(x => x.kind === 'short' && (x.base || x.title).startsWith('Moving and Handling People') && x.status !== 'Completed');
    ok('FP-B5 a learner who enrolled before the change keeps a certificate (the setting in force when they enrolled)', !old || fcOnE(old) === true);
    const done = W.enrolments.find(x => x.kind === 'short' && x.status === 'Completed' && x.certId); if (done) { go('course', { id: done.id, tab: 'certificate' }); }
    ok('FP-B5 a completed course\'s issued certificate is still shown on its Certificate tab', !done || !/No certificate for this course/.test(main()));
    // pinned at purchase: bought with Yes, changed to No, then completed → certificate
    fresh(); SA(); const c = s1DemoCourse(); c.status = 'Published'; const e = buy(c.id); SA(); setCert(c.id, false); learner('A'); const n0 = W.certs.length; doContent(e); q8(e);
    ok('FP-B5 bought while Yes, course changed to No, then completed → still gets the certificate (pinned)', e.certOn === true && W.certs.length === n0 + 1 && !!e.certId);
    const e2 = buy(c.id); ok('FP-B5 a new enrolment after the change follows No', e2 && e2.certOn === false && e2 !== e);
    // an enrolment with no pin (made before FP, or outside the purchase flow), dated before the change: keeps Yes and gets its certificate
    fresh(); SA(); const c3 = s1DemoCourse(); c3.status = 'Published'; const e3 = buy(c3.id); delete e3.certOn; e3.enrolled = D(-5); SA(); setCert(c3.id, false); learner('A');
    const n3 = W.certs.length; doContent(e3); q8(e3);
    ok('FP-B5 an existing unpinned enrolment from before the change keeps its eligibility: completes with a certificate', s1Spec(c3).certOn === false && fcOnE(e3) === true && W.certs.length === n3 + 1 && !!e3.certId);
  });

  await T('FP-B6 agency and NVQ', async () => {
    fresh(); const a = STORE.agy.assign.find(x => x.status === 'Active' && x.kind === 'short' && x.agency === 'CarePlus Recruitment (demo)');
    const row = a && ADMIN.courses.find(c => c.title === a.course); if (row) { SA(); setCert(row.id, false); }
    // (assignments made before the change keep their certificate; this one is dated after it)
    if (a) a.at = now().toISOString(); const n0 = STORE.agy.certs.length, nw = a && learnerById(a.lid).v ? STORE.worlds[learnerById(a.lid).v].certs.length : 0;
    SA(); ACT.agySimComplete(); const L = a && learnerById(a.lid);
    ok('FP-B6 agency "simulate completion" on a No course: completed, no certificate', !a || (a.status === 'Completed' && STORE.agy.certs.length === n0 && (!L.v || STORE.worlds[L.v].certs.length === nw)));
    ok('FP-B6 NVQ enrolments are outside the setting (always resolve as before)', fcOnE({ kind: 'nvq' }) === true);
  });

  /* ================= C. The Certificate tab follows the setting (correction, PD-FP-11..15) ================= */
  // Real clicks on the tab's controls (radios and checkboxes fire their change handlers; buttons go through data-act)
  const vis = s => { const e = q(s); return !!e && e.getClientRects().length > 0; };
  const tap = s => { const e = q(s); if (e) e.click(); return !!e; };
  const pick = on => tap(`input[name="fc-on"][value="${on ? 'yes' : 'no'}"]`);
  const certTab = c => go('a-courses', { id: c.id, tab: 'certificate' });
  const tplShown = () => vis('.fc-tpl') && vis('#ct-logo') && vis('#ct-l') && qa('.s1-cf').some(x => x.getClientRects().length) && vis('.fc-prev .cert-doc');
  const tplGone = () => !vis('.fc-tpl') && !vis('#ct-logo') && !vis('#ct-l') && !qa('.s1-cf').some(x => x.getClientRects().length) && !vis('.cert-doc') && !vis('input[name="fc-logo"]');
  const errTxt = () => (q('.fc-errs') || {}).textContent || '';
  const file = (sel, n) => { const d = new DataTransfer(); d.items.add(new File(['x'], n, { type: 'image/png' })); const e = q(sel); e.files = d.files; e.dispatchEvent(new Event('change', { bubbles: true })); };

  await T('FP-C1 No hides the template', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c); certTab(c);
    ok('FP-C1 Yes: the template designer, logo, layout, fields and live preview are shown; no "no certificate" message', tplShown() && !vis('.fc-off'));
    const before = J({ sp, v: c.version }), na = ADMIN.audit.length; pick(false);
    ok('FP-C1 choosing No hides the designer, logo, layout, fields and preview', tplGone());
    ok('FP-C1 … and shows only the setting with a short explanation, marked "Not saved yet"', vis('input[name="fc-on"][value="no"]') && vis('.fc-off') && /no certificate to design/.test(q('.fc-off').textContent) && vis('.fc-dirty'));
    ok('FP-C1 (negative) choosing on screen changes nothing: same setting, version, template and audit', J({ sp, v: c.version }) === before && ADMIN.audit.length === na && fcOn(sp));
  });

  await T('FP-C2 No: save and publish without a template; completion without a certificate', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c); sp.cert = { layout: '', fields: [], logo: '' }; const tpl = J(sp.cert), v0 = c.version; // an unfinished template
    certTab(c); pick(false); tap('[data-act="s1Save"]'); const dlg = document.getElementById('modal-root').textContent; reason('Induction — no certificate');
    ok('FP-C2 saving No with an unfinished template: no template errors, a new version with the reason', !errTxt() && /Yes → No/.test(dlg) && sp.certOn === false && c.version === v0 + 1 && ADMIN.audit.some(a => a.action === `Certificate on completion changed — version ${c.version}` && a.reason === 'Induction — no certificate'));
    ok('FP-C2 the saved template is kept as it was (not deleted or changed)', J(sp.cert) === tpl);
    ok('FP-C2 after saving, the tab shows only the setting and the explanation', tplGone() && vis('.fc-off') && !vis('.fc-dirty'));
    tap('[data-act="pubCourse"]'); const pd = document.getElementById('modal-root').textContent; reason('Go live');
    ok('FP-C2 publishing a No course needs no certificate template', !/Can't publish/.test(pd) && /Certificate on completion: No/.test(pd) && c.status === 'Published' && !s1Missing(c).some(m => /^Certificate/.test(m)));
    go('a-courses', { id: c.id, tab: 'validity' });
    ok('FP-C2 Validity: "Not applicable", no validity or reminder controls and no Save', vis('.fc-val-off') && !q('input[name="val"]') && !q('#val-n') && !q('#rem') && !q('[data-act="s1Save"][data-t="validity"]') && /apply only to courses that issue a certificate/.test(main()));
    const val = c.validity; ACT.s1Save({ dataset: { id: c.id, t: 'validity' } }); ok('FP-C2 (negative) a validity save on a No course is refused, nothing changes', c.validity === val && !MODAL);
    go('a-courses'); ok('FP-C2 the course list shows its validity as "Not applicable (no certificate)"', /Not applicable \(no certificate\)/.test(main()));
    const e = buy(c.id), n0 = W.certs.length; doContent(e); q8(e);
    ok('FP-C9 a learner completing the No course: Completed, no certificate', e.certOn === false && e.status === 'Completed' && !e.certId && W.certs.length === n0);
  });

  await T('FP-C3/C4 Yes shows the template; an incomplete one blocks save and publish', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c); certTab(c); pick(false); tap('[data-act="s1Save"]'); reason('Off'); certTab(c);
    ok('FP-C3 a saved No course opens with the template hidden', tplGone());
    pick(true); ok('FP-C3 choosing Yes shows the designer and the live preview again', tplShown() && !vis('.fc-off'));
    tap('.s1-cf[value="Learner name"]'); ok('FP-C3 the live preview follows the fields', !/Learner Name/.test(q('.fc-prev').textContent));
    const tpl = J(sp.cert), v0 = c.version; tap('[data-act="s1Save"]');
    ok('FP-C4 Yes without the learner\'s name: Save is blocked with an inline error on the fields', !MODAL && /learner's name on the certificate \(required\)/.test(errTxt()) && q('.s1-cf[aria-invalid="true"]') && q('.fc-fields .err') && sp.certOn === false && c.version === v0 && J(sp.cert) === tpl);
    tap('[data-act="pubCourse"]');
    ok('FP-C4 Publish is blocked too, with the same inline error, and logged', c.status === 'Draft' && !MODAL && /before publishing/.test(errTxt()) && ADMIN.audit.some(a => a.action === 'Blocked: publish (certificate incomplete)'));
    tap('.s1-cf[value="Learner name"]'); ok('FP-C4 the error clears when the template changes', !errTxt());
    tap('input[name="fc-logo"][value="own"]'); tap('[data-act="s1Save"]');
    ok('FP-C4 "Our own logo" without a file: blocked — upload a logo or use the default mark', !MODAL && /Upload your logo, or choose the default "Welfare" mark/.test(errTxt()) && q('#ct-logo[aria-invalid="true"]'));
    // a saved template that is incomplete (older data) blocks publishing from any tab
    fresh(); SA(); const c2 = s1DemoCourse(); s1Spec(c2).cert = { layout: 'Old layout', fields: ['Course'], logo: '' }; certTab(c2);
    ok('FP-C4 an unknown saved layout asks for a layout', q('#ct-l').value === '' && /Choose a layout/.test(q('#ct-l').textContent));
    go('a-courses', { id: c2.id, tab: 'details' }); tap('[data-act="pubCourse"]'); const m = document.getElementById('modal-root').textContent; closeModal();
    ok('FP-C4 publishing a Yes course with an incomplete saved template: "Can\'t publish yet" names each certificate item', /Can't publish yet/.test(m) && /Certificate: Choose a certificate layout/.test(m) && /Certificate: Put the learner's name on the certificate/.test(m) && c2.status === 'Draft');
  });

  await T('FP-C5 Yes: a valid template saves and publishes', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c); certTab(c);
    const l = q('#ct-l'); l.value = 'Landscape — classic border'; l.dispatchEvent(new Event('change', { bubbles: true }));
    tap('input[name="fc-logo"][value="own"]'); file('#ct-logo', 'care-co-logo.png');
    ok('FP-C5 the live preview follows the layout and the logo', /Landscape — classic border/.test(q('.fc-prev').textContent) && /care-co-logo\.png/.test(q('.fc-prev').textContent));
    tap('[data-act="s1Save"]'); reason('Branded certificate');
    ok('FP-C5 saved: layout and own logo, a new version', sp.cert.layout === 'Landscape — classic border' && sp.cert.logo === 'care-co-logo.png' && sp.certOn !== false);
    tap('input[name="fc-logo"][value="def"]'); tap('[data-act="s1Save"]'); reason('Default mark'); ok('FP-C5 choosing the default "Welfare" mark again saves it', sp.cert.logo === '');
    tap('[data-act="pubCourse"]'); const pd = document.getElementById('modal-root').textContent; reason('Go live');
    ok('FP-C5 a complete template publishes, stating "Certificate on completion: Yes"', c.status === 'Published' && /Certificate on completion: Yes/.test(pd));
    fresh(); SA(); const c2 = s1DemoCourse(); certTab(c2); tap('.s1-cf[value="QR code"]'); tap('[data-act="pubCourse"]');
    ok('FP-C5 (negative) publishing from the Certificate tab with unsaved certificate changes asks to save first', c2.status === 'Draft' && !MODAL && /Save your certificate changes first/.test(errTxt()));
  });

  await T('FP-C6 Yes → No → Yes restores the design', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c), saved = J(sp.cert); certTab(c);
    const l = q('#ct-l'); l.value = 'Landscape — classic border'; l.dispatchEvent(new Event('change', { bubbles: true })); tap('.s1-cf[value="QR code"]');
    pick(false); pick(true);
    ok('FP-C6 unsaved layout and field changes are still there after No → Yes', q('#ct-l').value === 'Landscape — classic border' && !q('.s1-cf[value="QR code"]').checked && tplShown() && J(sp.cert) === saved);
    tap('[data-act="s1Save"]'); reason('Landscape, no QR'); const des = J(sp.cert);
    pick(false); tap('[data-act="s1Save"]'); reason('Off'); certTab(c); pick(true);
    ok('FP-C6 a saved No course: choosing Yes shows the design saved before (not a blank one)', J(sp.cert) === des && q('#ct-l').value === 'Landscape — classic border' && !q('.s1-cf[value="QR code"]').checked);
  });

  await T('FP-C7 published Yes → No keeps certificates and enrolled rights', async () => {
    fresh(); learner('A'); const old = J(STORE.worlds.A.certs); SA(); const c = s1DemoCourse(); certTab(c); tap('[data-act="pubCourse"]'); reason('Go');
    const e = buy(c.id); SA(); certTab(c); pick(false); tap('[data-act="s1Save"]'); reason('Turn off');
    ok('FP-C7 the change through the tab: No, a new version, audited', s1Spec(c).certOn === false && ADMIN.audit.some(a => /^Certificate on completion changed/.test(a.action) && a.reason === 'Turn off'));
    ok('FP-C7 certificates already issued are unchanged', J(STORE.worlds.A.certs) === old);
    learner('A'); const n0 = W.certs.length; doContent(e); q8(e);
    ok('FP-C7 a learner enrolled while Yes still receives the certificate on completion', fcOnE(e) && !!e.certId && W.certs.length === n0 + 1);
    const e2 = buy(c.id); ok('FP-C7 a new enrolment follows the published No', e2 && e2 !== e && e2.certOn === false);
  });

  await T('FP-C8 published No → Yes: authorised, versioned, reasoned', async () => {
    fresh(); SA(); const c = s1DemoCourse(), sp = s1Spec(c); certTab(c); pick(false); tap('[data-act="s1Save"]'); reason('Off'); tap('[data-act="pubCourse"]'); reason('Go');
    FA(); certTab(c); ok('FP-C8 (negative) a Finance Admin can\'t open the course editor: no setting or Save shown', !q('input[name="fc-on"]') && !q('[data-act="s1Save"]') && /don't have permission/.test(main()));
    ACT.s1Save({ dataset: { id: c.id, t: 'certificate' } });
    ok('FP-C8 (negative) … and a save sent anyway is refused and logged, unchanged', sp.certOn === false && !MODAL && ADMIN.audit.some(a => a.action === 'Blocked: certificate setting'));
    SA(); certTab(c); const v0 = c.version; pick(true); ok('FP-C8 choosing Yes alone doesn\'t change the published course', sp.certOn === false && c.version === v0 && c.status === 'Published');
    tap('[data-act="s1Save"]'); const dlg = document.getElementById('modal-root').textContent; reason('Certificates back on');
    ok('FP-C8 saving: the version dialog names No → Yes; a new version with the reason and an audit entry', /No → Yes/.test(dlg) && sp.certOn === true && c.version === v0 + 1 && ADMIN.audit.some(a => a.action === `Certificate on completion changed — version ${c.version}` && a.before === 'No' && a.after === 'Yes' && a.reason === 'Certificates back on'));
    const e = buy(c.id); ok('FP-C8 a new enrolment after the change gets the certificate setting Yes', e && e.certOn === true);
  });

  await T('FP-C10 existing workflows', async () => {
    fresh(); SA(); const row = ADMIN.courses.find(c => c.title === 'Moving and Handling People'); certTab(row);
    ok('FP-C10 an existing Yes course: the designer, all seven fields and the preview as before', tplShown() && qa('.s1-cf').length === 7 && qa('.s1-cf:checked').length === s1Spec(row).cert.fields.length && /Live preview/.test(main()));
    go('a-courses', { id: row.id, tab: 'validity' }); ok('FP-C10 an existing Yes course: Validity has its controls and Save', !!q('input[name="val"]') && !!q('#rem') && !!q('[data-act="s1Save"][data-t="validity"]'));
    go('a-courses'); ok('FP-C10 the course list shows validity for Yes courses', !/Not applicable \(no certificate\)/.test(main()) && /12 months|24 months/.test(main()));
    ok('FP-C10 NVQ enrolments are outside the setting', fcOnE({ kind: 'nvq' }) === true);
  });

  ACT.resetDemo();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
