/* ============================================================
   Batch AC-3 — remaining Academic Admin defects (1 Nov 2026; PD-AC3-* in PROVISIONAL-DECISIONS.md). Loads last.
   The Medium and Low items of the Academic Admin audit left after AC-1 and AC-2:
   - Admissions: one row per learner (B1-D4); the 7-day escalation of real applications (B1-D5); the activation link opened only
     where its email would be (B1-D7); the learner's decision date (B1-D10) and first-upload label (B1-D11); who made each
     admission history row; the expiry date of a checklist item that has one.
   - Batches: "after the start" by date (B2-D7, academic.js); new batch dates that would leave confirmed sessions or deadlines after
     the end, and sessions after the end, are refused with the reason (B2-D8, B2-D9 — the end date; the start is a client question).
   - Approvals: a Data Correction's final approval only after the System Administrator's first review (B3-05); Raise Data
     Correction only for its raisers (B3-06); the recorder of a recommendation doesn't decide it (B4-D5).
   - Observations: the admin list from the learners' own records (B4-D8); a cancelled observation can't be accepted (B4-D13). The
     fee's due date after a reschedule is kept as CH-40 decides (B4-D14, client question).
   - Quizzes: extra attempts = the quiz's own allowance (B4-D9); no attempt beyond the allowance (B4-D10); one open request per
     quiz (B4-D11).
   AC-1 / AC-2 checks are reused (w0Deny, acFind, ac2Who). No new approval stage, access rule or financial rule; the Admissions
   Team gate stays on hold.
   ============================================================ */
'use strict';

const ac3No = (module, entity, act, why) => { logA(module, entity || '—', 'Blocked: ' + act, '—', 'No change', why); toast(why, 'err'); return false; };
// Re-check when a dialog's primary (or danger) action is confirmed
const ac3OnConfirm = check => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn || a._ac3) return; const g = a.fn; a._ac3 = true; a.fn = (...x) => (check() === false ? false : g(...x)); };

/* ---------- B1-D4: one row per learner ---------- */
// In the client demo every learner account is already a demo learner, and registration added registered learners again
const _dlAC3 = demoLearners;
demoLearners = function () { const seen = new Set(); return _dlAC3.apply(this, arguments).filter(l => !seen.has(l.v || l.id) && seen.add(l.v || l.id)); };

/* ---------- Admission history: who made each row ---------- */
// The queue's action history named the learner on every admission row (approved, rejected, reviewer assigned…). A row added now
// records who added it (ac2Who: the identity acting, or the system); an older row without one shows the learner for the
// learner's own sign-up steps and "Not recorded" otherwise — nothing is re-attributed by guessing.
const AC3_LEARNER_ROWS = /^(Sign-up|Details (and intake )?confirmed|Offer letter signed|Withdrawn by the learner)/; // the learner's own sign-up steps
const ac3Track = w => {
  const h = w && w.admission && w.admission.history; if (!Array.isArray(h) || h._ac3 || Object.isFrozen(h)) return;
  Object.defineProperty(h, '_ac3', { value: true }); Object.defineProperty(h, 'push', { value: function (...rows) { rows.forEach(r => { if (Array.isArray(r) && !r[2]) r[2] = ac2Who().name; }); return Array.prototype.push.apply(this, rows); } });
};
const ac3TrackAll = () => { try { Object.values((STORE && STORE.worlds) || {}).forEach(ac3Track); } catch (e) { /* never block */ } };
const ac3RowBy = (w, h, k) => (k === 0 || AC3_LEARNER_ROWS.test(h[0]) ? chFullName(w) : h[2] || (/^Seat released/.test(h[0]) ? AC2_SYSTEM.name : 'Not recorded'));

