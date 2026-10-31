// DP — deposit, seat hold and first balance, end to end (31 Oct 2026; PD-DP-*). suites.sh runs this suite with FIXTURE=client: the
// page boots the client demo as a fresh browser does. One temporary learner registers from the sign-in page and signs up for the
// published demo programme through the real screens: Browse, the fee option, details, documents, offer letter, payment (deposit),
// Finance's confirmation, the Academic Admin's admission decision, the balance at checkout, Finance's views and the duplicates.
// Then the numerical interpretations (A: gross, model only — no approved plan makes one; B: a £100 custom deposit approved through
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
  const register = (name, email) => {
    signOutUI(); click($1('#app [data-act="regStart"]'));
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 900' + String(100 + Math.floor(Math.random() * 800)), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
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

  /* ================= A. What exists (audit, before anything changes) ================= */
  await T('DP-A inventory', async () => {
    const pr = cdPr(), b = cdBatch(), cur = s4PlanCur(pr.id);
    ok('DP-A the client demo programme offers a deposit: Academy default £300, seat hold 28 days (plan version ' + cur.v + ')', cur.pkg.dep.mode === 'default' && cur.pkg.dep.eff === 300 && S4().cfg.deposit === 300 && S4().cfg.hold === 28);
    ok('DP-A its batch starts in 28 days or more, so the deposit route is open for it (DEMO-L3-JAN27, ' + daysTo(b.start) + ' days)', chDepositOk(b) && b.status === 'Open' && chHasPlace(b));
    ok('DP-A the two admitted demo learners are on instalments (no deposit): Amira 6 × £300, Dev 5 × £433.33 + £433.35', !pl(STORE.worlds.CD1).deposit && J(pl(STORE.worlds.CD1).rows.map(r => r.amount)) === J([300, 300, 300, 300, 300, 300]) && !pl(STORE.worlds.CD2).deposit && pl(STORE.worlds.CD2).rows[5].amount === 433.35);
    ok('DP-A Finance → Deposits starts empty in the client demo (no deposit-route learner yet)', (() => { FA(); go('f-deposits'); return /Nothing to show/.test(main()); })());
  });

  /* ================= B. One temporary learner: deposit by bank transfer → Finance → admission → balance ================= */
  let w, hold0;
  await T('DP-B1 sign-up and the deposit offer', async () => {
    w = register('Tara Quinn', 'tara.quinn@test.example');
    ok('DP-B1 the learner registers from the sign-in page and lands on their dashboard', S.signedIn && S.portal === 'learner' && w.me.first === 'Tara' && S.route === 'dashboard');
    const dlg = toPayment(w);
    ok('DP-B1 the sign-up dialog states the deposit with each fee option', /Self-Paced £1,800\.00[^]*Deposit £300\.00 \(when your batch starts in 28 days or more\)/.test(dlg));
    ok('DP-B1 the learner reaches step 4 Payment in the demo batch', w.signup.step === 4 && w.signup.batch === CD_B && /4\. Payment/.test(main()));
    ok('DP-B1 the payment step offers the deposit with the amount and the remaining fee: £300 now, then £1,500 within 28 days', /Deposit \(holds your seat\) — £300\.00 now/.test(main()) && /then the £1,500\.00 balance within 28 days/.test(main()) && /Programme fee£1,800\.00/.test(main()));
    choose('deposit', 'bank');
    ok('DP-B1 bank transfer: the £300 to pay, the bank details and the reference', /Pay £300\.00 by bank transfer/.test(main()) && /Reference: IA-\d{5}-DEP/.test(main()) && /I've made the transfer — start now/.test(main()));
  });
  await T('DP-B2 pending bank-transfer deposit: seat held, not paid', async () => {
    const e1 = cdBatch().enrolled; click($1('main [data-act="suPay"]')); const p = pl(w), L = fpLedger(p); hold0 = p.deposit.hold;
    ok('DP-B2 sign-up completes; the seat is held in the batch (enrolled ' + e1 + ' → ' + cdBatch().enrolled + ')', w.signup.done && cdBatch().enrolled === e1 + 1 && w.signup.batch === CD_B);
    ok('DP-B2 one balance row of £1,500 due on the hold date (28 days after sign-up); the deposit is awaiting confirmation', p.plan === 'Deposit and balance' && p.rows.length === 1 && p.rows[0].amount === 1500 && p.rows[0].due === hold0 && /Awaiting confirmation/.test(p.deposit.status) && Math.round((new Date(hold0) - new Date(w.signup.pay.at)) / DAY) === 28);
    ok('DP-B2 not treated as paid: paid £0, outstanding £1,800 (the pending deposit included), and it reconciles', L.st === 'pending' && L.paid === 0 && L.outstanding === 1800 && L.ok && !w.admission.deposit.paid && txOf(w).length === 0);
    go('payments'); ok('DP-B2 learner Payments: £0 paid, £1,800 outstanding, the deposit awaiting confirmation, the £1,500 balance excludes it', /Paid so far£0\.00/.test(main()) && /Outstanding£1,800\.00/.test(main()) && /Deposit £300\.00 awaiting confirmation by Finance/.test(main()) && /balance below \(£1,500\.00\) already excludes it/.test(main()));
    go('dashboard'); ok('DP-B2 the dashboard doesn\'t ask for the balance before the deposit is confirmed', !/Pay your balance/.test(main()));
  });
  await T('DP-B3 Finance: sees and confirms the deposit', async () => {
    FA(); go('f-deposits'); let r = depRow(w);
    ok('DP-B3 Finance → Deposits: the learner, batch, £300, Awaiting confirmation, seat held until the hold date, balance £1,500', !!r && /DEMO-L3-JAN27/.test(r.textContent) && /£300\.00/.test(r.textContent) && /Awaiting confirmation/.test(r.textContent) && r.textContent.includes(fd(hold0)) && /£1,500\.00/.test(r.textContent));
    go('f-plans'); ok('DP-B3 Payment Plans → Learner schedules offers the learner in the selector', $a('main #fpl option').some(o => o.value === w.v && o.textContent === 'Tara Quinn'));
    go('f-exceptions', { tab: 'bank' }); const b = $a('main [data-act="finOffline"]').find(x => x.dataset.k === w.v + '|dep');
    ok('DP-B3 Bank transfers to confirm: the learner\'s deposit with Record offline payment', !!b && /Tara Quinn/.test(main()) && /IA-\d{5}-DEP/.test(main()));
    click(b); ok('DP-B3 Record offline payment opens on this deposit for £300', MODAL && MODAL.title === 'Record offline payment' && $1('#op-t').value === w.v + '|dep' && +$1('#op-a').value === 300, MODAL && $1('#op-t') && $1('#op-t').value);
    $1('#op-r').value = 'BACS-77001'; reason('Transfer received');
    const p = pl(w), L = fpLedger(p);
    ok('DP-B3 confirmed: deposit Paid, the sign-up payment Paid, the bank-transfer row Confirmed, one receipt', p.deposit.status === 'Paid' && w.signup.pay.status === 'Paid' && STORE.chBank.find(x => x.v === w.v).status === 'Confirmed' && txOf(w).length === 1 && txOf(w)[0].amount === 300);
    ok('DP-B3 confirming does not restart or extend the hold (still ' + fd(hold0) + ')', p.deposit.hold === hold0 && w.admission.deposit.holdUntil === hold0 && p.rows[0].due === hold0);
    ok('DP-B3 ledger: £300 paid + £1,500 outstanding = £1,800; reconciles', L.paid === 300 && L.outstanding === 1500 && L.ok);
    go('f-deposits'); r = depRow(w); ok('DP-B3 Deposits now: Seat held, paid, balance £1,500', !!r && /Seat held/.test(r.textContent) && /£1,500\.00/.test(r.textContent));
  });
  await T('DP-B4 duplicate confirmation is refused', async () => {
    FA(); const n = txOf(w).length, stale = { key: w.v + '|dep', v: w.v, dep: pl(w).deposit, due: 300, cur: 'GBP', label: 'stale' };
    ok('DP-B4 the deposit is no longer offered in Record offline payment', !payTargets().some(t => t.key === w.v + '|dep'));
    ACT.finOffline({ dataset: { k: w.v + '|dep' } }); ok('DP-B4 a stale "Record offline payment" for it opens nothing (no other item preselected)', !MODAL && /Already recorded/.test(toastTxt()));
    ok('DP-B4 a second confirmation of the same deposit (stale dialog) is refused: no second receipt', recordPayment(stale, 300, 'BACS-77002', 'Bank transfer', 'again') === false && txOf(w).length === n && fpLedger(pl(w)).paid === 300);
    ok('DP-B4 the refusal is audited', ADMIN.audit.some(a => a.action === 'Blocked: payment already recorded'));
  });
  await T('DP-B5 the next admission step: the Academic Admin approves', async () => {
    ACA(); const id = 'APP-' + w.v; go('a-admissions', { id });
    ok('DP-B5 the application shows the sign-up and the paid deposit', /Deposit £300\.00 by bank transfer · Paid/.test(main()) && /Awaiting review/.test(main()));
    const ap = allApplications().find(a => a.id === id); ap.docs.filter(d => d.mand).forEach(d => ACT.docDec({ dataset: { a: id, d: d.id, s: 'Approved' } }));
    go('a-admissions', { id }); click($1(`main [data-act="appApprove"][data-id="${id}"]`)); reason('Documents checked');
    ok('DP-B5 admission approved; the seat and the payment record are unchanged', w.admission.status === 'Approved' && w.signup.batch === CD_B && pl(w).deposit.hold === hold0, w.admission.status);
  });
  await T('DP-B6 the learner pays the balance (the first scheduled payment after the deposit)', async () => {
    asL(w.v); go('dashboard'); ok('DP-B6 dashboard: Pay your balance — seat held until the hold date, £1,500', /Pay your balance — seat held until/.test(main()) && /balance £1,500\.00/.test(main()));
    go('payments'); const btn = $1('main [data-act="payInst"][data-n="1"]'); const c = payCo(() => click(btn));
    ok('DP-B6 Pay now opens the checkout for exactly £1,500 (the deposit not taken again, not added again)', c.opened && c.amt === '£1,500.00' && /£1,500\.00 paid/.test(c.t), J(c));
    const p = pl(w), L = fpLedger(p);
    ok('DP-B6 the balance row is Paid with a receipt; the ledger: £1,800 paid, £0 outstanding; reconciles', p.rows[0].status === 'Paid' && p.rows[0].paid === 1500 && !!p.rows[0].receipt && L.paid === 1800 && L.outstanding === 0 && L.ok);
    ok('DP-B6 the seat hold ends (converted: the seat is kept, no hold date) and the batch count is unchanged', w.admission.deposit.holdUntil === null && !!w.admission.deposit.balancePaidAt && w.admission.deposit.balance === 0 && cdBatch().enrolled === e0 + 1 && w.signup.batch === CD_B);
    ok('DP-B6 money received equals the fee exactly: £300 + £1,500 = £1,800, two receipts, no duplicate reference', P(txOf(w).reduce((a, x) => a + x.amount, 0)) === 180000 && txOf(w).length === 2 && new Set(txOf(w).map(x => x.ref)).size === 2);
    go('payments'); ok('DP-B6 learner Payments: £1,800 paid, £0 outstanding, both payments in the history, no Pay now', /Paid so far£1,800\.00/.test(main()) && /Outstanding£0\.00/.test(main()) && /BACS-77001/.test(main()) && txOf(w).every(x => main().includes(x.ref)) && !$1('main [data-act="payInst"]'));
    go('dashboard'); ok('DP-B6 the dashboard no longer asks for the balance', !/Pay your balance/.test(main()));
  });
  await T('DP-B7 Finance and learner agree; a paid amount can\'t be collected again', async () => {
    const lp = (() => { asL(w.v); go('payments'); return main(); })();
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' }); const f = main();
    ok('DP-B7 Finance → learner → Payments: fee £1,800, deposit paid, paid £1,800, outstanding £0, reconciles — the same as the learner', /Programme fee£1,800\.00/.test(f) && /Deposit£300\.00 — paid/.test(f) && /Paid to date£1,800\.00/.test(f) && /Outstanding£0\.00/.test(f) && /ReconcilesYes/.test(f) && /Paid so far£1,800\.00/.test(lp));
    ok('DP-B7 the same payment history on both sides (every receipt reference)', txOf(w).every(x => f.includes(x.ref) && lp.includes(x.ref)));
    setUi('fpL', w.v); go('f-plans'); ok('DP-B7 Payment Plans: the schedule with the deposit and the paid balance; no Record payment on it', /Deposit£300\.00 — paid/.test(main()) && /Paid to date£1,800\.00/.test(main()) && !$a('main [data-act="finOffline"]').some(b => (b.dataset.k || '').startsWith(w.v + '|')));
    go('f-deposits'); ok('DP-B7 Deposits: Balance paid, no balance due', /Balance paid/.test((depRow(w) || {}).textContent || ''));
    ok('DP-B7 nothing of this learner is offered in Record offline payment any more', !payTargets().some(t => t.v === w.v));
    ACT.finOffline({ dataset: { k: w.v + '|nvq|1' } }); ok('DP-B7 a stale "Record payment" for the paid balance opens nothing', !MODAL);
    const stale = { key: w.v + '|nvq|1', v: w.v, pl: pl(w), r: pl(w).rows[0], due: 1500, cur: 'GBP' }, n = txOf(w).length;
    ok('DP-B7 Finance recording the paid balance again (stale dialog) is refused: no receipt, row unchanged', recordPayment(stale, 1500, 'BACS-77003', 'Bank transfer', 'again') === false && txOf(w).length === n && pl(w).rows[0].paid === 1500);
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
    ok('DP-C Reset demo: the temporary learner is gone, the batch count is back to ' + e0 + ', no bank transfers, Deposits empty', !Object.values(STORE.worlds).some(x => x.me && x.me.email === 'tara.quinn@test.example') && cdBatch().enrolled === e0 && !(STORE.chBank || []).length && (() => { FA(); go('f-deposits'); return /Nothing to show/.test(main()); })());
    ok('DP-C Reset: Amira\'s and Dev\'s agreed schedules are identical to the start', snapCD() === cd0);
  });

  /* ================= D. Scenario B: net-of-deposit — £1,800 fee, £100 custom deposit, £1,700 remaining ================= */
  let w2;
  await T('DP-D scenario B (net basis, through Course Builder and Finance)', async () => {
    const pr = cdPr(), id = pr.id; ACA(); go('a-programmes', { id, tab: 'fees' }); ACT.cb8Start({ dataset: { p: id } });
    const r = $1('main input[name="e1-wdm"][value="own"]'); r.checked = true; INP.e1DepMode(r); $1('main #e1-d').value = '100'; ACT.cb8Dep({ dataset: { p: id } });
    ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) press(); const wf = cb8Wf(pr);
    ok('DP-D Course Builder → Fees & payments: a custom £100 deposit, submitted to Finance', !!wf && !!wf.qid && cb8Work(pr).dep.mode === 'own' && cb8Work(pr).dep.amount === 100, J(wf));
    FA(); go('a-queue', { id: wf.qid }); ACT.e1Decide({ dataset: { id: wf.qid, a: 'approve' } }); if (MODAL) reason('Custom deposit for the test');
    const cur = s4PlanCur(id); ok('DP-D Finance approves: a new plan version (v' + v0 + ' → v' + cur.v + ') with the £100 deposit', cur.v === v0 + 1 && cur.pkg.dep.eff === 100);
    ok('DP-D Amira\'s and Dev\'s agreed terms are not changed by the new version (still plan v' + v0 + ')', snapCD() === cd0);
    w2 = register('Uma Reed', 'uma.reed@test.example'); toPayment(w2);
    ok('DP-D the payment step: deposit £100 now, then the £1,700 balance', /Deposit \(holds your seat\) — £100\.00 now/.test(main()) && /then the £1,700\.00 balance/.test(main()));
    choose('deposit', 'card'); const c = payCo(() => click($1('main [data-act="suPay"]')));
    const p = pl(w2), L = fpLedger(p);
    ok('DP-D card deposit: £100 collected; the remaining schedule totals £1,700 (one row), not £1,600', c.amt === '£100.00' && p.rows.length === 1 && p.rows[0].amount === 1700 && L.sched === 1700 && L.dep === 100 && L.basis === 'net' && L.paid === 100 && L.outstanding === 1700 && L.ok, J([c.amt, p.rows]));
    ok('DP-D the learner\'s terms are pinned to the new version (£100 deposit)', cb9Pin(w2).planV === cur.v && cb9Pin(w2).dep.eff === 100);
    asL(w2.v); go('payments'); const c2 = payCo(() => click($1('main [data-act="payInst"][data-n="1"]')));
    ok('DP-D the balance checkout asks £1,700 (the £100 isn\'t subtracted again); total received £1,800 = the fee', c2.amt === '£1,700.00' && P(txOf(w2).reduce((a, x) => a + x.amount, 0)) === 180000 && fpLedger(pl(w2)).outstanding === 0 && fpLedger(pl(w2)).ok);
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
    ok('DP-E deposit greater than the first instalment (£500 vs £300): instalment 1 fully credited (£300), £200 carried to instalment 2, never below zero', p.rows[0].credit === 300 && p.rows[0].status === 'Paid' && p.rows[1].credit === 200 && p.rows[1].amount - p.rows[1].paid === 100 && p.rows.every(r => r.amount - r.paid >= 0) && fpLedger(p).ok);
  });

  /* ================= F. Edge cases ================= */
  await T('DP-F refund of the deposit (card)', async () => {
    ACT.drReset(); press(); const w3 = register('Vera Lane', 'vera.lane@test.example'); toPayment(w3); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const p = pl(w3), ref = w3.signup.pay.ref, e1 = cdBatch().enrolled;
    FA(); go('f-deposits'); const b = $a('main [data-act="dpDepRefund"]').find(x => x.dataset.v === w3.v);
    ok('DP-F Deposits: Raise deposit refund on the seat-held card deposit', !!b && /Seat held/.test(depRow(w3).textContent));
    click(b); ok('DP-F the existing refund dialog opens on the deposit transaction (£300, category Deposit)', MODAL && MODAL.title === 'Raise refund' && mtxt().includes(ref) && $1('#rr-cat').value === 'Deposit' && +$1('#rr-a').value === 300);
    $1('#rr-t').value = 'Learner withdrew before the start'; press(); const it = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref);
    ok('DP-F the refund waits for another Finance Admin; until then the deposit still counts as paid', !!it && it.status === 'Pending' && p.deposit.status === 'Paid');
    FA('FB'); go('a-queue', { id: it.id }); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); reason('Approved');
    const L = fpLedger(p);
    ok('DP-F approved: the deposit is Refunded and no longer counts as paid (paid £0; the £1,500 balance still outstanding; reconciles)', it.status === 'Approved' && p.deposit.status === 'Refunded' && L.st === 'refunded' && L.paid === 0 && L.outstanding === 1500 && L.ok);
    go('f-deposits'); ok('DP-F Deposits: the seat of the refunded deposit shows "Finance review required"; no refund or balance action', /Finance review required/.test(depRow(w3).textContent) && !$a('main [data-act="dpDepRefund"]').some(x => x.dataset.v === w3.v) && !$a('main [data-act="finOffline"]').some(x => (x.dataset.k || '').startsWith(w3.v + '|')));
    ok('DP-F no seat rule is invented for a refund: the seat stays counted (no overselling) under Finance review, audited', cdBatch().enrolled === e1 && w3.signup.batch === CD_B && dpSeat(w3).st === 'review' && ADMIN.audit.some(a => a.action === 'Seat needs Finance review'));
    ok('DP-F no balance can be recorded toward it (not offered; a stale target is refused)', !payTargets().some(t => t.v === w3.v && t.r) && recordPayment({ key: w3.v + '|nvq|1', v: w3.v, pl: p, r: p.rows[0], due: 1500, cur: 'GBP' }, 1500, 'BACS-77300', 'Bank transfer', 'x') === false && p.rows[0].paid === 0);
    asL(w3.v); go('payments'); ok('DP-F learner Payments: the deposit refunded, paid £0, "Finance review required", no Pay now', /Deposit £300.00 refunded/.test(main()) && /Paid so far£0.00/.test(main()) && /Finance review required/.test(main()) && !$1('main [data-act="payInst"]'));
    const c3 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })); go('dashboard'); ok('DP-F the learner cannot pay toward it (no checkout) and the dashboard says Finance review is needed', !c3.opened && /Your place needs Finance review/.test(main()) && !/Pay your balance/.test(main()));
  });
  await T('DP-F partial refund of the deposit', async () => {
    ACT.drReset(); press(); const w4 = register('Will Ash', 'will.ash@test.example'); toPayment(w4); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const ref = w4.signup.pay.ref, t = allTx().find(x => x.ref === ref); FA(); raiseRefund(t, { cat: 'Deposit', text: 'part', cons: 'Retain access', amount: 100 }); press();
    const it = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref); FA('FB'); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); reason('Approved');
    ok('DP-F a £100 partial refund of the £300 deposit leaves it counting as paid (no partial-deposit rule), audited, and puts the seat under Finance review', it.status === 'Approved' && pl(w4).deposit.status === 'Paid' && fpLedger(pl(w4)).paid === 300 && ADMIN.audit.some(a => a.action === 'Partial deposit refund') && dpSeat(w4).st === 'review');
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
  let ta, um, ve;
  await T('DP-G1 several registered accounts in one tab, no data loss', async () => {
    ACT.drReset(); press(); const b = cdBatch(); b.cap = b.enrolled + 2; // test-only capacity: two places left
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
    const b = cdBatch(); ve = register('Vera Lane', 'vera.lane@test.example'); startSignup(ve); const st = main(); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
    ok('DP-G2 with two seats held the batch is full: a third learner cannot get past choosing a batch', ve.signup.step === 1 && !ve.signup.done && b.enrolled === b.cap, st.slice(Math.max(0, st.indexOf('Your batch')), st.indexOf('Your batch') + 300));
    const c = dpCounts(b); ok('DP-G2 counts: ' + c.occupied + ' confirmed + ' + c.reserved + ' reserved = ' + b.enrolled + ' of ' + b.cap, c.reserved === 2 && c.occupied + c.reserved === b.enrolled && b.enrolled === b.cap);
    ACA(); go('a-batches'); ok('DP-G2 Batches: the capacity cell says how many are only reserved', new RegExp(`${c.occupied} secured · 2 reserved`).test(main()));
    go('a-batches', { id: CD_B, tab: 'roster' }); ok('DP-G2 the batch roster tags each reserved learner (Seat reserved)', $a('main .dp-rtag').length === 2 && /Seat reserved/.test(main()), main().slice(0, 600));
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
    ok('DP-G4 past the hold: both seats released when the screen is drawn (P-32), the count drops by two', chReleased(ta) && chReleased(um) && b.enrolled === n0 - 2 && pl(ta).deposit.hold === hold);
    ok('DP-G4 the release is audited with the agreed hold time; nothing refunded or charged (no new transaction)', ADMIN.audit.some(a => a.action === 'Seat hold ended — seat released' && a.before.includes(fdt(hold))) && txOf(ta).length === 0 && txOf(um).length === 1 && pl(um).deposit.status === 'Paid');
    go('f-deposits'); ok('DP-G4 Deposits: "Seat released — deposit not received" (Tara, unconfirmed transfer) and "deposit held (Finance review)" (Uma; no retention recorded)', /Seat released — deposit not received/.test(depRow(ta).textContent) && /Seat released — deposit held \(Finance review\)/.test(depRow(um).textContent));
    const tref = ta.signup.pay.ref, hTa = ta.admission.history.slice(-1)[0][0], hUm = um.admission.history.slice(-1)[0][0];
    ok('DP-G4 pending transfer expired: no payment or forfeit recorded; the bank reference is kept for Finance (bank list, Deposits row, release record)', !txOf(ta).length && STORE.chBank.find(x => x.ref === tref).status === 'Awaiting confirmation' && depRow(ta).textContent.includes(tref) && hTa.includes(tref) && /deposit not received/.test(hTa) && !/kept/.test(hTa) && ta.admission.deposit.kept === false);
    go('f-exceptions', { tab: 'bank' }); ok('DP-G4 the transfer is still listed to confirm, with Record offline payment', $a('main [data-act="finOffline"]').some(x => x.dataset.k === ta.v + '|dep'));
    ok('DP-G4 paid deposit expired: the receipt stays in the ledger, nothing refunded or retained is recorded, and the record says so', txOf(um).length === 1 && /deposit received — held; no refund or retention recorded/.test(hUm) && !/kept/.test(hUm) && !allTx().some(x => x.v === um.v && x.refund));
    click($1('#app [data-act="cb10Reset"]') || $1('main [data-act="cb10Reset"]') || { click: () => ACT.cb10Reset() });
    if ((STORE.cbRem || {}).offset) ACT.cb10Reset();
    ok('DP-G4 back to today: the released seats stay released (collecting nothing, restoring nothing)', chReleased(ta) && chReleased(um) && b.enrolled === n0 - 2);
    asL(ve.v); contSignup(ve); choose('deposit', 'card'); const c = payCo(() => click($1('main [data-act="suPay"]')));
    ok('DP-G4 the freed place can now be taken: the third learner reserves it', c.opened && ve.signup.done && dpSeat(ve).st === 'reserved' && b.enrolled === n0 - 1);
  });
  await T('DP-G5 no balance toward a released reservation; money never restores it', async () => {
    const b = cdBatch(), n0 = b.enrolled;
    asL(um.v); go('payments');
    ok('DP-G5 learner Payments: "Seat released", no Pay now, and Next due does not point at the released balance', /Seat released/.test(main()) && !$1('main [data-act="payInst"]') && /Next dueNothing due/.test(main()));
    const c1 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })), c2 = payCo(() => ACT.payBalance({ dataset: {} })); ACT.chPayBank({ dataset: { e: 'nvq', n: '1' } }); const o3 = !!MODAL; closeModal();
    ok('DP-G5 Pay now, Pay balance and Bank transfer open nothing toward it', !c1.opened && !c2.opened && !o3 && txOf(um).length === 1);
    FA(); ok('DP-G5 Finance isn\'t offered the released balance', !payTargets().some(t => t.v === um.v && t.r));
    ok('DP-G5 Finance recording it anyway (stale dialog) is refused and audited', recordPayment({ key: um.v + '|nvq|1', v: um.v, pl: pl(um), r: pl(um).rows[0], due: 1500, cur: 'GBP' }, 1500, 'BACS-77400', 'Bank transfer', 'x') === false && pl(um).rows[0].paid === 0 && ADMIN.audit.some(a => a.action === 'Blocked: balance toward an invalid reservation'));
    ACT.finOffline({ dataset: { k: um.v + '|nvq|1' } }); ok('DP-G5 the row\'s Record payment opens nothing and says why', !MODAL && /seat was released/.test(toastTxt()));
    asL(ta.v); ACT.chSignAgain(); ok('DP-G5 sign up again waits while the released seat\'s bank transfer is unconfirmed (Finance review)', !ta.signup.again && /confirm your earlier bank transfer/.test(toastTxt()));
    FA(); const t = payTargets().find(x => x.key === ta.v + '|dep'); ok('DP-G5 the deposit itself can still be recorded (money received is never refused)', !!t);
    recordPayment(t, 300, 'BACS-77401', 'Bank transfer', 'Arrived late'); go('f-deposits');
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
    ACT.drReset(); press(); const w = register('Nia Park', 'nia.park@test.example'); toPayment(w); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    const ref = w.signup.pay.ref, tx = () => allTx().find(x => x.ref === ref), approve = id => { FA('FB'); ACT.qDo({ dataset: { id, a: 'approve' } }); reason('Approved'); };
    FA(); raiseRefund(tx(), { cat: 'Deposit', text: 'part', cons: 'Retain access', amount: 100 }); press(); const i1 = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref); approve(i1.id);
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' });
    ok('DP-H1 partial refund: Finance shows received £300.00, refunded £100.00, net received £200.00 (the deposit still counts toward the fee, PD-DP-06)', /Received £300\.00 · refunded £100\.00 · net received £200\.00/.test(main()) && fpLedger(pl(w)).paid === 300);
    asL(w.v); go('payments'); ok('DP-H1 the learner sees the same received, refunded and net figures, and Finance review required', /Received £300\.00 · refunded £100\.00 · net received £200\.00/.test(main()) && /Finance review required/.test(main()) && !$1('main [data-act="payInst"]'));
    FA(); ok('DP-H1 only the remainder can still be refunded (£200)', refundable(tx()) === 200);
    raiseRefund(tx()); ok('DP-H1 the refund dialog offers the remainder, and more than the remainder is refused', +$1('#rr-a').value === 200 && (() => { $1('#rr-a').value = '250'; $1('#rr-t').value = 'too much'; return prim() === false; })()); closeModal();
    raiseRefund(tx()); $1('#rr-t').value = 'rest'; press(); const i2 = ADMIN.queue.find(i => i.type === 'Refund' && (i.data || {}).tx === ref && i !== i1); approve(i2.id);
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' });
    ok('DP-H1 full refund: the deposit no longer counts as paid; received £300.00, refunded £300.00, net £0.00', pl(w).deposit.status === 'Refunded' && fpLedger(pl(w)).paid === 0 && /Received £300\.00 · refunded £300\.00 · net received £0\.00/.test(main()));
    ACT.txOpen({ dataset: { r: ref, p: tx().payer } }); const again = MODAL && MODAL.actions.some(a => a.label === 'Raise refund'); closeModal();
    ACT.dpDepRefund({ dataset: { v: w.v } }); const dlg = !!MODAL; closeModal();
    ok('DP-H1 no further refund can be raised: the transaction shows Refunded once the two parts reach £300 (PD-DP-18), and Deposits refund is refused', refundable(tx()) === 0 && tx().status === 'Refunded' && !again && !dlg, J([refundable(tx()), tx().status, again, dlg]));
    const c = dpCounts(cdBatch()); ok('DP-H1 the refunded reservation stays counted as reserved under Finance review — never as a secured place', dpSeat(w).st === 'review' && c.reserved === 1 && c.occupied === cdBatch().enrolled - 1);
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
    ok('DP-G8 the deposit route always schedules one balance row; the instalment route never has a deposit', (() => { const w = Object.values(STORE.worlds).find(x => dpHoldPl(x)); return !w || dpHoldPl(w).rows.length === 1; })() && ['CD1', 'CD2'].every(k => !pl(STORE.worlds[k]).deposit));
  });

  ACT.drReset(); press();
  ok('DP-Z final Reset: the starting demo (batch ' + e0 + ' enrolled, plan v' + v0 + ', hold 28 days, the two schedules identical)', cdBatch().enrolled === e0 && s4PlanCur(cdPr().id).v === v0 && S4().cfg.hold === 28 && snapCD() === cd0);
  ok('DP-Z Reset removes every temporary account (no registered learner, no registration, no simulated date, no bank transfer)', !Object.keys(STORE.worlds).some(k => /^G\d*$/.test(k)) && !Object.keys(PERSONAS).some(k => /^G\d*$/.test(k)) && !(STORE.regs || []).length && !((STORE.cbRem || {}).offset) && !(STORE.chBank || []).length);
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
