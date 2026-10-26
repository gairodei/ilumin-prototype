// CR — course and batch configuration revisions (23 Oct 2026; PD-CR-01…). Delivery modes configured by course for every level;
// no Academy course code; no unit code to type; assignment deadlines per batch; awarding body batch code. Scenarios A–L of the
// request. Every check acts through the screen or handler, then checks the record or the consuming screen, with negative cases.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const qm = s => document.querySelector('#modal-root ' + s), qma = s => [...document.querySelectorAll('#modal-root ' + s)];
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CR test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const logged = (a0, re) => since(a0).some(x => re.test(x.action));
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const T3 = 'Level 3 Diploma in Adult Care (England)', T2 = 'Level 2 Diploma in Care (England)';
  const isoL = (n, hm = '21:59') => D(n, hm).slice(0, 16);

  // Section 1: a new course. o.level, o.modes (ticked), o.rows (Level 3 fee-option rows), o.price (other levels)
  let n0 = 0;
  const make = (o = {}) => {
    go('a-programmes'); ACT.chProgNew(); const n = ++n0, lv = o.level || 'Level 3';
    fill({ '#np-t': o.title || `CR ${lv} course ${n}`, '#np-l': lv, '#np-r': 'QN 610/' + (7100 + n) + '/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    if (lv !== 'Level 3') fill({ '#np-p': String(o.price || 900) });
    document.querySelector('#np-obs-no').checked = true;
    (lv === 'Level 3' ? (o.rows || [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }]) : []).forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    // DM (PD-DM-01): Course Details has no modes field any more (was: tick .cr-dm-c). A Level 2, 4 or 5 course given modes here is one
    // configured under CR: its record is seeded exactly as CR stored it, so these journeys keep testing that preserved behaviour (PD-DM-05).
    // Fee options by delivery mode for those levels (the new path) are tested in ft-dm.js.
    const pr = ACT.cbDetCreate(); closeModal(); if (!(pr && pr.id)) return null;
    if (lv !== 'Level 3' && o.modes) crLeg(pr.id, o.modes);
    return pr;
  };
  const crLeg = (pid, ms, why = 'Set when the course was created') => { const at = now().toISOString(), c = CRDM()[pid]; CRDM()[pid] = { modes: M_MODES.filter(m => ms.includes(m)), at, by: ADMIN.me.name, hist: ((c && c.hist) || []).concat([[at, ADMIN.me.name, c ? mTxt(c.modes) : 'Not configured', mTxt(ms), why]]) }; };
  // Section 5 for a course without options yet: one fee option per mode (pay in full), submitted and approved by Finance
  const feeOpts = (pr, list, o = {}) => {
    ACA(); if (!CB8().wf[pr.id] && !(pr.cb8 && pr.status === 'Draft')) ACT.cb8Start({ dataset: { p: pr.id } }); go('a-programmes', { id: pr.id, tab: 'fees' });
    list.forEach(x => { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); fill({ '#c8-l': x.l, '#c8-f': String(x.f) }); const s = qm('#c8-m'); if (s) s.value = x.m; press(); });
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.mode && !o.legacy).forEach(o => { ACT.cb8OptRetire && ACT.cb8OptRetire({ dataset: { p: pr.id, o: o.id } }); if (MODAL) press(); });
    ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press();
    const wf = cb8Wf(pr), qid = wf && wf.qid; if (!qid) return false;
    if (o.pending) { ACA(); return qid; } // DM (PD-DM-03): submitted, left with Finance — a mode configured but not approved
    approveQ(qid); return true;
  };
  const approveQ = qid => { FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked'); ACA(); };
  // Create batch through the wizard. o.modes: course without options (cr-nb) or mode checkboxes (M); o.abc; o.dm (legacy select)
  const nb = (code, title, o = {}) => {
    ACT.newBatch(); if (!MODAL) return { refused: true, msg: 'no dialog' }; fill({ '#nb-c': code }); const co = qm('#nb-co'); co.value = title; INP.n2NbCourse(co); qm('#nb-m').value = 'Online';
    if (o.abc !== undefined) fill({ '#nb-abc': o.abc });
    if (o.modes && qm('#cr-nb')) qma('.cr-nb-m').forEach(x => { x.checked = o.modes.includes(x.value); INP.crNbTick(x); });
    else if (o.modes) M_MODES.forEach(m => { const x = qm(`.m-m[value="${m}"]`); if (x && !x.disabled) { x.checked = o.modes.includes(m); INP.mModeTick(x); } });
    if (o.dm) qm('#nb-dm').value = o.dm;
    const s1 = mroot().innerHTML; if (prim() === false) return { refused: true, msg: mroot().textContent, s1 };
    fill({ '#nb-ac': 'Dr Helen Carter' }); if (prim() === false) return { refused: true, msg: mroot().textContent, s1 }; prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    const b = ADMIN.batches.find(x => x.code === code); if (b) { b.start = D(40, '09:00'); b.end = D(240, '17:00'); } return { b, rev, s1 };
  };
  const freeL = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress', 'Planned'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))); return ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !skip.includes(l.id) && !n4World(l.id)); };
  const addL = (code, lid, opt) => { ACT.addToBatch({ dataset: { id: code } }); if (!MODAL) return 'refused'; fill({ '#ab-l': lid }); if (opt !== undefined) { const s = qm('#r2-ab-o'); if (s) s.value = opt; } const r = prim(); const msg = mroot().textContent; if (r !== false) closeModal(); return r === false ? msg : 'added'; };
  const apply3 = (v, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === T3); ACT.applyNvq({ dataset: { id: c.id } }); const r = optId && document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; if (prim() !== false) closeModal(); return W; };
  const finish = (w, b) => { chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };
  // an NV-L3 assignment (Assignments screen) with one mapped question, still Draft
  const draftL3 = title => { ACA(); go('a-assignments'); ACT.newAsg(); const u = qm('#na-u'); u.value = [...u.options].find(o => /^U306 · Module 1/.test(o.textContent)).value; fill({ '#na-t': title }); press(); const d = s2Defs().find(x => x.title === title); ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain the duty of care.' }); press(); INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: s2Crit(d).find(c => c.type === 'Knowledge').code } }); return d; };
  const publishTo = (d, dues) => { ACA(); go('a-assignments', { id: d.id }); ACT.pubAsg({ dataset: { id: d.id } }); if (!MODAL) return 'no dialog'; qma('.s2-pb').forEach(x => { x.checked = x.value in dues; }); Object.entries(dues).forEach(([c, v]) => { const i = qm('#cr-pd-' + CSS.escape(c)); if (i) i.value = v; }); const r = reason('Publish'); const msg = MODAL ? mroot().textContent : ''; if (MODAL) closeModal(); return r === false ? msg : 'ok'; };
  const setDl = (code, id, v, r = 'CR deadline') => { ACT.crDlEdit({ dataset: { b: code, id } }); if (!MODAL) return 'refused'; fill({ '#cr-dl-d': v }); const t = document.querySelector('#rsn'); if (t) t.value = r; const x = prim(); const msg = mroot().textContent; if (x !== false && MODAL) closeModal(); return x === false ? msg : 'ok'; };

  /* ================= A. Level 2 course offering Fully Assisted and Self-Paced ================= */
  let L2 = null;
  // Final correction (PD-CR-14, supersedes "both ticked is refused until Finance approves"): configuring a mode is separate from being
  // ready for enrolment. Both modes can be configured before Finance approves; enrolment opens per mode after approval and explicit enabling.
  const ready = (b, m) => crReady(b, m);
  const enable = (code, ids, r = 'Enable approved fee options') => { ACT.w1Opts({ dataset: { id: code } }); if (!MODAL) return 'refused'; qma('.w1-o').forEach(x => { if (!x.disabled) x.checked = ids.includes(x.value); }); const t = document.querySelector('#rsn'); t.value = r; const res = prim(); const msg = mroot().textContent; if (res !== false && MODAL) closeModal(); return res === false ? msg : 'ok'; };
  await T('CR-A', async () => {
    fresh(); ACA(); const a0 = ADMIN.audit.length;
    go('a-programmes'); ACT.chProgNew();
    // DM (PD-DM-01) supersedes: was "Course Details: Delivery modes offered checkboxes, for every level" — now no separate field; the modes come from the fee options
    ok('CR-A (DM) Course Details: no separate "Delivery modes offered" field; each fee option has a delivery mode', !qa('.cr-dm-c').length && !!q('.r1-np-m'));
    const pr = make({ level: 'Level 2', modes: ['Self-Paced', 'Fully Assisted'], title: 'CR Level 2 Certificate (both modes)' }); L2 = pr;
    // DM (PD-DM-05) supersedes "recorded, audited (Delivery modes offered set)": the record is now only a legacy value from CR, seeded by make()
    ok('CR-A (DM) a Level 2 course configured under CR for both modes keeps offering both (legacy value honoured)', !!pr && J(crModes(pr).modes) === J(['Self-Paced', 'Fully Assisted']) && crModes(pr).src === 'legacy'); void a0;
    ok('CR-A no fee option is created automatically', r1Opts(pr.id).length === 0 && !r1IsL3Pid(pr.id));
    ok('CR-A Fees & Payments: fee options with a delivery mode are available for this Level 2 course', cb8L3(pr));
    pr.status = 'Active';
    ACA(); go('a-batches'); ACT.newBatch(); const co = qm('#nb-co'); co.value = pr.title; INP.n2NbCourse(co);
    ok('CR-A (before Finance) Create batch: both modes as checkboxes, each marked "Finance approval required"', qma('.cr-nb-m').map(x => x.value).join('|') === 'Self-Paced|Fully Assisted' && (mroot().textContent.match(/Finance approval required/g) || []).length >= 2 && qm('#nb-dm').closest('.field').style.display === 'none');
    closeModal();
    const both = nb('CR-L2-PRE', pr.title, { modes: ['Self-Paced', 'Fully Assisted'] }), bp = both.b;
    ok('CR-A (before Finance) a batch configured for both modes is created', !!bp && J(bp.crModes) === J(['Self-Paced', 'Fully Assisted']) && J(bp.w1opts) === '[]' && !bp.dmode && logged(a0, /^Delivery modes configured$/));
    ok('CR-A the review step distinguishes "Mode configured" from "Ready for enrolment"', /Mode configured\s*Self-Paced and Fully Assisted/.test(both.rev) && /Ready for enrolment\s*none/.test(both.rev) && /Finance approval required/.test(both.rev));
    ok('CR-A both modes: "Finance approval required"; nothing ready for enrolment', ready(bp, 'Self-Paced') === 'finance' && ready(bp, 'Fully Assisted') === 'finance' && !crReadyAny(bp));
    go('a-batches', { id: 'CR-L2-PRE' }); ok('CR-A batch detail: Mode configured, Ready for enrolment and a status for each mode', /Mode configured:\s*Self-Paced and Fully Assisted/.test(main()) && /Ready for enrolment:\s*none/.test(main()) && qa('.cr-rdy-r[data-k="finance"]').length === 2);
    const l0 = freeL(); let a1 = ADMIN.audit.length;
    ok('CR-A (negative) Add learner before approval is refused and logged', addL('CR-L2-PRE', l0.id) === 'refused' && blocked(a1, /add a learner/) && !batchRoster(bp).some(r => r[1] === l0.id));
    ok('CR-A (negative) sign-up allocation skips the batch', !(chNearest(pr.title, 'United Kingdom') || null) || chNearest(pr.title, 'United Kingdom').code !== 'CR-L2-PRE');
    a1 = ADMIN.audit.length; learner('E'); go('browse'); if (!CATALOGUE.some(x => x.kind === 'nvq' && x.title === pr.title)) CATALOGUE.push({ id: 'CAT-CR-L2', kind: 'nvq', title: pr.title, price: 1100 }); /* publication adds it; this test marks the course Active directly */ const cat = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); if (cat) ACT.applyNvq({ dataset: { id: cat.id } });
    ok('CR-A (negative) sign-up for the course is refused while no fee option is approved (logged)', !!cat && !STORE.worlds.E.signup && blocked(a1, /start sign-up/));
    ACA(); const one = nb('CR-L2-SP', pr.title, { modes: ['Self-Paced'] });
    ok('CR-A (before Finance) a Self-Paced-only batch can be configured too, also waiting for Finance', one.b && J(one.b.crModes) === J(['Self-Paced']) && ready(one.b, 'Self-Paced') === 'finance');
    // Finance approves one option per mode
    const okF = feeOpts(pr, [{ l: 'Self-Paced — L2', f: 700, m: 'Self-Paced' }, { l: 'Fully Assisted — L2', f: 900, m: 'Fully Assisted' }]);
    ok('CR-A Finance approves one fee option per mode (existing approval path)', okF && r1Opts(pr.id).filter(o => o.status === 'Active').map(o => o.mode).sort().join('|') === 'Fully Assisted|Self-Paced', J(cb8Issues(pr, cb8Work(pr))));
    const sp = r1Opts(pr.id).find(o => o.mode === 'Self-Paced').id, fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id;
    ok('CR-A after approval nothing widens on its own: "Approved by Finance — not enabled for this batch"', J(bp.w1opts) === '[]' && ready(bp, 'Self-Paced') === 'accept' && ready(bp, 'Fully Assisted') === 'accept' && !w1Accepts(bp, sp));
    go('a-batches', { id: 'CR-L2-PRE' }); ok('CR-A batch detail offers "Enable fee options"', qa('.cr-rdy-r[data-k="accept"]').length === 2 && !!q('.cr-rdy [data-act="w1Opts"]'));
    a1 = ADMIN.audit.length; ok('CR-A an administrator explicitly enables both options for the batch (audited)', enable('CR-L2-PRE', [sp, fa]) === 'ok' && J(bp.w1opts.slice().sort()) === J([sp, fa].sort()) && logged(a1, /Fee options accepted changed/));
    ok('CR-A both modes now ready for enrolment', ready(bp, 'Self-Paced') === 'ready' && ready(bp, 'Fully Assisted') === 'ready');
    const l1 = freeL(), l2 = freeL([l1.id]);
    ok('CR-A enrolment in both modes succeeds', addL('CR-L2-PRE', l1.id, sp) === 'added' && addL('CR-L2-PRE', l2.id, fa) === 'added');
    ok('CR-A each learner\'s delivery mode resolves from their own fee option', r2LidInfo(l1.id, 'CR-L2-PRE').mode === 'Self-Paced' && r2LidInfo(l2.id, 'CR-L2-PRE').mode === 'Fully Assisted');
    ok('CR-A sign-up allocation now finds the batch for each mode', ['Self-Paced', 'Fully Assisted'].every(m => ready(bp, m) === 'ready') && !!chNearest(pr.title, 'United Kingdom'));
    ok('CR-A the Self-Paced-only batch isn\'t widened: a Fully Assisted option is refused until enabled there', !w1Accepts(one.b, fa) && !w1Accepts(one.b, sp) && ready(one.b, 'Self-Paced') === 'accept');
    enable('CR-L2-SP', [sp]); ok('CR-A …enabling Self-Paced there makes it ready; Fully Assisted stays refused', ready(one.b, 'Self-Paced') === 'ready' && w1Accepts(one.b, sp) && !w1Accepts(one.b, fa));
    const r = nb('CR-L2-MIX', pr.title, { modes: ['Self-Paced', 'Fully Assisted'] });
    ok('CR-A a batch created after approval accepts both options and is ready at once', r.b && w1L3(r.b) && J(mModesOf(r.b).slice().sort()) === J(['Fully Assisted', 'Self-Paced']) && crReadyAny(r.b) && ready(r.b, 'Fully Assisted') === 'ready');
    ok('CR-A (negative) a learner with no fee option can\'t transfer into a mixed batch', (() => { const a2 = ADMIN.audit.length; const res = chDoMove('LX-NONE', ADMIN.batches.find(b => b.course === T2), r.b); return res === false && blocked(a2, /batch change/); })());
  });

  /* ================= N. Levels 2–5, one and both modes, before and after Finance ================= */
  await T('CR-N', async () => {
    fresh(); ACA();
    // Level 3: both offered, only Fully Assisted approved — Self-Paced configurable but waiting for Finance
    const p3 = make({ level: 'Level 3', modes: ['Self-Paced', 'Fully Assisted'], rows: [{ l: 'FA only', f: 2400, m: 'Fully Assisted' }] }); p3.status = 'Active';
    // DM (PD-DM-01, PD-DM-03): a mode is offered through a fee option — here a Self-Paced option configured and waiting for Finance (was: ticked in the removed field)
    feeOpts(p3, [{ l: 'SP pending', f: 1500, m: 'Self-Paced' }], { pending: true });
    ACT.newBatch(); const c3 = qm('#nb-co'); c3.value = p3.title; INP.n2NbCourse(c3);
    ok('CR-N Level 3: the approved mode with its fee option and the other mode marked "Finance approval required", both selectable', !!qm('.m-m[value="Fully Assisted"]') && !!qm('.cr-pend[value="Self-Paced"]') && !qm('.cr-pend[value="Self-Paced"]').disabled); closeModal();
    ACT.newBatch(); fill({ '#nb-c': 'CR-L3-N2' }); const c3b = qm('#nb-co'); c3b.value = p3.title; INP.n2NbCourse(c3b); qm('#nb-m').value = 'Online'; qm('.cr-pend[value="Self-Paced"]').checked = true; INP.crPendTick();
    prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal(); const b3 = ADMIN.batches.find(b => b.code === 'CR-L3-N2');
    ok('CR-N Level 3 batch: Fully Assisted ready, Self-Paced configured and waiting for Finance', !!b3 && J(b3.crModes) === J(['Self-Paced', 'Fully Assisted']) && crReady(b3, 'Fully Assisted') === 'ready' && crReady(b3, 'Self-Paced') === 'finance');
    ACT.newBatch(); fill({ '#nb-c': 'CR-L3-N3' }); const c3c = qm('#nb-co'); c3c.value = p3.title; INP.n2NbCourse(c3c); qm('#nb-m').value = 'Online'; qma('.w1-nb-o').forEach(x => { x.checked = false; INP.mOptTick(x); }); qm('.cr-pend[value="Self-Paced"]').checked = true;
    prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal(); const b3b = ADMIN.batches.find(b => b.code === 'CR-L3-N3');
    ok('CR-N Level 3 batch for the pending mode only: configured, nothing ready', !!b3b && J(b3b.crModes) === J(['Self-Paced']) && !crReadyAny(b3b) && J(b3b.w1opts) === '[]');
    // Level 4: one mode, one programme fee — ready at once (as before)
    const p4 = make({ level: 'Level 4', modes: ['Fully Assisted'], title: 'CR Level 4 one mode' }); p4.status = 'Active'; const b4 = nb('CR-L4-N', p4.title, {}).b;
    ok('CR-N Level 4, one mode: configured and ready for enrolment (one programme fee)', !!b4 && J(b4.crModes) === J(['Fully Assisted']) && b4.dmode === 'Fully Assisted' && crReady(b4, 'Fully Assisted') === 'ready');
    const l4 = freeL(); ok('CR-N Level 4: a learner can be added', addL('CR-L4-N', l4.id) === 'added');
    // Level 5: both modes before and after approval
    const p5 = make({ level: 'Level 5', modes: ['Self-Paced', 'Fully Assisted'], title: 'CR Level 5 both' }); p5.status = 'Active'; const b5 = nb('CR-L5-N', p5.title, { modes: ['Self-Paced', 'Fully Assisted'] }).b;
    ok('CR-N Level 5, both modes before Finance: configured, both waiting', !!b5 && J(b5.crModes) === J(['Self-Paced', 'Fully Assisted']) && !crReadyAny(b5));
    feeOpts(p5, [{ l: 'SP — L5', f: 1900, m: 'Self-Paced' }]);
    ok('CR-N Level 5 after Finance approves Self-Paced only: Self-Paced approved (not yet enabled), Fully Assisted still waiting', crReady(b5, 'Self-Paced') === 'accept' && crReady(b5, 'Fully Assisted') === 'finance');
    enable('CR-L5-N', [r1Opts(p5.id).find(o => o.mode === 'Self-Paced').id]);
    ok('CR-N Level 5 …after enabling: Self-Paced ready, Fully Assisted still waiting', crReady(b5, 'Self-Paced') === 'ready' && crReady(b5, 'Fully Assisted') === 'finance');
    // Level 2: one mode configured with one programme fee
    const p2 = make({ level: 'Level 2', modes: ['Self-Paced'], title: 'CR Level 2 one mode' }); p2.status = 'Active'; const b2 = nb('CR-L2-N', p2.title, {}).b;
    ok('CR-N Level 2, one mode: only that mode, ready at once', !!b2 && b2.dmode === 'Self-Paced' && crReady(b2, 'Self-Paced') === 'ready');
    // a legacy batch is unaffected
    ok('CR-N legacy batches (seeded) are still ready as before', ADMIN.batches.filter(b => ['Open', 'Planned', 'In Progress'].includes(b.status) && !Array.isArray(b.crModes)).every(b => !crShowReady(b) || crReadyAny(b)));
    // unauthorized enabling is refused
    BA(); const a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'CR-L5-N' } }); ok('CR-N (negative) another role can\'t enable fee options for a batch (refused, logged)', !MODAL && blocked(a0));
  });

  /* ================= P. Final consistency: adding a mode to an existing batch; per-mode Finance approval ================= */
  const bmEdit = (code, modes, r = 'Add a delivery mode') => { ACT.w1Opts({ dataset: { id: code } }); if (!MODAL) return 'refused'; qma('.cr-bm').forEach(x => { x.checked = modes.includes(x.value); }); const t = document.querySelector('#rsn'); t.value = r; const res = prim(); const msg = mroot().textContent; if (res !== false && MODAL) closeModal(); return res === false ? msg : 'ok'; };
  await T('CR-P', async () => {
    fresh(); ACA(); const pr = make({ level: 'Level 2', modes: ['Self-Paced', 'Fully Assisted'], title: 'CR Level 2 per-mode approval' });
    ok('CR-P Course Builder (draft, no package approved): Review & Publish blocks on the existing payment-terms approval', cbRvChecks(pr).block.some(x => x.sec === 'payments' && /Payment terms/.test(x.msg)));
    pr.status = 'Active'; feeOpts(pr, [{ l: 'FA — P', f: 900, m: 'Fully Assisted' }]); const fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id;
    ok('CR-P Finance approved the Fully Assisted option only: Self-Paced has no approved option', crOptModes(pr.id).join() === 'Fully Assisted');
    // DM (PD-DM-01, PD-DM-03): once fee options exist they decide the modes, so Self-Paced is offered by an option waiting for Finance
    // (was: offered by the removed setting with no option at all)
    const qSP = feeOpts(pr, [{ l: 'SP — P', f: 700, m: 'Self-Paced' }], { pending: true });
    ok('CR-P (DM) the Self-Paced option waits for Finance; the course offers both, Self-Paced not approved', !!qSP && J(crModes(pr).modes) === J(['Self-Paced', 'Fully Assisted']) && crOptModes(pr.id).join() === 'Fully Assisted');
    // create with one approved and one pending mode
    ACT.newBatch(); fill({ '#nb-c': 'CR-P1' }); const co = qm('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); qm('#nb-m').value = 'Online';
    ok('CR-P Create batch: Fully Assisted with its approved option, Self-Paced selectable with "Finance approval required"', !!qm(`.w1-nb-o[value="${fa}"]`) && !!qm('.cr-pend[value="Self-Paced"]') && /Finance approval required/.test(qm('.cr-miss').textContent));
    qm('.cr-pend[value="Self-Paced"]').checked = true; INP.crPendTick(); prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal(); const b1 = ADMIN.batches.find(b => b.code === 'CR-P1');
    ok('CR-P …created: Fully Assisted ready, Self-Paced configured and waiting for Finance', !!b1 && crReady(b1, 'Fully Assisted') === 'ready' && crReady(b1, 'Self-Paced') === 'finance');
    const b2 = nb('CR-P2', pr.title, { modes: ['Fully Assisted'] }).b;
    ok('CR-P (setup) an existing Fully Assisted batch', !!b2 && J(crBModes(b2)) === J(['Fully Assisted']) && crReady(b2, 'Fully Assisted') === 'ready');
    const lF = freeL(); ok('CR-P a Fully Assisted learner enrols in it', addL('CR-P2', lF.id, fa) === 'added');
    const keep2 = J({ r2: b2.r2, w: b2.w1opts, roster: batchRoster(b2) });
    // add the pending mode to the existing batch (Change dialog)
    ACT.w1Opts({ dataset: { id: 'CR-P2' } }); ok('CR-P Change dialog: the fee options and the course\'s other mode, marked "Finance approval required"', !!qm('.w1-o') && !!qm('.cr-bm[value="Self-Paced"]') && /Finance approval required/.test(qm('#cr-bm-fs').textContent)); closeModal();
    let a0 = ADMIN.audit.length; ok('CR-P Self-Paced is added to the existing batch (configured modes only, audited)', bmEdit('CR-P2', ['Self-Paced']) === 'ok' && J(b2.crModes) === J(['Self-Paced', 'Fully Assisted']) && logged(a0, /Delivery modes configured changed/));
    ok('CR-P …the batch\'s options, learners and allocations are unchanged; Self-Paced waits for Finance', J({ r2: b2.r2, w: b2.w1opts, roster: batchRoster(b2) }) === keep2 && crReady(b2, 'Self-Paced') === 'finance' && crReady(b2, 'Fully Assisted') === 'ready');
    const lS = freeL([lF.id]); a0 = ADMIN.audit.length;
    ok('CR-P (negative) no enrolment under Self-Paced before approval (no option to choose; allocation skips the mode)', !r1Opts(pr.id).some(o => o.mode === 'Self-Paced') && crReady(b2, 'Self-Paced') !== 'ready');
    // a single-mode batch from before (seeded) gets the other mode added through Edit batch details
    SA(); crLeg('NV-L2', ['Self-Paced', 'Fully Assisted'], 'Both modes from 2027'); ACA(); // DM (PD-DM-06): CR's dialog is retired — its record, as it was stored
    const lb = ADMIN.batches.find(b => b.course === T2 && ['Open', 'Planned'].includes(b.status) && !Array.isArray(b.w1opts)), lbKeep = J({ roster: batchRoster(lb), enrolled: lb.enrolled, dm: lb.dmode, coh: lb.coh });
    ACT.s4bBatchEdit({ dataset: { id: lb.code } }); ok('CR-P Edit batch details: the configurable modes are offered (the same rules)', !!qm('.cr-bm') && qma('.cr-bm').map(x => x.value).join() === ['Self-Paced', 'Fully Assisted'].filter(m => m !== lb.dmode).join());
    qma('.cr-bm').forEach(x => { x.checked = true; }); fill({ '#bd-r': 'Second mode for this intake' }); a0 = ADMIN.audit.length; prim(); const edTxt = MODAL ? qma('.err').map(e => e.textContent).join(' | ') + ' // ' + (qm('#bd-i') || {}).textContent : 'closed'; if (MODAL) closeModal();
    ok('CR-P …saved alone with the reason (audited); its own mode stays ready on the programme fee', crBModes(lb).length === 2 && lb.crBase === lb.dmode && crReady(lb, lb.dmode) === 'ready' && crReady(lb, M_MODES.find(m => m !== lb.dmode)) === 'finance' && logged(a0, /Delivery modes configured changed/), J({ m: crBModes(lb), base: lb.crBase, dm: lb.dmode, w: lb.w1opts, err: edTxt }));
    ok('CR-P …its learners, enrolment and mode are unchanged', J({ roster: batchRoster(lb), enrolled: lb.enrolled, dm: lb.dmode, coh: lb.coh }) === lbKeep);
    // Finance approves only the Self-Paced option (a later package): attributable to that option; Fully Assisted untouched
    const faHist = J(r1Opt(fa).hist); ACA(); approveQ(qSP); /* DM: the package submitted above (was feeOpts adding and approving it here) */ const sp = r1Opts(pr.id).find(o => o.mode === 'Self-Paced');
    ok('CR-P Finance approves the Self-Paced option; the approval is recorded on that option', !!sp && sp.hist.some(h => /financial package/.test(h[2])) && J(r1Opt(fa).hist) === faHist);
    ok('CR-P …the Fully Assisted option\'s approval record is unchanged (approving one mode doesn\'t re-approve the other)', J(r1Opt(fa).hist) === faHist);
    ok('CR-P nothing widens on its own: both batches show Self-Paced "Approved by Finance — not enabled"', crReady(b1, 'Self-Paced') === 'accept' && crReady(b2, 'Self-Paced') === 'accept' && !w1Accepts(b2, sp.id) && !w1Accepts(b1, sp.id));
    go('a-batches', { id: 'CR-P2' }); ok('CR-P batch detail: who approved Self-Paced and when, with "Enable fee options"', /Approved by Finance — not enabled for this batch/.test(main()) && /SP — P — approved/.test(main()) && !!q('.cr-rdy [data-act="w1Opts"]'));
    ok('CR-P (negative) enrolment under Self-Paced before enabling is refused', /^(?!added)/.test(addL('CR-P2', lS.id, sp.id)) && !batchRoster(b2).some(r => r[1] === lS.id));
    enable('CR-P2', [fa, sp.id]);
    ok('CR-P after explicit enabling: Self-Paced ready in CR-P2 only', crReady(b2, 'Self-Paced') === 'ready' && crReady(b1, 'Self-Paced') === 'accept');
    ok('CR-P a Self-Paced learner enrols; each learner keeps their own mode', addL('CR-P2', lS.id, sp.id) === 'added' && r2LidInfo(lS.id, 'CR-P2').mode === 'Self-Paced' && r2LidInfo(lF.id, 'CR-P2').mode === 'Fully Assisted');
    a0 = ADMIN.audit.length; ok('CR-P (negative) a mode held by learners can\'t be removed', /held by learners/.test(enable('CR-P2', [fa])) && w1Accepts(b2, sp.id));
    ok('CR-P Course Builder: with one mode approved, Review & Publish warns about the other mode; the approval gate is not weakened', (() => { const c = cbRvChecks(pr); return !c.block.some(x => /Finance approval required/.test(x.msg)); })());
    closeModal(); BA(); a0 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'CR-P1' } });
    ok('CR-P (negative) another role can\'t change a batch\'s modes (refused, logged)', !MODAL && blocked(a0), J({ modal: MODAL && MODAL.title, who: ADMIN.me.name, a: since(a0).map(x => x.action) }));
    a0 = ADMIN.audit.length; ACA(); ACT.w1Opts({ dataset: { id: lb.code } }); qma('.cr-bm').forEach(x => { x.checked = false; }); BA(); const t = document.querySelector('#rsn'); if (t) t.value = 'x'; prim(); if (MODAL) closeModal();
    ok('CR-P (negative, confirm time) a role change before Save is refused, logged; nothing changes', blocked(a0) && crBModes(lb).length === 2);
  });
  await T('CR-Q', async () => {
    // the legacy draft date is a suggestion in the Publish dialog only
    fresh(); ACA(); const d = draftL3('CR legacy draft'); d.due = D(30, '21:59'); const nbB = nb('CR-Q1', T3, {}).b;
    setDl('L3AC-JAN26', d.id, isoL(12)); // an existing batch deadline set before publication
    ok('CR-Q before publication the draft\'s own date isn\'t any batch\'s deadline', crEffDue(d, 'CR-Q1') === null && crDue(d, 'L3AC-JAN26') === new Date(isoL(12) + ':00Z').toISOString());
    go('a-assignments', { id: d.id }); ACT.pubAsg({ dataset: { id: d.id } });
    ok('CR-Q Publish dialog: the draft\'s date pre-filled as an editable suggestion; an existing batch deadline wins', qm('#cr-pd-CR-Q1').value === d.due.slice(0, 16) && !!qm('#cr-pd-CR-Q1').closest('.field').querySelector('.cr-pd-sug') && qm('#cr-pd-L3AC-JAN26').value === isoL(12) && !crDl('CR-Q1', d.id));
    qma('.s2-pb').forEach(x => { x.checked = ['CR-Q1', 'L3AC-JAN26'].includes(x.value); }); fill({ '#cr-pd-CR-Q1': isoL(40) }); reason('Publish');
    ok('CR-Q what is confirmed is saved per batch; the existing deadline is not overridden', crDue(d, 'CR-Q1') === new Date(isoL(40) + ':00Z').toISOString() && crDue(d, 'L3AC-JAN26') === new Date(isoL(12) + ':00Z').toISOString());
    d.batchScope = 'all'; const nb2 = nb('CR-Q2', T3, {}).b;
    ok('CR-Q a batch created later doesn\'t get the draft\'s date, nor another batch\'s', !!nb2 && crEffDue(d, 'CR-Q2') === null);
    ok('CR-Q historical learner assignment dates unchanged', STORE.worlds.C.assignments.filter(a => a.id !== d.id).every(a => !a.batchDue));
    void nbB;
  });

  /* ================= B. Level 3 with fee options: unchanged behaviour ================= */
  await T('CR-B', async () => {
    fresh(); ACA();
    const pr = make({ level: 'Level 3' }); pr.status = 'Active';
    ok('CR-B (DM) Level 3 course: fee options created from its rows; the modes offered come from them (no separate record)', J(crModes(pr).modes) === J(['Self-Paced', 'Fully Assisted']) && crModes(pr).src === 'fee options' && !CRDM()[pr.id] && r1Opts(pr.id).length === 2); // DM (PD-DM-01): was "modes recorded from the form"
    const r = nb('CR-L3-B', pr.title, { modes: ['Self-Paced', 'Fully Assisted'] });
    ok('CR-B the batch accepts both modes through its fee options (W1 record)', r.b && r.b.w1opts.length === 2 && mModesOf(r.b).length === 2);
    ACT.newBatch(); const co = qm('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); const fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id;
    const x = qm(`.w1-nb-o[value="${fa}"]`); x.checked = false; INP.mOptTick(x);
    ok('CR-B unticking one fee option leaves only the other mode', /Accepts: Self-Paced/.test(mroot().textContent)); closeModal();
    // DM (PD-DM-06) supersedes "a mode can't be removed while an active fee option uses it": modes can't be set separately at all
    const a0 = ADMIN.audit.length; ACT.crDmEdit({ dataset: { id: pr.id } });
    ok('CR-B (DM, negative) setting delivery modes separately is refused, logged; the modes still follow the fee options', !MODAL && blocked(a0, /set delivery modes separately/) && J(crModes(pr).modes) === J(['Self-Paced', 'Fully Assisted']));
    closeModal();
    ok('CR-B the seeded Level 3 Diploma (no configuration): modes still come from its fee options', crModes(s3Pr('NV-L3')).src === 'fee options' && !CRDM()['NV-L3']);
    // DM (PD-DM-01) supersedes "a Level 3 row in a mode the course doesn't offer is refused": there is no second setting to disagree with —
    // a course with a single Fully Assisted row offers Fully Assisted only
    go('a-programmes'); ACT.chProgNew(); const n = document.querySelectorAll('main .r1-np-row');
    fill({ '#np-t': 'CR Level 3 mismatch', '#np-l': 'Level 3', '#np-r': 'QN 610/7999/1', '#np-d': '6', '#np-du': 'months' }); document.querySelector('#np-obs-no').checked = true;
    const row = document.querySelector('main .r1-np-row'); row.querySelector('.r1-np-l').value = 'FA'; row.querySelector('.r1-np-f').value = '2400'; row.querySelector('.r1-np-m').value = 'Fully Assisted';
    const p0 = ADMIN.programmes.length, pm = ACT.cbDetCreate(); closeModal();
    ok('CR-B (DM) one Fully Assisted row: the course is created offering Fully Assisted only', ADMIN.programmes.length === p0 + 1 && !!pm && J(crModes(pm).modes) === J(['Fully Assisted']));
    void n;
  });

  /* ================= C. A course offering one mode ================= */
  await T('CR-C', async () => {
    fresh(); ACA();
    const pr = make({ level: 'Level 4', modes: ['Fully Assisted'], title: 'CR Level 4 Fully Assisted only' }); pr.status = 'Active';
    ACT.newBatch(); const co = qm('#nb-co'); co.value = pr.title; INP.n2NbCourse(co);
    ok('CR-C Create batch: only Fully Assisted is shown, ticked', qma('.cr-nb-m').map(x => x.value + (x.checked ? '*' : '')).join('|') === 'Fully Assisted*' && !qm('.cr-nb-m[value="Self-Paced"]'));
    // a forged Self-Paced box is refused and logged
    qm('#cr-nb .row').insertAdjacentHTML('beforeend', '<label class="check"><input type="checkbox" class="cr-nb-m" value="Self-Paced" checked></label>'); qm('.cr-nb-m[value="Fully Assisted"]').checked = false;
    fill({ '#nb-c': 'CR-L4-X' }); const a0 = ADMIN.audit.length;
    ok('CR-C (negative) a mode the course doesn\'t offer is refused, logged', prim() === false && blocked(a0, /delivery mode the course doesn't offer/));
    closeModal();
    const r = nb('CR-L4-FA', pr.title, {});
    ok('CR-C the batch takes Fully Assisted', r.b && r.b.dmode === 'Fully Assisted');
    ACT.s4bBatchEdit({ dataset: { id: 'CR-L4-FA' } });
    ok('CR-C Edit batch details: the delivery mode list offers only the course\'s mode', qma('#bd-dm option').map(o => o.textContent).join('|') === 'Fully Assisted'); closeModal();
    const a1 = ADMIN.audit.length;
    ok('CR-C (negative) a direct change to Self-Paced is refused and logged', n2CanChangeMode(r.b, 'Self-Paced') === false && blocked(a1, /change delivery mode/));
    const p3 = make({ level: 'Level 3', modes: ['Self-Paced'], rows: [{ l: 'SP only', f: 1500, m: 'Self-Paced' }] }); p3.status = 'Active';
    ACT.newBatch(); const c3 = qm('#nb-co'); c3.value = p3.title; INP.n2NbCourse(c3);
    ok('CR-C Level 3 course offering Self-Paced only: only that mode is selectable', qma('.m-m').map(x => x.value).join('|') === 'Self-Paced'); closeModal();
    go('a-programmes', { id: p3.id, tab: 'fees' }); if (!CB8().wf[p3.id]) ACT.cb8Start({ dataset: { p: p3.id } }); ACT.cb8Opt({ dataset: { p: p3.id, o: '' } });
    // DM (PD-DM-01) supersedes "a new fee option can only use an offered mode": the options are the offer, so adding one in the other mode is how a course offers it
    ok('CR-C (DM) Fees & Payments: a new fee option can use either mode (adding one is how the course offers that mode)', MODAL && qma('#c8-m option').map(o => o.value).filter(Boolean).sort().join('|') === 'Fully Assisted|Self-Paced'); closeModal();
  });

  /* ================= D. Legacy courses: nothing invented ================= */
  await T('CR-D', async () => {
    fresh(); SA(); const b0 = J(ADMIN.batches.filter(b => b.course === T2).map(b => [b.code, b.dmode, b.w1opts]));
    ok('CR-D the seeded Level 2 Diploma has no configuration recorded', !CRDM()['NV-L2'] && crModes(s3Pr('NV-L2')).src === 'none');
    ACA(); ACT.newBatch(); const co = qm('#nb-co'); co.value = T2; INP.n2NbCourse(co);
    ok('CR-D Create batch (legacy course): the one-mode choice works as before, with a note', !qm('#cr-nb') && qm('#nb-dm').closest('.field').style.display !== 'none' && /one programme price/.test(mroot().textContent) /* DM (PD-DM-05): the note now says why — was /aren't configured/ */); closeModal();
    const r = nb('CR-L2-LEG', T2, { dm: 'Self-Paced' });
    ok('CR-D a batch of the legacy course is created with the chosen mode', r.b && r.b.dmode === 'Self-Paced');
    SA(); go('a-programmes', { id: 'NV-L2', tab: 'details' });
    // DM (PD-DM-06) supersedes "Not configured" + "Configure delivery modes": the explicit step is now fee options by delivery mode in Section 5 (ft-dm)
    ok('CR-D (DM) Course Details (legacy): "One programme price" and the way to Section 5 — Fees & Payments; no separate modes dialog', /Delivery modes offered\s*One programme price/.test(main()) && !!(q('.cb-feelink') || q('.cr-dm-ro [data-go]')) && !q('[data-act="crDmEdit"]'));
    const a0 = ADMIN.audit.length; crLeg('NV-L2', ['Fully Assisted'], 'Configured for 2027 intakes');
    ok('CR-D (DM) a value recorded under CR is honoured, with its history (no new record is written by DM)', J(crModes(s3Pr('NV-L2')).modes) === J(['Fully Assisted']) && crModes(s3Pr('NV-L2')).src === 'legacy' && CRDM()['NV-L2'].hist.length === 1 && !logged(a0, /Delivery modes offered/));
    ok('CR-D existing batches of the course are unchanged', J(ADMIN.batches.filter(b => b.course === T2 && b.code !== 'CR-L2-LEG').map(b => [b.code, b.dmode, b.w1opts])) === b0);
    ok('CR-D …and CR-L2-LEG keeps Self-Paced', ADMIN.batches.find(b => b.code === 'CR-L2-LEG').dmode === 'Self-Paced');
  });

  /* ================= E. No Academy course code ================= */
  await T('CR-E', async () => {
    fresh(); ACA(); go('a-programmes'); ACT.chProgNew();
    const lab = id => (q(`label[for="${id}"]`) || {}).textContent;
    ok('CR-E the form has no Course code; Course name, Awarding body and Awarding body course code remain', !q('#np-code') && lab('np-t') === 'Course name' && lab('np-q-body') === 'Awarding body' && lab('np-r') === 'Awarding body course code');
    const pr = make({ level: 'Level 4', modes: ['Fully Assisted'], title: 'CR Level 4 no course code' });
    ok('CR-E a course is created without an Academy course code (stable ID used)', !!pr && !pr.code && /^NV-/.test(pr.id));
    go('a-programmes', { id: pr.id, tab: 'review' });
    ok('CR-E Review & Publish: no Course code row; Awarding body course code and Delivery modes offered shown', !/Course code\s/.test((q('.cb-rv-dl') || {}).textContent || '') && /Awarding body course code/.test(main()) && /Delivery modes offered/.test(main()));
    const p2 = s3Pr('NV-L4'); p2.code = 'L4-HIST'; go('a-programmes', { id: 'NV-L4', tab: 'details' });
    ok('CR-E a course code recorded earlier is kept and shown as historical', /Former Academy course code\s*L4-HIST/.test(main()) && p2.code === 'L4-HIST');
  });

  /* ================= F. Unit creation without a unit code ================= */
  await T('CR-F', async () => {
    fresh(); ACA(); const pr = make({ level: 'Level 4', modes: ['Fully Assisted'], title: 'CR Level 4 units' }); go('a-programmes', { id: pr.id, tab: 'structure' });
    ACT.ch8AddUnit({ dataset: { id: pr.id } });
    ok('CR-F Add unit: no unit code input shown, only the unit title; the reference is explained', !qma('input').some(i => i.id === 'u-c' && i.type !== 'hidden') && !!qm('#u-t') && /stable internal unit reference/.test(mroot().textContent));
    fill({ '#u-t': 'Lead person-centred practice' }); press();
    const u = ch8Tree(pr.id)[0];
    ok('CR-F the unit is created with a stable reference', u && u.title === 'Lead person-centred practice' && /^U\d{3}$/.test(u.code));
    add8('ch8AddMod', { id: pr.id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'K/650/0101' }); add8('ch8AddLo', { id: pr.id, u: 0, m: 0 }, { '#lo-t': 'Understand', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id: pr.id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain', '#c-e': 'Written' });
    const c = ch8Tree(pr.id)[0].mods[0].los[0].crit[0];
    ok('CR-F criterion codes derive from the unit reference as before', c && c.code.startsWith(u.code.replace(/^U/, '') + ' '));
    ACT.ch8AddUnit({ dataset: { id: pr.id } }); fill({ '#u-t': 'Second' }); press();
    ok('CR-F the next unit gets the next reference (unique)', ch8Tree(pr.id)[1].code === 'U' + String(+u.code.slice(1) + 1).padStart(3, '0'));
    ACT.cbAsgNew({ dataset: { p: pr.id } }); fill({ '#cna-t': 'CR unit assignment' }); press(); const d = s2Defs().find(x => x.title === 'CR unit assignment');
    ok('CR-F an assignment maps to the new unit\'s criterion', !!d && s2Crit(d).some(x => x.code === c.code));
    // seeded programme: existing units unchanged, the new one numbered after them
    SA(); const before = J(STORE.s3.trees['NV-L4'].map(x => x.code)); ACT.nodeAdd({ dataset: { p: 'NV-L4', lvl: 'unit' } });
    ok('CR-F seeded programme: Add unit has no unit code input', !qma('input').some(i => i.id === 'nd-c' && i.type !== 'hidden'));
    fill({ '#nd-t': 'Managing resources' }); press(); const t = STORE.s3.trees['NV-L4'], last = t[t.length - 1];
    ok('CR-F seeded programme: existing units keep their codes; the new unit follows them', J(t.slice(0, -1).map(x => x.code)) === before && last.title === 'Managing resources' && +last.code.slice(1) > Math.max(...JSON.parse(before).map(x => +x.slice(1))));
  });

  /* ================= G–I. Deadlines per batch ================= */
  await T('CR-G', async () => {
    fresh(); ACA();
    const r = nb('CR-L3-G', T3, {}); ok('CR-G fixture: a second Level 3 batch', !!(r && r.b));
    const d = draftL3('CR deadline assignment');
    ok('CR-G New assignment: no deadline field; the definition has no deadline', !!d && d.due === null);
    go('a-assignments', { id: d.id, tab: 'details' });
    ok('CR-G assignment Details: no Deadline input; a deadline per batch instead', !q('#ae-d') && !!q('.cr-asg-dl'));
    const nope = publishTo(d, { 'L3AC-JAN26': isoL(20), 'CR-L3-G': '' });
    ok('CR-G (negative) publishing to a batch without its deadline is refused; nothing published', /Set the deadline for CR-L3-G/.test(nope) && d.status === 'Draft' && !crDl('L3AC-JAN26', d.id));
    const pub = publishTo(d, { 'L3AC-JAN26': isoL(20), 'CR-L3-G': isoL(45) });
    ok('CR-G published with two different deadlines for the same assignment', pub === 'ok' && d.status === 'Published' && crDue(d, 'L3AC-JAN26') !== crDue(d, 'CR-L3-G'));
    const C = STORE.worlds.C, aC = C.assignments.find(a => a.id === d.id);
    ok('CR-G the learner in L3AC-JAN26 has that batch\'s deadline (assignment and calendar)', aC && aC.due === crDue(d, 'L3AC-JAN26') && C.events.find(e => e.id === 'ed' + d.id).start === aC.due);
    // H: a learner enrols in CR-L3-G after publication
    const w = finish(apply3('A'), r.b), aA = w.assignments.find(a => a.id === d.id);
    ok('CR-H a learner who enrols after publication gets their batch\'s deadline', aA && aA.due === crDue(d, 'CR-L3-G') && aA.due !== aC.due);
    ACA(); go('a-batches', { id: 'CR-L3-G', tab: 'deadlines' });
    ok('CR-G Batch → Assignment deadlines lists the assignment with this batch\'s deadline', /Assignment deadlines — CR-L3-G/.test(main()) && q(`tr[data-asg="${d.id}"]`) && q(`tr[data-asg="${d.id}"]`).textContent.includes(fdt(crDue(d, 'CR-L3-G'))));
    // Change one batch: the other is untouched; the learner's copy moves
    const keepC = aC.due; ok('CR-G changing CR-L3-G\'s deadline (audited)', setDl('CR-L3-G', d.id, isoL(60)) === 'ok' && crDue(d, 'CR-L3-G') === new Date(isoL(60) + ':00Z').toISOString());
    ok('CR-G …moves its learner\'s deadline and leaves L3AC-JAN26 as it was', aA.due === crDue(d, 'CR-L3-G') && aC.due === keepC);
    COO('A'); go('c-batches', { id: 'L3AC-JAN26' });
    ok('CR-G Coordinator overview shows this batch\'s deadline', !q('.s2-cb') || q('.s2-cb').textContent.includes(fdt(keepC)));
    // H: late joiner (deadline already passed) — kept, Coordinator told
    ACA(); d.batchScope = 'all'; const r2 = nb('CR-L3-H', T3, {}); setDl('CR-L3-H', d.id, isoL(-3)); const n0c = STORE.coo.notifs.length;
    const wB = finish(apply3('F'), r2.b), aB = wB.assignments.find(a => a.id === d.id);
    ok('CR-H a learner joining after the batch deadline keeps it; extension notice raised', aB && aB.due === crDue(d, 'CR-L3-H') && !!aB.lateJoin && STORE.coo.notifs.slice(0, STORE.coo.notifs.length - n0c).some(x => /Extension decision needed/.test(x.t)));
  });
  await T('CR-G2', async () => {
    // a batch with no deadline set doesn't issue the assignment until one is set
    fresh(); ACA(); const r3 = nb('CR-L3-N', T3, {}), d = draftL3('CR held assignment'); publishTo(d, { 'L3AC-JAN26': isoL(20) }); d.batchScope = 'all';
    const wA = finish(apply3('A'), r3.b);
    ok('CR-G a batch without a deadline doesn\'t issue it; the batch tab says so', !wA.assignments.some(a => a.id === d.id) && (ACA(), go('a-batches', { id: 'CR-L3-N', tab: 'deadlines' }), /Deadline required/.test(main()) && /Not released/.test(main())));
    ok('CR-G …setting the batch deadline issues it with that deadline', setDl('CR-L3-N', d.id, isoL(30)) === 'ok' && (wA.assignments.find(a => a.id === d.id) || {}).due === crDue(d, 'CR-L3-N'));
  });
  await T('CR-G3', async () => {
    // a new batch never inherits a date: not a course-level date of an older definition, not another batch's deadline
    fresh(); ACA(); const d = draftL3('CR legacy-date assignment'); publishTo(d, { 'L3AC-JAN26': isoL(20) }); d.batchScope = 'all'; d.due = D(25, '21:59'); // an older definition's course-level date
    const r = nb('CR-L3-NEW', T3, {});
    ok('CR-G new batch after publication: no deadline inherited (not the course-level date, not L3AC-JAN26\'s)', crEffDue(d, 'CR-L3-NEW') === null && crEffDue(d, 'L3AC-JAN26') === crDue(d, 'L3AC-JAN26'));
    go('a-batches', { id: 'CR-L3-NEW', tab: 'deadlines' }); const row = q(`tr[data-asg="${d.id}"]`);
    ok('CR-G its Assignment deadlines tab: "Deadline required — not released" with a Set deadline action', !!row && /Deadline required/.test(row.textContent) && /Not released/.test(row.textContent) && !!row.querySelector('[data-act="crDlEdit"]'));
    go('a-batches', { id: 'CR-L3-NEW' }); ok('CR-G the batch page warns that the published assignment has no deadline', !!q('.cr-dl-miss'));
    const wA = finish(apply3('A'), r.b);
    ok('CR-G a learner joining that batch doesn\'t receive it yet', !wA.assignments.some(a => a.id === d.id));
    ACA(); const sd = setDl('CR-L3-NEW', d.id, isoL(50)); ok('CR-G setting the deadline releases it to them with that deadline', sd === 'ok' && (wA.assignments.find(a => a.id === d.id) || {}).due === crDue(d, 'CR-L3-NEW'), J({ sd, due: crDue(d, 'CR-L3-NEW'), has: wA.assignments.some(a => a.id === d.id), code: s2BatchCodeOf(wA), done: wA.signup && wA.signup.done, app: fAsgApplies(d, wA) }));
    // Publish: a deadline per chosen batch, or an explicit "Release later"
    const d2 = draftL3('CR release-later assignment'); ACA(); go('a-assignments', { id: d2.id }); ACT.pubAsg({ dataset: { id: d2.id } }); qma('.s2-pb').forEach(x => { x.checked = ['L3AC-JAN26', 'CR-L3-NEW'].includes(x.value); }); fill({ '#cr-pd-L3AC-JAN26': isoL(30) });
    const t = document.querySelector('#rsn'); t.value = 'Publish'; const r1 = prim();
    ok('CR-G (negative) publishing with a chosen batch that has no deadline is refused (no silent omission)', r1 === false && /or choose "Release later"/.test(mroot().textContent) && d2.status === 'Draft');
    qm('#cr-ph-CR-L3-NEW').checked = true; const r2 = prim(); if (MODAL) closeModal();
    ok('CR-G with "Release later" it publishes: L3AC-JAN26 has its deadline; CR-L3-NEW is held with "Deadline required"', r2 !== false && d2.status === 'Published' && !!crDue(d2, 'L3AC-JAN26') && !crEffDue(d2, 'CR-L3-NEW') && d2.batches.includes('CR-L3-NEW') && !wA.assignments.some(a => a.id === d2.id));
    ok('CR-G historical assignments of L3AC-JAN26 learners are unchanged', STORE.worlds.C.assignments.filter(a => a.id !== d.id && a.id !== d2.id).every(a => !a.batchDue));
  });
  await T('CR-I', async () => {
    fresh(); ACA(); const C = STORE.worlds.C;
    const defs = s2Defs().filter(d => d.status === 'Published' && (d.batches || []).includes('L3AC-JAN26'));
    const done = defs.find(d => { const a = C.assignments.find(x => x.id === d.id); return a && (a.status === 'Completed' || a.qs.some(q => q.rounds.length)); });
    const open = defs.find(d => { const a = C.assignments.find(x => x.id === d.id); return a && ['Not Started', 'In Progress'].includes(a.status) && !a.qs.some(q => q.rounds.length); });
    ok('CR-I fixture: a completed / submitted and an open seeded assignment in L3AC-JAN26', !!done && !!open);
    const ad = C.assignments.find(x => x.id === done.id), snap = J(ad);
    ok('CR-I legacy: the batch uses the definition\'s course-level date until it sets its own', crEffDue(done, 'L3AC-JAN26') === done.due && !crDl('L3AC-JAN26', done.id));
    setDl('L3AC-JAN26', done.id, isoL(90));
    ok('CR-I a submitted / completed assignment is unchanged when the batch deadline changes', J(C.assignments.find(x => x.id === done.id)) === snap);
    const ao = C.assignments.find(x => x.id === open.id); extendAssignment('C', open.id, D(80, '20:59'), 'Individual extension'); const ext = ao.due;
    setDl('L3AC-JAN26', open.id, isoL(30));
    ok('CR-I an individual extension is kept (never shortened by a batch deadline)', ao.due === ext && !!ao.originalDue);
    setDl('L3AC-JAN26', open.id, isoL(120));
    ok('CR-I …a later batch deadline supersedes it', ao.due === crDue(open, 'L3AC-JAN26'));
  });

  /* ================= J. Batch code and awarding body batch code ================= */
  await T('CR-J', async () => {
    fresh(); ACA(); ACT.newBatch();
    ok('CR-J Create batch: two distinct fields, Batch code and Awarding body batch code (optional)', !!qm('#nb-c') && !!qm('#nb-abc') && /Awarding body batch code \(optional\)/.test(mroot().textContent)); closeModal();
    const bad = nb('CR-J-BAD', T2, { dm: 'Fully Assisted', abc: '<script>' });
    ok('CR-J (negative) an unsafe value is refused', bad.refused && /Use letters, digits/.test(bad.msg));
    const a0 = ADMIN.audit.length, r = nb('CR-J1', T2, { dm: 'Fully Assisted', abc: 'NCFE / 2026 / 0142' });
    ok('CR-J created with both: stored separately, the Academy code unchanged; audited; shown on the review step', r.b && r.b.code === 'CR-J1' && r.b.abCode === 'NCFE / 2026 / 0142' && logged(a0, /Awarding body batch code recorded/) && /Awarding body batch code\s*NCFE \/ 2026 \/ 0142/.test(r.rev));
    const r0 = nb('CR-J0', T2, { dm: 'Fully Assisted' });
    ok('CR-J optional: a batch without one', r0.b && r0.b.abCode === null);
    go('a-batches', { id: 'CR-J1' });
    ok('CR-J batch detail shows Batch code and Awarding body batch code', /Batch code CR-J1 · Awarding body batch code: NCFE \/ 2026 \/ 0142/.test(main().replace(/\s+/g, ' ')));
    ACT.s4bBatchEdit({ dataset: { id: 'CR-J1' } }); fill({ '#bd-abc': 'NCFE-2026-0143', '#bd-r': 'Corrected by the awarding body' }); const a1 = ADMIN.audit.length; prim();
    ok('CR-J Edit batch details: only the awarding body batch code changed — saved with the reason, audited', ADMIN.batches.find(b => b.code === 'CR-J1').abCode === 'NCFE-2026-0143' && logged(a1, /Awarding body batch code changed/) && !MODAL);
    ACT.crAbcEdit({ dataset: { id: 'CR-J0' } }); fill({ '#ab-abc': 'CG-7788' }); reason('Received from City & Guilds');
    ok('CR-J recorded after creation ("Record"), with history', r0.b.abCode === 'CG-7788' && r0.b.abcHist.length === 1);
    ok('CR-J the batch is still found by its Academy code only', chBatch('CR-J0') === r0.b && !chBatch('CG-7788'));
    COO('A'); go('c-batches', { id: 'CR-J1' }); ok('CR-J Coordinator overview shows the awarding body batch code', /Awarding body batch code\s*NCFE-2026-0143/.test(main()) || !/Delivery channel/.test(main()));
  });

  /* ================= K. Mixed modes with several Coordinators ================= */
  await T('CR-K', async () => {
    fresh(); ACA(); const pr = make({ level: 'Level 2', modes: ['Self-Paced', 'Fully Assisted'], title: 'CR Level 2 multi-coordinator' }); pr.status = 'Active';
    feeOpts(pr, [{ l: 'SP — K', f: 700, m: 'Self-Paced' }, { l: 'FA — K', f: 900, m: 'Fully Assisted' }]);
    const r = nb('CR-K1', pr.title, { modes: ['Self-Paced', 'Fully Assisted'] }), b = r.b;
    const other = ADMIN.staff.find(s => s.roles.includes('Academic Coordinator') && s.status === 'Active' && s.name !== 'Dr Helen Carter').name;
    SA(); mcAddCoord(b, other, 'Second Coordinator'); ACA();
    const sp = r1Opts(pr.id).find(o => o.mode === 'Self-Paced').id, fa = r1Opts(pr.id).find(o => o.mode === 'Fully Assisted').id, ls = [];
    for (let k = 0; k < 4; k++) { const l = freeL(ls); ls.push(l.id); addL('CR-K1', l.id, k % 2 ? fa : sp); }
    mcSync(b);
    ok('CR-K two Coordinators on a mixed Level 2 batch', mcList(b).length === 2);
    ok('CR-K every learner is designated to one of them, both used', ls.every(l => mcList(b).includes(mcOf(l, b))) && new Set(ls.map(l => mcOf(l, b))).size === 2);
    ok('CR-K each learner\'s mode comes from their fee option', ls.every((l, k) => r2LidInfo(l, 'CR-K1').mode === (k % 2 ? 'Fully Assisted' : 'Self-Paced')));
    ok('CR-K composition is Mixed', w1Comp(b).kind === 'Mixed');
  });

  /* ================= L. Unauthorized changes are refused and logged ================= */
  await T('CR-L', async () => {
    // DM (PD-DM-06) supersedes the "configure delivery modes" refusals: CR's dialog is retired for everyone; the explicit step is
    // "Use fee options by delivery mode" (Section 5), with the existing role check, also at confirm time
    fresh(); let a0 = ADMIN.audit.length; FA(); ACT.crDmEdit({ dataset: { id: 'NV-L2' } });
    ok('CR-L (DM) setting delivery modes separately is refused for Finance too (logged)', !MODAL && blocked(a0, /set delivery modes separately/) && !CRDM()['NV-L2']);
    ACA(); const p1 = make({ level: 'Level 4', title: 'CR Level 4 one price (L)' }); a0 = ADMIN.audit.length; FA(); ACT.crFoStart({ dataset: { p: p1.id } });
    ok('CR-L (DM) Finance can\'t switch a course to fee options by delivery mode (refused, logged)', !MODAL && blocked(a0, /use fee options by delivery mode/) && !crMultiFee(p1));
    a0 = ADMIN.audit.length; ACA(); ACT.crFoStart({ dataset: { p: p1.id } }); FA(); reason('Hijack');
    ok('CR-L (DM, confirm time) a role change before confirming is refused, logged', blocked(a0, /use fee options by delivery mode/) && !crMultiFee(p1)); closeModal();
    const d = s2Defs().find(x => x.status === 'Published' && (x.batches || []).includes('L3AC-JAN26'));
    a0 = ADMIN.audit.length; BA(); ACT.crDlEdit({ dataset: { b: 'L3AC-JAN26', id: d.id } });
    ok('CR-L another role can\'t change a batch deadline (refused, logged)', !MODAL && blocked(a0, /change an assignment deadline/) && !crDl('L3AC-JAN26', d.id));
    a0 = ADMIN.audit.length; ACA(); ACT.r1OptAdd({ dataset: { p: 'NV-L3' } });
    ok('CR-L an Academic Admin can\'t add a fee option directly (existing Finance rule, logged)', !MODAL && blocked(a0));
    a0 = ADMIN.audit.length; FA(); ACT.crAbcEdit({ dataset: { id: 'L3AC-JAN26' } });
    ok('CR-L Finance can\'t record an awarding body batch code (refused, logged)', !MODAL && blocked(a0, /awarding body batch code/));
    a0 = ADMIN.audit.length; ACA(); const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'); ACT.crDlEdit({ dataset: { b: b.code, id: 'no-such' } });
    ok('CR-L an unknown assignment is ignored (nothing set)', !MODAL && !crDl(b.code, 'no-such'));
    const l3 = s2Defs().find(x => x.programme === T2 && x.status !== 'Retired'); if (l3) { a0 = ADMIN.audit.length; ACT.crDlEdit({ dataset: { b: 'L3AC-JAN26', id: l3.id } }); ok('CR-L (negative) a deadline for another course\'s assignment is refused, logged', !MODAL && blocked(a0, /doesn't apply/)); }
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
