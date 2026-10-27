// CB4 — Curriculum (21 Oct 2026, PD-CB-26…31). Section 2 is one curriculum editor for every NVQ programme, built on cbTree(pr, v):
// the programme's own tree for a version, never another programme's. Draft programmes are edited directly; published versions are
// read-only and change only through a draft version; Retired is read-only; Suspended keeps its existing rule. "No observations" in
// Course Details removes the Observation type for new Learning Outcomes. Every mutation checks the role in the action. Each check
// acts through the screen or the handler, then checks the page and the record, with the negative case.
(async function () {
  // DM-P (PD-DM-15): publishing a programme or version needs fee options by delivery mode, approved by Finance. Where a check isn't about
  // fees, this fixture takes the authorized Section 5 path first: the duration of a pre-builder course, a financial package, fee options by
  // delivery mode, a mode for each option (the Standard programme fee replaced by an option at the same fee), the Super Administrator's own approval (D8)
  const dmpComply = (pid, mode = 'Fully Assisted') => {
    const pr = s3Pr(pid) || cbPr(pid); if (!pr) return false; const av = ADMIN.av, po = S.portal, aca = typeof isAca === 'function' && isAca();
    const qm1 = k => document.querySelector('#modal-root ' + k), put = (k, v) => { const e = qm1(k); if (e && !e.value) e.value = v; };
    const go1 = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
    const rs = () => { const e = document.querySelector('#rsn'); if (e) e.value = 'Fixture: fee options by delivery mode'; return go1(); };
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    if (!pr.durV) { ACT.crDurRec({ dataset: { p: pr.id } }); put('#cr-du-n', '12'); rs(); }
    if (!cb8Managed(pr)) ACT.cb8Start({ dataset: { p: pr.id } });
    if (!crMultiFee(pr)) { ACT.crFoStart({ dataset: { p: pr.id } }); rs(); }
    cb8Work(pr).opts.filter(o => o.status === 'Active' && (o.legacy || !M_MODES.includes(o.mode))).map(o => o.id).forEach(id => {
      const o = cb8Work(pr).opts.find(x => x.id === id);
      if (o.legacy) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String(o.fee); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); ACT.cb8OptRetire({ dataset: { p: pr.id, o: id } }); rs(); }
      else { ACT.cb8Opt({ dataset: { p: pr.id, o: id } }); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-f', '2400'); /* a course without any fee (seeded Level 4): the fixture enters one */ put('#c8-wp', '0'); put('#c8-off', '0'); go1(); }
      closeModal();
    });
    if (!cb8Work(pr).opts.some(o => o.status === 'Active' && !o.legacy && M_MODES.includes(o.mode))) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String((s4PlanCur(pr.id) || {}).fee || 2400); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); closeModal(); } // no option at all (a Level 3 package starts from the options in force): one at the plan's fee
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
    if (!(cb8Wf(pr) && cb8Wf(pr).status === 'Approved')) { ACT.cb8SaApprove({ dataset: { p: pr.id } }); rs(); }
    closeModal(); if (aca) { acaEnter(av); S.signedIn = true; } else setAdminIdentity(av); S.portal = po; return true;
  };
  const dmpPrice = () => { const r = document.querySelector('main #cr-pm-price'); if (r && !r.checked) { r.checked = true; INP.crPm(r); } }; // DM-P (PD-DM-18): "One programme price" is now an explicit choice (fee options by delivery mode are the default)
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB4 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), SYS = as('SY'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const COO = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; };
  const open = (id, tab = 'structure') => go('a-programmes', { id, tab });
  const cur = () => (q('.cb-sec.cur') || { dataset: {} }).dataset.tab, pan = () => (q('.cb-panels .tab[aria-selected="true"]') || { dataset: {} }).dataset.tab;
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o);
  const T3 = id => STORE.s3.trees[id];
  const units = () => qa('.cb-cur-tree > details[data-cbu]').map(d => d.dataset.cbu).join();
  const edit = (p, path, codes, vals) => { ACT.cbCurEdit({ dataset: { p, path, codes } }); if (!MODAL) return 'no dialog'; fill(vals); return press(); };
  const newCourse = (obs = 'yes', title = 'Level 4 CB4 Curriculum') => { SYS(); go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': 'Level 4', /* CR (PD-CR-06): no course code */ '#np-r': 'QN 610/4444/4', '#np-p': '2400' }), dmpPrice(); document.querySelector('#np-obs-' + obs).checked = true; crT(ACT.cbDetCreate)(); return (STORE.chNewProgs || []).slice(-1)[0]; };

  /* ================= A. Seeded Level 2, 3, 4 and 5 ================= */
  await T('CB4-A seeded curricula', async () => {
    fresh(); SA();
    [['NV-L2', 'published'], ['NV-L3', 'published'], ['NV-L4', 'suspended'], ['NV-L5', 'published']].forEach(([id, mode]) => {
      const pr = s3Pr(id), t = T3(id); open(id);
      ok(`CB4-A ${id}: cbTree resolves the programme's own stored tree (the same record, not a copy)`, cbTree(pr) === t && cbTree(pr, pr.version) === t && cbCurMode(pr) === mode);
      ok(`CB4-A ${id}: Section 2 shows its own units in order, nothing from another programme`, cur() === 'curriculum' && pan() === 'structure' && units() === t.map(u => u.code).join() && !qa('.cb-cur-tree [data-cbu]').some(d => !t.some(u => u.code === d.dataset.cbu)));
      const los = t.flatMap(u => u.mods.flatMap(m => m.los)), crit = los.flatMap(l => l.crit);
      ok(`CB4-A ${id}: every Learning Outcome and criterion is listed, with its type and evidence requirement`, qa('.cb-cur-lo').length === los.length && qa('.cb-cur-c').length === crit.length && crit.every(c => main().includes(c.d)) && qa('.cb-cur-guide').length === los.length && /Evidence requirement:/.test(main()));
      ok(`CB4-A ${id}: the summary counts match the record`, new RegExp(`${t.length} units? · `).test(q('.cb-cur-sum').textContent) && q('.cb-cur-sum').textContent.includes(plural(los.length, 'Learning Outcome')));
    });
    open('NV-L3'); ok('CB4-A Level 3 (published): read-only — no Add, Edit or type list; the banner says how to change it', /Version 2 — published, read-only/.test(main()) && /Create new version/.test(q('.cb-cur-where').textContent) && !q('.cb-cur [data-act="nodeAdd"]') && !q('.cb-cur [data-act="cbCurEdit"]') && !q('.cb-cur [data-onchange="loType"]'));
    ok('CB4-A Level 3: module awarding-body codes shown read-only on the published version; answer keys managed as before (CH-18, 9 modules)', qa('.cb-cur [data-onchange="chModCode"]').length === 0 && qa('.cb-cur [data-act="chAnsUp"][data-p="NV-L3"]').length === 9 && /H\/652\/0101/.test(q('.cb-cur').textContent));
    ok('CB4-A Level 3: Knowledge criteria show their assignment mapping', /Mapped to 1 assignment question/.test(main()) && /Not yet covered by an assignment/.test(main()));
    ok('CB4-A Level 3: Version 1 is not stored, and says so (no invented structure)', !cbTree(s3Pr('NV-L3'), 1) && /Version 1\) was recorded before versions were kept/.test(main()));
    open('NV-L4'); ok('CB4-A Level 4 (suspended, no learners): editable by the existing rule, and the banner says so', /Suspended programme/.test(main()) && /no learners/.test(q('.cb-cur-where').textContent) && !!q('.cb-cur [data-act="nodeAdd"][data-lvl="unit"]') && !!q('.cb-cur [data-act="cbCurEdit"]'));
    // A programme whose tree is missing: unavailable, never Level 3's
    delete STORE.s3.trees['NV-L5']; const p5 = s3Pr('NV-L5');
    ok('CB4-A missing tree: cbTree is null (no fallback)', cbTree(p5) === null);
    open('NV-L5'); ok('CB4-A missing tree: "No curriculum is recorded" and nothing from Level 3', /No curriculum is recorded/.test(main()) && /Nothing from another programme is shown/.test(main()) && !/U301/.test(q('.cb-body').textContent));
    ok('CB4-A s3Tree no longer copies Level 3 for a programme without a tree (empty instead)', J(s3Tree('NV-L5')) === '[]' && T3('NV-L5') !== STORE.worlds.C.tree);
    ok('CB4-A unknown programme: cbTree(null) is null', cbTree(null) === null && cbTree(cbPr('NV-XX')) === null);
  });

  /* ================= B. A new course starts empty ================= */
  await T('CB4-B newly created course', async () => {
    fresh(); const pr = newCourse(); open(pr.id);
    ok('CB4-B a new course opens with an empty curriculum: no units, an empty state and "Add the first unit"', J(cbTree(pr)) === '[]' && cbCurMode(pr) === 'draftProg' && !!q('.cb-cur-empty') && /No units yet/.test(main()) && !!q('.cb-cur-empty [data-act="ch8AddUnit"]') && !qa('.cb-cur-tree').length);
    ok('CB4-B …and the banner says it is a Draft whose changes are saved straight away', /Draft programme — Version 1/.test(q('.cb-cur-where').textContent));
    ok('CB4-B nothing from another programme is shown', !/U301|U401|U201/.test(q('.cb-body').textContent));
  });

  /* ================= C. Full creation ================= */
  await T('CB4-C unit → module → Learning Outcome → criterion', async () => {
    fresh(); const pr = newCourse(), id = pr.id; open(id);
    q('.cb-cur-empty [data-act="ch8AddUnit"]').click(); fill({ '#u-c': 'U451', '#u-t': 'Lead and develop a care team' }); press();
    ok('CB4-C unit added: shown at once, audited', units() === 'U451' && ADMIN.audit[0].action === 'Unit added');
    q('.cb-cur [data-act="ch8AddMod"]').click(); ok('CB4-C the Add module dialog names the unit it goes into and the version', /Adding to/.test(document.querySelector('#modal-root .cb-ctx').textContent) && /U451/.test(document.querySelector('#modal-root .cb-ctx').textContent) && /Lead and develop a care team/.test(document.querySelector('#modal-root .cb-ctx').textContent) && /Version 1 \(draft\)/.test(document.querySelector('#modal-root .cb-ctx').textContent));
    fill({ '#m-t': 'Leading change', '#m-ab': 'T/650/4511' }); press();
    q('.cb-cur [data-act="ch8AddLo"]').click(); fill({ '#lo-t': 'Understand how to lead change', '#lo-y': 'Knowledge' }); press();
    q('.cb-cur [data-act="ch8AddCrit"]').click(); ok('CB4-C the Add criterion dialog names unit, module and Learning Outcome', ['U451', 'M1', 'LO1', 'Leading change', 'Understand how to lead change'].every(s => document.querySelector('#modal-root .cb-ctx').textContent.includes(s)));
    fill({ '#c-d': 'Explain a model of change management', '#c-e': 'Written account (assignment)' }); press();
    const t = ch8Tree(id), lo = t[0].mods[0].los[0];
    ok('CB4-C the whole chain is stored in the programme\'s own tree', t.length === 1 && t[0].mods[0].ab === 'T/650/4511' && lo.type === 'Knowledge' && lo.crit[0].d === 'Explain a model of change management' && lo.crit[0].ev === 'Written account (assignment)');
    ok('CB4-C …and shown immediately in Section 2 with its type and evidence', /Explain a model of change management/.test(main()) && /Written account \(assignment\)/.test(main()) && /Knowledge rules/.test(main()));
    ok('CB4-C every step audited', ['Unit added', 'Module added', 'Learning Outcome added', 'Criterion added'].every(a => ADMIN.audit.some(x => x.action === a && x.entity.includes(id))));
    open(id, 'details'); open(id); ok('CB4-C leaving the section and returning keeps the saved curriculum', units() === 'U451' && /Explain a model of change management/.test(main()));
    ok('CB4-C the curriculum change history lists the changes', /Curriculum change history \((\d+)\)/.test(main()) && +main().match(/Curriculum change history \((\d+)\)/)[1] >= 4);
    // A seeded Draft (S3 store) through the same screen
    SA(); open('NV-L3D'); const before3 = J(T3('NV-L3'));
    q('.cb-cur [data-act="nodeAdd"][data-lvl="unit"]').click(); fill({ '#nd-c': 'U312', '#nd-t': 'Medication support' }); press();
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'mod', u: 'U312' } }); fill({ '#nd-t': 'Safe medication', '#nd-ab': 'R/652/1201' }); press();
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'lo', u: 'U312', m: 'M1' } }); fill({ '#nd-t': 'Understand medication rules', '#nd-y': 'Knowledge' }); press();
    ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'crit', u: 'U312', m: 'M1', lo: 'LO1' } }); ok('CB4-C seeded Draft: the Add criterion dialog names the parents', /U312/.test(document.querySelector('#modal-root .cb-ctx').textContent) && /Understand medication rules/.test(document.querySelector('#modal-root .cb-ctx').textContent));
    fill({ '#nd-t': 'Explain the six rights of medication' }); press();
    const u = T3('NV-L3D').find(x => x.code === 'U312');
    ok('CB4-C seeded Draft: the chain is stored in NV-L3D\'s own tree and shown; Level 3 untouched', !!u && u.mods[0].los[0].crit[0].code === '312 1.1' && /Explain the six rights of medication/.test(main()) && J(T3('NV-L3')) === before3);
  });

  /* ================= D. Editing and parent association ================= */
  await T('CB4-D editing existing items', async () => {
    fresh(); SA(); open('NV-L3D');
    ok('CB4-D Edit unit title: saved, shown, audited before → after', edit('NV-L3D', '7', 'U310', { '#ce-t': 'Lead a care team (2027)' }) !== false && T3('NV-L3D')[7].title === 'Lead a care team (2027)' && /Lead a care team \(2027\)/.test(main()) && ADMIN.audit[0].action === 'Node edited' && ADMIN.audit[0].before === 'Lead a team in adult care');
    ok('CB4-D Edit criterion: descriptor and evidence requirement saved (S3 field evReq); the code is unchanged', edit('NV-L3D', '7.0.1.0', 'U310|M1|LO2|310 2.1', { '#ce-t': 'Explain how to delegate fairly and safely', '#ce-e': 'Written account with a workplace example' }) !== false && (c => c.d === 'Explain how to delegate fairly and safely' && c.evReq === 'Written account with a workplace example' && c.code === '310 2.1')(T3('NV-L3D')[7].mods[0].los[1].crit[0]));
    ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '7', codes: 'U310' } }); ok('CB4-D "Nothing has changed" is refused', prim() === false && !!MODAL); closeModal();
    ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '7.0', codes: 'U310|M1' } }); ok('CB4-D seeded module: the awarding-body code is shown read-only (CH-15 field), the title editable', !document.querySelector('#modal-root #ce-ab') && /CH-15/.test(document.querySelector('#modal-root').textContent) && !!document.querySelector('#modal-root #ce-t')); closeModal();
    const a0 = ADMIN.audit.length; ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '7', codes: 'U999' } });
    ok('CB4-D a stale address (codes don\'t match) opens nothing and changes nothing', !MODAL && T3('NV-L3D')[7].title === 'Lead a care team (2027)' && ADMIN.audit.length === a0);
    // Reorder (codes never change)
    ACT.cbCurMove({ dataset: { p: 'NV-L3D', path: '8', codes: 'U311', dir: -1 } });
    ok('CB4-D reorder units: U311 before U310, codes unchanged, audited', T3('NV-L3D').map(u => u.code).slice(-2).join() === 'U311,U310' && ADMIN.audit[0].action === 'Units reordered' && units().endsWith('U311,U310'));
    // New programme (CH-8 store): module awarding-body code editable, validated
    SYS(); open('NV-N1');
    ACT.cbCurEdit({ dataset: { p: 'NV-N1', path: '0.0', codes: 'U401|M1' } }); fill({ '#ce-ab': 'bad' }); ok('CB4-D new programme module: an invalid awarding-body code is refused', prim() === false && ch8Tree('NV-N1')[0].mods[0].ab === 'K/651/2201'); closeModal();
    ok('CB4-D new programme module: a valid awarding-body code and title saved, audited', edit('NV-N1', '0.0', 'U401|M1', { '#ce-t': 'Promote person-centred care (2027)', '#ce-ab': 'K/651/2299' }) !== false && ch8Tree('NV-N1')[0].mods[0].ab === 'K/651/2299' && ch8Tree('NV-N1')[0].mods[0].title === 'Promote person-centred care (2027)' && /Awarding-body code K\/651\/2299/.test(ADMIN.audit[0].after));
    ok('CB4-D new programme criterion: evidence saved in its own field (ev)', edit('NV-N1', '0.0.0.0', 'U401|M1|LO1|401 1.1', { '#ce-t': 'Explain the principles of person-centred practice', '#ce-e': 'Written account (assignment, 500 words)' }) !== false && ch8Tree('NV-N1')[0].mods[0].los[0].crit[0].ev === 'Written account (assignment, 500 words)');
    // Parent association: a criterion added to LO2 goes only there
    const t = ch8Tree('NV-N1'), n1 = t[0].mods[0].los[0].crit.length, n2 = t[0].mods[0].los[1].crit.length;
    ACT.ch8AddCrit({ dataset: { id: 'NV-N1', u: '0', m: '0', l: '1' } }); fill({ '#c-d': 'Plan care with the person', '#c-e': 'Observed' }); press();
    ok('CB4-D a criterion added under LO2 is stored under LO2 only', t[0].mods[0].los[1].crit.length === n2 + 1 && t[0].mods[0].los[0].crit.length === n1 && t[0].mods[0].los[1].crit.slice(-1)[0].d === 'Plan care with the person');
    ACT.ch8AddUnit({ dataset: { id: 'NV-N1' } }); fill({ '#u-c': 'U402', '#u-t': 'Second unit' }); press(); ACT.cbCurMove({ dataset: { p: 'NV-N1', path: '1', codes: 'U402', dir: -1 } });
    ok('CB4-D reorder works for a new programme too', ch8Tree('NV-N1').map(u => u.code).join() === 'U402,U401' && ADMIN.audit[0].action === 'Units reordered');
  });

  /* ================= E. Observations No / Yes ================= */
  await T('CB4-E observation restrictions', async () => {
    fresh(); SYS(); const n1 = s3Pr('NV-N1'); cbObsSet(n1, false); open('NV-N1');
    ok('CB4-E "No observations": the type lists on the page don\'t offer Observation', qa('.cb-cur [data-onchange="ch8LoType"]').length > 0 && qa('.cb-cur [data-onchange="ch8LoType"]').every(s => ![...s.options].some(o => critKind(o.value) === 'Observation')) && /isn't offered/.test(main()));
    ACT.ch8AddLo({ dataset: { id: 'NV-N1', u: '0', m: '0' } });
    ok('CB4-E "No observations": the Add Learning Outcome dialog doesn\'t offer Observation and says why', ![...document.querySelectorAll('#modal-root #lo-y option')].some(o => o.value === 'Observation') && /Observation isn't offered/.test(document.querySelector('#modal-root').textContent));
    const sel = document.querySelector('#modal-root #lo-y'); sel.insertAdjacentHTML('beforeend', '<option value="Observation">Observation</option>'); fill({ '#lo-t': 'Forced observation', '#lo-y': 'Observation' }); const a0 = ADMIN.audit.length;
    ok('CB4-E …a forced Observation value is refused at save, logged, nothing added', prim() === false && !ch8Tree('NV-N1')[0].mods[0].los.some(l => l.title === 'Forced observation') && blocked(a0, /Observation type/)); closeModal();
    const a1 = ADMIN.audit.length; INP.ch8LoType({ value: 'Observation', dataset: { id: 'NV-N1', u: '0', m: '0', l: '1' } });
    ok('CB4-E …choosing Observation on an existing Learning Outcome is refused, logged; type unchanged', ch8Tree('NV-N1')[0].mods[0].los[1].type !== 'Observation' && blocked(a1, /Observation type/));
    // Yes: allowed; criteria available to observation events (CB6)
    cbObsSet(n1, true); open('NV-N1');
    ok('CB4-E "Yes": Observation offered on the page', qa('.cb-cur [data-onchange="ch8LoType"]').some(s => [...s.options].some(o => o.value === 'Observation')));
    ACT.ch8AddLo({ dataset: { id: 'NV-N1', u: '0', m: '0' } }); ok('CB4-E "Yes": the Add dialog offers Observation', [...document.querySelectorAll('#modal-root #lo-y option')].some(o => o.value === 'Observation'));
    fill({ '#lo-t': 'Lead person-centred practice at work', '#lo-y': 'Observation' }); press();
    ACT.ch8AddCrit({ dataset: { id: 'NV-N1', u: '0', m: '0', l: '2' } }); fill({ '#c-d': 'Lead a care review with the person', '#c-e': 'Direct observation in the workplace' }); press();
    ok('CB4-E "Yes": an Observation Learning Outcome is created; its criterion is available for observation events (cbCurObsCriteria / N5a)', ch8Tree('NV-N1')[0].mods[0].los[2].type === 'Observation' && cbCurObsCriteria(n1).some(c => c.code === '401 3.1') && n5NvqOf(n5DraftTree(n1)).some(c => c.code === '401 3.1'));
    // Back to No: existing Observation Learning Outcomes are kept and flagged, not converted
    cbObsSet(n1, false); open('NV-N1');
    ok('CB4-E back to "No": the Observation Learning Outcome is kept (not converted or deleted) and flagged; N5a review warning', ch8Tree('NV-N1')[0].mods[0].los[2].type === 'Observation' && !!q('.cb-cur-obsno.note') && /1 Learning Outcome has the Observation type/.test(main()) && /no observations in this course/.test(main()) && n5Check(n1).review.some(r => /Review \(D5\)/.test(r)));
    ok('CB4-E …its own type list still shows its current type', [...document.querySelector('main [data-onchange="ch8LoType"][data-l="2"]').options].some(o => o.value === 'Observation' && o.selected));
    // Seeded Draft (S3 store): the same rule
    SA(); const d3 = s3Pr('NV-L3D'); cbObsSet(d3, false); open('NV-L3D'); ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'lo', u: 'U310', m: 'M1' } });
    ok('CB4-E seeded Draft "No": nodeAdd\'s type list has no Observation', !!document.querySelector('#modal-root #nd-y') && ![...document.querySelectorAll('#modal-root #nd-y option')].some(o => critKind(o.value) === 'Observation')); closeModal();
    const a2 = ADMIN.audit.length; INP.loType({ value: 'Observation', dataset: { p: 'NV-L3D', u: 'U310', lo: 'LO2' } });
    ok('CB4-E seeded Draft "No": choosing Observation is refused and logged', !MODAL && !T3('NV-L3D')[7].mods[0].los[1].type && blocked(a2, /Observation type/));
    ok('CB4-E seeded Draft "No": its existing Observation Learning Outcomes are kept and flagged', T3('NV-L3D')[7].mods[0].los[0].type === 'Observation' && !!q('.cb-cur-obsno.note'));
    ok('CB4-E no event counts, booking or fees in Section 2 (CB6 / CB8)', !/event count|book an observation|observation fee/i.test(q('.cb-body').textContent));
  });

  /* ================= F. Published immutability and draft versions ================= */
  await T('CB4-F published versions and draft versions', async () => {
    fresh(); SA(); const pr = s3Pr('NV-L3'), pub = T3('NV-L3'), pubJ = J(pub), aisha = J(STORE.worlds.C.tree); open('NV-L3');
    const a0 = ADMIN.audit.length; ACT.cbCurEdit({ dataset: { p: 'NV-L3', path: '0', codes: 'U301' } });
    ok('CB4-F published Level 3: Edit is refused (logged); nothing changes', !MODAL && blocked(a0, /published version/) && J(T3('NV-L3')) === pubJ);
    ACT.cbCurMove({ dataset: { p: 'NV-L3', path: '1', codes: 'U302', dir: -1 } }); ok('CB4-F …reorder refused too', J(T3('NV-L3')) === pubJ);
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('2027 update'); open('NV-L3');
    ok('CB4-F Create new version: Section 2 edits Version 3 (draft) and says learners stay on Version 2', cbCurMode(pr) === 'draftVer' && cbCurSel(pr) === 3 && /Editing Version 3 \(draft\)/.test(main()) && !!q('.cb-cur [data-act="cbCurEdit"]') && !!q('.cb-cur-vers'));
    edit('NV-L3', '0', 'U301', { '#ce-t': 'Communication in care settings (2027)' });
    ok('CB4-F the draft changes; the published Version 2 and Aisha\'s tree do not', cbTree(pr, 3)[0].title === 'Communication in care settings (2027)' && cbTree(pr, 2) === pub && J(pub) === pubJ && J(STORE.worlds.C.tree) === aisha);
    q('.cb-cur-vers [data-v="2"]').click();
    ok('CB4-F viewing Version 2 (published): the old title, read-only, no edit controls', /Version 2 — published, read-only/.test(main()) && /Promote communication in care settings/.test(q('.cb-cur-tree').textContent) && !/\(2027\)/.test(q('.cb-cur-tree').textContent) && !q('.cb-cur [data-act="cbCurEdit"]') && !q('.cb-cur [data-act="nodeAdd"]'));
    q('.cb-cur-vers [data-v="3"]').click(); ok('CB4-F back to Version 3 (draft): the new title and the edit controls', /\(2027\)/.test(q('.cb-cur-tree').textContent) && !!q('.cb-cur [data-act="cbCurEdit"]'));
    cbObsSet(pr, false); dmpComply('NV-L3'); ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish 2027');
    ok('CB4-F publishing Version 3 makes it current; Version 2 is kept as a stored snapshot; Aisha stays on hers', pr.version === 3 && cbTree(pr)[0].title === 'Communication in care settings (2027)' && cbTree(pr, 2) === pub && J(pub) === pubJ && J(STORE.worlds.C.tree) === aisha && STORE.worlds.C.nvq.progVersion !== 3);
    open('NV-L3'); ok('CB4-F after publishing: read-only again; Version 2 can be viewed as an earlier version', /Version 3 — published, read-only/.test(main()) && !!q('.cb-cur-vers [data-v="2"]') && !q('.cb-cur [data-act="cbCurEdit"]'));
    // New programme (CH-8 store): Version 1 published, Version 2 draft
    SYS(); const p2 = s3Pr('NV-N2'), v1 = J(ch8Tree('NV-N2')); open('NV-N2');
    const a1 = ADMIN.audit.length; ACT.ch8AddUnit({ dataset: { id: 'NV-N2' } }); ACT.cbCurEdit({ dataset: { p: 'NV-N2', path: '0', codes: 'U201' } });
    ok('CB4-F published new programme: Add and Edit refused; Section 2 read-only', !MODAL && blocked(a1, /published version/) && J(ch8Tree('NV-N2')) === v1 && !q('.cb-cur [data-act="ch8AddUnit"]'));
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('Version 2'); open('NV-N2');
    ACT.ch8AddUnit({ dataset: { id: 'NV-N2' } }); fill({ '#u-c': 'U299', '#u-t': 'Digital skills' }); press(); edit('NV-N2', '0', 'U201', { '#ce-t': 'Starting work in care (2027)' });
    ok('CB4-F new programme draft Version 2 changes; Version 1 (snapshot) does not', cbTree(p2).some(u => u.code === 'U299') && cbTree(p2, 1) && J(cbTree(p2, 1)) === v1 && !cbTree(p2, 1).some(u => u.code === 'U299') && cbTree(p2, 1)[0].title === 'Starting work in care');
    q('.cb-cur-vers [data-v="1"]').click(); ok('CB4-F …viewing Version 1: its own units, read-only', !/U299/.test(q('.cb-cur-tree').textContent) && !q('.cb-cur [data-act="ch8AddUnit"]'));
  });

  /* ================= G. Cross-programme and cross-version isolation ================= */
  await T('CB4-G isolation', async () => {
    fresh(); SA();
    const snap = () => J({ L2: T3('NV-L2'), L3: T3('NV-L3'), L3O: T3('NV-L3O'), L4: T3('NV-L4'), L5: T3('NV-L5'), N2: ch8Tree('NV-N2') });
    const s0 = snap(); edit('NV-L3D', '0', 'U301', { '#ce-t': 'Changed in L3D only' });
    ok('CB4-G editing NV-L3D (a copy of Level 3) leaves Level 3, the retired 2018 spec and every other programme unchanged', T3('NV-L3D')[0].title === 'Changed in L3D only' && snap() === s0);
    SYS(); edit('NV-N1', '0', 'U401', { '#ce-t': 'Changed in N1 only' }); ok('CB4-G editing NV-N1 leaves NV-N2 (same unit code in another programme? no) and the seeded trees unchanged', snap() === s0);
    SA(); ACT.newProgVersion({ dataset: { id: 'NV-L5' } }); reason('v2'); edit('NV-L5', '0', 'U501', { '#ce-t': 'Leadership (draft)' });
    ok('CB4-G a Level 5 draft version leaves Level 5\'s published tree and Level 3\'s draft-free tree unchanged', T3('NV-L5')[0].title !== 'Leadership (draft)' && cbTree(s3Pr('NV-L5'))[0].title === 'Leadership (draft)' && J(T3('NV-L3')) === J(JSON.parse(s0).L3));
    const a0 = ADMIN.audit.length; ACT.cbCurEdit({ dataset: { p: 'NV-L4', path: '0', codes: 'U301' } }); ok('CB4-G Level 4 addressed with a Level 3 code: refused, nothing opened', !MODAL && ADMIN.audit.length === a0);
    const a1 = ADMIN.audit.length; ACT.chAnsUp({ dataset: { k: 'U301 M1' } }); ACT.loMove({ dataset: { u: 'U301', m: 'M1', lo: 'LO1' } }); INP.chModCode({ value: 'T/652/9999', dataset: { k: 'U301 M1' } });
    ok('CB4-G answer key, Learning Outcome move and module code without a programme: refused and logged — no fallback to Level 3', !MODAL && since(a1).filter(a => /no programme given/.test(a.action)).length === 3 && T3('NV-L3')[0].mods[0].ab === 'H/652/0101');
    ACT.cbCurEdit({ dataset: { p: 'NV-ZZ', path: '0', codes: 'U301' } }); ok('CB4-G an unknown programme is refused and logged', !MODAL && ADMIN.audit[0].action === 'Blocked: change the curriculum (programme not found)');
  });

  /* ================= H. Assignment, answer-key and observation mappings intact ================= */
  await T('CB4-H mappings', async () => {
    fresh(); SA(); const pr = s3Pr('NV-L3');
    const defs = J(s2Defs()), mapped = [...new Set(s2Defs().filter(d => d.programme === pr.title).flatMap(d => d.qs.flatMap(x => x.crit)))], keys = J(STORE.s3.keys['NV-L3'] || {}), asg = J(STORE.worlds.C.assignments), n5pub = J(N5().pub['NV-L3'] || {});
    const had = new Set(T3('NV-L3').flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code)))));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('mapping check'); const iaBefore = J((n5Draft(pr) || {}).ia || []);
    edit('NV-L3', '0', 'U301', { '#ce-t': 'Renamed unit' }); edit('NV-L3', '0.0.0.0', 'U301|M1|LO1|301 1.1', { '#ce-t': 'Identify why people communicate', '#ce-e': 'Written evidence' });
    ACT.cbCurMove({ dataset: { p: 'NV-L3', path: '1', codes: 'U302', dir: -1 } });
    ACT.loMove({ dataset: { p: 'NV-L3', u: 'U302', m: 'M1', lo: 'LO1' } }); document.querySelector('#lom-t').value = 'U301 M1'; document.querySelector('#lom-ok').checked = true; reason('Better fit');
    const codes = new Set(cbTree(pr).flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code)))));
    const miss = mapped.filter(c => had.has(c) && !codes.has(c));
    ok('CB4-H every criterion mapped to an assignment question still exists in the draft, with the same code', mapped.filter(c => had.has(c)).length > 0 && !miss.length, miss.join());
    ok('CB4-H assignment definitions and Aisha\'s assignments are untouched', J(s2Defs()) === defs && J(STORE.worlds.C.assignments) === asg);
    ok('CB4-H answer keys (per programme and module code) are untouched', J(STORE.s3.keys['NV-L3'] || {}) === keys);
    ok('CB4-H the published observation configuration is untouched; the draft\'s Academy criteria mappings are unchanged', J(N5().pub['NV-L3'] || {}) === n5pub && J((n5Draft(pr) || {}).ia || []) === iaBefore);
    open('NV-L3'); ok('CB4-H the edited criterion still shows its assignment mapping', /Identify why people communicate/.test(main()) && /Mapped to 1 assignment question/.test([...document.querySelectorAll('main .cb-cur-c[data-c="301 1.1"]')].map(x => x.textContent).join()));
  });

  /* ================= I. Direct unauthorized mutation ================= */
  await T('CB4-I unauthorized direct calls', async () => {
    fresh();
    const state = () => J({ t: STORE.s3.trees, d: STORE.s3.drafts, k: STORE.s3.keys, c: STORE.chProgTree });
    const calls = [
      () => ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '0', codes: 'U301' } }), () => ACT.cbCurMove({ dataset: { p: 'NV-L3D', path: '1', codes: 'U302', dir: -1 } }),
      () => ACT.nodeAdd({ dataset: { p: 'NV-L3D', lvl: 'unit' } }), () => ACT.s3Rename({ dataset: { p: 'NV-L3D', u: 'U301' } }), () => ACT.nodeState({ dataset: { p: 'NV-L3D', u: 'U301' } }),
      () => INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L3D', u: 'U310', lo: 'LO2' } }), () => ACT.loMove({ dataset: { p: 'NV-L3D', u: 'U302', m: 'M1', lo: 'LO1' } }),
      () => ACT.ch8AddUnit({ dataset: { id: 'NV-N1' } }), () => ACT.ch8AddCrit({ dataset: { id: 'NV-N1', u: '0', m: '0', l: '0' } }), () => INP.ch8LoType({ value: 'Knowledge', dataset: { id: 'NV-N1', u: '0', m: '0', l: '1' } }),
      () => ACT.ch8Key({ dataset: { id: 'NV-N1', u: '0', m: '0' } }), () => ACT.s3WRemove({ dataset: { id: 'NV-N1', u: '0' } }),
      () => INP.chModCode({ value: 'T/652/9999', dataset: { k: 'U301 M1', p: 'NV-L3' } }), () => ACT.chAnsUp({ dataset: { k: 'U301 M1', p: 'NV-L3' } })];
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('A')], ['an Academic Coordinator', COO]].forEach(([who, enter]) => {
      fresh(); enter(); const s0 = state(), a0 = ADMIN.audit.length; let opened = 0;
      calls.forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
      const nb = since(a0).filter(a => /^Blocked/.test(a.action)).length;
      ok(`CB4-I (negative) ${who}: all ${calls.length} curriculum mutations refused — no dialog, nothing changed`, opened === 0 && state() === s0, `opened ${opened}`);
      ok(`CB4-I (negative) ${who}: each refusal logged`, nb >= calls.length, `${nb} logged`);
    });
    // Permitted roles
    [['Super Admin', SA], ['System Admin', SYS], ['Academic Admin', ACA]].forEach(([who, enter], i) => {
      fresh(); enter(); const t = 'Explain how to delegate fairly — ' + who;
      ok(`CB4-I (positive) ${who}: edits a criterion of the seeded Draft`, edit('NV-L3D', '7.0.1.0', 'U310|M1|LO2|310 2.1', { '#ce-t': t, '#ce-e': 'Written' }) !== false && T3('NV-L3D')[7].mods[0].los[1].crit[0].d === t && ADMIN.audit[0].action === 'Node edited');
      open('NV-N1'); ok(`CB4-I (positive) ${who}: sees the edit controls`, !!q('.cb-cur [data-act="ch8AddUnit"]') && !!q('.cb-cur [data-act="cbCurEdit"]'));
    });
    // Seeing Section 2 doesn't grant editing: a custom role with "Courses & Programmes: View" (if configured) gets no controls
    [['Finance Admin', FA], ['Business Admin', BA]].forEach(([who, enter]) => { fresh(); enter(); open('NV-L3D'); ok(`CB4-I (negative) ${who}: the Curriculum page offers no edit controls`, !q('.cb-cur [data-act="nodeAdd"], .cb-cur [data-act="cbCurEdit"], .cb-cur [data-act="cbCurMove"], .cb-cur select, .cb-cur [data-onchange="chModCode"]')); });
    // A role change while a dialog is open: the save checks again
    fresh(); SA(); ACT.cbCurEdit({ dataset: { p: 'NV-L3D', path: '7', codes: 'U310' } }); fill({ '#ce-t': 'Changed after sign-out' }); setAdminIdentity('FA');
    const a9 = ADMIN.audit.length; prim(); ok('CB4-I a role change while the Edit dialog is open: the save is refused and logged', T3('NV-L3D')[7].title !== 'Changed after sign-out' && blocked(a9)); closeModal();
  });

  /* ================= J. Compatibility ================= */
  await T('CB4-J compatibility with S3, R1–R5, N5a, W0, W1, CB1–CB3', async () => {
    fresh(); SA();
    [['tree', 'structure'], ['structure', 'structure'], ['types', 'types'], ['curriculum', 'structure']].forEach(([t, p]) => { open('NV-L3', t); ok(`CB4-J old address .${t} opens Curriculum → ${p}`, cur() === 'curriculum' && pan() === p); });
    open('NV-L3', 'types'); ok('CB4-J Assessment types: how this programme uses them, then the shared list (Add type kept)', !!q('.cb-cur-types') && /Assessment types in this programme/.test(main()) && /Knowledge/.test(q('.cb-cur-types').textContent) && !!q('[data-act="addType"]'));
    q('.cb-cur-types [data-act="cbCurType"]').click(); ok('CB4-J "View type" explains the evidence and the rules it follows', !!MODAL && /Assessment type —/.test(MODAL.title) && /Evidence it uses/.test(document.querySelector('#modal-root').textContent)); closeModal();
    open('NV-L3O'); const a0 = ADMIN.audit.length;
    ok('CB4-J Retired: read-only — no Add, Edit, reorder, type list, module code or answer-key controls', /Retired — read-only/.test(main()) && !q('.cb-cur [data-act="nodeAdd"]') && !q('.cb-cur [data-act="cbCurEdit"]') && !q('.cb-cur [data-act="cbCurMove"]') && !q('.cb-cur select') && !q('.cb-cur [data-onchange="chModCode"]') && !q('.cb-cur [data-act="chAnsUp"]'));
    ACT.cbCurEdit({ dataset: { p: 'NV-L3O', path: '0', codes: 'U301' } }); ACT.cbCurMove({ dataset: { p: 'NV-L3O', path: '1', codes: 'U302', dir: -1 } }); INP.chModCode({ value: 'T/652/9999', dataset: { k: 'U301 M1', p: 'NV-L3O' } }); ACT.chAnsUp({ dataset: { k: 'U301 M1', p: 'NV-L3O' } });
    ok('CB4-J Retired: direct calls refused and logged', !MODAL && since(a0).filter(a => /^Blocked/.test(a.action) && /retired/.test(a.action)).length >= 4);
    ok('CB4-J the new actions are part of the builder\'s write list (hidden on read-only pages)', CB_WRITE.includes('cbCurEdit') && CB_WRITE.includes('cbCurMove'));
    // S3 scenario #28 and the version header still work
    ACT.s3Sc28Edit(); ok('CB4-J Scenario #28: U308 in the Level 3 draft, shown in Section 2', !!s3Draft('NV-L3') && s3Draft('NV-L3').tree.some(u => u.code === 'U308') && /U308/.test(q('.cb-cur-tree').textContent));
    ok('CB4-J the version bar links to Review & Publish for Version 3', /* CB12 (PD-CB-79): was the version area's "Publish version 3" (kPubProg) */ !!q('.cb-ver [data-tab="review"]') && /Version 3 \(draft\)/.test(q('.cb-ver').textContent));
    // Wizard Review still counts the structure (ch8Check unchanged)
    SYS(); open('NV-N1', 'review'); ok('CB4-J new programme Review still checks the structure (Learning Outcome without a type blocks)', /Learning Outcome without a type: U401 M1 LO2/.test(main()));
    open('NV-N1'); ok('CB4-J curriculum badge on the section bar still shows the structure blocker', !!q('.cb-sec[data-tab="curriculum"] .cb-badge.bad'));
  });

  /* ================= K. Learner programme resolution: no Level 3 fallback (PD-CB-32) ================= */
  await T('CB4-K learner programme resolution', async () => {
    fresh(); const L3T = s3Pr('NV-L3').title;
    ok('CB4-K seeded learners (title only) resolve by an unambiguous title: Aisha → Level 3, Grace → Level 2', (r => r.pr && r.pr.id === 'NV-L3' && r.how === 'title')(chProgResolve(STORE.worlds.C)) && (r => r.pr && r.pr.id === 'NV-L2')(chProgResolve(STORE.worlds.D)) && s3ProgOfW(STORE.worlds.D) === 'NV-L2' && s4PidOfW(STORE.worlds.C) === 'NV-L3');
    // A sign-up to a programme made with "New NVQ programme" carries its ID, which wins over the title
    learner('A'); go('browse'); const c2 = CATALOGUE.find(x => x.kind === 'nvq' && x.title === s3Pr('NV-N2').title), wa = W; ACT.applyNvq({ dataset: { id: c2.id } }); prim(); closeModal();
    ok('CB4-K a sign-up to NV-N2 resolves by its programme ID', wa.signup && wa.signup.prog === 'NV-N2' && (r => r.pr && r.pr.id === 'NV-N2' && r.how === 'id')(chProgResolve(wa)));
    const t0 = wa.nvq.title; wa.nvq.title = L3T; ok('CB4-K …the ID wins even if the record\'s title names another programme (no title guess)', chProgOf(wa).id === 'NV-N2' && s4PidOfW(wa) === 'NV-N2'); wa.nvq.title = t0;
    const gone = { nvq: { title: L3T }, signup: { prog: 'NV-N99', step: 1 } };
    ok('CB4-K a record whose programme ID doesn\'t exist is unresolved — not matched by title to Level 3', chProgResolve(gone).pr === null && /NV-N99/.test(chProgResolve(gone).why) && chProgOf(gone).id === null && s3ProgOfW(gone) === null && s4PidOfW(gone) === null);
    ok('CB4-K …no offer letter is chosen for it and its record isn\'t written to', chLetterFor(gone) === null && gone.signup.letterV === undefined);
    // An unresolved legacy title
    // An enrolled learner whose record names an unknown legacy title (Aisha's record, title changed for the test)
    fresh(); const wA = STORE.worlds.C, realT = wA.nvq.title, hist = J({ t: wA.tree, a: wA.assignments, o: wA.observations, e: wA.enrolments.map(e => e.id) }); wA.nvq.title = 'Level 3 Diploma in Adult Care (England) — 2016 legacy';
    ok('CB4-K an unknown legacy title is unresolved (no programme has it) — never Level 3', chProgResolve(wA).pr === null && /no programme has its programme title/.test(chProgResolve(wA).why) && s3ProgOfW(wA) === null && s4PidOfW(wA) === null && !r1IsL3W(wA));
    ok('CB4-K …no payment terms of another programme', s4TermsOf(s4PidOfW(wA)).pid === null);
    const w0 = W; W = wA; const kA = STORE.chAnsKeys['U302 M1']; W = STORE.worlds.B; const kB = STORE.chAnsKeys['U302 M1']; W = w0;
    ok('CB4-K …Level 3 answer keys aren\'t looked up for it (none returned); a resolved Level 3 record (B) still gets Level 3\'s', kA === undefined && !!kB);
    SA(); ACT.chAnsUp({ dataset: { k: 'U307 M1', p: 'NV-L3' } }); ACT.chAnsSample(); reason('New key'); chSyncAll();
    const hasKey = w => (w.resources || []).some(g => g.items.some(i => i.id === 'ak-U307-M1'));
    ok('CB4-K …a new Level 3 answer key doesn\'t reach the unresolved record or Grace (Level 2)', !hasKey(wA) && !hasKey(STORE.worlds.D));
    const ia0 = wA.iaCriteria.slice(); wA.iaCriteria.splice(0); s3SyncIA(); ok('CB4-K …Level 3\'s observation-form criteria aren\'t synced into it', wA.iaCriteria.length === 0); wA.iaCriteria.push(...ia0);
    ok('CB4-K …it isn\'t counted among Level 3\'s learners', !s3Worlds('NV-L3').includes(wA) && !s3Worlds('NV-L3').includes(STORE.worlds.D));
    ok('CB4-K …its own progress, assignments, observations and enrolments are untouched', J({ t: wA.tree, a: wA.assignments, o: wA.observations, e: wA.enrolments.map(e => e.id) }) === hist);
    learner('C'); go('resources'); ok('CB4-K learner Resources: "Your programme record needs to be linked", nothing from another programme', !!q('.cb-prog-unres') && /needs to be linked/.test(main()) && /Nothing from another programme is shown/.test(main()));
    learner('D'); go('resources'); ok('CB4-K (negative) a resolved learner (Grace) sees no such notice', !q('.cb-prog-unres'));
    wA.nvq.title = realT; chSyncAll();
    ok('CB4-K once the record resolves again (exact Level 3 title), the Level 3 key reaches it and it counts among Level 3\'s learners', hasKey(wA) && s3Worlds('NV-L3').includes(wA) && J({ t: wA.tree, a: wA.assignments, o: wA.observations, e: wA.enrolments.map(e => e.id) }) === hist);
    // Ambiguous title
    fresh(); const dup = { ...s3Pr('NV-L2'), id: 'NV-DUP' }; ADMIN.programmes.push(dup);
    ok('CB4-K a title shared by two programmes is unresolved (never the first match)', chProgResolve(STORE.worlds.D).pr === null && /matches 2 programmes/.test(chProgResolve(STORE.worlds.D).why) && s3ProgOfW(STORE.worlds.D) === null);
    ADMIN.programmes.splice(ADMIN.programmes.indexOf(dup), 1); ok('CB4-K …and resolves again once the title is unique', s3ProgOfW(STORE.worlds.D) === 'NV-L2');
    // Admin views don't count an unresolved record as another programme's
    fresh(); STORE.worlds.C.nvq.title = 'Unknown programme title'; SA();
    ok('CB4-K the offer-letter signers of Level 3 don\'t include an unresolved record', !cbSigners(s3Pr('NV-L3')).some(x => x.k === 'C'));
  });

  /* ================= L. Awarding-body code corrections protect history (PD-CB-33) ================= */
  await T('CB4-L awarding-body code corrections', async () => {
    fresh(); SA(); const pr = s3Pr('NV-L3'), pub = T3('NV-L3'), learners = () => J(Object.values(STORE.worlds).map(w => w.tree || null));
    const code = t => t.find(u => u.code === 'U307').mods[0].ab, L0 = learners(), pub0 = code(pub);
    const inp = (p, k, v) => INP.chModCode({ value: v, dataset: { k, p } });
    open('NV-L3'); ok('CB4-L published Level 3: no correction field on the page', !q('.cb-cur [data-onchange="chModCode"]'));
    let a0 = ADMIN.audit.length; inp('NV-L3', 'U307 M1', 'Y/652/0799');
    ok('CB4-L a direct correction on the published version is refused and logged; the published tree and every learner record unchanged', code(pub) === pub0 && learners() === L0 && blocked(a0, /correct an awarding-body code \(published version\)/));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('Code correction'); open('NV-L3');
    ok('CB4-L draft version: the correction field is offered on each module (9)', qa('.cb-cur [data-onchange="chModCode"][data-p="NV-L3"]').length === 9);
    a0 = ADMIN.audit.length; inp('NV-L3', 'U307 M1', 'bad'); ok('CB4-L an invalid code is refused; nothing changes', code(s3Draft('NV-L3').tree) === pub0 && ADMIN.audit.length === a0);
    inp('NV-L3', 'U307 M1', 'Y/652/0799');
    ok('CB4-L an authorised correction in the draft version works, audited with the version', code(s3Draft('NV-L3').tree) === 'Y/652/0799' && ADMIN.audit[0].action === 'Module awarding-body code changed' && /Version 3 \(draft\)/.test(ADMIN.audit[0].reason || JSON.stringify(ADMIN.audit[0])));
    ok('CB4-L …the published Version 2 and every learner record keep the old code', code(pub) === pub0 && learners() === L0 && code(STORE.worlds.C.tree) === pub0);
    cbObsSet(pr, false); dmpComply('NV-L3'); ACT.kPubProg({ dataset: { id: 'NV-L3' } }); reason('Publish code correction');
    ok('CB4-L after publishing Version 3: Version 3 has the corrected code; the earlier Version 2 (stored) and learners keep theirs', pr.version === 3 && code(cbTree(pr)) === 'Y/652/0799' && code(cbTree(pr, 2)) === pub0 && learners() === L0);
    a0 = ADMIN.audit.length; inp('NV-L3', 'U307 M1', 'Z/652/0100'); ok('CB4-L Version 3 is now published: further direct corrections refused and logged', code(cbTree(pr)) === 'Y/652/0799' && blocked(a0, /published version/));
    // Seeded Draft and suspended (existing rule), other programmes untouched
    const L3J = J(T3('NV-L3')); inp('NV-L3D', 'U301 M1', 'H/652/0199');
    ok('CB4-L a seeded Draft programme is corrected directly; Level 3 untouched', T3('NV-L3D')[0].mods[0].ab === 'H/652/0199' && J(T3('NV-L3')) === L3J);
    // Unauthorised
    [['Finance Admin', FA], ['Business Admin', BA], ['a learner', () => learner('C')], ['an Academic Coordinator', COO]].forEach(([who, enter]) => {
      fresh(); enter(); const before = J(T3('NV-L3D')), l0 = learners(), a1 = ADMIN.audit.length; inp('NV-L3D', 'U301 M1', 'H/652/0177');
      ok(`CB4-L (negative) ${who}: a direct correction is refused and logged; nothing changes`, J(T3('NV-L3D')) === before && learners() === l0 && blocked(a1));
    });
    fresh(); SA(); let a2 = ADMIN.audit.length; inp('NV-L3O', 'U301 M1', 'H/652/0177'); ok('CB4-L (negative) a retired programme: refused and logged', blocked(a2, /retired/) && T3('NV-L3O')[0].mods[0].ab === 'H/652/0101');
    a2 = ADMIN.audit.length; inp('', 'U301 M1', 'H/652/0177'); ok('CB4-L (negative) no programme given: refused and logged, no fallback to Level 3', blocked(a2, /no programme given/) && T3('NV-L3')[0].mods[0].ab === 'H/652/0101');
    ACA(); inp('NV-L3D', 'U302 M1', 'T/652/0099'); ok('CB4-L (positive) the Academic Admin corrects a code in the seeded Draft', T3('NV-L3D')[1].mods[0].ab === 'T/652/0099');
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
