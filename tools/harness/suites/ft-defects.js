// Defect fix batch (9 Oct 2026): one test group per behaviour defect from UX Audit v2.
// Each group is written so it FAILS on the pre-fix code (baseline) and passes after the fix.
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const T = (n, f) => { try { f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (a && a.fn) { const r = a.fn(); if (r !== false) closeModal(); return r; } };
  const rsn = (v = 'Defect test') => { const e = $('#rsn'); if (e) e.value = v; };
  const near = (a, b, ms = 120000) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= ms;
  const tasAs = v => { S.tas.v = v; tasEnter(); S.signedIn = true; S.ui = {}; };

  // ---------- D1 Teacher-only users: no PD actions (G6.1), direct URLs and direct calls blocked ----------
  T('D1 Teacher-only PD', () => {
    const lid = STORE.worlds.C.me.id; tasAs('T');
    go('t-students', { id: lid, tab: 'pd' });
    ok('D1 no Record PD outcome / Postpone / Propose on the learner PD tab', !document.querySelector('main [data-act="pdOutcome"], main [data-act="pdPostpone"], main [data-act="pdPropose"]'));
    ok('D1 PD tab hidden for Teacher-only users', ![...document.querySelectorAll('main .subtabs [data-tab]')].some(b => b.dataset.tab === 'pd'));
    ok('D1 direct URL to the PD tab is blocked', /Not part of your role/.test(main()));
    go('t-pd'); ok('D1 t-pd blocked', /Not part of your role/.test(main()));
    const before = JSON.stringify(STORE.worlds.C.pd);
    ['pdOutcome', 'pdPostpone', 'pdPropose'].forEach(a => { let threw = false; closeModal(); try { ACT[a]({ dataset: { l: lid } }); } catch (e) { threw = true; } ok(`D1 direct ${a} call blocked (no dialog, no change)`, !threw && !MODAL && JSON.stringify(STORE.worlds.C.pd) === before); closeModal(); });
    tasAs('A'); go('t-students', { id: lid, tab: 'pd' });
    ok('D1 Assessor keeps PD actions', !!document.querySelector('main [data-act="pdPropose"]') && !!document.querySelector('main [data-act="pdOutcome"]'));
  });

  // ---------- D2 Coordinator demo button: feedback reaches the learner only through the Release queue ----------
  T('D2 Coordinator simulate → Release queue', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true;
    const w = STORE.worlds.C, a = w.assignments.find(x => x.id === 'a4'), n0 = w.notifs.length, key = relKeyOfWorld('C', 'a4');
    ACT.simMark();
    ok('D2 learner still sees Submitted', a.status === 'Submitted', a.status);
    ok('D2 no learner notification', w.notifs.length === n0);
    ok('D2 item waiting in the Release queue', !!relStore()[key]);
    go('c-release'); ok('D2 listed on the Release queue page', /Assignment 4/.test(main()));
    releaseNow(key); ok('D2 after release the learner gets the feedback', a.status === 'Feedback Received' && w.notifs.length === n0 + 1, a.status);
  });

  // ---------- D3 Currency: existing enrolments keep their currency; re-purchase is a new purchase in the current currency ----------
  T('D3 Currency', () => {
    S.variant = 'H'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    const e = W.enrolments.find(x => x.id === 'pn1');
    go('course', { id: 'pn1' });
    const pp = [...document.querySelectorAll('main dt')].find(d => d.textContent === 'Price paid');
    ok('D3 AED course shows "Price paid" in AED', pp && /AED/.test(pp.nextElementSibling.textContent), pp && pp.nextElementSibling.textContent);
    go('payments');
    const card = [...document.querySelectorAll('main section.card')].find(s => (s.querySelector('h2') || {}).textContent === e.title);
    ok('D3 AED instalment shown in AED', card && /AED\s?[\d,]+\.\d\d/.test(card.querySelector('tbody').textContent) && !/£/.test(card.querySelector('tbody').textContent), card && card.querySelector('tbody').textContent.slice(0, 80));
    const rc = card && card.querySelector('[data-f^="Receipt RCP-40991"]');
    ok('D3 AED receipt states its amount in AED', rc && /AED/.test(rc.dataset.f) && !/£/.test(rc.dataset.f), rc && rc.dataset.f);
    const tx = [...document.querySelectorAll('main tbody tr')].find(tr => /TXN-40991/.test(tr.textContent));
    ok('D3 AED transaction shown in AED', tx && /AED/.test(tx.textContent) && !/£/.test(tx.textContent), tx && tx.textContent);
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; const P = allLearners().find(l => l.v === 'H');
    if (P) { go('a-learner', { id: P.id, tab: 'payments' }); const c360 = [...document.querySelectorAll('main section.card')].find(s => (s.querySelector('h3') || {}).textContent === e.title); ok('D3 Learner 360 shows the AED course in AED', c360 && /AED/.test(c360.textContent) && !/£/.test(c360.textContent), c360 && c360.textContent.slice(0, 80)); }
    S.variant = 'H'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
    e.status = 'Expired-Incomplete'; e.end = D(-2); go('course', { id: 'pn1' });
    const rb = document.querySelector('main [data-act="repurchase"]');
    ok('D3 re-purchase priced in the current currency (GBP)', rb && /£/.test(rb.textContent) && !/AED/.test(rb.textContent), rb && rb.textContent);
    ACT.repurchase({ dataset: { id: 'pn1' } });
    ok('D3 re-purchase checkout charges GBP', MODAL && /£/.test(MODAL.body), MODAL && MODAL.body.slice(0, 120));
    closeModal();
  });

  // ---------- D4 Observation sign-off: untouched criteria stay "Not Yet"; D5 evidence attachments saved and shown ----------
  T('D4/D5 Observation sign-off and evidence', () => {
    tasAs('A'); const id = 'C-o2', src = STORE.worlds.C.observations.find(o => o.id === 'o2');
    go('t-obsrec', { id });
    parseScope(src.scope).forEach(c => { ACT.orT({ dataset: { s: 'nvq', c, k: 'o', v: '1' } }); ACT.orT({ dataset: { s: 'nvq', c, k: 'c', v: '1' } }); });
    INP.orAtt({ files: [{ name: 'evidence-photo-1.jpg', size: 1200 }] });
    ok('D5 attachment kept in the draft after re-render', /evidence-photo-1\.jpg/.test(main()));
    ACT.orT({ dataset: { s: 'nvq', c: parseScope(src.scope)[0], k: 'o', v: '1' } });
    ok('D5 attachment survives another toggle', /evidence-photo-1\.jpg/.test(main()));
    ok('D5 no privacy tick-box on the record', !document.querySelector('main #or-att-ok') && !/I confirm this attachment contains no identifying information/.test(main()));
    closeModal(); ACT.orSign({ dataset: { id } });
    ok('D5 sign-off works with evidence attached and no tick', !!MODAL && /Sign off observation/.test(MODAL.title)); prim();
    const r = src.report;
    ok('D4 signed off', src.status === 'Completed' && !!r);
    ok('D4 untouched Academy criteria stay Not Yet Observed / Not Yet Competent', r && r.ia.length > 0 && r.ia.every(x => x[2] === 0 && x[3] === 0), r && JSON.stringify(r.ia.map(x => [x[2], x[3]])));
    ok('D4 NVQ criteria as set by the assessor', r && r.nvq.every(x => x[2] === 1 && x[3] === 1));
    ok('D5 evidence stored on the report', r && (r.evidence || []).includes('evidence-photo-1.jpg'));
    go('t-obsrec', { id }); ok('D5 evidence shown on the assessor report', /evidence-photo-1\.jpg/.test(main()));
    S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('observations');
    ACT.obsReport({ dataset: { id: 'o2' } }); ok('D5 evidence shown on the learner report', MODAL && /evidence-photo-1\.jpg/.test(MODAL.body)); closeModal();
  });

  // ---------- D6 Academy-office observations: NVQ criteria only, office-address placeholder ----------
  T('D6 Academy office observation', () => {
    const w = STORE.worlds.C; w.observations.unshift({ id: 'o99', at: D(0, '10:00'), loc: 'Academy office', locType: 'office', assessor: 'James Pryce', scope: 'U302 2.1', status: 'Confirmed' });
    tasAs('A'); go('t-obsrec', { id: 'C-o99' });
    ok('D6 no Academy criteria on an office record', !/Illumin Academy criteria/.test(main()) && !document.querySelector('main [data-s="ia"]'));
    ok('D6 office-address placeholder in the record header', /Client to supply: Academy office address/.test(main()));
    ACT.orT({ dataset: { s: 'nvq', c: '302 2.1', k: 'o', v: '1' } }); ACT.orT({ dataset: { s: 'nvq', c: '302 2.1', k: 'c', v: '0' } });
    ACT.orSign({ dataset: { id: 'C-o99' } }); prim();
    const o = w.observations.find(x => x.id === 'o99');
    ok('D6 office report records NVQ criteria only', o.report && o.report.ia.length === 0 && o.report.nvq.length === 1, o.report && o.report.ia.length);
  });

  // ---------- D7 Coordinator timeline edit sticks in every batch ----------
  T('D7 Coordinator deadline edit', () => {
    S.coo.v = 'A'; cooEnter(); S.signedIn = true;
    const b = myBatches().find(x => x.code !== 'L3AC-JAN26' && !roBatch(x)); if (!b) { ok('D7 has a second editable batch', false); return; }
    const ev = batchEvents(b).find(e => e.type === 'deadline') || batchEvents(b)[0];
    const nv = D(40, '21:59').slice(0, 16), iso = new Date(nv + ':00Z').toISOString();
    ACT.cooEditEv({ dataset: { b: b.code, id: ev.id } }); $('#ee-n').value = nv; $('#ee-r').value = 'Defect test'; prim();
    const after = batchEvents(b).find(e => e.id === ev.id);
    ok('D7 the new date sticks for ' + b.code, after && after.start === iso, after && after.start);
    go('c-timeline'); ok('D7 timeline shows the new date', main().includes(fds(iso) + ' ' + ft(iso)), fds(iso) + ' ' + ft(iso));
    // One store for both roles: the Academic Admin's later save wins, and the Coordinator's timeline reads it
    const nv2 = D(44, '21:59').slice(0, 16), iso2 = new Date(nv2 + ':00Z').toISOString();
    acaEnter('KA'); S.signedIn = true; ACT.kEditEv({ dataset: { b: b.code, id: ev.id } }); $('#ke-n').value = nv2; $('#ke-r').value = 'Defect test'; prim(); if (MODAL) prim();
    ok('D7 Academic Admin save wins over the Coordinator edit (same store)', batchEvents(b).find(e => e.id === ev.id).start === iso2, batchEvents(b).find(e => e.id === ev.id).start);
    ok('D7 both edits in the one version history', (STORE.fuHist[b.code + ':' + ev.id] || []).length >= 2 && new Set(STORE.fuHist[b.code + ':' + ev.id].map(x => x.role)).size === 2);
    S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-timeline'); ok('D7 Coordinator timeline shows the Academic Admin date', main().includes(fds(iso2) + ' ' + ft(iso2)));
  });

  // ---------- D8 Extensions never shorten access ----------
  T('D8 Extension end date', () => {
    acaEnter('KA'); S.signedIn = true;
    const i = allQueue().find(x => /More time/.test(x.type) && isOpen(x) && x.req && x.v); if (!i) { ok('D8 has a More time item', false); return; }
    const en = STORE.worlds[i.v].enrolments.find(e => e.title === i.req.target);
    en.status = 'Active'; en.end = D(30, '22:59');
    ACT.qDo({ dataset: { id: i.id, a: 'extend' } });
    ok('D8 preview counts from the current end date', MODAL && $('#xprev') && $('#xprev').textContent.includes(fd(new Date(new Date(D(30, '22:59')).getTime() + 14 * DAY).toISOString())), $('#xprev') && $('#xprev').textContent);
    closeModal();
    applyDecision(i, 'extend', 'Defect test', { days: 14 });
    ok('D8 active course: new end = current end + 14 days', near(en.end, new Date(new Date(D(30, '22:59')).getTime() + 14 * DAY)), en.end);
    const j = allQueue().find(x => /More time/.test(x.type) && isOpen(x) && x.req && x.v && x !== i);
    if (j) { const e2 = STORE.worlds[j.v].enrolments.find(e => e.title === j.req.target); e2.status = 'Expired-Incomplete'; e2.end = D(-5); applyDecision(j, 'extend', 'Defect test', { days: 14 }); ok('D8 expired course: new end = today + 14 days', near(e2.end, new Date(now().getTime() + 14 * DAY)), e2.end); }
  });

  // ---------- D9 Overdue: "Restore access" only for paused access; truthful audit ----------
  T('D9 Restore vs payment arrangement', () => {
    setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
    const act = odRows().find(o => o.status === 'overdue' && o.access === 'Active'), pz = odRows().find(o => o.status === 'overdue' && o.access === 'Paused');
    go('f-overdue', { tab: 't2' }); go('f-overdue', { tab: act && act.days < 15 ? 't1' : 't2' });
    const ba = act && document.querySelector(`main [data-act="odRestore"][data-id="${act.id}"]`);
    ok('D9 Active overdue row: "Set payment arrangement", not "Restore access"', ba && ba.textContent === 'Set payment arrangement', ba && ba.textContent);
    go('f-overdue', { tab: 'paused' }); const bp = pz && document.querySelector(`main [data-act="odRestore"][data-id="${pz.id}"]`);
    ok('D9 Paused row keeps "Restore access"', bp && bp.textContent === 'Restore access', bp && bp.textContent);
    ACT.odRestore({ dataset: { id: act.id } }); ok('D9 dialog does not claim access is restored', MODAL && !/Access is restored now/.test(MODAL.body)); rsn(); prim();
    ok('D9 audit records the real before-state (Active)', ADMIN.audit[0].before === 'Active' && ADMIN.audit[0].action === 'Payment arrangement set', ADMIN.audit[0].before + ' / ' + ADMIN.audit[0].action);
  });

  // ---------- D10 Data requests: find any learner; audit, deadline, notification ----------
  T('D10 Log data request', () => {
    setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
    go('a-dataprotection', { tab: 'dsr' });
    const all = allLearners(), L = all[all.length - 1], n0 = ADMIN.dsr.length, s0 = STORE.sys.notifs.length;
    ok('D10 the learner is beyond the old 12-item list', all.indexOf(L) >= 12);
    ACT.logDsr(); const q = $('#ds-q'); ok('D10 search field present', !!q);
    q.value = L.id; INP.dsrFind(q); const rd = $(`#modal-root input[name="ds-pick"][value="${L.id}"]`); ok('D10 search finds the learner', !!rd);
    if (rd) rd.checked = true; $('#ds-n').value = 'Defect test'; prim();
    const d = ADMIN.dsr[0];
    ok('D10 request logged for that learner', ADMIN.dsr.length === n0 + 1 && d.lid === L.id && d.who === L.name);
    ok('D10 audit entry written', ADMIN.audit[0].action === 'Data request logged' && ADMIN.audit[0].entity === d.id);
    ok('D10 one-month deadline set', new Date(dsrDue(d)).getMonth() === (new Date(d.at).getMonth() + 1) % 12);
    ok('D10 System Admin notified', STORE.sys.notifs.length === s0 + 1 && STORE.sys.notifs[0].t === 'Data request logged');
    go('a-dataprotection', { tab: 'dsr' }); ok('D10 listed with its deadline', main().includes(d.id) && main().includes(fd(dsrDue(d))));
  });

  // ---------- D11 Business Admin opens their own pending discount rate change, read-only ----------
  T('D11 Business Admin own discount request', () => {
    bizEnter('BA'); S.signedIn = true; S.ui = {};
    go('a-bundles', { tab: 'rates' }); const std = $('#dr-std'); if (!std) { ok('D11 rates form', false); return; }
    std.value = String(+std.value + 1); $('#dr-r').value = 'Defect test'; SUBMIT.discSave();
    const it = ADMIN.queue.find(x => x.type === 'Discount rate change' && x.raisedBy === ADMIN.me.name && isOpen(x));
    ok('D11 request raised', !!it);
    go('a-bundles', { tab: 'rates' }); const link = it && document.querySelector(`main a[data-id="${it.id}"]`); ok('D11 link to the request on Discount rates', !!link);
    go('a-queue', { id: it.id });
    ok('D11 opens the request (not "Not found")', !/can't find that page/i.test(main()) && main().includes(it.id));
    ok('D11 read-only: no decision buttons', !document.querySelector('main [data-act="qDo"]') && /read-only/i.test(main()));
    let threw = false; try { ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); } catch (e) { threw = true; } ok('D11 direct decision call blocked', !threw && !MODAL && isOpen(it)); closeModal();
  });

  // ---------- D12 Super Admin (variant B, Super Admin only) can reveal credentials ----------
  T('D12 Super Admin reveal credentials', () => {
    setAdminIdentity('B'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-integrations');
    const s0 = ADMIN.security.length; ACT.intReveal({ dataset: { id: ADMIN.integrations[0].id } });
    ok('D12 reveal dialog opens for the Super Administrator', !!MODAL && /Reveal credentials/.test(MODAL.title));
    ok('D12 no false security event', ADMIN.security.length === s0); closeModal();
    setAdminIdentity('FA'); S.portal = 'admin'; const s1 = ADMIN.security.length; ACT.intReveal({ dataset: { id: ADMIN.integrations[0].id } });
    ok('D12 other roles still refused and logged', !MODAL && ADMIN.security.length === s1 + 1); closeModal();
  });

  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
