/* ============================================================
   P8 — Agency fixed-batch reservations (12 Nov 2026; PD-P8-* in PROVISIONAL-DECISIONS.md; PD-P0-10, 11, 12 in
   P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p7-entitlements.js.
   A reservation is one unnamed guaranteed place in one existing batch, backed by one purchased entitlement of the agency's own bundle.
   It is recorded once (P7().resv.recs) and points at exactly one P1 seat record (kind agencyReserved) and one entitlement commitment —
   no separate counter: batch occupancy is P1's, entitlement balances are P7's ledger plus the active reservations.
   - States: active (unnamed) → named (a learner registered on it, pending admission) → confirmed (the P1 place becomes the learner's
     and one entitlement is consumed — a move, not a second deduction); or released (voluntary or at the cutoff), expired (the bundle
     expired before confirmation) or invalidated (the batch closed). Confirmed places are never released by reservation actions.
   - Balances: purchased = consumed + waiting (P7 provisional assignments without a reservation) + reserved + available (+ lapsed once
     expired). A pending named assignment can't spend a reserved entitlement.
   - Creation: the agency chooses the batch and fee option explicitly; every eligibility rule is checked immediately before the change;
     the P1 places and the commitments are created together or not at all; a retried request (same key) creates nothing.
   - Release: at the start of the batch-local day 28 calendar days before the batch's local start date (configured IANA zone required),
     or earlier by the agency. Moving a reservation needs an Academic Admin's approval (Super Administrator override audited).
   - Finance: only a bundle with Finance-cleared backing (p8Auth) — P9 can widen p8Auth with approved arrangements.
   Browser-only: production enforces this on the server.
   ============================================================ */
'use strict';

const P8_RULE = 'P8-RSV-1';
const P8_LIVE = ['active', 'named'];
const P8 = () => { const X = P7(); if (!X.resv) X.resv = { seq: 0, gseq: 0, recs: [], keys: {}, mv: { seq: 0, reqs: [] } }; return X.resv; };
const p8Of = id => P8().recs.find(r => r.id === id) || null;
const p8Live = b => P8().recs.filter(r => r.bundle === b.id && P8_LIVE.includes(r.state));
const p8Hist = (r, what, why, by) => r.hist.push({ at: now().toISOString(), what, by: by || p7Who().name, why: why || '' });
const p8Agency = name => (ADMIN.agencies || []).find(a => a.name === name) || null;

/* ---------- P1: places for one reservation record (never taken by "any unnamed place" operations) ---------- */
const seatRecById = id => SEATS().recs.find(r => r.id === id) || null;
function seatReleaseRec(r, why) { if (!r || !seatIsActive(r)) return null; seatTrans(r, 'released', why); seatBump(); return r; }
function seatMoveRec(r, to, why) {
  if (!r || !seatIsActive(r) || !to) return null; seatBind(to); if (seatCount(to.code) >= (+to.cap || 0)) { seatLog('Refused: move reservation (destination full)', to, r.id); return null; }
  const nr = seatRec(to, { kind: 'agencyReserved', agency: r.agency, ent: r.ent, origin: 'Reservation moved', from: r.id, why }); nr.resv = r.resv;
  seatTrans(r, 'transferred', `${why} → ${to.code}`); r.to = nr.id; seatBump(); return nr;
}
function seatConvert(r, lid, o = {}) {
  if (!r || !seatIsActive(r) || r.lid || !seatLidOk(lid)) return null;
  if (seatActive(r.batch, lid)) return null; // the learner already has a place in this batch
  r.lid = lid; r.kind = 'sponsored'; r.v = o.v || null; r.name = o.name || null; r.converted = now().toISOString();
  seatTrans(r, 'occupied', o.why || 'Reservation confirmed for a named learner'); seatBump(); return r;
}

/* ---------- Finance authorisation (P9 extends this with approved arrangements) ---------- */
function p8Auth(b) {
  if (!b) return { ok: false, why: 'No bundle' };
  const pur = (STORE.agy.purchases || []).find(p => p.bundle === b.id);
  if (pur && pur.status !== 'Paid') return { ok: false, why: `The purchase ${pur.ref || ''} isn't paid (${pur.status})` };
  const inv = (ADMIN.queue || []).find(i => i.data && i.data.bundleId === b.id);
  if (inv && !/Paid|Processed/.test(inv.status + ' ' + ((inv.data || {}).paid ? 'Paid' : ''))) return { ok: false, why: `The invoice ${inv.id} isn't paid` };
  const ref = (pur && pur.ref) || p7PurchaseRef(b);
  if (!ref) return { ok: false, why: 'No Finance-cleared payment is recorded for this bundle' };
  const open = ((STORE.fin && STORE.fin.pending) || []).find(x => x.agyRef && x.agyRef === ref && x.status === 'Pending');
  if (open) return { ok: false, why: `A payment for this bundle is unresolved in Finance (${open.id})` };
  const refund = (ADMIN.queue || []).find(i => i.type === 'Refund' && ['Pending', 'Info Requested', 'Escalated'].includes(i.status) && JSON.stringify(i.data || {}).includes(ref));
  if (refund) return { ok: false, why: `A refund of this bundle's payment is open (${refund.id})` };
  return { ok: true, evidence: pur ? `Card payment ${pur.ref} (paid)` : inv ? `Invoice ${inv.id} (paid)` : `Credited purchase ${ref}`, ref };
}

