/* R5 — Records for the client clarifications (Oct 2026): UX Changelog entries R1–R4, the screen-index entries, and the G6.4
   amendment in the Alignment Inventory. The provisional decisions are kept in PROVISIONAL-DECISIONS.md (repository root) so later
   client confirmations can be applied without reconstructing them. Loads last. */
'use strict';

/* ---------- G6.4 amended (Alignment Inventory) ---------- */
(() => { const r = typeof FD_ROWS !== 'undefined' && FD_ROWS.find(x => x[0] === 'G6.4'); if (!r || /R3/.test(r[4])) return;
  r[4] += ' — AMENDED by the Oct 2026 client clarification (R3): "Completed when every answer is Passed or Added to PD" is superseded. Releasing feedback no longer completes an assignment; the final Pass / Fail of each assignment is declared only by its allocated Assessor, separately from criterion judgements and answer exits.';
  r[5] += ' R3: release now gives "Feedback Received" (or "Resubmission Required"); seeded "Completed" records keep their status and have no declared outcome.'; })();

UXC.push(['R1', 'Level 3 fee options (client clarification, Oct 2026)', [
  'NVQ Level 3 can have several fee options — each with a stable ID (L3-FO-001…), a label, a GBP fee, a delivery mode (Self-Paced or Fully Assisted) and an Active / Retired status. Finance → Payment Plans → Plan templates and Super Admin → Finance → Instalment plans list them with the number of learners who chose each; Add, Edit, Retire and History are audited with a reason.',
  'Who: Finance Admins and the Super Administrator (the existing payment-plan owners). Changing an existing option\'s fee stays with the Super Administrator, as for the programme fee (S4a). Others — Academic, Business, System Admin, custom roles, learners — are refused at the action and logged. No fixed list of amounts: any fee that reconciles with the Level 3 payment plan (divides into its instalments to the penny, above the deposit) is accepted.',
  'Sign-up: a learner starting Level 3 chooses one eligible option (active and reconciling; none preselected when there are several). The option, its mode and its fee are frozen into the learner\'s terms and payment plan, so editing or retiring an option never reprices anyone. Deposit, seat hold and instalments still come from the Level 3 payment plan — no option-specific payment rules. Browse shows "From" the lowest eligible fee; the agency / bundle list price (NVQ_FEES) is unchanged.',
  'Existing learners: Aisha Rahman, Priya Raman and every Level 3 learner already signed up keep their exact fee, deposit, instalments and payment history, and reference the legacy option L3-FO-STD "Standard programme fee" — its fee is the programme plan\'s fee and its delivery mode is the learner\'s batch\'s, exactly as before options existed. Level 2, 4 and 5 are unchanged.',
  'Every Level 3 programme (final review): fee options belong to each Level 3 programme by its programme ID — the Level 3 Diploma (L3-FO-…), its 2027 draft and any Level 3 programme created with the wizard (<programme ID>-FO-001…). Finance shows one options card per Level 3 programme; a learner signing up to a Level 3 programme chooses from that programme\'s options; batches, session audiences, attendance and the Self-Paced filters use that programme\'s option IDs and never mix groups of different programmes (a forced cross-programme group is refused).',
  'New NVQ programme wizard (final review): for Level 3 the single price is replaced by fee options — label, GBP fee and delivery mode, as many as needed (each must fit the payment plan\'s instalments and deposit). The programme\'s payment plan keeps its deposit and instalments; its reference fee is the lowest option fee. The wizard explains that a Level 3 learner\'s delivery mode comes from their fee option and that a batch can hold both modes; the remaining setting is only the default class pattern for new batches. The structure, offer letter, documents and payment-plan steps are unchanged. Level 2, 4 and 5 keep the single price and the default delivery mode with its P-31 wording.']]);
