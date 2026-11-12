// P8 — agency fixed-batch reservations, legacy fixture: legacy agency purchases, enrolments and balances unchanged by P8; another
// agency's bundle and reservations refused at every action; a programme with one price and no fee option can't take reservations
// (fail closed: no delivery mode to record); the admin console has no reservation shortcut.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); if (STORE.agy) STORE.agy.offset = 0; render(); };
  const AGY = id => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const agIdOf = name => (ADMIN.agencies.find(a => a.name === name) || {}).id;
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;

  await T('P8-A legacy data unchanged', async () => {
    fresh(); const bs = ADMIN.bundles.filter(b => b.agency);
    ok('P8-A1 no reservation exists and no reserved place; every bundle\'s projection equals its count before P7 (non-expired)', P8().recs.length === 0 && !SEATS().recs.some(r => r.kind === 'agencyReserved') && bs.filter(b => !p7Expired(b) && P7().mig[b.id]).every(b => b.used === P7().mig[b.id].raw));
    ok('P8-A2 no reservations; unreserved = purchased − consumed − waiting, never negative (non-expired bundles)', bs.filter(b => !p7Expired(b)).every(b => { const x = p7Bal(b); return x.reserved === 0 && x.free === Math.max(0, x.purchased - x.consumed - x.pending); }));
    ok('P8-A3 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  await T('P8-B ownership and fail-closed rules', async () => {
    fresh(); const cp = ADMIN.bundles.find(b => b.agency && !p7Expired(b) && b.courses.some(c => /Diploma/.test(c))), other = ADMIN.bundles.find(b => b.agency && b.agency !== cp.agency);
    const bt = ADMIN.batches.find(b => b.course === cp.courses.find(c => /Diploma/.test(c)) && ['Open', 'Planned'].includes(b.status));
    AGY(agIdOf(other.agency));
    ok('P8-B1 another agency can\'t reserve from this bundle (refused, logged)', !!bt && p8Reserve(cp.id, bt.code, 'X', 1, 'not mine').denied === true && aud('Blocked: reserve places') >= 1);
    ok('P8-B2 nor register a learner against it', p8Register(cp.id, 'IA-L-X', bt.code, 'X', 'not mine').denied === true);
    // test data: a reservation record of the first agency, to check the other agency's direct calls
    P8().recs.push({ id: 'RSV-T1', agency: cp.agency, bundle: cp.id, batch: bt.code, course: bt.course, optId: 'X', state: 'active', seat: null, hist: [] });
    ok('P8-B3 nor release, move or name another agency\'s reservation (refused, logged)', p8Release('RSV-T1', 'x').denied && p8MoveRequest('RSV-T1', bt.code, 'x').denied && p8Name('RSV-T1', 'IA-L-X', 'x').denied && P8().recs.find(r => r.id === 'RSV-T1').state === 'active');
    P8().recs = P8().recs.filter(r => r.id !== 'RSV-T1');
    AGY(agIdOf(cp.agency)); const y = p8BatchWhy(cp, bt, (r1Opts((p8Prog(bt) || {}).id) || [])[0] ? r1Opts(p8Prog(bt).id)[0].id : '', 1); // a single-price programme: no fee option (the batch's mode)
    ok('P8-B4 a legacy batch without a configured time zone can\'t take reservations (fail closed)', /time zone/.test(y || ''), y);
    setAdminIdentity('A'); S.portal = 'admin'; ok('P8-B5 the admin console has no reservation shortcut', p8Reserve(cp.id, bt.code, 'X', 1, 'admin').denied === true);
  });

  // P9 review A: single-price programmes (Level 2 here) — the established programme price and the batch's delivery mode; no fee
  // option invented; Level 3 fee-option validation and the legacy option's batch mode kept; ambiguous configurations refused.
  await T('P8-C single-price programmes', async () => {
    fresh(); const L2 = s3Pr('NV-L2'), B3 = ADMIN.bundles.find(b => b.id === 'BN-03'), bt = chBatch('L2DC-JAN27'), opts0 = J(R1().opts);
    bt.tz = 'Europe/London'; AGY('AG-02');
    const ch = p8Choice(L2, bt, '');
    ok('P8-C1 a Level 2 programme (one price, no fee options) resolves to its approved programme price and the batch\'s own mode', !r1IsL3Pid(L2.id) && ch.optId === null && ch.mode === bt.dmode && ch.price.kind === 'programme price' && ch.price.fee === s4PlanCur(L2.id).fee && ch.price.v === s4PlanCur(L2.id).v, J(ch));
    ok('P8-C2 a mode the batch isn\'t open for is refused (Level 2 delivery-mode rule kept); a fee option ID is refused (none exists)', /isn't open for Self-Paced/.test(p8BatchWhy(B3, bt, 'Self-Paced', 1)) && /one programme price/.test(p8BatchWhy(B3, bt, 'L3-FO-STD', 1)));
    const r = p8Reserve(B3.id, bt.code, '', 1, 'Level 2 January intake', 'kL2'), rv = r.ok && p8Of(r.ids[0]);
    ok('P8-C3 a reservation on the single-price batch: no fee option, the batch\'s mode, the programme price recorded; one P1 place', r.ok && rv.optId === null && rv.mode === 'Fully Assisted' && rv.price.kind === 'programme price' && SEATS().recs.filter(s => s.resv === rv.id && seatIsActive(s)).length === 1, J(r));
    ok('P8-C4 no fee option was created for the programme (R1 unchanged)', J(R1().opts) === opts0 && !R1().opts['NV-L2']);
    AGY('AG-02'); const L = agyCreateLearner('P8 Level 2 Learner (demo)', 'p8.l2@careplus-staff.example', '+44 7700 960999', 'Created', ''), nm = p8Name(rv.id, L.id, 'named'), ap = nm.ok && ADMIN.apps.find(x => x.agySeat === nm.assign);
    ok('P8-C5 naming it: the application records the batch and the mode (no fee option), so NB-1\'s "no option and batch" no longer blocks it', nm.ok && !!ap && ap.batch === bt.code && ap.mode === 'Fully Assisted' && ap.optId === null && ac2AppWhy(ap, 'approve') !== NB_AGY_WHY, J([nm, ap && ac2AppWhy(ap, 'approve')]));
    const c0 = p7Bal(B3).consumed; ap.status = 'Approved'; render(); const sr = SEATS().recs.find(s => s.id === rv.seat);
    ok('P8-C6 approval confirms it: one entitlement consumed, the same place becomes the learner\'s', rv.state === 'confirmed' && p7Bal(B3).consumed === c0 + 1 && sr.lid === L.id && seatIsActive(sr));
    const amb = { ...JSON.parse(J(bt)), code: 'P8-AMB', crModes: ['Self-Paced', 'Fully Assisted'] }, nom = { ...JSON.parse(J(bt)), code: 'P8-NOM', dmode: null };
    ok('P8-C7 ambiguous: a single-price batch open for two modes needs the mode named; a batch with no mode recorded is refused', /choose the delivery mode/.test(p8Choice(L2, amb, '').why || '') && p8Choice(L2, amb, 'Self-Paced').mode === 'Self-Paced' && /no delivery mode/.test(p8Choice(L2, nom, '').why || ''), J([p8Choice(L2, amb, ''), p8Choice(L2, nom, '')]));
    const L3 = s3Pr('NV-L3'), b3 = chBatch('L3AC-JAN27-MAN'), std = p8Choice(L3, b3, 'L3-FO-STD');
    ok('P8-C8 Level 3: the legacy "Standard programme fee" option takes the batch\'s mode (not null); a mode instead of a fee option, or an option the batch doesn\'t take, is refused', std.optId === 'L3-FO-STD' && std.mode === b3.dmode && /fee option/.test(p8Choice(L3, b3, 'Fully Assisted').why || '') && /doesn't take/.test(p8Choice(L3, { ...JSON.parse(J(b3)), w1opts: [] }, 'L3-FO-STD').why || ''), J(std));
    const pl = s4PlanCur(L2.id), f0 = pl.fee; pl.fee = 0; const y = p8Choice(L2, bt, ''); pl.fee = f0;
    ok('P8-C9 a single-price programme without an approved price is refused', /no approved programme price/.test(y.why || ''), J(y));
    ok('P8-C10 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