/* ---------- Balances: reservations are a commitment category of P7's ledger ---------- */
const _balP8 = p7Bal;
p7Bal = function (b) {
  const x = _balP8.apply(this, arguments), live = x.expired ? [] : p8Live(b);
  const pend = x.expired ? 0 : p7PendList(b).filter(a => !a.resv).length; // a named reservation is counted once, as reserved
  return { ...x, pending: pend, reserved: live.length, free: x.expired ? 0 : Math.max(0, x.purchased - x.consumed - pend - live.length) };
};
function p8Bind(b) {
  if (!b || !b.agency) return b; p7Bind(b);
  const d = Object.getOwnPropertyDescriptor(b, 'used'); if (d && d.get && d.get._p8) return b;
  const get = () => { const x = p7Bal(b); return x.consumed + x.pending + x.reserved; }; get._p7 = true; get._p8 = true;
  Object.defineProperty(b, 'used', { get, set: () => { /* projection */ }, enumerable: true, configurable: true });
  return b;
}
const p8BindAll = () => { if (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.bundles && STORE.agy) ADMIN.bundles.filter(b => b.agency).forEach(p8Bind); };
// A confirmation without a reservation can't use another's commitment
const _whyP8 = p7Why;
p7Why = function (b, a) {
  const y = _whyP8.apply(this, arguments); if (y || !a || a.resv) return y;
  const x = p7Bal(b), own = p7PendList(b).some(z => z.id === a.id && !z.resv) ? 1 : 0; // the learner's own waiting place counts as theirs
  return x.purchased - x.consumed - x.reserved - Math.max(0, x.pending - own) < 1 ? `${b.name} has no entitlement left that isn't reserved for a batch or waiting for another learner` : '';
};

/* ---------- Eligibility of a batch for a reservation or an agency registration ---------- */
function p8Cut(b) {
  const z = batchTz(b); if (z.source !== 'configured') return { why: `${b.code} has no Academy time zone configured — set it before reserving places (U-04 / U-05)` };
  const startYmd = ymdIn(b.start, z.tz), releaseYmd = ymdAdd(startYmd, -28);
  return { tz: z.tz, startYmd, releaseYmd, releaseAt: dayStart(releaseYmd, z.tz) };
}
const p8Prog = b => (s3Progs() || []).find(p => p.title === b.course) || null;
/* The learner's fee basis and delivery mode in a batch (P9 review, A). A programme with fee options (every Level 3 programme, and a
   Level 2/4/5 programme once Finance approved mode-specific options): an active option the batch accepts; its mode, or — for the
   legacy "Standard programme fee" option, which has none — the batch's own mode, exactly as for individual learners (PD-R1-02). A
   single-price programme (no fee options): the programme's current approved price (its payment plan) and a delivery mode the batch is
   ready for — the batch's only one, or the one named explicitly when it has several. No fee option is invented for it; anything that
   doesn't resolve to exactly one mode is refused as ambiguous. */
function p8Choice(pr, b, choice) {
  if (!pr || !b) return { why: 'That batch doesn\'t exist' };
  const ready = m => !crShowReady(b) || crReady(b, m) === 'ready';
  if (r1IsL3Pid(pr.id)) {
    const opt = r1Opts(pr.id).find(x => x.id === choice && x.status === 'Active'); if (!opt) return { why: 'Choose an active fee option of the programme' };
    if (!w1Accepts(b, opt.id)) return { why: `${b.code} doesn't take the fee option ${opt.label || opt.id}` };
    const mode = opt.mode || (opt.legacy ? b.dmode : null) || null;
    if (!mode) return { why: `${b.code} records no delivery mode for ${opt.label || opt.id} — the configuration is ambiguous` };
    if (!ready(mode)) return { why: `${b.code} isn't open for ${mode} enrolment yet` };
    return { optId: opt.id, mode, label: opt.label || opt.id, price: { kind: 'fee option', opt: opt.id, fee: r1FeeOf(opt), cur: 'GBP' } };
  }
  if (choice && !M_MODES.includes(choice)) return { why: `${pr.title} has one programme price — it has no fee option ${choice}` };
  const plan = s4PlanCur(pr.id); if (!plan || !(+plan.fee > 0)) return { why: `${pr.title} has no approved programme price` };
  const modes = crBModes(b).filter(ready);
  if (choice && !modes.includes(choice)) return { why: `${b.code} isn't open for ${choice} enrolment` };
  if (!choice && modes.length !== 1) return { why: modes.length ? `${b.code} takes ${modes.join(' and ')} — choose the delivery mode` : `${b.code} records no delivery mode — the configuration is ambiguous` };
  return { optId: null, mode: choice || modes[0], label: 'Programme price', price: { kind: 'programme price', pid: pr.id, v: plan.v, fee: plan.fee, cur: 'GBP' } };
}
const p8ChoiceOf = r => r.optId || r.mode; // what a reservation was made with (a fee option, or the mode of a single-price programme)
function p8BatchWhy(bundle, b, optId, n = 1, o = {}) {
  if (!bundle) return 'That bundle doesn\'t exist';
  if (!b) return 'That batch doesn\'t exist';
  if (!p7Covers(bundle, b.course)) return `${bundle.name} doesn't cover ${b.course}`;
  const pr = p8Prog(b); if (!pr || pr.status !== 'Active') return `${b.course} isn't an active programme`;
  const ch = p8Choice(pr, b, optId); if (ch.why) return ch.why;
  if (o.mode && ch.mode !== o.mode) return `${b.code} would record ${ch.mode}, not ${o.mode}`;
  const ag = p8Agency(bundle.agency), uae = ag && ag.region === 'UAE', inUae = chBatchCountry(b) === 'United Arab Emirates';
  if (!chIsOnline(b) && uae !== inUae) return `${b.code} runs in ${chBatchCountry(b)} — not in ${bundle.agency}'s region`;
  if (!['Open', 'Planned'].includes(b.status)) return `${b.code} is ${b.status}`;
  if (!nbStaffed(b)) return `${b.code} has no Academic Coordinator yet`;
  const c = p8Cut(b); if (c.why) return c.why;
  const cm = p6Comm(b); if (cm) return `${b.code} ${cm}`;
  if (now().getTime() >= c.releaseAt) return `The reservation cutoff for ${b.code} (${fmtTz(c.releaseAt, c.tz)}, 28 days before its start) has passed`;
  if (!o.skipCap && seatFree(b) < n) return `${b.code} has ${seatFree(b)} place${seatFree(b) === 1 ? '' : 's'} left`;
  if (!o.skipEnt) { if (p7Expired(bundle)) return `${bundle.name} expired on ${fd(bundle.validity)}`; const x = p7Bal(bundle); if (x.free < n) return `${bundle.name} has ${x.free} unreserved entitlement${x.free === 1 ? '' : 's'} left`; }
  const au = p8Auth(bundle); if (!au.ok) return au.why;
  return '';
}
const p8OwnWhy = bundle => S.portal === 'agency' ? (bundle && bundle.agency === AGN() ? '' : 'That bundle belongs to another agency.') : 'Reservations are made by the agency.';