UXC.push(['R2', 'Mixed-mode Level 3 batches and session audiences (client clarification, Oct 2026)', [
  'One Level 3 batch can hold Self-Paced and Fully Assisted learners. A learner\'s own delivery mode comes from their fee option; legacy-option learners and roster learners without a recorded option keep their batch\'s mode. The batch\'s delivery mode (N2) is now its default and its class-plan default; batch lists and details show "Learners by delivery mode" and a Mixed tag. Add learner on a Level 3 batch records the learner\'s fee-option group (no fee is created).',
  'Sessions on a Level 3 batch can be for all participants (default — every session that existed before is treated this way) or for selected fee-option groups and / or every learner of a mode, across every batch taking part. One rule decides who is in a session: the learner\'s calendar and dashboard, Zoom access (the link is refused to anyone outside it, and to everyone once cancelled), invitations, change and cancellation notices, and the attendance register (who is listed, imported, recorded or marked absent).',
  'Changing a session\'s audience is audited with a reason; learners no longer in it lose the calendar entry and the Zoom link and get one notice. Their earlier attendance stays, read-only, under "learners no longer taking part" — they are never marked absent.',
  'Class plans (N3) in a mixed batch: both patterns are available. Classes generated by the weekly plan are for the batch\'s Fully Assisted learners; the Self-Paced planned number counts classes its Self-Paced learners can attend, and its "Add a class" proposes the Self-Paced audience. No new attendance or entitlement rule. Also fixed: a cancelled class no longer shows "Join on Zoom".']]);
UXC.push(['R3', 'Criterion judgements and the Assessor\'s final assignment outcome (client clarification, Oct 2026)', [
  'Criterion judgements: Met, Partially Met or Not Met — by Academic Coordinators (own batches, Submission page → Criterion judgements) and by Assessors (Marking workspace). Each is kept with the evaluator, role, date / time, assignment, criterion and round; a later judgement never replaces an earlier one or the other person\'s. A Coordinator\'s judgement and feedback are published to the learner at once (notified), without Assessor approval, and change no status, marking or outcome. An Assessor\'s judgements reach the learner with their marking when the Coordinator releases it (G6.3). Partially Met maps to "In Progress" on the criterion and can\'t be verified.',
  'Final outcome: Pass or Fail per assignment, declared only by the learner\'s allocated, Active Assessor in the Marking workspace, with a rationale; audited and notified to the Coordinator. Coordinators, Teachers, IQA, admins, custom roles, unallocated or suspended Assessors and multi-role users acting in another role are refused in the action itself (not only by hiding the button) and logged. Marking actions (judgement, colour, exit, verify, send) now also check the allocated assessor in the action.',
  'G6.4 amended: releasing feedback no longer sets "Completed" — the old automatic derivation (every answer Passed or Added to PD) is removed; criterion judgements and answer exits never decide the outcome. Corrections go through a Data Correction ("Final assignment outcome": System Admin first review, Super Admin final; the original stays in history).',
  'Kept unchanged: historic rounds, released feedback, verified evidence locks, IQA records, the audit, resubmission limits and earlier Coordinator comments. Seeded "Completed" assignments keep their status and have no declared outcome — none is assumed to be a Pass.',
  'Provisional (see the Provisional Decisions Register): one declaration per round; a Fail doesn\'t change status, attempts or evidence and opens no new attempt; the outcome isn\'t shown to learners or agencies until the client confirms how outcomes are published; the Super Admin has no declaration override.']]);
UXC.push(['R4', 'Self-Paced monthly assignment worklists (client clarification, Oct 2026)', [
  'Submission periods run from the 15th to the 14th; staff normally review a period\'s Self-Paced submissions from the 15th. Self-Paced learners can submit several assignments together at any time (their Assignments page says so). No automatic allocation, no marking deadline, no escalation and nothing held back by the cycle.',
  'Marking Queue (Assessor) and Submissions & Feedback (Coordinator): a Self-Paced monthly worklist summary, a "Self-Paced (monthly)" view, Mode and Monthly cycle columns and filters for delivery mode, fee-option group, learner, batch, submission status and monthly cycle.',
  'Wording corrected: marking screens (Marking Queue, Coordinator submissions, batch pipeline, Release queue, Academic Admin marking and backlog) used the Approvals Queue chip, which said "escalates to the Super Administrator" and "overdue" — no marking escalation exists. Their chip now says "N days waiting" (Self-Paced rows: "monthly cycle"). Approvals keep their real 7-day escalation wording. The Fully Assisted workflow is otherwise unchanged.',
  'Dashboards (review correction): Self-Paced submissions are no longer counted against the Fully Assisted turnaround — the Assessor\'s "Oldest waiting" and "Due back soon" (10 working days, TBD-137) and the Coordinator\'s "Awaiting marking N days" alerts and batch pipeline "Aged items" count Fully Assisted work only, unchanged for it. Self-Paced work is shown as its own figure: "Self-Paced worklist" on the Assessor dashboard and a monthly-worklist note on the Coordinator dashboard (linking to the Self-Paced view). No escalation was added.']]);
