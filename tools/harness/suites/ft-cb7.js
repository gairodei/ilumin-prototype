// CB7 — Duration-based schedule engine (approved plan section C; PD-CB-08, PD-CB-44…47). Pure date and amount functions: every
// approved test vector, month-end and leap-year cases, k > T refused, duplicate dates refused, the total equals the fee to the penny
// for every count across random fees, the same inputs always give the same output, and nothing stored is read or changed.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const J = o => JSON.stringify(o);
  const M = n => ({ n, unit: 'months' }), Y = n => ({ n, unit: 'years' }), Wk = n => ({ n, unit: 'weeks' }), Dy = n => ({ n, unit: 'days' });
  // a fixed pseudo-random sequence, so every run checks the same cases
  let seed = 20261021; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  /* ================= A. The approved test vectors ================= */
  await T('CB7-A vectors', async () => {
    const V = [
      ['2027-02-01', M(6), 3, 'every 2 months', '2027-02-01 2027-04-01 2027-06-01', 'months'],
      ['2027-01-31', M(6), 6, 'monthly, month-end clamp', '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30', 'months'],
      ['2028-02-29', M(12), 4, 'every 3 months (leap anchor)', '2028-02-29 2028-05-29 2028-08-29 2028-11-29', 'months'],
      ['2028-02-29', Y(2), 4, 'every 6 months over 2 years', '2028-02-29 2028-08-29 2029-02-28 2029-08-29', 'months'],
      ['2027-02-01', M(6), 4, 'days: T = 181', '2027-02-01 2027-03-18 2027-05-02 2027-06-16', 'days', 181],
      ['2027-09-01', M(12), 5, 'days: T = 366 (includes 29 Feb 2028)', '2027-09-01 2027-11-13 2028-01-25 2028-04-07 2028-06-19', 'days', 366],
      ['2027-03-01', Wk(10), 3, 'days: T = 70', '2027-03-01 2027-03-24 2027-04-16', 'days', 70],
      ['2027-03-01', Dy(90), 6, 'days: every 15', '2027-03-01 2027-03-16 2027-03-31 2027-04-15 2027-04-30 2027-05-15', 'days', 90],
      ['2027-05-17', M(6), 1, 'pay in full: the anchor only', '2027-05-17', 'full']];
    V.forEach(([a, d, k, what, exp, kind, t]) => { const r = cbSchedDates(a, d, k); ok(`CB7-A ${a} · ${d.n} ${d.unit} · ${k} payments (${what})`, !r.why && r.dates.join(' ') === exp && r.kind === kind && (t == null || r.T === t), r.why || (r.dates || []).join(' ') + ' ' + r.kind + ' T=' + r.T); });
    // amount vectors (E1 rounding through the engine)
    const a1 = cbSched('2027-02-01', M(6), 1800, 7), a2 = cbSched('2027-02-01', M(6), 2350, 3), a3 = cbSched('2027-02-01', M(6), 2400, 6);
    ok('CB7-A £1,800 × 7 → 6 × £257.14 + £257.16', J(a1.rows.map(r => r.amount)) === J([257.14, 257.14, 257.14, 257.14, 257.14, 257.14, 257.16]) && a1.total === 1800 && cbAmtTxt(1800, 7) === '6 × £257.14 + £257.16');
    ok('CB7-A £2,350 × 3 → £783.33, £783.33, £783.34', J(a2.rows.map(r => r.amount)) === J([783.33, 783.33, 783.34]) && a2.total === 2350);
    ok('CB7-A £2,400 × 6 → 6 × £400.00', a3.rows.every(r => r.amount === 400) && a3.rows.length === 6 && cbAmtTxt(2400, 6) === '6 × £400.00');
    ok('CB7-A pay in full: one row, the whole fee, due on the anchor', J(cbSched('2027-05-17', M(6), 2400, 1).rows) === J([{ n: 1, due: '2027-05-17', amount: 2400, pence: 240000 }]));
    ok('CB7-A the schedule records the rule that made it (CB-SCHED-1)', a1.rule === CB_SCHED_RULE && CB_SCHED_RULE === 'CB-SCHED-1');
  });

  /* ================= B. Month-end and leap years ================= */
  await T('CB7-B month-end and leap years', async () => {
    const m12 = cbSchedDates('2027-01-31', M(12), 12).dates;
    ok('CB7-B 31 Jan, 12 monthly: every date is the 31st or its month\'s last day — no drift (31 Jan → 28 Feb → 31 Mar)', m12.join(' ') === '2027-01-31 2027-02-28 2027-03-31 2027-04-30 2027-05-31 2027-06-30 2027-07-31 2027-08-31 2027-09-30 2027-10-31 2027-11-30 2027-12-31', m12.join(' '));
    ok('CB7-B 31 Jan 2028 (leap year), monthly: 29 Feb', cbSchedDates('2028-01-31', M(2), 2).dates[1] === '2028-02-29');
    ok('CB7-B 30 Nov, 4 months every month: 30 Dec, 30 Jan, 28 Feb', cbSchedDates('2026-11-30', M(4), 4).dates.join(' ') === '2026-11-30 2026-12-30 2027-01-30 2027-02-28');
    ok('CB7-B 29 Feb anchor, 4 years yearly: 28 Feb in common years, 29 Feb in 2032', cbSchedDates('2028-02-29', Y(4), 4).dates.join(' ') === '2028-02-29 2029-02-28 2030-02-28 2031-02-28');
    ok('CB7-B course end: 6 months from 31 Aug is 28 Feb; 1 year from 29 Feb 2028 is 28 Feb 2029; 10 weeks = 70 days', cbAddDur('2026-08-31', M(6)) === '2027-02-28' && cbAddDur('2028-02-29', Y(1)) === '2029-02-28' && cbDaysBetween('2027-03-01', cbAddDur('2027-03-01', Wk(10))) === 70);
    ok('CB7-B days across the clock change (last Sunday of March / October) are whole calendar days', cbAddDays('2027-03-27', 1) === '2027-03-28' && cbAddDays('2027-03-28', 1) === '2027-03-29' && cbAddDays('2027-10-30', 2) === '2027-11-01' && cbDaysBetween('2027-03-01', '2027-04-01') === 31);
    ok('CB7-B days rule across 29 Feb 2028 counts it: 2028-02-01 + 1 month, 2 payments → T = 29', cbSchedDates('2028-02-01', M(1), 2).T === 29 && cbSchedDates('2028-02-01', M(1), 2).dates[1] === '2028-02-15');
    ok('CB7-B calendar dates are shown the same in every time zone ("1 Feb 2027", not the day before)', cbFd('2027-02-01') === '1 Feb 2027' && cbFd('2027-09-30') === '30 Sep 2027' && cbFd('bad') === '—');
  });

  /* ================= C. Refusals: k > T, duplicates, invalid inputs ================= */
  await T('CB7-C refusals', async () => {
    const r1 = cbSchedDates('2027-03-01', Dy(5), 6);
    ok('CB7-C (negative) 6 payments in 5 days: refused with the reason (two payments on one day)', !!r1.why && !r1.dates && /same day/.test(r1.why), r1.why);
    ok('CB7-C (negative) 22 payments in 3 weeks (21 days): refused; 21 accepted, one a day', !!cbSchedDates('2027-03-01', Wk(3), 22).why && cbSchedDates('2027-03-01', Wk(3), 21).dates.length === 21 && new Set(cbSchedDates('2027-03-01', Wk(3), 21).dates).size === 21);
    ok('CB7-C (negative) 2 payments in 1 day: refused; 1 payment (in full) accepted', !!cbSchedDates('2027-03-01', Dy(1), 2).why && !cbSchedDates('2027-03-01', Dy(1), 1).why);
    ok('CB7-C (negative) counts outside 1–24, or not whole: refused', [0, 25, -1, 1.5, NaN, '6', null].every(k => !!cbSchedDates('2027-03-01', M(12), k).why));
    ok('CB7-C (negative) invalid anchors (30 Feb, a date-time, text): refused', ['2027-02-30', '2027-13-01', '2027-02-01T00:00:00Z', 'soon', ''].every(a => !!cbSchedDates(a, M(6), 3).why));
    ok('CB7-C (negative) invalid durations (0, 1000, fractions, unknown unit, none): refused', [Dy(0), M(1000), { n: 1.5, unit: 'months' }, { n: 6, unit: 'fortnights' }, null].every(d => !!cbSchedDates('2027-03-01', d, 2).why));
    ok('CB7-C (negative) amounts: a fee that can\'t be split (£0.05 into 6), a zero or fractional-penny fee: refused', !!cbSched('2027-03-01', M(6), 0.05, 6).why && !!cbSched('2027-03-01', M(6), 0, 1).why && !!cbSched('2027-03-01', M(6), 100.005, 2).why);
    ok('CB7-C checking without a batch (cbOptWhy) agrees: 22 in 3 weeks refused, 24 in 1 month accepted, 24 in 24 days accepted', !!cbOptWhy(Wk(3), 22) && cbOptWhy(M(1), 24) === '' && cbOptWhy(Dy(24), 24) === '' && !!cbOptWhy(Dy(23), 24));
  });

  /* ================= D. Properties over many inputs ================= */
  await T('CB7-D properties', async () => {
    let n = 0, bad = [], dup = 0, refusedMonths = 0;
    for (let i = 0; i < 3000; i++) {
      const anchor = cbAddDays('2026-01-01', ri(0, 2200)), u = CB_UNITS[ri(0, 3)], dur = { n: u === 'days' ? ri(1, 400) : u === 'weeks' ? ri(1, 60) : u === 'months' ? ri(1, 36) : ri(1, 3), unit: u }, k = ri(1, 24);
      const r = cbSchedDates(anchor, dur, k), end = cbAddDur(anchor, dur);
      if (r.why) { if (u === 'months' || u === 'years') refusedMonths++; const T_ = cbDaysBetween(anchor, end); if (!(k > T_)) bad.push(`${anchor} ${dur.n} ${u} ${k}: refused although k ≤ T`); continue; }
      n++;
      if (r.dates[0] !== anchor) bad.push(`${anchor} ${dur.n} ${u} ${k}: payment 1 not on the anchor`);
      if (r.dates.length !== k) bad.push(`${anchor} ${dur.n} ${u} ${k}: wrong number of dates`);
      if (r.dates.some((x, j) => j && x <= r.dates[j - 1])) bad.push(`${anchor} ${dur.n} ${u} ${k}: not strictly increasing`);
      if (r.dates.some(x => x < anchor || x >= end)) bad.push(`${anchor} ${dur.n} ${u} ${k}: a date outside [start, end)`);
      if (new Set(r.dates).size !== k) dup++;
      if (r.kind === 'months') r.dates.forEach((x, j) => { const want = cbAddMonths(anchor, j * r.step); if (x !== want) bad.push(`${anchor}: month ${j} drifted`); });
      if (r.kind === 'days') r.dates.forEach((x, j) => { if (cbDaysBetween(anchor, x) !== Math.floor(j * r.T / k)) bad.push(`${anchor}: day ${j} isn't floor(i·T/k)`); });
    }
    ok('CB7-D 3,000 random schedules: payment 1 on the start; k dates, strictly increasing, all in [start, course end); months from the anchor; days = floor(i·T/k)', !bad.length && n > 2000, bad.slice(0, 3).join(' | ') + ` (${n} valid)`);
    ok('CB7-D no valid schedule ever has two payments on one day; durations in months or years are never refused for 1–24 payments', dup === 0 && refusedMonths === 0, `dup ${dup}, refused ${refusedMonths}`);
    let sumBad = 0, cnt = 0;
    for (let i = 0; i < 4000; i++) { const fee = ri(1, 10000000) / 100, k = ri(1, 24), s = cbSched('2027-02-01', M(12), fee, k); if (s.why) { if (e1SchedP(fee, k)) sumBad++; continue; } cnt++; const p = s.rows.reduce((a, r) => a + r.pence, 0); if (p !== Math.round(fee * 100) || s.rows.some(r => r.pence <= 0 || !Number.isInteger(r.pence)) || s.rows.slice(0, -1).some(r => r.pence !== s.rows[0].pence)) sumBad++; }
    ok('CB7-D 4,000 random fees £0.01–£100,000 × 1–24 payments: integer pence, all but the last equal, the total equals the fee exactly', sumBad === 0 && cnt > 3500, `${sumBad} bad of ${cnt}`);
    const same = [['2027-01-31', M(6), 2350, 6], ['2027-09-01', M(12), 1800, 7], ['2028-02-29', Y(2), 999.99, 4]].every(([a, d, f, k]) => J(cbSched(a, d, f, k)) === J(cbSched(a, d, f, k)) && J(cbSched(a, { ...d }, f, k)) === J(cbSched(a, d, f, k)));
    ok('CB7-D the same inputs always give the same output', same);
    ok('CB7-D weeks and days: when the count divides the duration exactly, the gaps are equal (90 days / 6 → 15; 12 weeks / 4 → 21)', cbGaps(Dy(90), 6).join() === '15,15' && cbGaps(Wk(12), 4).join() === '21,21');
  });

  /* ================= E. Rules in words and due points ================= */
  await T('CB7-E rules in words', async () => {
    ok('CB7-E "Every 2 months from batch start" · "Monthly from batch start" · "Paid in full at batch start"', cbRuleTxt(M(6), 3) === 'Every 2 months from batch start' && cbRuleTxt(M(6), 6) === 'Monthly from batch start' && cbRuleTxt(M(6), 1) === 'Paid in full at batch start');
    ok('CB7-E a duration that doesn\'t divide states the day range over every possible start ("Every 45–46 days")', cbRuleTxt(M(6), 4) === 'Every 45–46 days from batch start' && cbRuleTxt(Dy(90), 6) === 'Every 15 days from batch start', cbRuleTxt(M(6), 4));
    ok('CB7-E relative due points: "Batch start · +2 months · +4 months"; days for the example start', cbPointsTxt(M(6), 3) === 'Batch start · +2 months · +4 months' && cbPointsTxt(M(6), 4, '2027-02-01') === 'Batch start · +45 days · +90 days · +135 days');
    ok('CB7-E years use months: 2 years in 4 → every 6 months', cbRuleTxt(Y(2), 4) === 'Every 6 months from batch start');
  });

  /* ================= F. Late enrolment and batch-date changes (helpers for CB9) ================= */
  await T('CB7-F late enrolment and re-dating', async () => {
    const s = cbSched('2027-02-01', M(6), 2400, 6), late = cbLate(s.rows, '2027-03-10');
    ok('CB7-F approved example: enrol 10 Mar after a 1 Feb start, 6 × £400 — payments 1 and 2 are due on 10 Mar (catch-up, £800); 3–6 keep 1 Apr – 1 Jul', J(late.map(r => [r.due, r.catchUp])) === J([['2027-03-10', true], ['2027-03-10', true], ['2027-04-01', false], ['2027-05-01', false], ['2027-06-01', false], ['2027-07-01', false]]) && late.filter(r => r.catchUp).reduce((a, r) => a + r.pence, 0) === 80000 && late[0].sched === '2027-02-01');
    ok('CB7-F enrolling before the start: nothing is a catch-up; amounts unchanged', cbLate(s.rows, '2026-12-01').every((r, i) => !r.catchUp && r.due === s.rows[i].due && r.pence === s.rows[i].pence));
    const rd = cbRedate(late.map((r, i) => ({ ...r, status: i < 2 ? 'Paid' : 'Upcoming' })), '2027-03-01', M(6), 6, '2026-12-01', r => r.status === 'Paid');
    ok('CB7-F re-dating: paid rows keep their dates; unpaid rows get the new start\'s dates; amounts and count never change', rd.rows.length === 6 && rd.rows[0].due === '2027-03-10' && rd.rows[1].due === '2027-03-10' && J(rd.rows.slice(2).map(r => r.due)) === J(['2027-05-01', '2027-06-01', '2027-07-01', '2027-08-01']) && rd.rows.every((r, i) => r.pence === s.rows[i].pence));
    ok('CB7-F (negative) re-dating to an invalid start is refused', !!cbRedate(s.rows, '2027-02-30', M(6), 6, null, () => false).why);
  });

  /* ================= G. Pure: nothing stored is read or changed ================= */
  await T('CB7-G nothing stored changes', async () => {
    initStore(); const snap = () => J({ worlds: Object.values(STORE.worlds).map(w => [w.plans || [], w.signup ? w.signup.plan || null : null]), plans: STORE.s4 ? STORE.s4.plans : null, r1: STORE.r1 ? STORE.r1.opts : null, audit: ADMIN.audit.length });
    const s0 = snap(); for (let i = 0; i < 200; i++) cbSched(cbAddDays('2027-01-01', i), M(1 + (i % 24)), 1000 + i, 1 + (i % 24)); cbOptWhy(M(7), 5); cbRuleTxt(M(5), 3);
    ok('CB7-G calling the engine changes no learner row, pinned terms, plan, fee option or audit entry', snap() === s0);
    ok('CB7-G existing E1 helper unchanged (it is still the one amount rule): e1SchedTxt(1000, 6) = 5 × £166.67 + £166.65', e1SchedTxt(1000, 6) === '5 × £166.67 + £166.65');
    ok('CB7-G no screen, action or store was added by the engine', !Object.keys(ACT).some(k => /^cbSched/.test(k)) && !('cbSched' in STORE));
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
