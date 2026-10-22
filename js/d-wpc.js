/* ============================================================
   Batch D final correction — workplace permission for every learner (22 Oct 2026; PD-D-16…20).
   Root cause: sign-up to a builder programme (ch8StartSignup) copied the template learner's workplace — Willowbrook,
   "Granted" by Mrs Joanne Whitley — and Academy criteria into every new learner, so a new learner looked permitted by a
   contact who never saw a request, and the secure-link journey (wpcSync) only ever ran for the seeded learners C and D.
   - A new sign-up starts with no workplace ("Not entered"). The learner enters their own employer and contact; saving sends
     the existing permission request (secure, time-limited link), now generated for every enrolled learner (workplace.js).
   - Each link is scoped to one learner and one request: the contact pages read only their own token's record. Withdrawal now
     needs a valid granted permission link (a missing, declined, superseded or already-withdrawn link is refused, logged), and
     it cancels only that learner's planned workplace visits (matched by learner ID, not name).
   - "What will be observed" shows the learner's own pinned version's Academy criteria, not the seeded ones.
   Seeded learners and their links are unchanged. Loads after d-obs.js.
   ============================================================ */
'use strict';

const D_NO_WP = () => ({ perm: 'Not entered', name: '', address: '', postcode: '', ctitle: 'Manager', cname: '', cemail: '', cphone: '', role: '', shift: '', sent: null, expiry: null, reminder: null, grantedAt: null, grantedBy: null, declineReason: null, history: [] });
const _suD = ch8StartSignup;
ch8StartSignup = function (w) {
  const hadWp = !!(w && w.workplace), hadIa = !!(w && w.iaCriteria), r = _suD.apply(this, arguments);
  if (w && !hadWp) w.workplace = D_NO_WP(); // never another learner's employer, contact or consent
  if (w && !hadIa) w.iaCriteria = [];        // Academy criteria come from the learner's own programme version
  return r;
};

// Withdrawal: only through a valid, granted permission link of this request
const _wdD = SUBMIT.wpcWithdraw;
SUBMIT.wpcWithdraw = f => {
  const l = wLink(f && f.dataset && f.dataset.t);
  if (!l || l.kind !== 'perm' || l.status !== 'Used' || !l.used || l.used.decision !== 'Granted') {
    if (l && ADMIN) logW(l, 'Blocked: withdraw permission (secure link)', l.status, l.status, l.status === 'Withdrawn' ? 'Already withdrawn' : 'Not a granted permission link');
    else if (ADMIN) logA('Observations', '—', 'Blocked: withdraw permission (secure link)', '—', '—', 'Invalid link');
    S.wpcOutcome = null; render(); return;
  }
  return _wdD(f);
};

// The learner's workplace page lists their own version's Academy criteria (event-journey learners)
const _wpSecD = workplaceSection;
workplaceSection = function () {
  const ctx = typeof dCtx === 'function' ? dCtx(W) : null; if (!ctx) return _wpSecD.apply(this, arguments);
  const keep = W.iaCriteria; W.iaCriteria = ctx.cfg.ia.filter(c => c.status === 'Active').map(c => [c.code, c.title]);
  try { return _wpSecD.apply(this, arguments); } finally { W.iaCriteria = keep; }
};

UXC.push(['D1-F', 'Workplace permission for every learner (22 Oct 2026)', [
  'New learners start with no workplace and enter their own employer and contact on Observations → Workplace details; saving emails their contact the permission request (secure, time-limited link). Before, a new learner inherited a seeded workplace already marked "Granted".',
  'The secure-link journey (grant, decline, withdraw, visit accept / suggest another date) now works for every enrolled learner, each link scoped to its own learner and request. Withdrawal needs a valid granted link and cancels only that learner\'s planned workplace visits.',
  'Academy-office observations per event: the learner can ask for one on an event their version permits it for (their Coordinator decides; approval sets the location); the Coordinator can choose it (learner agrees, Academic Admin approves). One open request per event.']]);
