// FI-2 — financial reconciliation and workflow corrections (31 Oct 2026; PD-FI2-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client: the client demo first (Amira, Dev, refunds, overrides, overdue on the simulated
// date, deposit releases, batch cancellation), then the legacy data (agency and seeded refunds, observation fees), then the
// client demo again to check Reset. Expected money is worked out here in pence from the records, never read from the code under test.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'FI-2 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const P = x => Math.round(x * 100), G = p => money(p / 100, 'GBP');
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const signIn = email => { signOutUI(); $1('#si-email').value = email; $1('#si-pw').value = 'Demo!Pass2026'; submit('form[data-submit="signin"]'); };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pl = w => w && w.plans.find(p => p.e === 'nvq');
  const tgt = k => payTargets().find(t => t.key === k);
  const rowOf = (txt, name) => $a('main table tbody tr').find(tr => tr.textContent.includes(name));
  // Independent figures from a learner's own record: fee, money in (receipts), money out (refund rows), outstanding
  const own = w => { const p = pl(w), fee = P(p.total), rows = p.rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid)), 0), got = w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((a, t) => a + P(t.amount), 0), back = w.tx.filter(t => t.amount < 0).reduce((a, t) => a + P(-t.amount), 0); return { fee, out: rows, got, back }; };
  const raise = (t, a, txt = 'FI-2', keep = true) => { raiseRefund(t); $1('#rr-a').value = String(a); $1('#rr-t').value = txt; if (keep) $a('#modal-root input[name="rrc"]').find(x => x.value === 'Retain access').checked = true; press(); return ADMIN.queue[0]; };
  const txOf = (v, amt) => allTx().find(x => x.v === v && P(x.amount) === P(amt) && !x.refund && ['Paid', 'Partially refunded'].includes(x.status)); // FI-2 review (L-4): a payment refunded in part is still refundable
  // Each test account gets its own mobile, outside the seeded 7700 900xxx numbers. Was: '7700 900' + a random 100–899, which now and
  // then matched a demo learner's or an earlier test account's mobile, so sign-up was (correctly) refused as a duplicate account
  let regN = 0;
  const register = (name, email) => {
    signOutUI(); click($1('#app [data-act="regStart"]'));
    const v = { '#rg-name': name, '#rg-email': email, '#rg-mob': '7700 955' + String(100 + regN++), '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submit('form[data-submit="regSubmit"]'); press(); $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]');
    click($1('#app [data-act="finishWelcome"]')); return W;
  };
  const toPayment = (w, mode = 'Self-Paced') => {
    go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T); ACT.applyNvq({ dataset: { id: c.id } });
    const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === mode); $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`).checked = true; press();
    go('admission'); $1('#su-dob').value = '1992-03-04'; $1('#su-ad').value = '9 Test Road, Luton'; click($1('main [data-act="suNext"]'));
    fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); });
    click($1('main [data-act="suNext"]')); setUi('suSig', chFullName(w)); setUi('suDecl', true); render(); click($1('main #su-sign'));
  };
  const choose = (opt, method) => { const r = $1(`main input[name="cb9-pay"][value="${opt}"]`); if (r) { r.checked = true; INP.cb9Pay(r); } const m = $1(`main input[name="su-m"][value="${method}"]`); if (m) { m.checked = true; INP.suMethod(m); } };
  const payCo = open => fxFast(ff => { open(); if (!MODAL || !/Pay now/.test(MODAL.title || '')) return false; prim(); ff(3000); closeModal(); return true; });
  const advance = d => { FA(); ACT.cb10Advance({ dataset: { d: String(d) } }); render(); };
  const back = () => { FA(); ACT.cb10Reset(); render(); };
  const snapCD = () => J(['CD1', 'CD2', 'CD3'].map(k => { const w = STORE.worlds[k]; return [w.plans.map(x => x.rows.map(r => [r.n, r.amount, r.status, r.paid])), w.tx.length]; }));
  const cd0 = snapCD();
  const A = STORE.worlds.CD1, Dv = STORE.worlds.CD2;

  /* ================= A / B: Amira and Dev reconcile across every screen ================= */
  await T('FI2-A/B starting balances on every screen', async () => {
    const a = own(A), d = own(Dv);
    ok('FI2-A Amira\'s record: fee £1,800.00, received £300.00, outstanding £1,500.00', a.fee === 180000 && a.got === 30000 && a.out === 150000, J(a));
    ok('FI2-B Dev\'s record: fee £2,600.00, received £433.33, outstanding £2,166.67', d.fee === 260000 && d.got === 43333 && d.out === 216667, J(d));
    FA(); go('f-learners'); const ra = rowOf('', 'Amira Shah'), rd = rowOf('', 'Dev Patel');
    ok('FI2-A/B Finance → Learner Accounts shows Amira £1,500.00 and Dev £2,166.67 outstanding (was "—")', !!ra && ra.textContent.includes(G(a.out)) && !!rd && rd.textContent.includes(G(d.out)), (ra || {}).textContent);
    ok('FI2-A/B Learner Accounts footer: £3,666.67 outstanding in all', main().includes('Outstanding (filtered): ' + G(a.out + d.out)));
    go('f-learner', { id: A.me.id, tab: 'payments' }); ok('FI2-A Finance learner → Payments: Amira\'s schedule and "Outstanding £1,500.00"', /Programme fee\s*£1,800\.00/.test(main()) && main().includes('Outstanding' + G(a.out)) && pl(A).rows.every(r => main().includes(money(r.amount, 'GBP'))));
    go('f-learner', { id: Dv.me.id, tab: 'payments' }); ok('FI2-B Finance learner → Payments: Dev\'s schedule (5 × £433.33 + £433.35) and "Outstanding £2,166.67"', /Programme fee\s*£2,600\.00/.test(main()) && main().includes('Outstanding' + G(d.out)) && main().includes('£433.35'));
    SA(); go('a-learner', { id: A.me.id, tab: 'payments' }); ok('FI2-A Admin Learner 360 → Payments: Amira\'s plan, not "No outstanding amounts"', !/No outstanding amounts/.test(main()) && main().includes('Outstanding' + G(a.out)));
    go('a-learner', { id: Dv.me.id, tab: 'payments' }); ok('FI2-B Admin Learner 360 → Payments: Dev\'s plan with £2,166.67 outstanding', !/No outstanding amounts/.test(main()) && main().includes('Outstanding' + G(d.out)));
    FA(); setUi('fpL', 'CD1'); go('f-plans'); ok('FI2-A Finance → Payment Plans: Amira £1,500.00 outstanding', main().includes('Outstanding' + G(a.out)));
    learner('CD1'); go('payments'); ok('FI2-A Learner Payments: Amira sees £1,500.00 outstanding', main().includes(G(a.out)));
    learner('CD2'); go('payments'); ok('FI2-B Learner Payments: Dev sees £2,166.67 outstanding', main().includes(G(d.out)));
  });
  await T('FI2-K dashboard: no invented figures', async () => {
    FA(); go('f-dashboard');
    const due = {}; [A, Dv, STORE.worlds.CD3].forEach(w => w.plans.forEach(p => p.rows.forEach(r => { const m = r.due.slice(0, 7); due[m] = (due[m] || 0) + P(r.amount); })));
    const bars = $a('.fcb-due').map(x => x.title), months = [5, 4, 3, 2, 1, 0].map(n => { const d = new Date(now()); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); });
    ok('FI2-K the "Due" bars are the instalments scheduled each month (was 1.18 × collected + £300)', bars.length === 6 && bars.every((t, k) => t === 'Due ' + G(due[months[k]] || 0)), J(bars));
    ok('FI2-K Outstanding balance tile £3,666.67 — every unpaid instalment (was £0.00)', main().includes(G(own(A).out + own(Dv).out)) && /unpaid instalments that can be paid/.test(main()));
  });

  /* ================= I: mixed-mode fees stay independent ================= */
  await T('FI2-I one learner\'s payment never moves another\'s balance', async () => {
    FA(); const a0 = own(A); recordPayment(tgt('CD2|nvq|2'), 433.33, 'BACS-FI2I1', 'Bank transfer', 'Received');
    ok('FI2-I Dev\'s instalment 2 recorded: Dev outstanding £1,733.34; Amira unchanged at £1,500.00', own(Dv).out === 173334 && J(own(A)) === J(a0));
    go('f-learners'); ok('FI2-I Learner Accounts follows: Dev £1,733.34, Amira £1,500.00', rowOf('', 'Dev Patel').textContent.includes('£1,733.34') && rowOf('', 'Amira Shah').textContent.includes('£1,500.00'));
  });

  /* ================= D / K: a refund, the ledger and the reports ================= */
  let dRef;
  await T('FI2-D refund raised, approved, processed, reflected everywhere', async () => {
    FA(); const t = txOf('CD2', 433.33), n0 = Dv.tx.filter(x => x.amount < 0).length; dRef = raise(t, 100, 'goodwill');
    ok('FI2-D raised: Pending with the other Finance Admin; nothing refunded yet', dRef.status === 'Pending' && dRef.first === 'Mark Bennett' && Dv.tx.filter(x => x.amount < 0).length === n0);
    FA('FB'); applyDecision(dRef, 'approve', 'ok'); const row = Dv.tx.find(x => x.amount < 0);
    ok('FI2-D approved: one −£100.00 refund transaction on Dev\'s record, linked to the payment it refunds, with a reference used nowhere else', !!row && P(row.amount) === -10000 && row.orig === t.ref && Object.values(STORE.worlds).flatMap(w => w.tx).filter(x => x.ref === row.ref).length === 1 && !(STORE.fin.tx || []).some(x => x.ref === row.ref));
    FA(); applyDecision(dRef, 'approve', 'again'); ok('FI2-J approving it again adds nothing', Dv.tx.filter(x => x.amount < 0).length === n0 + 1);
    go('f-learner', { id: Dv.me.id, tab: 'payments' }); const d = own(Dv);
    ok('FI2-D Finance learner shows received £866.66 · refunded £100.00 · net £766.66', main().includes(`Received ${G(d.got)} · refunded ${G(d.back)} · net received ${G(d.got - d.back)}`), main().match(/Received £[^.]*\./));
    learner('CD2'); go('payments'); ok('FI2-D Dev\'s own Payments page shows the same received / refunded / net', main().includes(`net received ${G(d.got - d.back)}`));
  });
  await T('FI2-K reports match the ledger (independent sums)', async () => {
    // Independently: every learner record's receipts and refund rows (the client demo's ledger is the learners' records)
    const ws = learnerAccounts().map(v => STORE.worlds[v]), got = ws.reduce((a, w) => a + w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((s, t) => s + P(t.amount), 0), 0), out = ws.reduce((a, w) => a + w.tx.filter(t => t.amount < 0).reduce((s, t) => s + P(-t.amount), 0), 0);
    FA(); S.ui.frRange = '180'; go('f-reports', { tab: 'datewise' }); const s = $1('.fi-rep');
    ok('FI2-K Datewise: received, refunded and net equal the ledger', !!s && +s.dataset.received === got && +s.dataset.refunded === out && +s.dataset.net === got - out, J({ got, out, s: s && s.dataset }));
    ok('FI2-K Datewise shows Received / Refunded / Net and the bank transfers awaiting confirmation separately', /Received£/.test(main()) && /Refunded−£100\.00/.test(main()) && /Net received/.test(main()) && /Bank transfers awaiting confirmation/.test(main()));
    go('f-reports', { tab: 'coursewise' }); const c = $1('.fi-rep'), prog = rowOf('', CD_T);
    const pGot = [A, Dv].reduce((a, w) => a + w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded').reduce((s, t) => s + P(t.amount), 0), 0), pOut = own(A).out + own(Dv).out;
    ok('FI2-K Coursewise: the programme row has both learners, £' + (pGot / 100).toFixed(2) + ' received, £100.00 refunded, £' + (pOut / 100).toFixed(2) + ' outstanding (no "NVQ payment 1 of 6" rows)', !!prog && prog.textContent.includes(G(pGot)) && prog.textContent.includes(G(10000)) && prog.textContent.includes(G(pOut)) && !/NVQ payment 1 of 6/.test(main()) && +c.dataset.received === got, prog && prog.textContent);
    setUi('frMode', 'Bank transfer'); go('f-reports', { tab: 'datewise' });
    ok('FI2-K the method filter works: Bank transfer received £433.33', +$1('.fi-rep').dataset.received === 43333);
    const e0 = (ADMIN.exportsLog || []).length; click($1('main [data-act="aExport"][data-f="CSV"]'));
    ok('FI2-K the export names the same filters as the screen', (ADMIN.exportsLog || []).length === e0 + 1 && /method: Bank transfer/.test(J(ADMIN.exportsLog[0])), J((ADMIN.exportsLog || [])[0]));
    setUi('frMode', ''); SA(); go('a-finance', { tab: 'reports' });
    ok('FI2-K the admin console\'s Reports show the same ledger figures (the fixed legacy table and the £1,751.08 overdue are gone)', !/107,217\.20|1,751\.08|63 learners/.test(main()) && $a('.fi-rep').some(x => +x.dataset.received === got));
    FA(); go('f-dashboard'); ok('FI2-K dashboard: refunds this month shown with Collected', /refunded this month £100\.00/.test(main()));
  });

  /* ================= E: Super Admin override applies its effect once ================= */
  await T('FI2-E override of a refund', async () => {
    FA(); const t = txOf('CD1', 300), i = raise(t, 50, 'override test'), n0 = A.tx.filter(x => x.amount < 0).length;
    FA('FB'); applyDecision(i, 'reject', 'no'); ok('FI2-E rejected: nothing refunded', i.status === 'Rejected' && A.tx.filter(x => x.amount < 0).length === n0);
    FA(); ACT.qOverride({ dataset: { id: i.id } }); ok('FI2-E a Finance Admin can\'t override (handler)', !MODAL);
    SA(); ACT.qOverride({ dataset: { id: i.id } }); $1('#ovr').value = 'Approved'; $1('#rsn').value = 'Goodwill agreed'; press();
    ok('FI2-E Super Admin override to Approved pays it once: one −£50.00 refund transaction, linked, audited', i.status === 'Approved' && !!i.processed && A.tx.filter(x => x.amount < 0).length === n0 + 1 && P(A.tx.find(x => x.amount < 0).amount) === -5000 && A.tx.find(x => x.amount < 0).orig === t.ref && ADMIN.audit.some(x => x.entity === i.id && /override/.test(x.action)));
    ACT.qOverride({ dataset: { id: i.id } }); $1('#ovr').value = 'Rejected'; $1('#rsn').value = 'take it back'; const r = prim();
    ok('FI2-E overriding a paid refund back to Rejected is refused (money already returned); nothing changes', r === false && i.status === 'Approved' && A.tx.filter(x => x.amount < 0).length === n0 + 1); closeModal();
    ok('FI2-E the payment\'s refundable remainder is £250.00', P(refundable(t)) === 25000);
  });

  /* ================= Smaller corrections ================= */
  await T('FI2 M-1 / M-4 / M-6 / L-1 / L-5 / L-7 / L-8 / L-11', async () => {
    FA(); const mk = ADMIN.staff.find(s => s.name === 'Mark Bennett'); mk.status = 'Deactivated';
    raiseRefund(txOf('CD1', 300)); ok('FI2 M-1 a refund is not routed to a deactivated Finance Admin (Super Administrator instead)', /Will be sent to: Super Administrator/.test(mtxt()), mtxt().match(/Will be sent to: [^—.]*/)); closeModal(); mk.status = 'Active';
    const r6 = pl(A).rows[5], a6 = P(r6.amount) - P(r6.paid); ACT.finWaive({ dataset: { v: 'CD1', e: 'nvq' } }); $1('#wv-r').value = String(r6.n); $1('#wv-k').value = 'pct'; $1('#wv-a').value = '33.3'; $1('#rsn').value = 'hardship'; press();
    ok('FI2 M-4 a 33.3% waiver of £300.00 takes £99.90 (was £100: whole pounds)', P(r6.waived) === Math.round(a6 * 0.333), String(r6.waived));
    const r5 = pl(A).rows[4], due5 = r5.due; ACT.finAdjust({ dataset: { v: 'CD1', e: 'nvq' } }); $1('#ad-r').value = String(r5.n); $1('#ad-d').value = '2020-01-01'; $1('#rsn').value = 'x'; const ra = prim();
    ok('FI2 M-6 Adjust schedule refuses a date in the past', ra === false && r5.due === due5); closeModal();
    ACT.finRemind(); ok('FI2 L-1 "Send payment reminder" (learner without an agreed schedule) says it is simulated', /simulated/.test(($1('#toasts') || {}).textContent || ''));
    const f = chFeeRaise(A.me.id, CD_T, D(80), 'CD1'); ok('FI2 L-5 Amira\'s observation fee is labelled with her own mode (Self-paced, £100.00)', !!f && f.support === 'Self-paced' && P(f.amount) === 10000, f && f.support + ' ' + f.amount);
    ok('FI2 L-8 a waiver request without a reason is refused', chWaiverRaise({ id: 'OF-X', name: 'x', amount: 1 }, '  ') === null);
    let threw = false; try { ok('FI2 L-11 a decision on a missing item is refused, not an error', applyDecision(null, 'approve', 'x') === false); } catch (e) { threw = true; } if (threw) ok('FI2 L-11 a decision on a missing item is refused, not an error', false);
  });

  /* ================= Deposit releases (M-10, M-11), H-4, D-17 ================= */
  await T('FI2 deposit learners: split refused, expected reference, release wording', async () => {
    const kit = register('Kit Bal', 'kit.bal@fi2.example'); toPayment(kit); choose('deposit', 'card'); payCo(() => click($1('main [data-act="suPay"]')));
    FA(); recordPayment(tgt(kit.v + '|nvq|1'), 600, 'BACS-FI2K1', 'Bank transfer', 'part of the balance');
    ACT.finAdjust({ dataset: { v: kit.v, e: 'nvq' } }); $1('#ad-s').value = 'yes'; $1('#rsn').value = 'split'; const r1 = prim();
    ok('FI2 H-4 a deposit balance can\'t be split into instalments (no deposit-plus-instalments route)', r1 === false && pl(kit).rows.length === 1); closeModal();
    const lou = register('Lou Ref', 'lou.ref@fi2.example'); toPayment(lou); choose('deposit', 'bank'); click($1('main [data-act="suPay"]')); press();
    FA(); ACT.finOffline({ dataset: { k: lou.v + '|dep' } }); INP.opPrev(); const exp = lou.signup.pay.ref;
    ok('FI2 D-17 the dialog shows the reference the learner was given (' + exp + ') and flags a different one', mtxt().includes(exp) && /reference entered is different/.test(mtxt())); $1('#op-r').value = exp; INP.opPrev(); ok('FI2 D-17 … and not when it matches', !/reference entered is different/.test(mtxt())); $1('#rsn').value = 'received'; press();
    const lt = allTx().find(x => x.v === lou.v && x.ref === exp); raise(lt, 300, 'refund the deposit'); FA('FB'); applyDecision(ADMIN.queue[0], 'approve', 'ok');
    advance(30);
    const kh = kit.admission.history.map(h => h[0]).join(' | '), lh = lou.admission.history.map(h => h[0]).join(' | ');
    ok('FI2 M-10 Kit\'s release record names the £600.00 of the balance received (it said only "deposit received")', /Seat released/.test(kh) && /£600\.00 of the balance/.test(kh), kh.slice(-220));
    ok('FI2 M-11 Lou\'s release record says the deposit was refunded (it said "deposit not received")', /Seat released/.test(lh) && /deposit refunded/.test(lh) && !/deposit not received/.test(lh), lh.slice(-220));
    back();
  });

  /* ================= C: overdue on the simulated date ================= */
  await T('FI2-C overdue, reminders, pause, arrangement, restore', async () => {
    const r2 = pl(A).rows[1], late = Math.ceil((new Date(r2.due) - now()) / DAY);
    advance(late + 16);
    ok('FI2-C Amira\'s instalment 2 is overdue on the simulated date (+' + (late + 16) + ' days)', r2.status === 'Overdue' && !!A.payOverdue && A.payOverdue.n === r2.n);
    FA(); go('f-overdue'); ok('FI2-C Finance → Overdue & Access lists Amira', /Amira Shah/.test(main()));
    ok('FI2-C Day 15 reminders for Amira\'s agreed schedule (CB10, simulated)', CB10().log.some(x => J(x).includes(A.me.id) && /15/.test(J(x))), J(CB10().log.slice(-2)));
    go('f-dashboard'); ok('FI2-C the dashboard\'s overdue figure counts her', /Overdue amount/.test(main()) && odRows().some(o => o.v === 'CD1' && o.status === 'overdue'));
    learner('CD1'); go('dashboard'); ok('FI2-C Amira\'s dashboard shows the overdue payment', /overdue/i.test(main()));
    advance(15);
    ok('FI2-C Day 30: no automatic pause for an agreed schedule (PD-CB-72 — client question), and it is logged', !A.accessPaused && ADMIN.audit.some(x => /automatic pause not applied/.test(x.action) && x.entity.includes(A.me.id)));
    // Manual pause (CH-14) is per enrolment: Lena's course is unaffected
    FA(); ACT.chPause({ dataset: { l: A.me.id, e: 'nvq' } }); reason('Repeated missed payments');
    ok('FI2-C manual pause by Finance: Amira\'s programme only (CH-14)', !!(STORE.chPause || {})[chPKey(A.me.id, 'nvq')] && !(STORE.chPause || {})[chPKey(STORE.worlds.CD3.me.id, 'bk5')]);
    ACT.chRestore({ dataset: { l: A.me.id, e: 'nvq' } }); reason('Arrangement agreed');
    // Arrangement with a new date, lapse, then settlement
    const o = odRows().find(x => x.v === 'CD1' && x.inst === r2.n); ACT.odRestore({ dataset: { id: o.id } }); $1('#ra-dt').value = D(late + 31 + 10).slice(0, 10); $1('#rsn').value = 'Will pay on payday'; press();
    ok('FI2-C payment arrangement: instalment under arrangement, no longer overdue', r2.arrangement && !!A.arrangeUntil && r2.status !== 'Overdue' && odRows().some(x => x.v === 'CD1' && x.status === 'arrangement'));
    advance(12);
    ok('FI2-C the arrangement date passes unpaid: overdue again (not paused — it never was), Finance told', !r2.arrangement && r2.status === 'Overdue' && !A.accessPaused && STORE.fin.notifs.some(x => /Arrangement lapsed/.test(x.t)));
    FA(); odRows().filter(x => x.v === 'CD1' && x.status === 'overdue').forEach(x => recordPayment(tgt('CD1|nvq|' + x.inst), x.amount, 'BACS-FI2C' + x.inst, 'Bank transfer', 'settled'));
    ok('FI2-C settled: nothing overdue for Amira, the overdue notice clears', !odRows().some(x => x.v === 'CD1') && !A.payOverdue);
    // Without an agreed schedule (test-only: Dev's pin removed) the existing Day 30 pause applies, and payment restores access
    const ur = pl(Dv).rows.find(x => P(x.amount) > P(x.paid)), need = 31 - fiLate(ur.due, Dv); if (need > 0) advance(need); const pin = Dv.signup.pin; delete Dv.signup.pin; render();
    ok('FI2-C test-only: without an agreed schedule the Day 30 pause applies (the existing overdue process)', Dv.accessPaused === true && Dv.fiAutoPaused === true);
    learner('CD2'); go('courses'); const locked = /paused/i.test(main());
    FA(); odRows().filter(x => x.v === 'CD2' && x.status === 'overdue').forEach(x => recordPayment(tgt('CD2|nvq|' + x.inst), x.amount, 'BACS-FI2D' + x.inst, 'Bank transfer', 'settled')); render();
    ok('FI2-C … the learner sees access paused, and paying everything overdue restores it', locked && !Dv.accessPaused && !odRows().some(x => x.v === 'CD2'));
    Dv.signup.pin = pin;
    back();
    ok('FI2-C back to today: unpaid instalments are no longer overdue (statuses restored)', pl(A).rows.filter(r => r.status === 'Overdue').length === 0 && pl(Dv).rows.filter(r => r.status === 'Overdue').length === 0 && !odRows().some(x => /^CD/.test(x.v || '')));
  });

  /* ================= H: batch cancellation refunds what was actually paid ================= */
  /* ================= L-4, L-3, L-6, H-5: review corrections ================= */
  await T('FI2 L-4 a payment refunded in part shows collected / refunded / net', async () => {
    const t = Dv.tx.find(x => x.amount > 0 && Dv.tx.some(y => y.amount < 0 && y.orig === x.ref)), back = Dv.tx.filter(y => y.amount < 0 && y.orig === t.ref).reduce((a, y) => a + P(-y.amount), 0);
    ok('FI2 L-4 the payment record itself is unchanged (still "Succeeded", £' + t.amount + ')', t.status === 'Succeeded' && back > 0 && back < P(t.amount));
    learner('CD2'); go('payments'); const row = $a('main table tbody tr').find(tr => tr.textContent.includes(t.ref) && !/Refund against/.test(tr.textContent));
    ok('FI2 L-4 Dev\'s transaction history: "Partially refunded — received £433.33, refunded £100.00, net £333.33" (it read "Succeeded")', !!row && /Partially refunded/.test(row.textContent) && row.textContent.includes(`received ${G(P(t.amount))}, refunded ${G(back)}, net ${G(P(t.amount) - back)}`), row && row.textContent.replace(/\s+/g, ' '));
    FA(); go('f-ledger'); const lr = allTx().find(x => x.ref === t.ref && x.v === 'CD2');
    ok('FI2 L-4 Finance ledger: "Partially refunded"; Raise refund still offers it with the remainder', lr.status === 'Partially refunded' && (() => { ACT.finRaise(); const o = $a('#rf-tx option').some(x => x.value.startsWith(t.ref + '|')); closeModal(); return o; })() && P(refundable(lr)) === P(t.amount) - back);
  });
  await T('FI2 L-3 every receipt of a part-paid instalment is kept', async () => {
    const r = pl(A).rows[3], n0 = A.tx.length;
    learner('CD1'); go('payments'); fxFast(ff => { ACT.payInst({ dataset: { e: 'nvq', n: String(r.n) } }); const pr = $1('#modal-root input[name="payamt"][value="part"]'); pr.checked = true; INP.payAmt(pr); $1('#partAmt').value = '100'; prim(); ff(3000); closeModal(); });
    FA(); recordPayment(tgt('CD1|nvq|' + r.n), 50, 'BACS-FI2L3', 'Bank transfer', 'part');
    ok('FI2 L-3 two payments (£100 card, £50 transfer): exactly two transactions, two receipts with their own amounts, paid £150.00', A.tx.length === n0 + 2 && (r.receipts || []).length === 2 && J(r.receipts.map(x => P(x.amount))) === J([10000, 5000]) && P(r.paid) === 15000, J(r.receipts));
    learner('CD1'); go('dashboard'); go('payments'); const btns = $a('main [data-act="fiRcp"]').filter(b => b.dataset.n === String(r.n));
    ok('FI2 L-3 after moving away and back, the learner sees both receipts on that instalment', btns.length === 2 && btns[0].textContent.includes('£100.00') && btns[1].textContent.includes('£50.00'));
    click(btns[0]); ok('FI2 L-3 the first receipt\'s preview shows its own £100.00 (the preview showed the row\'s total under the last number)', /Receipt/.test(MODAL.title) && /£100\.00/.test(mtxt()) && /2 payments/.test(mtxt())); closeModal();
    FA(); go('f-learner', { id: A.me.id, tab: 'payments' }); ok('FI2 L-3 Finance learner → Payments lists both receipts', r.receipts.every(x => main().includes(x.no)));
  });
  await T('FI2 L-6 an observation fee belongs to the programme, not its title', async () => {
    const t0 = chFees().length, pid = A.signup.prog;
    const f1 = chFees().find(f => f.lid === A.me.id) || chFeeRaise(A.me.id, A.nvq.title, D(80), 'CD1');
    ok('FI2 L-6 Amira\'s fee records the programme ID (' + pid + ')', !!f1 && f1.pid === pid);
    const title0 = A.nvq.title; A.nvq.title = title0 + ' (renamed)'; render(); const n1 = chFees().filter(f => f.lid === A.me.id).length; A.nvq.title = title0; render();
    ok('FI2 L-6 renaming the programme raises no second fee (it did: fees were keyed by title)', n1 === 1);
    A.signup.prog = 'TEST-PROG-B'; const f2 = chFeeRaise(A.me.id, A.nvq.title, D(81), 'CD1'); A.signup.prog = pid; // test-only: another programme with the same display title
    ok('FI2 L-6 two obligations with the same title and different programmes are separate', !!f2 && f2 !== f1 && f2.pid === 'TEST-PROG-B' && chFeeOf(A.me.id, A.nvq.title, pid) === f1 && chFeeOf(A.me.id, A.nvq.title, 'TEST-PROG-B') === f2);
    chFees().splice(chFees().indexOf(f2), 1);
  });
  await T('FI2 H-5 the last seat', async () => {
    const b = cdBatch(), cap0 = b.cap, e0 = b.enrolled; b.cap = e0 + 1;
    const gus = register('Gus Last', 'gus.last@fi2.example'); toPayment(gus); choose('instalment', 'card');
    const hal = register('Hal Late', 'hal.late@fi2.example'); toPayment(hal); choose('instalment', 'card');
    // Hal opens the checkout for the last seat; Gus's own payment completes first (a second account, in sequence)
    signIn('hal.late@fi2.example'); go('admission'); choose('instalment', 'card'); click($1('main [data-act="suPay"]')); const halPay = MODAL && MODAL.actions.find(x => /Pay securely/.test(x.label || '')); const hn0 = hal.tx.length;
    const ok1 = chComplete(gus, { opt: 'instalment', method: 'bank', amount: 300, ref: 'IA-GUS-1' });
    ok('FI2 H-5 Gus takes the last seat (' + e0 + ' → ' + b.enrolled + ' of ' + b.cap + ')', ok1 !== false && b.enrolled === e0 + 1 && gus.signup.done);
    const res = fxFast(ff => { const r = halPay.fn(); ff(3000); return r; }); closeModal();
    ok('FI2 H-5 Hal\'s stale checkout is refused at "Pay securely": nothing charged, no seat, capacity not exceeded', res === false && hal.tx.length === hn0 && !hal.signup.done && b.enrolled === e0 + 1 && b.enrolled <= b.cap && ADMIN.audit.some(x => x.action === 'Blocked: batch full at payment'));
    signIn('hal.late@fi2.example'); go('admission'); const hb = $1('main [data-act="suPay"]'); if (hb) click(hb); else ACT.suPay(); ok('FI2 H-5 Hal again (the page now says the batch is full' + (hb ? '' : ' — no Pay button') + '): no checkout, nothing charged', !(MODAL && /Pay now/.test(MODAL.title || '')) && hal.tx.length === hn0); closeModal();
    ok('FI2 H-5 a completion for the full batch (bank transfer) is refused too', chComplete(hal, { opt: 'instalment', method: 'bank', amount: 300, ref: 'IA-HAL-1' }) === false && b.enrolled === e0 + 1);
    signIn('gus.last@fi2.example'); go('admission'); const btn = !!$1('main [data-act="suPay"]'); ACT.suPay(); ok('FI2 H-5 Gus repeating the sign-up payment (no button any more; a direct call) takes no second seat', !btn && b.enrolled === e0 + 1 && gus.signup.done); closeModal();
    b.cap = cap0;
  });
  await T('FI2-R Dev\'s ledger, reconciled in pence before and after the cancellation refunds', async () => {
    const pos = Dv.tx.filter(t => t.amount > 0 && t.status === 'Succeeded'), negs = Dv.tx.filter(t => t.amount < 0);
    const gross = pos.reduce((a, t) => a + P(t.amount), 0), done = negs.reduce((a, t) => a + P(-t.amount), 0), open = ADMIN.queue.filter(i => i.type === 'Refund' && i.data && i.data.v === 'CD2' && isOpen(i)).reduce((a, i) => a + P(i.amount), 0);
    R.push('INFO FI2-R Dev receipts: ' + pos.map(t => `${t.ref} ${G(P(t.amount))} (${t.desc})`).join(' | '));
    R.push('INFO FI2-R Dev refunds processed: ' + (negs.map(t => `${t.ref} −${G(P(-t.amount))} against ${t.orig}`).join(' | ') || 'none') + ' · open refund requests: ' + G(open));
    R.push('INFO FI2-R Dev gross ' + G(gross) + ' · refunded ' + G(done) + ' · net ' + G(gross - done) + ' · remaining refundable ' + G(gross - done - open));
    FA(); go('f-learner', { id: Dv.me.id, tab: 'payments' });
    ok('FI2-R Finance shows Dev\'s gross, refunded and net from the same records', main().includes(`Received ${G(gross)} · refunded ${G(done)} · net received ${G(gross - done)}`));
    ok('FI2-R the refundable remainders add up to net less open requests', pos.reduce((a, t) => a + P(refundable(allTx().find(x => x.ref === t.ref && x.v === 'CD2' && !x.refund))), 0) === gross - done - open);
  });
  await T('FI2-H batch cancellation', async () => {
    // Independently: each learner's receipts toward the programme, less refunds already made against each of them
    const expect = w => w.tx.filter(t => t.amount > 0 && t.status === 'Succeeded' && (t.desc.includes(CD_T) || /Offline payment|instalment/.test(t.desc))).map(t => [t.ref, P(t.amount) - w.tx.filter(x => x.amount < 0 && x.orig === t.ref).reduce((a, x) => a + P(-x.amount), 0)]).filter(x => x[1] > 0);
    const ea = expect(A), ed = expect(Dv), q0 = ADMIN.queue.length, net = w => w.tx.reduce((a, t) => a + (t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status) ? P(t.amount) : t.amount < 0 ? -P(-t.amount) : 0), 0), dNet = net(Dv);
    ACA(); ACT.cancelBatch({ dataset: { id: CD_B } }); $a('#modal-root .cb-d').forEach(s => { s.value = 'refund'; }); const rs = $1('#cb-r') || $1('#rsn'); rs.value = 'Tutor unavailable'; press();
    const items = ADMIN.queue.slice(0, ADMIN.queue.length - q0).filter(i => i.type === 'Refund' && (i.data || {}).cat === 'Batch cancelled'), mine = v => items.filter(i => i.data.v === v).map(i => [i.data.tx, P(i.amount)]).sort();
    ok('FI2-H one refund request per payment, for what was actually paid (Amira ' + J(ea) + ')', J(mine('CD1')) === J(ea.sort()), J(mine('CD1')));
    ok('FI2-H Dev\'s requests take off the £100.00 already refunded (' + J(ed) + '; no fixed £300)', J(mine('CD2')) === J(ed.sort()) && items.every(i => P(i.amount) !== 30000 || i.data.v === 'CD1'), J(mine('CD2')));
    ok('FI2-H raised by the Academic Admin, Pending with a Finance Admin — nothing refunded yet', items.every(i => i.status === 'Pending' && i.raisedBy === ADMIN.me.name && ['Leila Haddad', 'Mark Bennett'].includes(i.first)) && cdBatch().status === 'Cancelled');
    R.push('INFO FI2-R Dev cancellation requests: ' + items.filter(i => i.data.v === 'CD2').map(i => `${i.data.tx} ${G(P(i.amount))}`).join(' | ') + ' · total ' + G(items.filter(i => i.data.v === 'CD2').reduce((a, i) => a + P(i.amount), 0)) + ' = net ' + G(dNet));
    ok('FI2-R Dev\'s cancellation requests total exactly his net paid (' + G(dNet) + '), and are requests (Finance review), not refunds', items.filter(i => i.data.v === 'CD2').reduce((a, i) => a + P(i.amount), 0) === dNet && items.every(i => i.data.review && !i.processed) && net(Dv) === dNet);
    const dn0 = Dv.tx.filter(x => x.amount < 0).length; FA(); // a receipt refunded in full reads Refunded on the learner's record (it was still received): net counts it
    items.filter(i => i.data.v === 'CD2').forEach(i => applyDecision(i, 'approve', 'Refund agreed'));
    ok('FI2-R after Finance approves Dev\'s requests: one refund transaction each, and his net paid is £0.00', Dv.tx.filter(x => x.amount < 0).length === dn0 + items.filter(i => i.data.v === 'CD2').length && net(Dv) === 0);
    const all = learnerAccounts().map(v => STORE.worlds[v]), lgot = all.reduce((a, w) => a + w.tx.filter(t => t.amount > 0 && ['Succeeded', 'Refunded'].includes(t.status)).reduce((s, t) => s + P(t.amount), 0), 0), lback = all.reduce((a, w) => a + w.tx.filter(t => t.amount < 0).reduce((s, t) => s + P(-t.amount), 0), 0);
    S.ui.frRange = '180'; setUi('frMode', ''); go('f-reports', { tab: 'datewise' }); const rp = $1('.fi-rep');
    ok('FI2-R the report after approval equals the ledger: received ' + G(lgot) + ', refunded ' + G(lback) + ', net ' + G(lgot - lback), +rp.dataset.received === lgot && +rp.dataset.refunded === lback && +rp.dataset.net === lgot - lback, J(rp.dataset));
    // Item 8: whoever cancels, the requests are for Finance to review — the Super Administrator's cancellation applies nothing at once
    SA(); const lena = STORE.worlds.CD3, q9 = ADMIN.queue.length; fiCancelRefunds(chFullName(lena), lena.me.id, { code: 'TEST-B', course: lena.plans[0].title }, 'test-only');
    const li = ADMIN.queue[0]; ok('FI2-H a Super Administrator\'s cancellation also raises a request only (Pending, not processed — no refund transaction)', ADMIN.queue.length === q9 + 1 && li.status === 'Pending' && !li.processed && !lena.tx.some(x => x.amount < 0)); ADMIN.queue.shift();
    const n0 = A.tx.filter(x => x.amount < 0).length, one = items.find(i => i.data.v === 'CD1'); FA(); applyDecision(one, 'approve', 'ok');
    ok('FI2-H Finance approves one: one refund transaction for exactly that amount', A.tx.filter(x => x.amount < 0).length === n0 + 1 && P(-A.tx.find(x => x.amount < 0).amount) === P(one.amount));
    const q1 = ADMIN.queue.length; fiCancelRefunds(chFullName(A), A.me.id, cdBatch(), 'again');
    ok('FI2-J a repeated cancellation raises no second refund', ADMIN.queue.length === q1);
    const q2 = ADMIN.queue.length; fiCancelRefunds('Nobody', 'IA-L-NOPE', cdBatch(), 'x');
    ok('FI2-H a learner with no recorded payment gets no invented refund — Finance review instead', ADMIN.queue.length === q2 && STORE.fin.notifs.some(x => /refund needs Finance review/.test(x.t)));
  });

  /* ================= Legacy data: agency and seeded refunds, observation fees ================= */
  fxLoadLegacy();
  await T('FI2-F agency and seeded ledger refunds write a refund transaction once', async () => {
    FA(); const t = allTx().find(x => x.payerType === 'Agency' && x.fin && x.status === 'Paid' && x.amount > 50), seats = ADMIN.bundles.reduce((a, b) => a + b.seats, 0), n0 = STORE.fin.tx.filter(x => x.refund).length;
    const i = raise(t, 50, 'goodwill'); FA('FB'); applyDecision(i, 'approve', 'ok'); const row = STORE.fin.tx.find(x => x.refund && x.orig === t.ref);
    ok('FI2-F agency payment: one −£50.00 refund transaction in the ledger, payer the agency; the payment shows Partially refunded; seats unchanged (no rule)', !!row && P(row.amount) === 5000 && row.payer === t.payer && STORE.fin.tx.filter(x => x.refund).length === n0 + 1 && STORE.fin.tx.find(x => x.ref === t.ref && !x.refund).status === 'Partially refunded' && ADMIN.bundles.reduce((a, b) => a + b.seats, 0) === seats);
    applyDecision(i, 'approve', 'again'); ok('FI2-J … approving again adds nothing', STORE.fin.tx.filter(x => x.refund).length === n0 + 1);
    go('f-ledger'); ok('FI2-F the Finance ledger lists the refund', main().includes(row.ref));
    FA(); const g = allTx().find(x => x.ref === 'TXN-90011' && /Gulf Care/.test(x.payer)), j = raise(g, 50.54, 'part'); FA('FB'); applyDecision(j, 'approve', 'ok');
    ok('FI2-F a seeded (non-Finance) ledger payment: refund transaction recorded and its status follows', STORE.fin.tx.some(x => x.refund && x.orig === 'TXN-90011' && P(x.amount) === 5054) && ADMIN.manualTx.find(x => x.ref === 'TXN-90011').status === 'Partially refunded', J([j.id, j.amount, j.status, j.processed, (j.data || {}).tx, refundable(g), ADMIN.manualTx.find(x => x.ref === 'TXN-90011').status]));
  });
  await T('FI2 M-13 an overdue pause locks only the overdue programme', async () => {
    const C = STORE.worlds.C, sc = C.enrolments.find(e => e.kind !== 'nvq' && e.status === 'Active');
    FA(); ACT.finAisha30(); learner('C');
    ok('FI2 M-13 Aisha\'s NVQ instalment is 30+ days overdue and the automatic pause applies', C.accessPaused === true && !!sc);
    S.params = { id: sc.id }; const old = _lfFI2('course');
    ok('CR M-13 OLD: the pause locked her separately paid short course "' + sc.title + '" too', !!old && /paused/i.test(old.title));
    go('course', { id: sc.id }); ok('FI2 M-13 her short course opens (no lock page)', !$1('.lockpage'));
    go('assignments'); ok('FI2 M-13 her NVQ assignments are locked', !!$1('.lockpage') && /Access paused/.test($1('.lockpage').textContent));
    go('course', { id: 'nvq' }); ok('FI2 M-13 her NVQ programme is locked', !!$1('.lockpage'));
    FA(); ACT.chPause({ dataset: { l: C.me.id, e: chEnrolKey(sc) } }); reason('Test'); learner('C'); go('course', { id: sc.id });
    ok('FI2 M-13 a manual pause (CH-14) of the short course locks it (per enrolment, unchanged)', !!$1('.lockpage'));
    FA(); ACT.chRestore({ dataset: { l: C.me.id, e: chEnrolKey(sc) } }); reason('Restored');
    const o = odRows().find(x => x.v === 'C' && x.status === 'overdue'); ACT.odRestore({ dataset: { id: o.id } }); $1('#ra-dt').value = D(10).slice(0, 10); $1('#rsn').value = 'Arrangement'; press();
    learner('C'); go('assignments'); ok('FI2 M-13 a payment arrangement restores her NVQ access', !C.accessPaused && !$1('.lockpage'));
  });
  await T('FI2 M-9 an agency card payment left pending is resolved once', async () => {
    const buy = (st, q) => { AGY('AG-02'); const c = AGY_CATALOGUE()[0]; S.agy.buy = { c, qty: q }; agCheckout(); $1('#gc-o').value = st; prim(); const p = STORE.agy.purchases[0]; closeModal(); return { p, ag: AGN() }; };
    const seatsOf = ag => ADMIN.bundles.filter(b => b.agency === ag).reduce((s, b) => s + b.seats, 0), t0 = STORE.fin.tx.length;
    const f = buy('failed', 3); ok('FI2 M-9 a failed or cancelled card payment: no payment record, no seats, nothing for Finance', f.p.status === 'Failed' && STORE.fin.tx.length === t0 && !STORE.fin.pending.some(x => x.agyRef === f.p.ref));
    const s0 = seatsOf(f.ag), { p } = buy('pending', 4);
    ok('FI2 M-9 a pending payment: no seats, no payment record, no receipt — and Finance sees it in Payment Pending', p.status === 'Pending' && seatsOf(f.ag) === s0 && !STORE.fin.tx.some(x => x.ref === p.ref) && STORE.fin.pending.some(x => x.agyRef === p.ref && x.status === 'Pending'));
    FA(); go('f-exceptions'); ok('FI2 M-9 Finance → Payment Pending offers Mark as confirmed / Mark as failed for it', !!$1(`main [data-act="ppConfirm"][data-id="PP-${p.ref}"]`) && !!$1(`main [data-act="ppFail"][data-id="PP-${p.ref}"]`));
    role('bizA'); ACT.ppConfirm({ dataset: { id: 'PP-' + p.ref } }); ok('FI2 M-9 a Business Admin can\'t confirm it', !MODAL && p.status === 'Pending'); closeModal();
    FA(); ACT.ppConfirm({ dataset: { id: 'PP-' + p.ref } }); reason('Gateway confirmed');
    const tx = STORE.fin.tx.filter(x => x.ref === p.ref);
    ok('FI2 M-9 confirmed: exactly 4 seats credited, one payment record of ' + G(P(p.amount)) + ' with its receipt and VAT snapshot; the agency\'s purchase reads Paid', p.status === 'Paid' && seatsOf(f.ag) === s0 + 4 && tx.length === 1 && P(tx[0].amount) === P(p.amount) && tx[0].receipt === 'RCP-' + p.ref.slice(-5) && 'vatPct' in tx[0]);
    ACT.ppConfirm({ dataset: { id: 'PP-' + p.ref } }); ok('FI2 M-9 confirming again changes nothing', !MODAL && seatsOf(f.ag) === s0 + 4 && STORE.fin.tx.filter(x => x.ref === p.ref).length === 1); closeModal();
    const q = buy('pending', 2).p; FA(); ACT.ppFail({ dataset: { id: 'PP-' + q.ref } }); reason('Gateway: not captured');
    ok('FI2 M-9 marked failed: no seats, no payment record; the agency\'s purchase reads Failed', q.status === 'Failed' && seatsOf(f.ag) === s0 + 4 && !STORE.fin.tx.some(x => x.ref === q.ref));
  });
  await T('FI2 L-7 agency VAT totals in whole pence', async () => {
    agyEnter('AG-02', true); const c = AGY_CATALOGUE().map(x => ({ ...x, vatPct: 20 })), bad = [];
    c.forEach(x => [1, 3, 7, 10, 27].forEach(q => { const p = priceFor(x, q); if (Math.round(p.total * 100) / 100 !== p.total || P(p.total) !== P(p.net) + P(p.vat)) bad.push([x.id, q, p.total]); }));
    ok('FI2 L-7 every agency price at 20% VAT is net + VAT = total, stored in whole pence', c.length > 0 && !bad.length, J(bad.slice(0, 3)));
  });
  await T('FI2-G observation fees are non-refundable (CH-40)', async () => {
    FA(); const t = allTx().find(x => /^Observation fee/.test(x.course) && x.status === 'Paid'), q0 = ADMIN.queue.length;
    raiseRefund(t); ok('FI2-G raising a refund of an observation fee is refused (CH-40); nothing raised', !MODAL && ADMIN.queue.length === q0 && /non-refundable/.test(($1('#toasts') || {}).textContent || '')); closeModal();
    const it = newRefund(t, 10, 'Other', 'direct', 'Retain access'); ADMIN.queue.unshift(it); FA('FB');
    ok('FI2-G approving one made directly is refused too', applyDecision(it, 'approve', 'x') === false && it.status === 'Pending');
  });
  await T('FI2 legacy overdue process unchanged; admin console overdue', async () => {
    FA(); const rows = odRows(); ok('FI2 the legacy overdue rows (seeded and Aisha) are still listed, and no legacy persona was added', rows.some(o => o.v === 'C') && rows.some(o => !o.v) && !rows.some(o => o.v && FI_LEGACY.includes(o.v) && o.v !== 'C' && o.v !== 'A'));
    SA(); go('a-finance', { tab: 'overdue' }); ok('FI2 the admin console\'s Overdue management lists the real overdue rows (no fixed £350 rows)', $a('main tbody tr').length === rows.filter(o => o.status !== 'discontinued').length);
    const o = rows.find(x => x.status === 'overdue' && !x.v); ACT.discNonPay({ dataset: { n: o.name } }); ok('FI2 H-7 its Discontinue opens the real action (it only toasted)', !!MODAL && /Discontinue enrolment for non-payment/.test(MODAL.title)); closeModal();
  });

  /* ================= Reset ================= */
  await T('FI2-Z client demo reset', async () => {
    fxLoadClient(); ok('FI2-Z loading the client demo restores the starting records', snapCD() === cd0 && !Object.keys(STORE.worlds).some(k => /^G\d*$/.test(k)) && !((STORE.cbRem || {}).offset), snapCD());
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
