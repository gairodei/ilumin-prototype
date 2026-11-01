/* ============================================================
   Batch AC-2 — academic admission and approval integrity (1 Nov 2026; PD-AC2-* in PROVISIONAL-DECISIONS.md). Loads last.
   The High items of the Academic Admin audit that AC-1 left open:
   - B1-D1  an admission is approved only when every mandatory item of the learner's own checklist (programme, region and version
            fixed at sign-up) is approved and current (admDocsWhy, admin-a.js). Optional items never block.
   - B1-D2  admission and document decisions follow their workflow, checked in the decision itself: the decider (admissions staff in
            the admin portal), the record re-read when the decision is made (a dialog or a copy can be stale), a valid transition,
            effects once. Invalid IDs fail safely.
   - B1-D8  the demo shortcuts that approved documents, admissions and requests use the real handlers and the authority of the
            identity acting now; a learner, agency or other role is refused. The demo buttons switch to the Academic Admin instead.
   - B2-D10 / B3-02  every audit row names the identity actually acting (the admin identity stays loaded while someone views another
            portal); automatic processes are recorded as the system.
   - B4-D6  the Super Administrator's override applies a defined effect once, or is refused with the reason; it never changes only
            the label.
   AC-1's gate (ac-integrity.js) is reused, not replaced. No admission, access, assessment or finance policy is added; financial seat
   security is separate from admission (unchanged). The Admissions Team gate stays on hold.
   ============================================================ */
'use strict';

/* ---------- B2-D10 / B3-02: who acted ---------- */
// Every audit row named ADMIN.me, which stays loaded while someone views the learner, Coordinator, staff or agency portal. A row now
// names the identity acting in the current portal (w0Who, W0); a row written by an automatic process names the system.
let AC2_SYS = 0;
const AC2_SYSTEM = { name: 'System (automatic)', roles: ['System'] };
const ac2Who = () => (AC2_SYS ? AC2_SYSTEM : w0Who());
const ac2As = f => { const me = ADMIN.me, who = ac2Who(); if (who === me) return f(); ADMIN.me = { ...me, name: who.name, roles: who.roles }; try { return f(); } finally { ADMIN.me = me; } };
const ac2System = g => function () { AC2_SYS++; try { return g.apply(this, arguments); } finally { AC2_SYS--; } };
const _logAAC2 = logA;
logA = function () { const a = arguments; return ac2As(() => _logAAC2.apply(this, a)); };
// Teacher / Assessor rows named the staff persona loaded (TME) even when the action ran elsewhere — a Coordinator's release of
// marking was recorded as "Feedback released" by the Assessor (B3-02). Outside the staff portal they now name who acted.
const _tlAC2 = tasLog;
tasLog = function () { return S.portal === 'staff' && !AC2_SYS ? _tlAC2.apply(this, arguments) : logA.apply(this, arguments); };
// Automatic processes: the seat-hold check (P-32) and issuing published assignments to a learner who joined later (PD-F-01)
dpReconcile = ac2System(dpReconcile);
fAsgReconcile = ac2System(fAsgReconcile);

