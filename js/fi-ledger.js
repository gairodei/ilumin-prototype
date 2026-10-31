/* ============================================================
   Batch FI-2 — financial reconciliation and workflow corrections (31 Oct 2026; PD-FI2-* in PROVISIONAL-DECISIONS.md).
   Loads after fi-integrity.js (FI-1), whose checks stay in front of every money action.
   One read model for Finance's balances and reports, replacing the separate formulas the dashboard, Learner Accounts, the
   reports and the admin console each had (several invented or fixed figures among them):
   - fiAcct(w)       one learner account: per plan from fpLedger (fee, paid, outstanding — a released or Finance-review seat's
                     balance is not payable), and the money in and out of the learner's own record.
   - fiObligations() what is owed and when: every learner account's plans, plus the seeded overdue rows (legacy data).
   - fiLedger(f)     every receipt, refund and pending payment in a period, with the programme / course / bundle it belongs to
                     (refunds belong to the payment they refund), filtered by course, agency and payment method.
   The dashboard, Learner Accounts, Finance learner, Learner 360, the Finance reports and the admin console reports read these.
   Workflow corrections: refunds write a refund transaction for every payment they refund (agency and seeded ledger rows too),
   with a unique reference; a Super Admin override of a refund applies its effect once; observation fees are not refundable
   (CH-40); a batch cancellation refunds what each learner actually paid, through Finance approval; overdue instalments of
   every learner account are worked out on the simulated date, with reminders, the authorised pause, arrangements and restore.
   ============================================================ */
'use strict';

const FI_LEGACY = ['A', 'B', 'C', 'D', 'E', 'F', 'H']; // the seeded personas: their seeded overdue process is unchanged
const fiWorldKey = lid => learnerAccounts().find(k => STORE.worlds[k] && STORE.worlds[k].me && STORE.worlds[k].me.id === lid) || null;
const fiWOf = lid => { const k = fiWorldKey(lid); return k ? STORE.worlds[k] : null; };
const fiLive = w => (w.plans || []).filter(pl => !pl.archived);
const fiPinned = w => !!(w.signup && w.signup.pin);
const fiOffset = () => (STORE.cbRem && STORE.cbRem.offset) || 0;
// Days late on the simulated date (CB10's offset; the same date seat holds use, dpNow), in the learner's calendar
const fiLate = (due, w) => calDaysLate(due, tzOfLearner(w.me)) + fiOffset();
const fiUnpayable = (w, pl) => pl === dpHoldPl(w) && ['released', 'review'].includes(dpSeat(w).st);

/* ---------- One learner account ---------- */
function fiAcct(w) {
  const plans = fiLive(w).map(pl => { const L = fpLedger(pl), no = fiUnpayable(w, pl); return { pl, L, payable: !no, outstanding: no ? 0 : fpP(L.outstanding), held: no ? fpP(L.outstanding) : 0 }; });
  const got = (w.tx || []).filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((s, t) => s + fpP(t.amount), 0);
  const back = (w.tx || []).filter(t => t.amount < 0).reduce((s, t) => s + fpP(-t.amount), 0);
  const overdue = plans.reduce((s, p) => s + p.pl.rows.filter(r => r.status === 'Overdue').reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0), 0);
  return { plans, outstanding: plans.reduce((s, p) => s + p.outstanding, 0), held: plans.reduce((s, p) => s + p.held, 0), received: got, refunded: back, net: got - back, overdue };
}
// Everything owed: the learner accounts' plan rows, and the seeded overdue rows (legacy learners without an account)
function fiObligations() {
  const out = [];
  learnerAccounts().forEach(v => { const w = STORE.worlds[v]; fiAcct(w).plans.forEach(p => out.push({ v, lid: w.me.id, name: VNAME(v), course: p.pl.title, outstanding: p.outstanding, rows: p.pl.rows.filter(r => p.payable).map(r => ({ due: r.due, amount: fpP(r.amount), left: Math.max(0, fpP(r.amount) - fpP(r.paid)), status: r.status })) })); });
  ((STORE.fin && STORE.fin.od) || []).filter(o => o.status !== 'paid' && o.status !== 'discontinued').forEach(o => out.push({ lid: o.lid, name: o.name, course: o.course, outstanding: fpP(o.amount) - fpP(o.paid || 0), rows: [{ due: o.due, amount: fpP(o.amount), left: fpP(o.amount) - fpP(o.paid || 0), status: 'Overdue' }] }));
  return out;
}

/* ---------- The ledger: receipts, refunds and pending payments ---------- */
const fiOrigOf = t => t.orig || (String(t.course || t.desc || '').match(/Refund against (\S+)/) || [])[1] || '';
// The programme, course or bundle a payment belongs to (a learner's payment: the plan it was for)
function fiCourseOf(t) {
  const d = String(t.course || t.desc || ''), w = t.v && STORE.worlds[t.v];
  if (/^Observation fee/i.test(d)) return 'Observation fees';
  if (w) { const ps = w.plans || [], pl = ps.find(p => p.title && d.includes(p.title)) || (/\bNVQ\b|deposit|instalment|balance/i.test(d) ? ps.find(p => p.e === 'nvq') : null); if (pl) return pl.title; }
  if (t.payerType === 'Agency') return 'Agency bundle — ' + d.replace(/^Bundle purchase — /, '');
  return d.split(' — ')[0] || '—';
}
const FI_MODES = ['Gateway', 'Bank transfer', 'Cash', 'Invoice'];
const fiModeOf = t => (FI_MODES.includes(t.mode) ? t.mode : 'Other');
function fiLedger(f = {}) {
  const all = allTx(), byKey = new Map(); all.filter(t => !t.refund).forEach(t => byKey.set(t.ref + '|' + t.payer, t));
  const withRow = new Set(all.filter(t => t.refund).map(t => fiOrigOf(t) + '|' + t.payer));
  const cut = f.days ? now().getTime() - f.days * DAY : -Infinity;
  const ev = [];
  all.forEach(t => {
    const src = t.refund ? byKey.get(fiOrigOf(t) + '|' + t.payer) || t : t, base = { at: t.at, ref: t.ref, payer: t.payer, payerType: t.payerType || 'Learner', mode: fiModeOf(src), course: fiCourseOf(src), p: fpP(t.amount) };
    if (t.refund) ev.push({ ...base, kind: 'refund' });
    else if (['Paid', 'Refunded', 'Partially refunded'].includes(t.status)) {
      ev.push({ ...base, kind: 'receipt' });
      // a seeded receipt marked refunded without a refund record: the refund is its processed queue items (or the whole amount)
      if (t.status !== 'Paid' && !withRow.has(t.ref + '|' + t.payer)) { const q = fiSum(fiRefunds(t.ref, t.payer).filter(fiRefDone)), p = q || (t.status === 'Refunded' ? fpP(t.amount) : 0); if (p) ev.push({ ...base, kind: 'refund', p, implied: true }); else ev.push({ ...base, kind: 'unknown-refund', p: 0 }); }
    } else if (t.status === 'Pending') ev.push({ ...base, kind: 'pending' });
  });
  const rows = ev.filter(e => new Date(e.at).getTime() >= cut && (!f.course || e.course === f.course) && (!f.agency || (e.payerType === 'Agency' && e.payer === f.agency)) && (!f.mode || e.mode === f.mode));
  const sum = k => rows.filter(e => e.kind === k).reduce((s, e) => s + e.p, 0);
  return { rows, received: sum('receipt'), refunded: sum('refund'), pending: sum('pending'), net: sum('receipt') - sum('refund'), unknown: rows.filter(e => e.kind === 'unknown-refund').length };
}
// Money awaiting confirmation (bank transfers told to Finance, not yet recorded) — never counted as received
const fiAwaiting = () => (STORE.chBank || []).filter(x => x.status === 'Awaiting confirmation');

