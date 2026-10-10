/* ============================================================
   UX polish pass — Phase 1: UX Audit page (route: ux-audit)
   Findings come from an automated scan of 744 screen renders
   (1440px and 390px, every role) plus a manual walk-through.
   Read-only page: it changes no behaviour anywhere else.
   ============================================================ */
const UX_SCAN = { renders: 744, routes: 372, date: '4 Oct 2026' };
const UX_CAT = { nav: 'Navigation', con: 'Consistency', cla: 'Clarity', sta: 'State coverage', a11y: 'Accessibility', mob: 'Mobile', ph: 'Placeholders & broken links' };
const UX_SEV = { H: ['High', 'red'], M: ['Medium', 'amber'], L: ['Low', 'grey'] };

// [role, task, current, target, meets: 1 yes / 0 no / 2 partly, note]
const UX_TASKS = [
  ['learner', 'See what to do next', '0', '0', 1, '"Action needed" is the first panel on the dashboard.'],
  ['learner', 'Open assignment → answer → submit', '1 + review + submit', '≤ 3 + review + submit', 1, 'Dashboard → Open assignment.'],
  ['learner', 'Read feedback on latest submission', '1', '≤ 2', 1, 'Dashboard → Recent feedback → View.'],
  ['learner', 'Pay an overdue instalment', '2', '≤ 2', 1, 'Banner "Pay now" → confirm in the dialog.'],
  ['learner', 'Download a certificate', '3 (laptop) · 4 (phone)', '≤ 2', 0, 'Certificates → View / Download PDF → Download PDF. On a phone Certificates is not in the bottom bar, so Menu comes first.'],
  ['learner', 'Request more quiz attempts / more time', '3 + send', '≤ 2', 0, 'My Courses → course → Request more attempts → send. Not surfaced on the dashboard when attempts run out.'],
  ['learner', 'Accept an observation date', '2', '≤ 2', 1, 'Action needed → Respond → Accept.'],
  ['staff', 'Open next submission to mark', '1', '1', 1, '"Start marking (oldest first)".'],
  ['staff', 'Mark item + release feedback', 'In workspace', 'In workspace', 1, 'No page change.'],
  ['staff', 'Start an observation record on site (phone)', '1', '≤ 2', 1, 'Dashboard → Start observation record.'],
  ['coord', 'See at-risk learners in my batch', '1 (scroll)', '0–1', 2, '"Needs attention" sits below three batch cards, below the fold on a laptop.'],
  ['coord', 'Post coordinator feedback', '2 + type', '≤ 3', 1, 'Dashboard → Add feedback → Post.'],
  ['admin', 'Open the oldest item awaiting me and decide', '2 + confirm', '≤ 2', 1, 'Dashboard list is sorted by bucket, not age; the oldest isn\'t marked.'],
  ['admin', 'Find a learner and open Learner 360', '1 (search)', '1', 1, 'Header search works; no "/" shortcut.'],
  ['fin', 'Record an offline payment', '3 (overdue) · 4 (other)', '≤ 3', 2, 'Overdue & Access → Record payment → confirm. Non-overdue: Learner Accounts → learner → Record payment → confirm.'],
  ['fin', 'Restore paused access with new due date', '2', '≤ 2', 1, 'Dashboard overdue table → Restore access → confirm.'],
  ['aca', 'Create a batch', '1 + wizard', '1 + wizard', 1, '"Create batch" on the dashboard.'],
  ['aca', 'Grant a deadline extension', '3 + confirm', '≤ 3', 2, 'Dashboard → More time → item → Grant extension → confirm.'],
  ['biz', 'Onboard an agency', '1 + wizard', '1 + wizard', 1, '"Onboard agency" on the dashboard.'],
  ['iqa', 'Filter → add 10 items to a sample set', '3–4 (page of 15)', '≤ 4', 2, 'Select-all picks the whole page of 15; picking exactly 10 needs 10 row ticks.'],
  ['iqa', 'Record a finding while reading a record', '1', '1', 1, ''],
  ['agy', 'Assign seats to several learners', '1 + pick + review', '≤ 3 + review', 1, 'Dashboard → Assign seats.'],
  ['agy', 'Buy a bundle', '1–2 + checkout', '≤ 3 + checkout', 1, 'Bundle card → Buy more.'],
  ['wpc', 'Grant permission from email', '3', '≤ 3, < 60 s', 1, 'Tick 2 boxes → Grant.'],
  ['ver', 'See certificate status from QR', '0', '0', 1, 'Result shows on open.'],
];

