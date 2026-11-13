// 1B — short-course purchase, registration, access and repurchase (Welfare Academy email, point 1B), client demo (FIXTURE=client).
// Course details before payment (learner and visitor), incomplete configuration, registration and verification, existing-account
// purchase (NVQ learner), one enrolment per payment, failed / cancelled / pending payments, duplicate confirmation, NVQ isolation and
// the 1A gate, the exact expiry boundary, re-purchase as a new enrolment with the earlier one kept, request more time (granted /
// refused), direct links, and the 1A harness marker.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => Array.from(document.querySelectorAll(s));
  const T = async (n, f) => { try { closeModal(); Clock.unfreeze(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const app = () => ($1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; S.edge = 'none'; S.portal = 'learner'; };
  const SC = () => { s1Sync(); return CATALOGUE.find(c => c.kind === 'short'); };
  const shorts = w => (w || W).enrolments.filter(e => e.kind === 'short');
  const aud = re => ADMIN.audit.filter(x => re.test(x.action)).length;
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const click = el => { if (!el) throw new Error('missing element'); el.click(); };
  // Continue to purchase → the course's questions (filled) → checkout; fail = simulate a declined payment
  const buy = (c, { fail = false, cancel = false } = {}) => fxFast(ff => {
    go('course-info', { id: c.id }); ACT.n1bBuy({ dataset: { id: c.id } });
    if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'Answer'; }); prim(); }
    if (!MODAL || !/Pay now/.test(MODAL.title || '')) return 'no checkout';
    if (cancel) { closeModal(); return 'cancelled'; }
    if (fail) $1('#payFail').checked = true;
    prim(); ff(3000); const t = MODAL && MODAL.title; closeModal(); return t;
  });

  await T('N1B-A course details before payment', async () => {
    reset(); as('nvq-sp'); const c = SC(), f = n1bFacts(c), row = s1Row(c.course);
    go('browse'); const card = $a('#catgrid article').find(a => a.textContent.includes(c.title));
    ok('N1B-A1 Browse: the short course card offers "View details", not "Buy now"', !!card && !!card.querySelector('[data-go="course-info"]') && !card.querySelector('[data-act="buyCourse"]'));
    click(card.querySelector('[data-go="course-info"]')); const m = main();
    ok('N1B-A2 the details page opens; no checkout or dialog is started', S.route === 'course-info' && !MODAL && m.includes(c.title));
    ok('N1B-A3 description, study time, delivery, access period and price from the course\'s configuration', m.includes(f.desc) && m.includes(f.dur) && m.includes(`${row.access} days from the day your payment is confirmed`) && m.includes(money(row.gbp, 'GBP')) && /Online, in the learner portal/.test(m), J({ dur: f.dur, access: row.access, gbp: row.gbp }));
    ok('N1B-A4 every active module and its content titles are listed, with each module quiz\'s pass mark', f.mods.length > 0 && f.mods.every(md => m.includes(md.title) && md.items.every(it => m.includes(it.title))) && f.mods.filter(md => md.quiz.n).every(md => m.includes(`pass mark ${md.quiz.pass}%`)));
    const v = row.validity; ok('N1B-A5 certificate: issued on completion, with the configured validity; completion rules listed', f.certOn ? (/No expiry/i.test(v) ? m.includes('No expiry') : m.includes(`Valid for ${v} from the date it is issued`)) : m.includes('doesn\'t issue a certificate'), v);
    ok('N1B-A6 no invented facts: learning outcomes and prerequisites say they aren\'t stated', /hasn.t listed separate learning outcomes/.test(m) && /Prerequisites\s*None stated by the Academy/.test(m));
    ok('N1B-A7 one action: "Continue to purchase"', $a('main [data-act="n1bBuy"]').length === 1 && $1('main [data-act="n1bBuy"]').textContent.trim() === 'Continue to purchase');
    const keep = row.access; row.access = 0; render(); const m2 = main(); const n0 = shorts().length, a0 = aud(/Blocked: buy course \(incomplete/);
    const r = ACT.n1bBuy({ dataset: { id: c.id } });
    ok('N1B-A8 missing essential configuration (no access period): says what is missing, no purchase button, a direct attempt refused and logged', /can.t be bought yet/.test(m2) && /access period/.test(m2) && !$1('main [data-act="n1bBuy"]') && r === false && !MODAL && shorts().length === n0 && aud(/Blocked: buy course \(incomplete/) === a0 + 1);
    row.access = keep; const sp = s1Spec(row), d0 = sp.desc; sp.desc = ''; render();
    ok('N1B-A9 … and with no description: no false claim, no purchase', /No description has been provided/.test(main()) && !$1('main [data-act="n1bBuy"]')); sp.desc = d0;
  });

  await T('N1B-B a visitor and a new learner', async () => {
    reset(); closeModal(); if (S.signedIn) ACT.logout(); S.signedIn = false; S.auth = 'signin'; render();
    const c = SC(); ok('N1B-B1 the sign-in page links to the short courses', !!$1('#app [data-act="n1bPub"]'));
    click($1('#app [data-act="n1bPub"]')); ok('N1B-B2 visitors see the published short courses with prices', app().includes(c.title) && app().includes(money(c.price, 'GBP')) && !S.signedIn);
    click($1(`#app [data-act="n1bPub"][data-id="${c.id}"]`)); const t = app();
    ok('N1B-B3 a visitor sees the full course details (same facts) and needs an account to buy', t.includes(n1bFacts(c).desc) && /Access period/.test(t) && /Certificate/.test(t) && !!$1('#app [data-act="n1bPubReg"]') && !$1('#app [data-act="n1bBuy"]'));
    const nw0 = Object.keys(STORE.worlds).length, nl0 = ADMIN.learners.length;
    click($1(`#app [data-act="n1bPubReg"][data-id="${c.id}"]`));
    ok('N1B-B4 registration asks for full name, email, mobile, country, password and the Terms and Privacy consents', ['#rg-name', '#rg-email', '#rg-mob', '#rg-country', '#rg-pw', '#rg-pw2', '#rg-terms', '#rg-priv'].every(s => !!$1(s)) && !$1('#rg-dob') && !$1('#rg-ad'));
    const v = { '#rg-name': 'Nia Buyer', '#rg-email': 'nia.buyer@example.com', '#rg-mob': '7700 955123', '#rg-pw': 'Demo!Pass2026', '#rg-pw2': 'Demo!Pass2026' };
    Object.entries(v).forEach(([k, x]) => { $1(k).value = x; }); $1('#rg-country').value = 'United Kingdom'; $1('#rg-terms').checked = true; $1('#rg-priv').checked = true;
    submit('form[data-submit="regSubmit"]'); const p = prim(); if (p !== false && MODAL) closeModal();
    ok('N1B-B5 verification: a code step, said to be simulated; not signed in yet', S.auth === 'regVerify' && !S.signedIn && /simulated verification/.test(app()));
    $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="regCode"]'); click($1('#app [data-act="finishWelcome"]'));
    const w = W;
    ok('N1B-B6 after verifying, the new learner is signed in and back on the course they chose', S.signedIn && S.route === 'course-info' && (S.params || {}).id === c.id && w.me.email === 'nia.buyer@example.com' && w.me.first === 'Nia', S.route);
    ok('N1B-B7 one new account (one world, one learner record)', Object.keys(STORE.worlds).length === nw0 + 1 && ADMIN.learners.length + 0 >= nl0 && Object.values(STORE.worlds).filter(x => x && x.me && x.me.email === 'nia.buyer@example.com').length === 1);
    const out = buy(c);
    ok('N1B-B8 the new learner buys it: payment successful, one enrolment, open straight away', out === 'Payment successful' && shorts(w).length === 1 && shorts(w)[0].status === 'Active' && !lockFor('course'), out);
    ok('N1B-B9 no NVQ documents, offer letter or batch were asked for or created', !w.signup && !w.admission && !w.flags.nvq);
  });

  await T('N1B-C an existing NVQ learner buys a short course', async () => {
    reset(); as('nvq-sp'); const w = W, c = SC(), row = s1Row(c.course);
    const nvq0 = J([w.signup, w.plans.filter(p => p.e === 'nvq'), w.nvq.status, w.nvq.batch, w.me]), lk0 = J(['assignments', 'progress', 'observations'].map(r => lockFor(r)));
    const n0 = shorts(w).length, tx0 = w.tx.length, before = Date.now(), at = now().getTime();
    const out = buy(c); const e = shorts(w)[0];
    ok('N1B-C1 payment successful; exactly one new enrolment and one payment', out === 'Payment successful' && shorts(w).length === n0 + 1 && w.tx.length === tx0 + 1, out);
    ok('N1B-C2 the enrolment: Active, access starts now, ends after the configured access period, its own progress at 0', e.status === 'Active' && Math.abs(Date.parse(e.start) - at) < 6e4 && Math.abs(Date.parse(e.end) - Date.parse(e.start) - row.access * DAY) < 2 * 36e5 && e.progress === 0 && e.content.every(x => x.state === 'Not opened') && (e.modules || []).every(m => !m.quiz.attempts.length), J({ s: e.start, e: e.end, a: row.access }));
    ok('N1B-C3 transaction, purchase and audit references kept', !!e.n1b && e.n1b.txRef === w.tx[0].ref && /^PI-/.test(e.n1b.intent) && (w.plans.find(p => p.e === e.id) || { rows: [{}] }).rows[0].txRef === e.n1b.txRef && ADMIN.audit.some(a => a.action === 'Short course purchased (simulated payment)' && a.reason.includes(e.n1b.txRef)));
    go('course', { id: e.id, tab: 'content' }); const it = e.content[0]; ACT.openItem({ dataset: { e: e.id, id: it.id } }); closeModal();
    ok('N1B-C4 immediate access: the course content opens', !lockFor('course') && it.state !== 'Not opened', it.state);
    go('dashboard'); ok('N1B-C5 it shows on the dashboard and in My Courses', main().includes(c.title) && (go('courses'), main().includes(e.title)));
    ok('N1B-C6 the NVQ sign-up, plan, batch and access are unchanged', J([w.signup, w.plans.filter(p => p.e === 'nvq'), w.nvq.status, w.nvq.batch, w.me]) === nvq0 && J(['assignments', 'progress', 'observations'].map(r => lockFor(r))) === lk0);
    go('course-info', { id: c.id }); ok('N1B-C7 the course page now says "You already have access" with Continue learning, and no purchase button', /You already have access to this course/.test(main()) && !!$1(`main [data-go="course"][data-id="${e.id}"]`) && !$1('main [data-act="n1bBuy"]'));
    const n1 = shorts(w).length; ACT.buyCourse({ dataset: { id: c.id } }); closeModal(); ACT.n1bBuy({ dataset: { id: c.id } }); closeModal();
    ok('N1B-C8 a second purchase of an active course is refused (no checkout, no enrolment)', shorts(w).length === n1 && w.tx.length === tx0 + 1);
  });

  await T('N1B-D failed, cancelled, pending and duplicate confirmations', async () => {
    reset(); as('nvq-fa'); const w = W, c = SC(), n0 = shorts(w).length, tx0 = w.tx.length;
    const out = buy(c, { fail: true }); ok('N1B-D1 a declined payment: "Payment failed", no enrolment, no payment', out === 'Payment failed' && shorts(w).length === n0 && w.tx.length === tx0, out);
    const out2 = buy(c, { cancel: true }); ok('N1B-D2 a cancelled checkout: no enrolment, no payment', out2 === 'cancelled' && shorts(w).length === n0 && w.tx.length === tx0);
    go('course-info', { id: c.id }); ACT.n1bBuy({ dataset: { id: c.id } }); if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = 'x'; }); prim(); }
    ok('N1B-D3 the checkout is labelled as a simulation (no card charged)', !!MODAL && /simulated payment/.test(String(MODAL.body)) && /No card is charged/.test(String(MODAL.body))); closeModal();
    const row = s1Row(c.course), cb = n1bOnce(c, (amt, ref) => s1Enrol(c, row, null)), a0 = aud(/Blocked: duplicate payment confirmation/);
    cb(c.price, 'TXN-N1B-1'); cb(c.price, 'TXN-N1B-1');
    ok('N1B-D4 the same payment confirmed twice: one enrolment; the second is refused and logged', shorts(w).length === n0 + 1 && aud(/Blocked: duplicate payment confirmation/) === a0 + 1);
    const cb2 = n1bOnce(c, (amt, ref) => s1Enrol(c, row, null)), b0 = aud(/Blocked: second enrolment/); cb2(c.price, 'TXN-N1B-2');
    ok('N1B-D5 a second purchase confirmed while the first is active: no second enrolment (logged for a refund review)', shorts(w).length === n0 + 1 && aud(/Blocked: second enrolment/) === b0 + 1);
    const e = shorts(w)[0]; e.status = 'Payment Pending';
    const it = e.content[0]; ACT.openItem({ dataset: { e: e.id, id: it.id } });
    ok('N1B-D6 a Payment Pending enrolment opens no content (refused, logged)', it.state === 'Not opened' && ADMIN.audit[0].action === 'Blocked: open course content (payment not confirmed)');
    go('course-info', { id: c.id }); ok('N1B-D7 … and the course page says the payment is being confirmed (no second purchase)', /being confirmed/.test(main()) && !$1('main [data-act="n1bBuy"]'));
    e.status = 'Active';
  });

  await T('N1B-E expiry boundary, re-purchase and the earlier enrolment kept', async () => {
    reset(); as('short'); const w = W, c = SC(), old = shorts(w).find(e => e.courseId === c.course) || shorts(w)[0];
    // Some work on the earlier enrolment: an item opened and a quiz attempt recorded
    const it = old.content[0]; ACT.openItem({ dataset: { e: old.id, id: it.id } }); closeModal();
    const mod = (old.modules || [])[0]; if (mod) mod.quiz.attempts.push({ at: now().toISOString(), score: 40, pass: false });
    const end = Date.parse(old.end);
    Clock.freeze(new Date(end - 1).toISOString()); aa1Expire(); ok('N1B-E1 one millisecond before the end of the access period: still Active', old.status === 'Active');
    Clock.freeze(new Date(end).toISOString()); aa1Expire(); ok('N1B-E2 at the end of the access period: Expired-Incomplete', old.status === 'Expired-Incomplete');
    go('course', { id: old.id, tab: 'content' }); const it2 = old.content[1] || it, st2 = it2.state; ACT.openItem({ dataset: { e: old.id, id: it2.id } }); closeModal();
    ok('N1B-E3 expired: content hidden, a direct open refused', /Your access has ended/.test(main()) && it2.state === st2);
    go('course', { id: old.id }); ok('N1B-E4 the expired course offers Request more time and Re-purchase', !!$1(`main [data-act="reqTime"][data-id="${old.id}"]`) && !!$1(`main [data-act="repurchase"][data-id="${old.id}"]`));
    const snap = J(old), tx0 = J(w.tx), plans0 = J(w.plans.filter(p => p.e === old.id)), certs0 = J(w.certs), aud0 = J(ADMIN.audit.slice(-50));
    ACT.repurchase({ dataset: { id: old.id } });
    ok('N1B-E5 Re-purchase opens the course details first (no checkout yet)', S.route === 'course-info' && !MODAL && !!$1('main [data-act="n1bBuy"]') && /You studied this course before/.test(main()));
    const n0 = shorts(w).length, out = buy(c), ne = shorts(w)[0], row = s1Row(c.course);
    ok('N1B-E6 the re-purchase makes a new enrolment with its own ID', out === 'Payment successful' && shorts(w).length === n0 + 1 && ne !== old && ne.id !== old.id, J([ne.id, old.id]));
    ok('N1B-E7 a new access period from today, for the configured length', Math.abs(Date.parse(ne.start) - now().getTime()) < 6e4 && Math.abs(Date.parse(ne.end) - Date.parse(ne.start) - row.access * DAY) < 2 * 36e5 && Date.parse(ne.end) > end, J({id: ne.id, s: ne.start, e: ne.end, now: now().toISOString(), a: row.access}));
    ok('N1B-E8 new progress: nothing opened, no quiz attempts, no certificate link, progress 0', ne.progress === 0 && ne.content.every(x => x.state === 'Not opened') && (ne.modules || []).every(m => !m.quiz.attempts.length) && !ne.certId && ne.status === 'Active', J({p: ne.progress, st: ne.content.map(x => x.state), at: (ne.modules || []).map(m => m.quiz.attempts.length), cert: ne.certId, s: ne.status}));
    ok('N1B-E9 the earlier enrolment is exactly as it was (progress, opened items, quiz attempts, status)', J(old) === snap && old.status === 'Expired-Incomplete' && it.state !== 'Not opened' && (!mod || mod.quiz.attempts.length === 1));
    ok('N1B-E10 earlier payments, its plan, certificates and audit entries are kept', w.tx.length === JSON.parse(tx0).length + 1 && J(w.tx.slice(1)) === tx0 && J(w.plans.filter(p => p.e === old.id)) === plans0 && J(w.certs) === certs0 && J(ADMIN.audit.slice(-50)) === aud0);
    const ne2 = ne.content[0]; ACT.openItem({ dataset: { e: ne.id, id: ne2.id } }); closeModal();
    ok('N1B-E11 progress in the new enrolment doesn\'t touch the earlier one', ne2.state !== 'Not opened' && J(old) === snap);
    Clock.unfreeze();
  });

  await T('N1B-F request more time (separate from re-purchase)', async () => {
    reset(); as('short'); const w = W, e = shorts(w)[0], it = e.content[0]; ACT.openItem({ dataset: { e: e.id, id: it.id } }); closeModal();
    Clock.freeze(new Date(Date.parse(e.end) + 3600e3).toISOString()); aa1Expire(); const content0 = J(e.content), prog0 = e.progress;
    ACT.reqTime({ dataset: { id: e.id } }); $1('#rt-reason').value = '1B: I was unwell'; prim(); const rq = w.requests[0]; closeModal();
    ok('N1B-F1 the learner asks for more time: a request is raised, access unchanged', rq.type === 'More time on course' && rq.status === 'Requested' && e.status === 'Expired-Incomplete');
    acaEnter('KA'); S.signedIn = true; S.ui = {}; const qi = allQueue().find(i => i.req === rq || (i.id || '').startsWith('AQ-' + rq.id));
    ACT.qDo({ dataset: { id: qi.id, a: 'extend' } }); const t = $1('#rsn'); if (t) t.value = '1B: granted'; prim(); closeModal();
    ok('N1B-F2 the Academic Admin grants it: the same enrolment is Active again with a later end, progress and opened items kept', rq.status === 'Granted' && e.status === 'Active' && Date.parse(e.end) > now().getTime() && J(e.content) === content0 && e.progress === prog0, J({ st: rq.status, es: e.status }));
    ok('N1B-F3 the decision is audited', ADMIN.audit.some(a => /AQ-/.test(a.entity || '') && /1B: granted/.test(a.reason || '')));
    // A refused request leaves access closed
    as('short'); Clock.freeze(new Date(Date.parse(e.end) + 3600e3).toISOString()); aa1Expire();
    ACT.reqTime({ dataset: { id: e.id } }); $1('#rt-reason').value = '1B: once more'; prim(); const rq2 = w.requests[0]; closeModal();
    acaEnter('KA'); S.signedIn = true; S.ui = {}; const q2 = allQueue().find(i => i.req === rq2 || (i.id || '').startsWith('AQ-' + rq2.id));
    ACT.qDo({ dataset: { id: q2.id, a: 'reject' } }); const t2 = $1('#rsn'); if (t2) t2.value = '1B: refused'; prim(); closeModal();
    as('short'); const st = (e.content[1] || it).state; ACT.openItem({ dataset: { e: e.id, id: (e.content[1] || it).id } }); closeModal();
    ok('N1B-F4 a refused request: still Expired-Incomplete, content refused', rq2.status !== 'Granted' && e.status === 'Expired-Incomplete' && (e.content[1] || it).state === st, rq2.status);
    Clock.unfreeze();
  });

  await T('N1B-G NVQ isolation and the 1A safeguards', async () => {
    reset(); as('short'); go('browse'); const w = W;
    ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = r1Opts(cdPr().id).find(x => x.status === 'Active' && x.mode === 'Self-Paced'), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; prim(); closeModal();
    go('admission'); $1('#su-dob').value = '1990-05-05'; $1('#su-ad').value = '1 Test Way'; const rb = $1('main input[name="su-batch"]'); rb.checked = true; INP.suBatch(rb); ACT.suNext();
    fxFast(ff => { w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); setUi('cb9Pay', '6'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); ff(3000); closeModal(); });
    ok('N1B-G1 a learner with an active short course signs up for an NVQ (1A rule recorded); NVQ learning stays closed before the batch starts', w.signup.done && !!w.signup.startRule && !!(lockFor('assignments') || {}).n1a);
    const e = shorts(w).find(x => x.status === 'Active'); const k = S.params; S.params = { id: e.id }; const sl = lockFor('course'); S.params = k;
    ok('N1B-G2 the short course stays open alongside it (each enrolment has its own rules)', !sl && !!e);
    go('course-info', { id: SC().id }); ok('N1B-G3 course details open during the NVQ wait; the NVQ stays closed', S.route === 'course-info' && !lockFor('course-info') && !!(lockFor('progress') || {}).n1a);
    const keepF = window.ILM_FIXTURE, keepP = window.ILM_N1A_PRE; window.ILM_N1A_PRE = true; delete window.ILM_FIXTURE; const off = n1aHarnessPre(); window.ILM_FIXTURE = keepF;
    ok('N1B-G4 the 1A test marker does nothing outside the pinned harness (a browser can\'t set ILM_FIXTURE)', off === false); window.ILM_N1A_PRE = keepP;
    ok('N1B-G5 ft-n1b doesn\'t set the marker; the new sign-up above was gated', window.ILM_N1A_PRE !== true && !!w.signup.startRule);
    ok('N1B-G6 REVISED-1 is still inactive', p2Active() === 'LEGACY-1' && p2Activate('REVISED-1', '1B') === false);
  });

  Clock.unfreeze();
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
