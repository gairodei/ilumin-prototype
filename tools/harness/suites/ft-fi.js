// FI-1 — critical financial integrity (31 Oct 2026; PD-FI-* in PROVISIONAL-DECISIONS.md; audit defects CR-1 … CR-9).
// suites.sh runs this suite with FIXTURE=client: it boots the client demo, then loads the legacy data (agencies, invoices, observation
// fees, seeded refunds) and finally the client demo again to check Reset and isolation.
// Every defect is shown twice: "OLD" runs the rule as it was before FI-1 (the functions FI-1 wraps or replaces, kept in
// fi-integrity.js as _rpFI, _adFI, _rfFI, _ipFI, _arFI, _opFI, _cfpFI) and must reproduce the audit's failure; "FI" runs the
// current handler and must refuse or handle it. Expected money is worked out here in pence, never read back from the code under test.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const app = () => ($1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FI test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const P = x => Math.round(x * 100);
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const sec = () => ADMIN.security.length;
  const pl = w => w && w.plans.find(p => p.e === 'nvq');
  const tgt = k => payTargets().find(t => t.key === k);
  const txSum = w => w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((s, t) => s + P(t.amount), 0);
  const rfdRows = w => w.tx.filter(t => t.amount < 0).length;
  // The real checkout: Pay securely, the processing delay (virtual clock), the result dialog
  const payCo = (open, part) => fxFast(ff => { open(); if (!MODAL || !/Pay now/.test(MODAL.title || '')) return { opened: false }; if (part != null) { const r = $1('#modal-root input[name="payamt"][value="part"]'); if (r) { r.checked = true; INP.payAmt(r); } $1('#partAmt').value = part; } const res = prim(); ff(3000); const t = mtxt(); closeModal(); return { opened: true, res, t }; });
  // Register a learner and sign up for the demo programme up to the payment step (the real screens; as ft-dp)
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
  const toPayment = (w, mode = 'Self-Paced') => {
    go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } });
    const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === mode); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press();
    go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
    fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); });
    click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign'));
  };
  const choose = (opt, method) => { const r = $1(`main input[name="cb9-pay"][value="${opt}"]`); if (r) { r.checked = true; INP.cb9Pay(r); } const m = $1(`main input[name="su-m"][value="${method}"]`); if (m) { m.checked = true; INP.suMethod(m); } };
  // A registered learner who chose the deposit by bank transfer (deposit £300 awaiting Finance, balance £1,500)
  const bankDeposit = (name, email) => { const w = register(name, email); toPayment(w); choose('deposit', 'bank'); click($1('main [data-act="suPay"]')); press(); return w; };
  const snapCD = () => J(['CD1', 'CD2', 'CD3'].map(k => { const w = STORE.worlds[k], p = w.plans; return [p.map(x => x.rows.map(r => [r.n, r.amount, r.status, r.paid])), w.tx.length]; }));
  const cd0 = snapCD(), legacyA0 = STORE.worlds.A.tx.length;

  /* ================= Client demo ================= */
  await T('FI-0 starting point', async () => {
    FA(); ok('FI-0 Finance payment targets in the client demo are the demo learners only (CD1, CD2)', payTargets().every(t => /^CD[12]\|/.test(t.key)) && payTargets().length === 10, J(payTargets().map(t => t.key)));
  });

  /* ----- CR-8: Record offline payment (admin console) ----- */
  await T('CR-8 admin console Record offline payment', async () => {
    role('sysA'); const a0 = STORE.worlds.A.tx.length;
    _opFI({ dataset: {} }); const legacyNames = /Aisha Rahman|Daniel Okafor/.test(mtxt()); $1('#op-l').value = 'A'; $1('#op-a').value = '-999'; reason('OLD');
    ok('CR-8 OLD: a System Admin recorded −£999 for a legacy persona in the client demo (the audit\'s failure)', legacyNames && STORE.worlds.A.tx.length === a0 + 1 && STORE.worlds.A.tx[0].amount === -999);
    STORE.worlds.A.tx.shift(); // undo the OLD demonstration
    const s0 = sec(); ACT.offlinePay({ dataset: {} });
    ok('FI CR-8: a System Admin is refused in the handler (no dialog, security event logged)', !MODAL && sec() === s0 + 1 && STORE.worlds.A.tx.length === a0);
    SA(); ACT.offlinePay({ dataset: { l: STORE.worlds.CD1.me.id } }); const opts = $a('#modal-root #op-t option').map(o => o.value);
    ok('FI CR-8: the Super Administrator gets Finance\'s dialog — the demo learners\' own items only, Amira\'s preselected', MODAL && MODAL.title === 'Record offline payment' && opts.length === 10 && opts.every(k => /^CD[12]\|/.test(k)) && /^CD1\|/.test($1('#op-t').value), J(opts));
    const w = STORE.worlds.CD1, n0 = w.tx.length; $1('#op-a').value = '-999'; INP.opPrev(); $1('#rsn').value = 'negative'; const r = prim();
    ok('FI CR-8: −£999 is refused and the dialog stays open; nothing is written', r === false && !!MODAL && w.tx.length === n0 && /pounds and pence, above £0.00/.test(mtxt()));
    closeModal();
    FA(); ['abc', '0', '-50', '12.345', 'Infinity'].forEach(v => { const t = tgt('CD1|nvq|2'); ok('FI CR-8: amount "' + v + '" refused', recordPayment(t, +v, 'BACS-FI0' + v.length, 'Bank transfer', 'x') === false && pl(w).rows[1].paid === 0); });
    ok('FI CR-8: no change to any legacy persona from the client demo', STORE.worlds.A.tx.length === legacyA0);
  });

  /* ----- CR-5: a deposit is confirmed by its full amount only ----- */
  let jo;
  await T('CR-5 deposit confirmation', async () => {
    const old = bankDeposit('Oli Old', 'oli.old@fi.example'); FA(); const od = pl(old).deposit;
    _rpFI(tgt(old.v + '|dep'), 0.01, 'BACS-FI501', 'Bank transfer', 'OLD');
    ok('CR-5 OLD: £0.01 marked the £300 deposit Paid (the audit\'s failure)', od.status === 'Paid' && fpLedger(pl(old)).paid === 300);
    jo = bankDeposit('Jo Fi', 'jo.fi@fi.example'); FA(); const d = pl(jo).deposit, b0 = cdBatch().enrolled, n0 = jo.tx.length;
    [0.01, 299.99, 300.01, 600].forEach(a => { const r = recordPayment(tgt(jo.v + '|dep'), a, 'BACS-FI5' + P(a), 'Bank transfer', 'x'); ok(`FI CR-5: £${a.toFixed(2)} against the £300.00 deposit is refused; deposit not Paid, seat still reserved, no transaction`, r === false && d.status !== 'Paid' && dpSeat(jo).st === 'reserved' && jo.tx.length === n0 && fpLedger(pl(jo)).paid === 0, d.status + ' ' + dpSeat(jo).st); });
    // Through the dialog: the preview says why, and Confirm keeps the dialog open
    ACT.finOffline({ dataset: { k: jo.v + '|dep' } }); $1('#op-a').value = '0.01'; INP.opPrev(); const prev = mtxt(); $1('#rsn').value = 'part'; const r = prim();
    ok('FI CR-5: the dialog explains that only the full deposit confirms it, and refuses £0.01', /Can't be recorded/.test(prev) && /full amount \(£300.00\)/.test(prev) && r === false && d.status !== 'Paid');
    $1('#op-a').value = '300'; INP.opPrev(); $1('#rsn').value = 'received'; press();
    ok('FI CR-5: £300.00 confirms it once — deposit Paid, outstanding £1,500.00, one £300 transaction, seat count unchanged', d.status === 'Paid' && P(fpLedger(pl(jo)).outstanding) === 150000 && jo.tx.length === n0 + 1 && P(jo.tx[0].amount) === 30000 && cdBatch().enrolled === b0);
    ok('FI CR-5: a second confirmation is refused ("Already recorded")', recordPayment({ key: jo.v + '|dep', v: jo.v, dep: d, due: 300 }, 300, 'BACS-FI5X', 'Bank transfer', 'again') === false && jo.tx.length === n0 + 1);
  });

  /* ----- CR-6: overpayment, decimals, duplicate references, wrong items ----- */
  await T('CR-6 overpayment and reconciliation', async () => {
    const old = STORE.worlds[Object.keys(STORE.worlds).find(k => STORE.worlds[k].me && /Oli Old/.test(chFullName(STORE.worlds[k])))]; FA();
    _rpFI(tgt(old.v + '|nvq|1'), 1000000000, 'BACS-FI601', 'Bank transfer', 'OLD');
    ok('CR-6 OLD: £1,000,000,000 against the £1,500 balance was booked in full while the row was capped (the audit\'s failure)', P(old.tx[0].amount) === 100000000000 && P(pl(old).rows[0].paid) === 150000);
    const w = jo, row = pl(w).rows[0], t = () => tgt(w.v + '|nvq|1');
    ok('FI CR-6: the balance row is £1,500.00', P(row.amount) === 150000);
    ok('FI CR-6: £0.01 part payment recorded', recordPayment(t(), 0.01, 'BACS-FI602', 'Bank transfer', 'part') !== false && P(row.paid) === 1);
    ok('FI CR-6: £499.99 part payment recorded (paid £500.00)', recordPayment(t(), 499.99, 'BACS-FI603', 'Bank transfer', 'part') !== false && P(row.paid) === 50000);
    ok('FI CR-6: £1,000.01 against £1,000.00 due is refused (overpayment), nothing written', recordPayment(t(), 1000.01, 'BACS-FI604', 'Bank transfer', 'over') === false && P(row.paid) === 50000 && !w.tx.some(x => x.ref === 'BACS-FI604'));
    ok('FI CR-6: £1,000,000,000 refused', recordPayment(t(), 1e9, 'BACS-FI605', 'Bank transfer', 'over') === false && P(row.paid) === 50000);
    ok('FI CR-6: £1,000.005 (fraction of a penny) refused', recordPayment(t(), 1000.005, 'BACS-FI606', 'Bank transfer', 'x') === false);
    ok('FI CR-6: a reference already in the ledger is refused', recordPayment(t(), 100, 'BACS-FI603', 'Bank transfer', 'dup') === false && P(row.paid) === 50000);
    ok('FI CR-6: an empty reference is refused', recordPayment(t(), 100, ' ', 'Bank transfer', 'noref') === false);
    ok('FI CR-6: £1,000.00 settles the balance; the seat is secured', recordPayment(t(), 1000, 'BACS-FI607', 'Bank transfer', 'rest') !== false && row.status === 'Paid' && dpSeat(w).st === 'occupied');
    const L = fpLedger(pl(w));
    ok('FI CR-6: reconciliation — transactions £1,800.00 = deposit £300 + rows £1,500 = ledger paid; outstanding £0.00', txSum(w) === 180000 && P(L.paid) === 180000 && P(L.outstanding) === 0 && L.ok, `tx ${txSum(w)} paid ${P(L.paid)}`);
  });
  await T('CR-6 wrong items and identities', async () => {
    FA(); const a = STORE.worlds.CD1, d = STORE.worlds.CD2, a3 = pl(a).rows[2], d3 = pl(d).rows[2], an = a.tx.length, dn = d.tx.length;
    ok('FI: an unknown item key is refused', recordPayment({ key: 'CD9|nvq|1', v: 'CD9', due: 300 }, 300, 'BACS-FI610', 'Bank transfer', 'x') === false);
    // Amira's key with Dev's row and record: recorded against the current item for that key (Amira's), never Dev's
    const r = recordPayment({ key: 'CD1|nvq|3', v: 'CD2', pl: pl(d), r: d3, due: 433.33, cur: 'GBP' }, 300, 'BACS-FI611', 'Bank transfer', 'forged');
    ok('FI: a target carrying another learner\'s record under Amira\'s key pays Amira\'s instalment 3, and Dev\'s record is untouched', r !== false && P(a3.paid) === 30000 && a.tx.length === an + 1 && P(d3.paid) === 0 && d.tx.length === dn);
    ok('FI: Amira\'s instalment 4 (£300.00) refuses £300.01', recordPayment(tgt('CD1|nvq|4'), 300.01, 'BACS-FI612', 'Bank transfer', 'x') === false);
  });
  await T('CR-6 overpayment through the TBD-094 surplus route', async () => {
    FA(); const w = STORE.worlds.CD1, row = pl(w).rows[4], k = 'CD1|nvq|' + row.n, n0 = w.tx.length, q0 = ADMIN.queue.length;
    ACT.finOffline({ dataset: { k } }); $1('#op-a').value = '340'; INP.opPrev(); const prev = mtxt(); $1('#rsn').value = 'over'; const r = prim();
    ok('FI CR-6: Confirm payment refuses £340.00 against £300.00 due and points to the surplus route', r === false && /can't record more than is due/.test(prev) && /£40.00 surplus/.test(prev) && !!$1('#modal-root [data-act="opSurplus"]') && w.tx.length === n0);
    const ref = $1('#op-r').value, neg = () => w.tx.filter(x => x.amount < 0).length, neg0 = neg(); ACT.opSurplus(); const it = ADMIN.queue[0], tx = allTx().find(x => x.ref === ref), toastNow = (($1('#toasts') || {}).textContent || '');
    ok('FI CR-6 (case B, offline £340 vs £300): the £340 actually received is recorded in full; only £300.00 goes to the instalment', w.tx.length === n0 + 1 && P(w.tx[0].amount) === 34000 && w.tx[0].ref === ref && P(row.paid) === 30000 && row.status === 'Paid');
    ok('FI CR-6: a £40.00 refund REQUEST is raised for that payment — Pending, routed to the other Finance Admin, not processed; nothing refunded yet (no refund row)', ADMIN.queue.length === q0 + 1 && it.type === 'Refund' && P(it.amount) === 4000 && it.data.tx === ref && it.data.v === 'CD1' && it.status === 'Pending' && it.first === 'Mark Bennett' && !it.processed && neg() === neg0);
    ok('FI CR-6: the message does not claim the £40 was returned', /waiting for Mark Bennett's approval — nothing is refunded until then/.test(toastNow) && !/The £40.00 surplus is refunded/.test(toastNow), toastNow.slice(-200));
    ok('FI CR-6: reconciliation while pending — £340 received, £40 reserved by the open request, £300.00 refundable = the instalment; the plan shows £300 paid', P(refundable(tx)) === 30000 && P(fpLedger(pl(w)).paid) === P(pl(w).rows.reduce((s, x) => s + x.paid, 0)));
    // Retry: the surplus route again (double click / stale dialog) records nothing and raises nothing
    ACT.finOffline({ dataset: { k } }); const reopened = !!MODAL; if (MODAL) { $1('#op-a').value = '340'; $1('#op-r').value = ref; $1('#rsn').value = 'again'; ACT.opSurplus(); } closeModal();
    ok('FI CR-6: a retry adds no payment and no second refund request', w.tx.length === n0 + 1 && ADMIN.queue.length === q0 + 1 && recordPayment({ key: k, v: 'CD1', pl: pl(w), r: row }, 340, ref + 'X', 'Bank transfer', 'again') === false, 'reopened ' + reopened);
    // Approval separation: the raiser can't approve it; the other Finance Admin can, once
    FA(); ok('FI CR-6: the Finance Admin who recorded it can\'t approve the surplus refund (G4)', applyDecision(it, 'approve', 'mine') === false && it.status === 'Pending' && neg() === neg0);
    ACA(); ok('FI CR-6: an Academic Admin can\'t approve it', applyDecision(it, 'approve', 'x') === false && it.status === 'Pending');
    FA('FB'); applyDecision(it, 'approve', 'surplus');
    ok('FI CR-6: approved by the other Finance Admin — one −£40.00 refund transaction on Amira\'s record; net received on that payment £300.00', it.status === 'Approved' && !!it.processed && neg() === neg0 + 1 && P(w.tx.find(x => x.amount < 0).amount) === -4000 && P(refundable(tx)) === 30000);
    ok('FI CR-6: approving it again refunds nothing more', applyDecision(it, 'approve', 'again') === false && neg() === neg0 + 1);
    // The Super Administrator's own surplus refund is applied at once (D8) and is still a refund transaction
    SA(); const wd = STORE.worlds.CD2, row6 = pl(wd).rows[4], k6 = 'CD2|nvq|' + row6.n, q1 = ADMIN.queue.length, n1 = wd.tx.length; ACT.finOffline({ dataset: { k: k6 } }); $1('#op-a').value = String(row6.amount + 10); const ref6 = $1('#op-r').value; $1('#rsn').value = 'over'; ACT.opSurplus(); const it6 = ADMIN.queue[0];
    ok('FI CR-6: the Super Administrator\'s surplus refund is processed at once (D8) — £443.33 received, £433.33 to Dev\'s instalment, a −£10.00 refund transaction, audited', ADMIN.queue.length === q1 + 1 && it6.status === 'Approved' && it6.saImmediate && P(row6.paid) === 43333 && wd.tx.length === n1 + 2 && P(wd.tx.find(x => x.amount < 0 && x.desc.includes(ref6)).amount) === -1000 && ADMIN.audit.some(a => a.entity === it6.id && /Super Admin/.test(a.action)));
    FA(); const dl = bankDeposit('Dee Dep', 'dee.dep@fi.example'); FA(); ACT.finOffline({ dataset: { k: dl.v + '|dep' } }); $1('#op-a').value = '350'; INP.opPrev(); $1('#rsn').value = 'over'; ACT.opSurplus();
    ok('FI CR-6: a deposit overpayment is not recorded by either route (PD-DP-12; client question)', pl(dl).deposit.status !== 'Paid' && !dl.tx.length && !!MODAL); closeModal();
  });
  await T('CR-6 case A: the learner can\'t pay more than is due at checkout', async () => {
    learner('CD2'); const row = pl(W).rows[5], due = row.amount - row.paid, n0 = W.tx.length;
    const over = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: String(row.n) } }), String(due + 40));
    ok('FI CR-6 (case A): a part payment of £' + (due + 40).toFixed(2) + ' against £' + due.toFixed(2) + ' due is refused at checkout; nothing taken, nothing allocated', over.opened && over.res === false && W.tx.length === n0 && P(row.paid) === 0);
    const full = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: String(row.n) } }));
    ok('FI CR-6 (case A): paying in full takes exactly the £' + due.toFixed(2) + ' due — no surplus can arise at checkout', full.opened && W.tx.length === n0 + 1 && P(W.tx[0].amount) === P(due) && P(row.paid) === P(row.amount));
  });
  await T('Learner checkout part payment in whole pence', async () => {
    learner('CD1'); const row = pl(W).rows[3], n0 = W.tx.length;
    const r1 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: String(row.n) } }), '120.555');
    ok('FI: a part payment of £120.555 is refused at checkout; nothing taken', r1.opened && r1.res === false && W.tx.length === n0 && P(row.paid) === 0);
    const r2 = payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: String(row.n) } }), '120.50');
    ok('FI: £120.50 is taken; the row shows £120.50 paid', r2.opened && W.tx.length === n0 + 1 && P(row.paid) === 12050);
    ok('FI: checkout references are unique in the ledger', (() => { const refs = Object.values(STORE.worlds).flatMap(w => (w.tx || []).map(t => t.ref)).filter(x => /^TXN-9/.test(x)); return refs.length === new Set(refs).size; })());
  });

  /* ----- CR-2 / CR-1 / CR-3: refunds (client demo) ----- */
  await T('CR-2 open requests reserve the refundable amount', async () => {
    FA(); const t = allTx().find(x => x.v === 'CD1' && x.amount === 300 && !x.refund);
    raiseRefund(t); $1('#rr-a').value = '300'; $1('#rr-t').value = 'full'; press(); const i1 = ADMIN.queue[0];
    FA('FB'); applyDecision(i1, 'info', 'Which card?'); FA();
    ok('CR-2 OLD: the rule before FI-1 ignored an Info Requested refund (£300.00 still refundable)', i1.status === 'Info Requested' && P(_rfFI(t)) === 30000);
    ok('FI CR-2: the refundable remainder is £0.00 while that refund is open', P(refundable(t)) === 0);
    ok('FI: a refund of a payment that is not in the ledger (made-up reference or payer) is refused', (() => { const q = ADMIN.queue.length; raiseRefund({ ref: 'TXN-NOPE', payer: 'Nobody', amount: 999, cur: 'GBP' }); const a1 = !MODAL; closeModal(); raiseRefund({ ...t, payer: 'Dev Patel (demo)' }); const a2 = !MODAL; closeModal(); raiseRefund({ ...t, amount: 3000 }); const a3 = !MODAL; closeModal(); return a1 && a2 && a3 && ADMIN.queue.length === q; })());
    const q0 = ADMIN.queue.length; raiseRefund(t); $1('#rr-a').value = '300'; $1('#rr-t').value = 'second'; const r = prim();
    ok('FI CR-2: a second £300 refund of the same payment is refused at submit', r === false && ADMIN.queue.length === q0 && /exceeds the refundable remainder \(£0.00\)/.test(mtxt())); closeModal();
    // A request made before the cap (a stale or direct one) is caught when it is approved
    const extra = newRefund(t, 300, 'Other', 'stale direct', 'Retain access'); ADMIN.queue.unshift(extra); const w = STORE.worlds.CD1, n0 = rfdRows(w);
    FA('FB'); applyDecision(i1, 'approve', 'ok'); const n1 = rfdRows(w); const r2 = applyDecision(extra, 'approve', 'ok');
    ok('FI CR-2: approving the first pays £300 once; approving the second (another £300 of the same £300) is refused, nothing more refunded', n1 === n0 + 1 && r2 === false && rfdRows(w) === n1 && extra.status === 'Pending');
  });
  await T('CR-1 a decided refund is never paid again', async () => {
    FA(); const t = allTx().find(x => x.v === 'CD2' && P(x.amount) === 43333 && !x.refund), w = STORE.worlds.CD2;
    raiseRefund(t); $1('#rr-a').value = '100'; $1('#rr-t').value = 'goodwill'; $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press(); const i = ADMIN.queue[0];
    FA('FB'); const n0 = rfdRows(w); applyDecision(i, 'approve', 'ok');
    ok('FI CR-1: approval refunds £100.00 once', rfdRows(w) === n0 + 1 && P(-w.tx[0].amount) === 10000 && !!i.processed);
    const s0 = sec(), a0 = ADMIN.audit.length; const again = applyDecision(i, 'approve', 'retry');
    ok('FI CR-1: a second approval (retry or direct call) is refused and changes nothing', again === false && rfdRows(w) === n0 + 1 && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Blocked: item already decided'));
    ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); ok('FI CR-1: the queue\'s Approve on the decided item opens nothing', !MODAL);
    refundEffect(i); ok('FI CR-1: running the refund effect again pays nothing (processed once)', rfdRows(w) === n0 + 1);
    ok('CR-1 OLD: the decision path before FI-1 paid the same refund again', (() => { delete i.processed; _adFI(i, 'approve', 'OLD'); const paid = rfdRows(w) === n0 + 2; w.tx.shift(); i.processed = i.processed || now().toISOString(); return paid; })());
    // Approve after Reject / Return
    FA(); raiseRefund(t); $1('#rr-a').value = '50'; $1('#rr-t').value = 'r'; press(); const j = ADMIN.queue[0];
    FA('FB'); applyDecision(j, 'reject', 'no'); const n2 = rfdRows(w);
    ok('FI CR-1: approving a rejected refund is refused; it stays Rejected and pays nothing', applyDecision(j, 'approve', 'late') === false && j.status === 'Rejected' && rfdRows(w) === n2 && !j.processed);
    FA(); raiseRefund(t); $1('#rr-a').value = '50'; $1('#rr-t').value = 'r2'; press(); const k = ADMIN.queue[0];
    FA('FB'); applyDecision(k, 'return', 'resubmit');
    ok('FI CR-1: approving a returned refund is refused; nothing paid', applyDecision(k, 'approve', 'late') === false && rfdRows(w) === n2 && !k.processed);
    ok('FI: the raiser still can\'t approve their own refund (G4)', (() => { FA(); raiseRefund(t); $1('#rr-a').value = '10'; $1('#rr-t').value = 'own'; press(); const m = ADMIN.queue[0]; return applyDecision(m, 'approve', 'mine') === false && m.status === 'Pending'; })());
  });
  await T('CR-3 Super Admin refund route', async () => {
    SA(); const t = allTx().find(x => x.v === 'CD3' && x.amount === 45 && !x.refund), w = STORE.worlds.CD3;
    _arFI(); const k = $a('#rr-t option').findIndex(o => o.value.startsWith(t.ref + '|')); $1('#rr-t').selectedIndex = Math.max(0, k); $1('#rr-a').value = '450'; $1('#rr-c').value = 'Retain access'; reason('OLD'); const old = ADMIN.queue[0];
    ok('CR-3 OLD: the admin console\'s own dialog accepted £450.00 against Lena\'s £45.00 payment, with no link to her record (the audit\'s failure; FI-1\'s approval check now stops the money)', old.amount === 450 && !(old.data || {}).v && !old.processed && !w.tx.some(x => x.amount < 0), old.status);
    ADMIN.queue.splice(ADMIN.queue.indexOf(old), 1); // undo the OLD demonstration
    SA(); const n0 = rfdRows(w), q0 = ADMIN.queue.length; ACT.raiseRefund(); const opt = $a('#rr-t option').findIndex(o => o.textContent.startsWith(t.ref + ' · ' + t.payer)); $1('#rr-t').selectedIndex = opt; $1('#rr-a').value = '450'; $1('#rr-c').value = 'Retain access'; $1('#rsn').value = 'over'; const r = prim();
    ok('FI CR-3: £450.00 against £45.00 is refused (the same remainder as Finance\'s refund)', opt >= 0 && r === false && ADMIN.queue.length === q0 && /exceeds the refundable remainder \(£45.00\)/.test(mtxt())); closeModal();
    ACT.raiseRefund(); $1('#rr-t').selectedIndex = $a('#rr-t option').findIndex(o => o.textContent.startsWith(t.ref + ' · ' + t.payer)); $1('#rr-a').value = '20.50'; $1('#rr-c').value = 'Retain access'; reason('Goodwill');
    const i = ADMIN.queue[0];
    ok('FI CR-3: £20.50 is processed immediately (D8) through the same refund — linked to Lena, a −£20.50 ledger row', i.type === 'Refund' && i.status === 'Approved' && !!i.processed && i.data.v === 'CD3' && rfdRows(w) === n0 + 1 && P(w.tx[0].amount) === -2050);
    ok('FI CR-3: the remainder is £24.50 and the admin dialog offers no more than that', P(refundable(t)) === 2450 && (() => { ACT.raiseRefund(); const o = $a('#rr-t option').find(x => x.textContent.startsWith(t.ref + ' · ' + t.payer)); closeModal(); return !!o && /refundable £24.50/.test(o.textContent); })());
  });
  await T('CR-9 roles on refunds and payments (client demo)', async () => {
    const t = allTx().find(x => x.v === 'CD2' && P(x.amount) === 43333 && !x.refund);
    FA(); raiseRefund(t); $1('#rr-a').value = '5'; $1('#rr-t').value = 'roles'; press(); const i = ADMIN.queue[0], w = STORE.worlds.CD2, n0 = rfdRows(w);
    for (const [lbl, enter] of [['Academic Admin', ACA], ['Business Admin', () => role('bizA')], ['System Admin', () => role('sysA')]]) {
      enter(); const q0 = ADMIN.queue.length, s0 = sec();
      raiseRefund(t); const opened = !!MODAL; closeModal(); ACT.finRaise(); const opened2 = !!MODAL; closeModal();
      const r = applyDecision(i, 'approve', 'not mine');
      ok(`FI CR-9: ${lbl} — raise refund refused (handler and dialog), approve refused; nothing paid, security events logged`, !opened && !opened2 && r === false && i.status === 'Pending' && rfdRows(w) === n0 && ADMIN.queue.length === q0 && sec() >= s0 + 3);
      const k = 'CD1|nvq|6', row = pl(STORE.worlds.CD1).rows[5]; ok(`FI CR-9: ${lbl} — recordPayment refused`, recordPayment({ key: k, v: 'CD1' }, 300, 'BACS-FI9' + lbl.length, 'Bank transfer', 'x') === false && P(row.paid) === 0);
    }
    const ag = (ADMIN.agencies[0] || {}).id; if (ag) { AGY(ag); const r = applyDecision(i, 'approve', 'agency'); ok('FI CR-9: an agency session can\'t approve a refund', r === false && i.status === 'Pending'); }
    learner('CD2'); ok('FI CR-9: a learner session can\'t approve a refund or record a payment', applyDecision(i, 'approve', 'me') === false && recordPayment({ key: 'CD2|nvq|5', v: 'CD2' }, 433.33, 'BACS-FI9L', 'Bank transfer', 'x') === false && i.status === 'Pending');
    FA('FB'); applyDecision(i, 'approve', 'ok'); ok('FI CR-9: the other Finance Admin approves it (£5.00 refunded once)', i.status === 'Approved' && rfdRows(w) === n0 + 1);
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy();
  const seatsOf = ag => ADMIN.bundles.filter(b => b.agency === ag).reduce((s, b) => s + b.seats, 0);
  const invRequest = (agId, qty) => { AGY(agId); const ag = AGN(), c = AGY_CATALOGUE()[0]; S.agy.buy = { c, qty }; agInvoiceForm(); const bc = $1('#gi-bc'); if (bc && !bc.value) bc.value = 'PO-FI'; prim(); closeModal(); return { ag, i: ADMIN.queue.find(x => x.type === 'Agency invoice (offline) purchase' && x.data && x.data.portal && x.data.agency === ag && x.status === 'Pending') }; };
  await T('CR-4 agency bank-transfer purchase', async () => {
    const o = invRequest('AG-02', 10); FA(); applyDecision(o.i, 'approve', 'ok'); const s0 = seatsOf(o.ag), t0 = STORE.fin.tx.length;
    _ipFI({ dataset: { id: o.i.id } }); reason('OLD'); AGY('AG-02'); reconcileInvoices();
    ok('CR-4 OLD: one paid 10-seat invoice credited 20 seats (the audit\'s failure)', seatsOf(o.ag) === s0 + 20 && STORE.fin.tx.length === t0 + 1);
    const n = invRequest('AG-02', 10); FA(); applyDecision(n.i, 'approve', 'ok'); const s1 = seatsOf(n.ag), t1 = STORE.fin.tx.length;
    ACT.invPay({ dataset: { id: n.i.id } }); $1('#ip-a').value = '1'; $1('#rsn').value = 'part'; const under = prim();
    ok('FI CR-4: £1.00 against the invoice is refused; no seats, no transaction', under === false && n.i.stage === 'awaiting' && STORE.fin.tx.length === t1 && seatsOf(n.ag) === s1); closeModal();
    ACT.invPay({ dataset: { id: n.i.id } }); reason('Received'); AGY('AG-02'); reconcileInvoices(); go('g-purchases'); reconcileInvoices();
    ok('FI CR-4: the full amount pays it once — exactly 10 seats credited, one transaction of the invoice amount', seatsOf(n.ag) === s1 + 10 && STORE.fin.tx.length === t1 + 1 && P(STORE.fin.tx[0].amount) === P(n.i.amount) && n.i.stage === 'paid');
    FA(); const s2 = seatsOf(n.ag); ACT.invPay({ dataset: { id: n.i.id } }); const again = !!MODAL; closeModal();
    ok('FI CR-4: Record payment again opens nothing; no seats or money added', !again && seatsOf(n.ag) === s2 && STORE.fin.tx.length === t1 + 1);
    ok('FI CR-4: the paid invoice is no longer a payment target', !payTargets().some(t => t.inv === n.i));
    const ret = qItem('AQ-2009'); ACT.invPay({ dataset: { id: 'AQ-2009' } }); ok('FI CR-4: a Returned invoice request can\'t be paid', !MODAL && ret.stage !== 'paid');
    ACT.invPay({ dataset: { id: 'AQ-NOPE' } }); ok('FI CR-4: an unknown invoice id is refused', !MODAL);
    // An older (seeded, non-portal) invoice: credited once to the agency's bundle, as before
    const s = qItem('AQ-2006'), ag6 = s.data.agency, s6 = seatsOf(ag6); ACT.invPay({ dataset: { id: 'AQ-2006' } }); reason('Received'); reconcileInvoices();
    ok('FI CR-4: a seeded invoice (AQ-2006) is paid once — its ' + s.data.seats + ' seats credited once', seatsOf(ag6) === s6 + s.data.seats && s.stage === 'paid');
    const n3 = invRequest('AG-02', 5); FA(); applyDecision(n3.i, 'approve', 'ok'); const s3 = seatsOf(n3.ag), t3 = STORE.fin.tx.length;
    for (const [lbl, enter] of [['Business Admin', () => role('bizA')], ['System Admin', () => role('sysA')], ['Academic Admin', ACA], ['agency session', () => AGY('AG-02')]]) {
      enter(); ACT.invPay({ dataset: { id: n3.i.id } }); const op = !!MODAL; closeModal();
      ok(`FI CR-9: ${lbl} can't record an invoice payment (handler)`, !op && n3.i.stage === 'awaiting' && STORE.fin.tx.length === t3 && seatsOf(n3.ag) === s3);
    }
    ACA(); ok('FI CR-9: an Academic Admin can\'t approve an invoice purchase', (() => { const m = invRequest('AG-02', 3); ACA(); return applyDecision(m.i, 'approve', 'x') === false && m.i.status === 'Pending'; })());
  });

  await T('CR-6 no surplus route where the refund would not be a refund transaction', async () => {
    FA(); const o = invRequest('AG-02', 4); FA(); applyDecision(o.i, 'approve', 'ok'); const s0 = seatsOf(o.ag), t0 = STORE.fin.tx.length;
    ACT.finOffline({ dataset: { k: 'inv|' + o.i.id } }); $1('#op-a').value = String(o.i.amount + 50); INP.opPrev(); const btn = !!$1('#modal-root [data-act="opSurplus"]'); $1('#rsn').value = 'over'; ACT.opSurplus(); const stays = !!MODAL; closeModal();
    ok('FI CR-6: an agency invoice surplus is not recorded (no surplus button; refused; invoice still awaiting, no seats, no transaction — PD-FI-04)', !btn && stays && o.i.stage === 'awaiting' && seatsOf(o.ag) === s0 && STORE.fin.tx.length === t0);
    const od = payTargets().find(t => t.od); ACT.finOffline({ dataset: { k: od.key } }); $1('#op-a').value = String(od.due + 50); $1('#rsn').value = 'over'; ACT.opSurplus(); closeModal();
    ok('FI CR-6: a seeded overdue row surplus is not recorded (its refund would write no refund transaction)', STORE.fin.tx.length === t0 && P(od.od.paid) < P(od.od.amount) + 1 && od.od.status !== 'paid');
  });
  await T('CR-7 observation fee collected once', async () => {
    learner('C'); const f = chFeeRaise(STORE.worlds.C.me.id, STORE.worlds.C.nvq.title, D(5), 'C'), w = STORE.worlds.C; go('payments');
    ACT.chFeeBank({ dataset: { id: f.id } }); prim(); closeModal(); const n0 = w.tx.length;
    ACT.chFeePay({ dataset: { id: f.id } }); ok('FI CR-7: card payment refused while the bank transfer awaits Finance', !MODAL || !/Pay now/.test(MODAL.title || '')); closeModal();
    ACT.chFeeBank({ dataset: { id: f.id } }); if (MODAL) { prim(); closeModal(); }
    ok('FI CR-7: a second transfer notice is refused (one transfer entry)', STORE.chBank.filter(y => y.fee === f.id).length === 1);
    // OLD: the card path before FI-1 took the fee while the transfer was pending; then Finance's confirmation is refused
    fxFast(ff => { _cfpFI({ dataset: { id: f.id } }); prim(); ff(3000); closeModal(); });
    ok('CR-7 OLD: the card path before FI-1 took £' + f.amount + ' while the transfer was pending', f.status === 'Paid' && w.tx.length === n0 + 1);
    FA(); const x = STORE.chBank.find(y => y.fee === f.id), tg = payTargets().find(t => t.chb === x);
    ok('FI CR-7: Finance\'s confirmation of that transfer is refused — the fee was already paid; still one fee payment', !!tg && recordPayment(tg, x.amount, 'BACS-FI701', 'Bank transfer', 'Received') === false && w.tx.filter(t => /Observation fee/.test(t.desc)).length === 1 && f.method === 'Card');
    // Transfer, then Finance confirms the exact amount once
    learner('C'); const g = chFeeRaise(STORE.worlds.C.me.id, 'Level 2 Diploma in Care (England)', D(6), 'C'); go('payments'); ACT.chFeeBank({ dataset: { id: g.id } }); prim(); closeModal();
    FA(); const y = STORE.chBank.find(z => z.fee === g.id), tg2 = payTargets().find(t => t.chb === y);
    const ks = payTargets().filter(t => t.chb && t.chb.fee && t.chb.wv === 'C').map(t => t.key);
    ok('FI: two observation-fee transfers of one learner (same bank reference) have distinct payment items', ks.length === 2 && ks.length === new Set(ks).size && !!tg2 && tg2.chb.fee === g.id, J(ks));
    ok('FI CR-7: £1.00 against the £' + g.amount + ' fee transfer is refused (the fee stays Due)', recordPayment(tg2, 1, 'BACS-FI702', 'Bank transfer', 'part') === false && g.status === 'Due');
    ok('FI CR-7: the exact amount marks it Paid once', recordPayment(tg2, g.amount, 'BACS-FI703', 'Bank transfer', 'ok') !== false && g.status === 'Paid' && recordPayment(tg2, g.amount, 'BACS-FI704', 'Bank transfer', 'again') === false);
    // A waived fee never flips back to Paid
    learner('C'); const h = chFeeRaise(STORE.worlds.C.me.id, 'Level 5 Diploma in Leadership (England)', D(7), 'C'); go('payments'); ACT.chFeeBank({ dataset: { id: h.id } }); prim(); closeModal();
    SA(); ACT.chFeeWaive({ dataset: { id: h.id } }); reason('Academy error'); FA(); const z = STORE.chBank.find(q => q.fee === h.id), tg3 = payTargets().find(t => t.chb === z);
    ok('FI CR-7: Finance can\'t record a transfer against a waived fee; it stays Waived', h.status === 'Waived' && (!tg3 || recordPayment(tg3, z.amount, 'BACS-FI705', 'Bank transfer', 'x') === false) && h.status === 'Waived');
  });
  await T('CR-9 observation fee waiver chain (CH-39)', async () => {
    const k = STORE.chFees.find(x => x.name === 'Kofi Asante'), i = qItem('AQ-9101');
    ACA(); ok('FI CR-9: an Academic Admin can\'t review a waiver', applyDecision(i, 'approve', 'x') === false && i.stage === 'review');
    FA(); applyDecision(i, 'approve', 'Checked.'); ok('FI: Finance review forwards it to the Super Administrator (fee still Due)', i.stage === 'final' && i.status === 'Pending' && k.status === 'Due');
    FA(); ok('FI CR-9: the same Finance Admin can\'t give the final approval', applyDecision(i, 'approve', 'again') === false && k.status === 'Due');
    FA('FB'); ok('FI CR-9: another Finance Admin can\'t give the final approval', applyDecision(i, 'approve', 'final') === false && k.status === 'Due');
    role('bizA'); ok('FI CR-9: a Business Admin can\'t give the final approval', applyDecision(i, 'approve', 'final') === false && k.status === 'Due');
    SA(); applyDecision(i, 'approve', 'Final.'); ok('FI: the Super Administrator\'s final approval waives it', k.status === 'Waived' && i.status === 'Approved');
    // A fee paid while its waiver is in review can't then be waived
    learner('C'); const f = chFeeRaise(STORE.worlds.C.me.id, 'FI test programme (waiver)', D(8), 'C'); role('sysA'); ACT.chFeeWaive({ dataset: { id: f.id } }); reason('Hardship'); const wq = ADMIN.queue.find(q => q.data && q.data.fee === f.id);
    learner('C'); go('payments'); fxFast(ff => { ACT.chFeePay({ dataset: { id: f.id } }); prim(); ff(3000); closeModal(); });
    FA(); ok('FI: a fee paid while its waiver was in review is not waived (Finance\'s review is refused)', f.status === 'Paid' && !!wq && applyDecision(wq, 'approve', 'x') === false && f.status === 'Paid');
  });
  await T('CR-9 bundle VAT approval', async () => {
    const p = chProd(ADMIN.queue.find(q => q.type === CH_VAT_T && q.status === 'Pending')?.data.productId) || null;
    const i = ADMIN.queue.find(q => q.type === CH_VAT_T && q.status === 'Pending');
    if (!i) { ok('FI CR-9: a pending bundle VAT item exists in the legacy data', false); return; }
    const vat0 = J(p && p.vat); ACA(); ok('FI CR-9: an Academic Admin can\'t approve a bundle VAT change; VAT unchanged', applyDecision(i, 'approve', 'x') === false && J(p && p.vat) === vat0 && i.status === 'Pending');
    role('sysA'); ok('FI CR-9: a System Admin can\'t approve it', applyDecision(i, 'approve', 'x') === false && i.status === 'Pending');
    FA(); if (isMine(i)) FA('FB'); applyDecision(i, 'approve', 'Checked'); ok('FI: a Finance Admin approves it', i.status === 'Approved');
  });
  await T('CR-9 other Finance handlers', async () => {
    const od = odRows().find(o => o.status === 'overdue'), dup = STORE.fin.dups.find(d => d.status === 'Unresolved'), pp = STORE.fin.pending.find(p => p.status === 'Pending'), dep = STORE.fin.deposits.find(d => d.status === 'Seat held');
    for (const [lbl, enter] of [['Academic Admin', ACA], ['Business Admin', () => role('bizA')]]) {
      enter(); const s0 = sec(); const opened = [];
      [['odDisc', od.id], ['odRestore', od.id], ['odReact', od.id], ['discNonPay', 'x'], ['dupRefund', dup.id], ['dupOk', dup.id], ['ppConfirm', pp.id], ['depBal', dep.id], ['depRefund', dep.id]].forEach(([a, id]) => { ACT[a]({ dataset: { id, n: 'Kofi Asante' } }); if (MODAL) opened.push(a); closeModal(); });
      ok(`FI CR-9: ${lbl} — non-payment, duplicate, pending-confirmation and deposit actions refused in the handler (9 refusals logged)`, !opened.length && sec() === s0 + 9, J(opened));
    }
    role('sysA'); ACT.odDisc({ dataset: { id: od.id } }); const sysOk = !!MODAL; closeModal(); ACT.dupRefund({ dataset: { id: dup.id } }); const sysNo = !MODAL; closeModal();
    ok('FI: a System Admin keeps non-payment discontinue (G4) but can\'t refund a duplicate', sysOk && sysNo);
    FA(); ACT.odDisc({ dataset: { id: od.id } }); const finOk = !!MODAL; closeModal(); ok('FI: a Finance Admin keeps non-payment discontinue', finOk);
    FA(); const t0 = STORE.fin.tx.length; ACT.depBal({ dataset: { id: dep.id } }); $1('#db-a').value = 'abc'; $1('#rsn').value = 'x'; const r = prim();
    ok('FI: seeded Deposits → Record balance refuses "abc" (no NaN transaction)', r === false && STORE.fin.tx.length === t0 && dep.status === 'Seat held'); closeModal();
    const w = STORE.worlds.C, p = pl(w), row = p.rows.find(x => x.status !== 'Paid'), a0 = P(row.amount);
    ACT.finWaive({ dataset: { v: 'C', e: 'nvq' } }); if ($1('#wv-a')) { $1('#wv-r').value = String(row.n); $1('#wv-k').value = 'gbp'; $1('#wv-a').value = '-50'; $1('#rsn').value = 'neg'; }
    const rw = $1('#wv-a') ? prim() : 'no dialog'; ok('FI: a negative waiver is refused; the instalment is unchanged', rw === false && P(row.amount) === a0, String(rw) + ' ' + row.amount); closeModal();
  });
  await T('CR-2 seeded shared references', async () => {
    FA(); const shared = allTx().filter(t => t.ref === 'TXN-85002' && !t.refund);
    ok('FI CR-2: the remainder is per payer — another learner\'s refund on the shared seeded reference TXN-85002 doesn\'t use up theirs', shared.length >= 2 && shared.filter(t => refundable(t) > 0).length >= shared.length - 1, J(shared.map(t => t.payer + ' ' + refundable(t))));
  });

  /* ================= Reset and isolation ================= */
  await T('FI-Z client demo reset', async () => {
    fxLoadClient(); FA();
    ok('FI-Z loading the client demo restores the starting records (Amira, Dev and Lena unchanged; no registrations)', snapCD() === cd0 && !Object.keys(STORE.worlds).some(k => /^G\d*$/.test(k)), snapCD());
    ok('FI-Z the client demo\'s Finance targets are again the demo learners only', payTargets().every(t => /^CD[12]\|/.test(t.key)));
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
