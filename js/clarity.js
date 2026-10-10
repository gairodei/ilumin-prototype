/* ============================================================
   UX polish v2 — Phase 4: clarity and language.
   Wording only. Status labels, the 8 placeholder texts and legal / consent wording are not edited.
     glossary     first use of each term on a page gets a dotted underline and a one-line explanation
     legends      ink and five-state colour keys wherever those colours appear
     decisions    each option previews its outcome with real names and dates
     blocked      locked decisions say why and who decides instead
     reassurance  plain, calm learner copy at anxious moments (most edits are in the portal files)
   Loads after nav.js.
   ============================================================ */
'use strict';

/* ---------- Glossary: plain one-line explanations (Year 6–7 reading level) ---------- */
// [pattern, explanation]. Longer terms first so "Added to PD" wins over "PD". Acronyms match exactly; words ignore case.
const GLOSSARY = [
  [/\bAcademy office observations?\b/i, 'An observation at the Academy\'s office instead of your workplace. Your workplace doesn\'t need to agree.'],
  [/\bAdded to PD\b/, 'This will be covered in your Professional Discussion, so you don\'t need to redo it.'],
  [/\bProfessional Discussions?\b/i, 'A planned conversation with your assessor that covers some criteria instead of written work.'],
  [/\bLearning Outcomes?\b/i, 'What you should know or be able to do by the end of a unit.'],
  [/\bData Corrections?\b/i, 'A request to fix a record that is already locked, such as a name on a certificate.'],
  [/\bSeat holds?\b/i, 'How long your place is kept for you after you pay the deposit.'],
  [/\bResubmissions?\b/i, 'Sending your work again after feedback, with the highlighted answers changed.'],
  [/\bObservations?\b/i, 'Your assessor watches you at work and records what they see.'],
  [/\bNVQ\b/, 'National Vocational Qualification: a work-based qualification. You show you can do the job, at work and in writing.'],
  [/\bRAG\b/, 'Red, amber, green feedback: red = not met, amber = partly met, green = met.'],
  [/\bIQA\b/, 'Internal Quality Assurer: checks that assessors mark fairly and the same way.'],
  [/\bPD\b/, 'Professional Discussion: a planned conversation with your assessor that covers some criteria instead of written work.'],
  [/\b(Criterion|Criteria)\b/i, 'One thing you must show. Your assessor checks each one.'],
  [/\bUnits?\b/, 'One topic of your qualification. Each unit has learning outcomes and criteria.'],
  [/\bBatch(es)?\b/i, 'A group of learners who start and study the programme together.'],
  [/\bBundles?\b/i, 'A set of course seats an agency buys at once.'],
  [/\bSeats?\b/i, 'One place on a course for one learner.'],
  [/\bDeposits?\b/i, 'A first payment that holds your place on a batch.'],
  [/\bEscalated\b/i, 'Not decided within 7 days, so a senior person now decides.'],
  [/\bVerified\b/i, 'Checked and locked by the assessor. It can only change through a Data Correction.'],
  [/\bReleased?\b/, 'The Academic Coordinator sends the marked feedback to the learner.'],
];
// Never inside controls, chips, tags, code, tables, headings or the demo panel; never in text the user is typing
const GL_SKIP = 'button, a, input, textarea, select, option, label, summary, [contenteditable], .chip, .tbd, .demo-tag, .rag, .typebadge, code, .mono, .code, kbd, abbr, h1, h2, h3, table, .crumbs, .tabs, .subtabs, .dd, .modal, .sr, .rte, .paper, .q-conseq, .nav-groups, .bnav';
function glossaryPass() {
  const main = document.querySelector('#main'); if (!main) return; // every render builds a fresh #main
  const used = new Set(), walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim().length > 2 && !(n.parentElement && n.parentElement.closest(GL_SKIP)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    for (let k = 0; k < GLOSSARY.length; k++) {
      if (used.has(k)) continue;
      const m = GLOSSARY[k][0].exec(node.textContent); if (!m) continue;
      // a shorter term inside a longer term already explained on this page is skipped (e.g. "PD" in "Added to PD")
      used.add(k);
      const after = node.splitText(m.index), rest = after.splitText(m[0].length);
      const ab = document.createElement('abbr'); ab.className = 'gl'; ab.title = GLOSSARY[k][1]; ab.tabIndex = 0; ab.textContent = after.textContent;
      after.replaceWith(ab);
      break; // one term per text node keeps the text readable; later nodes can explain other terms
    }
    if (used.size === GLOSSARY.length) break;
  }
}
AFTER.push(() => { try { glossaryPass(); } catch (e) { /* wording aid only */ } });

