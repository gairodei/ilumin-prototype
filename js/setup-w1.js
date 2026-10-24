/* ============================================================
   W1 — Mixed-mode Level 3 batch corrections (Programme Builder & Workflow Restructuring audit, 20 Oct 2026; PD-W1-* in
   PROVISIONAL-DECISIONS.md). A Level 3 batch can hold Fully Assisted and Self-Paced learners at the same time; each learner's
   delivery mode comes from the fee option they chose (R1/R2). The batch defines its dates, capacity, staff, delivery channel and
   the fee-option groups it accepts — not one delivery mode. Its stored mode (N2 b.dmode) only still applies to learners on the
   legacy "Standard programme fee" option, so a Level 3 batch stores one only when it accepts that option. Levels 2, 4 and 5 keep
   one delivery mode per batch (PD-R1-12) until their fee-option policy is confirmed. Loads after setup-w0.js.
   ============================================================ */
'use strict';

const w1L3 = b => typeof r2IsL3B === 'function' && r2IsL3B(b);
const w1Batch = code => (ADMIN.batches || []).find(x => x.code === code) || null;
const w1Std = b => r1StdOf(r2Pid(b));
const w1Closed = b => ['Completed', 'Archived', 'Cancelled'].includes(b.status);

/* ---------- The fee-option groups a batch accepts ----------
   A batch created from W1 stores the option IDs explicitly (an option added to the programme later isn't accepted until someone adds
   it — the same rule as session audiences, PD-R2-14). A batch from before W1 has no list and accepts every option of its programme. */
const w1Accepted = b => { if (!w1L3(b)) return []; const all = r1Opts(r2Pid(b)); return Array.isArray(b.w1opts) ? all.filter(o => b.w1opts.includes(o.id)) : all; };
// CR (PD-CR-05): a single-mode batch of a programme with mode-specific fee options accepts only options of its own mode
const w1Accepts = (b, optId) => { if (!optId) return true; if (!w1L3(b)) { const o = r1Opt(optId); return !(o && o.mode && b && b.dmode && o.pid === r2Pid(b) && o.mode !== b.dmode); } const o = r1Opt(optId); return !!o && o.pid === r2Pid(b) && (!Array.isArray(b.w1opts) || b.w1opts.includes(optId)); };
const w1StdApplies = b => w1L3(b) && !!w1Std(b) && w1Accepts(b, w1Std(b));
const w1OptName = id => { const o = r1Opt(id); return o ? r2OptName(o) : id; };
const w1ModeOfOpt = (id, b) => { const o = r1Opt(id); return o ? o.mode || (b && b.dmode) || null : null; };
function w1AccTxt(b) {
  const xs = w1Accepted(b); if (!xs.length) return 'none';
  const grp = (h, l) => l.length ? `${h}: ${l.map(o => (o.legacy ? 'Standard programme fee' : o.label) + (o.status === 'Retired' ? ' (retired)' : '')).join(', ')}` : '';
  return [grp('Self-Paced', xs.filter(o => o.mode === 'Self-Paced')), grp('Fully Assisted', xs.filter(o => o.mode === 'Fully Assisted')), grp('Standard fee (legacy)', xs.filter(o => !o.mode))].filter(Boolean).join(' · ');
}
// A learner's own fee option: the one pinned at sign-up, else the group recorded when an admin added them to this batch
const w1OwnOpt = lid => { const w = n4World(lid), o = w && r1OptOfW(w); return o ? o.id : null; };
const w1OptOfLid = (lid, b) => w1OwnOpt(lid) || ((b && b.r2 && b.r2[lid]) || {}).opt || null;
// Learners in the batch on each option (cohort, roster and signed-up learners, each counted once) and on its waitlist
function w1Held(b) { const g = r2Mix(b).groups, out = Object.keys(g).filter(k => g[k] > 0); (b.w1wait || []).forEach(x => { if (!out.includes(x.opt)) out.push(x.opt); }); return out; }
const w1StdCount = b => (r2Mix(b).groups[w1Std(b)] || 0);
const w1InBatch = (b, lid) => !!lid && (Array.from(new Set(n4BatchLids(b.code))).includes(lid) || (b.w1wait || []).some(x => x.lid === lid));

/* ---------- Composition, from the learners (never from a stored default) ---------- */
function w1Comp(b) { const m = r2Mix(b), fa = m['Fully Assisted'] || 0, sp = m['Self-Paced'] || 0; return { fa, sp, kind: fa && sp ? 'Mixed' : fa ? 'Fully Assisted' : sp ? 'Self-Paced' : 'No learners yet' }; }
const w1CompHtml = b => { const c = w1Comp(b); return c.kind === 'No learners yet' ? '<span class="xs muted w1-comp">No learners yet</span>' : `<span class="w1-comp">${chip(c.kind, c.kind === 'Fully Assisted' ? 'grey' : 'blue')}${c.kind === 'Mixed' ? ` <span class="xs muted">${c.fa} Fully Assisted · ${c.sp} Self-Paced</span>` : ''}</span>`; };
const W1_FA_TXT = b => `Fully Assisted learners: ${b.mode} delivery with weekly live classes and monthly classroom days.`;
const W1_SP_TXT = 'Self-Paced learners: a limited number of scheduled classes; academic support through LMS messages to the Coordinator and teachers — not routine phone calls.';
function w1Desc(b) { const c = w1Comp(b); return c.kind === 'Mixed' ? `Mixed batch. ${W1_FA_TXT(b)} ${W1_SP_TXT}` : c.kind === 'Fully Assisted' ? W1_FA_TXT(b) : c.kind === 'Self-Paced' ? W1_SP_TXT : `No learners yet. Each learner's delivery mode comes from their fee option (accepted: ${w1AccTxt(b)}).`; }

