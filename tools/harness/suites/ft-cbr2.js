// CBR-2 — the approved course builder layout (6 Nov 2026; PD-CBR2-* in PROVISIONAL-DECISIONS.md). Legacy fixture.
// Field order and placement in Course Details, learner-type cards and the observation checkbox; resources at programme, unit and module
// level; module / unit / full-course assessments with questions, written answer keys, scoped mapping and assessment answer-key
// documents (PDF / DOC / DOCX, versioned, staff only, never in learner data, refused in the handlers); Workplace and Academy columns with
// library categories and criteria ticked in place; Allow Deposit per fee option and several instalment options; a real sign-up choosing
// among them; Finance re-approval and pinning; per-type offer letters and Choose Template; Review & Publish; saved data and permissions.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CBR-2 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const J = o => JSON.stringify(o);
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const blocked = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => /^Blocked/.test(x.action)).length;
  const inp = (act, ds, v, extra = {}) => INP[act]({ dataset: ds, value: v, id: 'cbr2-t-' + Math.random().toString(36).slice(2), ...extra });
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  let n0 = 0;
  // A Level 3 course made through the builder (both learner types from its fee options), with observations
  const make = (o = {}) => {
    SA(); go('a-programmes'); ACT.chProgNew(); const n = ++n0;
    fill({ '#np-t': 'CBR2 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (8800 + n) + '/2', '#cbc3-dd-n': '12', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    const box = document.querySelector(o.obs !== false ? 'main #cbr2-obs-yes' : 'main #cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box); // CBC1 (CBR-01): an explicit Yes / No
    document.querySelectorAll('main .cr-dm-c').forEach(x => { x.checked = true; });
    [{ l: 'Fully Assisted — standard', f: 2600, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = ACT.cbDetCreate(); closeModal(); return pr;
  };
  const curr = pr => { const id = pr.id;
    add8('ch8AddUnit', { id }, { '#u-c': 'U81', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/652/8101' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Care planning', '#m-ab': 'C/652/8102' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain values', '#c-e': 'Written account' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe consent', '#c-e': 'Written account' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Work in a person-centred way', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Support choices', '#c-e': 'Observed at work' });
    add8('ch8AddLo', { id, u: 0, m: 1 }, { '#lo-t': 'Agree a care plan', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 1, l: 0 }, { '#c-d': 'Describe care planning', '#c-e': 'Written account' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U82', '#u-t': 'Safeguarding' }); add8('ch8AddMod', { id, u: 1 }, { '#m-t': 'Recognising harm', '#m-ab': 'C/652/8201' });
    add8('ch8AddLo', { id, u: 1, m: 0 }, { '#lo-t': 'Recognise abuse', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 1, m: 0, l: 0 }, { '#c-d': 'Name types of harm', '#c-e': 'Written account' });
  };
  let pr = null, id = null;

  /* ================= 1–2. Course Details ================= */
  await T('CBR2-A course details', async () => {
    SA(); go('a-programmes', { id: 'new', tab: 'details' });
    const lab = s => { const f = q(s) && q(s).closest('.field'); const l = f && (f.querySelector(':scope > label') || f.querySelector(':scope > legend')); return l ? l.textContent.trim() : ''; };
    ok('CBR2-A1 a new course shows the approved fields, labelled, in two columns, the description last', J(qa('.cbr2-grid > .field').map(f => (f.querySelector(':scope > label, :scope > legend') || {}).textContent)) === J(['Course Name', 'Awarding Body', 'NVQ Level', 'Awarding Body Course Code', 'Course Duration' /* FB2 (PD-FB2-01): was 'Display Duration' */, 'Guided Learning Hours (GLH)', 'Total Qualification Time (TQT)', 'Credit Value', 'Course Description']) && q('.cbr2-grid > .field:last-child').classList.contains('full'), J(qa('.cbr2-grid > .field').map(f => (f.querySelector(':scope > label, :scope > legend') || {}).textContent)));
    ok('CBR2-A2 no Academy course code and no internal-ID field in the form; fees only in the "needed to create" block', !q('#np-code') && !/Internal programme ID/.test(q('.cbr2-grid').textContent) && !!q('.cbr2-newfees .r1-np-list'));
    ok('CBR2-A3 "Observation required for this course" (explicit Yes / No) after a divider; the old Yes / No card is not shown', !!q('hr.cbr2-hr + .cbr2-obs #cbr2-obs-yes') && !!q('.cbr2-obs #cbr2-obs-no') /* CBC1 (CBR-01): was one checkbox */ && /Observation required for this course/.test(q('.cbr2-obs').textContent) && q('#np-obs-yes').closest('[hidden]') !== null);
    pr = make(); id = pr && pr.id;
    ok('CBR2-A4 saving creates the Draft and records "Observation required" from the checkbox', !!pr && cbObsOf(pr) === true && S.params.tab === 'curriculum');
    step(id, 'details');
    ok('CBR2-A5 the saved course shows the same order; the internal ID is kept automatically', lab('#np-t') === 'Course Name' && lab('#np-q-body') === 'Awarding Body' && lab('#np-l') === 'NVQ Level' && lab('#np-r') === 'Awarding Body Course Code' && /Course Duration/.test((q('.cbr2-grid .cbc3-dd legend') || {}).textContent || '') && !q('.cbr2-grid #np-d') /* FB2 (PD-FB2-01): the Course Duration is the one duration (CBC3: Display Duration here, the payment schedule duration in Fees & Payment Plans) */ && /^NV-N\d+$/.test(pr.id) && !q('.cbr2-grid .aafa-pid'));
    fill({ '#np-q-body': 'NCFE CACHE', '#np-q-glh': '400', '#np-q-tqt': '580', '#np-q-credits': '58', '#np-ds': 'A diploma for carers.' }); ACT.cbDetSave({ dataset: { id } });
    ok('CBR2-A6 the fields save through the existing save (audited) and survive moving away and back', pr.qual.body === 'NCFE CACHE' && pr.qual.glh === 400 && pr.qual.credits === 58 && pr.desc === 'A diploma for carers.' && (step(id, 'curriculum'), step(id, 'details'), q('#np-q-body').value === 'NCFE CACHE'));
    fill({ '#np-q-glh': '12.5' }); const a0 = ADMIN.audit.length; ACT.cbDetSave({ dataset: { id } });
    ok('CBR2-A7 an invalid number is refused with a field message', pr.qual.glh === 400 && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Qualification details changed')); ACT.cbDetDiscard({ dataset: { key: id } }); press();
    // learner types
    step(id, 'details');
    ok('CBR2-A8 learner types are compact cards: Label and Delivery Mode on one row, then Completion Window, with Remove', qa('.cbr2-lt').length === 2 && qa('.cbr2-lt').every(c => c.querySelectorAll('.cbr2-lt-r .field').length === 2 && !!c.querySelector('.cbr2-win') && !!c.querySelector('[data-act="cbr2LtRm"]')) && !/Tutoring period|Maximum window/.test(q('.cbr2-lts').textContent));
    const lb = q('.cbr2-lt[data-t="D-SelfPaced"] input[data-f="label"]'); lb.value = 'Self-Paced learners'; INP.cbr2Lt(lb);
    const card = q('.cbr2-lt[data-t="D-SelfPaced"]'); card.querySelector('input[data-f="win"]').value = '12'; INP.cbr2Lt(card.querySelector('input[data-f="win"]'));
    const sp = cbrTypes(pr).find(t => t.id === 'D-SelfPaced');
    ok('CBR2-A9 label and completion window change in place (the ID is kept; audited)', !!sp && sp.label === 'Self-Paced learners' && sp.win && sp.win.n === 12 && ADMIN.audit.some(x => x.action === 'Learner type changed'));
    const fa = q('.cbr2-lt[data-t="D-FullyAssisted"] input[data-f="win"]'); fa.value = '99'; INP.cbr2Lt(fa);
    ok('CBR2-A10 an invalid completion window is refused (1–60)', !cbrTypes(pr).find(t => t.id === 'D-FullyAssisted').win);
    ACT.cbr2LtAdd({ dataset: { p: id } }); fill({ '#lt-l': 'Employer-funded', '#lt-w-n': '9' }); document.querySelector('#lt-m').value = 'Fully Assisted'; press();
    ok('CBR2-A11 Add Learner Type adds a third card', cbrTypes(pr).length === 3 && cbrTypes(pr).some(t => t.label === 'Employer-funded' && t.win.n === 9));
    const lt3 = cbrTypes(pr).find(t => t.label === 'Employer-funded'); ACT.cbr2LtRm({ dataset: { p: id, t: lt3.id } }); press();
    ok('CBR2-A12 removing a learner type keeps its record (Retired) and the fee options', cbrTypes(pr).length === 2 && cbrTypesAll(pr).some(t => t.id === lt3.id && t.status === 'Retired'));
    const a1 = ADMIN.audit.length; ACT.cbr2LtRm({ dataset: { p: id, t: 'D-SelfPaced' } });
    ok('CBR2-A13 a learner type with fee options (no other type of its mode) can\'t be removed (refused, logged)', cbrTypes(pr).some(t => t.id === 'D-SelfPaced') && blocked(a1) === 1 && !MODAL);
    ok('CBR2-A14 learner types and fee options stay distinct: two fee options, their IDs unchanged', cb8Work(pr).opts.filter(o => o.status === 'Active').length === 2 && cbrTypes(pr).every(t => /^D-/.test(t.id)));
  });

  /* ================= 2. Observation checkbox ================= */
  await T('CBR2-B observation checkbox', async () => {
    SA(); step(id, 'details'); const box = q('#cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box); /* CBC1: No */
    ok('CBR2-B1 unticking saves at once and hides the Observations step (no configuration yet: no question asked)', cbObsOf(pr) === false && !MODAL && !qa('.cbr-st').some(b => b.dataset.tab === 'observations'));
    step(id, 'details'); const b2 = q('#cbr2-obs-yes'); b2.checked = true; INP.cbr2Obs(b2); /* CBC1: Yes */
    ok('CBR2-B2 ticking it shows the step again', cbObsOf(pr) === true && qa('.cbr-st').some(b => b.dataset.tab === 'observations'));
    ACT.cbrObsLoc({ dataset: { p: id, loc: 'wp', v: 'on' } });
    step(id, 'details'); const b3 = q('#cbr2-obs-no'); b3.checked = true; INP.cbr2Obs(b3); /* CBC1: No */
    ok('CBR2-B3 with configuration recorded, unticking asks first and keeps it until confirmed', !!MODAL && cbObsOf(pr) === true); press();
    ok('CBR2-B4 …and after confirming, the configuration is kept (Workplace still recorded)', cbObsOf(pr) === false && n5Shown(pr).workplace === 'Permitted');
    step(id, 'details'); const b4 = q('#cbr2-obs-yes'); b4.checked = true; INP.cbr2Obs(b4); /* CBC1: Yes */
  });

  /* ================= 3. Curriculum and resources ================= */
  await T('CBR2-C curriculum and resources', async () => {
    SA(); step(id, 'curriculum'); curr(pr); step(id, 'curriculum');
    const tr = cbTree(pr);
    ok('CBR2-C1 Programme Resources at the top with Add Resource', !!q('.cb-cur > #cbr-resources:first-child .cbr2-res[data-lvl="prog"] [data-act="cbr2Res"]') && /Programme Resources/.test(q('#cbr-resources').textContent));
    ok('CBR2-C2 units read "Unit N — Title" with Edit Unit and a Resource action; modules "Module N.M — Title" with a Resource action', J(qa('details[data-cbu] > summary .cbr2-lvl').map(x => x.textContent)) === J(['Unit 1 —', 'Unit 2 —']) && qa('details[data-cbu] > summary [data-act="cbCurEdit"]').every(b => /Edit Unit/.test(b.textContent)) && qa('.cbr2-res[data-lvl="unit"]').length === 2 && J(qa('details.cb-cur-m > summary .cbr2-lvl').map(x => x.textContent)) === J(['Module 1.1 —', 'Module 1.2 —', 'Module 2.1 —']) && qa('.cbr2-res[data-lvl="mod"]').length === 3);
    ok('CBR2-C3 Learning Outcomes read "Learning Outcome N" with the description below; criteria "Criterion x.y"; Add Criterion after the criteria', /Learning Outcome 1/.test(q('.cb-cur-lo .cb-cur-loh strong').textContent) && q('.cb-cur-lo > .cbr2-lod').textContent === 'Understand person-centred care' && /^Criterion$/.test(q('li.cb-cur-c .cbr2-lvl').textContent) && q('.cb-cur-lo > :last-child').matches('[data-act="ch8AddCrit"]'));
    ok('CBR2-C4 Add Learning Outcome ends each module, Add Module each unit, Add Unit the tree', qa('details.cb-cur-m > .kids > :last-child').every(x => x.matches('[data-act="ch8AddLo"]')) && qa('details[data-cbu] > .kids > :last-child').every(x => x.matches('[data-act="ch8AddMod"]')) && !!q('.cb-cur-tree + .cbr2-addu[data-act="ch8AddUnit"]'));
    ok('CBR2-C5 no Resources & Delivery tab, no explanatory paragraph, no panel tabs', !qa('.cb-panels').length && !/Resources & Delivery|Programme → Unit → Module/.test(main()));
    ok('CBR2-C6 criterion codes stay stable and unique', new Set(tr.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code))))).size === 5);
    // Resource: library or new, at each level
    ACT.cbr2Res({ dataset: { p: id, lvl: 'prog' } });
    ok('CBR2-C7 Resource offers "Select from the library" and "Create a new resource"', !!document.querySelector('#modal-root [data-act="cbr2ResGo"][data-k="lib"]') && !!document.querySelector('#modal-root [data-act="cbr2ResGo"][data-k="new"]:not([disabled])'));
    ACT.cbr2ResGo(document.querySelector('#modal-root [data-act="cbr2ResGo"][data-k="new"]')); document.querySelector('#rs-y').value = 'Link'; fill({ '#rs-t': 'CBR2 handbook', '#rs-u': 'https://example.org/h' }); press();
    const r = S4B().res.find(x => x.title === 'CBR2 handbook'), n0r = S4B().res.length;
    ACT.cbr2Res({ dataset: { p: id, lvl: 'unit', u: 'U82' } }); ACT.cbr2ResGo(document.querySelector('#modal-root [data-act="cbr2ResGo"][data-k="lib"]')); document.querySelectorAll('#modal-root .cbr-rp').forEach(x => { x.checked = x.value === r.id; }); press();
    ACT.cbr2Res({ dataset: { p: id, lvl: 'mod', u: 'U81', m: tr[0].mods[1].code } }); ACT.cbr2ResGo(document.querySelector('#modal-root [data-act="cbr2ResGo"][data-k="lib"]')); document.querySelectorAll('#modal-root .cbr-rp').forEach(x => { x.checked = x.value === r.id; }); press();
    step(id, 'curriculum');
    ok('CBR2-C8 one library record shown at programme, unit and module level (no copy)', !!r && qa(`.cbr-ri[data-r="${r.id}"]`).length === 3 && S4B().res.length === n0r && !!q(`.cbr2-res[data-lvl="unit"][data-u="U82"] .cbr-ri[data-r="${r.id}"]`) && !!q(`.cbr2-res[data-lvl="mod"][data-m="${tr[0].mods[1].code}"] .cbr-ri[data-r="${r.id}"]`));
    as('FA')(); const a0 = ADMIN.audit.length; ACT.cbr2Res({ dataset: { p: id, lvl: 'prog' } });
    ok('CBR2-C9 (permission) Finance can\'t place resources: refused in the handler', !MODAL && ADMIN.audit.length > a0); SA();
  });

  /* ================= 4–7. Assessments ================= */
  let dM = null, dU = null, dP = null;
  await T('CBR2-D assessments', async () => {
    SA(); step(id, 'assessments'); const tr = cbTree(pr), m0 = tr[0].mods[0];
    ok('CBR2-D1 Assessment Types with Manage Types at the top; Full-Course, Unit and Module groups each with Add Assessment', !!q('.cbr2-types [data-act="cbr2Types"]') && /Assessment Types/.test(q('.cbr2-types').textContent) && /Full-Course Assessments/.test(q('.cbr2-ag[data-lvl="prog"]').textContent) && qa('.cbr2-ag[data-lvl="unit"]').length === 2 && qa('.cbr2-agm').length === 3 && qa('[data-act="cbrAsgNew"]').length === 6);
    ACT.cbr2Types({ dataset: { p: id } }); ok('CBR2-D2 Manage Types opens the shared registry with its add / edit / retire actions', !!q('.cbr2-tbox') && /Add assessment type|Add type/i.test(q('.cbr2-tbox').textContent)); ACT.cbr2Types({ dataset: { p: id } });
    const mk = (t, lvl, u, m) => { ACT.cbrAsgNew({ dataset: { p: id, lvl, u, m } }); fill({ '#cna-t': t }); press(); return s2Defs().find(x => x.title === t); };
    dM = mk('CBR2 module assessment', 'mod', 'U81', m0.code); dU = mk('CBR2 unit assessment', 'unit', 'U81'); dP = mk('CBR2 course assessment', 'prog');
    step(id, 'assessments');
    const kM = s2Crit(dM).filter(c => c.type === 'Knowledge').map(c => c.code), kU = s2Crit(dU).filter(c => c.type === 'Knowledge').map(c => c.code), kP = s2Crit(dP).filter(c => c.type === 'Knowledge').map(c => c.code);
    ok('CBR2-D3 module / unit / course assessments are listed under their scope, opened in place', !!q(`.cbr2-agm[data-m="${m0.code}"] details.cbr2-a[data-id="${dM.id}"]`) && !!q(`.cbr2-ag[data-u="U81"] > details.cbr2-a[data-id="${dU.id}"]`) && !!q(`.cbr2-ag[data-lvl="prog"] details.cbr2-a[data-id="${dP.id}"]`) && /Assessment 1 — CBR2 module assessment/.test(q(`details.cbr2-a[data-id="${dM.id}"] summary`).textContent));
    ok('CBR2-D4 criteria by scope: module (its own), unit (all modules of the unit), full course (every unit)', J(kM) === J(['81 1.1', '81 1.2']) && kU.length === 3 && kU.includes('81 3.1') && kP.length === 4 && kP.some(c => /^82 /.test(c)), J([kM, kU, kP]));
    ACT.cbrAsgNew({ dataset: { p: id, lvl: 'prog' } }); const noDl = !document.querySelector('#modal-root #cna-d'); closeModal();
    ok('CBR2-D5 deadlines are set per batch at publication (CR): no deadline field, none stored, none shown as a date', noDl && dM.due === null && /deadlines set per batch/.test(q(`details.cbr2-a[data-id="${dM.id}"]`).textContent) && !/1970/.test(main()));
    ACT.s2QAdd({ dataset: { id: dM.id } }); fill({ '#aq-t': 'Explain the values.' }); press(); ACT.s2QAdd({ dataset: { id: dM.id } }); fill({ '#aq-t': 'Describe consent.' }); press();
    setUi('cbr2A.' + dM.id, '1'); step(id, 'assessments'); const box = q(`details.cbr2-a[data-id="${dM.id}"]`);
    ok('CBR2-D6 each question shows its text, the Answer Key / Assessor Guidance editor and Map Criteria (scope only); Add Question below', box.querySelectorAll('.cbr2-q').length === 2 && /Question 1/.test(box.querySelector('.cbr2-q').textContent) && !!box.querySelector('.cbr2-q textarea[data-onchange="cbr2Key"]') && J([...box.querySelectorAll('.cbr2-q')[0].querySelectorAll('input[data-onchange="mapChange"]')].map(x => x.dataset.c)) === J(kM) && !!box.querySelector('[data-act="s2QAdd"]'));
    const longP = [...box.querySelectorAll('.cbr2-ab p')].filter(p => !p.closest('details.cbr2-help') && p.textContent.trim().length > 140);
    ok('CBR2-D6a the editor has no long explanatory paragraph; question numbering is a compact help (closed until opened, keyboard reachable) next to the heading', !longP.length && !!box.querySelector('.cbr2-qhh details.cbr2-help:not([open]) > summary[aria-label="How questions are numbered"]') && /numbered automatically/.test(box.querySelector('details.cbr2-help .aafa-qn').textContent), longP.map(p => p.textContent.slice(0, 60)).join(' | '));
    const ta = box.querySelector(`#ak-${dM.id}-${dM.qs[0].id}`); ta.value = 'SECRET-CBR2-KEY values: dignity, choice'; INP.cbr2Key(ta);
    ok('CBR2-D7 (7) the written key saves per question (audited without its text)', dM.qs[0].key === 'SECRET-CBR2-KEY values: dignity, choice' && ADMIN.audit.some(x => x.action === 'Answer key added' && !/SECRET/.test(x.after)));
    INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: kM[0] } }); INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: kM[1] } }); INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[1].id, c: kM[1] } });
    ok('CBR2-D8 (7) one question maps to several criteria', J(dM.qs[0].crit) === J(kM));
    const a0 = ADMIN.audit.length; INP.mapChange({ checked: true, dataset: { id: dM.id, q: dM.qs[0].id, c: '82 1.1' } });
    ok('CBR2-D9 (7) a criterion outside the module scope is refused (logged)', !dM.qs[0].crit.includes('82 1.1') && blocked(a0) === 1);
    ACT.s2QAdd({ dataset: { id: dP.id } }); fill({ '#aq-t': 'Across the course: describe one safeguarding duty.' }); press(); INP.mapChange({ checked: true, dataset: { id: dP.id, q: dP.qs[0].id, c: kP.find(c => /^82 /.test(c)) } });
    ok('CBR2-D10 a full-course assessment maps a criterion of another unit', dP.qs[0].crit.length === 1 && /^82 /.test(dP.qs[0].crit[0]));
  });

  /* ================= 5–6. Assessment answer-key documents ================= */
  await T('CBR2-E answer-key documents', async () => {
    SA(); step(id, 'assessments');
    ok('CBR2-E1 each assessment has "Assessment Answer-Key Documents" with Upload Answer Key', qa(`details.cbr2-a[data-id="${dM.id}"] .cbr2-docs [data-act="cbr2DocUp"]`).length === 1 && /Assessment Answer-Key Documents/.test(q(`details.cbr2-a[data-id="${dM.id}"] .cbr2-docs`).textContent));
    ACT.cbr2DocUp({ dataset: { id: dM.id } }); setUi('cbr2Files', 'Model answers.pdf|Marking grid.doc|Guidance.docx'); press();
    const L = () => cbr2Docs(dM).filter(x => x.status === 'Active');
    ok('CBR2-E2 (5) PDF, DOC and DOCX uploaded together: one document each, version 1, audited', J(L().map(x => [cbr2DocCur(x).kind, cbr2DocCur(x).v])) === J([['PDF', 1], ['DOC', 1], ['DOCX', 1]]) && ADMIN.audit.filter(x => x.action === 'Answer-key document uploaded').length >= 3);
    ACT.cbr2DocUp({ dataset: { id: dM.id } }); setUi('cbr2Files', 'answers.txt'); const r1 = prim();
    ok('CBR2-E3 (5) another file type is refused', r1 === false && L().length === 3); closeModal();
    ACT.cbr2DocUp({ dataset: { id: dM.id } }); const r2 = prim(); ok('CBR2-E4 (5) uploading with no file is refused', r2 === false); closeModal();
    const d0 = L()[0]; ACT.cbr2DocUp({ dataset: { id: dM.id, doc: d0.id } }); setUi('cbr2Files', 'Model answers v2.pdf'); fill({ '#ak-n': 'Corrected Q2' }); press();
    ok('CBR2-E5 (5) Replace adds a version and keeps the first', d0.vers.length === 2 && cbr2DocCur(d0).file === 'Model answers v2.pdf' && d0.vers[0].file === 'Model answers.pdf');
    ACT.cbr2DocView({ dataset: { id: dM.id, doc: d0.id } }); ok('CBR2-E6 (5) View shows the document and its versions', !!MODAL && /Model answers v2\.pdf/.test(MODAL.title) && /Model answers\.pdf/.test(MODAL.body)); closeModal();
    const d2 = L()[2]; ACT.cbr2DocRm({ dataset: { id: dM.id, doc: d2.id } }); press();
    ok('CBR2-E7 (5) Remove (Draft) takes it off the assessment and keeps its record', d2.status === 'Removed' && d2.vers.length === 1 && L().length === 2);
    // per-question keys and documents coexist; publish freezes the documents with the version
    ACT.pubAsg({ dataset: { id: dM.id } }); crPd(); reason('Publish');
    ok('CBR2-E8 (5) publishing freezes the documents in force with the assessment version', dM.status === 'Published' && J((dM.keyDocsPub || {})[dM.version].map(x => [x.id, x.v])) === J(L().map(x => [x.id, cbr2DocCur(x).v])) && Object.isFrozen(dM.keyDocsPub[dM.version]));
    const a0 = ADMIN.audit.length; ACT.cbr2DocRm({ dataset: { id: dM.id, doc: d0.id } });
    ok('CBR2-E9 (5) a published assessment keeps its documents: Remove is refused (logged); Replace still versions', d0.status === 'Active' && blocked(a0) === 1);
    ACT.cbr2DocUp({ dataset: { id: dM.id, doc: d0.id } }); setUi('cbr2Files', 'Model answers v3.docx'); press();
    ok('CBR2-E10 (5) the frozen version is unchanged after a later replacement', d0.vers.length === 3 && dM.keyDocsPub[dM.version].find(x => x.id === d0.id).v === 2);
    // (6) key visibility
    const copies = dM.copies.map(c => STORE.worlds[c.v] && STORE.worlds[c.v].assignments.find(a => a.id === dM.id)).filter(Boolean);
    ok('CBR2-E11 (6) learners\' copies contain neither the written keys nor the documents', copies.every(a => !J(a).includes('SECRET-CBR2-KEY') && !('keyDocs' in a) && !J(a).includes('Model answers')), plural(copies.length, 'copy', 'copies'));
    if (dM.copies[0]) { S.variant = dM.copies[0].v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignment', { id: dM.id });
      ok('CBR2-E12 (6) the learner\'s assignment page shows neither', /Explain the values/.test(main()) && !/SECRET-CBR2-KEY|Model answers|Answer-Key Documents/.test(main()));
      const a1 = ADMIN.audit.length; ACT.cbr2DocView({ dataset: { id: dM.id, doc: d0.id } });
      ok('CBR2-E13 (17) a learner calling View directly is refused (logged), nothing opens', !MODAL && blocked(a1) === 1);
      ACT.cbr2DocUp({ dataset: { id: dM.id } }); ok('CBR2-E14 (17) …and Upload directly is refused', !MODAL); }
    FA(); const a2 = ADMIN.audit.length; ACT.cbr2DocView({ dataset: { id: dM.id, doc: d0.id } }); ACT.cbr2DocUp({ dataset: { id: dM.id } }); INP.cbr2Key({ dataset: { id: dM.id, q: dM.qs[0].id }, value: 'x' });
    ok('CBR2-E15 (17) Finance can\'t open, upload or change keys (refused in the handlers, logged)', !MODAL && blocked(a2) >= 2 && dM.qs[0].key === 'SECRET-CBR2-KEY values: dignity, choice');
    step(id, 'assessments'); ok('CBR2-E16 (6) …and the step shows Finance no key editor and no documents', !q('.cbr2-docs') && !q('textarea[data-onchange="cbr2Key"]'));
    SA();
  });

  /* ================= 6, 17. Keys never reach learners: an assessment published to a batch with learners ================= */
  await T('CBR2-L learner isolation', async () => {
    SA(); const P = cbPr('NV-L3'), u = cbTree(P)[0], m = u.mods[0];
    ACT.cbrAsgNew({ dataset: { p: 'NV-L3', lvl: 'mod', u: u.code, m: m.code } }); fill({ '#cna-t': 'CBR2 learner isolation' }); press();
    const d = s2Defs().find(x => x.title === 'CBR2 learner isolation'), k = s2Crit(d).find(c => c.type === 'Knowledge');
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Describe how you keep information confidential.' }); press();
    INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: k.code } });
    INP.cbr2Key({ dataset: { id: d.id, q: d.qs[0].id }, value: 'SECRET-CBR2-L3-KEY: need to know, secure storage' });
    ACT.cbr2DocUp({ dataset: { id: d.id } }); setUi('cbr2Files', 'L3 isolation key.pdf'); press();
    ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish to the batch');
    const copies = d.copies.map(c => [c.v, STORE.worlds[c.v] && STORE.worlds[c.v].assignments.find(a => a.id === d.id)]).filter(x => x[1]);
    ok('CBR2-L1 (6) published to the batch: learners received it — with neither the written key nor the documents', d.status === 'Published' && copies.length > 0 && copies.every(([, a]) => !J(a).includes('SECRET-CBR2-L3-KEY') && !J(a).includes('L3 isolation key') && !('keyDocs' in a) && a.qs.every(x => !('key' in x))), plural(copies.length, 'learner'));
    ok('CBR2-L2 (5) the documents in force were frozen with the published version', J((d.keyDocsPub || {})[d.version].map(x => x.file)) === J(['L3 isolation key.pdf']));
    if (copies[0]) {
      S.variant = copies[0][0]; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('assignment', { id: d.id });
      ok('CBR2-L3 (6) the learner\'s assignment page shows the question, never the key or the documents', /keep information confidential/.test(main()) && !/SECRET-CBR2-L3-KEY|L3 isolation key|Answer-Key Documents|Answer Key/.test(main()));
      const a0 = ADMIN.audit.length, x = d.keyDocs[0]; ACT.cbr2DocView({ dataset: { id: d.id, doc: x.id } }); const v1 = !!MODAL; closeModal(); ACT.cbr2DocUp({ dataset: { id: d.id } }); const v2 = !!MODAL; closeModal(); INP.cbr2Key({ dataset: { id: d.id, q: d.qs[0].id }, value: 'changed by a learner' });
      ok('CBR2-L4 (17) the learner calling View, Upload or the key editor directly is refused in the handler (logged); nothing opens or changes', !v1 && !v2 && d.qs[0].key === 'SECRET-CBR2-L3-KEY: need to know, secure storage' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(z => /^Blocked/.test(z.action)).length >= 2);
    }
    SA();
  });

  /* ================= 8–9. Observations ================= */
  await T('CBR2-F observations', async () => {
    SA(); step(id, 'observations');
    ok('CBR2-F1 two columns, Workplace then Academy, each led by its own checkbox; no observation subtabs', J(qa('.cbr2-cols > .cbr2-col').map(c => c.dataset.loc)) === J(['wp', 'off']) && qa('.cbr2-col > .cbr2-loc input[type="checkbox"]').length === 2 && /Workplace Observation Required/.test(q('.cbr2-col[data-loc="wp"]').textContent) && /Academy Observation Required/.test(q('.cbr2-col[data-loc="off"]').textContent) && !qa('.cb-panels').length);
    const offB = q('.cbr2-col[data-loc="off"] input[data-onchange="cbr2Loc"]'); offB.checked = true; INP.cbr2Loc(offB);
    const d = n5Shown(pr);
    ok('CBR2-F2 (8) the checkboxes are independent: Academy on, Workplace still on', d.workplace === 'Permitted' && d.office === 'Available');
    const wpB = q('.cbr2-col[data-loc="wp"] input[data-onchange="cbr2Loc"]'); wpB.checked = false; INP.cbr2Loc(wpB); if (MODAL) press();
    ok('CBR2-F3 (8) Workplace off leaves Academy on; its column shows only the checkbox', n5Shown(pr).workplace === 'Not permitted' && n5Shown(pr).office === 'Available' && !q('.cbr2-col[data-loc="wp"] .cbr2-catb'));
    const w2 = q('.cbr2-col[data-loc="wp"] input[data-onchange="cbr2Loc"]'); w2.checked = true; INP.cbr2Loc(w2);
    ok('CBR2-F4 (8) each enabled column holds its own Categories & Criteria (Add from Library, New Category) and guidance', qa('.cbr2-col.on').length === 2 && qa('.cbr2-col.on').every(c => !!c.querySelector('[data-act="ol1Sel"]') && !!c.querySelector('[data-act="ol1CbNew"]') && !!c.querySelector('textarea[data-onchange="cbr2Guide"]')));
    // (9) a library category: its criteria shown and ticked here
    let cat = OL1().cats.find(c => !c.retired && ol1Cur(c) && ol1Cur(c).crit.filter(x => x.status === 'Active').length >= 2);
    if (!cat) { ACT.ol1CbNew({ dataset: { p: id, loc: 'off' } }); fill({ '#ol1-code': 'MHX', '#ol1-name': 'Moving and handling' }); [0, 1].forEach(i => { fill({ ['#ol1-rt-' + i]: 'Handling task ' + (i + 1), ['#ol1-ri-' + i]: 'Observe task ' + (i + 1) }); document.querySelector('#modal-root .ol1-row[data-i="' + i + '"] .ol1-ev[value="notes"]').checked = true; }); press(); cat = OL1().cats.find(c => c.code === 'MHX'); }
    ok('CBR2-F5 (setup) the library has a published category with two criteria', !!cat);
    ACT.ol1Sel({ dataset: { p: id, loc: 'wp' } }); document.querySelector(`#modal-root input[name="ol1-cat"][value="${cat.id}"]`).checked = true; prim(); press(); step(id, 'observations');
    const live = ol1Cur(cat).crit.filter(x => x.status === 'Active'), col = q('.cbr2-col[data-loc="wp"]');
    ok('CBR2-F6 (9) "Selected Category — Name" with every criterion as a ticked checkbox and Add Criterion', new RegExp('Selected Category — ' + ol1Cur(cat).name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(col.textContent) && col.querySelectorAll(`.cbr2-cat[data-k="${cat.id}"] input[data-onchange="cbr2Crit"]:checked`).length === live.length && !!col.querySelector(`.cbr2-cat[data-k="${cat.id}"] [data-act="cbrObsCrit"]`));
    const v0 = ol1Cur(cat).v, cb = col.querySelector(`input[data-onchange="cbr2Crit"][data-c="${live[0].id}"]`); cb.checked = false; INP.cbr2Crit(cb);
    const sel = ol1Cfg(n5Shown(pr)).wp.find(s => s.cat === cat.id);
    ok('CBR2-F7 (9) unticking removes it from this course only — the library is unchanged', !sel.all && !sel.crit.includes(live[0].id) && sel.crit.length === live.length - 1 && ol1Cur(cat).v === v0 && ol1Cur(cat).crit.find(x => x.id === live[0].id).status === 'Active');
    step(id, 'observations'); const cb2 = q(`.cbr2-col[data-loc="wp"] input[data-onchange="cbr2Crit"][data-c="${live[0].id}"]`); cb2.checked = true; INP.cbr2Crit(cb2);
    ok('CBR2-F8 (9) ticking it again selects it again', ol1Cfg(n5Shown(pr)).wp.find(s => s.cat === cat.id).crit.includes(live[0].id));
    ACT.cbrObsCrit({ dataset: { p: id, loc: 'wp', k: cat.id } }); fill({ '#cbr-ct': 'Uses the hoist safely', '#cbr-ci': 'Observe a transfer.' }); press();
    ok('CBR2-F9 (9) Add Criterion publishes the category\'s next library version and selects it here', ol1Cur(cat).v === v0 + 1 && ol1Resolve(n5Shown(pr), 'wp').items.some(i => i.title === 'Uses the hoist safely'));
    step(id, 'observations'); const g = q('.cbr2-col[data-loc="off"] textarea[data-onchange="cbr2Guide"]'); g.value = 'Use the training kitchen.'; INP.cbr2Guide(g);
    ok('CBR2-F10 location guidance saves in its column', cbrGuideOf(n5Shown(pr), 'off') === 'Use the training kitchen.');
    const a0 = ADMIN.audit.length; as('FA')(); INP.cbr2Crit({ dataset: { p: id, loc: 'wp', k: cat.id, c: live[1].id }, checked: false });
    ok('CBR2-F11 (17) Finance can\'t change observation criteria (refused in the handler, logged)', ol1Cfg(n5Shown(pr)).wp.find(s => s.cat === cat.id).crit.includes(live[1].id) && ADMIN.audit.length > a0); SA();
  });

  /* ================= 10–11, 13. Fees ================= */
  await T('CBR2-G fees and payment plans', async () => {
    SA(); step(id, 'payments'); const W = cb8Work(pr), sp = W.opts.find(o => o.mode === 'Self-Paced'), fa = W.opts.find(o => o.mode === 'Fully Assisted');
    ok('CBR2-G1 fee options grouped by learner type (uppercase heading, Add Fee Option); the fields in place', qa('.cbr2-fg[data-lt]').length === 2 && qa('.cbr2-fgh .cbr2-up').every(h => getComputedStyle(h).textTransform === 'uppercase') && qa('.cbr2-fg [data-act="cb8Opt"][data-o=""]').length === 2 && J(qa(`.cbr2-opt[data-o="${sp.id}"] .cbr2-of label`).map(l => l.textContent)) === J(['Fee Option Name', 'Tuition Fee (£)', 'Workplace Observation Fee (£)', 'Academy Observation Fee (£)']));
    ['obsWp', 'obsOff'].forEach(f => [sp, fa].forEach(o => inp('cbr2OptF', { p: id, o: o.id, f }, f === 'obsWp' ? '100' : '70')));
    ok('CBR2-G2 Workplace and Academy observation fees stay separate', cb8Work(pr).opts.filter(o => o.status === 'Active').every(o => o.obsWp === 100 && o.obsOff === 70));
    inp('cbr2OptF', { p: id, o: sp.id, f: 'fee' }, '0'); ok('CBR2-G3 a tuition fee of £0 is refused', cb8Work(pr).opts.find(o => o.id === sp.id).fee === 1800);
    // (10) deposit allowed / not allowed per option
    inp('cbr2Dep', { p: id, o: sp.id, k: 'own' }, ''); inp('cbr2Dep', { p: id, o: sp.id, k: 'amount' }, '250');
    INP.cbr2Dep({ dataset: { p: id, o: fa.id, k: 'allow' }, checked: false });
    const W2 = cb8Work(pr), sp2 = W2.opts.find(o => o.id === sp.id), fa2 = W2.opts.find(o => o.id === fa.id);
    ok('CBR2-G4 (10) Self-Paced: Allow Deposit with a custom £250; Fully Assisted: deposit not allowed; the programme setting is unchanged', J(sp2.dep) === J({ mode: 'own', amount: 250 }) && J(fa2.dep) === J({ mode: 'none', amount: null }) && W2.dep.mode === cb8Derive(pr).dep.mode);
    step(id, 'payments'); ok('CBR2-G5 (10) unticked: no deposit fields shown for that option; ticked: the amount and the balance', !q(`.cbr2-opt[data-o="${fa.id}"] .cbr2-depf`) && !!q(`.cbr2-opt[data-o="${sp.id}"] .cbr2-depf input[data-k="amount"]`) && /Balance after the deposit: £1,550\.00/.test(q(`.cbr2-opt[data-o="${sp.id}"] .cbr2-depf`).textContent));
    inp('cbr2Dep', { p: id, o: sp.id, k: 'amount' }, '1800'); ok('CBR2-G6 (10) a deposit not below the fee is refused', cb8Work(pr).opts.find(o => o.id === sp.id).dep.amount === 250);
    // (11) several instalment options on one fee option
    ok('CBR2-G7 (11) Add Instalment Option with its count field', !!q(`#cb8-k-${sp.id}`) && /Add Instalment Option/.test(q(`.cbr2-opt[data-o="${sp.id}"] .cbr2-pladd`).textContent)); q(`#cb8-k-${sp.id}`).value = '3'; ACT.cb8PayAdd({ dataset: { p: id, o: sp.id } });
    ACT.cb8PayAdd({ dataset: { p: id, o: sp.id, k: '1' } });
    ok('CBR2-G8 (11) one fee option now offers in full, 3 and 6 instalments', J(cb8Work(pr).opts.find(o => o.id === sp.id).pay.map(x => x.k)) === '[1,3,6]');
    step(id, 'payments'); ok('CBR2-G9 (11) each is "Option N — Number of Instalments" with Remove, its amounts and total', J(qa(`.cbr2-opt[data-o="${sp.id}"] .cbr2-pl`).map(li => li.querySelector('label').textContent.replace(li.dataset.k === '1' ? ' (pay in full)' : '\u0000', ''))) === J(['Option 1 — Number of Instalments', 'Option 2 — Number of Instalments', 'Option 3 — Number of Instalments']) /* CBC1: a one-payment option also says "(pay in full)" */ && qa(`.cbr2-opt[data-o="${sp.id}"] .cbr2-pl [data-act="cb8PayDel"]`).length === 3 && /3 × £600\.00/.test(q(`.cbr2-opt[data-o="${sp.id}"] .cbr2-pls`).textContent));
    ACT.cb8PayAdd({ dataset: { p: id, o: sp.id, k: '3' } }); ACT.cb8PayAdd({ dataset: { p: id, o: sp.id, k: '25' } }); ACT.cb8PayAdd({ dataset: { p: id, o: sp.id, k: '2.5' } });
    ok('CBR2-G10 (11) duplicates, counts above the maximum and fractions are refused', J(cb8Work(pr).opts.find(o => o.id === sp.id).pay.map(x => x.k)) === '[1,3,6]');
    inp('cbr2K', { p: id, o: fa.id, k: 6 }, '4'); ok('CBR2-G11 (11) a count changes in place (6 → 4) through the same checks', J(cb8Work(pr).opts.find(o => o.id === fa.id).pay.map(x => x.k)) === '[4]');
    inp('cbr2K', { p: id, o: sp.id, k: 6 }, '3'); ok('CBR2-G12 (11) …and can\'t become a duplicate', J(cb8Work(pr).opts.find(o => o.id === sp.id).pay.map(x => x.k)) === '[1,3,6]');
    ok('CBR2-G13 (11) rounding: £2,600 in 6 → 5 × £433.33 + £433.35 (the last payment carries the pence); totals match', J(e1SchedP(2600, 6)) === J([43333, 43333, 43333, 43333, 43333, 43335]) && e1SchedP(2600, 6).reduce((a, b) => a + b, 0) === 260000 && e1SchedP(1800, 3).reduce((a, b) => a + b, 0) === 180000);
    // Deposit, third state: a fee option with no setting of its own inherits the programme deposit (here a custom £120)
    step(id, 'payments'); ok('CBR2-G18a the programme deposit setting is hidden while every fee option has its own', !q('.cbr2-pdep'));
    ACT.cb8Opt({ dataset: { p: id, o: '', mode: 'Self-Paced' } }); fill({ '#c8-l': 'Self-Paced — employer funded', '#c8-f': '1500', '#c8-wp': '100', '#c8-off': '70' }); document.querySelector('#modal-root #c8-m').value = 'Self-Paced'; press();
    const inh = cb8Work(pr).opts.find(o => o.label === 'Self-Paced — employer funded'); ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: inh.id, k } }));
    // FB1 (PD-FB1-03): an option added now answers Allow Deposit itself — here Yes with a custom £120. Was: the third state "inherited from the
    // programme's £120", made by turning this new option into a pre-FB1 one (a test-only shortcut, removed). The inherited state is tested on a
    // programme whose fee option really predates FB1 (ft-fb1 H, NV-N2).
    step(id, 'payments'); ok('CBR2-G18b the option added in Step 5 starts "Not answered" (FB1)', fb1Ask(cb8Work(pr).opts.find(o => o.id === inh.id)) && q(`.cbr2-opt[data-o="${inh.id}"] .fb1-dep`).dataset.ans === 'none');
    INP.cbr2Dep({ dataset: { p: id, o: inh.id, k: 'allow' }, checked: true }); inp('cbr2Dep', { p: id, o: inh.id, k: 'own' }, ''); inp('cbr2Dep', { p: id, o: inh.id, k: 'amount' }, '120');
    step(id, 'payments');
    ok('CBR2-G18 (10) three settings side by side: own £250 (Yes), not allowed (No), and the added option\'s own £120 (Yes) — each on its card', J(cb8Work(pr).opts.find(o => o.id === inh.id).dep) === J({ mode: 'own', amount: 120 }) && q(`.cbr2-opt[data-o="${inh.id}"] .cbr2-dep input[data-k="allow"]`).checked && q(`.cbr2-opt[data-o="${inh.id}"] .cbr2-depf input[data-k="amount"]`).value === '120' && !q(`.cbr2-opt[data-o="${fa.id}"] .cbr2-dep input[data-k="allow"]`).checked);
    // (13) Finance approval and version pinning
    ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms CBR2');
    const pkg = cb8Cur(id), v1 = s4PlanCur(id).v, osp = pkg.opts.find(o => o.id === sp.id), ofa = pkg.opts.find(o => o.id === fa.id);
    ok('CBR2-G14 (13) the approved package carries each option\'s deposit and instalment options (frozen)', !!pkg && Object.isFrozen(osp) && J(osp.dep) === J({ mode: 'own', amount: 250, eff: 250 }) && J(ofa.dep) === J({ mode: 'none', amount: null, eff: null }) && J(osp.pay.map(x => x.k)) === '[1,3,6]');
    const oin = pkg.opts.find(o => o.id === inh.id), fin = cb8View(pr, pkg);
    ok('CBR2-G19 (10, 13) the added option is approved with its own £120 deposit (frozen) — FB1: was "inherited, the package\'s £120"', !!oin && J(oin.dep) === J({ mode: 'own', amount: 120, eff: 120 }));
    ok('CBR2-G20 (10, 13) Finance\'s package view shows each option\'s own deposit (three) and no option on the programme setting — FB1: was two plus "Used by: Self-Paced — employer funded"', (fin.match(/Deposit \(this option\)/g) || []).length === 3 && /Used by: no fee option — each has its own deposit setting/.test(fin));
    inp('cbr2Dep', { p: id, o: sp.id, k: 'amount' }, '200');
    ok('CBR2-G15 (13) changing an approved option\'s deposit sends the terms back to Finance; the approved version is untouched', cb8Wf(pr).status === 'Draft' && cb8Cur(id).opts.find(o => o.id === sp.id).dep.amount === 250 && s4PlanCur(id).v === v1);
    inp('cbr2Dep', { p: id, o: sp.id, k: 'amount' }, '250'); ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms CBR2 again');
    // a package from before CBR-2 (no option deposit) keeps the programme deposit — nothing reinterpreted
    const pre = { dep: { mode: 'default', amount: null, eff: 300 }, opts: [{ fee: 1000, pay: [{ k: 1 }] }] }; ok('CBR2-G16 (13) an option without its own deposit uses the programme deposit, as before', cb8DepOf(pre, pre.opts[0]) === pre.dep && cb8DepE(pre.dep) === 300);
    const a0 = ADMIN.audit.length; FA(); inp('cbr2Dep', { p: id, o: sp.id, k: 'allow' }, '', { checked: false }); inp('cbr2OptF', { p: id, o: sp.id, f: 'fee' }, '1');
    ok('CBR2-G17 (17) Finance can\'t change fee options or deposits here (refused in the handlers, logged)', cb8Work(pr).opts.find(o => o.id === sp.id).dep.mode === 'own' && cb8Work(pr).opts.find(o => o.id === sp.id).fee === 1800 && blocked(a0) >= 2); SA();
  });

  /* ================= 12. A real sign-up choosing among the approved plans ================= */
  await T('CBR2-H sign-up', async () => {
    SA();
    // publish the course with what it still needs, then a batch 40 days away
    const d = n5Draft(pr); n5NvqOk(pr, d).forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c: c.code } }); document.querySelectorAll('#modal-root .n5-ev').forEach(x => { x.checked = x.value === 'notes'; }); press(); });
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1'; document.querySelectorAll('#modal-root .ev-l, #modal-root .ev-c').forEach(x => { if (!x.disabled) x.checked = true; }); press();
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    if (cb8Wf(pr).status !== 'Approved') { ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms'); }
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    ok('CBR2-H1 (setup) the course is published', pr.status === 'Active', J(ch8Check(pr).block));
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'CBR2B1' }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const bt = ADMIN.batches.find(x => x.code === 'CBR2B1'); bt.start = D(40, '09:00'); bt.end = D(400, '17:00');
    const sp = cb8Cur(id).opts.find(o => o.mode === 'Self-Paced'), fa = cb8Cur(id).opts.find(o => o.mode === 'Fully Assisted');
    const signUp = (v, oid) => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
      const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${oid}"]`); if (r) r.checked = true; prim(); closeModal();
      const w = W; chSetBatch(w, bt); ACT.suNext(); w.docs.forEach(x => { x.status = 'Submitted'; x.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, bt); go('admission'); return w; };
    const w1 = signUp('A', sp.id), vals = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('CBR2-H2 (12) Self-Paced: the approved options (in full, 3, 6) and the £250 deposit route are offered — nothing else', w1.signup.plan.cb8.opt.id === sp.id && ['1', '3', '6', 'deposit'].every(x => vals.includes(x)) && !vals.includes('4') && /£250\.00 now/.test(main()), J(vals));
    ok('CBR2-H3 (12) the applicant\'s frozen terms carry the option\'s deposit', w1.signup.plan.deposit === 250 && w1.signup.plan.cb8.dep.eff === 250 && Object.isFrozen(w1.signup.plan));
    setUi('cb9Pay', '3'); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-CBR2'); closeModal();
    const pl = w1.plans.find(p => p.e === 'nvq');
    ok('CBR2-H4 (12) choosing 3 instalments: £600 collected now, three rows, the pin records 3 and plan version', g && g.amount === 600 && pl.rows.length === 3 && pl.rows.every(r => r.amount === 600) && w1.signup.pin.k === 3 && w1.signup.pin.planV === s4PlanCur(id).v);
    const w2 = signUp('F', fa.id), vals2 = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('CBR2-H5 (10, 12) Fully Assisted (deposit not allowed): no deposit route, only its approved option (4 instalments)', J(vals2) === J(['4']) && w2.signup.plan.depOff === true && /No deposit for this programme/.test(main()), J(vals2));
    setUi('cb9Pay', 'deposit'); setUi('suMethod', 'card'); render(); const _co2 = checkout; let g2 = null; checkout = o => { g2 = o; return _co2(o); }; try { ACT.suPay(); } finally { checkout = _co2; } if (g2) g2.onSuccess(g2.amount, 'TXN-CBR2b'); closeModal();
    ok('CBR2-H6 (10) a stale "deposit" choice can\'t take a deposit from that applicant', !g2 || g2.amount === 650, g2 ? String(g2.amount) : 'none');
    // Deposit, all three states through sign-up, signed terms and payment
    ok('CBR2-H7 (10) the signed letter wording ({{payment_terms}}): own £250 offers "a deposit of £250.00"; not allowed offers none', /a deposit of £250\.00/.test(e2PayTerms(w1) || '') && !/deposit of/.test(e2PayTerms(w2) || ''), e2PayTerms(w2));
    const inh = cb8Cur(id).opts.find(o => o.label === 'Self-Paced — employer funded'), w3 = signUp('E', inh.id), vals3 = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('CBR2-H8 (10) inherited: the programme deposit (£120) is offered, fixed in the applicant\'s terms and the pin, and in the signed-terms wording', vals3.includes('deposit') && /£120\.00 now/.test(main()) && w3.signup.plan.deposit === 120 && !w3.signup.plan.depOff && w3.signup.plan.cb8.dep.eff === 120 && /a deposit of £120\.00/.test(e2PayTerms(w3) || ''), J(vals3));
    bt.start = D(20, '09:00'); render(); const v28 = qa('input[name="cb9-pay"]').map(x => x.value); bt.start = D(40, '09:00'); render();
    ok('CBR2-H9 (10) the 28-day rule still applies: with the batch 20 days away, the deposit isn\'t offered (allowed or inherited alike)', !v28.includes('deposit') && v28.includes('6'), J(v28));
    setUi('cb9Pay', 'deposit'); setUi('suMethod', 'card'); render(); const _co3 = checkout; let g3 = null; checkout = o => { g3 = o; return _co3(o); }; try { ACT.suPay(); } finally { checkout = _co3; } if (g3) g3.onSuccess(g3.amount, 'TXN-CBR2c'); closeModal();
    const pl3 = w3.plans.find(p => p.e === 'nvq');
    ok('CBR2-H10 (10) paying the inherited deposit: £120 charged, the £1,380 balance recorded, the seat-hold deposit £120', !!g3 && g3.amount === 120 && pl3.rows.length === 1 && pl3.rows[0].amount === 1380 && w3.admission.deposit.min === 120, g3 ? g3.amount + ' / ' + J(pl3.rows.map(r => r.amount)) : 'none');
    SA();
  });

  /* ================= Display Duration: what it drives (traced; PD-CBR2-10) ================= */
  await T('CBR2-M display duration', async () => {
    SA(); const p3 = make({ obs: false }), pid = p3.id;
    ok('CBR2-M1 the payment duration (pr.durV) is the Course Duration entered in Course Details, 12 months — FB2 (CBC3: a separate Payment Schedule Duration entered with the starting fees)', J(p3.durV) === J({ n: 12, unit: 'months' }) && J(cb8Basis(p3).dur) === J(p3.durV));
    ok('CBR2-M2 payment dates are worked out from it: 6 payments over 12 months are every 2 months', /Every 2 months/.test(cbRuleTxt(cb8Basis(p3).dur, 6)));
    cb8Work(p3).opts.filter(o => fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: pid, o: o.id, k: 'allow' }, checked: true })); // FB1: each new fee option answers Allow Deposit (Yes — Academy default)
    ACT.cb8SaApprove({ dataset: { p: pid } }); reason('Terms M'); const st0 = cb8Wf(p3).status, w0 = J(STORE.worlds);
    step(pid, 'details'); { const i = document.querySelector('main #cbc3-dd-n'); i.value = '6'; i.dispatchEvent(new Event('change', { bubbles: true })); } // FB2 (PD-FB2-04): the Course Duration in Course Details (CBC3: the Payment Schedule Duration in Fees & Payment Plans)
    ok('CBR2-M3 changing it to 6 months changes the payment rule (6 payments → monthly) and sends approved terms back to Finance', J(p3.durV) === J({ n: 6, unit: 'months' }) && /Monthly/.test(cbRuleTxt(cb8Basis(p3).dur, 6)) && st0 === 'Approved' && cb8Wf(p3).status === 'Draft');
    ok('CBR2-M4 no learner record changes (no access, expiry or eligibility date reads it)', J(STORE.worlds) === w0);
    ok('CBR2-M5 learners see it: a published course\'s listing carries the duration text', (CATALOGUE.find(c => c.kind === 'nvq' && c.title === pr.title) || {}).dur === '12 months');
  });

  /* ================= 14. Offer letters ================= */
  await T('CBR2-I offer letters', async () => {
    SA(); step(id, 'documents');
    ok('CBR2-I1 one card per learner type: uppercase label, "Offer letter for … applicants", Upload offer letter, Choose Template, Preview', qa('.cbr2-lc').length === 2 && qa('.cbr2-lc').every(c => /Offer letter for .+ applicants/.test(c.textContent) && !!c.querySelector('[data-act="cbrLetterUp"]') && !!c.querySelector('[data-act="cbr2Tpl"]') && !!c.querySelector('[data-act="s4LetterPrev"]')));
    const sig0 = J(Object.entries(STORE.worlds).filter(([, w]) => w && w.signup && w.signup.sig).map(([k, w]) => [k, w.signup.sig]));
    ACT.cbrLetterUp({ dataset: { p: id, lt: 'D-SelfPaced' } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value + '\n\nDear {{full_name}}, see {{fee_table}}.'; reason('Self-Paced template');
    step(id, 'documents'); const c = q('.cbr2-lc[data-lt="D-SelfPaced"]');
    ok('CBR2-I2 a separate Self-Paced template: own version shown, unknown merge field warned', cbrUsesOwn(id, 'D-SelfPaced') && /Own template · Version/.test(c.textContent) && /Unknown merge field: \{\{fee_table\}\}/.test(c.textContent));
    ACT.cbr2Tpl({ dataset: { p: id, lt: 'D-FullyAssisted' } }); document.querySelector('#modal-root input[name="cbr2-tpl"][value="copy:D-SelfPaced"]').checked = true; reason('Same wording');
    const faL = cbrTrackCur(id, 'D-FullyAssisted'), spL = cbrTrackCur(id, 'D-SelfPaced');
    ok('CBR2-I3 Choose Template copies another type\'s template as a new Fully Assisted version (the source unchanged)', cbrUsesOwn(id, 'D-FullyAssisted') && faL && faL.lt === 'D-FullyAssisted' && faL.from === spL.v && J(faL.text) === J(spL.text) && Object.isFrozen(faL));
    ACT.cbr2Tpl({ dataset: { p: id, lt: 'D-FullyAssisted' } }); document.querySelector('#modal-root input[name="cbr2-tpl"][value="shared"]').checked = true; reason('Back to the programme letter');
    ok('CBR2-I4 …and back to the programme letter; its own versions are kept', !cbrUsesOwn(id, 'D-FullyAssisted') && cbrTrack(id, 'D-FullyAssisted').length === 1);
    ok('CBR2-I5 (14) signed letters and their snapshots are unchanged', J(Object.entries(STORE.worlds).filter(([, w]) => w && w.signup && w.signup.sig).map(([k, w]) => [k, w.signup.sig])) === sig0);
    ACT.s4LetterPrev({ dataset: { id, v: spL.v } }); ok('CBR2-I6 Preview is a template preview', !!MODAL && /template preview/.test(MODAL.title)); closeModal();
    const a0 = ADMIN.audit.length; FA(); ACT.cbr2Tpl({ dataset: { p: id, lt: 'D-FullyAssisted' } }); ok('CBR2-I7 (17) Finance can\'t choose a template (refused)', !MODAL || !/Choose Template/.test(MODAL.title)); closeModal(); SA();
  });

  /* ================= 15. Review & Publish ================= */
  await T('CBR2-J review', async () => {
    SA(); const p2 = make({ obs: false }); step(p2.id, 'review');
    const secs = qa('.cbr2-rv .cb-rv-sec').map(x => x.dataset.sec);
    ok('CBR2-J1 one compact list: the six steps (Observations left out when not required), each with Edit', J(secs) === J(['details', 'curriculum', 'assessments', 'payments', 'documents']) && qa('.cbr2-rv .cb-rv-sec .cb-rv-st [data-go]').every(b => b.textContent === 'Edit') && qa('.cbr2-rv .cb-rv-sec .cb-rv-st [data-go]').length === 5 && !q('.cb-rv-todo'), J(secs));
    const st = k => (q(`.cbr2-rv .cb-rv-sec[data-sec="${k}"] .cb-rv-st .chip`) || {}).textContent || '';
    ok('CBR2-J2 statuses are real: Curriculum and Offer Letters "to fix" with their blockers listed under them; no green tick on them', /to fix/.test(st('curriculum')) && /to fix/.test(st('documents')) && qa('.cbr2-rv .cb-rv-sec[data-sec="curriculum"] .cbr2-rvi li').length >= 1 && !/Complete/.test(st('curriculum') + st('documents')));
    ok('CBR2-J3 Publish is disabled while anything blocks', !!q('[data-act="cbPublish"][disabled]'));
    step(id, 'review'); ok('CBR2-J4 a fee option\'s own deposit is summarised; provisional entitlements are not', /Self-Paced — standard: Custom deposit £250\.00/.test(q('.cbr2-rv .cb-rv-sec[data-sec="payments"]').textContent) && !/Entitlements/.test(q('.cbr2-rv').textContent));
  });

  /* ================= 16. Versions and saved data ================= */
  await T('CBR2-K versions and saved data', async () => {
    SA(); const before = cb8Cur(id);
    ACT.s3WizVersion({ dataset: { id } }); if (MODAL) reason('Version 2');
    ok('CBR2-K1 (16) a new version keeps the approved package of Version 1 unchanged', cb8Cur(id) === before && Object.isFrozen(before));
    const back = fcpDecode(JSON.parse(JSON.stringify(fcpEncode(fcpRoots())))), dB = back.STORE.s2Defs && back.STORE.s2Defs.find(x => x.id === dM.id);
    ok('CBR2-K2 (16) the saved snapshot carries the answer-key documents (with their frozen versions) and the approved option deposits', !!dB && dB.keyDocs.length === 3 && !!dB.keyDocsPub && Object.keys(dB.keyDocsPub).length === 1 && JSON.stringify(back).includes('"dep":{"mode":"own","amount":250,"eff":250}'), dB ? J([dB.keyDocs.length, !!dB.keyDocsPub]) : 'no def');
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n'); document.body.appendChild(out);
})();
