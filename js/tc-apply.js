/* ============================================================
   TBD cleanup — Step 2 actions that need new handlers. Every block names its TBD ID.
   ============================================================ */
'use strict';

/* TBD-094: an overpayment is refunded, not held as credit — record the payment, then pre-fill a refund for the surplus */
ACT.opSurplus = () => {
  const t = payTargets().find(x => x.key === $('#op-t').value), a = +$('#op-a').value, c = $('#op-c').value, ref = ($('#op-r') || {}).value || ('OFF-' + Date.now().toString().slice(-6)), r = mval('#rsn');
  if (!t) return;
  if (c !== t.cur) { fieldErr('#op-c', `Currency must match the enrolment (${t.cur})`); return; }
  if (!(a > t.due)) { fieldErr('#op-a', 'There is no surplus to refund'); return; }
  if (!r) { fieldErr('#rsn', 'Enter a reason'); return; }
  const surplus = Math.round((a - t.due) * 100) / 100;
  recordPayment(t, a, ref, ($('#op-m') || {}).value || 'Bank transfer', r); closeModal(); render();
  const tx = allTx().find(x => x.ref === ref);
  if (tx) setTimeout(() => raiseRefund(tx, { amount: surplus, cat: 'Other', text: `Overpayment surplus on ${ref} — refunded, not held as credit.`, cons: 'Retain access' }), 0);
  else toast('Payment recorded. Raise the surplus refund from Refunds.', 'info');
};

/* TBD-131: a learner can cancel a request while it is pending */
ACT.reqCancel = el => {
  const r = W.requests.find(x => x.id === el.dataset.id); if (!r || r.status !== 'Requested') return;
  confirmDlg({ title: 'Cancel this request?', ok: 'Cancel request', body: `<p><strong>${esc(r.id)} · ${esc(r.type)}</strong> — ${esc(r.target)}</p><p class="small muted">The Academy will see it as cancelled. You can raise a new request later.</p>`, onOk: () => {
    r.status = 'Cancelled'; r.decided = now().toISOString(); r.decision = 'Cancelled by you.';
    if (r.type === 'Profile change' && W.profilePending) delete W.profilePending[r.target];
    if (typeof logA === 'function') logA('Learner requests', r.id, 'Request cancelled by learner', 'Requested', 'Cancelled', '');
    render(); toast(`Request ${r.id} cancelled.`);
  } });
};

/* The TBD topics that remain after the cleanup (§B4 + the office address): [kind, topic, original IDs, places] */
const TBD_TOPICS = [
  ['Pending client', 'how agencies receive VAT invoices for bank-transfer purchases', '012, 055', 'Approvals Queue → agency invoice purchase item (Finance / Super Admin); Agency → Buy bundles → bank transfer'],
  ['Pending client', 'storage region for learners outside the UK/UAE, and two-region hosting cost', '013', 'Learner 360 → Overview → Data region (learners outside the UK/UAE)'],
  ['Pending client', 'exchange-rate source, update frequency, rounding, and price lock at enrolment', '019, 121', 'Course editor → prices (Super / System Admin); learner checkout'],
  ['Client to supply', 'bank payment instructions', '034', 'Agency → Purchases → approved bank-transfer purchase'],
  ['Client to supply', 'Academy contact email and phone', '039, 045, 152 + untagged', 'Agency receive-only messages, agency Help, agency deactivated sign-in, verification page footer and revoked result, learner Help, learner contact page, learner suspended / archived / paused sign-in notices, admin suspended sign-in, workplace pages (footer, help, FAQ, accessibility, email footer)'],
  ['Client to supply', 'privacy notice URL', '153, 163', 'Verification page privacy notice; workplace privacy notice; workplace email footer'],
  ['Client to supply', 'verification domain', '154', 'Learner certificates → Copy verification link'],
  ['Client to supply', 'Academy office address', 'G6.6', 'Assessor propose observation (office), assessor and admin observation lists, Coordinator observations, learner Observations, learner contact page'],
];