/* ---------- Authorization (W0 pattern: in the action, logged) ---------- */
const w1AdminWhy = b => !(typeof s4bCanBatch === 'function' && s4bCanBatch()) || (typeof s5Ctx === 'function' && s5Ctx()) ? 'Batch settings are changed by the Super Administrator, Academic Admins and System Administrators.' : b && w1Closed(b) ? `${b.code} is ${b.status.toLowerCase()} — its settings can't change.` : '';
const w1Deny = (b, what, why) => { logA('Batches', b ? `${b.label} (${b.code})` : 'Batches', 'Blocked: ' + what, '—', '—', why); toast(why, 'err'); return false; };

/* ---------- Batch lists: the composition for Level 3; the stored mode for Levels 2, 4 and 5 ---------- */
// (this wrapper runs first, so it adds the column; the R2 / R5 versions — which showed the stored default — see it present and skip)
const W1_BATCH_TBL = id => id === 'batches' || id === 'kbatches' || String(id).startsWith('cbatches-');
const _dtW1 = dt;
dt = function (cfg) {
  if (cfg && W1_BATCH_TBL(cfg.id) && Array.isArray(cfg.cols) && !cfg.cols.some(c => c.k === 'dmode')) {
    const cols = cfg.cols.slice(), i = cols.findIndex(c => c.k === 'course');
    cols.splice(i >= 0 ? i + 1 : 1, 0, { k: 'dmode', l: 'Delivery mode', h: b => w1L3(b) ? w1CompHtml(b) : n2ModeOf(b) ? chip(n2ModeOf(b), n2ModeOf(b) === 'Self-Paced' ? 'blue' : 'grey') : '—', v: b => w1L3(b) ? w1Comp(b).kind : (n2ModeOf(b) || '') });
    cfg = { ...cfg, cols, r5: true };
  }
  // Coordinator roster: each Level 3 learner's own mode and fee option, so the two groups are told apart within one batch
  if (cfg && String(cfg.id).startsWith('roster-') && Array.isArray(cfg.rows) && cfg.rows.some(l => l && l.batch && w1L3(l.batch)) && !cfg.cols.some(c => c.k === 'w1dm')) {
    const inf = l => r2LidInfo(l.lid, l.batch.code), cols = cfg.cols.slice(), i = cols.findIndex(c => c.k === 'status');
    cols.splice(i >= 0 ? i + 1 : 1, 0, { k: 'w1dm', l: 'Delivery mode', h: l => { if (!w1L3(l.batch)) return '—'; const x = inf(l); return `${x.mode ? chip(x.mode, x.mode === 'Self-Paced' ? 'blue' : 'grey') : '—'}<div class="xs muted">${esc(x.group ? w1OptName(x.group) : '')}</div>`; }, v: l => (w1L3(l.batch) && inf(l).mode) || '' });
    cfg = { ...cfg, cols, filters: (cfg.filters || []).concat([{ k: 'w1dm', l: 'Delivery mode', get: l => (w1L3(l.batch) && inf(l).mode) || '—', opts: ['Fully Assisted', 'Self-Paced'] }]) };
  }
  return _dtW1.call(this, cfg);
};

/* ---------- Batch detail (admin) and the Coordinator's overview ---------- */
const _bdW1 = batchDetail;
batchDetail = function (code, t) {
  let h = _bdW1.apply(this, arguments); const b = w1Batch(code); if (!w1L3(b)) return h;
  if (!w1StdApplies(b) || !b.dmode) h = h.replace(/<p class="small n2-mode">[\s\S]*?<\/p>/, ''); // no standard-fee learners possible → no stored mode shown
  h = h.replace('<p class="small s4b-bdates">', `<p class="small w1-acc">Fee options accepted: <strong>${esc(w1AccTxt(b))}</strong>${w1AdminWhy(b) ? '' : ` <button class="linklike small" data-act="w1Opts" data-id="${b.code}">Change</button>`}</p><p class="small s4b-bdates">`);
  if (t === 'waitlist') h = h.replace(/<section class="card"><h2>Waitlist \(\d+\)<\/h2>[\s\S]*?<\/section>/, () => w1WaitCard(b, true));
  return h;
};
const _cbW1 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  let h = _cbW1(p); const b = p && p.id && w1Batch(p.id); if (!w1L3(b)) return h;
  h = h.replace(/<dt>Description<\/dt><dd class="small">[\s\S]*?<\/dd>/, `<dt>Description</dt><dd class="small w1-desc">${esc(w1Desc(b))}</dd>`);
  h = h.replace(/<dt>Learners by delivery mode<\/dt>/, `<dt>Fee options accepted</dt><dd class="small w1-acc">${esc(w1AccTxt(b))}</dd><dt>Learners by delivery mode</dt>`);
  return h.replace(/<h3>Waitlist \(read-only\)<\/h3><p class="small">[\s\S]*?<\/p>/, () => `<h3>Waitlist (read-only)</h3>${w1WaitCard(b, false)}`);
};

