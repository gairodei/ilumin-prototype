/* ============================================================
   Point 5 — overdue instalments and access while paused (Welfare Academy email, point 5; 13 Nov 2026; PD-5-* in
   PROVISIONAL-DECISIONS.md). Loads after n2-pd.js. Composes with the existing guards — the FI-2 overdue process (Day 15 notice,
   Day 30 automatic pause per enrolment, arrangements, settle), the CH-14 manual pause, the 1A commencement gate, SEC-01's protected
   actions and the enrolment statuses — each of which keeps its own reason; nothing here is a single global access switch.

   Corrections:
   1. Read-only history while paused. A paused enrolment's Assignments, an assignment, Progress, Observations and the course page now
      open read-only (answers, feedback, progress, observation records) under the "Access paused" explanation, instead of a lock page
      that hid them. Every action stays refused by the same lock (SEC-01: answers, drafts, attachments, submit, resubmit, quizzes,
      content, observation and PD booking), and the answer editor is not editable.
   2. Other enrolments stay open. The NVQ pause no longer closes Learning Resources for a paid short course: its resources and their
      actions follow that course's own access; the paused programme's resources are withheld.
   3. Joining a class on Zoom, joining a PD session and downloading the paused programme's learning resources are refused (logged).
   4. Agreed (pinned) schedules: the confirmed policy pauses at Day 30 for them too (PD-CB-72 answered by the client's confirmation).
      Agency-sponsored learners are not changed.
   5. A payment that isn't verified (a bank transfer awaiting Finance) doesn't lift an automatic pause.
   6. The overdue process's own changes are audited as "System (overdue process)", not as the signed-in staff member.
   7. An instalment becoming overdue sends one in-app notice (simulated) and is audited, once.
   8. The learner's explanation names the programme, amount, due date, any agreed new date, Pay now and Finance contact; no staff
      reason is shown.
   A prototype only. PRODUCTION MUST ENFORCE ACCESS ON THE SERVER.
   ============================================================ */
'use strict';

const N5_READ = ['assignments', 'assignment', 'progress', 'observations', 'course', 'resources'];
const N5_SYS = 'System (overdue process)';
// Is this enrolment (its id: 'nvq' or a short-course enrolment) paused — automatically for an overdue instalment, or manually?
function n5Paused(eid, w = W) {
  if (!w || !w.me) return null;
  const man = typeof chPaused === 'function' ? chPaused(w.me.id, eid) : null;
  const auto = (w.accessPaused && (typeof fiPausedEs !== 'function' || !fiPausedEs(w).size || fiPausedEs(w).has(eid))) || (w === W && S.edge === 'paused' && eid === 'nvq');
  return man || auto ? { manual: !!man, auto: !!auto } : null;
}

/* ---------- 8. The learner's explanation ---------- */
function n5Notice(l) {
  const w = W, ps = (w.enrolments || []).filter(e => n5Paused(e.id === 'nvq' || e.kind === 'nvq' ? 'nvq' : e.id));
  const od = w.payOverdue, nvqT = w.nvq ? w.nvq.title : 'your programme', pay = od && od.e && od.n ? `<button class="btn btn-sm btn-primary" data-act="payInst" data-e="${esc(od.e)}" data-n="${od.n}">Pay now</button>` : '<button class="btn btn-sm btn-primary" data-go="payments">Go to Payments</button>';
  const auto = w.accessPaused || S.edge === 'paused';
  const facts = auto && od ? `<dl class="kv n5-facts"><dt>Programme</dt><dd>${esc(od.e === 'nvq' ? nvqT : ((w.enrolments || []).find(e => e.id === od.e) || {}).title || nvqT)}</dd><dt>Outstanding</dt><dd class="num">${money(od.amount, 'GBP')} — ${esc(od.label)}</dd><dt>Due date</dt><dd>${n5Fd(od.due)}</dd>${w.arrangeUntil ? `<dt>Agreed new date</dt><dd>${fd(w.arrangeUntil)}</dd>` : ''}${od.pending ? '<dt>Payment</dt><dd>A payment is awaiting confirmation by Finance — access is restored once Finance confirms it.</dd>' : ''}</dl>` : '';
  return `<div class="note b-red n5-paused" role="status">${ic('lock')}<div class="small"><strong>${esc(l.title)} — ${esc(ps.map(e => e.title).join(', ') || nvqT)}.</strong> ${l.msg} You can still read your earlier answers, feedback and progress; starting, saving or submitting work is paused.${facts}<div class="b-act">${auto ? pay : ''}<button class="btn btn-sm" data-go="messages">Contact the Academy (Finance)</button></div></div></div>`;
}

