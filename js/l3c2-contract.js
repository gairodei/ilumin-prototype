/* ============================================================
   L3-C2 — Batch change contract integrity (8 Nov 2026; PD-L3C2-* in PROVISIONAL-DECISIONS.md). Loads after l3c-enrol.js,
   before sec1-access.js.
   Root cause. A batch change checked place, start, fee option and readiness, never the learner's signed terms. CB9's cb9Revise
   ran on every render and rewrote the unpaid due dates of an enrolled learner's pinned schedule whenever their batch start moved
   (a transfer, a batch date edit, or a move after a cancellation; provisional PD-CB-10). The automatic reassignments before
   payment (batch full, batch not taking learners) moved signed applicants without comparing their signed payment wording.
   One rule now, applied inside the mutation (chDoMove, the batch date save, cancellation, the sign-up reassignments, L3-C):
   - Signed offer letter: when the signed version carries {{payment_terms}}, the wording in the new batch must equal the wording
     signed (its dates and deposit eligibility follow the batch start). A signature with no kept copy whose version carries
     payment terms, or whose version can't be found, can't be compared: the change is refused (fail safe).
   - Pinned schedule (enrolled): the unpaid due dates the schedule would have in the new batch must equal the dates fixed now
     (the deposit route's instalment 1 stays on the seat hold, PD-FC-14). Paid rows never move.
   - Otherwise the change is refused: new authorized contractual acceptance is required (no amendment workflow exists).
   - A pinned schedule is never recalculated: cb9Revise no longer rewrites dates. If a batch start differs from the schedule
     anyway, that is flagged once for Finance; the dates stay as signed.
   Refusals and allowed transfers are audited. No payment, letter or schedule is changed by any of this.
   ============================================================ */
'use strict';

const L3C2_PT = /\{\{payment_terms\}\}/;
const l3c2Paid = x => x.status === 'Paid' || x.paid > 0 || x.status === 'Awaiting confirmation by Finance';
// Evaluate f as if the learner's batch were b (optionally starting at start); everything is put back
function l3c2As(w, b, start, f) {
  const s = w.signup, k = s.batch, s0 = b.start; s.batch = b.code; if (start) b.start = start;
  try { return f(); } finally { s.batch = k; b.start = s0; }
}
// The signed letter's payment wording: { pt: false } when it carries none, { unknown } when it can't be determined
function l3c2Letter(w) {
  const sig = w.signup && w.signup.sig; if (!sig) return { pt: false };
  const snap = sig.snapshot;
  if (snap) { if (!(snap.text || []).some(t => L3C2_PT.test(t))) return { pt: false }; return 'pay' in snap ? { pt: true, signed: snap.pay } : { unknown: 'the signed copy carries payment terms but no wording was recorded with it' }; }
  const L = chLetters(chProgOf(w).id).find(x => x.v === sig.v);
  if (!L) return { unknown: `offer letter version ${sig.v} can't be found and no signed copy was kept` };
  return (L.text || []).some(t => L3C2_PT.test(t)) ? { unknown: `no signed copy was kept and version ${sig.v} carries payment terms, so what was signed can't be compared` } : { pt: false };
}
// Unpaid rows whose due date would differ in batch b (start), for a pinned schedule; null when it can't be worked out
function l3c2Redates(w, b, start) {
  const pl = cb9Pl(w); if (!pl || !pl.pin) return [];
  const pin = pl.pin, to = cbYmdOf(start || b.start), di = fcIsDI(pl);
  const cur = pl.rows.map(x => ({ n: x.n, amount: x.amount, due: cbYmdOf(x.due), sched: x.sched ? cbYmdOf(x.sched) : cbYmdOf(x.due), status: x.status, paid: x.paid }));
  const red = cbRedate(cur, to, pin.dur, pin.k, pin.enrolledOn, l3c2Paid); if (red.why) return null;
  return red.rows.map((x, i) => ({ n: x.n, from: cur[i].due, to: x.due, i })).filter(x => !l3c2Paid(cur[x.i]) && x.to !== x.from && !(di && x.i === 0));
}
// The letter's payment wording in batch b (start), with the deposit offered or not: the same pieces e2PayTerms uses (cb-pin.js,
// setup-e2.js). Whether a deposit is offered depends on how far away the start is today, which changes with time alone, so the
// signed wording is compared with both variants: only dates, amounts and choices count.
function l3c2Words(w, b, start, depOk) {
  if (chSponsored(w)) return e2PayTerms(w);
  const P = cb9Pin(w), x = P ? cb8PayTermsTxt({ dep: P.dep, dur: P.dur }, P.opt, cbYmdOf(start || b.start), depOk) : '';
  return x || e2PayTxt(w.signup.plan, depOk);
}
const l3c2SameWords = (w, b, start, signed) => [true, false].some(d => l3c2Words(w, b, start, d) === signed);
// Would moving w to batch b (or b starting at start) change signed terms? null = no impact
function l3c2Impact(w, b, start) {
  if (!w || !w.signup || !b) return null;
  const out = [], L = l3c2Letter(w);
  if (L.unknown) return { unknown: true, why: [L.unknown] };
  if (L.pt && !l3c2SameWords(w, b, start, L.signed)) out.push(`the payment terms signed in the offer letter would change (signed: "${L.signed}"; in ${b.code}: "${l3c2Words(w, b, start, !/deposit/.test(L.signed) ? false : true)}")`);
  if (w.signup.done) {
    const ch = l3c2Redates(w, b, start);
    if (ch === null) return { unknown: true, why: ['the pinned payment schedule can\'t be compared with the new start date'] };
    if (ch.length) out.push(`signed payment dates would move (${ch.map(x => `payment ${x.n}: ${cbFd(x.from)} → ${cbFd(x.to)}`).join(', ')})`);
  }
  return out.length ? { why: out } : null;
}
const l3c2Msg = (who, x) => `${who}: ${x.unknown ? 'the signed terms can\'t be checked — ' : ''}${x.why.join('; ')}. New authorized contractual acceptance is required; nothing was changed.`;
const l3c2Refuse = (w, what, b, x) => { logA('Batches', `${chFullName(w)} (${w.me.id})`, `Blocked: ${what} (signed terms would change)`, b ? b.code : '—', '—', x.why.join('; ')); };

