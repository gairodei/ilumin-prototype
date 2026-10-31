// AC-1 — academic integrity and authorization (31 Oct 2026; PD-AC-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client: the client demo first (release of marking, outcome corrections, batch actions,
// staff allocation and reassignment, batch move, uploads on a learner's behalf), then the legacy data (academic queue items, office
// observation requests, Data Correction final approval, observations, certificates, a test-only learner on two programmes), then
// the client demo again to check Reset. Each defect is first reproduced with the handler kept from before AC-1 (_xxAC / AC_OLD in
// js/ac-integrity.js), on records that are thrown away by the next fixture load.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'AC-1 test') => { const t = $1('#rsn') || $1('#cb-r'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const sec = () => ADMIN.security.length;
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  // Client demo identities: the demo chooser, as a fresh browser signs in
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const submitAsg = (p, aid) => { pick(p); const a = W.assignments.find(x => x.id === aid); go('assignment', { id: aid }); a.qs.forEach(q => { W.drafts[a.id + '.' + q.id + '.0'] = '<p>AC-1 answer ' + q.id + '</p>'; }); fxFast(ff => { ACT.reviewSubmit({ dataset: { id: aid } }); prim(); ff(16500); }); closeModal(); return a; };
  // Legacy identities
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => AS('A');
  const TCH = v => { closeModal(); S.tas.v = v; tasEnter(); S.signedIn = true; S.ui = {}; };
  const COO = v => { closeModal(); S.coo.v = v; cooEnter(); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const CROLES = ['nvq-sp', 'nvq-fa', 'teacher', 'assessor', 'coord1', 'coord2', 'aca', 'sys', 'super', 'iqa', 'agency', 'fin', 'biz'];
  const LROLES = { learner: () => learner('A'), teacher: () => TCH('T'), assessor: () => TCH('S'), coordinator: () => COO('A'), aca: ACA, finance: () => AS('FA'), business: () => AS('BA'), agency: () => AGY('AG-01'), sysadmin: () => AS('SY'), super: SA };
  const snapCD = () => J({ b: ADMIN.batches.map(b => [b.code, b.status, b.start, (b.coh || []).length, Object.entries(b.mcA || {}).map(([l, a]) => l + ':' + a.to), b.teachers, b.assessors, chAllocOf(b)]), out: Object.keys(R3().out).length, rel: Object.keys(STORE.tas.rel || {}).length, pend: Object.keys(relStore()).length, ov: STORE.chAssessOv || {}, q: ADMIN.queue.length, docs: ['CD1', 'CD2'].map(v => STORE.worlds[v].docs.map(d => [d.id, d.status, !!d.replacement])) });
  const cd0 = snapCD();

  /* ================= Client demo ================= */
  const AM = STORE.worlds.CD1.me.id, DV = STORE.worlds.CD2.me.id, bCD = () => cdBatch(), code = cdBatch().code;
  const kA10 = AM + '~a10', kA11 = AM + '~a11';
  let P0 = null, dc = null;

  // AC-2 (B3-01) release of an Assessor's marking
  await T('AC1-R release of marking', async () => {
    const a = submitAsg('nvq-sp', 'a11');
    pick('assessor'); const d = dft(kA11); markable(tasAsg(tasSubs(true).find(s => s.key === kA11))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'AC-1 fine.', met: 'Met' }; });
    ACT.mkRelease({ dataset: { k: kA11 } }); prim(); closeModal();
    P0 = JSON.parse(J(relStore()[kA11] || null)); ok('AC1-R setup: Amira\'s a11 marking is waiting for her Coordinator\'s release', !!P0 && a.status === 'Submitted');
    for (const p of CROLES.filter(x => !['coord1', 'coord2'].includes(x))) {
      relStore()[kA11] = JSON.parse(J(P0)); pick(p); const s0 = sec(), n0 = STORE.worlds.CD1.notifs.length;
      ACT.relOne({ dataset: { k: kA11 } }); prim(); closeModal(); await sleep(20);
      const r = releaseNow(kA11);
      ok('AC1-R ' + p + ' cannot release Amira\'s marking (relOne and a direct releaseNow call); nothing changes and the attempt is logged', !!relStore()[kA11] && r === false && a.status === 'Submitted' && STORE.worlds.CD1.notifs.length === n0 && sec() > s0, J({ pend: !!relStore()[kA11], r, st: a.status }));
    }
    relStore()[kA11] = JSON.parse(J(P0)); pick('aca'); ACT.relSuper({ dataset: { k: kA11 } }); reason(); await sleep(20);
    ok('AC1-R the Academic Admin cannot use the Super Administrator\'s release', !!relStore()[kA11] && a.status === 'Submitted');
    pick('coord1'); const n0 = STORE.worlds.CD1.notifs.length; ACT.relOne({ dataset: { k: kA11 } }); prim(); closeModal(); await sleep(30);
    ok('AC1-R Dr Helen Carter (Amira\'s Coordinator) releases it — the learner is told once', !relStore()[kA11] && a.status !== 'Submitted' && STORE.worlds.CD1.notifs.length === n0 + 1, a.status);
    const st = a.status, n1 = STORE.worlds.CD1.notifs.length; ACT.relOne({ dataset: { k: kA11 } }); prim(); closeModal(); const r2 = releaseNow(kA11); await sleep(20);
    ok('AC1-R releasing again changes nothing (nothing is waiting)', a.status === st && STORE.worlds.CD1.notifs.length === n1 && r2 === false);
    relStore()[kA11] = JSON.parse(J(P0)); pick('super'); ACT.relSuper({ dataset: { k: kA11 } }); reason('Coordinator absent'); await sleep(20);
    ok('AC1-R the Super Administrator\'s release with a reason still works', !relStore()[kA11]);
    relStore()[kA11] = JSON.parse(J(P0)); pick('coord2'); ACT.relOne({ dataset: { k: kA11 } }); prim(); closeModal(); await sleep(20);
    ok('AC1-R Michael Osei, the batch\'s other Coordinator, can also release it (release is batch-wide: G6.3, PD-MC-06; unchanged)', !relStore()[kA11]);
  });

  await T('AC1-K1 single-programme learners and learner-side records', async () => {
    pick('assessor'); const rows = tasSubs(true).filter(s => [AM, DV].includes(s.L.lid));
    ok('AC1-K1 the demo learners (one programme) keep learner~assignment keys for staff', rows.length > 0 && rows.every(s => s.key === s.L.lid + '~' + s.a.id) && acKey(AM, 'a10', bCD()) === kA10);
    pick('coord1'); const cr = mySubmissions(true).filter(s => [AM, DV].includes(s.L.lid)); ok('AC1-K1 ... and for Coordinators', cr.length > 0 && cr.every(s => s.key === s.L.lid + '~' + s.a.id));
    pick('nvq-sp'); const a = W.assignments.find(x => x.id === 'a12') || W.assignments[0], k = arKey(a);
    ok('AC1-K1 a learner\'s browser draft is keyed by learner, programme and version, and assignment release', k.includes(W.me.id) && k.includes(arProg()) && k.includes(arRel(a)), k);
    ACT.applyNvq({ dataset: { id: (CATALOGUE.find(c => c.kind === 'nvq' && c.title !== W.nvq.title) || CATALOGUE.find(c => c.kind === 'nvq')).id } }); const m = !!MODAL && /Sign up|Start sign-up/i.test(J(MODAL.actions.map(x => x.label))); closeModal();
    ok('AC1-K1 one learner account holds one NVQ: starting a second sign-up is refused, so a learner\'s own answers, References, drafts, evidence and rounds belong to one programme', !m && !!W.nvq);
  });

  // AC-1 (B3-03c) Data Correction of a published outcome: first review System Administrator, final approval Super Administrator, once
  await T('AC1-D Data Correction of a published outcome', async () => {
    submitAsg('nvq-sp', 'a10');
    pick('assessor'); ACT.r3Declare({ dataset: { k: kA10 } }); $1('input[name="r3-res"][value="Fail"]').checked = true; $1('#d-ofb').value = 'AC-1 overall feedback'; $1('#rsn').value = 'r'; act('Publish to learner');
    ok('AC1-D setup: the Assessor published Fail for Amira\'s a10', r3Out(kA10) && r3Out(kA10).result === 'Fail');
    ACT.tasDC({ dataset: { k: kA10 } }); $1('#dc-rec').value = 'r3-outcome'; $1('#dc-new').value = 'Pass'; $1('#dc-r').value = 'AC-1 marking error'; prim(); closeModal();
    dc = ADMIN.queue.find(i => i.data && i.data.r3out && i.data.r3out.key === kA10 && isOpen(i)); ok('AC1-D a Data Correction (Fail → Pass) is open', !!dc);
    for (const p of ['aca', 'coord1', 'coord2', 'sys', 'teacher', 'assessor', 'nvq-sp', 'fin', 'biz', 'agency', 'iqa']) {
      pick(p); const s0 = sec(); ACT.qDo({ dataset: { id: dc.id, a: 'approveFinal' } }); const m = !!MODAL; if (MODAL) reason(); const r = applyDecision(dc, 'approveFinal', 'AC-1', {});
      ok('AC1-D ' + p + ' cannot give the final approval (dialog and direct call); the outcome stays Fail and the attempt is logged', !m && r === false && r3Out(kA10).result === 'Fail' && isOpen(dc) && sec() > s0, J({ m, r, res: r3Out(kA10).result, st: dc.status }));
    }
    pick('coord1'); ACT.qDo({ dataset: { id: dc.id, a: 'forward' } }); if (MODAL) reason();
    ok('AC1-D a Coordinator cannot forward it', dc.stage !== 'final' && isOpen(dc));
    pick('sys'); go('a-queue', { id: dc.id }); ok('AC1-D screen: the System Administrator\'s detail offers Forward, not Final approval', !!$1('main [data-act="qDo"][data-a="forward"]') && !$1('main [data-act="qDo"][data-a="approveFinal"]'));
    ACT.qDo({ dataset: { id: dc.id, a: 'forward' } }); reason('First review done');
    ok('AC1-D the System Administrator forwards it to the Super Administrator', dc.stage === 'final' && isOpen(dc), dc.stage);
    ACT.qDo({ dataset: { id: dc.id, a: 'forward' } }); const m2 = !!MODAL; closeModal(); const r2 = applyDecision(dc, 'approveFinal', 'x', {});
    ok('AC1-D after forwarding, the System Administrator can neither forward again nor approve', !m2 && r2 === false && r3Out(kA10).result === 'Fail');
    pick('super'); const h0 = r3Out(kA10).hist.length; ACT.qDo({ dataset: { id: dc.id, a: 'approveFinal' } }); const mA = MODAL, fA = mA && mA.actions.find(x => /primary|danger/.test(x.cls || '')).fn; reason('Final approval');
    ok('AC1-D the Super Administrator approves: the outcome is Pass, decided once', r3Out(kA10).result === 'Pass' && dc.status === 'Approved' && r3Out(kA10).hist.length === h0 + 1, J({ r: r3Out(kA10).result, st: dc.status }));
    MODAL = mA; renderModal(); if ($1('#rsn')) $1('#rsn').value = 'replayed'; const sR = sec(), rR = fA(); closeModal();
    ok('AC1-D replaying the same approval dialog afterwards (a stale UI object) is refused and logged; nothing changes', dc.status === 'Approved' && r3Out(kA10).result === 'Pass' && r3Out(kA10).hist.length === h0 + 1 && sec() > sR, J({ st: dc.status, h: r3Out(kA10).hist.length - h0, logged: sec() - sR }));
    const n1 = STORE.worlds.CD1.notifs.length, s1 = sec(); ACT.qDo({ dataset: { id: dc.id, a: 'approveFinal' } }); const m3 = !!MODAL; closeModal(); const r3 = applyDecision(dc, 'approveFinal', 'again', {}); const r4 = applyDecision(dc, 'reject', 'again', {});
    ok('AC1-D approving or rejecting the decided correction again is refused and logged; its effect is not repeated', !m3 && r3 === false && r4 === false && dc.status === 'Approved' && r3Out(kA10).hist.length === h0 + 1 && STORE.worlds.CD1.notifs.length === n1 && sec() > s1);
    go('a-queue', { id: dc.id }); ok('AC1-D screen: the decided item offers no decision buttons', !$a('main [data-act="qDo"]').some(b => b.dataset.a !== 'note'));
  });

  // AC-2 (B2-D3, B2-D2) batch lifecycle and cancellation
  await T('AC1-B batch lifecycle and cancellation', async () => {
    const b = bCD(), st = b.status;
    for (const p of CROLES.filter(x => !['aca', 'sys', 'super'].includes(x))) {
      pick(p); const s0 = sec(); ACT.batchLife({ dataset: { id: code, to: 'In Progress' }, textContent: 'x' }); if (MODAL) reason(); ACT.cancelBatch({ dataset: { id: code } }); const m = !!MODAL; if (MODAL) reason();
      ok('AC1-B ' + p + ' cannot change the batch status or cancel the batch', b.status === st && !m && sec() >= s0 + 2, b.status);
    }
    pick('aca'); ACT.batchLife({ dataset: { id: code, to: 'Archived' }, textContent: 'x' }); const m1 = !!MODAL; if (MODAL) reason();
    ok('AC1-B the Academic Admin cannot skip the lifecycle (Open → Archived)', b.status === st && !m1);
    const s0 = b.start; b.start = new Date(now().getTime() - 3 * 864e5).toISOString().slice(0, 10);
    ACT.cancelBatch({ dataset: { id: code } }); const m2 = !!MODAL; if (MODAL) { $a('#modal-root .cb-d').forEach(s => { s.value = 'refund'; }); reason(); }
    ok('AC1-B the Academic Admin cannot cancel a batch whose start date has passed', b.status === st && !m2, b.status);
    b.start = s0;
    ACT.cancelBatch({ dataset: { id: code } }); $a('#modal-root .cb-d').forEach(s => { s.value = 'refund'; }); if ($1('#cb-r')) $1('#cb-r').value = 'AC-1'; const g = MODAL && MODAL.actions.find(x => /danger|primary/.test(x.cls || '')); pick('teacher');
    const s1 = sec(), r = g ? g.fn() : 'no dialog'; closeModal();
    ok('AC1-B a cancel dialog opened by the Academic Admin and confirmed after switching to a Teacher is refused and logged', b.status === st && r === false && sec() > s1, J(r));
  });

  // AC-2 (B2-D6) Staff Allocations
  await T('AC1-K staff allocation', async () => {
    const b = bCD(), t0 = J(b.teachers), a0 = J(b.assessors);
    for (const p of ['teacher', 'assessor', 'coord1', 'fin', 'biz', 'agency', 'nvq-sp', 'iqa']) { pick(p); const s0 = sec(); ACT.kAlloc(); const m = !!MODAL; closeModal(); ok('AC1-K ' + p + ' cannot open Staff Allocations to allocate anyone', !m && sec() > s0); }
    pick('aca'); ACT.kAlloc(); if (MODAL) { $1('#ka-s').value = 'Omar Siddiqui'; $1('#ka-k').value = 'Batch'; INP.kAllocKind($1('#ka-k')); const w = $1('#ka-w'); w.value = [...w.options].map(o => o.value).find(v => v.startsWith(code)); $1('#ka-r').value = 'AC-1'; prim(); }
    const kept = !!MODAL; closeModal();
    ok('AC1-K an Assessor is not allocated to a batch here — the Assessors panel (CH-17) does that', J(b.assessors) === a0 && J(b.teachers) === t0 && kept, J({ a: b.assessors }));
    ACT.kAlloc(); if (MODAL) { $1('#ka-s').value = 'Tom Whitfield'; $1('#ka-k').value = 'Batch'; INP.kAllocKind($1('#ka-k')); const w = $1('#ka-w'); w.value = [...w.options].map(o => o.value).find(v => v.startsWith(code)); $1('#ka-r').value = 'AC-1 cover'; prim(); closeModal(); }
    ok('AC1-K the Academic Admin still allocates a Teacher', b.teachers.includes('Tom Whitfield'), J(b.teachers));
    b.teachers = JSON.parse(t0); syncTasBatches();
  });

  // AC-2 (B1-D3) upload on a learner's behalf
  await T('AC1-U upload on a learner\'s behalf', async () => {
    const w = STORE.worlds.CD1, d = w.docs.find(x => x.status === 'Approved'); ok('AC1-U setup: Amira has an approved document', !!d); if (!d) return;
    const v0 = d.versions.length, f0 = d.file;
    for (const p of ['fin', 'biz', 'agency', 'teacher', 'assessor', 'coord1', 'nvq-sp', 'iqa']) { pick(p); const s0 = sec(); ACT.uploadOnBehalf({ dataset: { v: 'CD1', d: d.id } }); const m = !!MODAL; if (MODAL) reason('rogue'); ok('AC1-U ' + p + ' cannot upload on Amira\'s behalf', !m && d.status === 'Approved' && d.versions.length === v0 && sec() > s0); }
    pick('aca'); ACT.uploadOnBehalf({ dataset: { v: 'CD1', d: d.id } }); reason('Learner emailed a clearer copy');
    ok('AC1-U the Academic Admin\'s upload over an approved document is a replacement in review; the approved document stays valid', d.status === 'Approved' && d.file === f0 && !!d.replacement && d.versions.length > v0 && w.admission.status !== 'Submitted', J({ st: d.status, rep: d.replacement }));
    const v1 = d.versions.length; ACT.uploadOnBehalf({ dataset: { v: 'CD1', d: d.id } }); const m = !!MODAL; closeModal();
    ok('AC1-U a second upload while the replacement is in review is refused', !m && d.versions.length === v1);
  });

  // AC-3 (B2-D1, B2-D4) staff access from the current allocations
  let OTHER = null;
  await T('AC1-S removed Assessor and per-learner override', async () => {
    const b = bCD(); OTHER = Object.entries(TAS_USERS).find(([k, u]) => u.roles.includes('Assessor') && u.name !== 'James Pryce' && !acHolds(b, u.name) && !mcList(b).includes(u.name) && chAssessorNames().includes(u.name));
    ok('AC1-S setup: another Assessor with a staff sign-in exists', !!OTHER, J(Object.values(TAS_USERS).map(u => u.name))); if (!OTHER) return;
    const [ok2, other] = OTHER;
    pick('aca'); go('a-batches', { id: code, tab: 'staff' });
    CH_AROLES.forEach(([k]) => { const s = $1('#ch-as-' + k); if (s) s.value = other.name; });
    ACT.chAssessSave({ dataset: { b: code } }); reason('AC-1 reassign');
    ok('AC1-S the Assessors panel now names ' + other.name + ' for every role', CH_AROLES.every(([k]) => chAllocOf(b)[k] === other.name), J(chAllocOf(b)));
    TCH('S'); const oldB = AC_OLD.tasBatches().map(x => x.code);
    ok('AC1-S baseline: before AC-1 the removed Assessor\'s batch list still had the batch', oldB.includes(code), J(oldB));
    const bs = tasBatches().map(x => x.code), ls = tasLearners(true).map(l => l.lid);
    ok('AC1-S the removed Assessor (James) no longer has the batch or its learners', !bs.includes(code) && !ls.includes(AM) && !ls.includes(DV), J({ bs, ls }));
    go('t-students'); ok('AC1-S screen: James\'s My Students no longer lists Amira or Dev', !/Amira|Dev Patel/.test(main()));
    const q10 = STORE.worlds.CD1.assignments.find(x => x.id === 'a10').qs[0], j0 = r3Judg(kA10).length, o0 = J(r3Out(kA10)); ACT.mkMet({ dataset: { k: kA10, q: q10.id, v: 'Not Met' } }); ACT.r3Declare({ dataset: { k: kA10 } }); const mD = !!MODAL; closeModal(); ACT.mkRelease({ dataset: { k: kA11 } }); const mR = !!MODAL; closeModal();
    ok('AC1-S the removed Assessor can\'t mark, declare an outcome or send marking for Amira (direct calls)', r3Judg(kA10).length === j0 && J(r3Out(kA10)) === o0 && !mD && !mR);
    go('t-students', { id: AM }); ok('AC1-S screen: James opening Amira by link is refused', !/Overview/.test(main().slice(0, 400)), main().slice(0, 160));
    TCH(ok2); ok('AC1-S the new Assessor has the batch and both learners', tasBatches().some(x => x.code === code) && [AM, DV].every(l => tasLearners(true).some(L => L.lid === l)));
    // Restore James; then a per-learner override for Amira only
    pick('aca'); go('a-batches', { id: code, tab: 'staff' }); CH_AROLES.forEach(([k]) => { const s = $1('#ch-as-' + k); if (s) s.value = 'James Pryce'; }); ACT.chAssessSave({ dataset: { b: code } }); reason('AC-1 restore');
    ok('AC1-S James restored as the batch Assessor', CH_AROLES.every(([k]) => chAllocOf(b)[k] === 'James Pryce'));
    TCH(ok2); ok('AC1-S the replaced Assessor loses the batch again', !tasBatches().some(x => x.code === code) && !tasLearners(true).some(L => L.lid === AM));
    pick('aca'); ACT.chOvSet({ dataset: { l: AM, k: 'obs' } }); if (MODAL) { $1('#ch-ov-n').value = other.name; reason('AC-1 override'); }
    ok('AC1-S setup: ' + other.name + ' is Amira\'s observation assessor (override)', (chOvOf(AM, 'obs') || {}).name === other.name);
    TCH(ok2); const oldL = AC_OLD.tasLearners(true).map(l => l.lid), nowL = tasLearners(true).map(l => l.lid);
    ok('AC1-S baseline: before AC-1 the override exposed the whole batch (Dev too)', oldL.includes(DV), J(oldL));
    ok('AC1-S an override gives that learner only (Amira, not Dev)', nowL.includes(AM) && !nowL.includes(DV), J(nowL));
    go('t-students', { id: DV }); ok('AC1-S screen: the override holder opening Dev by link is refused', !/Overview/.test(main().slice(0, 400)));
    pick('aca'); ACT.chOvReset({ dataset: { l: AM, k: 'obs' } }); reason('AC-1 reset');
    TCH(ok2); ok('AC1-S resetting the override removes Amira too', !tasLearners(true).some(L => L.lid === AM));
  });

  // Reproduce the original defects with the handlers kept from before AC-1 (these records are discarded by the next fixture load)
  await T('AC1-0 client baseline reproductions', async () => {
    const kD11 = DV + '~a11', a = submitAsg('nvq-fa', 'a11');
    pick('assessor'); const d0 = dft(kD11); markable(tasAsg(tasSubs(true).find(s => s.key === kD11))).forEach(q => { d0.items[q.id] = { exit: 'pass', rag: 'G', fb: 'AC-1 baseline.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: kD11 } }); prim(); closeModal();
    pick('nvq-fa'); const pend = !!relStore()[kD11]; _rnAC(kD11); await sleep(20);
    ok('AC1-0 baseline: before AC-1 the learner released his own marking (releaseNow had no actor check)', pend && !relStore()[kD11] && a.status !== 'Submitted', a.status);
    pick('assessor'); const r0 = r3Out(kA10).result; ACT.tasDC({ dataset: { k: kA10 } }); $1('#dc-rec').value = 'r3-outcome'; $1('#dc-new').value = r0 === 'Pass' ? 'Fail' : 'Pass'; $1('#dc-r').value = 'AC-1 baseline'; prim(); closeModal();
    const it = ADMIN.queue.find(i => i.data && i.data.r3out && i.data.r3out.key === kA10 && isOpen(i));
    pick('coord1'); if (it) _adAC(it, 'approveFinal', 'baseline', {});
    ok('AC1-0 baseline: before AC-1 a Coordinator gave the final approval of an outcome correction', !!it && r3Out(kA10).result !== r0, r0 + ' → ' + r3Out(kA10).result);
    const b = bCD();
    pick('nvq-fa'); _cbAC({ dataset: { id: b.code } }); const m1 = !!MODAL; closeModal();
    ok('AC1-0 baseline: before AC-1 a learner got the Cancel batch confirmation', m1);
    const st0 = b.status; _blAC({ dataset: { id: b.code, to: 'Completed' }, textContent: 'x' }); const m2 = !!MODAL || b.status === 'Completed'; closeModal(); b.status = st0;
    ok('AC1-0 baseline: before AC-1 a learner could start a batch status change', m2);
    pick('teacher'); _kaAC(); const m3 = !!MODAL; closeModal(); ok('AC1-0 baseline: before AC-1 a Teacher got the Staff Allocations dialog', m3);
    const d = STORE.worlds.CD2.docs[0]; pick('fin'); _uobAC({ dataset: { v: 'CD2', d: d.id } }); const m4 = !!MODAL; closeModal(); ok('AC1-0 baseline: before AC-1 Finance got the upload-on-behalf dialog', m4);
  });

  // AC-3 (B2-D5) Assign / change batch for a learner with an account
  let NB = null;
  await T('AC1-M batch move', async () => {
    pick('aca'); ACT.newBatch(); if (!MODAL) { ok('AC1-M setup: new batch wizard opens', false); return; }
    $1('#nb-c').value = 'DEMO-L3-MAR27'; const co = $1('#nb-co'); co.value = [...co.options].map(o => o.value).filter(Boolean)[0]; if (INP.n2NbCourse) INP.n2NbCourse(co);
    $a('#modal-root .m-m').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
    if ($1('#nb-s')) $1('#nb-s').value = new Date(now().getTime() + 120 * 864e5).toISOString().slice(0, 10); if ($1('#nb-e')) $1('#nb-e').value = new Date(now().getTime() + 480 * 864e5).toISOString().slice(0, 10);
    if ($1('#nb-m')) $1('#nb-m').value = 'Online'; if ($1('#nb-cap')) $1('#nb-cap').value = '10';
    prim(); const ac = $1('#nb-ac'); if (ac) ac.value = 'Laura Kemp'; $a('#modal-root .mc-nb-c').forEach(i => { if (i.value === 'Laura Kemp') i.checked = true; }); $a('#modal-root .nb-t').forEach(i => { if (i.value === 'Tom Whitfield') i.checked = true; }); $a('#modal-root .nb-a').forEach(i => { if (i.value === 'Sarah Okonkwo') i.checked = true; });
    prim(); prim(); prim(); prim(); closeModal();
    NB = ADMIN.batches.find(x => x.code === 'DEMO-L3-MAR27'); ok('AC1-M setup: temporary batch DEMO-L3-MAR27 created (Planned)', !!NB && NB.status === 'Planned', NB && NB.status); if (!NB) return;
    ACT.batchLife({ dataset: { id: NB.code, to: 'Open' }, textContent: 'Open for enrolment' }); reason();
    ok('AC1-M the Academic Admin opens it (the next lifecycle step)', NB.status === 'Open', NB.status);
    const b = bCD(); ACT.chMoveBatch({ dataset: { id: AM } }); if (MODAL) { $1('#ch-mv-b').value = NB.code; reason('AC-1 move'); }
    ok('AC1-M Amira\'s record names the new batch', STORE.worlds.CD1.signup.batch === NB.code, STORE.worlds.CD1.signup.batch);
    ok('AC1-M her cohort place moved (new batch has her, old batch does not)', chCohLids(NB).includes(AM) && !chCohLids(b).includes(AM), J({ nb: chCohLids(NB), b: chCohLids(b) }));
    ok('AC1-M her Coordinator allocation moved: none left in the old batch, a Coordinator of the new batch now', !(b.mcA || {})[AM] && mcHas(NB, mcOf(AM, NB)) && (b.mcH || []).some(h => h.lid === AM && h.kind === 'moved'), J({ old: (b.mcA || {})[AM], nw: mcOf(AM, NB) }));
    COO('A'); go('c-learner', { id: AM }); ok('AC1-M Dr Helen Carter (old batch) can no longer open Amira', /access|lock|denied/i.test(main().slice(0, 240)), main().slice(0, 160));
    TCH('T'); ok('AC1-M the old Teacher no longer lists Amira', !tasLearners(true).some(l => l.lid === AM));
    TCH('S'); ok('AC1-M the old Assessor no longer lists Amira', !tasLearners(true).some(l => l.lid === AM));
    if (TAS_USERS.W) { TCH('W'); ok('AC1-M the new batch\'s Teacher (Tom) lists Amira', tasLearners(true).some(l => l.lid === AM)); }
    const ppl = J(lpPeople(STORE.worlds.CD1).map(x => x.name)), want = [mcOf(AM, NB)].concat(NB.teachers || [], [chEff(AM, 'asg', NB)]);
    ok('AC1-M Amira\'s Your people (drawn from the batch records) names the new batch\'s Coordinator, Teacher and Assessor, not the old batch\'s', want.every(n => ppl.includes(n)) && !/Dr Helen Carter|Marcus Bell|James Pryce/.test(ppl), ppl + ' want ' + J(want));
    pick('nvq-sp'); go('programme'); ok('AC1-M screen: Amira\'s Your people card shows her new Coordinator', !$1('main .lp-people') || $1('main .lp-people').textContent.includes(mcOf(AM, NB)));
  });

  // AC-2 (B2-D2) authorised cancellation: every learner with an account is moved or told
  await T('AC1-C cancellation by the Academic Admin', async () => {
    const b = bCD(); pick('aca'); ACT.cancelBatch({ dataset: { id: code } }); if (!MODAL) { ok('AC1-C cancel dialog opens', false); return; }
    const sels = $a('#modal-root .cb-d'), sd = sels.find(s => s.dataset.id === DV), toNB = sd && [...sd.options].some(o => o.value === (NB && NB.code));
    sels.forEach(s => { s.value = 'refund'; }); if (toNB) sd.value = NB.code;
    const n0 = STORE.worlds.CD2.notifs.length; reason('AC-1 cancel before start');
    ok('AC1-C the batch is cancelled', b.status === 'Cancelled', b.status);
    if (toNB) ok('AC1-C Dev, moved to DEMO-L3-MAR27, has his record, cohort place and Coordinator there', STORE.worlds.CD2.signup.batch === NB.code && chCohLids(NB).includes(DV) && !chCohLids(b).includes(DV) && mcHas(NB, mcOf(DV, NB)), J({ sb: STORE.worlds.CD2.signup.batch }));
    else ok('AC1-C Dev (refund) is told the batch was cancelled', STORE.worlds.CD2.notifs.slice(0, STORE.worlds.CD2.notifs.length - n0).some(n => /cancel/i.test(J(n))));
    ACT.cancelBatch({ dataset: { id: code } }); const m = !!MODAL; closeModal(); ok('AC1-C a cancelled batch can\'t be cancelled again', !m);
  });
  await T('AC1-0 client baseline: batch move', async () => {
    const nb2 = JSON.parse(J(bCD())); nb2.code = 'AC1-TMP'; nb2.coh = []; nb2.mcA = {}; nb2.status = 'Open'; ADMIN.batches.push(nb2);
    const from = ADMIN.batches.find(x => chCohLids(x).includes(DV)); if (from) _mvAC(DV, from, nb2, 'baseline');
    ok('AC1-0 baseline: before AC-1 a move left the learner\'s cohort place in the old batch', !!from && chCohLids(from).includes(DV) && !chCohLids(nb2).includes(DV));
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy();
  const Q = id => ADMIN.queue.find(x => x.id === id);
  const lastAud = () => ADMIN.audit[0] ? ADMIN.audit[0].action : '';

  await T('AC1-Q academic queue: decider and decide-once', async () => {
    ACA(); const i = qItem('AQ-R-1077-F'), rq = i && i.req, rm = rq && shReqMod(STORE.worlds.F, rq), max0 = rm ? rm.m.quiz.max : null;
    ok('AC1-Q setup: the extra-attempts request is open', !!i && isOpen(i)); if (!i) return;
    for (const [n, f] of Object.entries(LROLES).filter(([n]) => !['aca', 'super'].includes(n))) { f(); const s0 = sec(); const r = applyDecision(i, 'grant', 'AC-1', {}); ACT.qDo({ dataset: { id: i.id, a: 'grant' } }); const m = !!MODAL; closeModal(); ok('AC1-Q ' + n + ' cannot decide an Academic Admin item (dialog and direct call)', r === false && !m && isOpen(i) && rq.status !== 'Granted' && sec() > s0, J({ r, m, st: i.status })); }
    ACA(); applyDecision(i, 'reject', 'AC-1 reject', {}); const iR = qItem(i.id);
    ok('AC1-Q the Academic Admin rejects it', rq.status === 'Rejected' && iR.status === 'Rejected');
    for (const [n, f] of [['aca', ACA], ['super', SA]]) { f(); const s0 = sec(); const r = applyDecision(i, 'grant', 'AC-1 again', {}); ACT.qDo({ dataset: { id: i.id, a: 'grant' } }); const m = !!MODAL; closeModal(); ok('AC1-Q ' + n + ' cannot grant the rejected request (decide-once; the override is the separate path)', r === false && !m && rq.status === 'Rejected' && (rm ? rm.m.quiz.max === max0 : true) && sec() > s0); }
    ACA(); go('a-queue', { id: i.id }); ok('AC1-Q screen: the decided item offers no decision buttons', !$a('main [data-act="qDo"]').some(b => b.dataset.a !== 'note'));
    SA(); ACT.qOverride({ dataset: { id: i.id } }); if (MODAL) { const s = $1('#ovr'); if (s) s.value = 'Approved'; reason('AC-1 override'); }
    ok('AC1-Q the Super Administrator\'s override is still the one way to change it, and applies the grant once', rq.status === 'Granted' && (rm ? rm.m.quiz.max === max0 + 3 : true), J({ rq: rq.status, max: rm && rm.m.quiz.max }));
    ACA(); const j = qItem('AQ-R-1051'), w = STORE.worlds.A, en = j && w.enrolments.find(e => e.title === j.req.target);
    ACA(); applyDecision(j, 'extend', 'AC-1 one', { days: 14 }); const e1 = en && en.end; applyDecision(j, 'extend', 'AC-1 two', { days: 30 }); applyDecision(j, 'reject', 'AC-1 three', {});
    ok('AC1-Q more time is extended once; a second extension or a reject after it is refused', !!en && en.end === e1 && j.req.status === 'Granted', J({ e1, now: en && en.end, rq: j.req.status }));
    const k = Q('AQ-4010'), wd = STORE.worlds.D;
    for (const n of ['business', 'finance', 'sysadmin', 'teacher', 'coordinator', 'agency', 'learner']) { LROLES[n](); applyDecision(k, 'approve', 'AC-1', {}); ok('AC1-Q ' + n + ' cannot approve an academic discontinuation', isOpen(k) && wd.nvq.status === 'Active', wd.nvq.status); }
    ACA(); applyDecision(k, 'approve', 'AC-1 approve', {}); const n0 = wd.notifs.length, a0 = ADMIN.audit.length;
    ok('AC1-Q the Academic Admin approves the discontinuation', k.status === 'Approved' && wd.nvq.status === 'Discontinued');
    applyDecision(k, 'approve', 'AC-1 again', {}); applyDecision(k, 'reject', 'AC-1 reverse', {});
    ok('AC1-Q approving again does not notify or log the effect twice; reject after approve is refused', wd.notifs.length === n0 && k.status === 'Approved' && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(a => a.action === 'Enrolment discontinued'));
    const own = Q('AQ-4008'); ACA(); const s0 = own.status; ['exceptional', 'decline', 'reject', 'approve'].forEach(a => applyDecision(own, a, 'self', { date: '2026-12-01' }));
    ok('AC1-Q self-approval stays blocked (unchanged)', own.status === s0);
    const esc = ADMIN.queue.find(x => x.status === 'Escalated' && ACA_TYPES.includes(x.type));
    if (esc) { ACA(); applyDecision(esc, 'approve', 'AC-1', {}); ok('AC1-Q an escalated academic item is the Super Administrator\'s', esc.status === 'Escalated'); }
  });

  await T('AC1-O office observation requests', async () => {
    const i = Q('AQ-9201'), r = i && chOrOf(i.data.req); ok('AC1-O setup: an office observation request is open', !!r && isOpen(i)); if (!r) return;
    for (const n of ['finance', 'sysadmin', 'business', 'teacher', 'learner', 'agency']) { LROLES[n](); const x = applyDecision(i, 'approve', 'AC-1', {}); ok('AC1-O ' + n + ' cannot decide an office observation request', x === false && isOpen(i) && r.status === 'Pending approval', r.status); }
    ACA(); applyDecision(i, 'reject', 'AC-1 reject', {}); ok('AC1-O the Academic Admin rejects it', r.status === 'Rejected');
    for (const n of ['aca', 'finance', 'sysadmin', 'super']) { LROLES[n](); applyDecision(i, 'approve', 'AC-1 after', {}); ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); const m = !!MODAL; closeModal(); ok('AC1-O ' + n + ' cannot approve the rejected request (no booking opens)', r.status === 'Rejected' && !m && !chOrApproved(r.lid)); }
    const lid = STORE.worlds.C.me.id, r2 = chOrCreate(lid, 'learner', 'AC-1 request', 'Learner'), i2 = Q(r2.qid);
    const v = ['A', 'B'].find(x => { COO(x); return chIsMyBatchLid(lid); });
    const vOther = ['A', 'B'].find(x => x !== v); if (vOther) { COO(vOther); if (!chIsMyBatchLid(lid)) { applyDecision(i2, 'approve', 'AC-1', {}); ok('AC1-O a Coordinator of another batch cannot decide it', isOpen(i2)); } }
    if (v) { COO(v); applyDecision(i2, 'approve', 'AC-1 batch Coordinator', {}); ok('AC1-O the learner\'s batch Coordinator approves it', r2.status === 'Approved', r2.status); }
    else ok('AC1-O setup: Grace has a batch Coordinator', false);
  });

  await T('AC1-DC Data Correction final approval (certificate reissue)', async () => {
    const i = Q('AQ-1004'), w = STORE.worlds[i.data.v], c = w && w.certs.find(x => x.id === i.data.cert), no0 = c && c.no;
    for (const n of ['aca', 'sysadmin', 'finance', 'business', 'coordinator', 'teacher']) { LROLES[n](); const x = applyDecision(i, 'approveFinal', 'AC-1', {}); ok('AC1-DC ' + n + ' cannot give the final approval', x === false && isOpen(i) && c.no === no0); }
    AS('SY'); ACT.qDo({ dataset: { id: i.id, a: 'forward' } }); reason('First review'); ok('AC1-DC the System Administrator forwards it', i.stage === 'final' && isOpen(i));
    SA(); ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); reason('Final'); const no1 = c.no, l1 = (c.lineage || []).length;
    ok('AC1-DC the Super Administrator approves: the certificate is re-issued', i.status === 'Approved' && no1 !== no0, no0 + ' → ' + no1);
    applyDecision(i, 'approveFinal', 'again', {}); ok('AC1-DC approving again does not re-issue it a second time', c.no === no1 && (c.lineage || []).length === l1, c.no);
  });

  await T('AC1-OB observation confirm / cancel', async () => {
    const w = STORE.worlds.C, done = w.observations.find(x => x.status === 'Completed');
    for (const n of ['finance', 'business', 'teacher', 'learner', 'sysadmin']) { if (!done) break; LROLES[n](); const s0 = sec(); ACT.obsAdmin({ dataset: { v: 'C', id: done.id, a: 'Cancelled' } }); const m = !!MODAL; if (MODAL) reason(); ok('AC1-OB ' + n + ' cannot cancel an observation', done.status === 'Completed' && !m && sec() > s0); }
    if (done) { ACA(); ACT.obsAdmin({ dataset: { v: 'C', id: done.id, a: 'Cancelled' } }); const m = !!MODAL; if (MODAL) reason(); ok('AC1-OB a completed, signed-off observation can\'t be cancelled (Academic Admin)', done.status === 'Completed' && !m); }
    const perm = w.workplace.perm, o = { id: 'oAC1', at: D(5, '10:00'), loc: w.workplace.name, assessor: 'James Pryce', scope: 'U306 3.1', status: 'Proposed' }; w.observations.unshift(o);
    w.workplace.perm = 'Withdrawn'; ACA(); ACT.obsAdmin({ dataset: { v: 'C', id: o.id, a: 'Confirmed' } }); if (MODAL) reason();
    ok('AC1-OB a workplace observation can\'t be confirmed while the workplace\'s permission is withdrawn', o.status === 'Proposed');
    w.workplace.perm = 'Granted'; ACT.obsAdmin({ dataset: { v: 'C', id: o.id, a: 'Confirmed' } }); if (MODAL) reason('Learner agreed by phone');
    ok('AC1-OB with permission granted, the Academic Admin confirms it', o.status === 'Confirmed', o.status);
    ACT.obsAdmin({ dataset: { v: 'C', id: o.id, a: 'Confirmed' } }); const m2 = !!MODAL; closeModal(); ok('AC1-OB confirming it again is refused', !m2);
    ACT.obsAdmin({ dataset: { v: 'C', id: o.id, a: 'Cancelled' } }); if (MODAL) reason('Assessor unwell'); ok('AC1-OB the Academic Admin cancels a confirmed observation', o.status === 'Cancelled', o.status);
    w.workplace.perm = perm;
  });

  await T('AC1-CT certificate revoke / retry', async () => {
    const c = STORE.worlds.A.certs.find(x => x.status === 'Valid'); ok('AC1-CT setup: a valid certificate', !!c); if (!c) return;
    for (const n of ['finance', 'aca', 'sysadmin', 'business', 'teacher', 'learner', 'agency']) { LROLES[n](); const s0 = sec(); ACT.revokeCert({ dataset: { k: 'A:' + c.id } }); const m = !!MODAL; if (MODAL) reason(); ACT.certRetry({ dataset: { k: 'A:' + c.id, id: c.id } }); closeModal(); ok('AC1-CT ' + n + ' cannot revoke or re-try a certificate', c.status === 'Valid' && !m && sec() >= s0 + 2); }
    SA(); ACT.revokeCert({ dataset: { k: 'A:' + c.id } }); reason('Issued in error'); ok('AC1-CT the Super Administrator revokes it', c.status === 'Revoked');
  });

  await T('AC1-L override in legacy data gives that learner only', async () => {
    const hit = ADMIN.batches.map(b => [b, acOvLids(b, 'James Pryce')]).find(([b, l]) => l.length && !acHolds(b, 'James Pryce'));
    if (!hit) { ok('AC1-L setup: James holds a learner override outside his batches', false); return; }
    const [b, lids] = hit; TCH('S'); const nowL = tasLearners(true).filter(L => L.batch && L.batch.code === b.code).map(L => L.lid), old = AC_OLD.tasLearners(true).filter(L => L.batch && L.batch.code === b.code).map(L => L.lid);
    ok('AC1-L baseline: before AC-1 James saw ' + old.length + ' learners of ' + b.code, old.length > lids.length, J(old));
    ok('AC1-L James sees only his override learners in ' + b.code, nowL.length === lids.length && nowL.every(l => lids.includes(l)), J({ nowL, lids }));
  });

  // AC-4 (B3-04): a test-only learner on two programmes that share assignment IDs (Chloe Martin in Level 3; a Level 2 place added here)
  await T('AC1-P two programmes, separate assessment records', async () => {
    const CHLOE = 'IA-L-30237', L3B = 'L3AC-JAN26', L2B = 'L2DC-MAR26', P2 = 'Level 2 Diploma in Care (England)', P3 = 'Level 3 Diploma in Adult Care (England)', BCN = 'BrightCare Staffing Ltd (demo)';
    const b3 = ADMIN.batches.find(b => b.code === L3B), b2 = ADMIN.batches.find(b => b.code === L2B), L = learnerById(CHLOE);
    // a published outcome kept under the plain key before the second programme: stamped Level 3 (a7) and ambiguous (a6)
    R3().out[CHLOE + '~a7'] = { aid: 'a7', title: 'a7', result: 'Pass', feedback: 'AC1 pre-existing Level 3 outcome', by: 'Sarah Okonkwo', published: true, at: D(-5), hist: [], round: 'Sub 1', own: { prog: P3, batch: L3B } };
    R3().out[CHLOE + '~a6'] = { aid: 'a6', title: 'a6', result: 'Fail', feedback: 'AC1 ambiguous outcome', by: 'Sarah Okonkwo', published: true, at: D(-5), hist: [], round: 'Sub 1', own: { ambiguous: true } };
    L._enr.push({ id: 'pAC1', title: P2, type: 'NVQ / RQF', status: 'Active', enrolled: D(-30), start: D(-30), end: D(300), progress: 10, sponsor: BCN, version: 'Version 1' });
    b2.coh.push({ lid: CHLOE, flags: [], last: D(-1), att: 80, pd: [], seed: 7, subs: { a4: 'Resubmission Required', a5: 'Submitted', a6: 'Submitted' } });
    (STORE.agy.linked[BCN] = STORE.agy.linked[BCN] || []).push(CHLOE);
    ok('AC1-P setup: Chloe is on two programmes; Level 3 Assessor Sarah, Level 2 Assessor James', acProgsOf(CHLOE).size === 2 && chEff(CHLOE, 'asg', b3) === 'Sarah Okonkwo' && chEff(CHLOE, 'asg', b2) === 'James Pryce');
    const keyOf = (v, aid) => { TCH(v); const s = tasSubs(true).find(x => x.L.lid === CHLOE && x.a.id === aid); return s && s.key; };
    const kS4 = keyOf('A', 'a4'), kJ4 = keyOf('S', 'a4'), kS5 = keyOf('A', 'a5'), kJ5 = keyOf('S', 'a5');
    const plain = k => String(k).split('~').slice(0, 2).join('~');
    ok('AC1-P baseline: before AC-1 both programmes\' rows used one record (' + CHLOE + '~a4)', !!kS4 && !!kJ4 && plain(kS4) === plain(kJ4));
    ok('AC1-P each programme has its own assessment record (Level 3 and Level 2 keys differ)', kS4 !== kJ4 && kS5 !== kJ5, J({ kS4, kJ4 }));
    const decide = (k, res, fb) => { ACT.r3Declare({ dataset: { k } }); if (!MODAL) return 'no dialog'; $1('input[name="r3-res"][value="' + res + '"]').checked = true; $1('#d-ofb').value = fb; $1('#rsn').value = 'AC-1 rationale'; return act('Publish to learner'); };
    TCH('A'); decide(kS4, 'Pass', 'AC1 Level 3 overall (Sarah)'); TCH('S'); decide(kJ4, 'Fail', 'AC1 Level 2 overall (James)');
    ok('AC1-P the Level 3 Pass survives the Level 2 Fail on the same assignment ID', r3Out(kS4) && r3Out(kS4).result === 'Pass' && r3Out(kS4).by === 'Sarah Okonkwo' && r3Out(kJ4) && r3Out(kJ4).result === 'Fail' && r3Out(kJ4).by === 'James Pryce');
    ok('AC1-P each outcome is stamped with its own programme', r3Out(kS4).own && r3Out(kS4).own.batch === L3B && r3Out(kJ4).own && r3Out(kJ4).own.batch === L2B, J([r3Out(kS4).own, r3Out(kJ4).own]));
    TCH('A'); go('t-mark', { id: kS4 }); ok('AC1-P screen: Sarah\'s Level 3 workspace shows Pass', /Pass/.test((($1('main .r3-out') || {}).textContent || '')) && !/AC1 Level 2/.test(main()));
    AGY('AG-02'); const cp = agyOutcomes(CHLOE), cpr = cp && cp.progs.map(p => p.rows.find(r => r.aid === 'a4')).find(Boolean);
    AGY('AG-01'); const bc = agyOutcomes(CHLOE), bcr = bc && bc.progs.map(p => p.rows.find(r => r.aid === 'a4')).find(Boolean);
    ok('AC1-P each sponsoring agency sees its own programme\'s outcome (CarePlus Pass, BrightCare Fail)', cpr && cpr.result === 'Pass' && bcr && bcr.result === 'Fail', J({ cpr: cpr && cpr.result, bcr: bcr && bcr.result }));
    TCH('S'); const q = tasAsg(tasSubs(true).find(s => s.key === kJ5)).qs[0]; ACT.mkMet({ dataset: { k: kJ5, q: q.id, v: 'Not Met' } });
    ok('AC1-P criterion judgements are separate (James\'s Level 2 judgement is not on the Level 3 record)', r3Judg(kJ5).length > 0 && !r3Judg(kS5).some(j => j.by === 'James Pryce'));
    TCH('A'); const d3 = dft(kS5); ok('AC1-P marking drafts are separate', !Object.values(d3.items || {}).some(x => x.met === 'Not Met'));
    const before = (TCH('A'), tasSubs(true).find(s => s.key === kS5)).status;
    TCH('S'); const d = dft(kJ5); markable(tasAsg(tasSubs(true).find(s => s.key === kJ5))).forEach(qq => { d.items[qq.id] = { exit: 'pass', rag: 'G', fb: 'L2 fine', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: kJ5 } }); prim(); closeModal();
    TCH('A'); const s3 = tasSubs(true).find(s => s.key === kS5);
    ok('AC1-P a Level 2 send-for-release does not lock or change the Level 3 record', !!relStore()[kJ5] && !relStore()[kS5] && s3.status === before && !s3.staffStatus, J({ st: s3.status, ss: s3.staffStatus }));
    const rS4 = (TCH('A'), tasSubs(true).find(s => s.key === kS4)), rJ4 = (TCH('S'), tasSubs(true).find(s => s.key === kJ4));
    ok('AC1-P submission rounds and statuses are per programme (Level 3 a4 Sub 1; Level 2 a4 Resub 1)', rS4 && rJ4 && rS4.round === 'Sub 1' && rJ4.round === 'Resub 1' && rS4.status !== rJ4.status, J([rS4 && [rS4.round, rS4.status], rJ4 && [rJ4.round, rJ4.status]]));
    const coOf = key => ['A', 'B'].find(v => { COO(v); return mySubmissions(true).some(x => x.key === key); });
    const c2 = coOf(kJ5), c3 = coOf(kS5);
    COO(c3); const l3 = mySubmissions(true).filter(x => x.L.lid === CHLOE); COO(c2); const l2 = mySubmissions(true).filter(x => x.L.lid === CHLOE);
    ok('AC1-P each programme\'s Coordinator lists only that programme\'s rows for Chloe', c2 && c3 && c2 !== c3 && l3.every(x => x.L.batch.code === L3B) && l2.every(x => x.L.batch.code === L2B) && l3.length && l2.length, J({ c2, c3 }));
    COO(c2); go('c-sub', { id: kJ5 }); const qb = $a('main [data-act="r3CooJudge"]')[0], qid = qb && qb.dataset.q;
    if (qid) { $1('#r3-cv-' + qid).value = 'Met'; $1('#r3-ct-' + qid).value = 'AC1 Level 2 coordinator feedback'; ACT.r3CooJudge({ dataset: { k: kJ5, q: qid } }); }
    COO(c3); go('c-sub', { id: kS5 }); const h3 = main();
    ok('AC1-P Coordinator criterion feedback is per programme (the Level 2 feedback is not on, or shown with, the Level 3 record)', !!qid && r3Judg(kJ5).some(j => j.role === 'Academic Coordinator') && !r3Judg(kS5).some(j => /AC1 Level 2/.test(j.text || j.note || J(j))) && !/AC1 Level 2 coordinator feedback/.test(h3));
    COO(c3); const sX = sec(), rX = releaseNow(kJ5); ok('AC1-P the Level 3 Coordinator cannot release the Level 2 marking', rX === false && !!relStore()[kJ5] && sec() > sX);
    COO(c2); ACT.relOne({ dataset: { k: kJ5 } }); prim(); closeModal(); await sleep(30); TCH('A'); const s3b = tasSubs(true).find(s => s.key === kS5);
    ok('AC1-P the Level 2 Coordinator releases the Level 2 marking; the Level 3 record is untouched', !relStore()[kJ5] && !!STORE.tas.rel[kJ5] && !STORE.tas.rel[kS5] && s3b.status === before, J({ rel: STORE.tas.rel[kJ5] && STORE.tas.rel[kJ5].status, l3: s3b.status }));
    const kS7 = acKey(CHLOE, 'a7', b3), kJ7 = acKey(CHLOE, 'a7', b2), kS6 = acKey(CHLOE, 'a6', b3), kJ6 = acKey(CHLOE, 'a6', b2);
    ok('AC1-P an outcome recorded before, stamped Level 3, stays with Level 3 only', r3Out(kS7) && r3Out(kS7).result === 'Pass' && !r3Out(kJ7), J({ kS7, kJ7 }));
    ok('AC1-P an outcome recorded before whose programme can\'t be proved is shown to neither programme (fail closed) and is kept', !r3Out(kS6) && !r3Out(kJ6) && !!R3().out[CHLOE + '~a6']);
    ok('AC1-P a learner on one programme keeps the learner~assignment key', acKey('IA-L-30755', 'a4', b2) === 'IA-L-30755~a4');
  });

  // A learner with an account (one NVQ) placed in another programme's cohort — test-only; Add learner refuses a second active batch
  await T('AC1-P2 account learner in another programme\'s cohort fails closed', async () => {
    const w = STORE.worlds.D, G = w.me.id, own = ADMIN.batches.find(b => chCohLids(b).includes(G)), b3 = ADMIN.batches.find(b => b.code === 'L3AC-JAN26');
    ok('AC1-P2 setup: Grace (account) is in ' + (own && own.code) + ' on ' + w.nvq.title, !!own && own.course === w.nvq.title && b3.course !== w.nvq.title);
    const aO = chEff(G, 'asg', own), tO = Object.entries(TAS_USERS).find(([k, u]) => u.name === aO);
    const ownRows = () => { if (!tO) return []; TCH(tO[0]); return tasSubs(true).filter(s => s.L.lid === G); }, before = J(ownRows().map(s => [s.key, s.status]));
    b3.coh.push({ v: 'D', lid: G, flags: [], last: D(-1), att: 80, pd: [], seed: 3 });
    TCH('A'); const sar = tasSubs(true).filter(s => s.L.lid === G && s.L.batch.code === b3.code);
    COO('A'); const hel = mySubmissions(true).filter(s => s.L.lid === G && s.L.batch.code === b3.code);
    ok('AC1-P2 the other programme\'s Assessor and Coordinator see none of her assignment records (fail closed)', !sar.length && !hel.length, J({ sar: sar.length, hel: hel.length }));
    ok('AC1-P2 her own programme still sees them under learner~assignment (the key her portal reads)', !!tO && J(ownRows().map(s => [s.key, s.status])) === before && JSON.parse(before).every(([k]) => k.split('~').length === 2), before.slice(0, 160));
    learner('D'); go('assignments'); ok('AC1-P2 her own assignment list is unchanged', /Assignment/.test(main()));
  });

  /* ================= Legacy baseline reproductions ================= */
  fxLoadLegacy();
  await T('AC1-0 legacy baseline reproductions', async () => {
    ACA(); const i = qItem('AQ-R-1077-F'), rq = i.req; _adAC(i, 'reject', 'baseline', {}); _adAC(i, 'grant', 'baseline', {});
    ok('AC1-0 baseline: before AC-1 a rejected extra-attempts request could then be granted', rq.status === 'Granted', rq.status);
    const k = Q('AQ-4010'); AS('BA'); _adAC(k, 'approve', 'baseline', {}); ok('AC1-0 baseline: before AC-1 the Business Admin approved an academic discontinuation', STORE.worlds.D.nvq.status === 'Discontinued');
    const dci = Q('AQ-1004'); ACA(); _adAC(dci, 'approveFinal', 'baseline', {}); ok('AC1-0 baseline: before AC-1 the Academic Admin gave a Data Correction\'s final approval', dci.status === 'Approved');
    const c = STORE.worlds.A.certs.find(x => x.status === 'Valid'); AS('FA'); AC_OLD.revokeCert({ dataset: { k: 'A:' + c.id } }); const m = !!MODAL; closeModal(); ok('AC1-0 baseline: before AC-1 Finance got the Revoke certificate dialog', m);
    const o = STORE.worlds.C.observations.find(x => x.status === 'Completed'); if (o) { _obAC({ dataset: { v: 'C', id: o.id, a: 'Cancelled' } }); const m2 = !!MODAL; closeModal(); ok('AC1-0 baseline: before AC-1 Finance got the dialog to cancel a completed observation', m2); }
  });

  /* ================= Reset ================= */
  await T('AC1-Z client demo reset', async () => {
    fxLoadClient(); ok('AC1-Z loading the client demo restores the starting records (no temporary batch, no AC-1 records)', snapCD() === cd0 && !ADMIN.batches.some(b => ['DEMO-L3-MAR27', 'AC1-TMP'].includes(b.code)), snapCD().slice(0, 200));
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
