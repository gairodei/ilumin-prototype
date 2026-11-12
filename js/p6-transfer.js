/* ============================================================
   P6 — Approved batch transfers (12 Nov 2026; PD-P6-* in PROVISIONAL-DECISIONS.md; PD-P0-01, PD-P0-08, PD-P0-16 in
   P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p5-access.js, so its wrappers are the outermost ones.
   An enrolled learner's batch changes only through one record: request → Academic Admin approval (or a Super Administrator
   override, reason required, audited) → execution. Execution re-reads the request, the learner and both batches, checks every
   condition again, then runs the existing move (chDoMove and its wrappers: P1 seat move, fee option, readiness, signed terms,
   programme version, Coordinator allocation, issued assignments) once, all or nothing. Any other call to chDoMove is refused.
   - One record per request in the seat ledger store (STORE.seats.xfer): the enrolment and the P1 ledger stay the only source of
     the learner's actual batch. States: Pending Academic Approval → Approved / Refused / Invalidated → Executed / Execution failed.
   - Who: requests by the Academic Admin or the Super Administrator (the roles that already changed batches); approval by an
     Academic Admin who didn't make the request; a Super Administrator override. Every check runs in the handler and again on confirm.
   - Eligibility: a confirmed enrolment with its place in the source batch; the same programme and version; the fee option, delivery
     mode and region accepted; the destination Open or Planned with a Coordinator and a free place; neither batch commenced (P5's
     resolver; both batches need an explicitly configured IANA time zone — without one the transfer is refused, with the batch to
     configure); no payment awaiting Finance, no Finance exception, no forfeiture; signed terms unchanged (L3-C2);
     revised-terms learners (frozen P4 deadlines tied to their batch) can't be transferred — an amendment would be needed.
   - Applicants (sign-up not complete) choose their own batch (P3) or are assigned by the Academy before payment (L3-C): not transfers.
   - Cancellation can't move learners: transfer them first. A waitlist offer to a learner holding a place in another batch of the
     course is refused. Agency entitlements are not touched (P7 / P8).
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE THIS ON THE SERVER.
   ============================================================ */
'use strict';

const P6_RULE = 'P6-TRANSFER-1';
const P6_OPEN = ['Pending Academic Approval', 'Approved'];
const P6 = () => { const L = SEATS(); if (!L.xfer) L.xfer = { seq: 0, reqs: [] }; return L.xfer; };
const p6Req = id => P6().reqs.find(q => q.id === id) || null;
const p6Who = lid => `${chLidName(lid) || lid} (${lid})`;
const p6Me = () => ({ name: (ADMIN && ADMIN.me && ADMIN.me.name) || '—', role: isSA() ? 'Super Administrator' : (typeof isAca === 'function' && isAca()) ? 'Academic Admin' : (ADMIN && ADMIN.me && ADMIN.me.role) || '—', portal: S.portal || '—' });
const p6Biz = () => typeof isBiz === 'function' && isBiz();
const p6CanRequest = () => S.portal === 'admin' && !p6Biz() && (isSA() || (typeof isAca === 'function' && isAca()));
const p6Open = lid => P6().reqs.find(q => q.lid === lid && P6_OPEN.includes(q.state)) || null;
const p6Hist = (q, what, why) => { const m = p6Me(); q.hist.push({ at: now().toISOString(), what, by: m.name, role: m.role, why: why || '' }); };
let P6_RUN = null; // the request being executed: the only time chDoMove may move a learner

/* ---------- Commencement: P5's resolver, with an explicitly configured batch time zone (no fallback) ---------- */
function p6Comm(b, at = now().getTime()) {
  if (!b || !b.start || !Number.isFinite(Date.parse(b.start))) return 'has no start date recorded, so whether it has begun can\'t be determined';
  if (chStarted(b)) return `started on ${fd(b.start)}`;
  if (batchTz(b).source !== 'configured') return `has no Academy time zone configured, so whether it has started can't be determined — set the batch's time zone (Batches → ${b.code} → Academy time zone) and request the transfer again (U-04 / U-05)`;
  const c = p5Commence(b, at);
  if (c.state === 'not-commenced') return null;
  if (c.state === 'commenced') return `commenced at ${fmtTz(c.ms, c.tz)}`;
  return `its start date (${p4Day(c.startYmd)}, ${c.tz}) has arrived and the exact start moment isn't decided (U-05), so it counts as started`;
}

