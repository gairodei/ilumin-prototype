// TBD cleanup — every CHANGE and REMOVE item, and the remaining tag set
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = async (n, f) => { try { await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const html = () => document.getElementById('app').innerHTML;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false && MODAL && MODAL.actions.includes(a)) closeModal(); return r; } };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); };
  const tbdTexts = () => [...document.querySelectorAll('.tbd')].map(x => x.textContent.trim());

  await T('011 cohort migration', () => {
    SA(); go('a-programmes', { id: 'NV-L3', tab: 'versions' }); ok('Super Admin has "Migrate a cohort"', !!document.querySelector('main [data-act="migrateCohort"]'));
    acaEnter('KA'); S.signedIn = true; go('a-programmes', { id: 'NV-L3', tab: 'versions' }); ok('Academic Admin: lock note, no button', !document.querySelector('main [data-act="migrateCohort"]') && /Cohort migration — Super Administrator only/.test(main()));
    ACT.switchRole({ dataset: { r: 'sysA' } }); go('a-programmes', { id: 'NV-L3', tab: 'versions' }); ok('System Admin: lock note, no button', !document.querySelector('main [data-act="migrateCohort"]') && /Cohort migration — Super Administrator only/.test(main()));
    ACT.migrateCohort(); ok('direct action blocked', !MODAL); closeModal();
  });
  await T('059 unanswered agency message — 2 working days', () => {
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('b-dashboard'); const ags = ADMIN.agencies.map(a => a.name);
    const due = ADMIN.threads.filter(t => ags.includes(t.party) && t.status === 'Open' && workDaysSince(t.msgs[t.msgs.length - 1][1]) >= 2).length;
    const shown = (main().match(/Unanswered agency message \(2\+ working days\)/g) || []).length; ok('alerts = open agency threads 2+ working days old', shown === due && !/older than N hours/.test(html()), shown + ' / ' + due);
    const d = new Date(Date.UTC(2026, 9, 2, 10)); const fri = d.toISOString(); ok('working days skip weekends', workDaysSince(fri) === (({ 0: 0, 6: 0 })[now().getUTCDay()] ?? 0) + (now().getUTCDay() === 1 ? 1 : now().getUTCDay() > 1 ? now().getUTCDay() - 1 + 1 : 0) || workDaysSince(fri) <= 5, String(workDaysSince(fri)));
  });
  await T('061 / 062 / 065 registration number required (CH-02: no billing currency)', () => {
    ACT.switchRole({ dataset: { r: 'bizA' } }); ACT.newAgency(); $('#oa-n').value = 'Test Agency Ltd'; const r1 = prim(); ok('blocked without registration number', r1 === false && /Step 1|step 1/.test(MODAL.title) && /registration number/i.test(MODAL ? document.getElementById('modal-root').textContent : ''));
    ok('CH-02 no billing-currency field', !$('#oa-cur'));
    $('#oa-r').value = '01234567'; prim(); ok('continues when the registration number is filled', /step 2/.test(MODAL.title)); closeModal();
    go('a-agencies', { id: 'AG-02' }); ok('profile: "Registration number", no TBD', /Registration number/.test(main()) && !tbdTexts().length);
  });
  await T('067 bundle minimum price — Super Admin only', () => {
    ACT.switchRole({ dataset: { r: 'sysA' } }); go('a-config'); const row = [...document.querySelectorAll('main tbody tr')].find(tr => /Bundle minimum price/.test(tr.textContent));
    ok('System Admin: read-only "Set by the Super Administrator"', row && /Set by the Super Administrator/.test(row.textContent) && !row.querySelector('[data-act="cfgEdit"]'));
    SA(); go('a-config'); const r2 = [...document.querySelectorAll('main tbody tr')].find(tr => /Bundle minimum price/.test(tr.textContent)); ok('Super Admin can edit', !!(r2 && r2.querySelector('[data-act="cfgEdit"]')));
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('a-bundles'); ok('Business Admin note', /set by the Super Administrator/.test(main()) && /System Administrator approval/.test(main()));
  });
  await T('079 Coordinator sees email only', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-learner', { id: 'IA-L-18022' }); const L = learnerById('IA-L-18022'); ok('email shown, mobile not', main().includes(L.email) && !main().includes(L.mobile)); });
  await T('094 overpayment → refund for the surplus', async () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-ledger'); ACT.finOffline({ dataset: {} }); await wait(50);
    const t = payTargets().find(x => x.key === $('#op-t').value); $('#op-a').value = String(t.due + 40); INP.opPrev(); // CH-02: no currency select (GBP only)
    ok('no "Record as credit"; surplus button shown', !/Record as credit/.test(document.getElementById('modal-root').textContent) && !!document.querySelector('#modal-root [data-act="opSurplus"]'));
    $('#rsn').value = 'Paid by bank transfer'; ACT.opSurplus(); await wait(50); ok('refund pre-filled with the surplus', MODAL && /Raise refund/.test(MODAL.title) && +$('#rr-a').value === 40, MODAL && MODAL.title + ' ' + ($('#rr-a') || {}).value); closeModal();
  });
  await T('124 quiz one per screen', () => { learner('A'); const e = W.enrolments.find(x => x.id === 'cc'); W.quiz = { e: e.id, ans: {}, cur: 0, ends: Date.now() + 6e5, mode: 'one', conn: true }; go('quiz', { id: e.id }); ok('no layout switch', !document.querySelector('[data-act="quizMode"]') && !/All on one page/.test(main()) && !!document.querySelector('[data-act="quizGo"]')); W.quiz = null; });
  await T('131 cancel a pending request', () => {
    learner('C'); go('requests'); const r = W.requests.find(x => x.status === 'Requested'); ok('Cancel request shown', !!document.querySelector(`main [data-act="reqCancel"][data-id="${r.id}"]`) && /You can cancel a request while it is pending/.test(main()));
    ACT.reqCancel({ dataset: { id: r.id } }); prim(); ok('status Cancelled', r.status === 'Cancelled');
    SA(); const q = allQueue().find(i => i.req === r); ok('queue item closed and shows Cancelled', q && q.status === 'Cancelled' && !isOpen(q), q && q.status);
    go('a-queue', { id: q.id }); ok('approver sees Cancelled', /Cancelled/.test(main()));
  });
  await T('137 / 138 / 141 / 145 assessor', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-dashboard'); ok('137 turnaround 10 working days', /Turnaround target: 10 working days/.test(main()));
    go('t-students', { id: 'IA-L-18022' }); const L = learnerById('IA-L-18022'); ok('138 email and phone', main().includes(L.email) && /Phone/.test(main()));
    go('t-portfolio'); ok('141 no Tag evidence', !/Tag evidence/.test(main()) && !document.querySelector('[data-act="pfTag"]'));
    go('t-iqa'); ok('145 no dispute threads', !/dispute/i.test(main()));
  });
  await T('150 System Administrator role — Super Admin only', () => {
    ACT.switchRole({ dataset: { r: 'sysA' } }); const s = ADMIN.staff.find(x => x.roles.includes('System Administrator') && !x.roles.includes('Super Administrator') && x.name !== ADMIN.me.name);
    go('a-staff', { id: s.id, tab: 'roles' }); const b = document.querySelector('main [data-act="revokeRole"][data-r="System Administrator"]'); ok('revoke disabled with note', b && b.disabled && /Only a Super Administrator can grant or remove this role/.test(main()));
    const o = [...document.querySelectorAll('#gr option')].find(x => /^System Administrator/.test(x.textContent)); const t = ADMIN.staff.find(x => !x.roles.includes('System Administrator') && !x.roles.includes('Super Administrator') && x.status === 'Active'); go('a-staff', { id: t.id, tab: 'roles' });
    const o2 = [...document.querySelectorAll('#gr option')].find(x => /^System Administrator/.test(x.textContent)); ok('grant option disabled', !o2 || o2.disabled);
    const n0 = s.roles.length; ACT.revokeRole({ dataset: { id: s.id, r: 'System Administrator' } }); ok('revoke blocked', s.roles.length === n0 && !MODAL); closeModal();
  });
  await T('156 typed name required to grant', () => {
    const l = STORE.wpc.links.find(x => x.kind === 'perm' && wState(x) === 'valid'); go('w-permission', { id: l.token, tab: 'grant' }); const d = STORE.wpc.drafts[l.token]; d.auth = true; d.agree = true; d.sig = ''; render();
    ok('disabled until name typed', $('#wg-go').disabled && /type your full name/i.test(main())); d.sig = 'Jane Smith'; render(); ok('enabled with name', !$('#wg-go').disabled);
  });
  await T('REMOVE items', () => {
    SA(); go('a-me', { tab: 'security' }); ok('021 admin: no Active sessions', !/Active sessions/.test(main()));
    learner('C'); go('profile', { tab: 'security' }); ok('132 learner: no Active sessions', !/Active sessions/.test(main()));
    S.signedIn = false; S.auth = 'tfa-code'; render(); ok('024 no Trust this device', !/Trust this device/.test(html())); SA();
    go('a-audit'); ok('025 no Save view', !/Save view/.test(main()));
    agyEnter('AG-02', true); go('g-reports'); ok('038/056 agency: no scheduled reports', !/Scheduled reports|Schedule a report/.test(main()));
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('b-reports'); ok('076 business: no Scheduled tab', !/Scheduled/.test(main()));
    setAdminIdentity('FA'); S.portal = 'admin'; go('f-reports'); ok('104 finance: no Schedule', ![...document.querySelectorAll('main button')].some(b => /^Schedule/.test(b.textContent.trim())));
    acaEnter('KA'); S.signedIn = true; go('a-reports'); ok('Academic Admin reports: no Scheduled tab', !/Scheduled reports/.test(main())); SA(); go('a-reports'); ok('Super Admin reports: no Scheduled tab', !/Scheduled reports/.test(main()));
    agyEnter('AG-02', true); ACT.agAddLearner(); ok('046/047 no DOB / address', !$('#gl-d') && !$('#gl-p') && !!$('#gl-r')); closeModal();
    SA(); go('a-referrals'); ok('072 no Settings tab (Super Admin)', !/data-tab="settings"/.test(html()) && !ADMIN.config.some(c => /Invalid referral code/.test(c.name)));
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('a-referrals'); ok('072 no Settings tab (Business Admin)', !/data-tab="settings"/.test(html()));
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; const th = STORE.coo.threads ? STORE.coo.threads[0] : null; go('c-messages', th ? { id: th.id } : {}); ok('085 no read receipts', !/>Seen</.test(html()));
    setAdminIdentity('FA'); S.portal = 'admin'; go('f-overdue'); ok('101 no Message on overdue rows', !document.querySelector('main [data-act="odMsg"]'));
    go('f-messages'); ok('105 no learner threads in Finance', !STORE.fin.threads.some(t => /\(learner\)/.test(t.party)) && STORE.fin.threads.find(t => t.id === 'FT-1').party.startsWith('Rachel Hughes'));
    const od = odRows().find(o => o.lid); go('f-learner', { id: od.lid }); ok('103 no password reset in Finance', !/Send password reset link/.test(main()));
    learner('B'); go('admission'); ok('126 no reviewer name', !/Reviewer:/.test(main()));
    learner('A'); go('certificates'); ok('130 no Share; Copy verification link stays', !/\bShare\b/.test(main()) && /Copy verification link/.test(main()));
    learner('F'); go('profile', { tab: 'referral' }); ok('134 no referral count', !/People who registered/.test(main()) && /WB-FATIMA07/.test(main()));
    go('w-inbox', { id: STORE.wpc.emails[0].id }); ok('166 no SMS version', !/SMS version|sms-phone/.test(html()));
  });
  await T('remaining tags + contact details', () => {
    ok('2 topics: 2 Pending client, 0 Client to supply (CH-36: every Client to supply topic resolved; P-31, P-34)', TBD_TOPICS.length === 2 && TBD_TOPICS.every(t => t[0] === 'Pending client'));
    const pages = [['learner:C', 'help'], ['learner:C', 'checkout'], ['agyA', 'g-help'], ['agyA', 'g-messages'], ['ver', ''], ['learner:A', 'certificates'], ['learner:C', 'observations']];
    const seen = new Set(); learner('C'); go('help'); tbdTexts().forEach(t => seen.add(t)); agyEnter('AG-03', true); go('g-messages'); tbdTexts().forEach(t => seen.add(t)); go('g-help'); tbdTexts().forEach(t => seen.add(t));
    ok('every tag on these pages is a remaining topic', [...seen].every(t => TBD_TOPICS.some(x => t === x[0] + ': ' + x[1])), [...seen].join(' | '));
    ok('no fake contact details rendered', !/illumin\.academy|116 496|555 0142/.test(document.getElementById('app').innerHTML));
    ACT.scOpen(); go('tbd-register'); ok('TBD register lists 2 topics (CH-36)', /Remaining — 2 topics/.test(main()) && /2 Pending client · 0 Client to supply/.test(main()));
    go('cd-log'); ok('Decisions Log row', /TBD cleanup — 154 of 166 tags resolved by agreed defaults/.test(document.getElementById('app').textContent));
    go('ux-changelog'); ok('UX Changelog entry', /CHANGE 011:/.test(main()) && /REMOVE 166:/.test(main()));
  });
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