/* ---------- Learner: the sign-up batch panel shows the learner's own delivery mode ---------- */
const _asgW1 = chAssignedHtml;
chAssignedHtml = function (w) {
  let h = w1WithW(w, () => _asgW1.apply(this, arguments)); if (!w || !w.nvq || !r1IsL3W(w)) return h;
  const b = w1WithW(w, () => chNearestFor(w)); if (!b) return h;
  const o = r1OptOfW(w), mode = o ? (o.mode || b.dmode || null) : null;
  h = h.replace(/<span class="n2-mode">[^<]*<\/span> · /, '');
  return mode ? h.replace(`<p class="small muted">${esc(b.mode)} · in `, `<p class="small muted">${esc(b.mode)} · <span class="n2-mode w1-own">Your delivery mode: ${esc(mode)}${o && o.legacy ? ' (standard fee — follows the batch)' : ''}</span> · in `) : h;
};
// …and the Academy assigns only a batch that accepts the learner's fee option (all callers go through chNearest; the learner is the
// one whose sign-up step is being drawn — W1_NEAR — or else the current learner)
let W1_NEAR = null;
const w1WithW = (w, f) => { const k = W1_NEAR; W1_NEAR = w; try { return f(); } finally { W1_NEAR = k; } };
const _nearW1 = chNearest;
chNearest = function (course, country, exclude) {
  const w = W1_NEAR || W, o = w && w.nvq && w.nvq.title === course ? r1OptOfW(w) : null; if (!o) return _nearW1.apply(this, arguments);
  const no = chUpcoming(course).filter(b => !w1Accepts(b, o.id)).map(b => b.code);
  return _nearW1.call(this, course, country, (exclude || []).concat(no));
};

const _payW1 = chStepPay; chStepPay = function (w) { return w1WithW(w, () => _payW1.apply(this, arguments)); };
// Learner's programme overview: their own delivery mode, also when the batch stores none (N2 adds the row only for a stored mode)
const _hubW1 = nvqHub;
nvqHub = function (e) {
  const h = _hubW1.apply(this, arguments); if (!r1IsL3W(W) || /class="n2-mode"/.test(h)) return h; const own = r1ModeOfW(W); if (!own) return h;
  return h.replace(/(<dt>Delivery channel<\/dt><dd>[^<]*<\/dd>)/, `$1<dt>Delivery mode</dt><dd class="n2-mode">${esc(own)}${own === 'Self-Paced' ? `<div class="xs muted">${esc(N2_SP_SUPPORT)}</div>` : ''}<div class="xs muted r2-own">Your own delivery mode, from your fee option.</div></dd>`);
};

/* ---------- Create batch (Level 3): the fee-option groups; a stored mode only for standard-fee learners ---------- */
let W1_NB = null; // the wizard's Level 3 choices, from step 1: { code, course, opts, std }
function w1NbAcc() {
  const co = $('#modal-root #nb-co'), box = $('#modal-root #w1-nb-acc'); if (!co) return;
  const pid = s4PidOfTitle(co.value), l3 = r1IsL3Pid(pid), dm = $('#modal-root #nb-dm'), f = dm && dm.closest('.field');
  if (!l3) { if (box) box.remove(); return; }
  const keep = W1_NB && W1_NB.course === co.value ? W1_NB.opts : null, opts = r1Opts(pid).filter(o => o.status === 'Active'), std = r1StdOf(pid);
  const row = o => `<label class="check"><input type="checkbox" class="w1-nb-o" value="${o.id}" ${!keep || keep.includes(o.id) ? 'checked' : ''} data-onchange="w1NbStd" aria-label="Accept ${esc(r2OptName(o))}"><span>${esc(r2OptName(o))}</span></label>`;
  const grp = (hd, l) => l.length ? `<div class="r2-gh">${hd}</div>` + l.map(row).join('') : '';
  const html = `<fieldset class="field full w1-nb" id="w1-nb-acc" data-pid="${pid}" style="border:0;padding:0"><legend class="lbl">Fee options this batch accepts</legend><p class="xs muted">The batch can hold Self-Paced and Fully Assisted learners at the same time — each learner's delivery mode comes from the fee option they choose.</p>${grp('Self-Paced', opts.filter(o => o.mode === 'Self-Paced'))}${grp('Fully Assisted', opts.filter(o => o.mode === 'Fully Assisted'))}${grp('Standard fee (before fee options)', opts.filter(o => !o.mode))}${opts.length ? '' : '<p class="small">This programme has no active fee options yet.</p>'}</fieldset>`;
  if (box) box.outerHTML = html; else if (f) f.insertAdjacentHTML('afterend', html); else co.closest('.field').insertAdjacentHTML('afterend', html);
  INP.w1NbStd();
  void std;
}
// The standard-fee mode field is shown only while the standard-fee option is ticked
INP.w1NbStd = () => { const co = $('#modal-root #nb-co'), dm = $('#modal-root #nb-dm'), f = dm && dm.closest('.field'); if (!co || !f) return; const std = r1StdOf(s4PidOfTitle(co.value)); if (!r1IsL3Pid(s4PidOfTitle(co.value))) return; const on = !!std && !!$(`#modal-root .w1-nb-o[value="${std}"]:checked`); f.style.display = on ? '' : 'none'; };
const _nbCourseW1 = INP.n2NbCourse; INP.n2NbCourse = el => { const r = _nbCourseW1(el); W1_NB = null; w1NbAcc(); return r; };
const _rmW1 = renderModal; renderModal = function () { const r = _rmW1.apply(this, arguments); try { if (MODAL && /^Create batch — step 1 of 5$/.test(MODAL.title || '')) w1NbAcc(); else w1EditField(); } catch (e) { /* no batch form open */ } return r; };
const _nbW1 = ACT.newBatch; ACT.newBatch = function () { W1_NB = null; return _nbW1.apply(this, arguments); };
const _omW1 = openModal;
openModal = function (m) {
  if (m && m.title === 'Create batch — step 1 of 5') (m.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
    const co = mval('#nb-co'), pid = s4PidOfTitle(co); W1_NB = null;
    if (r1IsL3Pid(pid)) { const box = $('#modal-root #w1-nb-acc'), mine = box && box.dataset.pid === pid; // (a list for another programme → this one's defaults: every active option)
      const opts = mine ? $$('#modal-root .w1-nb-o:checked').map(i => i.value) : r1Opts(pid).filter(o => o.status === 'Active').map(o => o.id); if (!opts.length && !$$('#modal-root .cr-pend:checked').length) { fieldErr('#w1-nb-acc', 'Choose at least one fee option for this batch'); return false; } /* CR (PD-CR-14): or a mode awaiting Finance */ W1_NB = { code: (mval('#nb-c') || '').toUpperCase(), course: co, opts, std: !!r1StdOf(pid) && opts.includes(r1StdOf(pid)) }; }
    return g(...x); }; } });
  if (m && m.title === 'Create batch — step 5 of 5' && W1_NB && typeof m.body === 'string') m.body = m.body.replace(/<dt>Delivery mode<\/dt><dd>([^<]*)<\/dd>/, (x, md) => `<dt>Fee options</dt><dd class="w1-nb-rev">${esc(w1AccTxtOf(W1_NB))}</dd><dt>Delivery mode</dt><dd>From each learner's fee option${W1_NB.std ? ` · standard-fee learners: ${md}` : ''}</dd>`);
  return _omW1.apply(this, arguments);
};
const w1AccTxtOf = nb => w1AccTxt({ course: nb.course, w1opts: nb.opts, code: nb.code });
// The batch is created: record its fee options; drop the stored mode when no standard-fee learner can join (before N2 logs it)
const _syncW1 = syncTasBatches;
syncTasBatches = function () {
  if (W1_NB) { const nb = W1_NB, b = (ADMIN.batches || []).find(x => x.code === nb.code && x.course === nb.course && x.created && !x.w1opts);
    if (b && r1IsL3Pid(r2Pid(b))) { W1_NB = null; b.w1opts = nb.opts.slice(); if (!nb.std) { delete b.dmode; delete b.dmodeSrc; } logA('Batches', `${b.label} (${b.code})`, 'Fee options accepted set', '—', w1AccTxt(b), 'Batch created'); } }
  return _syncW1.apply(this, arguments);
};

