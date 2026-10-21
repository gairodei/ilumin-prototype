// CB11 — Review & Publish (PD-CB-73…78), with the final Course Builder acceptance scenario: a Level 3 programme created end to end
// (details with observations, curriculum, an assignment with References, two required observations with an Academy criterion and
// evidence, Self-Paced and Fully Assisted fee options with different workplace / office fees including £0, several payment
// choices, Finance approval and locked terms, a versioned letter and checklist), reviewed and published here; one mixed-mode batch;
// two learners on different options and payment choices with pinned dates and simulated reminders; historical isolation after a
// new package, letter version and programme version. Also: a course with Observations = No, seeded drafts, published, suspended,
// retired, role checks and the section links.
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

  /* ================= A. Final acceptance — Level 3 with observations, end to end ================= */
  let P = null;
  await T('CB11-A creation and review', async () => {
    fresh(); ACA(); const pr = make({ obs: true }); P = { pr };
    ok('CB11-A Section 1: the Draft is created with Observations = Yes, course code and Level 3', !!pr && pr.status === 'Draft' && cbObsOf(pr) === true && pr.code === 'CB11C' + codeN && pr.level === 'Level 3');
    rv(pr.id);
    ok('CB11-A Review & Publish is one panel with a summary of all six sections and an Open link for each', qa('.cb-rv-sec').length === 6 && J(qa('.cb-rv-sec').map(x => x.dataset.sec)) === J(['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents']) && qa('.cb-rv-sec [data-go="a-programmes"]').length === 6);
    ok('CB11-A the empty course is blocked, with blockers grouped under the sections that fix them (curriculum, observations, payments, documents)', /items? to fix before this programme can be published/.test(q('.cb-rv-state').textContent) && ['curriculum', 'documents', 'payments'].every(s => secs(pr).includes(s)), secs(pr));
    ok('CB11-A each blocker has "Fix in Section N — name" going to that section\'s panel', qa('.cb-rv-todo .cb-rv-it').filter(li => /Blocking/.test(li.textContent)).every(li => { const b = li.querySelector('.cb-rv-fix'); return b && new RegExp('Fix in Section ' + cbRvN(li.dataset.sec)).test(b.textContent) && CB_ROUTE[b.dataset.tab][0] === li.dataset.sec; }));
    ok('CB11-A Publish is disabled while anything blocks; the nav badges the sections to fix and "N blocking" on Review', q('[data-act="cbPublish"]').disabled && /blocking/.test(q('.cb-sec[data-tab="review"]').textContent) && !!q('.cb-sec[data-tab="documents"] .cb-badge.bad'));
    const lnk = qa('.cb-rv-fix').find(b => b.dataset.tab === 'letter'); lnk.click();
    ok('CB11-A clicking "Fix in Section 6" opens Offer Letter & Documents → Offer letter', !!q('.cb-sec.cur[data-tab="documents"]') && q('.cb-panels .tab[aria-selected="true"]').textContent === 'Offer letter');
    const a0 = ADMIN.audit.length; ACT.cbPublish({ dataset: { id: pr.id } });
    ok('CB11-A (negative) Publish called directly while blocked: refused by the existing action (logged), stays Draft', pr.status === 'Draft' && blocked(a0, /publish/)); closeModal();

    structure(pr, true); const d1 = author(pr, 'CB11 Person-centred care'); const ob = observations(pr); const fx = fees(pr, true); documents(pr); Object.assign(P, fx, ob);
    ok('CB11-A (setup) an assignment with a mapped question and References, published', !!d1 && d1.status === 'Published' && !!d1.refs && d1.qs[0].crit.length === 1);
    ok('CB11-A (setup) two required observation events, one Academy criterion with evidence, both locations', cbEvOf(n5Draft(pr)).length === 2 && ob.ia.length === 1 && n5Draft(pr).workplace === 'Permitted' && n5Draft(pr).office === 'Available');
    ok('CB11-A (setup) letter Version 2 and checklist version 2', chLetterCur(pr.id).v === 2 && s4List(pr.id).v === 2);
    rv(pr.id);
    ok('CB11-A only the Finance approval is left, under Fees & Payments ("not yet sent to Finance")', secs(pr) === 'payments' && blockers(pr).length === 1 && /not yet sent to Finance/.test(blockers(pr)[0].msg), J(blockers(pr).map(x => x.msg)));
    const sum = k => q(`.cb-rv-sec[data-sec="${k}"]`).textContent;
    ok('CB11-A summary — details: course, code, qualification number, 6 months, Observations Yes', /CB11C/.test(sum('details')) && /QN 610\//.test(sum('details')) && /6 months/.test(sum('details')) && /Yes/.test(sum('details')));
    ok('CB11-A summary — curriculum: 1 unit · 1 module · 2 Learning Outcomes · 3 criteria; Knowledge 1 · Observation 1', /1 unit · 1 module · 2 Learning Outcomes · 3 criteria/.test(sum('curriculum')) && /Knowledge 1 · Observation 1/.test(sum('curriculum')), sum('curriculum'));
    ok('CB11-A summary — assessments: 1 assignment, 1 published, with References; knowledge criteria covered 1 of 1', /1 assignment — 1 published, 0 draft · 1 with References/.test(sum('assessments')) && /1 of 1/.test(sum('assessments')), sum('assessments'));
    ok('CB11-A summary — observations: workplace and Academy office, two required observation events named, NVQ criteria covered 2 of 2, 1 Academy criterion', /Workplace · Academy office/.test(sum('observations')) && /2 observation events — Observation 1 — moving and handling · Observation 2 — communication/.test(sum('observations')) && /2 of 2/.test(sum('observations')), sum('observations'));
    ok('CB11-A summary — fees: both options with mode, fee, workplace and office fees (£0 shown) and payment choices; deposit', /Fully Assisted — standard · Fully Assisted · £2,400\.00 · observation fee workplace £70\.00, Academy office £0\.00 · Pay in full, 4 payments, 6 payments/.test(sum('payments')) && /Self-Paced — standard · Self-Paced · £1,800\.00 · observation fee workplace £100\.00, Academy office £45\.50 · Pay in full, 3 payments/.test(sum('payments')) && /Academy default deposit/.test(sum('payments')), sum('payments'));
    ok('CB11-A summary — documents: letter Version 2, checklist version 2 with one more (optional) document', /Version 2/.test(sum('documents')) && /Checklist version 2 · 7 documents \(6 mandatory\)/.test(sum('documents')), sum('documents'));
    ok('CB11-A observations: two events → state "Complete"; Section 5 "1 to fix"', /Complete/.test(q('.cb-rv-sec[data-sec="observations"] .cb-rv-st').textContent) && /1 to fix/.test(q('.cb-rv-sec[data-sec="payments"] .cb-rv-st').textContent));

    // Finance: submitted by the Academic Admin, approved by a Finance Admin; terms locked while pending
    go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press(); const qid = cb8Wf(pr).qid;
    rv(pr.id); ok('CB11-A waiting for Finance: blocker "Payment terms waiting for Finance review (AQ-…)" and the summary says so', /waiting for Finance review/.test(blockers(pr).map(x => x.msg).join()) && /Waiting for Finance review/.test(q('.cb-rv-sec[data-sec="payments"]').textContent));
    const a1 = ADMIN.audit.length; ACT.cb8PayAdd({ dataset: { p: pr.id, o: P.a, k: '2' } }); ok('CB11-A (negative) the terms are locked while Finance reviews (refused, logged)', blocked(a1) && J(cb8Work(pr).opts[0].pay.map(x => x.k)) === '[1,4,6]');
    FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list');
    ok('CB11-A a Finance Admin approves the package: plan version with the frozen package in force', cb8Wf(pr).status === 'Approved' && !!cb8Cur(pr.id) && Object.isFrozen(cb8Cur(pr.id)));
    ACA(); rv(pr.id);
    ok('CB11-A ready: "Ready to publish Version 1", no blockers, Finance approval shown with approver and queue item', !blockers(pr).length && /Ready to publish Version 1/.test(q('.cb-rv-state').textContent) && new RegExp('Approved.*' + qid).test(q('.cb-rv-sec[data-sec="payments"]').textContent) && !q('[data-act="cbPublish"]').disabled);
    const pkg0 = J(cb8Cur(pr.id)), let0 = J(chLetters(pr.id));
    q('[data-act="cbPublish"]').click(); ok('CB11-A Publish opens the existing publish dialog (reason required)', !!MODAL && /Publish/.test(MODAL.title)); reason('Ready for the January intake');
    ok('CB11-A published: Active, Version 1, in the catalogue, audited "Programme published (Version 1)"', pr.status === 'Active' && pr.version === 1 && CATALOGUE.some(c => c.title === pr.title) && ADMIN.audit.some(a => a.action === 'Programme published (Version 1)' && String(a.entity).includes(pr.id)));
    ok('CB11-A publishing left the approved package and the letter versions exactly as they were', J(cb8Cur(pr.id)) === pkg0 && J(chLetters(pr.id)) === let0);
    rv(pr.id); ok('CB11-A after publishing the review says Version 1 is published, nothing to publish, and offers "Create new version"', /Version 1 is published/.test(q('.cb-rv-state').textContent) && !q('[data-act="cbPublish"]') && !!q('[data-act="s3WizVersion"]'));
  });

  await T('CB11-B batch, learners, pinned schedules, reminders', async () => {
    if (!P || P.pr.status !== 'Active') { ok('CB11-B (setup) the programme from CB11-A is published', false); return; }
    const pr = P.pr, bt = batch(pr, 'CB11-JAN'); P.bt = bt;
    ok('CB11-B one batch for the programme (mixed mode: both fee options can join it)', !!bt && bt.course === pr.title);
    const wA = signUp('A', pr, bt, P.a, 4), wF = signUp('F', pr, bt, P.b, 3); P.wA = wA; P.wF = wF;
    ok('CB11-B the learners chose different approved options: Fully Assisted 4 payments, Self-Paced 3 payments', wA.signup.plan.cb8.opt.id === P.a && wF.signup.plan.cb8.opt.id === P.b && wA.signup.plan.cb8.opt.mode === 'Fully Assisted' && wF.signup.plan.cb8.opt.mode === 'Self-Paced');
    ok('CB11-B pinned dates and amounts: 4 × £600.00 from 13 Nov 2026 (payment 1 paid at checkout)', J(rows(wA)) === J([['2026-11-13', 600, 'Paid'], ['2026-12-28', 600, 'Pending'], ['2027-02-11', 600, 'Pending'], ['2027-03-28', 600, 'Pending']]), J(rows(wA)));
    ok('CB11-B pinned dates and amounts: 3 × £600.00 every 2 months from 13 Nov 2026', J(rows(wF)) === J([['2026-11-13', 600, 'Paid'], ['2027-01-13', 600, 'Pending'], ['2027-03-13', 600, 'Pending']]), J(rows(wF)));
    ok('CB11-B both signed offer letter Version 2 with an exact copy that names their own option\'s choices', wA.signup.sig.v === 2 && !!wA.signup.sig.snapshot && /4 payments/.test(wA.signup.sig.snapshot.pay) && /3 payments/.test(wF.signup.sig.snapshot.pay));
    FA(); ACT.cb10Advance({ dataset: { d: '78' } });
    const lg = lid => STORE.cbRem.log.filter(x => x.lid === lid).map(x => x.kind + ':' + x.n);
    ok('CB11-B simulated to 21 Dec 2026: Daniel gets "upcoming" for payment 2; the Self-Paced learner (next due 13 Jan) none yet', J(lg(wA.me.id)) === J(['upcoming:2']) && !lg(wF.me.id).length);
    ACT.cb10Advance({ dataset: { d: '23' } });
    ok('CB11-B 13 Jan 2027: the Self-Paced learner\'s payment 2 is upcoming then due; reminders labelled simulated', lg(wF.me.id).sort().join() === 'due:2,upcoming:2' && wF.notifs.filter(n => /\(simulated\)$/.test(n.title)).length === 2, J(lg(wF.me.id)) + ' ' + J(wF.notifs.slice(0,4).map(n => n.title)));
    const st0 = J({ e: (wA.enrolments || []).map(e => e.status), p: wA.plans.map(p => p.status) });
    ACT.cb10Advance({ dataset: { d: '30' } });
    ok('CB11-B Day 30 overdue (12 Feb 2027) is a simulated reminder only: Daniel\'s enrolments and plan statuses are unchanged (Decision 2 — no automatic suspension)', lg(wA.me.id).some(x => /^od30/.test(x)) && J({ e: (wA.enrolments || []).map(e => e.status), p: wA.plans.map(p => p.status) }) === st0, J(lg(wA.me.id)));
  });

  await T('CB11-C historical isolation', async () => {
    if (!P || !P.wA) { ok('CB11-C (setup) learners from CB11-B', false); return; }
    const pr = P.pr, snapA = J({ s: P.wA.signup, p: P.wA.plans }), snapF = J({ s: P.wF.signup, p: P.wF.plans }), v1 = s4PlanCur(pr.id).v, pkg1 = J(cb8Cur(pr.id));
    // a new package (Self-Paced gains 6 payments), approved by Finance
    ACA(); ACT.cb8PayAdd({ dataset: { p: pr.id, o: P.b, k: '6' } }); submitAndApprove(pr);
    ok('CB11-C a new financial package is approved as a new plan version; the earlier version keeps its frozen package', s4PlanCur(pr.id).v === v1 + 1 && J(s4Plans(pr.id).find(x => x.v === v1).pkg) === pkg1);
    // offer letter Version 3, a new programme version published from Review & Publish
    ACA(); go('a-programmes', { id: pr.id, tab: 'letter' }); ACT.chLetterUp({ dataset: { id: pr.id } }); ACT.chLetterSample(); reason('Version 3');
    ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('2028 changes'); go('a-programmes', { id: pr.id, tab: 'structure' });
    add8('ch8AddUnit', { id: pr.id }, { '#u-c': 'U9' + codeN, '#u-t': 'Reflective practice' }); add8('ch8AddMod', { id: pr.id, u: 1 }, { '#m-t': 'Reflection', '#m-ab': 'R/651/9' + codeN }); add8('ch8AddLo', { id: pr.id, u: 1, m: 0 }, { '#lo-t': 'Reflect on practice', '#lo-y': 'Knowledge' });
    rv(pr.id); ok('CB11-C a draft version is reviewed as "Version 2 (draft)" with "Publish version 2"', /Version 2 \(draft\)/.test(q('.cb-rv h2').textContent) && /Publish version 2/.test(q('[data-act="cbPublish"]').textContent));
    ok('CB11-C (negative) the new version must record the observation answer again (N5a): one blocker, fixed in Section 1 — Course Details', blockers(pr).length === 1 && blockers(pr)[0].sec === 'details' && q('[data-act="cbPublish"]').disabled, J(blockers(pr).map(x => x.msg)));
    go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('main #np-obs-yes').checked = true; ACT.cbObsSave({ dataset: { id: pr.id } });
    rv(pr.id); ok('CB11-C answered Yes for Version 2: nothing blocks', !blockers(pr).length, J(blockers(pr).map(x => x.msg)));
    ACT.cbPublish({ dataset: { id: pr.id } }); reason('Version 2'); ok('CB11-C Version 2 published from Review & Publish', pr.version === 2 && !pr.nextDraft, J(blockers(pr).map(x => x.msg)) + ' ' + (MODAL ? MODAL.title : '') + ' ' + ADMIN.audit[0].action);
    ok('CB11-C learners keep their signup (letter Version 2 signed copy, programme version, pinned terms) and their payment rows exactly', J({ s: P.wA.signup, p: P.wA.plans }) === snapA && J({ s: P.wF.signup, p: P.wF.plans }) === snapF);
    ok('CB11-C the signed copy is still Version 2 while the current letter is Version 3; pinned option terms still frozen', P.wA.signup.sig.v === 2 && chLetterCur(pr.id).v === 3 && Object.isFrozen(P.wA.signup.plan.cb8));
  });

  /* ================= D. A course with Observations = No ================= */
  await T('CB11-D Observations = No', async () => {
    fresh(); ACA(); const pr = make({ obs: false }); structure(pr, false); author(pr, 'CB11 No-obs assignment'); fees(pr, false); documents(pr);
    rv(pr.id);
    ok('CB11-D Observations section: "Not applicable" in the summary; no observation blockers', /Not applicable/.test(q('.cb-rv-sec[data-sec="observations"]').textContent) && !blockers(pr).some(x => x.sec === 'observations'));
    ok('CB11-D fees: no observation fee is listed for either option', !/observation fee/.test(q('.cb-rv-sec[data-sec="payments"]').textContent));
    submitAndApprove(pr); ACA(); rv(pr.id);
    ok('CB11-D after Finance approval: ready, and publishes from Review & Publish', !blockers(pr).length && (ACT.cbPublish({ dataset: { id: pr.id } }), reason('Go'), pr.status === 'Active'));
  });

  /* ================= E. Seeded programmes, roles, retired, suspended ================= */
  await T('CB11-E seeded and lifecycle', async () => {
    fresh(); SA(); const L3D = cbPr('NV-L3D'); rv('NV-L3D');
    ok('CB11-E seeded Draft NV-L3D: the structure blockers (U310 LO2, U311 LO1), the observation answer, and "no payment terms in force" (Section 5)', /U310 LO2/.test(main()) && /U311 LO1/.test(main()) && blockers(L3D).some(x => x.sec === 'payments' && /no payment terms are in force/.test(x.msg)) && blockers(L3D).some(x => x.sec === 'details'));
    ['U310 LO2', 'U311 LO1'].forEach(x => { const [u, lo] = x.split(' '); INP.loType({ value: 'Knowledge', dataset: { p: 'NV-L3D', u, lo } }); reason('Typed'); });
    ACT.n5Settings({ dataset: { p: 'NV-L3D' } }); radio('n5-req', 'no'); press();
    const a0 = ADMIN.audit.length; ACT.kPubProg({ dataset: { id: 'NV-L3D' } });
    ok('CB11-E (negative) with only the payment terms missing, kPubProg refuses (logged) — Finance approval is needed first', L3D.status === 'Draft' && /Finance approval is needed first/.test(mroot().textContent) && blocked(a0, /no payment terms/)); closeModal();
    FA(); ACT.s4PlanEdit({ dataset: { p: 'NV-L3D' } }); if (MODAL) { const f = document.querySelector('#modal-root #pp-f'); if (f && !f.value) f.value = '2600'; reason('Plan for the 2027 update'); }
    SA(); ok('CB11-E once Finance sets a plan in force, the seeded Draft publishes', !!s4PlanCur('NV-L3D') && !blockers(L3D).length && (ACT.cbPublish({ dataset: { id: 'NV-L3D' } }), reason('Ready'), L3D.status === 'Active'), J(blockers(L3D).map(x => x.msg)));
    rv('NV-L3'); ok('CB11-E published seeded NV-L3: nothing to publish; "Create new version" (newProgVersion)', /Version \d is published/.test(q('.cb-rv-state').textContent) && !!q('[data-act="newProgVersion"]') && !q('[data-act="cbPublish"]'));
    rv('NV-L3O'); ok('CB11-E retired NV-L3O: a read-only summary, no publish or new-version button', /Retired — a read-only historical record/.test(q('.cb-rv-state').textContent) && !q('[data-act="cbPublish"]') && !q('[data-act="newProgVersion"]') && qa('.cb-rv-sec').length === 6);
    const a1 = ADMIN.audit.length; ACT.cbPublish({ dataset: { id: 'NV-L3O' } }); ok('CB11-E (negative) cbPublish on a retired programme: refused, logged', cbPr('NV-L3O').status === 'Retired' && blocked(a1, /retired/));
    rv('NV-L4'); ok('CB11-E suspended NV-L4: summary shown, "(programme Suspended)", status unchanged', /programme Suspended/.test(q('.cb-rv-state').textContent) && cbPr('NV-L4').status === 'Suspended');
    BA(); go('a-programmes', { id: 'NV-N1', tab: 'review' }); const a2 = ADMIN.audit.length; ACT.cbPublish({ dataset: { id: 'NV-N1' } });
    ok('CB11-E (negative) a Business Admin calling Publish directly is refused (the existing permission), NV-N1 stays Draft', cbPr('NV-N1').status === 'Draft' && blocked(a2));
  });

  await T('CB11-F responsive', async () => {
    fresh(); SA(); rv('NV-N1'); const w = document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth + 1;
    ok('CB11-F the review fits the page without sideways scrolling', w && !!q('.cb-rv-secs'));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
