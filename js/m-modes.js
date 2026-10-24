/* ============================================================
   M — Batch delivery-mode selection and course code labels (23 Oct 2026; PD-M-* in PROVISIONAL-DECISIONS.md).
   A. Level 3 batches: when a batch is created or edited, the course's delivery modes are shown as checkboxes — only the modes its
      active fee options offer (Self-Paced, Fully Assisted or both), with each mode's fee options under it. Ticking a mode accepts its
      fee options; an option can be unticked within a mode, so options that share a mode aren't treated as the same. The source of
      truth stays W1's accepted fee options (b.w1opts): the modes are worked out from them, never stored separately, and learners keep
      their own fee option, delivery mode and terms. An option (or a whole mode) held by a learner in the batch or on its waitlist
      can't be removed. The legacy "Standard programme fee" has no mode of its own; it stays a separate row whose learners follow the
      batch's standard-fee mode (PD-R1-01). Levels 2, 4 and 5 have no fee options, so they keep one delivery mode per batch (PD-R1-12).
      Cancelling a batch offers each learner only the batches that accept their fee option (the same rule as transfers).
   B. Course Details: Course code (the Academy's, pr.code), Awarding body (pr.qual.body) and Awarding body course code (the existing
      qualification reference, pr.ref) are three separate fields, shown in that order. No field is added and no value changes.
   Loads last.
   ============================================================ */
'use strict';

/* ---------- A. Delivery modes, from the fee options ---------- */
const M_MODES = ['Self-Paced', 'Fully Assisted'];
// The modes a course's active fee options offer (the legacy standard fee has none of its own)
const mAvail = pid => M_MODES.filter(m => r1Opts(pid).some(o => o.status === 'Active' && o.mode === m));
// The modes a set of accepted options covers; the standard fee counts as the batch's standard-fee mode
const mModesOfOpts = (ids, std) => M_MODES.filter(m => ids.some(id => { const o = r1Opt(id); return !!o && (o.mode === m || (!!o.legacy && std === m)); }));
const mModesOf = b => w1L3(b) ? mModesOfOpts(w1Accepted(b).map(o => o.id), b.dmode) : (n2ModeOf(b) ? [n2ModeOf(b)] : []);
const mTxt = ms => (ms.length ? ms.join(' and ') : 'none');
const mSame = (a, b) => JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());

