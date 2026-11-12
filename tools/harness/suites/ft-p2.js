// P2 — terms versions, batch time zones and the one clock, legacy fixture. Legacy attribution and reconciliation flags, frozen
// definitions, activation refused, time-zone validation and configuration (rendered dates unchanged), compatibility fallback, calendar
// vectors (UK winter / summer, UAE, DST, month / year / leap boundaries, the 30 January cutoff), the clock (freeze, unfreeze, CLOCK_SHIFT,
// production mode), independent scenarios, and nothing financial, seat-related or access-related changed.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; Clock.unfreeze(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } finally { Clock.unfreeze(); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; CLOCK_SHIFT = 0; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { closeModal(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const B = c => ADMIN.batches.find(b => b.code === c);
  const iso = ms => new Date(ms).toISOString();
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const fin = () => J(Object.keys(STORE.worlds).map(k => { const w = STORE.worlds[k]; return [k, w.plans, w.tx, w.signup && w.signup.sig, w.signup && w.signup.pin, w.admission && w.admission.deposit]; }));
  const seatsJ = () => J(SEATS().recs.map(r => [r.id, r.batch, r.kind, r.state, r.lid]));
  const batchesJ = () => J(ADMIN.batches.map(b => [b.code, b.start, b.end, b.cap, b.enrolled, b.status]));
  const locks = () => J(['A', 'B', 'C', 'D'].map(v => { learner(v); return ['assignments', 'progress', 'course', 'payments'].map(r => (lockFor(r) || {}).title || 'OPEN'); }));

  await T('P2-A legacy attribution and reconciliation', async () => {
    fresh(); seatSweep(); const f0 = fin(), s0 = seatsJ(), b0 = batchesJ();
    const all = p2TermsAll(), C = all.find(t => t.lid === STORE.worlds.C.me.id), Bw = all.find(t => t.lid === STORE.worlds.B.me.id);
    ok('P2-A1 every learner with an NVQ resolves to LEGACY-1 (the only version ever in force)', all.length > 10 && all.every(t => t.policy === 'LEGACY-1'), all.length);
    ok('P2-A2 Aisha (seeded, signed without a kept copy) is legacy and flagged for reconciliation — not treated as a verified agreement', C && C.agreement === 'signed — exact copy not kept' && C.flagged && !C.ref);
    ok('P2-A3 the seeded in-progress sign-up (persona B) is legacy and not flagged (its terms were pinned at start)', Bw && Bw.agreement === 'in progress (terms pinned at start)' && !Bw.flagged);
    const rost = all.filter(t => t.agreement === 'no learner account (historical record)');
    ok('P2-A4 roster learners with no account are listed as historical records to reconcile (' + rost.length + '); nothing about them is invented', rost.length > 0 && rost.every(t => t.flagged && t.policy === 'LEGACY-1' && !t.ref));
    ok('P2-A5 resolving is pure: running it twice gives the same answer and writes nothing', J(p2TermsAll()) === J(all) && fin() === f0 && !Object.keys(TERMS().links).length);
    ok('P2-A6 historical signed letters, plans, payments, deposits and pinned schedules are unchanged', fin() === f0 && seatsJ() === s0 && batchesJ() === b0);
  });

  await T('P2-B the revised version exists but cannot activate', async () => {
    fresh(); SA(); const P = P2_POLICIES['REVISED-1'];
    ok('P2-B1 definitions are frozen; REVISED-1 is a Draft that names what it needs (U-01, U-11)', Object.isFrozen(P2_POLICIES) && Object.isFrozen(P) && Object.isFrozen(P.rules) && P.status === 'Draft' && P.needs.length === 2 && /U-01/.test(P.needs[0]) && /U-11/.test(P.needs[1]));
    try { P.status = 'In force'; } catch (e) { /* frozen */ }
    const a0 = aud('Blocked: activate terms version');
    ok('P2-B2 activation is refused even for the Super Administrator, logged; LEGACY-1 stays the version in force', p2Activate('REVISED-1', 'P2 test') === false && P.status === 'Draft' && p2Active() === 'LEGACY-1' && aud('Blocked: activate terms version') === a0 + 1 && TERMS().log[0].what === 'Activation refused');
    ok('P2-B3 the activation plan for later is recorded: signed stay, in-progress keep their start link, new sign-ups after activation', /stay on the version they signed/.test(P.activation.signed) && /U-11/.test(P.activation.inProgress) && /after activation/.test(P.activation.new));
  });

  await T('P2-C batch time zones', async () => {
    fresh(); SA(); seatSweep(); const b = B('L3AC-NOV26-LEI');
    ok('P2-C1 existing batches have no zone: a labelled compatibility fallback (Europe/London) and listed as needing configuration (U-04)', ADMIN.batches.every(x => !x.tz) && batchTz(b).source === 'compat' && batchTz(b).tz === 'Europe/London' && /U-04/.test(batchTz(b).note) && p2TzPending().length === ADMIN.batches.length);
    const good = ['Europe/London', 'Asia/Dubai', 'america/new_york', 'Asia/Kolkata'], bad = ['UTC+1', 'GMT+4', '+04:00', 'Etc/GMT-4', 'UTC', 'Mars/Base', '', null, 'Europe/Nowhere'];
    ok('P2-C2 IANA identifiers are accepted (canonical case stored); fixed offsets, UTC and unknown names are refused', good.every(t => !!tzCanon(t)) && tzCanon('america/new_york') === 'America/New_York' && bad.every(t => tzCanon(t) === null), J(bad.map(t => tzCanon(t))));
    go('a-batches', { id: b.code }); const strip = () => { const m = $1('main').cloneNode(true); m.querySelectorAll('.p2-tz').forEach(x => x.remove()); return m.textContent.replace(/\s+/g, ' '); };
    const before = strip(), s0 = seatsJ();
    ok('P2-C3 the batch page shows the zone line with Set time zone for a batch administrator', /Not configured — Europe\/London used as a compatibility fallback/.test($1('main .p2-tz').textContent) && !!$1('main [data-act="p2Tz"]'));
    ACT.p2Tz({ dataset: { id: b.code } }); $1('#p2-tz').value = 'other'; $1('#p2-tz-o').value = 'UTC+1'; const t = $1('#rsn'); if (t) t.value = 'P2 test';
    ok('P2-C4 the dialog refuses a fixed offset', prim() === false && !b.tz); closeModal();
    const n0 = aud('Academy time zone set');
    ACT.p2Tz({ dataset: { id: b.code } }); $1('#p2-tz').value = 'Europe/London'; $1('#rsn').value = 'P2: Leicester classroom batch'; const out = prim(); closeModal();
    ok('P2-C5 setting it records the zone, its history and an audit entry', out !== false && b.tz === 'Europe/London' && b.tzHist.length === 1 && b.tzHist[0].from === null && aud('Academy time zone set') === n0 + 1 && batchTz(b).source === 'configured' && !p2TzPending().includes(b.code));
    go('a-batches', { id: b.code });
    ok('P2-C6 every rendered date on the batch page is unchanged; the start and end times are the stored ones; seats unchanged', strip() === before && b.start.endsWith('T09:00:00.000Z') === B('L3AC-NOV26-LEI').start.endsWith('T09:00:00.000Z') && seatsJ() === s0);
    ok('P2-C7 a direct call with the same zone, or no reason, is refused; nothing changes', !p2SetTz(b, 'Europe/London', 'again').ok && !p2SetTz(b, 'Asia/Dubai', '').ok && b.tz === 'Europe/London' && b.tzHist.length === 1);
    FA(); const sec0 = ADMIN.security.length; ACT.p2Tz({ dataset: { id: b.code } });
    ok('P2-C8 a Finance Admin is refused (screen and direct call), logged, nothing changes', !MODAL && !p2SetTz(b, 'Asia/Dubai', 'x').ok && b.tz === 'Europe/London' && ADMIN.security.length > sec0); closeModal();
    SA(); ok('P2-C9 changing it keeps the history (from → to)', p2SetTz(b, 'Asia/Dubai', 'P2: moved online').ok && b.tzHist[1].from === 'Europe/London' && b.tzHist[1].to === 'Asia/Dubai');
  });

  await T('P2-D calendar vectors', async () => {
    ok('P2-D1 UK winter offset 0, UK summer +60, UAE +240 all year', tzOffsetMin('2027-01-15T12:00:00Z', 'Europe/London') === 0 && tzOffsetMin('2027-07-15T12:00:00Z', 'Europe/London') === 60 && tzOffsetMin('2027-01-15T12:00:00Z', 'Asia/Dubai') === 240 && tzOffsetMin('2027-07-15T12:00:00Z', 'Asia/Dubai') === 240);
    ok('P2-D2 UAE day boundaries: 2 Jan 2027 in Dubai runs 1 Jan 20:00Z → 2 Jan 20:00Z', iso(dayStart('2027-01-02', 'Asia/Dubai')) === '2027-01-01T20:00:00.000Z' && iso(dayEnd('2027-01-02', 'Asia/Dubai')) === '2027-01-02T20:00:00.000Z');
    ok('P2-D3 DST start (28 Mar 2027) is a 23-hour London day; DST end (31 Oct 2027) 25 hours; the next day starts at 23:00Z / 00:00Z', dayHours('2027-03-28', 'Europe/London') === 23 && dayHours('2027-10-31', 'Europe/London') === 25 && iso(dayStart('2027-03-29', 'Europe/London')) === '2027-03-28T23:00:00.000Z' && iso(dayStart('2027-11-01', 'Europe/London')) === '2027-11-01T00:00:00.000Z');
    ok('P2-D4 a US DST day (14 Mar 2027, New York) is 23 hours too', dayHours('2027-03-14', 'America/New_York') === 23);
    ok('P2-D5 month, year and leap boundaries', ymdAdd('2027-01-01', -1) === '2026-12-31' && ymdAdd('2027-03-01', -1) === '2027-02-28' && ymdAdd('2028-03-01', -1) === '2028-02-29' && ymdAdd('2028-02-28', 1) === '2028-02-29' && ymdAdd('2028-03-27', -28) === '2028-02-28' && ymdAdd('2026-12-31', 1) === '2027-01-01' && ymdCmp('2027-01-02', '2027-01-10') === -1 && !ymdOk('2027-02-29') && ymdOk('2028-02-29'));
    ok('P2-D6 the local calendar date of an instant depends on the zone: 2027-01-02T22:30Z is 2 Jan in London, 3 Jan in Dubai', ymdIn('2027-01-02T22:30:00Z', 'Europe/London') === '2027-01-02' && ymdIn('2027-01-02T22:30:00Z', 'Asia/Dubai') === '2027-01-03');
    const x = { code: 'X', start: '2027-01-30T09:00:00Z' }, c = p2CutoffPreview(x);
    ok('P2-D7 30 January start → cutoff 2 January, last new deposit 1 January (compatibility zone, flagged as such)', c.startYmd === '2027-01-30' && c.cutoffYmd === '2027-01-02' && c.lastDepositYmd === '2027-01-01' && c.tzSource === 'compat');
    ok('P2-D8 London batch: new deposits until 1 Jan 23:59:59.999 GMT; first-instalment balance by the end of 2 Jan GMT', iso(c.newDepositsBefore) === '2027-01-02T00:00:00.000Z' && iso(c.balanceDueBefore) === '2027-01-03T00:00:00.000Z' && byEndOfDay('2027-01-02T23:59:59.999Z', c.cutoffYmd, c.tz) && !byEndOfDay('2027-01-03T00:00:00Z', c.cutoffYmd, c.tz));
    const d = p2CutoffPreview({ code: 'Y', start: '2027-01-30T09:00:00Z', tz: 'Asia/Dubai' });
    ok('P2-D9 Dubai batch: the same calendar dates; the day ends at 20:00Z', d.tzSource === 'configured' && d.cutoffYmd === '2027-01-02' && iso(d.balanceDueBefore) === '2027-01-02T20:00:00.000Z' && byEndOfDay('2027-01-02T19:59:59Z', d.cutoffYmd, d.tz) && !byEndOfDay('2027-01-02T20:00:00Z', d.cutoffYmd, d.tz));
    ok('P2-D10 the batch zone decides, not the learner: a London batch evaluated at 22:00Z on 2 Jan (3 Jan in Dubai) is still within the day', byEndOfDay('2027-01-02T22:00:00Z', c.cutoffYmd, c.tz) && ymdIn('2027-01-02T22:00:00Z', 'Asia/Dubai') === '2027-01-03');
    ok('P2-D11 a start stored as a date only and at another hour give the same calendar date', batchStartYmd({ start: '2027-01-30' }) === '2027-01-30' && batchStartYmd({ start: '2027-01-30T23:30:00Z' }) === '2027-01-30' && batchStartYmd({ start: '2027-01-30T23:30:00Z', tz: 'Asia/Dubai' }) === '2027-01-31');
    ok('P2-D12 a date across BST: a 28 Apr 2027 start (BST) → cutoff 31 Mar (BST), balance due by 1 Apr 00:00 BST = 31 Mar 23:00Z', (() => { const e = p2CutoffPreview({ start: '2027-04-28T08:00:00Z', tz: 'Europe/London' }); return e.cutoffYmd === '2027-03-31' && iso(e.balanceDueBefore) === '2027-03-31T23:00:00.000Z'; })());
    ok('P2-D13 formatted times name the zone', /GMT/.test(fmtTz('2027-01-02T23:59:00Z', 'Europe/London')) && /\(Europe\/London\)$/.test(fmtTz('2027-01-02T23:59:00Z', 'Europe/London')) && /BST|GMT\+1/.test(fmtTz('2027-07-02T12:00:00Z', 'Europe/London')) && /\(Asia\/Dubai\)$/.test(fmtTz('2027-01-02T12:00:00Z', 'Asia/Dubai')));
  });

  await T('P2-E existing deposit eligibility is not the revised cutoff', async () => {
    fresh(); const x = { code: 'X', start: '2027-01-30T09:00:00Z' };
    Clock.freeze('2027-01-03T08:59:00Z');
    ok('P2-E1 on 3 Jan 08:59Z the legacy rule still offers a deposit (rounded days, as before P2); the revised cutoff is only a preview', chDepositOk(x) === true && chDepositOk(x) === (Math.ceil((Date.parse(x.start) - now()) / DAY) >= 28) && !byEndOfDay(now(), p2CutoffPreview(x).lastDepositYmd, 'Europe/London'));
    Clock.freeze('2027-01-03T09:01:00Z'); ok('P2-E2 …and stops at 3 Jan 09:01Z, unchanged', chDepositOk(x) === false);
  });

  await T('P2-F the one clock', async () => {
    fresh(); const t0 = now().getTime();
    const f = Clock.freeze('2027-01-02T12:00:00Z'); ok('P2-F1 freeze: now() is exactly the instant, and stays there', now().toISOString() === '2027-01-02T12:00:00.000Z' && f.getTime() === now().getTime());
    CLOCK_SHIFT += 5 * DAY; ok('P2-F2 a frozen clock ignores CLOCK_SHIFT', now().toISOString() === '2027-01-02T12:00:00.000Z');
    CLOCK_SHIFT -= 5 * DAY; Clock.unfreeze(); ok('P2-F3 unfreeze: back to the running demo clock', Math.abs(now().getTime() - t0) < 5000);
    CLOCK_SHIFT += DAY; ok('P2-F4 CLOCK_SHIFT still moves the running clock (a restored copy continues its clock)', Math.abs(now().getTime() - t0 - DAY) < 5000); CLOCK_SHIFT = 0;
    Clock.mode = 'production'; const p = now().getTime(); Clock.mode = 'demo';
    ok('P2-F5 production mode reads the real time; demo mode returns', Math.abs(p - Date.now()) < 5000 && Math.abs(now().getTime() - t0) < 5000);
    let threw = false; try { Clock.freeze('not a time'); } catch (e) { threw = true; } ok('P2-F6 freezing to something that isn\'t a time is refused', threw && Clock.frozen === null);
    Clock.freeze('2027-01-02T12:00:00Z'); SA(); ACT.resetDemo(); closeModal(); ok('P2-F7 Reset demo never keeps a frozen test instant', Clock.frozen === null);
  });

  await T('P2-G independent scenario clocks', async () => {
    fresh(); Clock.freeze('2026-12-01T10:00:00Z'); const n = now().getTime();
    ok('P2-G1 with no offsets every scenario reads the one clock', agNow().getTime() === n && dpNow().getTime() === n && wNow().getTime() === n);
    STORE.agy.offset = 30; ok('P2-G2 the agency "Advance 30 days" moves only the agency date', agNow().getTime() === n + 30 * DAY && dpNow().getTime() === n && wNow().getTime() === n && now().getTime() === n);
    CB10().offset = 7; ok('P2-G3 Finance\'s simulated date moves only Finance (holds, overdue)', dpNow().getTime() === n + 7 * DAY && agNow().getTime() === n + 30 * DAY && now().getTime() === n);
    STORE.wpc = STORE.wpc || {}; STORE.wpc.offset = 3; ok('P2-G4 the workplace link date moves only workplace links', wNow().getTime() === n + 3 * DAY && dpNow().getTime() === n + 7 * DAY);
    let threw = false; try { Clock.scenario('nope'); } catch (e) { threw = true; } ok('P2-G5 an unknown scenario is refused', threw);
    const g = ADMIN.bundles.map(b => [b.id, bStatus(b)]); STORE.agy.offset = 0; const g0 = ADMIN.bundles.map(b => [b.id, bStatus(b)]);
    ok('P2-G6 agency expiry follows the agency date as before (BN-06 Expired; statuses move with the 30-day advance)', g0.find(x => x[0] === 'BN-06')[1] === 'Expired' && J(g) !== J(g0), J(g0));
  });

  await T('P2-H nothing else changed', async () => {
    fresh(); seatSweep(); const s0 = seatsJ(), f0 = fin(), b0 = batchesJ(), inv0 = seatInvariants(), l0 = locks();
    SA(); ADMIN.batches.forEach((b, i) => p2SetTz(b, i % 2 ? 'Asia/Dubai' : 'Europe/London', 'P2 all batches')); p2TermsAll(); ADMIN.batches.forEach(b => p2CutoffPreview(b)); go('a-batches'); render();
    ok('P2-H1 P1 ledger: same records, IDs, states and counts; invariants hold', seatsJ() === s0 && inv0.length === 0 && seatInvariants().length === 0);
    ok('P2-H2 payment schedules, payments, signatures and deposits unchanged', fin() === f0);
    ok('P2-H3 batch dates, capacity, counts and status unchanged', batchesJ() === b0);
    ok('P2-H4 course access unchanged for every persona', locks() === l0);
    SA(); go('a-batches'); ok('P2-H5 the Batches list summarises terms versions and the batches still needing a zone', /Terms versions and batch time zones/.test($1('main').textContent) && /Every batch has an Academy time zone/.test($1('main').textContent));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
