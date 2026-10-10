/* ============================================================
   Client decisions — Step 1: Change Inventory (route: cd-inventory)
   Read-only planning page. It lists every place D1–D9 will touch,
   the planned edit, and the conflicts found by the sweep.
   Nothing in this file changes behaviour anywhere else.
   ============================================================ */
const CD_DATE = '7 Oct 2026';
const CD_DEC = {
  D1: ['Commission is a bundle discount only', 'P-01, P-02', 'Apply'],
  D2: ['Commission threshold', '—', 'Held'],
  D3: ['IQA-only sampling; Coordinator bulk export', 'P-03', 'Apply'],
  D4: ['Deposit retained after 28 days unpaid', 'P-04', 'Apply'],
  D5: ['Observation criteria never met through assignments', 'P-06', 'Apply (mapping rule only)'],
  D6: ['Currency', '—', 'Held'],
  D7: ['Profile changes need System Admin approval', 'P-11', 'Apply (tags only)'],
  D8: ['Super Administrator actions need no approval', 'P-13', 'Apply'],
  D9: ['Purple only for "Added to PD"', '—', 'Apply'],
};
const CD_CHG = { Remove: 'red', Modify: 'amber', Add: 'green', Verify: 'grey', Keep: 'blue' };

// [decision, change, kind, item, where, planned edit]
const CD_ITEMS = [
  // ---------- D1 ----------
  ['D1', 'Remove', 'Dashboard alert', '"Commission threshold crossed (TBD P-01)" → AQ-1017', 'a-dashboard · admin-a.js:61', 'Delete the alert row.'],
  ['D1', 'Modify', 'Dashboard list', '"Awaiting me" counts treat type "Commission" as a final-approver item', 'a-dashboard · admin-a.js:13, :35', 'Drop the Commission conditions. Other item types unchanged.'],
  ['D1', 'Remove', 'Queue filter', 'Type option "Commission"', 'a-queue · admin-a.js:75', 'Delete the option.'],
  ['D1', 'Remove', 'Queue filter / status', 'Status "Held" — used only by commission (AQ-1017, the Hold action)', 'admin-a.js:84, :139, :160 · admin-core.js:218 · admin-data.js:307', 'Delete "Held" from filter options, action labels, tone map and open-status list.'],
  ['D1', 'Keep', 'Queue status', 'Status "Paid/Processed"', 'agency.js:85 (AQ-5003), finance.js:74 (AQ-2007), :287, :343', 'Kept — agency invoice purchases use it too.'],
  ['D1', 'Remove', 'Queue item detail', 'case "Commission": attributed learners, rate, basis; Approve / Hold / Reject-Query / Mark as Paid/Processed', 'a-queue item · admin-a.js:112, :120, :139 (hold, paid)', 'Delete the branch and the commission-only "hold"/"paid" actions.'],
  ['D1', 'Remove', 'Routing table ("Who approves what")', 'Row "Commission (TBD P-01/P-02) · System (threshold crossed) · Super Admin · Reminder"', 'a-queue · admin-a.js:96', 'Delete the row.'],
  ['D1', 'Remove', 'Mock record', 'AQ-1017 Commission — Gulf Care Recruitment Q3 (Held)', 'admin-data.js:155', 'Delete.'],
  ['D1', 'Remove', 'Mock record', 'AQ-1018 Commission — BrightCare Q2 (Paid/Processed)', 'admin-data.js:156', 'Delete.'],
  ['D1', 'Modify', 'Sidebar', '"Referrals & Commission"', 'Super/System Admin sidebar · admin-core.js:10', 'Rename to "Referrals".'],
  ['D1', 'Modify', 'Page title', 'pageA("Referrals & Commission") and section comment', 'a-referrals · admin-c.js:87, :91', 'Rename to "Referrals". No breadcrumb exists on this page.'],
  ['D1', 'Remove', 'Tab + settings', '"Commission settings" tab: basis, rate, threshold table, "If commission is only a bundle discount…" TBD note, "no commission dashboard" line', 'a-referrals..commission · admin-c.js:90, :94', 'Delete the tab and its body. There is no separate "Set commission threshold" modal; the thresholds are inline inputs in this tab.'],
  ['D1', 'Add', 'Copy', 'Plain explanation line', 'a-referrals (all tabs, under the title)', '"Referral codes record who introduced a learner. Agents and Welfare Buddies receive no payment; agency savings come from bundle pricing at checkout."'],
  ['D1', 'Keep', 'Screen', 'Referral codes: generate, disable, extend, copy; Attribution; Settings tab', 'admin-c.js:92–100', 'Unchanged.'],
  ['D1', 'Remove', 'Screen index', 'Link "Approvals item — commission (held)"', 'a-index · admin-c.js:250', 'Delete.'],
  ['D1', 'Verify', 'Role description', '"Final approver of commission"', 'Not found in the prototype', 'Nothing to remove.'],
  ['D1', 'Remove', 'System Admin', 'Regex that strips the commission alert from the System Admin dashboard', 'sysadmin.js:103', 'Delete (dead once the alert is gone).'],
  ['D1', 'Modify', 'System Admin', 'Queue filter hides type "Commission" and "Super Admin own action"', 'sysadmin.js:108', 'Drop the Commission part only. The Super Admin own action filter stays.'],
  ['D1', 'Modify', 'System Admin', 'a-referrals wrapper: commission-tab denial, tab-strip regex, "Referrals & Attribution" rename, "Commission settings are for Super Administrators only (TBD P-01)" line', 'sysadmin.js:196', 'Delete the denial, regex and lock line. The page shows "Referrals" as for Super Admin.'],
  ['D1', 'Remove', 'Demo control', 'Edge-state button "Commission via URL" (permission denied)', 'System Admin demo panel · sysadmin.js:263', 'Delete.'],
  ['D1', 'Remove', 'Screen index ("differences")', 'Row "Commission settings and items (TBD P-01/P-02)"', 'a-index as System Admin · sysadmin.js:273', 'Delete.'],
  ['D1', 'Modify', 'Code comment', 'Header comment "no commission"', 'sysadmin.js:3', 'Remove the phrase (not user-visible).'],
  ['D1', 'Modify', 'Business Admin', '"Commission belongs to the Super Administrator and isn\'t shown here."', 'Referrals & Attribution · business.js:449 (and comment :444)', 'Delete the sentence. The "owner not named in the SRS" TBD stays.'],
  ['D1', 'Modify', 'Business Admin', '"Attribution counts only — no commission figures."', 'Business reports → Referrals tab · business.js:502', 'Change to "Attribution counts only."'],
  ['D1', 'Verify', 'Business Admin hard rules', 'Commission bullet', 'No in-app hard-rules list exists for Business Admin', 'Nothing further to change.'],
  ['D1', 'Modify', 'Agency', '"Commission figures are never shown here."', 'Agency referral card · agency.js:416', 'Reword to "Commission is a bundle discount only — no payouts exist."'],
  ['D1', 'Verify', 'Finance hard rule', '"No commission screens/payouts"', 'Not found — finance.js has no commission text', 'Nothing to reword. See conflict C6.'],
  ['D1', 'Verify', 'Notifications', 'Commission notifications', 'None exist in any view', 'Nothing to delete.'],
  ['D1', 'Verify', 'Search term', '"payout"', 'No matches', '—'],
  // ---------- D3 ----------
  ['D3', 'Verify', 'TBD tag', 'P-03 tag in the IQA view', 'Not found — no "P-03" anywhere', 'Nothing to remove. Selection is already IQA-only (iqa.js:167, :266).'],
  ['D3', 'Verify', 'Sampling controls', 'Selecting work for IQA sampling outside IQA', 'Academic, System, Super Admin, Coordinator, Assessor', 'None found. staff.js:649 already says "Sampling selection isn\'t available to assessors."'],
  ['D3', 'Add', 'Button', '"Bulk export" header action', 'My Batches → batch detail · c-batches.{code} · coord.js:381', 'Opens the modal pre-scoped to that batch.'],
  ['D3', 'Add', 'Button', '"Bulk export" toolbar action', 'Submissions & Feedback · c-submissions · coord.js:432', 'Opens the modal pre-filled with the current filter, limited to own batches.'],
  ['D3', 'Add', 'Modal', 'Bulk export: scope, contents, locked exclusions, format, redact [TBD], confirm', 'coord.js (new ACT)', 'Batch picker lists my batches only. Observation records [TBD], PD outcomes [TBD] and Redact [TBD] are off by default. IQA findings, IQA advisory notes, finance data and admission documents are locked out.'],
  ['D3', 'Add', 'Toast + notification', '"Preparing export" → "Export ready" with download link', 'Reuses the ACT.cooPdf pattern · coord.js:644', 'Notification goes to STORE.coo.notifs.'],
  ['D3', 'Add', 'Audit entry', '"Coordinator bulk export" — who / when / batches / options', 'cooLog → ADMIN.audit · coord.js:169 → a-audit (admin-c.js:209)', 'Shown in Super Admin → Audit & Security Logs.'],
  ['D3', 'Add', 'Screen index', 'Coordinator "Bulk export"', 'c-index · coord.js:654', 'Link opens Submissions & Feedback with the dialog open.'],
  ['D3', 'Verify', 'Coordinator hard rule', '"No IQA sampling selection or export [TBD P-03]"', 'Not found in the prototype', 'See conflict C6.'],
  ['D3', 'Keep', 'Coordinator learner record', '"Not shown to Academic Coordinators: … IQA findings (TBD IQA visibility)"', 'c-learner · coord.js:409', 'Unchanged.'],
  // ---------- D4 ----------
  ['D4', 'Modify', 'Deposit card (unpaid)', 'Add 28-day notice above "Pay deposit" and a mandatory tick-box; button disabled with explanatory tooltip until ticked', 'Admission & Documents · screens-b.js:35', 'As written in D4.'],
  ['D4', 'Modify', 'Deposit card (held)', '"If the balance isn\'t paid by the end of the hold: (TBD P-04 · deposit outcome)"', 'screens-b.js:38', 'Replace with "…your seat is released and the deposit is not refunded." Remove the P-04 tag. Add the [TBD] cancel/reject refund line.'],
  ['D4', 'Modify', 'Pay-deposit entry points', 'Dashboard "Pay deposit" action and Payments row "Pay now" call the same handler', 'screens-a.js:50 · screens-c.js:131 · ACT.payDeposit screens-b.js:82', 'If not yet ticked, the handler first shows the same notice + tick-box, so a deposit can never be paid unticked.'],
  ['D4', 'Add', 'Deposit card (expired)', '"Seat released — deposit retained" banner state', 'screens-b.js depositCard()', 'This state does not exist today. See conflict C3.'],
  ['D4', 'Modify', 'Mock record', 'DEP-303 Rohan Menon — "Seat released – unpaid"', 'f-deposits · finance.js:53', '→ "Seat released — deposit retained". See conflict C1.'],
  ['D4', 'Modify', 'Status chip', '"Seat released – unpaid" + tbd("P-04 refunded / retained")', 'f-deposits · finance.js:428', 'New label, same amber tone, tag removed.'],
  ['D4', 'Modify', 'Row action', '"Raise deposit refund" on Seat held and Seat released rows', 'f-deposits · finance.js:429', 'Remove for retained rows only. Kept on Seat held.'],
  ['D4', 'Modify', 'Filter', '"Released" bucket (startsWith "Seat released")', 'f-deposits · finance.js:427', 'Rename the bucket to "Retained".'],
  ['D4', 'Modify', 'Report', 'Deposits report buckets: Seat held / Balance paid / Seat released – unpaid / Refunded', 'Finance reports · finance.js:542', '"Retained" becomes its own bucket.'],
  ['D4', 'Add', 'TBD note', '"Deposit refunded when the Academy cancels the batch or rejects admission."', 'f-deposits', 'New [TBD] line (held item 5).'],
  ['D4', 'Verify', 'Learner 360 → Payments', 'Deposit row shows status Paid / Pending only', 'a-learner…payments · admin-a.js:361', 'No released status in learner data. Wording applies only if a retained deposit is added there (C3).'],
  ['D4', 'Remove', 'Screen index (TBD register)', '"P-04 Deposit if balance unpaid"', 'Learner screen index · screens-d.js:200', 'Delete the entry (resolved).'],
  ['D4', 'Keep', 'Mock record', 'DEP-305 Anjali Nair — refund approved (AQ-2010, applicant withdrew)', 'finance.js:53, :77', 'Not a seat-released deposit, so it is untouched.'],
  // ---------- D5 ----------
  ['D5', 'Modify', 'NVQ builder', '"Observation criteria mapped to assignment questions? (TBD P-06)"', 'a-programmes → Hierarchy · admin-b.js:141', 'Replace with the rule line and remove the tag.'],
  ['D5', 'Add', 'Mapping matrix', 'Observation criteria of the assignment\'s unit shown as disabled, lock icon, tooltip', 'a-assignments.{id}.mapping · admin-b.js:176', '"Observation criteria are assessed only by observation, never through assignments." Checkboxes disabled.'],
  ['D5', 'Modify', 'Coverage analytics', 'Observation rows show plain "Observation"', 'a-assignments coverage · admin-b.js:189–195', 'Show "Covered by observation" and add a KPI. The publish-blocking warning already counts Knowledge only (verify).'],
  ['D5', 'Verify', 'Academic Admin coverage', 'Programme coverage table and draft-programme publish check', 'academic.js:378, :627, :719', 'Already Knowledge-only ("not observation criteria"). Add a "Covered by observation" column only if a count is shown there.'],
  ['D5', 'Verify', 'Mock mappings', 'Any observation criterion mapped to a question', 'data.js:158–210', 'None. All 19 mapped criteria are Knowledge; the observation LO criteria (301 2.1–2.3, 302 2.1, 302 2.4, 306 3.1) are unmapped. Nothing to delete.'],
  ['D5', 'Verify', 'Assessor marking workspace', 'Criteria listed per question', 'staff.js marking workspace', 'Follows the mapping data; no Observation criteria appear.'],
  ['D5', 'Verify', 'Coordinator content', 'Knowledge coverage note', 'c-modules · coord.js:563', 'Already Knowledge-only. Unchanged.'],
  // ---------- D7 ----------
  ['D7', 'Remove', 'TBD tag', 'tbd("P-11") on Personal details', 'Learner Profile & Settings · screens-d.js:83', 'Tag only. Behaviour unchanged.'],
  ['D7', 'Remove', 'TBD tag', 'Queue items of type "Learner profile change" carry tbd "P-11"', 'admin-data.js:291', 'Tag only.'],
  ['D7', 'Remove', 'TBD tag', 'Routing row "Learner profile change (TBD P-11)"', 'a-queue routing table · admin-a.js:92', 'Tag only.'],
  ['D7', 'Remove', 'Screen index (TBD register)', '"P-11 profile change approval"', 'Learner screen index · screens-d.js:200', 'Delete the entry.'],
  ['D7', 'Keep', 'Warning + TBD', 'Identity-field warning "(TBD P-11 vs FR-ADM-24-01a)"', 'System Admin queue item · sysadmin.js:137', 'Unchanged (held item 4).'],
  // ---------- D8 ----------
  ['D8', 'Modify', 'Routing table', '"Super Admin\'s own actions (TBD P-13) · No approval · —"', 'a-queue · admin-a.js:96', '→ "No approval — applied immediately (reason + audit + FYI notification)". Tag removed.'],
  ['D8', 'Modify', 'Routing table', '"Refund · raised by Finance Admin or Super Admin · Another Finance Admin"', 'admin-a.js:95', 'Raised by "Finance Admin". The Super Admin case is covered by the own-actions row.'],
  ['D8', 'Remove', 'Banner text', '"Exception for Super Admin own actions: (TBD P-13)" inside the self-approval note', 'a-queue item · admin-a.js:124', 'Remove the exception clause. The banner stays for other roles.'],
  ['D8', 'Remove', 'TBD tag', '"Super Administrator actions take effect without an approval step. (TBD P-13)"', 'admin-a.js:126 · AQ-1019 admin-data.js:157', 'Tag only. AQ-1019 also gets the audit tag.'],
  ['D8', 'Modify', 'Raise flow', 'Data correction from Learner 360 → Pending, first review Owen Price', 'admin-a.js:292', 'Super Admin: mandatory reason → applied immediately (original kept in history), audit "Super Admin — no approval required", FYI to System Admins + marking assessor.'],
  ['D8', 'Modify', 'Raise flow', 'Refund from Finance module → "routed to another Finance Admin"', 'a-finance · admin-c.js:139', 'Super Admin: confirmation modal with mandatory reason → Processed, toast "Refund processed", audit tag, FYI to all Finance Admins.'],
  ['D8', 'Modify', 'Raise flow', 'Bundle price below minimum raised by Super Admin → Pending (System Admin)', 'admin-c.js:83 · business.js:427 (when acting as Super Admin)', 'Applied immediately with reason, audit tag, FYI to System Admins.'],
  ['D8', 'Modify', 'Mock record', 'AQ-1006 Data correction raised by the signed-in Super Admin — Pending (self-approval demo)', 'admin-data.js:146 · audit admin-data.js:176', '→ Applied, with history and audit entry tagged "Super Admin — no approval required". See conflict C2.'],
  ['D8', 'Modify', 'Mock record', 'AQ-1013 Refund raised by the Super Admin in variant C — Pending', 'admin-data.js:151 · admin-c.js:125 · finance.js:80', '→ Processed + audit + FYI. See conflict C2.'],
  ['D8', 'Modify', 'Mock record', 'AQ-2003 Refund raised by Nadia Qureshi — Pending Finance A (Awaiting me)', 'finance.js:70', '→ Processed, out of "Awaiting me", FYI "Refund processed by Super Administrator Nadia Qureshi — reason: …". See conflict C1.'],
  ['D8', 'Modify', 'Screen index', '"Approvals item — self-approval blocked" (AQ-1006) and "Variant C — self-approval refund"', 'a-index · admin-c.js:250, :251, :258', 'Relabel to the new behaviour, e.g. "Super Admin Data Correction — applied immediately".'],
  ['D8', 'Modify', 'Demo panel', 'Variant C caption "shows self-approval block on refunds"', 'admin-core.js:175', 'Caption updated to the new behaviour.'],
  ['D8', 'Modify', 'Screen index ("differences")', 'Row "Super Admin actions without approval (P-13)"', 'sysadmin.js:273', 'Updated text, tag removed.'],
  ['D8', 'Keep', 'Self-approval blocks', 'Finance (AQ-2001), Academic (AQ-4008), Business (AQ-6003), System Admin (AQ-8005)', 'finance.js:243 · academic.js:281 · business.js:221, :226 · sysadmin.js:149', 'Unchanged. Finance A → Finance B path (AQ-2001/AQ-2002) intact.'],
  ['D8', 'Keep', 'Overrides', 'Super Admin override of others\' decisions (AQ-1021, AQ-2005, AQ-8003)', 'admin-a.js:121–125 · finance.js:283 · sysadmin.js:17', 'Unchanged.'],
  ['D8', 'Keep', 'Raised by others', 'Data Corrections AQ-1004, AQ-1005, AQ-7001, staff raise flow', 'admin-data.js · iqa.js:72 · staff.js:427', 'Keep System Admin first review → Super Admin final.'],
  ['D8', 'Verify', 'Finance rule 7', '"Refunds need another Finance Admin" rule text', 'No numbered rules list in the app', 'Help text lives in the routing table and toasts listed above. See conflict C6.'],
  // ---------- D9 ----------
  ['D9', 'Add', 'CSS', '.coord → 1px var(--line-2), left 4px var(--grey), bg var(--surface-2); .coord .c-h → var(--fg)', 'styles.css (original :363–364 kept); new "Client decisions update" block', 'Override only.'],
  ['D9', 'Add', 'CSS', '.coord .muted → #4B5563', 'New block', 'The byline in every coordinator box is muted text. #6B7280 on #F3F4F6 is 4.39:1 (fails); #4B5563 is 6.87:1.'],
  ['D9', 'Add', 'CSS', '.iqa-badge → border #0F766E, text #115E59, bg #F0FDFA', 'New block (original :874 kept)', 'Text 7.27:1, border 5.25:1 — pass.'],
  ['D9', 'Add', 'CSS', '.iqa-finding → border #99F6E4, left 4px #0F766E', 'New block (original :876 kept)', 'Left border 5.47:1 on white.'],
  ['D9', 'Modify', 'Chip (JS)', 'chip("Coordinator feedback", "purple") on the learner assignment list', 'screens-a.js:157', '→ grey. See conflict C4.'],
  ['D9', 'Modify', 'Note (JS)', 'IQA note in the marking workspace, b-purple', 'staff.js:308', '→ teal IQA style. See conflict C4.'],
  ['D9', 'Modify', 'Dashboard alert (JS)', '"New IQA finding on my work", purple', 'Teacher dashboard · staff.js:266', '→ teal IQA style. See conflict C4.'],
  ['D9', 'Modify', 'Note (JS)', '"IQA findings" tab note, b-purple', 'a-records..iqa · admin-b.js:327', '→ teal IQA style. See conflict C4.'],
  ['D9', 'Keep', 'PD purple', '"Added to PD" five-state colour, f-purple, .pd-tag, --ev-pd calendar events, PD rework note', 'core.js:115, :132 · styles.css:250, :365 · :41 · screens-b.js:308', 'Unchanged.'],
  ['D9', 'Add', 'Design System page', 'Colour legend entries for Coordinator feedback and IQA findings', '—', 'The page does not exist. See conflict C5.'],
];