/* ---------- Finance states that must be resolved first (nothing about them is decided here) ---------- */
function p6FinWhy(w) {
  const s = w.signup, pl = (w.plans || []).find(p => p.e === 'nvq');
  if (typeof seatReviewOf === 'function' && seatReviewOf(w)) return 'A payment received without a seat is under Finance review';
  if (P4().exc.some(e => e.lid === w.me.id && e.state === 'Finance review')) return 'A late bank receipt is under Finance review';
  if (P4().forf[p4Key(w)]) return 'The deposit was forfeited and the seat released';
  if (p4Claims(w).some(c => c.open)) return 'A bank transfer is awaiting verification by Finance';
  if (pl && (pl.rows || []).some(r => r.confirming)) return 'A bank transfer is awaiting verification by Finance';
  if (pl && pl.deposit && /Awaiting/.test(pl.deposit.status || '')) return 'The deposit is awaiting verification by Finance';
  if (s.pay && /Awaiting/.test(s.pay.status || '') && pl && pl.rows && pl.rows[0] && pl.rows[0].status !== 'Paid') return 'The first payment is awaiting verification by Finance';
  if (typeof dpSeat === 'function' && dpSeat(w).st === 'review') return 'The deposit was refunded and the seat is under Finance review';
  return '';
}

/* ---------- Eligibility: checked when a request is made, approved and executed (null = allowed) ---------- */
function p6Why(lid, b, nb) {
  const w = lid ? chWorldByLid(lid) : null;
  if (!lid) return 'No learner was identified';
  if (!b) return 'The learner has no current batch';
  if (!nb) return 'The destination batch doesn\'t exist';
  if (b.code === nb.code) return `The learner is already in ${nb.code}`;
  if (w) {
    const s = w.signup;
    if (!s || !s.done) return 'The application isn\'t complete — its batch is chosen at sign-up (P3) or assigned before payment, not transferred';
    if (s.batch !== b.code) return `The learner's batch is now ${s.batch || 'none'}, not ${b.code}`;
    if (w.admission && w.admission.status === 'Withdrawn') return 'The learner has withdrawn';
    if (typeof chReleased === 'function' && chReleased(w)) return 'The learner\'s seat was released';
    if (!w.nvq || w.nvq.status !== 'Active' || !(w.enrolments || []).includes(w.nvq)) return `There is no confirmed enrolment (status ${(w.nvq && w.nvq.status) || 'none'})`;
    if (chSponsored(w) && p4Rev(w)) return 'Agency-sponsored learners on the revised terms aren\'t transferred here (P9)';
    if (p4Rev(w) && s.p4) return `The signed revised-terms deadlines are tied to ${s.p4.batch}; a transfer would need an approved amendment, which isn't available`;
    const f = p6FinWhy(w); if (f) return `${f} — the transfer waits until Finance resolves it`;
  } else if (!chCohLids(b).includes(lid) && !batchRoster(b).some(r => r[1] === lid)) return `The learner isn't in ${b.code}`;
  const c1 = p6Comm(b); if (c1) return `${b.code} ${c1} — a transfer is only possible before the batch starts`;
  if (!seatHolds(lid, b)) return `No place for this learner is recorded in ${b.code} (seat ledger)`;
  const c2 = p6Comm(nb); if (c2) return `${nb.code} ${c2} — a learner can only move to a batch that hasn't started`;
  if (nb.course !== b.course) return `${nb.code} is a batch of another programme`;
  if (!['Open', 'Planned'].includes(nb.status)) return `${nb.code} is ${nb.status}`;
  const v = typeof l3tVerWhy === 'function' ? l3tVerWhy(lid, nb) : ''; if (v) return v;
  if (seatFree(nb) <= 0) return `${nb.code} is full`;
  if (!nbStaffed(nb)) return `${nb.code} has no Academic Coordinator yet`;
  const opt = w1OptOfLid(lid, b);
  if ((w1L3(b) || w1L3(nb)) && opt && !w1Accepts(nb, opt)) return `${nb.code} doesn't accept this learner's fee option (${w1OptName(opt)}) — it isn't replaced`;
  const pr = s3Pr(r2Pid(nb)); if (pr && pr.level !== 'Level 3' && w1L3(nb) && !opt) return `${nb.code} holds learners by fee option, and this learner has none — their delivery mode follows their batch`;
  if (crShowReady(nb)) { const o = r1Opt(opt), m = (o && o.mode) || null; if (!crReadyAny(nb) || (m && crBModes(nb).includes(m) && crReady(nb, m) !== 'ready')) return crNotReady(nb).replace(/\.$/, ''); }
  if (w) {
    const y = p3Why(w, nb, { own: true }); if (y) return `${nb.code}: ${y}`;
    const x = l3c2Impact(w, nb); if (x) return `${x.unknown ? 'The signed terms can\'t be checked' : 'The signed terms would change'} in ${nb.code}: ${x.why.join('; ')}. An approved amendment (new authorized contractual acceptance) would be required`;
  }
  return null;
}
// The learner's current batch: their sign-up's; for a roster learner without an account, the one live batch where the seat ledger holds their place
const p6CurBatch = lid => {
  if (chWorldByLid(lid)) return chCurBatch(lid);
  const live = [...new Set(SEATS().recs.filter(r => r.lid === lid && seatIsActive(r)).map(r => r.batch))].map(chBatch).filter(b => b && !['Completed', 'Archived', 'Cancelled'].includes(b.status));
  return live.length === 1 ? live[0] : chCurBatch(lid);
};