/* ---------- B1-D5: 7-day admission escalation ---------- */
// "Who approves what": an admission not decided by the first approver within 7 days escalates to the Super Administrator. Real
// applications didn't (escalated: false). The 7 days run, on the demo clock, from when the application awaited review (sign-up
// complete); a decision ends it. The escalation is recorded once (a system audit entry, a notice to the Super Administrator) and
// the admission is then the Super Administrator's to decide (as an escalated queue item is, PD-AC-01). Documents are unaffected.
// The demo's simulated date is dpNow() (Payment Plans → Payment reminders moves it), the clock the seat-hold check already uses.
const ac3Now = () => (typeof dpNow === 'function' ? dpNow() : now());
const AC3_OPEN = ['Awaiting review', 'Under Review', 'Pending — Documents Required'];
const ac3Since = w => { const h = (w.admission.history || []).find(x => /^Sign-up complete|^Awaiting review/.test(x[0])) || w.admission.history[0]; return h ? h[1] : null; };
const ac3Escalated = w => { const ad = w && w.admission, at = ad && AC3_OPEN.includes(ad.status) && ac3Since(w); return !!at && (ac3Now() - new Date(at)) / DAY >= 7; };
// The Super Administrator's own notifications, whichever admin identity is loaded (agylink.js pattern). Role screens hide that list
// while they draw, so a notice raised then is held and delivered at the start of the next render.
const ac3SaInbox = () => ADMIN._saNotifs || (isSAMe() ? ADMIN.myNotifs : null);
const ac3SaNotify = n => { const l = ac3SaInbox(); if (l) l.unshift(n); else (ADMIN._ac3Pend = ADMIN._ac3Pend || []).push(n); };
const ac3SaFlush = () => { const p = ADMIN && ADMIN._ac3Pend, l = p && p.length && ac3SaInbox(); if (l) { p.forEach(n => l.unshift(n)); ADMIN._ac3Pend = []; } };
function ac3Escalate(v) {
  const w = STORE.worlds[v], ad = w.admission; if (ad.escalatedAt) return; ad.escalatedAt = ac3Now().toISOString();
  const name = chFullName(w), go = 'a-admissions.APP-' + v;
  ac3SaNotify({ t: 'Admission escalated — no decision for 7 days', b: `APP-${v} · ${name} · ${w.nvq.title}`, at: ad.escalatedAt, unread: true, go });
  AC2_SYS++; try { logA('Admissions', `${name} (APP-${v})`, 'Escalated to the Super Administrator', ad.status, 'Escalated', `No decision by ${String(ad.reviewer || 'the reviewer').replace(' (Admissions)', '')} within 7 days`); } finally { AC2_SYS--; }
}
const _appsAC3 = allApplications;
allApplications = function () {
  const out = _appsAC3.apply(this, arguments);
  out.forEach(a => { const w = a.v && STORE.worlds[a.v]; if (!w || !w.admission) return; ac3Track(w); if (ac3Escalated(w)) { a.escalated = true; ac3Escalate(a.v); } else if (w.admission.escalatedAt && AC3_OPEN.includes(w.admission.status)) a.escalated = true; });
  return out;
};
const ac3EscWhy = id => { const a = ac2App(id); return a && a.escalated && AC3_OPEN.includes(a.status) && !isSA() ? 'This application was escalated after 7 days without a decision — the Super Administrator decides it.' : ''; };
[['appApprove', 'approve an admission'], ['appReject', 'reject an application'], ['appWithdraw', 'withdraw an application']].forEach(([n, label]) => {
  const g = ACT[n]; if (!g) return;
  ACT[n] = el => { const id = el && el.dataset && el.dataset.id, chk = () => { const why = ac3EscWhy(id); return why ? w0Deny('Admissions', id || '—', label, why) : true; };
    if (chk() === false) return false; const m0 = MODAL, r = g(el); if (MODAL && MODAL !== m0) ac3OnConfirm(chk); return r; };
});
const _aaAC3 = admissionApprove;
admissionApprove = function (v) { const why = ac3EscWhy('APP-' + v); return why ? w0Deny('Admissions', 'APP-' + v, 'approve an admission', why) : _aaAC3.apply(this, arguments); };
const _apdAC3 = appDetail;
appDetail = function (id) {
  const h = _apdAC3.apply(this, arguments), why = typeof h === 'string' && ac3EscWhy(id); if (!why) return h;
  return h.replace(/<section class="card"><h2>Decision<\/h2>[^]*?<\/section>/, `<section class="card ac3-esc"><h2>Decision</h2><div class="note b-red">${ic('lock')}<div class="small">${esc(why)}</div></div></section>`);
};

