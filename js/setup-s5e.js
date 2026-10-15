/* Setup S5e — cross-stage integration, security and the final setup audit.
   (A) Adding a learner to a batch checks the actor in the action and again on confirmation. (B–E) An admin rebuild — admin
   variant switch, Super Admin identity change, screen-index jump — used to re-create every admin data list and module store from
   the seed, so purchases, seat assignments, ledgers, Finance transactions, approvals, learners added one at a time, security events,
   configuration and the agency demo clock were lost or reverted. It now rebuilds only the identity (who is signed in, their staff
   record and notifications, and the variant's seeded audit rows) and keeps the session's data, together, so the records that refer
   to each other stay consistent. The deliberate demo reset still restores the seed. Records: corrected S5 statements and the final
   setup status. Loads last. */
'use strict';

/* ---------- A. Add learners to a batch (roles document: "Add learners to a batch (single, CSV or automatic)") ----------
   Super Administrator, System Administrators and Academic Admins. Checked when the action runs and again when its dialog is
   confirmed; others — including custom-role access, Business, Finance and IQA, who can view learners or batches — are refused,
   nothing changes and the attempt is logged. Entry points: Add learner on the roster (also reached from Learners → Place in batch),
   Offer a waitlist place, Move a waitlisted learner to the next intake. Batch state, capacity → waitlist and one-active-batch rules
   are unchanged. This is a role check only: admission, enrolment and payment eligibility are still not checked (open). */
