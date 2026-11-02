/* ============================================================
   MR-G1 — admin-console authorisation (multi-role audit, 2 Nov 2026; PD-MR-G1-* in PROVISIONAL-DECISIONS.md).
   Defects MR-06, 07, 08, 09, 10, 20, 21, 25, 31, 33, 37, 45 and the admin-queue part of MR-41.
   Every handler below checks who is acting when it is called (before any dialog opens) and again when its dialog is confirmed
   (the identity or portal may change in between). A refused call changes nothing, is logged as a security event and in the
   audit log under the real actor (w0Deny), and tells the user why. Authorised roles keep their workflows unchanged.
   Rules reuse the ones already in the code: s5AdminWhy (staff accounts), w0EvWhy / s4bSched (schedule), the obsAdmin rule
   (observations), s5bWhy's owners (Business Admin / Super Administrator), PD-AC-12 (certificates: Super Administrator).
   P-07 (who deactivates / archives learners, who reviews security events) is open: the strictest set already holding those
   screens is used — the Super Administrator and System Administrators — and is provisional.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE IT ON THE SERVER.
   Loads last (after ac3-academic.js), so each wrapper here is the outermost one.
   ============================================================ */
'use strict';

/* ---------- Shared helpers ---------- */
const g1Adm = () => S.portal === 'admin' && !!(ADMIN && ADMIN.me) && !(typeof s5Ctx === 'function' && s5Ctx());
const g1SaSys = () => g1Adm() && (isSA() || isSys());
const g1SaAca = () => g1Adm() && (isSA() || (typeof isAca === 'function' && isAca()));
const g1BizSa = () => g1Adm() && ((typeof isBiz === 'function' && isBiz()) || isSA());
const G1_WHY = {
  staff: 'Staff accounts (status, password and 2FA resets, roles) are managed by the Super Administrator and System Administrators in the admin console.',
  learner: 'Learner accounts are deactivated, archived, restored or reset by the Super Administrator and System Administrators.',
  sec: 'Security events are reviewed by the Super Administrator and System Administrators.',
  secSelf: 'This security event records your own attempt, so another administrator reviews it (separation of duties).',
  dsr: 'Only System and Super Administrators act on data requests.',
  obs: 'Observation entries are created by an Academic Admin or the Super Administrator.',
  realloc: 'Learners are re-allocated by an Academic Admin or the Super Administrator.',
  cat: 'The bundle catalogue is managed by the Business Admin and the Super Administrator in the admin console.',
  msg: 'Academy messages with agencies are handled by the Business Admin and the Super Administrator in the admin console.',
  cert: 'Certificates are managed by the Super Administrator.',
  demoBiz: 'This demo control belongs to the Business Admin demo panel (Business Admin or Super Administrator, admin console).',
  demoVis: 'This demo control belongs to the agency demo panel (a signed-in agency) or the Business Admin / Super Administrator.',
  queue: 'Approval decisions are made in the admin console by the approver for that item.',
};
const g1Ds = el => (el && el.dataset) || {};
// Deny when why is non-empty: logged, nothing changes. Returns true when denied.
const g1No = (module, entity, act, why) => { if (!why) return false; w0Deny(module, entity || '—', act, why); return true; };
// A refusal on the record's state (not an authorisation breach): audit row under the real actor, no notification side effects
const g1StLog = (...a) => { const q = typeof FU_QUIET !== 'undefined'; if (q) FU_QUIET++; try { w0Log(...a); } finally { if (q) FU_QUIET--; } };
// Re-check when the dialog the handler opened is confirmed (outermost wrap of its primary / danger action)
const g1OnConfirm = (m0, check) => {
  if (!MODAL || MODAL === m0) return;
  (MODAL.actions || []).forEach(a => { if (a.fn && a.cls && /primary|danger/.test(a.cls) && !a._g1) { const g = a.fn; a._g1 = true; a.fn = (...x) => { if (check()) { closeModal(); return false; } return g(...x); }; } });
};
// Wrap ACT[k]: why() on open and on confirm
function g1Guard(k, module, act, why, ent) {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = function (el, ev) {
    const e = ent ? ent(el) : (g1Ds(el).id || '—');
    if (g1No(module, e, act, why(el))) return false;
    const m0 = MODAL, r = f.apply(this, arguments);
    g1OnConfirm(m0, () => g1No(module, e, act, why(el)));
    return r;
  };
}