// [scope, sev, cat, issue, where, fix, phase]   scope 'all' = cross-cutting
const UX_ISSUES = [
  // ---------- Cross-cutting ----------
  ['all', 'H', 'cla', 'Status chips don\'t explain themselves. None of the chips rendered has a tooltip saying what the status means, who acts next or what the user can do.', 'Every view (about 3,900 chip renders)', 'One chip component with a tooltip on hover/tap; one shared status dictionary.', 2],
  ['all', 'H', 'cla', 'Decision panels list options (Approve, Reject, Send back…) without previewing the outcome. The queue item is one long column, so the decision buttons scroll out of view.', 'Approvals Queue item, all admin roles', 'Three-column queue template with a sticky decision panel; each option states its consequence before the click.', 2],
  ['all', 'H', 'mob', 'Tables don\'t turn into cards on a phone. On 167 of the 372 phone-width screens a table scrolls sideways inside the page.', 'Admin, Finance, Academic, Coordinator, Business, Agency, Learner (Assignments, Payments, Attendance, Requests)', 'Card layout for tables under 640px.', 5],
  ['all', 'H', 'ph', 'The integration-failure banner\'s "Review" link opens Integrations for Finance, Academic, Business and IQA admins, who aren\'t allowed there. They hit "You don\'t have permission" and the click is logged as a false out-of-scope security event.', 'Every admin dashboard except Super/System Admin', 'Show the banner as read-only for those roles ("System Admin has been alerted"), with no link.', 3],
  ['all', 'M', 'nav', 'Dashboards don\'t lead with "Needs your attention". Super/System Admin open on the enrolments chart, the Coordinator on batch cards and the Agency on bundles. IQA has no dashboard.', 'Super, System, Coordinator, Agency, IQA', 'Dashboard template: Needs your attention → KPIs → Upcoming → Activity, with "You\'re all caught up" when empty.', 3],
  ['all', 'M', 'nav', 'The same page has different names in different sidebars, e.g. "Bundles & Licences" vs "Bundles & Pricing", "Referrals & Commission" vs "Referrals & Attribution", "Scheduling & Calendars" vs "Scheduling", "Attendance (Zoom)" vs "Attendance", "Assessment Records & Quality" vs "Assessment Records", "Reports & Analytics" vs "Reports", "My Profile & Security" vs "My Profile".', 'Admin-family sidebars', 'One label per route everywhere.', 3],
  ['all', 'M', 'nav', 'Approvals has four names: "Approvals Queue" (admins), "My Approvals & Corrections" (Teacher), "My Requests" (Learner) and the header pill "Approvals awaiting".', 'All staff views', 'Use "Approvals" for the admin queue and keep "My Requests" for learners (it\'s their own requests).', 3],
  ['all', 'M', 'nav', 'There are five different role-switch controls: the learner "Viewing as" select, the Coordinator "Role" select, the System Admin multi-role switcher, the demo panel role buttons, and admin variants inside the demo panel.', 'Learner E, Coordinator, System Admin, demo panel', 'One header role control that shows the acting role and keeps you on an equivalent page.', 3],
  ['all', 'M', 'con', 'More than one primary (blue) button on 26 screens, e.g. Teacher Marking Queue 12, Finance Overdue & Access 8, Agency Buy Bundles 6, Learner Certificates 5, Learner Browse Courses 5, Teacher dashboard 4.', 'See examples', 'One primary per screen or section; the others become secondary.', 2],
  ['all', 'M', 'sta', 'Some empty states give no next step: the Messages "no conversation selected" pane (all 7 messaging views), demo inboxes, and Agency certificate tabs "Expiring in 30 days" and "Revoked".', 'Messages in every portal; Agency certificates', 'Empty-state pattern: friendly line + why it\'s empty + one action button.', 2],
  ['all', 'M', 'sta', 'No loading states. Every screen renders instantly, so there\'s no skeleton to show what a slow connection looks like, and exports go straight to a "downloaded" toast with no "Preparing… → Ready".', 'All views', 'Skeleton loaders shaped like each template; export progress toast.', 5],
  ['all', 'M', 'a11y', 'Muted text is 4.39:1 on grey surfaces, below the 4.5:1 minimum: table headers and sort buttons, sidebar group headings, type badges, nav count tags.', 'Every table and admin sidebar', 'Darken the muted token on grey surfaces (no change to fixed status colours).', 5],
  ['all', 'M', 'a11y', 'Touch targets under 44px on phones: header icon buttons, small buttons (btn-sm, about 32–36px), table page-size selects, inline "linklike" buttons in lists.', '314 of 372 phone screens', '44 × 44px minimum hit area on touch screens.', 5],
  ['all', 'M', 'cla', 'Ink colours, RAG and five-state colours appear without a legend on several screens (Coordinator submission view, IQA record, Teacher portfolio).', 'Coordinator, IQA, Teacher', 'Compact legend wherever the colours appear.', 4],
  ['all', 'M', 'nav', 'Breadcrumbs are missing from most detail pages; only 102 of 372 screens have one.', 'Detail pages in every staff view', 'Breadcrumb on every detail page.', 3],
  ['all', 'M', 'nav', 'Global search has no "/" shortcut, no recent searches, and results aren\'t grouped by type in every view.', 'All staff views', 'Typeahead grouped by type, "/" to focus, recent searches.', 3],
  ['all', 'L', 'con', 'Month names render as "Sept" (browser en-GB) while every other month is three letters ("Oct"). House style is "14 Oct 2026".', 'All dates in September', 'Format dates with a fixed month list.', 2],
  ['all', 'L', 'con', 'A few amounts show without pence (e.g. "£350" in Finance dashboard KPI notes, learner payment messages and System Configuration).', 'Finance dashboard, Messages, System Configuration', 'Always "£1,250.00" / "AED 5,800.00".', 2],
  ['all', 'L', 'con', 'The TBD tag\'s tooltip says only "Pending client confirmation", and in some places the tag sits inside a button and squashes its label.', 'All views', 'One amber tag with the tooltip "Pending client confirmation — behaviour may change", always next to a control, never inside it.', 2],
  ['all', 'L', 'a11y', 'Row checkboxes are labelled "Select row" without naming the row, so screen-reader users can\'t tell rows apart.', 'Any table with bulk select (IQA records, Agency learners, queues)', 'Label as "Select SUB-1003" etc.', 5],
  ['all', 'L', 'mob', 'Filters open inline above the table, which pushes the results below the fold on a phone.', 'All data tables', 'Bottom-sheet filters on phones, with a "Showing 12 of 148" summary.', 5],
  // ---------- Learner ----------
  ['learner', 'H', 'ph', 'Variant E\'s "Viewing as: Teacher (staff)" option opens a dead-end page: "The staff side of the LMS is outside this prototype". The Teacher portal now exists.', 'Learner header (variant E, Tom Whitfield)', 'Link the option to the Teacher portal as Tom.', 3],
  ['learner', 'M', 'nav', 'The sidebar has 17 items with no groups. Phone bottom bar: Home, Courses, Assignments, Messages; Payments, Certificates and Calendar are hidden behind the menu.', 'Learner shell', 'Group the sidebar (Learn / Progress / Account) and add a "More" sheet on phones.', 3],
  ['learner', 'M', 'cla', 'Jargon without explanation: NVQ, Learning Outcome, Criterion, RAG, PD, "Added to PD", IQA, Batch.', 'Courses, Assignments, Progress & Gap Analysis', 'Glossary tooltips with a dotted underline.', 4],
  ['learner', 'M', 'con', 'Certificates has 5 primary buttons (one per card); Browse Courses has 5.', 'Certificates, Browse Courses', 'One primary per card section, the rest secondary.', 2],
  ['learner', 'L', 'cla', 'Reassurance copy is uneven: Undo says "Undo" but not how long you have; resubmission doesn\'t say only the highlighted answers need changing.', 'Assignment submit, resubmission', 'Add the reassurance lines from §B3.8.', 4],
  // ---------- Super Admin ----------
  ['admin', 'H', 'nav', 'The sidebar has 35 items in 11 groups, with no "More" and no frequency ordering; Notifications has no sidebar item.', 'Super Admin console', 'Order by frequency, put rare items under "More", add Notifications.', 3],
  ['admin', 'M', 'a11y', '28 icon-only "+" buttons in the programme builder have no accessible name.', 'NVQ Programmes → structure (also Academic Admin)', 'aria-label "Add module to U301" etc.', 5],
  ['admin', 'M', 'cla', 'Dashboard "My approvals" lists items by bucket; the oldest item isn\'t highlighted.', 'Super Admin dashboard', '"Oldest awaiting you" first, with one action button.', 3],
  // ---------- System Admin ----------
  ['sys', 'M', 'nav', 'Sees the same 35-item sidebar as Super Admin, including areas where most actions are blocked, so they discover limits by clicking.', 'System Admin console', 'Mark read-only areas in the sidebar, or explain on arrival.', 3],
  ['sys', 'L', 'cla', 'The difference between "Raised by me" and "Escalated to Super Admin — read-only" is only explained on the screen index.', 'System Admin dashboard', 'Inline one-line explanation under each heading.', 4],
  // ---------- Academic Admin ----------
  ['aca', 'M', 'nav', 'Two calendar items ("Scheduling" and "Calendar Monitoring") sit next to each other with overlapping purpose.', 'Academic Admin sidebar', 'Clearer labels and one-line descriptions on each page.', 3],
  ['aca', 'M', 'mob', 'Programme version history and criteria mapping tables need sideways scrolling on a phone.', 'NVQ Programmes, Assignments & Criteria Mapping', 'Card layout under 640px.', 5],
  // ---------- Finance ----------
  ['fin', 'M', 'con', 'Overdue & Access shows 8 primary buttons ("Restore access" on every row).', 'Finance → Overdue & Access, also the dashboard table', 'One visible row action; the rest in the "⋯" menu.', 2],
  ['fin', 'M', 'cla', 'The Finance sidebar label "Agency Payments & Invoice Purchases" is long and wraps on laptops.', 'Finance sidebar', 'Shorter label ("Agency payments").', 3],
  ['fin', 'L', 'sta', 'The dashboard KPI note shows "£" amounts without pence.', 'Finance dashboard', 'Money format.', 2],
  // ---------- Business Admin ----------
  ['biz', 'M', 'nav', '"Bundles & Pricing" (Business Admin) is the same screen as "Bundles & Licences" (Super Admin).', 'Business Admin sidebar', 'One name.', 3],
  ['biz', 'L', 'cla', 'The difference between below-minimum price approval and the "Waiting on others" list isn\'t explained.', 'Business Admin dashboard', 'One-line explanation and status tooltip.', 4],
  // ---------- IQA ----------
  ['iqa', 'M', 'nav', 'No dashboard: IQA lands on Assessment Records, with no "Needs your attention" (open findings awaiting the assessor, sample sets in progress).', 'IQA', 'IQA dashboard following the template.', 3],
  ['iqa', 'L', 'cla', 'Ink colours (black/red/amber) in the record reader have no legend.', 'IQA record reader', 'Legend.', 4],
  // ---------- Coordinator ----------
  ['coord', 'H', 'ph', 'Choosing "Teacher" in the header Role select opens "Teacher portal — not yet built". The Teacher portal exists.', 'Coordinator header (multi-role coordinator)', 'Switch to the Teacher portal as that person.', 3],
  ['coord', 'M', 'nav', 'The sidebar has 15 items with no groups; "Needs attention" is below the batch cards.', 'Coordinator', 'Group the sidebar; dashboard template.', 3],
  // ---------- Teacher/Assessor ----------
  ['staff', 'M', 'con', 'The Marking Queue shows 12 primary "Mark" buttons; the dashboard shows 4.', 'Teacher', 'One primary ("Start marking (oldest first)"); row actions secondary.', 2],
  ['staff', 'M', 'nav', 'The sidebar has 18 items with no groups.', 'Teacher', 'Group: Marking / Learners / Delivery / Communication / Me.', 3],
  ['staff', 'M', 'cla', 'The Marking Workspace has no keyboard shortcuts and no "?" help; there\'s no "Save & next".', 'Marking Workspace', 'Shortcuts, help overlay, Save & next (no change to marking rules).', 5],
  // ---------- Agency ----------
  ['agy', 'M', 'nav', 'The dashboard leads with bundle cards; "Needs attention" comes third.', 'Agency dashboard', 'Dashboard template.', 3],
  ['agy', 'M', 'con', 'Buy Bundles shows 6 primary buttons (one per product).', 'Agency → Buy Bundles', 'One primary per product card is fine, but only the recommended one is blue.', 2],
  ['agy', 'L', 'sta', 'Empty certificate tabs ("Expiring in 30 days", "Revoked") give no next action.', 'Agency certificates, learner → certificates tab', 'Empty-state pattern.', 2],
  // ---------- Workplace Contact ----------
  ['wpc', 'L', 'a11y', 'Footer link buttons ("Privacy notice", "Accessibility statement") are under 44px tall on phones.', 'All Workplace link pages', 'Larger hit area.', 5],
  ['wpc', 'L', 'mob', 'The demo inbox (prototype only) uses a sideways-scrolling table on phones.', 'Workplace contact inbox (demo)', 'Card list on phones.', 5],
  // ---------- Verification ----------
  ['ver', 'L', 'a11y', 'Footer link buttons are under 44px on phones.', 'Verification page', 'Larger hit area.', 5],
];
const UX_ROLES = [['all', 'All views (cross-cutting)'], ['learner', 'Learner portal'], ['admin', 'Super Administrator'], ['sys', 'System Administrator'], ['aca', 'Academic Admin'], ['fin', 'Finance Admin'], ['biz', 'Business Admin'], ['iqa', 'IQA'], ['coord', 'Academic Coordinator'], ['staff', 'Teacher/Assessor'], ['agy', 'Agency portal'], ['wpc', 'Workplace Contact link pages'], ['ver', 'Public Certificate Verification']];
const UX_NAV = [['Learner', 17, 'none', 'Home, Courses, Assignments, Messages'], ['Super Administrator', 35, '11 groups', '—'], ['System Administrator', 35, '11 groups', '—'], ['Academic Admin', 22, '8 groups', '—'], ['Finance Admin', 16, '10 groups', '—'], ['Business Admin', 13, '6 groups', '—'], ['IQA', 7, '2 groups', '—'], ['Academic Coordinator', 15, 'none', '—'], ['Teacher/Assessor', 18, 'none', 'Home, Marking, Observations, Calendar'], ['Agency', 14, 'none', 'Home, Learners, Certificates, Messages']];

