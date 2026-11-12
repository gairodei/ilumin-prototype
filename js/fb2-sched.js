/* ============================================================
   FB2 — Course-duration-based payment schedules (10 Nov 2026; PD-FB2-* in PROVISIONAL-DECISIONS.md). Loads after fb1-fees.js.
   Root cause. The schedule engine (cb-sched.js, rule CB-SCHED-1) already spreads k payments evenly across a duration from the batch
   start: whole months apart when the months divide by k, otherwise the duration's real number of days split as floor(i·T/k). Its
   input was a second duration the administrator entered — "Payment Schedule Duration" (pr.durV) on the new-course page and in Fees &
   Payment Plans (CBC3) — beside the Display Duration in Course Details. That duration is the Finance basis (cb8Basis / cb8Key), checks
   each instalment option (cbOptWhy), is frozen into the package Finance approves (pkg.dur) and, from it, into each learner's schedule.
   For a programme created from now on (pr.fb2):
   1 The Course Duration (Course Details' Display Duration, renamed) is the scheduling duration. It is required to create the course.
     No second duration is entered anywhere. Payment amount = fee ÷ count (E1 rounding: whole pence, the last payment carries the
     remainder); payment interval = course duration ÷ count (the engine's calendar rule, unchanged).
   2 The duration is versioned with the course, as the observation basis already is (cb-finpub.js): the Finance basis of a Draft
     programme, or of a published programme's draft version, is that version's Course Duration; the basis in force is the published
     version's. A change goes through the existing rules: refused while the terms are with Finance; approved terms go back to Finance
     (cb8BasisCheck); a draft version can't be published until a package for its duration is approved, which is held until then.
     pr.durV (read by the hidden Course Details field and older screens) is kept equal to the version in force.
   3 Fees & Payment Plans shows the Course Duration read-only and, per instalment option, "12 months ÷ 6 = 6 × £200.00, every
     2 months from batch start".
   Unchanged: the engine, the first-payment anchor (batch start; late-enrolment catch-up; the deposit route's seat hold), deposits
   (FB1, PD-FC-11…13), approved packages, plan versions, learners' pinned schedules, signed letters, and every programme created
   before FB2 (they keep their Payment Schedule Duration). Nothing stored is migrated.
   ============================================================ */
'use strict';

const fb2On = pr => !!pr && pr.fb2 === true;
const fb2DurOf = (pr, v) => { const d = cbcDisp(pr, v); return d ? { n: d.n, unit: d.unit } : null; };
// The version whose terms are being configured (a Draft programme's, or a published programme's draft version), and the one in force
const fb2WorkV = pr => (pr.status === 'Draft' ? pr.version || 1 : cbDraftV(pr) || pr.version);
const fb2Same = pr => { const d = fb2DurOf(pr, pr.version || 1), v = pr && pr.durV; return !!d && !!v && d.n === v.n && d.unit === v.unit; };
const FB2_HINT = 'Shown to learners. Instalment dates are spread evenly across it from each learner\'s batch start.';
const FB2_BLANK = 'Enter the Course Duration: instalment dates are spread evenly across it';
// The Course Duration field's value: { v } or { err }. Required (it sets payment dates); the Display Duration's limits (1–60 weeks or months)
function fb2Read(sel = '#cbc3-dd') {
  const s = (($(`main ${sel}-n`) || $(`#modal-root ${sel}-n`) || {}).value || '').trim(), u = ($(`main ${sel}-u`) || $(`#modal-root ${sel}-u`) || {}).value;
  if (s === '') return { err: FB2_BLANK };
  if (!/^\d{1,2}$/.test(s) || +s < 1 || +s > 60) return { err: 'Enter the Course Duration as a whole number from 1 to 60' };
  return { v: { n: +s, unit: u === 'weeks' ? 'weeks' : 'months' } };
}
// Why the Course Duration can't change now ('' when it can): the terms it sets are with Finance
function fb2Why(pr) {
  if (typeof cb8Locked === 'function' && cb8Locked(pr)) { const wf = cb8Wf(pr); return [`Payment terms waiting for Finance review (${wf && wf.qid})`, 'The payment terms are with Finance for review. Change the Course Duration after Finance decides.']; }
  return '';
}
const fb2No = (pr, why, msg) => { logA('NVQ Programmes', cbEnt(pr), 'Blocked: change the course duration', '—', '—', why); toast(msg, 'err'); return false; };
// pr.durV follows the version in force (audited when it moves)
function fb2SyncLive(pr, where) {
  const d = fb2DurOf(pr, pr.version || 1); if (!d || fb2Same(pr)) return false;
  const was = e1DurTxt(pr); pr.durV = d; pr.dur = e1DurFmt(d);
  const c = CB_CACHE[pr.id]; if (c) { c.f['np-d'] = String(d.n); c.f['np-du'] = d.unit; }
  logA('NVQ Programmes', cbEnt(pr), 'Payment schedule duration changed', was, pr.dur, `Follows the Course Duration (FB2) — ${where}`);
  return true;
}
// After a Course Duration change: the version in force, then the Finance basis (approved terms go back to Finance)
function fb2After(pr) {
  const moved = fb2SyncLive(pr, 'Course Details'), wf = cb8Wf(pr), was = wf && wf.status;
  if (typeof cb8BasisCheck === 'function') cb8BasisCheck(pr, 'the course duration changed');
  return { moved, again: was === 'Approved' && cb8Wf(pr).status !== 'Approved' };
}

