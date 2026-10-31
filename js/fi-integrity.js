/* ============================================================
   Batch FI-1 — critical financial integrity (31 Oct 2026; PD-FI-* in PROVISIONAL-DECISIONS.md). Loads last.
   The Finance Admin audit found nine critical defects (CR-1 … CR-9). They shared two causes: the shared financial operations
   (recordPayment, applyDecision, refundEffect, the refund cap) trusted whatever reached them — role, item state, amount and target
   were checked only on some screens — and older duplicate dialogs (admin console Record offline payment and Raise refund, the agency
   invoice payment) had their own unchecked copies of the money logic. The checks are made here, at those shared boundaries, so every
   screen and direct call goes through them:
   - Money: a finite amount above £0 in whole pence; never more than is due on the item; a deposit, an invoice, an observation fee
     and the older mock sign-up transfer are confirmed only by their exact amount (no rule exists for part or surplus receipts of
     these — refused, reported as a client question). Instalment rows keep their existing part payments.
   - Identity: a payment is recorded against the current item with that key (payTargets), never a stale or made-up one; a
     reference already in the ledger is refused; new checkout references are unique.
   - Refunds: the refundable remainder counts every open refund (Pending, Info Requested, Escalated) and every processed one, per
     transaction and payer; approval checks it again; a refund is processed once; a decided finance item can't be decided again.
   - Authority, inside the handlers: Finance Admin or Super Administrator for payments, refunds, invoices and bundle VAT; the CH-39
     waiver chain by stage (Finance review, Super Administrator final); non-payment discontinue / reactivate / arrangements also
     for the System Admin (G4 table, CH-14). Refusals are logged as security events (w0Deny).
   No payment, refund or seat policy is added; DP's deposit and seat rules are unchanged.
   ============================================================ */
'use strict';

/* ---------- Money and authority ---------- */
const fiOk = a => typeof a === 'number' && Number.isFinite(a) && a > 0 && Math.abs(a * 100 - Math.round(a * 100)) < 1e-6; // GBP, whole pence
const fiP = a => Math.round(a * 100), fiM = p => p / 100;
const fiFin = () => isFin() || isSA();
const fiFinSys = () => fiFin() || (typeof isSys === 'function' && isSys());
const FI_FIN = 'Only a Finance Admin or the Super Administrator can do this.';
const FI_FINSYS = 'Only a Finance Admin, a System Admin or the Super Administrator can do this.';
const FI_AMT = 'Enter an amount in pounds and pence, above £0.00 (for example 120.50).';
let fiRefused = ''; // why the last recordPayment was refused (a dialog stays open and shows it)
function fiNo(entity, action, why) { fiRefused = why; w0Log('Finance', entity || '—', 'Blocked: ' + action, '—', 'No change', why); toast(why, 'err'); return false; }

/* ---------- References: never reuse one that is in the ledger ---------- */
const fiRefTaken = ref => !!ref && (allTx().some(t => t.ref === ref) || Object.values(STORE.worlds).some(w => (w.tx || []).some(t => t.ref === ref)));
function fiUniqRef(prefix, base, span) {
  for (let k = 0; k < 40; k++) { const r = prefix + (base + Math.floor(Math.random() * span)); if (!fiRefTaken(r)) return r; }
  let n = base + span; while (fiRefTaken(prefix + n)) n++; return prefix + n;
}

