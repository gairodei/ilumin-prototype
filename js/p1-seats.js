/* ---------- P1 — Seat ledger foundation (11 Nov 2026) ----------
   One authority for batch capacity: STORE.seats, one record per place a batch gives (no seat numbers). A batch's enrolled count
   (b.enrolled) is no longer a number anyone writes: it is read from the active records of its batch code. Every place that took,
   released or moved a place (sign-up completion, Add learner, waitlist offers, seat release, Assign / change batch, cancellation, the
   demo controls) now calls seatTake / seatRelease / seatMove / seatSetDemo, each checked against the batch's capacity at that moment.

   Records: { id, batch, kind, state, lid, v, name, agency, agencyId, ent, origin, at, upd, from, to, hist[[at, from, to, by, why]] }
     kind  learner (individual) · sponsored (agency-sponsored learner) · unattributed (a counted place with no learner record)
           · agencyReserved is reserved for P8 (unnamed agency reservations) and is never created here.
     state held (a deposit reserves it, not yet secured) · occupied (secured / historical) — both use a place
           · released · transferred (moved to another batch: the new record names it) · superseded (a batch object rebuilt)
   The held / occupied distinction mirrors the payment position (dpSeat), which stays its authority; both count the same.

   Legacy counts: a batch object still carrying a plain number (a seed, a restored copy, a test fixture) is bound the first time it is
   read by the ledger. If the ledger already holds exactly that many active records for its code (a restored copy), they are kept;
   otherwise the count is migrated: one named record for each learner reliably in the batch (a completed sign-up on it, a cohort entry
   or roster row with a learner record), up to the count, and "unattributed" records for the rest. No count changes, no identity is
   invented, nothing is attributed twice, and binding again changes nothing.

   b.enrolled stays readable everywhere (the compatibility mirror). Writing it directly (test fixtures) is routed to the ledger as
   unattributed places, never above capacity and never below the named learners.

   Payment and capacity: a card payment that completes after its batch filled is kept as a reconcilable record for Finance review;
   the learner isn't enrolled, isn't moved, and can't pay again until Finance closes the review. Nothing is refunded automatically.
   These checks run in the browser: real concurrent payments need an atomic seat reservation on the server (P10). */

const SEAT_ACTIVE = ['held', 'occupied'];
const seatNew = () => ({ v: 1, seq: 0, ver: 0, recs: [], mig: {}, unmatched: [], umSeq: 0, log: [] });
function SEATS() { if (typeof STORE === 'undefined') return seatNew(); if (!STORE.seats || STORE.seats.v !== 1) STORE.seats = seatNew(); return STORE.seats; }
const seatLidOk = lid => !!lid && typeof lid === 'string' && lid !== '—' && lid !== '-';
const seatIsActive = r => SEAT_ACTIVE.includes(r.state);
const seatWho = () => { try { if (S.portal === 'learner' && W && W.me) return chFullName(W); return (ADMIN && ADMIN.me && ADMIN.me.name) || 'System'; } catch (e) { return 'System'; } };
const seatBump = () => { const L = SEATS(); L.ver = (L.ver || 0) + 1; };
const seatLog = (what, b, why) => { const L = SEATS(); L.log.unshift({ at: now().toISOString(), what, batch: b ? b.code : '—', by: seatWho(), why: why || '' }); if (L.log.length > 200) L.log.length = 200; };
const seatAgencyId = name => { if (!name || typeof ADMIN === 'undefined' || !ADMIN) return null; const a = (ADMIN.agencies || []).find(x => x && x.name === name); return a ? a.id || null : null; };
// sponsored when the learner record names an agency
const seatKindOf = lid => { try { const l = seatLidOk(lid) && learnerById(lid); return l && l.agency ? 'sponsored' : 'learner'; } catch (e) { return 'learner'; } };