/* ---------- 1 + 2. Paused read routes open read-only ---------- */
const n5ResGroupE = g => (g && g.courseId ? ((W.enrolments || []).find(e => e.kind === 'short' && (e.courseId === g.courseId || e.base === g.course)) || {}).id || null : 'nvq');
const _lpN5 = lockedPage;
lockedPage = function (l) {
  if (!l || l.title !== 'Access paused' || !W || !N5_READ.includes(S.route) || typeof SCREENS[S.route] !== 'function' || (S.route === 'course' && !(S.params || {}).id)) return _lpN5.apply(this, arguments);
  let h;
  if (S.route === 'resources') {
    const all = W.resources; W.resources = (all || []).filter(g => !n5Paused(n5ResGroupE(g)));
    try { h = SCREENS.resources(S.params); } finally { W.resources = all; }
  } else h = SCREENS[S.route](S.params);
  if (typeof h !== 'string') return _lpN5.apply(this, arguments);
  h = h.replace(/contenteditable="true"/g, 'contenteditable="false" aria-readonly="true"');
  // No control for a refused action is offered: SEC-01's protected actions, submit / review, joining, downloads of learning material
  const acts = new Set((typeof SEC_ACTS !== 'undefined' ? SEC_ACTS : []).filter(x => x[0] === 'ACT').map(x => x[1]).concat(['reviewSubmit', 'saveDraft', 'joinZoom', 'joinPd', 'fakeDl', 'resPlay', 'cfLearn', 'shModPick', 'dObsReq', 'chOrRequest']));
  const subs = new Set((typeof SEC_ACTS !== 'undefined' ? SEC_ACTS : []).filter(x => x[0] === 'SUBMIT').map(x => x[1]));
  h = h.replace(/<button\b[^>]*\bdata-act="([A-Za-z0-9]+)"[^>]*>[\s\S]*?<\/button>/g, (m, a) => (acts.has(a) ? '' : m))
    .replace(/\bdata-submit="([A-Za-z0-9]+)"/g, (m, a) => (subs.has(a) ? 'data-ro="1" onsubmit="return false"' : m));
  return chAfterHead(h, n5Notice(l));
};
// Resources: an item of another (open) enrolment is checked against that enrolment, not the paused programme
let N5_RES = null;
const _lfN5 = lockFor;
lockFor = function (r) {
  if (N5_RES && r === 'resources') { const k = S.params; S.params = { id: N5_RES }; try { return _lfN5.call(this, 'course'); } finally { S.params = k; } }
  return _lfN5.apply(this, arguments);
};
const n5ResOf = id => { for (const g of (W && W.resources) || []) { const i = (g.items || []).find(x => x.id === id); if (i) return { g, i }; } return null; };
['openRes', 'resScorm', 'resPlay'].forEach(n => {
  const g = ACT[n]; if (typeof g !== 'function') return;
  ACT[n] = function (el) {
    const o = n5ResOf(el && el.dataset && el.dataset.id), e = o ? n5ResGroupE(o.g) : null;
    if (o && e && e !== 'nvq') { const p = N5_RES; N5_RES = e; try { return g.apply(this, arguments); } finally { N5_RES = p; } }
    if (o && e === 'nvq' && n5Paused('nvq')) return n5Refuse('open a learning resource');
    return g.apply(this, arguments);
  };
});
function n5Refuse(what) {
  logA('Learner access', `${chFullName(W)} (${W.me.id})`, `Blocked: ${what} (access paused)`, '—', '—', 'The enrolment\'s access is paused');
  if (MODAL) closeModal(); toast(`Access paused: you can't ${what} now. Nothing was changed.`, 'err'); return false;
}