/* ---------- Reserve, release ---------- */
function p8Reserve(bid, code, optId, n, why, key) {
  const bundle = (ADMIN.bundles || []).find(x => x.id === bid), b = chBatch(code), deny = p8OwnWhy(bundle);
  if (deny) { logA('Bundles & Licences', bid || '—', 'Blocked: reserve places', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  const X = P8(); if (key && X.keys[key]) return { ok: true, dup: true, ids: X.keys[key] };
  n = Math.floor(+n || 0); if (n < 1) return { ok: false, why: 'Enter how many places to reserve (1 or more).' };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  p8Bind(bundle); const y = p8BatchWhy(bundle, b, optId, n);
  if (y) { logA('Bundles & Licences', `${bid} · ${code || '—'}`, 'Blocked: reserve places', '—', 'No change', y); return { ok: false, why: y }; }
  const pr = p8Prog(b), opt = p8Choice(pr, b, optId), c = p8Cut(b), au = p8Auth(bundle), seats = [];
  for (let i = 0; i < n; i++) { const r = seatTake(b, { kind: 'agencyReserved', agency: bundle.agency, origin: 'Agency reservation', why: String(why).trim() }); if (!r) break; seats.push(r); }
  if (seats.length < n) { seats.forEach(r => seatReleaseRec(r, 'Reservation not created — not enough places')); logA('Bundles & Licences', `${bid} · ${code}`, 'Blocked: reserve places', '—', 'No change', `${b.code} filled while reserving`); return { ok: false, why: `${b.code} filled while reserving — nothing was reserved.` }; }
  const grp = 'RG-' + String(++X.gseq).padStart(4, '0'), at = now().toISOString(), who = p7Who(), ids = [];
  seats.forEach(s => {
    const r = { id: 'RSV-' + String(++X.seq).padStart(4, '0'), grp, agency: bundle.agency, agencyId: p7AgId(bundle.agency), bundle: bundle.id, prog: pr.id, course: b.course, batch: b.code, optId: opt.optId, mode: opt.mode, price: opt.price, version: b.progVersion || null, qty: 1, state: 'active', seat: s.id, lid: null, assign: null, created: at, by: who, why: String(why).trim(), cutoff0: new Date(c.releaseAt).toISOString(), tz0: c.tz, start0: b.start, cutoff: new Date(c.releaseAt).toISOString(), auth: { evidence: au.evidence, ref: au.ref }, rule: P8_RULE, hist: [] };
    s.resv = r.id; s.ent = bundle.id; p8Hist(r, 'Reserved', r.why, who.name); X.recs.push(r); ids.push(r.id);
  });
  if (key) X.keys[key] = ids;
  logA('Bundles & Licences', `${bundle.id} · ${b.code}`, 'Places reserved', '—', `${n} unnamed place${n === 1 ? '' : 's'} (${grp})`, `${String(why).trim()} — release ${fmtTz(c.releaseAt, c.tz)}; ${au.evidence}`);
  agyNotify('Places reserved', `${n} place${n === 1 ? '' : 's'} in ${b.code} (${opt.label} · ${opt.mode}) from ${bundle.name}. Unnamed places are released on ${fmtTz(c.releaseAt, c.tz)}.`, 'g-bundle.' + bundle.id, 'Seats & bundles', bundle.agency);
  return { ok: true, grp, ids };
}
function p8End(r, state, why, how) {
  if (!r || !P8_LIVE.includes(r.state)) return false;
  const s = seatRecById(r.seat); if (s && seatIsActive(s) && !s.lid) seatReleaseRec(s, why);
  r.state = state; r.ended = now().toISOString(); p8Hist(r, how, why);
  if (r.assign) { const a = (STORE.agy.assign || []).find(x => x.id === r.assign); if (a && !p7ConsOf(a.id)) { a.status = 'Not enrolled — reservation ' + state; a.p8Why = why; } }
  return true;
}
function p8Release(id, why) {
  const r = p8Of(id), bundle = r && (ADMIN.bundles || []).find(x => x.id === r.bundle), deny = !r ? 'That reservation doesn\'t exist.' : p8OwnWhy(bundle);
  if (deny) { logA('Bundles & Licences', id || '—', 'Blocked: release reservation', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (r.state !== 'active') return { ok: false, why: r.state === 'named' || r.state === 'confirmed' ? `${r.id} has a learner — a learner's place isn't released by reservation actions.` : `${r.id} is already ${r.state}.`, dup: r.state !== 'named' && r.state !== 'confirmed' };
  p8End(r, 'released', String(why || 'Released by the agency').trim(), 'Released by the agency');
  logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, 'Reservation released', r.id, 'Released', String(why || '').trim() || 'Released by the agency');
  agyNotify('Reservation released', `${r.id}: the place in ${r.batch} is free again; the entitlement is ${p7Expired(bundle) ? 'lapsed (the bundle has expired)' : 'available'}.`, 'g-bundle.' + r.bundle, 'Seats & bundles', r.agency);
  return { ok: true };
}

/* ---------- Named learners: registration on a reservation or directly; confirmation at admission approval ---------- */
function p8MakeAssign(bundle, L, b, opt, resv) {
  const a = { id: 'SA-' + (2000 + STORE.agy.assign.length), agency: bundle.agency, lid: L.id, learner: L.name, course: b.course, bundle: bundle.id, at: agNow().toISOString(), start: agNow().toISOString(), end: bundle.validity, status: 'Admission pending', progress: 0, quiz: { used: 0, max: 3, result: '—' }, by: p7Who().name, kind: 'nvq', batch: b.code, optId: opt.optId, mode: opt.mode, price: opt.price, prog: (p8Prog(b) || {}).id || null, version: b.progVersion || null, resv: resv ? resv.id : null };
  STORE.agy.assign.push(a); const ap = ag1NvqApp(a, L, bundle); if (ap) Object.assign(ap, { mode: opt.mode, batch: b.code, optId: opt.optId, price: opt.price, p8: true });
  return { a, ap };
}
function p8Name(id, lid, why) {
  const r = p8Of(id), bundle = r && (ADMIN.bundles || []).find(x => x.id === r.bundle), deny = !r ? 'That reservation doesn\'t exist.' : p8OwnWhy(bundle), L = lid && learnerById(lid);
  if (deny) { logA('Bundles & Licences', id || '—', 'Blocked: name a reserved place', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (r.state !== 'active') return { ok: false, why: `${r.id} is ${r.state} — only an unnamed active reservation can be named.` };
  if (!L || !inRoster(lid)) return { ok: false, why: 'Choose a learner on your roster.' };
  const dup = agySeatDupWhy(L, r.course); if (dup) return { ok: false, why: dup };
  if (p7Expired(bundle)) return { ok: false, why: `${bundle.name} has expired.` };
  const b = chBatch(r.batch), { a, ap } = p8MakeAssign(bundle, L, b, { optId: r.optId || null, mode: r.mode, price: r.price || null }, r);
  r.state = 'named'; r.lid = lid; r.assign = a.id; p8Hist(r, 'Learner named (admission pending)', String(why || '').trim());
  logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, 'Reserved place named', r.id, `${L.name} — admission pending (${ap ? ap.id : '—'})`, String(why || '').trim() || 'Named by the agency');
  return { ok: true, assign: a.id, app: ap ? ap.id : null };
}
function p8Register(bid, lid, code, optId, why) {
  const bundle = (ADMIN.bundles || []).find(x => x.id === bid), deny = p8OwnWhy(bundle), L = lid && learnerById(lid), b = chBatch(code);
  if (deny) { logA('Bundles & Licences', bid || '—', 'Blocked: register agency learner', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (!L || !inRoster(lid)) return { ok: false, why: 'Choose a learner on your roster.' };
  const dup = agySeatDupWhy(L, b ? b.course : ''); if (dup) return { ok: false, why: dup };
  p8Bind(bundle); const y = p8BatchWhy(bundle, b, optId, 1); if (y) { logA('Bundles & Licences', `${bid} · ${code || '—'}`, 'Blocked: register agency learner', '—', 'No change', y); return { ok: false, why: y }; }
  const opt = p8Choice(p8Prog(b), b, optId), { a, ap } = p8MakeAssign(bundle, L, b, opt, null);
  logA('Bundles & Licences', `${bid} · ${b.code}`, 'Agency learner registered', '—', `${L.name} — ${opt.label} · ${opt.mode}, ${b.code}; admission pending (${ap ? ap.id : '—'})`, String(why || '').trim());
  return { ok: true, assign: a.id, app: ap ? ap.id : null };
}
// Approval is refused unless the confirmation can happen: the reservation still named and valid, or a free place in the chosen batch
const p8AppSeat = ap => p7AppSeat(ap);
const _appWhyP8 = ac2AppWhy;
ac2AppWhy = function (ap, act) {
  const why = _appWhyP8.apply(this, arguments); if (why || act !== 'approve') return why;
  const a = p8AppSeat(ap); if (!a || !a.batch || p7ConsOf(a.id)) return why;
  const b = chBatch(a.batch); if (!b || ['Cancelled', 'Completed', 'Archived'].includes(b.status)) return `${a.batch} is no longer taking learners`;
  if (a.resv) { const r = p8Of(a.resv); return r && r.state === 'named' && r.assign === a.id ? '' : `The reserved place for ${a.learner} is no longer valid (${r ? r.state : 'missing'})`; }
  return seatFree(b) >= 1 ? '' : `${b.code} has no place left for ${a.learner}`;
};
function p8Confirm(a, ap) {
  const bundle = (ADMIN.bundles || []).find(x => x.id === a.bundle), b = chBatch(a.batch), L = learnerById(a.lid), k = L && agyWorldKey(L);
  if (a.resv) {
    const r = p8Of(a.resv), s = r && seatRecById(r.seat); if (!r || r.state !== 'named' || !s || !seatIsActive(s)) return { ok: false, why: 'The reserved place is no longer valid' };
    const c = p7Consume(bundle, a, 'Agency NVQ enrolment confirmed (reserved place)'); if (!c.ok) return c;
    if (!seatConvert(s, a.lid, { v: k || null, name: a.learner, why: `Confirmed for ${a.learner} (${ap.id})` })) { if (!c.dup) p7Undo(c.rec); return { ok: false, why: 'The reserved place couldn\'t be given to the learner' }; }
    r.state = 'confirmed'; c.rec.enrol = ap.id; p8Hist(r, 'Confirmed', `${a.learner} — ${ap.id}`); return { ok: true, seat: s.id };
  }
  const s = seatTake(b, { lid: a.lid, v: k || null, name: a.learner, kind: 'sponsored', agency: a.agency, ent: a.bundle, origin: 'Agency enrolment confirmed' });
  if (!s) return { ok: false, why: `${a.batch} has no place left` };
  const c = p7Consume(bundle, a, 'Agency NVQ enrolment confirmed'); if (!c.ok) { seatReleaseRec(s, 'Confirmation failed — place returned'); return c; }
  c.rec.enrol = ap.id; return { ok: true, seat: s.id };
}
const _nvqSyncP8 = p7NvqSync;
p7NvqSync = function () {
  (ADMIN.apps || []).filter(ap => ap.agySeat && ap.status === 'Approved').forEach(ap => {
    const a = p8AppSeat(ap); if (!a || !a.batch || p7ConsOf(a.id) || !P7_PROV.includes(a.status)) return;
    const out = p8Confirm(a, ap);
    if (out.ok) { a.status = 'Approved'; logA('Bundles & Licences', `${a.bundle} · ${a.batch}`, 'Agency enrolment confirmed', 'Admission pending', `${a.learner} — ${a.batch}`, `${ap.id}; one entitlement used; place ${out.seat}`); agyNotify('Enrolment confirmed', `${a.learner} is enrolled on ${a.course} in ${a.batch}.`, 'g-learner.' + a.lid, 'Courses & certificates', a.agency); }
    else if (!P7().rec.some(x => x.ref === a.id)) P7().rec.push({ bundle: a.bundle, ref: a.id, at: now().toISOString(), why: `${ap.id} was approved but the enrolment couldn't be confirmed: ${out.why}` });
  });
  // Applications registered with a batch are confirmed only above (place + entitlement together); P7's pass handles the others
  const all = ADMIN.apps; if (!all) return _nvqSyncP8.apply(this, arguments);
  ADMIN.apps = all.filter(ap => !(p8AppSeat(ap) || {}).batch); try { return _nvqSyncP8.apply(this, arguments); } finally { ADMIN.apps = all; }
};

/* ---------- Release at the cutoff, expiry, closed batches, rescheduling (idempotent) ---------- */
function p8Reconcile() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !STORE.agy) return; p8BindAll();
  P8().recs.filter(r => P8_LIVE.includes(r.state)).forEach(r => {
    const bundle = (ADMIN.bundles || []).find(x => x.id === r.bundle), b = chBatch(r.batch);
    if (!bundle || p7Expired(bundle)) { if (p8End(r, 'expired', `${bundle ? bundle.name : r.bundle} expired before the place was confirmed — the entitlement lapsed`, 'Expired with the bundle')) { logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, 'Reservation ended (bundle expired)', r.id, 'Expired', 'Unconfirmed places end with their bundle; no entitlement is revived'); agyNotify('Reservation ended', `${r.id} in ${r.batch} ended: the bundle expired before a learner was confirmed.`, 'g-bundle.' + r.bundle, 'Seats & bundles', r.agency); } return; }
    if (!b || ['Cancelled', 'Completed', 'Archived'].includes(b.status)) { if (p8End(r, 'invalidated', `${r.batch} is ${b ? b.status : 'missing'}`, 'Invalidated')) logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, 'Reservation invalidated', r.id, 'Invalidated', `${r.batch} is ${b ? b.status : 'missing'}`); return; }
    const c = p8Cut(b), cut = c.why ? null : new Date(c.releaseAt).toISOString();
    // Rescheduled (P9 review, C): the earlier release instant stays in the history (and cutoff0 keeps the one at creation); the new
    // instant, the start change that caused it and its source are recorded and audited. No remedy, refund or credit is applied.
    let moved = null;
    if (cut && cut !== r.cutoff) {
      const prev = r.cutoff, prevStart = r.start || r.start0, why = `${r.batch}'s start changed ${prevStart ? fd(prevStart) : '—'} → ${fd(b.start)}${b.tzName || c.tz ? ` (${c.tz})` : ''}`;
      moved = { prev, next: cut, earlier: !!prev && Date.parse(cut) < Date.parse(prev) };
      r.hist.push({ at: now().toISOString(), what: 'Batch schedule changed', by: 'System', why, prevCutoff: prev || null, newCutoff: cut, prevStart: prevStart || null, newStart: b.start });
      r.cutoff = cut; r.start = b.start;
      logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, 'Reservation release date changed', prev ? fmtTz(Date.parse(prev), c.tz) : '—', fmtTz(c.releaseAt, c.tz), `${r.id} (${r.state}): ${why}. No remedy, refund or credit applied (agency rescheduling policy not decided).`);
      agyNotify('Reservation release date changed', `${r.id} in ${r.batch}: ${why}. ${r.state === 'active' ? `An unnamed place is now released on ${fmtTz(c.releaseAt, c.tz)}.` : 'The named learner\'s place is not released by this change.'}`, 'g-bundle.' + r.bundle, 'Seats & bundles', r.agency);
    }
    if (r.state === 'active' && cut && now().getTime() >= c.releaseAt) {
      const resch = moved && moved.earlier && (!moved.prev || now().getTime() < Date.parse(moved.prev));
      const why = resch ? `Released at the next reconciliation: ${r.batch} was moved earlier, so its release date (${fmtTz(c.releaseAt, c.tz)}) had already passed — previously ${fmtTz(Date.parse(moved.prev), c.tz)}` : `Released automatically at ${fmtTz(c.releaseAt, c.tz)} (28 days before ${r.batch} starts)`;
      if (p8End(r, 'released', why, resch ? 'Released after rescheduling' : 'Released at the cutoff')) { r.auto = true; if (resch) r.resch = true; logA('Bundles & Licences', `${r.bundle} · ${r.batch}`, resch ? 'Reservation released (batch rescheduled earlier)' : 'Reservation released (cutoff)', r.id, 'Released', resch ? why : 'Unnamed 28 days before the start'); agyNotify('Unnamed place released', `${r.id} in ${r.batch}: ${why}. The entitlement is available again.`, 'g-bundle.' + r.bundle, 'Seats & bundles', r.agency); }
    }
  });
}
const _recP8 = p7Reconcile; p7Reconcile = function () { const r = _recP8.apply(this, arguments); try { p8Reconcile(); } catch (e) { /* drawn again next time */ } return r; };

/* ---------- Moving an unnamed reservation (Academic Admin approval) ---------- */
const P8_MV_OPEN = 'Pending Academic Approval';
const p8MvOf = id => P8().mv.reqs.find(q => q.id === id) || null;
function p8MoveRequest(id, code, why) {
  const r = p8Of(id), bundle = r && (ADMIN.bundles || []).find(x => x.id === r.bundle), deny = !r ? 'That reservation doesn\'t exist.' : p8OwnWhy(bundle);
  if (deny) { logA('Bundles & Licences', id || '—', 'Blocked: request reservation move', '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (r.state !== 'active') return { ok: false, why: `${r.id} is ${r.state} — only an unnamed active reservation can be moved.` };
  if (P8().mv.reqs.some(q => q.resv === r.id && q.state === P8_MV_OPEN)) return { ok: false, why: 'A move of this reservation is already waiting for a decision.' };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const src = chBatch(r.batch), y = p8MoveWhy(r, src, chBatch(code));
  if (y) { logA('Bundles & Licences', `${r.id} · ${code || '—'}`, 'Blocked: request reservation move', r.batch, 'No change', y); return { ok: false, why: y }; }
  const X = P8(), who = p7Who(), q = { id: 'RM-' + String(++X.mv.seq).padStart(4, '0'), resv: r.id, agency: r.agency, from: r.batch, to: code, by: who, at: now().toISOString(), why: String(why).trim(), state: P8_MV_OPEN, dec: null, exec: null, hist: [{ at: now().toISOString(), what: 'Requested', by: who.name, why: String(why).trim() }] };
  X.mv.reqs.unshift(q); logA('Bundles & Licences', `${r.id} · ${r.batch} → ${code}`, 'Reservation move requested', r.batch, code, q.why);
  if (typeof acaNotify === 'function') acaNotify('Reservation move to approve', `${r.agency}: ${r.id} ${r.batch} → ${code} (${q.id})`, 'a-resvmoves');
  return { ok: true, id: q.id };
}
function p8MoveWhy(r, src, to) {
  const bundle = (ADMIN.bundles || []).find(x => x.id === r.bundle);
  if (!to) return 'That batch doesn\'t exist'; if (to.code === r.batch) return `${r.id} is already in ${to.code}`;
  if (to.course !== r.course) return `${to.code} is a batch of another programme`;
  if (src) { const c = p8Cut(src); if (c.why) return c.why; if (now().getTime() >= c.releaseAt) return `The cutoff for ${src.code} has passed`; }
  return p8BatchWhy(bundle, to, p8ChoiceOf(r), 1, { skipEnt: true, mode: r.mode }) || (p7Expired(bundle) ? `${bundle.name} has expired` : '');
}
function p8MoveDecide(id, verb, why) {
  const q = p8MvOf(id), me = p7Who();
  const deny = !q ? 'That request doesn\'t exist.' : S.portal !== 'admin' ? 'Moves are decided in the admin console.' : verb === 'override' ? (isSA() ? '' : 'Only the Super Administrator can override.') : isSA() || (typeof isAca === 'function' && isAca()) ? (q.by && q.by.name === me.name && !isSA() ? 'You made this request — another Academic Admin decides it.' : '') : 'Only an Academic Admin approves reservation moves (or the Super Administrator by override).';
  if (deny) { logA('Bundles & Licences', q ? q.resv : id || '—', `Blocked: ${verb} reservation move`, q ? q.state : '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (q.state !== P8_MV_OPEN) return { ok: false, why: `${q.id} is already ${q.state.toLowerCase()} — nothing changed.`, dup: true };
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const at = now().toISOString(), w = String(why).trim(), kind = verb === 'refuse' ? 'refuse' : isSA() ? 'override' : 'approve';
  q.dec = { at, by: me.name, role: me.role, why: w, kind };
  if (verb === 'refuse') { q.state = 'Refused'; q.hist.push({ at, what: 'Refused', by: me.name, why: w }); logA('Bundles & Licences', `${q.resv} · ${q.from} → ${q.to}`, 'Reservation move refused', q.from, 'No change', w); agyNotify('Move refused', `${q.resv} stays in ${q.from}. ${w}`, 'g-bundles', 'Seats & bundles', q.agency); return { ok: true, state: q.state }; }
  q.hist.push({ at, what: kind === 'override' ? 'Approved by Super Administrator override' : 'Approved', by: me.name, why: w });
  const r = p8Of(q.resv), src = r && chBatch(r.batch), to = chBatch(q.to), y = !r || r.state !== 'active' ? `${q.resv} is no longer an unnamed active reservation` : r.batch !== q.from ? `${q.resv} is no longer in ${q.from}` : p8MoveWhy(r, src, to);
  const fail = msg => { q.state = 'Execution failed'; q.exec = { at, ok: false, why: msg }; q.hist.push({ at, what: 'Execution failed', by: me.name, why: msg }); logA('Bundles & Licences', `${q.resv} · ${q.from} → ${q.to}`, 'Reservation move not carried out', q.from, 'No change', msg); return { ok: false, why: msg, state: q.state }; };
  if (y) return fail(y);
  const s = seatRecById(r.seat), ns = seatMoveRec(s, to, `Reservation ${r.id} moved (${q.id})`); if (!ns) return fail(`${to.code} has no place left`);
  r.batch = to.code; r.seat = ns.id; const c = p8Cut(to); r.cutoff = new Date(c.releaseAt).toISOString(); r.start = to.start; p8Hist(r, `Moved ${q.from} → ${q.to}`, `${q.id} — ${w}`, me.name);
  q.state = 'Executed'; q.exec = { at, ok: true, seat: ns.id }; q.hist.push({ at, what: 'Executed', by: me.name, why: '' });
  logA('Bundles & Licences', `${q.resv} · ${q.from} → ${q.to}`, kind === 'override' ? 'Reservation moved (Super Administrator override)' : 'Reservation moved', q.from, q.to, `${w} (${q.id}) — the entitlement is unchanged`);
  agyNotify('Reservation moved', `${q.resv}: ${q.from} → ${q.to}. Released ${fmtTz(c.releaseAt, c.tz)} if still unnamed.`, 'g-bundles', 'Seats & bundles', q.agency);
  return { ok: true, state: q.state };
}

/* ---------- Screens ---------- */
const p8St = { active: ['Unnamed', 'blue'], named: ['Named — admission pending', 'amber'], confirmed: ['Confirmed learner', 'green'], released: ['Released', 'grey'], expired: ['Expired', 'red'], invalidated: ['Invalidated', 'red'] };
function p8Card(b) {
  const rs = P8().recs.filter(r => r.bundle === b.id); if (!rs.length && !p7Covers(b, (nvqBundleCourses()[0] || {}).title || '') && !b.courses.some(c => /Diploma/.test(c))) return '';
  return `<section class="card p8-res"><h2>Fixed-batch reservations</h2><p class="xs muted">Each reserved place takes one place in a batch and one entitlement until a learner is confirmed (then it is that learner's place) or it is released — by you, or automatically 28 days before the batch starts if no learner is named. Moving a place to another batch needs Academic Admin approval.</p>
    ${rs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Reservation</th><th>Batch</th><th>Fee basis · mode</th><th>Release</th><th>Status</th><th></th></tr></thead><tbody>${rs.map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.batch)}</td><td>${esc(r.optId ? (r1Opt(r.optId) || {}).label || r.optId : 'Programme price')} · ${esc(r.mode || '—')}</td><td class="xs">${r.cutoff ? fd(r.cutoff) : '—'}</td><td>${chip(p8St[r.state][0], p8St[r.state][1])}${r.lid ? `<div class="xs">${esc(chLidName(r.lid))}</div>` : ''}</td><td>${r.state === 'active' && S.portal === 'agency' ? `<button class="btn btn-sm" data-act="p8Rel" data-id="${r.id}">Release</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No places reserved.</p>'}
    ${S.portal === 'agency' && !p7Expired(b) ? `<button class="btn btn-sm" data-act="p8Res" data-b="${esc(b.id)}">Reserve places in a batch</button>` : ''}</section>`;
}
const _gbP8 = SCREENS['g-bundle'];
SCREENS['g-bundle'] = p => { const h = _gbP8(p), b = (ADMIN.bundles || []).find(x => x.id === (p && p.id) && x.agency === AGN()); const c = b && typeof h === 'string' ? p8Card(b) : ''; return c ? h.replace('<section class="card"><h2>Assignments from this bundle</h2>', c + '<section class="card"><h2>Assignments from this bundle</h2>') : h; };
ACT.p8Rel = el => { const id = el && el.dataset && el.dataset.id; reasonDlg({ title: 'Release reserved place — ' + esc(id || ''), ok: 'Release place', danger: true, body: '<p class="small">The place in the batch is freed and the entitlement returns to the bundle (if it hasn\'t expired).</p>', onOk: r => { const out = p8Release(id, r); if (!out.ok) { toast(out.why, 'err'); return false; } render(); toast(`${id} released.`); } }); };
ACT.p8Res = el => {
  const bid = el && el.dataset && el.dataset.b, bundle = (ADMIN.bundles || []).find(x => x.id === bid), deny = p8OwnWhy(bundle);
  if (deny) { logA('Bundles & Licences', bid || '—', 'Blocked: reserve places', '—', 'No change', deny); toast(deny, 'err'); return false; }
  const bs = ADMIN.batches.filter(b => p7Covers(bundle, b.course) && ['Open', 'Planned'].includes(b.status)), pr = bs[0] && p8Prog(bs[0]), key = 'K' + Date.now().toString(36);
  // A programme with fee options: its active options; a single-price programme: the batch's own mode, or a mode named explicitly
  const opts = !pr ? [] : r1IsL3Pid(pr.id) ? r1Opts(pr.id).filter(o => o.status === 'Active').map(o => [o.id, `${o.label || o.id} (${o.mode || 'the batch\'s delivery mode'})`]) : [['', 'Programme price — the batch\'s delivery mode'], ...M_MODES.map(m => [m, `Programme price — ${m}`])];
  if (!bs.length || !opts.length) { toast('No batch of this bundle\'s programme can take reservations.', 'info'); return; }
  reasonDlg({ title: 'Reserve places — ' + esc(bundle.name), ok: 'Reserve', body: `<p class="small">Choose the batch and the fee option (it sets the delivery mode; a programme with one price uses the batch's delivery mode). Every rule is checked again when you confirm.</p>`,
    extra: `<div class="field"><label for="p8-b">Batch</label><select class="select" id="p8-b">${bs.map(b => `<option value="${esc(b.code)}">${esc(b.label || b.code)} — starts ${fd(b.start)} · ${seatFree(b)} places</option>`).join('')}</select></div><div class="field"><label for="p8-o">Fee option / delivery mode</label><select class="select" id="p8-o">${opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></div><div class="field"><label for="p8-n">Places</label><input class="input" id="p8-n" value="1"></div>`,
    onOk: r => { const out = p8Reserve(bid, mval('#p8-b'), mval('#p8-o'), mval('#p8-n'), r, key); if (!out.ok) { toast(out.why, 'err'); return false; } render(); toast(out.dup ? 'Already reserved.' : `${out.ids.length} place${out.ids.length === 1 ? '' : 's'} reserved (${out.grp}).`); } });
};
const p8CanAca = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()));
SCREENS['a-resvmoves'] = () => {
  if (!p8CanAca()) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not available</h1><p class="muted">Reservation moves are decided by the Academic Admin (or the Super Administrator).</p></div>`;
  const rs = P8().mv.reqs;
  return `${pageA('Reservation moves', 'Agency requests to move an unnamed reserved place to another batch before the cutoff. Approval re-checks the place, both batches and capacity.')}
    <section class="card">${rs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Request</th><th>Agency</th><th>Reservation</th><th>From → to</th><th>Status</th><th></th></tr></thead><tbody>${rs.map(q => `<tr><td class="mono">${esc(q.id)}</td><td>${esc(q.agency)}</td><td class="mono">${esc(q.resv)}</td><td>${esc(q.from)} → ${esc(q.to)}</td><td>${esc(q.state)}${q.exec && q.exec.why ? `<div class="xs muted">${esc(q.exec.why)}</div>` : ''}</td><td>${q.state === P8_MV_OPEN ? `<button class="btn btn-sm btn-primary" data-act="p8MvDec" data-id="${q.id}" data-v="${isSA() ? 'override' : 'approve'}">${isSA() ? 'Override and move' : 'Approve and move'}</button> <button class="btn btn-sm" data-act="p8MvDec" data-id="${q.id}" data-v="refuse">Refuse</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><p>No reservation move requests.</p></div>'}</section>`;
};
ACT.p8MvDec = el => { const id = el.dataset.id, v = el.dataset.v; if (!p8CanAca()) { logA('Bundles & Licences', id, `Blocked: ${v} reservation move`, '—', 'No change', 'Not allowed'); toast('Only an Academic Admin decides reservation moves.', 'err'); return false; } reasonDlg({ title: `${v === 'refuse' ? 'Refuse' : 'Approve'} move — ${esc(id)}`, ok: v === 'refuse' ? 'Refuse' : 'Move place', danger: v === 'refuse', onOk: r => { const out = p8MoveDecide(id, v, r); if (out.denied) { toast(out.why, 'err'); return; } if (!out.ok && !out.state) { toast(out.why, 'err'); return false; } render(); toast(out.ok ? `${id}: ${out.state.toLowerCase()}.` : `${id}: ${out.why}`, out.ok ? 'ok' : 'err'); } }); };
KNAV.forEach(g => { if (g[0] === 'Delivery') g[1].push(['a-resvmoves', 'Reservation moves', 'users']); });
ANAV.forEach(g => { if (g[0] === 'Commercial') g[1].push(['a-resvmoves', 'Reservation moves', 'users']); });
ACA_ROUTES.add('a-resvmoves');
if (typeof ROUTE_PURPOSE !== 'undefined') ROUTE_PURPOSE['a-resvmoves'] = 'Agency requests to move an unnamed reserved place to another batch, and their approval.';
const _rdP8 = render; render = function () { try { p8BindAll(); } catch (e) { /* bound next time */ } return _rdP8.apply(this, arguments); };

UXC.push(['P8', 'Agency fixed-batch reservations (12 Nov 2026)', [
  'An agency can reserve unnamed places in a chosen batch from its paid bundle: each place takes one batch place and one entitlement until a learner is confirmed on it (then it becomes that learner\'s place and the entitlement is used once) or it is released — by the agency, or automatically 28 days before the batch starts (batch-local).',
  'Moving a reserved place to another batch needs Academic Admin approval. Agency NVQ learners are registered with an explicit batch and fee option; admission approval confirms them.']]);
