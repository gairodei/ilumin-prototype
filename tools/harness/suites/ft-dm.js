// DM — delivery modes from fee options, and Create batch multi-selection (26 Oct 2026; PD-DM-01…08). The user's exact journeys:
// a new Level 3 and Level 2 course built in the real Course Builder (Self-Paced £900, Fully Assisted £1,800), published through Finance,
// a batch with both modes ticked (kept across steps, reviewed, saved), learners on each option, a mode pending Finance, one-mode and
// legacy courses. Every check acts through the screen handlers.
// Shared helpers for probes and screenshot setups (real handlers, as in ft-cb11 / ft-cr)
window.H = (function () {
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'Probe') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  let n0 = 0;
  // Section 1 through the real form. o: { title, level, rows: [{l,f,m}], price, modes (only while the old field exists) }
  const make = (o = {}) => {
    ACA(); go('a-programmes'); ACT.chProgNew(); const n = ++n0, lv = o.level || 'Level 3';
    fill({ '#np-t': o.title || 'Probe course ' + n, '#np-l': lv, '#np-r': 'QN 610/' + (8800 + n) + '/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-obs-no').checked = true;
    if (q('#np-p') && o.price) fill({ '#np-p': String(o.price) });
    if (lv !== 'Level 3' && o.rows) { const r = q('#cr-pm-opts'); if (r) { r.checked = true; INP.crPm(r); } }
    (o.rows || []).forEach((x, k) => { if (k && ACT.r1NpAdd) ACT.r1NpAdd(); const r = qa('.r1-np-row')[k]; if (!r) return; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    if (o.modes) qa('.cr-dm-c').forEach(x => { x.checked = o.modes.includes(x.value); });
    const pr = ACT.cbDetCreate(); const errs = [...document.querySelectorAll('main .err, main [aria-invalid="true"] + .err')].map(e => e.textContent); closeModal(); return pr && pr.id ? pr : { errs };
  };
  const structure = pr => {
    const id = pr.id; go('a-programmes', { id, tab: 'structure' });
    add8('ch8AddUnit', { id }, { '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/9' + n0 });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred care', '#c-e': 'Written account' });
  };
  const author = (pr, title) => {
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    const crit = s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish'); return d;
  };
  // Section 5: add fee options (Level 2 path) and give every active option "pay in full"
  const fees = (pr, list = []) => {
    go('a-programmes', { id: pr.id, tab: 'fees' });
    if (!CB8().wf[pr.id] && !(pr.cb8 && pr.status === 'Draft') && ACT.cb8Start) ACT.cb8Start({ dataset: { p: pr.id } });
    list.forEach(x => { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); fill({ '#c8-l': x.l, '#c8-f': String(x.f) }); const s = qm('#c8-m'); if (s) s.value = x.m; press(); });
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
  };
  const documents = pr => {
    const id = pr.id; go('a-programmes', { id, tab: 'letter' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); if (t) t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('First version');
  };
  const submit = pr => { ACA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press(); return cb8Wf(pr) && cb8Wf(pr).qid; };
  const approve = qid => { FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list'); ACA(); };
  const publish = pr => { ACA(); go('a-programmes', { id: pr.id, tab: 'review' }); const b = q('[data-act="cbPublish"]'); if (!b || b.disabled) return cbRvChecks(pr).block.map(x => x.msg); b.click(); reason('Ready for intake'); return pr.status; };
  // the whole builder journey; approveFin=false leaves the package with Finance
  const fullCourse = (o, approveFin = true) => {
    const pr = make(o); if (!pr.id) return pr; structure(pr); author(pr, (o.title || 'Probe') + ' assignment'); fees(pr, o.extra || []); documents(pr);
    const qid = submit(pr); if (approveFin) approve(qid); return pr;
  };
  const openNb = (title, code) => { ACA(); go('a-batches'); ACT.newBatch(); if (code) fill({ '#nb-c': code }); const co = qm('#nb-co'); co.value = title; INP.n2NbCourse(co); qm('#nb-m').value = 'Online'; return co.value === title; };
  const out = R => { const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre); };
  return { q, qa, qm, qma, fill, prim, press, reason, SA, FA, ACA, make, structure, author, fees, documents, submit, approve, publish, fullCourse, openNb, out };
})();
// Acceptance probe for the DM correction: the exact user journeys (section C of the request)
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const { q, qa, qm, qma, fill, prim, press, reason, ACA, FA } = H; const J = JSON.stringify;
  const mroot = () => document.getElementById('modal-root');
  const freeL = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress', 'Planned'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))); return ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !skip.includes(l.id) && !n4World(l.id)); };
  const addL = (code, lid, opt) => { ACA(); ACT.addToBatch({ dataset: { id: code } }); if (!MODAL) return 'refused'; fill({ '#ab-l': lid }); if (opt !== undefined) { const s = qm('#r2-ab-o'); if (s) s.value = opt; } const r = prim(); const msg = mroot().textContent; if (r !== false) closeModal(); return r === false ? 'refused: ' + msg.slice(0, 160) : 'added'; };
  const back = () => { const a = MODAL.actions.find(x => /Back/i.test(x.label)); return a && a.fn ? a.fn() : 'no back'; };
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  // create through the wizard: tick modes, step 2, back to step 1 (are they still ticked?), on to review, create
  const wiz = (title, code, modes) => {
    H.openNb(title, code); const tick = () => M_MODES.forEach(m => { const x = qm(`.m-m[value="${m}"]`) || qm(`.cr-pend[value="${m}"]`) || qm(`.cr-nb-m[value="${m}"]`); if (x && !x.disabled) { x.checked = modes.includes(m); (x.classList.contains('m-m') ? INP.mModeTick : x.classList.contains('cr-pend') ? INP.crPendTick : INP.crNbTick)(x); } });
    tick(); const s1 = M_MODES.filter(m => [...qma(`[value="${m}"]`)].some(x => x.type === 'checkbox' && x.checked));
    if (prim() === false) return { err: mroot().textContent.slice(0, 300) };
    back(); const kept = M_MODES.filter(m => [...qma(`[value="${m}"]`)].some(x => x.type === 'checkbox' && x.checked && !x.classList.contains('w1-nb-o')));
    if (prim() === false) return { err: 'again: ' + mroot().textContent.slice(0, 300) };
    fill({ '#nb-ac': 'Dr Helen Carter' }); if (prim() === false) return { err: 's2 ' + mroot().textContent.slice(0, 300) }; prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    const b = ADMIN.batches.find(x => x.code === code); if (b) { b.start = D(40, '09:00'); b.end = D(240, '17:00'); } return { b, rev, s1, kept };
  };
  const SP = { l: 'Self-Paced', f: 900, m: 'Self-Paced' }, FAo = { l: 'Fully Assisted', f: 1800, m: 'Fully Assisted' };

  await T('C1 Level 3', async () => {
    ACA(); go('a-programmes'); ACT.chProgNew();
    ok('C1 Course Details: no "Delivery modes offered" checkboxes; fee options with a mode each', !q('.cr-dm-c') && !!q('.r1-np-m'));
    closeModal();
    const pr = H.fullCourse({ title: 'DM Level 3 Diploma', level: 'Level 3', rows: [SP, FAo] }); ok('C1 created', !!pr.id, J(pr.errs));
    ok('C1 the course offers both modes, derived from its two fee options', J(crModes(pr).modes) === J(['Self-Paced', 'Fully Assisted']) && crModes(pr).src === 'fee options');
    ok('C1 Course Details fee options and Section 5 are the same records (same IDs)', J(cb8Work(pr).opts.map(o => o.id)) === J(r1Opts(pr.id).map(o => o.id)));
    ok('C1 published', H.publish(pr) === 'Active');
    H.openNb(pr.title, 'DM-L3-A'); ok('C1-1 Create batch: both modes as separate checkboxes; no single-select mode dropdown shown', qma('.m-m').length === 2 && (!qm('#nb-dm') || qm('#nb-dm').closest('.field').style.display === 'none') && /Delivery modes accepted/.test(qm('#w1-nb-acc legend').textContent)); closeModal();
    const r = wiz(pr.title, 'DM-L3-A', M_MODES);
    ok('C1-2 both ticked simultaneously', J(r.s1) === J(M_MODES), J(r));
    ok('C1-3 both still ticked after step 2 and Back', J(r.kept) === J(M_MODES), J(r.kept));
    ok('C1-4 Review & Create lists both', /Delivery modes accepted\s*Self-Paced and Fully Assisted/.test(r.rev || ''), (r.rev || '').slice(0, 400));
    ok('C1-5 saved batch keeps both modes and both fee options', r.b && J(crBModes(r.b)) === J(M_MODES) && r.b.w1opts.length === 2);
    go('a-batches', { id: 'DM-L3-A' }); ok('C1-5 batch detail shows both', /Delivery modes accepted:\s*Self-Paced and Fully Assisted/.test(q('.m-modes').textContent));
    const sp = r1Opts(pr.id).find(o => o.mode === 'Self-Paced').id, fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id, l1 = freeL(), l2 = freeL([l1.id]);
    ok('C1-6 each learner gets the mode of their own option', addL('DM-L3-A', l1.id, sp) === 'added' && addL('DM-L3-A', l2.id, fa) === 'added' && r2LidInfo(l1.id, 'DM-L3-A').mode === 'Self-Paced' && r2LidInfo(l2.id, 'DM-L3-A').mode === 'Fully Assisted');
    ACT.w1Opts({ dataset: { id: 'DM-L3-A' } }); ok('C1 Change dialog: both modes ticked, as checkboxes', qma('.m-m:checked').length === 2); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'DM-L3-A' } }); ok('C1 Edit batch details: both modes ticked', qma('.m-m:checked').length === 2); closeModal();
  });

  await T('C7 pending Finance', async () => {
    const pr = H.fullCourse({ title: 'DM Level 3 pending', level: 'Level 3', rows: [SP] }); H.publish(pr);
    ACA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); fill({ '#c8-l': 'Fully Assisted', '#c8-f': '1800' }); qm('#c8-m').value = 'Fully Assisted'; press();
    const nfo = cb8Work(pr).opts.find(o => o.mode === 'Fully Assisted'); if (nfo) ACT.cb8PayAdd({ dataset: { p: pr.id, o: nfo.id, k: '1' } });
    const qid = H.submit(pr);
    ok('C7 Fully Assisted added in Section 5 and waiting for Finance', !!qid && cb8Wf(pr).status === 'Pending' && !crOptModes(pr.id).includes('Fully Assisted'));
    ok('C7 the course offers both modes (pending approval shown separately, not hidden)', J(crModes(pr).modes) === J(M_MODES) && crModeSt(pr, 'Fully Assisted') === 'pending');
    H.openNb(pr.title, 'DM-P'); ok('C7 Create batch: Self-Paced and Fully Assisted checkboxes; FA marked "Finance approval required" and selectable', !!qm('.m-m[value="Self-Paced"]') && !!qm('.cr-pend[value="Fully Assisted"]') && !qm('.cr-pend').disabled);
    ok('C7 the intro doesn\'t call the pending mode unavailable', !/isn't available/.test(qm('#w1-nb-acc').textContent) && /waiting for Finance/.test(qm('.m-intro').textContent)); closeModal();
    const r = wiz(pr.title, 'DM-P', M_MODES);
    ok('C7 both configured; review lists both; FA not ready', r.b && J(crBModes(r.b)) === J(M_MODES) && /Delivery modes accepted\s*Self-Paced and Fully Assisted/.test(r.rev) && crReady(r.b, 'Fully Assisted') === 'finance' && crReady(r.b, 'Self-Paced') === 'ready', J({ e: r.err, rev: (r.rev || '').slice(0, 300) }));
    const l1 = freeL(), l2 = freeL([l1.id]);
    ok('C7 SP enrolment works; FA has no approved option yet (no one can enrol in it)', addL('DM-P', l1.id, r1Opts(pr.id).find(o => o.mode === 'Self-Paced').id) === 'added' && !r1Opts(pr.id).some(o => o.mode === 'Fully Assisted'));
    H.approve(qid); const fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted');
    ok('C7 approved: FA "Approved by Finance — not enabled"; not added silently', !!fa && crReady(r.b, 'Fully Assisted') === 'accept' && !w1Accepts(r.b, fa.id));
    ok('C7 FA enrolment refused until enabled', addL('DM-P', l2.id, fa.id) !== 'added');
    ACA(); ACT.w1Opts({ dataset: { id: 'DM-P' } }); qma('.w1-o').forEach(x => { x.checked = true; }); document.querySelector('#rsn').value = 'Enable FA'; press();
    ok('C7 enabled: FA learner enrols with their own mode', crReady(r.b, 'Fully Assisted') === 'ready' && addL('DM-P', l2.id, fa.id) === 'added' && r2LidInfo(l2.id, 'DM-P').mode === 'Fully Assisted');
  });

  await T('C Level 2', async () => {
    ACA(); go('a-programmes'); ACT.chProgNew(); fill({ '#np-l': 'Level 2' }); INP.r1NpLevel(q('#np-l'));
    ok('L2 Course Details: pricing choice, one programme price by default', !!q('#cr-pm-price') && q('#cr-pm-price').checked && !q('.r1-np-price').hidden && q('.r1-np-l3').hidden);
    q('#cr-pm-opts').checked = true; INP.crPm(); ok('L2 choosing fee options by delivery mode shows the rows and hides the price', q('.r1-np-price').hidden && !q('.r1-np-l3').hidden);
    const pr = H.fullCourse({ title: 'DM Level 2 Certificate', level: 'Level 2', rows: [SP, FAo] }); ok('L2 created with two mode-specific options', !!pr.id && r1Opts(pr.id).length === 2, J(pr.errs));
    ok('L2 offers both modes', J(crModes(pr).modes) === J(M_MODES));
    ok('L2 published', H.publish(pr) === 'Active', J(cbRvChecks(pr).block.map(x => x.msg)));
    const r = wiz(pr.title, 'DM-L2-A', M_MODES);
    ok('L2 both ticked, kept after Back, reviewed and saved', r.b && J(r.s1) === J(M_MODES) && J(r.kept) === J(M_MODES) && /Delivery modes accepted\s*Self-Paced and Fully Assisted/.test(r.rev) && J(crBModes(r.b)) === J(M_MODES), J({ e: r.err, s1: r.s1, k: r.kept }));
    const l1 = freeL(), l2 = freeL([l1.id]), sp = r1Opts(pr.id).find(o => o.mode === 'Self-Paced').id, fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id;
    ok('L2 learners get their own modes', addL('DM-L2-A', l1.id, sp) === 'added' && addL('DM-L2-A', l2.id, fa) === 'added' && r2LidInfo(l1.id, 'DM-L2-A').mode === 'Self-Paced' && r2LidInfo(l2.id, 'DM-L2-A').mode === 'Fully Assisted');
  });

  await T('C one mode / several options per mode', async () => {
    const pr = H.fullCourse({ title: 'DM Level 4 FA only', level: 'Level 4', rows: [FAo, { l: 'Fully Assisted — employer', f: 1500, m: 'Fully Assisted' }] }); H.publish(pr);
    ok('one mode: two options in the same mode allowed; course offers Fully Assisted only', r1Opts(pr.id).length === 2 && J(crModes(pr).modes) === J(['Fully Assisted']));
    H.openNb(pr.title, 'DM-L4'); ok('one mode: only a Fully Assisted checkbox, with both options under it', qma('.m-m').map(x => x.value).join() === 'Fully Assisted' && qma('.w1-nb-o').length === 2); closeModal();
  });

  await T('C legacy', async () => {
    const pr = H.fullCourse({ title: 'DM Level 2 one price', level: 'Level 2', price: 900 }); H.publish(pr);
    ok('one-price course: no options invented, offers nothing by fee option', !r1Opts(pr.id).length && crModes(pr).src === 'none');
    H.openNb(pr.title, 'DM-1P'); ok('one-price course: one delivery mode per batch (select), explained', !!qm('#nb-dm') && qm('#nb-dm').closest('.field').style.display !== 'none' && /one programme price/.test(qm('.cr-nb-note').textContent)); closeModal();
    H.openNb('Level 2 Diploma in Care (England)', 'DM-X'); ok('seeded Level 2 (legacy): single select as before', !!qm('#nb-dm') && !qm('.cr-nb-m')); closeModal();
    H.openNb('Level 3 Diploma in Adult Care (England)', 'DM-X'); ok('seeded Level 3 (legacy, Standard fee only): explained, standard-fee mode select kept', /no fee options with a delivery mode yet \(legacy\)/.test(qm('.cr-src').textContent) && !!qm('.w1-nb-o[value="L3-FO-STD"]')); closeModal();
    ACA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ok('Section 5 (one price): "Use fee options by delivery mode" offered instead of "Level 3 feature"', !!q('[data-act="crFoStart"]') && !/Level 3 feature/.test(q('.cb8-sec').textContent));
    const a0 = ADMIN.audit.length; ACT.crFoStart({ dataset: { p: pr.id } }); reason('Both modes from 2027');
    ok('crFoStart: audited; the programme fee kept, no mode invented; Finance approval needed', crMultiFee(pr) && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(a => /Fee options by delivery mode/.test(a.action)) && cb8Work(pr).opts.some(o => o.label === 'Programme fee' && !o.mode) && cb8Issues(pr, cb8Work(pr)).some(x => /choose the delivery mode/.test(x.msg)));
    ok('nothing changes for batches until configured: still one mode per batch', crModes(pr).modes.length === 0);
  });
  // Precedence (PD-DM-01 / PD-DM-05): a historical CR value applies only to a course with no mode-specific fee option; it never
  // overrides, widens or narrows what the fee options give, and it is never rewritten
  await T('precedence', async () => {
    const leg = (pid, ms) => { STORE.crDm = STORE.crDm || {}; STORE.crDm[pid] = { modes: ms, at: now().toISOString(), by: 'Rachel Hughes', hist: [[now().toISOString(), 'Rachel Hughes', 'Not configured', ms.join(' and '), 'CR']] }; };
    const pr = H.fullCourse({ title: 'DM precedence FA', level: 'Level 3', rows: [FAo, { l: 'Fully Assisted — employer', f: 1500, m: 'Fully Assisted' }] }); H.publish(pr);
    leg(pr.id, ['Self-Paced', 'Fully Assisted']); const keep = J(STORE.crDm[pr.id]);
    ok('precedence: a historical value naming both modes doesn\'t widen a course whose fee options are Fully Assisted only', J(crModes(pr).modes) === J(['Fully Assisted']) && crModes(pr).src === 'fee options');
    H.openNb(pr.title, 'DM-PR1'); ok('precedence: Create batch offers only Fully Assisted (no Self-Paced box from the historical value)', qma('.m-m').map(x => x.value).join() === 'Fully Assisted' && !qm('.cr-pend') && !qm('.cr-nb-m')); closeModal();
    leg(pr.id, ['Self-Paced']);
    ok('precedence: a historical value naming another mode doesn\'t replace the fee options\' mode', J(crModes(pr).modes) === J(['Fully Assisted']));
    ok('precedence: two options in one mode give that mode once', crModes(pr).modes.length === 1 && r1Opts(pr.id).filter(o => o.mode === 'Fully Assisted').length === 2);
    const p1 = H.fullCourse({ title: 'DM precedence one price', level: 'Level 2', price: 900 }); H.publish(p1);
    leg(p1.id, ['Self-Paced', 'Fully Assisted']);
    ok('precedence: with no mode-specific option, the historical value is used (legacy)', J(crModes(p1).modes) === J(['Self-Paced', 'Fully Assisted']) && crModes(p1).src === 'legacy' && !r1Opts(p1.id).length);
    ok('precedence: the historical records are never rewritten by reading them', J(STORE.crDm[pr.id].hist.length) === '1' && keep.includes('Self-Paced and Fully Assisted'));
  });
  H.out(R);
})();