/* ---------- Learner Accounts, Finance learner, Learner 360: the learner's own account ---------- */
const _flFI2 = finLearner;
finLearner = function (l) {
  const r = _flFI2.apply(this, arguments), w = r.w || fiWOf(l.id); if (!w) return r;
  const a = fiAcct(w);
  return { ...r, w, out: fpM(a.outstanding), held: fpM(a.held), received: fpM(a.received), refunded: fpM(a.refunded), overdue: a.overdue > 0, access: w.accessPaused ? 'Paused' : w.arrangeUntil ? 'Restored until ' + fd(w.arrangeUntil) : 'Active' };
};
const _lPayFI2 = lPay;
lPay = function (L, w) { return _lPayFI2.call(this, L, w || (L && fiWOf(L.id))); };
// Received, refunded and net on every plan summary where a refund touched the learner's payments (DP showed it for deposits only)
const fiNetTxt = (w, pl) => {
  if (!w || typeof dpNetTxt === 'function' && dpNetTxt(pl)) return '';
  const mine = t => fiCourseOf({ ...t, v: w.v || learnerAccounts().find(k => STORE.worlds[k] === w) }) === pl.title;
  const back = (w.tx || []).filter(t => t.amount < 0 && mine({ ...t, desc: ((w.tx || []).find(x => x.ref === fiOrigOf(t) && x.amount > 0) || {}).desc || t.desc })).reduce((s, t) => s + fpP(-t.amount), 0);
  if (!back) return '';
  const got = (w.tx || []).filter(t => t.amount > 0 && t.status === 'Succeeded' && mine(t)).reduce((s, t) => s + fpP(t.amount), 0);
  return `Received ${money(fpM(got), 'GBP')} · refunded ${money(fpM(back), 'GBP')} · net received ${money(fpM(got - back), 'GBP')}. "Paid to date" counts the instalments settled; a refund doesn't reopen one (no rule — client question).`;
};
const _fsFI2 = fpSumHtml;
fpSumHtml = function (pl, w) { const h = _fsFI2.apply(this, arguments), n = fiNetTxt(w, pl); return n ? h + `<p class="small fi-net"><strong>${esc(n)}</strong></p>` : h; };
const _pcFI2 = planCard;
planCard = function (pl) { const h = _pcFI2.apply(this, arguments), n = fiNetTxt(W, pl); return n ? h.replace(/(<\/section>\s*)$/, `<p class="small fi-net"><strong>${esc(n)}</strong></p>$1`) : h; };

/* ---------- Overdue on the simulated date: every learner account ---------- */
// A row is overdue when its due date has passed (simulated date), it isn't paid, awaiting a transfer confirmation or under an
// arrangement, and it isn't a deposit-route balance (that is the seat hold's, PD-DP-10: never an overdue instalment).
const fiRowLate = (w, pl, r) => pl !== dpHoldPl(w) && !r.arrangement && !r.confirming && r.status !== 'Awaiting confirmation by Finance' && fpP(r.amount) > fpP(r.paid) && fiLate(r.due, w) > 0;
let FI_OD = false;
function fiOdSync() {
  if (FI_OD || typeof STORE === 'undefined' || !STORE.worlds || !STORE.fin) return; FI_OD = true;
  try {
    const log = STORE.fiOd = STORE.fiOd || {}, once = (k, f) => { if (!log[k]) { log[k] = now().toISOString(); f(); } };
    learnerAccounts().filter(v => !FI_LEGACY.includes(v)).forEach(v => {
      const w = STORE.worlds[v], who = `${chFullName(w)} (${w.me.id})`, enr = e => (w.enrolments || []).find(x => x.id === e || (e === 'nvq' && x.kind === 'nvq'));
      let first = null;
      fiLive(w).forEach(pl => pl.rows.forEach(r => {
        const late = fiRowLate(w, pl, r) && !(enr(pl.e) && enr(pl.e).status === 'Discontinued');
        if (late && r.status !== 'Overdue') { r._fiSt = r.status; r.status = 'Overdue'; }
        else if (!late && r._fiSt) { if (r.status === 'Overdue') r.status = fpP(r.paid) > 0 ? 'Partially paid' : r._fiSt; delete r._fiSt; }
        if (r.status !== 'Overdue') return;
        const days = fiLate(r.due, w), k = `${v}|${pl.e}|${r.n}|${r.due}`;
        if (!first) first = { label: 'Instalment ' + r.n, amount: fpM(fpP(r.amount) - fpP(r.paid)), due: r.due, e: pl.e, n: r.n };
        // Day 15 / Day 30: pinned schedules are reminded by CB10 (simulated, logged there); others get the existing notices here
        if (!fiPinned(w) && days >= 15) once(k + '|15', () => notifyLearner(v, 'Payments', 'Payment overdue', `${pl.title} instalment ${r.n} (${money(fpM(fpP(r.amount) - fpP(r.paid)), 'GBP')}) is 15 days overdue (simulated notice — nothing is sent).`, 'payments'));
        if (days >= 30) once(k + '|30' + (fiPinned(w) ? 'p' : ''), () => {
          // The automatic Day 30 pause is the existing overdue process; it is not extended to learners with an agreed (pinned)
          // schedule (PD-CB-72 — client question). Their row is listed and Finance can pause manually (CH-14).
          if (!fiPinned(w) && !w.arrangeUntil) { w.accessPaused = true; w.fiAutoPaused = true; notifyLearner(v, 'Payments', 'Access paused', `Instalment ${r.n} is 30 days overdue — access is paused until it's paid.`, 'payments'); logA('Finance', who, 'Access paused (Day 30, automatic)', 'Active', 'Paused', `${pl.title} instalment ${r.n} 30 days overdue (simulated date)`); }
          else logA('Finance', who, 'Day 30 overdue — automatic pause not applied', '—', 'Listed in Overdue & Access', `Agreed (pinned) schedule: the automatic pause isn't extended to it (PD-CB-72)`);
        });
      }));
      // An arrangement whose date passes unpaid: overdue again; re-paused only if the arrangement restored a paused access
      fiLive(w).forEach(pl => pl.rows.filter(r => r.arrangement && w.arrangeUntil && fpP(r.amount) > fpP(r.paid) && fiLate(w.arrangeUntil, w) > 0).forEach(r => {
        const until = w.arrangeUntil; r.arrangement = false; w.arrangeUntil = null;
        if (w.fiArrPaused) { w.accessPaused = true; w.fiAutoPaused = true; notifyLearner(v, 'Payments', 'Access paused', 'Your payment arrangement date passed unpaid — access is paused again.', 'payments'); }
        STORE.fin.notifs.unshift({ to: 'all', t: w.fiArrPaused ? 'Arrangement lapsed — access re-paused' : 'Arrangement lapsed — instalment overdue again', b: `${chFullName(w)} · ${pl.title} instalment ${r.n}`, at: now().toISOString(), go: 'f-overdue', unread: true });
        logA('Finance', who, 'Payment arrangement lapsed', 'Arrangement until ' + fd(until), w.fiArrPaused ? 'Overdue — access paused again' : 'Overdue', 'The new due date passed unpaid (simulated date)');
        w.fiArrPaused = false;
      }));
      // Settled: an automatic pause ends once nothing is overdue (a manual CH-14 pause is separate and stays)
      if (!first && w.fiAutoPaused && w.accessPaused) { w.accessPaused = false; w.fiAutoPaused = false; notifyLearner(v, 'Payments', 'Access restored', 'Thanks — nothing is overdue now and access is restored.', 'payments'); logA('Finance', who, 'Access restored (nothing overdue)', 'Paused', 'Active', 'Overdue instalments settled'); }
      if (!w.arrangeUntil) w.payOverdue = first;
    });
  } finally { FI_OD = false; }
}
const _rendFI2 = render;
render = function () { fiOdSync(); return _rendFI2.apply(this, arguments); };
const _odFI2 = odRows;
odRows = function () {
  fiOdSync(); const out = _odFI2.apply(this, arguments); if (ADMIN.edge === 'finEmpty') return out;
  learnerAccounts().filter(v => !FI_LEGACY.includes(v)).forEach(v => {
    const w = STORE.worlds[v];
    fiLive(w).forEach(pl => pl.rows.forEach(r => {
      if (!(r.status === 'Overdue' || (r.arrangement && fpP(r.amount) > fpP(r.paid)))) return;
      const days = fiLate(r.due, w), en = (w.enrolments || []).find(e => e.id === pl.e || (pl.e === 'nvq' && e.kind === 'nvq'));
      out.unshift({ id: 'W-' + v + pl.e + r.n, v, lid: w.me.id, name: VNAME(v), course: pl.title, batch: chBatchCodeOfW(w) || "—", sponsor: w.me.sponsor, inst: r.n, amount: fpM(fpP(r.amount) - fpP(r.paid)), cur: 'GBP', due: r.due, days,
        status: en && en.status === 'Discontinued' ? 'discontinued' : r.arrangement && w.arrangeUntil ? 'arrangement' : 'overdue', arrangeDue: w.arrangeUntil,
        access: w.arrangeUntil && r.arrangement ? 'Restored until ' + fd(w.arrangeUntil) : w.accessPaused ? 'Paused' : 'Active',
        remind: days >= 15 ? `Day 15${days >= 30 ? ', Day 30' : ''} (${fiPinned(w) ? 'CB10 reminders' : 'notices'}, simulated)` : '—',
        last: w.accessPaused ? 'Access paused' : days >= 30 ? (fiPinned(w) ? 'Day 30 — automatic pause not applied (agreed schedule, PD-CB-72)' : 'Day 30') : days >= 15 ? 'Day 15' : 'Overdue', row: r, pl, history: [] });
    }));
  });
  return out;
};
// Arrangements: remember whether the arrangement restored a paused access (that is what re-pauses when it lapses)
const _orFI2 = ACT.odRestore;
ACT.odRestore = el => { const o = odRows().find(x => x.id === el.dataset.id), w = o && o.v && STORE.worlds[o.v], was = !!(w && w.accessPaused); const r = _orFI2(el); const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (w && a && !a._fi2) { const g = a.fn; a._fi2 = true; a.fn = (...x) => { const out = g(...x); if (out !== false && w.arrangeUntil) { w.fiArrPaused = was; if (was) w.fiAutoPaused = false; } return out; }; } return r; };
// Learner 360's "Restore / Set payment arrangement" for a learner with an account opens the same arrangement
const _raFI2 = ACT.restoreAccess;
ACT.restoreAccess = el => { const L = learnerById(el.dataset.id); if (L && !L.v && fiWOf(L.id)) { const o = odRows().find(x => x.lid === L.id && x.status !== 'discontinued'); if (o) return ACT.odRestore({ dataset: { id: o.id } }); toast('Nothing is overdue for this learner.', 'info'); return; } return _raFI2(el); };
// The admin console's "Discontinue (non-payment)" did nothing but toast; it now opens the real action for that learner's row
ACT.discNonPay = el => { if (!fiFinSys()) return w0Deny('Finance', '—', 'discontinue for non-payment', FI_FINSYS); const o = odRows().find(x => x.name === (el.dataset && el.dataset.n) && x.status !== 'discontinued'); if (o) return ACT.odDisc({ dataset: { id: o.id } }); toast('Open Finance → Overdue & Access for this learner — no overdue item matches.', 'info'); };