/* ---------- Enrolled transfers (Assign / change batch, cancellation moves): the final mutation checks ---------- */
const _moveL3C2 = chDoMove;
chDoMove = function (lid, b, nb, r) {
  const w = chWorldByLid(lid);
  if (w && w.signup && nb) {
    const x = l3c2Impact(w, nb);
    if (x) { l3c2Refuse(w, 'batch change', nb, x); toast(l3c2Msg(`${chFullName(w)} can't move to ${nb.code}`, x), 'err'); return false; }
  }
  const res = _moveL3C2.apply(this, arguments);
  if (res !== false && w && w.signup && w.signup.batch === (nb && nb.code)) logA('Batches', `${chFullName(w)} (${w.me.id})`, 'Batch change checked against signed terms', b ? b.code : '—', nb.code, 'Signed offer letter and payment schedule unchanged by the move');
  return res;
};
// The transfer dialog lists only batches the move is allowed to; the others are named with the reason
const _mvDlgL3C2 = ACT.chMoveBatch;
ACT.chMoveBatch = el => {
  const lid = el && el.dataset && el.dataset.id, w = lid && chWorldByLid(lid), r = _mvDlgL3C2(el);
  if (!w || !w.signup || !w.signup.done || !MODAL) return r;
  const key = MODAL.extra !== undefined && /id="ch-mv-b"/.test(MODAL.extra || '') ? 'extra' : /id="ch-mv-b"/.test(MODAL.body || '') ? 'body' : null; if (!key) return r;
  const bad = [];
  MODAL[key] = MODAL[key].replace(/<option value="([^"]+)">[^<]*<\/option>/g, (m, code) => { const nb = chBatch(code), x = nb && l3c2Impact(w, nb); if (!x) return m; bad.push([code, x]); return ''; });
  if (!/<option value=/.test(MODAL[key].slice(MODAL[key].indexOf('id="ch-mv-b"')))) { closeModal(); l3c2Refuse(w, 'batch change', null, { why: bad.map(([c, x]) => `${c}: ${x.why.join('; ')}`) }); toast(`${chFullName(w)} can't be moved: in every other batch the signed terms would change (${bad.map(([c]) => c).join(', ')}). New authorized contractual acceptance is required.`, 'err'); return false; }
  if (bad.length) MODAL.body = (MODAL.body || '') + `<details class="small l3c2-bad"><summary>Not available — signed terms would change (${bad.length})</summary><ul>${bad.map(([c, x]) => `<li>${esc(c)}: ${esc(x.why.join('; '))}</li>`).join('')}</ul></details>`;
  renderModal();
  // Checked again on confirm (the dialog may have been open while the batch changed); the base dialog would report a move that
  // chDoMove refused, so the refusal is made here and the dialog stays open
  const ok = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  if (ok && ok.fn && !ok._l3c2) { const g = ok.fn; ok._l3c2 = true; ok.fn = (...a) => { const nb = chBatch(mval('#ch-mv-b')), x = nb && l3c2Impact(w, nb); if (x) { l3c2Refuse(w, 'batch change', nb, x); toast(l3c2Msg(`${chFullName(w)} can't move to ${nb.code}`, x), 'err'); return false; } return g(...a); }; }
  return r;
};

