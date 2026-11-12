// CBR correction batch 3 — wording and the two durations (6 Nov 2026). Legacy fixture; real clicks where a control is rendered.
// Display Duration (Course Details, learner-facing, per version) never moves payments; Payment Schedule Duration (Fees & Payment Plans)
// keeps the Finance rules — Draft only, refused while with Finance, re-approval after a change; Review & Publish shows each where it
// belongs; Browse shows the display value; nothing historical changes. Then the wording sweep: no old step names or rule codes in any
// step or dialog, the warnings that matter are still there, tooltips are reachable by keyboard, and the seven steps are intact.
(async function () {
  // FB1 (PD-FB1-03): this suite's deposit configuration, chosen explicitly where its fixture prepares a package for Finance — each new fee
  // option "Allow Deposit: Yes" with the Academy default, through the Step 5 handler (an administrator's action; role checks apply).
  const fb1Dep = p => { if (p && cb8Managed(p)) cb8Work(p).opts.filter(o => o.status === 'Active' && fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: p.id, o: o.id, k: 'allow' }, checked: true })); };
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const q = s => $1('main ' + s), qa = s => $a('main ' + s), main = () => ($1('main') || document.body).textContent;
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('control not rendered'); el.click(); };
  const mclick = re => click($a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim())));
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CBC3 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const type = (sel, v) => { const e = q(sel); if (!e) throw new Error('missing ' + sel); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  const as = av => () => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA');
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const step = (pr, k) => go('a-programmes', { id: pr.id || pr, tab: k });
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  // what must never change: learners' pinned terms and schedules, signed letters, published versions
  const hist = () => J({ w: Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.signup && w.signup.pin || null, (w.plans || []).map(p => p.rows.map(r => [r.due, r.amount, r.status]))]; }), sig: Object.keys(STORE.chSig || {}).length, pub: ADMIN.programmes.map(p => [p.id, p.version, p.status, p.dur || null]) });
  const h0 = hist();
  const dates = pr => { step(pr, 'payments'); return qa('.cbr2-pl .cb8-dates li').map(li => li.textContent.replace(/\s+/g, ' ')); };
  let made = 0;
  const make = disp => {
    SA(); go('a-programmes'); ACT.chProgNew(); const n = ++made;
    type('#np-t', 'CBC3 Level 3 course ' + n); type('#np-r', 'QN 610/' + (9300 + n) + '/1'); q('#np-l').value = 'Level 3'; INP.r1NpLevel(q('#np-l'));
    if (disp) { type('#cbc3-dd-n', disp); } // FB2: the Course Duration is the payment duration (was a separate #np-d = pdN)
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = qa('.r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    qa('.cr-dm-c').forEach(x => { x.checked = true; }); click(q('#cbr2-obs-no')); click(q('[data-act="cbDetCreate"]')); closeModal(); return (STORE.chNewProgs || []).slice(-1)[0];
  };

  // FB2 (PD-FB2-01…04) supersedes CBC3-A1…C5 for programmes created from now on: one duration — the Course Duration in Course Details —
  // is both what learners see and what payment dates are spread across. CBC3's two durations still apply to programmes made before FB2
  // (CBC3-C6, CBC3-D2…D4 on NV-N2; ft-fb2 FB2-G3). Each check below keeps the intent of the CBC3 check it replaces.
  await T('CBC3-A new programme: one duration (FB2)', async () => {
    SA(); go('a-programmes'); ACT.chProgNew();
    const grid = q('.cbr2-grid'), nf = q('.cbr2-newfees');
    ok('CBC3-A1 (FB2) the new-course form asks for the Course Duration (fifth field); no Payment Schedule Duration with the starting fees', !!grid && J([...grid.querySelectorAll(':scope > .field')].map(f => (f.querySelector(':scope > label, :scope > legend') || {}).textContent)[4]) === J('Course Duration') && !!nf && !nf.querySelector('fieldset.e1-dur') && !grid.querySelector('#np-d'));
    ok('CBC3-A1 (FB2) …with its short hint: shown to learners, instalment dates spread across it', /Shown to learners/.test(q('.cbc3-dd .hint').textContent) && /Instalment dates are spread evenly/.test(q('.cbc3-dd .hint').textContent));
    type('#np-t', 'CBC3 invalid display'); type('#cbc3-dd-n', '99'); const n0 = (STORE.chNewProgs || []).length; click(q('[data-act="cbDetCreate"]'));
    ok('CBC3-A2 an invalid Course Duration is refused before anything is created', (STORE.chNewProgs || []).length === n0 && /from 1 to 60/.test((q('.cbc3-dd .err') || {}).textContent || ''));
    ACT.cbDetDiscard({ dataset: { key: 'new' } }); mclick(/Discard changes/);
    const P = make('10');
    ok('CBC3-A3 (FB2) created with Course Duration 10 months (Version 1): it is also the payment duration — one value', !!P && J(cbcDisp(P, 1)) === J({ n: 10, unit: 'months' }) && J(P.durV) === J({ n: 10, unit: 'months' }));
    const c1 = (STORE.chNewProgs || []).length; make('');
    ok('CBC3-A4 (FB2) without a Course Duration the course isn\'t created (it sets the payment dates; CBC3/CBC4 created it with a fallback)', (STORE.chNewProgs || []).length === c1);
  });

  await T('CBC3-B Course Duration and the payment terms (FB2)', async () => {
    const P = make('12'); ACA(); step(P, 'payments');
    const o = cb8Work(P).opts.find(x => x.status === 'Active'); [3, 6].forEach(k => { const i = $1('#cb8-k-' + o.id); i.value = String(k); click(q(`[data-act="cb8PayAdd"][data-o="${o.id}"]`)); step(P, 'payments'); });
    fb1Dep(P); ACT.cb8Submit({ dataset: { p: P.id } }); if (MODAL) press(); const qid = cb8Wf(P).qid; FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked');
    ok('CBC3-B setup: the package is approved by Finance', cb8Wf(P).status === 'Approved');
    SA(); const d0 = dates(P), dur0 = J(P.durV), a0 = ADMIN.audit.length;
    step(P, 'details'); type('#np-q-glh', '420'); q('#np-d').value = '99'; click(qa('[data-act="cbDetSave"]').find(b => !b.dataset.next));
    ok('CBC3-B4 a Course Details save can\'t change the payment duration through its hidden field (unchanged rule)', (P.qual || {}).glh === 420 && J(P.durV) === dur0 && cb8Wf(P).status === 'Approved');
    step(P, 'payments'); ok('CBC3-C1 (FB2) Fees & Payment Plans shows the Course Duration read-only — no separate duration or Save', !q('#cbc3-pd-n') && !q('[data-act="cbcPayDur"]') && /Course Duration\s*12 months/.test(q('.fb2-cdur').textContent));
    const a1 = ADMIN.audit.length; step(P, 'details'); type('#cbc3-dd-n', '6');
    ok('CBC3-B1/C2 (FB2) editing the Course Duration (real input) saves it at once, audited; the instalment dates follow', J(cbcDisp(P)) === J({ n: 6, unit: 'months' }) && J(P.durV) === J({ n: 6, unit: 'months' }) && since(a1).some(x => x.action === 'Course duration changed' && x.after === '6 months') && since(a1).some(x => x.action === 'Payment schedule duration changed' && x.before === '12 months' && x.after === '6 months') && !CB_CACHE[P.id] && J(dates(P)) !== J(d0));
    ok('CBC3-B3/C3 (FB2) the approved terms go back to Finance (re-approval required), and Review & Publish blocks until Finance approves', cb8Wf(P).status === 'Draft' && since(a1).some(x => x.action === 'Payment terms need Finance approval again') && cbRvChecks(P).block.length > 0);
    ACA(); step(P, 'payments'); fb1Dep(P); ACT.cb8Submit({ dataset: { p: P.id } }); if (MODAL) press();
    step(P, 'details'); const a2 = ADMIN.audit.length;
    ok('CBC3-C4 while the terms are with Finance the duration is read-only ("with Finance")', !!q('#cbc3-dd-n[disabled]') && /With Finance/.test(q('.cbc3-dd .hint').textContent));
    INP.cbcDisp({ dataset: { p: P.id } }); ok('CBC3-C4 …and a direct call is refused and logged; nothing changes', J(P.durV) === J({ n: 6, unit: 'months' }) && since(a2).some(x => x.action === 'Blocked: change the course duration'));
    for (const [f, who] of [[FA, 'Finance Admin'], [BA, 'Business Admin']]) { f(); step(P, 'details'); const a3 = ADMIN.audit.length; INP.cbcDisp({ dataset: { p: P.id } }); ACT.cbcPayDur({ dataset: { p: P.id } }); ok(`CBC3-C5 ${who}: no editable control and direct calls are refused`, !q('#cbc3-dd-n:not([disabled])') && J(P.durV) === J({ n: 6, unit: 'months' }) && since(a3).some(x => /^Blocked/.test(x.action))); }
    SA(); step('NV-N2', 'payments'); const n2 = cbPr('NV-N2'), d2 = J(n2.durV), a4 = ADMIN.audit.length; ACT.cbcPayDur({ dataset: { p: 'NV-N2' } });
    ok('CBC3-C6 a published programme: read-only, and a direct change is refused', !q('#cbc3-pd-n') && J(n2.durV) === d2 && since(a4).some(x => /^Blocked/.test(x.action)));
  });

  await T('CBC3-D Review & Publish, Browse, versions', async () => {
    const P = make('10'); SA(); step(P, 'review');
    const sec = k => (q(`.cb-rv-sec[data-sec="${k}"]`) || { textContent: '' }).textContent;
    ok('CBC3-D1 (FB2) Review & Publish: Course Duration under Course Details, "Payment dates spread across" it under Fees & Payment Plans; no plain "Duration" row', /Course Duration\s*10 months/.test(sec('details')) && !/Payment Schedule Duration/.test(sec('payments')) && /Payment dates spread across\s*10 months/.test(sec('payments')));
    ok('CBC3-D1 no Display Duration warning once it is set', !cbRvChecks(P).warn.some(w => /Display Duration not set/.test(w.msg)));
    // Browse: a published programme with its own Display Duration shows it; without one, the duration shown before
    const n2 = cbPr('NV-N2'), cat = CATALOGUE.find(c => c.kind === 'nvq' && c.title === n2.title), before = cat && catCard(cat);
    ok('CBC3-D2 Browse without a Display Duration shows the same duration as before', !!cat && before.includes(cat.dur));
    ACT.s3WizVersion({ dataset: { id: 'NV-N2' } }); reason('CBC3 v2'); step(n2, 'details');
    click(q('[data-act="cbrDisp"]')); $1('#cd-n').value = '15'; $1('#cd-u').value = 'months'; mclick(/^Save$/);
    ok('CBC3-D3 a new version records its own Display Duration (Edit on the read-only details)', J(cbcDisp(n2, n2.version + 1)) === J({ n: 15, unit: 'months' }) && !cbcDisp(n2, n2.version));
    ok('CBC3-D3 …Browse keeps the published version\'s (until Version 2 is published)', catCard(cat) === before);
    const pv = n2.version; cbrCfgW(n2, pv).disp = { n: 14, unit: 'months' }; // the published version's own record (as set before it was published)
    ok('CBC3-D4 with a published Display Duration, Browse shows it instead of the payment schedule duration', /14 months/.test(catCard(cat)) && !catCard(cat).includes('>' + cat.dur + '<'));
    delete cbrCfgW(n2, pv).disp;
  });

  await T('CBC3-E wording', async () => {
    SA(); const bad = /\bSection [1-8]\b|\b(?:PD|CH)-[A-Z0-9]|\bN5a?\b|Pre-N5|observation event/;
    const progs = ['NV-N1', 'NV-L3D', 'NV-L3', 'NV-N2'].concat((STORE.chNewProgs || []).slice(-1).map(p => p.id)), hits = [];
    progs.forEach(id => CB_SECTIONS.forEach(([k]) => { go('a-programmes', { id, tab: k }); qa('details').forEach(d => { d.open = true; }); const t = main().replace(/NV-[A-Z0-9]+/g, 'NV-ID'); const m = t.match(bad); /* programme IDs aren't wording (FB2: one course fewer is made above, so the last is NV-N5, which matched N5) */ if (m) hits.push(`${id}/${k}: …${t.slice(Math.max(0, m.index - 40), m.index + 40)}…`); }));
    ok('CBC3-E1 no old section numbers, step names, rule codes or "observation event" on any step of five programmes (folds open)', !hits.length, hits.slice(0, 4).join(' | '));
    const dl = [], P = cbPr(progs[progs.length - 1]), tryD = (name, f) => { closeModal(); try { f(); } catch (e) { dl.push(name + ' threw'); } if (MODAL) { const t = $1('#modal-root').textContent; const m = t.match(bad); if (m) dl.push(`${name}: …${t.slice(Math.max(0, m.index - 40), m.index + 40)}…`); } closeModal(); };
    tryD('Add type', () => ACT.addType({ dataset: {} })); tryD('Add assessment', () => ACT.cbrAsgNew({ dataset: { p: 'NV-N1', lvl: 'prog' } })); tryD('Fee option', () => ACT.cb8Opt({ dataset: { p: P.id, o: cb8Work(P).opts[0].id } }));
    tryD('Record duration', () => ACT.crDurRec({ dataset: { p: 'NV-L3' } })); tryD('Add Required Observation', () => ACT.cbObsEv({ dataset: { p: 'NV-L3D', e: '' } })); tryD('Create batch', () => { go('a-batches'); ACT.newBatch(); });
    tryD('Display Duration', () => ACT.cbrDisp({ dataset: { p: 'NV-N1' } })); tryD('Upload letter', () => ACT.chLetterUp({ dataset: { id: 'NV-N1' } }));
    ok('CBC3-E2 …nor in the builder\'s dialogs (types, assessment, fee option, duration, Required Observation, Create batch, letter)', !dl.length, dl.join(' | '));
    go('a-batches'); ACT.newBatch(); ok('CBC3-E3 the Create batch hint names the current step', /Fees & Payment Plans|Only courses with a published version/.test($1('#modal-root').textContent)); closeModal();
    go('a-programmes', { id: 'NV-N1', tab: 'review' }); ok('CBC3-E4 Review & Publish: "Fix in <step>" links without section numbers', qa('.cb-rv-fix').length > 0 && qa('.cb-rv-fix').every(b => /^Fix in (Course Details|Curriculum & Outcomes|Assessments|Observations|Fees & Payment Plans|Offer Letters)$/.test(b.textContent.trim())), qa('.cb-rv-fix').map(b => b.textContent).slice(0, 3).join());
  });

  await T('CBC3-F warnings kept, tooltips, structure', async () => {
    SA(); const P = (STORE.chNewProgs || []).slice(-1)[0];
    step(P, 'payments'); const o = cb8Work(P).opts.find(x => x.status === 'Active');
    ACT.cb8OptRetire({ dataset: { p: P.id, o: o.id } }); ok('CBC3-F1 destructive confirmations keep their consequences (remove / retire a fee option)', !!MODAL && /never approved, so it is removed|stops being offered/.test($1('#modal-root').textContent)); closeModal();
    step(P, 'payments'); const al = q('.cbr2-dep input[data-k="allow"]'); if (al && !al.checked) click(al); step(P, 'payments');
    ok('CBC3-F2 the deposit rule (28 days) is still stated where Allow Deposit is on, without the rule code', /28 days or more/.test(q('.cbr2-dep').textContent) && !/CH-10/.test(main()));
    step('NV-N1', 'details'); q('#cbr2-obs-yes').click(); ACT.cbrObsLoc({ dataset: { p: 'NV-N1', loc: 'wp', v: 'on' } }); step('NV-N1', 'details'); q('#cbr2-obs-no').click();
    ok('CBC3-F3 the Yes → No question with what is kept is unchanged', !!MODAL && /Turn observations off/.test(MODAL.title)); closeModal();
    step('NV-L3D', 'curriculum'); ACT.cbr2Types && 0; step('NV-L3D', 'assessments'); click(q('[data-act="cbr2Types"]'));
    const tip = q('.cbr2-tbox details.cbc3-tip'), sm = tip && tip.querySelector('summary');
    ok('CBC3-F4 tooltips: a disclosure with an accessible name, reachable by keyboard (focusable summary) and opened by it', !!sm && !!sm.getAttribute('aria-label') && (sm.focus(), document.activeElement === sm) && (sm.click(), tip.open) && /Each Learning Outcome uses one type/.test(tip.textContent));
    ok('CBC3-F5 the seven approved steps, in order, with their names', J(CB_SECTIONS.map(s => s[0])) === J(['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'review']) && J(CB_SECTIONS.map(s => s[1])) === J(['Course Details', 'Curriculum & Outcomes', 'Assessments', 'Observations', 'Fees & Payment Plans', 'Offer Letters', 'Review & Publish']));
    ok('CBC3-G learners\' pinned terms and schedules, signed letters and published programmes (status, version, duration) unchanged', J(JSON.parse(hist()).w) === J(JSON.parse(h0).w) && JSON.parse(hist()).sig === JSON.parse(h0).sig && J(JSON.parse(hist()).pub.filter(x => JSON.parse(h0).pub.some(y => y[0] === x[0] && y[2] !== 'Draft'))) === J(JSON.parse(h0).pub.filter(y => y[2] !== 'Draft')));
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
