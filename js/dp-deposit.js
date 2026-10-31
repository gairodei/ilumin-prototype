/* ============================================================
   Batch DP — deposit, seat hold and first-balance audit (31 Oct 2026; PD-DP-* in PROVISIONAL-DECISIONS.md).
   Round 1. The learner side of the deposit route was sound end to end (sign-up, deposit offer, £ deposit / £ balance shown, a
   pending bank transfer not counted as paid, the seat hold kept on confirmation, the balance paid once). The defects were on the
   Finance side, for every learner who isn't one of the legacy worlds A–F / H (a learner who registers, the client demo's
   learners, a learner the Academy adds): the Finance screens listed only those legacy worlds.
   - Record offline payment had no target for them (the dialog threw): payTargets now covers every learner account.
   - Finance → Deposits listed only two legacy learners and the seeded rows, with a fixed £2,100 balance.
   - Payment Plans → Learner schedules didn't offer them in the learner selector.
   - A second confirmation of the same payment recorded a second receipt; Pay now on a paid row opened a £0 checkout.
   - Refunding the deposit's own transaction left the deposit counting as paid.
   - Record offline payment checked the role only by hiding the screen.
   Round 2 (seat reservation lifecycle, PD-DP-09…). A seat held by a deposit was counted as enrolled and nothing ever ended it:
   an expired hold kept blocking capacity, the balance stayed payable after a release, and staff saw a held seat as an enrolment.
   - One status for a learner's seat (dpSeat): reserved (deposit route, balance unpaid, agreed hold not ended), Finance review
     (the deposit was refunded in full or in part — no rule says what that does to the seat), occupied (any other completed
     sign-up, or the balance paid), released (P-32). The learner's and staff screens all read it.
   - Hold expiry is checked against the agreed hold timestamp whenever a screen is drawn and before every seat- or payment-
     sensitive action (there is no timer). An ended hold is released by the existing P-32 rule (the learner leaves the batch, the
     count drops by one, the deposit is kept): no refund or forfeit is recorded. The date used is the demo's today plus Finance's
     simulated-date offset (Payment Plans → Payment reminders), so an expiry can be demonstrated.
   - No balance is taken, by the learner or Finance, toward a released, expired or Finance-review reservation, and collecting
     money never restores a released seat. Signing up again is the reallocation; the earlier payment record is kept (history).
   Nothing here changes a fee, a schedule or a learner's agreed terms. Loads last.
   ============================================================ */
'use strict';

// The worlds Finance's payment targets were written for (finance.js payTargets); every other learner account is added here
const DP_OLD = ['A', 'B', 'C', 'D', 'F'];
const dpWorlds = () => learnerAccounts().filter(v => !DP_OLD.includes(v) && ((STORE.worlds[v].plans || []).length || (STORE.worlds[v].plansHist || []).length));
const dpDue = r => fpP(r.amount) - fpP(r.paid);
const dpRowLbl = (pl, r) => (pl.plan === 'Deposit and balance' ? 'balance' : pl.plan === 'One-time payment' ? 'payment' : 'instalment ' + r.n);

/* ---------- The seat: one status for every screen (round 2) ---------- */
// The date seat holds are checked against: the demo's today plus Finance's simulated-date offset (CB10). No timer runs.
const dpNow = () => new Date(now().getTime() + ((STORE.cbRem && STORE.cbRem.offset) || 0) * DAY);
const dpHoldPl = w => { const pl = fpPl(w); return pl && pl.deposit && pl.plan === 'Deposit and balance' ? pl : null; };
function dpSeat(w) {
  const s = w && w.signup; if (!s) return { st: 'none' };
  const pl = dpHoldPl(w), d = pl && pl.deposit;
  if (chReleased(w) && !(s.again && s.done)) return { st: 'released', batch: s.releasedFrom, hold: d && d.hold, dep: d };
  if (!s.done) return { st: 'none' };
  if (!pl) return { st: 'occupied', batch: s.batch };
  const due = pl.rows.reduce((a, r) => a + Math.max(0, dpDue(r)), 0);
  if (due <= 0) return { st: 'occupied', batch: s.batch, converted: true };
  if (d.hold && dpNow() >= new Date(d.hold)) return { st: 'expired', batch: s.batch, hold: d.hold, dep: d };
  if (fpRefunded(d) || fpP(d.refundedPart) > 0) return { st: 'review', batch: s.batch, hold: d.hold, dep: d, why: fpRefunded(d) ? 'the deposit was refunded' : 'the deposit was partly refunded' };
  return { st: 'reserved', batch: s.batch, hold: d.hold, dep: d, pending: d.status !== 'Paid', due: fpM(due) };
}
const DP_SEAT_LBL = { reserved: ['Seat reserved', 'blue'], review: ['Finance review required', 'red'], occupied: ['Seat secured', 'green'], released: ['Seat released', 'amber'], expired: ['Hold ended', 'amber'] };
const dpAdm = w => (w && w.admission && w.admission.status) || '—';
const dpSeatChip = w => { const x = DP_SEAT_LBL[dpSeat(w).st]; return x ? chip(x[0], x[1]) : ''; };
function dpSeatTxt(w, who) {
  const x = dpSeat(w), you = who === 'learner', m = v => money(v, 'GBP');
  const adm = ` Admission is decided separately (currently: ${dpAdm(w)}).`;
  if (x.st === 'reserved') return `Reserved in ${x.batch} until ${fdt(x.hold)} — not yet a secured place: ${x.pending ? 'the deposit is awaiting confirmation by Finance and ' : ''}the ${m(x.due)} balance is unpaid. ${you ? 'Pay it' : 'It must be paid'} by then, or the seat is released.${adm}`;
  if (x.st === 'review') return `Reserved in ${x.batch} until ${fdt(x.hold)} — Finance review required: ${x.why}. No payment can be taken toward this seat until Finance resolves it; it is not a secured place.${adm}`;
  if (x.st === 'released') return `Released from ${x.batch || 'the batch'} — the seat hold ended before the balance was paid. No payment is taken toward it; a new place needs a new sign-up. ${x.dep && fpRefunded(x.dep) ? 'The deposit was refunded.' : x.dep && x.dep.status === 'Paid' ? 'The deposit received is held by the Academy pending its decision.' : 'The deposit was not received.'}`;
  if (x.st === 'expired') return `Hold ended ${fdt(x.hold)} — the seat is being released.`;
  if (x.st === 'occupied') return `Seat secured in ${x.batch} — ${x.converted ? 'the balance is paid, so the hold has ended' : 'the payment due at sign-up is made'}. This is the payment position only.${adm}`;
  return '';
}
const dpPayWhy = (w, who) => { const x = dpSeat(w); return x.st === 'released' || x.st === 'expired' ? (who === 'fin' ? 'This learner\'s seat was released — no balance can be recorded toward it. A new place needs a new sign-up.' : 'Your seat was released — no payment is taken toward it. To continue, sign up again.')
  : x.st === 'review' ? (who === 'fin' ? 'Finance review required: the deposit was refunded, so no balance can be recorded toward this seat until it is resolved.' : 'Your deposit was refunded — Finance must review your place before any payment is taken.') : ''; };