/* ---------- Colour legends wherever ink or five-state colours appear ---------- */
AFTER.push(() => {
  const main = document.querySelector('#main'); if (!main) return;
  const five = main.querySelector('.five'); if (five && !main.querySelector('.five-legend') && typeof fiveLegend === 'function') { const host = five.closest('section, article, .card') || five.parentElement; host.insertAdjacentHTML('beforeend', `<div class="legend-line">${fiveLegend()}</div>`); }
  const ink = main.querySelector('.round.ink-1, .round.ink-2, .round.ink-0'); if (ink && !main.querySelector('.ink-legend') && typeof inkLegend === 'function') { const paper = ink.closest('.paper') || ink; paper.insertAdjacentHTML('beforebegin', inkLegend()); }
});

/* ---------- Status tooltips: thresholds and "what you can do" ---------- */
Object.assign(STATUS_INFO, {
  'Expiring soon': ['Expires soon — within 30 days for a bundle, 60 days for a certificate. Plan a renewal.', 'This expires soon (within 30 days for a bundle, 60 days for a certificate). Plan your renewal.'],
  'Submitted': ['Waiting for marking. The assessor acts next.', 'Submitted — your assessor is marking it. You\'ll be notified when feedback is released. You don\'t need to do anything.'],
  'Resubmission Required': ['Feedback released with corrections. The learner resubmits by the deadline.', 'Only the highlighted answers need changes. Open the assignment, change them and resubmit before the deadline.'],
  'Expired-Incomplete': ['Access ended before completion. The learner can ask for more time or re-purchase.', 'Your access ended before you finished. Your progress is saved — open the course to ask for more time or buy it again.'],
  'Overdue': ['Past its due date and unpaid. Access pauses at 30 days.', 'This payment is late. Pay it from Payments to keep your access — nothing you have done is lost.'],
  'Declined': ['Declined. The requester can see who declined it.', 'Declined.'],
});

/* ---------- Decision previews: real names and dates ---------- */
const _conseqC = dsConseq;
dsConseq = function (i, a) {
  const who = partyOf(i), first = who.split(' ')[0];
  if (a === 'extend' && i.req && i.v && typeof extEnd === 'function') { const en = STORE.worlds[i.v].enrolments.find(e => e.title === i.req.target); if (en) return `Grant 14 days (you can change the number) → new end date ${fd(extEnd(en, 14))}. ${first}'s progress is kept and ${first} is notified.`; }
  if (a === 'grant' && typeof quizInfo === 'function') { let n = 3; try { n = quizInfo(i).max || 3; } catch (e) { /* default */ } return `${who} gets ${n} more attempts and is notified.`; }
  return _conseqC(i, a);
};

/* ---------- Blocked decisions say why and who decides instead ---------- */
const decider = i => i.status === 'Escalated' ? 'the Super Administrator' : (i.first && i.first !== ADMIN.me.name && i.first !== 'Super Administrator') ? i.first : 'the Super Administrator';
const _qdClar = queueDetail;
queueDetail = function (id) {
  let h = _qdClar(id); const i = qItem(id); if (!i) return h;
  const generic = /<div class="note b-amber"(?: role="status")?>(?:(?!<\/div><\/div>)[\s\S])*?You cannot approve an item you raised(?:(?!<\/div><\/div>)[\s\S])*?<\/div><\/div>/g;
  if (generic.test(h)) {
    h = h.replace(generic, '');
    const msg = isMine(i) ? `<strong>You raised this, so another approver decides</strong> — routed to ${esc(decider(i))}.` : `<strong>${esc(decider(i))} decides this item.</strong> You can read it and add notes.`;
    h = h.replace(/(<div class="q3"|<div class="grid-2")/, `<div class="note b-amber" role="status">${ic('lock')}<div>${msg}</div></div>$1`);
  }
  h = h.replace('Not a System Administrator item — read-only.', `Not a System Administrator item — read-only. ${esc(decider(i))} decides.`);
  // Discount rate change: show only what changes
  if (i.type === 'Discount rate change' && i.data && i.data.current && i.data.proposed) {
    const a = i.data.current.split(' · '), b = i.data.proposed.split(' · ');
    const gone = a.filter(x => !b.includes(x)), add = b.filter(x => !a.includes(x));
    if (gone.length || add.length) h = h.replace(/<dt>Current → proposed<\/dt><dd>[\s\S]*?<\/dd>/, `<dt>What changes</dt><dd>${gone.map(x => `<span class="strike">${esc(x)}</span>`).join(', ') || '—'} → <strong>${add.map(esc).join(', ') || '—'}</strong><div class="xs muted">Everything else stays the same: ${esc(a.filter(x => b.includes(x)).join(' · ') || '—')}</div></dd>`);
  }
  return h;
};

/* ---------- Teacher-only dashboard: no empty "Observations and PD" panel ---------- */
if (SCREENS['t-dashboard']) {
  const _td = SCREENS['t-dashboard'];
  SCREENS['t-dashboard'] = p => { const h = _td(p); if (CAN('observations') !== 'no') return h; return h.replace(/<div><h3>Observations and PD<\/h3><ul class="list small">[\s\S]*?<\/ul><\/div>/, ''); };
}