/* ---------- Edit batch details (Level 3): the standard-fee mode only where it applies; the lock only for standard-fee learners ---------- */
function w1EditField() {
  const sel = $('#modal-root select#bd-dm'); if (!sel || !MODAL) return;
  const b = (ADMIN.batches || []).find(x => (MODAL.title || '') === 'Edit batch details — ' + x.code); if (!w1L3(b)) return;
  const f = sel.closest('.field'); if (!f) return;
  if (!w1StdApplies(b) || !b.dmode) { f.remove(); return; }
  const n = w1StdCount(b), hint = f.querySelector('.hint');
  if (!n) { sel.disabled = false; sel.innerHTML = N2_MODES.map(m => `<option ${m === b.dmode ? 'selected' : ''}>${m}</option>`).join(''); }
  if (hint) hint.innerHTML = n ? `${ic('lock', 12)} ${plural(n, 'learner')} on the Standard programme fee ${n === 1 ? 'is' : 'are'} enrolled and follow${n === 1 ? 's' : ''} this setting, so it can't change here. Everyone else's mode comes from their fee option.` : 'Applies only to learners on the Standard programme fee (before fee options); none are in this batch yet, so it can still change (with a reason). Everyone else\'s mode comes from their fee option.';
}
const _canModeW1 = n2CanChangeMode;
n2CanChangeMode = function (b, to) {
  if (!w1L3(b)) return _canModeW1.apply(this, arguments);
  if (!n2CanCreate()) { n2Refuse(b, 'change delivery mode', 'Only the Super Admin, Academic Admin or System Admin can change this setting.'); return false; }
  if (!N2_MODES.includes(to)) { fieldErr('#bd-dm', 'Choose Fully Assisted or Self-Paced'); return false; }
  if (!w1StdApplies(b)) { n2Refuse(b, 'change delivery mode', `${b.code} doesn't accept the Standard programme fee, so it has no batch-level delivery mode — each learner's comes from their fee option.`); return false; }
  if (w1StdCount(b)) { n2Refuse(b, 'change delivery mode', `${b.code} has learners on the Standard programme fee, whose delivery mode follows this setting — it can't change while they're enrolled.`); return false; }
  return true;
};