/* ---------- 3. Zoom, PD join and downloads of the paused programme ---------- */
const n5NvqEv = id => { const e = ((W && W.events) || []).find(x => x.id === id); return !!e && !!W.nvq && e.course === W.nvq.title; };
const n5NvqFile = f => { const t = String(f || '').replace(/\.pdf$/i, ''); return ((W && W.resources) || []).some(g => !g.courseId && (g.items || []).some(i => i.title === t)); };
[['joinZoom', el => n5NvqEv(el && el.dataset && el.dataset.id), 'join a class on Zoom'], ['joinPd', () => true, 'join a Professional Discussion'], ['fakeDl', el => n5NvqFile(el && el.dataset && el.dataset.f), 'download a learning resource']].forEach(([n, mine, what]) => {
  const g = ACT[n]; if (typeof g !== 'function') return;
  ACT[n] = function (el) { if (W && W.flags && W.flags.nvq && S.portal === 'learner' && mine(el) && n5Paused('nvq')) return n5Refuse(what); return g.apply(this, arguments); };
});
const _jbN5 = joinBtn;
joinBtn = function (ev) { return ev && W && W.nvq && ev.course === W.nvq.title && n5Paused('nvq') ? `<button class="btn btn-sm" disabled>${ic('zoom', 15)}Join on Zoom</button><span class="xs muted">Paused with your programme access</span>` : _jbN5.apply(this, arguments); };

