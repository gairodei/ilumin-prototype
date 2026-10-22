// CB12-F — financial approval precedes publication (PD-CB-85…89): draft-version Yes→No, No→Yes and location changes invalidate
// the approval before publication; Finance approves the draft's exact package (held, no deadlock); publication only after approval;
// direct and confirm-time refusals; unchanged versions, legacy programmes, roles, D8; learners' records byte-identical; Fees UI.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const mroot = () => document.querySelector('#modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB11 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const tick = (cls, vals) => document.querySelectorAll('#modal-root ' + cls).forEach(x => { if (!x.disabled) x.checked = vals === true || vals.includes(x.value); });
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const rv = id => go('a-programmes', { id, tab: 'review' });
  const blockers = pr => cbRvChecks(pr).block, secs = pr => [...new Set(blockers(pr).map(x => x.sec))].sort().join(',');

  // Section 1: a new course (Level 3 fee-option rows); obs 'yes' / 'no'
  let codeN = 0;
  const make = (o = {}) => {
    go('a-programmes'); ACT.chProgNew(); const n = ++codeN;
    fill({ '#np-t': o.title || 'CB11 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (5500 + n) + '/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-code').value = 'CB11C' + n; document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = ACT.cbDetCreate(); closeModal(); return pr;
  };
  const structure = (pr, obs) => {
    const id = pr.id; go('a-programmes', { id, tab: 'structure' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U5' + codeN, '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/5' + codeN });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred care', '#c-e': 'Written account' });
    if (obs) { add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Deliver person-centred care', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe moving and handling', '#c-e': 'Observed at work' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Communicate respectfully', '#c-e': 'Observed at work' }); }
  };
  // Section 3: an assignment with a mapped question (new assignments have References and no template)
  const author = (pr, title) => {
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title, '#cna-d': '2026-12-20T21:59' }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    const crit = s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); reason('Publish'); return d;
  };
  // Section 4: locations, evidence for the NVQ criteria, one Academy criterion, two required observation events
  const observations = pr => {
    const id = pr.id; ACT.n5Settings({ dataset: { p: id } }); radio('n5-req', 'yes'); radio('n5-wp', 'Permitted'); radio('n5-off', 'Available'); press();
    const d = n5Draft(pr), nvq = n5NvqOk(pr, d).map(c => c.code);
    nvq.forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c } }); tick('.n5-ev', ['notes', 'photo']); press(); });
    ACT.n5IaEdit({ dataset: { p: id, c: '' } }); if (MODAL) { document.querySelector('#n5-t').value = 'Arrives on time and in uniform'; const dd = document.querySelector('#n5-d'); if (dd) dd.value = 'Punctual and presentable on shift'; tick('.n5-ev', ['notes']); tick('.n5-map', [nvq[0]]); press(); }
    const ia = n5Draft(pr).ia.filter(c => c.status === 'Active').map(c => c.code);
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1 — moving and handling'; tick('.ev-l', ['workplace']); tick('.ev-c', [nvq[0]].concat(ia)); tick('.ev-e', ['notes', 'photo']); press();
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 2 — communication'; tick('.ev-l', ['workplace', 'office']); tick('.ev-c', [nvq[1]]); tick('.ev-e', ['notes']); press();
    return { nvq, ia };
  };
  // Section 5: workplace / office observation fees (Fully Assisted £70 / £0; Self-Paced £100 / £45.50), payment choices
  const fees = (pr, obs) => {
    const id = pr.id, [a, b] = cb8Work(pr).opts;
    if (obs) [[a, '70', '0'], [b, '100', '45.50']].forEach(([x, wp, off]) => { ACT.cb8Opt({ dataset: { p: id, o: x.id } }); document.querySelector('#modal-root #c8-wp').value = wp; document.querySelector('#modal-root #c8-off').value = off; press(); });
    const payTo = (oid, ks) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); };
    payTo(a.id, [1, 4, 6]); payTo(b.id, [1, 3]); return { a: a.id, b: b.id };
  };
  // Section 6: offer letter Version 1 and 2 (with {{payment_terms}}), one more checklist item (a new checklist version)
  const documents = pr => {
    const id = pr.id; go('a-programmes', { id, tab: 'letter' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('Payment wording added');
    go('a-programmes', { id, tab: 'docs' }); ACT.s4CkAdd({ dataset: { p: id } }); fill({ '#ck-n': 'Care Certificate (if held)', '#ck-f': 'PDF' }); document.querySelector('#ck-m').value = '0'; reason('Optional prior learning');
  };
  const submitAndApprove = pr => {
    go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press();
    const qid = cb8Wf(pr).qid; FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list'); return qid;
  };
  const batch = (pr, code) => {
    ACA(); go('a-batches'); ACT.newBatch(); fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const bt = ADMIN.batches.find(x => x.code === code); if (bt) { bt.start = D(40, '09:00'); bt.end = D(240, '17:00'); } return bt;
  };
  const signUp = (v, pr, bt, optId, k) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
    const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; prim(); closeModal();
    const w = W; chSetBatch(w, bt); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, bt);
    setUi('cb9Pay', String(k)); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-CB11-' + v); closeModal();
    return w;
  };
  const rows = w => { const p = w.plans.find(x => x.e === 'nvq'); return p ? p.rows.map(r => [cbYmdOf(r.due), r.amount, r.status]) : null; };

  /* ================= CB12-F: financial approval precedes publication ================= */
  // A published Level 3 package programme (observations Yes or No), its package approved by Finance, one batch, one learner signed and paid
  const published = obs => {
    ACA(); const pr = make({ obs }); structure(pr, obs); author(pr, 'CBF assignment ' + codeN); if (obs) observations(pr); const fx = fees(pr, obs); documents(pr);
    submitAndApprove(pr); ACA(); ACT.cbPublish({ dataset: { id: pr.id } }); reason('Ready');
    const bt = batch(pr, 'CBF-' + codeN), w = signUp('A', pr, bt, fx.a, 4); ACA();
    return { pr, ...fx, bt, w };
  };
  const snap = w => J({ s: w.signup, p: w.plans });
  const newVersion = pr => { ACA(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('2028 changes'); };
  const answer = (pr, yes) => { go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('main #np-obs-' + (yes ? 'yes' : 'no')).checked = true; ACT.cbObsSave({ dataset: { id: pr.id } }); };
  const settings = (pr, wp, off) => { ACT.n5Settings({ dataset: { p: pr.id } }); if (!MODAL) return false; radio('n5-req', 'yes'); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const gate = pr => blockers(pr).filter(x => x.sec === 'payments');
  const wf = pr => cb8Wf(pr), planV = pr => (s4PlanCur(pr.id) || {}).v;
  const tryPublish = (pr, how) => { const a0 = ADMIN.audit.length, v0 = pr.version; ACT[how]({ dataset: { id: pr.id } }); const refused = !MODAL || /Can't publish/.test(MODAL.title); if (MODAL && /^Publish/.test(MODAL.title)) closeModal(); else closeModal(); return { refused: refused && pr.version === v0, logged: blocked(a0, /publish/) }; };

  await T('CBF-A Yes → No in a draft version', async () => {
    fresh(); const P = published(true), pr = P.pr, s0 = snap(P.w), v0 = planV(pr), pkg0 = J(cb8Cur(pr.id));
    ok('CBF-A (setup) published Version 1 with an approved package in force (plan version ' + v0 + ') and a signed, paying learner', pr.status === 'Active' && pr.version === 1 && wf(pr).status === 'Approved' && !!cb8Cur(pr.id) && !!P.w.signup.sig);
    newVersion(pr); answer(pr, false);
    ok('CBF-A answering No in Version 2 (draft) withdraws the approval BEFORE publication: terms back to Draft, audited, Version 1 still current', wf(pr).status === 'Draft' && pr.version === 1 && ADMIN.audit.some(a => a.action === 'Payment terms need Finance approval again') && planV(pr) === v0 && J(cb8Cur(pr.id)) === pkg0);
    rv(pr.id); const g = gate(pr);
    ok('CBF-A Review & Publish blocks Version 2 with a payment-terms blocker linked to Fees & Payments; Publish disabled', g.length === 1 && /not approved for Version 2/.test(g[0].msg) && g[0].tab === 'fees' && q('[data-act="cbPublish"]').disabled && qa('.cb-rv-fix').some(b => b.dataset.tab === 'fees'), J(g));
    ['cbPublish', 's3WizPublish'].forEach(n => { const r = tryPublish(pr, n); ok(`CBF-A (negative) direct ${n} without valid approval: refused and logged; nothing published`, r.refused && r.logged && pr.version === 1); });
    go('a-programmes', { id: pr.id, tab: 'fees' });
    ok('CBF-A Fees & Payments works on the draft: observation fees "Not applicable — no observations"; the package is checked against Version 2', /observations: no/.test(q('.cb8-basis').textContent) && /Not applicable — no observations/.test(q('.cb8-opt').textContent));
    ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press(); const qid = wf(pr).qid;
    ok('CBF-A the creator submits the revised package against the draft configuration (frozen basis: observations no)', wf(pr).status === 'Pending' && wf(pr).sub.basis.req === false);
    rv(pr.id); ok('CBF-A while Finance reviews: blocked "waiting for Finance review"', /waiting for Finance review/.test(gate(pr).map(x => x.msg).join()));
    const a1 = ADMIN.audit.length; answer(pr, true); ok('CBF-A (negative) while Finance reviews, the draft\'s observation answer is locked (refused, logged)', cbObsOf(pr) === false && blocked(a1));
    ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); const dlg = !!MODAL; if (MODAL) reason('x'); ok('CBF-A (negative) the creator cannot approve their own package (separation of duties: refused, no dialog)', !dlg && wf(pr).status === 'Pending');
    FA(); go('a-queue', { id: qid }); ok('CBF-A Finance sees the exact proposed configuration in the queue item (observations no), and that it takes effect when Version 2 is published', /observations no/.test(main()) && /These terms are for Version 2 \(draft\)/.test(main()));
    ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Version 2 terms checked');
    ok('CBF-A Finance approves before publication — no deadlock: approved for Version 2 and held; the plan in force for current sign-ups is unchanged', wf(pr).status === 'Approved' && wf(pr).held && wf(pr).held.v === 2 && planV(pr) === v0 && J(cb8Cur(pr.id)) === pkg0 && pr.version === 1);
    ACA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CBF-A Fees & Payments says the terms are approved for Version 2 and go into force when it is published', /Approved for Version 2 \(draft\)/.test(q('.cb8-state').textContent));
    rv(pr.id); ok('CBF-A Review & Publish: nothing blocking now', !blockers(pr).length, J(blockers(pr).map(x => x.msg)));
    q('[data-act="cbPublish"]').click(); reason('Version 2');
    ok('CBF-A publication succeeds only now: Version 2 current, its package put in force as a new plan version (observations no)', pr.version === 2 && planV(pr) === v0 + 1 && cb8Cur(pr.id).basis.req === false && !wf(pr).held && wf(pr).status === 'Approved');
    ok('CBF-A the earlier plan version keeps its frozen package (observations yes)', s4Plans(pr.id).find(x => x.v === v0).pkg.basis.req === true && J(s4Plans(pr.id).find(x => x.v === v0).pkg) === pkg0);
    ok('CBF-A the approval is not withdrawn after publication (no post-publication invalidation)', !ADMIN.audit.slice(0, 3).some(a => a.action === 'Payment terms need Finance approval again'));
    ok('CBF-A the existing learner\'s sign-up, signed letter, pinned terms and payment rows are byte-identical', snap(P.w) === s0);
  });

  await T('CBF-B No → Yes in a draft version', async () => {
    fresh(); const P = published(false), pr = P.pr, s0 = snap(P.w), v0 = planV(pr);
    newVersion(pr); go('a-programmes', { id: pr.id, tab: 'structure' }); add8('ch8AddLo', { id: pr.id, u: 0, m: 0 }, { '#lo-t': 'Deliver care', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id: pr.id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe practice', '#c-e': 'Observed' });
    answer(pr, true); settings(pr, 'Permitted', 'Available');
    ok('CBF-B answering Yes (workplace and office) in the draft withdraws the approval before publication', wf(pr).status === 'Draft' && pr.version === 1);
    const d = n5Draft(pr); n5NvqOk(pr, d).forEach(c => { ACT.n5NvqEv({ dataset: { p: pr.id, c: c.code } }); tick('.n5-ev', ['notes']); press(); });
    ACT.cbObsEv({ dataset: { p: pr.id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1'; tick('.ev-l', ['workplace', 'office']); tick('.ev-c', n5NvqOk(pr, d).map(c => c.code)); tick('.ev-e', ['notes']); press();
    rv(pr.id); ok('CBF-B blocked by the payment terms only (the observation fees for the draft must be set and approved)', gate(pr).length === 1 && blockers(pr).length === 1, J(blockers(pr).map(x => x.msg)));
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CBF-B Fees & Payments asks for both observation fees now (the draft permits both locations)', cb8Issues(pr, cb8Work(pr)).some(x => /workplace observation fee/.test(x.msg)) && cb8Issues(pr, cb8Work(pr)).some(x => /Academy-office observation fee/.test(x.msg)));
    [[P.a, '80', '0'], [P.b, '60', '30']].forEach(([o, wp, off]) => { ACT.cb8Opt({ dataset: { p: pr.id, o } }); fill({ '#modal-root #c8-wp': wp, '#modal-root #c8-off': off }); press(); });
    submitAndApprove(pr); ok('CBF-B approved for Version 2, held (plan in force unchanged)', wf(pr).status === 'Approved' && !!wf(pr).held && planV(pr) === v0);
    ACA(); const r = tryPublish(pr, 'cbPublish'); // opens the publish dialog (not refused)
    ACT.cbPublish({ dataset: { id: pr.id } }); reason('Version 2');
    ok('CBF-B Version 2 published with its package in force: observation fees £80/£0 and £60/£30', !r.refused && pr.version === 2 && planV(pr) === v0 + 1 && cb8Cur(pr.id).opts.find(o => o.id === P.a).obsWp === 80 && cb8Cur(pr.id).opts.find(o => o.id === P.b).obsOff === 30);
    ok('CBF-B the existing learner\'s records are byte-identical', snap(P.w) === s0);
  });

  await T('CBF-C location change, stale approval, confirm-time recheck', async () => {
    fresh(); const P = published(true), pr = P.pr, v0 = planV(pr);
    newVersion(pr); answer(pr, true);
    ok('CBF-C a draft version with the same answer and locations keeps the approval (nothing unrelated invalidates)', wf(pr).status === 'Approved' && !gate(pr).length);
    settings(pr, 'Permitted', 'Not available');
    ok('CBF-C making the Academy office unavailable in the draft withdraws the approval before publication', wf(pr).status === 'Draft' && pr.version === 1);
    go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CBF-C the office fee is "not applicable — location not permitted" for the draft (the stored value kept)', /location not permitted/.test(q('.cb8-opt').textContent));
    submitAndApprove(pr); ok('CBF-C Finance approves the revised package (held)', wf(pr).status === 'Approved' && wf(pr).held.pkg.basis.off === false && planV(pr) === v0);
    ACA(); settings(pr, 'Permitted', 'Available');
    ok('CBF-C changing the draft again after approval makes the approval invalid before publication (held package dropped)', wf(pr).status === 'Draft' && !wf(pr).held);
    rv(pr.id); ok('CBF-C blocked again', gate(pr).length === 1);
    submitAndApprove(pr); ACA(); ACT.cbPublish({ dataset: { id: pr.id } }); ok('CBF-C (setup) ready: the publish dialog opens', !!MODAL && /^Publish/.test(MODAL.title));
    n5Draft(pr).office = 'Not available'; // the configuration changes while the dialog is open (no action ran)
    const a0 = ADMIN.audit.length; document.querySelector('#rsn').value = 'Publish'; prim(); closeModal();
    ok('CBF-C the final publish action rechecks the approval against the current draft: refused, logged, Version 1 still current', pr.version === 1 && blocked(a0, /payment terms/));
  });

  await T('CBF-D unchanged versions, legacy, roles', async () => {
    fresh(); const P = published(true), pr = P.pr, v0 = planV(pr), s0 = snap(P.w);
    newVersion(pr); answer(pr, true); go('a-programmes', { id: pr.id, tab: 'structure' }); add8('ch8AddUnit', { id: pr.id }, { '#u-c': 'U9D', '#u-t': 'Reflection' }); add8('ch8AddMod', { id: pr.id, u: 1 }, { '#m-t': 'Reflect', '#m-ab': 'R/1/9' }); add8('ch8AddLo', { id: pr.id, u: 1, m: 0 }, { '#lo-t': 'Reflect on practice', '#lo-y': 'Knowledge' });
    ACT.cbPublish({ dataset: { id: pr.id } }); reason('Version 2');
    ok('CBF-D an approved, unchanged financial basis: the version publishes normally, the same plan version stays in force', pr.version === 2 && planV(pr) === v0 && wf(pr).status === 'Approved' && snap(P.w) === s0);
    // roles and portals
    newVersion(pr); answer(pr, false); BA(); const r1 = tryPublish(pr, 's3WizPublish'), r2 = tryPublish(pr, 'cbPublish');
    ok('CBF-D (negative) a Business Admin calling publish directly is refused (existing permission)', r1.refused && r2.refused && pr.version === 2);
    FA(); const a0 = ADMIN.audit.length; ACT.cb8Submit({ dataset: { p: pr.id } }); ok('CBF-D (negative) Finance can\'t submit the creator\'s package (refused, logged)', wf(pr).status === 'Draft' && blocked(a0));
    learner('A'); const r3 = tryPublish(pr, 's3WizPublish'); ok('CBF-D (negative) the learner portal can\'t publish', r3.refused && pr.version === 2);
    // Super Administrator D8: own package approved at once, held for the draft version, then published
    SA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8SaApprove({ dataset: { p: pr.id } }); if (MODAL) reason('D8');
    ok('CBF-D Super Administrator (D8) approves their own revised package: held for Version 3, plan in force unchanged', wf(pr).status === 'Approved' && wf(pr).held && wf(pr).held.v === 3 && planV(pr) === v0);
    ACT.cbPublish({ dataset: { id: pr.id } }); reason('Version 3'); ok('CBF-D …and Version 3 publishes with that package in force', pr.version === 3 && planV(pr) === v0 + 1 && cb8Cur(pr.id).basis.req === false);
    // legacy: seeded NV-L3 (no financial package) keeps its existing rules
    SA(); ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); reason('Legacy'); go('a-programmes', { id: 'NV-L3', tab: 'details' }); document.querySelector('main #np-obs-no').checked = true; ACT.cbObsSave({ dataset: { id: 'NV-L3' } });
    const L3 = cbPr('NV-L3'); ok('CBF-D legacy NV-L3: no financial-package gate (its Finance-owned plan is unchanged by a version)', !cb8Managed(L3) && !gate(L3).length && !cbFinGate(L3));
    const p0 = J(s4Plans('NV-L3')); ACT.cbPublish({ dataset: { id: 'NV-L3' } }); reason('Legacy v3'); ok('CBF-D …and publishes as before; its plans untouched', L3.version === 3 && J(s4Plans('NV-L3')) === p0);
  });

  await T('CBF-E Fees & Payments UI', async () => {
    fresh(); const P = published(true), pr = P.pr; ACA(); go('a-programmes', { id: pr.id, tab: 'fees' });
    ok('CBF-E approved terms: no "Submit to Finance for review"; the approved state and how to change them are shown', !q('[data-act="cb8Submit"]') && !q('[data-act="cb8SaApprove"]') && !!q('.cb8-approved') && /To change them, edit a fee option/.test(q('.cb8-approved').textContent));
    const qid = wf(pr).approved.qid, t = q('.cb8-state').textContent;
    ok('CBF-E the Finance queue reference appears once in the status line', t.split(qid).length - 1 === 1, t);
    ACT.cb8PayAdd({ dataset: { p: pr.id, o: P.a, k: '2' } }); go('a-programmes', { id: pr.id, tab: 'fees' });
    ok('CBF-E after a change the terms are a draft again and "Submit to Finance for review" is offered', wf(pr).status === 'Draft' && !!q('[data-act="cb8Submit"]'));
    SA(); go('a-programmes', { id: pr.id, tab: 'fees' }); ok('CBF-E the Super Administrator sees "Approve and put in force" for a draft (D8 unchanged)', !!q('[data-act="cb8SaApprove"]'));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
