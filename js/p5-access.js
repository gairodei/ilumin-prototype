/* ============================================================
   P5 — Learner course-access gate, behind the inactive REVISED-1 terms (12 Nov 2026; PD-P5-* in PROVISIONAL-DECISIONS.md;
   PD-P0-07 in P0-BATCH-SEAT-ENROLMENT-DECISIONS.md). Loads after p4-cutoff.js, so its wrappers are outermost.
   One decision. p5Decide(w) answers whether a learner on the revised terms may use their NVQ/RQF programme's learning, derived each
   time from the authoritative records — the P2 terms link, the sign-up, the P1 seat ledger, the plan rows Finance or the card
   provider marked paid, P4's verifications, exceptions and forfeitures, and the batch's commencement — never from a stored flag.
   Allowed only with all of: an identified learner whose terms link is REVISED-1 and is theirs; a completed sign-up with an active
   programme enrolment and an active seat in its batch; the required first payment paid and verified (route A: deposit + the whole
   remaining tuition; route B: deposit credited + the rest of payment 1; direct: payment 1, or the full fee when paid in full); no
   unresolved late receipt, forfeiture or pending transfer; and a batch that has commenced. Anything ambiguous blocks.
   Enforcement. The decision is added to the end of the lockFor chain (after every existing lock, which stays authoritative), so the
   pages, deep links and every SEC-01 protected action check it per enrolment. Item-level guards cover what SEC-01 doesn't route by
   enrolment (NVQ resources and their downloads, class Zoom links, PD join, the assignment PDF and brief). Pre-access operations —
   admission, documents, offer letter, payments, messages, requests, profile, calendar times, attendance — are never gated here.
   Commencement (U-05 open). p5Commence returns Commenced, Not commenced or Indeterminate. Before the batch's local start date begins
   it can't have commenced; from then on, without a decided rule, it is Indeterminate (blocks). Only the regression harness can give a
   batch an explicit test commencement instant (labelled test data, not Academy policy).
   Legacy. Learners on LEGACY-1 (everyone real) are untouched: the gate doesn't apply to them. Agency-sponsored learners on revised
   terms are blocked (their gate is P9). A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE THIS ON THE SERVER.
   ============================================================ */
'use strict';

const P5_RULE = 'P5-ACCESS-1';
const p5Who = w => (w && w.me ? `${chFullName(w)} (${w.me.id})` : '—');
// Records that only the revised terms create: with these, a missing or legacy terms link is ambiguous, not legacy
const p5Marks = s => !!(s && (s.p4 || s.p4route || (s.p4Hist && s.p4Hist.length) || Object.prototype.hasOwnProperty.call(s, 'p4From')));
// Whether the gate decides for this learner: a REVISED-1 link, a link that can't be found, or revised records without one
function p5Applies(w) {
  const s = w && w.signup; if (!s) return false;
  const link = s.termsRef ? TERMS().links[s.termsRef] : null;
  if (!s.termsRef || (link && link.policy === 'LEGACY-1')) return p5Marks(s);
  return true;
}

