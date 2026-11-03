// IQA — batch-level IQA allocation (client confirmation 3 Nov 2026, PD-IQB-01…). suites.sh runs it with FIXTURE=client.
// Phase 0 (client demo): the starting allocation, an unassigned IQA, the Academic Admin's control (assign to several batches,
// independence both ways, refusals), real marking, sampling, removal (access revoked, history kept) and reassignment.
// Phase 1: a real refresh, Super Administrator oversight, other roles, Reset demo, then the legacy fixture (one IQA on three
// batches, the batch filter, variant C, an unassigned batch's learners, a removal).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-iqb.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-iqb.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'IQB test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const QB = () => { signOutUI(); ACT.demoSignInAsIqa({ dataset: { v: 'QB' } }); S.ui = {}; S.iqa.batch = 'all'; };
  const QA = () => { pick('iqa'); S.iqa.batch = 'all'; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = (ph, keep) => { SS.setItem('ft-iqb.R', J(R)); SS.setItem('ft-iqb.phase', String(ph)); if (keep) SS.setItem('ft-iqb.keep', J(keep)); location.reload(); };
  const tick = () => new Promise(r => setTimeout(r, 30));
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const attach = async name => { const dt = new DataTransfer(); dt.items.add(new File(['iqb evidence bytes'], name, { type: 'application/pdf' })); const inp = $1('main .paper input[type="file"]'); inp.files = dt.files; INP.attach(inp); await tick(); };
  const rows = () => $a('main section.dt tbody tr').map(r => r.textContent.replace(/\s+/g, ' ')).filter(r => !/^No /.test(r.trim()));
  const listAll = id => { const st = S.ui['dt-' + id]; if (st) st.ps = 500; render(); };
  const sec = () => ADMIN.security.length, aud = act => ADMIN.audit.filter(a => a.action === act);
  const pickB = (code, scr) => { const s = $1('#iqb-b'); if (!s) throw new Error('no batch filter'); s.value = code; INP.iqbPick(s); };
  const AM = 'IA-L-32000', DV = 'IA-L-32001', KEY = AM + '~a10', NBC = 'DEMO-L3-MAR27';

  if (PH === 0) {
    /* ---------- Starting allocation ---------- */
    await T('IQB start', async () => {
      QA(); go('q-learners'); const m = main(), rs = rows();
      ok('IQB-01 client demo: IQA A (Priyanka Shah) starts on the demo NVQ batch only', J(iqbCodesOf(IQA_A)) === J([CD_B]) && /Your assigned batches \(1\)/.test(m) && m.includes(CD_B), J(iqbCodesOf(IQA_A)));
      ok('IQB-02 she sees every learner of the batch — four, none with marked work, portfolios "Curriculum only"', rs.length === 4 && ['Amira Shah', 'Dev Patel', 'Sam Deposit', 'Tom Transfer'].every(n => rs.some(r => r.includes(n))) && rs.every(r => /No marked work yet/.test(r) && /Curriculum only — no evidence yet/.test(r)), J(rs));
      ok('IQB-02 the batch filter offers "All assigned batches" and her batch', J($a('#iqb-b option').map(o => o.value)) === J(['all', CD_B]) && /All assigned batches/.test($1('#iqb-b').textContent));
      ok('IQB-02 no record, finding or set is invented for sampling', allIqaRecords().length === 0 && !STORE.iqa.sets.length && !ADMIN.iqa.length);
      QB(); go('q-learners');
      ok('IQB-02 (negative) IQA B, assigned to no batch, sees no learner and is told why', /You aren't assigned to any batch yet/.test(main()) && !rows().length && !/Amira/.test(main()) && sibqScope().length === 0 && allIqaRecords().length === 0);
      go('q-records'); ok('IQB-02 (negative) his Assessment Records explains there is no batch, not "no learner on a batch"', !!$1('main .iqb-none') && !$1('main .sib-q-norec'));
      go('q-portfolios', { id: AM }); ok('IQB-04 (negative) his direct portfolio link to Amira shows nothing of her', !/Amira/.test(main()) && !!$1('main .iqb-none'));
      const s0 = sec(); ACT.sibqRecs({ dataset: { id: AM } }); ok('IQB-04 (negative) the "Records" handler refuses another batch\'s learner, logged', sec() === s0 + 1 && /Learner IA-L-32000/.test(ADMIN.security[0].detail) && S.route !== 'q-records', String(sec() - s0));
    });
    /* ---------- Academic Admin: the control ---------- */
    let NB = null;
    await T('IQB allocation', async () => {
      pick('aca'); go('a-batches', { id: CD_B, tab: 'staff' }); const pm = ($1('main .iqb-panel') || {}).textContent || '';
      ok('IQB-01 the batch Staff tab has an IQA allocation control showing Priyanka Shah', /Internal Quality Assurer \(IQA\)/.test(pm) && /Priyanka Shah/.test(pm) && !!$1('main .iqb-panel [data-act="iqbAssignDlg"]') && !!$1('main .iqb-panel [data-act="iqbRemoveDlg"]') && !!$1('main .iqb-panel [data-act="iqbMoveDlg"]'));
      ok('IQB-01 the SIB note "IQA isn\'t allocated per batch" is withdrawn', !/IQA isn't allocated per batch/.test(main()));
      // a second NVQ batch, and Dev moved to it before it starts (the AC-1 batch move)
      ACT.newBatch(); $1('#nb-c').value = NBC; const co = $1('#nb-co'); co.value = [...co.options].map(o => o.value).filter(Boolean)[0]; if (INP.n2NbCourse) INP.n2NbCourse(co);
      $a('#modal-root .m-m').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
      if ($1('#nb-s')) $1('#nb-s').value = new Date(now().getTime() + 120 * 864e5).toISOString().slice(0, 10); if ($1('#nb-e')) $1('#nb-e').value = new Date(now().getTime() + 480 * 864e5).toISOString().slice(0, 10);
      if ($1('#nb-m')) $1('#nb-m').value = 'Online'; if ($1('#nb-cap')) $1('#nb-cap').value = '10';
      prim(); const ac = $1('#nb-ac'); if (ac) ac.value = 'Laura Kemp'; $a('#modal-root .mc-nb-c').forEach(i => { if (i.value === 'Laura Kemp') i.checked = true; }); $a('#modal-root .nb-t').forEach(i => { if (i.value === 'Tom Whitfield') i.checked = true; }); $a('#modal-root .nb-a').forEach(i => { if (i.value === 'Sarah Okonkwo') i.checked = true; });
      prim(); prim(); prim(); prim(); closeModal(); NB = iqbBatch(NBC);
      if (NB) { ACT.batchLife({ dataset: { id: NB.code, to: 'Open' }, textContent: 'Open for enrolment' }); reason(); ACT.chMoveBatch({ dataset: { id: DV } }); if (MODAL) { $1('#ch-mv-b').value = NB.code; reason('IQB move'); } }
      ok('IQB setup: a second NVQ batch (no IQA yet) with Dev moved to it', !!NB && iqbNvq(NB) && !iqbNamesOn(NBC).length && chCohLids(NB).includes(DV), J(NB && [NB.status, chCohLids(NB)]));
      go('a-batches', { id: NBC, tab: 'staff' }); ok('IQB-01 a batch with no IQA says so, and that nobody can see its learners until one is assigned', /No IQA assigned/.test(main()) && /No IQA can see this batch's learners/.test(main()));
      // independence at allocation
      const b = cdBatch(), n0 = iqbS().rows.length; b.teachers.push(IQA_B); go('a-batches', { id: CD_B, tab: 'staff' }); ACT.iqbAssignDlg({ dataset: { b: CD_B } });
      const opt = [...$a('#iqb-n option')].find(o => o.value === IQA_B); ok('IQB-01 (negative) the assign dialog disables an IQA who teaches the batch', !!opt && opt.disabled && /holds a role on this batch/.test(opt.textContent)); closeModal();
      const s0 = sec(); ok('IQB-01 (negative) the handler refuses to assign the batch\'s Teacher as its IQA, logged', iqbAssign(CD_B, IQA_B, 'x') === false && iqbS().rows.length === n0 && sec() === s0 + 1 && /is a Teacher on DEMO-L3-JAN27/.test(ADMIN.security[0].detail));
      b.teachers.pop();
      // assign IQA B to both batches at once
      ACT.iqbAssignDlg({ dataset: { b: CD_B } }); $1('#iqb-n').value = IQA_B; $a('#modal-root .iqb-c').forEach(i => { if (i.value === NBC) i.checked = true; }); reason('EQA cover for both intakes');
      ok('IQB-01 IQA B is assigned to two batches in one step, each recorded', J(iqbCodesOf(IQA_B).sort()) === J([CD_B, NBC].sort()) && iqbS().rows.filter(r => r.name === IQA_B && !r.end).every(r => r.by === ADMIN.me.name && r.reason === 'EQA cover for both intakes'), J(iqbCodesOf(IQA_B)));
      ok('IQB-01 every assignment is audited (two "IQA assigned" entries, actor and reason) and the IQA notified', aud('IQA assigned').length === 2 && aud('IQA assigned').every(a => a.actor === ADMIN.me.name && a.after === IQA_B && a.reason === 'EQA cover for both intakes') && STORE.iqa.notifs.filter(n => n.to === IQA_B && n.t === 'Batch assigned to you').length === 2);
      ok('IQB-01 Priyanka keeps her allocation (one batch can have more than one IQA)', J(iqbNamesOn(CD_B)) === J([IQA_A, IQA_B]));
      ok('IQB-01 (negative) re-assigning the same IQA, or someone without the IQA role, is refused', iqbAssign(CD_B, IQA_B, 'again') === false && iqbAssign(CD_B, 'Marcus Bell', 'x') === false && iqbRows(CD_B).length === 2);
      // independence the other way: the batch's IQA can't be its Coordinator, Assessor or Teacher
      const c0 = b.coord; ok('IQB-01 (negative) the batch\'s IQA can\'t be made its Academic Coordinator', changeCoordinator(CD_B, IQA_B, 'x') === false && b.coord === c0 && /is the IQA allocated to DEMO-L3-JAN27/.test(ADMIN.security[0].detail));
      go('a-batches', { id: CD_B, tab: 'staff' }); const a0 = J(chAllocOf(b)), sa = $1('#ch-as-asg'); sa.insertAdjacentHTML('beforeend', `<option>${IQA_B}</option>`); sa.value = IQA_B; ACT.chAssessSave({ dataset: { b: CD_B } }); closeModal();
      ok('IQB-01 (negative) … nor its assignment assessor', J(chAllocOf(b)) === a0 && /is the IQA allocated/.test(ADMIN.security[0].detail));
      const t0 = J(b.teachers); ACT.batchStaff({ dataset: { id: CD_B } }); const bt = $1('#bs-t'); if (bt) { bt.insertAdjacentHTML('beforeend', `<option>${IQA_B}</option>`); bt.value = IQA_B; reason('x'); } closeModal();
      ok('IQB-01 (negative) … nor its Teacher', !!bt && J(b.teachers) === t0 && /is the IQA allocated/.test(ADMIN.security[0].detail));
      // other roles can't change allocations
      for (const p of ['fin', 'biz', 'sys']) { pick(p); const n1 = iqbS().rows.length; ACT.iqbAssignDlg({ dataset: { b: CD_B } }); const opened = !!MODAL; closeModal(); ok(`IQB-04 (negative) ${p} can't open or call the IQA allocation control`, !opened && iqbAssign(NBC, IQA_A, 'x') === false && iqbEnd(CD_B, IQA_A, 'x') === false && iqbS().rows.length === n1 && J(iqbCodesOf(IQA_A)) === J([CD_B])); }
      pick('coord1'); go('c-batches', { id: CD_B }); ok('IQB-01 the Coordinator sees the batch\'s IQAs read-only (no control)', /Internal Quality Assurer \(IQA\)/.test(main()) && !$1('main [data-act="iqbAssignDlg"]') && !$1('main [data-act="iqbRemoveDlg"]'));
    });
    /* ---------- One IQA, several batches ---------- */
    await T('IQB multi-batch', async () => {
      QB(); go('q-learners'); const m = main();
      ok('IQB-02 IQA B sees both assigned batches and every learner in them (3 + Dev)', /Your assigned batches \(2\)/.test(m) && rows().length === 4 && rows().some(r => r.includes('Dev Patel') && r.includes(NBC)), J(rows()));
      ok('IQB-02 the batch filter: All assigned batches + each batch', J($a('#iqb-b option').map(o => o.value)) === J(['all', CD_B, NBC]));
      pickB(NBC); ok('IQB-02 filtering to the new batch lists only Dev', rows().length === 1 && rows()[0].includes('Dev Patel'), J(rows()));
      pickB(CD_B); ok('IQB-02 filtering to the demo batch lists its three learners', rows().length === 3 && !rows().some(r => r.includes('Dev Patel')));
      pickB('all'); QA(); go('q-learners'); ok('IQB-04 Priyanka (demo batch only) no longer sees Dev, who moved to an unassigned batch', rows().length === 3 && !rows().some(r => r.includes('Dev Patel')));
      const s0 = sec(); go('q-portfolios', { id: DV }); ok('IQB-04 (negative) her direct link to Dev\'s portfolio is refused and logged', !!$1('main .iqb-deny') && !/Dev Patel/.test(main()) && sec() === s0 + 1 && /outside the assigned batches/.test(ADMIN.security[0].detail));
    });
    /* ---------- Real marking ---------- */
    await T('IQB marking', async () => {
      const a = STORE.worlds.CD1.assignments.find(x => x.id === 'a10');
      pick('nvq-sp'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>IQB answer: I agreed the care plan with the person.</p>'); await attach('iqb-evidence.pdf'); go('assignment', { id: 'a10' });
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
      QB(); go('q-learners'); ok('IQB-02 a submission awaiting marking is shown truthfully — not yet available to sample', rows().some(r => r.includes('Amira Shah') && /1 submission awaiting marking/.test(r) && /None yet/.test(r)) && allIqaRecords().length === 0, J(rows().find(r => r.includes('Amira'))));
      pick('assessor'); const d = dft(KEY); markable(tasAsg(tasSubs(true).find(s => s.key === KEY))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Well evidenced.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: KEY } }); prim(); closeModal();
      pick('coord1'); ACT.relOne({ dataset: { k: KEY } }); prim(); closeModal(); await tick();
      ok('IQB setup: Amira submits and her work is marked and released', a.status !== 'Submitted', a.status);
    });
    /* ---------- Sample sets in assigned batches ---------- */
    let RID = null, SET = null, FID = null;
    await T('IQB sampling', async () => {
      QB(); go('q-records'); RID = (allIqaRecords().find(x => x.lid === AM) || {}).id;
      ok('IQB-03 the marked record is eligible evidence for IQA B (his batch)', !!RID && rows().length === 1 && rows()[0].includes('Amira Shah'), J(rows()));
      pickB(NBC); ok('IQB-03 filtering eligible evidence to the other batch shows none (Dev has nothing marked)', rows().length === 0); pickB('all');
      ACT.qNewSet({ dataset: {} }); $1('#qs-n').value = 'IQB set'; press(); const s = STORE.iqa.sets.find(x => x.name === 'IQB set'); SET = s && s.id;
      qAddToSet([RID]); press(); ok('IQB-03 a set is created by hand and the chosen record added (nothing added automatically)', !!s && J(s.items) === J([RID]) && s.by === IQA_B);
      const s0 = sec(), n0 = s.items.length; qAddToSet(['SUB-1003']); closeModal(); ok('IQB-03 (negative) an id that isn\'t a marked record in his batches is refused, logged', s.items.length === n0 && sec() === s0 + 1);
      const s1 = sec(); ACT.qNewSet({ dataset: { pend: 'SUB-1003' } }); ok('IQB-03 (negative) a new set can\'t be created around such an id', !MODAL && sec() === s1 + 1); closeModal();
      ACT.qRecord({ dataset: { id: RID } }); const dr = STORE.iqa.drafts[RID]; dr.text = 'IQB: feedback could be more developmental.'; dr.cat = 'Feedback quality'; press(); FID = (ADMIN.iqa.find(f => f.rec === RID) || {}).id;
      ok('IQB-03 a finding is recorded on it through the existing workflow', !!FID && ADMIN.iqa.find(f => f.id === FID).by === IQA_B);
      QA(); go('q-record', { id: RID }); ok('IQB-03 Priyanka (same batch) reviews the same record and sees the finding', !$1('main .iqb-deny') && main().includes(FID));
    });
    /* ---------- Removal: access revoked, history kept ---------- */
    await T('IQB removal', async () => {
      pick('aca'); go('a-batches', { id: CD_B, tab: 'staff' }); ACT.iqbRemoveDlg({ dataset: { b: CD_B, n: IQA_B } }); const w = mtxt();
      ok('IQB-01 removing shows the impact first: access lost, 1 finding, 1 sample-set item in 1 open set, nothing deleted', /loses access to DEMO-L3-JAN27 straight away/.test(w) && /4 learners|3 learners/.test(w) && /1 finding/.test(w) && /1 item in their sample sets \(1 open set\)/.test(w) && /Nothing is deleted/.test(w), w.slice(0, 400));
      reason('Moving IQA B to the March intake only');
      const r = iqbS().rows.find(x => x.name === IQA_B && x.batch === CD_B);
      ok('IQB-01 the allocation is ended, not deleted (who, when, why) and audited', !!r && r.end && r.end.kind === 'Removed' && r.end.reason === 'Moving IQA B to the March intake only' && aud('IQA removed').length === 1 && aud('IQA removed')[0].before === IQA_B);
      go('a-batches', { id: CD_B, tab: 'staff' }); ok('IQB-01 the panel lists the removal in its IQA allocation history', /IQA allocation history/.test(main()) && /Dr Alan Brooks — Removed/.test(main()));
      QB(); go('q-learners'); ok('IQB-04 IQA B now sees only his remaining batch (Dev)', rows().length === 1 && rows()[0].includes('Dev Patel'), J(rows()));
      const s0 = sec(); go('q-record', { id: RID }); ok('IQB-04 (negative) his direct link to the record is refused and logged', !!$1('main .iqb-deny') && !/Amira/.test(main()) && sec() === s0 + 1);
      go('q-finding', { id: FID }); ok('IQB-04 (negative) … and to his own finding on it', !!$1('main .iqb-deny') && !main().includes('more developmental'));
      go('q-findings'); ok('IQB-04 the findings list leaves it out', !main().includes(FID));
      go('q-set', { id: SET }); ok('IQB-03 his set is kept with its item, hidden from him and explained', !!$1('main .iqb-hidden') && /1 item from a batch you are no longer assigned to is hidden/.test(main()) && !main().includes(RID) && STORE.iqa.sets.find(x => x.id === SET).items.includes(RID));
      const s1 = sec(); ACT.qRecord({ dataset: { id: RID } }); ok('IQB-04 (negative) the Record finding handler refuses', !MODAL && sec() === s1 + 1); closeModal();
      const s2 = sec(); qAddToSet([RID]); ok('IQB-04 (negative) the Add to sample set handler refuses', !MODAL && sec() === s2 + 1); closeModal();
      const sObj = STORE.iqa.sets.find(x => x.id === SET); ACT.qFinalise({ dataset: { id: SET } }); reason('Locking'); const s3 = sec(); ACT.qExport({ dataset: { id: SET } });
      ok('IQB-03 (negative) the set can be finalised but not exported while it holds a hidden item', sObj.status === 'Finalised' && !MODAL && sec() === s3 + 1 && !sObj.exports.length); closeModal();
      S.aq = 'Amira'; ok('IQB-04 (negative) search finds nothing of the removed batch', !/Amira/.test(searchResults('Amira'))); S.aq = '';
      ok('IQB-04 the history is kept: his finding, the set item and the audit trail', !!ADMIN.iqa.find(f => f.id === FID) && sObj.items.includes(RID) && ADMIN.audit.some(a => a.entity === RID && a.action === 'Finding recorded'));
      ok('IQB-01 IQA B is notified that the batch was removed', iqaNotifs().some(n => n.t === 'Batch removed from you' && n.b.includes(CD_B)));
      QA(); go('q-findings'); ok('IQB-04 Priyanka (still on the batch) keeps seeing the finding', main().includes(FID));
    });
    /* ---------- Reassignment ---------- */
    await T('IQB reassign', async () => {
      pick('aca'); ACT.iqbMoveDlg({ dataset: { b: CD_B, n: IQA_A } }); ok('IQB-01 reassigning shows the impact for the outgoing IQA', /Priyanka Shah loses access to DEMO-L3-JAN27/.test(mtxt()));
      $1('#iqb-to').value = IQA_B; reason('Priyanka moves to the Level 5 programme');
      const r = iqbS().rows.find(x => x.name === IQA_A && x.batch === CD_B);
      ok('IQB-01 reassigned: Priyanka\'s allocation ended as "Reassigned → Dr Alan Brooks", his is active again, audited', r.end && r.end.kind === 'Reassigned' && r.end.to === IQA_B && J(iqbNamesOn(CD_B)) === J([IQA_B]) && aud('IQA reassigned').length === 1);
      QB(); go('q-set', { id: SET }); ok('IQB-03 his access returns: the set item shows again with its finding', !$1('main .iqb-hidden') && main().includes(RID));
      go('q-record', { id: RID }); ok('IQB-03 … and the record with his finding', !$1('main .iqb-deny') && main().includes(FID));
      QA(); go('q-learners'); ok('IQB-04 Priyanka, now on no batch, sees none of it', /You aren't assigned to any batch yet/.test(main()) && !rows().length);
      next(1, { RID, SET, FID });
    });
    return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-iqb.keep') || '{}');
    await T('IQB refresh', async () => {
      ok('IQB-05 after a real refresh the allocations and their history are kept', J(iqbNamesOn(CD_B)) === J([IQA_B]) && J(iqbCodesOf(IQA_B).sort()) === J([CD_B, NBC].sort()) && iqbS().rows.filter(r => r.end).length === 2 && aud('IQA removed').length === 1 && aud('IQA reassigned').length === 1, J(iqbS().rows.map(r => [r.batch, r.name, !!r.end])));
      QB(); go('q-record', { id: keep.RID }); ok('IQB-05 IQA B still reviews the record; Priyanka still can\'t', !$1('main .iqb-deny') && main().includes(keep.FID));
      QA(); const s0 = sec(); go('q-record', { id: keep.RID }); ok('IQB-05 (negative) Priyanka\'s link is refused after the refresh', !!$1('main .iqb-deny') && sec() === s0 + 1);
    });
    await T('IQB oversight and other roles', async () => {
      pick('super'); go('q-learners'); ok('IQB-04 the Super Administrator keeps oversight of every batch', !!$1('main .iqb-sa') && rows().some(r => r.includes('Amira Shah')) && rows().some(r => r.includes('Dev Patel')));
      go('q-record', { id: keep.RID }); ok('IQB-04 … and opens any record', !$1('main .iqb-deny') && main().includes(keep.RID));
      ok('IQB-01 the Super Administrator can also assign an IQA', iqbAssign(NBC, IQA_A, 'Second IQA for March') === true && iqbNamesOn(NBC).includes(IQA_A));
      for (const p of ['aca', 'fin', 'biz', 'sys']) { pick(p); go('q-record', { id: keep.RID }); ok(`IQB-04 (negative) ${p} gains no IQA access by the allocation feature`, /You don't have permission — logged/.test(main()) && !main().includes('IQB answer')); }
      pick('nvq-sp'); go('q-learners'); ok('IQB-04 (negative) a learner gets the denied page', /You don't have permission/.test(main()) && !/Dev Patel/.test(main()));
    });
    await T('IQB Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); QA(); go('q-learners');
      ok('IQB-05 Reset demo: back to the starting allocation (Priyanka on the demo batch, four learners, no history)', iqbS().rows.length === 1 && J(iqbCodesOf(IQA_A)) === J([CD_B]) && rows().length === 4 && !iqbBatch(NBC) && !STORE.iqa.sets.length, J(iqbS().rows));
    });
    /* ---------- Legacy fixture ---------- */
    await T('IQB legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('QA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; S.iqa.batch = 'all'; go('q-learners'); listAll('sibq-l');
      const sc = iqbScope(), all = allIqaRecords();
      ok('IQB-01 legacy: IQA A is assigned to three batches', J(sc.slice().sort()) === J(['L2DC-MAR26', 'L3AC-JAN26', 'L5LM-JAN25']) && /Your assigned batches \(3\)/.test(main()));
      ok('IQB-04 legacy: every record she sees is in one of them', all.length > 100 && all.every(r => sc.includes(iqbRecBatch(r))), String(all.length));
      ok('IQB-02 legacy: every learner row is in one of them', rows().length > 20 && sibqScope().every(x => sc.includes(x.batch)));
      ok('IQB-02 legacy: no learner row comes from an unassigned batch (a learner is listed only for the batches assigned to her)', !sibqScope().some(x => ['L3AC-NOV26', 'L2DC-SEP25', 'L2DC-JAN27', 'L3AC-DEC26-AUH'].includes(x.batch)) && iqbUnscoped(() => sibqScope()).some(x => x.batch === 'L3AC-NOV26'));
      ok('IQB-04 legacy: her search finds none of the register outside her batches (no queue items, transactions or staff)', !/Queue item|Transaction|Staff/.test(searchResults('a')) && /Record|Learner/.test(searchResults('a')));
      S.iqa.batch = 'L2DC-MAR26'; go('q-records'); listAll('qrec'); const l2 = iqbUnscoped(() => allIqaRecords()).filter(r => iqbRecBatch(r) === 'L2DC-MAR26' && r.kind === 'sub').length;
      ok('IQB-03 legacy: filtering eligible evidence to one batch lists exactly its submissions', rows().length === l2 && l2 > 10 && rows().every(r => /L2/.test(r)), J([rows().length, l2]));
      S.iqa.batch = 'all'; go('q-set', { id: 'SS-01' }); ok('IQB-03 legacy: earlier sample sets keep their status and items', !$1('main .iqb-deny') && /Exported/.test(main()) && STORE.iqa.sets.find(s => s.id === 'SS-01').items.length === 14);
      go('q-finding', { id: 'IQA-310' }); ok('IQB-03 legacy: an earlier finding still opens', !$1('main .iqb-deny') && /Verification stamp/.test(main()));
      // variant C: James Pryce (IQA + Assessor) — allocated only where he holds no role; the conflict on work he marked stays
      ACT.qEdge({ dataset: { e: 'conflict' } }); const r = recById(S.params.id);
      ok('IQB-01 legacy: variant C is allocated only to the Level 5 batch (he assesses the others)', J(iqbScope()) === J(['L5LM-JAN25']) && !iqbIndepWhy(iqbBatch('L5LM-JAN25'), 'James Pryce') && !!iqbIndepWhy(iqbBatch('L3AC-JAN26'), 'James Pryce'));
      ok('IQB-01 legacy: the existing conflict rule still blocks findings on work he marked', !!r && iqbRecBatch(r) === 'L5LM-JAN25' && /You marked this work/.test(main()) && !!$1('main [data-act="qRecord"][disabled]'));
      // removal in the legacy data
      setAdminIdentity('A'); S.portal = 'admin'; ok('IQB-01 legacy: the Super Administrator removes IQA A from the Level 5 batch', iqbEnd('L5LM-JAN25', IQA_A, 'IQB legacy removal') === true);
      setAdminIdentity('QA'); S.ui = {}; const s1 = sec(); go('q-finding', { id: 'IQA-310' });
      ok('IQB-04 legacy: her earlier finding on a Level 5 record is now refused (kept in the data)', !!$1('main .iqb-deny') && sec() === s1 + 1 && !!ADMIN.iqa.find(f => f.id === 'IQA-310'));
      ok('IQB-04 legacy: no Level 5 record is visible to her any more', !allIqaRecords().some(r => iqbRecBatch(r) === 'L5LM-JAN25') && J(iqbScope().sort()) === J(['L2DC-MAR26', 'L3AC-JAN26']));
      const l5 = iqbUnscoped(() => allIqaRecords()).find(r => iqbRecBatch(r) === 'L5LM-JAN25' && r.kind === 'obs'), s2 = sec(); go('q-record', { id: l5.id });
      ok('IQB-04 (negative) legacy: a direct link to a record of the batch she was removed from is refused, logged', !!$1('main .iqb-deny') && sec() === s2 + 1 && /Record in L5LM-JAN25/.test(ADMIN.security[0].detail), l5.id);
      const only = iqbUnscoped(() => sibqScope()).filter(x => x.batch === 'L5LM-JAN25').map(x => x.lid).find(l => !iqbInScopeLid(l)), s3 = sec(); if (only) go('q-portfolios', { id: only });
      ok('IQB-04 (negative) legacy: a learner only in that batch is refused by direct link, logged (or every L5 learner is also in her other batches)', only ? !!$1('main .iqb-deny') && sec() === s3 + 1 : iqbUnscoped(() => sibqScope()).filter(x => x.batch === 'L5LM-JAN25').every(x => iqbInScopeLid(x.lid)), only || 'all shared');
      go('q-set', { id: 'SS-03' }); ok('IQB-03 legacy: her own open set (Level 3 items) is unaffected', !$1('main .iqb-deny') && !$1('main .iqb-hidden'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-iqb.phase'); SS.removeItem('ft-iqb.R'); SS.removeItem('ft-iqb.keep');
})();