/* ---------- Change the fee options a batch accepts (audited; learners keep their options) ---------- */
ACT.w1Opts = el => {
  const b = w1Batch(el && el.dataset && el.dataset.id); if (!w1L3(b)) return;
  const why = w1AdminWhy(b); if (why) return w1Deny(b, 'change the fee options a batch accepts', why);
  const all = r1Opts(r2Pid(b)).filter(o => o.status === 'Active' || w1Accepts(b, o.id)), cur = w1Accepted(b).map(o => o.id), held = w1Held(b), std = w1Std(b);
  const row = o => { const h = held.includes(o.id); return `<label class="check"><input type="checkbox" class="w1-o" value="${o.id}" ${cur.includes(o.id) ? 'checked' : ''} ${h ? 'disabled' : ''}><span>${esc(r2OptName(o))}${o.status === 'Retired' ? ' (retired)' : ''}${h ? ' <span class="xs muted">— learners in this batch or on its waitlist hold it</span>' : ''}</span></label>`; };
  const grp = (hd, l) => l.length ? `<div class="r2-gh">${hd}</div>` + l.map(row).join('') : '';
  reasonDlg({ title: 'Fee options accepted — ' + b.code, ok: 'Save', body: `<p class="small">Learners keep the fee option they agreed; an option held by a learner in the batch can't be removed. A new sign-up is assigned only to a batch that accepts their option.</p>`,
    extra: `<fieldset class="field stack" style="border:0;padding:0" id="w1-o-fs"><legend class="lbl">Accepted fee options</legend>${grp('Self-Paced', all.filter(o => o.mode === 'Self-Paced'))}${grp('Fully Assisted', all.filter(o => o.mode === 'Fully Assisted'))}${grp('Standard fee (before fee options)', all.filter(o => !o.mode))}</fieldset>${std ? `<div class="field"><label for="w1-std">Delivery mode for standard-fee learners</label><select class="select" id="w1-std">${N2_MODES.map(m => `<option ${m === (b.dmode || n2DefaultFor(b.course)) ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="hint">Used only when the Standard programme fee is accepted.</span></div>` : ''}`,
    onOk: r => {
      const w = w1AdminWhy(b); if (w) return w1Deny(b, 'change the fee options a batch accepts', w);
      const pick = $$('#modal-root .w1-o').filter(i => i.checked || i.disabled).map(i => i.value), missing = w1Held(b).filter(id => !pick.includes(id));
      if (!pick.length) { fieldErr('#w1-o-fs', 'Keep at least one fee option'); return false; }
      if (missing.length) { fieldErr('#w1-o-fs', `${missing.map(w1OptName).join(', ')}: held by learners in this batch — can't be removed`); return false; }
      if (JSON.stringify(pick.slice().sort()) === JSON.stringify(cur.slice().sort())) { fieldErr('#w1-o-fs', 'Nothing has changed'); return false; }
      const was = w1AccTxt(b); b.w1opts = pick;
      if (std && pick.includes(std) && !b.dmode) { b.dmode = mval('#w1-std'); b.dmodeSrc = 'set'; b.dmodeLogged = true; logA('Batches', `${b.label} (${b.code})`, 'Delivery mode set', '—', b.dmode + ' (standard-fee learners)', r); }
      logA('Batches', `${b.label} (${b.code})`, 'Fee options accepted changed', was, w1AccTxt(b), r);
      if (b.coord) chCooNotify(b.coord, 'Batch fee options changed', `${b.code}: ${w1AccTxt(b)}`, 'c-batches.' + b.code);
      render(); toast('Saved. Learners keep their fee options.');
    } });
};