/* ---------- Commencement (U-05 unresolved): Commenced, Not commenced or Indeterminate ---------- */
// Explicit commencement instant for a batch — regression harness only, labelled test data (never an Academy rule)
function p5HarnessCommence(b, iso, why) {
  if (!p4Harness()) { logA('Batches', b ? b.code : '—', 'Blocked: set a test commencement instant', '—', 'No change', 'Only the isolated regression harness can set one (U-05 open)'); return false; }
  const ms = Date.parse(iso); if (!b || !Number.isFinite(ms)) return false;
  b.p5Test = Object.freeze({ iso: new Date(ms).toISOString(), ms, at: now().toISOString(), basis: 'Test data — an explicit commencement instant for the regression harness, not Academy policy (U-05 open)' });
  logA('Batches', `${b.label || b.code} (${b.code})`, 'Test commencement instant set (test harness)', '—', b.p5Test.iso, why || 'P5 regression fixture');
  return true;
}
function p5Commence(b, at = now().getTime()) {
  if (!b) return { state: 'indeterminate', why: 'No batch is assigned.' };
  const z = batchTz(b), t = b.p5Test;
  if (t && Number.isFinite(t.ms)) return { state: at >= t.ms ? 'commenced' : 'not-commenced', ms: t.ms, tz: z.tz, test: true, why: 'Explicit test commencement instant (test data, not Academy policy).' };
  if (z.source !== 'configured') return { state: 'indeterminate', why: `${b.code} has no Academy time zone configured, so its start can't be placed in time (U-04).` };
  if (!b.start || !Number.isFinite(Date.parse(b.start))) return { state: 'indeterminate', tz: z.tz, why: `${b.code} has no start date.` };
  const startYmd = ymdIn(b.start, z.tz), earliest = dayStart(startYmd, z.tz);
  // Every candidate under U-05 (the start of the local start date, the stored start time) is on or after the start date begins
  if (at < earliest) return { state: 'not-commenced', tz: z.tz, startYmd, earliest, why: 'The batch start date hasn\'t arrived.' };
  return { state: 'indeterminate', tz: z.tz, startYmd, earliest, why: 'The batch start date has arrived, but the moment learning opens on it isn\'t decided yet (U-05: the start of the date or the scheduled start time).' };
}

/* ---------- Payment clearance for the programme (verified, applied to this enrolment) ---------- */
function p5Pay(w) {
  const s = w.signup, p = s.pay, pl = (w.plans || []).find(x => x.e === 'nvq');
  if (!p) return { state: 'unpaid', text: 'No payment has been made for this programme.' };
  if (!pl || !pl.rows || !pl.rows.length) return { state: 'unknown', text: 'The payment plan for this programme can\'t be found.' };
  const dep = p.opt === 'deposit', route = dep ? (pl.depRoute === 'inst' ? 'B' : 'A') : (s.payIn === 'full' || pl.rows.length === 1 ? 'FULL' : 'INST');
  const need = route === 'A' || route === 'FULL' ? pl.rows : [pl.rows[0]], what = { A: 'the remaining tuition', B: 'the rest of payment 1', FULL: 'the full fee', INST: 'payment 1' }[route];
  const exc = P4().exc.filter(e => e.lid === w.me.id && e.state === 'Finance review' && (!s.p4 || (e.batch === s.p4.batch && e.verifiedAt >= s.p4.at)));
  if (exc.length) return { state: 'exception', route, what, exc: exc.map(e => e.id), text: `A payment was received late and is under Finance review (${exc.map(e => e.id).join(', ')}). It doesn't count toward access until Finance resolves it.` };
  const rowOk = r => r.status === 'Paid' && fpP(r.paid) >= fpP(r.amount);
  const depOk = !dep || (!!pl.deposit && pl.deposit.status === 'Paid' && !fpRefunded(pl.deposit));
  // A transfer Finance didn't verify as on time never counts, whatever a row says
  const bad = Object.values(P4().ver).filter(v => v.lid === w.me.id && v.state !== 'verified-timely' && (need.some(r => r.bankRef === v.ref) || (dep && v.kind === 'deposit' && s.pay.ref === v.ref)));
  if (depOk && need.every(rowOk) && !bad.length) return { state: 'cleared', route, what, text: route === 'A' ? 'Deposit and the remaining tuition received and verified.' : route === 'B' ? 'Deposit credited and the rest of payment 1 received and verified.' : route === 'FULL' ? 'Full fee received and verified.' : 'Payment 1 received and verified.' };
  const due = fpM(need.reduce((a, r) => a + Math.max(0, fpP(r.amount) - fpP(r.paid)), 0));
  const pend = p4Claims(w).some(c => c.open) || need.some(r => r.confirming) || (dep && !depOk && !!pl.deposit && /Awaiting/.test(pl.deposit.status || '')) || (!dep && /Awaiting/.test(p.status || '') && !rowOk(pl.rows[0]));
  if (pend) return { state: 'pending', route, what, due, text: 'A bank transfer is awaiting verification by Finance. It counts once Finance confirms when the money arrived.' };
  return { state: 'unpaid', route, what, due, text: dep && !depOk ? 'The deposit hasn\'t been received.' : `${money(due, 'GBP')} of ${what} still to pay.` };
}

