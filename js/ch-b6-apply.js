/* ============================================================
   Client decisions — Batch 6 (CH-06): the decision effect for "Bundle VAT setting" approvals.
   Loads before guard.js on purpose: the self-approval guard stays the outermost applyDecision, so a refused
   decision never reaches this effect. The effect itself (chVatDecided) lives in ch-b6.js.
   ============================================================ */
'use strict';

const _applyCh6 = applyDecision;
applyDecision = function (i, a, r, o) {
  const res = _applyCh6.apply(this, arguments);
  if (i && i.type === 'Bundle VAT setting' && typeof chVatDecided === 'function') chVatDecided(i, a, r);
  return res;
};
