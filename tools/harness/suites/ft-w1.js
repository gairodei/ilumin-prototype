// W1 — mixed-mode Level 3 batch corrections (20 Oct 2026). A Level 3 batch accepts fee-option groups, not one delivery mode; the
// learner's mode comes from their fee option; composition is worked out from the learners; enrolment, Add learner, waitlist, offers
// and transfers keep the learner's fee option; shared classes don't depend on the organiser's stored mode. Every check does the action
// through the screen or handler, then checks the consuming screen or record, and includes the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'W1 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const BIZ = () => { setAdminIdentity('BA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const T3 = 'Level 3 Diploma in Adult Care (England)', T2 = 'Level 2 Diploma in Care (England)';
  const day = n => D(n).slice(0, 10), plus = (iso, d, hm = '17:00') => new Date(new Date(iso).getTime() + d * DAY).toISOString().slice(0, 10) + 'T' + hm;
  const blocked = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action));
  // Two Level 3 fee options of the Diploma (it already has the Standard programme fee, L3-FO-STD)
  const opts = () => { SA(); const add = (label, fee, mode) => { r1AddOpt('NV-L3', { label, fee, mode }, 'W1', 'Added'); return r1Opts('NV-L3').find(o => o.label === label).id; }; return { sp: add('Self-Paced — W1', 1800, 'Self-Paced'), fa: add('Fully Assisted — W1', 2600, 'Fully Assisted'), std: 'L3-FO-STD' }; };
  // Create batch through the wizard; o.opts = the fee options to tick (default: as offered), o.dm = the standard-fee mode
  const nb = (code, course, o = {}) => {
    ACT.newBatch(); if (!MODAL) return null; fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = course; INP.n2NbCourse(co);
    if (o.start) fill({ '#nb-s': o.start, '#nb-e': o.end || day(900) }); document.querySelector('#nb-m').value = o.chan || 'Online';
    if (o.opts) { document.querySelectorAll('#modal-root .w1-nb-o').forEach(x => { x.checked = o.opts.includes(x.value); }); INP.w1NbStd(); }
    if (o.dm) document.querySelector('#nb-dm').value = o.dm;
    if (prim() === false) return { refused: true, msg: mroot().textContent };
    fill({ '#nb-ac': 'Dr Helen Carter' }); if (prim() === false) return null; prim(); prim(); const rev = mroot().textContent; prim(); closeModal();
    return { b: ADMIN.batches.find(x => x.code === code), rev };
  };
  const apply3 = (v, optId) => { learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === T3); ACT.applyNvq({ dataset: { id: c.id } }); const r = optId && document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; if (prim() !== false) closeModal(); return W; };
  const finish = (w, b) => { chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); closeModal(); return w; };
  const freeL = (skip = []) => { const busy = new Set(ADMIN.batches.filter(x => ['Open', 'In Progress', 'Planned'].includes(x.status)).flatMap(x => batchRoster(x).map(r => r[1]))); return ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && !busy.has(l.id) && !skip.includes(l.id) && !n4World(l.id)); };
  const addL = (code, lid, opt) => { ACT.addToBatch({ dataset: { id: code } }); if (!MODAL) return 'refused'; fill({ '#ab-l': lid }); if (opt !== undefined) fill({ '#r2-ab-o': opt }); const r = prim(); const msg = mroot().textContent; if (r !== false) closeModal(); return r === false ? msg : 'added'; };
  const sessAdd = (code, o) => { ACT.addSession({ dataset: { b: code } }); if (!MODAL) return null; fill({ '#se-n': o.t, '#se-d': o.at, '#se-m': '60' }); document.querySelector('#se-t').value = 'Marcus Bell'; if (o.aud) document.querySelectorAll('.r2-g').forEach(x => { x.checked = o.aud.includes(x.value); }); let r = prim(), n = 0; while (r === false && MODAL && n++ < 3 && !/Tick at least one/.test(mroot().textContent)) r = prim(); if (MODAL) closeModal(); return s4bAllSess().filter(s => s.title === o.t).pop(); };
  const rowOf = code => [...app().querySelectorAll('main tr')].find(r => r.textContent.includes(code));

  /* ================= 1. Create batch: fee-option groups, not one delivery mode ================= */
  await T('W1-A Create batch (Level 3): fee options accepted; a stored mode only for standard-fee learners', async () => {
    fresh(); const o = opts(); go('a-batches'); ACT.newBatch(); const co = document.querySelector('#nb-co'); co.value = T3; INP.n2NbCourse(co);
    const heads = [...document.querySelectorAll('#modal-root #w1-nb-acc .r2-gh')].map(x => x.textContent), ticks = [...document.querySelectorAll('#modal-root .w1-nb-o')];
    ok('W1-A step 1 lists the fee options the batch accepts, grouped Self-Paced / Fully Assisted / Standard fee, all ticked by default', heads.join('|') === 'Self-Paced|Fully Assisted|Standard fee (before fee options)' && ticks.length === 3 && ticks.every(x => x.checked) && /can hold Self-Paced and Fully Assisted learners at the same time/.test(mroot().textContent));
    const f = document.querySelector('#nb-dm').closest('.field');
    ok('W1-A the delivery-mode field is shown only for standard-fee learners (while that option is ticked)', f.style.display !== 'none' && /Delivery mode for standard-fee learners/.test(f.textContent));
    document.querySelector(`.w1-nb-o[value="${o.std}"]`).checked = false; INP.w1NbStd(); ok('W1-A …and hidden when the Standard programme fee is unticked', f.style.display === 'none');
    // PD-M-03 supersedes the message — was: /Choose at least one fee option/ — now: "Choose at least one delivery mode … (with at least one fee option)"
    ticks.forEach(x => { x.checked = false; }); fill({ '#nb-c': 'W1-NONE' });
    ok('W1-A (negative) at least one fee option is required', prim() === false && /Choose at least one delivery mode — Self-Paced, Fully Assisted or both \(with at least one fee option\)/.test(mroot().textContent)); closeModal();
    const a0 = ADMIN.audit.length, r1 = nb('W1-MIX', T3, { opts: [o.sp, o.fa] }), b = r1.b;
    ok('W1-A review step: "Fee options" and "From each learner\'s fee option" (no single delivery mode)', /Fee options/.test(r1.rev) && /Self-Paced: Self-Paced — W1/.test(r1.rev) && /From each learner's fee option/.test(r1.rev) && !/standard-fee learners:/.test(r1.rev));
    ok('W1-A created: accepts exactly the ticked options; no batch delivery mode stored', JSON.stringify(b.w1opts) === JSON.stringify([o.sp, o.fa]) && b.dmode === undefined && b.dmodeSrc === undefined);
    ok('W1-A audited "Fee options accepted set"; no "Delivery mode set" entry for it', ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Fee options accepted set' && x.entity.includes('W1-MIX')) && !ADMIN.audit.some(x => x.action === 'Delivery mode set' && x.entity.includes('W1-MIX')));
    const r2b = nb('W1-STD', T3, { dm: 'Self-Paced' });
    ok('W1-A with the Standard programme fee ticked: its learners\' mode is stored (Self-Paced) and audited', r2b.b.dmode === 'Self-Paced' && r2b.b.w1opts.includes(o.std) && /standard-fee learners: Self-Paced/.test(r2b.rev) && ADMIN.audit.some(x => x.action === 'Delivery mode set' && x.entity.includes('W1-STD')));
    const l2 = nb('W1-L2', T2, { dm: 'Self-Paced' });
    ok('W1-A Level 2 unchanged: no fee-option list; one delivery mode for the batch, stored and audited', !!l2.b && l2.b.dmode === 'Self-Paced' && !l2.b.w1opts && /Delivery mode/.test(l2.rev) && !/Fee options/.test(l2.rev));
    FA(); ACT.newBatch(); ok('W1-A (negative) Finance can\'t create a batch (refused, logged)', !MODAL && /^Blocked: create batch/.test(ADMIN.audit[0].action));
  });

  /* ================= 2. Composition from the learners; the learner sees their own mode ================= */
  await T('W1-B composition labels: No learners yet → Self-Paced → Mixed; Coordinator and learner views', async () => {
    fresh(); const o = opts(), b = nb('W1-MIX', T3, { opts: [o.sp, o.fa] }).b;
    go('a-batches'); ok('W1-B empty batch: "No learners yet" (no stored default shown)', /No learners yet/.test(rowOf('W1-MIX').textContent) && !/Fully Assisted|Self-Paced/.test(rowOf('W1-MIX').querySelector('.w1-comp').textContent));
    go('a-batches', { id: 'W1-MIX' }); ok('W1-B batch detail: fee options accepted, no batch delivery mode line', /Fee options accepted: Self-Paced: Self-Paced — W1 · Fully Assisted: Fully Assisted — W1/.test(main()) && !app().querySelector('main .n2-mode'));
    const d = apply3('A', o.sp); ok('W1-B sign-up panel: Daniel sees his own delivery mode (Self-Paced)', /Your delivery mode: Self-Paced/.test(chAssignedHtml(d)));
    finish(d, b); ok('W1-B enrolment keeps the fee option and its delivery mode', d.signup.done && d.signup.plan.opt.id === o.sp && d.nvq.dmode === 'Self-Paced' && r2ModeOfW(d) === 'Self-Paced');
    SA(); go('a-batches'); ok('W1-B one Self-Paced learner: "Self-Paced"', /Self-Paced/.test(rowOf('W1-MIX').querySelector('.w1-comp').textContent) && !/Mixed/.test(rowOf('W1-MIX').textContent));
    const f = finish(apply3('F', o.fa), b); SA(); go('a-batches');
    ok('W1-B a Fully Assisted learner too: "Mixed", 1 Fully Assisted · 1 Self-Paced — in one batch', f.signup.batch === 'W1-MIX' && /Mixed/.test(rowOf('W1-MIX').textContent) && /1 Fully Assisted · 1 Self-Paced/.test(rowOf('W1-MIX').textContent));
    COO('A'); setUi('cbTab', 'planned'); go('c-batches'); ok('W1-B Coordinator batch list: "Mixed"', !!rowOf('W1-MIX') && /Mixed/.test(rowOf('W1-MIX').textContent));
    go('c-batches', { id: 'W1-MIX' }); ok('W1-B Coordinator overview: the description follows the composition (mixed); fee options accepted', /Mixed batch\. Fully Assisted learners:/.test(main()) && /Self-Paced learners: a limited number of scheduled classes/.test(main()) && /Fee options accepted/.test(main()));
    go('c-batches', { id: 'W1-MIX', tab: 'roster' }); const rows = [...app().querySelectorAll('main tbody tr')].map(r => r.textContent);
    ok('W1-B Coordinator roster: each learner\'s own delivery mode and fee option (the two groups told apart)', rows.some(t => /Daniel Okafor/.test(t) && /Self-Paced/.test(t) && /Self-Paced — W1/.test(t)) && rows.some(t => /Fatima/.test(t) && /Fully Assisted/.test(t) && /Fully Assisted — W1/.test(t)));
    learner('A'); go('course', { id: 'nvq' }); ok('W1-B learner overview: his own mode (the batch stores none)', /Self-Paced/.test((app().querySelector('.n2-mode') || {}).textContent || '') && /Your own delivery mode, from your fee option/.test(main()));
    SA(); go('a-batches'); ok('W1-B seeded Level 3 batch with legacy learners: its composition (Fully Assisted)', /Fully Assisted/.test(rowOf('L3AC-JAN26').querySelector('.w1-comp').textContent));
    ok('W1-B Level 2 batch: the stored mode, as before', /Fully Assisted/.test(rowOf('L2DC-MAR26').textContent) && !rowOf('L2DC-MAR26').querySelector('.w1-comp'));
  });
  await T('W1-B the Academy assigns only a batch that accepts the learner\'s fee option', async () => {
    fresh(); const o = opts(); ADMIN.batches.filter(b => b.course === T3).forEach(b => { b.enrolled = b.cap; }); // every other Level 3 batch full
    const faOnly = nb('W1-FAONLY', T3, { opts: [o.fa], start: day(40) }).b;
    let d = apply3('A', o.sp); ok('W1-B (negative) a Self-Paced learner is not assigned a batch that accepts only Fully Assisted', !chNearestFor(d) && /No batch has a place right now/.test(chAssignedHtml(d)));
    const f = apply3('F', o.fa); ok('W1-B a Fully Assisted learner is assigned it', (chNearestFor(f) || {}).code === 'W1-FAONLY');
    SA(); nb('W1-SPONLY', T3, { opts: [o.sp], start: day(45) }); d = apply3('A', o.sp); ok('W1-B …and the Self-Paced learner gets the batch that accepts Self-Paced', (chNearestFor(d) || {}).code === 'W1-SPONLY' && faOnly.enrolled === 0);
  });

  /* ================= 3. Add learner, waitlist and offers keep the fee option ================= */
  await T('W1-C Add learner: no preselected standard fee; the learner\'s own option is kept; no double place', async () => {
    fresh(); const o = opts(), b = nb('W1-ADD', T3).b; SA(); const l1 = freeL();
    ACT.addToBatch({ dataset: { id: 'W1-ADD' } });
    ok('W1-C the fee-option group starts empty ("Choose…") — the Standard programme fee isn\'t preselected', document.querySelector('#r2-ab-o').value === '' && /Choose the learner's fee-option group/.test(mroot().textContent)); closeModal();
    ok('W1-C (negative) adding without a group is refused', /Choose the learner's fee-option group/.test(addL('W1-ADD', l1.id, '')) && !b.roster.some(r => r[1] === l1.id));
    ok('W1-C added with the Fully Assisted group: recorded, Fully Assisted in this batch', addL('W1-ADD', l1.id, o.fa) === 'added' && b.r2[l1.id].opt === o.fa && r2LidInfo(l1.id, 'W1-ADD').mode === 'Fully Assisted');
    const e0 = b.enrolled; ok('W1-C (negative) the same learner can\'t take a second place in the batch', /already in W1-ADD/.test(addL('W1-ADD', l1.id, o.sp)) && b.enrolled === e0 && b.roster.filter(r => r[1] === l1.id).length === 1);
    const only = nb('W1-SPO', T3, { opts: [o.sp] }).b; SA(); ACT.addToBatch({ dataset: { id: 'W1-SPO' } });
    ok('W1-C only the options the batch accepts are offered', [...document.querySelectorAll('#r2-ab-o option')].map(x => x.value).join() === ',' + o.sp); closeModal();
    const d = finish(apply3('A', o.sp), b); SA();
    const other = nb('W1-ADD2', T3).b; SA(); ACT.addToBatch({ dataset: { id: 'W1-ADD2' } }); document.querySelector('#ab-l').insertAdjacentHTML('beforeend', `<option value="${d.me.id}">Daniel Okafor</option>`); fill({ '#ab-l': d.me.id, '#r2-ab-o': o.fa });
    const rd = prim(), md = mroot().textContent; closeModal();
    ok('W1-C (negative) a signed-up learner keeps the option they agreed — another group is refused', rd === false && /fee option is .*Self-Paced — W1 \(agreed at sign-up\)/.test(md) && !other.roster.some(r => r[1] === d.me.id));
    const l2 = freeL([l1.id]); ok('W1-C (negative) Add learner: a group the batch doesn\'t accept is refused (direct value)', (() => { ACT.addToBatch({ dataset: { id: 'W1-SPO' } }); fill({ '#ab-l': l2.id }); document.querySelector('#r2-ab-o').insertAdjacentHTML('beforeend', `<option value="${o.fa}">x</option>`); fill({ '#r2-ab-o': o.fa }); const r = prim(); const m = mroot().textContent; closeModal(); return r === false && /doesn't accept/.test(m); })() && !only.roster.some(r => r[1] === l2.id));
    BIZ(); ok('W1-C (negative) a Business Admin is refused by the existing actor check (S5e), logged', (() => { const a0 = ADMIN.audit.length; ACT.addToBatch({ dataset: { id: 'W1-ADD' } }); const m = !!MODAL; closeModal(); return !m && blocked(a0); })());
  });
  await T('W1-C waitlist and offers keep the learner and their fee option', async () => {
    fresh(); const o = opts(), b = nb('W1-WL', T3, { start: day(380), end: day(800) }).b; SA(); const l = freeL(); b.cap = b.enrolled; // full
    const w0 = b.wait; ok('W1-C a full batch: the learner joins the waitlist with their fee option', addL('W1-WL', l.id, o.fa) === 'added' && b.wait === w0 + 1 && b.w1wait.length === 1 && b.w1wait[0].lid === l.id && b.w1wait[0].opt === o.fa);
    go('a-batches', { id: 'W1-WL', tab: 'waitlist' }); const li = app().querySelector('main .w1-wl');
    ok('W1-C the waitlist shows the learner, their fee option and mode, with Offer place / Move to next intake', !!li && li.textContent.includes(l.name) && /Fully Assisted — W1/.test(li.textContent) && /Fully Assisted/.test(li.textContent) && !!li.querySelector('[data-act="kOffer"][data-w1]'));
    ok('W1-C (negative) an option held by a waitlisted learner can\'t be removed from the batch', (() => { ACT.w1Opts({ dataset: { id: 'W1-WL' } }); const x = document.querySelector(`#modal-root .w1-o[value="${o.fa}"]`); const dis = x.disabled; x.disabled = false; x.checked = false; const r = reason('Drop FA'); const m = mroot().textContent; closeModal(); return dis && r === false && /held by learners in this batch/.test(m) && b.w1wait.length === 1; })());
    const ent = b.w1wait[0]; BIZ(); const a0 = ADMIN.audit.length; ACT.kOffer({ dataset: { id: 'W1-WL', n: ent.name, w1: ent.id } });
    ok('W1-C (negative) a Business Admin can\'t offer the place (refused, logged)', !MODAL && blocked(a0) && b.w1wait.length === 1);
    SA(); b.cap = b.enrolled + 1; ACT.kOffer({ dataset: { id: 'W1-WL', n: ent.name, w1: ent.id } }); ok('W1-C the offer states the fee option kept', /Fully Assisted — W1/.test(mroot().textContent)); reason('Place free');
    ok('W1-C offered: in the roster as themselves, on the same fee option and mode; off the waitlist', b.roster.some(r => r[1] === l.id) && b.r2[l.id].opt === o.fa && r2LidInfo(l.id, 'W1-WL').mode === 'Fully Assisted' && !b.w1wait.length && b.wait === w0);
    const l2 = freeL([l.id]); b.cap = b.enrolled; addL('W1-WL', l2.id, o.sp); const e2 = b.w1wait[0]; b.w1opts = b.w1opts.filter(x => x !== o.sp); b.cap = b.enrolled + 1;
    ACT.kOffer({ dataset: { id: 'W1-WL', n: e2.name, w1: e2.id } }); ok('W1-C (negative) if the batch no longer accepts the learner\'s option, the offer is refused — the option isn\'t replaced', !MODAL && /isn't replaced/.test(ADMIN.audit[0].reason) && b.w1wait.length === 1 && !b.roster.some(r => r[1] === l2.id));
    b.w1opts.push(o.sp); const spLater = nb('W1-WL2', T3, { opts: [o.fa], start: day(390), end: day(800) }).b; SA();
    ACT.kNextIntake({ dataset: { id: 'W1-WL', n: e2.name, w1: e2.id } }); ok('W1-C (negative) next intake: a later batch that doesn\'t accept the option is skipped; the learner stays', !MODAL && b.w1wait.length === 1 && !(spLater.w1wait || []).length);
    const nx = nb('W1-WL3', T3, { opts: [o.sp], start: day(395), end: day(800) }).b; SA(); ACT.kNextIntake({ dataset: { id: 'W1-WL', n: e2.name, w1: e2.id } }); reason('Next intake');
    ok('W1-C moved to the next intake that accepts it, keeping the fee option', !b.w1wait.length && nx.w1wait.length === 1 && nx.w1wait[0].opt === o.sp && nx.w1wait[0].lid === l2.id && nx.wait === 1);
  });

  /* ================= 4. Transfers keep the agreed fee, mode and payments ================= */
  await T('W1-D transfers: only to a batch that accepts the fee option; nothing is replaced', async () => {
    fresh(); const o = opts(), a = nb('W1-TA', T3, { start: day(50) }).b, fa = nb('W1-TFA', T3, { opts: [o.fa], start: day(55) }).b, sp = nb('W1-TSP', T3, { opts: [o.sp], start: day(58) }).b;
    const d = finish(apply3('A', o.sp), a), snap = JSON.stringify([d.signup.plan, d.plans, d.nvq.feeOpt, d.nvq.dmode]); SA();
    ACT.chMoveBatch({ dataset: { id: d.me.id } }); const opts2 = [...document.querySelectorAll('#ch-mv-b option')].map(x => x.value);
    ok('W1-D the transfer list offers only batches that accept the learner\'s fee option', opts2.includes('W1-TSP') && !opts2.includes('W1-TFA') && /fee option \(£1,800\.00 — Self-Paced — W1, Self-Paced\)/.test(mroot().textContent));
    fill({ '#ch-mv-b': 'W1-TSP' }); reason('Later start');
    ok('W1-D moved: same fee option, delivery mode, fee and payment rows (nothing recalculated)', d.signup.batch === 'W1-TSP' && JSON.stringify([d.signup.plan, d.plans, d.nvq.feeOpt, d.nvq.dmode]) === snap && r2ModeOfW(d) === 'Self-Paced' && sp.enrolled === 1 && a.enrolled === 0);
    ok('W1-D (negative) a direct move to a batch that doesn\'t accept the option is refused; nothing moves', chDoMove(d.me.id, sp, fa, 'Forced') === false && d.signup.batch === 'W1-TSP' && fa.enrolled === 0 && /isn't replaced/.test(ADMIN.audit[0].reason));
    FA(); const a0 = ADMIN.audit.length; ACT.chMoveBatch({ dataset: { id: d.me.id } }); ok('W1-D (negative) Finance can\'t change a learner\'s batch (refused, logged)', !MODAL && blocked(a0));
  });

  /* ================= 5. Sessions: mixed audiences; Self-Paced batches join shared classes ================= */
  await T('W1-E a mixed audience: both modes attend one session (calendar, Zoom, register); a targeted one keeps the other out', async () => {
    fresh(); const o = opts(), b = nb('W1-SES', T3, { opts: [o.sp, o.fa] }).b, d = finish(apply3('A', o.sp), b), f = finish(apply3('F', o.fa), b); SA();
    const both = sessAdd('W1-SES', { t: 'W1 mixed class', at: plus(b.start, 7), aud: [o.sp, o.fa] }), spOnly = sessAdd('W1-SES', { t: 'W1 Self-Paced class', at: plus(b.start, 8), aud: [o.sp] });
    ok('W1-E both sessions saved with explicit fee-option audiences', !!both && !!spOnly && JSON.stringify(both.aud) === JSON.stringify([o.sp, o.fa]) && JSON.stringify(spOnly.aud) === JSON.stringify([o.sp]));
    ok('W1-E mixed session: both learners are eligible and on the register', n4Eligible(both).includes(d.me.id) && n4Eligible(both).includes(f.me.id));
    ok('W1-E Self-Paced session: only the Self-Paced learner', n4Eligible(spOnly).includes(d.me.id) && !n4Eligible(spOnly).includes(f.me.id));
    learner('A'); render(); const hasD = id => (STORE.worlds.A.events || []).some(e => e.id === 'bs-' + id), hasF = id => (STORE.worlds.F.events || []).some(e => e.id === 'bs-' + id);
    ACT.joinZoom({ dataset: { id: 'bs-' + both.id } }); const zd = !!MODAL && /Zoom \(simulated\)/.test(mroot().innerHTML); closeModal();
    learner('F'); render(); ACT.joinZoom({ dataset: { id: 'bs-' + both.id } }); const zf = !!MODAL && /Zoom \(simulated\)/.test(mroot().innerHTML); closeModal();
    ACT.joinZoom({ dataset: { id: 'bs-' + spOnly.id } }); const zf2 = !!MODAL; closeModal();
    ok('W1-E calendars: the mixed class for both; the Self-Paced class only for Daniel', hasD(both.id) && hasF(both.id) && hasD(spOnly.id) && !hasF(spOnly.id));
    ok('W1-E Zoom: both join the mixed class; Fatima gets no link for the Self-Paced class', zd && zf && !zf2);
    SA(); ok('W1-E register text shows the audience', /Audience: <strong>[^<]*Self-Paced — W1/.test(n4RegisterHtml(spOnly)));
  });
  await T('W1-E shared classes: a Self-Paced batch joins any eligible class of the programme (not only "Fully Assisted" organisers)', async () => {
    fresh(); const o = opts(), org = nb('W1-ORG', T3, { dm: 'Self-Paced' }).b, joiner = nb('W1-JOIN', T3, { opts: [o.sp] }).b; SA();
    ok('W1-E the organising batch has the legacy Self-Paced default (standard-fee learners)', org.dmode === 'Self-Paced');
    const open = sessAdd('W1-ORG', { t: 'W1 open revision class', at: plus(org.start, 10) }), faOnly = sessAdd('W1-ORG', { t: 'W1 Fully Assisted workshop', at: plus(org.start, 11), aud: [o.fa] });
    ACT.n3Join({ dataset: { b: 'W1-JOIN' } }); const xs = [...document.querySelectorAll('#n3-j option')].map(x => x.value);
    ok('W1-E the class of a Self-Paced-default batch is offered (it wasn\'t before W1)', xs.includes(open.id));
    ok('W1-E a class whose audience admits none of the joining batch\'s options (Fully Assisted only) isn\'t offered', !xs.includes(faOnly.id) && /for: /.test(mroot().textContent));
    fill({ '#n3-j': open.id }); reason('Shared revision');
    const l = freeL(); addL('W1-JOIN', l.id, o.sp);
    ok('W1-E joined: one session, organised by its own batch; the Self-Paced learner of the joining batch takes part', (open.with || []).includes('W1-JOIN') && open.batch === 'W1-ORG' && r2LidOk(open, l.id, 'W1-JOIN') && n4Eligible(open).includes(l.id));
    ok('W1-E plan patterns: the Self-Paced-only batch has the limited plan', n3Kinds(joiner).includes('limited'));
    COO('A'); const a0 = ADMIN.audit.length; ACT.n3Join({ dataset: { b: 'W1-JOIN' } }); ok('W1-E (negative) a Coordinator can\'t join classes (scheduling right; refused, logged)', !MODAL && blocked(a0));
    SA(); ACT.n3Join({ dataset: { b: 'L2DC-JAN27' } }); ok('W1-E Level 2 unchanged: only classes of Fully Assisted batches are offered', !MODAL || /Fully Assisted batches of/.test(mroot().textContent)); closeModal();
  });

  /* ================= 6. Editing, the fee-option groups, authorization and history ================= */
  await T('W1-F Edit batch and fee options accepted: where the stored mode applies; held options kept; access', async () => {
    fresh(); const o = opts(), mix = nb('W1-MIX', T3, { opts: [o.sp, o.fa] }).b, std = nb('W1-STD', T3, { dm: 'Fully Assisted' }).b; SA();
    ACT.s4bBatchEdit({ dataset: { id: 'W1-MIX' } }); ok('W1-F Edit batch details (no standard fee accepted): no delivery-mode field', !document.querySelector('#modal-root #bd-dm')); closeModal();
    ok('W1-F (negative) a direct mode change on that batch is refused (no batch-level mode)', n2CanChangeMode(mix, 'Self-Paced') === false && /has no batch-level delivery mode/.test(ADMIN.audit[0].reason));
    ACT.s4bBatchEdit({ dataset: { id: 'W1-STD' } }); const sel = document.querySelector('#modal-root #bd-dm');
    ok('W1-F with the standard fee and no standard-fee learner: editable, explained as standard-fee only', !!sel && !sel.disabled && /Applies only to learners on the Standard programme fee/.test(mroot().textContent)); closeModal();
    const jan = ADMIN.batches.find(b => b.code === 'L3AC-JAN26'); ACT.s4bBatchEdit({ dataset: { id: jan.code } });
    ok('W1-F seeded batch with standard-fee learners: locked, saying why', document.querySelector('#modal-root #bd-dm').disabled && /on the Standard programme fee .*follow/.test(mroot().textContent)); closeModal();
    ACT.s4bBatchEdit({ dataset: { id: 'L2DC-MAR26' } }); ok('W1-F Level 2 seeded batch: the existing lock wording', /transfer and impact policy/.test(mroot().textContent)); closeModal();
    ACT.w1Opts({ dataset: { id: 'W1-MIX' } }); document.querySelector(`#modal-root .w1-o[value="${o.std}"]`).checked = true; fill({ '#w1-std': 'Self-Paced' }); reason('Standard-fee learners too');
    ok('W1-F fee options accepted changed (audited); adding the standard fee records its learners\' mode', mix.w1opts.includes(o.std) && mix.dmode === 'Self-Paced' && ADMIN.audit.some(x => x.action === 'Fee options accepted changed') && ADMIN.audit.some(x => x.action === 'Delivery mode set' && x.entity.includes('W1-MIX')));
    ACT.w1Opts({ dataset: { id: 'W1-MIX' } }); ok('W1-F (negative) saving the same choice: "Nothing has changed"', reason('Same') === false && /Nothing has changed/.test(mroot().textContent)); closeModal();
    for (const [lbl, enter] of [['Finance Admin', FA], ['Business Admin', BIZ], ['Coordinator portal', () => { SA(); COO('A'); }], ['learner portal', () => { SA(); learner('C'); }]]) { enter(); const a0 = ADMIN.audit.length, w0 = JSON.stringify(mix.w1opts); ACT.w1Opts({ dataset: { id: 'W1-MIX' } }); ok(`W1-F (negative) ${lbl}: changing the fee options is refused and logged`, !MODAL && blocked(a0) && JSON.stringify(mix.w1opts) === w0); closeModal(); }
    ACA(); ACT.w1Opts({ dataset: { id: 'W1-MIX' } }); ok('W1-F the Academic Admin can change them (batch-edit right)', !!MODAL); closeModal();
    SA(); mix.status = 'Completed'; const a1 = ADMIN.audit.length; ACT.w1Opts({ dataset: { id: 'W1-MIX' } }); ok('W1-F (negative) a closed batch\'s fee options can\'t change', !MODAL && blocked(a1));
  });
  await T('W1-G history preserved: learners\' fee and payment snapshots, seeded batches, observation fees', async () => {
    fresh(); const keep = () => JSON.stringify([['B', 'C', 'D'].map(v => [STORE.worlds[v].signup && STORE.worlds[v].signup.plan, STORE.worlds[v].plans, STORE.worlds[v].nvq && STORE.worlds[v].nvq.dmode]), ADMIN.batches.filter(b => b.course === T3 || b.course === T2).map(b => [b.code, b.dmode, b.dmodeSrc, b.w1opts]), (STORE.chFees || []).map(f => [f.id, f.amount, f.support, f.status])]);
    const k0 = keep(), o = opts(), b = nb('W1-H', T3, { opts: [o.sp, o.fa] }).b; finish(apply3('A', o.sp), b); finish(apply3('F', o.fa), b); SA(); addL('W1-H', freeL().id, o.fa); go('a-batches'); go('a-batches', { id: 'W1-H' }); COO('A'); go('c-batches', { id: 'W1-H' });
    const k1 = JSON.parse(keep()), z = JSON.parse(k0); k1[1] = k1[1].filter(x => !String(x[0]).startsWith('W1-'));
    ok('W1-G seeded learners\' fee snapshots, payment rows and modes; seeded batches (no fee-option list, stored modes); raised observation fees — all unchanged', JSON.stringify(k1) === JSON.stringify(z));
    // PD-M-11 supersedes PD-W1-01's fallback — was: seeded batches store no list and accept every option (o.sp, o.fa) — now: an explicit list
    // fixed before options are created later: the Standard programme fee only, so the options added afterwards aren't accepted
    ok('W1-G seeded Level 3 batches keep the Standard programme fee and don\'t take options created later (PD-M-11)', ADMIN.batches.filter(x => x.course === T3 && !x.code.startsWith('W1-')).every(x => JSON.stringify(x.w1opts) === '["L3-FO-STD"]' && !w1Accepts(x, o.sp) && !w1Accepts(x, o.fa) && w1Accepts(x, 'L3-FO-STD')));
    ok('W1-G observation fee (W6 dependency, documented): still the programme rate, not the learner\'s mode — NV-L3 is "Fully assisted" for every learner', chSupportOfCourse(T3) === 'Fully assisted' && chFeeAmt(chSupportOfCourse(T3)) === 70);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