/* ---------- Agency consent: say what Decline does (the consent wording itself is unchanged) ---------- */
if (SCREENS.dashboard) {
  const _ldC = SCREENS.dashboard;
  SCREENS.dashboard = p => _ldC(p).replace(/(data-act="consentDo" data-id="([^"]*)" data-y="0">Decline<\/button><\/div>)/g, '$1<p class="xs muted">If you decline, the agency is told and would need to send a new request.</p>');
}

/* ---------- Access paused: the real overdue row (was always "Instalment 5 (£350)") ---------- */
function pausedRow() {
  const po = W.payOverdue, pl = po && W.plans.find(p => p.e === po.e);
  const days = d => { const n = calDaysLate(d, tzOfLearner(W.me)); return isFinite(n) && n > 0 ? n : 30; };
  if (po) return { label: po.label || 'Instalment ' + po.n, amount: po.amount, cur: (pl && pl.cur) || W.me.cur, days: days(po.due), e: po.e || 'nvq', n: po.n };
  const p2 = W.plans.find(p => p.rows.some(r => r.status === 'Overdue')), r = p2 && p2.rows.find(x => x.status === 'Overdue');
  if (r) return { label: 'Instalment ' + r.n, amount: r.amount - r.paid, cur: p2.cur || W.me.cur, days: days(r.due), e: p2.e, n: r.n };
  return { label: 'Instalment 5', amount: 350, cur: W.me.cur, days: 30, e: 'nvq', n: 5 }; // demo edge state with no overdue row
}

/* ---------- One marker for prototype-only messages ---------- */
const _toastC = toast;
toast = function (msg, tone) {
  let m = String(msg);
  if (/\(simulated\)|^Simulated:|^Demo:|\(demo\)/i.test(m) && !/^Demo only:/.test(m)) m = 'Demo only: ' + m.replace(/^Simulated:\s*|^Demo:\s*/i, '').replace(/\s*\((simulated|demo)\)/gi, '');
  return _toastC(m, tone);
};

/* ---------- UX Changelog ---------- */
UXC.push(['Phase 4', 'UX polish v2 — clarity and language', [
  'Glossary (every view): the first use on a page of NVQ, Unit, Learning Outcome, Criterion, RAG, Professional Discussion (PD), Added to PD, Resubmission, IQA, Observation, Academy office observation, Batch, Bundle, Seat, Deposit, Seat hold, Escalated, Data Correction, Verified and Release gets a dotted underline and a one-line explanation (hover, or focus with the keyboard). Not applied inside buttons, links, chips, tables, headings, placeholder tags or anything you type.',
  'Status tooltips say what the status means, who acts next and what you can do (e.g. "Submitted — your assessor is marking it. You\'ll be notified when feedback is released."). "Expiring soon" explains the 30-day (bundle) and 60-day (certificate) thresholds. Status labels are unchanged.',
  'Colour legends: a five-state key wherever five-state bars appear (Coordinator dashboard and roster, progress views) and a submission-ink key wherever coloured answer rounds appear, if the page didn\'t have one.',
  'Confirmations state the consequence: "Release to learner?" names the learner, says resubmission deadlines start today and that release can\'t be undone; "Send to Coordinator for release?" says you won\'t be able to edit the marking afterwards; the assessor\'s checks read "Can\'t send yet" / "Check before sending" and show both the status the learner will see and "Awaiting Coordinator release".',
  'Decision panels preview the outcome with names and dates: "Grant 14 days → new end date …; progress is kept", "Aisha gets 3 more attempts and is notified". Discount rate changes show only what changes (old → new) and what stays the same.',
  'Blocked decisions say why and who decides: "You raised this, so another approver decides — routed to …" or "… decides this item. You can read it and add notes." (one notice; Finance showed up to three, and could say "you raised" for items you hadn\'t). System Admin read-only items name the decider.',
  'Learner reassurance: access paused shows the real overdue instalment, amount and days, and says access comes back as soon as you pay with nothing lost (was always "Instalment 5 (£350)"); "Seat released" says what happened and offers "Message the Academy"; the assignment timeline shows the next real status ("Feedback Received or Resubmission Required — your assessor is marking it") instead of "Under Review", which is not an assignment status; Academy-office observations say "Accept" and that your workplace doesn\'t need to agree; registration says which currency your country sets; the welcome after registering no longer says "Your password is saved".',
  'Agency: a declined link request says whether the learner or the Academy declined it; the learner\'s consent prompt adds one line under the buttons — "If you decline, the agency is told and would need to send a new request." (the consent wording itself is unchanged).',
  'Teacher: Marking Queue column "Draft" → "State"; the empty "Internal notes visible to the learner:" heading is gone from observation reports; Teacher-only dashboards no longer show an empty "Observations and PD" panel.',
  'Prototype-only messages all start "Demo only:" (were "(simulated)", "Simulated:", "Demo:" or "(demo)").',
  'Not changed, by decision: the verification result keeps its four fields (G11 and the privacy notice fix them, so no certificate number); status labels, the 8 placeholder texts and legal / consent wording are untouched.',
]]);