function s5eBatchWhy() {
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me) return 'Sign in to the admin console first.';
  if (typeof s5Ctx === 'function' && s5Ctx()) return 'Adding learners to a batch stays with the Super Administrator, System Administrators and Academic Admins.';
  return isSA() || isSys() || (typeof isAca === 'function' && isAca()) ? '' : 'Only the Super Administrator, a System Administrator or an Academic Admin can add learners to a batch.';
}
function s5eDeny(entity, what, why) {
  const w = typeof s5dActor === 'function' ? s5dActor() : { name: ADMIN.me.name, role: ADMIN.me.roles[0] };
  ADMIN.security.unshift({ id: 'SE-S5E-' + (ADMIN.security.length + 1) + '-' + Date.now().toString(36), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${w.role} ${w.name} attempted: ${what} — ${why}`, reviewed: false });
  logA('Batches', entity, 'Blocked: ' + what, '—', '—', why);
  toast(why + ' Attempt logged.', 'err'); return false;
}
const S5E_BATCH_ACTS = { addToBatch: 'add a learner to', kOffer: 'offer a waitlist place in', kNextIntake: 'move a waitlisted learner on from' };
Object.keys(S5E_BATCH_ACTS).forEach(k => {
  const f = ACT[k]; if (!f) return;
  ACT[k] = (el, e) => {
    const id = el && el.dataset ? el.dataset.id : '', b = ADMIN.batches.find(x => x.code === id), ent = b ? `${b.label} (${b.code})` : String(id || '—'), what = `${S5E_BATCH_ACTS[k]} ${ent}`;
    const w = s5eBatchWhy(); if (w) return s5eDeny(ent, what, w);
    const guard = () => { const x = s5eBatchWhy(); return x ? s5eDeny(ent, what, x) : true; };
    return s5Dlg(() => s5Mod(() => f(el, e), guard), guard);
  };
});

/* ---------- B–E. An admin rebuild keeps the session's data ----------
   Measured (S5e): buildAdmin() re-created STORE.agy, .biz, .tas, .aca, .iqa and .sys, re-seeded STORE.fin's lists (transactions,
   overdue, deposits, …) and every ADMIN data list (learners, batches, bundles, ledger, queue, security, config, agencies, …). Only
   the identity differs between variants: av, variant, me, staff, myNotifs (and the seeded audit rows). So the previous data is
   carried into the rebuilt ADMIN and STORE as a whole — purchases, bundles, seat assignments, ledgers, transactions and approvals
   keep referring to each other. The identity is rebuilt as before (S5a still owns staff and roles); the audit keeps the variant's
   seeded rows plus every row written this session. initStore() (the demo reset) is not affected: it starts from the seed. */
const S5E_ID_KEYS = ['av', 'variant', 'me', 'staff', 'myNotifs', 'roles', 'roleCaps', 'edge', 'sysRole', 'iqaRole', 'biz', 'aca', 'fin', 's5c', 'audit'];
const S5E_STORES = ['agy', 'biz', 'tas', 'aca', 'iqa', 'sys'];
let S5E_RESET = false;
const _isS5e = initStore;
initStore = function () { S5E_RESET = true; try { return _isS5e.apply(this, arguments); } finally { S5E_RESET = false; STORE.s5eBoot = now().toISOString(); } };
const _baS5e = buildAdmin;
buildAdmin = function () {
  const old = !S5E_RESET && typeof ADMIN !== 'undefined' && ADMIN && ADMIN.learners ? ADMIN : null;
  const oldS = old ? Object.fromEntries(S5E_STORES.map(k => [k, STORE[k]])) : null, oldFin = old && STORE.fin ? { ...STORE.fin } : null;
  const r = _baS5e.apply(this, arguments);
  if (old && ADMIN && ADMIN !== old) s5eCarry(old, oldS, oldFin);
  return r;
};
function s5eCarry(old, oldS, oldFin) {
  Object.keys(old).forEach(k => { if (!S5E_ID_KEYS.includes(k) && !k.startsWith('_')) ADMIN[k] = old[k]; });
  // Audit: the rebuilt variant's seeded rows and every row written this session (no duplicates)
  const boot = STORE.s5eBoot || '', key = a => `${a.id}|${a.at}|${a.action}|${a.entity}`, have = new Set(ADMIN.audit.map(key));
  const add = (old.audit || []).filter(a => String(a.at) >= boot && !have.has(key(a)));
  if (add.length) ADMIN.audit = ADMIN.audit.concat(add).sort((x, y) => String(y.at).localeCompare(String(x.at)));
  S5E_STORES.forEach(k => { if (oldS[k]) STORE[k] = oldS[k]; });
  if (oldFin && STORE.fin) Object.assign(STORE.fin, oldFin);
}

/* ---------- Records: corrected S5 statements ---------- */
const s5eFix = (label, from, to) => { const e = UXC.find(x => x[0] === label); if (!e) return; e[2] = e[2].map(t => t.includes(from) ? t.replace(from, to) : t); };
s5eFix('Setup S5b', 'Tracked for S5e, outside S5b: the rest of the agency store (purchases, seat assignments, ledger, and the agency portal\'s demo clock offset), the bundle catalogue, Finance ledger and the security log are still re-created from the seed by an admin rebuild (a link keeps its stored expiry).', 'Resolved in S5e: the agency store (purchases, seat assignments, ledger, notifications, the demo clock), the bundle catalogue, the Finance ledger and the security log are now kept across admin rebuilds. The fixed "7 days" email wording was resolved in S5d: each email states its own link\'s stored expiry.');
s5eFix('Setup S5d', 'is not part of that grant and stays where it was. This applies the documented permission; it is not a new policy.', 'is not part of that grant and stays with the Super / System Admin — an internal implementation boundary pending client confirmation, not a confirmed client policy. This applies the documented permission; it is not a new policy.');
s5eFix('Setup S5d', 'Tracked for S5e: the agency store (purchases, assignments, ledger, notifications, demo clock), the bundle catalogue, Finance ledger and the security log are still re-created by an admin rebuild.', 'Resolved in S5e: the agency store, the bundle catalogue, the Finance ledger and the security log are now kept across admin rebuilds.');
s5eFix('Setup S5c', 'the single Add learner to a batch has no role check of its own (tracked for S5e).', 'the single Add learner to a batch now checks the actor (S5e) — it still doesn\'t check admission, enrolment or payment eligibility (open).');
s5eFix('Setup S5c', 'accounts created by Add learner one at a time (not yet kept across admin rebuilds — S5e).', 'accounts created by Add learner one at a time are kept across admin rebuilds since S5e.');
s5eFix('Setup S5c', 'Country is now a required import column (from the account model; the old sample had none);', 'Country is a required import column (from the account model and CH-01 data residency; the old sample had none) — formal CSV-template confirmation pending;');

UXC.push(['Setup S5e', 'Setup fixes — cross-stage integration, security and the final setup audit', [
  'Add learners to a batch (security, fixed first): Add learner on a batch roster — also reached from Learners → Place in batch — and the waitlist actions "Offer place" and "Move to next intake" changed rosters and waitlists without checking who was acting. They now check the actor when the action runs and again when its dialog is confirmed: Super Administrator, System Administrators and Academic Admins (roles document: "Add learners to a batch (single, CSV or automatic)"). Others — custom-role access, Business, Finance, IQA and anyone who can only view learners or batches — are refused by the screen and by direct calls; nothing changes and the attempt goes to the security log and the audit. Batch state, capacity → waitlist and the one-active-batch rule are unchanged. This is a role check only: whether a learner is eligible for a batch (admission, enrolment, payment) is still not checked — a client decision, not something this fix confirms. "Change batch" (CH decision: Academic Admin, Business Admin, Super Admin) and batch cancellation already checked their own roles and are unchanged.',
  'Admin rebuilds keep the session\'s data (one root cause behind several reported losses). Switching the admin variant, changing the Super Admin identity or jumping from the screen index rebuilt the admin view from the seed: agency purchases, seat assignments and the agency ledger, the bundles credited by purchases, Finance transactions and the Finance ledger lists, approvals in the queue (including invoice purchases waiting for Finance), learners added one at a time, security events, configuration changes and the agency demo clock were lost or reverted — a consumed seat could come back and a recorded payment could disappear. Measured: only the identity differs between variants (who is signed in, their staff record and notifications, and the variant\'s seeded audit rows). A rebuild now rebuilds the identity and carries the rest of the session\'s data across as a whole, so purchases, bundles, ledgers, transactions and approvals keep referring to each other; prices, VAT, discount versions and requests and completed records are untouched. The audit keeps the variant\'s seeded rows plus every row written this session; seeded security events aren\'t duplicated. The deliberate demo reset still restores every fixture. The S5a–S5d stores keep working on top (their replays are idempotent).',
  'Results of that change: learners created one at a time keep their ID, status and details (like CSV-imported ones; no enrolment or payment is implied; duplicates are still refused); refused actions stay in the security log after an identity or variant change; configuration changes (for example the set-password link period) are kept; the agency demo clock ("Advance 30 days") is kept, and set-password links keep their stored expiry (an expired or used link stays refused, a scheduled announcement is published once).',
  'State map (owner → before S5e → now): ADMIN data lists (learners, batches, bundles, ledger, queue, security, config, agencies, announcements, referrals, threads, …) — admin console → re-seeded on every rebuild → kept until the demo reset. STORE.agy (purchases, seat assignments, agency ledger, notifications, mailbox, demo clock), STORE.biz (catalogue, notifications, announcements to agencies), STORE.tas, STORE.aca, STORE.iqa, STORE.sys — their portals → re-created on every rebuild → kept. STORE.fin (transactions, overdue, deposits, pending, duplicates, failed payments, links, plans) — Finance → lists re-seeded on every rebuild → kept. Identity (av, variant, me, staff, myNotifs) — rebuilt as before. Already kept before S5e: learner worlds, workplace, coordinator, discount versions and requests (S4c), S1–S4b and N1–N4 stores, and the S5a–S5d stores. Demo reset (initStore) — restores the seed for all of them (intentional).',
  'Final setup status — client-documented requirements: roles document (Tick to Confirm) — Super Admin full authority; System Admin staff, custom roles, batches, scheduling, CSV account import; Academic Admin academy-wide announcements and batch rosters; Business Admin agencies, their single login and agency communications; D1 referral codes for attribution only; CH-01 country fixes the data region; CH-17 / P-33 academic separation. Accepted internal implementation decisions: Academic Admins manage their own academy announcements (others\' stay with the Super / System Admin — pending client confirmation); registration-style duplicate refusal for CSV imports; Country required in the CSV template; international mobile format; sign-in and account-recovery messages can\'t be turned off.',
  'Prototype limitations: simulated email, SMS and delivery (log records only); scheduled announcements publish when the open prototype redraws a screen, not in the background; staff have no in-app announcement inbox; notification templates govern only announcement notifications and agency set-password emails; the agency portal\'s bulk import is a demonstration file; data lives in the browser session (no backend) and the demo reset clears it.',
  'Open defects (none blocking): Medium — adding a learner to a batch (single) doesn\'t check admission, enrolment or payment eligibility; it needs the client\'s batch-eligibility rule, which also blocks batch-roster and batch-intake CSV. Low — renaming an agency that already has records is refused (records refer to agencies by name, not ID); learner announcement copies made before S5d for the remaining seeded items aren\'t linked to a source. Client decisions still required: batch eligibility (admission / enrolment / payment) for adding learners to batches; the global duplicate email / mobile policy; formal CSV template (Country column); whether an agency\'s commercial status alone should block purchases; whether Academic Admins may manage other administrators\' announcements; a policy for turning off sign-in / account-recovery messages; SRS v1.3.2 remains pending formal client approval.']]);
const _aIdxS5e = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS5e(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Batches → roster → Add learner · admin rebuilds', { act: 'aJump', t: 'a-batches' }, 'S5e — add-to-batch role check (action and confirmation), session data kept across admin rebuilds (purchases, ledgers, transactions, approvals, learners, security log, demo clock), final setup status.')}`);