/* ---------- Request ---------- */
function p6Request(lid, toCode, why) {
  const deny = p6CanRequest() ? '' : 'Only the Academic Admin or the Super Administrator can request a batch transfer.';
  if (deny) { logA('Batches', p6Who(lid), 'Blocked: request batch transfer', '—', '—', deny); return { ok: false, why: deny, denied: true }; }
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const open = p6Open(lid); if (open) return { ok: false, why: `${open.id} for this learner is still ${open.state.toLowerCase()} — decide it first.` };
  const b = p6CurBatch(lid), nb = chBatch(toCode), y = p6Why(lid, b, nb);
  if (y) { logA('Batches', p6Who(lid), 'Blocked: request batch transfer', b ? b.code : '—', toCode || '—', y); return { ok: false, why: y }; }
  const w = chWorldByLid(lid), s = w && w.signup, m = p6Me(), X = P6(), at = now().toISOString();
  const q = { id: 'TR-' + String(++X.seq).padStart(4, '0'), lid, v: w ? w.v : null, prog: (s && s.prog) || p3BatchPid(b) || b.course, course: b.course, from: b.code, to: nb.code, by: m, at, why: String(why).trim(), state: 'Pending Academic Approval', rule: P6_RULE,
    terms: w && s ? Object.freeze({ termsRef: s.termsRef || null, policy: (p2Terms(w) || {}).policy || 'LEGACY-1', letterV: s.sig ? s.sig.v : null, signedAt: s.sig ? s.sig.at : null, opt: (r1OptOfW(w) || {}).id || null, pin: J6(s.pin || null), p4: J6(s.p4 || null) }) : null,
    dec: null, exec: null, hist: [] };
  p6Hist(q, 'Requested', q.why); X.reqs.unshift(q);
  logA('Batches', `${p6Who(lid)} · ${b.code} → ${nb.code}`, 'Batch transfer requested', b.code, `${nb.code} (${q.id})`, q.why);
  if (typeof acaNotify === 'function') acaNotify('Batch transfer to approve', `${chLidName(lid)}: ${b.code} → ${nb.code} (${q.id})`, 'a-transfers');
  return { ok: true, id: q.id, req: q };
}
const J6 = x => (x == null ? null : JSON.stringify(x));