/* ---------- CR-5 / CR-6 / CR-7 / CR-8: recording a payment ---------- */
const fiFee = t => t && t.chb && t.chb.fee ? chFees().find(f => f.id === t.chb.fee) : null;
// The sign-up bank transfer that a learner's first row (or deposit) belongs to, while Finance hasn't confirmed it
const fiSignupBank = t => t && t.v && (STORE.chBank || []).find(x => x.v === t.v && x.status === 'Awaiting confirmation');
// What is due on an item, in pence, and whether only that exact amount can be recorded
function fiDue(t) {
  if (t.dep) return { p: fiP(t.dep.amount), exact: true, what: 'deposit' };
  if (t.inv) return { p: fiP(t.inv.amount), exact: true, what: 'invoice' };
  const f = fiFee(t); if (f) return { p: fiP(f.amount), exact: true, what: 'observation fee' };
  if (t.chb && !t.chb.wv) return { p: fiP(t.chb.amount), exact: true, what: 'bank transfer' };
  if (t.chb && t.chb.wv) { const w = STORE.worlds[t.chb.wv], pl = w && w.plans.find(p => p.e === t.chb.e), r = pl && pl.rows.find(y => y.n === t.chb.n); return { p: r ? dpDue(r) : fiP(t.chb.amount), exact: false, what: 'instalment' }; }
  if (t.r) { const x = fiSignupBank(t); if (x && x.opt !== 'deposit' && t.r.n === 1 && fiP(x.amount) !== dpDue(t.r)) return { p: fiP(x.amount), exact: true, what: 'sign-up bank transfer' }; return { p: dpDue(t.r), exact: false, what: 'instalment' }; } // the transfer covers payment 1 and any catch-up together (CB9)
  if (t.od) return { p: fiP(t.od.amount) - fiP(t.od.paid || 0), exact: false, what: 'instalment' };
  return { p: fiP(t.due || 0), exact: true, what: 'payment' };
}
// Why this amount can't be recorded against this item, or ''
function fiAmountWhy(t, a) {
  if (!fiOk(a)) return FI_AMT;
  const d = fiDue(t), p = fiP(a);
  if (p > d.p && t.dep) return `${money(a, 'GBP')} is more than the ${money(fiM(d.p), 'GBP')} deposit. Nothing was recorded — refunding part of a deposit's payment would put the seat under Finance review (PD-DP-12), and the client hasn't decided how a deposit overpayment is handled.`;
  if (p > d.p && !fiSurplusOk(t)) return `${money(a, 'GBP')} is more than the ${money(fiM(d.p), 'GBP')} due on this ${d.what}. Nothing was recorded — a surplus can be recorded only on a learner's instalment, where its refund is a transaction on their record (TBD-094); how a surplus on a ${d.what} is handled isn't decided.`;
  if (p > d.p && !fiSurplus) return `${money(a, 'GBP')} is more than the ${money(fiM(d.p), 'GBP')} due on this ${d.what}. Nothing was recorded. To record it, use "Raise refund for the surplus": the payment is recorded and a refund request for the ${money(fiM(p - d.p), 'GBP')} surplus goes to another Finance Admin for approval (TBD-094: a surplus is refunded, not held as credit).`;
  if (d.exact && p < d.p) return `A ${d.what} is confirmed only by its full amount (${money(fiM(d.p), 'GBP')}). Nothing was recorded — the client hasn't decided how a part-payment of a ${d.what} is handled.`;
  return '';
}
const _rpFI = recordPayment;
recordPayment = function (t, a, ref, mode, r) {
  fiRefused = '';
  if (!fiFin()) { fiRefused = FI_FIN; return w0Deny('Finance', (t && t.key) || '—', 'record an offline payment', FI_FIN); }
  if (!t) return fiNo('—', 'payment against an unknown item', 'That item is not on record. Nothing was recorded.');
  dpReconcile();
  // Already recorded, or a balance toward an invalid reservation: DP's own refusals (and their audit) apply
  const w = t.v && STORE.worlds[t.v];
  if (dpDone(t) || (w && t.r && t.pl && t.pl === dpHoldPl(w) && dpPayWhy(w, 'fin'))) { const res = _rpFI.apply(this, arguments); fiRefused = res === false ? 'Nothing is due on this item.' : ''; return res; }
  // The item is the current one with this key (never a stale or made-up target, or another person's item under a borrowed key):
  // the target with the same underlying record, or the only target with that key
  const cands = t.key ? payTargets().filter(x => x.key === t.key) : [], cur = cands.find(x => fiSameItem(x, t)) || (cands.length === 1 ? cands[0] : null);
  if (!cur) return fiNo(t.key, 'payment against an unknown item', 'That item is not waiting for a payment. Nothing was recorded.');
  const f = fiFee(cur); if (f && f.status !== 'Due') return fiNo(`${f.name} · ${f.id}`, 'observation fee already settled', `This observation fee is already ${f.status.toLowerCase()}, so the transfer was not recorded against it. Any money that arrived needs Finance review.`);
  const why = fiAmountWhy(cur, a); if (why) return fiNo(cur.key, 'payment amount refused', why);
  ref = String(ref || '').trim();
  if (!ref) return fiNo(cur.key, 'payment without a reference', 'Enter the payment reference. Nothing was recorded.');
  if (fiRefTaken(ref)) return fiNo(ref, 'duplicate payment reference', `${ref} is already in the ledger. Nothing was recorded — check whether this payment was recorded before.`);
  if (cur.inv) return fiInvPaid(cur.inv, a, ref, mode, r);
  const res = _rpFI.call(this, cur, a, ref, mode, r);
  // the instalment-transfer path (ch-b7a) adds the whole amount to the row: with a surplus, the row holds only what was due
  if (fiSurplus && cur.chb && cur.chb.wv) { const w2 = STORE.worlds[cur.chb.wv], p2 = w2 && w2.plans.find(p => p.e === cur.chb.e), row = p2 && p2.rows.find(y => y.n === cur.chb.n); if (row && fiP(row.paid) > fiP(row.amount)) { row.paid = row.amount; row.status = 'Paid'; } }
  return res;
};
// TBD-094's surplus route: a learner's own instalment (a row, or its bank transfer), where the refund is a transaction on the learner's
// record. Deposits (PD-DP-12), invoices (PD-FI-04), observation fees, the mock transfer and seeded overdue rows are not covered.
const fiSurplusOk = t => !!t && ((!!t.r && !!t.v && !fiDue(t).exact) || (!!t.chb && !!t.chb.wv && !t.chb.fee));
const fiSameItem = (x, t) => (t.chb && x.chb === t.chb) || (t.dep && x.dep === t.dep) || (t.r && x.r === t.r) || (t.od && x.od === t.od) || (t.inv && x.inv === t.inv);
// Two observation-fee transfers of one learner share a bank reference (<learner>-OBS), so their keys collided and the dialog
// could record one fee's payment against the other: a colliding fee key also names the fee
const _ptFI = payTargets;
payTargets = function () { const out = _ptFI.apply(this, arguments), n = {}; out.forEach(t => { n[t.key] = (n[t.key] || 0) + 1; }); return out.map(t => (n[t.key] > 1 && t.chb && t.chb.fee ? { ...t, key: t.key + '|' + t.chb.fee } : t)); };
// TBD-094 (TBD cleanup, CHANGE): an overpayment is refunded, not held as credit — "Raise refund for the surplus" raises a refund item
// for the surplus. FI-1 records the payment and raises that refund request in one step (before, it was a pre-filled form that could
// be cancelled, leaving the surplus unaccounted). The request follows the refund approval like any other: another Finance Admin
// approves it (G4; the raiser can't); only the Super Administrator's own is applied at once (D8). Nothing is refunded before then.
let fiSurplus = false;
ACT.opSurplus = () => {
  if (!fiFin()) return w0Deny('Finance', '—', 'record an offline payment', FI_FIN);
  const t = payTargets().find(x => x.key === $('#op-t').value), a = +$('#op-a').value, ref = String(($('#op-r') || {}).value || '').trim(), r = mval('#rsn'), mode = ($('#op-m') || {}).value || 'Bank transfer';
  if (!t) return;
  if (!fiOk(a)) { fieldErr('#op-a', FI_AMT); return; }
  const due = fiDue(t).p, surplus = fiP(a) - due;
  if (surplus <= 0) { fieldErr('#op-a', 'There is no surplus to refund'); return; }
  if (!fiSurplusOk(t)) { fieldErr('#op-a', fiAmountWhy(t, a) || 'A surplus cannot be recorded on this item.'); return; }
  if (!r) { fieldErr('#rsn', 'Enter a reason'); return; }
  fiSurplus = true; let res; try { res = recordPayment(t, a, ref, mode, r); } finally { fiSurplus = false; }
  if (res === false) { fieldErr('#op-a', fiRefused || 'Nothing was recorded.'); return; }
  const tx = allTx().find(x => x.ref === ref && !x.refund);
  const text = `Overpayment surplus on ${ref}: ${money(a, 'GBP')} received, ${money(fiM(due), 'GBP')} due — to be refunded, not held as credit (TBD-094).`;
  const it = tx && newRefund(tx, fiM(surplus), 'Other', text, 'Retain access');
  closeModal();
  if (it) { ADMIN.queue.unshift(it); if (isSA()) saApply(it, text); }
  else w0Log('Finance', ref, 'Surplus refund not raised', money(fiM(surplus), 'GBP') + ' surplus', '—', 'The payment was recorded but its transaction was not found — raise the refund from Refunds');
  render(); toast(it ? (isSA() ? `${money(a, 'GBP')} recorded (${money(fiM(due), 'GBP')} to the instalment). Refund ${it.id} of the ${money(fiM(surplus), 'GBP')} surplus processed (Super Administrator).` : `${money(a, 'GBP')} recorded (${money(fiM(due), 'GBP')} to the instalment). Refund request ${it.id} for the ${money(fiM(surplus), 'GBP')} surplus is waiting for ${it.first}'s approval — nothing is refunded until then.`) : 'Payment recorded. Raise the surplus refund from Refunds.', it ? 'ok' : 'info');
};
// Record offline payment: the reference offered is free, the preview says what will be refused, and a refusal keeps the dialog open
const _foFI = ACT.finOffline;
ACT.finOffline = el => {
  const res = _foFI(el), rf = $('#modal-root #op-r'); if (rf && fiRefTaken(rf.value)) rf.value = fiUniqRef('BACS-', 71000, 999);
  const a = MODAL && MODAL.actions.find(x => x.label === 'Confirm payment');
  if (a && !a._fi) { const g = a.fn; a._fi = true; a.fn = (...x) => { fiRefused = ''; const out = g(...x); if (fiRefused) { if ($('#modal-root #op-a')) fieldErr('#op-a', fiRefused); return false; } return out; }; }
  if (rf) INP.opPrev();
  return res;
};
const _opPrevFI = INP.opPrev;
INP.opPrev = () => {
  _opPrevFI(); const box = $('#op-prev'), t = payTargets().find(x => x.key === ($('#op-t') || {}).value); if (!box || !t) return;
  const why = fiAmountWhy(t, +$('#op-a').value), over = fiSurplusOk(t) && fiOk(+$('#op-a').value) && fiP(+$('#op-a').value) > fiDue(t).p;
  if (!fiSurplusOk(t)) [...box.querySelectorAll('.note')].filter(n => /Overpayment/.test(n.textContent)).forEach(n => n.remove()); // no surplus route for this item
  if (why) box.insertAdjacentHTML('afterbegin', `<div class="note b-red small">${ic('alert', 15)}<div><strong>${over ? 'Confirm payment can\'t record more than is due.' : 'Can\'t be recorded.'}</strong> ${esc(over ? `Use "Raise refund for the surplus" below: the payment is recorded and a refund request for the ${money(fiM(fiP(+$('#op-a').value) - fiDue(t).p), 'GBP')} surplus goes to another Finance Admin for approval (TBD-094).` : why)}</div></div>`);
};