/* ---------- 1. The Finance basis: the Course Duration of the version concerned ---------- */
const _basisFB2 = cb8Basis;
cb8Basis = function (pr) { const b = _basisFB2.apply(this, arguments); if (fb2On(pr)) b.dur = fb2DurOf(pr, fb2WorkV(pr)); return b; };
const _liveFB2 = cbFpBasisOf; // the basis in force (cbFpLive): the published version's
cbFpBasisOf = function (pr) { const b = _liveFB2.apply(this, arguments); if (fb2On(pr)) b.dur = fb2DurOf(pr, pr.version || 1); return b; };
const _issFB2 = cb8Issues;
cb8Issues = function (pr) {
  const out = _issFB2.apply(this, arguments); if (!fb2On(pr)) return out;
  out.forEach(x => { if (/^Set the Payment Schedule Duration/.test(x.msg)) x.msg = 'Set the Course Duration in Course Details: payment dates are spread across it.'; });
  return out;
};
// Publishing a version puts its duration in force
const _pifFB2 = cbFpPutInForce;
cbFpPutInForce = function (pr) { if (fb2On(pr)) fb2SyncLive(pr, `Version ${pr.version} published`); return _pifFB2.apply(this, arguments); };

/* ---------- 2. New course: the Course Duration is required and is the scheduling duration ---------- */
let FB2_MAKING = false;
const _createFB2 = ch8Create;
ch8Create = function () { const pr = _createFB2.apply(this, arguments); if (pr && FB2_MAKING) pr.fb2 = true; return pr; };
const _detCreateFB2 = ACT.cbDetCreate;
ACT.cbDetCreate = function (el) {
  const tok = (el && el.dataset && el.dataset.tok) || CB_TOK;
  if (!cbCanCreate() || !$('main .cb-det-form.cb-new') || (tok && CB_MADE[tok] && cbPr(CB_MADE[tok]))) return _detCreateFB2.apply(this, arguments); // refused, or a repeated submission: as before
  // the hidden programme duration the existing create reads (E1) is the Course Duration — never a second value
  const r = fb2Read(), n = $('main #np-d'), u = $('main #np-du'); if (n) n.value = r.err ? '1' : String(r.v.n); if (u) u.value = r.err ? 'months' : r.v.unit;
  // an invalid value is reported first (as CBC3 did); a blank one after the existing checks (title, level, …), in their order
  if (r.err) { if (r.err === FB2_BLANK && !ch8ReadDetails(null)) return false; fieldErr('#cbc3-dd-n', r.err); return false; }
  FB2_MAKING = true; try { return _detCreateFB2.apply(this, arguments); } finally { FB2_MAKING = false; }
};
// The new-course page: Payment Schedule Duration is no longer shown with the starting fees (its hidden field stays for the save)
const _gridFB2 = cbr2Grid;
cbr2Grid = function (form, isNew) {
  const r = _gridFB2.apply(this, arguments);
  if (isNew) { const pd = form.querySelector('.cbr2-newfees fieldset.e1-dur'), keep = form.querySelector('.cbr2-keep'); if (pd && keep) keep.appendChild(pd); }
  return r;
};
// Course Details: "Course Duration" (new courses and FB2 programmes); locked while the terms are with Finance
const _dfFB2 = cbcDispField;
cbcDispField = function (form) {
  const key = form && form.dataset.key, pr = key && key !== 'new' ? cbPr(key) : null; let h = _dfFB2.apply(this, arguments);
  if (key !== 'new' && !fb2On(pr)) return h;
  h = h.replace(/Display Duration/g, 'Course Duration').replace(/<span class="hint">[\s\S]*?<\/span><\/fieldset>$/, `<span class="hint">${esc(FB2_HINT)}</span></fieldset>`).replace(/id="cbc3-dd-n"/, 'id="cbc3-dd-n" aria-required="true"').replace('class="field cbc3-dd"', 'class="field cbc3-dd fb2-cd"');
  if (pr && fb2Why(pr)) h = h.replace(/(<(?:input|select) [^>]*id="cbc3-dd-[nu]")/g, '$1 disabled').replace(/<span class="hint">[\s\S]*?<\/span><\/fieldset>$/, '<span class="hint">With Finance for review — it can change after Finance decides.</span></fieldset>');
  return h;
};

