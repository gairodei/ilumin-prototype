/* ============================================================
   Follow-up decisions (P-05 – P-26) — Step 1: Inventory (route: fu-inventory)
   Read-only planning page. Lists, for F1–F12, the affected screens, components, mock records,
   notifications, scenario steps and CSS; current and target behaviour; conflicts.
   Nothing in this file changes behaviour anywhere else.
   ============================================================ */
'use strict';

const FU_DATE = '8 Oct 2026';
const FU_STATUS = { Build: 'green', Modify: 'amber', 'TBD only': 'grey', Confirm: 'blue', 'Confirmed absent': 'grey', Record: 'blue' };
// [id, title (P-ref), action, where (screens · components · mocks · notifications · scenarios · CSS), current, target, conflicts / notes]
const FU_ROWS = [
  ['F1', 'Learner moves country (P-05)', 'Modify + mock',
    'Learner Profile → Country of residence "Request change" (screens-d.js:83, modal ACT.reqChange :89) · profile-change approval effect (admin-a.js:214) · Learner 360 overview Data region / Currency (admin-a.js:318) · Data Protection → Data residency text (admin-c.js:201) · checkout / Browse / Payments read W.me.cur (screens-a.js, screens-c.js) · new mock learner world "Priya Nair" · new Demo Scenario "Learner moves country" · P-05 tag',
    'Approving a country change sets the learner\'s country and switches the learner\'s single currency (W.me.cur) for everything, so existing instalments, deposits and enrolment prices re-label into the new currency. Region shows the stored region; no "registered" date or "country changed" line. The request modal has no currency note. P-05 tag: Confirmed absent (removed under G3.1).',
    'New purchases and enrolments use the new currency; existing enrolments, instalments, deposits and refunds keep their original currency (stored per item). Data region never moves: Learner 360 shows "Data region: UAE (registered 12 Mar 2026)" and, when changed, "Country changed to United Kingdom on [date]". Modal note: "Changing country affects new purchases only. Your current courses and payments stay in [currency]." Mock Priya Nair: registered UAE (AED, UAE region), moved to UK; one AED enrolment, one GBP enrolment, region UAE.',
    'Conflict: the G3.1 inventory planned "profile-change apply must update region/currency" — F1 wins (region never changes; currency only for new purchases). Prices are currently formatted from the learner\'s one currency, so each enrolment / plan / deposit needs its own currency field; existing mock records get their current currency stamped (values unchanged). Priya needs a learner-portal world so the scenario can be walked.'],
  ['F2', 'Currency conversion details (P-07) — pending', 'TBD only',
    'Super/System Admin → Courses → course pricing (admin-b.js:146 price editor) · learner checkout modal (screens-a.js:5 checkout()) · "Converted from the base price" note (data.js:46 CONV_NOTE)',
    'Learner currency shown with "Converted from the base price". No exchange-rate settings. P-07 tags: Confirmed absent (removed under G3.1).',
    'Unchanged display. One tag on the pricing screen and one on checkout: "Pending client: rate source (admin-typed or live), update frequency, rounding, and whether the price is locked at enrolment." Nothing built.',
    '—'],
  ['F3a', 'Learners from other countries — currency (P-15)', 'Confirm',
    'India / INR mock learners (G3.1, world G via registration and g31 learners) · Browse / checkout (screens-a.js:384) · learner Payments · Finance per-currency totals (curTotals / byCur)',
    'Built under G3.1: INR learners exist; INR prices with the conversion note; Finance totals per currency, never summed.',
    'Confirm by test: INR learner exists; INR on checkout and in Payments; Finance shows INR separately.',
    '—'],
  ['F3b', 'Learners from other countries — storage (P-15) — pending', 'TBD only',
    'Learner 360 overview "Data region" (admin-a.js:318)',
    'Learners outside the UK and UAE show "Data region: —".',
    '"Data region:" followed by the tag "Pending client: storage region for learners outside the UK/UAE, and acceptance of two-region hosting cost." No region assigned.',
    'The Learners list column (admin-a.js:276) and the Data residency text "Other countries: no region rule" (admin-c.js:201) are not named — left unchanged.'],
  ['F4', 'NVQ fees for agency learners (P-16)', 'Modify',
    'Learner: Admission deposit card for sponsored learners (screens-b.js:33–40, tag :36) · Payments (screens-c.js:113, tag) · Finance learner plans (finance.js:517, tag) · Finance → Overdue & Access mock rows (finance.js:50 builder: agency-sponsored learners Oliver Bennett — BrightCare, Isla Morgan — CarePlus, both Level 2 Diploma) · Agency Seat Assignments NVQ note (agency.js:288–289 "Who pays NVQ fees…" tbd()) and NVQ-seat tbd() tags (agency.js:273, :297, :299) · Super Admin Learner 360 → Payments for sponsored learners · Business bundle builder course list (NVQ in bundles) · Demo Scenario #9 (agency)',
    'Sponsored learner admission says "No deposit is needed" and Payments says no instalments are shown, each with a "who pays NVQ fees" TBD. Overdue & Access includes two agency-sponsored NVQ learners. Agency NVQ seat flow built, with TBD tags.',
    'Sponsored NVQ enrolment: no fee schedule, instalments or deposit; Payments shows "Your course fees are covered by [Agency]"; after all documents are approved the learner goes straight to batch placement. Finance: no learner instalments, never in Overdue & Access. NVQ courses can be in bundles. All "who pays NVQ fees" tags and the NVQ seat-assignment TBD removed.',
    'Conflict (mock data): the two sponsored NVQ overdue rows contradict F4 — they are removed from Overdue & Access with every trace (dunning history, reminder notifications, counts, index links). IDs of other rows unchanged. Whether the bundle builder already offers NVQ courses is checked in Step 2; added only if missing.'],
  ['F5', 'What the Academic Coordinator can edit (P-17)', 'Build + Modify',
    'Coordinator: batch timeline edit (coord.js:537 ACT.cooEditEv — sessions, deadlines, resource releases, milestones), batch detail (coord.js:379–382) — no "Edit staff" · Academic Admin "Change batch staff" modal (academic.js:555 ACT.batchStaff) and timeline edit (academic.js:672 ACT.kEditEv) · "Request change" (coord.js:551, kept for NVQ structure, mapping, briefs) · notifications: Coordinator (STORE.coo.notifs), Academic Admin (acaNotify) · new Demo Scenario "Coordinator vs Academic Admin edit" · screen index (Coordinator "Edit staff") · P-17 tag',
    'Coordinator edits dates with reason, versioned in the Coordinator change log; learners optionally notified. Academic Admin edits notify the Coordinator ("Schedule changed"). No shared per-item version history; no "changed after your edit" notice; Coordinator can\'t edit batch staff. Observation windows: to be confirmed in Step 2. P-17 tag: Confirmed absent.',
    'Coordinator edits everything in own batch (dates, deadlines, resource releases, milestones / observation windows, Teachers and Assessors) — versioned, audited, reason required; learners notified of date changes, added / removed staff notified. "Edit staff" reuses the Academic Admin modal limited to own batch, without the Coordinator slot; historical marking keeps the original assessor. Last save wins; both versions in the item\'s history; the other party notified "[Name] changed [item] after your edit — see history." New event in both notification lists.',
    'Needs one shared version history per batch item so Coordinator and Academic Admin edits land in the same place.'],
  ['F6', 'Observation photos (P-18)', 'Confirmed absent',
    'Observation record (staff.js:539–545): general banner "Do not record service-user names or identifying information. Evidence must respect workplace privacy rules." and "Evidence attachment (photos allowed)"',
    'No per-upload tick-box (Confirmed absent). No photo-specific privacy wording (Confirmed absent). Photo TBD removed under G6.6 (Confirmed absent).',
    'No change. The general privacy banner is not photo-specific and stays.',
    '—'],
  ['F7', 'Academy-office observations (P-19)', 'Confirm',
    'Assessor Propose observation → Location Academy office (staff.js:506–514) · learner Observations accept / suggest another time (screens-b.js:398) · Demo Scenario #7',
    'Built under G6.6: same propose → accept / counter flow, no workplace permission step. No "awarding-body confirmation required" note, hold note or TBD (Confirmed absent).',
    'Confirm by test (scenario #7 office branch, plus a counter-proposal).',
    '—'],
  ['F8', 'VAT invoices (P-20) — pending', 'TBD only',
    'Agency → Buy Bundles → "Pay by bank transfer (Academy approval)" (agency.js:527 agInvoiceForm) · Finance → Approvals item "Agency invoice purchase" (admin-a.js:125 queue detail)',
    'No VAT invoices; receipts only.',
    'One tag in each place: "Pending client: how agencies receive VAT invoices for bank-transfer purchases." Nothing built.',
    'business.js:228 read-only note keeps its own unrelated tbd().'],
  ['F9', 'Deposit wording (P-21)', 'Confirmed absent',
    'Learner deposit card (screens-b.js:33–40) · Finance Deposits (finance.js:55, :431, :545)',
    '"Deposit is not refunded" notice: Confirmed absent. Acknowledgement tick-box: Confirmed absent; "Pay deposit" enabled once all documents are approved. Learner expired state: "Seat released" only. "Seat held until [date]" + countdown kept. Finance keeps "Seat released — deposit retained" and the Retained bucket; refund flow for cancelled batches / rejected admissions kept. Related TBD: Confirmed absent.',
    'No change; confirm by test that no learner screen shows "retained" or "not refunded".',
    '—'],
  ['F10', 'Super Admin actions — notify, never approve (P-22)', 'Modify',
    'saApply (admin-a.js:181–196) · override (admin-a.js:246 ACT.qOverride) · direct Super Admin actions: access restore / pause, waivers, instalment changes, deposits, non-payment discontinue / reactivate (finance.js, admin-a.js lEnr / restoreAccess), short-course prices (admin-b.js), discount rates (discount.js), release override (release.js relSuper), batches and scheduling (admin-b.js batch actions, batchStaff, cancelBatch), admissions and documents (admin-a.js appApprove / appReject / docDec), learner accounts (admin-a.js lAct), agencies and bundles (business.js as Super Admin), staff and roles (admin-b.js) · notification stores: Finance, System, Academic, Coordinator, Business, Assessor, learner',
    'Refunds → all Finance Admins; other queue items → System Admins; assessment data corrections → assessor too; below-minimum prices → System Admins. Direct actions mostly notify nobody. Text "X applied by Super Administrator [name]". Audit tag "Super Admin — no approval required" kept. P-22 tag: Confirmed absent.',
    'One routing table for every Super Admin action and override (money → all Finance Admins; assessment records → System Admins + marking Assessor + batch Coordinator; academic decisions → Academic Admins + batch Coordinator; batches → batch Coordinator + Academic Admins; admissions → assigned reviewer + Academic Admins; learner accounts → System Admins; agencies / bundles / prices / links → Business Admins; staff / roles → System Admins; affected learner → normal outcome notification, never "Super Admin" wording). Text "Super Administrator [name] [did X] — reason: [reason]" linking to the record.',
    'Conflict: below-minimum prices raised by the Super Admin currently notify System Admins — F10 routes them to Business Admins. Recipients are role-wide (all Finance / System / Academic / Business Admins) because each portal\'s notification list is shared per role in the prototype.'],
  ['F11', 'Workplace email attachments (P-25)', 'Build',
    'Notification Settings → workplace templates: Workplace permission link, Observation proposed, Observation revised, Observation confirmed (admin-c.js:180–189, ACT.tplEdit) · workplace demo inbox emails (workplace.js:360–375) · workplace link pages "What happens" placeholder (workplace.js:174, :184 — G10.3) · Business Admin onboarding wizard, Login step (business.js:305) · agency set-password email (agency.js:589) · Agency Profile → Data protection (agency.js:418 tbd()) · screen index (template attachments)',
    'Templates have subject / body only. Emails list no attachments. Link pages show the "Client to supply · [Visit description — to be supplied by the client]" placeholder. Onboarding has no attachment; Agency Profile shows "data-sharing terms for agencies" with a TBD.',
    'Template "Attachments" section (mock upload PDF / DOCX, list, remove; per template) with three defaults. Workplace emails show them. Link pages show "Documents from Illumin Academy" (mock download links); placeholder and "Client to supply" tag removed. Wizard Login step: "Attach data-sharing terms"; the set-password email shows it; Agency Profile → Data protection lists it; its TBD removed.',
    'Question: the attachments now carry visit duration, contact details and FAQ — the existing tbd(\'duration\'), tbd(\'contact details\') and FAQ tbd(\'content\') on the workplace pages are not named in F11, so they stay unless you say otherwise.'],
  ['F12', 'Approval routes returned (P-26)', 'Record',
    'Client Decisions Log (records.js) · "Who approves what" drawer (admin-a.js:90–104)',
    'Routes match the G4 table exactly (tested cell by cell).',
    'Client Decisions Log: "Approval Routes document — Returned by client". No route changes.',
    '—'],
];
const FU_STEP3 = [
  ['Client Decisions Log', 'Rows F1–F12; F2, F3b, F8 "Pending client"; the rest "Applied".'],
  ['UX Changelog', 'One entry per F-item.'],
  ['Demo Scenarios', 'New #16 "Learner moves country" (Priya → System Admin approves → new course in GBP, old course AED, region unchanged). New #17 "Coordinator vs Academic Admin edit" (Coordinator moves a deadline → Academic Admin changes it → Coordinator notified → both versions in history). #9 (agency) gains a sponsored NVQ learner step: no deposit, no fee schedule.'],
  ['Screen index', 'Notification template attachments; Coordinator "Edit staff".'],
];
const fuAct = a => a.split(' + ').map(x => chip(x, FU_STATUS[x] || 'grey')).join(' ');
SCREENS['fu-inventory'] = () => `${pageHead('Follow-up Decisions — Inventory', `Step 1 of applying the client's answers to follow-up questions P-05 – P-26 (F1–F12). For each item: what it touches, current and target behaviour, conflicts. Nothing has been changed yet. Compiled ${FU_DATE}.`)}
  <section class="card"><h2>Summary</h2><div class="ux-kpis"><div><strong>${FU_ROWS.length}</strong><span>items</span></div><div><strong>${FU_ROWS.filter(r => /Build|Modify/.test(r[2])).length}</strong><span>build / modify</span></div><div><strong>${FU_ROWS.filter(r => r[2] === 'TBD only').length}</strong><span>pending — TBD tag only</span></div><div><strong>${FU_ROWS.filter(r => /Confirm/.test(r[2])).length}</strong><span>confirm / confirmed absent</span></div></div>
  <p class="small">Pending items (F2, F3b, F8) get only a "Pending client" TBD tag. Removal targets that don't exist are marked "Confirmed absent" — no conflict, nothing built in their place.</p></section>
  <section class="card"><h2>F1–F12</h2><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr>${['Item', 'Action', 'Where (screens, components, mocks, notifications, scenarios, CSS)', 'Current behaviour', 'Target behaviour', 'Conflicts / notes'].map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${FU_ROWS.map(r => `<tr><td class="strong">${r[0]}<div class="xs muted">${esc(r[1])}</div></td><td class="nowrap">${fuAct(r[2])}</td><td class="small mono">${esc(r[3])}</td><td class="small">${esc(r[4])}</td><td class="small">${esc(r[5])}</td><td class="small">${esc(r[6])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Step 3 records (after Step 2)</h2><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">Record</th><th scope="col">Change</th></tr></thead><tbody>${FU_STEP3.map(r => `<tr><td class="strong nowrap">${r[0]}</td><td class="small">${esc(r[1])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>CSS</h2><p class="small">Any new styles go in an appended <span class="mono">/* Follow-up decisions */</span> block. Expected: none, or a few lines for the attachments list — existing components cover the rest.</p></section>`;

const _idxFU = SCREENS.index;
SCREENS.index = p => _idxFU(p) + `<section class="card idx-sec"><h2>Follow-up decisions</h2><ul class="idx-list"><li><button class="linklike" data-go="fu-inventory">Follow-up Decisions — Inventory</button> <span class="xs muted">· Step 1: F1–F12 (P-05 – P-26)</span></li></ul></section>`;
