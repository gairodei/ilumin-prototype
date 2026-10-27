/* ============================================================
   Batch FP — Part A: one deposit-credit model for the programme fee (27 Oct 2026).
   Audit finding: the deposit is already credited, not charged twice. The deposit route (PD-E1-05) schedules ONE balance
   row of fee − deposit (the "net" basis: rows are worked out from the balance after the deposit); the legacy learners
   have a £300 deposit and 6 × £350 = £2,100 (also net); the instalment and pay-in-full routes have no deposit. Nothing
   computes instalments from the full fee and also takes a deposit. What was inconsistent, and is corrected here:
   - the deposit-route balance lived in two places (admission.deposit.balance and the Payments balance row) that were
     never synchronised: "Pay balance" didn't mark the Payments row paid (so it could be paid again), and paying the row
     (learner Payments or Finance) left "Balance due" and the seat hold showing;
   - "Outstanding" left out a deposit still awaiting Finance's confirmation, while the dial counted it;
   - a refunded deposit still counted as paid; Finance's learner schedules didn't show the deposit at all;
   - the deposit card offered "Set up instalments", which doesn't exist for the deposit route.
   fpLedger is the single calculation every payments view now reads. It also handles a "gross" schedule (rows worked
   out from the full fee) safely, which no approved plan uses today: a deposit only counts once it is Paid, and is then
   credited to the earliest unpaid instalment(s), carried forward, never below zero, recorded once and audited.
   Loads after cd-demo.js, before fx-fixtures.js.
   ============================================================ */
'use strict';

const fpP = x => e1Pence(+x || 0), fpM = p => p / 100;
const fpPl = w => w && (w.plans || []).find(p => p.e === 'nvq');
const fpRefunded = d => !!d && d.status === 'Refunded';

/* ---------- The ledger (integer pence inside; pounds out) ----------
   basis: none (no deposit) · net (deposit + rows + adjustments = fee) · gross (rows + adjustments = fee; the deposit is
   credited against them) · mismatch (neither — shown to Finance, never "fixed" automatically). pl.depBasis, when the
   plan was made with one, wins over the inference. */
function fpLedger(pl) {
  const rows = (pl && pl.rows) || [], d = pl && pl.deposit;
  const dep = d ? fpP(d.amount) : 0, st = !d ? 'none' : fpRefunded(d) ? 'refunded' : d.status === 'Paid' ? 'paid' : 'pending';
  const sched = rows.reduce((a, r) => a + fpP(r.amount), 0), adj = rows.reduce((a, r) => a + fpP(r.waived), 0), credit = rows.reduce((a, r) => a + fpP(r.credit), 0);
  const fee = pl && pl.total != null ? fpP(pl.total) : sched + adj + dep;
  const basis = !d ? 'none' : pl.depBasis || (sched + adj + dep === fee ? 'net' : sched + adj === fee ? 'gross' : 'mismatch');
  const rowsPaid = rows.reduce((a, r) => a + fpP(r.paid), 0) - credit; // money actually received on the rows (credits aren't money)
  const depPaid = st === 'paid' ? dep : 0, rowsDue = rows.reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0);
  const unalloc = basis === 'gross' && st === 'paid' ? Math.max(0, dep - credit) : 0; // a paid deposit not yet credited still reduces what is due
  const outstanding = rowsDue - Math.min(unalloc, rowsDue) + (basis === 'net' && st === 'pending' ? dep : 0);
  const refunded = st === 'refunded' ? dep : 0, paid = rowsPaid + depPaid;
  const owed = fee - adj - (basis === 'net' ? refunded : 0); // what the learner pays in all, after waivers (and a refunded net deposit)
  // reconciles: paid + outstanding = what is owed (a deposit bigger than everything left to pay is an overpayment: "Review")
  return { basis, st, fee: fpM(fee), dep: fpM(dep), sched: fpM(sched), adj: fpM(adj), credit: fpM(credit), paid: fpM(paid), outstanding: fpM(outstanding), refunded: fpM(refunded), owed: fpM(owed), ok: basis !== 'mismatch' && paid + outstanding === owed };
}