/* ---------- 3. Changing the Course Duration of an FB2 programme ---------- */
const FB2_SAVED = r => (r.again ? 'Course Duration saved. The payment terms depend on it, so they need Finance approval again.' : 'Course Duration saved. Instalment dates follow it.');
const _dispFB2 = INP.cbcDisp;
INP.cbcDisp = function (el, e) {
  const pr = cbPr(el && el.dataset && el.dataset.p);
  if (!fb2On(pr) || !cbAdmin() || cbRetired(pr) || cbrArch(pr)) return _dispFB2.apply(this, arguments); // role, retired, archived: refused as before
  if (e) e.stopImmediatePropagation();
  const w = fb2Why(pr); if (w) { fb2No(pr, ...w); render(); return; }
  const g = cbrCfgGate({ dataset: { p: pr.id } }, 'change the course duration'); if (!g) { render(); return; }
  const r = fb2Read(); if (r.err) return fieldErr('#cbc3-dd-n', r.err);
  const W = cbrCfgW(pr, g.v), was = cbrPer(W.disp) || '—', now_ = cbrPer(r.v); if (was === now_) return;
  W.disp = r.v; logA('NVQ Programmes', cbEnt(pr), 'Course duration changed', was, now_, `Version ${g.v} (draft) — Course Details`);
  const x = fb2After(pr); render(); toast(FB2_SAVED(x), x.again ? 'info' : undefined);
};
// The version dialog (a published course's draft version): the same rules
const _cbrDispFB2 = ACT.cbrDisp;
ACT.cbrDisp = function (el) {
  const pr = cbPr(el && el.dataset && el.dataset.p);
  if (!fb2On(pr) || !cbAdmin() || cbRetired(pr) || cbrArch(pr)) return _cbrDispFB2.apply(this, arguments);
  const w = fb2Why(pr); if (w) return fb2No(pr, ...w);
  const r = _cbrDispFB2.apply(this, arguments), a = MODAL && MODAL.actions && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn) {
    MODAL.title = MODAL.title.replace('Display Duration', 'Course Duration');
    MODAL.body = MODAL.body.replace(/Display Duration/g, 'Course Duration').replace(/<span class="hint">[\s\S]*?<\/span>/, `<span class="hint">${esc(FB2_HINT)} Changing it needs Finance approval of the payment terms before this version is published.</span>`); renderModal();
    const f = a.fn; a.fn = function () {
      const w2 = fb2Why(pr); if (w2) { closeModal(); return fb2No(pr, ...w2); }
      const x = fb2Read('#cd'); if (x.err) return fieldErr('#cd-n', x.err), false;
      const res = f.apply(this, arguments); if (res === false) return res;
      const y = fb2After(pr); render(); if (y.moved || y.again) toast(FB2_SAVED(y), y.again ? 'info' : undefined); return res;
    };
  }
  return r;
};
// The separate payment duration doesn't exist for FB2 programmes: the old control's handler refuses a direct call
const _pdFB2 = ACT.cbcPayDur;
ACT.cbcPayDur = function (el) {
  const pr = cbPr(el && el.dataset && el.dataset.p);
  if (!fb2On(pr) || !cbAdmin()) return _pdFB2.apply(this, arguments);
  logA('Payment Plans', cb8Ent(pr), 'Blocked: change the payment schedule duration', '—', '—', 'Payment dates follow the Course Duration (FB2)');
  toast('Payment dates follow the Course Duration. Change it in Course Details.', 'err'); return false;
};
// A Course Details save never changes the payment basis on its own: the hidden duration is the one recorded
const _saveDetFB2 = ACT.ch8SaveDetails;
ACT.ch8SaveDetails = function (el) {
  const pr = cbPr(el && el.dataset && el.dataset.id);
  if (fb2On(pr) && pr.durV) { const n = $('main #np-d'), u = $('main #np-du'); if (n) n.value = String(pr.durV.n); if (u) u.value = pr.durV.unit; }
  return _saveDetFB2.apply(this, arguments);
};