/* ---------- B1-D1 / B1-D2: admission and document decisions ---------- */
const AC2_OPEN = ['Awaiting review', 'Under Review', 'Pending — Documents Required'];
const AC2_DOC_TO = ['Approved', 'Rejected', 'Resubmission Required'];
const AC2_ADM_WHY = 'Admission decisions are made by the Academic Admin, the Admissions Officer or the System / Super Administrator.';
const ac2App = id => (id ? allApplications().find(x => x.id === id) : null);
const ac2W = v => (v && STORE.worlds[v]) || null;
// An application can be decided while it is open; approval also needs the mandatory documents (B1-D1)
function ac2AppWhy(a, act) {
  if (!a) return 'That application is not available.';
  if (!AC2_OPEN.includes(a.status)) return a.status === 'Sign-up in progress' ? 'The application is reviewed after the learner has finished sign-up — nothing changed.' : `This application is already ${String(a.status).toLowerCase()}. A decided application isn't decided again — nothing changed.`;
  return act === 'approve' ? admDocsWhy(a.docs) : '';
}
// A document is decided while it is submitted for review, or while a replacement for it is in review. An approved document is not
// re-decided; a rejected or sent-back one is reviewed again only after a new upload (B1-D6 too); a missing one has nothing to review.
function ac2DocWhy(d, to) {
  if (!d) return 'That document is not available.';
  if (!AC2_DOC_TO.includes(to)) return `"${to}" is not a document decision.`;
  if (d.replacement || (d.status === 'Submitted' && d.file)) return '';
  return d.status === 'Approved' ? `${d.name} is already approved. A new upload is reviewed as a replacement — nothing changed.`
    : ['Rejected', 'Resubmission Required'].includes(d.status) ? `${d.name} was ${d.status === 'Rejected' ? 'rejected' : 'sent back for resubmission'}. It is reviewed again only after a new file is uploaded — nothing changed.`
    : `${d.name} hasn't been uploaded — there is nothing to review.`;
}
// Re-check when a dialog's primary (or danger) action is confirmed: the identity, portal or record may have changed meanwhile
const ac2OnConfirm = (check, after) => {
  const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn || a._ac2) return; const g = a.fn; a._ac2 = true;
  a.fn = (...x) => { if (check() === false) return false; const out = g(...x); if (out !== false && after) after(); return out; };
};
const ac2Stamp = v => { const w = ac2W(v); if (w && w.admission) w.admission._by = ac2Who().name; };

// The shared effects refuse too, whoever calls them (they used to trust their callers)
const _apAC2 = admissionApprove;
admissionApprove = function (v) {
  const id = 'APP-' + v, why = !admCanDecide() ? AC2_ADM_WHY : ac2AppWhy(ac2App(id), 'approve');
  if (why) return w0Deny('Admissions', id, 'approve an admission', why);
  return _apAC2.apply(this, arguments);
};
const _ddAC2 = docDecision;
docDecision = function (v, d, status, r) {
  const w = ac2W(v), live = w ? (w.docs || []).find(x => d && x.id === d.id) : d; // a held copy of the document may be out of date
  const why = !admCanDecide() ? AC2_ADM_WHY : ac2DocWhy(live, status);
  if (why) return w0Deny('Admissions & Documents', `${w ? VNAME(v) : '—'} · ${(d && d.name) || '—'}`, 'decide a document', why);
  return _ddAC2.call(this, v, live, status, r);
};

// Admissions & Documents screen: refused before a dialog opens, and again when it is confirmed
const _docDecAC2 = ACT.docDec;
ACT.docDec = el => {
  const ds = (el && el.dataset) || {}, ent = `${ds.a || '—'} · ${ds.d || '—'}`;
  const chk = () => {
    if (!admCanDecide()) return w0Deny('Admissions & Documents', ent, 'decide a document', AC2_ADM_WHY);
    const a = ac2App(ds.a), d = a && (a.docs || []).find(x => x.id === ds.d), why = a ? ac2DocWhy(d, ds.s) : 'That application is not available.';
    return why ? w0Deny('Admissions & Documents', d ? `${a.name} · ${d.name}` : ent, 'decide a document', why) : true;
  };
  if (chk() === false) return false;
  const m0 = MODAL, r = _docDecAC2(el); if (MODAL && MODAL !== m0) ac2OnConfirm(chk); return r;
};
[['appApprove', 'approve', 'approve an admission'], ['appReject', 'reject', 'reject an application'], ['appWithdraw', 'withdraw', 'withdraw an application']].forEach(([n, act, label]) => {
  const g = ACT[n]; if (!g) return;
  ACT[n] = el => {
    const id = el && el.dataset && el.dataset.id;
    const chk = () => { if (!admCanDecide()) return w0Deny('Admissions', id || '—', label, AC2_ADM_WHY); const why = ac2AppWhy(ac2App(id), act); return why ? w0Deny('Admissions', id || '—', label, why) : true; };
    if (chk() === false) return false;
    const m0 = MODAL, r = g(el);
    if (MODAL && MODAL !== m0) ac2OnConfirm(chk, () => { const a = ac2App(id); if (a && a.v) ac2Stamp(a.v); else if (a) ac2QueueFollow(a, act); });
    return r;
  };
});
// A seeded application's queue item (AQ-1001 → APP-2207) follows the decision made on the application, once
function ac2QueueFollow(a, act) {
  const i = (ADMIN.queue || []).find(x => x.type === 'Admission application' && x.related && x.related[1] === 'a-admissions.' + a.id && isOpen(x)); if (!i) return;
  const at = now().toISOString(), who = ac2Who();
  i.status = act === 'approve' ? 'Approved' : act === 'reject' ? 'Rejected' : 'Cancelled'; i.decidedBy = who.name; i.decision = `Decided on the application (${a.id}): ${i.status === 'Cancelled' ? 'withdrawn' : i.status.toLowerCase()}`;
  i.history.push([who.name, at, 'Application ' + (act === 'withdraw' ? 'withdrawn' : act === 'approve' ? 'approved' : 'rejected'), a.id]);
}

