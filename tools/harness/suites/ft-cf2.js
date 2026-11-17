// Client Feedback 2.0 (PD-CF2-*), client demo (FIXTURE=client): document requirements (programme checklist for agency and direct
// applications, short-course admission documents), bundle validity, Bulk CSV hidden, Observation Criteria tabs, assignment display
// mode (both modes submitted and marked; version safety), the Workplace Observation Book journey and its permissions, and the
// schedule builder (template recurrence and preview, fee-option targeting, scratch, Self-Paced-only, after-creation changes,
// calendars and Zoom access, template versions).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'CF2 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); code2fa(); S.ui = {}; };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const lastAudit = () => ADMIN.audit[0] || {};
  const fresh = () => { closeModal(); ACT.resetDemo(); closeModal(); };
  // the starting demo plus Demo controls → Load Client Feedback 2.0 examples (confirmed)
  const freshEx = () => { fresh(); ACT.cf2Examples(); press(); closeModal(); };
  // Create batch, steps 1–2 on the demo programme (the wizard's own fields); leaves the dialog on step 3
  const startNb = (code, modes) => { go('a-batches'); ACT.newBatch(); fill({ '#nb-c': code, '#nb-s': '2027-03-01', '#nb-e': '2027-11-30' }); const co = $1('#modal-root #nb-co'); co.value = CD_T; INP.n2NbCourse(co); $a('#modal-root .m-m').forEach(x => { x.checked = modes.includes(x.value); INP.mModeTick(x); }); prim(); $1('#modal-root #nb-ac').value = 'Dr Helen Carter'; $a('#modal-root .nb-t').forEach(i => { i.checked = i.value === CD_TEACHER; }); prim(); };

  await T('CF2-0 starting demo and the examples', async () => {
    fresh(); const b = cdBatch();
    ok('CF2-0a the starting demo: DEMO-L3-JAN27 built with the Mixed delivery template; no example data (Assignment 4, DEMO-L3-SP27, Dev\'s observation)', b.cf2Sched && b.cf2Sched.tpl === 'TPL-3' && !s2Defs().some(d => /Assignment 4/.test(d.title)) && !ADMIN.batches.some(x => x.code === 'DEMO-L3-SP27') && !STORE.worlds.CD2.observations.length && !(STORE.cf2 && STORE.cf2.examples));
    S.demoOpen = true; render(); ok('CF2-0b Demo controls offer "Load Client Feedback 2.0 examples"', !!document.querySelector('#demo-root [data-act="cf2Examples"]')); S.demoOpen = false; render();
    freshEx(); ok('CF2-0c the examples load through the normal screens without a refused step', J(CF2().demoErr) === '[]' && STORE.cf2.examples === true && !S.signedIn, J(CF2().demoErr));
    const cnt = () => J([ADMIN.learners.length, ADMIN.batches.length, s4bAllSess().length, s2Defs().length, Object.values(STORE.worlds).reduce((a, w) => a + ((w && w.observations) || []).length, 0), (STORE.chFees || []).length]), n1 = cnt();
    ACT.cf2Examples(); closeModal(); ok('CF2-0e a second load is refused: nothing duplicated', cnt() === n1);
    ok('CF2-0f the only finance effect is Dev\'s observation fee (Due, raised by his confirmed observation); no plan or payment changed', (STORE.chFees || []).length === 1 && STORE.chFees[0].lid === STORE.worlds.CD2.me.id && STORE.chFees[0].status === 'Due');
    fresh(); ok('CF2-0d Reset demo removes them', !s2Defs().some(d => /Assignment 4/.test(d.title)) && !ADMIN.batches.some(x => x.code === 'DEMO-L3-SP27'));
  });

  /* ---------- A2 document requirements ---------- */
  await T('CF2-A2 programme checklist: agency and direct applications', async () => {
    fresh(); pick('super');
    const pr = cdPr(), pid = pr.id, L0 = s4List(pid), v0 = L0.v, w2 = STORE.worlds.CD2, L = ADMIN.learners.find(x => x.id === w2.me.id);
    const it = n => L0.items.find(i => i.status === 'Active' && n.test(i.name));
    ok('CF2-A2-0 the demo programme\'s checklist has Enhanced DBS optional and mandatory items', !!it(/Enhanced DBS/) && !it(/Enhanced DBS/).mand && L0.items.some(i => i.status === 'Active' && i.mand), J(L0.items.map(i => [i.name, i.mand, i.applies])));
    const seat = (id) => ({ id, kind: 'nvq', course: pr.title, lid: L.id, learner: L.name, agency: ADMIN.agencies[0].name, at: now().toISOString(), status: 'Admission pending', bundle: null });
    const ap = ag1NvqApp(seat('AS-CF2-1'), L, null, true), want = s4ItemsFor(pid, 'United Kingdom');
    ok('CF2-A2-1 an agency application lists the programme\'s own items: name, mandatory/optional, formats, size, guidance, expiry', ap.docs.length === want.length && ap.docs.every((d, k) => d.name === want[k].name && d.mand === want[k].mand && d.formats === want[k].formats && d.max === want[k].max && (d.guide || '') === (want[k].guide || '') && !!d.expiryReq === !!want[k].expiry), J(ap.docs.map(d => [d.name, d.mand])));
    ok('CF2-A2-2 optional stays optional for the agency applicant (Enhanced DBS), mandatory stays mandatory; the checklist version is recorded', !ap.docs.find(d => /Enhanced DBS/.test(d.name)).mand && want.filter(i => i.mand).every(i => ap.docs.find(d => d.name === i.name).mand) && ap.cf2Ck.v === v0);
    const wa = STORE.worlds.CD1, before = J(wa.docs.map(d => [d.name, d.mand]));
    ok('CF2-A2-3 a direct sign-up uses the same checklist (pinned version, same mandatory flags)', wa.signup.checklistV === v0 && wa.docs.every(d => { const x = L0.items.find(i => i.name === d.name); return x && x.mand === d.mand && x.formats === d.formats; }), J(wa.docs.map(d => [d.name, d.mand])));
    // CDA-A3 (PD-CDA-A03): the published list changes in a new version and applies when it is published (was: edited in place)
    ACT.s3WizVersion({ dataset: { id: pid } }); reason('CF2: new version'); go('a-programmes', { id: pid, tab: 'details' }); { const y = $1('main #cbr2-obs-yes'); y.checked = true; INP.cbr2Obs(y); if (MODAL) { const a = MODAL.actions.find(x => /danger|primary/.test(x.cls || '')); if (a && a.fn) a.fn(); closeModal(); } }
    go('a-programmes', { id: pid, tab: 'admdocs' }); const k = L0.items.findIndex(i => i.status === 'Active' && i.mand && i.applies !== 'UAE');
    const name = L0.items[k].name; ACT.s4CkEdit({ dataset: { p: pid, i: String(k) } }); $1('#ck-m').value = '0'; reason('CF2: make it optional');
    ACT.cbPublish({ dataset: { id: pid } }); reason('CF2: publish the version'); render();
    const ap2 = ag1NvqApp(seat('AS-CF2-2'), L, null, true);
    ok('CF2-A2-4 after a checklist change (new version), a new agency application gets the change; earlier applications and sign-ups keep theirs', s4List(pid).v === v0 + 1 && ap2.cf2Ck.v === v0 + 1 && !ap2.docs.find(d => d.name === name).mand && ap.docs.find(d => d.name === name).mand && J(wa.docs.map(d => [d.name, d.mand])) === before, J({ v: s4List(pid).v, name }));
    ok('CF2-A2-5 a new direct sign-up would get the change too (same source)', s4DocsFor(pid, 'United Kingdom').find(d => d.name === name).mand === false);
    pick('aca'); go('a-admissions', { id: ap2.id }); ok('CF2-A2-6 the application page names the checklist version and counts mandatory / optional', !!$1('main .cf2-appck') && /version/.test($1('main .cf2-appck').textContent));
  });
  await T('CF2-A2 short courses: optional admission documents', async () => {
    fresh(); pick('aca'); const row = ADMIN.courses.find(c => c.id === FX_SHORT), lena = STORE.worlds.CD3, le = lena.enrolments.find(e => e.kind === 'short');
    go('a-courses', { id: row.id, tab: 'docs' });
    ok('CF2-A2S-1 the short course has an "Admission documents" tab; none required by default', !!$1('main .cf2-sctab[aria-selected="true"]') && !!$1('main .cf2-scnone') && !le.cf2Docs);
    ACT.cf2ScAdd({ dataset: { id: row.id } }); fill({ '#ck-n': 'Photo ID', '#ck-f': 'PDF, JPG or PNG', '#ck-s': '5', '#ck-g': 'Passport or driving licence photo page.' }); $1('#ck-m').value = '1'; reason('CF2 short course');
    ACT.cf2ScAdd({ dataset: { id: row.id } }); fill({ '#ck-n': 'Employer letter', '#ck-f': 'PDF', '#ck-s': '2', '#ck-g': '' }); $1('#ck-m').value = '0'; reason('CF2 short course');
    const L = cf2ScList(row.id);
    ok('CF2-A2S-2 two documents configured with their own requirements (mandatory / optional, formats, size)', L.items.length === 2 && L.items[0].mand && !L.items[1].mand && L.items[1].formats === 'PDF' && L.items[1].max === '2 MB', J(L.items));
    pick('fin'); const a0 = ADMIN.audit.length; ACT.cf2ScAdd({ dataset: { id: row.id } });
    ok('CF2-A2S-3 Finance can\'t change a course\'s admission documents (refused, logged)', !MODAL && ADMIN.audit.length > a0 && /Blocked: change admission documents/.test(lastAudit().action));
    pick('nvq-sp'); const c = CATALOGUE.find(x => x.kind === 'short' && x.course === row.id); go('course-info', { id: c.id });
    ok('CF2-A2S-4 the learner sees the documents before buying, with mandatory / optional, and that access doesn\'t wait for them', !!$1('main .cf2-scinfo') && /Photo ID/.test(main()) && /Employer letter/.test(main()) && /doesn't wait/.test(main()));
    fxFast(ff => { ACT.n1bBuy({ dataset: { id: c.id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'CF2'; }); prim(); } if (MODAL && /Pay now/.test(MODAL.title || '')) prim(); ff(3000); closeModal(); });
    const e = W.enrolments.find(x => x.kind === 'short' && x.courseId === row.id && x.status === 'Active');
    ok('CF2-A2S-5 the purchase copies the list (with its version) onto the enrolment; access is open at once', !!e && !!e.cf2Docs && e.cf2Docs.items.length === 2 && e.cf2Docs.v === L.v && e.status === 'Active', J(e && e.cf2Docs));
    go('course', { id: e.id }); ok('CF2-A2S-6 the course page asks for the documents and the course isn\'t locked', !!$1('main .cf2-scup') && !$1('main .lockpage'));
    const up = (name, size) => INP.cf2ScUp({ dataset: { e: e.id, d: 'scd2' }, files: [{ name, size }], value: '' });
    up('letter.png', 1000); ok('CF2-A2S-7 a file in a format the document doesn\'t accept is refused', !e.cf2Docs.items[1].file);
    up('letter.pdf', 3 * 1048576); ok('CF2-A2S-8 a file over the maximum size is refused', !e.cf2Docs.items[1].file);
    up('letter.pdf', 1000); ok('CF2-A2S-9 an accepted file is recorded with its history', e.cf2Docs.items[1].file === 'letter.pdf' && e.cf2Docs.items[1].versions.length === 1);
    ok('CF2-A2S-10 an earlier enrolment (Lena, before the change) is unchanged: no documents', !lena.enrolments.find(x => x.kind === 'short').cf2Docs);
  });

  /* ---------- A3 bundle validity ---------- */
  await T('CF2-A3 bundle validity', async () => {
    fresh(); pick('biz'); ACT.newBundle(); fill({ '#bp-n': 'CF2 validity test' }); $a('#modal-root .bp-c')[0].checked = true; INP.bpCalc();
    const saveA = () => MODAL.actions.find(a => /Save/.test(a.label)), n0 = STORE.biz.products.length, bad = [];
    ['0', '-5', '1.5', '', 'abc'].forEach(v => { $1('#bp-v').value = v; INP.bpCalc(); const r = saveA().fn(); if (r !== false || STORE.biz.products.length !== n0 || !/whole number of days/.test(($1('#bp-out') || {}).textContent || '')) bad.push(v); });
    ok('CF2-A3-1 zero, negative, decimal, empty and non-numeric validity are refused with a message; nothing is saved', !bad.length && !!MODAL, J(bad));
    $1('#bp-v').value = '600'; INP.bpCalc(); saveA().fn(); closeModal(); const p = STORE.biz.products.find(x => x.name === 'CF2 validity test');
    ok('CF2-A3-2 600 days is accepted and stored as 600 (never 365)', !!p && p.days === 600);
    ok('CF2-A3-3 the price doesn\'t depend on validity', J(priceOf({ ...p, days: 365 })) === J(priceOf(p)) && J(priceOf({ ...p, days: 1095 })) === J(priceOf(p)));
    p.days = -5; const st0 = p.status; ACT.bPublish({ dataset: { id: p.id } });
    ok('CF2-A3-4 a stored invalid validity can\'t be published (refused, logged)', p.status === st0 && !MODAL && /invalid validity/.test(lastAudit().action)); p.days = 600;
  });

  /* ---------- F1 Bulk CSV, E1 Observation Criteria ---------- */
  await T('CF2-F1 and E1', async () => {
    fresh(); pick('aca'); go('a-batches', { id: CD_B }); ok('CF2-F1-1 the batch roster no longer shows Bulk CSV; Add learner stays', !/Bulk CSV/.test(main()) && !!$1('main [data-act="addToBatch"]'));
    startNb('CF2-F1B', ['Self-Paced', 'Fully Assisted']); prim();
    ok('CF2-F1-2 Create batch → Intake rule: no Bulk (CSV) option; Manual and Automatic remain', /step 4 of 5/.test(MODAL.title) && !$1('#modal-root input[name="nb-in"][value="Bulk (CSV)"]') && !!$1('#modal-root input[name="nb-in"][value="Manual"]')); closeModal();
    ok('CF2-F1-3 the refusal behind it and the learner-account import are unchanged', ACT.s5cBatchCsv() === false && typeof ACT.importCsv === 'function'); closeModal();
    const g = KNAV.flatMap(x => x[1]);
    ok('CF2-E1-1 one menu entry "Observation Criteria"; the legacy list is no longer a separate menu entry', g.filter(x => x[0] === 'k-ocl').length === 1 && g.find(x => x[0] === 'k-ocl')[1] === 'Observation Criteria' && !g.some(x => x[0] === 'k-obslib'));
    go('k-ocl'); ok('CF2-E1-2 Criteria Library tab (current library, its actions)', !!$1('main .cf2-octabs [data-go="k-ocl"][aria-selected="true"]') && !!$1('main .cf2-octabs [data-go="k-obslib"]'));
    const lib0 = J(s3Lib()); go('k-obslib');
    ok('CF2-E1-3 Legacy Criteria tab: labelled historical, read-only (no add / edit / attach / retire)', !!$1('main .cf2-octabs [data-go="k-obslib"][aria-selected="true"]') && !!$1('main .cf2-legnote') && !$1('main [data-act="kLib"], main [data-act="kLibAttach"], main [data-act="kLibRetire"]') && /IA-1/.test(main()));
    const a0 = ADMIN.audit.length; ACT.kLib({ dataset: { id: '' } }); ACT.kLibRetire({ dataset: { id: 'IA-1' } });
    ok('CF2-E1-4 the Academic Admin can\'t change legacy criteria (refused, logged); nothing changed', !MODAL && ADMIN.audit.length >= a0 + 2 && J(s3Lib()) === lib0);
    pick('super'); go('k-obslib'); const sw = $1('main .cf2-legmaint input'); ok('CF2-E1-5 the Super Administrator has "Historical corrections" (off by default)', !!sw && !sw.checked && !$1('main [data-act="kLib"]'));
    sw.checked = true; INP.cf2LegMaint(sw); ok('CF2-E1-6 …turning it on shows the existing maintenance actions; the data and codes are unchanged', !!$1('main [data-act="kLib"]') && J(s3Lib()) === lib0);
  });

  /* ---------- C1 assignment display mode ---------- */
  await T('CF2-C1 two modes, submission, marking, version safety', async () => {
    freshEx(); const A4 = s2Defs().find(d => d.title === 'Assignment 4 — Evidence against the criteria'), am = STORE.worlds.CD1;
    ok('CF2-C1-0 Assignment 4 was published as Criteria as Questions; Assignments 1–2 as Questions + Criteria; the programme default is back', A4 && A4.dispMode === 'cq' && s2Def('a10').dispMode === 'qc' && cf2DispOf(cdPr().id) === 'qc');
    pick('nvq-sp'); go('assignment', { id: 'a10' });
    ok('CF2-C1-1 Questions + Criteria: the existing question presentation (Q1 with its criterion)', !$1('main .cf2-cqh') && /Q1/.test(main()) && /001 1\.1/.test(main()));
    go('assignment', { id: A4.id });
    ok('CF2-C1-2 Criteria as Questions: one answer item per scoped criterion (001 1.1, 001 1.2), from the programme\'s own criteria', J($a('main .cf2-cqh').map(x => x.dataset.crit)) === J(['001 1.1', '001 1.2']) && /Explain person-centred values/.test(main()) && /Describe how to agree a care plan/.test(main()) && !!$1('main .cf2-cqnote'));
    ok('CF2-C1-3 …with the References section and the question as guidance', /References/.test(main()) && !!$1('main .cf2-cqg'));
    const a = W.assignments.find(x => x.id === A4.id); a.qs.forEach(q => { W.drafts[a.id + '.' + q.id + '.' + q.rounds.length] = '<p>CF2 answer for ' + q.crit + '</p>'; }); W.drafts[a.id + '.refs.0'] = '<p>Care Act 2014</p>';
    finaliseSubmit(a, false, now().toISOString()); closeModal();
    ok('CF2-C1-4 the learner submits: each criterion has its own answer round', a.status === 'Submitted' && a.qs.every(q => q.rounds.length === 1 && /CF2 answer for/.test(q.rounds[0].html)), a.status);
    pick('assessor'); const key = am.me.id + '~' + A4.id, s = tasSubs(true).find(x => x.key === key), sa = s && tasAsg(s);
    ok('CF2-C1-5 the Assessor marks each criterion item (one criterion each)', !!sa && markable(sa).length === 2 && markable(sa).every(q => qCrits(q).length === 1));
    go('t-mark', { id: key }); ok('CF2-C1-6 the marking view shows the criteria as the items', $a('main .cf2-cqh').length === 2);
    const d = dft(key); markable(sa).forEach(q => { d.items[q.id] = { exit: 'pass', corrections: '', days: 7, rag: 'G', met: 'Met', verified: true, vby: TME().name, vat: now().toISOString(), fb: 'Clear and specific.' }; }); const pub = ta1Publish(key);
    ok('CF2-C1-7 the Assessor publishes: both criteria verified (Assessor authority unchanged)', pub !== false && ['001 1.1', '001 1.2'].every(c => (am.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit)))).find(x => x.code === c).st === 'Achieved'), J(pub));
    pick('coord1'); go('c-sub', { id: key }); ok('CF2-C1-8 the Coordinator sees the criterion items on the submission', /001 1\.1/.test(main()) && /Explain person-centred values/.test(main()));
    pick('aca'); const pid = cdPr().id, c10 = J(am.assignments.find(x => x.id === 'a10')), c13 = J(am.assignments.find(x => x.id === A4.id).qs);
    go('a-programmes', { id: pid, tab: 'assessments' }); $1('main input[name="cf2-dm"][value="cq"]').checked = true; ACT.cf2DispSave({ dataset: { p: pid } }); reason('CF2 version safety');
    ok('CF2-C1-9 changing the programme setting changes no learner copy or submitted answer', cf2DispOf(pid) === 'cq' && J(am.assignments.find(x => x.id === 'a10')) === c10 && J(am.assignments.find(x => x.id === A4.id).qs) === c13);
    ACT.pubAsg({ dataset: { id: 'a12' } }); $a('#modal-root .s2-pb').forEach(x => { x.checked = x.value === CD_B; }); const dl = $1(`#modal-root #cr-pd-${CD_B}`); if (dl) dl.value = cdLondon(D(150).slice(0, 10), 17); reason('CF2 publish');
    const c12 = am.assignments.find(x => x.id === 'a12');
    ok('CF2-C1-10 an assignment published after the change uses the new mode; earlier ones keep theirs', s2Def('a12').dispMode === 'cq' && c12 && c12.dispMode === 'cq' && c12.qs.every(q => q.cq) && s2Def('a10').dispMode === 'qc');
    go('a-programmes', { id: pid, tab: 'assessments' }); $1('main input[name="cf2-dm"][value="qc"]').checked = true; ACT.cf2DispSave({ dataset: { p: pid } }); reason('CF2 back');
    ok('CF2-C1-11 …and switching back changes neither (both recorded in the history)', c12.dispMode === 'cq' && s2Def('a12').dispMode === 'cq' && cf2DispRec(pid).hist.length >= 4 && /Assignment display mode changed/.test(lastAudit().action));
  });

  /* ---------- D1 Observation Book ---------- */
  await T('CF2-D1 Workplace Observation Book', async () => {
    freshEx(); const w = STORE.worlds.CD2, lid = w.me.id, o = w.observations.find(x => x.dEv === 'EV-1'), rid = 'CD2-' + o.id;
    ok('CF2-D1-0 Dev Patel has a scheduled (confirmed) workplace observation with his observation assessor', o && o.status === 'Confirmed' && w.workplace.perm === 'Granted' && chEff(lid, 'obs') === 'James Pryce');
    // Administrators and the Coordinator calling the recording actions directly change nothing (not only hidden buttons)
    for (const p of ['aca', 'super', 'coord2']) { pick(p); S.params = { id: rid }; const d0 = J(STORE.tas.obsDraft[rid] || null); ACT.ol1Out({ dataset: { id: rid, c: 'OCR-1', v: 'Met' } }); INP.cf2CEv({ dataset: { s: 'nvq', c: '001 2.1' }, files: [{ name: 'x.pdf', size: 1 }], value: '' }); ACT.orSign({ dataset: { id: rid } }); closeModal();
      ok(`CF2-D1-0b ${p}: direct outcome / evidence / sign-off calls are refused`, o.status === 'Confirmed' && J(STORE.tas.obsDraft[rid] || null) === d0); }
    pick('assessor'); go('t-students', { id: lid, tab: 'observations' }); ok('CF2-D1-1 Assessor → My Students → learner → Observations: "Open Observation Book"', !!$1('main [data-go="t-obsbook"]'));
    go('t-obsbook', { id: lid });
    ok('CF2-D1-2 the book: learner, programme, version, batch, workplace, assessor', /Dev Patel/.test(main()) && /Version 1/.test(main()) && main().includes(CD_B) && /Elm House/.test(main()) && /James Pryce/.test(main()));
    ok('CF2-D1-3 NVQ and Academy criteria shown as separate sets (001 2.1; the Criteria Library items for the workplace)', !!$1('main .cf2-set[data-set="nvq"] [data-code="001 2.1"]') && $a('main .cf2-set[data-set="academy"] [data-code^="ABS-"]').length >= 1 && !$1('main .cf2-set[data-set="nvq"] [data-code^="ABS-"]'));
    ok('CF2-D1-4 the confirmed record can be started from the book', !!$1(`main .cf2-rec[data-st="Confirmed"] [data-go="t-obsrec"]`));
    go('t-obsrec', { id: rid });
    ACT.orT({ dataset: { s: 'nvq', c: '001 2.1', k: 'o', v: '1' } }); ACT.orT({ dataset: { s: 'nvq', c: '001 2.1', k: 'c', v: '1' } }); INP.orM({ dataset: { s: 'nvq', c: '001 2.1' }, value: 'Offered two choices and respected the decision.' });
    INP.cf2Perf({ dataset: { s: 'nvq', c: '001 2.1' }, value: 'Supported the individual to choose lunch and clothing; checked understanding.' });
    INP.cf2CEv({ dataset: { s: 'nvq', c: '001 2.1' }, files: [{ name: 'care-plan-extract-redacted.pdf', size: 2048 }], value: '' });
    // each Criteria Library item: its required evidence (a note, a reference or a file, by type), then the Assessor's own outcome
    const items = ol1RecItems(obById(rid)); items.forEach(i => { (i.req || []).forEach(t => { if (['notes', 'refs'].includes(t)) ACT.ol1EvAdd({ dataset: { id: rid, c: i.id, t, text: t === 'refs' ? 'DOC-REF-001 (approved storage)' : 'Observed during the lunchtime routine (no names recorded).' } }); else INP.ol1File({ dataset: { id: rid, c: i.id, t }, files: [{ name: 'evidence-' + i.code + '.pdf', size: 1024 }] }); }); ACT.ol1Out({ dataset: { id: rid, c: i.id, v: 'Met' } }); });
    INP.orF({ dataset: { f: 'ctx' }, value: 'Lunchtime routine in the lounge.' }); INP.orF({ dataset: { f: 'notes' }, value: 'Calm, person-centred support throughout.' }); render(); $a('main .d-evt').forEach(x => { x.checked = true; }); INP.dEvt();
    ACT.orSave(); const dr = STORE.tas.obsDraft[rid];
    ok('CF2-D1-5 Save draft records who and when (audited)', !!dr && dr.savedBy === 'James Pryce' && !!dr.savedAt && /Observation draft saved/.test(lastAudit().action));
    go('t-dashboard'); go('t-obsbook', { id: lid }); ok('CF2-D1-6 the book shows the saved draft and "Reopen draft"', /Draft saved/.test(main()) && /Reopen draft/.test(main()));
    go('t-obsrec', { id: rid }); const pf = $1('#cf2-p-nvq-001_2_1');
    ok('CF2-D1-7 reopening keeps the outcomes, remarks, performance and the evidence on the right criterion', !!pf && /choose lunch/.test(pf.value) && STORE.tas.obsDraft[rid].nvq['001 2.1'].o === 1 && STORE.tas.obsDraft[rid].cev['nvq|001 2.1'][0].name === 'care-plan-extract-redacted.pdf' && /care-plan-extract/.test(main()));
    TCH('O'); S.params = { id: rid }; const n0 = STORE.tas.obsDraft[rid].cev['nvq|001 2.1'].length; INP.cf2CEv({ dataset: { s: 'nvq', c: '001 2.1' }, files: [{ name: 'x.jpg', size: 1 }], value: '' });
    ok('CF2-D1-8 another Assessor can\'t add evidence to this record (refused)', STORE.tas.obsDraft[rid].cev['nvq|001 2.1'].length === n0);
    go('t-obsbook', { id: lid }); ok('CF2-D1-9 …and reads the book without the record action', /Observation Book/.test(main()) && !$1('main [data-go="t-obsrec"]'));
    TCH('T'); go('t-obsbook', { id: lid }); ok('CF2-D1-10 a Teacher can\'t open it', /Not part of your role|can't open/i.test(main()));
    pick('assessor'); go('t-obsrec', { id: rid }); ACT.orSign({ dataset: { id: rid } }); const sa = MODAL && MODAL.actions.find(x => x.label === 'Sign off and lock'); if (sa) sa.fn(); closeModal();
    const r = o.report || {}, t21 = w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).find(c => c.code === '001 2.1');
    ok('CF2-D1-11 sign-off (existing rules) completes and locks the record', o.status === 'Completed' && !!o.signed);
    ok('CF2-D1-12 the report keeps the per-criterion performance and evidence, attributed', r.cf2 && /choose lunch/.test(r.cf2.perf.nvq['001 2.1']) && r.cf2.ev['nvq|001 2.1'][0].by === 'James Pryce' && (r.ol1 || []).every(x => x.out === 'Met'), J(r.cf2));
    ok('CF2-D1-13 the competency record and the portfolio reflect it (Achieved, verified by the Assessor)', t21.st === 'Achieved' && t21.lock && t21.lock.by === 'James Pryce');
    go('t-portfolio', { id: lid }); const pr = $1('main .cf2-pfc[data-code="001 2.1"]'); ok('CF2-D1-14 portfolio row: Achieved, verified by James Pryce', !!pr && pr.dataset.st === 'Achieved' && /verified by James Pryce/.test(pr.textContent));
    S.params = { id: rid }; const repL = J(o.report); INP.cf2Perf({ dataset: { s: 'nvq', c: '001 2.1' }, value: 'tamper' }); INP.cf2CEv({ dataset: { s: 'nvq', c: '001 2.1' }, files: [{ name: 't.pdf', size: 1 }], value: '' }); ACT.ol1Out({ dataset: { id: rid, c: 'OCR-1', v: 'Not yet met' } }); ACT.orSign({ dataset: { id: rid } }); closeModal();
    ok('CF2-D1-14b the signed record is locked: the Assessor\'s own direct calls change nothing', J(o.report) === repL && o.status === 'Completed' && o.signedBy === 'James Pryce');
    const rep0 = J(o.report); pick('coord2'); go('c-learner', { id: lid, tab: 'observations' }); ok('CF2-D1-15 Coordinator → learner → Observations: "Open Observation Book"', !!$1('main [data-go="c-obsbook"]'));
    go('c-obsbook', { id: lid }); const ta = $1(`main #cf2-fb-${rid}`); ok('CF2-D1-16 the designated Coordinator reads the record and can add feedback', !!ta && /Not Yet|Observed/.test(main()));
    ta.value = 'Good use of choice; consider recording the individual\'s preferences in the plan.'; ACT.cf2ObsFb({ dataset: { l: lid, r: rid } });
    ok('CF2-D1-17 Coordinator feedback is attributed and separate; the Assessor\'s outcomes are unchanged', cf2Fb(rid).length === 1 && cf2Fb(rid)[0].role === 'Academic Coordinator' && cf2Fb(rid)[0].by === CME().name && J(o.report) === rep0);
    pick('coord1'); go('c-obsbook', { id: lid }); const n1 = cf2Fb(rid).length; ACT.cf2ObsFb({ dataset: { l: lid, r: rid } });
    ok('CF2-D1-18 a Coordinator who isn\'t the learner\'s designated Coordinator can read but not add feedback', /Coordinator feedback/.test(main()) && !$1(`main #cf2-fb-${rid}`) && cf2Fb(rid).length === n1);
    for (const p of ['aca', 'super', 'sys']) { pick(p); go('a-obsbook', { id: lid }); ok(`CF2-D1-19 ${p}: reads the book (read-only, no record or feedback action)`, /Read-only/.test(main()) && /Good use of choice/.test(main()) && !$1('main [data-go="t-obsrec"], main [data-act="cf2ObsFb"]')); }
    pick('fin'); go('a-obsbook', { id: lid }); ok('CF2-D1-20 Finance can\'t open it', !/Good use of choice/.test(main()));
    pick('nvq-fa'); go('observations'); ok('CF2-D1-21 the learner sees the completed observation and its report', /Completed/.test(main()) && !!$1('main [data-act="obsReport"]'));
  });

  /* ---------- B scheduling ---------- */
  await T('CF2-B builder: templates, recurrence, targeting, scratch', async () => {
    freshEx(); pick('aca'); const pid = cdPr().id, SP = r1Opts(pid).find(o => o.mode === 'Self-Paced').id, FA = r1Opts(pid).find(o => o.mode === 'Fully Assisted').id;
    const start = startNb;
    start('CF2-WK', ['Self-Paced', 'Fully Assisted']);
    ok('CF2-B1-1 step 3 is the Schedule & Sessions builder (template or scratch; scratch by default)', /step 3 of 5/.test(MODAL.title) && !!$1('#modal-root #cf2-sb') && $1('#modal-root input[name="cf2-sbm"][value="scratch"]').checked);
    const gaps = t => { const xs = CF2_NB.rows.filter(r => r.title === t).map(r => r.start); return xs.slice(1).map((s, i) => Math.round((new Date(s) - new Date(xs[i])) / DAY)); };
    INP.cf2SbMode({ value: 'tpl' }); INP.cf2SbTpl({ value: 'TPL-1' });
    ok('CF2-B1-2 a weekly template generates real weekly dates, for the Fully Assisted option only', gaps('Weekly live class').length >= 5 && gaps('Weekly live class').every(g => g === 7) && CF2_NB.rows.filter(r => r.title === 'Weekly live class').every(r => J(r.aud) === J([FA])), J(gaps('Weekly live class')));
    const wk = J(CF2_NB.rows.map(r => r.start)); INP.cf2SbTpl({ value: 'TPL-2' });
    ok('CF2-B1-3 a fortnightly template generates 14-day dates — different from the weekly one', gaps('Fortnightly live class').every(g => g === 14) && gaps('Fortnightly live class').length >= 3 && J(CF2_NB.rows.map(r => r.start)) !== wk);
    INP.cf2SbTpl({ value: 'TPL-3' });
    ok('CF2-B1-4b four-weekly rows are exactly 28 days apart; every weekly date is a Tuesday', gaps('Monthly workshop (shared)').length >= 1 && gaps('Monthly workshop (shared)').every(g => g === 28) && CF2_NB.rows.filter(r => r.title === 'Weekly live class').every(r => new Date(r.start).getUTCDay() === 2));
    ok('CF2-B1-4c a forged fee option is refused by the row check', /isn't offered/.test(cf2RowWhy({ title: 'x', start: '2027-03-20T10:00:00.000Z', mins: 60, teacher: CD_TEACHER, aud: ['NOT-AN-OPTION'] })));
    ok('CF2-B1-4 the preview lists every generated session with its date, time, length, teacher, place and audience', $a('#modal-root .cf2-sbr').length === CF2_NB.rows.length && /Weekly live class/.test(mtxt()) && /Fully Assisted/.test(mtxt()) && /Self-Paced/.test(mtxt()) && /Croydon/.test(mtxt()) && gaps('Self-Paced check-in').every(g => g === 14) && gaps('Monthly workshop (shared)').every(g => g === 28));
    const r1 = CF2_NB.rows.find(r => r.title === 'Weekly live class'); ACT.cf2SbEdit({ dataset: { k: r1.key } }); $1('#cf2f-t').value = 'Weekly live class (moved room)'; $1('#cf2f-w').value = 'room'; $1('#cf2f-l').value = 'Room 4'; ACT.cf2SbDone({ dataset: { k: r1.key } });
    ok('CF2-B1-5 a generated session can be edited before confirming', r1.title === 'Weekly live class (moved room)' && r1.where === 'room' && r1.loc === 'Room 4');
    const n0 = CF2_NB.rows.length; ACT.cf2SbRm({ dataset: { k: CF2_NB.rows[0].key } }); ok('CF2-B1-6 …and removed', CF2_NB.rows.length === n0 - 1);
    ACT.cf2SbAdd(); fill({ '#cf2f-t': 'Revision class', '#cf2f-d': '2027-03-20T10:00', '#cf2f-m': '60' }); $1('#cf2f-r').value = '1'; $1('#cf2f-n').value = '3'; $a('#modal-root .cf2f-a').forEach(x => { x.checked = false; }); ACT.cf2SbDone({ dataset: { k: '' } });
    ok('CF2-B1-7 a session needs at least one fee option ticked', CF2_NB.rows.length === n0 - 1 && /at least one fee option/.test(mtxt()));
    $a('#modal-root .cf2f-a').forEach(x => { x.checked = x.value === SP; }); $1('#cf2f-x').value = 'Bring your workbook.'; ACT.cf2SbDone({ dataset: { k: '' } });
    const rv = CF2_NB.rows.filter(r => r.title === 'Revision class');
    ok('CF2-B1-8 sessions can be added, with recurrence (weekly × 3) and a Self-Paced-only audience and instructions', rv.length === 3 && rv.every(r => J(r.aud) === J([SP]) && r.desc === 'Bring your workbook.') && Math.round((new Date(rv[1].start) - new Date(rv[0].start)) / DAY) === 7);
    const want = CF2_NB.rows.map(r => [r.title, r.start, J(r.aud || null)]).sort((a, b) => (a[1] + a[0]).localeCompare(b[1] + b[0]));
    prim(); ok('CF2-B1-9 the next step is Intake rule', /step 4 of 5/.test(MODAL.title)); prim(); prim(); closeModal();
    const b = ADMIN.batches.find(x => x.code === 'CF2-WK'), got = s4bSessFor('CF2-WK').map(s => [s.title, s.start, J(s.aud || null)]).sort((a, c) => (a[1] + a[0]).localeCompare(c[1] + c[0]));
    ok('CF2-B1-10 creating the batch makes exactly the previewed sessions (same dates and audiences) as real sessions', !!b && J(got) === J(want), J({ got: got.length, want: want.length }));
    ok('CF2-B1-11 the batch records its template and version; no placeholder deadlines, observation windows or milestones', b.cf2Sched.tpl === 'TPL-3' && b.cf2Sched.tplV === 1 && !batchEvents(b).some(e => ['deadline', 'obs', 'mile'].includes(e.type)) && /Schedule builder/.test(b.sched));
    start('CF2-SCR', ['Self-Paced', 'Fully Assisted']); prim(); prim(); prim(); closeModal();
    ok('CF2-B1-12 from scratch, a batch can be created with no sessions', !!ADMIN.batches.find(x => x.code === 'CF2-SCR') && s4bSessFor('CF2-SCR').length === 0);
    start('CF2-SPO', ['Self-Paced']); INP.cf2SbMode({ value: 'tpl' }); INP.cf2SbTpl({ value: 'TPL-3' }); ACT.cf2SbAdd();
    ok('CF2-B2-1 a Self-Paced-only batch: only Self-Paced options are offered; the Fully Assisted row isn\'t generated (said so)', CF2_NB.opts.every(o => o.mode === 'Self-Paced') && $a('#modal-root .cf2f-a').every(x => x.value === SP) && CF2_NB.skipped.some(s => /Fully Assisted/.test(s)) && !CF2_NB.rows.some(r => r.title === 'Weekly live class'));
    closeModal(); const spb = ADMIN.batches.find(x => x.code === 'DEMO-L3-SP27');
    ok('CF2-B2-2 the demo\'s Self-Paced-only batch: Planned, Self-Paced fee option only, its sessions for that option', spb && spb.status === 'Planned' && J(crBModes(spb)) === J(['Self-Paced']) && s4bSessFor(spb.code).length > 0 && s4bSessFor(spb.code).every(s => J(s.aud) === J([SP])));
  });
  await T('CF2-B after creation: calendars, changes, Zoom, templates', async () => {
    freshEx(); const am = STORE.worlds.CD1, dev = STORE.worlds.CD2, pid = cdPr().id, SP = r1Opts(pid).find(o => o.mode === 'Self-Paced').id, FA = r1Opts(pid).find(o => o.mode === 'Fully Assisted').id;
    const cal = w => { s4bSyncWEv(w); return w.events.filter(e => e.type === 'class'); };
    ok('CF2-B4-1 the Fully Assisted learner has the weekly classes; the Self-Paced learner doesn\'t', cal(dev).filter(e => e.title === 'Weekly live class').length >= 4 && !cal(am).some(e => e.title === 'Weekly live class'));
    ok('CF2-B4-2 the Self-Paced learner has the fortnightly check-ins; the Fully Assisted learner doesn\'t', cal(am).filter(e => e.title === 'Self-Paced check-in').length >= 2 && !cal(dev).some(e => e.title === 'Self-Paced check-in'));
    ok('CF2-B4-3 the shared monthly workshop is on both calendars', cal(am).some(e => /Monthly workshop/.test(e.title)) && cal(dev).some(e => /Monthly workshop/.test(e.title)));
    const rs = s4bSess(CD_B).find(s => s.hist.some(h => h[2] === 'Changed'));
    ok('CF2-B4-4 the rescheduled check-in shows its new time on the Self-Paced calendar, with history', !!rs && cal(am).some(e => e.id === 'bs-' + rs.id && e.start === rs.start) && rs.hist.some(h => /teacher is away/.test(h[5] || '')));
    pick('aca'); go('a-batches', { id: CD_B, tab: 'schedule' }); ok('CF2-B3-1 the batch Schedule tab names its builder origin and offers "Affected"', !!$1('main .cf2-origin') && !!$1('main [data-act="cf2Who"]'));
    ACT.addSession({ dataset: { b: CD_B } }); fill({ '#se-n': 'Extra catch-up class', '#se-d': '2027-02-10T17:00', '#se-m': '60', '#se-desc': 'Bring your care-plan notes.' }); $a('#modal-root .r2-g').forEach(x => { x.checked = x.value === FA; });
    let r = prim(), g = 0; while (r === false && MODAL && g++ < 3) r = prim(); closeModal();
    const ns = s4bSess(CD_B).find(s => s.title === 'Extra catch-up class');
    ok('CF2-B3-2 a session added after creation, for the Fully Assisted option, with instructions', !!ns && J(ns.aud) === J([FA]) && ns.desc === 'Bring your care-plan notes.');
    ok('CF2-B3-3 …appears on the Fully Assisted calendar (with its instructions), not on the Self-Paced one', cal(dev).some(e => e.title === 'Extra catch-up class' && e.desc === 'Bring your care-plan notes.') && !cal(am).some(e => e.title === 'Extra catch-up class'));
    ACT.cf2Who({ dataset: { id: ns.id } }); ok('CF2-B3-4 "Affected" lists the eligible learners, teacher and Coordinators', /Dev Patel/.test(mtxt()) && !/Amira Shah/.test(mtxt()) && /Coordinators/.test(mtxt())); closeModal();
    // Enforced on the call, not only by hiding the button: the Self-Paced learner's direct call is refused with no link; the FA learner gets it
    pick('nvq-sp'); let tz = ''; const _tz = toast; toast = function (m) { tz = String(m); return _tz.apply(this, arguments); };
    try { ACT.joinZoom({ dataset: { id: 'bs-' + ns.id } }); } finally { toast = _tz; } const leak = !!MODAL && /Meeting link/.test(mtxt()); closeModal();
    pick('nvq-fa'); ACT.joinZoom({ dataset: { id: 'bs-' + ns.id } }); const fa = !!MODAL && /Meeting link/.test(mtxt()); closeModal();
    ok('CF2-B4-5 Zoom: a Self-Paced learner\'s direct Join call for a Fully Assisted session is refused with no link; the Fully Assisted learner gets the link', !leak && /isn't on your timetable/.test(tz) && fa, tz);
    pick('aca'); const b = cdBatch(), wk = s4bSess(CD_B).find(s => s.title === 'Weekly live class' && s.status === 'Scheduled'); s4bCancel(b, batchEvents(b).find(e => e.id === wk.id), 'Teacher unwell (CF2)');
    ok('CF2-B4-6 a cancellation reaches the calendar, with no meeting to join', cal(dev).some(e => e.id === 'bs-' + wk.id && e.cancelled) && wk.hist[0][2] === 'Cancelled');
    const titles0 = J(s4bSess(CD_B).map(s => [s.id, s.title, s.start])); go('a-scheduling'); ok('CF2-B3-5 Scheduling → Schedule templates lists the templates and which batches use them', !!$1('main .cf2-tpls') && /DEMO-L3-JAN27 \(version 1\)/.test(main()));
    ACT.cf2TplEdit({ dataset: { t: 'TPL-3' } }); $1('#modal-root .cf2-te tbody tr [data-f="title"]').value = 'Induction (all learners)'; prim(); closeModal();
    ok('CF2-B3-6 editing a template makes a new version and never changes an existing batch', cf2Tpl('TPL-3').v === 2 && cf2Tpl('TPL-3').rows[0].title === 'Induction (all learners)' && J(s4bSess(CD_B).map(s => [s.id, s.title, s.start])) === titles0 && cdBatch().cf2Sched.tplV === 1);
    pick('fin'); const a0 = ADMIN.audit.length; ACT.cf2TplNew(); ok('CF2-B3-7 Finance can\'t manage schedule templates (refused, logged)', !MODAL && ADMIN.audit.length > a0);
  });

  /* ---------- H existing features (navigation the client asked about) ---------- */
  await T('CF2-H existing features', async () => {
    fresh(); pick('coord1'); go('c-progress'); ok('CF2-H-1 Coordinator → Progress & Competency: Cohort competency map', /Cohort competency map/i.test(main()));
    pick('aca'); go('a-batches', { id: CD_B, tab: 'staff' }); ok('CF2-H-3 Academic Admin → Batches → batch → Staff: change allocations', !!$1('main [data-act="batchStaff"]'));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
