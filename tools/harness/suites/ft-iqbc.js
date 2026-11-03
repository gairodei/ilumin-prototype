// IQA — IQA allocation during batch creation (PD-IQB-06…). suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo): create with two IQAs, the IQA's views, invalid (dual-role) choices, the final check on "Create batch",
// editing the choice in the wizard, no IQA (optional), a System Administrator, later changes on the Staff tab and elsewhere.
// Phase 1: a real refresh, Reset demo, then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-iqbc.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-iqbc.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const back = () => { const a = MODAL && MODAL.actions.find(x => x.label === 'Back'); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'IQBC test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const QB = () => { signOutUI(); ACT.demoSignInAsIqa({ dataset: { v: 'QB' } }); S.ui = {}; S.iqa.batch = 'all'; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = (ph, keep) => { SS.setItem('ft-iqbc.R', J(R)); SS.setItem('ft-iqbc.phase', String(ph)); if (keep) SS.setItem('ft-iqbc.keep', J(keep)); location.reload(); };
  const rows = () => $a('main section.dt tbody tr').map(r => r.textContent.replace(/\s+/g, ' ')).filter(r => !/^No /.test(r.trim()));
  const aud = act => ADMIN.audit.filter(a => a.action === act);
  const step = () => (/step (\d) of 5/.exec((MODAL && MODAL.title) || '') || [])[1];
  // The wizard up to the Staff step, then the staff ticks
  const wiz1 = (code, course) => { ACT.newBatch(); $1('#nb-c').value = code; const co = $1('#nb-co'); co.value = course || [...co.options].map(o => o.value).filter(Boolean)[0]; if (INP.n2NbCourse) INP.n2NbCourse(co);
    $a('#modal-root .m-m').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
    if ($1('#nb-s')) $1('#nb-s').value = new Date(now().getTime() + 120 * 864e5).toISOString().slice(0, 10); if ($1('#nb-e')) $1('#nb-e').value = new Date(now().getTime() + 480 * 864e5).toISOString().slice(0, 10);
    if ($1('#nb-m')) $1('#nb-m').value = 'Online'; if ($1('#nb-cap')) $1('#nb-cap').value = '10'; prim(); };
  const tickS = ({ coord = 'Laura Kemp', teachers = ['Tom Whitfield'], assessors = ['Sarah Okonkwo'], iqas = [] }) => {
    $a('#modal-root .mc-nb-c').forEach(i => { i.checked = i.value === coord; }); const ac = $1('#nb-ac'); if (ac) { if (![...ac.options].some(o => o.value === coord)) ac.insertAdjacentHTML('beforeend', `<option>${coord}</option>`); ac.value = coord; }
    $a('#modal-root .nb-t').forEach(i => { i.checked = teachers.includes(i.value); }); $a('#modal-root .nb-a').forEach(i => { i.checked = assessors.includes(i.value); }); $a('#modal-root .iqb-nb-c').forEach(i => { i.checked = iqas.includes(i.value); }); };
  const finish = () => { for (let k = 0; k < 6 && MODAL && step() !== '5'; k++) if (prim() === false) break; const t5 = mtxt(), at = step(), r = prim(); const s = step(); closeModal(); return { t5, s, at, r }; };
  const AM = 'IA-L-32000', DV = 'IA-L-32001', C1 = 'DEMO-L3-APR27', C2 = 'DEMO-L3-MAY27', C3 = 'DEMO-L3-JUN27', C4 = 'DEMO-L3-JUL27';
  const addRole = (name, role) => { const s = ADMIN.staff.find(x => x.name === name); if (s && !s.roles.includes(role)) { s.roles.push(role); return () => { s.roles = s.roles.filter(r => r !== role); }; } return () => {}; };

  if (PH === 0) {
    let res = null;
    await T('IQBC create with two IQAs', async () => {
      pick('aca'); go('a-batches'); wiz1(C1); const t2 = mtxt();
      ok('IQBC-01 the Staff step lists "Internal Quality Assurer (IQA)" with the active IQAs, optional', step() === '2' && /Internal Quality Assurer \(IQA\) — optional, one or more/.test(t2) && J($a('#modal-root .iqb-nb-c').map(i => i.value)) === J([IQA_A, IQA_B]) && /Academic Coordinator/.test(t2) && /Teacher\(s\)/.test(t2) && /Assessor\(s\)/.test(t2));
      const a0 = aud('IQA assigned').length, n0 = iqbS().rows.length; tickS({ iqas: [IQA_A, IQA_B] }); res = finish(); const b = iqbBatch(C1);
      ok('IQBC-01 the review step names both IQAs', /IQA ?Priyanka Shah, Dr Alan Brooks/.test(res.t5), res.t5.slice(-400));
      ok('IQBC-01 the batch is created with its Coordinator, Teacher, Assessor and both IQAs', !!b && b.coord === 'Laura Kemp' && b.teachers.includes('Tom Whitfield') && b.assessors.includes('Sarah Okonkwo') && J(iqbNamesOn(C1)) === J([IQA_A, IQA_B]), J(b && [b.coord, b.teachers, b.assessors]));
      ok('IQBC-02 the IQB records are used — exactly one per IQA (no duplicates), by the creator, reason "Allocated at batch creation"', iqbS().rows.length === n0 + 2 && iqbS().rows.filter(r => r.batch === C1).length === 2 && iqbS().rows.filter(r => r.batch === C1).every(r => !r.end && r.by === ADMIN.me.name && r.reason === 'Allocated at batch creation'));
      ok('IQBC-02 audited ("IQA assigned" ×2) and both IQAs notified', aud('IQA assigned').length === a0 + 2 && [IQA_A, IQA_B].every(n => STORE.iqa.notifs.some(x => x.to === n && x.t === 'Batch assigned to you' && x.b.includes(C1))) && ADMIN.audit.some(a => a.action === 'Batch created' && a.entity.includes(C1)));
      syncTasBatches(); render(); ok('IQBC-02 a later sync adds no second record', iqbS().rows.filter(r => r.batch === C1).length === 2);
      go('a-batches', { id: C1, tab: 'staff' }); const pm = ($1('main .iqb-panel') || {}).textContent || '';
      ok('IQBC-07 the batch Staff tab shows both IQAs with Reassign / Remove', /Priyanka Shah/.test(pm) && /Dr Alan Brooks/.test(pm) && $a('main .iqb-panel [data-act="iqbRemoveDlg"]').length === 2);
    });
    await T('IQBC the IQA sees the new batch', async () => {
      pick('aca'); const b = iqbBatch(C1); ACT.batchLife({ dataset: { id: C1, to: 'Open' }, textContent: 'Open for enrolment' }); reason();
      ACT.chMoveBatch({ dataset: { id: DV } }); if (MODAL) { $1('#ch-mv-b').value = C1; reason('IQBC move'); }
      ok('IQBC setup: the batch is opened and Dev moved to it', b.status === 'Open' && chCohLids(b).includes(DV));
      QB(); go('q-learners'); const m = main();
      ok('IQBC-09 the new batch appears at once in IQA B\'s assigned batches (his only one — he starts with none) and batch filter', /Your assigned batches \(1\)/.test(m) && m.includes(C1) && $a('#iqb-b option').map(o => o.value).includes(C1));
      const s = $1('#iqb-b'); s.value = C1; INP.iqbPick(s); ok('IQBC-09 filtering to it lists its learner (Dev, nothing marked yet)', rows().length === 1 && /Dev Patel/.test(rows()[0]) && /No marked work yet/.test(rows()[0]), J(rows()));
      S.iqa.batch = 'all'; go('q-portfolios', { id: DV }); ok('IQBC-09 his portfolio opens for IQA B', !$1('main .iqb-deny') && /Dev Patel/.test(main()));
    });
    await T('IQBC invalid roles', async () => {
      pick('aca'); const undo = [addRole('Tom Whitfield', 'IQA'), addRole('Laura Kemp', 'IQA'), addRole('Sarah Okonkwo', 'IQA')];
      try {
        go('a-batches'); wiz1(C2); ok('IQBC setup: dual-role staff (IQA + Teacher / Coordinator / Assessor) are listed as IQAs', ['Tom Whitfield', 'Laura Kemp', 'Sarah Okonkwo'].every(n => $a('#modal-root .iqb-nb-c').some(i => i.value === n)));
        const n0 = iqbS().rows.length, l0 = ADMIN.batches.length;
        for (const [n, as, opt] of [['Tom Whitfield', 'a Teacher', {}], ['Sarah Okonkwo', 'an Assessor', {}], ['Laura Kemp', 'an Academic Coordinator', {}]]) {
          tickS({ ...opt, iqas: [n] }); const r = prim();
          ok(`IQBC-04 (negative) ${n} can't be ticked as IQA and as ${as} of the same batch`, r === false && step() === '2' && new RegExp(`${n} is ticked as ${as} of ${C2}`).test(ADMIN.audit[0].reason) && ADMIN.audit[0].action === 'Blocked: IQA at batch creation', ADMIN.audit[0].reason);
        }
        tickS({ iqas: [IQA_A, 'Tom Whitfield'] }); ok('IQBC-04 (negative) one bad IQA among several stops the step (nothing kept)', prim() === false && step() === '2');
        tickS({ coord: 'Laura Kemp', teachers: ['Marcus Bell'], assessors: ['James Pryce'], iqas: ['Tom Whitfield', 'Sarah Okonkwo'] }); ok('IQBC-04 the same dual-role people are fine as IQAs when they hold no other role on the batch', prim() !== false && step() === '3');
        closeModal(); ok('IQBC-05 nothing was created by the refused or abandoned wizard', ADMIN.batches.length === l0 && !iqbBatch(C2) && iqbS().rows.length === n0);
      } finally { undo.forEach(f => f()); }
    });
    await T('IQBC atomic create', async () => {
      pick('aca'); go('a-batches'); const n0 = iqbS().rows.length, l0 = ADMIN.batches.length;
      wiz1(C2); tickS({ iqas: [IQA_B] }); prim(); prim(); prim(); ok('IQBC setup: the review step is reached with IQA B', step() === '5' && /IQA ?Dr Alan Brooks/.test(mtxt()));
      const s = ADMIN.staff.find(x => x.name === IQA_B); s.status = 'Deactivated'; const r = prim(); s.status = 'Active';
      ok('IQBC-05 (negative) if the IQA is no longer valid on "Create batch", nothing is created — no batch, no allocation', r === false && step() === '5' && ADMIN.batches.length === l0 && !iqbBatch(C2) && iqbS().rows.length === n0 && /Blocked: IQA at batch creation/.test(ADMIN.audit[0].action));
      back(); back(); back(); ok('IQBC-05 Back to Staff keeps the IQA choice ticked (edit)', step() === '2' && J($a('#modal-root .iqb-nb-c:checked').map(i => i.value)) === J([IQA_B]));
      tickS({ iqas: [IQA_A] }); const f = finish(); const b = iqbBatch(C2);
      ok('IQBC-05 edited to IQA A and created: the batch and only the edited choice are saved together', !!b && J(iqbNamesOn(C2)) === J([IQA_A]) && iqbS().rows.length === n0 + 1 && /IQA ?Priyanka Shah/.test(f.t5));
    });
    await T('IQBC optional and permission', async () => {
      pick('aca'); go('a-batches'); const n0 = iqbS().rows.length; wiz1(C3); tickS({}); const f = finish(), b = iqbBatch(C3);
      ok('IQBC-06 IQA is optional: a batch is created with none, the review says so, no record', !!b && !iqbNamesOn(C3).length && iqbS().rows.length === n0 && /None chosen — optional; assign later in the Staff tab/.test(f.t5));
      go('a-batches', { id: C3, tab: 'staff' }); ok('IQBC-07 its Staff tab offers the assign control as before', /No IQA assigned/.test(main()) && !!$1('main [data-act="iqbAssignDlg"]'));
      pick('sys'); go('a-batches'); wiz1(C4); const t = mtxt(); closeModal();
      ok('IQBC-03 a System Administrator can create batches but not allocate IQAs: the step says IQA is assigned afterwards (no choices)', step() === undefined && /assigned after the batch is created, by an Academic Admin or the Super Administrator/.test(t) && !/IQA\) — optional/.test(t), t.slice(0, 300));
      ok('IQBC-03 (negative) the IQB handler refuses a System Administrator directly as well', iqbAssign(C3, IQA_A, 'x') === false && !iqbNamesOn(C3).length);
    });
    await T('IQBC later staff changes', async () => {
      pick('aca'); const b = iqbBatch(C1), t0 = J(b.teachers);
      ACT.batchStaff({ dataset: { id: C1 } }); const bt = $1('#bs-t'); if (bt) { bt.insertAdjacentHTML('beforeend', `<option>${IQA_B}</option>`); bt.value = IQA_B; reason('x'); } closeModal();
      ok('IQBC-10 (negative) the new batch\'s IQA can\'t later be made its Teacher on the Staff tab', !!bt && J(b.teachers) === t0 && /is the IQA allocated to DEMO-L3-APR27/.test(ADMIN.security[0].detail));
      ok('IQBC-10 (negative) … nor its Academic Coordinator', changeCoordinator(C1, IQA_A, 'x') === false && b.coord === 'Laura Kemp');
      const cb = cdBatch(), ev = batchEvents(cb).find(e => e.teacher); let blocked = false;
      if (ev) { ACT.kEditEv({ dataset: { b: cb.code, id: ev.id } }); const kt = $1('#ke-t'); if (kt) { kt.insertAdjacentHTML('beforeend', `<option>${IQA_A}</option>`); kt.value = IQA_A; if ($1('#ke-r')) $1('#ke-r').value = 'x'; blocked = prim() === false || !!MODAL; } closeModal(); }
      ok('IQBC-10 (negative) a session of the demo batch can\'t be moved to its IQA as Teacher', !!ev && blocked && !cb.teachers.includes(IQA_A) && ev.teacher !== IQA_A && /is the IQA allocated to DEMO-L3-JAN27/.test(ADMIN.security[0].detail), ev ? ev.id : 'no session');
      ACT.iqbRemoveDlg({ dataset: { b: C1, n: IQA_A } }); reason('Priyanka off the April intake');
      ok('IQBC-07 a creation-time allocation is changed later on the Staff tab like any other (ended, kept, audited)', J(iqbNamesOn(C1)) === J([IQA_B]) && iqbS().rows.some(r => r.batch === C1 && r.name === IQA_A && r.end && r.end.kind === 'Removed') && aud('IQA removed').length >= 1);
      ok('IQBC-11 the existing demo batch, its learners and its first IQA are untouched', J(iqbNamesOn(CD_B)) === J([IQA_A]) && chCohLids(cdBatch()).includes(AM) && cdBatch().status === 'Open');
    });
    next(1, {});
    return;
  }

  if (PH === 1) {
    await T('IQBC refresh', async () => {
      ok('IQBC-12 after a real refresh the created batches and their allocations are kept', !!iqbBatch(C1) && !!iqbBatch(C2) && !!iqbBatch(C3) && J(iqbNamesOn(C1)) === J([IQA_B]) && J(iqbNamesOn(C2)) === J([IQA_A]) && !iqbNamesOn(C3).length && iqbS().rows.some(r => r.batch === C1 && r.end));
      QB(); go('q-learners'); ok('IQBC-12 IQA B still sees the April batch and Dev in it', main().includes(C1) && rows().some(r => /Dev Patel/.test(r) && r.includes(C1)));
    });
    await T('IQBC Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('IQBC-12 Reset demo: the created batches and their allocations are gone; the starting allocation is back', ![C1, C2, C3].some(iqbBatch) && iqbS().rows.length === 1 && J(iqbNamesOn(CD_B)) === J([IQA_A]));
    });
    await T('IQBC legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-batches');
      // The legacy data has no course with Finance-approved fee options, so the wizard stops at step 1 (DM-P, PD-DM-16) — unchanged
      const n0 = iqbS().rows.length, l0 = ADMIN.batches.length; wiz1('L3AC-AUG27', 'Level 3 Diploma in Adult Care (England)'); const s1 = step(); closeModal();
      ok('IQBC-11 legacy: the existing eligibility rule still stops creation at step 1, before any staff or IQA is recorded', s1 === '1' && ADMIN.batches.length === l0 && iqbS().rows.length === n0 && !iqbBatch('L3AC-AUG27'), String(s1));
      ok('IQBC-11 legacy: the starting allocations are unchanged (IQA A and B on three batches, variant C on one)', J(iqbCodesOf(IQA_A).sort()) === J(['L2DC-MAR26', 'L3AC-JAN26', 'L5LM-JAN25']) && J(iqbCodesOf(IQA_B).sort()) === J(['L2DC-MAR26', 'L3AC-JAN26', 'L5LM-JAN25']) && J(iqbCodesOf('James Pryce')) === J(['L5LM-JAN25']) && n0 === 7);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-iqbc.phase'); SS.removeItem('ft-iqbc.R'); SS.removeItem('ft-iqbc.keep');
})();