// Options held by learners: W1's (identified learners and waitlist entries), plus the standard fee when the batch counts enrolled or
// waitlisted learners with no record to identify them — seeded learners from before fee options, so on the standard fee
function mHeld(b) {
  const out = w1Held(b).slice(), std = w1Std(b), known = new Set(n4BatchLids(b.code)).size;
  if (std && !out.includes(std) && ((b.enrolled || 0) > known || (b.wait || 0) > (b.w1wait || []).length)) out.push(std);
  return out;
}
// Learners who follow the batch's standard-fee mode: W1's count plus those unidentified seeded learners
const mStdUsers = b => w1StdCount(b) + Math.max(0, (b.enrolled || 0) - new Set(n4BatchLids(b.code)).size);
const _canModeM = n2CanChangeMode;
n2CanChangeMode = function (b, to) {
  if (w1L3(b) && n2CanCreate() && N2_MODES.includes(to) && w1StdApplies(b) && !w1StdCount(b) && mStdUsers(b)) { n2Refuse(b, 'change delivery mode', `${b.code} has learners on the Standard programme fee, whose delivery mode follows this setting — it can't change while they're enrolled.`); return false; }
  return _canModeM.apply(this, arguments);
};
// …and Edit batch details shows the field locked for them (W1 locks it only for identified learners)
function mStdLock() {
  const sel = $('#modal-root select#bd-dm'), b = sel && MODAL && (ADMIN.batches || []).find(x => MODAL.title === 'Edit batch details — ' + x.code);
  if (!b || !w1L3(b) || w1StdCount(b) || !mStdUsers(b)) return;
  const n = mStdUsers(b), hint = sel.closest('.field').querySelector('.hint'); sel.disabled = true;
  if (hint) hint.innerHTML = `${ic('lock', 12)} ${plural(n, 'learner')} on the Standard programme fee ${n === 1 ? 'is' : 'are'} enrolled and follow${n === 1 ? 's' : ''} this setting, so it can't change here. Everyone else's mode comes from their fee option.`;
}
// The checkbox block. o = { pid, list: options shown, sel: IDs ticked, held: IDs learners hold, cls: option checkbox class }
function mBlock(o) {
  const ms = M_MODES.filter(m => o.list.some(x => x.mode === m)), leg = o.list.filter(x => !x.mode), av = mAvail(o.pid);
  const row = x => { const h = o.held.includes(x.id); return `<label class="check m-o"><input type="checkbox" class="${o.cls}" value="${x.id}" data-mode="${esc(x.mode || '')}" data-onchange="mOptTick" ${o.sel.includes(x.id) ? 'checked' : ''} ${h ? 'disabled' : ''} aria-label="Accept ${esc(r2OptName(x))}"><span>${esc(r2OptName(x))}${x.status === 'Retired' ? ' (retired)' : ''}${h ? ' <span class="xs muted">— learners in this batch or on its waitlist hold it</span>' : ''}</span></label>`; };
  const grp = m => { const xs = o.list.filter(x => x.mode === m), hm = xs.some(x => o.held.includes(x.id));
    return `<div class="m-mode" data-m="${m}"><label class="check m-mh"><input type="checkbox" class="m-m" value="${m}" data-onchange="mModeTick" ${xs.some(x => o.sel.includes(x.id)) ? 'checked' : ''} ${hm ? 'disabled' : ''} aria-label="Accept ${m} learners"><span><span class="r2-gh">${m}</span> <span class="xs muted">${plural(xs.length, 'fee option')}${hm ? ' · held by learners, so it stays' : ''}</span></span></label><div class="m-opts" role="group" aria-label="${m} fee options">${xs.map(row).join('')}</div></div>`; };
  const shown = ms.length > av.length ? ms : av;
  const intro = shown.length === 2 ? 'The batch can hold Self-Paced and Fully Assisted learners at the same time. Tick one mode or both.'
    : shown.length === 1 ? `This course's active fee options offer ${shown[0]} only, so ${M_MODES.find(m => m !== shown[0])} isn't available.`
    : leg.length ?'This course has no Self-Paced or Fully Assisted fee options yet — only the Standard programme fee from before fee options.' : '';
  return `<p class="xs muted m-intro">${intro}${intro ? ' ' : ''}${ms.length ? 'Within a mode, untick a fee option the batch shouldn\'t accept. ' : ''}Each learner keeps their own fee option, delivery mode and financial terms.</p>
    ${ms.map(grp).join('')}${leg.length ? `<div class="m-leg"><div class="r2-gh">Standard fee (before fee options)</div><div class="m-opts">${leg.map(row).join('')}</div><p class="xs muted">These learners follow the batch's delivery mode for standard-fee learners.</p></div>` : ''}
    ${o.list.length ? `<p class="small m-sum" aria-live="polite"></p>` : '<p class="small">This programme has no active fee options yet.</p>'}`;
}
// Mode checkbox ↔ its options: a mode is ticked while any of its options is (part-ticked shows as mixed); held options stay ticked
function mSync(root) {
  if (!root) return;
  root.querySelectorAll('.m-mode').forEach(d => { const xs = [...d.querySelectorAll('.m-opts input')], n = xs.filter(i => i.checked).length, m = d.querySelector('.m-m'); m.checked = n > 0; m.indeterminate = n > 0 && n < xs.length; });
  // the standard fee's mode: the one being chosen (create / first acceptance), else the batch's stored one
  const sel = ['#w1-std', '#nb-dm', '#bd-dm'].map(s => $('#modal-root select' + s)).find(Boolean), sm = sel ? sel.value : root.dataset.dm || null;
  const sum = root.querySelector('.m-sum'), ids = [...root.querySelectorAll('.m-opts input:checked')].map(i => i.value);
  if (sum) sum.innerHTML = `Accepts: <strong>${esc(mTxt(mModesOfOpts(ids, sm)))}</strong>`;
  const sf = $('#modal-root .m-std'); if (sf) { const s = r1StdOf(root.dataset.pid); sf.style.display = s && ids.includes(s) ? '' : 'none'; }
}
const mRoot = el => (el && el.closest && el.closest('.m-fs')) || $('#modal-root .m-fs');
INP.mModeTick = el => { const d = el.closest('.m-mode'); if (d) d.querySelectorAll('.m-opts input').forEach(i => { if (!i.disabled) i.checked = el.checked; }); mSync(mRoot(el)); INP.w1NbStd(); };
INP.mOptTick = el => { mSync(mRoot(el)); INP.w1NbStd(); };
// the standard-fee mode select (create / edit) changes the summary too
document.addEventListener('change', e => { if (e.target && /^(nb-dm|bd-dm)$/.test(e.target.id) && e.target.closest('#modal-root')) mSync($('#modal-root .m-fs')); });

// Checks before the accepted options change: the actor (logged), options of another course (logged), retired additions,
// at least one, and nothing held removed. Returns false (refused), an error message, or ''.
function mCheck(b, pick) {
  const why = w1AdminWhy(b); if (why) return w1Deny(b, 'change the delivery modes a batch accepts', why);
  const own = r1Opts(r2Pid(b)).map(o => o.id), foreign = pick.filter(id => !own.includes(id));
  if (foreign.length) return w1Deny(b, 'accept a fee option of another course', `${foreign.map(w1OptName).join(', ')} isn't a fee option of ${b.course} — a batch accepts only its own course's fee options.`);
  const ret = pick.filter(id => r1Opt(id).status !== 'Active' && !w1Accepts(b, id)); if (ret.length) return `${ret.map(w1OptName).join(', ')} is retired — it can't be added`;
  const missing = mHeld(b).filter(id => !pick.includes(id)); if (missing.length) return `${missing.map(w1OptName).join(', ')}: held by learners in this batch or on its waitlist — can't be removed`;
  if (!pick.length) return 'Keep at least one delivery mode — Self-Paced, Fully Assisted or both (with at least one fee option)';
  return '';
}
function mApply(b, pick, r, stdMode) {
  const ent = `${b.label} (${b.code})`, was = w1AccTxt(b), mWas = mTxt(mModesOf(b)), std = w1Std(b); b.w1opts = pick.slice();
  if (std && pick.includes(std) && !b.dmode) { b.dmode = N2_MODES.includes(stdMode) ? stdMode : n2DefaultFor(b.course); b.dmodeSrc = 'set'; b.dmodeLogged = true; logA('Batches', ent, 'Delivery mode set', '—', b.dmode + ' (standard-fee learners)', r); }
  logA('Batches', ent, 'Fee options accepted changed', was, w1AccTxt(b), r);
  const mNow = mTxt(mModesOf(b)); if (mNow !== mWas) logA('Batches', ent, 'Delivery modes accepted changed', mWas, mNow, r);
  if (b.coord) chCooNotify(b.coord, 'Batch fee options changed', `${b.code}: ${mNow} · ${w1AccTxt(b)}`, 'c-batches.' + b.code);
  mReviewed(b, r);
}
const mStdSel = b => `<div class="field m-std"><label for="w1-std">Delivery mode for standard-fee learners</label><select class="select" id="w1-std" data-onchange="mOptTick">${N2_MODES.map(m => `<option ${m === (b.dmode || n2DefaultFor(b.course)) ? 'selected' : ''}>${m}</option>`).join('')}</select><span class="hint">Used only when the Standard programme fee is accepted.</span></div>`;
const mEditList = b => r1Opts(r2Pid(b)).filter(o => o.status === 'Active' || w1Accepts(b, o.id));