/* ---------- Batch date edit: refused when any signed terms of its learners or applicants would change ---------- */
const _editL3C2 = ACT.s4bBatchEdit;
ACT.s4bBatchEdit = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), r = _editL3C2(el), ok = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (b && ok && ok.fn && !ok._l3c2) {
    const f = ok.fn; ok._l3c2 = true;
    ok.fn = function () {
      const v = !chStarted(b) && $('#bd-s') && $('#bd-s').value, start = v ? new Date(v + 'T09:00:00Z') : null; // as the editor saves it
      if (start && !isNaN(start) && cbYmdOf(start.toISOString()) !== cbYmdOf(b.start)) {
        const hit = Object.values(STORE.worlds || {}).filter(w => w && w.signup && w.signup.batch === b.code && w.signup.sig).map(w => [w, l3c2Impact(w, b, start.toISOString())]).filter(([, x]) => x);
        if (hit.length) {
          hit.forEach(([w, x]) => l3c2Refuse(w, 'change batch start date', b, x));
          logA('Batches', `${b.label} (${b.code})`, 'Blocked: change batch start date (signed terms would change)', fd(b.start), fd(start.toISOString()), hit.map(([w]) => chFullName(w)).join(', '));
          fieldErr('#bd-s', `Signed payment terms of ${plural(hit.length, 'learner')} depend on this start date (${hit.map(([w]) => chFullName(w)).join(', ')}). New authorized contractual acceptance is required before it can change.`); return false;
        }
      }
      return f.apply(this, arguments);
    };
  }
  return r;
};

// The editor's impact preview says what now happens to dated schedules (it said unpaid dates move with the start)
const _impL3C2 = s4bImpact;
s4bImpact = function () {
  const h = _impL3C2.apply(this, arguments); if (typeof h !== 'string') return h;
  return h.replace('Unpaid payment dates move with the new start date (see below); the batch dates on their pages change.', 'Signed payment dates never move (see below); the batch dates on their pages change.')
    .replace(/(<p class="small cb9-imp">[\s\S]*?a dated payment schedule): if the start date changes, their unpaid payment dates move with it \(same amounts and count; paid payments unchanged; each is told once\)\.[\s\S]*?<\/p>/, '$1: its signed dates never move. A start-date change that would alter them is refused — new authorized contractual acceptance is required.</p>');
};

/* ---------- Batch cancellation: a move that would change signed terms is refused before anything is cancelled ---------- */
const _cancelL3C2 = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = chBatch(el && el.dataset && el.dataset.id), r = _cancelL3C2(el), ok = MODAL && MODAL.actions.find(x => /danger/.test(x.cls || ''));
  if (b && ok && ok.fn && !ok._l3c2) {
    const f = ok.fn; ok._l3c2 = true;
    ok.fn = function () {
      const bad = $$('#modal-root .cb-d').map(s => [chWorldByLid(s.dataset.id), chBatch(s.value)]).filter(([w, nb]) => w && w.signup && nb).map(([w, nb]) => [w, nb, l3c2Impact(w, nb)]).filter(([, , x]) => x);
      if (bad.length) { bad.forEach(([w, nb, x]) => l3c2Refuse(w, 'move after batch cancellation', nb, x)); toast(`Not cancelled: moving ${bad.map(([w, nb]) => `${chFullName(w)} to ${nb.code}`).join(', ')} would change signed terms. Choose another batch or a refund for them; new authorized contractual acceptance is required for a move.`, 'err'); return false; }
      return f.apply(this, arguments);
    };
  }
  return r;
};

