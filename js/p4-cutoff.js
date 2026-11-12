/* ============================================================
   P4 — Deposit cutoff, payment routes and forfeiture, behind the inactive REVISED-1 terms (11 Nov 2026; PD-P4-* in
   PROVISIONAL-DECISIONS.md; PD-P0-03 … 06, 08, 09 in P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p3-select.js.
   Isolation. Every rule here applies only to a sign-up whose terms link (P2, signup.termsRef) says REVISED-1. Ordinary sign-ups link
   LEGACY-1 (p2Active) and p2Activate still refuses REVISED-1 for everyone, so no real learner ever reaches this code. The only way to
   link REVISED-1 is p4HarnessRevise, which works only on a page the regression harness built (window.ILM_FIXTURE set before boot) and
   that has also set window.ILM_P4_HARNESS — a deployed build sets neither; anything else is refused and logged.
   What the revised terms change (the existing machinery is reused, not duplicated):
   - Deadlines are calendar dates in the batch's configured IANA time zone (P2): cutoff = start date − 28 days; a new deposit only
     before the cutoff day begins; the first-instalment requirement before the day after the cutoff begins (exclusive instants). No
     configured zone → no revised deposit (the P2 Europe/London fallback is never used for revised terms; U-04).
   - Frozen with the signature (signup.p4): policy, programme and fee option, batch, zone, start date used, deposit, cutoff dates and
     deadlines. Later batch date or zone changes don't move them (PD-P0-08).
   - Route A = the existing "Deposit and balance" route (one row: the whole remaining tuition). Route B = FC's "Deposit, then N payments"
     (deposit credited to payment 1, later payments on their approved dates). The deposit-held seat's hold instant becomes the agreed
     balance deadline instead of payment time + the S4 hold; the deposit > payment 1 refusal (FC, U-13) is kept.
   - Bank transfers: Finance records the actual receipt date and time (batch time zone) when verifying; that instant decides
     timeliness. While a transfer sent before the deadline is unverified, the seat is protected (pending reconciliation) — no release,
     no forfeiture, no timeout (U-02). Late receipts and late deposits are Finance exceptions; nothing is refunded or credited.
   - A missed deadline with nothing pending: the deposit is forfeited (recorded once) and the seat released through P1, atomically.
   Course access is not changed (P5).
   ============================================================ */
'use strict';

const P4_RULE = 'P4-CUTOFF-1';
const p4Harness = () => typeof window !== 'undefined' && window.ILM_P4_HARNESS === true && typeof window.ILM_FIXTURE === 'string';
const P4 = () => { const T = TERMS(); if (!T.p4) T.p4 = { seq: 0, forf: {}, ver: {}, exc: [], log: [] }; return T.p4; };
const p4Rev = w => { try { const t = w && w.signup && p2Terms(w); return !!t && t.policy === 'REVISED-1'; } catch (e) { return false; } };
const p4Now = () => dpNow().getTime(); // Finance's simulated date on the one clock (P2) — the date holds are checked against
const p4Who = w => `${chFullName(w)} (${w.me.id})`;
const p4Iso = ms => new Date(ms).toISOString();
const p4Day = ymd => fd(ymd + 'T12:00:00Z');

/* ---------- Linking a sign-up to REVISED-1: the isolated test harness only ---------- */
function p4HarnessRevise(w, why) {
  const s = w && w.signup;
  if (!p4Harness()) { logA('Settings', s ? p4Who(w) : '—', 'Blocked: link revised terms', 'LEGACY-1', 'No change', 'REVISED-1 is a draft: only the isolated regression harness can link it (U-01, U-11 outstanding)'); return false; }
  if (!s || s.done || s.sig) return false; // a fresh, unsigned application only — signed or completed terms are never changed
  const T = TERMS(), id = 'TL-' + String(++T.seq).padStart(5, '0'), at = now().toISOString();
  T.links[id] = Object.freeze({ id, policy: 'REVISED-1', v: w.v || null, lid: w.me.id, prog: s.prog || null, letterV: s.letterV || null, at, basis: 'Test harness only — revised-terms fixture (not an activation; REVISED-1 stays a draft)', harness: true });
  s.p4From = s.termsRef || null; s.termsRef = id;
  P4().log.unshift({ at, what: 'Revised terms linked (test harness)', lid: w.me.id, ref: id, why: why || '' });
  logA('Settings', p4Who(w), 'Revised terms linked (test harness)', s.p4From || '—', id, why || 'P4 regression fixture');
  return id;
}

