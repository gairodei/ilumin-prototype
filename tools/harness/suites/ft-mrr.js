// MR-R — record linkage and workflow consistency (2 Nov 2026; PD-MRR-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Client demo first (Data Correction end to end across roles, Learner 360 tabs, drafts of two Coordinators, notification recipients,
// release after an Assessor change, IQA outcome, sign-in of deactivated accounts, timeline edits, the simulated date), then the legacy
// data (seeded AQ-1004, persona notification lists, legacy sign-in, IQA demo control). Test-only records (a certificate for Lena, an
// outsider Coordinator) are made on data the next fixture load discards.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); const r = a && a.fn ? a.fn() : 'NOACTION'; if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'MR-R test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const lastToast = () => ((($1('#toasts') || $1('#toast-root') || {}).textContent) || '').replace(/\s+/g, ' ');
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); const f = $1('form[data-submit="tfaCode"]'); if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const emailIn = em => { signOutUI(); S.auth = 'signin'; S.authMsg = null; render(); $1('#si-email').value = em; $1('#si-pw').value = 'Demo!Pass2026'; $1('form[data-submit="signin"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); if ($1('.otp-i')) code2fa(); };
  const submitAsg = (p, aid) => { pick(p); const a = W.assignments.find(x => x.id === aid); go('assignment', { id: aid }); a.qs.forEach(q => { W.drafts[a.id + '.' + q.id + '.0'] = '<p>MR-R answer ' + q.id + '</p>'; }); fxFast(ff => { ACT.reviewSubmit({ dataset: { id: aid } }); prim(); ff(16500); }); closeModal(); return a; };
  const markSend = k => { pick('assessor'); const s = tasSubs(true).find(x => x.key === k); const d = dft(k); markable(tasAsg(s)).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'MR-R fine.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k } }); prim(); closeModal(); };
  const COO = v => { closeModal(); S.coo.v = v; cooEnter(); S.signedIn = true; S.ui = {}; };
  const TCH = v => { closeModal(); S.tas.v = v; tasEnter(); S.signedIn = true; S.ui = {}; };
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => AS('A');

  /* ================= Client demo ================= */
  const b = cdBatch(), code = b.code, wA = STORE.worlds.CD1, wD = STORE.worlds.CD2, wL = STORE.worlds.CD3, AM = wA.me.id, DV = wD.me.id, LH = wL.me.id;
  const row = lid => ADMIN.learners.find(l => l.id === lid);

  await T('MRR-00 client demo learner rows resolve to their records (MR-02 root)', async () => {
    const bad = ['CD1', 'CD2', 'CD3', 'CD4', 'CD5'].filter(k => { const w = STORE.worlds[k], L = learnerById(w.me.id); return !L || L.v || lrnKey(L) !== k || lrnW(L) !== w; });
    ok('MRR-00 every client learner row (no world key) resolves to its own learner record by learner ID', !bad.length, J(bad));
  });

  let dcId;
  await T('MRR-02 Data Correction end to end (client demo)', async () => {
    const old = chFullName(wA), nn = 'Amira Corrected Shah';
    pick('aca'); ACT.raiseDC({ dataset: { id: AM } }); $1('#dc-f').value = 'Full name'; $1('#dc-p').value = nn; $1('#dc-r').value = 'Passport shows the full name'; press();
    const i = ADMIN.queue[0]; dcId = i.id; ok('MRR-02 the correction is raised against Amira\'s own record (was v: undefined)', i.type === 'Data correction' && i.data.v === 'CD1' && i.data.lid === AM, J(i.data));
    // denied: the Academic Admin (raiser) and the Super Administrator before the review — zero mutation
    const snap = () => J([chFullName(wA), row(AM).name, i.status, i.stage || '']), s0 = snap(), a0 = sec();
    const r1 = applyDecision(i, 'approveFinal', 'raiser', {}); pick('super'); const r2 = applyDecision(i, 'approveFinal', 'before review', {});
    ok('MRR-02 refused before the System Administrator\'s review (raiser, Super Admin): nothing changes, logged', r1 === false && r2 === false && snap() === s0 && sec() > a0, J([r1, r2, snap()]));
    const saN = () => (ADMIN._saNotifs || ADMIN.myNotifs || []).filter(n => (n.b || '').includes(dcId)).length;
    pick('sys'); ACT.qDo({ dataset: { id: dcId, a: 'forward' } }); reason('Evidence checked');
    ok('MRR-35 forwarded: the item awaits the Super Administrator', i.stage === 'final' && isOpen(i));
    pick('super'); ok('MRR-35 the Super Administrator is notified of the forward (was not)', saN() >= 1, String(saN()));
    go('a-dashboard'); ok('MRR-35 dashboard "Awaiting my final approval" lists the forwarded correction', /Awaiting my final approval/.test(main()) && main().includes(dcId));
    const n0 = wA.notifs.length; ACT.qDo({ dataset: { id: dcId, a: 'approveFinal' } }); reason('Final approval');
    ok('MRR-02 approved: the learner record and the admin row both carry the new name', i.status === 'Approved' && chFullName(wA) === nn && row(AM).name === nn && learnerById(AM).name === nn, J([i.status, chFullName(wA), row(AM).name]));
    ok('MRR-02 the learner is told (no certificate held: a "Name corrected" notice)', wA.notifs.length === n0 + 1 && /corrected to Amira Corrected Shah/.test(wA.notifs[0].body), J(wA.notifs[0]));
    const sees = (p, route, params) => { pick(p); go(route, params || {}); const t = main(); return t.includes(nn) && !t.includes(old); };
    const views = { 'Super Admin learners': sees('super', 'a-learners'), 'Super Admin Learner 360': sees('super', 'a-learner', { id: AM }), 'System Admin Learner 360': sees('sys', 'a-learner', { id: AM }), 'Academic Admin learners': sees('aca', 'a-learners'), 'Finance learner accounts': sees('fin', 'f-learners'), 'Coordinator learners': sees(mcOf(AM, b) === COO_USERS.A.name ? 'coord1' : 'coord2', 'c-learners'), 'Assessor students': sees('assessor', 't-students'), 'Learner profile': sees('nvq-sp', 'profile') };
    ok('MRR-02 every role sees the corrected name (admin, Finance, Coordinator, Assessor, learner)', Object.values(views).every(Boolean), J(views));
  });

  await T('MRR-02c certificate re-issued on the client demo', async () => {
    const c = { id: 'cMRR', no: 'IA-CERT-2026-04123', course: 'Moving and Handling People', issued: D(-2), expires: D(363), status: 'Valid' }; wL.certs.push(c); // test-only
    pick('aca'); ACT.raiseDC({ dataset: { id: LH } }); $1('#dc-f').value = 'Full name'; $1('#dc-p').value = 'Lena Corrected Hart'; $1('#dc-r').value = 'Deed poll'; press();
    const i = ADMIN.queue[0]; ok('MRR-02c the correction records Lena\'s valid certificate', i.data.cert === 'cMRR', J(i.data));
    pick('sys'); ACT.qDo({ dataset: { id: i.id, a: 'forward' } }); reason('ok'); const no0 = c.no, n0 = wL.notifs.length;
    pick('super'); ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); reason('ok');
    ok('MRR-02c approved: the certificate is re-issued (new number, supersedes the old one) and the learner is told', c.no !== no0 && c.supersedes === no0 && (c.lineage || []).length === 2 && wL.notifs.length === n0 + 1 && wL.notifs[0].title === 'Certificate issued', J([no0, c.no, c.supersedes, wL.notifs[0] && wL.notifs[0].title]));
    go('a-learner', { id: LH, tab: 'certificates' }); ok('MRR-14 Learner 360 → Certificates lists Lena\'s certificate with Revoke (was "No certificates.")', main().includes(c.no) && !!$1(`main [data-act="revokeCert"][data-k="CD3:${c.id}"]`), main().slice(0, 200));
  });

  await T('MRR-14 Learner 360 tabs read the learner\'s record (every role that opens it)', async () => {
    const tabs = { academic: 'No academic records yet', observations: 'No workplace or observation records', attendance: 'No attendance records', certificates: 'No certificates', requests: 'No requests', messages: 'No threads' };
    const has = { academic: w => (w.assignments || []).length || (w.flags && w.flags.nvq), observations: w => (w.observations || []).length, attendance: w => (w.attendance || []).length, certificates: w => (w.certs || []).length, requests: w => (w.requests || []).length, messages: w => (w.threads || []).length };
    const bad = [];
    // Finance has no Learner 360 (its own learner pages); a permission page would pass this check vacuously, so it isn't listed
    for (const p of ['super', 'aca', 'sys']) {
      pick(p);
      for (const k of ['CD1', 'CD2', 'CD3', 'CD4', 'CD5']) { const w = STORE.worlds[k]; Object.keys(tabs).forEach(t => { if (!has[t](w)) return; go('a-learner', { id: w.me.id, tab: t }); if (!$1('main [role="tab"]') || main().includes(tabs[t])) bad.push(p + ':' + k + ':' + t); }); }
    }
    ok('MRR-14 no tab shows "none" for a client learner whose record has entries (Super Admin, Academic Admin, System Admin)', !bad.length, J(bad));
    pick('super'); go('a-learner', { id: AM, tab: 'overview' }); ok('MRR-14 overview: Amira\'s current batch comes from her record', main().includes(code));
    go('a-learner', { id: AM, tab: 'payments' }); ok('MRR-14 payments tab unchanged (FI-2 path): programme fee shown', /Programme fee/.test(main()));
  });

  await T('MRR-36 / MRR-22 Data Correction fields', async () => {
    pick('aca'); ACT.raiseDC({ dataset: { id: AM } }); const opts = [...$1('#dc-f').options].map(o => o.value);
    ok('MRR-22 "Assessment record" is no longer offered from Learner 360 (it had no effect); name, date of birth and referral stay', !opts.includes('Assessment record') && ['Full name', 'Date of birth', 'Referral attribution'].every(x => opts.includes(x)), J(opts));
    const q0 = ADMIN.queue.length; $1('#dc-f').value = 'Date of birth'; $1('#dc-p').value = 'not a date'; $1('#dc-r').value = 'x'; const r1 = prim();
    $1('#dc-p').value = wA.me.dob; const r2 = prim(); $1('#dc-p').value = '2099-01-01'; const r3 = prim();
    ok('MRR-36 a date of birth that isn\'t a date, is the current one, or is in the future is refused; nothing is raised', r1 === false && r2 === false && r3 === false && ADMIN.queue.length === q0, J([r1, r2, r3, ADMIN.queue.length - q0]));
    $1('#dc-p').value = '15 Mar 1992'; prim(); closeModal(); ok('MRR-36 a real, different date is raised', ADMIN.queue.length === q0 + 1 && ADMIN.queue[0].data.proposed === '15 Mar 1992');
    pick('super'); const ref0 = wA.me.referral; ACT.raiseDC({ dataset: { id: AM } }); $1('#dc-f').value = 'Referral attribution'; $1('#dc-p').value = 'Agency — MR-R Probe Agency'; $1('#dc-r').value = 'agency confirmed'; press();
    ok('MRR-22 the Super Administrator\'s immediate referral correction changes the record and the admin row (was unchanged)', wA.me.referral === 'Agency — MR-R Probe Agency' && row(AM).referral === 'Agency — MR-R Probe Agency' && learnerById(AM).referral === 'Agency — MR-R Probe Agency', J([ref0, wA.me.referral, row(AM).referral]));
  });

  await T('MRR-23 single System Administrator (SC)', async () => {
    signOutUI(); ACT.demoSignInAsSys({ dataset: { v: 'SC' } }); code2fa();
    ACT.raiseDC({ dataset: { id: DV } }); $1('#dc-f').value = 'Full name'; $1('#dc-p').value = 'Dev Solo Patel'; $1('#dc-r').value = 'solo'; press(); const i = ADMIN.queue[0];
    pick('super'); go('a-queue', { id: i.id }); const btn = !!$1('main [data-act="qDo"][data-a="approveFinal"]');
    ACT.qDo({ dataset: { id: i.id, a: 'approveFinal' } }); reason('final — no other System Administrator');
    ok('MRR-23 with no other active System Administrator the Super Administrator approves it (it was stuck)', btn && i.status === 'Approved' && chFullName(wD) === 'Dev Solo Patel', J([btn, i.status]));
    STORE.sys.solo = false; const rt = ADMIN.staff.find(s => s.id === 'ST-022'); if (rt) rt.status = 'Active';
    signOutUI(); ACT.demoSignInAsSys({ dataset: { v: 'SY' } }); code2fa(); ACT.raiseDC({ dataset: { id: DV } }); $1('#dc-f').value = 'Full name'; $1('#dc-p').value = 'Dev Two Patel'; $1('#dc-r').value = 'two'; press(); const j = ADMIN.queue[0];
    pick('super'); const s0 = J([chFullName(wD), j.status]); const r = applyDecision(j, 'approveFinal', 'skip', {});
    ok('MRR-23 with another System Administrator available the first review is still required (zero mutation)', r === false && J([chFullName(wD), j.status]) === s0);
  });

  await T('MRR-26 dashboard admissions snapshot', async () => {
    pick('super'); go('a-dashboard'); const n = allApplications().filter(a => a.status === 'Awaiting review').length;
    ok('MRR-26 the Admissions snapshot counts "Awaiting review" applications', main().includes('Awaiting review: ' + n), String(n));
  });

  const kA11 = AM + '~a11', kD11 = DV + '~a11';
  await T('MRR-18 two Coordinators\' drafts', async () => {
    submitAsg('nvq-sp', 'a11');
    COO('A'); go('c-sub', { id: kA11 }); const s = mySubmissions(true).find(x => x.key === kA11), q = synthAsg(s).qs[0];
    $1('#r3-cv-' + q.id).value = 'Not Met'; $1('#r3-ct-' + q.id).value = 'HELEN PRIVATE DRAFT'; ACT.r3CooDraft({ dataset: { k: kA11, q: q.id } });
    cooDraft(kA11, { scope: 'Overall submission' }).text = 'HELEN PRIVATE COMMENT';
    COO('B'); go('c-sub', { id: kA11 }); const t = ($1('#r3-ct-' + q.id) || {}).value || '';
    ok('MRR-18 Coordinator 2 doesn\'t see Coordinator 1\'s criterion draft or written-comment draft', !/HELEN PRIVATE/.test(t) && !/HELEN PRIVATE/.test(main()) && !cooDraft(kA11), t);
    const j0 = r3Judg(kA11).length; ACT.r3CooPubAll({ dataset: { k: kA11 } }); if (MODAL) press();
    ok('MRR-18 Coordinator 2\'s "Publish all" publishes nothing of Coordinator 1\'s (it has no drafts of its own)', r3Judg(kA11).length === j0);
    ACT.cfPost({ dataset: { k: kA11 } }); const m = !!MODAL; closeModal(); ok('MRR-18 Coordinator 2 can\'t post Coordinator 1\'s comment draft', !m);
    COO('A'); ACT.r3CooPubAll({ dataset: { k: kA11 } }); if (MODAL) press(); const pub = r3Judg(kA11).slice(j0);
    ok('MRR-18 Coordinator 1 publishes their own draft under their own name', pub.length === 1 && pub[0].by === COO_USERS.A.name && pub[0].text === 'HELEN PRIVATE DRAFT', J(pub.map(x => [x.by, x.text])));
  });

  await T('MRR-41 Coordinator out-of-scope calls', async () => {
    COO_USERS.ZZ = { key: 'ZZ', name: 'Zed Outsider', first: 'Zed', email: 'zed@illumin-academy.example', roles: ['Academic Coordinator'], label: 'Zed' }; // test-only, no batches
    COO('ZZ'); const a = wA.assignments.find(x => x.id === 'a11'), c0 = J(a.coordAll || []), s0 = sec(); STORE.coo.drafts[kA11] = { text: 'outsider', scope: 'Overall submission' };
    let thr = ''; try { ACT.cfPost({ dataset: { k: kA11 } }); } catch (e) { thr = e.message; } const m = !!MODAL; closeModal();
    ok('MRR-41 cfPost on a submission outside the Coordinator\'s batches: refused (no dialog, no throw), logged, nothing written', !thr && !m && J(a.coordAll || []) === c0 && sec() > s0, thr);
    let t2 = ''; const s1 = sec(); try { ACT.hmCell({ dataset: { l: AM, c: 'x' } }); } catch (e) { t2 = e.message; } const m2 = !!MODAL; closeModal();
    ok('MRR-41 hmCell for a learner outside the Coordinator\'s batches: refused, no throw', !t2 && !m2 && sec() > s1, t2);
    delete STORE.coo.drafts[kA11]; delete COO_USERS.ZZ;
  });

  await T('MRR-27 Coordinator and staff notification recipients', async () => {
    submitAsg('nvq-fa', 'a11'); markSend(kD11);
    const dC = mcOf(DV, b), other = Object.values(COO_USERS).find(u => u.name !== dC && mcList(b).includes(u.name));
    const rel = v => { COO(v); return cooNotifs().some(n => /Release queue/.test(n.t) && (n.b || '').includes(VNAME('CD2'))); };
    const kOf = name => Object.keys(COO_USERS).find(k => COO_USERS[k].name === name);
    ok('MRR-27 the release notice reaches Dev\'s own Coordinator only', rel(kOf(dC)) && (!other || !rel(kOf(other.name))), J({ dC, other: other && other.name }));
    COO_USERS.ZZ = { key: 'ZZ', name: 'Zed Outsider', first: 'Zed', email: 'zed@illumin-academy.example', roles: ['Academic Coordinator'], label: 'Zed' };
    COO('ZZ'); const nz = cooNotifs().map(n => n.t + ': ' + n.b); delete COO_USERS.ZZ;
    ok('MRR-27 a Coordinator with no batches sees no notice naming the batch\'s learners', !nz.some(x => x.includes(VNAME('CD1')) || x.includes(VNAME('CD2'))), J(nz.slice(0, 5)));
    pick('aca'); mcReassign(b, AM, COO_USERS.B.name, 'MR-R reassign'); COO('B');
    ok('MRR-27 Coordinator 2 sees "Learner allocated to you" (the fixed slice(4,8) hid it)', cooNotifs().some(n => /allocated to you/i.test(n.t)));
    pick('aca'); mcReassign(b, AM, COO_USERS.A.name, 'MR-R restore');
    ok('MRR-27 every Coordinator and staff notice names its recipient(s)', STORE.coo.notifs.every(n => n.to) && STORE.tas.notifs.every(n => n.to), J(STORE.tas.notifs.filter(n => !n.to).map(n => n.t).concat(STORE.coo.notifs.filter(n => !n.to).map(n => n.t))));
  });

  await T('MRR-15 release after the Assessor was replaced (P-06: honest result, visible)', async () => {
    const P = relStore()[kD11]; if (!P) return ok('MRR-15 setup: Dev\'s marking awaits release', false);
    const other = Object.values(TAS_USERS).find(u => u.roles.includes('Assessor') && u.name !== P.by && chAssessorNames().includes(u.name) && !mcList(b).includes(u.name));
    pick('aca'); go('a-batches', { id: code, tab: 'staff' }); CH_AROLES.forEach(([k]) => { const x = $1('#ch-as-' + k); if (x) x.value = other.name; }); ACT.chAssessSave({ dataset: { b: code } }); reason('MR-R swap');
    const a = wD.assignments.find(x => x.id === 'a11'), st0 = a.status, n0 = wD.notifs.length;
    COO(Object.keys(COO_USERS).find(k => COO_USERS[k].name === mcOf(DV, b))); go('c-release');
    ok('MRR-15 the release queue shows the item can\'t be released yet and why (P-06)', !!$1('main .mr-strand') && /no longer assesses/.test(main()));
    ACT.relOne({ dataset: { k: kD11 } }); prim(); closeModal(); await sleep(40); const t = lastToast();
    ok('MRR-15 the result is reported honestly — "0 of 1 released", not "Learners have been notified"; nothing changes', !!relStore()[kD11] && a.status === st0 && wD.notifs.length === n0 && /0 of 1 released/.test(t) && !/0 items released\. Learners have been notified/.test(t), t.slice(-160));
    pick('aca'); go('k-dashboard'); ok('MRR-15 the Academic Admin sees the stranded item', /can't be released yet/.test(main()));
    pick('super'); const s0 = J([!!relStore()[kD11], a.status]); ACT.relSuper({ dataset: { k: kD11 } }); const m = !!MODAL; closeModal();
    ok('MRR-15 the Super Administrator\'s override says why instead of claiming a release', !m && J([!!relStore()[kD11], a.status]) === s0);
    pick('aca'); go('a-batches', { id: code, tab: 'staff' }); CH_AROLES.forEach(([k]) => { const x = $1('#ch-as-' + k); if (x) x.value = P.by; }); ACT.chAssessSave({ dataset: { b: code } }); reason('MR-R restore');
    COO(Object.keys(COO_USERS).find(k => COO_USERS[k].name === mcOf(DV, b))); ACT.relOne({ dataset: { k: kD11 } }); prim(); closeModal(); await sleep(40);
    ok('MRR-15 with the sending Assessor back, the Coordinator releases it (authorised path)', !relStore()[kD11] && a.status !== st0 && /1 item released/.test(lastToast()));
  });

  await T('MRR-17 IQA shows the declared outcome', async () => {
    markSend(kA11); COO(Object.keys(COO_USERS).find(k => COO_USERS[k].name === mcOf(AM, b))); ACT.relOne({ dataset: { k: kA11 } }); prim(); closeModal(); await sleep(40);
    pick('iqa'); let rec = allIqaRecords().find(r => r.key === kA11);
    ok('MRR-17 before a declaration the record says "No final outcome" (was "Passed" from the status)', rec && rec.exit === 'No final outcome', rec && rec.exit);
    pick('assessor'); ACT.r3Declare({ dataset: { k: kA11 } }); const x = $1('input[name="r3-res"][value="Fail"]'); if (x) x.checked = true; if ($1('#d-ofb')) $1('#d-ofb').value = 'MR-R overall'; $1('#rsn').value = 'MR-R rationale'; act('Publish to learner');
    pick('iqa'); rec = allIqaRecords().find(r => r.key === kA11); go('q-record', { id: rec.id });
    ok('MRR-17 after a published Fail the record shows Fail and the q-record says so', rec.exit === 'Fail' && /Final assignment outcome: Fail/.test(main()), rec.exit);
    const f0 = ADMIN.iqa.length; ACT.qRecord({ dataset: { id: rec.id } }); const dd = STORE.iqa.drafts[rec.id]; if (dd) { dd.text = 'MR-R finding'; dd.cat = 'Decision not supported by evidence'; } act('Save finding');
    const f = ADMIN.iqa.length > f0 ? ADMIN.iqa[0] : null, sees = v => { S.tas.v = v; return tasNotifs().some(n => /IQA finding/.test(n.t) && f && (n.b || '').includes(f.id)); };
    const res = {}; Object.keys(TAS_USERS).forEach(v => { res[v] = sees(v); });
    ok('MRR-27 the IQA finding notice reaches the marking Assessor only (no other staff persona)', !!f && Object.keys(TAS_USERS).every(v => res[v] === (TAS_USERS[v].name === f.assessor)), J([f && f.assessor, res]));
  });

  await T('MRR-29 / MRR-40 Coordinator timeline', async () => {
    COO('A'); const e = batchEvents(b).find(x => x.type === 'class'), st0 = e.start, after = new Date(new Date(b.end).getTime() + 30 * 864e5).toISOString().slice(0, 16);
    ACT.cooEditEv({ dataset: { b: code, id: e.id } }); $1('#ee-n').value = after; $1('#ee-r').value = 'after the end'; const r = prim(); closeModal();
    ok('MRR-29 a Coordinator can\'t move a session after the batch end date (PD-AC3-08); unchanged', r === false && batchEvents(b).find(x => x.id === e.id).start === st0);
    const ms = batchEvents(b).find(x => x.type === 'mile' || x.type === 'obs'), n0 = [wA, wD].map(w => w.notifs.length);
    ACT.cooEditEv({ dataset: { b: code, id: ms.id } }); $1('#ee-n').value = new Date(new Date(ms.start).getTime() + 2 * 864e5).toISOString().slice(0, 16); $1('#ee-r').value = 'milestone'; $1('#ee-notify').checked = true; prim(); closeModal();
    const n1 = [wA, wD].map(w => w.notifs.length);
    ok('MRR-40 moving a milestone notifies the batch\'s learners as the toast says (was "Learners notified" with no notice)', n1[0] === n0[0] + 1 && n1[1] === n0[1] + 1 && /learners notified/.test(lastToast()), J([n0, n1]));
  });

  await T('MRR-30 replaced batch Teacher: sessions listed, not moved (P-09)', async () => {
    pick('aca'); const t0 = b.teachers[0], to = activeStaff('Teacher').find(n => n !== t0), ss = J(s4bSessFor(code).map(s => [s.id, s.teacher, s.start]));
    ACT.batchStaff({ dataset: { id: code } }); $1('#bs-t').value = to; reason('MR-R teacher change');
    go('a-batches', { id: code }); const orphan = s4bSessFor(code).filter(s => s.teacher === t0 && new Date(s.start) > now());
    ok('MRR-30 the batch page lists the sessions still assigned to the previous Teacher; nothing was moved', J(s4bSessFor(code).map(s => [s.id, s.teacher, s.start])) === ss && (!orphan.length || (!!$1('main .mr-orphan') && orphan.every(s => main().includes(s.title)))), J({ n: orphan.length }));
    ACT.batchStaff({ dataset: { id: code } }); $1('#bs-t').value = t0; reason('MR-R restore');
  });

  await T('MRR-32 overdue wording on the simulated date', async () => {
    STORE.cbRem = STORE.cbRem || {}; const off0 = STORE.cbRem.offset || 0; const pl = wD.plans.find(p => !p.archived), r = pl.rows.find(x => x.status !== 'Paid');
    STORE.cbRem.offset = Math.ceil((new Date(r.due) - now()) / 864e5) + 10; pick('nvq-fa'); render(); go('dashboard');
    const t = main(), m = /Pay by (\d+ \w+ \d{4})/.exec(t), late = fiLate(r.due, wD);
    ok('MRR-32 the banner states the days overdue on the simulated date and never a pay-by date before the due date', /Payment overdue/.test(t) && t.includes(`${late} days overdue`) && (!m || new Date(m[1]) > new Date(r.due)), (t.match(/Payment overdue[^]{0,160}/) || [''])[0]);
    go('payments'); ok('MRR-32 the payments row shows the same days overdue (was negative on the real clock)', main().includes(`${late} days overdue`) && !/-\d+ days overdue/.test(main()));
    STORE.cbRem.offset = off0; render();
  });

  await T('MRR-24 deactivated accounts can\'t sign in', async () => {
    pick('super'); const L = learnerById(LH); ACT.lAct({ dataset: { id: LH, a: 'deactivate' } }); reason('MR-R deactivate'); ok('MRR-24 setup: Lena\'s row is Deactivated', row(LH).acct === 'Deactivated');
    pick('short'); ok('MRR-24 the demo chooser refuses a deactivated learner', !(S.signedIn && S.portal === 'learner') && /inactive/.test((S.authMsg || {}).html || ''));
    emailIn(wL.me.email); ok('MRR-24 email sign-in refuses a deactivated learner', !(S.signedIn && S.portal === 'learner'));
    pick('super'); ACT.lAct({ dataset: { id: LH, a: 'reactivate' } }); reason('MR-R reactivate'); pick('short'); ok('MRR-24 reactivated: she signs in again', S.signedIn && S.portal === 'learner' && W === wL);
    const fa = ADMIN.staff.find(s => s.id === 'ST-011'); pick('super'); fa.status = 'Deactivated';
    pick('fin'); ok('MRR-24 the demo chooser refuses a deactivated Finance Admin', !(S.signedIn && ADMIN.me.name === fa.name));
    emailIn(fa.email); ok('MRR-24 email sign-in refuses a deactivated Finance Admin', !(S.signedIn && ADMIN.me.name === fa.name));
    fa.status = 'Active'; pick('fin'); ok('MRR-24 active again: the Finance Admin signs in', S.signedIn && ADMIN.me.name === fa.name);
  });

  await T('MRR-RL default client relationships work for every role', async () => {
    const res = {};
    pick('super'); ['CD1', 'CD2', 'CD3', 'CD4', 'CD5'].forEach(k => { go('a-learner', { id: STORE.worlds[k].me.id }); res['sa-' + k] = main().includes(STORE.worlds[k].me.id); });
    pick('fin'); ['CD1', 'CD2', 'CD3', 'CD4', 'CD5'].forEach(k => { go('f-learner', { id: STORE.worlds[k].me.id }); res['fin-' + k] = main().includes(chFullName(STORE.worlds[k])); });
    pick('coord1'); go('c-learners'); res.coord1 = mcLids(b).filter(l => mcOf(l, b) === COO_USERS.A.name).every(l => main().includes(learnerById(l).name));
    pick('coord2'); go('c-learners'); res.coord2 = mcLids(b).filter(l => mcOf(l, b) === COO_USERS.B.name).every(l => main().includes(learnerById(l).name));
    pick('assessor'); go('t-students'); res.assessor = [AM, DV].every(l => main().includes(learnerById(l).name));
    pick('agency'); go('dashboard'); res.agency = !/Error|undefined/.test(main());
    ok('MRR-RL Super Admin, Finance, both Coordinators, the Assessor and the agency open the client learners\' records', Object.values(res).every(Boolean), J(res));
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy();
  await T('MRR-35 legacy: seeded AQ-1004 is at the final stage', async () => {
    const i = qItem('AQ-1004'), c = STORE.worlds[i.data.v].certs.find(x => x.id === i.data.cert), no0 = c.no;
    SA(); go('a-dashboard'); ok('MRR-35 AQ-1004 is listed as awaiting the final approval (its first review is recorded)', i.stage === 'final' && main().includes('AQ-1004'));
    ACT.qDo({ dataset: { id: 'AQ-1004', a: 'approveFinal' } }); reason('final'); ok('MRR-35 the Super Administrator approves it; the certificate is re-issued', i.status === 'Approved' && c.no !== no0);
    const a0 = aud(), s0 = sec(); setAdminIdentity('QA'); S.portal = 'admin'; const q = qItem('AQ-7001'), st = q && q.status; ACT.qSimCorr();
    ok('MRR-35 the IQA demo control no longer acts as the Super Administrator (nothing logged under a borrowed name, nothing changed)', aud() === a0 && sec() === s0 && (!q || q.status === st));
  });

  await T('MRR-27 legacy persona lists', async () => {
    const seeded = STORE.tas.notifs.filter(n => /^tn\d+$/.test(n.id)).map(n => n.id);
    TCH('A'); const a = tasNotifs().filter(n => seeded.includes(n.id)).length; TCH('T'); const t = tasNotifs().filter(n => seeded.includes(n.id)).length;
    ok('MRR-27 legacy: Sarah keeps her seeded notices; the Teacher-only persona no longer gets a fixed slice of them', a === seeded.length && t === 0, J([seeded.length, a, t]));
    COO('A'); const ca = cooNotifs().filter(n => /^cn\d+$/.test(n.id)).length; COO('B'); const cb = cooNotifs().filter(n => /^cn\d+$/.test(n.id) && !n.mc).length;
    ok('MRR-27 legacy: Coordinator A keeps her seeded notices; Coordinator B no longer sees four of them', ca > 0 && cb === 0, J([ca, cb]));
  });

  await T('MRR-24 legacy deactivated learner', async () => {
    SA(); const L = learnerById(STORE.worlds.E.me.id); ACT.lAct({ dataset: { id: L.id, a: 'deactivate' } }); reason('MR-R');
    emailIn(STORE.worlds.E.me.email); ok('MRR-24 legacy: a deactivated learner\'s email sign-in is refused', !(S.signedIn && S.portal === 'learner'), J([S.signedIn, S.portal, S.variant]));
    SA(); ACT.lAct({ dataset: { id: L.id, a: 'reactivate' } }); reason('MR-R');
  });

  let p = document.getElementById('ft-out'); if (!p) { p = document.createElement('pre'); p.id = 'ft-out'; document.body.appendChild(p); } p.textContent = R.join('\n');
})();