/* ---------- Before payment: automatic reassignments and L3-C moves compare the signed wording ---------- */
// The automatic reassignment (batch full / not taking learners) happens while the payment step is drawn: a signed applicant whose
// wording would change isn't moved; the step says so and payment waits for new acceptance
// Why a signed applicant can't pay now: the signed wording no longer matches their batch, or the automatic reassignment (ch-b7c:
// batch full; nb1-integrity: not taking learners) would move them where it wouldn't match. Checked before anyone is moved. null = fine
function l3c2HoldWhy(w) {
  const s = w && w.signup, b = s && chBatch(s.batch);
  if (!s || s.done || !s.sig || !b || (typeof l3cStranded === 'function' && l3cStranded(w))) return null;
  const L = l3c2Letter(w);
  if (L.unknown) return { b, x: { unknown: true, why: [L.unknown] } };
  if (L.pt && !l3c2SameWords(w, b, null, L.signed)) return { b, x: { why: [`the payment terms you signed ("${L.signed}") no longer match ${b.code}`] } };
  const nb = !chHasPlace(b) || !nbBatchOk(w, b) ? w1WithW(w, () => chNearestFor(w, [b.code])) : null, x = nb && l3c2Impact(w, nb);
  return x ? { b, nb, x: { why: [`${b.code} can't take you now, and in ${nb.code} ${x.why.join('; ')}`] }, raw: x } : null;
}
const _payL3C2 = chStepPay;
chStepPay = function (w) {
  const h = l3c2HoldWhy(w); if (!h) return _payL3C2.apply(this, arguments);
  const s = w.signup; if (h.nb && s.l3c2Held !== h.nb.code) { s.l3c2Held = h.nb.code; w.admission.history.push([`Automatic reassignment to ${h.nb.code} not made — signed terms would change`, now().toISOString()]); l3c2Refuse(w, 'automatic reassignment before payment', h.nb, h.raw); }
  return l3c2Held(w, h.b, h.x);
};
function l3c2Held(w, b, x) {
  return `<section class="card"><h2>4. Payment</h2><div class="note b-amber l3c2-held" role="alert">${ic('alert')}<div class="small"><strong>Your signed offer letter no longer matches ${esc(chBatchLbl(b))}.</strong> ${esc(x.why.join('; '))}. Nothing has been charged and your signed letter is unchanged. The Academy has to agree new terms with you before you can pay. Contact the Academy: ${academyContact()}</div></div>${chNav(w, '')}</section>`;
}
const _suPayL3C2 = ACT.suPay;
ACT.suPay = el => {
  const w = W, h = l3c2HoldWhy(w);
  if (h) { l3c2Refuse(w, 'pay for the sign-up', h.b, h.x); render(); toast('Your signed payment terms no longer match the batch you can be placed in — nothing was charged. Contact the Academy.', 'err'); return false; }
  return _suPayL3C2(el);
};
// L3-C's eligibility also applies when signing up again (the earlier exemption is withdrawn): any signed wording must still hold
const _whyL3C2 = l3cWhyNot;
l3cWhyNot = function (w, b) {
  const y = _whyL3C2.apply(this, arguments); if (y || !w.signup || !w.signup.sig) return y;
  const x = l3c2Impact(w, b); return x ? (x.unknown ? 'The signed terms can\'t be checked — new authorized contractual acceptance would be needed' : 'Payment terms differ from the signed offer letter — a new offer letter would be needed') : null;
};

/* ---------- A pinned schedule is never recalculated ---------- */
cb9Revise = function (w) {
  const pl = cb9Pl(w); if (!pl || !pl.pin) return;
  const to = cb9Anchor(w), from = (pl.revs || []).length ? pl.revs[pl.revs.length - 1].anchor : pl.pin.anchor;
  if (!cbYmdOk(to) || to === from || pl.l3c2Flag === to) return;
  const ch = l3c2Redates(w, chBatch(w.signup.batch) || { start: to }); pl.l3c2Flag = to;
  if (!ch || !ch.length) return;
  logA('Finance', `${chFullName(w)} (${w.me.id})`, 'Batch start differs from the signed payment schedule — dates kept', `Schedule anchored ${cbFd(from)}`, `Batch starts ${cbFd(to)}`, 'L3-C2: a pinned schedule is never recalculated; new contractual acceptance is needed to change it');
  e1Notify({ key: `l3c2-${w.me.id}-${to}`, to: 'all', t: 'Signed payment dates kept', b: `${chFullName(w)}: the batch now starts ${cbFd(to)}; the signed schedule (from ${cbFd(from)}) is unchanged.`, go: 'f-plans' });
};

UXC.push(['L3-C2', 'Batch changes keep signed terms (8 Nov 2026)', [
  'Moving a learner or applicant to another batch, changing a batch\'s start date, moving learners when a batch is cancelled, and the automatic reassignment before payment are each checked against the signed offer letter\'s payment wording and the learner\'s pinned payment schedule. If the signed dates or terms would change, the change is refused and says that new authorized contractual acceptance is required.',
  'A pinned payment schedule is no longer recalculated when a batch start differs: its dates stay as signed, and Finance is told once.',
  'A signature whose terms can\'t be checked (no signed copy kept, and a letter version with payment terms) is refused rather than guessed.']]);
