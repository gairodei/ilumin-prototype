/* ============================================================
   SEC-01 — Learner action authorization (CBR correction batch 1, 6 Nov 2026). Loads last, after every learner handler override.
   The access rules were applied only when a page was drawn (lockFor in pageHtml). A learner whose NVQ access was paused still
   submitted an assignment by calling ACT.reviewSubmit directly (L3 audit, probe S15).
   One authority now: secLock(route, enrolment) evaluates the same lockFor chain that draws the locked page — CH-10 sign-up lock,
   CH-11/12 (content stays open after the first payment and after a rejection), CH-14 manual pause, the overdue pause per enrolment
   (FI-2), the NB-1 per-enrolment sign-up lock, archived accounts, a released seat — for the enrolment the action writes to.
   Every protected learner write in SEC_ACTS goes through secRun before it changes anything; a dialog the action opens is checked
   again when it is confirmed. A refusal is logged ("Blocked: … (access locked)") and changes nothing. Payments, messages,
   requests, documents and sign-up stay outside this list, as their pages do. Staff marking reads none of this.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE THIS ON THE SERVER.
   ============================================================ */
'use strict';

// The lock the learner would see on that page for that enrolment, or null. S.params is restored afterwards.
function secLock(route, id) {
  if (!W || !W.me) return { title: 'No learner record' };
  const k = S.params; S.params = Object.assign({}, k, { id });
  try { return lockFor(route); } finally { S.params = k; }
}
const secQuizE = () => (W && W.quiz && !W.quiz.result ? W.quiz.e : null);
const secVidE = () => (ui('vidCur') || [])[0];
const secD = el => (el && el.dataset) || {};
// [where, name, (args) → [route, enrolment id], what the learner was doing]. NVQ routes lock on the NVQ enrolment ('nvq').
const SEC_ACTS = [
  ['ACT', 'reviewSubmit', () => ['assignment', 'nvq'], 'submit an assignment'],
  ['fn', 'startUndo', () => ['assignment', 'nvq'], 'submit an assignment'],
  ['fn', 'finaliseSubmit', () => ['assignment', 'nvq'], 'finalise an assignment submission'],
  ['ACT', 'cfSaveDraft', () => ['assignment', 'nvq'], 'save an assignment draft'],
  ['INP', 'rteInput', () => ['assignment', 'nvq'], 'edit an assignment answer'],
  ['INP', 'attach', () => ['assignment', 'nvq'], 'attach a file to an assignment'],
  ['ACT', 'startQuiz', el => ['quiz', secD(el).id], 'start a quiz'],
  ['INP', 'quizAns', () => ['quiz', secQuizE()], 'answer a quiz question'],
  ['ACT', 'quizSubmit', () => ['quiz', secQuizE()], 'submit a quiz'],
  ['fn', 'finishQuiz', () => ['quiz', secQuizE()], 'submit a quiz'],
  ['ACT', 'openItem', el => ['course', secD(el).e], 'open course content'],
  ['ACT', 'vidPlay', () => ['course', secVidE()], 'play course video'],
  ['ACT', 'scormFinish', el => ['course', secD(el).e], 'record course completion'],
  ['ACT', 'openRes', () => ['resources', 'nvq'], 'open a learning resource'],
  ['ACT', 'resScorm', () => ['resources', 'nvq'], 'complete a learning resource'],
  ['ACT', 'obsAccept', () => ['observations', 'nvq'], 'accept an observation date'],
  ['ACT', 'obsAlt', () => ['observations', 'nvq'], 'ask for another observation date'],
  ['ACT', 'obsReport', () => ['observations', 'nvq'], 'open an observation report'],
  ['ACT', 'dObsReq', () => ['observations', 'nvq'], 'ask for an Academy-office observation'],
  ['ACT', 'chOrRequest', () => ['observations', 'nvq'], 'ask for an Academy-office observation'],
  ['ACT', 'chOrConsent', () => ['observations', 'nvq'], 'answer Academy-office observation advice'],
  ['ACT', 'changeWp', () => ['observations', 'nvq'], 'change workplace'],
  ['ACT', 'resendPerm', () => ['observations', 'nvq'], 'resend workplace permission'],
  ['SUBMIT', 'wpSave', () => ['observations', 'nvq'], 'save workplace details'],
  ['ACT', 'pdConfirm', () => ['progress', 'nvq'], 'confirm a Professional Discussion'],
  ['ACT', 'pdAlt', () => ['progress', 'nvq'], 'ask for another Professional Discussion date'],
];
function secRefuse(name, what, route, id, lock) {
  const who = W && W.me ? `${chFullName(W)} (${W.me.id})` : '—', e = id && id !== 'nvq' && typeof enrolById === 'function' ? enrolById(id) : null;
  // A quiz attempt in progress is discarded unrecorded (no attempt used), as an access-ended quiz is (AA-1), so its timer stops
  if (['quizAns', 'quizSubmit', 'finishQuiz'].includes(name) && W && W.quiz && !W.quiz.result && W.quiz.e === id) { W.quiz = null; clearTimer('quiz'); }
  logA('Learner access', `${who}${e ? ' · ' + e.title : ''}`, `Blocked: ${what} (access locked)`, '—', '—', `${lock.title} — ${name} refused, nothing changed`);
  if (MODAL) closeModal();
  toast(`${lock.title}: you can't ${what} now. Nothing was changed.`, 'err');
  return false;
}
// Runs f only when the learner may act on that enrolment; a dialog f opens is checked again on its confirm buttons
// CBC4: the learner's own actions (the dispatched ACT / INP / SUBMIT handlers) belong to a learner session. A staff session (admin,
// staff, coordinator or agency portal) calling them would change the loaded learner's work in their name, so it is refused too.
// The internal functions (finaliseSubmit, startUndo, finishQuiz) stay callable for demo set-up; the access rules still apply to them.
const SEC_NOT_LEARNER = { title: 'Only the learner can do this' };
function secRun(spec, self, args, f) {
  const [where, name, tgt, what] = spec, [route, id] = tgt(...args), lock = where !== 'fn' && S.portal !== 'learner' ? SEC_NOT_LEARNER : secLock(route, id);
  if (lock) return secRefuse(name, what, route, id, lock);
  const m0 = MODAL, r = f.apply(self, args);
  if (MODAL && MODAL !== m0 && Array.isArray(MODAL.actions)) MODAL.actions.forEach(a => {
    if (!a.fn || a._sec) return; const g = a.fn; a._sec = true;
    a.fn = (...x) => { const l = secLock(route, id); return l ? secRefuse(name, what, route, id, l) : g(...x); };
  });
  return r;
}
// 'fn': global functions (finaliseSubmit, startUndo, finishQuiz) that earlier files reassign; the bare name resolves to this wrapper
const SEC_HOST = { ACT: () => ACT, INP: () => INP, SUBMIT: () => SUBMIT, fn: () => window };
SEC_ACTS.forEach(spec => {
  const [where, name] = spec, host = SEC_HOST[where](), g = host[name]; if (typeof g !== 'function') return;
  host[name] = function () { return secRun(spec, this, [...arguments], g); };
});

/* ---------- Records ---------- */
if (typeof UXC !== 'undefined') UXC.push(['SEC-01', 'Learner actions check access (CBR correction batch 1, 6 Nov 2026)', [
  'A learner\'s protected actions — submitting, resubmitting and finalising assignments, saving drafts and answers, quiz attempts, course content and resources progress, observation and Professional Discussion booking, workplace details — now check the same access rules as the page itself (sign-up, pause, overdue pause, archived account, released seat), per enrolment, before anything changes. A refused action is logged and changes nothing.',
  'Payments, messages, requests, documents and the sign-up stay available, as before. A paused NVQ does not lock the learner\'s short courses.',
]]);
