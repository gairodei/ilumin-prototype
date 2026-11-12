/* ============================================================
   L3-C — Enrolment recovery when the batch starts before payment (7 Nov 2026; PD-L3C-* in PROVISIONAL-DECISIONS.md).
   Loads after l3b-sp-deadline.js, before sec1-access.js.
   Root cause. Sign-up assigns the nearest batch that hasn't started (CH-42) at the details step, but nothing re-checked the start
   at payment: NB-1's check deliberately ignored it (for CB9's late-enrolment catch-up), so an applicant whose batch started while
   they were signing up paid and was enrolled into a started batch automatically. When no batch had started yet but none was
   left, the details step said "No batch has a place right now", which wasn't the reason. An Academic Admin couldn't help: "Assign
   / change batch" refused any batch that had started, and found no batch at all for a learner signing up again after a released
   seat; for an unpaid applicant it also moved a seat count the applicant never held.
   What this does (no new late-entry rule):
   - A sign-up whose batch has started can't be paid or started: nothing is charged; details, documents, signed offer letter,
     fee option and payment history are kept. The page says which batch started and when, and the next permitted action.
   - Next permitted actions: the learner can move their application to the next batch CH-42 would assign (they confirm it — never
     silent), an Academic Admin or the Super Administrator can assign any eligible batch (reason required, audited), or the
     learner withdraws (NB-1). If no eligible batch exists, the page says so: there is no legal transition until one opens.
   - Eligible = same programme, not started, Open or Planned, a place, NB-1 readiness (Coordinator, fee option accepted, delivery
     mode ready), the learner's fixed programme version when they have one, and — unless the existing sign-up-again rule applies —
     the same payment wording as the signed offer letter (it depends on the batch start: deposit eligibility). A batch whose
     wording differs is shown as needing a new offer letter and can't be assigned: the signed letter is never changed.
   - The fee option and delivery mode never change; nothing is charged or refunded; seat counts aren't touched (an unpaid
     applicant holds no seat). Enrolled learners keep CH-42 unchanged (no change after the start).
   ============================================================ */
'use strict';

const l3cBatchOf = w => (w && w.signup && w.signup.batch ? chBatch(w.signup.batch) : null);
const l3cOpen = w => !!(w && w.nvq && w.signup && !w.signup.done);
// The applicant's batch started before they completed sign-up
const l3cStranded = w => { const b = l3cBatchOf(w); return l3cOpen(w) && !!b && chStarted(b); };
const l3cWho = w => `${chFullName(w)} (${w.me.id})`;
// The letter's payment wording in batch b (deposit eligibility depends on the start), or null when the signed letter doesn't carry it
function l3cTermsIn(w, b) {
  const s = w.signup, snap = s.sig && s.sig.snapshot; if (!snap || !('pay' in snap) || s.again || !(snap.text || []).some(t => /\{\{payment_terms\}\}/.test(t))) return null;
  const k = s.batch; s.batch = b.code; try { return { now: e2PayTerms(w), signed: snap.pay }; } finally { s.batch = k; }
}
// Why batch b can't take this applicant now (null = it can)
function l3cWhyNot(w, b) {
  if (!b || b.course !== w.nvq.title) return 'Not a batch of this programme';
  if (chStarted(b)) return `Started ${fd(b.start)}`;
  if (!['Open', 'Planned'].includes(b.status)) return `Batch is ${b.status}`;
  if (!chHasPlace(b)) return 'No place';
  if (!nbBatchOk(w, b)) return 'Not taking learners (Coordinator, fee option or delivery mode)';
  if (w.nvq.s3Pinned && b.progVersion && b.progVersion !== w.nvq.progVersion) return `Runs programme version ${b.progVersion}; the learner's is version ${w.nvq.progVersion}`;
  const t = l3cTermsIn(w, b); if (t && t.now !== t.signed) return 'Payment terms differ from the signed offer letter — a new offer letter would be needed';
  return null;
}
const l3cCands = w => ADMIN.batches.filter(b => b.course === w.nvq.title && b.code !== (w.signup && w.signup.batch) && ['Open', 'Planned'].includes(b.status) && !chStarted(b)).sort((x, y) => new Date(x.start) - new Date(y.start));
const l3cTargets = w => l3cCands(w).filter(b => !l3cWhyNot(w, b));
// The batch CH-42 would assign (nearest, country or online first), among the eligible ones
const l3cNearest = w => { const ts = l3cTargets(w); return ts.find(b => chIsOnline(b) || chBatchCountry(b) === w.me.country) || ts.find(chIsOnline) || null; };

