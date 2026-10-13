/* ============================================================
   Follow-up decisions — Step 3: records (Client Decisions Log, UX Changelog, Demo Scenarios list,
   TBD register, screen index). Loads after records.js and fu-apply2.js.
   ============================================================ */
'use strict';

const CDL_FU = [
  ['F1', 'Learner moves country (P-05)', 'Applied', 'New purchases use the new country\'s currency; existing enrolments, plans, deposits and refunds keep theirs (stored per item). Data region never moves. Mock learner Priya Nair.'],
  ['F2', 'Currency conversion details (P-07)', 'Pending client', 'TBD tag on course pricing and checkout: rate source, update frequency, rounding, price lock at enrolment.'],
  ['F3a', 'Learners from other countries — currency (P-15)', 'Applied', 'Confirmed as built in G3.1 (INR learners, INR checkout and Payments, Finance totals per currency).'],
  ['F3b', 'Learners from other countries — storage (P-15)', 'Pending client', 'TBD tag after "Data region" in Learner 360. No region assigned.'],
  ['F4', 'NVQ fees for agency learners (P-16)', 'Applied', 'The agency\'s NVQ seat covers the fees: no deposit, fee schedule or instalments for the learner; never in Overdue & Access; NVQ courses can be bundled.'],
  ['F5', 'What the Academic Coordinator can edit (P-17)', 'Applied', 'Own batch: dates, deadlines, resource releases, milestones, observation windows and Teachers / Assessors ("Edit staff"). Last save wins; both versions kept; the other party is notified.'],
  ['F6', 'Observation photos (P-18)', 'Applied', 'Confirmed absent: per-upload tick-box and photo-specific wording.'],
  ['F7', 'Academy-office observations (P-19)', 'Applied', 'Confirmed: same propose / accept / counter flow, no workplace permission. No awarding-body note (confirmed absent).'],
  ['F8', 'VAT invoices (P-20)', 'Pending client', 'TBD tag on the agency bank-transfer purchase and the Finance invoice purchase item.'],
  ['F9', 'Deposit wording (P-21)', 'Applied', 'Confirmed absent: non-refundable notice and tick-box. Learners see "Seat released"; Finance keeps "deposit retained" internally.'],
  ['F10', 'Super Admin actions — notify, never approve (P-22)', 'Applied', 'Every Super Admin action and override is routed by area (Finance / System / Academic / Business Admins, batch Coordinator, marking Assessor, reviewer); text "Super Administrator [name] [did X] — reason: …".'],
  ['F11', 'Workplace email attachments (P-25)', 'Applied', 'Template attachments; workplace emails and link pages list them; agency data-sharing terms attached at onboarding.'],
  ['F12', 'Approval routes returned (P-26)', 'Applied', 'Approval Routes document returned by the client; no route changes.'],
];
const CDL_DOCS = [['Approval Routes document', 'Returned by client', 'P-26 — the in-app routes already match the final list (G4); nothing changed.']];
CDL_SCEN.push(['16', 'Learner moves country', 'Client-defined (follow-up, F1)'], ['17', 'Coordinator vs Academic Admin edit', 'Client-defined (follow-up, F5)']);
CDL_TAKEN.push(
  'F1: Priya Nair is seeded after her move (per the mock spec); scenario #16 starts with a demo step that puts her back to before the move.',
  'F4: besides Oliver Bennett and Isla Morgan, Kofi Asante and Ethan Parker were also agency-sponsored NVQ learners in Overdue & Access and were removed; the "arrangement upcoming" example moved to Zainab Hussain (self-paying). Overdue days count from midnight, so Ruby Clarke shows 15 days and Jack Thompson 30.',
  'F11: the email footer contact-details TBD and the visit-email duration TBD were removed with the page ones (same topics, now covered by the attachments).',
  'F9 #9 update: the agency scenario now ends with a sponsored NVQ learner (Grace Mensah) who has no deposit and no fee schedule.');
