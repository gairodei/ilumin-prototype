// Point 5 — overdue instalments and access while paused, client demo (FIXTURE=client). Amira (agreed schedule) with a submitted and
// marked assignment and a paid short course: due-date boundary, Day 14/15 and 29/30, reminders, the automatic pause (system-attributed,
// once), read-only history, refused actions (submit, resubmit, drafts, quizzes, resources, downloads, Zoom, PD join), calendar and
// payments open, the short course open, payment before and after the pause, an unverified transfer, the Finance arrangement, its lapse,
// unauthorised staff, the manual pause, discontinuation, the 1A gate, and the Finance overdue list.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } finally { Clock.unfreeze(); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'Point 5 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const FA = () => { signOutUI(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { signOutUI(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const SA = () => { signOutUI(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const AM = 'IA-L-32000', w = () => STORE.worlds.CD1;
  const aud = re => ADMIN.audit.filter(x => re.test(x.action) && (x.entity || '').includes(AM));
  const notes = re => w().notifs.filter(n => re.test(n.title));
  const nvqRow = () => { const pl = w().plans.find(p => p.e === 'nvq'); return pl.rows.find(r => r.status !== 'Paid' && (r.paid || 0) < r.amount); };
  // The instant at which the row is exactly n days late in the learner's calendar (the overdue process's own measure)
  const atLate = (r, n) => { const b = Date.parse(r.due); for (let d = n - 2; d <= n + 2; d++) for (const h of [3, 12, 20]) { const t = new Date(b + d * DAY + h * 36e5).toISOString(); Clock.freeze(t); if (fiLate(r.due, w()) === n) return t; } throw new Error('no instant ' + n); };
  const sync = () => { fiOdSync(); render(); };
  const lk = (r, id) => { const k = S.params; S.params = id ? { id } : {}; try { return lockFor(r); } finally { S.params = k; } };
  const payCard = n => fxFast(ff => { pick('nvq-sp'); go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: String(n) } }); if (MODAL) prim(); ff(3000); closeModal(); });
  // Setup: Amira submits Assignment 1, James publishes marking (resubmission); Amira buys the short course (1B)
  const setup = () => {
    closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal();
    const a = w().assignments.find(x => x.id === 'a10');
    pick('nvq-sp'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>Point 5 original answer: the person chooses.</p>');
    fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
    const key = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return (tasSubs(true).find(x => x.L.lid === AM && x.a.id === 'a10') || {}).key; } finally { S.tas.v = k; } });
    TCH('S'); go('t-mark', { id: key }); const asg = tasAsg(tasSubs(true).find(s => s.key === key));
    markable(asg).forEach(q => { ACT.mkMet({ dataset: { k: key, q: q.id, v: 'Not Met' } }); ACT.mkRag({ dataset: { k: key, q: q.id, v: 'R' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'Point 5 feedback: explain the plan.' }); INP.mkExit({ dataset: { k: key, q: q.id }, value: 'resub' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'Point 5: say how the plan was agreed.' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '60' }); });
    ACT.mkRelease({ dataset: { k: key } }); press();
    pick('nvq-sp'); const c = (s1Sync(), CATALOGUE.find(x => x.kind === 'short'));
    fxFast(ff => { go('course-info', { id: c.id }); ACT.n1bBuy({ dataset: { id: c.id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = 'x'; }); prim(); } if (MODAL) prim(); ff(3000); closeModal(); });
    const sc = w().enrolments.find(e => e.kind === 'short' && e.status === 'Active');
    return { a, key, sc };
  };

  await T('N5-A boundaries, reminders and the automatic pause', async () => {
    const { a, sc } = setup(), r = nvqRow(), n = r.n;
    ok('N5-A0 setup: Amira has a marked assignment (Resubmission Required), a paid short course and an unpaid instalment ' + n, a.status === 'Resubmission Required' && !!sc && !!r, J([a.status, !!sc, n, r && r.due]));
    atLate(r, 0); sync(); ok('N5-1 on the due date the instalment isn\'t overdue', r.status !== 'Overdue' && !w().accessPaused);
    atLate(r, 1); sync(); ok('N5-1b the day after the due date it is Overdue; one notice and one system audit entry', r.status === 'Overdue' && notes(/^Instalment overdue$/).length === 1 && aud(/^Instalment overdue$/).length === 1 && aud(/^Instalment overdue$/)[0].actor === 'System (overdue process)');
    atLate(r, 14); sync(); ok('N5-2 Day 14: no Day 15 reminder yet, not paused', !notes(/Overdue reminder \(Day 15\)/).length && !w().accessPaused);
    atLate(r, 15); sync(); ok('N5-2b Day 15: the Day 15 reminder (simulated), once; not paused', notes(/Overdue reminder \(Day 15\)/).length === 1 && !w().accessPaused);
    atLate(r, 29); sync(); ok('N5-3 Day 29: not paused, no Day 30 reminder', !w().accessPaused && !notes(/Overdue reminder \(Day 30\)/).length);
    atLate(r, 30); sync(); sync();
    ok('N5-3b / N5-4 / N5-5 Day 30: the second reminder and the automatic pause, once each', w().accessPaused === true && notes(/Overdue reminder \(Day 30\)/).length === 1 && notes(/^Access paused$/).length === 1 && aud(/^Access paused \(Day 30, automatic\)$/).length === 1);
    ok('N5-32 the automatic pause is attributed to the system, not to a staff member', aud(/^Access paused \(Day 30, automatic\)$/).every(x => x.actor === 'System (overdue process)' && x.role === 'System'));
    for (let i = 0; i < 4; i++) sync(); atLate(r, 31); sync();
    ok('N5-30 repeated evaluations: no duplicate reminders, pauses or audit entries', notes(/Overdue reminder \(Day 30\)/).length === 1 && notes(/^Access paused$/).length === 1 && aud(/^Access paused \(Day 30, automatic\)$/).length === 1 && notes(/^Instalment overdue$/).length === 1);
  });

  await T('N5-B learner access while paused', async () => {
    const { a } = setup(), r = nvqRow(); atLate(r, 31); sync(); pick('nvq-sp');
    const c1 = CATALOGUE.find(x => x.kind === 'short'); w().enrolments.filter(e => e.kind === 'short').forEach(e => { if (e.status === 'Active') e.status = 'Expired-Incomplete'; });
    fxFast(ff => { go('course-info', { id: c1.id }); ACT.n1bBuy({ dataset: { id: c1.id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = 'x'; }); prim(); } if (MODAL) prim(); ff(3000); closeModal(); });
    const sc = w().enrolments.find(e => e.kind === 'short' && e.status === 'Active');
    ok('N5-B0b while the programme is paused, the learner can still buy and use a short course (1B)', !!sc);
    ok('N5-B0 paused', w().accessPaused === true, J({st: r.status, days: fiLate(r.due, w()), pin: fiPinned(w()), keys: Object.keys(STORE.fiOd || {}).filter(k => k.startsWith('CD1')), au: w().arrangeUntil, sp: chSponsored(w()), ap: w().accessPaused, aut: w().fiAutoPaused, now: now().toISOString(), due: r.due, nt: w().notifs.slice(0,8).map(n => n.title), au2: ADMIN.audit.filter(x => (x.entity||'').includes(AM)).slice(0,8).map(x => x.action + '/' + x.actor)}));
    go('assignment', { id: 'a10' }); const m = main();
    ok('N5-11 / N5-12 the submitted answer and the feedback stay readable (read-only, with the explanation)', /Point 5 original answer/.test(m) && /Point 5 feedback/.test(m) && !!$1('main .n5-paused') && /Access paused/.test(m));
    ok('N5-B7 the explanation names the programme, amount, due date, Pay now and Finance contact; no staff reason', (() => { const t = ($1('main .n5-paused') || {}).textContent || ''; return t.includes(w().nvq.title) && t.includes(money(fpM(fpP(r.amount) - fpP(r.paid)), 'GBP')) && t.includes(fd(r.due)) && !!$1('main .n5-paused [data-act="payInst"]') && /Contact the Academy/.test(t); })());
    ok('N5-15 / N5-16 no Submit / resubmit control; the editor isn\'t editable', !$1('main [data-act="reviewSubmit"]') && !$1('main [contenteditable="true"]'));
    const fb0 = J(a.qs.map(q => [q.fb, q.state])), st0 = a.status, d0 = J(w().drafts || {});
    const b = $1('main .paper .rte-body'); if (b) { b.innerHTML = '<p>changed</p>'; INP.rteInput(b); }
    const rs = ACT.reviewSubmit({ dataset: { id: 'a10' } }); closeModal(); const fs = typeof finaliseSubmit === 'function' ? finaliseSubmit(a, true) : false;
    ok('N5-14 / N5-16 direct edits, draft saves, submit and resubmit are refused; the record is unchanged', rs === false && fs === false && a.status === st0 && J(a.qs.map(q => [q.fb, q.state])) === fb0 && J(w().drafts || {}) === d0);
    go('progress'); ok('N5-13 progress stays readable', !!$1('main .n5-paused') && /Progress/.test(main()));
    const lockedQuiz = !!lk('quiz', 'nvq'); ok('N5-15b assessments / quizzes of the programme stay locked', lockedQuiz);
    go('resources'); const res = main(); const nvqItem = (w().resources || []).flatMap(g => !g.courseId ? g.items || [] : [])[0];
    let resBlocked = true; if (nvqItem) { const n0 = ADMIN.audit.length; ACT.openRes({ dataset: { id: nvqItem.id } }); closeModal(); resBlocked = ADMIN.audit.length > n0 && /Blocked/.test(ADMIN.audit[0].action); }
    ok('N5-17 the programme\'s resources are withheld and can\'t be opened', !!$1('main .n5-paused') && resBlocked);
    const f = nvqItem ? nvqItem.title + '.pdf' : 'x.pdf', n1 = ADMIN.audit.length; ACT.fakeDl({ dataset: { f } }); closeModal();
    ok('N5-18 a protected download is refused', !nvqItem || (ADMIN.audit.length > n1 && /download/.test(ADMIN.audit[0].action)));
    const ev = (w().events || []).find(e => w().nvq && e.course === w().nvq.title), n2 = ADMIN.audit.length;
    if (ev) { ACT.joinZoom({ dataset: { id: ev.id } }); closeModal(); ok('N5-19 joining the programme\'s class on Zoom is refused; the button is disabled', ADMIN.audit.length > n2 && /Zoom/.test(ADMIN.audit[0].action) && /Paused with your programme access|disabled/.test(joinBtn(ev))); }
    else ok('N5-19 Zoom: the join button is disabled for the programme', /disabled/.test(joinBtn({ id: 'x', course: w().nvq.title, link: 'https://zoom.example' })));
    const n3 = ADMIN.audit.length; ACT.joinPd({ dataset: {} }); closeModal(); ok('N5-20 joining a PD session is refused', ADMIN.audit.length > n3 && /Professional Discussion/.test(ADMIN.audit[0].action));
    ok('N5-21 / N5-22 calendar, payments, profile, messages, certificates and the dashboard stay open', ['calendar', 'payments', 'profile', 'messages', 'certificates', 'dashboard', 'help', 'admission'].every(x => !lk(x)));
    ok('N5-10 the separately paid short course stays open (page, content, its resources)', !lk('course', sc.id) && (() => { const it = sc.content[0], s0 = it.state; ACT.openItem({ dataset: { e: sc.id, id: it.id } }); closeModal(); return it.state !== s0 || it.state === 'Completed' || it.state === 'Opened'; })(), J({ l: lk('course', sc.id), st: sc.content[0].state, k: sc.content[0].kind, sts: sc.status }));
    ok('N5-9 only the overdue enrolment is paused', fiPausedEs(w()).has('nvq') && !fiPausedEs(w()).has(sc.id));
    go('assignment', { id: 'a10' }); ok('N5-31 a direct link opens read-only, never a blank page', !!$1('main .n5-paused') && main().length > 200);
  });

  await T('N5-C payment, pending transfers and restoration', async () => {
    setup(); const r = nvqRow(); atLate(r, 10); sync(); payCard(r.n); sync();
    ok('N5-6 paid before the pause: settled, never paused', r.status === 'Paid' && !w().accessPaused && !notes(/^Access paused$/).length);
    setup(); const r2 = nvqRow(); atLate(r2, 31); sync(); ok('N5-7a paused at Day 31', w().accessPaused === true);
    pick('nvq-sp'); go('payments'); ACT.chPayBank({ dataset: { e: 'nvq', n: String(r2.n) } }); if (MODAL) prim(); closeModal(); sync(); sync();
    ok('N5-8 a bank transfer awaiting Finance doesn\'t restore access and isn\'t shown as paid', w().accessPaused === true && r2.status !== 'Paid' && !!lk('assignments') && /awaiting confirmation/i.test(($1('main .n5-paused') || document.body).textContent + ' ' + (go('assignments'), main())));
    setup(); const r3 = nvqRow(); atLate(r3, 31); sync(); payCard(r3.n); sync();
    ok('N5-7 paid after the pause (card, verified): access restored once, audited as the system, learner notified', r3.status === 'Paid' && !w().accessPaused && !lk('assignments') && notes(/^Access restored$/).length === 1 && aud(/^Access restored \(nothing overdue\)$/).length === 1 && aud(/^Access restored \(nothing overdue\)$/)[0].actor === 'System (overdue process)', J({ st: r3.status, p: w().accessPaused, n: notes(/^Access restored$/).length, a: aud(/Access restored/).map(x => x.action + '/' + x.actor) }));
  });

  await T('N5-D Finance arrangement, its lapse and unauthorised staff', async () => {
    setup(); const r = nvqRow(); atLate(r, 31); sync();
    const row = () => odRows().find(o => o.lid === AM && o.status !== 'discontinued');
    FA(); const o = row();
    ok('N5-B8 the Finance overdue list shows learner, programme, amount, due date, days, reminder and access state', !!o && o.name && o.course === w().nvq.title && o.amount === fpM(fpP(r.amount) - fpP(r.paid)) && o.due === r.due && o.days === 31 && /Day 15, Day 30/.test(o.remind) && o.access === 'Paused', J(o && { c: o.course, a: o.amount, d: o.days, rm: o.remind, ac: o.access }));
    ACA(); const p0 = w().accessPaused; ACT.odRestore({ dataset: { id: o.id } }); const mA = !!MODAL; closeModal();
    ok('N5-29 an Academic Admin can\'t set an arrangement or restore access (refused)', !mA && w().accessPaused === p0 && !w().arrangeUntil);
    FA(); go('f-overdue'); ACT.odRestore({ dataset: { id: row().id } }); const until = D(1).slice(0, 10); $1('#ra-dt').value = new Date(now().getTime() + 5 * DAY).toISOString().slice(0, 10); reason('Point 5: agreed to pay in 5 days');
    ok('N5-23 Finance agrees a new date with a reason: access restored, the learner notified, audited', !w().accessPaused && !!w().arrangeUntil && notes(/new due date|restored/i).length >= 1 && ADMIN.audit.some(x => (x.entity || '').includes(chFullName(w())) && /arrangement|Restore/i.test(x.action) && /agreed to pay/.test(x.reason) && x.actor !== 'System (overdue process)'), J({ p: w().accessPaused, au: w().arrangeUntil, nt: w().notifs.slice(0, 3).map(n => n.title), a: ADMIN.audit.slice(0, 4).map(x => x.action + '/' + x.actor + '/' + x.reason), m: MODAL && MODAL.title, t: (document.querySelector('#toast-root') || {}).textContent }));
    pick('nvq-sp'); go('assignments'); ok('N5-24 the learner sees the agreed date respected (not paused)', !lk('assignments'));
    Clock.freeze(new Date(Date.parse(w().arrangeUntil) + 2 * DAY).toISOString()); sync(); sync();
    ok('N5-25 the agreed date passes unpaid: paused again automatically, once, as the system', w().accessPaused === true && !w().arrangeUntil && ADMIN.audit.filter(x => x.action === 'Payment arrangement lapsed' && (x.entity || '').includes(AM)).length === 1 && (ADMIN.audit.find(x => x.action === 'Payment arrangement lapsed') || {}).actor === 'System (overdue process)', J({ p: w().accessPaused, au: w().arrangeUntil, ap: w().fiArrPaused, rows: w().plans.find(p => p.e === 'nvq').rows.map(x => [x.n, x.status, !!x.arrangement]), a: ADMIN.audit.slice(0, 4).map(x => x.action + '/' + x.actor), now: now().toISOString() }));
  });

  await T('N5-E the other restrictions survive a payment', async () => {
    setup(); const r = nvqRow(); atLate(r, 31); sync();
    FA(); ACT.chPause({ dataset: { l: AM, e: 'nvq' } }); reason('Point 5: manual — investigation (internal)');
    payCard(r.n); sync(); pick('nvq-sp'); go('assignments');
    ok('N5-26 paid: the overdue pause ends, the manual pause stays (until staff restore it); no internal reason shown', !w().accessPaused && !!lk('assignments') && /Access paused/.test(main()) && !/investigation \(internal\)/.test(main()));
    SA(); ACT.chRestore({ dataset: { l: AM, e: 'nvq' } }); reason('Point 5: manual pause lifted'); pick('nvq-sp');
    ok('N5-26b only an authorised restore lifts the manual pause', !lk('assignments'));
    // Discontinued: payment doesn't reactivate
    setup(); const r2 = nvqRow(); atLate(r2, 31); sync(); FA(); const od = odRows().find(o => o.lid === AM && o.status !== 'discontinued'); ACT.odDisc({ dataset: { id: od.id } }); reason('Point 5: discontinued for non-payment');
    payCard(r2.n); sync(); pick('nvq-sp');
    go('assignment', { id: 'a10' }); const rsD = ACT.reviewSubmit({ dataset: { id: 'a10' } }); closeModal();
    ok('N5-28 a discontinued enrolment stays discontinued after a payment: read-only, submission refused', w().nvq.status === 'Discontinued' && /discontinued/i.test(main()) && rsD === false && !w().accessPaused, J({ st: w().nvq.status, l: lk('assignments'), a: ADMIN.audit.slice(0, 3).map(x => x.action), t: (document.querySelector('#toast-root') || {}).textContent }));
    // 1A: a new learner whose batch hasn't started — a payment doesn't open learning
    setup(); pick('short'); go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const op = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === 'Self-Paced'), rb = op && $1(`#modal-root input[name="r1-opt"][value="${op.id}"]`); if (rb) rb.checked = true; prim(); closeModal();
    const L = W; go('admission'); $1('#su-dob').value = '1990-05-05'; $1('#su-ad').value = '1 Test Way'; const bb = $1('main input[name="su-batch"]'); bb.checked = true; INP.suBatch(bb); ACT.suNext();
    fxFast(ff => { L.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', L.me.first + ' ' + L.me.last); setUi('suDecl', true); ACT.suSign(); setUi('cb9Pay', '6'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
    const lr = L.plans.find(p => p.e === 'nvq').rows.find(x => x.status !== 'Paid'); lr.due = new Date(now().getTime() - 31 * DAY).toISOString(); // fixture: a row already 31 days late
    sync(); const pausedL = L.accessPaused === true;
    fxFast(ff => { go('payments'); ACT.payInst({ dataset: { e: 'nvq', n: String(lr.n) } }); if (MODAL) prim(); ff(3000); closeModal(); }); sync();
    ok('N5-27 the 1A batch-start gate survives an overdue payment: paused, paid, overdue pause lifted, learning still closed until the start', pausedL && !L.accessPaused && !!(lk('assignments') || {}).n1a, J([pausedL, L.accessPaused, (lk('assignments') || {}).title]));
  });

  await T('N5-F Point 2 and 1B still hold', async () => {
    ok('N5-F1 Point 2 PD action and the 1B purchase are loaded', typeof ACT.n2AddPd === 'function' && typeof ACT.n1bBuy === 'function' && typeof n1aDecide === 'function');
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
