/* ============================================================
   1A — NVQ enrolment corrections from Welfare Academy's email (13 Nov 2026; PD-1A-* in PROVISIONAL-DECISIONS.md).
   Loads after p9-finance.js, so its wrappers are outermost.

   1. Commencement gate (highest priority). For NEW NVQ enrolments, completing the sign-up (documents, offer letter, payment) no
      longer opens learning by itself: learning opens on or after the selected batch's official start, in the batch's configured
      IANA time zone, and every existing requirement (sign-up complete, no pause, archive, withdrawal or release) still applies.
      - "New" = a sign-up started by the learner from now on. ch8StartSignup records the rule on the sign-up (signup.startRule,
        frozen) when it starts — as P2 pins the terms version at the start. Records built by the fixtures (initStore, buildAdmin,
        the client demo build, demo states) and every sign-up started before this change carry no rule: their access is unchanged
        (LEGACY-1 historical access isn't altered retroactively). REVISED-1 stays inactive; learners on it remain P5/P9's.
      - Commencement uses only stored facts. Before the batch's local start date begins → not started. From the stored start instant
        on → started under either candidate meaning of U-05 (the start of the date, or the stored start time). Between the two (the
        start date, before the stored time) the moment is undecided (U-05 open) → fails closed. No configured zone → fails closed,
        except that a start more than 25 hours away can't have arrived in any zone (so the learner is told it hasn't started).
        Missing batch or start date → fails closed.
      - Enforced at the end of the shared lockFor chain (pages, deep links, every SEC-01 protected action) plus item guards for NVQ
        resources and downloads, class Zoom links, the PD join and the assignment PDF/brief. Onboarding (Admission & Documents,
        the offer letter, payments), batch details, calendar, messages, help, requests, profile and Actions Needed — including the
        workplace details of Observations & Workplace — stay open before the start.
   2. Date of birth on sign-up step 1 is a date input, validated (a real date, not in the future, from 1900 as the existing MR-36
      correction rule), stored as YYYY-MM-DD; a saved DOB in the older "14 Mar 1991" form is carried into the input.
   3. The offer-letter step shows the enrolment summary (programme, batch and start, delivery mode, fee option, total fee, payment
      options) before signing. The payment step already showed them with the schedule.
   4. Learner wording: no screen tells a new learner that paying starts their learning.
   5. The account verification screen says the code is simulated (prototype: no email or SMS is sent).
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE THE GATE ON THE SERVER.
   ============================================================ */
'use strict';

const N1A_RULE = 'NVQ-START-1';
const N1A_MSG = 'Once your enrolment requirements are complete, your learning access will begin on or after your selected batch\'s official start, subject to the applicable access requirements.';
const N1A_MSG_H = esc(N1A_MSG);

/* ---------- Which enrolments the rule governs ---------- */
// Fixture and demo-state builds create historical records: a sign-up started inside one is not a new enrolment
let N1A_SEED = 0;
const n1aSeedWrap = f => function () { N1A_SEED++; try { return f.apply(this, arguments); } finally { N1A_SEED--; } };
initStore = n1aSeedWrap(initStore);
buildAdmin = n1aSeedWrap(buildAdmin);
applyEdge = n1aSeedWrap(applyEdge);
if (typeof cdBuild === 'function') cdBuild = n1aSeedWrap(cdBuild);
// Regression harness only (PD-1A-10): suites written before 1A, whose subject isn't commencement, mark their sign-ups as started before
// 1A. Honoured only when the harness has pinned a fixture (window.ILM_FIXTURE), which a real browser never sets.
const n1aHarnessPre = () => typeof window !== 'undefined' && window.ILM_N1A_PRE === true && !!window.ILM_FIXTURE;
const _startN1A = ch8StartSignup;
ch8StartSignup = function (w) {
  const r = _startN1A.apply(this, arguments);
  if (!N1A_SEED && !n1aHarnessPre() && w && w.signup && !w.signup.done && !w.signup.startRule) w.signup.startRule = Object.freeze({ id: N1A_RULE, at: now().toISOString(), basis: 'Sign-up started by the learner after the 1A correction: learning opens on or after the batch\'s official start' });
  return r;
};
// Governed: a sign-up carrying the rule, on an NVQ programme, not on the revised terms (P5/P9 decide those)
const n1aApplies = w => !!(w && w.flags && w.flags.nvq && w.signup && w.signup.startRule && w.signup.startRule.id === N1A_RULE && !(typeof p5Applies === 'function' && p5Applies(w)));