/* ---------- CR-4: an agency invoice is paid once, and its seats are credited once ---------- */
// Portal requests get their own bundle from reconcileInvoices (agency.js) when the item is paid; older requests credit the
// agency's existing bundle, as before. Never both.
function fiInvPaid(i, a, ref, mode, rsn) {
  i.stage = 'paid'; i.status = 'Paid/Processed'; i.decision = `Paid — ${i.data.seats} licences credited (${ref}).`; i.history.push([ADMIN.me.name, now().toISOString(), 'Payment recorded', ref]);
  STORE.fin.tx.unshift({ at: now().toISOString(), ref, gref: '—', receipt: 'RCP-' + ref.slice(-5), payer: i.data.agency, payerType: 'Agency', course: i.data.bundle, amount: a, cur: i.cur, mode: 'Invoice', status: 'Paid', by: ADMIN.me.name, fin: true });
  ADMIN.ledger.unshift({ agency: i.data.agency, bundle: i.data.bundle, at: now().toISOString(), kind: 'Credit', qty: i.data.seats, note: 'Invoice paid ' + ref + ' — licences credited' });
  if (!i.data.portal) { const b = ADMIN.bundles.find(x => x.agency === i.data.agency); if (b) b.seats += i.data.seats; }
  logA('Finance', i.id, 'Invoice payment recorded', 'Approved — awaiting payment', 'Paid — licences credited', rsn || '—');
  toast('Payment recorded. Licences credited to ' + i.data.agency + '.');
}
const fiInvWhy = i => !i ? 'That invoice purchase is not on record.' : i.type !== 'Agency invoice (offline) purchase' ? 'That item is not an invoice purchase.' : i.stage === 'paid' ? 'This invoice is already paid — its licences were credited once.' : i.stage !== 'awaiting' ? 'This invoice purchase is not approved and awaiting payment.' : '';
const _ipFI = ACT.invPay; // kept for the FI-1 suite
ACT.invPay = el => {
  const i = qItem(el && el.dataset && el.dataset.id);
  if (!fiFin()) return w0Deny('Finance', (i && i.id) || '—', 'record an invoice payment', FI_FIN);
  const no = fiInvWhy(i); if (no) return fiNo((i && i.id) || '—', 'invoice payment', no);
  reasonDlg({ title: 'Record payment — ' + i.id, ok: 'Record payment and credit licences', label: 'Note (required)', extra: `<div class="form-grid"><div class="field"><label for="ip-a">Amount</label><input class="input num" id="ip-a" type="number" step="0.01" value="${i.amount}"></div><div class="field"><label for="ip-d">Date received</label><input class="input" type="date" id="ip-d" value="${D(0).slice(0, 10)}"></div><div class="field"><label for="ip-m">Mode</label><select class="select" id="ip-m"><option>Bank transfer</option><option>Other</option></select></div><div class="field full"><label for="ip-r">Reference</label><input class="input" id="ip-r" value="${fiUniqRef('BACS-', 70000, 9999)}"></div></div><div class="note b-blue">${ic('info')}<div class="small">On confirm: ${i.data.seats} seats are credited to ${esc(i.data.agency)} once, and the agency receives a receipt. The invoice is ${money(i.amount, i.cur)}; only that amount can be recorded.</div></div>`,
    onOk: rsn => {
      if (!fiFin()) return w0Deny('Finance', i.id, 'record an invoice payment', FI_FIN);
      const no2 = fiInvWhy(i); if (no2) { fiNo(i.id, 'invoice payment', no2); return; }
      const a = +$('#ip-a').value, ref = $('#ip-r').value.trim();
      if (!fiOk(a)) { fieldErr('#ip-a', FI_AMT); return false; }
      if (fiP(a) !== fiP(i.amount)) { fieldErr('#ip-a', `The invoice is ${money(i.amount, i.cur)}. Only the full amount credits the licences — the client hasn't decided how part or surplus invoice payments are handled.`); return false; }
      if (!ref) { fieldErr('#ip-r', 'Enter the payment reference'); return false; }
      if (fiRefTaken(ref)) { fieldErr('#ip-r', `${ref} is already in the ledger`); return false; }
      fiInvPaid(i, a, ref, $('#ip-m').value, rsn); render();
    } });
};