UXC.push(['R5', 'Client clarifications R1–R4 — integration and records', [
  'Cross-stage journeys are covered by the regression suite ft-r.js: fee options → sign-up on different options → a mixed batch → targeted sessions (visibility, access, attendance) → several Self-Paced submissions together → Coordinator criterion feedback → the Assessor\'s outcome → refused roles → preservation of existing fees, payments and history → persistence across admin rebuilds, identity changes and persona switches.',
  'Provisional decisions made to keep the prototype interactive are listed, with the alternative to apply once the client confirms, in PROVISIONAL-DECISIONS.md (repository root).',
  'One continuous learner journey (review correction): the marking queues read each batch\'s cohort, and a learner who signed up in the demo had no cohort entry, so their work never reached marking. Completing sign-up now adds the same kind of cohort entry the seeded demo learners have (pointing to the learner\'s own record); a released seat or a batch change moves or removes it. No history, payment, admission or assessment record is created. Demo Scenario #30 follows Daniel Okafor end to end: fee option → enrolment → mixed batch → Self-Paced class and Zoom link → Assignment 8 → Coordinator criterion feedback → the allocated Assessor\'s Pass / Fail.',
  'Still a prototype limitation: an assignment published before a learner joins the batch isn\'t copied to them (S2 copies at publish time), so the scenario publishes Assignment 8 after Daniel enrols.',
  'Demo controls (final review): "Open the 30 Demo Scenarios" is shown as soon as the panel opens (it used to appear only after the next screen change), in every portal and when signed out.']]);

UXC.push(['R5 UI review', 'Client clarifications R1–R4 — UI consistency and workflow cleanup', [
  'New NVQ programme (Level 3): the single "Price (GBP)" is no longer displayed (it was still showing because the field\'s own styling overrode "hidden"); fee options are entered in one compact row each (label · fee · mode · remove), stacked on a phone. The plan step lists each option\'s instalments and deposit; the review step and Finance lists show the fee options instead of the internal reference fee. The default class pattern is labelled separately from the learner\'s mode. Level 2, 4 and 5 are unchanged.',
  'Submissions & Feedback (Coordinator): new subtitle — review assignments, evaluate individual criteria and publish feedback directly to learners; final Pass/Fail is declared by the authorized Assessor. The Self-Paced worklist is one line with a link to its view; views wrap instead of scrolling sideways; filters form a compact grid; the table leads with learner, mode, assignment, submitted, status and days waiting (other columns stay under Columns) with a Review action. "Has my feedback" / "No coordinator feedback yet" count criterion feedback too.',
  'Assignment review (Coordinator): the "Coordinator feedback — plain written feedback only" panel is gone. Each answer is shown beside its criterion: what the learner already sees (Coordinator and Assessor, with name and date), the Coordinator\'s judgement (Met / Partially Met / Not Met) and feedback, Save draft (not visible to the learner) and Publish to learner, history, and "Publish all drafts". The written comment is kept as an optional, secondary section with earlier comments as history. No verification or Pass / Fail control for the Coordinator.',
  'Other screens: the Assessor sees the Coordinator\'s published judgement beside the criterion; shorter final-outcome text; the learner\'s card is "Feedback on each criterion" with each criterion\'s description; Level 3 batches label their mode as the default delivery mode (class pattern), also in Create batch and the Coordinator overview; the Level 3 Support tab states the learner-level rule and keeps only the still-open P-31 question; the Coordinator lock note says verification and the final Pass / Fail are done by the Assessor; on phones the floating main action of the review is "Publish all drafts".',
  'Checks: tools/harness/uicheck.sh runs clickable journeys in real 390 / 768 / 1024 / 1440 viewports with dialogs open (wizard Level 3 and 4, Add fee option, Submissions & Feedback, assignment review draft → publish, learner view, Marking Queue, workspace and Declare dialog, Add session, Demo controls) and is part of regress.sh.']]);

UXC.push(['R5 reconciliation', 'Client clarifications R1–R4 — requirements-to-UI reconciliation', [
  'Session audience (Add session / Edit session): "Who is this session for?" — all learners in the batches taking part, or only learners on the fee options ticked. Every fee option of the session\'s programme is its own checkbox (price — label · learners), grouped under Self-Paced, Fully Assisted and the standard fee from before fee options; the headings only group. Select all / Clear selection, and a summary of options selected and distinct learners. The separate "Every Fully Assisted / Self-Paced learner" choices are gone; options of other programmes never appear; a programme without options says so. Saving an edit without touching the audience keeps it.',
  'One fee-option model everywhere: each Level 3 programme page has a "Fee options" tab; sign-up groups the options the same way ("£600.00 — Self-Paced Basic"); the Level 3 payment plan marks its fee as the standard fee; batch lists say "Delivery mode (default)"; the learner\'s programme overview shows the fee option they agreed; Scenario #30\'s session step describes ticking fee options.',
  'Internal notes removed from the screen and kept in the Provisional Decisions Register: "(seeded default — not client-confirmed)" on batch delivery modes; the option ID and programme code at the top of the fee-options card.']]);
