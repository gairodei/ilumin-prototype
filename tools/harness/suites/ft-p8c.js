// P8 — agency fixed-batch reservations, client demo (FIXTURE=client). Phase 0: the end-to-end example (20 entitlements, 8 confirmed
// learners, 5 places reserved in February and 4 in March, 3 available; one February place confirmed for a learner; one March place
// released; another moved to April with Academic Admin approval); eligibility and Finance refusals; cutoff release in London and Dubai
// (DST); expiry; rescheduling; double-spend; failures; authority; P1 / P5 / P6 isolation. Phase 1: a real reload, a copy saved before
// P8, Reset.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p8c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || $1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P8 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { closeModal(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AGY = (id = 'AG-02') => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); STORE.agy.offset = 0; };
  const create = (name, course, seats) => { BIZ(); go('a-bundles', { tab: 'catalogue' }); click($1('main [data-act="newBundle"]')); $1('#bp-n').value = name; $a('#modal-root .bp-c').forEach(x => { x.checked = x.value === course; }); $1('#bp-s').value = String(seats); INP.bpCalc(); const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal(); return STORE.biz.products[n0]; };
  const publish = p => { BIZ(); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1('main .ag1-pub [data-act="bPublish"]')); reason('P8 publish'); };
  const buyCard = (p, qty, outcome = 'success') => { AGY(); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); $1('#gq').value = String(qty); INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = outcome; prim(); const x = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null; return x; };
  const D0 = () => ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27');
  const mk = (code, start, o = {}) => { const s = D0(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start, end: new Date(Date.parse(start) + 380 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [], mcA: {}, mcH: [], cap: 10, tz: 'Europe/London' }, o); delete c.tzHist; delete c.p5Test; ADMIN.batches.push(c); return c; };
  const NVQ = () => (nvqBundleCourses()[0] || {}).title;
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  let nInv = 0; const invite = () => { AGY(); nInv++; return agyCreateLearner(`P8 Learner ${nInv} (demo)`, `p8.learner${nInv}@careplus-staff.example`, '+44 7700 96' + String(1000 + nInv), 'Created', ''); };
  const approve = assignId => { const ap = ADMIN.apps.find(x => x.agySeat === assignId); if (ap) ap.status = 'Approved'; render(); return ap; }; // the admission decision itself is AC-2's; here its effect
  const act = code => SEATS().recs.filter(r => r.batch === code && seatIsActive(r));
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const bal = b => p7Bal(b);
  let B, JAN, FEB, MAR, APR, SP;

  if (PH === 0) {
    await T('P8C-A the end-to-end example', async () => {
      reset(); D0().tz = 'Europe/London'; SP = opt('Self-Paced');
      const p = create('P8 NVQ — 20 entitlements (demo)', NVQ(), 20); publish(p); const pur = buyCard(p, 20); B = ADMIN.bundles.find(b => b.id === pur.bundle); render();
      JAN = mk('P8-JAN', '2027-01-20T09:00:00Z', { cap: 12 }); FEB = mk('P8-FEB', '2027-02-10T09:00:00Z'); MAR = mk('P8-MAR', '2027-03-10T09:00:00Z'); APR = mk('P8-APR', '2027-04-14T09:00:00Z');
      ok('P8C-A1 a paid bundle creates 20 entitlements and no batch place', bal(B).purchased === 20 && bal(B).free === 20 && !SEATS().recs.some(r => r.kind === 'agencyReserved'));
      const ids = []; for (let i = 0; i < 8; i++) { const L = invite(); const r = p8Register(B.id, L.id, 'P8-JAN', SP.id, 'Confirmed cohort'); ids.push(r.assign); }
      const x0 = bal(B); ok('P8C-A2 eight learners registered (explicit batch and fee option): waiting, nothing consumed, no place taken yet', x0.pending === 8 && x0.consumed === 0 && act('P8-JAN').length === 0 && ids.every(Boolean), J(x0));
      ids.forEach(approve); const x1 = bal(B);
      ok('P8C-A3 eight approvals confirm eight enrolments: 8 consumed, 8 named places in P8-JAN', x1.consumed === 8 && x1.pending === 0 && act('P8-JAN').filter(r => r.lid && r.kind === 'sponsored').length === 8, J(x1));
      AGY(); const f = p8Reserve(B.id, 'P8-FEB', SP.id, 5, 'February intake', 'kFEB'), m = p8Reserve(B.id, 'P8-MAR', SP.id, 4, 'March intake', 'kMAR'), x2 = bal(B);
      ok('P8C-A4 5 unnamed places in February and 4 in March: 20 = 8 confirmed + 9 reserved + 3 available', f.ok && m.ok && x2.purchased === 20 && x2.consumed === 8 && x2.reserved === 9 && x2.free === 3 && x2.consumed + x2.reserved + x2.pending + x2.free === 20, J(x2));
      ok('P8C-A5 each reservation takes exactly one batch place (P1, kind agencyReserved) and one commitment; bundle.used projects 17', act('P8-FEB').filter(r => r.kind === 'agencyReserved').length === 5 && act('P8-MAR').filter(r => r.kind === 'agencyReserved').length === 4 && FEB.enrolled === 5 && B.used === 17 && left(B) === 3);
      const n0 = P8().recs.length; const again = p8Reserve(B.id, 'P8-FEB', SP.id, 5, 'February intake', 'kFEB');
      ok('P8C-A6 retrying the same request (same key) creates nothing', again.ok && again.dup && P8().recs.length === n0 && act('P8-FEB').length === 5);
      // Confirm one learner from a February reservation
      const rf = P8().recs.find(r => r.batch === 'P8-FEB' && r.state === 'active'), L = invite(), nm = p8Name(rf.id, L.id, 'Named for February'), x3 = bal(B);
      ok('P8C-A7 naming a reserved place: named, admission pending; nothing consumed; still one place', nm.ok && rf.state === 'named' && x3.consumed === 8 && x3.reserved === 9 && x3.free === 3 && act('P8-FEB').length === 5);
      const s0 = rf.seat; approve(nm.assign); const x4 = bal(B), seat = SEATS().recs.find(r => r.id === s0);
      ok('P8C-A8 confirmed from the reservation: one entitlement consumed (8 → 9), reserved 9 → 8, available still 3; the same place is now hers; no second place', rf.state === 'confirmed' && x4.consumed === 9 && x4.reserved === 8 && x4.free === 3 && act('P8-FEB').length === 5 && seat.lid === L.id && seat.kind === 'sponsored' && seatIsActive(seat), J(x4));
      // Release one March reservation
      const rm = P8().recs.find(r => r.batch === 'P8-MAR' && r.state === 'active'); AGY(); const rel = p8Release(rm.id, 'Fewer learners'); const x5 = bal(B);
      ok('P8C-A9 releasing a March place: the place and the entitlement come back (March 4 → 3; available 3 → 4)', rel.ok && rm.state === 'released' && act('P8-MAR').length === 3 && x5.reserved === 7 && x5.free === 4, J(x5));
      ok('P8C-A10 releasing again changes nothing', p8Release(rm.id, 'again').ok === false && act('P8-MAR').length === 3);
      // Move another March reservation to April with Academic Admin approval
      const mv = P8().recs.find(r => r.batch === 'P8-MAR' && r.state === 'active'); AGY(); const q = p8MoveRequest(mv.id, 'P8-APR', 'Learners prefer April');
      ok('P8C-A11 the agency requests the move: nothing moves until an Academic Admin decides', q.ok && mv.batch === 'P8-MAR' && act('P8-APR').length === 0);
      FA(); ok('P8C-A12 Finance can\'t approve it', p8MoveDecide(q.id, 'approve', 'x').ok === false);
      ACA(); go('a-resvmoves'); ok('P8C-A13 the Academic Admin sees it on Reservation moves', main().includes(q.id));
      const d = p8MoveDecide(q.id, 'approve', 'Approved — April has room'), x6 = bal(B);
      ok('P8C-A14 approved and moved once: March 3 → 2, April 0 → 1; the same reservation and entitlement (reserved still 7, available 4)', d.ok && mv.batch === 'P8-APR' && act('P8-MAR').length === 2 && act('P8-APR').length === 1 && x6.reserved === 7 && x6.free === 4 && x6.consumed === 9, J(x6));
      ok('P8C-A15 the audit links the reservation, the places and the decision', mv.hist.some(h => /Moved P8-MAR → P8-APR/.test(h.what)) && aud('Reservation moved') === 1 && SEATS().recs.find(r => r.to && r.resv === mv.id && r.state === 'transferred'));
      ok('P8C-A16 duplicate approval changes nothing', p8MoveDecide(q.id, 'approve', 'again').ok === false && act('P8-APR').length === 1);
      ok('P8C-A17 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
      SS.setItem(K + 'bal', J([bal(B), B.id]));
    });

    await T('P8C-B eligibility and Finance', async () => {
      AGY(); const w = (c, o = SP.id, n = 1) => p8BatchWhy(B, typeof c === 'string' ? chBatch(c) : c, o, n);
      ok('P8C-B1 a full batch is refused', /place/.test(w(mk('P8-FULL', '2027-02-20T09:00:00Z', { cap: 0 }))));
      ok('P8C-B2 another programme\'s batch is refused', /doesn't cover/.test(w(mk('P8-OTHER', '2027-02-20T09:00:00Z', { course: 'Another programme' }))));
      ok('P8C-B3 an unknown fee option is refused', /fee option/.test(w('P8-FEB', 'NOPE')));
      const fa = opt('Fully Assisted'); ok('P8C-B4 a batch that doesn\'t take the fee option (delivery mode) is refused', !fa || /doesn't take the fee option/.test(w(mk('P8-SPONLY', '2027-02-20T09:00:00Z', { w1opts: [SP.id] }), fa.id)));
      ok('P8C-B5 a batch outside the agency\'s region is refused', /region/.test(w(mk('P8-DXB', '2027-02-20T09:00:00Z', { label: 'Dubai Cohort (P8)', mode: 'Classroom', tz: 'Asia/Dubai' }))), w(chBatch('P8-DXB')));
      ok('P8C-B6 no configured time zone: refused (fail closed)', /time zone/.test(w(mk('P8-NOTZ', '2027-02-20T09:00:00Z', { tz: null }))));
      ok('P8C-B7 more than the unreserved entitlements: refused', /unreserved entitlement/.test(w('P8-FEB', SP.id, 5)));
      const pur = STORE.agy.purchases.find(p => p.bundle === B.id), st = pur.status; pur.status = 'Pending'; const y1 = w('P8-FEB'); pur.status = st;
      ok('P8C-B8 a purchase that isn\'t paid can\'t back a reservation', /isn't paid/.test(y1), y1);
      const inv = { id: 'AQ-P8', type: 'Agency invoice purchase', status: 'Approved', data: { bundleId: B.id } }; ADMIN.queue.push(inv); const y2 = w('P8-FEB'); ADMIN.queue = ADMIN.queue.filter(i => i !== inv);
      ok('P8C-B9 an unpaid invoice can\'t back a reservation', /invoice/.test(y2), y2);
      const q0 = buyCard(STORE.biz.products.find(p => p.name === 'P8 NVQ — 20 entitlements (demo)'), 2, 'pending');
      ok('P8C-B10 a pending card payment creates no bundle, so nothing can be reserved from it', q0.status === 'Pending' && !q0.bundle);
      SA(); const den = p8Reserve(B.id, 'P8-FEB', SP.id, 1, 'admin');
      ok('P8C-B11 reservations are the agency\'s: the admin console can\'t create one (no shortcut around Finance)', den.ok === false && den.denied);
    });

    await T('P8C-D double-spend, failures, direct confirmation', async () => {
      const x0 = bal(B), regs = []; for (let i = 0; i < x0.free; i++) { const L = invite(); regs.push(p8Register(B.id, L.id, 'P8-JAN', SP.id, 'fill')); }
      const extra = invite(), r = p8Register(B.id, extra.id, 'P8-JAN', SP.id, 'one too many');
      ok('P8C-D1 waiting registrations use the unreserved entitlements only; one more is refused (the reserved ones can\'t be spent)', regs.every(x => x.ok) && r.ok === false && /unreserved/.test(r.why) && bal(B).reserved === x0.reserved, J([x0, r.why]));
      const a = regs[0].assign, keep = seatConvert; approve(a); ok('P8C-D2 a direct confirmation (no reservation) takes one place and consumes one entitlement', !!p7ConsOf(a) && act('P8-JAN').some(s => s.lid === STORE.agy.assign.find(z => z.id === a).lid));
      const rf = P8().recs.find(z => z.batch === 'P8-FEB' && z.state === 'active'), L = invite(), nm = p8Name(rf.id, L.id, 'fail test'), c0 = bal(B).consumed;
      seatConvert = () => null; try { approve(nm.assign); } finally { seatConvert = keep; }
      ok('P8C-D3 a confirmation that fails part-way: nothing consumed, the reservation still named and holding its place (the next pass retries it)', bal(B).consumed === c0 && rf.state === 'named' && seatIsActive(SEATS().recs.find(s => s.id === rf.seat)) && !p7ConsOf(nm.assign));
      render(); ok('P8C-D4 the failure is listed for reconciliation, not repeated', P7().rec.filter(x => x.ref === nm.assign).length <= 1);
    });

    await T('P8C-E expiry, extension, rescheduling', async () => {
      const ex = p7ExtRequest; AGY(); const er = p7ExtRequest(B.id, ymdAdd(B.validity.slice(0, 10), 60), 'More time'); BIZ(); p7ExtDecide(er.id, 'approve', 'ok'); void ex;
      ok('P8C-E1 a bundle extension keeps the reservations and the balance', P8().recs.filter(r => P8_LIVE.includes(r.state)).length === bal(B).reserved && bal(B).purchased === 20);
      const fb = FEB, s0 = fb.start, live = P8().recs.find(r => r.batch === 'P8-FEB' && r.state === 'active'), cut0 = live.cutoff;
      fb.start = '2027-03-20T09:00:00Z'; render(); ok('P8C-E2 batch rescheduled later: the release date follows, recorded in the reservation history', live.cutoff !== cut0 && live.hist.some(h => h.what === 'Batch schedule changed') && live.state === 'active');
      fb.tz = 'Asia/Dubai'; render(); ok('P8C-E3 batch time zone changed: the release instant follows the new zone', live.cutoff === new Date(p8Cut(fb).releaseAt).toISOString());
      fb.tz = 'Europe/London'; fb.start = new Date(now().getTime() + 10 * 864e5).toISOString(); render();
      ok('P8C-E4 batch rescheduled earlier past its cutoff: unnamed places released (traceably); the named and confirmed ones untouched', live.state === 'released' && P8().recs.filter(r => r.batch === 'P8-FEB' && r.state === 'confirmed').every(r => seatIsActive(SEATS().recs.find(s => s.id === r.seat))));
      fb.start = s0; render();
      AGY(); const rn = P8().recs.find(r => r.batch === 'P8-MAR' && r.state === 'active'), Ln = invite(), nn = rn && p8Name(rn.id, Ln.id, 'named before expiry'); // a named place whose learner isn't confirmed before the bundle expires
      const off = agDays(B.validity) + 1; STORE.agy.offset = off; render(); const x = bal(B);
      ok('P8C-E5 the bundle expires with places still unnamed or named: they end (expired), their places are freed, nothing is revived', P8().recs.filter(r => r.bundle === B.id).every(r => !P8_LIVE.includes(r.state)) && x.available === 0 && x.reserved === 0 && x.expiredUnused === x.purchased - x.consumed && SEATS().recs.filter(r => r.kind === 'agencyReserved' && seatIsActive(r)).length === 0, J(x));
      const named = nn && nn.ok && STORE.agy.assign.find(a => a.id === nn.assign && /Not enrolled/.test(a.status)); const ap = named && ADMIN.apps.find(z => z.agySeat === named.id);
      ok('P8C-E6 approval after expiry is refused (no confirmation from expired backing)', !!ap && !!ac2AppWhy(ap, 'approve'));
      ok('P8C-E7 confirmed learners keep their places after the bundle expired', P8().recs.filter(r => r.state === 'confirmed').every(r => seatIsActive(SEATS().recs.find(s => s.id === r.seat))) && act('P8-JAN').filter(r => r.lid).length >= 8);
      STORE.agy.offset = 0; render();
      ok('P8C-E8 moving the agency clock back doesn\'t revive the ended reservations', P8().recs.filter(r => r.bundle === B.id).every(r => !P8_LIVE.includes(r.state)));
    });

    await T('P8C-C cutoff release (London, Dubai, DST), duplicates, protection', async () => {
      // its own bundle and June batch: the clock moves past every earlier cutoff here, so this runs after the February / March checks
      const p2 = create('P8 NVQ — 3 entitlements (demo)', NVQ(), 3); publish(p2); const pu2 = buyCard(p2, 3), B2 = ADMIN.bundles.find(b => b.id === pu2.bundle); render(); if (!B2) ok('P8C-C0 second purchase', false, J([p2 && p2.status, pu2 && pu2.status, pu2 && pu2.bundle])); mk('P8-JUN', '2027-06-16T09:00:00Z');
      AGY(); const rj = p8Reserve(B2.id, 'P8-JUN', SP.id, 1, 'June intake', 'kJUN'); const c = p8Cut(chBatch('P8-JUN'));
      ok('P8C-C1 London (summer time): release at the start of the local day 28 days before 16 Jun 2027 — 19 May 2027 00:00 BST (18 May 23:00 UTC)', rj.ok && c.releaseYmd === '2027-05-19' && c.releaseAt === Date.parse('2027-05-18T23:00:00Z'), J(rj));
      const dst = p8Cut({ code: 'X', start: '2027-04-25T09:00:00Z', tz: 'Europe/London' }), dub = p8Cut({ code: 'Y', start: '2027-01-30T09:00:00Z', tz: 'Asia/Dubai' });
      ok('P8C-C2 DST: start 25 Apr 2027 → release 28 Mar 2027 00:00 GMT (the clocks-forward day)', dst.releaseYmd === '2027-03-28' && dst.releaseAt === Date.parse('2027-03-28T00:00:00Z'));
      ok('P8C-C3 Dubai: start 30 Jan 2027 → release 2 Jan 2027 00:00 GST (1 Jan 20:00 UTC)', dub.releaseYmd === '2027-01-02' && dub.releaseAt === Date.parse('2027-01-01T20:00:00Z'));
      const live = P8().recs.find(r => r.batch === 'P8-JUN' && r.state === 'active');
      Clock.freeze(new Date(c.releaseAt - 1).toISOString()); render(); ok('P8C-C4 one millisecond before the cutoff: still reserved', live.state === 'active');
      Clock.freeze(new Date(c.releaseAt).toISOString()); render(); const n1 = aud('Reservation released (cutoff)'); render(); render();
      ok('P8C-C5 at the cutoff: released automatically, once; the place freed', live.state === 'released' && live.auto && act('P8-JUN').length === 0 && aud('Reservation released (cutoff)') === n1 && n1 >= 1);
      ok('P8C-C6 a new reservation after the cutoff is refused', /cutoff/.test(p8BatchWhy(B2, chBatch('P8-JUN'), SP.id, 1)));
      const conf = P8().recs.find(r => r.state === 'confirmed'); AGY(); ok('P8C-C7 a confirmed learner\'s place is never released by a reservation action', p8Release(conf.id, 'try').ok === false && seatIsActive(SEATS().recs.find(r => r.id === conf.seat)));
      Clock.unfreeze();
    });

    await T('P8C-F isolation', async () => {
      const am = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /^Amira/.test(w.me.first || '') && w.signup), r0 = J(P8().recs), p50 = am && p5Decide(am).code;
      ok('P8C-F1 P5: a learner\'s access decision is unchanged by reservations; agency learners have no access from a reservation (no account record changed)', p50 === 'P5-LEGACY');
      ok('P8C-F2 P6: a named learner transfer still needs approval (chDoMove refused); reservations untouched', chDoMove(am.me.id, D0(), JAN, 'direct') === false && J(P8().recs) === r0);
      ok('P8C-F3 REVISED-1 still can\'t be activated; P1 invariants', p2Activate('REVISED-1', 'P8') === false && seatInvariants().length === 0, J(seatInvariants()));
      AGY(); go('g-bundle', { id: B.id }); ok('P8C-F4 the agency bundle page shows the reservations', !!$1('main .p8-res'));
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('P8C-G reload, an older copy, Reset', async () => {
      const [x0, bid] = JSON.parse(SS.getItem(K + 'bal')), b = ADMIN.bundles.find(z => z.id === bid);
      ok('P8C-G1 after a real reload: the reservations and places are kept; invariants hold', !!b && P8().recs.length > 0 && seatInvariants().length === 0 && SEATS().recs.some(r => r.kind === 'agencyReserved' || r.resv));
      const keep = P7().resv; delete P7().resv; render();
      ok('P8C-G2 a copy without the reservation store (saved before P8) opens with no reservations and no errors', P8().recs.length === 0); P7().resv = keep; void x0;
      reset(); ok('P8C-G3 Reset: no reservations, no reserved places', P8().recs.length === 0 && !SEATS().recs.some(r => r.kind === 'agencyReserved'));
    });
  }

  Clock.unfreeze(); if (STORE.agy) STORE.agy.offset = 0;
  ['phase', 'R', 'bal'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
