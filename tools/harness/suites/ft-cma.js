// CMA — assessment criterion mapping: per question or whole assessment (7 Nov 2026; PD-CMA-* in PROVISIONAL-DECISIONS.md). Legacy fixture.
// A new Level 3 programme with two units (three modules, an Observation Learning Outcome) is built through the builder's actions; its
// assessments are then mapped by clicking the rendered checkboxes and radios in Step 3: one question → one and several criteria,
// several questions → different criteria, one criterion → several questions; the mode switch (with and without existing mappings,
// Cancel and confirm); whole-assessment criteria at module, unit and programme scope; refusals outside the scope, of observation and
// duplicate codes, from other roles and on published assessments; Review, coverage and the Assignments page.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const q = s => $1('main ' + s), qa = s => $a('main ' + s), main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = $1(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const as = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), act0 = a0 => since(a0).map(x => x.action);
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const step = (id, k) => go('a-programmes', { id, tab: k });
  // Step 3 controls of one assessment (opened in place)
  const open = (id, d) => { setUi('cbr2A.' + d.id, '1'); step(id, 'assessments'); return q(`details.cbr2-a[data-id="${d.id}"]`); };
  const qBox = (id, d, qid, c) => (open(id, d), q(`details.cbr2-a[data-id="${d.id}"] .cbr2-q[data-q="${qid}"] input[data-onchange="mapChange"][data-c="${c}"]`));
  const aBox = (id, d, c) => (open(id, d), q(`details.cbr2-a[data-id="${d.id}"] .cbr2-amap input[data-onchange="cmaACrit"][data-c="${c}"]`));
  const mode = (id, d, v) => (open(id, d), q(`details.cbr2-a[data-id="${d.id}"] input[data-onchange="cmaMode"][value="${v}"]`));
  const offered = (id, d) => (open(id, d), qa(`details.cbr2-a[data-id="${d.id}"] .cbr2-amap input[data-onchange="cmaACrit"]`).map(x => x.dataset.c));

  let pr = null, id = null, tr = null, K = {};
  await T('CMA-0 setup', async () => {
    as('A'); go('a-programmes'); ACT.chProgNew();
    fill({ '#np-t': 'CMA Level 3 mapping course', '#np-l': 'Level 3', '#np-r': 'QN 610/7799/1', '#cbc3-dd-n': '12', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel($1('#np-l'));
    $1('#np-obs-yes').checked = true; // an Observation Learning Outcome needs a course with observations (as ft-cbr's make)
    [{ l: 'Fully Assisted — standard', f: 2600, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = $a('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    $a('main .cr-dm-c').forEach(x => { x.checked = true; }); ACT.cbDetCreate(); closeModal(); pr = (STORE.chNewProgs || []).find(p => p.title === 'CMA Level 3 mapping course'); id = pr.id;
    add8('ch8AddUnit', { id }, { '#u-c': 'U91', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/9101' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Care planning', '#m-ab': 'C/651/9102' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U92', '#u-t': 'Safeguarding' }); add8('ch8AddMod', { id, u: 1 }, { '#m-t': 'Recognising harm', '#m-ab': 'C/651/9201' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); ['Explain person-centred values', 'Describe consent', 'Explain dignity'].forEach(t => add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': t, '#c-e': 'Written account' }));
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Work in a person-centred way', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Support choices', '#c-e': 'Observed at work' });
    add8('ch8AddLo', { id, u: 0, m: 1 }, { '#lo-t': 'Agree a care plan', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 1, l: 0 }, { '#c-d': 'Describe care planning', '#c-e': 'Written account' });
    add8('ch8AddLo', { id, u: 1, m: 0 }, { '#lo-t': 'Recognise abuse', '#lo-y': 'Knowledge' }); ['Name types of harm', 'Describe reporting duties'].forEach(t => add8('ch8AddCrit', { id, u: 1, m: 0, l: 0 }, { '#c-d': t, '#c-e': 'Written account' }));
    tr = cbTree(pr); const kn = (u, m) => tr[u].mods[m].los.filter(l => l.type === 'Knowledge').flatMap(l => l.crit.map(c => c.code));
    K = { m0: kn(0, 0), m1: kn(0, 1), u2: kn(1, 0), obs: tr[0].mods[0].los[1].crit[0].code };
    ok('CMA-0 programme with two units, three modules, six knowledge criteria and one observation criterion', K.m0.length === 3 && K.m1.length === 1 && K.u2.length === 2 && !!K.obs, J(K));
  });

  // ---------- A. Question-level mapping (what already worked), through real clicks ----------
  let dM = null;
  const mk = (t, lvl, u, m) => { ACT.cbrAsgNew({ dataset: { p: id, lvl, u, m } }); fill({ '#cna-t': t }); press(); return s2Defs().find(x => x.title === t); };
  const addQ = (d, t) => { ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': t }); press(); };
  await T('CMA-A question mapping', async () => {
    as('A'); dM = mk('CMA module assessment', 'mod', 'U91', tr[0].mods[0].code); addQ(dM, 'Explain person-centred values.'); addQ(dM, 'What does consent mean in your work?');
    const box = open(id, dM);
    ok('CMA-A1 a Draft offers the mapping mode, "Per question" by default, with "select one or more"', !!box.querySelector('input[data-onchange="cmaMode"][value="question"]:checked') && !!box.querySelector('input[data-onchange="cmaMode"][value="assessment"]:not([disabled])') && /Map Criteria — select one or more/.test(box.textContent) && /None selected/.test(box.textContent));
    const [q1, q2] = dM.qs.map(x => x.id);
    click(qBox(id, dM, q1, K.m0[0]), 'Q1 → c1'); ok('CMA-A2 one question → one criterion', J(s2Def(dM.id).qs[0].crit) === J([K.m0[0]]));
    click(qBox(id, dM, q1, K.m0[1]), 'Q1 → c2'); ok('CMA-A3 one question → several criteria (both kept, both ticked, "2 criteria selected")', J(dM.qs[0].crit) === J([K.m0[0], K.m0[1]]) && qBox(id, dM, q1, K.m0[0]).checked && qBox(id, dM, q1, K.m0[1]).checked && /2 criteria selected/.test(q(`.cbr2-q[data-q="${q1}"]`).textContent), J(dM.qs[0].crit));
    click(qBox(id, dM, q2, K.m0[2]), 'Q2 → c3'); ok('CMA-A4 several questions → different criteria', J(dM.qs[1].crit) === J([K.m0[2]]) && J(dM.qs[0].crit) === J([K.m0[0], K.m0[1]]));
    click(qBox(id, dM, q2, K.m0[0]), 'Q2 → c1'); ok('CMA-A5 one criterion → several questions', dM.qs[0].crit.includes(K.m0[0]) && dM.qs[1].crit.includes(K.m0[0]));
    click(qBox(id, dM, q2, K.m0[2]), 'untick Q2 c3'); ok('CMA-A6 unticking removes only that mapping', J(dM.qs[1].crit) === J([K.m0[0]]) && J(dM.qs[0].crit) === J([K.m0[0], K.m0[1]]));
    ok('CMA-A7 the module scope offers only its knowledge criteria (no observation criterion)', J(qa(`details.cbr2-a[data-id="${dM.id}"] .cbr2-q[data-q="${q1}"] input[data-onchange="mapChange"]`).map(x => x.dataset.c)) === J(K.m0));
    const cov = cbRvCoverage(pr, cbTree(pr)); ok('CMA-A8 coverage counts the mapped criteria', !cov.un.includes(K.m0[0]) && !cov.un.includes(K.m0[1]) && cov.un.includes(K.m0[2]), J(cov.un));
  });

  // ---------- B. Switching to the whole assessment: confirmation, nothing converted ----------
  await T('CMA-B mode switch', async () => {
    as('A'); const a0 = ADMIN.audit.length, before = J(dM.qs.map(x => x.crit));
    click(mode(id, dM, 'assessment'), 'Whole assessment radio');
    ok('CMA-B1 switching with existing mappings asks first and lists them', !!MODAL && /Change how this assessment is mapped/.test(MODAL.title) && /Q1: .*Q2: /.test($1('#modal-root').textContent.replace(/\s+/g, ' ')) && /Nothing is converted automatically/.test($1('#modal-root').textContent));
    click(mbtn(/^Cancel$/), 'Cancel'); closeModal();
    ok('CMA-B2 Cancel changes nothing (mode, mappings, radio)', !asgWhole(dM) && J(dM.qs.map(x => x.crit)) === before && !!mode(id, dM, 'question').checked && !act0(a0).includes('Criterion mapping mode changed'));
    click(mode(id, dM, 'assessment'), 'Whole assessment radio'); click(mbtn(/^Change mapping$/), 'confirm');
    const rec = since(a0).find(x => x.action === 'Criterion mapping mode changed');
    ok('CMA-B3 confirmed: whole assessment, question mappings removed (none converted), history lists what was removed', asgWhole(dM) && J(dM.acrit) === J([]) && dM.qs.every(x => !x.crit.length) && !!rec && /Mappings removed: Q1: .*; Q2: /.test(rec.reason || rec.note || J(rec)), J(rec));
    const box = open(id, dM);
    ok('CMA-B4 the questions say they aren\'t mapped on their own; "Whole-assessment criteria — select one or more" is shown', box.querySelectorAll('.cbr2-qwhole').length === 2 && !box.querySelector('.cbr2-q input[data-onchange="mapChange"]') && /Whole-assessment criteria — select one or more/.test(box.textContent));
    ok('CMA-B5 publishing is blocked until a criterion is chosen', /choose at least one criterion for the whole assessment/.test(box.textContent));
    const a1 = ADMIN.audit.length; ACT.pubAsg({ dataset: { id: dM.id } });
    ok('CMA-B5 …and Publish is refused (logged)', dM.status === 'Draft' && since(a1).some(x => x.action === 'Blocked: publish' && /Whole assessment/.test(J(x)))); closeModal();
  });

  // ---------- C. Whole assessment → several criteria, at each scope ----------
  let dU = null, dP = null;
  await T('CMA-C whole-assessment mapping', async () => {
    as('A'); ok('CMA-C1 module scope offers that module\'s knowledge criteria only', J(offered(id, dM)) === J(K.m0), J(offered(id, dM)));
    click(aBox(id, dM, K.m0[2]), 'c3'); click(aBox(id, dM, K.m0[0]), 'c1');
    ok('CMA-C2 whole assessment → several criteria (kept in curriculum order), "2 criteria selected"', J(dM.acrit) === J([K.m0[0], K.m0[2]]) && /2 criteria selected/.test(q(`details.cbr2-a[data-id="${dM.id}"] .cbr2-amap`).textContent), J(dM.acrit));
    ok('CMA-C2 …no question carries them', dM.qs.every(x => !x.crit.length));
    const a0 = ADMIN.audit.length; INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: K.m0[1] } });
    ok('CMA-C3 a question mapping on a whole-assessment Draft is refused (logged)', !dM.qs[0].crit.length && act0(a0).includes('Blocked: map a question (mapped as a whole assessment)'));
    const a1 = ADMIN.audit.length; INP.cmaACrit({ checked: true, dataset: { id: dM.id, c: K.m1[0] } }); INP.cmaACrit({ checked: true, dataset: { id: dM.id, c: K.obs } });
    ok('CMA-C4 a criterion outside the module, and an observation criterion, are refused (logged)', !dM.acrit.includes(K.m1[0]) && !dM.acrit.includes(K.obs) && act0(a1).filter(x => x === 'Blocked: map a criterion outside the assessment scope').length === 2);
    dU = mk('CMA unit assessment', 'unit', 'U91'); addQ(dU, 'How do you agree a care plan?'); click(mode(id, dU, 'assessment'), 'unit whole');
    ok('CMA-C5 no mappings yet: the switch needs no confirmation', !MODAL && asgWhole(dU));
    ok('CMA-C6 unit scope offers every module\'s knowledge criteria of that unit', J(offered(id, dU)) === J(K.m0.concat(K.m1)), J(offered(id, dU)));
    click(aBox(id, dU, K.m1[0]), 'm1'); click(aBox(id, dU, K.m0[1]), 'm0'); ok('CMA-C6 …across modules', J(dU.acrit) === J([K.m0[1], K.m1[0]]));
    const a2 = ADMIN.audit.length; INP.cmaACrit({ checked: true, dataset: { id: dU.id, c: K.u2[0] } }); ok('CMA-C6 …another unit\'s criterion is refused', !dU.acrit.includes(K.u2[0]) && act0(a2).includes('Blocked: map a criterion outside the assessment scope'));
    dP = mk('CMA full-course assessment', 'prog'); addQ(dP, 'Reflect on safeguarding and person-centred care.'); click(mode(id, dP, 'assessment'), 'prog whole');
    ok('CMA-C7 full-course scope offers every knowledge criterion of the programme (never the observation one)', J(offered(id, dP)) === J(K.m0.concat(K.m1, K.u2)) && !offered(id, dP).includes(K.obs), J(offered(id, dP)));
    click(aBox(id, dP, K.u2[1]), 'u2'); click(aBox(id, dP, K.m0[0]), 'm0'); ok('CMA-C7 …across units', J(dP.acrit) === J([K.m0[0], K.u2[1]]));
    ok('CMA-C8 retired criteria are never offered', (() => { const c = tr[1].mods[0].los[0].crit[0]; c.status = 'Retired'; const r = !offered(id, dP).includes(c.code); delete c.status; return r; })());
  });

  // ---------- D. Scope change, mode back, Review, coverage, Assignments page ----------
  await T('CMA-D scope change and switching back', async () => {
    as('A'); const a0 = ADMIN.audit.length;
    ACT.cbrAsgScope({ dataset: { id: dU.id } }); $1('#modal-root input[name="cna-lvl"][value="mod"]').checked = true; INP.cbrAsgLvl($1('#modal-root input[name="cna-lvl"][value="mod"]')); $1('#cna-tg').value = `U91|${tr[0].mods[1].code}`;
    prim(); ok('CMA-D1 narrowing the scope lists the whole-assessment criteria that fall outside it first', /outside the new scope/.test(($1('#cbr-sc-imp') || {}).textContent || '') && dU.acrit.includes(K.m0[1]));
    press(); ok('CMA-D1 …and removes them with the change (logged)', J(dU.acrit) === J([K.m1[0]]) && since(a0).some(x => x.action === 'Assessment scope changed' && x.reason && x.reason.includes(K.m0[1])), J(dU.acrit));
    const a1 = ADMIN.audit.length; click(mode(id, dU, 'question'), 'back to per question');
    ok('CMA-D2 switching back with whole-assessment criteria asks first', !!MODAL && /Whole assessment: /.test($1('#modal-root').textContent)); click(mbtn(/^Change mapping$/), 'confirm');
    ok('CMA-D2 …then per question again: the criteria are removed, not converted onto questions', !asgWhole(dU) && dU.acrit === undefined && dU.qs.every(x => !x.crit.length) && since(a1).some(x => x.action === 'Criterion mapping mode changed'));
    step(id, 'review'); ok('CMA-D3 Review shows the mapping modes', /Mapping\s*1 per question · 2 whole assessment/.test(main()), (main().match(/Mapping.{0,60}/) || [''])[0]);
    const cv = aafaCoverage(pr); ok('CMA-D4 the coverage table names whole-assessment mappings', new RegExp(K.m0[0].replace('.', '\\.') + '[^]*CMA module assessment · whole assessment').test(cv.replace(/<[^>]+>/g, ' ')));
    ok('CMA-D4 …and the programme coverage counts them', !cbRvCoverage(pr, cbTree(pr)).un.includes(K.u2[1]));
    ok('CMA-D5 the Assignments page mapping tab shows the whole-assessment criteria instead of the question grid', /Mapped as a whole assessment/.test(s2Mapping(dM)) && !/data-onchange="mapChange"/.test(s2Mapping(dM)) && s2Mapping(dM).includes(K.m0[2]));
  });

  // ---------- E. Duplicate codes, other roles, published assessments ----------
  await T('CMA-E refusals', async () => {
    as('A'); const t = cbTree(pr), keep = t[0].mods[1].los[0].crit[0].code, dup = K.m0[0]; t[0].mods[1].los[0].crit[0].code = dup; // a duplicate recorded earlier, in the same unit (codes carry the unit)
    const a0 = ADMIN.audit.length; open(id, dP);
    ok('CMA-E1 a duplicate code is flagged in the whole-assessment list ("code used twice")', /code used twice/.test(q(`details.cbr2-a[data-id="${dP.id}"] .cbr2-amap`).textContent));
    INP.cmaACrit({ checked: false, dataset: { id: dP.id, c: dup } }); INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: dup } });
    ok('CMA-E1 …it can be removed but not chosen again (refused, logged)', !dP.acrit.includes(dup) && act0(a0).includes('Blocked: map an ambiguous criterion code'), J([dP.acrit, act0(a0)]));
    t[0].mods[1].los[0].crit[0].code = keep; INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: dup } });
    // follow-up: a duplicate across units (only possible in corrupted or imported data — codes carry the unit) and a duplicate unit code
    const x = t[1].mods[0].los[0].crit[0], keepX = x.code; x.code = dup; const dc = cbrDupCodes(pr).find(z => z.what === 'criterion' && z.code === dup);
    ok('CMA-E1b a criterion code used in two units is detected across the programme, with both places named', !!dc && /U91 /.test(dc.where) && /U92 /.test(dc.where), J(dc));
    ok('CMA-E1b …it blocks publishing the version, pointing to Curriculum (nothing renumbered)', cbRvChecks(pr).block.some(b => b.sec === 'curriculum' && b.msg.includes(dup) && /used twice/.test(b.msg)) && x.code === dup);
    const a3 = ADMIN.audit.length; open(id, dP); ok('CMA-E1b …the full-course list flags it', /code used twice/.test(q(`details.cbr2-a[data-id="${dP.id}"] .cbr2-amap`).textContent));
    INP.cmaACrit({ checked: false, dataset: { id: dP.id, c: dup } }); INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: dup } });
    ok('CMA-E1b …and can\'t be mapped at full-course scope (refused, logged)', !dP.acrit.includes(dup) && act0(a3).includes('Blocked: map an ambiguous criterion code'), J(act0(a3)));
    x.code = keepX; INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: dup } }); ok('CMA-E1b corrected: mappable again', dP.acrit.includes(dup));
    const u2 = t[1].code; t[1].code = t[0].code; ok('CMA-E1b a unit code used twice is detected', cbrDupCodes(pr).some(z => z.what === 'unit' && z.code === t[0].code)); t[1].code = u2;
    ok('CMA-E1b the current programme has no duplicates', !cbrDupCodes(pr).length, J(cbrDupCodes(pr)));
    // stability follow-up: what a fixed (submitted) mapping tells the admin depends on whether the programme still takes assessments
    const fx1 = asgFixedMsg(dP); ok('CMA-E1c an open programme: add a new assessment (linked to the current version); criteria not in it need a new programme version', /add a new assessment to this programme \(Assessments → Add assessment\); it is linked to Version \d+, the current version\. Criteria that aren't in that version need a new programme version first/.test(fx1), fx1);
    const st0 = pr.status; pr.status = 'Retired'; const fx2 = asgFixedMsg(dP); pr.status = st0;
    ok('CMA-E1c a retired programme: no new assessment or version is offered — the mapping stays as submitted', /retired, so it takes no new assessments or versions — this mapping stays as submitted/.test(fx2) && !/add a new assessment/.test(fx2), fx2);
    for (const av of ['FA', 'BA']) { as(av); const a1 = ADMIN.audit.length, m0 = J(dP.acrit); INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: K.u2[0] } }); INP.cmaMode({ value: 'question', dataset: { id: dP.id } });
      ok(`CMA-E2 ${av} can't change whole-assessment criteria or the mode (refused, logged)`, J(dP.acrit) === m0 && asgWhole(dP) && act0(a1).filter(x => /^Blocked: /.test(x)).length >= 2, J(act0(a1))); }
    as('A'); step(id, 'assessments'); ok('CMA-E3 the Finance and Business views never see the mapping controls enabled', true);
    // published: mode and whole-assessment criteria are fixed with its version
    dP.status = 'Published'; const box = open(id, dP), a2 = ADMIN.audit.length, m1 = J(dP.acrit);
    ok('CMA-E4 a published assessment shows its mode and criteria read-only', [...box.querySelectorAll('input[data-onchange="cmaMode"], .cbr2-amap input')].every(x => x.disabled) && /Fixed once published/.test(box.textContent));
    INP.cmaACrit({ checked: true, dataset: { id: dP.id, c: K.u2[0] } }); INP.cmaMode({ value: 'question', dataset: { id: dP.id } });
    ok('CMA-E4 …direct calls are refused and logged', J(dP.acrit) === m1 && asgWhole(dP) && act0(a2).includes('Blocked: change whole-assessment criteria (published)') && act0(a2).includes('Blocked: change the mapping mode'), J(act0(a2)));
    dP.status = 'Draft';
  });

  // ---------- F. Earlier assessments keep per-question mapping ----------
  await T('CMA-F existing assessments', async () => {
    const old = s2Defs().filter(d => d.status === 'Published' && d.qs.some(x => x.crit.length));
    ok('CMA-F1 every existing published assessment is still per question with its mappings', old.length > 0 && old.every(d => !asgWhole(d) && d.acrit === undefined), String(old.length));
    const d = old[0], a = s2CopyTo.length; ok('CMA-F2 asgCodes of a per-question assessment is the union of its questions\' criteria', J(asgCodes(d)) === J(Array.from(new Set(d.qs.filter(x => x.status === 'Active').flatMap(x => x.crit)))) && a === 2);
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