/* ---------- Refunds ---------- */
// Observation fees are non-refundable (CH-40): no refund is raised or approved; an exception would need a client decision
const fiObsFeeTx = t => !!t && (/^Observation fee/i.test(String(t.course || t.desc || '')) || chFees().some(f => f.ref && f.ref === t.ref));
const FI_OBS_NO = 'Observation fees are non-refundable (CH-40). No refund was raised — an exception would need a client decision.';
const _rrFI2 = raiseRefund;
raiseRefund = function (t) { if (fiObsFeeTx(t)) return fiNo(t.ref, 'refund of an observation fee', FI_OBS_NO); return _rrFI2.apply(this, arguments); };
const _adFI2 = applyDecision;
applyDecision = function (i, a) {
  if (i && i.type === 'Refund' && a === 'approve' && isOpen(i)) { const t = allTx().find(x => x.ref === (i.data || {}).tx && x.payer === fiPayerOf(i) && !x.refund); if (fiObsFeeTx(t)) return fiNo(i.id, 'refund of an observation fee', FI_OBS_NO); }
  return _adFI2.apply(this, arguments);
};
// The Super Administrator's own refund of an observation fee is refused too (saApply marks an item Approved after its decision)
const _saFI2 = saApply;
saApply = function (i) { if (i && i.type === 'Refund') { const t = allTx().find(x => x.ref === (i.data || {}).tx && x.payer === fiPayerOf(i) && !x.refund); if (fiObsFeeTx(t)) return fiNo(i.id, 'refund of an observation fee', FI_OBS_NO); } return _saFI2.apply(this, arguments); };
// A refund's queue ID is never one already used
const _nrFI2 = newRefund;
newRefund = function () { const it = _nrFI2.apply(this, arguments); let n = 2100 + ADMIN.queue.length; while ((ADMIN.queue || []).some(x => x !== it && x.id === it.id)) it.id = 'AQ-' + (++n); return it; };
const fiRefCount = ref => Object.values(STORE.worlds).reduce((s, w) => s + (w.tx || []).filter(t => t.ref === ref).length, 0) + ((STORE.fin && STORE.fin.tx) || []).filter(t => t.ref === ref).length;
// Every processed refund is a refund transaction, once: the learner's record (as before, now with a unique reference and the
// payment it refunds), or the Finance ledger for an agency, seeded or Finance-recorded payment (before: status only, or nothing)
const _reFI2 = refundEffect;
refundEffect = function (i) {
  if (!i || i.processed) return _reFI2.apply(this, arguments); // FI-1: processed once
  const d = i.data || {}, payer = fiPayerOf(i), tx = allTx().find(t => t.ref === d.tx && t.payer === payer && !t.refund), at = now().toISOString();
  const res = _reFI2.apply(this, arguments); if (!i.processed) return res;
  const w = d.v && STORE.worlds[d.v], row = w && (w.tx || []).find(x => x.amount < 0 && !x.orig && String(x.desc || '').startsWith('Refund against ' + d.tx));
  if (row) { row.orig = d.tx; row.qid = i.id; if (fiRefCount(row.ref) > 1) row.ref = fiUniqRef('RFD-', 11500, 8000); }
  else if (tx && !d.depV) {
    STORE.fin.tx.unshift({ at, ref: fiUniqRef('RFD-', 11500, 8000), orig: tx.ref, qid: i.id, gref: '—', receipt: '—', payer: tx.payer, payerType: tx.payerType || 'Learner', course: `Refund against ${tx.ref} (${tx.course})`, amount: i.amount, cur: i.cur || tx.cur || 'GBP', mode: tx.mode, status: 'Refunded', refund: true, by: ADMIN.me.name, fin: true });
    const src = (STORE.fin.tx || []).find(t => t.ref === tx.ref && t.payer === tx.payer && !t.refund) || (ADMIN.manualTx || []).find(t => t.ref === tx.ref && t.payer === tx.payer);
    if (src) { const back = fiSum(fiRefunds(tx.ref, tx.payer).filter(fiRefDone)); src.status = back >= fpP(tx.amount) ? 'Refunded' : 'Partially refunded'; }
    logA('Finance', i.id, 'Refund transaction recorded', '—', `−${money(i.amount, i.cur || 'GBP')} against ${tx.ref}`, tx.payerType === 'Agency' ? 'Agency payment refunded — seats unchanged: no rule says what a refund does to seats (client question)' : 'Refund of a ledger payment');
  }
  return res;
};
// H-1: a Super Admin override of a refund applies the money effect once (or refuses a reversal of money already paid)
const _qoFI2 = ACT.qOverride;
ACT.qOverride = el => {
  const i = qItem(el.dataset.id);
  if (!isSA()) return w0Deny('Approvals Queue', (i && i.id) || '—', 'override a decision', 'Only the Super Administrator can override a decision.');
  const r = _qoFI2(el); if (!i || i.type !== 'Refund' || !MODAL) return r;
  const a = MODAL.actions.find(x => /danger|primary/.test(x.cls || '')); if (!a || a._fi2) return r;
  const g = a.fn; a._fi2 = true;
  a.fn = (...x) => {
    const to = ($('#modal-root #ovr') || {}).value, why = mval('#rsn');
    if (i.processed && to !== 'Approved') { fieldErr('#ovr', `This refund was paid on ${fdt(i.processed)}. An override can't take the money back — nothing changed. A reversal would need its own correction (client question).`); return false; }
    if (to === 'Approved' && !i.processed) { const cap = fiRefCapWhy(i); if (cap) { fieldErr('#ovr', cap); return false; } if (fiObsFeeTx(allTx().find(t => t.ref === (i.data || {}).tx && t.payer === fiPayerOf(i)))) { fieldErr('#ovr', FI_OBS_NO); return false; } }
    const out = g(...x); if (out === false) return out;
    if (to === 'Approved' && i.status === 'Approved' && !i.processed && why) { i._sa = true; try { refundEffect(i, why); } finally { delete i._sa; } logA('Finance', i.id, 'Refund processed (Super Admin override)', i.override ? i.override.from : '—', `${money(i.amount, i.cur || 'GBP')} refunded`, why); }
    return out;
  };
  return r;
};
// H-3: an Academy batch cancellation refunds what each learner actually paid toward the programme, through Finance approval
function fiCancelRefunds(name, lid, b, why) {
  const v = fiWorldKey(lid), out = [];
  const txs = v ? allTx().filter(t => t.v === v && !t.refund && ['Paid', 'Partially refunded'].includes(t.status) && fiCourseOf(t) === b.course && !fiObsFeeTx(t)) : [];
  txs.forEach(t => {
    const max = refundable(t); if (fpP(max) <= 0) return;
    if (fiRefunds(t.ref, t.payer).some(i => (i.data || {}).cat === 'Batch cancelled' && (isOpen(i) || fiRefDone(i)))) return; // retry: once
    // A refund REQUEST for Finance to review: the amount is what could be refunded (paid, less earlier refunds and open requests);
    // whether all of it is refundable is Finance's decision (no rule beyond "Refund (deposit / fees paid)"). Never applied at once,
    // whoever cancels — the Super Administrator cancelled a batch, not decided a refund.
    const it = newRefund(t, max, 'Batch cancelled', `Batch ${b.code} cancelled before start — refund request for Finance review (${t.ref}: ${money(t.amount, 'GBP')} paid, ${money(max, 'GBP')} not yet refunded). Finance confirms what is refundable. ${why}`, 'Retain access');
    it.data.review = true; ADMIN.queue.unshift(it); out.push(it);
  });
  if (!out.length) {
    logA('Finance', `${name} (${lid})`, 'Batch cancelled — refund needs Finance review', '—', 'Nothing refunded', `Batch ${b.code}: no payment toward ${b.course} with anything left to refund is recorded for this learner`);
    STORE.fin.notifs.unshift({ to: 'all', t: 'Batch cancelled — refund needs Finance review', b: `${name}: no recorded payment toward ${b.course} to refund. Nothing was refunded.`, at: now().toISOString(), go: 'f-refunds', unread: true });
  }
  return out;
}

