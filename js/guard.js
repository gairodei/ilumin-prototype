/* ============================================================
   Decision guard — self-approval is enforced in the decision path itself, not only in the UI.
   Wraps the outermost applyDecision and ACT.qDo (loads last), so every caller — buttons, bulk decisions, dialogs,
   direct calls — goes through it: the bare function name always resolves to this wrapper at call time.
   Rule (G4, unchanged): nobody decides an item they raised (or one routed to someone else), except the Super
   Administrator's own actions, which are applied immediately by saApply (marked i._sa).
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE THIS ON THE SERVER.
   ============================================================ */
'use strict';

const DECIDE_ACTS = ['approve', 'grant', 'extend', 'exceptional', 'paid', 'approveFinal', 'extendDl'];
const decisionBlocked = (i, a) => !!(i && DECIDE_ACTS.includes(a) && !i._sa && isOpen(i) && selfBlocked(i));
const whoDecides = i => i.status === 'Escalated' ? 'the Super Administrator' : (i.first && i.first !== ADMIN.me.name && i.first !== 'Super Administrator') ? i.first : 'the Super Administrator';
const refuseMsg = i => isMine(i) ? `You raised this, so another approver decides — routed to ${whoDecides(i)}.` : `${whoDecides(i)} decides this item.`;

// Every decision, however it is reached
const _applyGuard = applyDecision;
applyDecision = function (i, a, r, o) {
  if (decisionBlocked(i, a)) { logA('Approvals Queue', i.id, 'Blocked: self-approval', i.status, i.status, 'Decision refused for ' + ADMIN.me.name); toast(refuseMsg(i), 'err'); return false; }
  return _applyGuard.apply(this, arguments);
};
// The decision dialog is not even opened for a blocked item
const _qDoGuard = ACT.qDo;
ACT.qDo = el => { const i = qItem(el.dataset.id); if (decisionBlocked(i, el.dataset.a)) { toast(refuseMsg(i), 'err'); return; } return _qDoGuard(el); };

/* ---------- Records ---------- */
if (typeof UXV2_BEHAVIOUR !== 'undefined') UXV2_BEHAVIOUR.push(['admin', 'H', 'Self-approval enforced only in the UI — fixed. The approve buttons were disabled, but a direct decision call on an item you raised (or one routed to someone else) still applied it. The check now runs in the decision path itself, wherever a decision is applied. Production must enforce this on the server.', 'a-queue items (all admin roles)', 'G4: nobody approves their own item, except the Super Admin.']);
UXC.find(x => x[0] === 'Defect fix')[2].push('Self-approval enforced only in the UI — fixed (found in Phase 4): the check now runs in applyDecision and ACT.qDo, so buttons, bulk decisions, dialogs and direct calls are all refused for an item you raised or one routed to someone else; the Super Administrator\'s own immediate actions are unchanged. Production must enforce this on the server. Test: ftest0 "Finance A: direct approve refused".');
const _cdLogGuard = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogGuard(p) + `<section class="card"><h2>UX polish v2 — defects fixed</h2>${recTbl(['Item', 'Status', 'What it means in the prototype'], [['Self-approval enforced only in the UI', 'Fixed', 'The approve buttons were disabled for your own items, but a direct call could still apply the decision. The check now runs wherever a decision is applied (G4 rule unchanged; the Super Administrator\'s own actions still apply immediately). Production must enforce this on the server.']])}</section>`;