// Seats in a batch: the counted total (b.enrolled) split into reserved (holds still counted) and confirmed
const dpBatchWorlds = code => learnerAccounts().map(v => STORE.worlds[v]).filter(w => w && w.signup && w.signup.batch === code);
function dpCounts(b) { const r = dpBatchWorlds(b.code).filter(w => ['reserved', 'review'].includes(dpSeat(w).st)).length; return { total: b.enrolled, reserved: r, occupied: Math.max(0, (b.enrolled || 0) - r), cap: b.cap }; }

/* ---------- Hold expiry: reconciled on every read and seat-sensitive action ---------- */
let DP_REC = false;
function dpReconcile() {
  if (DP_REC || typeof STORE === 'undefined' || !STORE.worlds || typeof learnerAccounts !== 'function') return; DP_REC = true;
  try {
    learnerAccounts().forEach(v => {
      const w = STORE.worlds[v], x = dpSeat(w); if (x.st !== 'expired') return; { const hp = dpHoldPl(w); x.paidBal = hp ? hp.rows.reduce((a, r) => a + fpP(r.paid), 0) : 0; }
      const b = chBatch(x.batch), dep = x.dep, got = dep.status === 'Paid', when = dpNow().toISOString();
      chReleaseSeat(w, true); // P-32: leaves the batch (count −1), materials read-only, Sign up again
      const ref = !got && w.signup.pay && w.signup.pay.method === 'bank' ? w.signup.pay.ref : '', h = w.admission.history, bal = x.paidBal || 0, money0 = fpRefunded(dep) ? `deposit refunded${bal ? `; ${money(fpM(bal), 'GBP')} of the balance received — held (Finance review)` : ''}` : got ? `deposit received${bal ? ` and ${money(fpM(bal), 'GBP')} of the balance` : ''} — held; no refund or retention recorded` : `deposit not received${ref ? ` (bank transfer ${ref} still awaiting confirmation)` : ''}; nothing recorded`; // FI-2 (M-10, M-11)
      // not "deposit kept": keeping the deposit isn't in the learner's signed terms (PD-DP-16)
      if (h.length && /^Seat released/.test(h[h.length - 1][0])) h[h.length - 1] = [`Seat released — the seat hold ended ${fdt(x.hold)} with the balance unpaid (${money0})`, when];
      Object.assign(w.admission.deposit, { releasedAt: when, releasedHold: x.hold, kept: false, held: got });
      logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Seat hold ended — seat released', `Reserved in ${x.batch} until ${fdt(x.hold)}`, `Released (checked ${fdt(when)})`, `P-32: the balance was unpaid when the agreed hold ended; ${money0}`);
      notifyLearner(w.v, 'Admission', 'Your seat hold has ended', `Your seat hold ended on ${fdt(x.hold)} before the balance was paid, so your place on ${b ? b.label + ' (' + b.code + ')' : 'the batch'} has been released. Nothing has been refunded or charged. You can still view your materials; to continue, sign up again.`, 'dashboard');
      if (b) chCooNotify(b.coord, 'Seat released', `${chFullName(w)} left ${b.label} (${b.code}) — the seat hold ended with the balance unpaid.`, 'c-batches.' + b.code);
      if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t: 'Seat released — hold ended', b: `${chFullName(w)} · ${x.batch} · ${money(dep.amount, 'GBP')} ${money0}`, at: when, go: 'f-deposits', unread: true });
    });
  } finally { DP_REC = false; }
}
const _renderDP = render;
render = function () { dpReconcile(); return _renderDP.apply(this, arguments); };