UXC.push(['R5 audiences', 'Level 3 scheduling — one audience selector and one Schedule area', [
  'Add session, Edit session, weekly recurring classes (new and edit), the limited Self-Paced "Add a class" and the scheduling console share one "Who should attend?" selector: every fee option grouped Self-Paced / Fully Assisted / Standard fee (legacy), with price, label and learner count, Select all / Clear selection and a summary. The "All learners / Only these" radio choice is removed.',
  'New sessions and plans save the fee options ticked. Existing all-participant sessions are shown with every option ticked and stay for everyone (including later joiners) until the ticks are changed. A save that changes nothing records and notifies nothing.',
  'Level 3 Schedule tab: "Add one session" and "Add weekly recurring classes" together, weekly plans and the timetable in one card, each class with its kind and audience. The separate "Session audiences" card is gone. On a phone or tablet the timetable stacks.',
  'Classes of a Level 3 batch\'s generated timetable (labelled "Batch timetable") are edited with the same selector. Saving the same ticks keeps the existing date or teacher edit. Changing the ticks gives that class its own session record and audience.']]);
UXC.push(['R5 scheduling', 'Level 3 class patterns and weekly scheduling', [
  'Level 3 programmes: the wizard no longer asks for a default class pattern or delivery mode. Each learner\'s mode comes from their fee option. The Support tab is now "Observation fee rate". Levels 2, 4 and 5 are unchanged.',
  'Weekly class plans (Level 3): "Who should attend these weekly classes?" lists every fee option of the programme, grouped Self-Paced / Fully Assisted (standard fee separately), with Select all / Clear selection and a summary. The plan and each class it generates store the option IDs.',
  'A batch can have several weekly plans ("Add a weekly plan"), each with its own day, time and audience. The existing preview and conflict checks apply. Editing an audience changes only classes that haven\'t started; registers and history are kept.',
  'Batch screens show the batch\'s stored mode only as "Delivery mode for standard-fee learners".']]);

/* ---------- Screen index ---------- */
const R5_SEC = items => `<section class="card idx-sec"><h2>Client clarifications (Oct 2026)</h2><ul class="idx-list">${items.join('')}</ul></section>`;
const _aIdxR5 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxR5(p) + R5_SEC([
  chIdxLi('Finance → Instalment plans → Level 3 fee options', { act: 'aJump', t: 'a-finance..plans' }, 'R1 — add, edit and retire Level 3 fee options; learners keep the option they agreed.'),
  chIdxLi('Batch → Schedule → session audiences (mixed batch)', { act: 'aJump', t: 'a-batches.L3AC-NOV26-LEI.schedule' }, 'R2 — learners by mode, targeted sessions, both class-plan patterns.'),
  chIdxLi('Assessment Records — final outcomes declared', { act: 'aJump', t: 'a-records' }, 'R3 — Pass / Fail declared by Assessors; nothing derived from "Completed".')]);
const _tIdxR5 = SCREENS['t-index'];
SCREENS['t-index'] = p => { const h = _tIdxR5(p); return hasRole('Assessor') ? h + R5_SEC([
  chIdxLi('Marking Queue — Self-Paced monthly worklist', { act: 'goTok', t: 't-queue' }, 'R4 — Self-Paced view, mode / group / cycle filters; no marking escalation.'),
  chIdxLi('Marking workspace — judgements and final outcome', { act: 'goTok', t: 't-queue' }, 'R3 — Met / Partially Met / Not Met; declare Pass or Fail for your allocated learners.')]) : h; };
const _cIdxR5 = SCREENS['c-index'];
SCREENS['c-index'] = p => _cIdxR5(p) + R5_SEC([
  chIdxLi('Submissions & Feedback — Self-Paced worklist', { act: 'goTok', t: 'c-submissions' }, 'R4 — the monthly cycle and its filters.'),
  chIdxLi('Submission — criterion judgements (published at once)', { act: 'goTok', t: 'c-submissions' }, 'R3 — your judgement and feedback reach the learner straight away.')]);

