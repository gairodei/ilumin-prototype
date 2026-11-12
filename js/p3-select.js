/* ============================================================
   P3 — Learner batch selection (11 Nov 2026; PD-P3-* in PROVISIONAL-DECISIONS.md, PD-P0-01 in
   P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p2-time.js (last), so every wrapper below is the outermost one.
   Before P3 the details step showed the batch CH-42 assigned (chNearest: the earliest online or same-country batch with a
   place, through the CR / W1 / NB-1 / L3-C filters), and three paths replaced it silently: a batch that filled before payment
   (ch-b7c), a batch that stopped taking learners (nb1-integrity) and a batch that started (l3c-enrol offered the next one).
   What this does:
   - One eligibility rule (p3Why): the learner's programme (programme ID where recorded), Open or Planned, not started, not
     starting today in the batch's time zone (U-05: the start moment isn't defined, so the same day fails closed), online or in the
     learner's country, a free place in the P1 seat ledger, an Academic Coordinator, the learner's fee option accepted (by ID),
     their delivery mode ready, their fixed programme version, and the payment wording they signed (L3-C / L3-C2).
   - Step 1 lists every eligible batch (earliest first, nothing preselected except the learner's own earlier choice) with its
     start, place, the learner's delivery mode, places left and the deposit position under the current provisional rule; the
     learner picks one. Batches that can't be chosen are listed with the reason. No eligible batch: nothing is created or moved.
   - The choice is stored on the sign-up (signup.p3, history in p3Hist); a batch recorded before P3 is kept and labelled as
     assigned before learner choice. Completed enrolments are never touched.
   - The choice is checked again on Save and continue, at the payment step, on Pay, when the payment dialog is confirmed and
     immediately before the seat is taken. When it no longer holds, the operation stops, the reason is shown and the learner
     chooses another batch — nothing is chosen for them. A payment that succeeded meanwhile goes to Finance review (P1 record),
     never charged twice, never refunded or credited automatically.
   - Cancellation needs an explicit outcome per learner (no default); moving a waitlist entry to another intake, and offering a
     place on a batch the learner didn't wait for, are refused (U-09, U-10 undecided).
   - Agency-sponsored sign-ups keep their existing behaviour (P8).
   ============================================================ */
'use strict';

const P3_SHUT = ['Cancelled', 'Completed', 'Archived'];
const p3Who = w => `${chFullName(w)} (${w.me.id})`;
const p3Open = w => !!(w && w.nvq && w.signup && !w.signup.done && !chSponsored(w));
// A batch carries its programme's title only: its programme ID is the one programme with that title (none or several → unknown)
const p3BatchPid = b => { const ps = s3Progs().filter(p => p.title === b.course); return ps.length === 1 ? ps[0].id : null; };
const p3Pid = w => (w && w.signup && w.signup.prog) || null;
// U-05: the batch's first local day counts as possibly commenced (fail closed); the zone is the batch's, or P2's labelled fallback
const p3SameDay = b => { try { const s = batchStartYmd(b); return !s || ymdCmp(ymdIn(now(), batchTz(b).tz), s) >= 0; } catch (e) { return true; } };
const p3Where = b => (chIsOnline(b) ? 'Online' : `${chBatchCountry(b)} · ${b.mode}`);
const p3ModeFor = (w, b) => { const o = r1OptOfW(w); return (o && o.mode) || n2ModeOf(b) || null; };