/* ---------- Record offline payment: a target for every learner account ---------- */
const _ptDP = payTargets;
payTargets = function () {
  dpReconcile();
  const out = _ptDP.apply(this, arguments), have = new Set(out.map(t => t.key));
  dpWorlds().forEach(v => {
    const w = STORE.worlds[v], cur = 'GBP';
    w.plans.forEach(pl => {
      pl.rows.forEach(r => { const k = `${v}|${pl.e}|${r.n}`; if (r.status !== 'Paid' && !r.confirming && dpDue(r) > 0 && !have.has(k)) out.push({ key: k, label: `${VNAME(v)} — ${pl.title} — ${dpRowLbl(pl, r)} (${money(fpM(dpDue(r)), cur)} ${r.status})`, cur, due: fpM(dpDue(r)), v, pl, r }); });
      if (pl.deposit && pl.deposit.status !== 'Paid' && !fpRefunded(pl.deposit) && !have.has(v + '|dep')) out.push({ key: v + '|dep', label: `${VNAME(v)} — deposit (${money(pl.deposit.amount, cur)} ${pl.deposit.status})`, cur, due: pl.deposit.amount, v, dep: pl.deposit });
    });
  });
  // no balance toward a released or Finance-review reservation (the deposit itself can still be recorded: money received is never refused)
  return out.filter(t => !(t.r && t.v && t.pl && t.pl === dpHoldPl(STORE.worlds[t.v]) && dpPayWhy(STORE.worlds[t.v], 'fin')));
};

/* ---------- A payment is recorded once, and never toward an invalid reservation ---------- */
// Nothing is due on the target any more: a confirmed or refunded deposit, a paid row, a confirmed transfer, a paid overdue or invoice
const dpDone = t => !!t && (t.dep ? t.dep.status === 'Paid' || fpRefunded(t.dep) : t.r ? t.r.status === 'Paid' || dpDue(t.r) <= 0
  : t.chb ? t.chb.status !== 'Awaiting confirmation' : t.od ? t.od.status === 'paid' : t.inv ? t.inv.stage === 'paid' : false);
