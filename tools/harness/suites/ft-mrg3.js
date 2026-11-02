// MR-G3 — learner and agency portal integrity (2 Nov 2026; PD-MRG3-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Client demo first (the bank-transfer journey in pence for Tom and Amira, the certificate lifecycle and quiz retake for Lena, the
// cross-learner matrix, agency consent and the client agency notification), then the legacy data (the seeded gateway-pending card
// payment, agency threads, seats and the seeded certificates), then the client demo again. Test-only records (consent requests, a
// receive-only flag) are made on data the next fixture load discards. Each refusal is checked for zero mutation.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'MR-G3 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const P = x => Math.round((+x || 0) * 100);
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const Wk = k => STORE.worlds[k];
  const snapW = k => { const w = Wk(k); return J({ p: w.plans, t: w.tx, c: w.certs, e: w.enrolments, n: w.notifs, nv: w.nvq && [w.nvq.status, w.nvq.start, w.nvq.end], q: w.quiz || null, r: w.requests }); };
  const snapMoney = () => J({ w: Object.keys(STORE.worlds).map(k => [k, Wk(k).plans, Wk(k).tx, Wk(k).nvq && [Wk(k).nvq.status, Wk(k).nvq.start, Wk(k).nvq.end]]), b: STORE.chBank || [], f: STORE.fin && [STORE.fin.tx, STORE.fin.pending] });
  const tryDo = f => { try { const r = f(); return { r, threw: '' }; } catch (e) { return { threw: e.message }; } };
  const nvqPl = w => w.plans.find(p => p.e === 'nvq');
  const owedP = pl => pl.rows.reduce((a, r) => a + Math.max(0, P(r.amount) - P(r.paid) - P(r.credit || 0)), 0);
  const outOf = (re, t) => { const m = t.match(re); return m ? P(m[1].replace(/,/g, '')) : -1; };
  // The same outstanding figure from the learner's Payments, Finance's learner detail, the Super Admin's Learner 360 and fiAcct
  const views = w => {
    learner(w._k); go('payments'); const l = outOf(/Outstanding\s*£([\d,\.]+)/, main());
    FA(); go('f-learner', { id: w.me.id, tab: 'payments' }); const f = outOf(/Outstanding\s*£([\d,\.]+)/, main());
    SA(); go('a-learners', { id: w.me.id, tab: 'payments' }); const s = outOf(/Outstanding\s*£([\d,\.]+)/, main());
    return { l, f, s, a: fiAcct(w).outstanding };
  };
  Object.keys(STORE.worlds).forEach(k => { STORE.worlds[k]._k = k; });

  /* ================= Client demo ================= */
  await T('MR-01 Tom: a bank transfer is never confirmed by the learner', async () => {
    const tom = Wk('CD5'); learner('CD5'); go('payments');
    const pl = nvqPl(tom), r2 = pl.rows[1]; ACT.chPayBank({ dataset: { e: 'nvq', n: String(r2.n) } }); press();
    ok('MR-01 Tom tells the Academy he made the transfer for instalment 2: it is "Awaiting confirmation" for Finance', r2.confirming && (STORE.chBank || []).some(x => x.wv === 'CD5' && x.n === r2.n && x.status === 'Awaiting confirmation'));
    go('payments');
    ok('MR-01 Tom\'s Payments has no "Prototype: bank confirms" link (E-01 original click path)', !$1('main [data-act="confirmPay"]') && !/Prototype: bank confirms/.test(main()) && /Finance confirms it when the money arrives/.test(main()), (main().match(/We're confirming.{0,120}|Bank transfer awaiting.{0,120}/) || [''])[0]);
    const m0 = snapMoney(), w0 = snapW('CD5'), s0 = sec(), a0 = aud();
    const x = tryDo(() => ACT.confirmPay({ dataset: { id: 'nvq' } }));
    ok('MR-01 direct ACT.confirmPay as Tom is refused: no paid instalment, receipt, transaction or enrolment change (zero mutation)', !x.threw && x.r === false && snapMoney() === m0 && snapW('CD5') === w0 && pl.rows[0].status !== 'Paid' && !pl.rows.some(r => r.receipt === 'RCP-27118'), x.threw || J(pl.rows[0]));
    ok('MR-01 … and the refusal is logged', sec() === s0 + 1 && aud() > a0 && /Blocked: confirm a pending payment/.test(ADMIN.audit[0].action) && /Finance records it/.test(ADMIN.audit[0].reason));
    ok('MR-01 Tom: still £0.00 received and 0 transactions; deposit still unconfirmed', tom.tx.length === 0 && pl.deposit.status !== 'Paid');
  });
  await T('MR-01 Amira: her real receipt is never overwritten; Finance confirms the transfer through the normal path; all views agree in pence', async () => {
    const am = Wk('CD1'), pl = nvqPl(am), r1 = pl.rows[0], r2 = pl.rows[1], rc1 = r1.receipt, tx0 = am.tx.length, own0 = owedP(pl);
    learner('CD1'); ACT.chPayBank({ dataset: { e: 'nvq', n: String(r2.n) } }); press(); go('payments');
    ok('MR-01 Amira: no "Prototype: bank confirms" link on her bank transfer', !$1('main [data-act="confirmPay"]'));
    const m0 = snapMoney(); ACT.confirmPay({ dataset: { id: 'nvq' } });
    ok('MR-01 direct ACT.confirmPay as Amira: her instalment 1 receipt ' + rc1 + ' is kept, instalment 2 unpaid, nothing changes', snapMoney() === m0 && r1.receipt === rc1 && P(r2.paid) === 0 && am.tx.length === tx0);
    const v0 = views(am);
    ok('MR-01 before Finance records it: learner, Finance, Super Admin and fiAcct all show ' + money(own0 / 100, 'GBP') + ' outstanding', [v0.l, v0.f, v0.s, v0.a].every(x => x === own0), J(v0));
    const b = STORE.chBank.find(x => x.wv === 'CD1' && x.n === r2.n && x.status === 'Awaiting confirmation');
    FA(); ACT.fcAwRec({ dataset: { r: b.ref } }); ok('MR-01 Finance: Record offline payment opens on Amira\'s transfer', !!MODAL && P(+$1('#op-a').value) === P(r2.amount));
    $1('#op-r').value = b.ref; INP.opPrev(); reason('Bank statement checked');
    ok('MR-01 Finance confirms it: instalment 2 Paid in full, one new £' + (P(r2.amount) / 100).toFixed(2) + ' bank-transfer transaction, transfer Confirmed', r2.status === 'Paid' && P(r2.paid) === P(r2.amount) && am.tx.length === tx0 + 1 && P(am.tx[0].amount) === P(r2.amount) && am.tx[0].method === 'Bank transfer' && b.status === 'Confirmed' && r1.receipt === rc1, J([r2, b.status, am.tx.length - tx0]));
    const v1 = views(am), exp = own0 - P(r2.amount);
    ok('MR-01 after Finance records it: every view agrees in pence (' + money(exp / 100, 'GBP') + ')', [v1.l, v1.f, v1.s, v1.a].every(x => x === exp) && owedP(pl) === exp, J(v1));
  });

  await T('MR-43 / MR-11 / MR-42 Lena: quiz retake, certificate lifecycle on the learner side', async () => {
    learner('CD3'); const e = W.enrolments.find(x => x.kind === 'short'), n0 = W.certs.length;
    const take = (mid, right) => { ACT.startQuiz({ dataset: { id: e.id, m: mid } }); if (!MODAL) return 'no-start'; prim(); if (!W.quiz) return 'no-quiz'; S1Q().forEach((x, i) => { W.quiz.ans[i] = right ? x[2] : (x[2] + 1) % x[1].length; }); ACT.quizSubmit(); prim(); const r = W.quiz && W.quiz.result; W.quiz = null; closeModal(); return r ? r.result : 'none'; };
    ACT.openItem({ dataset: { e: e.id, id: 'c1' } }); closeModal();
    // Open the m1 dialog now, pass m1 meanwhile, then confirm the stale dialog
    ACT.startQuiz({ dataset: { id: e.id, m: 'm1' } }); const hm = MODAL, ha = primA(); closeModal();
    ok('MR-43 pass the Module 1 quiz', take('m1', true) === 'Pass');
    ACT.shModPick({ dataset: { e: e.id, m: 'm1' } }); ok('MR-43 the quiz tab offers no start for a passed module (the displayed rule)', !$1(`main [data-act="startQuiz"][data-m="m1"]`) && /Module 1 passed/.test(main()));
    const m1 = e.modules[0], k0 = m1.quiz.attempts.length, a0 = aud();
    ok('MR-43 direct ACT.startQuiz on the passed Module 1 is refused (E-08 original call); no attempt, no quiz session', take('m1', true) === 'no-start' && m1.quiz.attempts.length === k0 && !W.quiz && /already passed/.test(ADMIN.audit[0].action) && aud() === a0 + 1);
    MODAL = hm; renderModal(); const st = ha.fn(); closeModal();
    ok('MR-43 a start dialog opened before the pass is refused when confirmed', st === false && !W.quiz && m1.quiz.attempts.length === k0);
    ['c2', 'c4'].forEach(id => fxFast(ff => { ACT.openItem({ dataset: { e: e.id, id } }); ACT.vidPlay(); ff(12000); closeModal(); }));
    ok('MR-43 the authorised path still works: Module 2 quiz starts and is passed', take('m2', true) === 'Pass');
    ACT.openItem({ dataset: { e: e.id, id: 'c5' } }); closeModal(); take('m3', true);
    const cert = W.certs.find(c => c.id === e.certId);
    ok('MR-42 completion issues one certificate; the learner can view it', e.status === 'Completed' && W.certs.length === n0 + 1 && !!cert && cert.status === 'Valid' && (ACT.viewCert({ dataset: { id: cert.id } }), !!MODAL && /Download PDF/.test(J(MODAL.actions.map(a => a.label)))), J(cert && cert.status));
    closeModal();
    const no0 = cert.no; ACT.simIssue({ dataset: { id: cert.id } });
    ok('MR-11 simIssue on a Valid certificate is refused (no new number)', cert.no === no0 && cert.status === 'Valid');
    SA(); ACT.revokeCert({ dataset: { k: 'CD3:' + cert.id } }); reason('Issued in error (MR-G3 test)');
    ok('MR-11 the Super Admin revokes it', cert.status === 'Revoked');
    learner('CD3'); go('certificates');
    ok('MR-42 the learner sees it Revoked and its View / Download PDF button disabled', /Revoked/.test(main()) && $a('main [data-act="viewCert"]').filter(b => b.dataset.id === cert.id).every(b => b.disabled));
    const w0 = snapW('CD3'), s0 = sec();
    const v = tryDo(() => ACT.viewCert({ dataset: { id: cert.id } }));
    ok('MR-42 direct ACT.viewCert on the revoked certificate opens nothing (E-06); logged', !v.threw && !MODAL && sec() === s0 + 1 && snapW('CD3') === w0, v.threw);
    closeModal(); const s1 = sec();
    const x = tryDo(() => ACT.simIssue({ dataset: { id: cert.id } }));
    ok('MR-11 direct ACT.simIssue on the revoked certificate is refused (E-02): still Revoked, same number, no "issued" notice; logged', !x.threw && cert.status === 'Revoked' && cert.no === no0 && snapW('CD3') === w0 && sec() === s1 + 1, cert.status + ' ' + cert.no);
  });

  await T('MR-41 cross-learner matrix: Amira acting on Lena\'s records', async () => {
    const L = Wk('CD3'), le = L.enrolments.find(x => x.kind === 'short'), lc = L.certs[0], ln = L.notifs[0];
    learner('CD1'); const snap = () => J([snapW('CD1'), snapW('CD3')]), s0 = snap(), res = {};
    [['openNotif', { id: ln && ln.id }], ['viewCert', { id: lc && lc.id }], ['simIssue', { id: lc && lc.id }], ['startQuiz', { id: le.id, m: 'm1' }], ['repurchase', { id: le.id }], ['confirmPay', { id: le.id }]].forEach(([k, d]) => {
      const x = tryDo(() => ACT[k]({ dataset: d })); res[k] = x.threw ? 'threw ' + x.threw : (MODAL ? 'modal ' + (MODAL.title || '') : 'refused'); closeModal();
    });
    ok('MR-41 openNotif / viewCert / startQuiz / repurchase (and simIssue, confirmPay) with Lena\'s ids: no TypeError, no dialog', Object.values(res).every(r => r === 'refused'), J(res));
    ok('MR-41 … zero mutation of Amira\'s and Lena\'s records', snap() === s0);
    ok('MR-41 … nothing of Lena is shown', !/Lena/.test(main()));
    const n = W.notifs[0]; if (n) { n.unread = true; ACT.openNotif({ dataset: { id: n.id } }); ok('MR-41 Amira\'s own notification still opens', n.unread === false); }
  });

  await T('MR-12 consent is answered only by its learner (client demo)', async () => {
    const lena = Wk('CD3'), L = allLearners().find(l => l.id === lena.me.id), am = Wk('CD1'), LA = allLearners().find(l => l.id === am.me.id);
    AGY('AG-02'); const c = agyRequestConsent(L, L.email, 'Infection Prevention and Control', 'MR-G3 test'), c2 = agyRequestConsent(LA, LA.email, 'Infection Prevention and Control', 'MR-G3 test');
    ok('MR-12 test requests raised for Lena and Amira', !!c.id && !!c2.id, J([c.err, c2.err]));
    const st = () => J([c.status, c2.status, STORE.agy.linked, STORE.agy.lmails.filter(m => m.cid === c.id || m.cid === c2.id).map(m => [m.used, m.btn]), ADMIN.queue.length]);
    const tries = [['the requesting agency (AG-02)', () => AGY('AG-02')], ['another learner (Amira)', () => learner('CD1')], ['the Super Admin', () => SA()], ['the learner inbox with a different email open', () => go('m-inbox', { id: 'LM-K' + c2.id })]];
    tries.forEach(([who, as]) => { as(); const s0 = st(), q0 = sec(); const x = tryDo(() => ACT.consentDo({ dataset: { id: c.id, y: '1' } }));
      ok(`MR-12 ${who} cannot answer Lena's consent: refused, zero mutation, logged`, !x.threw && c.status === 'Awaiting learner consent' && st() === s0 && sec() === q0 + 1, x.threw || c.status); });
    AGY('AG-02'); ok('MR-12 the agency still sees no linked learner (D-03 / D-03 E: no name, email or mobile exposed)', !inRoster(L.id));
    learner('CD3'); go('dashboard'); click($1(`main [data-act="consentDo"][data-id="${c.id}"][data-y="1"]`));
    ok('MR-12 Lena approves from her dashboard: Linked', c.status === 'Linked' || c.status === 'Awaiting Academy approval', c.status);
    go('m-inbox', { id: 'LM-K' + c2.id }); click($1(`[data-act="consentDo"][data-id="${c2.id}"][data-y="0"]`));
    ok('MR-12 Amira declines from her own consent email (the emailed-link path)', c2.status === 'Declined');
  });

  await T('MR-38 client agency notifications reference no missing consent', async () => {
    AGY('AG-02'); go('g-notifs');
    ok('MR-38 CarePlus notifications show no "undefined" (GN-K1 refers to CON-04, absent from the client demo)', !/undefined/.test(main()) && !STORE.agy.notifs.some(n => n.id === 'GN-K1'), (main().match(/.{0,60}undefined.{0,40}/) || [''])[0]);
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy(); Object.keys(STORE.worlds).forEach(k => { STORE.worlds[k]._k = k; });
  await T('MR-38 legacy keeps GN-K1 with Megan Roberts\' email', async () => {
    agyConsents(); const n = STORE.agy.notifs.find(x => x.id === 'GN-K1');
    ok('MR-38 legacy: GN-K1 present and names the expired request\'s email', !!n && !/undefined/.test(n.b) && n.b.includes(agyConsents().find(c => c.id === 'CON-04').email));
  });
  await T('MR-01 legacy: Finance confirms the seeded gateway-pending card payment (TXN-90017)', async () => {
    const A = Wk('A'), e = A.enrolments.find(x => x.id === 'fire'), pl = A.plans.find(p => p.e === 'fire'), tx = A.tx.find(t => t.ref === 'TXN-90017'), pp = STORE.fin.pending.find(p => p.payer === 'Daniel Okafor' && p.status === 'Pending');
    ok('MR-01 legacy seed: Fire Safety Awareness Payment Pending, one card transaction TXN-90017 for the same amount', e.status === 'Payment Pending' && tx.status === 'Payment Pending' && P(tx.amount) === P(pl.rows[0].amount) && !!pp);
    FA(); go('f-exceptions'); ACT.ppConfirm({ dataset: { id: pp.id } }); reason('Gateway confirmed');
    ok('MR-01 Finance "Mark as confirmed" still confirms it: course Active, that row Paid for its own amount, receipt from TXN-90017, transaction Succeeded', pp.status === 'Confirmed' && e.status === 'Active' && pl.rows[0].status === 'Paid' && P(pl.rows[0].paid) === P(pl.rows[0].amount) && pl.rows[0].receipt === 'RCP-90017' && tx.status === 'Succeeded', J([pp.status, e.status, pl.rows[0]]));
  });
  fxLoadLegacy(); Object.keys(STORE.worlds).forEach(k => { STORE.worlds[k]._k = k; });
  await T('MR-01 legacy: the learner-side prototype gateway confirmation acts on that exact row only', async () => {
    const A = Wk('A'), e = A.enrolments.find(x => x.id === 'fire'), pl = A.plans.find(p => p.e === 'fire'), tx = A.tx.find(t => t.ref === 'TXN-90017'), pp = STORE.fin.pending.find(p => p.payer === 'Daniel Okafor' && p.status === 'Pending');
    AGY('AG-02'); const m0 = snapMoney(), s0 = sec(); ACT.confirmPay({ dataset: { id: 'fire' } });
    ok('MR-01 the agency portal cannot confirm it (zero mutation, logged)', snapMoney() === m0 && sec() === s0 + 1);
    const others = J(A.plans.filter(p => p !== pl));
    learner('A'); go('payments'); const link = $1('main [data-act="confirmPay"]');
    ok('MR-01 legacy: the "Prototype: bank confirms" link shows only on the card payment awaiting the gateway', !!link && link.dataset.id === 'fire' && $a('main [data-act="confirmPay"]').length === 1);
    click(link);
    ok('MR-01 legacy: it confirms that row (its own amount, receipt RCP-90017, TXN-90017 Succeeded) and the matching Finance pending item, nothing else', e.status === 'Active' && pl.rows[0].status === 'Paid' && P(pl.rows[0].paid) === P(pl.rows[0].amount) && pl.rows[0].receipt === 'RCP-90017' && tx.status === 'Succeeded' && pp.status === 'Confirmed' && J(A.plans.filter(p => p !== pl)) === others);
    const m1 = snapMoney(), s1 = sec(); ACT.confirmPay({ dataset: { id: 'fire' } });
    ok('MR-01 legacy: confirming again changes nothing (logged)', snapMoney() === m1 && sec() === s1 + 1);
    const cc = A.plans.find(p => p.e === 'cc'), m2 = snapMoney(); ACT.confirmPay({ dataset: { id: 'cc' } });
    ok('MR-01 legacy: another course\'s plan can\'t be confirmed through it', snapMoney() === m2 && (!cc || !cc.rows.some(r => r.receipt === 'RCP-27118')));
  });
  await T('MR-11 / MR-42 legacy seeded certificates', async () => {
    learner('A'); const rev = W.certs.find(c => c.status === 'Revoked'), val = W.certs.find(c => c.status === 'Valid'), pr = W.certs.find(c => c.status === 'Processing');
    const w0 = snapW('A'); ACT.simIssue({ dataset: { id: rev.id } }); ACT.viewCert({ dataset: { id: rev.id } });
    ok('MR-11 / MR-42 the seeded revoked certificate can\'t be re-issued or opened', !MODAL && rev.status === 'Revoked' && snapW('A') === w0); closeModal();
    ACT.viewCert({ dataset: { id: pr.id } }); ok('MR-42 a certificate still processing has nothing to view yet', !MODAL); closeModal();
    ACT.viewCert({ dataset: { id: val.id } }); ok('MR-42 a valid certificate still opens with Download PDF', !!MODAL && /Download PDF/.test(J(MODAL.actions.map(a => a.label)))); closeModal();
    ACT.simIssue({ dataset: { id: pr.id } }); ok('MR-11 the authorised path: "Prototype: certificate issued" issues the Processing certificate', pr.status === 'Valid' && /^WEL-/.test(pr.no));
  });
  await T('MR-13 agency replies only in its own, writable threads', async () => {
    const CP = 'CarePlus Recruitment (demo)', th = ADMIN.threads.find(t => t.party === CP);
    const reply = (id, txt) => { let g = document.getElementById('grep'), made = false; if (!g) { g = document.createElement('textarea'); g.id = 'grep'; document.body.appendChild(g); made = true; } g.value = txt; const x = tryDo(() => SUBMIT.agReply({ dataset: { id } })); if (made) g.remove(); return x; };
    AGY('AG-03'); const s0 = J(th), q0 = sec(); const x = reply(th.id, 'Gulf injects into CarePlus thread');
    ok('MR-13 AG-03 replying in a CarePlus thread is refused (D-04): no message, status unchanged, logged', !x.threw && J(th) === s0 && sec() === q0 + 1, x.threw);
    learner('A'); const q1 = sec(); reply(th.id, 'learner'); ok('MR-13 … and from the learner portal', J(th) === s0 && sec() === q1 + 1);
    AGY('AG-02'); const ag = AG(), p0 = ag.perms; ag.perms = 'Receive-only'; const q2 = sec(); reply(th.id, 'while receive-only');
    ok('MR-13 a receive-only agency cannot reply in its own thread', J(th) === s0 && sec() === q2 + 1); ag.perms = p0;
    go('g-messages', { id: th.id }); const n0 = th.msgs.length; if ($1('#grep')) { $1('#grep').value = 'Own reply (MR-G3 test)'; SUBMIT.agReply({ dataset: { id: th.id } }); }
    ok('MR-13 CarePlus can still reply in its own thread', th.msgs.length === n0 + 1 && /Own reply/.test(th.msgs[th.msgs.length - 1][2]));
  });
  await T('MR-34 one seat per learner and course', async () => {
    AGY('AG-02'); const b = agyBundles().find(x => left(x) >= 2 && bStatus(x) !== 'Expired' && x.courses.some(c => !/Diploma/.test(c))), course = b && b.courses.find(c => !/Diploma/.test(c));
    const free = agyRoster().filter(l => l.acct !== 'Deactivated' && !agyOtherSponsor(l, course) && !STORE.agy.assign.some(a => a.lid === l.id && sameCourse(a.course, course) && ['Active', 'Approved', 'Under review', 'Admission pending'].includes(a.status)) && !(l.v && Wk(l.v).enrolments.some(e => (e.base || e.title).startsWith(course) && e.status === 'Active')));
    ok('MR-34 setup: a CarePlus bundle with seats and two roster learners not on ' + course, !!b && free.length >= 2, J([b && b.id, free.length]));
    const L1 = free[0], L2 = free[1], u0 = b.used, n1 = agyDoAssign(b, course, [L1.id], true);
    ok('MR-34 authorised: assigning a learner uses one seat', n1 === 1 && b.used === u0 + 1);
    const snap = () => J([b.used, STORE.agy.assign.length, STORE.agy.ledger.length, L1.v ? Wk(L1.v).enrolments.length : 0]), s0 = snap(), a0 = aud();
    const n2 = agyDoAssign(b, course, [L1.id]);
    ok('MR-34 assigning the same learner to the same course again is refused (D-06): 0 seats, zero mutation, logged', n2 === 0 && snap() === s0 && aud() === a0 + 1 && /already enrolled/.test(ADMIN.audit[0].action));
    const u1 = b.used, n3 = agyDoAssign(b, course, [L2.id, L2.id], true);
    ok('MR-34 the same learner twice in one call uses one seat', n3 === 1 && b.used === u1 + 1 && STORE.agy.assign.filter(a => a.lid === L2.id && sameCourse(a.course, course) && a.status === 'Active').length === 1);
  });
  await T('MR-12 legacy seeded requests (D-03 original calls)', async () => {
    const c1 = agyConsents().find(x => x.id === 'CON-01'), c6 = agyConsents().find(x => x.id === 'CON-06');
    AGY('AG-02'); ACT.consentDo({ dataset: { id: 'CON-01', y: '1' } }); ok('MR-12 AG-02 cannot consent for Jack Thompson (CON-01)', c1.status === 'Awaiting learner consent' && !inRoster(c1.lid));
    AGY('AG-03'); ACT.consentDo({ dataset: { id: 'CON-01', y: '0' } }); ok('MR-12 another agency (AG-03) cannot decline it', c1.status === 'Awaiting learner consent');
    learner('B'); ACT.consentDo({ dataset: { id: 'CON-06', y: '1' } }); ok('MR-12 learner B cannot answer learner A\'s CON-06', c6.status === 'Awaiting learner consent');
    learner('A'); ACT.consentDo({ dataset: { id: 'CON-06', y: '0' } }); ok('MR-12 learner A answers her own CON-06', c6.status === 'Declined');
  });

  /* ================= Client demo again ================= */
  fxLoadClient();
  await T('client demo restored', async () => { ok('client demo reloads with five learners and Tom\'s transfer pending', learnerAccounts().length === 5 && fiAwaiting().length === 1); });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
