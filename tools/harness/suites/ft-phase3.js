// UX polish v2 — Phase 3 checks (navigation and wayfinding).
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const side = () => document.querySelector('#app nav.side, #app nav.adm-side');
  const visibleLinks = () => [...side().querySelectorAll('a[data-go]')].filter(a => !a.closest('details.nav-more'));
  const firstH2 = () => { const h = document.querySelector('main h2'); return h ? h.textContent.trim() : ''; };

  T('Sidebars', () => {
    const roles = [['Super Admin', SA], ['Finance', () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; }], ['Academic', () => { acaEnter('KA'); S.signedIn = true; }], ['Business', () => { bizEnter('BA'); S.signedIn = true; }], ['IQA', () => { iqaEnter('QA'); S.signedIn = true; }], ['Coordinator', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; }], ['Teacher/Assessor', () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; }], ['Teacher only', () => { S.tas.v = 'T'; tasEnter(); S.signedIn = true; }], ['Agency', () => { agyEnter('AG-02', true); S.signedIn = true; }], ['Learner', () => { S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; }]];
    const bad = [], big = [];
    roles.forEach(([n, enter]) => { enter(); render(); const s = side(); if (!s) { bad.push(n + ' no sidebar'); return; } if (!s.querySelector('.nav-grp .nav-gh')) bad.push(n + ' not grouped'); const v = visibleLinks().length; if (v > 13) big.push(n + ' ' + v); if (!s.querySelector('a[aria-current="page"]')) bad.push(n + ' no current page'); });
    ok('every role sidebar is grouped and highlights the current page', !bad.length, bad.join('; '));
    ok('about 10 visible items, the rest under "More"', !big.length, big.join('; '));
    SA(); go('a-config'); const more = side().querySelector('details.nav-more'); ok('"More" opens when the current page is inside it', more && more.open);
    ok('one label per route: Bundles & Pricing', [...side().querySelectorAll('a[data-go="a-bundles"]')].every(a => /Bundles & Pricing/.test(a.textContent)));
    ok('Super Admin has a Notifications page', !!side().querySelector('a[data-go="a-notifications"]'));
    go('a-notifications'); ok('Notifications page renders', /Notifications/.test(firstH2() + main()));
  });

  T('Breadcrumbs and back', () => {
    SA(); const b = ADMIN.batches[0]; go('a-batches', { id: b.code }); ok('detail page has a breadcrumb', !!document.querySelector('main .crumbs'));
    go('a-learners', { id: allLearners()[0].id }); ok('a-learners.<id> opens Learner 360', !/Search learners|All learners/.test(firstH2()) && main().includes(allLearners()[0].name));
  });

  T('Dead ends', () => {
    acaEnter('KA'); S.signedIn = true; go('k-dashboard');
    const ban = [...document.querySelectorAll('#app .banner')].find(x => /Integration failure/.test(x.textContent));
    ok('Academic Admin: integration banner shown, with no link to Integrations', !!ban && !ban.querySelector('[data-go="a-integrations"]') && /Super Administrator has been notified/.test(ban.textContent), ban && ban.textContent.slice(0, 120));
    SA(); const failing = ADMIN.integrations.filter(i => i.status === 'Failing').map(i => i.name);
    ok('…and that is true: the Super Administrator has a notification for each failing integration', failing.length > 0 && failing.every(n => ADMIN.myNotifs.some(x => new RegExp(n.split(' ')[0], 'i').test(x.t) && /fail/i.test(x.t))), failing.join() + ' / ' + ADMIN.myNotifs.map(x => x.t).join(' | '));
    SA(); go('a-dashboard'); const ban2 = [...document.querySelectorAll('#app .banner')].find(x => /Integration failure/.test(x.textContent));
    ok('Super Admin keeps "Open Integrations"', !ban2 || !!ban2.querySelector('[data-go="a-integrations"]'));
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-release', { id: 'nope~x' }); ok('Release item: a way back', /release queue/i.test(main()) && !!document.querySelector('main [data-go="c-release"]'));
    S.variant = 'E'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; INP.role({ value: 'Teacher (staff)' });
    ok('Learner E "Teacher (staff)" opens the Teacher portal', S.portal === 'staff' && TME().name === 'Tom Whitfield' && !/outside this prototype/.test(main()), S.portal + ' ' + main().slice(0, 60));
    INP.tasCtx({ value: 'Learner' }); ok('…and back to the learner view', S.portal === 'learner' && S.variant === 'E');
    S.coo.v = 'C'; cooEnter(); S.signedIn = true; INP.cooCtx({ value: 'Teacher' });
    ok('Coordinator C "Teacher" opens the Teacher portal', S.portal === 'staff' && TME().name === 'Dr Helen Carter' && !/not yet built/.test(main()));
    INP.tasCtx({ value: 'Academic Coordinator' }); ok('…and back to Coordinator C', S.portal === 'coord' && CME().name === 'Dr Helen Carter');
  });

  T('Teacher-only', () => {
    S.tas.v = 'T'; tasEnter(); S.signedIn = true; go('t-dashboard');
    ok('no "To mark" header button', !document.querySelector('#app header [data-go="t-queue"]'));
    const locked = tasNotifs().filter(n => { const r = String(n.go || '').split('.')[0]; return T_ROUTE_CAP[r] && CAN(T_ROUTE_CAP[r]) === 'no'; });
    ok('no notifications for locked screens', !locked.length, locked.map(n => n.go).join());
  });

  T('Dashboards', () => {
    const chk = (n, enter, r) => { enter(); go(r); ok(n + ': "Needs your attention" first', firstH2().startsWith('Needs your attention'), firstH2()); };
    chk('Super Admin', SA, 'a-dashboard');
    chk('Finance', () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; }, 'f-dashboard');
    chk('Coordinator', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; }, 'c-dashboard');
    chk('Agency', () => { agyEnter('AG-02', true); S.signedIn = true; }, 'g-dashboard');
    chk('Business', () => { bizEnter('BA'); S.signedIn = true; }, 'b-dashboard');
    chk('IQA', () => { iqaEnter('QA'); S.signedIn = true; }, 'q-records');
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; const risk = myLearners().filter(l => l.flags.includes('At risk')); go('c-dashboard');
    ok('Coordinator: at-risk learners listed', !risk.length || risk.every(l => main().includes('At risk: ' + l.name)));
    SA(); go('a-dashboard'); const h3 = [...document.querySelectorAll('main h3')].find(h => /^Assigned to me/.test(h.textContent));
    const list = h3 && h3.nextElementSibling && h3.nextElementSibling.matches('ul') ? h3.nextElementSibling : h3 && h3.parentElement.querySelector('h3 ~ p + ul, h3 + ul');
    ok('Super Admin: oldest awaiting shown', /Oldest awaiting you/.test(main()));
  });

  T('Search', () => {
    SA(); S.aq = 'a'; render(); const groups = [...document.querySelectorAll('.adm-sr .sr-gh')].map(x => x.textContent);
    ok('results grouped by type', groups.length >= 2, groups.join());
    ok('at most 5 per type', [...document.querySelectorAll('.adm-sr .sr-grp')].every(g => g.querySelectorAll('li').length <= 5));
    S.aq = ''; render(); document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true })); ok('"/" focuses search', document.activeElement && document.activeElement.id === 'asearch');
    go('a-learners'); const tf = document.querySelector('main input[type="search"], main input.input'); ok('a text field to type in', !!tf);
    if (tf) { tf.focus(); const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }); tf.dispatchEvent(ev); ok('"/" typed in a text field stays in that field (not hijacked)', document.activeElement === tf && !ev.defaultPrevented); }
    // "/" in the message boxes and the learner answer sheet stays where it is typed
    const slashStays = (name, el) => { if (!el) { ok(name + ': box found', false); return; } el.focus(); const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }); el.dispatchEvent(ev); ok('"/" in ' + name + ' stays in that box (not hijacked)', document.activeElement === el && !ev.defaultPrevented, (document.activeElement || {}).id || (document.activeElement || {}).className); if (!ev.defaultPrevented && document.activeElement === el) { const before = 'value' in el ? el.value : el.textContent; document.execCommand('insertText', false, 'see 1/2'); const after = 'value' in el ? el.value : el.textContent; ok('"/" typed into ' + name + ' appears in the text', after.length > before.length && after.endsWith('see 1/2'), JSON.stringify(after.slice(-20))); } };
    SA(); go('a-messages', { id: ADMIN.threads[0].id }); slashStays('the admin message box', document.querySelector('main #arep'));
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    go('messages', { id: W.threads[0].id }); slashStays('the learner message box', document.querySelector('main #reply'));
    const a3 = W.assignments.find(a => a.status === 'Not Started') || W.assignments[0]; go('assignment', { id: a3.id }); slashStays('the learner answer sheet', document.querySelector('main .rte-body[contenteditable="true"]'));
    SA();
    S.aq = 'zzzz-no-match'; render(); ok('no-match message explains what to try', /Try a name, an ID/.test(document.querySelector('.adm-sr').textContent));
    const i = $('#asearch'); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); ok('Esc closes the results', !S.aq && !document.querySelector('.adm-sr'));
  });

  T('Role switch keeps the page', () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
    const sel = document.querySelector('#fctx, [data-onchange="finCtx"]');
    if (!sel) { ok('Finance multi-role switch (variant not multi-role — skipped)', true); return; }
    go('a-queue'); INP.finCtx({ value: [...sel.options].map(o => o.value).find(v => v !== S.finCtx) }); ok('switching role stays on Approvals Queue', S.route === 'a-queue', S.route);
  });

  T('Demo panel', () => {
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.demoOpen = true; render();
    const legs = [...document.querySelectorAll('#demo-root .demo-panel > fieldset > legend')].map(l => l.textContent.trim());
    const ri = legs.findIndex(l => /^Role/i.test(l)), rs = legs.findIndex(l => /^Reset/.test(l)), sc = legs.findIndex(l => /Scenario/i.test(l));
    ok('Roles first, Reset last, Scenarios before Reset', ri === 0 && rs === legs.length - 1 && (sc < 0 || sc < rs), legs.join(' | '));
    ok('each section has a description', [...document.querySelectorAll('#demo-root .demo-panel > fieldset')].every(f => f.querySelector('.demo-desc')));
    ok('current role on the button', /Learner · /.test(document.querySelector('#demo-root .demo-fab').textContent));
    S.demoOpen = false; render();
  });

  T('Shortcuts', () => {
    agyEnter('AG-02', true); S.signedIn = true; go('g-dashboard'); ok('Agency "Assign seats" starts the wizard', !!document.querySelector('main [data-act="agAssignStart"]'));
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-queue', { tab: 'resub' }); ok('Teacher KPI link opens the matching tab', ui('mqTab') === 'resub');
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
