// CD — the demo presets (26 Oct 2026; PD-CD-01…05): "Load clean client demo", the separate 101-learner Coordinator demo and Reset demo.
// FX (27 Oct 2026; PD-FX-01…): the client demo is now the default dataset (ACT.cdLoad loads it without a button; see ft-fx.js). This suite
// runs on the pinned legacy fixture; the checks that compared the client demo with seeded records are restated (each cites PD-FX).
// DR (31 Oct 2026; PD-DR-…): the client demo now has two admitted NVQ learners and one short-course learner; the checks of the pending /
// guided sign-up are restated (each cites PD-DR).
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
    // DR (PD-DR-02) supersedes "four demo learners, two in each mode": the batch's two NVQ learners, one per mode and per Coordinator
    ok('CD-A two demo learners on the batch, one in each mode, one per Coordinator', lids.length === 2 && J(modes) === J(['Self-Paced', 'Fully Assisted']) && J(co) === J(['Dr Helen Carter', 'Michael Osei']) && lids.every(l => /\(demo\)$/.test(ADMIN.learners.find(x => x.id === l).name)));
    ok('CD-A their activation is the one simulated learner step, audited as a demo step', lids.every(l => ADMIN.audit.some(a => a.entity === l && a.action === 'Account activated' && /Demo step/.test(a.reason || ''))));
    const asg = s2Defs().filter(d => cbAsgPid(d) === pr.id);
    ok('CD-A assignments: two published with deadlines for the batch, one draft', asg.length === 3 && asg.filter(d => d.status === 'Published' && !!crDue(d, CD_B)).length === 2 && asg.filter(d => d.status === 'Draft').length === 1);
    ok('CD-A observations: workplace and Academy office permitted, with an event', (() => { const c = n5PubCur(pr) || n5Shown(pr); return c && c.required === true && c.workplace === 'Permitted' && c.office === 'Available' && (c.events || []).length === 1; })());
    // FX (PD-FX-01): was "the ledger, learners' plans, payments and signed letters are unchanged" (compared with the seeded ones); the client demo has none of them
    // DR (PD-DR-03/05) supersedes "no payments; plans, payments and signatures empty": each learner's own sign-up left their signature, one
    // simulated payment and their schedule; nothing else financial is invented (no seeded ledger, no other payment)
    ok('CD-A nothing financial or signed is invented beyond each learner\'s own sign-up: no seeded ledger; one simulated payment per learner', !ADMIN.ledger.length && allTx().length === 3 && lids.every(l => { const w = n4World(l); return w && w.tx.length === 1 && w.plans.length === 1 && !!w.signup.sig && !!w.signup.pay; }));
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
    ok('CD-B programme list: the client-demo programme shows 1 batch and v1: 2 learners (DR: was 4; counted, as on its batch)', !!row && /v1: 2/.test(row.textContent) && [...row.querySelectorAll('td')].some(td => td.textContent.trim() === '1'));
    fresh(); SA(); go('a-programmes'); // FX (PD-FX-01): the seeded Level 2 is in the legacy fixture only (was checked with the client demo loaded on top of it)
    const l2row = [...document.querySelectorAll('main tr')].find(r => r.textContent.includes('Level 2 Diploma in Care (England)'));
    ok('CD-B programme list: batches are counted (the seeded Level 2 has 5 batches; it showed a stored 3)', !!l2row && [...l2row.querySelectorAll('td')].some(td => td.textContent.trim() === String(ADMIN.batches.filter(x => x.course === 'Level 2 Diploma in Care (England)').length)));
    ACT.cdLoad(); SA(); go('a-batches', { id: CD_B }); ok('CD-B batch detail: roster 2 (DR: was 4) and both modes accepted', /Roster \(2\//.test(main()) && /Delivery modes accepted: Self-Paced and Fully Assisted/.test(main()));
    const sr = searchResults('DEMO-L3') + searchResults('(demo)');
    ok('CD-B global search (learners, batches) finds the demo batch and the demo learners', sr.includes(CD_B) && ['Amira Shah (demo)', 'Dev Patel (demo)'].every(n => sr.includes(n)));
    go('a-dashboard'); ok('CD-B dashboard: registered learners are counted from the records (the three demo learners included)', main().includes(String(allLearners().length)));
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

  // DR (PD-DR-02/03; supersedes CD-E "four learner-portal accounts … pending sign-up" and the Demo-controls shortcuts cdLearner / cdCoord):
  // three portal accounts bound to the three learner records; the two NVQ learners completed their own sign-up and were admitted, the
  // short-course learner bought the course. The identities are opened from the sign-in chooser (ft-dr.js clicks it); here, drAs.
  await T('CD-E the demo learners in the learner portal', async () => {
    fresh(); SA(); ACT.cdLoad(); const b = cdBatch(), lids = mcLids(b), app = () => document.getElementById('app').textContent.replace(/\s+/g, ' ');
    ok('CD-E three learner-portal accounts, one per demo learner record (the same learner IDs; no new person)', CD_KEYS.every(k => !!STORE.worlds[k]) && J(CD_KEYS.map(k => STORE.worlds[k].me.id).sort()) === J(ADMIN.learners.map(l => l.id).sort()) && ADMIN.learners.length === 3);
    ok('CD-E the batch holds the two NVQ learners, placed by their own sign-up (no admin "Add to batch"; counted once)', lids.length === 2 && J(lids.map(l => cdKeyOf(l))) === J(['CD1', 'CD2']) && !(b.roster || []).length && b.enrolled === 2);
    [['CD1', 'Self-Paced', 1800, 'Dr Helen Carter'], ['CD2', 'Fully Assisted', 2600, 'Michael Osei']].forEach(([k, mode, fee, coord]) => {
      const w = STORE.worlds[k], lid = w.me.id, others = CD_KEYS.filter(x => x !== k).map(x => chFullName(STORE.worlds[x]));
      ok(`CD-E ${chFullName(w)}: signed up for the demo programme on the ${mode} option (${money(fee, 'GBP')}), in ${CD_B}`, w.signup.batch === CD_B && w.signup.plan.opt.mode === mode && w.signup.plan.fee === fee && r2LidInfo(lid, CD_B).mode === mode && /client demo/.test(w.nvq.title || ''));
      ok(`CD-E ${chFullName(w)}: signed, paid instalment 1 (simulated), admitted; nothing else invented (no certificates, requests or messages)`, w.signup.done && !!w.signup.sig && !!w.signup.pay && w.flags.admitted && w.admission.status === 'Approved' && w.tx.length === 1 && !w.certs.length && !w.requests.length && !w.threads.length && w.docs.filter(d => d.mand).every(d => d.status === 'Approved'));
      ACT.drAs({ dataset: { p: k === 'CD1' ? 'nvq-sp' : 'nvq-fa' } });
      ok(`CD-E ${chFullName(w)}: the identity opens this learner only`, S.portal === 'learner' && S.variant === k && W === w && others.every(n => !app().includes(n)));
      go('assignments'); const openA = !/Finish your sign-up/.test(app()) && /Assignment 1 — Person-centred values/.test(app()); go('payments'); const openP = /Your payment schedule|Instalment/.test(app());
      ok(`CD-E ${chFullName(w)}: assignments and payments open (the sign-up gate was passed, not bypassed)`, openA && openP);
      SA(); ok(`CD-E ${chFullName(w)}: allocated to ${coord}`, mcOf(lid, b) === coord);
    });
    const sc = STORE.worlds.CD3; ok('CD-E Lena Hart (demo): bought the short course through Browse (simulated checkout); not on the NVQ batch', sc.enrolments.length === 1 && sc.enrolments[0].kind === 'short' && sc.tx.length === 1 && !sc.signup && !lids.includes(sc.me.id));
    ['A', 'B'].forEach(k => { ACT.drAs({ dataset: { p: k === 'A' ? 'coord1' : 'coord2' } }); go('c-batches', { id: CD_B, tab: 'roster' }); const mine = lids.filter(l => mcOf(l, b) === COO_USERS[k].name).map(l => ADMIN.learners.find(x => x.id === l).name), theirs = lids.map(l => ADMIN.learners.find(x => x.id === l).name).filter(n => !mine.includes(n));
      ok(`CD-E Coordinator ${COO_USERS[k].name}: the roster shows their one demo learner, not the other Coordinator's`, mine.length === 1 && mine.every(n => app().includes(n)) && theirs.every(n => !app().slice(app().indexOf('My learners')).includes(n + ' ')) ); });
    SA(); const asg = s2Defs().filter(d => cbAsgPid(d) === cdPr().id && d.status === 'Published');
    ok('CD-E assignment deadlines belong to the batch (none for any other batch)', asg.length === 2 && asg.every(d => !!crDue(d, CD_B) && ADMIN.batches.filter(x => x.code !== CD_B).every(x => !crDue(d, x.code))));
    ACT.resetDemo(); ok('CD-E Reset demo removes the demo learners\' portal accounts and switches', CD_KEYS.every(k => !STORE.worlds[k] && !VARIANT_INFO[k] && !PERSONAS[k]) && !CD_KEYS.includes(S.variant));
    fresh(); SA(); ACT.mcDemoLoad(); ok('CD-E the 101-learner demo has its own learner accounts and none of these', CD_KEYS.every(k => !STORE.worlds[k]) && !!STORE.worlds.DL1);
  });

  // DR (PD-DR-03; supersedes CD-F "guided sign-up" — the presenter no longer walks the two learners through it; the build does, through the
  // same handlers): the records each step leaves, who did it, and that the Admissions restriction still applies
  await T('CD-F the sign-ups and admissions were made through the real steps', async () => {
    fresh(); SA(); ACT.cdLoad(); const b = cdBatch();
    ok('CD-F demo deadlines: 5:00 PM UK time (17:00 GMT in Dec / Jan)', s2Defs().filter(d => cbAsgPid(d) === cdPr().id && d.status === 'Published').every(d => { const x = new Date(crDue(d, CD_B)); return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(x) === '17:00'; }));
    // LP (PD-LP-10, user decision A4): the schedule template's two classes are now session records too (attendance registers).
    // Was: 'CD-F two batch sessions added through Add session: …' with sess.length === 2 over every session of the batch.
    const sess = s4bAllSess().filter(x => x.batch === CD_B && !x.tt), tt = s4bAllSess().filter(x => x.batch === CD_B && x.tt);
    ok('CD-F the schedule template\'s classes are session records for all learners (Induction, Unit 1 class)', J(tt.map(x => x.title)) === J(['Induction (Zoom)', 'Unit 1 class']) && tt.every(x => !x.aud && x.teacher === CD_TEACHER));
    ok('CD-F two batch sessions added through Add session: a class for both fee options, a check-in for the Self-Paced option only', sess.length === 2 && sess.some(x => /mixed class/.test(x.title) && (x.aud || []).length === 2) && sess.some(x => /Self-Paced check-in/.test(x.title) && J(x.aud) === J([r1Opts(cdPr().id).find(o => o.mode === 'Self-Paced').id])));
    for (const [k, mode, fee] of [['CD1', 'Self-Paced', 1800], ['CD2', 'Fully Assisted', 2600]]) {
      const w = STORE.worlds[k], nm = chFullName(w), lid = w.me.id, pl = w.plans.find(p => p.e === 'nvq');
      ok(`CD-F ${nm}: synthetic details; the mandatory documents are the sample files ("scan_…"), each approved by the Academic Admin`, /^\d{4}-\d\d-\d\d$/.test(w.signup.details.dob) && /Demo|Example/.test(w.signup.details.address) && w.docs.filter(d => d.mand).every(d => /^scan_/.test(d.file) && d.status === 'Approved') && ADMIN.audit.filter(a => a.action === 'Document decision' && a.actor === 'Rachel Hughes' && a.entity.startsWith(nm + ' · ')).length === w.docs.filter(d => d.mand).length);
      ok(`CD-F ${nm}: offer letter signed by the learner (audited)`, !!w.signup.sig && ADMIN.audit.some(a => a.action === 'Offer letter signed' && a.entity.includes(lid)));
      ok(`CD-F ${nm}: payment 1 of 6 of their own option (${money(fee, 'GBP')}) paid; the rest pending; one transaction; a demonstration event`, pl.rows.length === 6 && pl.rows[0].status === 'Paid' && pl.rows.slice(1).every(r => r.status === 'Pending') && Math.abs(pl.rows.reduce((a, r) => a + r.amount, 0) - fee) < 0.01 && w.tx.length === 1 && ADMIN.audit.some(a => a.action === 'Demonstration: simulated payment' && a.entity.includes(lid)));
      ok(`CD-F ${nm}: the payment terms are pinned to the plan version in force`, w.signup.plan.v === s4PlanCur(cdPr().id).v);
      ok(`CD-F ${nm}: admission approved by the Academic Admin (audited)`, w.admission.status === 'Approved' && ADMIN.audit.some(a => a.action === 'Admission approved' && a.actor === 'Rachel Hughes' && String(a.entity) === nm));
    }
    const a0 = ADMIN.audit.length; FA(); const d0 = STORE.worlds.CD1.docs.find(d => d.mand); ACT.docDec({ dataset: { a: 'APP-CD1', d: d0.id, s: 'Rejected' } }); closeModal();
    ok('CD-F (negative) a Finance Admin still can\'t decide an admission document (refused, logged)', d0.status === 'Approved' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action)));
    ok('CD-F Coordinator ownership', mcOf(STORE.worlds.CD1.me.id, b) === 'Dr Helen Carter' && mcOf(STORE.worlds.CD2.me.id, b) === 'Michael Osei');
    ACT.resetDemo(); ok('CD-F Reset (legacy-pinned) removes the sign-ups with the rest of the demo', CD_KEYS.every(k => !STORE.worlds[k]) && !cdBatch() && !ADMIN.audit.some(a => /Demonstration: simulated payment/.test(a.action)));
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
