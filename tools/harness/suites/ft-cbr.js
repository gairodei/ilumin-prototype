// CBR — the seven-step NVQ course builder (6 Nov 2026; PD-CBR-* in PROVISIONAL-DECISIONS.md). Legacy fixture, then the client demo.
// A real build of a new Level 3 programme through the seven steps — details and learner types, a two-unit curriculum with resources at
// every level, assessments at module, unit and programme scope with answer keys and scoped mapping, Workplace and Academy observation,
// fee options by learner type, offer letters per learner type, review and publish — then permissions, history, persistence and the
// client demo (prices, signed letters, published observation snapshots, learner delivery of placements and answer-key secrecy).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CBR test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const J = o => JSON.stringify(o);
  const tick = (cls, vals) => document.querySelectorAll('#modal-root ' + cls).forEach(x => { if (!x.disabled) x.checked = vals === true || vals.includes(x.value); });
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (!r) throw new Error('missing radio ' + name + '=' + v); r.checked = true; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = a0 => since(a0).filter(x => /^Blocked/.test(x.action)).length;
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const keys = () => qa('.cbr-steps .cbr-st').map(b => b.dataset.tab), cur = () => (q('.cbr-st.cur') || { dataset: {} }).dataset.tab;
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3'; document.querySelectorAll('main .cr-dm-c').forEach(x => { x.checked = l3 || x.value === 'Fully Assisted'; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  let n0 = 0;
  const make = (o = {}) => {
    go('a-programmes'); ACT.chProgNew(); const n = ++n0;
    fill({ '#np-t': o.title || 'CBR Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (7700 + n) + '/1', '#cbc3-dd-n': '12', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    [{ l: 'Fully Assisted — standard', f: 2600, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = crT(ACT.cbDetCreate)(); closeModal(); return pr;
  };

  // ================= Legacy fixture: a new programme through the seven steps =================
  let pr = null, id = null, pr2 = null, tr = null;
  await T('CBR-A structure', async () => {
    SA(); go('a-programmes', { id: 'new', tab: 'details' });
    ok('CBR-A1 a new course shows the seven steps, locked until Course Details is saved', J(qa('.cbr-steps .cbr-st').map(b => b.dataset.tab)) === J(['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review']) && qa('.cbr-st[disabled]').length === 6, J(keys()));
    pr = make({ obs: true }); id = pr && pr.id;
    ok('CBR-A2 (1) "Save and continue" creates one Draft Level 3 programme (Version 1) and opens Curriculum', !!pr && pr.status === 'Draft' && pr.level === 'Level 3' && pr.version === 1 && S.params.tab === 'curriculum', pr ? pr.id + ' ' + pr.status : 'none');
    step(id, 'details');
    ok('CBR-A3 seven steps in order, Course Details current, step numbers 1–7, no panel tabs', J(keys()) === J(['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review']) && cur() === 'details' && J(qa('.cbr-n').map(n => n.textContent)) === J(['1', '2', '3', '4', '5', '6', '7']) && !qa('.cb-panels').length, J(keys()));
    ok('CBR-A4 the footer has Back / Save draft / Save and continue on an editable Course Details', !!q('.cbr-foot [data-act="cbDetSave"]:not([data-next])') && !!q('.cbr-foot [data-act="cbrDetNext"][data-next="curriculum"]') && !qa('.cb-det-acts').length);
    const bad = []; ['curriculum', 'assessments', 'observations', 'payments', 'documents', 'review'].forEach((k, i, a) => { step(id, k); if (cur() !== k) bad.push(k + ' not current'); const nx = q('.cbr-foot .btn-primary[data-go]'); if (i < a.length - 1 && (!nx || nx.dataset.tab !== a[i + 1])) bad.push(k + ': Next'); const bk = q('.cbr-foot .btn:not(.btn-primary)[data-go]'); if (!bk || bk.dataset.tab !== (i ? a[i - 1] : 'details')) bad.push(k + ': Back'); });
    ok('CBR-A5 Back and Next go to the neighbouring steps', !bad.length, J(bad));
    const old = { delivery: 'curriculum', dresources: 'curriculum', types: 'assessments', keys: 'assessments', obs: 'observations', events: 'observations', wpcrit: 'observations', fees: 'payments', payhist: 'payments', support: 'payments', letter: 'documents', docs: 'documents', structure: 'curriculum' }, wrong = [];
    Object.entries(old).forEach(([t, s]) => { step(id, t); if ((q('.cb') || { dataset: {} }).dataset.sec !== s) wrong.push(t); });
    ok('CBR-A6 every old address opens the step that now holds it (Resources & Delivery → Curriculum, types → Assessments …)', !wrong.length, J(wrong));
    step(id, 'types'); ok('CBR-A6 …and its own section is open (Manage assessment types)', !!q('#cbr-types .cbr2-tbox')); // CBR-2 (PD-CBR2-04): Manage Types opens in place — was a fold
    step(id, 'docs'); ok('CBR-A6 …(Required enrolment documents)', !!q('details#cbr-docs[open]'));
    step(id, 'curriculum'); ok('CBR-A7 no Zoom / live-session paragraph inside Curriculum & Outcomes', !/Zoom|live sessions/i.test(q('.cb-body').textContent));
  });

  await T('CBR-B course details and learner types', async () => {
    SA(); step(id, 'details'); const a0 = ADMIN.audit.length, dur0 = J(pr.durV);
    fill({ '#np-ds': 'A diploma for experienced carers.' }); ACT.cbDetSave({ dataset: { id } });
    ok('CBR-B1 (2) Course Details are edited and saved through the existing save (audited)', pr.desc === 'A diploma for experienced carers.' && since(a0).some(x => x.action === 'Details changed'), pr.desc);
    ok('CBR-B2 the form keeps identity, awarding body, code, internal ID, GLH / TQT / credits, duration and the observation question', ['#np-t', '#np-r', '#np-q-body', '#np-q-glh', '#np-q-tqt', '#np-q-credits', '#np-d', '#np-obs-yes'].every(s => q(s)) && /Internal programme ID/.test(main()) && !q('#np-code'));
    const lt = cbrTypes(pr); ok('CBR-B3 learner types start from the fee options (Self-Paced, Fully Assisted), not yet configured', J(lt.map(t => t.id)) === J(['D-SelfPaced', 'D-FullyAssisted']) && qa('.cbr2-lt').length === 2 /* CBR-2 (PD-CBR2-01): cards, no "Not configured yet" explanation */, J(lt.map(t => t.label)));
    ACT.cbrLt({ dataset: { p: id, t: 'D-SelfPaced' } }); fill({ '#lt-w-n': '12', '#lt-t-n': '6', '#lt-x-n': '6' }); const r1 = prim();
    ok('CBR-B4 a maximum window shorter than the displayed window is refused', r1 === false && !cbrTypes(pr).some(t => t.max || t.win) /* CBC4: the version's record now exists from creation (its Display Duration) — nothing of the refused change was saved */, document.querySelector('#modal-root .field-err, #modal-root [aria-invalid="true"]') ? 'marked' : ''); closeModal();
    ACT.cbrLt({ dataset: { p: id, t: 'D-SelfPaced' } }); fill({ '#lt-w-n': '12', '#lt-t-n': '6', '#lt-x-n': '18' }); press();
    ACT.cbrLt({ dataset: { p: id, t: 'D-FullyAssisted' } }); fill({ '#lt-w-n': '6', '#lt-t-n': '6' }); press();
    const t = cbrTypes(pr), sp = t.find(x => x.id === 'D-SelfPaced'), fa = t.find(x => x.id === 'D-FullyAssisted');
    ok('CBR-B5 (3) both learner types configured: windows, tutoring and maximum saved on Version 1 (draft), IDs kept', !!cbrCfgOf(pr) && cbrCfgOf(pr).v === 1 && sp && sp.win.n === 12 && sp.tut.n === 6 && sp.max.n === 18 && fa && fa.win.n === 6 && fa.max === null, J(t));
    ok('CBR-B5 …audited', ADMIN.audit.filter(x => x.action === 'Learner type changed').length >= 2);
    ACT.cbrLt({ dataset: { p: id } }); fill({ '#lt-l': 'Self-Paced' }); document.querySelector('#lt-m').value = 'Self-Paced'; ok('CBR-B6 a duplicate label is refused', prim() === false); closeModal();
    ACT.cbrDisp({ dataset: { p: id } }); fill({ '#cd-n': '12' }); press();
    ok('CBR-B7 display duration saved; the course duration that drives payment dates is unchanged', J(cbrCfgOf(pr).c.disp) === J({ n: 12, unit: 'months' }) && J(pr.durV) === dur0, J(pr.durV));
    step(id, 'details'); ok('CBR-B8 the step shows both learner types as cards with their completion windows', qa('.cbr2-lt').length === 2 && q('.cbr2-lt[data-t="D-SelfPaced"] input[data-f="win"]').value === '12'); // CBR-2 (PD-CBR2-01): was a table with tutoring / maximum and the Provisional label
  });

  await T('CBR-C curriculum and resources', async () => {
    SA(); step(id, 'curriculum');
    add8('ch8AddUnit', { id }, { '#u-c': 'U71', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/7101' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Care planning', '#m-ab': 'C/651/7102' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U72', '#u-t': 'Safeguarding' }); add8('ch8AddMod', { id, u: 1 }, { '#m-t': 'Recognising harm', '#m-ab': 'C/651/7201' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred values', '#c-e': 'Written account' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe consent', '#c-e': 'Written account' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Work in a person-centred way', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Support choices', '#c-e': 'Observed at work' });
    add8('ch8AddLo', { id, u: 0, m: 1 }, { '#lo-t': 'Agree a care plan', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 1, l: 0 }, { '#c-d': 'Describe care planning', '#c-e': 'Written account' });
    add8('ch8AddLo', { id, u: 1, m: 0 }, { '#lo-t': 'Recognise abuse', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 1, m: 0, l: 0 }, { '#c-d': 'Name types of harm', '#c-e': 'Written account' });
    tr = cbTree(pr); const crit = tr.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit)));
    ok('CBR-C1 (5) two units, three modules', tr.length === 2 && tr[0].mods.length === 2 && tr[1].mods.length === 1, J(tr.map(u => [u.code, u.mods.map(m => m.code)])));
    ok('CBR-C2 (6) Learning Outcomes and criteria under them, with stable codes', crit.length === 5 && crit.every(c => /^\d+ \d+\.\d+$/.test(c.code)), J(crit.map(c => c.code)));
    ok('CBR-C2 …a Learning Outcome added to a second module of a unit takes the next number in the unit, so criterion codes stay unique', new Set(crit.map(c => c.code)).size === crit.length && tr[0].mods[1].los[0].code === 'LO3' && ADMIN.audit.some(x => x.action === 'Learning Outcome code assigned'), J(crit.map(c => c.code)));
    const codes0 = J(crit.map(c => c.code)); ACT.cbCurMove({ dataset: { p: id, path: '1', codes: 'U72', dir: -1 } }); ACT.cbCurMove({ dataset: { p: id, path: '0', codes: 'U72', dir: 1 } });
    ok('CBR-C3 units reorder and move back; criterion codes never change', J(cbTree(pr).map(u => u.code)) === J(['U71', 'U72']) && J(cbTree(pr).flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).map(c => c.code)) === codes0);
    step(id, 'curriculum');
    ok('CBR-C4 resources shown in context: one programme block, one per unit, one per module', qa('.cbr-res[data-lvl="prog"]').length === 1 && qa('.cbr-res[data-lvl="unit"]').length === 2 && qa('.cbr-res[data-lvl="mod"]').length === 3);
    const n0r = S4B().res.length;
    ACT.cbrResNew({ dataset: { p: id, lvl: 'prog' } }); document.querySelector('#rs-y').value = 'Link'; fill({ '#rs-t': 'Course handbook (CBR)', '#rs-u': 'https://example.org/handbook' }); press();
    const r = S4B().res.find(x => x.title === 'Course handbook (CBR)');
    ok('CBR-C5 (7) a new resource at programme level: one Draft library record, placed on the programme', !!r && r.status === 'Draft' && r.pid === id && !!r.cbrHome && cbrAttsLive(id).filter(a => a.rid === r.id && a.lvl === 'prog').length === 1, r ? J(r.cbrHome) : 'none');
    step(id, 'curriculum'); ACT.cbrResAdd({ dataset: { p: id, lvl: 'unit', u: 'U72' } }); tick('.cbr-rp', [r.id]); press();
    ACT.cbrResAdd({ dataset: { p: id, lvl: 'mod', u: 'U71', m: tr[0].mods[1].code } }); tick('.cbr-rp', [r.id]); press();
    ACT.cbrResNew({ dataset: { p: id, lvl: 'mod', u: 'U71', m: tr[0].mods[0].code } }); document.querySelector('#rs-y').value = 'Link'; fill({ '#rs-t': 'Values video (CBR)', '#rs-u': 'https://example.org/values' }); press();
    const r2 = S4B().res.find(x => x.title === 'Values video (CBR)');
    ok('CBR-C6 (7) unit and module placements; a resource made on a module belongs to that module', cbrAttsLive(id).filter(a => a.rid === r.id).map(a => a.lvl).sort().join() === 'mod,prog,unit' && !!r2 && r2.unit === 'U71' && r2.mod === tr[0].mods[0].code && !r2.cbrHome);
    ok('CBR-C7 (8) one resource reused at three levels is still one record (no copy)', S4B().res.length === n0r + 2 && S4B().res.filter(x => x.title === 'Course handbook (CBR)').length === 1);
    step(id, 'curriculum'); ok('CBR-C8 the tree shows it at programme, unit and module level', qa(`.cbr-ri[data-r="${r.id}"]`).length === 3 && !!q(`.cbr-res[data-lvl="mod"] .cbr-ri[data-r="${r2.id}"]`));
    ACT.s4bPub({ dataset: { id: r.id } }); if (MODAL) reason('Ready');
    ok('CBR-C9 publishing uses the library\'s own action (status and versions stay the library\'s)', s4bRes(r.id).status === 'Published');
    const a = cbrAttsLive(id).find(x => x.rid === r.id && x.lvl === 'unit'); ACT.cbrResRm({ dataset: { p: id, a: a.id } }); press();
    ok('CBR-C10 removing a placement keeps the library record', a.status === 'Removed' && !!s4bRes(r.id) && cbrAttsLive(id).filter(x => x.rid === r.id).length === 2);
    go('a-resources'); ok('CBR-C11 Learning Resources says where a curriculum-placed resource is used', /whole programme \(curriculum\)/.test(main()));
  });

  let dM = null, dU = null, dP = null;
  await T('CBR-D assessments', async () => {
    SA(); step(id, 'assessments'); tr = cbTree(pr); const m0 = tr[0].mods[0], m1 = tr[0].mods[1];
    ok('CBR-D1 the step lists Whole programme, each unit and each module, with Add Assessment', /Full-Course Assessments/.test(q('.cbr-asgs').textContent) /* CBR-2: was "Whole programme" */ && qa('.cbr-agu').length === 2 && !!q('[data-act="cbrAsgNew"]'));
    const mk = (t, lvl, u, m) => { ACT.cbrAsgNew({ dataset: { p: id, lvl, u, m } }); fill({ '#cna-t': t }); press(); return s2Defs().find(x => x.title === t); };
    dM = mk('CBR module assessment', 'mod', 'U71', m0.code);
    const kM = m0.los.filter(l => l.type === 'Knowledge').flatMap(l => l.crit.map(c => c.code));
    ok('CBR-D2 (9) a module-scoped assessment offers only its module\'s knowledge criteria', !!dM && dM.scope.lvl === 'mod' && J(s2Crit(dM).filter(c => c.type === 'Knowledge').map(c => c.code)) === J(kM), dM ? J(s2Crit(dM).map(c => c.code)) : 'none');
    ACT.s2QAdd({ dataset: { id: dM.id } }); fill({ '#aq-t': 'Explain person-centred values.' }); press(); ACT.s2QAdd({ dataset: { id: dM.id } }); fill({ '#aq-t': 'What does consent mean in your work?' }); press();
    ok('CBR-D3 (14) questions are numbered automatically', dM.qs.length === 2 && /Q1[\s\S]*Q2/.test((step(id, 'assessments'), setUi('cbr2A.' + dM.id, '1'), render(), q(`details.cbr2-a[data-id="${dM.id}"]`).textContent.replace(/Question (\d)/g, 'Q$1')))); // CBR-2 (PD-CBR2-04): "Question N" in place — was the editor's Questions tab
    INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: kM[0] } }); INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: kM[1] } }); INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[1].id, c: kM[1] } });
    ok('CBR-D4 (9) module criteria mapped; one question to several criteria', J(dM.qs[0].crit) === J(kM) && J(dM.qs[1].crit) === J([kM[1]]));
    const a0 = ADMIN.audit.length, other = m1.los[0].crit[0].code; INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: other } });
    ok('CBR-D5 (12) a criterion outside the module scope is refused and logged', !dM.qs[0].crit.includes(other) && since(a0).some(x => x.action === 'Blocked: map a criterion outside the assessment scope'));
    dU = mk('CBR unit assessment', 'unit', 'U71'); const kU = tr[0].mods.flatMap(m => m.los.filter(l => l.type === 'Knowledge').flatMap(l => l.crit.map(c => c.code)));
    ACT.s2QAdd({ dataset: { id: dU.id } }); fill({ '#aq-t': 'How do you agree a care plan?' }); press(); INP.mapChange({ checked: true, dataset: { id: dU.id, q: dU.qs[0].id, c: other } });
    ok('CBR-D6 (10) a unit-scoped assessment offers the criteria of every module of the unit and maps them', J(s2Crit(dU).filter(c => c.type === 'Knowledge').map(c => c.code)) === J(kU) && dU.qs[0].crit.includes(other), J(s2Crit(dU).map(c => c.code)));
    dP = mk('CBR programme assessment', 'prog'); const kP = tr.flatMap(u => u.mods.flatMap(m => m.los.filter(l => l.type === 'Knowledge').flatMap(l => l.crit.map(c => c.code)))), u2 = tr[1].mods[0].los[0].crit[0].code;
    ACT.s2QAdd({ dataset: { id: dP.id } }); fill({ '#aq-t': 'Reflect on safeguarding and person-centred care.' }); press(); INP.mapChange({ checked: true, dataset: { id: dP.id, q: dP.qs[0].id, c: u2 } }); INP.mapChange({ checked: true, dataset: { id: dP.id, q: dP.qs[0].id, c: kM[0] } });
    ok('CBR-D7 (11) a programme-scoped assessment offers every knowledge criterion of the programme', J(s2Crit(dP).filter(c => c.type === 'Knowledge').map(c => c.code)) === J(kP) && dP.qs[0].crit.length === 2 && dP.unit === 'Whole programme');
    ok('CBR-D7 …observation criteria are never offered for mapping', !s2Crit(dP).filter(c => c.type === 'Knowledge').some(c => tr[0].mods[0].los[1].crit.some(x => x.code === c.code)));
    setUi('cbAsg.' + id, dM.id); setUi('cbAsgT.' + id, 'mapping'); step(id, 'assessments');
    // CBR-2 (PD-CBR2-04): Map Criteria under each question, the scope's criteria with code and description — was the grouped mapping tab with its coverage line
    const qd = q(`details.cbr2-a[data-id="${dM.id}"] .cbr2-q[data-q="${dM.qs[0].id}"]`), boxes = qd ? [...qd.querySelectorAll('input[data-onchange="mapChange"]')] : [];
    ok('CBR-D8 the mapping selector shows each criterion of the scope with its code and description, only in scope', boxes.length === kM.length && J(boxes.map(b => b.dataset.c)) === J(kM) && /Explain person-centred values/.test(qd.textContent), String(boxes.length));
    ok('CBR-D8 …with the programme coverage', /Knowledge criteria mapped: \d+ of \d+/.test(q('.cbr-asgs .cbr-cov').textContent));
    // scope change: the mapping outside the new scope is flagged first, then removed with the change
    ACT.cbrAsgScope({ dataset: { id: dP.id } }); radio('cna-lvl', 'unit'); INP.cbrAsgLvl(document.querySelector('#modal-root input[name="cna-lvl"][value="unit"]')); document.querySelector('#cna-tg').value = 'U72';
    const el = { dataset: { id: dP.id } }; ACT.cbrAsgScope(el); radio('cna-lvl', 'unit'); INP.cbrAsgLvl(document.querySelector('#modal-root input[name="cna-lvl"][value="unit"]')); document.querySelector('#cna-tg').value = 'U72';
    const r1 = prim(), warned = /outside the new scope/.test((document.querySelector('#cbr-sc-imp') || {}).textContent || '');
    ok('CBR-D9 changing the scope first lists the mappings it would invalidate', r1 === false && warned && dP.scope.lvl === 'prog');
    prim(); closeModal();
    ok('CBR-D9 …saving again changes the scope and removes only the invalid mapping (audited)', dP.scope.lvl === 'unit' && dP.scope.unit === 'U72' && J(dP.qs[0].crit) === J([u2]) && ADMIN.audit.some(x => x.action === 'Assessment scope changed' && /Mappings removed/.test(x.reason || x.r || J(x))));
    // answer keys
    ACT.cbrQKey({ dataset: { id: dM.id, q: dM.qs[0].id } }); fill({ '#aq-k': 'Expected: dignity, choice, independence (CBR key).' }); press();
    ok('CBR-D10 (14) an answer key per question is saved on the definition (audit records the change, not the text)', dM.qs[0].key === 'Expected: dignity, choice, independence (CBR key).' && ADMIN.audit.some(x => x.action === 'Answer key added' && !J(x).includes('dignity, choice')));
    setUi('cbr2A.' + dM.id, '1'); step(id, 'assessments'); ok('CBR-D11 answer keys are shown with each question, staff only', /dignity, choice/.test(q(`#ak-${dM.id}-${dM.qs[0].id}`).value) && /Answer Key \/ Assessor Guidance/.test(q(`details.cbr2-a[data-id="${dM.id}"]`).textContent)); // CBR-2 (PD-CBR2-04): the editor under each question — was the "Answer keys" card
    // assessment types
    step(id, 'types'); ok('CBR-D12 (13) Manage assessment types: the shared registry with Add type', !!q('#cbr-types [data-act="addType"]'));
    const nT = s3Types().length; ACT.addType(); fill({ '#ty-n': 'Written reflective account (CBR)' }); document.querySelector('#ty-e').value = 'Written assignment questions'; press();
    const ty = s3Types().find(t => t.name === 'Written reflective account (CBR)');
    ok('CBR-D13 (13) a supported type is added', s3Types().length === nT + 1 && !!ty);
    ACT.s3TypeEdit({ dataset: { id: ty.id } }); fill({ '#ty-n': 'Written reflective account (CBR, edited)' }); press();
    ok('CBR-D14 (13) …edited while unused', ty.name === 'Written reflective account (CBR, edited)');
    ACT.cbrAsgNew({ dataset: { p: id, lvl: 'mod', u: 'U71', m: m0.code } }); const o = [...document.querySelectorAll('#cna-ty option')];
    ok('CBR-D15 the new type is offered for assessments; Observation types are shown but can\'t be chosen', o.some(x => x.value === ty.name && !x.disabled) && o.filter(x => /Observation/.test(x.value)).every(x => x.disabled)); closeModal();
    ACT.s3TypeRetire({ dataset: { id: ty.id } }); reason('Not needed');
    ok('CBR-D16 (13) …and retired without touching any assessment', ty.status === 'Retired' && s2Defs().filter(d => d.pid === id).length === 3);
    FA(); const a1 = ADMIN.audit.length, n1 = s3Types().length; ACT.addType(); if (MODAL) press();
    ok('CBR-D17 Finance can\'t add assessment types (refused, logged)', s3Types().length === n1 && blocked(a1) >= 1);
  });

  let catId = null;
  await T('CBR-E observations', async () => {
    SA(); step(id, 'observations');
    ok('CBR-E1 one page: Workplace and Academy side by side, each with its checkbox', qa('.cbr-obs-cols > .cbr-col .cbr2-loc').length === 2 /* CBR-2 (PD-CBR2-05): was the "Where is observation required?" heading with Yes / No */ && qa('.cbr-obs-cols > .cbr-col').length === 2 && !qa('.cb-panels').length);
    ACT.cbrObsLoc({ dataset: { p: id, loc: 'wp', v: 'on' } }); const d = n5Draft(pr);
    ok('CBR-E2 Workplace Yes switches workplace observation on (N5a field, audited)', d.workplace === 'Permitted' && ADMIN.audit.some(x => x.action === 'Observation settings changed' && /Workplace Observation: Yes/.test(x.reason || J(x))));
    step(id, 'observations'); ok('CBR-E3 its configuration appears below its switch with + Add from Library and + Create Category', !!q('.cbr-col[data-loc="wp"] [data-act="ol1Sel"]') && !!q('.cbr-col[data-loc="wp"] [data-act="ol1CbNew"]') && !q('.cbr-col[data-loc="off"] [data-act="ol1Sel"]'));
    ACT.ol1CbNew({ dataset: { p: id, loc: 'wp' } }); fill({ '#ol1-code': 'CBRW', '#ol1-name': 'CBR workplace conduct', '#ol1-desc': 'Conduct at work', '#ol1-rt-0': 'Greets people by name', '#ol1-ri-0': 'Observe introductions' }); document.querySelector('#modal-root .ol1-row .ol1-ev[value="notes"]').checked = true; press();
    const c = OL1().cats.find(x => x.code === 'CBRW'); catId = c && c.id;
    ok('CBR-E4 Create Category: saved to the library, published as Version 1 and selected for the workplace', !!c && ol1Cur(c).v === 1 && ol1Cfg(d).wp.some(s => s.cat === c.id));
    ACT.cbrObsCrit({ dataset: { p: id, loc: 'wp', k: c.id } }); fill({ '#cbr-ct': 'Checks the care plan before acting', '#cbr-ci': 'Observe the plan being read' }); press();
    ok('CBR-E5 (17) Add Criterion puts a new criterion into the category as its next library version, and the course uses it', ol1Cur(c).v === 2 && ol1Cur(c).crit.length === 2 && ol1Resolve(d, 'wp').items.length === 2);
    ok('CBR-E5 …the first library version is unchanged (frozen)', c.vers[0].crit.length === 1 && Object.isFrozen(c.vers[0]));
    ACT.cbrObsLoc({ dataset: { p: id, loc: 'off', v: 'on' } }); ACT.ol1OffMode({ dataset: { p: id, m: 'own' } });
    ACT.ol1Sel({ dataset: { p: id, loc: 'off' } }); radio('ol1-cat', c.id); prim(); tick('.ol1-crit', [ol1Cur(c).crit[0].id]); radio('ol1-all', 'some'); press();
    ok('CBR-E6 (16, 18) Academy configured independently from an existing category, one chosen criterion', d.office === 'Available' && ol1Mode(d) === 'own' && J(ol1Resolve(d, 'off').items.map(i => i.code)) === J([ol1Cur(c).crit[0].code]) && ol1Resolve(d, 'wp').items.length === 2);
    const it = ol1Resolve(d, 'wp').items[1]; ACT.cbrObsEv({ dataset: { p: id, loc: 'wp', c: it.id } }); document.querySelector('#cbr-evlib').checked = false; tick('.ol1-ev', ['notes', 'photos']); tick('.ol1-rq', ['photos']); press();
    ok('CBR-E7 the evidence this course permits is set per criterion, the library unchanged', J(ol1Resolve(d, 'wp').items[1].ev) === J(['notes', 'photos']) && J(ol1Cur(c).crit[1].ev) === J(['notes']));
    ACT.cbrObsGuide({ dataset: { p: id, loc: 'wp' } }); fill({ '#cbr-g': 'Agree the visit with the manager first.' }); press();
    ok('CBR-E8 guidance for the location is saved with the draft', cbrGuideOf(d, 'wp') === 'Agree the visit with the manager first.');
    ACT.cbrObsCritRm({ dataset: { p: id, loc: 'off', k: c.id, c: ol1Cur(c).crit[0].id } });
    ok('CBR-E9 removing a criterion from the course leaves the library record', !ol1Cfg(d).off.add.some(s => s.cat === c.id) && ol1Cur(c).crit.length === 2);
    ACT.ol1Sel({ dataset: { p: id, loc: 'off' } }); radio('ol1-cat', c.id); prim(); press();
    // two observation events cover the NVQ criterion
    const nvq = n5NvqOk(pr, d).map(x => x.code); ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1'; tick('.ev-l', ['workplace', 'office']); tick('.ev-c', nvq); tick('.ev-e', ['notes']); press();
    n5NvqOk(pr, d).forEach(x => { ACT.n5NvqEv({ dataset: { p: id, c: x.code } }); tick('.n5-ev', ['notes']); press(); });
    step(id, 'observations'); ok('CBR-E10 observation events stay on the same page, without a second locations editor', !!q('#cbr-events .cb-ev') && !q('#cbr-events .cb-locs'));
    // Yes → No: what is kept is said first; the step is hidden; Yes again brings it back intact
    const keep = J([d.workplace, d.office, ol1Cfg(d), cbEvOf(d).length]); step(id, 'details'); document.querySelector('#np-obs-no').checked = true; ACT.cbDetSave({ dataset: { id } });
    ok('CBR-E11 (4) turning observations off asks first and lists what is kept', !!MODAL && /Turn observations off/.test(MODAL.title) && /library categor/.test(MODAL.body)); press();
    step(id, 'payments');
    ok('CBR-E12 (4) with No, the Observations step is hidden and the later steps renumber (Fees is 4)', n5Draft(pr).required === false && !keys().includes('observations') && q('.cbr-st.cur .cbr-n').textContent === '4' && /Step 4 of 6/.test(q('.cbr-hint').textContent));
    step(id, 'observations'); ok('CBR-E12 …its old address still opens, saying it isn\'t part of the course', /Not part of this course/.test(q('.cbr-hint').textContent));
    step(id, 'details'); document.querySelector('#np-obs-yes').checked = true; ACT.cbDetSave({ dataset: { id } });
    ok('CBR-E13 (4, 19) Yes again: the step is back with every setting kept', n5Draft(pr).required === true && J([n5Draft(pr).workplace, n5Draft(pr).office, ol1Cfg(n5Draft(pr)), cbEvOf(n5Draft(pr)).length]) === keep && (step(id, 'details'), keys().includes('observations')));
  });

  await T('CBR-F fees by learner type', async () => {
    SA(); const P = cb8Work(pr); P.opts.filter(o => o.status === 'Active').forEach(o => { ACT.cb8Opt({ dataset: { p: id, o: o.id } }); fill({ '#c8-wp': '90', '#c8-off': '40' }); press(); });
    ACT.cb8Opt({ dataset: { p: id, o: '', mode: 'Self-Paced' } });
    ok('CBR-F1 "Add fee option" under a learner type starts with its delivery mode chosen', (document.querySelector('#modal-root #c8-m') || {}).value === 'Self-Paced');
    fill({ '#c8-l': 'Self-Paced — monthly', '#c8-f': '1950', '#c8-wp': '90', '#c8-off': '40' }); press();
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: id, o: o.id, k: '1' } }));
    const o3 = cb8Work(pr).opts.find(o => o.label === 'Self-Paced — monthly'); ACT.cb8PayAdd({ dataset: { p: id, o: o3.id, k: '6' } });
    step(id, 'payments'); const g = q('.cbr-fg[data-lt="D-SelfPaced"]');
    ok('CBR-F2 (20) fee options grouped by learner type: Self-Paced has two, Fully Assisted one', !!g && g.querySelectorAll('article.cb8-opt').length === 2 && q('.cbr-fg[data-lt="D-FullyAssisted"]').querySelectorAll('article.cb8-opt').length === 1);
    ok('CBR-F3 (21) each option shows tuition, both observation fees and the total payable per location', /£1,950\.00/.test(g.textContent) && /£2,040\.00/.test(g.textContent) && /£1,990\.00/.test(g.textContent));
    cb8Work(pr).opts.filter(o => o.status === 'Active').forEach(o => { INP.cbr2Dep({ dataset: { p: id, o: o.id, k: 'allow' }, checked: true }); INP.cbr2Dep({ dataset: { p: id, o: o.id, k: 'own' } }); INP.cbr2Dep({ dataset: { p: id, o: o.id, k: 'amount' }, value: String('150'), id: 'fb1-dep' }); }); /* FB1: the deposit is set on each fee option (no programme editor in Step 5) */
    step(id, 'payments');
    ok('CBR-F4 (21) the deposit is set on the fee options (FB1: no programme editor) and shown with the balance', cb8Work(pr).opts.filter(o => o.status === 'Active').every(o => o.dep && o.dep.mode === 'own' && o.dep.amount === 150) && /Balance after the deposit: £1,800\.00/.test(q('.cbr-fg[data-lt="D-SelfPaced"]').textContent) /* CBR-2 (PD-CBR2-06): was "£150.00 deposit, then £1,800.00" */, J(cb8Work(pr).dep));
    const pay = o3.pay.find(x => x.k === 6), pence = e1SchedP(1950, 6);
    ok('CBR-F5 (22) instalments use the existing calculation: 6 payments of £325.00, exact to the penny', !!pay && pence.reduce((a, b) => a + b, 0) === 195000 && pence.every(x => x === 32500), J(pence));
    ACT.cbrEnt({ dataset: { p: id, o: o3.id } }); fill({ '#cbr-ec': '12' }); radio('cbr-eo', 'in'); press();
    ok('CBR-F6 entitlements are recorded as provisional and stay outside the package', J(cbrEnt(id, o3.id) && [cbrEnt(id, o3.id).classes, cbrEnt(id, o3.id).onb]) === J([12, 'in']) && !J(cb8Work(pr)).includes('"classes"'));
    ACT.cb8SaApprove({ dataset: { p: id } }); const rs = document.querySelector('#rsn'); if (rs) reason('CBR approval'); closeModal();
    const cur = s4PlanCur(id), k0 = cur && cb8PkgKey(cur.pkg);
    ok('CBR-F7 (22) approval saves a plan version carrying the frozen package', !!cur && !!cur.pkg && Object.isFrozen(cur.pkg) && cb8Wf(pr).status === 'Approved', cur ? 'v' + cur.v : 'none');
    ACT.cbrEnt({ dataset: { p: id, o: o3.id } }); fill({ '#cbr-ec': '14' }); press();
    ok('CBR-F8 (22) changing a provisional entitlement doesn\'t touch the approved package or its approval', cb8Wf(pr).status === 'Approved' && cb8PkgKey(s4PlanCur(id).pkg) === k0 && s4PlanCur(id).v === cur.v);
  });

  await T('CBR-G offer letters by learner type', async () => {
    SA(); step(id, 'documents');
    ok('CBR-G1 one card per learner type, then the programme letter (the existing panel: merge fields, template, versions)', qa('.cbr-lc').length === 2 && !!q('[data-act="chLetterUp"]') && /Programme letter/.test(q('.cb-body').textContent) && !!q('.cbr-lc[data-lt="D-SelfPaced"]') && !!q('.cbr-lc[data-lt="D-FullyAssisted"]'));
    ACT.cbrLetterUp({ dataset: { p: id, lt: '' } }); ACT.chLetterSample(); reason('Programme letter');
    ACT.cbrLetterUp({ dataset: { p: id, lt: 'D-SelfPaced' } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = 'Dear {{full_name}},\n\nSelf-Paced terms for {{programme}}.\n\nTo confirm your place, please {{payment_terms}}.'; reason('Self-Paced template');
    const L = chLetters(id);
    ok('CBR-G2 (23) a separate Self-Paced template: a new version tagged with the type, in the same versioned list', L.length === 2 && L[1].lt === 'D-SelfPaced' && Object.isFrozen(L[1]) && cbrUsesOwn(id, 'D-SelfPaced') && !cbrUsesOwn(id, 'D-FullyAssisted'));
    step(id, 'documents'); ok('CBR-G3 Self-Paced shows its own template, Fully Assisted the programme letter', /Own template · Version/.test(q('.cbr-lc[data-lt="D-SelfPaced"]').textContent) && /Programme letter · Version/.test(q('.cbr-lc[data-lt="D-FullyAssisted"]').textContent)); // CBR-2 (PD-CBR2-08): card wording
    ACT.s4LetterPrev({ dataset: { id, v: '2' } }); ok('CBR-G4 a preview is labelled as a template, not a signed document', !!MODAL && /template preview/.test(MODAL.title) && /not a signed document/.test(MODAL.body)); closeModal();
    ok('CBR-G5 the issuer stays as written in the template (not replaced): the stored text is the uploaded text and nothing offers to change it', Object.isFrozen(chLetters(id)[1]) && Object.isFrozen(chLetters(id)[1].text) && !qa('.cbr2-lc input, .cbr2-lc select').length); // CBR-2: was the explanatory note
  });

  await T('CBR-H review and publish', async () => {
    SA(); step(id, 'review'); const t = q('.cb-rv') ? q('.cb-rv').textContent : '';
    ok('CBR-H1 (25) the review summarises learner types, resources, assessments by scope, both locations, fees by learner type and templates', ['Learner types', 'Resources', 'By scope', 'Questions', 'Workplace', 'Academy', 'By learner type', 'Template per learner type'] /* CBR-2 (PD-CBR2-07): provisional display duration and entitlements are not summarised */.every(s => t.includes(s)), t.slice(0, 120));
    INP.mapChange({ checked: false, dataset: { id: dU.id, q: dU.qs[0].id, c: dU.qs[0].crit[0] } });
    let bl = cbRvChecks(pr).block.map(x => x.msg); ok('CBR-H2 blocking items are listed (an assessment question not mapped, letters, events …)', Array.isArray(bl), J(bl));
    INP.mapChange({ checked: true, dataset: { id: dU.id, q: dU.qs[0].id, c: s2Crit(dU).find(c => c.type === 'Knowledge').code } });
    dM.qs.filter(x => !x.crit.length).forEach(x => INP.mapChange({ checked: true, dataset: { id: dM.id, q: x.id, c: s2Crit(dM).find(c => c.type === 'Knowledge').code } }));
    bl = cbRvChecks(pr).block.map(x => x.msg); step(id, 'review'); const btn = q('[data-act="cbPublish"]');
    ok('CBR-H3 the publish button follows the existing checks', !!btn && btn.disabled === !!bl.length, J(bl));
    if (!bl.length) { ACT.cbPublish({ dataset: { id } }); crPd(); reason('CBR publish'); closeModal(); }
    ok('CBR-H4 (25) publishing through the existing action makes Version 1 live', pr.status === 'Active', pr.status + ' ' + J(bl));
    const pub = n5PubOf(id, 1);
    ok('CBR-H5 the published observation configuration froze the course evidence and guidance', !!pub && Object.isFrozen(pub) && pub.cbrGuide && pub.cbrGuide.wp === 'Agree the visit with the manager first.' && J(((pub.ol1snap || {}).wp || [])[1] && pub.ol1snap.wp[1].ev) === J(['notes', 'photos']));
    step(id, 'details'); ok('CBR-H6 after publishing, learner types are read-only until a new version', !q('[data-act="cbr2LtAdd"]') && !q('.cbr2-lt input') && /Self-Paced/.test(q('.cbr2-lts').textContent)); // CBR-2: the cards, read-only
    const a0 = ADMIN.audit.length; ACT.cbrLt({ dataset: { p: id, t: 'D-SelfPaced' } });
    ok('CBR-H6 …and a direct change is refused (logged)', !MODAL && blocked(a0) === 1);
  });

  await T('CBR-I permissions, retired programmes, a course without observations', async () => {
    FA(); const a0 = ADMIN.audit.length, s0 = J([CBR(), cbTree(pr), s2Defs().map(d => [d.id, d.scope, d.qs.map(x => [x.crit, x.key])]), chLetters(id).length, S4B().res.length]);
    ACT.cbrLt({ dataset: { p: id } }); ACT.cbrDisp({ dataset: { p: id } }); ACT.cbrResNew({ dataset: { p: id, lvl: 'prog' } }); ACT.cbrResAdd({ dataset: { p: id, lvl: 'prog' } }); ACT.cbrAsgNew({ dataset: { p: id } }); ACT.cbrQKey({ dataset: { id: dM.id, q: dM.qs[0].id } }); ACT.cbrAsgScope({ dataset: { id: dM.id } });
    ACT.cbrObsLoc({ dataset: { p: id, loc: 'wp', v: 'off' } }); ACT.cbrObsCrit({ dataset: { p: id, loc: 'wp', k: catId } }); ACT.cbrEnt({ dataset: { p: id, o: cb8Work(pr).opts[0].id } }); ACT.cbrLetterUp({ dataset: { p: id, lt: 'D-FullyAssisted' } }); ACT.cbrLetterUse({ dataset: { p: id, lt: 'D-SelfPaced', v: 'shared' } });
    INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: 'x' } });
    const s1 = J([CBR(), cbTree(pr), s2Defs().map(d => [d.id, d.scope, d.qs.map(x => [x.crit, x.key])]), chLetters(id).length, S4B().res.length]);
    ok('CBR-I1 (26) a Finance Admin can change none of it: every action refused and logged, nothing stored', !MODAL && s1 === s0 && blocked(a0) >= 12, 'blocked ' + blocked(a0));
    SA(); step('NV-L3O', 'details'); const ro = qa('[data-act^="cbr"]').length; ['curriculum', 'assessments', 'payments', 'documents'].forEach(k => { step('NV-L3O', k); });
    ok('CBR-I2 a retired programme shows no builder write controls', ro === 0 && !qa('[data-act^="cbr"]').length);
    const a1 = ADMIN.audit.length; ACT.cbrLt({ dataset: { p: 'NV-L3O' } }); ACT.cbrResNew({ dataset: { p: 'NV-L3O', lvl: 'prog' } }); ACT.cbrAsgNew({ dataset: { p: 'NV-L3O' } });
    ok('CBR-I3 …and refuses them when called directly (logged)', !MODAL && blocked(a1) >= 3);
    pr2 = make({ obs: false }); step(pr2.id, 'assessments');
    ok('CBR-I4 (4) a course without observations has six steps; Next from Assessments goes to Fees', J(keys()) === J(['details', 'curriculum', 'assessments', 'payments', 'documents', 'review']) && q('.cbr-foot .btn-primary[data-go]').dataset.tab === 'payments');
    step(pr2.id, 'review'); ok('CBR-I5 …Review is step 6 and references renumber (no "Section 7")', q('.cbr-st.cur .cbr-n').textContent === '6' && !/Section 7/.test(q('.cb').textContent));
  });

  await T('CBR-J navigation and unsaved work', async () => {
    SA(); step(pr2.id, 'details'); const t = q('#np-t'); t.value = 'CBR unsaved title'; t.dispatchEvent(new Event('input', { bubbles: true }));
    CB_DIRTY = null; step(pr2.id, 'curriculum'); step(pr2.id, 'details');
    ok('CBR-J1 (27) what was typed in Course Details is kept when moving between steps', q('#np-t').value === 'CBR unsaved title' && !!q('.cb-unsaved'));
    ACT.cbDetDiscard({ dataset: { key: pr2.id } }); press(); step(pr2.id, 'details'); ok('CBR-J2 …and can be discarded', q('#np-t').value !== 'CBR unsaved title');
  });

  // ================= Identifiers and provisional records (CBR review) =================
  await T('CBR-L criterion and module codes stay unique; existing duplicates are detected, never renumbered', async () => {
    SA(); const p3 = make({ obs: false }), id3 = p3.id;
    add8('ch8AddUnit', { id: id3 }, { '#u-c': 'U81', '#u-t': 'Codes' }); add8('ch8AddMod', { id: id3, u: 0 }, { '#m-t': 'First' }); add8('ch8AddMod', { id: id3, u: 0 }, { '#m-t': 'Second' });
    ACT.s3WRemove({ dataset: { id: id3, u: '0', m: '0' } }); reason('Not needed'); add8('ch8AddMod', { id: id3, u: 0 }, { '#m-t': 'Third' });
    const u = cbTree(p3)[0];
    ok('CBR-L1 a module added after a Draft removal takes the next free code (no second M2)', J(u.mods.map(m => m.code)) === J(['M2', 'M3']) && ADMIN.audit.some(a => a.action === 'Module code assigned' && a.before === 'M2' && a.after === 'M3'), J(u.mods.map(m => m.code)));
    add8('ch8AddLo', { id: id3, u: 0, m: 0 }, { '#lo-t': 'Knowledge one', '#lo-y': 'Knowledge' });
    ['A', 'B', 'C'].forEach(t => add8('ch8AddCrit', { id: id3, u: 0, m: 0, l: 0 }, { '#c-d': 'Criterion ' + t, '#c-e': 'Written account' }));
    ACT.s3WRemove({ dataset: { id: id3, u: '0', m: '0', l: '0', c: '0' } }); reason('Not needed'); add8('ch8AddCrit', { id: id3, u: 0, m: 0, l: 0 }, { '#c-d': 'Criterion D', '#c-e': 'Written account' });
    const cs = cbTree(p3)[0].mods[0].los[0].crit.map(c => c.code);
    ok('CBR-L2 a criterion added after a removal takes the next free number in its Learning Outcome (no second 81 1.3)', new Set(cs).size === cs.length && cs.includes('81 1.4') && ADMIN.audit.some(a => a.action === 'Criterion code assigned'), J(cs));
    add8('ch8AddLo', { id: id3, u: 0, m: 1 }, { '#lo-t': 'Knowledge two', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id: id3, u: 0, m: 1, l: 0 }, { '#c-d': 'Criterion E', '#c-e': 'Written account' });
    const all = cbTree(p3)[0].mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code)));
    ok('CBR-L3 every criterion code in the unit is unique across its modules', new Set(all).size === all.length && !cbrDupCodes(p3).length, J(all));
    // A duplicate already recorded (for example from before this check): detected, not renumbered
    const t = cbTree(p3)[0], dup = t.mods[0].los[0].crit[0].code; t.mods[1].los[0].crit[0].code = dup; const before = J(cbTree(p3));
    ok('CBR-L4 an existing duplicate is detected and blocks publishing the version, pointing to Curriculum', cbRvChecks(p3).block.some(b => b.sec === 'curriculum' && b.msg.includes(dup) && /used twice/.test(b.msg)));
    ACT.cbrAsgNew({ dataset: { p: id3, lvl: 'unit', u: 'U81' } }); fill({ '#cna-t': 'CBR ambiguity check' }); press();
    const d = s2Defs().find(x => x.title === 'CBR ambiguity check'); ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Which one?' }); press();
    const a0 = ADMIN.audit.length; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: dup } });
    ok('CBR-L5 the ambiguous code can\'t be mapped (refused, logged) — it can\'t silently bind to either criterion', !d.qs[0].crit.includes(dup) && since(a0).some(x => x.action === 'Blocked: map an ambiguous criterion code'));
    setUi('cbr2A.' + d.id, '1'); step(id3, 'assessments');
    ok('CBR-L5 …the mapping list shows it disabled, with the reason', qa(`.cbr2-map input[data-c="${dup}"]`).length > 0 && qa(`.cbr2-map input[data-c="${dup}"]`).every(x => x.disabled) && /code used twice/.test(q(`details.cbr2-a[data-id="${d.id}"]`).textContent)); // CBR-2: Map Criteria in place
    d.qs[0].crit = [dup]; const a1 = ADMIN.audit.length; ACT.pubAsg({ dataset: { id: d.id } });
    ok('CBR-L6 an assessment already mapped to an ambiguous code can\'t be published (refused, logged)', d.status === 'Draft' && !MODAL && since(a1).some(x => x.action === 'Blocked: publish (ambiguous criterion codes)')); closeModal();
    ok('CBR-L7 nothing was renumbered: the recorded codes are exactly as they were', J(cbTree(p3)) === before);
  });

  await T('CBR-M provisional records: per version, never read for learners', async () => {
    SA(); const w0 = J(STORE.worlds), v1 = cbrCfgOf(pr, 1);
    ok('CBR-M1 learner types published with Version 1 stay as recorded', !!v1 && v1.v === 1 && cbrTypes(pr, 1).find(t => t.id === 'D-SelfPaced').win.n === 12);
    step(id, 'review'); ACT.s3WizVersion({ dataset: { id } }); reason('Version 2'); const v2 = cbDraftV(pr);
    ACT.cbrLt({ dataset: { p: id, t: 'D-SelfPaced' } }); fill({ '#lt-w-n': '9' }); press();
    ok('CBR-M2 a change in the new draft version is kept with that version; Version 1\'s record is unchanged', v2 === 2 && cbrTypes(pr, 2).find(t => t.id === 'D-SelfPaced').win.n === 9 && cbrTypes(pr, 1).find(t => t.id === 'D-SelfPaced').win.n === 12);
    ok('CBR-M3 Course Details shows the draft version\'s own completion window (9 months); nothing a learner sees changed', (step(id, 'details'), q('.cbr2-lt[data-t="D-SelfPaced"] input[data-f="win"]').value === '9') && J(STORE.worlds) === w0); // CBR-2: was the provisional labels
    const o = cb8Work(pr).opts.find(x => x.label === 'Self-Paced — monthly'), pv = s4PlanCur(id).v, at = cbrEntAt(id, pv, o.id);
    ok('CBR-M4 the entitlements on file when plan version ' + pv + ' was approved are kept with it (frozen)', !!at && at.classes === 12 && at.onb === 'in' && Object.isFrozen(at), J(at));
    ok('CBR-M4 …a later change (14 classes) leaves that record unchanged', cbrEnt(id, o.id).classes === 14 && cbrEntAt(id, pv, o.id).classes === 12);
    ok('CBR-M5 no learner record changed through any provisional setting (learner types, display duration, entitlements)', J(STORE.worlds) === w0);
  });

  // ================= The client demo =================
  await T('CBR-K client demo', async () => {
    fxLoadClient(); SA(); const pr = ADMIN.programmes.find(p => p.id === 'NV-N1'), P0 = J(cb8Work(pr).opts.map(o => [o.label, o.fee, o.obsWp, o.obsOff, o.pay.map(x => x.k)])), dep0 = J(cb8Work(pr).dep), plan0 = s4PlanCur('NV-N1').v;
    const sig0 = J(Object.entries(STORE.worlds).filter(([, w]) => w && w.signup && w.signup.sig).map(([k, w]) => [k, w.signup.sig])), snap0 = J(n5PubOf('NV-N1', 1));
    const bad = []; ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review'].forEach(k => { step('NV-N1', k); if (/undefined|NaN|\[object/.test(q('.cb').textContent)) bad.push(k); if (cur() !== k) bad.push(k + ' not current'); });
    ok('CBR-K1 (28) the client demo opens on all seven steps without broken values', !bad.length, J(bad));
    step('NV-N1', 'payments');
    ok('CBR-K2 (28) the accepted £1,800 / £2,600 demo prices and observation fees are shown, grouped by learner type', /£1,800\.00/.test(q('.cbr-fg[data-lt="D-SelfPaced"]').textContent) && /£2,600\.00/.test(q('.cbr-fg[data-lt="D-FullyAssisted"]').textContent));
    // learners see Published placements in their programme / unit group
    const r = S4B().res.find(x => x.pid === 'NV-N1' && x.status === 'Published'), w = Object.values(STORE.worlds).find(x => x && x.flags && x.flags.nvq && x.flags.admitted && x.tree && s4PidOfW(x) === 'NV-N1');
    step('NV-N1', 'curriculum'); ACT.cbrResAdd({ dataset: { p: 'NV-N1', lvl: 'prog' } }); tick('.cbr-rp', [r.id]); press(); const a = cbrAttsLive('NV-N1').find(x => x.rid === r.id && x.lvl === 'prog');
    s4bSyncW(w); const g = (w.resources || []).find(x => x.cbr === 'prog');
    ok('CBR-K3 a library resource placed on the programme reaches its learners in "Programme resources" (same record)', !!a && !!g && g.items.some(i => i.id === 'cbr-' + a.id && i.s4id === r.id), w ? w.me.id : 'no learner');
    ACT.cbrResRm({ dataset: { p: 'NV-N1', a: a.id } }); press(); s4bSyncW(w);
    ok('CBR-K4 …and leaves when the placement is removed', !((w.resources || []).find(x => x.cbr === 'prog') || { items: [] }).items.some(i => i.id === 'cbr-' + a.id));
    // a scoped assessment with an answer key, published to the demo batch: the learner's copy has no key
    step('NV-N1', 'assessments'); const t0 = cbTree(pr)[0], m0 = t0.mods[0];
    ACT.cbrAsgNew({ dataset: { p: 'NV-N1', lvl: 'mod', u: t0.code, m: m0.code } }); fill({ '#cna-t': 'CBR demo module assessment' }); press();
    const d = s2Defs().find(x => x.title === 'CBR demo module assessment'); ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Describe one way you protect dignity.' }); press();
    INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: s2Crit(d).find(c => c.type === 'Knowledge').code } });
    ACT.cbrQKey({ dataset: { id: d.id, q: d.qs[0].id } }); fill({ '#aq-k': 'SECRET-CBR-KEY: privacy, choice, respect' }); press();
    ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish to the demo batch');
    const copies = d.copies.map(c => STORE.worlds[c.v]).filter(Boolean);
    ok('CBR-K5 (15) the published assessment reached learners, and no learner record contains the answer key', d.status === 'Published' && copies.length > 0 && copies.every(x => !J(x).includes('SECRET-CBR-KEY')), plural(copies.length, 'learner'));
    if (copies[0]) { const v = d.copies[0].v; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignment', { id: d.id }); ok('CBR-K6 (15) …nor does the learner\'s assignment page', /Describe one way you protect dignity/.test(main()) && !/SECRET-CBR-KEY/.test(main())); SA(); }
    // per-type template: the signed letters and the published observation snapshot never change
    ACT.cbrLetterUp({ dataset: { p: 'NV-N1', lt: 'D-SelfPaced' } }); ACT.chLetterSample(); reason('Self-Paced template'); render();
    const sig1 = J(Object.entries(STORE.worlds).filter(([, w]) => w && w.signup && w.signup.sig).map(([k, w]) => [k, w.signup.sig]));
    ok('CBR-K7 (24) existing signed letters, their snapshots and signatures are unchanged', sig1 === sig0 && sig0.length > 2);
    const vSP = chLetters('NV-N1').length, base = chLetters('NV-N1').filter(x => !x.lt).pop().v, opt = cb8Work(pr).opts.find(o => o.mode === 'Self-Paced'), optF = cb8Work(pr).opts.find(o => o.mode === 'Fully Assisted');
    STORE.worlds.ZZCBR1 = { signup: { letterV: vSP, prog: 'NV-N1', plan: { opt: { id: opt.id, mode: 'Self-Paced' } } }, nvq: { title: pr.title }, flags: {} };
    STORE.worlds.ZZCBR2 = { signup: { letterV: vSP, prog: 'NV-N1', plan: { opt: { id: optF.id, mode: 'Fully Assisted' } } }, nvq: { title: pr.title }, flags: {} };
    STORE.worlds.ZZCBR3 = { signup: { letterV: base, prog: 'NV-N1', plan: { opt: { id: opt.id, mode: 'Self-Paced' } } }, nvq: { title: pr.title }, flags: {} };
    cbrLetterSync(); const l1 = STORE.worlds.ZZCBR1.signup.letterV, l2 = STORE.worlds.ZZCBR2.signup.letterV, l3 = STORE.worlds.ZZCBR3.signup.letterV;
    ['ZZCBR1', 'ZZCBR2', 'ZZCBR3'].forEach(k => delete STORE.worlds[k]);
    ok('CBR-K8 (23) a new Self-Paced applicant gets the Self-Paced template; a Fully Assisted one the programme letter; one who started earlier keeps theirs', l1 === vSP && l2 === base && l3 === base, J([l1, l2, l3, vSP, base]));
    ok('CBR-K9 (19) the published observation configuration of Version 1 is unchanged', J(n5PubOf('NV-N1', 1)) === snap0);
    ok('CBR-K10 (28) prices, observation fees, payment options, deposit and plan version are unchanged', J(cb8Work(pr).opts.map(o => [o.label, o.fee, o.obsWp, o.obsOff, o.pay.map(x => x.k)])) === P0 && J(cb8Work(pr).dep) === dep0 && s4PlanCur('NV-N1').v === plan0);
    // persistence: the builder's records are part of the demo snapshot the browser saves and restores on refresh (the same encoder;
    // saving itself is off while a suite pins the legacy fixture)
    const back = fcpDecode(JSON.parse(JSON.stringify(fcpEncode(fcpRoots()))));
    ok('CBR-K11 (27) the saved demo snapshot carries the builder records and restores them (placements, templates, learner-type tags)', !!back.STORE.cbr && back.STORE.cbr.att['NV-N1'].length === cbrAtts('NV-N1').length && (back.STORE.cbr.letter['NV-N1'] || {})['D-SelfPaced'] === 'own' && back.STORE.chLetters['NV-N1'].some(x => x.lt === 'D-SelfPaced' && Object.isFrozen(x)) && /(^|,)cbr(,|$)/.test(Object.keys(STORE).sort().join(',')));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
