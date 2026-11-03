// IQA-S — IQA allocation follows the batch staff permission (PD-IQB-09). suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo): a System Administrator creates a batch with an IQA, then assigns (several batches), removes and reassigns
// on the Staff tab; independence; Academic Admin and Super Administrator unchanged; every other role refused in the handlers.
// Phase 1: a real refresh, Reset demo, then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-iqbs.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-iqbs.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'IQBS test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-iqbs.R', J(R)); SS.setItem('ft-iqbs.phase', String(ph)); location.reload(); };
  const aud = act => ADMIN.audit.filter(a => a.action === act);
  const step = () => (/step (\d) of 5/.exec((MODAL && MODAL.title) || '') || [])[1];
  const wiz1 = code => { ACT.newBatch(); $1('#nb-c').value = code; const co = $1('#nb-co'); co.value = [...co.options].map(o => o.value).filter(Boolean)[0]; if (INP.n2NbCourse) INP.n2NbCourse(co);
    $a('#modal-root .m-m').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
    if ($1('#nb-s')) $1('#nb-s').value = new Date(now().getTime() + 120 * 864e5).toISOString().slice(0, 10); if ($1('#nb-e')) $1('#nb-e').value = new Date(now().getTime() + 480 * 864e5).toISOString().slice(0, 10);
    if ($1('#nb-m')) $1('#nb-m').value = 'Online'; if ($1('#nb-cap')) $1('#nb-cap').value = '10'; prim(); };
  const tickS = ({ coord = 'Laura Kemp', teachers = ['Tom Whitfield'], assessors = ['Sarah Okonkwo'], iqas = [] }) => {
    $a('#modal-root .mc-nb-c').forEach(i => { i.checked = i.value === coord; }); const ac = $1('#nb-ac'); if (ac) { if (![...ac.options].some(o => o.value === coord)) ac.insertAdjacentHTML('beforeend', `<option>${coord}</option>`); ac.value = coord; }
    $a('#modal-root .nb-t').forEach(i => { i.checked = teachers.includes(i.value); }); $a('#modal-root .nb-a').forEach(i => { i.checked = assessors.includes(i.value); }); $a('#modal-root .iqb-nb-c').forEach(i => { i.checked = iqas.includes(i.value); }); };
  const finish = () => { for (let k = 0; k < 6 && MODAL && step() !== '5'; k++) if (prim() === false) break; const t5 = mtxt(), r = prim(); closeModal(); return { t5, r }; };
  const C1 = 'DEMO-L3-AUG27', C2 = 'DEMO-L3-SEP27', C3 = 'DEMO-L3-OCT27';
  const addRole = (name, role) => { const s = ADMIN.staff.find(x => x.name === name); if (s && !s.roles.includes(role)) { s.roles.push(role); return () => { s.roles = s.roles.filter(r => r !== role); }; } return () => {}; };

  if (PH === 0) {
    await T('IQBS System Administrator creates a batch with an IQA', async () => {
      pick('sys'); go('a-batches'); ok('IQBS setup: signed in as the System Administrator', isSys() && !isSA() && !isAca());
      wiz1(C1); const t2 = mtxt();
      ok('IQBS-01 the System Administrator\'s Staff step lists the active IQAs (optional, one or more); no "assigned afterwards" line', step() === '2' && /Internal Quality Assurer \(IQA\) — optional, one or more/.test(t2) && J($a('#modal-root .iqb-nb-c').map(i => i.value)) === J([IQA_A, IQA_B]) && !/assigned after the batch is created/.test(t2));
      const a0 = aud('IQA assigned').length, n0 = iqbS().rows.length, me = ADMIN.me.name; tickS({ iqas: [IQA_A] }); const f = finish(), b = iqbBatch(C1);
      ok('IQBS-01 the review names the IQA and the batch is created with its staff and IQA', /IQA ?Priyanka Shah/.test(f.t5) && !!b && b.coord === 'Laura Kemp' && b.teachers.includes('Tom Whitfield') && J(iqbNamesOn(C1)) === J([IQA_A]), f.t5.slice(-300));
      ok('IQBS-01 one IQB record by the System Administrator, "Allocated at batch creation", audited, notified, in the staff history', iqbS().rows.length === n0 + 1 && iqbRows(C1)[0].by === me && iqbRows(C1)[0].reason === 'Allocated at batch creation' && aud('IQA assigned').length === a0 + 1 && STORE.iqa.notifs.some(x => x.to === IQA_A && x.t === 'Batch assigned to you' && x.b.includes(C1)) && (b.staffHist || []).some(h => h[0] === 'IQA ' + IQA_A + ' assigned'));
      syncTasBatches(); ok('IQBS-01 a later sync adds no duplicate', iqbRows(C1).length === 1);
    });
    await T('IQBS System Administrator independence at creation', async () => {
      pick('sys'); const undo = [addRole('Tom Whitfield', 'IQA')];
      try {
        go('a-batches'); const l0 = ADMIN.batches.length, n0 = iqbS().rows.length; wiz1(C2); tickS({ iqas: ['Tom Whitfield'] }); const r = prim();
        ok('IQBS-02 (negative) a dual-role Teacher + IQA ticked as both is refused for the System Administrator too, logged', r === false && step() === '2' && ADMIN.audit[0].action === 'Blocked: IQA at batch creation' && /Tom Whitfield is ticked as a Teacher/.test(ADMIN.audit[0].reason));
        closeModal(); ok('IQBS-02 nothing was created', ADMIN.batches.length === l0 && !iqbBatch(C2) && iqbS().rows.length === n0);
      } finally { undo.forEach(f => f()); }
    });
    await T('IQBS System Administrator changes IQAs on the Staff tab', async () => {
      pick('sys'); go('a-batches', { id: C1, tab: 'staff' });
      ok('IQBS-03 the Staff tab gives the System Administrator Assign IQA, Reassign and Remove', !!$1('main .iqb-panel [data-act="iqbAssignDlg"]') && !!$1('main .iqb-panel [data-act="iqbMoveDlg"]') && !!$1('main .iqb-panel [data-act="iqbRemoveDlg"]'));
      const a0 = aud('IQA assigned').length; ACT.iqbAssignDlg({ dataset: { b: C1 } }); const s = $1('#iqb-n'); s.value = IQA_B; const cb = $a('#modal-root .iqb-c').find(i => i.value === CD_B); if (cb) cb.checked = true; reason('Second IQA for August and the demo batch');
      ok('IQBS-03 one dialog assigns IQA B to two batches (multi-batch), audited twice', !!cb && J(iqbNamesOn(C1)) === J([IQA_A, IQA_B]) && iqbNamesOn(CD_B).includes(IQA_B) && aud('IQA assigned').length === a0 + 2);
      ok('IQBS-03 (negative) a duplicate allocation is refused', iqbAssign(C1, IQA_B, 'again') === false && iqbRows(C1).filter(r => r.name === IQA_B).length === 1);
      ACT.iqbRemoveDlg({ dataset: { b: C1, n: IQA_B } }); const imp = mtxt(); reason('Back to one IQA');
      ok('IQBS-04 Remove shows the impact first, then ends the allocation (kept as history, audited, notified)', /loses access to DEMO-L3-AUG27/.test(imp) && J(iqbNamesOn(C1)) === J([IQA_A]) && iqbS().rows.some(r => r.batch === C1 && r.name === IQA_B && r.end && r.end.kind === 'Removed' && r.end.by === ADMIN.me.name) && aud('IQA removed')[0].entity.includes(C1) && STORE.iqa.notifs.some(x => x.to === IQA_B && x.t === 'Batch removed from you' && x.b.includes(C1)));
      ACT.iqbMoveDlg({ dataset: { b: C1, n: IQA_A } }); $1('#iqb-to').value = IQA_B; reason('Priyanka moves to the January intake');
      ok('IQBS-05 Reassign replaces the IQA (old ended "Reassigned → new", audited, both notified)', J(iqbNamesOn(C1)) === J([IQA_B]) && iqbS().rows.some(r => r.batch === C1 && r.name === IQA_A && r.end && r.end.kind === 'Reassigned' && r.end.to === IQA_B) && aud('IQA reassigned')[0].entity.includes(C1) && (iqbBatch(C1).staffHist || []).some(h => h[0] === `IQA ${IQA_A} → ${IQA_B}`));
      ok('IQBS-05 IQA B now holds two batches; the demo batch keeps IQA A', J(iqbCodesOf(IQA_B).sort()) === J([C1, CD_B].sort()) && iqbNamesOn(CD_B).includes(IQA_A));
    });
    await T('IQBS System Administrator independence later', async () => {
      pick('sys'); const b = cdBatch(), t = b.teachers[0], undo = [addRole(t, 'IQA')];
      try {
        ACT.iqbAssignDlg({ dataset: { b: CD_B } }); const o = $a('#iqb-n option').find(x => x.value === t); closeModal();
        ok('IQBS-06 (negative) the assign dialog disables someone who teaches the batch', !!o && o.disabled && /holds a role on this batch/.test(o.textContent));
        const s0 = ADMIN.security.length; ok('IQBS-06 (negative) the handler refuses them directly, logged', iqbAssign(CD_B, t, 'x') === false && !iqbNamesOn(CD_B).includes(t) && ADMIN.security.length === s0 + 1);
      } finally { undo.forEach(f => f()); }
      const c0 = b.coord; ok('IQBS-06 (negative) the batch\'s IQA can\'t be made its Coordinator by the System Administrator', changeCoordinator(CD_B, IQA_B, 'x') === false && b.coord === c0 && /is the IQA allocated to DEMO-L3-JAN27/.test(ADMIN.security[0].detail));
      const t0 = J(b.teachers); ACT.batchStaff({ dataset: { id: CD_B } }); const bt = $1('#bs-t'); if (bt) { bt.insertAdjacentHTML('beforeend', `<option>${IQA_B}</option>`); bt.value = IQA_B; reason('x'); } closeModal();
      ok('IQBS-06 (negative) … nor its Teacher', !!bt && J(b.teachers) === t0 && /is the IQA allocated/.test(ADMIN.security[0].detail));
    });
    await T('IQBS System Administrator in the Finance Admin context', async () => {
      pick('sys'); S.sysCtx = 'Finance Admin'; const n0 = iqbS().rows.length;
      ok('IQBS-07 (negative) as Finance Admin (role switch) the same person can\'t allocate IQAs', !iqbCan() && iqbAssign(C1, IQA_A, 'x') === false && iqbEnd(C1, IQA_B, 'x') === false && iqbS().rows.length === n0 && /Super Administrator, Academic Admins and System Administrators/.test(ADMIN.security[0].detail));
      S.sysCtx = 'System Administrator';
    });
    await T('IQBS Academic Admin and Super Administrator unchanged', async () => {
      for (const p of ['aca', 'super']) {
        pick(p); go('a-batches', { id: C1, tab: 'staff' }); const ctl = !!$1('main .iqb-panel [data-act="iqbAssignDlg"]');
        const ok1 = iqbAssign(C1, IQA_A, p + ' adds') === true, ok2 = iqbEnd(C1, IQA_A, p + ' removes') === true;
        ok(`IQBS-08 ${p} still assigns and removes IQAs`, ctl && ok1 && ok2 && J(iqbNamesOn(C1)) === J([IQA_B]));
      }
      pick('aca'); go('a-batches'); wiz1(C3); const l = $a('#modal-root .iqb-nb-c').length; closeModal(); ok('IQBS-08 the Academic Admin\'s Staff step still lists the IQAs', l === 2);
    });
    await T('IQBS other roles refused', async () => {
      for (const p of ['fin', 'biz', 'coord1', 'teacher', 'assessor', 'iqa', 'agency', 'nvq-sp']) {
        pick(p); const n1 = iqbS().rows.length; ACT.iqbAssignDlg({ dataset: { b: C1 } }); const o1 = !!MODAL; closeModal(); ACT.iqbMoveDlg({ dataset: { b: C1, n: IQA_B } }); const o2 = !!MODAL; closeModal(); ACT.iqbRemoveDlg({ dataset: { b: C1, n: IQA_B } }); const o3 = !!MODAL; closeModal();
        ok(`IQBS-09 (negative) ${p} can't open or call assign / reassign / remove`, !o1 && !o2 && !o3 && iqbAssign(C1, IQA_A, 'x') === false && iqbEnd(C1, IQA_B, 'x') === false && iqbEnd(C1, IQA_B, 'x', IQA_A) === false && iqbS().rows.length === n1 && J(iqbNamesOn(C1)) === J([IQA_B]));
      }
      pick('coord1'); go('c-batches', { id: CD_B }); ok('IQBS-09 the Coordinator still sees the IQA panel read-only', /Internal Quality Assurer \(IQA\)/.test(main()) && !$1('main [data-act="iqbAssignDlg"]') && !$1('main [data-act="iqbRemoveDlg"]'));
      pick('fin'); ACT.newBatch(); ok('IQBS-09 (negative) the Finance Admin can\'t open the Create batch wizard (unchanged)', !step()); closeModal();
    });
    await T('IQBS guidance', async () => {
      signOutUI(); ACT.demoSignInAsIqa({ dataset: { v: 'QA' } }); S.ui = {}; S.iqa.batch = 'all'; go('q-learners'); const m = main();
      ok('IQBS-10 the IQA guidance names the System Administrator among those who assign IQAs', /an Academic Admin, a System Administrator or the Super Administrator assigns an IQA/.test(m) && !/Assigned by an Academic Admin\. /.test(m));
    });
    next(1);
    return;
  }

  if (PH === 1) {
    await T('IQBS refresh', async () => {
      ok('IQBS-11 after a real refresh the System Administrator\'s batch and allocation history are kept', !!iqbBatch(C1) && J(iqbNamesOn(C1)) === J([IQA_B]) && iqbS().rows.filter(r => r.batch === C1 && r.end).length >= 4 && iqbNamesOn(CD_B).includes(IQA_B));
    });
    await T('IQBS Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('IQBS-11 Reset demo: back to the starting allocation', !iqbBatch(C1) && iqbS().rows.length === 1 && J(iqbNamesOn(CD_B)) === J([IQA_A]));
    });
    await T('IQBS legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
      if (!isSys()) { ACT.demoSignInAsSys && ACT.demoSignInAsSys({ dataset: { v: 'SY' } }); code2fa(); }
      const B = 'L2DC-MAR26', n0 = iqbS().rows.length;
      ok('IQBS-12 legacy: the System Administrator removes and re-assigns an IQA on a legacy batch', isSys() && iqbEnd(B, IQA_B, 'legacy remove') === true && !iqbNamesOn(B).includes(IQA_B) && iqbAssign(B, IQA_B, 'legacy re-add') === true && iqbNamesOn(B).includes(IQA_B) && iqbS().rows.length === n0 + 1);
      ok('IQBS-12 legacy: variant C (IQA + Assessor) still can\'t be given a batch he assesses', ['L3AC-JAN26', 'L2DC-MAR26'].some(c => iqbIndepWhy(iqbBatch(c), 'James Pryce')) ? ['L3AC-JAN26', 'L2DC-MAR26'].filter(c => iqbIndepWhy(iqbBatch(c), 'James Pryce')).every(c => iqbAssign(c, 'James Pryce', 'x') === false) : true);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-iqbs.phase'); SS.removeItem('ft-iqbs.R');
})();
