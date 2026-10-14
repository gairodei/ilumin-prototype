/* ============================================================
   Client decisions — Batch 7c: intake by nearest batch and admin batch changes (CH-42), released seats (P-32),
   Coordinator ≠ assessor (P-33).
   CH-42: sign-up assigns the nearest batch with space — the earliest start date for the course among online batches
   plus classroom or blended batches in the learner's country (fallback: the earliest online batch; none → contact
   the Academy). Deposit only if that batch starts in 28+ days. If it fills before payment, the next nearest is
   assigned and the learner is told. The Academic Admin and Business Admin can "Assign / change batch" only while
   neither batch has started ("started" = In Progress / Completed, or the start date has passed); after that it is
   hidden, and direct calls are refused and logged.
   P-32: a released seat (deposit paid, balance unpaid after 28 days) removes the learner from the batch; the deposit
   is kept; materials and past work stay read-only; "Sign up again" uses the normal flow with instalments only and
   reuses documents and the signed offer letter. P-33: a batch's Academic Coordinator can't be its assessor.
   Loads after ch-b7b.js.
   ============================================================ */
'use strict';

const CH_NO_MOVE = 'Learners can\'t be moved after their batch has started.';
const CH_RULE_MOVE = 'No batch changes after the batch has started.';
['Twenty-four'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });

/* ---------- Batches: country, online, started, nearest ---------- */
const chBatchCountry = b => /Dubai|Abu Dhabi|Sharjah|UAE/i.test(b.label || '') ? 'United Arab Emirates' : 'United Kingdom';
const chIsOnline = b => b.mode === 'Online';
const chStarted = b => !!b && (['In Progress', 'Completed', 'Archived'].includes(b.status) || new Date(b.start) <= now());
const chUpcoming = course => ADMIN.batches.filter(b => b.course === course && ['Open', 'Planned'].includes(b.status) && !chStarted(b)).sort((a, b) => new Date(a.start) - new Date(b.start));
function chNearest(course, country, exclude = []) {
  const pool = chUpcoming(course).filter(b => chHasPlace(b) && !exclude.includes(b.code));
  return pool.find(b => chIsOnline(b) || chBatchCountry(b) === country) || pool.find(chIsOnline) || null;
}
const chNearestFor = (w, ex) => chNearest(w.nvq.title, w.me.country, ex);
// Mock: Online Cohort 9 is full (so Priya Raman's nearest is Abu Dhabi Cohort 1); a later Abu Dhabi Cohort 2 exists
function chB7cSeedBatches() {
  if (!ADMIN || !ADMIN.batches) return;
  const o = ADMIN.batches.find(b => b.code === 'L3AC-OCT26-ONL'); if (o && !o.chSeed) { o.enrolled = o.cap; o.chSeed = true; }
  const a = ADMIN.batches.find(b => b.code === 'L3AC-DEC26-AUH');
  if (a && !ADMIN.batches.some(b => b.code === 'L3AC-FEB27-AUH')) ADMIN.batches.push({ ...JSON.parse(JSON.stringify(a)), code: 'L3AC-FEB27-AUH', label: 'Abu Dhabi Cohort 2', start: D(130), end: D(130 + 380), enrolled: 0, cap: 12, status: 'Planned', wait: 0, roster: [], coh: [], coordHistory: [] });
}
const _baCh7c = buildAdmin;
buildAdmin = function () { const r = _baCh7c.apply(this, arguments); chB7cSeedBatches(); return r; };