/* ---------- MR-06: staff account status, password / 2FA reset, roles (s5AdminWhy: Super Administrator / System Administrator) ---------- */
const g1StaffWhy = () => g1SaSys() ? '' : G1_WHY.staff;
const g1StaffEnt = el => { const s = ADMIN.staff.find(x => x.id === g1Ds(el).id); return s ? s.name : (g1Ds(el).id || '—'); };
g1Guard('staffSt', 'Staff & Users', 'change a staff account status', g1StaffWhy, g1StaffEnt);
g1Guard('staffReset', 'Staff & Users', 'reset a staff password or 2FA', g1StaffWhy, g1StaffEnt);
g1Guard('grantRole', 'Staff & Users', 'grant a staff role', g1StaffWhy, g1StaffEnt);
g1Guard('revokeRole', 'Staff & Users', 'remove a staff role', g1StaffWhy, g1StaffEnt);

/* ---------- MR-21: learner account / record (P-07 provisional: Super Administrator and System Administrators) ---------- */
g1Guard('lAct', 'Learners', 'change a learner account', () => g1SaSys() ? '' : G1_WHY.learner);

/* ---------- MR-25: security events (P-07 provisional) — never by the event's own subject ---------- */
const g1SecSubject = s => {
  if (!s || !ADMIN.me) return false; const d = String(s.detail || ''), actor = d.split(/ attempted| opened | tried to | tried /)[0];
  return (!!ADMIN.me.name && actor.includes(ADMIN.me.name)) || (!!ADMIN.me.email && d.includes(ADMIN.me.email));
};
const _secG1 = ACT.secReview;
ACT.secReview = el => {
  const s = ADMIN.security.find(x => x.id === g1Ds(el).id);
  if (g1No('Audit & Security', g1Ds(el).id, 'mark a security event reviewed', g1SaSys() ? '' : G1_WHY.sec)) return false;
  if (!s) { toast('That security event is not available.', 'err'); return false; }
  if (s.reviewed) { toast(`${s.id} is already reviewed.`, 'info'); return false; }
  if (g1SecSubject(s)) { g1StLog('Audit & Security', s.id, 'Blocked: review own security event', 'Not reviewed', 'No change', G1_WHY.secSelf); toast(G1_WHY.secSelf, 'err'); return false; }
  return _secG1(el);
};
// The Review button isn't offered on the reviewer's own event
const _auditG1 = SCREENS['a-audit'];
SCREENS['a-audit'] = function (p) {
  let h = _auditG1.apply(this, arguments); if (!p || p.tab !== 'security') return h;
  ADMIN.security.filter(s => !s.reviewed && g1SecSubject(s)).forEach(s => { h = h.replace(new RegExp(`<button class="btn btn-sm" data-act="secReview" data-id="${s.id}"[^>]*>[^<]*</button>`), '<span class="xs muted">Your own event — another administrator reviews it</span>'); });
  return h;
};

/* ---------- MR-45: data requests (Super Administrator / System Administrators) ---------- */
['dsrDone', 'dsrArchive', 'dsrExport', 'decideDsr'].forEach(k => g1Guard(k, 'Data Protection & Archive', { dsrDone: 'complete a data request', dsrArchive: 'archive a learner for a data request', dsrExport: 'export a learner\'s data', decideDsr: 'decide a data request' }[k], () => g1SaSys() ? '' : G1_WHY.dsr));

/* ---------- MR-07: "Edit class / session" (w0EvWhy: admin = s4bSched; Coordinator only on own batch; other portals refused) ---------- */
const g1Ev = el => { const b = ADMIN.batches.find(x => x.code === g1Ds(el).b), e = b && batchEvents(b).find(x => x.id === g1Ds(el).id); return { b, e }; };
const g1EvWhy = el => { const { b, e } = g1Ev(el); return S.portal === 'admin' && !(ADMIN && ADMIN.me) ? 'Sign in to the admin console first.' : S.portal === 'coord' ? 'The Coordinator changes dates from the batch timeline.' : w0EvWhy(b, e); };
g1Guard('kEditEv', 'Scheduling', 'change a batch date', g1EvWhy, el => { const { b, e } = g1Ev(el); return b ? `${(e && e.title) || g1Ds(el).id} (${b.code})` : '—'; });

