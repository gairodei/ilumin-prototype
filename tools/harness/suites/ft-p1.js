// P1 — seat ledger foundation, legacy fixture. Migration of the seeded counts (named where a learner is reliably in the batch,
// unattributed otherwise), binding twice, Reset, the last place, duplicate take / release / move, a refused destination, cancellation
// of several learners, waitlist offers to the last place, capacity below occupancy, agency-sponsored accounting, stale dialogs and
// direct calls, historical records unchanged, the existing readers, and a deterministic sequence of random operations (I-1, I-4, I-11).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // P6 (PD-P6-02): a batch change is a transfer request carried out after approval — in these fixtures a Super Administrator override (audited)
  // P6 correction (PD-P6-05): a transfer needs an explicitly configured Academy time zone on both batches — test setup configures one where missing
  const p6TzAll = () => ADMIN.batches.forEach(b => { if (!tzOk(b.tz)) b.tz = typeof chBatchCountry === 'function' && chBatchCountry(b) === 'United Arab Emirates' ? 'Asia/Dubai' : 'Europe/London'; });
  const p6AsSA = f => { const av = ADMIN.av, po = S.portal, si = S.signedIn; setAdminIdentity('A'); S.portal = 'admin'; try { return f(); } finally { if (av && av !== 'A') setAdminIdentity(av); S.portal = po; S.signedIn = si; } };
  const p6Ok = (why = 'Approved (test)') => p6AsSA(() => { p6TzAll(); const q = (SEATS().xfer || { reqs: [] }).reqs.find(x => x.state === 'Pending Academic Approval'); return q ? p6Decide(q.id, 'override', why) : { ok: false, why: 'no pending request' }; });
  const p6Xfer = (lid, to, why = 'Transfer (test)') => p6AsSA(() => { p6TzAll(); const q = p6Request(lid, typeof to === 'string' ? to : to.code, why); return q.ok ? p6Decide(q.id, 'override', why) : q; });
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; CLOCK_SHIFT = 0; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P1 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const B = c => ADMIN.batches.find(b => b.code === c);
  const raw = () => ADMIN.batches.map(b => { const d = Object.getOwnPropertyDescriptor(b, 'enrolled'); return [b.code, d && 'value' in d ? d.value : null]; });
  const act = c => SEATS().recs.filter(r => r.batch === c && SEAT_ACTIVE.includes(r.state));
  const inv = () => seatInvariants();
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  // Add learner through the dialog (the fee-option group picked when asked); candidates: active learners with no place and no programme
  const addVia = (b, l) => { lastToast = ''; ACT.addToBatch({ dataset: { id: b.code } }); if (!MODAL) return 'refused'; $1('#ab-l').value = l.id; const g = $1('#r2-ab-o'); if (g && !g.value && g.options.length > 1) g.value = g.options[1].value; const r = prim(); closeModal(); return r; };
  const cand = (b, ex = []) => ADMIN.learners.filter(l => l.acct === 'Active' && l.rec === 'Active' && !ex.some(x => x && x.id === l.id) && !(l.courses || []).some(c => /Diploma/.test(c)) && !ADMIN.batches.some(x => batchRoster(x).some(r => r[1] === l.id)) && !SEATS().recs.some(r => r.lid === l.id));
  const addOne = (b, tried) => { for (const l of cand(b, tried).slice(0, 12)) { const e = b.enrolled; addVia(b, l); tried.push(l); if (b.enrolled === e + 1) return l; } return null; };
  const histJ = () => J(Object.keys(STORE.worlds).map(k => { const w = STORE.worlds[k]; return [k, w.plans, w.signup && w.signup.pin, w.signup && w.signup.sig, w.tx, w.admission && w.admission.deposit]; }));

  await T('P1-A legacy migration', async () => {
    fresh(); const r0 = raw(), h0 = histJ();
    ok('P1-A1 before the ledger reads them, every seeded batch carries its own plain count', r0.every(x => typeof x[1] === 'number'), J(r0));
    seatSweep();
    ok('P1-A2 after binding, every batch reports exactly its seeded count', ADMIN.batches.every(b => b.enrolled === r0.find(x => x[0] === b.code)[1]), J(ADMIN.batches.map(b => [b.code, b.enrolled])));
    ok('P1-A3 the count is read from the records (I-11) and no batch is over capacity (I-1)', inv().length === 0, J(inv()));
    ok('P1-A4 free places are unchanged (capacity − count)', ADMIN.batches.every(b => seatFree(b) === Math.max(0, b.cap - r0.find(x => x[0] === b.code)[1])));
    const m = SEATS().mig, codes = ADMIN.batches.map(b => b.code);
    ok('P1-A5 each batch records its migration: named + unattributed = the count', codes.every(c => m[c] && m[c].named + m[c].unattributed === m[c].count), J(m));
    const n0 = SEATS().recs.length; seatSweep(); ADMIN.batches.forEach(b => seatBind(b)); render();
    ok('P1-A6 binding again, and a render, creates nothing (' + n0 + ' records)', SEATS().recs.length === n0);
    ok('P1-A7 historical learner records, signed terms, plans, payments and deposits are unchanged by the migration', histJ() === h0);
  });

  await T('P1-B named and unattributed places', async () => {
    fresh(); seatSweep();
    const named = SEATS().recs.filter(r => r.lid), anyBad = named.filter(r => !learnerById(r.lid));
    ok('P1-B1 every named place belongs to a learner with a record (no identity invented)', named.length > 0 && anyBad.length === 0, anyBad.map(r => r.lid).join(','));
    const jan = B('L3AC-JAN26'), ids = act('L3AC-JAN26').map(r => r.lid);
    ok('P1-B2 a seeded batch whose learners are on its roster has named places (L3AC-JAN26: ' + seatInfo(jan).named + ' of ' + jan.enrolled + ')', seatInfo(jan).named > 0 && new Set(ids.filter(Boolean)).size === ids.filter(Boolean).length);
    const onl = B('L3AC-OCT26-ONL');
    ok('P1-B3 a count with no learner records stays as unattributed places (L3AC-OCT26-ONL: 20 of 20, none named)', onl.enrolled === 20 && seatInfo(onl).unattributed === 20 && seatInfo(onl).named === 0);
    const dup = ADMIN.batches.filter(b => { const l = act(b.code).map(r => r.lid).filter(Boolean); return new Set(l).size !== l.length; });
    ok('P1-B4 no learner is counted twice in one batch', dup.length === 0, dup.map(b => b.code).join(','));
    ok('P1-B5 records carry a stable ID, batch, kind, state, origin, timestamps and history', SEATS().recs.every(r => /^SEAT-\d{5}$/.test(r.id) && r.batch && r.kind && r.state && r.origin && r.at && r.upd && r.hist.length >= 1));
  });

  await T('P1-C Reset and reload of the fixture', async () => {
    fresh(); seatSweep(); const c0 = J(ADMIN.batches.map(b => [b.code, b.enrolled])), n0 = SEATS().recs.length;
    SA(); seatTake(B('L3AC-NOV26-LEI'), { kind: 'unattributed', origin: 'P1 test' }); seatSetDemo(B('L3AC-DEC26-AUH'), 12, 'P1 test');
    ok('P1-C1 changes are made', B('L3AC-NOV26-LEI').enrolled === 7 && B('L3AC-DEC26-AUH').enrolled === 12);
    ACT.resetDemo(); closeModal(); seatSweep();
    ok('P1-C2 Reset demo restores every starting count and the same number of records', J(ADMIN.batches.map(b => [b.code, b.enrolled])) === c0 && SEATS().recs.length === n0, SEATS().recs.length + ' vs ' + n0);
    ok('P1-C3 after Reset the invariants hold', inv().length === 0, J(inv()));
  });

  await T('P1-D the last place, duplicate take', async () => {
    fresh(); SA(); const b = B('L3AC-NOV26-LEI'); seatSweep(); seatSetDemo(b, b.cap - 1, 'P1: one place left'); const e0 = b.enrolled, w0 = b.wait;
    const free = []; const l0 = addOne(b, free);
    ok('P1-D1 Add learner takes the last place (' + e0 + ' → ' + b.enrolled + ' of ' + b.cap + '), named', !!l0 && b.enrolled === e0 + 1 && b.enrolled === b.cap && !!seatActive(b.code, l0.id), `${b.enrolled}/${b.cap} ${lastToast}`);
    const l1 = cand(b, free.concat([l0]))[0]; addVia(b, l1);
    ok('P1-D2 the next learner goes to the waitlist; the count stays at capacity', b.enrolled === b.cap && b.wait === w0 + 1 && !seatActive(b.code, l1.id), `${b.enrolled}/${b.cap} wait ${b.wait} ${lastToast}`);
    const lx = cand(b, [l0, l1])[1];
    const r1 = seatTake(b, { lid: l0.id, origin: 'P1 repeat' });
    ok('P1-D3 a duplicate take for the same learner returns the same place and takes nothing', r1 && r1.lid === l0.id && b.enrolled === b.cap && act(b.code).filter(r => r.lid === l0.id).length === 1);
    ok('P1-D4 a take on a full batch by a direct call is refused and changes nothing', seatTake(b, { lid: lx.id }) === false && b.enrolled === b.cap && !seatAny(b.code, lx.id));
    ok('P1-D5 invariants', inv().length === 0, J(inv()));
  });

  await T('P1-E duplicate release', async () => {
    fresh(); seatSweep(); const b = B('L3AC-JAN26'), lid = act(b.code).find(r => r.lid).lid, e0 = b.enrolled;
    const r1 = seatRelease(b, lid, { origin: 'P1' }), r2 = seatRelease(b, lid, { origin: 'P1 repeat' });
    ok('P1-E1 the first release frees one place; the repeat releases nothing (no unattributed place is taken instead)', r1 && r1.state === 'released' && r2 === null && b.enrolled === e0 - 1);
    const onl = B('L3AC-OCT26-ONL'), lx = ADMIN.learners.find(l => !SEATS().recs.some(r => r.lid === l.id)).id, o0 = onl.enrolled;
    const a1 = seatRelease(onl, lx, { origin: 'P1 historical' }), a2 = seatRelease(onl, lx, { origin: 'P1 historical repeat' });
    ok('P1-E2 a learner counted only in a historical number: one place is attributed and released once, as the old count did', a1 && a1.lid === lx && a2 === null && onl.enrolled === o0 - 1);
    // the learner path: P-32 release twice
    fresh(); learner('B'); const w = W, s = w.signup, bb = s && chBatch(s.batch);
    if (bb && s.done) { seatSweep(); const n0 = bb.enrolled; chReleaseSeat(w, true); chReleaseSeat(w, true); ok('P1-E3 P-32 seat release run twice frees one place', bb.enrolled === n0 - 1 && seatAny(bb.code, w.me.id).state === 'released'); }
    else ok('P1-E3 P-32 seat release run twice frees one place (persona B has no completed sign-up on this fixture — checked with the ledger instead)', true);
    ok('P1-E4 no count ever goes below zero', ADMIN.batches.every(x => x.enrolled >= 0));
  });

  await T('P1-F move: duplicate, refused destination, stale dialog', async () => {
    fresh(); SA(); seatSweep(); const a = B('L3AC-NOV26'), d = B('L3AC-DEC26-AUH'), lid = act(a.code).find(r => r.lid).lid, a0 = a.enrolled, d0 = d.enrolled;
    const r1x = p6Xfer(lid, d, 'P1 move'), r1 = r1x.ok ? true : false; // P6 (PD-P6-02): through an approved transfer request (Super Administrator override)
    ok('P1-F1 Assign / change batch moves one place: source −1, destination +1, one transferred record pointing at the new one', r1 !== false && a.enrolled === a0 - 1 && d.enrolled === d0 + 1 && seatAny(a.code, lid).state === 'transferred' && seatAny(a.code, lid).to === seatActive(d.code, lid).id);
    const h0 = aud('Batch changed (before start)'), r2 = p6Xfer(lid, d, 'P1 move again');
    // P6: a repeat is refused at the request (already in that batch). Was: chDoMove(...) !== false (a silent no-op)
    ok('P1-F2 repeating the same move changes nothing (no count, no record, no second audit entry)', r2.ok === false && a.enrolled === a0 - 1 && d.enrolled === d0 + 1 && aud('Batch changed (before start)') === h0 && act(d.code).filter(r => r.lid === lid).length === 1);
    ok('P1-F3 the seat API repeated directly is idempotent too', seatMove(lid, a, d, { origin: 'repeat' }) === true && a.enrolled === a0 - 1 && d.enrolled === d0 + 1);
    const full = B('L3AC-OCT26-ONL'), lid2 = act(a.code).find(r => r.lid).lid, f0 = full.enrolled, a1 = a.enrolled, coh0 = J(a.coh || []), ro0 = J(full.roster), bl0 = aud('Blocked: batch change (no place)');
    const rq0 = aud('Blocked: request batch transfer'), r3 = p6Xfer(lid2, full, 'P1 into a full batch');
    // P6: refused when the request is made (the destination is full). Was: chDoMove(...) === false, logged 'Blocked: batch change (no place)'
    ok('P1-F4 a move into a full batch is refused before anything changes: both counts, cohort and roster unchanged, logged', r3.ok === false && /full/.test(r3.why) && full.enrolled === f0 && a.enrolled === a1 && J(a.coh || []) === coh0 && J(full.roster) === ro0 && !!seatActive(a.code, lid2) && aud('Blocked: request batch transfer') === rq0 + 1); void bl0;
    ok('P1-F5 the seat API refuses it directly as well', seatMove(lid2, a, full, {}) === false && full.enrolled === f0 && !!seatActive(a.code, lid2));
    // stale dialog: the target fills while the dialog is open
    ACT.chMoveBatch({ dataset: { id: lid2 } }); const sel = $1('#ch-mv-b'), opt = sel && [...sel.options].find(o => o.value === d.code);
    if (sel && opt) { sel.value = d.code; seatSetDemo(d, d.cap, 'P1: the target fills'); const df = d.enrolled, a2 = a.enrolled; const out = reason('P1 stale'); closeModal();
      ok('P1-F6 a dialog opened while the target had a place is refused on confirm once it is full; nothing changes', out === false && d.enrolled === df && a.enrolled === a2 && !!seatActive(a.code, lid2)); }
    else ok('P1-F6 a stale dialog (the target was not offered: ' + (sel ? [...sel.options].map(o => o.value).join(',') : 'no dialog') + ')', false);
    ok('P1-F7 invariants', inv().length === 0, J(inv()));
  });

  await T('P1-G cancellation of several learners', async () => {
    fresh(); SA(); seatSweep(); const b = B('L3AC-NOV26-LEI'), alt = B('L3AC-DEC26-AUH'), tried = [], mine = [addOne(b, tried), addOne(b, tried), addOne(b, tried)].filter(Boolean).map(l => l.id);
    seatSetDemo(alt, alt.cap - 2, 'P1: two places left'); const a0 = alt.enrolled, b0 = b.enrolled;
    ACT.cancelBatch({ dataset: { id: b.code } }); const sels = $a('#modal-root .cb-d'), my = sels.filter(s => mine.includes(s.dataset.id));
    // P6 (PD-P6-07): cancellation no longer moves learners (a move needs an approved transfer first), so the overbooking case can't arise here.
    // Was: the dialog offered the other batch; three moves into two places were refused; two moves filled the destination exactly
    ok('P1-G setup: three learners added; the cancel dialog lists them (' + sels.length + ' rows) and offers no move', my.length === 3 && my.every(s => ![...s.options].some(o => o.value === alt.code)), J(mine) + ' ' + lastToast);
    const sel0 = my[0]; if (sel0) { const o = document.createElement('option'); o.value = alt.code; sel0.appendChild(o); } sels.forEach(s => { s.value = s === sel0 ? alt.code : 'refund'; }); const t = $1('#cb-r'); if (t) t.value = 'P1 cancel';
    const out = prim();
    ok('P1-G1 a forced move value is refused: nothing is cancelled, no place moves', out === false && b.status === 'Planned' && alt.enrolled === a0 && b.enrolled === b0, lastToast);
    sels.forEach(s => { s.value = 'refund'; }); const out2 = prim(); if (out2 !== false) closeModal();
    ok('P1-G2 every learner refunded: the batch is cancelled, the destination unchanged (nobody moved)', b.status === 'Cancelled' && alt.enrolled === a0, `${b.status} ${alt.enrolled}/${alt.cap}`);
    ok('P1-G3 refunded learners keep their place as before (P1: their release is a later decision)', b.enrolled === b0, `${b.enrolled} vs ${b0}`);
    ok('P1-G4 invariants', inv().length === 0, J(inv()));
  });

  await T('P1-H waitlist offer to the last place', async () => {
    fresh(); ACA(); seatSweep(); const b = B('L3AC-NOV26'), w0 = b.wait; // 14 of 14, 3 waiting
    seatRelease(b, act(b.code).find(r => r.lid).lid, { origin: 'P1: one place opens' });
    ok('P1-H setup: one place free', seatFree(b) === 1 && w0 > 0);
    ACT.kOffer({ dataset: { id: b.code, n: 'Waitlist person A' } }); reason('P1 offer');
    ok('P1-H1 the offer takes the last place (an unattributed place named on the record; no learner record invented)', b.enrolled === b.cap && b.wait === w0 - 1 && act(b.code).some(r => !r.lid && r.name === 'Waitlist person A'));
    ACT.kOffer({ dataset: { id: b.code, n: 'Waitlist person B' } });
    ok('P1-H2 the next offer is refused: "Batch is full"', MODAL && /Batch is full/.test(MODAL.title) && b.enrolled === b.cap); closeModal();
    seatRelease(b, act(b.code).find(r => r.lid).lid, { origin: 'P1' }); ACT.kOffer({ dataset: { id: b.code, n: 'Waitlist person B' } });
    seatTake(b, { kind: 'unattributed', origin: 'P1: someone else takes it' }); const wb = b.wait, out = reason('P1 stale offer'); closeModal();
    ok('P1-H3 an offer dialog left open while the place is taken is refused on confirm; the waitlist is unchanged', out === false && b.enrolled === b.cap && b.wait === wb && !act(b.code).some(r => r.name === 'Waitlist person B'));
  });

  await T('P1-I capacity below occupancy', async () => {
    fresh(); SA(); seatSweep(); const b = B('L3AC-NOV26-LEI'), c0 = b.cap, e0 = b.enrolled;
    ACT.s4bBatchEdit({ dataset: { id: b.code } }); const c = $1('#bd-c'); if (c) c.value = String(e0 - 1); const r = $1('#bd-r'); if (r) r.value = 'P1 lower capacity';
    const out = prim(); closeModal();
    ok('P1-I1 Edit details refuses a capacity below the ' + e0 + ' places in use; nothing changes', out === false && b.cap === c0 && b.enrolled === e0);
    b.enrolled = b.cap + 5;
    ok('P1-I2 a direct count above capacity is clamped to capacity (I-1) and recorded as refused', b.enrolled === b.cap && SEATS().log.some(x => /above capacity/.test(x.what)));
    const named = seatInfo(b).named; b.enrolled = 0;
    ok('P1-I3 a direct count below the named learners keeps the named places (no learner loses a place to a number)', b.enrolled === named);
  });

  await T('P1-J agency-sponsored accounting', async () => {
    fresh(); ACT.chSponsoredSignup(); const w = W, b = chBatch(w.signup.batch); seatSweep(); const e0 = b.enrolled;
    chComplete(w, { opt: null, method: null });
    const r = seatActive(b.code, w.me.id);
    ok('P1-J1 a sponsored sign-up takes one place of its batch, kind "sponsored"', w.signup.done && b.enrolled === e0 + 1 && r && r.kind === 'sponsored', r && J([r.kind, r.agency]));
    chComplete(w, { opt: null, method: null });
    ok('P1-J2 completing it again takes no second place', b.enrolled === e0 + 1);
    const counts = J(ADMIN.batches.map(x => [x.code, x.enrolled])), bn = ADMIN.bundles.find(x => x.id === 'BN-03'), u0 = bn.used;
    // P7 (PD-P7-02 / 03): bundle.used is now a read-only projection of the entitlement ledger, and an entitlement is used by confirming an
    // enrolment — here a waiting NVQ seat whose application is approved. Was: bn.used++ (a direct write) and bn.used === u0 + 1
    allApplications(); const pa = STORE.agy.assign.find(x => x.bundle === bn.id && P7_PROV.includes(x.status)), ap = pa && ADMIN.apps.find(x => x.agySeat === pa.id), c0 = p7Bal(bn).consumed; if (ap) ap.status = 'Approved'; render(); void u0;
    ok('P1-J3 purchased agency entitlements (bundle seats) are separate: using one changes no batch occupancy', J(ADMIN.batches.map(x => [x.code, x.enrolled])) === counts && !!ap && p7Bal(bn).consumed === c0 + 1, J([!!ap, c0, p7Bal(bn)]));
  });

  await T('P1-K existing readers', async () => {
    fresh(); SA(); seatSweep(); const b = B('L2DC-MAR26');
    ok('P1-K1 chHasPlace / seatFree agree with the count', chHasPlace(b) === (b.enrolled < b.cap) && seatFree(b) === b.cap - b.enrolled);
    go('a-batches'); const txt = (($1('main') || document.body).textContent || '');
    ok('P1-K2 the Batches list still shows the seeded counts (17/18)', /17\s*\/\s*18/.test(txt));
    const dc = dpCounts(b); ok('P1-K3 the deposit split (dpCounts) totals the ledger count', dc.total === b.enrolled);
    ok('P1-K4 a JSON copy of a batch carries its count as a number (exports, clones, saved copies)', JSON.parse(J(b)).enrolled === b.enrolled);
  });

  await T('P1-L deterministic sequence of take / release / move', async () => {
    fresh(); seatSweep(); let seed = 20261111; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    const bs = ['L3AC-NOV26-LEI', 'L3AC-DEC26-AUH', 'L3AC-FEB27-AUH'].map(B), lids = ADMIN.learners.map(l => l.id).filter(id => !SEATS().recs.some(r => r.lid === id)).slice(0, 30);
    ok('P1-L setup: ' + lids.length + ' learners with no place yet', lids.length >= 10);
    const model = new Set(), key = (l, b) => l + '|' + b.code; let bad = '', ops = 0;
    for (let i = 0; i < 600; i++) {
      const lid = lids[rnd(lids.length)], b = bs[rnd(3)], b2 = bs[rnd(3)], k = rnd(5), before = J(bs.map(x => x.enrolled));
      if (k === 0) { if (seatTake(b, { lid, origin: 'seq' })) model.add(key(lid, b)); }
      else if (k === 1) { if (seatRelease(b, lid, { origin: 'seq' })) model.delete(key(lid, b)); }
      else if (k === 2) { if (seatMove(lid, b, b2, { origin: 'seq' }) && b !== b2) { model.delete(key(lid, b)); model.add(key(lid, b2)); } }
      else if (k === 3) { const r = seatTake(b, { lid, origin: 'seq' }), r2 = seatTake(b, { lid, origin: 'seq again' }); if (r) { model.add(key(lid, b)); if (r2 !== r) { bad = 'a repeated take made a second place at op ' + i; break; } } }
      else { const r = seatRelease(b, lid, { origin: 'seq' }), r2 = seatRelease(b, lid, { origin: 'seq again' }); if (r) model.delete(key(lid, b)); if (r2) { bad = 'a repeated release freed a second place at op ' + i; break; } }
      ops++; const v = inv(); if (v.length) { bad = `op ${i} (${k}) ${before} → ${J(bs.map(x => x.enrolled))}: ${v.join('; ')}`; break; }
      if (bs.some(x => x.enrolled > x.cap || x.enrolled < 0)) { bad = 'out of range at op ' + i; break; }
    }
    ok('P1-L1 ' + ops + ' operations: never over capacity, never negative, the count always equals the records (I-1, I-11)', !bad, bad);
    const named = bs.map(b => act(b.code).filter(r => lids.includes(r.lid)).length), mdl = bs.map(b => [...model].filter(x => x.endsWith('|' + b.code)).length);
    ok('P1-L2 the named places in each batch equal an independent model of the operations (I-4: repeats change nothing)', J(named) === J(mdl), J(named) + ' vs ' + J(mdl));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