/* ---------- Deadlines ---------- */
// The revised cutoff for a batch: only with an explicitly configured Academy time zone (U-04 — the P2 fallback is never used here)
function p4Cut(b) {
  if (!b) return { why: 'No batch is chosen for this application.' };
  const z = batchTz(b);
  if (z.source !== 'configured') return { why: `${b.code} has no Academy time zone configured, so the revised-terms deposit deadlines can't be calculated. An administrator must set the batch's time zone first (no default is decided, U-04).`, tzMissing: true };
  const startYmd = ymdIn(b.start, z.tz), cutoffYmd = ymdAdd(startYmd, -28), lastDepositYmd = ymdAdd(cutoffYmd, -1);
  return { tz: z.tz, startYmd, cutoffYmd, lastDepositYmd, newDepBefore: dayStart(cutoffYmd, z.tz), balBefore: dayEnd(cutoffYmd, z.tz), rule: P4_RULE };
}
// The deadlines that govern this learner: the frozen agreement once signed, else the selected batch's current configuration
function p4Agreed(w) { const s = w.signup; return s.p4 || p4Cut(chBatch(s.batch)); }
function p4Pin(w, basis) {
  const s = w && w.signup; if (!p4Rev(w) || !s || s.p4) return s && s.p4;
  const b = chBatch(s.batch), c = p4Cut(b); if (c.why) return null;
  const P = cb9Pin(w), dep = P && P.dep && P.dep.eff != null ? P.dep.eff : chDepOf(w);
  s.p4 = Object.freeze({ ...c, policy: 'REVISED-1', termsRef: s.termsRef, prog: s.prog || null, optId: P ? P.opt.id : null, optLabel: P ? P.opt.label : null, batch: b.code, batchStart: b.start, deposit: dep, fee: P ? P.opt.fee : chFee(w), at: now().toISOString(), basis });
  logA('Admissions', p4Who(w), 'Revised-terms deadlines fixed', '—', `${b.code} · last new deposit ${p4Day(c.lastDepositYmd)} · first payment by the end of ${p4Day(c.cutoffYmd)} (${c.tz})`, basis);
  return s.p4;
}
const p4BalTxt = a => `before ${fmtTz(a.balBefore, a.tz)} — the end of ${p4Day(a.cutoffYmd)}`;
// Why a NEW revised deposit can't be taken now ('' = it can)
function p4DepWhy(w) {
  const s = w.signup, a = p4Agreed(w); if (a.why) return a.why;
  if (s.p4 && s.batch !== s.p4.batch) return `Your signed deadlines are for ${s.p4.batch}; ${s.batch || 'another batch'} would need a new agreement.`;
  if (p4Now() >= a.newDepBefore) return `The last day for a new deposit on ${s.p4 ? s.p4.batch : s.batch} was ${p4Day(a.lastDepositYmd)} (${a.tz}).`;
  return '';
}
// Provisional, test-only urgency bands (U-03 — the Academy hasn't set thresholds): a reusable state from the time left
const P4_WARN = Object.freeze([[0, 'late', 'Deadline passed', 'red'], [864e5, 'today', 'Due within a day', 'red'], [3 * 864e5, 'urgent', 'Due within 3 days', 'red'], [7 * 864e5, 'soon', 'Due within 7 days', 'amber'], [Infinity, 'upcoming', 'Upcoming', 'blue']]);
function p4Warn(deadline, at = p4Now()) { const left = deadline - at, b = left <= 0 ? P4_WARN[0] : P4_WARN.find(x => left < x[0]) || P4_WARN[P4_WARN.length - 1]; /* the deadline instant itself is late (exclusive boundary) */ return { left, key: b[1], label: b[2], tone: b[3], provisional: 'Warning bands are provisional, for testing only — the Academy has not set them (U-03).' }; }

/* ---------- Deposit eligibility: the revised rule replaces the 28-day rounded rule for revised sign-ups only ---------- */
const _depOkP4 = chDepositOk;
chDepositOk = function (b) {
  const w = typeof W !== 'undefined' ? W : null;
  if (b && w && S.portal === 'learner' && w.signup && !w.signup.done && w.signup.batch === b.code && p4Rev(w)) return !p4DepWhy(w);
  return _depOkP4.apply(this, arguments);
};
// P3: once signed, another batch would change the agreed deadlines
const _whyP4 = p3Why;
p3Why = function (w, b, o = {}) { const y = _whyP4.apply(this, arguments); if (y || o.own || !p4Rev(w) || !w.signup.p4 || !b || b.code === w.signup.p4.batch) return y; return `Your signed deposit deadlines are for ${w.signup.p4.batch} — another batch would need a new agreement`; };
const _signP4 = ACT.suSign;
ACT.suSign = function () { const w = W, r = _signP4.apply(this, arguments); if (w && w.signup && w.signup.sig && p4Rev(w)) p4Pin(w, 'Offer letter signed'); return r; };

