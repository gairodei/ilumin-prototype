// E1 — NVQ programme duration and payment configuration (provisional enhancement, Oct 2026): structured duration and legacy
// compatibility, one payment / instalments / both on the programme plan (inherited by Level 3 fee options), the learner's choice at
// sign-up, no repricing of existing learners, and the Finance review of a new programme's payment terms. Each check does the action
// through the screen or handler, then checks the consuming screen or record, and includes the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FB = () => { setAdminIdentity('FB'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const role = r => { ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'E1 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const rebuildA = () => { INP.adminVariant({ value: Object.keys(ADMIN_VARIANTS).find(k => k !== 'A') }); INP.adminVariant({ value: 'A' }); };
  const last = () => (STORE.chNewProgs || []).slice(-1)[0];
  const meth = (px, m) => { const r = document.querySelector(`input[name="${px}-meth"][value="${m}"]`); r.checked = true; INP.e1Meth(r); };
  // A new programme through the wizard dialog (Level 2/4/5: one price); returns the programme or null
  const newProg = (title, o = {}) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': o.level || 'Level 4', '#np-r': 'QN 610/' + (2000 + title.length) + '/1', '#np-d': String(o.n ?? 12), '#np-du': o.unit || 'months', '#np-p': String(o.price || 2400) }); const n0 = (STORE.chNewProgs || []).length; prim(); closeModal(); return (STORE.chNewProgs || []).length > n0 ? last() : null; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  // The other publishing requirements (structure with a typed Learning Outcome, an offer letter)
  const ready = pr => { const id = pr.id; go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U480', '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/4801' }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' }); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); document.querySelector('#rsn').value = 'First version'; press(); };
  const finNotifs = () => STORE.fin.notifs.filter(n => String(n.key || '').startsWith('e1-sub-'));
  const acaNotifs = () => (STORE.aca ? STORE.aca.notifs : []).filter(n => /^Payment terms/.test(n.t));
  // Learner A (Daniel Okafor, no NVQ) signs up to a programme and reaches the payment step
  const toPay = (pid, optId) => { learner('A'); go('browse'); const pr = s3Pr(pid), c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); if (optId) { const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; } prim(); const w = W; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); return w; };
  // Finance's plan editor (Finance → Payment Plans): method, instalments
  const planEdit = (pid, m, n, r = 'E1 plan') => { ACT.s4PlanEdit({ dataset: { p: pid } }); const x = document.querySelector(`input[name="pp-meth"][value="${m}"]`); x.checked = true; INP.e1Meth(x); if (n) fill({ '#pp-n': String(n) }); return reason(r); };

  /* ================= A. Structured duration ================= */
  await T('E1-A duration: number and unit in the wizard; days, weeks, months and years', async () => {
    fresh(); SA(); go('a-programmes'); ACT.chProgNew();
    const n = document.querySelector('#modal-root #np-d'), u = document.querySelector('#modal-root #np-du');
    ok('E1-A wizard: Duration is a whole-number field and a unit (Days, Weeks, Months, Years); new programmes start at 12 months', n && n.type === 'number' && u && u.tagName === 'SELECT' && [...u.options].map(o => o.textContent).join('|') === 'Days|Weeks|Months|Years' && n.value === '12' && u.value === 'months');
    closeModal();
    [[90, 'days', '90 days'], [1, 'weeks', '1 week'], [18, 'months', '18 months'], [2, 'years', '2 years']].forEach(([k, unit, txt], j) => {
      const pr = newProg('Level 4 Duration test ' + j, { n: k, unit });
      ok(`E1-A ${txt}: stored as number + unit and shown "${txt}"`, !!pr && pr.durV && pr.durV.n === k && pr.durV.unit === unit && pr.dur === txt);
    });
    const pr = last(); go('a-programmes', { id: pr.id, tab: 'review' }); ok('E1-A review shows the formatted duration', main().includes('2 years · '));
  });
  await T('E1-A duration (negative): zero, fractions, blanks and out-of-range values are refused', async () => {
    fresh(); SA(); const n0 = (STORE.chNewProgs || []).length;
    [['0', 'Enter the duration as a whole number'], ['1.5', 'whole number'], ['1000', 'from 1 to 999'], ['', 'Enter the duration']].forEach(([v, msg]) => {
      go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': 'Level 4 Bad duration', '#np-l': 'Level 4', '#np-r': 'QN 610/1/1', '#np-p': '2400' }); document.querySelector('#np-d').value = v;
      const r = prim(); ok(`E1-A duration "${v || '(blank)'}" refused with a message`, r === false && !!MODAL && mroot().textContent.includes(msg)); closeModal();
    });
    ok('E1-A nothing created by refused durations', (STORE.chNewProgs || []).length === n0);
  });
  await T('E1-A legacy durations: exact text is read as structured; anything else is kept and flagged, never converted', async () => {
    fresh(); const n1 = ch8Pr('NV-N1'), n2 = ch8Pr('NV-N2');
    ok('E1-A seeded "15 months" / "6 months" read as structured; text unchanged', n1.durV && n1.durV.n === 15 && n1.durV.unit === 'months' && n1.dur === '15 months' && n2.durV.n === 6 && n2.dur === '6 months');
    ok('E1-A parser: only "<number> <unit>"', JSON.stringify(e1DurParse('1 Year')) === '{"n":1,"unit":"years"}' && e1DurParse('12–18 months') === null && e1DurParse('1.5 years') === null && e1DurParse('Flexible') === null && e1DurParse('0 months') === null);
    n1.durV = undefined; n1.dur = '12–18 months'; e1DurMigrate();
    ok('E1-A ambiguous legacy value: kept exactly as written, not reinterpreted', n1.durV === null && n1.dur === '12–18 months');
    ACA(); go('a-programmes', { id: 'NV-N1', tab: 'details' });
    ok('E1-A details: the number is empty, the old text is shown with "isn\'t converted automatically"', document.querySelector('#np-d').value === '' && /Previously entered as "12–18 months"/.test(main()) && /isn't converted automatically/.test(main()));
    go('a-programmes', { id: 'NV-N1', tab: 'review' }); ok('E1-A review: a warning to choose a number and unit (not blocking); the text is marked "Check duration"', /Duration "12–18 months" was entered as free text/.test(main()) && /Check duration/.test(main()) && !ch8Check(n1).block.some(b => /Duration/.test(b)));
    go('a-programmes', { id: 'NV-N1', tab: 'details' }); ACT.ch8SaveDetails({ dataset: { id: 'NV-N1' } }); ok('E1-A (negative) saving details needs a number', /Enter the duration/.test(main()) && n1.dur === '12–18 months');
    fill({ '#np-d': '18', '#np-du': 'months' }); ACT.ch8SaveDetails({ dataset: { id: 'NV-N1' } });
    const a = ADMIN.audit.find(x => x.action === 'Details changed' && x.entity.includes('NV-N1'));
    ok('E1-A chosen again: 18 months, recorded on the Details audit entry (old → new)', n1.durV.n === 18 && n1.dur === '18 months' && a && a.before.includes('12–18 months') && a.after.includes('18 months'));
  });
  await T('E1-A edit, detail and catalogue use the same duration', async () => {
    fresh(); SA(); const pr = newProg('Level 4 Duration edit', { n: 12 }); go('a-programmes', { id: pr.id, tab: 'details' });
    ok('E1-A edit form: the same controls, pre-filled', document.querySelector('#np-d').value === '12' && document.querySelector('#np-du').value === 'months');
    fill({ '#np-d': '2', '#np-du': 'years' }); ACT.ch8SaveDetails({ dataset: { id: pr.id } });
    ok('E1-A edited to 2 years; audited', pr.dur === '2 years' && pr.durV.unit === 'years' && ADMIN.audit[0].action === 'Details changed' && /2 years/.test(ADMIN.audit[0].after));
    ready(pr); ACT.ch8Publish({ dataset: { id: pr.id } }); reason('Ready');
    go('a-programmes', { id: pr.id, tab: 'details' }); ok('E1-A published detail page shows "2 years"', pr.status === 'Active' && main().includes('Duration2 years'));
    ok('E1-A Browse catalogue entry carries "2 years"', CATALOGUE.find(c => c.title === pr.title).dur === '2 years');
  });

  /* ================= B. Payment methods ================= */
  await T('E1-B plan step: one payment, instalments or both; instalment count validation', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-N2', tab: 'plan' });
    ok('E1-B plan step: three clear choices with explanations; a plan from before E1 shows "Instalments"', document.querySelectorAll('input[name="pp-meth"]').length === 3 && document.querySelector('input[name="pp-meth"][value="instalments"]').checked && /One payment/.test(main()) && /Both — the learner chooses/.test(main()));
    meth('pp', 'one-time'); ok('E1-B one payment hides the instalment count', document.querySelector('.e1-n-pp').hidden);
    ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); let p = s4PlanCur('NV-N2');
    ok('E1-B one payment saved as a new plan version (1 payment, method recorded, audited)', p.meth === 'one-time' && p.inst === 1 && p.fee === 900 && /One payment/.test(ADMIN.audit[0].after) && /Instalments/.test(ADMIN.audit[0].before));
    go('a-programmes', { id: 'NV-N2', tab: 'plan' }); ok('E1-B summary: "£900.00 in one payment"', /£900\.00 in one payment/.test(main()));
    const v0 = s4Plans('NV-N2').length, bad = [['1', 'Enter 2 to 24'], ['25', 'Enter 2 to 24'], ['2.5', 'whole number'], ['7', 'divide']];
    bad.forEach(([n, msg]) => { go('a-programmes', { id: 'NV-N2', tab: 'plan' }); meth('pp', 'instalments'); fill({ '#pp-n': n }); ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); ok(`E1-B (negative) ${n} instalments refused`, s4Plans('NV-N2').length === v0 && main().includes(msg), main().slice(0, 0)); });
    go('a-programmes', { id: 'NV-N2', tab: 'plan' }); meth('pp', 'instalments'); fill({ '#pp-n': '4' }); ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); p = s4PlanCur('NV-N2');
    ok('E1-B instalments: 4 monthly saved', p.meth === 'instalments' && p.inst === 4);
    go('a-programmes', { id: 'NV-N2', tab: 'plan' }); meth('pp', 'both'); fill({ '#pp-n': '3' }); ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); p = s4PlanCur('NV-N2');
    go('a-programmes', { id: 'NV-N2', tab: 'plan' });
    ok('E1-B both: saved, and the summary offers "in one payment, or 3 monthly instalments"', p.meth === 'both' && p.inst === 3 && /£900\.00 in one payment, or 3 monthly instalments of £300\.00/.test(main()));
    ok('E1-B history lists the method of each version', (ACT.s4PlanHist({ dataset: { p: 'NV-N2' } }), /Both — the learner chooses/.test(mroot().textContent) && /One payment/.test(mroot().textContent))); closeModal();
    FA(); go('f-plans', { tab: 'templates' }); ok('E1-B Finance → Payment Plans shows the method', /In full, or 3 monthly/.test(main()));
  });
  await T('E1-B Finance editor: the same method choice; a method-only change is a new version; deposit kept', async () => {
    fresh(); FA(); go('f-plans', { tab: 'templates' }); const v0 = s4Plans('NV-L2').length, dep0 = s4TermsOf('NV-L2').deposit;
    planEdit('NV-L2', 'both', 6, 'Offer pay in full too');
    const p = s4PlanCur('NV-L2'); ok('E1-B editor: "Both" with the same 6 instalments saved as a new version; deposit unchanged', s4Plans('NV-L2').length === v0 + 1 && p.meth === 'both' && p.inst === 6 && s4TermsOf('NV-L2').deposit === dep0);
    ok('E1-B (negative) editor: nothing changed is refused', planEdit('NV-L2', 'both', 6) === false && s4Plans('NV-L2').length === v0 + 1); closeModal();
    ok('E1-B (negative) editor: 1 instalment refused', planEdit('NV-L2', 'instalments', 1) === false); closeModal();
    planEdit('NV-L2', 'one-time', null, 'One payment only'); ok('E1-B editor: one payment → 1 payment of the full fee', s4PlanCur('NV-L2').meth === 'one-time' && s4PlanCur('NV-L2').inst === 1);
    s4PlanSave(s3Pr('NV-L2'), { fee: s4PlanCur('NV-L2').fee, deposit: 200, inst: 1, partial: true }, 'Deposit only'); ok('E1-B a save that doesn\'t name a method keeps the current one', s4PlanCur('NV-L2').meth === 'one-time');
  });
  await T('E1-B learner: both → pay in full (one paid row), or instalments; deposit route unchanged', async () => {
    fresh(); SA(); planEdit('NV-N2', 'both', 3, 'Both');
    let w = toPay('NV-N2'); const h = main();
    ok('E1-B payment step (both): deposit, "Pay in full — £900.00 now" and "3 monthly payments of £300.00"', /Deposit \(holds your seat\)/.test(h) && /Pay in full — £900\.00 now/.test(h) && /Instalments — 3 monthly payments of £300\.00/.test(h) && w.signup.plan.meth === 'both');
    setUi('suOpt', 'full'); setUi('suMethod', 'bank'); render(); ok('E1-B pay in full: the button and bank note ask for £900.00', /Pay £900\.00 by bank transfer/.test(main()));
    ACT.suPay(); const pl = w.plans.find(p => p.e === 'nvq');
    ok('E1-B paid in full: one row of £900.00 (awaiting Finance), "One-time payment", no deposit', w.signup.done && pl.rows.length === 1 && pl.rows[0].amount === 900 && pl.plan === 'One-time payment' && !pl.deposit && w.signup.pay.amount === 900 && w.signup.pay.full && STORE.chBank.some(x => x.v === w.v && x.amount === 900));
    ok('E1-B the audit says "Payment in full"', (a => !!a && /^Payment in full £900\.00/.test(a.reason))(ADMIN.audit.find(a => a.action === 'Sign-up complete' && a.entity.includes(w.me.id))));
    fresh(); SA(); planEdit('NV-N2', 'both', 3, 'Both'); w = toPay('NV-N2'); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay();
    const pl2 = w.plans.find(p => p.e === 'nvq'); ok('E1-B both → instalments: 3 rows of £300.00 (as before)', pl2.rows.length === 3 && pl2.rows.every(r => r.amount === 300) && pl2.plan === 'Instalments' && w.signup.pay.amount === 300 && !w.signup.pay.full);
    fresh(); SA(); planEdit('NV-N2', 'both', 3, 'Both'); w = toPay('NV-N2'); setUi('suOpt', 'full'); setUi('suMethod', 'card'); render(); ACT.suPay();
    ok('E1-B card checkout title says "paid in full", for £900.00', !!MODAL && /NVQ fee, paid in full/.test(mroot().textContent) && /900\.00/.test(mroot().textContent)); closeModal();
  });
  await T('E1-B learner: one payment → pay in full or the deposit; no deposit when the batch is close (CH-10 unchanged)', async () => {
    fresh(); SA(); planEdit('NV-N2', 'one-time', null, 'One payment');
    let w = toPay('NV-N2'); let h = main();
    ok('E1-B one payment: "Pay in full" and the deposit; no instalment choice', /Pay in full — £900\.00 now/.test(h) && /Deposit \(holds your seat\) — £150\.00/.test(h) && !document.querySelector('input[name="su-opt"][value="instalment"]'));
    setUi('suOpt', 'deposit'); setUi('suMethod', 'bank'); render(); ACT.suPay(); const pl = w.plans.find(p => p.e === 'nvq');
    ok('E1-B deposit route unchanged: £150 deposit, £750 balance within the seat hold', w.signup.pay.amount === 150 && pl.rows.length === 1 && pl.rows[0].amount === 750 && w.admission.deposit.holdDays === chHoldDays() && !!w.admission.deposit.holdUntil);
    fresh(); SA(); planEdit('NV-N2', 'one-time', null, 'One payment'); chBatch('L2PW-DEC26-ONL').start = D(10); w = toPay('NV-N2'); h = main();
    ok('E1-B batch in 10 days: no deposit, pay in full only', !document.querySelector('input[name="su-opt"][value="deposit"]') && !document.querySelector('input[name="su-opt"][value="instalment"]') && document.querySelector('input[name="su-opt"][value="full"]').checked && /Pay £900\.00 by card/.test(h));
  });
  await T('E1-B plans saved before E1 behave exactly as before', async () => {
    fresh(); const w = toPay('NV-N2'); const h = main();
    ok('E1-B NV-N2 (no method recorded): deposit £150 or 3 monthly payments of £300 — no "Pay in full"', /Deposit \(holds your seat\) — £150\.00/.test(h) && /3 monthly payments of £300\.00/.test(h) && !/Pay in full/.test(h) && !w.signup.plan.meth);
    ok('E1-B existing seeded plans carry no method (instalments)', ['NV-L2', 'NV-L3', 'NV-L5', 'NV-N1', 'NV-N2'].every(pid => !s4PlanCur(pid).meth && e1MethOf(s4PlanCur(pid)) === 'instalments'));
  });

  /* ================= Level 3: fee options share the programme plan ================= */
  await T('E1-B Level 3: every fee option uses the programme\'s method; a fee that doesn\'t split is named', async () => {
    fresh(); SA(); go('a-programmes'); ACT.chProgNew();
    fill({ '#np-t': 'Level 3 Certificate in E1 Care', '#np-l': 'Level 3', '#np-r': 'QN 610/3131/3', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    const row = (k, l, f, m) => { const r = document.querySelectorAll('#modal-root .r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; };
    row(0, 'Self-Paced', '2400', 'Self-Paced'); ACT.r1NpAdd(); row(1, 'Fully Assisted', '2700', 'Fully Assisted'); prim(); closeModal(); const pr = last();
    ok('E1-L3 programme created with two options; the Super Admin\'s terms are approved at once (D8)', r1Opts(pr.id).length === 2 && e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms'));
    go('a-programmes', { id: pr.id, tab: 'plan' });
    ok('E1-L3 payment summary lists each option with its mode, fee and how its learners pay', document.querySelectorAll('.e1-sum tbody tr').length === 2 && /Self-Paced/.test(main()) && /Fully Assisted/.test(main()) && /6 monthly instalments of £400\.00/.test(main()) && /6 monthly instalments of £450\.00/.test(main()));
    meth('pp', 'both'); fill({ '#pp-n': '7' }); const v0 = s4Plans(pr.id).length; ACT.ch8SavePlan({ dataset: { id: pr.id } });
    ok('E1-L3 (negative) 7 instalments refused, naming the option that doesn\'t split', s4Plans(pr.id).length === v0 && /Self-Paced:/.test(main()) && /divide/.test(main()));
    go('a-programmes', { id: pr.id, tab: 'plan' }); meth('pp', 'both'); fill({ '#pp-n': '6' }); ACT.ch8SavePlan({ dataset: { id: pr.id } }); go('a-programmes', { id: pr.id, tab: 'plan' });
    ok('E1-L3 both: one plan for both options ("in one payment, or 6 monthly")', s4PlanCur(pr.id).meth === 'both' && /£2,400\.00 in one payment, or 6 monthly/.test(main()) && /£2,700\.00 in one payment, or 6 monthly/.test(main()));
    ok('E1-L3 each option\'s terms carry the shared method (no per-option override)', r1Opts(pr.id).every(o => r1TermsOf(o).meth === 'both' && r1TermsOf(o).inst === 6) && r1Opts(pr.id).every(o => !('meth' in o)));
  });
  await T('E1-B Level 3 sign-up pins the method with the option; no historical repricing', async () => {
    fresh(); const C = STORE.worlds.C, B = STORE.worlds.B, snapC = JSON.stringify([C.signup.plan, C.plans]), snapB = JSON.stringify([B.signup.plan, B.plans, B.admission.deposit]);
    FA(); planEdit('NV-L3', 'both', 4, 'Offer both');
    ok('E1-NR NV-L3 plan: both, 4 instalments, new version', s4PlanCur('NV-L3').meth === 'both' && s4PlanCur('NV-L3').inst === 4);
    ok('E1-NR Aisha (enrolled) and Priya (sign-up in progress) keep their pinned terms, plans and deposit exactly', JSON.stringify([C.signup.plan, C.plans]) === snapC && JSON.stringify([B.signup.plan, B.plans, B.admission.deposit]) === snapB && !C.signup.plan.meth && C.signup.plan.inst === 6);
    const w = toPay('NV-L3', 'L3-FO-STD');
    ok('E1-NR a new Level 3 sign-up pins the option with the method in force (both, 4)', w.signup.plan.opt.id === 'L3-FO-STD' && w.signup.plan.meth === 'both' && w.signup.plan.inst === 4 && Object.isFrozen(w.signup.plan));
    FA(); planEdit('NV-L3', 'one-time', null, 'Change again');
    ok('E1-NR a later change doesn\'t reach the started sign-up', w.signup.plan.meth === 'both' && w.signup.plan.inst === 4 && JSON.stringify([C.signup.plan, C.plans]) === snapC);
    learner('A'); go('admission'); ok('E1-NR the learner\'s payment step still offers what was pinned (both)', /Pay in full/.test(main()) && /4 monthly payments/.test(main()));
  });

  /* ================= C. Finance review ================= */
  await T('E1-C a creator\'s new programme: Draft terms, no notification until submitted; publishing blocked', async () => {
    fresh(); ACA(); const n0 = finNotifs().length, q0 = ADMIN.queue.length; const pr = newProg('Level 4 Review test', { price: 2400 });
    ok('E1-C created by the Academic Admin: payment terms Draft; no queue item; no Finance notification', e1T(pr.id).status === 'Draft' && ADMIN.queue.length === q0 && finNotifs().length === n0 && STORE.fin.notifs.length === STORE.fin.notifs.length);
    go('a-programmes', { id: pr.id, tab: 'plan' });
    ok('E1-C plan step: Draft chip, the proposal form (not Finance\'s plan form), "Set by Finance or the Super Admin"', /Draft — not yet submitted/.test(main()) && !!document.querySelector('#e1-n') && !document.querySelector('#pp-d') && /Set by Finance or the Super Admin/.test(main()) && !!app().querySelector('[data-act="e1Submit"]'));
    meth('e1', 'both'); fill({ '#e1-n': '4' }); INP.e1Live(document.querySelector('#e1-n'));
    ok('E1-C the payment summary follows the form before saving', /£2,400\.00 in one payment, or 4 monthly instalments of £600\.00/.test(document.querySelector('.e1-sumbox').textContent) && e1T(pr.id).prop.meth === 'instalments');
    ACT.e1Draft({ dataset: { id: pr.id } });
    ok('E1-C save draft: kept, audited, still not sent (no notification, no queue item)', e1T(pr.id).prop.meth === 'both' && e1T(pr.id).status === 'Draft' && ADMIN.audit[0].action === 'Payment terms draft saved' && finNotifs().length === n0 && ADMIN.queue.length === q0);
    ok('E1-C the creator can\'t save the plan itself (G5.2, logged)', (ACT.ch8SavePlan({ dataset: { id: pr.id } }), ADMIN.audit[0].action === 'Blocked: payment plan'));
    ready(pr); go('a-programmes', { id: pr.id, tab: 'review' }); const pub = app().querySelector('[data-act="ch8Publish"]');
    ok('E1-C review: "Payment terms not yet sent to Finance" is blocking; Publish disabled with a reason', /Payment terms not yet sent to Finance/.test(main()) && pub.disabled && !!pub.title);
    ACT.ch8Publish({ dataset: { id: pr.id } }); ok('E1-C (negative) publish refused while terms are unapproved (logged)', pr.status === 'Draft' && ADMIN.audit[0].action === 'Blocked: publish (items missing)'); closeModal();
    ok('E1-C stepper: the Payment plan step isn\'t marked done', (go('a-programmes', { id: pr.id, tab: 'details' }), !app().querySelector('.ch8-steps .step.done [data-tab="plan"]')));
  });
  await T('E1-C submit: one queue item, one Finance notification, terms locked; reloads add nothing', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Submit test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' }); meth('e1', 'both'); fill({ '#e1-n': '4' });
    ACT.e1Submit({ dataset: { id: pr.id } }); ok('E1-C submit asks for confirmation with the summary', !!MODAL && /Submit payment terms to Finance/.test(MODAL.title) && /in one payment, or 4 monthly/.test(mroot().textContent)); press();
    const T1 = e1T(pr.id), i = ADMIN.queue.find(x => x.id === T1.qid);
    ok('E1-C one "Programme payment terms" item: Pending, first approver Finance Admin (Leila Haddad), with the proposal', !!i && i.type === 'Programme payment terms' && i.status === 'Pending' && i.first === FIN_A && i.raisedBy === ADMIN.me.name && i.data.prop.meth === 'both' && i.data.prop.inst === 4 && T1.status === 'Pending');
    const fn = finNotifs(); ok('E1-C exactly one in-app notification to that Finance Admin, linking to the item', fn.length === 1 && fn[0].to === FIN_A && fn[0].go === 'a-queue.' + i.id && fn[0].unread);
    go('a-programmes', { id: pr.id, tab: 'plan' }); ok('E1-C plan step: "Waiting for Finance review", read-only, no submit', /Waiting for Finance review/.test(main()) && !document.querySelector('#e1-n') && !app().querySelector('[data-act="e1Submit"]'));
    ACT.e1Submit({ dataset: { id: pr.id } }); ok('E1-C (negative) submitting again is refused (no second item or notification)', ADMIN.queue.filter(x => x.type === 'Programme payment terms').length === 1 && finNotifs().length === 1);
    go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-p': '2600' }); ACT.ch8SaveDetails({ dataset: { id: pr.id } }); ok('E1-C (negative) the fee can\'t change while Finance reviews it', pr.price === 2400 && /with Finance for review/.test(main()));
    for (let k = 0; k < 3; k++) { render(); go('a-programmes', { id: pr.id, tab: 'plan' }); go('a-programmes', { id: pr.id, tab: 'review' }); }
    rebuildA(); FA(); go('f-dashboard'); go('a-queue'); go('a-queue', { id: i.id }); FB(); go('f-dashboard'); FA(); go('f-dashboard'); e1DurMigrate();
    ok('E1-C reloads, rebuilds and identity switches add no notification or item', finNotifs().length === 1 && ADMIN.queue.filter(x => x.type === 'Programme payment terms').length === 1);
    ok('E1-C Leila sees it in her notifications and "Awaiting me"', ADMIN.myNotifs.some(n => n.key === 'e1-sub-' + i.id) && allQueue().filter(awaitingMe).some(x => x.id === i.id));
    go('a-queue'); ok('E1-C Finance queue lists it as "Programme payment terms"', new RegExp(i.id + '[\\s\\S]{0,40}Programme payment terms').test(main()));
    FB(); go('f-dashboard'); ok('E1-C Mark Bennett (other Finance Admin) gets no copy', !ADMIN.myNotifs.some(n => n.key === 'e1-sub-' + i.id));
  });
  await T('E1-C permissions: only a Finance Admin decides; never the creator; no rejecting', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Permission test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    ok('E1-C (negative) the creator can\'t approve their own terms', applyDecision(i, 'approve', 'mine') === false && i.status === 'Pending' && e1T(pr.id).status === 'Pending');
    ok('E1-C (negative) the creator can\'t request changes either (logged)', applyDecision(i, 'return', 'mine') === false && i.status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms');
    role('sysA'); ok('E1-C (negative) a System Admin can\'t decide payment terms', applyDecision(i, 'approve', 'sys') === false && i.status === 'Pending');
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('E1-C (negative) the decision dialog isn\'t opened for a System Admin', !MODAL);
    FA(); ok('E1-C (negative) Finance can\'t reject outright or ask for info — approve or request changes only', applyDecision(i, 'reject', 'no') === false && applyDecision(i, 'info', 'q') === false && i.status === 'Pending');
    go('a-queue', { id: i.id }); const btns = [...app().querySelectorAll('.q-decide button')].map(b => b.textContent.trim());
    ok('E1-C queue item states the confirmed requirement (Finance approves financial terms only) and the provisional routing details', /Confirmed \(20 Oct 2026\): a Finance Admin approves payment terms proposed for a new programme/.test(main()) && /not academic content or publication/.test(main()) && /reviewer routing — provisional/.test(main()) && /doesn't escalate/.test(main()));
    ok('E1-C queue item: the proposal panel and only "Approve payment terms" / "Request changes" (+ note)', !!app().querySelector('.e1-q') && btns.includes('Approve payment terms') && btns.includes('Request changes') && !btns.includes('Reject') && !btns.some(b => /Request further information/.test(b)));
    ok('E1-C Finance has no publishing authority (publish refused, logged)', (ACT.ch8Publish({ dataset: { id: pr.id } }), pr.status === 'Draft' && ADMIN.audit[0].action === 'Blocked: publish'));
  });
  await T('E1-C confirmed rule: only an Active Finance Admin decides, before and after 7 days; a reason is required', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Governance test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    SA(); ok('E1-CF (negative) the Super Admin can\'t approve a pending item (Finance decides; logged)', applyDecision(i, 'approve', 'SA approve') === false && i.status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms');
    ok('E1-CF (negative) nor request changes', applyDecision(i, 'return', 'SA return') === false && i.status === 'Pending');
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('E1-CF (negative) no decision dialog for the Super Admin', !MODAL);
    go('a-queue', { id: i.id }); const b = app().querySelector('.q-decide [data-a="approve"]'); ok('E1-CF Super Admin\'s queue view: decision buttons disabled with the reason', !!b && b.disabled && /Only an Active Finance Admin/.test(b.title));
    FA(); ok('E1-CF (negative) Finance: approving without a reason is refused', applyDecision(i, 'approve', '  ') === false && i.status === 'Pending');
    ok('E1-CF (negative) Finance: requesting changes without a reason is refused', applyDecision(i, 'return', '') === false && i.status === 'Pending' && e1T(pr.id).status === 'Pending');
    FB(); ok('E1-CF another active Finance Admin (Mark Bennett) may decide; the creator is told once', applyDecision(i, 'return', 'Use the own deposit of £200.') !== false && i.status === 'Returned to Requester' && e1T(pr.id).status === 'Changes' && (STORE.aca.notifs.filter(n => n.to === 'Rachel Hughes' && /changes requested/.test(n.t)).length === 1));
    // E1 final correction: the item never escalates — after 7 days it stays with Finance, marked overdue for information only
    ACA(); go('a-programmes', { id: pr.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const j = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    j.raised = D(-8); j.history[0][1] = j.raised; allQueue();
    ok('E1-OD after 8 days: still Pending with its Finance approver, not escalated, marked overdue (informational)', j.status === 'Pending' && !j.escalated && j.overdue === true && j.first === FIN_A);
    SA(); go('a-queue'); ok('E1-OD not in the Super Admin\'s "Escalated to me"', !allQueue().filter(x => x.escalated && isOpen(x)).some(x => x.id === j.id));
    ok('E1-OD (negative) the Super Admin can\'t approve it after 7 days (logged)', applyDecision(j, 'approve', 'Late SA approval') === false && j.status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms');
    ok('E1-OD (negative) nor request changes after 7 days', applyDecision(j, 'return', 'Late SA return') === false && j.status === 'Pending');
    go('a-queue', { id: j.id }); ok('E1-OD the item shows "Overdue … stays with Finance", no escalation note; Super Admin\'s buttons disabled', /Overdue/.test(main()) && /stays with Finance/.test(main()) && !/Escalated automatically/.test(main()) && app().querySelector('.q-decide [data-a="approve"]').disabled);
    const n0 = [STORE.fin.notifs.length, STORE.aca.notifs.length, STORE.sys.notifs.length, ADMIN.queue.length].join();
    FA(); go('f-dashboard'); go('a-queue'); for (let k = 0; k < 3; k++) { allQueue(); render(); }
    ok('E1-OD still in the Finance Admin\'s "Awaiting me"', allQueue().filter(awaitingMe).some(x => x.id === j.id));
    ok('E1-OD nothing automatic: no notice, no new item, no approval or rejection', [STORE.fin.notifs.length, STORE.aca.notifs.length, STORE.sys.notifs.length, ADMIN.queue.length].join() === n0 && j.status === 'Pending' && e1T(pr.id).status === 'Pending');
    const st = ADMIN.staff.find(x => x.name === FIN_A); st.status = 'Inactive';
    ok('E1-OD (negative) an Inactive Finance Admin can\'t decide', applyDecision(j, 'approve', 'Inactive') === false && j.status === 'Pending'); st.status = 'Active';
    ok('E1-OD the Active Finance Admin still approves after 8 days', applyDecision(j, 'approve', 'Approved after 8 days') !== false && j.status === 'Approved' && j.decidedBy === FIN_A && e1T(pr.id).status === 'Approved' && e1T(pr.id).approved.by === FIN_A);
  });
  await T('E1-OD other approval types keep their existing 7-day behaviour', async () => {
    fresh(); SA(); const vat = ADMIN.queue.find(x => x.id === 'AQ-7301'); vat.raised = D(-8); vat.history[0][1] = vat.raised; allQueue();
    ok('E1-OD Bundle VAT change still escalates to the Super Admin after 7 days', vat.status === 'Escalated' && vat.escalated === true);
    const ref = ADMIN.queue.find(x => x.type === 'Refund' && x.status === 'Pending'); if (ref) { ref.raised = D(-9); allQueue(); }
    ok('E1-OD a Refund still escalates after 7 days', !!ref && ref.status === 'Escalated');
    ok('E1-OD reminder-only types keep their reminder (e.g. Data correction, Discount rate change); payment terms are not among them', ['Data correction', 'Discount rate change'].every(t => REMIND_TYPES.includes(t)) && !REMIND_TYPES.includes('Programme payment terms'));
    ok('E1-OD the Super Admin still decides an escalated item of another type', applyDecision(vat, 'approve', 'Escalated VAT approved') !== false && vat.status === 'Approved');
  });
  await T('E1-OD decided items can\'t be processed twice; notifications, versions and audit stay intact', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Twice test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    FA(); ACT.e1Decide({ dataset: { id: i.id, a: 'return' } }); reason('Use 4 instalments.');
    const snapR = () => [i.status, e1T(pr.id).status, e1T(pr.id).hist.length, STORE.aca.notifs.length, finNotifs().length, s4Plans(pr.id).length, ADMIN.audit.filter(a => /^Payment terms/.test(a.action) && a.entity.includes(pr.id)).length].join();
    const r0 = snapR();
    ok('E1-OD (negative) a returned item can\'t be approved or returned again', applyDecision(i, 'approve', 'again') === false && applyDecision(i, 'return', 'again') === false && snapR() === r0);
    ACT.qOverride({ dataset: { id: i.id } }); ok('E1-OD (negative) no override on a payment-terms item', !MODAL && i.status === 'Returned to Requester');
    ACA(); go('a-programmes', { id: pr.id, tab: 'plan' }); meth('e1', 'instalments'); fill({ '#e1-n': '4' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const k = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    FA(); const v0 = s4Plans(pr.id).length; ACT.e1Decide({ dataset: { id: k.id, a: 'approve' } }); reason('Agreed.');
    const snapA = () => [k.status, e1T(pr.id).status, e1T(pr.id).hist.length, STORE.aca.notifs.length, finNotifs().length, s4Plans(pr.id).length, ADMIN.audit.filter(a => /^Payment terms/.test(a.action) && a.entity.includes(pr.id)).length].join();
    const a0 = snapA();
    ok('E1-OD approved: one new plan version; the earlier version kept as Superseded', s4Plans(pr.id).length === v0 + 1 && s4Plans(pr.id)[v0 - 1].status === 'Superseded' && s4PlanCur(pr.id).inst === 4);
    ACT.e1Decide({ dataset: { id: k.id, a: 'approve' } }); reason('again'); ACT.e1Decide({ dataset: { id: k.id, a: 'return' } }); reason('again'); closeModal();
    ok('E1-OD (negative) an approved item can\'t be processed again: no new version, notice or audit entry', snapA() === a0 && k.status === 'Approved');
    ok('E1-OD audit trail: submitted twice, changes requested once, approved once', ['Payment terms submitted for Finance review', 'Payment terms: changes requested', 'Payment terms approved'].map(x => ADMIN.audit.filter(a => a.action === x && a.entity.includes(pr.id)).length).join() === '2,1,1');
    ok('E1-OD notifications: two to Finance (one per submission), two to the creator (one per decision)', finNotifs().length === 2 && STORE.aca.notifs.filter(n => n.to === 'Rachel Hughes' && /^Payment terms/.test(n.t)).length === 2);
  });
  await T('E1-C confirmed rule scope: new programmes only; existing plans, published programmes and enrolments unchanged', async () => {
    fresh(); const l3 = JSON.stringify(s4Plans('NV-L3')), C = JSON.stringify([STORE.worlds.C.signup.plan, STORE.worlds.C.plans]);
    ACA(); go('a-programmes', { id: 'NV-N2', tab: 'plan' }); ok('E1-CS a published programme: no proposal form, no submit (amendments not extended to Finance review)', !document.querySelector('#e1-n') && !app().querySelector('[data-act="e1Submit"]') && !e1T('NV-N2'));
    ok('E1-CS (negative) submitting terms for a published programme is refused', (ACT.e1Submit({ dataset: { id: 'NV-N2' } }), !ADMIN.queue.some(x => x.type === 'Programme payment terms')));
    ok('E1-CS no review record for seeded / existing programmes; their plans unchanged', ['NV-L2', 'NV-L3', 'NV-L5', 'NV-N1', 'NV-N2'].every(pid => !e1T(pid)) && JSON.stringify(s4Plans('NV-L3')) === l3 && JSON.stringify([STORE.worlds.C.signup.plan, STORE.worlds.C.plans]) === C);
    SA(); const pr = newProg('Level 4 D8 test'); ok('E1-CS the Super Admin\'s own new programme: terms approved at once (D8 unchanged), no queue item', e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(x => x.type === 'Programme payment terms'));
  });
  await T('E1-C notifications: one Finance item and notice per submission; the creator is told on each decision', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Notify test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' });
    ACT.e1Submit({ dataset: { id: pr.id } }); const okFn = MODAL.actions.find(x => /primary/.test(x.cls)).fn; okFn(); okFn(); closeModal();
    ok('E1-CN double-clicking "Submit for review": one item, one Finance notification', ADMIN.queue.filter(x => x.type === 'Programme payment terms').length === 1 && finNotifs().length === 1);
    const i = ADMIN.queue.find(x => x.type === 'Programme payment terms');
    FA(); go('f-dashboard'); ok('E1-CN the routed Finance Admin\'s bell lists it, linking to the review item', ADMIN.myNotifs.some(n => n.key === 'e1-sub-' + i.id && n.go === 'a-queue.' + i.id && /Programme payment terms to review/.test(n.t)));
    ok('E1-CN Finance dashboard "Awaiting my approval" names the type', /Programme payment terms/.test(main()));
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('OK'); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('again');
    const told = () => STORE.aca.notifs.filter(n => n.to === 'Rachel Hughes' && /^Payment terms/.test(n.t));
    ok('E1-CN approve clicked twice: one decision, one notice to the creator', i.status === 'Approved' && told().length === 1 && /approved/.test(told()[0].t) && told()[0].go === `a-programmes.${pr.id}.plan`);
    rebuildA(); ACA(); go('k-dashboard'); ok('E1-CN rebuilds add nothing; the creator sees the notice in their own notifications', told().length === 1 && finNotifs().length === 1 && acaNotifs().some(n => /Payment terms approved/.test(n.t)));
    // a System Admin creator is told through the System Admin's notifications
    role('sysA'); const ps = newProg('Level 4 Sys creator test', { price: 2400 }); const sysName = ADMIN.me.name;
    ok('E1-CN a System Admin\'s new programme starts with Draft terms', e1T(ps.id).status === 'Draft');
    go('a-programmes', { id: ps.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: ps.id } }); press(); const k = ADMIN.queue.find(x => x.id === e1T(ps.id).qid);
    FA(); ACT.e1Decide({ dataset: { id: k.id, a: 'return' } }); reason('Check the deposit.');
    ok('E1-CN the System Admin creator is told once, in their own notifications', STORE.sys.notifs.filter(n => n.to === sysName && /changes requested/.test(n.t)).length === 1 && finNotifs().length === 2);
  });
  await T('E1 review: Finance\'s "Edit plan" stays in Finance; queue labels show each business type', async () => {
    fresh(); FA(); go('f-plans');
    const toProg = () => app().querySelectorAll('[data-go="a-programmes"], [data-t^="a-programmes"], a[href^="#a-programmes"]').length;
    ok('E1-R Finance → Payment Plans: no link into NVQ Programmes (Finance can\'t open them)', toProg() === 0, toProg());
    app().querySelector('.ch8-plans [data-act="s4PlanEdit"][data-p="NV-N2"]').click();
    ok('E1-R "Edit plan" opens Finance\'s own plan editor (method, instalments, deposit; fee read-only for Finance)', !!MODAL && /Payment plan — /.test(MODAL.title) && document.querySelectorAll('input[name="pp-meth"]').length === 3 && document.querySelector('#pp-f').readOnly);
    const v0 = s4Plans('NV-N2').length; const x = document.querySelector('input[name="pp-meth"][value="both"]'); x.checked = true; reason('Offer both');
    ok('E1-R saved as a new plan version, audited; the older version kept', s4Plans('NV-N2').length === v0 + 1 && s4Plans('NV-N2')[v0 - 1].status === 'Superseded' && ADMIN.audit.some(a => a.module === 'Payment Plans' && /Both — the learner chooses/.test(a.after)));
    go('f-plans', { tab: 'templates' }); ok('E1-R the Plan templates tab: no link into NVQ Programmes either', toProg() === 0);
    ACA(); const pr = newProg('Level 4 Link test', { price: 2400 }); go('a-programmes', { id: pr.id, tab: 'plan' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    FA(); go('f-plans'); const rv = app().querySelector(`.ch8-plans [data-go="a-queue"][data-id="${i.id}"]`); ok('E1-R while terms wait, the programme\'s button opens the review item', !!rv && /Review terms/.test(rv.textContent) && toProg() === 0);
    rv.click(); ok('E1-R … which Finance can open', S.route === 'a-queue' && !!app().querySelector('.e1-q') && !/You don't have permission/.test(main()));
    ok('E1-R the review item\'s related record opens Finance → Payment Plans', (app().querySelector('a[data-t="f-plans..templates"]') || {}).textContent !== undefined);
    // labels: every Finance item shows its own business type in the list and the filter
    ADMIN.queue.unshift({ id: 'AQ-9990', type: 'Agency invoice (offline) purchase', raisedBy: 'Agency test', raised: D(-1), status: 'Pending', first: FIN_A, related: ['Agency test · INV', 'f-ledger'], notes: [], amount: 100, cur: 'GBP', reason: 'test', history: [['Agency test', D(-1), 'Raised', '']], data: {} });
    setUi('fqTab', 'all'); go('a-queue'); const rows = [...app().querySelectorAll('main tbody tr')].map(tr => tr.textContent);
    const typeOf = id => (rows.find(r => r.includes(id)) || '');
    ok('E1-R Bundle VAT request shown as "Bundle VAT change" (not "Agency invoice purchase")', /Bundle VAT change/.test(typeOf('AQ-7301')) && !/Agency invoice purchase/.test(typeOf('AQ-7301')), typeOf('AQ-7301'));
    ok('E1-R Programme payment terms shown as such', /Programme payment terms/.test(typeOf(i.id)) && !/Agency invoice purchase/.test(typeOf(i.id)));
    ok('E1-R Agency invoice purchase still shown as "Agency invoice purchase"', /Agency invoice purchase/.test(typeOf('AQ-9990')));
    ok('E1-R refunds still "Refund"', rows.filter(r => /Refund/.test(r)).length > 0);
    const opts = [...app().querySelectorAll('main select option')].map(o => o.textContent);
    ok('E1-R the Type filter offers the same labels', ['Refund', 'Agency invoice purchase', 'Bundle VAT change', 'Programme payment terms'].every(l => opts.includes(l)), opts.join('|'));
    ok('E1-R routing and permissions unchanged (finance types, first approver)', FIN_TYPES.includes('Bundle VAT setting') && ADMIN.queue.find(x => x.id === 'AQ-7301').first === FIN_A);
  });
  await T('E1-C request changes → resubmit → approve → publish; approved plans untouched elsewhere', async () => {
    fresh(); const l3 = JSON.stringify(s4Plans('NV-L3')), n2 = JSON.stringify(s4Plans('NV-N2'));
    ACA(); const pr = newProg('Level 4 Lifecycle test', { price: 2400 }); ready(pr); go('a-programmes', { id: pr.id, tab: 'plan' }); meth('e1', 'one-time'); ACT.e1Submit({ dataset: { id: pr.id } }); press();
    const i1 = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    SA(); go('a-programmes', { id: pr.id, tab: 'plan' }); ok('E1-C the Super Admin sees the proposal on the plan step, read-only: a Finance Admin decides (no decision buttons, plan form locked)', /Proposed terms/.test(main()) && /A Finance Admin approves these terms/.test(main()) && !app().querySelector('[data-act="e1Decide"]') && !document.querySelector('#pp-n'));
    FA(); ACT.e1Decide({ dataset: { id: i1.id, a: 'return' } }); ok('E1-C request changes needs a reason', reason('') === false && i1.status === 'Pending'); closeModal();
    const a0 = acaNotifs().length; ACT.e1Decide({ dataset: { id: i1.id, a: 'return' } }); reason('Offer instalments as well — most learners pay monthly.');
    ok('E1-C changes requested: item returned, terms "Changes requested", one notice to the creator', i1.status === 'Returned to Requester' && e1T(pr.id).status === 'Changes' && acaNotifs().length === a0 + 1 && acaNotifs()[0].to === 'Rachel Hughes');
    ok('E1-C (negative) a decided item can\'t be decided again', applyDecision(i1, 'approve', 'late') === false && i1.status === 'Returned to Requester');
    ACA(); go('a-programmes', { id: pr.id, tab: 'plan' }); ok('E1-C the creator sees Finance\'s reason and can edit again', /Changes requested/.test(main()) && /Offer instalments as well/.test(main()) && !!document.querySelector('#e1-n'));
    ok('E1-C publishing still blocked ("Finance requested changes")', ch8Check(pr).block.some(b => /Finance requested changes/.test(b)));
    meth('e1', 'both'); fill({ '#e1-n': '6' }); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i2 = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    ok('E1-C resubmitted: a new item and exactly one new Finance notification', i2 && i2.id !== i1.id && i2.status === 'Pending' && finNotifs().length === 2);
    FA(); const v0 = s4Plans(pr.id).length; ACT.e1Decide({ dataset: { id: i2.id, a: 'approve' } }); reason('Agreed.');
    const p = s4PlanCur(pr.id);
    ok('E1-C approved: a new plan version with the terms, by Finance, citing the item', i2.status === 'Approved' && s4Plans(pr.id).length === v0 + 1 && p.meth === 'both' && p.inst === 6 && p.by === FIN_A && p.note.includes(i2.id) && e1T(pr.id).status === 'Approved');
    ok('E1-C the creator is told once', acaNotifs().length === a0 + 2 && /approved/.test(acaNotifs()[0].t));
    ok('E1-C other programmes\' approved plans are untouched', JSON.stringify(s4Plans('NV-L3')) === l3 && JSON.stringify(s4Plans('NV-N2')) === n2);
    ACA(); go('a-programmes', { id: pr.id, tab: 'review' }); ok('E1-C review: terms Approved, nothing blocking', /Approved/.test(main()) && !ch8Check(pr).block.length);
    ACT.ch8Publish({ dataset: { id: pr.id } }); reason('Ready'); ok('E1-C published by the Academic Admin (existing role)', pr.status === 'Active');
    learner('A'); go('browse'); const c = CATALOGUE.find(x => x.title === pr.title); ok('E1-C purchasable only now, at the approved fee', !!c && c.price === 2400);
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); ok('E1-C a published programme\'s details stay read-only (unchanged rule)', !document.querySelector('#np-p') && !document.querySelector('#np-d') && main().includes('Duration12 months'));
  });
  await T('E1-C a fee change after approval needs approval again; Finance\'s own save approves', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Refee test', { price: 2400 }); FA(); go('f-plans', { tab: 'templates' }); planEdit(pr.id, 'instalments', 4, 'Finance sets the plan');
    ok('E1-C Finance\'s own save (Payment Plans editor) on a Draft programme = approved terms (no queue item, no notification)', e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms') && !finNotifs().length);
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-p': '3000' }); ACT.ch8SaveDetails({ dataset: { id: pr.id } });
    ok('E1-C creator changed the fee after approval: back to Draft, audited', pr.price === 3000 && e1T(pr.id).status === 'Draft' && ADMIN.audit.some(a => a.action === 'Payment terms need Finance approval again'));
  });
  await T('E1-C terms in force before E1 and the Super Admin\'s own programmes', async () => {
    fresh(); const n1 = ch8Pr('NV-N1');
    ok('E1-C seeded NV-N1 (Draft): terms in force, no new blocker (only its existing ones)', !e1T('NV-N1') && e1Ok(n1) && !ch8Check(n1).block.some(b => /Payment terms/.test(b)) && ch8Check(n1).block.some(b => /without a type/.test(b)));
    ACA(); go('a-programmes', { id: 'NV-N1', tab: 'plan' }); ok('E1-C NV-N1 plan step for the Academic Admin: read-only as before', !document.querySelector('#e1-n') && !document.querySelector('#pp-d') && /Set by Finance or the Super Admin/.test(main()));
    SA(); const pr = newProg('Level 4 SA test'); ok('E1-C Super Admin\'s programme: approved at once, no queue item, no Finance notification', e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms') && !finNotifs().length);
    ACT.qRouting(); ok('E1-C the confirmed routing table (G4 "Who approves what") is unchanged: 19 rows, no provisional type', document.querySelectorAll('#modal-root tbody tr').length === 19 && !/Programme payment terms/.test(mroot().textContent)); closeModal();
  });

  /* ================= E1 clarification (20 Oct 2026): administrators configure the methods; learners use only those ================= */
  const l3Wizard = (title, rows) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (4000 + title.length) + '/3', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l')); rows.forEach(([l, f, m], k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('#modal-root .r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; }); };
  const payOpts = () => [...document.querySelectorAll('main input[name="su-opt"]')].map(x => x.value).sort().join();
  await T('E1-CL Step 1: concise fee guidance; no instalment assumption before the Payment Plan step', async () => {
    fresh(); ACA(); go('a-programmes'); ACT.chProgNew(); INP.r1NpLevel(Object.assign(document.querySelector('#np-l'), { value: 'Level 3' }));
    const t = document.querySelector('#modal-root .r1-np-opts').textContent;
    ok('E1-CL Step 1 Level 3 fee options: "Add the available fees and delivery modes … configured in the Payment Plan step."', /Add the available fees and delivery modes for this programme\. Payment methods and instalments are configured in the Payment Plan step\./.test(t));
    ok('E1-CL Step 1 no longer states six (or any) instalments or the split rule', !/instalments \(|split evenly|unless changed|\b6\b/.test(t)); closeModal();
    l3Wizard('Level 3 Certificate in Pay Config', [['Self-Paced', '500', 'Self-Paced']]); const n0 = (STORE.chNewProgs || []).length; prim();
    const pr = last(); closeModal();
    ok('E1-CL Step 1 accepts a fee that doesn\'t split into 6 (£500) — the split is checked against the configured method later', (STORE.chNewProgs || []).length === n0 + 1 && pr.title === 'Level 3 Certificate in Pay Config' && r1Opts(pr.id)[0].fee === 500);
    ['0', '12.345', String(R1_FEE_MAX + 1)].forEach(f => { l3Wizard('Level 3 Bad fee ' + f, [['Self-Paced', f, 'Self-Paced']]); ok(`E1-CL (negative) Step 1 still refuses an invalid fee amount (${f})`, prim() === false && /Enter a fee/.test(mroot().textContent)); closeModal(); });
    FA(); ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }); ok('E1-CL a fee option added later still checks against the plan in force (6 instalments: £500 refused)', (fill({ '#fo-l': 'Bad', '#fo-f': '500', '#fo-m': 'Self-Paced' }), reason() === false) && /equal instalments/.test(mroot().textContent)); closeModal();
  });
  await T('E1-CL the creator configures the method; Finance approval gates it; the split is checked for the method chosen', async () => {
    fresh(); ACA(); l3Wizard('Level 3 Certificate in One Payment', [['Self-Paced', '500', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted']]); prim(); closeModal(); const pr = last(), v0 = s4Plans(pr.id).length;
    go('a-programmes', { id: pr.id, tab: 'plan' }); const q0 = ADMIN.queue.length;
    ok('E1-CL plan step: three configurations offered to the creator (one payment, instalments, both)', ['one-time', 'instalments', 'both'].every(m => !!document.querySelector(`input[name="e1-meth"][value="${m}"]`)));
    meth('e1', 'instalments'); fill({ '#e1-n': '6' }); ACT.e1Submit({ dataset: { id: pr.id } });
    ok('E1-CL (negative) instalments × 6 refused for £500 / £1,000, naming the option; nothing sent', !MODAL && ADMIN.queue.length === q0 && /Self-Paced:/.test(main()) && /divide/.test(main()));
    meth('e1', 'one-time'); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    ok('E1-CL one payment submitted: one Finance item with the proposal (no instalments)', !!i && i.status === 'Pending' && i.data.prop.meth === 'one-time' && i.data.prop.inst === 1);
    ok('E1-CL (gate) the proposed method isn\'t in force before Finance approves', s4Plans(pr.id).length === v0 && s4PlanCur(pr.id).meth !== 'one-time' && ch8Check(pr).block.some(b => /waiting for Finance review/.test(b)));
    FA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('One payment agreed.');
    const p = s4PlanCur(pr.id); ok('E1-CL approved by Finance: plan in force is one payment, no instalments; both options reconcile', p.meth === 'one-time' && p.inst === 1 && r1Opts(pr.id).every(o => !r1TermsOf(o).issue));
    ok('E1-CL Finance\'s fee-options form states no instalment split for a one-payment plan', (ACT.r1OptAdd({ dataset: { p: pr.id } }), /how learners pay \(one payment\)/.test(mroot().textContent) && !/divide into those instalments/.test(mroot().textContent) && /must be above the deposit/.test(mroot().textContent))); closeModal();
  });
  await T('E1-CL learners see only the approved methods; the instalment count is fixed; the fee option is separate', async () => {
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added'); const o2 = r1Opts('NV-L3').find(o => o.fee === 3000);
    // Full payment only
    FA(); planEdit('NV-L3', 'one-time', null, 'One payment only'); let w = toPay('NV-L3', o2.id);
    ok('E1-CL one payment only: "Pay in full" (and the eligible deposit); no instalment choice, no count to edit', payOpts() === 'deposit,full' && !document.querySelector('main input[type="number"]') && !/monthly payments/.test(main()));
    setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); let pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-CL (negative) a forced "instalment" choice is ignored: paid in full, one row of the option\'s fee', w.signup.done && w.signup.pay.full && pl.rows.length === 1 && pl.rows[0].amount === 3000);
    // Instalments only
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added');
    FA(); planEdit('NV-L3', 'instalments', 4, 'Instalments only'); w = toPay('NV-L3', r1Opts('NV-L3').find(o => o.fee === 3000).id);
    ok('E1-CL instalments only: the approved 4 monthly payments (and the deposit); no "Pay in full"; no count to edit', payOpts() === 'deposit,instalment' && /4 monthly payments of £750.00/.test(main()) && !/Pay in full/.test(main()) && !document.querySelector('main input[type="number"]'));
    setUi('suOpt', 'full'); setUi('suMethod', 'bank'); render(); ACT.suPay(); pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-CL (negative) a forced "full" choice is ignored: exactly the approved 4 instalments', w.signup.done && !w.signup.pay.full && pl.rows.length === 4 && pl.rows.every(r => r.amount === 750) && w.signup.plan.inst === 4);
    // Both
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added');
    const snap = () => JSON.stringify(['B', 'C'].map(k => [STORE.worlds[k].signup.plan, STORE.worlds[k].plans, STORE.worlds[k].admission.deposit]));
    const hist0 = snap(); FA(); planEdit('NV-L3', 'both', 4, 'Both'); w = toPay('NV-L3', r1Opts('NV-L3').find(o => o.fee === 3000).id);
    ok('E1-CL both: "Pay in full" and "4 monthly payments" offered; the count is fixed (no input)', payOpts() === 'deposit,full,instalment' && /Pay in full — £3,000.00 now/.test(main()) && /4 monthly payments of £750.00/.test(main()) && !document.querySelector('main input[type="number"]'));
    ok('E1-CL existing learners\' pinned plans and deposits unchanged by the new terms', snap() === hist0 && !STORE.worlds.C.signup.plan.meth && STORE.worlds.C.signup.plan.inst === 6);
    // Fee option ≠ payment method: another option changes the agreed price (and mode), not the methods or the count
    fresh(); SA(); FA(); planEdit('NV-L3', 'both', 4, 'Both'); const std = toPay('NV-L3', 'L3-FO-STD');
    ok('E1-CL Level 3: the fee option sets the agreed price; the method and count come from the plan', std.signup.plan.opt.id === 'L3-FO-STD' && std.signup.plan.meth === 'both' && std.signup.plan.inst === 4 && std.signup.plan.fee === 2400 && payOpts() === 'deposit,full,instalment' && w.signup.plan.opt.mode === 'Self-Paced' && w.signup.plan.fee === 3000);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
