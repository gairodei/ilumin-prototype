/* ============================================================
   Batch AC-1 — academic integrity and authorization (31 Oct 2026; PD-AC-* in PROVISIONAL-DECISIONS.md). Loads last.
   The Academic Admin audit found that academic actions trusted their caller (the shared decision path checked only self-approval,
   and FI-1's gates covered finance item types only), that Teacher / Assessor access came from a list that was never trimmed, and
   that assessment records were keyed by learner and assignment ID only, so two programmes sharing an assignment ID shared one
   record. The checks are made here, at the shared boundaries:
   - AC-1  one decision gate for every non-finance queue item: the decider's role for the item's type and stage, the item still
           open (a decided item is never decided again; its effects never run twice), the Super Administrator's override as the
           one separate path. Refusals are logged.
   - AC-2  actor guards on release of marking, staff allocation, batch cancellation and lifecycle, uploads on a learner's behalf,
           observation confirm / cancel and certificate revoke / retry.
   - AC-3  Teacher / Assessor scope from the current allocations; a per-learner override gives that learner only; a batch move
           moves the learner's cohort place and Coordinator allocation too.
   - AC-4  a learner on more than one programme gets programme-scoped assessment keys (learner~assignment~programme); records
           made before keep their key and are shown only where they provably belong (fail closed).
   No academic policy is added or changed.
   ============================================================ */
'use strict';

/* ---------- AC-4: assessment identity ---------- */
const acProgOf = b => { if (!b) return ''; const p = (ADMIN.programmes || []).find(x => x.title === b.course); return p ? p.id : b.course; };
const acProgsOf = lid => new Set((ADMIN.batches || []).filter(b => !b.short && chCohLids(b).includes(lid)).map(acProgOf));
// learner~assignment for a learner on one programme (unchanged); on more than one, learner~assignment~programme — except for the
// programme that provably owns the records already kept under learner~assignment (acPlainOwner), which keeps that key
function acKey(lid, aid, b) {
  if (!b || acProgsOf(lid).size < 2) return `${lid}~${aid}`;
  const p = acProgOf(b); return acPlainOwner(lid, aid) === p ? `${lid}~${aid}` : `${lid}~${aid}~${p}`;
}
// Which programme the records under learner~assignment belong to: for a learner with an account, their own NVQ; otherwise the
// programme named by a published outcome's stamp (PD-AV-05),
// else the only programme of the learner with a submission for that assignment. Decided once, when first needed, and remembered,
// so it never moves; when it can't be proved (both programmes have a submission, no stamp) it is null — those records stay where
// they are and neither programme shows them (fail closed).
function acPlainOwner(lid, aid) {
  const M = STORE.acOwner = STORE.acOwner || {}, k = lid + '~' + aid; if (k in M) return M[k];
  const w = typeof chWorldByLid === 'function' ? chWorldByLid(lid) : null; // a learner with an account: their own NVQ, whose portal reads learner~assignment
  if (w && w.nvq && w.nvq.title) return (M[k] = acProgOf({ course: w.nvq.title }));
  const o = R3().out[k], stamped = o && o.own && !o.own.ambiguous ? acProgOf({ course: o.own.prog }) : null;
  const ps = [...new Set((ADMIN.batches || []).filter(b => !b.short && (b.coh || []).some(e => acCohLid(e) === lid && e.subs && e.subs[aid])).map(acProgOf))];
  return (M[k] = stamped || (ps.length === 1 ? ps[0] : null));
}
// A published outcome recorded under the plain key before the learner had a second programme belongs to a programme only when its
// stamp (PD-AV-05) names it; anything else stays where it is and is shown to neither programme
function acOutBefore(key) {
  const p = String(key).split('~'); if (p.length < 3) return null;
  const o = R3().out[p[0] + '~' + p[1]]; return o && o.own && !o.own.ambiguous && acProgOf({ course: o.own.prog }) === p[2] ? o : null;
}

// A learner with an account has one NVQ (sign-up refuses a second) and their own assignment records belong to it. If the account
// is also in another programme's cohort (seeded or test data only; Add learner refuses a second active batch), that programme's
// staff lists don't show those records (fail closed) — the agency view already does the same (avNvqs)
const acLiveOk = r => { const L = r && r.L, w = L && L.v && STORE.worlds[L.v]; return !w || !L.batch || L.batch.short || !w.nvq || acProgOf(L.batch) === acProgOf({ course: w.nvq.title }); };
const _tsAC = tasSubs;
tasSubs = function () { return _tsAC.apply(this, arguments).filter(acLiveOk); };
const _msAC = mySubmissions;
mySubmissions = function () { return _msAC.apply(this, arguments).filter(acLiveOk); };

