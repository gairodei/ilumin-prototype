// 1B — short courses on the full legacy test data (FIXTURE=legacy): several short courses on one account, legacy enrolments and their
// certificates unchanged, re-purchase of an expired legacy enrolment with the certificates kept, renewal opens the details, the
// agency-sponsored history unchanged, a legacy Payment Pending enrolment, direct links to expired content.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => Array.from(document.querySelectorAll(s));
  const T = async (n, f) => { try { closeModal(); Clock.unfreeze(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const cat = t => { s1Sync(); return CATALOGUE.find(c => c.kind === 'short' && c.title === t); };
  const shorts = () => W.enrolments.filter(e => e.kind === 'short');
  const buy = c => fxFast(ff => {
    go('course-info', { id: c.id }); ACT.n1bBuy({ dataset: { id: c.id } });
    if (MODAL && /About you/.test(MODAL.title || '')) { $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'date' ? '2026-10-01' : 'Answer'; }); prim(); }
    if (!MODAL || !/Pay now/.test(MODAL.title || '')) return 'no checkout';
    prim(); ff(3000); const t = MODAL && MODAL.title; closeModal(); return t;
  });

  await T('N1BL-A several short courses and the legacy records', async () => {
    fresh(); learner('A'); const legacy0 = J(W.enrolments), certs0 = J(W.certs), tx0 = W.tx.length;
    const a = cat('Mental Capacity Act and DoLS'), b = cat('End of Life Care');
    const o1 = buy(a), o2 = buy(b), ea = shorts().find(e => e.courseId === a.course), eb = shorts().find(e => e.courseId === b.course);
    ok('N1BL-A1 one account buys two short courses: two separate Active enrolments, each with its own access period and payment', o1 === 'Payment successful' && o2 === 'Payment successful' && !!ea && !!eb && ea.id !== eb.id && ea.status === 'Active' && eb.status === 'Active' && W.tx.length === tx0 + 2 && ea.n1b.txRef !== eb.n1b.txRef);
    ok('N1BL-A2 the legacy enrolments and certificates are unchanged', J(W.enrolments.filter(e => e !== ea && e !== eb)) === legacy0 && J(W.certs) === certs0);
    const mh = W.enrolments.find(e => e.id === 'mh26'), k = S.params; S.params = { id: 'mh26' }; const l = lockFor('course'); S.params = k;
    ok('N1BL-A3 a legacy active enrolment keeps its access', mh.status === 'Active' && !l);
  });

  await T('N1BL-B re-purchase of an expired legacy enrolment; certificates kept', async () => {
    fresh(); learner('A'); const old = W.enrolments.find(e => e.id === 'ipc'), snap = J(old), certs0 = J(W.certs), done0 = J(W.enrolments.filter(e => e.status === 'Completed'));
    go('course', { id: 'ipc', tab: 'content' }); const it = (old.content || [])[0], st = it && it.state; if (it) { ACT.openItem({ dataset: { e: 'ipc', id: it.id } }); closeModal(); }
    ok('N1BL-B1 the expired legacy enrolment: content hidden, a direct open refused', /Your access has ended/.test(main()) && (!it || it.state === st));
    ACT.repurchase({ dataset: { id: 'ipc' } }); const c = cat('Infection Prevention and Control');
    ok('N1BL-B2 Re-purchase opens the course details at today\'s configured price', S.route === 'course-info' && (S.params || {}).id === c.id && main().includes(money(c.price, 'GBP')) && repurchasePrice(old) === c.price);
    const out = buy(c), ne = shorts()[0];
    ok('N1BL-B3 a new enrolment from the current configuration; the old one unchanged', out === 'Payment successful' && ne.id !== 'ipc' && ne.courseId === c.course && ne.progress === 0 && !ne.certId && J(old) === snap);
    ok('N1BL-B4 completed enrolments and every certificate (valid, expired, revoked, processing) are unchanged', J(W.certs) === certs0 && J(W.enrolments.filter(e => e.status === 'Completed')) === done0);
    ACT.renewCert({ dataset: { id: 'c1' } });
    ok('N1BL-B5 Renew while an enrolment of the course is active is refused (CF-D kept); its details page says "You already have access"', ACT.renewCert({ dataset: { id: 'c1' } }) === false && !MODAL && (go('course-info', { id: cat('Moving and Handling People').id }), /You already have access to this course/.test(main())));
  });

  await T('N1BL-C agency-sponsored history and a legacy pending payment', async () => {
    fresh(); learner('D'); const sp = W.enrolments.find(e => e.id === 'mh26'), sp0 = J(sp), c = cat('Food Hygiene Level 2');
    go('course-info', { id: c.id }); ok('N1BL-C1 a sponsored learner is told a purchase here is paid by them', /paid by you, not by/.test(main()));
    const out = buy(c), ne = shorts().find(e => e.courseId === c.course);
    ok('N1BL-C2 the sponsored learner\'s own purchase is a separate enrolment; the sponsored one is unchanged', out === 'Payment successful' && !!ne && !ne.sponsor && J(sp) === sp0);
    fresh(); learner('A'); const f = W.enrolments.find(e => e.id === 'fire'), it = (f.content || [])[0], st = it && it.state;
    if (it) { ACT.openItem({ dataset: { e: 'fire', id: it.id } }); closeModal(); }
    go('course-info', { id: cat('Fire Safety Awareness').id });
    ok('N1BL-C3 a legacy Payment Pending enrolment opens no content and the course page says the payment is being confirmed', (!it || it.state === st) && /being confirmed/.test(main()) && !$1('main [data-act="n1bBuy"]'));
  });

  Clock.unfreeze();
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