/* ---------- Smaller corrections ---------- */
// H-4: a deposit-route balance stays one payment within the seat hold (no split, no due date after the hold — PD-E1-05)
const _faFI2 = ACT.finAdjust;
ACT.finAdjust = el => {
  const r = _faFI2(el), w = el && el.dataset && STORE.worlds[el.dataset.v], pl = w && w.plans.find(p => p.e === el.dataset.e);
  if (w && pl && pl === dpHoldPl(w) && $('#modal-root #ad-d')) s5WrapPrimary(() => { const hold = pl.deposit && (pl.deposit.hold || (w.admission.deposit || {}).holdUntil); if (($('#ad-s') || {}).value === 'yes') return (fieldErr('#ad-s', 'A deposit balance is one payment within the seat hold — it can\'t be split into instalments (PD-E1-05).'), true); if (hold && new Date($('#ad-d').value + 'T12:00:00Z') > new Date(hold)) return (fieldErr('#ad-d', `The balance is due within the seat hold (by ${fd(hold)}). Extending a hold is a client question.`), true); return ''; });
  return r;
};
// M-14: the learner's part-payment permission is the one agreed (it was always "yes")
const _ccFI2 = chComplete;
chComplete = function (w) { const r = _ccFI2.apply(this, arguments), pl = fpPl(w); if (pl && w.signup && w.signup.plan && w.signup.plan.partial === false) pl.partial = false; return r; };
// D-17: the reference the learner was given for their transfer is shown, and a different one is flagged
const _opPrevFI2 = INP.opPrev;
INP.opPrev = () => { _opPrevFI2(); const box = $('#op-prev'), t = payTargets().find(x => x.key === ($('#op-t') || {}).value), sb = t && !t.chb && (t.dep || (t.r && t.r.n === 1)) ? fiSignupBank(t) : null, exp = t && t.chb ? t.chb.ref : sb ? sb.ref : '', got = String(($('#op-r') || {}).value || '').trim(); if (box && exp) box.insertAdjacentHTML('beforeend', `<div class="note ${got === exp ? 'b-grey' : 'b-amber'} small">${ic('info', 15)}<div>The learner was given the reference <span class="mono">${esc(exp)}</span>${got === exp ? '.' : ` — the reference entered is different. Check the bank statement before recording.`}</div></div>`); };
// L-8: a waiver request needs a reason (the dialog asked; the function didn't)
const _wrFI2 = chWaiverRaise;
chWaiverRaise = function (f, reason) { if (!String(reason || '').trim()) { fiNo(f ? f.id : '—', 'waiver without a reason', 'A waiver needs a reason. Nothing was raised.'); return null; } return _wrFI2.apply(this, arguments); };

/* ---------- M-13: an overdue pause locks the overdue enrolment only ----------
   The accepted model is per enrolment: the manual pause (CH-14) and non-payment discontinuation lock one course and leave the others.
   The automatic overdue pause (W.accessPaused) locked every course; it now locks the enrolment(s) with an overdue instalment only. */
const FI_NVQ_ROUTES = ['assignments', 'assignment', 'progress', 'observations', 'resources'];
const fiPausedEs = w => { const out = new Set(fiLive(w).filter(pl => pl.rows.some(r => r.status === 'Overdue')).map(pl => pl.e)); if (w.payOverdue && w.payOverdue.e) out.add(w.payOverdue.e); return out; };
const _lfFI2 = lockFor;
lockFor = function (r) {
  if (!W || !W.accessPaused || S.edge === 'paused' || !PAUSE_LOCK.includes(r)) return _lfFI2.apply(this, arguments);
  const es = fiPausedEs(W), id = (S.params || {}).id, nvq = FI_NVQ_ROUTES.includes(r) || (['course', 'quiz'].includes(r) && id === 'nvq');
  const hit = !es.size || (nvq ? es.has('nvq') : ['course', 'quiz'].includes(r) ? es.has(id) : true);
  if (hit) return _lfFI2.apply(this, arguments);
  const was = W.accessPaused; W.accessPaused = false; try { return _lfFI2.apply(this, arguments); } finally { W.accessPaused = was; }
};

