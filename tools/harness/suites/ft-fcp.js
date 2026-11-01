// FCP — browser persistence of the client demo (1 Nov 2026; PD-FC-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Real browser refreshes: the suite reloads the page between phases (location.reload, same browser profile) and checks that the
// whole financial state comes back identical — never the ledger without its balances, plans, refunds and seats — then that
// legacy test data never leaks in and Reset demo deletes the saved copy. Expected state is captured before each refresh.
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
  const reason = (r = 'FCP test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
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
  // The phases run one per page load; results and the expected state are kept in test keys of this (throw-away) browser profile
  const TK = 'ft-fcp-test', st = JSON.parse(window.localStorage.getItem(TK) || '{"ph":1,"R":[]}');
  R.push(...st.R);
  const LS = () => window.localStorage.getItem(FCP_KEY);
  const rec = (k, a, ref) => { FA(); const t = tgt(k); if (!t) return 'no target'; return recordPayment(t, a, ref || fiUniqRef('BACS-', 60000, 9999), 'Bank transfer', 'FCP test'); };
  // Everything a reconciliation depends on, in pence (ledger, plans, deposits, bank notices, refunds, seats, batch count)
  const snap = () => ({
    tx: allTx().map(t => [t.ref, t.payer, P(t.amount), t.status, !!t.refund]).sort((a, b) => (a.join() < b.join() ? -1 : 1)),
    plans: learnerAccounts().map(v => [v, (STORE.worlds[v].plans || []).map(p => [p.e, p.plan, p.deposit && [P(p.deposit.amount), p.deposit.status], p.rows.map(r => [r.n, P(r.amount), P(r.paid), P(r.credit), r.status])])]),
    bank: (STORE.chBank || []).map(x => [x.ref, P(x.amount), x.status]),
    refunds: ADMIN.queue.filter(i => i.type === 'Refund').map(i => [i.id, P(i.amount), i.status, !!i.processed]),
    seats: learnerAccounts().map(v => [v, dpSeat(STORE.worlds[v]).st]), enrolled: ADMIN.batches.map(b => [b.code, b.enrolled]),
    led: (L => [L.received, L.refunded, L.pending, L.net])(fiLedger({})), owed: fiObligations().map(o => [o.name, o.outstanding]),
    acct: learnerAccounts().map(v => (a => [v, a.received, a.refunded, a.outstanding])(fiAcct(STORE.worlds[v]))), stamps: STORE.fcStamp });
  const same = (n, a, b) => ok(n, J(a) === J(b), J(a) === J(b) ? '' : J(a).slice(0, 300) + ' ≠ ' + J(b).slice(0, 300));
  // PD-FC-11: a learner on the deposit-then-instalments route, through the real screens (the £100.00 deposit configured and approved first)
  const setDeposit = amt => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; const id = cdPr().id; go('a-programmes', { id, tab: 'fees' }); $1('main input[name="e1-wdm"][value="own"]').checked = true; $1('main #e1-d').value = String(amt); ACT.cb8Dep({ dataset: { p: id } }); ACT.cb8Submit({ dataset: { p: id } }); if (MODAL) press(); const wf = cb8Wf(cdPr()); FA(); go('a-queue', { id: wf.qid }); ACT.e1Decide({ dataset: { id: wf.qid, a: 'approve' } }); if (MODAL) reason('FCP deposit'); };
  const payRow1 = w => { learner(w.v); go('payments'); payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })); };
  const next = (ph, extra = {}) => { window.localStorage.setItem(TK, J({ ...st, ...extra, ph, R })); setTimeout(() => location.reload(), 30); };

  if (st.ph === 1) {
    await T('FCP-1 changes before the refresh', async () => {
      ok('FCP-1 a fresh start has nothing saved and the starting demo (3 payments)', allTx().length === 3 && !(LS() && JSON.parse(LS()).data.includes('RFD-')));
      rec('CD1|nvq|2', 300, 'BACS-FCP-1');
      const p = register('Pia Pend', 'pia.pend@fcp.example'); toPayment(p); choose('deposit', 'bank'); click($1('main [data-act="suPay"]')); press();
      const h = register('Hal Hold', 'hal.hold@fcp.example'); toPayment(h); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
      FA(); const lt = allTx().find(t => t.v === 'CD3'); raiseRefund(lt); $1('#rr-a').value = '20'; $1('#rr-t').value = 'processed'; $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press(); const it = ADMIN.queue[0]; FA('FB'); applyDecision(it, 'approve', 'ok');
      FA(); raiseRefund(allTx().find(t => t.v === 'CD3' && !t.refund)); $1('#rr-a').value = '10'; $1('#rr-t').value = 'left pending'; $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press();
      setDeposit(100); const z = register('Zoe Secure', 'zoe.secure@fcp.example'); toPayment(z); choose('dep6', 'card'); payCo(() => click($1('main [data-act="suPay"]'))); payRow1(z);
      ok('FCP-1 Zoe (deposit, then 6 payments): £100.00 deposit + £200.00 instalment 1, seat secured', pl(z).depRoute === 'inst' && dpSeat(z).st === 'occupied' && P(pl(z).rows[0].credit) === 10000 && z.tx.length === 2);
      FA(); go('f-ledger'); render();
      ok('FCP-1 the changes are saved in this browser', FCP.st === 'saved' && !!LS() && JSON.parse(LS()).data === FCP.last, FCP.st + ' ' + FCP.why);
      ok('FCP-1 one refund processed, one pending; one deposit transfer awaiting confirmation; one seat reserved', it.processed && ADMIN.queue.filter(i => i.type === 'Refund')[0].status === 'Pending' && (STORE.chBank || []).some(x => x.v === p.v && x.status === 'Awaiting confirmation') && dpSeat(h).st === 'reserved');
      next(2, { s1: snap(), zv: z.v, pv: p.v, hv: h.v, it: it.id, at: now().getTime(), foot: $1('.fc-led-foot').textContent });
    });
    return;
  }
  if (st.ph === 2) {
    await T('FCP-2 after the browser refresh', async () => {
      ok('FCP-2 the saved copy was restored (not rebuilt)', FCP.st === 'saved' && !!FCP.restored);
      const s = snap();
      same('FCP-2 ledger transactions identical (references, amounts, statuses)', s.tx, st.s1.tx);
      same('FCP-2 payment plans, deposits and instalment rows identical (pence)', s.plans, st.s1.plans);
      same('FCP-2 bank transfers awaiting confirmation still awaiting', s.bank, st.s1.bank);
      same('FCP-2 refunds: processed stays processed, pending stays pending', s.refunds, st.s1.refunds);
      same('FCP-2 seat states and the batch count identical', [s.seats, s.enrolled], [st.s1.seats, st.s1.enrolled]);
      same('FCP-2 ledger totals, obligations and learner accounts reconcile as before', [s.led, s.owed, s.acct], [st.s1.led, st.s1.owed, st.s1.acct]);
      same('FCP-2 each payment keeps the batch it was made in', s.stamps, st.s1.stamps);
      ok('FCP-2 the demo clock continues from where it was saved (not back to the start of the demo day)', now().getTime() >= new Date(FCP.restored).getTime() && now().getTime() > st.at - 5000, now().toISOString() + ' ' + FCP.restored);
      FA(); go('f-ledger'); ok('FCP-2 the Ledger shows the same totals', $1('.fc-led-foot').textContent === st.foot, $1('.fc-led-foot').textContent);
      ok('FCP-2 the Ledger says the copy is kept in this browser only (prototype)', /Prototype only/.test(main()) && /Demo changes are saved in this browser/.test(main()));
      const z = STORE.worlds[st.zv], zp = pl(z);
      ok('FCP-2 Zoe after the refresh: seat still secured, one plan, deposit credited once to instalment 1, £300.00 received, £1,500.00 outstanding', dpSeat(z).st === 'occupied' && z.plans.filter(x => x.e === 'nvq').length === 1 && P(zp.rows[0].credit) === 10000 && P(zp.rows[0].paid) === 30000 && z.tx.reduce((a, t) => a + P(t.amount), 0) === 30000 && P(fpLedger(zp).outstanding) === 150000 && fpLedger(zp).ok);
      ok('FCP-2 Zoe signed terms: still one frozen object on the plan and the sign-up', z.signup.pin === zp.pin && Object.isFrozen(zp.pin) && zp.pin.route === 'deposit-instalments');
      fpCredit(z, 'after refresh'); ok('FCP-2 crediting again after the refresh changes nothing', P(zp.rows[0].credit) === 10000 && P(zp.rows[0].paid) === 30000);
      ok('FCP-2 the programme still takes the £100.00 deposit (the approved change was kept)', cb8Cur(cdPr().id).dep.eff === 100);
      const it = ADMIN.queue.find(i => i.id === st.it), n = STORE.worlds.CD3.tx.length; FA('FB'); applyDecision(it, 'approve', 'again'); refundEffect(it);
      ok('FCP-2 the processed refund can\'t be paid again after the refresh', STORE.worlds.CD3.tx.length === n);
      ok('FCP-2 the same payment reference is still refused after the refresh', rec('CD1|nvq|3', 300, 'BACS-FCP-1') === false);
      ok('FCP-2 the pending deposit is still confirmable (once, by its full amount)', !!tgt(st.pv + '|dep') && rec(st.pv + '|dep', 150) === false);
      rec('CD2|nvq|2', 433.33, 'BACS-FCP-2'); render();
      ok('FCP-2 a new payment after the refresh is saved', JSON.parse(LS()).data === FCP.last && FCP.last.includes('BACS-FCP-2'));
      next(3, { s2: snap() });
    });
    return;
  }
  if (st.ph === 3) {
    await T('FCP-3 a second refresh', async () => {
      const s = snap(); same('FCP-3 restoring again changes nothing (no duplicate transactions)', s, st.s2);
      const refs = allTx().filter(t => !t.refund).map(t => t.ref + '|' + t.payer); ok('FCP-3 every transaction appears once', new Set(refs).size === refs.length && allTx().filter(t => t.ref === 'BACS-FCP-2').length === 1);
      const k0 = LS(); ACT.fxLegacy(); render(); ok('FCP-3 legacy test data loaded (developer mode) — the saved copy is untouched', FX.mode === 'legacy' && LS() === k0 && allTx().some(t => /Gulf Care/.test(t.payer)));
      next(4);
    });
    return;
  }
  if (st.ph === 4) {
    await T('FCP-4 refresh after the legacy test data', async () => {
      ok('FCP-4 the client demo comes back with its saved changes', FX.mode === 'client' && J(snap()) === J(st.s2));
      ok('FCP-4 no legacy test transaction leaks into it', !allTx().some(t => /Gulf Care|TXN-90011|BrightCare|Maria Santos/.test(t.payer + t.ref)));
      ACT.resetDemo(); ok('FCP-4 Reset demo deletes the saved copy', !LS());
      next(5);
    });
    return;
  }
  await T('FCP-5 refresh after Reset demo', async () => {
    ok('FCP-5 the starting demo: three payments, no refunds, no registered learners, nothing saved', allTx().length === 3 && !ADMIN.queue.some(i => i.type === 'Refund') && !learnerAccounts().some(v => /^G/.test(v)) && !LS() && !FCP.restored, J([allTx().length, ADMIN.queue.filter(i => i.type === 'Refund').length, learnerAccounts(), !!LS(), FCP.restored]));
    ok('FCP-5 the programme deposit is the Academy default (£300.00) again', cb8Cur(cdPr().id).dep.eff === 300);
    ok('FCP-5 Amira £300.00 / Dev £433.33 / Lena £45.00 as at the start', J(['CD1', 'CD2', 'CD3'].map(v => fiAcct(STORE.worlds[v]).received)) === J([30000, 43333, 4500]));
  });
  window.localStorage.removeItem(TK);
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