/* ---------- What the learner sees before paying ---------- */
function p4Figures(w) {
  const P = cb9Pin(w), a = p4Agreed(w), dep = a.deposit != null ? a.deposit : P && P.dep.eff != null ? P.dep.eff : chDepOf(w), fee = a.fee != null ? a.fee : P ? P.opt.fee : chFee(w);
  const B = P ? P.opt.pay.filter(x => x.k > 1).map(x => { const s = cb9Plan(w, x.k), r1 = s.rows && s.rows[0]; return r1 ? { k: x.k, r1: r1.amount, rest: fpM(fpP(r1.amount) - fpP(dep)), over: fpP(dep) > fpP(r1.amount), sched: r1.due } : null; }).filter(Boolean) : [];
  return { a, dep, fee, restA: fpM(fpP(fee) - fpP(dep)), B };
}
function p4PayPanel(w) {
  const a = p4Agreed(w), why = p4DepWhy(w);
  if (a.why) return `<div class="note b-amber p4-panel" role="status">${ic('alert')}<div class="small"><strong>Revised terms (test fixture): no deposit can be taken.</strong> ${esc(a.why)} You can still pay without a deposit where your programme allows it.</div></div>`;
  const f = p4Figures(w), m = v => money(v, 'GBP');
  return `<div class="note b-blue p4-panel" role="note">${ic('info')}<div class="small"><strong>Revised terms (test fixture — not in force for real learners).</strong>
    <ul class="small" style="margin:6px 0 0 18px"><li>Deposit ${m(f.dep)} · total course fee ${m(f.fee)} — the deposit is part of the fee, never an extra charge.</li>
    <li>Last day for a new deposit: <strong>${esc(p4Day(a.lastDepositYmd))}</strong>. Cutoff date: <strong>${esc(p4Day(a.cutoffYmd))}</strong>. Academy time zone: <strong>${esc(a.tz)}</strong>.</li>
    <li>Route A — deposit, then the remaining tuition (${m(f.restA)}) received ${esc(p4BalTxt(a))}.</li>
    ${f.B.map(x => `<li>Route B — deposit, then ${x.k} payments: ${x.over ? `not available (the deposit is more than payment 1, ${m(x.r1)}; U-13)` : `the remaining ${m(x.rest)} of payment 1 received ${esc(p4BalTxt(a))}; payments 2–${x.k} on their scheduled dates`}.</li>`).join('')}
    <li>If the required payment isn't received by the deadline, the deposit is forfeited and the seat is released; a new place needs a new sign-up and payment. A bank transfer counts when it reaches the Academy's account, not when it is sent.</li>
    <li>A deposit reserves a seat; it doesn't by itself give course access. (The revised access rules are a later stage, P5 — in this prototype access still follows the existing rule.)</li></ul>
    ${why ? `<p class="small p4-nodep" style="margin-top:6px"><strong>No new deposit now:</strong> ${esc(why)}</p>` : ''}</div></div>`;
}
const p4Words = (h, a) => a.why ? h : h.replace(/within \d+(\.\d+)? days/g, `by the end of ${p4Day(a.cutoffYmd)} (${a.tz})`).replace(/by the end of the \d+-day seat hold/g, `by the end of ${p4Day(a.cutoffYmd)} (${a.tz})`)
  .replace(/By [^<]*<span class="xs muted">\(seat hold\)<\/span>/g, `Before ${esc(fmtTz(a.balBefore, a.tz))} <span class="xs muted">(deposit-route deadline)</span>`).replace(/Your seat is held until [^;]*;/g, `Your seat is reserved until ${esc(fmtTz(a.balBefore, a.tz))};`);
const _payP4 = chStepPay;
chStepPay = function (w) {
  const h = _payP4.apply(this, arguments); if (!w || !w.signup || w.signup.done || !p4Rev(w) || chSponsored(w) || typeof h !== 'string' || !/<h2>4\. Payment<\/h2>/.test(h) || /p3-gone|p1-review/.test(h)) return h;
  return p4Words(h, p4Agreed(w)).replace('<h2>4. Payment</h2>', '<h2>4. Payment</h2>' + p4PayPanel(w));
};

/* ---------- Completing a revised deposit: eligibility in the action, then the agreed deadline on the hold and payment 1 ---------- */
const _ccP4 = chComplete;
chComplete = function (w, o, fromCheckout, quiet) {
  const rev = !quiet && w && w.signup && !w.signup.done && p4Rev(w), dep = rev && o && o.opt === 'deposit';
  if (dep) {
    const why = p4DepWhy(w);
    if (why) { logA('Admissions', p4Who(w), 'Blocked: revised-terms deposit', w.signup.batch || '—', 'No change', why); if (fromCheckout) { closeModal(); } toast(why + ' Nothing was charged.', 'err'); render(); return false; }
    p4Pin(w, 'Deposit route chosen at payment');
  }
  const r = _ccP4.apply(this, arguments);
  if (!dep || !w.signup.done) return r;
  const a = w.signup.p4, pl = fpPl(w), ad = w.admission && w.admission.deposit, iso = p4Iso(a.balBefore), route = pl && pl.depRoute === 'inst' ? 'B' : 'A';
  if (pl && pl.deposit) { pl.deposit.hold = iso; pl.deposit.p4 = true; if (pl.rows[0]) { pl.rows[0].due = iso; pl.rows[0].p4Deadline = iso; } }
  if (ad) Object.assign(ad, { holdUntil: iso, holdDays: null, p4: true });
  if (route === 'B' && w.signup.pin) { const p0 = w.signup.pin, pin = e1Freeze({ ...p0, dep: { ...p0.dep, hold: iso, holdDays: null, deadline: iso, rule: P4_RULE }, rows: p0.rows.map((x, i) => (i ? x : { ...x, due: a.cutoffYmd })) }); w.signup.pin = pin; pl.pin = pin; }
  w.signup.p4route = { route, k: route === 'B' ? pl.rows.length : 1, first: pl && pl.rows[0] ? pl.rows[0].amount : 0, deposit: pl && pl.deposit ? pl.deposit.amount : a.deposit, at: now().toISOString() };
  logA('Admissions', p4Who(w), 'Deposit-route deadline applied (revised terms)', '—', `Route ${route} · ${a.batch} · first payment received ${p4BalTxt(a)} (${a.tz})`, `${P4_RULE} — the payment-time seat hold doesn't apply`);
  return r;
};