// Approvals Queue: an admission or document item is decided on the record as it stands now (AC-1 checks the decider first)
const AC2_ADM_ACT = { approve: 'approve', reject: 'reject', return: 'return', info: 'return' };
const _adAC2 = applyDecision;
applyDecision = function (i, a) {
  if (!i) return false;
  if (a !== 'note' && !AC_OVERRIDE && !(acGated(i) && acDeciderWhy(i, a))) {
    if (i.type === 'Admission application' && !i.adm) return w0Deny('Approvals Queue', i.id, 'decide an admission in the queue', `Decide this admission on its application (${String((i.related || [])[1] || '').replace('a-admissions.', '') || 'Admissions & Documents'}). The queue item follows that decision.`);
    if (i.adm && AC2_ADM_ACT[a]) { const why = ac2AppWhy(ac2App('APP-' + i.v), AC2_ADM_ACT[a]); if (why) return w0Deny('Approvals Queue', i.id, 'decide an admission', why); }
    if (i.doc) {
      const w = ac2W(i.v), d = w && (w.docs || []).find(x => x.id === i.doc.id), why = ac2DocWhy(d, a === 'approve' ? 'Approved' : a === 'reject' ? 'Rejected' : 'Resubmission Required');
      if (why) return w0Deny('Approvals Queue', i.id, 'decide a document', why);
      i.doc = d;
    }
  }
  // A Coordinator decides an office observation request in the Coordinator portal: the decision, its history and notices name them
  const self = this, args = arguments, run = () => _adAC2.apply(self, args);
  return S.portal === 'admin' ? run() : w0As(run);
};
// The decision dialog: an unknown item fails safely (it threw); a seeded admission item is decided on its application
const _qDoAC2 = ACT.qDo;
ACT.qDo = el => {
  const id = el && el.dataset && el.dataset.id, i = id && acFind(id), a = el && el.dataset && el.dataset.a;
  if (!i) { toast('That item is not available.', 'err'); return false; }
  if (a !== 'note' && i.type === 'Admission application' && !i.adm && !(acGated(i) && acDeciderWhy(i, a))) return applyDecision(i, a);
  return _qDoAC2(el);
};
// The queue names who actually decided a learner's request or admission (it named the assigned reviewer, or "Rachel Hughes")
const _dqAC2 = derivedQueue;
derivedQueue = function () {
  const out = _dqAC2.apply(this, arguments);
  out.forEach(i => {
    const src = i.req || (i.adm && ac2W(i.v) && ac2W(i.v).admission); if (!src || isOpen(i)) return;
    const h = src._hist && src._hist[src._hist.length - 1], by = src._by || (h && h[0]); if (by) i.decidedBy = by;
    if (i.req && i.req._override && i.req._override.was) i.decision = i.req._override.was; // the original decision, shown struck through
  });
  return out;
};

