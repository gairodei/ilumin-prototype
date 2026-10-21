// E2 — programme-level deposit configuration (confirmed requirement, 20 Oct 2026): every NVQ programme offers no deposit, the
// Academy default or a custom amount; the choice is part of the terms Finance approves; learners are offered only what their
// pinned terms allow; the Academy default reaches programmes through new versions. Each check does the action through the screen
// or handler, then checks the consuming screen or record, and includes the negative case.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const reason = (r = 'E2 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const last = () => (STORE.chNewProgs || []).slice(-1)[0];
  const radio = (name, v) => { const r = document.querySelector(`input[name="${name}"][value="${v}"]`); r.checked = true; return r; };
  const meth = (px, m) => INP.e1Meth(radio(`${px}-meth`, m));
  const depPick = (px, dm, amt) => { const r = radio(`${px}-wdm`, dm); INP.e1DepMode(r); if (amt != null) { fill({ [`#${px}-d`]: String(amt) }); INP.e1Live(r); } };
  // Finance's own plan editor with a deposit choice (and optionally the method / fee)
  const depEdit = (pid, dm, amt, o = {}) => { ACT.s4PlanEdit({ dataset: { p: pid } }); if (o.m) INP.e1Meth(radio('pp-meth', o.m)); if (o.fee) fill({ '#pp-f': String(o.fee) }); INP.e1DepMode(radio('pp-dm', dm)); if (amt != null) fill({ '#pp-dv': String(amt) }); return reason(o.r || 'E2 deposit'); };
  const cfgSet = (d, h = 28) => { ACT.s4CfgEdit(); fill({ '#cf-d': String(d), '#cf-h': String(h) }); return reason('E2 default'); };
  const toPay = (pid, optId) => { learner('A'); go('browse'); const pr = s3Pr(pid), c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); if (optId) { const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; } prim(); const w = W; ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); return w; };
  const payOpts = () => [...document.querySelectorAll('main input[name="su-opt"]')].map(x => x.value).sort().join();
  // CB2 (PD-CB-14) supersedes the creation dialog: Course Details of an unsaved course; the observation question is required; "Save and
  // continue" (ACT.cbDetCreate) creates the Draft
  let codeN = 0; // CB2 correction: a course code is required for a new course (unique per test programme)
  const create = (obs = 'no') => { const r = document.querySelector('#np-obs-' + obs); if (r) r.checked = true; const c = document.querySelector('#np-code'); if (c && !c.value) c.value = 'TC' + (++codeN); return ACT.cbDetCreate(); };
  const newProg = (title, level = 'Level 4', price = 2400) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': level, '#np-r': 'QN 610/' + (5000 + title.length) + '/1', '#np-d': '12', '#np-du': 'months', '#np-p': String(price) }); const n0 = (STORE.chNewProgs || []).length; create(); return (STORE.chNewProgs || []).length > n0 ? last() : null; };
  const l3Wizard = (title, rows) => { go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': title, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (6000 + title.length) + '/3', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l')); rows.forEach(([l, f, m], k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = l; r.querySelector('.r1-np-f').value = f; r.querySelector('.r1-np-m').value = m; }); create(); return last(); };
  const optOf = fee => r1Opts('NV-L3').find(o => o.fee === fee);
  const addOpt = (fee, label = 'Self-Paced — E2') => { SA(); r1AddOpt('NV-L3', { label, fee, mode: 'Self-Paced' }, 'E2', 'Added'); return optOf(fee).id; };
  const payWith = (w, opt, method = 'bank') => { setUi('suOpt', opt); setUi('suMethod', method); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-E2'); return w.plans.find(x => x.e === 'nvq'); };

  // CB8 (PD-CB-48, PD-CB-52) supersedes the creator's E1 Payment plan step (its live summary .e1-sumbox and e1Draft / e1Submit): a new programme's
  // deposit is part of its financial package in Section 5 — the same three choices and fields (e1-wdm, e1-d), saved with "Save deposit setting"
  // (cb8Dep) and stated in the package's Deposit block. The rules tested are unchanged.
  const pkgDep = (pr, dm, amt) => { go('a-programmes', { id: pr.id, tab: 'fees' }); depPick('e1', dm, amt); ACT.cb8Dep({ dataset: { p: pr.id } }); return main(); };
  const pkgSubmit = pr => { go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); };
  await T('E2 the three deposit choices: creator, Finance plan step and Finance editor', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Certificate in Deposit Choice'); go('a-programmes', { id: pr.id, tab: 'fees' });
    const labs = px => [...document.querySelectorAll(`input[name="${px}"]`)].map(r => r.closest('label').querySelector('strong').textContent);
    ok('E2 creator\'s Fees & payment options: exactly three choices with the agreed wording; the default shows the current Academy default', JSON.stringify(labs('e1-wdm')) === JSON.stringify(['Deposit not available', 'Use Academy default deposit (£300.00)', 'Set a custom deposit amount for this programme']) && document.querySelector('input[name="e1-wdm"][value="default"]').checked);
    ok('E2 the custom amount field is shown only for a custom deposit', document.querySelector('.e2-dv-e1').hidden && (depPick('e1', 'own'), !document.querySelector('.e2-dv-e1').hidden) && (depPick('e1', 'none'), document.querySelector('.e2-dv-e1').hidden));
    pkgDep(pr, 'none'); ok('E2 the package states "Not available" with no deposit; the 28-day eligibility is not stated as if it applied', /* CB12 (PD-CB-80): one Deposit heading — the editable package states the setting in the editor (.cb8-depnow), was .cb8-dep */ /Not available — learners pay by one of the payment options/.test(document.querySelector('main .cb8-depnow').textContent) && !/28 days/.test(document.querySelector('main .cb8-depnow').textContent));
    pkgDep(pr, 'own', 450); ok('E2 …and the custom amount: "£450.00 — custom amount", a separate route with the 28-day eligibility and the seat hold', /£450\.00 — custom amount for this programme\. Offered only when the learner's batch starts in 28 days or more/.test(document.querySelector('main .cb8-depnow').textContent) /* CB12 (PD-CB-80): was .cb8-dep */);
    pkgDep(pr, 'default'); ok('E2 the default amount isn\'t written into the programme (a default package stores no amount)', cb8Work(pr).dep.mode === 'default' && cb8Work(pr).dep.amount === null && s4PlanCur(pr.id).deposit === null);
    SA(); go('a-programmes', { id: 'NV-N1', tab: 'plan' }); ok('E2 Finance / Super Admin plan step: the same three choices', JSON.stringify(labs('pp-wdm')) === JSON.stringify(['Deposit not available', 'Use Academy default deposit (£300.00)', 'Set a custom deposit amount for this programme']));
    FA(); ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }); ok('E2 Finance → Payment Plans "Edit plan": the same three choices; custom field hidden for the default', JSON.stringify(labs('pp-dm')) === JSON.stringify(['Deposit not available', 'Use Academy default deposit (£300.00)', 'Set a custom deposit amount for this programme']) && document.querySelector('.e2-dv-pe').hidden); closeModal();
  });
  await T('E2 custom deposit validation (whole pence, above £0, below every fee and every Level 3 option)', async () => {
    fresh(); ACA(); const pr = l3Wizard('Level 3 Certificate in Deposit Rules', [['Self-Paced', '800', 'Self-Paced'], ['Fully Assisted', '1000', 'Fully Assisted']]);
    const tryDep = v => { render(); return pkgDep(pr, 'own', v); }, dep0 = () => cb8Work(pr).dep.mode === 'default' && cb8Work(pr).dep.amount === null;
    ['', '0', '-5', '12.345', 'abc'].forEach(v => ok(`E2 (negative) custom deposit "${v}" refused (above £0, whole pence)`, /Enter a custom deposit above £0, in whole pence/.test(tryDep(v)) && dep0()));
    ok('E2 (negative) a custom deposit equal to the lowest option fee is refused, naming the option', /Self-Paced: The deposit \(£800\.00\) must be below the fee \(£800\.00\)/.test(tryDep('800')) && dep0());
    ok('E2 (negative) above one option, below the other: refused for that option', /Self-Paced: The deposit \(£900\.00\) must be below the fee/.test(tryDep('900')));
    tryDep('799.99'); ok('E2 a custom deposit below every option (£799.99) is saved in the draft package', cb8Work(pr).dep.mode === 'own' && cb8Work(pr).dep.amount === 799.99);
    FA(); ok('E2 (negative) Finance editor: a custom deposit at or above a fee is refused', depEdit('NV-L2', 'own', 1800) === false && /must be below the fee/.test(mroot().textContent)); closeModal();
    ok('E2 (negative) Finance editor: a custom deposit must be entered', depEdit('NV-L2', 'own', '') === false && /Enter a custom deposit above £0/.test(mroot().textContent)); closeModal();
    SA(); r1AddOpt('NV-L3', { label: 'Self-Paced — low', fee: 250, mode: 'Self-Paced' }, 'E2', 'Added'); FA();
    ok('E2 (negative) the Academy default can\'t be set at or above a Level 3 option of a programme using it', cfgSet(250) === false && /Level 3 Diploma in Adult Care/.test(mroot().textContent) && S4().cfg.deposit === 300); closeModal();
  });
  await T('E2 deposit not available: learners are never offered or charged one', async () => {
    fresh(); const oid = addOpt(1000); FA(); const v0 = s4Plans('NV-L3').length, a0 = ADMIN.audit.length; depEdit('NV-L3', 'none', null, { r: 'No deposit for Level 3' });
    const p = s4PlanCur('NV-L3'); ok('E2 Finance saves "Deposit not available": a new version, audited, previous version kept', s4Plans('NV-L3').length === v0 + 1 && p.depOff === true && p.deposit === null && s4Plans('NV-L3')[v0 - 1].status === 'Superseded' && !s4Plans('NV-L3')[v0 - 1].depOff && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Payment plan saved' && /no deposit/.test(x.after)));
    ok('E2 the version snapshot records no deposit; plan history says "no deposit"', p.sched.depOff === true && p.sched.deposit === null && (ACT.s4PlanHist({ dataset: { p: 'NV-L3' } }), /no deposit/.test(mroot().textContent))); closeModal();
    go('f-plans', { tab: 'templates' }); ok('E2 Finance → Payment Plans shows "Not available"', /Not available/.test(document.querySelector('.s4-plans tr[data-pid="NV-L3"]').textContent));
    learner('A'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq' && x.title === s3Pr('NV-L3').title).id } });
    ok('E2 sign-up dialog: each option says "No deposit for this programme"; no deposit amount', [...document.querySelectorAll('#modal-root .r1-pick')].every(l => /No deposit for this programme\./.test(l.textContent) && !/Deposit £/.test(l.textContent))); closeModal();
    const w = toPay('NV-L3', oid);
    ok('E2 batch card (step 1): "no deposit option for this programme", not the 28-day wording', w.signup.plan.depOff === true && /no deposit option for this programme/.test(chStepDetails(w)) && !/a deposit can hold your seat|instalments only/.test(chStepDetails(w)));
    ok('E2 payment step: no deposit choice; "No deposit for this programme" — not the 28-day batch message', !document.querySelector('main input[name="su-opt"][value="deposit"]') && payOpts() === 'instalment' && /No deposit for this programme\./.test(main()) && !/A deposit can only hold a seat/.test(main()));
    setUi('suOpt', 'deposit'); render(); ok('E2 (negative) stale UI state "deposit": still no deposit choice; the button charges the first instalment', payOpts() === 'instalment' && /Pay £166\.67 by card|I've made the transfer/.test(main()));
    const n0 = ADMIN.audit.length; chComplete(w, { opt: 'deposit', method: 'bank', amount: 300, ref: 'IA-FORCED' });
    ok('E2 (negative) a direct call completing with a deposit is refused and logged; nothing recorded', !w.signup.done && !w.plans.some(x => x.e === 'nvq' && x.plan === 'Deposit and balance') && ADMIN.audit.length === n0 + 1 && ADMIN.audit[0].action === 'Blocked: deposit not offered');
    setUi('suOpt', 'deposit'); const pl = payWith(w, 'deposit', 'card');
    ok('E2 (negative) a forced "deposit" at checkout pays the first instalment instead (6 rows, no deposit plan)', w.signup.done && w.signup.pay.opt === 'instalment' && pl.plan !== 'Deposit and balance' && pl.rows.length === 6 && pl.rows[0].amount === 166.67 && w.admission.deposit.min == null);
  });
  await T('E2 Academy default and custom deposits at sign-up; 28-day eligibility unchanged', async () => {
    fresh(); let oid = addOpt(1000); let w = toPay('NV-L3', oid);
    ok('E2 default: "Deposit (holds your seat) — £300.00 now" when the batch starts in 28 days or more', payOpts() === 'deposit,instalment' && /Deposit \(holds your seat\) — £300\.00 now/.test(main()) && !w.signup.plan.depOff);
    chBatch(w.signup.batch).start = D(10); render();
    ok('E2 default, batch in 10 days: ineligible — the 28-day message, not "No deposit for this programme"', payOpts() === 'instalment' && /A deposit can only hold a seat when the (intake|batch) starts in 28 days or more/.test(main()) && !/No deposit for this programme/.test(main()));
    fresh(); oid = addOpt(1000); FA(); depEdit('NV-L3', 'own', 250, { r: 'Custom deposit' }); w = toPay('NV-L3', oid);
    ok('E2 custom: "£250.00 now", then the £750.00 balance within the hold', /Deposit \(holds your seat\) — £250\.00 now/.test(main()) && /£750\.00 balance within 28 days/.test(main()) && w.signup.plan.deposit === 250);
    S4().cfg.hold = 21; const pl = payWith(w, 'deposit', 'card');
    ok('E2 custom deposit route unchanged: £250 paid, one £750 balance row due at the configured 21-day hold', w.signup.pay.amount === 250 && pl.plan === 'Deposit and balance' && pl.rows.length === 1 && pl.rows[0].amount === 750 && w.admission.deposit.balance === 750 && w.admission.deposit.holdDays === 21 && pl.partial === true);
    chReleaseSeat(w, true); ok('E2 seat release unchanged: the custom deposit is kept, the seat freed', w.admission.deposit.released && w.admission.deposit.kept && !w.signup.batch);
    S4().cfg.hold = 28;
  });
  await T('E2 Academy default changes: new versions for programmes using it; custom and none untouched; approved versions unaltered', async () => {
    fresh(); FA(); depEdit('NV-L5', 'none', null); depEdit('NV-L2', 'own', 250);
    const snap = () => JSON.stringify(Object.fromEntries(Object.entries(S4().plans).map(([k, l]) => [k, l.map(p => [p.v, p.status, p.fee, p.deposit, !!p.depOff, p.sched ? e1SnapKey(p.sched) : null])])));
    const l3v = s4Plans('NV-L3').length, l2v = s4Plans('NV-L2').length, l5v = s4Plans('NV-L5').length, n2v = s4Plans('NV-N2').length, n1v = s4Plans('NV-N1').length;
    const old = JSON.parse(snap()), olds = s4Plans('NV-L3').map(p => JSON.stringify(p));
    const worlds0 = JSON.stringify(Object.values(STORE.worlds).map(w => [w.plans, w.admission && w.admission.deposit, w.signup && w.signup.plan]));
    cfgSet(350);
    ok('E2 the default is £350; "Updated" logged in System Configuration', S4().cfg.deposit === 350 && ADMIN.audit[0].action === 'Updated');
    const l3 = s4PlanCur('NV-L3');
    ok('E2 Level 3 (uses the default): one new version, same terms, its snapshot £350; logged as a default change', s4Plans('NV-L3').length === l3v + 1 && l3.deposit === null && !l3.depOff && l3.inst === 6 && l3.sched.deposit === 350 && ADMIN.audit.some(x => x.action === 'New version — Academy default deposit changed' && /Level 3 Diploma/.test(x.entity)));
    ok('E2 earlier Level 3 versions are byte-identical (no approved version or snapshot altered)', s4Plans('NV-L3').slice(0, l3v).every((p, k) => JSON.stringify(p) === olds[k].replace('"status":"Active"', '"status":"Superseded"')));
    ok('E2 custom (Level 2 £250), none (Level 5) and NV-N2 (own £150): no new version', s4Plans('NV-L2').length === l2v && s4Plans('NV-L5').length === l5v && s4Plans('NV-N2').length === n2v && s4TermsOf('NV-L2').deposit === 250 && s4TermsOf('NV-L5').depOff && s4TermsOf('NV-N2').deposit === 150);
    ok('E2 NV-N1 (a Draft whose terms predate Finance review, in force) uses the default: new version at £350', s4Plans('NV-N1').length === n1v + (e1Ok(s3Pr('NV-N1') || ch8Pr('NV-N1')) ? 1 : 0) && s4TermsOf('NV-N1').deposit === 350);
    ok('E2 learners\' payment records, deposits and pinned terms are unchanged', JSON.stringify(Object.values(STORE.worlds).map(w => [w.plans, w.admission && w.admission.deposit, w.signup && w.signup.plan])) === worlds0);
    ok('E2 (negative) the same default saved again: refused, no versions', cfgSet(350) === false && s4Plans('NV-L3').length === l3v + 1); closeModal();
  });
  // CB8 (PD-CB-52) supersedes the E1 form submission (e1Submit) and the frozen E1 schedule (i.data.sched): the creator submits the package
  // (cb8Submit) and the queue item keeps the frozen package (i.data.pkg); Finance's item shows its deposit choice. Rules unchanged.
  await T('E2 Finance review: the deposit choice is part of the terms; request changes, resubmit, approve', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Certificate in Deposit Review'); pkgDep(pr, 'none');
    pkgSubmit(pr); ok('E2 submit dialog states the deposit is not available', /Not available/.test(mroot().textContent)); press();
    const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    ok('E2 the proposal records "no deposit" (terms and frozen package); the programme can\'t be published yet', i.data.prop.depOff === true && i.data.pkg.dep.mode === 'none' && Object.isFrozen(i.data.pkg) && ch8Check(pr).block.some(b => /waiting for Finance review/.test(b)));
    FA(); ok('E2 Finance\'s item shows "Deposit not available"', /<dt>Deposit<\/dt><dd class="small">Deposit not available/.test(queueDetail(i.id)));
    ACT.e1Decide({ dataset: { id: i.id, a: 'return' } }); reason('Please offer a £200 deposit.');
    ok('E2 Finance requests changes: back to the creator, nothing applied', e1T(pr.id).status === 'Changes' && !s4PlanCur(pr.id).depOff);
    ACA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ok('E2 the returned package keeps "Deposit not available" selected', document.querySelector('input[name="e1-wdm"][value="none"]').checked);
    pkgDep(pr, 'own', 200); pkgSubmit(pr); press(); const i2 = ADMIN.queue.find(x => x.id === e1T(pr.id).qid);
    FA(); ok('E2 the resubmitted item shows "Custom deposit £200.00"', i2.id !== i.id && /Custom deposit £200\.00/.test(queueDetail(i2.id)));
    const v0 = s4Plans(pr.id).length; ACT.e1Decide({ dataset: { id: i2.id, a: 'approve' } }); reason('£200 agreed.');
    const p = s4PlanCur(pr.id); ok('E2 approved: one new version with the £200 custom deposit, its snapshot and its package', s4Plans(pr.id).length === v0 + 1 && p.deposit === 200 && !p.depOff && p.sched.deposit === 200 && p.sched.depOwn === true && p.pkg.dep.amount === 200 && e1T(pr.id).status === 'Approved' && !ch8Check(pr).block.some(b => /Finance/.test(b)));
    ACA(); ACT.ch8SavePlan({ dataset: { id: pr.id } }); ok('E2 (negative) the creator can\'t change the approved plan (refused, logged)', s4PlanCur(pr.id).deposit === 200 && /^Blocked/.test(ADMIN.audit[0].action));
    ACT.s4PlanEdit({ dataset: { p: pr.id } }); ok('E2 (negative) the creator can\'t open Finance\'s plan editor', !MODAL && ADMIN.audit[0].action === 'Blocked: change payment plans');
  });
  await T('E2 a proposal using the default can\'t be approved after the default changes; Super Admin D8 unchanged', async () => {
    fresh(); ACA(); const pr = newProg('Level 4 Certificate in Default Drift'); pkgDep(pr, 'default'); pkgSubmit(pr); press();
    const i = ADMIN.queue.find(x => x.id === e1T(pr.id).qid), v0 = s4Plans(pr.id).length;
    FA(); cfgSet(320); ok('E2 the pending programme gets no version from the default change', s4Plans(pr.id).length === v0);
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); const r0 = reason('Agreed');
    ok('E2 (negative) approval refused: the Academy default changed after submission (Finance approves what it saw)', r0 === false && e1T(pr.id).status === 'Pending' && ADMIN.audit[0].action === 'Blocked: decide payment terms' && /changed after submission/.test(ADMIN.audit[0].reason)); closeModal();
    // CB8 (PD-CB-52) supersedes the Super Administrator's old plan-step save (pp-wdm / ch8SavePlan): their own package is approved at once (D8)
    SA(); const sp = newProg('Level 4 Certificate in SA Deposit'); go('a-programmes', { id: sp.id, tab: 'fees' }); depPick('e1', 'none'); ACT.cb8SaApprove({ dataset: { p: sp.id } }); reason('Own terms');
    ok('E2 Super Admin (D8): "no deposit" saved and approved at once, no queue item', s4PlanCur(sp.id).depOff === true && e1T(sp.id).status === 'Approved' && !ADMIN.queue.some(x => x.data && x.data.pid === sp.id));
  });
  await T('E2 pinned terms: learners keep the deposit setting in force when their sign-up started', async () => {
    fresh(); const oid = addOpt(1000); const w = toPay('NV-L3', oid); const pin = JSON.stringify(w.signup.plan);
    FA(); depEdit('NV-L3', 'none', null, { r: 'Stop offering deposits' }); learner('A'); go('admission'); render();
    ok('E2 a learner who started with the £300 default keeps the deposit choice after Finance turns deposits off', JSON.stringify(w.signup.plan) === pin && payOpts() === 'deposit,instalment' && /£300\.00 now/.test(main()));
    const pl = payWith(w, 'deposit'); ok('E2 …and pays it: £300 deposit, £700 balance', w.signup.pay.amount === 300 && pl.rows[0].amount === 700);
    fresh(); const o2 = addOpt(1000); FA(); depEdit('NV-L3', 'none', null); const w2 = toPay('NV-L3', o2); FA(); depEdit('NV-L3', 'default', null, { r: 'Deposits back' }); learner('A'); go('admission');
    ok('E2 (negative) a learner who started with no deposit isn\'t offered one later', w2.signup.plan.depOff === true && payOpts() === 'instalment');
  });
  await T('E2 Level 2 / 3 / 4 / 5 compatibility and roles', async () => {
    fresh(); FA(); depEdit('NV-L2', 'none', null); depEdit('NV-L5', 'own', 500); depEdit('NV-L3', 'default', 100, { r: 'Default' });
    ACT.s4PlanEdit({ dataset: { p: 'NV-L4' } }); fill({ '#pp-f': '3000' }); INP.e1DepMode(radio('pp-dm', 'none')); const rL4 = reason('Set up Level 4');
    ok('E2 Level 2 none, Level 3 default (a typed amount is ignored unless "custom"), Level 5 custom £500, Level 4 set up with none', s4TermsOf('NV-L2').depOff && s4TermsOf('NV-L3').deposit === 300 && !s4TermsOf('NV-L3').own && s4TermsOf('NV-L5').deposit === 500 && s4TermsOf('NV-L5').own && rL4 !== false && s4TermsOf('NV-L4').depOff && !s4TermsOf('NV-L4').issue && s4TermsOf('NV-L4').fee === 3000 && ['NV-L2', 'NV-L3', 'NV-L5'].every(p => !s4TermsOf(p).issue), String(rL4) + ' ' + s4TermsOf('NV-L4').issue);
    learner('A'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq' && x.title === s3Pr('NV-L2').title).id } });
    ok('E2 Level 2 sign-up dialog: "no deposit for this programme" (no £ deposit amount)', !!MODAL && /no deposit for this programme\./.test(mroot().textContent) && !/deposit £/.test(mroot().textContent)); closeModal();
    ACA(); const n = s4Plans('NV-L2').length; ACT.s4PlanEdit({ dataset: { p: 'NV-L2' } }); ok('E2 (negative) Academic Admin can\'t edit a plan', !MODAL && s4Plans('NV-L2').length === n);
    ACT.s4CfgEdit(); ok('E2 (negative) Academic Admin can\'t change the Academy default', !MODAL && S4().cfg.deposit === 300);
  });

  /* ---------- E2 review: offer-letter payment wording; Academy default-deposit audit ---------- */
  const PAY_PARA = 'Your place is confirmed when you sign this letter and {{payment_terms}}. You can start learning straight away — the Academy reviews your application and documents while you learn, usually within 7 days.';
  // A new NV-L3 letter version that uses {{payment_terms}} (by the Super Administrator, through the upload dialog)
  const letterWithField = () => { SA(); ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value.split(/\n\s*\n/).map((p, k) => (k === 1 ? PAY_PARA : p)).join('\n\n'); return reason('Payment wording from the applicant\'s terms'); };
  // Sign-up up to the offer letter (step 3), without signing
  const toLetter = (optId, batchDays) => { learner('A'); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === s3Pr('NV-L3').title); ACT.applyNvq({ dataset: { id: c.id } }); const r = document.querySelector(`input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; prim(); const w = W; ACT.suNext(); if (batchDays != null) chBatch(w.signup.batch).start = D(batchDays); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); return w; };
  const letterTxt = () => ((document.querySelector('main .ch-letter') || {}).textContent || '');
  await T('E2 offer letter: the client\'s template is unchanged; a mismatch is flagged, not rewritten', async () => {
    fresh(); const before = JSON.stringify(chLetters('NV-L3'));
    SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' }); ok('E2 seeded letter (deposit offered, instalments): no payment-wording warning', !document.querySelector('main .e2-letter-clash'));
    FA(); depEdit('NV-L3', 'none', null); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    ok('E2 deposit turned off: the Offer letter tab warns that version 1 says "deposit"; the text itself is unchanged', !!document.querySelector('main .e2-letter-clash') && /Offer letter version 1 says "deposit", but this programme doesn't offer a deposit/.test(main()) && /pay your deposit or first instalment/.test(main()) && JSON.stringify(chLetters('NV-L3')) === before);
    FA(); depEdit('NV-L3', 'default', null, { m: 'one-time' }); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    ok('E2 one-payment plan: the tab warns that the letter says "instalment"', /says "instalment", but this programme is paid in one payment/.test(main()));
    ok('E2 the merge field is listed for letter authors', /\{\{payment_terms\}\}/.test(main()));
    letterWithField(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    ok('E2 a new version using {{payment_terms}}: version 2, no warning; version 1 kept byte-identical', chLetterCur('NV-L3').v === 2 && !document.querySelector('main .e2-letter-clash') && JSON.stringify(chLetters('NV-L3')[0]) === JSON.stringify(JSON.parse(before)[0]));
    ok('E2 the template view shows {{payment_terms}} as a merge field', !!document.querySelector('main .ch-letter .ch-merge') && [...document.querySelectorAll('main .ch-letter .ch-merge')].some(x => x.textContent === '{{payment_terms}}'));
    ACT.chLetterPrev({ dataset: { id: 'NV-L3' } }); ok('E2 preview (sample applicant, eligible batch): one payment and the default deposit — no instalments', /sign this letter and pay a deposit of £300\.00 or the full programme fee of £2,400\.00\./.test(mroot().textContent) && !/instalment/.test(mroot().querySelector('.ch-letter').textContent)); closeModal();
  });
  await T('E2 offer letter wording from the applicant\'s own terms (none / default / one payment / both / ineligible batch)', async () => {
    const run = (setup, batchDays) => { fresh(); const oid = addOpt(1000); letterWithField(); FA(); setup(); const w = toLetter(oid, batchDays); return { w, t: letterTxt() }; };
    let x = run(() => depEdit('NV-L3', 'none', null));
    ok('E2 no deposit, instalments: "pay the first of your 6 monthly instalments (£166.67)" — no deposit, no full payment', /sign this letter and pay the first of your 6 monthly instalments \(£166\.67\)\./.test(x.t) && !/deposit/i.test(x.t) && !/full programme fee/.test(x.t));
    x = run(() => {});
    ok('E2 default deposit, eligible batch, instalments: "pay a deposit of £300.00 or the first of your 6 monthly instalments (£166.67)"', /pay a deposit of £300\.00 or the first of your 6 monthly instalments \(£166\.67\)\./.test(x.t) && !/full programme fee/.test(x.t));
    x = run(() => {}, 10);
    ok('E2 default deposit but the batch starts in 10 days: the deposit isn\'t mentioned', /sign this letter and pay the first of your 6 monthly instalments \(£166\.67\)\./.test(x.t) && !/deposit of/.test(x.t));
    x = run(() => depEdit('NV-L3', 'none', null, { m: 'one-time' }));
    ok('E2 one payment, no deposit: "pay the full programme fee of £1,000.00" only', /sign this letter and pay the full programme fee of £1,000\.00\./.test(x.t) && !/instalment|deposit of/.test(x.t));
    x = run(() => depEdit('NV-L3', 'own', 250, { m: 'both' }));
    ok('E2 both methods, custom £250 deposit: deposit, full fee or first instalment — exactly the permitted routes', /pay a deposit of £250\.00, the full programme fee of £1,000\.00 or the first of your 6 monthly instalments \(£166\.67\)\./.test(x.t));
  });
  await T('E2 signed letters keep exactly what was signed', async () => {
    fresh(); const cSig = () => { SA(); ACT.chSignedPdf({ dataset: { v: 'C' } }); /* the same viewer each time: times show in the viewer's time zone */ const t = mroot().textContent; closeModal(); return t; }, c0 = cSig();
    const oid = addOpt(1000); letterWithField(); FA(); depEdit('NV-L3', 'none', null); const w = toLetter(oid);
    setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign();
    ok('E2 signing keeps the payment wording with the frozen snapshot', w.signup.sig.snapshot.pay === 'pay the first of your 6 monthly instalments (£166.67)' && Object.isFrozen(w.signup.sig.snapshot) && w.signup.sig.snapshot.v === 2);
    FA(); depEdit('NV-L3', 'own', 250, { m: 'both' }); SA(); letterWithField();
    ACT.chSignedPdf({ dataset: { v: 'A' } }); const t = mroot().textContent; closeModal();
    ok('E2 after the plan and the letter change, the signed letter still shows the signed wording and version', /sign this letter and pay the first of your 6 monthly instalments \(£166\.67\)\./.test(t) && !/deposit of £250/.test(t) && w.signup.sig.snapshot.v === 2 && chLetterCur('NV-L3').v === 3);
    const c1 = cSig(), k = [...c1].findIndex((ch, j) => ch !== c0[j]); ok('E2 a seeded signed letter (Priya, version 1) is unchanged by the new versions and plan changes', c1 === c0, `${STORE.worlds.C.me.first} ${!!STORE.worlds.C.signup.sig} @${k}: «${c0.slice(Math.max(0, k - 60), k + 60)}» vs «${c1.slice(Math.max(0, k - 60), k + 60)}»`);
  });
  await T('E2 Academy default change: audit, version history, no repricing, no approval rights', async () => {
    // CB8 (PD-CB-52): the proposals are packages submitted from Section 5 (was e1Submit from the Payment plan step)
    fresh(); ACA(); const pend = newProg('Level 4 Certificate in Pending Default'); pkgDep(pend, 'default'); pkgSubmit(pend); press();
    const i = ADMIN.queue.find(x => x.id === e1T(pend.id).qid);
    const own = newProg('Level 4 Certificate in Pending Custom'); pkgDep(own, 'own', 200); pkgSubmit(own); press();
    const i2 = ADMIN.queue.find(x => x.id === e1T(own.id).qid);
    const vers0 = JSON.stringify(S4().plans), learners0 = JSON.stringify(Object.values(STORE.worlds).map(w => [w.plans, w.admission && w.admission.deposit, w.signup && w.signup.plan]));
    const l3v = s4Plans('NV-L3').length;
    SA(); const a0 = ADMIN.audit.length; cfgSet(320); const log = ADMIN.audit.slice(0, ADMIN.audit.length - a0), up = log.find(x => x.action === 'Updated');
    ok('E2 the configuration entry records actor, time, old and new values', !!up && up.actor === ADMIN.me.name && !!up.at && up.module === 'System Configuration' && /£300\.00 · 28 days/.test(up.before) && /^£320\.00 · 28 days/.test(up.after));
    ok('E2 …and the programmes affected: the new versions, and the proposal waiting with the old default', /new plan versions: .*Level 3 Diploma in Adult Care \(England\) v2/.test(up.after) && up.after.includes(`waiting for Finance with the old default (to be resubmitted): ${pend.title} (${i.id})`) && !up.after.includes(own.title), up.after);
    ok('E2 one version entry per affected programme, by the same actor', log.filter(x => x.action === 'New version — Academy default deposit changed').every(x => x.actor === up.actor) && log.filter(x => x.action === 'New version — Academy default deposit changed').length === (up.after.match(/ v\d+/g) || []).length);
    const vb = JSON.parse(vers0), va = S4().plans;
    ok('E2 no earlier version edited: every version that existed is unchanged apart from Active → Superseded on the replaced one', Object.entries(vb).every(([pid, l]) => l.every((p, k) => { const q = JSON.parse(JSON.stringify(va[pid][k])); return JSON.stringify(q) === JSON.stringify(p) || (p.status === 'Active' && q.status === 'Superseded' && JSON.stringify({ ...q, status: 'Active' }) === JSON.stringify(p)); })));
    ok('E2 learners\' obligations (payment rows, deposits, pinned terms) are not repriced', JSON.stringify(Object.values(STORE.worlds).map(w => [w.plans, w.admission && w.admission.deposit, w.signup && w.signup.plan])) === learners0);
    ACT.s4PlanHist({ dataset: { p: 'NV-L3' } }); ok('E2 version history: the new version "Academy default deposit (£320.00 at this version)", the seeded one unchanged', s4Plans('NV-L3').length === l3v + 1 && /Academy default deposit \(£320\.00 at this version\)/.test(mroot().textContent) && /Configuration in use before plans were versioned/.test(mroot().textContent)); closeModal();
    ok('E2 no approval rights: both proposals still wait for Finance; nothing decided by the Super Administrator', i.status === 'Pending' && i2.status === 'Pending' && e1T(pend.id).status === 'Pending' && !(i.history || []).some(h => /Approved/.test(h[2])));
    // CB8 (PD-CB-55) supersedes E2's note wording for a package item ("…changed after submission</strong> (£300.00 when submitted, £320.00 now)"): the item says it
    // can't be approved as submitted because the Academy default deposit changed after submission (£300.00 then, £320.00 now)
    FA(); ok('E2 Finance\'s item for the default proposal says it must be resubmitted; the custom one has no such note', /Can't be approved as submitted:<\/strong> the Academy default deposit changed after submission \(£300\.00 then, £320\.00 now\)/.test(queueDetail(i.id)) && !/changed after submission/.test(queueDetail(i2.id)));
    ACT.e1Decide({ dataset: { id: i2.id, a: 'approve' } }); reason('Custom £200 agreed.');
    ok('E2 the custom-deposit proposal is unaffected by the default change and is approved', e1T(own.id).status === 'Approved' && s4PlanCur(own.id).deposit === 200);
    ACT.e1Decide({ dataset: { id: i.id, a: 'approve' } }); ok('E2 (negative) the default proposal can\'t be approved with the old default', reason('Agreed') === false && e1T(pend.id).status === 'Pending'); closeModal();
    ACT.e1Decide({ dataset: { id: i.id, a: 'return' } }); reason('Please resubmit with the current default (£320).');
    // CB8 (PD-CB-52): resubmitted from Section 5; the frozen package (was the E1 schedule snapshot) records the default in force (£320)
    ACA(); pkgSubmit(pend); press(); const i3 = ADMIN.queue.find(x => x.id === e1T(pend.id).qid);
    FA(); ok('E2 resubmitted with the current default: no stale note', i3.id !== i.id && i3.data.pkg.dep.eff === 320 && !/changed after submission/.test(queueDetail(i3.id)));
    ACT.e1Decide({ dataset: { id: i3.id, a: 'approve' } }); reason('Current default agreed.');
    ok('E2 approved with the current default (£320 in the approved package)', e1T(pend.id).status === 'Approved' && s4TermsOf(pend.id).deposit === 320 && s4PlanCur(pend.id).pkg.dep.eff === 320);
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
