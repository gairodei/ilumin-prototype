// P4 — deposit cutoff calculations and legacy isolation, legacy fixture. Calendar vectors in London and Dubai (30 Jan 2027, DST start
// and end, leap year, year boundary), the exclusive boundaries, a batch without a time zone, the receipt-time conversion, the warning
// bands; and that legacy learners, the legacy deposit rule and the payment-time hold are untouched (no REVISED-1 link anywhere).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const bt = (start, tz) => ({ code: 'P4-T', start, tz });
  const U = s => Date.parse(s);

  await T('P4-A cutoff vectors', async () => {
    fresh(); const L = p4Cut(bt('2027-01-30T09:00:00Z', 'Europe/London')), D = p4Cut(bt('2027-01-30T09:00:00Z', 'Asia/Dubai'));
    ok('P4-A1 London, start 30 Jan 2027: cutoff 2 Jan, last deposit 1 Jan', L.cutoffYmd === '2027-01-02' && L.lastDepositYmd === '2027-01-01' && L.startYmd === '2027-01-30');
    ok('P4-A2 London: new deposits before 2 Jan 00:00 GMT; first payment before 3 Jan 00:00 GMT (exclusive)', L.newDepBefore === U('2027-01-02T00:00:00Z') && L.balBefore === U('2027-01-03T00:00:00Z'));
    ok('P4-A3 Dubai: before 1 Jan 20:00 UTC and 2 Jan 20:00 UTC', D.newDepBefore === U('2027-01-01T20:00:00Z') && D.balBefore === U('2027-01-02T20:00:00Z'));
    ok('P4-A4 last allowed / first disallowed deposit instant; last allowed / first late balance instant', U('2027-01-01T23:59:59.999Z') < L.newDepBefore && !(U('2027-01-02T00:00:00Z') < L.newDepBefore) && U('2027-01-02T23:59:59.999Z') < L.balBefore && !(U('2027-01-03T00:00:00Z') < L.balBefore));
    const s1 = p4Cut(bt('2027-04-25T09:00:00Z', 'Europe/London')); // cutoff 28 Mar 2027 = the day UK clocks go forward
    ok('P4-A5 London DST start: cutoff 28 Mar 2027 (23-hour day); the first payment before 29 Mar 00:00 BST = 28 Mar 23:00 UTC', s1.cutoffYmd === '2027-03-28' && s1.balBefore === U('2027-03-28T23:00:00Z') && s1.newDepBefore === U('2027-03-28T00:00:00Z'));
    const s2 = p4Cut(bt('2027-11-28T09:00:00Z', 'Europe/London')); // cutoff 31 Oct 2027 = the day UK clocks go back
    ok('P4-A6 London DST end: cutoff 31 Oct 2027 (25-hour day); before 1 Nov 00:00 GMT; new deposits before 30 Oct 23:00 UTC', s2.cutoffYmd === '2027-10-31' && s2.balBefore === U('2027-11-01T00:00:00Z') && s2.newDepBefore === U('2027-10-30T23:00:00Z'));
    const lp = p4Cut(bt('2028-03-27T09:00:00Z', 'Europe/London')); // 27 Mar 2028 − 28 days crosses 29 Feb 2028
    ok('P4-A7 leap year: start 27 Mar 2028 → cutoff 28 Feb 2028, last deposit 27 Feb', lp.cutoffYmd === '2028-02-28' && lp.lastDepositYmd === '2028-02-27');
    const lp2 = p4Cut(bt('2028-03-28T09:00:00Z', 'Europe/London'));
    ok('P4-A8 leap day as the cutoff: start 28 Mar 2028 → cutoff 29 Feb 2028', lp2.cutoffYmd === '2028-02-29' && lp2.lastDepositYmd === '2028-02-28');
    const yb = p4Cut(bt('2027-01-15T09:00:00Z', 'Europe/London'));
    ok('P4-A9 year boundary: start 15 Jan 2027 → cutoff 18 Dec 2026, last deposit 17 Dec 2026', yb.cutoffYmd === '2026-12-18' && yb.lastDepositYmd === '2026-12-17');
    const late = p4Cut(bt('2027-01-30T23:30:00Z', 'Europe/London')), dub = p4Cut(bt('2027-01-30T21:00:00Z', 'Asia/Dubai'));
    ok('P4-A10 the start date is the batch-local date (23:30 GMT is still 30 Jan in London; 21:00 UTC is 31 Jan in Dubai)', late.startYmd === '2027-01-30' && dub.startYmd === '2027-01-31' && dub.cutoffYmd === '2027-01-03');
    ok('P4-A11 calendar days, not 28 × 24 hours: the London DST-start cutoff is 27 × 24 + 23 hours before the start day', (dayStart('2027-04-25', 'Europe/London') - dayStart(s1.cutoffYmd, 'Europe/London')) === (28 * 24 - 1) * 36e5);
  });

  await T('P4-B time zone required, receipt time, warnings', async () => {
    const n = p4Cut({ code: 'P4-N', start: '2027-01-30T09:00:00Z' });
    ok('P4-B1 a batch without a configured time zone: no deadlines; the reason names U-04 (the P2 fallback isn\'t used)', !!n.why && n.tzMissing && /U-04/.test(n.why) && batchTz({}).source === 'compat');
    ok('P4-B2 receipt time in the batch zone: 2 Jan 23:00 London = 23:00 UTC; 2 Jan 23:00 Dubai = 19:00 UTC; summer London = UTC+1', p4LocalMs('2027-01-02', '23:00', 'Europe/London') === U('2027-01-02T23:00:00Z') && p4LocalMs('2027-01-02', '23:00', 'Asia/Dubai') === U('2027-01-02T19:00:00Z') && p4LocalMs('2027-06-01', '12:00', 'Europe/London') === U('2027-06-01T11:00:00Z'));
    ok('P4-B3 an invalid or non-existent local time is refused (a bad date, 24:00, the skipped DST hour 01:30 on 28 Mar 2027)', !Number.isFinite(p4LocalMs('2027-02-30', '10:00', 'Europe/London')) && !Number.isFinite(p4LocalMs('2027-01-02', '24:00', 'Europe/London')) && !Number.isFinite(p4LocalMs('2027-03-28', '01:30', 'Europe/London')));
    const d = U('2027-01-03T00:00:00Z');
    ok('P4-B4 warning bands follow the time left (provisional, U-03)', p4Warn(d, d - 10 * 864e5).key === 'upcoming' && p4Warn(d, d - 5 * 864e5).key === 'soon' && p4Warn(d, d - 2 * 864e5).key === 'urgent' && p4Warn(d, d - 3600e3).key === 'today' && p4Warn(d, d).key === 'late');
  });

  await T('P4-C legacy isolation', async () => {
    fresh(); const keys = Object.keys(STORE.worlds), before = J(keys.map(k => { const w = STORE.worlds[k]; return [k, w.signup && w.signup.pin, (w.plans || []).map(p => p.deposit && p.deposit.hold), w.admission && w.admission.deposit]; }));
    ok('P4-C1 every learner resolves to LEGACY-1; nobody has revised deadlines', p2TermsAll().every(t => t.policy === 'LEGACY-1') && keys.every(k => !p4Rev(STORE.worlds[k]) && !(STORE.worlds[k].signup || {}).p4));
    learner('B'); go('admission'); render(); const b = chBatch(W.signup.batch);
    ok('P4-C2 a legacy in-progress application keeps the legacy deposit rule (rounded days, CH-10) and gets no revised panel', chDepositOk(b) === (daysTo(b.start) >= CH_HOLD_DAYS) && !document.querySelector('main .p4-panel'));
    ok('P4-C3 legacy records unchanged by P4 being loaded and screens drawn', J(keys.map(k => { const w = STORE.worlds[k]; return [k, w.signup && w.signup.pin, (w.plans || []).map(p => p.deposit && p.deposit.hold), w.admission && w.admission.deposit]; })) === before);
    ok('P4-C4 the harness link is refused here (no harness flag): nothing changes, the refusal is logged', p4HarnessRevise(W, 'legacy fixture') === false && p2Terms(W).policy === 'LEGACY-1' && ADMIN.audit.some(a => a.action === 'Blocked: link revised terms'));
    ok('P4-C5 REVISED-1 still can\'t be activated', p2Activate('REVISED-1', 'P4') === false && p2Active() === 'LEGACY-1');
    ok('P4-C6 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