/* ---------- CR-1 / CR-2 / CR-3: refunds ---------- */
const fiPayerOf = i => (i.data && i.data.payer) || String((i.related || [])[0] || '').split(' · ')[0];
const fiRefunds = (ref, payer) => (ADMIN.queue || []).filter(i => i.type === 'Refund' && (i.data || {}).tx === ref && fiPayerOf(i) === payer); // the whole queue, whoever is looking (allQueue is filtered by role)
const fiRefDone = i => ['Approved', 'Paid/Processed'].includes(i.status) || !!i.processed;
const fiRefHeld = i => fiRefDone(i) || isOpen(i); // open requests (Pending, Info Requested, Escalated) reserve their amount
const fiSum = xs => xs.reduce((s, i) => s + fiP(i.amount), 0);
// The refundable remainder of a payment: what was collected, less every processed and open refund against it (that payer's)
const _rfFI = refundable; // kept for the FI-1 suite (the rule before FI-1)
refundable = function (t) { return fiM(Math.max(0, fiP(Math.abs(t.amount)) - fiSum(fiRefunds(t.ref, t.payer).filter(fiRefHeld)))); };
// A refund records the payer and the amount collected, so approval can check it again
const _nrFI = newRefund;
newRefund = function (t) { const it = _nrFI.apply(this, arguments); it.data.payer = t.payer; it.data.txAmt = Math.abs(t.amount); return it; };
// A refund is raised only against a payment in the ledger (or a seeded deposit or flagged duplicate of that amount)
function fiRefSrcWhy(t, pre) {
  if (!t || !t.ref) return 'Choose the payment to refund.';
  if (allTx().some(x => x.ref === t.ref && x.payer === t.payer && !x.refund && fiP(Math.abs(x.amount)) === fiP(Math.abs(t.amount)))) return '';
  const e = (pre && pre.extra) || {}, src = e.deposit ? (STORE.fin.deposits || []).find(d => d.id === e.deposit) : e.dup ? (STORE.fin.dups || []).find(d => d.id === e.dup) : null;
  return src && fiP(src.amount) === fiP(t.amount) ? '' : 'That payment is not in the ledger, so it can\'t be refunded.';
}
const _rrFI = raiseRefund;
raiseRefund = function (t, preset = {}) {
  if (!fiFin()) return w0Deny('Finance', (t && t.ref) || '—', 'raise a refund', FI_FIN);
  const src = fiRefSrcWhy(t, preset); if (src) return fiNo((t && t.ref) || '—', 'refund of an unknown payment', src);
  const r = _rrFI.apply(this, arguments), a = MODAL && MODAL.actions.find(x => /Submit refund/.test(x.label || ''));
  if (a && !a._fi) {
    const g = a.fn; a._fi = true;
    a.fn = (...x) => {
      if (!fiFin()) return w0Deny('Finance', t.ref, 'raise a refund', FI_FIN);
      const v = +$('#rr-a').value, max = refundable(t);
      if (!fiOk(v)) { fieldErr('#rr-a', FI_AMT); return false; }
      if (fiP(v) > fiP(max)) { fieldErr('#rr-a', `This exceeds the refundable remainder (${money(max, t.cur)})`); return false; }
      return g(...x);
    };
  }
  return r;
};
const _frFI = ACT.finRaise;
ACT.finRaise = el => (fiFin() ? _frFI(el) : w0Deny('Finance', '—', 'raise a refund', FI_FIN));
// CR-3: the admin console's Raise refund uses the same refund (newRefund), the same remainder and the same checks
const _arFI = ACT.raiseRefund; // kept for the FI-1 suite
ACT.raiseRefund = () => {
  if (!fiFin()) return w0Deny('Finance', '—', 'raise a refund', FI_FIN);
  const txs = allTx().filter(t => ['Paid', 'Partially refunded'].includes(t.status) && !t.refund && !fiObsFeeTx(t) && refundable(t) > 0).slice(0, 40); // as Finance's own refund picker (finRaise)
  if (!txs.length) { toast('No payment has anything left to refund.', 'info'); return; }
  reasonDlg({ title: 'Raise refund', ok: 'Raise refund', extra: `<div class="field"><label for="rr-t">Original transaction</label><select class="select" id="rr-t">${txs.map((t, k) => `<option value="${k}">${esc(t.ref)} · ${esc(t.payer)} · paid ${money(t.amount, t.cur)} · refundable ${money(refundable(t), t.cur)}</option>`).join('')}</select></div><div class="field"><label for="rr-a">Amount</label><input class="input" id="rr-a" type="number" step="0.01" placeholder="The refundable remainder if blank"></div><div class="field"><label for="rr-c">Enrolment consequence</label><select class="select" id="rr-c"><option>Revoke access</option><option>Retain access</option></select></div><p class="small muted">${isSA() ? 'As Super Administrator, the refund is processed immediately — reason, audit entry and FYI notification to all Finance Admins.' : 'Routed to a different Finance Admin for approval.'}</p>`,
    onOk: rsn => {
      if (!fiFin()) return w0Deny('Finance', '—', 'raise a refund', FI_FIN);
      const t = txs[+$('#rr-t').value], max = refundable(t), raw = $('#rr-a').value.trim(), a = raw === '' ? max : +raw;
      if (!fiOk(a)) { fieldErr('#rr-a', FI_AMT); return false; }
      if (fiP(a) > fiP(max)) { fieldErr('#rr-a', `This exceeds the refundable remainder (${money(max, t.cur)})`); return false; }
      const it = newRefund(t, a, 'Other', rsn, $('#rr-c').value); ADMIN.queue.unshift(it);
      if (isSA()) { saApply(it, rsn); toast('Refund processed'); } else toast(`${it.id} raised — sent to ${it.first}.`);
      go('a-queue', { id: it.id });
    } });
};
// CR-1: a refund is processed once (a retried approval, a second call or a later decision never pays it again)
const _reFI = refundEffect;
refundEffect = function (i) {
  if (i && i.processed) { w0Log('Finance', i.id, 'Blocked: refund already processed', 'Processed ' + fdt(i.processed), 'No change', 'A refund is paid once'); return; }
  return _reFI.apply(this, arguments);
};
// Processed refunds plus this one never exceed what was collected (checked again when the refund is approved)
function fiRefCapWhy(i) {
  const d = i.data || {}, payer = fiPayerOf(i), tx = allTx().find(t => t.ref === d.tx && t.payer === payer && !t.refund);
  const cap = tx ? fiP(Math.abs(tx.amount)) : d.txAmt != null ? fiP(d.txAmt) : null; if (cap == null) return '';
  const done = fiSum(fiRefunds(d.tx, payer).filter(x => x !== i && fiRefDone(x)));
  return done + fiP(i.amount) > cap ? `Approving ${i.id} would refund ${money(fiM(done + fiP(i.amount)), i.cur)} against ${d.tx}, which collected ${money(fiM(cap), i.cur)}. Nothing was refunded.` : '';
}

