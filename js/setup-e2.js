/* ============================================================
   E2 — programme-level deposit configuration (confirmed requirement, 20 Oct 2026; PD-E2-* in PROVISIONAL-DECISIONS.md).
   Every NVQ programme's payment plan says whether it offers a deposit: not available (depOff), the Academy default (deposit
   null — the existing inheritance), or a custom amount (above £0, whole pence, below every fee of the programme, every Level 3
   option included). The choice is part of the payment terms: the creator proposes it, a Finance Admin approves it (CR-E1-01),
   Finance and the Super Administrator set it in their editors, and it is versioned and snapshotted like the rest of the plan.
   The plan model, the forms, the payment summary and Finance's review are in setup-s4a.js / setup-e1.js; this file covers what
   the learner is offered, the guard against forcing a deposit, and new plan versions when the Academy default changes.
   The deposit route itself is unchanged: a separate route credited against the fee, one balance row within the configurable
   seat hold (part payments as the plan allows), eligibility only when the batch starts in 28 days or more, seat release and
   deposit retention as before. Learners keep the terms pinned when their sign-up started. Loads after setup-e1.js.
   ============================================================ */
'use strict';

// "deposit £300.00 (when your batch starts in 28 days or more) or " — or, for a programme without a deposit, a plain statement
const e2DepOr = (t, cap) => (t && t.depOff ? `${cap ? 'No' : 'no'} deposit for this programme. ` : `${cap ? 'Deposit' : 'deposit'} ${money(t ? t.deposit : S4().cfg.deposit, 'GBP')} (when your batch starts in ${CH_HOLD_DAYS} days or more) or `);
// The learner's own (pinned) terms say whether a deposit is offered at all
const e2Off = w => !!(w && w.signup && w.signup.plan && w.signup.plan.depOff);
const e2NonDep = (w, c) => (c && c !== 'deposit' ? c : e1PayMeth(w) === 'one-time' ? 'full' : 'instalment');
const E2_NODEP = `<div class="note b-grey ch-nodep e2-nodep">${ic('info')}<div class="small"><strong>No deposit for this programme.</strong> This programme doesn't offer a deposit, so you pay in full or by instalments — whenever your batch starts.</div></div>`;

/* ---------- Learner payment step: no deposit route at all (not "ineligible": that stays the 28-day message) ---------- */
const _stepPayE2 = chStepPay;
chStepPay = function (w) {
  if (!e2Off(w) || chSponsored(w)) return _stepPayE2.apply(this, arguments);
  setUi('suOpt', e2NonDep(w, ui('suOpt', undefined)));
  const h = _stepPayE2.apply(this, arguments);
  if (!/name="su-opt"/.test(h)) return h; // a full batch, or nothing to pay: no choice to show
  return h.replace(/<label class="check"><input type="radio" name="su-opt" value="deposit"[\s\S]*?<\/label>/, '').replace(/<div class="note b-grey ch-nodep[^"]*">[\s\S]*?<\/div><\/div>/g, '')
    .replace('<legend class="lbl">How do you want to pay?</legend>', `<legend class="lbl">How do you want to pay?</legend>${E2_NODEP}`);
};
// Stale UI state ("deposit" chosen before, or the default choice) never reaches checkout
const _suPayE2 = ACT.suPay;
ACT.suPay = el => { if (W && W.signup && e2Off(W)) setUi('suOpt', e2NonDep(W, ui('suOpt', undefined))); return _suPayE2(el); };
// The last line of defence: a deposit can't complete a sign-up whose terms have no deposit (direct calls, a stale checkout)
const _ccE2 = chComplete;
chComplete = function (w, o) {
  if (w && o && o.opt === 'deposit' && e2Off(w)) {
    logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Blocked: deposit not offered', '—', '—', 'This programme has no deposit route (E2)');
    if (!arguments[3]) { if (MODAL) closeModal(); toast('This programme doesn\'t offer a deposit. Choose another way to pay.', 'err'); render(); }
    return;
  }
  return _ccE2.apply(this, arguments);
};
// Step 1's batch card states what the programme offers
const _stepDetE2 = chStepDetails;
chStepDetails = function (w) {
  const h = _stepDetE2.apply(this, arguments); if (!e2Off(w)) return h;
  return h.replace('a deposit can hold your seat', 'no deposit option for this programme').replace('starts in under 28 days — instalments only', 'no deposit option for this programme');
};