/* ---------- Reading ---------- */
const SEAT_CNT = new WeakMap();
function seatCount(code) {
  const L = SEATS(); let c = SEAT_CNT.get(L);
  if (!c || c.ver !== L.ver || c.n !== L.recs.length) { c = { ver: L.ver, n: L.recs.length, m: {} }; L.recs.forEach(r => { if (seatIsActive(r)) c.m[r.batch] = (c.m[r.batch] || 0) + 1; }); SEAT_CNT.set(L, c); }
  return c.m[code] || 0;
}
const seatRecs = code => SEATS().recs.filter(r => r.batch === code);
const seatActive = (code, lid) => SEATS().recs.find(r => r.batch === code && r.lid === lid && seatIsActive(r)) || null;
const seatAny = (code, lid) => SEATS().recs.find(r => r.batch === code && r.lid === lid) || null;
const seatHolds = (lid, b) => !!(b && seatLidOk(lid) && (seatBind(b), seatActive(b.code, lid)));
const seatFree = b => { if (!b) return 0; seatBind(b); return Math.max(0, (+b.cap || 0) - seatCount(b.code)); };
const seatCan = (b, lid) => !!b && (seatHolds(lid, b) || seatFree(b) > 0);
function seatInfo(b) {
  seatBind(b); const a = seatRecs(b.code).filter(seatIsActive);
  return { code: b.code, cap: +b.cap || 0, active: a.length, held: a.filter(r => r.state === 'held').length, occupied: a.filter(r => r.state === 'occupied').length, named: a.filter(r => r.lid).length, unattributed: a.filter(r => !r.lid).length, free: Math.max(0, (+b.cap || 0) - a.length), mig: SEATS().mig[b.code] || null };
}

/* ---------- Records ---------- */
function seatRec(b, o) {
  const L = SEATS(), at = o.at && !isNaN(new Date(o.at)) ? new Date(o.at).toISOString() : now().toISOString(), lid = seatLidOk(o.lid) ? o.lid : null, st = o.state || 'occupied';
  const r = { id: 'SEAT-' + String(++L.seq).padStart(5, '0'), batch: b.code, kind: lid ? (o.kind || 'learner') : (o.kind === 'agencyReserved' ? 'agencyReserved' : 'unattributed'), state: st, lid, v: o.v || null, name: o.name || null, agency: o.agency || null, agencyId: seatAgencyId(o.agency), ent: o.ent || null, origin: o.origin || '—', at, upd: at, from: o.from || null, to: null, hist: [[at, null, st, o.by || seatWho(), o.why || o.origin || '']] };
  L.recs.push(r); return r;
}
function seatTrans(r, to, why, at) { at = at || now().toISOString(); r.hist.push([at, r.state, to, seatWho(), why || '']); r.state = to; r.upd = at; return r; }