// Why batch b can't be chosen by this learner (null = it can). region: false skips the country rule: it applies when the learner picks a
// batch, not to a batch already recorded on the application (the Academy may have assigned it; NB-1 also leaves country out at payment)
// own: the application's own recorded batch — whether its signed payment wording still holds there is L3-C2's check (its payment-step
// card and refusals); for any other batch the wording must match the signed letter (L3-C / L3-C2: a new offer letter would be needed)
function p3Why(w, b, o = {}) {
  if (!b) return 'This batch no longer exists';
  try { mFreezeAll(); } catch (e) { /* lists are frozen when they first exist */ }
  const pid = p3Pid(w), bp = p3BatchPid(b);
  if (!w.nvq || b.course !== w.nvq.title || (pid && bp !== pid)) return 'A batch of another programme';
  if (!['Open', 'Planned'].includes(b.status)) return `The batch is ${b.status}`;
  if (chStarted(b)) return `Started on ${fd(b.start)}`;
  if (p3SameDay(b)) return `Starts today (${fd(b.start)}) — the exact start moment isn't defined yet, so a batch can't be joined on its first day`;
  if (o.region !== false && !(chIsOnline(b) || chBatchCountry(b) === w.me.country)) return `Runs in ${chBatchCountry(b)} — not open to learners in ${w.me.country}`;
  if (!seatHolds(w.me.id, b) && seatFree(b) <= 0) return 'Full';
  if (!nbStaffed(b)) return 'No Academic Coordinator yet';
  const op = r1OptOfW(w); if (op && !w1Accepts(b, op.id)) return `Doesn't take your fee option (${op.label || op.id})`;
  if (!nbBatchOk(w, b)) return 'Your delivery mode isn\'t open for enrolment on this batch yet';
  if (w.nvq.s3Pinned && b.progVersion && b.progVersion !== w.nvq.progVersion) return `Runs programme version ${b.progVersion}; yours is version ${w.nvq.progVersion}`;
  return o.own ? null : l3cWhyNot(w, b) || null;
}
const p3Cands = w => ADMIN.batches.filter(b => w.nvq && b.course === w.nvq.title && !P3_SHUT.includes(b.status)).sort((x, y) => new Date(x.start) - new Date(y.start));
const p3Eligible = w => p3Cands(w).filter(b => !p3Why(w, b));
// The learner's current choice, checked again (an Academy-assigned batch keeps its country exemption)
const p3CurWhy = w => { const s = w.signup, b = s.batch && chBatch(s.batch); return !s.batch ? 'No batch has been chosen' : p3Why(w, b, { region: false, own: true }); };

/* ---------- What each option shows ---------- */
function p3DepTxt(w, b) {
  if (w.signup.noDeposit) return 'No deposit — signing up again is by instalments only.';
  if (typeof e2Off === 'function' && e2Off(w)) return 'No deposit — there is no deposit option for this programme.';
  return chDepositOk(b) ? 'Deposit available under the current provisional rule (the batch starts in 28 days or more). The deposit rules are not final.' : 'No deposit — under the current provisional rule a deposit needs the batch to start in 28 days or more.';
}
function p3OptHtml(w, b, pick, name) {
  const n = seatFree(b), m = p3ModeFor(w, b);
  return `<label class="check ch-intake p3-opt"><input type="radio" name="${name}" value="${esc(b.code)}" ${pick === b.code ? 'checked' : ''} data-onchange="${name === 'su-batch' ? 'suBatch' : 'p3Pick'}"><span><strong>${esc(b.label || b.code)}</strong> <span class="mono xs">${esc(b.code)}</span><br>
    <span class="small">Starts ${fd(b.start)} · ${esc(p3Where(b))}${m ? ` · Your delivery mode: ${esc(m)}` : ''} · ${n} ${n === 1 ? 'place' : 'places'} left</span><br><span class="xs muted p3-dep">${esc(p3DepTxt(w, b))}</span></span></label>`;
}
const p3NoList = rows => rows.length ? `<details class="small p3-no"><summary>Batches you can't choose (${rows.length})</summary><ul>${rows.map(([b, y]) => `<li>${esc(b.label || b.code)} <span class="mono xs">${esc(b.code)}</span> — ${esc(y)}</li>`).join('')}</ul></details>` : '';
function p3Html(w) {
  const s = w.signup, all = p3Cands(w).map(b => [b, p3Why(w, b, { region: b.code !== s.batch, own: b.code === s.batch })]), ok = all.filter(x => !x[1]), no = all.filter(x => x[1]);
  const own = s.batch && ok.some(([b]) => b.code === s.batch) ? s.batch : null, pick = ui('suBatch', null) || own, err = ui('p3Err', '');
  const was = s.batch && !own ? chBatch(s.batch) : null;
  const note = s.batch && !s.p3 && own ? `<p class="xs muted p3-hist">${esc(s.batch)} was assigned to your application before you could choose a batch. You can keep it or choose another.</p>` : '';
  const gone = was ? `<div class="note b-amber p3-was" role="status">${ic('alert')}<div class="small"><strong>${esc(chBatchLbl(was))} can't take you now:</strong> ${esc(p3Why(w, was, { region: false, own: true }) || '')}. Choose another batch.</div></div>` : '';
  if (!ok.length) return `<section class="stack ch-batch p3-pick"><h3 class="small">Your batch</h3>${gone}<div class="note b-amber p3-none" role="alert">${ic('alert')}<div class="small"><strong>No batch of ${esc(w.nvq.title)} can take you at the moment.</strong> Nothing has been created or charged, and your details are kept. Contact the Academy and we'll tell you when one opens: ${academyContact()}</div></div>${p3NoList(no)}</section>`;
  return `<section class="stack ch-batch p3-pick"><fieldset class="stack ch-intakes"><legend class="lbl">Choose your batch</legend>${gone}
    <p class="xs muted">Every batch you can join is listed, earliest first. The Academy doesn't choose one for you.</p>${ok.map(([b]) => p3OptHtml(w, b, pick, 'su-batch')).join('')}${note}
    ${err ? `<p class="err small p3-err" role="alert">${esc(err)}</p>` : ''}</fieldset>${p3NoList(no)}<p class="small">Need a different start date? Contact the Academy: ${academyContact()}</p></section>`;
}
const _detP3 = chStepDetails;
chStepDetails = function (w) { const h = _detP3.apply(this, arguments); return p3Open(w) ? h.replace(/<section class="stack ch-batch">[\s\S]*?<\/section>/, () => p3Html(w)) : h; };
const _inBatchP3 = INP.suBatch;
INP.suBatch = el => { setUi('p3Err', ''); return _inBatchP3(el); };