// Blocking conflicts — need an answer before Step 2
const CD_CONFLICTS = [
  ['C1', 'D4 × D8', 'DEP-303 (Rohan Menon) is both the only "Seat released" deposit (D4: becomes retained, no refund anywhere) and the subject of AQ-2003, a refund raised by the Super Admin (D8: becomes Processed). It cannot be both retained and refunded.',
    'A (recommended): D8 wins for the record — AQ-2003 Processed, DEP-303 Refunded as a Super Admin goodwill exception. Add one new mock deposit (new ID) in "Seat released — deposit retained" so the D4 state is visible. B: D4 wins — DEP-303 retained; AQ-2003 is rejected (needs an actor and reason). Both options change or add a record that Part B does not name exactly.'],
  ['C2', 'D8', 'Two demos exist only to show the Super Admin self-approval block: AQ-1006 (default Super Admin — "Approvals item — self-approval blocked" on the admin index) and variant C (Super + Finance) with AQ-1013. After D8 both apply immediately, so the demos lose their purpose. Variant C is also a Finance Admin: is a refund she raises a Super Admin action (immediate) or a Finance Admin action (needs another Finance Admin)?',
    'Recommended: treat any item raised by a holder of the Super Administrator role as a Super Admin action (immediate). Relabel the two index links and the variant C caption to show the new behaviour. Confirm.'],
  ['C3', 'D4', 'The learner portal has no expired-deposit state to rename. The deposit card shows only Unpaid, Held, or "Paid by instalment plan". Learner 360 shows Paid / Pending only.',
    'Recommended: add the "Seat released — deposit retained" state to the deposit card (same banner component), reachable from one new demo-panel control. Needs approval because it adds a state and a control.'],
  ['C4', 'D9', 'Purple carries the coordinator and IQA meaning in four places that are not the named selectors (screens-a.js:157, staff.js:266, :308, admin-b.js:327). Purple is also a fixed status colour for non-PD statuses: Under Review, Refunded, Rescheduled, Postponed, Open, Overridden, Refund raised, Partially refunded, role chips, .role-ctx and several b-purple banners. The acceptance check "purple only where it means Added to PD" conflicts with A2.4 (keep fixed colours).',
    'Recommended: change the four coordinator/IQA carriers (they are the same meaning as .coord / .iqa-*). Leave the fixed status colours as they are and record them as a known exception, unless the client wants a separate colour pass.'],
  ['C5', 'Step 3, D9.5, A3.1', 'The prototype has no UX Changelog page, no Design System page and no Demo Scenarios panel. Only the Phase 1 UX Audit (ux-audit) and the per-role demo panels exist.',
    'Recommended: create the Client Decisions Log (asked for anyway) and record the changelog entries there. Skip the Design System legend until that page exists. Run the regression check against the existing demo-panel variants and edge-state buttons instead of numbered scenarios.'],
  ['C6', 'D1.4, D3.4, D8 Finance', 'The in-app hard-rules lists named in Part B ("No commission screens/payouts", "No commission figures", "No IQA sampling selection or export [TBD P-03]", Finance rule 7) and a Coordinator cross-view sync table don\'t exist in the prototype. The only in-app equivalents are the Agency referral sentence (agency.js:416) and the Business notes.',
    'Recommended: reword only the in-app equivalents listed above, and record the new rule wording in the Client Decisions Log. Don\'t add new hard-rules panels.'],
  ['C7', 'D1 acceptance', 'The UX Audit page (ux.js:48) quotes the old label "Referrals & Commission" as an example of inconsistent naming. Business Admin keeps "Referrals & Attribution" (sidebar and page), which D1 does not rename.',
    'Recommended: leave the audit text as a dated historical record and leave the Business label. Both need the client\'s OK, because "commission" would still appear once on the audit page.'],
];

