// R1–R5 — client clarifications (Oct 2026): Level 3 fee options, mixed-mode batches and session audiences, criterion judgements and
// the Assessor's final assignment outcome, Self-Paced monthly worklists, and the cross-stage journeys. Each check does the action
// through the screen or handler, then checks the consuming screen, and includes the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  // (the Assessor portal keeps its own state between tests: an unsaved marking draft would stop navigation with the 'Unsaved marking changes' prompt)
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  // N5a review (supersedes publishing without it): every new programme and new version records "Observation required" (Yes / No) first
  const obsDecide = (id, v = 'no') => { ACT.n5Settings({ dataset: { p: id } }); const r = document.querySelector(`#modal-root input[name="n5-req"][value="${v}"]`); if (r && MODAL) { r.checked = true; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); } closeModal(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { ACT.switchRole({ dataset: { r } }); S.signedIn = true; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'R test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const rebuildA = () => { INP.adminVariant({ value: Object.keys(ADMIN_VARIANTS).find(k => k !== 'A') }); INP.adminVariant({ value: 'A' }); SA(); };
  const T3 = 'Level 3 Diploma in Adult Care (England)';
  const farBatch = (title, code) => code ? ADMIN.batches.find(b => b.code === code) : ADMIN.batches.find(b => b.course === title && ['Open', 'Planned'].includes(b.status) && daysTo(b.start) >= 30 && b.enrolled < b.cap);
  // A fee option through the admin card (add), returning its ID
  const optAdd = (label, fee, mode, r = 'R1 test') => { ACT.r1OptAdd(); fill({ '#fo-l': label, '#fo-f': String(fee), '#fo-m': mode }); const x = reason(r); return x === false ? null : r1Opts().find(o => o.label === label && o.status === 'Active').id; };
  // A learner without an NVQ starts the Level 3 sign-up from Browse and picks an option (by ID)
  const apply3 = (v, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === T3); ACT.applyNvq({ dataset: { id: c.id } }); if (optId) { const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; } const res = prim(); if (res !== false) closeModal(); return W; };
  // (the details step assigns the nearest batch for the learner's country — CH-42 — so a chosen batch is set after the letter, as in the N2 test)
  // Sign up to any Level 3 programme from Browse, choosing one of its options
  const apply3x = (v, pr, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); if (optId) { const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; } const res = prim(); if (res !== false) closeModal(); return W; };
  const finish = (w, opt, batch) => { chSetBatch(w, batch || farBatch(T3)); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); if (batch) chSetBatch(w, batch); setUi('suOpt', opt || 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };

  /* ================= R1 — Level 3 fee options ================= */
  await T('R1 seed: one legacy option; existing Level 3 learners keep their exact fee, mode, deposit and payments', async () => {
    fresh(); const o = r1Opts();
    ok('R1 seed: the standard (legacy) option only, Active, fee = the Level 3 plan fee, mode = the batch\'s (as before options)', o.length === 1 && o[0].id === 'L3-FO-STD' && o[0].legacy && o[0].status === 'Active' && o[0].mode === null && r1FeeOf(o[0]) === 2400);
    const C = STORE.worlds.C, B = STORE.worlds.B;
    ok('R1 legacy: Aisha (enrolled L3) references L3-FO-STD (no mode of its own — her batch\'s), £2,400 / £300 / 6 — plans untouched', r1OptOfW(C).id === 'L3-FO-STD' && r1ModeOfW(C) === null && C.signup.plan.fee === 2400 && C.signup.plan.deposit === 300 && C.signup.plan.inst === 6 && C.plans[0].total === 2400 && C.plans[0].rows.length === 6 && C.plans[0].rows[3].status === 'Partially paid' && C.admission.deposit.paid === true);
    ok('R1 legacy: Priya (sign-up in progress) keeps £2,400 / £300, legacy reference, step 2', r1OptOfW(B).id === 'L3-FO-STD' && B.signup.plan.fee === 2400 && B.signup.plan.deposit === 300 && B.signup.step === 2 && Object.isFrozen(B.signup.plan));
    ok('R1 limited to Level 3: Grace (Level 2) has no fee option', !r1OptOfW(STORE.worlds.D) && !STORE.worlds.D.nvq.feeOpt);
    ok('R1 no hard-coded example values: none of £500 / £800 / £1,000 / £1,500 is seeded as an option', !r1Opts().some(x => [500, 800, 1000, 1500].includes(x.fee)));
  });

  await T('R1 admin: add, edit, retire with validation, audit and permission checks', async () => {
    fresh(); FA(); go('f-plans', { tab: 'templates' });
    ok('R1 card: Finance → Payment Plans → Plan templates shows the Level 3 fee options with Add', !!app().querySelector('.r1-opts') && !!app().querySelector('[data-act="r1OptAdd"]') && /L3-FO-STD/.test(main()));
    const a = optAdd('Self-Paced — standard', 600, 'Self-Paced', 'New SP price');
    const o = r1Opt(a);
    ok('R1 add (Finance): stable ID, label, fee, mode, Active; audited with reason', /^L3-FO-\d{3}$/.test(a) && o.fee === 600 && o.mode === 'Self-Paced' && o.status === 'Active' && ADMIN.audit[0].action === 'Fee option added' && ADMIN.audit[0].reason === 'New SP price');
    const b = optAdd('Fully Assisted — premium', 1800, 'Fully Assisted');
    ok('R1 any amounts (not a fixed list): £600 and £1,800 accepted; IDs unique', !!b && b !== a);
    // E1 rounding (20 Oct 2026, PD-E1-15) supersedes: "fee must divide into the plan's 6 instalments to the penny (£500 → refused)".
    // £500 now reconciles (5 × £83.33 + £83.35) — checked without saving, so the option counts below are unchanged; the deposit rule stays.
    ok('R1 a fee that doesn\'t split evenly reconciles with the plan (£500 over 6 → 5 × £83.33 + £83.35), checked without saving', r1FeeWhy('500', 'NV-L3') === '' && e1SchedTxt(500, 6) === '5 × £83.33 + £83.35');
    ACT.r1OptAdd(); fill({ '#fo-l': 'Bad', '#fo-f': '250', '#fo-m': 'Self-Paced' }); ok('R1 (negative) a fee not above the plan\'s deposit is refused (£250, deposit £300)', reason() === false && /must be below the fee/.test(mroot().textContent)); closeModal();
    ACT.r1OptAdd(); fill({ '#fo-l': 'self-paced — STANDARD', '#fo-f': '660', '#fo-m': 'Self-Paced' }); ok('R1 (negative) duplicate active label refused (case-insensitive)', reason() === false); closeModal();
    ACT.r1OptAdd(); fill({ '#fo-l': 'No mode', '#fo-f': '660', '#fo-m': '' }); ok('R1 (negative) mode is required', reason() === false); closeModal();
    ACT.r1OptAdd(); fill({ '#fo-l': 'Zero', '#fo-f': '0', '#fo-m': 'Self-Paced' }); ok('R1 (negative) fee above £0 required', reason() === false); closeModal();
    ACT.r1OptAdd(); fill({ '#fo-l': 'Below deposit', '#fo-f': '120', '#fo-m': 'Self-Paced' }); ok('R1 (negative) fee must be above the deposit', reason() === false); closeModal();
    const n0 = r1Opts().length;
    ACT.r1OptEdit({ dataset: { id: a } }); ok('R1 edit (Finance): the existing fee is read-only', document.querySelector('#fo-f').readOnly);
    document.querySelector('#fo-f').readOnly = false; fill({ '#fo-f': '720' }); ok('R1 (negative) Finance can\'t change an existing option\'s fee (refused, audited)', reason() === false && r1Opt(a).fee === 600 && ADMIN.audit[0].action === 'Blocked: change the option fee'); closeModal();
    ACT.r1OptEdit({ dataset: { id: a } }); fill({ '#fo-l': 'Self-Paced — monthly support' }); reason('Rename');
    ok('R1 edit (Finance): label change saved as a new version, history kept', r1Opt(a).label === 'Self-Paced — monthly support' && r1Opt(a).v === 2 && r1Opt(a).hist.length === 2 && r1Opts().length === n0);
    SA(); ACT.r1OptEdit({ dataset: { id: a } }); fill({ '#fo-f': '720' }); reason('SA price change');
    ok('R1 edit (Super Admin): the fee changes; audited before → after', r1Opt(a).fee === 720 && /£600/.test(ADMIN.audit[0].before) && /£720/.test(ADMIN.audit[0].after));
    ACT.r1OptEdit({ dataset: { id: 'L3-FO-STD' } }); ok('R1 legacy option: fee and mode locked in the form', document.querySelector('#fo-f').readOnly && document.querySelector('#fo-m').disabled);
    fill({ '#fo-l': 'Standard fee (2025 learners)' }); reason('Clearer label');
    ok('R1 legacy option: the label can be edited; fee and mode stay legacy', r1Opt('L3-FO-STD').label === 'Standard fee (2025 learners)' && r1Opt('L3-FO-STD').fee === null && r1Opt('L3-FO-STD').mode === null);
    ACT.r1OptRetire({ dataset: { id: b } }); reason('Withdrawn');
    ok('R1 retire: status Retired, audited, not editable', r1Opt(b).status === 'Retired' && ADMIN.audit[0].action === 'Fee option retired' && !r1Eligible().includes(r1Opt(b)));
    go('a-finance', { tab: 'plans' }); ok('R1 card also on Super Admin → Finance → Instalment plans', !!app().querySelector('.r1-opts') && /Retired/.test(app().querySelector('.r1-opts').textContent));
    // Negative roles: Academic Admin, Business Admin, System Admin (not a plan owner), a learner calling the handler
    const before = JSON.stringify(R1());
    acaEnter('KA'); S.signedIn = true; go('a-finance', { tab: 'plans' }); ACT.r1OptAdd(); ok('R1 (negative) Academic Admin: no dialog, refused and audited', !MODAL && ADMIN.audit[0].action === 'Blocked: add a fee option');
    ACT.r1OptRetire({ dataset: { id: a } }); ok('R1 (negative) Academic Admin can\'t retire by a direct call', r1Opt(a).status === 'Active');
    learner('A'); ACT.r1OptEdit({ dataset: { id: a } }); ok('R1 (negative) a learner calling the handler is refused', !MODAL);
    ok('R1 (negative) nothing changed by refused calls', JSON.stringify(R1()) === before);
  });

  await T('R1 sign-up: eligible options shown, one chosen, terms frozen; later edits never reprice', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced — standard', 600, 'Self-Paced'), fa = optAdd('Fully Assisted — plus', 1200, 'Fully Assisted'), gone = optAdd('Old offer', 900, 'Self-Paced');
    ACT.r1OptRetire({ dataset: { id: gone } }); reason('Ended');
    learner('A'); go('browse'); ok('R1 Browse: "From" the lowest eligible option (£600)', /From £600/.test(main()) || CATALOGUE.find(x => x.title === T3).price === 600);
    ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq' && x.title === T3).id } });
    const shown = [...document.querySelectorAll('input[name="r1-opt"]')].map(x => x.value);
    ok('R1 dialog: every eligible option (active, reconciling) and no retired one', shown.length === 3 && shown.includes('L3-FO-STD') && shown.includes(sp) && shown.includes(fa) && !shown.includes(gone));
    ok('R1 dialog: with several options none is preselected', !document.querySelector('input[name="r1-opt"]:checked'));
    ok('R1 (negative) starting without a choice is refused', prim() === false && !W.signup); closeModal();
    const d = apply3('A', sp);
    ok('R1 chosen: option, mode and £600 frozen with the plan deposit / instalments; audited', d.signup.plan.opt.id === sp && d.signup.plan.opt.mode === 'Self-Paced' && d.signup.plan.fee === 600 && d.signup.plan.deposit === 300 && d.signup.plan.inst === 6 && Object.isFrozen(d.signup.plan) && Object.isFrozen(d.signup.plan.opt) && d.nvq.dmode === 'Self-Paced' && ADMIN.audit.some(a => a.action === 'Fee option chosen' && a.after.startsWith(sp)));
    go('admission'); finish(d, 'instalment');
    const pl = d.plans.find(p => p.e === 'nvq');
    ok('R1 payment plan: £600 total, 6 × £100, option recorded on the plan', pl.total === 600 && pl.rows.length === 6 && pl.rows[0].amount === 100 && pl.feeOpt.id === sp && pl.feeOpt.mode === 'Self-Paced');
    const u = apply3('F', fa); finish(u, 'deposit');
    ok('R1 a second learner on another option: £1,200, deposit £300, balance £900, Fully Assisted', u.signup.plan.opt.id === fa && u.admission.deposit.min === 300 && u.plans.find(p => p.e === 'nvq').rows[0].amount === 900 && r1ModeOfW(u) === 'Fully Assisted');
    const snapD = JSON.stringify([d.signup.plan, d.plans]), snapU = JSON.stringify([u.signup.plan, u.plans]);
    SA(); ACT.r1OptEdit({ dataset: { id: sp } }); fill({ '#fo-f': '660', '#fo-m': 'Fully Assisted' }); reason('Price rise');
    ACT.r1OptRetire({ dataset: { id: fa } }); reason('Withdrawn');
    ok('R1 no repricing: editing / retiring options leaves enrolled learners\' option, mode, fee and plan unchanged', JSON.stringify([d.signup.plan, d.plans]) === snapD && JSON.stringify([u.signup.plan, u.plans]) === snapU && r1ModeOfW(d) === 'Self-Paced');
    ok('R1 no repricing: Aisha and Priya unchanged', STORE.worlds.C.signup.plan.fee === 2400 && STORE.worlds.B.signup.plan.fee === 2400);
    SA(); go('a-admissions', { id: 'APP-A' }); ok('R1 Admissions: the application shows the chosen option', /Fee option L3-FO-\d{3} — Self-Paced — standard\s*·\s*Self-Paced\s*·\s*£600\.00/.test(main()), (main().match(/Fee option.{0,80}/) || ['none: ' + main().slice(0, 200)])[0]);
    ok('R1 agency list price (NVQ_FEES) is not changed by options', NVQ_FEES[T3] === 2400);
  });

  await T('R1 persistence and edge cases: rebuilds, identity switches, one option, no eligible option', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced — standard', 600, 'Self-Paced'); const d = apply3('A', sp);
    rebuildA(); FA(); SA();
    ok('R1 persistence: options and the learner\'s frozen choice survive admin rebuilds and identity switches', !!r1Opt(sp) && r1Opt(sp).fee === 600 && STORE.worlds.A.signup.plan.opt.id === sp);
    fresh(); learner('A'); const d1 = apply3('A');
    ok('R1 one eligible option (seed): preselected, sign-up as before (£2,400, mode from the batch)', d1.signup && d1.signup.plan.opt.id === 'L3-FO-STD' && d1.signup.plan.fee === 2400 && r1ModeOfW(d1) === null);
    fresh(); SA(); ACT.r1OptRetire({ dataset: { id: 'L3-FO-STD' } }); reason('Only options from now on');
    learner('A'); const d2 = apply3('A');
    ok('R1 no eligible option: sign-up still starts, payment shows "needs configuration" (S4a behaviour)', d2.signup && !!d2.signup.plan.issue);
    fresh(); ok('R1 demo reset restores the seed', r1Opts().length === 1 && r1Opts()[0].status === 'Active');
  });

  /* ================= R2 — mixed-mode batches and session audiences ================= */
  const MIXB = 'L3AC-NOV26-LEI'; // a Level 3 batch with places (L3AC-NOV26 is full, so payment would move the learner on)
  // Session through the Add session modal; aud: undefined (leave the default — every active option ticked) or the exact option IDs to tick
  const sessAdd = (code, o) => { ACT.addSession({ dataset: { b: code } }); if (!MODAL) return null; fill({ '#se-n': o.t, '#se-d': o.at.slice(0, 16), '#se-m': String(o.mins || 60) }); document.querySelector('#se-t').value = o.teacher || 'Marcus Bell';
    if (o.aud) document.querySelectorAll('.r2-g').forEach(x => { x.checked = o.aud.includes(x.value); }); // unified selector: exactly these ticks
    let r = prim(), n = 0; while (r === false && MODAL && n++ < 3 && !/Tick at least one/.test(mroot().textContent)) r = prim(); if (r === false) return false; if (MODAL) closeModal(); return s4bAllSess().filter(s => s.title === o.t).pop(); };
  const audEdit = (s, aud, why = 'Audience change') => { ACT.s4bSessEdit({ dataset: { id: s.id } }); if (aud) document.querySelectorAll('.r2-g').forEach(x => { x.checked = aud.includes(x.value); }); else ACT.r2AudAll(); /* unified selector: null = Select all */ fill({ '#se-r': why }); let r = prim(), n = 0; while (r === false && MODAL && n++ < 3) r = prim(); if (MODAL) closeModal(); return r; };
  // Two learners on different options in the same Level 3 batch
  const mixSetup = () => {
    fresh(); SA(); const sp = optAdd('Self-Paced — standard', 600, 'Self-Paced'), fa = optAdd('Fully Assisted — plus', 1200, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB);
    const d = apply3('A', sp); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b);
    // a legacy learner in the same batch: added with Add learner and the standard (legacy) group — their mode is the batch's
    SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = 'L3-FO-STD'; const lg = document.querySelector('#ab-l').value; prim(); closeModal();
    return { sp, fa, b, d, f, lg };
  };
  const evIds = w => (w.events || []).map(e => e.id);
  const has = (w, s) => evIds(w).includes(s.id) || evIds(w).includes('bs-' + s.id);

  await T('R2 mixed batch: learners keep their own mode; the batch shows its composition', async () => {
    const { sp, fa, b, d, f, lg } = mixSetup();
    ok('R2 one Level 3 batch holds a Self-Paced and a Fully Assisted learner', d.signup.batch === MIXB && f.signup.batch === MIXB && r2ModeOfW(d) === 'Self-Paced' && r2ModeOfW(f) === 'Fully Assisted', [d.signup.batch, f.signup.batch, r2ModeOfW(d), r2ModeOfW(f), d.signup.done, f.signup.done, d.signup.step, f.signup.step, JSON.stringify(d.signup.plan.opt)].join('|'));
    ok('R2 the batch\'s delivery mode stays its default (not overwritten); the batch is mixed', b.dmode === 'Fully Assisted' && r2IsMixed(b) && r2Mix(b)['Self-Paced'] === 1);
    ok('R2 legacy learners (no own mode) keep the batch\'s mode', r2LidInfo(lg, MIXB).mode === 'Fully Assisted' && r2LidInfo(lg, MIXB).group === 'L3-FO-STD' && b.roster.some(r => r[1] === lg));
    go('a-batches', { id: MIXB }); ok('R2 batch detail: learners by mode and "Mixed batch"', /Learners by delivery mode/.test(main()) && /Self-Paced 1/.test(main()) && /Mixed batch/.test(main()));
    go('a-batches'); const row = [...app().querySelectorAll('main tr')].find(r => r.textContent.includes(MIXB)); ok('R2 batch list marks the batch Mixed', !!row && /Mixed/.test(row.textContent));
    ok('R2 class plan: both patterns are available in the mixed batch', n3Kinds(b).join() === 'weekly,limited');
    go('a-batches', { id: MIXB, tab: 'schedule' }); ok('R2 Schedule tab shows the weekly recurring classes and the limited Self-Paced plan', /Weekly recurring classes/.test(main()) && /Limited classes \(Self-Paced\)/.test(main()) && !!app().querySelector('[data-act="n3Weekly"][data-w="new"]'));
    learner('A'); go('course', { id: 'nvq' }); ok('R2 learner overview: Daniel sees his own mode (Self-Paced), not the batch\'s', /Self-Paced/.test((app().querySelector('.n2-mode') || {}).textContent || '') && /Your own delivery mode/.test(main()));
    learner('F'); go('course', { id: 'nvq' }); ok('R2 learner overview: Fatima sees Fully Assisted', /Fully Assisted/.test((app().querySelector('.n2-mode') || {}).textContent || ''));
    const pure = ADMIN.batches.find(x => x.code === 'L3AC-DEC26-AUH'); ok('R2 a single-mode Level 3 batch: weekly plans; the limited plan too, because the programme sells a Self-Paced option', n3Kinds(pure).join() === 'weekly,limited' && !r2IsMixed(pure));
  });

  await T('R2 targeted session: visibility, Zoom access, invitations, register — the same rule everywhere', async () => {
    const { sp, fa, b, d, f, lg } = mixSetup(); const n0d = d.notifs.length, n0f = f.notifs.length;
    ACT.addSession({ dataset: { b: MIXB } }); ok('R2 Add session (Level 3 batch): every fee option of the programme as its own checkbox, all ticked by default; no whole-mode checkbox, no radio choice', !!document.querySelector('.r2-aud') && !!document.querySelector(`.r2-g[value="${sp}"]:checked`) && !!document.querySelector(`.r2-g[value="${fa}"]:checked`) && document.querySelectorAll('.r2-g:checked').length === document.querySelectorAll('.r2-g').length && !document.querySelector('.r2-g[value^="mode:"]') && !document.querySelector('input[name="r2-aud"]')); // unified selector (old: "All participants" radio)
    ACT.r2AudNone(); fill({ '#se-n': 'Empty audience' }); ok('R2 (negative) a session with nothing ticked is refused', prim() === false && !s4bAllSess().some(s => s.title === 'Empty audience')); closeModal();
    const s = sessAdd(MIXB, { t: 'SP check-in', at: D(3, '17:00'), aud: [sp] });
    ok('R2 session saved with its audience (option group), audited', !!s && JSON.stringify(s.aud) === JSON.stringify([sp]) && ADMIN.audit.some(a => a.action === 'Session added' && /for: /.test(a.after)));
    ok('R2 visibility: Daniel (in the group) has it on his calendar; Fatima (other group) doesn\'t', has(d, s) && !has(f, s));
    learner('F'); go('calendar'); ok('R2 visibility: opening the calendar doesn\'t bring it back for Fatima', !has(f, s));
    ok('R2 invitations: Daniel notified; Fatima not', d.notifs.length === n0d + 1 && /Session added/.test(d.notifs[0].title) && f.notifs.length === n0f);
    ACT.joinZoom({ dataset: { id: 'bs-' + s.id } }); ok('R2 Zoom access (negative): Fatima calling join directly gets no link', !MODAL);
    learner('A'); ACT.joinZoom({ dataset: { id: 'bs-' + s.id } }); ok('R2 Zoom access: Daniel gets the meeting link', !!MODAL && /Zoom \(simulated\)/.test(mroot().innerHTML)); closeModal();
    ok('R2 register eligibility: Daniel only — no Fully Assisted or legacy learner', n4Eligible(s).includes(d.me.id) && !n4Eligible(s).includes(f.me.id) && !n4Eligible(s).includes(lg));
    SA(); const m = sessAdd(MIXB, { t: 'FA workshop', at: D(4, '10:00'), aud: [fa, 'L3-FO-STD'] }); // the Fully Assisted option and the standard fee (whose learners follow this Fully Assisted batch)
    ok('R2 Fully Assisted option + standard fee: Fatima and the legacy learner, not Daniel', has(f, m) && !has(d, m) && n4Eligible(m).includes(f.me.id) && n4Eligible(m).includes(lg) && !n4Eligible(m).includes(d.me.id));
    const both = sessAdd(MIXB, { t: 'Joint review', at: D(5, '10:00'), aud: [sp, fa] });
    ok('R2 several groups and both modes in one session', has(d, both) && has(f, both) && !n4Eligible(both).includes(lg));
    const all = sessAdd(MIXB, { t: 'Whole batch', at: D(6, '10:00') });
    ok('R2 default (every option ticked) = everyone in the batch now; stored as the explicit option IDs (unified selector; old: null)', r2Same(all.aud, r2AudGroups(b).filter(o => o.status === 'Active').map(o => o.id)) && has(d, all) && has(f, all) && n4Eligible(all).length === new Set(n4BatchLids(MIXB)).size && n4Eligible(all).includes(lg));
    ACT.addSession({ dataset: { b: 'L2DC-MAR26' } }); ok('R2 non-Level 3 batch: no audience choice', !document.querySelector('.r2-aud')); closeModal();
  });

  await T('R2 audience change: access and calendars removed, attendance kept, never marked absent; cancellation', async () => {
    const { sp, fa, b, d, f, lg } = mixSetup();
    const s = sessAdd(MIXB, { t: 'Started SP class', at: D(0, '00:01'), mins: 480, aud: [sp] });
    ACT.n4Import({ dataset: { s: s.id } }); const reg = N4().regs[s.id];
    ok('R2 import: only the audience is on the register; Fatima isn\'t marked absent', !!reg && Object.keys(reg.rows).includes(d.me.id) && !reg.rows[f.me.id] && !reg.rows[lg]);
    const dRow = JSON.stringify(reg.rows[d.me.id]), nd = d.notifs.length;
    ok('R2 audience edit offers the current selection', (ACT.s4bSessEdit({ dataset: { id: s.id } }), !!document.querySelector(`.r2-g[value="${sp}"]:checked`))); closeModal();
    audEdit(s, [fa], 'Now for the Fully Assisted plus group');
    ok('R2 audience changed: saved, history and audit with the reason', JSON.stringify(s.aud) === JSON.stringify([fa]) && s.hist[0][2] === 'Audience changed' && ADMIN.audit.some(a => a.action === 'Session audience changed' && a.reason === 'Now for the Fully Assisted plus group'));
    ok('R2 removed learner: off Daniel\'s calendar, told once; added learner (Fatima) has it', !has(d, s) && d.notifs.length === nd + 1 && /removed from your timetable/.test(d.notifs[0].title) && has(f, s));
    learner('A'); ACT.joinZoom({ dataset: { id: 'bs-' + s.id } }); ok('R2 removed learner loses Zoom access', !MODAL);
    SA(); ACT.n4Import({ dataset: { s: s.id } });
    ok('R2 Daniel\'s earlier attendance is kept unchanged; re-import never marks him absent', JSON.stringify(N4().regs[s.id].rows[d.me.id]) === dRow && N4().regs[s.id].rows[d.me.id].status !== 'Absent');
    ok('R2 Fatima (now in the audience) is on the register', !!N4().regs[s.id].rows[f.me.id]);
    ACT.n4Set({ dataset: { s: s.id, l: d.me.id } }); ok('R2 (negative) no new attendance can be recorded for the excluded learner', !MODAL && /Blocked: record attendance/.test(ADMIN.audit[0].action));
    go('a-attendance', { id: s.id }); const regHtml = n4RegisterHtml(s);
    ok('R2 register: audience shown; Daniel under "no longer taking part", read-only', /Audience: <strong>£1,200\.00 — Fully Assisted — plus/.test(regHtml) && /audience no longer includes their group/.test(regHtml) && /n4-past[\s\S]*IA-L/.test(regHtml));
    const t2 = sessAdd(MIXB, { t: 'To cancel', at: D(7, '10:00'), aud: [fa] }); const nd2 = d.notifs.length, nf2 = f.notifs.length;
    const ev = batchEvents(b).find(e => e.id === t2.id); ACT.s4bSessCancel({ dataset: { b: MIXB, id: t2.id } }); reason('Teacher unavailable');
    ok('R2 cancellation notices go to the audience only', f.notifs.length === nf2 + 1 && /cancelled/i.test(f.notifs[0].title) && d.notifs.length === nd2);
    learner('F'); go('calendar'); const fe = f.events.find(e => e.id === 'bs-' + t2.id);
    ok('R2 cancelled class: stays on the calendar as cancelled, no Join button, join refused', !!fe && fe.cancelled && !/joinZoom/.test(joinBtn(fe)) && (ACT.joinZoom({ dataset: { id: fe.id } }), !MODAL));
    SA(); audEdit(s, null, 'Everyone again'); ok('R2 Select all again: every option ticked (explicit list); Daniel has it again', Array.isArray(s.aud) && s.aud.includes(sp) && s.aud.includes(fa) && has(d, s));
  });

  await T('R2 class plans in a mixed batch; historical sessions; roster groups; persistence', async () => {
    const { sp, fa, b, d, f, lg } = mixSetup();
    const n0 = s4bSess(MIXB).length; const r = (ACT.n3Weekly({ dataset: { b: MIXB } }), !!MODAL); closeModal();
    ok('R2 the weekly plan opens for the mixed batch', r);
    ACT.n3Weekly({ dataset: { b: MIXB } }); const set = { '#n3-wd': 'Thursday', '#n3-t': '18:00', '#n3-m': '60', '#n3-te': 'Marcus Bell', '#n3-f': b.start.slice(0, 10), '#n3-to': new Date(new Date(b.start).getTime() + 21 * DAY).toISOString().slice(0, 10), '#n3-n': 'Weekly FA class', '#n3-r': 'Mixed batch timetable' }; Object.entries(set).forEach(([k, v]) => { document.querySelector(k).value = v; });
    document.querySelectorAll('#modal-root .r2-g').forEach(x => { x.checked = x.value === fa; }); // this plan: the Fully Assisted option only
    const nd = d.notifs.length, nf = f.notifs.length; prim(); prim(); if (MODAL) closeModal();
    const gen = s4bSess(MIXB).filter(s => s.gen && s.title === 'Weekly FA class');
    ok('R2 weekly classes generated for the ticked fee option (Fully Assisted): Fatima yes, Daniel no; plan and classes store the option ID', gen.length >= 2 && gen.every(s => has(f, s) && !has(d, s)) && gen.every(s => r2Same(s.aud, [fa]) && s.n3w === '1') && r2Same(n3Plan(MIXB).aud, [fa]), [gen.length, s4bSess(MIXB).length - n0, gen.map(s => has(f, s) + '/' + has(d, s)).join(), (gen[0] && r2AudTxt(gen[0])), b.start, b.end].join(' | '));
    ok('R2 weekly-plan notice reaches Fatima, not Daniel', f.notifs.length === nf + 1 && d.notifs.length === nd);
    ACT.n3Target({ dataset: { b: MIXB } }); fill({ '#n3-c': '2' }); reason('Two SP classes');
    ok('R2 the Self-Paced plan doesn\'t count the weekly Fully Assisted classes', n3SpClasses(MIXB).every(s => !s.gen) && /0 of 2|Incomplete/.test(n3SpState(b).label));
    go('a-batches', { id: MIXB, tab: 'schedule' }); const addBtn = app().querySelector('.n3-plan [data-act="addSession"]');
    ok('R2 "Add a class" on the Self-Paced card proposes the programme\'s Self-Paced fee options', !!addBtn && addBtn.dataset.aud === sp);
    ACT.addSession({ dataset: { b: MIXB, aud: sp } }); fill({ '#se-n': 'SP class 1', '#se-d': D(9, '12:00').slice(0, 16), '#se-m': '60' }); let x = prim(); if (x === false) prim(); closeModal();
    const sp1 = s4bAllSess().find(s => s.title === 'SP class 1');
    ok('R2 that class is for the Self-Paced learners and counts for the plan', JSON.stringify(sp1.aud) === JSON.stringify([sp]) && has(d, sp1) && !has(f, sp1) && n3SpClasses(MIXB).some(s => s.id === sp1.id));
    // Historical sessions: unchanged, all participants
    ok('R2 historical sessions stay all-participant (no audience stored, everyone eligible)', ['ss-1', 'ss-2', 'ss-3'].every(id => { const s = s4bSessById(id); return s && s.aud === undefined && r2AudTxt(s) === 'All learners' && n4Eligible(s).length === Array.from(new Set(s4bCodesOf(s).flatMap(n4BatchLids))).length; }));
    // Add learner to a Level 3 batch with a fee-option group
    ACT.addToBatch({ dataset: { id: 'L3AC-FEB27-AUH' } }); ok('R2 Add learner (Level 3 batch) asks for the fee-option group', !!document.querySelector('#r2-ab-o'));
    const lb = ADMIN.batches.find(x => x.code === 'L3AC-FEB27-AUH'); document.querySelector('#r2-ab-o').value = sp; const lid = document.querySelector('#ab-l').value; prim(); closeModal();
    ok('R2 roster learner recorded with the group (no fee created); their mode follows it', lb.r2 && lb.r2[lid] && lb.r2[lid].opt === sp && r2LidInfo(lid, lb.code).mode === 'Self-Paced' && r2Mix(lb)['Self-Paced'] === 1 && ADMIN.audit.some(a => a.action === 'Fee-option group recorded'));
    const st = sessAdd('L3AC-FEB27-AUH', { t: 'AUH SP class', at: D(8, '10:00'), aud: [sp] }); ok('R2 register eligibility for the roster learner follows the group', n4Eligible(st).join() === lid);
    rebuildA(); FA(); SA();
    ok('R2 persistence: audiences, roster groups and calendars survive rebuilds and identity switches', JSON.stringify(s4bSessById(sp1.id).aud) === JSON.stringify([sp]) && ADMIN.batches.find(x => x.code === 'L3AC-FEB27-AUH').r2[lid].opt === sp && has(d, sp1) && !has(f, sp1));
    acaEnter('KA'); S.signedIn = true; FA(); ACT.addSession({ dataset: { b: MIXB } }); ok('R2 (negative) Finance can\'t add sessions (unchanged S4b rule)', !MODAL);
  });

  /* ================= R3 — criterion judgements and the Assessor's final outcome ================= */
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const rsn = r => { const t = document.querySelector('#rsn'); if (t) t.value = r; };
  // Sarah (A) marks a live submission she is the allocated assessor for
  const liveSub = () => { TCH('A'); return tasSubs(true).find(x => x.live && x.toMark && markable(tasAsg(x)).length >= 1); };
  const sendAll = (s, item) => { const d = dft(s.key); markable(tasAsg(s)).forEach(q => { d.items[q.id] = { ...item }; }); ACT.mkRelease({ dataset: { k: s.key } }); prim(); };
  // (the release confirmation navigates back to the Release queue on a 0 ms timer — let it run so it doesn't fire in a later test)
  const relAs = async (coo, key) => { COO(coo); ACT.relOne({ dataset: { k: key } }); prim(); await wait(20); };
  const declare = (key, res, r = 'Assessed against the brief') => { ACT.r3Declare({ dataset: { k: key } }); if (!MODAL) return false; if (res) { const x = document.querySelector(`input[name="r3-res"][value="${res}"]`); if (x) x.checked = true; } rsn(r); return press(); };

  await T('R3 Assessor judgements: Met / Partially Met / Not Met, recorded with evaluator, role, time, assignment, criterion and round', async () => {
    fresh(); const s = liveSub(); ok('R3 a live submission allocated to Sarah', !!s); if (!s) return;
    const a = tasAsg(s), q = markable(a)[0];
    go('t-mark', { id: s.key }); const vals = [...document.querySelectorAll('main [data-act="mkMet"]')].map(b => b.dataset.v);
    ok('R3 workspace offers Met, Partially Met and Not Met', vals.join() === 'Met,Partially Met,Not Met');
    ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Partially Met' } });
    const j = r3Judg(s.key).slice(-1)[0];
    ok('R3 judgement recorded: evaluator, role, date / time, assignment, criterion, round; not yet released', j && j.value === 'Partially Met' && j.by === 'Sarah Okonkwo' && j.role === 'Assessor' && !!j.at && j.aid === a.id && j.crit === q.crit && j.round === (a.round || 'Sub 1') && j.published === false);
    go('t-mark', { id: s.key }); ok('R3 Partially Met can\'t be verified (no Verify button)', !app().querySelector('main [data-act="mkVerify"]') && dft(s.key).items[q.id].met === 'Partially Met');
    ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Met' } }); ok('R3 a later judgement is added, the earlier one kept', r3Judg(s.key).filter(x => x.crit === q.crit).map(x => x.value).join() === 'Partially Met,Met');
    ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Excellent' } }); ok('R3 (negative) an unknown judgement value is refused', r3Judg(s.key).length === 2);
    TCH('S'); const n = r3Judg(s.key).length; ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Not Met' } });
    ok('R3 (negative) another Assessor (not allocated) can\'t judge by a direct call — refused, logged, nothing changes', r3Judg(s.key).length === n && dft(s.key).items[q.id].met === 'Met' && ADMIN.security.some(x => /record a criterion judgement/.test(x.detail)));
    TCH('T'); ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Not Met' } }); ok('R3 (negative) a Teacher can\'t judge by a direct call', dft(s.key).items[q.id].met === 'Met');
    COO('A'); INP.mkExit({ dataset: { k: s.key, q: q.id }, value: 'pass' }); ok('R3 (negative) marking handlers refuse the Coordinator portal (action-level check)', !(dft(s.key).items[q.id].exit));
  });

  await T('R3 G6.4 superseded: release never completes or passes; judgements published with the release', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('R3 live submission', false); const a = tasAsg(s), w = STORE.worlds[s.L.v];
    sendAll(s, { exit: 'pass', rag: 'G', fb: 'Good.', met: 'Met', verified: true, vby: 'Sarah Okonkwo', vat: now().toISOString() });
    const rounds0 = JSON.stringify(a.qs.map(q => q.rounds.length)), used0 = a.resubUsed;
    await relAs('A', s.key);
    ok('R3 all answers Passed and verified → status "Feedback Received", not "Completed" (no automatic Pass)', a.status === 'Feedback Received' && !r3Out(s.key));
    ok('R3 verified evidence still locks the criterion on release (unchanged)', markable(a).length === 0 && a.qs.every(q => q.state !== 'open' || !q.rounds.length));
    ok('R3 the Assessor\'s judgements are published with the release', r3Judg(s.key).filter(j => j.role === 'Assessor').length >= 1 && r3Judg(s.key).filter(j => j.role === 'Assessor').every(j => j.published && j.pubAt));
    ok('R3 rounds and attempts unchanged by release', JSON.stringify(a.qs.map(q => q.rounds.length)) === rounds0 && a.resubUsed === used0);
    learner(s.L.v); go('assignment', { id: a.id }); ok('R3 learner sees the released criterion judgements (Assessor)', /Feedback on each criterion/.test(main()) && /Assessor ·/.test(app().querySelector('.r3-learner').textContent));
    ok('R3 learner sees no final outcome', !app().querySelector('main .r3-out') && !/Final assignment outcome/.test(main()));
  });

  await T('R3 Coordinator criterion feedback: published to the learner straight away; both people\'s judgements kept', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('R3 live submission', false); const a = tasAsg(s), w = STORE.worlds[s.L.v], q = markable(a)[0];
    ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Met' } });
    COO('A'); go('c-sub', { id: s.key }); ok('R3 Coordinator submission page: criterion judgement panel with all three values', !!app().querySelector('.r3-coo') && [...document.querySelectorAll(`#r3-cv-${q.id} option`)].map(o => o.value).join() === ',Met,Partially Met,Not Met');
    ok('R3 Coordinator page: no control to declare the outcome', !app().querySelector('[data-act="r3Declare"]') && /Only the learner's allocated Assessor declares it/.test(main()));
    document.querySelector('#r3-cv-' + q.id).value = 'Partially Met'; ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } });
    ok('R3 (negative) feedback text is required', !r3Judg(s.key).some(j => j.role === 'Academic Coordinator'));
    const st0 = a.status, n0 = w.notifs.length; document.querySelector('#r3-cv-' + q.id).value = 'Partially Met'; document.querySelector('#r3-ct-' + q.id).value = 'Explain the second part of the criterion.'; ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } });
    const cj = r3Judg(s.key).find(j => j.role === 'Academic Coordinator');
    ok('R3 Coordinator judgement: evaluator, role, time, criterion, round; published at once', cj && cj.by === 'Dr Helen Carter' && cj.value === 'Partially Met' && cj.published && cj.crit === q.crit && cj.round && cj.aid === a.id);
    ok('R3 learner notified; status, marking and outcome unchanged', w.notifs.length === n0 + 1 && /Coordinator/.test(w.notifs[0].title) && a.status === st0 && dft(s.key).items[q.id].met === 'Met' && !r3Out(s.key));
    ok('R3 audit: published by the Coordinator, with the text', ADMIN.audit.some(x => x.action === 'Criterion judgement published' && x.role === 'Academic Coordinator' && /Partially Met/.test(x.after)));
    ok('R3 both judgements kept side by side (Assessor\'s unreleased one stays staff-only)', r3Latest(s.key, q.crit, 'Assessor').value === 'Met' && !r3Latest(s.key, q.crit, 'Assessor').published && r3Latest(s.key, q.crit, 'Academic Coordinator').value === 'Partially Met');
    learner(s.L.v); go('assignment', { id: a.id }); const lc = (app().querySelector('.r3-learner') || {}).textContent || '';
    ok('R3 learner sees the Coordinator\'s judgement and feedback (not the unreleased Assessor one)', /Partially Met/.test(lc) && /Coordinator · Dr Helen Carter/.test(lc) && /Explain the second part/.test(lc) && !/Assessor ·/.test(lc));
    COO('B'); const n1 = r3Judg(s.key).length; ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } });
    ok('R3 (negative) a Coordinator of another batch is refused (logged)', r3Judg(s.key).length === n1 && ADMIN.security.some(x => /publish a criterion judgement/.test(x.detail)));
    TCH('A'); ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } }); ok('R3 (negative) the Coordinator action is refused outside the Coordinator portal', r3Judg(s.key).length === n1);
  });

  await T('R3 final outcome: only the allocated, Active Assessor; every other role refused at the action', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('R3 live submission', false); const a = tasAsg(s), w = STORE.worlds[s.L.v];
    go('t-mark', { id: s.key }); ok('R3 workspace: final outcome card with Declare (allocated Assessor)', !!app().querySelector('.r3-out [data-act="r3Declare"]') && /Not declared/.test(app().querySelector('.r3-out').textContent));
    const tryAs = (who, enter) => { enter(); const n = ADMIN.security.length; ACT.r3Declare({ dataset: { k: s.key } }); const opened = !!MODAL; closeModal(); return !opened && !r3Out(s.key) && ADMIN.security.length > n; };
    ok('R3 (negative) Academic Coordinator (portal) refused, logged', tryAs('coo', () => COO('A')));
    ok('R3 (negative) Coordinator + Teacher multi-role user refused', tryAs('cooC', () => COO('C')));
    ok('R3 (negative) Teacher-only refused', tryAs('T', () => TCH('T')));
    ok('R3 (negative) another Assessor (not allocated) refused', tryAs('S', () => TCH('S')));
    ok('R3 (negative) Teacher + Assessor + Coordinator multi-role user (not allocated) refused', tryAs('M', () => TCH('M')));
    ok('R3 (negative) Super Administrator (admin portal) refused', tryAs('SA', () => SA()));
    ok('R3 (negative) IQA refused', tryAs('IQA', () => { role('iqa'); }));
    ok('R3 (negative) Academic Admin refused', tryAs('KA', () => { acaEnter('KA'); S.signedIn = true; }));
    const acc = ADMIN.staff.find(x => x.name === 'Sarah Okonkwo'), st0 = acc.status; acc.status = 'Suspended';
    ok('R3 (negative) the allocated Assessor with a suspended account is refused', tryAs('A-susp', () => TCH('A'))); acc.status = st0;
    TCH('A'); const snap = JSON.stringify([a.status, a.resubUsed, a.resubMax, a.qs.map(q => [q.rounds.length, q.fb.length, q.state]), w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code + c.st + !!c.lock))))]);
    ACT.r3Declare({ dataset: { k: s.key } }); rsn('x'); ok('R3 (negative) Pass or Fail must be chosen', press() === false && !r3Out(s.key)); closeModal();
    declare(s.key, 'Fail', 'Key criteria not evidenced');
    const o = r3Out(s.key);
    ok('R3 Fail declared by Sarah (Assessor): result, round, time, rationale; audited', o && o.result === 'Fail' && o.by === 'Sarah Okonkwo' && o.role === 'Assessor' && o.round === (a.round || 'Sub 1') && o.note === 'Key criteria not evidenced' && ADMIN.audit.some(x => x.action === 'Final outcome declared' && /Fail/.test(x.after)));
    ok('R3 a Fail erases nothing, resets no attempt and opens no new attempt (status, rounds, feedback, criteria, locks unchanged)', JSON.stringify([a.status, a.resubUsed, a.resubMax, a.qs.map(q => [q.rounds.length, q.fb.length, q.state]), w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code + c.st + !!c.lock))))]) === snap);
    ACT.r3Declare({ dataset: { k: s.key } }); ok('R3 (negative) the outcome can\'t be re-declared or changed in the same round', !MODAL && r3Out(s.key).result === 'Fail');
    COO('A'); go('c-sub', { id: s.key }); ok('R3 Coordinator sees the declared outcome read-only', /Fail[\s\S]*declared by Sarah Okonkwo, Assessor/.test(app().querySelector('.r3-cooout').textContent) && /Final outcome/.test(app().querySelector('.r3-csum').textContent));
    SA(); go('a-records'); ok('R3 Assessment Records list the declared outcome', /Final assignment outcomes declared/.test(main()) && /Fail/.test(app().querySelector('.r3-recs').textContent));
    learner(s.L.v); go('assignment', { id: a.id }); ok('R3 the learner isn\'t shown the outcome (publication not confirmed — provisional)', !/Final assignment outcome/.test(main()) && !app().querySelector('main .r3-out'));
    ok('R3 the agency Pass / Fail (course level) is not derived from the assignment outcome', typeof passFail === 'function' && passFail({ status: 'Active' }) === '—');
  });

  await T('R3 restricted correction, legacy records, persistence', async () => {
    fresh(); const s = liveSub(); if (!s) return ok('R3 live submission', false); const a = tasAsg(s);
    declare(s.key, 'Pass', 'Meets the brief');
    ACT.tasDC({ dataset: { k: s.key } }); ok('R3 Data Correction offers "Final assignment outcome"', !!document.querySelector('#dc-rec option[value="r3-outcome"]'));
    document.querySelector('#dc-rec').value = 'r3-outcome'; fill({ '#dc-new': 'Pass', '#dc-r': 'Wrong outcome' }); ok('R3 (negative) the correction must change the outcome', prim() === false);
    fill({ '#dc-new': 'Fail' }); const n0 = ADMIN.queue.length; prim(); closeModal(); const dc = ADMIN.queue[0];
    ok('R3 correction raised to the Approvals Queue; the outcome is unchanged until approved', ADMIN.queue.length === n0 + 1 && dc.data && dc.data.r3out && dc.data.r3out.to === 'Fail' && r3Out(s.key).result === 'Pass');
    SA(); for (let k = 0; k < 3 && dc.status !== 'Approved'; k++) { go('a-queue', { id: dc.id }); const acts = [...document.querySelectorAll('main [data-act="qDo"]')].map(b => b.dataset.a); if (!acts.length) break; ACT.qDo({ dataset: { id: dc.id, a: acts.includes('approveFinal') ? 'approveFinal' : acts[0] } }); rsn('Checked'); prim(); closeModal(); }
    const o = r3Out(s.key);
    ok('R3 after final approval: outcome corrected, history keeps the original, audited', o.result === 'Fail' && o.corrected && o.hist.length === 2 && o.hist[0][3] === 'Pass' && ADMIN.audit.some(x => x.action === 'Final outcome corrected'));
    // Legacy: Completed assignments keep their status and get no invented Pass
    fresh(); const done = Object.values(STORE.worlds).flatMap(w => (w.assignments || []).filter(x => x.status === 'Completed').map(x => (w.me.id + '~' + x.id)));
    ok('R3 legacy: seeded Completed assignments stay Completed with no outcome recorded (no fabricated Pass)', done.length > 0 && done.every(k => !r3Out(k)) && Object.keys(R3().out).length === 0);
    TCH('A'); const legacy = tasSubs(true).find(x => x.live && x.status === 'Completed'); if (legacy) { go('t-mark', { id: legacy.key }); ok('R3 legacy record in the workspace: "no final outcome recorded (not assumed to be a Pass)"', /isn't assumed to be a Pass/.test(main())); }
    const s2 = liveSub(); declare(s2.key, 'Pass', 'Persistence check'); ACT.mkMet({ dataset: { k: s2.key, q: markable(tasAsg(s2))[0].id, v: 'Not Met' } });
    rebuildA(); FA(); SA(); TCH('S'); TCH('A');
    ok('R3 persistence: outcomes and judgements survive admin rebuilds, identity and persona switches', r3Out(s2.key) && r3Out(s2.key).result === 'Pass' && r3Judg(s2.key).some(j => j.value === 'Not Met'));
  });

  /* ================= R4 — Self-Paced monthly worklists ================= */
  // Two cohort learners of Sarah's batch are on a Self-Paced fee option. The batch record of their group is set the way "Add learner"
  // records it (R2) — the seed has no Self-Paced learners with submissions.
  const spSetup = () => {
    fresh(); SA(); const sp = optAdd('Self-Paced — standard', 600, 'Self-Paced'); const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26');
    const lids = chCohLids(b).filter(l => !Object.values(STORE.worlds).some(w => w.me.id === l)).slice(0, 2); b.r2 = b.r2 || {}; lids.forEach(l => { b.r2[l] = { opt: sp, by: 'R4 test', at: now().toISOString() }; });
    return { sp, b, lids };
  };
  await T('R4 monthly cycle: 15th to the 14th; review from the 15th', async () => {
    const c1 = r4Cycle('2026-10-14T10:00:00Z'), c2 = r4Cycle('2026-10-15T08:00:00Z'), c3 = r4Cycle('2027-01-10T12:00:00Z');
    ok('R4 14 Oct belongs to 15 Sep – 14 Oct; its review starts 15 Oct', c1.key === '2026-09' && c1.start.slice(0, 10) === '2026-09-15' && c1.end.slice(0, 10) === '2026-10-14' && c1.review.slice(0, 10) === '2026-10-15');
    ok('R4 15 Oct starts the next period (15 Oct – 14 Nov)', c2.key === '2026-10' && c2.end.slice(0, 10) === '2026-11-14');
    ok('R4 year boundary: 10 Jan 2027 is in 15 Dec 2026 – 14 Jan 2027', c3.key === '2026-12' && c3.start.slice(0, 10) === '2026-12-15' && c3.end.slice(0, 10) === '2027-01-14');
  });

  await T('R4 Assessor worklist: Self-Paced view, filters, no deadline / escalation wording, nothing gated', async () => {
    const { sp, b, lids } = spSetup(); TCH('A'); const subs = tasSubs();
    const spRows = subs.filter(s => lids.includes(s.L.lid) && s.at);
    ok('R4 the Self-Paced learners\' submissions are identified (mode and group from their option)', spRows.length > 0 && spRows.every(s => r4IsSP(s) && r4Info(s).group === sp) && subs.filter(s => s.L.batch.code === 'L3AC-JAN26' && !lids.includes(s.L.lid)).every(s => !r4IsSP(s)));
    go('t-queue');
    ok('R4 Marking Queue: Self-Paced monthly worklist summary with the current period and review date', !!app().querySelector('.r4-wl') && /periods run from the 15th to the 14th/.test(main()) && /reviewed from/.test(main()));
    ok('R4 Marking Queue: "Self-Paced (monthly)" view', /Self-Paced \(monthly\)/.test(main()));
    const flt = main(); ok('R4 filters: delivery mode, fee-option group, learner, batch, submission status, monthly cycle', ['Delivery mode', 'Fee-option group', 'Learner', 'Batch', 'Submission status', 'Monthly cycle'].every(x => flt.includes(x)));
    ok('R4 marking chips never claim an escalation', !/escalates to the Super Administrator/.test(app().innerHTML) && !/· overdue|nearing SLA/.test(main()));
    setUi('mqTab', 'sp'); render(); const rows = DT['mq-sp'] ? DT['mq-sp'].rows : [];
    ok('R4 the Self-Paced view lists Self-Paced work only', rows.length > 0 && rows.every(r4IsSP));
    ok('R4 Self-Paced rows show the monthly cycle (no ageing colour)', !!app().querySelector('.r4-sp') && /monthly/.test(app().querySelector('.r4-sp').textContent) && /Monthly cycle/.test(main()));
    const one = spRows.find(s => s.toMark); ok('R4 no marking gate: a Self-Paced submission can be marked at any time', !!one && (go('t-mark', { id: one.key }), !!app().querySelector('[data-act="mkRelease"]:not([disabled])') || markable(tasAsg(one)).length === 0));
    setUi('mqTab', 'all'); go('t-queue'); ok('R4 Fully Assisted rows keep their days-waiting chip (no escalation claim)', !!app().querySelector('.r4-mk') || subs.every(r4IsSP));
    ok('R4 the Approvals Queue still shows its real 7-day escalation wording', /escalates to the Super Administrator|Days since it was raised/.test(_dcR4(6) + _dcR4(8)));
    const mq0 = allQueue().filter(i => /mark/i.test(i.type)).length; SA(); if (ACT.kAdvance) { acaEnter('KA'); S.signedIn = true; ACT.kAdvance(); closeModal(); }
    ok('R4 no delayed-marking escalation: advancing the queue clock creates no marking item', allQueue().filter(i => /mark/i.test(i.type)).length === mq0);
  });

  await T('R4 Coordinator worklist and the learner\'s note; several submissions together', async () => {
    const { sp, b, lids } = spSetup(); COO('A'); go('c-submissions');
    ok('R4 Coordinator Submissions: worklist summary, Self-Paced view, Learner / mode / group / cycle filters', !!app().querySelector('.r4-wl') && /Self-Paced \(monthly\)/.test(main()) && ['Learner', 'Delivery mode', 'Fee-option group', 'Monthly cycle'].every(x => main().includes(x)));
    ok('R4 Coordinator marking chips claim no escalation', !/escalates to the Super Administrator/.test(app().innerHTML));
    go('c-release'); ok('R4 Release queue chips claim no escalation', !/escalates to the Super Administrator/.test(app().innerHTML));
    // Learner side: a Self-Paced sign-up sees the monthly note; a Fully Assisted one doesn't
    SA(); const fa = optAdd('Fully Assisted — plus', 1200, 'Fully Assisted'); const d = apply3('A', sp); finish(d, 'instalment'); const f = apply3('F', fa); finish(f, 'instalment');
    learner('A'); go('assignments'); ok('R4 Self-Paced learner: "submit whenever you\'re ready — several at once"; no monthly deadline', !!app().querySelector('.r4-learner') && /several at once/.test(main()) && /no monthly submission deadline/.test(main()));
    learner('F'); go('assignments'); ok('R4 Fully Assisted learner: no Self-Paced note', !app().querySelector('.r4-learner'));
    // Several assignments submitted together: nothing limits it (no gate was added)
    learner('C'); const two = [W.assignments.find(a => a.status === 'Not Started' && !a.closed), W.assignments.find(a => a.status === 'Resubmission Required' && !a.limit)].filter(Boolean);
    const at = now().toISOString(); two.forEach(a => { a.qs.forEach(q => { for (let i = 0; i < 4; i++) W.drafts[a.id + '.' + q.id + '.' + i] = '<p>Answer.</p>'; }); finaliseSubmit(a, a.status === 'Resubmission Required', at); });
    ok('R4 two assignments (a first submission and a resubmission) submitted together are both accepted — no cycle gate', two.length === 2 && two.every(a => a.status === 'Submitted' && a.submittedAt === at));
  });

  await T('R4 (A) dashboards: Self-Paced work is not reported against the Fully Assisted turnaround', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced — standard', 600, 'Self-Paced'); const b = ADMIN.batches.find(x => x.code === 'L3AC-JAN26');
    // Self-Paced: cohort learners whose submissions have waited more than 5 days (so the old alerts would have listed them)
    COO('A'); const old = mySubmissions().filter(s => s.L.batch.code === 'L3AC-JAN26' && s.status === 'Submitted' && s.waiting > 5 && !s.L.v);
    const spL = [...new Set(old.map(s => s.L.lid))].slice(0, 2); b.r2 = b.r2 || {}; spL.forEach(l => { b.r2[l] = { opt: sp, by: 'R4 test', at: now().toISOString() }; });
    ok('R4 (A) setup: Self-Paced learners with submissions waiting more than 5 days', spL.length > 0, old.length);
    const spNames = mySubmissions().filter(s => spL.includes(s.L.lid)).map(s => s.L.name);
    go('c-dashboard'); const att = main();
    ok('R4 (A) Coordinator dashboard: no "Awaiting marking N days" alert for Self-Paced learners', !spNames.some(n => new RegExp('Awaiting marking \\d+ days: ' + n).test(att)));
    ok('R4 (A) Coordinator dashboard: Self-Paced work shown as the monthly worklist instead', !!app().querySelector('.r4-cdash') && /no marking deadline/.test(app().querySelector('.r4-cdash').textContent));
    const faAged = mySubmissions().filter(s => s.status === 'Submitted' && s.waiting > 5 && !r4IsSP(s));
    ok('R4 (A) Fully Assisted alerts unchanged (still listed)', !faAged.length || /Awaiting marking \d+ days/.test(att));
    go('c-batches', { id: 'L3AC-JAN26', tab: 'pipeline' }); const ag = [...app().querySelectorAll('main section')].find(x => /Aged items/.test(x.textContent));
    ok('R4 (A) batch pipeline "Aged items": Self-Paced work left out, Fully Assisted kept', !!ag && !spNames.some(n => ag.textContent.includes(n)) && (ag.textContent.includes('None.') || faAged.some(s => ag.textContent.includes(s.L.name))));
    go('c-submissions', { tab: 'sp' }); ok('R4 (A) Self-Paced work stays visible in the monthly worklist', (DT['csubs-sp'] ? DT['csubs-sp'].rows : []).some(s => spL.includes(s.L.lid)));
    TCH('A'); go('t-dashboard'); const to = tasSubs().filter(s => s.toMark), fa = to.filter(s => !r4IsSP(s)), spN = to.length - fa.length, kp = [...app().querySelectorAll('main .kpi')];
    const val = l => { const k = kp.find(x => x.textContent.includes(l)); return k ? k.querySelector('.big-num').textContent : null; };
    ok('R4 (A) Assessor: "Due back soon" counts Fully Assisted work only', val('Due back soon') === String(fa.filter(s => s.at && workDaysSince(s.at) >= 8 && workDaysSince(s.at) < 10).length));
    ok('R4 (A) Assessor: "Oldest waiting" is the oldest Fully Assisted submission', val('Oldest waiting') === (fa.length ? Math.max(...fa.map(s => s.waiting || 0)) : 0) + ' days');
    ok('R4 (A) Assessor: a separate "Self-Paced worklist" figure (no turnaround deadline)', spN > 0 && val('Self-Paced worklist') === String(spN) && /no turnaround deadline/.test(kp.find(x => x.textContent.includes('Self-Paced worklist')).textContent));
    ok('R4 (A) no new escalation: no marking item in the Approvals Queue', !allQueue().some(i => /marking/i.test(i.type)));
  });

  await T('R5 (B) one continuous Level 3 learner journey — Daniel Okafor, same identity throughout', async () => {
    fresh(); const LEI = 'L3AC-NOV26-LEI', lb = ADMIN.batches.find(x => x.code === LEI);
    SA(); const sp = optAdd('Self-Paced — monthly', 600, 'Self-Paced'), fa = optAdd('Fully Assisted — weekly', 1200, 'Fully Assisted');
    // existing admin action: the batch gets a Coordinator who has a demo login (audited)
    ACT.changeCoord({ dataset: { id: LEI } }); document.querySelector('#cc-to').value = 'Dr Helen Carter'; reason('Coordinator for the demo journey');
    ok('R5 (B) setup: Dr Helen Carter coordinates the batch (existing audited action); Sarah Okonkwo is its assignment assessor', lb.coord === 'Dr Helen Carter' && chEff('x', 'asg', lb) === 'Sarah Okonkwo');
    // 1–2 choose the Self-Paced option and enrol
    const d = apply3('A', sp); finish(d, 'instalment');
    ok('R5 (B) 1–2 Daniel chose the Self-Paced option; fee and mode fixed; enrolled in his assigned batch', d.signup.plan.opt.id === sp && r2ModeOfW(d) === 'Self-Paced' && d.signup.done && d.signup.batch === LEI);
    ok('R5 (B) Daniel joins his batch\'s cohort with his own record (no history created)', lb.coh.filter(e => e.v === 'A').length === 1 && lb.coh.find(e => e.v === 'A').lid === d.me.id && d.assignments.length === 0);
    // 3 mixed batch
    SA(); ACT.addToBatch({ dataset: { id: LEI } }); document.querySelector('#r2-ab-o').value = fa; prim(); closeModal();
    ok('R5 (B) 3 the batch is mixed (Daniel Self-Paced, a Fully Assisted learner added)', r2IsMixed(lb) && r2Mix(lb)['Self-Paced'] === 1);
    // 4 eligible Zoom session
    const sc = sessAdd(LEI, { t: 'Self-Paced live class', at: D(0, '00:01'), mins: 480, aud: [sp] }), sf = sessAdd(LEI, { t: 'Weekly FA class', at: D(1, '10:00'), aud: [fa] });
    learner('A'); go('calendar'); ACT.joinZoom({ dataset: { id: 'bs-' + sc.id } }); const joined = !!MODAL && /Zoom \(simulated\)/.test(mroot().innerHTML); closeModal();
    ok('R5 (B) 4 Daniel sees and joins the Self-Paced class, not the Fully Assisted one', joined && has(d, sc) && !has(d, sf));
    // 5 submit an assignment published to his batch (the seeded draft Assignment 8)
    SA(); go('a-assignments', { id: 'a8', tab: 'mapping' }); const mb = app().querySelector('[data-onchange="mapChange"][data-q="q1"]'); mb.checked = true; INP.mapChange(mb); // its draft question isn't mapped yet (S2 rule)
    ACT.pubAsg({ dataset: { id: 'a8' } }); $$('.s2-pb').forEach(y => { y.checked = y.value === LEI; }); reason('Publish to Leicester Cohort 8');
    const a = d.assignments.find(x => x.id === 'a8'); ok('R5 (B) Assignment 8 published to his batch reaches Daniel', !!a && a.status === 'Not Started');
    if (!a) return; learner('A'); a.qs.forEach(q => { d.drafts[a.id + '.' + q.id + '.0'] = '<p>My answer from practice.</p>'; }); finaliseSubmit(a, false, now().toISOString()); closeModal();
    ok('R5 (B) 5 Daniel submits it', a.status === 'Submitted');
    // the same submission reaches the allocated Assessor and the batch Coordinator
    const key = d.me.id + '~a8';
    TCH('A'); const row = tasSubs(true).find(s => s.key === key); go('t-queue', { tab: 'sp' });
    ok('R5 (B) Sarah\'s Self-Paced worklist has Daniel\'s submission (same learner ID)', !!row && row.toMark && r4IsSP(row) && (DT['mq-sp'] ? DT['mq-sp'].rows : []).some(s => s.key === key));
    COO('A'); const crow = mySubmissions(true).find(s => s.key === key); ok('R5 (B) Dr Helen Carter (Coordinator) sees it', !!crow);
    // 6 Coordinator criterion feedback, published at once
    go('c-sub', { id: key }); const q = a.qs[0]; document.querySelector('#r3-cv-' + q.id).value = 'Partially Met'; document.querySelector('#r3-ct-' + q.id).value = 'Add a second workplace example.'; ACT.r3CooJudge({ dataset: { k: key, q: q.id } });
    learner('A'); go('assignment', { id: 'a8' }); ok('R5 (B) 6 Daniel sees the Coordinator\'s criterion feedback straight away', /Add a second workplace example/.test((app().querySelector('.r3-learner') || {}).textContent || ''));
    // 7 the allocated Assessor declares the outcome; nobody else can
    COO('A'); ACT.r3Declare({ dataset: { k: key } }); TCH('S'); ACT.r3Declare({ dataset: { k: key } }); TCH('T'); ACT.r3Declare({ dataset: { k: key } });
    ok('R5 (B) 7 (negative) the Coordinator, another Assessor and a Teacher are refused', !r3Out(key) && ADMIN.security.filter(x => /declare the final outcome/.test(x.detail)).length >= 3);
    TCH('A'); go('t-mark', { id: key }); ACT.mkMet({ dataset: { k: key, q: q.id, v: 'Met' } }); await wait(800); declare(key, 'Pass', 'Evidence meets the brief');
    ok('R5 (B) 7 Sarah (allocated Assessor) declares Pass for Daniel\'s Assignment 8', r3Out(key) && r3Out(key).result === 'Pass' && r3Out(key).by === 'Sarah Okonkwo' && r3Out(key).lid === d.me.id);
    ok('R5 (B) nothing fabricated: Daniel\'s only payment is the one he made; his only submission is this one', d.plans.filter(p => p.e === 'nvq').length === 1 && d.assignments.filter(x => x.status !== 'Not Started').length === 1 && a.qs.every(q => q.rounds.length === 1));
    rebuildA(); FA(); SA(); TCH('S'); TCH('A');
    ok('R5 (B) the journey survives admin rebuilds and identity switches (cohort link, outcome, judgements)', lb.coh.filter(e => e.v === 'A').length === 1 && ADMIN.batches.find(x => x.code === LEI).coh.some(e => e.v === 'A') && r3Out(key).result === 'Pass' && r3Judg(key).length >= 2);
    const s30 = SC_LIST().find(x => x[0] === '30'); ok('R5 (B) Demo Scenario #30 walks through this journey (10 steps)', !!s30 && s30[3].length === 10 && /Daniel Okafor/.test(s30[3][2].text));
    fresh(); ok('R5 (B) demo reset: no cohort link left behind', !ADMIN.batches.some(b => (b.coh || []).some(e => e.r5)));
  });

  /* ================= R1 (final review) — fee options for every Level 3 programme ================= */
  const vis = el => !!el && !el.closest('[hidden]');
  const npOpen = () => { SA(); go('a-programmes'); ACT.chProgNew(); };
  const npRow = (k, o) => { const r = document.querySelectorAll('#modal-root .r1-np-row')[k]; r.querySelector('.r1-np-l').value = o.l; r.querySelector('.r1-np-f').value = String(o.f); r.querySelector('.r1-np-m').value = o.m; };
  // A new Level 3 programme through the wizard, with fee options (rows: [{l, f, m}])
  const newL3 = (title, rows) => { npOpen(); fill({ '#np-t': title, '#np-r': 'QN 610/' + (1000 + title.length) + '/3', '#np-d': '12', '#np-du': 'months' /* E1-A: number + unit (was free text '12 months') */ }); rows.forEach((o, k) => { if (k) ACT.r1NpAdd(); npRow(k, o); }); const r = prim(); if (r === false) return null; closeModal(); return (STORE.chNewProgs || []).slice(-1)[0]; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  // Publish with the existing wizard steps: one unit / module / outcome / criterion, an offer letter
  const pubNew = pr => { const id = pr.id; go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U370', '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/650/3701' }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); document.querySelector('#rsn').value = 'First version'; press(); obsDecide(id); ACT.ch8Publish({ dataset: { id } }); const t = document.querySelector('#rsn'); if (t) { t.value = 'Ready'; press(); } closeModal(); return pr.status === 'Active'; };
  const mkBatch = (code, course, dm) => { ACT.newBatch(); if (!MODAL) return null; fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = course; INP.n2NbCourse(co); if (dm) document.querySelector('#nb-dm').value = dm; document.querySelector('#nb-m').value = 'Online'; if (prim() === false) return null; const ac = document.querySelector('#nb-ac'); ac.value = 'Dr Helen Carter'; if (prim() === false) return null; prim(); prim(); prim(); closeModal(); return ADMIN.batches.find(b => b.code === code) || null; };

  await T('R2 (final) Create batch: no class-pattern wording for Level 3; other levels unchanged', async () => {
    fresh(); SA(); ACT.newBatch(); const co = document.querySelector('#nb-co'), l3 = [...co.options].map(o => o.value).find(v => /Level 3 Diploma in Adult Care/.test(v)), l2 = [...co.options].map(o => o.value).find(v => /^Level 2/.test(v));
    co.value = l3; INP.n2NbCourse(co); const f3 = document.querySelector('#nb-dm').closest('.field');
    ok('R2 Create batch (Level 3): the mode field is only for standard-fee learners; no class pattern / programme default wording', f3.style.display !== 'none' && f3.querySelector('label').textContent === 'Delivery mode for standard-fee learners' && /fee option/.test(f3.querySelector('.hint').textContent) && !/class pattern|Programme default/i.test(document.querySelector('#modal-root').textContent), f3.textContent);
    if (l2) { co.value = l2; INP.n2NbCourse(co); const s2 = document.querySelector('#nb-dm'), f2 = s2.closest('.field'); ok('R2 Create batch (Level 2): mode field as before', !f2 || s2.tagName !== 'SELECT' || (f2.querySelector('label').textContent === 'Delivery mode' && /Programme default/.test(f2.querySelector('.hint').textContent)), f2 && f2.textContent); }
    closeModal();
  });

  await T('R1 (final) wizard: a Level 3 programme is created with several fee options; other levels keep one price', async () => {
    fresh(); npOpen();
    ok('R1f wizard (Level 3): fee options instead of the single price', vis(document.querySelector('#modal-root .r1-np-l3')) && !vis(document.querySelector('#np-p')) && !!document.querySelector('#modal-root .r1-np-row'));
    ok('R1f wizard (Level 3): no delivery-mode / class-pattern selector; the mode comes from the fee option; no "Pending" label shown', !vis(document.querySelector('#modal-root .r1-np-sup')) && /comes from the fee option/.test(document.querySelector('#modal-root .r1-np-modes').textContent) && /Self-Paced and Fully Assisted learners/.test(document.querySelector('#modal-root .r1-np-modes').textContent) && !vis(document.querySelector('#modal-root .tbd')));
    fill({ '#np-t': 'Level 3 Certificate in Support Work', '#np-r': 'QN 610/5555/3', '#np-d': '12', '#np-du': 'months' /* E1-A: number + unit (was free text '12 months') */ });
    ok('R1f (negative) at least one complete option (label required)', prim() === false && !(STORE.chNewProgs || []).some(p => p.title === 'Level 3 Certificate in Support Work'));
    // E1 clarification (20 Oct 2026) supersedes: "a fee that doesn't divide into the instalments is refused" (£500 against 6, at Step 1).
    // Step 1 now checks the amount only; the split is checked in the Payment Plan step against the configured method (ft-e1.js, E1-CL).
    npRow(0, { l: 'Self-Paced', f: '12.345', m: 'Self-Paced' }); ok('R1f (negative) an invalid fee amount is refused (part pennies)', prim() === false);
    npRow(0, { l: 'Self-Paced', f: 600, m: '' }); ok('R1f (negative) the delivery mode is required', prim() === false);
    npRow(0, { l: 'Self-Paced', f: 600, m: 'Self-Paced' }); ACT.r1NpAdd(); npRow(1, { l: 'self-paced', f: 1200, m: 'Fully Assisted' }); ok('R1f (negative) labels must differ', prim() === false);
    npRow(1, { l: 'Fully Assisted', f: 1200, m: 'Fully Assisted' }); ACT.r1NpAdd(); npRow(2, { l: 'Self-Paced plus', f: 900, m: 'Self-Paced' }); ACT.r1NpAdd(); ACT.r1NpAdd();
    ok('R1f any number of options can be added (no maximum)', document.querySelectorAll('#modal-root .r1-np-row').length === 5);
    prim(); closeModal(); const pr = (STORE.chNewProgs || []).find(p => p.title === 'Level 3 Certificate in Support Work'), o = pr && r1Opts(pr.id);
    ok('R1f created: Level 3 Draft with 3 options (empty rows ignored), stable IDs under the programme ID', !!pr && pr.level === 'Level 3' && o.length === 3 && o.map(x => x.id).join() === [1, 2, 3].map(n => pr.id + '-FO-00' + n).join() && o.every(x => x.pid === pr.id) && o.map(x => x.mode).join() === 'Self-Paced,Fully Assisted,Self-Paced');
    ok('R1f the plan keeps its deposit and instalments; its reference fee is the lowest option fee', s4TermsOf(pr.id).fee === 600 && s4TermsOf(pr.id).inst === 6 && r1Eligible(pr.id).length === 3 && ADMIN.audit.some(a => a.action === 'Fee option added' && a.entity.includes(pr.id + '-FO-001')));
    go('a-programmes', { id: pr.id, tab: 'details' }); ok('R1f the Draft\'s details list its options (managed under Finance)', /Managed under Finance → Instalment plans/.test(main()) && main().includes(pr.id + '-FO-002'));
    // CB1 (PD-CB-01) supersedes the address only: "support" wasn't a step of new programmes, so it showed Details; it now opens the
    // observation fee rate panel. The check (the Details text) is unchanged and now goes to Details directly.
    go('a-programmes', { id: pr.id, tab: 'details' }); ok('R1f new programme Details (Level 3): the learner-level rule, not the batch-level P-31 wording', /comes from the fee option/.test(main()));
    go('a-programmes', { id: 'NV-L3D', tab: 'support' }); ok('R1f Support tab of a built-in Level 3 programme (2027 draft): the confirmed learner-level rule is stated; open P-31 questions keep their tag', !!app().querySelector('.r1-sup3') && !!app().querySelector('.tbd'));
    // Level 4: unchanged single price and delivery mode (with its P-31 wording)
    npOpen(); const lv = document.querySelector('#np-l'); lv.value = 'Level 4'; INP.r1NpLevel(lv);
    ok('R1f wizard (Level 4): single price and default delivery mode (P-31 wording) as before', vis(document.querySelector('#np-p')) && !vis(document.querySelector('#modal-root .r1-np-l3')) && vis(document.querySelector('#modal-root .r1-np-o3 .tbd')));
    ok('R1f wizard (Level 4): the delivery-mode selector is shown, with its choices', vis(document.querySelector('#modal-root .r1-np-sup')) && document.querySelectorAll('#modal-root input[name="np-s"]').length >= 2 && !vis(document.querySelector('#modal-root .r1-np-modes')));
    ['Level 2', 'Level 5'].forEach(L => { lv.value = L; INP.r1NpLevel(lv); ok('R1f wizard (' + L + '): unchanged — single price and the delivery-mode selector', vis(document.querySelector('#np-p')) && vis(document.querySelector('#modal-root .r1-np-sup')) && !vis(document.querySelector('#modal-root .r1-np-l3'))); });
    lv.value = 'Level 3'; INP.r1NpLevel(lv); ok('R1f wizard: switching back to Level 3 hides the selector again', !vis(document.querySelector('#modal-root .r1-np-sup')) && vis(document.querySelector('#modal-root .r1-np-l3')));
    lv.value = 'Level 4'; INP.r1NpLevel(lv);
    fill({ '#np-t': 'Level 4 Certificate in Team Leading', '#np-r': 'QN 610/4444/4', '#np-d': '12', '#np-du': 'months' /* E1-A: number + unit (was free text '12 months') */, '#np-p': '2600' }); prim(); closeModal();
    const p4 = (STORE.chNewProgs || []).find(x => x.title === 'Level 4 Certificate in Team Leading');
    ok('R1f Level 4 created with its price and no fee options', !!p4 && p4.price === 2600 && !r1IsL3Pid(p4.id) && !r1Opts(p4.id).length);
    go('a-finance', { tab: 'plans' }); const cards = [...app().querySelectorAll('.r1-opts')].map(c => c.dataset.pid);
    ok('R1f Finance shows one fee-options card per Level 3 programme (Diploma, its 2027 draft, the new one) — none for other levels', cards.includes('NV-L3') && cards.includes('NV-L3D') && cards.includes(pr.id) && !cards.includes(p4.id) && !cards.includes('NV-L2') && !cards.includes('NV-L3O'));
  });

  await T('R1 (final) independent options per programme; enrolment, pricing snapshots, mixed batch and targeted sessions for a new Level 3 programme', async () => {
    fresh(); SA(); const pr = newL3('Level 3 Certificate in Support Work', [{ l: 'Self-Paced', f: 600, m: 'Self-Paced' }, { l: 'Fully Assisted', f: 1200, m: 'Fully Assisted' }]);
    const dSP = optAdd('Self-Paced — standard', 660, 'Self-Paced'); // an option of the Level 3 Diploma
    const [nSP, nFA] = r1Opts(pr.id).map(o => o.id);
    ok('R1f each programme keeps its own options (no shared IDs)', r1Opts('NV-L3').every(o => o.pid === 'NV-L3' && !r1Opts(pr.id).includes(o)) && r1Opts(pr.id).every(o => o.pid === pr.id) && dSP === 'L3-FO-001' && nSP === pr.id + '-FO-001');
    ACT.r1OptAdd({ dataset: { p: pr.id } }); fill({ '#fo-l': 'Fully Assisted plus', '#fo-f': '1800', '#fo-m': 'Fully Assisted' }); reason('Extra option');
    ok('R1f adding an option to the new programme leaves the Diploma\'s options unchanged', r1Opts(pr.id).length === 3 && r1Opts('NV-L3').length === 2 && r1Opts(pr.id)[2].id === pr.id + '-FO-003');
    ok('R1f publish the new programme with the existing wizard steps', pubNew(pr), pr.status);
    SA(); go('a-batches'); const b = mkBatch('L3SW-MAR27', pr.title, 'Fully Assisted'); ok('R1f a batch of the new programme', !!b && r2IsL3B(b));
    // Enrolment: the programme's own options are offered (not the Diploma's)
    learner('A'); go('browse'); const c = CATALOGUE.find(x => x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
    const offered = [...document.querySelectorAll('#modal-root input[name="r1-opt"]')].map(x => x.value);
    ok('R1f Browse "From" the lowest option; the sign-up offers this programme\'s options only', c.price === 600 && offered.length === 3 && offered.every(id => id.startsWith(pr.id)) && !offered.includes(dSP)); closeModal();
    const d = apply3x('A', pr, nSP); finish(d, 'instalment', b); const f = apply3x('F', pr, nFA); finish(f, 'deposit', b);
    ok('R1f enrolment: option, mode and fee frozen (Daniel £600 Self-Paced, Fatima £1,200 Fully Assisted)', d.signup.plan.opt.id === nSP && d.signup.plan.opt.pid === pr.id && d.signup.plan.fee === 600 && r2ModeOfW(d) === 'Self-Paced' && f.signup.plan.fee === 1200 && r2ModeOfW(f) === 'Fully Assisted' && d.plans.find(p => p.e === 'nvq').rows[0].amount === 100 && f.plans.find(p => p.e === 'nvq').rows[0].amount === 900);
    const snap = JSON.stringify([d.signup.plan, d.plans, f.signup.plan, f.plans]);
    SA(); ACT.r1OptEdit({ dataset: { id: nSP } }); fill({ '#fo-f': '720' }); reason('Price rise'); ACT.r1OptRetire({ dataset: { id: nFA } }); reason('Withdrawn');
    ok('R1f editing / retiring the new programme\'s options never reprices its learners', JSON.stringify([d.signup.plan, d.plans, f.signup.plan, f.plans]) === snap && r1Opt(nSP).fee === 720 && r1Opt(nFA).status === 'Retired');
    ok('R1f mixed batch of the new programme (Daniel Self-Paced, Fatima Fully Assisted)', d.signup.batch === b.code && f.signup.batch === b.code && r2IsMixed(b));
    ACT.addSession({ dataset: { b: b.code } }); const groups = [...document.querySelectorAll('#modal-root .r2-g')].map(x => x.value).filter(v => !v.startsWith('mode:'));
    ok('R1f Add session on its batch offers its own fee-option groups only', groups.length === 3 && groups.every(g => g.startsWith(pr.id)));
    document.querySelector('#modal-root .r2-aud .r2-groups').insertAdjacentHTML('beforeend', `<label class="check"><input type="checkbox" class="r2-g" value="${dSP}" checked></label>`); fill({ '#se-n': 'Cross-programme try' });
    ok('R1f (negative) a fee-option group of another programme is refused (even if forced into the form)', prim() === false && /don't belong to/.test(mroot().textContent) && !s4bAllSess().some(s => s.title === 'Cross-programme try')); closeModal();
    const s = sessAdd(b.code, { t: 'SW Self-Paced class', at: D(1, '10:00'), aud: [nSP] });
    ok('R1f targeted session: Daniel (Self-Paced option) gets it, Fatima doesn\'t; register eligibility follows', !!s && has(d, s) && !has(f, s) && n4Eligible(s).includes(d.me.id) && !n4Eligible(s).includes(f.me.id));
    const row = { L: { v: 'A', lid: d.me.id, batch: b } };
    ok('R1f Self-Paced worklist filters read this programme\'s option', r4Info(row).mode === 'Self-Paced' && r4Info(row).group === nSP && /Self-Paced \(L3-|Self-Paced \(NV-N/.test(r4GroupLbl(r4Info(row).group)));
    ok('R1f the Diploma\'s learners are untouched (Aisha, Priya)', STORE.worlds.C.signup.plan.opt.id === 'L3-FO-STD' && STORE.worlds.C.signup.plan.fee === 2400 && STORE.worlds.B.signup.plan.fee === 2400);
    rebuildA(); FA(); SA();
    ok('R1f persistence: the new programme, its options, Daniel\'s choice and the session audience survive admin rebuilds', !!s3Pr(pr.id) && r1Opts(pr.id).length === 3 && r1Opt(nSP).fee === 720 && d.signup.plan.opt.id === nSP && JSON.stringify(s4bSessById(s.id).aud) === JSON.stringify([nSP]));
  });

  await T('R1 (final) Level 2 / 4 / 5 unchanged; Demo controls show the scenarios button at once', async () => {
    fresh(); const fees0 = JSON.stringify(NVQ_FEES), cat0 = JSON.stringify(CATALOGUE.filter(c => c.kind === 'nvq' && !/Level 3/.test(c.title)).map(c => [c.id, c.price]));
    ok('R1f only Level 3 programmes have fee options', !['NV-L2', 'NV-L4', 'NV-L5', 'NV-N1', 'NV-N2'].some(r1IsL3Pid) && r1IsL3Pid('NV-L3') && r1IsL3Pid('NV-L3D') && !r1IsL3Pid('NV-L3O'));
    learner('E'); go('browse'); const c2 = CATALOGUE.find(x => x.kind === 'nvq' && /^Level 2 Diploma/.test(x.title)); ACT.applyNvq({ dataset: { id: c2.id } });
    ok('R1f Level 2 sign-up: no fee-option choice (single price as before)', !!MODAL && !document.querySelector('#modal-root input[name="r1-opt"]')); closeModal();
    SA(); ACT.addSession({ dataset: { b: 'L2DC-MAR26' } }); ok('R1f Level 2 batch: no audience choice', !document.querySelector('#modal-root .r2-aud')); closeModal();
    ok('R1f Level 2/4/5 prices and agency list prices unchanged', JSON.stringify(NVQ_FEES) === fees0 && JSON.stringify(CATALOGUE.filter(c => c.kind === 'nvq' && !/Level 3/.test(c.title)).map(c => [c.id, c.price])) === cat0);
    learner('A'); S.demoOpen = false; render(); document.querySelector('.demo-fab').click();
    const btn = document.querySelector('#demo-root [data-act="scOpen"]');
    ok('Demo controls: "Open the 30 Demo Scenarios" is there as soon as the panel opens', !!btn && btn.textContent === 'Open the 30 Demo Scenarios');
    btn.click(); ok('…and opens Scenario #30', S.route === 'demo-scenarios' && !!document.querySelector('#sc-30'));
    SA(); S.demoOpen = false; render(); document.querySelector('.demo-fab').click(); ok('Demo controls (admin console): the button is there too', !!document.querySelector('#demo-root [data-act="scOpen"]')); document.querySelector('.demo-fab').click();
    S.signedIn = false; S.demoOpen = false; render(); document.querySelector('.demo-fab').click(); ok('Demo controls (signed out): the button is there too', !!document.querySelector('#demo-root [data-act="scOpen"]')); S.demoOpen = false;
  });


  /* ================= R2 (reconciliation) — the session audience selector, as the client asked ================= */
  await T('R2 audience selector: each fee option a checkbox under Self-Paced / Fully Assisted, with price, label and learner count', async () => {
    fresh(); SA(); const basic = optAdd('Self-Paced Basic', 600, 'Self-Paced'), plus = optAdd('Self-Paced Plus', 900, 'Self-Paced'), prem = optAdd('Self-Paced Premium', 1200, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', basic); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b);
    SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = plus; const lp = document.querySelector('#ab-l').value; prim(); closeModal();
    ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = 'L3-FO-STD'; const fr = [...document.querySelectorAll('#ab-l option')].find(o => o.value !== lp && !/ — in /.test(o.textContent)); document.querySelector('#ab-l').value = fr.value; const ls = fr.value; prim(); closeModal();
    const other = newL3('Level 3 Certificate in Support Work', [{ l: 'Other programme option', f: 1500, m: 'Self-Paced' }]);
    SA(); ACT.addSession({ dataset: { b: MIXB } });
    const groups = [...document.querySelectorAll('#modal-root .r2-grp')].map(g => [g.querySelector('.r2-gh').textContent, [...g.querySelectorAll('.r2-opt strong')].map(x => x.textContent)]);
    ok('R2 sel: groups and labels from the programme\'s configuration, grouped by mode', JSON.stringify(groups) === JSON.stringify([['Self-Paced', ['£600.00 — Self-Paced Basic', '£900.00 — Self-Paced Plus', '£1,200.00 — Self-Paced Premium']], ['Fully Assisted', ['£1,800.00 — Fully Assisted']], ['Standard fee (legacy)', ['£2,400.00 — Standard programme fee']]]), JSON.stringify(groups));
    ok('R2 sel: headings are not selectable; one checkbox per option (5); no whole-mode choice', document.querySelectorAll('#modal-root .r2-g').length === 5 && !document.querySelector('#modal-root .r2-gh input') && !document.querySelector('#modal-root .r2-g[value^="mode:"]') && !/Every (Fully Assisted|Self-Paced) learner/.test(mroot().textContent));
    const cnt = id => (document.querySelector(`#modal-root .r2-n[data-o="${id}"]`) || {}).textContent;
    ok('R2 sel: learners per option (Basic 1, Plus 1, Premium 0, Fully Assisted 1, standard 1)', cnt(basic) === '· 1 learner' && cnt(plus) === '· 1 learner' && cnt(prem) === '· 0 learners' && cnt(fa) === '· 1 learner' && cnt('L3-FO-STD') === '· 1 learner', [basic, plus, prem, fa, 'L3-FO-STD'].map(cnt).join());
    ok('R2 sel: no option of another programme; no internal option IDs in the visible text', !/Other programme option/.test(mroot().textContent) && !r1Opts(other.id).some(o => document.querySelector(`#modal-root .r2-g[value="${o.id}"]`)) && !/L3-FO-|NV-N\d-FO-/.test(mroot().textContent));
    const tick = ids => { ids.forEach(id => { const x = document.querySelector(`#modal-root .r2-g[value="${id}"]`); x.checked = true; x.dispatchEvent(new Event('change', { bubbles: true })); }); };
    ok('R2 sel: a new session starts with every option ticked (5 · 4 learners)', document.querySelectorAll('#modal-root .r2-g:checked').length === 5 && document.querySelector('#modal-root .r2-sum').textContent === '5 fee options selected · 4 learners');
    ACT.r2AudNone(); tick([basic, plus, fa]);
    ok('R2 sel: ticking three options; summary 3 fee options · 3 learners', document.querySelector('#modal-root .r2-sum').textContent === '3 fee options selected · 3 learners', document.querySelector('#modal-root .r2-sum').textContent);
    ACT.r2AudAll(); ok('R2 sel: Select all ticks every option (5 · 4 learners)', document.querySelectorAll('#modal-root .r2-g:checked').length === 5 && document.querySelector('#modal-root .r2-sum').textContent === '5 fee options selected · 4 learners', document.querySelector('#modal-root .r2-sum').textContent);
    ACT.r2AudNone(); ok('R2 sel: Clear selection unticks all', !document.querySelector('#modal-root .r2-g:checked') && /No fee option selected/.test(document.querySelector('#modal-root .r2-sum').textContent));
    fill({ '#se-n': 'Nothing ticked' }); ok('R2 sel (negative): "only these options" with none ticked is refused', prim() === false && !s4bAllSess().some(x => x.title === 'Nothing ticked')); closeModal();
    const s = sessAdd(MIXB, { t: 'Mixed workshop', at: D(3, '10:00'), aud: [basic, plus, fa] });
    ok('R2 sel: saved with the option IDs ticked; eligibility follows (Daniel, the Plus learner, Fatima — not the standard-fee learner)', r2Same(s.aud, [basic, plus, fa]) && n4Eligible(s).includes(d.me.id) && n4Eligible(s).includes(lp) && n4Eligible(s).includes(f.me.id) && !n4Eligible(s).includes(ls) && has(d, s) && has(f, s));
    ok('R2 sel: the audience is described by price and label', r2AudTxt(s) === '£600.00 — Self-Paced Basic, £900.00 — Self-Paced Plus, £1,800.00 — Fully Assisted', r2AudTxt(s));
    ACT.s4bSessEdit({ dataset: { id: s.id } });
    ok('R2 edit: the same selector, with the saved options ticked', [...document.querySelectorAll('#modal-root .r2-g:checked')].map(x => x.value).sort().join() === [basic, plus, fa].sort().join() && document.querySelectorAll('#modal-root .r2-grp').length === 3);
    fill({ '#se-r': 'No change' }); let r = prim(), n = 0; while (r === false && MODAL && n++ < 3) r = prim(); if (MODAL) closeModal();
    ok('R2 edit: saving without changing the audience keeps it exactly (no audience change recorded)', r2Same(s.aud, [basic, plus, fa]) && !ADMIN.audit.some(a => a.action === 'Session audience changed'));
    const nf = f.notifs.length; audEdit(s, [basic], 'Self-Paced Basic only');
    ok('R2 edit: removed learners lose the session and are told once; the remaining audience keeps it', r2Same(s.aud, [basic]) && !has(f, s) && f.notifs.length === nf + 1 && /removed from your timetable/.test(f.notifs[0].title) && has(d, s) && !n4Eligible(s).includes(lp));
    learner('F'); ACT.joinZoom({ dataset: { id: 'bs-' + s.id } }); ok('R2 edit: the removed learner gets no Zoom link', !MODAL);
    const ret = r1Opts(other.id)[0]; SA(); ACT.r1OptRetire({ dataset: { id: ret.id } }); reason('Withdrawn');
    const box = r2AudBox({ code: 'TMP', course: other.title, dmode: 'Self-Paced' });
    // unified selector (old: a disabled "only ticked" radio): nothing to tick and no radio choice
    ok('R2 sel: a programme without fee options shows a clear empty state; nothing to tick, no radio choice', /has no fee options yet/.test(box) && !/class="r2-g"/.test(box) && !/name="r2-aud"/.test(box));
  });


  /* ================= R2 (final review) — weekly class plans by fee option ================= */
  await T('R2 weekly plans: several per Level 3 batch, each for the fee options ticked; history, attendance and conflicts', async () => {
    fresh(); SA(); const basic = optAdd('Self-Paced Basic', 600, 'Self-Paced'), plus = optAdd('Self-Paced Plus', 900, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', basic); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b);
    SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = plus; const lp = document.querySelector('#ab-l').value; prim(); closeModal();
    const from = b.start.slice(0, 10), to = new Date(new Date(b.start).getTime() + 20 * DAY).toISOString().slice(0, 10);
    // A weekly plan through its dialog: w = '' (first) | 'new' | slot; ids = fee options to tick (null = leave the ticks as they are)
    const wplan = (w, o, ids) => { ACT.n3Weekly({ dataset: { b: MIXB, w } }); if (!MODAL) return null; const set = { '#n3-wd': o.wd, '#n3-t': o.t || '17:00', '#n3-m': '60', '#n3-te': o.te || 'Marcus Bell', '#n3-f': from, '#n3-to': to, '#n3-n': o.n, '#n3-r': o.r || 'Timetable' }; Object.entries(set).forEach(([k, v]) => { document.querySelector(k).value = v; });
      if (ids) document.querySelectorAll('#modal-root .r2-g').forEach(x => { x.checked = ids.includes(x.value); }); const p1 = prim(), pv = (document.querySelector('#n3-pv') || {}).textContent || ''; const p2 = p1 === false ? prim() : p1; if (MODAL) closeModal(); return { pv, p2 }; };
    go('a-batches', { id: MIXB, tab: 'schedule' }); ok('R2 wp: the Schedule tab offers "Add weekly recurring classes"', /Weekly recurring classes/.test(main()) && !!app().querySelector('[data-act="n3Weekly"][data-w="new"]'));
    ACT.n3Weekly({ dataset: { b: MIXB, w: 'new' } });
    const heads = [...document.querySelectorAll('#modal-root .r2-grp .r2-gh')].map(x => x.textContent), labs = [...document.querySelectorAll('#modal-root .r2-opt strong')].map(x => x.textContent);
    ok('R2 wp: "Who should attend?" — every fee option grouped by mode, with price and label; no whole-mode shortcut', /Who should attend\?/.test(mroot().textContent) && heads.join() === 'Self-Paced,Fully Assisted,Standard fee (legacy)' && labs.join('|') === '£600.00 — Self-Paced Basic|£900.00 — Self-Paced Plus|£1,800.00 — Fully Assisted|£2,400.00 — Standard programme fee' && !/Every (Self-Paced|Fully Assisted) learner/.test(mroot().textContent) && !document.querySelector('#modal-root input[name="r2-aud"]'));
    ok('R2 wp: Select all / Clear selection and the summary, as in Add session', !!document.querySelector('#modal-root [data-act="r2AudAll"]') && !!document.querySelector('#modal-root [data-act="r2AudNone"]') && /4 fee options selected · 3 learners/.test(document.querySelector('#modal-root .r2-sum').textContent), document.querySelector('#modal-root .r2-sum').textContent);
    closeModal(); ACT.addSession({ dataset: { b: MIXB } }); const labsS = [...document.querySelectorAll('#modal-root .r2-opt strong')].map(x => x.textContent), headsS = [...document.querySelectorAll('#modal-root .r2-grp .r2-gh')].map(x => x.textContent); closeModal();
    ok('R2 wp: Add session lists the same fee options, groups and wording as the weekly plan', labsS.join('|') === labs.join('|') && headsS.join() === heads.join());
    ACT.n3Weekly({ dataset: { b: MIXB, w: 'new' } });
    ACT.r2AudNone(); fill({ '#n3-r': 'x' }); ok('R2 wp (negative): a plan with no fee option ticked is refused', prim() === false && !n3Plan(MIXB)); closeModal();
    // Plan 1: one Self-Paced option only
    wplan('new', { wd: 'Tuesday', n: 'Plus tutorial' }, [plus]);
    const p1 = N3().plans[MIXB], s1 = Object.values(p1.occ).map(s4bSessById);
    ok('R2 wp: plan 1 for one fee option — plan and every class store exactly that option ID', r2Same(p1.aud, [plus]) && s1.length >= 2 && s1.every(x => r2Same(x.aud, [plus]) && x.n3w === '1'));
    ok('R2 wp: only that option\'s learner is in (calendar, register); Daniel and Fatima are not', s1.every(x => n4Eligible(x).join() === lp && !has(d, x) && !has(f, x)));
    // Plan 2 (same batch): options across both modes
    const nd = d.notifs.length, nf = f.notifs.length;
    const r2 = wplan('new', { wd: 'Thursday', n: 'Joint class' }, [basic, fa]);
    const p2 = N3().plans[MIXB + '#2'], s2 = Object.values(p2.occ).map(s4bSessById);
    ok('R2 wp: a second plan in the same batch (its own record), for a Self-Paced and a Fully Assisted option', !!p2 && r2Same(p2.aud, [basic, fa]) && s2.length >= 2 && s2.every(x => r2Same(x.aud, [basic, fa]) && x.n3w === '2') && Object.keys(N3().plans[MIXB].occ).length === s1.length);
    ok('R2 wp: Daniel and Fatima get these classes (calendar) and one notice each; the Plus learner doesn\'t', s2.every(x => has(d, x) && has(f, x) && !n4Eligible(x).includes(lp)) && d.notifs.length === nd + 1 && f.notifs.length === nf + 1);
    ok('R2 wp: different weekdays — no timetable or teacher conflict between the plans', /No scheduling conflicts/.test(r2.pv));
    go('a-batches', { id: MIXB, tab: 'schedule' }); const cards = [...app().querySelectorAll('.r2-wplan')];
    ok('R2 wp: the card lists both plans with their audience (price and label)', cards.length === 2 && /For: £900\.00 — Self-Paced Plus/.test(cards[0].textContent) && /For: £600\.00 — Self-Paced Basic, £1,800\.00 — Fully Assisted/.test(cards[1].textContent));
    const r3 = wplan('new', { wd: 'Tuesday', n: 'Clash', t: '17:00' }, [fa]);
    ok('R2 wp (negative): a third plan at the same time as plan 1 is flagged as a conflict in its preview (existing rule)', /conflict/i.test(r3.pv) && /same (cohort|teacher)/.test(r3.pv));
    // Editing plan 1: same schedule, new audience — no duplicates; the removed learner loses the classes
    const n0 = s4bSess(MIXB).length; wplan('', { wd: 'Tuesday', n: 'Plus tutorial' }, [plus, basic]);
    ok('R2 wp edit: the audience changes on the plan\'s classes; no class is recreated or duplicated', s4bSess(MIXB).length === n0 && r2Same(N3().plans[MIXB].aud, [plus, basic]) && s1.every(x => r2Same(x.aud, [plus, basic]) && has(d, x)) && ADMIN.audit.some(a => a.action === 'Weekly plan audience changed'));
    const nd2 = d.notifs.length; wplan('', { wd: 'Tuesday', n: 'Plus tutorial' }, [plus]);
    ok('R2 wp edit: narrowing it takes the classes off Daniel\'s calendar and tells him once', s1.every(x => !has(d, x)) && d.notifs.length === nd2 + 1 && /Weekly classes removed/.test(d.notifs[0].title));
    // Attendance: a class that has started keeps its audience and register; excluded learners are never absent
    const held = s2[0]; held.start = D(0, '00:01'); held.end = D(0, '23:00'); held.link = held.link || 'https://zoom.example/j/990001'; ACT.n4Import({ dataset: { s: held.id } }); const rows = N4().regs[held.id].rows;
    ok('R2 wp attendance: the register lists the audience only; the Plus learner isn\'t marked absent', !!rows[d.me.id] && !!rows[f.me.id] && !rows[lp]);
    const rows0 = JSON.stringify(rows); wplan('2', { wd: 'Thursday', n: 'Joint class' }, [fa]);
    ok('R2 wp attendance: changing plan 2\'s audience leaves the held class\'s audience and register as they were', r2Same(held.aud, [basic, fa]) && JSON.stringify(N4().regs[held.id].rows) === rows0 && s2.slice(1).every(x => r2Same(x.aud, [fa])));
  });

  await T('R2 weekly plans: a plan saved before fee-option audiences keeps its audience until someone changes it', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced Basic', 600, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', sp); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b);
    const from = b.start.slice(0, 10), to = new Date(new Date(b.start).getTime() + 13 * DAY).toISOString().slice(0, 10);
    SA(); ACT.n3Weekly({ dataset: { b: MIXB } }); Object.entries({ '#n3-wd': 'Wednesday', '#n3-t': '17:00', '#n3-m': '60', '#n3-te': 'Marcus Bell', '#n3-f': from, '#n3-to': to, '#n3-n': 'Old plan', '#n3-r': 'x' }).forEach(([k, v]) => { document.querySelector(k).value = v; }); prim(); prim(); closeModal();
    // as saved before this release: the plan and its classes have no audience of their own (the original rule: the batch's Fully Assisted learners)
    const p = N3().plans[MIXB], ss = Object.values(p.occ).map(s4bSessById); delete p.aud; ss.forEach(x => { delete x.aud; delete x.n3w; }); s4bSyncBatch(MIXB);
    ok('R2 wp legacy: an original plan keeps its rule — Fatima (Fully Assisted) in, Daniel (Self-Paced) out', ss.every(x => has(f, x) && !has(d, x)));
    ACT.n3Weekly({ dataset: { b: MIXB, w: '' } }); ok('R2 wp legacy: its dialog says so and ticks the equivalent options', /Made before classes had their own audience/.test(mroot().textContent) && [...document.querySelectorAll('#modal-root .r2-g:checked')].map(x => x.value).join() === fa + ',L3-FO-STD');
    const na = ADMIN.audit.length; fill({ '#n3-r': 'No change' }); prim(); prim(); closeModal();
    ok('R2 wp legacy: saving it unchanged keeps it exactly (no audience written, nothing logged)', !('aud' in N3().plans[MIXB]) && ss.every(x => x.aud === undefined) && !ADMIN.audit.slice(0, ADMIN.audit.length - na).some(a => /Weekly plan audience/.test(a.action)));
  });


  /* ================= R2 (unified) — one fee-option audience selector for every Level 3 scheduling dialog ================= */
  await T('R2 unified selector: one-off and weekly dialogs are the same; every entry point uses it; old audiences keep their meaning', async () => {
    fresh(); SA(); const basic = optAdd('Self-Paced Basic', 600, 'Self-Paced'), plus = optAdd('Self-Paced Plus', 900, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', basic); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b);
    SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = plus; const lp = document.querySelector('#ab-l').value; prim(); closeModal();
    const snap = () => ({ heads: [...document.querySelectorAll('#modal-root .r2-gh')].map(x => x.textContent).join('|'), rows: [...document.querySelectorAll('#modal-root .r2-opt')].map(l => l.querySelector('input').value + '=' + l.querySelector('strong').textContent + l.querySelector('.r2-n').textContent).join('|'), legend: (document.querySelector('#modal-root .r2-aud legend') || {}).textContent, radios: document.querySelectorAll('#modal-root input[name="r2-aud"]').length, sum: (document.querySelector('#modal-root .r2-sum') || {}).textContent, on: [...document.querySelectorAll('#modal-root .r2-g:checked')].map(x => x.value).sort().join() });
    const set = ids => document.querySelectorAll('#modal-root .r2-g').forEach(x => { x.checked = ids.includes(x.value); x.dispatchEvent(new Event('change', { bubbles: true })); });
    // 1, 2, 4. the same groups, labels, prices, counts, default, Select all / Clear and summary in both dialogs
    ACT.addSession({ dataset: { b: MIXB } }); const one = snap(); ACT.r2AudNone(); const oneNone = snap().sum; ACT.r2AudAll(); const oneAll = snap().sum; set([plus, fa]); const oneTwo = snap().sum; closeModal();
    ACT.n3Weekly({ dataset: { b: MIXB, w: 'new' } }); const wk = snap(); ACT.r2AudNone(); const wkNone = snap().sum; ACT.r2AudAll(); const wkAll = snap().sum; set([plus, fa]); const wkTwo = snap().sum; closeModal();
    ok('R2 unified: Add session and the weekly plan show identical groups, labels, GBP prices and learner counts', one.heads === wk.heads && one.rows === wk.rows && one.heads === 'Self-Paced|Fully Assisted|Standard fee (legacy)' && /=£900\.00 — Self-Paced Plus· 1 learner/.test(one.rows) && /=£1,800\.00 — Fully Assisted· 1 learner/.test(one.rows), one.rows);
    ok('R2 unified: same legend "Who should attend?", no radio choice, every active option ticked by default', one.legend === 'Who should attend?' && wk.legend === one.legend && one.radios === 0 && wk.radios === 0 && one.on === wk.on && one.on.split(',').length === 4);
    ok('R2 unified: Select all / Clear selection / ticking give the same summary in both', oneNone === wkNone && oneAll === wkAll && oneTwo === wkTwo && oneAll === '4 fee options selected · 3 learners' && oneTwo === '2 fee options selected · 2 learners', [oneNone, oneAll, oneTwo, wkTwo].join(' / '));
    // 3. both save exactly the IDs ticked
    const from = b.start.slice(0, 10), to = new Date(new Date(b.start).getTime() + 13 * DAY).toISOString().slice(0, 10);
    const s1 = sessAdd(MIXB, { t: 'Same ticks one-off', at: D(3, '17:00'), aud: [plus, fa] });
    ACT.n3Weekly({ dataset: { b: MIXB, w: 'new' } }); Object.entries({ '#n3-wd': 'Friday', '#n3-t': '17:00', '#n3-m': '60', '#n3-te': 'Marcus Bell', '#n3-f': from, '#n3-to': to, '#n3-n': 'Same ticks weekly', '#n3-r': 'x' }).forEach(([k, v]) => { document.querySelector(k).value = v; }); set([plus, fa]); prim(); prim(); if (MODAL) closeModal();
    const wp = N3().plans[MIXB], wcls = Object.values(wp.occ).map(s4bSessById);
    ok('R2 unified: the one-off session and the weekly plan (and its classes) store the same option IDs', r2Same(s1.aud, [plus, fa]) && r2Same(wp.aud, [plus, fa]) && wcls.length >= 1 && wcls.every(x => r2Same(x.aud, s1.aud)));
    ok('R2 unified: creation is one history row and one audit entry, with the audience on it', s1.hist.length === 1 && /for: /.test(s1.hist[0][4]) && ADMIN.audit.filter(a => a.action === 'Session added' && a.entity.startsWith('Same ticks one-off')).length === 1);
    // 7. a weekly plan saved again unchanged: same audience, no new classes, nothing logged, nobody notified
    const nS = s4bSess(MIXB).length, nA = ADMIN.audit.length, nd = d.notifs.length, nf = f.notifs.length;
    ACT.n3Weekly({ dataset: { b: MIXB, w: '' } }); fill({ '#n3-r': 'No change' }); prim(); prim(); if (MODAL) closeModal();
    ok('R2 unified: a weekly plan saved again unchanged keeps its audience; no duplicates, no audience log, no notices', r2Same(N3().plans[MIXB].aud, [plus, fa]) && s4bSess(MIXB).length === nS && !ADMIN.audit.slice(0, ADMIN.audit.length - nA).some(a => /audience/i.test(a.action)) && d.notifs.length === nd && f.notifs.length === nf);
    // 6. an existing all-participants session: shown with every option ticked; an unchanged save keeps it dynamic, silent
    const old = s4bSess(MIXB).find(x => x.aud === undefined && !x.gen && x.status !== 'Cancelled' && new Date(x.start) > now()) || sessAdd(MIXB, { t: 'Legacy whole batch', at: D(9, '10:00') });
    if (old.aud !== undefined) delete old.aud; // as stored before audiences existed
    const nd2 = d.notifs.length, nf2 = f.notifs.length, nh = old.hist.length;
    ACT.s4bSessEdit({ dataset: { id: old.id } }); const ed = snap();
    ok('R2 unified: an all-participants session opens with every option ticked and says it stays for everyone until the ticks change', ed.on.split(',').length === 4 && /including anyone who joins later/.test(mroot().textContent) && ed.radios === 0);
    fill({ '#se-r': 'Just looking' }); let r = prim(), n = 0; while (r === false && MODAL && n++ < 3) r = prim(); if (MODAL) closeModal();
    ok('R2 unified: no-op save of an all-participants session — audience still dynamic, no audience change, no notices', old.aud === undefined && !old.hist.slice(0, old.hist.length - nh).some(h => h[2] === 'Audience changed') && d.notifs.length === nd2 && f.notifs.length === nf2 && n4Eligible(old).includes(lp) && n4Eligible(old).includes(d.me.id), JSON.stringify([old.aud, old.hist.slice(0, old.hist.length - nh).map(h => h[2]), d.notifs.length - nd2, f.notifs.length - nf2, n4Eligible(old).includes(lp), n4Eligible(old).includes(d.me.id), old.batch, MODAL && MODAL.title]));
    old.aud = null; ACT.s4bSessEdit({ dataset: { id: old.id } }); fill({ '#se-r': 'Again' }); r = prim(); n = 0; while (r === false && MODAL && n++ < 3) r = prim(); if (MODAL) closeModal();
    ok('R2 unified: an explicit "everyone" (null) audience is kept the same way', old.aud === null);
    // legacy whole-mode audience: its effective options are ticked; an unchanged save keeps the stored tokens
    const tok = sessAdd(MIXB, { t: 'Mode token', at: D(10, '10:00'), aud: [fa] }); tok.aud = ['mode:Self-Paced'];
    ACT.s4bSessEdit({ dataset: { id: tok.id } }); const te = snap(); fill({ '#se-r': 'Look' }); r = prim(); n = 0; while (r === false && MODAL && n++ < 3) r = prim(); if (MODAL) closeModal();
    ok('R2 unified: a stored whole-mode audience shows its Self-Paced options ticked and is not rewritten by an unchanged save', te.on === [basic, plus].sort().join() && JSON.stringify(tok.aud) === '["mode:Self-Paced"]', te.on);
    // 8. a fee option added later: explicit audiences don't take it in; dynamic (all-participants) ones do
    const prem = optAdd('Self-Paced Premium', 1200, 'Self-Paced'); SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = prem; const fq = [...document.querySelectorAll('#ab-l option')].find(o => o.value && o.value !== lp && !/ — in /.test(o.textContent)); document.querySelector('#ab-l').value = fq.value; const lq = fq.value; prim(); closeModal(); // a learner new to the batch
    ok('R2 unified: an option added later doesn\'t change explicit audiences (one-off, weekly) — its learner isn\'t in', r2Same(s1.aud, [plus, fa]) && !n4Eligible(s1).includes(lq) && wcls.every(x => !n4Eligible(x).includes(lq)));
    ok('R2 unified: …while an all-participants session includes them (dynamic)', n4Eligible(old).includes(lq));
    ACT.s4bSessEdit({ dataset: { id: s1.id } }); ok('R2 unified: the edit dialog lists the new option, unticked', !!document.querySelector(`#modal-root .r2-g[value="${prem}"]`) && !document.querySelector(`#modal-root .r2-g[value="${prem}"]:checked`)); closeModal();
    // 5. shared classes: a learner in two batches taking part is counted once
    const b2 = ADMIN.batches.find(x => x.code !== MIXB && r2Pid(x) === r2Pid(b) && S4B_LIVE(x)); b2.roster.push(['x', lp, 'Self-funded']); b2.r2 = b2.r2 || {}; b2.r2[lp] = { opt: plus };
    ACT.addSession({ dataset: { b: MIXB } }); const w2 = document.querySelector(`#modal-root .se-w[value="${b2.code}"]`);
    if (w2) { w2.checked = true; w2.dispatchEvent(new Event('change', { bubbles: true })); }
    const cntPlus = (document.querySelector(`#modal-root .r2-n[data-o="${plus}"]`) || {}).textContent, lids = r2OptLids([MIXB, b2.code]), uni = new Set(Object.values(lids).flatMap(x => [...x]));
    ok('R2 unified: shared class — a learner in both batches counts once (per option and in the total)', !!w2 && cntPlus === '· 1 learner' && new RegExp('· ' + uni.size + ' learner').test(document.querySelector('#modal-root .r2-sum').textContent), [cntPlus, document.querySelector('#modal-root .r2-sum').textContent, uni.size].join(' / ')); closeModal();
    // 10. cancelling one class of a plan keeps the rest and every record
    const c0 = wcls[0], h0 = c0.hist.length; ACT.s4bSessCancel({ dataset: { id: c0.id, b: MIXB } }); reason('Room unavailable');
    ok('R2 unified: cancelling one weekly class keeps it (cancelled, history kept, audience kept); the plan\'s other classes stay', c0.status === 'Cancelled' && c0.hist.length > h0 && r2Same(c0.aud, [plus, fa]) && wcls.slice(1).every(x => x.status !== 'Cancelled') && Object.values(N3().plans[MIXB].occ).includes(c0.id));
  });

  await T('R2 unified: every Level 3 session-creation entry point opens the common selector; the Schedule area', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced Basic', 600, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const common = () => !!document.querySelector('#modal-root .r2-aud') && (document.querySelector('#modal-root .r2-aud legend') || {}).textContent === 'Who should attend?' && !document.querySelector('#modal-root input[name="r2-aud"]') && !!document.querySelector('#modal-root [data-act="r2AudAll"]');
    go('a-batches', { id: MIXB, tab: 'schedule' });
    const sec = app().querySelector('.r2-sched'), acts = sec && sec.querySelector('.r2-sched-acts');
    ok('R2 Schedule area: "Add one session" and "Add weekly recurring classes" together; weekly plans and sessions in the same card; no "Session audiences" card', !!acts && /Add one session/.test(acts.textContent) && /Add weekly recurring classes/.test(acts.textContent) && /Weekly recurring classes/.test(sec.textContent) && /Sessions and timetable/.test(sec.textContent) && !/Session audiences/.test(main()));
    ok('R2 Schedule area: every class row says what it is and who it\'s for', [...sec.querySelectorAll('tbody tr')].filter(tr => /Class \/ session/.test(tr.textContent)).every(tr => !!tr.querySelector('.r2-kind') && /For: /.test(tr.textContent)));
    const entry = [];
    ACT.addSession({ dataset: { b: MIXB } }); entry.push(['Add one session', common()]); closeModal();
    const lim = [...app().querySelectorAll('.n3-plan [data-act="addSession"]')][0]; if (lim) { ACT.addSession({ dataset: { ...lim.dataset } }); entry.push(['Limited "Add a class" (Self-Paced options preset)', common() && !!document.querySelector(`#modal-root .r2-g[value="${sp}"]:checked`) && !document.querySelector(`#modal-root .r2-g[value="${fa}"]:checked`)]); closeModal(); } else entry.push(['Limited "Add a class"', false]);
    setUi('s4bSchedB', MIXB); go('a-scheduling'); ACT.addSession({ dataset: { b: MIXB } }); entry.push(['Scheduling console Add session', common()]); closeModal();
    ACT.n3Weekly({ dataset: { b: MIXB, w: 'new' } }); entry.push(['New weekly plan', common()]); closeModal();
    const s = sessAdd(MIXB, { t: 'Entry check', at: D(2, '10:00') }); ACT.s4bSessEdit({ dataset: { id: s.id } }); entry.push(['Edit session', common()]); closeModal();
    ok('R2 unified: Add one session, limited "Add a class", scheduling console, weekly plan and Edit session all use the common selector', entry.every(e => e[1]), entry.map(e => e[0] + '=' + e[1]).join('; '));
    // 12. other levels unchanged
    go('a-batches', { id: 'L2DC-MAR26', tab: 'schedule' }); ok('R2 unified: a Level 2 batch keeps its Schedule tab and Add session (no fee-option selector)', !app().querySelector('.r2-sched') && [...app().querySelectorAll('main h2')].some(h => h.textContent === 'Schedule') && (ACT.addSession({ dataset: { b: 'L2DC-MAR26' } }), !document.querySelector('#modal-root .r2-aud'))); closeModal();
  });


  /* ================= R2 (final) — classes of the batch's generated timetable use the same selector ================= */
  await T('R2 timetable classes: Edit shows the common selector; no-op and date-only edits unchanged; a new audience gives the class its own record', async () => {
    fresh(); SA(); const sp = optAdd('Self-Paced Basic', 600, 'Self-Paced'), fa = optAdd('Fully Assisted', 1800, 'Fully Assisted');
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', sp); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'instalment', b); SA();
    const tt = batchEvents(b).find(e => e.type === 'class' && !e.s4), id = tt.id, ev = { id };
    go('a-batches', { id: MIXB, tab: 'schedule' }); const row = [...app().querySelectorAll('.r2-sched tbody tr')].find(tr => tr.querySelector(`[data-id="${id}"]`));
    ok('R2 tt: the timetable class is labelled "Batch timetable", for all learners in the batch, with its Edit', !!row && /Batch timetable/.test(row.textContent) && /For: All learners in the batch/.test(row.textContent) && !!row.querySelector('[data-act="kEditEv"]'));
    ok('R2 tt: both learners have it on their calendar (dynamic all-participants)', has(d, ev) && has(f, ev));
    const nA = ADMIN.audit.length, nd = d.notifs.length, nf = f.notifs.length, ov0 = JSON.stringify(STORE.evOver || {});
    ACT.kEditEv({ dataset: { b: MIXB, id } });
    ok('R2 tt: its Edit shows the common selector — every option ticked, the all-participants note, no radio', !!document.querySelector('#modal-root .r2-aud') && (document.querySelector('#modal-root .r2-aud legend') || {}).textContent === 'Who should attend?' && document.querySelectorAll('#modal-root .r2-g:checked').length === document.querySelectorAll('#modal-root .r2-g').length && /including anyone who joins later/.test(mroot().textContent) && !document.querySelector('#modal-root input[name="r2-aud"]'));
    fill({ '#ke-r': 'Just checking' }); let r = prim(); if (MODAL) closeModal();
    ok('R2 tt: a save that changes nothing records nothing — no audit, no record, no notices, no date override', ADMIN.audit.length === nA && !s4bSessById(id) && d.notifs.length === nd && f.notifs.length === nf && JSON.stringify(STORE.evOver || {}) === ov0);
    ACT.kEditEv({ dataset: { b: MIXB, id } }); const nt = new Date(new Date(tt.start).getTime() + DAY).toISOString(); fill({ '#ke-n': nt.slice(0, 16), '#ke-r': 'Moved a day' }); r = prim(); if (r === false && MODAL) r = prim(); if (MODAL) closeModal();
    const moved = batchEvents(b).find(e => e.id === id);
    ok('R2 tt: a date-only change keeps the existing edit — moved, audited, still for everyone, no record of its own', moved.start === nt && ADMIN.audit[0].action === 'Schedule changed' && !s4bSessById(id) && has(d, ev) && has(f, ev));
    const nd2 = d.notifs.length, nf2 = f.notifs.length, nA2 = ADMIN.audit.length;
    ACT.kEditEv({ dataset: { b: MIXB, id } }); document.querySelectorAll('#modal-root .r2-g').forEach(x => { x.checked = x.value === fa; }); fill({ '#ke-r': 'Fully Assisted only' }); r = prim(); if (r === false && MODAL) r = prim(); if (MODAL) closeModal();
    const rec = s4bSessById(id);
    ok('R2 tt: changing the ticks gives the class its own record (same ID, same time, teacher and link) with exactly that option', !!rec && rec.tt && rec.batch === MIXB && r2Same(rec.aud, [fa]) && rec.start === nt && rec.teacher === moved.teacher && rec.link === moved.link);
    ok('R2 tt: shown once in the timetable, still labelled "Batch timetable", now edited as a session', batchEvents(b).filter(e => e.id === id).length === 1 && (go('a-batches', { id: MIXB, tab: 'schedule' }), (() => { const tr = [...app().querySelectorAll('.r2-sched tbody tr')].find(x => x.querySelector(`[data-id="${id}"]`)); return !!tr && /Batch timetable/.test(tr.textContent) && /For: £1,800\.00 — Fully Assisted/.test(tr.textContent) && !!tr.querySelector('[data-act="s4bSessEdit"]'); })()));
    ok('R2 tt: Daniel (not selected) loses it and is told once; Fatima keeps it; one audit entry', !has(d, ev) && has(f, ev) && d.notifs.length === nd2 + 1 && f.notifs.length === nf2 && ADMIN.audit.length === nA2 + 1 && ADMIN.audit[0].action === 'Session audience changed');
    rec.start = D(0, '00:01'); rec.end = D(0, '23:00'); ACT.n4Import({ dataset: { s: id } }); const rows = (N4().regs[id] || {}).rows || {};
    ok('R2 tt: the register lists the audience only; Daniel is never marked absent', !!rows[f.me.id] && !rows[d.me.id]);
    const h0 = rec.hist.length; ACT.s4bSessEdit({ dataset: { id } }); fill({ '#se-r': 'Look' }); r = prim(); if (MODAL) closeModal();
    ok('R2 tt: then a no-op session edit keeps it exactly', r2Same(rec.aud, [fa]) && rec.hist.length === h0);
    ACT.kEditEv({ dataset: { b: 'L2DC-MAR26', id: batchEvents(ADMIN.batches.find(x => x.code === 'L2DC-MAR26')).find(e => e.type === 'class' && !e.s4).id } });
    ok('R2 tt: a Level 2 timetable class keeps the existing edit (no fee-option selector)', !!MODAL && !document.querySelector('#modal-root .r2-aud') && !!document.querySelector('#ke-n')); closeModal();
  });

  /* ================= R5 UI review — consistency of the affected screens ================= */
  await T('R5 UI review: Coordinator review screen — drafts, publish all, written comment secondary, no stale wording', async () => {
    fresh(); COO('A'); const s = mySubmissions(true).find(x => x.live && x.status === 'Submitted'), a = synthAsg(s), w = STORE.worlds[s.L.v], [q1, q2] = a.qs;
    go('c-submissions'); ok('UI submissions: new subtitle; the old "plain written feedback" wording is gone', /evaluate individual criteria and publish feedback directly to learners/.test(main()) && !/plain written feedback|Marking is done by Teachers/.test(main()));
    go('c-sub', { id: s.key });
    ok('UI review: no "plain written feedback only" panel; one criterion panel per answer', !/plain written feedback only/.test(main()) && app().querySelectorAll('main .r3-cq .r3-cq-crit').length === a.qs.length);
    ok('UI review: the lock note says verification and Pass / Fail stay with the Assessor', !/Marking and verification are done by the Teacher\/Assessor/.test(app().innerHTML));
    const n0 = w.notifs.length;
    document.querySelector('#r3-cv-' + q1.id).value = 'Met'; document.querySelector('#r3-ct-' + q1.id).value = 'Strong answer.'; ACT.r3CooDraft({ dataset: { k: s.key, q: q1.id } });
    document.querySelector('#r3-cv-' + q2.id).value = 'Not Met'; ACT.r3CooDraft({ dataset: { k: s.key, q: q2.id } });
    ok('UI drafts: saved, not published, the learner isn\'t notified and doesn\'t see them', Object.keys(r3CDraft(s.key)).length === 2 && !r3Judg(s.key).some(j => j.role === 'Academic Coordinator') && w.notifs.length === n0 && (learner(s.L.v), go('assignment', { id: a.id }), !app().querySelector('.r3-learner')));
    COO('A'); go('c-sub', { id: s.key }); ok('UI drafts: shown on the review with "not visible to the learner"; Publish all drafts offered', /not visible to the learner yet/.test(main()) && !!app().querySelector('[data-act="r3CooPubAll"]') && document.querySelector('#r3-cv-' + q1.id).value === 'Met');
    ACT.r3CooPubAll({ dataset: { k: s.key } }); ok('UI publish all: only complete drafts are offered (the one without feedback stays a draft)', !!MODAL && /Publish 1 draft/.test(MODAL.title)); prim(); closeModal();
    ok('UI publish all: published, learner notified once, the incomplete draft kept', r3Latest(s.key, q1.crit, 'Academic Coordinator', true).value === 'Met' && w.notifs.length === n0 + 1 && !!r3CDraft(s.key)[q2.id] && !r3CDraft(s.key)[q1.id]);
    COO('B'); ACT.r3CooDraft({ dataset: { k: s.key, q: q2.id } }); ACT.r3CooPubAll({ dataset: { k: s.key } }); ok('UI (negative) another batch\'s Coordinator can\'t save or publish drafts', !MODAL && r3CDraft(s.key)[q2.id].value === 'Not Met' && ADMIN.security.some(x => /save a criterion draft/.test(x.detail)));
    COO('A'); go('c-submissions'); setUi('csTab', 'mine'); render(); ok('UI submissions: "Has my feedback" counts criterion feedback', (DT['csubs-mine'] ? DT['csubs-mine'].rows : []).some(r => r.key === s.key));
    setUi('csTab', 'all'); go('c-sub', { id: s.key }); ok('UI review: on a phone the floating main action is "Publish all drafts"', MOB_MAIN.find(m => m.r === 'c-sub').sel === '#main [data-act="r3CooPubAll"]');
    ok('UI review: the written comment is secondary and still works', !!app().querySelector('details.r3-cold #cf-body') && (STORE.coo.drafts[s.key] = { text: 'Well structured.', scope: 'Overall submission' }, ACT.cfPost({ dataset: { k: s.key } }), prim(), (s.live.coordAll || []).some(c => c.text === 'Well structured.')));
    TCH('A'); S.tas.qi = 0; go('t-mark', { id: s.key }); ok('UI workspace: the Assessor sees the Coordinator\'s published judgement beside the criterion', !!app().querySelector('.r3-cooj') && /Met/.test(app().querySelector('.r3-cooj').textContent));
  });

  /* ================= R5 — cross-stage journeys ================= */
  await T('R5 journey: fee options → mixed batch → targeted sessions → Self-Paced submissions → judgements → outcome → preservation → persistence', async () => {
    fresh(); const keep = JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.signup.plan.fee, STORE.worlds.B.signup.plan.fee, STORE.worlds.B.admission.deposit, STORE.worlds.D.plans, STORE.chFees, NVQ_FEES]);
    const done0 = Object.values(STORE.worlds).flatMap(w => (w.assignments || []).filter(a => a.status === 'Completed').map(a => w.v + a.id)).join();
    // 1 configure Level 3 fee options (Finance adds one, the Super Admin another)
    FA(); const sp = optAdd('Self-Paced — monthly', 600, 'Self-Paced', 'New option'); SA(); const fa = optAdd('Fully Assisted — weekly', 1200, 'Fully Assisted', 'New option');
    ok('R5 #1 Level 3 fee options configured by Finance and the Super Admin', !!sp && !!fa && r1Opts().length === 3);
    // 2–3 enrol on different options, same batch
    const b = ADMIN.batches.find(x => x.code === MIXB), d = apply3('A', sp); finish(d, 'instalment', b); const f = apply3('F', fa); finish(f, 'deposit', b);
    ok('R5 #2 enrolled on different options with frozen fees (£600 SP, £1,200 FA)', d.signup.plan.fee === 600 && f.signup.plan.fee === 1200 && d.plans.find(p => p.e === 'nvq').feeOpt.id === sp && f.plans.find(p => p.e === 'nvq').feeOpt.id === fa);
    ok('R5 #3 Self-Paced and Fully Assisted learners in the same batch', d.signup.batch === MIXB && f.signup.batch === MIXB && r2IsMixed(b));
    SA(); ACT.addToBatch({ dataset: { id: MIXB } }); document.querySelector('#r2-ab-o').value = 'L3-FO-STD'; const lg = document.querySelector('#ab-l').value; prim(); closeModal();
    // 4–6 targeted sessions: visibility, access, attendance
    SA(); const sSP = sessAdd(MIXB, { t: 'SP live class', at: D(0, '00:01'), mins: 480, aud: [sp] }), sFA = sessAdd(MIXB, { t: 'FA live class', at: D(2, '10:00'), aud: [fa] });
    ok('R5 #4 targeted Zoom sessions created', JSON.stringify(sSP.aud) === JSON.stringify([sp]) && JSON.stringify(sFA.aud) === JSON.stringify([fa]));
    learner('A'); go('calendar'); const dSees = has(d, sSP) && !has(d, sFA); ACT.joinZoom({ dataset: { id: 'bs-' + sSP.id } }); const dJoin = !!MODAL; closeModal(); ACT.joinZoom({ dataset: { id: 'bs-' + sFA.id } }); const dNo = !MODAL; closeModal();
    learner('F'); go('calendar'); const fSees = has(f, sFA) && !has(f, sSP);
    ok('R5 #5 only eligible learners see sessions and get the Zoom link', dSees && dJoin && dNo && fSees);
    SA(); ACT.n4Import({ dataset: { s: sSP.id } }); const rows = N4().regs[sSP.id].rows;
    ok('R5 #6 attendance: the Self-Paced learner is on the register; the Fully Assisted learner and the legacy cohort aren\'t (not marked absent)', !!rows[d.me.id] && !rows[f.me.id] && !rows[lg]);
    // 7 several Self-Paced submissions together (two assignments published to the batch)
    const pub = t => { SA(); go('a-assignments'); ACT.newAsg(); const u = document.querySelector('#na-u'); u.value = [...u.options].find(o => /^U306 · Module 1/.test(o.textContent)).value; fill({ '#na-t': t, '#na-d': D(25, '21:59').slice(0, 16) }); prim(); const x = s2Defs().find(y => y.title === t); ACT.s2QAdd({ dataset: { id: x.id } }); fill({ '#aq-t': 'Describe your practice.' }); prim(); go('a-assignments', { id: x.id, tab: 'mapping' }); x.qs.filter(q => q.status === 'Active').forEach(q => { const box = app().querySelector('[data-onchange="mapChange"][data-q="' + q.id + '"]'); box.checked = true; INP.mapChange(box); }); ACT.pubAsg({ dataset: { id: x.id } }); $$('.s2-pb').forEach(y => { y.checked = y.value === MIXB; }); reason('Publish'); return x; };
    const x1 = pub('R5 Assignment A'), x2 = pub('R5 Assignment B'); learner('A'); const at = now().toISOString();
    const two = [x1, x2].map(x => d.assignments.find(a => a.id === x.id)).filter(Boolean); two.forEach(a => { a.qs.forEach(q => { d.drafts[a.id + '.' + q.id + '.0'] = '<p>My practice.</p>'; }); finaliseSubmit(a, false, at); }); closeModal(); // (the learner's 'Submission received' confirmation)
    go('assignments'); ok('R5 #7 the Self-Paced learner submits two assignments together; told how the monthly review works', two.length === 2 && two.every(a => a.status === 'Submitted') && !!app().querySelector('.r4-learner'));
    // 8–10 on a seeded cohort learner (the marking queues list seeded cohorts only — prototype limitation)
    const jb = ADMIN.batches.find(x => x.code === 'L3AC-JAN26'), lid = chCohLids(jb).find(l => !Object.values(STORE.worlds).some(w => w.me.id === l)); jb.r2 = jb.r2 || {}; jb.r2[lid] = { opt: sp, by: 'R5 test', at: now().toISOString() };
    TCH('A'); const s = tasSubs(true).find(r => r.L.lid === lid && r.toMark && markable(tasAsg(r)).length);
    ok('R5 #8a the Self-Paced cohort learner\'s submission is in the Self-Paced worklist', !!s && r4IsSP(s)); if (!s) return;
    const q = markable(tasAsg(s))[0]; go('t-mark', { id: s.key }); ACT.mkMet({ dataset: { k: s.key, q: q.id, v: 'Partially Met' } }); await wait(800); // the marking draft auto-saves after 600 ms
    COO('A'); go('c-sub', { id: s.key }); document.querySelector('#r3-cv-' + q.id).value = 'Not Met'; document.querySelector('#r3-ct-' + q.id).value = 'Add evidence from practice.'; ACT.r3CooJudge({ dataset: { k: s.key, q: q.id } });
    ok('R5 #8 Coordinator criterion feedback published at once; the Assessor\'s judgement kept separately', r3Latest(s.key, q.crit, 'Academic Coordinator').published && r3Latest(s.key, q.crit, 'Academic Coordinator').value === 'Not Met' && r3Latest(s.key, q.crit, 'Assessor').value === 'Partially Met');
    ACT.r3Declare({ dataset: { k: s.key } }); ok('R5 #10a the Coordinator can\'t declare the outcome', !MODAL && !r3Out(s.key), (MODAL ? MODAL.title : 'no modal') + ' / ' + JSON.stringify(r3Out(s.key)));
    TCH('S'); ACT.r3Declare({ dataset: { k: s.key } }); ok('R5 #10b an unallocated Assessor can\'t declare it', !MODAL && !r3Out(s.key));
    TCH('A'); declare(s.key, 'Pass', 'Evidence meets the brief overall');
    ok('R5 #9 the allocated Assessor declares the final outcome (Pass), independent of the criterion judgements', r3Out(s.key).result === 'Pass' && r3Out(s.key).by === 'Sarah Okonkwo');
    // 11 preservation
    ok('R5 #11 existing fees, payments, deposits and history unchanged; no Completed record gained an outcome', JSON.stringify([STORE.worlds.C.plans, STORE.worlds.C.signup.plan.fee, STORE.worlds.B.signup.plan.fee, STORE.worlds.B.admission.deposit, STORE.worlds.D.plans, STORE.chFees, NVQ_FEES]) === keep && Object.values(STORE.worlds).flatMap(w => (w.assignments || []).filter(a => a.status === 'Completed').map(a => w.v + a.id)).join() === done0 && Object.keys(R3().out).length === 1);
    // 12 persistence: admin rebuilds, variant switches, identity changes, persona and learner switches
    const snap = () => JSON.stringify([r1Opts().map(o => [o.id, o.fee, o.mode, o.status]), d.signup.plan.opt.id, f.signup.plan.opt.id, sSP.aud, sFA.aud, Object.keys(N4().regs[sSP.id].rows).sort(), r3Out(s.key).result, r3Judg(s.key).length, jb.r2[lid].opt, has(d, sSP), has(f, sSP)]);
    const s0 = snap(); rebuildA(); FA(); SA(); setAdminIdentity('FB'); SA(); TCH('M'); COO('B'); learner('C'); learner('A'); learner('F'); SA();
    ok('R5 #12 everything survives admin rebuilds, variant / identity changes and persona / learner switches', snap() === s0);
  });

  await T('R5 records: changelog, screen index, G6.4 amendment', async () => {
    fresh(); ACT.scOpen && ACT.scOpen(); go('ux-changelog'); ok('R5 UX Changelog: R1–R5 entries', ['Level 3 fee options', 'Mixed-mode Level 3 batches', 'final assignment outcome', 'Self-Paced monthly assignment worklists', 'integration and records'].every(t => main().includes(t)));
    const g = FD_ROWS.find(x => x[0] === 'G6.4'); ok('R5 Alignment Inventory: G6.4 recorded as amended (superseded completion rule)', /AMENDED[\s\S]*superseded/.test(g[4]));
    SA(); go('a-index'); const ix = [...app().querySelectorAll('main .idx-sec')].find(x => x.querySelector('h2').textContent === 'Client clarifications (Oct 2026)');
    ok('R5 Admin index: a separate section with purposes', !!ix && ix.querySelectorAll('li').length === 3 && [...ix.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')));
    TCH('A'); go('t-index'); ok('R5 Assessor index: R3 / R4 entries', /Client clarifications \(Oct 2026\)/.test(main()));
    TCH('T'); go('t-index'); ok('R5 Teacher-only index: no marking entries', !/Self-Paced monthly worklist/.test(main()));
    COO('A'); go('c-index'); ok('R5 Coordinator index: R3 / R4 entries', /Client clarifications \(Oct 2026\)/.test(main()));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