/* ---------- CH-42 sign-up step 1: the assigned batch, no choice ---------- */
function chAssignedHtml(w) {
  const b = chNearestFor(w), contact = `<p class="small">Need a different start date? Contact the Academy: ${academyContact()}</p>`;
  if (!b) return `<section class="stack ch-batch"><h3 class="small">Your batch</h3><div class="note b-amber">${ic('alert')}<div class="small"><strong>No batch has a place right now.</strong> Contact the Academy and we'll tell you when the next one opens: ${academyContact()}</div></div></section>`;
  const n = daysTo(b.start);
  return `<section class="stack ch-batch"><h3 class="small">Your batch</h3><p><strong>Your batch: ${esc(b.label)}, starts ${fd(b.start)}</strong> <span class="mono xs">${b.code}</span></p><p class="small muted">${esc(b.mode)} · in ${n} days · ${w.signup.noDeposit ? 'instalments only (the deposit option isn\'t offered again for this course)' : chDepositOk(b) ? 'a deposit can hold your seat' : 'starts in under 28 days — instalments only'}</p><p class="xs muted">The Academy assigns the nearest batch with a place: online batches and batches in ${esc(w.me.country)}.</p>${contact}</section>`;
}
const _stepDetailsCh7c = chStepDetails;
chStepDetails = function (w) { return _stepDetailsCh7c.apply(this, arguments).replace(/<fieldset class="stack ch-intakes">[\s\S]*?<\/fieldset>/, chAssignedHtml(w)); };
const chSetBatch = (w, b) => { w.signup.batch = b.code; w.nvq.batch = w.admission.batch = chBatchLbl(b); w.nvq.batchStart = w.admission.batchStart = w.nvq.start = b.start; w.nvq.end = w.nvq.batchEnd = b.end; };
const _suNextCh7c = ACT.suNext;
ACT.suNext = el => {
  const w = W, s = w.signup, k = chStepKey(w);
  if (k === 'details') { const b = chNearestFor(w); if (!b) { toast('No batch has a place right now — contact the Academy.', 'err'); return; } setUi('suBatch', b.code); }
  const r = _suNextCh7c(el);
  if (k === 'details' && s.batch) { const h = w.admission.history[w.admission.history.length - 1]; if (h && h[0] === 'Details and intake confirmed') h[0] = 'Details confirmed — batch assigned (' + s.batch + ')';
    if (s.again) { const steps = chSteps(w).map(x => x[0]); if (!chMandMissing(w).length && s.sig) { s.step = steps.indexOf('payment') + 1 || s.step; render(); } } }
  return r;
};
// Batch fills before payment → the next nearest batch is assigned and the learner is told
const _stepPayCh7c = chStepPay;
chStepPay = function (w) {
  const s = w.signup, b = chBatch(s.batch);
  if (b && !chHasPlace(b)) { const nb = chNearestFor(w, [b.code]);
    if (nb) { chSetBatch(w, nb); s.moved = { from: b.label, to: nb.label, at: now().toISOString() }; w.admission.history.push([`Batch full — reassigned to ${nb.code}`, s.moved.at]); notifyLearner(w.v, 'Admission', 'Your batch has changed', `${b.label} filled before you paid. You've been assigned ${nb.label}, starting ${fd(nb.start)}.`, 'admission'); logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Batch reassigned (full before payment)', b.code, nb.code, 'Nearest batch with a place'); }
    else return `<section class="card"><h2>4. Payment</h2><div class="note b-amber" role="alert">${ic('alert')}<div class="small"><strong>${esc(b.label)} is now full and no other batch has a place.</strong> Your documents and signed offer letter are kept. Contact the Academy: ${academyContact()}</div></div>${chNav(w, '')}</section>`; }
  if (s.noDeposit) setUi('suOpt', 'instalment');
  let h = _stepPayCh7c.apply(this, arguments).replace('<dt>Intake</dt>', '<dt>Batch</dt>');
  if (s.moved) h = h.replace('<h2>4. Payment</h2>', `<h2>4. Payment</h2><div class="note b-blue" role="status">${ic('info')}<div class="small"><strong>Your batch has changed.</strong> ${esc(s.moved.from)} filled before you paid, so you've been assigned <strong>${esc(s.moved.to)}</strong>. Need a different start date? Contact the Academy.</div></div>`);
  if (s.noDeposit) h = h.replace(/<label class="check"><input type="radio" name="su-opt" value="deposit"[\s\S]*?<\/label>/, '').replace(/<div class="note b-grey ch-nodep">[\s\S]*?<\/div><\/div>/, '').replace('<legend class="lbl">How do you want to pay?</legend>', `<legend class="lbl">How do you want to pay?</legend><div class="note b-grey ch-nodep">${ic('info')}<div class="small"><strong>Instalments only.</strong> Your seat was released earlier, so the deposit option isn't offered again for this course.</div></div>`);
  return h;
};
const _suPayCh7c = ACT.suPay;
ACT.suPay = el => { if (W.signup && W.signup.noDeposit) setUi('suOpt', 'instalment'); return _suPayCh7c(el); };
const _susCh7c = chSignupSummary;
chSignupSummary = function () { return _susCh7c.apply(this, arguments).replace('<dt>Intake</dt>', '<dt>Batch</dt>'); };
const _suItemCh7c = chSignupItem;
chSignupItem = function () { const it = _suItemCh7c.apply(this, arguments); it.d = String(it.d).replace('Check your details and choose your intake.', 'Check your details and see your batch.'); return it; };
// Agency-sponsored sign-up uses the same rule
const _sponsCh7c = ACT.chSponsoredSignup;
ACT.chSponsoredSignup = el => { const r = _sponsCh7c(el), w = W, b = chNearestFor(w); if (b && !w.signup.done) { chSetBatch(w, b); render(); } return r; };
// Demo: "Your batch fills before payment"; the instalment run: a place opens on Online Cohort 9 (starts in under 28 days)
const _scInstCh7c = ACT.chScInstalment;
ACT.chScInstalment = el => { const o = chBatch('L3AC-OCT26-ONL'); if (o && o.enrolled >= o.cap) o.enrolled = o.cap - 1; return _scInstCh7c(el); };
AFTER.push(() => { const b = document.querySelector('#demo-root [data-act="chIntakeFills"]'); if (b) b.textContent = 'Your batch fills before payment'; });

/* ---------- P-32 released seat ---------- */
const chReleased = w => !!(w && w.admission && w.admission.deposit && w.admission.deposit.released);
const CH_REL_BANNER = 'Your seat was released because the balance wasn\'t paid. You can still view your materials. To continue, sign up again.';
function chReleaseSeat(w, quiet) {
  const s = w.signup, b = chBatch(s.releasedFrom || s.batch); if (s.releasedFrom) return;
  if (b) b.enrolled = Math.max(0, b.enrolled - 1);
  s.releasedFrom = b ? b.code : s.batch; s.batch = null; w.nvq.batch = ''; w.nvq.status = 'Seat released';
  Object.assign(w.admission.deposit, { released: true, kept: true }); w.flags.admitted = true; if (!w.enrolments.includes(w.nvq)) w.enrolments.unshift(w.nvq);
  const hd = w.admission.deposit.holdDays || chHoldDays(); // S4-07: the hold agreed at payment
  w.admission.history.push([`Seat released — balance unpaid after ${hd} days (deposit kept)`, now().toISOString()]);
  if (quiet) return;
  notifyLearner(w.v, 'Admission', 'Your seat was released', CH_REL_BANNER, 'dashboard');
  if (b) chCooNotify(b.coord, 'Seat released', `${chFullName(w)} left ${b.label} (${b.code}) — balance unpaid after the ${hd}-day hold.`, 'c-batches.' + b.code);
  if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t: 'Seat released — deposit kept', b: `${chFullName(w)} · ${b ? b.code : ''} · deposit ${money(w.admission.deposit.min || CH_DEP, 'GBP')} kept`, at: now().toISOString(), go: 'f-deposits', unread: true });
  if (ADMIN && ADMIN.audit) logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Seat released', b ? b.code : '—', 'Removed from batch; deposit kept', `Balance unpaid after the ${hd}-day hold`);
}
const _edgeCh7c = applyEdge;
applyEdge = function () {
  const r = _edgeCh7c.apply(this, arguments), w = W;
  if (S.edge === 'seatReleased' && w && w.signup && w.signup.done && !w.signup.releasedFrom) { w.signup.batch = w.signup.batch || 'L3AC-DEC26-AUH'; w.admission.deposit.released = false; chReleaseSeat(w, !!w.chRelSeen); w.chRelSeen = true; }
  return r;
};
// Read-only, not locked: the content lock for a released seat is lifted
const _lockCh7c = lockFor;
lockFor = function (r) { const d = W && W.admission && W.admission.deposit; if (!chReleased(W)) return _lockCh7c(r); d.released = false; try { return _lockCh7c(r); } finally { d.released = true; } };
const _gbCh7c = globalBanners;
globalBanners = function () {
  const h = _gbCh7c(); if (S.portal !== 'learner' || !chReleased(W) || (W.signup && W.signup.again)) return h;
  const b = banner('amber', 'lock', `<strong>Seat released.</strong> ${esc(CH_REL_BANNER)}`, `<button class="btn btn-sm btn-primary" data-act="chSignAgain">Sign up again</button>`);
  return h ? h.replace('<div class="banners">', '<div class="banners">' + b) : `<div class="banners">${b}</div>`;
};
const chRelRefuse = what => { if (!chReleased(W) || (W.signup && W.signup.again && W.signup.done)) return false; logA('Learners', `${chFullName(W)} (${W.me.id})`, 'Blocked: seat released', '—', '—', what); toast('Your seat was released — your materials are read-only. Sign up again to continue.', 'err'); return true; };
[['reviewSubmit', 'Submit assignment'], ['pdConfirm', 'Book PD'], ['pdAlt', 'Change PD date'], ['obsAccept', 'Book observation'], ['obsAlt', 'Change observation date'], ['chOrRequest', 'Request an office observation'], ['chOrConsent', 'Office observation consent']].forEach(([k, what]) => { const f = ACT[k]; if (f) ACT[k] = el => chRelRefuse(what) ? undefined : f(el); });
// No marking, PD or observations for a learner whose seat was released
const chRelLids = () => Object.values(STORE.worlds || {}).filter(chReleased).map(w => w.me.id);
const _tasSubsCh7c = tasSubs;
tasSubs = function () { const out = _tasSubsCh7c.apply(this, arguments), rel = chRelLids(); return rel.length ? out.filter(s => !(s.L && rel.includes(s.L.lid))) : out; };
const _obPropCh7c = ACT.obPropose;
ACT.obPropose = el => { const r = _obPropCh7c(el), a = MODAL && MODAL.actions.find(x => x.label === 'Send proposal'); if (a && !a._ch7c) { const f = a.fn; a._ch7c = true; a.fn = (...x) => { const lid = mval('#op-l'); if (chRelLids().includes(lid)) { tasLog('Observations', lid, 'Blocked: seat released', '—', '—', ''); toast('This learner\'s seat was released — no observations until they sign up again.', 'err'); return false; } return f(...x); }; } return r; };
// Sign up again: the normal flow, nearest batch, instalments only; documents and the signed offer letter are reused
ACT.chSignAgain = () => {
  const w = W; if (!chReleased(w)) return;
  const s = w.signup; Object.assign(s, { step: 1, done: false, batch: null, again: true, noDeposit: true, pay: null, moved: null });
  w.admission.status = 'Sign-up in progress'; w.admission.history.push(['Signing up again (seat released earlier)', now().toISOString()]);
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Sign up again', 'Seat released', 'Sign-up in progress', 'Instalments only; documents and offer letter reused');
  go('admission'); toast('Signing up again — your documents and signed offer letter are kept.', 'info');
};
const _ccCh7c = chComplete;
chComplete = function (w, o) { const again = w.signup && w.signup.again; const r = _ccCh7c.apply(this, arguments); if (again && w.signup.done) { w.admission.deposit.released = false; w.admission.deposit.kept = true; w.signup.again = false; } return r; };

