/* ============================================================
   NB-1 — NVQ enrolment and batch integrity (3 Nov 2026). Loads after iqb-create.js.
   From the NVQ batch / admission / learner-access audit (d0838a1). The accepted rules are unchanged: CH-07 stepper, CH-10/11
   content on the first payment, CH-12 access kept after a rejection, CH-42 the Academy assigns the earliest eligible batch.
   1 The sign-up and withdrawn locks cover the NVQ programme only: short courses, Payments and Calendar stay open (FI-2 approach).
   2 A sign-up withdrawn before it was completed can be followed by a new one; the withdrawn application is kept as a record.
   3 Apply checks the batch rules before anything is created: with no eligible batch there is no sign-up, seat or charge.
   4 Sign-up allocation skips a batch with no Academic Coordinator; the batch is checked again before payment and before start.
   5 A rejected admission is shown with its next step; access stays (CH-12), nothing is refunded or released automatically.
   6 An agency NVQ application can't be approved without a fee option and a batch.
   7 Wording: Apply, the assigned batch (start, end, delivery mode), admission decision vs learning access, the approval dialog.
   ============================================================ */
'use strict';

const nbWho = w => `${chFullName(w)} (${w.me.id})`;
const nbProgOfCat = el => { const c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)); return c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) || null : null; };

/* ---------- 1 Locks per enrolment: a sign-up in progress or withdrawn locks the NVQ programme only ---------- */
const NB_NVQ_ROUTES = ['assignments', 'assignment', 'progress', 'observations'];
const nbNvqRoute = r => r === 'admission' || NB_NVQ_ROUTES.includes(r) || (['course', 'quiz'].includes(r) && (S.params || {}).id === 'nvq');
const nbSignupOpen = w => !!(w && w.flags && w.flags.nvq && w.signup && !w.signup.done);
// The other locks (archived account, overdue or manual pause of that course) still apply; only the sign-up's own state is set aside
const _lfNB = lockFor;
lockFor = function (r) {
  if (!nbSignupOpen(W) || nbNvqRoute(r)) return _lfNB.apply(this, arguments);
  const f = W.flags; f.nvq = false; try { return _lfNB.apply(this, arguments); } finally { f.nvq = true; }
};

/* ---------- 2 A new application after a withdrawn sign-up ---------- */
// Only a sign-up withdrawn before completion: no payment, plan, seat or enrolment. Anything else keeps the existing refusal.
const nbWithdrawnOpen = w => !!(w && w.admission && w.admission.status === 'Withdrawn' && w.signup && !w.signup.done && !w.signup.pay && !w.signup.releasedFrom
  && !w.flags.sponsored && !(w.plans || []).some(p => p.e === 'nvq') && !(w.enrolments || []).includes(w.nvq));
const nbWithdrawnAt = w => (w.admission.history.find(h => h[0] === 'Withdrawn') || [])[1] || now().toISOString();
// The withdrawn application, its documents and signed letter are kept as they were; the new sign-up gets new records
function nbArchive(w) {
  const at = now().toISOString(), wd = nbWithdrawnAt(w);
  (w.nbPast = w.nbPast || []).unshift({ title: w.nvq.title, prog: w.signup.prog || null, status: 'Withdrawn', withdrawn: wd, kept: at, admission: w.admission, signup: w.signup, nvq: w.nvq, docs: w.docs });
  logA('Admissions', nbWho(w), 'New application after withdrawal', 'Withdrawn', 'Sign-up started', `Earlier application for ${w.nvq.title} (withdrawn ${fd(wd)}) kept as a record`);
}
const _startNB = ch8StartSignup;
ch8StartSignup = function (w) { if (nbWithdrawnOpen(w)) nbArchive(w); return _startNB.apply(this, arguments); };
const nbPastCard = list => !list || !list.length ? '' : `<section class="card nb-past"><h2>Earlier applications</h2><ul class="list">${list.map(p => `<li class="li"><div class="li-b"><strong>${esc(p.title)}</strong><span class="small">${chip(p.status, 'grey')} Withdrawn on ${fd(p.withdrawn)}${p.signup && p.signup.batch ? ` · batch ${esc(p.signup.batch)}` : ''}${p.signup && p.signup.sig ? ' · offer letter signed' : ''}</span><span class="xs muted">Kept as a record: its documents, offer letter and history are unchanged. Nothing was paid.</span></div></li>`).join('')}</ul></section>`;