const CD_HELD = [
  ['D2', 'Commission threshold', 'Possible future "Discount change → Super Admin" route. Nothing built. Commission threshold UI is removed under D1 only.'],
  ['D5b', 'Observation at the Academy office', 'No location types or office routing added.'],
  ['D6', 'Currency', 'Pricing screens and every P-07 tag unchanged: admin-b.js:103, :110 · business.js:396, :407 · finance.js:398, :513. The code tags currency as P-07, not P-06.'],
  ['—', 'Identity-field route (name / DOB)', 'Warning and "P-11 vs FR-ADM-24-01a" tag kept (sysadmin.js:137).'],
  ['—', 'Deposit refund when the Academy cancels or rejects', 'Kept as the new [TBD] lines added by D4. Existing cancel-batch refunds (academic.js:592) unchanged.'],
];

// Matches from the sweep that no decision covers — proposed: leave as is
const CD_UNCOVERED = [
  ['threshold', 'Attendance thresholds (admin-b.js:293–307, staff.js:597, admin-data.js:209); marking backlog alert (academic.js:110); Agency "≤10% threshold" and "progress threshold" TBDs (agency.js:209, :238)', 'Not the commission sense.'],
  ['retained', '"Original value retained in history" (admin-a.js:129, :147; staff.js:429–643); messages "Retained and audited" (admin-c.js:172, coord.js:599, finance.js:555, staff.js:615); refund consequence "Retained" access (finance.js:369–370)', 'Different meaning. Note: Finance Refunds also uses "Retained" for access, on a different screen from the new deposit bucket.'],
  ['deposit / seat hold', 'Pricing config "Deposit minimum / Seat hold 28 days" (admin-c.js:120, admin-data.js:210, finance.js:398); "Deposit seat hold expiring" notification (finance.js:64); dashboard holds list (finance.js:216)', 'Already consistent with 28 days.'],
  ['refund', 'Finance refunds module, overrides, escalation (finance.js, ~168 matches); batch-cancel refunds (academic.js:592); learner refunded transactions (data.js); bundle refunds (admin-b.js)', 'Unchanged except the D8 records listed.'],
  ['override', 'Super Admin override flows (admin-a.js, finance.js, sysadmin.js); Academic override of recommendations (academic.js); quiz/attendance manual overrides (admin-b.js, agency.js, screens-d.js)', 'D8 keeps overrides as built.'],
  ['self-approval', 'Academic (academic.js:184–281), Business (business.js:185–226), Finance (finance.js:243), System Admin (sysadmin.js:149–160)', 'Unchanged under D8.'],
  ['Request change', 'Coordinator / Academic / Teacher content-change requests (coord.js:555, academic.js, staff.js)', 'Not profile changes.'],
  ['profile change', 'System Admin profile-change queue and edge states (sysadmin.js); learner variants (data.js)', 'Behaviour unchanged (D7).'],
  ['Paid/Processed', 'Agency invoice purchases (agency.js:85, :221; finance.js:74, :232, :287, :343; business.js:205)', 'Kept under D1.'],
  ['sampling', 'IQA sample sets, coverage helper and exports (iqa.js); "IQA sample — Unit 301" Teacher thread (staff.js:62); IQA-304 finding text (admin-data.js:167)', 'IQA-only, as D3 requires.'],
  ['.coord / "coord"', 'Most matches are the role key "coord" (routes, UX Audit roles) — not the CSS class', 'Not affected.'],
  ['P-05, P-07, P-09, P-12', 'Data residency, currency, branding, replace-document window', 'Other TBDs — kept.'],
];