/* ---------- AC-1: one decision gate for every non-finance queue item ---------- */
let AC_OVERRIDE = false; // set only while the Super Administrator's override applies its effect
const AC_SA_ONLY = ['Office location change', 'Bank details change', 'Super Admin own action'];
function acDeciderWhy(i, a) {
  if (AC_OVERRIDE) return isSA() ? '' : 'Only the Super Administrator can override a decision.';
  const t = i.type, esc = i.status === 'Escalated';
  if (t === CH_OR_T) {
    if (S.portal === 'coord') { const r = chOrOf((i.data || {}).req); return r && !esc && chIsMyBatchLid(r.lid) ? '' : 'Only the Academic Coordinator of the learner\'s batch, an Academic Admin or the Super Administrator decides this request.'; }
    return S.portal === 'admin' && (isSA() || (!esc && typeof isAca === 'function' && isAca())) ? '' : 'Only the Academic Coordinator of the learner\'s batch, an Academic Admin or the Super Administrator decides this request.';
  }
  if (S.portal !== 'admin') return 'Approval decisions are made in the admin console by the approver for that item.';
  if (isSA()) return ''; // the Super Administrator decides any item (rules 1 and 2 of "Who approves what")
  if (esc) return 'An escalated item is decided by the Super Administrator.';
  if (i.adm || i.doc) return admCanDecide() ? '' : 'Admission decisions are made by the Academic Admin, the Admissions Officer or the System / Super Administrator.';
  if (ACA_TYPES.includes(t)) return typeof isAca === 'function' && isAca() ? '' : 'An Academic Admin decides this item.';
  if (t === 'Data correction') return a === 'approveFinal' ? 'Final approval of a Data Correction is the Super Administrator\'s.' : isSys() && i.stage !== 'final' ? '' : 'A System Administrator gives the first review of a Data Correction.';
  if (t === 'Learner profile change' || t === 'Bundle price below minimum') return isSys() ? '' : 'A System Administrator decides this item.';
  if (t === 'Link existing learner to agency') return isBiz() ? '' : 'A Business Admin decides this item.';
  if (t === 'Discontinue enrolment — non-payment') return isFin() || isSys() ? '' : 'A Finance Admin or System Administrator decides this item.';
  if (AC_SA_ONLY.includes(t)) return 'The Super Administrator decides this item.';
  return '';
}
const acGated = i => !!i && !FI_TYPES.includes(i.type) && !['Programme payment terms', 'Discount rate change'].includes(i.type); // their own gates: FI-1, E1, S4c (discount.js)
const acNo = (i, action, why) => { w0Deny('Approvals Queue', (i && i.id) || '—', action, why); return false; };
// The item as it stands now, whoever asks: a request-backed item is rebuilt from its request on every read, so a copy held by a
// caller (or an open dialog) can be out of date
const acFind = id => ADMIN.queue.find(x => x.id === id) || derivedQueue().find(x => x.id === id);
const _adAC = applyDecision;
applyDecision = function (i, a) {
  if (!i) return false;
  if (a !== 'note' && acGated(i)) {
    const who = acDeciderWhy(i, a); if (who) return acNo(i, 'decide an approval item', who);
    const cur = acFind(i.id) || i;
    if (!isOpen(cur) && !AC_OVERRIDE) return acNo(i, 'decide an item already decided', `${i.id} is already ${String(cur.status).toLowerCase()}. It can't be decided again — nothing changed.`);
  }
  return _adAC.apply(this, arguments);
};
const _qDoAC = ACT.qDo;
ACT.qDo = el => {
  const id = el && el.dataset && el.dataset.id, i = acFind(id), a = el && el.dataset && el.dataset.a;
  if (i && a !== 'note' && acGated(i)) {
    if (a === 'forward') { if (!(isSys() && i.type === 'Data correction' && isOpen(i) && i.stage !== 'final' && S.portal === 'admin')) return acNo(i, 'forward a Data Correction', 'Only a System Administrator forwards an open Data Correction to the Super Administrator.'); }
    else { const who = acDeciderWhy(i, a); if (who) return acNo(i, 'decide an approval item', who); if (!isOpen(i)) return acNo(i, 'decide an item already decided', `${i.id} is already ${String(i.status).toLowerCase()}. It can't be decided again.`); }
  }
  if (i && !qItem(id)) return acNo(i, 'decide an approval item', 'That item is not in your approvals queue.');
  return _qDoAC(el);
};
// The Super Administrator's override is the one separate path that changes a decided item (its existing effects, applied once)
const _qoAC = ACT.qOverride;
ACT.qOverride = el => {
  const r = _qoAC(el), act = MODAL && MODAL.actions.find(x => /danger|primary/.test(x.cls || ''));
  if (act && !act._ac && isSA()) { const g = act.fn; act._ac = true; act.fn = (...x) => { AC_OVERRIDE = true; try { return g(...x); } finally { AC_OVERRIDE = false; } }; }
  return r;
};