/* ---------- Create batch, step 1: the mode checkboxes replace W1's flat fee-option list (same IDs, same defaults) ---------- */
w1NbAcc = function () {
  const co = $('#modal-root #nb-co'), box = $('#modal-root #w1-nb-acc'); if (!co) return;
  const pid = s4PidOfTitle(co.value), dm = $('#modal-root #nb-dm'), f = dm && dm.closest('.field');
  if (f && dm.tagName === 'SELECT' && !f.querySelector('.m-l245')) f.insertAdjacentHTML('beforeend', '<span class="hint m-l245">Levels 2, 4 and 5 have no fee options, so a batch has one delivery mode.</span>');
  const l245 = f && f.querySelector('.m-l245'); if (l245) l245.style.display = r1IsL3Pid(pid) ? 'none' : '';
  if (!r1IsL3Pid(pid)) { if (box) box.remove(); return; }
  const keep = W1_NB && W1_NB.course === co.value ? W1_NB.opts : null, list = r1Opts(pid).filter(o => o.status === 'Active');
  const html = `<fieldset class="field full w1-nb m-fs" id="w1-nb-acc" data-pid="${pid}" style="border:0;padding:0"><legend class="lbl">Delivery modes this batch accepts</legend>${mBlock({ pid, list, sel: keep || list.map(o => o.id), held: [], cls: 'w1-nb-o' })}</fieldset>`;
  if (box) box.outerHTML = html; else if (f) f.insertAdjacentHTML('afterend', html); else co.closest('.field').insertAdjacentHTML('afterend', html);
  INP.w1NbStd(); mSync($('#modal-root #w1-nb-acc'));
};
const _rmM = renderModal; renderModal = function () { const r = _rmM.apply(this, arguments); try { const fs = $('#modal-root .m-fs'); if (fs) mSync(fs); mStdLock(); } catch (e) { /* no batch form open */ } return r; };
const _omM = openModal;
openModal = function (m) {
  // review step: the delivery modes accepted (W1 then adds the fee options and "From each learner's fee option")
  if (m && m.title === 'Create batch — step 5 of 5' && W1_NB && typeof m.body === 'string') m.body = m.body.replace(/<dt>Delivery mode<\/dt><dd>([^<]*)<\/dd>/, (x, md) => `<dt>Delivery modes accepted</dt><dd class="m-nb-rev">${esc(mTxt(mModesOfOpts(W1_NB.opts, W1_NB.std ? md : null)))}</dd>${x}`);
  const r = _omM.apply(this, arguments);
  // step 1 (checked before W1's own check): only this course's active options, and at least one mode
  if (m && m.title === 'Create batch — step 1 of 5' && MODAL) (MODAL.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
    const co = mval('#nb-co'), pid = s4PidOfTitle(co), box = $('#modal-root #w1-nb-acc');
    if (r1IsL3Pid(pid) && box && box.dataset.pid === pid) {
      const ids = $$('#modal-root .w1-nb-o:checked').map(i => i.value), ok = r1Opts(pid).filter(o => o.status === 'Active').map(o => o.id), bad = ids.filter(id => !ok.includes(id));
      if (bad.length) { logA('Batches', co, 'Blocked: accept a fee option of another course', '—', '—', `${bad.map(w1OptName).join(', ')} isn't an active fee option of ${co}`); toast(`${bad.map(w1OptName).join(', ')} isn't an active fee option of this course.`, 'err'); return false; }
      if (!ids.length && !$$('#modal-root .cr-pend:checked').length) { fieldErr('#w1-nb-acc', /* CR (PD-CR-14): a mode awaiting Finance can be configured */ 'Choose at least one delivery mode — Self-Paced, Fully Assisted or both (with at least one fee option)'); return false; }
    }
    return g(...x); }; } });
  return r;
};
// The batch is created: W1 records its fee options; the modes they give are recorded too
const _syncM = syncTasBatches;
syncTasBatches = function () {
  const nb = W1_NB, r = _syncM.apply(this, arguments);
  if (nb && !W1_NB) { const b = w1Batch(nb.code); if (b && w1L3(b)) logA('Batches', `${b.label} (${b.code})`, 'Delivery modes accepted set', '—', mTxt(mModesOf(b)), 'Batch created'); }
  return r;
};

