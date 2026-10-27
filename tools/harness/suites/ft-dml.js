// DM-L / DM-P — the seeded programmes and NEW batch eligibility (26 Oct 2026; PD-DM-11…21). A course takes new batches only when it is
// active and its published version has Finance-approved fee options with a delivery mode. The seeded Level 2 Diploma (one programme
// price) and Level 3 Diploma (Standard programme fee only) are excluded; their batches and learners continue. The Level 2 Diploma is
// upgraded through Course Builder (a compliant Version 2: Section 4, Section 5, Finance, Review & Publish) and then takes a batch with
// both modes. Publication gates, version pinning, held (unpublished) options, direct calls and roles are checked. Real handlers only.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, L2 = 'Level 2 Diploma in Care (England)', T3 = 'Level 3 Diploma in Adult Care (England)', PID = 'NV-L2';
  const q = s => document.querySelector('main ' + s), qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const mroot = () => document.getElementById('modal-root');
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'DM-P test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const back = () => { const a = MODAL.actions.find(x => /Back/i.test(x.label)); return a && a.fn ? a.fn() : 'no back'; };
  const tick = (sel, vals) => qma(sel).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const radio = (n, v) => { const x = qm(`input[name="${n}"][value="${v}"]`); if (x) x.checked = true; return !!x; };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const SYS = () => { setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const BA = () => { bizEnter('BA'); S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const pr = () => s3Pr(PID);
  const courses = () => qma('#nb-co option').map(o => o.value);
  const openNb = (code, title) => { SYS(); go('a-batches'); ACT.newBatch(); fill({ '#nb-c': code }); const co = qm('#nb-co'); if (title) { co.value = title; INP.n2NbCourse(co); } qm('#nb-m').value = 'Online'; };
  // a direct attempt: the course is put into the list by hand, as a forged request would
  const forge = (code, title) => { SYS(); go('a-batches'); ACT.newBatch(); if (!MODAL) return 'no dialog'; fill({ '#nb-c': code }); const co = qm('#nb-co'); co.insertAdjacentHTML('beforeend', `<option>${esc(title)}</option>`); co.value = title; INP.n2NbCourse(co); const a0 = ADMIN.audit.length, r = prim(); const out = { refused: r === false, logged: blocked(a0, /course not eligible/), step: MODAL && MODAL.title }; closeModal(); return out; };
  const shown = el => !!el && !el.closest('.cr-nc-hid') && (!el.closest('.field') || el.closest('.field').style.display !== 'none');
  const hist = codes => J({ b: ADMIN.batches.filter(b => codes.includes(b.code)).map(b => [b.code, b.status, b.dmode, b.dmodeSrc, b.cap, b.start, b.end, b.crModes || null, b.w1opts || null, b.crBase || null, b.progVersion || null, batchRoster(b)]),
    l: ADMIN.learners.filter(l => ADMIN.batches.some(b => codes.includes(b.code) && batchRoster(b).some(r => r[1] === l.id))).map(l => [l.id, l.courses, l.acct, l.rec]),
    w: Object.values(STORE.worlds).filter(w => w.me && ADMIN.batches.some(b => codes.includes(b.code) && batchRoster(b).some(r => r[1] === w.me.id))).map(w => [w.me.id, w.plans, w.signup && w.signup.plan]),
    p1: (({ v, fee, inst, deposit, meth }) => ({ v, fee, inst, deposit, meth }))(s4Plans(PID)[0]), r2: ADMIN.batches.filter(b => codes.includes(b.code)).map(b => b.r2 || null) });
  // The authorized upgrade, as the System Administrator does it: Version 2 (observations answered and set up), the duration, a financial
  // package with fee options by delivery mode (Fully Assisted £1,800 — the existing fee — and Self-Paced £1,200), Finance approval,
  // publication. stop: where to stop part-way.
  const configure = (stop) => {
    SYS(); go('a-programmes', { id: PID, tab: 'details' }); ACT.newProgVersion({ dataset: { id: PID } }); reason('Delivery modes for new intakes');
    go('a-programmes', { id: PID, tab: 'observations' }); ACT.n5Settings({ dataset: { p: PID } }); radio('n5-req', 'yes'); radio('n5-wp', 'Permitted'); radio('n5-off', 'Available'); press();
    const d = n5Draft(pr()), nvq = n5NvqOk(pr(), d).map(x => x.code), ia = d.ia.filter(x => x.status === 'Active').map(x => x.code);
    nvq.forEach(c => { ACT.n5NvqEv({ dataset: { p: PID, c } }); tick('.n5-ev', ['notes']); press(); });
    ia.forEach(c => { ACT.n5IaEdit({ dataset: { p: PID, c } }); tick('.n5-ev', ['notes']); tick('.n5-map', [nvq[0]]); press(); });
    ACT.cbObsEv({ dataset: { p: PID, e: '' } }); fill({ '#ev-n': 'Workplace observation' }); tick('.ev-l', ['workplace']); tick('.ev-c', nvq.concat(ia)); tick('.ev-e', ['notes']); press();
    if (stop === 'version') return;
    go('a-programmes', { id: PID, tab: 'payments' }); ACT.crDurRec({ dataset: { p: PID } }); fill({ '#cr-du-n': '12' }); reason('From the qualification specification');
    ACT.cb8Start({ dataset: { p: PID } }); ACT.crFoStart({ dataset: { p: PID } }); reason('Offer Self-Paced alongside Fully Assisted');
    if (stop === 'switch') return;
    const fo = cb8Work(pr()).opts.find(o => o.status === 'Active');
    ACT.cb8Opt({ dataset: { p: PID, o: fo.id } }); fill({ '#c8-l': 'Fully Assisted', '#c8-wp': '70', '#c8-off': '70' }); qm('#c8-m').value = 'Fully Assisted'; press();
    ACT.cb8Opt({ dataset: { p: PID, o: '' } }); fill({ '#c8-l': 'Self-Paced', '#c8-f': '1200', '#c8-wp': '100', '#c8-off': '100' }); qm('#c8-m').value = 'Self-Paced'; press();
    cb8Work(pr()).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: PID, o: o.id, k: '6' } }));
    if (stop === 'modes') return;
    go('a-programmes', { id: PID, tab: 'payments' }); ACT.cb8Submit({ dataset: { p: PID } }); if (MODAL) press(); const qid = cb8Wf(pr()).qid;
    if (stop === 'pending') return qid;
    FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list');
    if (stop === 'held') return qid;
    SYS(); ACT.kPubProg({ dataset: { id: PID } }); reason('Version 2: delivery modes for new intakes'); return qid;
  };
  const wiz = (code, title, modes) => {
    openNb(code, title); M_MODES.forEach(m => { const x = qm(`.m-m[value="${m}"]`); if (x) { x.checked = modes.includes(m); INP.mModeTick(x); } });
    const s1 = M_MODES.filter(m => qma(`.m-m[value="${m}"]`).some(x => x.checked));
    if (prim() === false) return { err: mroot().textContent.slice(0, 300) };
    back(); const kept = M_MODES.filter(m => qma(`.m-m[value="${m}"]`).some(x => x.checked));
    if (prim() === false) return { err: 'again: ' + mroot().textContent.slice(0, 300) };
    fill({ '#nb-ac': 'Dr Helen Carter' }); if (prim() === false) return { err: 's2 ' + mroot().textContent.slice(0, 300) }; prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    const b = ADMIN.batches.find(x => x.code === code); if (b) { b.start = D(40, '09:00'); b.end = D(400, '17:00'); } return { b, rev, s1, kept };
  };
  const signUp = (v, optId, b) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === L2); ACT.applyNvq({ dataset: { id: c.id } });
    const offered = qma('input[name="r1-opt"]').map(x => x.value); const r = qm(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true;
    if (prim() === false) return { offered, err: mroot().textContent.slice(0, 200) }; closeModal(); const w = W;
    chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal();
    return { w, offered };
  };
  const OLD = () => ADMIN.batches.filter(b => b.course === L2).map(b => b.code);
  const free = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress', 'Planned'].includes(x.status)).flatMap(x => batchRoster(x).map(y => y[1]))); return ADMIN.learners.filter(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !n4World(l.id) && !skip.includes(l.id)); };
  const addL = (code, lid, opt) => { SYS(); ACT.addToBatch({ dataset: { id: code } }); if (!MODAL) return 'refused'; fill({ '#ab-l': lid }); const s = qm('#r2-ab-o'); if (s && opt) s.value = opt; const x = prim(); closeModal(); return x === false ? 'refused' : 'added'; };

  await T('A seeded programmes excluded from new batches', async () => {
    fresh(); const p = pr();
    ok('A the seeded Level 2 Diploma: published (Version 1) but one programme price, no fee option with a delivery mode, no financial package', p.status === 'Active' && p.version === 1 && !r1Opts(PID).length && !cb8Managed(p) && s4PlanCur(PID).fee === 1800);
    ok('A the seeded Level 3 Diploma: only the Standard programme fee (no delivery mode)', r1Opts('NV-L3').length === 1 && r1Opts('NV-L3')[0].legacy && !r1Opts('NV-L3')[0].mode);
    ok('A no seeded programme is eligible: Level 2, Level 3, Level 5 and the Level 2 Certificate lack approved mode-specific options; drafts, the suspended and the retired are excluded', crEligTitles().length === 0 && ['NV-L2', 'NV-L3', 'NV-L5', 'NV-N2', 'NV-L4', 'NV-L3O', 'NV-L3D', 'NV-N1'].every(id => !!crEligWhy(s3Pr(id))));
    openNb('DMP-A1');
    ok('A Create batch: the course list excludes them all, with the reason; no mode dropdown, no "not configured" panel, no Standard fee control', courses().length === 0 && /No course is ready for new batches/.test(qm('.cr-nb-elig').textContent) && !shown(qm('#nb-dm')) && !qm('#cr-nc') && !qm('.w1-nb-o') && !qm('.cr-pend') && !qma('select').some(s => s.offsetParent !== null && [...s.options].some(o => o.value === 'Self-Paced')));
    const a0 = ADMIN.audit.length; ok('A (negative) Next with no eligible course is refused and logged', prim() === false && blocked(a0, /course not eligible/) && /step 1 of 5/.test(MODAL.title)); closeModal();
    [[L2, 'seeded Level 2'], [T3, 'seeded Level 3'], ['Level 5 Diploma in Leadership and Management for Adult Care', 'seeded Level 5'], [s3Pr('NV-L3D').title, 'a draft'], [s3Pr('NV-L4').title, 'a suspended programme'], [s3Pr('NV-L3O').title, 'a retired programme']].forEach(([t, who]) => {
      const r = forge('DMP-F', t); ok(`A (negative) a direct create-batch attempt for ${who} is refused and logged`, r.refused && r.logged && /step 1 of 5/.test(r.step || '') && !ADMIN.batches.some(b => b.code === 'DMP-F'), J(r));
    });
    // existing batches and learners continue under their recorded terms
    const l = free()[0]; ok('A existing Level 2 batch: a learner can still be added (its recorded mode, on the programme price)', addL('L2DC-JAN27', l.id) === 'added' && batchRoster(ADMIN.batches.find(b => b.code === 'L2DC-JAN27')).some(r => r[1] === l.id));
    const l3 = free([l.id])[0]; ok('A existing Level 3 batch: a learner can still join on the Standard programme fee it accepts', addL('L3AC-NOV26', l3.id, 'L3-FO-STD') === 'added' && r2LidInfo(l3.id, 'L3AC-NOV26').mode === 'Fully Assisted');
    const jb = ADMIN.batches.find(x => x.code === 'L2DC-JAN27'); SYS(); ACT.s4bBatchEdit({ dataset: { id: jb.code } });
    ok('A Edit an existing Level 2 batch: only its own mode', !qm('#bd-dm') || [...qm('#bd-dm').options].map(o => o.value).join() === 'Fully Assisted'); closeModal();
    const a1 = ADMIN.audit.length; ok('A (negative) changing an existing batch to an unpriced mode is refused and logged', n2CanChangeMode(jb, 'Self-Paced') === false && jb.dmode === 'Fully Assisted' && ADMIN.audit.length > a1);
    SYS(); go('a-programmes', { id: PID, tab: 'details' }); ok('A Course Details: not configured, and it takes no new batches until a compliant version is published', /Delivery modes not configured for this course/.test(q('.cr-dm-ro').textContent) && /can't take new batches/.test(q('.cr-dm-ro').textContent));
  });

  await T('B publication gate', async () => {
    fresh(); configure('version'); const p = pr();
    const blocks = () => cbRvChecks(p).block.map(x => x.msg);
    ok('B Version 2 without fee options: Review & Publish blocks "add at least one fee option with a delivery mode" and the missing package, linked to Section 5', blocks().some(m => /Fee options: add at least one fee option with a delivery mode/.test(m)) && blocks().some(m => /start a financial package/.test(m)) && cbRvChecks(p).block.filter(x => /Fee option|financial package/.test(x.msg)).every(x => x.sec === 'payments'), J(blocks()));
    SYS(); go('a-programmes', { id: PID, tab: 'review' }); ok('B the Publish button is disabled with the reasons listed', q('[data-act="cbPublish"]').disabled && /Fee options: add at least one fee option/.test(document.querySelector('main').textContent));
    const a0 = ADMIN.audit.length; ACT.kPubProg({ dataset: { id: PID } }); if (MODAL && /^Publish/.test(MODAL.title)) reason('Try'); closeModal();
    ok('B (negative) a direct publish call is refused and logged; still Version 1', p.version === 1 && blocked(a0, /publish/));
    fresh(); configure('switch');
    ok('B after "Use fee options by delivery mode": the existing fee without a mode blocks publication', cbRvChecks(pr()).block.some(x => /Fee option "Programme fee": choose its delivery mode/.test(x.msg)));
    fresh(); configure('modes');
    ok('B modes given, not yet approved: no fee-option block; Finance approval still blocks', !cbRvChecks(pr()).block.some(x => /Fee option/.test(x.msg)) && cbRvChecks(pr()).block.some(x => /Payment terms/.test(x.msg)), J(cbRvChecks(pr()).block.map(x => x.msg)));
    fresh(); configure('held'); const h = pr();
    ok('B approved by Finance for Version 2 (held): publishable; the options are NOT in force for Version 1', !cbRvChecks(h).block.length && !r1Opts(PID).length && !!cb8Wf(h).held, J(cbRvChecks(h).block.map(x => x.msg)));
    ok('B (version integrity) before publication the course stays excluded from new batches', !crElig(h) && forge('DMP-H', L2).refused);
  });

  await T('C compliant Version 2 and Create batch', async () => {
    fresh(); const old = OLD(), h0 = hist(old); configure(); const p = pr();
    const sp = r1Opts(PID).find(o => o.mode === 'Self-Paced'), fa = r1Opts(PID).find(o => o.mode === 'Fully Assisted');
    ok('C Version 2 published with Fully Assisted £1,800 and Self-Paced £1,200 approved; plan version 2 in force, version 1 kept', p.version === 2 && !!sp && !!fa && sp.fee === 1200 && fa.fee === 1800 && s4PlanCur(PID).v === 2 && s4Plans(PID)[0].status === 'Superseded');
    ok('C the same seeded Level 2 programme is eligible again', crElig(p) && J(crEligTitles()) === J([L2]));
    openNb('DMP-C1'); ok('C Create batch: the Level 2 Diploma is listed (only eligible courses)', J(courses()) === J([L2]));
    const co = qm('#nb-co'); co.value = L2; INP.n2NbCourse(co);
    ok('C Self-Paced and Fully Assisted checkboxes; no dropdown, no panel, no Standard fee control', qma('.m-m').map(x => x.value).join() === M_MODES.join() && !shown(qm('#nb-dm')) && !qm('#cr-nc') && !qma('.w1-nb-o').some(x => r1Opt(x.value).legacy) && /from its published, Finance-approved fee options/.test(qm('.cr-src').textContent)); closeModal();
    const r = wiz('DMP-C1', L2, M_MODES);
    ok('C both ticked together, kept after Back', J(r.s1) === J(M_MODES) && J(r.kept) === J(M_MODES), J(r));
    ok('C Review & Create lists both modes and both accepted fee options', /Delivery modes accepted\s*Self-Paced and Fully Assisted/.test(r.rev || '') && /Fee options\s*Self-Paced: Self-Paced · Fully Assisted: Fully Assisted/.test(r.rev || ''), (r.rev || '').slice(0, 300));
    ok('C saved: both modes, both approved options, pinned to Version 2', !!r.b && J(crBModes(r.b)) === J(M_MODES) && J(r.b.w1opts.slice().sort()) === J([fa.id, sp.id].sort()) && r.b.progVersion === 2 && M_MODES.every(m => crReady(r.b, m) === 'ready'), J(r.b && [r.b.progVersion, r.b.w1opts]));
    SYS(); go('a-batches', { id: 'DMP-C1' }); ok('C batch details: both modes, Version 2', /Delivery modes accepted:\s*Self-Paced and Fully Assisted/.test(q('.m-modes').textContent) && /Programme version: Version 2/.test(document.querySelector('main').textContent));
    ACT.w1Opts({ dataset: { id: 'DMP-C1' } }); ok('C Change dialog: both modes ticked', qma('.m-m:checked').length === 2); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'DMP-C1' } }); ok('C Edit batch details: both modes ticked', qma('.m-m:checked').length === 2); closeModal();
    const w1 = wiz('DMP-C2', L2, ['Fully Assisted']); ok('C one mode can be chosen on its own', !!w1.b && J(crBModes(w1.b)) === J(['Fully Assisted']));
    openNb('DMP-C3', L2); qma('.m-m').forEach(x => { x.checked = false; INP.mModeTick(x); }); tick('.w1-nb-o', []); ok('C (negative) no mode chosen is refused', prim() === false && /step 1 of 5/.test(MODAL.title)); closeModal();
    openNb('DMP-C4', L2); qm('.w1-nb-o').insertAdjacentHTML('afterend', '<input type="checkbox" class="w1-nb-o" value="L3-FO-STD" checked>'); const a0 = ADMIN.audit.length;
    ok('C (negative) a forged Level 3 Standard programme fee in the request is refused and logged', prim() === false && blocked(a0) && !ADMIN.batches.some(b => b.code === 'DMP-C4')); closeModal();
    // one learner on each option, with that option's approved fee and payment terms
    const a = signUp('A', sp.id, r.b), f = signUp('F', fa.id, r.b);
    ok('C sign-up offers only the two approved options of the published version', J(a.offered.slice().sort()) === J([fa.id, sp.id].sort()), J(a.offered));
    ok('C Self-Paced learner: £1,200, 6 × £200, Self-Paced', !!a.w && a.w.signup.plan.opt.id === sp.id && a.w.signup.plan.fee === 1200 && r2ModeOfW(a.w) === 'Self-Paced' && a.w.plans.find(x => x.e === 'nvq').rows[0].amount === 200, J(a.w && a.w.signup.plan));
    ok('C Fully Assisted learner: £1,800, 6 × £300, Fully Assisted', !!f.w && f.w.signup.plan.opt.id === fa.id && f.w.signup.plan.fee === 1800 && r2ModeOfW(f.w) === 'Fully Assisted' && f.w.plans.find(x => x.e === 'nvq').rows[0].amount === 300, J(f.w && f.w.signup.plan));
    const [l1] = free(); ok('C (negative) Add to batch with a Level 3 fee option is refused', addL('DMP-C1', l1.id, 'L3-FO-STD') === 'refused' && !batchRoster(r.b).some(x => x[1] === l1.id));
    ok('C historical: the older batches, rosters, learners, their plans and plan version 1 are unchanged', hist(old) === h0);
    ok('C older batches keep their mode on the programme fee, ready as before', old.every(c => { const b = ADMIN.batches.find(x => x.code === c); return b.dmode === 'Fully Assisted' && crReady(b, 'Fully Assisted') === 'ready'; }));
    // archived afterwards: excluded again
    SA(); ACT.eArchive({ dataset: { id: PID } }); if (MODAL) reason('No further intakes'); closeModal();
    ok('C archived: excluded from new batches; a direct attempt is refused and logged', pr().status === 'Archived' && !crElig(pr()) && forge('DMP-C9', L2).refused, pr().status);
  });

  await T('D one-mode course; Standard fee never offered to a new batch', async () => {
    fresh(); FA(); ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }); fill({ '#fo-l': 'Fully Assisted — 2027', '#fo-f': '2600' }); const m = qm('#fo-m'); if (m) m.value = 'Fully Assisted'; reason('Finance: new option');
    const fa = r1Opts('NV-L3').find(o => o.mode === 'Fully Assisted');
    ok('D Finance adds a Fully Assisted option to the Level 3 Diploma (in force for its published version): eligible, Fully Assisted only', !!fa && crElig(s3Pr('NV-L3')) && J(crOptModes('NV-L3')) === J(['Fully Assisted']));
    openNb('DMP-D1', T3);
    ok('D Create batch: only a Fully Assisted checkbox; the Standard programme fee is not offered', qma('.m-m').map(x => x.value).join() === 'Fully Assisted' && !qma('.w1-nb-o').some(x => x.value === 'L3-FO-STD') && !shown(qm('#nb-dm'))); closeModal();
    const r = wiz('DMP-D1', T3, ['Fully Assisted']); ok('D created with Fully Assisted only; no Standard fee; no standard-fee mode stored', !!r.b && J(r.b.w1opts) === J([fa.id]) && !r.b.dmode, J(r.b && [r.b.w1opts, r.b.dmode]));
    SYS(); ACT.w1Opts({ dataset: { id: 'DMP-D1' } }); const a0 = ADMIN.audit.length; qma('.w1-o').forEach(x => { x.disabled = false; x.checked = true; }); const rsn = document.querySelector('#rsn'); if (rsn) rsn.value = 'Try';
    ok('D (negative) Change: newly adding the Standard programme fee to a batch is refused and logged', prim() === false && blocked(a0) && J(r.b.w1opts) === J([fa.id])); closeModal();
    const nov = ADMIN.batches.find(b => b.code === 'L3AC-NOV26'); ok('D an existing Level 3 batch keeps the Standard programme fee it accepts', nov.w1opts.includes('L3-FO-STD'));
  });

  await T('E roles', async () => {
    fresh(); configure();
    FA(); ACT.newBatch(); ok('E (negative) Finance can\'t create a batch', !MODAL); closeModal();
    BA(); ACT.newBatch(); ok('E (negative) Business Admin can\'t create a batch', !MODAL); closeModal();
    fresh(); const p = pr(), s0 = J([p.durV || null, CB8().wf[PID] || null, r1Opts(PID), CRFO()[PID] || null, p.version]);
    [['Finance Admin', FA], ['Business Admin', BA]].forEach(([who, enter]) => {
      enter(); const a0 = ADMIN.audit.length; let opened = 0;
      [() => ACT.crDurRec({ dataset: { p: PID } }), () => ACT.cb8Start({ dataset: { p: PID } }), () => ACT.crFoStart({ dataset: { p: PID } })].forEach(f => { closeModal(); f(); if (MODAL) opened++; closeModal(); });
      ok(`E (negative) ${who}: no duration, package or fee-option switch — no dialog, nothing changed, logged`, opened === 0 && J([p.durV || null, CB8().wf[PID] || null, r1Opts(PID), CRFO()[PID] || null, p.version]) === s0 && since(a0).filter(a => /^Blocked/.test(a.action)).length >= 3);
    });
    SYS(); ACT.crDurRec({ dataset: { p: PID } }); FA(); const a2 = ADMIN.audit.length; fill({ '#cr-du-n': '12', '#rsn': 'x' }); prim();
    ok('E (negative) a role change while the duration dialog is open: not saved, logged', !p.durV && blocked(a2, /record the course duration/)); closeModal();
    SYS(); ACT.crDurRec({ dataset: { p: PID } }); fill({ '#cr-du-n': '0', '#rsn': 'x' }); ok('E (negative) an invalid duration is refused', prim() === false && !p.durV); closeModal();
  });
  fresh();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