/* ---------- Decide: approve (Academic Admin, not the requester), override (Super Administrator), refuse ---------- */
function p6DecideWhy(q, kind) {
  if (!q) return 'That transfer request doesn\'t exist.';
  if (S.portal !== 'admin') return 'Transfer requests are decided in the admin console.';
  if (kind === 'override') return isSA() ? '' : 'Only the Super Administrator can override.';
  if (isSA()) return ''; // rule 1: the Super Administrator decides any item (an approval by them is recorded as an override)
  if (!(typeof isAca === 'function' && isAca())) return 'Only an Academic Admin approves batch transfers (or the Super Administrator by override).';
  if (q.by && q.by.name === p6Me().name) return 'You made this request — another Academic Admin approves it (no self-approval).';
  return '';
}
function p6Decide(id, verb, why, o = {}) {
  const q = p6Req(id), kind = verb === 'override' || (verb === 'approve' && isSA()) ? 'override' : verb, deny = p6DecideWhy(q, kind);
  if (deny) { logA('Batches', q ? p6Who(q.lid) : id || '—', `Blocked: ${verb} batch transfer`, q ? q.state : '—', 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (q.state !== 'Pending Academic Approval') { logA('Batches', p6Who(q.lid), `Blocked: ${verb} batch transfer (already decided)`, q.state, 'No change', q.id); return { ok: false, why: `${q.id} is already ${q.state.toLowerCase()} — nothing changed.`, dup: true }; }
  if (!String(why || '').trim()) return { ok: false, why: 'Enter a reason.' };
  const m = p6Me(), at = now().toISOString(), r = String(why).trim();
  if (verb === 'refuse') { q.state = 'Refused'; q.dec = { at, by: m.name, role: m.role, why: r, kind: 'refuse' }; p6Hist(q, 'Refused', r); logA('Batches', `${p6Who(q.lid)} · ${q.from} → ${q.to}`, 'Batch transfer refused', 'Pending Academic Approval', `Refused (${q.id})`, r); p6Tell(q, 'refused'); return { ok: true, state: q.state }; }
  // An approval re-checks everything; a request that is no longer valid is invalidated, not approved
  const y = p6Why(q.lid, chBatch(q.from), chBatch(q.to)), cur = p6CurBatch(q.lid);
  const stale = y || (!cur || cur.code !== q.from ? `The learner's batch is no longer ${q.from}` : '');
  if (stale) { q.state = 'Invalidated'; q.dec = { at, by: m.name, role: m.role, why: stale, kind: 'invalid' }; p6Hist(q, 'Invalidated at approval', stale); logA('Batches', `${p6Who(q.lid)} · ${q.from} → ${q.to}`, 'Batch transfer invalidated', 'Pending Academic Approval', `Invalidated (${q.id})`, stale); p6Tell(q, 'invalid'); return { ok: false, why: stale, invalid: true, state: q.state }; }
  q.state = 'Approved'; q.dec = { at, by: m.name, role: m.role, why: r, kind };
  p6Hist(q, kind === 'override' ? 'Approved by Super Administrator override' : 'Approved', r);
  logA('Batches', `${p6Who(q.lid)} · ${q.from} → ${q.to}`, kind === 'override' ? 'Batch transfer approved (Super Administrator override)' : 'Batch transfer approved', 'Pending Academic Approval', `Approved (${q.id})`, r);
  if (o.execute === false) return { ok: true, state: q.state };
  return p6Execute(q.id);
}

/* ---------- Execute once, all or nothing ---------- */
const p6ExecWhy = () => (S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca())) ? '' : 'Only an Academic Admin or the Super Administrator can carry out an approved transfer.');
function p6Snap(lid, b, nb) {
  const w = chWorldByLid(lid), pick = x => x ? JSON.stringify({ coh: x.coh, roster: x.roster, mcA: x.mcA, mcH: x.mcH, r2: x.r2 }) : null;
  return { seats: JSON.stringify({ ...STORE.seats, xfer: undefined }), w, sw: w ? JSON.stringify({ signup: w.signup, nvq: w.nvq, admission: w.admission }) : null, nn: w ? (w.notifs || []).length : 0, b: [b, pick(b)], nb: [nb, pick(nb)] };
}
function p6Restore(k) {
  const x = P6(); STORE.seats = JSON.parse(k.seats); STORE.seats.xfer = x;
  if (k.w && k.sw) { const o = JSON.parse(k.sw); ['signup', 'nvq', 'admission'].forEach(f => { if (k.w[f] && o[f]) { Object.keys(k.w[f]).forEach(z => { if (!(z in o[f])) delete k.w[f][z]; }); Object.assign(k.w[f], o[f]); } }); if (k.w.notifs) k.w.notifs.splice(0, k.w.notifs.length - k.nn); }
  [k.b, k.nb].forEach(([bt, j]) => { if (bt && j) Object.assign(bt, JSON.parse(j)); });
  try { seatRebuild(); } catch (e) { /* bound again on the next read */ }
}
const p6Terms = w => w && w.signup ? JSON.stringify([w.signup.pin || null, w.signup.p4 || null, w.signup.sig || null, w.signup.termsRef || null, ((w.plans || []).find(p => p.e === 'nvq') || {}).rows || null, ((w.plans || []).find(p => p.e === 'nvq') || {}).deposit || null]) : '';
function p6Execute(id) {
  const q = p6Req(id), deny = p6ExecWhy();
  if (!q) return { ok: false, why: 'That transfer request doesn\'t exist.' };
  if (deny) { logA('Batches', p6Who(q.lid), 'Blocked: carry out batch transfer', q.state, 'No change', deny); return { ok: false, why: deny, denied: true }; }
  if (q.state !== 'Approved') { logA('Batches', p6Who(q.lid), 'Blocked: carry out batch transfer (not approved)', q.state, 'No change', q.id); return { ok: false, why: `${q.id} is ${q.state.toLowerCase()} — nothing was moved.`, dup: q.state === 'Executed' }; }
  const fail = why => { q.state = 'Execution failed'; q.exec = { at: now().toISOString(), by: p6Me().name, ok: false, why }; p6Hist(q, 'Execution failed', why); logA('Batches', `${p6Who(q.lid)} · ${q.from} → ${q.to}`, 'Batch transfer not carried out', 'Approved', `Execution failed (${q.id})`, why); p6Tell(q, 'failed'); return { ok: false, why, state: q.state }; };
  const b = chBatch(q.from), nb = chBatch(q.to), cur = p6CurBatch(q.lid);
  if (!cur || cur.code !== q.from) return fail(`The learner's batch is no longer ${q.from} — this approval doesn't cover another batch`);
  const y = p6Why(q.lid, b, nb); if (y) return fail(y);
  const w = chWorldByLid(q.lid), t0 = p6Terms(w), k = p6Snap(q.lid, b, nb), held = [], tst = toast;
  let res, err = null; P6_RUN = q.id; toast = (m, c) => { held.push([m, c]); };
  try { res = chDoMove(q.lid, b, nb, q.why); } catch (e) { err = e; } finally { P6_RUN = null; toast = tst; }
  const moved = !err && res !== false && seatActive(nb.code, q.lid) && !seatActive(b.code, q.lid) && (!w || w.signup.batch === nb.code);
  if (!moved || (w && p6Terms(w) !== t0)) {
    p6Restore(k);
    const msg = err ? `the move stopped (${err.message}) and everything it touched was put back` : moved ? 'the signed financial terms would have changed — everything was put back' : [...new Set(held.filter(x => x[1] === 'err').map(x => x[0]))].join(' ') || `${nb.code} couldn't take the learner`;
    return fail(msg);
  }
  // A roster row (Add learner) follows the place: the move itself carries only cohort entries
  const rows = (b.roster || []).filter(x => x[1] === q.lid); if (rows.length) { b.roster = b.roster.filter(x => x[1] !== q.lid); if (!(nb.roster = nb.roster || []).some(x => x[1] === q.lid)) nb.roster.push(rows[0]); }
  // Classes: the old batch's upcoming classes (and their Zoom links) leave the learner's calendar; the new batch's are synced in.
  // Past classes and recorded attendance are kept (nothing has been held: neither batch has started).
  if (w && w.events && typeof batchEvents === 'function') { const old = new Set(batchEvents(b).filter(e => e.type === 'class').map(e => e.id)), t = now().getTime(); w.events = w.events.filter(e => !(e.type === 'class' && (old.has(e.id) || old.has(String(e.id).replace(/^bs-/, ''))) && Date.parse(e.end || e.start) > t)); try { s4bSyncWEv(w); } catch (e) { /* drawn again on the next calendar view */ } }
  q.state = 'Executed'; q.exec = { at: now().toISOString(), by: p6Me().name, ok: true, seat: (seatActive(nb.code, q.lid) || {}).id || null };
  p6Hist(q, 'Executed', `Moved ${q.from} → ${q.to}`);
  logA('Batches', `${p6Who(q.lid)} · ${q.from} → ${q.to}`, 'Batch transfer carried out', q.from, `${q.to} (${q.id})`, `Approved ${q.dec.kind === 'override' ? 'by Super Administrator override' : 'by ' + q.dec.by}; signed terms unchanged`);
  p6Tell(q, 'executed');
  return { ok: true, state: q.state };
}
// The requester hears the outcome once per state (the learner and Coordinators are told by the move itself)
function p6Tell(q, what) {
  const k = 'told' + what; if (q[k]) return; q[k] = true;
  const t = { refused: 'Batch transfer refused', invalid: 'Batch transfer no longer valid', failed: 'Batch transfer not carried out', executed: 'Batch transfer carried out' }[what];
  if (typeof acaNotify === 'function') acaNotify(t, `${chLidName(q.lid)}: ${q.from} → ${q.to} (${q.id})`, 'a-transfers');
}

