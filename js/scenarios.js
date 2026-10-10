/* ============================================================
   G12.6 / G12.7 — Demo Scenarios (route: demo-scenarios)
   All 17 scenarios as numbered steps. Each "Open" button switches to the role and opens the screen.
   #1–#9 are defined from the flows built in the prototype (updated per G12.6); #10–#15 are new (G12.7); #16–#17 come from the follow-up decisions (F1, F5).
   ============================================================ */
'use strict';

// role keys: switchRole keys, plus learner:<world> and agyH (Hartwell Home Care)
function scRole(r) {
  if (!r) return;
  if (r.startsWith('learner')) { S.variant = r.split(':')[1] || 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); return; }
  if (r === 'agyH') { agyEnter('AG-07', true); return; }
  if (r === 'staff') S.tas.v = 'A';
  if (r === 'coord') S.coo.v = 'A';
  ACT.switchRole({ dataset: { r } });
}
ACT.scStep = el => { scRole(el.dataset.r); const t = el.dataset.t; if (t) { const [route, id, tab] = t.split('.'); go(route, { id: id || undefined, tab: tab || undefined }); } };
ACT.scReg = () => ACT.regLink();
// #11 step 5: Hartwell requests a link for a course the learner is already enrolled on
ACT.scConsentEnrolled = () => {
  agyEnter('AG-07', true); const w = STORE.worlds.A, e = w.enrolments.find(x => x.status === 'Active' && !x.sponsor) || w.enrolments.find(x => !x.sponsor);
  const L = allLearners().find(l => l.id === w.me.id) || { id: w.me.id, name: VNAME('A'), email: w.me.email, v: 'A' };
  const c = agyRequestConsent(L, L.email, e ? (e.base || e.title) : 'The Care Certificate (15 Standards)', 'Scenario 11 — already-enrolled course');
  go('g-learners'); toast(c.err ? c.err : `Consent request sent to ${L.name} for ${c.course} (already enrolled).`, c.err ? 'err' : 'info');
};