/* ---------- MR-08: create an observation entry (the obsAdmin rule: Academic Admin / Super Administrator) ---------- */
g1Guard('newObs', 'Observations', 'create an observation entry', () => g1SaAca() ? '' : G1_WHY.obs, () => '—');

/* ---------- MR-31: re-allocation wizard — guarded; its audit and message say what it actually changes ---------- */
// The wizard's learners are a fixed demo list. The only data it changes: the learners it can resolve are hidden from the current
// assessor's caseload (tasRealloc). It does not allocate them to the new assessor — the audit and message now say so.
const _kReG1 = ACT.kRealloc;
ACT.kRealloc = function () { if (g1No('Staff Allocations', '—', 're-allocate learners', g1SaAca() ? '' : G1_WHY.realloc)) return false; return _kReG1.apply(this, arguments); };
// Runs a re-allocation confirm (g) and replaces its "Learners re-allocated" audit and toast with what actually changed
function g1ReallocTruth(g, x) {
  const t0 = tasRealloc, l0 = logA, k0 = toast; let call = null, logged = null, toasted = null;
  tasRealloc = (from, names, to) => { const n0 = (STORE.tas.removed[from] || []).length; t0(from, names, to); call = { from, names, to, n: (STORE.tas.removed[from] || []).length - n0 }; };
  logA = function (...z) { if (z[2] === 'Learners re-allocated') { logged = z; return; } return l0.apply(this, z); };
  toast = (msg, tone) => { toasted = [msg, tone]; };
  let res; try { res = g(...x); } finally { tasRealloc = t0; logA = l0; toast = k0; }
  if (!logged) { if (toasted) toast(...toasted); return res; }
  const [mod, ent, , from, to, why] = logged, n = call ? call.n : 0;
  if (n > 0) { logA(mod, ent, 'Learners removed from assessor caseload', from, `${n} removed — not allocated to ${to} (prototype)`, why); toast(`${n} learner(s) removed from ${from}'s caseload. The prototype doesn't allocate them to ${to} — do that on the batch's Staff tab. Historical marking keeps the original assessor.`, 'info'); }
  else { logA(mod, ent, 'Re-allocation recorded — nothing moved', from, to, why); toast(`Nothing moved: these demo learners aren't on ${from}'s caseload in this prototype. Allocate ${to} on the batch's Staff tab.`, 'info'); }
  return res;
}
const _omG1 = openModal;
openModal = function (m) {
  // Staff record → Re-allocate learners: its preview promised that future marking moves to the new assessor; it doesn't
  if (m && m.title === 'Re-allocate learners' && typeof m.body === 'string') m = { ...m, body: m.body.replace('Preview: future marking moves to the new assessor. Historical marking keeps the original assessor.', 'This prototype only removes the selected learners from this assessor\'s caseload. It doesn\'t allocate them to the new assessor: do that on each batch\'s Staff tab. Historical marking keeps the original assessor.') };
  const r = _omG1.call(this, m);
  if (MODAL && MODAL.title === 'Re-allocate learners') {
    const a = (MODAL.actions || []).find(x => x.cls && /primary/.test(x.cls));
    if (a && a.fn && !a._g1) { const g = a.fn; a._g1 = true; a.fn = (...x) => g1ReallocTruth(g, x); }
  }
  if (MODAL && /^Re-allocate learners — step \d of 3/.test(MODAL.title || '')) {
    const a = (MODAL.actions || []).find(x => x.cls && /primary/.test(x.cls)), step3 = /step 3 of 3/.test(MODAL.title);
    if (a && a.fn && !a._g1) { const g = a.fn; a._g1 = true; a.fn = (...x) => {
      if (g1No('Staff Allocations', '—', 're-allocate learners', g1SaAca() ? '' : G1_WHY.realloc)) { closeModal(); return false; }
      if (!step3) return g(...x);
      return g1ReallocTruth(g, x);
    }; }
  }
  return r;
};