/* ---------- M-9: an agency card payment left "Pending" reaches Finance and is resolved once ---------- */
const _apFI2 = agPayResult;
agPayResult = function (o) {
  const b = S.agy && S.agy.buy, pr = b ? priceFor(b.c, b.qty) : null, n = (STORE.agy && STORE.agy.purchases || []).length, r = _apFI2.apply(this, arguments);
  if (b && STORE.agy.purchases.length > n) {
    const p = STORE.agy.purchases[0];
    if (p.status === 'Pending') {
      p.fiCard = { courses: b.c.courses.slice(), days: b.c.days, custom: !!b.c.custom, pct: pr.pct || 0, pr }; // the agreed terms, kept for the confirmation
      STORE.fin.pending.unshift({ id: 'PP-' + p.ref, payer: p.agency, item: `Bundle purchase — ${p.name} (${p.seats} seats)`, amount: p.amount, cur: 'GBP', at: p.at, status: 'Pending', agyRef: p.ref });
      STORE.fin.notifs.unshift({ to: 'all', t: 'Agency card payment awaiting gateway confirmation', b: `${p.agency} · ${p.ref} · ${money(p.amount, 'GBP')}`, at: now().toISOString(), go: 'f-exceptions', unread: true });
      logA('Finance', p.ref, 'Agency card payment pending', '—', 'Awaiting gateway confirmation', `${p.agency}: ${p.seats} seats of ${p.name} — no seats or receipt until confirmed`);
    }
  }
  return r;
};
const fiAgyPur = id => { const p = ((STORE.fin && STORE.fin.pending) || []).find(x => x.id === id), pur = p && p.agyRef && (STORE.agy.purchases || []).find(x => x.ref === p.agyRef); return { p, pur }; };
function fiAgyConfirm(p, pur, gref, why) {
  const c = pur.fiCard, at = now().toISOString(), cur = 'GBP';
  const b = { id: 'BN-' + (20 + ADMIN.bundles.length), name: pur.name, agency: pur.agency, courses: c.courses.slice(), seats: pur.seats, used: 0, from: at, validity: new Date(now().getTime() + c.days * DAY).toISOString(), mode: c.custom ? 'Customised' : c.pct ? `Automatic (−${c.pct}%)` : 'Automatic', price: pur.amount, cur, avail: c.custom ? 'Specific agencies' : 'Global', status: 'Active' };
  while (ADMIN.bundles.some(x => x.id === b.id)) b.id = 'BN-' + (+b.id.slice(3) + 1);
  ADMIN.bundles.push(b); pur.bundle = b.id; pur.status = 'Paid'; pur.hist.push(['Payment confirmed by the gateway — seats credited', at]);
  STORE.agy.ledger.push({ bundle: b.id, agency: b.agency, at, type: 'Credited', qty: pur.seats, learner: '—', ref: pur.ref });
  ADMIN.ledger.unshift({ agency: b.agency, bundle: b.id, at, kind: 'Credit', qty: pur.seats, note: 'Bundle purchased (gateway ' + pur.ref + ', confirmed)' });
  const tx = { at, ref: pur.ref, gref: gref || ('pi_3P' + pur.ref.slice(4) + 'Ag'), receipt: 'RCP-' + pur.ref.slice(-5), payer: pur.agency, payerType: 'Agency', course: 'Bundle purchase — ' + pur.name, amount: pur.amount, cur, mode: 'Gateway', status: 'Paid', by: ADMIN.me.name, fin: true };
  STORE.fin.tx.unshift(tx); [pur, b, tx].forEach(x => { if (typeof chVatStamp === 'function') chVatStamp(x, c.pr); if (typeof s4cStamp === 'function') s4cStamp(x, c.pr); });
  p.status = 'Confirmed'; logA('Finance', p.id, 'Agency card payment confirmed', 'Pending', `Paid — ${pur.seats} seats credited`, why);
  if (typeof agyNotify === 'function') agyNotify('Gateway payment confirmed — seats credited', `${pur.ref} · ${pur.seats} seats in ${pur.name}`, 'g-bundle.' + b.id, 'Purchases', pur.agency);
}
const _ppFI2 = ACT.ppConfirm;
ACT.ppConfirm = el => {
  const { p, pur } = fiAgyPur(el && el.dataset && el.dataset.id); if (!p || !p.agyRef) return _ppFI2(el);
  if (!fiFin()) return w0Deny('Finance', p.id, 'confirm a pending payment', FI_FIN);
  if (!pur || pur.status !== 'Pending' || p.status !== 'Pending') return fiNo(p.id, 'payment already resolved', `${p.agyRef} is already ${pur ? pur.status.toLowerCase() : 'resolved'} — nothing changed.`);
  reasonDlg({ title: 'Mark agency card payment as confirmed', ok: 'Mark as confirmed', extra: `<p class="small">${esc(pur.agency)} · ${esc(pur.name)} · ${pur.seats} seats · ${money(pur.amount, 'GBP')}. Confirming credits the seats once and records the payment and its receipt.</p><div class="field"><label for="pp-g">Gateway reference</label><input class="input mono" id="pp-g" value="pi_3P${esc(pur.ref.slice(4))}Ag"></div>`,
    onOk: r => { const x = fiAgyPur(p.id); if (!fiFin()) return w0Deny('Finance', p.id, 'confirm a pending payment', FI_FIN); if (!x.pur || x.pur.status !== 'Pending') { fiNo(p.id, 'payment already resolved', 'Already resolved — nothing changed.'); return; } fiAgyConfirm(x.p, x.pur, $('#pp-g').value.trim(), r); render(); toast(`${pur.ref} confirmed — ${pur.seats} seats credited to ${pur.agency}.`); } });
};
ACT.ppFail = el => {
  const { p, pur } = fiAgyPur(el && el.dataset && el.dataset.id); if (!p || !pur) return;
  if (!fiFin()) return w0Deny('Finance', p.id, 'mark a pending payment failed', FI_FIN);
  if (pur.status !== 'Pending' || p.status !== 'Pending') return fiNo(p.id, 'payment already resolved', `${p.agyRef} is already ${pur.status.toLowerCase()} — nothing changed.`);
  reasonDlg({ title: 'Mark agency card payment as failed', ok: 'Mark as failed', danger: true, extra: `<p class="small">Nothing was received: no seats, no payment record and no receipt. The agency is told.</p>`, onOk: r => { if (pur.status !== 'Pending') return; const at = now().toISOString(); pur.status = 'Failed'; pur.hist.push(['Payment not confirmed by the gateway — nothing charged', at]); p.status = 'Failed'; logA('Finance', p.id, 'Agency card payment failed', 'Pending', 'Failed — nothing received', r); if (typeof agyNotify === 'function') agyNotify('Gateway payment failed', `${pur.ref} · nothing was charged and no seats were credited`, 'g-purchase.' + pur.ref, 'Purchases', pur.agency); render(); toast('Marked as failed — nothing was received.'); } });
};
const _excFI2 = SCREENS['f-exceptions'];
SCREENS['f-exceptions'] = p => { let h = _excFI2(p); ((STORE.fin && STORE.fin.pending) || []).filter(x => x.agyRef && x.status === 'Pending').forEach(x => { h = h.replace(`data-act="ppConfirm" data-id="${x.id}">Mark as confirmed</button>`, `data-act="ppConfirm" data-id="${x.id}">Mark as confirmed</button> <button class="btn btn-sm btn-danger" data-act="ppFail" data-id="${x.id}">Mark as failed</button>`); }); return h; };

/* ---------- H-5: the last seat — checked again when the learner pays, and when the sign-up completes ----------
   In this one-browser prototype nothing else can run between "Pay securely" and the result; real concurrency needs the server
   to reserve the seat atomically (a production requirement). */