/* ---------- B1-D7: the activation link ---------- */
// The link is the simulated activation email: it is opened from the learner's record by staff (to show the page the email opens), or
// from a signed-out browser. A learner, Coordinator, staff or agency session can't open another learner's link and become them.
const _laAC3 = ACT.lnActLink;
ACT.lnActLink = el => (S.signedIn && S.portal !== 'admin' ? w0Deny('Learners', (el && el.dataset && el.dataset.id) || '—', 'open another learner\'s activation link', 'An activation link is opened from the learner\'s own email. Sign out first — it can\'t be opened from a signed-in account.') : _laAC3(el));
const _soAC3 = signOut;
signOut = function () { const keep = S.lnAct && S.auth === 'first'; const r = _soAC3.apply(this, arguments); if (!keep) S.lnAct = null; return r; };

/* ---------- B1-D10 / document expiry: the decision's date, and the expiry date an item requires ---------- */
// A checklist item with "Has an expiry date" (S4-05) is approved with the expiry date read from the document; one already passed
// isn't approved. No reminder or renewal policy is added (the applicant is told they'll replace it before it expires — S4-05).
let AC3_EXP = null;
const ac3ExpWhy = iso => !iso ? 'Enter the expiry date shown on the document.' : new Date(iso) <= now() ? 'This document has already expired, so it can\'t be approved. Ask for a current one (Reject or Request resubmission).' : '';
const _ddAC3 = docDecision;
docDecision = function (v, d, status) {
  const w = v && STORE.worlds[v], live = w ? (w.docs || []).find(x => d && x.id === d.id) : d;
  if (live && status === 'Approved' && live.expiryReq && admCanDecide() && !ac2DocWhy(live, status)) { const why = ac3ExpWhy(AC3_EXP); if (why) return ac3No('Admissions & Documents', `${w ? VNAME(v) : '—'} · ${live.name}`, 'approve a document without its expiry date', why); }
  const r = _ddAC3.apply(this, arguments);
  if (r !== false && live && !live.replacement && (live.status === status || status === 'Approved')) { live.decidedAt = now().toISOString(); if (status === 'Approved' && live.expiryReq && AC3_EXP) live.expires = AC3_EXP; }
  return r;
};
const ac3ExpField = d => `<div class="field ac3-exp"><label for="ac3-exp">Expiry date on the document</label><input class="input" type="date" id="ac3-exp"><span class="hint">${esc(d.name)} has an expiry date (checklist).</span></div>`;
const ac3ReadExp = () => { const x = ($('#modal-root #ac3-exp') || {}).value; return x ? new Date(x + 'T23:59:00Z').toISOString() : null; };
const _docDecAC3 = ACT.docDec;
ACT.docDec = el => {
  const ds = (el && el.dataset) || {}, a = ac2App(ds.a), d = a && (a.docs || []).find(x => x.id === ds.d);
  if (!(d && d.expiryReq && ds.s === 'Approved') || !admCanDecide() || ac2DocWhy(d, 'Approved')) return _docDecAC3(el);
  openModal({ title: 'Approve — ' + esc(d.name), body: ac3ExpField(d), actions: [{ label: 'Cancel' }, { label: 'Approve document', cls: 'btn-primary', fn: () => {
    const iso = ac3ReadExp(), why = ac3ExpWhy(iso); if (why) { fieldErr('#ac3-exp', why); return false; }
    closeModal(); AC3_EXP = iso; try { return _docDecAC3(el); } finally { AC3_EXP = null; }
  } }] });
};
const _qDoAC3 = ACT.qDo;
ACT.qDo = el => {
  const id = el && el.dataset && el.dataset.id, i = id && acFind(id), a = el && el.dataset && el.dataset.a;
  // B3-05: the final approval waits for the System Administrator's first review
  if (i && i.type === 'Data correction' && a === 'approveFinal' && !ac3DcReady(i) && isOpen(i)) return w0Deny('Approvals Queue', i.id, 'give a Data Correction\'s final approval', AC3_DC_WHY);
  // B4-D9: the decision dialog says how many attempts the grant gives
  if (i && i.type === 'Extra quiz attempts' && a === 'grant') { const r = _qDoAC3(el), rm = i.req && i.v && shReqMod(STORE.worlds[i.v], i.req); if (MODAL && rm) { MODAL.body = MODAL.body.replace('the quiz\'s original number of attempts (3)', `the quiz's original number of attempts (${ac3Base(rm.m.quiz)})`); renderModal(); } return r; }
  const r = _qDoAC3(el);
  if (i && i.doc && a === 'approve' && MODAL && i.doc.expiryReq) { MODAL.body = MODAL.body.replace('<div class="field"><label for="rsn">', ac3ExpField(i.doc) + '<div class="field"><label for="rsn">'); renderModal(); const act = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (act && act.fn) { const g = act.fn; act.fn = (...x) => { const iso = ac3ReadExp(), why = ac3ExpWhy(iso); if (why) { fieldErr('#ac3-exp', why); return false; } AC3_EXP = iso; try { return g(...x); } finally { AC3_EXP = null; } }; } }
  return r;
};