/* ---------- Change (batch detail): the same checkboxes; W1's rules, plus the course check and a mode audit ---------- */
ACT.w1Opts = el => {
  const b = w1Batch(el && el.dataset && el.dataset.id); if (!w1L3(b)) return;
  const why = w1AdminWhy(b); if (why) return w1Deny(b, 'change the fee options a batch accepts', why);
  const pid = r2Pid(b), cur = w1Accepted(b).map(o => o.id), std = w1Std(b);
  reasonDlg({ title: 'Delivery modes accepted — ' + b.code, ok: 'Save', body: mReviewNote(b, false) + '<p class="small">Learners keep the fee option they agreed; a mode or option held by a learner in the batch (or on its waitlist) can\'t be removed. A new sign-up is assigned only to a batch that accepts their option.</p>',
    extra: `<fieldset class="field stack m-fs" style="border:0;padding:0" id="w1-o-fs" data-pid="${pid}" data-dm="${esc(b.dmode || '')}"><legend class="lbl">Delivery modes accepted</legend>${mBlock({ pid, list: mEditList(b), sel: cur, held: mHeld(b), cls: 'w1-o' })}</fieldset>${std && !b.dmode ? mStdSel(b) : ''}`,
    onOk: r => {
      const pick = $$('#modal-root .w1-o').filter(i => i.checked || i.disabled).map(i => i.value), e = mCheck(b, pick);
      if (e === false) return false; if (e) { fieldErr('#w1-o-fs', e); return false; }
      if (mSame(pick, cur)) { if (b.mElig && b.mElig.review) { mReviewed(b, r); render(); toast('Eligibility reviewed. The batch keeps the options shown.'); return; } fieldErr('#w1-o-fs', 'Nothing has changed'); return false; }
      mApply(b, pick, r, mval('#w1-std')); render(); toast('Saved. Learners keep their fee options.');
    } });
};

