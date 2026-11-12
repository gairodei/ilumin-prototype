// FB1 — Fees & Payment Plans simplification, batch 1 (10 Nov 2026; PD-FB1-* in PROVISIONAL-DECISIONS.md). Legacy fixture.
// Step 5 without "Dated examples from", the pricing-method line and the programme deposit editor; an explicit Allow Deposit Yes / No on
// every fee option created from now on (unanswered blocks submission and approval; No is never inherited); options from before keep
// inheriting; previews labelled illustrative; Finance approval, a real publish and sign-up (deposit offered, not offered, under 28 days);
// pinned schedules and signed letters unchanged by a later package; approved packages and legacy programmes untouched; new-course page.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FB1 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const as = av => () => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const J = o => JSON.stringify(o);
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  let n0 = 0;
  // A Level 3 course made through the builder, as an administrator would (Self-Paced £1,800 and Fully Assisted £2,600)
  const make = (o = {}) => {
    (o.who || SA)(); go('a-programmes'); ACT.chProgNew(); const n = ++n0;
    fill({ '#np-t': 'FB1 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (7700 + n) + '/2', '#cbc3-dd-n': '12', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    const box = document.querySelector(o.obs ? 'main #cbr2-obs-yes' : 'main #cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box);
    [{ l: 'Fully Assisted — standard', f: 2600, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = ACT.cbDetCreate(); closeModal(); return pr;
  };
  const curr = pr => { const id = pr.id;
    add8('ch8AddUnit', { id }, { '#u-c': 'U91', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/652/9101' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain values', '#c-e': 'Written account' });
  };
  const opt = (pr, m) => cb8Work(pr).opts.find(o => o.status === 'Active' && o.mode === m);
  const card = oid => q(`.cbr2-opt[data-o="${oid}"]`);
  // a snapshot of every approved package and plan version at boot (the seeded data): nothing in FB1 may change them
  const allPlans = () => J(s3Progs().map(p => [p.id, s4Plans(p.id).map(v => [v.v, v.status, v.fee, v.deposit, v.depOff, v.pkg || null])]));
  const boot = allPlans(), askAtBoot = J(FB1().ask);

  /* ================= A. Step 5 without the redundant controls ================= */
  let pr = null, id = null;
  await T('FB1-A Step 5', async () => {
    ok('FB1-A0 no seeded fee option is marked as new (nothing migrated at boot)', askAtBoot === '{}');
    pr = make(); id = pr && pr.id; step(id, 'payments');
    ok('FB1-A1 no "Dated examples from" selector, no pricing-method line and no programme deposit editor in Step 5', !!q('.cbr2-fees') && !q('.cbr2-fees .cb8-sample') && !/Dated examples from/.test(q('.cbr2-fees').textContent) && !q('.cbr2-pm') && !/Pricing method/.test(main()) && !q('.cbr2-pdep') && !q('input[name="e1-wdm"]') && !/Programme deposit setting/.test(main()));
    ok('FB1-A2 kept: the status banner, the Course Duration (FB2, PD-FB2-03: read-only — was the Payment Schedule Duration control), cards grouped by learner type, Before submitting and the financial history', !!q('.cbr2-fees .cb8-state') && !!q('.fb2-cdur') && !q('#cbc3-pd-n') && qa('.cbr2-fg[data-lt]').length === 2 && qa('.cbr2-opt').length === 2 && !!q('.cb8-submit') && !!q('.cbr-fhist'));
  });

  /* ================= B. New fee options: Allow Deposit not answered ================= */
  await T('FB1-B unanswered', async () => {
    SA(); step(id, 'payments'); const fa = opt(pr, 'Fully Assisted'), sp = opt(pr, 'Self-Paced');
    ok('FB1-B1 both fee options created with the course are new: Allow Deposit not answered', fb1Ask(fa) && fb1Ask(sp) && !fa.dep && !sp.dep && J(FB1().ask[fa.id] && FB1().ask[fa.id].how) === '"created with the course"');
    ok('FB1-B2 the card shows Yes / No with neither chosen and "Not answered"; no deposit amount fields', [fa, sp].every(o => card(o.id).querySelector('.fb1-dep').dataset.ans === 'none' && card(o.id).querySelectorAll('.fb1-yn input[type="radio"]').length === 2 && ![...card(o.id).querySelectorAll('.fb1-yn input')].some(x => x.checked) && /Not answered/.test(card(o.id).querySelector('.fb1-dep').textContent) && !card(o.id).querySelector('.cbr2-depf')));
    ok('FB1-B3 Before submitting lists the choice for each option', qa('.cb8-submit .cb8-blk li').filter(li => /choose Allow Deposit — Yes or No/.test(li.textContent)).length === 2);
    [fa, sp].forEach(o => ['1', '3', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: o.id, k } })));
    ACA(); const q0 = ADMIN.queue.length; ACT.cb8Submit({ dataset: { p: id } }); closeModal();
    ok('FB1-B4 an Academic Admin can\'t submit while a choice is unanswered (nothing sent to Finance)', ADMIN.queue.length === q0 && !(cb8Wf(pr) && cb8Wf(pr).qid) && /choose Allow Deposit/.test(lastToast), lastToast);
    SA(); ACT.cb8SaApprove({ dataset: { p: id } }); const appr = !!MODAL; closeModal();
    ok('FB1-B5 nor can the Super Administrator approve their own package', !appr && !cb8Cur(id) && /choose Allow Deposit/.test(lastToast), lastToast);
    ok('FB1-B6 an unanswered option is never treated as No: no deposit setting recorded for it', !cb8Work(pr).opts.find(o => o.id === fa.id).dep && !cb8Work(pr).opts.find(o => o.id === sp.id).dep);
  });

  /* ================= C. Answering with the real controls and the handlers ================= */
  let fa = null, sp = null, ex = null;
  await T('FB1-C answers', async () => {
    SA(); step(id, 'payments'); fa = opt(pr, 'Fully Assisted'); sp = opt(pr, 'Self-Paced');
    click(card(fa.id).querySelector('.fb1-yn input[data-k="no"]'), 'No'); step(id, 'payments');
    ok('FB1-C1 No (clicked): an explicit "no deposit" setting, shown as No with no amount fields', J(cb8Work(pr).opts.find(o => o.id === fa.id).dep) === J({ mode: 'none', amount: null }) && card(fa.id).querySelector('.fb1-dep').dataset.ans === 'no' && card(fa.id).querySelector('.fb1-yn input[data-k="no"]').checked && !card(fa.id).querySelector('.cbr2-depf') && !fb1Ask(cb8Work(pr).opts.find(o => o.id === fa.id)));
    click(card(sp.id).querySelector('.fb1-yn input[data-k="allow"]'), 'Yes'); step(id, 'payments');
    ok('FB1-C2 Yes (clicked): starts from the Academy default, with the amount choice and the 28-day statement', J(cb8Work(pr).opts.find(o => o.id === sp.id).dep) === J({ mode: 'default', amount: null }) && card(sp.id).querySelector('.fb1-dep').dataset.ans === 'yes' && !!card(sp.id).querySelector('.cbr2-depf input[data-k="default"]:checked') && /28 days or more/.test(card(sp.id).querySelector('.cbr2-depf').textContent) && /Balance after the deposit: £1,500\.00/.test(card(sp.id).querySelector('.cbr2-depf').textContent));
    click(card(sp.id).querySelector('.cbr2-depf input[data-k="own"]'), 'Custom amount'); step(id, 'payments');
    const amt = card(sp.id).querySelector('.cbr2-depf input[data-k="amount"]'); amt.value = '1800'; amt.dispatchEvent(new Event('change', { bubbles: true }));
    ok('FB1-C3 a custom deposit not below the fee is refused (existing rule), and the reason stays on screen', cb8Work(pr).opts.find(o => o.id === sp.id).dep.amount == null && /The deposit must be below the fee \(£1,800\.00\)/.test(card(sp.id).querySelector('.cbr2-depf').textContent) && card(sp.id).querySelector('.cbr2-depf input[data-k="amount"]').getAttribute('aria-invalid') === 'true');
    amt.value = '12.345'; amt.dispatchEvent(new Event('change', { bubbles: true }));
    ok('FB1-C3a a deposit with more than two decimal places is refused with its message (not cleared by the as-you-type check)', cb8Work(pr).opts.find(o => o.id === sp.id).dep.amount == null && /Enter a deposit above £0, in whole pence/.test(card(sp.id).querySelector('.cbr2-depf').textContent));
    const fee0 = card(sp.id).querySelector('input[data-f="fee"]'); fee0.value = '0'; fee0.dispatchEvent(new Event('change', { bubbles: true }));
    ok('FB1-C3b a tuition fee of £0 is refused with the fee rule\'s own message', cb8Work(pr).opts.find(o => o.id === sp.id).fee === 1800 && /Enter a fee from £0\.01/.test(card(sp.id).textContent));
    step(id, 'payments'); const amt2 = card(sp.id).querySelector('.cbr2-depf input[data-k="amount"]'); amt2.value = '250'; amt2.dispatchEvent(new Event('change', { bubbles: true })); step(id, 'payments');
    ok('FB1-C4 Custom amount £250 (typed): saved on the option; the balance stated', J(cb8Work(pr).opts.find(o => o.id === sp.id).dep) === J({ mode: 'own', amount: 250 }) && /Balance after the deposit: £1,550\.00/.test(card(sp.id).querySelector('.cbr2-depf').textContent));
    // Add Fee Option in Step 5: new, so unanswered too
    ACT.cb8Opt({ dataset: { p: id, o: '', mode: 'Self-Paced' } }); fill({ '#c8-l': 'Self-Paced — employer funded', '#c8-f': '1500' }); document.querySelector('#modal-root #c8-m').value = 'Self-Paced'; press();
    ex = cb8Work(pr).opts.find(o => o.label === 'Self-Paced — employer funded'); ['1', '4'].forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: ex.id, k } })); step(id, 'payments');
    ok('FB1-C5 a fee option added in Step 5 is new: not answered, and it blocks submission', !!ex && fb1Ask(ex) && FB1().ask[ex.id].how === 'added in Fees & Payment Plans' && card(ex.id).querySelector('.fb1-dep').dataset.ans === 'none' && cb8Issues(pr, cb8Work(pr)).some(x => x.o === ex.id && /Allow Deposit/.test(x.msg)));
    INP.cbr2Dep({ dataset: { p: id, o: ex.id, k: 'no' } });
    ok('FB1-C6 the handler takes No directly too; no blocker remains', J(cb8Work(pr).opts.find(o => o.id === ex.id).dep) === J({ mode: 'none', amount: null }) && !cb8Issues(pr, cb8Work(pr)).length, J(cb8Issues(pr, cb8Work(pr))));
    const a0 = ADMIN.audit.length; FA(); INP.cbr2Dep({ dataset: { p: id, o: fa.id, k: 'allow' }, checked: true }); SA();
    ok('FB1-C7 Finance can\'t answer or change a deposit here (refused in the handler, logged)', cb8Work(pr).opts.find(o => o.id === fa.id).dep.mode === 'none' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => /^Blocked/.test(x.action)));
    ok('FB1-C8 several instalment options per fee option are kept', J(cb8Work(pr).opts.find(o => o.id === sp.id).pay.map(x => x.k)) === '[1,3,6]' && J(cb8Work(pr).opts.find(o => o.id === ex.id).pay.map(x => x.k)) === '[1,4]');
    ok('FB1-C9 the audit records each answer', ADMIN.audit.filter(x => x.action === 'Fee option deposit changed' && String(x.before).includes('not answered')).length >= 3);
  });

  /* ================= D. Previews ================= */
  await T('FB1-D previews', async () => {
    SA(); step(id, 'payments');
    const sums = qa(`.cbr2-opt[data-o="${sp.id}"] details.cb8-ex > summary`).map(s => s.textContent);
    ok('FB1-D1 due dates without a batch are labelled illustrative (sample batch start) and "not payment dates"', sums.length === 3 && sums.every(s => s === 'Illustrative due dates — sample batch start 1 Feb 2027') && qa(`.cbr2-opt[data-o="${sp.id}"] .fb1-prevnote`).length === 3 && /Not payment dates/.test(q(`.cbr2-opt[data-o="${sp.id}"] .fb1-prevnote`).textContent), J(sums));
    ok('FB1-D2 amounts are unchanged: £1,800 → 3 × £600.00; £2,600 → 5 × £433.33 + £433.35', /3 × £600\.00/.test(card(sp.id).textContent) && /5 × £433\.33 \+ £433\.35/.test(card(fa.id).textContent) && J(e1SchedP(2600, 6)) === J([43333, 43333, 43333, 43333, 43333, 43335]));
    const k = q(`#cb8-k-${sp.id}`); k.value = '4'; INP.cb8KLive(k);
    ok('FB1-D3 the live preview while typing says the dates are illustrative', /Illustrative dates from a sample batch start \(1 Feb 2027\), not payment dates/.test(card(sp.id).querySelector('.cb8-prev').textContent), card(sp.id).querySelector('.cb8-prev').textContent);
    ok('FB1-D4 the deposit preview per instalment option still shows (deposit, then the balance)', /With a deposit: £250\.00 at sign-up/.test(card(sp.id).textContent));
  });

  /* ================= E. Finance approval of explicit settings ================= */
  let qid = null;
  await T('FB1-E Finance', async () => {
    ACA(); step(id, 'payments'); ACT.cb8Submit({ dataset: { p: id } }); const dlg = MODAL ? document.querySelector('#modal-root').textContent : ''; press();
    qid = cb8Wf(pr) && cb8Wf(pr).qid;
    ok('FB1-E1 with every choice made, the Academic Admin submits the package to Finance', !!qid && cb8Wf(pr).status === 'Pending' && /Illustrative due dates — sample batch start/.test(dlg));
    const sub = cb8Wf(pr).sub, o = i => sub.opts.find(x => x.id === i);
    ok('FB1-E2 the submitted package carries each option\'s explicit deposit (frozen)', Object.isFrozen(sub) && J(o(sp.id).dep) === J({ mode: 'own', amount: 250, eff: 250 }) && J(o(fa.id).dep) === J({ mode: 'none', amount: null, eff: null }) && J(o(ex.id).dep) === J({ mode: 'none', amount: null, eff: null }));
    FA(); go('a-queue', { id: qid }); const qd = queueDetail(qid);
    ok('FB1-E3 Finance\'s item shows the package with illustrative dates and each option\'s deposit', /Illustrative due dates — sample batch start/.test(qd) && (qd.match(/Deposit \(this option\)/g) || []).length === 3 && !/Dated example/.test(qd));
    ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); reason('FB1 approve');
    const cur = cb8Cur(id);
    ok('FB1-E4 a Finance Admin approves: a plan version with the package, explicit deposits as submitted', cb8Wf(pr).status === 'Approved' && !!cur && J(cur.opts.find(x => x.id === fa.id).dep) === J({ mode: 'none', amount: null, eff: null }) && cur.opts.find(x => x.id === sp.id).dep.eff === 250);
    ok('FB1-E5 resolver: explicit No stays No although the package deposit is the Academy default', cur.dep.mode === 'default' && cb8DepOf(cur, cur.opts.find(x => x.id === fa.id)).mode === 'none' && cb8DepOf(cur, cur.opts.find(x => x.id === sp.id)).eff === 250);
    SA(); step(id, 'payments');
    ok('FB1-E6 after approval the cards show the answers, no "Not answered"', !/Not answered/.test(q('.cbr2-fees').textContent) && card(fa.id).querySelector('.fb1-dep').dataset.ans === 'no' && card(sp.id).querySelector('.fb1-dep').dataset.ans === 'yes');
    step(id, 'documents'); const lt = q('.cb8-lt'), ptxt = lt ? lt.textContent : '';
    ok('FB1-E7 Offer Letters keeps its payment-wording preview and selector; sample dates are labelled illustrative', !!lt && !!lt.querySelector('.cb8-sample select') && /Illustrative dates from a sample batch start \(1 Feb 2027\); each applicant's letter uses their own batch/.test(ptxt) && /\{\{payment_terms\}\} →/.test(ptxt), ptxt.slice(-300));
  });

  /* ================= F. Publish, sign-up: deposit offered / not offered / under 28 days ================= */
  let w1 = null, pin1 = '', rows1 = '', sig1 = '', plan1 = '', bt = null;
  await T('FB1-F sign-up', async () => {
    SA(); curr(pr); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    ok('FB1-F1 (setup) the course is published', pr.status === 'Active', J(ch8Check(pr).block));
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'FB1B1' }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    bt = ADMIN.batches.find(x => x.code === 'FB1B1'); bt.start = D(40, '09:00'); bt.end = D(400, '17:00');
    const bt2 = { ...bt, code: 'FB1B2', start: D(10, '09:00') }; ADMIN.batches.push(bt2);
    const spc = cb8Cur(id).opts.find(o => o.id === sp.id), fac = cb8Cur(id).opts.find(o => o.id === fa.id);
    const signUp = (v, oid) => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
      const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${oid}"]`); if (r) r.checked = true; prim(); closeModal();
      const w = W; chSetBatch(w, bt); ACT.suNext(); w.docs.forEach(x => { x.status = 'Submitted'; x.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, bt); go('admission'); return w; };
    w1 = signUp('A', spc.id); const vals = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('FB1-F2 Yes (£250 custom), batch 40 days away: the £250 deposit route and the approved options are offered', w1.signup.plan.cb8.opt.id === sp.id && vals.includes('deposit') && ['1', '3', '6'].every(x => vals.includes(x)) && /£250\.00 now/.test(main()) && w1.signup.plan.deposit === 250 && !w1.signup.plan.depOff, J(vals));
    chSetBatch(w1, bt2); render(); const vals2 = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('FB1-F3 the same learner on a batch 10 days away: no deposit (the 28-day rule is unchanged)', !vals2.includes('deposit') && !chDepositOk(bt2) && /28 days or more/.test(main()), J(vals2));
    chSetBatch(w1, bt); render();
    setUi('cb9Pay', '3'); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-FB1'); closeModal();
    const pl = w1.plans.find(p => p.e === 'nvq');
    ok('FB1-F4 3 instalments chosen: £600 now, a pinned schedule of three £600 rows from the batch start', g && g.amount === 600 && pl.rows.length === 3 && pl.rows.every(r => r.amount === 600) && w1.signup.pin.k === 3 && w1.signup.pin.anchor === cbYmdOf(bt.start));
    pin1 = J(w1.signup.pin); rows1 = J(pl.rows); sig1 = J(w1.signup.sig); plan1 = J(w1.signup.plan);
    const w2 = signUp('F', fac.id), vals3 = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('FB1-F5 explicit No, batch 40 days away: no deposit route at all ("No deposit for this programme") — not the Academy default', w2.signup.plan.depOff === true && w2.signup.plan.cb8.dep.mode === 'none' && !vals3.includes('deposit') && /No deposit for this programme/.test(main()), J(vals3));
    SA(); setUi('cb8S:' + id, 'FB1B1'); step(id, 'payments');
    ok('FB1-F6 a preview from a real batch (chosen in Offer Letters) is labelled with that batch, not as illustrative', qa(`.cbr2-opt[data-o="${sp.id}"] details.cb8-ex > summary`).every(s => /^Example due dates — batch FB1B1, starting /.test(s.textContent)) && qa(`.cbr2-opt[data-o="${sp.id}"] details.cb8-ex > summary`).length > 0);
    setUi('cb8S:' + id, '');
  });

  /* ================= G. Later changes never reach pinned learners or signed letters ================= */
  await T('FB1-G pinned terms', async () => {
    SA(); const v0 = s4PlanCur(id).v, pkgV0 = J(s4Plans(id).find(p => p.v === v0).pkg);
    step(id, 'payments'); INP.cbr2Dep({ dataset: { p: id, o: sp.id, k: 'amount' }, value: '200', id: 'x' }); INP.cbr2Dep({ dataset: { p: id, o: fa.id, k: 'allow' }, checked: true });
    ok('FB1-G1 changing an approved option\'s deposit sends the terms back to Draft; the approved version is untouched', cb8Wf(pr).status === 'Draft' && s4PlanCur(id).v === v0 && J(s4Plans(id).find(p => p.v === v0).pkg) === pkgV0);
    ACT.cb8SaApprove({ dataset: { p: id } }); reason('FB1 second version');
    ok('FB1-G2 a new plan version for new learners carries the new deposits', s4PlanCur(id).v === v0 + 1 && cb8Cur(id).opts.find(o => o.id === sp.id).dep.eff === 200 && cb8Cur(id).opts.find(o => o.id === fa.id).dep.mode === 'default');
    const pl = w1.plans.find(p => p.e === 'nvq');
    ok('FB1-G3 the earlier learner\'s pinned schedule, rows and terms are unchanged', J(w1.signup.pin) === pin1 && J(pl.rows) === rows1 && J(w1.signup.plan) === plan1);
    ok('FB1-G4 their signed offer letter (text and payment wording) is unchanged', J(w1.signup.sig) === sig1 && !!w1.signup.sig && Object.isFrozen(w1.signup.sig.snapshot));
  });

  /* ================= H. Fee options from before FB1 keep inheriting ================= */
  // A fee option that really predates FB1: the seeded Level 2 programme NV-N2 (published, terms from before packages, its own £150 deposit).
  // Starting its financial package gives its programme fee as a fee option with no deposit setting of its own — it inherits £150.
  // (Was: a new course's options turned into "pre-FB1" ones by removing their mark — a test-only shortcut, removed.)
  await T('FB1-H inherited', async () => {
    // a package needs the "Observation required" answer, which NV-N2's published version never recorded: a new version answers it (No), as an
    // administrator does; the package is approved for that version and put in force when it is published
    SA(); const p2 = cbPr('NV-N2'), id2 = 'NV-N2', fresh0 = !cb8Managed(p2); ACT.s3WizVersion({ dataset: { id: id2 } }); reason('FB1 version');
    step(id2, 'details'); click(q('#cbr2-obs-no'), 'Observation required — No');
    ACT.cb8Start({ dataset: { p: id2 } });
    // to be published it needs a delivery mode (DM-P): "Use fee options by delivery mode", then the existing option is given Fully Assisted —
    // the same fee option (its ID kept), so it stays an option from before FB1
    const a = cb8Work(p2).opts.find(o => o.status === 'Active'), aid = a && a.id;
    ACT.crFoStart({ dataset: { p: id2 } }); reason('Delivery modes for new intakes');
    ACT.cb8Opt({ dataset: { p: id2, o: aid } }); const m = document.querySelector('#modal-root #c8-m'); if (m) m.value = 'Fully Assisted'; press(); step(id2, 'payments');
    ok('FB1-H0 (setup) NV-N2 had no package; its package starts from its terms in force (custom £150); its fee option keeps its ID and gets a mode', fresh0 && !!a && cb8Work(p2).dep.mode === 'own' && cb8Work(p2).dep.amount === 150 && (cb8Work(p2).opts.find(o => o.id === aid) || {}).mode === 'Fully Assisted');
    ok('FB1-H1 an option from before FB1: inherited, said so on its card (Yes, the programme setting and its amount), not "Not answered"', !!a && !fb1Ask(a) && !a.dep && card(a.id).querySelector('.fb1-dep').dataset.ans === 'inherited' && card(a.id).querySelector('.fb1-yn input[data-k="allow"]').checked && /Inherited — programme setting: Custom deposit £150\.00 \(£150\.00\)/.test(card(a.id).querySelector('.fb1-dep').textContent));
    ok('FB1-H2 no blocker for an inherited choice', !cb8Issues(p2, cb8Work(p2)).some(x => /Allow Deposit/.test(x.msg)), J(cb8Issues(p2, cb8Work(p2))));
    ACT.cb8SaApprove({ dataset: { p: id2 } }); reason('FB1 inherited'); const held = !!(cb8Wf(p2) && cb8Wf(p2).held);
    ACT.cbPublish({ dataset: { id: id2 } }); document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = '2026-12-20T21:59'; }); const pubT = MODAL && MODAL.title, pubR = reason('FB1 version published'); closeModal();
    const cur = cb8Cur(id2);
    ok('FB1-H2b (setup) approved for the new version (held), and put in force when it was published', held && !!cur && !n5DraftV(p2), J([pubT, pubR, lastToast, p2.version, ch8Check(p2).block]));
    ok('FB1-H3 approved unchanged: the option carries no deposit of its own and uses the package deposit (£150)', !!cur && cur.opts.filter(o => o.status === 'Active').every(o => !('dep' in o)) && cur.dep.mode === 'own' && cb8DepOf(cur, cur.opts[0]).eff === 150, J([lastToast, cb8Issues(p2, cb8Work(p2)).map(x => x.msg)]));
    step(id2, 'payments'); step(id2, 'documents'); step(id2, 'review');
    ok('FB1-H4 viewing the steps doesn\'t give an inherited option a setting of its own', cb8Work(p2).opts.every(o => !o.dep) && cb8Wf(p2).status === 'Approved');
    // (H5 — choosing No on an inherited option — is at the end of section O, which continues from this approved inherited package)
    // a package from before CBR-2 / FB1: an option without a setting uses the programme deposit
    const pre = Object.freeze({ dep: { mode: 'own', amount: 120, eff: 120 }, opts: [{ id: 'X-FO-001', fee: 1000, pay: [{ k: 1 }] }] });
    ok('FB1-H6 resolver for an older package: no setting → the package deposit (£120); never "not answered"', cb8DepOf(pre, pre.opts[0]).eff === 120 && !fb1Ask(pre.opts[0]));
  });

  /* ================= I. Legacy programmes and the one-price conversion ================= */
  await T('FB1-I legacy', async () => {
    SA(); const lg = s4PlanProgs().find(p => !cb8Managed(p) && s4PlanCur(p.id) && !cbRetired(p)), before = lg && J(s4Plans(lg.id));
    if (lg) step(lg.id, 'payments');
    ok('FB1-I1 a programme on terms from before packages keeps its own panels (no fee-option deposit control); its plan is unchanged', !!lg && !q('.fb1-dep') && !!q('.cbc3-pdur') && J(s4Plans(lg.id)) === before, lg && lg.id);
    go('a-programmes'); ACT.chProgNew(); fill({ '#np-t': 'FB1 Level 2 one price', '#np-l': 'Level 2', '#np-r': 'QN 600/7799/1', '#cbc3-dd-n': '12', '#np-d': '12', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    const pm = document.querySelector('main #cr-pm-price'); if (pm) { pm.checked = true; INP.crPm(); } fill({ '#np-p': '1200' });
    const box = document.querySelector('main #cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box); const p3 = ACT.cbDetCreate(); closeModal();
    if (p3) step(p3.id, 'payments');
    ok('FB1-I2 a one-price course keeps "Use fee options by delivery mode" in Step 5', !!p3 && !crMultiFee(p3) && !!q('.cr-fo-one [data-act="crFoStart"]') && !q('.cbr2-pm'));
    ok('FB1-I3 its single programme fee is new: Allow Deposit not answered', !!p3 && cb8Work(p3).opts.filter(o => o.status === 'Active').every(o => fb1Ask(o)) && !!q('.fb1-dep[data-ans="none"]'));
  });

  /* ================= J. New-course page ================= */
  await T('FB1-J new course', async () => {
    SA(); go('a-programmes', { id: 'new', tab: 'details' }); const l = document.querySelector('#np-l'); l.value = 'Level 3'; INP.r1NpLevel(l);
    ok('FB1-J1 the fee guidance names Fees & Payment Plans, not the old "Payment Plan step"', /Instalment options and deposits are set in Fees & Payment Plans after the course is saved\./.test((q('.e1-step1-fees') || {}).textContent || '') && !/Payment Plan step/i.test(main()));
    // FB2 (PD-FB2-01) supersedes J2–J4: the duration needed to create the course is the Course Duration; no Payment Schedule Duration on the page
    ok('FB1-J2 (FB2) the inputs needed to create the course are on the page: the Course Duration and the fee-option rows; no Payment Schedule Duration with them', !!q('.cbr2-grid #cbc3-dd-n') && !q('.cbr2-newfees #np-d') && !!q('.cbr2-newfees .r1-np-row'));
    const n = (STORE.chNewProgs || []).length; fill({ '#np-t': 'FB1 no duration', '#np-r': 'QN 610/7798/2', '#cbc3-dd-n': '' });
    const r = document.querySelector('main .r1-np-row'); r.querySelector('.r1-np-l').value = 'Self-Paced — x'; r.querySelector('.r1-np-f').value = '1000'; r.querySelector('.r1-np-m').value = 'Self-Paced';
    const box = document.querySelector('main #cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box); ACT.cbDetCreate(); closeModal();
    ok('FB1-J3 (FB2) no Course Duration, no course', (STORE.chNewProgs || []).length === n);
  });

  /* ================= L. Publishing needs the answers (Super Administrator's own terms, D8) ================= */
  await T('FB1-L publish', async () => {
    const p5 = make(); const id5 = p5.id; SA(); curr(p5); ACT.chLetterUp({ dataset: { id: id5 } }); ACT.chLetterSample(); reason('First version');
    cb8Work(p5).opts.filter(o => o.status === 'Active').forEach(o => ACT.cb8PayAdd({ dataset: { p: id5, o: o.id, k: '6' } }));
    const st0 = (cb8Wf(p5) || {}).status, blk = ch8Check(p5).block;
    ok('FB1-L1 the Super Administrator\'s own terms (approved at creation, D8) can\'t be published while a fee option\'s Allow Deposit is unanswered', st0 === 'Approved' && blk.filter(m => /^Payment terms \(Fees & Payments\): .*: choose Allow Deposit — Yes or No\.$/.test(m)).length === 2 && (ACT.ch8Publish({ dataset: { id: id5 } }), reason('Try'), closeModal(), p5.status === 'Draft'), `${st0} · ${J(blk)}`);
    step(id5, 'payments'); qa('.cbr2-opt').forEach(c => { const o = cb8Work(p5).opts.find(x => x.id === c.dataset.o); if (o && fb1Ask(o)) click(q(`.cbr2-opt[data-o="${o.id}"] .fb1-yn input[data-k="no"]`), 'No'); });
    ACT.cb8SaApprove({ dataset: { p: id5 } }); reason('Own terms, deposits answered');
    ACT.ch8Publish({ dataset: { id: id5 } }); reason('Ready'); closeModal();
    ok('FB1-L2 answered (No) and approved by the Super Administrator (D8): the course publishes, with the explicit No in force', p5.status === 'Active' && cb8Cur(id5).opts.filter(o => o.status === 'Active').every(o => o.dep && o.dep.mode === 'none'), J(ch8Check(p5).block));
  });

  /* ================= M. Retired fee options can't be changed (PD-FB1-07): direct calls, stale controls and a stale dialog ================= */
  await T('FB1-M retired', async () => {
    const pm = make(); const idm = pm.id; SA(); const fa = opt(pm, 'Fully Assisted'), sp = opt(pm, 'Self-Paced');
    ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: idm, o: fa.id, k } })); ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: idm, o: sp.id, k } }));
    step(idm, 'payments'); const staleYes = card(fa.id).querySelector('.fb1-yn input[data-k="allow"]'), staleNo = card(fa.id).querySelector('.fb1-yn input[data-k="no"]'), staleFee = card(fa.id).querySelector('input[data-f="fee"]');
    ACT.cb8Opt({ dataset: { p: idm, o: fa.id } }); const dlg = MODAL; closeModal(); // the Edit fee option dialog, opened before the option is retired
    ACT.cb8OptRetire({ dataset: { p: idm, o: fa.id } }); reason('Retire before answering');
    const t0 = () => cb8Work(pm).opts.find(o => o.id === fa.id), snap = () => J([t0().dep || null, t0().fee, t0().label, t0().pay.map(x => x.k)]), s0 = snap();
    ok('FB1-M0 (setup) the option is retired with its deposit choice still unanswered', t0().status === 'Retired' && !t0().dep && fb1Ask(t0()));
    const a0 = ADMIN.audit.length, blk = what => ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => x.action === 'Blocked: ' + what && /retired/i.test(x.reason)).length;
    INP.cbr2Dep({ dataset: { p: idm, o: fa.id, k: 'allow' }, checked: true }); INP.cbr2Dep({ dataset: { p: idm, o: fa.id, k: 'no' } });
    ok('FB1-M1 Yes and No by direct call are refused and logged; no deposit is written to the retired option', snap() === s0 && blk('change a fee option deposit') === 2 && /retired/.test(lastToast));
    staleYes.checked = true; INP.cbr2Dep(staleYes); staleNo.checked = true; INP.cbr2Dep(staleNo); staleFee.value = '999'; INP.cbr2OptF(staleFee);
    ok('FB1-M2 the card\'s controls rendered before the retirement (stale screen): Yes, No and the fee are refused and logged', snap() === s0 && blk('change a fee option deposit') === 4 && blk('edit a fee option') === 1);
    INP.cbr2K({ dataset: { p: idm, o: fa.id, k: 6 }, value: '3', id: 'fb1-k' }); ACT.cb8PayAdd({ dataset: { p: idm, o: fa.id, k: '2' } }); ACT.cb8PayDel({ dataset: { p: idm, o: fa.id, k: '6' } });
    ok('FB1-M3 payment options of the retired option can\'t be changed, added or removed (each refused and logged)', snap() === s0 && blk('change a payment option') === 1 && blk('add a payment option') === 1 && blk('remove a payment option') === 1);
    openModal(dlg); const fl = document.querySelector('#modal-root #c8-l'); if (fl) fl.value = 'Renamed after retirement'; const r = prim(); closeModal();
    ok('FB1-M4 the Edit dialog opened before the retirement can\'t save onto it (refused, logged; nothing changed)', r === false && snap() === s0 && blk('edit a fee option') === 2);
    FA(); const a1 = ADMIN.audit.length; INP.cbr2Dep({ dataset: { p: idm, o: fa.id, k: 'allow' }, checked: true }); SA();
    ok('FB1-M5 Finance gets the role refusal (logged), as before', snap() === s0 && ADMIN.audit.slice(0, ADMIN.audit.length - a1).some(x => /^Blocked/.test(x.action)));
    INP.cbr2Dep({ dataset: { p: idm, o: sp.id, k: 'allow' }, checked: true }); ACT.cb8SaApprove({ dataset: { p: idm } }); reason('Terms');
    const fz = cb8Cur(idm) && cb8Cur(idm).opts.find(o => o.id === fa.id);
    ok('FB1-M6 the package approves with the active option answered; the retired option is frozen as retired, with no deposit and its payment options as they were', !!fz && fz.status === 'Retired' && !('dep' in fz) && J(fz.pay) === '[]' && !fb1Ask(cb8Cur(idm).opts.find(o => o.id === sp.id)));
  });

  /* ================= N. The Finance queue and the terms in force take only a complete package (PD-FB1-08) ================= */
  await T('FB1-N queue boundary', async () => {
    const pn = make(); const idn = pn.id; cb8Work(pn).opts.forEach(o => ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: idn, o: o.id, k } })));
    const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
    ACA(); let q0 = ADMIN.queue.length, a0 = ADMIN.audit.length; const r1 = cb8SubmitNow(pn);
    ok('FB1-N1 a direct call to the queue-item function with an unanswered option is refused and logged; no queue item', r1 === false && ADMIN.queue.length === q0 && since(a0).some(x => x.action === 'Blocked: submit payment terms' && /Incomplete package: .*choose Allow Deposit/.test(x.reason)));
    FA(); a0 = ADMIN.audit.length; cb8SubmitNow(pn); SA();
    ok('FB1-N2 …and from Finance it is refused for the role (logged)', ADMIN.queue.length === q0 && since(a0).some(x => x.action === 'Blocked: submit payment terms' && /Role/.test(x.reason)));
    const v0 = s4Plans(idn).length; a0 = ADMIN.audit.length; const why = cb8Apply(pn, cb8Freeze(pn, cb8Work(pn)), { by: 'Direct call', how: 'direct', r: 'test' });
    ok('FB1-N3 a direct call that would put an incomplete package in force is refused (no plan version, nothing in force)', /choose Allow Deposit/.test(why) && s4Plans(idn).length === v0 && !cb8Cur(idn) && since(a0).some(x => x.action === 'Blocked: put payment terms in force'));
    ACA(); cb8Work(pn).opts.filter(o => fb1Ask(o)).forEach(o => INP.cbr2Dep({ dataset: { p: idn, o: o.id, k: 'allow' }, checked: true }));
    q0 = ADMIN.queue.length; cb8SubmitNow(pn); const qid = cb8Wf(pn).qid;
    ok('FB1-N4 once complete, the same call queues it once for Finance (Pending)', ADMIN.queue.length === q0 + 1 && cb8Wf(pn).status === 'Pending' && !!qid);
    cb8SubmitNow(pn); ok('FB1-N5 a second call while it waits is refused — no duplicate queue item', ADMIN.queue.length === q0 + 1 && /already waiting/.test(lastToast));
    FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); reason('Checked');
    ok('FB1-N6 Finance approves it through the existing path', cb8Wf(pn).status === 'Approved' && !!cb8Cur(idn)); SA();
  });

  /* ================= K. Records at boot untouched ================= */
  await T('FB1-K records', async () => {
    const untouched = p => !/^FB1 /.test(p.title) && p.id !== 'NV-N2'; // NV-N2's package is approved on purpose in H (a new version; its earlier versions are checked below)
    const now_ = J(s3Progs().filter(untouched).map(p => [p.id, s4Plans(p.id).map(v => [v.v, v.status, v.fee, v.deposit, v.depOff, v.pkg || null])]));
    const was = J(JSON.parse(boot).filter(([pid]) => { const p = cbPr(pid); return !p || untouched(p); }));
    const n2b = JSON.parse(boot).find(([pid]) => pid === 'NV-N2'), n2v = n2b ? n2b[1].map(v => J([v[0], v[2], v[3], v[4], v[5]])) : [];
    ok('FB1-K1 every seeded programme\'s plan versions and packages are exactly as at boot (NV-N2: its earlier versions unchanged, one new version added in H)', now_ === was && !!n2b && J(s4Plans('NV-N2').slice(0, n2v.length).map(v => J([v.v, v.fee, v.deposit, v.depOff, v.pkg || null]))) === J(n2v) && s4Plans('NV-N2').length === n2v.length + 1);
    ok('FB1-K2 only options created during this run were marked as new', Object.values(FB1().ask).every(x => /^FB1 /.test((cbPr(x.pid) || {}).title || '')));
  });

  /* ================= O. One deposit amount (PD-FB1-09, PD-FB1-10): an approved inherited Academy-default deposit when the default changes =================
     NV-N2's fee option predates FB1 and inherits the programme setting (section H). Its programme setting becomes the Academy default (the setting
     function the removed editor used) and is approved at £300; then the Academy default changes to £350. (These run after K: they change the default.) */
  let REG_N = 0;
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const inpAmt = (pid, oid, v) => INP.cbr2Dep({ dataset: { p: pid, o: oid, k: 'amount' }, value: v, id: 'fb1-amt' });
  const $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const submitF = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const register = (name, email) => { closeModal(); if (S.signedIn) ACT.logout(); click($1('#app [data-act="regStart"]'), 'Create account');
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 966' + String(100 + REG_N++), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submitF('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submitF('form[data-submit="regCode"]'); click($1('#app [data-act="finishWelcome"]'), 'Welcome'); return W; };
  let n2 = null, b2 = null;
  const toPay2 = w => { go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === n2.title); ACT.applyNvq({ dataset: { id: c.id } }); const dlg = (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' '); press();
    chSetBatch(w, b2); go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'), 'Next');
    w.docs.forEach(x => { x.status = 'Submitted'; x.file = 'doc.pdf'; }); render(); click($1('main [data-act="suNext"]'), 'Next'); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign'), 'Sign'); chSetBatch(w, b2); go('admission'); return dlg; };
  const depShown = () => { const m = /Deposit \(holds your seat\) — (£[\d,.]+) now/.exec(main()); return m ? m[1] : null; };
  const payWith = (w, c, method = 'card') => { setUi('cb9Pay', c); setUi('suMethod', method); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-FB1O'); closeModal(); return g; };
  await T('FB1-O inherited default after a default change', async () => {
    SA(); n2 = cbPr('NV-N2');
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'FB1N2' }); const co = document.querySelector('#nb-co'); co.value = n2.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    b2 = ADMIN.batches.find(x => x.code === 'FB1N2'); if (b2) { b2.start = D(45, '09:00'); b2.end = D(240, '17:00'); }
    cb8DepApply(n2, { mode: 'default', amount: null }); ACT.cb8SaApprove({ dataset: { p: 'NV-N2' } }); reason('Programme setting: the Academy default');
    const cur = cb8Cur('NV-N2'), a = cur.opts.find(o => o.status === 'Active');
    ok('FB1-O0 (setup) NV-N2 approved: its fee option inherits the package deposit, the Academy default £300', !!b2 && !('dep' in a) && cur.dep.mode === 'default' && cur.dep.eff === 300 && cb8Wf(n2).status === 'Approved');
    // before the change: one amount everywhere
    const w1 = register('Olu Before', 'olu.before@test.example'); const d1 = toPay2(w1);
    ok('FB1-O1 before the change: the sign-up dialog, the payment step, the learner\'s terms and the letter all say £300', /Deposit £300\.00/.test(d1) && depShown() === '£300.00' && w1.signup.plan.deposit === 300 && cb9Pin(w1).dep.eff === 300 && /a deposit of £300\.00/.test(w1.signup.sig.snapshot.pay || ''), J([depShown(), w1.signup.plan.deposit, w1.signup.sig.snapshot.pay]));
    const vN = s4Plans('NV-N2').length, vL3 = s4Plans('NV-L3').length;
    FA(); ACT.s4CfgEdit(); fill({ '#cf-d': '350', '#cf-h': '28' }); reason('Academy default £350');
    ok('FB1-O2 the default change: no "same terms" plan version for the package programme (a legacy programme on the default still gets one, E2)', S4().cfg.deposit === 350 && s4Plans('NV-N2').length === vN && s4Plans('NV-L3').length === vL3 + 1);
    ok('FB1-O3 …the package\'s approval is withdrawn (Draft; the approved version stays in force), recorded and audited', cb8Wf(n2).status === 'Draft' && cb8Cur('NV-N2') === cur && ADMIN.audit.some(x => x.action === 'Payment terms need Finance approval again' && x.entity.includes('NV-N2') && /£300\.00 to £350\.00/.test(x.reason)));
    // the learner who started before the change keeps the £300 shown, accepted and signed — and that is what is charged
    learner(w1.v); go('admission'); const s1 = depShown(), g1 = payWith(w1, 'deposit');
    ok('FB1-O4 a sign-up started before the change: shown £300 and charged £300 (pinned, as signed)', s1 === '£300.00' && !!g1 && g1.amount === 300 && w1.signup.done && w1.admission.deposit.min === 300, J([s1, g1 && g1.amount]));
    // a new sign-up while the approval is stale: the deposit isn't offered, with the reason; paying in full or by instalments works
    const w2 = register('Ola After', 'ola.after@test.example'); const d2 = toPay2(w2), vals = qa('input[name="cb9-pay"]').map(x => x.value);
    ok('FB1-O5 a new sign-up while the approved deposit is stale: no deposit route (also not "deposit, then payments"), with the reason and what to do', !vals.some(v => v === 'deposit' || /^dep\d+$/.test(v)) && vals.length > 0 && /Deposit not available right now/.test(main()) && /£300\.00 approved, £350\.00 now/.test(main()) && /contact the Academy/.test(main()), J(vals));
    ok('FB1-O6 …its terms record the approved £300 and why the deposit is held back; the dialog and letter don\'t offer a deposit', w2.signup.plan.deposit === 300 && J(w2.signup.plan.depStale) === J({ approved: 300, now: 350 }) && /Deposit: being re-confirmed/.test(d2) && !/deposit/i.test(w2.signup.sig.snapshot.pay || ''), J([w2.signup.plan.depStale, d2.slice(0, 200), w2.signup.sig.snapshot.pay]));
    // a stale "deposit" choice sent straight to Pay (a direct call or stale page state — the page itself no longer offers it)
    const payDirect = c => { setUi('cb9Pay', c); setUi('suMethod', 'card'); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-FB1D'); closeModal(); return g; };
    ok('FB1-O6b the page shows the instalment option chosen in place of the withheld deposit (what is shown is what Pay charges)', !!q('input[name="cb9-pay"]:checked') && /^\d+$/.test(q('input[name="cb9-pay"]:checked').value));
    const a2 = ADMIN.audit.length; let g2 = payDirect('deposit');
    ok('FB1-O7 paying a deposit anyway is refused before checkout (logged); nothing charged', !g2 && !w2.signup.done && ADMIN.audit.slice(0, ADMIN.audit.length - a2).some(x => x.action === 'Blocked: deposit payment' && /stale/i.test(x.reason)), J([g2 && g2.amount, w2.signup.done, ADMIN.audit.slice(0, 3).map(x => [x.action, x.reason])]));
    g2 = payDirect('dep6'); ok('FB1-O7b …and "Deposit, then 6 payments" too', !g2 && !w2.signup.done);
    const a3 = ADMIN.audit.length; chComplete(w2, { opt: 'deposit', method: 'bank', amount: 350, ref: 'FORCED' }, false, true);
    ok('FB1-O8 a direct completion with a deposit is refused too (the last line of defence)', !w2.signup.done && ADMIN.audit.slice(0, ADMIN.audit.length - a3).some(x => x.action === 'Blocked: deposit payment'), J([w2.signup.done, ADMIN.audit.slice(0, 3).map(x => [x.action, x.reason])]));
    const k = String(cb9Pin(w2).opt.pay.map(x => x.k).find(x => x > 1)); g2 = payWith(w2, k);
    ok('FB1-O9 paying by instalments works and charges the approved instalment', !!g2 && w2.signup.done && !w2.plans.find(p => p.e === 'nvq').deposit, J([k, g2 && g2.amount, w2.signup.done, lastToast]));
    // a historical record from before this correction: two amounts in the learner's own terms (the old code put the live default in the plan terms)
    const w3 = register('Hal History', 'hal.history@test.example'); toPay2(w3); w3.signup.plan = Object.freeze({ ...w3.signup.plan, deposit: 350, depStale: undefined }); render(); // test fixture: the record the old code wrote
    const vals3 = qa('input[name="cb9-pay"]').map(x => x.value), txt3 = main(), a4 = ADMIN.audit.length, g3 = payDirect('deposit');
    ok('FB1-O10 historical terms whose amounts disagree (£300 shown, £350 in the terms): not rewritten; the deposit is refused (logged) with a message; nothing charged', w3.signup.plan.deposit === 350 && !vals3.includes('deposit') && /needs to be confirmed by the Academy's Finance team/.test(txt3) && !g3 && !w3.signup.done && ADMIN.audit.slice(0, ADMIN.audit.length - a4).some(x => x.action === 'Blocked: deposit payment' && /disagree/.test(x.reason)), J([w3.signup.plan.deposit, vals3, !!g3, /needs to be confirmed/.test(main()), ADMIN.audit.slice(0, 2).map(x => [x.action, x.reason])]));
    // Finance re-approval (here the Super Administrator's own terms, D8): new sign-ups see and pay £350
    SA(); go('a-programmes', { id: 'NV-N2', tab: 'fees' }); ACT.cb8SaApprove({ dataset: { p: 'NV-N2' } }); reason('Approved at the new default');
    ok('FB1-O11 the terms approved again: the package deposit is now £350 (a new plan version)', cb8Wf(n2).status === 'Approved' && cb8Cur('NV-N2').dep.eff === 350 && s4Plans('NV-N2').length === vN + 1);
    const w4 = register('Ana Approved', 'ana.approved@test.example'); toPay2(w4); const s4 = depShown(), g4 = payWith(w4, 'deposit');
    ok('FB1-O12 after re-approval a new sign-up is shown £350 and charged £350; the earlier learners are unchanged', s4 === '£350.00' && !!g4 && g4.amount === 350 && w1.admission.deposit.min === 300 && cb9Pin(w1).dep.eff === 300 && w1.plans.find(p => p.e === 'nvq').deposit.amount === 300, J([s4, g4 && g4.amount, w1.admission.deposit.min, cb9Pin(w1).dep.eff, (w1.plans.find(p => p.e === 'nvq') || {}).deposit]));
    // H5: choosing No on an inherited option gives it its own explicit No (and needs approval again)
    SA(); step('NV-N2', 'payments'); click(card(a.id).querySelector('.fb1-yn input[data-k="no"]'), 'No');
    ok('FB1-H5 choosing No on an inherited option gives it its own explicit No (and needs approval again)', J(cb8Work(n2).opts.find(o => o.id === a.id).dep) === J({ mode: 'none', amount: null }) && cb8Wf(n2).status === 'Draft');
  });

  /* ================= P. Packages that don't use the Academy default are untouched by a change to it (PD-FB1-10) ================= */
  await T('FB1-P unused default', async () => {
    const pq = make(); const idq = pq.id; SA(); const fa = opt(pq, 'Fully Assisted'), sp = opt(pq, 'Self-Paced');
    [fa, sp].forEach(o => ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: idq, o: o.id, k } })));
    INP.cbr2Dep({ dataset: { p: idq, o: fa.id, k: 'no' } }); INP.cbr2Dep({ dataset: { p: idq, o: sp.id, k: 'own' } }); inpAmt(idq, sp.id, '250');
    ACT.cb8SaApprove({ dataset: { p: idq } }); reason('Mixed: No and £250');
    const pr2 = make(); const idr = pr2.id; const fa2 = opt(pr2, 'Fully Assisted'), sp2 = opt(pr2, 'Self-Paced');
    [fa2, sp2].forEach(o => ['1', '6'].forEach(k => ACT.cb8PayAdd({ dataset: { p: idr, o: o.id, k } })));
    INP.cbr2Dep({ dataset: { p: idr, o: fa2.id, k: 'allow' }, checked: true }); INP.cbr2Dep({ dataset: { p: idr, o: sp2.id, k: 'own' } }); inpAmt(idr, sp2.id, '250');
    ACT.cb8SaApprove({ dataset: { p: idr } }); reason('Mixed: the Academy default and £250');
    const vq = s4Plans(idq).length, vr = s4Plans(idr).length, a0 = ADMIN.audit.length;
    FA(); ACT.s4CfgEdit(); fill({ '#cf-d': '375', '#cf-h': '28' }); reason('Academy default £375'); SA();
    const need = id => ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Payment terms need Finance approval again' && x.entity.includes(id));
    ok('FB1-P1 a package whose options are only No and a custom amount: no new plan version, approval kept', s4Plans(idq).length === vq && cb8Wf(pq).status === 'Approved' && !need(idq));
    ok('FB1-P2 a mixed package with an option on the Academy default: no version, but its approval is withdrawn (to be approved again)', s4Plans(idr).length === vr && cb8Wf(pr2).status === 'Draft' && need(idr));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