/* ---------- B. A learner who signs up joins their batch's cohort (so their work reaches marking) ----------
   The Assessor's and Coordinator's marking read the batch cohort (b.coh). Seeded demo learners (Aisha, Grace) have a cohort entry
   that points to their own learner record ({ lid, v }); a learner who signed up in the demo had none, so their submissions never
   reached marking. Completing sign-up now adds the same kind of entry for them — the existing learner, enrolment, batch and
   assignment records are reused; no history, payment, admission or assessment record is created. Kept across admin rebuilds,
   cleared by the demo reset. */
function r5CohLink() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.batches || !STORE.worlds) return;
  Object.values(STORE.worlds).forEach(w => {
    if (!w || !w.me || Object.values(BATCH_WORLD).includes(w.v)) return; // the seeded demo learners already have theirs
    const ok = w.nvq && w.signup && w.signup.done && w.flags && w.flags.admitted, b = ok ? ADMIN.batches.find(x => x.code === w.signup.batch) : null;
    // only the learner's current batch keeps their entry (a released seat or a batch change removes it)
    ADMIN.batches.forEach(x => { if (x !== b && x.coh) x.coh = x.coh.filter(e => !(e.r5 && e.v === w.v)); }); if (!b) return;
    b.coh = b.coh || [];
    if (!b.coh.some(e => e.v === w.v || e.lid === w.me.id)) b.coh.push({ lid: w.me.id, v: w.v, flags: [], last: (w.signup.pay && w.signup.pay.at) || now().toISOString(), att: null, r5: true });
  });
}
const _ccR5 = chComplete; chComplete = function () { const r = _ccR5.apply(this, arguments); r5CohLink(); return r; };
const _baR5 = buildAdmin; buildAdmin = function () { const r = _baR5.apply(this, arguments); r5CohLink(); return r; };
if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) r5CohLink();

/* ---------- Demo Scenario #30: one Level 3 learner, end to end (Daniel Okafor) ---------- */
const R5_LEI = 'L3AC-NOV26-LEI';
ACT.r5Sc30Opts = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-finance', { tab: 'plans' }); };
ACT.r5Sc30Staff = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches', { id: R5_LEI, tab: 'staff' }); };
ACT.r5Sc30Apply = () => ACT.s4Sc29Apply();
ACT.r5Sc30Sign = () => ACT.s4Sc29Sign();
ACT.r5Sc30Sched = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-batches', { id: R5_LEI, tab: 'schedule' }); };
ACT.r5Sc30Cal = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('calendar'); };
ACT.r5Sc30Pub = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-assignments'); };
ACT.r5Sc30Sub = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignments'); };
ACT.r5Sc30Coo = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-submissions', { tab: 'sp' }); };
ACT.r5Sc30Asr = () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-queue', { tab: 'sp' }); };
const _scListR5 = SC_LIST;
SC_LIST = function () {
  const x = (text, r, t, act) => ({ text, r, t, act });
  return _scListR5().concat([['30', 'One Level 3 learner end to end: fee option, mixed batch, targeted class, assessment', 'Client clarifications R1–R4', [
    x('The Super Admin (or Finance) adds two Level 3 fee options — for example "Self-Paced — monthly" and "Fully Assisted — weekly" — under Finance → Instalment plans.', 'admin', 'a-finance..plans', 'r5Sc30Opts'),
    x('Batch staff: the Super Admin sets Dr Helen Carter as Academic Coordinator of Leicester Cohort 8 (audited), so the Coordinator demo login covers the batch. Sarah Okonkwo is already its assignment assessor.', 'admin', 'a-batches.L3AC-NOV26-LEI.staff', 'r5Sc30Staff'),
    x('Daniel Okafor (no NVQ yet) signs up to Level 3 from Browse and chooses the Self-Paced option; its fee and mode are fixed for him.', '', '', 'r5Sc30Apply'),
    x('He uploads his documents, signs his letter and pays — he is assigned Leicester Cohort 8. Add learner on the same batch with the Fully Assisted group makes it a mixed batch.', '', '', 'r5Sc30Sign'),
    x('On the batch\'s Schedule, Add session: under "Who is this session for?" tick the Self-Paced fee option for one class, and the Fully Assisted fee option for another.', 'admin', 'a-batches.L3AC-NOV26-LEI.schedule', 'r5Sc30Sched'),
    x('Daniel\'s calendar has the Self-Paced class (and its Zoom link), not the Fully Assisted one.', '', '', 'r5Sc30Cal'),
    x('Assignments: open the draft Assignment 8, map its question to a criterion (Mapping), then publish it to Leicester Cohort 8 — Daniel receives it.', 'admin', 'a-assignments', 'r5Sc30Pub'),
    x('Daniel submits it (Self-Paced: whenever he is ready, several at once if he likes).', '', '', 'r5Sc30Sub'),
    x('Dr Helen Carter (Coordinator) opens it from the Self-Paced view and publishes a criterion judgement with feedback — Daniel sees it at once.', 'coord', 'c-submissions..sp', 'r5Sc30Coo'),
    x('Sarah Okonkwo (allocated Assessor) opens it from the Self-Paced worklist, records her judgements and declares the final Pass or Fail. Nobody else can.', 'staff', 't-queue..sp', 'r5Sc30Asr')]]]);
};
CDL_SCEN.push(['30', 'One Level 3 learner end to end: fee option, mixed batch, targeted class, assessment', 'Client clarifications (R1–R4)']);
['Thirty'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });
// A released seat (P-32) takes the learner out of the batch's cohort too
const _relSeatR5 = chReleaseSeat; chReleaseSeat = function () { const r = _relSeatR5.apply(this, arguments); r5CohLink(); return r; };