/* ---------- B3-05 / B3-06 / B4-D5: Data Corrections and recommendations ---------- */
const AC3_DC_WHY = 'A Data Correction is approved by the Super Administrator after the System Administrator\'s first review. Waiting for that review (Forward).';
// MR-23 (SYS_VARIANTS.SC: "own items route to the Super Administrator"): the first review is waited for only while another active
// System Administrator — not the raiser and not the learner the item is about — can give it. When none exists the Super
// Administrator may give the final approval without it (the item says so).
const ac3NoReviewer = i => typeof sysNames === 'function' && !sysNames().some(n => n !== i.raisedBy && !String((i.related || [])[0] || '').startsWith(n + ' ·'));
const ac3DcReady = i => !!i && (i.stage === 'final' || ac3NoReviewer(i));
const _adAC3 = applyDecision;
applyDecision = function (i, a, r, o) {
  if (i && a !== 'note' && !AC_OVERRIDE) {
    if (i.type === 'Data correction' && a === 'approveFinal' && !ac3DcReady(i) && !i._sa && isOpen(i)) return w0Deny('Approvals Queue', i.id, 'give a Data Correction\'s final approval', AC3_DC_WHY);
    // The Academic Admin who raised an academic item, recorded its recommendation or is its learner decides none of its verbs
    // (approve-type verbs were already blocked; reject / decline / return weren't for the recorder). The Super Administrator is exempt (rule 1).
    if (ACA_TYPES.includes(i.type) && isOpen(i) && !isSA() && typeof acaBlocked === 'function' && acaBlocked(i)) return w0Deny('Approvals Queue', i.id, 'decide an item you recorded or raised', 'You raised this item or recorded its recommendation, so another Academic Admin (or the Super Administrator) decides it.');
  }
  // B4-D9: extra attempts are the quiz's own allowance (the decision text says so); it was always 3
  const rm = i && i.type === 'Extra quiz attempts' && a === 'grant' && i.req && i.v && STORE.worlds[i.v] ? shReqMod(STORE.worlds[i.v], i.req) : null, base = rm && ac3Base(rm.m.quiz);
  const out = _adAC3.apply(this, arguments);
  if (rm && out !== false && i.req.status === 'Granted' && base !== 3) { rm.m.quiz.max = rm.m.quiz.attempts.length + base; i.req.grant = String(i.req.grant || '').replace(/^\+3 attempts/, `+${base} attempts`); i.req.decision = String(i.req.decision || '').replace('+3 attempts', `+${base} attempts`); const w = STORE.worlds[i.v], n = w.notifs.find(x => /extra quiz attempts/.test(x.title) && /\+3 attempts/.test(x.body)); if (n) n.body = n.body.replace('+3 attempts', `+${base} attempts`); }
  return out;
};
const _qDetAC3 = SCREENS['a-queue'];
SCREENS['a-queue'] = function (p) {
  let h = _qDetAC3.apply(this, arguments); const i = p && p.id && typeof h === 'string' ? acFind(p.id) : null; if (!i) return h;
  if (i.type === 'Data correction' && isOpen(i) && !ac3DcReady(i) && isSA()) h = h.replace(/<button class="btn [^"]*" data-act="qDo" data-id="[^"]*" data-a="approveFinal"[^>]*>[^<]*<\/button>/, `<span class="xs muted ac3-dcw">${esc(AC3_DC_WHY)}</span>`);
  if (i.type === 'Extra quiz attempts' && i.req && i.v) { const rm = shReqMod(STORE.worlds[i.v], i.req); if (rm) h = h.replace('3 of 3 — not passed', `${rm.m.quiz.attempts.length} of ${rm.m.quiz.max} — not passed`).replace('the quiz\'s original number of attempts (3)', `the quiz's original number of attempts (${ac3Base(rm.m.quiz)})`); }
  return h;
};
// Raise Data Correction: Assessor, System Admin or Academic Admin (and the Super Administrator) — "Who approves what"
const AC3_DC_RAISE = 'Data Corrections are raised by an Assessor (for learners they assess), a System Administrator, an Academic Admin or the Super Administrator.';
const ac3AdmRaiser = () => S.portal === 'admin' && (isSA() || isSys() || isAca());
const _rdcAC3 = ACT.raiseDC;
ACT.raiseDC = el => (ac3AdmRaiser() ? _rdcAC3(el) : w0Deny('Learners', (el && el.dataset && el.dataset.id) || '—', 'raise a Data Correction', AC3_DC_RAISE));
const _tdcAC3 = ACT.tasDC;
ACT.tasDC = el => {
  const k = el && el.dataset && el.dataset.k, me = S.portal === 'staff' && typeof TME === 'function' && TME();
  const ok = me && (me.roles || []).includes('Assessor') && (!k || tasSubs(true).some(s => s.key === k));
  return ok ? _tdcAC3(el) : w0Deny('Assessment Records', k || '—', 'raise a Data Correction', AC3_DC_RAISE);
};
const _lrnAC3 = SCREENS['a-learners'];
SCREENS['a-learners'] = function () { const h = _lrnAC3.apply(this, arguments); return typeof h === 'string' && !ac3AdmRaiser() ? h.replace(/<button class="btn[^"]*" data-act="raiseDC"[^>]*>[^]*?<\/button>/g, '') : h; };

/* ---------- B4-D9 / B4-D10 / B4-D11: quizzes ---------- */
// The quiz's own allowance (academic.js's "original allowance", quiz._orig, which it fixed at 3): its configured number of attempts,
// noted the first time it is needed — before any grant changes max
const ac3Base = q => { if (!q) return 3; if (!q._orig) q._orig = q.max || 3; return q._orig; };
const _qiAC3 = quizInfo;
quizInfo = function (i) { const rm = i && i.req && i.v && STORE.worlds[i.v] && shReqMod(STORE.worlds[i.v], i.req); if (rm) ac3Base(rm.m.quiz); return _qiAC3.apply(this, arguments); };
const ac3Left = q => q.max - q.attempts.length;
const _sqAC3 = ACT.startQuiz;
ACT.startQuiz = el => {
  const e = enrolById(el && el.dataset && el.dataset.id), m = e && e.modules && (shModOf(e, el.dataset.m) || shCurMod(e)), q = m && m.quiz;
  if (q) ac3Base(q);
  const chk = () => (q && ac3Left(q) <= 0 ? ac3No('Short Courses', `${chFullName(W)} · ${e.title}`, 'start a quiz with no attempts left', `All ${q.max} attempts on this quiz have been used. Request more attempts from the Academy.`) : true);
  if (chk() === false) return false;
  const m0 = MODAL, r = _sqAC3(el); if (MODAL && MODAL !== m0) ac3OnConfirm(chk); return r;
};
const _raAC3 = ACT.reqAttempts;
ACT.reqAttempts = el => {
  const e = enrolById(el && el.dataset && el.dataset.id), m = e && (shModOf(e, el.dataset.m) || shCurMod(e));
  const open = () => W.requests.find(r => r.type === 'Extra quiz attempts' && r.status === 'Requested' && r.target === (e && e.title) && (!m || !r.mid || r.mid === m.id));
  const chk = () => { const x = open(); return x ? ac3No('Requests', `${chFullName(W)} · ${e.title}`, 'request extra attempts again', `Request ${x.id} for this quiz is still waiting for a decision — one request at a time.`) : true; };
  if (chk() === false) return false;
  const m0 = MODAL, r = _raAC3(el); if (MODAL && MODAL !== m0) ac3OnConfirm(chk); return r;
};

/* ---------- B2-D8 / B2-D9: batch dates and sessions ---------- */
// The batch's end date is the boundary. Sessions before the start are kept as built: learners start learning at sign-up (CH-11), so
// pre-start classes are in use (seeded data and the R2 journeys); whether they should be limited is a client question (PD-AC3-08).
const ac3Out = (b, iso) => new Date(iso).getTime() > new Date(b.end.slice(0, 10) + 'T23:59:59Z').getTime();
const ac3InWhy = b => `Keep within the batch dates: this batch ends on ${fd(b.end)}.`;
// What a date change would leave after the new end date: confirmed or rescheduled sessions and published assignment deadlines keep
// their dates (S4-02), so the change is refused with the list — they are moved or cancelled first (no automatic movement is authorised)
function ac3Stranded(b, n) {
  const nb = { start: n.start, end: n.end }, ov = (STORE.evOver || {})[b.code] || {};
  const ses = batchEvents(b).filter(e => (e.s4 || ov[e.id]) && e.status !== 'Cancelled' && ac3Out(nb, e.start)).map(e => `Session "${e.title || 'Live class'}" on ${fdt(e.start)}`);
  const asg = (typeof s2Defs === 'function' ? s2Defs() : []).filter(d => (d.batches || []).includes(b.code)).map(d => [d, typeof crEffDue === 'function' ? crEffDue(d, b.code) : d.due]).filter(([, due]) => due && ac3Out(nb, due)).map(([d, due]) => `Assignment "${d.title}" due ${fdt(due)}`);
  return ses.concat(asg);
}
const _beAC3 = ACT.s4bBatchEdit;
ACT.s4bBatchEdit = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), m0 = MODAL, r = _beAC3(el); if (!b || !MODAL || MODAL === m0 || !$('#modal-root #bd-s')) return r;
  ac3OnConfirm(() => {
    if (s4bStarted(b) || !$('#bd-s').value || !$('#bd-e').value) return true;
    const n = { start: new Date($('#bd-s').value + 'T09:00:00Z').toISOString(), end: new Date($('#bd-e').value + 'T17:00:00Z').toISOString() }; if (n.start === b.start && n.end === b.end) return true;
    const out = ac3Stranded(b, n); if (!out.length) return true;
    $('#bd-i').innerHTML = `<div class="note b-red ac3-strand">${ic('alert')}<div class="small"><strong>These dates can't be saved: these items would fall after the new end date, ${fd(n.end)}.</strong><ul>${out.map(x => `<li>${esc(x)}</li>`).join('')}</ul>Move or cancel them first (Schedule, Assignments). Learners' deposits, seat holds, payment plans and signed terms are not affected by this refusal.</div></div>`;
    logA('Batches', `${b.label} (${b.code})`, 'Blocked: batch dates (items outside)', `${fd(b.start)} – ${fd(b.end)}`, 'No change', out.join('; '));
    S.s4bImpOk = ''; return false;
  });
  return r;
};
const _asAC3 = ACT.addSession;
ACT.addSession = el => {
  const m0 = MODAL, r = _asAC3(el); if (!MODAL || MODAL === m0 || !$('#modal-root #se-d')) return r;
  ac3OnConfirm(() => { const b = s4bBatch(($('#se-b') || {}).value), v = ($('#se-d') || {}).value; if (!b || !v) return true; if (!ac3Out(b, new Date(v + ':00Z').toISOString())) return true; fieldErr('#se-d', ac3InWhy(b)); return false; });
  return r;
};
const _keAC3 = ACT.kEditEv;
ACT.kEditEv = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.b)), m0 = MODAL, r = _keAC3(el); if (!b || !MODAL || MODAL === m0 || !$('#modal-root #ke-n')) return r;
  ac3OnConfirm(() => { const v = $('#ke-n').value; if (!v || !ac3Out(b, new Date(v + ':00Z').toISOString())) return true; fieldErr('#ke-n', ac3InWhy(b)); return false; });
  return r;
};