/* ---------- B1-D8: demo shortcuts ---------- */
// They approved every mandatory document (inventing a file) and the admission of the learner viewing the panel, with no audit row.
// They now use the real decisions, so only admissions staff in the admin portal can use them. The demo buttons switch to the
// Academic Admin and open the real record instead.
const AC2_HOOK = 'Documents and admissions are decided by admissions staff in Admissions & Documents. In the demo, use "Review … as the Academic Admin".';
const AC2_OLD = { approveAllDocs: ACT.approveAllDocs, approveAdmission: ACT.approveAdmission, simGrant: ACT.simGrant, agySimReject: ACT.agySimReject }; // kept for the AC-2 suite
ACT.approveAllDocs = () => {
  const v = S.variant, w = ac2W(v); if (!admCanDecide()) return w0Deny('Admissions & Documents', w ? VNAME(v) : '—', 'approve documents (demo shortcut)', AC2_HOOK);
  if (!w || !w.docs) { toast('This learner has no admission documents.', 'info'); return; }
  const todo = w.docs.filter(d => d.mand && !ac2DocWhy(d, 'Approved')); todo.forEach(d => docDecision(v, d, 'Approved', 'Checked against guidance (demo shortcut)'));
  const left = w.docs.filter(d => d.mand && d.status !== 'Approved').length;
  render(); toast(`${todo.length} submitted mandatory document${todo.length === 1 ? '' : 's'} approved.${left ? ` ${left} not uploaded yet — nothing to review.` : ''}`, 'info');
};
ACT.approveAdmission = () => {
  const v = S.variant, w = ac2W(v); if (!admCanDecide()) return w0Deny('Admissions', w ? VNAME(v) : '—', 'approve an admission (demo shortcut)', AC2_HOOK);
  if (admissionApprove(v, 'Approved (demo shortcut)') === false) return false; ac2Stamp(v); render(); toast('Admission approved.');
};
// The learner's "Prototype: Academy grants +14 days" granted their own request
ACT.simGrant = el => {
  const v = S.variant, i = el && el.dataset && qItem('AQ-' + el.dataset.r + (v === 'A' ? '' : '-' + v));
  if (!(S.portal === 'admin' && (isSA() || isAca()))) return w0Deny('Approvals Queue', (i && i.id) || '—', 'grant more time (demo shortcut)', 'More time on a course is decided by an Academic Admin in the Approvals Queue.');
  if (!i) { toast('That request is not available.', 'err'); return false; }
  const out = applyDecision(i, 'extend', 'Granted (demo shortcut)', { days: 14 }); render(); return out;
};
// The agency portal's "Simulate admission rejected" made an academic decision for the agency
ACT.agySimReject = () => (admCanDecide() ? AC2_OLD.agySimReject() : w0Deny('Admissions', '—', 'reject an admission (demo shortcut)', 'An agency can\'t decide an admission. Admissions staff decide it on the application (the seat returns to the bundle when an agency learner\'s admission is rejected).'));
// Demo: switch to the Academic Admin and open the real record (the same switch as the demo identity chooser)
ACT.ac2ReviewAsAca = el => {
  const ds = (el && el.dataset) || {}, v = S.variant, id = ds.q ? 'AQ-' + ds.q + (v === 'A' ? '' : '-' + v) : ds.id;
  closeModal(); S.demoOpen = false; if (S.signedIn) signOut();
  ACT.demoSignInAsAca({ dataset: { v: 'KA' } }); if (id) go(ds.r || 'a-admissions', { id });
};
ACT.ac2AgyReview = () => {
  const ap = allApplications().find(x => x.agySeat && AC2_OPEN.includes(x.status) && (STORE.agy.assign.find(s => s.id === x.agySeat) || {}).agency === AGN());
  if (!ap) { toast('No NVQ admission in progress for this agency.', 'info'); return; }
  ACT.ac2ReviewAsAca({ dataset: { r: 'a-admissions', id: ap.id } });
};