/* ---------- CR-1 / CR-9: deciding finance items ---------- */
const FI_TYPES = ['Refund', 'Agency invoice (offline) purchase', CH_VAT_T, CH_WV_T];
function fiDecideWhy(i) {
  if (i.type === CH_WV_T) return i.stage === 'final' ? (isSA() ? '' : 'The Super Administrator gives the final decision on an observation fee waiver (CH-39).') : (fiFin() ? '' : 'A Finance Admin reviews an observation fee waiver (CH-39).');
  if (i.type === CH_VAT_T) return fiFin() ? '' : 'A Finance Admin decides bundle VAT settings (CH-06).';
  return fiFin() ? '' : 'Refunds and invoice purchases are decided by a Finance Admin (or the Super Administrator).';
}
// The item's own state: open, within what was collected, a fee still due (role apart)
function fiStateWhy(i, a) {
  if (!isOpen(i)) return ['item already decided', `${i.id} is already ${String(i.status).toLowerCase()}. It can't be decided again — nothing changed.`];
  if (i.type === 'Refund' && a === 'approve') { const cap = fiRefCapWhy(i); if (cap) return ['refund above the amount collected', cap]; }
  if (i.type === CH_WV_T && a === 'approve') { const f = chFees().find(x => x.id === (i.data || {}).fee); if (f && f.status !== 'Due') return ['waiver of a settled fee', `This observation fee is already ${f.status.toLowerCase()}, so there is nothing to waive. Reject or return the request.`]; }
  return null;
}
const _adFI = applyDecision;
applyDecision = function (i, a, r, o) {
  if (!i) return false; // FI-2 (L-11): no item, no decision
  if (i && a !== 'note' && FI_TYPES.includes(i.type)) {
    const who = fiDecideWhy(i); if (who) return w0Deny('Approvals Queue', i.id, 'decide a finance item', who);
    const st = fiStateWhy(i, a); if (st) return fiNo(i.id, st[0], st[1]);
  }
  return _adFI.apply(this, arguments);
};
// D8: the Super Administrator's own item is applied at once — but only when it could be applied (saApply marked it Approved
// even when the decision itself was refused)
const _saFI = saApply;
saApply = function (i, r) {
  if (i && FI_TYPES.includes(i.type)) { const st = fiStateWhy(i, i.type === 'Data correction' ? 'approveFinal' : 'approve'); if (st) return fiNo(i.id, st[0], st[1]); }
  return _saFI.apply(this, arguments);
};
const _qDoFI = ACT.qDo;
ACT.qDo = el => {
  const i = qItem(el.dataset.id), a = el.dataset.a;
  if (i && a !== 'note' && FI_TYPES.includes(i.type)) { const who = fiDecideWhy(i); if (who) return w0Deny('Approvals Queue', i.id, 'decide a finance item', who); if (!isOpen(i)) return fiNo(i.id, 'item already decided', `${i.id} is already ${String(i.status).toLowerCase()}. It can't be decided again.`); }
  return _qDoFI(el);
};