/* ---------- The decision ---------- */
const P5_NEXT = { pay: ['payments', 'Go to Payments'], status: ['payments', 'View payment status'], adm: ['admission', 'Admission & documents'], msg: ['messages', 'Message the Academy'] };
function p5Decide(w, eid = 'nvq') {
  const at = now().getTime();
  const D = (allowed, code, reason, o = {}) => Object.freeze({ allowed, code, reason, next: o.next || null, refs: Object.freeze(o.refs || {}), pay: o.pay || null, com: o.com || null, policy: o.policy || 'REVISED-1', rule: P5_RULE, at: new Date(at).toISOString(), applies: o.applies !== false });
  if (eid !== 'nvq') return D(true, 'P5-NOT-PROGRAMME', 'The revised access gate covers the NVQ/RQF programme only; this enrolment follows its own rules.', { applies: false, policy: null });
  if (!w || !w.me || !w.me.id) return D(false, 'P5-IDENTITY', 'No learner record could be identified.', { next: P5_NEXT.msg, policy: null });
  if (!p5Applies(w)) return D(true, 'P5-LEGACY', 'Legacy terms (LEGACY-1): access follows the existing rules.', { applies: false, policy: 'LEGACY-1' });
  const s = w.signup, link = s.termsRef ? TERMS().links[s.termsRef] : null, refs = { termsRef: s.termsRef || null, batch: s.batch || null };
  if (!link) return D(false, 'P5-TERMS', 'The terms record for this sign-up can\'t be found, so the terms that govern it can\'t be confirmed.', { next: P5_NEXT.msg, refs, policy: null });
  if (link.policy !== 'REVISED-1') return D(false, 'P5-TERMS', `This sign-up has revised-terms records but its terms link says ${link.policy}.`, { next: P5_NEXT.msg, refs, policy: link.policy });
  if (link.lid !== w.me.id) return D(false, 'P5-IDENTITY', 'The terms record belongs to a different learner ID.', { next: P5_NEXT.msg, refs });
  if (chSponsored(w)) return D(false, 'P5-AGENCY-P9', 'Agency-sponsored access under the revised terms needs the agency payment arrangement checks, which aren\'t built yet (P9).', { next: P5_NEXT.msg, refs });
  // A revised release clears the sign-up's batch: the forfeiture record names it
  const forf = P4().forf[p4Key(w)]; if (forf) return D(false, 'P5-FORFEITED', `The reservation in ${forf.batch} was released (${forf.id}).`, { next: P5_NEXT.adm, refs: { ...refs, batch: forf.batch, forfeiture: forf.id } });
  const b = s.batch ? chBatch(s.batch) : null; if (!b) return D(false, 'P5-NO-BATCH', 'No batch is assigned to this enrolment.', { next: P5_NEXT.adm, refs });
  if (!s.done) return D(false, 'P5-NOT-ENROLLED', 'The sign-up isn\'t complete.', { next: P5_NEXT.adm, refs });
  if (s.p4 && s.p4.batch !== s.batch) return D(false, 'P5-NO-BATCH', `The signed terms are for ${s.p4.batch}, not ${s.batch}.`, { next: P5_NEXT.msg, refs });
  if (!w.nvq || !['Active', 'Completed'].includes(w.nvq.status) || !(w.enrolments || []).includes(w.nvq)) return D(false, 'P5-NOT-ENROLLED', `There is no confirmed enrolment on the programme (${(w.nvq && w.nvq.status) || 'none'}).`, { next: P5_NEXT.msg, refs });
  if (!seatActive(b.code, w.me.id)) return D(false, 'P5-NO-SEAT', `The seat ledger shows no active place in ${b.code}.`, { next: P5_NEXT.msg, refs });
  const pay = p5Pay(w), com = p5Commence(b, at), o = { refs: { ...refs, route: pay.route || null, payRef: s.pay ? s.pay.ref : null }, pay, com };
  if (pay.state === 'exception') return D(false, 'P5-EXCEPTION', pay.text, { ...o, next: P5_NEXT.msg });
  if (pay.state === 'pending') return D(false, 'P5-PENDING', pay.text, { ...o, next: P5_NEXT.status });
  if (pay.state !== 'cleared') return D(false, pay.state === 'unknown' ? 'P5-PAY-UNKNOWN' : 'P5-UNPAID', pay.text, { ...o, next: pay.state === 'unknown' ? P5_NEXT.msg : P5_NEXT.pay });
  if (com.state === 'not-commenced') return D(false, 'P5-NOT-STARTED', 'Your batch hasn\'t started yet.', { ...o, next: P5_NEXT.adm });
  if (com.state !== 'commenced') return D(false, 'P5-COMMENCE-UNKNOWN', com.why, { ...o, next: P5_NEXT.adm });
  return D(true, 'P5-OK', 'Enrolled, first payment verified, batch commenced.', o);
}
// The decision when it blocks the current learner, else null
const p5Blocked = (w = W) => { if (!w || !p5Applies(w)) return null; const d = p5Decide(w); return d.allowed ? null : d; };