/* ---------- Bank transfers: claims and Finance's verification of the actual receipt time ---------- */
// A learner's transfer notice (STORE.chBank) is a claim. Its deadline: a deposit must arrive before the last deposit day ends; a
// first-payment transfer before the deposit-route deadline. A claim sent at or after its deadline can't be timely.
function p4Claims(w) {
  if (!p4Rev(w) || !w.signup || !w.signup.p4) return [];
  const a = w.signup.p4, pl = dpHoldPl(w) || fpPl(w);
  return (STORE.chBank || []).filter(x => x.lid === w.me.id && x.ref && (x.opt === 'deposit' || (pl && x.n === 1 && (x.e === pl.e || x.ek === pl.e)))).map(x => {
    const kind = x.opt === 'deposit' ? 'deposit' : 'first', due = kind === 'deposit' ? a.newDepBefore : a.balBefore, ver = P4().ver[x.ref] || null;
    return { x, ref: x.ref, kind, amount: x.amount, sent: Date.parse(x.at), due, ver, open: !ver && x.status === 'Awaiting confirmation' };
  });
}
const p4Pending = w => p4Claims(w).filter(c => c.open && c.sent < c.due);
// The seat: past the deadline, a transfer sent in time and not yet verified protects it (pending reconciliation, no timeout — U-02)
const _seatP4 = dpSeat;
dpSeat = function (w) {
  const x = _seatP4.apply(this, arguments); if (x.st !== 'expired' || !p4Rev(w)) return x;
  const pend = p4Pending(w); return pend.length ? { ...x, st: 'pending', pend } : x;
};
DP_SEAT_LBL.pending = ['Pending bank reconciliation', 'amber'];
const _seatTxtP4 = dpSeatTxt;
dpSeatTxt = function (w, who) {
  if (!p4Rev(w) || !w.signup || !w.signup.p4) return _seatTxtP4.apply(this, arguments);
  const x = dpSeat(w), a = w.signup.p4, R = w.signup.p4route || {}, f = P4().forf[p4Key(w)], you = who === 'learner', m = v => money(v, 'GBP');
  const what = R.route === 'B' ? 'payment 1' : 'the remaining tuition', adm = ` Admission is decided separately (currently: ${dpAdm(w)}).`;
  if (x.st === 'reserved') { const wn = p4Warn(a.balBefore); return `${x.pending ? 'Deposit awaiting verification by Finance' : 'Deposit received'}. Reserved in ${a.batch} — not yet a secured place: ${m(x.due)} of ${what} must be received ${p4BalTxt(a)} (${a.tz}). ${you ? 'Next: pay it' : 'It must be paid'} by then, or the deposit is forfeited and the seat released. [${wn.label}]${adm}`; }
  if (x.st === 'pending') return `The deadline ${fmtTz(a.balBefore, a.tz)} has passed while ${x.pend.map(c => `bank transfer ${c.ref}`).join(', ')} awaits verification by Finance. The seat stays reserved until Finance confirms when the money arrived (no timeout is set, U-02).${adm}`;
  if (x.st === 'released' && f) return `Released from ${f.batch} on ${fdt(f.at)}: ${f.deposit ? `the required payment wasn't received by ${fmtTz(f.deadline, f.tz)}, so the ${m(f.deposit)} deposit was forfeited under the revised terms` : `the deposit wasn't received in time, so nothing was forfeited`}. A new place needs a new sign-up and payment.`;
  if (x.st === 'occupied') return `Seat secured in ${a.batch} — ${what} was received by the deadline. This is the payment position only.${adm}`;
  return _seatTxtP4.apply(this, arguments);
};
// Finance verifies a transfer with the date and time it reached the Academy's account (batch time zone)
function p4LocalMs(ymd, hm, tz) { if (!ymdOk(ymd) || !/^\d{2}:\d{2}$/.test(hm || '')) return NaN; const [h, mi] = hm.split(':').map(Number); if (h > 23 || mi > 59) return NaN; const [y, mo, d] = ymd.split('-').map(Number); let g = Date.UTC(y, mo - 1, d, h, mi); for (let i = 0; i < 3; i++) g = Date.UTC(y, mo - 1, d, h, mi) - tzOffsetMin(g, tz) * 60000; const q = p2Parts(g, tz); return ymdIn(g, tz) === ymd && +q.hour === h && +q.minute === mi ? g : NaN; } // a time that doesn't exist locally (the skipped DST hour) is refused
const p4FinWhy = () => (typeof fiFin === 'function' && fiFin() ? '' : 'Only a Finance Admin or the Super Administrator can verify a bank transfer.');
const p4ClaimByRef = ref => { for (const v of learnerAccounts()) { const w = STORE.worlds[v], c = p4Claims(w).find(z => z.ref === ref); if (c) return { w, v, c }; } return null; };
let P4_POST = false;
function p4Verify(ref, out) { // out: { received: bool, ymd, hm, why }
  const deny = p4FinWhy(); if (deny) return { ok: false, why: deny, denied: true };
  const o = p4ClaimByRef(ref); if (!o) return { ok: false, why: 'That transfer is not awaiting verification.' };
  const { w, v, c } = o, a = w.signup.p4, at = p4Now(), by = (ADMIN && ADMIN.me && ADMIN.me.name) || '—';
  if (c.ver || !c.open) return { ok: false, why: `Transfer ${ref} was already ${c.ver ? c.ver.state.replace(/-/g, ' ') : 'resolved'} — nothing changed.`, dup: true };
  if (!out.received) {
    if (!String(out.why || '').trim()) return { ok: false, why: 'Say why the transfer is recorded as not received.' };
    P4().ver[ref] = Object.freeze({ ref, lid: w.me.id, kind: c.kind, state: 'not-received', sent: p4Iso(c.sent), verifiedAt: p4Iso(at), by, why: String(out.why).trim() });
    c.x.status = 'Not received'; const pl = fpPl(w), r = pl && pl.rows.find(z => z.bankRef === ref); if (r) r.confirming = false;
    logA('Finance', ref, 'Bank transfer recorded as not received (revised terms)', 'Awaiting verification', 'Not received', String(out.why).trim());
    return { ok: true, state: 'not-received' };
  }
  const ms = p4LocalMs(out.ymd, out.hm, a.tz);
  if (!Number.isFinite(ms)) return { ok: false, why: `Enter the date and time the money reached the Academy's account, in ${a.tz}.` };
  if (ms > at) return { ok: false, why: 'The receipt time can\'t be in the future.' };
  const timely = ms < c.due, base = { ref, lid: w.me.id, kind: c.kind, sent: p4Iso(c.sent), receivedAt: p4Iso(ms), verifiedAt: p4Iso(at), by, deadline: p4Iso(c.due), tz: a.tz };
  if (!timely) { // late: recorded as a Finance exception — not applied to the reservation; nothing refunded or credited
    const e = { id: 'P4X-' + String(++P4().seq).padStart(4, '0'), ...base, amount: c.amount, name: chFullName(w), batch: a.batch, state: 'Finance review', why: c.kind === 'deposit' ? 'Deposit received after the last deposit day' : 'First payment received after the deposit-route deadline' };
    P4().exc.unshift(e); P4().ver[ref] = Object.freeze({ ...base, state: 'verified-late', exc: e.id });
    c.x.status = 'Received late — Finance review'; const pl = fpPl(w), r = pl && pl.rows.find(z => z.bankRef === ref); if (r) r.confirming = false;
    logA('Finance', ref, 'Bank transfer received late (revised terms)', `Deadline ${fmtTz(c.due, a.tz)}`, `Received ${fmtTz(ms, a.tz)} — Finance review ${e.id}`, 'Recorded as an exception; not applied to the reservation; nothing refunded or credited');
    if (STORE.fin && STORE.fin.notifs) STORE.fin.notifs.unshift({ to: 'all', t: 'Late bank receipt — Finance review', b: `${chFullName(w)} · ${money(c.amount, 'GBP')} (${ref}) received ${fmtTz(ms, a.tz)}`, at: p4Iso(at), go: 'f-deposits', unread: true });
    return { ok: true, state: 'verified-late', exc: e.id };
  }
  const t = c.kind === 'deposit' ? payTargets().find(z => z.key === v + '|dep') : payTargets().find(z => z.chb && z.chb.ref === ref);
  if (!t) return { ok: false, why: 'Nothing is awaiting payment for that transfer.' };
  let res; P4_POST = true; try { res = recordPayment(t, c.amount, ref, 'Bank transfer', `Verified receipt ${fmtTz(ms, a.tz)} (on time)`); } finally { P4_POST = false; }
  if (res === false) return { ok: false, why: 'The payment could not be recorded — nothing changed.' };
  P4().ver[ref] = Object.freeze({ ...base, state: 'verified-timely' });
  logA('Finance', ref, 'Bank transfer verified on time (revised terms)', 'Awaiting verification', `Received ${fmtTz(ms, a.tz)}`, `Deadline ${fmtTz(c.due, a.tz)} — verified ${fmtTz(at, a.tz)}`);
  return { ok: true, state: 'verified-timely' };
}
// Recording a revised learner's transfer through any other Finance path is refused: the receipt time decides timeliness
const p4TargetW = t => { const v = t && (t.v || (t.chb && t.chb.wv)), w = v && STORE.worlds[v]; return w && p4Rev(w) && w.signup && w.signup.p4 ? w : null; };
const _rpP4 = recordPayment;
recordPayment = function (t) {
  const w = p4TargetW(t);
  if (w && S.portal === 'admin' && !P4_POST && ((t.dep) || (t.chb && t.chb.ref && p4Claims(w).some(c => c.ref === t.chb.ref)))) { logA('Finance', p4Who(w), 'Blocked: record a revised-terms transfer without its receipt time', t.label || '—', 'No change', 'Use Verify bank receipt'); toast('This learner is on the revised terms: use "Verify bank receipt" (Finance → Deposits) to record when the money arrived.', 'err'); return false; }
  return _rpP4.apply(this, arguments);
};
const _offP4 = ACT.finOffline;
ACT.finOffline = el => { const k = el && el.dataset && el.dataset.k, t = k && payTargets().find(z => z.key === k), w = p4TargetW(t), c = w && p4Claims(w).find(z => z.open && ((t.dep && z.kind === 'deposit') || (t.chb && z.ref === t.chb.ref))); if (c) return ACT.p4Verify({ dataset: { r: c.ref } }); return _offP4(el); };
ACT.p4Verify = el => {
  const ref = el && el.dataset && el.dataset.r, deny = p4FinWhy(); if (deny) return w0Deny('Finance', ref || '—', 'verify a bank transfer', deny);
  const o = p4ClaimByRef(ref); if (!o || !o.c.open) { toast('That transfer is not awaiting verification — nothing changed.', 'info'); render(); return; }
  const { w, c } = o, a = w.signup.p4;
  openModal({ title: 'Verify bank receipt — ' + esc(ref), body: `<p class="small">${esc(chFullName(w))} · ${c.kind === 'deposit' ? 'deposit' : 'first payment'} ${money(c.amount, 'GBP')} · sent ${fmtTz(c.sent, a.tz)}. Deadline: received ${esc(fmtTz(c.due, a.tz))} or earlier is on time. Enter when the money reached the Academy's account (bank statement), in <strong>${esc(a.tz)}</strong>.</p>
    <fieldset class="stack"><label class="check"><input type="radio" name="p4-out" value="yes" checked> <span>Received</span></label><label class="check"><input type="radio" name="p4-out" value="no"> <span>Not received</span></label></fieldset>
    <div class="form-grid"><div class="field"><label for="p4-d">Date received</label><input class="input" id="p4-d" placeholder="YYYY-MM-DD"></div><div class="field"><label for="p4-t">Time received</label><input class="input" id="p4-t" placeholder="HH:MM"></div></div>
    <div class="field"><label for="p4-w">Note (required when not received)</label><input class="input" id="p4-w"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Record verification', cls: 'btn-primary', fn: () => { const yes = (($('#modal-root input[name="p4-out"]:checked') || {}).value || 'yes') === 'yes'; const out = p4Verify(ref, { received: yes, ymd: (mval('#p4-d') || '').trim(), hm: (mval('#p4-t') || '').trim(), why: mval('#p4-w') }); if (out.denied) return w0Deny('Finance', ref, 'verify a bank transfer', out.why); if (!out.ok) { toast(out.why, 'err'); return false; } closeModal(); render(); toast(out.state === 'verified-timely' ? 'Verified — received on time.' : out.state === 'verified-late' ? `Received late — recorded for Finance review (${out.exc}).` : 'Recorded as not received.'); } }] });
};

/* ---------- Forfeiture and release: once, atomically, revised terms only ---------- */
const p4Key = w => `${w.me.id}|${w.signup && w.signup.p4 ? w.signup.p4.at : ""}`; // one agreement = one possible forfeiture
function p4Forfeit(w, x) {
  const s = w.signup, a = s.p4, key = p4Key(w); if (!a || P4().forf[key] || s.releasedFrom) return false;
  const pl = dpHoldPl(w), d = pl && pl.deposit, got = !!d && d.status === 'Paid' && !fpRefunded(d), b = chBatch(a.batch), lid = w.me.id, at = p4Now();
  if (!b || !seatActive(b.code, lid)) { logA('Admissions', p4Who(w), 'Blocked: forfeiture (no seat to release)', a.batch, 'No change', 'The seat ledger shows no active place — nothing recorded'); return false; }
  const keep = { seats: JSON.stringify(STORE.seats), s: { batch: s.batch, releasedFrom: s.releasedFrom }, nvq: { batch: w.nvq.batch, status: w.nvq.status }, dep: { ...w.admission.deposit }, adm: w.flags.admitted, enr: w.enrolments.slice(), hist: w.admission.history.length };
  try {
    chReleaseSeat(w, true);
    if (seatActive(b.code, lid) || s.releasedFrom !== b.code) throw new Error('the seat was not released');
  } catch (e) { // roll back: no forfeiture is recorded unless the release completed
    STORE.seats = JSON.parse(keep.seats); Object.assign(s, keep.s); Object.assign(w.nvq, keep.nvq); w.admission.deposit = keep.dep; w.flags.admitted = keep.adm; w.enrolments = keep.enr; w.admission.history.length = keep.hist;
    logA('Admissions', p4Who(w), 'Blocked: forfeiture (release failed — rolled back)', a.batch, 'No change', e.message); return false;
  }
  w.admission.history.length = keep.hist; // the P-32 line ("balance unpaid after N days, deposit kept") doesn't describe a revised release
  const f = Object.freeze({ id: 'FF-' + String(++P4().seq).padStart(4, '0'), key, lid, v: w.v, name: chFullName(w), batch: a.batch, policy: 'REVISED-1', rule: P4_RULE, deadline: p4Iso(a.balBefore), tz: a.tz, deposit: got ? d.amount : 0, depRef: got ? d.ref || null : null,
    disposition: got ? 'Forfeited — retained by the Academy under the revised terms (no refund, no credit, no carry-forward)' : 'Nothing forfeited — the deposit was not received in time', decidedBy: 'System (automatic)', at: p4Iso(at) });
  P4().forf[key] = f; if (d) d.forfeited = { id: f.id, at: f.at, amount: f.deposit };
  Object.assign(w.admission.deposit, { releasedAt: f.at, releasedHold: f.deadline, kept: false, held: false, forfeited: !!got });
  w.admission.history.push([got ? `Deposit forfeited and seat released — the required payment wasn't received by ${fmtTz(a.balBefore, a.tz)} (${f.id})` : `Seat released — the deposit wasn't received by the deadline (${f.id})`, f.at]);
  logA('Finance', p4Who(w), got ? 'Deposit forfeited — seat released' : 'Reservation released — deposit not received', `Reserved in ${a.batch}`, got ? `Forfeited ${money(f.deposit, 'GBP')} (${f.id})` : `Released (${f.id})`, `${P4_RULE}: deadline ${fmtTz(a.balBefore, a.tz)}; ${f.disposition}`);
  notifyLearner(w.v, 'Admission', 'Your reservation has been released', `The required payment wasn't received before ${fmtTz(a.balBefore, a.tz)}. ${got ? `Your ${money(f.deposit, 'GBP')} deposit has been forfeited under the revised terms. ` : ''}Your place on ${b.label || b.code} has been released. To study with us, choose another batch — a new payment is needed.`, 'dashboard');
  chCooNotify(b.coord, 'Seat released', `${chFullName(w)} left ${b.label || b.code} (${b.code}) — the deposit-route deadline passed unpaid.`, 'c-batches.' + b.code);
  if (STORE.fin && STORE.fin.notifs) STORE.fin.notifs.unshift({ to: 'all', t: got ? 'Deposit forfeited — seat released' : 'Reservation released', b: `${f.name} · ${f.batch} · ${got ? money(f.deposit, 'GBP') + ' forfeited' : 'deposit not received'} (${f.id})`, at: f.at, go: 'f-deposits', unread: true });
  return true;
}
function p4Reconcile() { if (typeof learnerAccounts !== 'function' || !STORE.worlds) return; learnerAccounts().forEach(v => { const w = STORE.worlds[v]; if (!w || !p4Rev(w) || !w.signup || !w.signup.p4) return; const x = dpSeat(w); if (x.st === 'expired') p4Forfeit(w, x); }); }
const _recP4 = dpReconcile;
dpReconcile = function () { try { p4Reconcile(); } catch (e) { /* the base reconcile still runs */ } return _recP4.apply(this, arguments); };
// Late payments are refused (a transfer sent after the deadline can't arrive before it); a card payment is received when made
const p4RowLate = (el) => { const w = W; if (!w || !p4Rev(w) || !w.signup || !w.signup.p4) return ''; const pl = (w.plans || []).find(p => p.e === (el && el.dataset && el.dataset.e)); if (!pl || pl !== dpHoldPl(w)) return ''; const n = +(el.dataset.n || 1); return n === 1 && p4Now() >= w.signup.p4.balBefore ? `The deadline ${fmtTz(w.signup.p4.balBefore, w.signup.p4.tz)} has passed — no payment is taken toward this reservation.` : ''; };
['payInst', 'payBalance', 'chPayBank'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function (el) {
  const why = p4RowLate(el || { dataset: { e: 'nvq', n: '1' } }); if (why) { logA('Payments', p4Who(W), 'Blocked: payment after the deposit-route deadline', '—', 'No change', why); render(); toast(why, 'err'); return false; }
  const m0 = MODAL, r = f.apply(this, arguments), a = MODAL && MODAL !== m0 && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && !a._p4) { const g = a.fn; a._p4 = true; a.fn = function () { const y = p4RowLate(el || { dataset: { e: 'nvq', n: '1' } }); if (y) { closeModal(); render(); toast(y, 'err'); return false; } return g.apply(this, arguments); }; }
  return r; }; });
