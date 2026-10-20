/* ============================================================
   W0 — safety and data-integrity prerequisites (Programme Builder & Workflow Restructuring audit, 20 Oct 2026; PD-W0-* in
   PROVISIONAL-DECISIONS.md). Loads last, so each wrapper here is the outermost one.
   1. Authorization: the shared guard() enforces the documented permission of each action (it was disabled); configuration,
      payment-plan builder and learner-contact saves check the role in the action and again when the dialog is confirmed.
      isSA() / isFin() are portal-aware (admin-a.js, finance.js), so the admin identity that stays loaded while someone views
      another portal grants nothing there.
   2. P-33 when a batch Coordinator is assigned or changed; Coordinator scope on timeline edits and "Edit staff".
   3. Separation of duties: the Coordinator who advised an Academy-office observation can't approve or reject it.
   4. Assignment attachments: the file itself (read into session memory), its metadata and an integrity hash are kept with the
      learner, assignment, question and submission round; only the learner and authorised staff can open it; q.attach is enforced.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE IT ON THE SERVER.
   ============================================================ */
'use strict';

/* ---------- Who is acting (the admin identity stays loaded in other portals, so name the real actor) ---------- */
const w0Who = () => S.portal === 'coord' && typeof CME === 'function' ? { name: CME().name, roles: ['Academic Coordinator'] }
  : S.portal === 'staff' && typeof TME === 'function' ? { name: TME().name, roles: TME().roles.slice() }
  : S.portal === 'learner' && W && W.me ? { name: W.me.first + ' ' + W.me.last, roles: ['Learner'] }
  : S.portal === 'agency' && typeof AGN === 'function' ? { name: AGN(), roles: ['Agency Administrator'] }
  : ADMIN.me;