/* ---------- AC-2: actor guards on academic mutations ---------- */
// Release of an Assessor's marking: a Coordinator of the learner's batch (G6.3), or the Super Administrator's own release with a reason
const _rnAC = releaseNow;
releaseNow = function (key, how) {
  const why = how && how.super ? (isSA() ? '' : 'Only the Super Administrator can release feedback without the Coordinator.')
    : S.portal === 'coord' && myRel().some(P => P.key === key) ? '' : 'Feedback is released by an Academic Coordinator of the learner\'s batch.';
  if (why) { w0Deny('Assessment Records', key, 'release feedback to a learner', why); return false; }
  return _rnAC.apply(this, arguments);
};
const _rsAC = ACT.relSuper;
ACT.relSuper = el => (isSA() ? _rsAC(el) : w0Deny('Assessment Records', (el && el.dataset && el.dataset.k) || '—', 'release feedback without the Coordinator', 'Only the Super Administrator can release feedback without the Coordinator.'));
// Batch cancellation: batch administrators only, never after the start; every learner with an account is told, and a learner moved
// to another batch is moved with their cohort place and Coordinator (as Assign / change batch does)
const AC_BATCH_ADMIN = 'Batches are managed by the Super Administrator, Academic Admins and System Administrators.';
const _cbAC = ACT.cancelBatch;
ACT.cancelBatch = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id));
  if (w0BatchAdminWhy()) return w0Deny('Batches', (b && b.code) || '—', 'cancel a batch', AC_BATCH_ADMIN);
  if (!b) { toast('That batch is not available.', 'err'); return; }
  if (chStarted(b) || !['Planned', 'Open'].includes(b.status)) { logA('Batches', `${b.label} (${b.code})`, 'Blocked: cancel batch', b.status, 'No change', 'The batch has started (or is not open)'); toast('Batches can only be cancelled before they start.', 'err'); return; }
  const r = _cbAC(el), act = MODAL && /^Cancel batch/.test(MODAL.title || '') && MODAL.actions.find(x => /danger|primary/.test(x.cls || ''));
  if (act && !act._ac) {
    const g = act.fn; act._ac = true;
    act.fn = (...x) => {
      if (w0BatchAdminWhy()) return w0Deny('Batches', b.code, 'cancel a batch', AC_BATCH_ADMIN);
      if (chStarted(b) || !['Planned', 'Open'].includes(b.status)) { toast('Batches can only be cancelled before they start.', 'err'); return false; }
      const sels = $$('#modal-root .cb-d').map(s => ({ lid: s.dataset.id, to: s.value })), out = g(...x);
      if (out === false || b.status !== 'Cancelled') return out;
      sels.forEach(s => {
        const v = typeof fiWorldKey === 'function' ? fiWorldKey(s.lid) : null; if (!v || s.lid === 'IA-L-31188') return; // world B keeps its own handling
        const w = STORE.worlds[v], alt = ADMIN.batches.find(c => c.code === s.to);
        if (alt) { const k = (alt.roster || []).findIndex(rw => rw[1] === s.lid && rw[2] === 'Moved after cancellation'); if (k >= 0) { alt.roster.splice(k, 1); alt.enrolled = Math.max(0, alt.enrolled - 1); } b.enrolled++; chDoMove(s.lid, b, alt, `Batch ${b.code} cancelled before start`); }
        else { notifyLearner(v, 'Schedule', 'Batch cancelled', `Your batch ${b.label} was cancelled before it started. A refund request for what you paid is with Finance, who will confirm it.`, 'admission'); if (w.admission) w.admission.history.push([`Batch cancelled: ${b.code}`, now().toISOString()]); }
      });
      return out;
    };
  }
  return r;
};
// Batch lifecycle: batch administrators only, and only the next step (Planned → Open → In Progress → Completed → Archived)
const AC_LIFE = { Planned: 'Open', Open: 'In Progress', 'In Progress': 'Completed', Completed: 'Archived' };
const _blAC = ACT.batchLife;
ACT.batchLife = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), to = el && el.dataset && el.dataset.to;
  if (w0BatchAdminWhy()) return w0Deny('Batches', (b && b.code) || '—', 'change a batch\'s status', AC_BATCH_ADMIN);
  if (!b || AC_LIFE[b.status] !== to) { logA('Batches', b ? `${b.label} (${b.code})` : '—', 'Blocked: batch lifecycle', b ? b.status : '—', 'No change', `Not the next step (${b ? b.status : '?'} → ${to || '?'})`); toast('Only the next step of the batch lifecycle can be taken.', 'err'); return; }
  const r = _blAC(el); if (MODAL) s5WrapPrimary(() => (w0BatchAdminWhy() ? AC_BATCH_ADMIN : AC_LIFE[b.status] !== to ? 'The batch status has changed — nothing was done.' : ''));
  return r;
};
// Staff Allocations: batch administrators only; an Assessor is allocated by role in the batch's Assessors panel (CH-17, with P-33)
const _kaAC = ACT.kAlloc;
ACT.kAlloc = (el, e) => {
  if (w0BatchAdminWhy()) return w0Deny('Staff Allocations', '—', 'allocate staff', AC_BATCH_ADMIN);
  const r = _kaAC(el, e);
  if (MODAL) s5WrapPrimary(() => {
    if (w0BatchAdminWhy()) return AC_BATCH_ADMIN;
    const who = mval('#ka-s'), s = ADMIN.staff.find(x => x.name === who);
    if (mval('#ka-k') === 'Batch' && s && s.roles.includes('Assessor')) { fieldErr('#ka-s', 'Assessors are allocated by role (assignments, PD, observations) in Batches → the batch → Staff → Assessors (CH-17), where the Coordinator rule (P-33) applies.'); return true; }
    return '';
  });
  return r;
};
// Upload on a learner's behalf: admissions staff only; an approved document stays valid — the upload is a replacement in review
const _uobAC = ACT.uploadOnBehalf;
ACT.uploadOnBehalf = el => {
  if (!admCanDecide()) return w0Deny('Admissions & Documents', (el && el.dataset && el.dataset.v) || '—', 'upload a document on a learner\'s behalf', 'Documents are uploaded on a learner\'s behalf by the Academic Admin, the Admissions Officer or the System / Super Administrator.');
  const w = el && el.dataset && STORE.worlds[el.dataset.v], d = w && (w.docs || []).find(x => x.id === el.dataset.d);
  if (!d) { toast('That document is not available.', 'err'); return; }
  if (d.replacement) { toast('A replacement for this document is already in review.', 'err'); return; }
  const r = _uobAC(el), act = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!act) return r;
  const g = act.fn;
  act.fn = (...x) => {
    if (!admCanDecide()) return w0Deny('Admissions & Documents', el.dataset.v, 'upload a document on a learner\'s behalf', 'No Admissions & Documents capability.');
    if (d.status !== 'Approved') return g(...x);
    const rsn = mval('#rsn'); if (!rsn) { fieldErr('#rsn', 'Enter a reason'); return false; }
    const f = ($('#ob-f') || {}).files, name = f && f[0] ? f[0].name : 'admin_upload_' + d.id + '.pdf', at = now().toISOString();
    const cv = d.versions.find(v => v[0] === d.file); if (cv) cv[2] = 'Current (valid)'; else d.versions.unshift([d.file || 'document.pdf', d.uploaded || at, 'Current (valid)']);
    d.replacement = { file: name, uploaded: at, by: ADMIN.me.name }; d.repResult = null; d.versions.unshift([name, at, 'Replacement (in review)']);
    logA('Admissions & Documents', VNAME(el.dataset.v) + ' · ' + d.name, 'Replacement uploaded on learner\'s behalf', d.file || '—', name, rsn);
    render(); toast('Uploaded as a replacement — the approved document stays valid until the replacement is reviewed.');
  };
  return r;
};
// Observation confirm / cancel (admin): Academic Admin or Super Administrator; confirm only a proposed observation (workplace route:
// the workplace's permission granted); cancel only one that is proposed or confirmed — never a completed, signed-off one
const _obAC = ACT.obsAdmin;
const acObsWhy = (w, o, to) => to === 'Confirmed' ? (o.status !== 'Proposed' ? 'Only a proposed observation can be confirmed.' : o.locType !== 'office' && w.workplace && w.workplace.perm !== 'Granted' ? 'The workplace has not granted permission for a workplace observation.' : '')
  : to === 'Cancelled' ? (['Proposed', 'Confirmed'].includes(o.status) ? '' : `A ${String(o.status).toLowerCase()} observation can't be cancelled.`) : 'Unknown action.';