/* ---------- Edit batch details: the same checkboxes in the form; a change of modes alone saves with the reason ---------- */
const _beM = ACT.s4bBatchEdit;
ACT.s4bBatchEdit = el => {
  const r = _beM(el), b = w1Batch(el && el.dataset && el.dataset.id);
  if (!w1L3(b) || !MODAL || MODAL.title !== 'Edit batch details — ' + b.code) return r;
  const pid = r2Pid(b), cur = w1Accepted(b).map(o => o.id), std = w1Std(b);
  MODAL.body = MODAL.body.replace('<div class="field full"><label for="bd-d">', () => `<fieldset class="field full m-fs" id="m-ed-fs" data-pid="${pid}" data-dm="${esc(b.dmode || '')}" style="border:0;padding:0"><legend class="lbl">Delivery modes accepted</legend>${mBlock({ pid, list: mEditList(b), sel: cur, held: mHeld(b), cls: 'm-eo' })}</fieldset>${std && !b.dmode ? mStdSel(b) : ''}<div class="field full"><label for="bd-d">`);
  renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const pick = $$('#modal-root .m-eo').filter(i => i.checked || i.disabled).map(i => i.value), changed = !mSame(pick, cur), rsn = mval('#bd-r'), sm = mval('#w1-std');
    if (!changed) return g(...x);
    const e = mCheck(b, pick); if (e === false) return false; if (e) { fieldErr('#m-ed-fs', e); return false; }
    // the same comparison the form makes: is anything else being changed?
    const started = s4bStarted(b), v = s => $('#modal-root ' + s), iso = (s, t) => (v(s) && v(s).value ? new Date(v(s).value + t).toISOString() : null);
    const others = !(started || (iso('#bd-s', 'T09:00:00Z') === b.start && iso('#bd-e', 'T17:00:00Z') === b.end && v('#bd-m').value === b.mode)) || +v('#bd-c').value !== b.cap || v('#bd-d').value.trim() !== (b.desc || '') || (v('#bd-dm') && v('#bd-dm').value !== b.dmode);
    if (others) { const res = g(...x); if (res !== false) { mApply(b, pick, rsn, sm); render(); } return res; }
    if (!rsn) { fieldErr('#bd-r', 'Enter a reason'); return false; }
    mApply(b, pick, rsn, sm); closeModal(); render(); toast('Delivery modes saved and audited. Learners keep their fee options.');
  };
  return r;
};

/* ---------- Where the batch is shown: the delivery modes it accepts ---------- */
const _bdM = batchDetail;
batchDetail = function (code) { const h = _bdM.apply(this, arguments), b = w1Batch(code); return w1L3(b) ? h.replace('<p class="small w1-acc">', `<p class="small m-modes">Delivery modes accepted: <strong>${esc(mTxt(mModesOf(b)))}</strong></p><p class="small w1-acc">`) : h; };
const _cbM = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cbM(p), b = p && p.id && w1Batch(p.id); return w1L3(b) ? h.replace('<dt>Fee options accepted</dt>', `<dt>Delivery modes accepted</dt><dd class="small m-modes">${esc(mTxt(mModesOf(b)))}</dd><dt>Fee options accepted</dt>`) : h; };