/* ---------- CR-7: an observation fee is collected once ---------- */
const fiFeeTransfer = f => (STORE.chBank || []).find(x => x.fee === f.id && x.status === 'Awaiting confirmation');
const fiFeeBusy = (el, how) => {
  const f = chFees().find(x => x.id === el.dataset.id); if (!f || !fiFeeTransfer(f)) return false;
  w0Log('Payments', `${f.name} · ${f.id}`, 'Blocked: observation fee already being paid', 'Bank transfer awaiting confirmation', 'No change', `${how} refused while a bank transfer for this fee awaits Finance`);
  render(); toast('Your bank transfer for this fee is awaiting confirmation by Finance, so nothing more is needed.', 'err'); return true;
};
const _cfpFI = ACT.chFeePay; ACT.chFeePay = el => (fiFeeBusy(el, 'Card payment') ? undefined : _cfpFI(el));
const _cfbFI = ACT.chFeeBank; ACT.chFeeBank = el => (fiFeeBusy(el, 'A second transfer notice') ? undefined : _cfbFI(el));

/* ---------- CR-8: the admin console's Record offline payment is Finance's own dialog ---------- */
const _opFI = ACT.offlinePay; // kept for the FI-1 suite
ACT.offlinePay = el => {
  if (!fiFin()) return w0Deny('Finance', '—', 'record an offline payment', FI_FIN);
  const lid = el && el.dataset && el.dataset.l, v = lid && learnerAccounts().find(x => STORE.worlds[x].me.id === lid), t = v && payTargets().find(x => x.v === v);
  return ACT.finOffline({ dataset: t ? { k: t.key } : {} });
};