/* ---------- Commencement: started, not started, or undetermined (fails closed) ---------- */
function n1aCommence(b, at = now().getTime()) {
  if (!b) return { state: 'unknown', code: 'N1A-NO-BATCH', why: 'No batch is assigned to your enrolment.' };
  const ms = Date.parse(b.start);
  if (!b.start || !Number.isFinite(ms)) return { state: 'unknown', code: 'N1A-NO-START', why: `${b.code} has no start date recorded.` };
  const z = batchTz(b);
  if (z.source !== 'configured') {
    // Without a zone the local start date can't be placed in time; every zone's start-of-date is under 25 hours before the stored instant
    if (at < ms - 25 * 36e5) return { state: 'not-started', code: 'N1A-NOT-STARTED', tzMissing: true, why: 'Your batch hasn\'t started yet.' };
    return { state: 'unknown', code: 'N1A-NO-TZ', why: `The Academy hasn't set the time zone for ${b.code}, so its official start can't be confirmed yet.` };
  }
  const startYmd = ymdIn(ms, z.tz), earliest = dayStart(startYmd, z.tz);
  if (at < earliest) return { state: 'not-started', code: 'N1A-NOT-STARTED', tz: z.tz, startYmd, why: 'Your batch hasn\'t started yet.' };
  if (at < ms) return { state: 'unknown', code: 'N1A-START-UNDECIDED', tz: z.tz, startYmd, why: 'Your batch starts today. The exact time learning opens on the start date hasn\'t been confirmed by the Academy yet.' };
  return { state: 'started', code: 'N1A-OK', tz: z.tz, startYmd };
}
// The decision for the learner's NVQ programme (derived each time; nothing is stored)
function n1aDecide(w) {
  if (!n1aApplies(w)) return { allowed: true, applies: false, code: 'N1A-NOT-GOVERNED' };
  const s = w.signup, b = s.batch ? chBatch(s.batch) : null;
  if (!s.done) return { allowed: false, applies: true, code: 'N1A-NOT-ENROLLED', why: 'Your sign-up isn\'t complete.', b };
  const c = n1aCommence(b);
  return { allowed: c.state === 'started', applies: true, code: c.code, why: c.why || '', com: c, b };
}
const n1aBlocked = (w = W) => { if (!w || !n1aApplies(w)) return null; const d = n1aDecide(w); return d.allowed ? null : d; };