/* ---------- Cancel batch: each learner is offered only batches that accept their fee option (as for transfers) ---------- */
const _cancelM = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = w1Batch(el && el.dataset && el.dataset.id), r = _cancelM(el);
  if (!w1L3(b) || !MODAL || !/^Cancel batch /.test(MODAL.title || '')) return r;
  let cut = 0;
  MODAL.body = MODAL.body.replace(/(<select class="select cb-d" id="cbd-([^"]+)"[^>]*>)([\s\S]*?)(<\/select>)/g, (m, open, lid, inner, close) => { const opt = w1OptOfLid(lid, b); if (!opt) return m;
    return open + inner.replace(/<option value="([^"]+)">[^<]*<\/option>/g, (o, code) => { const nb = chBatch(code); if (!nb || w1Accepts(nb, opt)) return o; cut++; return ''; }) + close; });
  if (cut) MODAL.body = MODAL.body.replace('</p>', ' Each learner is offered only batches that accept their fee option.</p>');
  renderModal();
  const a = MODAL.actions.find(x => x.cls && /danger|primary/.test(x.cls)); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const sels = $$('#modal-root .cb-d').filter(s => s.value && s.value !== 'refund').map(s => ({ lid: s.dataset.id, nb: chBatch(s.value), sel: s }));
    const bad = sels.find(s => s.nb && !w1Accepts(s.nb, w1OptOfLid(s.lid, b)));
    if (bad) { chMoveRefuse(bad.lid, `${bad.nb.code} doesn't accept this learner's fee option (${w1OptName(w1OptOfLid(bad.lid, b))}) — it isn't replaced.`); return false; }
    const res = g(...x);
    if (res !== false && b.status === 'Cancelled') sels.forEach(s => { const g2 = b.r2 && b.r2[s.lid]; if (g2 && s.nb && !(s.nb.r2 && s.nb.r2[s.lid])) { s.nb.r2 = s.nb.r2 || {}; s.nb.r2[s.lid] = { ...g2, from: b.code, at: now().toISOString(), by: ADMIN.me.name, src: 'Batch cancelled' }; } });
    return res;
  };
  return r;
};

/* ---------- Legacy batches (before W1): an explicit accepted list, fixed the first time one is needed ----------
   W1 let a batch with no list accept every option of its programme, including options created later. Before any option is created,
   any check runs or the batch is shown, such a batch gets its list once, from what can be established:
   - the Standard programme fee (the fee every learner had before options existed) and every option a learner in the batch or on
     its waitlist holds — always kept;
   - another option only when both dates are recorded and it existed when the batch was created; one created later is left out;
   - an option whose relation to the batch can't be established (no batch creation date, or no option date) is left out, not
     guessed, and the batch is marked for an administrator's eligibility review. Existing learners stay; only new enrolments on
     the options left out are refused until an administrator adds them (audited). Nothing about any learner changes. */