// Signing up again after a revised release: a new agreement (batch choice, letter, deadlines) and a new payment — no P-32 instalments-only rule
const _againP4 = ACT.chSignAgain;
ACT.chSignAgain = function () { const w = W, f = w && P4().forf[p4Key(w)], r = _againP4.apply(this, arguments); if (f && w.signup && !w.signup.done) { (w.signup.p4Hist = w.signup.p4Hist || []).push(w.signup.p4); w.signup.p4 = null; w.signup.p4route = null; w.signup.noDeposit = false; w.signup.sig = null; logA('Admissions', p4Who(w), 'Signing up again (revised terms)', f.id, 'New agreement and payment needed', 'Choose a batch, sign the offer letter for it, pay'); } return r; };

/* ---------- Finance: transfers to verify, late receipts and forfeitures ---------- */
function p4FinCard() {
  const rows = [], P = P4(); learnerAccounts().forEach(v => { const w = STORE.worlds[v]; p4Claims(w).forEach(c => rows.push({ w, c })); });
  if (!rows.length && !P.exc.length && !Object.keys(P.forf).length) return '';
  const st = (w, c) => c.ver ? { 'verified-timely': 'Verified — on time', 'verified-late': 'Received late — Finance review', 'not-received': 'Not received' }[c.ver.state] : c.open ? (p4Now() >= c.due ? (c.sent < c.due ? 'Pending reconciliation — deadline passed' : 'Sent after the deadline') : 'Awaiting verification') : c.x.status;
  const age = c => Math.max(0, Math.floor((p4Now() - c.sent) / 864e5));
  return `<section class="card p4-fin"><h2>Revised terms (test fixture) — bank transfers, late receipts and forfeitures</h2><p class="xs muted">The actual receipt time decides timeliness. A transfer sent before its deadline and not yet verified keeps the seat reserved; no timeout is set (U-02).</p>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>For</th><th class="num">Amount</th><th>Reference</th><th>Sent</th><th>Deadline</th><th>Age</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(({ w, c }) => `<tr><td>${esc(chFullName(w))}</td><td>${c.kind === 'deposit' ? 'Deposit' : 'First payment'}</td><td class="num">${money(c.amount, 'GBP')}</td><td class="mono xs">${esc(c.ref)}</td><td class="xs">${esc(fmtTz(c.sent, w.signup.p4.tz))}</td><td class="xs">${esc(fmtTz(c.due, w.signup.p4.tz))}</td><td>${age(c)} d</td><td>${esc(st(w, c))}${c.ver && c.ver.receivedAt ? `<div class="xs muted">Received ${esc(fmtTz(c.ver.receivedAt, w.signup.p4.tz))} · verified ${esc(fmtTz(c.ver.verifiedAt, w.signup.p4.tz))} by ${esc(c.ver.by)}</div>` : ''}</td><td>${c.open && !p4FinWhy() ? `<button class="btn btn-sm" data-act="p4Verify" data-r="${esc(c.ref)}">Verify bank receipt</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${P.exc.length ? `<h3 class="small">Late receipts — Finance review (nothing refunded or credited)</h3><ul class="list small">${P.exc.map(e => `<li class="li">${esc(e.id)} · ${esc(e.name)} · ${money(e.amount, 'GBP')} (${esc(e.ref)}) received ${esc(fmtTz(e.receivedAt, e.tz))} · ${esc(e.why)}</li>`).join('')}</ul>` : ''}
    ${Object.keys(P.forf).length ? `<h3 class="small">Forfeitures and releases</h3><ul class="list small">${Object.values(P.forf).map(f => `<li class="li">${esc(f.id)} · ${esc(f.name)} · ${esc(f.batch)} · ${f.deposit ? money(f.deposit, 'GBP') + ' forfeited' : 'nothing forfeited'} · ${esc(fmtTz(f.at, f.tz))} · ${esc(f.disposition)}</li>`).join('')}</ul>` : ''}</section>`;
}
const _depScrP4 = SCREENS['f-deposits'];
SCREENS['f-deposits'] = p => { const h = _depScrP4(p), c = p4FinCard(); return c ? h + c : h; };

/* ---------- Learner: the dates kept apart ---------- */
function p4DatesCard(w) {
  if (!w || !p4Rev(w) || !w.signup || !w.signup.p4 || !w.signup.done) return '';
  const a = w.signup.p4, pl = fpPl(w), r1 = pl && pl.rows[0], ver = p4Claims(w).map(c => c.ver).filter(Boolean).find(v => v.kind === 'first'), wn = p4Warn(a.balBefore), live = dpSeat(w).st === 'reserved';
  return `<section class="card p4-dates"><h2>Your payment dates</h2><dl class="kv">
    <dt>Scheduled date of payment 1</dt><dd>${r1 && r1.sched ? esc(cbFd(r1.sched)) : esc(p4Day(a.startYmd))} (batch start)</dd>
    <dt>Deposit-route deadline</dt><dd>Received ${esc(p4BalTxt(a))} · ${esc(a.tz)}${live ? ` ${chip(wn.label, wn.tone)} <span class="xs muted" title="${esc(wn.provisional)}">provisional</span>` : ''}</dd>
    <dt>Received</dt><dd>${ver && ver.receivedAt ? esc(fmtTz(ver.receivedAt, a.tz)) + ' <span class="xs muted">(bank receipt, recorded by Finance)</span>' : r1 && r1.paidAt ? esc(fmtTz(r1.paidAt, a.tz)) : 'Not yet'}</dd>
    <dt>Verified by Finance</dt><dd>${ver ? esc(fmtTz(ver.verifiedAt, a.tz)) : r1 && r1.paidAt ? 'Card payment — no verification needed' : 'Not yet'}</dd></dl></section>`;
}
const _payScrP4 = SCREENS.payments;
SCREENS.payments = p => { const h = _payScrP4(p); if (p && p.tab && p.tab !== 'plans') return h; const c = p4DatesCard(W); return c ? chAfterHead(h, c) : h; };

/* ---------- Administrator: the actionable reason when a revised application's batch has no time zone ---------- */
const _bdP4 = batchDetail;
batchDetail = function (code) {
  const h = _bdP4.apply(this, arguments), b = ADMIN.batches.find(x => x.code === code); if (!b || typeof h !== 'string' || S.portal !== 'admin' || tzOk(b.tz)) return h;
  const n = learnerAccounts().map(v => STORE.worlds[v]).filter(w => w && w.signup && !w.signup.done && w.signup.batch === code && p4Rev(w)).length; if (!n) return h;
  return h.replace('<p class="small p2-tz">', `<p class="small p4-tz" role="alert"><strong>${plural(n, 'application')} on the revised terms can't take a deposit</strong> until this batch's Academy time zone is set — set it below.</p><p class="small p2-tz">`);
};

UXC.push(['P4', 'Revised deposit cutoff, payment routes and forfeiture — built, not in force (11 Nov 2026)', [
  'For sign-ups on the revised terms only (none in force: REVISED-1 can\'t be activated; only the regression harness can link it): the last day for a new deposit is the day before the cutoff (batch start − 28 calendar days in the batch\'s configured time zone), and the first payment must be received by the end of the cutoff day. The dates are fixed when the offer letter is signed.',
  'A bank transfer counts when it reaches the Academy\'s account, as recorded by Finance; while one sent in time awaits verification the seat stays reserved. A missed deadline with nothing pending forfeits the deposit and releases the seat once. Legacy terms are unchanged.']]);
