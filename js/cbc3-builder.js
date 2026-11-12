/* ============================================================
   CBC3 — CBR correction batch 3 (6 Nov 2026): Course Builder wording, and the two durations. Loads after cbr2-ui.js.
   1 Display Duration (Course Details) is learner-facing only: CBR-1's versioned record (STORE.cbr.cfg[programme][version].disp,
     saved with the demo, versioned like learner types). Without one, learners see the payment schedule duration, as before —
     nothing stored is rewritten. Changing it never touches payment dates, eligibility or Finance-approved terms.
   2 Payment Schedule Duration (Fees & Payment Plans) is the programme duration the schedule engine, the Finance basis and approval
     already use (pr.durV / pr.dur), with the same rules as before: a Draft only, not while the terms are with Finance, and a
     change after approval sends the terms back to Finance (cb8BasisCheck). Course Details no longer changes it.
   3 Old step names and section numbers ("Section 5 — Fees & Payments") are shown as the current step names: one mapping for every
     inherited message, on the builder page, in admin dialogs and in messages.
   ============================================================ */
'use strict';

/* ---------- 3. Step names ---------- */
// "Section N — <old name>": the old name decides the step; a bare "Section N" is the step at that place in the step bar shown
// (cbrRenum already renumbered it when the Observations step is hidden)
const CBC3_NAMES = [['details', /^Course Details$/], ['curriculum', /^Curriculum/], ['assessments', /^Assessments$/], ['observations', /^Observations$/], ['payments', /^Fees /], ['documents', /^Offer Letter/], ['review', /^Review /]];
const CBC3_SEC = /\bSection ([1-8])(?: — (Course Details|Curriculum(?: (?:&amp;|&) Outcomes)?|Assessments|Observations|Fees (?:&amp;|&) (?:Payments|Payment Plans|payment options)|Offer Letters?(?: (?:&amp;|&) Documents)?|Review (?:&amp;|&) Publish))?/g;
function cbcSteps(s, pr, html = true) {
  if (typeof s !== 'string' || !/\bSection [1-8]\b/.test(s)) return s;
  const steps = pr && typeof cbrSteps === 'function' ? cbrSteps(pr) : CB_SECTIONS, name = k => (CB_SECTIONS.find(x => x[0] === k) || [])[1];
  return s.replace(CBC3_SEC, (m, n, nm) => {
    const k = nm ? (CBC3_NAMES.find(([, re]) => re.test(nm.replace(/&amp;/g, '&'))) || [])[0] : (steps[+n - 1] || [])[0], t = k && name(k);
    return t ? (html ? t.replace(/&/g, '&amp;') : t) : m;
  });
}
const _pageC3 = cbPage;
cbPage = function (pr) { return cbcSteps(_pageC3.apply(this, arguments), pr); };
const _pbC3 = progBuilder;
progBuilder = function (id) { return cbcSteps(_pbC3.apply(this, arguments), id && id !== 'new' ? cbPr(id) : null); };
const _rmC3 = renderModal;
renderModal = function () { if (MODAL && S.portal === 'admin') ['title', 'sub', 'body'].forEach(k => { MODAL[k] = cbcSteps(MODAL[k], null); }); return _rmC3.apply(this, arguments); };
const _toastC3 = toast;
toast = function (m) { const a = [...arguments]; if (S.portal === 'admin') a[0] = cbcSteps(m, null, false); return _toastC3.apply(this, a); };

/* ---------- Tooltips: a disclosure (keyboard: Tab, then Enter or Space), the same control as the question-numbering help ---------- */
const cbcTip = (label, html) => `<details class="cbr2-help cbc3-tip"><summary aria-label="${esc(label)}" title="${esc(label)}">${ic('info', 14)}</summary><p class="xs" role="note">${html}</p></details>`;