const fiSeatFull = w => { dpReconcile(); const b = w && w.signup && chBatch(w.signup.batch); return !!b && !w.signup.done && !chHasPlace(b); };
const FI_FULL = 'This batch has just become full, so nothing was charged. You can join the waitlist or choose another batch.';
let FI_SEAT_W = null;
const _suPayFI2 = ACT.suPay;
ACT.suPay = el => { const w = W; if (fiSeatFull(w)) { logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Blocked: batch full at payment', 'Sign-up payment', 'No change — nothing charged', 'The last place was taken before this payment'); render(); toast(FI_FULL, 'err'); return; } FI_SEAT_W = w; try { return _suPayFI2(el); } finally { FI_SEAT_W = null; } };
const _coFI2 = checkout;
checkout = function () {
  const w = FI_SEAT_W, r = _coFI2.apply(this, arguments), a = w && MODAL && MODAL.actions.find(x => /Pay securely/.test(x.label || ''));
  if (a && !a._fi2) { const g = a.fn; a._fi2 = true; a.fn = (...x) => { if (fiSeatFull(w)) { closeModal(); logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Blocked: batch full at payment', 'Checkout', 'No change — nothing charged', 'The last place was taken before this payment'); render(); toast(FI_FULL, 'err'); return false; } return g(...x); }; }
  return r;
};
const _ccFI2b = chComplete;
chComplete = function (w, o, fromCheckout) {
  if (fiSeatFull(w)) {
    if (fromCheckout) { STORE.fin.notifs.unshift({ to: 'all', t: 'Payment received for a full batch — Finance review', b: `${chFullName(w)} · ${money(o && o.amount || 0, 'GBP')} (${o && o.ref}) — the sign-up was not completed`, at: now().toISOString(), go: 'f-ledger', unread: true }); logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Payment received for a full batch', '—', 'Sign-up not completed — Finance review', 'The last place was taken while this payment was processed'); }
    else logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Blocked: batch full at completion', 'Sign-up', 'No change', 'The last place was taken');
    toast(FI_FULL, 'err'); return false;
  }
  return _ccFI2b.apply(this, arguments);
};

/* ---------- L-3: every receipt of a part-paid instalment is kept ---------- */
const fiRcpPush = (r, x) => { if (!r) return; if (!r.receipts) r.receipts = []; if (!r.receipts.some(y => y.no === x.no)) r.receipts.push(x); }; // callers add the receipt the row had before (it is overwritten by then)
const _rpFI2 = recordPayment;
recordPayment = function (t, a, ref, mode) {
  const row = t && (t.r || (t.chb && t.chb.wv && (() => { const w = STORE.worlds[t.chb.wv], p = w && w.plans.find(q => q.e === t.chb.e); return p && p.rows.find(y => y.n === t.chb.n); })()));
  const paid0 = row ? fpP(row.paid) : 0, rec0 = row && row.receipt, res = _rpFI2.apply(this, arguments);
  if (row && res !== false && fpP(row.paid) > paid0) { if (rec0 && !row.receipts) fiRcpPush(row, { no: rec0, amount: fpM(paid0), at: null, earlier: true }); fiRcpPush(row, { no: row.receipt || 'RCP-' + String(ref).slice(-5), ref, amount: fpM(fpP(row.paid) - paid0), at: now().toISOString(), method: mode || 'Bank transfer' }); }
  return res;
};
const _piFI2 = ACT.payInst;
ACT.payInst = el => {
  const pl = W && W.plans.find(p => p.e === el.dataset.e), row = pl && pl.rows.find(x => x.n === +el.dataset.n); if (!row) return _piFI2(el);
  const _co = checkout; checkout = o => _co({ ...o, onSuccess: (p, ref) => { const paid0 = fpP(row.paid), rec0 = row.receipt, out = o.onSuccess(p, ref); if (fpP(row.paid) > paid0) { if (rec0 && !row.receipts) fiRcpPush(row, { no: rec0, amount: fpM(paid0), at: null, earlier: true }); fiRcpPush(row, { no: row.receipt, ref, amount: fpM(fpP(row.paid) - paid0), at: now().toISOString(), method: 'Card' }); } return out; } });
  try { return _piFI2(el); } finally { checkout = _co; }
};
const fiRcpBtns = (pl, r) => r.receipts.map((x, k) => `<button class="btn btn-sm btn-ghost" data-act="fiRcp" data-e="${esc(pl.e)}" data-n="${r.n}" data-k="${k}" aria-label="Receipt ${esc(x.no)}${x.amount != null ? ', ' + money(x.amount, 'GBP') : ''}">${ic('download', 14)}${esc(x.no)}${x.amount != null ? ' · ' + money(x.amount, 'GBP') : ''}</button>`).join(' ');
const _pcFI2b = planCard;
planCard = function (pl) {
  let h = _pcFI2b.apply(this, arguments);
  pl.rows.filter(r => r.receipts && r.receipts.length > 1).forEach(r => { const re = new RegExp(`<button class="btn btn-sm btn-ghost" data-act="fakeDl" data-f="Receipt ${r.receipt} — [^"]*"[^>]*>[\\s\\S]*?Receipt</button>`); h = h.replace(re, fiRcpBtns(pl, r)); });
  return h;
};
ACT.fiRcp = el => {
  const pl = (W.plans || []).find(p => p.e === el.dataset.e), r = pl && pl.rows.find(x => String(x.n) === el.dataset.n), x = r && r.receipts && r.receipts[+el.dataset.k]; if (!x) return;
  openModal({ title: `Receipt ${esc(x.no)}`, sub: esc(pl.title + (pl.plan === 'Instalments' ? ` — instalment ${r.n}` : '')), body: `<dl class="kv"><dt>Receipt number</dt><dd class="mono">${esc(x.no)}</dd><dt>Date</dt><dd>${x.at ? fd(x.at) : '—'}</dd><dt>Payer</dt><dd>${esc(W.me.first + ' ' + W.me.last)}</dd><dt>Amount</dt><dd><strong class="num">${x.amount != null ? money(x.amount, 'GBP') : '—'}</strong></dd><dt>Method</dt><dd>${esc(x.method || '—')}</dd><dt>Instalment</dt><dd>${money(r.amount, 'GBP')} · paid so far ${money(r.paid, 'GBP')} (${r.receipts.length} payments)</dd></dl>${x.earlier ? '<p class="xs muted">A payment recorded before receipts were listed separately; its own amount was not kept.</p>' : ''}`, actions: [{ label: 'Download', cls: 'btn', fn: () => { toast(`${x.no}.pdf downloaded (simulated).`); return false; } }, { label: 'Close', cls: 'btn-primary' }] });
};
// Finance → learner → Payments lists every receipt of a row, not only the last
const _fLFI2 = SCREENS['f-learner'];
SCREENS['f-learner'] = p => { let h = _fLFI2(p); if (!p || p.tab !== 'payments') return h; const w = fiWOf(p.id) || (allLearners().find(l => l.id === p.id) || {}).v && STORE.worlds[(allLearners().find(l => l.id === p.id) || {}).v]; if (!w) return h; fiLive(w).forEach(pl => pl.rows.filter(r => r.receipts && r.receipts.length > 1).forEach(r => { h = h.replace(`<td class="mono xs">${r.receipt}</td>`, `<td class="mono xs">${r.receipts.map(x => esc(x.no) + (x.amount != null ? ' (' + money(x.amount, 'GBP') + ')' : '')).join('<br>')}</td>`); })); return h; };

/* ---------- L-4: a payment refunded in part shows what was collected, refunded and net ----------
   The payment event itself is unchanged (its record keeps "Succeeded"); its label is worked out from the refunds against it. */
const fiTxRefunded = (rows, t) => rows.filter(x => x.amount < 0 && fiOrigOf(x) === t.ref).reduce((s, x) => s + fpP(-x.amount), 0);
const fiTxView = rows => rows.map(t => { if (!(t.amount > 0) || t.status !== 'Succeeded') return t; const back = fiTxRefunded(rows, t); if (!back) return t; const left = fpP(t.amount) - back; return { ...t, status: left > 0 ? 'Partially refunded' : 'Refunded', desc: `${t.desc} — received ${money(t.amount, 'GBP')}, refunded ${money(fpM(back), 'GBP')}, net ${money(fpM(Math.max(0, left)), 'GBP')}` }; });
const _dtFI2 = dt;
dt = function (o) { if (o && Array.isArray(o.rows) && /^lu-h-(ltx|ftx-|ltx360-)/.test(o.id || '')) o = { ...o, rows: fiTxView(o.rows) }; return _dtFI2.apply(this, [o].concat([].slice.call(arguments, 1))); };
const _atFI2 = allTx;
allTx = function () {
  const all = _atFI2.apply(this, arguments), back = {}; all.filter(t => t.refund && t.v).forEach(t => { const k = t.v + '|' + fiOrigOf(t); back[k] = (back[k] || 0) + fpP(t.amount); });
  return all.map(t => (!t.refund && t.v && t.status === 'Paid' && back[t.v + '|' + t.ref] ? (back[t.v + '|' + t.ref] >= fpP(t.amount) ? { ...t, status: 'Refunded' } : { ...t, status: 'Partially refunded', refundedAmt: fpM(back[t.v + '|' + t.ref]) }) : t));
};
// Raise refund lists payments with something left to refund, whether paid in full or refunded in part
ACT.finRaise = () => {
  if (!fiFin()) return w0Deny('Finance', '—', 'raise a refund', FI_FIN);
  const t = allTx().filter(x => !x.refund && ['Paid', 'Partially refunded'].includes(x.status) && !fiObsFeeTx(x) && refundable(x) > 0);
  openModal({ title: 'Raise refund — choose the original transaction', body: `<div class="field"><label for="rf-tx">Transaction</label><select class="select" id="rf-tx">${t.slice(0, 40).map(x => `<option value="${esc(x.ref)}|${esc(x.payer)}">${x.ref} · ${esc(x.payer)} · ${money(x.amount, x.cur)}${x.status === 'Partially refunded' ? ' (partly refunded)' : ''} · ${fd(x.at)}</option>`).join('')}</select></div>`, actions: [{ label: 'Cancel' }, { label: 'Continue', cls: 'btn-primary', fn: () => { const [r, p] = $('#rf-tx').value.split('|'); const tx = allTx().find(x => x.ref === r && x.payer === p && !x.refund); setTimeout(() => raiseRefund(tx), 0); } }] });
};

/* ---------- Reports: one dataset for the screen and its export ---------- */
const fiRepF = () => ({ days: +ui('frRange', '180'), course: ui('frCourse', ''), agency: ui('frAgency', ''), mode: ui('frMode', '') });
const fiRepFTxt = f => [`last ${f.days} days`, f.course && 'course: ' + f.course, f.agency && 'agency: ' + f.agency, f.mode && 'method: ' + f.mode].filter(Boolean).join(' · ');
function fiRepFilters(t, f = fiRepF()) {
  const L = fiLedger({ days: f.days }), cs = [...new Set(L.rows.map(e => e.course))].sort(), ag = (ADMIN.agencies || []).map(a => a.name);
  const sel = (id, lbl, all, opts, v) => `<select class="select dt-sel" aria-label="${lbl}" data-onchange="${id}"><option value="">${all}</option>${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  return `<div class="row"><select class="select dt-sel" aria-label="Date range" data-onchange="frRange">${[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months']].map(([v, l]) => `<option value="${v}" ${String(f.days) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${sel('frCourse', 'Course', 'All courses', cs, f.course)}${sel('frAgency', 'Agency', 'All agencies', ag, f.agency)}${sel('frMode', 'Payment method', 'All methods', FI_MODES, f.mode)}<span class="spacer"></span>${exportMenu(`Finance report — ${t} (${fiRepFTxt(f)})`)}</div>`;
}
INP.frCourse = el => { setUi('frCourse', el.value); render(); };
INP.frAgency = el => { setUi('frAgency', el.value); render(); };
INP.frMode = el => { setUi('frMode', el.value); render(); };
const fiG = p => money(fpM(p), 'GBP');
function fiRepDatewise(f = fiRepF(), grp = ui('frGrp', 'month')) {
  const L = fiLedger(f), key = e => grp === 'day' ? e.at.slice(0, 10) : grp === 'week' ? kMon(e.at.slice(0, 10)) : e.at.slice(0, 7);
  const groups = [...new Set(L.rows.filter(e => e.kind === 'receipt' || e.kind === 'refund').map(key))].sort().reverse();
  const gs = (g, k) => L.rows.filter(e => key(e) === g && e.kind === k).reduce((s, e) => s + e.p, 0);
  const od = odRows().filter(o => o.status !== 'discontinued' && (!f.course || o.course === f.course)), odP = od.reduce((s, o) => s + fpP(o.amount), 0);
  const aw = fiAwaiting().filter(x => !f.course || x.course === f.course || x.title === f.course);
  const modes = FI_MODES.concat(L.rows.some(e => e.mode === 'Other') ? ['Other'] : []).map(m => [m, L.rows.filter(e => e.mode === m && e.kind === 'receipt').reduce((s, e) => s + e.p, 0)]);
  return `<div class="seg" role="group" aria-label="Grouping">${['day', 'week', 'month'].map(g => `<button aria-pressed="${grp === g}" data-act="frGrp" data-g="${g}">${g[0].toUpperCase() + g.slice(1)}ly</button>`).join('')}</div>
  <section class="card fi-rep" data-received="${L.received}" data-refunded="${L.refunded}" data-net="${L.net}"><dl class="kv"><dt>Received</dt><dd class="num">${fiG(L.received)}</dd><dt>Refunded</dt><dd class="num">${L.refunded ? '−' : ''}${fiG(L.refunded)}</dd><dt>Net received</dt><dd class="num strong">${fiG(L.net)}</dd><dt>Pending (gateway)</dt><dd class="num">${fiG(L.pending)}</dd><dt>Bank transfers awaiting confirmation</dt><dd class="num">${aw.length} · ${fiG(aw.reduce((s, x) => s + fpP(x.amount), 0))} <span class="xs muted">not counted as received</span></dd><dt>Overdue now</dt><dd class="num">${fiG(odP)} · ${od.length} instalments</dd></dl>${L.unknown ? `<p class="xs muted">${L.unknown} seeded receipt(s) are marked partly refunded without a refund record; their refund amount is not recorded, so it isn't in these totals.</p>` : ''}
  <h4>Received by payment method</h4><div class="tbl-wrap"><table class="tbl dense"><tbody>${modes.map(([m, v]) => `<tr><td>${m}</td><td class="r num">${fiG(v)}</td></tr>`).join('')}<tr><td class="strong">Total</td><td class="r num strong">${fiG(L.received)}</td></tr></tbody></table></div>
  <h4>By ${grp}</h4>${groups.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>${grp === 'day' ? 'Day' : grp === 'week' ? 'Week of' : 'Month'}</th><th class="r">Received</th><th class="r">Refunded</th><th class="r">Net</th></tr></thead><tbody>${groups.map(g => `<tr><td>${g}</td><td class="r num">${fiG(gs(g, 'receipt'))}</td><td class="r num">${fiG(gs(g, 'refund'))}</td><td class="r num">${fiG(gs(g, 'receipt') - gs(g, 'refund'))}</td></tr>`).join('')}<tr><td class="strong">Total</td><td class="r num strong">${fiG(L.received)}</td><td class="r num strong">${fiG(L.refunded)}</td><td class="r num strong">${fiG(L.net)}</td></tr></tbody></table></div>` : emptyState({ icon: 'chart', title: 'No payments in this period', why: 'Nothing was received or refunded for these filters.' })}</section>`;
}
function fiRepCoursewise(f = fiRepF()) {
  const L = fiLedger(f), ob = fiObligations().filter(o => (!f.course || o.course === f.course) && !f.agency), od = odRows().filter(o => o.status !== 'discontinued');
  const keys = [...new Set(L.rows.map(e => e.course).concat(f.mode ? [] : ob.filter(o => o.outstanding).map(o => o.course)))].sort();
  const row = c => { const e = L.rows.filter(x => x.course === c), s = k => e.filter(x => x.kind === k).reduce((a, x) => a + x.p, 0); const o = f.mode ? [] : ob.filter(x => x.course === c); return { c, payers: new Set(e.filter(x => x.kind === 'receipt').map(x => x.payer).concat(o.filter(x => x.outstanding).map(x => x.name))).size, rec: s('receipt'), back: s('refund'), out: o.reduce((a, x) => a + x.outstanding, 0), od: f.mode ? 0 : od.filter(x => x.course === c).reduce((a, x) => a + fpP(x.amount), 0) }; };
  const rs = keys.map(row), tot = k => rs.reduce((a, r) => a + r[k], 0);
  return rs.length ? `<section class="card fi-rep" data-received="${tot('rec')}" data-refunded="${tot('back')}" data-outstanding="${tot('out')}"><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme / course / bundle</th><th class="r">Payers</th><th class="r">Received</th><th class="r">Refunded</th><th class="r">Net</th><th class="r">Outstanding now</th><th class="r">Overdue now</th></tr></thead><tbody>${rs.map(r => `<tr><td>${esc(r.c)}</td><td class="r">${r.payers}</td><td class="r num">${fiG(r.rec)}</td><td class="r num">${fiG(r.back)}</td><td class="r num">${fiG(r.rec - r.back)}</td><td class="r num">${fiG(r.out)}</td><td class="r num">${fiG(r.od)}</td></tr>`).join('')}<tr><td class="strong">Total</td><td></td><td class="r num strong">${fiG(tot('rec'))}</td><td class="r num strong">${fiG(tot('back'))}</td><td class="r num strong">${fiG(tot('rec') - tot('back'))}</td><td class="r num strong">${fiG(tot('out'))}</td><td class="r num strong">${fiG(tot('od'))}</td></tr></tbody></table></div><p class="xs muted">Received and refunded are for the period; outstanding and overdue are today's balances from each learner's payment plan. A refund is counted against the programme of the payment it refunds. Mixed-mode learners appear under their programme with their own fees.</p></section>` : emptyState({ icon: 'chart', title: 'No programme, course or bundle has payments for these filters' });
}
function fiRepRefunds() {
  const rf = allQueue().filter(i => i.type === 'Refund'), done = rf.filter(fiRefDone), open = rf.filter(isOpen);
  return `<section class="card"><dl class="kv"><dt>Refunded (processed)</dt><dd class="num">${done.length} · ${fiG(fiSum(done))}</dd><dt>Requested, waiting for approval</dt><dd class="num">${open.length} · ${fiG(fiSum(open))}</dd><dt>Rejected or returned</dt><dd class="num">${rf.filter(i => !isOpen(i) && !fiRefDone(i)).length}</dd></dl><table class="tbl dense"><thead><tr><th>Refund</th><th>Reason</th><th>Raised by</th><th>Approver</th><th>Status</th><th class="r">Amount</th></tr></thead><tbody>${rf.map(i => `<tr><td class="mono">${i.id}</td><td>${esc((i.data || {}).cat || '')}</td><td>${esc(i.raisedBy)}</td><td>${esc(i.first)}</td><td>${chip(REF_ST(i))}</td><td class="r">${amt(i.amount, i.cur, true)}</td></tr>`).join('')}</tbody></table></section><section class="card"><h3>Overridden refunds</h3>${rf.filter(i => i.override).map(i => `<p class="small"><span class="mono">${i.id}</span> · <span class="strike">${esc(i.override.from)}</span> → ${esc(i.override.to)} by ${esc(i.override.by)} — ${esc(i.override.reason)}${i.processed ? ' · refund processed' : ''}</p>`).join('') || '<p class="small muted">None.</p>'}</section>`;
}
function fiRepDeposits() {
  const seeded = ((STORE.fin && STORE.fin.deposits) || []).map(d => ({ status: d.status, p: fpP(d.amount) })), live = dpWorlds().flatMap(v => dpDepRows(v)).map(d => ({ status: d.status, p: fpP(d.amount) }));
  const all = seeded.concat(live), sts = [...new Set(all.map(d => d.status))];
  return all.length ? `<section class="card"><dl class="kv">${sts.map(s => { const r = all.filter(d => d.status === s); return `<dt>${esc(s)}</dt><dd>${r.length} · ${fiG(r.reduce((a, d) => a + d.p, 0))}</dd>`; }).join('')}</dl><p class="xs muted">From Finance → Deposits (every deposit-route learner)${seeded.length ? ' and the seeded deposit records' : ''}.</p></section>` : emptyState({ icon: 'shield', title: 'No deposits yet', why: 'No learner has chosen the deposit route.' });
}
// The admin console's Finance → Reports and Overdue management read the same data (they showed fixed legacy figures)
function fiAdminReports() {
  const f = { days: 30 };
  return `<div class="note b-blue">${ic('info')}<div class="small">The same figures as Finance → Reports, from the ledger and the learners' payment plans. Exports are simulated in the prototype.</div></div><div class="grid-2"><section class="card"><div class="row-b"><h2>Datewise (last 30 days)</h2>${exportMenu('Finance datewise (last 30 days)')}</div>${fiRepDatewise(f, 'month')}</section><section class="card"><div class="row-b"><h2>Coursewise (last 30 days)</h2>${exportMenu('Finance coursewise (last 30 days)')}</div>${fiRepCoursewise(f)}</section></div>`;
}
function fiAdminOverdue() {
  const od = odRows().filter(o => o.status !== 'discontinued');
  return `<section class="card"><h3>Escalation stages</h3><ol class="tl"><li class="done"><span class="tl-d">15</span><div class="small"><strong>15 days</strong> — learner notified</div></li><li class="cur"><span class="tl-d">30</span><div class="small"><strong>30 days</strong> — notified and access paused (the existing overdue process; not extended to agreed schedules — PD-CB-72)</div></li></ol></section>
  <section class="card"><h2>Overdue learners</h2>${od.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Course</th><th class="r">Amount</th><th class="r">Days</th><th>Access</th><th></th></tr></thead><tbody>${od.map(o => `<tr><td>${esc(o.name)}</td><td class="small">${esc(o.course)}</td><td class="r">${money(o.amount, o.cur)}</td><td class="r">${o.days}</td><td>${chip(o.access, o.access === 'Paused' ? 'red' : 'green')}</td><td><button class="btn btn-sm btn-primary" data-act="odRestore" data-id="${o.id}">${o.access === 'Paused' ? 'Restore with arrangement' : 'Set payment arrangement'}</button> <button class="btn btn-sm btn-danger" data-act="odDisc" data-id="${o.id}">Discontinue (non-payment)</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No overdue learners.</p>'}</section>`;
}

UXC.push(['FI-2', 'Financial reconciliation and workflow corrections (31 Oct 2026)', [
  'Learner Accounts, the Finance learner page and Learner 360 show each learner\'s real balance from their payment plan (the client demo\'s learners showed none).',
  'Dashboard: "Due" is what the plans schedule each month (it was 1.18 × collected + £300); Outstanding is every unpaid instalment that can be paid; Payment Pending includes bank transfers awaiting confirmation.',
  'Reports (Finance and the admin console): received, refunded and net from the ledger, by method, period and programme, with totals; the course, agency and method filters work and the export names them. No fixed figures.',
  'Refunds: every processed refund is a refund transaction with its own reference; a Super Admin override that approves a refund pays it once, and can\'t reverse one already paid; observation fees are not refundable (CH-40); a batch cancellation refunds what each learner actually paid, through Finance approval.',
  'Overdue: every learner\'s instalments become overdue on the simulated date, with Day 15 / Day 30 reminders, arrangements, lapse and restore; the automatic Day 30 pause stays with the existing overdue process (PD-CB-72).']]);
