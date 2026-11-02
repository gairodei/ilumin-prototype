/* ============================================================
   MR-G3 — learner and agency portal integrity (2 Nov 2026; PD-MRG3-* in PROVISIONAL-DECISIONS.md).
   Loads after js/mr-g2.js (or ac3-academic.js). A prototype can only enforce this in the browser.
   MR-01  ACT.confirmPay ("Prototype: bank confirms") acts only on the seeded gateway-pending CARD payment it was written for
          (legacy world A, Fire Safety Awareness, TXN-90017): that exact row, its own amount, a receipt derived from that
          transaction, never rows[0] of another plan and never over an existing receipt. Bank transfers (CH-35) stay
          "Awaiting confirmation" until Finance records them (PD-FI-05/07/08): the link is removed from bank-transfer rows and
          the handler refuses them. Actor: the learner in the learner portal, or Finance / Super Admin (finance.js ppConfirm).
   MR-11  ACT.simIssue issues only a certificate that is still Processing.
   MR-42  ACT.viewCert never opens a revoked certificate (or one still processing) — same rule as the disabled button.
   MR-41  openNotif / viewCert / startQuiz / repurchase with an id that isn't this learner's: a clean "not found", no TypeError.
   MR-43  ACT.startQuiz refuses a module quiz that is already passed (the quiz tab and the result page never offer it);
          checked when the dialog opens and again when it is confirmed.
   MR-12  ACT.consentDo only by the learner the request belongs to (learner portal, W.me.id === c.lid) or from that
          request's own unused consent email in the learner inbox (the emailed-link path).
   MR-13  SUBMIT.agReply only in the signed-in agency's own thread, and not while the agency is receive-only.
   MR-34  agyDoAssign skips a learner who already has an active / pending seat (or an active enrolment) on the course —
          the same rule the Assign seats wizard shows ("Already enrolled").
   ============================================================ */
'use strict';

const mrg3Who = () => (typeof w0Who === 'function' ? w0Who().name : (ADMIN.me || {}).name);
// A refusal that is not a security event (validation / not found): audit line + toast, zero mutation of the record
const mrg3No = (module, entity, act, why, tone = 'err') => { w0Log(module, entity || '—', 'Blocked: ' + act, '—', 'No change', why); toast(why, tone); return false; };

/* ---------- MR-01: gateway-pending card payment only ---------- */
const mrg3P = x => Math.round((+x || 0) * 100);
// The one payment the prototype "bank confirms" control simulates: a one-time short-course card payment the gateway has not
// confirmed yet, with its own Payment Pending card transaction for exactly that amount. Bank transfers never qualify.
function mrg3Gateway(e) {
  if (!W || !e || e.kind === 'nvq' || e.status !== 'Payment Pending') return null;
  const pl = (W.plans || []).find(p => p.e === e.id);
  if (!pl || pl.plan !== 'One-time' || pl.deposit || pl.rows.length !== 1) return null;
  const r = pl.rows[0];
  if (!r.confirming || r.bankRef || mrg3P(r.paid) > 0 || r.status === 'Paid' || r.receipt) return null;
  if ((STORE.chBank || []).some(x => (x.e === pl.e || x.ek === pl.e) && W.me && x.lid === W.me.id && x.status === 'Awaiting confirmation')) return null;
  const tx = (W.tx || []).find(t => t.status === 'Payment Pending' && !/bank/i.test(t.method || '') && mrg3P(t.amount) === mrg3P(r.amount) && (t.desc === e.title || t.desc === e.base));
  return tx ? { e, pl, r, tx } : null;
}
const _confirmPayG3 = ACT.confirmPay;
ACT.confirmPay = el => {
  const id = el && el.dataset && el.dataset.id, e = id && W ? enrolById(id) : null;
  const actorOk = (S.portal === 'learner' && S.signedIn !== false) || (typeof isFin === 'function' && isFin()) || isSA();
  if (!actorOk) return w0Deny('Payments', id || '—', 'Confirm a pending payment', 'Only the payment gateway (simulated in the learner portal) or Finance can confirm a payment.');
  const g = mrg3Gateway(e);
  if (!g) return w0Deny('Payments', id || '—', 'Confirm a pending payment', e && W.plans.some(p => p.e === e.id && p.rows.some(r => r.bankRef))
    ? 'A bank transfer stays "Awaiting confirmation" until Finance records it when the money arrives.'
    : 'There is no card payment waiting for the bank on this course.');
  const { pl, r, tx } = g, at = now().toISOString();
  e.status = 'Active'; e.start = at; e.end = D(90);
  r.status = 'Paid'; r.paid = r.amount; r.confirming = false; r.receipt = 'RCP-' + tx.ref.replace(/^[A-Z]+-/, ''); r.paidAt = at; pl.pendingConfirm = false;
  tx.status = 'Succeeded';
  // Keep Finance's Payment Pending list in step when the simulated gateway confirms it from the learner side
  const nm = W.me ? W.me.first + ' ' + W.me.last : '';
  ((STORE.fin && STORE.fin.pending) || []).filter(p => p.status === 'Pending' && p.payer === nm && p.item === e.title).forEach(p => { p.status = 'Confirmed'; });
  w0Log('Payments', tx.ref, 'Gateway confirmed card payment (prototype)', 'Payment Pending', 'Succeeded · ' + money(r.amount, pl.cur || 'GBP') + ' · ' + r.receipt, e.title);
  render(); toast(`Payment confirmed. ${e.title} is now active.`);
  return true;
};
// The "Prototype: bank confirms" link appears only on that gateway-pending card payment, never on a bank transfer
const _planCardG3 = planCard;
planCard = function (pl) {
  let h = _planCardG3.apply(this, arguments);
  if (!pl || h.indexOf('data-act="confirmPay"') < 0) return h;
  const e = W && enrolById(pl.e);
  if (mrg3Gateway(e) && mrg3Gateway(e).pl === pl) return h;
  h = h.replace(/\s*<button class="linklike" data-act="confirmPay"[^>]*>Prototype: bank confirms<\/button>/, '');
  if (pl.rows.some(r => r.confirming && r.bankRef)) h = h.replace(/<strong>We're confirming your payment\.<\/strong> Your bank hasn't confirmed it yet\. This usually takes a few minutes\./, '<strong>Bank transfer awaiting confirmation.</strong> Finance confirms it when the money arrives.');
  return h;
};