/* ---------- 1. Display Duration ---------- */
const cbcDisp = (pr, v) => { const c = pr && cbrCfgOf(pr, v); return c && c.c.disp && c.c.disp.n ? c.c.disp : null; };
// What learners see: the version's Display Duration, else (programmes without one) the payment schedule duration, as before
const cbcDispTxt = (pr, v) => cbrPer(cbcDisp(pr, v)) || (pr ? e1DurTxt(pr) : '—');
const cbcDispView = (pr, v) => (cbcDisp(pr, v) ? esc(cbrPer(cbcDisp(pr, v))) : `${esc(e1DurTxt(pr))} <span class="xs muted cbc3-fb">from the Payment Schedule Duration — no Display Duration set</span>`);
function cbcDispField(form) {
  const key = form.dataset.key, pr = key === 'new' ? null : cbPr(key), c = CB_CACHE[key], v = pr ? cbcDisp(pr, cbrCfgV(pr)) : null;
  const n = c && c.f['cbc3-dd-n'] != null ? c.f['cbc3-dd-n'] : v ? v.n : '', u = (c && c.f['cbc3-dd-u']) || (v ? v.unit : 'months');
  const P = pr ? `data-p="${esc(pr.id)}" data-onchange="cbcDisp" data-oninput="cbcDispIn"` : ''; // a saved course saves it at once
  const hint = pr && !v ? `Not set — learners see ${esc(e1DurTxt(pr))} (the Payment Schedule Duration).` : 'Shown to learners. Doesn\'t change payment dates.';
  return `<fieldset class="field cbc3-dd" style="border:0;padding:0"><legend class="lbl">Display Duration</legend><div class="row cbr-per-r"><label class="sr" for="cbc3-dd-n">Display Duration — number</label><input class="input num" type="number" min="1" max="60" step="1" inputmode="numeric" id="cbc3-dd-n" value="${esc(String(n))}" ${P}><label class="sr" for="cbc3-dd-u">Display Duration — unit</label><select class="select" id="cbc3-dd-u" ${P}>${CBR_UNITS.map(([k, l]) => `<option value="${k}" ${u === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><span class="hint">${hint}</span></fieldset>`;
}
const cbcDispRead = () => {
  const s = (($('main #cbc3-dd-n') || {}).value || '').trim(); if (s === '') return { v: null };
  if (!/^\d{1,2}$/.test(s) || +s < 1 || +s > 60) return { err: 'Enter the Display Duration as a whole number from 1 to 60, or leave it blank' };
  return { v: { n: +s, unit: ($('main #cbc3-dd-u') || {}).value === 'weeks' ? 'weeks' : 'months' } };
};
// Saved at once on a saved course (it isn't part of the form's unsaved changes, so the other listeners don't record it)
INP.cbcDispIn = (el, e) => { if (e) e.stopImmediatePropagation(); };
INP.cbcDisp = (el, e) => {
  if (e) e.stopImmediatePropagation();
  const g = cbrCfgGate({ dataset: { p: el.dataset.p } }, 'change the display duration'); if (!g) { render(); return; } const { pr, v } = g;
  const r = cbcDispRead(); if (r.err) return fieldErr('#cbc3-dd-n', r.err);
  const W = cbrCfgW(pr, v), was = cbrPer(W.disp) || '—', now_ = cbrPer(r.v) || '—'; if (was === now_) return;
  W.disp = r.v; logA('NVQ Programmes', cbEnt(pr), 'Display duration changed', was, now_, `Version ${v} (draft) — Course Details`); render(); toast('Display Duration saved. Payment dates are unchanged.');
};
// A new course: entered with the form, recorded on Version 1 when the course is created
const _createC3 = ACT.cbDetCreate;
ACT.cbDetCreate = function () {
  const r0 = cbcDispRead(); if (r0.err) { fieldErr('#cbc3-dd-n', r0.err); return false; }
  const n0 = (STORE.chNewProgs || []).length, out = _createC3.apply(this, arguments), pr = (STORE.chNewProgs || []).length > n0 ? STORE.chNewProgs.slice(-1)[0] : null;
  if (pr && r0.v) { cbrCfgW(pr, pr.version || 1).disp = r0.v; logA('NVQ Programmes', cbEnt(pr), 'Display duration changed', '—', cbrPer(r0.v), 'Version 1 (draft) — set when the course was created'); render(); } // the create already drew the next step: draw it again with the value
  return out;
};
// Course Details saves never change the payment schedule duration: its (hidden) fields are set to the recorded value first
const _saveC3 = ACT.cbDetSave;
ACT.cbDetSave = function (el) {
  const pr = cbPr(el && el.dataset && el.dataset.id);
  if (pr && cbDetEditable(pr)) {
    if (!pr.durV) { toast('Set the Payment Schedule Duration in Fees & Payment Plans first.', 'err'); return; }
    const n = $('main #np-d'), u = $('main #np-du'); if (n) n.value = String(pr.durV.n); if (u) u.value = pr.durV.unit;
  }
  return _saveC3.apply(this, arguments);
};
// Browse: the published version's Display Duration (else the duration shown before)
const _catC3 = catCard;
catCard = function (c) {
  if (!c || c.kind !== 'nvq' || typeof s3Progs !== 'function') return _catC3.apply(this, arguments);
  const pr = s3Progs().find(p => p.title === c.title && p.status !== 'Draft'), d = pr && cbcDisp(pr, pr.version);
  return _catC3.call(this, d ? { ...c, dur: cbrPer(d) } : c);
};

/* ---------- 2. Payment Schedule Duration ---------- */
const cbcPdNo = (pr, why, msg) => { logA('Payment Plans', pr ? cb8Ent(pr) : '—', 'Blocked: change the payment schedule duration', '—', '—', why); toast(msg, 'err'); return false; };
const cbcPdEd = pr => !!pr && cbDetEditable(pr) && !cbrArch(pr);
function cbcPayDurHtml(pr) {
  const v = pr.durV, lock = cbcPdEd(pr) && typeof cb8Locked === 'function' && cb8Locked(pr);
  const ro = `<p class="small cbc3-pdur"><span class="lbl">Payment Schedule Duration</span> ${v ? esc(e1DurFmt(v)) : e1DurOdd(pr) ? `${esc(pr.dur)} <span class="xs muted">(free text — record it as a number and unit)</span>` : '<span class="muted">Not recorded</span>'}${lock ? ' <span class="xs muted">— with Finance; it can change after Finance decides.</span>' : ''}</p>`;
  if (!cbcPdEd(pr) || lock) return ro;
  return `<div class="field cbc3-pdur" data-cb-keep><span class="lbl">Payment Schedule Duration</span><div class="row cbr-per-r"><label class="sr" for="cbc3-pd-n">Payment Schedule Duration — number</label><input class="input num" type="number" min="1" max="${E1_DUR_MAX}" step="1" inputmode="numeric" id="cbc3-pd-n" value="${v ? v.n : ''}"><label class="sr" for="cbc3-pd-u">Payment Schedule Duration — unit</label><select class="select" id="cbc3-pd-u">${E1_UNITS.map(([k, l]) => `<option value="${k}" ${(v ? v.unit : 'months') === k ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn btn-sm" data-act="cbcPayDur" data-p="${esc(pr.id)}">Save</button></div><span class="hint">Sets the instalment dates. After Finance approval, a change needs approval again.</span></div>`;
}
ACT.cbcPayDur = el => {
  const pr = cbPr(el && el.dataset && el.dataset.p); if (!pr) return toast('Programme not found.', 'err');
  if (cbRetired(pr) || cbrArch(pr)) return cbcPdNo(pr, 'Programme retired or archived', 'This programme is read-only.');
  if (!cbAdmin()) { s3Refuse('change the payment schedule duration', cbEnt(pr)); return false; }
  if (!cbDetEditable(pr)) return cbcPdNo(pr, `Version ${pr.version} is published`, 'The Payment Schedule Duration of a published course is fixed for its learners.');
  if (typeof cb8Locked === 'function' && cb8Locked(pr)) { const wf = cb8Wf(pr); return cbcPdNo(pr, `Payment terms waiting for Finance review (${wf && wf.qid})`, 'The payment terms are with Finance for review. Change the duration after Finance decides.'); }
  const raw = (($('main #cbc3-pd-n') || {}).value || '').trim(), unit = ($('main #cbc3-pd-u') || {}).value, n = Number(raw);
  if (!/^\d+$/.test(raw) || !(n >= 1 && n <= E1_DUR_MAX)) return fieldErr('#cbc3-pd-n', `Enter the Payment Schedule Duration as a whole number from 1 to ${E1_DUR_MAX}`);
  if (!E1_UNITS.some(x => x[0] === unit)) return fieldErr('#cbc3-pd-u', 'Choose days, weeks, months or years');
  if (pr.durV && pr.durV.n === n && pr.durV.unit === unit) return toast('Nothing has changed.', 'info');
  const was = e1DurTxt(pr); pr.durV = { n, unit }; pr.dur = e1DurFmt(pr.durV);
  const c = CB_CACHE[pr.id]; if (c) { c.f['np-d'] = String(n); c.f['np-du'] = unit; } // unsaved Course Details keep the new value
  logA('NVQ Programmes', cbEnt(pr), 'Payment schedule duration changed', was, pr.dur, 'Fees & Payment Plans');
  if (typeof cb8BasisCheck === 'function') cb8BasisCheck(pr, 'the payment schedule duration changed');
  render(); toast('Payment Schedule Duration saved.');
};
CB_WRITE.push('cbcPayDur');

/* ---------- Review & Publish ---------- */
const _sumC3 = cbRvSummary;
cbRvSummary = function (pr, k) {
  let h = _sumC3.apply(this, arguments);
  if (k === 'details') h = h.replace(/<dt>Duration<\/dt><dd>[\s\S]*?<\/dd>/, '').replace(/<dt>Display duration<\/dt><dd>[\s\S]*?<\/dd>/, `<dt>Display Duration</dt><dd>${cbcDispView(pr)}</dd>`);
  if (k === 'payments') h = cbrRvAdd(h, [['Payment Schedule Duration', pr.durV || e1DurOdd(pr) ? e1DurHtml(pr) : cbRvNone('Not recorded')]]);
  return h;
};
// CBC4 (the user's decision, 6 Nov 2026): a new programme can't be published without a Display Duration — enforced in the check the
// publish action itself runs (ch8Check), so a direct call is refused too. Save draft stays allowed without one. A new version of a
// published programme isn't blocked: it inherits the previous version's Display Duration, or the fallback (a warning says so).
const CBC4_DISP = 'Display Duration: set it in Course Details before publishing (it is shown to learners)';
const cbcFirstPub = pr => !!pr && pr.chNew && pr.status === 'Draft';
const _ch8C4 = ch8Check;
ch8Check = function (pr) { const r = _ch8C4.apply(this, arguments); if (cbcFirstPub(pr) && !cbcDisp(pr, pr.version || 1) && !r.block.includes(CBC4_DISP)) r.block.push(CBC4_DISP); return r; };
const _chkC3 = cbRvChecks;
cbRvChecks = function (pr) {
  const out = _chkC3.apply(this, arguments);
  if (pr && pr.chNew && !cbcFirstPub(pr) && cbrCfgV(pr) && !cbcDisp(pr, cbrCfgV(pr))) out.warn.push({ msg: `Display Duration not set — learners will see the Payment Schedule Duration (${e1DurTxt(pr)})`, sec: 'details', tab: 'details' });
  return out;
};
const _whereC3 = cbRvWhere;
cbRvWhere = function (pr, m) { const t = String(m); return /^Display Duration/.test(t) ? ['details', 'details'] : /Payment Schedule Duration/.test(t) ? ['payments', cb8Managed(pr) ? 'fees' : 'plan'] : _whereC3.apply(this, arguments); };

/* ---------- Relocated: legacy shared-library attachments that weren't copied into a programme (was in Step 4's history) ---------- */
const _oclC3 = SCREENS['k-ocl'];
SCREENS['k-ocl'] = p => {
  const h = _oclC3(p), mig = typeof N5 === 'function' ? (N5().mig || []) : []; if ((p && p.id) || !mig.length) return h;
  const pt = id => { const x = cbPr(id); return x ? x.title : id; };
  return h + `<section class="card cbc3-mig"><h2>Not copied to programmes</h2><p class="small muted">Legacy shared-list criteria attached to a programme but not on its observation forms. Add them as the programme's own criteria if they apply.</p><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Programme</th><th>Code</th><th>Criterion</th><th>Why</th></tr></thead><tbody>${mig.map(m => `<tr><td>${esc(pt(m.pid))}</td><td class="mono">${esc(m.code)}</td><td>${esc(m.title || '—')}</td><td class="small">${esc(m.why)}</td></tr>`).join('')}</tbody></table></div></section>`;
};

/* ---------- Records ---------- */
UXC.push(['CBC3', 'Course builder — wording and the two durations (6 Nov 2026)', [
  'Course Details: Display Duration is what learners see (Browse and the course). It is recorded per version and never changes payments. A course without one shows the Payment Schedule Duration, as before.',
  'Fees & Payment Plans: Payment Schedule Duration — the duration instalment dates are worked out from — is edited here, on a Draft, not while the terms are with Finance; a change after approval sends the terms back to Finance. A new course enters both: Display Duration in the form, Payment Schedule Duration with its starting fees.',
  'Wording: old section numbers and step names now read as the current steps; internal rule codes removed; long explanations shortened or moved behind an ⓘ control (keyboard: Tab, then Enter).']]);