ACT.obsAdmin = el => {
  if (!(S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca())))) return w0Deny('Observations', (el && el.dataset && el.dataset.id) || '—', 'confirm or cancel an observation', 'Observations are confirmed or cancelled by an Academic Admin or the Super Administrator.');
  const w = el && el.dataset && STORE.worlds[el.dataset.v], o = w && (w.observations || []).find(x => x.id === el.dataset.id), to = el && el.dataset && el.dataset.a;
  if (!o) { toast('That observation is not available.', 'err'); return; }
  const why = acObsWhy(w, o, to); if (why) { logA('Observations', VNAME(el.dataset.v), 'Blocked: observation ' + String(to).toLowerCase(), o.status, 'No change', why); toast(why, 'err'); return; }
  const r = _obAC(el); if (MODAL) s5WrapPrimary(() => acObsWhy(w, o, to)); return r;
};
// Certificates: revoked or re-tried by the Super Administrator (the Certificates register is the Super Administrator's)
const AC_OLD = { tasBatches, tasLearners, chDoMove }; // the rules before AC-1, kept for the AC-1 suite
['revokeCert', 'certRetry'].forEach(n => { const g = AC_OLD[n] = ACT[n]; if (g) ACT[n] = el => (isSA() ? g(el) : w0Deny('Certificates', (el && el.dataset && (el.dataset.k || el.dataset.id)) || '—', n === 'revokeCert' ? 'revoke a certificate' : 'retry certificate generation', 'Certificates are managed by the Super Administrator.')); });