const _rpDP = recordPayment;
recordPayment = function (t, a, ref) {
  dpReconcile();
  if (dpDone(t)) {
    logA('Finance', ref || '—', 'Blocked: payment already recorded', t.label || '—', 'No change', 'Nothing is due on this item — a second receipt was not recorded');
    toast('Already recorded — nothing is due on this item, so nothing was collected again.', 'err'); return false;
  }
  const w = t && t.v && STORE.worlds[t.v], why = w && t.r && t.pl && t.pl === dpHoldPl(w) ? dpPayWhy(w, 'fin') : '';
  if (why) { logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Blocked: balance toward an invalid reservation', dpSeatTxt(w), 'No change', why); toast(why, 'err'); return false; }
  const late = w && t.dep && chReleased(w), r = _rpDP.apply(this, arguments);
  if (t && t.dep && t.dep.status === 'Paid' && ref && !t.dep.ref) t.dep.ref = ref; // the transaction that paid the deposit (for a refund of it)
  if (late && t.dep.status === 'Paid') { t.dep.afterRelease = true; logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Deposit received after the seat was released', 'Seat released', 'Seat still released — Finance review', 'The payment is recorded; it does not restore the seat (PD-DP-11)'); }
  return r;
};
// The card deposit at sign-up: its checkout transaction is the deposit's. Signing up again after a release: the earlier payment
// record is kept (it was replaced), read-only.
const _ccDP = chComplete;
chComplete = function (w, o) {
  const again = w && w.signup && w.signup.again, old = again && fpPl(w);
  if (old) { (w.plansHist = w.plansHist || []).push(old); old.archived = { at: now().toISOString(), from: w.signup.releasedFrom || '', why: 'Seat released; signed up again' }; logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Earlier payment record kept', old.plan, 'Kept read-only (history)', 'Signed up again after a released seat'); }
  const r = _ccDP.apply(this, arguments), pl = fpPl(w);
  if (pl && pl.deposit && o && o.opt === 'deposit' && o.method !== 'bank' && o.ref && !pl.deposit.ref) pl.deposit.ref = o.ref;
  return r;
};
// Sign up again (the reallocation) waits while the released seat's bank-transfer deposit is still unconfirmed
const _saDP = ACT.chSignAgain;
ACT.chSignAgain = el => {
  const pl = dpHoldPl(W), d = pl && pl.deposit;
  if (chReleased(W) && d && d.status !== 'Paid' && !fpRefunded(d)) { logA('Admissions', `${chFullName(W)} (${W.me.id})`, 'Blocked: sign up again', 'Seat released', 'No change', 'Earlier bank-transfer deposit still awaiting confirmation (Finance review)'); toast('Finance must first confirm your earlier bank transfer for the deposit before you sign up again. Message the Academy if it was never sent.', 'err'); return; }
  return _saDP(el);
};

/* ---------- Record offline payment: Finance Admin / Super Administrator, a known item, something to record ---------- */
const dpFinWhy = () => (isFin() || isSA() ? '' : 'Offline payments are recorded by a Finance Admin or the Super Administrator.');
const _foDP = ACT.finOffline;
ACT.finOffline = el => {
  const why = dpFinWhy(); if (why) return w0Deny('Finance', '—', 'record an offline payment', why);
  const ts = payTargets(), pre = el && el.dataset && el.dataset.k;
  if (pre && !ts.some(t => t.key === pre)) { const w = STORE.worlds[pre.split('|')[0]], no = w && dpHoldPl(w) && dpPayWhy(w, 'fin'); render(); toast(no || 'Already recorded — nothing is due on this item.', no ? 'err' : 'info'); return; } // a stale button never preselects someone else's item
  if (!ts.length) { toast('Nothing is waiting to be recorded.', 'info'); return; }
  const r = _foDP(el), a = MODAL && MODAL.actions.find(x => x.label === 'Confirm payment');
  if (a && !a._dp) { const f = a.fn; a._dp = true; a.fn = (...x) => { const w2 = dpFinWhy(); if (w2) { w0Deny('Finance', '—', 'record an offline payment', w2); return false; } return f(...x); }; }
  return r;
};

/* ---------- The learner's own payments: never twice, never toward an invalid reservation ---------- */
const dpRowOf = el => { const pl = W && W.plans && W.plans.find(p => p.e === el.dataset.e); return pl && { pl, r: pl.rows.find(x => x.n === +el.dataset.n) }; };
const dpLearnerNo = pl => (pl && pl === dpHoldPl(W) ? dpPayWhy(W, 'learner') : '');
const _piDP = ACT.payInst;
ACT.payInst = el => { const o = dpRowOf(el), r = o && o.r, no = o && dpLearnerNo(o.pl); if (no) { render(); toast(no, 'err'); return; } if (r && dpDue(r) <= 0) { render(); toast('This payment is already paid — there is nothing to pay.', 'info'); return; } return _piDP(el); };
const _pbDP = ACT.chPayBank;
ACT.chPayBank = el => { const o = dpRowOf(el), r = o && o.r, no = o && dpLearnerNo(o.pl); if (no) { render(); toast(no, 'err'); return; } if (r && (dpDue(r) <= 0 || r.confirming)) { render(); toast(r.confirming ? 'Your bank transfer for this payment is already awaiting confirmation by Finance.' : 'This payment is already paid — there is nothing to pay.', 'info'); return; } return _pbDP(el); };
const _pbalDP = ACT.payBalance;
ACT.payBalance = el => { const no = dpLearnerNo(dpHoldPl(W)); if (no) { render(); toast(no, 'err'); return; } return _pbalDP(el); };
// The sign-up payment is made once: a completed sign-up never runs the completion again (it would count the seat twice)
const _suPayDP = ACT.suPay;
ACT.suPay = el => { if (W && W.signup && W.signup.done) { go('payments'); toast('Your sign-up payment is already made — see Payments.', 'info'); return; } return _suPayDP(el); };

/* ---------- Refunding the deposit's transaction refunds the deposit ---------- */
const dpDepTx = (w, pl) => (pl && pl.deposit && (pl.deposit.ref || (w.signup && w.signup.pay && w.signup.pay.opt === 'deposit' && w.signup.pay.method !== 'bank' && w.signup.pay.ref))) || null;
const _refDP = refundEffect;
refundEffect = function (i) {
  const d = (i && i.data) || {}, w = d.v && !d.depV && STORE.worlds[d.v], pl = fpPl(w);
  if (pl && pl.deposit && pl.deposit.status === 'Paid' && d.tx && d.tx === dpDepTx(w, pl)) {
    const back = allQueue().filter(x => x.type === 'Refund' && x !== i && (x.data || {}).tx === d.tx && ['Approved', 'Paid/Processed'].includes(x.status)).reduce((a, x) => a + fpP(x.amount), 0) + fpP(i.amount);
    pl.deposit.refundedPart = fpM(Math.min(back, fpP(pl.deposit.amount)));
    if (back >= fpP(pl.deposit.amount)) d.depV = d.v; // the existing deposit-refund handling (finance.js, fp-pay.js) marks it refunded
    else logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Partial deposit refund', `Deposit ${money(pl.deposit.amount, 'GBP')} paid`, `${money(fpM(back), 'GBP')} refunded`, 'The deposit still counts as paid — no rule for a partly refunded deposit (PD-DP-06); the seat needs Finance review (PD-DP-12)');
    if (dpSeat(w).st === 'review') logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Seat needs Finance review', 'Seat reserved', 'Finance review required', 'Deposit refunded — no rule for the seat; no payment is taken toward it until resolved (PD-DP-12)');
  }
  const res = _refDP.apply(this, arguments);
  // PD-DP-18: a learner transaction refunded in several parts is "Refunded" once the parts reach its amount (finance.js judged each
  // refund on its own, so the last part of a split refund left it "Paid" and still offering Raise refund)
  const lw = d.v && STORE.worlds[d.v], t = lw && d.tx && lw.tx.find(x => x.ref === d.tx && x.amount > 0);
  if (t) { const all = allQueue().filter(x => x.type === 'Refund' && (x.data || {}).tx === d.tx && (x === i || ['Approved', 'Paid/Processed'].includes(x.status))).reduce((a, x) => a + fpP(x.amount), 0); if (all >= fpP(t.amount)) t.status = 'Refunded'; }
  return res;
};

/* ---------- Finance → Deposits: every deposit-route learner, from their payment record ---------- */
function dpDepRowOf(v, pl, hist) {
  const w = STORE.worlds[v], L = fpLedger(pl), d = pl.deposit, x = hist ? { st: 'released', batch: pl.archived.from } : dpSeat(w);
  const bal = fpM(fpP(L.outstanding) - (L.st === 'pending' ? fpP(L.dep) : 0)), hold = d.hold || (w.admission.deposit || {}).holdUntil;
  const status = x.st === 'released' ? (fpRefunded(d) ? 'Seat released — deposit refunded' : d.afterRelease ? 'Seat released — deposit received after release (Finance review)' : d.status === 'Paid' ? 'Seat released — deposit held (Finance review)' : 'Seat released — deposit not received')
    : x.st === 'review' ? 'Finance review required' : x.st === 'occupied' ? 'Balance paid' : L.st === 'pending' ? 'Awaiting confirmation' : 'Seat held';
  const sp = !hist && w.signup && w.signup.pay && w.signup.pay.opt === 'deposit' ? w.signup.pay : null;
  return { ref: sp && sp.method === 'bank' ? sp.ref : '', id: 'DEP-' + v + (hist ? '-h' + hist : ''), name: VNAME(v), programme: pl.title, batch: x.batch || '', amount: L.dep, cur: 'GBP', paid: L.st === 'pending' ? null : d.paidAt, hold, status, bal, v, dp: true, pl, hist: !!hist };
}
const dpDepRows = v => { const w = STORE.worlds[v], pl = dpHoldPl(w), out = (w.plansHist || []).filter(p => p.deposit).map((p, k) => dpDepRowOf(v, p, k + 1)); return pl ? out.concat(dpDepRowOf(v, pl, 0)) : out; };
const DP_TONE = { 'Seat held': 'blue', 'Balance paid': 'green', 'Seat released — deposit retained': 'amber', 'Refund raised': 'purple', Refunded: 'grey', 'Not paid': 'grey', 'Awaiting confirmation': 'amber', 'Finance review required': 'red' };
const dpTone = s => DP_TONE[s] || (s.startsWith('Seat released') ? (/review/.test(s) ? 'red' : 'amber') : undefined);
const dpHeld = d => ['Seat held', 'Awaiting confirmation'].includes(d.status) && d.hold;
const dpSimNote = () => { const o = (STORE.cbRem && STORE.cbRem.offset) || 0; return o ? ` Seat holds are checked against the simulated date ${fd(dpNow().toISOString())} (+${o} days — Payment Plans → Payment reminders).` : ''; };
SCREENS['f-deposits'] = () => {
  dpReconcile();
  // the seeded rows and the two legacy learners as before (finance.js), then every other deposit-route learner
  const old = ['B', 'C'].map(v => { const ad = STORE.worlds[v].admission; if (!ad) return null; const dp = ad.deposit; return { id: 'DEP-' + v, name: VNAME(v), programme: STORE.worlds[v].nvq.title, amount: dp.min, cur: dp.cur || STORE.worlds[v].me.cur, paid: dp.paidAt, hold: dp.holdUntil, status: dp.paid ? (dp.holdUntil && daysTo(dp.holdUntil) > 0 ? 'Seat held' : 'Balance paid') : 'Not paid', v }; }).filter(Boolean);
  const rows = STORE.fin.deposits.concat(old, dpWorlds().flatMap(dpDepRows));
  return `${pageA('Deposits', `A deposit reserves a seat for ${chHoldDays()} days from the deposit payment; the seat is confirmed when the balance is paid. A bank-transfer deposit reserves the seat from sign-up and counts as paid only once Finance confirms it. When a hold ends with the balance unpaid, the seat is released (P-32); nothing is refunded, charged or retained automatically. Prototype: holds are checked in this browser whenever a screen is drawn or a seat or payment action runs — this is not a production expiry scheduler.${dpSimNote()}`)}${dt({ id: 'fdep', name: 'Deposits', rows, filters: [{ k: 'q', l: 'Show', get: d => [dpHeld(d) && (new Date(d.hold) - dpNow()) <= 7 * DAY ? 'Expiring in 7 days' : '', d.status.startsWith('Seat released') ? 'Released' : '', d.status === 'Refunded' ? 'Refunded' : '', d.status === 'Awaiting confirmation' ? 'Awaiting confirmation' : '', /review/i.test(d.status) ? 'Finance review' : ''].filter(Boolean).join('|') || 'Other', opts: ['Expiring in 7 days', 'Awaiting confirmation', 'Finance review', 'Released', 'Refunded'] }, { k: 's', l: 'Status', get: d => d.status }],
    cols: [{ k: 'name', l: 'Learner' }, { k: 'programme', l: 'Programme', h: d => `<span class="small">${esc(d.programme)}</span>${d.batch ? `<div class="xs muted mono">${esc(d.batch)}</div>` : ''}${d.hist ? '<div class="xs muted">Earlier record (kept)</div>' : ''}` }, { k: 'amount', l: 'Deposit', r: 1, h: d => amt(d.amount, d.cur) + (d.ref ? `<div class="xs muted mono">${esc(d.ref)}</div>` : '') }, { k: 'paid', l: 'Paid', h: d => d.paid ? fd(d.paid) : '—' },
      { k: 'hold', l: 'Seat held until', h: d => dpHeld(d) ? `${fd(d.hold)} <span class="countdown small" data-count="${d.hold}">${cdown(new Date(d.hold) - dpNow())}</span>` : d.dp && d.status.startsWith('Seat released') && d.hold ? `<span class="small">Ended ${fd(d.hold)}</span>` : '—', s: d => d.hold || '' },
      { k: 'bal', l: 'Balance due', r: 1, h: d => d.dp ? (d.bal > 0 && ['Seat held', 'Awaiting confirmation'].includes(d.status) ? amt(d.bal, d.cur) : d.bal > 0 ? '<span class="xs muted">Not payable</span>' : '—') : d.status === 'Seat held' && d.balance ? amt(d.balance, d.cur) : '—' }, { k: 'status', l: 'Status', h: d => chip(d.status, dpTone(d.status)) }],
    footer: finFoot('Deposits'), act: d => d.dp ? dpDepAct(d) : `${['Seat held'].includes(d.status) ? `<button class="btn btn-sm" data-act="depRefund" data-id="${d.id}">Raise deposit refund</button> ` : ''}${d.status === 'Seat held' ? `<button class="btn btn-sm" data-act="depBal" data-id="${d.id}">Record balance</button> ` : ''}${d.v ? `<button class="btn btn-sm btn-ghost" data-go="f-learner" data-id="${STORE.worlds[d.v].me.id}">View enrolment</button>` : ''}` })}`;
};
// A deposit-route learner's actions: confirm the transfer, record the balance, refund the deposit's transaction — the existing dialogs
function dpDepAct(d) {
  const w = STORE.worlds[d.v], pl = d.pl, r = !d.hist && pl.rows.find(x => dpDue(x) > 0 && !x.confirming), tx = dpDepTx(w, pl), held = ['Seat held', 'Awaiting confirmation'].includes(d.status);
  return `<div class="row" style="gap:4px">${!d.hist && pl.deposit.status !== 'Paid' && !fpRefunded(pl.deposit) ? `<button class="btn btn-sm btn-primary" data-act="finOffline" data-k="${d.v}|dep">Confirm deposit</button>` : ''}${d.status === 'Seat held' && r ? `<button class="btn btn-sm" data-act="finOffline" data-k="${d.v}|${pl.e}|${r.n}">Record balance</button>` : ''}${d.status === 'Seat held' && tx && allTx().some(x => x.v === d.v && x.ref === tx) ? `<button class="btn btn-sm" data-act="dpDepRefund" data-v="${d.v}">Raise deposit refund</button>` : ''}<button class="btn btn-sm btn-ghost" data-go="f-learner" data-id="${w.me.id}">View enrolment</button></div>`;
}
ACT.dpDepRefund = el => {
  const why = dpFinWhy(); if (why) return w0Deny('Finance', '—', 'raise a deposit refund', why);
  const w = STORE.worlds[el.dataset.v], pl = fpPl(w), ref = dpDepTx(w, pl), t = ref && allTx().find(x => x.v === el.dataset.v && x.ref === ref);
  if (!t || !pl.deposit || pl.deposit.status !== 'Paid') { render(); toast('There is no paid deposit to refund for this learner.', 'info'); return; }
  raiseRefund(t, { cat: 'Deposit', text: 'Deposit refund', cons: 'Retain access' });
};

/* ---------- Payment Plans → Learner schedules: every learner with a payment record ---------- */
const _fPlansDP = SCREENS['f-plans'];
SCREENS['f-plans'] = p => {
  const h = _fPlansDP(p), k = h.indexOf('id="fpl"'); if (k < 0) return h; const e = h.indexOf('</select>', k); if (e < 0) return h;
  const seg = h.slice(k, e), sel = ui('fpL', ''), add = dpWorlds().filter(v => !seg.includes(`value="${v}"`)).map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(VNAME(v))}</option>`).join('');
  return add ? h.slice(0, e) + add + h.slice(e) : h;
};

/* ---------- Seat status on the learner's and staff screens (one wording, dpSeatTxt) ---------- */
const dpHasSeat = w => !!(w && dpHoldPl(w) || (w && chReleased(w)));
// Money actually received, refunded and net, once a deposit has been refunded (the ledger's "paid" follows PD-FP-03 / PD-DP-06)
function dpNet(pl) {
  const d = pl && pl.deposit; if (!d) return null; const back = fpRefunded(d) ? fpP(d.amount) : fpP(d.refundedPart); if (!back) return null;
  const got = (d.status === 'Paid' || fpRefunded(d) ? fpP(d.amount) : 0) + pl.rows.reduce((a, r) => a + fpP(r.paid) - fpP(r.credit), 0);
  return { got: fpM(got), back: fpM(back), net: fpM(got - back) };
}
const dpNetTxt = pl => { const n = dpNet(pl); return n ? `Received ${money(n.got, 'GBP')} · refunded ${money(n.back, 'GBP')} · net received ${money(n.net, 'GBP')}.` : ''; };
// Finance's reconciliation summary: the money received when a deposit was refunded, the seat, and "not payable" when it isn't
const _fpSumDP = fpSumHtml;
fpSumHtml = function (pl, w) { let h = _fpSumDP.apply(this, arguments); const n = dpNetTxt(pl); if (n) h += `<p class="small dp-net"><strong>${esc(n)}</strong></p>`; return w && pl === dpHoldPl(w) ? h + `<p class="small dp-seat">${dpSeatChip(w)} ${esc(dpSeatTxt(w))}</p>` : h; };
// Learner → Payments: the deposit-route plan says what the seat is, and has no Pay now when nothing may be paid
const _planCardDP = planCard;
planCard = function (pl) {
  let h = _planCardDP.apply(this, arguments); if (!W || pl !== dpHoldPl(W)) return h;
  const no = dpLearnerNo(pl); if (no) h = h.replace(/<button class="btn btn-sm" data-act="payInst"[^>]*>Pay now<\/button>/g, '');
  return h.replace('<div class="tbl-wrap">', `<div class="note ${no ? 'b-amber' : 'b-blue'} dp-seat">${ic(no ? 'alert' : 'info')}<div class="small"><strong>${DP_SEAT_LBL[dpSeat(W).st] ? DP_SEAT_LBL[dpSeat(W).st][0] : ''}.</strong> ${esc(dpSeatTxt(W, 'learner'))}${dpNetTxt(pl) ? `<br><strong class="dp-net">${esc(dpNetTxt(pl))}</strong>` : ''}</div></div><div class="tbl-wrap">`);
};
// Learner → Payments: an earlier payment record kept after signing up again (read-only); the totals above are the current plan's
const dpHistHtml = (w, who) => (w.plansHist || []).map(pl => `<section class="card dp-hist"><div class="row-b"><h2>${esc(pl.title)} — earlier payment record</h2>${chip('Kept, read-only', 'grey')}</div><p class="small muted">Seat released${pl.archived.from ? ' from ' + esc(pl.archived.from) : ''}; signed up again on ${fd(pl.archived.at)}. Nothing on this record is payable.</p>${fpSumHtml(pl, null)}</section>`).join('');
// "Next due" never points at a balance that can't be paid (the amount stays in Outstanding, labelled on the plan: no money rule is invented)
const _ptotDP = chPlanTotals;
chPlanTotals = function (w) { const t = _ptotDP.apply(this, arguments), hp = w && dpHoldPl(w); if (t && t.next && hp && t.next.pl === hp && dpPayWhy(w)) { let next = null; w.plans.filter(p => p !== hp).forEach(pl => pl.rows.forEach(r => { if (r.status !== 'Paid' && (!next || new Date(r.due) < new Date(next.r.due))) next = { r, pl }; })); t.next = next; } return t; };
const _payDP = SCREENS.payments;
SCREENS.payments = p => { const h = _payDP(p); return W && (W.plansHist || []).length ? h + dpHistHtml(W, 'learner') : h; };
const _fLearnerDP = SCREENS['f-learner'];
SCREENS['f-learner'] = p => { const h = _fLearnerDP(p); if (!p || p.tab !== 'payments') return h; const base = allLearners().find(l => l.id === p.id), w = base && finLearner(base).w; return w && (w.plansHist || []).length ? h + dpHistHtml(w, 'fin') : h; };
// Learner dashboard: the balance item only for a valid reservation; a reservation awaiting deposit confirmation or under review says so
const _aiDP = actionItems;
actionItems = function () {
  let out = _aiDP.apply(this, arguments); if (!W || !dpHasSeat(W)) return out; const x = dpSeat(W);
  if (x.st !== 'reserved' || x.pending) out = out.filter(a => !/^Pay your balance/.test(a.t || ''));
  if (x.st === 'reserved' && x.pending) out.unshift({ sev: 'amber', t: `Seat reserved until ${fd(x.hold)} — deposit awaiting confirmation`, d: esc(dpSeatTxt(W, 'learner')), btn: 'View payments', go: 'payments' });
  if (x.st === 'review') out.unshift({ sev: 'red', t: 'Your place needs Finance review', d: esc(dpSeatTxt(W, 'learner')), btn: 'View payments', go: 'payments' });
  return out;
};
// Learner → Admission & Documents (payment card) and the admin's Sign-up card: the seat line
const _pSumDP = chPaySummary;
chPaySummary = function () { const h = _pSumDP.apply(this, arguments); return h && dpHasSeat(W) ? h.replace('</dl>', `<dt>Your seat</dt><dd>${dpSeatChip(W)} <span class="small">${esc(dpSeatTxt(W, 'learner'))}</span></dd></dl>`) : h; };
const _suSumDP = chSignupSummary;
chSignupSummary = function (w) { const h = _suSumDP.apply(this, arguments); return h && dpHasSeat(w) ? h.replace('</dl>', `<dt>Seat</dt><dd>${dpSeatChip(w)} <span class="small">${esc(dpSeatTxt(w))}</span></dd></dl>`) : h; };
// Batches: the capacity says how many of the counted seats are only reserved
const dpCapTxt = b => { const c = dpCounts(b); return c.reserved ? ` · ${c.occupied} secured, ${c.reserved} reserved` : ''; };
const _aBatchesDP = SCREENS['a-batches'];
SCREENS['a-batches'] = p => { dpReconcile(); let h = _aBatchesDP(p); const b = p && p.id && chBatch(p.id); if (!b) return h; const t = dpCapTxt(b); return t ? h.split(`(${b.enrolled}/${b.cap})`).join(`(${b.enrolled}/${b.cap}${t})`) : h; };
const _cBatchesDP = SCREENS['c-batches'];
if (_cBatchesDP) SCREENS['c-batches'] = p => { dpReconcile(); const h = _cBatchesDP(p), b = p && p.id && chBatch(p.id); if (!b) return h; const t = dpCapTxt(b); return t ? h.replace(`<dt>Capacity</dt><dd>${b.enrolled}/${b.cap}`, `<dt>Capacity</dt><dd>${b.enrolled}/${b.cap}${t}`) : h; };
// Batch lists (admin and Coordinator) and rosters: after drawing, each batch's capacity cell and each reserved learner's row
AFTER.push(() => {
  if (typeof STORE === 'undefined' || !STORE.worlds || !['admin', 'coord'].includes(S.portal)) return;
  (ADMIN.batches || []).forEach(b => {
    const c = dpCounts(b); if (!c.reserved) return;
    document.querySelectorAll(`main tr a[data-id="${b.code}"][data-go$="-batches"]`).forEach(a => { const tr = a.closest('tr'); if (!tr || tr.querySelector('.dp-res')) return; const td = [...tr.children].find(x => /^\s*\d+\/\d+/.test(x.textContent)); if (td) td.insertAdjacentHTML('beforeend', `<div class="xs muted dp-res">${c.occupied} secured · ${c.reserved} reserved</div>`); });
  });
  if (!/-batches$/.test(S.route || '') || !S.params || !S.params.id) return;
  // roster lists (li.mc-r: "Batch member") and roster tables: a reserved learner is tagged, not shown as a confirmed member only
  dpBatchWorlds(S.params.id).forEach(w => { const st = dpSeat(w).st; if (!['reserved', 'review'].includes(st)) return; document.querySelectorAll('main tbody tr, main li.mc-r').forEach(el => { if (!el.textContent.includes(w.me.id) || el.querySelector('.dp-rtag')) return; const at = el.tagName === 'LI' ? el.querySelector('.li-b') : el.children[0]; if (at) at.insertAdjacentHTML('beforeend', `<div class="dp-rtag xs">${dpSeatChip(w)} <span class="muted">until ${esc(fd(dpSeat(w).hold))} — balance unpaid</span></div>`); }); });
});

/* ---------- Seat-hold countdowns use the date the expiry check uses (PD-DP-17) ----------
   The page's countdown ticker counts to data-count on the real clock. With Finance's simulated date ahead, a seat-hold countdown is
   pointed that many days earlier, so it shows the time left at the simulated date. The hold itself and every signed date are unchanged. */
AFTER.push(() => {
  const o = (typeof STORE !== 'undefined' && STORE.cbRem && STORE.cbRem.offset) || 0; if (!o) return;
  const holds = new Set(learnerAccounts().map(v => dpHoldPl(STORE.worlds[v])).filter(Boolean).map(pl => pl.deposit.hold).filter(Boolean));
  document.querySelectorAll('.countdown[data-count]').forEach(c => { const h = c.dataset.count; if (!holds.has(h) || c.dataset.dpHold) return; c.dataset.dpHold = h; c.dataset.count = new Date(new Date(h).getTime() - o * DAY).toISOString(); c.textContent = cdown(new Date(h) - dpNow()); });
});

/* ---------- Reset of the client demo removes every registration (PD-DP-15) ----------
   The client demo's Reset (fxLoadClient) rebuilt the data but kept the registration list, so an address registered before the Reset
   was refused as "an account already exists". It now clears what the legacy Reset clears (ch-b1). */
const _fxLoadDP = fxLoadClient;
fxLoadClient = function () {
  if (typeof clearTimer === 'function') clearTimer('regtick'); S.reg = null; S.regV = null; if (typeof STORE !== 'undefined') delete STORE.regs;
  Object.keys(PERSONAS).filter(k => /^G\d*$/.test(k)).forEach(k => { delete PERSONAS[k]; delete VARIANTS[k]; });
  return _fxLoadDP.apply(this, arguments);
};

/* ---------- Every seat-sensitive action first reconciles ended holds (no timer) ---------- */
['suPay', 'suNext', 'applyNvq', 'payInst', 'payBalance', 'chPayBank', 'chSignAgain', 'addToBatch', 'kOffer', 'kNextIntake', 'chAssignBatch', 'finOffline', 'dpDepRefund', 'batchLife'].forEach(k => { const f = ACT[k]; if (typeof f === 'function') ACT[k] = function () { dpReconcile(); return f.apply(this, arguments); }; });

/* ---------- Records ---------- */
UXC.push(['DP', 'Deposit, seat hold and first balance — end-to-end audit (31 Oct 2026)', [
  'Audit (client demo, real screens): a learner who registers, signs up for the demo programme on its Self-Paced option and chooses the deposit sees £300 now and the £1,500 balance within 28 days; a bank-transfer deposit holds the seat and is not counted as paid until Finance confirms it; confirming keeps the hold agreed at sign-up; paying the balance pays the one balance row, ends the hold and can\'t be paid again.',
  'Fixed: Finance couldn\'t confirm that deposit — Record offline payment listed only the legacy learners (the dialog failed). It now covers every learner account (registered, client demo, added by the Academy).',
  'Fixed: Finance → Deposits lists every deposit-route learner from their payment record, with the real balance and Confirm deposit, Record balance and Raise deposit refund. Payment Plans → Learner schedules offers every learner with a payment record. A second confirmation of the same payment is refused and audited; Pay now on a paid row no longer opens a £0 checkout.',
  'Fixed: a full refund of the deposit\'s own transaction (Ledger → Raise refund, approved) marks the deposit refunded, so it stops counting as paid. Record offline payment checks the Finance role in the action.',
  'Seat reservation (round 2): a deposit reserves the seat; it is secured when the balance is paid (the payment position — admission is decided separately and shown beside it). Batches show "N secured · N reserved" and reserved learners are tagged on the roster; the learner\'s Payments, dashboard and Admission page, the admin Sign-up card and Finance\'s summaries all use one wording.',
  'Seat reservation (round 2): an ended hold is released (P-32) whenever a screen is drawn or a seat- or payment-sensitive action runs — there is no timer. The date used is the demo\'s today plus Finance\'s simulated date (Payment Plans → Payment reminders). Nothing is refunded or charged. No balance is taken toward a released or Finance-review seat; a deposit received after a release is recorded but doesn\'t restore the seat; signing up again keeps the earlier payment record read-only.',
  'Registration (round 2): each registered learner gets their own record and learner ID — a second registration in the same tab no longer replaces the first learner\'s sign-up, payments and reservation.']]);
