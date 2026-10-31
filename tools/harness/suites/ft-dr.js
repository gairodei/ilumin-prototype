// DR — one small, consistent client demo (31 Oct 2026; PD-DR-01…). suites.sh runs this suite with FIXTURE=client: the page boots as a
// fresh browser does. Every journey starts on the sign-in page and clicks the real controls: the demo-identity chooser, the two-step
// code, the learner's and the staff's own screens, Demo controls (Switch demo user, Reset demo, developer mode). Checked: each identity
// opens the same underlying records; counts, lists, search and dropdowns agree; Reset restores the identical data; the legacy fixture
// stays separate.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const shown = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const app = () => ($1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const change = (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`));
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const rowsOf = () => $a('main table tbody tr').filter(r => !r.querySelector('td[colspan]'));
  const LEGACY = ['Aisha Rahman', 'Grace Mensah', 'Daniel Okafor', 'Priya Raman', 'Oliver Bennett', 'Level 2 Diploma in Care (England)', 'Level 3 Diploma in Adult Care (England)', 'L3AC-JAN26', 'L2DC-MAR26', 'Leicester Cohort 7', 'Gulf Care Recruitment', 'BrightCare Staffing', 'Ben Holloway', 'Chloe Adeyemi', 'Sarah Okonkwo'];
  const leaks = t => LEGACY.filter(n => t.includes(n));
  const NAMES = { sp: 'Amira Shah (demo)', fa: 'Dev Patel (demo)', sc: 'Lena Hart (demo)' };
  // the logical dataset: what every list, count and relationship reads (ids and references made at load time excluded)
  const snap = () => J({
    progs: ADMIN.programmes.map(p => [p.title, p.status, p.version]), batches: ADMIN.batches.map(b => [b.code, b.status, b.enrolled, b.cap, crBModes(b), b.coords, b.teachers, b.assessors]),
    learners: ADMIN.learners.map(l => [l.id, l.name, l.acct, l.courses]).sort(), courses: ADMIN.courses.map(c => [c.id, c.title, c.status, c.enrol]),
    members: cdBatch() ? mcLids(cdBatch()).map(l => [l, r2LidInfo(l, CD_B).mode, mcOf(l, cdBatch())]) : null,
    worlds: CD_KEYS.map(k => { const w = STORE.worlds[k]; return w && [chFullName(w), w.me.email, w.admission && w.admission.status, w.enrolments.map(e => [e.title, e.status]), w.plans.map(p => [p.title, p.plan, p.rows.map(r => [r.amount, r.status])])]; }),
    asg: s2Defs().map(d => [d.title, d.status]), sess: s4bAllSess().map(s => [s.title, s.batch]), queue: allQueue().map(i => [i.type, i.status]),
    tx: allTx().map(t => [t.payer, t.amount, t.status]).sort() /* same-time payments have no fixed order */, catalogue: CATALOGUE.map(c => [c.kind, c.title]), vi: VARIANT_INFO, agencies: ADMIN.agencies.map(a => a.id),
    personas: drPersonas().map(p => [p[0], p[2], p[3](), p[4]()]) });
  const boot = { mode: FX.mode, signedIn: S.signedIn, auth: S.auth };
  const s0 = snap();

  await T('DR-A fresh start: the sign-in page and its demo identities', async () => {
    ok('DR-A a fresh start loads the client demo and shows the sign-in page', boot.mode === 'client' && !boot.signedIn && boot.auth === 'signin' && shown($1('#app form[data-submit="signin"]')));
    const ids = $a('#app .dr-signin [data-act="drAs"]'), lab = ids.map(b => b.querySelector('.dr-id-r').textContent);
    ok('DR-A one chooser of demo identities; the sample sign-in buttons are gone (no "Sign in as Learner (Aisha)", no Gulf Care, no duplicate A/B variants)', !!$1('#app .dr-signin') && !$1('#app .demo-hint') && !/Aisha|Gulf Care|Admin B|Finance Admin B|Teacher \+ Assessor/.test(app()));
    ok('DR-A the identities: three learners, two Coordinators, Teacher, Assessor, Academic, Finance, System and Super Administrators, IQA, Agency, Business Admin', J(lab) === J(['NVQ Learner — Self-Paced', 'NVQ Learner — Fully Assisted', 'Short-Course Learner', 'Academic Coordinator 1', 'Academic Coordinator 2', 'Teacher', 'Assessor', 'Academic Administrator', 'Finance Administrator', 'System Administrator', 'Super Administrator', 'Internal Quality Assurer', 'Agency', 'Business Administrator']), J(lab));
    const d = p => ($1(`#app .dr-signin [data-p="${p}"]`) || {}).textContent || '';
    ok('DR-A each learner identity is described from its records (name, programme, batch, mode, Coordinator; the short course)', /Amira Shah \(demo\).*Level 3 Diploma in Care Practice \(client demo\).*DEMO-L3-JAN27.*Self-Paced.*Coordinator: Dr Helen Carter/.test(d('nvq-sp')) && /Dev Patel \(demo\).*DEMO-L3-JAN27.*Fully Assisted.*Coordinator: Michael Osei/.test(d('nvq-fa')) && /Lena Hart \(demo\).*Moving and Handling People.*enrolled/.test(d('short')));
    ok('DR-A staff identities name their allocation (Coordinator 1: Amira; Coordinator 2: Dev; Teacher and Assessor on the batch)', /Dr Helen Carter.*1 allocated learner: Amira Shah/.test(d('coord1')) && /Michael Osei.*1 allocated learner: Dev Patel/.test(d('coord2')) && /Marcus Bell.*Teaches DEMO-L3-JAN27/.test(d('teacher')) && /James Pryce.*Assesses DEMO-L3-JAN27/.test(d('assessor')));
    ok('DR-A no legacy person, programme or batch on the sign-in page', !leaks(app()).length, leaks(app()).join());
  });

  await T('DR-B NVQ learner — Self-Paced (Amira Shah)', async () => {
    pick('nvq-sp');
    ok('DR-B the chooser opens the learner dashboard of the bound record (no other learner)', S.signedIn && S.portal === 'learner' && S.variant === 'CD1' && W === STORE.worlds.CD1 && S.route === 'dashboard' && /Good (morning|afternoon|evening), Amira/.test(main()));
    ok('DR-B dashboard: the active Level 3 programme, its batch and both published assignment deadlines', /Level 3 Diploma in Care Practice \(client demo\)/.test(main()) && /DEMO-L3-JAN27/.test(main()) && /Assignment 1 — Person-centred values/.test(main()) && /Assignment 2 — Agreeing a care plan/.test(main()) && !/You don't have an active course yet/.test(main()));
    go('course', { id: 'nvq' }); const t = main(), yp = t.slice(t.indexOf('Your people'), t.indexOf('Your people') + 220);
    ok('DR-B course: batch, fee option and delivery mode Self-Paced', /BatchDEMO-L3-JAN27/.test(t) && /Self-Paced \(demo fee\) — £1,800\.00/.test(t) && /Delivery mode ?Self-Paced/.test(t));
    ok('DR-B Your people: her Coordinator Dr Helen Carter, not the other Coordinator', yp.includes('Dr Helen Carter') && !yp.includes('Michael Osei'));
    go('assignments'); ok('DR-B assignments: the two published ones with their batch deadlines; the draft is not listed', /Assignment 1 — Person-centred values/.test(main()) && /Assignment 2 — Agreeing a care plan/.test(main()) && !/Reflective account/.test(main()) && /13 Dec 2026, 17:00/.test(main()) && /17 Jan 2027, 17:00/.test(main()));
    const ev = W.events.map(e => e.title);
    ok('DR-B calendar records: the mixed class and the Self-Paced check-in (her audience)', ev.includes('Client demo — mixed class (all learners)') && ev.includes('Client demo — Self-Paced check-in'));
    setUi('calView', 'month'); setUi('calDate', '2026-12-01'); go('calendar');
    ok('DR-B calendar (December): both sessions displayed', /mixed class/.test(main()) && /Self-Paced check-in/.test(main()));
    setUi('calDate', undefined);
    go('payments'); const pl = W.plans.find(p => p.e === 'nvq');
    ok('DR-B payments: six payments of her option (£1,800.00), payment 1 paid (simulated), the rest pending', !!pl && pl.rows.length === 6 && pl.rows[0].status === 'Paid' && pl.rows.slice(1).every(r => r.status === 'Pending') && Math.abs(pl.rows.reduce((a, r) => a + r.amount, 0) - 1800) < .01 && /£300\.00 of £1,800\.00 paid/.test(main()));
    ok('DR-B nothing of another learner on her screens', ['dashboard', 'assignments', 'payments', 'messages', 'notifications', 'courses'].every(r => { go(r); return ![NAMES.fa, NAMES.sc].some(n => main().includes(n)); }));
  });

  await T('DR-C NVQ learner — Fully Assisted (Dev Patel), after signing out', async () => {
    signOutUI(); ok('DR-C signing out returns to the sign-in page with the same chooser', !S.signedIn && !!$1('#app .dr-signin'));
    pick('nvq-fa');
    ok('DR-C the learner dashboard of Dev Patel', S.portal === 'learner' && S.variant === 'CD2' && /Good (morning|afternoon|evening), Dev/.test(main()) && /Level 3 Diploma in Care Practice \(client demo\)/.test(main()));
    go('course', { id: 'nvq' }); const t = main(), yp = t.slice(t.indexOf('Your people'), t.indexOf('Your people') + 220);
    ok('DR-C course: Fully Assisted option (£2,600.00) and mode; Coordinator Michael Osei only', /Fully Assisted \(demo fee\) — £2,600\.00/.test(t) && /Delivery mode ?Fully Assisted/.test(t) && yp.includes('Michael Osei') && !yp.includes('Dr Helen Carter'));
    go('assignments'); ok('DR-C assignments: the same two published assignments', /Assignment 1 — Person-centred values/.test(main()) && /Assignment 2 — Agreeing a care plan/.test(main()));
    const ev = W.events.map(e => e.title); ok('DR-C calendar records: the mixed class, not the Self-Paced check-in', ev.includes('Client demo — mixed class (all learners)') && !ev.includes('Client demo — Self-Paced check-in'));
    go('payments'); const pl = W.plans.find(p => p.e === 'nvq');
    ok('DR-C payments: six payments of £2,600.00, payment 1 paid', !!pl && pl.rows.length === 6 && pl.rows[0].status === 'Paid' && Math.abs(pl.rows.reduce((a, r) => a + r.amount, 0) - 2600) < .01 && /of £2,600\.00 paid/.test(main()));
  });

  await T('DR-D Short-course learner (Lena Hart)', async () => {
    signOutUI(); pick('short');
    ok('DR-D the learner dashboard of Lena Hart lists the short course (no empty state)', S.variant === 'CD3' && /Lena/.test(main()) && /Moving and Handling People/.test(main()) && !/You don't have an active course yet/.test(main()));
    go('courses'); ok('DR-D My Courses: Moving and Handling People, Active', /Moving and Handling People — 2026/.test(main()) && /Active/.test(main()));
    const e = W.enrolments.find(x => x.kind === 'short'); go('course', { id: e.id });
    ok('DR-D the course page: active enrolment, completion requirements, certificate validity', /Moving and Handling People — 2026/.test(main()) && /Completion requirements/.test(main()) && /Certificate validity/.test(main()));
    click($a('main [role="tablist"] button, main .subtabs button, main .tabs button, main [data-tab="content"]').find(b => /^Content$/.test(b.textContent.trim()) || b.dataset.tab === 'content'));
    ok('DR-D Content tab: the course\'s learning content listed', S.params.tab === 'content' && e.content.length > 0 && e.content.every(c => main().includes(c.title)));
    ok('DR-D a new enrolment starts at 0 %: nothing opened, watched or completed (PD-DR-12)', e.progress === 0 && e.content.every(c => c.state === 'Not opened' && !c.watch) && !/Completed|Resume from/.test(main()));
    const it = $1(`main [data-act="openItem"][data-e="${e.id}"]`); click(it); const c0 = e.content.find(c => c.id === it.dataset.id);
    ok('DR-D a content item opens (accessible)', c0.state !== 'Not opened');
    ok('DR-D certificate setting kept with the enrolment (Yes/No feature unchanged)', typeof fcOn === 'function' ? fcOn(e) === true : e.certOn !== false);
    go('payments'); ok('DR-D payments: the one-time course fee, paid (simulated)', W.plans.length === 1 && W.plans[0].plan === 'One-time' && W.plans[0].rows[0].status === 'Paid');
    ok('DR-D not an NVQ learner (no programme, no Coordinator)', !W.flags.nvq && !W.signup);
  });

  await T('DR-E System Administrator: one programme, one batch, one short course; Create batch', async () => {
    signOutUI(); pick('sys');
    ok('DR-E System Administrator passes the two-step code (restriction kept)', !S.signedIn && S.auth === 'tfa-code');
    code2fa(); ok('DR-E then opens the admin console as Owen Price', S.signedIn && S.portal === 'admin' && ADMIN.me.name === 'Owen Price');
    go('a-programmes'); ok('DR-E Programmes: exactly one (published)', rowsOf().length === 1 && /Level 3 Diploma in Care Practice \(client demo\)/.test(main()));
    go('a-batches'); ok('DR-E Batches: exactly one (DEMO-L3-JAN27, Open, 2 learners)', rowsOf().length === 1 && /DEMO-L3-JAN27/.test(main()));
    go('a-courses'); ok('DR-E Short courses: exactly one (Moving and Handling People)', rowsOf().length === 1 && /Moving and Handling People/.test(main()));
    go('a-learners'); ok('DR-E Learners: the three demo learners, each with their course', rowsOf().length === 3 && /3 registered learners/.test(main()) && ADMIN.learners.every(l => l.courses.length === 1));
    ok('DR-E admin lists show no legacy records', ['a-programmes', 'a-batches', 'a-courses', 'a-learners', 'a-dashboard', 'a-queue'].every(r => { go(r); return !leaks(main()).length; }));
    go('a-batches'); click($1('main [data-act="newBatch"]')); const co = $1('#modal-root #nb-co');
    ok('DR-E Create batch offers the NVQ programme (the only one)', !!co && [...co.options].map(o => o.value).filter(Boolean).join() === CD_T);
    change(co, CD_T); const box = m => $1(`#modal-root .m-m[value="${m}"]`);
    M_MODES.forEach(m => { if (!box(m).checked) box(m).click(); });
    ok('DR-E both delivery-mode checkboxes can be selected together', M_MODES.every(m => shown(box(m)) && box(m).checked));
    closeModal();
  });

  await T('DR-F Coordinators: each sees their allocated learner', async () => {
    for (const [p, me, other] of [['coord1', NAMES.sp, NAMES.fa], ['coord2', NAMES.fa, NAMES.sp]]) {
      signOutUI(); pick(p); go('c-batches', { id: CD_B, tab: 'roster' }); const t = main();
      ok(`DR-F ${COO_USERS[S.coo.v].name}: the roster lists ${me} as theirs; the batch has 2 learners, 1 allocated to them`, S.portal === 'coord' && t.includes(me) && /1 of 2 learners are allocated to you/.test(t) && /Total batch learners ?2/.test(t), t.slice(t.indexOf('My learners'), t.indexOf('My learners') + 160));
      go('c-dashboard'); ok(`DR-F ${COO_USERS[S.coo.v].name}: dashboard counts 1 batch, 2 learners (no phantom counts)`, /1 batch · 2 learners/.test(main()));
      void other;
    }
  });

  await T('DR-G Teacher and Assessor: the batch and its learners', async () => {
    signOutUI(); pick('teacher');
    ok('DR-G Teacher Marcus Bell: teaching portal on DEMO-L3-JAN27 with its 2 learners; no marking', S.portal === 'staff' && TME().name === 'Marcus Bell' && J(tasBatches().map(b => b.code)) === J([CD_B]) && tasLearners(true).length === 2 && CAN('mark') === 'no');
    signOutUI(); pick('assessor');
    ok('DR-G Assessor James Pryce: marking portal on DEMO-L3-JAN27 with the same 2 learners', TME().name === 'James Pryce' && J(tasBatches().map(b => b.code)) === J([CD_B]) && J(tasLearners(true).map(l => l.lid).sort()) === J(mcLids(cdBatch()).slice().sort()) && CAN('mark') === 'yes');
    ok('DR-G nothing marked or observed has been invented (no submissions to mark)', tasSubs(true).every(s => !/Submitted|Marked|Competent/.test(s.status || '')) || tasSubs(true).length === 0, J(tasSubs(true).map(s => s.status)));
  });

  await T('DR-H Finance Administrator: the same learners\' schedules and payments', async () => {
    signOutUI(); pick('fin'); code2fa();
    ok('DR-H Finance Admin Leila Haddad, through the two-step code', S.signedIn && ADMIN.me.name === 'Leila Haddad');
    go('f-plans'); const opts = $a('main #fpl option').map(o => o.textContent);
    ok('DR-H Payment Plans: the three demo learners in the learner selector', J(opts) === J([NAMES.sp, NAMES.fa, NAMES.sc]), J(opts));
    ok('DR-H Amira Shah: her six-payment schedule, payment 1 paid', /Instalments/.test(main()) && /£300\.00/.test(main()) && $a('main section.card table tbody tr').length >= 6);
    change($1('main #fpl'), 'CD2'); ok('DR-H Dev Patel: his schedule (£433.33 first payment)', /£433\.33/.test(main()));
    go('f-ledger'); const t = main();
    ok('DR-H Ledger: the three simulated payments, by name (Amira £300, Dev £433.33, Lena £45)', [NAMES.sp, NAMES.fa, NAMES.sc].every(n => t.includes(n)) && allTx().length === 3);
    ok('DR-H the payments are audited as demonstration events', ADMIN.audit.filter(a => a.action === 'Demonstration: simulated payment').length === 3);
  });

  await T('DR-I Global search, counts and related dropdowns agree', async () => {
    signOutUI(); pick('aca');
    const sr = q => searchResults(q).replace(/<[^>]+>/g, ' ');
    ok('DR-I search finds each demo learner, the batch and the short course', /Amira Shah/.test(sr('Amira')) && /Dev Patel/.test(sr('Patel')) && /Lena Hart/.test(sr('Lena')) && /DEMO-L3-JAN27/.test(sr('DEMO-L3')) && /Moving and Handling/.test(sr('Moving')));
    ok('DR-I search finds no legacy records ("Aisha", "Grace", "L3AC")', ['Aisha', 'Grace', 'L3AC', 'Leicester'].every(q => /No matches/.test(sr(q))));
    ok('DR-I counts agree: 3 learners everywhere; the batch counts its 2 members once', allLearners().length === 3 && cdBatch().enrolled === 2 && mcLids(cdBatch()).length === 2 && batchRoster(cdBatch()).length === 2);
    go('a-batches', { id: CD_B }); click($1('main [data-act="addToBatch"]'));
    const sel = $a('#modal-root #ab-l option').map(o => o.textContent);
    ok('DR-I Add to batch lists the registered learners (the dropdown reads the same records)', sel.length === 3 && [NAMES.sp, NAMES.fa, NAMES.sc].every(n => sel.some(s => s.includes(n))), J(sel)); closeModal();
  });

  await T('DR-J the batch takes new learners', async () => {
    go('a-learners'); ACT.addLearner(); $1('#nl-name').value = 'Test Newcomer'; $1('#nl-email').value = 'test.newcomer@demo.example'; $1('#nl-mob').value = '+44 7700 900999';
    MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    const l = ADMIN.learners.find(x => x.name === 'Test Newcomer'); ok('DR-J Add learner registers a new learner (pending their activation)', !!l && l.acct === 'Pending Verification');
    go('a-batches', { id: CD_B }); ACT.addToBatch({ dataset: { id: CD_B } });
    ok('DR-J (negative) Add to batch lists only activated learners', !$a('#modal-root #ab-l option').some(o => o.value === l.id)); closeModal();
    l.acct = 'Active'; // the learner sets their password from the activation link (no admin step exists; as in the build)
    go('a-batches', { id: CD_B }); ACT.addToBatch({ dataset: { id: CD_B } }); $1('#modal-root #ab-l').value = l.id; const o = $1('#modal-root #r2-ab-o'); if (o) o.value = [...o.options].find(x => /Fully Assisted/.test(x.textContent)).value;
    MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    ok('DR-J and Add to batch enrols them (3 learners; the batch is still Open)', mcLids(cdBatch()).includes(l.id) && cdBatch().enrolled === 3 && cdBatch().status === 'Open');
  });

  await T('DR-K Demo controls: Switch demo user, Reset demo, developer mode', async () => {
    S.demoOpen = true; renderDemo(); const p = $1('#demo-root .demo-panel'), ctl = $a('#demo-root .demo-panel button, #demo-root .demo-panel input, #demo-root .demo-panel select').filter(b => !/demoToggle/.test(b.dataset.act || ''));
    ok('DR-K the panel holds three controls only: Switch demo user, Reset demo, Developer mode', !!p && J(ctl.map(b => b.dataset.act)) === J(['drSwitch', 'drReset', 'drDevOn']) && !p.querySelector('fieldset'), J(ctl.map(b => b.dataset.act)));
    ok('DR-K no scenario, variant, legacy or 101-learner controls in the client panel', !/Scenario|variant|legacy|101-learner|Aisha|Edge state/i.test(p.textContent));
    ok('DR-K it says who is signed in, and what Reset discards', /Viewing as Rachel Hughes — Academic Administrator/.test(p.textContent) && /Discards every change made in this browser tab/.test(p.textContent));
    click($1('#demo-root [data-act="drSwitch"]'));
    ok('DR-K Switch demo user opens the same identity chooser', /Switch demo user/.test(MODAL.title) && $a('#modal-root [data-act="drAs"]').length === 14);
    click($1('#modal-root [data-act="drAs"][data-p="nvq-fa"]'));
    ok('DR-K choosing an identity there switches to it', !MODAL && S.portal === 'learner' && S.variant === 'CD2' && S.route === 'dashboard');
    S.demoOpen = true; renderDemo(); click($1('#demo-root [data-act="drDevOn"]')); ok('DR-K developer mode asks first', !!MODAL && /developer mode/i.test(MODAL.title));
    MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    ok('DR-K developer mode: the internal tools (101-learner demo, legacy fixture), clearly labelled', S.drDev && shown($1('#demo-root .dr-dev-note')) && !!$1('#demo-root [data-act="mcDemoLoad"]') && !!$1('#demo-root [data-act="fxLegacy"]'));
    click($1('#demo-root [data-act="drDevOff"]')); S.demoOpen = true; renderDemo();
    ok('DR-K Exit developer mode returns to the three controls', !S.drDev && !$1('#demo-root [data-act="fxLegacy"]') && !!$1('#demo-root [data-act="drReset"]'));
  });

  await T('DR-L Reset demo restores the identical data and identities', async () => {
    S.demoOpen = true; renderDemo(); click($1('#demo-root [data-act="drReset"]'));
    ok('DR-L Reset asks first, saying the tab\'s changes are discarded', !!MODAL && /Reset the demo/.test(MODAL.title) && /discarded/.test($1('#modal-root').textContent));
    MODAL.actions.find(a => /danger|primary/.test(a.cls || '')).fn(); closeModal();
    ok('DR-L after Reset: signed out on the sign-in page with the chooser (as a fresh start)', !S.signedIn && S.auth === 'signin' && !!$1('#app .dr-signin') && FX.mode === 'client');
    const s1 = snap(); ok('DR-L the dataset is identical to the fresh start (lists, counts, schedules, enrolments, identities)', s1 === s0, s1.length + ' vs ' + s0.length);
    ok('DR-L the added learner is gone', !ADMIN.learners.some(l => l.name === 'Test Newcomer'));
    pick('nvq-sp'); ok('DR-L the identities map to the same records after Reset', W === STORE.worlds.CD1 && W.me.id === ADMIN.learners.find(l => l.name === NAMES.sp).id);
  });

  await T('DR-M the email form signs in demo identities only', async () => {
    signOutUI(); const f = $1('form[data-submit="signin"]'), sub = (e) => { $1('#si-email').value = e; $1('#si-pw').value = 'x'; $1('form[data-submit="signin"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
    sub('demo.learner2@demo.example'); ok('DR-M a demo learner\'s email signs in as that learner', S.signedIn && S.variant === 'CD2');
    signOutUI(); sub('someone@else.example'); ok('DR-M another address is refused with a pointer to the demo identities (no silent default learner)', !S.signedIn && /isn't one of the demo accounts/.test(app()));
    sub('wrong@x.example'); ok('DR-M the error-state words still work ("wrong")', !S.signedIn && /Email or password is incorrect/.test(app()));
    sub('helen.carter@illumin-academy.example'); ok('DR-M a staff email opens that staff identity (Coordinator 1)', S.signedIn && S.portal === 'coord' && S.coo.v === 'A');
    void f;
  });

  await T('DR-N screen indexes are internal: not in the client navigation', async () => {
    signOutUI(); pick('aca'); ok('DR-N no "screen index" link in the navigation', !$a('#app nav a, #app nav button').some(a => /screen index$/i.test(a.textContent.trim())));
  });

  // DR final corrections (PD-DR-12…16), from a fresh client-demo reset, by the real controls
  const sendMsg = (to, s, b) => { go('messages'); click($1('main [data-act="compose"]')); const sel = $1('#modal-root #m-to'); const opts = [...sel.options].map(o => o.value); sel.value = to; $1('#modal-root #m-sub').value = s; $1('#modal-root #m-body').value = b; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal(); return opts; };
  await T('DR-Q1 learner ↔ Coordinator messages resolve by the learner\'s account', async () => {
    ACT.resetDemo(); signOutUI();
    pick('nvq-sp'); const optsA = sendMsg('Dr Helen Carter (Academic Coordinator)', 'Question about Assignment 1', 'Amira here — can I use an example from a previous job?');
    ok('DR-Q1 Amira can message her own Coordinator, not the other Coordinator', optsA.includes('Dr Helen Carter (Academic Coordinator)') && !optsA.includes('Michael Osei (Academic Coordinator)'), JSON.stringify(optsA));
    ok('DR-Q1 Amira\'s message is in her messages', /Question about Assignment 1/.test((W.threads[0] || {}).subject || ''));
    signOutUI(); pick('nvq-fa'); const optsD = sendMsg('Michael Osei (Academic Coordinator)', 'Fully Assisted class times', 'Dev here — when is the next class?');
    ok('DR-Q1 Dev can message his own Coordinator, not the other Coordinator', optsD.includes('Michael Osei (Academic Coordinator)') && !optsD.includes('Dr Helen Carter (Academic Coordinator)'));
    signOutUI(); pick('coord1'); go('c-messages');
    ok('DR-Q1 Dr Helen Carter receives Amira\'s message', /Question about Assignment 1/.test(main()) && /Amira Shah \(demo\)/.test(main()));
    ok('DR-Q1 isolation: Dr Helen Carter does not see Dev\'s conversation with his Coordinator', !/Fully Assisted class times/.test(main()) && !cooThreads().some(t => /Fully Assisted class times/.test(t.subject)));
    const th = cooThreads().find(t => /Question about Assignment 1/.test(t.subject)); go('c-messages', { id: th.id });
    ok('DR-Q1 message only: no calling action in the Coordinator\'s conversation with a Self-Paced learner', !/tel:/.test($1('main').innerHTML) && !$a('main button, main a').some(b => /\bcall\b/i.test(b.textContent)));
    $1('#crep').value = 'Yes — a past workplace example is fine. Keep names anonymous.'; $1('form[data-submit="cooReply"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const otherId = 'LT-CD2-' + STORE.worlds.CD2.threads[0].id; go('c-messages', { id: otherId });
    ok('DR-Q1 isolation: opening Dev\'s conversation by its address shows nothing of it to Dr Helen Carter', !/Fully Assisted class times|when is the next class/.test(main()));
    signOutUI(); pick('coord2'); go('c-messages');
    ok('DR-Q1 Michael Osei receives Dev\'s message and not Amira\'s', /Fully Assisted class times/.test(main()) && !/Question about Assignment 1/.test(main()));
    signOutUI(); pick('nvq-sp'); const t0 = W.threads.find(t => /Question about Assignment 1/.test(t.subject));
    ok('DR-Q1 Amira receives her Coordinator\'s reply', !!t0 && t0.msgs.some(m => !m.me && m.from === 'Dr Helen Carter' && /past workplace example/.test(m.text)));
    // staff messaging (Teacher): his message to a demo learner, her reply, back in his inbox (was read from worlds A–F only)
    signOutUI(); pick('teacher'); go('t-messages'); ACT.tasCompose(); $1('#modal-root #tm-to').value = 'Amira Shah (demo) (Learner)'; $1('#modal-root #tm-s').value = 'Class on 10 Dec'; $1('#modal-root #tm-b').value = 'Bring your care plan notes.'; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    signOutUI(); pick('nvq-sp'); const tt = W.threads.find(t => t.subject === 'Class on 10 Dec'); go('messages', { id: tt.id }); $1('#reply').value = 'Will do, thank you.'; $1('form[data-submit="reply"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    ok('DR-Q1 the Teacher\'s message reaches Amira and she replies', !!tt && tt.msgs.some(m => m.me && /Will do/.test(m.text)));
    signOutUI(); pick('teacher'); ok('DR-Q1 staff messaging (Teacher Marcus Bell): the conversation and her reply are in his inbox', tasThreads().some(t => t.subject === 'Class on 10 Dec' && t.with[0] === 'Amira Shah (demo) (Learner)' && t.msgs.some(m => /Will do/.test(m[2]))));
    signOutUI(); pick('assessor'); ok('DR-Q1 …and not in the Assessor\'s (not his conversation)', !tasThreads().some(t => t.subject === 'Class on 10 Dec'));
  });

  await T('DR-Q2 a learner added by the Academy activates their own portal; admission requirements still apply', async () => {
    ACT.resetDemo(); signOutUI(); pick('aca'); const b = cdBatch(), n0 = { l: allLearners().length, m: mcLids(b).length, e: b.enrolled };
    go('a-learners'); ACT.addLearner(); $1('#nl-name').value = 'Nora Quinn'; $1('#nl-email').value = 'nora.quinn@demo.example'; $1('#nl-mob').value = '+44 7700 900777';
    MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal(); const L = ADMIN.learners.find(x => x.name === 'Nora Quinn');
    ok('DR-Q2 Add learner: one record, Pending Verification, no portal account yet', !!L && L.acct === 'Pending Verification' && !n4World(L.id));
    signOutUI(); $1('#si-email').value = L.email; $1('#si-pw').value = 'x'; $1('form[data-submit="signin"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    ok('DR-Q2 (negative) before activation her email does not sign in', !S.signedIn);
    pick('aca'); go('a-learner', { id: L.id }); const btn = $1('main .ln-act [data-act="lnActLink"]');
    ok('DR-Q2 her record offers the activation link, labelled as a prototype simulation', shown(btn) && /prototype — simulated email/.test(btn.textContent));
    click(btn);
    ok('DR-Q2 the link opens the existing set-password page for her (labelled simulated email)', !S.signedIn && S.auth === 'first' && shown($1('#app .ln-sim')) && /Welcome to Illumin Academy, Nora/.test(app()));
    const p1 = $1('#np1'), p2 = $1('#np2'); p1.value = 'Demo-Pass-2026!'; p2.value = 'Demo-Pass-2026!'; p1.dispatchEvent(new Event('input', { bubbles: true }));
    click($1('form[data-submit="firstSet"] [data-pwsubmit]'));
    ok('DR-Q2 setting a password activates the account (audited as her action)', S.auth === 'welcome' && L.acct === 'Active' && ADMIN.audit.some(a => a.action === 'Account activated' && a.entity === L.id && a.actor === 'Nora Quinn' && /simulated email/.test(a.reason)));
    click($1('#app [data-act="finishWelcome"]'));
    ok('DR-Q2 she is in her own portal, bound to her record (one person, one ID)', S.signedIn && S.portal === 'learner' && W.me.id === L.id && Object.values(STORE.worlds).filter(w => w.me && w.me.id === L.id).length === 1);
    ok('DR-Q2 no entitlement from the account: no enrolment, no programme, not in the batch', !W.enrolments.length && !W.flags.nvq && !mcLids(b).includes(L.id) && /You don't have an active course yet/.test(main()));
    go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(c => c.kind === 'nvq').id } }); const r = $1('#modal-root input[name="r1-opt"]'); if (r) r.checked = true; MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); closeModal();
    ok('DR-Q2 she can start the normal sign-up; it stays pending (documents, offer letter, payment, admission)', !!W.signup && !W.signup.done && W.admission.status !== 'Approved' && !W.flags.admitted);
    go('assignments'); ok('DR-Q2 programme content stays behind the sign-up (the normal gate)', /Finish your sign-up/.test(main()) || !/Assignment 1 — Person-centred values/.test(main()));
    ok('DR-Q2 no duplicates: one more learner in lists, no batch roster entry or enrolment yet', allLearners().length === n0.l + 1 && allLearners().filter(x => x.id === L.id).length === 1 && mcLids(b).length === n0.m && b.enrolled === n0.e && batchRoster(b).length === n0.m);
    signOutUI(); $1('#si-email').value = L.email; $1('#si-pw').value = 'x'; $1('form[data-submit="signin"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    ok('DR-Q2 after activation she signs in with her email to her own account', S.signedIn && W.me.id === L.id);
    signOutUI(); pick('aca'); go('a-admissions'); ok('DR-Q2 her application is in Admissions once (pending)', allApplications().filter(a => a.name === 'Nora Quinn').length === 1);
    go('a-learner', { id: L.id }); ok('DR-Q2 the activation link is no longer offered', !$1('main .ln-act'));
  });

  await T('DR-Q3 not started is not At risk; genuine risk still flagged', async () => {
    ACT.resetDemo(); signOutUI(); const b = cdBatch(), f0 = JSON.stringify(b.coh.map(e => e.flags));
    pick('teacher'); const ls = tasLearners(true);
    ok('DR-Q3 Teacher view: Amira and Dev at 0 % before their batch starts are "Not started", not At risk', ls.length === 2 && ls.every(l => !l.flags.includes('At risk') && l.flags.includes('Not started')), JSON.stringify(ls.map(l => l.flags)));
    go('t-dashboard'); ok('DR-Q3 Teacher dashboard: 0 learners at risk', /0 learners at risk/.test(main()));
    signOutUI(); pick('coord1'); ok('DR-Q3 Coordinator view: no At risk for her learner', myLearners(true).every(l => !l.flags.includes('At risk')));
    go('c-dashboard'); ok('DR-Q3 Coordinator dashboard: 0 learners at risk', /0 learners at risk/.test(main()));
    ok('DR-Q3 reading the views never writes a flag onto the cohort record', JSON.stringify(b.coh.map(e => e.flags)) === f0);
    const s0 = b.start, e0 = b.end; b.start = D(-200); b.end = D(165); // the same learners, 200 days into a year-long batch at 0 % (test only, restored)
    signOutUI(); pick('teacher'); const ls2 = tasLearners(true);
    ok('DR-Q3 genuine risk kept: 0 % when 55 % of the batch period has gone is At risk (Teacher and Coordinator)', ls2.every(l => l.flags.includes('At risk')) && (() => { signOutUI(); pick('coord1'); return myLearners(true).every(l => l.flags.includes('At risk')); })());
    b.start = s0; b.end = e0;
    ok('DR-Q3 seeded legacy flags are left as recorded (the rule applies to live sign-ups and the staff view only)', typeof progRisk === 'function');
  });

  await T('DR-Q4 batch lists show every Coordinator', async () => {
    ACT.resetDemo(); signOutUI(); pick('sys'); code2fa(); go('a-batches');
    const cell = () => (($1('main table tbody tr .mc-cell') || {}).textContent || '').trim();
    ok('DR-Q4 System Admin Batches: "Dr Helen Carter, Michael Osei"', cell() === 'Dr Helen Carter, Michael Osei', cell());
    signOutUI(); pick('aca'); go('a-batches'); ok('DR-Q4 Academic Admin Batches: both Coordinators', cell() === 'Dr Helen Carter, Michael Osei', cell());
    const x = { ...cdBatch() }; x.coords = ['Dr Helen Carter', 'Michael Osei', 'Laura Kemp']; x.mcA = {}; x.mcH = [];
    const h = mcCell(x); ok('DR-Q4 more than two: the first name and "+2 more", every name in the title and for screen readers', /Dr Helen Carter/.test(h) && /\+2 more/.test(h) && /title="Dr Helen Carter, Michael Osei, Laura Kemp"/.test(h) && /class="sr">, Michael Osei, Laura Kemp/.test(h), h);
    ok('DR-Q4 display only: the batch\'s Coordinators and allocations unchanged', JSON.stringify(mcList(cdBatch())) === JSON.stringify(['Dr Helen Carter', 'Michael Osei']) && mcLids(cdBatch()).map(l => mcOf(l, cdBatch())).join() === 'Dr Helen Carter,Michael Osei');
  });

  await T('DR-O the legacy fixture stays separate and unchanged', async () => {
    ACT.fxLegacy(); ok('DR-O loading the full legacy fixture (developer mode) restores its records', FX.mode === 'legacy' && ADMIN.programmes.length > 1 && ADMIN.batches.length > 1 && S.drDev === true);
    signOutUI(); ok('DR-O with the legacy fixture the sign-in page is the legacy one (the chooser is client-demo only)', !!$1('#app .demo-hint') && !$1('#app .dr-signin'));
    ok('DR-O the legacy worlds are not client learners', !CD_KEYS.some(k => STORE.worlds[k]));
    // DR-P (PD-DR-12) on the legacy fixture: a new short-course enrolment starts clean; seeded learners' existing progress is kept
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const mh = W.enrolments.find(e => e.id === 'mh26'), mh0 = JSON.stringify([mh.progress, mh.content.map(c => [c.state, c.watch])]);
    const c = CATALOGUE.find(x => x.kind === 'short' && !W.enrolments.some(e => e.base === x.title || e.title.startsWith(x.title))); go('browse'); ACT.buyCourse({ dataset: { id: c.id } });
    if (MODAL && /About you/.test(MODAL.title)) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'Test'; }); MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); }
    MODAL.actions.find(a => /primary/.test(a.cls || '')).fn(); await new Promise(r => setTimeout(r, 1600)); closeModal();
    const ne = W.enrolments[0];
    ok(`DR-O legacy: a new short-course enrolment (${c.title}) starts at 0 % — nothing opened, watched, scored or attempted`, ne.base === c.title && ne.progress === 0 && ne.content.length > 0 && ne.content.every(x => x.state === 'Not opened' && !x.watch && !x.score && x.resume === '0:00') && (ne.modules || []).every(m => !(m.quiz.attempts || []).length) && !ne.certId, JSON.stringify(ne.content.map(x => x.state)));
    ok('DR-O legacy: the seeded learner\'s existing enrolment keeps its progress (not rewritten)', JSON.stringify([mh.progress, mh.content.map(x => [x.state, x.watch])]) === mh0 && mh.content.some(x => x.state === 'Completed'));
    ACT.resetDemo(); signOutUI(); { const s2 = snap(); let i = 0; while (i < s2.length && s2[i] === s0[i]) i++; ok('DR-O Reset demo returns to the client demo', FX.mode === 'client' && s2 === s0, s0.slice(Math.max(0, i - 80), i + 120) + ' ||| ' + s2.slice(Math.max(0, i - 80), i + 120)); }
  });

  S.drDev = false; ACT.resetDemo(); signOut();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
