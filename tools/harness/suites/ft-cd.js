// CD — the demo presets (26 Oct 2026; PD-CD-01…05): "Load clean client demo", the separate 101-learner Coordinator demo and Reset demo.
// FX (27 Oct 2026; PD-FX-01…): the client demo is now the default dataset (ACT.cdLoad loads it without a button; see ft-fx.js). This suite
// runs on the pinned legacy fixture; the checks that compared the client demo with seeded records are restated (each cites PD-FX).
// The client demo is built through the real screens on top of the seeded data; these checks confirm what it contains, that the seeded
// records and the DM-P gates are untouched, that the figures agree across screens, and that nothing financial or signed is invented.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, q = s => document.querySelector('main ' + s), qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const main = () => document.querySelector('main').textContent.replace(/\s+/g, ' ');
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  // the seeded records, as they are after a reset (the client demo adds its own and changes none of these)
  const seedSnap = () => J({ p: ADMIN.programmes.filter(p => p.title !== CD_T).map(p => [p.id, p.status, p.version, p.batches, p.learners]), b: ADMIN.batches.filter(b => b.code !== CD_B).map(b => [b.code, b.status, b.dmode, b.w1opts || null, batchRoster(b)]),
    l: ADMIN.learners.filter(l => !/\(demo\)$/.test(l.name)).map(l => [l.id, l.acct, l.rec, l.courses]), r1: ['NV-L2', 'NV-L3'].map(id => r1Opts(id)), plans: ['NV-L2', 'NV-L3'].map(id => s4Plans(id)),
    w: Object.entries(STORE.worlds).filter(([k]) => !CD_KEYS.includes(k)).map(([, w]) => [w.plans, w.tx, w.signup && w.signup.plan]), ledger: ADMIN.ledger, fees: STORE.chFees || null }).replace(/:\d\d\.\d{3}Z/g, 'Z'); // (a reset regenerates time-of-load stamps to the millisecond)

  await T('CD-A load the client demo', async () => {
    fresh(); SA(); const s0 = seedSnap();
    S.demoOpen = true; renderDemo();
    // FX (PD-FX-04) supersedes: was "the presets — client demo [cdLoad button], 101-learner Coordinator demo, Reset demo — … returns to the starting data";
    // the client demo is now the default dataset (no "Load clean client demo" button) and Reset demo returns to it
    ok('CD-A Demo controls: Reset demo, the 101-learner Coordinator demo, the legacy test data (no "Load clean client demo") — and that data lives only in this tab', !document.querySelector('#demo-root [data-act="cdLoad"]') && !!document.querySelector('#demo-root .cd-demo [data-act="mcDemoLoad"]') && !!document.querySelector('#demo-root .cd-demo [data-act="resetDemo"]') && !!document.querySelector('#demo-root .cd-demo [data-act="fxLegacy"]') && /Reloading the page or "Reset demo" returns to the client demo dataset; nothing is saved/.test(document.querySelector('#demo-root .cd-note').textContent));
    ACT.cdLoad(); const pr = cdPr(), b = cdBatch();
    ok('CD-A loaded: a published Level 3 programme and one batch; the 101-learner demo isn\'t loaded with it', !!pr && !!b && pr.status === 'Active' && pr.level === 'Level 3' && !mcdBatch());
    ok('CD-A the programme is eligible for new batches: approved Self-Paced and Fully Assisted fee options in force', crElig(pr) && J(crOptModes(pr.id)) === J(M_MODES));
    // FX (PD-FX-01): the client demo starts from a store without seeded approvals — was "ADMIN.queue.length === q0 + 1" (one new item on top of the seeded queue)
    ok('CD-A it was approved by a Finance Admin in the Approvals Queue (its only item) and published by the Academic Admin', ADMIN.queue.length === 1 && cb8Wf(pr).status === 'Approved' && ADMIN.audit.some(a => /Programme published|Version 1 published/.test(a.action) && a.entity.includes(pr.id) && a.actor === 'Rachel Hughes'));
    ok('CD-A the batch: Open, both modes, two Academic Coordinators', b.status === 'Open' && J(crBModes(b)) === J(M_MODES) && mcList(b).length === 2 && M_MODES.every(m => crReady(b, m) === 'ready'));
    const lids = mcLids(b), modes = lids.map(l => r2LidInfo(l, CD_B).mode), co = lids.map(l => mcOf(l, b));
    ok('CD-A four demo learners, two in each mode, allocated across both Coordinators', lids.length === 4 && modes.filter(m => m === 'Self-Paced').length === 2 && modes.filter(m => m === 'Fully Assisted').length === 2 && new Set(co).size === 2 && lids.every(l => /\(demo\)$/.test(ADMIN.learners.find(x => x.id === l).name)));
    ok('CD-A their activation is the one simulated learner step, audited as a demo step', lids.every(l => ADMIN.audit.some(a => a.entity === l && a.action === 'Account activated' && /Demo step/.test(a.reason || ''))));
    const asg = s2Defs().filter(d => cbAsgPid(d) === pr.id);
    ok('CD-A assignments: two published with deadlines for the batch, one draft', asg.length === 3 && asg.filter(d => d.status === 'Published' && !!crDue(d, CD_B)).length === 2 && asg.filter(d => d.status === 'Draft').length === 1);
    ok('CD-A observations: workplace and Academy office permitted, with an event', (() => { const c = n5PubCur(pr) || n5Shown(pr); return c && c.required === true && c.workplace === 'Permitted' && c.office === 'Available' && (c.events || []).length === 1; })());
    // FX (PD-FX-01): was "the ledger, learners' plans, payments and signed letters are unchanged" (compared with the seeded ones); the client demo has none of them
    ok('CD-A nothing financial or signed is invented: no ledger, no payments; the learners\' plans, payments and signatures are empty', !ADMIN.ledger.length && !allTx().length && lids.every(l => { const w = n4World(l); return !w || (!w.tx.length && !w.plans.length && !w.signup.sig && !w.signup.pay); }) /* CD-E: each has a portal account at the pending sign-up */);
    // FX (PD-FX-02): was "the seeded records are unchanged" after loading the client demo on top of them; the client demo now holds no seeded
    // record, so the check is that the legacy fixture itself is unchanged by it: a reset to the legacy data gives the same seeded records
    fresh(); ok('CD-A the legacy fixture is unchanged by the client demo (programmes, batches, learners, fee options, plans, learner payments)', seedSnap() === s0);
    ok('CD-A the DM-P gates are unchanged: the seeded Level 2 and Level 3 still aren\'t eligible', !crElig(s3Pr('NV-L2')) && !crElig(s3Pr('NV-L3')));
  });

  await T('CD-B Create batch and consistent figures', async () => {
    fresh(); SA(); ACT.cdLoad(); const pr = cdPr(), b = cdBatch();
    SA(); go('a-batches'); ACT.newBatch(); const opts = qma('#nb-co option').map(o => o.value);
    ok('CD-B Create batch lists the client-demo programme (the only eligible one)', J(opts) === J([CD_T]));
    const co = qm('#nb-co'); co.value = CD_T; INP.n2NbCourse(co);
    ok('CD-B both modes as checkboxes, both ticked by default; no single-select mode', qma('.m-m').map(x => x.value + (x.checked ? '*' : '')).join() === 'Self-Paced*,Fully Assisted*' && !!qm('#nb-dm').closest('.cr-nc-hid')); closeModal();
    go('a-programmes'); const row = [...document.querySelectorAll('main tr')].find(r => r.textContent.includes(CD_T));
    ok('CD-B programme list: the client-demo programme shows 1 batch and v1: 4 learners (counted, as on its batch)', !!row && /v1: 4/.test(row.textContent) && [...row.querySelectorAll('td')].some(td => td.textContent.trim() === '1'));
    fresh(); SA(); go('a-programmes'); // FX (PD-FX-01): the seeded Level 2 is in the legacy fixture only (was checked with the client demo loaded on top of it)
    const l2row = [...document.querySelectorAll('main tr')].find(r => r.textContent.includes('Level 2 Diploma in Care (England)'));
    ok('CD-B programme list: batches are counted (the seeded Level 2 has 5 batches; it showed a stored 3)', !!l2row && [...l2row.querySelectorAll('td')].some(td => td.textContent.trim() === String(ADMIN.batches.filter(x => x.course === 'Level 2 Diploma in Care (England)').length)));
    ACT.cdLoad(); SA(); go('a-batches', { id: CD_B }); ok('CD-B batch detail: roster 4 and both modes accepted', /Roster \(4\//.test(main()) && /Delivery modes accepted: Self-Paced and Fully Assisted/.test(main()));
    const sr = searchResults('DEMO-L3') + searchResults('(demo)');
    ok('CD-B global search (learners, batches) finds the demo batch and the demo learners', sr.includes(CD_B) && ['Amira Shah (demo)', 'Dev Patel (demo)'].every(n => sr.includes(n)));
    go('a-dashboard'); ok('CD-B dashboard: registered learners are counted from the records (the four demo learners included)', main().includes(String(allLearners().length)));
    // FX (PD-FX-04): was "opens the list with its visible search filled in ("client demo")"; the client demo dataset has one programme, so no filter
    ACT.cdOpen({ dataset: { t: 'list' } }); ok('CD-B "Programme list" opens the list (unfiltered), showing that programme only', !((document.querySelector('main #dtq-kprogs, main #dtq-progs') || {}).value || '') && [...document.querySelectorAll('main tbody tr')].length === 1);
  });

  await T('CD-C the presets stay separate; Reset', async () => {
    fresh(); SA(); ACT.mcDemoLoad(); ok('CD-C the 101-learner Coordinator demo loads on its own (no client demo)', !!mcdBatch() && mcLids(mcdBatch()).length === 101 && !cdOn());
    ACT.cdLoad(); ok('CD-C loading the client demo starts from a reset (the 101-learner demo is removed, not combined)', cdOn() && !mcdBatch());
    ACT.mcDemoLoad(); ok('CD-C …and the 101-learner demo can still be loaded alongside on request', cdOn() && !!mcdBatch());
    ACT.resetDemo(); ok('CD-C Reset demo returns to the starting data (neither preset)', !cdOn() && !mcdBatch() && !ADMIN.learners.some(l => /\(demo\)$/.test(l.name) && /Shah|Holloway|Adeyemi|Patel/.test(l.name)));
    fresh(); SA(); ACT.cdLoad(); ACT.cdLoad(); ok('CD-C loading twice gives one client demo (a reset each time)', ADMIN.programmes.filter(p => p.title === CD_T).length === 1 && ADMIN.batches.filter(x => x.code === CD_B).length === 1);
  });

  await T('CD-D roles', async () => {
    fresh(); SA(); ACT.cdLoad(); const pr = cdPr();
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; ACT.newBatch(); ok('CD-D (negative) Finance can\'t create a batch for it', !MODAL); closeModal();
    const a0 = ADMIN.audit.length; ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); ok('CD-D (negative) Finance can\'t change its fee options (refused, logged)', !MODAL && ADMIN.audit.length > a0); closeModal();
    bizEnter('BA'); const a1 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: CD_B } }); ok('CD-D (negative) Business Admin can\'t change the batch\'s fee options', !MODAL && ADMIN.audit.length > a1); closeModal();
    ok('CD-D the payment terms were approved by a Finance Admin, not the creator', ADMIN.audit.some(a => a.action === 'Payment terms approved' && String(a.entity || '').includes(pr.id) && a.actor !== 'Rachel Hughes' && (ADMIN.staff.find(x => x.name === a.actor) || { roles: [] }).roles.includes('Finance Admin')), J(ADMIN.audit.filter(a => /approved/i.test(a.action)).slice(0, 3).map(a => [a.action, a.actor])));
  });

  await T('CD-E the demo learners in the learner portal', async () => {
    fresh(); SA(); ACT.cdLoad(); const b = cdBatch(), lids = mcLids(b), app = () => document.getElementById('app').textContent.replace(/\s+/g, ' ');
    ok('CD-E four learner-portal accounts, one per demo learner record (the same learner IDs; no new person)', CD_KEYS.every(k => !!STORE.worlds[k]) && J(CD_KEYS.map(k => STORE.worlds[k].me.id).sort()) === J(lids.slice().sort()) && ADMIN.learners.filter(l => /\(demo\)$/.test(l.name) && /Shah|Holloway|Adeyemi|Patel/.test(l.name)).length === 4);
    CD_KEYS.forEach(k => {
      const w = STORE.worlds[k], lid = w.me.id, rec = (b.r2 || {})[lid] || {}, o = r1Opt(rec.opt), mode = r2LidInfo(lid, CD_B).mode, coord = mcOf(lid, b), others = CD_KEYS.filter(x => x !== k).map(x => chFullName(STORE.worlds[x]));
      ok(`CD-E ${chFullName(w)}: sign-up started for the demo programme on the option the batch records (${mode}, ${money(o.fee, 'GBP')}), placed in ${CD_B}`, w.signup && w.signup.batch === CD_B && w.signup.plan && w.signup.plan.opt.id === rec.opt && w.signup.plan.opt.mode === mode && w.signup.plan.fee === o.fee && /client demo/.test(w.nvq.title || ''));
      ok(`CD-E ${chFullName(w)}: pending — not signed, not paid, not admitted; no payments, plans, certificates, requests or messages invented`, !w.signup.done && !w.signup.sig && !w.signup.pay && !w.flags.admitted && !w.tx.length && !w.plans.length && !w.certs.length && !w.requests.length && !w.threads.length && w.docs.every(d => d.status === 'Pending'));
      ACT.cdLearner({ dataset: { k } });
      ok(`CD-E ${chFullName(w)}: the portal is a labelled demonstration switch to this learner only`, S.portal === 'learner' && S.variant === k && W === w && others.every(n => !app().includes(n)));
      ['assignments', 'courses', 'payments', 'calendar'].forEach(r => { go(r); });
      go('assignments'); const lockA = /Finish your sign-up/.test(app()); go('payments'); const lockP = /Finish your sign-up/.test(app());
      ok(`CD-E ${chFullName(w)}: assignments and payments stay behind the sign-up (the normal gate), not bypassed`, lockA && lockP);
      go('admission'); ok(`CD-E ${chFullName(w)}: Admission shows the batch and their delivery mode (${mode})`, app().includes(CD_B) && app().includes('Your delivery mode: ' + mode));
      SA(); ok(`CD-E ${chFullName(w)}: allocated to ${coord}`, M_MODES.includes(mode) && !!coord);
    });
    ok('CD-E the shortcuts cover a Self-Paced and a Fully Assisted learner, and learners of both Coordinators', (() => { S.demoOpen = true; renderDemo(); const t = [...document.querySelectorAll('#demo-root .cd-learners [data-act="cdLearner"]')].map(x => x.textContent); S.demoOpen = false; return t.length === 4 && t.some(x => /Self-Paced/.test(x)) && t.some(x => /Fully Assisted/.test(x)) && new Set(t.map(x => x.split(' · ')[2])).size === 2; })());
    ok('CD-E the panel counts the cohort from the records', (() => { S.demoOpen = true; renderDemo(); const t = document.querySelector('#demo-root .cd-cohort').textContent; S.demoOpen = false; renderDemo(); return /4 learners/.test(t) && /Self-Paced 2/.test(t) && /Fully Assisted 2/.test(t); })());
    // each Coordinator sees their own learners
    const byC = {}; lids.forEach(l => { (byC[mcOf(l, b)] = byC[mcOf(l, b)] || []).push(ADMIN.learners.find(x => x.id === l).name); });
    ['A', 'B'].forEach(k => { ACT.cdCoord({ dataset: { k } }); const mine = byC[COO_USERS[k].name] || [], theirs = lids.map(l => ADMIN.learners.find(x => x.id === l).name).filter(n => !mine.includes(n));
      ok(`CD-E Coordinator ${COO_USERS[k].name}: the roster shows their two demo learners, not the other Coordinator's`, mine.length === 2 && mine.every(n => app().includes(n)) && theirs.every(n => !app().includes(n))); });
    SA(); const asg = s2Defs().filter(d => cbAsgPid(d) === cdPr().id && d.status === 'Published');
    ok('CD-E assignment deadlines belong to the batch (none for any other batch)', asg.length === 2 && asg.every(d => !!crDue(d, CD_B) && ADMIN.batches.filter(x => x.code !== CD_B).every(x => !crDue(d, x.code))));
    ACT.resetDemo(); ok('CD-E Reset demo removes the demo learners\' portal accounts and switches', CD_KEYS.every(k => !STORE.worlds[k] && !VARIANT_INFO[k] && !PERSONAS[k]) && !CD_KEYS.includes(S.variant));
    fresh(); SA(); ACT.mcDemoLoad(); ok('CD-E the 101-learner demo has its own learner accounts and none of these', CD_KEYS.every(k => !STORE.worlds[k]) && !!STORE.worlds.DL1);
  });

  // CD-F: the guided sign-up for one Self-Paced and one Fully Assisted learner, through the existing learner and Academic Admin actions
  await T('CD-F guided sign-up and the enrolled learner experience', async () => {
    fresh(); SA(); ACT.cdLoad(); const b = cdBatch(), wait = ms => new Promise(r => setTimeout(r, ms)), app = () => document.getElementById('app').textContent.replace(/\s+/g, ' ');
    const pressP = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
    ok('CD-F loading the preset admits no one (all four at the start of their sign-up)', CD_KEYS.every(k => !STORE.worlds[k].signup.done && !STORE.worlds[k].flags.admitted && STORE.worlds[k].admission.status !== 'Approved'));
    ok('CD-F demo deadlines: 5:00 PM UK time (17:00 GMT in Dec / Jan)', s2Defs().filter(d => cbAsgPid(d) === cdPr().id && d.status === 'Published').every(d => { const x = new Date(crDue(d, CD_B)); return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(x) === '17:00'; }));
    const sess = s4bAllSess().filter(x => x.batch === CD_B);
    ok('CD-F two batch sessions added through Add session: a class for both fee options, a check-in for the Self-Paced option only', sess.length === 2 && sess.some(x => /mixed class/.test(x.title) && (x.aud || []).length === 2) && sess.some(x => /Self-Paced check-in/.test(x.title) && J(x.aud) === J([r1Opts(cdPr().id).find(o => o.mode === 'Self-Paced').id])));
    for (const [k, mode, coord, fee] of [['CD1', 'Self-Paced', 'Dr Helen Carter', 1800], ['CD4', 'Fully Assisted', 'Michael Osei', 2600]]) {
      const w = STORE.worlds[k], nm = chFullName(w), lid = w.me.id;
      ACT.cdGuide({ dataset: { k, s: 'signup' } }); ok(`CD-F ${nm}: step 1 opens their own sign-up (demonstration switch)`, S.portal === 'learner' && W === w && S.route === 'admission');
      ACT.suNext(); ok(`CD-F (negative) ${nm}: details are required (no step skipped)`, w.signup.step === 1);
      document.querySelector('#su-dob').value = '1990-05-04'; document.querySelector('#su-ad').value = '1 Demo Street, London'; ACT.suNext();
      ACT.suNext(); ok(`CD-F (negative) ${nm}: mandatory documents are required`, w.signup.step === 2);
      w.docs.filter(x => x.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); await wait(1700);
      ok(`CD-F ${nm}: sample documents uploaded and submitted for review (not approved)`, w.docs.filter(x => x.mand).every(d => d.status === 'Submitted' && /^scan_/.test(d.file)));
      ACT.suNext(); ACT.suSign(); ok(`CD-F (negative) ${nm}: the offer letter needs the typed signature and declaration`, !w.signup.sig);
      setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); ok(`CD-F ${nm}: offer letter signed by the learner (audited)`, !!w.signup.sig && ADMIN.audit.some(a => a.action === 'Offer letter signed' && a.entity.includes(lid)));
      setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); render(); ACT.suPay();
      ok(`CD-F ${nm}: the checkout is labelled a simulated payment`, !!document.querySelector('#modal-root .cd-sim'));
      pressP(); await wait(1500); closeModal();
      const pl = w.plans.find(p => p.e === 'nvq');
      ok(`CD-F ${nm}: paid payment 1 of 6 of their own option (${money(fee, 'GBP')}); the rest pending; one transaction; recorded as a demonstration event`, w.signup.done && w.signup.plan.fee === fee && w.signup.plan.opt.mode === mode && pl.rows.length === 6 && pl.rows[0].status === 'Paid' && pl.rows.slice(1).every(r => r.status === 'Pending') && Math.abs(pl.rows.reduce((a, r) => a + r.amount, 0) - fee) < 0.01 && w.tx.length === 1 && ADMIN.audit.some(a => a.action === 'Demonstration: simulated payment' && a.entity.includes(lid)));
      ok(`CD-F ${nm}: the payment terms are pinned to the plan version in force`, w.signup.plan.v === s4PlanCur(cdPr().id).v);
      ok(`CD-F ${nm}: admission awaits review (not approved by paying)`, w.admission.status !== 'Approved' && /awaiting admission review/.test(cdStage(w)));
      const ap = () => allApplications().find(a => a.id === 'APP-' + k);
      FA(); go('a-admissions', { id: 'APP-' + k }); const a0 = ADMIN.audit.length; ACT.appApprove({ dataset: { id: 'APP-' + k } }); if (MODAL) { document.querySelector('#rsn').value = 'x'; pressP(); closeModal(); }
      ok(`CD-F (negative) ${nm}: a Finance Admin can't approve the admission (refused, logged)`, w.admission.status !== 'Approved' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Blocked: admission decision'));
      ACT.cdGuide({ dataset: { k, s: 'review' } }); ok(`CD-F ${nm}: step 2 opens the application for the Academic Admin; "Approve admission" waits for the documents`, isAca() && !!document.querySelector('main [data-act="appApprove"]') && document.querySelector('main [data-act="appApprove"]').disabled);
      ap().docs.filter(d => d.mand).forEach(d => ACT.docDec({ dataset: { a: 'APP-' + k, d: d.id, s: 'Approved' } }));
      go('a-admissions', { id: 'APP-' + k }); ok(`CD-F ${nm}: with every document approved, "Approve admission" is enabled`, !document.querySelector('main [data-act="appApprove"]').disabled);
      ACT.appApprove({ dataset: { id: 'APP-' + k } }); document.querySelector('#rsn').value = 'Documents checked (client demo)'; pressP(); closeModal();
      ok(`CD-F ${nm}: admission approved by the Academic Admin (audited)`, w.admission.status === 'Approved' && ADMIN.audit.some(a => a.action === 'Admission approved' && a.actor === ADMIN.me.name));
      ACT.cdGuide({ dataset: { k, s: 'dash' } }); ok(`CD-F ${nm}: the dashboard shows the active programme and both batch deadlines`, /Level 3 Diploma in Care Practice \(client demo\)/.test(app()) && /13 Dec 2026, 17:00/.test(app()));
      ACT.cdGuide({ dataset: { k, s: 'course' } }); const t = app(), yp = t.slice(t.indexOf('Your people'), t.indexOf('Your people') + 200), other = coord === 'Dr Helen Carter' ? 'Michael Osei' : 'Dr Helen Carter';
      ok(`CD-F ${nm}: Your people — only ${coord}, with the Academy email; their own delivery mode ${mode}`, yp.includes(coord) && /@illumin-academy\.example/.test(yp) && !yp.includes(other) && new RegExp('Delivery mode ?' + mode).test(t));
      go('assignments'); ok(`CD-F ${nm}: the two published assignments with the batch deadlines; the draft isn't listed`, /Assignment 1 — Person-centred values/.test(app()) && /Assignment 2 — Agreeing a care plan/.test(app()) && !/Reflective account/.test(app()) && /17 Jan 2027, 17:00/.test(app()));
      const ev = (w.events || []).map(e => e.title);
      ok(`CD-F ${nm}: sessions follow the audience (the mixed class; the Self-Paced check-in only for Self-Paced)`, ev.includes('Client demo — mixed class (all learners)') && ev.includes('Client demo — Self-Paced check-in') === (mode === 'Self-Paced'));
      ACT.cdGuide({ dataset: { k, s: 'pay' } }); ok(`CD-F ${nm}: Payments — their own schedule (6 payments of their option, first paid)`, new RegExp('of ' + money(fee, 'GBP').replace(/[.$]/g, '\\$&') + ' paid').test(app()) && /Your payment schedule/.test(app()));
      const others = CD_KEYS.filter(x => x !== k).map(x => chFullName(STORE.worlds[x]));
      ok(`CD-F ${nm}: no other learner's records on their screens`, ['dashboard', 'assignments', 'payments', 'messages', 'notifications'].every(r => { go(r); return others.every(n => !app().includes(n)); }) && (() => { go('course', { id: 'nvq' }); return others.every(n => !app().includes(n)); })());
      SA();
    }
    ok('CD-F the other two demo learners are still at the start of their sign-up', ['CD2', 'CD3'].every(k => !STORE.worlds[k].signup.done));
    ok('CD-F Coordinator ownership unchanged', mcOf(STORE.worlds.CD1.me.id, b) === 'Dr Helen Carter' && mcOf(STORE.worlds.CD4.me.id, b) === 'Michael Osei');
    ACT.resetDemo(); ok('CD-F Reset removes the completed sign-ups with the rest of the demo', CD_KEYS.every(k => !STORE.worlds[k]) && !cdBatch() && !ADMIN.audit.some(a => /Demonstration: simulated payment/.test(a.action)));
  });

  // CD-G: the learner calendar names the UK zone in effect for the dates shown (presentation only)
  await T('CD-G calendar zone label: GMT in winter, BST in summer', async () => {
    fresh(); S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const tz0 = W.me.tz; W.me.tz = 'Europe/London';
    const ev0 = J(W.events), chip = () => (document.querySelector('main .cal-tz') || {}).textContent;
    ok('CD-G the zone helper: 15 Dec → GMT, 15 Jul → BST (Europe/London)', tzl('2026-12-15T12:00:00Z') === 'GMT' && tzl('2027-07-15T12:00:00Z') === 'BST');
    setUi('calView', 'month'); setUi('calDate', '2026-12-01'); go('calendar');
    ok('CD-G December: the calendar chip and heading say GMT', chip() === 'GMT' && /Europe\/London \(GMT\)/.test(document.querySelector('main').textContent));
    setUi('calDate', '2027-07-01'); render();
    ok('CD-G July: the calendar chip and heading say BST', chip() === 'BST' && /Europe\/London \(BST\)/.test(document.querySelector('main').textContent));
    setUi('calDate', '2027-03-28'); setUi('calView', 'day'); render(); ok('CD-G the change-over day (28 Mar 2027, 12:00) is BST', chip() === 'BST');
    ok('CD-G presentation only: the learner\'s events are unchanged', J(W.events) === ev0);
    W.me.tz = tz0; setUi('calView', 'month'); setUi('calDate', undefined);
  });
  fresh();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