/* ---------- Academy default changes: new versions, never a changed approved version ----------
   A programme in force that uses the Academy default gets a new plan version with the same terms (and its own frozen schedule
   snapshot, now with the new amount), so no approved version or snapshot is altered. Custom and no-deposit programmes are not
   touched. A programme whose terms aren't approved yet (Draft, waiting for Finance, changes requested) gets no version: it takes
   the default in force when it is approved, and a proposal submitted with the old amount can't be approved unchanged (E1-R). */
// Returns what it did, for the configuration audit entry: the new versions, and the proposals waiting for Finance that must be resubmitted
function e2DefaultChanged(d0, d1, r) {
  const made = [], waiting = [];
  s4PlanProgs().forEach(pr => {
    const cur = s4PlanCur(pr.id); if (!cur || cur.depOff || cur.deposit != null || !(cur.fee > 0)) return;
    const T = typeof e1T === 'function' ? e1T(pr.id) : null;
    if (T && T.status === 'Pending' && T.prop && !T.prop.depOff && T.prop.dep == null) waiting.push(`${pr.title} (${T.qid})`);
    if (typeof e1Ok === 'function' && !e1Ok(pr)) return;
    const why = s4PlanSave(pr, { fee: cur.fee, deposit: null, depOff: false, inst: cur.inst, partial: cur.partial, meth: cur.meth }, `Academy default deposit changed from ${money(d0, 'GBP')} to ${money(d1, 'GBP')}: new version, same terms (${r})`, { action: 'New version — Academy default deposit changed' });
    if (!why) made.push(`${pr.title} v${s4PlanLast(pr.id).v}`);
  });
  return { made, waiting };
}
// The configuration audit entry lists the programmes affected (actor and time are the audit entry's own)
const e2AffTxt = a => (a ? ` · new plan versions: ${a.made.length ? a.made.join(', ') : 'none'}${a.waiting.length ? ` · waiting for Finance with the old default (to be resubmitted): ${a.waiting.join(', ')}` : ''}` : '');
// Finance's item says when a proposal that uses the default was submitted with an amount that is no longer the default
const _qdE2 = queueDetail;
queueDetail = function (id) {
  const h = _qdE2.apply(this, arguments), i = qItem(id), s = i && i.type === 'Programme payment terms' && i.data && i.data.sched;
  if (!s || s.depOff || s.depOwn || s.deposit === S4().cfg.deposit || !isOpen(i)) return h;
  return h.replace('<h3>Proposed payment schedule</h3>', `<div class="note b-amber e2-stale" role="status">${ic('alert')}<div class="small"><strong>The Academy default deposit changed after submission</strong> (${money(s.deposit, 'GBP')} when submitted, ${money(S4().cfg.deposit, 'GBP')} now). These terms can't be approved as submitted — request changes so the creator resubmits them with the current default.</div></div><h3>Proposed payment schedule</h3>`);
};

/* ---------- Offer letters: an opt-in {{payment_terms}} merge field ----------
   The letter text is the client's versioned template; E2 changes no version and no signed letter. A letter version whose text uses
   {{payment_terms}} gets the payment wording from the applicant's pinned terms and assigned batch: only the routes their programme
   permits (one payment, instalments, or both) and the deposit only when it is offered and their batch is eligible. The wording is
   kept with the signature, so a signed letter never changes. Where a version's fixed text contradicts its programme's terms (it
   mentions a deposit the programme doesn't offer, or instalments on a one-payment plan) the Offer letter tab and the Review warn. */
