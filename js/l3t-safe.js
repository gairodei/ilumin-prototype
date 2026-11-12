/* ============================================================
   L3 safe corrections T-1 and T-2 (8 Nov 2026; PD-L3T-* in PROVISIONAL-DECISIONS.md). Loads after l3d-iqa-mode.js.
   T-1  Programme-version compatibility for enrolled-learner transfers. A learner's version is authoritative only when it was fixed
        at enrolment (w.nvq.s3Pinned with w.nvq.progVersion); a batch's only when it was recorded (b.progVersion). When both are
        known and differ, the move is refused in the final mutation (chDoMove), in the transfer dialog's list and on confirm, and
        before a batch cancellation moves anyone. Free-text labels ("Version 2 — enrolled …", roster enrolment records) are never
        read; nothing is migrated or re-pinned; unknown-version records are compared with nothing and behave as before.
   T-2  Transfer dialogs report what happened. The Assign / change batch dialog showed "Moved to …" even when a check inside the
        move refused it (fee option, delivery-mode readiness, signed terms, version). Its confirm now checks the version first, then
        runs the move while holding its messages: success is shown only when the learner's batch actually changed; otherwise the
        refusal reasons are shown once and the dialog stays open to choose another batch. A refused move changes no seat count,
        allocation, notification or success entry (the checks run before anything is written). Batch cancellation checks every
        chosen move first and cancels nothing if one would be refused.
   ============================================================ */
'use strict';

/* ---------- T-1 ---------- */
// Why learner lid can't move to batch nb because of programme versions ('' = no known incompatibility)
function l3tVerWhy(lid, nb) {
  const w = chWorldByLid(lid), v = w && w.nvq && w.nvq.s3Pinned ? w.nvq.progVersion : null, bv = nb && nb.progVersion;
  if (!v || !bv || v === bv) return '';
  return `${chFullName(w)} is on programme version ${v} (fixed at enrolment); ${nb.code} runs version ${bv}. A learner can't move to a batch on another version — their curriculum, assignments and observations stay on version ${v}.`;
}
const l3tWho = lid => { const w = chWorldByLid(lid); return `${w ? chFullName(w) : chLidName(lid)} (${lid})`; };
const _moveL3T = chDoMove;
chDoMove = function (lid, b, nb) {
  const why = l3tVerWhy(lid, nb);
  if (why) { logA('Batches', l3tWho(lid), 'Blocked: batch change (programme version differs)', b ? b.code : '—', nb.code, why); toast(why + ' Nothing was changed.', 'err'); return false; }
  return _moveL3T.apply(this, arguments);
};

/* ---------- T-1 + T-2: the Assign / change batch dialog (enrolled learners) ---------- */
const l3tAt = (lid, b) => { const w = chWorldByLid(lid); return w && w.signup ? w.signup.batch : b && chCohLids(b).includes(lid) ? b.code : null; };
const _dlgL3T = ACT.chMoveBatch;
ACT.chMoveBatch = el => {
  const lid = el && el.dataset && el.dataset.id, r = _dlgL3T(el); if (!lid || !MODAL) return r;
  const key = /id="ch-mv-b"/.test(MODAL.extra || '') ? 'extra' : /id="ch-mv-b"/.test(MODAL.body || '') ? 'body' : null; if (!key) return r;
  const bad = [];
  MODAL[key] = MODAL[key].replace(/<option value="([^"]+)">[^<]*<\/option>/g, (m, code) => { const y = l3tVerWhy(lid, chBatch(code)); if (!y) return m; bad.push([code, y]); return ''; });
  if (!/<option value=/.test(MODAL[key].slice(MODAL[key].indexOf('id="ch-mv-b"')))) { closeModal(); logA('Batches', l3tWho(lid), 'Blocked: batch change (programme version differs)', '—', '—', bad.map(x => x[1]).join(' ')); toast(`No batch can take ${chLidName(lid) || lid}: ${bad.map(([c]) => c).join(', ')} ${bad.length === 1 ? 'runs' : 'run'} another programme version.`, 'err'); return false; }
  if (bad.length) MODAL.body = (MODAL.body || '') + `<details class="small l3t-bad"><summary>Not available — another programme version (${bad.length})</summary><ul>${bad.map(([c, y]) => `<li>${esc(c)}: ${esc(y)}</li>`).join('')}</ul></details>`;
  renderModal();
  const ok = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (!ok || !ok.fn || ok._l3t) return r;
  const g = ok.fn; ok._l3t = true;
  ok.fn = (...a) => {
    const nb = chBatch(mval('#ch-mv-b')), b0 = chCurBatch(lid), y = l3tVerWhy(lid, nb);
    if (y) { logA('Batches', l3tWho(lid), 'Blocked: batch change (programme version differs)', b0 ? b0.code : '—', nb.code, y); toast(y + ' Nothing was changed.', 'err'); return false; }
    const held = [], t0 = toast; toast = (m, k) => { held.push([m, k]); };
    let res; try { res = g(...a); } finally { toast = t0; }
    // The dialog stopped itself (a missing reason, a check it makes): its own messages, as they were; the form is left untouched
    if (res === false) { held.forEach(([m, k]) => toast(m, k)); return false; }
    const moved = !!nb && l3tAt(lid, nb) === nb.code && (!b0 || l3tAt(lid, b0) !== b0.code || b0.code === nb.code);
    if (moved) { held.forEach(([m, k]) => toast(m, k)); return res; }
    // Refused inside the move although the dialog reported success: say why once, keep the dialog open for another choice
    const why = [...new Set(held.filter(([, k]) => k === 'err').map(([m]) => m))].join(' ') || `${nb ? nb.code : 'That batch'} can't take this learner — nothing was changed.`;
    toast(why, 'err'); return false;
  };
  return r;
};

