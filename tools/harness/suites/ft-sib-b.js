// SIB-FINAL B — IQA: learners in scope (IQA-03), how IQA is assigned (IQA-01), sample sets (IQA-02), portfolio (IQA-04).
// suites.sh runs it with FIXTURE=client. Phase 0: the client demo before and after real marking (Amira submits with a file, the
// Assessor marks, the Coordinator releases, the Assessor publishes Pass); IQA views, conflict, refusals, a sample set.
// Phase 1: a real refresh (records and set kept), Reset demo, then the legacy fixture (counts = records, independence flags).
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sib-b.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sib-b.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = (ph, keep) => { SS.setItem('ft-sib-b.R', J(R)); SS.setItem('ft-sib-b.phase', String(ph)); if (keep) SS.setItem('ft-sib-b.keep', J(keep)); location.reload(); };
  const tick = () => new Promise(r => setTimeout(r, 30));
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const attach = async name => { const dt = new DataTransfer(); dt.items.add(new File(['sib evidence bytes'], name, { type: 'application/pdf' })); const inp = $1('main .paper input[type="file"]'); inp.files = dt.files; INP.attach(inp); await tick(); };
  const rows = () => $a('main section.dt tbody tr').map(r => r.textContent.replace(/\s+/g, ' '));
  const listAll = id => { const st = S.ui['dt-' + id]; if (st) st.ps = 500; render(); };
  const AM = 'IA-L-32000', DV = 'IA-L-32001', KEY = AM + '~a10';

  if (PH === 0) {
    /* ---------- Before any marking ---------- */
    await T('SIB-B client before marking', async () => {
      pick('iqa'); go('q-learners'); const m = main(), rs = rows();
      ok('IQA-03 the IQA has a Learners screen in the sidebar', !!$1('.adm-side a[href="#q-learners"]') && S.route === 'q-learners');
      ok('IQA-03 every learner on the demo NVQ batch is listed (Amira, Dev, Sam, Tom) — before anything is marked', ['Amira Shah', 'Dev Patel', 'Sam Deposit', 'Tom Transfer'].every(n => rs.some(r => r.includes(n))) && rs.length === 4, J(rs));
      ok('IQA-03 the short-course learner (Lena) is not in IQA scope', !rs.some(r => /Lena Hart/.test(r)));
      ok('IQA-03 truthful status: "No marked work yet", none counted, no records invented', rs.every(r => /No marked work yet/.test(r) && /None yet/.test(r)) && allIqaRecords().length === 0);
      ok('IQA-03 the programme, version and batch are the learner\'s own', rs.every(r => /Level 3 Diploma in Care Practice \(client demo\)/.test(r) && /DEMO-L3-JAN27/.test(r)) && /Version \d/.test(rs[0]), rs[0]);
      ok('IQA-01 the screen explains how IQA is assigned: IQA role in Staff & Users, academy-wide scope, no batch allocation, independence, client decision', /How IQA is assigned/.test(m) && /Staff & Users/.test(m) && /don't have an IQA allocation/.test(m) && /nobody is assigned automatically/.test(m) && /Independence/.test(m) && /client decision/.test(m));
      ok('IQA-03 the empty state says why nothing is listed to sample', /No work has been marked yet/.test(m) && /Nothing is created for sampling/.test(m));
      go('q-records'); ok('IQA-03 Assessment Records explains the empty list and links to Learners', /Nothing has been marked yet, so there is nothing to sample/.test(main()) && /4 learners are in scope/.test(main()) && !!$1('main .sib-q-norec [data-go="q-learners"]'));
      go('q-portfolios', { id: AM }); const pm = main();
      ok('IQA-04 Amira\'s portfolio opens (was "No marked work" only): her own programme, its criteria and "No evidence yet"', /Portfolio — Amira Shah/.test(pm) && /Level 3 Diploma in Care Practice \(client demo\)/.test(pm) && /No evidence yet/.test(pm) && /No marked work yet\./.test(pm));
      ok('IQA-04 the portfolio says what it is for, what it shows and does not show, and that IQA never replaces the Pass / Fail', /What the IQA portfolio is for/.test(pm) && /Not shown:/.test(pm) && /never replaces the Assessor's final Pass \/ Fail/.test(pm) && /client decision/.test(pm));
      go('q-portfolios'); ok('IQA-04 Portfolios without a learner chosen lists the in-scope learners', $a('#qp-l option').length === 4, String($a('#qp-l option').length));
      go('q-sets'); const sm = main();
      ok('IQA-02 Sample Sets explains the workflow end to end and the absence of a sampling percentage', /How sample sets work/.test(sm) && /Create a set/.test(sm) && /Choose the evidence/.test(sm) && /Review/.test(sm) && /Findings and corrections/.test(sm) && /Close/.test(sm) && /no sample size or percentage/.test(sm) && /Open → Finalised → Exported/.test(sm));
      ok('IQA-02 with nothing marked, Sample Sets says there is nothing to sample yet', /nothing to sample/.test(sm));
      ACT.qNewSet({ dataset: {} }); ok('IQA-02 Create sample set explains what a set is and that nothing is added automatically', /list of marked records you choose by hand/.test(mtxt()) && /No item is added automatically/.test(mtxt())); closeModal();
    });
    /* ---------- Real marking: submit with a file, mark, release, publish ---------- */
    await T('SIB-B client marking', async () => {
      const a = STORE.worlds.CD1.assignments.find(x => x.id === 'a10');
      pick('nvq-sp'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>SIB answer: I agreed the care plan with the person.</p>'); await attach('sib-evidence.pdf'); go('assignment', { id: 'a10' });
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
      ok('SIB setup: Amira submits Assignment 1 with a file', a.status === 'Submitted' && Array.isArray(a.qs[0].rounds[0].att) && a.qs[0].rounds[0].att.length === 1, a.status);
      pick('assessor'); const d = dft(KEY); markable(tasAsg(tasSubs(true).find(s => s.key === KEY))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Well evidenced.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: KEY } }); prim(); closeModal();
      pick('coord1'); ACT.relOne({ dataset: { k: KEY } }); prim(); closeModal(); await tick();
      pick('assessor'); ACT.r3Declare({ dataset: { k: KEY } }); $1('input[name="r3-res"][value="Pass"]').checked = true; $1('#d-ofb').value = 'SIB overall: clear answer.'; $1('#rsn').value = 'Meets the brief'; prim(); closeModal();
      ok('SIB setup: marked, released and the Pass published by the Assessor', a.status !== 'Submitted' && r3Out(KEY) && r3Out(KEY).result === 'Pass', a.status);
    });
    let RID = null;
    await T('SIB-B client after marking', async () => {
      pick('iqa'); go('q-learners'); const r = rows().find(x => /Amira Shah/.test(x)), others = rows().filter(x => !/Amira Shah/.test(x));
      ok('IQA-03 after marking, Amira shows her marked work (1 submission) and "Marked work to sample"', !!r && /1 submission/.test(r) && /Marked work to sample/.test(r), r);
      ok('IQA-03 the other learners stay "No marked work yet" (no cross-learner leakage)', others.length === 3 && others.every(x => /No marked work yet/.test(x)));
      const rec = allIqaRecords().find(x => x.lid === AM && x.kind === 'sub'); RID = rec && rec.id;
      ok('IQA-03 the record is Amira\'s own: programme, batch and assessor from her enrolment', !!rec && rec.programme === STORE.worlds.CD1.nvq.title && rec.batch === 'DEMO-L3-JAN27' && rec.assessor === 'James Pryce', J(rec && [rec.programme, rec.batch, rec.assessor]));
      ACT.sibqRecs({ dataset: { id: AM } }); ok('IQA-03 "Records" opens Assessment Records filtered to that learner', S.route === 'q-records' && rows().length === 1 && rows()[0].includes('Amira Shah') && !/Nothing has been marked yet/.test(main()));
      go('q-record', { id: RID }); const rm = main();
      ok('IQA-04 the IQA record lists the file submitted with the round (W0 kept it; the IQA view never showed it)', /sib-evidence\.pdf/.test(rm) && !!$1('main .sib-q-att'), rm.slice(0, 200));
      ok('IQA-04 the record shows the Assessor\'s published final outcome', /Final assignment outcome: Pass/.test(rm));
      go('q-portfolios', { id: AM }); const pm = main();
      ok('IQA-04 the portfolio lists the published final outcome and the evidence against the criteria', /Final assignment outcomes/.test(pm) && /Pass/.test($1('main .sib-q-out').textContent) && pm.includes(RID) && !/No marked work yet\./.test(pm));
      // Sample set: created by hand, item added, summary counts from the records
      ACT.qNewSet({ dataset: {} }); $1('#qs-n').value = 'SIB set'; press(); const s = STORE.iqa.sets.find(x => x.name === 'SIB set');
      qAddToSet([RID]); press(); go('q-set', { id: s.id }); const qm = main();
      ok('IQA-02 a set is created by hand and the chosen record added', !!s && s.items.length === 1 && s.items[0] === RID && s.by === 'Priyanka Shah');
      ok('IQA-02 the set shows a review summary counted from findings, the next step and an honest note', /Review summary/.test(qm) && /Items ?1 ?Items with a finding ?0 ?Open findings ?0/.test(($1('main .sib-q-sum .kpis') || {}).textContent || '') && /Next: review each item/.test(qm) && /not a completed-review count/.test(qm));
      ok('IQA-02 no review, finding or outcome was invented', ADMIN.iqa.filter(f => f.rec === RID).length === 0 && r3Out(KEY).result === 'Pass');
      next(1, { RID, SET: s.id });
    });
    return;
  }

  if (PH === 1) {
    const keep = JSON.parse(SS.getItem('ft-sib-b.keep') || '{}');
    await T('SIB-B refresh', async () => {
      pick('iqa'); go('q-learners'); const r = rows().find(x => /Amira Shah/.test(x));
      ok('IQA-03 after a real refresh the marked work and the Learners status are kept', !!r && /1 submission/.test(r) && /Marked work to sample/.test(r) && !!recById(keep.RID), r);
      const s = STORE.iqa.sets.find(x => x.id === keep.SET); ok('IQA-02 after a real refresh the sample set and its item are kept', !!s && s.items.includes(keep.RID));
    });
    await T('SIB-B independence and refusals (client)', async () => {
      signOutUI(); ACT.demoSignInAsIqa({ dataset: { v: 'QC' } }); go('q-learners'); const r = rows().find(x => /Amira Shah/.test(x));
      ok('IQA-01 independence: James Pryce (IQA + this batch\'s Assessor) sees the batch flagged — another IQA samples it', !!r && /You (are an Assessor on this batch|marked this work|are the .* on this batch)/.test(r), r);
      const n0 = STORE.iqa.sets.length; ACT.qNewSet({ dataset: {} }); $1('#qs-n').value = 'QC set'; press(); const qs = STORE.iqa.sets[STORE.iqa.sets.length - 1];
      qAddToSet([keep.RID]); closeModal(); ok('IQA-01 (negative) the conflicted IQA can\'t add that work to a sample set', !qs.items.includes(keep.RID) && STORE.iqa.sets.length === n0 + 1);
      for (const p of ['biz', 'fin', 'sys', 'aca']) { pick(p); go('q-learners'); ok(`IQA-03 (negative) ${p} can't open the IQA Learners screen (denied and logged)`, /You don't have permission — logged/.test(main()) && !/Amira Shah/.test(main())); }
      pick('nvq-sp'); go('q-learners'); ok('IQA-03 (negative) a learner gets the denied page, nothing of the IQA\'s work', /You don't have permission/.test(main()) && !/Dev Patel/.test(main()));
      pick('super'); go('q-learners'); ok('IQA-03 the Super Administrator can view it (PD-F-09)', /Learners in IQA scope|Amira Shah/.test(main()));
    });
    await T('SIB-B batch staff note', async () => {
      pick('aca'); const b = cdBatch(); const h = chAssessPanel(b);
      ok('IQA-01 the batch staff panel says IQA isn\'t allocated per batch and why', /IQA isn't allocated per batch/.test(h) && /independence rule/.test(h) && /Staff & Users/.test(h));
    });
    await T('SIB-B Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); pick('iqa'); go('q-learners');
      ok('IQA Reset: back to the starting demo — 4 learners, nothing marked, no sets', rows().length === 4 && rows().every(x => /No marked work yet/.test(x)) && !STORE.iqa.sets.length && !allIqaRecords().length);
    });
    /* ---------- Legacy fixture ---------- */
    await T('SIB-B legacy', async () => {
      fxLoadLegacy(); signOutUI(); setAdminIdentity('QA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('q-learners'); listAll('sibq-l');
      const sc = sibqScope(), all = allIqaRecords();
      ok('IQA-03 legacy: every learner with a record is listed, and the record counts add up to the records', all.every(r => sc.some(x => x.lid === r.lid)) && sc.reduce((n, x) => n + x.recs.length, 0) === all.length, J([sc.length, all.length]));
      ok('IQA-03 legacy: the screen lists them (one row per learner)', rows().length === sc.length && sc.length > 20, String(rows().length));
      const flagged = sc.filter(x => x.conflict); ok('IQA-01 legacy: independence flags come from the existing conflict rule only', flagged.every(x => iqaConflict({ assessor: '', batch: x.batch }) === x.conflict) && sc.filter(x => !x.conflict).every(x => !iqaConflict({ assessor: '', batch: x.batch })));
      const syn = STORE.iqa.recs.find(r => r.kind === 'sub' && !r.archived); go('q-record', { id: syn.id });
      ok('IQA-04 legacy: an earlier sample record says no files are stored with it (none invented)', /Earlier sample record — no files are stored with it/.test(main()));
      go('q-set', { id: 'SS-01' }); ok('IQA-02 legacy: a finalised set shows its summary and that its list is locked', /Review summary/.test(main()) && /item list is locked|Exported/.test(main()));
      go('q-portfolios'); ok('IQA-04 legacy: Portfolios still open on a learner with records', /Portfolio — /.test(main()) && /What the IQA portfolio is for/.test(main()));
      go('q-records'); ok('IQA-03 legacy: Assessment Records has no empty-state note (records exist)', !$1('main .sib-q-norec') && allIqaRecords().length > 100);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sib-b.phase'); SS.removeItem('ft-sib-b.R'); SS.removeItem('ft-sib-b.keep');
})();