/* ---------- Add learner (Level 3): no preselected group; the learner's own option is kept; no double place ---------- */
const _addW1 = ACT.addToBatch;
ACT.addToBatch = (el, e) => {
  const b = w1Batch(el && el.dataset && el.dataset.id), r = _addW1(el, e);
  if (!w1L3(b) || !MODAL || !/^Add learner/.test(MODAL.title || '') || !/id="r2-ab-o"/.test(MODAL.body || '')) return r;
  const acc = w1Accepted(b).filter(o => o.status === 'Active');
  MODAL.body = MODAL.body.replace(/<select class="select" id="r2-ab-o">[\s\S]*?<\/select><span class="hint">[^<]*<\/span>/, `<select class="select" id="r2-ab-o"><option value="" selected>Choose the learner's fee-option group…</option>${acc.map(o => `<option value="${o.id}">${esc(o.legacy ? 'Standard programme fee' : o.label)} — ${esc(r1ModeTxt(o))}</option>`).join('')}</select><span class="hint">Only the options this batch accepts. A learner who signed up keeps the option they agreed. No fee or payment is created here.</span>`); renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const lid = mval('#ab-l'), L = typeof learnerById === 'function' ? learnerById(lid) : null, own = w1OwnOpt(lid), pick = mval('#r2-ab-o');
    if (w1AdminWhy(b)) return g(...x); // the existing actor check (S5e) refuses and logs it
    if (own && pick && pick !== own) { fieldErr('#r2-ab-o', `This learner's fee option is ${w1OptName(own)} (agreed at sign-up) — it can't be changed here`); return false; }
    const opt = own || pick; if (!opt) { fieldErr('#r2-ab-o', 'Choose the learner\'s fee-option group'); return false; }
    if (!w1Accepts(b, opt)) { fieldErr('#r2-ab-o', `${b.code} doesn't accept ${w1OptName(opt)}`); return false; }
    if (w1InBatch(b, lid)) { fieldErr('#ab-l', `${L ? L.name : lid} is already in ${b.code} or on its waitlist`); return false; }
    if (!pick) { const s = $('#modal-root #r2-ab-o'); if (s && ![...s.options].some(o => o.value === opt)) s.insertAdjacentHTML('beforeend', `<option value="${opt}"></option>`); if (s) s.value = opt; }
    const w0 = b.wait, res = g(...x);
    if (res !== false && b.wait > w0) { const ent = { id: 'WL-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), lid, name: L ? L.name : lid, agency: (L && L.agency) || 'Self-funded', opt, at: now().toISOString(), by: ADMIN.me.name }; (b.w1wait = b.w1wait || []).push(ent); logA('Batches', `${b.label} (${b.code})`, 'Waitlisted with fee option', '—', `${ent.name} → ${w1OptName(opt)}`, 'Batch full'); }
    return res;
  };
  return r;
};

/* ---------- Waitlist (Level 3): entries keep the learner and their fee option ---------- */
const W1_DEMO_WAIT = () => ['Mohammed Al Hashimi', 'Joseph Mathew', 'Anjali Nair', VNAME('B')];
function w1WaitCard(b, actions) {
  const real = b.w1wait || [], legacy = W1_DEMO_WAIT().slice(0, Math.max(0, (b.wait || 0) - real.length)), n = real.length + legacy.length;
  const rows = real.map(x => `<li class="li w1-wl"><div class="li-b"><strong>${esc(x.name)}</strong><span class="xs muted">${esc(w1OptName(x.opt))} · ${esc(w1ModeOfOpt(x.opt, b) || '—')} · waiting since ${fd(x.at)}</span></div>${actions ? `<button class="btn btn-sm" data-act="kOffer" data-id="${b.code}" data-n="${esc(x.name)}" data-w1="${x.id}">Offer place</button><button class="btn btn-sm" data-act="kNextIntake" data-id="${b.code}" data-n="${esc(x.name)}" data-w1="${x.id}">Move to next intake</button>` : ''}</li>`)
    .concat(legacy.map(nm => `<li class="li"><div class="li-b"><strong>${esc(nm)}</strong><span class="xs muted">Demo entry — no fee option recorded</span></div>${actions ? `<button class="btn btn-sm" data-act="kOffer" data-id="${b.code}" data-n="${esc(nm)}">Offer place</button><button class="btn btn-sm" data-act="kNextIntake" data-id="${b.code}" data-n="${esc(nm)}">Move to next intake</button>` : ''}</li>`));
  return actions ? `<section class="card w1-wait"><h2>Waitlist (${b.wait || 0})</h2>${n ? `<ol class="list">${rows.join('')}</ol>` : '<p class="small muted">No one is waiting.</p>'}</section>` : (n ? `<ol class="list small w1-wait">${rows.join('')}</ol>` : '<p class="small">No one on the waitlist.</p>');
}
const w1WaitOf = (b, id) => (b.w1wait || []).find(x => x.id === id) || null;
const _offerW1 = ACT.kOffer;
ACT.kOffer = el => {
  const b = w1Batch(el.dataset.id), x = b && el.dataset.w1 ? w1WaitOf(b, el.dataset.w1) : null; if (!x) return _offerW1(el);
  const why = w1AdminWhy(b); if (why) return w1Deny(b, 'offer a waitlist place', why);
  if (b.enrolled >= b.cap) return _offerW1(el); // the existing "Batch is full" message
  if (!w1Accepts(b, x.opt)) return w1Deny(b, 'offer a waitlist place', `${b.code} no longer accepts ${w1OptName(x.opt)} — ${x.name}'s fee option isn't replaced. Move them to a batch that accepts it.`);
  reasonDlg({ title: 'Offer waitlist place — ' + esc(x.name), ok: 'Offer place', body: `<p class="small">${esc(x.name)} joins ${esc(b.code)} with their fee option: <strong>${esc(w1OptName(x.opt))}</strong> (${esc(w1ModeOfOpt(x.opt, b) || '—')}).</p>`, onOk: r => {
    const w = w1AdminWhy(b); if (w) return w1Deny(b, 'offer a waitlist place', w); if (b.enrolled >= b.cap || !w1WaitOf(b, x.id)) { toast('This place is no longer available.', 'err'); return false; }
    b.w1wait = b.w1wait.filter(y => y !== x); (b.w1waitHist = b.w1waitHist || []).push({ ...x, out: 'Offered', outAt: now().toISOString(), outBy: ADMIN.me.name });
    b.wait = Math.max(0, b.wait - 1); b.enrolled++; b.roster.push([x.name, x.lid, x.agency]); b.r2 = b.r2 || {}; b.r2[x.lid] = { opt: x.opt, by: ADMIN.me.name, at: now().toISOString(), src: 'Waitlist offer' }; touch(b.code);
    logA('Batches', `${b.label} (${b.code})`, 'Learner added (waitlist offer)', 'Waitlist', `${x.name} → ${w1OptName(x.opt)}`, r); render(); toast(`${x.name} offered a place, on ${w1OptName(x.opt)}.`);
  } });
};
const _nextW1 = ACT.kNextIntake;
ACT.kNextIntake = el => {
  const b = w1Batch(el.dataset.id), x = b && el.dataset.w1 ? w1WaitOf(b, el.dataset.w1) : null; if (!x) return _nextW1(el);
  const why = w1AdminWhy(b); if (why) return w1Deny(b, 'move a waitlisted learner', why);
  const nx = ADMIN.batches.find(y => y.course === b.course && y.code !== b.code && ['Planned', 'Open'].includes(y.status) && y.start > b.start && w1Accepts(y, x.opt));
  if (!nx) { toast(`No later intake that accepts ${w1OptName(x.opt)} exists yet — ${x.name} stays on this waitlist with their fee option.`, 'info'); return; }
  reasonDlg({ title: 'Move to next intake — ' + esc(x.name), ok: 'Move', body: `<p class="small">Next intake that accepts ${esc(w1OptName(x.opt))}: <strong>${esc(nx.label)} (${nx.code})</strong>, starts ${fd(nx.start)}. The fee option moves with them.</p>`, onOk: r => {
    if (!w1WaitOf(b, x.id) || !w1Accepts(nx, x.opt)) { toast('This move is no longer possible.', 'err'); return false; }
    b.w1wait = b.w1wait.filter(y => y !== x); b.wait = Math.max(0, b.wait - 1); (nx.w1wait = nx.w1wait || []).push({ ...x, from: b.code }); nx.wait = (nx.wait || 0) + 1;
    logA('Batches', `${b.label} (${b.code})`, 'Waitlist moved to next intake', b.code, `${nx.code} · ${x.name} → ${w1OptName(x.opt)}`, r); render(); toast(`Moved to ${nx.code}, keeping ${w1OptName(x.opt)}.`);
  } });
};

/* ---------- Transfers: only to a batch that accepts the learner's fee option; nothing is replaced ---------- */
const _mvW1 = ACT.chMoveBatch;
ACT.chMoveBatch = el => {
  const lid = el && el.dataset && el.dataset.id, b = typeof chCurBatch === 'function' ? chCurBatch(lid) : null; if (!w1L3(b)) return _mvW1(el);
  const opt = w1OptOfLid(lid, b), r = _mvW1(el); if (!MODAL || !/id="ch-mv-b"/.test(MODAL.extra || MODAL.body || '')) return r;
  const key = MODAL.extra !== undefined && /id="ch-mv-b"/.test(MODAL.extra) ? 'extra' : 'body', bad = [];
  MODAL[key] = MODAL[key].replace(/<option value="([^"]+)">[^<]*<\/option>/g, (m, code) => { if (w1Accepts(chBatch(code), opt)) return m; bad.push(code); return ''; });
  if (!/<option value=/.test(MODAL[key].slice(MODAL[key].indexOf('id="ch-mv-b"')))) { closeModal(); toast(`No other batch that accepts this learner's fee option (${w1OptName(opt)}) has a place.`, 'info'); return; }
  MODAL.body = (MODAL.body || '').replace('The course, fees, payment plan and offer letter don\'t change;', `The course, fee option (${esc(w1OptName(opt))}, ${esc(w1ModeOfOpt(opt, b) || '—')}), fees, payment plan and offer letter don't change; only batches that accept that fee option are listed;`);
  renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const g = a.fn; a.fn = (...x) => { const nb = chBatch(mval('#ch-mv-b')); if (nb && !w1Accepts(nb, opt)) { chMoveRefuse(lid, `${nb.code} doesn't accept this learner's fee option (${w1OptName(opt)}) — it isn't replaced.`); return false; } return g(...x); }; }
  return r;
};
const _doMoveW1 = chDoMove;
chDoMove = function (lid, b, nb, r) {
  const opt = w1OptOfLid(lid, b);
  if ((w1L3(b) || w1L3(nb)) && opt && !w1Accepts(nb, opt)) { chMoveRefuse(lid, `${nb.code} doesn't accept this learner's fee option (${w1OptName(opt)}) — it isn't replaced.`); return false; }
  const x = b && b.r2 && b.r2[lid], res = _doMoveW1.apply(this, arguments);
  if (x && nb && !(nb.r2 && nb.r2[lid])) { nb.r2 = nb.r2 || {}; nb.r2[lid] = { ...x, from: b.code, at: now().toISOString(), by: ADMIN.me.name }; logA('Batches', `${chLidName(lid)} · ${b.code} → ${nb.code}`, 'Fee-option group carried over', '—', w1OptName(x.opt), r); }
  return res;
};