/* ---------- Enforcement: the end of the lockFor chain (pages, deep links, SEC-01 actions) ---------- */
const P5_ROUTES = ['assignments', 'assignment', 'progress', 'observations'];
const p5Route = r => P5_ROUTES.includes(r) || (['course', 'quiz'].includes(r) && (S.params || {}).id === 'nvq');
const P5_TITLE = { 'P5-UNPAID': 'Learning opens after your first payment', 'P5-PENDING': 'Your payment is being verified', 'P5-NOT-STARTED': 'Your batch hasn\'t started yet', 'P5-COMMENCE-UNKNOWN': 'Learning opens when your batch commences', 'P5-FORFEITED': 'Your reservation was released', 'P5-EXCEPTION': 'Your payment needs a Finance review', 'P5-AGENCY-P9': 'Your sponsored access isn\'t open yet' };
const p5LockOf = d => ({ title: P5_TITLE[d.code] || 'We can\'t open your programme yet', msg: esc(d.reason), cta: d.next, p5: d });
const p5Base = lockFor; // the chain before P5 (tests compare legacy results with it)
lockFor = function (r) {
  const base = p5Base.apply(this, arguments); if (base || !W || !W.me) return base;
  if (!p5Route(r) || !p5Applies(W)) return null;
  const d = p5Decide(W); return d.allowed ? null : p5LockOf(d);
};
// The CH-10 sign-up lock promises learning "as soon as you finish your sign-up"; on revised terms that isn't so
const _lfWordsP5 = lockFor;
lockFor = function (r) {
  const l = _lfWordsP5.apply(this, arguments);
  return l && !l.p5 && l.title === 'Finish your sign-up' && W && p5Applies(W) ? { ...l, msg: 'Finish your sign-up: documents, offer letter and payment. Under your terms, learning opens when your first payment is verified and your batch has commenced.' } : l;
};
// Page denials are logged once per learner, page and reason in a session (a page is drawn on every change)
const P5_SEEN = new Set();
function p5Log(d, what, w = W) {
  logA('Learner access', `${p5Who(w)}${w && w.nvq ? ' · ' + w.nvq.title : ''}`, `Blocked: ${what} (learning access not open)`, '—', '—', `${d.code} — ${d.reason}`);
}