/* ---------- No other way to move an enrolled learner ---------- */
const _mvP6 = chDoMove;
chDoMove = function (lid, b, nb) {
  if (P6_RUN) return _mvP6.apply(this, arguments);
  const why = p6Why(lid, b, nb);
  logA('Batches', p6Who(lid), 'Blocked: batch change without an approved transfer request', b ? b.code : '—', nb ? nb.code : '—', why || 'No approved transfer request');
  toast(`${why ? why + '. ' : 'A batch transfer needs a request approved by an Academic Admin (or a Super Administrator override). '}Nothing was changed.`, 'err');
  return false;
};
// The Assign / change batch dialog (enrolled learners) now makes a request; applicants keep L3-C's assignment
const _dlgP6 = ACT.chMoveBatch;
ACT.chMoveBatch = el => {
  const lid = el && el.dataset && el.dataset.id, open = lid && p6Open(lid);
  const w = lid && chWorldByLid(lid); if (w && w.signup && !w.signup.done) return _dlgP6(el);
  if (open && p6CanRequest()) { toast(`${open.id} for this learner is ${open.state.toLowerCase()} — see Batch transfers.`, 'info'); return go('a-transfers', { id: open.id }); }
  const r = _dlgP6(el); if (!MODAL || !/id="ch-mv-b"/.test((MODAL.extra || '') + (MODAL.body || ''))) return r;
  MODAL.title = MODAL.title.replace('Assign / change batch', 'Request batch transfer');
  MODAL.body = (MODAL.body || '').replace('Only batches of', 'An Academic Admin approves the transfer (or a Super Administrator overrides); it is carried out only after approval, after everything is checked again. Only batches of');
  const ok = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (!ok) return r;
  ok.label = 'Submit request';
  ok.fn = () => {
    const code = mval('#ch-mv-b'), why = mval('#rsn'); if (!why) { fieldErr('#rsn', 'Enter a reason'); return false; }
    const out = p6Request(lid, code, why); if (out.denied) { toast(out.why, 'err'); closeModal(); return false; }
    if (!out.ok) { toast(out.why + ' Nothing was changed.', 'err'); return false; }
    closeModal(); render(); toast(`Transfer request ${out.id} submitted — an Academic Admin approves it.`);
  };
  renderModal(); return r;
};
// Learner 360 → Enrolments: the request's state on the batch card
const _cardP6 = chMoveCard;
chMoveCard = function (lid) {
  const h = _cardP6.apply(this, arguments), w = chWorldByLid(lid); if (!h || (w && w.signup && !w.signup.done)) return h; // applicants: L3-C's card
  const q = P6().reqs.find(x => x.lid === lid), out = h.replace('>Assign / change batch<', '>Request batch transfer<').replace('Before the start, a batch can be changed to another batch of the same course with a place (reason required, audited).', 'Before either batch starts, a transfer to another batch of the same course can be requested; an Academic Admin approves it (reason required, audited).');
  return q ? out.replace('</section>', `<p class="small p6-card">Transfer request <a href="#a-transfers.${q.id}" data-go="a-transfers" data-id="${q.id}">${q.id}</a>: ${esc(q.from)} → ${esc(q.to)} · ${chip(q.state, p6Tone(q.state))}</p></section>`) : out;
};
const p6Tone = st => ({ 'Pending Academic Approval': 'amber', Approved: 'blue', Executed: 'green', Refused: 'grey', Invalidated: 'grey', 'Execution failed': 'red' })[st] || 'grey';

