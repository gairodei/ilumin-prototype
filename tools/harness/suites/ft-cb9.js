// CB9 — Learner payment choice and pinned dated schedules (PD-CB-58…66). The learner chooses one approved payment option of their fee option;
// the payment step shows every date and amount; payment 1 is collected now (paid early against the batch-start due date); late enrolment
// catch-up; rows and the frozen pin come from the chosen schedule; later Finance changes never rewrite them; batch-date changes and moves
// before the start revise unpaid dates only (audited, told once); the observation fee is priced from the pin by location (£0 = nothing).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB9 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  let codeN = 0;
  // A Level 3 programme made in the builder, its package approved by the Super Administrator (D8), published, with a batch
  const prog = (o = {}) => {
    SA(); go('a-programmes'); ACT.chProgNew(); const n = ++codeN;
    fill({ '#np-t': 'CB9 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (4400 + n) + '/9', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    (document.querySelector('#np-code') || {}).value = 'CB9C' + n; document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    const rows = [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }];
    rows.forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = crT(ACT.cbDetCreate)(); closeModal(); const id = pr.id;
    // structure (an Observation Learning Outcome when the course has observations), letter, observation configuration
    go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U9' + n, '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/9' + n }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' });
    if (o.obs) { add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Demonstrate practice', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe practice', '#c-e': 'Observed at work' });
      ACT.n5Settings({ dataset: { p: id } }); radio('n5-req', 'yes'); radio('n5-wp', 'Permitted'); radio('n5-off', 'Available'); press();
      const d = n5Draft(pr); n5NvqOk(pr, d).forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c: c.code } }); document.querySelectorAll('#modal-root .n5-ev').forEach(x => { x.checked = x.value === 'notes'; }); press(); });
      ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1'; document.querySelectorAll('#modal-root .ev-l, #modal-root .ev-c').forEach(x => { if (!x.disabled) x.checked = true; }); press(); }
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('First version');
    // the package: Fully Assisted in full, 4 or 6 payments; Self-Paced in full or 3; observation fees £70 workplace, £0 office
    const [a, b] = cb8Work(pr).opts, payTo = (oid, ks) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); };
    if (o.obs) [a, b].forEach(x => { ACT.cb8Opt({ dataset: { p: id, o: x.id } }); document.querySelector('#modal-root #c8-wp').value = '70'; document.querySelector('#modal-root #c8-off').value = '0'; press(); });
    payTo(a.id, [1, 4, 6]); payTo(b.id, [1, 3]);
    ACT.cb8SaApprove({ dataset: { p: id } }); reason('Terms');
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    if (pr.status !== 'Active') R.push('FAIL CB9 (setup) publish — ' + J(ch8Check(pr).block));
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'CB9B' + n }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const bt = ADMIN.batches.find(x => x.code === 'CB9B' + n); bt.start = o.start || D(40, '09:00'); bt.end = D(240, '17:00');
    return { pr, a: a.id, b: b.id, bt };
  };
  // A learner signs up (fee option), reaches the payment step in the given batch
  const signUp = (v, P, optId) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === P.pr.title); ACT.applyNvq({ dataset: { id: c.id } });
    const dlg = MODAL ? document.querySelector('#modal-root').textContent : ''; const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; prim(); closeModal();
    const w = W; chSetBatch(w, P.bt); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, P.bt); render();
    return { w, dlg };
  };
  const choose = k => { setUi('cb9Pay', String(k)); render(); };
  const payCard = (w, k) => { if (k != null) setUi('cb9Pay', String(k)); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-CB9'); closeModal(); return { g, pl: w.plans.find(p => p.e === 'nvq') }; };
  const ymd = iso => cbYmdOf(iso);

  /* ================= A. The payment step ================= */
  await T('CB9-A payment step', async () => {
    fresh(); const P = prog(), S0 = ymd(P.bt.start), { w, dlg } = signUp('A', P, P.a);
    ok('CB9-A (setup) the batch starts 13 Nov 2026 (in 40 days); today is 4 Oct 2026', S0 === '2026-11-13' && cbToday() === '2026-10-04');
    ok('CB9-A the sign-up dialog lists each fee option\'s approved choices (not the plan\'s single count)', /pay in full, 4 payments, 6 payments/.test(dlg) && /pay in full, 3 payments/.test(dlg));
    ok('CB9-A sign-up start fixes the option\'s approved choices with the terms (by programme ID and plan version)', !!w.signup.plan.cb8 && w.signup.plan.cb8.pid === P.pr.id && w.signup.plan.cb8.opt.id === P.a && J(w.signup.plan.cb8.opt.pay.map(x => x.k)) === '[1,4,6]' && Object.isFrozen(w.signup.plan.cb8));
    go('admission'); ok('CB9-A step 4 offers the deposit route and the three approved options (in full, 4, 6) — no others', J(qa('input[name="cb9-pay"]').map(x => x.value)) === J(['deposit', '1', '4', '6']) && /Choose how you pay/.test(main()));
    choose(4); const t = q('.cb9-sched').textContent;
    ok('CB9-A choosing 4 payments shows the whole schedule: dates from the batch start and amounts (13 Nov 2026, 28 Dec 2026, 11 Feb 2027, 28 Mar 2027 — 4 × £600.00)', J(qa('.cb9-sched tbody tr td:nth-child(2)').map(x => x.textContent)) === J(['13 Nov 2026', '28 Dec 2026', '11 Feb 2027', '28 Mar 2027']) && qa('.cb9-sched tbody tr td:nth-child(3)').every(x => x.textContent === '£600.00'), qa('.cb9-sched tbody tr td:nth-child(2)').map(x => x.textContent).join());
    ok('CB9-A payment 1 is labelled "Collected now — due 13 Nov 2026 (batch start), paid early at checkout"; the rest "Later"', /Collected now — due 13 Nov 2026 \(batch start\), paid early at checkout/.test(t) && (t.match(/Later/g) || []).length === 3);
    ok('CB9-A the button charges payment 1 (£600.00)', /Pay £600\.00 by card/.test(main()));
    choose(1); ok('CB9-A pay in full: one payment of £2,400.00 collected now', /Pay £2,400\.00 by card/.test(main()) && qa('.cb9-sched tbody tr').length === 1);
    setUi('cb9Pay', '5'); render(); ok('CB9-A (negative) a count that isn\'t approved can\'t be chosen (falls back to an approved choice)', !qa('input[name="cb9-pay"][value="5"]').length && [1, 4, 6, 'deposit'].map(String).includes(document.querySelector('main input[name="cb9-pay"]:checked').value));
  });

  /* ================= B. Paying and pinning ================= */
  await T('CB9-B pay and pin', async () => {
    fresh(); const P = prog(), { w } = signUp('A', P, P.a); const { g, pl } = payCard(w, 4);
    ok('CB9-B card: £600.00 charged now (payment 1)', g.amount === 600 && w.signup.done && w.signup.pay.amount === 600);
    ok('CB9-B rows come from the schedule: 4 × £600 on 13 Nov, 28 Dec 2026, 11 Feb, 28 Mar 2027 (every 45–46 days); payment 1 Paid (paid early), the rest Pending', J(pl.rows.map(r => [r.n, r.amount, ymd(r.due), r.status])) === J([[1, 600, '2026-11-13', 'Paid'], [2, 600, '2026-12-28', 'Pending'], [3, 600, '2027-02-11', 'Pending'], [4, 600, '2027-03-28', 'Pending']]) && pl.rows[0].paidEarly === true && pl.plan === 'Instalments' && pl.total === 2400, J(pl.rows.map(r => [r.n, ymd(r.due), r.status])));
    const pin = w.signup.pin;
    ok('CB9-B the pin is frozen with the fee option and amount, payment option and count, exact dates and amounts, package version and both observation fees', Object.isFrozen(pin) && Object.isFrozen(pin.rows[0]) && pin === pl.pin && pin.optId === P.a && pin.fee === 2400 && pin.k === 4 && pin.planV === s4PlanCur(P.pr.id).v && pin.rule === 'CB-SCHED-1' && pin.anchor === '2026-11-13' && pin.enrolledOn === '2026-10-04' && J(pin.rows.map(r => r.pence)) === J([60000, 60000, 60000, 60000]) && 'wp' in pin.obs && 'off' in pin.obs);
    ok('CB9-B audited: "Payment schedule fixed" with the dates and amounts', ADMIN.audit.some(a => a.action === 'Payment schedule fixed' && /£600\.00 13 Nov 2026/.test(a.after)));
    go('payments'); ok('CB9-B learner Payments: where the schedule comes from, and payment 1 "Due at batch start — paid early at checkout"', /Your payment schedule/.test(main()) && /4 payments, fixed when you paid/.test(main()) && /Due at batch start — paid early at checkout/.test(main()));
    fresh(); const P2 = prog(), s2 = signUp('F', P2, P2.b).w, r2 = payCard(s2, 1);
    ok('CB9-B pay in full (Self-Paced £1,800): one row, Paid, "One-time payment"', r2.g.amount === 1800 && r2.pl.rows.length === 1 && r2.pl.rows[0].status === 'Paid' && r2.pl.plan === 'One-time payment' && s2.signup.pin.k === 1);
    fresh(); const P3 = prog(), s3 = signUp('A', P3, P3.b).w; setUi('cb9Pay', 'deposit'); const r3 = payCard(s3);
    ok('CB9-B the deposit route stays separate and unchanged: £300 deposit, one £1,500 balance row within the seat hold, no dated schedule', r3.g.amount === 300 && r3.pl.plan === 'Deposit and balance' && r3.pl.rows.length === 1 && r3.pl.rows[0].amount === 1500 && !s3.signup.pin && !r3.pl.pin);
  });

  /* ================= C. Bank transfer ================= */
  await T('CB9-C bank transfer', async () => {
    fresh(); const P = prog(), { w } = signUp('A', P, P.a); choose(6); setUi('suMethod', 'bank'); render();
    ok('CB9-C bank: "Pay £400.00 by bank transfer" with the reference', /Pay £400\.00 by bank transfer/.test(main()));
    ACT.suPay(); const pl = w.plans.find(p => p.e === 'nvq');
    ok('CB9-C rows from the schedule; payment 1 "Awaiting confirmation by Finance"; the transfer is listed for Finance', pl.rows.length === 6 && pl.rows[0].status === 'Awaiting confirmation by Finance' && pl.rows[0].paid === 0 && (STORE.chBank || []).some(x => x.v === 'A' && x.amount === 400));
    FA(); const t = payTargets().find(x => x.v === 'A' && x.r && x.r.n === 1); if (t) recordPayment(t, 400, 'BANK-CB9', 'Bank transfer', 'Received');
    ok('CB9-C Finance confirms: payment 1 Paid, the sign-up payment confirmed', !!t && pl.rows[0].status === 'Paid' && w.signup.pay.status === 'Paid', t ? '' : 'no pay target');
  });

  /* ================= D. Late enrolment ================= */
  await T('CB9-D late enrolment', async () => {
    // (sign-up doesn't progress into a batch that has already started, so the batch starts while the learner is at step 4: 25 Aug 2026)
    fresh(); const P = prog(), { w } = signUp('A', P, P.a); P.bt.start = D(-40, '09:00'); chSetBatch(w, P.bt); choose(6); const t = q('.cb9-sched').textContent;
    ok('CB9-D the batch started 25 Aug 2026; payments due before today (4 Oct) are due today and collected now (catch-up); the rest keep their dates', /Catch-up|catch-up/.test(t) && /was scheduled 25 Aug 2026/.test(t) && /was scheduled 25 Sep 2026/.test(t) && /payments already due are due today/.test(main()) && /provisional rule/.test(main()));
    ok('CB9-D the button charges payment 1 and the catch-up together (2 × £400.00 = £800.00)', /Pay £800\.00 by card/.test(main()));
    const { g, pl } = payCard(w);
    ok('CB9-D rows: 1 and 2 due today (catch-up), Paid; 3–6 on 25 Oct, 25 Nov, 25 Dec 2026, 25 Jan 2027, Pending', g.amount === 800 && J(pl.rows.map(r => [ymd(r.due), r.status, !!r.catchUp])) === J([['2026-10-04', 'Paid', true], ['2026-10-04', 'Paid', true], ['2026-10-25', 'Pending', false], ['2026-11-25', 'Pending', false], ['2026-12-25', 'Pending', false], ['2027-01-25', 'Pending', false]]) && ymd(pl.rows[0].sched) === '2026-08-25', J(pl.rows.map(r => ymd(r.due))));
    ok('CB9-D the pin keeps the anchor (batch start), the enrolment date and each row\'s scheduled date', w.signup.pin.anchor === '2026-08-25' && w.signup.pin.enrolledOn === '2026-10-04' && w.signup.pin.rows[1].sched === '2026-09-25' && w.signup.pin.rows[1].catchUp);
  });

  /* ================= E. Historical freezing ================= */
  await T('CB9-E historical isolation', async () => {
    fresh(); const P = prog(), { w } = signUp('A', P, P.a); payCard(w, 4); const pin0 = J(w.signup.pin), rows0 = J(w.plans.find(p => p.e === 'nvq').rows), plan0 = J(w.signup.plan);
    const C0 = J(STORE.worlds.C.plans), fees0 = J(STORE.chFees);
    SA(); const id = P.pr.id; ACT.cb8Start({ dataset: { p: id } }); ACT.cb8Opt({ dataset: { p: id, o: P.a } }); document.querySelector('#modal-root #c8-f').value = '2600'; press(); ACT.cb8PayDel({ dataset: { p: id, o: P.a, k: '4' } }); ACT.cb8PayAdd({ dataset: { p: id, o: P.a, k: '5' } }); ACT.cb8SaApprove({ dataset: { p: id } }); reason('New terms');
    FA(); ACT.s4CfgEdit(); fill({ '#cf-d': '250', '#cf-h': '21' }); reason('Default change'); render();
    ok('CB9-E (setup) a new package is in force: £2,600, 4 payments no longer offered', cb8Cur(id).opts.find(o => o.id === P.a).fee === 2600 && !cb8Cur(id).opts.find(o => o.id === P.a).pay.some(x => x.k === 4));
    ok('CB9-E the learner\'s pin, rows and terms are byte-identical after new Finance and package changes', J(w.signup.pin) === pin0 && J(w.plans.find(p => p.e === 'nvq').rows) === rows0 && J(w.signup.plan) === plan0);
    ok('CB9-E seeded learners\' payments and existing observation fee records are unchanged', J(STORE.worlds.C.plans) === C0 && J(STORE.chFees) === fees0);
    const { w: w2 } = signUp('F', P, P.a); go('admission'); ok('CB9-E a new learner gets the new package: £2,600 with in full, 5 or 6 payments', w2.signup.plan.cb8.opt.fee === 2600 && J(qa('input[name="cb9-pay"]').map(x => x.value).filter(x => x !== 'deposit')) === J(['1', '5', '6']));
  });

  /* ================= F. Batch date changed / learner moved before the start ================= */
  await T('CB9-F batch-date revisions', async () => {
    fresh(); const P = prog(), { w } = signUp('A', P, P.a); payCard(w, 4); const pl = w.plans.find(p => p.e === 'nvq'), n0 = w.notifs.length, a0 = ADMIN.audit.length;
    ACA(); ACT.s4bBatchEdit({ dataset: { id: P.bt.code } }); fill({ '#bd-s': '2026-11-27', '#bd-e': '2027-06-30', '#bd-r': 'Room availability' }); prim();
    ok('CB9-F the impact preview says unpaid payment dates will move (amounts unchanged)', /unpaid payment dates move with it/.test(document.querySelector('#modal-root').textContent)); prim(); closeModal(); render(); render();
    ok('CB9-F the start moved to 27 Nov 2026: unpaid dates follow (11 Jan, 25 Feb, 11 Apr 2027); paid payment 1 keeps 13 Nov 2026; amounts unchanged', J(pl.rows.map(r => [ymd(r.due), r.amount, r.status])) === J([['2026-11-13', 600, 'Paid'], ['2027-01-11', 600, 'Pending'], ['2027-02-25', 600, 'Pending'], ['2027-04-11', 600, 'Pending']]), J(pl.rows.map(r => ymd(r.due))));
    ok('CB9-F a revision is recorded (append-only), the original pin is unchanged', pl.revs.length === 1 && pl.revs[0].from === '2026-11-13' && pl.revs[0].anchor === '2026-11-27' && Object.isFrozen(pl.revs[0]) && w.signup.pin.rows[1].due === '2026-12-28');
    ok('CB9-F the learner is told once (re-renders add nothing); Finance\'s audit and one notification', w.notifs.filter(x => x.title === 'Your payment dates changed').length === 1 && ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Payment dates revised (batch start changed)').length === 1 && STORE.fin.notifs.filter(x => String(x.key || '').startsWith('cb9-rev-' + w.me.id)).length === 1);
    FA(); setUi('fpL', 'A'); go('f-plans'); ok('CB9-F Finance → Learner schedules: the agreed schedule and "Revision 1: batch start 13 Nov 2026 → 27 Nov 2026"', /Agreed payment schedule — fixed at sign-up/.test(main()) && /Revision 1: batch start 13 Nov 2026 → 27 Nov 2026/.test(main()));
    // moved to another batch before it starts
    SA(); go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'CB9MV' }); const co = document.querySelector('#nb-co'); co.value = P.pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const nb = ADMIN.batches.find(x => x.code === 'CB9MV'); nb.start = D(70, '09:00'); nb.end = D(260, '17:00');
    ACT.chMoveBatch({ dataset: { id: w.me.id } }); if (MODAL) { document.querySelector('#modal-root #ch-mv-b').value = 'CB9MV'; reason('Moved'); } render();
    ok('CB9-F moved to a batch starting 13 Dec 2026: a second revision; unpaid dates from the new start; paid untouched', pl.revs.length === 2 && pl.revs[1].anchor === '2026-12-13' && ymd(pl.rows[0].due) === '2026-11-13' && ymd(pl.rows[1].due) === '2027-01-27', J(pl.rows.map(r => ymd(r.due))));
  });

  /* ================= G. Observation fee from the pin ================= */
  await T('CB9-G observation fee', async () => {
    fresh(); const P = prog({ obs: true });
    const { w } = signUp('A', P, P.a); payCard(w, 4); ok('CB9-G (setup) the pin keeps both observation fees: workplace £70, office £0', w.signup.pin.obs.wp === 70 && w.signup.pin.obs.off === 0, J(w.signup.pin.obs));
    const fees0 = J(STORE.chFees.filter(f => f.lid !== w.me.id));
    w.observations.push({ id: 'OB-CB9-1', at: D(50, '10:00'), loc: 'Workplace', status: 'Confirmed', assessor: 'Dr Helen Carter', scope: 'Unit 1' }); render(); render();
    const f = chFeeOf(w.me.id, w.nvq.title);
    ok('CB9-G first confirmed observation at the workplace: one fee of £70.00 from the pin (location recorded); re-rendering raises nothing more', !!f && f.amount === 70 && f.loc === 'wp' && f.pinned && f.pinned.optId === P.a && STORE.chFees.filter(x => x.lid === w.me.id).length === 1);
    w.observations.push({ id: 'OB-CB9-2', at: D(60, '10:00'), loc: 'Academy office', locType: 'office', status: 'Confirmed', assessor: 'Dr Helen Carter', scope: 'Unit 1' }); render();
    ok('CB9-G one fee per course: a later office observation raises nothing', STORE.chFees.filter(x => x.lid === w.me.id).length === 1);
    const { w: w2 } = signUp('F', P, P.a); payCard(w2, 6);
    w2.observations.push({ id: 'OB-CB9-3', at: D(55, '10:00'), loc: 'Academy office', locType: 'office', status: 'Confirmed', assessor: 'Dr Helen Carter', scope: 'Unit 1' }); render(); render();
    ok('CB9-G first observation at the Academy office with £0 agreed: no fee record, nothing outstanding; "no charge" logged once', !chFeeOf(w2.me.id, w2.nvq.title) && w2.cb9Obs && w2.cb9Obs.amount === 0 && ADMIN.audit.filter(a => a.action === 'Observation fee: no charge' && a.entity.includes(w2.me.id)).length === 1);
    ok('CB9-G existing fee records (other learners) are unchanged; the CH-39 waiver workflow still applies to a pinned fee', J(STORE.chFees.filter(x => x.lid !== w.me.id && x.lid !== w2.me.id)) === fees0 && (SA(), ACT.chFeeWaive({ dataset: { id: f.id } }), !!MODAL));
    closeModal();
  });

  /* ================= H. Offer letter and other views ================= */
  await T('CB9-H letter and views', async () => {
    fresh(); const P = prog(), { w } = signUp('A', P, P.a);
    ok('CB9-H the applicant\'s {{payment_terms}} lists their own choices with dates from their batch start', /the full fee of £2,400\.00 \(due 13 Nov 2026\)/.test(e2PayTerms(w)) && /the first of 4 payments \(£600\.00 due 13 Nov 2026, £600\.00 due 28 Dec 2026/.test(e2PayTerms(w)) && /a deposit of £300\.00/.test(e2PayTerms(w)));
    ok('CB9-H the signed letter kept exactly that wording', !!w.signup.sig && w.signup.sig.snapshot && w.signup.sig.snapshot.pay === e2PayTerms(w));
    payCard(w, 6); SA(); go('a-admissions', { id: 'APP-A' }); ok('CB9-H Admissions: the application shows the payment option and its dated amounts', /Payment option: 6 payments/.test(main()) && /£400\.00 13 Nov 2026/.test(main()));
    fresh(); learner('A'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq' && x.title === s3Pr('NV-L3').title).id } }); prim(); closeModal(); const w0 = W;
    ok('CB9-H (negative) a programme on older terms (Level 3 Diploma): no package choices fixed — its sign-up is unchanged', !w0.signup.plan.cb8);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