/* ---------- Shared classes (Level 3): any batch of the programme, by audience — not by the organiser's stored mode ---------- */
// Eligible: an upcoming class of a live batch of the same programme whose audience admits at least one fee option this batch accepts
const w1Joinable = b => s4bAllSess().filter(s => n3Live(s) && new Date(s.start) > now() && !s4bCodesOf(s).includes(b.code) && (() => { const o = n3Batch(s.batch); return o && S4B_LIVE(o) && s4PidOfTitle(o.course) === s4PidOfTitle(b.course); })() && w1Accepted(b).some(o => r2InfoOk(s, b.code, { group: o.id, mode: o.mode || n2ModeOf(b) }))).sort((x, y) => new Date(x.start) - new Date(y.start));
const _joinW1 = ACT.n3Join;
ACT.n3Join = el => {
  const b = n3Batch(el.dataset.b); if (!w1L3(b)) return _joinW1(el);
  if (!n3CanSchedule()) return n3Refuse(b, 'join a shared class', 'Joining a shared class is a scheduling action — Super Admin or Academic Admin.');
  const xs = w1Joinable(b); if (!xs.length) { toast('No upcoming class of this programme is open to this batch\'s fee options.', 'info'); return; }
  reasonDlg({ title: 'Join a shared class — ' + b.code, ok: 'Join class', label: 'Reason (required)', extra: `<div class="field"><label for="n3-j">Class (any batch of ${esc(s4bProgShort(s4PidOfTitle(b.course)))} — for: its audience)</label><select class="select" id="n3-j">${xs.map(s => `<option value="${s.id}">${fdt(s.start)} — ${esc(s.title)} (${esc(s.batch)} · ${esc(s.teacher)}) · for: ${esc(r2AudTxt(s))}</option>`).join('')}</select></div><p class="small">The class stays one session, organised by its own batch. ${esc(b.label)}'s learners in its audience join it, whatever their delivery mode, and it counts once toward this batch's plan.</p>`,
    onOk: r => { const s = s4bSessById($('#n3-j').value); if (!s || !w1Joinable(b).some(x => x.id === s.id)) { fieldErr('#n3-j', 'Choose an upcoming class'); return false; } const bad = s4bShareCheck(n3Batch(s.batch), (s.with || []).concat([b.code])); if (bad) { fieldErr('#n3-j', bad); return false; }
      const was = (s.with || []).join(', ') || '—'; s.with = (s.with || []).concat([b.code]); s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Batch joined', was, s.with.join(', '), r]); s4bSyncBatch(b.code);
      logA('Scheduling', `${s.title} (${s.batch})`, 'Session sharing changed', was, s.with.join(', '), r); n3Notify([b.code], 'Class added to your timetable', `${s.title} · ${fdt(s.start)} (shared with ${s.batch})`, true); render(); toast('Joined. It counts once toward this batch\'s plan.'); } });
};
// Plan patterns of a Level 3 batch: weekly classes always; the limited (Self-Paced) plan when it has or accepts Self-Paced learners
const _kindsW1 = n3Kinds;
n3Kinds = b => { if (!w1L3(b)) return _kindsW1(b); const m = r2Mix(b), sp = m['Self-Paced'] > 0 || (w1StdApplies(b) && n2ModeOf(b) === 'Self-Paced') || w1Accepted(b).some(o => o.mode === 'Self-Paced' && o.status === 'Active'); return sp ? ['weekly', 'limited'] : ['weekly']; };
const _targetW1 = ACT.n3Target;
ACT.n3Target = el => { const b = n3Batch(el && el.dataset && el.dataset.b); if (w1L3(b) && !n3Kinds(b).includes('limited')) { toast('The limited-class plan is for Self-Paced learners — this batch has none and accepts no Self-Paced fee option.', 'err'); return; } return _targetW1(el); };