/* ---------- Gross schedules: credit a paid deposit to the earliest unpaid instalments, once ---------- */
function fpRowSt(r) { r.status = fpP(r.paid) >= fpP(r.amount) ? 'Paid' : fpP(r.paid) > 0 ? 'Partially paid' : r.status === 'Paid' || r.status === 'Partially paid' ? 'Pending' : r.status; }
function fpCredit(w, why) {
  (w && w.plans || []).forEach(pl => {
    const L = fpLedger(pl); if (L.basis !== 'gross') return;
    const who = `${chFullName(w)} (${w.me.id})`;
    if (L.st === 'paid' && fpP(L.credit) < fpP(L.dep)) { // apply what isn't credited yet
      let left = fpP(L.dep) - fpP(L.credit); const got = [];
      pl.rows.forEach(r => { if (left <= 0) return; const room = Math.max(0, fpP(r.amount) - fpP(r.paid)); if (!room) return; const x = Math.min(room, left); left -= x; r.credit = fpM(fpP(r.credit) + x); r.paid = fpM(fpP(r.paid) + x); fpRowSt(r); got.push(`instalment ${r.n} ${money(fpM(x), pl.cur || 'GBP')}`); });
      if (got.length) { (pl.depCredits = pl.depCredits || []).push({ at: now().toISOString(), amount: fpM(fpP(L.dep) - fpP(L.credit) - left), rows: got.slice(), why }); logA('Finance', who, 'Deposit credited to instalments', `${money(L.dep, pl.cur || 'GBP')} deposit paid`, got.join(', '), why || 'Deposit paid'); }
    } else if (L.st !== 'paid' && fpP(L.credit) > 0) { // a refunded (or unconfirmed) deposit no longer counts: take its credit back
      const back = pl.rows.filter(r => fpP(r.credit) > 0).map(r => { const x = fpP(r.credit); r.paid = fpM(Math.max(0, fpP(r.paid) - x)); r.credit = 0; fpRowSt(r); return `instalment ${r.n} ${money(fpM(x), pl.cur || 'GBP')}`; });
      (pl.depCredits = pl.depCredits || []).push({ at: now().toISOString(), amount: -L.credit, rows: back, why }); logA('Finance', who, 'Deposit credit reversed', back.join(', '), '—', why || 'Deposit no longer paid');
    }
  });
}

