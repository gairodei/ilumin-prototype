/* ============================================================
   E1 (provisional) — the decision effect for "Programme payment terms" approvals.
   Loads before guard.js on purpose: the self-approval guard stays the outermost applyDecision, so a refused decision never
   reaches this effect. The effect itself (e1Decide: who may decide, approve → new plan version, request changes) lives in
   setup-e1.js, which loads later; until then other item types pass straight through.
   ============================================================ */
'use strict';

const _applyE1 = applyDecision;
applyDecision = function (i, a, r, o) {
  if (i && i.type === 'Programme payment terms' && typeof e1Decide === 'function') return e1Decide(i, a, r, () => _applyE1.call(this, i, a, r, o));
  return _applyE1.apply(this, arguments);
};