/* ---------- Moving an unpaid application ---------- */
function l3cAssign(w, nb, why, by) {
  const s = w.signup, b = l3cBatchOf(w), at = now().toISOString(), from = b ? b.code : (s.releasedFrom ? `none (seat released from ${s.releasedFrom})` : 'none');
  chSetBatch(w, nb); s.moved = null; s.l3cPin = nb.code; (s.l3c = s.l3c || []).push({ from: b ? b.code : null, to: nb.code, at, by, why });
  w.admission.history.push([`Batch changed before payment: ${b ? b.code : '—'} → ${nb.code}`, at]);
  notifyLearner(w.v, 'Admission', 'Your batch has changed', `Your application is now for ${nb.label}, starting ${fd(nb.start)}. Your fee option, documents and signed offer letter don't change. Nothing has been charged.`, 'admission');
  logA('Admissions', l3cWho(w), 'Batch changed before payment', from, `${nb.label} (${nb.code})`, `${by}: ${why}`);
  chCooNotify(nb.coord, 'Applicant assigned', `${chFullName(w)} — application moved to ${nb.code} before payment (${why}).`, 'c-batches.' + nb.code);
}

/* ---------- Payment step and the actions behind it ---------- */
function l3cCard(w) {
  const b = l3cBatchOf(w), nb = l3cNearest(w), held = l3cCands(w).map(x => [x, l3cWhyNot(w, x)]).filter(([, y]) => /new offer letter/.test(y || ''));
  const next = nb
    ? `<p class="small"><strong>Next batch you can join:</strong> ${esc(nb.label)} <span class="mono xs">${nb.code}</span>, starts ${fd(nb.start)}.</p><div class="row"><button class="btn btn-primary" data-act="l3cTake" data-b="${esc(nb.code)}">Move my application to ${esc(nb.label)}</button></div><p class="xs muted">Or ask the Academy for a different batch, or withdraw your application.</p>`
    : `<p class="small"><strong>No batch of this programme that hasn't started can take you at the moment.</strong> The Academy will tell you when one opens, or you can withdraw your application. Contact the Academy: ${academyContact()}</p>`;
  return `<section class="card"><h2>4. Payment</h2><div class="note b-amber l3c-started" role="alert">${ic('alert')}<div class="small"><strong>${esc(chBatchLbl(b))} started on ${fd(b.start)}, before you paid.</strong> Sign-up can't add you to a batch that has started. Nothing has been charged. Your details, documents, fee option and signed offer letter are kept.</div></div>
    ${next}${held.length ? `<p class="xs muted l3c-letter">${held.map(([x]) => esc(x.code)).join(', ')}: the payment terms there differ from your signed offer letter, so the Academy would need to issue a new offer letter first.</p>` : ''}${chNav(w, '')}</section>`;
}
const _payL3C = chStepPay;
chStepPay = function (w) { return l3cStranded(w) ? l3cCard(w) : _payL3C.apply(this, arguments); };
const l3cStop = (w, what) => {
  if (!l3cStranded(w)) return false; const b = l3cBatchOf(w);
  logA('Admissions', l3cWho(w), `Blocked: ${what} (batch started before payment)`, b.code, '—', 'Nothing charged; a started batch is never joined through sign-up');
  render(); toast(`${b.label} started on ${fd(b.start)} — nothing was charged. See the payment step for what you can do next.`, 'err'); return true;
};
const _suPayL3C = ACT.suPay;
ACT.suPay = el => {
  const w = W; if (l3cOpen(w) && l3cStop(w, 'pay for the sign-up')) return false;
  const r = _suPayL3C(el), ok = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); // a payment dialog checks again when confirmed
  if (ok && ok.fn && !ok._l3c) { const f = ok.fn; ok._l3c = true; ok.fn = function () { if (l3cOpen(w) && l3cStop(w, 'pay for the sign-up')) return false; return f.apply(this, arguments); }; }
  return r;
};
const _suStartL3C = ACT.suStart;
ACT.suStart = el => { const w = W; if (l3cOpen(w) && l3cStop(w, 'start the programme')) return false; return _suStartL3C(el); };
// The learner moves their own application to the batch CH-42 would assign — only that one, and only when they confirm
ACT.l3cTake = el => {
  const w = W, code = el && el.dataset && el.dataset.b;
  if (S.portal !== 'learner' || !l3cStranded(w)) { toast('There is nothing to change.', 'info'); return false; }
  const nb = l3cNearest(w); if (!nb || nb.code !== code) { logA('Admissions', l3cWho(w), 'Blocked: move application', code || '—', '—', 'Not the next eligible batch'); render(); toast('That batch can\'t take you now. The page shows what you can do.', 'err'); return false; }
  openModal({ title: `Move your application to ${esc(nb.label)}?`, body: `<p class="small">${esc(nb.label)} <span class="mono xs">${nb.code}</span> starts ${fd(nb.start)}. Your fee option, documents and signed offer letter don't change, and nothing is charged until you pay.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Move my application', cls: 'btn-primary', fn: () => { const x = l3cNearest(w); if (!l3cStranded(w) || !x || x.code !== nb.code) { toast('That batch can\'t take you now.', 'err'); render(); return false; } l3cAssign(w, x, 'Batch started before payment; learner moved to the next batch', 'Learner'); render(); toast(`Your application is now for ${x.label}.`); } }] });
};

/* ---------- Details step: the real reason when no batch can be assigned ---------- */
function l3cNoBatchWhy(w) {
  const bs = ADMIN.batches.filter(b => b.course === w.nvq.title && !['Cancelled', 'Completed', 'Archived'].includes(b.status));
  if (!bs.length) return 'No batch of this programme is scheduled yet.';
  const why = bs.map(b => `${b.code}: ${chStarted(b) ? `started ${fd(b.start)}` : !chHasPlace(b) ? 'full' : !(chIsOnline(b) || chBatchCountry(b) === w.me.country) ? 'in another country' : 'not taking learners'}`);
  return `No batch of this programme that hasn't started can take you (${why.slice(0, 4).join('; ')}${why.length > 4 ? `; ${why.length - 4} more` : ''}).`;
}
const _ahL3C = chAssignedHtml;
chAssignedHtml = function (w) {
  const h = _ahL3C.apply(this, arguments); if (!/No batch has a place right now/.test(h)) return h;
  return h.replace(/<strong>No batch has a place right now\.<\/strong>/, `<strong>${esc(l3cNoBatchWhy(w))}</strong> Nothing has been charged.`);
};
const _nextL3C = ACT.suNext;
ACT.suNext = el => {
  const w = W; if (l3cOpen(w) && chStepKey(w) === 'details' && !chNearestFor(w)) { toast(`${l3cNoBatchWhy(w)} Contact the Academy, or withdraw your application.`, 'err'); return; }
  return _nextL3C(el);
};
// A batch the Academy assigned stands for the details step while it stays eligible (learner portal only)
const _nearL3C = chNearest;
chNearest = function (course, country, exclude) {
  const w = S.portal === 'learner' ? W : null, s = w && w.signup;
  if (l3cOpen(w) && s.l3cPin && w.nvq.title === course && !(exclude || []).includes(s.l3cPin)) { const b = chBatch(s.l3cPin); if (b && !l3cWhyNot(w, b)) return b; }
  return _nearL3C.apply(this, arguments);
};

/* ---------- Academy: Assign / change batch for an application that isn't complete ---------- */
const l3cCanAssign = () => !(typeof isBiz === 'function' && isBiz()) && (isSA() || (typeof isAca === 'function' && isAca()));
const _mvL3C = ACT.chMoveBatch;
ACT.chMoveBatch = el => {
  const lid = el && el.dataset && el.dataset.id, w = lid && chWorldByLid(lid);
  if (!l3cOpen(w)) return _mvL3C(el); // enrolled learners: CH-42 unchanged
  if (!l3cCanAssign()) { chMoveRefuse(lid, 'Only the Academic Admin or the Super Administrator can change a learner\'s batch.'); return false; }
  const b = l3cBatchOf(w), all = l3cCands(w).map(x => [x, l3cWhyNot(w, x)]), ok = all.filter(([, y]) => !y);
  const cur = b ? `${esc(b.label)} (${b.code}), ${chStarted(b) ? 'started' : 'starts'} ${fd(b.start)}` : 'no batch';
  const rows = all.filter(([, y]) => y).map(([x, y]) => `<li>${esc(x.label)} (${x.code}) — ${esc(y)}</li>`).join('');
  if (!ok.length) { logA('Admissions', l3cWho(w), 'Batch change not possible (application)', b ? b.code : '—', '—', 'No eligible batch'); openModal({ title: 'Assign / change batch — ' + esc(chFullName(w)), body: `<p class="small">Application not complete (nothing paid toward a batch). Current: <strong>${cur}</strong>.</p><div class="note b-amber" role="status">${ic('alert')}<div class="small"><strong>No batch can take this applicant.</strong> A batch that has started can't be joined through sign-up.</div></div>${rows ? `<ul class="small">${rows}</ul>` : ''}`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return false; }
  reasonDlg({ title: 'Assign / change batch — ' + esc(chFullName(w)), ok: 'Assign batch', label: 'Reason (required, audited)',
    body: `<p class="small">Application not complete. Current: <strong>${cur}</strong>. Fee option ${esc((r1OptOfW(w) || {}).label || '—')} — it doesn't change, and nothing is charged or refunded. Only eligible batches are listed.</p>${rows ? `<details class="small"><summary>Not available (${all.length - ok.length})</summary><ul>${rows}</ul></details>` : ''}`,
    extra: `<div class="field"><label for="l3c-b">Batch</label><select class="select" id="l3c-b">${ok.map(([x]) => `<option value="${x.code}">${esc(x.label)} (${x.code}) — starts ${fd(x.start)} · ${x.cap - x.enrolled} places</option>`).join('')}</select></div>`,
    onOk: r => { if (!l3cCanAssign() || !l3cOpen(w)) return false; const nb = chBatch(mval('#l3c-b')), y = l3cWhyNot(w, nb); if (y) { chMoveRefuse(lid, `${nb ? nb.code : 'Batch'}: ${y}`); return false; } l3cAssign(w, nb, r, ADMIN.me.name); render(); toast(`${chFullName(w)}'s application is now for ${nb.label}. The learner is notified.`); } });
};
// Learner 360: the Batch card for an application whose batch started (or that has none) offers the assignment
const _cardL3C = chMoveCard;
chMoveCard = function (lid) {
  const w = chWorldByLid(lid); if (!l3cOpen(w)) return _cardL3C.apply(this, arguments);
  const b = l3cBatchOf(w), st = b && chStarted(b);
  return `<section class="card ch-move l3c-move"><div class="row-b"><h2>Batch</h2>${chip(!b ? 'No batch' : st ? 'Started before payment' : 'Application', st || !b ? 'amber' : 'blue')}</div><p class="small">${b ? `<strong>${esc(b.label)}</strong> <span class="mono xs">${b.code}</span> · ${st ? 'started' : 'starts'} ${fd(b.start)}` : 'No batch assigned'} · application not complete (nothing paid toward a batch)</p>
    <button class="btn btn-sm" data-act="chMoveBatch" data-id="${lid}">Assign / change batch</button><p class="xs muted">An application can be moved to any eligible batch that hasn't started (reason required, audited). The fee option and signed offer letter don't change.</p></section>`;
};
// Done: the assignment pin is no longer needed
const _ccL3C = chComplete;
chComplete = function (w) { const r = _ccL3C.apply(this, arguments); if (w && w.signup && w.signup.done) delete w.signup.l3cPin; return r; };

UXC.push(['L3-C', 'Enrolment recovery when the batch starts before payment (7 Nov 2026)', [
  'An applicant whose batch started before they paid is no longer enrolled into it automatically: nothing is charged, everything they did is kept, and the payment step says which batch started and what they can do.',
  'They can move their application to the next batch that can take them (they confirm it), the Academic Admin or Super Administrator can assign another eligible batch (reason required), or they withdraw. Fee option, delivery mode, signed offer letter and payments never change; a batch whose payment terms differ from the signed letter is shown as needing a new offer letter.',
  'When no batch can be assigned, the details step says why (each batch started, full or not taking learners) instead of "No batch has a place right now".']]);