/* ---------- 4. Fees & Payment Plans: the Course Duration, read-only, and each option's spacing ---------- */
const _pdHtmlFB2 = cbcPayDurHtml;
cbcPayDurHtml = function (pr) {
  if (!fb2On(pr)) return _pdHtmlFB2.apply(this, arguments);
  const d = cb8Basis(pr).dur, v = fb2WorkV(pr);
  return `<p class="small fb2-cdur"><span class="lbl">Course Duration</span> ${d ? esc(e1DurFmt(d)) : '<span class="muted">Not set</span>'}${pr.status !== 'Draft' && v !== pr.version ? ` <span class="xs muted">(Version ${v}, draft)</span>` : ''} <span class="xs muted">— set in Course Details. Each instalment option spreads its payments evenly across it, from the learner's batch start.</span></p>`;
};
// "12 months ÷ 6 = 6 × £200.00, every 2 months from batch start" ('' when the option isn't valid — its own message says why)
function fb2PvTxt(dur, k, fee) {
  if (!cbDurOk(dur) || !(fee > 0) || cbOptWhy(dur, k, fee)) return '';
  const r = cbRuleOf(dur, k), amt = cbAmtTxt(fee, k);
  if (r.kind === 'full') return `${amt}, paid in full at batch start`;
  const g = r.kind === 'months' ? null : cbGaps(dur, k), gap = r.kind === 'months' ? (r.step === 1 ? 'every month' : `every ${r.step} months`) : g ? `every ${g[0] === g[1] ? g[0] : g[0] + '–' + g[1]} days` : '';
  return `${e1DurFmt(dur)} ÷ ${k} = ${amt}${gap ? `, ${gap} from batch start` : ''}`;
}
const _optFB2 = cbr2Opt;
cbr2Opt = function (pr, P, o, b) {
  const h = _optFB2.apply(this, arguments), dur = b && b.dur; if (!fb2On(pr) || !dur || !(o.fee > 0)) return h;
  const d = document.createElement('div'); d.innerHTML = h;
  d.querySelectorAll('li.cbr2-pl[data-k]').forEach(li => { const t = fb2PvTxt(dur, +li.dataset.k, o.fee), lab = li.querySelector(':scope > label'); if (t && lab && !li.querySelector('.fb2-pv')) lab.insertAdjacentHTML('afterend', `<span class="xs fb2-pv">${esc(t)}</span>`); });
  return d.innerHTML;
};

/* ---------- Read-only views and Review & Publish name the Course Duration ---------- */
const _dvFB2 = cbr2DetView;
cbr2DetView = function (pr) {
  const h = _dvFB2.apply(this, arguments); if (!fb2On(pr)) return h;
  return h.replace('<span class="lbl">Display Duration</span>', '<span class="lbl">Course Duration</span>').replace('aria-label="Edit the Display Duration"', 'aria-label="Edit the Course Duration"');
};
const _sumFB2 = cbRvSummary;
cbRvSummary = function (pr, k) {
  let h = _sumFB2.apply(this, arguments); if (!fb2On(pr)) return h;
  h = h.replace('<dt>Display Duration</dt>', '<dt>Course Duration</dt>');
  if (k === 'payments') { const d = cb8Basis(pr).dur; h = h.replace(/<dt>Payment Schedule Duration<\/dt><dd>[\s\S]*?<\/dd>/, `<dt>Payment dates spread across</dt><dd>${d ? esc(e1DurFmt(d)) : cbRvNone('Not set')} <span class="xs muted">(the Course Duration)</span></dd>`); }
  return h;
};

/* ---------- Records ---------- */
UXC.push(['FB2', 'Payment schedules from the course duration (10 Nov 2026)', [
  'A course created from now on has one duration: the Course Duration in Course Details (required). Instalment dates are spread evenly across it from each learner\'s batch start; the amount is the fee ÷ the number of instalments (whole pence, the last payment carries any remainder).',
  'Payment Schedule Duration is gone from the new-course page and from Fees & Payment Plans for these courses. Fees & Payment Plans shows the Course Duration read-only, and each instalment option reads e.g. "12 months ÷ 6 = 6 × £200.00, every 2 months from batch start".',
  'Changing the Course Duration: not while the terms are with Finance; after Finance approval the terms need approval again; a new version with a different duration can\'t be published until Finance approves its terms. Learners\' agreed schedules, signed letters and approved packages never change. Courses created before keep their Payment Schedule Duration.']]);