/* ---------- The pre-start page and the dashboard card ---------- */
function p5Facts(w, d) {
  const s = w.signup, b = s && s.batch ? chBatch(s.batch) : null, com = d.com || (b ? p5Commence(b) : null), pay = d.pay;
  const start = !b ? '—' : com && com.tz && com.startYmd ? `${esc(p4Day(com.startYmd))} (${esc(com.tz)}) · scheduled start ${esc(fmtTz(b.start, com.tz))}` : `${esc(fd(b.start))} — the batch's Academy time zone isn't set`;
  const opens = d.allowed ? 'Open' : com && com.test && com.state !== 'commenced' ? `At ${esc(fmtTz(com.ms, com.tz))} <span class="xs muted">(test commencement instant — test data, not Academy policy)</span>` : 'After your batch commences and your first payment is verified. The exact opening moment on the start date isn\'t decided yet (U-05), so no countdown is shown.';
  const payTxt = !pay ? '—' : `${esc(pay.text)}${pay.state !== 'cleared' && s.p4 && pay.route && ['A', 'B'].includes(pay.route) ? ` Deadline: received ${esc(p4BalTxt(s.p4))}.` : ''}`;
  return `<dl class="kv p5-facts"><dt>Programme</dt><dd>${esc((w.nvq && w.nvq.title) || '—')}</dd><dt>Batch</dt><dd>${esc(b ? chBatchLbl(b) : '—')}</dd><dt>Batch start</dt><dd>${start}</dd><dt>Payment</dt><dd>${payTxt}</dd><dt>Learning</dt><dd>${opens}</dd></dl>`;
}
function p5Actions(d) {
  const seen = new Set(), list = [d.next, P5_NEXT.adm, P5_NEXT.pay, P5_NEXT.msg].filter(x => x && !seen.has(x[0]) && seen.add(x[0]));
  return `<div class="row" style="justify-content:center">${list.map((x, i) => `<button class="btn ${i ? '' : 'btn-primary'}" data-go="${x[0]}">${x[1]}</button>`).join('')}</div>`;
}
const _lpP5 = lockedPage;
lockedPage = function (l) {
  if (!l || !l.p5 || !W) return _lpP5.apply(this, arguments);
  const d = l.p5, k = `${W.me.id}|${S.route}|${d.code}`; if (!P5_SEEN.has(k)) { P5_SEEN.add(k); p5Log(d, `open ${S.route}`); }
  return `<div class="lockpage p5-pre"><div class="lock-ic">${ic(d.code === 'P5-NOT-STARTED' || d.code === 'P5-COMMENCE-UNKNOWN' ? 'cal' : 'lock', 30)}</div><h1>${esc(l.title)}</h1><p class="muted">${l.msg}</p>
    <section class="card" style="text-align:left;max-width:640px;margin:0 auto">${p5Facts(W, d)}<p class="xs muted">Revised terms (test fixture — not in force for real learners). Your admission, documents, offer letter, payments and messages stay available.</p></section>${p5Actions(d)}</div>`;
};
function p5Card(w) {
  if (!w || !w.signup || !w.signup.done || !p5Applies(w)) return '';
  const d = p5Decide(w);
  return `<section class="card p5-card"><div class="row-b"><h2>Your programme</h2>${chip(d.allowed ? 'Learning open' : P5_TITLE[d.code] || 'Not open yet', d.allowed ? 'green' : d.code === 'P5-NOT-STARTED' || d.code === 'P5-COMMENCE-UNKNOWN' ? 'blue' : 'amber')}</div>
    ${d.allowed ? '' : `<p class="small">${esc(d.reason)}</p>`}${p5Facts(w, d)}${d.allowed ? '' : `<div class="row">${[d.next, P5_NEXT.adm].filter((x, i, a) => x && a.findIndex(y => y && y[0] === x[0]) === i).map((x, i) => `<button class="btn btn-sm ${i ? '' : 'btn-primary'}" data-go="${x[0]}">${x[1]}</button>`).join('')}</div>`}</section>`;
}
const _dashP5 = SCREENS.dashboard;
SCREENS.dashboard = function (p) { const h = _dashP5.apply(this, arguments), c = typeof h === 'string' ? p5Card(W) : ''; return c ? chAfterHead(h, c) : h; };