/* ---------- CH-42 admin: Assign / change batch (Academic Admin, Business Admin, Super Admin) ---------- */
const chCanMove = () => isSA() || (typeof isAca === 'function' && isAca()) || (typeof isBiz === 'function' && isBiz());
const chWorldByLid = lid => Object.values(STORE.worlds || {}).find(w => w.me && w.me.id === lid && w.nvq);
const chCurBatch = lid => { const w = chWorldByLid(lid); if (w) return w.signup && w.signup.batch ? chBatch(w.signup.batch) : chBatchOfLid(lid); return chBatchOfLid(lid); };
const chMoveTargets = b => b ? chUpcoming(b.course).filter(x => x.code !== b.code && chHasPlace(x)) : [];
const chMoveRefuse = (lid, why) => { logA('Batches', `${chLidName(lid)} (${lid})`, 'Blocked: batch change', '—', '—', why); toast(why, 'err'); };
ACT.chMoveBatch = el => {
  const lid = el.dataset.id, b = chCurBatch(lid), name = chLidName(lid);
  if (!chCanMove()) { chMoveRefuse(lid, 'Only the Academic Admin, Business Admin or Super Admin can change a learner\'s batch.'); return; }
  if (!b) { chMoveRefuse(lid, 'This learner has no batch to change.'); return; }
  if (chStarted(b)) { chMoveRefuse(lid, CH_NO_MOVE); return; }
  const ts = chMoveTargets(b); if (!ts.length) { toast('No other batch of this course with a place has a later or earlier start that hasn\'t begun.', 'info'); return; }
  reasonDlg({ title: 'Assign / change batch — ' + esc(name), ok: 'Change batch', body: `<p class="small">Current: <strong>${esc(b.label)} (${b.code})</strong>, starts ${fd(b.start)}. Only batches of ${esc(b.course)} that haven't started and have a place are listed. The course, fees, payment plan and offer letter don't change; any deposit or seat hold moves with the learner.</p>`,
    extra: `<div class="field"><label for="ch-mv-b">New batch</label><select class="select" id="ch-mv-b">${ts.map(t => `<option value="${t.code}">${esc(t.label)} (${t.code}) — starts ${fd(t.start)} · ${t.cap - t.enrolled} places</option>`).join('')}</select></div>`,
    onOk: r => { const nb = chBatch(mval('#ch-mv-b')); if (!nb || chStarted(nb) || !chHasPlace(nb)) { chMoveRefuse(lid, CH_NO_MOVE); return false; } chDoMove(lid, b, nb, r); render(); toast(`Moved to ${nb.label}. The learner and both Coordinators are notified.`); } });
};
function chDoMove(lid, b, nb, r) {
  const w = chWorldByLid(lid), name = chLidName(lid);
  b.enrolled = Math.max(0, b.enrolled - 1); nb.enrolled++;
  if (w) { chSetBatch(w, nb); w.admission.history.push([`Batch changed: ${b.code} → ${nb.code}`, now().toISOString()]); notifyLearner(w.v, 'Admission', 'Your batch has changed', `You're now in ${nb.label}, starting ${fd(nb.start)}. Your course, fees, payment plan and offer letter don't change${w.admission.deposit && w.admission.deposit.paid ? '; your deposit moves with you' : ''}.`, 'admission'); }
  else { const e = (b.coh || []).find(x => x.lid === lid); if (e) { b.coh = b.coh.filter(x => x !== e); (nb.coh = nb.coh || []).push(e); } }
  logA('Batches', `${name} · ${b.code} → ${nb.code}`, 'Batch changed (before start)', `${b.label} (${b.code})`, `${nb.label} (${nb.code})`, r);
  [b, nb].forEach(x => chCooNotify(x.coord, 'Learner batch changed', `${name}: ${b.code} → ${nb.code} — ${r}`, 'c-batches.' + x.code));
}
function chMoveCard(lid) {
  const b = chCurBatch(lid); if (!b) return '';
  const can = !chStarted(b);
  return `<section class="card ch-move"><div class="row-b"><h2>Batch</h2>${chip(can ? 'Not started' : 'Started', can ? 'blue' : 'grey')}</div><p class="small"><strong>${esc(b.label)}</strong> <span class="mono xs">${b.code}</span> · starts ${fd(b.start)} · ${esc(b.course)}</p>
    ${can ? `<button class="btn btn-sm" data-act="chMoveBatch" data-id="${lid}">Assign / change batch</button>` : ''}<p class="xs muted">${CH_RULE_MOVE} Before the start, a batch can be changed to another batch of the same course with a place (reason required, audited).</p></section>`;
}
const _aLCh7c = SCREENS['a-learner'];
SCREENS['a-learner'] = p => { const h = _aLCh7c(p); if (!p || p.tab !== 'enrolments' || !(isSA() || (typeof isAca === 'function' && isAca()))) return h; const card = chMoveCard(p.id); if (!card) return h; const s = h.indexOf('<div class="subtabs"'), i = s < 0 ? -1 : h.indexOf('</div>', s); return i < 0 ? h + card : h.slice(0, i + 6) + card + h.slice(i + 6); };
// Business Admin: a minimal enrolment view — learner, course and batch only
BNAV.splice(BNAV.length - 1, 0, ['Learners', [['b-batchassign', 'Batch assignment', 'users']]]); BIZ_ROUTES.add('b-batchassign');
const chEnrolRows = () => { const out = [], seen = new Set();
  Object.values(STORE.worlds || {}).forEach(w => { if (w.nvq && w.signup && w.signup.done && w.signup.batch) { const b = chBatch(w.signup.batch); if (b) { out.push({ lid: w.me.id, name: chFullName(w), course: w.nvq.title, b }); seen.add(w.me.id); } } });
  ADMIN.batches.filter(b => !['Completed', 'Archived', 'Cancelled'].includes(b.status)).forEach(b => (b.coh || []).forEach(e => { const lid = e.lid || (e.v && STORE.worlds[e.v] && STORE.worlds[e.v].me.id); if (lid && !seen.has(lid)) { seen.add(lid); out.push({ lid, name: chLidName(lid), course: b.course, b }); } }));
  return out; };
