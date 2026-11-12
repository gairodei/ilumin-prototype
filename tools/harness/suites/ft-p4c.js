// P4 — deposit cutoff, payment routes and forfeiture behind the inactive REVISED-1 terms, client demo (FIXTURE=client). The revised
// terms are linked only through the isolated test harness (window.ILM_P4_HARNESS on a harness page); ordinary sign-ups stay LEGACY-1.
// Phase 0: London and Dubai batches starting 30 Jan 2027; deadlines fixed at signing; routes A and B by card; bank transfers verified
// with their receipt time (on time but verified later, late, never received, pending across the deadline, duplicate verification);
// forfeiture and release once; a missing time zone; legacy learners, access, P1 / P2 / P3 invariants. Phase 1: a real reload keeps the
// revised records; Reset clears them; a copy saved before P4. Phase 2: that copy restored.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p4c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $$1 = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); window.ILM_P4_HARNESS = true; };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const mk = (code, start, o = {}) => { const s = B(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start, end: new Date(Date.parse(start) + 380 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [] }, o); delete c.tz; delete c.tzHist; ADMIN.batches.push(c); return c; };
  const setTz = (b, tz) => { as('aca'); const r = p2SetTz(b, tz, 'P4C: Academy time zone for this batch'); return r.ok; };
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); };
  const L = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /Lena/.test(w.me.first || ''));
  const fill = () => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d && !d.value) d.value = '1992-02-02'; if (a && !a.value) a.value = '5 Test Road, London'; };
  const pick = code => { const r = $1(`main input[name="su-batch"][value="${code}"]`); if (!r) return false; r.checked = true; INP.suBatch(r); return true; };
  const docsSign = ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); };
  const at = iso => Clock.freeze(iso);
  // Lena signs up on the revised terms (harness link) for a batch, up to the payment step
  const toPay = (code, mode = 'Self-Paced') => { as('short'); apply(mode); const w = L(); const linked = p4HarnessRevise(w, 'P4C fixture'); fill(); pick(code); ACT.suNext(); fxFast(ff => docsSign(ff)); go('admission'); return { w, linked }; };
  const payCard = (choice) => fxFast(ff => { setUi('cb9Pay', choice); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
  const payBank = (choice) => { setUi('cb9Pay', choice); setUi('suMethod', 'bank'); go('admission'); ACT.suPay(); if (MODAL) prim(); closeModal(); };
  const payRow = n => fxFast(ff => { as('short'); go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: String(n) } }); if (MODAL) prim(); ff(3000); closeModal(); });
  const bankRow = n => { as('short'); go('payments'); ACT.chPayBank({ dataset: { e: 'nvq', n: String(n) } }); if (MODAL) prim(); closeModal(); };
  const verify = (ref, yes, ymd, hm, why) => { as('fin'); return p4Verify(ref, { received: yes, ymd, hm, why }); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const seatsJ = () => J(SEATS().recs.map(r => [r.id, r.batch, r.state, r.lid]));
  const LON = '2027-01-30T09:00:00Z';

  if (PH === 0) {
    await T('P4C-A isolation: ordinary sign-ups stay on LEGACY-1', async () => {
      reset(); window.ILM_P4_HARNESS = false; as('short'); apply('Self-Paced'); const w = L();
      ok('P4C-A1 an ordinary sign-up links LEGACY-1; the harness link is refused without the harness flag (logged)', p2Terms(w).policy === 'LEGACY-1' && p4HarnessRevise(w, 'no flag') === false && p2Terms(w).policy === 'LEGACY-1' && aud('Blocked: link revised terms') === 1);
      ok('P4C-A2 REVISED-1 still can\'t be activated by anyone', p2Activate('REVISED-1', 'P4C') === false && p2Active() === 'LEGACY-1');
      fill(); ok('P4C-A3 the legacy sign-up shows no revised-terms panel and keeps the legacy deposit rule', (() => { const r = $1('main input[name="su-batch"]'); if (r) { r.checked = true; INP.suBatch(r); } ACT.suNext(); fxFast(ff => docsSign(ff)); go('admission'); return !$1('main .p4-panel') && !w.signup.p4; })());
      window.ILM_P4_HARNESS = true; ok('P4C-A4 a signed or completed application can\'t be moved to the revised terms', p4HarnessRevise(w, 'after signing') === false && p2Terms(w).policy === 'LEGACY-1');
    });

    await T('P4C-B London: deadlines fixed at signing, route A by card, paid in time', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P4-LON', LON); ok('P4C-B0 the batch gets an explicit Academy time zone', setTz(b, 'Europe/London'));
      const { w, linked } = toPay('P4-LON'); const a = w.signup.p4;
      ok('P4C-B1 the harness links REVISED-1 to a fresh application; deadlines are frozen at signing', !!linked && p2Terms(w).policy === 'REVISED-1' && !!a && Object.isFrozen(a) && a.batch === 'P4-LON' && a.tz === 'Europe/London');
      ok('P4C-B2 30 Jan 2027 start → cutoff 2 Jan, last new deposit 1 Jan; new deposits before 2 Jan 00:00 GMT; first payment before 3 Jan 00:00 GMT', a.startYmd === '2027-01-30' && a.cutoffYmd === '2027-01-02' && a.lastDepositYmd === '2027-01-01' && a.newDepBefore === Date.parse('2027-01-02T00:00:00Z') && a.balBefore === Date.parse('2027-01-03T00:00:00Z'));
      const t = ($1('main .p4-panel') || {}).textContent || '', F = p4Figures(w), M = v => money(v, 'GBP');
      ok('P4C-B3 before paying: deposit, total fee, both routes with the amounts, last deposit day, cutoff, time zone, consequence, no early access', t.includes('Deposit ' + M(F.dep)) && t.includes('total course fee ' + M(F.fee)) && /1 Jan 2027/.test(t) && /2 Jan 2027/.test(t) && /Europe\/London/.test(t) && /Route A/.test(t) && t.includes(M(F.restA)) && /Route B/.test(t) && /forfeited/.test(t) && /doesn't by itself give course access/.test(t), t.slice(0, 300));
      ok('P4C-B3b the amounts reconcile: deposit + remaining tuition = the fee (integer pence)', fpP(F.dep) + fpP(F.restA) === fpP(F.fee) && F.fee === 1800);
      ok('P4C-B4 the deposit options say "by the end of 2 Jan 2027 (Europe/London)", not the payment-time hold', /by the end of 2 Jan 2027 \(Europe\/London\)/.test(main()) && !/28-day seat hold/.test(main()));
      const s0 = SEATS().recs.length; payCard('deposit'); const pl = fpPl(w);
      ok('P4C-B5 route A: deposit taken; one balance row of the remaining tuition, due before the deadline; the seat held once', w.signup.done && pl.plan === 'Deposit and balance' && pl.rows.length === 1 && fpP(pl.rows[0].amount) === fpP(F.restA) &&pl.rows[0].due === '2027-01-03T00:00:00.000Z' && pl.deposit.hold === '2027-01-03T00:00:00.000Z' && SEATS().recs.length === s0 + 1 && dpSeat(w).st === 'reserved');
      as('short'); go('payments'); const d = ($1('main .p4-dates') || {}).textContent || '';
      ok('P4C-B6 after paying: the four dates kept apart (scheduled, deadline, received, verified) with the time zone and a warning', /Scheduled date of payment 1/.test(d) && /Deposit-route deadline/.test(d) && /3 Jan 2027, 00:00 GMT/.test(d) && /Received/.test(d) && /Verified by Finance/.test(d) && /provisional/.test(d), d);
      ok('P4C-B7 the seat sentence names the deadline and the next action', /must be received before 3 Jan 2027, 00:00 GMT/.test(dpSeatTxt(w, 'learner')) && /Next: pay it/.test(dpSeatTxt(w, 'learner')));
      at('2027-01-02T23:59:00Z'); payRow(1);
      ok('P4C-B8 the last minute before the deadline: paid in full, the seat secured; no forfeiture', dpSeat(w).st === 'occupied' && !Object.keys(P4().forf).length && fpPl(w).rows[0].status === 'Paid');
      ok('P4C-B9 integer pence: deposit + balance = the fee exactly', fpP(pl.deposit.amount) + fpP(pl.rows[0].amount) === fpP(1800));
      // P6 (P5 clarification D): the description said "P5 not built"; P5 now decides revised-terms access. Was: !lockFor('assignments') || /Finish your sign-up/.test(title) === false
      ok('P4C-B10 after sign-up the sign-up lock no longer holds the programme pages; any lock is the revised-terms access gate (P5)', (l => !l || (!!l.p5 && !/Finish your sign-up/.test(l.title)))(lockFor('assignments')));
      ok('P4C-B11 P1 invariants hold', seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P4C-C route B, deposit credit and the first late instant', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P4-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P4-LON');
      payCard('dep6'); const pl = fpPl(w), r1 = pl.rows[0];
      ok('P4C-C1 route B: six rows totalling the fee; payment 1 due before the deadline, its schedule kept; the pin carries the deadline', pl.depRoute === 'inst' && pl.rows.length === 6 && pl.rows.reduce((x, r) => x + fpP(r.amount), 0) === fpP(1800) && r1.due === '2027-01-03T00:00:00.000Z' && !!r1.sched && w.signup.pin.dep.hold === '2027-01-03T00:00:00.000Z' && w.signup.pin.rows[0].due === '2027-01-02');
      ok('P4C-C2 the deposit is credited once to payment 1 (never an extra charge); the remainder of payment 1 is what is due by the deadline', fpP(pl.deposit.amount) < fpP(r1.amount) && fpP(r1.paid) === fpP(pl.deposit.amount) && dpSeat(w).st === 'reserved' && fpP(dpSeat(w).due) === fpP(r1.amount) - fpP(pl.deposit.amount), J([r1.amount, r1.paid, pl.deposit.amount, dpSeat(w)]));
      const before = seatsJ(); at('2027-01-03T00:00:00Z'); render(); const f = Object.values(P4().forf)[0];
      ok('P4C-C3 the first late instant (3 Jan 00:00 GMT) with payment 1 unpaid: deposit forfeited once, seat released through the ledger', !!f && f.deposit === pl.deposit.amount && f.batch === 'P4-LON' && !seatActive('P4-LON', w.me.id) && chReleased(w) && pl.deposit.forfeited && pl.deposit.status === 'Paid' && seatsJ() !== before);
      ok('P4C-C4 recorded in Finance and the audit; the original deposit transaction is kept; no refund is created', aud('Deposit forfeited — seat released') === 1 && STORE.fin.notifs.some(n => /Deposit forfeited/.test(n.t)) && w.tx.some(t => t.ref === pl.deposit.ref && t.status === 'Succeeded') && !(STORE.fin.tx || []).some(t => t.refund && t.payer === chFullName(w)));
      const s1 = seatsJ(), n1 = Object.keys(P4().forf).length; render(); dpReconcile(); p4Forfeit(w, dpSeat(w));
      ok('P4C-C5 duplicate forfeiture and duplicate release do nothing', Object.keys(P4().forf).length === n1 && seatsJ() === s1 && aud('Deposit forfeited — seat released') === 1);
      const t0 = w.tx.length; as('short'); go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: '1' } }); closeModal();
      ok('P4C-C6 a payment after the deadline is refused (nothing charged)', w.tx.length === t0);
      ok('P4C-C7 the learner is told the deposit was forfeited and the seat released', /deposit was forfeited under the revised terms/.test(dpSeatTxt(w, 'learner')) && w.notifs.some(n => /reservation has been released/.test(n.title)));
      as('short'); ACT.chSignAgain(); ok('P4C-C8 signing up again needs a new agreement and payment: no instalments-only rule, no reused signature', !w.signup.done && !w.signup.noDeposit && !w.signup.sig && !w.signup.p4 && (w.signup.p4Hist || []).length === 1);
      ok('P4C-C9 invariants', seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P4C-D bank transfers: receipt time decides', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P4-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P4-LON');
      payBank('deposit'); const dref = w.signup.pay.ref, pl = fpPl(w);
      ok('P4C-D1 a bank deposit is a claim awaiting verification; the seat is reserved', pl.deposit.status !== 'Paid' && p4Claims(w).some(c => c.kind === 'deposit' && c.open) && dpSeat(w).st === 'reserved');
      as('fin'); go('f-deposits'); ok('P4C-D2 Finance sees it with its deadline and age, and "Verify bank receipt"', /Revised terms \(test fixture\)/.test(main()) && main().includes(dref) && !!$1(`main [data-act="p4Verify"][data-r="${dref}"]`));
      const t0 = w.tx.length; ACT.finOffline({ dataset: { k: Object.keys(STORE.worlds).find(k => STORE.worlds[k] === w) + '|dep' } });
      ok('P4C-D3 the generic Record offline payment opens the receipt-time verification instead', !!MODAL && /Verify bank receipt/.test(MODAL.title)); closeModal();
      ok('P4C-D4 a direct recordPayment without the receipt time is refused', recordPayment(payTargets().find(t => t.dep && t.v && STORE.worlds[t.v] === w), 300, 'X-1', 'Bank transfer') === false && w.tx.length === t0);
      ok('P4C-D5 a learner can\'t verify (logged)', (as('short'), p4Verify(dref, { received: true, ymd: '2026-12-21', hm: '10:00' }).denied === true));
      at('2026-12-28T10:00:00Z'); const v1 = verify(dref, true, '2026-12-21', '11:30');
      ok('P4C-D6 received before the last deposit day ended, verified a week later: on time; the deposit counts', v1.ok && v1.state === 'verified-timely' && pl.deposit.status === 'Paid' && P4().ver[dref].receivedAt === '2026-12-21T11:30:00.000Z');
      ok('P4C-D7 duplicate verification changes nothing', verify(dref, true, '2026-12-21', '11:30').dup === true);
      at('2027-01-02T20:00:00Z'); bankRow(1); const c1 = p4Claims(w).find(c => c.kind === 'first');
      ok('P4C-D8 the balance sent by transfer at 20:00 on the cutoff day is a claim', !!c1 && c1.open);
      at('2027-01-05T10:00:00Z'); render();
      ok('P4C-D9 the deadline passes with it unverified: pending reconciliation — no release, no forfeiture', dpSeat(w).st === 'pending' && seatActive('P4-LON', w.me.id) && !Object.keys(P4().forf).length && /awaits verification by Finance/.test(dpSeatTxt(w)));
      as('fin'); go('f-deposits'); ok('P4C-D10 Finance sees it as pending reconciliation, with its age', /Pending reconciliation — deadline passed/.test(main()));
      const v2 = verify(c1.ref, true, '2027-01-02', '23:00'); render();
      ok('P4C-D11 received 23:00 on the cutoff day, verified 5 Jan: on time — paid, the seat secured, nothing forfeited', v2.ok && v2.state === 'verified-timely' && dpSeat(w).st === 'occupied' && !Object.keys(P4().forf).length);
      as('short'); go('payments'); const d = ($1('main .p4-dates') || {}).textContent || '';
      ok('P4C-D12 the learner sees when it was received and when Finance verified it', /2 Jan 2027, 23:00 GMT/.test(d) && /5 Jan 2027/.test(d), d);
    });

    await T('P4C-E late, never received, and the Dubai batch', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P4-LON', LON); setTz(b, 'Europe/London'); const { w } = toPay('P4-LON'); payCard('deposit');
      at('2027-01-02T21:00:00Z'); bankRow(1); const c = p4Claims(w).find(x => x.kind === 'first');
      at('2027-01-06T10:00:00Z'); const v = verify(c.ref, true, '2027-01-03', '09:00'); render();
      ok('P4C-E1 sent before the cutoff but received after it: late — a Finance exception, not applied; the deposit forfeited and the seat released', v.state === 'verified-late' && P4().exc.length === 1 && P4().exc[0].state === 'Finance review' && fpPl(w).rows[0].status !== 'Paid' && Object.values(P4().forf).length === 1 && !seatActive('P4-LON', w.me.id));
      reset(); at('2026-12-20T10:00:00Z'); const b2 = mk('P4-LON', LON); setTz(b2, 'Europe/London'); const o = toPay('P4-LON'); payCard('deposit');
      at('2027-01-02T21:00:00Z'); bankRow(1); const c2 = p4Claims(o.w).find(x => x.kind === 'first');
      at('2027-01-10T10:00:00Z'); render(); ok('P4C-E2 never received: pending until Finance decides', dpSeat(o.w).st === 'pending');
      ok('P4C-E3 not received needs a reason', verify(c2.ref, false, '', '', '').ok === false);
      const v2 = verify(c2.ref, false, '', '', 'No credit on the statement'); render();
      ok('P4C-E4 recorded as not received → the deposit forfeited and the seat released', v2.state === 'not-received' && Object.values(P4().forf).length === 1 && !seatActive('P4-LON', o.w.me.id));
      reset(); at('2026-12-20T10:00:00Z'); const dx = mk('P4-DXB', LON); setTz(dx, 'Asia/Dubai'); const q = toPay('P4-DXB'); const a = q.w.signup.p4;
      ok('P4C-E5 Dubai: the same dates; the first payment before 2 Jan 2027 20:00 UTC', a.cutoffYmd === '2027-01-02' && a.balBefore === Date.parse('2027-01-02T20:00:00Z') && a.newDepBefore === Date.parse('2027-01-01T20:00:00Z'));
      at('2027-01-01T19:59:00Z'); go('admission'); ok('P4C-E6 the last deposit minute (1 Jan 23:59 Dubai) still offers the deposit', !!$1('main input[name="cb9-pay"][value="deposit"]'));
      at('2027-01-01T20:00:00Z'); go('admission'); ok('P4C-E7 the first disallowed instant (2 Jan 00:00 Dubai): no deposit option; the reason is shown', !$1('main input[name="cb9-pay"][value="deposit"]') && /last day for a new deposit/.test(main()));
      const t0 = q.w.tx.length; ok('P4C-E8 a direct completion with a deposit is refused then (logged; nothing charged)', chComplete(q.w, { opt: 'deposit', method: 'card', amount: 300, ref: 'P4-X' }, true) === false && q.w.tx.length === t0 && aud('Blocked: revised-terms deposit') >= 1);
    });

    await T('P4C-F time zone, U-13, rescheduling, legacy and isolation of the clocks', async () => {
      reset(); at('2026-12-20T10:00:00Z'); const b = mk('P4-NOTZ', LON); const { w } = toPay('P4-NOTZ');
      ok('P4C-F1 no explicit time zone: no deadlines frozen, no deposit option, the reason shown (the P2 fallback isn\'t used)', !w.signup.p4 && !$1('main input[name="cb9-pay"][value="deposit"]') && /no Academy time zone configured/.test(main()));
      as('aca'); go('a-batches', { id: 'P4-NOTZ' }); ok('P4C-F2 the administrator sees the actionable reason on the batch', /can't take a deposit/.test(main()) && /Set time zone/.test(main()));
      reset(); at('2026-12-20T10:00:00Z'); const b2 = mk('P4-LON', LON); setTz(b2, 'Europe/London'); const o = toPay('P4-LON');
      const P = o.w.signup.plan, keep = P; o.w.signup.plan = { ...P, cb8: { ...P.cb8, dep: { ...P.cb8.dep, eff: 500 } } }; go('admission');
      // (this fixture's pin disagrees with the approved package, so FB1's own guard also withholds the deposit route on the page)
      ok('P4C-F3 U-13: a deposit larger than payment 1 can\'t be combined with instalments (fails closed, the reason given); no enabled option offers it', fcDIOpts(o.w).every(x => /more than payment 1/.test(x.why)) && /* the panel's figures for an unsigned application (once signed, the deposit is the frozen one) */ p4Figures({ ...o.w, signup: { ...o.w.signup, p4: null } }).B.every(x => x.over) && /not available \(the deposit is more than payment 1/.test(p4PayPanel({ ...o.w, signup: { ...o.w.signup, p4: null } })) &&!$1('main input[name="cb9-pay"][value="dep6"]:not([disabled])'), J([fcDIOpts(o.w).map(x => [x.k, x.dep, x.why]), cb9DepOk(o.w), $$1('main input[name="cb9-pay"]').map(x => x.value + (x.disabled ? '!' : ''))]));
      o.w.signup.plan = keep; payCard('deposit'); const a0 = J(o.w.signup.p4), h0 = fpPl(o.w).deposit.hold;
      b2.start = '2027-02-27T09:00:00Z'; as('aca'); p2SetTz(b2, 'Asia/Dubai', 'P4C: zone changed after signing'); render();
      ok('P4C-F4 batch rescheduled and its time zone changed after signing: the signed deadlines and the hold don\'t move', J(o.w.signup.p4) === a0 && fpPl(o.w).deposit.hold === h0);
      const f0 = p4Now(); STORE.agy = STORE.agy || {}; STORE.agy.offset = 30; const wp0 = STORE.wpc && STORE.wpc.offset;
      ok('P4C-F5 the agency simulated date doesn\'t move the deposit clock', p4Now() === f0); STORE.agy.offset = 0;
      const sam = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(x => x && x.me && /^Sam/.test(x.me.first || ''));
      ok('P4C-F6 the legacy demo learners stay on LEGACY-1 with their payment-time holds', !!sam && p2Terms(sam).policy === 'LEGACY-1' && !sam.signup.p4 && !p4Rev(sam));
      ok('P4C-F7 P3: after signing, another batch would need a new agreement (not offered)', /new agreement/.test(p3Why(o.w, mk('P4-OTHER', '2027-02-20T09:00:00Z'))));
      ok('P4C-F8 warning state: bands from the time left, marked provisional (U-03)', p4Warn(Date.parse('2027-01-03T00:00:00Z'), Date.parse('2027-01-02T12:00:00Z')).key === 'today' && p4Warn(Date.parse('2027-01-03T00:00:00Z'), Date.parse('2026-12-20T00:00:00Z')).key === 'upcoming' && /U-03/.test(p4Warn(0, 1).provisional));
      ok('P4C-F9 the audit keeps the revised-terms trail', aud('Revised terms linked (test harness)') >= 1 && aud('Revised-terms deadlines fixed') >= 1 && aud('Deposit-route deadline applied (revised terms)') >= 1);
      SS.setItem(K + 'lena', J([o.w.signup.p4, fpPl(o.w).deposit.hold, o.w.signup.termsRef]));
    });
    Clock.unfreeze(); next(1); return;
  }

  if (PH === 1) {
    await T('P4C-G reload, Reset, a copy saved before P4', async () => {
      window.ILM_P4_HARNESS = true; const w = L(), [a, hold, ref] = JSON.parse(SS.getItem(K + 'lena'));
      ok('P4C-G1 after a real reload: the frozen deadlines, the hold and the REVISED-1 link are the same', J(w.signup.p4) === J(a) && fpPl(w).deposit.hold === hold && w.signup.termsRef === ref && p2Terms(w).policy === 'REVISED-1');
      reset(); ok('P4C-G2 Reset: no revised records remain', !TERMS().p4 && !(L().signup && L().signup.p4) && p2TermsAll().every(t => t.policy === 'LEGACY-1'));
      const keep = STORE.terms; STORE.terms = { v: 1, seq: keep.seq, links: keep.links, log: keep.log }; render(); SS.setItem(K + 'start', J(p2TermsAll().map(t => t.policy)));
    });
    next(2); return;
  }

  if (PH === 2) {
    await T('P4C-H a copy saved before P4', async () => {
      ok('P4C-H1 restored as before (no P4 records), everyone on LEGACY-1', !(STORE.terms && STORE.terms.p4) && J(p2TermsAll().map(t => t.policy)) === SS.getItem(K + 'start'));
      reset(); ok('P4C-H2 Reset afterwards: the starting demo, invariants hold', seatInvariants().length === 0);
    });
  }

  Clock.unfreeze(); window.ILM_P4_HARNESS = false;
  ['phase', 'R', 'lena', 'start'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