/* ---------- Enforcement: the end of the lockFor chain ---------- */
const N1A_ROUTES = ['assignments', 'assignment', 'progress', 'observations'];
let N1A_WP = 0; // inside a workplace-details action (Actions Needed): allowed before the start
const n1aRoute = r => (N1A_ROUTES.includes(r) && !(r === 'observations' && (N1A_WP || (S.params || {}).tab === 'workplace'))) || (['course', 'quiz'].includes(r) && (S.params || {}).id === 'nvq');
const N1A_TITLE = { 'N1A-NOT-STARTED': 'Your batch hasn\'t started yet', 'N1A-START-UNDECIDED': 'Your batch starts today', 'N1A-NO-TZ': 'Your batch\'s start can\'t be confirmed yet', 'N1A-NO-START': 'Your batch\'s start can\'t be confirmed yet', 'N1A-NO-BATCH': 'No batch is assigned', 'N1A-NOT-ENROLLED': 'Finish your sign-up' };
const n1aBase = lockFor; // the chain before 1A
lockFor = function (r) {
  const base = n1aBase.apply(this, arguments);
  if (base) return base && !base.p5 && base.title === 'Finish your sign-up' && W && n1aApplies(W) ? { ...base, msg: `Finish your sign-up: documents, offer letter and payment. ${N1A_MSG}` } : base;
  if (!W || !W.me || !n1aRoute(r)) return null;
  const d = n1aBlocked(W); return d ? { title: N1A_TITLE[d.code] || 'Learning access isn\'t open yet', msg: esc(d.why), cta: ['admission', 'Admission & documents'], n1a: d } : null;
};
// Workplace details stay available (they belong to Actions Needed, not to learning)
[['ACT', 'changeWp'], ['ACT', 'resendPerm'], ['SUBMIT', 'wpSave']].forEach(([h, n]) => {
  const host = h === 'ACT' ? ACT : SUBMIT, g = host[n]; if (typeof g !== 'function') return;
  host[n] = function () { N1A_WP++; try { return g.apply(this, arguments); } finally { N1A_WP--; } };
});
const N1A_SEEN = new Set();
const n1aLog = (d, what, w = W) => logA('Learner access', `${chFullName(w)} (${w.me.id})${w.nvq ? ' · ' + w.nvq.title : ''}`, `Blocked: ${what} (batch not started)`, '—', '—', `${d.code} — ${d.why}`);

/* ---------- What the learner sees before the start ---------- */
function n1aStartTxt(b, com) {
  if (!b) return '—';
  if (com && com.tz && com.startYmd) return `${esc(p4Day(com.startYmd))} (${esc(com.tz)}) · scheduled start ${esc(fmtTz(b.start, com.tz))}`;
  return `${esc(fd(b.start))} <span class="xs muted">— the Academy hasn't set this batch's time zone yet</span>`;
}
function n1aFacts(w, d) {
  const b = d.b || (w.signup.batch ? chBatch(w.signup.batch) : null), com = d.com || (b ? n1aCommence(b) : null);
  return `<dl class="kv n1a-facts"><dt>Programme</dt><dd>${esc((w.nvq && w.nvq.title) || '—')}</dd><dt>Batch</dt><dd>${esc(b ? chBatchLbl(b) : '—')}</dd><dt>Official start</dt><dd>${n1aStartTxt(b, com)}</dd><dt>Learning access</dt><dd>${d.allowed ? 'Open' : 'Not open yet — it opens on or after the official start above, once your enrolment requirements are complete.'}</dd></dl>`;
}
const N1A_NOW = 'Available now: Admission &amp; Documents, your offer letter, Payments, your batch details and Calendar, Messages, Help, and the actions in Action needed — including your workplace details.';
const n1aBtns = (cls = '') => [['admission', 'Admission &amp; documents', ''], ['payments', 'Payments', ''], ['observations', 'Workplace details', 'workplace'], ['messages', 'Message the Academy', '']].map(([r, l, t], i) => `<button class="btn ${cls} ${i ? '' : 'btn-primary'}" data-go="${r}" ${t ? `data-tab="${t}"` : ''}>${l}</button>`).join('');
const _lpN1A = lockedPage;
lockedPage = function (l) {
  if (!l || !l.n1a || !W) return _lpN1A.apply(this, arguments);
  const d = l.n1a, k = `${W.me.id}|${S.route}|${d.code}`; if (!N1A_SEEN.has(k)) { N1A_SEEN.add(k); n1aLog(d, `open ${S.route}`); }
  return `<div class="lockpage n1a-pre"><div class="lock-ic">${ic(d.code === 'N1A-NOT-STARTED' || d.code === 'N1A-START-UNDECIDED' ? 'cal' : 'lock', 30)}</div><h1>${esc(l.title)}</h1><p class="muted">${l.msg}</p>
    <section class="card" style="text-align:left;max-width:640px;margin:0 auto"><p class="small">${N1A_MSG_H}</p>${n1aFacts(W, d)}<p class="xs muted">${N1A_NOW}</p></section><div class="row" style="justify-content:center">${n1aBtns()}</div></div>`;
};
function n1aCard(w) {
  if (!w || !w.signup || !w.signup.done || !n1aApplies(w)) return '';
  const d = n1aDecide(w); if (d.allowed) return '';
  return `<section class="card n1a-card"><div class="row-b"><h2>Your programme</h2>${chip(N1A_TITLE[d.code] || 'Not open yet', d.code === 'N1A-NOT-STARTED' ? 'blue' : 'amber')}</div>
    <p class="small">${N1A_MSG_H}</p>${n1aFacts(w, d)}<p class="xs muted">${N1A_NOW}</p><div class="row">${n1aBtns('btn-sm')}</div></section>`;
}
const _dashN1A = SCREENS.dashboard;
SCREENS.dashboard = function () { const h = _dashN1A.apply(this, arguments), c = typeof h === 'string' ? n1aCard(W) : ''; return c ? chAfterHead(h, c) : h; };
// Action needed: the workplace items open the Workplace details tab (the Observations list waits for the start)
const _aiN1A = actionItems;
actionItems = function () { const out = _aiN1A.apply(this, arguments); return Array.isArray(out) && n1aBlocked(W) ? out.map(a => a && a.go === 'observations' && /^(Enter your workplace details|Workplace permission)/.test(a.t || '') ? { ...a, tab: 'workplace' } : a) : out; };