SCREENS['b-batchassign'] = () => `${pageA('Batch assignment', 'Learner, course and batch only. A batch can be changed only before it starts.')}
  <div class="note b-grey">${ic('info')}<div class="small">${CH_RULE_MOVE} Before the start, choose another batch of the same course with a place; a reason is required and the change is audited. The learner and both batches' Coordinators are notified; any deposit or seat hold moves with the learner.</div></div>
  ${dt({ id: 'b-bassign', name: 'Batch assignment', rows: chEnrolRows(), rid: r => r.lid, search: r => r.name + r.lid + r.b.code + r.b.label, filters: [{ k: 'st', l: 'Batch', get: r => chStarted(r.b) ? 'Started' : 'Not started', opts: ['Not started', 'Started'] }],
    cols: [{ k: 'name', l: 'Learner', h: r => `<strong>${esc(r.name)}</strong><div class="xs mono muted">${r.lid}</div>`, v: r => r.name }, { k: 'course', l: 'Course', h: r => `<span class="small">${esc(r.course)}</span>`, v: r => r.course }, { k: 'batch', l: 'Batch', h: r => `${esc(r.b.label)} <span class="mono xs">${r.b.code}</span><div class="xs muted">starts ${fd(r.b.start)}</div>`, v: r => r.b.code }, { k: 'st', l: 'Status', h: r => chip(chStarted(r.b) ? 'Started' : 'Not started', chStarted(r.b) ? 'grey' : 'blue'), v: r => chStarted(r.b) ? 'Started' : 'Not started' }],
    act: r => chStarted(r.b) ? '' : `<button class="btn btn-sm" data-act="chMoveBatch" data-id="${r.lid}">Assign / change batch</button>`, empty: 'No learners in batches' })}`;