/* ---------- Binding a batch object: the legacy count migrated once, then read from the records ---------- */
const SEAT_BOUND = new WeakSet(), SEAT_LAST = new WeakMap();
// learners reliably in the batch: a completed sign-up on it, then cohort entries and roster rows with a learner record (no duplicates)
function seatIdentified(b) {
  const out = [], seen = new Set(), add = (lid, src, v, agency) => { if (!seatLidOk(lid) || seen.has(lid)) return; seen.add(lid); out.push({ lid, src, v: v || null, agency: agency || null }); };
  const recOf = lid => { try { return learnerById(lid); } catch (e) { return null; } };
  Object.keys(STORE.worlds || {}).forEach(k => { const w = STORE.worlds[k], s = w && w.signup; if (s && s.done && !s.releasedFrom && s.batch === b.code && w.me) add(w.me.id, 'completed sign-up', w.v || k, chSponsored(w) ? (w.nvq.sponsor || w.me.agency || 'Agency') : null); });
  (b.coh || []).forEach(e => { const lid = e && (typeof acCohLid === 'function' ? acCohLid(e) : e.lid); const l = seatLidOk(lid) && recOf(lid); if (l) add(lid, 'cohort entry', e.v, l.agency); });
  (b.roster || []).forEach(x => { const lid = x && x[1], l = seatLidOk(lid) && recOf(lid); if (l) add(lid, 'roster row', null, l.agency); });
  return out;
}
function seatMigrate(b, n) {
  const L = SEATS(), at = now().toISOString(), named = seatIdentified(b).slice(0, n);
  named.forEach(x => seatRec(b, { lid: x.lid, v: x.v, kind: x.agency ? 'sponsored' : 'learner', agency: x.agency, origin: 'Migrated: ' + x.src, by: 'System (migration)', why: 'Historical count, learner identified' }));
  for (let i = named.length; i < n; i++) seatRec(b, { kind: 'unattributed', origin: 'Migrated: historical count (no learner record)', by: 'System (migration)', why: 'Historical count, no identifiable learner' });
  L.mig[b.code] = { at, count: n, named: named.length, unattributed: n - named.length }; seatBump();
}
// once per batch code and ledger; reading the batch again while it migrates sees the records made so far
const SEAT_MIGRATING = new Set();
function seatEnsureMig(b) {
  const L = SEATS(); if (L.mig[b.code] || SEAT_MIGRATING.has(b.code)) return;
  SEAT_MIGRATING.add(b.code); try { seatMigrate(b, SEAT_LAST.get(b) || 0); } finally { SEAT_MIGRATING.delete(b.code); }
}
function seatBind(b) {
  if (!b || typeof b !== 'object' || !b.code) return b;
  if (SEAT_BOUND.has(b)) { seatEnsureMig(b); return b; }
  const L = SEATS(), d = Object.getOwnPropertyDescriptor(b, 'enrolled'), n = d && 'value' in d ? Math.max(0, Math.floor(+d.value || 0)) : 0;
  const act = L.recs.filter(r => r.batch === b.code && seatIsActive(r));
  if (act.length === n && (n > 0 || L.mig[b.code])) { if (!L.mig[b.code]) L.mig[b.code] = { at: now().toISOString(), count: n, adopted: true }; } // the records already match (a restored copy)
  else { act.forEach(r => seatTrans(r, 'superseded', 'The batch was rebuilt from its own count')); delete L.mig[b.code]; if (act.length) seatBump(); }
  SEAT_LAST.set(b, n);
  Object.defineProperty(b, 'enrolled', {
    configurable: true, enumerable: true,
    get() { seatEnsureMig(this); const k = seatCount(this.code); SEAT_LAST.set(this, k); return k; },
    set(v) { seatAdjust(this, v); }
  });
  SEAT_BOUND.add(b); seatEnsureMig(b);
  return b;
}
function seatSweep() { if (typeof ADMIN === 'undefined' || !ADMIN || !Array.isArray(ADMIN.batches)) return; ADMIN.batches.forEach(seatBind); }
const seatRebuild = seatSweep;

