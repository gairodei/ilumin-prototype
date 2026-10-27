// E1 — NVQ programme duration and payment configuration (provisional enhancement, Oct 2026): structured duration and legacy
// compatibility, one payment / instalments / both on the programme plan (inherited by Level 3 fee options), the learner's choice at
// sign-up, no repricing of existing learners, and the Finance review of a new programme's payment terms. Each check does the action
// through the screen or handler, then checks the consuming screen or record, and includes the negative case.
(async function () {
  // DM-P (PD-DM-15): publishing a programme or version needs fee options by delivery mode, approved by Finance. Where a check isn't about
  // fees, this fixture takes the authorized Section 5 path first: the duration of a pre-builder course, a financial package, fee options by
  // delivery mode, a mode for each option (the Standard programme fee replaced by an option at the same fee), the Super Administrator's own approval (D8)
  const dmpComply = (pid, mode = 'Fully Assisted') => {
    const pr = s3Pr(pid) || cbPr(pid); if (!pr) return false; const av = ADMIN.av, po = S.portal, aca = typeof isAca === 'function' && isAca();
    const qm1 = k => document.querySelector('#modal-root ' + k), put = (k, v) => { const e = qm1(k); if (e && !e.value) e.value = v; };
    const go1 = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
    const rs = () => { const e = document.querySelector('#rsn'); if (e) e.value = 'Fixture: fee options by delivery mode'; return go1(); };
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    if (!pr.durV) { ACT.crDurRec({ dataset: { p: pr.id } }); put('#cr-du-n', '12'); rs(); }
    if (!cb8Managed(pr)) ACT.cb8Start({ dataset: { p: pr.id } });
    if (!crMultiFee(pr)) { ACT.crFoStart({ dataset: { p: pr.id } }); rs(); }
    cb8Work(pr).opts.filter(o => o.status === 'Active' && (o.legacy || !M_MODES.includes(o.mode))).map(o => o.id).forEach(id => {
      const o = cb8Work(pr).opts.find(x => x.id === id);
      if (o.legacy) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String(o.fee); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); ACT.cb8OptRetire({ dataset: { p: pr.id, o: id } }); rs(); }
      else { ACT.cb8Opt({ dataset: { p: pr.id, o: id } }); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-f', '2400'); /* a course without any fee (seeded Level 4): the fixture enters one */ put('#c8-wp', '0'); put('#c8-off', '0'); go1(); }
      closeModal();
    });
    if (!cb8Work(pr).opts.some(o => o.status === 'Active' && !o.legacy && M_MODES.includes(o.mode))) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String((s4PlanCur(pr.id) || {}).fee || 2400); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); closeModal(); } // no option at all (a Level 3 package starts from the options in force): one at the plan's fee
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
    if (!(cb8Wf(pr) && cb8Wf(pr).status === 'Approved')) { ACT.cb8SaApprove({ dataset: { p: pr.id } }); rs(); }
    closeModal(); if (aca) { acaEnter(av); S.signedIn = true; } else setAdminIdentity(av); S.portal = po; return true;
  };
  const dmpPrice = () => { const r = document.querySelector('main #cr-pm-price'); if (r && !r.checked) { r.checked = true; INP.crPm(r); } }; // DM-P (PD-DM-18): "One programme price" is now an explicit choice (fee options by delivery mode are the default)
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
  // PD-M-11: options created later are no longer accepted by existing batches automatically; this suite's journeys assume they are, so an
  // administrator accepts them explicitly on the open Level 3 Diploma batches (the audited Change-dialog path) — assertions unchanged
  const m11Accept = () => { mFreezeAll(); ADMIN.batches.filter(b => w1L3(b) && r2Pid(b) === 'NV-L3' && !w1Closed(b)).forEach(b => { const add = r1Opts('NV-L3').filter(o => o.status === 'Active' && !b.w1opts.includes(o.id)).map(o => o.id); if (add.length) mApply(b, b.w1opts.concat(add), 'Accepted explicitly (test fixture, PD-M-11)'); }); };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  // N5a review (supersedes publishing without it): every new programme and new version records "Observation required" (Yes / No) first
  const obsDecide = (id, v = 'no') => { ACT.n5Settings({ dataset: { p: id } }); const r = document.querySelector(`#modal-root input[name="n5-req"][value="${v}"]`); if (r && MODAL) { r.checked = true; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); } closeModal(); };
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
  // CB2 (PD-CB-14) supersedes the creation dialog: "New NVQ programme" opens Course Details of an unsaved course, the observation
  // question is required, and "Save and continue" (ACT.cbDetCreate) creates the Draft — false when refused, as the dialog's button was
  let codeN = 0; // CB2 correction: a course code is required for a new course (unique per test programme)
  // CB8 (PD-CB-49): a programme created in the builder since CB8 sets its terms as a financial package (ft-cb8.js). E1's single-method proposal flow
  // tested here still governs programmes created before CB8 (no package flag) — so each programme made here is marked as one of those (fixture).
  const create = (obs = 'no') => { const r = document.querySelector('#np-obs-' + obs); if (r) r.checked = true; const c = document.querySelector('#np-code'); if (c && !c.value) c.value = 'TC' + (++codeN); const pr = crT(ACT.cbDetCreate)(); if (pr && pr.id) delete pr.cb8; return pr; };
  const meth = (px, m) => { const r = document.querySelector(`input[name="${px}-meth"][value="${m}"]`); r.checked = true; INP.e1Meth(r); };
  // A new programme through the wizard dialog (Level 2/4/5: one price); returns the programme or null
  const newProg = (title, o = {}) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': o.level || 'Level 4', '#np-r': 'QN 610/' + (2000 + title.length) + '/1', '#np-d': String(o.n ?? 12), '#np-du': o.unit || 'months', '#np-p': String(o.price || 2400) }), dmpPrice(); const n0 = (STORE.chNewProgs || []).length; create(); return (STORE.chNewProgs || []).length > n0 ? last() : null; };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  // The other publishing requirements (structure with a typed Learning Outcome, an offer letter)
  const ready = pr => { const id = pr.id; obsDecide(id); go('a-programmes', { id, tab: 'structure' }); add8('ch8AddUnit', { id }, { '#u-c': 'U480', '#u-t': 'Practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core', '#m-ab': 'C/650/4801' }); add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand practice', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Describe practice', '#c-e': 'Written account' }); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); document.querySelector('#rsn').value = 'First version'; press(); };
  const finNotifs = () => STORE.fin.notifs.filter(n => String(n.key || '').startsWith('e1-sub-'));
  const acaNotifs = () => (STORE.aca ? STORE.aca.notifs : []).filter(n => /^Payment terms/.test(n.t));
  // Learner A (Daniel Okafor, no NVQ) signs up to a programme and reaches the payment step
  const toPay = (pid, optId) => { learner('A'); go('browse'); const pr = s3Pr(pid), c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); if (optId) { const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; } prim(); const w = W; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); return w; };
  // Finance's plan editor (Finance → Payment Plans): method, instalments
  const planEdit = (pid, m, n, r = 'E1 plan') => { ACT.s4PlanEdit({ dataset: { p: pid } }); const x = document.querySelector(`input[name="pp-meth"][value="${m}"]`); x.checked = true; INP.e1Meth(x); if (n) fill({ '#pp-n': String(n) }); return reason(r); };

  /* ================= A. Structured duration ================= */
  await T('E1-A duration: number and unit in the wizard; days, weeks, months and years', async () => {
    fresh(); SA(); go('a-programmes'); ACT.chProgNew();
    const n = document.querySelector('main #np-d'), u = document.querySelector('main #np-du');
    ok('E1-A wizard: Duration is a whole-number field and a unit (Days, Weeks, Months, Years); new programmes start at 12 months', n && n.type === 'number' && u && u.tagName === 'SELECT' && [...u.options].map(o => o.textContent).join('|') === 'Days|Weeks|Months|Years' && n.value === '12' && u.value === 'months');
    closeModal();
    [[90, 'days', '90 days'], [1, 'weeks', '1 week'], [18, 'months', '18 months'], [2, 'years', '2 years']].forEach(([k, unit, txt], j) => {
      const pr = newProg('Level 4 Duration test ' + j, { n: k, unit });
      ok(`E1-A ${txt}: stored as number + unit and shown "${txt}"`, !!pr && pr.durV && pr.durV.n === k && pr.durV.unit === unit && pr.dur === txt);
    });
    const pr = last(); go('a-programmes', { id: pr.id, tab: 'review' }); ok('E1-A review shows the formatted duration', /* CB11 (PD-CB-73): was "2 years · <price>" in the CH-8 review line */ /Duration\s*2 years/.test(document.querySelector('main .cb-rv-sec[data-sec="details"]').textContent));
  });
  await T('E1-A duration (negative): zero, fractions, blanks and out-of-range values are refused', async () => {
    fresh(); SA(); const n0 = (STORE.chNewProgs || []).length;
    [['0', 'Enter the duration as a whole number'], ['1.5', 'whole number'], ['1000', 'from 1 to 999'], ['', 'Enter the duration']].forEach(([v, msg]) => {
      go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': 'Level 4 Bad duration', '#np-l': 'Level 4', '#np-r': 'QN 610/1/1', '#np-p': '2400' }), dmpPrice(); document.querySelector('#np-d').value = v;
      const r = create(); ok(`E1-A duration "${v || '(blank)'}" refused with a message`, r === false && main().includes(msg));
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
    ready(pr); dmpComply(pr.id); ACT.ch8Publish({ dataset: { id: pr.id } }); reason('Ready');
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
    // E1 rounding (20 Oct 2026, PD-E1-15) supersedes: "7 instalments refused" for £900 ("doesn't divide"). £900 over 7 now has a valid
    // schedule (6 × £128.57 + £128.58), so 7 is no longer a negative case; the count range and whole-number checks still apply.
    const v0 = s4Plans('NV-N2').length, bad = [['1', 'Enter 2 to 24'], ['25', 'Enter 2 to 24'], ['2.5', 'whole number']];
    bad.forEach(([n, msg]) => { go('a-programmes', { id: 'NV-N2', tab: 'plan' }); meth('pp', 'instalments'); fill({ '#pp-n': n }); ACT.ch8SavePlan({ dataset: { id: 'NV-N2' } }); ok(`E1-B (negative) ${n} instalments refused`, s4Plans('NV-N2').length === v0 && main().includes(msg), main().slice(0, 0)); });
    ok('E1-R £900 over 7 is accepted by the plan check (6 × £128.57 + £128.58), not saved by the check', e1TermsIssue(ch8Pr('NV-N2'), { meth: 'instalments', inst: 7, dep: 150 }) === '' && e1SchedTxt(900, 7) === '6 × £128.57 + £128.58' && s4Plans('NV-N2').length === v0);
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
    const row = (k, l, f, m) => { const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; };
    row(0, 'Self-Paced', '2400', 'Self-Paced'); ACT.r1NpAdd(); row(1, 'Fully Assisted', '2700', 'Fully Assisted'); create(); const pr = last();
    ok('E1-L3 programme created with two options; the Super Admin\'s terms are approved at once (D8)', r1Opts(pr.id).length === 2 && e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms'));
    go('a-programmes', { id: pr.id, tab: 'plan' });
    ok('E1-L3 payment summary lists each option with its mode, fee and how its learners pay', document.querySelectorAll('.e1-sum tbody tr').length === 2 && /Self-Paced/.test(main()) && /Fully Assisted/.test(main()) && /6 monthly instalments of £400\.00/.test(main()) && /6 monthly instalments of £450\.00/.test(main()));
    // E1 rounding (20 Oct 2026, PD-E1-15) supersedes: "7 instalments refused, naming the option that doesn't split". Both options now
    // have a valid 7-instalment schedule — £2,400: 6 × £342.86 + £342.84 (final rounds down); £2,700: 6 × £385.71 + £385.74 (final up).
    meth('pp', 'both'); fill({ '#pp-n': '7' }); const v0 = s4Plans(pr.id).length; ACT.ch8SavePlan({ dataset: { id: pr.id } }); go('a-programmes', { id: pr.id, tab: 'plan' });
    const sum7 = (document.querySelector('main .e1-sum') || {}).textContent || '';
    ok('E1-R Level 3: 7 instalments accepted for both options; one new version keeping both exact schedules', s4Plans(pr.id).length === v0 + 1 && s4PlanCur(pr.id).inst === 7 && /Instalments 1–6: £342\.86 each · instalment 7 \(final\): £342\.84/.test(sum7) && /Instalments 1–6: £385\.71 each · instalment 7 \(final\): £385\.74/.test(sum7) && (s => s.fees.length === 2 && s.fees.every(f => f.sched.reduce((a, x) => a + e1Pence(x), 0) === e1Pence(f.fee)))(s4PlanCur(pr.id).sched));
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
    ready(pr); go('a-programmes', { id: pr.id, tab: 'review' }); const pub = app().querySelector('[data-act="cbPublish"]'); /* CB11 (PD-CB-77): was ch8Publish */
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
    go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-p': '2600' }), dmpPrice(); ACT.ch8SaveDetails({ dataset: { id: pr.id } }); ok('E1-C (negative) the fee can\'t change while Finance reviews it', pr.price === 2400 && /with Finance for review/.test(main()));
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
    ok('E1-C (negative) the creator can\'t request changes either (logged)', applyDecision(i, 'return', 'mine') === false && i.status === 'Pending' && /^Blocked: (decide payment terms|self-approval)$/.test(ADMIN.audit[0].action) /* E-B (PD-E-16): the G4 raiser guard may refuse it first; was 'Blocked: decide payment terms' */);
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
    ACA(); go('a-programmes', { id: pr.id, tab: 'review' }); ok('E1-C review: terms Approved, nothing blocking but the fee options by delivery mode (DM-P, PD-DM-15: was nothing blocking)', /Approved/.test(main()) && ch8Check(pr).block.length > 0 && ch8Check(pr).block.every(b => /Fee option|financial package/.test(b))); dmpComply(pr.id);
    ACT.ch8Publish({ dataset: { id: pr.id } }); reason('Ready'); ok('E1-C published by the Academic Admin (existing role)', pr.status === 'Active');
    learner('A'); go('browse'); const c = CATALOGUE.find(x => x.title === pr.title); ok('E1-C purchasable only now, at the approved fee', !!c && c.price === 2400);
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); ok('E1-C a published programme\'s details stay read-only (unchanged rule)', !document.querySelector('#np-p') && !document.querySelector('#np-d') && main().includes('Duration12 months'));
  });
  await T('E1-C a fee change after approval needs approval again; Finance\'s own save approves', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Refee test', { price: 2400 }); FA(); go('f-plans', { tab: 'templates' }); planEdit(pr.id, 'instalments', 4, 'Finance sets the plan');
    ok('E1-C Finance\'s own save (Payment Plans editor) on a Draft programme = approved terms (no queue item, no notification)', e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms') && !finNotifs().length);
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); fill({ '#np-p': '3000' }), dmpPrice(); ACT.ch8SaveDetails({ dataset: { id: pr.id } });
    ok('E1-C creator changed the fee after approval: back to Draft, audited', pr.price === 3000 && e1T(pr.id).status === 'Draft' && ADMIN.audit.some(a => a.action === 'Payment terms need Finance approval again'));
  });
  await T('E1-C terms in force before E1 and the Super Admin\'s own programmes', async () => {
    fresh(); const n1 = ch8Pr('NV-N1');
    ok('E1-C seeded NV-N1 (Draft): terms in force, no new payment-terms blocker (only its existing ones and, DM-P PD-DM-15, its fee options by delivery mode)', !e1T('NV-N1') && e1Ok(n1) && !ch8Check(n1).block.some(b => /Payment terms/.test(b)) && ch8Check(n1).block.some(b => /without a type/.test(b)) && ch8Check(n1).block.some(b => /^Fee option/.test(b)));
    ACA(); go('a-programmes', { id: 'NV-N1', tab: 'plan' }); ok('E1-C NV-N1 plan step for the Academic Admin: read-only as before', !document.querySelector('#e1-n') && !document.querySelector('#pp-d') && /Set by Finance or the Super Admin/.test(main()));
    SA(); const pr = newProg('Level 4 SA test'); ok('E1-C Super Admin\'s programme: approved at once, no queue item, no Finance notification', e1T(pr.id).status === 'Approved' && !ADMIN.queue.some(i => i.type === 'Programme payment terms') && !finNotifs().length);
    ACT.qRouting(); ok('E1-C the confirmed routing table (G4 "Who approves what") is unchanged: 19 rows, no provisional type', document.querySelectorAll('#modal-root tbody tr').length === 19 && !/Programme payment terms/.test(mroot().textContent)); closeModal();
  });

  /* ================= E1 clarification (20 Oct 2026): administrators configure the methods; learners use only those ================= */
  const l3Wizard = (title, rows) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (4000 + title.length) + '/3', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l')); rows.forEach(([l, f, m], k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; }); };
  const payOpts = () => [...document.querySelectorAll('main input[name="su-opt"]')].map(x => x.value).sort().join();
  await T('E1-CL Step 1: concise fee guidance; no instalment assumption before the Payment Plan step', async () => {
    fresh(); ACA(); go('a-programmes'); ACT.chProgNew(); INP.r1NpLevel(Object.assign(document.querySelector('#np-l'), { value: 'Level 3' }));
    const t = document.querySelector('main .r1-np-opts').textContent;
    ok('E1-CL Step 1 Level 3 fee options: "Add the available fees and delivery modes … configured in the Payment Plan step."', /Add the available fees and delivery modes for this programme\. Payment methods and instalments are configured in the Payment Plan step\./.test(t));
    ok('E1-CL Step 1 no longer states six (or any) instalments or the split rule', !/instalments \(|split evenly|unless changed|\b6\b/.test(t)); closeModal();
    l3Wizard('Level 3 Certificate in Pay Config', [['Self-Paced', '500', 'Self-Paced']]); const n0 = (STORE.chNewProgs || []).length; create();
    const pr = last(); closeModal();
    ok('E1-CL Step 1 accepts a fee that doesn\'t split into 6 (£500) — the split is checked against the configured method later', (STORE.chNewProgs || []).length === n0 + 1 && pr.title === 'Level 3 Certificate in Pay Config' && r1Opts(pr.id)[0].fee === 500);
    ['0', '12.345', String(R1_FEE_MAX + 1)].forEach(f => { l3Wizard('Level 3 Bad fee ' + f, [['Self-Paced', f, 'Self-Paced']]); ok(`E1-CL (negative) Step 1 still refuses an invalid fee amount (${f})`, create() === false && /Enter a fee/.test(main())); });
    // E1 rounding (20 Oct 2026, PD-E1-15) supersedes: "a fee option added later ... (6 instalments: £500 refused)". £500 over 6 is now
    // 5 × £83.33 + £83.35; a later option is still checked against the plan in force — here, the deposit (£300) must be below the fee.
    FA(); ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }); ok('E1-CL (negative) a fee option added later still checks against the plan in force (£250 is not above the £300 deposit)', (fill({ '#fo-l': 'Bad', '#fo-f': '250', '#fo-m': 'Self-Paced' }), reason() === false) && /must be below the fee/.test(mroot().textContent)); closeModal();
    FA(); ACT.r1OptAdd({ dataset: { p: 'NV-L3' } }); ok('E1-R a fee option of £500 is accepted against 6 instalments (5 × £83.33 + £83.35); the form states the rounding', /final one adjusted so they total the fee exactly/.test(mroot().textContent) && (fill({ '#fo-l': 'Rounded', '#fo-f': '500', '#fo-m': 'Self-Paced' }), reason() !== false) && r1Opts('NV-L3').some(o => o.label === 'Rounded' && o.fee === 500 && !r1TermsOf(o).issue) && e1SchedTxt(500, 6) === '5 × £83.33 + £83.35'); closeModal();
  });
  await T('E1-CL the creator configures the method; Finance approval gates it; the split is checked for the method chosen', async () => {
    fresh(); ACA(); l3Wizard('Level 3 Certificate in One Payment', [['Self-Paced', '500', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted']]); create(); const pr = last(), v0 = s4Plans(pr.id).length;
    go('a-programmes', { id: pr.id, tab: 'plan' }); const q0 = ADMIN.queue.length;
    ok('E1-CL plan step: three configurations offered to the creator (one payment, instalments, both)', ['one-time', 'instalments', 'both'].every(m => !!document.querySelector(`input[name="e1-meth"][value="${m}"]`)));
    // E1 rounding (20 Oct 2026, PD-E1-15) supersedes: "instalments × 6 refused for £500 / £1,000, naming the option". They now open
    // the submit dialog with the exact schedules; nothing is sent until the creator confirms (here they cancel and choose one payment).
    meth('e1', 'instalments'); fill({ '#e1-n': '6' }); ACT.e1Submit({ dataset: { id: pr.id } });
    const dlg = MODAL ? mroot().textContent : '';
    ok('E1-R instalments × 6 for £500 / £1,000: the submit dialog shows both exact schedules; nothing sent before confirming', !!MODAL && ADMIN.queue.length === q0 && /Instalments 1–5: £83\.33 each · instalment 6 \(final\): £83\.35/.test(dlg) && /Instalments 1–5: £166\.67 each · instalment 6 \(final\): £166\.65/.test(dlg) && /Total £1,000\.00/.test(dlg)); closeModal();
    meth('e1', 'one-time'); ACT.e1Submit({ dataset: { id: pr.id } }); press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    ok('E1-CL one payment submitted: one Finance item with the proposal (no instalments)', !!i && i.status === 'Pending' && i.data.prop.meth === 'one-time' && i.data.prop.inst === 1);
    ok('E1-CL (gate) the proposed method isn\'t in force before Finance approves', s4Plans(pr.id).length === v0 && s4PlanCur(pr.id).meth !== 'one-time' && ch8Check(pr).block.some(b => /waiting for Finance review/.test(b)));
    FA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('One payment agreed.');
    const p = s4PlanCur(pr.id); ok('E1-CL approved by Finance: plan in force is one payment, no instalments; both options reconcile', p.meth === 'one-time' && p.inst === 1 && r1Opts(pr.id).every(o => !r1TermsOf(o).issue));
    ok('E1-CL Finance\'s fee-options form states no instalment split for a one-payment plan', (ACT.r1OptAdd({ dataset: { p: pr.id } }), /how learners pay \(one payment\)/.test(mroot().textContent) && !/divide into those instalments/.test(mroot().textContent) && /must be above the deposit/.test(mroot().textContent))); closeModal();
  });
  await T('E1-CL learners see only the approved methods; the instalment count is fixed; the fee option is separate', async () => {
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added'); m11Accept(); const o2 = r1Opts('NV-L3').find(o => o.fee === 3000);
    // Full payment only
    FA(); planEdit('NV-L3', 'one-time', null, 'One payment only'); let w = toPay('NV-L3', o2.id);
    ok('E1-CL one payment only: "Pay in full" (and the eligible deposit); no instalment choice, no count to edit', payOpts() === 'deposit,full' && !document.querySelector('main input[type="number"]') && !/monthly payments/.test(main()));
    setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); let pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-CL (negative) a forced "instalment" choice is ignored: paid in full, one row of the option\'s fee', w.signup.done && w.signup.pay.full && pl.rows.length === 1 && pl.rows[0].amount === 3000);
    // Instalments only
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added'); m11Accept();
    FA(); planEdit('NV-L3', 'instalments', 4, 'Instalments only'); w = toPay('NV-L3', r1Opts('NV-L3').find(o => o.fee === 3000).id);
    ok('E1-CL instalments only: the approved 4 monthly payments (and the deposit); no "Pay in full"; no count to edit', payOpts() === 'deposit,instalment' && /4 monthly payments of £750.00/.test(main()) && !/Pay in full/.test(main()) && !document.querySelector('main input[type="number"]'));
    setUi('suOpt', 'full'); setUi('suMethod', 'bank'); render(); ACT.suPay(); pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-CL (negative) a forced "full" choice is ignored: exactly the approved 4 instalments', w.signup.done && !w.signup.pay.full && pl.rows.length === 4 && pl.rows.every(r => r.amount === 750) && w.signup.plan.inst === 4);
    // Both
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — standard', fee: 3000, mode: 'Self-Paced' }, 'E1-CL', 'Added'); m11Accept();
    const snap = () => JSON.stringify(['B', 'C'].map(k => [STORE.worlds[k].signup.plan, STORE.worlds[k].plans, STORE.worlds[k].admission.deposit]));
    const hist0 = snap(); FA(); planEdit('NV-L3', 'both', 4, 'Both'); w = toPay('NV-L3', r1Opts('NV-L3').find(o => o.fee === 3000).id);
    ok('E1-CL both: "Pay in full" and "4 monthly payments" offered; the count is fixed (no input)', payOpts() === 'deposit,full,instalment' && /Pay in full — £3,000.00 now/.test(main()) && /4 monthly payments of £750.00/.test(main()) && !document.querySelector('main input[type="number"]'));
    ok('E1-CL existing learners\' pinned plans and deposits unchanged by the new terms', snap() === hist0 && !STORE.worlds.C.signup.plan.meth && STORE.worlds.C.signup.plan.inst === 6);
    // Fee option ≠ payment method: another option changes the agreed price (and mode), not the methods or the count
    fresh(); SA(); FA(); planEdit('NV-L3', 'both', 4, 'Both'); const std = toPay('NV-L3', 'L3-FO-STD');
    ok('E1-CL Level 3: the fee option sets the agreed price; the method and count come from the plan', std.signup.plan.opt.id === 'L3-FO-STD' && std.signup.plan.meth === 'both' && std.signup.plan.inst === 4 && std.signup.plan.fee === 2400 && payOpts() === 'deposit,full,instalment' && w.signup.plan.opt.mode === 'Self-Paced' && w.signup.plan.fee === 3000);
  });

  /* ---------- E1-R: instalment rounding, the payment summary, schedule snapshots and the pence-safe split (20 Oct 2026) ---------- */
  const pence = a => a.reduce((t, x) => t + e1Pence(x), 0);
  await T('E1-R the shared schedule helper: rounding, exact totals, invalid input', async () => {
    fresh();
    ok('E1-R £1,000 / 6 → 5 × £166.67 + £166.65 (final rounds down)', JSON.stringify(e1Sched(1000, 6)) === JSON.stringify([166.67, 166.67, 166.67, 166.67, 166.67, 166.65]) && pence(e1Sched(1000, 6)) === 100000);
    ok('E1-R £800 / 6 → 5 × £133.33 + £133.35 (final rounds up)', JSON.stringify(e1Sched(800, 6)) === JSON.stringify([133.33, 133.33, 133.33, 133.33, 133.33, 133.35]) && pence(e1Sched(800, 6)) === 80000);
    ok('E1-R £1,500 / 6 → 6 × £250.00 (even split unchanged)', JSON.stringify(e1Sched(1500, 6)) === JSON.stringify([250, 250, 250, 250, 250, 250]) && e1SchedTxt(1500, 6) === '6 × £250.00');
    ok('E1-R text forms: "5 × £166.67 + £166.65" and " (5 × £133.33 and a final £133.35)"', e1SchedTxt(1000, 6) === '5 × £166.67 + £166.65' && e1InstTxt(800, 6) === ' (5 × £133.33 and a final £133.35)' && e1InstTxt(1500, 6) === ' of £250.00');
    // n0 counts fees with no schedule other than those where nearest-penny rounding leaves no positive final instalment (£1 over 18)
    let bad = 0, n0 = 0;
    for (let f = 1; f <= 5000; f += 13.37) for (let n = 1; n <= 24; n++) { const fee = Math.round(f * 100) / 100, s = e1Sched(fee, n); if (!s) { if (Math.round(e1Pence(fee) / n) * (n - 1) < e1Pence(fee)) n0++; continue; } const per = e1Pence(s[0]); if (pence(s) !== e1Pence(fee) || s.some(x => !(x > 0)) || s.slice(0, -1).some(x => e1Pence(x) !== per) || Math.abs(e1Pence(s[n - 1]) - per) > n) bad++; }
    ok('E1-R every fee £1–£5,000 (step £13.37) × 1–24 instalments: totals the fee to the penny, all positive, regular ones equal', bad === 0 && n0 === 0, `${bad} bad, ${n0} null`);
    ok('E1-R (negative) a tiny fee over many instalments has no valid schedule (£1 over 18 would need a negative final instalment) and is refused', e1Sched(1, 18) === null && /can't be paid in 18 instalments/.test(s4PlanIssue({ fee: 1, inst: 18, deposit: 0 })) && pence(e1Sched(1, 17)) === 100);
    ok('E1-R (negative) invalid amounts and counts give no schedule', [[0, 6], [-5, 6], [NaN, 6], ['abc', 6], [12.345, 6], [100, 0], [100, 25], [100, 2.5], [0.05, 6], [null, 6]].every(([f, n]) => e1Sched(f, n) === null) && e1First(0, 6) === null && e1SchedTxt(0, 6) === '—');
    ok('E1-R (negative) the plan check refuses a schedule that can\'t exist (£0.05 over 6), keeps the deposit and count rules', /can't be paid in 6 instalments/.test(s4PlanIssue({ fee: 0.05, inst: 6, deposit: 0 })) && /must be below the fee/.test(s4PlanIssue({ fee: 1000, inst: 6, deposit: 1000 })) && /1 to 24/.test(s4PlanIssue({ fee: 1000, inst: 25, deposit: null })) && s4PlanIssue({ fee: 1000, inst: 6, deposit: null }) === '');
    ok('E1-R split in two: £166.67 → £83.34 + £83.33; £0.01 can\'t be split', JSON.stringify(e1Halves(166.67)) === '[83.34,83.33]' && JSON.stringify(e1Halves(250)) === '[125,125]' && e1Halves(0.01) === null);
  });
  await T('E1-R payment summary: three Level 3 fee options with exact schedules and the deposit as an alternative route', async () => {
    fresh(); SA(); l3Wizard('Level 3 Certificate in Rounding', [['Self-Paced', '800', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted'], ['Fully Assisted — plus', '1500', 'Fully Assisted']]); create(); const pr = last();
    go('a-programmes', { id: pr.id, tab: 'plan' }); const sum = () => (document.querySelector('main .e1-sum') || {}).textContent || '', note = () => (document.querySelector('main .e1-sum-note') || {}).textContent || '';
    ok('E1-R summary columns: fee option, delivery mode, total fee, payment methods, instalment schedule, deposit (alternative route)', [...document.querySelectorAll('main .e1-sum thead th')].map(x => x.textContent).join('|') === 'Fee option|Delivery mode|Total fee|Payment methods|Instalment schedule|Deposit (alternative route)' && document.querySelectorAll('main .e1-sum tbody tr').length === 3);
    ok('E1-R £800: "Instalments 1–5: £133.33 each · instalment 6 (final): £133.35", Total £800.00', /Instalments 1–5: £133\.33 each · instalment 6 \(final\): £133\.35/.test(sum()) && /Total £800\.00/.test(sum()));
    ok('E1-R £1,000: "Instalments 1–5: £166.67 each · instalment 6 (final): £166.65", Total £1,000.00', /Instalments 1–5: £166\.67 each · instalment 6 \(final\): £166\.65/.test(sum()) && /Total £1,000\.00/.test(sum()));
    ok('E1-R £1,500: "Instalments 1–6: £250.00 each", Total £1,500.00', /Instalments 1–6: £250\.00 each/.test(sum()) && /Total £1,500\.00/.test(sum()));
    ok('E1-R (negative) no divisibility error for ordinary fees', !/divide|doesn't divide|equal instalments|Needs configuration/.test(main()));
    ok('E1-R deposit: "Alternative to instalments: £300.00 deposit, followed by the £700.00 balance during the configured seat-hold period (28 days)."', sum().includes('Alternative to instalments: £300.00 deposit, followed by the £700.00 balance during the configured seat-hold period (28 days).') && sum().includes('followed by the £500.00 balance') && sum().includes('followed by the £1,200.00 balance'));
    ok('E1-R eligibility stated separately: batch at least 28 days away; the rounding rule stated', /the deposit route is offered only when the learner's batch starts at least 28 days away/.test(note()) && /final instalment is adjusted so they total the fee exactly/.test(note()));
    S4().cfg.hold = 21; render();
    ok('E1-R the configured hold is shown (21 days), eligibility stays at 28 days', sum().includes('during the configured seat-hold period (21 days)') && !sum().includes('(28 days)') && /Seat hold: 21 days/.test(note()) && /at least 28 days away/.test(note()));
    S4().cfg.hold = 28;
    meth('pp', 'both'); ok('E1-R methods column: "One payment or instalments — the learner chooses", with both amounts', /One payment or instalments — the learner chooses/.test(sum()) && /£1,000\.00 in one payment, or 6 monthly instalments \(5 × £166\.67 and a final £166\.65\)/.test(sum()) && /Alternative to paying in full or by instalments/.test(sum()));
    meth('pp', 'one-time'); ok('E1-R one payment: no instalments; the deposit stays an alternative to paying in full (PD-E1-05, provisional)', /None — one payment/.test(sum()) && /Alternative to paying in full: £300\.00 deposit/.test(sum()) && !/Instalments 1–/.test(sum()));
  });
  await T('E1-R Finance reviews the exact proposed schedule; a frozen copy stays with the proposal and the plan version', async () => {
    fresh(); ACA(); l3Wizard('Level 3 Certificate in Review Rounding', [['Self-Paced', '800', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted']]); create(); const pr = last(), v0 = s4Plans(pr.id).length;
    go('a-programmes', { id: pr.id, tab: 'plan' }); meth('e1', 'instalments'); fill({ '#e1-n': '6' }); ACT.e1Submit({ dataset: { id: pr.id } });
    ok('E1-R submit dialog shows the exact schedules before sending', !!MODAL && /£133\.33 each · instalment 6 \(final\): £133\.35/.test(mroot().textContent) && /£166\.67 each · instalment 6 \(final\): £166\.65/.test(mroot().textContent));
    press(); const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid), S = i && i.data.sched;
    ok('E1-R the proposal keeps the exact schedule of each option', !!S && S.inst === 6 && S.fees.length === 2 && JSON.stringify(S.fees.map(f => f.sched)) === JSON.stringify([e1Sched(800, 6), e1Sched(1000, 6)]) && S.fees.every(f => pence(f.sched) === e1Pence(f.fee)));
    try { S.fees[0].sched[0] = 1; S.fees[0].fee = 1; } catch (e) { /* strict callers get a TypeError; either way nothing changes */ }
    ok('E1-R the proposal snapshot is immutable (frozen, deep)', S.fees[0].sched[0] === 133.33 && S.fees[0].fee === 800 && Object.isFrozen(S) && Object.isFrozen(S.fees[1]) && Object.isFrozen(S.fees[1].sched));
    FA(); const qd = queueDetail(i.id);
    ok('E1-R Finance\'s queue item shows the submitted schedule exactly ("Proposed payment schedule")', /Proposed payment schedule/.test(qd) && /Exactly as submitted/.test(qd) && /£133\.33 each · instalment 6 \(final\): £133\.35/.test(qd) && /£166\.67 each · instalment 6 \(final\): £166\.65/.test(qd) && /Total £800\.00/.test(qd));
    ACA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } });
    ok('E1-R (negative) the creator can\'t approve their own proposal: refused, no version', !MODAL && s4Plans(pr.id).length === v0 && i.status === 'Pending');
    SA(); ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } });
    ok('E1-R (negative) the Super Administrator can\'t approve payment terms: refused, logged, no version', !MODAL && s4Plans(pr.id).length === v0 && i.status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms', ADMIN.audit[0].action);
    FA(); const o = r1Opts(pr.id)[0]; o.fee = 850; ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); const r0 = reason('Agreed');
    ok('E1-R (negative) approval refused when a fee changed after submission (Finance must approve what it saw)', r0 === false && s4Plans(pr.id).length === v0 && i.status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms' && /schedule changed after submission/.test(ADMIN.audit[0].reason)); closeModal(); o.fee = 800;
    const a0 = ADMIN.audit.length; ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('Rounded schedule agreed.');
    const p = s4PlanCur(pr.id), T = e1T(pr.id), saved = ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Payment plan saved');
    // The proposal (6 instalments, default deposit) matches the Draft's plan version, so approval adds no version (PD-E1-09); that version
    // now keeps the reviewed schedule
    ok('E1-R approved, terms unchanged: no duplicate plan version; the approved version keeps the frozen schedule Finance reviewed', s4Plans(pr.id).length === v0 && saved.length === 0 && T.status === 'Approved' && T.approved.v === p.v && !!p.sched && e1SnapKey(p.sched) === e1SnapKey(S) && Object.isFrozen(p.sched) && e1SnapKey(T.approved.sched) === e1SnapKey(S), `${s4Plans(pr.id).length}/${v0} ${T.status} ${saved.length}`);
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); const r2 = MODAL ? reason('Again') : false; closeModal();
    ok('E1-R (negative) a second approval adds no version and changes no snapshot', r2 === false && s4Plans(pr.id).length === v0 && e1SnapKey(s4PlanCur(pr.id).sched) === e1SnapKey(S));
    const keep = JSON.stringify(p.sched); planEdit(pr.id, 'instalments', 4, 'Four instalments');
    ok('E1-R a later version has its own schedule; the approved version\'s schedule is untouched', s4PlanCur(pr.id).v === p.v + 1 && s4PlanCur(pr.id).sched.inst === 4 && JSON.stringify(s4PlanCur(pr.id).sched.fees[1].sched) === JSON.stringify([250, 250, 250, 250]) && JSON.stringify(s4Plans(pr.id).find(x => x.v === p.v).sched) === keep && s4Plans(pr.id).find(x => x.v === p.v).status === 'Superseded');
    ACA(); ACT.s4PlanEdit({ dataset: { p: pr.id } }); ok('E1-R (negative) an Academic Admin can\'t open Finance\'s plan editor (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: change payment plans'); closeModal();
  });
  await T('E1-R approval of changed terms: exactly one new plan version carrying the reviewed schedule', async () => {
    fresh(); ACA(); l3Wizard('Level 3 Certificate in Both Rounding', [['Self-Paced', '800', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted']]); create(); const pr = last(), v0 = s4Plans(pr.id).length;
    go('a-programmes', { id: pr.id, tab: 'plan' }); meth('e1', 'both'); fill({ '#e1-n': '6' }); ACT.e1Submit({ dataset: { id: pr.id } }); press();
    const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid), S = i.data.sched;
    FA(); const a0 = ADMIN.audit.length; ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); reason('Both agreed.');
    const p = s4PlanCur(pr.id), saved = ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Payment plan saved');
    ok('E1-R exactly one new version, audited once, by the Finance Admin, with the reviewed frozen schedule', s4Plans(pr.id).length === v0 + 1 && p.v === v0 + 1 && p.meth === 'both' && p.by === ADMIN.me.name && saved.length === 1 && /Approved by Finance/.test(saved[0].reason) && e1SnapKey(p.sched) === e1SnapKey(S) && Object.isFrozen(p.sched.fees[0].sched) && e1SnapKey(e1T(pr.id).approved.sched) === e1SnapKey(S), `${s4Plans(pr.id).length}/${v0} ${saved.length}`);
    ok('E1-R the previous version is superseded and was not given the new schedule', s4Plans(pr.id)[v0 - 1].status === 'Superseded' && e1SnapKey(s4Plans(pr.id)[v0 - 1].sched || null) !== e1SnapKey(S));
  });
  await T('E1-R Finance → Payment Plans shows the actual amounts', async () => {
    fresh(); FA(); planEdit('NV-N2', 'instalments', 7, 'Seven instalments'); go('f-plans', { tab: 'templates' });
    const row = document.querySelector('.s4-plans tr[data-pid="NV-N2"]');
    const l3r = document.querySelector('.s4-plans tr[data-pid="NV-L3"]');
    ok('E1-R NV-N2 £900 over 7 saved and listed as "6 × £128.57 + £128.58"; Level 3 still "6 × £400.00"', s4PlanCur('NV-N2').inst === 7 && !!row && /6 × £128\.57 \+ £128\.58/.test(row.textContent) && !!l3r && /6 × £400\.00/.test(l3r.textContent), `inst ${s4PlanCur('NV-N2').inst} row ${row && row.textContent.slice(0, 160)} l3 ${l3r && l3r.textContent.slice(0, 120)} audit ${ADMIN.audit[0].action}`);
  });
  await T('E1-R learner checkout shows and records the exact amounts; the deposit route is unchanged', async () => {
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — rounded', fee: 1000, mode: 'Self-Paced' }, 'E1-R', 'Added'); m11Accept(); const oid = r1Opts('NV-L3').find(o => o.fee === 1000).id;
    const others = () => JSON.stringify(Object.keys(STORE.worlds).filter(k => k !== 'A').map(k => [k, STORE.worlds[k].plans, STORE.worlds[k].signup && STORE.worlds[k].signup.plan, STORE.worlds[k].admission && STORE.worlds[k].admission.deposit])), hist0 = others();
    let w = toPay('NV-L3', oid); setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); render();
    ok('E1-R payment step: "6 monthly payments (5 × £166.67 and a final £166.65)"; first instalment £166.67 now', /Instalments — 6 monthly payments \(5 × £166\.67 and a final £166\.65\)/.test(main()) && /Pay the first instalment \(£166\.67\) now/.test(main()) && /Pay £166\.67 by card/.test(main()));
    const _co = checkout; let got = null; checkout = o => { got = o; return _co(o); };
    try { ACT.suPay(); } finally { checkout = _co; }
    ok('E1-R checkout charges £166.67 as "NVQ instalment 1 of 6"', !!got && got.amount === 166.67 && /^NVQ instalment 1 of 6 — /.test(got.title) && /166\.67/.test(mroot().textContent));
    got.onSuccess(got.amount, 'TXN-E1R'); const pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-R recorded rows: 5 × £166.67 + £166.65, totalling £1,000.00 exactly; the first paid', w.signup.done && pl.total === 1000 && pl.rows.length === 6 && JSON.stringify(pl.rows.map(r => r.amount)) === JSON.stringify(e1Sched(1000, 6)) && pence(pl.rows.map(r => r.amount)) === 100000 && pl.rows[0].paid === 166.67 && pl.rows[0].status === 'Paid' && pl.rows.slice(1).every(r => r.paid === 0) && w.signup.pay.amount === 166.67);
    ok('E1-R the learner\'s Payments page shows the final £166.65', (go('payments'), /166\.65/.test(main())));
    // Finance split-in-two on the outstanding amount
    FA(); const v = 'A', row2 = pl.rows[1]; ACT.finAdjust({ dataset: { v, e: 'nvq' } }); fill({ '#ad-r': String(row2.n), '#ad-s': 'yes' }); const ad0 = STORE.fin.adjust.length; reason('Hardship split');
    ok('E1-R Finance split in two: £166.67 → £83.34 + £83.33; the plan still totals £1,000.00; audited', pl.rows.length === 7 && pl.rows[1].amount === 83.34 && pl.rows[2].amount === 83.33 && pence(pl.rows.map(r => r.amount)) === 100000 && STORE.fin.adjust.length === ad0 + 1 && ADMIN.audit[0].action === 'Instalment schedule adjusted');
    const r3 = pl.rows[3]; r3.paid = 50; r3.status = 'Partial'; ACT.finAdjust({ dataset: { v, e: 'nvq' } }); fill({ '#ad-r': String(r3.n), '#ad-s': 'yes' }); reason('Split the rest');
    ok('E1-R split of a part-paid instalment splits only the £116.67 outstanding: £50 paid + £58.34 stays, £58.33 moves', pl.rows[3].amount === 108.34 && pl.rows[3].paid === 50 && pl.rows[4].amount === 58.33 && pence(pl.rows.map(r => r.amount)) === 100000);
    ACA(); const n7 = pl.rows.length; ACT.finAdjust({ dataset: { v, e: 'nvq' } }); ok('E1-R (negative) an Academic Admin can\'t adjust a schedule (refused, logged)', !MODAL && pl.rows.length === n7 && /^Blocked: adjust/.test(ADMIN.audit[0].action)); closeModal();
    ok('E1-R other learners\' plans, pinned terms and deposits are untouched', others() === hist0);
    // Deposit route: one balance row, the configured hold, eligibility at 28 days, seat release keeps the deposit
    fresh(); SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — rounded', fee: 1000, mode: 'Self-Paced' }, 'E1-R', 'Added'); m11Accept(); S4().cfg.hold = 21;
    w = toPay('NV-L3', r1Opts('NV-L3').find(o => o.fee === 1000).id); setUi('suOpt', 'deposit'); setUi('suMethod', 'card'); render();
    ok('E1-R deposit option unchanged: "£300.00 now", then the £700.00 balance within the 21-day hold', /Deposit \(holds your seat\) — £300\.00 now/.test(main()) && /Then pay the £700\.00 balance within 21 days/.test(main()));
    { const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-E1R-D'); }
    const pd = w.plans.find(x => x.e === 'nvq');
    ok('E1-R deposit sign-up: deposit £300, one balance row £700 due at the hold — not split into instalments', w.signup.pay.amount === 300 && pd.plan === 'Deposit and balance' && pd.rows.length === 1 && pd.rows[0].amount === 700 && w.admission.deposit.balance === 700 && w.admission.deposit.holdDays === 21 && Math.round(daysTo(pd.rows[0].due)) === 21);
    ok('E1-R deposit eligibility stays at 28 days whatever the hold (25 days away: no deposit)', !chDepositOk({ start: D(25) }) && chDepositOk({ start: D(28) }));
    chReleaseSeat(w, true); ok('E1-R seat release unchanged: deposit kept, seat released', w.admission.deposit.released && w.admission.deposit.kept && !w.signup.batch, JSON.stringify(w.admission.deposit));
    S4().cfg.hold = 28;
  });
  await T('E1-R historical plans and pinned terms are not recalculated', async () => {
    fresh(); const vers = Object.entries(S4().plans).flatMap(([pid, l]) => l.map(p => [pid, p]));
    // NV-N1 (seeded Draft, £2,900 over 6) never split evenly: it was "Needs configuration" and is now usable (5 × £483.33 + £483.35).
    // Every other seeded plan splits evenly, so the helper gives exactly the equal amounts it had before.
    ok('E1-R every seeded plan that was usable splits evenly, so the helper gives exactly its old equal amounts', vers.filter(([pid, p]) => p.fee > 0 && pid !== 'NV-N1').every(([, p]) => e1Sched(p.fee, p.inst).every(x => x === p.fee / p.inst)));
    ok('E1-R NV-N1 (£2,900 over 6, refused before) now has a valid schedule: 5 × £483.33 + £483.35', s4PlanCur('NV-N1').fee === 2900 && s4PlanCur('NV-N1').inst === 6 && e1SchedTxt(2900, 6) === '5 × £483.33 + £483.35' && !s4TermsOf('NV-N1').issue);
    ok('E1-R seeded plan versions are not given a schedule snapshot (not mutated)', vers.every(([, p]) => !('sched' in p)));
    const rows = Object.values(STORE.worlds).flatMap(w => (w.plans || []).flatMap(pl => pl.rows || []));
    ok('E1-R seeded learners\' payment rows keep their recorded amounts (whole pence, unchanged by the helper)', rows.length > 0 && rows.every(r => Math.abs(r.amount * 100 - Math.round(r.amount * 100)) < 1e-6));
    SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — rounded', fee: 1000, mode: 'Self-Paced' }, 'E1-R', 'Added'); m11Accept(); const oid = r1Opts('NV-L3').find(o => o.fee === 1000).id;
    const w = toPay('NV-L3', oid); const pin = JSON.stringify(w.signup.plan);
    FA(); planEdit('NV-L3', 'instalments', 4, 'Four instalments for new sign-ups');
    ok('E1-R a plan change after the learner\'s sign-up started doesn\'t reprice them (pinned: 6 instalments of the £1,000 option)', JSON.stringify(w.signup.plan) === pin && w.signup.plan.inst === 6 && w.signup.plan.fee === 1000);
    learner('A'); setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); render(); ACT.suPay(); const pl = w.plans.find(x => x.e === 'nvq');
    ok('E1-R …and they are charged their pinned schedule: 5 × £166.67 + £166.65', pl.rows.length === 6 && JSON.stringify(pl.rows.map(r => r.amount)) === JSON.stringify(e1Sched(1000, 6)));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
