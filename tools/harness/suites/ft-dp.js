// DP — deposit, seat hold and first balance, end to end (31 Oct 2026; PD-DP-*). suites.sh runs this suite with FIXTURE=client: the
// page boots the client demo as a fresh browser does. One temporary learner registers from the sign-in page and signs up for the
// published demo programme through the real screens: Browse, the fee option, details, documents, offer letter, payment (deposit),
// Finance's confirmation, the Academic Admin's admission decision, the balance at checkout, Finance's views and the duplicates.
// Then the numerical interpretations (A: gross, model only — no approved plan makes one; B: a £200 custom deposit approved through
// Course Builder and Finance) and the edge cases. Reset restores the starting demo. Every check reads the consuming screen or record.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const app = () => ($1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel + ' :: ' + app().slice(0, 400) + ' :: ' + mtxt().slice(0, 200)); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'DP test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const toastTxt = () => (($1('#toasts') || {}).textContent || '').replace(/\s+/g, ' ');
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const asL = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  // The real checkout: Pay securely, the processing delay (virtual clock), the success or decline dialog
  const payCo = (open, fail) => fxFast(ff => { open(); if (!MODAL || !/Pay now/.test(MODAL.title || '')) return { opened: false }; const amt = (mtxt().match(/Amount due\s*(£[\d,.]+)/) || [])[1]; if (fail) $1('#payFail').checked = true; prim(); ff(3000); const t = mtxt(); closeModal(); return { opened: true, amt, t }; });
  const pl = w => w && w.plans.find(p => p.e === 'nvq');
  const P = x => Math.round(x * 100);
  const txOf = w => allTx().filter(x => x.v === w.v && !x.refund);
  // Register a learner from the sign-in page (Create an account → verify → welcome)
  // Each test account gets its own mobile, outside the seeded 7700 900xxx numbers. Was: a random 7700 900100–900899, which now
  // and then matched a demo learner's mobile, so sign-up was (correctly) refused as a duplicate account
  let REG_N = 0;
  const register = (name, email) => {
    signOutUI(); click($1('#app [data-act="regStart"]'));
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 955' + String(100 + REG_N++), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submit('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]');
    click($1('#app [data-act="finishWelcome"]')); return W;
  };
  // Sign up in two parts: Browse → fee option, then details → documents → offer letter
  const startSignup = (w, mode = 'Self-Paced') => { go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } }); const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === mode); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press(); go('admission'); };
  const contSignup = w => { go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]')); fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); }); click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign')); };
  // Sign up from Browse on the programme's option of this mode, up to the payment step
  const toPayment = (w, mode = 'Self-Paced') => {
    go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } }); const dlg = mtxt();
    const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === mode); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press();
    go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
    fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); });
    click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign')); return dlg;
  };
  const choose = (opt, method) => { const r = $1(`main input[name="cb9-pay"][value="${opt}"]`); if (r) { r.checked = true; INP.cb9Pay(r); } const m = $1(`main input[name="su-m"][value="${method}"]`); if (m) { m.checked = true; INP.suMethod(m); } };
  const depRow = w => $a('main table tbody tr').find(tr => tr.textContent.includes(chFullName(w)));
  const snapCD = () => J(['CD1', 'CD2'].map(k => { const w = STORE.worlds[k], p = pl(w); return [p.plan, p.total, p.deposit, p.rows.map(r => [r.n, r.amount, r.status, r.paid, r.due]), cb9Pin(w) && cb9Pin(w).planV]; }));
  const cd0 = snapCD(), e0 = cdBatch().enrolled, v0 = s4PlanCur(cdPr().id).v;
  // PD-FD-01: the demo now has two deposit-route learners (Sam card, Tom pending transfer IA-32004-DEP); baselines for Deposits and bank transfers. Was: both empty.
  const bankOf = () => J((STORE.chBank || []).map(x => [x.v, x.ref, x.amount, x.status]).sort()), bank0 = bankOf();
  const depNames = () => { FA(); go('f-deposits'); return /Nothing to show/.test(main()) ? [] : $a('main table tbody tr').map(tr => tr.cells[0].textContent.trim()).sort(); };

  /* ================= A. What exists (audit, before anything changes) ================= */
  await T('DP-A inventory', async () => {
    const pr = cdPr(), b = cdBatch(), cur = s4PlanCur(pr.id);
    // PD-FD-01: the programme deposit is now programme-specific £100 (approved change AQ-7601); Academy default stays £300. Was: mode default, eff £300.
    ok('DP-A the client demo programme offers a deposit: programme-specific £100 (Academy default stays £300), seat hold 28 days (plan version ' + cur.v + ')', cur.pkg.dep.mode === 'own' && cur.pkg.dep.amount === 100 && cur.pkg.dep.eff === 100 && S4().cfg.deposit === 300 && S4().cfg.hold === 28);
    ok('DP-A its batch starts in 28 days or more, so the deposit route is open for it (DEMO-L3-JAN27, ' + daysTo(b.start) + ' days)', chDepositOk(b) && b.status === 'Open' && chHasPlace(b));
    ok('DP-A the two admitted demo learners are on instalments (no deposit): Amira 6 × £300, Dev 5 × £433.33 + £433.35', !pl(STORE.worlds.CD1).deposit && J(pl(STORE.worlds.CD1).rows.map(r => r.amount)) === J([300, 300, 300, 300, 300, 300]) && !pl(STORE.worlds.CD2).deposit && pl(STORE.worlds.CD2).rows[5].amount === 433.35);
    // PD-FD-01: Deposits starts with the two demo deposit learners (Sam seat secured, Tom awaiting) and one awaiting transfer (Tom). Was: Deposits empty.
    ok('DP-A Finance → Deposits starts with only the two demo deposit learners: Sam (seat secured) and Tom (awaiting confirmation); one bank transfer awaiting (Tom, IA-32004-DEP)', J(depNames()) === J(['Sam Deposit (demo)', 'Tom Transfer (demo)']) && /Seat secured/.test(depRow(STORE.worlds.CD4).textContent) && /Awaiting confirmation/.test(depRow(STORE.worlds.CD5).textContent) && (STORE.chBank || []).length === 1 && STORE.chBank[0].v === 'CD5' && STORE.chBank[0].ref === 'IA-32004-DEP' && STORE.chBank[0].amount === 100 && STORE.chBank[0].status === 'Awaiting confirmation', J([depNames(), bank0, depRow(STORE.worlds.CD4).textContent, depRow(STORE.worlds.CD5).textContent]));
  });

  /* ================= B. One temporary learner: deposit by bank transfer → Finance → admission → balance ================= */
  let w, hold0;
  await T('DP-B1 sign-up and the deposit offer', async () => {
    w = register('Tara Quinn', 'tara.quinn@test.example');
    ok('DP-B1 the learner registers from the sign-in page and lands on their dashboard', S.signedIn && S.portal === 'learner' && w.me.first === 'Tara' && S.route === 'dashboard');
    const dlg = toPayment(w);
    // PD-FD-01: deposit £100. Was: £300.
    ok('DP-B1 the sign-up dialog states the deposit with each fee option', /Self-Paced £1,800\.00[^]*Deposit £100\.00 \(when your batch starts in 28 days or more\)/.test(dlg));
    ok('DP-B1 the learner reaches step 4 Payment in the demo batch', w.signup.step === 4 && w.signup.batch === CD_B && /4\. Payment/.test(main()));
    // PD-FD-01: £100 deposit, £1,700 balance. Was: £300 now, £1,500 balance.
    ok('DP-B1 the payment step offers the deposit with the amount and the remaining fee: £100 now, then £1,700 within 28 days', /Deposit \(holds your seat\) — £100\.00 now/.test(main()) && /then the £1,700\.00 balance within 28 days/.test(main()) && /Programme fee£1,800\.00/.test(main()));
    choose('deposit', 'bank');
    // PD-FD-01: deposit £100. Was: £300.
    ok('DP-B1 bank transfer: the £100 to pay, the bank details and the reference', /Pay £100\.00 by bank transfer/.test(main()) && /Reference: IA-\d{5}-DEP/.test(main()) && /I've made the transfer — start now/.test(main()));
  });
  await T('DP-B2 pending bank-transfer deposit: seat held, not paid', async () => {
    const e1 = cdBatch().enrolled; click($1('main [data-act="suPay"]')); const p = pl(w), L = fpLedger(p); hold0 = p.deposit.hold;
    ok('DP-B2 sign-up completes; the seat is held in the batch (enrolled ' + e1 + ' → ' + cdBatch().enrolled + ')', w.signup.done && cdBatch().enrolled === e1 + 1 && w.signup.batch === CD_B);
    // PD-FD-01: balance £1,700. Was: £1,500.
    ok('DP-B2 one balance row of £1,700 due on the hold date (28 days after sign-up); the deposit is awaiting confirmation', p.plan === 'Deposit and balance' && p.rows.length === 1 && p.rows[0].amount === 1700 && p.rows[0].due === hold0 && /Awaiting confirmation/.test(p.deposit.status) && Math.round((new Date(hold0) - new Date(w.signup.pay.at)) / DAY) === 28);
    ok('DP-B2 not treated as paid: paid £0, outstanding £1,800 (the pending deposit included), and it reconciles', L.st === 'pending' && L.paid === 0 && L.outstanding === 1800 && L.ok && !w.admission.deposit.paid && txOf(w).length === 0);
    // PD-FD-01: deposit £100, balance £1,700. Was: £300 / £1,500.
    go('payments'); ok('DP-B2 learner Payments: £0 paid, £1,800 outstanding, the deposit awaiting confirmation, the £1,700 balance excludes it', /Paid so far£0\.00/.test(main()) && /Outstanding£1,800\.00/.test(main()) && /Deposit £100\.00 awaiting confirmation by Finance/.test(main()) && /balance below \(£1,700\.00\) already excludes it/.test(main()));
    go('dashboard'); ok('DP-B2 the dashboard doesn\'t ask for the balance before the deposit is confirmed', !/Pay your balance/.test(main()));
  });
  await T('DP-B3 Finance: sees and confirms the deposit', async () => {
    FA(); go('f-deposits'); let r = depRow(w);
    // PD-FD-01: deposit £100, balance £1,700. Was: £300 / £1,500.
    ok('DP-B3 Finance → Deposits: the learner, batch, £100, Awaiting confirmation, seat held until the hold date, balance £1,700', !!r && /DEMO-L3-JAN27/.test(r.textContent) && /£100\.00/.test(r.textContent) && /Awaiting confirmation/.test(r.textContent) && r.textContent.includes(fd(hold0)) && /£1,700\.00/.test(r.textContent));
    go('f-plans'); ok('DP-B3 Payment Plans → Learner schedules offers the learner in the selector', $a('main #fpl option').some(o => o.value === w.v && o.textContent === 'Tara Quinn'));
    go('f-exceptions', { tab: 'bank' }); const b = $a('main [data-act="finOffline"]').find(x => x.dataset.k === w.v + '|dep');
    ok('DP-B3 Bank transfers to confirm: the learner\'s deposit with Record offline payment', !!b && /Tara Quinn/.test(main()) && /IA-\d{5}-DEP/.test(main()));
    // PD-FD-01: deposit £100. Was: £300.
    click(b); ok('DP-B3 Record offline payment opens on this deposit for £100', MODAL && MODAL.title === 'Record offline payment' && $1('#op-t').value === w.v + '|dep' && +$1('#op-a').value === 100, MODAL && $1('#op-t') && $1('#op-t').value);
    $1('#op-r').value = 'BACS-77001'; reason('Transfer received');
    const p = pl(w), L = fpLedger(p);
    // PD-FD-01: one receipt of £100. Was: £300.
    ok('DP-B3 confirmed: deposit Paid, the sign-up payment Paid, the bank-transfer row Confirmed, one receipt', p.deposit.status === 'Paid' && w.signup.pay.status === 'Paid' && STORE.chBank.find(x => x.v === w.v).status === 'Confirmed' && txOf(w).length === 1 && txOf(w)[0].amount === 100);
    ok('DP-B3 confirming does not restart or extend the hold (still ' + fd(hold0) + ')', p.deposit.hold === hold0 && w.admission.deposit.holdUntil === hold0 && p.rows[0].due === hold0);
    // PD-FD-01: £100 + £1,700. Was: £300 + £1,500.
    ok('DP-B3 ledger: £100 paid + £1,700 outstanding = £1,800; reconciles', L.paid === 100 && L.outstanding === 1700 && L.ok);
    // PD-FD-01: balance £1,700. Was: £1,500.
    go('f-deposits'); r = depRow(w); ok('DP-B3 Deposits now: Seat held, paid, balance £1,700', !!r && /Seat held/.test(r.textContent) && /£1,700\.00/.test(r.textContent));
  });
  await T('DP-B4 duplicate confirmation is refused', async () => {
    // PD-FD-01: deposit £100 (stale dialog amount). Was: £300.
    FA(); const n = txOf(w).length, stale = { key: w.v + '|dep', v: w.v, dep: pl(w).deposit, due: 100, cur: 'GBP', label: 'stale' };
    ok('DP-B4 the deposit is no longer offered in Record offline payment', !payTargets().some(t => t.key === w.v + '|dep'));
    ACT.finOffline({ dataset: { k: w.v + '|dep' } }); ok('DP-B4 a stale "Record offline payment" for it opens nothing (no other item preselected)', !MODAL && /Already recorded/.test(toastTxt()));
    // PD-FD-01: the same full deposit (£100) again; paid stays £100. Was: £300.
    ok('DP-B4 a second confirmation of the same deposit (stale dialog) is refused: no second receipt', recordPayment(stale, 100, 'BACS-77002', 'Bank transfer', 'again') === false && txOf(w).length === n && fpLedger(pl(w)).paid === 100);
    ok('DP-B4 the refusal is audited', ADMIN.audit.some(a => a.action === 'Blocked: payment already recorded'));
  });
  await T('DP-B5 the next admission step: the Academic Admin approves', async () => {
    ACA(); const id = 'APP-' + w.v; go('a-admissions', { id });
    // PD-FD-01: deposit £100. Was: £300.
    ok('DP-B5 the application shows the sign-up and the paid deposit', /Deposit £100\.00 by bank transfer · Paid/.test(main()) && /Awaiting review/.test(main()));
    const ap = allApplications().find(a => a.id === id); ap.docs.filter(d => d.mand).forEach(d => ACT.docDec({ dataset: { a: id, d: d.id, s: 'Approved' } }));
    go('a-admissions', { id }); click($1(`main [data-act="appApprove"][data-id="${id}"]`)); reason('Documents checked');
    ok('DP-B5 admission approved; the seat and the payment record are unchanged', w.admission.status === 'Approved' && w.signup.batch === CD_B && pl(w).deposit.hold === hold0, w.admission.status);
  });
  await T('DP-B6 the learner pays the balance (the first scheduled payment after the deposit)', async () => {
    // PD-FD-01: balance £1,700. Was: £1,500.
    asL(w.v); go('dashboard'); ok('DP-B6 dashboard: Pay your balance — seat held until the hold date, £1,700', /Pay your balance — seat held until/.test(main()) && /balance £1,700\.00/.test(main()));
    go('payments'); const btn = $1('main [data-act="payInst"][data-n="1"]'); const c = payCo(() => click(btn));
    // PD-FD-01: balance £1,700. Was: £1,500.
    ok('DP-B6 Pay now opens the checkout for exactly £1,700 (the deposit not taken again, not added again)', c.opened && c.amt === '£1,700.00' && /£1,700\.00 paid/.test(c.t), J(c));
    const p = pl(w), L = fpLedger(p);
    // PD-FD-01: balance row paid £1,700. Was: £1,500.
    ok('DP-B6 the balance row is Paid with a receipt; the ledger: £1,800 paid, £0 outstanding; reconciles', p.rows[0].status === 'Paid' && p.rows[0].paid === 1700 && !!p.rows[0].receipt && L.paid === 1800 && L.outstanding === 0 && L.ok);
    ok('DP-B6 the seat hold ends (converted: the seat is kept, no hold date) and the batch count is unchanged', w.admission.deposit.holdUntil === null && !!w.admission.deposit.balancePaidAt && w.admission.deposit.balance === 0 && cdBatch().enrolled === e0 + 1 && w.signup.batch === CD_B);
    // PD-FD-01: name only: £100 + £1,700. Was: £300 + £1,500.
    ok('DP-B6 money received equals the fee exactly: £100 + £1,700 = £1,800, two receipts, no duplicate reference', P(txOf(w).reduce((a, x) => a + x.amount, 0)) === 180000 && txOf(w).length === 2 && new Set(txOf(w).map(x => x.ref)).size === 2);
    go('payments'); ok('DP-B6 learner Payments: £1,800 paid, £0 outstanding, both payments in the history, no Pay now', /Paid so far£1,800\.00/.test(main()) && /Outstanding£0\.00/.test(main()) && /BACS-77001/.test(main()) && txOf(w).every(x => main().includes(x.ref)) && !$1('main [data-act="payInst"]'));
    go('dashboard'); ok('DP-B6 the dashboard no longer asks for the balance', !/Pay your balance/.test(main()));
  });
  await T('DP-B7 Finance and learner agree; a paid amount can\'t be collected again', async () => {
    const lp = (() => { asL(w.v); go('payments'); return main(); })();
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' }); const f = main();
    // PD-FD-01: deposit £100. Was: £300.
    ok('DP-B7 Finance → learner → Payments: fee £1,800, deposit paid, paid £1,800, outstanding £0, reconciles — the same as the learner', /Programme fee£1,800\.00/.test(f) && /Deposit£100\.00 — paid/.test(f) && /Paid to date£1,800\.00/.test(f) && /Outstanding£0\.00/.test(f) && /ReconcilesYes/.test(f) && /Paid so far£1,800\.00/.test(lp));
    ok('DP-B7 the same payment history on both sides (every receipt reference)', txOf(w).every(x => f.includes(x.ref) && lp.includes(x.ref)));
    // PD-FD-01: deposit £100. Was: £300.
    setUi('fpL', w.v); go('f-plans'); ok('DP-B7 Payment Plans: the schedule with the deposit and the paid balance; no Record payment on it', /Deposit£100\.00 — paid/.test(main()) && /Paid to date£1,800\.00/.test(main()) && !$a('main [data-act="finOffline"]').some(b => (b.dataset.k || '').startsWith(w.v + '|')));
    go('f-deposits'); ok('DP-B7 Deposits: Balance paid, no balance due', /Balance paid/.test((depRow(w) || {}).textContent || ''));
    ok('DP-B7 nothing of this learner is offered in Record offline payment any more', !payTargets().some(t => t.v === w.v));
    ACT.finOffline({ dataset: { k: w.v + '|nvq|1' } }); ok('DP-B7 a stale "Record payment" for the paid balance opens nothing', !MODAL);
    // PD-FD-01: the paid balance is £1,700. Was: £1,500.
    const stale = { key: w.v + '|nvq|1', v: w.v, pl: pl(w), r: pl(w).rows[0], due: 1700, cur: 'GBP' }, n = txOf(w).length;
    ok('DP-B7 Finance recording the paid balance again (stale dialog) is refused: no receipt, row unchanged', recordPayment(stale, 1700, 'BACS-77003', 'Bank transfer', 'again') === false && txOf(w).length === n && pl(w).rows[0].paid === 1700);
    asL(w.v); const g1 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })), g2 = payCo(() => ACT.payBalance({ dataset: {} })), g3 = (() => { ACT.chPayBank({ dataset: { e: 'nvq', n: '1' } }); const o = !!MODAL; closeModal(); return o; })();
    ok('DP-B7 the learner can\'t pay it again: Pay now, Pay balance and Bank transfer open no checkout', !g1.opened && !g2.opened && !g3 && txOf(w).length === n);
    const e1 = cdBatch().enrolled; ACT.suPay(); ok('DP-B7 the sign-up payment can\'t be made again (no second seat, no second plan)', cdBatch().enrolled === e1 && w.plans.filter(p => p.e === 'nvq').length === 1 && txOf(w).length === n);
  });
  await T('DP-B8 wrong learner and unauthorised Finance actions', async () => {
    const amira = STORE.worlds.CD1, a0 = J(pl(amira).rows);
    asL(w.v); ACT.payInst({ dataset: { e: 'nvq', n: '2' } }); const o1 = !!MODAL; closeModal();
    ok('DP-B8 a learner\'s payment actions reach only their own plan (no row 2 on Tara\'s plan; Amira\'s rows untouched)', !o1 && J(pl(amira).rows) === a0);
    go('f-deposits'); ok('DP-B8 a learner can\'t open Finance → Deposits', !/Seat held until/.test(app()));
    const n0 = ADMIN.audit.length; ACT.finOffline({ dataset: {} }); ok('DP-B8 learner portal: Record offline payment is refused (no dialog, audited)', !MODAL && ADMIN.audit.length > n0);
    ACA(); ACT.finOffline({ dataset: {} }); ok('DP-B8 Academic Admin: Record offline payment is refused in the action (no dialog)', !MODAL && /Finance Admin or the Super Administrator/.test(toastTxt()));
    ACT.dpDepRefund({ dataset: { v: w.v } }); ok('DP-B8 Academic Admin: Raise deposit refund is refused', !MODAL);
    FA('A'); go('f-deposits'); ok('DP-B8 the Super Administrator can open Finance → Deposits', /Deposits/.test(main()) && !!depRow(w));
  });

  /* ================= C. Reset: back to the starting demo; agreed terms preserved ================= */
  await T('DP-C reset', async () => {
    ok('DP-C before Reset: the two demo learners\' agreed schedules are untouched by the test learner', snapCD() === cd0);
    ACT.drReset(); press();
    // PD-FD-01: back to the starting bank transfers (Tom only) and Deposits (Sam, Tom). Was: no bank transfers, Deposits empty.
    ok('DP-C Reset demo: the temporary learner is gone, the batch count is back to ' + e0 + ', bank transfers and Deposits back to the start (Tom awaiting; Sam and Tom only)', !Object.values(STORE.worlds).some(x => x.me && x.me.email === 'tara.quinn@test.example') && cdBatch().enrolled === e0 && bankOf() === bank0 && J(depNames()) === J(['Sam Deposit (demo)', 'Tom Transfer (demo)']), J([bankOf(), depNames()]));
    ok('DP-C Reset: Amira\'s and Dev\'s agreed schedules are identical to the start', snapCD() === cd0);
  });

  // PD-FD-01: the demo programme already has a £100 custom deposit, so scenario B changes it to £200 (£1,600 remaining). Was: £100 custom deposit, £1,700 remaining.
  /* ================= D. Scenario B: net-of-deposit — £1,800 fee, £200 custom deposit, £1,600 remaining ================= */
  let w2;
  await T('DP-D scenario B (net basis, through Course Builder and Finance)', async () => {
    const pr = cdPr(), id = pr.id; ACA(); go('a-programmes', { id, tab: 'fees' }); ACT.cb8Start({ dataset: { p: id } });
    const r = $1('main input[name="e1-wdm"][value="own"]'); r.checked = true; INP.e1DepMode(r); $1('main #e1-d').value = '200'; ACT.cb8Dep({ dataset: { p: id } });
    ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) press(); const wf = cb8Wf(pr);
    // PD-FD-01: changed to a different custom amount (£200), since the programme is already at £100. Was: £100.
    ok('DP-D Course Builder → Fees & payments: a custom £200 deposit (changed from £100), submitted to Finance', !!wf && !!wf.qid && cb8Work(pr).dep.mode === 'own' && cb8Work(pr).dep.amount === 200, J(wf));
    FA(); go('a-queue', { id: wf.qid }); ACT.e1Decide({ dataset: { id: wf.qid, a: 'approve' } }); if (MODAL) reason('Custom deposit for the test');
    // PD-FD-01: the new version carries £200. Was: £100.
    const cur = s4PlanCur(id); ok('DP-D Finance approves: a new plan version (v' + v0 + ' → v' + cur.v + ') with the £200 deposit', cur.v === v0 + 1 && cur.pkg.dep.eff === 200);
    ok('DP-D Amira\'s and Dev\'s agreed terms are not changed by the new version (still plan v' + v0 + ')', snapCD() === cd0);
    w2 = register('Uma Reed', 'uma.reed@test.example'); toPayment(w2);
    // PD-FD-01: £200 deposit, £1,600 balance. Was: £100 / £1,700.
    ok('DP-D the payment step: deposit £200 now, then the £1,600 balance', /Deposit \(holds your seat\) — £200\.00 now/.test(main()) && /then the £1,600\.00 balance/.test(main()));
    choose('deposit', 'card'); const c = payCo(() => click($1('main [data-act="suPay"]')));
    const p = pl(w2), L = fpLedger(p);
    // PD-FD-01: £200 collected, £1,600 remaining, not £1,400 (deposit subtracted twice). Was: £100 / £1,700, not £1,600.
    ok('DP-D card deposit: £200 collected; the remaining schedule totals £1,600 (one row), not £1,400', c.amt === '£200.00' && p.rows.length === 1 && p.rows[0].amount === 1600 && L.sched === 1600 && L.dep === 200 && L.basis === 'net' && L.paid === 200 && L.outstanding === 1600 && L.ok, J([c.amt, p.rows]));
    // PD-FD-01: pinned deposit £200. Was: £100.
    ok('DP-D the learner\'s terms are pinned to the new version (£200 deposit)', cb9Pin(w2).planV === cur.v && cb9Pin(w2).dep.eff === 200);
    asL(w2.v); go('payments'); const c2 = payCo(() => click($1('main [data-act="payInst"][data-n="1"]')));
    // PD-FD-01: balance £1,600. Was: £1,700.
    ok('DP-D the balance checkout asks £1,600 (the £200 isn\'t subtracted again); total received £1,800 = the fee', c2.amt === '£1,600.00' && P(txOf(w2).reduce((a, x) => a + x.amount, 0)) === 180000 && fpLedger(pl(w2)).outstanding === 0 && fpLedger(pl(w2)).ok);
  });

  /* ================= E. Scenario A: gross schedule — the model only (no approved plan makes one, PD-FP-01) ================= */
  await T('DP-E scenario A (gross basis, model)', async () => {
    // test-only record on the temporary learner: instalments worked out from the full fee, with a deposit awaiting confirmation
    const mk = (rows, dep) => { const p = { e: 'nvq', title: w2.nvq.title, plan: 'Instalments', total: rows.reduce((a, x) => a + x, 0), partial: true, cur: 'GBP', depBasis: 'gross', deposit: { amount: dep, status: 'Awaiting confirmation by Finance', paidAt: null }, rows: rows.map((a, i) => ({ n: i + 1, amount: a, due: D(10 + i * 30), status: 'Pending', paid: 0 })) }; w2.plans = w2.plans.filter(x => x.e !== 'nvq'); w2.plans.unshift(p); return p; };
    let p = mk([300, 300, 300, 300, 300, 300], 100);
    ok('DP-E before the deposit is paid: nothing credited, first instalment still £300 due', fpLedger(p).credit === 0 && fpLedger(p).outstanding === 1800);
    FA(); const t = payTargets().find(x => x.key === w2.v + '|dep'); ok('DP-E Finance can confirm the deposit (Record offline payment target)', !!t);
    recordPayment(t, 100, 'BACS-77100', 'Bank transfer', 'Deposit received');
    ok('DP-E £100 deposit credited once to instalment 1: £200 left on it (£300 − £100)', p.rows[0].credit === 100 && p.rows[0].paid === 100 && p.rows[0].amount - p.rows[0].paid === 200 && p.rows[0].status === 'Partially paid');
    fpCredit(w2, 'again'); fpCredit(w2, 'again');
    ok('DP-E no duplicate credit when the credit runs again', p.rows[0].credit === 100 && p.rows.slice(1).every(r => !r.credit) && fpLedger(p).credit === 100);
    asL(w2.v); const c = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } }));
    ok('DP-E the learner\'s first instalment checkout asks £200', c.amt === '£200.00', c.amt);
    const L = fpLedger(p); ok('DP-E ledger: £300 paid (deposit £100 + £200), £1,500 outstanding = £1,800; reconciles', L.paid === 300 && L.outstanding === 1500 && L.ok);
    p = mk([300, 300, 300, 300, 300, 300], 500); FA(); recordPayment(payTargets().find(x => x.key === w2.v + '|dep'), 500, 'BACS-77101', 'Bank transfer', 'Deposit received');
    // PD-FC-12 supersedes the carry-forward. Was: "£200 carried to instalment 2". Now: held unallocated and flagged for Finance review (PD-FC-13: not offered at sign-up).
    ok('DP-E deposit greater than the first instalment (£500 vs £300): instalment 1 fully credited (£300); the £200 rest is held for Finance review, not moved; never below zero (PD-FC-12)', p.rows[0].credit === 300 && p.rows[0].status === 'Paid' && !p.rows[1].credit && p.rows[1].paid === 0 && p.depReview && p.depReview.amount === 200 && p.rows.every(r => r.amount - r.paid >= 0) && fpLedger(p).ok);
  });

  /* ================= F. Edge cases ================= */
  await T('DP-F refund of the deposit (card)', async () => {
    ACT.drReset(); press(); const w3 = register('Vera Lane', 'vera.lane@test.example'); toPayment(w3); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const p = pl(w3), ref = w3.signup.pay.ref, e1 = cdBatch().enrolled;
    FA(); go('f-deposits'); const b = $a('main [data-act="dpDepRefund"]').find(x => x.dataset.v === w3.v);
    ok('DP-F Deposits: Raise deposit refund on the seat-held card deposit', !!b && /Seat held/.test(depRow(w3).textContent));
    // PD-FD-01: deposit £100. Was: £300.
    click(b); ok('DP-F the existing refund dialog opens on the deposit transaction (£100, category Deposit)', MODAL && MODAL.title === 'Raise refund' && mtxt().includes(ref) && $1('#rr-cat').value === 'Deposit' && +$1('#rr-a').value === 100);
    $1('#rr-t').value = 'Learner withdrew before the start'; press(); const it = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref);
    ok('DP-F the refund waits for another Finance Admin; until then the deposit still counts as paid', !!it && it.status === 'Pending' && p.deposit.status === 'Paid');
    FA('FB'); go('a-queue', { id: it.id }); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); reason('Approved');
    const L = fpLedger(p);
    // PD-FD-01: balance £1,700. Was: £1,500.
    ok('DP-F approved: the deposit is Refunded and no longer counts as paid (paid £0; the £1,700 balance still outstanding; reconciles)', it.status === 'Approved' && p.deposit.status === 'Refunded' && L.st === 'refunded' && L.paid === 0 && L.outstanding === 1700 && L.ok);
    go('f-deposits'); ok('DP-F Deposits: the seat of the refunded deposit shows "Finance review required"; no refund or balance action', /Finance review required/.test(depRow(w3).textContent) && !$a('main [data-act="dpDepRefund"]').some(x => x.dataset.v === w3.v) && !$a('main [data-act="finOffline"]').some(x => (x.dataset.k || '').startsWith(w3.v + '|')));
    ok('DP-F no seat rule is invented for a refund: the seat stays counted (no overselling) under Finance review, audited', cdBatch().enrolled === e1 && w3.signup.batch === CD_B && dpSeat(w3).st === 'review' && ADMIN.audit.some(a => a.action === 'Seat needs Finance review'));
    // PD-FD-01: stale balance £1,700. Was: £1,500.
    ok('DP-F no balance can be recorded toward it (not offered; a stale target is refused)', !payTargets().some(t => t.v === w3.v && t.r) && recordPayment({ key: w3.v + '|nvq|1', v: w3.v, pl: p, r: p.rows[0], due: 1700, cur: 'GBP' }, 1700, 'BACS-77300', 'Bank transfer', 'x') === false && p.rows[0].paid === 0);
    // PD-FD-01: deposit £100. Was: £300.
    asL(w3.v); go('payments'); ok('DP-F learner Payments: the deposit refunded, paid £0, "Finance review required", no Pay now', /Deposit £100.00 refunded/.test(main()) && /Paid so far£0.00/.test(main()) && /Finance review required/.test(main()) && !$1('main [data-act="payInst"]'));
    const c3 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })); go('dashboard'); ok('DP-F the learner cannot pay toward it (no checkout) and the dashboard says Finance review is needed', !c3.opened && /Your place needs Finance review/.test(main()) && !/Pay your balance/.test(main()));
  });
  await T('DP-F partial refund of the deposit', async () => {
    ACT.drReset(); press(); const w4 = register('Will Ash', 'will.ash@test.example'); toPayment(w4); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const ref = w4.signup.pay.ref, t = allTx().find(x => x.ref === ref); FA(); raiseRefund(t, { cat: 'Deposit', text: 'part', cons: 'Retain access', amount: 40 }); press();
    const it = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref); FA('FB'); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); reason('Approved');
    // PD-FD-01: a £40 part of the £100 deposit (still partial). Was: £100 of £300.
    ok('DP-F a £40 partial refund of the £100 deposit leaves it counting as paid (no partial-deposit rule), audited, and puts the seat under Finance review', it.status === 'Approved' && pl(w4).deposit.status === 'Paid' && fpLedger(pl(w4)).paid === 100 && ADMIN.audit.some(a => a.action === 'Partial deposit refund') && dpSeat(w4).st === 'review');
  });
  await T('DP-F declined card, no deposit, capacity', async () => {
    ACT.drReset(); press(); const w5 = register('Xia Moss', 'xia.moss@test.example'); toPayment(w5); choose('deposit', 'card'); const e1 = cdBatch().enrolled;
    const c = payCo(() => click($1('main [data-act="suPay"]')), true);
    ok('DP-F declined card deposit: no sign-up completion, no seat, no plan, no receipt', /declined/.test(c.t) && !w5.signup.done && cdBatch().enrolled === e1 && !pl(w5) && !txOf(w5).length);
    const b = cdBatch(), cap0 = b.cap; b.cap = b.enrolled; render();
    ok('DP-F batch full: the payment step says the batch is full and no other has a place; no Pay button', /DEMO-L3-JAN27 is now full and no other batch has a place/.test(main()) && !$1('main [data-act="suPay"]'));
    ACT.suPay(); ok('DP-F paying anyway does nothing (no seat over capacity)', !w5.signup.done && b.enrolled === b.cap);
    b.cap = cap0;
  });

  /* ================= G. Round 2: accounts, seat reservation lifecycle, eligibility ================= */
  let ta, um, ve, rBase;
  await T('DP-G1 several registered accounts in one tab, no data loss', async () => {
    ACT.drReset(); press(); const b = cdBatch(); b.cap = b.enrolled + 2; // test-only capacity: two places left
    // PD-FD-01: Tom Transfer (demo) already holds a reserved seat; capture the reserved baseline. Was: none reserved before the test.
    rBase = dpCounts(b).reserved;
    ta = register('Tara Quinn', 'tara.quinn@test.example'); toPayment(ta); choose('deposit', 'bank'); click($1('main [data-act="suPay"]'));
    const taSnap = J([ta.me, ta.signup.pay, pl(ta)]), taKey = ta.v;
    um = register('Uma Reed', 'uma.reed@test.example');
    ok('DP-G1 the second registration gets its own record and learner ID', um !== ta && um.v !== taKey && um.me.id !== ta.me.id && STORE.worlds[taKey] === ta && J(regKeys().sort()) === J([taKey, um.v].sort()) && [ta.me.id, um.me.id].every(id => demoLearners().some(l => l.id === id)), J(regKeys()));
    ok('DP-G1 the first learner\'s sign-up, deposit, plan and bank transfer are untouched', J([ta.me, ta.signup.pay, pl(ta)]) === taSnap && STORE.chBank.find(x => x.ref === ta.signup.pay.ref).v === taKey && ta.signup.batch === CD_B);
    toPayment(um); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    ok('DP-G1 both hold their own seat: the count rose by exactly two', cdBatch().enrolled === b.cap && dpSeat(ta).st === 'reserved' && dpSeat(um).st === 'reserved');
    FA(); go('f-deposits'); ok('DP-G1 Finance sees both accounts and both deposits', !!depRow(ta) && !!depRow(um) && /Awaiting confirmation/.test(depRow(ta).textContent) && /Seat held/.test(depRow(um).textContent));
    ACA(); go('a-learners'); ok('DP-G1 both are in the learner list', /Tara Quinn/.test(main()) && /Uma Reed/.test(main()));
    signOutUI(); $1('#si-email').value = 'tara.quinn@test.example'; $1('#si-pw').value = 'Demo!Pass2026'; submit('form[data-submit="signin"]');
    ok('DP-G1 signing in by email opens Tara\'s own account (only the active account changes; no seat is added)', S.signedIn && W === ta && cdBatch().enrolled === b.cap);
    go('payments'); ok('DP-G1 Tara sees only her own payments', /awaiting confirmation by Finance/.test(main()) && !txOf(um).some(x => main().includes(x.ref)));
  });
  await T('DP-G2 two active holds against limited capacity', async () => {
    // NB-1: with no eligible batch Apply creates nothing (was: the sign-up started and stopped at choosing a batch); Vera starts in DP-G4
    const b = cdBatch(); ve = register('Vera Lane', 'vera.lane@test.example'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T).id } }); const mt = (MODAL || {}).title, st = mtxt(); closeModal();
    ok('DP-G2 with two seats held the batch is full: a third learner cannot start a sign-up (no application, seat or charge)', mt === 'No intake available right now' && /can take a new learner at the moment/.test(st) && !ve.signup && !ve.admission && b.enrolled === b.cap, st.slice(0, 300));
    // PD-FD-01: two new holds on top of the baseline (Tom). Was: reserved === 2.
    const c = dpCounts(b); ok('DP-G2 counts: ' + c.occupied + ' confirmed + ' + c.reserved + ' reserved = ' + b.enrolled + ' of ' + b.cap + ' (two new holds + ' + rBase + ' demo hold)', rBase === 1 && dpSeat(STORE.worlds.CD5).st === 'reserved' && c.reserved === rBase + 2 && c.occupied + c.reserved === b.enrolled && b.enrolled === b.cap);
    // PD-FD-01: reserved = baseline + 2. Was: 2 reserved.
    ACA(); go('a-batches'); ok('DP-G2 Batches: the capacity cell says how many are only reserved', new RegExp(`${c.occupied} secured · ${rBase + 2} reserved`).test(main()));
    // PD-FD-01: tags = baseline + 2. Was: 2.
    go('a-batches', { id: CD_B, tab: 'roster' }); ok('DP-G2 the batch roster tags each reserved learner (Seat reserved)', $a('main .dp-rtag').length === rBase + 2 && /Seat reserved/.test(main()), main().slice(0, 600));
    ACT.addToBatch({ dataset: { id: CD_B } }); const full = /full|waitlist/i.test(mtxt() + toastTxt()); closeModal();
    ok('DP-G2 staff capacity checks count the holds too (Add learner sees a full batch)', full || b.enrolled >= b.cap);
  });
  await T('DP-G3 consistent status on the learner, admin and Finance screens', async () => {
    const t = dpSeatTxt(ta);
    asL(ta.v); go('admission'); const a1 = main(); go('payments'); const a2 = main(); go('dashboard'); const a3 = main();
    ok('DP-G3 learner: reserved (not a confirmed place) on Admission, Payments and the dashboard', /Seat reserved/.test(a1) && /not yet a secured place/.test(a2) && /Seat reserved until .* — deposit awaiting confirmation/.test(a3));
    ACA(); go('a-admissions', { id: 'APP-' + ta.v }); ok('DP-G3 admin Sign-up card: the same seat status (reserved, not yet a secured place)', main().includes('Reserved in ' + CD_B + ' until') && /not yet a secured place/.test(main()) && /Seat reserved/.test(main()) && !!t);
    FA(); go('f-learner', { id: ta.me.id, tab: 'payments' }); ok('DP-G3 Finance learner summary: the same seat status', main().includes('Reserved in ' + CD_B + ' until') && /not yet a secured place/.test(main()));
  });
  await T('DP-G4 hold expiry is evaluated against the agreed timestamp; an expired hold stops blocking', async () => {
    FA();
    const b = cdBatch(), n0 = b.enrolled, hold = pl(ta).deposit.hold;
    go('f-plans'); click($1('main [data-act="cb10Advance"][data-d="15"]'));
    ok('DP-G4 +15 days (before the agreed hold): both seats still reserved', dpSeat(ta).st === 'reserved' && b.enrolled === n0);
    const left = Math.floor((new Date(hold) - dpNow()) / DAY), cdOf = () => ($a('main .countdown[data-dp-hold]')[0] || {}).textContent || '';
    go('f-deposits'); const cdF = cdOf(); asL(um.v); go('dashboard'); const cdL = cdOf(); FA(); go('f-plans');
    ok('DP-G4 the seat-hold countdowns follow the simulated date on Finance Deposits and the learner dashboard (' + left + ' days left, not ' + (left + 15) + ')', cdF.startsWith(left + 'd') && cdL.startsWith(left + 'd'), J([cdF, cdL]));
    click($1('main [data-act="cb10Advance"][data-d="15"]')); // simulated date now past the 28-day hold
    // PD-FD-01: Tom Transfer (demo) hold (1 Nov 2026) also ends, so the count drops by three. Was: drops by two.
    ok('DP-G4 past the hold: both seats released when the screen is drawn (P-32), and the earlier demo hold (Tom) too; the count drops by three', chReleased(ta) && chReleased(um) && chReleased(STORE.worlds.CD5) && b.enrolled === n0 - 3 && pl(ta).deposit.hold === hold);
    ok('DP-G4 the release is audited with the agreed hold time; nothing refunded or charged (no new transaction)', ADMIN.audit.some(a => a.action === 'Seat hold ended — seat released' && a.before.includes(fdt(hold))) && txOf(ta).length === 0 && txOf(um).length === 1 && pl(um).deposit.status === 'Paid');
    go('f-deposits'); ok('DP-G4 Deposits: "Seat released — deposit not received" (Tara, unconfirmed transfer) and "deposit held (Finance review)" (Uma; no retention recorded)', /Seat released — deposit not received/.test(depRow(ta).textContent) && /Seat released — deposit held \(Finance review\)/.test(depRow(um).textContent));
    const tref = ta.signup.pay.ref, hTa = ta.admission.history.slice(-1)[0][0], hUm = um.admission.history.slice(-1)[0][0];
    ok('DP-G4 pending transfer expired: no payment or forfeit recorded; the bank reference is kept for Finance (bank list, Deposits row, release record)', !txOf(ta).length && STORE.chBank.find(x => x.ref === tref).status === 'Awaiting confirmation' && depRow(ta).textContent.includes(tref) && hTa.includes(tref) && /deposit not received/.test(hTa) && !/kept/.test(hTa) && ta.admission.deposit.kept === false);
    go('f-exceptions', { tab: 'bank' }); ok('DP-G4 the transfer is still listed to confirm, with Record offline payment', $a('main [data-act="finOffline"]').some(x => x.dataset.k === ta.v + '|dep'));
    ok('DP-G4 paid deposit expired: the receipt stays in the ledger, nothing refunded or retained is recorded, and the record says so', txOf(um).length === 1 && /deposit received — held; no refund or retention recorded/.test(hUm) && !/kept/.test(hUm) && !allTx().some(x => x.v === um.v && x.refund));
    click($1('#app [data-act="cb10Reset"]') || $1('main [data-act="cb10Reset"]') || { click: () => ACT.cb10Reset() });
    if ((STORE.cbRem || {}).offset) ACT.cb10Reset();
    // PD-FD-01: three released (Tom too). Was: n0 - 2.
    ok('DP-G4 back to today: the released seats stay released (collecting nothing, restoring nothing)', chReleased(ta) && chReleased(um) && chReleased(STORE.worlds.CD5) && b.enrolled === n0 - 3);
    // NB-1: Vera starts her sign-up now that a place is free (DP-G2 created none)
    asL(ve.v); startSignup(ve); contSignup(ve); choose('deposit', 'card'); const c = payCo(() => click($1('main [data-act="suPay"]')));
    // PD-FD-01: one of the three freed places taken. Was: n0 - 1.
    ok('DP-G4 the freed place can now be taken: the third learner reserves it', c.opened && ve.signup.done && dpSeat(ve).st === 'reserved' && b.enrolled === n0 - 2);
  });
  await T('DP-G5 no balance toward a released reservation; money never restores it', async () => {
    const b = cdBatch(), n0 = b.enrolled;
    asL(um.v); go('payments');
    ok('DP-G5 learner Payments: "Seat released", no Pay now, and Next due does not point at the released balance', /Seat released/.test(main()) && !$1('main [data-act="payInst"]') && /Next dueNothing due/.test(main()));
    const c1 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })), c2 = payCo(() => ACT.payBalance({ dataset: {} })); ACT.chPayBank({ dataset: { e: 'nvq', n: '1' } }); const o3 = !!MODAL; closeModal();
    ok('DP-G5 Pay now, Pay balance and Bank transfer open nothing toward it', !c1.opened && !c2.opened && !o3 && txOf(um).length === 1);
    FA(); ok('DP-G5 Finance isn\'t offered the released balance', !payTargets().some(t => t.v === um.v && t.r));
    // PD-FD-01: stale balance £1,700. Was: £1,500.
    ok('DP-G5 Finance recording it anyway (stale dialog) is refused and audited', recordPayment({ key: um.v + '|nvq|1', v: um.v, pl: pl(um), r: pl(um).rows[0], due: 1700, cur: 'GBP' }, 1700, 'BACS-77400', 'Bank transfer', 'x') === false && pl(um).rows[0].paid === 0 && ADMIN.audit.some(a => a.action === 'Blocked: balance toward an invalid reservation'));
    ACT.finOffline({ dataset: { k: um.v + '|nvq|1' } }); ok('DP-G5 the row\'s Record payment opens nothing and says why', !MODAL && /seat was released/.test(toastTxt()));
    asL(ta.v); ACT.chSignAgain(); ok('DP-G5 sign up again waits while the released seat\'s bank transfer is unconfirmed (Finance review)', !ta.signup.again && /confirm your earlier bank transfer/.test(toastTxt()));
    FA(); const t = payTargets().find(x => x.key === ta.v + '|dep'); ok('DP-G5 the deposit itself can still be recorded (money received is never refused)', !!t);
    // PD-FD-01: the late deposit is £100. Was: £300.
    recordPayment(t, 100, 'BACS-77401', 'Bank transfer', 'Arrived late'); go('f-deposits');
    ok('DP-G5 deposit received after the release: recorded, the seat is not restored, Finance review shown', pl(ta).deposit.status === 'Paid' && chReleased(ta) && b.enrolled === n0 && /deposit received after release \(Finance review\)/.test(depRow(ta).textContent));
  });
  await T('DP-G6 sign up again: a new place, the earlier record kept', async () => {
    const b = cdBatch(), n0 = b.enrolled, old = pl(ta);
    asL(ta.v); click($1('#app [data-act="chSignAgain"]')); go('admission'); const dob = $1('#su-dob'), ad = $1('#su-ad'); if (dob && !dob.value) dob.value = '1992-03-04'; if (ad && !ad.value) ad.value = '9 Test Road, Luton';
    for (let g = 0; g < 4 && ta.signup.step < 4 && $1('main [data-act="suNext"]'); g++) click($1('main [data-act="suNext"]'));
    if (ta.signup.step === 3) { setUi('suSig', chFullName(ta)); setUi('suDecl', true); render(); const sg = $1('main #su-sign'); if (sg) click(sg); } render();
    ok('DP-G6 signing up again: no deposit offered (instalments only) and no seat taken before payment', ta.signup.step === 4 && b.enrolled === n0 && !$1('main input[name="cb9-pay"][value="deposit"]'));
    const c = payCo(() => click($1('main [data-act="suPay"]')));
    ok('DP-G6 paying the first instalment takes a new place (count +1); the seat is confirmed', c.opened && ta.signup.done && b.enrolled === n0 + 1 && dpSeat(ta).st === 'occupied');
    ok('DP-G6 the earlier deposit record is kept, read-only (history), not payable', (ta.plansHist || []).includes(old) && old.deposit.status === 'Paid' && old.rows[0].paid === 0);
    go('payments'); ok('DP-G6 learner Payments shows the earlier record, marked "Nothing on this record is payable"', /earlier payment record/.test(main()) && /Nothing on this record is payable/.test(main()));
    FA(); go('f-deposits'); ok('DP-G6 Deposits keeps the earlier deposit row', $a('main tbody tr').filter(tr => tr.textContent.includes('Tara Quinn')).length >= 1 && /Earlier record \(kept\)/.test(main()));
  });
  await T('DP-H1 refund totals and duplicate refunds', async () => {
    // PD-FD-01: capture the reserved baseline (Tom). Was: none.
    ACT.drReset(); press(); const rH = dpCounts(cdBatch()).reserved; const w = register('Nia Park', 'nia.park@test.example'); toPayment(w); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const ref = w.signup.pay.ref, tx = () => allTx().find(x => x.ref === ref), approve = id => { FA('FB'); ACT.qDo({ dataset: { id, a: 'approve' } }); reason('Approved'); };
    // PD-FD-01: a £40 part of the £100 deposit. Was: £100 of £300.
    FA(); raiseRefund(tx(), { cat: 'Deposit', text: 'part', cons: 'Retain access', amount: 40 }); press(); const i1 = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref); approve(i1.id);
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' });
    // PD-FD-01: £100 received, £40 refunded, £60 net. Was: £300 / £100 / £200.
    ok('DP-H1 partial refund: Finance shows received £100.00, refunded £40.00, net received £60.00 (the deposit still counts toward the fee, PD-DP-06)', /Received £100\.00 · refunded £40\.00 · net received £60\.00/.test(main()) && fpLedger(pl(w)).paid === 100);
    // PD-FD-01: £100 / £40 / £60. Was: £300 / £100 / £200.
    asL(w.v); go('payments'); ok('DP-H1 the learner sees the same received, refunded and net figures, and Finance review required', /Received £100\.00 · refunded £40\.00 · net received £60\.00/.test(main()) && /Finance review required/.test(main()) && !$1('main [data-act="payInst"]'));
    // PD-FD-01: remainder £60. Was: £200.
    FA(); ok('DP-H1 only the remainder can still be refunded (£60)', refundable(tx()) === 60);
    // PD-FD-01: remainder £60, £80 refused. Was: £200, £250 refused.
    raiseRefund(tx()); ok('DP-H1 the refund dialog offers the remainder, and more than the remainder is refused', +$1('#rr-a').value === 60 && (() => { $1('#rr-a').value = '80'; $1('#rr-t').value = 'too much'; return prim() === false; })()); closeModal();
    raiseRefund(tx()); $1('#rr-t').value = 'rest'; press(); const i2 = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref && i !== i1); approve(i2.id);
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' });
    // PD-FD-01: £100 received and refunded. Was: £300.
    ok('DP-H1 full refund: the deposit no longer counts as paid; received £100.00, refunded £100.00, net £0.00', pl(w).deposit.status === 'Refunded' && fpLedger(pl(w)).paid === 0 && /Received £100\.00 · refunded £100\.00 · net received £0\.00/.test(main()));
    ACT.txOpen({ dataset: { r: ref, p: tx().payer } }); const again = MODAL && MODAL.actions.some(a => a.label === 'Raise refund'); closeModal();
    ACT.dpDepRefund({ dataset: { v: w.v } }); const dlg = !!MODAL; closeModal();
    // PD-FD-01: name only: parts reach £100. Was: £300.
    ok('DP-H1 no further refund can be raised: the transaction shows Refunded once the two parts reach £100 (PD-DP-18), and Deposits refund is refused', refundable(tx()) === 0 && tx().status === 'Refunded' && !again && !dlg, J([refundable(tx()), tx().status, again, dlg]));
    // PD-FD-01: reserved = baseline (Tom) + 1. Was: reserved === 1.
    const c = dpCounts(cdBatch()); ok('DP-H1 the refunded reservation stays counted as reserved under Finance review — never as a secured place', dpSeat(w).st === 'review' && c.reserved === rH + 1 && c.occupied === cdBatch().enrolled - 1 - rH);
  });
  await T('DP-H2 balance paid is not admission approval', async () => {
    ACT.drReset(); press(); const w = register('Omar Bell', 'omar.bell@test.example'); toPayment(w); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    asL(w.v); go('payments'); payCo(() => click($1('main [data-act="payInst"][data-n="1"]')));
    ok('DP-H2 the balance is paid: the seat is secured, and the admission is still awaiting the Academic Admin', dpSeat(w).st === 'occupied' && fpLedger(pl(w)).outstanding === 0 && w.admission.status === 'Awaiting review');
    go('admission'); ok('DP-H2 learner Admission & Documents: application Awaiting review, and the seat as the payment position only', /Awaiting review/.test(main()) && /Seat secured/.test(main()) && /payment position only/.test(main()) && /Admission is decided separately \(currently: Awaiting review\)/.test(main()));
    ACA(); go('a-admissions', { id: 'APP-' + w.v }); ok('DP-H2 admin application: still Awaiting review with Approve available; the Sign-up card shows the seat separately', /Awaiting review/.test(main()) && !!$1(`main [data-act="appApprove"][data-id="APP-${w.v}"]`) && /Seat secured/.test(main()));
  });
  await T('DP-G7 eligibility window (28 days before start, fixed) versus hold length (configurable)', async () => {
    ACT.drReset(); press(); FA(); go('f-plans', { tab: 'templates' }); ACT.s4CfgEdit(); $1('#cf-h').value = '14'; reason('Shorter hold for the test');
    ok('DP-G7 Finance changes the seat hold to 14 days', S4().cfg.hold === 14);
    const w = register('Will Ash', 'will.ash@test.example'); toPayment(w); const b = cdBatch(), s0 = b.start;
    b.start = D(26, '09:00'); render(); ok('DP-G7 batch ' + daysTo(b.start) + ' days away (under 28): no deposit (eligibility is 28 days, not the 14-day hold)', daysTo(b.start) < 28 && !$1('main input[name="cb9-pay"][value="deposit"]'));
    b.start = D(29, '09:00'); render(); ok('DP-G7 batch 29 days away: deposit offered', !!$1('main input[name="cb9-pay"][value="deposit"]') && /balance within 14 days/.test(main()));
    b.start = s0; render(); ok('DP-G7 the demo batch (61 days away): deposit offered — 61 ≥ 28, so there is no contradiction', chDepositOk(b) && daysTo(b.start) >= 28 && !!$1('main input[name="cb9-pay"][value="deposit"]'));
    choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    ok('DP-G7 the new reservation is held for the configured 14 days', Math.round((new Date(pl(w).deposit.hold) - new Date(w.signup.pay.at)) / DAY) === 14);
  });
  await T('DP-G8 deposit plus instalments: not a route (audit of the existing configuration)', async () => {
    const pkg = s4PlanCur(cdPr().id).pkg;
    ok('DP-G8 a fee option\'s payment options are counts (1–24) only; the deposit is one separate setting per programme', pkg.opts.every(o => o.pay.every(x => Number.isInteger(x.k))) && ['none', 'default', 'own'].includes(pkg.dep.mode));
    // PD-FD-01: Sam and Tom (demo) are on "Deposit, then 6 payments" (PD-FC-11, 6 rows); the one-row rule is checked on every Deposit-and-balance plan. Was: first deposit plan found had 1 row.
    ok('DP-G8 the deposit-and-balance route always schedules one balance row (Sam and Tom, on Deposit then 6 payments, have six); the instalment route never has a deposit', Object.values(STORE.worlds).filter(x => dpHoldPl(x) && dpHoldPl(x).plan === 'Deposit and balance').every(x => dpHoldPl(x).rows.length === 1) && ['CD4', 'CD5'].every(k => dpHoldPl(STORE.worlds[k]) && dpHoldPl(STORE.worlds[k]).rows.length === 6) && ['CD1', 'CD2'].every(k => !pl(STORE.worlds[k]).deposit));
  });

  ACT.drReset(); press();
  ok('DP-Z final Reset: the starting demo (batch ' + e0 + ' enrolled, plan v' + v0 + ', hold 28 days, the two schedules identical)', cdBatch().enrolled === e0 && s4PlanCur(cdPr().id).v === v0 && S4().cfg.hold === 28 && snapCD() === cd0);
  // PD-FD-01: bank transfers back to the starting one (Tom). Was: none.
  ok('DP-Z Reset removes every temporary account (no registered learner, no registration, no simulated date, bank transfers back to the start: Tom only)', !Object.keys(STORE.worlds).some(k => /^G\d*$/.test(k)) && !Object.keys(PERSONAS).some(k => /^G\d*$/.test(k)) && !(STORE.regs || []).length && !((STORE.cbRem || {}).offset) && bankOf() === bank0, bankOf());
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