/* ---------- Item guards: NVQ resources, downloads, Zoom links, PD join, the assignment PDF and brief ---------- */
const n1aNvqGroup = g => !!g && !g.courseId && !!W.nvq && g.course === W.nvq.title;
const n1aResOf = id => { for (const g of (W && W.resources) || []) { const i = (g.items || []).find(x => x.id === id); if (i) return { g, i }; } return null; };
const n1aNvqEv = e => !!e && !!W && !!W.nvq && e.course === W.nvq.title;
const n1aEv = id => ((W && W.events) || []).find(e => e.id === id);
const n1aNvqFile = f => { const t = String(f || '').replace(/\.pdf$/i, ''); return ((W && W.resources) || []).some(g => n1aNvqGroup(g) && (g.items || []).some(i => i.title === t)); };
const n1aRes = el => { const o = n1aResOf(el && el.dataset && el.dataset.id); return !!o && n1aNvqGroup(o.g); };
[['joinZoom', el => n1aNvqEv(n1aEv(el && el.dataset && el.dataset.id)), 'join a class on Zoom'], ['joinPd', () => true, 'join a Professional Discussion'],
  ['openRes', n1aRes, 'open a learning resource'], ['resPlay', n1aRes, 'play a learning resource'], ['resScorm', n1aRes, 'complete a learning resource'],
  ['fakeDl', el => n1aNvqFile(el && el.dataset && el.dataset.f), 'download a learning resource'], ['pdfDl', () => true, 'download an assignment'], ['briefChanges', () => true, 'open an assignment brief'],
].forEach(([name, mine, what]) => {
  const g = ACT[name]; if (typeof g !== 'function') return;
  ACT[name] = function (el) {
    const d = W && W.flags && W.flags.nvq && mine(el) ? n1aBlocked(W) : null;
    if (d) { n1aLog(d, what); if (MODAL) closeModal(); toast(`${N1A_TITLE[d.code] || 'Learning access isn\'t open yet'}: you can't ${what} yet. Nothing was changed.`, 'err'); return false; }
    return g.apply(this, arguments);
  };
});
const _joinN1A = joinBtn;
joinBtn = function (ev) { return n1aNvqEv(ev) && n1aBlocked(W) ? `<button class="btn btn-sm" disabled>${ic('zoom', 15)}Join on Zoom</button><span class="xs muted">Opens when your learning access opens</span>` : _joinN1A.apply(this, arguments); };
const _evPopN1A = ACT.evPop;
ACT.evPop = function (el) {
  const e = n1aEv(el && el.dataset && el.dataset.id); if (!n1aNvqEv(e) || !e.link || !n1aBlocked(W)) return _evPopN1A.apply(this, arguments);
  const link = e.link; e.link = ''; try { return _evPopN1A.apply(this, arguments); } finally { e.link = link; }
};
const _resN1A = SCREENS.resources;
SCREENS.resources = function () {
  const d = W && W.flags && W.flags.nvq ? n1aBlocked(W) : null; if (!d) return _resN1A.apply(this, arguments);
  const sync = typeof s4bSyncW === 'function' ? s4bSyncW : null; if (sync) sync(W);
  const all = W.resources; let h; W.resources = all.filter(g => !n1aNvqGroup(g)); if (sync) s4bSyncW = () => {};
  try { h = _resN1A.apply(this, arguments); } finally { W.resources = all; if (sync) s4bSyncW = sync; }
  return chAfterHead(h, `<div class="note b-blue n1a-res">${ic('lock')}<div class="small"><strong>${esc(W.nvq.title)}:</strong> its learning resources open on or after your batch's official start. ${esc(d.why)}</div></div>`);
};