const uxSev = s => chip(UX_SEV[s][0], UX_SEV[s][1]);
function uxIssueRows(list) {
  return `<div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">Severity</th><th scope="col">Area</th><th scope="col">Problem</th><th scope="col">Where</th><th scope="col">Proposed fix</th><th scope="col">Phase</th></tr></thead><tbody>${list.map(i => `<tr><td>${uxSev(i[1])}</td><td class="small nowrap">${UX_CAT[i[2]]}</td><td class="small">${esc(i[3])}</td><td class="small">${esc(i[4])}</td><td class="small">${esc(i[5])}</td><td class="small nowrap">Phase ${i[6]}</td></tr>`).join('')}</tbody></table></div>`;
}
function uxTaskRows(list) {
  if (!list.length) return '';
  return `<h3>Top tasks</h3><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">Task</th><th scope="col">Clicks now</th><th scope="col">Target</th><th scope="col">Meets target?</th><th scope="col">Path today</th></tr></thead><tbody>${list.map(t => `<tr><td class="small strong">${esc(t[1])}</td><td class="small nowrap">${esc(t[2])}</td><td class="small nowrap">${esc(t[3])}</td><td>${t[4] === 1 ? chip('Yes', 'green') : t[4] === 2 ? chip('Partly', 'amber') : chip('No', 'red')}</td><td class="small">${esc(t[5])}</td></tr>`).join('')}</tbody></table></div>`;
}
SCREENS['ux-audit'] = () => {
  const fR = ui('uxRole', 'every'), fS = ui('uxSev', 'any');
  const keep = i => (fR === 'every' || i[0] === fR) && (fS === 'any' || i[1] === fS);
  const tot = s => UX_ISSUES.filter(i => i[1] === s).length;
  const tasksMiss = UX_TASKS.filter(t => t[4] !== 1).length;
  const roles = UX_ROLES.filter(([k]) => fR === 'every' || k === fR);
  return `${pageHead('UX Audit', 'Phase 1 of the UX polish pass. What makes each role view harder to use today, rated by impact on the user. Nothing has been changed yet.')}
  <section class="card"><h2>Summary</h2>
    <div class="ux-kpis"><div><strong>${UX_ISSUES.length}</strong><span>issues</span></div><div><strong>${tot('H')}</strong><span>High</span></div><div><strong>${tot('M')}</strong><span>Medium</span></div><div><strong>${tot('L')}</strong><span>Low</span></div><div><strong>${UX_TASKS.length - tasksMiss} of ${UX_TASKS.length}</strong><span>top tasks meet target</span></div></div>
    <p class="small">How this was measured: an automated scan of ${UX_SCAN.renders} screen renders (${UX_SCAN.routes} screens at 1440px and 390px, every role) checked touch-target size, text contrast, unnamed controls, primary buttons per screen, sideways-scrolling tables, chips, breadcrumbs, empty states, and date and money formats. A manual walk-through of each role's dashboard and top tasks added the rest. Scan run ${UX_SCAN.date}.</p>
    <p class="small">What already works well: the current page is highlighted in every sidebar; every logged-in view has header search and a skip link, and every screen has exactly one page heading; no screen scrolls sideways at 320–1440px; dates use the "14 Oct 2026" pattern; currencies are never summed together.</p>
    <p class="small muted">Severity: <strong>High</strong> = blocks or misleads users, or a dead end. <strong>Medium</strong> = slows users down or is inconsistent. <strong>Low</strong> = polish.</p>
  </section>
  <section class="card"><div class="ux-filt"><div class="field"><label for="ux-r">Role view</label><select class="select" id="ux-r" data-onchange="uxF" data-k="uxRole"><option value="every">All roles</option>${UX_ROLES.map(([k, l]) => `<option value="${k}" ${fR === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="ux-s">Severity</label><select class="select" id="ux-s" data-onchange="uxF" data-k="uxSev"><option value="any">Any</option>${Object.entries(UX_SEV).map(([k, v]) => `<option value="${k}" ${fS === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div><p class="small muted" role="status">Showing ${UX_ISSUES.filter(keep).length} of ${UX_ISSUES.length} issues</p></div></section>
  ${fR === 'every' || fR === 'all' ? '' : ''}
  ${roles.map(([k, l]) => { const iss = UX_ISSUES.filter(i => i[0] === k && keep(i)), tasks = UX_TASKS.filter(t => t[0] === k); if (!iss.length && !(tasks.length && fS === 'any')) return ''; return `<section class="card ux-sec" id="ux-${k}"><h2>${l}</h2>${k === 'all' ? '<p class="small muted">These affect every role, so they\'re listed once here rather than repeated under each view.</p>' : ''}${fS === 'any' ? uxTaskRows(tasks) : ''}${iss.length ? `<h3>Issues (${iss.length})</h3>${uxIssueRows(iss)}` : `<p class="small muted">No ${fS === 'any' ? '' : UX_SEV[fS][0] + ' '}issues beyond the cross-cutting ones.</p>`}</section>`; }).join('')}
  ${fR === 'every' ? `<section class="card"><h2>Sidebar size by role</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th scope="col">Role</th><th scope="col" class="r">Sidebar items</th><th scope="col">Grouping</th><th scope="col">Phone bottom bar</th></tr></thead><tbody>${UX_NAV.map(r => `<tr><td class="small">${r[0]}</td><td class="r num">${r[1]}</td><td class="small">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Counts include the role's screen-index link. The brief suggests a "More" group above about 10 items.</p></section>
  <section class="card"><h2>Placeholders and workarounds checked</h2><ul class="small ux-list">
    <li>${chip('Still there', 'red')} Coordinator header Role → "Teacher" opens "Teacher portal — not yet built".</li>
    <li>${chip('Still there', 'red')} Learner variant E "Viewing as: Teacher (staff)" opens "outside this prototype".</li>
    <li>${chip('Still there', 'red')} The integration banner links non-System roles to a page they can't open.</li>
    <li>${chip('Already fixed', 'green')} Business Admin is first approver for link-learner requests (AQ-60xx).</li>
    <li>${chip('Already fixed', 'green')} System Admin is first reviewer for profile changes and Data Corrections (two-stage, Super Admin final).</li>
    <li>${chip('Already fixed', 'green')} Verification links and certificate QR codes open the public verification page.</li>
    <li>${chip('None found', 'green')} No other "until X view exists" routing in the code.</li></ul></section>` : ''}
  <section class="card"><h2>What happens next</h2><p class="small">Phase 2 (one design system) starts only after you approve this audit. Each later phase ends with the full regression run and an entry on the UX Changelog page.</p></section>`;
};
INP.uxF = el => { setUi(el.dataset.k, el.value); render(); };

const _idxUX = SCREENS.index;
SCREENS.index = p => _idxUX(p) + `<section class="card idx-sec"><h2>UX polish pass</h2><ul class="idx-list"><li><button class="linklike" data-go="ux-audit">UX Audit (Phase 1)</button> <span class="xs muted">· issues by role and severity, top-task click counts</span></li></ul></section>`;