/* ---------- AC-3: staff access from the current allocations ---------- */
const acHolds = (b, name) => (b.teachers || []).includes(name) || CH_AROLES.some(([k]) => chAllocOf(b)[k] === name);
const acOvLids = (b, name) => chCohLids(b).filter(l => ['pd', 'obs'].some(k => (chOvOf(l, k) || {}).name === name));
// A Teacher / Assessor keeps a batch only while they teach it, hold an assessor role on it, or hold a learner override in it
const _tbAC = tasBatches;
tasBatches = function () { const me = TME(); return _tbAC.apply(this, arguments).filter(b => b.short || !me || acHolds(b, me.name) || acOvLids(b, me.name).length); };
// ... and sees that batch's learners only through a batch role; a learner override gives that learner only
const _tlAC = tasLearners;
tasLearners = function () { const me = TME(); return _tlAC.apply(this, arguments).filter(L => L.short || !L.batch || !me || acHolds(L.batch, me.name) || acOvLids(L.batch, me.name).includes(L.lid)); };
// Assign / change batch: the cohort place and Coordinator allocation move with every learner; staff and people re-synced
const acCohLid = e => e.lid || (e.v && STORE.worlds[e.v] && STORE.worlds[e.v].me.id);
const _mvAC = chDoMove;
chDoMove = function (lid, b, nb) {
  const res = _mvAC.apply(this, arguments), w = chWorldByLid(lid), at = now().toISOString();
  if (w) { const e = (b.coh || []).find(x => acCohLid(x) === lid); if (e) { b.coh = b.coh.filter(x => x !== e); (nb.coh = nb.coh || []).push(e); } }
  if (b.mcA && b.mcA[lid]) { (b.mcH = b.mcH || []).push({ lid, from: b.mcA[lid].to, to: null, at, by: ADMIN.me.name, reason: 'Moved to ' + nb.code, kind: 'moved' }); delete b.mcA[lid]; }
  [b, nb].forEach(x => { if (typeof mcSync === 'function') mcSync(x); chSyncAssessors(x); });
  if (w && typeof mcPeopleSync === 'function') mcPeopleSync(w);
  syncTasBatches();
  return res;
};

UXC.push(['AC-1', 'Academic integrity and authorization (31 Oct 2026)', [
  'Approvals: every academic, admissions, Data Correction and office-observation decision is checked in the decision itself — the approver for that item and stage, and the item still open. A decided item can\'t be decided again; only the Super Administrator\'s override changes it. Refusals are logged.',
  'Marking is released only by a Coordinator of the learner\'s batch (or the Super Administrator with a reason). Batch cancellation and status changes, staff allocation, uploads on a learner\'s behalf, observation confirm / cancel and certificate revoke / retry are refused to anyone else.',
  'A Teacher or Assessor sees a batch only while they teach it or hold an assessor role on it; a learner override shows that learner only. Changing a learner\'s batch moves their place and Coordinator with them.',
  'A learner on two programmes that share assignment IDs keeps separate assessment records for each programme.']]);