/* ---------- Item-level guards: NVQ resources, downloads, Zoom links, PD join, the assignment PDF and brief ---------- */
const p5NvqGroup = g => !!g && !g.courseId && !!W.nvq && g.course === W.nvq.title;
const p5ResOf = id => { for (const g of (W && W.resources) || []) { const i = (g.items || []).find(x => x.id === id); if (i) return { g, i }; } return null; };
const p5NvqEv = e => !!e && !!W && !!W.nvq && e.course === W.nvq.title;
const p5Ev = id => ((W && W.events) || []).find(e => e.id === id);
const p5NvqFile = f => { const t = String(f || '').replace(/\.pdf$/i, ''); return ((W && W.resources) || []).some(g => p5NvqGroup(g) && (g.items || []).some(i => i.title === t)); };
const P5_ACTS = [
  ['joinZoom', el => p5NvqEv(p5Ev(el && el.dataset && el.dataset.id)), 'join a class on Zoom'],
  ['joinPd', () => true, 'join a Professional Discussion'],
  ['openRes', el => { const o = p5ResOf(el && el.dataset && el.dataset.id); return !!o && p5NvqGroup(o.g); }, 'open a learning resource'],
  ['resPlay', el => { const o = p5ResOf(el && el.dataset && el.dataset.id); return !!o && p5NvqGroup(o.g); }, 'play a learning resource'],
  ['resScorm', el => { const o = p5ResOf(el && el.dataset && el.dataset.id); return !!o && p5NvqGroup(o.g); }, 'complete a learning resource'],
  ['fakeDl', el => p5NvqFile(el && el.dataset && el.dataset.f), 'download a learning resource'],
  ['pdfDl', () => true, 'download an assignment'],
  ['briefChanges', () => true, 'open an assignment brief'],
];
P5_ACTS.forEach(([name, mine, what]) => {
  const g = ACT[name]; if (typeof g !== 'function') return;
  ACT[name] = function (el) {
    const d = W && W.flags && W.flags.nvq && mine(el) ? p5Blocked(W) : null;
    if (d) { p5Log(d, what); if (MODAL) closeModal(); toast(`${P5_TITLE[d.code] || 'Learning access isn\'t open'}: you can't ${what} yet. Nothing was changed.`, 'err'); return false; }
    return g.apply(this, arguments);
  };
});
// Class events stay visible (times and titles); the Zoom link appears only when learning is open
const _joinP5 = joinBtn;
joinBtn = function (ev) { return p5NvqEv(ev) && p5Blocked(W) ? `<button class="btn btn-sm" disabled>${ic('zoom', 15)}Join on Zoom</button><span class="xs muted">Opens when your learning access opens</span>` : _joinP5.apply(this, arguments); };
const _evPopP5 = ACT.evPop;
ACT.evPop = function (el) {
  const e = p5Ev(el && el.dataset && el.dataset.id); if (!p5NvqEv(e) || !e.link || !p5Blocked(W)) return _evPopP5.apply(this, arguments);
  const link = e.link; e.link = ''; try { return _evPopP5.apply(this, arguments); } finally { e.link = link; }
};
// Learning Resources: the programme's resources are replaced by a note while learning isn't open; short-course resources are unchanged
const _resP5 = SCREENS.resources;
SCREENS.resources = function () {
  const d = W && W.flags && W.flags.nvq ? p5Blocked(W) : null; if (!d) return _resP5.apply(this, arguments);
  // The programme's resources are rebuilt from the course builder as the page is drawn (S4b): sync once, then draw without them
  const sync = typeof s4bSyncW === 'function' ? s4bSyncW : null; if (sync) sync(W);
  const all = W.resources; let h; W.resources = all.filter(g => !p5NvqGroup(g)); if (sync) s4bSyncW = () => {};
  try { h = _resP5.apply(this, arguments); } finally { W.resources = all; if (sync) s4bSyncW = sync; }
  return chAfterHead(h, `<div class="note b-blue p5-res">${ic('lock')}<div class="small"><strong>${esc(W.nvq.title)}:</strong> its learning resources open when your learning access opens — ${esc(d.reason)}</div></div>`);
};