const w0As = f => { const me = ADMIN.me, who = w0Who(); if (who === me) return f(); ADMIN.me = { ...me, name: who.name, roles: who.roles }; try { return f(); } finally { ADMIN.me = me; } };
const w0Log = (module, entity, action, before, after, reason) => w0As(() => logA(module, entity, action, before, after, reason));
function w0Deny(module, entity, act, why) {
  const who = w0Who();
  ADMIN.security.unshift({ id: 'SE-' + (600 + ADMIN.security.length), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope action', detail: `${who.name} (${(who.roles || [])[0] || 'unknown role'}, ${S.portal} portal) attempted "${act}" — ${why}`, reviewed: false });
  w0Log(module, entity || '—', 'Blocked: ' + act.charAt(0).toLowerCase() + act.slice(1), '—', '—', why);
  toast(why + ' This attempt has been logged.', 'err');
  return false;
}
// Re-check when the dialog the action opened is confirmed (the identity or portal may have changed meanwhile)
const w0OnConfirm = check => { if (MODAL) s5WrapPrimary(() => (check() ? true : '')); };

/* ---------- 1. The shared guard: the documented permission of each guarded action ---------- */
const W0_SAVE = { 'Short Courses': () => s1Can(), Assignments: () => s2Can(), Finance: () => finOwner() }; // G5.2: the Finance plan builder is Finance Admin / Super Admin only
const W0_SAVE_WHY = { 'Short Courses': 'Short courses are changed by the Super Administrator, System Administrators and Academic Admins.', Assignments: 'Assignments are changed by the Super Administrator, System Administrators and Academic Admins.', Finance: 'Payment plans are owned by Finance Admins and the Super Administrator (G5.2).' };
const W0_OWNED_CFG = /^Observation fee — /; // CH-38 fee rows: Finance Admin / Super Admin only (G5.2)
function w0CfgWhy(id) {
  const c = (ADMIN.config || []).find(x => x.id === id); if (!c) return 'This setting doesn\'t exist.';
  if (c.fixed) return `${c.name} is fixed (display only).`;
  if (W0_OWNED_CFG.test(c.name) || (typeof S4_CFG !== 'undefined' && c.name === S4_CFG)) return finOwner() ? '' : `${c.name} is changed only by a Finance Admin or the Super Administrator (G5.2).`;
  if (/Bundle minimum price/.test(c.name)) return isSA() ? '' : 'The bundle minimum price is set by the Super Administrator.';
  return isSA() || isSys() ? '' : 'System Configuration is managed by the Super Administrator and System Administrators.';
}
// ctx undefined = the original handler's own call (the wrapper has already checked the specific case)
function w0GuardWhy(act, ctx) {
  if (S.portal !== 'admin' || !ADMIN || !ADMIN.me) return 'This action is only available to authorised staff in the admin console.';
  if (typeof s5Ctx === 'function' && s5Ctx()) return 'This action isn\'t available with custom-role access.';
  if (act === 'Save configuration') {
    if (!ctx) return Object.values(W0_SAVE).some(f => f()) ? '' : 'You don\'t have permission to save this configuration.';
    const f = W0_SAVE[ctx.module]; return !f ? 'This configuration can\'t be saved from here.' : f() ? '' : W0_SAVE_WHY[ctx.module];
  }
  if (act === 'Edit configuration') return !ctx ? (isSA() || isSys() || finOwner() ? '' : 'System Configuration is managed by the Super Administrator and System Administrators.') : w0CfgWhy(ctx.id);
  if (act === 'Edit contact details') return isSA() || isSys() || isAca() ? '' : 'Learner contact details are changed by the Super Administrator, System Administrators and Academic Admins.';
  return 'This action isn\'t permitted.'; // unknown actions fail closed
}
const W0_GUARD_MOD = { 'Save configuration': ctx => (ctx && ctx.module) || 'Configuration', 'Edit configuration': () => 'System Configuration', 'Edit contact details': () => 'Learners' };
guard = function (act, ctx) {
  const why = w0GuardWhy(act, ctx); if (!why) return true;
  w0Deny((W0_GUARD_MOD[act] || (() => 'Access control'))(ctx), ctx && ctx.entity, act, why); return false;
};
const _w0SaveV = ACT.saveVersioned;
ACT.saveVersioned = (el, e) => {
  const ctx = { module: el && el.dataset && el.dataset.m, entity: el && el.dataset && el.dataset.e };
  if (!guard('Save configuration', ctx)) return;
  const r = _w0SaveV(el, e); w0OnConfirm(() => !guard('Save configuration', ctx)); return r;
};
const _w0CfgEdit = ACT.cfgEdit;
// The deposit default / seat hold (s4CfgEdit, G5.2) and bank details (CH-35, chCanCfg) rows keep their own checks and refusal records
const w0CfgOwnCheck = c => !!c && ((typeof S4_CFG !== 'undefined' && c.name === S4_CFG) || c.name === 'Bank details for transfers');
ACT.cfgEdit = (el, e) => {
  const id = el && el.dataset && el.dataset.id, c = (ADMIN.config || []).find(x => x.id === id), ctx = { id, entity: c ? c.name : id };
  if (w0CfgOwnCheck(c)) return _w0CfgEdit(el, e);
  if (!guard('Edit configuration', ctx)) return;
  const r = _w0CfgEdit(el, e); w0OnConfirm(() => !guard('Edit configuration', ctx)); return r;
};
const _w0Contact = SUBMIT.lContact;
SUBMIT.lContact = (f, e) => { const L = typeof learnerById === 'function' ? learnerById(f && f.dataset && f.dataset.id) : null; if (!guard('Edit contact details', { entity: L ? L.id : '—' })) return; return _w0Contact(f, e); };

/* ---------- 2. Batch staff: P-33 when a Coordinator is assigned or changed; Coordinator scope ---------- */
const w0BatchOf = code => (ADMIN.batches || []).find(x => x.code === code);
// P-33: the batch's Coordinator can't be its assignment, PD or observation assessor (batch allocation or a learner override)
const w0P33Why = (b, name) => { if (!b || !name || name === b.coord) return ''; const roles = chRoleOn(b, name); return roles ? `${name} is the ${roles} on ${b.code}, so they can't also be its Academic Coordinator. ${CH_P33}` : ''; };
const w0P33Deny = (b, name, why) => { w0Log('Batches', `${b.label} (${b.code})`, 'Blocked: Coordinator as assessor', b.coord || 'Not assigned', name, why); toast(why, 'err'); return false; };
// Every path that changes the Coordinator ends here (also direct calls and the demo edges)
const _w0ChgCoord = changeCoordinator;
changeCoordinator = function (code, to) { const b = w0BatchOf(code), why = w0P33Why(b, to); if (why) return w0P33Deny(b, to, why); return _w0ChgCoord.apply(this, arguments); };
const w0BatchAdminWhy = () => (typeof s4bCanBatch === 'function' && s4bCanBatch() && !(typeof s5Ctx === 'function' && s5Ctx())) ? '' : 'Batch staff are changed by the Super Administrator, Academic Admins and System Administrators.';
const _w0BatchStaff = ACT.batchStaff;
ACT.batchStaff = (el, e) => {
  const b = w0BatchOf(el && el.dataset && el.dataset.id); if (!b) return;
  let why = w0BatchAdminWhy(); if (why) return w0Deny('Batches', `${b.label} (${b.code})`, 'Change batch staff', why);
  const r = _w0BatchStaff(el, e);
  w0OnConfirm(() => { const w = w0BatchAdminWhy(); if (w) return w0Deny('Batches', `${b.label} (${b.code})`, 'Change batch staff', w) || true; const c = mval('#bs-c'), p = w0P33Why(b, c); if (p) { w0P33Deny(b, c, p); fieldErr('#bs-c', p); return true; } return false; });
  return r;
};
const _w0ChangeCoord = ACT.changeCoord;
ACT.changeCoord = (el, e) => {
  const b = w0BatchOf(el && el.dataset && el.dataset.id); if (!b) return;
  const why = w0BatchAdminWhy(); if (why) return w0Deny('Batches', `${b.label} (${b.code})`, 'Change the Academic Coordinator', why);
  const r = _w0ChangeCoord(el, e);
  w0OnConfirm(() => { const w = w0BatchAdminWhy(); if (w) return w0Deny('Batches', `${b.label} (${b.code})`, 'Change the Academic Coordinator', w) || true; const c = mval('#cc-to'), p = w0P33Why(b, c); if (p) { w0P33Deny(b, c, p); fieldErr('#cc-to', p); return true; } return false; });
  return r;
};
// New-batch wizard, step 2: the default allocation is the first assessor (assignment, PD) and the last (observation) — chAllocOf
const _w0OpenModal = openModal;
openModal = function (m) {
  if (m && m.title === 'Create batch — step 2 of 5') (m.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
    const c = mval('#nb-ac'), as = $$('#modal-root .nb-a:checked').map(i => i.value), code = (mval('#nb-c') || '').toUpperCase() || 'the new batch';
    const held = c ? [[as[0], 'assignment assessor and the PD assessor'], [as[as.length - 1], 'observation assessor']].filter(([n]) => n && n === c).map(([, l]) => l) : [];
    if (held.length) { const why = `${c} would be the ${held.join(' and the ')} of ${code}, so they can't also be its Academic Coordinator. ${CH_P33}`; w0Log('Batches', code, 'Blocked: Coordinator as assessor', '—', c, why); fieldErr('#nb-ac', why); return false; }
    return g(...x); }; } });
  return _w0OpenModal.apply(this, arguments);
};
// "Edit staff" (Coordinator, own batch): the Coordinator slot is fixed — a changed hidden value is refused, not applied
const _w0CooStaff = ACT.cooStaff;
ACT.cooStaff = (el, e) => {
  const b = w0BatchOf(el && el.dataset && el.dataset.id);
  const why = !b ? 'Batch not found.' : S.portal !== 'coord' || !myBatches().some(x => x.code === b.code) ? 'You can only edit staff on your own batch.' : roBatch(b) ? `${b.code} is ${b.status.toLowerCase()} — read-only.` : '';
  if (why) return w0Deny('Batches', b ? `${b.label} (${b.code})` : '—', 'Edit staff', why);
  const r = _w0CooStaff(el, e);
  w0OnConfirm(() => { const c = mval('#bs-c'); if (c !== (b.coord || '')) return w0Deny('Batches', `${b.label} (${b.code})`, 'Change the Academic Coordinator', 'The Academic Coordinator slot is set by the Academic Admin, not from "Edit staff".') || true; if (roBatch(b)) return w0Deny('Batches', `${b.label} (${b.code})`, 'Edit staff', `${b.code} is read-only.`) || true; return false; });
  return r;
};
// Batch timeline edit: a Coordinator only on their own batch while it isn't read-only; in the admin console, the scheduling roles
const w0EvWhy = (b, e) => {
  if (!b || !e) return 'This item isn\'t on the batch timeline.';
  if (S.portal === 'coord') return !myBatches().some(x => x.code === b.code) ? 'You can only change dates on your own batches.' : roBatch(b) ? `${b.code} is ${b.status.toLowerCase()} — read-only.` : e.type === 'pd' ? 'Professional discussions are scheduled by the PD assessor.' : '';
  if (S.portal === 'admin') return typeof s4bSched === 'function' && s4bSched() ? '' : 'Schedule changes are made by the Super Administrator, Academic Admins and System Administrators.';
  return 'Schedule changes aren\'t available in this portal.';
};
const _w0CooEd = ACT.cooEditEv;
ACT.cooEditEv = (el, ev) => {
  const { b, e } = findEv(el && el.dataset && el.dataset.b, el && el.dataset && el.dataset.id), why = w0EvWhy(b, e);
  if (why) return w0Deny('Scheduling', b ? `${(e && e.title) || el.dataset.id} (${b.code})` : '—', 'Change a batch date', why);
  const r = _w0CooEd(el, ev); w0OnConfirm(() => { const w = w0EvWhy(b, e); return w ? w0Deny('Scheduling', `${e.title} (${b.code})`, 'Change a batch date', w) || true : false; }); return r;
};