/* ---------- CR-9: every other Finance mutation checks the role in the handler ---------- */
const fiGuard = (name, allow, msg, act) => { const g = ACT[name]; if (g) ACT[name] = el => (allow() ? g(el) : w0Deny('Finance', (el && el.dataset && el.dataset.id) || '—', act, msg)); };
[['depRefund', 'raise a deposit refund'], ['dupRefund', 'refund a duplicate payment'], ['dupOk', 'resolve a duplicate payment'], ['ppConfirm', 'confirm a pending payment'], ['depBal', 'record a balance payment']].forEach(([n, act]) => fiGuard(n, fiFin, FI_FIN, act));
[['odRestore', 'set a payment arrangement'], ['odDisc', 'discontinue for non-payment'], ['odReact', 'reactivate after non-payment'], ['discNonPay', 'discontinue for non-payment']].forEach(([n, act]) => fiGuard(n, fiFinSys, FI_FINSYS, act));
// Seeded Deposits → Record balance: a real amount (it saved "abc" as NaN)
const _dbFI = ACT.depBal;
ACT.depBal = el => { const r = _dbFI(el); if ($('#modal-root #db-a')) s5WrapPrimary(() => (fiOk(+$('#db-a').value) ? '' : (fieldErr('#db-a', FI_AMT), true))); return r; };
// Waivers reduce what is owed: a positive amount (in pence) or a percentage up to 100 — never a negative that raises it
const _fwFI = ACT.finWaive;
ACT.finWaive = el => {
  const r = _fwFI(el);
  if ($('#modal-root #wv-a')) s5WrapPrimary(() => { const v = +$('#wv-a').value, pct = ($('#wv-k') || {}).value === 'pct'; return (pct ? Number.isFinite(v) && v > 0 && v <= 100 : fiOk(v)) ? '' : (fieldErr('#wv-a', pct ? 'Enter a percentage above 0 and up to 100.' : FI_AMT), true); });
  return r;
};

