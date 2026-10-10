/* ============================================================
   TBD cleanup — Step 3: records (TBD register, UX Changelog, Client Decisions Log).
   Loads after records.js, fu-records.js and tc-apply.js.
   ============================================================ */
'use strict';

const TC_CHANGED = [
  ['011', 'Cohort migration is Super Admin only; Academic and System Admin see "Cohort migration — Super Administrator only".'],
  ['059', '"Unanswered agency message" alert after 2 working days (Mon–Fri) instead of 4 hours.'],
  ['061, 062, 065', 'Agency registration number and billing currency are required at onboarding (Next is blocked until both are filled); registration number editable in "Edit details".'],
  ['067', 'Bundle minimum price set by the Super Admin only; others see "Set by the Super Administrator". Below-minimum prices still go to the System Admin.'],
  ['079', 'Coordinator learner view shows the email only (mobile removed).'],
  ['094', 'Overpayment: "Raise refund for the surplus" records the payment and pre-fills a refund (no credit held).'],
  ['124', 'Quiz: one question per screen; the layout switch is removed.'],
  ['131', 'Learners can cancel a pending request ("Cancel request" + confirm → Cancelled; the queue item closes and shows Cancelled to the approver).'],
  ['137', 'Assessor dashboard: turnaround target 10 working days; "Due back soon" counts submissions 8–9 working days old.'],
  ['138', 'Assessor learner view shows email and phone.'],
  ['150', 'Only the Super Admin grants or removes the System Administrator role; System Admins see it disabled with the note.'],
  ['156', 'Workplace grant page: typed full name is required; "Confirm and grant" stays disabled until it is filled in.'],
];
const TC_REMOVED = [
  ['021, 132', 'Active sessions (admin profile and learner profile) — phase 2.'],
  ['024', '"Trust this device for 30 days" on 2FA.'],
  ['025', '"Save view" on every table — phase 2.'],
  ['038, 056, 076, 104 + Academic / Super Admin', 'Scheduled reports in Agency, Business, Finance, Academic Admin and Super Admin Reports — phase 2. On-demand reports and exports stay.'],
  ['046, 047', 'Date of birth and Address / postcode on the agency "Add learner" form (bulk import had no such columns — confirmed absent).'],
  ['072', '"Invalid code at registration" setting (Super Admin and Business Admin Referrals → Settings, and its configuration row). Fixed rule: warn and continue.'],
  ['085', 'Read receipts in Coordinator messages.'],
  ['101, 105', 'Finance → learner messaging: "Message" on overdue rows removed; seeded threads FT-1 and FT-4 now with Rachel Hughes (Academic Admin).'],
  ['103', '"Send password reset link" in the Finance learner view.'],
  ['126', 'Reviewer\'s name on the learner admission tracker.'],
  ['130', '"Share" on certificates ("Copy verification link" stays).'],
  ['134', '"People who registered with your code" (referral section shows the code and link only).'],
  ['141', '"Tag evidence" on portfolios.'],
  ['145', '"Reply / dispute threads" on IQA findings (the assessor only Acknowledges).'],
  ['166', 'SMS version of workplace links and its demo-inbox preview.'],
];
const TC_OTHER = [
  'Invented contact details removed everywhere (tagged 039, 045, 152 and the untagged places): one "Client to supply: Academy contact email and phone" placeholder. Staff and system addresses use the reserved illumin-academy.example domain.',
  '"Client to supply" relabels: bank payment instructions (034), privacy notice URL (153, 163), verification domain (154), Academy office address (G6.6).',
  '"Pending client" relabels: VAT invoices (012, 055), storage region (013), exchange rates (019, 121).',
  '120 KEEP tags removed with no behaviour change; untagged "TBD" wording removed from nav tags, toasts and labels (global search, word count, voice-to-text, Finance toasts).',
];
UXC.push(['TBD cleanup', 'TBD cleanup — 166 tags', TC_CHANGED.map(r => `CHANGE ${r[0]}: ${r[1]}`).concat(TC_REMOVED.map(r => `REMOVE ${r[0]}: ${r[1]}`), TC_OTHER)]);

// Client Decisions Log row
const _cdLogTc = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogTc(p).replace('<section class="card"><h2>Follow-up decisions (P-05 – P-26)</h2>', `<section class="card"><h2>TBD cleanup</h2>${recTbl(['Decision', 'Status', 'What it means in the prototype'], [['TBD cleanup — 154 of 166 tags resolved by agreed defaults; what remains: 3 "Pending client" topics (5 original tags) and 5 "Client to supply" topics (7 original tags + the Academy office address)', chip('Applied', 'green'), 'Every remaining tag reads "Pending client: …" or "Client to supply: …". See the TBD register.']])}</section><section class="card"><h2>Follow-up decisions (P-05 – P-26)</h2>`);

// TBD register: the remaining topics, each listed once with every place it appears
const _tbdRegTc = SCREENS['tbd-register'];
SCREENS['tbd-register'] = p => { const h = _tbdRegTc(p), i = h.indexOf('<section class="card"><h2>Remaining —'); const head = i > 0 ? h.slice(0, i) : h;
  return head + `<section class="card"><h2>TBD cleanup — resolved</h2>${recTbl(['IDs', 'Change'], TC_CHANGED.map(r => [esc(r[0]), 'CHANGE — ' + esc(r[1])]).concat(TC_REMOVED.map(r => [esc(r[0]), 'REMOVE — ' + esc(r[1])])))}<p class="small muted">All other IDs: KEEP — behaviour as built, tag removed.</p></section>
  <section class="card"><h2>Remaining — ${TBD_TOPICS.length} topics</h2><p class="small muted">Counted by topic, not by instance. ${TBD_TOPICS.filter(t => t[0] === 'Pending client').length} Pending client · ${TBD_TOPICS.filter(t => t[0] === 'Client to supply').length} Client to supply.</p>${recTbl(['Tag', 'Original IDs', 'Where it appears'], TBD_TOPICS.map(t => [`<span class="tbd" title="${TBD_TIP}">${esc(t[0] + ': ' + t[1])}</span>`, esc(t[2]), `<span class="small">${esc(t[3])}</span>`]))}</section>`; };