/* ---------- 4–7. The overdue process: pinned schedules, unverified payments, system attribution, the overdue notice ---------- */
// The overdue process's "done once" log belongs to the data set: Reset demo rebuilt the store but kept it, so after a reset a learner
// whose instalment had the same due date got no overdue notice, reminder or pause (PD-5-09)
const _isN5od = initStore; initStore = function () { const r = _isN5od.apply(this, arguments); if (typeof STORE !== 'undefined' && STORE) STORE.fiOd = {}; return r; };
let N5_SYSLOG = 0;
// PD-5-11: learners whose Day 30 pause Point 5 applies (agreed schedule, not sponsored, no arrangement). FI-2's "automatic pause not
// applied (PD-CB-72)" entry is not written for them: it contradicted the "Access paused (Day 30, automatic)" entry of the same evaluation.
let N5_D30 = null;
const N5_D30_OLD = 'Day 30 overdue — automatic pause not applied';
const n5D30 = w => !!(w && w.me && fiPinned(w) && !chSponsored(w) && !w.arrangeUntil);
const _logN5 = logA;
logA = function () {
  if (N5_SYSLOG && N5_D30 && arguments[2] === N5_D30_OLD && N5_D30.has(arguments[1])) return undefined;
  const n0 = ADMIN.audit.length, r = _logN5.apply(this, arguments); if (N5_SYSLOG) for (let i = 0; i < ADMIN.audit.length - n0; i++) Object.assign(ADMIN.audit[i], { actor: N5_SYS, role: 'System', ip: '—' }); return r;
};
// … and the Finance overdue list doesn't call their Day 30 "automatic pause not applied" (e.g. while a revised deadline is ahead)
const _odRowsN5 = odRows;
odRows = function () {
  const out = _odRowsN5.apply(this, arguments);
  (out || []).forEach(o => { if (o && o.v && /^Day 30 — automatic pause not applied/.test(o.last || '') && STORE.worlds[o.v] && fiPinned(STORE.worlds[o.v]) && !chSponsored(STORE.worlds[o.v])) o.last = 'Day 30'; });
  return out;
};
const n5Pend = r => !!(r.confirming || r.status === 'Awaiting confirmation by Finance');
const _odN5 = fiOdSync;
fiOdSync = function () {
  if (typeof STORE === 'undefined' || !STORE.worlds || !STORE.fin || typeof learnerAccounts !== 'function') return _odN5.apply(this, arguments);
  const vs = learnerAccounts().filter(v => !FI_LEGACY.includes(v) && STORE.worlds[v] && STORE.worlds[v].me);
  // 5. an automatic pause with an unpaid, late row awaiting confirmation isn't settled by that pending payment
  const hold = vs.filter(v => { const w = STORE.worlds[v]; return w.fiAutoPaused && w.accessPaused && fiLive(w).some(pl => pl.rows.some(r => n5Pend(r) && fpP(r.amount) > fpP(r.paid) && fiLate(r.due, w) > 0)); });
  hold.forEach(v => { STORE.worlds[v].fiAutoPaused = false; });
  N5_SYSLOG++; let r; const d30 = N5_D30;
  try {
    // An arrangement whose date passed unpaid lapses first (FI-2's own effects and wording), so the same evaluation sees the instalment
    // overdue again: FI-2 lapsed it after working out what was overdue, re-paused, then "settled" and restored in the same pass.
    vs.forEach(v => { const w = STORE.worlds[v], who = `${chFullName(w)} (${w.me.id})`; fiLive(w).forEach(pl => pl.rows.filter(x => x.arrangement && w.arrangeUntil && fpP(x.amount) > fpP(x.paid) && fiLate(w.arrangeUntil, w) > 0).forEach(x => {
      const until = w.arrangeUntil, re = !!w.fiArrPaused; x.arrangement = false; w.arrangeUntil = null;
      if (re) { w.accessPaused = true; w.fiAutoPaused = true; notifyLearner(v, 'Payments', 'Access paused', 'Your payment arrangement date passed unpaid — access is paused again.', 'payments'); }
      STORE.fin.notifs.unshift({ to: 'all', t: re ? 'Arrangement lapsed — access re-paused' : 'Arrangement lapsed — instalment overdue again', b: `${chFullName(w)} · ${pl.title} instalment ${x.n}`, at: now().toISOString(), go: 'f-overdue', unread: true });
      logA('Finance', who, 'Payment arrangement lapsed', 'Arrangement until ' + n5Fd(until), re ? 'Overdue — access paused again' : 'Overdue', 'The new due date passed unpaid (simulated date)');
      w.fiArrPaused = false;
    })); });
    N5_D30 = new Set(vs.map(v => STORE.worlds[v]).filter(n5D30).map(w => `${chFullName(w)} (${w.me.id})`));
    r = _odN5.apply(this, arguments);
  } finally {
    N5_D30 = d30;
    hold.forEach(v => { const w = STORE.worlds[v]; w.fiAutoPaused = true; w.accessPaused = true;
      if (!w.payOverdue) { const pl = fiLive(w).find(p => p.rows.some(x => n5Pend(x) && fpP(x.amount) > fpP(x.paid))), x = pl && pl.rows.find(y => n5Pend(y) && fpP(y.amount) > fpP(y.paid)); if (x) w.payOverdue = { label: 'Instalment ' + x.n, amount: fpM(fpP(x.amount) - fpP(x.paid)), due: x.due, e: pl.e, n: x.n, pending: true }; } });
    try { n5Pass(vs); } finally { N5_SYSLOG--; }
  }
  return r;
};
// A learner's own payment lifted the automatic pause through recomputeOverdue silently (no notice, no audit) and also when the row was
// only awaiting a transfer's confirmation. Now: a verified settlement is notified and audited as the system; an unverified one doesn't lift it.
const _rcN5 = recomputeOverdue;
recomputeOverdue = function () {
  const w = W, was = !!(w && w.accessPaused), auto = !!(w && w.fiAutoPaused);
  const r = _rcN5.apply(this, arguments);
  if (!w || !was || w.accessPaused || !w.v || FI_LEGACY.includes(w.v) || !auto) return r;
  if (fiLive(w).some(pl => pl.rows.some(x => n5Pend(x) && fpP(x.amount) > fpP(x.paid) && fiLate(x.due, w) > 0))) { w.accessPaused = true; return r; }
  w.fiAutoPaused = false; N5_SYSLOG++;
  try { notifyLearner(w.v, 'Payments', 'Access restored', 'Thanks — nothing is overdue now and access is restored.', 'payments'); logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Access restored (nothing overdue)', 'Paused', 'Active', 'Overdue instalments settled (verified payment)'); } finally { N5_SYSLOG--; }
  return r;
};
function n5Pass(vs) {
  const log = STORE.fiOd = STORE.fiOd || {}, once = (k, f) => { if (!log[k]) { log[k] = now().toISOString(); f(); } };
  vs.forEach(v => { try { n5One(v, once); } catch (e) { console.warn('n5Pass', v, e); } });
}
const n5Fd = d => (d && Number.isFinite(Date.parse(d)) ? fd(d) : 'its due date');
function n5One(v, once) {
  {
    const w = STORE.worlds[v], who = `${chFullName(w)} (${w.me.id})`;
    fiLive(w).forEach(pl => pl.rows.forEach(r => {
      if (r.status !== 'Overdue') return;
      const days = fiLate(r.due, w), k = `${v}|${pl.e}|${r.n}|${r.due}`, left = money(fpM(fpP(r.amount) - fpP(r.paid)), 'GBP');
      // 7. the day it becomes overdue: one notice and one audit entry
      once(k + '|0', () => { notifyLearner(v, 'Payments', 'Instalment overdue', `${pl.title} instalment ${r.n} (${left}) was due on ${n5Fd(r.due)} and is now overdue (simulated notice — nothing is sent).`, 'payments'); logA('Finance', who, 'Instalment overdue', 'Due ' + n5Fd(r.due), 'Overdue', `${pl.title} instalment ${r.n} · ${left}`); });
      // 4. Day 30 on an agreed (pinned) schedule: the confirmed automatic pause (not for agency-sponsored learners)
      if (days >= 30 && fiPinned(w) && !chSponsored(w) && !w.arrangeUntil) once(k + '|30n5', () => {
        if (!w.accessPaused) { w.accessPaused = true; w.fiAutoPaused = true; notifyLearner(v, 'Payments', 'Access paused', `${pl.title} instalment ${r.n} (${left}) is 30 days overdue — programme learning access is paused until it's paid. Your account, payments and earlier work stay available.`, 'payments'); }
        logA('Finance', who, 'Access paused (Day 30, automatic)', 'Active', 'Paused', `${pl.title} instalment ${r.n} 30 days overdue (simulated date) — agreed schedule (PD-5-04)`);
      });
    }));
  }
}

UXC.push(['5', 'Overdue instalments and access while paused — Welfare Academy email, point 5 (13 Nov 2026)', [
  'While a programme is paused (overdue Day 30, or a manual pause), the learner keeps their account, payments, messages, calendar, certificates and a read-only view of their assignments, answers, feedback, progress and observations; starting, saving, submitting, quizzes, resources, downloads, Zoom and PD joining are refused. A paid short course stays open. The explanation names the programme, amount, due date and any agreed new date, with Pay now and Finance contact.',
  'Agreed schedules pause at Day 30 too; an unverified bank transfer doesn\'t lift a pause; the overdue process is audited as the system; the day an instalment becomes overdue sends one notice. Paying lifts only the overdue pause — a manual pause, the batch-start gate and a discontinued or expired enrolment stay.']]);