/* ---------- Learner wording: paying doesn't start learning ---------- */
const n1aWords = h => h
  .replace(/(?:You start learning as soon as you(?:'|&#39;)ve paid\. )?The Academy reviews your application while you learn\./g, `${N1A_MSG_H} The Academy reviews your application in the meantime.`)
  .replace(/— you start now; Finance confirms your payment/g, '— Finance confirms your payment')
  .replace(/ You can start learning straight away\./g, '')
  .replace(/I(?:'|&#39;)ve made the transfer — start now/g, 'I\'ve made the transfer')
  .replace(/Start learning now; the Academy reviews your application while you learn\./g, `${N1A_MSG_H} The Academy reviews your application in the meantime.`)
  .replace(/data-act="suStart">Start learning<\/button>/g, 'data-act="suStart">Complete sign-up</button>')
  .replace(/You(?:'|&#39;)ve started — your application is waiting for a reviewer\./g, 'Your sign-up is complete — your application is waiting for a reviewer.');
const _admN1A = SCREENS.admission;
SCREENS.admission = function () {
  const h = _admN1A.apply(this, arguments); if (typeof h !== 'string' || !W || !n1aApplies(W)) return h;
  const d = n1aDecide(W), open = d.allowed;
  return n1aWords(h)
    .replace(/ Keep learning while we review\./g, open ? ' Keep learning while we review.' : ` ${N1A_MSG_H}`)
    .replace(/Open — since you finished sign-up; it doesn(?:'|&#39;)t wait for the admission decision/g, open ? 'Open — your batch has started; it doesn&#39;t wait for the admission decision' : `Not open yet. ${N1A_MSG_H}`);
};
const _itemN1A = chSignupItem;
chSignupItem = function () { const o = _itemN1A.apply(this, arguments); return W && n1aApplies(W) && o && typeof o.d === 'string' ? { ...o, d: o.d.replace(/ — you start straight away\./, '.').replace('Start learning.', 'Complete your sign-up.') } : o; };
// The apply dialog (before any sign-up exists, so always a new enrolment)
const _cdN1A = confirmDlg;
confirmDlg = function (o) {
  if (o && typeof o.body === 'string' && /Signing up takes five steps/.test(o.body)) o = { ...o, body: o.body.replace(/your payment, then you start\./g, `your payment. ${N1A_MSG_H}`) };
  return _cdN1A.call(this, o);
};
// Completing the sign-up: the toast and the notification
let N1A_SU = false;
const _toastN1A = toast;
toast = function (m) { if (N1A_SU && typeof m === 'string') arguments[0] = m.replace(/(?:You're in|Sign-up complete) — your programme is open\.(?: The Academy is still reviewing your application\.)?/, `Sign-up complete. ${N1A_MSG}`); return _toastN1A.apply(this, arguments); };
const _nlN1A = notifyLearner;
notifyLearner = function (v, cat, title, body) { if (N1A_SU && title === 'Sign-up complete — start learning') { arguments[2] = 'Sign-up complete'; arguments[3] = String(body).replace('Your programme is open. The Academy reviews your application while you learn, usually within 7 days.', `${N1A_MSG} The Academy reviews your application in the meantime, usually within 7 days.`); } return _nlN1A.apply(this, arguments); };
const _ccN1A = chComplete;
chComplete = function (w) { const was = N1A_SU; N1A_SU = !!(w && n1aApplies(w)); try { return _ccN1A.apply(this, arguments); } finally { N1A_SU = was; } };
// The offer letter of a governed sign-up doesn't promise learning straight away (letters of earlier sign-ups are unchanged)
const N1A_LETTER_OLD = /You can start learning straight away — the Academy reviews your application and documents while you learn, usually within 7 days\./g;
const N1A_LETTER_NEW = `${N1A_MSG_H} The Academy reviews your application and documents in the meantime, usually within 7 days.`;
const n1aWorldOf = sid => (sid ? Object.keys(STORE.worlds || {}).map(k => STORE.worlds[k]).find(x => x && x.me && x.me.id === sid) : null);
const _lhN1A = chLetterHtml;
chLetterHtml = function (letter, o = {}) { const h = _lhN1A.apply(this, arguments); return typeof h === 'string' && n1aApplies(n1aWorldOf(o.sid)) ? h.replace(N1A_LETTER_OLD, N1A_LETTER_NEW) : h; };

/* ---------- Offer-letter step: what is being signed for ---------- */
function n1aSummary(w) {
  const s = w.signup, b = s.batch ? chBatch(s.batch) : null, P = typeof cb9Pin === 'function' ? cb9Pin(w) : null, com = b ? n1aCommence(b) : null;
  const fee = P ? P.opt.fee : chFee(w), mode = (P && P.opt.mode) || w.nvq.mode || '—';
  let pay;
  if (chSponsored(w)) pay = `Covered by ${esc(w.me.sponsor)} — nothing to pay`;
  else if (P) {
    const dep = P.dep && P.dep.eff != null ? P.dep.eff : S4().cfg.deposit;
    pay = [cb9DepOk(w) ? `Deposit ${money(dep, 'GBP')} to hold your seat (the routes after the deposit are shown at the payment step)` : '', ...P.opt.pay.map(x => `${cb9PayLbl(x.k)} — ${esc(cbAmtTxt(P.opt.fee, x.k))}`)].filter(Boolean).join('<br>');
  } else pay = 'Shown at the payment step';
  return `<section class="card n1a-sum"><h2>Your enrolment</h2><dl class="kv"><dt>Programme</dt><dd>${esc(w.nvq.title)}</dd><dt>Batch</dt><dd>${esc(b ? chBatchLbl(b) : '—')}</dd><dt>Batch start</dt><dd>${n1aStartTxt(b, com)}</dd><dt>Delivery mode</dt><dd>${esc(mode)}</dd>${P ? `<dt>Fee option</dt><dd>${esc(P.opt.label)}</dd>` : ''}<dt>Total tuition</dt><dd class="num">${money(fee, 'GBP')}</dd><dt>Payment options</dt><dd class="small">${pay}</dd></dl>
    <p class="xs muted">You choose how to pay in the next step; the exact amounts and due dates are shown there before you pay. ${n1aApplies(w) ? N1A_MSG_H : ''}</p></section>`;
}
const _letterN1A = chStepLetter;
chStepLetter = function (w) { const h = _letterN1A.apply(this, arguments); if (typeof h !== 'string' || !w || !w.signup || !w.nvq) return h; try { return n1aSummary(w) + h; } catch (e) { return h; } };

/* ---------- Date of birth: a date input, validated ---------- */
const N1A_MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// A saved DOB as YYYY-MM-DD: ISO kept; "14 Mar 1991" / "2 November 1994" converted; anything else → ''
function n1aDobIso(v) {
  const t = String(v || '').trim(); if (ymdOk(t)) return t;
  const m = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(t), k = m ? N1A_MON.indexOf(m[2].slice(0, 3).toLowerCase()) : -1;
  if (k < 0) return '';
  const iso = `${m[3]}-${String(k + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`; return ymdOk(iso) ? iso : '';
}
const n1aDobMax = () => ymdIn(now(), 'Pacific/Kiritimati'); // the latest calendar date anywhere: no date valid somewhere is refused as "future"
function n1aDobWhy(v) {
  const t = String(v || '').trim();
  if (!t) return 'Enter your date of birth.';
  if (!ymdOk(t)) return 'Enter a real date of birth (day, month and year).';
  if (t > n1aDobMax()) return 'Your date of birth can\'t be in the future.';
  if (t < '1900-01-01') return 'Enter a date of birth after 1900.';
  return '';
}
const _detN1A = chStepDetails;
chStepDetails = function (w) {
  const h = _detN1A.apply(this, arguments); if (typeof h !== 'string' || !w || !w.signup) return h;
  const d = w.signup.details || {}, raw = d.dob || w.me.dob || '', iso = n1aDobIso(raw), lost = raw && raw !== '—' && !iso;
  return h.replace(/<input class="input" id="su-dob"[^>]*>/, `<input class="input" type="date" id="su-dob" value="${esc(iso)}" min="1900-01-01" max="${n1aDobMax()}" autocomplete="bday" required aria-describedby="su-dob-h"><span class="hint" id="su-dob-h">${lost ? `We couldn't read your saved date of birth (${esc(raw)}) as a date — please choose it again.` : 'Day, month and year.'}</span>`);
};
const _nextN1A = ACT.suNext;
ACT.suNext = function () {
  const w = W, el = $('#su-dob');
  if (w && w.signup && !w.signup.done && chStepKey(w) === 'details' && el) {
    // An empty field is left to the existing check (it runs after the batch choice, as before); an entered value must be a valid DOB
    const why = String(el.value || '').trim() ? n1aDobWhy(el.value) : ''; if (why) { fieldErr('#su-dob', why); toast(why, 'err'); return false; }
  }
  return _nextN1A.apply(this, arguments);
};

/* ---------- Account verification: simulated, said so ---------- */
const _rvN1A = regVerifyView;
regVerifyView = function () {
  const h = _rvN1A.apply(this, arguments);
  return typeof h === 'string' && h.includes('data-submit="regCode"') ? h.replace('<form class="stack" data-submit="regCode">', `<div class="note b-purple n1a-sim">${ic('info')}<div class="small"><strong>Prototype — simulated verification.</strong> No email or SMS is actually sent: the code appears in the Learner inbox (demo). Entering it doesn't prove that the address or number belongs to you.</div></div><form class="stack" data-submit="regCode">`) : h;
};

/* ---------- Staff: the decision read-only on the learner record ---------- */
const _lAdmN1A = lAdm;
lAdm = function (L, w) {
  const h = _lAdmN1A.apply(this, arguments); if (!w || !w.signup || !w.signup.done || !n1aApplies(w) || typeof h !== 'string') return h;
  const d = n1aDecide(w);
  return `<section class="card n1a-adm"><h2>Learning access — batch commencement</h2><p class="small">${chip(d.allowed ? 'Open' : 'Not open', d.allowed ? 'green' : 'amber')} <span class="mono xs">${esc(d.code)}</span> ${esc(d.allowed ? 'The batch has started; the existing access rules apply.' : d.why)}</p><p class="xs muted">${N1A_RULE}: new NVQ enrolments open on or after the batch's official start in its Academy time zone (U-05 open: the start date before the stored start time fails closed). Staff access is unchanged.</p></section>` + h;
};

UXC.push(['1A', 'NVQ enrolment corrections — Welfare Academy email, point 1A (13 Nov 2026)', [
  'New NVQ enrolments: paying no longer opens learning. Learning opens on or after the selected batch\'s official start in its Academy time zone, with the existing requirements; before then the learner keeps Admission & Documents, Payments, batch details, Calendar, Messages, Help and Action needed (workplace details included). Learners enrolled before this change are unchanged.',
  'Date of birth is a date picker (a real date, not in the future); the offer-letter step shows the programme, batch and start, delivery mode, fee option, total tuition and payment options before signing; the verification screen says the code is simulated.']]);