/* ---------- P-33: a batch's Academic Coordinator can't be its assessor ---------- */
const CH_P33 = 'The batch\'s Academic Coordinator can\'t be its assignment, PD or observation assessor (P-33).';
// Mock fix (Croydon Cohort 4's observation assessor, Olivia Shaw's PD override, TO-9) is in the ch-b5.js seed
const _isCh7c = initStore;
initStore = function () { const r = _isCh7c.apply(this, arguments); chB7cSeedBatches(); return r; };
if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) chB7cSeedBatches();
const _panelCh7c = chAssessPanel;
chAssessPanel = function (b) { let h = _panelCh7c.apply(this, arguments); if (!b || !b.coord) return h; const c = esc(b.coord); h = h.split(/(<option[^>]*>[^<]*<\/option>)/).filter(x => !(x.startsWith('<option') && x.replace(/<[^>]+>/g, '') === c)).join(''); return h.replace(/(<\/h2>)/, `$1<p class="xs muted">${CH_P33}</p>`); };
const _saveCh7c = ACT.chAssessSave;
ACT.chAssessSave = el => { const b = ADMIN.batches.find(x => x.code === el.dataset.b); if (b && b.coord && CH_AROLES.some(([k]) => ($('#ch-as-' + k) || {}).value === b.coord)) { chAudit('Batches', `${b.label} (${b.code})`, 'Blocked: Coordinator as assessor', '—', b.coord, CH_P33); toast(CH_P33, 'err'); return; } return _saveCh7c(el); };
const _ovSetCh7c = ACT.chOvSet;
ACT.chOvSet = el => {
  const r = _ovSetCh7c(el), b = chBatchOfLid(el.dataset.l); if (!MODAL || !b || !b.coord) return r;
  [...document.querySelectorAll('#ch-ov-n option')].filter(o => o.value === b.coord || o.textContent === b.coord).forEach(o => o.remove());
  const a = MODAL.actions.find(x => x.label === 'Save override'); if (a && !a._p33) { const f = a.fn; a._p33 = true; a.fn = (...x) => { if (mval('#ch-ov-n') === b.coord) { chAudit('Batches', el.dataset.l, 'Blocked: Coordinator as assessor', '—', b.coord, CH_P33); fieldErr('#ch-ov-n', CH_P33); return false; } return f(...x); }; }
  return r;
};