/* ---------- The mutations: one capacity check each, idempotent, nothing changed when refused ---------- */
function seatTake(b, o = {}) {
  if (!b) return false; seatBind(b);
  const lid = seatLidOk(o.lid) ? o.lid : null;
  if (lid) { const cur = seatActive(b.code, lid); if (cur) return cur; } // a second call for the same learner takes nothing
  if (seatCount(b.code) >= (+b.cap || 0)) { seatLog('Refused: take (batch full)', b, `${lid || o.name || 'unattributed'} · ${o.origin || ''}`); return false; }
  const r = seatRec(b, { ...o, lid }); seatBump(); return r;
}
function seatConfirm(b, lid, why) {
  if (!b) return null; seatBind(b); const r = seatActive(b.code, lid); if (!r || r.state !== 'held') return r;
  seatTrans(r, 'occupied', why || 'Seat secured'); r.confirmed = r.upd; seatBump(); return r;
}
// a counted place nobody is named on is given to this learner (the place they held before the ledger kept names)
function seatAttribute(b, lid, why) {
  const pool = seatRecs(b.code).filter(r => !r.lid && seatIsActive(r) && r.kind !== 'agencyReserved'); if (!pool.length) return null;
  const r = pool.find(x => /^Migrated/.test(x.origin)) || pool[0];
  r.lid = lid; r.kind = seatKindOf(lid); r.hist.push([now().toISOString(), r.state, r.state, seatWho(), 'Attributed to ' + lid + ' — ' + why]); r.attributed = now().toISOString();
  return r;
}
function seatRelease(b, lid, o = {}) {
  if (!b) return null; seatBind(b);
  let r = seatLidOk(lid) ? seatActive(b.code, lid) : null;
  if (!r) {
    if (seatLidOk(lid) && seatAny(b.code, lid)) return null; // already released or moved: nothing more
    r = seatLidOk(lid) ? seatAttribute(b, lid, 'released') : seatRecs(b.code).filter(x => !x.lid && seatIsActive(x) && x.kind !== 'agencyReserved').pop();
    if (!r) { seatLog('No place to release', b, lid || ''); return null; }
  }
  seatTrans(r, 'released', o.why || o.origin || 'Released'); seatBump(); return r;
}
function seatMove(lid, from, to, o = {}) {
  if (!from || !to) return false; seatBind(from); seatBind(to); if (from === to || from.code === to.code) return true;
  const named = seatLidOk(lid);
  if (named && seatActive(to.code, lid)) { const left = seatActive(from.code, lid); if (left) { seatTrans(left, 'released', 'Duplicate place after a move — released'); seatBump(); } return true; } // already moved
  if (seatCount(to.code) >= (+to.cap || 0)) { seatLog('Refused: move (destination full)', to, `${lid || '—'} from ${from.code}`); return false; }
  let src = named ? seatActive(from.code, lid) : seatRecs(from.code).filter(x => !x.lid && seatIsActive(x) && x.kind !== 'agencyReserved').pop() || null;
  if (!src && named && !seatAny(from.code, lid)) src = seatAttribute(from, lid, 'moved');
  const at = now().toISOString(), why = o.why || o.origin || 'Moved';
  const nr = seatRec(to, { lid: named ? lid : null, v: src ? src.v : o.v, name: src ? src.name : (named ? null : o.name || lid), kind: src ? src.kind : (named ? seatKindOf(lid) : 'unattributed'), agency: src ? src.agency : null, state: src && src.state === 'held' ? 'held' : 'occupied', origin: (o.origin || 'Moved') + ` (from ${from.code})`, from: src ? src.id : null, at, why });
  if (src) { seatTrans(src, 'transferred', `${why} → ${to.code}`, at); src.to = nr.id; }
  seatBump(); return true;
}
// a count set on purpose (demo controls, test fixtures): unattributed places only, never above capacity, never below the named learners
function seatAdjust(b, v, origin) {
  seatBind(b); v = Math.max(0, Math.floor(+v || 0)); const cur = seatCount(b.code); if (v === cur) return cur;
  const why = origin || 'Direct count change (compatibility)';
  if (v > cur) { const top = Math.min(v, Math.max(cur, +b.cap || 0)); for (let i = cur; i < top; i++) seatRec(b, { kind: 'unattributed', origin: why }); if (top < v) seatLog('Refused: count above capacity', b, `${v} asked, ${b.cap} places`); }
  else { const pool = seatRecs(b.code).filter(r => !r.lid && seatIsActive(r) && r.kind !== 'agencyReserved').reverse(); pool.slice(0, cur - v).forEach(r => seatTrans(r, 'released', why)); if (pool.length < cur - v) seatLog('Refused: count below the named learners', b, `${v} asked`); }
  seatBump(); return seatCount(b.code);
}
const seatSetDemo = (b, n, why) => b ? seatAdjust(b, n, why) : 0;

/* ---------- Held / secured follows the payment position (dpSeat stays its authority) ---------- */
function seatSyncStates() {
  if (typeof dpSeat !== 'function') return;
  SEATS().recs.forEach(r => {
    if (!seatIsActive(r) || !r.v || !r.lid) return; const w = STORE.worlds && STORE.worlds[r.v]; if (!w || !w.signup || w.signup.batch !== r.batch) return;
    let st; try { st = dpSeat(w).st; } catch (e) { return; }
    if (['reserved', 'review', 'expired'].includes(st) && r.state === 'occupied' && !r.confirmed) { if (r.hist.length === 1) { r.state = 'held'; r.hist[0][2] = 'held'; } else seatTrans(r, 'held', 'Reserved by a deposit — not yet secured'); }
    else if (st === 'occupied' && r.state === 'held') { seatTrans(r, 'occupied', 'Seat secured (payment position)'); r.confirmed = r.upd; }
  });
}