/* ---------- Learner checkout: a part payment is in whole pence ---------- */
const _coFI = checkout;
checkout = function () {
  const r = _coFI.apply(this, arguments), a = MODAL && MODAL.actions.find(x => /Pay securely/.test(x.label || ''));
  if (a && !a._fi) { const g = a.fn; a._fi = true; a.fn = (...x) => { const part = $('#modal-root input[name="payamt"][value="part"]'); if (part && part.checked && !fiOk(parseFloat($('#partAmt').value))) { fieldErr('#partAmt', FI_AMT); return false; } return g(...x); }; }
  return r;
};

UXC.push(['FI-1', 'Critical financial integrity (31 Oct 2026)', [
  'Refunds: a refund is processed once — a retried or repeated approval, or an approval after it was rejected or returned, changes nothing. The refundable remainder counts every open request (including Info requested) and every processed refund, per payment and payer, and approval checks it again. The admin console\'s Raise refund uses the same refund and checks.',
  'Payments: Record offline payment records only the current item\'s amount — never more than is due, and a deposit, invoice or observation fee only by its exact amount (anything else is refused and explained). Amounts are whole pence above £0; a reference already in the ledger is refused. An overpayment on a learner\'s instalment follows TBD-094: "Raise refund for the surplus" records the payment and raises a refund request for the surplus, which another Finance Admin approves (the Super Administrator\'s own is applied at once); nothing is refunded before then. Deposits, invoices, observation fees and seeded overdue rows take no surplus. The admin console\'s Record offline payment opens Finance\'s dialog.',
  'Agency invoices: a bank-transfer purchase is paid once and its seats are credited once.',
  'Observation fees: no card payment or second transfer notice while a transfer awaits Finance; Finance can\'t record a transfer against a fee already paid or waived, and a paid fee can\'t be waived.',
  'Authority: refunds, payments, invoices and bundle VAT are decided by a Finance Admin or the Super Administrator inside the action; the observation fee waiver follows CH-39 by stage; non-payment discontinue / reactivate / arrangements also by the System Admin. Refusals are logged.']]);
