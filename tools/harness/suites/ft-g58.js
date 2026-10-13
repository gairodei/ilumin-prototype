(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false) closeModal(); } };
  const SA = (v = 'A') => { setAdminIdentity(v); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };

  // ---------- G6.3 feedback release ----------
  T('G6.3 release workflow', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true;
    const s = tasSubs(true).find(x => x.live && x.toMark && markable(tasAsg(x)).length >= 2);
    ok('live submission to mark found', !!s, s && (s.key + ' ' + s.a.title + ' · ' + s.status)); if (!s) return;
    const a = tasAsg(s), w = STORE.worlds[s.L.v], its = markable(a);
    const snap = () => JSON.stringify({ st: a.status, due: a.resubDue, fb: a.qs.map(q => q.fb.length), state: a.qs.map(q => q.state), pd: w.pd.items.length, crit: w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit.map(c => c.code + ':' + c.st)))), notifs: w.notifs.length });
    const before = snap(), learnerNotifsBefore = w.notifs.length;
    const d = dft(s.key); its.forEach((q, k) => { d.items[q.id] = k === 0 ? { exit: 'resub', rag: 'R', fb: 'Add a second example.', corrections: 'Add a second example from your workplace.', met: 'Not Met', days: 12 } : k === 1 && its.length > 2 ? { exit: 'pd', rag: 'A', fb: 'Discuss at PD.', pdReason: 'Better covered in discussion.', met: 'Not Met' } : { exit: 'pass', rag: 'G', fb: 'Good.', met: 'Met', verified: true, vat: now().toISOString() }; });
    ACT.mkRelease({ dataset: { k: s.key } });
    ok('assessor sees "Send to Coordinator for release"', MODAL && /Send to Coordinator for release/.test(MODAL.title + MODAL.actions.map(x => x.label).join()));
    prim();
    ok('pending recorded', !!STORE.tas.pending[s.key]);
    // BEFORE release: learner sees nothing new
    ok('before release: learner status still Submitted', a.status === 'Submitted', a.status);
    ok('before release: no feedback boxes / resubmission boxes / PD / gap analysis change', snap() === before);
    ok('before release: no learner notification', w.notifs.length === learnerNotifsBefore);
    ACT.demoSignInAs({ dataset: { r: 'learner' } }); go('assignment', { id: a.id }); ok('before release: learner page shows Submitted, no new feedback', !/Feedback released|Resubmission required/i.test(main()) && /Submitted/.test(main()));
    ok('before release: no feedback content on the learner page (feedback boxes, RAG, overall comment, resubmission box)', !document.querySelector('main .fb, main .rag, main .rte.ink-1, main .rte.ink-2') && !/Overall comment/.test(main()), [...document.querySelectorAll('main .fb, main .rag, main .rte.ink-1, main .rte.ink-2')].map(x => x.className).join());
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-mark', { id: s.key }); ok('assessor: Awaiting Coordinator release, read-only', /Awaiting Coordinator release/.test(main()));
    // simulate that it was sent 3 days ago → the deadline must count from the release date, not the send date
    STORE.tas.pending[s.key].sentAt = D(-3);
    // Coordinator
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-release'); ok('Coordinator release queue lists it', /Release queue/.test(main()) && DT.crel && DT.crel.rows.some(P => P.key === s.key), DT.crel && DT.crel.rows.length);
    ok('sidebar count badge', /Release queue\s*\d/.test(document.querySelector('.adm-side').textContent));
    go('c-release', { id: s.key }); ok('read-only marking view', /Read-only — you can't change marks/.test(main()) && /Assessor feedback/.test(main()));
    ACT.relOne({ dataset: { k: s.key } }); ok('confirmation summarises', MODAL && MODAL.body.includes(STORE.tas.pending[s.key].learner) && /Resubmission deadlines start today/.test(MODAL.body) && /can't be undone/.test(MODAL.body)); prim();
    // AFTER release: everything together
    const relDay = new Date(Date.parse(now().toISOString().slice(0, 10)) + 12 * DAY).toISOString().slice(0, 10);
    ok('after release: status changed', a.status === 'Resubmission Required', a.status);
    ok('after release: feedback boxes appear', a.qs.some(q => q.fb.length > JSON.parse(before).fb[a.qs.indexOf(q)]));
    ok('after release: resubmission boxes open', a.qs.some(q => q.state === 'rework'));
    ok('after release: deadline counted from release date', (a.resubDue || '').slice(0, 10) === relDay, (a.resubDue || '').slice(0, 10) + ' vs ' + relDay + ' (send+12 would be ' + new Date(Date.parse(D(-3).slice(0, 10)) + 12 * DAY).toISOString().slice(0, 10) + ')');
    ok('after release: gap analysis changed', JSON.stringify(JSON.parse(snap()).crit) !== JSON.stringify(JSON.parse(before).crit));
    ok('after release: learner notified "Feedback released"', w.notifs.length > learnerNotifsBefore && /Feedback released/.test(w.notifs[0].title), w.notifs[0].title);
    if (its.length > 2) ok('after release: Added to PD appears', w.pd.items.length > JSON.parse(before).pd);
    ACT.demoSignInAs({ dataset: { r: 'learner' } }); go('assignment', { id: a.id }); ok('learner sees the actual resubmission date', main().includes(fd(a.resubDue)), fd(a.resubDue));
    ok('audit: released by Coordinator', ADMIN.audit.some(x => x.action === 'Feedback released to learner'));
  });
  T('G6.3 dashboards + Super Admin release', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; const s = tasSubs(true).find(x => x.live && x.toMark && markable(tasAsg(x)).length); if (!s) { ok('second live submission', false); return; }
    const d = dft(s.key); markable(tasAsg(s)).forEach(q => d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Good.', met: 'Met', verified: true, vat: now().toISOString() }); ACT.mkRelease({ dataset: { k: s.key } }); prim();
    acaEnter('KA'); S.signedIn = true; go('k-dashboard'); ok('Academic Admin dashboard: Awaiting release (read-only)', /Awaiting release/.test(main()) && !document.querySelector('[data-act="relSuper"]'));
    SA(); go('a-dashboard'); ok('Super Admin dashboard: Awaiting release with override', /Awaiting release/.test(main()) && !!document.querySelector('[data-act="relSuper"]'));
    go('a-records'); ok('admin records show Awaiting release', DT.subs.rows.some(r => r.status === 'Awaiting release'));
    ACT.relSuper({ dataset: { k: s.key } }); $('#rsn').value = 'Coordinator on leave'; prim(); ok('Super Admin release logged', !STORE.tas.pending[s.key] && ADMIN.audit.some(x => /Super Admin override/.test(x.action)));
  });
  // ---------- G6.1 Teacher-only ----------
  T('G6.1 Teacher-only lockout', () => {
    const teacherOnly = ADMIN.staff.filter(x => x.roles.length === 1 && x.roles[0] === 'Teacher').map(x => x.name);
    const moved = []; ADMIN.batches.forEach(b => { if (teacherOnly.includes(MARKER(b))) moved.push(b.code + ' marker ' + MARKER(b)); });
    ok('no submission has a Teacher-only marker', !moved.length, moved.join('; ') || 'none (Teacher-only users: ' + teacherOnly.join(', ') + ')');
    S.tas.v = 'A'; tasEnter(); const key = (tasSubs(true)[0] || {}).key;
    S.tas.v = 'T'; tasEnter(); S.signedIn = true;
    ok('sidebar has no marking items', !['t-queue', 't-pd', 't-portfolio', 't-obs', 't-approvals', 't-iqa'].some(r => document.querySelector(`.adm-side [data-go="${r}"]`)));
    const blocked = ['t-queue', 't-mark.' + key, 't-pd', 't-portfolio', 't-obs', 't-obsrec.C-o1', 't-approvals', 't-iqa'].map(t => { setRoute(t); render(); return [t, /Not part of your role/.test(main())]; });
    ok('every marking URL blocked for Teacher-only', blocked.every(b => b[1]), blocked.filter(b => !b[1]).map(b => b[0]).join(', '));
    go('t-dashboard'); ok('teaching-only dashboard', /Teaching/.test(main()) && !/Start marking/.test(main()));
    go('t-progress'); ok('Progress & Gap Analysis read-only', /Read-only for Teachers/.test(main()) && !document.querySelector('main [data-act="tasRec"]')); go('t-reports'); ok('Reports: teaching reports, no marking activity', /Attendance report/.test(main()) && /Cohort progress/.test(main()) && !/My marking activity/.test(main()));
    ['t-students', 't-assign', 't-sessions', 't-calendar', 't-messages', 't-announcements', 't-notifications', 't-profile'].forEach(r => { go(r); ok('keeps ' + r, !/Not part of your role/.test(main())); });
  });
  // ---------- G5 ----------
  T('G5.1 deposit refund on rejection', () => { SA(); const w = STORE.worlds.B; chQuickSignup(w); /* CH-07: an application is reviewed (and can be rejected) only after the sign-up, deposit paid */ const i = allQueue().find(x => x.id === 'AQ-ADM-B'); w.admission.status = 'Under Review'; applyDecision(allQueue().find(x => x.id === 'AQ-ADM-B'), 'reject', 'Entry requirements not met'); const it = ADMIN.queue.find(x => x.type === 'Refund' && (x.data || {}).depV === 'B'); ok('refund item to Finance', !!it, it && (it.id + ' → ' + it.first + ' ' + it.status)); S.edge = 'none'; ACT.demoSignInAs({ dataset: { r: 'learner' } }); setVariant('B', true); go('admission'); ok('learner card shows refund state', /Deposit refund in progress|Refunded/.test(main())); });
  T('G5.6 discount rates', () => { SA(); go('a-bundles', { tab: 'rates' }); ok('rates tab', /Current rates — version 2/.test(main())); bizEnter('BA'); S.signedIn = true; go('a-bundles', { tab: 'rates' }); ok('Business Admin A sees editable form', !!$('#dr-std') && !$('#dr-std').readOnly); $('#dr-std').value = '3'; $('#dr-r').value = 'Test'; SUBMIT.discSave(); const it = ADMIN.queue[0]; ok('creates Discount rate change item', it.type === 'Discount rate change' && it.first === 'Super Administrator'); ok('rate unchanged until approved', discNow().std === 0); SA(); applyDecision(it, 'approve', 'OK'); ok('approved → new version applies', discNow().std === 3 && discNow().v === 3); bizEnter('BB'); S.signedIn = true; go('a-bundles', { tab: 'rates' }); ok('Business Admin B read-only', $('#dr-std').readOnly); });
  T('G5.7 / G5.8', () => { acaEnter('KA'); S.signedIn = true; go('a-courses', { id: ADMIN.courses[0].id }); ok('Academic Admin price read-only', $('#cd-g') && $('#cd-g').readOnly); agyEnter('AG-02', true); S.signedIn = true; go('g-purchases'); ok('no invoice documents', !/Invoice –|Download invoice|Attach invoice/.test(main())); });
  T('G6.5 / G6.6 / G6.9', () => { SA(); go('a-programmes', { id: 'NV-L3' }); ok('LO Move action', !!document.querySelector('[data-act="loMove"]')); S.tas.v = 'A'; tasEnter(); S.signedIn = true; ACT.obPropose({ dataset: {} }); ok('Location type options', !!$('input[name="op-lt"][value="office"]')); $('input[name="op-lt"][value="office"]').checked = true; INP.obLt(); ok('office: IA criteria hidden, no permission needed', $('#op-ia').hidden && !$('#op-send') || !$('#op-send').disabled); closeModal(); iqaEnter('QA'); S.signedIn = true; go('q-findings'); ok('IQA statuses', DT.qfind.filters.find(f => f.k === 's').opts.join() === 'Open,Acknowledged,Closed'); });
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