/* ---------- The deposit-route balance: one figure, from the Payments rows ---------- */
// After any payment: the admission's "balance due" follows the rows, and a fully paid balance ends the seat hold
function fpSyncDep(w) {
  const pl = fpPl(w), ad = w && w.admission && w.admission.deposit; if (!pl || !ad || !pl.deposit || fpLedger(pl).basis !== 'net') return;
  const due = fpM(pl.rows.reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0));
  ad.balance = due; if (!due && ad.holdUntil && !ad.released) { ad.holdUntil = null; ad.balancePaidAt = ad.balancePaidAt || now().toISOString(); }
}
// Any checkout opened by fn() runs fpSyncDep after it succeeds
function fpAfterPay(fn) { const _co = checkout; checkout = o => _co({ ...o, onSuccess: (...a) => { const r = o.onSuccess(...a); fpSyncDep(W); return r; } }); try { return fn(); } finally { checkout = _co; } }
const _payInstFP = ACT.payInst; ACT.payInst = el => fpAfterPay(() => _payInstFP(el));
// "Pay balance" pays the Payments balance row (the same record the learner and Finance see), never a separate figure
const _payBalFP = ACT.payBalance;
ACT.payBalance = el => {
  const pl = fpPl(W), r = pl && pl.deposit && fpLedger(pl).basis === 'net' ? pl.rows.find(x => fpP(x.amount) > fpP(x.paid)) : null;
  if (!r) { if (pl && pl.deposit) { fpSyncDep(W); render(); toast('Your balance is already paid.', 'info'); return; } return _payBalFP(el); }
  return ACT.payInst({ dataset: { e: 'nvq', n: String(r.n) } });
};
// Finance: recording a payment against the balance row (or confirming a deposit) keeps both in step; a confirmed
// deposit keeps the seat hold agreed at sign-up (it was always reset to 28 days from the confirmation)
const _rpFP = recordPayment;
recordPayment = function (t) {
  const w = t && t.v ? STORE.worlds[t.v] : null, ad = w && w.admission && w.admission.deposit, hold = t && t.dep && ad && ad.holdUntil;
  const r = _rpFP.apply(this, arguments); if (!w) return r;
  if (t.dep && hold) t.dep.hold = hold;
  fpCredit(w, 'Deposit confirmed by Finance'); fpSyncDep(w); return r;
};
// Record offline payment never offers a refunded deposit as something to collect
const _ptFP = payTargets; payTargets = function () { return _ptFP.apply(this, arguments).filter(t => !(t.dep && fpRefunded(t.dep))); };
// A refunded deposit stops counting as paid on the learner's schedule
const _refFP = refundEffect;
refundEffect = function (i) {
  const r = _refFP.apply(this, arguments), d = (i && i.data) || {}, w = d.depV && STORE.worlds[d.depV], pl = fpPl(w);
  if (pl && pl.deposit && pl.deposit.status === 'Paid') { pl.deposit.status = 'Refunded'; pl.deposit.refundedAt = now().toISOString(); fpCredit(w, `Deposit refunded (${i.id})`); }
  return r;
};
// New deposit-route schedules say how they were worked out (no inference needed later)
const _ccFP = chComplete;
chComplete = function (w, o) {
  const r = _ccFP.apply(this, arguments), pl = fpPl(w);
  if (pl && pl.deposit && o && o.opt === 'deposit' && !pl.depBasis) pl.depBasis = 'net';
  fpCredit(w, 'Sign-up payment'); return r;
};

