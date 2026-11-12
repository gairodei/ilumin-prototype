// CBR correction batch 4 (6 Nov 2026). Legacy fixture.
// A Display Duration is required to publish a new programme (Save draft without one is fine; existing Drafts stay editable; published
// programmes are untouched; a new version inherits or falls back and isn't blocked; payments never read it).
// B Role matrix across the builder's write actions (create, edit, version, publish, Finance approval, assessment types, observation
// library, Required Observations, fee plans, offer letters), on screen and by direct handler calls; learner actions from a staff session.
(async function () {
  // FB1 (PD-FB1-03): this suite's deposit configuration, chosen explicitly where its fixture prepares a package for Finance — each new fee
  // option "Allow Deposit: Yes" with the Academy default, through the Step 5 handler (an administrator's action; role checks apply).
  const fb1Dep = p => { if (p && cb8Managed(p)) cb8Work(p).opts.filter(o => o.status === 'Active' && fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: p.id, o: o.id, k: 'allow' }, checked: true })); };
  const fb1Click = () => { for (let i = 0, y; i < 20 && (y = document.querySelector('main .fb1-dep[data-ans="none"] .fb1-yn input[data-k="allow"]')); i++) y.click(); }; // FB1: Allow Deposit — Yes, clicked on each unanswered card
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const q = s => $1('main ' + s), qa = s => $a('main ' + s), main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CBC4 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const type = (sel, v) => { const e = q(sel); if (!e) throw new Error('missing ' + sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const as = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const step = (pr, k) => go('a-programmes', { id: pr.id || pr, tab: k });
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blockedSince = a0 => since(a0).some(x => /^Blocked/.test(x.action));
  const DISP = /^Display Duration: set it in Course Details before publishing/;
  let made = 0;
  const make = disp => {
    as('A'); go('a-programmes'); click(q('[data-act="chProgNew"]')); const n = ++made;
    type('#np-t', 'CBC4 Level 3 course ' + n); type('#np-r', 'QN 610/' + (9400 + n) + '/1'); q('#np-l').value = 'Level 3'; INP.r1NpLevel(q('#np-l'));
    if (disp) type('#cbc3-dd-n', disp); type('#np-d', '12');
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = qa('.r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    qa('.cr-dm-c').forEach(x => { x.checked = true; }); click(q('#cbr2-obs-no')); click(q('[data-act="cbDetCreate"]')); closeModal(); return (STORE.chNewProgs || []).slice(-1)[0];
  };
  const pubKeep = () => J(ADMIN.programmes.filter(p => p.status !== 'Draft').map(p => [p.id, p.version, p.dur, J(p.durV || null), J((CBR().cfg[p.id] || {})[p.version] && CBR().cfg[p.id][p.version].disp || null)]));
  const p0 = pubKeep(), learners0 = J(Object.keys(STORE.worlds).sort().map(v => [v, STORE.worlds[v].signup && STORE.worlds[v].signup.pin || null, (STORE.worlds[v].plans || []).map(p => p.rows.map(r => [r.due, r.amount]))]));

  await T('CBC4-A Display Duration and publishing', async () => {
    // FB2 (PD-FB2-01) supersedes CBC4-A1…A6 for new programmes: the Course Duration (was the optional Display Duration) is required to create
    // the course, because it sets the payment dates — so a new programme can no longer reach "publishing blocked without it". The CBC4 publish
    // check still applies to Drafts made before FB2 (A7) and is unchanged.
    const c0 = (STORE.chNewProgs || []).length; make('');
    ok('CBC4-A1 (FB2) a new programme can\'t be created without the Course Duration; nothing created', (STORE.chNewProgs || []).length === c0 && /Enter the Course Duration/.test(main()));
    const P = make('12');
    ok('CBC4-A2 (FB2) with it, the Draft is created and Save draft works', !!P && P.status === 'Draft' && J(cbcDisp(P, 1)) === J({ n: 12, unit: 'months' }) && (step(P, 'details'), type('#np-q-glh', '310'), click(qa('[data-act="cbDetSave"]').find(b => !b.dataset.next)), (P.qual || {}).glh === 310 && !q('.err')));
    ok('CBC4-A3 (FB2) the Display Duration publishing block never applies to it — in the publish check or in Review & Publish', !ch8Check(P).block.some(b => DISP.test(b)) && !cbRvChecks(P).block.some(b => DISP.test(b.msg)));
    step(P, 'details'); type('#cbc3-dd-n', '10');
    ok('CBC4-A6 (FB2, supersedes "the Display Duration doesn\'t enter the financial basis") the Course Duration is the financial basis and the schedule duration', J(cb8Basis(P).dur) === J({ n: 10, unit: 'months' }) && J(P.durV) === J({ n: 10, unit: 'months' }));
    const n1 = cbPr('NV-N1');
    ok('CBC4-A7 an existing Draft without one stays editable (its Display Duration field is there, with the fallback hint)', (step(n1, 'details'), !!q('#cbc3-dd-n:not([disabled])') && /Not set — learners see/.test(q('.cbc3-dd .hint').textContent)) && ch8Check(n1).block.some(b => DISP.test(b)));
    const n2 = cbPr('NV-N2');
    ok('CBC4-A8 existing published programmes are unchanged (no Display Duration written, durations as before)', pubKeep() === p0 && !cbcDisp(n2, n2.version));
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('CBC4 v2'); go('a-programmes', { id: 'NV-N2', tab: 'details' }); click(q('#cbr2-obs-yes'));
    ok('CBC4-A9 a new version of a programme without one isn\'t blocked by it: it uses the fallback, with a warning', !!n5DraftV(n2) && !cbRvChecks(n2).block.some(b => /Display Duration/.test(b.msg)) && cbRvChecks(n2).warn.some(w => /Display Duration not set — learners will see the Payment Schedule Duration/.test(w.msg)));
    // a published programme with a Display Duration: its new version inherits it
    // inheritance: a version's record is copied from the previous version's when the draft's record is first made
    const v = n2.version, m = CBR().cfg[n2.id] = CBR().cfg[n2.id] || {}, keep = m[v + 1]; delete m[v + 1];
    cbrCfgW(n2, v).disp = { n: 8, unit: 'months' }; cbrCfgW(n2, v + 1); // (setup) the published version's record, as if set before it was published
    ok('CBC4-A10 a new version inherits the previous version\'s Display Duration (no warning then)', J(cbcDisp(n2, v + 1)) === J({ n: 8, unit: 'months' }) && !cbRvChecks(n2).warn.some(w => /Display Duration not set/.test(w.msg)));
    delete m[v].disp; if (keep) m[v + 1] = keep; else delete m[v + 1];
    ok('CBC4-A11 learners\' pinned terms and schedules are unchanged', J(Object.keys(STORE.worlds).sort().map(v => [v, STORE.worlds[v].signup && STORE.worlds[v].signup.pin || null, (STORE.worlds[v].plans || []).map(p => p.rows.map(r => [r.due, r.amount]))])) === learners0);
  });

  await T('CBC4-B role matrix', async () => {
    const P = make('12'); as('A'); step(P, 'payments'); const o = cb8Work(P).opts.find(x => x.status === 'Active');
    const Qo = make('12'); as('A'); step(Qo, 'details'); click(q('#cbr2-obs-yes')); ACT.cbrObsLoc({ dataset: { p: Qo.id, loc: 'wp', v: 'on' } }); // (setup) a Draft with observations and the Workplace on
    const ROLES = [['A', 'Super Admin', true], ['SY', 'System Admin', true], ['KA', 'Academic Admin', true], ['FA', 'Finance Admin', false], ['BA', 'Business Admin', false], ['QA', 'IQA', false]];
    const tries = {
      'create a programme': () => { go('a-programmes'); const b = q('[data-act="chProgNew"]'); return !!b; },
      'edit Course Details': () => { const g0 = (P.qual || {}).glh; ACT.cbDetSave({ dataset: { id: P.id } }); return !blockedNow(); },
      'create a new version': () => { ACT.s3WizVersion({ dataset: { id: 'NV-L3' } }); return !!MODAL; },
      'publish': () => { ACT.cbPublish({ dataset: { id: P.id } }); return !!MODAL; },
      'add an assessment type': () => { ACT.addType({ dataset: {} }); return !!MODAL; },
      'create an observation category': () => { ACT.ol1CbNew({ dataset: { p: Qo.id, loc: 'wp' } }); return !!MODAL; },
      'add a Required Observation': () => { ACT.cbObsEv({ dataset: { p: Qo.id, e: '' } }); return !!MODAL; },
      'change a fee option': () => { ACT.cb8Opt({ dataset: { p: P.id, o: o.id } }); return !!MODAL; },
      'add an instalment option': () => { const n = o.pay.length; ACT.cb8PayAdd({ dataset: { p: P.id, o: o.id, k: '5' } }); const added = cb8Work(P).opts.find(x => x.id === o.id).pay.length > n; if (added) ACT.cb8PayDel({ dataset: { p: P.id, o: o.id, k: '5' } }); return added; },
      'replace an offer letter': () => { ACT.cbrLetterUp({ dataset: { p: P.id } }); return !!MODAL; },
    };
    let A0 = 0; const blockedNow = () => blockedSince(A0);
    for (const [av, who, can] of ROLES) {
      const res = {}; for (const [k, f] of Object.entries(tries)) { as(av); A0 = ADMIN.audit.length; step(P, 'details'); let r; try { r = f(); } catch (e) { r = 'threw ' + e.message; } res[k] = r; closeModal(); }
      const wrong = Object.entries(res).filter(([, r]) => r !== can);
      ok(`CBC4-B1 ${who}: ${can ? 'can' : 'can\'t'} create, edit, version, publish, manage types, library categories, Required Observations, fees and offer letters (direct calls included)`, !wrong.length, J(wrong));
    }
    // Finance approval: only Finance (or the Super Admin's own approval) decides a submitted package
    as('KA'); step(P, 'payments'); fb1Click(); ACT.cb8Submit({ dataset: { p: P.id } }); if (MODAL) press(); const qid = cb8Wf(P).qid;
    for (const av of ['KA', 'SY', 'BA', 'QA']) { as(av); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('try'); closeModal(); }
    ok('CBC4-B2 Academic, System, Business Admin and IQA can\'t approve the package', cb8Wf(P).status === 'Pending');
    as('FA'); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked');
    ok('CBC4-B3 the Finance Admin approves it', cb8Wf(P).status === 'Approved');
    // learner actions from a staff session (the loaded learner's work)
    setVariant('C'); const a = W.assignments.find(x => ['Not Started', 'Resubmission Required'].includes(x.status) && !x.closed), st0 = a.status;
    for (const av of ['FA', 'BA', 'A']) { as(av); const a1 = ADMIN.audit.length; const r = ACT.reviewSubmit({ dataset: { id: a.id } }); const r2 = ACT.cfSaveDraft({ dataset: { id: a.id } });
      ok(`CBC4-B4 ${av}: a learner\'s submission or draft can\'t be made from a staff session (refused, logged, nothing changed)`, r === false && r2 === false && !MODAL && a.status === st0 && since(a1).some(x => /Blocked: submit an assignment/.test(x.action))); }
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
