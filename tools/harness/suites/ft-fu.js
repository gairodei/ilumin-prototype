// Follow-up decisions F1–F12 (Step 2)
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = async (n, f) => { try { await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const html = () => document.getElementById('app').innerHTML;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false && MODAL && MODAL.actions.includes(a)) closeModal(); return r; } };
  const rsn = (v = 'Test') => { const e = $('#rsn'); if (e) e.value = v; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); };

  await T('F1 Priya mock + Learner 360', () => {
    const w = STORE.worlds.H; ok('Priya exists (world H)', !!w && VNAME('H') === 'Priya Nair');
    ok('one AED enrolment, one GBP enrolment', w.enrolments.some(e => e.cur === 'AED') && w.enrolments.some(e => e.cur === 'GBP'), w.enrolments.map(e => e.title + ':' + e.cur).join());
    SA(); go('a-learner', { id: 'IA-L-40990' }); ok('Learner 360: Data region UAE (registered 12 Mar 2026)', /UAE\s*\(registered 12 Mar 2026\)/.test(main()), (main().match(/Data region[^\n]{0,80}/) || [''])[0]);
    ok('Learner 360: Country changed to United Kingdom on …', /Country changed to United Kingdom on \d{1,2} \w{3,4} \d{4}/.test(main()));
    learner('H'); go('payments'); const t = main(); ok('Payments: AED and GBP amounts side by side', /AED/.test(t) && /£/.test(t), (t.match(/Paid so far[^\n]{0,60}/) || [''])[0]);
  });
  await T('F1 country change: new purchases only, region stays', async () => {
    ACT.scPriyaBefore(); ok('before: UAE / AED / one course', W.me.country === 'United Arab Emirates' && W.me.cur === 'AED' && W.enrolments.length === 1);
    go('profile'); ACT.reqChange({ dataset: { f: 'Country of residence', v: W.me.country } });
    ok('modal note', /Changing country affects new purchases only\. Your current courses and payments stay in AED\./.test(MODAL.body));
    $('#pc-new').value = 'United Kingdom'; $('#pc-r').value = 'Moved to Reading'; prim(); const r = W.requests[0];
    ACT.switchRole({ dataset: { r: 'sysA' } }); const qid = 'AQ-' + r.id + '-H'; go('a-queue', { id: qid }); ok('System Admin sees the request', !!qItem(qid), qid);
    ACT.qDo({ dataset: { id: qid, a: 'approve' } }); rsn('Proof of address checked'); prim();
    const w = STORE.worlds.H, m = w.me; ok('approved: new purchases in GBP, region still UAE', m.cur === 'GBP' && m.region === 'UAE' && m.country === 'United Kingdom', m.cur + ' ' + m.region);
    ok('existing enrolment, plan and payment stay AED', w.enrolments[0].cur === 'AED' && w.plans[0].cur === 'AED' && w.tx[0].cur === 'AED');
    learner('H'); go('browse'); const b = [...document.querySelectorAll('main [data-act="buyCourse"]')].find(x => !w.enrolments.some(e => (x.dataset.id || '').length && e.base && e.base === x.dataset.t)) || document.querySelector('main [data-act="buyCourse"]');
    ok('browse prices in GBP', /£/.test(main())); const n0 = w.enrolments.length; ACT.buyCourse({ dataset: { ...b.dataset } }); let guard = 0; while (MODAL && guard++ < 3) { prim(); await wait(2500); } closeModal(); render();
    const ne = w.enrolments.find(e => !['pn1'].includes(e.id)); ok('new course priced in GBP', w.enrolments.length > n0 && ne && ne.cur === 'GBP', ne && ne.title + ':' + ne.cur);
    go('payments'); ok('old course still AED on Payments', /AED/.test(main()) && /£/.test(main()));
    SA(); go('a-learner', { id: 'IA-L-40990' }); ok('data region unchanged; change line shown', /UAE\s*\(registered/.test(main()) && /Country changed to United Kingdom/.test(main()));
    ok('Finance keeps each payment\'s currency', allTx().filter(x => x.payer === 'Priya Nair').map(x => x.cur).sort().join() .includes('AED'));
  });
  await T('F2 / F3 / F8 pending tags', () => {
    SA(); go('a-courses', { id: ADMIN.courses[0].id }); ok('F2 pricing tag', /Pending client: exchange-rate source/.test(html()));
    learner('A'); go('browse'); const b = document.querySelector('main [data-act="buyCourse"]'); ACT.buyCourse({ dataset: { ...b.dataset } }); ok('F2 checkout tag', MODAL && /Pending client: exchange-rate source/.test(MODAL.body)); closeModal();
    const inr = allLearners().filter(l => l.cur === 'INR'); ok('F3a INR learners exist', inr.length > 0, inr.map(l => l.name).join());
    setAdminIdentity('FA'); S.portal = 'admin'; go('f-ledger'); ok('F3a Finance shows INR separately', /INR/.test(main()));
    SA(); go('a-learner', { id: inr[0].id }); ok('F3b region tag for learners outside UK/UAE', /Pending client: storage region for learners outside the UK\/UAE/.test(html()));
    ACT.switchRole({ dataset: { r: 'agyA' } }); ACT.agBuy({ dataset: { id: 'CAT-1' } }); const inv = $('#modal-root input[name="gpm"][value="inv"]'); if (inv) inv.checked = true; prim(); ok('F8 agency bank transfer tag', MODAL && /Pending client: how agencies receive VAT invoices/.test(MODAL.body)); prim();
    const i = ADMIN.queue.find(x => x.type === 'Agency invoice (offline) purchase'); setAdminIdentity('FA'); S.portal = 'admin'; go('a-queue', { id: i.id }); ok('F8 Finance invoice item tag', /Pending client: how agencies receive VAT invoices/.test(html()));
  });
  await T('F4 sponsored NVQ', () => {
    learner('D'); go('payments'); ok('Payments: fees covered by the agency', /Your course fees are covered by/.test(main()) && !/who pays/i.test(html()));
    go('admission'); ok('no deposit step', !/Pay deposit/.test(main()));
    const od = odRows(); ok('Oliver Bennett and Isla Morgan gone from Overdue & Access', !od.some(r => /Oliver Bennett|Isla Morgan/.test(r.name)));
    ok('no sponsored NVQ learner in Overdue & Access', !od.some(r => r.sponsor && /Diploma/.test(r.course)), od.filter(r => r.sponsor).map(r => r.name).join());
    ok('self-paying learners at 15 and 30+ days', od.some(r => !r.sponsor && r.days === 15) && od.some(r => !r.sponsor && r.days >= 30), od.map(r => r.name + ':' + r.days).join());
    ACT.switchRole({ dataset: { r: 'agyA' } }); go('g-seats'); ok('agency: no NVQ TBDs', !/who pays|agency NVQ flow/i.test(html()) && ![...document.querySelectorAll('main .tbd')].some(x => /NVQ|Admission pending/.test(x.parentElement.textContent)), [...document.querySelectorAll('main .tbd')].map(x => x.parentElement.textContent.slice(0, 60)).join(' | '));
    ACT.switchRole({ dataset: { r: 'bizA' } }); ACT.newBundle({ dataset: {} }); ok('NVQ courses can be bundled', MODAL && /Level 2 Diploma in Care/.test(MODAL.body)); closeModal();
    ok('no "who pays NVQ fees" anywhere', ![...'ABCDEF'].some(v => { learner(v); go('payments'); return /who pays NVQ/i.test(html()); }));
  });
  await T('F5 Coordinator edits', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; const b = myBatches().find(x => !roBatch(x)); go('c-batches', { id: b.code });
    ok('"Edit staff" on own batch', !!document.querySelector('main [data-act="cooStaff"]'));
    ACT.cooStaff({ dataset: { id: b.code } }); ok('no Coordinator slot', MODAL && !/<select class="select" id="bs-c"/.test(MODAL.body) && /Academic Coordinator slot is set by the Academic Admin/.test(MODAL.body));
    const opts = $$('#bs-a option').map(o => o.value).filter(Boolean), nx = opts.find(o => !b.assessors.includes(o)); $('#bs-a').value = nx; rsn('Assessor on leave'); const tn0 = STORE.tas.notifs.length; prim();
    ok('assessor changed, staff notified, audited as the Coordinator', b.assessors[0] === nx && STORE.tas.notifs.length > tn0 && ADMIN.audit[0].action === 'Staff allocation changed' && ADMIN.audit[0].actor === CME().name, ADMIN.audit[0].actor);
    const e = batchEvents(b).find(x => x.type === 'deadline') || batchEvents(b)[0];
    go('c-timeline'); ACT.cooEditEv({ dataset: { b: b.code, id: e.id } }); $('#ee-n').value = D(20, '17:00').slice(0, 16); $('#ee-r').value = 'Bank holiday'; prim();
    acaEnter('KA'); S.signedIn = true; const cn0 = STORE.coo.notifs.length; ACT.kEditEv({ dataset: { b: b.code, id: e.id } }); ok('Academic Admin sees version history', MODAL && /Version history/.test(MODAL.body)); $('#ke-n').value = D(22, '17:00').slice(0, 16); $('#ke-r').value = 'Aligned with the other cohort'; prim(); if (MODAL) prim();
    ok('last save wins', findEv(b.code, e.id).e.start.slice(0, 10) === D(22, '17:00').slice(0, 10));
    ok('Coordinator notified "changed after your edit"', STORE.coo.notifs.slice(0, STORE.coo.notifs.length - cn0 + 1).some(n => /after your edit — see history/.test(n.b)));
    ok('both versions in history', STORE.fuHist[b.code + ':' + e.id].length >= 2 && new Set(STORE.fuHist[b.code + ':' + e.id].map(x => x.role)).size === 2);
    SA(); go('a-notifsettings'); ok('event in the catalogue', /Changed after your edit/.test(main()));
  });
  await T('F10 Super Admin routing', () => {
    SA(); const f0 = STORE.fin.notifs.length; go('a-finance', { tab: 'refunds' }); ACT.raiseRefund(); rsn('Goodwill'); prim();
    ok('refund → all Finance Admins, F10 wording', STORE.fin.notifs.length > f0 && /^Super Administrator .+ processed refund AQ-/.test(STORE.fin.notifs[0].t) && /reason: Goodwill/.test(STORE.fin.notifs[0].b), STORE.fin.notifs[0].t);
    const s0 = STORE.sys.notifs.length, t0 = STORE.tas.notifs.length, c0 = STORE.coo.notifs.length; go('a-learner', { id: 'IA-L-18022' }); ACT.raiseDC({ dataset: { id: 'IA-L-18022' } }); const pv = $('#dc-p'); if (pv) pv.value = 'Corrected'; const rr = $('#dc-r') || $('#rsn'); if (rr) rr.value = 'Typo'; prim();
    ok('data correction → System Admins + Assessor + Coordinator', STORE.sys.notifs.length > s0 && STORE.tas.notifs.length > t0 && STORE.coo.notifs.length > c0, [STORE.sys.notifs.length - s0, STORE.tas.notifs.length - t0, STORE.coo.notifs.length - c0].join('/'));
    const learnerTexts = Object.values(STORE.worlds).flatMap(w => w.notifs.map(n => n.title + ' ' + n.body)); ok('learners never see "Super Admin"', !learnerTexts.some(x => /Super Admin/i.test(x)), learnerTexts.filter(x => /Super Admin/i.test(x)).slice(0, 2).join(' | '));
    ok('audit tag kept', ADMIN.audit.some(a => a.action === SA_TAG));
  });
  await T('F11 attachments', () => {
    SA(); go('a-notifsettings'); ACT.tplEdit({ dataset: { e: 'Observation proposed' } }); ok('template Attachments with 3 defaults', MODAL && /Attachments/.test(MODAL.body) && WP_DEFAULT_ATT.every(f => MODAL.body.includes(f)));
    ACT.tplAttSample({ dataset: { e: 'Observation proposed' } }); ok('upload adds', tplAtt('Observation proposed').length === 4); ACT.tplAttRm({ dataset: { e: 'Observation proposed', k: '3' } }); ok('remove', tplAtt('Observation proposed').length === 3); closeModal();
    const em = STORE.wpc.emails.find(e => e.kind === 'obsProposed') || STORE.wpc.emails.find(e => e.kind === 'permRequest'); go('w-inbox', { id: em.id }); ok('workplace email shows attachments', /Workplace visit information\.pdf/.test(main()));
    const l = STORE.wpc.links.find(x => x.kind === 'perm' && wState(x) === 'valid'); go('w-permission', { id: l.token }); const t = main();
    ok('"Documents from Illumin Academy"; placeholder gone', /Documents from Illumin Academy/.test(t) && /Workplace FAQ\.pdf/.test(t) && !/Visit description/.test(t));
    ok('duration / contact / FAQ TBDs gone', [...document.querySelectorAll('.tbd')].every(x => /^(Client to supply|Pending client):/.test(x.textContent) || x.textContent === 'Demo only'));
    ACT.switchRole({ dataset: { r: 'bizA' } }); ACT.newAgency(); const st = MODAL; ok('wizard opens', !!st);
    $('#oa-n').value = 'Riverside Care'; $('#oa-r').value = '09876543'; $('#oa-cur').value = 'GBP'; prim(); $('#oa-pe').value = 'ops@riverside-care.co.uk'; $('#oa-pc').value = 'Ana Reyes (Ops)'; prim(); ok('Login step: Attach data-sharing terms', /Attach data-sharing terms/.test(MODAL.body)); ACT.oaTermsSample(); $('#oa-li').value = 'ops@riverside-care.co.uk'; prim(); prim(); prim(); prim(); prim();
    const ag = ADMIN.agencies.find(a => a.name === 'Riverside Care'); ok('agency created with terms', ag && ag.terms && ag.terms.length === 1, ag && JSON.stringify(ag.terms));
    const m = STORE.agy.lmails.find(x => x.kind === 'agency' && x.agency === 'Riverside Care'); go('m-inbox', { id: m.id }); ok('set-password email shows the attachment', /data-sharing terms\.pdf/.test(main()));
    agyEnter('AG-02', true); go('g-profile'); ok('Agency Profile → Data protection lists it, no TBD', /Illumin Academy data-sharing terms\.pdf/.test(main()) && ![...document.querySelectorAll('main section')].find(s => /Data protection/.test(s.textContent)).querySelector('.tbd'));
  });
  await T('F6 / F7 / F9 confirmed', () => {
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-obsrec', { id: 'TO-1' }); ok('F6 no photo tick-box or photo wording', !/photo privacy|consent to photograph|I confirm .*photo/i.test(html()));
    learner('B'); go('admission'); ok('F9 no non-refundable wording for the learner', !/not refunded|non-refundable|deposit retained/i.test(html()));
  });
  await T('Overdue days in the learner\'s local calendar', () => {
    const n = now(), late = iso => ({ uk: calDaysLate(iso, 'Europe/London'), uae: calDaysLate(iso, 'Asia/Dubai') });
    // a due moment late in the UTC day falls on the next calendar day in Dubai, so the UAE count is one lower
    const due = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() - 15, 21, 30)).toISOString(), c = late(due);
    ok('same due moment: UK and UAE counts follow each local calendar', c.uk === 15 && c.uae === 14, JSON.stringify(c));
    ok('learner time zone from country / region', tzOfLearner({ country: 'United Arab Emirates' }) === 'Asia/Dubai' && tzOfLearner({ region: 'UAE' }) === 'Asia/Dubai' && tzOfLearner({ country: 'India' }) === 'Asia/Kolkata' && tzOfLearner({}) === 'Europe/London');
    const od = odRows(); ok('Ruby Clarke 15 days (reminder), Jack Thompson 30 (paused)', od.find(r => r.name === 'Ruby Clarke').days === 15 && od.find(r => r.name === 'Jack Thompson').days === 30 && od.find(r => r.name === 'Jack Thompson').access === 'Paused', od.map(r => r.name + ':' + r.days + ':' + r.access).join());
    const z = STORE.fin.od.find(o => o.status === 'arrangement'); const saved = z.arrangeDue; z.arrangeDue = new Date(n.getTime() - 3600e3).toISOString(); finAuto(); ok('arrangement due earlier today: not re-paused yet', z.status === 'arrangement');
    z.arrangeDue = new Date(n.getTime() - 26 * 3600e3).toISOString(); finAuto(); ok('arrangement due yesterday (local): re-paused', z.status === 'overdue' && z.history.some(h => /re-paused/.test(h[0]))); z.status = 'arrangement'; z.arrangeDue = saved;
  });
  await T('A3 agency NVQ seat assignment', () => {
    agyEnter('AG-02', true); const b = agyBundles().find(x => x.courses.some(c => /Diploma/.test(c)) && bStatus(x) !== 'Expired' && left(x) > 0); ok('NVQ bundle with seats', !!b, b && b.id); if (!b) return;
    const c = b.courses.find(x => /Diploma/.test(x)), l = agyRoster().find(x => x.acct !== 'Deactivated' && !agyAssign().some(a => a.lid === x.id && a.course === c) && !agyOtherSponsor(x, c));
    S.agy.as = { step: 4, b: b.id, c, sel: [l.id] }; go('g-seats'); ok('review step: seat covers the NVQ fees, no deposit', /no deposit is taken/.test(main())); ACT.agAsConfirm(); prim();
    const a = agyAssign().find(x => x.lid === l.id && x.course === c); ok('NVQ seat assigned — Admission pending', a && a.status === 'Admission pending', a && a.status);
  });
  await T('Step 3 records', () => {
    S.route = ''; S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); go('cd-log'); const t = document.getElementById('app').textContent;
    const fu = [...document.getElementById('app').querySelectorAll('section')].find(s => /Follow-up decisions \(P-05 – P-26\)/.test(s.textContent)); ok('Client Decisions Log: F1–F12 rows', !!fu && fu.querySelectorAll('tbody tr').length === 13);
    const st = id => ([...fu.querySelectorAll('tbody tr')].find(tr => tr.firstChild.textContent === id) || {}).textContent || '';
    ok('F2, F3b, F8 Pending client; the rest Applied', ['F2', 'F3b', 'F8'].every(x => /Pending client/.test(st(x))) && ['F1', 'F3a', 'F4', 'F5', 'F6', 'F7', 'F9', 'F10', 'F11', 'F12'].every(x => /Applied/.test(st(x))));
    ok('Approval Routes document: Returned by client', /Approval Routes document\W{0,3}Returned by client/.test(t));
    ok('#16, #17 listed; #2–#5 still Illustrative', /Learner moves country/.test(t) && /Coordinator vs Academic Admin edit/.test(t) && /All 17 run end to end/.test(t));
    go('ux-changelog'); ok('UX Changelog: one entry per F item', ['F1', 'F2', 'F3', 'F4', 'F5', 'F6, F7, F9', 'F8', 'F10', 'F11', 'F12'].every(x => new RegExp(x.replace(/,/g, ',') + ':').test(main())));
    go('tbd-register'); ok('TBD register: F4 and F11 removals listed', /F4/.test(main()) && /F11/.test(main()));
    SA(); go('a-index'); ok('screen index: template attachments', /workplace templates → Attachments/.test(main()));
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-index'); ok('screen index: Coordinator Edit staff', /Edit staff/.test(main()));
    ACT.scOpen(); go('demo-scenarios'); ok('17 scenarios', document.querySelectorAll('main section[id^="sc-"]').length === 17);
  });
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