/* ---------- Invariants (I-1, I-4, I-11): used by the tests and the report ---------- */
function seatInvariants() {
  const bad = [], L = SEATS();
  (ADMIN && ADMIN.batches || []).forEach(b => {
    seatBind(b); const a = L.recs.filter(r => r.batch === b.code && seatIsActive(r));
    if (a.length > (+b.cap || 0)) bad.push(`I-1 ${b.code}: ${a.length} active places for ${b.cap}`);
    if (b.enrolled !== a.length) bad.push(`I-11 ${b.code}: count ${b.enrolled} ≠ ${a.length} records`);
    const ids = a.filter(r => r.lid).map(r => r.lid), dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) bad.push(`duplicate place in ${b.code}: ${dup.join(', ')}`);
  });
  L.recs.forEach(r => { if (r.state === 'transferred' && !r.to) bad.push(`${r.id} transferred without a destination`); });
  return bad;
}

/* ---------- Where the ledger is created, bound and reset ---------- */
const _isP1 = initStore;
initStore = function () { STORE.seats = seatNew(); const r = _isP1.apply(this, arguments); if (!STORE.seats) STORE.seats = seatNew(); return r; };
const _prP1 = fxPrune;
fxPrune = function () { const r = _prP1.apply(this, arguments); STORE.seats = seatNew(); return r; }; // the client demo starts with no legacy batch, so no legacy places
const _renderP1 = render;
render = function () { try { seatSweep(); seatSyncStates(); } catch (e) { /* never block a render */ } return _renderP1.apply(this, arguments); };
if (typeof STORE !== 'undefined' && !STORE.seats) STORE.seats = seatNew();

/* ---------- chDoMove: a place in the destination before anything changes; a repeated move does nothing ---------- */
const _mvP1 = chDoMove;
chDoMove = function (lid, b, nb, r) {
  if (b && nb && b !== nb) {
    seatBind(b); seatBind(nb);
    // already moved (the ledger shows this exact move, and a learner account already names the new batch): nothing is repeated.
    // A cancellation moves the place first and then calls this for the account, whose sign-up still names the old batch.
    const last = seatLidOk(lid) ? SEATS().recs.filter(x => x.batch === b.code && x.lid === lid).pop() : null, now2 = seatLidOk(lid) && seatActive(nb.code, lid), w = typeof chWorldByLid === 'function' && seatLidOk(lid) ? chWorldByLid(lid) : null;
    if (last && now2 && last.state === 'transferred' && last.to === now2.id && (!w || (w.signup && w.signup.batch === nb.code))) return true;
    if (!seatCan(nb, lid)) { logA('Batches', `${chLidName(lid) || lid} (${lid})`, 'Blocked: batch change (no place)', `${b.label || b.code} (${b.code})`, `${nb.label || nb.code} (${nb.code})`, `${nb.code} is full (${nb.enrolled}/${nb.cap})`); toast(`${nb.label || nb.code} has no place left — nothing was changed.`, 'err'); return false; }
  }
  return _mvP1.apply(this, arguments);
};

/* ---------- Cancellation: every move it would make must have a place, or nothing is cancelled ---------- */
const _cbP1 = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const r = _cbP1(el), b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), act = b && MODAL && /^Cancel batch/.test(MODAL.title || '') && MODAL.actions.find(x => /danger|primary/.test(x.cls || ''));
  if (act && !act._p1) {
    const g = act.fn; act._p1 = true;
    act.fn = (...x) => {
      const need = {}; $$('#modal-root .cb-d').forEach(s => { const alt = s.value && s.value !== 'refund' && ADMIN.batches.find(c => c.code === s.value); if (alt && !seatHolds(s.dataset.id, alt)) need[alt.code] = (need[alt.code] || 0) + 1; });
      const over = Object.keys(need).map(c => ADMIN.batches.find(y => y.code === c)).filter(a => need[a.code] > seatFree(a));
      if (over.length) { const t = over.map(a => `${a.code}: ${need[a.code]} chosen, ${seatFree(a)} place${seatFree(a) === 1 ? '' : 's'} left`).join('; '); logA('Batches', `${b.label || b.code} (${b.code})`, 'Blocked: cancel batch (not enough places)', b.status, 'No change', t); toast(`Not enough places for the moves chosen — ${t}. Nothing was cancelled.`, 'err'); return false; }
      return g(...x);
    };
  }
  return r;
};