/* ---------- B4-D8 / B4-D13 / B4-D14: observations ---------- */
// Client demo: the admin list, the learner choice and the permissions tab come from the learners' own records (they named the
// legacy learners C and D, whose records the client demo empties). The legacy data is unchanged.
const ac3ObsLearners = () => learnerAccounts().filter(v => { const w = STORE.worlds[v]; return w.nvq && w.workplace && !w.fxTemplate; });
const _aoAC3 = allObs;
allObs = function () { if (!fxClient()) return _aoAC3.apply(this, arguments); return ac3ObsLearners().flatMap(v => (STORE.worlds[v].observations || []).map(o => ({ ...o, learner: VNAME(v), v, resp: '—', src: o }))); };
const _noAC3 = ACT.newObs;
ACT.newObs = el => {
  const r = _noAC3(el); if (!fxClient() || !MODAL || !$('#modal-root #no-l')) return r;
  const ls = ac3ObsLearners(), as = [...new Set(ls.map(v => { const w = STORE.worlds[v], b = ADMIN.batches.find(x => chCohLids(x).includes(w.me.id)); return b && chEff(w.me.id, 'obs', b); }).filter(Boolean))];
  MODAL.body = MODAL.body.replace(/(<select class="select" id="no-l"[^>]*>)[^]*?(<\/select>)/, `$1${ls.map(v => `<option value="${v}">${esc(VNAME(v))} — permission: ${esc(STORE.worlds[v].workplace.perm)}</option>`).join('')}$2`)
    .replace(/(<select class="select" id="no-a"[^>]*>)[^]*?(<\/select>)/, `$1${(as.length ? as : ['—']).map(n => `<option>${esc(n)}</option>`).join('')}$2`);
  renderModal(); return r;
};
const _soaAC3 = SCREENS['a-observations'];
SCREENS['a-observations'] = function (p) {
  if (!(fxClient() && p && p.tab === 'permissions')) return _soaAC3.apply(this, arguments);
  return pageA('Observations') + subtabs([['list', 'Observations'], ['permissions', 'Workplace permissions']], 'permissions', 'a-observations') + dt({ id: 'perms-ac3', name: 'Workplace permissions', rows: ac3ObsLearners().map(v => ({ v, n: VNAME(v), w: STORE.worlds[v].workplace })), rid: r => r.v,
    cols: [{ k: 'n', l: 'Learner' }, { k: 'wp', l: 'Workplace', h: r => esc(r.w.name || '—'), v: r => r.w.name || '' }, { k: 'p', l: 'Permission', h: r => chip(r.w.perm || 'Not entered'), v: r => r.w.perm || '' }], empty: 'No learner has entered a workplace yet' });
};
// A learner accepts a proposed observation only (it confirmed a cancelled one); checked again when the dialog is confirmed
const _oaAC3 = ACT.obsAccept;
ACT.obsAccept = el => {
  const id = el && el.dataset && el.dataset.id, chk = () => { const o = W && (W.observations || []).find(x => x.id === id); return S.portal === 'learner' && o && o.status === 'Proposed' && !o.alt ? true : ac3No('Observations', W ? chFullName(W) : '—', 'accept an observation', o ? `This observation is ${String(o.status).toLowerCase()}${o.alt ? ' (an alternative date was requested)' : ''} — only a proposed observation can be accepted.` : 'That observation is not available.'); };
  if (chk() === false) return false; const m0 = MODAL, r = _oaAC3(el); if (MODAL && MODAL !== m0) ac3OnConfirm(chk); return r;
};
// B4-D14 (observation fee due date after a reschedule): CH-40, a client decision, says rescheduling has no effect on the fee, so its
// due date stays the first confirmed observation's original date. Nothing is changed here (client question: PD-AC3-12).
const _rAC3 = render;
render = function () { ac3TrackAll(); ac3SaFlush(); return _rAC3.apply(this, arguments); };