/* ---------- Programme screens: no batch-wide mode for Level 3 ---------- */
const _setupW1 = ch8Setup;
ch8Setup = function (x) { const h = _setupW1.apply(this, arguments), pr = typeof x === 'string' ? ch8Pr(x) : x; return pr && pr.id && r1IsL3Pid(pr.id) ? h.replace(/<dt>Default delivery mode for new batches<\/dt><dd>[\s\S]*?<\/dd>/, '<dt>Delivery mode</dt><dd>From each learner\'s fee option — one batch can hold both</dd>') : h; };
// P-31 register text: confirmed for Level 3; still open for what defines each mode and for Levels 2, 4 and 5
(() => { const t = typeof TBD_TOPICS !== 'undefined' && TBD_TOPICS.find(x => x[2] === 'P-31'); if (t) t[1] = 'Fully assisted vs self-paced: what defines each, and how Levels 2, 4 and 5 set it (P-31) — Level 3: from each learner\'s fee option';
  const c = typeof CH_OPEN !== 'undefined' && CH_OPEN.find(x => x[0] === 'P-31'); if (c) c[4] = 'Level 3: confirmed — each learner\'s delivery mode comes from their fee option, and one batch can hold both (R2, W1). Still open: what defines each mode, and how Levels 2, 4 and 5 set it (today one mode per batch, pre-selected from the programme\'s Support type).'; })();

/* ---------- Records ---------- */
UXC.push(['W1', 'Mixed-mode Level 3 batch corrections (20 Oct 2026)', [
  'Create batch (Level 3): instead of one delivery mode, the batch lists the fee options it accepts (Self-Paced, Fully Assisted and, for the Level 3 Diploma, the Standard programme fee), all ticked by default; at least one is required. The delivery-mode field appears only while the Standard programme fee is ticked, labelled as applying to standard-fee learners only; otherwise no mode is stored and none is logged. The review step shows the fee options and "From each learner\'s fee option". Levels 2, 4 and 5 are unchanged.',
  'Batch lists, batch detail and the Coordinator\'s overview show the composition worked out from the learners — Fully Assisted, Self-Paced, Mixed (with counts) or "No learners yet" — and the fee options accepted; an empty batch is no longer labelled with a stored default. The Coordinator\'s roster has a Delivery mode column (with each learner\'s fee option) and filter. The description follows the composition. Edit batch details shows the standard-fee mode only where it applies, and locks it only when standard-fee learners are enrolled. A "Change" action edits the accepted fee options (audited; an option held by a learner can\'t be removed).',
  'The learner\'s sign-up batch panel shows their own delivery mode; the Academy assigns only a batch that accepts their fee option. Add learner no longer preselects the Standard programme fee: the group is chosen from the options the batch accepts, a learner who signed up keeps their own option, and a learner already in the batch or on its waitlist isn\'t added twice. A full batch\'s waitlist keeps the learner and their fee option; Offer place and Move to next intake carry it. Transfers list only batches that accept the learner\'s fee option and carry the recorded group; nothing is replaced.',
  'Shared classes: a Level 3 batch can join any upcoming class of its programme whose audience admits one of its fee options — the organising batch\'s stored mode no longer matters (it used to have to be Fully Assisted). Weekly plans, audiences, registers and Zoom access are unchanged (R2).',
]]);
const _aIdxW1 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxW1(p) + `<section class="card idx-sec"><h2>W1 — Mixed-mode Level 3 batches</h2><ul class="idx-list">${[
  chIdxLi('Batches (composition column)', { act: 'aJump', t: 'a-batches' }, 'W1 — Fully Assisted, Self-Paced, Mixed or No learners yet, from the learners.'),
  chIdxLi('Level 3 batch → fee options accepted', { act: 'aJump', t: 'a-batches.L3AC-NOV26' }, 'W1 — the batch accepts fee-option groups, not one delivery mode.')].join('')}</ul></section>`;