/* ---------- 3. Academy-office requests: a Coordinator-advised request is decided by an Academic Admin (separation of duties) ---------- */
// CH-37 names two deciders: the batch's Coordinator or the Academic Admin. When the Coordinator advised the office observation (CH-43),
// the request goes to the Academic Admin's queue instead; learner-initiated requests keep the Coordinator route. Escalation unchanged.
const W0_OR_SOD = 'You advised this Academy-office observation, so you can\'t also approve or reject it. An Academic Admin decides it (separation of duties).';
const W0_OR_ACA = 'This Academy-office observation was advised by a Coordinator, so an Academic Admin decides it (separation of duties).';
const w0OrOfItem = i => i && i.type === CH_OR_T ? chOrOf((i.data || {}).req) : null;
const w0OrStarter = r => (r ? r.by : null); // the Coordinator who advised it, or the learner who requested it
// The Academic Admin who receives it: Academic Admin A when Active, else another Active Academic Admin, else the Super Administrator
const w0OrAca = () => { const act = ADMIN.staff.filter(s => s.roles.includes('Academic Admin') && s.status === 'Active').map(s => s.name); return act.includes(ACA_A) ? ACA_A : act[0] || 'Super Administrator'; };
const _w0OrQueue = chOrQueue;
chOrQueue = function (r) {
  if (!r || r.source !== 'coord') return _w0OrQueue.apply(this, arguments); // learner-initiated: the existing route (Coordinator or Academic Admin)
  if (r.qid && ADMIN.queue.some(i => i.id === r.qid)) return; // never a second item (or notification) for the same request
  let n = 9200 + ADMIN.queue.length, id; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const at = chNow(), to = w0OrAca();
  ADMIN.queue.unshift({ id, type: CH_OR_T, raisedBy: r.name, raised: at, status: 'Pending', first: to, related: [`${r.name} · Academy-office observation`, 'a-learner.' + r.lid + '.observations'], notes: [], reason: r.reason, history: [[r.name, at, 'Raised', r.reason], ['System', at, 'Routed to the Academic Admin', `Advised by ${r.by} (Coordinator) — separation of duties`]], data: { req: r.id, lid: r.lid, batch: r.batch, advisedBy: r.by } });
  r.qid = id; r.status = 'Pending approval'; r.routedTo = to; r.history.push(['System', at, 'Sent to the Academic Admin for a decision', to]);
  acaNotify('Academy-office observation to decide', `${id} · ${r.name} (${r.batch}) — advised by ${r.by}`, 'a-queue.' + id, to === 'Super Administrator' ? 'all' : to);
  chCooNotify(r.coord, 'Academy-office observation sent to the Academic Admin', `${r.name} accepted your advice — ${id} is with ${to === 'Super Administrator' ? 'the Super Administrator' : to}.`, 'c-learner.' + r.lid);
  w0As(() => logA('Approvals Queue', id, 'Routed to the Academic Admin', '—', to, `Coordinator-advised Academy-office observation (${r.by}) — separation of duties`));
};
const w0OrCoordWhy = r => !r || r.source !== 'coord' ? '' : w0OrStarter(r) === CME().name ? W0_OR_SOD : W0_OR_ACA;
const _w0OrDecide = ACT.chOrDecide;
ACT.chOrDecide = el => {
  const i = qItem(el.dataset.id), r = w0OrOfItem(i), why = S.portal === 'coord' ? w0OrCoordWhy(r) : '';
  if (why) return w0Deny('Approvals Queue', i.id, 'Decide a Coordinator-advised Academy-office observation', why);
  return _w0OrDecide(el);
};
// In the decision path itself (dialogs, queue buttons, direct calls): the person who started it never decides it, and no Coordinator
// decides a Coordinator-advised request
const _w0Apply = applyDecision;
applyDecision = function (i, a, rsn, o) {
  const r = w0OrOfItem(i);
  if (r && ['approve', 'reject'].includes(a) && (w0OrStarter(r) === ADMIN.me.name || (r.source === 'coord' && (ADMIN.me.roles || []).includes('Academic Coordinator') && !(ADMIN.me.roles || []).includes('Academic Admin')))) {
    logA('Approvals Queue', i.id, 'Blocked: self-approval', i.status, i.status, `${ADMIN.me.name}: ${r.source === 'coord' ? 'Coordinator-advised request — an Academic Admin decides' : 'started this request'} (separation of duties)`);
    toast(r.source === 'coord' ? (w0OrStarter(r) === ADMIN.me.name ? W0_OR_SOD : W0_OR_ACA) : 'You started this request, so someone else decides it.', 'err'); return false;
  }
  return _w0Apply.apply(this, arguments);
};
// What the Coordinator and the learner see: who decides, and the state
const w0OrWith = r => r.routedTo && r.routedTo !== 'Super Administrator' ? 'the Academic Admin (' + esc(r.routedTo) + ')' : 'the Academic Admin';
const _w0OrCard = chOrCoordCard;
chOrCoordCard = function (lid) {
  const h = _w0OrCard.apply(this, arguments), r = chOrs().filter(x => x.lid === lid).slice(-1)[0], i = r && r.qid && qItem(r.qid);
  if (!r || r.source !== 'coord' || !i) return h;
  const note = isOpen(i) && i.status !== 'Escalated' ? `<p class="small w0-or-sod">Pending — with ${w0OrWith(r)} in the Approvals Queue (${esc(i.id)}). ${r.by === CME().name ? 'You advised it, so the Academic Admin decides it, not you' : 'A Coordinator advised it, so the Academic Admin decides it'} (separation of duties).</p>` : '';
  return h.replace(/<div class="row"><button class="btn btn-sm btn-primary" data-act="chOrDecide"[\s\S]*?<\/button><\/div><p class="xs muted">[^<]*<\/p>/, note);
};
const _w0CDash = SCREENS['c-dashboard'];
SCREENS['c-dashboard'] = p => {
  let h = _w0CDash(p);
  chOrs().filter(r => r.source === 'coord' && r.qid).forEach(r => { h = h.replace(new RegExp(`<button class="btn btn-sm btn-primary" data-act="chOrDecide" data-id="${r.qid}" data-a="approve">Approve</button><button class="btn btn-sm btn-danger" data-act="chOrDecide" data-id="${r.qid}" data-a="reject">Reject</button>`), `<span class="xs muted w0-or-sod">With the Academic Admin (${r.qid})</span>`); });
  return h;
};
const _w0OrLearner = chOrLearnerCard;
chOrLearnerCard = function () {
  const h = _w0OrLearner.apply(this, arguments), r = chOrs().filter(x => x.lid === W.me.id).slice(-1)[0];
  return r && r.source === 'coord' && r.status === 'Pending approval' ? h.replace('Waiting for your Coordinator or the Academic Admin.', 'Waiting for the Academic Admin to decide.') : h;
};

