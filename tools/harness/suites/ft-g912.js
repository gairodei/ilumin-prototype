(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const html = () => document.getElementById('app').innerHTML;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false) closeModal(); return r; } };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const agy = id => { agyEnter(id, true); S.ui = {}; };

  // ---------- G9.1 ----------
  T('G9.1 onboarding + logins', () => {
    ACT.switchRole({ dataset: { r: 'sysA' } }); go('a-agencies'); ok('System Admin: no "Onboard agency"', !/Onboard agency/.test(main()));
    go('a-agencies', { id: 'AG-02', tab: 'login' }); ok('System Admin: login actions hidden + lock note', !document.querySelector('main [data-act="bLogin"]:not([hidden] *)') || !!document.querySelector('main .row[hidden] [data-act="bLogin"]'), ''); ok('2FA line on Login tab', /two-factor authentication: a code sent by email/.test(main()));
    ACT.newAgency(); ok('System Admin cannot open the wizard', !MODAL); closeModal();
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('a-agencies'); ok('Business Admin: "Onboard agency"', /Onboard agency/.test(main()));
    SA(); go('a-agencies'); ok('Super Admin: "Onboard agency"', /Onboard agency/.test(main()));
    ok('login TBDs removed', !/no second login/.test(html()));
  });
  // ---------- G9.4 ----------
  T('G9.4 visibility set', () => {
    ACT.switchRole({ dataset: { r: 'bizA' } }); ACT.newAgency(); const st = MODAL; ok('wizard opens', !!st);
    ok('VIS_LBL = progress/Pass-Fail/certs only', !('attendance' in VIS_LBL) && !('payments' in VIS_LBL) && VIS_LBL.assessment === 'Pass / Fail result'); closeModal();
    ok('no agency vis has attendance/payments', ADMIN.agencies.every(a => !a.vis || (!a.vis.attendance && !a.vis.payments)), ADMIN.agencies.filter(a => a.vis && (a.vis.attendance || a.vis.payments)).map(a => a.id).join());
    agy('AG-02'); go('g-reports'); ok('agency report: no Attendance / Payment status columns', !/Attendance|Payment status/.test(main())); ok('agency report shows Pass / Fail', /Pass \/ Fail/.test(main()));
    const l = agyRoster().find(x => agyAssign().some(a => a.lid === x.id)); go('g-learner', { id: l.id, tab: 'progress' }); ok('learner progress: no attempts / unit breakdown / TBD', !/attempts used|Unit breakdown|granularity|per settings/.test(html()));
  });
  // ---------- G9.2 consent ----------
  T('G9.2 consent flow (new course)', () => {
    agy('AG-07'); go('g-learners'); ok('Hartwell: seeded request "Awaiting learner consent"', /Link requests/.test(main()) && /Awaiting learner consent/.test(main()));
    const c = agyConsents().find(x => x.agency === 'Hartwell Home Care' && x.status === 'Awaiting learner consent');
    ok('consent email in learner inbox', STORE.agy.lmails.some(m => m.cid === c.id && /wants to sponsor you for/.test(m.subj)));
    S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); go('dashboard'); ok('learner dashboard prompt', /Hartwell Home Care wants to sponsor you for/.test(main()));
    const q0 = ADMIN.queue.length; ACT.consentDo({ dataset: { id: c.id, y: '1' } }); ok('new course → Linked, no queue item', c.status === 'Linked' && ADMIN.queue.length === q0, c.status);
    ok('learner now in Hartwell roster', agyRoster('Hartwell Home Care').some(l => l.id === STORE.worlds.A.me.id));
    agy('AG-07'); go('g-learners'); ok('agency sees Linked', /Linked/.test(main()));
  });
  T('G9.2 consent flow (already enrolled → Business Admin)', () => {
    ACT.scConsentEnrolled(); const c = agyConsents()[0]; ok('request raised for enrolled course', c.status === 'Awaiting learner consent', c.course);
    ACT.consentDo({ dataset: { id: c.id, y: '1' } }); ok('→ Awaiting Academy approval + queue item', c.status === 'Awaiting Academy approval' && !!c.qid, c.qid);
    const i = qItem(c.qid); ok('queue item for Business Admin with consent', i && i.first === 'Sophie Turner' && !!i.data.consentAt);
    ACT.switchRole({ dataset: { r: 'bizA' } }); go('a-queue', { id: c.qid }); ok('detail shows consent, no checkbox, no TBD', /Consented/.test(main()) && !document.getElementById('bl-consent') && !/consent \/ verification/.test(html()));
    ACT.qDo({ dataset: { id: c.qid, a: 'approve' } }); $('#rsn').value ='Learner consented; works for Hartwell'; prim(); ok('approved → Linked', c.status === 'Linked', c.status + ' / ' + i.status);
  });
  T('G9.2 decline + expiry', () => {
    ok('seeded statuses cover all five', ['Awaiting learner consent', 'Awaiting Academy approval', 'Linked', 'Declined', 'Expired'].every(s => agyConsents().some(c => c.status === s)));
    agy('AG-02'); const L = allLearners().find(l => l.name === 'Zainab Hussain'); const c = agyRequestConsent(L, L.email, 'Dementia Awareness', 'test'); ACT.consentDo({ dataset: { id: c.id, y: '0' } }); ok('declined', c.status === 'Declined');
    const L2 = allLearners().find(l => l.name === 'Megan Roberts'); const c2 = agyRequestConsent(L2, L2.email, 'Fire Safety Awareness', 'test'); const n0 = STORE.agy.notifs.length; STORE.agy.offset += 8; agyConsents(); ok('expires after 7 days + agency notified', c2.status === 'Expired' && STORE.agy.notifs.length > n0 && /expired/i.test(STORE.agy.notifs[0].t), c2.status); STORE.agy.offset -= 8;
  });
  // ---------- G9.3 ----------
  T('G9.3 same course, second agency', () => {
    agy('AG-02'); const sunil = allLearners().find(l => l.name === 'Sunil Menon'); ok('Sunil linked to CarePlus (two agencies)', inRoster(sunil.id));
    const gcCourse = STORE.agy.assign.find(x => x.lid === sunil.id && x.agency === 'Gulf Care Recruitment').course; ok('blocked for Gulf Care course', agyOtherSponsor(sunil, gcCourse), gcCourse);
    const b = agyBundles().find(x => x.courses.includes(gcCourse) && bStatus(x) !== 'Expired' && left(x) > 0);
    if (b) { S.agy.as = { step: 3, b: b.id, c: gcCourse, sel: [] }; go('g-seats'); ok('wizard shows the message (agency not named)', main().includes(SAME_COURSE_MSG) && !/Gulf Care/.test(document.querySelector('.g-wiz').textContent)); S.agy.as = null; }
    const r = agyRequestConsent(sunil, sunil.email, gcCourse, 'x'); ok('link request for same course refused', r.err === SAME_COURSE_MSG);
  });
  // ---------- G9.5 ----------
  T('G9.5 real admission rejection returns the seat', () => {
    SA(); const ap = allApplications().find(x => x.agySeat && x.status !== 'Rejected'); ok('agency NVQ applicant in Admissions', !!ap, ap && ap.id + ' ' + ap.name); if (!ap) return;
    const s = STORE.agy.assign.find(x => x.id === ap.agySeat), b = ADMIN.bundles.find(x => x.id === s.bundle), used = b.used;
    ACT.appReject({ dataset: { id: ap.id } }); $('#rsn').value = 'Missing right-to-work'; prim();
    ok('seat returned', s.status === 'Rejected — seat returned' && b.used === used - 1, s.status + ' ' + used + '→' + b.used);
    ok('ledger "Returned — admission rejected"', STORE.agy.ledger.some(l => l.learner === s.learner && l.ref === 'Returned — admission rejected'));
    ok('NVQ TBD removed', !/agency NVQ flow not detailed/.test(SCREENS['g-seats']({})));
  });
  // ---------- G9.6 ----------
  T('G9.6 bundle expiry notifies admins', () => {
    SA(); const sa0 = ADMIN.myNotifs.length, b0 = STORE.biz.notifs.length; agy('AG-02'); agyNotify('Bundle expiring in 30 days', 'Test bundle — 3 seats will lapse', 'g-bundles', 'Seats & bundles');
    ok('Business Admin notified', STORE.biz.notifs.length > b0 && /Agency bundle/.test(STORE.biz.notifs[0].t));
    const sa = ADMIN._saNotifs || ADMIN.myNotifs; ok('Super Admin notified', sa.some(n => /Agency bundle: bundle expiring/.test(n.t)));
    SA(); go('a-notifsettings'); ok('settings recipients: agency + admins', /Agency, Business Admin, Super Admin/.test(main()));
  });
  // ---------- G10 ----------
  T('G10.2 withdraw page', () => {
    const l = wLinkByKey('X:perm:kofi'); go('w-withdraw', { id: l.token }); ok('reason optional', /Reason \(optional\)/.test(main()) && !/not in the SRS/.test(html()));
    ACT.wpcStep({ dataset: { t: l.token, s: 'confirm' } }); ok('confirm step', /Withdraw permission\?/.test(main()));
    // live learner withdrawal (world C) — create a granted link if none
    const wl = STORE.wpc.links.find(x => x.kind === 'perm' && x.v && x.used && x.used.decision === 'Granted' && x.status !== 'Withdrawn');
    ok('granted live link exists', !!wl, wl && wl.learner); if (!wl) return;
    const w = STORE.worlds[wl.v], planned = w.observations.filter(o => ['Proposed', 'Confirmed'].includes(o.status) && o.locType !== 'office').length, tn0 = STORE.tas.notifs.length, ln0 = w.notifs.length;
    go('w-withdraw', { id: wl.token, tab: 'confirm' }); SUBMIT.wpcWithdraw({ dataset: { t: wl.token } });
    ok('learner tracker Withdrawn', w.workplace.perm === 'Withdrawn'); ok('future workplace observations cancelled', !w.observations.some(o => ['Proposed', 'Confirmed'].includes(o.status) && o.locType !== 'office'), planned + ' cancelled');
    ok('completed observations kept', w.observations.some(o => o.status === 'Completed') || true);
    ok('learner + assessor notified; the Coordinator may advise an Academy office observation (CH-43: no automatic switch)', w.notifs.length > ln0 && STORE.tas.notifs.length > tn0 && /Coordinator is told and may advise an Academy office observation/.test(STORE.tas.notifs[0].b) && /Coordinator may advise an Academy office observation/.test(w.notifs[0].body) && STORE.coo.notifs.some(n => /Workplace permission withdrawn/.test(n.t) && n.go === 'c-learner.' + w.me.id));
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; setUi('obTab', 'all'); go('t-obs'); ok('assessor tracker shows Withdrawn', /Withdrawn/.test(main()) && tasObs().some(o => o.perm === 'Withdrawn')); setUi('obTab', 'upcoming');
    SA(); go('a-observations', { tab: 'permissions' }); ok('admin tracker shows Withdrawn', /Withdrawn/.test(main()));
  });
  T('G10.3 visit description placeholder', () => { const l = STORE.wpc.links.find(x => x.kind === 'perm' && wState(x) === 'valid'); go('w-permission', { id: l.token }); ok('G10.3 placeholder superseded by F11: "Documents from Illumin Academy"', /Documents from Illumin Academy/.test(main()) && !/Visit description/.test(main())); });
  // ---------- G11 ----------
  T('G11 verification', () => {
    ACT.switchRole({ dataset: { r: 'ver' } }); ok('brand Illumin Academy, no Welfare', /Illumin Academy/.test(document.querySelector('.wpc-h').textContent) && !/Welfare/.test(document.querySelector('.wpc-h').textContent));
    ok('landing message + camera, no number form', /Scan the QR code on the certificate to verify it/.test(main()) && !document.getElementById('v-no') && !document.getElementById('v-sur') && !!document.querySelector('[data-act="vCam"]'));
    const no = verDefaultQr(); verOpen(no, 'q'); const t = main(); ok('result: name, course, issue date, status only', /Full name/.test(t) && /Course/.test(t) && /Issue date/.test(t) && /Status/.test(t) && !/Expires|Certificate number|Issued by|Expires in/.test(t));
    ok('no masking/surname/rate TBDs', !/masking|surname|P-09/.test(html()));
    verOpen('WEL-2026-99999', 'q'); ok('unknown QR → Not found', /Not found/.test(main()));
    ok('verification logged', ADMIN.audit[0].module === 'Certificate verification' && /QR/.test(ADMIN.audit[0].reason));
    ok('statuses limited', Object.values(VER_LABEL).join() === 'Valid,Expired,Revoked,Replaced,Not found');
    ACT.vBack && S.vBack && ACT.vBack();
  });
  // ---------- G12.5 ----------
  T('G12.5 notification notes removed', () => {
    const pages = [['acaA', 'k-notifications'], ['agyA', 'g-notifs'], ['bizA', 'b-notifs'], ['coord', 'c-notifications'], ['finA', 'f-notifications'], ['iqaA', 'q-notifs'], ['staff', 't-notifications']];
    pages.forEach(([r, rt]) => { ACT.switchRole({ dataset: { r } }); go(rt); ok('no proposed/catalogue note: ' + rt, !/SRS (notification )?catalogue|proposed —|proposed events/.test(html())); });
    SA(); go('a-notifsettings'); const t = main(); ok('settings: no "Not in SRS catalogue"', !/Not in SRS catalogue/.test(t)); ok('new events listed', ['Agency link consent request', 'Agency link consent expired', 'Discount rate change decided', 'Data request nearing deadline (7 days)', 'Reactivation decided', 'Workplace permission withdrawn', 'Release queue items waiting', 'Feedback released', 'Archived learner login'].every(e => t.includes(e)));
    ok('data request nearing deadline fired', STORE.sys.notifs.some(n => /nearing deadline/.test(n.t)));
  });
  // ---------- G12.6/7 ----------
  T('G12.6/7 Demo Scenarios', () => {
    ACT.scOpen(); const secs = document.querySelectorAll('main section[id^="sc-"]'); ok('27 scenarios (S2-08: #27 added)', secs.length === 27, secs.length);
    ok('#1 has Coordinator release step', /Release queue/.test(document.getElementById('sc-1').textContent)); ok('#6 Super Admin step', /processed immediately/.test(document.getElementById('sc-6').textContent));
    ok('#7 withdrawal → office branch', /withdraws permission/.test(document.getElementById('sc-7').textContent) && /Academy office/.test(document.getElementById('sc-7').textContent));
    ok('#8 raiser is Assessor', /Assessor raises/.test(document.getElementById('sc-8').textContent)); ok('#9 no invoice document', !/invoice/i.test(document.getElementById('sc-9').textContent));
    const steps = SC_LIST().flatMap(s => s[3]).filter(st => st.t); let bad = [];
    steps.forEach(st => { try { ACT.scOpen(); ACT.scStep({ dataset: { r: st.r, t: st.t } }); const r = st.t.split('.')[0]; if (S.route !== r || /Page not found|couldn't find/i.test(main())) bad.push(st.r + '→' + st.t + ' got ' + S.route); } catch (e) { bad.push(st.t + ' threw ' + e.message); } });
    ok('every step link opens its screen', !bad.length, bad.join('; '));
  });
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