function e2PayTxt(t, depOk) {
  if (!t || t.issue || !(t.fee > 0)) return 'pay as set out in your payment plan';
  const m = e1MethOf(t), o = [];
  if (depOk && !t.depOff && t.deposit > 0) o.push(`a deposit of ${money(t.deposit, 'GBP')}`);
  if (m !== 'instalments') o.push(`the full programme fee of ${money(t.fee, 'GBP')}`);
  if (m !== 'one-time') o.push(`the first of your ${t.inst} monthly instalments (${money(e1First(t.fee, t.inst), 'GBP')})`);
  return 'pay ' + (o.length > 1 ? `${o.slice(0, -1).join(', ')} or ${o[o.length - 1]}` : o[0]);
}
function e2PayTerms(w) {
  if (!w || !w.signup) return 'pay as set out in your payment plan';
  if (chSponsored(w)) return `complete your sign-up (your fees are covered by ${w.me.sponsor || 'your sponsor'})`;
  return e2PayTxt(w.signup.plan, chDepositOk(chBatch(w.signup.batch)) && !w.signup.noDeposit);
}
let E2_LETTER = null; // the applicant (or the sample wording) a letter is being shown for
const _letterHtmlE2 = chLetterHtml;
chLetterHtml = function (letter, o = {}) {
  const h = _letterHtmlE2.apply(this, arguments); if (!/\{\{payment_terms\}\}/.test(h)) return h;
  if (o.raw) return h.replace(/\{\{payment_terms\}\}/g, '<span class="ch-merge">{{payment_terms}}</span>');
  const pay = E2_LETTER && E2_LETTER.pay != null ? E2_LETTER.pay : e2PayTerms(E2_LETTER && E2_LETTER.w);
  return h.replace(/\{\{payment_terms\}\}/g, esc(pay));
};
const e2With = (ctx, f) => { const k = E2_LETTER; E2_LETTER = ctx; try { return f(); } finally { E2_LETTER = k; } };
const _stepLetterE2 = chStepLetter; chStepLetter = function (w) { return e2With({ w }, () => _stepLetterE2.apply(this, arguments)); };
// Signing keeps the payment wording the applicant saw with the snapshot of the signed text
const _signE2 = ACT.suSign;
ACT.suSign = el => {
  const w = W, had = w && w.signup && w.signup.sig, r = _signE2(el), s = w && w.signup && w.signup.sig;
  if (s && s !== had && s.snapshot && !('pay' in s.snapshot)) s.snapshot = Object.freeze({ ...s.snapshot, pay: e2PayTerms(w) });
  return r;
};
const _signedPdfE2 = ACT.chSignedPdf;
ACT.chSignedPdf = el => { const w = chW(el.dataset.v), s = w && w.signup && w.signup.sig; return e2With({ w, pay: s && s.snapshot && 'pay' in s.snapshot ? s.snapshot.pay : null }, () => _signedPdfE2(el)); };
// Previews use a sample applicant whose batch is eligible for any deposit the programme offers
const e2Sample = pid => ({ pay: e2PayTxt(s4TermsOf(pid), true) });
const _prevE2 = ACT.chLetterPrev; ACT.chLetterPrev = el => e2With(e2Sample(el.dataset.id), () => _prevE2(el));
const _prevE2b = ACT.s4LetterPrev; ACT.s4LetterPrev = el => e2With(e2Sample(el.dataset.id), () => _prevE2b(el));
// The letter's fixed wording against the programme's payment terms (a warning only — the client decides the letter text)
function e2LetterClash(pid) {
  const L = chLetterCur(pid), p = s4PlanCur(pid); if (!L || !p) return '';
  const txt = (L.text || []).join(' '); if (/\{\{payment_terms\}\}/.test(txt)) return '';
  if (p.depOff && /deposit/i.test(txt)) return `Offer letter version ${L.v} says "deposit", but this programme doesn't offer a deposit`;
  if (e1MethOf(p) === 'one-time' && /instalment/i.test(txt)) return `Offer letter version ${L.v} says "instalment", but this programme is paid in one payment`;
  return '';
}
const _letterTabE2 = chLetterTab;
chLetterTab = function (pr) {
  const h = _letterTabE2.apply(this, arguments), why = pr && e2LetterClash(pr.id); if (!why) return h;
  return h.replace('<dl class="kv"><dt>Current version</dt>', `<div class="note b-amber e2-letter-clash" role="status">${ic('alert')}<div class="small"><strong>Check the payment wording.</strong> ${esc(why)}. The letter text is the client's and isn't changed automatically. To match the programme, upload a new version that uses <span class="ch-merge">{{payment_terms}}</span> (the payment routes this applicant is offered). Letters already signed don't change.</div></div><dl class="kv"><dt>Current version</dt>`);
};
const _checkE2 = ch8Check;
ch8Check = function (pr) { const r = _checkE2.apply(this, arguments), why = pr && e2LetterClash(pr.id); if (why && r && r.warn) r.warn.push(why + ' — check the offer letter'); return r; };