/* ---------- MR-09: bundle catalogue (Business Admin / Super Administrator) and the screen's own state rules ---------- */
const g1Prod = el => STORE.biz.products.find(x => x.id === g1Ds(el).id);
const g1ProdEnt = el => { const p = g1Prod(el); return p ? `${p.id} · ${p.name}` : (g1Ds(el).id || '—'); };
const g1CatWhy = () => g1BizSa() ? '' : G1_WHY.cat;
const g1StateNo = (el, act, why) => { g1StLog('Bundles & Licences', g1ProdEnt(el), 'Blocked: ' + act, '—', 'No change', why); toast(why, 'err'); return false; };
// State as the catalogue screen offers it (business.js:399)
const G1_STATE = {
  newBundle: p => !p || !['Retired', 'Pending approval'].includes(p.status) ? '' : `${p.id} is ${p.status.toLowerCase()} and can't be edited.`,
  bPublish: p => !p ? 'That bundle is not available.' : p.status !== 'Draft' ? `${p.id} is ${p.status.toLowerCase()} — only a draft is published.` : '',
  bSubmitFloor: p => !p ? 'That bundle is not available.' : p.status !== 'Draft' ? `${p.id} is ${p.status.toLowerCase()} — only a draft is submitted.` : !priceOf(p).below ? `${p.id} isn't below the minimum price, so it needs no approval.` : ['Approved', 'Pending'].includes((p.floor || {}).state) ? `${p.id}'s below-minimum price is already ${String(p.floor.state).toLowerCase()}.` : '',
  bRetire: p => !p ? 'That bundle is not available.' : p.status !== 'Published' ? `${p.id} is ${p.status.toLowerCase()} — only a published bundle is retired.` : '',
  bDup: p => !p ? 'That bundle is not available.' : '',
};
const G1_CAT_ACT = { newBundle: 'create or edit a bundle', bPublish: 'publish a bundle', bSubmitFloor: 'submit a below-minimum price', bRetire: 'retire a bundle', bDup: 'duplicate a bundle' };
Object.keys(G1_CAT_ACT).forEach(k => {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = function (el) {
    if (g1No('Bundles & Licences', g1ProdEnt(el), G1_CAT_ACT[k], g1CatWhy())) return false;
    const src = k === 'newBundle' && !g1Ds(el).id ? null : g1Prod(el), st = G1_STATE[k](src);
    if (st && !(k === 'newBundle' && !g1Ds(el).id)) return g1StateNo(el, G1_CAT_ACT[k], st);
    const m0 = MODAL, r = f.apply(this, arguments);
    g1OnConfirm(m0, () => g1No('Bundles & Licences', g1ProdEnt(el), G1_CAT_ACT[k], g1CatWhy()) || (k !== 'newBundle' && !!G1_STATE[k](g1Prod(el)) && (g1StateNo(el, G1_CAT_ACT[k], G1_STATE[k](g1Prod(el))), true)));
    return r;
  };
});
// The bundle editor redraws its dialog (pricing mode), so its saves are checked where they happen
const _spG1 = saveProduct;
saveProduct = function (st) {
  if (g1No('Bundles & Licences', (st && st.d && (st.d.id || st.d.name)) || '—', 'save a bundle', g1CatWhy())) { closeModal(); return false; }
  return _spG1.apply(this, arguments);
};

/* ---------- MR-20: Academy messaging with agencies (Business Admin / Super Administrator; the real admin actor) ---------- */
const g1MsgWhy = () => g1BizSa() ? '' : G1_WHY.msg;
const g1Th = el => { const t = ADMIN.threads.find(x => x.id === g1Ds(el).id); return t ? t.subject : (g1Ds(el).id || '—'); };
g1Guard('bThSt', 'Messages', 'change an agency thread status', g1MsgWhy, g1Th);
g1Guard('bNote', 'Messages', 'add an internal note to an agency thread', g1MsgWhy, g1Th);
g1Guard('bFwd', 'Messages', 'forward an agency thread', g1MsgWhy, g1Th);
g1Guard('bNewMsg', 'Messages', 'send an Academy message to an agency', g1MsgWhy, () => '—');
const _brG1 = SUBMIT.bReply;
SUBMIT.bReply = function (f) { if (g1No('Messages', g1Th(f), 'reply to an agency thread as the Academy', g1MsgWhy())) return false; return _brG1.apply(this, arguments); };

