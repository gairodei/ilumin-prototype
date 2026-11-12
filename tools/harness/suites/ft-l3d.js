// L3-D — IQA delivery-mode filter, client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset). The demo batch is mixed:
// Amira, Sam, Tom (Self-Paced) and Dev (Fully Assisted). Amira's and Dev's assignments are submitted, marked and released through the
// real workflow; an observation outcome (Amira) and a PD outcome (Dev) are added as IQA records the way the record store holds them.
// A roster learner with no recorded mode is Unknown. IQA A filters Learners, Assessment Records (every tab) and Portfolios by mode, with
// the batch filter, across two assigned batches; nothing outside her batches ever appears; sample sets and findings don't change.
(async function () {
  const SS = window.sessionStorage, K = 'ft-l3d.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const QA = () => { pick('iqa'); S.iqa.batch = 'all'; S.iqa.mode = 'all'; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const tick = () => new Promise(r => setTimeout(r, 30));
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const rows = () => $a('main section.dt tbody tr').map(r => r.textContent.replace(/\s+/g, ' ')).filter(r => !/^No /.test(r.trim()));
  const listAll = id => { const st = S.ui['dt-' + id]; if (st) { st.ps = 500; render(); } };
  const mode = m => { const s = $1('main #l3d-m'); if (!s) throw new Error('no delivery-mode filter on ' + S.route + ': ' + main().slice(0, 200)); s.value = m; INP.l3dPick(s); };
  const batch = c => { const s = $1('main #iqb-b'); if (!s) throw new Error('no batch filter'); s.value = c; INP.iqbPick(s); };
  const tab = k => { ACT.qrTab({ dataset: { k } }); listAll('qrec'); };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const AM = 'IA-L-32000', DV = 'IA-L-32001', UNK = 'IA-L-39901', SPR = 'IA-L-39902', OUT = 'IA-L-39903';
  // Submit (real page) → mark and release (Assessor) → release to the learner (their Coordinator)
  const markReal = async (p, coord, lid, aid) => {
    pick(p); go('assignment', { id: aid }); typeIn('main .paper .rte-body', '<p>L3-D answer.</p>'); fxFast(ff => { ACT.reviewSubmit({ dataset: { id: aid } }); prim(); ff(16500); }); closeModal();
    const key = lid + '~' + aid; pick('assessor'); const d = dft(key); markable(tasAsg(tasSubs(true).find(s => s.key === key))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Well evidenced.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: key } }); prim(); closeModal();
    pick(coord); ACT.relOne({ dataset: { k: key } }); prim(); closeModal(); await tick();
  };
  const rec = (id, kind, lid, learner, code, title) => ({ id, kind, key: lid + '~' + id, lid, learner, programme: B().course, pk: 'L3', batch: code, unit: kind === 'pd' ? 'PD' : '001', module: '', title, assessor: 'James Pryce', round: '—', markedAt: D(-2, '12:00'), exit: 'Passed', met: 1, notMet: 0, verified: true, type: kind === 'pd' ? 'Knowledge' : 'Observation', crit: ['001 1.1'], archived: false, seed: 1 });

  if (PH === 0) {
    await T('L3D setup', async () => {
      await markReal('nvq-sp', 'coord1', AM, 'a10'); await markReal('nvq-fa', 'coord2', DV, 'a10');
      STORE.iqa.recs.push(rec('L3D-OBS-1', 'obs', AM, 'Amira Shah (demo)', 'DEMO-L3-JAN27', 'Workplace observation — L3-D'), rec('L3D-PD-1', 'pd', DV, 'Dev Patel (demo)', 'DEMO-L3-JAN27', 'Professional Discussion outcome'));
      // a roster learner with no recorded mode; a second batch with a Self-Paced roster learner; a batch she isn't assigned to, with a record
      (B().coh = B().coh || []).push({ lid: UNK, name: 'Una Known (test)' });
      const c = JSON.parse(J(B())); Object.assign(c, { code: 'L3D-SECOND', label: 'L3D-SECOND', enrolled: 1, roster: [], coh: [{ lid: SPR, name: 'Sian Roster (test)' }], mcA: {}, mcH: [], r2: { [SPR]: { opt: 'NV-N1-FO-001', by: 'test', at: D(0) } } }); ADMIN.batches.push(c);
      const o = JSON.parse(J(c)); Object.assign(o, { code: 'L3D-OUT', label: 'L3D-OUT', coh: [{ lid: OUT, name: 'Oscar Outside (test)' }], r2: { [OUT]: { opt: 'NV-N1-FO-001', by: 'test', at: D(0) } } }); ADMIN.batches.push(o);
      STORE.iqa.recs.push(rec('L3D-OUT-1', 'obs', OUT, 'Oscar Outside (test)', 'L3D-OUT', 'Workplace observation — outside'));
      iqbAdd('L3D-SECOND', IQA_A, 'test', 'L3-D second batch');
      ok('L3D setup: two marked submissions (Amira SP, Dev FA) and the added records exist', ['CD1', 'CD2'].every(v => STORE.worlds[v].assignments.find(a => a.id === 'a10').status !== 'Submitted') && iqbCodesOf(IQA_A).length === 2);
    });

    await T('L3D-1 mode resolution from the enrolment records', async () => {
      ok('L3D-1a Amira, Sam, Tom: Self-Paced; Dev: Fully Assisted (from the fee option fixed at sign-up)', ['IA-L-32000', 'IA-L-32003', 'IA-L-32004'].every(l => l3dMode(l, 'DEMO-L3-JAN27') === 'Self-Paced') && l3dMode(DV, 'DEMO-L3-JAN27') === 'Fully Assisted');
      ok('L3D-1b a roster learner with a recorded fee-option group: that mode; with none: Unknown (never the batch default)', l3dMode(SPR, 'L3D-SECOND') === 'Self-Paced' && l3dMode(UNK, 'DEMO-L3-JAN27') === null);
      const w = STORE.worlds.CD2, p0 = w.signup.plan; w.signup.plan = Object.freeze({ ...p0, opt: Object.freeze({ ...p0.opt, mode: 'Self-Paced' }) });
      try { ok('L3D-1c a fee option that disagrees with its approved terms: Unknown', l3dMode(DV, 'DEMO-L3-JAN27') === null); } finally { w.signup.plan = p0; }
      const o = r1Opt('NV-N1-FO-001'), m0 = o.mode; o.mode = 'Fully Assisted'; ok('L3D-1d a changed live option record doesn\'t move a learner who signed up', l3dMode(AM, 'DEMO-L3-JAN27') === 'Self-Paced'); o.mode = m0;
    });

    const F0 = { sets: null, finds: null };
    await T('L3D-2 Learners: All / Self-Paced / Fully Assisted, Unknown under All, two batches', async () => {
      QA(); ACT.qNewSet({ dataset: {} }); $1('#qs-n').value = 'L3D set'; press(); const st = STORE.iqa.sets.find(x => x.name === 'L3D set');
      const sid = r => (allIqaRecords().find(x => x.lid === r && x.kind === 'sub') || {}).id; qAddToSet([sid(AM), sid(DV)]); press();
      ACT.qRecord({ dataset: { id: sid(DV) } }); const dr = STORE.iqa.drafts[sid(DV)]; dr.text = 'L3D finding.'; dr.cat = 'Feedback quality'; press();
      F0.sets = J(STORE.iqa.sets); F0.finds = J(ADMIN.iqa); SS.setItem(K + 'set', st.id);
      go('q-learners'); listAll('sibq-l');
      ok('L3D-2a default All delivery modes: every learner of both batches, the mode column (Unknown for the roster learner)', $1('main #l3d-m').value === 'all' && rows().length === 6 && rows().some(r => r.includes(UNK) && /Unknown/.test(r)) && rows().some(r => /Dev Patel/.test(r) && /Fully Assisted/.test(r)) && !rows().some(r => /Oscar Outside/.test(r)), J(rows().map(r => r.slice(0, 60))));
      mode('Self-Paced'); listAll('sibq-l');
      ok('L3D-2b Self-Paced: Amira, Sam, Tom and the second batch\'s roster learner; not Dev, not Unknown', rows().length === 4 && ['Amira', 'Sam', 'Tom', SPR].every(n => rows().some(r => r.includes(n))) && !rows().some(r => r.includes('Dev Patel') || r.includes(UNK)));
      mode('Fully Assisted'); listAll('sibq-l'); ok('L3D-2c Fully Assisted: Dev only', rows().length === 1 && rows()[0].includes('Dev Patel'));
      batch('L3D-SECOND'); ok('L3D-2d combined with the batch filter: no Fully Assisted learner in L3D-SECOND — a clear empty state', !rows().length && /No Fully Assisted learners in L3D-SECOND/.test(main()));
      mode('Self-Paced'); listAll('sibq-l'); ok('L3D-2e Self-Paced in L3D-SECOND: its roster learner', rows().length === 1 && rows()[0].includes(SPR));
      batch('all'); mode('all');
    });

    await T('L3D-3 Assessment Records: submissions, observation and PD outcomes', async () => {
      go('q-records'); tab('all');
      ok('L3D-3a All modes: the two submissions, the observation and the PD outcome; nothing from the unassigned batch', rows().length === 4 && !rows().some(r => /L3D-OUT|Oscar/.test(r)), J(rows().map(r => r.slice(0, 50))));
      mode('Self-Paced'); tab('all'); ok('L3D-3b Self-Paced: Amira\'s submission and observation', rows().length === 2 && rows().every(r => r.includes('Amira')));
      tab('obs'); ok('L3D-3c Observations tab, Self-Paced: Amira\'s observation outcome', rows().length === 1 && rows()[0].includes('L3D-OBS-1'));
      tab('pd'); ok('L3D-3d PD outcomes tab, Self-Paced: none (Dev\'s is Fully Assisted)', !rows().length);
      mode('Fully Assisted'); tab('pd'); ok('L3D-3e PD outcomes tab, Fully Assisted: Dev\'s PD outcome', rows().length === 1 && rows()[0].includes('L3D-PD-1'));
      tab('sub'); ok('L3D-3f Submissions tab, Fully Assisted: Dev\'s submission', rows().length === 1 && rows()[0].includes('Dev Patel'));
      batch('L3D-SECOND'); ok('L3D-3g no marked records for the chosen mode and batch: a clear empty state', /No marked records for Fully Assisted learners in L3D-SECOND/.test(main()));
      batch('all'); mode('all'); tab('sub');
    });

    await T('L3D-4 Portfolios follow the filter', async () => {
      go('q-portfolios'); mode('Fully Assisted'); const t = main();
      ok('L3D-4 Fully Assisted: Dev\'s portfolio is listed, Amira\'s isn\'t', /Dev Patel/.test(t) && !/Amira Shah/.test(t)); mode('all');
    });

    await T('L3D-5 sample sets and findings are history: unchanged by the filter', async () => {
      go('q-records'); mode('Self-Paced'); go('q-sets'); go('q-set', { id: SS.getItem(K + 'set') }); const t = main(); go('q-findings'); const f = main();
      ok('L3D-5a the sample set still holds both items (Self-Paced and Fully Assisted) while the filter is Self-Paced', J(STORE.iqa.sets) === F0.sets && STORE.iqa.sets.find(x => x.id === SS.getItem(K + 'set')).items.length === 2 && /Dev Patel/.test(t));
      ok('L3D-5b findings unchanged and still listed (Dev\'s, Fully Assisted)', J(ADMIN.iqa) === F0.finds && /L3D finding|Dev Patel/.test(f));
      S.iqa.mode = 'all';
    });

    await T('L3D-6 scope: nothing outside her batches, under any mode; direct links refused', async () => {
      for (const m of ['all', 'Self-Paced']) { S.iqa.mode = m; IQB_PICK++; try { ok(`L3D-6a ${m}: no record from the unassigned batch`, !allIqaRecords().some(r => r.id === 'L3D-OUT-1')); } finally { IQB_PICK--; } }
      S.iqa.mode = 'Self-Paced'; const s0 = ADMIN.security.length; go('q-record', { id: 'L3D-OUT-1' });
      ok('L3D-6b her direct link to the outside record is refused and logged (with a mode chosen)', !!$1('main .iqb-deny') && ADMIN.security.length === s0 + 1);
      go('q-portfolios', { id: OUT }); ok('L3D-6c the outside learner\'s portfolio is refused', !!$1('main .iqb-deny'));
      S.iqa.mode = 'all';
      pick('nvq-sp'); go('q-learners'); ok('L3D-6d a learner can\'t open the IQA learner list', !/Delivery mode/.test(main()) || !!$1('main .lockpage'));
    });

    QA(); go('q-learners'); mode('Fully Assisted');
    signOutUI(); return next(1);
  }

  if (PH === 1) {
    await T('L3D-R after a real refresh', async () => {
      ok('L3D-R1 restored: the records, the set and the second allocation are kept', FCP.st === 'saved' && !!FCP.restored && STORE.iqa.recs.some(r => r.id === 'L3D-PD-1') && !!STORE.iqa.sets.find(x => x.id === SS.getItem(K + 'set')) && iqbCodesOf(IQA_A).includes('L3D-SECOND'));
      QA(); go('q-learners'); ok('L3D-R2 the filter starts at All delivery modes again', $1('main #l3d-m').value === 'all');
      mode('Self-Paced'); listAll('sibq-l'); ok('L3D-R3 and still filters after the refresh', rows().length === 4 && !rows().some(r => /Dev Patel/.test(r)));
      ACT.resetDemo(); closeModal(); ok('L3D-R4 Reset demo: the added records, batch and allocation are gone', !STORE.iqa.recs.some(r => /^L3D-/.test(r.id)) && !B('L3D-SECOND') && !iqbCodesOf(IQA_A).includes('L3D-SECOND'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  ['phase', 'R', 'set'].forEach(k => SS.removeItem(K + k));
})();