function mFreeze(b) {
  if (!w1L3(b) || Array.isArray(b.w1opts)) return;
  const held = mHeld(b), ok = [], later = [], unknown = [];
  r1Opts(r2Pid(b)).forEach(o => { if (o.legacy || held.includes(o.id)) ok.push(o.id); else if (b.created && o.at) (o.at <= b.created ? ok : later).push(o.id); else unknown.push(o.id); });
  b.w1opts = ok; b.mElig = { at: now().toISOString(), basis: b.created ? 'creation date' : 'no creation date', ok: ok.slice(), later, unknown, review: unknown.length > 0 };
  if (unknown.length && typeof ADMIN !== 'undefined' && ADMIN.me) logA('Batches', `${b.label} (${b.code})`, 'Fee-option eligibility review needed', '—', `Accepts: ${w1AccTxt(b)} · not confirmed: ${unknown.map(w1OptName).join(', ')}`, 'Batch from before fee options were recorded per batch');
}
const mFreezeAll = () => { try { (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches || []).forEach(mFreeze); } catch (e) { /* before the admin data or fee options exist */ } };
function mReviewed(b, r) {
  const e = b.mElig; if (!e || !e.review) return;
  e.review = false; e.reviewed = { at: now().toISOString(), by: ADMIN.me.name, r };
  logA('Batches', `${b.label} (${b.code})`, 'Fee-option eligibility reviewed', 'Review needed', `Accepts: ${w1AccTxt(b)}`, r);
}
// when the list is fixed: after the data is built, before any option is created, and before every check or view that uses it
const _isM = initStore; initStore = function () { const r = _isM.apply(this, arguments); mFreezeAll(); return r; };
const _baM = buildAdmin; buildAdmin = function () { const r = _baM.apply(this, arguments); mFreezeAll(); return r; };
const _addOptM = r1AddOpt; r1AddOpt = function () { mFreezeAll(); return _addOptM.apply(this, arguments); };
const _cb8SyncM = cb8R1Sync; cb8R1Sync = function () { mFreezeAll(); return _cb8SyncM.apply(this, arguments); };
['addToBatch', 'kOffer', 'kNextIntake', 'chMoveBatch', 'cancelBatch', 'w1Opts', 's4bBatchEdit', 'n3Join'].forEach(k => { const f = ACT[k]; if (f) ACT[k] = function () { mFreezeAll(); return f.apply(this, arguments); }; });
const _nearM = chNearest; chNearest = function () { mFreezeAll(); return _nearM.apply(this, arguments); };
const _moveM = chDoMove; chDoMove = function () { mFreezeAll(); return _moveM.apply(this, arguments); };
const _bdFreezeM = batchDetail; batchDetail = function (code) { mFreezeAll(); return _bdFreezeM.apply(this, arguments); };
const _cbFreezeM = SCREENS['c-batches']; SCREENS['c-batches'] = p => { mFreezeAll(); return _cbFreezeM(p); };
// the review notice (batch detail, Coordinator overview) and the review in the Change dialog
const mReviewNote = (b, act) => { const e = b.mElig; if (!e || !e.review) return ''; return `<div class="note b-amber m-review" role="status">${ic('alert')}<div class="small"><strong>Fee-option eligibility needs review.</strong> ${esc(b.code)} was set up before each batch recorded its fee options, and its history can't confirm whether it should accept ${esc(e.unknown.map(w1OptName).join(', '))}. Existing learners stay as they are. Until an administrator reviews it, new enrolments are accepted only on: ${esc(w1AccTxt(b))}.${act ? ` <button class="btn btn-sm" data-act="w1Opts" data-id="${b.code}">Review eligibility</button>` : ''}</div></div>`; };
const _bdRevM = batchDetail; batchDetail = function (code) { const h = _bdRevM.apply(this, arguments), b = w1Batch(code); return w1L3(b) && b.mElig && b.mElig.review ? h.replace('<p class="small m-modes">', () => mReviewNote(b, !w1AdminWhy(b)) + '<p class="small m-modes">') : h; };
const _cbRevM = SCREENS['c-batches']; SCREENS['c-batches'] = p => { const h = _cbRevM(p), b = p && p.id && w1Batch(p.id); return w1L3(b) && b.mElig && b.mElig.review ? h.replace('<dl', () => mReviewNote(b, false) + '<dl') : h; };

