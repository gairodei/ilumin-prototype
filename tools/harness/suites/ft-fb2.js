// FB2 — Payment schedules from the course duration (10 Nov 2026; PD-FB2-* in PROVISIONAL-DECISIONS.md). Legacy fixture.
// One duration for a new course (the Course Duration in Course Details, required); payment amount = fee ÷ count, interval = duration ÷ count
// (calendar-aware, exact pence); no Payment Schedule Duration on the new-course page or in Fees & Payment Plans; FB1 deposits; changes before
// approval, while with Finance and after approval; a published course's new version with another duration (held package, publication gate);
// sign-up (deposit credited to payment 1, a deposit above payment 1 not offered); pinned schedules, signed letters and transfers unchanged;
// programmes from before FB2 keep their Payment Schedule Duration; role and direct-call refusals.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FB2 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); if (!e) throw new Error('missing field ' + k); e.value = v; });
  const as = av => () => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const COO = () => { closeModal(); S.coo.v = 'A'; cooEnter(); S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const J = o => JSON.stringify(o);
  const step = (id, k) => go('a-programmes', { id, tab: k });
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const aud = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const M12 = { n: 12, unit: 'months' };
  // the new-course page, filled as an administrator does: Course Duration (number + unit), Self-Paced £1,200 and Fully Assisted £2,400
  let n0 = 0;
  const open = (who = ACA) => { who(); go('a-programmes'); ACT.chProgNew(); };
  const fillNew = (o = {}) => {
    const n = ++n0; fill({ '#np-t': 'FB2 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (8800 + n) + '/2' }); INP.r1NpLevel(document.querySelector('#np-l'));
    if (o.dur !== undefined) fill({ '#cbc3-dd-n': o.dur, '#cbc3-dd-u': o.unit || 'months' });
    const box = document.querySelector('main #cbr2-obs-no'); box.checked = true; INP.cbr2Obs(box);
    [{ l: 'Self-Paced — FB2', f: 1200, m: 'Self-Paced' }, { l: 'Fully Assisted — FB2', f: 2400, m: 'Fully Assisted' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
  };
  const make = (o = { dur: '12' }) => { open(o.who); fillNew(o); const pr = ACT.cbDetCreate(); closeModal(); return pr; };
  const curr = pr => { const id = pr.id;
    add8('ch8AddUnit', { id }, { '#u-c': 'U92', '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/652/9201' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain values', '#c-e': 'Written account' });
  };
  const opt = (pr, m) => cb8Work(pr).opts.find(o => o.status === 'Active' && o.mode === m);
  const card = oid => q(`.cbr2-opt[data-o="${oid}"]`);
  // exactly these instalment options (any the option started with are removed first, through the Step 5 handlers)
  const ks = (pr, o, list) => { cb8Work(pr).opts.find(x => x.id === o.id).pay.map(x => x.k).forEach(k => ACT.cb8PayDel({ dataset: { p: pr.id, o: o.id, k: String(k) } })); list.forEach(k => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: String(k) } })); };
  const depYes = (pr, o, amt) => { INP.cbr2Dep({ dataset: { p: pr.id, o: o.id, k: 'allow' }, checked: true }); if (amt) { INP.cbr2Dep({ dataset: { p: pr.id, o: o.id, k: 'own' } }); INP.cbr2Dep({ dataset: { p: pr.id, o: o.id, k: 'amount' }, value: String(amt), id: 'x' }); } };
  // the Course Duration control in Course Details (a Draft): the real input, saved at once
  const setDur = (pr, n, unit = 'months') => { step(pr.id, 'details'); const i = q('#cbc3-dd-n'), u = q('#cbc3-dd-u'); if (!i) throw new Error('Course Duration input not rendered'); u.value = unit; i.value = String(n); i.dispatchEvent(new Event('change', { bubbles: true })); };
  const datesOf = s => s.rows.map(r => r.due).join(','), penceOf = s => s.rows.map(r => r.pence);
  const allPlans = () => J(s3Progs().map(p => [p.id, s4Plans(p.id).map(v => [v.v, v.status, v.fee, v.deposit, v.depOff, v.pkg || null])]));
  const legacyState = () => J((STORE.chNewProgs || []).map(p => [p.id, p.durV, p.dur, p.fb2 || null]));
  const boot = allPlans(), bootLegacy = legacyState();

  /* ================= A. The new-course page: one duration ================= */
  await T('FB2-A new course', async () => {
    ok('FB2-A0 no programme at boot is an FB2 programme (nothing migrated)', !(STORE.chNewProgs || []).some(p => p.fb2));
    open(); fillNew({});
    const lab = qa('.cbr2-grid > .field > .lbl, .cbr2-grid > .field > label, .cbr2-grid > fieldset > legend').map(x => x.textContent.trim());
    const pd = q('fieldset.e1-dur'), shown = el => !!el && el.getClientRects().length > 0;
    ok('FB2-A1 Course Duration is the fifth field of Course Details, marked required, with the payment-dates hint', lab[4] === 'Course Duration' && q('#cbc3-dd-n').getAttribute('aria-required') === 'true' && /Instalment dates are spread evenly across it/.test(q('.fb2-cd').textContent), J(lab));
    ok('FB2-A2 no Payment Schedule Duration on the page: not with the starting fees, nowhere visible (its hidden field is kept for the save)', !/Payment Schedule Duration/.test(q('.cb-new').innerText || '') && !q('.cbr2-newfees fieldset.e1-dur') && !!pd && !shown(pd) && !!pd.closest('.cbr2-keep'));
    const c0 = (STORE.chNewProgs || []).length;
    [['', /Enter the Course Duration: instalment dates are spread evenly/], ['0', /from 1 to 60/], ['61', /from 1 to 60/], ['1.5', /whole number from 1 to 60/]].forEach(([v, re]) => {
      { const i = document.querySelector('main #cbc3-dd-n'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } const r = ACT.cbDetCreate(), err = qa('.fb2-cd .err').map(x => x.textContent).join(' | '); // typed, as a person does (the live check clears the previous message)
      ok(`FB2-A3 Course Duration "${v || '(blank)'}" refused with a message; nothing created`, r === false && re.test(err) && (STORE.chNewProgs || []).length === c0, err);
    });
    // the old hidden field can't bring a second duration back: it is set from the Course Duration
    fill({ '#cbc3-dd-n': '12', '#cbc3-dd-u': 'months' }); document.querySelector('main #np-d').value = '7'; document.querySelector('main #np-du').value = 'years';
    const pr = ACT.cbDetCreate(); closeModal();
    ok('FB2-A4 created with Course Duration 12 months: an FB2 programme whose payment basis is 12 months (the altered hidden field ignored)', !!pr && pr.fb2 === true && J(pr.durV) === J(M12) && J(cbcDisp(pr, 1)) === J(M12) && J(cb8Basis(pr).dur) === J(M12), J([pr && pr.durV, pr && cbcDisp(pr, 1)]));
    ok('FB2-A5 Step 5 of the new course: no Payment Schedule Duration control; the Course Duration shown read-only', (step(pr.id, 'payments'), !q('#cbc3-pd-n') && !q('[data-act="cbcPayDur"]') && /Course Duration\s*12 months\s*— set in Course Details/.test(q('.fb2-cdur').textContent) && !/Payment Schedule Duration/.test(q('.cbr2-fees').textContent)));
    // a course in weeks
    const pw = make({ dur: '30', unit: 'weeks' });
    ok('FB2-A6 a course in weeks (30 weeks): its payment basis is 30 weeks', !!pw && J(pw.durV) === J({ n: 30, unit: 'weeks' }) && J(cb8Basis(pw).dur) === J({ n: 30, unit: 'weeks' }));
  });

  /* ================= B. The calculations (examples A and B, uneven intervals, rounding) ================= */
  let pr = null, id = null, sp = null, fa = null;
  await T('FB2-B calculations', async () => {
    pr = make(); id = pr.id; sp = opt(pr, 'Self-Paced'); fa = opt(pr, 'Fully Assisted');
    ks(pr, sp, [6]); ks(pr, fa, [6, 12]);
    const a = '2027-02-01', s6 = cbSched(a, M12, 1200, 6), f6 = cbSched(a, M12, 2400, 6), f12 = cbSched(a, M12, 2400, 12);
    ok('FB2-B1 Example A: £1,200 over 12 months in 6 = six £200 payments, two months apart', J(penceOf(s6)) === J(Array(6).fill(20000)) && datesOf(s6) === '2027-02-01,2027-04-01,2027-06-01,2027-08-01,2027-10-01,2027-12-01' && s6.total === 1200, datesOf(s6));
    ok('FB2-B2 Example B: £2,400 in 6 = six £400 payments, two months apart', J(penceOf(f6)) === J(Array(6).fill(40000)) && datesOf(f6) === datesOf(s6) && f6.total === 2400);
    ok('FB2-B3 Example B: £2,400 in 12 = twelve £200 payments, one month apart', J(penceOf(f12)) === J(Array(12).fill(20000)) && f12.rows.every((r, i) => r.due === cbAddMonths(a, i)) && f12.total === 2400);
    step(id, 'payments'); const pv = oid => qa(`.cbr2-opt[data-o="${oid}"] .fb2-pv`).map(x => x.textContent);
    ok('FB2-B4 Step 5 preview per instalment option: Course Duration ÷ count, the amounts and the spacing', J(pv(sp.id)) === J(['12 months ÷ 6 = 6 × £200.00, every 2 months from batch start']) && J(pv(fa.id)) === J(['12 months ÷ 6 = 6 × £400.00, every 2 months from batch start', '12 months ÷ 12 = 12 × £200.00, every month from batch start']), J([pv(sp.id), pv(fa.id)]));
    ok('FB2-B5 the learner types share the course duration: different fees and counts, one basis', cb8Basis(pr).dur.n === 12 && sp.fee === 1200 && fa.fee === 2400);
    // uneven: the duration's real days split evenly (floor(i·T/k)) — never months taken as 30 days, nothing discarded
    const u5 = cbSched(a, M12, 1200, 5), u7 = cbSched('2028-02-01', M12, 1000, 7), w4 = cbSched(a, { n: 10, unit: 'weeks' }, 1000, 4);
    ok('FB2-B6 12 months in 5 (2027–28: 365 days): every 73 days, all before the course end', datesOf(u5) === '2027-02-01,2027-04-15,2027-06-27,2027-09-08,2027-11-20' && u5.kind === 'days' && u5.T === 365 && u5.rows.every(r => r.due < u5.end), datesOf(u5));
    ok('FB2-B7 12 months in 7 from 1 Feb 2028 (a leap year: 366 days): the calendar\'s own length is split, not 360', u7.T === 366 && u7.rows.map((r, i) => cbDaysBetween('2028-02-01', r.due) === Math.floor(i * 366 / 7)).every(Boolean), datesOf(u7));
    ok('FB2-B8 10 weeks in 4 (70 days): 0, 17, 35, 52 days', w4.rows.map(r => cbDaysBetween(a, r.due)).join() === '0,17,35,52');
    const e31 = cbSched('2027-01-31', M12, 1200, 6);
    ok('FB2-B9 month ends: from 31 Jan every 2 months — 31 Mar, 31 May, 31 Jul, 30 Sep, 30 Nov (each from the start, no drift)', datesOf(e31) === '2027-01-31,2027-03-31,2027-05-31,2027-07-31,2027-09-30,2027-11-30', datesOf(e31));
    ok('FB2-B10 the preview names uneven spacing in days (12 months ÷ 5; 12 months ÷ 8)', fb2PvTxt(M12, 5, 1200) === '12 months ÷ 5 = 5 × £240.00, every 73 days from batch start' && /^12 months ÷ 8 = 8 × £150\.00, every 4[0-9]–4[0-9] days from batch start$/.test(fb2PvTxt(M12, 8, 1200)), fb2PvTxt(M12, 5, 1200) + ' | ' + fb2PvTxt(M12, 8, 1200));
    // currency rounding (E1, unchanged): whole pence, the last payment carries the remainder, the total is exact
    const r3 = cbSched(a, M12, 1000, 3), r7 = cbSched(a, M12, 2400, 7), r12 = cbSched(a, M12, 999.99, 12);
    ok('FB2-B11 £1,000 in 3: £333.33, £333.33, £333.34 (total exact)', J(penceOf(r3)) === J([33333, 33333, 33334]) && r3.total === 1000);
    ok('FB2-B12 £2,400 in 7 and £999.99 in 12: whole pence (each rounded), only the last differs, totals exact', r7.rows.slice(0, 6).every(r => r.pence === 34286) && r7.rows[6].pence === 34284 && r7.total === 2400 && penceOf(r12).reduce((x, y) => x + y, 0) === 99999 && penceOf(r12).slice(0, 11).every(p => p === penceOf(r12)[0]), J([penceOf(r7), penceOf(r12)]));
    ok('FB2-B13 an impossible count is still refused with its reason (3 weeks in 22 payments)', /can't fit|same day/.test(cbOptWhy({ n: 3, unit: 'weeks' }, 22, 2200)), cbOptWhy({ n: 3, unit: 'weeks' }, 22, 2200));
  });

  /* ================= C. Deposits (FB1, unchanged) ================= */
  await T('FB2-C deposits', async () => {
    ACA(); step(id, 'payments');
    INP.cbr2Dep({ dataset: { p: id, o: sp.id, k: 'no' } }); render();
    ok('FB2-C1 Allow Deposit No: no deposit preview on the option', cb8Work(pr).opts.find(o => o.id === sp.id).dep.mode === 'none' && !/With a deposit/.test(card(sp.id).textContent));
    depYes(pr, sp, 100); depYes(pr, fa, 250); step(id, 'payments');
    ok('FB2-C2 Yes £100 against a £200 first instalment: £100 at sign-up, payment 1 becomes £100.00', /With a deposit: £100\.00 at sign-up; payment 1 becomes £100\.00/.test(card(sp.id).textContent), card(sp.id).textContent.slice(-300));
    const t = card(fa.id).textContent;
    ok('FB2-C3 £250 against £400 (6 payments) credits payment 1; against £200 (12 payments) it isn\'t offered', /payment 1 becomes £150\.00/.test(t) && /The £250\.00 deposit is more than payment 1 \(£200\.00\), so it isn't offered with 12 payments/.test(t), t.slice(-400));
    const b0 = J(cb8Work(pr).opts.find(o => o.id === sp.id).dep); INP.cbr2Dep({ dataset: { p: id, o: sp.id, k: 'amount' }, value: '1200', id: 'f2-x' });
    ok('FB2-C4 a deposit at or above the fee is refused (existing rule); the £100 stays', J(cb8Work(pr).opts.find(o => o.id === sp.id).dep) === b0);
  });

  /* ================= D. Course Duration before approval, with Finance, after approval ================= */
  let qid = null;
  await T('FB2-D duration and Finance', async () => {
    ACA(); let a0 = ADMIN.audit.length; setDur(pr, 6);
    ok('FB2-D1 before approval: 12 → 6 months with the real control — saved at once, audited, the payment basis follows', J(cbcDisp(pr, 1)) === J({ n: 6, unit: 'months' }) && J(pr.durV) === J({ n: 6, unit: 'months' }) && J(cb8Basis(pr).dur) === J({ n: 6, unit: 'months' }) && aud(a0).some(x => x.action === 'Course duration changed' && x.before === '12 months' && x.after === '6 months') && aud(a0).some(x => x.action === 'Payment schedule duration changed' && /Follows the Course Duration/.test(x.reason)), J(aud(a0).map(x => x.action)));
    step(id, 'payments');
    ok('FB2-D2 …and the preview: 6 months ÷ 6 = six £200, monthly; 6 months ÷ 12 = twelve £200 (uneven, in days)', (qa(`.cbr2-opt[data-o="${sp.id}"] .fb2-pv`)[0] || {}).textContent === '6 months ÷ 6 = 6 × £200.00, every month from batch start' && /^6 months ÷ 12 = 12 × £200\.00, every 1[45]–1[56] days from batch start$/.test((qa(`.cbr2-opt[data-o="${fa.id}"] .fb2-pv`)[1] || {}).textContent || ''), J(qa('.fb2-pv').map(x => x.textContent)));
    setDur(pr, 12); ok('FB2-D3 back to 12 months', J(pr.durV) === J(M12) && !cb8Wf(pr).qid);
    step(id, 'payments'); ACT.cb8Submit({ dataset: { p: id } }); press(); qid = cb8Wf(pr) && cb8Wf(pr).qid;
    const sub = cb8Wf(pr).sub, so = sub && sub.opts.find(o => o.id === sp.id), fo = sub && sub.opts.find(o => o.id === fa.id);
    ok('FB2-D4 submitted to Finance: the frozen package records 12 months, the rule and each option\'s exact pence', !!qid && Object.isFrozen(sub) && J(sub.dur) === J(M12) && sub.rule === 'CB-SCHED-1' && J(so.pay.map(x => x.pence)) === J([Array(6).fill(20000)]) && J(fo.pay.map(x => [x.k, x.rule])) === J([[6, 'Every 2 months from batch start'], [12, 'Monthly from batch start']]), J(sub && sub.dur));
    // while with Finance: refused through the real control and a direct call; nothing changes
    step(id, 'details'); const dis = q('#cbc3-dd-n') && q('#cbc3-dd-n').disabled;
    a0 = ADMIN.audit.length; INP.cbcDisp({ dataset: { p: id } }); q('#cbc3-dd-n') && (q('#cbc3-dd-n').disabled = false, q('#cbc3-dd-n').value = '9'); INP.cbcDisp({ dataset: { p: id } });
    ok('FB2-D5 while with Finance the Course Duration is locked (input disabled) and a direct save is refused, logged; nothing changes', dis && J(cbcDisp(pr, 1)) === J(M12) && J(pr.durV) === J(M12) && aud(a0).some(x => x.action === 'Blocked: change the course duration' && /waiting for Finance review/.test(x.reason)), J(aud(a0).map(x => x.action)));
    a0 = ADMIN.audit.length; const rd = ACT.cbrDisp({ dataset: { p: id } });
    ok('FB2-D5b …and the version dialog is refused before it opens', rd === false && !MODAL && aud(a0).some(x => x.action === 'Blocked: change the course duration'));
    // Finance authorisation: the Academic Admin can't approve; a Finance Admin does
    ACA(); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); reason('not mine'); closeModal();
    ok('FB2-D6 the Academic Admin can\'t approve the payment terms', cb8Wf(pr).status === 'Pending' && !cb8Cur(id));
    FA(); go('a-queue', { id: qid }); const qd = queueDetail(qid); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); reason('FB2 approve');
    ok('FB2-D7 a Finance Admin approves: a plan version whose package is 12 months, as submitted', cb8Wf(pr).status === 'Approved' && !!cb8Cur(id) && J(cb8Cur(id).dur) === J(M12) && /12 months/.test(qd));
    // after approval: a change sends the terms back to Finance; the version in force is untouched
    const v0 = s4PlanCur(id).v, pk0 = J(cb8Cur(id)); ACA(); a0 = ADMIN.audit.length; setDur(pr, 18);
    ok('FB2-D8 after approval: 12 → 18 months — the terms need Finance approval again (audited, history), told on screen', cb8Wf(pr).status === 'Draft' && aud(a0).some(x => x.action === 'Payment terms need Finance approval again' && /course duration changed/.test(x.reason) && /12 months/.test(x.reason) && /18 months/.test(x.reason)) && (cb8Wf(pr).hist || []).some(h => /Approval withdrawn — the course duration changed/.test(h[2])) && /need Finance approval again/.test(lastToast), lastToast);
    ok('FB2-D9 …the approved plan version and its package are unchanged (12 months)', s4PlanCur(id).v === v0 && J(cb8Cur(id)) === pk0 && J(cb8Cur(id).dur) === J(M12));
    // a stale submission can't be approved: resubmit at 18, change back to 12 is locked; approve 18 → a new version with 18 months
    step(id, 'payments'); ACT.cb8Submit({ dataset: { p: id } }); press(); const q2 = cb8Wf(pr).qid; FA(); ACT.e1Decide({ dataset: { id: q2, a: 'approve' } }); reason('FB2 18 months');
    ok('FB2-D10 resubmitted and approved at 18 months: a new plan version for new learners (18 months)', cb8Wf(pr).status === 'Approved' && s4PlanCur(id).v === v0 + 1 && J(cb8Cur(id).dur) === J({ n: 18, unit: 'months' }) && J(s4Plans(id).find(p => p.v === v0).pkg.dur) === J(M12));
    ACA(); setDur(pr, 12); step(id, 'payments'); ACT.cb8Submit({ dataset: { p: id } }); press(); FA(); ACT.e1Decide({ dataset: { id: cb8Wf(pr).qid, a: 'approve' } }); reason('FB2 back to 12');
    ok('FB2-D11 (setup) back to 12 months, approved again', cb8Wf(pr).status === 'Approved' && J(cb8Cur(id).dur) === J(M12) && J(pr.durV) === J(M12));
  });

  /* ================= E. Publish, sign-up, pinned schedules, transfers ================= */
  let w1 = null, w2 = null, bt = null, bt3 = null, snap = null;
  const pinOf = w => J([w.signup.pin, w.plans.find(p => p.e === 'nvq').rows, w.signup.sig, w.signup.plan]);
  await T('FB2-E sign-up', async () => {
    SA(); curr(pr); ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    ACT.ch8Publish({ dataset: { id } }); reason('Ready'); closeModal();
    ok('FB2-E1 (setup) the course is published', pr.status === 'Active', J(ch8Check(pr).block));
    go('a-batches'); ACT.newBatch(); fill({ '#nb-c': 'FB2B1' }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    bt = ADMIN.batches.find(x => x.code === 'FB2B1'); bt.start = D(40, '09:00'); bt.end = D(420, '17:00');
    bt3 = { ...bt, code: 'FB2B3', label: 'FB2 later batch', start: D(75, '09:00'), enrolled: 0 }; ADMIN.batches.push(bt3);
    const signUp = (v, oid) => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
      const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${oid}"]`); if (r) r.checked = true; prim(); closeModal();
      const w = W; chSetBatch(w, bt); ACT.suNext(); w.docs.forEach(x => { x.status = 'Submitted'; x.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, bt); go('admission'); return w; };
    const pay = c => { setUi('cb9Pay', c); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-FB2'); closeModal(); return g; };
    const anchor = cbYmdOf(bt.start);
    // Self-Paced, deposit then 6 payments: the £100 deposit is credited to payment 1 (£200 → £100); the total stays £1,200
    w1 = signUp('A', sp.id); const di = fcDIOpts(w1), d6 = di.find(o => o.k === 6), txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' '); };
    ok('FB2-E2 Self-Paced (£1,200, 6 payments, £100 deposit): "Deposit, then 6 payments" offered; its schedule shows payment 1 £100.00 after the deposit and a £1,200 total', !!d6 && !d6.why && d6.dep === 100 && /£100\.00 after the £100\.00 deposit/.test(txt(fcDISched(d6))) && /Total\s*£1,200\.00\s*£1,200\.00/.test(txt(fcDISched(d6))), txt(fcDISched(d6)).slice(0, 400));
    const g1 = pay('dep6'), pl1 = w1.plans.find(p => p.e === 'nvq');
    ok('FB2-E3 paid: £100 now; pinned 6 × £200 two months apart from the batch start, deposit credited to payment 1; nothing added to the total', !!g1 && g1.amount === 100 && w1.signup.pin.route === 'deposit-instalments' && w1.signup.pin.dep.creditTo === 1 && w1.signup.pin.rows.every(r => r.amount === 200) && w1.signup.pin.rows.slice(1).every((r, i) => r.due === cbAddMonths(anchor, 2 * (i + 1))) && pl1.total === 1200 && pl1.rows.reduce((x, r) => x + fpP(r.amount), 0) === 120000 && J(w1.signup.pin.dur) === J(M12), J([g1 && g1.amount, pl1.total, w1.signup.pin.rows.map(r => r.due)]));
    // Fully Assisted £2,400, £250 deposit: offered with 6 payments (£400), not with 12 (£200); 12 monthly payments by card
    w2 = signUp('F', fa.id); const df = fcDIOpts(w2);
    ok('FB2-E4 Fully Assisted, £250 deposit: offered before 6 payments (payment 1 £400), refused with 12 (payment 1 £200) with the reason', !df.find(o => o.k === 6).why && /The deposit \(£250\.00\) is more than payment 1 \(£200\.00\), so it can't be combined with 12 payments/.test(df.find(o => o.k === 12).why) && !!q('input[name="cb9-pay"][value="dep12"][disabled]'), J(df.map(o => [o.k, o.why])));
    const g2 = pay('12');
    ok('FB2-E5 12 payments by card: £200 now, twelve £200 payments one month apart from the batch start (total £2,400)', !!g2 && g2.amount === 200 && w2.signup.pin.k === 12 && w2.signup.pin.rows.every((r, i) => r.amount === 200 && r.due === cbAddMonths(anchor, i)) && w2.signup.pin.rows.reduce((x, r) => x + r.pence, 0) === 240000 && w2.signup.pin.anchor === anchor, J(w2.signup.pin.rows.map(r => r.due)));
    ok('FB2-E6 the offer letter each signed carries their own dated payment wording', /200\.00/.test((w2.signup.sig.snapshot || {}).pay || '') && /100\.00/.test((w1.signup.sig.snapshot || {}).pay || ''), (w2.signup.sig.snapshot || {}).pay);
    snap = { w1: pinOf(w1), w2: pinOf(w2) };
    // a transfer that would change signed dates is refused (L3-C2, unchanged)
    as('A')(); const a0 = ADMIN.audit.length; lastToast = ''; const mv = chDoMove(w2.me.id, bt, bt3, 'direct');
    ok('FB2-E7 moving Fully Assisted to a batch 35 days later is refused: the signed dates would change; nothing changes', mv === false && w2.signup.batch === 'FB2B1' && pinOf(w2) === snap.w2, lastToast);
  });

  /* ================= F. A new version with another Course Duration ================= */
  await T('FB2-F new version', async () => {
    SA(); const v1 = pr.version, pv1 = s4PlanCur(id).v, pk1 = J(cb8Cur(id));
    ACT.s3WizVersion({ dataset: { id } }); reason('FB2 v2');
    // the new version records its observation answer first (N5a: every new version answers it; until then no basis is decided — cb-finpub)
    cbObsSet(pr, false, 'Version ' + (v1 + 1) + ' (draft) — FB2 test');
    ok('FB2-F0 (setup) a draft Version ' + (v1 + 1) + ', its observation answer recorded (No, as Version ' + v1 + '); its terms still approved', cbDraftV(pr) === v1 + 1 && cb8Basis(pr).req === false && cb8Wf(pr).status === 'Approved');
    go('a-programmes', { id, tab: 'details' }); const btn = q('[data-act="cbrDisp"]');
    ok('FB2-F1 the published course shows "Course Duration 12 months" with Edit (a draft version exists)', !!btn && /Course Duration\s*12 months/.test(q('.cbr2-view').textContent));
    let a0 = ADMIN.audit.length; btn.click(); const dlg = document.querySelector('#modal-root').textContent;
    document.querySelector('#cd-n').value = ''; const blank = prim();
    document.querySelector('#cd-n').value = '18'; document.querySelector('#cd-u').value = 'months'; press();
    ok('FB2-F2 the dialog says Course Duration and needs Finance approval; blank refused; 18 months saved for Version ' + (v1 + 1), /Course Duration/.test(dlg) && /needs Finance approval/.test(dlg) && blank === false && J(cbcDisp(pr, v1 + 1)) === J({ n: 18, unit: 'months' }) && J(cbcDisp(pr, v1)) === J(M12), dlg.slice(0, 200));
    ok('FB2-F3 the version in force keeps 12 months (pr.durV, the plan in force); the draft version\'s basis is 18 months', J(pr.durV) === J(M12) && J(cbFpLive(pr).dur) === J(M12) && J(cb8Basis(pr).dur) === J({ n: 18, unit: 'months' }) && s4PlanCur(id).v === pv1 && J(cb8Cur(id)) === pk1);
    ok('FB2-F4 approval withdrawn (audited); learners\' schedules, rows, letters and terms unchanged', cb8Wf(pr).status === 'Draft' && aud(a0).some(x => x.action === 'Payment terms need Finance approval again') && pinOf(w1) === snap.w1 && pinOf(w2) === snap.w2);
    ACT.ch8Publish({ dataset: { id } }); const why = (document.querySelector('#modal-root') || {}).textContent || ''; closeModal();
    ok('FB2-F5 Version ' + (v1 + 1) + ' can\'t be published until Finance approves terms for 18 months', pr.version === v1 && /Finance approval is needed first|not approved/.test(why), why.slice(0, 200));
    step(id, 'payments'); ok('FB2-F6 Step 5 shows the draft version\'s Course Duration (18 months) and its spacing', /Course Duration\s*18 months\s*\(Version 2, draft\)/.test(q('.fb2-cdur').textContent) && (qa(`.cbr2-opt[data-o="${sp.id}"] .fb2-pv`)[0] || {}).textContent === '18 months ÷ 6 = 6 × £200.00, every 3 months from batch start', J(qa('.fb2-pv').map(x => x.textContent)));
    ACA(); step(id, 'payments'); ACT.cb8Submit({ dataset: { p: id } }); press(); FA(); ACT.e1Decide({ dataset: { id: cb8Wf(pr).qid, a: 'approve' } }); reason('FB2 v2 terms');
    ok('FB2-F7 Finance approves the 18-month terms for the draft version: held; learners signing up now keep 12 months', cb8Wf(pr).status === 'Approved' && !!cb8Wf(pr).held && J(cb8Cur(id).dur) === J(M12) && s4PlanCur(id).v === pv1);
    SA(); a0 = ADMIN.audit.length; ACT.cbPublish({ dataset: { id } }); document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = '2026-12-20T21:59'; }); reason('FB2 v2'); closeModal(); // a new version: Review & Publish (as FB1-H)
    ok('FB2-F8 Version ' + (v1 + 1) + ' published: the held 18-month package is in force; pr.durV follows (audited)', pr.version === v1 + 1 && J(cb8Cur(id).dur) === J({ n: 18, unit: 'months' }) && s4PlanCur(id).v === pv1 + 1 && J(pr.durV) === J({ n: 18, unit: 'months' }) && aud(a0).some(x => x.action === 'Payment schedule duration changed' && /Version 2 published/.test(x.reason)), J([pr.version, cb8Cur(id).dur, pr.durV, ch8Check(pr).block]));
    ok('FB2-F9 learners who signed before keep 12-month schedules, letters and terms exactly', pinOf(w1) === snap.w1 && pinOf(w2) === snap.w2 && J(w2.signup.pin.dur) === J(M12));
  });

  /* ================= G. Programmes from before FB2 ================= */
  await T('FB2-G historical', async () => {
    ok('FB2-G1 every plan version and approved package from before FB2 is unchanged', J(JSON.parse(allPlans()).filter(([pid]) => JSON.parse(boot).some(b => b[0] === pid)).map(([pid, v]) => [pid, v.slice(0, JSON.parse(boot).find(b => b[0] === pid)[1].length)])) === boot);
    ok('FB2-G2 programmes created before FB2 keep their duration records (no migration, no FB2 flag)', J(JSON.parse(legacyState()).filter(x => JSON.parse(bootLegacy).some(y => y[0] === x[0]))) === bootLegacy);
    // a pre-FB2 Draft keeps its separate Payment Schedule Duration: the control, and a Display Duration change that never moves payments
    const old = (STORE.chNewProgs || []).find(p => !p.fb2 && p.status === 'Draft' && p.durV);
    if (!old) { ok('FB2-G3 (setup) a pre-FB2 Draft programme exists in the legacy fixture', false, J((STORE.chNewProgs || []).map(p => [p.id, p.status, !!p.durV, cb8Managed(p)]))); return; }
    SA(); step(old.id, 'payments'); const ctl = !!q('#cbc3-pd-n') && !!q('[data-act="cbcPayDur"]') && !q('.fb2-cdur');
    const d0 = J(old.durV), b0 = J(cb8Basis(old).dur); step(old.id, 'details'); const i = q('#cbc3-dd-n'); if (i) { i.value = '3'; q('#cbc3-dd-u').value = 'months'; i.dispatchEvent(new Event('change', { bubbles: true })); }
    ok('FB2-G3 ' + old.id + ' (pre-FB2): Payment Schedule Duration control kept; its Display Duration changes without moving the payment basis', ctl && !!i && J(cbcDisp(old, old.version || 1)) === J({ n: 3, unit: 'months' }) && J(old.durV) === d0 && J(cb8Basis(old).dur) === b0, J([ctl, d0, b0]));
  });

  /* ================= H. Roles and direct calls ================= */
  await T('FB2-H refusals', async () => {
    const p2 = make(); const d0 = J(p2.durV);
    FA(); let a0 = ADMIN.audit.length; go('a-programmes', { id: p2.id, tab: 'details' }); INP.cbcDisp({ dataset: { p: p2.id } });
    ok('FB2-H1 a Finance Admin can\'t change a Course Duration (direct call refused); nothing changes', J(p2.durV) === d0 && J(cbcDisp(p2, 1)) === J(M12));
    COO(); INP.cbcDisp({ dataset: { p: p2.id } }); ACT.cbrDisp({ dataset: { p: p2.id } }); closeModal();
    ok('FB2-H2 nor can a Coordinator, through either handler', J(p2.durV) === d0 && J(cbcDisp(p2, 1)) === J(M12));
    SA(); a0 = ADMIN.audit.length; const r = ACT.cbcPayDur({ dataset: { p: p2.id } });
    ok('FB2-H3 the old Payment Schedule Duration save is refused for an FB2 programme (logged), even for the Super Administrator', r === false && J(p2.durV) === d0 && aud(a0).some(x => x.action === 'Blocked: change the payment schedule duration' && /follow the Course Duration/.test(x.reason)) && /Change it in Course Details/.test(lastToast));
    step(p2.id, 'details'); document.querySelector('main #np-d').value = '3'; document.querySelector('main #np-du').value = 'years'; ACT.ch8SaveDetails({ dataset: { id: p2.id } });
    ok('FB2-H4 a Course Details save with the hidden duration altered can\'t change the payment basis', J(p2.durV) === d0 && J(cb8Basis(p2).dur) === J(M12));
    step(p2.id, 'details'); const i = q('#cbc3-dd-n'); i.value = ''; i.dispatchEvent(new Event('change', { bubbles: true }));
    ok('FB2-H5 the Course Duration of a saved course can\'t be cleared', J(cbcDisp(p2, 1)) === J(M12) && /Enter the Course Duration/.test((q('.err') || {}).textContent || ''));
    ok('FB2-H6 Review & Publish names it: Course Duration under Course Details; "Payment dates spread across 12 months (the Course Duration)"', (step(p2.id, 'review'), /Course Duration\s*12 months/.test(main()) && /Payment dates spread across\s*12 months\s*\(the Course Duration\)/.test(main()) && !/Payment Schedule Duration/.test(main())));
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
