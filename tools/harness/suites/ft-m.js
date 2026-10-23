// M — batch delivery-mode selection and course code labels (23 Oct 2026; PD-M-01…10). A Level 3 batch's delivery modes are chosen
// as checkboxes from the modes its course's active fee options offer; the accepted fee options (W1) stay the record; learners keep
// their own option, mode and terms. Course Details shows Course code, Awarding body and Awarding body course code separately.
// Every check does the action through the screen or handler, then checks the record or consuming screen, with the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'M test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BIZ = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const T3 = 'Level 3 Diploma in Adult Care (England)', T2 = 'Level 2 Diploma in Care (England)';
  const day = n => D(n).slice(0, 10), plus = (iso, d, hm = '17:00') => new Date(new Date(iso).getTime() + d * DAY).toISOString().slice(0, 10) + 'T' + hm;
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const J = o => JSON.stringify(o), sorted = a => J(a.slice().sort());
  const qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const modesShown = () => qma('.m-m').map(x => x.value).join('|');
  const tickMode = (m, on) => { const x = qm(`.m-m[value="${m}"]`); x.checked = on; INP.mModeTick(x); };
  const tickOpt = (cls, id, on) => { const x = qm(`.${cls}[value="${id}"]`); x.checked = on; INP.mOptTick(x); };

  // A Level 3 course made in the course builder with the given fee-option rows, then marked Active (publication is covered by ft-cb11 / ft-cbf)
  let cN = 0;
  const course = rows => {
    SA(); go('a-programmes'); ACT.chProgNew(); const n = ++cN;
    fill({ '#np-t': 'M Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/90' + (10 + n) + '/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-code').value = 'MC' + n; document.querySelector('#np-obs-no').checked = true;
    rows.forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = ACT.cbDetCreate(); closeModal(); pr.status = 'Active';
    const id = l => (r1Opts(pr.id).find(o => o.label === l) || {}).id; return { pr, title: pr.title, ids: rows.map(x => id(x.l)) };
  };
  // Create batch through the wizard; o.modes / o.opts = what to tick (default: as offered)
  const nb = (code, title, o = {}) => {
    ACT.newBatch(); if (!MODAL) return null; fill({ '#nb-c': code }); const co = qm('#nb-co'); co.value = title; INP.n2NbCourse(co);
    if (o.start) fill({ '#nb-s': o.start, '#nb-e': o.end || day(900) }); qm('#nb-m').value = 'Online';
    if (o.modes) M_MODES.forEach(m => { if (qm(`.m-m[value="${m}"]`)) tickMode(m, o.modes.includes(m)); });
    if (o.opts) qma('.w1-nb-o').forEach(x => { x.checked = o.opts.includes(x.value); INP.mOptTick(x); });
    if (o.dm) qm('#nb-dm').value = o.dm;
    const s1 = mroot().textContent; if (prim() === false) return { refused: true, msg: mroot().textContent, s1 };
    fill({ '#nb-ac': 'Dr Helen Carter' }); if (prim() === false) return null; prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    return { b: ADMIN.batches.find(x => x.code === code), rev, s1 };
  };
  const opts3 = () => { SA(); const add = (label, fee, mode) => { r1AddOpt('NV-L3', { label, fee, mode }, 'M', 'Added'); return r1Opts('NV-L3').find(o => o.label === label).id; }; return { sp: add('Self-Paced — M', 1800, 'Self-Paced'), fa: add('Fully Assisted — M', 2600, 'Fully Assisted'), std: 'L3-FO-STD' }; };
  const apply3 = (v, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === T3); ACT.applyNvq({ dataset: { id: c.id } }); const r = optId && document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; if (prim() !== false) closeModal(); return W; };
  const finish = (w, b) => { chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };
  const freeL = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress', 'Planned'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))); return ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !skip.includes(l.id) && !n4World(l.id)); };
  const addL = (code, lid, opt) => { ACT.addToBatch({ dataset: { id: code } }); if (!MODAL) return 'refused'; fill({ '#ab-l': lid }); if (opt !== undefined) { const s = qm('#r2-ab-o'); if (opt && ![...s.options].some(x => x.value === opt)) s.insertAdjacentHTML('beforeend', `<option value="${opt}">injected</option>`); s.value = opt; } const r = prim(); const msg = mroot().textContent; if (r !== false) closeModal(); return r === false ? msg : 'added'; };
  const sessAdd = (code, o) => { ACT.addSession({ dataset: { b: code } }); if (!MODAL) return null; fill({ '#se-n': o.t, '#se-d': o.at, '#se-m': '60' }); qm('#se-t').value = 'Marcus Bell'; if (o.aud) qma('.r2-g').forEach(x => { x.checked = o.aud.includes(x.value); }); let r = prim(), n = 0; while (r === false && MODAL && n++ < 3 && !/Tick at least one/.test(mroot().textContent)) r = prim(); if (MODAL) closeModal(); return s4bAllSess().filter(s => s.title === o.t).pop(); };
  // Change (batch detail) and Edit batch details: set the ticks, then save with a reason
  const change = (code, picks, r = 'M change') => { ACT.w1Opts({ dataset: { id: code } }); if (!MODAL) return 'refused'; qma('.w1-o').forEach(x => { if (!x.disabled) x.checked = picks.includes(x.value); }); const t = document.querySelector('#rsn'); t.value = r; const res = prim(); const msg = mroot().textContent; if (res !== false) closeModal(); return res === false ? msg : 'saved'; };
  const editDlg = (code, picks, o = {}) => { ACT.s4bBatchEdit({ dataset: { id: code } }); if (!MODAL) return 'refused'; if (picks) qma('.m-eo').forEach(x => { if (!x.disabled) x.checked = picks.includes(x.value); }); if (o.cap) fill({ '#bd-c': String(o.cap) }); fill({ '#bd-r': o.r === undefined ? 'M edit' : o.r }); let res = prim(); if (res === false && /Select "Review impact and save" again/.test(mroot().textContent)) res = prim(); const msg = mroot().textContent; if (res !== false) closeModal(); return res === false ? msg : 'saved'; };

  /* ================= A. Self-Paced only / Fully Assisted only / both ================= */
  await T('M-A a course with Self-Paced only', async () => {
    fresh(); const c = course([{ l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]); ACA(); go('a-batches');
    ACT.newBatch(); const co = qm('#nb-co'); co.value = c.title; INP.n2NbCourse(co);
    ok('M-A step 1: "Delivery modes this batch accepts" shows a Self-Paced checkbox only (Fully Assisted isn\'t offered)', /Delivery modes this batch accepts/.test(qm('#w1-nb-acc legend').textContent) && modesShown() === 'Self-Paced' && !qm('.m-m[value="Fully Assisted"]') && /offer Self-Paced only, so Fully Assisted isn't available/.test(mroot().textContent));
    ok('M-A the modes are checkboxes (multi-select), not a dropdown; ticked by default with its fee option', qma('.m-m').every(x => x.type === 'checkbox') && !qm('select.m-m') && qm('.m-m').checked && qma('.w1-nb-o').every(x => x.checked) && /Accepts: Self-Paced/.test(qm('.m-sum').textContent));
    tickMode('Self-Paced', false); fill({ '#nb-c': 'M-SP-NONE' });
    ok('M-A (negative) unticking the only mode unticks its option; at least one mode is required; nothing created', !qma('.w1-nb-o').some(x => x.checked) && /Accepts: none/.test(qm('.m-sum').textContent) && prim() === false && /Choose at least one delivery mode/.test(mroot().textContent) && !ADMIN.batches.some(x => x.code === 'M-SP-NONE')); closeModal();
    const a0 = ADMIN.audit.length, r = nb('M-SP', c.title), b = r.b;
    ok('M-A created: accepts the Self-Paced option; its delivery modes are Self-Paced; no batch mode stored', !!b && sorted(b.w1opts) === sorted(c.ids) && J(mModesOf(b)) === J(['Self-Paced']) && b.dmode === undefined);
    ok('M-A review step and audit: "Delivery modes accepted Self-Paced"', /Delivery modes acceptedSelf-Paced/.test(r.rev) && since(a0).some(x => x.action === 'Delivery modes accepted set' && x.after === 'Self-Paced' && x.entity.includes('M-SP')));
    SA(); go('a-batches', { id: 'M-SP' }); ok('M-A batch detail: "Delivery modes accepted: Self-Paced"', /Delivery modes accepted: Self-Paced(?! and)/.test(main()));
  });
  await T('M-B a course with Fully Assisted only', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }]); ACA(); go('a-batches');
    ACT.newBatch(); const co = qm('#nb-co'); co.value = c.title; INP.n2NbCourse(co);
    ok('M-B step 1: a Fully Assisted checkbox only (Self-Paced isn\'t offered)', modesShown() === 'Fully Assisted' && !qm('.m-m[value="Self-Paced"]') && /offer Fully Assisted only, so Self-Paced isn't available/.test(mroot().textContent)); closeModal();
    const b = nb('M-FA', c.title).b; ok('M-B created: delivery modes Fully Assisted', !!b && J(mModesOf(b)) === J(['Fully Assisted']) && sorted(b.w1opts) === sorted(c.ids));
    ACT.w1Opts({ dataset: { id: 'M-FA' } }); ok('M-B Change: still only the Fully Assisted mode is offered', modesShown() === 'Fully Assisted'); closeModal();
  });
  await T('M-C a course with both modes: both shown, both selectable, either alone', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids; ACA(); go('a-batches');
    ACT.newBatch(); const co = qm('#nb-co'); co.value = c.title; INP.n2NbCourse(co);
    ok('M-C step 1: both modes shown, both ticked (one batch can hold both)', modesShown() === 'Self-Paced|Fully Assisted' && qma('.m-m').every(x => x.checked) && /can hold Self-Paced and Fully Assisted learners at the same time/.test(mroot().textContent) && /Accepts: Self-Paced and Fully Assisted/.test(qm('.m-sum').textContent));
    tickMode('Self-Paced', false); ok('M-C unticking Self-Paced unticks its fee option and leaves Fully Assisted', !qm(`.w1-nb-o[value="${sp}"]`).checked && qm(`.w1-nb-o[value="${fa}"]`).checked && /Accepts: Fully Assisted/.test(qm('.m-sum').textContent));
    tickMode('Self-Paced', true); ok('M-C ticking it again ticks its option', qm(`.w1-nb-o[value="${sp}"]`).checked); closeModal();
    const both = nb('M-BOTH', c.title).b, one = nb('M-ONE', c.title, { modes: ['Fully Assisted'] }).b;
    ok('M-C created with both: accepts both options; modes "Self-Paced and Fully Assisted"', sorted(both.w1opts) === sorted([fa, sp]) && J(mModesOf(both)) === J(['Self-Paced', 'Fully Assisted']));
    ok('M-C created with Fully Assisted only: the Self-Paced option isn\'t accepted', J(one.w1opts) === J([fa]) && !w1Accepts(one, sp) && J(mModesOf(one)) === J(['Fully Assisted']));
    COO('A'); SA(); one.coord = 'Dr Helen Carter'; COO('A'); go('c-batches', { id: 'M-ONE' }); ok('M-C Coordinator overview: "Delivery modes accepted" shown', /Delivery modes acceptedFully Assisted/.test(main()));
  });

  /* ================= D. Several fee options within one mode ================= */
  await T('M-D several fee options in one mode: accepted separately; learners keep theirs', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Fully Assisted — agency rate', f: 2100, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [faS, faA, sp] = c.ids; ACA(); go('a-batches');
    ACT.newBatch(); const co = qm('#nb-co'); co.value = c.title; INP.n2NbCourse(co);
    ok('M-D both Fully Assisted options are listed separately under their mode (with their fees)', qma('.m-mode[data-m="Fully Assisted"] .w1-nb-o').length === 2 && /£2,400\.00 — Fully Assisted — standard/.test(mroot().textContent) && /£2,100\.00 — Fully Assisted — agency rate/.test(mroot().textContent));
    tickOpt('w1-nb-o', faA, false);
    ok('M-D unticking one option keeps the mode ticked, shown as part-selected', qm('.m-m[value="Fully Assisted"]').checked && qm('.m-m[value="Fully Assisted"]').indeterminate && /Accepts: Self-Paced and Fully Assisted/.test(qm('.m-sum').textContent)); closeModal();
    const b = nb('M-MULTI', c.title, { opts: [faS, sp] }).b;
    ok('M-D created: the agency-rate option isn\'t accepted although its mode is', sorted(b.w1opts) === sorted([faS, sp]) && !w1Accepts(b, faA) && mModesOf(b).includes('Fully Assisted'));
    const l1 = freeL(), l2 = freeL([l1.id]);
    ok('M-D (negative) Add learner on the unaccepted Fully Assisted option is refused', /doesn't accept/.test(addL('M-MULTI', l1.id, faA)) && !batchRoster(b).some(r => r[1] === l1.id));
    ok('M-D Add learner on the accepted Fully Assisted option: added with that option (not the other one)', addL('M-MULTI', l2.id, faS) === 'added' && b.r2[l2.id].opt === faS);
    ACT.addToBatch({ dataset: { id: 'M-MULTI' } }); ok('M-D Add learner lists only the accepted options', qma('#r2-ab-o option').map(x => x.value).filter(Boolean).sort().join() === [faS, sp].sort().join()); closeModal();
  });

  /* ================= E. One batch, both modes, one learner from each ================= */
  await T('M-E a batch accepting both modes enrols a Self-Paced and a Fully Assisted learner, each on their own terms', async () => {
    fresh(); const o = opts3(); ACA(); const b = nb('M-MIX', T3, { modes: ['Self-Paced', 'Fully Assisted'], opts: [o.sp, o.fa] }).b;
    ok('M-E the Level 3 Diploma (two new options) offers both modes; the batch accepts both', J(mModesOf(b)) === J(['Self-Paced', 'Fully Assisted']) && sorted(b.w1opts) === sorted([o.sp, o.fa]));
    const d = finish(apply3('A', o.sp), b), t0 = J(d.signup.plan); SA(); const l = freeL();
    ok('M-E the Fully Assisted learner is added by an admin with their option', addL('M-MIX', l.id, o.fa) === 'added');
    ok('M-E the Self-Paced learner signed up into the batch, keeping their option, mode and terms', d.signup.batch === 'M-MIX' && r1OptOfW(d).id === o.sp && r1ModeOfW(d) === 'Self-Paced' && J(d.signup.plan) === t0);
    ok('M-E composition from the learners: Mixed — 1 Fully Assisted, 1 Self-Paced', w1Comp(b).kind === 'Mixed' && w1Comp(b).fa === 1 && w1Comp(b).sp === 1);
    ok('M-E each keeps their own mode in the roster info', r2LidInfo(d.me.id, 'M-MIX').mode === 'Self-Paced' && r2LidInfo(l.id, 'M-MIX').mode === 'Fully Assisted');
    go('a-batches', { id: 'M-MIX' }); ok('M-E batch detail: "Delivery modes accepted: Self-Paced and Fully Assisted"', /Delivery modes accepted: Self-Paced and Fully Assisted/.test(main()));
  });

  /* ================= F. Changing modes with enrolments and waitlists ================= */
  await T('M-F mode changes with enrolled and waitlisted learners', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }, { l: 'Self-Paced — agency rate', f: 1600, m: 'Self-Paced' }]), [fa, sp, spA] = c.ids; ACA();
    const b = nb('M-CHG', c.title, { modes: ['Fully Assisted'], start: day(60), end: day(400) }).b, l1 = freeL(); addL('M-CHG', l1.id, fa); const r0 = J(b.r2);
    // add a mode through Edit batch details (modes only, with a reason)
    let a0 = ADMIN.audit.length; ACT.s4bBatchEdit({ dataset: { id: 'M-CHG' } });
    ok('M-F Edit batch details shows the mode checkboxes; the held Fully Assisted mode can\'t be unticked', !!qm('#m-ed-fs') && modesShown() === 'Self-Paced|Fully Assisted' && qm('.m-m[value="Fully Assisted"]').disabled && qm('.m-m[value="Fully Assisted"]').checked && !qm('.m-m[value="Self-Paced"]').checked && /held by learners/.test(qm('#m-ed-fs').textContent)); closeModal();
    ok('M-F (negative) a modes-only change needs a reason', /Enter a reason/.test(editDlg('M-CHG', [fa, sp], { r: '' })) && J(b.w1opts) === J([fa]));
    ok('M-F adding Self-Paced (one of its two options) saves without other changes', editDlg('M-CHG', [fa, sp]) === 'saved' && sorted(b.w1opts) === sorted([fa, sp]) && J(mModesOf(b)) === J(['Self-Paced', 'Fully Assisted']));
    ok('M-F audited: "Delivery modes accepted changed" Fully Assisted → Self-Paced and Fully Assisted; learners\' groups unchanged', since(a0).some(x => x.action === 'Delivery modes accepted changed' && x.before === 'Fully Assisted' && x.after === 'Self-Paced and Fully Assisted' && x.reason === 'M edit') && J(b.r2) === r0);
    ok('M-F (negative) the same choice again: "Nothing has changed"', /Nothing has changed/.test(editDlg('M-CHG', [fa, sp])));
    // modes and capacity together (the form's impact review, then save)
    ok('M-F modes and capacity changed together: both saved', editDlg('M-CHG', [fa, sp, spA], { cap: 20 }) === 'saved' && b.cap === 20 && b.w1opts.includes(spA));
    // a waitlisted Self-Paced learner holds their option
    b.cap = b.enrolled; const l2 = freeL([l1.id]); addL('M-CHG', l2.id, spA);
    ok('M-F a full batch waitlists the Self-Paced learner with their option', (b.w1wait || []).some(x => x.lid === l2.id && x.opt === spA));
    a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'M-CHG' } });
    ok('M-F Change: both modes now held (enrolled / waitlisted) — their checkboxes can\'t be unticked; the waitlisted option is locked', qm('.m-m[value="Fully Assisted"]').disabled && qm('.m-m[value="Self-Paced"]').disabled && qm(`.w1-o[value="${spA}"]`).disabled && !qm(`.w1-o[value="${sp}"]`).disabled); closeModal();
    ok('M-F an unheld option inside a held mode can still be removed', change('M-CHG', [fa, spA]) === 'saved' && !b.w1opts.includes(sp));
    ACT.w1Opts({ dataset: { id: 'M-CHG' } }); qma('.w1-o, .m-m').forEach(x => { x.disabled = false; x.checked = false; }); document.querySelector('#rsn').value = 'Try';
    ok('M-F (negative) removing a held mode by forcing the form is refused; nothing changes', prim() === false && /held by learners in this batch or on its waitlist/.test(mroot().textContent) && sorted(b.w1opts) === sorted([fa, spA])); closeModal();
    ok('M-F (negative) the same through Edit batch details is refused', (() => { ACT.s4bBatchEdit({ dataset: { id: 'M-CHG' } }); qma('.m-eo').forEach(x => { x.disabled = false; x.checked = x.value === sp; }); fill({ '#bd-r': 'Try' }); const r = prim(); const m = mroot().textContent; closeModal(); return r === false && /can't be removed/.test(m); })() && sorted(b.w1opts) === sorted([fa, spA]));
    ok('M-F learners keep their fee options through every change', b.r2[l1.id].opt === fa && b.w1wait.find(x => x.lid === l2.id).opt === spA);
  });

  /* ================= G. Fee options of another course ================= */
  await T('M-G a fee option of another course is refused everywhere', async () => {
    fresh(); const c1 = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }]), c2 = course([{ l: 'Self-Paced — other course', f: 1500, m: 'Self-Paced' }]), [fa] = c1.ids, [other] = c2.ids; ACA();
    // create: a forged checkbox carrying the other course's option
    ACT.newBatch(); fill({ '#nb-c': 'M-X1' }); const co = qm('#nb-co'); co.value = c1.title; INP.n2NbCourse(co); qm('.m-opts').insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" class="w1-nb-o" value="${other}" checked></label>`);
    let a0 = ADMIN.audit.length; ok('M-G (negative) create: refused and logged; no batch', prim() === false && blocked(a0, /another course/) && !ADMIN.batches.some(x => x.code === 'M-X1')); closeModal();
    const b = nb('M-X', c1.title).b, w0 = J(b.w1opts);
    ACT.w1Opts({ dataset: { id: 'M-X' } }); qm('#w1-o-fs .m-opts').insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" class="w1-o" value="${other}" checked></label>`); document.querySelector('#rsn').value = 'Forged';
    a0 = ADMIN.audit.length; ok('M-G (negative) Change: refused and logged; accepted options unchanged', prim() === false && blocked(a0, /another course/) && J(b.w1opts) === w0); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'M-X' } }); qm('#m-ed-fs .m-opts').insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" class="m-eo" value="${other}" checked></label>`); fill({ '#bd-r': 'Forged' });
    a0 = ADMIN.audit.length; ok('M-G (negative) Edit batch details: refused and logged', prim() === false && blocked(a0, /another course/) && J(b.w1opts) === w0); closeModal();
    const l = freeL(); ok('M-G (negative) Add learner with the other course\'s option: refused', /doesn't accept/.test(addL('M-X', l.id, other)) && !batchRoster(b).some(r => r[1] === l.id));
    const ob = nb('M-X2', c2.title).b; addL('M-X', l.id, fa); a0 = ADMIN.audit.length;
    const mv = chDoMove(l.id, b, ob, 'Forged move'); ok('M-G (negative) a transfer to the other course\'s batch is refused (the learner\'s option isn\'t accepted there)', mv === false && batchRoster(b).some(r => r[1] === l.id) && !batchRoster(ob).some(r => r[1] === l.id));
  });

  /* ================= H. Shared sessions and attendance are unchanged ================= */
  await T('M-H existing shared sessions, audiences and attendance survive a mode change', async () => {
    fresh(); const o = opts3(); ACA(); const org = nb('M-ORG', T3, { opts: [o.sp, o.fa] }).b, joiner = nb('M-JOIN', T3, { opts: [o.fa] }).b; SA();
    const l1 = freeL(), l2 = freeL([l1.id]); addL('M-ORG', l1.id, o.fa); addL('M-JOIN', l2.id, o.fa);
    const both = sessAdd('M-ORG', { t: 'M shared class', at: plus(org.start, 10), aud: [o.sp, o.fa] }), faOnly = sessAdd('M-ORG', { t: 'M Fully Assisted class', at: plus(org.start, 11), aud: [o.fa] });
    ACT.n3Join({ dataset: { b: 'M-JOIN' } }); fill({ '#n3-j': both.id }); reason('Shared');
    ok('M-H (setup) the class is shared with the joining batch; both learners are eligible', (both.with || []).includes('M-JOIN') && n4Eligible(both).includes(l1.id) && n4Eligible(both).includes(l2.id));
    const reg = n4RegW(both.id); reg.rows[l1.id] = { status: 'Present', mins: 60 }; reg.rows[l2.id] = { status: 'Present', mins: 55 };
    const snap = () => J({ s: [both, faOnly].map(s => ({ aud: s.aud, with: s.with, batch: s.batch, start: s.start })), reg: STORE.n4.regs, r2: [org.r2, joiner.r2] }), s0 = snap(), e0 = J([n4Eligible(both).sort(), n4Eligible(faOnly).sort()]);
    ok('M-H adding Self-Paced to the joining batch saves', change('M-JOIN', [o.fa, o.sp]) === 'saved' && J(mModesOf(joiner)) === J(['Self-Paced', 'Fully Assisted']));
    ok('M-H sessions keep their audiences and sharing; attendance unchanged; nobody is moved', snap() === s0 && J([n4Eligible(both).sort(), n4Eligible(faOnly).sort()]) === e0);
    ok('M-H sessions still target their fee-option audience (the Fully Assisted class isn\'t opened to the new mode)', J(faOnly.aud) === J([o.fa]) && /Audience: <strong>[^<]*Fully Assisted — M/.test(n4RegisterHtml(faOnly)));
  });

  /* ================= I. Cancel batch: only batches that accept the learner's option ================= */
  await T('M-I cancelling a batch offers each learner only batches that accept their fee option', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids; ACA();
    const b = nb('M-CAN', c.title).b, spB = nb('M-CAN-SP', c.title, { modes: ['Self-Paced'] }).b, faB = nb('M-CAN-FA', c.title, { modes: ['Fully Assisted'] }).b, l = freeL(); addL('M-CAN', l.id, fa);
    ACT.cancelBatch({ dataset: { id: 'M-CAN' } }); const vals = qma(`#cbd-${l.id} option`).map(x => x.value);
    ok('M-I the Fully Assisted learner is offered the Fully Assisted batch, not the Self-Paced one', vals.includes('M-CAN-FA') && !vals.includes('M-CAN-SP') && vals.includes('refund') && /only batches that accept their fee option/.test(mroot().textContent));
    const s = qm(`#cbd-${l.id}`); s.insertAdjacentHTML('beforeend', '<option value="M-CAN-SP">forged</option>'); s.value = 'M-CAN-SP'; fill({ '#cb-r': 'Course change' });
    ok('M-I (negative) a forged choice of the Self-Paced batch is refused; nothing cancelled', prim() === false && b.status !== 'Cancelled' && !batchRoster(spB).some(r => r[1] === l.id)); closeModal();
    ACT.cancelBatch({ dataset: { id: 'M-CAN' } }); qm(`#cbd-${l.id}`).value = 'M-CAN-FA'; fill({ '#cb-r': 'Course change' }); press();
    ok('M-I cancelled: the learner joins the Fully Assisted batch with their recorded option', b.status === 'Cancelled' && batchRoster(faB).some(r => r[1] === l.id) && faB.r2 && faB.r2[l.id] && faB.r2[l.id].opt === fa);
  });

  /* ================= J. Levels 2, 4 and 5 and the legacy standard fee ================= */
  await T('M-J Level 2 keeps one delivery mode; the legacy standard fee keeps its standard-fee mode', async () => {
    fresh(); ACA(); go('a-batches'); ACT.newBatch(); const co = qm('#nb-co'); co.value = T2; INP.n2NbCourse(co);
    ok('M-J Level 2: no mode checkboxes; one Delivery mode dropdown with the reason given', !qm('#w1-nb-acc') && !qm('.m-m') && qm('select#nb-dm').tagName === 'SELECT' && /have no fee options, so a batch has one delivery mode/.test(qm('#nb-dm').closest('.field').textContent)); closeModal();
    const l2 = nb('M-L2', T2, { dm: 'Self-Paced' }).b; ok('M-J Level 2 created as before: one stored mode, no fee options', l2.dmode === 'Self-Paced' && !l2.w1opts);
    ACT.newBatch(); const c3 = qm('#nb-co'); c3.value = T3; INP.n2NbCourse(c3);
    ok('M-J the seeded Level 3 Diploma (only the Standard programme fee): no mode checkboxes; the standard fee row and its mode field', !qm('.m-m') && /no Self-Paced or Fully Assisted fee options yet/.test(mroot().textContent) && qma('.w1-nb-o').length === 1 && /Delivery mode for standard-fee learners/.test(qm('#nb-dm').closest('.field').textContent)); closeModal();
    const std = nb('M-STD', T3, { dm: 'Self-Paced' }).b; ok('M-J the standard-fee batch: its delivery mode is the standard-fee mode', std.dmode === 'Self-Paced' && J(mModesOf(std)) === J(['Self-Paced']));
    SA(); const nov = chBatch('L3AC-NOV26'), n0 = J({ o: nov.w1opts, d: nov.dmode }); go('a-batches', { id: 'L3AC-NOV26' });
    ok('M-J seeded batch: unchanged record; shows "Delivery modes accepted: Fully Assisted"', J({ o: nov.w1opts, d: nov.dmode }) === n0 && /Delivery modes accepted: Fully Assisted/.test(main()));
    // a seeded batch whose enrolled learners have no record (they pre-date fee options, so they're on the standard fee)
    const o = opts3(), man = chBatch('L3AC-JAN27-MAN'); ACT.w1Opts({ dataset: { id: 'L3AC-JAN27-MAN' } });
    ok('M-J seeded batch with unidentified enrolled learners: the Standard programme fee is locked as held', man.enrolled > 0 && qm('.w1-o[value="L3-FO-STD"]').disabled && qm('.w1-o[value="L3-FO-STD"]').checked); closeModal();
    ACT.w1Opts({ dataset: { id: 'L3AC-JAN27-MAN' } }); qma('.w1-o').forEach(x => { x.disabled = false; x.checked = x.value === o.sp; }); document.querySelector('#rsn').value = 'Try';
    ok('M-J (negative) forcing its removal is refused; the batch keeps every option', prim() === false && /Standard programme fee: held by learners/.test(mroot().textContent) && J(man.w1opts) === J(['L3-FO-STD'])); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'L3AC-JAN27-MAN' } }); ok('M-J Edit batch details: their standard-fee mode is locked, with the reason', qm('select#bd-dm').disabled && /on the Standard programme fee are enrolled and follow this setting/.test(qm('#bd-dm').closest('.field').textContent)); closeModal();
    let a1 = ADMIN.audit.length; ok('M-J (negative) changing it directly is refused and logged; the mode stays', n2CanChangeMode(man, 'Self-Paced') === false && blocked(a1) && man.dmode === 'Fully Assisted');
  });

  /* ================= K. Course codes ================= */
  await T('M-K Course code, Awarding body and Awarding body course code are separate', async () => {
    fresh(); SA(); go('a-programmes'); ACT.chProgNew();
    const lab = id => (document.querySelector(`main label[for="${id}"]`) || {}).textContent, order = [...document.querySelectorAll('main .cb-det-form label[for]')].map(l => l.getAttribute('for'));
    ok('M-K the form: three separate fields — Course code, Awarding body, Awarding body course code — in that order', lab('np-code') === 'Course code' && lab('np-q-body') === 'Awarding body' && lab('np-r') === 'Awarding body course code' && order.indexOf('np-code') < order.indexOf('np-q-body') && order.indexOf('np-q-body') === order.indexOf('np-r') - 1);
    ok('M-K the awarding body course code is the existing reference field (no new field)', !!document.querySelector('main #np-r') && document.querySelectorAll('main input[id^="np-"][id*="ab"]').length === 0 && /Separate from the Academy's course code/.test(document.querySelector('main #np-r').closest('.field').textContent));
    fill({ '#np-t': 'M codes course', '#np-l': 'Level 4', '#np-r': 'QN 610/4242/7', '#np-d': '12', '#np-du': 'months', '#np-p': '2400', '#np-q-body': 'NCFE CACHE' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-code').value = 'm-codes1'; document.querySelector('#np-obs-no').checked = true;
    const pr = ACT.cbDetCreate(); closeModal();
    ok('M-K saved independently: pr.code (upper-case), pr.qual.body and pr.ref', !!pr && pr.code === 'M-CODES1' && pr.qual.body === 'NCFE CACHE' && pr.ref === 'QN 610/4242/7');
    go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-code': 'M-CODES2' }); document.querySelector('main [data-act="cbDetSave"]:not([data-next])').click();
    ok('M-K changing the course code leaves the awarding body course code alone', pr.code === 'M-CODES2' && pr.ref === 'QN 610/4242/7' && pr.qual.body === 'NCFE CACHE');
    go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-r': 'QN 610/4242/8' }); document.querySelector('main [data-act="cbDetSave"]:not([data-next])').click();
    ok('M-K changing the awarding body course code leaves the course code alone', pr.ref === 'QN 610/4242/8' && pr.code === 'M-CODES2');
    go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-r': '' }); document.querySelector('main [data-act="cbDetSave"]:not([data-next])').click();
    ok('M-K (negative) the awarding body course code is still required, named as such', pr.ref === 'QN 610/4242/8' && /Enter the awarding body course code/.test(main()));
    go('a-programmes', { id: pr.id, tab: 'review' }); const rv = (document.querySelector('main .cb-rv-sec[data-sec="details"]') || {}).textContent || '';
    ok('M-K Review & Publish: Course code, Awarding body and Awarding body course code each shown', /Course codeM-CODES2/.test(rv) && /Awarding bodyNCFE CACHE/.test(rv) && /Awarding body course codeQN 610\/4242\/8/.test(rv));
    ok('M-K builder header names the awarding body course code', /Course code M-CODES2 · Awarding body course code QN 610\/4242\/8/.test(document.querySelector('main .page-h').textContent));
  });
  await T('M-K historical programmes, versions and learner records are unchanged', async () => {
    fresh(); SA(); const keep = () => J({ p: ADMIN.programmes.filter(p => !p.chNew), w: Object.values(STORE.worlds).map(w => w.nvq && { ab: w.nvq.ab, v: w.nvq.version, t: w.nvq.title }), tr: STORE.s3 && STORE.s3.trees }), k0 = keep();
    go('a-programmes', { id: 'NV-L3', tab: 'details' }); const dl = document.querySelector('main .cb-dl').textContent;
    ok('M-K seeded Level 3 Diploma (read-only): the three rows in order; no course code or awarding body made up', /Course codeNot recordedAwarding bodyNot recordedAwarding body course codeQN 603\/2851\/9/.test(dl.replace(/\s+/g, '')) || /Course code\s*Not recorded\s*Awarding body\s*Not recorded\s*Awarding body course code\s*QN 603\/2851\/9/.test(dl));
    ['NV-L2', 'NV-L4', 'NV-L5', 'NV-L3D', 'NV-L3O'].forEach(id => go('a-programmes', { id, tab: 'details' }));
    ok('M-K programmes, programme versions and learner records unchanged by the new labels', keep() === k0 && s3Pr('NV-L3').ref === 'QN 603/2851/9' && s3Pr('NV-L3').code === undefined);
  });

  /* ================= L. Direct unauthorized actions ================= */
  await T('M-L direct unauthorized actions are refused and logged', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids; ACA(); const b = nb('M-AUTH', c.title, { modes: ['Fully Assisted'] }).b, w0 = J(b.w1opts);
    for (const [lbl, enter] of [['Finance Admin', FA], ['Business Admin', BIZ], ['Coordinator portal', () => { SA(); COO('A'); }], ['learner portal', () => { SA(); learner('C'); }]]) {
      enter(); let a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'M-AUTH' } }); const r1 = !MODAL && blocked(a0); closeModal();
      a0 = ADMIN.audit.length; ACT.s4bBatchEdit({ dataset: { id: 'M-AUTH' } }); const r2 = !MODAL; closeModal();
      a0 = ADMIN.audit.length; ACT.newBatch(); const r3 = !MODAL; closeModal();
      ok(`M-L (negative) ${lbl}: Change modes, Edit batch details and Create batch are refused; nothing changes`, r1 && r2 && r3 && J(b.w1opts) === w0);
    }
    // the role changes while the dialog is open: the save is checked again
    ACA(); ACT.w1Opts({ dataset: { id: 'M-AUTH' } }); qma('.w1-o').forEach(x => { x.checked = true; }); document.querySelector('#rsn').value = 'Late'; FA();
    let a0 = ADMIN.audit.length; ok('M-L (negative) Change saved after losing the right: refused and logged', prim() === false && blocked(a0) && J(b.w1opts) === w0); closeModal();
    ACA(); ACT.s4bBatchEdit({ dataset: { id: 'M-AUTH' } }); qma('.m-eo').forEach(x => { x.checked = true; }); fill({ '#bd-r': 'Late' }); FA();
    a0 = ADMIN.audit.length; ok('M-L (negative) Edit batch details (modes only) after losing the right: refused and logged', prim() === false && blocked(a0) && J(b.w1opts) === w0); closeModal();
    SA(); b.status = 'Completed'; a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'M-AUTH' } }); ok('M-L (negative) a completed batch\'s modes can\'t change', !MODAL && blocked(a0)); b.status = 'Planned';
    const pr = c.pr, k0 = J({ c: pr.code, r: pr.ref, q: pr.qual }); FA(); go('a-programmes', { id: pr.id, tab: 'details' }); a0 = ADMIN.audit.length;
    ACT.cbDetSave({ dataset: { id: pr.id } }); ok('M-L (negative) Finance can\'t save Course Details (codes unchanged)', J({ c: pr.code, r: pr.ref, q: pr.qual }) === k0 && !document.querySelector('main #np-code'));
    void sp;
  });

  /* ================= N. Legacy batches (before W1): an explicit list, fixed once; review when history is unknown ================= */
  // A batch as stored before W1: no accepted list; o.created = its creation date if recorded; o.held = [lid, opt] already enrolled
  const legacy = (code, title, o = {}) => { const b = { code, label: code, course: title, start: D(50, '09:00'), end: D(400, '17:00'), cap: o.cap || 10, enrolled: 0, mode: 'Online', dmode: 'Fully Assisted', coord: 'Dr Helen Carter', teachers: [], assessors: [], status: 'Open', wait: 0, roster: [], ...(o.created ? { created: o.created } : {}) };
    (o.held || []).forEach(([lid, opt]) => { const L = learnerById(lid); b.roster.push([L.name, lid, 'Self-funded']); b.enrolled++; (b.r2 = b.r2 || {})[lid] = { opt, by: 'Seed', at: D(-30), src: 'Historical' }; }); ADMIN.batches.push(b); return b; };
  const worlds = () => J(Object.values(STORE.worlds).map(w => ({ s: w.signup && { b: w.signup.batch, p: w.signup.plan }, plans: w.plans, n: w.nvq && { b: w.nvq.batch, s: w.nvq.status } })));
  const SEEDED = ['L3AC-JAN26', 'L3AC-NOV26', 'L3AC-NOV26-LEI', 'L3AC-DEC26-AUH', 'L3AC-OCT26-ONL', 'L3AC-JAN27-MAN', 'L3AC-FEB27-AUH'];
  await T('M-N existing legacy batches get an explicit list once; options created later aren\'t added', async () => {
    fresh(); SA(); const l3 = SEEDED.map(chBatch), l2 = ADMIN.batches.filter(b => !w1L3(b) && b.dmode);
    ok('M-N every seeded Level 3 batch now has an explicit list: the Standard programme fee (their learners pre-date options); no review needed', l3.every(b => b && J(b.w1opts) === J(['L3-FO-STD']) && b.mElig && !b.mElig.review && b.mElig.basis === 'no creation date'));
    ok('M-N their stored delivery mode is unchanged (Fully Assisted)', l3.every(b => b.dmode === 'Fully Assisted') && J(mModesOf(chBatch('L3AC-NOV26'))) === J(['Fully Assisted']));
    ok('M-N Levels 2, 4 and 5: no list, no eligibility record; one stored mode as before', l2.length > 0 && l2.every(b => b.w1opts === undefined && !b.mElig));
    const w0 = worlds(), o = opts3(), nov = chBatch('L3AC-NOV26'), lei = chBatch('L3AC-NOV26-LEI');
    ok('M-N options added to the programme afterwards aren\'t accepted by the legacy batches (no longer "every option")', !w1Accepts(nov, o.sp) && !w1Accepts(lei, o.fa) && J(lei.w1opts) === J(['L3-FO-STD']) && J(mModesOf(lei)) === J(['Fully Assisted']));
    const l = freeL(), l2b = freeL([l.id]); ACA();
    ok('M-N (negative) Add learner on a newly added option: refused', /doesn't accept/.test(addL('L3AC-NOV26-LEI', l.id, o.sp)) && !batchRoster(lei).some(r => r[1] === l.id));
    ok('M-N Add learner on the Standard programme fee still works (legacy behaviour)', addL('L3AC-NOV26-LEI', l2b.id, 'L3-FO-STD') === 'added');
    const d = apply3('A', o.sp), near = w1WithW(d, () => chNearestFor(d)); SA();
    ok('M-N sign-up assignment never picks a legacy batch for a newly added option', !near || !SEEDED.includes(near.code), near && near.code);
    ok('M-N no existing learner\'s batch, terms or payments changed', worlds().length > 0 && J(JSON.parse(w0).filter(x => x.s && x.s.p).map(x => [x.s.b, x.s.p, x.plans])) === J(JSON.parse(worlds()).filter(x => x.s && x.s.p && !(x.s.p.opt && x.s.p.opt.id === o.sp)).map(x => [x.s.b, x.s.p, x.plans])));
  });
  await T('M-N recorded dates: an option created after the batch is left out; one that existed at creation is kept (no review)', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids;
    const old = legacy('M-LEG-OLD', c.title, { created: '2020-01-01T09:00:00.000Z' }), young = legacy('M-LEG-NEW', c.title, { created: new Date(now().getTime() + 60000).toISOString() });
    SA(); go('a-batches', { id: 'M-LEG-OLD' }); go('a-batches', { id: 'M-LEG-NEW' });
    ok('M-N a batch created before the options existed accepts none of them (nothing invented); no review — the dates are known', J(old.w1opts) === '[]' && sorted(old.mElig.later) === sorted([fa, sp]) && !old.mElig.review);
    ok('M-N a batch created after them accepts both', sorted(young.w1opts) === sorted([fa, sp]) && !young.mElig.review);
    const a0 = ADMIN.audit.length; ACA(); ok('M-N an administrator adds an option explicitly (audited)', change('M-LEG-OLD', [sp]) === 'saved' && J(old.w1opts) === J([sp]) && since(a0).some(x => x.action === 'Fee options accepted changed' && x.entity.includes('M-LEG-OLD')));
  });
  await T('M-N unknown history: enrolled learners kept; review required before new enrolments on the other options', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids;
    const L1 = freeL(), b = legacy('M-LEG-UNK', c.title, { held: [[L1.id, fa]] }), r0 = J(b.r2), ro0 = J(b.roster), w0 = worlds();
    SA(); let a0 = ADMIN.audit.length; go('a-batches', { id: 'M-LEG-UNK' });
    ok('M-N no creation date: the enrolled learner\'s option is kept; the unconfirmed one is left out, not guessed', J(b.w1opts) === J([fa]) && J(b.mElig.unknown) === J([sp]) && b.mElig.review === true);
    ok('M-N marked for review: notice on the batch with "Review eligibility"; logged', !!document.querySelector('main .m-review') && /Fee-option eligibility needs review/.test(main()) && !!document.querySelector('main .m-review [data-act="w1Opts"]') && since(a0).some(x => x.action === 'Fee-option eligibility review needed' && x.entity.includes('M-LEG-UNK')));
    ok('M-N the enrolled learner stays, with their option; nothing about learners changed', J(b.r2) === r0 && J(b.roster) === ro0 && worlds() === w0);
    COO('A'); go('c-batches', { id: 'M-LEG-UNK' }); ok('M-N the Coordinator sees the review notice (without the action)', !!document.querySelector('main .m-review') && !document.querySelector('main .m-review [data-act]'));
    // enforcement while under review: Add learner, waitlist offer, transfer, cancellation move
    ACA(); const L2 = freeL([L1.id]), L3 = freeL([L1.id, L2.id]);
    ok('M-N (negative) Add learner on the unconfirmed option: refused', /doesn't accept/.test(addL('M-LEG-UNK', L2.id, sp)));
    ok('M-N Add learner on the held option: allowed', addL('M-LEG-UNK', L2.id, fa) === 'added');
    (b.w1wait = b.w1wait || []).push({ id: 'WL-M1', lid: L3.id, name: learnerById(L3.id).name, agency: 'Self-funded', opt: sp, at: D(-1) }); b.wait = 1; a0 = ADMIN.audit.length;
    ACT.kOffer({ dataset: { id: 'M-LEG-UNK', n: learnerById(L3.id).name, w1: 'WL-M1' } }); ok('M-N (negative) waitlist offer on the unconfirmed option: refused and logged', !MODAL && blocked(a0) && !batchRoster(b).some(r => r[1] === L3.id)); closeModal();
    const src = nb('M-LEG-SRC', c.title, { modes: ['Self-Paced'] }).b, L4 = freeL([L1.id, L2.id, L3.id]); addL('M-LEG-SRC', L4.id, sp);
    ok('M-N (negative) transfer of a Self-Paced learner into it: refused', chDoMove(L4.id, src, b, 'Move') === false && !batchRoster(b).some(r => r[1] === L4.id));
    ACT.cancelBatch({ dataset: { id: 'M-LEG-SRC' } }); ok('M-N cancellation move: the batch under review isn\'t offered for the Self-Paced learner', !!MODAL && !qma(`#cbd-${L4.id} option`).map(x => x.value).includes('M-LEG-UNK')); closeModal();
    // unauthorized: the review can't be completed
    for (const [lbl, enter] of [['Finance Admin', FA], ['Business Admin', BIZ], ['Coordinator portal', () => { SA(); COO('A'); }]]) { enter(); a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'M-LEG-UNK' } }); ok(`M-N (negative) ${lbl} can't review or add options (refused, logged)`, !MODAL && blocked(a0) && b.mElig.review && J(b.w1opts) === J([fa])); closeModal(); }
    ACA(); ACT.w1Opts({ dataset: { id: 'M-LEG-UNK' } }); qm(`.w1-o[value="${sp}"]`).checked = true; document.querySelector('#rsn').value = 'Late'; FA(); a0 = ADMIN.audit.length;
    ok('M-N (negative) losing the right before saving: refused; still under review', prim() === false && blocked(a0) && b.mElig.review && J(b.w1opts) === J([fa])); closeModal();
    // authorized review: add the Self-Paced option explicitly
    ACA(); ACT.w1Opts({ dataset: { id: 'M-LEG-UNK' } }); ok('M-N the Change dialog explains the review', /Fee-option eligibility needs review/.test(mroot().textContent)); closeModal();
    a0 = ADMIN.audit.length; ok('M-N an administrator adds the option: accepted, review completed, both audited', change('M-LEG-UNK', [fa, sp], 'Confirmed with the intake plan') === 'saved' && sorted(b.w1opts) === sorted([fa, sp]) && !b.mElig.review && since(a0).some(x => x.action === 'Fee-option eligibility reviewed' && x.reason === 'Confirmed with the intake plan') && since(a0).some(x => x.action === 'Fee options accepted changed'));
    go('a-batches', { id: 'M-LEG-UNK' }); ok('M-N after review: no notice; the learners still on their options', !document.querySelector('main .m-review') && b.r2[L1.id].opt === fa && b.r2[L2.id].opt === fa);
    b.w1wait = []; b.wait = 0; ok('M-N after review the Self-Paced learner can be added', addL('M-LEG-UNK', L3.id, sp) === 'added');
  });
  await T('M-N a review can confirm the list as it stands', async () => {
    fresh(); const c = course([{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]), [fa, sp] = c.ids, L1 = freeL(), b = legacy('M-LEG-KEEP', c.title, { held: [[L1.id, fa]] });
    ACA(); const a0 = ADMIN.audit.length;
    ok('M-N saving the unchanged list completes the review (audited); the unconfirmed option stays out', change('M-LEG-KEEP', [fa], 'Fully Assisted only') === 'saved' && !b.mElig.review && !w1Accepts(b, sp) && since(a0).some(x => x.action === 'Fee-option eligibility reviewed'));
    ok('M-N …and a second save with nothing changed is "Nothing has changed" again', /Nothing has changed/.test(change('M-LEG-KEEP', [fa])));
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n'); document.body.appendChild(out);
})();
