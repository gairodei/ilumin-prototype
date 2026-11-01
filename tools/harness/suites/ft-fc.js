// FC — Finance client feedback corrections (1 Nov 2026; PD-FC-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client (the client demo, as a fresh browser loads it). Expected money is worked out here in
// integer pence from the learners' own records, never read from the code under test. The browser refresh itself is ft-fcp.js.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 6).join(' | ')); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FC test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
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
  const raise = (t, a, txt = 'FC', keep = true) => { raiseRefund(t); $1('#rr-a').value = String(a); $1('#rr-t').value = txt; if (keep) $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press(); return ADMIN.queue[0]; };
  const txOf = (v, amt) => allTx().find(x => x.v === v && P(x.amount) === P(amt) && !x.refund && ['Paid', 'Partially refunded'].includes(x.status)); // FC review (L-4): a payment refunded in part is still refundable
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
  // PD-FD-01: the client demo adds Sam (CD4, deposit + instalment 1 paid) and Tom (CD5, £100.00 deposit transfer awaiting confirmation). Was: Amira, Dev and Lena only.
  const Sm = STORE.worlds.CD4, Tm = STORE.worlds.CD5;
  const LS = () => window.localStorage.getItem(FCP_KEY);
  const rcv = w => w.tx.filter(t => t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status)).reduce((a, t) => a + P(t.amount), 0);
  const refd = w => w.tx.filter(t => t.amount < 0).reduce((a, t) => a + P(-t.amount), 0);
  const due = w => pl(w).rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid)), 0);
  const rec = (k, a, ref) => { FA(); const t = tgt(k); if (!t) return 'no target'; return recordPayment(t, a, ref || fiUniqRef('BACS-', 60000, 9999), 'Bank transfer', 'FC test'); };
  const repData = (tab, k) => { go('f-reports', { tab }); const s = $1('main .fi-rep'); return s ? +s.dataset[k] : null; };
  const setF = (sc, c, b, t) => { setUi('fcC-' + sc, c || ''); setUi('fcB-' + sc, b || ''); setUi('fcT-' + sc, t || ''); render(); };
  // A deposit followed by instalments has no sign-up route (PD-FC-02): the decided example is a test-only plan on a registered learner
  const gross = (name, email) => { const g = register(name, email); g.nvq = { ...(g.nvq || {}), title: CD_T, batch: '' }; g.plans = [{ e: 'nvq', title: CD_T, plan: 'Instalments', total: 1800, partial: true, cur: 'GBP', depBasis: 'gross', deposit: { amount: 100, status: 'Awaiting confirmation by Finance', paidAt: null }, rows: [1, 2, 3, 4, 5, 6].map(n => ({ n, amount: 300, due: D(30 * n), status: 'Pending', paid: 0 })) }]; return g; };

  /* ================= A–C: the starting demo ================= */
  await T('FC-A/B/C starting records', async () => {
    const a = own(A), d = own(Dv), L = STORE.worlds.CD3;
    ok('FC-A Amira: £1,800.00 fee, £300.00 received, £1,500.00 outstanding (pence)', a.fee === 180000 && a.got === 30000 && a.out === 150000, J(a));
    ok('FC-A Dev: £2,600.00 fee, £433.33 received, £2,166.67 outstanding (pence)', d.fee === 260000 && d.got === 43333 && d.out === 216667, J(d));
    ok('FC-A Finance account (fiAcct) = the learner\'s own record, both learners', fiAcct(A).outstanding === a.out && fiAcct(A).received === a.got && fiAcct(Dv).outstanding === d.out && fiAcct(Dv).received === d.got);
    FA(); go('f-learners'); ok('FC-B Learner Accounts shows Amira £1,500.00 and Dev £2,166.67 outstanding', /£1,500\.00/.test(rowOf('', 'Amira').textContent) && /£2,166\.67/.test(rowOf('', 'Dev Patel').textContent));
    go('f-ledger'); ok('FC-B Ledger lists Amira and Dev with programme and batch', ['Amira', 'Dev Patel'].every(n => { const r = rowOf('', n); return r && /NVQ programme/.test(r.textContent) && /DEMO-L3-JAN27/.test(r.textContent); }));
    // PD-FD-01: 5 receipts (Sam £100.00 + £200.00 added) and Tom £100.00 transfer pending. Was: received £778.33, nothing pending.
    const f = $1('.fc-led-foot'); ok('FC-B Ledger footer: received £1,078.33, only Tom £100.00 deposit transfer pending (pence)', f && +f.dataset.received === 30000 + 43333 + 4500 + 10000 + 20000 && +f.dataset.received === rcv(A) + rcv(Dv) + rcv(STORE.worlds.CD3) + rcv(Sm) && +f.dataset.pending === 10000 && (STORE.chBank || []).filter(x => x.status === 'Awaiting confirmation').length === 1 && (STORE.chBank || []).some(x => x.v === 'CD5' && x.status === 'Awaiting confirmation'), f && f.textContent);
    ACT.fcQuick({ dataset: { v: 'Short course' } }); const rows = $a('main table tbody tr');
    ok('FC-C "Short courses" shows only Lena\'s £45.00 Moving and Handling People payment', rows.length === 1 && /Lena Hart/.test(rows[0].textContent) && /Moving and Handling People/.test(rows[0].textContent) && /£45\.00/.test(rows[0].textContent) && /Not batch-specific/.test(rows[0].textContent));
    ok('FC-C its receipt and method are shown', rows[0] && /RCP-\d+/.test(rows[0].textContent) && /Gateway card/.test(rows[0].textContent));
    setF('fl'); const q = $1('#dtq-fledger'); q.value = 'Lena'; INP.dtQ(q); ok('FC-C search by learner name finds it', $a('main table tbody tr').length === 1 && /£45\.00/.test(main()));
    const q2 = $1('#dtq-fledger'); q2.value = 'Moving and Handling'; INP.dtQ(q2); ok('FC-C search by course name finds it', $a('main table tbody tr').length === 1);
    const q3 = $1('#dtq-fledger'); q3.value = ''; INP.dtQ(q3);
    setF('fl', 'SC:SC-01'); ok('FC-C the course filter (Moving and Handling People) finds it, total £45.00', $a('main table tbody tr').length === 1 && +$1('.fc-led-foot').dataset.received === 4500);
    ok('FC-C a short course has no batches to choose (only "Not batch-specific")', $a('#fcB-fl option').map(o => o.value).join() === ',' + FC_NB, $a('#fcB-fl option').map(o => o.value).join());
    setF('fl'); go('f-reports', { tab: 'coursewise' }); const tr = $1('main .fi-rep tr[data-k="SC:SC-01"]');
    ok('FC-C Coursewise has a Moving and Handling People row: Short course, £45.00 received', tr && /Short course/.test(tr.textContent) && /£45\.00/.test(tr.textContent));
    learner('CD3'); go('payments'); ok('FC-C Lena\'s own purchase history is unchanged (her £45.00 payment)', /£45\.00/.test(main()) && L.tx.length === 1);
  });

  /* ================= D: course and batch filters across the reports ================= */
  await T('FC-D course and batch filters', async () => {
    FA(); setF('fr'); const all = repData('coursewise', 'received');
    // PD-FD-01: Sam £300.00 added. Was: £778.33 (Amira + Dev + Lena).
    ok('FC-D Coursewise, no filters: received £1,078.33 (pence, from the learners\' records)', all === rcv(A) + rcv(Dv) + rcv(STORE.worlds.CD3) + rcv(Sm) + rcv(Tm) && all === 107833, all);
    // PD-FD-01: Sam £300.00 added to the programme. Was: £733.33 (Amira + Dev).
    setF('fr', 'NV-N1'); ok('FC-D course = the demo programme: £1,033.33', repData('coursewise', 'received') === rcv(A) + rcv(Dv) + rcv(Sm) + rcv(Tm) && rcv(Tm) === 0);
    ok('FC-D the batch list follows the course: the demo batch and "Not batch-specific"', $a('#fcB-fr option').map(o => o.value).join() === ',DEMO-L3-JAN27,' + FC_NB, $a('#fcB-fr option').map(o => o.value).join());
    // PD-FD-01: Sam and Tom in the batch. Was: £733.33 received, £3,666.67 outstanding (Amira + Dev).
    setF('fr', 'NV-N1', 'DEMO-L3-JAN27'); ok('FC-D course + batch: £1,033.33; outstanding £6,966.67', repData('coursewise', 'received') === 103333 && +$1('main .fi-rep').dataset.outstanding === 150000 + 216667 + 150000 + 180000, J([+$1('main .fi-rep').dataset.received, +$1('main .fi-rep').dataset.outstanding]));
    setF('fr', '', FC_NB); ok('FC-D "Not batch-specific": Lena\'s £45.00 only', repData('coursewise', 'received') === 4500);
    setF('fr', 'NV-N1', FC_NB); go('f-reports', { tab: 'coursewise' }); ok('FC-D an empty result says so (no rows invented)', !$1('main .fi-rep') && /No programme, course or bundle has payments for these filters/.test(main()));
    // PD-FD-01: Sam £300.00 added. Was: £733.33.
    setF('fr', 'NV-N1', 'DEMO-L3-JAN27'); ok('FC-D Datewise follows the filters (£1,033.33)', repData('datewise', 'received') === 103333);
    const xn = ($1('main [data-act="aExport"]') || { dataset: {} }).dataset.n || '';
    ok('FC-D the report export names the filters', /course: Level 3 Diploma in Care Practice \(client demo\) \(NV-N1\) · batch: DEMO-L3-JAN27/.test(xn), xn);
    setF('fr', 'SC:SC-01'); ok('FC-D Datewise for the short course: £45.00', repData('datewise', 'received') === 4500);
    go('f-reports', { tab: 'agency' }); ok('FC-D Agency revenue: no course/batch filter, with the reason shown', !$1('#fcC-fr') && /can't be split by course or batch/.test(main()));
    // PD-FD-01: Sam two receipts and Tom awaiting-confirmation row added. Was: 2 rows (Amira, Dev), £733.33.
    setF('fl', 'NV-N1', 'DEMO-L3-JAN27'); go('f-ledger'); const lr = $a('main table tbody tr').map(tr => tr.textContent.replace(/\s+/g, ' '));
    ok('FC-D Ledger course + batch: 5 rows (Amira, Dev, Sam x2, Tom awaiting), £1,033.33', lr.length === 5 && lr.filter(t => /Sam Deposit/.test(t)).length === 2 && lr.filter(t => /Tom Transfer/.test(t) && /Awaiting confirmation/.test(t)).length === 1 && !lr.some(t => /Lena/.test(t)) && +$1('.fc-led-foot').dataset.received === 103333 && +$1('.fc-led-foot').dataset.pending === 10000, J(lr.map(t => t.slice(0, 120))));
    ok('FC-D the Ledger export names the filters', /batch: DEMO-L3-JAN27/.test(($1('main [data-act="aExport"][data-tid="fledger"]') || { dataset: {} }).dataset.n || ''));
    // PD-FD-01: Sam and Tom are in the batch. Was: Amira and Dev only (2 rows).
    setF('fla', 'NV-N1', 'DEMO-L3-JAN27'); go('f-learners'); const la = $a('main table tbody tr').map(tr => tr.textContent);
    ok('FC-D Learner Accounts by batch: Amira, Dev, Sam and Tom only', la.length === 4 && ['Amira', 'Dev Patel', 'Sam Deposit', 'Tom Transfer'].every(n => la.some(t => t.includes(n))) && !/Lena/.test(main()), J(la.map(t => t.replace(/\s+/g, ' ').slice(0, 60))));
    setF('fla', 'SC:SC-01'); go('f-learners'); ok('FC-D Learner Accounts by short course: Lena only', $a('main table tbody tr').length === 1 && /Lena/.test(main()));
    // PD-FD-01: Sam £300.00 added. Was: £733.33.
    SA(); setF('fr', 'NV-N1'); go('a-finance', { tab: 'reports' }); ok('FC-D admin console Reports (Super Admin): the same filters and £1,033.33', !!$1('#fcC-fr') && +$1('main .fi-rep').dataset.received === 103333);
    setF('fl', 'SC:SC-01'); go('a-finance', { tab: 'ledger' }); ok('FC-D admin console ledger: course filter, KPIs follow it (£45.00)', $a('main table tbody tr').length === 1 && /Received£45\.00/.test(main().replace(/\s/g, '')));
    FA(); setF('fr', 'NV-N1'); const before = repData('coursewise', 'received'); rec('CD1|nvq|2', 300); setF('fr', 'NV-N1');
    ok('FC-D no stale totals: a payment recorded under the same filter is in the next figure (+£300.00)', repData('coursewise', 'received') === before + 30000);
    // PD-FD-01: Sam and Tom are on the programme too. Was: rcv(Amira) + rcv(Dev).
    role('bizA'); FA(); setF('fr', 'NV-N1'); ok('FC-D after switching role and back, the figure is recomputed from the records', repData('coursewise', 'received') === rcv(A) + rcv(Dv) + rcv(Sm) + rcv(Tm));
    setF('fr'); setF('fl'); setF('fla');
  });

  /* ================= E: a recorded payment reaches the ledger ================= */
  await T('FC-E recorded payments in the ledger', async () => {
    FA(); const n0 = allTx().length, ref = fiUniqRef('BACS-', 61000, 900); rec('CD1|nvq|3', 300, ref); go('f-ledger');
    const r = rowOf('', ref); ok('FC-E Finance\'s offline payment is a ledger row at once: Amira, £300.00, NVQ programme, DEMO-L3-JAN27', allTx().length === n0 + 1 && r && /Amira/.test(r.textContent) && /£300\.00/.test(r.textContent) && /DEMO-L3-JAN27/.test(r.textContent));
    learner('CD2'); go('payments'); payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '2' } }));
    FA(); go('f-ledger'); ok('FC-E Dev\'s own card payment is a ledger row (Gateway, £433.33)', allTx().filter(t => t.v === 'CD2' && !t.refund).length === 2 && /£433\.33/.test(rowOf('', 'Dev Patel').textContent));
    // PD-FD-01: Tom £100.00 transfer is already awaiting confirmation, so pending is measured from that baseline and the row must be Amira. Was: first Awaiting row, pending >= £300.00, received = Amira + Dev + Lena.
    FA(); go('f-ledger'); const pend0 = +$1('.fc-led-foot').dataset.pending;
    learner('CD1'); go('payments'); ACT.chPayBank({ dataset: { e: 'nvq', n: '4' } }); if (MODAL) press();
    FA(); go('f-ledger'); const aw = $a('main table tbody tr').find(tr => /Awaiting confirmation/.test(tr.textContent) && /Amira/.test(tr.textContent));
    ok('FC-E a bank transfer the learner has notified is listed as Awaiting confirmation — not counted as received', !!aw && pend0 === 10000 && +$1('.fc-led-foot').dataset.pending === pend0 + 30000 && +$1('.fc-led-foot').dataset.received === rcv(A) + rcv(Dv) + rcv(STORE.worlds.CD3) + rcv(Sm), J([pend0, +$1('.fc-led-foot').dataset.pending, +$1('.fc-led-foot').dataset.received]));
    click(aw.querySelector('[data-act="fcAwRec"]')); ok('FC-E its Confirm… opens Record offline payment on that transfer', !!MODAL && /Record offline payment/.test(MODAL.title) && /instalment 4/.test($1('#op-t').selectedOptions[0].textContent));
    $1('#rsn').value = 'confirmed'; press(); ok('FC-E once confirmed it is a receipt (Amira received £1,200.00)', rcv(A) === 120000, rcv(A));
  });

  /* ================= 1/6: the deposit route (net) and the decided deposit credit (gross) ================= */
  await T('FC-1 deposit route: bank transfer pending, confirmed in full only, balance', async () => {
    const p = register('Pia Pend', 'pia.pend@fc.example'); toPayment(p); choose('deposit', 'bank'); click($1('main [data-act="suPay"]')); press();
    ok('FC-1 a pending deposit transfer is not a payment: nothing received, £1,800.00 outstanding', rcv(p) === 0 && fiAcct(p).outstanding === 180000 && pl(p).deposit.status !== 'Paid', fiAcct(p).outstanding);
    FA(); go('f-deposits'); let r = rowOf('', 'Pia Pend'); ok('FC-2 Deposits: Pia — Awaiting confirmation, nothing received yet, batch shown', r && /Awaiting confirmation/.test(r.textContent) && /DEMO-L3-JAN27/.test(r.textContent) && /Not yet/.test(r.textContent));
    // PD-FD-01: the programme deposit is now £100.00 (balance £1,700.00). Was: £300.00 deposit, part £150.00, over £350.00.
    ok('FC-1 the deposit is the programme £100.00 (pinned terms)', P(pl(p).deposit.amount) === 10000 && cb9Pin(p).dep.eff === 100, J(pl(p).deposit));
    ok('FC-1 a part deposit (£50.00) is refused', rec(p.v + '|dep', 50) === false && pl(p).deposit.status !== 'Paid');
    ok('FC-1 more than the deposit (£150.00) is refused', rec(p.v + '|dep', 150) === false && pl(p).deposit.status !== 'Paid');
    const t0 = tgt(p.v + '|dep'); ok('FC-1 the full £100.00 confirms it', rec(p.v + '|dep', 100, p.signup.pay.ref) !== false && pl(p).deposit.status === 'Paid' && rcv(p) === 10000);
    FA(); ok('FC-1 confirming it again is refused (credited once): no target is offered, and the old one is refused', !tgt(p.v + '|dep') && recordPayment(t0, 100, 'BACS-AGAIN-1', 'Bank transfer', 'x') === false && rcv(p) === 10000);
    go('f-deposits'); r = rowOf('', 'Pia Pend'); const rt = r ? r.textContent.replace(/\s+/g, ' ') : '';
    // PD-FD-01: £100.00 deposit, £1,700.00 balance. Was: £300.00 received and credited, £1,500.00 remaining.
    ok('FC-2 Deposits: received £100.00, Confirmed, £100.00 credited to the first payment, £1,700.00 of it remaining', /Confirmed/.test(rt) && /£100\.00[\s\S]*£100\.00[\s\S]*£1,700\.00/.test(rt), rt);
    // PD-FD-01: £100.00 deposit, £1,700.00 balance. Was: £300.00 received, £1,500.00 outstanding.
    ok('FC-1 deposit only: £100.00 received, £1,700.00 outstanding (pence)', rcv(p) === 10000 && due(p) === 170000 && fiAcct(p).outstanding === 170000);
    // PD-FD-01: the balance is £1,700.00. Was: £1,500.00.
    const n = allTx().filter(t => t.v === p.v).length; rec(p.v + '|nvq|1', 1700);
    ok('FC-1 balance £1,700.00 recorded: £1,800.00 received, nothing outstanding, a separate ledger transaction', rcv(p) === 180000 && due(p) === 0 && allTx().filter(t => t.v === p.v).length === n + 1);
    const tx = allTx().filter(t => t.v === p.v && !t.refund); ok('FC-2 the balance is not shown as another deposit', tx.filter(t => /deposit/i.test(t.course)).length === 1, J(tx.map(t => t.course)));
    go('f-deposits'); r = rowOf('', 'Pia Pend'); ok('FC-2 Deposits: first payment Paid, balance paid', r && /Paid/.test(r.textContent) && /Balance paid/.test(r.textContent));
    ok('FC-1 nothing more can be recorded on the balance (no overpayment)', rec(p.v + '|nvq|1', 1) !== true && due(p) === 0 && rcv(p) === 180000);
  });
  await T('FC-1 the decided example: £1,800, £100 deposit, £300 instalment 1, £200 more', async () => {
    const g = gross('Gia Gross', 'gia.gross@fc.example');
    ok('FC-6 before confirmation: instalment 1 £300.00 due, nothing credited, £1,800.00 outstanding', P(fpLedger(pl(g)).outstanding) === 180000 && !P(pl(g).rows[0].credit));
    ok('FC-6 a part deposit is refused', rec(g.v + '|dep', 50) === false);
    rec(g.v + '|dep', 100, 'BACS-DEP-GIA'); const r1 = pl(g).rows[0];
    ok('FC-6 deposit confirmed: £100.00 credited to instalment 1, £200.00 left to pay on it', P(r1.credit) === 10000 && P(r1.amount) - P(r1.paid) === 20000 && r1.status === 'Partially paid', J(r1));
    fpCredit(g, 'retry'); fpCredit(g, 'role switch'); ok('FC-6 crediting again (retry, reload, role switch) changes nothing', P(r1.credit) === 10000 && P(r1.paid) === 10000);
    ok('FC-6 Finance\'s target for instalment 1 is £200.00 (never the whole £300.00)', !!tgt(g.v + '|nvq|1') && P(tgt(g.v + '|nvq|1').due) === 20000);
    ok('FC-6 an overpayment of instalment 1 (£250.00) is refused', rec(g.v + '|nvq|1', 250) === false);
    learner(g.v); go('payments'); let amt0 = null; const co0 = checkout; checkout = o => { amt0 = o.amount; return co0(o); }; try { payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } })); } finally { checkout = co0; }
    ok('FC-6 the learner\'s checkout for instalment 1 is £200.00', P(amt0) === 20000, amt0);
    const L = fpLedger(pl(g));
    ok('FC-6 exactly £300.00 received in total (two payments)', rcv(g) === 30000 && P(L.paid) === 30000, rcv(g) + ' ' + L.paid);
    ok('FC-6 exactly £1,500.00 outstanding; the schedule reconciles', P(L.outstanding) === 150000 && L.ok && fiAcct(g).outstanding === 150000);
    ok('FC-6 instalment 1 is Paid; instalments 2–6 untouched', r1.status === 'Paid' && pl(g).rows.slice(1).every(r => !P(r.paid)));
    const tx = allTx().filter(t => t.v === g.v && !t.refund);
    ok('FC-6 two ledger transactions with their own references; the £200.00 is an instalment, not a deposit', tx.length === 2 && new Set(tx.map(t => t.ref)).size === 2 && tx.some(t => P(t.amount) === 10000 && /deposit/i.test(t.course)) && tx.some(t => P(t.amount) === 20000 && /instalment 1/.test(t.course) && !/deposit/i.test(t.course)), J(tx.map(t => [t.ref, t.amount, t.course])));
    FA(); go('f-deposits'); const r = rowOf('', 'Gia Gross'); ok('FC-2 Deposits lists the example: Confirmed, credited to instalment 1, first payment Paid, no seat hold', r && /Confirmed/.test(r.textContent) && /instalment 1/.test(r.textContent) && /No seat hold/.test(r.textContent), r && r.textContent.replace(/\s+/g, ' '));
    ok('FC-6 Finance and the learner agree (fiAcct received = record)', fiAcct(g).received === rcv(g));
    ok('FC-6 Reports → Deposits counts the £100.00 credit', repData('deposits', 'credited') >= 10000);
    const dt0 = allTx().find(t => t.v === g.v && /deposit/i.test(t.course)); raise(dt0, 100, 'deposit refunded'); FA('FB'); applyDecision(ADMIN.queue[0], 'approve', 'ok');
    const L2 = fpLedger(pl(g));
    ok('FC-6 refunded deposit: no longer credited — instalment 1 has £100.00 to pay again; £1,600.00 outstanding; reconciles', pl(g).deposit.status === 'Refunded' && !P(r1.credit) && P(r1.amount) - P(r1.paid) === 10000 && P(L2.outstanding) === 160000 && L2.ok, J([r1, L2]));
    ok('FC-6 received £300.00, refunded £100.00, net £200.00', rcv(g) === 30000 && refd(g) === 10000);
  });
  await T('FC-1 part refund, and instalment 1 paid before the deposit was confirmed', async () => {
    const h = gross('Hugo Part', 'hugo.part@fc.example'); rec(h.v + '|dep', 100, 'BACS-DEP-HUGO');
    const t = allTx().find(x => x.v === h.v && /deposit/i.test(x.course)); raise(t, 40, 'part'); FA('FB'); applyDecision(ADMIN.queue[0], 'approve', 'ok');
    const L = fpLedger(pl(h)), r1 = pl(h).rows[0];
    ok('FC-6 part-refunded deposit (£40.00 back): only £60.00 stays credited; £1,740.00 outstanding; reconciles', P(r1.credit) === 6000 && P(L.outstanding) === 174000 && L.ok, J([r1, L]));
    const k = gross('Kai Early', 'kai.early@fc.example'); learner(k.v); go('payments'); payCo(() => ACT.payInst({ dataset: { e: 'nvq', n: '1' } }));
    ok('FC-6 instalment 1 paid in full (£300.00) while the deposit was unconfirmed: nothing credited yet', pl(k).rows[0].status === 'Paid' && !P(pl(k).rows[0].credit));
    rec(k.v + '|dep', 100, 'BACS-DEP-KAI'); const L3 = fpLedger(pl(k));
    // PD-FC-12 supersedes PD-FC-03. Was: "the £100.00 credit goes to the next unpaid instalment (2)". Now: the credit is never moved to another
    // instalment without a Finance decision — the paid deposit stays unallocated (it still reduces what is outstanding) and is flagged.
    ok('FC-6 then confirmed: the £100.00 is not moved to instalment 2 — kept unallocated, flagged for Finance review; never an overpayment (PD-FC-12)', P(pl(k).rows[0].paid) === 30000 && !P(pl(k).rows[1].credit) && !P(pl(k).rows[0].credit) && !!pl(k).depReview && P(pl(k).depReview.amount) === 10000 && P(L3.outstanding) === 140000 && L3.ok && rcv(k) === 40000 && STORE.fin.notifs.some(x => /Deposit credit needs Finance review/.test(x.t)), J([pl(k).rows.slice(0, 2), L3, pl(k).depReview]));
  });
  await T('FC-1 seat hold expiry, the same payment twice, multiple enrolments', async () => {
    const hh = register('Hal Hold', 'hal.hold@fc.example'); toPayment(hh); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    // PD-FD-01: the programme deposit is £100.00. Was: £300.00 received.
    ok('FC-1 card deposit: seat reserved, £100.00 received', dpSeat(hh).st === 'reserved' && rcv(hh) === 10000);
    // PD-FD-01: the programme deposit is £100.00. Was: deposit still £300.00 received.
    advance(29); ok('FC-1 hold ended: seat released, no balance can be recorded, deposit still £100.00 received', dpSeat(hh).st === 'released' && !tgt(hh.v + '|nvq|1') && rcv(hh) === 10000);
    FA(); go('f-deposits'); ok('FC-2 Deposits: the released seat\'s first payment is "Not payable"', /Not payable/.test((rowOf('', 'Hal Hold') || {}).textContent || '')); back();
    const ref = allTx().find(t => t.v === 'CD1' && !t.refund).ref; ok('FC-1 the same payment (reference) twice is refused', rec('CD1|nvq|5', 300, ref) === false);
    learner('CD1'); go('payments'); const n = A.tx.length; ACT.payInst({ dataset: { e: 'nvq', n: '1' } }); ok('FC-1 Pay now on a paid instalment opens no checkout', (!MODAL || !/Pay now/.test(MODAL.title || '')) && A.tx.length === n); closeModal();
    const d0 = J([Dv.plans, Dv.tx]);
    const sc = CATALOGUE.find(c => c.kind === 'short'); go('browse'); fxFast(ff => { ACT.buyCourse({ dataset: { id: sc.id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'FC'; }); prim(); } if (MODAL && /Pay now/.test(MODAL.title || '')) { prim(); ff(3000); } closeModal(); });
    const st = A.tx.find(t => /Moving and Handling/.test(t.desc)), sm = st && fcTxMeta({ ...st, v: 'CD1', course: st.desc, payer: VNAME('CD1') });
    ok('FC-1 multiple enrolments: Amira\'s short-course payment is a Short course, not batch-specific; her NVQ payments stay on her batch', !!sm && sm.ctype === 'Short course' && !sm.bk && allTx().filter(t => t.v === 'CD1' && !t.refund && /instalment|NVQ/.test(t.course)).every(t => fcTxMeta(t).bk === 'DEMO-L3-JAN27'), J(sm));
    FA(); setF('fr', 'NV-N1'); const nv = repData('coursewise', 'received'); setF('fr', 'SC:SC-01'); const sh = repData('coursewise', 'received'); setF('fr');
    ok('FC-1 the programme and the short course are reported apart (short course = £90.00)', sh === 9000 && nv > 0, sh);
    ok('FC-1 another learner in the mixed-mode batch (Dev) is untouched by all of this', J([Dv.plans, Dv.tx]) === d0);
    const refs = allTx().filter(t => !t.refund).map(t => t.ref); ok('FC-6 every receipt\'s transaction reference is unique', new Set(refs).size === refs.length);
    const tot = learnerAccounts().reduce((s, v) => s + rcv(STORE.worlds[v]), 0) + (STORE.fin.tx || []).filter(t => !t.refund && ['Paid', 'Refunded', 'Partially refunded'].includes(t.status)).reduce((s, t) => s + P(t.amount), 0);
    ok('FC-6 Finance\'s received total = the sum of every learner\'s own receipts (pence)', fiLedger({}).received === tot, fiLedger({}).received + ' vs ' + tot);
  });

  /* ================= I: who may see and record money ================= */
  await T('FC-I authorisation', async () => {
    const t = tgt('CD2|nvq|3');
    ACA(); ok('FC-I an Academic Admin can\'t record a payment', recordPayment(t, 433.33, 'BACS-FCI1', 'Bank transfer', 'x') === false);
    go('f-ledger'); ok('FC-I an Academic Admin can\'t open the Transaction Ledger', !/TXN-|Lena Hart/.test(main()));
    // PD-FD-01: the starting total received is £1,078.33. Was: £778.33 only.
    go('f-reports', { tab: 'coursewise' }); ok('FC-I … nor Finance Reports', !/£778\.33|£1,078\.33|Moving and Handling People/.test(main()));
    role('bizA'); ok('FC-I a Business Admin can\'t record a payment', recordPayment(t, 433.33, 'BACS-FCI2', 'Bank transfer', 'x') === false);
    learner('CD1'); ok('FC-I a learner can\'t record a payment', recordPayment(t, 433.33, 'BACS-FCI3', 'Bank transfer', 'x') === false); ACT.finOffline({ dataset: {} }); ok('FC-I … nor open Record offline payment', !MODAL || !/Record offline payment/.test(MODAL.title)); closeModal();
    AGY('AG-02'); go('g-purchases'); ok('FC-I the agency portal shows none of the learners\' payments', !/Amira|Dev Patel|Lena Hart|433\.33/.test(main()));
    ok('FC-I Dev\'s instalment 3 is still unpaid', !!tgt('CD2|nvq|3') && !P(tgt('CD2|nvq|3').r.paid));
  });

  /* ================= F/G/H: browser persistence (the refresh itself is in ft-fcp.js) ================= */
  await T('FC-F/G/H persistence in this browser', async () => {
    FA(); render(); ok('FC-F the demo changes are saved in this browser (the copy is the current data)', FCP.st === 'saved' && !!LS() && JSON.parse(LS()).data === FCP.last, FCP.st + ' ' + FCP.why);
    const saved = JSON.parse(LS()); ok('FC-F the saved copy is the client demo, with the demo clock', saved.fx === 'client' && saved.v === FCP_V && typeof saved.clock === 'number');
    ok('FC-F nothing secret-looking is saved (no password / card number / security code keys)', !/\\"(pw|pw2|password|cvc|cvv|cardNumber|otp|secret)\\":/.test(LS()) && !/4242 4242/.test(LS()));
    go('f-ledger'); ok('FC-F the Ledger says it is a prototype copy kept in this browser only', /Prototype only/.test(main()) && /isn't shared with other browsers or devices/.test(main()));
    ACT.fxLegacy(); const k0 = LS(); const c = STORE.worlds.C, cr = c.plans[0].rows.find(r => r.status !== 'Paid'); if (cr) rec('C|' + c.plans[0].e + '|' + cr.n, 10);
    ok('FC-H legacy test data is never saved: the client copy is unchanged', LS() === k0 && FX.mode === 'legacy');
    // PD-FD-01: the starting demo has 5 payments. Was: 3 payments.
    ACT.resetDemo(); ok('FC-G Reset demo: the saved copy is deleted and the starting demo loaded (5 payments, no legacy rows)', !LS() && allTx().length === 5 && !allTx().some(t => /TXN-90011|Gulf Care/.test(t.ref + t.payer)), allTx().length);
    S.drDev = true; FA(); S.drDev = true; rec('CD1|nvq|2', 300); render(); ok('FC-H a change in developer mode is not saved', !LS() && FCP.st === 'paused', FCP.st);
    S.drDev = false; render(); ok('FC-H … nor after leaving developer mode (until Reset)', !LS() && FCP.st === 'paused');
    ACT.resetDemo(); S.drDev = false; FA(); rec('CD1|nvq|2', 300); render(); ok('FC-H after Reset, changes are saved again', !!LS() && FCP.st === 'saved', FCP.st);
    const ls = window.localStorage, sig = JSON.parse(LS()).sig;
    ls.setItem(FCP_KEY, '{not json'); ok('FC-F a corrupt saved copy is discarded with a notice, not loaded', /couldn't be read/.test(fcpRestore() || '') && !LS());
    ls.setItem(FCP_KEY, J({ v: FCP_V, fx: 'client', sig: 'other', data: '{}' })); ok('FC-F a copy from another version is discarded with a notice', /was updated/.test(fcpRestore() || '') && !LS());
    // PD-FD-01: the starting demo has 5 payments. Was: 3.
    ls.setItem(FCP_KEY, J({ v: FCP_V, fx: 'client', sig, data: J({ $i: 0, o: { STORE: { $i: 1, o: {} } } }) })); ok('FC-F an incomplete copy is discarded and the starting demo loaded (5 payments)', /couldn't be restored/.test(fcpRestore() || '') && !LS() && !!STORE.worlds.CD1 && allTx().length === 5, allTx().length);
    const f0 = fcpLS; fcpLS = () => null; try { FA(); rec('CD1|nvq|2', 300); render(); ok('FC-F storage unavailable: it says changes are not kept — never "saved"', FCP.st === 'unavailable' && /lost on refresh/.test(fcpStatusTxt())); } finally { fcpLS = f0; }
    const st0 = window.Storage.prototype.setItem; window.Storage.prototype.setItem = function (k) { if (k === FCP_KEY) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } return st0.apply(this, arguments); };
    try { FA(); rec('CD2|nvq|2', 433.33); render(); ok('FC-F storage full: reported as not saved', FCP.st === 'error' && /full/.test(FCP.why), FCP.st + ' ' + FCP.why); } finally { window.Storage.prototype.setItem = st0; }
    ACT.resetDemo();
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