/* ---------- Demo Scenario #16 text, #21 text (P-33), #24 ---------- */
ACT.chSc24Start = () => { S.edge = 'none'; if (STORE.worlds.B.signup.done) STORE.worlds.B = makeWorld('B'); setVariant('B'); ACT.chStep({ dataset: { s: '5' } }); ACT.switchRole({ dataset: { r: 'bizA' } }); S.signedIn = true; go('b-batchassign'); toast('Priya Raman has signed up with a deposit on Abu Dhabi Cohort 1. Viewing as the Business Admin.', 'info'); };
ACT.chSc24Refuse = () => { ACT.switchRole({ dataset: { r: 'bizA' } }); S.signedIn = true; go('b-batchassign'); ACT.chMoveBatch({ dataset: { id: STORE.worlds.C.me.id } }); };
ACT.chSc24Release = () => { S.edge = 'seatReleased'; setVariant('B'); ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.edge = 'seatReleased'; setVariant('B'); go('dashboard'); };
const _scListCh7c = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  const T16 = [[/^Priya Raman chose Abu Dhabi Cohort 1 \(starts more than 28 days away\)/, 'Priya Raman (Abu Dhabi) is assigned the nearest batch with a place — Abu Dhabi Cohort 1, as the online batches are full (starts more than 28 days away)'], [/the intake starts in 28 days or more/, 'her batch starts in 28 days or more'], [/a fresh run on Online Cohort 9 \(starts in under 28 days\)/, 'a fresh run in which a place opens on Online Cohort 9 (starts in under 28 days), so it\'s her nearest batch']];
  const T21 = [[/James Pryce \(assignments\), Sarah Okonkwo \(PD\), Michael Osei \(observations\)/, 'James Pryce (assignments and observations), Sarah Okonkwo (PD) — not Michael Osei, the batch\'s Coordinator (P-33)'], [/^Michael, the observation assessor/, 'James, the observation assessor'], [/Michael's attempt is refused/, 'James\'s attempt is refused']];
  const fix = (sc, rules) => [sc[0], sc[1], sc[2], sc[3].map(x => ({ ...x, text: rules.reduce((t, [a, b]) => t.replace(a, b), x.text) }))];
  return _scListCh7c().map(sc => sc[0] === '16' ? fix(sc, T16) : sc[0] === '21' ? fix(sc, T21) : sc).concat([['24', 'Batch reassignment before start', 'CH-42, P-32', [
    s('Priya Raman has signed up with a deposit on Abu Dhabi Cohort 1 (not started). The Business Admin opens Batch assignment.', '', '', 'chSc24Start'),
    s('The Business Admin moves her to Abu Dhabi Cohort 2 (later), with a reason — her deposit and seat hold move with her; she and both Coordinators are notified.', 'bizA', 'b-batchassign'),
    s('The same move for Aisha Rahman, whose batch has started, is refused and logged: "Learners can\'t be moved after their batch has started."', '', '', 'chSc24Refuse'),
    s('Seat released: Priya\'s balance isn\'t paid after 28 days — she leaves the batch, the deposit is kept, and her materials are read-only with a "Sign up again" banner.', '', '', 'chSc24Release'),
    s('She signs up again: the nearest batch is assigned, her documents and signed offer letter are reused, and only instalments are offered.', 'learner:B', 'admission')]]]);
};
CDL_SCEN.push(['24', 'Batch reassignment before start', 'Client-defined (CH-42, P-32)']);
ACT.chSc21Michael = () => { S.tas.v = 'S'; tasEnter(); S.signedIn = true; go('t-obs'); toast('Viewing as James Pryce — Croydon Cohort 4\'s observation assessor.', 'info'); };