// Demo Scenario #7 (CH-43): the Coordinator advised the request, so the approval step is the Academic Admin's (CH-37 names both deciders)
const W0_SC7_OLD = 'The Coordinator approves it on the learner record.';
ACT.w0Sc7Aca = () => { acaEnter('KA'); S.signedIn = true; const r = chOrs().filter(x => x.lid === STORE.worlds.C.me.id && x.source === 'coord' && x.qid).slice(-1)[0]; go('a-queue', r ? { id: r.qid } : {}); toast('Viewing as Rachel Hughes — Academic Admin. The Coordinator who advised the request can\'t also decide it.', 'info'); };
const _w0ScList = SC_LIST;
SC_LIST = function () { return _w0ScList.apply(this, arguments).map(sc => sc[0] !== '7' ? sc : [sc[0], sc[1], sc[2], sc[3].map(x => x.text === W0_SC7_OLD ? { ...x, text: 'An Academic Admin approves it in the Approvals Queue — the Coordinator advised it, so they can\'t also decide it (separation of duties).', act: 'w0Sc7Aca' } : x)].concat(sc.slice(4))); };

/* ---------- 4. Assignment attachments: the file kept with the submission round ---------- */
// Session-memory evidence store; it resets with the demo data (a new STORE.worlds means a reset)
const w0S = () => { if (!STORE.w0 || STORE.w0.worlds !== STORE.worlds) STORE.w0 = { worlds: STORE.worlds, files: {}, n: 0 }; return STORE.w0; };
const w0Rec = id => w0S().files[id] || null;
const W0_ATT_MAX = 5, W0_ATT_BYTES = 10 * 1024 * 1024, W0_ATT_EXT = /\.(pdf|docx|jpe?g|png)$/i; // the limits the answer box already states
const w0Size = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const w0Key = key => { const [aid, qid, n] = String(key || '').split('.'); return { aid, qid, n: +n }; };
// An answer box accepts files only while it is the open box of its question, and only when the question allows attachments
function w0AttachWhy(key) {
  if (S.portal !== 'learner' || !W || !W.assignments) return 'Only the learner can attach files to their answer.';
  const { aid, qid, n } = w0Key(key), a = W.assignments.find(x => x.id === aid), q = a && a.qs.find(x => x.id === qid);
  if (!a || !q) return 'This answer box doesn\'t exist.';
  if (q.attach === false) return 'This question doesn\'t accept attachments.';
  if (W.nvq && W.nvq.status === 'Discontinued') return 'Read-only — this programme has been discontinued.';
  const open = (a.status === 'Not Started' && n === 0 && !a.closed) || (a.status === 'Resubmission Required' && q.state === 'rework' && n === q.rounds.length);
  return open ? '' : 'This answer is submitted and locked — files can\'t be added.';
}
const w0Ids = key => (W.drafts['attid.' + key] = W.drafts['attid.' + key] || []);
const w0Hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
INP.attach = el => {
  const f = el.files && el.files[0], key = el.dataset.key; if (!f) return;
  const why = w0AttachWhy(key); if (why) { toast(why, 'err'); el.value = ''; return; }
  const ids = w0Ids(key);
  const bad = ids.length >= W0_ATT_MAX ? `Up to ${W0_ATT_MAX} files per answer.` : !W0_ATT_EXT.test(f.name) ? `${f.name}: only PDF, DOCX, JPG or PNG files can be attached.` : f.size > W0_ATT_BYTES ? `${f.name} is ${w0Size(f.size)} — files can be up to 10 MB.` : !f.size ? `${f.name} is empty.` : '';
  if (bad) { toast(bad, 'err'); el.value = ''; return; }
  const st = w0S(), { aid, qid, n } = w0Key(key), id = 'ATT-' + String(++st.n).padStart(4, '0');
  const rec = { id, lid: W.me.id, v: W.v, aid, qid, box: n, name: f.name, size: f.size, type: f.type || 'application/octet-stream', at: now().toISOString(), by: W.me.first + ' ' + W.me.last, status: 'Reading', blob: null, sha256: null, round: null, submittedAt: null };
  st.files[id] = rec; ids.push(id); W.drafts['att.' + key] = [...(W.drafts['att.' + key] || []), f.name]; el.value = '';
  render(); doSave();
  // Keep the content itself in session memory (a copy, so a later change to the file on disk can't alter the evidence)
  const done = buf => { rec.blob = new Blob([buf], { type: rec.type }); rec.status = 'Stored'; const fin = h => { rec.sha256 = h; if (S.route === 'assignment') render(); }; try { if (window.crypto && crypto.subtle) crypto.subtle.digest('SHA-256', buf).then(h => fin(w0Hex(h)), () => fin(null)); else fin(null); } catch (x) { fin(null); } };
  const fail = () => { rec.status = 'Failed'; const k = ids.indexOf(id); if (k >= 0) { ids.splice(k, 1); W.drafts['att.' + key].splice(k, 1); } toast(`${f.name} couldn't be read, so it wasn't attached. Try again.`, 'err'); if (S.route === 'assignment') render(); };
  try { (f.arrayBuffer ? f.arrayBuffer() : new Response(f).arrayBuffer()).then(done, fail); } catch (x) { fail(); }
};
// Who may open a stored file: the learner; their batch Coordinator; their allocated assignment assessor; admins with learner records; IQA
function w0AttWhy(rec) {
  if (!rec) return 'This file isn\'t available.';
  if (S.portal === 'learner') return W && W.me && W.me.id === rec.lid ? '' : 'You can only open your own files.';
  if (S.portal === 'coord') return chIsMyBatchLid(rec.lid) ? '' : 'You can only open files of learners in your batches.';
  if (S.portal === 'staff') return chEff(rec.lid, 'asg') === TME().name ? '' : 'Only the learner\'s allocated assignment assessor can open this file.';
  if (S.portal === 'admin') return isSA() || isSys() || isAca() || (typeof isIqa === 'function' && isIqa()) ? '' : 'Your role doesn\'t include learners\' assessment evidence.';
  return 'Not available in this portal.';
}
const w0Chip = id => {
  const r = w0Rec(id); if (!r) return '';
  const st = r.status === 'Stored' ? w0Size(r.size) : r.status === 'Reading' ? 'saving…' : 'not stored';
  return w0AttWhy(r) ? `<span class="attach muted">${ic('lock', 13)}Restricted file</span>` : `<button type="button" class="attach" data-act="w0AttOpen" data-id="${r.id}" aria-label="Open ${esc(r.name)}">${ic('clip2', 13)}${esc(r.name)} <span class="xs muted">· ${st}</span></button>`;
};
// The answer box: the stored files with their status; no Attach button where the question doesn't accept attachments
const _w0Rte = rte;
rte = function (a, q, n, opts = {}) {
  const key = a.id + '.' + q.id + '.' + n, names = W.drafts['att.' + key]; W.drafts['att.' + key] = [];
  let h; try { h = _w0Rte.apply(this, arguments); } finally { if (names) W.drafts['att.' + key] = names; else delete W.drafts['att.' + key]; }
  if (opts.disabled) return h;
  if (q.attach === false) return h.replace(/<div class="row xs"><label class="btn btn-sm"[\s\S]*?<\/label>[\s\S]*?<span class="muted">Up to 5 files · PDF, DOCX, JPG, PNG · 10 MB each<\/span><\/div>/, '<p class="xs muted w0-noatt">This question doesn\'t accept attachments.</p>');
  return h.replace('<span class="muted">Up to 5 files', (W.drafts['attid.' + key] || []).map(w0Chip).join('') + '<span class="muted">Up to 5 files');
};
// Submission: each new round keeps its own files (frozen list); earlier rounds are never touched
const _w0Final = finaliseSubmit;
finaliseSubmit = function (a, resub, at) {
  const boxes = (resub ? a.qs.filter(q => q.state === 'rework') : a.qs).map(q => [q, a.id + '.' + q.id + '.' + (resub ? q.rounds.length : 0)]);
  const r = _w0Final.apply(this, arguments), round = a.round || 'Sub 1';
  boxes.forEach(([q, key]) => {
    const rd = q.rounds[q.rounds.length - 1]; if (!rd || rd.at !== at || rd.att) return;
    const ids = (W.drafts['attid.' + key] || []).filter(id => { const x = w0Rec(id); return x && x.status !== 'Failed'; });
    rd.att = Object.freeze(ids.map(id => { const x = w0Rec(id); x.round = round; x.submittedAt = at; x.status = x.status === 'Stored' ? 'Submitted' : x.status; return Object.freeze({ id, name: x.name, size: x.size, type: x.type }); }));
  });
  return r;
};
// Every view of a round (learner, Coordinator, Assessor) shows that round's own files — or, for rounds submitted before W0, nothing
const _w0Round = roundBlock;
roundBlock = function (q, n, r) {
  const h = _w0Round.apply(this, arguments); if (!r || !Array.isArray(r.att)) return h;
  const mark = '<div class="r-ans">' + r.html + '</div>', k = h.indexOf(mark); if (k < 0) return h;
  const files = r.att.length ? `<div class="row w0-att" aria-label="Files submitted with ${esc(ROUNDNAME(n))}">${r.att.map(x => w0Chip(x.id)).join('')}</div>` : '<span class="xs muted w0-att">No files attached</span>';
  return h.slice(0, k + mark.length) + files + h.slice(k + mark.length);
};
// The invented "Qn_attachment.pdf" / "Qn_evidence.pdf" buttons in staff views are replaced by the real files (shown per round above)
const W0_LEGACY = '<p class="xs muted w0-legacy">No attachment file is stored for this submission — it was recorded before attachments were kept with submissions.</p>';
const w0NoFake = (h, a) => h.replace(/<div class="row"><button class="attach" data-act="viewFile" data-f="Q(\d+)_(?:attachment|evidence)\.pdf">[\s\S]*?<\/button><\/div>/g, (m, k) => { const q = a && a.qs[+k - 1]; return q && q.rounds.length && q.rounds.every(x => Array.isArray(x.att)) ? '' : W0_LEGACY; });
const _w0TMark = SCREENS['t-mark'];
SCREENS['t-mark'] = p => { const h = _w0TMark(p), s = tasSubs(true).find(x => x.key === (p && p.id)); return s ? w0NoFake(h, tasAsg(s)) : h; };
const _w0CSub = SCREENS['c-sub'];
SCREENS['c-sub'] = p => { const h = _w0CSub(p), s = mySubmissions(true).find(x => x.key === (p && p.id)); return s ? w0NoFake(h, synthAsg(s)) : h; };
const _w0AnsRO = answerReadOnly;
answerReadOnly = function (s) { return w0NoFake(_w0AnsRO.apply(this, arguments), s ? synthAsg(s) : null); };
// Opening a file: checked again in the action; staff access is audited
ACT.w0AttOpen = el => {
  const r = w0Rec(el.dataset.id), why = w0AttWhy(r);
  if (why) return w0Deny('Assessment Records', r ? `${r.name} (${r.id})` : el.dataset.id || '—', 'Open an assignment attachment', why);
  if (S.portal !== 'learner') w0Log('Assessment Records', `${r.name} (${r.id})`, 'Attachment opened', '—', '—', `Learner ${r.lid} · ${r.aid} ${r.qid} · ${r.round || 'draft'}`);
  const url = r.blob ? URL.createObjectURL(r.blob) : null;
  openModal({ title: esc(r.name), sub: `${r.round ? esc(r.round) + ' · submitted ' + fdt(r.submittedAt) : 'Draft — not submitted yet'}`, body: `<dl class="kv"><dt>File</dt><dd>${esc(r.name)} · ${esc(r.type)} · ${w0Size(r.size)}</dd><dt>Added</dt><dd>${fdt(r.at)} by ${esc(r.by)}</dd><dt>Question</dt><dd>${esc(r.aid)} · ${esc(r.qid.toUpperCase())}</dd><dt>Integrity (SHA-256)</dt><dd class="mono xs" style="word-break:break-all">${r.sha256 || (r.status === 'Reading' ? 'being calculated…' : 'not available in this browser')}</dd></dl>${url ? `<p><a class="btn btn-sm" href="${url}" download="${esc(r.name)}" target="_blank" rel="noopener">${ic('download', 14)}Open the file</a></p>` : `<div class="note b-amber">${ic('alert')}<div class="small">The file's content isn't available (${r.status === 'Reading' ? 'still being saved' : 'it couldn\'t be read'}).</div></div>`}<p class="xs muted">Prototype: the file is kept in this browser session only and is cleared when the demo data resets or the page reloads.</p>`, actions: [{ label: 'Close', cls: 'btn-primary', fn: () => { if (url) setTimeout(() => URL.revokeObjectURL(url), 60000); } }] });
};

