// FX — the client demo dataset is the default (27 Oct 2026; PD-FX-01…). suites.sh runs this suite with FIXTURE=client: the page boots
// as a fresh browser does and no preset is clicked. Checked: what the dataset holds; the exact Create batch journey by clicking the real
// controls; that lists, counts, the dashboard, global search and related-record selectors read the same reduced data; Demo controls;
// the financial records; and that the full legacy fixture stays separate (loaded explicitly, labelled, unchanged).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const shown = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const rows = () => $a('main table tbody tr').filter(r => !r.querySelector('td[colspan]')).length;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const as = av => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const change = (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const typeIn = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const primary = () => $a('#modal-root button.btn-primary').pop();
  const LEGACY = ['Aisha Rahman', 'Grace Mensah', 'Oliver Bennett', 'Level 2 Diploma in Care (England)', 'Level 3 Diploma in Adult Care (England)', 'L3AC-JAN26', 'L2DC-MAR26', 'Leicester Cohort 7', 'Gulf Care Recruitment', 'BrightCare Staffing', 'Dementia Awareness', 'Maria Santos'];
  const leaks = t => LEGACY.filter(n => t.includes(n));
  const boot = { mode: FX.mode, signedIn: S.signedIn, route: S.route, hash: location.hash };

  await T('FX-A fresh start: the client demo dataset, nothing clicked', async () => {
    ok('FX-A a fresh start loads the client demo dataset (no preset clicked; the sign-in page is shown as before)', boot.mode === 'client' && boot.signedIn === false && !boot.hash);
    const pr = cdPr(), b = cdBatch();
    ok('FX-A exactly one NVQ programme: Level 3, published (Active)', ADMIN.programmes.length === 1 && !!pr && pr.level === 'Level 3' && pr.status === 'Active');
    const opts = r1Opts(pr.id).filter(o => o.status === 'Active');
    ok('FX-A two approved, published fee options: Self-Paced and Fully Assisted, labelled demonstration fees', opts.length === 2 && J(opts.map(o => o.mode).sort()) === J(['Fully Assisted', 'Self-Paced']) && opts.every(o => /\(demo fee\)/.test(o.label) && o.fee > 0) && crElig(pr) && J(crOptModes(pr.id)) === J(M_MODES));
    ok('FX-A exactly one batch: Open, accepting both delivery modes', ADMIN.batches.length === 1 && !!b && b.status === 'Open' && J(crBModes(b)) === J(M_MODES) && M_MODES.every(m => crReady(b, m) === 'ready'));
    const lids = mcLids(b), modes = lids.map(l => r2LidInfo(l, CD_B).mode), co = lids.map(l => mcOf(l, b));
    ok('FX-A four demo learners: two Self-Paced, two Fully Assisted', allLearners().length === 4 && lids.length === 4 && modes.filter(m => m === 'Self-Paced').length === 2 && modes.filter(m => m === 'Fully Assisted').length === 2);
    ok('FX-A two Academic Coordinators on the batch, two learners each', J(mcList(b)) === J(['Dr Helen Carter', 'Michael Osei']) && ['Dr Helen Carter', 'Michael Osei'].every(n => co.filter(c => c === n).length === 2));
    const asg = s2Defs();
    ok('FX-A assignments: two published with deadlines for the batch, one draft (no others)', asg.length === 3 && asg.filter(d => d.status === 'Published' && !!crDue(d, CD_B)).length === 2 && asg.filter(d => d.status === 'Draft').length === 1);
    const ss = s4bAllSess();
    ok('FX-A sessions: the batch\'s two (a class for all, a Self-Paced check-in); no others', ss.length === 2 && ss.every(x => x.batch === CD_B));
    ok('FX-A observation configuration: workplace and Academy office, with one observation event', (() => { const c = n5PubCur(pr) || n5Shown(pr); return c && c.required === true && c.workplace === 'Permitted' && c.office === 'Available' && (c.events || []).length === 1; })());
    ok('FX-A one published short course (Moving and Handling People), in the admin list and the learner catalogue', ADMIN.courses.length === 1 && ADMIN.courses[0].status === 'Published' && CATALOGUE.filter(c => c.kind === 'short').map(c => c.title).join() === 'Moving and Handling People');
    ok('FX-A one agency account, with no learners, bundles or purchases', ADMIN.agencies.length === 1 && !ADMIN.bundles.length && !(STORE.agy.assign || []).length && !(STORE.agy.purchases || []).length);
    ok('FX-A no seeded records: no approvals other than the programme\'s Finance approval, no ledger, IQA samples, certificates or messages', ADMIN.queue.length === 1 && !allTx().length && !allCerts().length && !allIqaRecords().length && !ADMIN.threads.length && !(STORE.fin.od || []).length);
    ok('FX-A the learner portal opens on a demo learner (no legacy persona)', S.variant === 'CD1' && J(Object.keys(VARIANT_INFO).sort()) === J(CD_KEYS));
  });

  await T('FX-B Create batch through the real controls (System Administrator)', async () => {
    as('SY'); go('a-batches');
    const btn = $1('main [data-act="newBatch"]'); ok('FX-B Batches has a Create batch button', shown(btn)); btn.click();
    const co = $1('#modal-root #nb-co');
    ok('FX-B step 1: the published demo Level 3 programme is in the course selector (the only one)', !!co && [...co.options].map(o => o.value).filter(Boolean).join() === CD_T);
    change(co, CD_T);
    const box = m => $1(`#modal-root .m-m[value="${m}"]`);
    ok('FX-B two separate delivery-mode checkboxes are displayed: Self-Paced and Fully Assisted', M_MODES.every(m => shown(box(m))) && $a('#modal-root .m-m').length === 2);
    ok('FX-B no legacy single-select mode, no Standard Programme Fee, no configuration-required warning', !shown($1('#modal-root #nb-dm')) && !/Standard programme fee/i.test($1('#modal-root').textContent) && !/configuration required|needs configuration|not configured/i.test($1('#modal-root').textContent) && !shown($1('#modal-root .cr-nc')));
    M_MODES.forEach(m => { if (box(m).checked) box(m).click(); });
    ok('FX-B both can be cleared…', M_MODES.every(m => !box(m).checked));
    M_MODES.forEach(m => box(m).click());
    ok('FX-B …and ticked together', M_MODES.every(m => box(m).checked));
    typeIn($1('#modal-root #nb-c'), 'DEMO-L3-MAR27');
    primary().click();
    ok('FX-B step 2 (Staff) reached with both modes kept', /step 2 of 5/.test(MODAL.title));
    const tick = n => { const i = $a('#modal-root input[type="checkbox"]').find(x => (x.closest('label') || {}).textContent && x.closest('label').textContent.includes(n) && !x.classList.contains('m-m')); if (i && !i.checked) i.click(); return !!i; };
    ok('FX-B step 2: the two Coordinators can be ticked', tick('Dr Helen Carter') && tick('Michael Osei'));
    $a('#modal-root button').find(b => b.textContent.trim() === 'Back').click();
    ok('FX-B Back to step 1: both modes still ticked', /step 1 of 5/.test(MODAL.title) && M_MODES.every(m => box(m).checked));
    primary().click(); ok('FX-B …Next again', /step 2 of 5/.test(MODAL.title)); tick('Dr Helen Carter'); tick('Michael Osei');
    let g = 0; while (MODAL && !/step 5 of 5/.test(MODAL.title) && g++ < 6) primary().click();
    const rv = $1('#modal-root').textContent.replace(/\s+/g, ' ');
    ok('FX-B Review & create lists both delivery modes', /step 5 of 5/.test(MODAL.title) && /Self-Paced/.test(rv) && /Fully Assisted/.test(rv), rv.slice(0, 200));
    primary().click(); closeModal();
    const nb = ADMIN.batches.find(x => x.code === 'DEMO-L3-MAR27');
    ok('FX-B the batch is saved with both modes and both Coordinators', !!nb && J(crBModes(nb)) === J(M_MODES) && J(mcList(nb)) === J(['Dr Helen Carter', 'Michael Osei']));
    if (nb && nb.status === 'Planned') { go('a-batches', { id: nb.code }); const life = $1('main [data-act="batchLife"]'); if (life) { life.click(); const t = $1('#rsn'); if (t) t.value = 'Open for enrolment'; if (MODAL) primary().click(); closeModal(); } }
    go('a-batches', { id: 'DEMO-L3-MAR27' }); $1('main [data-act="addToBatch"]').click();
    const os = $1('#modal-root #r2-ab-o');
    ok('FX-B the saved batch accepts learners under either approved fee option', !!os && J([...os.options].map(o => (r1Opt(o.value) || {}).mode).filter(Boolean).sort()) === J(['Fully Assisted', 'Self-Paced']));
    closeModal();
  });

  await T('FX-C lists, counts, dashboard, search and selectors read the same reduced data', async () => {
    ACT.resetDemo(); as('A');
    go('a-programmes'); ok('FX-C NVQ Programmes: one row', rows() === 1 && main().includes(CD_T), rows());
    go('a-batches'); ok('FX-C Batches: one row', rows() === 1 && main().includes(CD_B), rows());
    go('a-learners'); ok('FX-C Learners: four rows, the demo learners', rows() === 4 && CD_LEARNERS.every(([n]) => main().includes(n)), rows());
    go('a-courses'); ok('FX-C Short courses: one row', rows() === 1 && main().includes('Moving and Handling People'), rows());
    go('a-dashboard'); const kp = $a('main .adm-kpis .kpi').map(k => k.textContent.replace(/\s+/g, ' '));
    const kv = l => { const k = $a('main .adm-kpis .kpi').find(x => x.querySelector('.xs').textContent.startsWith(l)); return k ? k.querySelector('.big-num').textContent.trim() : null; };
    ok('FX-C dashboard: 4 registered and active learners, 1 published programme, nothing to mark; no fixed example figures', kv('Registered learners') === '4' && kv('Active learners') === '4' && kv('Published programmes') === '1' && kv('Average progress') === '—' && kv('Pending markings') === '0' && !/58%|71%|1,842|31,592/.test(main()), J(kp));
    ok('FX-C no legacy names on the dashboard, programme, batch, learner and queue screens', ['a-dashboard', 'a-programmes', 'a-batches', 'a-learners', 'a-queue', 'a-admissions', 'a-finance', 'a-certificates', 'a-observations', 'a-records', 'a-reports'].every(r => { go(r); return !leaks(main()).length; }));
    const sr = q => { const x = searchResults(q); return typeof x === 'string' ? x : J(x); };
    ok('FX-C global search: legacy learners, programmes and batches return nothing', ['Aisha', 'Oliver Bennett', 'L3AC-JAN26', 'Leicester', 'Level 2 Diploma'].every(q => !leaks(sr(q)).length));
    ok('FX-C global search finds the demo batch and learners', sr('DEMO-L3').includes(CD_B) && sr('Amira').includes('Amira Shah (demo)'));
    go('a-batches', { id: CD_B }); $1('main [data-act="addToBatch"]').click();
    const lo = [...($1('#modal-root #ab-l') || { options: [] }).options].map(o => o.textContent).join('|'); closeModal();
    ok('FX-C Add learner to batch: the learner selector offers only the client demo\'s learners', !leaks(lo).length && !/Bennett|Rahman|Mensah/.test(lo), lo.slice(0, 160));
    go('a-batches', { tab: 'schedule' }); ACT.addSession({ dataset: {} });
    const bo = MODAL ? [...($1('#modal-root #se-b') || { options: [] }).options].map(o => o.value) : []; closeModal();
    ok('FX-C Add session: the batch selector offers only the client demo batch', bo.every(v => v === CD_B));
    as('FA'); go('f-dashboard'); ok('FX-C Finance dashboard: no legacy payers, refunds or approvals', !leaks(main()).length && !/AQ-200\d|TXN-7/.test(main()));
    go('f-ledger'); ok('FX-C Finance ledger: empty (no payment has been made)', rows() === 0);
  });

  await T('FX-D Coordinator roster and the learner portal', async () => {
    ACT.resetDemo(); const b = cdBatch();
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-batches', { id: CD_B, tab: 'roster' });
    const t = main(), mine = mcLids(b).filter(l => mcOf(l, b) === 'Dr Helen Carter').map(l => ADMIN.learners.find(x => x.id === l).name);
    ok('FX-D Coordinator (Dr Helen Carter): My learners 2 / All batch learners 4', /My learners ?2/.test(t) && /All batch learners ?4/.test(t) && mine.every(n => t.includes(n)));
    ok('FX-D the Coordinator portal has no legacy batches or learners', ['c-dashboard', 'c-batches', 'c-learners', 'c-notifications'].every(r => { go(r); return !leaks(main()).length; }));
    S.variant = 'CD1'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('admission');
    ok('FX-D the learner portal: Amira Shah (demo) at her own sign-up for the demo programme in the batch (Self-Paced)', main().includes(CD_B) && /Your delivery mode: Self-Paced/.test(main()) && !leaks(main()).length);
  });

  await T('FX-E financial integrity: simulated, labelled, consistent', async () => {
    ACT.resetDemo(); const pr = cdPr(), wf = cb8Wf(pr), q = ADMIN.queue[0];
    ok('FX-E the fee options went through Finance: one approval item, decided by a Finance Admin (not the creator), labelled as checked against the demonstration price list', wf.status === 'Approved' && ADMIN.queue.length === 1 && q.id === wf.approved.qid && q.status === 'Approved' && /demonstration price list/.test(q.decision) && ADMIN.audit.some(a => a.action === 'Payment terms approved' && (ADMIN.staff.find(s => s.name === a.actor) || { roles: [] }).roles.includes('Finance Admin') && a.actor !== 'Rachel Hughes'));
    ok('FX-E the published version, its fee options, payment plan and the batch agree', pr.status === 'Active' && J(crOptModes(pr.id)) === J(M_MODES) && !!s4PlanCur(pr.id) && J(crBModes(cdBatch())) === J(crOptModes(pr.id)));
    const b = cdBatch();
    ok('FX-E each learner\'s allocation is one of the batch\'s approved options, in their mode', mcLids(b).every(l => { const o = r1Opt((b.r2[l] || {}).opt); return o && o.status === 'Active' && o.pid === pr.id && o.mode === r2LidInfo(l, CD_B).mode; }));
    ok('FX-E nothing signed, paid, certified or assessed: no signatures, payments, plans, certificates or outcomes', CD_KEYS.every(k => { const w = STORE.worlds[k]; return !w.signup.sig && !w.signup.pay && !w.signup.done && !w.tx.length && !w.plans.length && !w.certs.length; }) && !allTx().length && !allSubmissions().length);
    ok('FX-E the dataset says its fees, approval and activations are simulated (Demo controls)', (() => { S.demoOpen = true; renderDemo(); const t = $1('#demo-root .cd-demo').textContent; S.demoOpen = false; renderDemo(); return /simulated demonstration records/.test(t); })());
    ok('FX-E learner activations are audited as demo steps', mcLids(b).every(l => ADMIN.audit.some(a => a.entity === l && a.action === 'Account activated' && /Demo step/.test(a.reason || ''))));
  });

  await T('FX-F Demo controls: Reset, the 101-learner demo, the legacy data — no duplicates', async () => {
    ACT.resetDemo(); as('A'); S.demoOpen = true; renderDemo(); const acts = $a('#demo-root [data-act]').map(b => b.dataset.act);
    ok('FX-F one Reset demo, one 101-learner loader, one legacy loader; no "Load clean client demo"', acts.filter(a => a === 'resetDemo').length === 1 && acts.filter(a => a === 'mcDemoLoad').length === 1 && acts.filter(a => a === 'fxLegacy').length === 1 && !acts.includes('cdLoad'));
    ok('FX-F the legacy loader is labelled internal, not client data', /internal — not client data/.test($1('#demo-root [data-act="fxLegacy"]').textContent));
    ok('FX-F the Demo Scenarios point to the legacy data (they need it)', !acts.includes('scOpen') && /full legacy test data/.test($1('#demo-root .fx-sc-note').textContent));
    S.demoOpen = false; renderDemo();
    ACT.mcDemoLoad(); const md = mcdBatch();
    ok('FX-F the 101-learner demo loads separately, on the client demo programme', !!md && md.course === CD_T && mcLids(md).length === 101 && ADMIN.batches.length === 2);
    ACT.resetDemo(); ok('FX-F Reset demo returns to the client demo (the 101-learner demo removed)', !mcdBatch() && ADMIN.batches.length === 1 && allLearners().length === 4 && FX.mode === 'client');
  });

  await T('FX-G the full legacy fixture is separate, explicit and labelled', async () => {
    ACT.fxLegacy();
    ok('FX-G "Load full legacy test data" loads the legacy fixture (8 programmes, 14 batches, 72 records + 7 personas)', FX.mode === 'legacy' && ADMIN.programmes.length === 8 && ADMIN.batches.length === 14 && ADMIN.learners.length === 72 && allLearners().length === 79);
    S.demoOpen = true; renderDemo(); ok('FX-G while it is loaded, Demo controls say it is internal testing data, not client data', /not client data/.test($1('#demo-root .fx-legacy-note').textContent)); S.demoOpen = false; renderDemo();
    ok('FX-G the legacy personas and catalogue are back', ['A', 'B', 'C', 'D', 'E', 'F'].every(k => !!VARIANT_INFO[k]) && CATALOGUE.length === 15 && /3 batches/.test(COO_USERS.A.label));
    ACT.resetDemo(); ok('FX-G Reset demo returns to the client demo', FX.mode === 'client' && ADMIN.programmes.length === 1 && allLearners().length === 4 && CATALOGUE.length === 2);
    initStore(); ok('FX-G initStore() (what the regression suites reset with) is the legacy fixture', FX.mode === 'legacy' && ADMIN.programmes.length === 8);
    ACT.resetDemo();
  });

  await T('FX-H an identity switch keeps the reduced data', async () => {
    ACT.resetDemo(); as('A'); INP.adminVariant({ value: 'B' }); INP.adminVariant({ value: 'A' });
    ok('FX-H after an admin variant switch: still one programme, one batch, four learners; no seeded audit rows or notifications', ADMIN.programmes.length === 1 && ADMIN.batches.length === 1 && allLearners().length === 4 && !ADMIN.myNotifs.length && !ADMIN.audit.some(a => FX.seedAudit.has(a.id)));
    go('a-staff'); ok('FX-H staff list: no seeded allocation counts', ADMIN.staff.every(s => !s.alloc));
  });

  await T('FX-I demo Teacher and Assessor on the batch (PD-FX-09)', async () => {
    ACT.resetDemo(); const b = cdBatch(), a = chAllocOf(b), st = n => ADMIN.staff.find(s => s.name === n);
    ok('FX-I the batch: Teacher Marcus Bell, Assessor James Pryce, Coordinators unchanged', J(b.teachers) === J([CD_TEACHER]) && J(b.assessors) === J([CD_ASSESSOR]) && J(mcList(b)) === J(['Dr Helen Carter', 'Michael Osei']));
    ok('FX-I they hold the roles (Teacher only; Assessor only), neither is a Coordinator', J(st(CD_TEACHER).roles) === J(['Teacher']) && J(st(CD_ASSESSOR).roles) === J(['Assessor']) && !mcList(b).includes(CD_ASSESSOR) && !mcList(b).includes(CD_TEACHER));
    ok('FX-I assessment allocation: assignments, PD and observations to the Assessor only; the Teacher and the Coordinators mark nothing', a.asg === CD_ASSESSOR && a.pd === CD_ASSESSOR && a.obs === CD_ASSESSOR && [CD_TEACHER, ...mcList(b)].every(n => !chRoleOn(b, n).length));
    ok('FX-I the learners\' Coordinators, modes and fee options are unchanged', J(mcLids(b).map(l => [mcOf(l, b), r2LidInfo(l, CD_B).mode, r1Opt(b.r2[l].opt).fee])) === J([['Dr Helen Carter', 'Self-Paced', 1800], ['Michael Osei', 'Self-Paced', 1800], ['Dr Helen Carter', 'Fully Assisted', 2600], ['Michael Osei', 'Fully Assisted', 2600]]));
    ok('FX-I the batch sessions are taught by the batch\'s Teacher', s4bAllSess().every(x => x.teacher === CD_TEACHER));
    as('SY'); go('a-batches', { id: CD_B, tab: 'staff' }); ok('FX-I the batch Staff tab shows Teacher and Assessor', /Teachers ?Marcus Bell/.test(main()) && /Assessors ?James Pryce/.test(main()));
    S.tas.v = 'T'; tasEnter(); S.signedIn = true; ok('FX-I Teacher portal (Marcus Bell): the demo batch', tasBatches().map(x => x.code).join() === CD_B);
    S.tas.v = 'S'; tasEnter(); S.signedIn = true; ok('FX-I Assessor portal (James Pryce): the demo batch; nothing marked, observed or submitted', tasBatches().map(x => x.code).join() === CD_B && !allSubmissions().length && !allTx().length);
  });

  ACT.resetDemo();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