/* ---------- Batch transfers screen (Academic Admin, Super Administrator) ---------- */
const p6CanSee = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()));
SCREENS['a-transfers'] = p => {
  if (!p6CanSee()) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not available</h1><p class="muted">Batch transfer requests are for the Academic Admin and the Super Administrator.</p></div>`;
  const id = p && p.id, q = id && p6Req(id);
  if (q) {
    const can = q.state === 'Pending Academic Approval' && !p6DecideWhy(q, 'approve'), exe = q.state === 'Approved' && !p6ExecWhy();
    return `${pageA(`Transfer request <span class="mono">${esc(q.id)}</span>`, `${esc(chLidName(q.lid))} (${esc(q.lid)}) · ${esc(q.course)}`, chip(q.state, p6Tone(q.state)), [['Batch transfers', 'a-transfers'], [q.id]])}
      <section class="card p6-req"><dl class="kv"><dt>From</dt><dd>${esc(q.from)}</dd><dt>To</dt><dd>${esc(q.to)}</dd><dt>Requested</dt><dd>${esc(q.by.name)} (${esc(q.by.role)}) · ${fdt(q.at)}</dd><dt>Reason</dt><dd>${esc(q.why)}</dd>
      <dt>Decision</dt><dd>${q.dec ? `${esc(q.dec.kind === 'override' ? 'Super Administrator override' : q.dec.kind === 'invalid' ? 'Invalidated' : q.dec.kind === 'refuse' ? 'Refused' : 'Approved')} · ${esc(q.dec.by)} · ${fdt(q.dec.at)} · ${esc(q.dec.why)}` : 'Not decided'}</dd>
      <dt>Execution</dt><dd>${q.exec ? `${q.exec.ok ? 'Carried out' : 'Failed'} · ${fdt(q.exec.at)}${q.exec.why ? ' · ' + esc(q.exec.why) : ''}` : '—'}</dd>
      <dt>Signed terms</dt><dd>${q.terms ? `${esc(q.terms.policy)} · offer letter v${esc(String(q.terms.letterV || '—'))} — kept unchanged by a transfer` : 'No signed terms on record'}</dd></dl>
      ${can || isSA() && q.state === 'Pending Academic Approval' || exe ? `<div class="row">${can && !isSA() ? `<button class="btn btn-primary" data-act="p6Dec" data-id="${q.id}" data-v="approve">Approve and transfer</button>` : ''}${isSA() && q.state === 'Pending Academic Approval' ? `<button class="btn btn-primary" data-act="p6Dec" data-id="${q.id}" data-v="override">Override and transfer (Super Administrator)</button>` : ''}${can || isSA() && q.state === 'Pending Academic Approval' ? `<button class="btn" data-act="p6Dec" data-id="${q.id}" data-v="refuse">Refuse</button>` : ''}${exe ? `<button class="btn btn-primary" data-act="p6Exec" data-id="${q.id}">Carry out transfer</button>` : ''}</div>` : q.state === 'Pending Academic Approval' ? `<p class="small muted">${esc(p6DecideWhy(q, 'approve'))}</p>` : ''}
      <h3 class="small">History</h3><ul class="list small">${q.hist.map(h => `<li class="li">${fdt(h.at)} · ${esc(h.what)} · ${esc(h.by)} (${esc(h.role)})${h.why ? ' — ' + esc(h.why) : ''}</li>`).join('')}</ul></section>`;
  }
  const rs = P6().reqs;
  return `${pageA('Batch transfers', 'Requests to move an enrolled learner to another batch before either batch starts. An Academic Admin approves; a Super Administrator may override. Nothing moves until approved, and everything is checked again first.')}
    <section class="card">${rs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Request</th><th>Learner</th><th>From</th><th>To</th><th>Requested by</th><th>Status</th></tr></thead><tbody>${rs.map(q => `<tr><td><a href="#a-transfers.${q.id}" data-go="a-transfers" data-id="${q.id}" class="mono">${q.id}</a></td><td>${esc(chLidName(q.lid))}</td><td>${esc(q.from)}</td><td>${esc(q.to)}</td><td>${esc(q.by.name)}</td><td>${chip(q.state, p6Tone(q.state))}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><p>No transfer requests. Request one from a learner's record (Learner 360 → Enrolments → Request batch transfer).</p></div>`}</section>`;
};
ACT.p6Dec = el => {
  const id = el && el.dataset && el.dataset.id, v = el && el.dataset && el.dataset.v, q = p6Req(id), deny = p6DecideWhy(q, v === 'override' ? 'override' : 'approve');
  if (deny) { logA('Batches', q ? p6Who(q.lid) : id || '—', `Blocked: ${v} batch transfer`, q ? q.state : '—', 'No change', deny); toast(deny, 'err'); return false; }
  reasonDlg({ title: `${v === 'refuse' ? 'Refuse' : v === 'override' ? 'Override and transfer' : 'Approve and transfer'} — ${esc(q.id)}`, ok: v === 'refuse' ? 'Refuse' : 'Approve and transfer', danger: v === 'refuse',
    body: `<p class="small">${esc(chLidName(q.lid))}: ${esc(q.from)} → ${esc(q.to)}. ${v === 'refuse' ? 'Nothing is moved.' : 'Everything is checked again; if the transfer is still valid it is carried out at once, otherwise nothing changes and the reason is recorded.'}</p>`,
    onOk: r => { const out = p6Decide(id, v, r); if (out.denied) { toast(out.why, 'err'); return; } if (!out.ok && !out.state) { toast(out.why, 'err'); return false; } render(); toast(out.ok ? (out.state === 'Executed' ? `${q.id}: transferred to ${q.to}.` : `${q.id}: ${out.state.toLowerCase()}.`) : `${q.id}: ${out.state.toLowerCase()} — ${out.why}`, out.ok ? 'ok' : 'err'); } });
};
ACT.p6Exec = el => { const out = p6Execute(el && el.dataset && el.dataset.id); render(); toast(out.ok ? 'Transfer carried out.' : out.why, out.ok ? 'ok' : 'err'); return out.ok; };
ANAV.forEach(g => { if (g[0] === 'Academic') { const i = g[1].findIndex(x => x[0] === 'a-batches'); g[1].splice(i + 1, 0, ['a-transfers', 'Batch transfers', 'users']); } });
KNAV.forEach(g => { if (g[0] === 'Delivery') { const i = g[1].findIndex(x => x[0] === 'a-batches'); g[1].splice(i + 1, 0, ['a-transfers', 'Batch transfers', 'users']); } });
ACA_ROUTES.add('a-transfers');
if (typeof ROUTE_PURPOSE !== 'undefined') ROUTE_PURPOSE['a-transfers'] = 'Requests to move an enrolled learner to another batch before it starts, and their approval.';

/* ---------- Cancellation can't move learners; a waitlist offer can't take a learner out of another batch ---------- */
const _cancelP6 = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const r = _cancelP6(el); if (!MODAL || !/cb-d/.test(MODAL.body || '')) return r;
  MODAL.body = MODAL.body.replace(/(<select[^>]*class="select cb-d"[^>]*>)([\s\S]*?)(<\/select>)/g, (m, a, opts, z) => a + opts.replace(/<option value="([^"]*)"[^>]*>[^<]*<\/option>/g, (o, v) => (v === '' || v === 'refund' ? o : '')) + z)
    .replace('</p>', ' Moving a learner to another batch needs an approved transfer request: transfer them first (Learner 360 → Enrolments), then cancel.</p>');
  const ok = MODAL.actions.find(x => x.cls && /danger|primary/.test(x.cls));
  if (ok && ok.fn && !ok._p6) { const g = ok.fn; ok._p6 = true; ok.fn = (...a) => { const mv = $$('#modal-root .cb-d').filter(s => s.value && s.value !== 'refund'); if (mv.length) { logA('Batches', el.dataset.id, 'Blocked: cancel batch (move without an approved transfer)', '—', 'No change', mv.map(s => s.dataset.id).join(', ')); toast('A learner can only be moved through an approved transfer request — nothing was cancelled.', 'err'); return false; } return g(...a); }; }
  renderModal(); return r;
};
const _offerP6 = ACT.kOffer;
ACT.kOffer = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), x = b && el.dataset.w1 && typeof w1WaitOf === 'function' ? w1WaitOf(b, el.dataset.w1) : null;
  const other = x && x.lid && SEATS().recs.find(s => s.lid === x.lid && s.batch !== b.code && seatIsActive(s) && (z => !!z && z.course === b.course && !['Completed', 'Archived', 'Cancelled'].includes(z.status))(chBatch(s.batch)));
  if (other) { logA('Batches', `${b.label} (${b.code})`, 'Blocked: offer a waitlist place (learner holds a place in another batch)', other.batch, 'No change', `${x.name} — use a batch transfer request`); toast(`${x.name} already has a place in ${other.batch} — moving them needs an approved batch transfer. Nothing was changed.`, 'err'); return false; }
  return _offerP6(el);
};

UXC.push(['P6', 'Approved batch transfers (12 Nov 2026)', [
  'An enrolled learner moves to another batch only through a transfer request: an administrator requests it (Learner 360 → Enrolments → Request batch transfer), an Academic Admin approves it (or the Super Administrator overrides, with a reason), and it is carried out only after everything is checked again: same programme, version, fee option and delivery mode; a free place; neither batch started; signed payment terms unchanged; nothing waiting for Finance.',
  'Batch cancellation no longer moves learners (transfer them first). Applicants still choose their own batch before paying.']]);