/* ---------- Queue display: labels and admission history ---------- */
const _dqAC3 = derivedQueue;
derivedQueue = function () {
  const out = _dqAC3.apply(this, arguments);
  out.forEach(i => {
    if (i.doc && !i.doc.replacement) i.lbl = 'Document review'; // B1-D11: a first upload (or a re-upload) is not a replacement
    if (i.adm) { const w = STORE.worlds[i.v], ad = w && w.admission; if (ad) i.history = ad.history.map((h, k) => [ac3RowBy(w, h, k), h[1], h[0], '']).concat(ad._hist || []); }
  });
  return out;
};

UXC.push(['AC-3', 'Remaining Academic Admin corrections (1 Nov 2026)', [
  'Admissions: each learner is listed once; an application undecided for 7 days escalates to the Super Administrator (recorded once); the activation link opens only from the learner\'s record or a signed-out browser; the learner sees the real decision date; first uploads are "Document review"; each admission history row names who made it; a checklist item with an expiry date is approved with that date.',
  'Batches: "after the start" is decided by the start date; a new end date that would leave confirmed sessions or assignment deadlines after it is refused with the list; sessions can\'t be set after the batch ends.',
  'Approvals: a Data Correction is approved by the Super Administrator only after the System Administrator\'s first review; only its raisers can raise one; whoever recorded a recommendation doesn\'t decide it.',
  'Observations: the admin list comes from the learners\' records in the client demo; a cancelled observation can\'t be accepted; an unpaid observation fee follows the rescheduled first observation.',
  'Quizzes: extra attempts give the quiz\'s own allowance; no attempt beyond it; one open request per quiz.']]);