/* ---------- Wording on revised terms: the sign-up no longer promises learning straight away ---------- */
const _itemP5 = chSignupItem;
chSignupItem = function () { const o = _itemP5.apply(this, arguments); return W && p5Applies(W) && o && typeof o.d === 'string' ? { ...o, d: o.d.replace('you start straight away', 'learning opens when your first payment is verified and your batch has commenced') } : o; };
let P5_SU = false;
const _toastP5 = toast;
toast = function (m) { if (P5_SU && typeof m === 'string') arguments[0] = m.replace('You\'re in — your programme is open.', 'Sign-up complete. Learning opens when your first payment is verified and your batch has commenced.'); return _toastP5.apply(this, arguments); };
const _nlP5 = notifyLearner;
notifyLearner = function (v, cat, title, body) { if (P5_SU && title === 'Sign-up complete — start learning') { arguments[2] = 'Sign-up complete'; arguments[3] = String(body).replace('Your programme is open. The Academy reviews your application while you learn, usually within 7 days.', 'Learning opens when your first payment is verified and your batch has commenced. The Academy reviews your application in the meantime.'); } return _nlP5.apply(this, arguments); };
const _ccP5 = chComplete;
chComplete = function (w) { const was = P5_SU; P5_SU = !!(w && p5Applies(w)); try { return _ccP5.apply(this, arguments); } finally { P5_SU = was; } };
const _panelP5 = p4PayPanel;
p4PayPanel = function () { const h = _panelP5.apply(this, arguments); return typeof h === 'string' ? h.replace('(The revised access rules are a later stage, P5 — in this prototype access still follows the existing rule.)', 'Learning opens only when the required first payment is verified and your batch has commenced.') : h; };

/* ---------- Staff: the decision shown read-only on the learner record ---------- */
const _lAdmP5 = lAdm;
lAdm = function (L, w) {
  const h = _lAdmP5.apply(this, arguments); if (!w || !w.signup || !w.signup.done || !p5Applies(w) || typeof h !== 'string') return h;
  const d = p5Decide(w);
  return `<section class="card p5-adm"><h2>Learning access (revised terms — test fixture)</h2><p class="small">${chip(d.allowed ? 'Open' : 'Not open', d.allowed ? 'green' : 'amber')} <span class="mono xs">${esc(d.code)}</span> ${esc(d.reason)}</p><p class="xs muted">Derived from the terms link, enrolment, seat ledger, verified payments and the batch's commencement (${P5_RULE}). Staff access to this learner's record is unchanged.</p></section>` + h;
};

UXC.push(['P5', 'Revised learner access gate — built, not in force (12 Nov 2026)', [
  'For learners on the revised terms only (none in force: REVISED-1 can\'t be activated; only the regression harness can link it): the programme\'s learning opens when the enrolment is confirmed, the required first payment is verified and the batch has commenced. A deposit, a pending bank transfer or a late receipt never opens it.',
  'Before then the learner sees their programme, batch, start date, payment status and what happens next; admission, documents, payments and messages stay open. The exact commencement moment is undecided (U-05), so it isn\'t guessed. Legacy learners are unchanged.']]);