/* ---------- B. Course Details: Course code, Awarding body, Awarding body course code ---------- */
const M_ABC = 'Awarding body course code';
const M_ABC_HINT = 'The awarding body\'s own code for this qualification or course (for example its qualification number), as issued. Separate from the Academy\'s course code.';
// The form: the awarding body moves next to its course code; the existing reference field (pr.ref) is that code
const _cbFormM = cbForm;
cbForm = function () {
  let h = _cbFormM.apply(this, arguments); const body = (h.match(/<div class="field"><label for="np-q-body">[\s\S]*?<\/div>/) || [])[0];
  h = h.replace('>Qualification number / reference</label>', `>${M_ABC}</label>`).replace(/(<input class="input mono" id="np-r"[^>]*>)<span class="hint">[^<]*<\/span>/, `$1<span class="hint">${esc(M_ABC_HINT)}</span>`);
  if (body && h.includes('<div class="field"><label for="np-r">')) h = h.replace(body, '').replace('<div class="field"><label for="np-r">', () => body + '<div class="field"><label for="np-r">');
  return h;
};
// The read-only view: the same three rows, in the same order
const _cbViewM = cbDetailsView;
cbDetailsView = function () {
  let h = _cbViewM.apply(this, arguments); const body = (h.match(/<dt>Awarding body<\/dt><dd>[\s\S]*?<\/dd>/) || [])[0];
  h = h.replace('<dt>Qualification number / reference</dt>', `<dt>${M_ABC}</dt>`);
  if (body) h = h.replace(body, '').replace(`<dt>${M_ABC}</dt>`, () => body + `<dt>${M_ABC}</dt>`);
  return h;
};
// Review & Publish summary
const _rvSumM = cbRvSummary;
cbRvSummary = function (pr, k) {
  const h = _rvSumM.apply(this, arguments); if (k !== 'details') return h;
  const ab = pr.qual && pr.qual.body ? esc(pr.qual.body) : cbRvNone('Not recorded');
  return h.replace('<dt>Qualification number</dt>', `<dt>Awarding body</dt><dd>${ab}</dd><dt>${M_ABC}</dt>`);
};
// Builder header: the reference is labelled as the awarding body's code
const _cbPageM = cbPage;
cbPage = function (pr) { const h = _cbPageM.apply(this, arguments); return pr && pr.ref ? h.replace(` · <span class="mono">${esc(pr.ref)}</span>`, ` · ${M_ABC} <span class="mono cb-abcode">${esc(pr.ref)}</span>`) : h; };
// The reference's required-field message (older details form) uses the same name
const _feM = fieldErr; fieldErr = function (sel, msg) { return _feM.call(this, sel, sel === '#np-r' && msg === 'Enter the awarding-body reference' ? 'Enter the awarding body course code' : msg); };

/* ---------- Records ---------- */
UXC.push(['M', 'Batch delivery-mode selection and course code labels (23 Oct 2026)', [
  'Create batch and Edit batch details (Level 3): "Delivery modes this batch accepts" shows a checkbox for each mode the course\'s active fee options offer — Self-Paced, Fully Assisted or both; a mode the course doesn\'t offer isn\'t shown. Both can be ticked. Each mode lists its fee options, so options that share a mode can be accepted separately. At least one mode is required. The accepted fee options remain the record (W1); the modes are worked out from them. A mode or option held by a learner in the batch or on its waitlist can\'t be removed. Learners keep their own fee option, delivery mode and terms. The legacy Standard programme fee stays a separate row with its standard-fee mode. Levels 2, 4 and 5 (no fee options) keep one delivery mode.',
  'Batch detail and the Coordinator\'s overview show "Delivery modes accepted"; the review step shows it too. Changes are audited ("Delivery modes accepted set / changed"). A fee option of another course is refused and logged. Cancelling a batch offers each learner only batches that accept their fee option, and carries their recorded group.',
  'Legacy batches (final correction): a Level 3 batch from before W1 no longer accepts every option, including ones created later. It gets an explicit list once — the Standard programme fee, the options its learners hold, and options that existed when it was created (when both dates are known). Options whose history can\'t be established are left out, and the batch shows "Fee-option eligibility needs review" until an administrator adds options or confirms the list (audited). Existing learners are unchanged.',
  'Course Details: three separate fields, in this order — Course code (the Academy\'s identifier), Awarding body, and Awarding body course code (the existing qualification reference, relabelled; values unchanged). The read-only view, Review & Publish and the builder header use the same names.',
]]);
const _aIdxM = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxM(p) + `<section class="card idx-sec"><h2>M — Batch delivery modes and course codes</h2><ul class="idx-list">${[
  chIdxLi('Level 3 batch → delivery modes accepted', { act: 'aJump', t: 'a-batches.L3AC-NOV26' }, 'M — the modes come from the fee options the batch accepts.'),
  chIdxLi('Course Details (three code fields)', { act: 'aJump', t: 'a-programmes.NV-L3.details' }, 'M — Course code, Awarding body, Awarding body course code.')].join('')}</ul></section>`;