UXC.push(['Follow-up', 'Follow-up decisions F1–F12', [
  'F1: currency stored on every enrolment, plan, deposit and payment; a country change affects new purchases only; Learner 360 shows "Data region: UAE (registered …)" and "Country changed to … on …"; request modal note; mock learner Priya Nair.',
  'F2: "Pending client" tag on course pricing (Super / System Admin) and checkout.',
  'F3: INR confirmed; "Pending client" tag after Data region for learners outside the UK and UAE.',
  'F4: sponsored NVQ learners see "Your course fees are covered by [Agency]" — no deposit, fee schedule or instalments; removed from Overdue & Access; NVQ courses in the bundle builder; NVQ TBDs removed.',
  'F5: Coordinator "Edit staff" on their own batch (Coordinator slot locked); shared version history on timeline items and staff; "Changed after your edit" notification for the Coordinator and the Academic Admin.',
  'Overdue day counts (Finance → Overdue & Access, Finance learner plans, Super Admin dashboard, learner Payments and dashboard): days are whole calendar days in the learner\'s local time zone (their country — UK Europe/London, UAE Asia/Dubai, India Asia/Kolkata), not elapsed hours. This drives the 15-day reminder, the 30-day pause and the arrangement re-pause (the day after the new due date). Seeded due dates are unchanged, so Ruby Clarke shows 15 days and Jack Thompson 30.',
  'F6, F7, F9: confirmed — nothing to remove.',
  'F8: "Pending client" tag on the agency bank-transfer purchase and the Finance invoice purchase item.',
  'F10: Super Admin actions notify by area, never approve; wording "Super Administrator [name] [did X] — reason: …"; learners only get the normal outcome notification.',
  'F11: Notification Settings → workplace templates → Attachments (upload, list, remove); attachments in workplace emails; "Documents from Illumin Academy" on the link pages; "Attach data-sharing terms" in agency onboarding, shown in the set-password email and Agency Profile → Data protection.',
  'F12: Approval Routes document recorded as returned by the client.',
  'Demo Scenarios: #16 "Learner moves country", #17 "Coordinator vs Academic Admin edit"; #4 shows the 15- and 30-day learners; #9 ends with a sponsored NVQ learner.']]);
TBD_GONE_G912.push(['F4', 'screens-b.js, screens-c.js, finance.js tbd(\'who pays NVQ fees for sponsored learners\'); agency.js "Who pays NVQ fees…" tbd() and NVQ seat-assignment tbd() ×3'], ['F11', 'workplace.js "Client to supply · [Visit description…]" ×2, tbd(\'duration\'), duration tbd() ×2, tbd(\'contact details\'), contact-details tbd() in the email footer, FAQ tbd(\'content\'); agency.js data-sharing terms tbd()']);

const _cdLogFu = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogFu(p).replace('All 15 run end to end in the prototype.', 'All 17 run end to end in the prototype.').replace('<section class="card"><h2>Earlier client decisions (D1–D9)</h2>', `<section class="card"><h2>Follow-up decisions (P-05 – P-26)</h2>${recTbl(['ID', 'Decision', 'Status', 'What it means in the prototype'], CDL_FU.map(r => [r[0], esc(r[1]), chip(r[2], r[2] === 'Pending client' ? 'amber' : 'green'), esc(r[3])]))}</section><section class="card"><h2>Client documents</h2>${recTbl(['Document', 'Status', 'Note'], CDL_DOCS.map(r => [esc(r[0]), chip(r[1], 'blue'), esc(r[2])]))}</section><section class="card"><h2>Earlier client decisions (D1–D9)</h2>`);

/* ---------- Screen index: template attachments, Coordinator "Edit staff" ---------- */
const _aIdxFu = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxFu(p) + `<section class="card idx-sec"><h2>Follow-up decisions — screens</h2><ul class="idx-list"><li><button class="linklike" data-act="aJump" data-t="a-notifsettings">Notification Settings → workplace templates → Attachments (open "Template")</button></li></ul></section>`;
const _cIdxFu = SCREENS['c-index'];
SCREENS['c-index'] = p => { const b = (myBatches().find(x => !(typeof roBatch === 'function' && roBatch(x))) || {}).code; return _cIdxFu(p) + (b ? `<section class="card idx-sec"><h2>Follow-up decisions</h2><ul class="idx-list"><li><button class="linklike" data-act="goTok" data-t="c-batches.${b}">Batch detail → Edit staff (${b})</button></li></ul></section>` : ''); };