/* ---------- MR-11 / MR-42 / MR-41: certificates ---------- */
const mrg3Cert = el => { const id = el && el.dataset && el.dataset.id; return id && W && (W.certs || []).find(x => x.id === id); };
const _simIssueG3 = ACT.simIssue;
ACT.simIssue = el => {
  const c = mrg3Cert(el), id = el && el.dataset && el.dataset.id;
  if (!c) return mrg3No('Certificates', id, 'issue certificate', 'Certificate not found.');
  if (c.status !== 'Processing') return w0Deny('Certificates', c.no && c.no !== '—' ? c.no : c.id, 'Issue a certificate', `This certificate is ${c.status} — only a certificate that is still processing can be issued.`);
  return _simIssueG3(el);
};
const _viewCertG3 = ACT.viewCert;
ACT.viewCert = el => {
  const c = mrg3Cert(el), id = el && el.dataset && el.dataset.id;
  if (!c) return mrg3No('Certificates', id, 'view certificate', 'Certificate not found.');
  if (c.status === 'Revoked') return w0Deny('Certificates', c.no, 'View or download a revoked certificate', 'This certificate has been revoked — it can\'t be viewed or downloaded.');
  if (c.status === 'Processing') return mrg3No('Certificates', c.id, 'view certificate', 'This certificate is still being generated. We\'ll notify you when it\'s ready.', 'info');
  return _viewCertG3(el);
};

/* ---------- MR-41: notifications, re-purchase ---------- */
const _openNotifG3 = ACT.openNotif;
ACT.openNotif = el => {
  const id = el && el.dataset && el.dataset.id, n = id && W && (W.notifs || []).find(x => x.id === id);
  if (!n) return mrg3No('Notifications', id, 'open notification', 'Notification not found.');
  if (!n.go) { n.unread = false; S.menu = null; render(); return; }
  return _openNotifG3(el);
};
const _repurchaseG3 = ACT.repurchase;
ACT.repurchase = el => {
  const id = el && el.dataset && el.dataset.id, e = id && W ? enrolById(id) : null;
  if (!e || e.kind === 'nvq') return mrg3No('Short Courses', id, 're-purchase course', 'Course not found.');
  return _repurchaseG3(el);
};