function SC_LIST() {
  const permC = (typeof wLinkByKey === 'function' && wLinkByKey('C:perm:seed')) || {};
  const s = (text, r, t, act) => ({ text, r, t, act });
  return [
    ['1', 'Assignment loop', 'G6.3', [
      s('Learner (Aisha Rahman) submits an assignment.', 'learner:C', 'assignments'),
      s('Assessor marks it and chooses "Send to Coordinator for release" (resubmission window set in days).', 'staff', 't-queue'),
      s('Academic Coordinator opens the Release queue and releases the feedback ("Release to learner").', 'coord', 'c-release'),
      s('Learner sees the feedback, status and resubmission date — all at once, from the release.', 'learner:C', 'assignments'),
      s('Coordinator posts their own plain feedback.', 'coord', 'c-submissions')]],
    ['2', 'Admission and deposit', 'G5.1, G8', [
      s('Applicant (Priya Raman) uploads the missing admission documents.', 'learner:B', 'admission'),
      s('System Admin assigns the reviewer and approves the documents and admission.', 'sysA', 'a-admissions'),
      s('Learner pays the deposit to hold the seat (28 days).', 'learner:B', 'payments')]],
    ['3', 'Extra quiz attempts', 'G4.9, G6.8', [
      s('Learner (Daniel Okafor) has used all 3 quiz attempts on Basic Life Support and asks for more.', 'learner:A', 'courses'),
      s('Academic Admin grants the same number of attempts (or more days / rejects / re-purchase).', 'acaA', 'a-queue'),
      s('Learner sees the new attempts.', 'learner:A', 'courses')]],
    ['4', 'Overdue fees', 'G5.4', [
      s('Learner (Aisha Rahman) has an overdue instalment (reminder at 15 days, pause at 30).', 'learner:C', 'payments'),
      s('Overdue & Access lists self-paying learners at 15 days (Ruby Clarke — reminder) and 30+ days (Jack Thompson — access paused). Agency-sponsored NVQ learners never appear.', 'finA', 'f-overdue'),
      s('Finance Admin reviews overdue learners and restores access with a new due date.', 'finA', 'f-overdue'),
      s('System Admin can also restore access.', 'sysA', 'f-overdue')]],
    ['5', 'Agency bundle and seats', 'G5.6, G9', [
      s('Business Admin publishes a draft bundle (automatic price from the discount rates).', 'bizA', 'a-bundles'),
      s('Agency (CarePlus) buys Infection control seats by card.', 'agyA', 'g-buy'),
      s('Agency assigns seats to its learners (same course from a second agency is blocked).', 'agyA', 'g-seats'),
      s('Learner (Daniel Okafor) sees the sponsored course.', 'learner:A', 'courses')]],
    ['6', 'Refund', 'G4, G5.3, D8', [
      s('Finance Admin A raises a refund.', 'finA', 'f-refunds'),
      s('Finance Admin B approves it (self-approval is blocked).', 'finB', 'a-queue'),
      s('Super Admin raises a refund — it is processed immediately (no approval).', 'admin', 'a-finance.refunds')]],
    ['7', 'Observation', 'G6.6, G10', [
      s('Assessor proposes a workplace observation for Aisha Rahman (permission must be Granted).', 'staff', 't-obs'),
      s('Workplace contact grants permission / accepts the date from the email link.', 'wpc', 'w-inbox'),
      s('Assessor records the observation.', 'staff', 't-obs'),
      s('Branch — the workplace contact withdraws permission (optional reason, then confirm).', 'wpc', permC.token ? 'w-withdraw.' + permC.token : 'w-inbox'),
      s('Planned workplace visits are cancelled; learner and assessor are notified. The permission shows Withdrawn.', 'staff', 't-obs'),
      s('Assessor proposes an Academy office observation instead (NVQ criteria only, no workplace email).', 'staff', 't-obs'),
      s('Learner accepts the Academy office visit.', 'learner:C', 'observations')]],
    ['8', 'Data correction', 'G4, G11.3', [
      s('Assessor raises a Data Correction of the learner\x27s name (Marking Workspace → Raise Data Correction).', 'staff', 't-mark.IA-L-18022~a1'),
      s('System Admin reviews it.', 'sysA', 'a-queue'),
      s('Super Admin gives final approval — the certificate is re-issued.', 'admin', 'a-queue'),
      s('Learner sees the re-issued certificate.', 'learner:C', 'certificates'),
      s('Scanning the old certificate\'s QR code shows "Replaced".', 'ver', '')]],
    ['9', 'Agency purchase by bank transfer', 'G5.8, G9', [
      s('Agency requests seats by bank transfer (Academy approval).', 'agyA', 'g-buy'),
      s('Finance approves the request.', 'finA', 'a-queue'),
      s('Finance records the payment — seats are credited.', 'finA', 'f-agency'),
      s('Agency sees the purchase and its receipt.', 'agyA', 'g-purchases'),
      s('A sponsored NVQ learner (Grace Mensah) has no deposit and no fee schedule — the agency\'s NVQ seat covers the fees.', 'learner:D', 'payments')]],
    ['10', 'Registration', 'G2', [
      s('Open a referral link (demo) — the code is already added.', '', '', 'scReg'),
      s('Register with country → enter the OTP → welcome.', '', ''),
      s('The new learner is visible in admin with region and currency.', 'admin', 'a-learners'),
      s('The referral attribution is counted.', 'admin', 'a-referrals')]],
    ['11', 'Agency link with consent', 'G9.2', [
      s('Hartwell Home Care has asked to link Daniel Okafor for a new course — status "Awaiting learner consent".', 'agyH', 'g-learners'),
      s('Learner approves on the dashboard (or from the consent email in the learner inbox).', 'learner:A', 'dashboard'),
      s('Agency sees "Linked" — no queue item for a new course.', 'agyH', 'g-learners'),
      s('Repeat for a course the learner is already enrolled on.', '', '', 'scConsentEnrolled'),
      s('Learner approves again.', 'learner:A', 'dashboard'),
      s('Business Admin approves the link item in the Approvals Queue.', 'bizA', 'a-queue'),
      s('Agency sees "Linked".', 'agyH', 'g-learners')]],
    ['12', 'Discount rate change', 'G5.6', [
      s('Business Admin (with "Change discount rate") proposes a new rate with a reason.', 'bizA', 'a-bundles..rates'),
      s('Super Admin approves the "Discount rate change" item.', 'admin', 'a-queue'),
      s('Bundle prices update for new purchases.', 'admin', 'a-bundles..rates')]],
    ['13', 'Data request', 'G3, G12.5', [
      s('Learner (Aisha Rahman) messages an Academic Admin asking for a copy of their data.', 'learner:C', 'messages'),
      s('Academic Admin logs it as an access request from the thread.', 'acaA', 'a-messages'),
      s('System Admin generates the export and marks the request completed.', 'sysA', 'a-dataprotection..dsr'),
      s('Learner is notified.', 'learner:C', 'notifications')]],
    ['14', 'Name change with a certificate', 'G3, G11.3', [
      s('Learner (Grace Mensah) requests a name change from the profile.', 'learner:D', 'profile'),
      s('System Admin converts it to a Data Correction.', 'sysA', 'a-queue'),
      s('Super Admin gives final approval — the certificate is re-issued.', 'admin', 'a-queue'),
      s('The old certificate shows "Replaced" when its QR code is scanned.', 'ver', '')]],
    ['15', 'Academic reactivation', 'G4', [
      s('Assessor (Sarah Okonkwo) requests reactivation of Ben Carter\x27s discontinued enrolment (My Approvals → Recommendations).', 'staff', 't-approvals..recs'),
      s('Academic Admin approves it.', 'acaA', 'a-queue'),
      s('The learner regains access — the enrolment is Active again.', 'admin', 'a-learner.IA-L-30755')]],
    ['16', 'Learner moves country', 'F1', [
      s('Start from before the move: Priya Nair registered in the UAE and pays in AED (demo).', '', '', 'scPriyaBefore'),
      s('Priya requests a change of country (Profile → Country of residence → Request change).', 'learner:H', 'profile'),
      s('System Admin approves the profile change.', 'sysA', 'a-queue'),
      s('Her new course is priced in GBP.', 'learner:H', 'browse'),
      s('Her old course stays in AED.', 'learner:H', 'payments'),
      s('Her data region is unchanged: UAE (registered 12 Mar 2026), "Country changed to United Kingdom on …".', 'admin', 'a-learner.IA-L-40990')]],
    ['17', 'Coordinator vs Academic Admin edit', 'F5', [
      s('Coordinator moves an assignment deadline in their batch (reason required).', 'coord', 'c-timeline'),
      s('Academic Admin changes the same deadline again — the last save wins.', 'acaA', 'a-scheduling'),
      s('Coordinator is notified: "… changed … after your edit — see history."', 'coord', 'c-notifications'),
      s('Both versions appear in the item\'s version history.', 'coord', 'c-timeline')]],
  ];
}
SCREENS['demo-scenarios'] = () => `${pageHead('Demo Scenarios', 'Seventeen end-to-end walkthroughs. Each step opens the right role and screen. Use "Reset demo data" in the demo controls to start a scenario again.')}
  ${SC_LIST().map(([n, title, ref, steps]) => `<section class="card" id="sc-${n}"><div class="row-b"><h2>${n}. ${esc(title)}${['2', '3', '4', '5'].includes(n) ? ' ' + chip('Illustrative', 'grey') : ''}</h2><span class="xs muted">${esc(ref)}</span></div><ol class="list">${steps.map(st => `<li class="li"><div class="li-b small">${esc(st.text)}</div>${st.act ? `<button class="btn btn-sm btn-primary" data-act="${st.act}">Run</button>` : st.r || st.t ? `<button class="btn btn-sm" data-act="scStep" data-r="${st.r}" data-t="${esc(st.t)}">Open</button>` : ''}</li>`).join('')}</ol></section>`).join('')}`;

// Reachable from every portal's demo controls
ACT.scOpen = () => { if (S.portal !== 'learner' || !S.signedIn) { S.portal = 'learner'; S.signedIn = true; W = STORE.worlds[S.variant || 'A']; } go('demo-scenarios'); };
AFTER.push(() => { const p = document.querySelector('#demo-root .demo-panel'); if (p && !p.querySelector('[data-act="scOpen"]')) p.insertAdjacentHTML('beforeend', '<fieldset><legend>Demo Scenarios — demo only</legend><button class="btn btn-sm" data-act="scOpen">Open the 17 Demo Scenarios</button></fieldset>'); });
const _idxSC = SCREENS.index;
SCREENS.index = p => _idxSC(p) + `<section class="card idx-sec"><h2>Demo Scenarios</h2><ul class="idx-list"><li><button class="linklike" data-go="demo-scenarios">Demo Scenarios — 17 walkthroughs</button> <span class="xs muted">· numbered steps with links to each role and screen</span></li></ul></section>`;