/* ---------- What the learner and Finance see ---------- */
// One sentence: how the deposit counts towards this schedule
function fpDepTxt(pl, who) {
  const L = fpLedger(pl), c = pl.cur || 'GBP', m = x => money(x, c), you = who === 'fin' ? 'the learner' : 'you', yr = who === 'fin' ? 'their' : 'your';
  if (L.basis === 'none') return '';
  if (L.st === 'refunded') return `Deposit ${m(L.dep)} refunded — it no longer counts towards the programme fee.`;
  if (L.basis === 'net') return L.st === 'paid' ? `Deposit ${m(L.dep)} paid and credited to the ${m(L.fee)} programme fee. The ${pl.rows.length > 1 ? 'instalments' : 'balance'} below (${m(L.sched)}) exclude it — it isn't charged again.`
    : `Deposit ${m(L.dep)} awaiting confirmation by Finance. It counts as paid only once confirmed; until then it is included in Outstanding. The ${pl.rows.length > 1 ? 'instalments' : 'balance'} below (${m(L.sched)}) already exclude it.`;
  if (L.basis === 'gross') { const cr = pl.rows.filter(r => fpP(r.credit) > 0); return L.st === 'paid' ? `Deposit ${m(L.dep)} paid and credited to ${cr.length ? cr.map(r => `instalment ${r.n} (${m(r.credit)})`).join(' and ') : 'the earliest unpaid instalments'} — the instalments below are worked out from the full ${m(L.fee)} fee, and the credit is taken off what ${you} pay, never charged again.`
    : `Deposit ${m(L.dep)} not paid yet — once it is paid it is credited to ${yr} earliest unpaid instalment. Until then nothing is taken off.`; }
  return `This schedule doesn't reconcile: deposit ${m(L.dep)} + rows ${m(L.sched)}${L.adj ? ` + adjustments ${m(L.adj)}` : ''} ≠ fee ${m(L.fee)}. Finance should review it; nothing has been changed.`;
}
// Finance's reconciliation summary for one plan
function fpSumHtml(pl, w) {
  const L = fpLedger(pl), c = pl.cur || (w && w.me && w.me.cur) || 'GBP', m = x => money(x, c);
  const depDd = L.basis === 'none' ? 'None' : `${m(L.dep)} — ${{ paid: 'paid', pending: 'awaiting confirmation', refunded: 'refunded' }[L.st]}${L.basis === 'gross' && L.credit ? ` · credited ${m(L.credit)}` : ''}`;
  return `<dl class="kv fp-sum"><dt>Programme fee</dt><dd class="num">${m(L.fee)}</dd><dt>Deposit</dt><dd>${depDd}</dd><dt>${L.basis === 'net' ? 'Scheduled after the deposit' : 'Scheduled'}</dt><dd class="num">${m(L.sched)}${L.adj ? ` (after ${m(L.adj)} waived)` : ''}</dd><dt>Paid to date</dt><dd class="num">${m(L.paid)}</dd><dt>Outstanding</dt><dd class="num">${m(L.outstanding)}</dd><dt>Reconciles</dt><dd>${L.ok ? chip('Yes', 'green') : chip('Review', 'red')}</dd></dl>${L.basis !== 'none' ? `<p class="xs muted fp-dep">${esc(fpDepTxt(pl, 'fin'))}</p>` : ''}`;
}
// Learner → Payments: the plan card's totals come from the ledger, with the deposit sentence and each credited row
const _planCardFP = planCard;
planCard = function (pl) {
  let h = _planCardFP.apply(this, arguments); if (!pl) return h; const L = fpLedger(pl), c = pl.cur;
  h = h.replace(/(<span>Paid <strong class="num">)[^<]*(<\/strong><\/span><span>Outstanding <strong class="num">)[^<]*/, `$1${money(L.paid, c)}$2${money(L.outstanding, c)}`);
  const t = fpDepTxt(pl); if (t) h = h.replace('<div class="tbl-wrap">', `<div class="note ${L.basis === 'mismatch' ? 'b-red' : 'b-blue'} fp-led">${ic('info')}<div class="small">${esc(t)}</div></div><div class="tbl-wrap">`);
  pl.rows.filter(r => fpP(r.credit) > 0).forEach(r => { h = h.replace(new RegExp(`(<td class="num">${r.n}</td><td class="r num">[^<]*)`), `$1<div class="xs muted fp-cr">− ${money(r.credit, c)} deposit credit</div>`); });
  return h;
};
// Learner → Payments: the top figures and the dial
const _payFP = SCREENS.payments;
SCREENS.payments = p => {
  let h = _payFP(p); if (!W || !W.plans || !W.plans.length) return h;
  const sum = k => money(W.plans.reduce((a, pl) => a + fpP(fpLedger(pl)[k]), 0) / 100, 'GBP');
  return h.replace(/(Paid so far<\/span><span class="big-num num">)[^<]*/, `$1${sum('paid')}`).replace(/(Outstanding<\/span><span class="big-num num"[^>]*>)[^<]*/, `$1${sum('outstanding')}`);
};
chPlanTotals = function (w) {
  const pls = w.plans.filter(p => p.e === 'nvq').length ? w.plans.filter(p => p.e === 'nvq') : w.plans;
  let total = 0, paid = 0, pending = 0, next = null;
  pls.forEach(pl => { const L = fpLedger(pl); total += fpP(L.owed); paid += fpP(L.paid); pending += fpP(L.outstanding); pl.rows.forEach(r => { if (r.status !== 'Paid' && (!next || new Date(r.due) < new Date(next.r.due))) next = { r, pl }; }); });
  return { total: total / 100, paid: paid / 100, pending: pending / 100, next, nvq: pls.some(p => p.e === 'nvq') };
};
// The deposit card: the balance comes from the Payments row; no "Set up instalments" for a one-row balance
const _depCardFP = depositCard;
depositCard = function () {
  const pl = fpPl(W), dp = W && W.admission && W.admission.deposit;
  let h = _depCardFP.apply(this, arguments); if (!pl || !pl.deposit || !dp) return h; const L = fpLedger(pl), one = pl.rows.length === 1;
  h = h.replace('<button class="btn" data-go="payments">Set up instalments</button>', `<button class="btn" data-go="payments">View payments</button>`)
    .replace(/(<dt>Balance due<\/dt><dd class="num">)[^<]*/, `$1${money(L.basis === 'net' ? fpM(fpP(L.outstanding) - (L.st === 'pending' ? fpP(L.dep) : 0)) : dp.balance, dp.cur)}`);
  if (one) h = h.replace('<dt>Balance</dt><dd>Paid by instalment plan — see Payments</dd>', `<dt>Balance</dt><dd>${L.outstanding ? `${money(L.outstanding, dp.cur)} outstanding — see Payments` : `Paid${dp.balancePaidAt ? ' on ' + fd(dp.balancePaidAt) : ''} — nothing more to pay`}</dd>`);
  return h.replace(/<\/dl>/, `</dl><p class="xs muted fp-dc">${esc(fpDepTxt(pl))}</p>`);
};
// Finance → Payment Plans → Learner schedules: the deposit and the reconciliation, above each plan's rows
const _fPlansFP = SCREENS['f-plans'];
SCREENS['f-plans'] = p => {
  let h = _fPlansFP(p); const sel = ui('fpL', fxClient() ? 'CD1' : 'C'); if ((p.tab || 'schedules') !== 'schedules' || sel.startsWith('od:')) return h;
  const w = STORE.worlds[sel]; if (!w) return h;
  w.plans.forEach(pl => { const k = h.indexOf(`<h3>${esc(pl.title)}</h3>`); if (k < 0) return; const j = h.indexOf('<div class="tbl-wrap">', k); if (j < 0) return; h = h.slice(0, j) + fpSumHtml(pl, w) + h.slice(j); });
  return h;
};
// Finance → learner → Payments, and the admin Learner 360 → Payments
const _fLearnerFP = SCREENS['f-learner'];
SCREENS['f-learner'] = p => {
  let h = _fLearnerFP(p); if (!p || p.tab !== 'payments') return h; const base = allLearners().find(l => l.id === p.id), w = base && finLearner(base).w; if (!w) return h;
  w.plans.forEach(pl => { const s = `<h3>${esc(pl.title)}</h3><table`; if (h.includes(s)) h = h.replace(s, `<h3>${esc(pl.title)}</h3>${fpSumHtml(pl, w)}<table`); });
  return h;
};
const _lPayFP = lPay0;
lPay0 = function (L, w) {
  let h = _lPayFP.apply(this, arguments); if (!w) return h;
  w.plans.forEach(pl => { const s = `<h3>${esc(pl.title)}</h3><span class="small">${pl.plan}</span></div>`; if (h.includes(s)) h = h.replace(s, s + fpSumHtml(pl, w)); });
  return h;
};