/* ---------- Save and continue: only an eligible batch the learner chose (or kept) ---------- */
function p3Record(w, code, how) {
  const s = w.signup, from = s.p3 ? s.p3.code : s.batch || null, at = now().toISOString();
  if (s.p3 && s.p3.code === code && s.p3.how === how) return;
  s.p3 = { code, how, at, by: 'Learner' }; (s.p3Hist = s.p3Hist || []).push({ from, to: code, how, at });
  logA('Admissions', p3Who(w), 'Batch chosen at sign-up', from || '—', code, how);
}
const _nextP3 = ACT.suNext;
ACT.suNext = function () {
  const w = W, s = w && w.signup;
  if (!p3Open(w) || chStepKey(w) !== 'details') return _nextP3.apply(this, arguments);
  const picked = ui('suBatch', null), code = picked || s.batch, b = code && chBatch(code);
  if (!code) { setUi('p3Err', 'Choose a batch to continue.'); render(); toast('Choose a batch to continue.', 'err'); return false; }
  const why = p3Why(w, b, { region: !!picked && code !== s.batch, own: code === s.batch });
  if (why) { logA('Admissions', p3Who(w), 'Blocked: choose batch', code, '—', why); setUi('suBatch', null); setUi('p3Err', `${code} can't be chosen: ${why}. Choose another batch.`); render(); toast(`${code} can't be chosen: ${why}. Choose another batch.`, 'err'); return false; }
  const step0 = s.step, keep = chNearest; chNearest = function () { return b; }; // CH-42's assignment inside the older handlers takes the learner's batch
  let r; try { r = _nextP3.apply(this, arguments); } finally { chNearest = keep; }
  if (s.step !== step0 && s.batch === b.code) {
    const how = picked ? 'Chosen by the learner' : s.p3 && s.p3.code === b.code ? s.p3.how : 'Kept — assigned before learner batch choice';
    const h = w.admission.history[w.admission.history.length - 1]; if (h && /^Details (and intake )?confirmed/.test(h[0])) h[0] = `Details confirmed — batch ${picked ? 'chosen' : 'kept'} (${b.code})`;
    p3Record(w, b.code, how); setUi('suBatch', null); setUi('p3Err', '');
  }
  return r;
};