/* ---------- B4-D6: the Super Administrator's override ---------- */
// The override used to set the label of anything that wasn't a learner request, and to "reverse" a request without undoing its
// effect. It now applies a defined effect once, or is refused with the reason. Defined: a REJECTED learner request (extra quiz
// attempts, more time on a short course, a profile change) overridden to Approved runs that request's normal approval once —
// "the Super Admin can override anything" (rule 2 of Who approves what) with the request's own approval effect. Refunds keep FI-2's
// rule (pay once; never take paid money back) and payment terms keep E1's refusal. Everything else is refused (PD-AC2-06).
const AC2_OV_FWD = { 'Extra quiz attempts': 'grant', 'More time on short course': 'extend', 'Learner profile change': 'approve' };
const AC2_OV_FIN = 'This decision has financial or agency consequences. An override never applies or reverses them — no override effect is defined, so the decision stands. Use the item\'s own process (client question).';
const AC2_OV_WHY = {
  'Admission application': 'An admission is decided on its application in Admissions & Documents. A decided admission is not reopened or reversed by an override — no such process is defined (client question).',
  'Replace / re-upload document': 'A decided document is not re-decided. A new upload is reviewed as a replacement.',
  'Data correction': 'A Data Correction changes the record once (and may re-issue a certificate or change a published outcome). An override can neither undo nor repeat that — raise a new Data Correction.',
  'Resubmission limit reached': 'An override would have to choose an exceptional resubmission, a new deadline, or no further resubmission (and perhaps a discontinuation), or undo one already granted. No override effect is defined (client question).',
  'Discontinue enrolment — academic': 'An override would discontinue or reactivate the enrolment. That is not defined for an override (client question). A discontinued learner is reactivated through a "Reactivate enrolment — academic" request.',
  'Reactivate enrolment — academic': 'An override would reactivate or discontinue the enrolment. That is not defined for an override (client question); a new request is decided instead.',
  [CH_OR_T]: 'Whether an override books or cancels an Academy-office observation is not defined (client question). The learner raises a new request.',
  'Link existing learner to agency': 'Linking a learner to an agency changes who sponsors and pays. No override effect is defined, so the decision stands (client question).',
  'Office location change': 'An office location decision is not overridden — no override effect is defined. Raise a new change.',
  'Agency invoice (offline) purchase': AC2_OV_FIN, [CH_VAT_T]: AC2_OV_FIN, [CH_WV_T]: AC2_OV_FIN, 'Bundle price below minimum': AC2_OV_FIN, 'Discount rate change': AC2_OV_FIN, 'Bank details change': AC2_OV_FIN,
};
const AC2_OV_GEN = 'No override effect is defined for this item type, so the decision stands — nothing changed.';
const ac2OvOwn = i => !!i && (i.type === 'Refund' || i.type === E1_T); // FI-2 (H-1) and E1 keep their own override rules
function ac2OvWhy(i, to) {
  if (!i) return 'That item is not available.';
  if (isOpen(i)) return `${i.id} is still open — it is decided, not overridden.`;
  if (!AC2_OV_FWD[i.type] || !i.req) return AC2_OV_WHY[i.type] || AC2_OV_GEN;
  if (i.status === 'Approved') return `${i.id} was approved and its effect applied (${i.req.grant || i.req.decision || 'granted'}). Reversing it is not a defined action — nothing changed.`;
  if (i.status !== 'Rejected') return `${i.id} is ${String(i.status).toLowerCase()}. Only a rejected request can be overridden (to Approved).`;
  if (to && to !== 'Approved') return 'A rejected request can only be overridden to Approved (its normal approval). Reopening it is not a defined action.';
  const w = ac2W(i.v); if (!w) return 'The learner\'s record is not available — nothing changed.';
  const t = AC2_OV_FWD[i.type];
  if (t === 'grant' && !shReqMod(w, i.req)) return 'The quiz this request is about is no longer available — nothing changed.';
  if (t === 'extend' && !w.enrolments.some(e => e.title === i.req.target)) return 'The course this request is about is no longer available — nothing changed.';
  if (t === 'approve' && !['Address', 'Mobile', 'Postcode', 'Email'].includes(i.req.target)) return `Approving a "${i.req.target}" change doesn't update the learner's record (only address, mobile, postcode and email changes do), so an override would change the label only — nothing changed. Use a Data Correction.`;
  if (t === 'approve' && !(i.req.proposed || (w.profilePending || {})[i.req.target])) return 'The proposed value of this profile change is no longer recorded, so it can\'t be applied — nothing changed. The learner raises a new request.';
  return '';
}
const ac2OvNo = (i, why) => { logA('Approvals Queue', (i && i.id) || '—', 'Blocked: override decision', (i && i.status) || '—', 'No change', why); toast(why, 'err'); return false; };
const _qoAC2 = ACT.qOverride;
ACT.qOverride = el => {
  const id = el && el.dataset && el.dataset.id, i = id && acFind(id);
  if (!isSA()) return w0Deny('Approvals Queue', id || '—', 'override a decision', 'Only the Super Administrator can override a decision.');
  if (ac2OvOwn(i)) return _qoAC2(el);
  const why = ac2OvWhy(i); if (why) return ac2OvNo(i, why);
  // The original decision: kept as the struck-through decision and, for a seeded decision without its own history row, as a row
  const from = i.status, was = i.req.decision, prior = !i.req._hist && i.history.find(h => h[2] !== 'Raised'), m0 = MODAL, r = _qoAC2(el); if (!MODAL || MODAL === m0) return r;
  MODAL.body = MODAL.body.replace(/<option>(Rejected|Returned to Requester)<\/option>/g, '').replace('<div class="note b-amber">', `<p class="small ac2-ov">Applies the request's normal approval once (${esc({ grant: 'the quiz\'s extra attempts', extend: 'more time on the course (+14 days, the decision dialog\'s default)', approve: 'the proposed profile value' }[AC2_OV_FWD[i.type]])}). The original decision stays in the history.</p><div class="note b-amber">`); renderModal();
  ac2OnConfirm(() => {
    if (!isSA()) return w0Deny('Approvals Queue', id, 'override a decision', 'Only the Super Administrator can override a decision.');
    const cur = acFind(id), to = ($('#modal-root #ovr') || {}).value || 'Approved';
    const w2 = !cur ? 'That item is not available.' : cur.status !== from ? `${id} changed since this dialog opened (now ${String(cur.status).toLowerCase()}) — nothing changed.` : ac2OvWhy(cur, to);
    return w2 ? ac2OvNo(cur || i, w2) : true;
  }, () => { const rq = (acFind(id) || i).req; if (!rq || !rq._override || rq._override.was) return; rq._override.was = was; if (prior && rq._hist) rq._hist.unshift(prior.slice()); });
  return r;
};
// The decided item's screen says why there is no override, instead of offering one that would change only the label
const _sqAC2 = SCREENS['a-queue'];
SCREENS['a-queue'] = function (p) {
  let h = _sqAC2.apply(this, arguments); const i = p && p.id && typeof h === 'string' ? acFind(p.id) : null; if (!i) return h;
  if (/data-act="qOverride"/.test(h) && !ac2OvOwn(i)) { const why = ac2OvWhy(i); h = h.replace(/<div class="row"><button class="btn" data-act="qOverride"[^]*?<\/span><\/div>/, why ? `<div class="note b-grey ac2-ovn" role="note">${ic('lock')}<div class="small"><strong>Override not available.</strong> ${esc(why)} The decision and its effects stand.</div></div>` : m => m.replace('mandatory reason', 'mandatory reason · applies the normal approval once')); }
  if (i.type === 'Admission application' && !i.adm && isOpen(i)) h = h.replace(new RegExp(`<button class="btn[^"]*" data-act="qDo" data-id="${i.id}" data-a="(approve|reject|return|info)"[^>]*>[^<]*</button>`, 'g'), '').replace('Open application</button>', 'Open application</button><span class="xs muted">Decided on the application; this item follows that decision.</span>');
  return h;
};

UXC.push(['AC-2', 'Admission and approval integrity (1 Nov 2026)', [
  'An admission is approved only when every mandatory document of the learner\'s own checklist is approved and current (no replacement awaiting review, not expired). Optional documents never block.',
  'Admission and document decisions are checked when they are made: admissions staff in the admin portal, the application or document still awaiting that decision. A decided application or document isn\'t decided again; a rejected document is reviewed again only after a new upload.',
  'The demo shortcuts that approved a learner\'s own documents, admission or request are refused unless admissions staff use them; the demo buttons switch to the Academic Admin instead.',
  'Audit rows name the person actually acting in each portal; automatic processes are recorded as the system.',
  'The Super Administrator\'s override applies a rejected learner request\'s normal approval once; for every other item it is refused with the reason, and the decision and its effects stand.']]);
