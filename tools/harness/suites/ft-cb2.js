// CB2 — Course Details (21 Oct 2026, PD-CB-13…18). "New NVQ programme" opens Section 1 of an unsaved course; the first valid
// "Save and continue" creates exactly one Draft and opens Curriculum; the observation question is N5a's own field; a Draft's details
// stay editable; typed values are kept across sections; published, seeded and retired programmes are read-only; role guards hold.
// Each check acts through the screen (clicks, typing) or the handler, then checks the page or the record, with the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB2 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const LEARNER = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const cur = () => (q('.cb-sec.cur') || { dataset: {} }).dataset.tab;
  const type = (s, v) => { const e = q(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const progs = () => ADMIN.programmes.length, made = () => (STORE.chNewProgs || []).filter(p => !p.seed);
  const blocked = (a0, re) => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const obsReq = pr => n5Shown(pr).required;
  const fillL4 = (title = 'Level 4 Certificate in CB2 Leadership', code = 'L4-CB2') => { type('#np-l', 'Level 4'); INP.r1NpLevel(q('#np-l')); type('#np-t', title); type('#np-code', code); type('#np-r', 'QN 610/8282/4'); type('#np-d', '9'); type('#np-du', 'months'); type('#np-p', '2400'); type('#np-ds', 'For team leaders in care.'); type('#np-q-body', 'NCFE CACHE'); type('#np-q-glh', '320'); type('#np-q-tqt', '540'); type('#np-q-credits', '54'); };
  const openNew = enter => { (enter || SYS)(); go('a-programmes'); q('[data-act="chProgNew"]').click(); };
  const createL4 = (obs = 'yes', enter, title) => { openNew(enter); fillL4(title); q('#np-obs-' + obs).click(); q('[data-act="cbDetCreate"]').click(); return made().slice(-1)[0]; };

  await T('CB2-A New NVQ programme opens Course Details of an unsaved course', async () => {
    fresh(); const n0 = progs(); openNew();
    ok('CB2-A the button opens Section 1 — Course Details (#a-programmes.new.details), no dialog', !MODAL && location.hash === '#a-programmes.new.details' && cur() === 'details' && /Course Details/.test(q('.cb-h').textContent));
    ok('CB2-A opening it creates no programme record', progs() === n0 && !made().length);
    const fields = ['#np-t', '#np-l', '#np-code', '#np-r', '#np-q-body', '#np-q-glh', '#np-q-tqt', '#np-q-credits', '#np-d', '#np-du', '#np-ds', '#np-obs-yes', '#np-obs-no'];
    // PD-M-10 supersedes the reference label — was: label[for="np-r"] === 'Qualification number / reference' — now: 'Awarding body course code' (same field, pr.ref)
    ok('CB2-A fields: course name, NVQ level, course code, qualification number / reference and awarding body (three separate fields), GLH, TQT, credits, duration (number + unit), description, observations Yes / No', fields.every(s => !!q(s)) && q('label[for="np-code"]').textContent === 'Course code' && q('label[for="np-r"]').textContent === 'Awarding body course code' && q('label[for="np-q-body"]').textContent === 'Awarding body' && q('#np-code').value === '' && q('#np-r').value === '' && [...q('#np-du').options].map(o => o.textContent).join() === 'Days,Weeks,Months,Years');
    ok('CB2-A the observation question is prominent, required and unanswered at first', !!q('.cb-obs') && /Does this course contain observations\?/.test(q('.cb-obs legend').textContent) && /Required/.test(q('.cb-obs legend').textContent) && !q('#np-obs-yes').checked && !q('#np-obs-no').checked && q('.cb-det-form').firstElementChild === q('.cb-obs'));
    ok('CB2-A sections 2–7 can\'t be opened before saving (disabled, "After saving"); the header says "Not saved yet"', qa('.cb-nav .cb-sec').length === 7 && qa('.cb-nav .cb-sec[disabled]').length === 6 && /Not saved yet/.test(q('.page-h').textContent));
    // CB8 (PD-CB-48) supersedes "fees stay on the form for now, marked as moving to Fees & Payments (CB8)": they are the starting fees, managed in Section 5 after saving
    ok('CB2-A fees on the new-course form are the starting fees, then managed in Section 5 — Fees & Payments', /Starting fees\. After the course is saved, fees, fee options, observation fees and payment options are managed in Section 5 — Fees & Payments\./.test(main()));
  });

  await T('CB2-B validation before anything is created', async () => {
    fresh(); const n0 = progs(); openNew();
    q('[data-act="cbDetCreate"]').click(); ok('CB2-B empty form: "Enter a title", nothing created', /Enter a title/.test(main()) && progs() === n0);
    fillL4(); q('[data-act="cbDetCreate"]').click(); ok('CB2-B the observation question must be answered (marked), nothing created', /Choose Yes or No — does this course contain observations\?/.test(main()) && progs() === n0);
    type('#np-q-glh', '1.5'); q('#np-obs-yes').click(); q('[data-act="cbDetCreate"]').click(); ok('CB2-B GLH must be a whole number (or blank), nothing created', /whole number, or leave it blank/.test(main()) && progs() === n0);
    type('#np-q-glh', '320'); type('#np-d', '0'); q('[data-act="cbDetCreate"]').click(); ok('CB2-B duration rule unchanged (E1): 0 refused, nothing created', /whole number from 1 to 999/.test(main()) && progs() === n0);
    type('#np-d', '9'); type('#np-t', 'Level 3 Diploma in Adult Care (England)'); q('[data-act="cbDetCreate"]').click(); ok('CB2-B a duplicate title is refused, nothing created', /already exists/.test(main()) && progs() === n0);
    openNew(); q('[data-act="cbDetDiscard"]').click(); prim(); // the typed values above are kept with the unsaved course until discarded
    type('#np-t', 'Level 3 CB2 no options'); type('#np-r', 'QN 603/8282/3'); q('#np-obs-no').click(); q('[data-act="cbDetCreate"]').click();
    ok('CB2-B (Level 3) at least one fee option is needed (R1 unchanged), nothing created', progs() === n0 && !made().length);
  });

  await T('CB2-C enter all fields, Observations Yes, Save and continue → one Draft, Curriculum', async () => {
    fresh(); const n0 = progs(), a0 = ADMIN.audit.length; const pr = createL4('yes');
    ok('CB2-C exactly one Draft (Version 1) created', progs() === n0 + 1 && made().length === 1 && pr.status === 'Draft' && pr.version === 1);
    ok('CB2-C it opens Section 2 — Curriculum of the new programme', S.params.id === pr.id && cur() === 'curriculum' && location.hash === `#a-programmes.${pr.id}.curriculum`);
    ok('CB2-C details saved: name, level, reference, duration (number + unit), description, fee, qualification details', pr.title === 'Level 4 Certificate in CB2 Leadership' && pr.level === 'Level 4' && pr.code === 'L4-CB2' && pr.ref === 'QN 610/8282/4' && pr.durV.n === 9 && pr.durV.unit === 'months' && pr.desc === 'For team leaders in care.' && pr.price === 2400 && pr.qual.body === 'NCFE CACHE' && pr.qual.glh === 320 && pr.qual.tqt === 540 && pr.qual.credits === 54);
    ok('CB2-C "Yes" is N5a\'s own "Observation required" of Version 1 (no separate field)', obsReq(pr) === true && N5().draft[pr.id] && N5().draft[pr.id].required === true && pr.obs === undefined);
    const acts = ADMIN.audit.slice(0, ADMIN.audit.length - a0).map(a => a.action);
    ok('CB2-C audited: programme created, qualification details, observation settings (N5a\'s own entry)', ['Programme created (Draft, Version 1)', 'Qualification details changed', 'Observation settings changed'].every(x => acts.includes(x)));
    ok('CB2-C the existing creation chain ran: plan, Draft payment terms for Finance, document checklist', !!(s4PlanCur(pr.id) || s4PlanLast(pr.id)) && e1T(pr.id) && ['Draft', 'Approved'].includes(e1T(pr.id).status) && s4List(pr.id).items.length > 0);
    go('a-programmes', { id: pr.id, tab: 'review' }); ok('CB2-C Yes: the Observations section must be set up before publishing (N5a blockers in Review), and "Observation required" is no longer a blocker', /workplace|Academy-office|observation criteria/i.test(main()) && !/choose whether observation is required/.test(main()) && !!q('.cb-sec[data-tab="observations"] .cb-badge.bad'));
  });

  await T('CB2-D no duplicate creation from repeated clicks or submissions', async () => {
    fresh(); const n0 = progs(); openNew(); fillL4('Level 4 CB2 Twice'); q('#np-obs-no').click();
    const btn = q('[data-act="cbDetCreate"]'), tok = btn.dataset.tok; btn.click(); btn.click(); ACT.cbDetCreate({ dataset: { tok } });
    ok('CB2-D clicking twice and submitting again with the same form creates one programme only', progs() === n0 + 1 && made().length === 1);
    ok('CB2-D the repeat opens the programme already created (Curriculum)', S.params.id === made()[0].id && cur() === 'curriculum');
    openNew(); ok('CB2-D the next "New NVQ programme" is a fresh, empty course', q('#np-t').value === '' && q('[data-act="cbDetCreate"]').dataset.tok !== tok);
  });

  await T('CB2-E return to Course Details and edit the Draft', async () => {
    fresh(); const pr = createL4('yes'); q('.cb-sec[data-tab="details"]').click();
    ok('CB2-E Section 1 of the Draft: the same form with the saved values, editable (Save details / Save and continue)', cur() === 'details' && q('#np-t').value === pr.title && q('#np-q-glh').value === '320' && q('#np-obs-yes').checked && !!q('[data-act="cbDetSave"]') && !!q('[data-act="cbDetSave"][data-next="curriculum"]'));
    type('#np-t', 'Level 4 Certificate in CB2 Leadership (revised)'); type('#np-d', '12'); type('#np-ds', 'Revised description.'); type('#np-q-glh', '360'); type('#np-q-body', 'Pearson');
    q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-E every edited field saved (name, duration, description, GLH, awarding body), audited', pr.title === 'Level 4 Certificate in CB2 Leadership (revised)' && pr.durV.n === 12 && pr.desc === 'Revised description.' && pr.qual.glh === 360 && pr.qual.body === 'Pearson' && ADMIN.audit.some(a => a.action === 'Details changed') && ADMIN.audit.some(a => a.action === 'Qualification details changed' && /Pearson/.test(a.after)));
    ok('CB2-E the saved values show again on the form; no unsaved marker', q('#np-t').value === pr.title && q('#np-q-glh').value === '360' && !q('.cb-unsaved') && !q('.cb-sec[data-tab="details"] .cb-badge.warn'));
    type('#np-q-credits', '60'); q('[data-act="cbDetSave"][data-next="curriculum"]').click(); ok('CB2-E "Save and continue" saves and opens Curriculum', pr.qual.credits === 60 && cur() === 'curriculum');
    go('a-programmes', { id: pr.id, tab: 'details' }); type('#np-t', ''); q('[data-act="cbDetSave"]:not([data-next])').click(); ok('CB2-E (negative) a blank name is refused; nothing saved', /Enter a title/.test(main()) && pr.title === 'Level 4 Certificate in CB2 Leadership (revised)');
  });

  await T('CB2-F typed values are kept between sections; discarding asks first', async () => {
    fresh(); const pr = createL4('yes'); go('a-programmes', { id: pr.id, tab: 'details' });
    type('#np-t', 'Level 4 CB2 kept title'); q('#np-obs-no').click(); q('.cb-sec[data-tab="observations"]').click();
    ok('CB2-F moving to another section asks nothing and saves nothing', !MODAL && cur() === 'observations' && pr.title === 'Level 4 Certificate in CB2 Leadership' && obsReq(pr) === true);
    ok('CB2-F Course Details is marked "Unsaved" in the section bar', /Unsaved/.test(q('.cb-sec[data-tab="details"] .cb-badge.warn').textContent));
    q('.cb-sec[data-tab="payments"]').click(); q('.cb-sec[data-tab="details"]').click();
    ok('CB2-F back in Course Details: the typed name and the "No" answer are restored, with "Unsaved changes"', q('#np-t').value === 'Level 4 CB2 kept title' && q('#np-obs-no').checked && !!q('.cb-unsaved'));
    go('a-programmes'); go('a-programmes', { id: pr.id, tab: 'details' }); ok('CB2-F …also after leaving the programme and coming back', q('#np-t').value === 'Level 4 CB2 kept title');
    q('[data-act="cbDetDiscard"]').click(); ok('CB2-F "Discard changes" asks first', !!MODAL && MODAL.title === 'Discard unsaved changes?');
    closeModal(); ok('CB2-F …"Keep them" keeps them', q('#np-t').value === 'Level 4 CB2 kept title');
    q('[data-act="cbDetDiscard"]').click(); prim(); ok('CB2-F …"Discard changes" restores the saved details and the saved answer', q('#np-t').value === pr.title && q('#np-obs-yes').checked && !q('.cb-unsaved') && pr.title === 'Level 4 Certificate in CB2 Leadership');
    openNew(); type('#np-t', 'Unsaved new course'); go('a-programmes'); q('[data-act="chProgNew"]').click();
    ok('CB2-F a new course\'s typed values are kept too ("Your entries are kept"), and still nothing is created', q('#np-t').value === 'Unsaved new course' && !!q('.cb-unsaved') && made().length === 1);
  });

  await T('CB2-G observation applicability: Yes ↔ No and the dependent sections', async () => {
    fresh(); const pr = createL4('yes'), d = () => N5().draft[pr.id];
    go('a-programmes', { id: pr.id, tab: 'obs' }); ACT.n5IaEdit({ dataset: { p: pr.id, c: '' } }); document.querySelector('#n5-t').value = 'CB2 Academy criterion'; [...document.querySelectorAll('#modal-root .n5-ev')].find(x => x.value === 'notes').checked = true; prim(); closeModal();
    ACT.n5Settings({ dataset: { p: pr.id } }); document.querySelector('#modal-root input[name="n5-wp"][value="Permitted"]').checked = true; document.querySelector('#modal-root input[name="n5-off"][value="Available"]').checked = true; prim(); closeModal();
    const ia0 = JSON.stringify(d().ia), wp0 = d().workplace;
    go('a-programmes', { id: pr.id, tab: 'details' }); q('#np-obs-no').click(); q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-G No: N5a "Observation required" becomes No; the Academy criteria and routes already set up are kept', d().required === false && JSON.stringify(d().ia) === ia0 && d().workplace === wp0 && /CB2 Academy criterion/.test(ia0));
    ok('CB2-G …Section 4 is marked "Not applicable" in the section bar', /Not applicable/.test(q('.cb-sec[data-tab="observations"] .cb-badge').textContent) && !q('.cb-sec[data-tab="observations"] .cb-badge.bad'));
    go('a-programmes', { id: pr.id, tab: 'observations' }); ok('CB2-G …the Observations section says it doesn\'t apply and keeps the configuration for history', /Not applicable — this course has no observations/.test(q('.cb-na').textContent) && /CB2 Academy criterion/.test(main()));
    go('a-programmes', { id: pr.id, tab: 'support' }); ok('CB2-G …no observation fee is asked for; the stored rate is kept, not used', !!q('.cb-na-fee') && !q('[data-act="chSupSave"]') && chSupportOf(pr.id) === 'Fully assisted');
    go('a-programmes', { id: pr.id, tab: 'review' }); const rv = qa('.cb-rv-todo li'); /* CB11 (PD-CB-73): was '.ch8-review li' */
    ok('CB2-G …Review lists no observation blocker, and says the kept Academy criterion isn\x27t used (N5a warning)', !rv.some(li => /Blocking/.test(li.textContent) && /observation/i.test(li.textContent)) && rv.some(li => /Warning/.test(li.textContent) && /kept in this version for history but not used/.test(li.textContent)), rv.map(li => li.textContent).join(' | '));
    ACT.n5Settings({ dataset: { p: pr.id } }); ok('CB2-G …the Observations section\'s own settings show the same answer (one field)', document.querySelector('#modal-root input[name="n5-req"][value="no"]').checked); closeModal();
    go('a-programmes', { id: pr.id, tab: 'details' }); q('#np-obs-yes').click(); q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-G back to Yes: required again, criteria still there, "Not applicable" gone', d().required === true && JSON.stringify(d().ia) === ia0 && !/Not applicable/.test((q('.cb-sec[data-tab="observations"]') || {}).textContent));
  });

  // CB8 (PD-CB-52, PD-CB-53) supersedes the E1 proposal form: the creator submits the financial package from Section 5 (cb8Submit, was
  // e1Submit); while Finance reviews, a level change is still refused on the form; after approval a fee change is made in Section 5
  // (the Course Details price is read-only there) and still sends the terms back to Draft.
  await T('CB2-H existing Finance rules are retained', async () => {
    fresh(); const pr = createL4('no', ACA, 'Level 4 CB2 Finance'); go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); press();
    ok('CB2-H the creator\'s terms go to Finance (Pending)', e1T(pr.id).status === 'Pending');
    go('a-programmes', { id: pr.id, tab: 'details' }); type('#np-l', 'Level 5'); type('#np-q-glh', '999'); q('#np-obs-yes').click(); q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-H while Finance reviews, a level change is refused (E1) — and nothing else on the form is saved', pr.level === 'Level 4' && /with Finance for review/.test(main()) && pr.qual.glh === 320 && obsReq(pr) === false);
    FA(); const qi = ADMIN.queue.find(i => i.id === e1T(pr.id).qid); go('a-queue', { id: qi.id }); ACT.e1Decide({ dataset: { id: qi.id, a: 'approve' } }); reason('Approved');
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); const p0 = pr.price;
    ok('CB2-H after approval the Course Details price is read-only (changed in Section 5)', q('#np-p').readOnly && /Change it in Section 5/.test(main()));
    ACT.cb8Opt({ dataset: { p: pr.id, o: cb8Work(pr).opts[0].id } }); document.querySelector('#modal-root #c8-f').value = '2600'; press();
    ok('CB2-H after approval, a changed fee sends the terms back to Draft for approval (E1); the approved price stays in force until approved again', cb8Work(pr).opts[0].fee === 2600 && pr.price === p0 && e1T(pr.id).status === 'Draft');
  });

  await T('CB2-I authorized editors can edit; other roles can\'t (direct calls)', async () => {
    fresh(); const pr = createL4('yes'), snap = () => JSON.stringify({ p: pr, d: N5().draft[pr.id] });
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', LEARNER]].forEach(([who, enter]) => {
      SYS(); go('a-programmes', { id: pr.id, tab: 'details' }); type('#np-t', 'Hijacked'); q('#np-obs-no').click(); enter();
      const s0 = snap(), a0 = ADMIN.audit.length; ACT.cbDetSave({ dataset: { id: pr.id } }); ACT.cbObsSave({ dataset: { id: pr.id } }); const n0 = progs(); ACT.cbDetCreate({ dataset: { tok: 'X' } });
      ok(`CB2-I ${who}: Save details, the observation answer and creating a course are refused and logged; nothing changes`, snap() === s0 && progs() === n0 && blocked(a0, /change the course details/) && blocked(a0, /observation settings/) && blocked(a0, /create programme/), [snap() === s0, progs() === n0, blocked(a0, /change the course details/), blocked(a0, /observation settings/), blocked(a0, /create programme/)].join());
      ACT.chProgNew(); ok(`CB2-I ${who}: "New NVQ programme" is refused and logged (no page opens)`, S.params.id !== 'new' && blocked(a0, /create programme/));
    });
    [['System Admin', SYS], ['Academic Admin', ACA], ['Super Admin', SA]].forEach(([who, enter], k) => {
      enter(); go('a-programmes', { id: pr.id, tab: 'details' }); type('#np-q-credits', String(40 + k)); q('[data-act="cbDetSave"]:not([data-next])').click();
      ok(`CB2-I ${who}: can edit the Draft's details`, pr.qual.credits === 40 + k);
    });
    go('a-programmes', { id: 'NV-N2', tab: 'details' }); ok('CB2-I published new programme (NV-N2): the same layout read-only, with why', !q('#np-t') && !!q('.cb-dl') && /published, so its details are fixed/.test(main()));
    const t0 = s3Pr('NV-N2').title; ACT.cbDetSave({ dataset: { id: 'NV-N2' } }); ok('CB2-I …its details can\'t be saved directly', s3Pr('NV-N2').title === t0);
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('CB2 draft version'); go('a-programmes', { id: 'NV-N2', tab: 'details' });
    ok('CB2-I …with a draft version, its observation answer is editable in Course Details (the version\'s own N5a field)', !!q('.cb-obs-card #np-obs-yes'));
    q('#np-obs-yes').click(); q('[data-act="cbObsSave"]').click(); ok('CB2-I …saved in the draft version only', N5().draft['NV-N2'].required === true && N5().draft['NV-N2'].v === s3Pr('NV-N2').version + 1);
  });

  await T('CB2-J seeded and historical programmes are unaffected', async () => {
    fresh(); SA(); const keep = () => JSON.stringify({ p: ADMIN.programmes.filter(p => !p.chNew), tr: STORE.s3 && STORE.s3.trees, n5: STORE.n5 && STORE.n5.pub, pl: STORE.s4 && STORE.s4.plans, r1: STORE.r1 }); s2Defs(); const k0 = keep();
    // PD-M-10: was /Qualification number \/ reference/ — now /Awarding body course code/ (the same row, relabelled)
    ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5', 'NV-L3D', 'NV-L3O'].forEach(id => { go('a-programmes', { id, tab: 'details' });
      ok(`CB2-J ${id} (${s3Pr(id).status}): the same Course Details layout, read-only (no details form)`, !!q('.cb-dl') && !q('#np-t') && !q('[data-act="cbDetSave"]') && /Course code/.test(main()) && /Awarding body course code/.test(main()) && /Does this course contain observations\?|Observations/.test(main())); });
    go('a-programmes', { id: 'NV-L3O', tab: 'details' }); ok('CB2-J retired: no observation answer to edit, no save buttons', !q('.cb-obs-card') && !q('[data-act="cbObsSave"]') && /read-only historical record/.test(main()));
    const a0 = ADMIN.audit.length; ACT.cbObsSave({ dataset: { id: 'NV-L3O' } }); ACT.cbDetSave({ dataset: { id: 'NV-L3O' } }); ok('CB2-J retired: direct calls refused and logged', blocked(a0));
    go('a-programmes', { id: 'NV-L3', tab: 'details' }); ok('CB2-J published seeded programme without a draft version: no observation answer to edit', !q('.cb-obs-card'));
    ok('CB2-J viewing and refused attempts changed no seeded programme, structure, published observation configuration, plan or fee option', keep() === k0);
    go('a-programmes', { id: 'NV-L3D', tab: 'details' }); ok('CB2-J seeded Draft (NV-L3D): its observation answer can be recorded here (N5a draft field)', !!q('.cb-obs-card #np-obs-no'));
  });

  await T('CB2-K Level 3 on the page: fee options and level switching', async () => {
    fresh(); openNew(); ok('CB2-K Level 3 (default): fee-option rows instead of the single price', !!q('.r1-np-row') && q('.r1-np-price').hidden);
    type('#np-l', 'Level 4'); INP.r1NpLevel(q('#np-l')); ok('CB2-K switching to Level 4 shows the single price and the default delivery mode', !q('.r1-np-price').hidden && q('.r1-np-l3').hidden && !q('.r1-np-sup').hidden);
    type('#np-l', 'Level 3'); INP.r1NpLevel(q('#np-l')); type('#np-t', 'Level 3 CB2 Options'); type('#np-code', 'L3-CB2-OPT'); type('#np-r', 'QN 603/8383/3');
    const row = (k, l, f, m) => { const r = qa('.r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; r.querySelector('.r1-np-l').dispatchEvent(new Event('input', { bubbles: true })); };
    row(0, 'Self-Paced', '1800', 'Self-Paced'); q('[data-act="r1NpAdd"]').click(); row(1, 'Fully Assisted', '2400', 'Fully Assisted');
    q('.cb-sec[data-tab="details"]').click(); go('a-programmes'); q('[data-act="chProgNew"]').click();
    ok('CB2-K the typed fee-option rows are kept with the unsaved course', qa('.r1-np-row').length === 2 && qa('.r1-np-row')[1].querySelector('.r1-np-l').value === 'Fully Assisted');
    q('#np-obs-yes').click(); q('[data-act="cbDetCreate"]').click(); const pr = made().slice(-1)[0];
    ok('CB2-K created with both fee options (R1), Observation required Yes', !!pr && r1Opts(pr.id).map(o => o.label + ':' + o.fee).join() === 'Self-Paced:1800,Fully Assisted:2400' && obsReq(pr) === true);
  });

  await T('CB2-L course code and qualification number are separate fields', async () => {
    fresh(); const worlds0 = JSON.stringify(STORE.worlds), refs0 = JSON.stringify(ADMIN.programmes.map(p => [p.id, p.ref, p.code]));
    const pr = createL4('no', SA); const id = pr.id;
    ok('CB2-L they can differ, and each is saved as entered (code upper-case; the reference as typed); neither is copied into the other', pr.code === 'L4-CB2' && pr.ref === 'QN 610/8282/4' && pr.code !== pr.ref && ADMIN.audit.some(a => a.action === 'Course code set' && a.after === 'L4-CB2'));
    ok('CB2-L the header shows the course code and the qualification reference separately', /Course code L4-CB2/.test(q('.page-h').textContent) && /QN 610\/8282\/4/.test(q('.page-h').textContent));
    go('a-programmes', { id, tab: 'details' }); ok('CB2-L the draft form shows both, each in its own field', q('#np-code').value === 'L4-CB2' && q('#np-r').value === 'QN 610/8282/4');
    type('#np-code', 'l4-cb2-r'); type('#np-r', 'QN 610/8282/5'); q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-L both stay editable in the draft and are saved independently; the code change is audited before → after', pr.code === 'L4-CB2-R' && pr.ref === 'QN 610/8282/5' && ADMIN.audit.some(a => a.action === 'Course code changed' && a.before === 'L4-CB2' && a.after === 'L4-CB2-R'));
    go('a-programmes', { id, tab: 'details' }); type('#np-code', ''); q('[data-act="cbDetSave"]:not([data-next])').click();
    ok('CB2-L (negative) a programme that has a code can\'t have it removed', /Enter a course code/.test(main()) && pr.code === 'L4-CB2-R');
    const bad = [['9ABC', 'starting with a letter'], ['A', '2–20'], ['AB CD', 'letters, digits or hyphens'], ['A'.repeat(21), '2–20']];
    bad.forEach(([v, msg]) => { go('a-programmes', { id, tab: 'details' }); q('#np-code').removeAttribute('maxlength'); type('#np-code', v); q('[data-act="cbDetSave"]:not([data-next])').click(); ok(`CB2-L (negative) course code "${v.length > 12 ? v.slice(0, 12) + '…' : v}" refused`, /letters, digits or hyphens, starting with a letter/.test(main()) && pr.code === 'L4-CB2-R', msg); });
    openNew(SA); q('[data-act="cbDetDiscard"]') && (q('[data-act="cbDetDiscard"]').click(), prim()); fillL4('Level 4 CB2 Second', 'l4-CB2-r'); q('#np-obs-no').click(); const n0 = progs(); q('[data-act="cbDetCreate"]').click();
    ok('CB2-L (negative) a course code already used (any letter case) is refused, naming the programme; nothing created', /already used by Level 4 Certificate in CB2 Leadership/.test(main()) && progs() === n0);
    type('#np-code', ''); q('[data-act="cbDetCreate"]').click(); ok('CB2-L (negative) a new course needs a course code; nothing created', /Enter a course code/.test(main()) && progs() === n0);
    type('#np-code', 'L4-CB2-2'); q('[data-act="cbDetCreate"]').click(); ok('CB2-L a different code is accepted', progs() === n0 + 1 && made().slice(-1)[0].code === 'L4-CB2-2');
    // the published view: publish the first programme (Super Admin's terms are approved at once)
    const a8 = (act, ds, o) => { ACT[act]({ dataset: ds }); Object.entries(o).forEach(([k, v]) => { document.querySelector(k).value = v; }); prim(); closeModal(); };
    go('a-programmes', { id, tab: 'structure' }); a8('ch8AddUnit', { id }, { '#u-c': 'U480', '#u-t': 'Practice' }); a8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/4801' }); a8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); a8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version'); ACT.ch8Publish({ dataset: { id } }); reason('Ready');
    // PD-M-10: was /Qualification number \/ reference\s*QN 610\/8282\/5/ — now /Awarding body course code\s*QN 610\/8282\/5/
    go('a-programmes', { id, tab: 'details' }); ok('CB2-L published: both shown read-only, each in its own row', pr.status === 'Active' && !q('#np-code') && /Course code\s*L4-CB2-R/.test(q('.cb-dl').textContent) && /Awarding body course code\s*QN 610\/8282\/5/.test(q('.cb-dl').textContent));
    const c0 = pr.code; ACT.cbDetSave({ dataset: { id } }); ok('CB2-L published: the code can\'t be changed', pr.code === c0);
    go('a-programmes', { id: 'NV-L3', tab: 'details' }); ok('CB2-L legacy programme without a course code: "Not recorded" (none made up); its reference shown unchanged', /Course code\s*Not recorded/.test(q('.cb-dl').textContent) && /QN 603\/2851\/9/.test(q('.cb-dl').textContent) && s3Pr('NV-L3').code === undefined && !/Course code/.test(q('.page-h').textContent));
    SYS(); go('a-programmes', { id: 'NV-N1', tab: 'details' }); ok('CB2-L legacy Draft without a code: the code field is empty (not derived from its reference) and says so', q('#np-code').value === '' && /has none yet/.test(main()) && q('#np-r').value === s3Pr('NV-N1').ref);
    type('#np-ds', 'Edited without a code.'); q('#np-obs-no').click(); /* its observation answer was never recorded; saving needs one */ q('[data-act="cbDetSave"]:not([data-next])').click(); ok('CB2-L …it can still be saved without one (its code stays absent)', s3Pr('NV-N1').desc === 'Edited without a code.' && s3Pr('NV-N1').code === undefined);
    type('#np-code', 'L4-DEMENTIA'); q('[data-act="cbDetSave"]:not([data-next])').click(); ok('CB2-L …and given one later', s3Pr('NV-N1').code === 'L4-DEMENTIA');
    ok('CB2-L every other programme\'s reference and (absent) code unchanged; learner records unchanged', JSON.stringify(ADMIN.programmes.filter(p => !['NV-N1'].includes(p.id) && !made().includes(p)).map(p => [p.id, p.ref, p.code])) === JSON.stringify(JSON.parse(refs0).filter(([pid]) => pid !== 'NV-N1')) && JSON.stringify(STORE.worlds) === worlds0);
    FA(); const a0 = ADMIN.audit.length; SYS(); go('a-programmes', { id: 'NV-N1', tab: 'details' }); type('#np-code', 'HIJACK'); FA(); ACT.cbDetSave({ dataset: { id: 'NV-N1' } });
    ok('CB2-L (negative) Finance changing a course code directly: refused and logged, unchanged', s3Pr('NV-N1').code === 'L4-DEMENTIA' && blocked(a0, /change the course details/));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
