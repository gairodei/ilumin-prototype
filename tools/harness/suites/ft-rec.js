// Step 3 records: Client Decisions Log, UX Changelog, screen index, approval routes, TBD register
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  T('Client Decisions Log', () => {
    ACT.scOpen(); go('cd-log'); const t = main();
    ok('section "Final decisions list (binding)"', /Final decisions list \(binding\)/.test(t));
    const rows = [...document.querySelectorAll('main section')[0].querySelectorAll('tbody tr')].map(tr => tr.textContent);
    ok('one row per group G1–G12, all Applied', rows.length === 12 && rows.every((r, k) => r.startsWith('G' + (k + 1)) && /Applied/.test(r)), rows.length);
    ['D2', 'D5b', 'D6'].forEach(d => ok(d + ' Resolved by final list', [...document.querySelectorAll('main tbody tr')].some(tr => tr.textContent.startsWith(d) && /Resolved by final list/.test(tr.textContent))));
    const sc = [...document.querySelectorAll('main section')].find(s => /Demo scenarios/.test(s.querySelector('h2').textContent));
    const ill = [...sc.querySelectorAll('tbody tr')].filter(tr => /Illustrative — defined by the prototype team/.test(tr.textContent)).map(tr => tr.firstChild.textContent);
    ok('#2–#5 "Illustrative — defined by the prototype team"', ill.join() === '2,3,4,5', ill.join());
  });
  T('UX Changelog', () => { ACT.scOpen(); go('ux-changelog'); const h = [...document.querySelectorAll('main section h2')].map(x => x.textContent); ok('one entry per group G1–G12', ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'].every(g => h.some(x => x.startsWith(g + ' ·'))), h.length); });
  T('TBD register', () => { ACT.scOpen(); go('tbd-register'); const t = main(); ok('removed by change ID', /Removed \(by change ID\)/.test(t) && ['G1.3', 'G3.1', 'G9.4', 'G11.2', 'G12.5'].every(g => t.includes(g))); ok('remaining listed (by topic, after the TBD cleanup)', TBD_TOPICS.length === 8 && t.includes('Remaining — ' + TBD_TOPICS.length + ' topics')); });
  T('Approval routes = G4 table', () => {
    const G4 = [['Admission', 'Learner', 'Assigned reviewer', 'Super Admin'], ['Document replacement', 'Learner', 'Normal document review', 'Super Admin'], ['Profile change', 'Learner', 'System Admin', 'Super Admin'], ['Data correction', 'Assessor, System Admin or Academic Admin', 'System Admin, then Super Admin (final)', 'Reminder'], ['Resubmission limit', 'Assessor', 'Academic Admin', 'Super Admin'], ['Discontinue / reactivate (academic)', 'Assessor', 'Academic Admin', 'Super Admin'], ['Discontinue / reactivate (non-payment)', 'Finance Admin or System Admin', 'No approval', '—'], ['Extra quiz attempts', 'Learner', 'Academic Admin', 'Super Admin'], ['More time on a short course', 'Learner', 'Academic Admin', 'Super Admin'], ['Refund', 'Finance Admin or Super Admin', 'Another Finance Admin', 'Super Admin'], ['Bundle price below minimum', 'Business Admin', 'System Admin', 'Super Admin'], ['Agency link (course already enrolled)', 'Agency', 'Learner email consent, then Business Admin', 'Super Admin'], ['Agency invoice purchase', 'Agency', 'Finance Admin', 'Super Admin'], ['Discount rate change', 'Anyone given permission', 'Super Admin', 'Reminder']];
    [['admin', () => SA()], ['sysA', null], ['acaA', null], ['bizA', null], ['finA', null]].forEach(([r, f]) => { if (f) f(); else ACT.switchRole({ dataset: { r } }); go('a-queue'); ACT.qRouting(); const got = [...document.querySelectorAll('#modal-root tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())); ok('drawer matches exactly (' + r + ')', JSON.stringify(got) === JSON.stringify(G4), got.length); const rules = [...document.querySelectorAll('#modal-root ol li')].map(li => li.textContent); ok('four rules (' + r + ')', rules.join('|') === 'Nobody approves their own item, except the Super Admin.|The Super Admin can override anything.|Every action is logged.|Each person sees only their own items.'); closeModal(); });
  });
  T('Screen index', () => {
    ACT.scOpen(); go('index'); const t = main();
    ok('learner index: registration flow', /Registration \(G2\)/.test(t) && !!document.querySelector('main [data-act="regLink"]'));
    ok('index: records + demo scenarios', /Client Decisions Log/.test(t) && /UX Changelog/.test(t) && /TBD register/.test(t) && /Demo Scenarios/.test(t));
    ok('index: workplace withdraw page', /P6 Withdraw permission — reason \(optional\) → confirm/.test(t) && !/P6 Withdraw permission \(TBD\)/.test(t));
    ok('index: verification QR only', /QR only/.test(t) && !/certificate number, surname/.test(t));
    SA(); go('a-index'); const a = main(); ok('admin index: Discount rates + Data requests', /Discount rates/.test(a) && /Data requests/.test(a));
    ACT.switchRole({ dataset: { r: 'coord' } }); go('c-index'); ok('coordinator index: Release queue', /Release queue/.test(main()));
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('b-index'); ok('business index: Discount rates', /Discount rates/.test(main()));
    S.tas.v = 'T'; tasEnter(); go('t-index'); const links = [...document.querySelectorAll('main [data-act="goTok"]')].map(b => b.dataset.t); ok('Teacher-only index lists only openable screens', !links.some(x => /^(t-queue|t-mark|t-pd|t-portfolio|t-obs|t-obsrec|t-approvals|t-iqa)\b/.test(x)) && links.includes('t-progress'), links.join(','));
    S.tas.v = 'A'; tasEnter(); go('t-index'); ok('Assessor index keeps marking screens', [...document.querySelectorAll('main [data-act="goTok"]')].some(b => b.dataset.t.startsWith('t-mark')));
  });
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
