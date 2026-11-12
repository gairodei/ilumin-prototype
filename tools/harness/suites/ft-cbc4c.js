// CBR correction batch 4 — end to end on the client demo (suites.sh runs it with FIXTURE=client; real reloads of the saved demo).
// Phase 0: an Academic Admin builds a new Level 3 programme through the screens — clicking the rendered controls and typing into fields:
// Course Details, learner types, curriculum, resources (new and existing; programme / unit / module), Manage Types, programme / unit /
// module assessments with questions, mapping, written keys and key documents, Workplace and Academy observations, a Required Observation,
// fee options with deposit and several instalment plans, offer-letter templates per learner type, Review, submission to Finance; the
// Finance Admin approves; the Academic Admin publishes; a learner sees it in Browse. Then the demo is saved and the page reloaded.
// Phase 1: everything is still there. Then the existing demo programme's lifecycle: a new version and its draft changes never reach
// Version 1, its learners, signed letters, submissions or observation records; the Finance boundary; answer keys (Teacher vs Assessor).
(async function () {
  // FB1 (PD-FB1-03): this suite's deposit configuration, chosen explicitly where its fixture prepares a package for Finance — each new fee
  // option "Allow Deposit: Yes" with the Academy default, through the Step 5 handler (an administrator's action; role checks apply).
  const fb1Dep = p => { if (p && cb8Managed(p)) cb8Work(p).opts.filter(o => o.status === 'Active' && fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: p.id, o: o.id, k: 'allow' }, checked: true })); };
  const fb1Click = () => { for (let i = 0, y; i < 20 && (y = document.querySelector('main .fb1-dep[data-ans="none"] .fb1-yn input[data-k="allow"]')); i++) y.click(); }; // FB1: Allow Deposit — Yes, clicked on each unanswered card
  const SS = window.sessionStorage, K = 'ft-cbc4c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)], q = s => $1('main ' + s), qa = s => $a('main ' + s);
  const main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const mok = re => click(mbtn(re), 'dialog button ' + re);
  const mfill = o => Object.entries(o).forEach(([k, v]) => { const e = $1('#modal-root ' + k); if (!e) throw new Error('dialog field ' + k); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  const type = (sel, v) => { const e = q(sel); if (!e) throw new Error('field ' + sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const rsn = (r = 'CBC4 end to end') => { const t = $1('#rsn'); if (t) t.value = r; };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const step = k => { const pr = PR(); go('a-programmes', { id: pr.id, tab: k }); };
  const TITLE = 'Level 3 Diploma in Care (CBC4 end to end)';
  const PR = () => (STORE.chNewProgs || []).find(p => p.title === TITLE);
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };

  if (PH === 0) {
    await T('CBC4C-1 Course Details', async () => {
      as('aca'); go('a-programmes'); click(q('[data-act="chProgNew"]'), 'New NVQ programme');
      ok('CBC4C-1 "New NVQ programme" opens Course Details of a new course', S.route === 'a-programmes' && !!q('.cbr2-grid #np-t'));
      type('#np-t', TITLE); type('#np-q-body', 'NCFE CACHE'); q('#np-l').value = 'Level 3'; q('#np-l').dispatchEvent(new Event('change', { bubbles: true }));
      type('#np-r', 'QN 610/4242/4'); type('#cbc3-dd-n', '12'); type('#np-q-glh', '420'); type('#np-q-tqt', '580'); type('#np-q-credits', '58'); type('#np-ds', 'A diploma for care workers, built end to end.');
      type('#np-d', '12'); q('#np-du').value = 'months';
      const row = k => qa('.r1-np-row')[k]; const setRow = (k, l, f, m) => { row(k).querySelector('.r1-np-l').value = l; row(k).querySelector('.r1-np-f').value = String(f); row(k).querySelector('.r1-np-m').value = m; };
      setRow(0, 'Self-Paced — standard', 1800, 'Self-Paced'); click(q('[data-act="r1NpAdd"]'), 'add fee option row'); setRow(1, 'Fully Assisted — standard', 2600, 'Fully Assisted');
      click(q('#cbr2-obs-yes')); click(q('[data-act="cbDetCreate"]'), 'Save and continue'); closeModal();
      const pr = PR();
      ok('CBC4C-2 created: Draft Version 1 with its Display Duration and Payment Schedule Duration (both 12 months), observations Yes', !!pr && pr.status === 'Draft' && J(cbcDisp(pr, 1)) === J({ n: 12, unit: 'months' }) && J(pr.durV) === J({ n: 12, unit: 'months' }) && cbObsOf(pr) === true, pr && J([pr.status, cbcDisp(pr, 1), pr.durV]));
      step('details');
      ok('CBC4C-3 learner types Self-Paced and Fully Assisted are defined from the fee options', J(cbrTypes(pr).map(t => t.mode).sort()) === J(['Fully Assisted', 'Self-Paced']) && qa('.cbr2-lt').length === 2);
      [0, 1].forEach(i => { step('details'); const w = qa('.cbr2-lt')[i].querySelector('input[data-f="win"]'); w.value = i ? '12' : '18'; w.dispatchEvent(new Event('change', { bubbles: true })); }); // each change redraws the step
      ok('CBC4C-3 …each with its completion window (typed in place, audited)', cbrTypes(pr).every(t => t.win && t.win.n >= 12));
    });
    await T('CBC4C-4 curriculum', async () => {
      as('aca'); step('curriculum'); const pr = PR();
      click(q('[data-act="ch8AddUnit"]'), 'Add Unit'); mfill({ '#u-c': 'E1', '#u-t': 'Person-centred practice' }); mok(/^Save|^Add/);
      step('curriculum'); click(q('[data-act="ch8AddMod"]'), 'Add Module'); mfill({ '#m-t': 'Core practice', '#m-ab': 'C/653/1001' }); mok(/^Save|^Add/);
      step('curriculum'); click(q('[data-act="ch8AddLo"]'), 'Add LO'); mfill({ '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddCrit"]')[0], 'Add criterion'); mfill({ '#c-d': 'Explain person-centred values', '#c-e': 'Written account' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddCrit"]')[0], 'Add criterion 2'); mfill({ '#c-d': 'Describe informed consent', '#c-e': 'Written account' }); mok(/^Save|^Add/);
      step('curriculum'); click(q('[data-act="ch8AddLo"]'), 'Add LO 2'); mfill({ '#lo-t': 'Work in a person-centred way', '#lo-y': 'Observation' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddCrit"]').slice(-1)[0], 'Add observed criterion'); mfill({ '#c-d': 'Support an individual\'s choices', '#c-e': 'Observed at work' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddUnit"]').slice(-1)[0], 'Add Unit 2'); mfill({ '#u-c': 'E2', '#u-t': 'Safeguarding' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddMod"]').slice(-1)[0], 'Add Module 2'); mfill({ '#m-t': 'Recognising harm', '#m-ab': 'C/653/2001' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddLo"]').slice(-1)[0], 'Add LO 3'); mfill({ '#lo-t': 'Recognise abuse', '#lo-y': 'Knowledge' }); mok(/^Save|^Add/);
      step('curriculum'); click(qa('[data-act="ch8AddCrit"]').slice(-1)[0], 'Add criterion 4'); mfill({ '#c-d': 'Name types of harm', '#c-e': 'Written account' }); mok(/^Save|^Add/);
      const t = cbTree(pr) || [];
      ok('CBC4C-4 two units, two modules, three Learning Outcomes (one Observation) and four criteria, added through the tree', t.length === 2 && t.flatMap(u => u.mods).length === 2 && t.flatMap(u => u.mods.flatMap(m => m.los)).length === 3 && t.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).length === 4 && t[0].mods[0].los.some(l => l.type === 'Observation'), J(t.map(u => [u.code, u.mods.map(m => m.los.map(l => [l.type, l.crit.length]))])));
      // resources: a new one at programme level, then that one from the library at unit and module level
      step('curriculum'); click(q('.cbr2-res[data-lvl="prog"] [data-act="cbr2Res"]'), 'Add Resource'); click($1('#modal-root [data-act="cbr2ResGo"][data-k="new"]'), 'Create a new resource');
      const ty = $1('#modal-root #rs-y'); if (ty) ty.value = 'Link'; mfill({ '#rs-t': 'CBC4 learner handbook', '#rs-u': 'https://example.org/handbook' }); mok(/./ && /^(Save|Create|Add)/);
      const r = S4B().res.find(x => x.title === 'CBC4 learner handbook');
      step('curriculum'); click(q('.cbr2-res[data-lvl="unit"] [data-act="cbr2Res"]'), 'unit Resource'); click($1('#modal-root [data-act="cbr2ResGo"][data-k="lib"]'), 'Select from library'); $a('#modal-root .cbr-rp').forEach(x => { x.checked = x.value === (r && r.id); }); mok(/^(Save|Add|Place|Select)/);
      step('curriculum'); click(q('.cbr2-res[data-lvl="mod"] [data-act="cbr2Res"]'), 'module Resource'); click($1('#modal-root [data-act="cbr2ResGo"][data-k="lib"]'), 'Select from library'); $a('#modal-root .cbr-rp').forEach(x => { x.checked = x.value === (r && r.id); }); mok(/^(Save|Add|Place|Select)/);
      const at = cbrAttsLive(pr.id);
      ok('CBC4C-5 resources: a new one created at programme level and the existing one placed at unit and module level', !!r && at.some(a => a.lvl === 'prog' && a.rid === r.id) && at.some(a => a.lvl === 'unit' && a.rid === r.id) && at.some(a => a.lvl === 'mod' && a.rid === r.id), J(at.map(a => [a.lvl, a.rid])));
    });
    await T('CBC4C-6 assessments', async () => {
      as('aca'); step('assessments'); const pr = PR();
      click(q('[data-act="cbr2Types"]'), 'Manage Types'); click(q('.cbr2-treg [data-act="addType"]'), 'Add type'); mfill({ '#ty-n': 'Reflective account (CBC4)' }); $1('#ty-e').value = 'Written assignment questions'; mok(/^Add type$/);
      ok('CBC4C-6 Manage Types: a type added (confirmed)', s3Types().some(x => x.name === 'Reflective account (CBC4)') && /Assessment type added/.test(lastToast));
      const sel = { mod: '.cbr2-agm [data-act="cbrAsgNew"]', unit: '.cbr2-ag[data-lvl="unit"] > .cbr2-sh [data-act="cbrAsgNew"]', prog: '.cbr2-ag[data-lvl="prog"] [data-act="cbrAsgNew"]' };
      const mk = (lvl, title) => { step('assessments'); click(q(sel[lvl]), 'Add Assessment ' + lvl); mfill({ '#cna-t': title }); mok(/^Create/); return s2Defs().find(x => x.title === title); };
      const dM = mk('mod', 'CBC4 module assessment'), dU = mk('unit', 'CBC4 unit assessment'), dP = mk('prog', 'CBC4 full-course assessment');
      ok('CBC4C-7 module, unit and programme assessments created as Drafts', !!dM && !!dU && !!dP && [dM, dU, dP].every(d => d.status === 'Draft') && J([dM, dU, dP].map(d => cbrScope(d).lvl)) === J(['mod', 'unit', 'prog']));
      [[dM, 'Explain person-centred values.'], [dU, 'Describe how you respond to suspected abuse.'], [dP, 'Across the course: describe one safeguarding duty.']].forEach(([d, t]) => {
        step('assessments'); setUi('cbr2A.' + d.id, '1'); step('assessments'); click(q(`details.cbr2-a[data-id="${d.id}"] [data-act="s2QAdd"]`), 'Add Question'); mfill({ '#aq-t': t }); mok(/^(Save|Add)/);
        step('assessments'); const box = q(`details.cbr2-a[data-id="${d.id}"]`), cb = box.querySelector('input[data-onchange="mapChange"]:not([disabled])'); if (cb) click(cb, 'map criterion');
        step('assessments'); const ta = q(`details.cbr2-a[data-id="${d.id}"] textarea[data-onchange="cbr2Key"]`); if (ta) { ta.value = 'Model answer: ' + t; ta.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      ok('CBC4C-8 each assessment has a question mapped to a knowledge criterion of its scope, with a written answer key', [dM, dU, dP].every(d => { const x = s2Def(d.id); return x.qs.length === 1 && x.qs[0].crit.length >= 1 && /^Model answer/.test(x.qs[0].key || ''); }), J([dM, dU, dP].map(d => { const x = s2Def(d.id); return [x.qs.length, x.qs[0] && x.qs[0].crit, !!(x.qs[0] && x.qs[0].key)]; })));
      step('assessments'); click(q(`details.cbr2-a[data-id="${dM.id}"] [data-act="cbr2DocUp"]`), 'Upload Answer Key'); click($1('#modal-root [data-act="cbr2DocSample"]'), 'sample files'); mok(/^Upload/);
      ok('CBC4C-9 assessment answer-key documents uploaded (staff only)', cbr2Docs(s2Def(dM.id)).filter(x => x.status === 'Active').length === 2);
      SS.setItem(K + 'asg', J([dM.id, dU.id, dP.id]));
    });
    await T('CBC4C-10 observations', async () => {
      as('aca'); step('observations'); const pr = PR();
      click(q('.cbr2-col[data-loc="wp"] input[data-onchange="cbr2Loc"]'), 'Workplace'); click(q('.cbr2-col[data-loc="off"] input[data-onchange="cbr2Loc"]'), 'Academy');
      click(q('.cbr2-col[data-loc="wp"] [data-act="ol1CbNew"]'), 'Create Category'); mfill({ '#ol1-code': 'E2E', '#ol1-name': 'End-to-end standards' });
      $a('#modal-root .ol1-row').forEach((x, k) => { x.querySelector('.ol1-rt').value = ['Greets the individual', 'Records the visit'][k]; x.querySelector('.ol1-ri').value = 'Observe once.'; x.querySelectorAll('.ol1-ev').forEach(e => { e.checked = e.value === 'notes'; }); });
      mok(/^(Save|Create|Publish)/);
      step('observations'); const d = n5Draft(pr), nvq = n5NvqOk(pr, d).map(c => c.code);
      nvq.forEach(c => { click(q(`.cbr2-qual [data-act="n5NvqEv"][data-c="${c}"]`), 'evidence ' + c); $a('#modal-root .n5-ev').forEach(x => { x.checked = ['notes', 'photos'].includes(x.value); }); mok(/Save evidence/); step('observations'); });
      ok('CBC4C-10 Workplace and Academy on; a library category created and selected; the qualification criterion\'s evidence set', d.workplace === 'Permitted' && d.office === 'Available' && ol1Resolve(n5Draft(pr), 'wp').items.length === 2 && nvq.length === 1 && J(n5Draft(pr).nvq[nvq[0]].types) === J(['notes', 'photos']));
      step('observations'); click(q('.cbr2-req [data-act="cbObsEv"][data-e=""]'), 'Add Required Observation'); $1('#ev-n').value = 'Observation 1 — person-centred care';
      $a('#modal-root .ev-l, #modal-root .ev-c').forEach(x => { if (!x.disabled) x.checked = true; }); $a('#modal-root .ev-e').forEach(x => { x.checked = x.value === 'notes'; }); mok(/^Add Required Observation$/);
      ok('CBC4C-11 a Required Observation added by hand (both locations, the qualification criterion, notes)', cbEvOf(n5Draft(pr)).length === 1 && cbEvOf(n5Draft(pr))[0].crit.includes(nvq[0]));
    });
    await T('CBC4C-12 fees and letters', async () => {
      as('aca'); step('payments'); const pr = PR();
      cb8Work(pr).opts.filter(o => o.status === 'Active').forEach(o => {
        step('payments'); [['obsWp', o.mode === 'Self-Paced' ? '100' : '70'], ['obsOff', o.mode === 'Self-Paced' ? '45.50' : '0']].forEach(([f, v]) => { const i = q(`.cbr2-opt[data-o="${o.id}"] input[data-f="${f}"]`); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); step('payments'); });
        [3, 6].forEach(k => { step('payments'); const i = $1('#cb8-k-' + o.id); if (i && !cb8Work(pr).opts.find(x => x.id === o.id).pay.some(x => x.k === k)) { i.value = String(k); click(q(`[data-act="cb8PayAdd"][data-o="${o.id}"]`), 'Add Instalment Option'); } });
      });
      step('payments'); const sp = cb8Work(pr).opts.find(o => o.mode === 'Self-Paced'), al = q(`.cbr2-opt[data-o="${sp.id}"] .cbr2-dep input[data-k="allow"]`); if (al && !al.checked) click(al, 'Allow Deposit');
      const W8 = cb8Work(pr);
      ok('CBC4C-12 fee options: observation fees, a deposit on Self-Paced, and 1 / 3 / 6 instalment plans on each', W8.opts.filter(o => o.status === 'Active').every(o => o.obsWp != null && [1, 3, 6].every(k => o.pay.some(x => x.k === k) || (k === 1 && o.pay.length >= 2))) && cb8DepOf(W8, W8.opts.find(o => o.mode === 'Self-Paced')).mode !== 'none', J(W8.opts.map(o => [o.mode, o.obsWp, o.obsOff, o.pay.map(x => x.k), o.dep])));
      step('documents'); click(q('[data-act="cbrLetterUp"][data-lt="D-SelfPaced"]'), 'Upload offer letter (Self-Paced)'); click($1('#modal-root [data-act="chLetterSample"]'), 'sample letter'); rsn('Self-Paced template'); mok(/^Upload/);
      step('documents'); click(q('[data-act="cbr2Tpl"][data-lt="D-FullyAssisted"]'), 'Choose Template'); const c = $1('#modal-root input[name="cbr2-tpl"][value="copy:D-SelfPaced"]'); if (c) c.checked = true; rsn('Same wording'); mok(/./ && /^(Use|Save|Choose|Apply)/);
      ok('CBC4C-13 offer letters: a Self-Paced template uploaded, Fully Assisted given a template (copied)', cbrUsesOwn(pr.id, 'D-SelfPaced') && cbrUsesOwn(pr.id, 'D-FullyAssisted'));
    });
    await T('CBC4C-14 review, Finance, publish, Browse', async () => {
      as('aca'); step('review'); const pr = PR(), blk = () => cbRvChecks(pr).block.map(b => b.msg);
      ok('CBC4C-14 Review & Publish: the only thing left is Finance approval of the payment terms', blk().length >= 1 && blk().every(m => /Finance|payment terms|package/i.test(m)) && !!q('[data-act="cbPublish"][disabled]'), J(blk()));
      step('payments'); fb1Click(); click(q('[data-act="cb8Submit"]'), 'Submit to Finance'); if (MODAL) mok(/Submit for review/);
      const wf = cb8Wf(pr); ok('CBC4C-15 the financial terms are submitted to Finance (pending)', !!wf && wf.status === 'Pending', wf && wf.status);
      as('fin'); go('a-queue', { id: wf.qid }); click(q(`[data-act="e1Decide"][data-a="approve"]`) || $1(`[data-act="e1Decide"][data-a="approve"]`), 'Approve'); rsn('Checked against the price list'); mok(/^Approve/);
      ok('CBC4C-16 the Finance Admin approves them', cb8Wf(pr).status === 'Approved');
      as('aca'); step('review'); click(q('[data-act="cbPublish"]'), 'Publish'); $a('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = '2026-12-20T21:59'; }); rsn('Ready for intake'); mok(/^Publish/);
      ok('CBC4C-17 published: Active, Version 1', pr.status === 'Active' && pr.version === 1, pr.status);
      as('short'); go('browse'); const card = qa('.catalogue-card').find(c => c.textContent.includes(TITLE));
      ok('CBC4C-18 a learner sees it in Browse with its Display Duration (12 months) and the lowest fee', !!card && /12 months/.test(card.textContent) && /1,800/.test(card.textContent), card && card.textContent.replace(/\s+/g, ' ').slice(0, 200));
      SS.setItem(K + 'snap', J({ id: pr.id, disp: cbcDisp(pr, 1), durV: pr.durV, tree: (cbTree(pr) || []).length, ev: cbEvOf(n5ConfigFor(pr.id, 1)).map(e => e.name), pay: cb8Cur(pr.id) && cb8Cur(pr.id).opts.map(o => o.pay.map(x => x.k)) }));
      fcpSave();
    });
    return next(1);
  }
  if (PH === 1) {
    await T('CBC4C-19 after a reload', async () => {
      as('aca'); const pr = PR(), s = JSON.parse(SS.getItem(K + 'snap') || '{}');
      ok('CBC4C-19 after a reload the published programme is intact: Display Duration, schedule duration, curriculum, Required Observation, approved plans', !!pr && pr.status === 'Active' && J(cbcDisp(pr, 1)) === J(s.disp) && J(pr.durV) === J(s.durV) && (cbTree(pr) || []).length === s.tree && J(cbEvOf(n5ConfigFor(pr.id, 1)).map(e => e.name)) === J(s.ev) && J(cb8Cur(pr.id).opts.map(o => o.pay.map(x => x.k))) === J(s.pay));
      as('short'); go('browse'); ok('CBC4C-19 …and still in Browse with 12 months', qa('.catalogue-card').some(c => c.textContent.includes(TITLE) && /12 months/.test(c.textContent)));
    });
    await T('CBC4C-20 lifecycle of the existing demo programme', async () => {
      const P = cdPr(), v1 = P.version, cfg1 = J(n5ConfigFor(P.id, v1)), pkg1 = J(cb8Cur(P.id)), sig = J(STORE.chSig || {});
      const lrn = () => J(Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.nvq && w.nvq.progVersion, w.signup && w.signup.pin || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status])), (w.assignments || []).map(a => [a.id, a.status]), (w.observations || []).map(o => [o.id, o.status]), w.dObs || null]; }));
      const l0 = lrn();
      as('aca'); ACT.s3WizVersion({ dataset: { id: P.id } }); rsn('CBC4 version 2'); const b = $a('#modal-root [data-mi]').find(x => /btn-primary|btn-danger/.test(x.className)); if (b) click(b);
      go('a-programmes', { id: P.id, tab: 'details' }); click(q('#cbr2-obs-yes'));
      ok('CBC4C-20 Create New Version: Version 2 (draft) inherits Version 1\'s Display Duration', n5DraftV(P) === v1 + 1 && J(cbcDisp(P, v1 + 1)) === J(cbcDisp(P, v1)));
      go('a-programmes', { id: P.id, tab: 'observations' }); const e = cbEvOf(n5Draft(P))[0]; click(q(`.cbr2-ro[data-e="${e.id}"] [data-act="cbObsEv"]`)); $1('#ev-n').value = 'Changed in Version 2'; mok(/^Save$/);
      go('a-programmes', { id: P.id, tab: 'payments' }); const o = cb8Work(P).opts.find(x => x.status === 'Active'); const f = q(`.cbr2-opt[data-o="${o.id}"] input[data-f="obsWp"]`); if (f && !f.disabled) { f.value = String((o.obsWp || 0) + 5); f.dispatchEvent(new Event('change', { bubbles: true })); }
      ok('CBC4C-21 editing the draft (a Required Observation, a fee) leaves Version 1\'s observation configuration and approved terms exactly as they were', J(n5ConfigFor(P.id, v1)) === cfg1 && J(cb8Cur(P.id)) === pkg1);
      go('a-programmes', { id: P.id, tab: 'payments' }); fb1Click(); const sub = q('[data-act="cb8Submit"]'); if (sub) { click(sub); if (MODAL) mok(/Submit for review/); }
      ok('CBC4C-22 the draft\'s terms waiting for Finance don\'t change the terms in force for learners', (cb8Wf(P) || {}).status === 'Pending' && J(cb8Cur(P.id)) === pkg1);
      ok('CBC4C-23 learners stay pinned to Version 1: enrolments, pinned plans, submissions, observation records and location choices unchanged; signed letters unchanged', lrn() === l0 && J(STORE.chSig || {}) === sig);
    });
    await T('CBC4C-24 answer keys: Teacher vs Assessor', async () => {
      const d = s2Defs().find(x => x.id === 'a10'); as('aca'); d.qs[0].key = 'CBC4 KEY'; // (setup) a written key on the demo assessment
      // (setup) a real submission to mark — an assignment with nothing submitted now opens on "Not submitted yet" (CMA stability)
      as('nvq-fa'); go('assignment', { id: 'a10' }); const rb = document.querySelector('main .paper .rte-body'); if (rb) { rb.innerHTML = '<p>CBC4 answer.</p>'; INP.rteInput(rb); fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); const x = MODAL && MODAL.actions.find(y => y.cls && /primary/.test(y.cls)); if (x && x.fn) x.fn(); ff(16500); }); closeModal(); }
      as('teacher'); const m0 = !!MODAL; ACT.cbr2DocView({ dataset: { id: d.id, doc: (cbr2Docs(d)[0] || { id: 'x' }).id } }); const tOpen = !!MODAL && !m0; closeModal();
      const sub = tasSubs(true).find(s => { const a = tasAsg(s); return a && a.id === d.id && s.at; }); if (sub) go('t-mark', { id: sub.key });
      ok('CBC4C-24 a Teacher (not the Assessor) sees no answer key on the marking page and can\'t open a key document directly', !/CBC4 KEY/.test(main()) && !tOpen);
      as('assessor'); const s2 = tasSubs(true).find(s => { const a = tasAsg(s); return a && a.id === d.id && s.at; }); if (s2) go('t-mark', { id: s2.key });
      ok('CBC4C-24 the allocated Assessor sees the written key when marking', !!s2 && /CBC4 KEY/.test(main()));
      ACT.resetDemo(); closeModal();
    });
    [K + 'phase', K + 'R', K + 'snap', K + 'asg'].forEach(k => SS.removeItem(k));
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