/* ---------- A payment that completes after its batch filled: kept for Finance review, never a seat ---------- */
const seatReviewOf = w => w && w.me ? SEATS().unmatched.find(u => u.state === 'Finance review' && (u.v === w.v || u.lid === w.me.id)) || null : null;
function seatUnmatched(w, b, o) {
  const L = SEATS(), at = now().toISOString(), ref = o && o.ref, amount = +(o && o.amount) || 0, tx = (w.tx || []).find(t => t.ref === ref);
  const u = { id: 'SPR-' + String(++L.umSeq).padStart(4, '0'), v: w.v, lid: w.me.id, name: chFullName(w), batch: b.code, ref: ref || '—', amount, at, method: tx ? tx.method : 'Card', state: 'Finance review', why: `${b.code} filled while the payment was processed` };
  L.unmatched.unshift(u); if (tx) tx.seatReview = u.id;
  if (STORE.fin && STORE.fin.notifs) STORE.fin.notifs.unshift({ to: 'all', t: 'Payment received for a full batch — Finance review', b: `${u.name} · ${money(amount, 'GBP')} (${u.ref}) — no seat, sign-up not completed`, at, go: 'f-exceptions', unread: true });
  logA('Finance', `${u.name} (${u.lid})`, 'Payment received for a full batch', '—', 'Finance review — no seat taken', `${u.id}: the last place was taken while this payment was processed`);
  if (w.admission && w.admission.history) w.admission.history.push([`Payment ${u.ref} received — ${b.code} was full; Finance review`, at]);
  notifyLearner(w.v, 'Payments', 'Your payment is being reviewed', `${b.label || b.code} filled while your payment of ${money(amount, 'GBP')} was processed. Your sign-up isn't complete and your batch hasn't changed. Finance will review the payment and contact you.`, 'admission');
  toast(`Your payment of ${money(amount, 'GBP')} was received, but ${b.label || b.code} filled while it was processed. Your sign-up isn't complete — Finance will review the payment and contact you.`, 'err');
  return false;
}
const _ccP1 = chComplete;
chComplete = function (w, o, fromCheckout) {
  const b = w && w.signup && !w.signup.done && chBatch(w.signup.batch);
  if (b) { try { dpReconcile(); } catch (e) { /* the hold check is optional here */ } if (!seatCan(b, w.me.id) && fromCheckout) return seatUnmatched(w, b, o); }
  return _ccP1.apply(this, arguments);
};
// No second payment, and no silent reassignment, while a payment waits for Finance
const _suPayP1 = ACT.suPay;
ACT.suPay = el => { const u = seatReviewOf(W); if (u) { logA('Admissions', `${chFullName(W)} (${W.me.id})`, 'Blocked: payment under Finance review', 'Sign-up payment', 'No change — nothing charged', u.id); toast(`Your payment ${u.ref} is being reviewed by Finance — nothing more can be paid until they contact you.`, 'err'); return; } return _suPayP1(el); };
const _stepPayP1 = chStepPay;
chStepPay = function (w) {
  const u = seatReviewOf(w); if (!u) return _stepPayP1.apply(this, arguments);
  return `<section class="card p1-review"><h2>4. Payment</h2><div class="note b-amber" role="status">${ic('alert')}<div class="small"><strong>Your payment is being reviewed.</strong> ${esc(u.batch)} filled while your payment of ${money(u.amount, 'GBP')} (${esc(u.ref)}) was processed on ${fdt(u.at)}. Your sign-up isn't complete and your batch hasn't changed. Finance will review the payment and contact you; nothing more can be paid until then. Contact the Academy: ${academyContact()}</div></div></section>`;
};
// Finance: Payment Pending & Exceptions lists them; closing a review records a decision only (no money moves)
function seatReviewCard() {
  const L = SEATS(); if (!L.unmatched.length) return '';
  const can = typeof fiFin === 'function' && fiFin();
  return `<section class="card p1-um"><div class="row-b"><h2>Payments received without a seat — Finance review</h2>${chip(L.unmatched.filter(u => u.state === 'Finance review').length + ' open', 'amber')}</div>
    <p class="small">The batch filled while each payment was processed. The sign-up wasn't completed and the learner wasn't moved. Nothing is refunded, kept or credited automatically: raise a refund from the ledger or record the decision, then close the review.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Review</th><th>Learner</th><th>Batch</th><th>Reference</th><th class="num">Amount</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>${L.unmatched.map(u => `<tr><td class="mono xs">${u.id}</td><td>${esc(u.name)} <span class="mono xs">${esc(u.lid)}</span></td><td class="mono xs">${esc(u.batch)}</td><td class="mono xs">${esc(u.ref)}</td><td class="num">${money(u.amount, 'GBP')}</td><td>${fdt(u.at)}</td><td>${u.state === 'Finance review' ? chip('Finance review', 'amber') : chip('Closed', 'grey') + `<div class="xs muted">${esc(u.closed.by)} · ${fdt(u.closed.at)} · ${esc(u.closed.why)}</div>`}</td><td>${u.state === 'Finance review' && can ? `<button class="btn btn-sm" data-act="p1Review" data-id="${u.id}">Close review</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
const _excP1 = SCREENS['f-exceptions'];
SCREENS['f-exceptions'] = p => { const h = _excP1(p); return p && p.tab && p.tab !== 'pending' ? h : h + seatReviewCard(); };
ACT.p1Review = el => {
  const u = SEATS().unmatched.find(x => x.id === (el && el.dataset && el.dataset.id));
  if (typeof fiFin !== 'function' || !fiFin()) return w0Deny('Finance', u ? u.id : '—', 'close a payment review', typeof FI_FIN === 'string' ? FI_FIN : 'Only a Finance Admin or the Super Administrator can do this.');
  if (!u || u.state !== 'Finance review') { toast('That review is already closed — nothing changed.', 'err'); return; }
  reasonDlg({ title: 'Close payment review ' + u.id, ok: 'Close review', body: `<p class="small">${esc(u.name)} · ${money(u.amount, 'GBP')} (${esc(u.ref)}). Closing records your decision only: no money is refunded, kept or credited by this action. The learner can pay again once it is closed.</p>`,
    onOk: r => { if (!fiFin()) return w0Deny('Finance', u.id, 'close a payment review', FI_FIN); if (u.state !== 'Finance review') return; u.state = 'Closed'; u.closed = { by: ADMIN.me.name, at: now().toISOString(), why: r }; logA('Finance', `${u.name} (${u.lid})`, 'Payment review closed', 'Finance review', 'Closed', `${u.id}: ${r}`); render(); toast('Review closed. No money was moved.'); } });
};

/* ---------- Saved client demo: a copy saved before STORE.seats existed is restored, and its counts migrated ---------- */
const p1SigWithout = skip => { const s = [Object.keys(STORE).filter(k => !skip.includes(k)).sort().join(','), Object.keys(ADMIN).sort().join(','), Object.keys(STORE.worlds.CD1 || {}).sort().join(',')].join('|'); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return FCP_V + ':' + h; };
const _restoreP1 = fcpRestore;
fcpRestore = function () {
  try {
    const ls = fcpLS(), raw = ls && ls.getItem(FCP_KEY), o = raw ? JSON.parse(raw) : null, cur = fcpSig();
    if (o && o.v === FCP_V && o.fx === 'client' && o.sig !== cur && [['seats'], ['seats', 'cbr']].some(k => o.sig === p1SigWithout(k))) { o.sig = cur; ls.setItem(FCP_KEY, JSON.stringify(o)); FCP.p1Up = true; }
  } catch (e) { /* the original restore decides */ }
  return _restoreP1.apply(this, arguments);
};
