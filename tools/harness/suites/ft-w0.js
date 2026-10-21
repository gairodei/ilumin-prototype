// W0 — safety and data-integrity prerequisites (20 Oct 2026). Authorization (portal-aware Super Admin / Finance authority, the shared
// guard, financial ownership, P-33, Coordinator scope, separation of duties on Academy-office requests), checkout reconciliation
// with the learner's pinned terms, and assignment attachments kept with their submission round. Every action is called directly
// (not only through visible buttons) and every allowed case has its negative.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Attachments are read and hashed asynchronously: wait until none is still being read (no fixed delay — the load on the machine varies)
  const settle = async () => { for (let k = 0; k < 3000 && Object.values(w0S().files).some(r => r.status === 'Reading' || (r.blob && r.sha256 === null)); k++) await wait(10); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  // CB2 (PD-CB-14) supersedes the creation dialog: Course Details of an unsaved course; the observation question is required; "Save and
  // continue" (ACT.cbDetCreate) creates the Draft
  let codeN = 0; // CB2 correction: a course code is required for a new course (unique per test programme)
  const create = (obs = 'no') => { const r = document.querySelector('#np-obs-' + obs); if (r) r.checked = true; const c = document.querySelector('#np-code'); if (c && !c.value) c.value = 'TC' + (++codeN); return ACT.cbDetCreate(); };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'W0 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const admin = av => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => admin('A'), FA = () => admin('FA'), SYS = () => admin('SY');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TAS = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const blockedSince = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action));

  /* ================= 1. Authorization matrix: direct calls in every role / portal context ================= */
  const CTX = [
    ['admin SA+Sys', () => SA()], ['admin SA only', () => admin('B')], ['admin System Admin', () => SYS()], ['admin Academic Admin', () => ACA()],
    ['admin Finance Admin', () => FA()], ['admin Business Admin', () => admin('BA')], ['admin IQA', () => admin('QA')],
    ['coord after SA', () => { SA(); ACT.switchRole({ dataset: { r: 'coord' } }); S.signedIn = true; }],
    ['coord after Finance', () => { FA(); ACT.switchRole({ dataset: { r: 'coord' } }); S.signedIn = true; }],
    ['coord after System Admin', () => { SYS(); ACT.switchRole({ dataset: { r: 'coord' } }); S.signedIn = true; }],
    ['staff after SA', () => { SA(); ACT.switchRole({ dataset: { r: 'staff' } }); S.signedIn = true; }],
    ['learner after SA', () => { SA(); learner('C'); }], ['learner after Finance', () => { FA(); learner('C'); }],
    ['agency after SA', () => { SA(); ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; }],
  ];
  const cfgId = re => (ADMIN.config.find(c => re.test(c.name)) || {}).id;
  const genericCfg = () => (ADMIN.config.find(c => !c.fixed && !/Bundle minimum|Deposit|Observation fee|Bank details/.test(c.name)) || {}).id;
  const foreignEv = () => { const b = ADMIN.batches.find(x => x.code === 'L2DC-MAR26'), e = batchEvents(b).find(x => x.type !== 'pd'); return { b: b.code, id: e.id }; };
  const lc = id => { ['lc-e', 'lc-m', 'lc-a', 'lc-p'].forEach(k => { if (!document.getElementById(k)) { const i = document.createElement('input'); i.id = k; i.className = 'w0-tmp'; i.value = k === 'lc-e' ? 'w0@example.org' : 'x'; document.body.appendChild(i); } }); return { dataset: { id } }; };
  // Allowed contexts by index (0 SA+Sys · 1 SA · 2 Sys · 3 Aca · 4 Fin); every other context must be refused
  const FIN = [0, 1, 4], SACONF = [0, 1, 2], PROG = [0, 1, 2, 3];
  const ACTS = [
    ['payment plan edit (s4PlanEdit)', () => ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }), FIN],
    ['payment plan retire (s4PlanRetire)', () => ACT.s4PlanRetire({ dataset: { p: 'NV-L2' } }), FIN],
    ['deposit default / seat hold (s4CfgEdit)', () => ACT.s4CfgEdit({ dataset: {} }), FIN],
    ['observation-fee setting (cfgEdit CF-OFA, G5.2)', () => ACT.cfgEdit({ dataset: { id: cfgId(/Observation fee — fully assisted/) } }), FIN],
    ['other System Configuration setting (cfgEdit)', () => ACT.cfgEdit({ dataset: { id: genericCfg() } }), SACONF],
    ['Finance plan builder (saveVersioned, Finance)', () => ACT.saveVersioned({ dataset: { e: 'L3 instalment plan', m: 'Finance' } }), FIN],
    ['add a fee option (r1OptAdd)', () => ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }), FIN],
    ['adjust a learner schedule (finAdjust)', () => ACT.finAdjust({ dataset: { v: 'C', e: 'nvq' } }), FIN],
    ['waive an observation fee (chFeeWaive)', () => ACT.chFeeWaive({ dataset: { id: 'OF-101' } }), SACONF],
    ['new NVQ programme (chProgNew)', () => ACT.chProgNew(), PROG],
    ['short-course save (saveVersioned, Short Courses)', () => ACT.saveVersioned({ dataset: { e: ADMIN.courses[0].title, m: 'Short Courses' } }), PROG],
    ['assignment save (saveVersioned, Assignments)', () => ACT.saveVersioned({ dataset: { e: 'W0 assignment', m: 'Assignments' } }), PROG],
    ['learner contact details (SUBMIT.lContact)', () => SUBMIT.lContact(lc(ADMIN.learners[0].id)), PROG, true],
    ['change Academic Coordinator (changeCoord)', () => ACT.changeCoord({ dataset: { id: 'L3AC-NOV26' } }), PROG],
    ['change batch staff (batchStaff)', () => ACT.batchStaff({ dataset: { id: 'L3AC-NOV26' } }), PROG],
    ['change another batch\'s date (cooEditEv)', () => ACT.cooEditEv({ dataset: foreignEv() }), PROG],
  ];
  await T('W0-A authorization matrix (direct calls; every role and portal)', async () => {
    let lt = null; const _t = toast; toast = function (m, k) { lt = [String(m), k || '']; return _t.apply(this, arguments); };
    try {
      for (const [an, af, allow, applies] of ACTS) {
        const bad = [];
        CTX.forEach(([cn, cf], k) => {
          fresh(); cf(); lt = null; const a0 = ADMIN.audit.length, s0 = ADMIN.security.length, e0 = (ADMIN.learners[0].email || '');
          af();
          const refused = !MODAL && ((lt && lt[1] === 'err') || blockedSince(a0)), logged = blockedSince(a0) || ADMIN.security.length > s0;
          const allowed = applies ? !refused && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Contact details updated') : !!MODAL || (an.includes('ch8SavePlan') && !refused) || (an.includes('chProgNew') && !refused && S.route === 'a-programmes' && S.params.id === 'new'); // CB2 (PD-CB-14): New NVQ programme opens the unsaved Course Details page (was a dialog)
          if (allow.includes(k) ? !allowed : !(refused && logged)) bad.push(cn + (allow.includes(k) ? ' (should be allowed)' : ' (should be refused and logged)'));
          closeModal(); document.querySelectorAll('.w0-tmp').forEach(x => x.remove());
        });
        ok(`W0-A ${an}: allowed only for ${allow.map(k => CTX[k][0].replace('admin ', '')).join(', ')} in the admin portal; refused and logged everywhere else`, !bad.length, bad.join('; '));
      }
    } finally { toast = _t; }
  });
  await T('W0-A portal boundaries: the role tests and the guard', async () => {
    fresh(); SA(); ok('W0-A Super Admin in the admin portal: isSA() and finOwner()', isSA() && finOwner());
    ['coord', 'staff', 'learner', 'agency'].forEach(p => { S.portal = p; ok(`W0-A Super Admin identity in the ${p} portal grants nothing (isSA() false, finOwner() false; identity kept for notification routing)`, !isSA() && !finOwner() && isSAMe()); });
    FA(); ok('W0-A Finance Admin in the admin portal: isFin()', !!isFin() && finOwner());
    ['coord', 'staff', 'learner'].forEach(p => { S.portal = p; ok(`W0-A Finance identity in the ${p} portal grants nothing`, !isFin() && !finOwner()); });
    SYS(); ok('W0-A guard: System Admin may save short courses and assignments, not the Finance plan builder (G5.2)', guard('Save configuration', { module: 'Short Courses' }) && guard('Save configuration', { module: 'Assignments' }) && !guard('Save configuration', { module: 'Finance' }));
    ok('W0-A guard fails closed: an unknown action or module is refused', !guard('Something else') && !guard('Save configuration', { module: 'Other' }));
    const s0 = ADMIN.security.length; guard('Save configuration', { module: 'Finance' }); ok('W0-A guard refusals are logged as security events naming the actor, role and portal', ADMIN.security.length === s0 + 1 && /Owen Price \(System Administrator, admin portal\)/.test(ADMIN.security[0].detail));
    FA(); ok('W0-A guard: Finance Admin may edit the observation-fee rows, not other System Configuration settings', guard('Edit configuration', { id: cfgId(/Observation fee — self-paced/) }) && !guard('Edit configuration', { id: genericCfg() }));
  });
  await T('W0-A checks run again when the dialog is confirmed', async () => {
    fresh(); SA(); const c = ADMIN.config.find(x => x.id === genericCfg()), v0 = c.value; ACT.cfgEdit({ dataset: { id: c.id } }); ok('W0-A Super Admin opens a System Configuration edit', !!MODAL);
    S.portal = 'coord'; document.querySelector('#cv').value = 'changed'; const r = reason('W0');
    ok('W0-A (negative) confirmed after switching to the Coordinator portal: refused, logged, value unchanged', r === false && c.value === v0 && /^Blocked/.test(ADMIN.audit[0].action)); closeModal();
    fresh(); SA(); const n0 = ADMIN.courses[0].version; ACT.saveVersioned({ dataset: { e: ADMIN.courses[0].title, m: 'Short Courses' } }); S.portal = 'learner';
    ok('W0-A (negative) a short-course version confirmed from another portal is refused; no version created', reason('W0') === false && ADMIN.courses[0].version === n0); closeModal();
    SA(); ACT.saveVersioned({ dataset: { e: ADMIN.courses[0].title, m: 'Short Courses' } }); ok('W0-A the Super Admin\'s own save in the admin portal still creates the version (D8 unchanged)', reason('W0') !== false && ADMIN.courses[0].version === n0 + 1);
  });
  await T('W0-A existing financial approval and versioning permissions are unchanged', async () => {
    fresh(); SA(); const v0 = s4Plans('NV-L2').length; ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }); fill({ '#pp-n': '4' }); reason('D8 save');
    ok('W0-A Super Admin plan save applies immediately as a new version (D8, G5.2)', s4Plans('NV-L2').length === v0 + 1 && s4PlanCur('NV-L2').inst === 4);
    FA(); ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }); fill({ '#pp-n': '5' }); reason('Finance save'); ok('W0-A Finance Admin plan save: a new version (G5.2)', s4Plans('NV-L2').length === v0 + 2 && s4PlanCur('NV-L2').inst === 5);
    ACA(); const pr = (() => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': 'Level 4 Certificate in W0 Terms', '#np-l': 'Level 4', '#np-r': 'QN 610/7000/4', '#np-d': '12', '#np-du': 'months', '#np-p': '2400' }); create(); return (STORE.chNewProgs || []).slice(-1)[0]; })();
    // CB8 (PD-CB-52) supersedes the E1 proposal form (e1Submit): the creator submits the financial package from Section 5 (cb8Submit); the decision rules are unchanged
    go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); press(); const qid = e1T(pr.id).qid;
    ok('W0-A CR-E1-01: the creator\'s terms go to Finance (Pending)', !!qid && e1T(pr.id).status === 'Pending');
    FA(); ACT.switchRole({ dataset: { r: 'coord' } }); S.signedIn = true; ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('From the wrong portal');
    ok('W0-A (negative) a Finance decision attempted from the Coordinator portal is refused (terms stay Pending)', e1T(pr.id).status === 'Pending'); closeModal();
    FA(); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); reason('Approved in Finance');
    ok('W0-A the Active Finance Admin approves in the admin portal (CR-E1-01 unchanged)', e1T(pr.id).status === 'Approved');
    SA(); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); ok('W0-A (negative) the Super Admin still has no authority over payment terms items (CR-E1-01)', !MODAL || /Finance Admin/.test(mroot().textContent)); closeModal();
  });

  /* ================= 2. P-33 and Coordinator scope ================= */
  const p33Setup = () => { const lk = ADMIN.staff.find(s => s.name === 'Laura Kemp'); if (!lk.roles.includes('Assessor')) lk.roles.push('Assessor'); const b = ADMIN.batches.find(x => x.code === 'L3AC-NOV26'); chAllocOf(b).obs = 'Laura Kemp'; return b; };
  await T('W0-B P-33 when a batch Coordinator is assigned or changed', async () => {
    fresh(); SA(); const b = p33Setup();
    ACT.batchStaff({ dataset: { id: b.code } }); fill({ '#bs-c': 'Laura Kemp' });
    ok('W0-B (negative) Change staff allocations: the batch\'s observation assessor can\'t become its Coordinator (refused, logged, unchanged)', reason('Rebalance') === false && b.coord === 'Dr Helen Carter' && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor' && /observation assessor on L3AC-NOV26/.test(mroot().textContent)); closeModal();
    ACT.changeCoord({ dataset: { id: b.code } }); fill({ '#cc-to': 'Laura Kemp' });
    ok('W0-B (negative) Change Academic Coordinator: refused the same way', reason('Rebalance') === false && b.coord === 'Dr Helen Carter' && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor'); closeModal();
    ok('W0-B (negative) a direct changeCoordinator() call is refused (every path ends there)', changeCoordinator(b.code, 'Laura Kemp', 'Direct') === false && b.coord === 'Dr Helen Carter');
    ACT.changeCoord({ dataset: { id: b.code } }); fill({ '#cc-to': 'Michael Osei' }); reason('Cover');
    ok('W0-B a Coordinator with no assessor role on the batch is accepted and audited', b.coord === 'Michael Osei' && ADMIN.audit[0].action === 'Academic Coordinator changed');
    const lid = chCohLids(ADMIN.batches.find(x => x.code === 'L3AC-JAN26'))[0]; chOvs()[lid] = { pd: { name: 'Laura Kemp', at: now().toISOString(), by: 'W0', reason: 'W0' } };
    ok('W0-B (negative) a learner-level PD override counts too (chRoleOn)', changeCoordinator('L3AC-JAN26', 'Laura Kemp', 'Direct') === false);
  });
  await T('W0-B P-33 in the Create batch wizard', async () => {
    fresh(); SA(); p33Setup(); const st = ADMIN.staff, lk = st.splice(st.findIndex(s => s.name === 'Laura Kemp'), 1)[0]; st.splice(st.findIndex(s => s.name === 'Sarah Okonkwo') + 1, 0, lk); // on-screen order: Sarah, Laura, James, …
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'W0-P33' }); document.querySelector('#nb-m').value = 'Online'; prim();
    ok('W0-B wizard reaches step 2 with Laura Kemp offered as an assessor (second, after Sarah Okonkwo)', /step 2 of 5/.test(MODAL.title) && [...document.querySelectorAll('#modal-root .nb-a')].map(x => x.value).slice(0, 3).join() === 'Sarah Okonkwo,Laura Kemp,James Pryce');
    const pick = (coord, as) => { fill({ '#nb-ac': coord }); document.querySelectorAll('#modal-root .nb-a').forEach(x => { x.checked = as.includes(x.value); }); return prim(); };
    ok('W0-B (negative) Coordinator who would be the first assessor (assignment and PD) is refused at step 2', pick('Laura Kemp', ['Laura Kemp', 'James Pryce']) === false && /step 2 of 5/.test(MODAL.title) && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor');
    ok('W0-B (negative) …or the last assessor (observation)', pick('Laura Kemp', ['Sarah Okonkwo', 'Laura Kemp']) === false && /step 2 of 5/.test(MODAL.title));
    pick('Laura Kemp', ['Sarah Okonkwo', 'Laura Kemp', 'James Pryce']); ok('W0-B a Coordinator in the assessor list but not allocated (middle) is accepted', /step 3 of 5/.test(MODAL.title)); closeModal();
  });
  await T('W0-B Coordinator scope: timeline edits and "Edit staff"', async () => {
    fresh(); COO('A'); const own = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), e = batchEvents(own).find(x => x.type !== 'pd');
    ACT.cooEditEv({ dataset: { b: own.code, id: e.id } }); ok('W0-B Coordinator edits a date on their own batch (dialog)', !!MODAL); closeModal();
    const a0 = ADMIN.audit.length; ACT.cooEditEv({ dataset: foreignEv() }); ok('W0-B (negative) another Coordinator\'s batch: refused and logged under the Coordinator\'s name', !MODAL && blockedSince(a0) && ADMIN.audit[0].actor === 'Dr Helen Carter');
    const pl = ADMIN.batches.find(x => x.code === 'L2DC-JAN27'); pl.status = 'Completed'; const pe = batchEvents(pl).find(x => x.type !== 'pd');
    if (pe) { ACT.cooEditEv({ dataset: { b: pl.code, id: pe.id } }); ok('W0-B (negative) own batch that is read-only (Completed): refused', !MODAL && /^Blocked/.test(ADMIN.audit[0].action)); }
    ACT.cooStaff({ dataset: { id: own.code } }); ok('W0-B "Edit staff" opens on the Coordinator\'s own batch', !!MODAL && !!document.querySelector('#modal-root #bs-c'));
    document.querySelector('#modal-root #bs-c').value = 'Laura Kemp';
    ok('W0-B (negative) a changed hidden Coordinator value is refused, not applied', reason('Tamper') === false && own.coord === 'Dr Helen Carter' && /^Blocked: change the Academic Coordinator/.test(ADMIN.audit[0].action)); closeModal();
    ACT.cooStaff({ dataset: { id: 'L2DC-MAR26' } }); ok('W0-B (negative) "Edit staff" on another Coordinator\'s batch is refused', !MODAL && /^Blocked/.test(ADMIN.audit[0].action));
  });

  /* ================= 3. Academy-office requests: Coordinator advice → learner consent → Academic Admin decides ================= */
  const advise = (reasonTxt = 'Workplace withdrew permission.') => { const w = STORE.worlds.C; COO('A'); go('c-learner', { id: w.me.id }); ACT.chOrAdvise({ dataset: { id: w.me.id } }); reason(reasonTxt); return STORE.chOffReq.filter(r => r.lid === w.me.id && r.source === 'coord').slice(-1)[0]; };
  const consent = rq => { learner('C'); ACT.chOrConsent({ dataset: { id: rq.id, a: 'accept' } }); prim(); closeModal(); };
  const itemsOf = rq => ADMIN.queue.filter(i => (i.data || {}).req === rq.id);
  const acaN = qid => STORE.aca.notifs.filter(n => (n.go || '') === 'a-queue.' + qid);
  const cooN = re => STORE.coo.notifs.filter(n => re.test(n.t));
  const orCard = () => (document.querySelector('main .ch-orcard') || { textContent: '' }).textContent;
  await T('W0-C Coordinator advises → learner consents → the Academic Admin receives it', async () => {
    fresh(); const rq = advise(); ok('W0-C advised: awaiting the learner\'s consent; no approval item yet', rq.status === 'Awaiting consent' && !rq.qid && !itemsOf(rq).length);
    const n0 = STORE.coo.notifs.length; consent(rq); const i = qItem(rq.qid);
    ok('W0-C the learner accepted: one "Office observation request" item, pending, routed to the Academic Admin (not the advising Coordinator)', itemsOf(rq).length === 1 && i.status === 'Pending' && i.first === 'Rachel Hughes' && i.first !== rq.coord && i.data.advisedBy === 'Dr Helen Carter' && rq.status === 'Pending approval');
    ok('W0-C reason and history kept: advised, accepted, routed (CH-43 consent preserved)', i.reason === 'Workplace withdrew permission.' && rq.history.map(h => h[2]).join(' | ') === 'Advised by the Coordinator | Learner accepted | Sent to the Academic Admin for a decision' && i.history.some(h => h[2] === 'Routed to the Academic Admin'), rq.history.map(h => h[2]).join(' | '));
    ok('W0-C exactly one Academic Admin notification, addressed to the routed Academic Admin', acaN(rq.qid).length === 1 && acaN(rq.qid)[0].to === 'Rachel Hughes' && /advised by Dr Helen Carter/.test(acaN(rq.qid)[0].b));
    ok('W0-C the Coordinator gets one notice that it went to the Academic Admin — not a request to decide it', STORE.coo.notifs.length === n0 + 1 && cooN(/sent to the Academic Admin/).length === 1);
    ok('W0-C audited: "Routed to the Academic Admin"', ADMIN.audit.some(x => x.entity === rq.qid && x.action === 'Routed to the Academic Admin'));
    chOrQueue(rq); ok('W0-C (negative) queuing the same request again creates no second item or notification', itemsOf(rq).length === 1 && acaN(rq.qid).length === 1);
    learner('C'); go('observations'); ok('W0-C the learner sees "Pending approval" and that the Academic Admin decides', /Pending approval/.test(orCard()) && /Waiting for the Academic Admin to decide/.test(orCard()));
    COO('A'); go('c-learner', { id: STORE.worlds.C.me.id });
    ok('W0-C the advising Coordinator sees "Pending — with the Academic Admin (Rachel Hughes)", and no Approve / Reject', !document.querySelector('main .ch-orcard [data-act="chOrDecide"]') && /Pending — with the Academic Admin \(Rachel Hughes\) in the Approvals Queue/.test(orCard()) && /Academic Admin decides it, not you/.test(orCard()));
    go('c-dashboard'); ok('W0-C …and on the dashboard: no decision buttons for it', !document.querySelector(`main [data-act="chOrDecide"][data-id="${rq.qid}"]`));
    ACA(); ok('W0-C it is in the Academic Admin\'s "Awaiting me"', awaitingMe(qItem(rq.qid)));
  });
  await T('W0-C the adviser (or any Coordinator) can\'t decide it; the Academic Admin approves; scheduling continues', async () => {
    fresh(); const rq = advise(); consent(rq); COO('A'); const s0 = ADMIN.security.length;
    ACT.chOrDecide({ dataset: { id: rq.qid, a: 'approve' } }); ok('W0-C (negative) direct approve by the advising Coordinator: refused, logged under her name, still pending', !MODAL && rq.status === 'Pending approval' && ADMIN.security.length === s0 + 1 && /^Blocked/.test(ADMIN.audit[0].action) && ADMIN.audit[0].actor === 'Dr Helen Carter');
    ACT.chOrDecide({ dataset: { id: rq.qid, a: 'reject' } }); ok('W0-C (negative) direct reject by the adviser: refused', !MODAL && rq.status === 'Pending approval');
    ok('W0-C (negative) in the decision path itself (applyDecision as the adviser): refused', chAsCoord(() => applyDecision(qItem(rq.qid), 'approve', 'x', {})) === false && rq.status === 'Pending approval');
    const me = ADMIN.me; ADMIN.me = { ...me, name: 'Laura Kemp', roles: ['Academic Coordinator'] }; let r2; try { r2 = applyDecision(qItem(rq.qid), 'approve', 'x', {}); } finally { ADMIN.me = me; }
    ok('W0-C (negative) another Coordinator can\'t decide a Coordinator-advised request either', r2 === false && rq.status === 'Pending approval');
    ACA(); const ln0 = STORE.worlds.C.notifs.length; ACT.qDo({ dataset: { id: rq.qid, a: 'approve' } }); reason('Agreed — workplace unavailable.');
    ok('W0-C the Academic Admin approves it: Approved, decided by Rachel Hughes; still one item', rq.status === 'Approved' && rq.decidedBy === 'Rachel Hughes' && qItem(rq.qid).status === 'Approved' && itemsOf(rq).length === 1);
    ok('W0-C the learner is told once; the Coordinator is told the outcome', STORE.worlds.C.notifs.length === ln0 + 1 && /approved/.test(STORE.worlds.C.notifs[0].title) && cooN(/Office observation approved/).length === 1);
    learner('C'); go('observations'); ok('W0-C the learner sees Approved', /Approved/.test(orCard()));
    COO('A'); go('c-learner', { id: STORE.worlds.C.me.id }); ok('W0-C the Coordinator sees Approved (no pending note, no buttons)', /Approved/.test(orCard()) && !/Pending — with/.test(orCard()) && !document.querySelector('main .ch-orcard [data-act="chOrDecide"]'));
    const w = STORE.worlds.C; TAS('A'); ACT.obPropose({ dataset: { l: w.me.id } }); $('#op-l').value = w.me.id; INP.obPerm($('#op-l')); $('input[name="op-lt"][value="office"]').checked = true; INP.obLt(); $('#op-d').value = D(15, '10:00').slice(0, 16); prim(); closeModal();
    const off = w.observations.find(o => o.locType === 'office' && o.status === 'Proposed');
    ok('W0-C observation scheduling still works: the observation assessor proposes an Academy-office date; the request becomes Booked', !!off && rq.status === 'Booked');
    learner('C'); ACT.obsAccept({ dataset: { id: off.id } }); prim(); closeModal(); ok('W0-C …and the learner accepts it (Confirmed)', off.status === 'Confirmed');
  });
  await T('W0-C rejection, escalation and the learner-initiated route', async () => {
    fresh(); let rq = advise('Workplace closed for refurbishment.'); consent(rq); ACA(); ACT.qDo({ dataset: { id: rq.qid, a: 'reject' } }); reason('A workplace observation is still possible.');
    ok('W0-C the Academic Admin rejects it: Rejected, the learner is told', rq.status === 'Rejected' && /not approved/.test(STORE.worlds.C.notifs[0].title));
    learner('C'); go('observations'); ok('W0-C the learner sees Rejected', /Rejected/.test(orCard()));
    COO('A'); go('c-learner', { id: STORE.worlds.C.me.id }); ok('W0-C the Coordinator sees Rejected', /Rejected/.test(orCard()));
    fresh(); rq = advise(); consent(rq); const i = qItem(rq.qid); i.raised = D(-8); allQueue();
    ok('W0-C the existing 7-day escalation still applies (Escalated, as for every request of this type)', i.status === 'Escalated' && i.escalated === true);
    fresh(); const g = STORE.chOffReq.find(r => r.id === 'OR-101'); ok('W0-C learner-initiated (seeded OR-101): still routed to the batch Coordinator', qItem(g.qid).first === 'Michael Osei');
    COO('B'); ACT.chOrDecide({ dataset: { id: g.qid, a: 'approve' } }); reason('Agreed.');
    ok('W0-C …and the batch Coordinator approves it (unchanged)', g.status === 'Approved' && g.decidedBy === 'Michael Osei');
    fresh(); learner('C'); ACT.chOrRequest(); fill({ '#or-r': 'My workplace has not replied.' }); prim(); closeModal(); const lr = STORE.chOffReq.filter(r => r.lid === STORE.worlds.C.me.id).slice(-1)[0];
    ok('W0-C a new learner request: one item routed to her Coordinator (Dr Helen Carter), who is asked to decide', lr.source === 'learner' && itemsOf(lr).length === 1 && qItem(lr.qid).first === 'Dr Helen Carter' && cooN(/Academy-office observation to decide/).some(n => n.to === 'Dr Helen Carter'));
    COO('A'); go('c-learner', { id: STORE.worlds.C.me.id }); ok('W0-C …her Coordinator sees Approve / Reject for it', !!document.querySelector('main .ch-orcard [data-act="chOrDecide"]'));
    ACT.chOrDecide({ dataset: { id: lr.qid, a: 'approve' } }); reason('Agreed.'); ok('W0-C …and approves it', lr.status === 'Approved' && lr.decidedBy === 'Dr Helen Carter');
    fresh(); learner('C'); ACT.chOrRequest(); fill({ '#or-r': 'Mine.' }); prim(); closeModal(); const own = STORE.chOffReq.filter(r => r.lid === STORE.worlds.C.me.id).slice(-1)[0];
    const me = ADMIN.me; ADMIN.me = { ...me, name: own.by, roles: ['Learner'] }; let r3; try { r3 = applyDecision(qItem(own.qid), 'approve', 'x', {}); } finally { ADMIN.me = me; }
    ok('W0-C (negative) the learner who started a request can\'t decide it (decision path)', r3 === false && own.status === 'Pending approval');
  });

  /* ================= 4. Checkout reconciles with the learner's pinned terms ================= */
  const npRow = (k, o) => { const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = o.l; r.querySelector('.r1-np-f').value = String(o.f); r.querySelector('.r1-np-m').value = o.m; };
  const newL3 = (title, rows) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (7100 + title.length) + '/3', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l')); rows.forEach((o, k) => { if (k) ACT.r1NpAdd(); npRow(k, o); }); create(); return (STORE.chNewProgs || []).slice(-1)[0]; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const obsDecide = id => { ACT.n5Settings({ dataset: { p: id } }); const r = document.querySelector('#modal-root input[name="n5-req"][value="no"]'); if (r && MODAL) { r.checked = true; prim(); } closeModal(); };
  const pubNew = pr => { const id = pr.id; go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U370', '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/3701' }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); document.querySelector('#rsn').value = 'First version'; press(); obsDecide(id); ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal(); return pr.status === 'Active'; };
  const mkBatch = (code, course) => { ACT.newBatch(); fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = course; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal(); return ADMIN.batches.find(b => b.code === code); };
  const planEdit = (pid, m, n) => { ACT.s4PlanEdit({ dataset: { p: pid } }); const x = document.querySelector(`input[name="pp-meth"][value="${m}"]`); x.checked = true; INP.e1Meth(x); if (n) fill({ '#pp-n': String(n) }); return reason('W0 plan'); };
  const start = (v, pr, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); const r = optId && document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; if (prim() !== false) closeModal(); return W; };
  const toPay = (w, b) => { chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); };
  const pay = (w, opt) => { setUi('suOpt', opt); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-W0'); closeModal(); return { g, pl: w.plans.find(p => p.e === 'nvq') }; };
  const pence = xs => xs.reduce((s, x) => s + Math.round(x * 100), 0);
  const recon = (n, w, o, want) => { const { g, pl } = o, t = w.signup.plan, rows = pl ? pl.rows.map(r => r.amount) : [], dep = pl && pl.deposit ? pl.deposit.amount : 0;
    ok(`W0-D ${n}`, w.signup.done && pl.total === t.fee && pence(rows) + Math.round(dep * 100) === Math.round(t.fee * 100) && JSON.stringify(rows) === JSON.stringify(want.rows) && (!g || g.amount === want.charged) && w.signup.pay.amount === want.charged, JSON.stringify({ fee: t.fee, inst: t.inst, rows, dep, charged: g && g.amount })); };
  await T('W0-D wizard Level 3 programme (Super Admin terms): rows from the pinned option, method and count', async () => {
    fresh(); SA(); const pr = newL3('Level 3 Certificate in W0 Checkout', [{ l: 'Self-Paced', f: 600, m: 'Self-Paced' }, { l: 'Fully Assisted', f: 1000, m: 'Fully Assisted' }]); const [sp, fa] = r1Opts(pr.id).map(o => o.id);
    pubNew(pr); FA(); planEdit(pr.id, 'both', 3); SA(); go('a-batches'); const b = mkBatch('W0CO-MAR27', pr.title);
    ok('W0-D the programme\'s reference price is the lowest option (£600); the plan is Both / 3', pr.price === 600 && s4PlanCur(pr.id).meth === 'both' && s4PlanCur(pr.id).inst === 3);
    let w = start('A', pr, fa); toPay(w, b); recon('£1,000 option, instalments: 3 rows £333.33 + £333.33 + £333.34 (not the £600 reference fee); first charged', w, pay(w, 'instalment'), { rows: e1Sched(1000, 3), charged: 333.33 });
    w = start('F', pr, fa); toPay(w, b); recon('£1,000 option, pay in full: one row of £1,000 charged at once', w, pay(w, 'full'), { rows: [1000], charged: 1000 });
    w = start('E', pr, sp); toPay(w, b); recon('£600 option, default deposit: £300 now, one £300 balance row', w, pay(w, 'deposit'), { rows: [300], charged: 300 });
  });
  await T('W0-D pinned terms survive later plan and fee changes; Finance-approved creator terms; seeded wizard Level 2', async () => {
    fresh(); SA(); let pr = newL3('Level 3 Certificate in W0 Pinned', [{ l: 'Self-Paced', f: 600, m: 'Self-Paced' }, { l: 'Fully Assisted', f: 1000, m: 'Fully Assisted' }]); let [, fa] = r1Opts(pr.id).map(o => o.id);
    // CB8 (PD-CB-48, PD-CB-52) supersedes Finance's plan editor (planEdit) and fee-option card (r1OptEdit) for a programme made in the builder: its terms
    // change through its financial package (here the Super Administrator's own, approved at once — D8). The rule tested is unchanged: pinned terms survive.
    const pkg = (pr, oid, ks, fee) => { const o = cb8Work(pr).opts.find(x => x.id === oid); o.pay.map(x => x.k).forEach(k => ACT.cb8PayDel({ dataset: { p: pr.id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: pr.id, o: oid, k: String(k) } })); if (fee) { ACT.cb8Opt({ dataset: { p: pr.id, o: oid } }); fill({ '#c8-f': String(fee) }); press(); } };
    const saOk = pr => { SA(); ACT.cb8SaApprove({ dataset: { p: pr.id } }); reason('Terms'); };
    SA(); pkg(pr, fa, [1, 3]); saOk(pr); pubNew(pr); SA(); go('a-batches'); let b = mkBatch('W0PN-MAR27', pr.title);
    let w = start('A', pr, fa); toPay(w, b); SA(); pkg(pr, fa, [4], 1200); saOk(pr); learner('A');
    recon('pinned before Finance changed the plan (4) and the option fee (£1,200): still 3 × the pinned £1,000', w, pay(w, 'instalment'), { rows: e1Sched(1000, 3), charged: 333.33 });
    fresh(); ACA(); pr = newL3('Level 3 Certificate in W0 Approved', [{ l: 'Self-Paced', f: 800, m: 'Self-Paced' }, { l: 'Fully Assisted', f: 1250, m: 'Fully Assisted' }]); [, fa] = r1Opts(pr.id).map(o => o.id);
    // CB8 (PD-CB-50, PD-CB-52) supersedes "How can learners pay? Both · 4 instalments" on the E1 form: the Fully Assisted option offers pay in full and
    // 4 payments in its package; the custom deposit uses the same fields; the creator submits the package and Finance approves it
    pkg(pr, fa, [1, 4]); go('a-programmes', { id: pr.id, tab: 'fees' }); const d = document.querySelector('main input[name="e1-wdm"][value="own"]'); d.checked = true; INP.e1DepMode(d); fill({ '#e1-d': '250' });
    ACT.cb8Submit({ dataset: { p: pr.id } }); press(); FA(); ACT.e1Decide({ dataset: { id: e1T(pr.id).qid, a: 'approve' } }); reason('Approved');
    ACA(); pubNew(pr); SA(); go('a-batches'); b = mkBatch('W0AP-MAR27', pr.title);
    w = start('A', pr, fa); toPay(w, b); recon('Finance-approved Both / 4: £1,250 option by instalments, 4 × £312.50', w, pay(w, 'instalment'), { rows: e1Sched(1250, 4), charged: 312.5 });
    w = start('F', pr, fa); toPay(w, b); recon('…pay in full: £1,250', w, pay(w, 'full'), { rows: [1250], charged: 1250 });
    w = start('E', pr, fa); toPay(w, b); recon('…custom deposit £250, balance £1,000', w, pay(w, 'deposit'), { rows: [1000], charged: 250 });
    fresh(); const n2 = ch8Pr('NV-N2'), b2 = ADMIN.batches.find(x => x.code === 'L2PW-DEC26-ONL');
    w = start('A', n2, null); toPay(w, b2); recon('seeded wizard Level 2 (NV-N2 £900, 3 instalments)', w, pay(w, 'instalment'), { rows: [300, 300, 300], charged: 300 });
    w = start('F', n2, null); toPay(w, b2); recon('…its own £150 deposit, £750 balance', w, pay(w, 'deposit'), { rows: [750], charged: 150 });
    const C = STORE.worlds.C.plans.find(p => p.e === 'nvq'); ok('W0-D historical seeded payments untouched (Aisha: £300 deposit + 6 × £350)', C.deposit.amount === 300 && C.rows.length === 6 && C.rows.every(r => r.amount === 350));
  });

  /* ================= 5. Assignment attachments kept with the submission round ================= */
  const pdf = (name = 'evidence.pdf', body = '%PDF-1.4 W0 evidence of practice') => new File([body], name, { type: 'application/pdf' });
  const attach = (key, f) => INP.attach({ files: [f], dataset: { key }, value: '' });
  const asg = (v, id) => STORE.worlds[v].assignments.find(a => a.id === id);
  const KEY = 'IA-L-18022~a3';
  const submitA3 = async () => { learner('C'); go('assignment', { id: 'a3' }); const a = W.assignments.find(x => x.id === 'a3'); attach('a3.' + a.qs[0].id + '.0', pdf()); await settle(); finaliseSubmit(a, false, now().toISOString()); return a; };
  await T('W0-E the learner attaches files: the content is kept, with metadata and an integrity hash', async () => {
    fresh(); learner('C'); go('assignment', { id: 'a3' }); const a = W.assignments.find(x => x.id === 'a3'), k1 = 'a3.' + a.qs[0].id + '.0';
    attach(k1, pdf()); const id = (W.drafts['attid.' + k1] || [])[0], r0 = w0Rec(id);
    ok('W0-E a draft attachment record links learner, assignment, question and answer box', !!r0 && r0.lid === 'IA-L-18022' && r0.v === 'C' && r0.aid === 'a3' && r0.qid === a.qs[0].id && r0.box === 0 && r0.name === 'evidence.pdf' && r0.size === pdf().size);
    await settle(); const r = w0Rec(id);
    ok('W0-E the file content is stored (a copy in session memory), not just its name', r.status === 'Stored' && r.blob instanceof Blob && (await r.blob.text()) === '%PDF-1.4 W0 evidence of practice');
    ok('W0-E an SHA-256 integrity hash is recorded', /^[0-9a-f]{64}$/.test(r.sha256 || ''), String(r.sha256));
    render(); ok('W0-E the answer box lists the stored file with its size (it survives a re-render)', !!document.querySelector(`main [data-act="w0AttOpen"][data-id="${id}"]`) && /evidence\.pdf/.test(main()));
    const n0 = W.drafts['attid.' + k1].length;
    attach(k1, new File(['x'], 'script.exe', { type: 'application/octet-stream' })); ok('W0-E (negative) a type outside PDF / DOCX / JPG / PNG is refused', W.drafts['attid.' + k1].length === n0);
    attach(k1, new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })); ok('W0-E (negative) a file over 10 MB is refused', W.drafts['attid.' + k1].length === n0);
    attach(k1, new File([], 'empty.pdf', { type: 'application/pdf' })); ok('W0-E (negative) an empty file is refused', W.drafts['attid.' + k1].length === n0);
    for (let k = 0; k < 4; k++) attach(k1, pdf('page' + k + '.pdf')); attach(k1, pdf('sixth.pdf')); await settle();
    ok('W0-E (negative) a sixth file is refused (up to 5 per answer)', W.drafts['attid.' + k1].length === 5 && !W.drafts['att.' + k1].includes('sixth.pdf'));
    const q2 = a.qs[1]; q2.attach = false; render(); const box2 = document.querySelectorAll('main .q')[1];
    ok('W0-E a question set to "No attachments" shows no Attach button and says so', !box2.querySelector('input[type="file"]') && /doesn't accept attachments/.test(box2.textContent));
    attach('a3.' + q2.id + '.0', pdf()); ok('W0-E (negative) …and refuses a file sent to it directly', !(W.drafts['attid.a3.' + q2.id + '.0'] || []).length);
    ACT.reviewSubmit({ dataset: { id: 'a3' } }); ok('W0-E the review dialog lists the attached files', /evidence\.pdf/.test(mroot().textContent) && /page0\.pdf/.test(mroot().textContent)); closeModal();
  });
  await T('W0-E submission: each round keeps its own files; later rounds never change earlier ones', async () => {
    fresh(); const a = await submitA3(), q = a.qs[0], rd = q.rounds[0];
    ok('W0-E the submitted round carries its file (frozen list)', Array.isArray(rd.att) && rd.att.length === 1 && rd.att[0].name === 'evidence.pdf' && Object.isFrozen(rd.att));
    const rec = w0Rec(rd.att[0].id); ok('W0-E the record is linked to the submission round and marked submitted', rec.round === 'Sub 1' && rec.status === 'Submitted' && rec.submittedAt === rd.at);
    ok('W0-E questions submitted without files record "no files" (not a placeholder)', a.qs.slice(1).every(x => Array.isArray(x.rounds[0].att) && !x.rounds[0].att.length));
    go('assignment', { id: 'a3' }); ok('W0-E the learner\'s submitted view shows the file under its round', !!document.querySelector(`main .w0-att [data-id="${rec.id}"]`) && /No files attached/.test(main()));
    attach('a3.' + q.id + '.0', pdf('late.pdf')); ok('W0-E (negative) no file can be added to a submitted (locked) answer', rd.att.length === 1 && !(W.drafts['attid.a3.' + q.id + '.0'] || []).some(id => w0Rec(id).name === 'late.pdf'));
    // Marking sends Q1 back for rework; the resubmission carries a new file in its own round
    a.status = 'Resubmission Required'; q.state = 'rework'; a.qs.slice(1).forEach(x => { x.state = 'met'; }); a.resubDue = D(10); go('assignment', { id: 'a3' });
    const k2 = 'a3.' + q.id + '.1'; attach(k2, pdf('revised.pdf', '%PDF-1.4 revised')); await settle(); const before = JSON.stringify(rd.att), at2 = now().toISOString(); finaliseSubmit(a, true, at2);
    const rd2 = q.rounds[1]; ok('W0-E the resubmission round keeps its own file', !!rd2 && rd2.att.length === 1 && rd2.att[0].name === 'revised.pdf' && w0Rec(rd2.att[0].id).round === 'Resub 1');
    ok('W0-E the first round\'s files are unchanged (same frozen list, same record)', q.rounds[0].att === rd.att && JSON.stringify(q.rounds[0].att) === before && w0Rec(rd.att[0].id).round === 'Sub 1');
    ok('W0-E questions not reopened get no new round and no files', a.qs.slice(1).every(x => x.rounds.length === 1));
    const leg = asg('C', 'a4').qs[0].rounds[0]; ok('W0-E rounds submitted before W0 are left as they were (no invented attachment record)', leg && leg.att === undefined);
  });
  await T('W0-E who can open a submitted file (learner, batch Coordinator, allocated assessor, admins, IQA)', async () => {
    fresh(); const a = await submitA3(), id = a.qs[0].rounds[0].att[0].id;
    const tryOpen = () => { closeModal(); const a0 = ADMIN.audit.length, s0 = ADMIN.security.length; ACT.w0AttOpen({ dataset: { id } }); const opened = !!MODAL && /Integrity \(SHA-256\)/.test(mroot().textContent); const refusedLogged = !MODAL && ADMIN.security.length > s0 && blockedSince(a0); closeModal(); return { opened, refusedLogged }; };
    const who = [
      ['the learner', () => learner('C'), true], ['another learner (Grace)', () => learner('D'), false],
      ['her batch Coordinator (Dr Helen Carter)', () => COO('A'), true], ['another Coordinator (Michael Osei)', () => COO('B'), false],
      ['her allocated assignment assessor (Sarah Okonkwo)', () => TAS('A'), true], ['an assessor not allocated to her (James Pryce)', () => TAS('S'), false], ['a Teacher (Marcus Bell)', () => TAS('T'), false],
      ['Super Admin (admin portal)', () => SA(), true], ['System Admin', () => SYS(), true], ['Academic Admin', () => ACA(), true], ['IQA', () => admin('QA'), true],
      ['Finance Admin', () => FA(), false], ['Business Admin', () => admin('BA'), false], ['agency administrator', () => { ACT.switchRole({ dataset: { r: 'agyA' } }); S.signedIn = true; }, false],
    ];
    who.forEach(([n, f, can]) => { f(); const r = tryOpen(); ok(`W0-E ${can ? '' : '(negative) '}${n} ${can ? 'can open it' : 'is refused, and the attempt is logged'}`, can ? r.opened : r.refusedLogged); });
    COO('A'); const a0 = ADMIN.audit.length; ACT.w0AttOpen({ dataset: { id } }); ok('W0-E staff access is audited under the staff member\'s name', ADMIN.audit.length === a0 + 1 && ADMIN.audit[0].action === 'Attachment opened' && ADMIN.audit[0].actor === 'Dr Helen Carter'); closeModal();
    learner('C'); ACT.w0AttOpen({ dataset: { id } }); ok('W0-E the open dialog offers the file itself (a download link to the stored content)', !!document.querySelector('#modal-root a[download="evidence.pdf"][href^="blob:"]')); closeModal();
    fresh(); ok('W0-E the demo reset clears the session evidence store', !w0Rec(id));
  });
  await T('W0-E staff views show the real files; no invented "Qn_attachment.pdf"', async () => {
    fresh(); const a = await submitA3(), id = a.qs[0].rounds[0].att[0].id;
    TAS('A'); go('t-mark', { id: KEY }); ok('W0-E Assessor marking workspace: the round shows the submitted file; no "Q1_evidence.pdf"', !!document.querySelector(`main [data-act="w0AttOpen"][data-id="${id}"]`) && !/Q\d_evidence\.pdf/.test(main()));
    COO('A'); go('c-sub', { id: KEY }); ok('W0-E Coordinator submission page: the file is shown; no "Q1_attachment.pdf"', !!document.querySelector(`main [data-act="w0AttOpen"][data-id="${id}"]`) && !/Q\d_attachment\.pdf/.test(main()));
    go('c-sub', { id: 'IA-L-18022~a4' }); ok('W0-E a submission recorded before W0 says no file is stored (instead of an invented file)', /No attachment file is stored for this submission/.test(main()) && !/Q\d_attachment\.pdf/.test(main()));
    TAS('A'); go('t-mark', { id: 'IA-L-18022~a4' }); ok('W0-E …in the marking workspace too', /No attachment file is stored for this submission/.test(main()) && !/Q\d_evidence\.pdf/.test(main()));
  });
  await T('W0-E the real submit path (review, 15-second undo, final) keeps the files', async () => {
    fresh(); learner('C'); const c6 = W.assignments.find(x => x.id === 'a6'), k6 = 'a6.' + c6.qs[0].id + '.0'; attach(k6, pdf());
    ok('W0-E (negative) an assignment past its deadline (closed) accepts no files', c6.closed && !(W.drafts['attid.' + k6] || []).length);
    go('assignment', { id: 'a3' }); const a = W.assignments.find(x => x.id === 'a3'), k = 'a3.' + a.qs[0].id + '.0';
    W.drafts[k] = '<p>My answer</p>'; attach(k, new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' })); await settle();
    ACT.reviewSubmit({ dataset: { id: 'a3' } }); prim(); ok('W0-E nothing is recorded during the undo window', !a.qs[0].rounds.length);
    await wait(16500); const rd = a.qs[0].rounds[0];
    ok('W0-E after the undo window: submitted with the PNG in Sub 1', a.status === 'Submitted' && rd && rd.att.length === 1 && rd.att[0].name === 'photo.png' && w0Rec(rd.att[0].id).round === 'Sub 1'); closeModal();
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
