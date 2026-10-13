/* ============================================================
   Client decisions — Batch 7: decision effects for the new approval types (CH-34, CH-35; later sub-batches add theirs).
   Loads before guard.js on purpose: the self-approval guard stays the outermost applyDecision, so a refused
   decision never reaches these effects. The effects themselves live in ch-b7a.js (and later ch-b7b/c.js).
   ============================================================ */
'use strict';

const CH7_EFFECTS = {};
const _applyCh7 = applyDecision;
applyDecision = function (i, a, r, o) {
  const res = _applyCh7.apply(this, arguments);
  const f = i && CH7_EFFECTS[i.type]; if (f) f(i, a, r, o);
  return res;
};