/* ---------- Demo controls: "Open the N Demo Scenarios" is there as soon as the panel opens ----------
   The button was added by a hook that runs only after a full screen render, and opening the panel redraws the panel alone, so it was
   missing until the next screen change. The panel's own render now adds it (once; same label and action). */
function r5ScBtn() {
  const p = document.querySelector('#demo-root .demo-panel'); if (!p || p.querySelector('[data-act="scOpen"]')) return;
  p.insertAdjacentHTML('beforeend', `<fieldset><legend>Demo Scenarios — demo only</legend><button class="btn btn-sm" data-act="scOpen">Open the ${chScenN()} Demo Scenarios</button></fieldset>`);
}
const _rdR5 = renderDemo; renderDemo = function () { const r = _rdR5.apply(this, arguments); r5ScBtn(); return r; };

/* ---------- Requirements-to-UI reconciliation (final review) ----------
   One fee-option model wherever Level 3 appears: the programme page, sign-up, payment plans, batch lists and the learner's overview. */
// Programme page of every Level 3 programme: a "Fee options" tab (the same card as Finance; managed by Finance / the Super Admin)
const _pbR5 = progBuilder;
progBuilder = function (id, t) {
  const pr = ADMIN.programmes.find(x => x.id === id); if (!pr || !r1IsL3Pid(id)) return _pbR5.apply(this, arguments);
  const fees = t === 'fees', h = _pbR5.call(this, id, fees ? 'types' : t), a = h.indexOf('<div class="subtabs"'), z = a < 0 ? -1 : h.indexOf('</div>', a); if (z < 0) return h;
  let tabs = h.slice(a, z); if (fees) tabs = tabs.replace(/aria-selected="true"/g, 'aria-selected="false"');
  tabs += `<button class="tab" role="tab" aria-selected="${fees}" data-go="a-programmes" data-id="${id}" data-tab="fees">Fee options</button>`;
  return h.slice(0, a) + tabs + (fees ? `</div>${r1Card(id)}` : h.slice(z));
};
// Sign-up: the learner's choice is grouped the same way as everywhere else (Self-Paced, Fully Assisted, standard fee)
const _applyR5 = ACT.applyNvq;
ACT.applyNvq = el => {
  const r = _applyR5(el); if (!MODAL || !$('#modal-root #r1-opts')) return r;
  const opts = [...$$('#modal-root .r1-pick')], mode = lab => { const o = r1Opt(lab.querySelector('input').value); return o ? o.mode || '' : ''; };
  const grp = (h, list) => list.length ? `<div class="r2-gh">${h}</div>` + list.map(x => x.outerHTML).join('') : '';
  const html = grp('Self-Paced', opts.filter(x => mode(x) === 'Self-Paced')) + grp('Fully Assisted', opts.filter(x => mode(x) === 'Fully Assisted')) + grp('Standard fee', opts.filter(x => !mode(x)));
  const fs = $('#modal-root #r1-opts'), leg = fs.querySelector('legend'); fs.innerHTML = (leg ? leg.outerHTML : '') + html;
  MODAL.body = $('#modal-root .modal-b') ? $('#modal-root .modal-b').innerHTML : MODAL.body;
  return r;
};
// Payment plans: for the Level 3 Diploma the plan's fee is its standard fee; the other fees are its options
const _s4PlansCardR5 = s4PlansCard;
s4PlansCard = function () {
  let h = _s4PlansCardR5.apply(this, arguments);
  r1L3Progs().filter(pr => r1StdOf(pr.id)).forEach(pr => { const n = r1Opts(pr.id).filter(o => !o.legacy && o.status === 'Active').length; if (!n) return;
    h = h.replace(new RegExp(`(<tr data-pid="${pr.id}">[\\s\\S]*?</td><td class="r">[^<]*)(</td>)`), `$1<div class="xs muted r5-stdfee">standard fee · ${plural(n, 'other fee option')}</div>$2`); });
  return h;
};
// Batch lists: for a Level 3 batch the mode shown is the batch's default; learners' own modes come from their fee options
const _dtR5 = dt;
dt = function (cfg) {
  if (cfg && (cfg.id === 'batches' || cfg.id === 'kbatches' || String(cfg.id).startsWith('cbatches-')) && Array.isArray(cfg.cols) && !cfg.r5) {
    // Level 3 rows show the learners' own modes (from their fee options); a batch without learners shows its stored mode, marked as such
    const l3 = b => { const m = r2Mix(b), fa = m['Fully Assisted'] > 0, sp = m['Self-Paced'] > 0; return fa && sp ? chip('Mixed', 'blue') : sp ? chip('Self-Paced', 'blue') : fa ? chip('Fully Assisted', 'grey') : (n2ModeOf(b) ? chip(n2ModeOf(b), n2ModeOf(b) === 'Self-Paced' ? 'blue' : 'grey') + ' <span class="xs muted">no learners yet</span>' : '—'); };
    cfg = { ...cfg, r5: true, cols: cfg.cols.map(c => c.k !== 'dmode' ? c : { ...c, l: 'Delivery mode', h: b => r2IsL3B(b) ? l3(b) : c.h(b), v: b => r2IsL3B(b) ? (r2IsMixed(b) ? 'Mixed' : (n2ModeOf(b) || '')) : c.v(b) }) };
  }
  return _dtR5.call(this, cfg);
};
// Learner's programme overview: the fee option they agreed (fixed at sign-up)
const _hubR5 = nvqHub;
nvqHub = function (e) {
  const h = _hubR5.apply(this, arguments), o = r1OptOfW(W); if (!o || !r1IsL3W(W)) return h;
  return h.replace(/(<dt>Delivery channel<\/dt>)/, `<dt>Fee option</dt><dd class="r5-fee">${esc(o.legacy ? 'Standard programme fee' : o.label)} — ${money(o.fee, 'GBP')} <span class="xs muted">(fixed when you signed up)</span></dd>$1`);
};
// Batch pages: the internal caveat "(seeded default — not client-confirmed)" is kept in the Provisional Decisions Register, not on screen
const R5_SEEDED = ' (seeded default — not client-confirmed)';
const _bdR5 = batchDetail; batchDetail = function () { return _bdR5.apply(this, arguments).split(R5_SEEDED).join(''); };
const _cbR5 = SCREENS['c-batches']; SCREENS['c-batches'] = p => _cbR5(p).split(R5_SEEDED).join('');
// Add / Edit session on a Level 3 batch: the closing note follows the audience (not "every learner of the batch")
const _rmR5 = renderModal;
renderModal = function () {
  if (MODAL && /^(Add|Edit) session$/.test(MODAL.title || '') && /r2-aud/.test(MODAL.body || '')) MODAL.body = MODAL.body.replace('Learners of the batch (and of any batch taking part) see it on their calendar; the teacher and Coordinators are notified.', 'Learners in the audience see it on their calendar; the teacher and Coordinators are notified.');
  return _rmR5.apply(this, arguments);
};