/* ---------- Records ---------- */
UXC.push(['FP-A', 'Deposit credit and instalments (27 Oct 2026)', [
  'Audit: the deposit was already credited, not charged twice. The deposit route schedules one balance row of fee − deposit (PD-E1-05), the legacy learners have deposit + instalments of the remaining balance, and the instalment and pay-in-full routes have no deposit. Rule kept: schedules after a deposit are worked out from the balance (net basis).',
  'One calculation (fpLedger) for the learner\'s Payments (plan totals, top figures, dial), the deposit card, Finance → Payment Plans → Learner schedules, Finance → learner → Payments and the admin Learner 360: programme fee, deposit and its state, scheduled amount, paid to date, outstanding, and whether it reconciles.',
  'A deposit awaiting confirmation is not counted as paid and stays in Outstanding. A refunded deposit no longer counts as paid. A confirmed bank-transfer deposit keeps the seat hold agreed at sign-up.',
  '"Pay balance" now pays the Payments balance row, so the balance can\'t be paid twice; paying that row anywhere (learner or Finance) updates the deposit card and ends the seat hold when fully paid. The deposit card no longer offers "Set up instalments".',
  'A schedule worked out from the full fee (none today) gets a paid deposit credited to the earliest unpaid instalment(s), carried forward, never below zero, recorded once and audited; the credit is reversed if the deposit is refunded.']]);