/* ---------- Records ---------- */
CH_APPLIED['7c'] = '13 Oct 2026';
CH_NOTES['CH-10'] = 'Seat released (deposit paid, balance unpaid after the 28-day hold): the learner leaves the batch and the seat is freed; the deposit is kept; materials and past work stay read-only; they can sign up again (nearest batch, instalments only, documents and offer letter reused) — P-32, confirmed by the client.';
UXC.push(['CH batch 7c', 'Client decisions — Batch 7c (CH-42, P-32, P-33)', [
  'CH-42: sign-up step 1 no longer offers a choice of intake. The system assigns the nearest batch with a place — the earliest start for the course among online batches plus classroom or blended batches in the learner\'s country (fallback: the earliest online batch; none → "Contact the Academy"). The learner sees "Your batch: [name], starts [date]" and "Need a different start date? Contact the Academy." with the contact details. A deposit is offered only if that batch starts in 28 days or more. If the batch fills before payment, the next nearest is assigned and the learner is told.',
  'CH-42: "Assign / change batch" — Academic Admin and Super Admin on Learner 360 → Enrolments; Business Admin (new permission) on the new "Batch assignment" page (learner, course and batch only). Allowed only while both batches haven\'t started ("started": In Progress or Completed, or the start date has passed): same course, with a place, reason required, audited; the learner and both Coordinators are notified; any deposit or seat hold moves with the learner; course, fees, plan and offer letter unchanged. After the start the action is hidden and a direct call is refused and logged ("Learners can\'t be moved after their batch has started."). Every "no transfers" wording now reads "No batch changes after the batch has started" (final.js G7 row kept as history).',
  'P-32 (confirmed): when a seat hold is released the learner leaves the batch (enrolled count −1), the deposit is kept, and course materials and past work stay read-only — no submissions, marking, observations, PD or office requests. Banner: "Your seat was released because the balance wasn\'t paid. You can still view your materials. To continue, sign up again." with "Sign up again" (normal flow, nearest batch, instalments only; documents and the signed offer letter reused). The learner, the Coordinator and Finance are notified. The CH-10 note is updated.',
  'P-33: a batch\'s Academic Coordinator can\'t be its assignment, PD or observation assessor or a per-learner override — removed from the choices, and saves and direct calls are refused and logged. Mock: Croydon Cohort 4\'s observation assessor is James Pryce (was Michael Osei, its Coordinator); Olivia Shaw\'s PD override is James Pryce; TO-9 is James Pryce\'s. Scenario #21 text follows.',
  'Mock: Online Cohort 9 is full (so Priya Raman\'s nearest batch is Abu Dhabi Cohort 1); new Abu Dhabi Cohort 2 (L3AC-FEB27-AUH, Planned, 12 places). Scenario #16 text updated; new Demo Scenario #24 "Batch reassignment before start" (with the released-seat and sign-up-again steps).']]);
const _aIdxCh7c = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh7c(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Learner 360 → Enrolments — Assign / change batch', { act: 'aJump', t: 'a-learner.IA-L-31188.enrolments' }, 'CH-42 — change a batch before it starts.'),
  chIdxLi('Batch → Staff — Assessors (Coordinator excluded)', { act: 'aJump', t: 'a-batches.L2DC-MAR26.staff' }, 'P-33 — the Coordinator can\'t be an assessor on their own batch.')].join('')}`);
const _bIdxCh7c = SCREENS['b-index'];
SCREENS['b-index'] = p => _bIdxCh7c(p) + `<section class="card idx-sec"><h2>Client decisions (CH) — Batch 7c</h2><ul class="idx-list">${chIdxLi('Batch assignment', { act: 'goTok', t: 'b-batchassign' }, 'CH-42 — learner, course and batch only; change before the start.')}</ul></section>`;
const _idxCh7c = SCREENS.index;
SCREENS.index = p => _idxCh7c(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Seat released — read-only, Sign up again', { act: 'jump', e: 'seatReleased' }, 'P-32 — materials stay viewable; sign up again with instalments only.')}`);
ROUTE_PURPOSE['b-batchassign'] = 'Change a learner\'s batch before it starts — learner, course and batch only.';