const cdChg = c => chip(c, CD_CHG[c]);
function cdItemRows(list) {
  return `<div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">Change</th><th scope="col">Kind</th><th scope="col">Item</th><th scope="col">Where</th><th scope="col">Planned edit</th></tr></thead><tbody>${list.map(i => `<tr><td>${cdChg(i[1])}</td><td class="small nowrap">${esc(i[2])}</td><td class="small">${esc(i[3])}</td><td class="small mono">${esc(i[4])}</td><td class="small">${esc(i[5])}</td></tr>`).join('')}</tbody></table></div>`;
}
SCREENS['cd-inventory'] = () => {
  const fD = ui('cdDec', 'all'), fC = ui('cdChg', 'any');
  const keep = i => (fD === 'all' || i[0] === fD) && (fC === 'any' || i[1] === fC);
  const n = c => CD_ITEMS.filter(i => i[1] === c).length;
  const shown = Object.keys(CD_DEC).filter(d => fD === 'all' || d === fD);
  return `${pageHead('Client Decisions — Change Inventory', `Step 1 of applying the confirmed client decisions. Every place D1–D9 will touch, the planned edit, and the conflicts found. Nothing has been changed yet. Sweep run ${CD_DATE}.`)}
  <section class="card"><h2>Summary</h2>
    <div class="ux-kpis"><div><strong>${CD_ITEMS.length}</strong><span>items checked</span></div><div><strong>${n('Remove')}</strong><span>remove</span></div><div><strong>${n('Modify')}</strong><span>modify</span></div><div><strong>${n('Add')}</strong><span>add</span></div><div><strong>${CD_CONFLICTS.length}</strong><span>conflicts to decide</span></div><div><strong>${CD_HELD.length}</strong><span>held</span></div></div>
    <p class="small">How this was compiled: a full-text sweep of every script and the stylesheet for the Part B search terms, then a read of each match in context. Each row traces to one decision. "Verify" means the item was checked and needs no edit. "Keep" means it is close to a change but stays as it is.</p>
    <p class="small"><strong>Not yet started:</strong> Step 2 waits for answers to the conflicts below and the instruction "Proceed with Step 2".</p>
  </section>
  <section class="card"><h2>Conflicts and risks — decide before Step 2</h2><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">ID</th><th scope="col">Affects</th><th scope="col">Problem</th><th scope="col">Options / recommendation</th></tr></thead><tbody>${CD_CONFLICTS.map(c => `<tr><td class="strong nowrap">${c[0]}</td><td class="small nowrap">${esc(c[1])}</td><td class="small">${esc(c[2])}</td><td class="small">${esc(c[3])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><div class="ux-filt"><div class="field"><label for="cd-d">Decision</label><select class="select" id="cd-d" data-onchange="cdF" data-k="cdDec"><option value="all">All decisions</option>${Object.entries(CD_DEC).map(([k, v]) => `<option value="${k}" ${fD === k ? 'selected' : ''}>${k} — ${esc(v[0])}</option>`).join('')}</select></div><div class="field"><label for="cd-c">Change</label><select class="select" id="cd-c" data-onchange="cdF" data-k="cdChg"><option value="any">Any</option>${Object.keys(CD_CHG).map(k => `<option ${fC === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div><p class="small muted" role="status">Showing ${CD_ITEMS.filter(keep).length} of ${CD_ITEMS.length} items</p></div></section>
  ${shown.map(d => { const [title, res, st] = CD_DEC[d], items = CD_ITEMS.filter(i => i[0] === d && keep(i)); const held = st === 'Held'; if (!held && !items.length) return ''; if (held && fC !== 'any') return ''; return `<section class="card ux-sec" id="cd-${d}"><div class="row-b"><h2>${d}. ${esc(title)}</h2><span class="row">${res !== '—' ? `<span class="xs muted">Resolves ${res}</span>` : ''}${chip(st, held ? 'amber' : 'blue')}</span></div>${held ? '<p class="small">On hold — not implemented. See "Held — awaiting client" below.</p>' : cdItemRows(items)}</section>`; }).join('')}
  ${fD === 'all' && fC === 'any' ? `<section class="card"><h2>Held — awaiting client</h2><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">ID</th><th scope="col">Item</th><th scope="col">What stays as it is</th></tr></thead><tbody>${CD_HELD.map(h => `<tr><td class="strong nowrap">${h[0]}</td><td class="small">${esc(h[1])}</td><td class="small">${esc(h[2])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Search matches no decision covers</h2><p class="small muted">Listed so the client can confirm they are safe to leave. Proposed for all: no change.</p><div class="tbl-wrap"><table class="tbl dense ux-tbl"><thead><tr><th scope="col">Term</th><th scope="col">Where</th><th scope="col">Why it can stay</th></tr></thead><tbody>${CD_UNCOVERED.map(u => `<tr><td class="small strong nowrap">${esc(u[0])}</td><td class="small">${esc(u[1])}</td><td class="small">${esc(u[2])}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>TBD tags</h2><p class="small"><strong>To remove:</strong> P-01, P-02 (D1) · P-04 (D4) · P-06 (D5) · P-11, except the identity-field tag (D7) · P-13 (D8) · the two learner screen-index register entries for P-04 and P-11. P-03 has no tag to remove.</p><p class="small"><strong>Kept:</strong> every other tag, including P-05, P-07, P-09, P-12, "P-11 vs FR-ADM-24-01a", and all unnumbered TBDs.</p></section>` : ''}`;
};
INP.cdF = el => { setUi(el.dataset.k, el.value); render(); };

const _idxCD = SCREENS.index;
SCREENS.index = p => _idxCD(p) + `<section class="card idx-sec"><h2>Client decisions</h2><ul class="idx-list"><li><button class="linklike" data-go="cd-inventory">Client Decisions — Change Inventory</button> <span class="xs muted">· Step 1: every planned edit for D1–D9, conflicts, held items</span></li></ul></section>`;