/* ---------- MR-43 / MR-41: module quizzes ---------- */
const _startQuizG3 = ACT.startQuiz;
ACT.startQuiz = el => {
  const id = el && el.dataset && el.dataset.id, e = id && W ? enrolById(id) : null;
  if (!e || e.kind === 'nvq' || !e.modules) return mrg3No('Short Courses', id, 'start module quiz', 'Course not found.');
  const m = shModOf(e, el.dataset.m) || shCurMod(e);
  if (!m || !m.quiz) return mrg3No('Short Courses', id, 'start module quiz', 'Quiz not found.');
  const chk = () => (shPassed(m) ? mrg3No('Short Courses', `${mrg3Who()} · ${e.title} · ${m.title}`, 'start module quiz (already passed)', `You've already passed the Module ${shModNo(e, m)} quiz — there's nothing to retake.`, 'info') : true);
  if (chk() === false) return false;
  const m0 = MODAL, r = _startQuizG3(el);
  const a = MODAL && MODAL !== m0 && MODAL.actions.find(x => /primary|danger/.test(x.cls || ''));
  if (a && a.fn) { const g = a.fn; a.fn = (...x) => (chk() === false ? (closeModal(), false) : g(...x)); }
  return r;
};

/* ---------- MR-12: learner consent to an agency link ---------- */
function mrg3ConsentWhy(c) {
  if (S.portal === 'learner' && S.signedIn && W && W.me && c.lid && W.me.id === c.lid) return '';
  const p = S.params || {}, m = S.route === 'm-inbox' && p.id && (STORE.agy.lmails || []).find(x => x.id === p.id);
  if (m && m.kind === 'consent' && m.cid === c.id && !m.used && m.lid === c.lid) return '';
  return 'Only the learner this request was sent to can answer it — from their dashboard or the consent email.';
}
const _consentDoG3 = ACT.consentDo;
ACT.consentDo = el => {
  const id = el && el.dataset && el.dataset.id, c = id && agyConsents().find(x => x.id === id);
  if (!c) return mrg3No('Agencies', id, 'answer link request', 'This request is no longer open.', 'info');
  const why = mrg3ConsentWhy(c);
  if (why) return w0Deny('Agencies', c.id, 'Answer a learner\'s agency-link consent', why);
  return _consentDoG3(el);
};

/* ---------- MR-13: agency replies only in its own threads ---------- */
const _agReplyG3 = SUBMIT.agReply;
SUBMIT.agReply = f => {
  const id = f && f.dataset && f.dataset.id;
  if (S.portal !== 'agency' || !S.agy || !S.agy.id) return eDeny('Agency messages', id || '—', 'reply to message thread ' + (id || '—'), 'Only the signed-in agency can reply in its own threads.');
  const t = id && ADMIN.threads.find(x => x.id === id);
  if (!t || t.party !== AGN()) return eDeny('Agency messages', AGN(), 'reply to message thread ' + (id || '—'), `Thread ${id || '—'} isn't ${AGN()}'s`, 'Message thread not found.');
  if (receiveOnly()) return eDeny('Agency messages', AGN(), 'reply to message thread ' + id, `${AGN()} is set to receive-only`, 'Your agency is set to receive-only — contact the Academy by email.');
  return _agReplyG3(f);
};

/* ---------- MR-34: one active / pending seat per learner and course ---------- */
function mrg3SeatDup(b, course, id) {
  const L = learnerById(id); if (!L) return '';
  const a = STORE.agy.assign.find(x => x.lid === id && x.agency === b.agency && sameCourse(x.course, course) && ['Active', 'Approved', 'Under review', 'Admission pending'].includes(x.status));
  if (a) return `${L.name} already has a seat on ${course} (${a.id}, ${a.status})`;
  const e = L.v && STORE.worlds[L.v] && STORE.worlds[L.v].enrolments.find(x => (x.base || x.title || '').startsWith(course) && x.status === 'Active');
  return e ? `${L.name} is already enrolled on ${course}` : '';
}
const _assignG3 = agyDoAssign;
agyDoAssign = function (b, course, ids, quiet) {
  // Cross-agency bundles and learners off the roster are refused by the e-sec.js guard underneath — let it decide first
  if (!b || !Array.isArray(ids) || !agyBundles().some(x => x.id === b.id) || ids.some(id => !inRoster(id))) return _assignG3.apply(this, arguments);
  const keep = [], why = [];
  ids.forEach(id => { if (keep.includes(id)) { why.push(`${id} listed twice`); return; } const d = mrg3SeatDup(b, course, id); if (d) why.push(d); else keep.push(id); });
  if (why.length) { w0Log('Agency seats', `${b.id} · ${course}`, 'Blocked: assign seats (already enrolled)', '—', 'No change', why.join('; ')); if (!quiet) toast(`Already enrolled — no seat used: ${why.join('; ')}.`, 'err'); }
  if (!keep.length) return 0;
  return _assignG3.call(this, b, course, keep, quiet);
};