/* ---------- Countdowns show when they end (the timer keeps updating the countdown itself) ---------- */
AFTER.push(() => { document.querySelectorAll('#app .countdown[data-count]').forEach(c => { if (c.nextElementSibling && c.nextElementSibling.classList.contains('cd-end')) return; const iso = c.dataset.count; if (!iso || isNaN(new Date(iso))) return; c.insertAdjacentHTML('afterend', ` <span class="xs muted cd-end">(ends ${fds(iso)}, ${ft(iso)})</span>`); }); });
UXC.find(x => x[0] === 'Phase 4')[2].push('Countdowns ("Seat offer ends in 6d 14:43:00") also show when they end, with the time zone. Refund approval restates the amount, the original payment method and the enrolment consequence before you confirm. System Admin dashboard explains "Raised by me" and "Escalated to Super Admin — read-only" in one line each.', 'Tests changed in Phase 4: ft-phase3.js (the "/" test extended — old and new text in the hand-over). Tests added: ft-phase4.js.');


/* ---------- Business Admin: Approve on a link request shows why it can't be used yet (same checks as on click) ---------- */
function linkBlockReason(i) {
  if (!i || i.type !== 'Link existing learner to agency' || !isOpen(i)) return '';
  const L = i.data && i.data.lid ? learnerById(i.data.lid) : null;
  if (L && L.acct === 'Deactivated') return `${L.name}'s account is deactivated. The System Administrator must reactivate it first.`;
  if (!i.data || !i.data.consentAt) return 'Waiting for the learner\'s consent. The Academy can decide only after the learner agrees.';
  if (L && i.data.course && typeof agyOtherSponsor === 'function' && agyOtherSponsor(L, i.data.course, i.data.agency)) return SAME_COURSE_MSG;
  return '';
}
const _qdLink = queueDetail;
queueDetail = function (id) {
  const h = _qdLink(id), i = qItem(id), why = linkBlockReason(i); if (!why) return h;
  const t = document.createElement('template'); t.innerHTML = h;
  t.content.querySelectorAll('button[data-act="qDo"][data-a="approve"]').forEach(b => {
    b.disabled = true; b.setAttribute('aria-disabled', 'true'); b.title = why;
    const opt = b.closest('.q-opt'), c = opt && opt.querySelector('.q-conseq'), p = document.createElement('p'); p.className = 'xs q-why'; p.textContent = 'Can\'t approve yet: ' + why;
    if (c) c.replaceWith(p); else b.after(p);
  });
  const box = document.createElement('div'); box.appendChild(t.content.cloneNode(true)); return box.innerHTML;
};

UXC.find(x => x[0] === 'Phase 4')[2].push(
  'Plain language (learner, registration, verification): long sentences split and simpler words — e.g. "You get your certificate automatically when you have done everything the course needs", "First you upload some documents … Then the Academy checks your application. This usually takes up to 7 days." Legal and consent wording (workplace permission statement, the record of your decision, the verification privacy notice), status labels and the 8 placeholder texts are unchanged.',
  'Learner profile: time-zone list includes Asia/Kolkata (IST); the learner\'s own zone is always shown and selected (India learners saw London selected).',
  'Workplace grant: "Your name" (the record, correct it if wrong) and "Signature: type your full name to sign" now say what each is for — both are still required as before; steps read "Step 1 of 2 / Step 2 of 2" (there was no step 3), Decline is numbered, and the first Withdraw step\'s Continue is no longer red (the final "Confirm — withdraw permission" stays red).',
  'Business Admin: Approve on a link request is disabled with the reason shown inline ("Waiting for the learner\'s consent…", account deactivated, or already sponsored for that course) — the same checks as before, which used to appear only as a message after clicking. the price rule is called "minimum price" in every heading, column and sentence (it had two names), matching the agreed name "Bundle price below minimum"; "Waiting on others" has a one-line explanation. The price-state chips keep their names (the System Configuration setting was renamed in Phase 5).',
  'Wizards: Create batch explains each schedule and intake option in one line ("Automatic on admission approval" — learners join as soon as their admission is approved) and Review flags a missing Teacher or Assessor where it is listed. Onboard agency marks the required fields and Review now also lists registration number, address, billing contact and referral code.',
  'Coordinator dashboard: each "Needs your attention" item shows a text label — Urgent, Soon or Info — next to its coloured dot.'
);