/* ---------- 3 No eligible batch: checked before a sign-up exists ---------- */
// The batch the Academy would assign (the same chNearest rules) for a learner who hasn't started: their country, this fee option
function nbProbe(w, pr, o) {
  const t = o ? r1TermsOf(o) : null, fake = { v: w.v, me: w.me, flags: {}, nvq: { title: pr.title, feeOpt: o ? o.id : null }, signup: { prog: pr.id, plan: t ? { ...t } : null } };
  return w1WithW(fake, () => chNearestFor(fake));
}
const nbOptsOf = pr => (r1IsL3Pid(pr.id) ? r1Eligible(pr.id) : []);
const nbBatchTxt = b => `${chBatchLbl(b)} · ${fd(b.start)} – ${fd(b.end)}`;
function nbNoBatch(w, pr) {
  logA('Admissions', nbWho(w), 'Sign-up not started (no eligible batch)', '—', '—', `${pr.title}: no batch with a place is taking new learners — nothing was created or charged`);
  openModal({ title: 'No intake available right now', body: `<div class="note b-amber nb-nobatch" role="alert">${ic('alert')}<div class="small"><strong>No batch of ${esc(pr.title)} can take a new learner at the moment.</strong> Nothing was created and you haven't been charged.<br>Contact the Academy and we'll tell you when the next batch opens: ${academyContact()}</div></div><p class="small muted">Your other courses, Payments and Calendar are not affected.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
  return false;
}

/* ---------- Apply: the checks above, then the existing dialog with what will happen ---------- */
const _applyNB = ACT.applyNvq;
ACT.applyNvq = el => {
  const w = W, pr = nbProgOfCat(el), again = nbWithdrawnOpen(w), m0 = MODAL;
  let keep = null; if (again) { keep = { admission: w.admission, nvq: w.nvq, signup: w.signup }; w.admission = null; w.nvq = null; w.signup = null; w.flags.nvq = false; }
  let r; try { r = _applyNB(el); } finally { if (keep) { Object.assign(w, keep); w.flags.nvq = true; } }
  if (!pr || !MODAL || MODAL === m0 || !/^Sign up for /.test(MODAL.title || '')) return r; // refused or redirected by the existing rules
  const opts = nbOptsOf(pr); if (r1IsL3Pid(pr.id) && !opts.length) return r; // S4a "needs configuration" sign-up: payment stays blocked, kept as accepted
  const hits =opts.length ? opts.map(o => [o, nbProbe(w, pr, o)]) : [[null, nbProbe(w, pr, null)]];
  if (!hits.some(x => x[1])) { closeModal(); return nbNoBatch(w, pr); }
  const t = document.createElement('template'); t.innerHTML = MODAL.body;
  hits.forEach(([o, b]) => { const l = o && t.content.querySelector(`input[name="r1-opt"][value="${o.id}"]`); const lab = l && l.closest('.r1-pick'), s = lab && lab.querySelector('.xs.muted'); if (!s) return;
    if (b) s.insertAdjacentHTML('beforeend', `<span class="nb-optb" style="display:block">Earliest batch for this option: ${esc(nbBatchTxt(b))}.</span>`);
    else { l.setAttribute('disabled', ''); l.removeAttribute('checked'); s.insertAdjacentHTML('beforeend', '<span class="nb-optb" style="display:block"><strong>No batch is taking this option right now.</strong></span>'); } });
  const one = !opts.length && hits[0][1], first = t.content.firstElementChild;
  const intro = `<div class="note b-blue nb-what">${ic('info')}<div class="small"><strong>Pressing Start sign-up creates your application.</strong> To keep browsing, close this — nothing is created or charged until you start. The Academy assigns the earliest batch with a place that takes your fee option${one ? `: <strong>${esc(nbBatchTxt(one))}</strong>` : ''}. Need a different start date? Contact the Academy.${again ? `<br>Your earlier application (withdrawn on ${fd(nbWithdrawnAt(w))}) is kept as a record; this starts a new one.` : ''}</div></div>`;
  if (first) first.insertAdjacentHTML('beforebegin', intro); else t.innerHTML = intro + t.innerHTML;
  MODAL.body = t.innerHTML; renderModal();
  // On Start sign-up: the chosen option must still have a batch (checked again; nothing is created otherwise)
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a && a.fn) { const g = a.fn; a.fn = (...x) => {
    const id = ($('#modal-root input[name="r1-opt"]:checked') || {}).value, o = id ? r1Opt(id) : null;
    if ((o || !opts.length) && !nbProbe(w, pr, o)) { if (o) { fieldErr('#r1-opts', 'No batch is taking this option right now — choose another or contact the Academy'); return false; } closeModal(); return nbNoBatch(w, pr); }
    return g(...x); }; }
  return r;
};

/* ---------- 4 Operationally unready batches ---------- */
// A batch needs an Academic Coordinator to leave Planned (batchLife); sign-up allocation needs one too (fail closed). Planned
// batches with a Coordinator stay eligible (CH-42), and the batch's intake rule isn't read here (client question).
const nbStaffed = b => !!b && (mcList(b).length > 0 || !!b.coord);
const _nearNB = chNearest;
chNearest = function (course, country, exclude) {
  const no = chUpcoming(course).filter(b => !nbStaffed(b)).map(b => b.code);
  return _nearNB.call(this, course, country, (exclude || []).concat(no));
};
// Still valid for this learner: place, status, Coordinator, fee option and delivery-mode readiness. Not the country (an
// administrator may have assigned it with Assign / change batch) and not the start date (late enrolment, CB9-D).
const NB_SHUT = ['Cancelled', 'Completed', 'Archived'];
function nbBatchOk(w, b) {
  if (!b || !w.nvq || b.course !== w.nvq.title || !chHasPlace(b) || NB_SHUT.includes(b.status) || !nbStaffed(b)) return false;
  const o = r1OptOfW(w); if (o && !w1Accepts(b, o.id)) return false;
  return !crShowReady(b) || (o && o.mode ? crReady(b, o.mode) === 'ready' : crReadyAny(b));
}
const nbBlockedCard = (w, b) => `<section class="card"><h2>4. Payment</h2><div class="note b-amber nb-unready" role="alert">${ic('alert')}<div class="small"><strong>${esc(chBatchLbl(b))} can't take new learners at the moment, and no other batch is available.</strong> Nothing has been charged. Your documents and signed offer letter are kept. Contact the Academy: ${academyContact()}</div></div>${chNav(w, '')}</section>`;
const _payNB = chStepPay;
chStepPay = function (w) {
  const s = w.signup, b = s && chBatch(s.batch);
  if (b && chHasPlace(b) && !nbBatchOk(w, b)) { // a full batch keeps the existing CH-42 handling
    const nb = w1WithW(w, () => chNearestFor(w, [b.code])); if (!nb) return nbBlockedCard(w, b);
    chSetBatch(w, nb); s.moved = { from: b.label, to: nb.label, at: now().toISOString(), unready: true };
    w.admission.history.push([`Batch not taking learners — reassigned to ${nb.code}`, s.moved.at]);
    notifyLearner(w.v, 'Admission', 'Your batch has changed', `${b.label} can't take new learners at the moment. You've been assigned ${nb.label}, starting ${fd(nb.start)}.`, 'admission');
    logA('Admissions', nbWho(w), 'Batch reassigned (not taking learners before payment)', b.code, nb.code, 'Earliest eligible batch');
  }
  const h = _payNB.apply(this, arguments);
  return s && s.moved && s.moved.unready ? h.split(`${esc(s.moved.from)} filled before you paid`).join(`${esc(s.moved.from)} can't take new learners at the moment`) : h;
};
const nbStopPay = (w, what) => {
  const b = chBatch(w.signup && w.signup.batch); if (!b || nbBatchOk(w, b)) return false;
  logA('Admissions', nbWho(w), `Blocked: ${what} (batch not taking learners)`, b.code, '—', 'Nothing charged; no seat taken'); render();
  toast(`${b.code} can't take new learners at the moment — nothing was charged.${chSponsored(w) ? ' Contact the Academy.' : ' Check the payment step.'}`, 'err'); return true;
};
const _suPayNB = ACT.suPay;
ACT.suPay = el => { const w = W; if (w && w.signup && !w.signup.done && chHasPlace(chBatch(w.signup.batch)) && nbStopPay(w, 'pay for the sign-up')) return; return _suPayNB(el); };
const _suStartNB = ACT.suStart;
ACT.suStart = el => { const w = W; if (w && w.signup && !w.signup.done && nbStopPay(w, 'start the programme')) return; return _suStartNB(el); };

/* ---------- 5 Rejected admission: decision and next step, access as before (CH-12) ---------- */
const nbRejected = w => !!(w && w.admission && w.admission.status === 'Rejected' && w.signup && w.signup.done);
const nbRejectedAt = w => (w.admission.history.slice().reverse().find(h => h[0] === 'Rejected') || [])[1];
const NB_REJ_NEXT = 'Your programme access and your payments stay as they are for now (Academy policy). Nothing is refunded or removed automatically — the Academy\'s Finance team reviews whether a refund applies and will contact you.';
const _admNB = SCREENS.admission;
SCREENS.admission = p => {
  const w = W; let h = _admNB(p); if (!w || !w.admission) return h;
  if (nbRejected(w)) h = h.replace(/<div class="b-act"><button class="btn btn-sm" data-act="reapply">Re-apply<\/button><\/div>/, `<p class="small nb-rej-next" style="margin-top:6px">${NB_REJ_NEXT} Next step: message the Academy if you have questions about this decision.</p><div class="b-act"><button class="btn btn-sm" data-go="messages">Message the Academy</button></div>`);
  return h + nbPastCard(w.nbPast);
};
const _gbNB = globalBanners;
globalBanners = function () {
  const h = _gbNB(); if (S.portal !== 'learner' || !nbRejected(W) || !['dashboard', 'courses'].includes(S.route)) return h;
  const b = banner('amber', 'alert', `<strong>Admission not approved.</strong> The Academy didn't approve your application for ${esc(W.nvq.title)}${nbRejectedAt(W) ? ` on ${fd(nbRejectedAt(W))}` : ''}. ${esc(NB_REJ_NEXT)}`, `<button class="btn btn-sm" data-go="admission">See the decision</button>`);
  return h ? h.replace('<div class="banners">', '<div class="banners">' + b) : `<div class="banners">${b}</div>`;
};

/* ---------- 6 Agency NVQ application: no approval without a fee option and a batch ---------- */
const NB_AGY_WHY = 'This agency NVQ application has no delivery (fee) option and no batch yet. The agency seat doesn\'t set them, and who chooses them is awaiting the Academy\'s policy. It can be approved once both are recorded; you can still review its documents, reject it or leave it open — nothing changed.';
const _whyNB = ac2AppWhy;
ac2AppWhy = function (a, act) { const why = _whyNB.apply(this, arguments); return why || act !== 'approve' || !a || !a.agySeat || (a.mode && a.batch) ? why : NB_AGY_WHY; };
const _apScrNB = SCREENS['a-admissions'];
SCREENS['a-admissions'] = p => {
  const h = _apScrNB(p), ap = p && p.id && (ADMIN.apps || []).find(x => x.id === p.id && x.agySeat);
  if (ap && !(ap.mode && ap.batch)) return h.replace('admission is never granted by the seat.', 'admission is never granted by the seat. <strong>Approval stays unavailable until a fee option and a batch are recorded.</strong>');
  const a = p && p.id && String(p.id).startsWith('APP-') ? allApplications().find(x => x.id === p.id) : null, w = a && a.v ? STORE.worlds[a.v] : null;
  return w && w.nbPast ? h + nbPastCard(w.nbPast) : h;
};

/* ---------- 7 Wording ---------- */
// Step 1: the assigned batch with its start and end dates, and why it was chosen
const _asgNB = chAssignedHtml;
chAssignedHtml = function (w) {
  const h = _asgNB.apply(this, arguments), b = w1WithW(w, () => chNearestFor(w)); if (!b) return h;
  return h.replace(`, starts ${fd(b.start)}</strong>`, `, starts ${fd(b.start)}, ends ${fd(b.end)}</strong>`)
    .replace(/The Academy assigns the nearest batch with a place: /, 'The Academy assigns the earliest batch with a place that takes your fee option: ');
};
// Completing the sign-up opens the programme; the admission decision is still to come
const _ccNB = chComplete;
chComplete = function () {
  const t = toast; toast = function (m) { arguments[0] = String(m).replace('You\'re in — your programme is open.', 'Sign-up complete — your programme is open. The Academy is still reviewing your application.'); return t.apply(this, arguments); };
  try { return _ccNB.apply(this, arguments); } finally { toast = t; }
};
// The learner's sign-up card: the admission decision and learning access, side by side
const NB_ADM_TONE = { Approved: 'green', Rejected: 'red', Withdrawn: 'grey' };
const _susNB = chSignupSummary;
chSignupSummary = function (w, who) {
  const h = _susNB.apply(this, arguments); if (who !== 'learner' || !w || !w.signup || !w.signup.done || !w.admission) return h;
  const st = w.admission.status, acc = w.nvq && w.nvq.status === 'Active' ? 'Open — since you finished sign-up; it doesn\'t wait for the admission decision' : (w.nvq && w.nvq.status) || '—';
  const dec = st === 'Approved' ? 'Approved' : st === 'Rejected' ? 'Not approved' : st === 'Withdrawn' ? 'Withdrawn' : `Not decided yet (${st})`;
  return h.replace('<dt>Offer letter</dt>', `<dt>Admission decision</dt><dd class="nb-adm">${chip(dec, NB_ADM_TONE[st] || 'amber')}</dd><dt>Learning access</dt><dd class="nb-acc">${esc(acc)}</dd><dt>Offer letter</dt>`);
};
// Approval dialog: the batch was assigned at sign-up; approval doesn't change it
const _approveNB = ACT.appApprove;
ACT.appApprove = el => {
  const m0 = MODAL, r = _approveNB(el);
  if (MODAL && MODAL !== m0 && typeof MODAL.body === 'string' && MODAL.body.includes('(assigned at sign-up — approval confirms it)')) { MODAL.body = MODAL.body.replace('(assigned at sign-up — approval confirms it)', '(assigned at sign-up by the Academy\'s batch rule — approval records the admission decision and doesn\'t change the batch; use Assign / change batch to move the learner)'); renderModal(); }
  return r;
};

/* ================= Records ================= */
UXC.push(['NB-1', 'NVQ enrolment and batch integrity (3 Nov 2026)', [
  'Starting, withdrawing or finishing an NVQ sign-up locks the NVQ programme only. Short courses, Payments, Calendar and every other enrolment keep their own status, expiry and pause rules.',
  'A sign-up withdrawn before it was completed can be followed by a new application from Browse Courses. The withdrawn one stays as a record (documents, offer letter, history; nothing was paid). Paid, seat-released or agency-sponsored sign-ups keep the existing refusal.',
  'Apply checks the batch rules first. If no batch can take the learner (for any fee option), nothing is created, reserved or charged and the learner is told to contact the Academy. The dialog shows each option\'s earliest batch, and an option with none can\'t be chosen.',
  'Sign-up allocation skips a batch with no Academic Coordinator. Before payment (and before an agency-sponsored start) the assigned batch is checked again: a batch that can no longer take learners is replaced by the next eligible one, or payment is refused with nothing charged.',
  'A rejected learner sees "Admission not approved" on the dashboard and the admission page, with the next step. Access, seat and payments stay as before (CH-12); Finance is notified as before.',
  'An agency NVQ application can\'t be approved until a fee option and a batch are recorded.',
  'Wording: Apply explains it creates an application; step 1 shows the batch\'s start and end dates; the sign-up card shows the admission decision and learning access separately; the approval dialog says approval doesn\'t change the batch.']]);
