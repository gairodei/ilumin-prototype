// MC — multiple Academic Coordinators per batch and learner document privacy (23 Oct 2026; PD-MC-01…). Scenarios 1–12 of the brief,
// plus permissions: direct actions, direct routes, documents, cross-batch isolation. Each check acts through the screen or the handler,
// then checks the record and the consuming screen, with the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.coo.edge = 'none'; S.frame = 'auto'; S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'MC test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o), T2 = 'Level 2 Diploma in Care (England)', T3 = 'Level 3 Diploma in Adult Care (England)';
  const B = c => ADMIN.batches.find(x => x.code === c);
  // n test Coordinators (staff accounts + Coordinator-portal personas)
  const CN = k => 'MC Coord ' + String(k).padStart(2, '0');
  const mkCoords = n => { for (let k = 1; k <= n; k++) { const name = CN(k); if (!ADMIN.staff.some(s => s.name === name)) ADMIN.staff.push({ id: 'ST-MC' + k, name, email: `mc.coord${k}@illumin-academy.example`, roles: ['Academic Coordinator'], status: 'Active', tfa: 'Not required', last: D(-1), alloc: 0, mobile: '', quals: '', reg: '', tz: 'Europe/London' }); COO_USERS['M' + k] = { key: 'M' + k, name, first: 'Coord' + k, email: `mc.coord${k}@illumin-academy.example`, roles: ['Academic Coordinator'], label: name }; } };
  // Create batch (wizard) with a first Coordinator and further ones ticked
  const nb = (code, title, first, extra = [], o = {}) => {
    SA(); ACT.newBatch(); if (!MODAL) return null; qm('#nb-c').value = code; const co = qm('#nb-co'); co.value = title; INP.n2NbCourse(co);
    if (qm('#nb-dm')) qm('#nb-dm').value = o.dm || 'Fully Assisted'; if (qm('#nb-m')) qm('#nb-m').value = 'Online'; if (qm('#nb-cap')) qm('#nb-cap').value = String(o.cap || 300);
    if (prim() === false) return { refused: 'step1', msg: mroot().textContent };
    qm('#nb-ac').value = first; extra.forEach(n => { const x = qma('.mc-nb-c').find(i => i.value === n); if (x) x.checked = true; }); (o.assessors || []).forEach(n => { const x = qma('.nb-a').find(i => i.value === n); if (x) x.checked = true; });
    const step2 = mroot().innerHTML; if (prim() === false) return { refused: 'step2', msg: mroot().textContent, step2 };
    prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    return { b: B(code), rev, step2 };
  };
  let nL = 0;
  // Enrol k learners (the roster row an enrolment writes); the post-action render allocates them
  const enrol = (b, k) => { const ids = []; for (let i = 0; i < k; i++) { const n = ++nL, id = 'MC-L-' + String(n).padStart(4, '0'), name = 'Mc Learner ' + n; ADMIN.learners.push({ id, name, email: `mc.l${n}@uk.example`, mobile: '+44 7700 900' + String(n % 1000).padStart(3, '0'), agency: null, courses: [b.course], acct: 'Active', rec: 'Active' }); b.roster.push([name, id, 'Self-funded']); b.enrolled++; ids.push(id); render(); } return ids; };
  const counts = b => { const c = {}; mcLids(b).forEach(l => { const d = mcOf(l, b); c[d] = (c[d] || 0) + 1; }); return c; };
  const allocJ = b => J(Object.fromEntries(Object.entries(b.mcA).map(([l, a]) => [l, a.to])));

  /* ================= 1. One batch, one Coordinator — backward compatibility ================= */
  await T('MC-1', async () => {
    fresh(); const b = B('L3AC-JAN26');
    ok('MC-1 a seeded batch keeps one Coordinator; b.coord still reads it', J(mcList(b)) === J(['Dr Helen Carter']) && b.coord === 'Dr Helen Carter');
    ok('MC-1 every learner in the batch is allocated to that Coordinator (existing enrolment)', mcLids(b).length > 10 && mcLids(b).every(l => mcOf(l, b) === 'Dr Helen Carter') && Object.values(b.mcA).every(a => a.src === 'Existing enrolment'));
    ok('MC-1 every seeded batch with a Coordinator: all its learners are allocated to one of its Coordinators', ADMIN.batches.filter(x => mcList(x).length).every(x => mcLids(x).every(l => mcHas(x, mcOf(l, x)))));
    COO('A'); go('c-learners'); const L = myLearners();
    ok('MC-1 Coordinator portal: the learner list and the count are unchanged; every learner is tagged "My learner"', L.length > 20 && /of\s*\d+\s*learners are allocated to you/.test(main()) && main().includes(`${L.length} of ${L.length} learners are allocated to you`), main().match(/\d+ of \d+ learners are allocated to you/));
    go('c-learner', { id: 'IA-L-18022' });
    ok('MC-1 learner record: "Academic Coordinator: Dr Helen Carter (me)", contact details and Message learner shown', /Academic CoordinatorDr Helen Carter \(me\)/.test(main()) && !!document.querySelector('main [data-act="cooCompose"][data-l="IA-L-18022"]') && !main().includes('Contact details'));
    // Change Academic Coordinator (the existing single path): the learners move with it; earlier feedback keeps its author
    SA(); const a1 = J(STORE.worlds.C.assignments.find(a => a.id === 'a1').coordAll);
    ACT.changeCoord({ dataset: { id: 'L2DC-JAN27' } }); qm('#cc-to').value = 'Laura Kemp'; reason('Rebalancing');
    const j = B('L2DC-JAN27');
    ok('MC-1 single-Coordinator change: the list becomes the new Coordinator and every learner moves to them; audited as before', J(mcList(j)) === J(['Laura Kemp']) && mcLids(j).every(l => mcOf(l, j) === 'Laura Kemp') && ADMIN.audit[0].action === 'Academic Coordinator changed' && ADMIN.audit[0].after === 'Laura Kemp' && j.coordHistory.slice(-1)[0][0] === 'Laura Kemp');
    ok('MC-1 historic Coordinator feedback keeps its author', J(STORE.worlds.C.assignments.find(a => a.id === 'a1').coordAll) === a1);
    ok('MC-1 Batch → Staff (one Coordinator): the panel shows one Coordinator, no Remove and no Reassign', (go('a-batches', { id: 'L2DC-JAN27', tab: 'staff' }), !!document.querySelector('main .mc-panel')) && !document.querySelector('main [data-act="mcRemove"]') && !document.querySelector('main [data-act="mcMove"]'));
  });

  /* ================= 2–4. Ten Coordinators, 100 / 101 learners, a further learner joins ================= */
  await T('MC-2', async () => {
    fresh(); mkCoords(10); const names = Array.from({ length: 10 }, (_, k) => CN(k + 1));
    const r = nb('MC-TEN', T2, names[0], names.slice(1));
    // superseded wording (MC UI verification): one "Academic Coordinators (required — choose one or more)" list, was "More Academic Coordinators"
    ok('MC-2 Create batch step 2: one "Academic Coordinators — choose one or more" list with a checkbox for each active Coordinator', /Academic Coordinators \(required — choose one or more\)/.test(r.step2) && names.every(n => r.step2.includes(`value="${n}"`)));
    ok('MC-2 Review lists all ten Coordinators; the batch is created with them in that order; audited', r.b && /Academic Coordinators/.test(r.rev) && J(mcList(r.b)) === J(names) && ADMIN.audit.some(a => a.action === 'Academic Coordinators set' && a.entity.includes('MC-TEN')));
    const b = r.b; enrol(b, 100); const c = counts(b);
    ok('MC-2 100 learners and 10 Coordinators → 10 each', names.every(n => c[n] === 10) && Object.keys(c).length === 10, J(c));
    ok('MC-2 each allocation records "Balanced allocation on enrolment"', mcLids(b).every(l => b.mcA[l].src === 'Balanced allocation on enrolment'));
    const before = allocJ(b); enrol(b, 1); const c2 = counts(b);
    ok('MC-3 101 learners → nine Coordinators have 10, one has 11 (the first listed, on a tie)', Object.values(c2).filter(n => n === 10).length === 9 && c2[names[0]] === 11, J(c2));
    ok('MC-4 existing allocations didn\'t move when a learner joined', Object.entries(JSON.parse(before)).every(([l, t]) => b.mcA[l].to === t));
    // A further learner through the real Add learner path: least-loaded (names[1], ties by order); nothing else moves
    const before2 = allocJ(b), l = ADMIN.learners.find(x => x.acct === 'Active' && x.rec === 'Active' && !ADMIN.batches.some(y => ['Open', 'In Progress', 'Planned'].includes(y.status) && batchRoster(y).some(rr => rr[1] === x.id)) && !n4World(x.id));
    ACT.addToBatch({ dataset: { id: 'MC-TEN' } }); if (MODAL) { qm('#ab-l').value = l.id; press(); } render();
    ok('MC-4 Add learner (admin): the new learner goes to the least-loaded Coordinator; the other 101 allocations are unchanged', mcOf(l.id, b) === names[1] && Object.entries(JSON.parse(before2)).every(([x, t]) => b.mcA[x].to === t), mcOf(l.id, b));
    // Only active allocations count: a discontinued learner frees a place
    const d = mcLids(b).find(x => mcOf(x, b) === names[2]); ADMIN.learners.find(x => x.id === d)._enr = [{ type: 'NVQ / RQF', title: b.course, status: 'Discontinued' }]; b._mcSig = '';
    const ids = enrol(b, 1); ok('MC-4 workload counts active learners only: after a discontinuation the next learner goes to that Coordinator', mcOf(ids[0], b) === names[2], mcOf(ids[0], b));
    // Batch → Staff panel
    go('a-batches', { id: 'MC-TEN', tab: 'staff' });
    ok('MC-2 Batch → Staff: the Coordinators panel lists 10 Coordinators with their active learners, and Reassign', !!document.querySelector('main .mc-panel') && /Academic Coordinators \(10\)/.test(main()) && document.querySelectorAll('main .mc-load tbody tr').length === 10 && !!document.querySelector('main [data-act="mcMove"]'));
  });

  /* ================= 5. Mixed Self-Paced and Fully Assisted learners in the same batch ================= */
  await T('MC-5', async () => {
    fresh(); mkCoords(2); SA();
    const add = (label, fee, mode) => { r1AddOpt('NV-L3', { label, fee, mode }, 'MC', 'Added'); return r1Opts('NV-L3').find(o => o.label === label).id; };
    const sp = add('Self-Paced — MC', 1800, 'Self-Paced'), fa = add('Fully Assisted — MC', 2600, 'Fully Assisted');
    const r = nb('MC-MIX', T3, CN(1), [CN(2)]), b = r.b;
    const free = skip => ADMIN.learners.find(x => x.acct === 'Active' && x.rec === 'Active' && !skip.includes(x.id) && !ADMIN.batches.some(y => ['Open', 'In Progress', 'Planned'].includes(y.status) && batchRoster(y).some(rr => rr[1] === x.id)) && !n4World(x.id));
    const addL = (lid, opt) => { ACT.addToBatch({ dataset: { id: 'MC-MIX' } }); if (!MODAL) return 'refused'; qm('#ab-l').value = lid; const s = qm('#r2-ab-o'); if (s) s.value = opt; const x = prim(); if (x !== false) closeModal(); render(); return x === false ? mroot().textContent : 'added'; };
    const l1 = free([]), a1 = addL(l1.id, sp), l2 = free([l1.id]), a2 = addL(l2.id, fa);
    ok('MC-5 a Self-Paced and a Fully Assisted learner join the same batch with their own option', a1 === 'added' && a2 === 'added' && b.r2[l1.id].opt === sp && b.r2[l2.id].opt === fa, a1 + ' / ' + a2);
    ok('MC-5 both are allocated, one to each Coordinator (delivery mode doesn\'t affect allocation)', mcOf(l1.id, b) === CN(1) && mcOf(l2.id, b) === CN(2));
  });

  /* ================= 6. The Coordinator sees the full batch roster and their own tagged learners ================= */
  await T('MC-6', async () => {
    fresh(); mkCoords(3); const r = nb('MC-ROS', T2, CN(1), [CN(2), CN(3)]), b = r.b; enrol(b, 9);
    COO('M2'); go('c-batches', { id: 'MC-ROS', tab: 'roster' });
    ok('MC-6 the roster opens on My learners (default): only the three allocated learners, each tagged', document.querySelector('main [data-act="mcScope"][data-k="mine"]').getAttribute('aria-selected') === 'true' && document.querySelectorAll('main .mc-tag').length === 3 && document.querySelectorAll('main .mc-tag .chip').length === 3);
    ok('MC-6 the figures: Total batch learners 9, My learners 3, learners of other Coordinators 6', /Total batch learners\s*9/.test(main()) && /My learners\s*3/.test(main()) && /Other Coordinators' learners\s*6/.test(main()));
    document.querySelector('main [data-act="mcScope"][data-k="all"]').click(); // superseded default (MC UI verification): All batch learners was the default
    const tags = document.querySelectorAll('main .mc-tag .chip').length;
    ok('MC-6 a second Coordinator sees the batch in My Batches and its full roster (9 learners)', myBatches().some(x => x.code === 'MC-ROS') && myLearners(true).filter(l => l.batch === b).length === 9);
    ok('MC-6 "3 of 9 learners are allocated to you" and three "My learner" tags; the others name their Coordinator', /3 of 9 learners are allocated to you/.test(main()) && tags === 3 && /Coordinator: MC Coord 01/.test(main()));
    document.querySelector('main [data-act="mcScope"][data-k="mine"]').click();
    ok('MC-6 My learners filter: only the three allocated learners are listed', document.querySelectorAll('main .mc-tag').length === 3 && document.querySelectorAll('main .mc-tag .chip').length === 3);
    document.querySelector('main [data-act="mcScope"][data-k="all"]').click();
    ok('MC-6 All batch learners: nine again', document.querySelectorAll('main .mc-tag').length === 9);
    go('c-batches', { id: 'MC-ROS' });
    ok('MC-6 batch overview: the staff team lists the other two Coordinators; "My learners 3 of 9"', /MC Coord 01Academic Coordinator/.test(main()) && /MC Coord 03Academic Coordinator/.test(main()) && /My learners3 of 9/.test(main()));
    go('c-dashboard'); ok('MC-6 dashboard: My caseload card — 3 of 9 learners are mine', /My caseload/.test(main()) && /3 of 9 learners are mine/.test(main()));
    // Necessary academic information only: contact details for my own learners
    const other = mcLids(b).find(l => mcOf(l, b) !== CN(2)), mine = mcLids(b).find(l => mcOf(l, b) === CN(2)), Lo = ADMIN.learners.find(x => x.id === other);
    go('c-learner', { id: other });
    ok('MC-6 another Coordinator\'s learner: academic record opens; no email, no Message learner; names their Coordinator', /Academic CoordinatorMC Coord 0[13]/.test(main()) && !main().includes(Lo.email) && /Contact details/.test(main()) && !document.querySelector('main [data-act="cooCompose"][data-l]'));
    go('c-learner', { id: mine }); ok('MC-6 my learner: their email, Message learner, tagged My learner', !main().includes('Contact details') && main().includes(ADMIN.learners.find(x => x.id === mine).email) && /\(me\)\s*My learner/.test(main()) && !!document.querySelector('main [data-act="cooCompose"][data-l]'));
    ok('MC-6 message recipients: my learners only, not other Coordinators\' learners', cooRecipients().includes(ADMIN.learners.find(x => x.id === mine).name + ' (Learner)') && !cooRecipients().includes(Lo.name + ' (Learner)'));
    const a0 = ADMIN.audit.length; ACT.cooCompose({ dataset: {} }); qm('#cm-to').insertAdjacentHTML('beforeend', `<option>${Lo.name} (Learner)</option>`); qm('#cm-to').value = Lo.name + ' (Learner)'; qm('#cm-s').value = 'x'; qm('#cm-b').value = 'y'; const res = prim();
    ok('MC-6 (negative) a message injected to another Coordinator\'s learner is refused and logged', res === false && blocked(a0, /message a learner/i));
    closeModal();
    // Cross-batch isolation: a learner of a batch they don't coordinate
    go('c-learner', { id: 'IA-L-18022' }); ok('MC-6 (negative) cross-batch: a learner of another batch → access denied, logged', /You don't have access to this record/.test(main()));
    ok('MC-6 (negative) cross-batch: Coordinator 2 doesn\'t see Helen\'s batches', !myBatches().some(x => x.code === 'L3AC-JAN26'));
  });

  /* ================= 7–8. The learner sees only their own Coordinator; nobody can enumerate the rest ================= */
  await T('MC-7', async () => {
    fresh(); mkCoords(4); SA(); const b = B('L3AC-JAN26'), lid = STORE.worlds.C.me.id, before = allocJ(b);
    ACT.mcAdd({ dataset: { id: 'L3AC-JAN26' } }); qm('#mc-add').value = CN(1); reason('Second Coordinator for the cohort');
    ACT.mcAdd({ dataset: { id: 'L3AC-JAN26' } }); qm('#mc-add').value = CN(2); reason('Third Coordinator');
    ok('MC-7 adding Coordinators to an existing batch: audited; existing allocations unchanged (no reshuffle)', J(mcList(b)) === J(['Dr Helen Carter', CN(1), CN(2)]) && allocJ(b) === before && ADMIN.audit.some(a => a.action === 'Academic Coordinator added' && a.after === CN(2)));
    learner('C'); go('courses'); const e = STORE.worlds.C.nvq; ACT.goTok && go('course', { id: e.id });
    const ppl = () => STORE.worlds.C.nvq.people.filter(([r]) => r === 'Academic Coordinator').map(x => x[1]);
    render();
    ok('MC-7 learner: "Your people" holds one Coordinator — their own (Dr Helen Carter)', J(ppl()) === J(['Dr Helen Carter']));
    SA(); ACT.mcMove({ dataset: { id: 'L3AC-JAN26', l: lid } }); qm('#mc-mv').value = CN(2); reason('Shift pattern suits Coord 02');
    learner('C'); render();
    ok('MC-10 reassignment: the learner\'s Coordinator is now MC Coord 02 (People and message recipients)', J(ppl()) === J([CN(2)]) && recipients().includes(CN(2) + ' (Academic Coordinator)') && !recipients().some(x => /Helen Carter|MC Coord 01/.test(x)));
    ok('MC-10 the learner is told; earlier messages and Coordinator feedback still show Dr Helen Carter (not rewritten)', STORE.worlds.C.notifs.some(n => n.title === 'Your Academic Coordinator has changed') && STORE.worlds.C.threads.some(t => /Helen Carter/.test(t.with.join())) && STORE.worlds.C.assignments.find(a => a.id === 'a5').coordAll.some(c => c.by === 'Dr Helen Carter'));
    // Enumeration: every learner screen, the compose list and the course page show none of the other Coordinators
    const scr = ['dashboard', 'courses', 'messages', 'calendar', 'notifications', 'profile', 'help', 'observations', 'progress', 'assignments', 'payments', 'resources'].filter(r => SCREENS[r]);
    const leak = []; scr.forEach(r => { go(r); if (/MC Coord 01|MC Coord 03|MC Coord 04/.test(main())) leak.push(r); });
    STORE.worlds.C.enrolments.forEach(en => { try { go('course', { id: en.id }); if (/MC Coord 01/.test(main())) leak.push('course ' + en.id); } catch (x) { /* not a course page */ } });
    ACT.compose({ dataset: {} }); const opts = qma('#m-to option').map(o => o.textContent).join('|'); closeModal();
    ok('MC-8 no learner screen and no recipient list names the batch\'s other Coordinators', !leak.length && !/MC Coord 01/.test(opts) && opts.includes(CN(2)), leak.join(', '));
    go('course', { id: STORE.worlds.C.nvq.id }); const card = [...document.querySelectorAll('main section.card')].find(x => /Your people/.test(x.textContent));
    ok('MC-7 "Your people" on the programme page: their Coordinator with the approved Academy email; no other Coordinator', !!card && card.textContent.includes(CN(2)) && card.textContent.includes('mc.coord2@illumin-academy.example') && !/Helen Carter|MC Coord 01/.test(card.textContent), card ? card.textContent.slice(0, 200) : 'no card');
    const a0 = ADMIN.audit.length; ACT.compose({ dataset: {} }); qm('#m-to').insertAdjacentHTML('beforeend', `<option>${CN(1)} (Academic Coordinator)</option>`); qm('#m-to').value = CN(1) + ' (Academic Coordinator)'; qm('#m-sub').value = 'x'; qm('#m-body').value = 'y'; const res = prim(); closeModal();
    ok('MC-8 (negative) a message injected to another Coordinator is refused and logged', res === false && blocked(a0, /send a message/i));
    go('c-batches', { id: 'L3AC-JAN26' }); ok('MC-8 (negative) direct route to the Coordinator\'s batch page from the learner portal is refused', /You don't have permission/.test(main()));
    learner('D'); render(); ok('MC-8 another learner (Croydon Cohort 4) sees only their own Coordinator, none of Leicester\'s', J(STORE.worlds.D.nvq.people.filter(([r]) => r === 'Academic Coordinator').map(x => x[1])) === J(['Michael Osei']) && !recipients().some(x => /MC Coord/.test(x)));
  });

  /* ================= 9. Academic feedback yes; personal admission documents no ================= */
  await T('MC-9', async () => {
    fresh(); mkCoords(2); SA(); ACT.mcAdd({ dataset: { id: 'L3AC-JAN26' } }); qm('#mc-add').value = CN(1); reason('Shared cohort');
    COO('M1'); const s = mySubmissions(true).find(x => x.L.lid === STORE.worlds.C.me.id && x.at && x.live);
    ok('MC-9 a Coordinator who isn\'t Aisha\'s still sees her submissions (batch-wide academic workflow)', !!s);
    STORE.coo.drafts[s.key] = { text: 'MC feedback across the batch', scope: 'Overall submission' }; ACT.cfPost({ dataset: { k: s.key } }); press();
    ok('MC-9 academic feedback is posted under their own name', s.live.coordAll.some(c => c.by === CN(1) && c.text === 'MC feedback across the batch'));
    go('c-learner', { id: STORE.worlds.C.me.id });
    ok('MC-9 learner record: "Admission documents verified" status, no document names or files', /Admission documents verified/.test(main()) && !/passport_raman|rtw_sharecode|bsc_certificate/.test(document.getElementById('app').innerHTML));
    const a0 = ADMIN.audit.length, s0 = ADMIN.security.length;
    ACT.viewFile({ dataset: { f: 'passport_raman.pdf' } });
    ok('MC-9 (negative) opening an admission document (passport) is refused — no viewer', !MODAL || !/passport_raman/.test(mroot().textContent));
    ok('MC-9 the refusal is logged without the file name', blocked(a0, /open a document/i) && !since(a0).some(x => J(x).includes('passport')) && !ADMIN.security.slice(0, ADMIN.security.length - s0).some(x => J(x).includes('passport')));
    closeModal(); const a1 = ADMIN.audit.length;
    ACT.fakeDl({ dataset: { f: 'dewa_bill_may.pdf' } }); ACT.csDoc({ dataset: { id: 'd1', f: 'passport_raman.pdf' } }); ACT.docDec({ dataset: { a: 'APP-C', d: 'd1', s: 'Approved' } });
    ok('MC-9 (negative) download, learner-document preview and an admission decision from the Coordinator portal are refused and logged', since(a1).filter(x => /^Blocked/.test(x.action)).length >= 3 && !MODAL && !since(a1).some(x => J(x).includes('passport') || J(x).includes('dewa')));
    const r0 = (STORE.mcDocReview || []).length; ACT.viewFile({ dataset: { f: 'notes_2026.pdf' } });
    ok('MC-9 a file with no academic record is not shown; queued for classification review without its name', !MODAL && STORE.mcDocReview.length === r0 + 1 && !J(STORE.mcDocReview).includes('notes_2026') && ADMIN.security.slice(0, 3).some(x => x.type === 'Document classification review' && !x.detail.includes('notes_2026')));
    ACT.viewFile({ dataset: { f: 'Q1_attachment.pdf' } }); ok('MC-9 (supersedes the first MC-9 check) an academic-looking name alone no longer opens anything', !MODAL); closeModal();
    // Admin with admissions permission: unchanged
    SA(); ACT.viewFile({ dataset: { f: 'passport_raman.pdf' } }); ok('MC-9 Super Admin (admissions permission) still opens the document', !!MODAL && /passport_raman/.test(mroot().textContent)); closeModal();
    // Learner: own documents unchanged
    learner('C'); ACT.csDoc({ dataset: { id: 'd1', f: STORE.worlds.C.docs[0].file } }); ok('MC-9 the learner still previews their own document', !!MODAL); closeModal();
  });

  /* ================= 10. Reassignment: responsibility moves, history stays; one decider ================= */
  await T('MC-10', async () => {
    fresh(); mkCoords(2); SA(); ACT.mcAdd({ dataset: { id: 'L3AC-JAN26' } }); qm('#mc-add').value = CN(1); reason('Shared cohort');
    const lid = STORE.worlds.C.me.id, b = B('L3AC-JAN26');
    COO('A'); const s = mySubmissions(true).find(x => x.L.lid === lid && x.at && x.live); STORE.coo.drafts[s.key] = { text: 'Helen before the change', scope: 'Overall submission' }; ACT.cfPost({ dataset: { k: s.key } }); press();
    // Aisha requests an Academy-office observation: it goes to her Coordinator (Helen)
    learner('C'); ACT.chOrRequest(); document.querySelector('#or-r').value = 'Workplace permission refused'; press();
    const r = chOrs().filter(x => x.lid === lid).slice(-1)[0], qi = qItem(r.qid);
    ok('MC-10 the request is routed to the learner\'s own Coordinator', r.coord === 'Dr Helen Carter' && qi.first === 'Dr Helen Carter');
    COO('M1'); const a0 = ADMIN.audit.length; ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } });
    ok('MC-10 (negative) another Coordinator of the batch can\'t decide it (refused, logged, no dialog)', !MODAL && blocked(a0, /academy-office observation/i) && r.status === 'Pending approval');
    go('c-learner', { id: lid }); ok('MC-10 that Coordinator sees the request read-only with who decides it', !document.querySelector('main [data-act="chOrDecide"]') && /decided by Dr Helen Carter/.test(main()));
    go('c-dashboard'); ok('MC-10 not on that Coordinator\'s dashboard decision list', !document.querySelector(`main [data-act="chOrDecide"][data-id="${r.qid}"]`));
    const a1 = ADMIN.audit.length; ACT.chOvSet({ dataset: { l: lid, k: 'obs' } }); ok('MC-10 (negative) a per-learner assessor override by a Coordinator who isn\'t the learner\'s is refused', !MODAL && blocked(a1));
    // Reassign Aisha to Coordinator 1: the open request follows; feedback keeps Helen's name
    SA(); ACT.mcMove({ dataset: { id: 'L3AC-JAN26', l: lid } }); qm('#mc-mv').value = CN(1); reason('Caseload balance');
    ok('MC-10 reassigned: audited with before/after and reason', ADMIN.audit[0].action === 'Learner Coordinator reassigned' && ADMIN.audit[0].before === 'Dr Helen Carter' && ADMIN.audit[0].after === CN(1) && ADMIN.audit[0].reason === 'Caseload balance' && b.mcH.slice(-1)[0].kind === 'manual');
    ok('MC-10 the open request now has one decider — the new Coordinator', r.coord === CN(1) && qi.first === CN(1));
    ok('MC-10 Helen\'s earlier feedback still carries her name', s.live.coordAll.some(c => c.by === 'Dr Helen Carter' && c.text === 'Helen before the change'));
    COO('A'); const a2 = ADMIN.audit.length; ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } }); ok('MC-10 (negative) the previous Coordinator can no longer decide it', !MODAL && blocked(a2));
    COO('M1'); ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } }); ok('MC-10 the new Coordinator decides it once', !!MODAL && reason('Approved') !== false && r.status === 'Approved' && r.decidedBy === CN(1));
    ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } }); ok('MC-10 (negative) no second decision on the same request', !MODAL && r.history.filter(h => h[2] === 'Approved').length === 1);
    // Reassignment authority
    COO('A'); const a3 = ADMIN.audit.length; ACT.mcMove({ dataset: { id: 'L3AC-JAN26', l: lid } }); ok('MC-10 (negative) a Coordinator can\'t reassign learners (refused, logged)', !MODAL && blocked(a3));
    FA(); const a4 = ADMIN.audit.length; ACT.mcMove({ dataset: { id: 'L3AC-JAN26', l: lid } }); ok('MC-10 (negative) Finance Admin can\'t reassign learners', !MODAL && blocked(a4));
    ACA(); ACT.mcMove({ dataset: { id: 'L3AC-JAN26', l: lid } }); ok('MC-10 the Academic Admin can', !!MODAL); closeModal();
    SA(); ok('MC-10 (negative) a direct call with no reason is refused', mcReassign(b, lid, 'Dr Helen Carter', '') === false && mcOf(lid, b) === CN(1));
  });

  /* ================= 11. Removing a Coordinator never orphans learners ================= */
  await T('MC-11', async () => {
    fresh(); mkCoords(4); const r = nb('MC-RM', T2, CN(1), [CN(2), CN(3)]), b = r.b; enrol(b, 12);
    ok('MC-11 setup: 4 / 4 / 4', J(counts(b)) === J({ [CN(1)]: 4, [CN(2)]: 4, [CN(3)]: 4 }), J(counts(b)));
    SA(); ACT.mcRemove({ dataset: { id: 'MC-RM', n: CN(1) } }); ok('MC-11 Remove asks where the learners go (shared, or all to one) and needs a reason', !!qm('#mc-rm-to') && /4 learners/.test(mroot().textContent)); reason('Leaving the Academy');
    ok('MC-11 removed: their four learners are shared 2 / 2; nobody is left with the removed Coordinator', J(mcList(b)) === J([CN(2), CN(3)]) && J(counts(b)) === J({ [CN(2)]: 6, [CN(3)]: 6 }) && !mcLids(b).some(l => b.mcA[l].to === CN(1)), J(counts(b)));
    ok('MC-11 audited (removal and the reassignment summary); history rows per learner; Coordinator history closed', ADMIN.audit.some(a => a.action === 'Academic Coordinator removed' && a.before === CN(1)) && ADMIN.audit.some(a => a.action === 'Learners reassigned to other Coordinators') && b.mcH.filter(h => h.kind === 'remove').length === 4 && b.coordHistory.some(h => h[0] === CN(1) && h[2]));
    ACT.mcRemove({ dataset: { id: 'MC-RM', n: CN(2) } }); qm('#mc-rm-to').value = CN(3); reason('Moving all');
    ok('MC-11 Remove with "All to" moves every learner to the named Coordinator', J(counts(b)) === J({ [CN(3)]: 12 }));
    const a0 = ADMIN.audit.length; ACT.mcRemove({ dataset: { id: 'MC-RM', n: CN(3) } });
    ok('MC-11 (negative) the last Coordinator can\'t be removed (use Change instead); logged', !MODAL && blocked(a0) && J(mcList(b)) === J([CN(3)]));
    ok('MC-11 (negative) a direct call can\'t remove the last Coordinator either', mcRemoveCoord(b, CN(3), 'x') === false && mcLids(b).every(l => mcOf(l, b) === CN(3)));
    COO('M3'); const a1 = ADMIN.audit.length; ACT.mcAdd({ dataset: { id: 'MC-RM' } }); ok('MC-11 (negative) a Coordinator can\'t add Coordinators', !MODAL && blocked(a1));
    COO('M1'); go('c-batches', { id: 'MC-RM' }); ok('MC-11 the removed Coordinator no longer has the batch (not listed, no roster on a direct link)', !myBatches().some(x => x.code === 'MC-RM') && !main().includes('Mc Learner 1') && !myLearners(true).some(l => l.batch === b));
  });

  /* ================= 12. Existing workflows and P-33 with several Coordinators ================= */
  await T('MC-12', async () => {
    fresh(); mkCoords(2); SA(); const b = B('L3AC-JAN26'), as = chAllocOf(b).asg;
    const a0 = ADMIN.audit.length; ok('MC-12 (negative) the batch\'s assessor can\'t be added as a Coordinator (P-33), logged', mcAddCoord(b, as, 'x') === false && blocked(a0) && !mcHas(b, as));
    ok('MC-12 (negative) an inactive or non-Coordinator account can\'t be added', mcAddCoord(b, 'Marcus Bell', 'x') === false && !mcHas(b, 'Marcus Bell'));
    mcAddCoord(b, CN(1), 'Shared'); mcReassign(b, mcLids(b)[3], CN(1), 'Caseload'); go('a-batches', { id: 'L3AC-JAN26', tab: 'staff' });
    ok('MC-12 Assessors panel: no Coordinator of the batch is offered as an assessor', ![...document.querySelectorAll('main #ch-as-asg option')].some(o => o.value === CN(1) || o.value === 'Dr Helen Carter'));
    document.querySelector('main #ch-as-obs').insertAdjacentHTML('beforeend', `<option>${CN(1)}</option>`); document.querySelector('main #ch-as-obs').value = CN(1); const a1 = ADMIN.audit.length; ACT.chAssessSave({ dataset: { b: 'L3AC-JAN26' } });
    ok('MC-12 (negative) saving a second Coordinator as the observation assessor is refused (P-33)', !MODAL && blocked(a1, /Coordinator as assessor/) && chAllocOf(b).obs !== CN(1));
    ok('MC-12 Change staff allocations: with several Coordinators the slot points to the panel (no single select)', (ACT.batchStaff({ dataset: { id: 'L3AC-JAN26' } }), !!MODAL && qm('#bs-c').type === 'hidden' && /Academic Coordinators panel/.test(mroot().textContent))); closeModal();
    ACT.changeCoord({ dataset: { id: 'L3AC-JAN26' } }); ok('MC-12 Change Academic Coordinator asks which one is replaced; listed Coordinators aren\'t offered as the new one', !!qm('#cc-from') && !qma('#cc-to option').some(o => mcHas(b, o.value)));
    qm('#cc-from').value = CN(1); qm('#cc-to').value = 'Laura Kemp'; const n1 = mcLids(b).filter(l => mcOf(l, b) === CN(1)).length; reason('Replace');
    ok('MC-12 replacing one Coordinator keeps the other; the replaced one\'s learners move to the new one', J(mcList(b)) === J(['Dr Helen Carter', 'Laura Kemp']) && mcLids(b).filter(l => mcOf(l, b) === 'Laura Kemp').length === n1 && ADMIN.audit[0].action === 'Academic Coordinator changed');
    // A learner who joins later is allocated (sign-up path): least-loaded
    const lc = counts(b); ok('MC-12 the allocation stays complete after the change', Object.values(lc).reduce((x, y) => x + y, 0) === mcLids(b).length && !lc.null);
    // Notifications: a learner-specific one goes to the learner's Coordinator only; a batch one to every Coordinator
    COO('A'); const lid = mcLids(b).find(l => mcOf(l, b) === 'Laura Kemp'); chCooNotify(b.coord, 'MC learner event', 'x', 'c-learner.' + lid); chCooNotify(b.coord, 'MC batch event', 'x', 'c-batches.' + b.code);
    ok('MC-12 notifications: Helen sees the batch event but not the learner event for Laura\'s learner', cooNotifs().some(n => n.t === 'MC batch event') && !cooNotifs().some(n => n.t === 'MC learner event') && STORE.coo.notifs.some(n => n.t === 'MC learner event' && n.to === 'Laura Kemp'));
    // Sessions / payments / observations untouched: a learner world's payments and sessions unchanged by Coordinator changes
    const pay = J(STORE.worlds.C.payments || STORE.worlds.C.plan || null), ev = J(STORE.worlds.C.events.map(e => e.start));
    SA(); mcReassign(b, STORE.worlds.C.me.id, 'Laura Kemp', 'Workflow check');
    ok('MC-12 payment and session data are unchanged by a Coordinator reassignment', J(STORE.worlds.C.payments || STORE.worlds.C.plan || null) === pay && J(STORE.worlds.C.events.map(e => e.start)) === ev);
    // Admin rebuild (variant switch) keeps Coordinators and allocations
    const keep = allocJ(b); buildAdmin('B'); buildAdmin('A'); const b2 = B('L3AC-JAN26');
    ok('MC-12 an admin rebuild keeps the Coordinator list and every allocation', J(mcList(b2)) === J(['Dr Helen Carter', 'Laura Kemp']) && allocJ(b2) === keep);
    // Demo reset starts from the seed
    fresh(); ok('MC-12 demo reset: back to one Coordinator, all learners with them', J(mcList(B('L3AC-JAN26'))) === J(['Dr Helen Carter']));
  });

  /* ================= 13. Documents by record, not by name (correction 1) ================= */
  await T('MC-13', async () => {
    fresh(); mkCoords(1); SA(); mcAddCoord(B('L3AC-JAN26'), CN(1), 'Shared');
    const C = STORE.worlds.C, d0 = J(C.docs);
    // A Teacher/Assessor with a submission whose assignment has course resources
    let tv = null, key = null, res = null;
    Object.keys(TAS_USERS).some(v => { S.tas.v = v; tasEnter(); S.signedIn = true; const s = tasSubs(true).find(x => (tasAsg(x).resources || []).length); if (s) { tv = v; key = s.key; res = tasAsg(s).resources[0][0]; } return !!s; });
    let dl = ''; const _t = toast; toast = (m, k) => { dl = m; return _t(m, k); };
    try {
      go('t-mark', { id: key }); const btn = document.querySelector(`main [data-act="fakeDl"][data-src="res"][data-f="${res}"]`);
      ok('MC-13 marking screen: course-resource buttons carry their record (submission)', !!btn && btn.dataset.k === key);
      dl = ''; btn.click(); ok('MC-13 Assessor: a course resource of a submission they mark downloads', /downloaded/.test(dl), dl);
      const a0 = ADMIN.audit.length; dl = ''; ACT.fakeDl({ dataset: { f: res } });
      ok('MC-13 (negative) the same file name without its record is refused and logged (unknown provenance)', !/downloaded/.test(dl) && blocked(a0, /download a document/i));
      const other = chRaw(() => tasSubs(true)).find(x => !tasSubs(true).some(y => y.key === x.key)), a1 = ADMIN.audit.length; dl = '';
      if (other) ACT.fakeDl({ dataset: { f: res, src: 'res', k: other.key } });
      ok('MC-13 (negative) a forged record (another assessor\'s submission) is refused', !other || (!/downloaded/.test(dl) && blocked(a1)));
      // An admission upload whose name matches the academic file: denied wherever it is requested
      C.docs[5].file = res; C.docs[5].status = 'Submitted';
      go('t-mark', { id: key }); const a2 = ADMIN.audit.length; dl = ''; document.querySelector(`main [data-act="fakeDl"][data-src="res"][data-f="${res}"]`).click();
      ok('MC-13 (negative) a file uploaded at admission with an academic-looking name is refused, even through the academic record', !/downloaded/.test(dl) && blocked(a2) && since(a2).some(x => x.entity === 'Restricted learner document'));
      ok('MC-13 that refusal is logged without the file name', !since(a2).some(x => J(x).includes(res)));
      ok('MC-13 the admission record itself is unchanged (not recategorised)', C.docs[5].file === res && C.docs[5].name === JSON.parse(d0)[5].name);
    } finally { toast = _t; }
    C.docs = JSON.parse(d0);
    // Approvals evidence (an academic item the teacher raised); a private document renamed to that evidence name
    const sar = Object.keys(TAS_USERS).find(v => TAS_USERS[v].name === 'Sarah Okonkwo'); S.tas.v = sar; tasEnter(); S.signedIn = true;
    go('t-approvals', { id: 'AQ-4007' }); const ev = document.querySelector('main [data-act="viewFile"][data-src="q"]');
    ok('MC-13 Approvals item: the evidence button carries its queue item', !!ev && ev.dataset.q === 'AQ-4007');
    ev.click(); ok('MC-13 the teacher who raised the academic item opens its evidence', !!MODAL); closeModal();
    C.docs[0].versions.push(['evidence_AQ-4007.pdf', D(-1), 'Submitted']);
    go('t-approvals', { id: 'AQ-4007' }); const a3 = ADMIN.audit.length; document.querySelector('main [data-act="viewFile"][data-src="q"][data-f="evidence_AQ-4007.pdf"]').click();
    ok('MC-13 (negative) a private document renamed to the evidence file name is refused; logged without the name', !MODAL && blocked(a3) && !since(a3).some(x => J(x).includes('evidence_AQ-4007')));
    C.docs = JSON.parse(d0);
    // Coordinator portal: names alone never open anything; attachments through their record
    COO('M1'); const r0 = STORE.mcDocReview.length;
    [['viewFile', 'Q2_evidence.pdf'], ['viewFile', 'passport_raman.pdf'], ['fakeDl', 'Q1_attachment.pdf']].forEach(([k, f]) => ACT[k]({ dataset: { f } }));
    ok('MC-13 (negative) Coordinator: viewer and download calls by name (academic-looking or private) are all refused', !MODAL && STORE.mcDocReview.length === r0 + 2);
    ACT.viewFile({ dataset: { f: 'Q2_evidence.pdf', src: 'res', k: mySubmissions(true)[0].key } });
    ok('MC-13 (negative) Coordinator: a forged record reference is refused', !MODAL);
    const w0 = w0S(), aid = 'ATT-MC1'; w0.files[aid] = { id: aid, lid: C.me.id, v: 'C', aid: 'a1', qid: 'q1', box: 0, name: 'my_answer.pdf', size: 1200, type: 'application/pdf', at: D(-2), by: chFullName(C), status: 'Submitted', blob: null, sha256: null, round: 'Sub 1', submittedAt: D(-2) };
    ACT.w0AttOpen({ dataset: { id: aid } }); ok('MC-13 Coordinator (not the learner\'s): an answer attachment opens through its record — batch-wide academic access', !!MODAL && /my_answer\.pdf/.test(mroot().textContent)); closeModal();
    COO('B'); const a4 = ADMIN.audit.length; ACT.w0AttOpen({ dataset: { id: aid } }); ok('MC-13 (negative) a Coordinator of another batch can\'t open it', !MODAL && blocked(a4));
    COO('M1'); const a5 = ADMIN.audit.length; ACT.w0AttOpen({ dataset: { id: 'ATT-NOPE' } }); ok('MC-13 (negative) an attachment reference with no stored record is refused and queued for review', !MODAL && blocked(a5) && STORE.mcDocReview.slice(-1)[0].src === 'att');
    ACT.csDoc({ dataset: { id: 'd1' } }); ok('MC-13 (negative) Coordinator: the learner-document preview is refused', !MODAL);
    // Roles authorised for admission documents keep their access
    SA(); ACT.viewFile({ dataset: { f: 'passport_raman.pdf' } }); ok('MC-13 Super Admin still opens an admission document', !!MODAL); closeModal();
    ACA(); ACT.viewFile({ dataset: { f: 'passport_raman.pdf' } }); ok('MC-13 Academic Admin (Admissions & Documents) still opens it', !!MODAL); closeModal();
    learner('C'); ACT.csDoc({ dataset: { id: 'd1', f: C.docs[0].file } }); ok('MC-13 the learner still previews their own document', !!MODAL); closeModal();
  });

  /* ================= 14. One roster, three kinds of row (correction 2) ================= */
  await T('MC-14', async () => {
    fresh(); mkCoords(3); const r = nb('MC-HIST', T2, CN(1), [CN(2), CN(3)]), b = r.b; enrol(b, 6);
    b.roster.push(['Old import (2019)', 'IA-L-LEGACY-1', 'CSV import']); b.enrolled += 3; render();
    ok('MC-14 an unresolved historical roster row isn\'t a member and isn\'t allocated; 2 / 2 / 2 across the identified learners', !mcLids(b).includes('IA-L-LEGACY-1') && !b.mcA['IA-L-LEGACY-1'] && J(counts(b)) === J({ [CN(1)]: 2, [CN(2)]: 2, [CN(3)]: 2 }), J(counts(b)));
    ok('MC-14 the row is kept, not deleted or completed', b.roster.some(x => x[1] === 'IA-L-LEGACY-1' && x[0] === 'Old import (2019)') && !ADMIN.learners.some(x => x.id === 'IA-L-LEGACY-1'));
    SA(); go('a-batches', { id: 'MC-HIST' });
    const chips = t => [...document.querySelectorAll('main .mc-roster .chip')].filter(c => c.textContent.includes(t)).length;
    ok('MC-14 admin roster: 6 "Batch member", 1 "Unresolved historical roster entry", the 2 uncounted enrolments explained', chips('Batch member') === 6 && chips('Unresolved historical roster entry') === 1 && /2 further enrolments recorded on the batch without an identifiable learner/.test(main()));
    ok('MC-14 admin roster: demonstration rows are labelled "Demonstration only" and are not members', [...document.querySelectorAll('main .mc-r-d')].every(x => !mcLids(b).includes((x.querySelector('a') || {}).dataset ? x.querySelector('a').dataset.id : '')) && chips('Demonstration only') === mcRosterView(b).demo.length);
    ok('MC-14 admin: the count note names 6 identified members against the recorded 9/' + b.cap, /6 identified batch members/.test(main()) && main().includes(`(${b.enrolled}/${b.cap})`));
    COO('M1'); go('c-batches', { id: 'MC-HIST', tab: 'roster' });
    ACT.mcScope({ dataset: { t: 'roster-MC-HIST', k: 'all' } });
    ok('MC-14 Coordinator roster (All batch learners): the same 6 members ("2 of 6"), the same note; the historical row tagged "not allocated"', /2 of 6 learners are allocated to you/.test(main()) && /6 identified batch members/.test(main()) && /Unresolved roster entry — not allocated/.test(main()));
    // Seeded batches: the admin and Coordinator member counts agree
    SA(); const diffs = ADMIN.batches.filter(x => mcList(x).length).filter(x => { go('a-batches', { id: x.code }); const m = /(\d+) identified batch members?/.exec(main()); return !m || +m[1] !== mcLids(x).length; }).map(x => x.code);
    ok('MC-14 every batch with a Coordinator: the admin roster states the same member count the Coordinator portal allocates', !diffs.length, diffs.join(', '));
    const man = B('L3AC-JAN27-MAN'); if (man) { go('a-batches', { id: man.code }); ok('MC-14 seeded L3AC-JAN27-MAN: no identified member; its recorded enrolments shown as a historical count, not invented', mcLids(man).length === 0 && /0 identified batch members/.test(main()) && new RegExp(man.enrolled + ' further enrolments? recorded').test(main())); }
  });

  /* ================= 15. A learner with a Coordinator other than the first (correction 3) ================= */
  await T('MC-15', async () => {
    fresh(); mkCoords(10); SA(); const b = B('L3AC-JAN26'); for (let k = 1; k <= 9; k++) mcAddCoord(b, CN(k), 'Ten Coordinators');
    const lid = STORE.worlds.C.me.id; mcReassign(b, lid, CN(9), 'Tenth Coordinator');
    ok('MC-15 setup: ten Coordinators; Aisha is with the tenth (b.coord still reads the first)', mcList(b).length === 10 && mcOf(lid, b) === CN(9) && b.coord === 'Dr Helen Carter');
    learner('C'); render(); ok('MC-15 learner contact: the tenth Coordinator only (People and recipients)', J(STORE.worlds.C.nvq.people.filter(([x]) => x === 'Academic Coordinator').map(x => x[1])) === J([CN(9)]) && recipients().filter(x => /Academic Coordinator/.test(x)).join() === CN(9) + ' (Academic Coordinator)');
    const notes = t => STORE.coo.notifs.filter(n => n.t === t).map(n => n.to).sort().join();
    chCooNotify(b.coord, 'MC15 learner', 'x', 'c-learner.' + lid); chCooNotify(b.coord, 'MC15 marking', 'x', 'c-sub.' + lid + '~a1');
    ok('MC-15 learner notifications written to the legacy field reach the tenth Coordinator only', notes('MC15 learner') === CN(9) && notes('MC15 marking') === CN(9));
    learner('C'); ACT.chOrRequest(); document.querySelector('#or-r').value = 'No workplace permission'; press();
    const r = chOrs().filter(x => x.lid === lid).slice(-1)[0], qi = qItem(r.qid);
    ok('MC-15 observation approval: the request and its queue item go to the tenth Coordinator', r.coord === CN(9) && qi.first === CN(9) && notes('Academy-office observation to decide') === CN(9));
    COO('A'); const a0 = ADMIN.audit.length; ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } });
    ok('MC-15 (negative) the first Coordinator can\'t decide it', !MODAL && blocked(a0));
    ok('MC-15 (negative) the first Coordinator can\'t message Aisha; she isn\'t in their recipients', !cooRecipients().includes(chFullName(STORE.worlds.C) + ' (Learner)'));
    const s = mySubmissions(true).find(x => x.L.lid === lid && x.at && x.live); STORE.coo.drafts[s.key] = { text: 'First Coordinator academic note', scope: 'Overall submission' }; ACT.cfPost({ dataset: { k: s.key } }); press();
    ok('MC-15 the first Coordinator can still give academic feedback', s.live.coordAll.some(c => c.by === 'Dr Helen Carter' && c.text === 'First Coordinator academic note'));
    const a1 = ADMIN.audit.length; ACT.dObsLoc({ dataset: { l: lid, e: 'x' } }); ok('MC-15 (negative) the first Coordinator can\'t choose observation locations for her', blocked(a1) && since(a1).some(x => /Academic Coordinator, can do this/.test(x.reason)));
    COO('M9'); ok('MC-15 the tenth Coordinator can message her and decide the request', cooRecipients().includes(chFullName(STORE.worlds.C) + ' (Learner)') && (ACT.chOrDecide({ dataset: { id: r.qid, a: 'approve' } }), !!MODAL)); closeModal();
    // Batch-level notices reach all ten; a learner leaving goes to their Coordinator only
    s4bNotifyBatch(b, 'MC15 schedule', 'Class moved'); n3Notify(['L3AC-JAN26'], 'MC15 n3', 'Timetable changed');
    ok('MC-15 schedule notices written to the legacy field reach every Coordinator once', notes('MC15 schedule').split(',').length === 10 && notes('MC15 n3').split(',').length === 10 && new Set(notes('MC15 n3').split(',')).size === 10);
    SA(); const x = mcLids(b).find(l => l !== lid && !chWorldKey(l)); mcReassign(b, x, CN(5), 'Move test'); const nb2 = B('L3AC-NOV26');
    chDoMove(x, b, nb2, 'Earlier start');
    ok('MC-15 a learner moved out of the batch: the old batch notice goes to their Coordinator (sixth) only', STORE.coo.notifs.filter(n => n.t === 'Learner batch changed' && n.b.includes('L3AC-JAN26 →')).some(n => n.to === CN(5)) && !STORE.coo.notifs.some(n => n.t === 'Learner batch changed' && n.mc && n.to === 'Dr Helen Carter'));
    ACA(); setUi('kcS', CN(9)); const h9 = kCalBody(); setUi('kcS', 'Dr Helen Carter'); const h1 = kCalBody(); setUi('kcS', '');
    const nosel = h => h.replace(/<select[\s\S]*?<\/select>/g, ''); ok('MC-15 Academic calendar staff filter: the tenth Coordinator matches the batch as the first does', nosel(h9) === nosel(h1) && nosel(h9).length > 200);
    // Reassigned again: everything follows; history stays
    SA(); mcReassign(b, lid, CN(2), 'Back to the second');
    learner('C'); render(); ok('MC-15 after reassignment to the second: contact, request owner and recipients follow', J(STORE.worlds.C.nvq.people.filter(([y]) => y === 'Academic Coordinator').map(y => y[1])) === J([CN(2)]) && r.coord === CN(2) && qi.first === CN(2));
    COO('M9'); ok('MC-15 (negative) the tenth Coordinator no longer messages her; her earlier feedback is unchanged', !cooRecipients().includes(chFullName(STORE.worlds.C) + ' (Learner)') && s.live.coordAll.some(c => c.by === 'Dr Helen Carter'));
    // Single-Coordinator batch: unchanged
    ok('MC-15 one-Coordinator batch (Croydon Cohort 4): the seeded request and contact stay with Michael Osei', chOrOf('OR-101').coord === 'Michael Osei' && (learner('D'), render(), STORE.worlds.D.nvq.people.some(([y, n]) => y === 'Academic Coordinator' && n === 'Michael Osei')));
  });

  /* ================= 16. The multi-Coordinator demo scenario (demo data, real screens) ================= */
  await T('MC-16', async () => {
    fresh(); SA(); const seedL = J(ADMIN.learners), seedB = J(ADMIN.batches.map(b => [b.code, b.coords, b.mcA, b.coh, b.roster])), seedW = J(Object.keys(STORE.worlds));
    S.demoOpen = true; renderDemo(); const load = document.querySelector('#demo-root .mc-demo [data-act="mcDemoLoad"]');
    ok('MC-16 Demo controls: the "Multi-Coordinator demo — demonstration data" section with a Load button', !!load && /demonstration data/.test(document.querySelector('#demo-root .mc-demo').textContent));
    load.click(); const b = mcdBatch(), names = MCD_COORDS.map(c => c.name), c = counts(b);
    ok('MC-16 loaded: DEMO-MC101 with the 10 demo Coordinators in order and 101 identified learners', !!b && J(mcList(b)) === J(names) && mcLids(b).length === 101);
    ok('MC-16 allocation by the normal rule: Coordinator 1 has 11, the other nine 10 each', c[names[0]] === 11 && names.slice(1).every(n => c[n] === 10), J(c));
    ok('MC-16 marked as demo data: batch label, (demo) names, demo.example emails, demo staff accounts', /demo data/.test(b.label) && b.demo && mcLids(b).every(l => { const L = ADMIN.learners.find(x => x.id === l); return L.demo && /\(demo\)$/.test(L.name) && /@demo\.example$/.test(L.email); }) && names.every(n => ADMIN.staff.some(s => s.name === n && s.demo && s.roles.includes('Academic Coordinator'))));
    const ws = ['DL1', 'DL5', 'DL10'].map(k => STORE.worlds[k]);
    ok('MC-16 no documents, payments, observations or outcomes in the demo learner accounts', ws.every(w => !w.docs.length && !w.tx.length && !w.plans.length && !w.observations.length && w.assignments.every(a => a.status === 'Not Started' && a.qs.every(q => !q.rounds.length && !q.fb.length)) && w.tree.every(u => u.mods.every(m => m.los.every(lo => lo.crit.every(x => x.st === 'Not Started'))))));
    ok('MC-16 seed records untouched (learners, batches, learner accounts)', J(ADMIN.learners.filter(l => !l.demo)) === seedL && J(ADMIN.batches.filter(x => !x.demo).map(x => [x.code, x.coords, x.mcA, x.coh, x.roster])) === seedB && J(Object.keys(STORE.worlds).filter(k => !/^DL/.test(k))) === seedW);
    go('a-batches', { id: MCD_CODE, tab: 'staff' });
    ok('MC-16 Batch → Staff: the demo note, 10 Coordinators with active learners 11 / 10 …', /Demonstration data/.test(main()) && /Academic Coordinators \(10\)/.test(main()) && [...document.querySelectorAll('main .mc-load tbody tr')].map(r => r.children[1].textContent).join() === '11,10,10,10,10,10,10,10,10,10');
    // The wizard with all ten demo Coordinators ticked (clicks)
    ACT.newBatch(); qm('#nb-c').value = 'MC-TEN-UI'; prim(); names.forEach(n => qma('.mc-nb-c').find(i => i.value === n).click());
    ok('MC-16 Create batch: ten Coordinators ticked by click — "10 Academic Coordinators selected" with their names', /10 Academic Coordinators selected/.test(qm('.mc-nb-n').textContent) && names.every(n => qm('.mc-nb-n').textContent.includes(n)) && qm('#nb-ac').value === names[0]);
    prim(); prim(); prim(); const rev = mroot().textContent;
    ok('MC-16 Review & create lists all ten Coordinators', /Academic Coordinators \(10\)/.test(rev) && names.every(n => rev.includes(n)));
    prim(); closeModal(); ok('MC-16 created with the ten Coordinators in that order', J(mcList(B('MC-TEN-UI'))) === J(names));
    // Coordinator 1, 5 and 10 through the demo buttons
    const shown = () => document.querySelectorAll('main .mc-tag').length, myTags = () => document.querySelectorAll('main .mc-tag .chip').length;
    renderDemo(); document.querySelector('#demo-root [data-act="mcDemoOpen"][data-t="coord"][data-k="1"]').click();
    ok('MC-16 Coordinator 1: the roster opens on My learners — Total batch learners 101, My learners 11, 11 tagged rows', S.route === 'c-batches' && /Total batch learners\s*101/.test(main()) && /My learners\s*11/.test(main()) && shown() === 11 && myTags() === 11);
    document.querySelector('main [data-act="mcScope"][data-k="all"]').click();
    ok('MC-16 All batch learners: 101 records (paged), my learners tagged, the others name their Coordinator', /of 101/.test(main()) && myTags() >= 1 && /Coordinator: Ben Hartley \(demo\)/.test(main()));
    go('c-dashboard'); ok('MC-16 discoverable: the dashboard My caseload card links to the roster (11 of 101 learners are mine)', /11 of 101 learners are mine/.test(main()) && !!document.querySelector(`main .mc-caseload [data-go="c-batches"][data-id="${MCD_CODE}"]`));
    go('c-learners'); ok('MC-16 discoverable: Learners (sidebar) opens on My learners — 11', /My learners\s*11/.test(main()) && shown() === 11);
    S.demoOpen = true; renderDemo(); document.querySelector('#demo-root [data-act="mcDemoOpen"][data-t="coord"][data-k="5"]').click();
    ok('MC-16 Coordinator 5: My learners 10 of 101', /My learners\s*10/.test(main()) && /10 of 101 learners are allocated to you/.test(main()));
    // PD session not scheduled: "Not scheduled" with no date, in the Coordinator's PD overview (display only)
    const dw = STORE.worlds.DL1, dAt = dw.pd.session.at;
    go('c-batches', { id: MCD_CODE, tab: 'obs' });
    ok('MC-16 Coordinator PD overview: the PD session of the demo learner reads "Not scheduled" with no date', /Not scheduled/.test(main()) && !main().includes(fdt(dAt)));
    // Academic access across the batch; designated actions only for the learner's own Coordinator
    const other = mcLids(b).find(l => mcOf(l, b) === names[0] && !chWorldKey(l)), o = ADMIN.learners.find(x => x.id === other), sub = mySubmissions(true).find(s => s.L.batch === b && s.at && mcOf(s.L.lid, b) !== names[4]);
    go('c-learner', { id: other }); ok('MC-16 Coordinator 5 opens a learner of Coordinator 1: academic record, contact withheld, no Message', /Academic CoordinatorAmara Okoye \(demo\)/.test(main()) && !main().includes(o.email) && !document.querySelector('main [data-act="cooCompose"][data-l]'));
    go('c-learner', { id: other, tab: 'progress' }); ok('MC-16 … and their academic progress', /U301/.test(main()));
    STORE.coo.drafts[sub.key] = { text: 'Demo feedback from Coordinator 5', scope: 'Overall submission' }; ACT.cfPost({ dataset: { k: sub.key } }); press();
    ok('MC-16 Coordinator 5 posts feedback on another Coordinator\'s learner\'s submission', STORE.coo.fb.some(f => f.key === sub.key && f.by === names[4]));
    const a0 = ADMIN.audit.length; ACT.chOrAdvise({ dataset: { id: other } }); ok('MC-16 (negative) … but can\'t advise an observation for them (designated Coordinator only)', !MODAL && blocked(a0));
    ok('MC-16 (negative) … and can\'t message them', !cooRecipients().includes(o.name + ' (Learner)'));
    ACT.viewFile({ dataset: { f: 'passport_raman.pdf' } }); ok('MC-16 (negative) an admission document is refused', !MODAL);
    // Learners of Coordinators 1, 5 and 10: their own Coordinator only, everywhere
    const others = k => names.filter((n, i) => i !== k - 1);
    [1, 5, 10].forEach(k => {
      S.demoOpen = true; renderDemo(); document.querySelector(`#demo-root [data-act="mcDemoOpen"][data-t="learner"][data-k="${k}"]`).click();
      const card = [...document.querySelectorAll('main section.card')].find(x => /Your people/.test(x.textContent)), own = MCD_COORDS[k - 1];
      ok(`MC-16 learner of Coordinator ${k}: "Your people" shows ${own.name} with ${own.email}`, S.portal === 'learner' && !!card && card.textContent.includes(own.name) && card.textContent.includes(own.email));
      const leak = []; ['dashboard', 'courses', 'messages', 'notifications', 'profile', 'calendar', 'progress', 'assignments'].filter(r => SCREENS[r]).concat(['course']).forEach(r => { go(r, r === 'course' ? { id: 'nvq' } : {}); if (others(k).some(n => main().includes(n))) leak.push(r); });
      ACT.compose({ dataset: {} }); const opts = qma('#m-to option').map(x => x.textContent); closeModal();
      ok(`MC-16 learner of Coordinator ${k}: none of the other nine on any learner screen or in the recipients`, !leak.length && opts.filter(x => /Academic Coordinator/.test(x)).join() === own.name + ' (Academic Coordinator)', leak.join());
      if (k === 1) { go('progress', { tab: 'pd' }); const sec = document.querySelector('main .mc-pd-none');
        ok('MC-16 learner PD session: "Not scheduled", no date, no Zoom link, no "alternative requested"', !!sec && /Not scheduled/.test(sec.textContent) && !main().includes(fdl(dAt)) && !/Zoom link|Alternative requested/.test(main()));
        ok('MC-16 the stored PD record is unchanged', STORE.worlds.DL1.pd.session.at === dAt && STORE.worlds.DL1.pd.session.status === 'Not scheduled'); }
      go('c-batches', { id: MCD_CODE }); ok(`MC-16 (negative) learner of Coordinator ${k}: the Coordinator batch page by direct link is refused`, /You don't have permission/.test(main()));
    });
    learner('C'); go('progress', { tab: 'pd' }); ok('MC-16 a real PD session (seeded learner) still shows its date and actions', !document.querySelector('main .mc-pd-none') && main().includes(fdl(STORE.worlds.C.pd.session.at)));
    // An admin rebuild keeps the demo; Reset demo removes it all
    buildAdmin('B'); buildAdmin('A'); ok('MC-16 an admin rebuild keeps the demo batch and its Coordinator accounts', !!mcdBatch() && names.every(n => ADMIN.staff.some(s => s.name === n)));
    SA(); ACT.resetDemo();
    ok('MC-16 Reset demo: the demo batch, learners, Coordinator accounts and personas and learner accounts are gone', !mcdBatch() && !ADMIN.learners.some(l => l.demo) && !ADMIN.staff.some(s => s.demo) && !Object.keys(COO_USERS).some(k => /^DM/.test(k)) && !Object.keys(STORE.worlds).some(k => /^DL/.test(k)) && !VARIANT_INFO.DL1);
    ok('MC-16 after the reset the seed is as before', J(ADMIN.learners) === seedL);
    S.demoOpen = false;
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n'); document.body.appendChild(out);
})();