/* ---------- Records ---------- */
UXC.push(['W0', 'Safety and data-integrity prerequisites (20 Oct 2026)', [
  'Authorization: the Super Administrator\'s and Finance Admin\'s authority now applies only in the admin portal. The admin identity stays loaded while someone views the Coordinator, Assessor, learner or agency portals, and previously its rights carried over there (for example, opening the payment-plan editor from the Coordinator portal by a direct call). The shared guard, which was disabled, now enforces each guarded action\'s documented permission: short-course and assignment saves (Super Admin, System Admin, Academic Admin), the Finance plan builder and the observation-fee settings (Finance Admin, Super Admin — G5.2), other System Configuration settings (Super Admin, System Admin) and learner contact details (Super Admin, System Admin, Academic Admin). Each check runs in the action and again when its dialog is confirmed; refusals are logged.',
  'Batch staff: P-33 now applies whenever a batch Coordinator is assigned or changed (Change staff allocations, Change Academic Coordinator, the Create batch wizard and the Coordinator change itself): the person can\'t be the batch\'s assignment, PD or observation assessor. Change staff and Change coordinator are the Super Admin\'s, Academic Admin\'s and System Admin\'s (the roles that reach Batches). A Coordinator\'s "Edit staff" refuses any change to the Coordinator slot, and timeline edits are limited to the Coordinator\'s own batches that aren\'t read-only.',
  'Academy-office observations: when a Coordinator advises an office observation and the learner accepts, the request goes to the Academic Admin\'s Approvals Queue (routed to Academic Admin A, or another Active Academic Admin), with one notification to them and one notice to the Coordinator that it was sent. No Coordinator can approve or reject it — checked in the action and in the decision path. The Coordinator and the learner see "Pending — with the Academic Admin", then Approved or Rejected. Learner-initiated requests keep the Coordinator route. Consent, reason, history, assessor booking and the 7-day escalation are unchanged; no second item is ever created for the same request.',
  'Assignment attachments: a file attached to an answer is kept with it — the content itself (in session memory), name, type, size, time and an SHA-256 integrity hash — and is linked to the learner, assignment, question and submission round. Each round keeps its own files; earlier rounds are never changed. The learner, their batch Coordinator, their allocated assignment assessor, the Super Admin, System Admins, Academic Admins and IQA can open it (staff access is audited); anyone else is refused. The stated limits (5 files, PDF / DOCX / JPG / PNG, 10 MB) are enforced, and a question set to "No attachments" shows no Attach button and refuses files. The invented "Qn_attachment.pdf" buttons in staff views are gone; submissions recorded before W0 say no file is stored.',
  'Checked and not changed: wizard-created programmes already build payment rows from the learner\'s pinned fee option, method and deposit (the suspected checkout defect was not reproduced; regression tests added).',
]]);
const _aIdxW0 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxW0(p) + `<section class="card idx-sec"><h2>W0 — Safety and data-integrity prerequisites</h2><ul class="idx-list">${[
  chIdxLi('System Configuration (observation-fee rows Finance / Super Admin only)', { act: 'aJump', t: 'a-config' }, 'W0 — guarded in the action, not only hidden.'),
  chIdxLi('Batches → Change staff allocations (P-33)', { act: 'aJump', t: 'a-batches' }, 'W0 — a batch\'s assessor can\'t become its Coordinator.')].join('')}</ul></section>`;