/* ---------- Records ---------- */
UXC.push(['E2', 'Programme-level deposit configuration (confirmed 20 Oct 2026)', [
  'Every NVQ programme\'s Payment plan has exactly three deposit choices: "Deposit not available", "Use Academy default deposit" (shows the current default, £300 in the demo data — never copied into the programme) and "Set a custom deposit amount for this programme" (a GBP field, shown only for this choice: above £0, whole pence, below every fee of the programme — every Level 3 fee option included). Used in the New programme Payment plan step (the creator\'s proposal), Finance\'s own plan step save, and Finance → Payment Plans "Edit plan".',
  'The deposit setting is part of the payment terms Finance reviews (CR-E1-01): the queue item shows "Deposit not available / Use Academy default deposit / Set a custom deposit amount" with the amount; the frozen schedule snapshot records it; approval is refused if it changed after submission. No separate deposit approval. A Draft programme still can\'t be published until its terms are approved; D8, G4, the no-escalation rule and notification idempotence are unchanged.',
  'Learners: with no deposit, the payment step shows "No deposit for this programme" (distinct from the 28-day "No deposit for this batch / intake" message), offers only pay in full and/or instalments, and the sign-up dialogs and batch card say so. A deposit can\'t be forced — stale UI state is reset before checkout and chComplete refuses a deposit for terms without one (logged "Blocked: deposit not offered").',
  'Academy default changes: programmes in force that use the default get a new plan version with the same terms and a fresh schedule snapshot ("New version — Academy default deposit changed"); approved versions and snapshots are never altered. Custom and no-deposit programmes are unaffected; the default must stay below every fee (every Level 3 option) of the programmes using it. Programmes whose terms aren\'t approved yet take the default in force at approval.',
  'Offer letters (E2 review): the letter text is the client\'s versioned template and isn\'t changed. A new opt-in merge field {{payment_terms}} gives the payment wording from the applicant\'s pinned terms and batch — only the permitted routes ("pay the full programme fee of £x", "the first of your 6 monthly instalments (£x)", or both) and "a deposit of £x" only when offered and the batch is eligible; it is kept with the signed snapshot. A version whose fixed text mentions a deposit the programme doesn\'t offer (or instalments on a one-payment plan) is flagged on the Offer letter tab and in the Review. No existing or signed letter changes. Academy default changes: the System Configuration audit entry lists the new plan versions and any proposals waiting for Finance with the old default; Finance\'s item for such a proposal says it must be resubmitted.',
  'Unchanged: the deposit route (separate, credited against the fee, one balance row within the 1–28-day seat hold, part payments as the plan allows), eligibility at 28 days, seat release and deposit retention, and every learner\'s pinned terms, deposit and payment rows. Plan history shows "no deposit", "custom deposit £x" or "Academy default deposit (£x at this version)".']]);
const _aIdxE2 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxE2(p) + `<section class="card idx-sec"><h2>Enhancement E2</h2><ul class="idx-list">${[
  chIdxLi('New programme → Payment plan step (deposit choice)', { act: 'aJump', t: 'a-programmes.NV-N1.plan' }, 'E2 — deposit not available, the Academy default, or a custom amount; part of the terms Finance approves.'),
  chIdxLi('Finance → Payment Plans — Edit plan (deposit choice)', { act: 'aJump', t: 'f-plans' }, 'E2 — the same three choices in Finance\'s own editor.')].join('')}</ul></section>`;