/* ---------- Payment step: the choice is checked again; nothing is reassigned ---------- */
function p3Card(w, why) {
  const s = w.signup, b = s.batch && chBatch(s.batch), ok = p3Eligible(w).filter(x => x.code !== s.batch), no = p3Cands(w).filter(x => x.code !== s.batch).map(x => [x, p3Why(w, x)]).filter(x => x[1]);
  const head = !b ? '<strong>No batch is chosen for your application.</strong>' : chStarted(b) ? `<strong>${esc(chBatchLbl(b))} started on ${fd(b.start)}, before you paid.</strong>` : why === 'Full' ? (ok.length ? `<strong>${esc(chBatchLbl(b))} is now full.</strong> Its last place went before you paid.` : `<strong>${esc(chBatchLbl(b))} is now full and no other batch has a place.</strong>`) : `<strong>${esc(chBatchLbl(b))} can't take you now:</strong> ${esc(why)}.`;
  const pick = ui('p3Re', null);
  const next = ok.length ? `<fieldset class="stack ch-intakes"><legend class="lbl">Choose another batch</legend>${ok.map(x => p3OptHtml(w, x, pick, 'p3-re')).join('')}</fieldset><div class="row"><button class="btn btn-primary" data-act="p3Rechoose">Choose this batch</button></div>`
    : `<p class="small p3-none"><strong>No batch of this programme that hasn't started can take you at the moment.</strong> The Academy will tell you when one opens, or you can withdraw your application. Contact the Academy: ${academyContact()}</p>`;
  return `<section class="card p3-gone"><h2>4. Payment</h2><div class="note b-amber" role="alert">${ic('alert')}<div class="small">${head} Nothing has been charged and you haven't been moved. Your details, documents, fee option and signed offer letter are kept. The Academy doesn't choose another batch for you.</div></div>${next}${p3NoList(no)}${chNav(w, '')}</section>`;
}
const _payP3 = chStepPay;
chStepPay = function (w) { if (!p3Open(w) || seatReviewOf(w)) return _payP3.apply(this, arguments); const why = p3CurWhy(w); return why ? p3Card(w, why) : _payP3.apply(this, arguments); };
INP.p3Pick = el => { setUi('p3Re', el.value); };
const p3Assign = (w, nb) => {
  const s = w.signup, from = s.batch || null, at = now().toISOString();
  chSetBatch(w, nb); s.moved = null; delete s.l3cPin; delete s.l3c2Held;
  w.admission.history.push([`Batch chosen again before payment: ${from || '—'} → ${nb.code}`, at]);
  p3Record(w, nb.code, `Chosen by the learner (${from || 'no batch'} could no longer take them)`);
  notifyLearner(w.v, 'Admission', 'Your batch choice is saved', `Your application is now for ${nb.label || nb.code}, starting ${fd(nb.start)}. Your fee option, documents and signed offer letter don't change. Nothing has been charged.`, 'admission');
};
// The learner chooses another batch (only from the payment step's list; checked again when confirmed). L3-C's single-batch
// "Move my application" uses the same rule, so it can no longer move to a batch the learner didn't pick.
ACT.p3Rechoose = el => {
  const w = W, code = (el && el.dataset && el.dataset.b) || ui('p3Re', null);
  if (S.portal !== 'learner' || !p3Open(w) || seatReviewOf(w) || !p3CurWhy(w)) { toast('There is nothing to change.', 'info'); return false; }
  if (!code) { toast('Choose a batch first.', 'err'); return false; }
  const nb = chBatch(code), why = code === w.signup.batch ? 'It is the batch that can\'t take you' : p3Why(w, nb);
  if (why) { logA('Admissions', p3Who(w), 'Blocked: choose batch', code, '—', why); setUi('p3Re', null); render(); toast(`${code} can't be chosen: ${why}.`, 'err'); return false; }
  openModal({ title: `Choose ${esc(nb.label || nb.code)}?`, body: `<p class="small">${esc(nb.label || nb.code)} <span class="mono xs">${esc(nb.code)}</span> starts ${fd(nb.start)}. Your fee option, documents and signed offer letter don't change, and nothing is charged until you pay.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Choose this batch', cls: 'btn-primary', fn: () => { const y = p3Open(w) && !seatReviewOf(w) && p3CurWhy(w) ? p3Why(w, chBatch(code)) : 'Nothing to change'; if (y) { logA('Admissions', p3Who(w), 'Blocked: choose batch', code, '—', y); toast(`${code} can't be chosen now: ${y}.`, 'err'); render(); return false; } p3Assign(w, chBatch(code)); setUi('p3Re', null); render(); toast(`Your application is now for ${nb.label || nb.code}.`); } }] });
};
ACT.l3cTake = el => ACT.p3Rechoose(el);

/* ---------- Pay, the payment dialog and the seat itself: the same check ---------- */
const p3Stop = (w, what, why) => { const s = w.signup; logA('Admissions', p3Who(w), `Blocked: ${what} (chosen batch unavailable)`, s.batch || '—', '—', `${why} — nothing charged; the learner chooses another batch`); render(); toast(`${s.batch || 'Your batch'} can't take you now (${why}) — nothing was charged. Choose another batch on the payment step.`, 'err'); return false; };
// Capacity keeps its own handlers (FI-2 at Pay and checkout, P1's Finance review at completion); P3 adds every other reason
const p3StopWhy = w => { if (!p3Open(w) || seatReviewOf(w)) return null; const y = p3CurWhy(w); return y && y !== 'Full' ? y : null; };
const _suPayP3 = ACT.suPay;
ACT.suPay = function () {
  const w = W, y = p3StopWhy(w); if (y) return p3Stop(w, 'pay for the sign-up', y);
  const m0 = MODAL, r = _suPayP3.apply(this, arguments), a = MODAL && MODAL !== m0 && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && !a._p3) { const f = a.fn; a._p3 = true; a.fn = function () { const z = p3StopWhy(w); if (z) { closeModal(); return p3Stop(w, 'pay for the sign-up', z); } return f.apply(this, arguments); }; }
  return r;
};
function p3Unmatched(w, b, o, why) { // a payment that succeeded for a batch that can no longer take the learner: Finance review (P1 record)
  const L = SEATS(), at = now().toISOString(), ref = o && o.ref, amount = +(o && o.amount) || 0, tx = (w.tx || []).find(t => t.ref === ref), code = b ? b.code : '—';
  const u = { id: 'SPR-' + String(++L.umSeq).padStart(4, '0'), v: w.v, lid: w.me.id, name: chFullName(w), batch: code, ref: ref || '—', amount, at, method: tx ? tx.method : 'Card', state: 'Finance review', why: `${code} could no longer take the learner when the payment completed: ${why}` };
  L.unmatched.unshift(u); if (tx) tx.seatReview = u.id;
  if (STORE.fin && STORE.fin.notifs) STORE.fin.notifs.unshift({ to: 'all', t: 'Payment received for a batch that can\'t take the learner — Finance review', b: `${u.name} · ${money(amount, 'GBP')} (${u.ref}) — ${why}; no seat, sign-up not completed`, at, go: 'f-exceptions', unread: true });
  logA('Finance', `${u.name} (${u.lid})`, 'Payment received for a batch that can\'t take the learner', '—', 'Finance review — no seat taken', `${u.id}: ${why}`);
  w.admission.history.push([`Payment ${u.ref} received — ${code} could no longer take the learner; Finance review`, at]);
  notifyLearner(w.v, 'Payments', 'Your payment is being reviewed', `${code} could no longer take you when your payment of ${money(amount, 'GBP')} completed (${why}). Your sign-up isn't complete and you haven't been moved. Finance will review the payment and contact you.`, 'admission');
  if (MODAL) closeModal();
  toast(`Your payment of ${money(amount, 'GBP')} was received, but ${code} could no longer take you (${why}). Your sign-up isn't complete — Finance will review the payment and contact you.`, 'err');
  return false;
}
const _ccP3 = chComplete;
chComplete = function (w, o, fromCheckout, quiet) {
  if (!quiet) { const y = p3StopWhy(w); if (y) { if (fromCheckout) return p3Unmatched(w, chBatch(w.signup.batch), o, y); logA('Admissions', p3Who(w), 'Blocked: complete sign-up (chosen batch unavailable)', w.signup.batch || '—', 'No change', y); toast(`${w.signup.batch || 'Your batch'} can't take you now (${y}) — nothing was charged. Choose another batch on the payment step.`, 'err'); render(); return false; } }
  return _ccP3.apply(this, arguments);
};

/* ---------- Apply and the details step: wording; CH-42's own search skips a batch starting today ---------- */
const _nearP3 = chNearest;
chNearest = function (course, country, exclude) { return _nearP3.call(this, course, country, (exclude || []).concat(chUpcoming(course).filter(p3SameDay).map(b => b.code))); };
const _applyP3 = ACT.applyNvq;
ACT.applyNvq = function () {
  const r = _applyP3.apply(this, arguments);
  if (MODAL && /^Sign up for /.test(MODAL.title || '')) { const b0 = MODAL.body; MODAL.body = b0.replace('your details (we assign your batch)', 'your details and your batch (you choose it)').replace('The Academy assigns the earliest batch with a place that takes your fee option', 'In step 1 you choose your batch from those that can take your fee option — none is assigned for you'); if (MODAL.body !== b0) renderModal(); }
  return r;
};
const _itemP3 = chSignupItem;
chSignupItem = function () { const it = _itemP3.apply(this, arguments); it.d = String(it.d).replace('Check your details and see your batch.', 'Check your details and choose your batch.'); return it; };
const _startP3 = ch8StartSignup;
ch8StartSignup = function () { setUi('suBatch', null); setUi('p3Err', ''); setUi('p3Re', null); return _startP3.apply(this, arguments); };
// Admissions and Learner 360: how the batch was set
const _susP3 = chSignupSummary;
chSignupSummary = function (w) {
  const h = _susP3.apply(this, arguments), s = w && w.signup; if (!s || !s.batch || chSponsored(w)) return h;
  const t = s.p3 && s.p3.code === s.batch ? `${s.p3.how} · ${fdt(s.p3.at)}` : s.l3cPin === s.batch ? 'Assigned by the Academy' : 'Assigned automatically before learner batch choice (historical)';
  return h.replace(/(<dt>Batch<\/dt><dd>[\s\S]*?)(<\/dd>)/, `$1<div class="xs muted p3-how">${esc(t)}</div>$2`);
};

/* ---------- Cancellation (U-09) and waitlists (U-10): no default outcome, no move the learner didn't choose ---------- */
const _cancelP3 = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), r = _cancelP3(el), act = b && MODAL && /^Cancel batch/.test(MODAL.title || '') && MODAL.actions.find(x => /danger|primary/.test(x.cls || ''));
  if (!act || act._p3) return r;
  if (/class="select cb-d"/.test(MODAL.body || '') && !/<option value="">/.test(MODAL.body)) { MODAL.body = MODAL.body.replace(/(<select class="select cb-d"[^>]*>)/g, '$1<option value="" selected>Choose…</option>'); renderModal(); }
  const f = act.fn; act._p3 = true;
  act.fn = function () {
    const miss = $$('#modal-root .cb-d').filter(s => !s.value);
    if (miss.length) { logA('Batches', `${b.label || b.code} (${b.code})`, 'Blocked: cancel batch (outcome not chosen)', b.status, 'No change', `${miss.length} learner(s) without an outcome`); toast(`Choose an outcome for every learner (${miss.length} without one) — nobody is moved or refunded by default. Nothing was cancelled.`, 'err'); return false; }
    return f.apply(this, arguments);
  };
  return r;
};
const P3_WL = 'Moving a waitlisted learner to another intake isn\'t available: learners choose their own batch, and the waitlist policy under batch choice hasn\'t been decided. Nothing changed.';
// The existing role, programme-status and fee-option checks run first (their refusals and logs are unchanged); where the move
// would otherwise go ahead, its dialog is not offered
const _intakeP3 = ACT.kNextIntake;
ACT.kNextIntake = el => { const m0 = MODAL, r = _intakeP3(el); if (!MODAL || MODAL === m0) return r; closeModal(); const b = chBatch(el && el.dataset && el.dataset.id); logA('Batches', b ? `${b.label || b.code} (${b.code})` : 'Batches', 'Blocked: move waitlisted learner to next intake', b ? b.code : '—', 'No change', (el && el.dataset && el.dataset.n) || '—'); toast(P3_WL, 'err'); return false; };
const _offerP3 = ACT.kOffer;
ACT.kOffer = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), x = b && el.dataset.w1 ? (b.w1wait || []).find(y => y.id === el.dataset.w1) : null;
  if (x && x.from) { logA('Batches', `${b.label || b.code} (${b.code})`, 'Blocked: offer waitlist place (batch not chosen by the learner)', x.from, b.code, x.name); toast(`${x.name} was moved here from ${x.from}'s waitlist — they didn't choose ${b.code}, so a place here can't be offered. Nothing changed.`, 'err'); return false; }
  return _offerP3(el);
};

UXC.push(['P3', 'Learners choose their batch (11 Nov 2026)', [
  'Sign-up step 1 lists every batch the learner can join — their programme, fee option and delivery mode, a free place, not started, online or in their country — earliest first, with places left and the deposit position under the current rule. The learner picks one; nothing is chosen for them.',
  'The choice is checked again before payment, when the payment is confirmed and before the seat is taken. If the batch can no longer take them, nothing is charged or moved and they choose another batch. A payment that completed meanwhile goes to Finance review.',
  'Batches starting today can\'t be joined until the exact start moment is decided. Cancelling a batch needs an explicit outcome for every learner; moving a waitlisted learner to another intake is not available until the waitlist policy is decided.']]);