/* ---------- Level 3: no programme- or batch-wide delivery mode in the interface (final review) ----------
   A Level 3 learner's mode comes from their fee option. The batch's stored mode only still applies to learners on the standard fee
   from before fee options (their mode follows the batch), so it is shown — and editable — only with that meaning, and not at all
   when the programme has no standard fee. The stored values are kept unchanged for compatibility. */
const r5StdMode = b => r2IsL3B(b) && !!r1StdOf(r2Pid(b));
// Wizard (Level 3): the class-pattern selector is hidden; one line under the fee options says where the mode comes from
const _npFieldsR5 = ch8DetailsFields;
ch8DetailsFields = function (d) {
  d = d || {}; const l3 = (d.level || 'Level 3') === 'Level 3';
  let h = _npFieldsR5.apply(this, arguments).replace('<fieldset class="field full" style="border:0;padding:0">', `<fieldset class="field full r1-np-sup" style="border:0;padding:0" ${l3 ? 'hidden' : ''}>`);
  return h.replace('<div class="r1-np-list">', '<p class="xs muted r1-np-modes">Each learner\'s delivery mode comes from the fee option they choose, so one batch can hold Self-Paced and Fully Assisted learners.</p><div class="r1-np-list">');
};
const _npLevelR5 = INP.r1NpLevel;
INP.r1NpLevel = el => { _npLevelR5(el); $$(`${r1Sc()} .r1-np-sup`).forEach(x => { x.hidden = el.value === 'Level 3'; }); };
// Review step: no class-pattern row for Level 3
const _ch8ReviewR5 = ch8ReviewStep;
ch8ReviewStep = function (pr) { const h = _ch8ReviewR5.apply(this, arguments); return pr && r1IsL3Pid(pr.id) ? h.replace(/<dt>Default class pattern<\/dt><dd>[\s\S]*?<\/dd>/, '<dt>Delivery mode</dt><dd>From each learner\'s fee option</dd>') : h; };
// Support tab (Level 3): what the setting still does — the observation-fee rate, until learner-level fees exist
const R5_SUP_NOTE = 'A Level 3 learner\'s delivery mode comes from their fee option. This setting only chooses which observation-fee rate applies to the programme for now; it doesn\'t set anyone\'s delivery mode or class pattern.';
const _supTabR5 = chSupportTab;
chSupportTab = function (pr) {
  const h = _supTabR5.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id)) return h;
  return h.replace(/<h2>Support type[^<]*<\/h2>/, '<h2>Observation fee rate</h2>').replace(/<strong class="r1-sup3">[\s\S]*?Transitional until N5:[^<]*/, `<strong class="r1-sup3">${esc(R5_SUP_NOTE)}</strong>`).replace(/<legend class="lbl">Support type for /, '<legend class="lbl">Observation fee rate for ');
};
// Batch detail / Coordinator overview: the batch's mode is shown only as the mode of its standard-fee learners
const _bdR5m = batchDetail;
batchDetail = function (code) {
  const h = _bdR5m.apply(this, arguments), b = r2Batch(code); if (!r2IsL3B(b)) return h;
  return r5StdMode(b) ? h.replace('<p class="small n2-mode">Default delivery mode (class pattern): ', '<p class="small n2-mode">Delivery mode for standard-fee learners: ') : h.replace(/<p class="small n2-mode">[\s\S]*?<\/p>/, '');
};
const _cbR5m = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cbR5m(p), b = p && p.id && r2Batch(p.id); if (!r2IsL3B(b)) return h; return r5StdMode(b) ? h.replace('<dt>Default delivery mode (class pattern)</dt>', '<dt>Delivery mode for standard-fee learners</dt>') : h.replace(/<dt>Default delivery mode \(class pattern\)<\/dt><dd class="n2-mode"[\s\S]*?<\/dd>/, ''); };
// Create / edit batch (Level 3): the mode field is for standard-fee learners only, and is hidden when the programme has none
function r5ModeField() {
  const sel = $('#modal-root select#nb-dm') || $('#modal-root select#bd-dm'); if (!sel) return;
  const co = $('#modal-root #nb-co'), b = sel.id === 'bd-dm' && MODAL && /Edit batch|Batch details/i.test(MODAL.title || '') ? null : null;
  const title = co ? co.value : (ADMIN.batches.find(x => MODAL && (MODAL.title || '').includes(x.code)) || {}).course, pid = title && s4PidOfTitle(title); if (!pid || !r1IsL3Pid(pid)) return;
  const f = sel.closest('.field'), lab = f && f.querySelector('label'), hint = f && f.querySelector('.hint');
  if (!r1StdOf(pid)) { if (f) f.style.display = 'none'; return; }
  if (f) f.style.display = ''; if (lab) lab.textContent = 'Delivery mode for standard-fee learners';
  if (hint && sel.id === 'nb-dm') hint.textContent = 'Only for learners on the standard fee from before fee options. Everyone else\'s mode comes from their fee option.';
}
const _rmR5m = renderModal; renderModal = function () { const r = _rmR5m.apply(this, arguments); try { r5ModeField(); } catch (e) { /* no batch form open */ } return r; };
const _nbCourseR5 = INP.n2NbCourse; INP.n2NbCourse = el => { const r = _nbCourseR5(el); r5ModeField(); return r; };