/* ---------- T-1 + T-2: batch cancellation checks every chosen move before anything is cancelled ---------- */
// The checks the move itself makes (version, fee option, delivery-mode readiness, signed terms), asked before cancelling
function l3tMoveWhy(lid, b, nb) {
  const v = l3tVerWhy(lid, nb); if (v) return v;
  const opt = typeof w1OptOfLid === 'function' ? w1OptOfLid(lid, b) : null;
  if (typeof w1L3 === 'function' && (w1L3(b) || w1L3(nb)) && opt && !w1Accepts(nb, opt)) return `${nb.code} doesn't accept this learner's fee option (${w1OptName(opt)}).`;
  if (typeof crShowReady === 'function' && crShowReady(nb)) { const o = r1Opt(opt), m = (o && o.mode) || null; if (!crReadyAny(nb) || (m && crBModes(nb).includes(m) && crReady(nb, m) !== 'ready')) return crNotReady(nb); }
  const w = chWorldByLid(lid); if (w && w.signup && typeof l3c2Impact === 'function') { const x = l3c2Impact(w, nb); if (x) return l3c2Msg(`${chFullName(w)} can't move to ${nb.code}`, x); }
  return '';
}
const _cancelL3T = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), r = _cancelL3T(el), ok = MODAL && MODAL.actions.find(x => /danger/.test(x.cls || ''));
  if (!b || !ok || !ok.fn || ok._l3t) return r;
  const f = ok.fn; ok._l3t = true;
  ok.fn = function () {
    const bad = $$('#modal-root .cb-d').filter(s => chWorldByLid(s.dataset.id)).map(s => [s.dataset.id, chBatch(s.value)]).filter(([, nb]) => nb).map(([lid, nb]) => [lid, nb, l3tMoveWhy(lid, b, nb)]).filter(([, , y]) => y);
    if (bad.length) { bad.forEach(([lid, nb, y]) => logA('Batches', l3tWho(lid), 'Blocked: move after batch cancellation', b.code, nb.code, y)); toast(`Not cancelled: ${bad.map(([lid, nb, y]) => `${chLidName(lid) || lid} → ${nb.code}: ${y}`).join(' ')} Choose another batch or a refund for them.`, 'err'); return false; }
    return f.apply(this, arguments);
  };
  return r;
};

UXC.push(['L3-T', 'Batch transfers: versions and honest results (8 Nov 2026)', [
  'A learner whose programme version was fixed at enrolment can\'t be moved to a batch that records a different version; the dialog lists such batches as not available and says why. Batches or learners without a recorded version are not compared.',
  'Assign / change batch shows success only when the learner has actually moved. When a check refuses the move, the dialog stays open with the reason; nothing is changed. A batch is not cancelled if one of its chosen moves would be refused.']]);
