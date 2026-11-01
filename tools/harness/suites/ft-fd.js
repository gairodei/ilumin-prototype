// FD — minimal Finance Admin demo data (1 Nov 2026; PD-FD-* in PROVISIONAL-DECISIONS.md). suites.sh runs this suite with FIXTURE=client.
// The client demo now holds five learners: Amira, Dev, Lena (unchanged), Sam (deposit then instalments, deposit and instalment 1 paid)
// and Tom (bank-transfer deposit awaiting Finance). Every expected figure is worked out here in pence from the learners' own records.
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
  const reason = (r = 'FD test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
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
  const ALL = ['CD1', 'CD2', 'CD3', 'CD4', 'CD5'], Wk = k => STORE.worlds[k];
  const rcv = w => w.tx.filter(t => t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status)).reduce((a, t) => a + P(t.amount), 0);
  const owed = w => (w.plans || []).reduce((s, p) => { const rows = p.rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid)), 0), d = p.deposit, un = d && d.status === 'Paid' ? Math.max(0, P(d.amount) - P(d.refundedPart || 0) - p.rows.reduce((a, r) => a + P(r.credit || 0), 0)) : 0; return s + rows - un; }, 0);
  const sumP = f => ALL.reduce((s, k) => s + f(Wk(k)), 0);
  const fp = () => J(ALL.map(k => { const w = Wk(k); return [chFullName(w), w.signup && w.signup.batch, (w.plans || []).map(p => [p.plan, p.depRoute || '', p.deposit && [p.deposit.amount, p.deposit.status], p.rows.map(r => [r.amount, r.paid, r.credit || 0, r.status])]), w.tx.map(t => [t.amount, t.status]), dpSeat(w).st, w.admission && w.admission.status]; }));
  const sam = Wk('CD4'), tom = Wk('CD5');

  await T('FD-1 the five demo learners and their records', async () => {
    ok('FD-1 five demo learners: Amira, Dev, Lena, Sam, Tom', J(ALL.map(k => chFullName(Wk(k)))) === J(['Amira Shah (demo)', 'Dev Patel (demo)', 'Lena Hart (demo)', 'Sam Deposit (demo)', 'Tom Transfer (demo)']) && learnerAccounts().length === 5);
    ok('FD-1 Amira, Dev and Lena keep their records: one first payment each (£300.00 / £433.33 / £45.00), instalment plans unchanged, admitted', rcv(A) === 30000 && rcv(Dv) === 43333 && rcv(Wk('CD3')) === 4500 && A.tx.length === 1 && Dv.tx.length === 1 && !pl(A).deposit && !pl(Dv).deposit && A.admission.status === 'Approved' && Dv.admission.status === 'Approved');
    ok('FD-1 their signed terms are the original plan version with the Academy default deposit (£300.00)', cb9Pin(A).dep.eff === 300 && cb9Pin(Dv).dep.eff === 300 && A.signup.pin.planV === Dv.signup.pin.planV);
    ok('FD-1 the programme deposit is £100.00 through an approved payment-terms change; the Academy default stays £300.00', cb8Cur(cdPr().id).dep.eff === 100 && S4().cfg.deposit === 300 && ADMIN.queue.filter(i => i.type === 'Programme payment terms' && i.status === 'Approved').length === 2);
    const sp = pl(sam);
    ok('FD-1 Sam: Self-Paced, £1,800.00, deposit then 6 payments, his own newer plan version', P(sp.total) === 180000 && sp.depRoute === 'inst' && sp.rows.length === 6 && sam.signup.pin.route === 'deposit-instalments' && sam.signup.pin.planV > A.signup.pin.planV && sam.signup.plan.opt.mode === 'Self-Paced');
    ok('FD-1 Sam: £100.00 deposit by card (confirmed) credited to instalment 1; £200.00 paid on it; two separate transactions', sp.deposit.status === 'Paid' && P(sp.deposit.amount) === 10000 && P(sp.rows[0].credit) === 10000 && P(sp.rows[0].paid) === 30000 && sam.tx.length === 2 && J(sam.tx.map(t => P(t.amount)).sort()) === J([10000, 20000]) && new Set(sam.tx.map(t => t.ref)).size === 2);
    ok('FD-1 Sam: £300.00 received, £1,500.00 outstanding, seat secured, admission awaiting review', rcv(sam) === 30000 && owed(sam) === 150000 && dpSeat(sam).st === 'occupied' && sam.admission.status === 'Awaiting review');
    const tp = pl(tom);
    ok('FD-1 Tom: Self-Paced, £1,800.00, deposit then 6 payments; bank-transfer deposit notified, not confirmed', P(tp.total) === 180000 && tp.depRoute === 'inst' && tp.deposit.status !== 'Paid' && (STORE.chBank || []).some(x => x.v === 'CD5' && x.status === 'Awaiting confirmation' && P(x.amount) === 10000));
    ok('FD-1 Tom: £0.00 received, £1,800.00 outstanding, nothing credited, seat reserved (provisional), admission awaiting review', rcv(tom) === 0 && tom.tx.length === 0 && owed(tom) === 180000 && !P(tp.rows[0].credit) && dpSeat(tom).st === 'reserved' && dpSeat(tom).pending && tom.admission.status === 'Awaiting review');
    ok('FD-1 batch DEMO-L3-JAN27: 4 of 16 places (Amira, Dev, Sam, Tom), each counted once', cdBatch().enrolled === 4 && cdBatch().cap === 16 && ALL.filter(k => Wk(k).signup && Wk(k).signup.done && Wk(k).signup.batch === CD_B).length === 4);
  });
  await T('FD-2 totals, independently from the records', async () => {
    const got = sumP(rcv), due = sumP(owed), aw = (STORE.chBank || []).filter(x => x.status === 'Awaiting confirmation').reduce((a, x) => a + P(x.amount), 0);
    ok('FD-2 confirmed received £1,078.33 = the learners\' own receipts = the ledger', got === 107833 && fiLedger({}).received === got, fiLedger({}).received);
    ok('FD-2 outstanding £6,966.67 = the plans = Finance obligations = learner accounts', due === 696667 && fiObligations().reduce((a, x) => a + x.outstanding, 0) === due && ALL.reduce((a, k) => a + fiAcct(Wk(k)).outstanding, 0) === due);
    ok('FD-2 bank transfers awaiting confirmation £100.00 (not counted as received)', aw === 10000 && fiAwaiting().length === 1);
  });
  await T('FD-3 the Finance screens', async () => {
    FA(); go('f-dashboard'); const d = main();
    ok('FD-3 Dashboard: collected £1,078.33, outstanding £6,966.67, one bank transfer awaiting confirmation', /Collected this month \(vs last\)£1,078\.33/.test(d) && /Outstanding balance£6,966\.67/.test(d) && /incl\. 1 bank transfer/.test(d), d.slice(d.indexOf('Collected'), d.indexOf('Collected') + 300));
    go('f-learners'); ok('FD-3 Learner Accounts: five learners; Sam £1,500.00, Tom £1,800.00 outstanding', $a('main table tbody tr').length === 5 && /£1,500\.00/.test(rowOf('', 'Sam Deposit').textContent) && /£1,800\.00/.test(rowOf('', 'Tom Transfer').textContent));
    go('f-ledger'); const f = $1('.fc-led-foot');
    ok('FD-3 Ledger: five receipts and Tom\'s transfer listed as awaiting (not counted): received £1,078.33, pending £100.00', $a('main table tbody tr').length === 6 && +f.dataset.received === 107833 && +f.dataset.pending === 10000 && /Awaiting confirmation/.test(rowOf('', 'Tom Transfer').textContent));
    const sr = $a('main table tbody tr').filter(tr => /Sam Deposit/.test(tr.textContent));
    ok('FD-3 Ledger: Sam\'s £100.00 deposit and £200.00 instalment 1 are separate rows; only one is a deposit', sr.length === 2 && sr.filter(tr => /deposit/i.test(tr.querySelector('td:nth-child(4)').textContent)).length === 1);
    go('f-deposits'); const s = rowOf('', 'Sam Deposit').textContent.replace(/\s+/g, ' '), t = rowOf('', 'Tom Transfer').textContent.replace(/\s+/g, ' ');
    ok('FD-3 Deposits: Sam — Confirmed, £100.00 credited to instalment 1, first payment Paid, seat secured', /Confirmed/.test(s) && /instalment 1/.test(s) && /Paid/.test(s) && /Seat secured/.test(s), s);
    ok('FD-3 Deposits: Tom — Awaiting confirmation, nothing received, £300.00 of instalment 1 remaining, hold countdown, Confirm deposit', /Awaiting confirmation/.test(t) && /Not yet/.test(t) && /£300\.00/.test(t) && !!rowOf('', 'Tom Transfer').querySelector('[data-act="finOffline"][data-k="CD5|dep"]') && !!rowOf('', 'Tom Transfer').querySelector('.countdown'), t);
    go('f-exceptions', { tab: 'bank' }); ok('FD-3 Payment Pending & Exceptions → Bank transfers to confirm: Tom, £100.00 deposit', /Tom Transfer/.test(main()) && /£100\.00/.test(main()));
    setUi('fpL', 'CD4'); go('f-plans', { tab: 'schedules' }); const p4 = $1('main .fp-sum').textContent;
    setUi('fpL', 'CD5'); go('f-plans', { tab: 'schedules' }); const p5 = $1('main .fp-sum').textContent;
    ok('FD-3 Payment Plans: Sam paid £300.00 / outstanding £1,500.00; Tom paid £0.00 / outstanding £1,800.00; both reconcile', /Paid to date\s*£300\.00/.test(p4) && /Outstanding\s*£1,500\.00/.test(p4) && /Paid to date\s*£0\.00/.test(p5) && /Outstanding\s*£1,800\.00/.test(p5) && /Yes/.test(p4) && /Yes/.test(p5));
    setUi('fpL', ''); setUi('fcC-fr', cdPr().id); setUi('fcB-fr', CD_B); go('f-reports', { tab: 'coursewise' }); const sec = $1('main .fi-rep');
    ok('FD-3 Coursewise, programme + batch: received £1,033.33, outstanding £6,966.67', +sec.dataset.received === 103333 && +sec.dataset.outstanding === 696667);
    setUi('fcC-fr', ''); setUi('fcB-fr', FC_NB); go('f-reports', { tab: 'coursewise' }); ok('FD-3 Coursewise, not batch-specific: Lena\'s £45.00', +$1('main .fi-rep').dataset.received === 4500);
    setUi('fcB-fr', ''); go('f-reports', { tab: 'deposits' }); const dr = $1('main .fi-rep');
    ok('FD-3 Reports → Deposits: received £100.00, credited £100.00', +dr.dataset.received === 10000 && +dr.dataset.credited === 10000);
    go('f-learner', { id: sam.me.id, tab: 'payments' }); const fl = main();
    ok('FD-3 Finance learner detail (Sam): the deposit, instalment 1 with the credit beside the cash, his two receipts', /Deposit/.test(fl) && /\+ £100\.00 deposit credit/.test(fl) && /£200\.00/.test(fl));
    learner('CD4'); go('payments'); ok('FD-3 Learner Payments (Sam): paid £300.00, outstanding £1,500.00, seat secured', /Paid so far\s*£300\.00/.test(main()) && /Outstanding\s*£1,500\.00/.test(main()) && /Seat secured/.test(main()));
    learner('CD5'); go('payments'); ok('FD-3 Learner Payments (Tom): paid £0.00, outstanding £1,800.00, deposit awaiting confirmation, instalment 1 after it', /Paid so far\s*£0\.00/.test(main()) && /Outstanding\s*£1,800\.00/.test(main()) && /awaiting confirmation/i.test(main()) && /After the deposit is confirmed/.test(main()));
  });
  await T('FD-4 nothing else is invented', async () => {
    ok('FD-4 no refunds, waivers, overdue debt, agency purchases, observation-fee payments or other approvals', !ADMIN.queue.some(i => i.type !== 'Programme payment terms') && !(STORE.fin.adjust || []).length && !odRows().length && !(STORE.agy.purchases || []).length && !chFees().length && !(STORE.fin.tx || []).length);
    FA(); const lt = allTx().find(t => t.v === 'CD3'); raiseRefund(lt); ok('FD-4 a refund can still be raised live (the dialog opens; nothing is raised until submitted)', !!MODAL && /refund/i.test(MODAL.title) && !ADMIN.queue.some(i => i.type === 'Refund')); closeModal();
    advance(160); ok('FD-4 overdue can still be shown live: moving the simulated date past instalment 2 lists it', odRows().some(o => o.v === 'CD1' && o.inst === 2)); back();
    ok('FD-4 … and the 28-day seat hold of Tom has ended meanwhile (his transfer was never confirmed): released, as the DP rule says', dpSeat(Wk('CD5')).st === 'released');
    ACT.resetDemo(); ok('FD-4 Reset demo after such a demonstration: nothing overdue, Tom reserved and pending again', !odRows().length && dpSeat(Wk('CD5')).st === 'reserved' && fiAwaiting().length === 1);
  });
  await T('FD-5 Finance confirms Tom\'s transfer (then Reset restores it)', async () => {
    const f0 = fp(), tom = Wk('CD5'); FA(); go('f-deposits'); click(rowOf('', 'Tom Transfer').querySelector('[data-act="finOffline"][data-k="CD5|dep"]'));
    ok('FD-5 Confirm deposit opens Record offline payment on Tom\'s deposit, with his reference', !!MODAL && /Tom Transfer/.test($1('#op-t').selectedOptions[0].textContent) && P(+$1('#op-a').value) === 10000);
    $1('#op-r').value = tom.signup.pay.ref; INP.opPrev(); reason('Bank statement checked');
    ok('FD-5 confirmed: £100.00 received, credited to instalment 1 (£200.00 left), seat still reserved until instalment 1 is paid', rcv(tom) === 10000 && P(pl(tom).rows[0].credit) === 10000 && dpSeat(tom).st === 'reserved' && !fiAwaiting().length, J([rcv(tom), pl(tom).deposit, pl(tom).rows[0], dpSeat(tom).st, fiAwaiting().length, fiRefused, tom.tx]));
    ok('FD-5 totals move by exactly £100.00: received £1,178.33, outstanding £6,866.67', sumP(rcv) === 117833 && sumP(owed) === 686667 && fiLedger({}).received === 117833);
    ACT.resetDemo(); const S2 = Wk('CD5');
    ok('FD-5 Reset demo rebuilds the same five learners and figures; Tom\'s transfer is pending again', fp() === f0 && rcv(S2) === 0 && fiAwaiting().length === 1 && learnerAccounts().length === 5 && cdBatch().enrolled === 4, fp() === f0 ? '' : fp().slice(0, 300) + ' VS ' + f0.slice(0, 300));
  });
  await T('FD-6 filters reset when the demo identity or role changes', async () => {
    FA(); setUi('fcT-fl', 'Short course'); setUi('fcC-fr', cdPr().id); setUi('fcB-fr', CD_B); setUi('frRange', '30'); go('f-ledger'); const q = $1('#dtq-fledger'); q.value = 'Sam'; INP.dtQ(q);
    const n0 = allTx().length; ACT.switchRole({ dataset: { r: 'learner' } });
    ok('FD-6 switching role clears the Finance filters, period and table search', ['fcT-fl', 'fcC-fr', 'fcB-fr', 'frRange', 'dt-fledger'].every(k => !(k in S.ui)) && allTx().length === n0);
    FA(); setUi('fcC-fl', 'SC:SC-01'); ACT.drAs({ dataset: { p: 'fin' } });
    ok('FD-6 switching demo identity clears them too; no record changes', !('fcC-fl' in S.ui) && allTx().length === n0 && learnerAccounts().length === 5);
  });
  await T('FD-7 the legacy fixture stays separate', async () => {
    ACT.fxLegacy(); ok('FD-7 legacy test data has none of the client demo learners', !STORE.worlds.CD4 && !STORE.worlds.CD5 && !allTx().some(t => /Sam Deposit|Tom Transfer/.test(t.payer)));
    ACT.resetDemo(); ok('FD-7 Reset returns to the five-learner client demo', learnerAccounts().length === 5 && !!STORE.worlds.CD5 && fiAwaiting().length === 1);
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