/* ---------- MR-10 / MR-33: certificate revocation — Super Administrator only (PD-AC-12); never a second time ---------- */
const g1RevokedNo = (no, why) => { g1StLog('Certificates', no, 'Blocked: revoke a revoked certificate', 'Revoked', 'No change', why); toast(why, 'err'); return false; };
const _agRvG1 = ACT.agRevokeAdm;
ACT.agRevokeAdm = function (el) {
  const no = g1Ds(el).no, c = () => STORE.agy.certs.find(x => x.no === no);
  if (g1No('Certificates', no, 'revoke a certificate', g1Adm() && isSA() ? '' : G1_WHY.cert)) return false;
  if (!c()) { toast('That certificate is not available.', 'err'); return false; }
  if (c().revoked) return g1RevokedNo(no, `${no} is already revoked (${c().revoked}). The original reason and date are kept.`);
  const m0 = MODAL, r = _agRvG1.apply(this, arguments);
  g1OnConfirm(m0, () => g1No('Certificates', no, 'revoke a certificate', g1Adm() && isSA() ? '' : G1_WHY.cert) || (!!c().revoked && (g1RevokedNo(no, `${no} is already revoked. The original reason and date are kept.`), true)));
  return r;
};
const _rvG1 = ACT.revokeCert;
ACT.revokeCert = function (el) {
  const [v, id] = String(g1Ds(el).k || '').split(':'), c = () => STORE.worlds[v] && (STORE.worlds[v].certs || []).find(x => x.id === id);
  if (isSA() && c() && c().status === 'Revoked') return g1RevokedNo(c().no, `${c().no} is already revoked (${c().revoked || 'revoked'}). The original reason and date are kept.`);
  const m0 = MODAL, r = _rvG1.apply(this, arguments);
  g1OnConfirm(m0, () => !!c() && c().status === 'Revoked' && (g1RevokedNo(c().no, `${c().no} is already revoked. The original reason and date are kept.`), true));
  return r;
};

/* ---------- MR-37: Reset demo doesn't make the caller the Super Administrator; demo controls in their own panels ---------- */
const _rsG1 = ACT.resetDemo;
ACT.resetDemo = function () {
  const wasSA = isSA(), r = _rsG1.apply(this, arguments);
  if (!wasSA && S.signedIn && S.portal === 'admin' && isSA()) { signOut(); render(); toast('Demo reset: the starting demo data is loaded. Choose a demo identity to continue.', 'info'); }
  return r;
};
ACT.agyToggleVis = () => {
  const a = S.portal === 'agency' && S.signedIn && S.agy && (S.agy.id || S.agy.v) ? AG() : g1BizSa() ? ADMIN.agencies.find(x => x.id === 'AG-02') : null;
  if (!a) return w0Deny('Agencies', '—', 'use the demo report-visibility control', G1_WHY.demoVis);
  a.vis.assessment = !a.vis.assessment; w0Log('Agencies', a.name, 'Report visibility (demo control)', String(!a.vis.assessment), String(a.vis.assessment), 'assessment'); render();
};
['bSimLink', 'bAdvance'].forEach(k => g1Guard(k, 'Agencies', k === 'bSimLink' ? 'simulate an agency link request (demo)' : 'advance the Business demo clock', () => g1BizSa() ? '' : G1_WHY.demoBiz, () => '—'));

/* ---------- MR-41 (admin queue part): no decision dialog outside the admin console ---------- */
// The Coordinator decides an office observation request in the Coordinator portal (ac-integrity acDeciderWhy); every other
// non-admin portal is refused before any dialog opens. Item-level rules stay with the existing gates.
const _qDoG1 = ACT.qDo;
ACT.qDo = function (el) {
  const id = g1Ds(el).id, i = id && typeof acFind === 'function' ? acFind(id) : null;
  const ok = (S.portal === 'admin' && !!(ADMIN && ADMIN.me)) || (S.portal === 'coord' && i && typeof CH_OR_T !== 'undefined' && i.type === CH_OR_T);
  if (g1No('Approvals Queue', id, 'decide an approval item', ok ? '' : G1_WHY.queue)) return false;
  return _qDoG1.apply(this, arguments);
};
