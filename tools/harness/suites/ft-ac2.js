// AC-2 — academic admission and approval integrity (1 Nov 2026; PD-AC2-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client: the client demo first (demo shortcuts, mandatory documents, document and admission
// transitions, stale dialogs and role switches, audit attribution, an outcome correction's override), then the legacy data (the
// seeded admission queue item, the learner-B demo panel, a Coordinator's queue decision, the override inventory), then the
// baseline reproductions with the handlers kept from before AC-2 (_xxAC2 / AC2_OLD in js/ac2-admission.js) on records the next
// fixture load discards, then the client demo again to check Reset. Browser refreshes: ft-ac2p.js.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'AC-2 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  // A dialog's confirm, kept to be pressed later (after a role switch, or after the record was decided another way)
  const hold = () => { const m = MODAL, a = primA(); return (r = 'AC-2 replay') => { MODAL = m; renderModal(); const t = $1('#rsn'); if (t) t.value = r; const x = a.fn(); closeModal(); return x; }; };
  const sec = () => ADMIN.security.length;
  const since = n0 => ADMIN.audit.slice(0, Math.max(0, ADMIN.audit.length - n0));
  const succ = (rows, re) => rows.filter(a => re.test(a.action) && !/^Blocked/.test(a.action));
  const blocked = rows => rows.filter(a => /^Blocked/.test(a.action));
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const submitAsg = (p, aid) => { pick(p); const a = W.assignments.find(x => x.id === aid); go('assignment', { id: aid }); a.qs.forEach(q => { W.drafts[a.id + '.' + q.id + '.0'] = '<p>AC-2 answer ' + q.id + '</p>'; }); fxFast(ff => { ACT.reviewSubmit({ dataset: { id: aid } }); prim(); ff(16500); }); closeModal(); return a; };
  const upload = async (id, how) => { closeModal(); go('admission'); ACT[how]({ dataset: { id } }); ACT.sampleUpload({ dataset: { id } }); await sleep(1700); closeModal(); };
  // Legacy identities
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => AS('A');
  const COO = v => { closeModal(); S.coo.v = v; cooEnter(); S.signedIn = true; S.ui = {}; };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const docSnap = () => J(Object.keys(STORE.worlds).map(v => { const w = STORE.worlds[v]; return [v, w.admission && [w.admission.status, w.admission.history.length], (w.docs || []).map(d => [d.id, d.status, !!d.replacement, d.versions.length])]; }));
  const cdSnap = () => J({ ad: ['CD1', 'CD2', 'CD4', 'CD5'].map(v => [STORE.worlds[v].admission.status, STORE.worlds[v].docs.map(d => [d.id, d.status, !!d.replacement])]), q: ADMIN.queue.length, apps: allApplications().map(a => [a.id, a.status]), pins: ['CD1', 'CD2', 'CD4', 'CD5'].map(v => J(STORE.worlds[v].signup.pin || null).length) });
  const cd0 = cdSnap(), audit0 = ADMIN.audit.map(a => [a.id, a.actor, a.role, a.at, a.action]);

  /* ================= Client demo ================= */
  const wS = STORE.worlds.CD4, wT = STORE.worlds.CD5, MAND = w => w.docs.filter(d => d.mand), DOC = (w, id) => w.docs.find(d => d.id === id);
  ok('AC2 setup: Sam and Tom are awaiting review with their three mandatory documents submitted; their optional documents are not uploaded', [wS, wT].every(w => w.admission.status === 'Awaiting review' && MAND(w).length === 3 && MAND(w).every(d => d.status === 'Submitted') && w.docs.filter(d => !d.mand).every(d => d.status === 'Pending')), cd0.slice(0, 200));

  // B1-D8: the demo shortcuts, called directly by every identity that has no admissions authority
  await T('AC2-H demo shortcuts (B1-D8)', async () => {
    for (const p of ['nvq-dep', 'nvq-bank', 'nvq-sp', 'short', 'teacher', 'assessor', 'coord1', 'coord2', 'fin', 'biz', 'agency', 'iqa']) {
      pick(p); if (!['nvq-dep'].includes(p)) S.variant = 'CD4'; const who = w0Who(), s0 = sec(), a0 = ADMIN.audit.length, n0 = wS.notifs.length;
      ACT.approveAllDocs(); ACT.approveAdmission(); const rows = since(a0);
      ok('AC2-H ' + p + ' cannot approve Sam\'s documents or admission through the demo shortcuts (direct call); nothing changes; refused and logged as ' + who.name, MAND(wS).every(d => d.status === 'Submitted') && wS.admission.status === 'Awaiting review' && wS.notifs.length === n0 && sec() === s0 + 2 && blocked(rows).length === 2 && blocked(rows).every(a => a.actor === who.name) && !succ(rows, /approved|decision/i).length, J({ st: wS.admission.status, rows: rows.map(a => [a.actor, a.action]) }));
    }
    pick('agency'); const s0 = sec(), l0 = (STORE.agy.ledger || []).length; ACT.agySimReject(); ok('AC2-H the agency\'s "Simulate admission rejected" is refused (an agency doesn\'t decide admissions)', sec() === s0 + 1 && (STORE.agy.ledger || []).length === l0);
    // The learner's "Prototype: Academy grants +14 days" on a request for more time
    pick('short'); const e = W.enrolments.find(x => x.kind === 'short'); ok('AC2-H setup: Lena has a short course', !!e); if (!e) return;
    ACT.reqTime({ dataset: { id: e.id } }); $1('#rt-reason').value = 'AC-2: more time please'; prim(); const rq = W.requests[0], end0 = e.end;
    ok('AC2-H screen: the request-sent dialog offers "decide it as the Academic Admin", not the learner granting it', !!MODAL && /ac2ReviewAsAca/.test(MODAL.body) && !/simGrant/.test(MODAL.body));
    const s1 = sec(); ACT.simGrant({ dataset: { e: e.id, r: rq.id } }); closeModal();
    ok('AC2-H Lena cannot grant her own request (direct call): it stays Requested, access unchanged, refused and logged', rq.status === 'Requested' && e.end === end0 && sec() === s1 + 1, rq.status);
    ACT.reqTime({ dataset: { id: e.id } }); closeModal(); ACT.ac2ReviewAsAca({ dataset: { r: 'a-queue', q: rq.id } });
    ok('AC2-H the demo button switches to the Academic Admin and opens the request in the Approvals Queue', S.portal === 'admin' && isAca() && S.route === 'a-queue' && /AQ-/.test(main()) && main().includes(rq.id), S.route);
    const qi = qItem('AQ-' + rq.id + '-CD3'); ACT.qDo({ dataset: { id: qi.id, a: 'extend' } }); reason('AC-2 granted');
    ok('AC2-H the Academic Admin grants it in the queue, once', rq.status === 'Granted' && e.end !== end0 && qItem(qi.id).decidedBy === ADMIN.me.name, J({ st: rq.status, by: qItem(qi.id).decidedBy }));
  });

  // B1-D1: the learner's own checklist (fixed at sign-up); mandatory items only
  let pin0 = null, seat0 = null, plan0 = null;
  await T('AC2-A mandatory documents (B1-D1)', async () => {
    pick('aca'); const me = ADMIN.me.name; pin0 = J(wS.signup.pin || null); seat0 = dpSeat(wS).st; plan0 = J((wS.plans || []).map(p => p.rows.map(r => [r.n, r.status, r.paid])));
    go('a-admissions', { id: 'APP-CD4' }); const btn = $1('main [data-act="appApprove"]');
    ok('AC2-A screen: Sam\'s "Approve admission" is disabled and names the three mandatory documents awaiting review; optional ones are marked Optional', !!btn && btn.disabled && /Not yet: .*awaiting review.*awaiting review.*awaiting review/.test(main()) && /Optional/.test(main()), main().match(/Not yet:[^.]*/));
    const n0 = wS.notifs.length, a0 = ADMIN.audit.length, s0 = sec();
    ACT.appApprove({ dataset: { id: 'APP-CD4' } }); const m = !!MODAL; closeModal(); const r = admissionApprove('CD4', 'AC-2 direct');
    const rows = since(a0);
    ok('AC2-A approval with no mandatory document approved is refused (handler and shared effect); nothing changes; no success entry; the refusal names the real actor', !m && r === false && wS.admission.status === 'Awaiting review' && wS.notifs.length === n0 && !succ(rows, /Admission approved/).length && sec() === s0 + 2 && blocked(rows).every(a => a.actor === me && a.role === 'Academic Admin'), J(rows.map(a => [a.actor, a.role, a.action])));
    click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n1"][data-s="Approved"]')); go('a-admissions', { id: 'APP-CD4' }); click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n3"][data-s="Approved"]'));
    ok('AC2-A the Academic Admin approves two mandatory documents on the screen', DOC(wS, 'n1').status === 'Approved' && DOC(wS, 'n3').status === 'Approved');
    ACT.appApprove({ dataset: { id: 'APP-CD4' } }); const m2 = !!MODAL; closeModal();
    ok('AC2-A one mandatory document still awaiting review: approval refused', !m2 && wS.admission.status === 'Awaiting review');
    go('a-admissions', { id: 'APP-CD4' }); click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n6"][data-s="Rejected"]')); reason('Unreadable scan');
    ok('AC2-A a mandatory document rejected: approval refused, and the screen offers no decision on the rejected document', DOC(wS, 'n6').status === 'Rejected' && admissionApprove('CD4', 'x') === false && (go('a-admissions', { id: 'APP-CD4' }), !$1('main [data-act="docDec"][data-d="n6"]')));
    const s1 = sec(); ACT.docDec({ dataset: { a: 'APP-CD4', d: 'n6', s: 'Approved' } }); const r6 = docDecision('CD4', DOC(wS, 'n6'), 'Approved', 'x');
    ok('AC2-A a rejected document cannot become Approved without a new upload (handler and shared effect); refused and logged', DOC(wS, 'n6').status === 'Rejected' && r6 === false && sec() === s1 + 2);
    pick('nvq-dep'); await upload('n6', 'reupload');
    ok('AC2-A Sam uploads a new file for the rejected document: it returns to review (Submitted)', DOC(wS, 'n6').status === 'Submitted', DOC(wS, 'n6').status);
    pick('aca'); go('a-admissions', { id: 'APP-CD4' }); click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n6"][data-s="Approved"]'));
    ok('AC2-A ... and the Academic Admin approves it; every mandatory document is approved while the optional ones are not uploaded', MAND(wS).every(d => d.status === 'Approved') && wS.docs.some(d => !d.mand && d.status === 'Pending') && !admDocsWhy(wS.docs));
    pick('nvq-dep'); await upload('n1', 'replaceDoc'); const d1 = DOC(wS, 'n1');
    ok('AC2-A an approved document replaced by a new upload: the replacement is in review and the approved document stays current', d1.status === 'Approved' && !!d1.replacement && d1.versions.some(v => v[2] === 'Replacement (in review)'), J({ st: d1.status, rep: !!d1.replacement }));
    pick('aca'); go('a-admissions', { id: 'APP-CD4' }); const b2 = $1('main [data-act="appApprove"]'); ACT.appApprove({ dataset: { id: 'APP-CD4' } }); const m3 = !!MODAL; closeModal();
    ok('AC2-A a mandatory document awaiting replacement verification: approval refused; the screen says why', !m3 && b2 && b2.disabled && /replacement awaiting verification/.test(main()) && wS.admission.status === 'Awaiting review');
    click($1('main [data-act="docDec"][data-a="APP-CD4"][data-d="n1"][data-s="Approved"]'));
    ok('AC2-A the Academic Admin verifies the replacement: it becomes the current document', !d1.replacement && d1.status === 'Approved' && d1.versions.some(v => v[2] === 'Replaced'));
    const d3 = DOC(wS, 'n3'); d3.expires = new Date(now().getTime() - 864e5).toISOString(); // test-only: a recorded expiry date that has passed
    ACT.appApprove({ dataset: { id: 'APP-CD4' } }); const m4 = !!MODAL; closeModal(); go('a-admissions', { id: 'APP-CD4' });
    ok('AC2-A an expired mandatory document: approval refused, the screen names it as expired', !m4 && /expired/.test(main()) && wS.admission.status === 'Awaiting review'); delete d3.expires;
    const n1 = wS.notifs.length, a1 = ADMIN.audit.length; go('a-admissions', { id: 'APP-CD4' }); const b3 = $1('main [data-act="appApprove"]');
    ok('AC2-A screen: with every mandatory document approved and current, "Approve admission" is enabled', !!b3 && !b3.disabled); click(b3); reason('All mandatory documents checked');
    const ok1 = since(a1);
    ok('AC2-A the authorized approval succeeds: Approved, the learner told once, one audit entry naming the Academic Admin and the status before', wS.admission.status === 'Approved' && wS.notifs.length === n1 + 1 && succ(ok1, /Admission approved/).length === 1 && succ(ok1, /Admission approved/)[0].actor === me && succ(ok1, /Admission approved/)[0].before === 'Awaiting review', J(ok1.map(a => [a.actor, a.action, a.before])));
    ok('AC2-A admission is not financial security: Sam\'s seat, payment plan and signed terms are unchanged', dpSeat(wS).st === seat0 && J((wS.plans || []).map(p => p.rows.map(r => [r.n, r.status, r.paid]))) === plan0 && J(wS.signup.pin || null) === pin0, dpSeat(wS).st + ' / ' + seat0);
  });

  // B1-D2: decide once; stale dialogs and copies; role switches; invalid IDs
  await T('AC2-B decision state and transitions (B1-D2)', async () => {
    pick('aca'); const n0 = wS.notifs.length, h0 = wS.admission.history.length, a0 = ADMIN.audit.length, s0 = sec();
    ['appApprove', 'appReject', 'appWithdraw'].forEach(n => { ACT[n]({ dataset: { id: 'APP-CD4' } }); if (MODAL) reason('again'); });
    const r = admissionApprove('CD4', 'again');
    ok('AC2-B Sam\'s approved admission cannot be approved, rejected or withdrawn again; no notice, history or success entry; refused and logged', wS.admission.status === 'Approved' && wS.notifs.length === n0 && wS.admission.history.length === h0 && r === false && !succ(since(a0), /Admission|Application/).length && sec() === s0 + 4, J({ st: wS.admission.status, h: wS.admission.history.length - h0 }));
    go('a-admissions', { id: 'APP-CD4' }); ok('AC2-B screen: the decided application offers no decision', !$1('main [data-act="appApprove"]') && !$1('main [data-act="appReject"]'));
    const d1 = DOC(wS, 'n1'), v1 = d1.versions.length, s1 = sec();
    ['Approved', 'Rejected', 'Resubmission Required'].forEach(s => { ACT.docDec({ dataset: { a: 'APP-CD4', d: 'n1', s } }); if (MODAL) reason('again'); });
    ok('AC2-B an approved document is not re-decided (approve, reject or send back)', d1.status === 'Approved' && d1.versions.length === v1 && sec() === s1 + 3 && wS.notifs.length === n0);
    const s2 = sec(), t1 = DOC(wT, 'n1'); ACT.docDec({ dataset: { a: 'APP-CD5', d: 'n1', s: 'Hacked' } }); const mH = !!MODAL; closeModal(); const rH = docDecision('CD5', t1, 'Hacked', 'x');
    ok('AC2-B an arbitrary document status ("Hacked") is refused (handler and shared effect)', !mH && rH === false && t1.status === 'Submitted' && sec() === s2 + 2);
    ACT.docDec({ dataset: { a: 'APP-CD5', d: 'n4', s: 'Approved' } }); ok('AC2-B a document that hasn\'t been uploaded has nothing to review', DOC(wT, 'n4').status === 'Pending');
    // Invalid IDs: refused without an error or any change
    const snap = docSnap(); let threw = '';
    try { ACT.docDec({ dataset: { a: 'APP-NOPE', d: 'zz', s: 'Approved' } }); ACT.docDec({ dataset: { a: 'APP-CD5', d: 'zz', s: 'Approved' } }); ['appApprove', 'appReject', 'appWithdraw'].forEach(n => ACT[n]({ dataset: { id: 'APP-NOPE' } })); ACT.docDec({}); ACT.appApprove({}); docDecision('NOPE', { id: 'x' }, 'Approved', 'x'); applyDecision(undefined, 'approve'); ACT.qDo({ dataset: { id: 'AQ-NOPE', a: 'approve' } }); } catch (e) { threw = e.message; }
    closeModal(); ok('AC2-B invalid application, document and queue IDs fail safely: no error, no dialog, nothing changes', !threw && docSnap() === snap, threw);
    // A document dialog left open while the identity changes
    go('a-admissions', { id: 'APP-CD5' }); click($1('main [data-act="docDec"][data-a="APP-CD5"][data-d="n1"][data-s="Rejected"]')); const g = hold();
    for (const p of ['fin', 'nvq-bank', 'teacher']) { pick(p); const who = w0Who(), a1 = ADMIN.audit.length, x = g('rogue reject'); const rows = since(a1);
      ok('AC2-B a reject dialog opened by the Academic Admin and confirmed after switching to ' + p + ' is refused; the refusal names ' + who.name, x === false && t1.status === 'Submitted' && !succ(rows, /Document decision/).length && blocked(rows).length === 1 && blocked(rows)[0].actor === who.name, J(rows.map(a => [a.actor, a.action]))); }
    // ... and one left open while the document is decided another way
    pick('aca'); go('a-admissions', { id: 'APP-CD5' }); click($1('main [data-act="docDec"][data-a="APP-CD5"][data-d="n3"][data-s="Rejected"]')); const g2 = hold(); closeModal();
    const tn = wT.notifs.length; ACT.docDec({ dataset: { a: 'APP-CD5', d: 'n3', s: 'Approved' } }); const x2 = g2('stale reject');
    ok('AC2-B a reject dialog confirmed after the document was approved is refused: it stays Approved, the learner told once', x2 === false && DOC(wT, 'n3').status === 'Approved' && wT.notifs.length === tn + 1);
    // The Approvals Queue path (the Super Administrator's queue lists document items; the Academic Admin decides them on the
    // Admissions screen): a document item decided, then its dialog replayed (the item is gone from the queue)
    pick('super');
    const qi = allQueue().find(i => i.doc && i.v === 'CD5' && i.doc.id === 'n6'); ok('AC2-B setup: Tom\'s document n6 is in the queue', !!qi, J({ n6: DOC(wT, 'n6').status, items: allQueue().filter(i => i.doc && i.v === 'CD5').map(i => i.id) })); if (!qi) return;
    go('a-queue', { id: qi.id }); click($1(`main [data-act="qDo"][data-id="${qi.id}"][data-a="reject"]`)); const g3 = hold(); reason('Expired document');
    const d6 = DOC(wT, 'n6'), hh = (d6._hist || []).length, tn2 = wT.notifs.length, s3 = sec(), x3 = g3('replayed');
    ok('AC2-B the queue decides it once; replaying its dialog afterwards is refused in the decision itself and logged — no second history row or notice', d6.status === 'Rejected' && x3 !== true && (d6._hist || []).length === hh && wT.notifs.length === tn2 && sec() === s3 + 1 && !allQueue().some(i => i.id === qi.id), J({ st: d6.status, x3, h: (d6._hist || []).length - hh, n: wT.notifs.length - tn2, sec: sec() - s3, still: allQueue().some(i => i.id === qi.id) }));
    ok('AC2-B applyDecision with the old copy of the item is refused too', applyDecision(qi, 'approve', 'stale copy') === false && d6.status === 'Rejected');
    // An application dialog left open: a stale reject after a withdrawal; a withdrawal confirmed by the Super Administrator after switching
    go('a-admissions', { id: 'APP-CD5' }); ACT.appReject({ dataset: { id: 'APP-CD5' } }); const gR = hold(); closeModal();
    pick('nvq-bank'); const sT = sec(), xT = gR('learner replay'); ok('AC2-B Tom cannot confirm a reject dialog left open by the Academic Admin (refused, logged as Tom)', xT === false && wT.admission.status === 'Awaiting review' && sec() === sT + 1 && ADMIN.audit[0].actor === chFullName(wT));
    pick('aca'); ACT.appWithdraw({ dataset: { id: 'APP-CD5' } }); const gW = hold(); closeModal(); const aca = ADMIN.me.name;
    pick('super'); const sup = ADMIN.me.name, a2 = ADMIN.audit.length, xW = gW('Withdrawn at the learner\'s request');
    const w2 = succ(since(a2), /Application withdrawn/);
    ok('AC2-B a withdrawal dialog opened by the Academic Admin and confirmed after switching to the Super Administrator applies once and names the Super Administrator, not the Academic Admin', xW !== false && wT.admission.status === 'Withdrawn' && w2.length === 1 && w2[0].actor === sup && w2[0].role === 'Super Administrator' && sup !== aca, J(w2.map(a => [a.actor, a.role])));
    const tn3 = wT.notifs.length, xR = gR('stale reject'); ok('AC2-B the earlier reject dialog, confirmed after the withdrawal, is refused', xR === false && wT.admission.status === 'Withdrawn' && wT.notifs.length === tn3);
  });

  // B2-D10 / B3-02: each portal's actions name the identity acting; the system is named for automatic processes
  await T('AC2-L audit attribution (B2-D10 / B3-02)', async () => {
    const rowsOf = f => { const a0 = ADMIN.audit.length; f(); return since(a0); };
    const sub = rowsOf(() => submitAsg('nvq-sp', 'a11')), amira = chFullName(STORE.worlds.CD1);
    ok('AC2-L Amira\'s submission: every audit entry names Amira as a Learner', sub.every(a => a.actor === amira && a.role === 'Learner'), J(sub.map(a => [a.actor, a.action])));
    pick('assessor'); const k = STORE.worlds.CD1.me.id + '~a11', d = dft(k);
    const mk = rowsOf(() => { markable(tasAsg(tasSubs(true).find(s => s.key === k))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'AC-2', met: 'Met' }; }); ACT.mkRelease({ dataset: { k } }); prim(); closeModal(); });
    // TA-1 (PD-TA1-03): the Assessor publishes to the learner; there is no Coordinator release of new marking. Was: 'AC2-L the Assessor
    // sends marking for release …' and 'AC2-L the Coordinator releases it: the entries name <Coordinator> (Academic Coordinator)'.
    // The Coordinator's release of an item sent before TA-1 is still attributed to the Coordinator (ft-ac1 AC1-R).
    ok('AC2-L the Assessor publishes the marking: the entries name James Pryce (Assessor), not an administrator', mk.length > 0 && mk.every(a => a.actor === 'James Pryce' && /Assessor|Teacher/.test(a.role)) && mk.some(a => a.action === 'Feedback published to learner'), J(mk.map(a => [a.actor, a.role, a.action])));
    pick('coord1'); const rl = rowsOf(() => { ACT.relOne({ dataset: { k } }); prim(); closeModal(); });
    ok('AC2-L nothing is left for the Coordinator to release (no entry, no change)', rl.length === 0 && !relStore()[k], J(rl.map(a => [a.actor, a.action])));
    pick('teacher'); const tch = w0Who().name, dn = rowsOf(() => { releaseNow(k); });
    ok('AC2-L an AC-1 refusal (a Teacher releasing marking) is still logged as a refusal naming the Teacher', dn.length === 1 && /^Blocked/.test(dn[0].action) && dn[0].actor === tch);
    pick('fin'); const sys = rowsOf(() => { ACT.cb10Advance({ dataset: { d: '45' } }); render(); dpReconcile(); render(); }); ACT.cb10Reset(); render();
    const rel = sys.filter(a => /Seat hold ended/.test(a.action));
    ok('AC2-L an automatic process (the seat-hold check after the date moved) is recorded as the system, not as the Finance Admin who moved the date', rel.length > 0 && rel.every(a => a.actor === 'System (automatic)' && a.role === 'System'), J(sys.map(a => [a.actor, a.action]).slice(0, 4)));
    const now0 = new Map(ADMIN.audit.map(a => [a.id, a]));
    ok('AC2-L the audit entries present at the start are unchanged (none rewritten or removed)', audit0.every(([id, actor, role, at, action]) => { const a = now0.get(id); return a && a.actor === actor && a.role === role && a.at === at && a.action === action; }), audit0.length);
  });

  // B4-D6 on a published final outcome: an override never creates or changes a published result
  await T('AC2-O override of an outcome correction (published Pass / Fail)', async () => {
    const k = STORE.worlds.CD1.me.id + '~a10'; submitAsg('nvq-sp', 'a10');
    pick('assessor'); ACT.r3Declare({ dataset: { k } }); $1('input[name="r3-res"][value="Fail"]').checked = true; $1('#d-ofb').value = 'AC-2 overall feedback'; $1('#rsn').value = 'r'; act('Publish to learner');
    ACT.tasDC({ dataset: { k } }); $1('#dc-rec').value = 'r3-outcome'; $1('#dc-new').value = 'Pass'; $1('#dc-r').value = 'AC-2 marking error'; prim(); closeModal();
    const dc = ADMIN.queue.find(i => i.data && i.data.r3out && i.data.r3out.key === k && isOpen(i)); ok('AC2-O setup: Fail published; a correction to Pass is open', !!dc && r3Out(k).result === 'Fail'); if (!dc) return;
    pick('sys'); ACT.qDo({ dataset: { id: dc.id, a: 'forward' } }); reason('First review');
    pick('super'); ACT.qDo({ dataset: { id: dc.id, a: 'reject' } }); reason('Not supported by the evidence'); const h0 = r3Out(k).hist.length;
    ok('AC2-O the Super Administrator rejects the correction: the outcome stays Fail', dc.status === 'Rejected' && r3Out(k).result === 'Fail');
    const s0 = sec(), a0 = ADMIN.audit.length; ACT.qOverride({ dataset: { id: dc.id } }); const m = !!MODAL; closeModal();
    ok('AC2-O an override of the rejected correction is refused: no published Pass is created, the outcome history is unchanged, a refusal (not a success) is recorded', !m && dc.status === 'Rejected' && r3Out(k).result === 'Fail' && r3Out(k).hist.length === h0 && blocked(since(a0)).length === 1 && !succ(since(a0), /Override/).length);
    go('a-queue', { id: dc.id }); ok('AC2-O screen: "Override not available" with the reason; no Override button', !!$1('main .ac2-ovn') && /Data Correction/.test($1('main .ac2-ovn').textContent) && !$1('main [data-act="qOverride"]'));
    for (const p of ['aca', 'sys', 'fin']) { pick(p); const s1 = sec(); ACT.qOverride({ dataset: { id: dc.id } }); const mm = !!MODAL; closeModal(); ok('AC2-O ' + p + ' cannot override (handler)', !mm && sec() === s1 + 1); }
  });

  // Baseline (client): the shared effects before AC-2, on records discarded by the next fixture load
  await T('AC2-0 client baseline reproductions', async () => {
    pick('aca'); const w = STORE.worlds.CD5; _apAC2('CD5', 'baseline');
    ok('AC2-0 baseline: before AC-2 the admission effect approved Tom with a mandatory document rejected (B1-D1)', w.admission.status === 'Approved' && MAND(w).some(d => d.status !== 'Approved'), J(MAND(w).map(d => d.status)));
    const d6 = DOC(w, 'n6'); _ddAC2('CD5', d6, 'Approved', 'baseline'); ok('AC2-0 baseline: before AC-2 a rejected document became Approved without a new upload (B1-D2)', d6.status === 'Approved');
    pick('coord1'); _logAAC2('Probe', 'AC-2 baseline', 'Probe', '—', '—', ''); ok('AC2-0 baseline: before AC-2 an entry written in the Coordinator portal named the administrator identity left loaded (B2-D10)', ADMIN.audit[0].actor !== CME().name && ADMIN.audit[0].role !== 'Academic Coordinator', ADMIN.audit[0].actor);
  });

  /* ================= Legacy data ================= */
  fxLoadLegacy();
  const Q = id => qItem(id);
  await T('AC2-Q the seeded admission queue item follows its application', async () => {
    SA(); const i = Q('AQ-1001'), ap = allApplications().find(a => a.id === 'APP-2207'); ok('AC2-Q setup: AQ-1001 (escalated) is APP-2207, with mandatory documents not all approved', !!i && isOpen(i) && !!ap && !!admDocsWhy(ap.docs)); if (!i || !ap) return;
    const s0 = sec(), r1 = applyDecision(i, 'approve', 'AC-2'); ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); const m = !!MODAL; closeModal();
    ok('AC2-Q approving the queue item itself is refused (it used to change only the queue label): the application is decided on its own page', r1 === false && !m && isOpen(Q(i.id)) && ap.status === 'Under Review' && sec() >= s0 + 2);
    go('a-queue', { id: i.id }); ok('AC2-Q screen: the item offers "Open application", not Approve / Reject', !!$1('main [data-act="goTok"]') && !$a('main [data-act="qDo"]').some(b => ['approve', 'reject'].includes(b.dataset.a)));
    ACT.appApprove({ dataset: { id: ap.id } }); const m2 = !!MODAL; closeModal(); ok('AC2-Q APP-2207 with mandatory documents awaiting review: approval refused', !m2 && ap.status === 'Under Review');
    ap.docs.filter(d => d.mand && d.status === 'Submitted').forEach(d => ACT.docDec({ dataset: { a: ap.id, d: d.id, s: 'Approved' } })); ACT.appApprove({ dataset: { id: ap.id } }); reason('All documents checked');
    ok('AC2-Q once every mandatory document is approved, the Super Administrator approves it; the queue item follows once, naming who decided', ap.status === 'Approved' && Q(i.id).status === 'Approved' && Q(i.id).decidedBy === ADMIN.me.name, J({ ap: ap.status, q: Q(i.id).status, by: Q(i.id).decidedBy }));
    const h = Q(i.id).history.length; ACT.appApprove({ dataset: { id: ap.id } }); closeModal(); ok('AC2-Q a second approval is refused; the queue item is not decided twice', Q(i.id).history.length === h && ap.status === 'Approved');
  });

  await T('AC2-LB learner B: demo panel, shortcuts and stale authority (legacy)', async () => {
    const w = STORE.worlds.B; chQuickSignup(w); learner('B'); const st = J(MAND(w).map(d => d.status)), s0 = sec();
    ACT.approveAllDocs(); ACT.approveAdmission();
    ok('AC2-LB learner B cannot approve their own documents or admission through the demo shortcuts; refused and logged as the learner', J(MAND(w).map(d => d.status)) === st && w.admission.status !== 'Approved' && sec() === s0 + 2 && ADMIN.audit[0].actor === VNAME('B') && ADMIN.audit[0].role === 'Learner');
    S.demoOpen = true; renderDemo(); const b = $1('#demo-root [data-act="ac2ReviewAsAca"]');
    ok('AC2-LB screen: the learner demo panel offers "Review documents and admission as the Academic Admin", not the self-approval buttons', !!b && !$1('#demo-root [data-act="approveAllDocs"]') && !$1('#demo-root [data-act="approveAdmission"]'));
    click(b); ok('AC2-LB the button switches to the Academic Admin and opens APP-B', S.portal === 'admin' && isAca() && S.route === 'a-admissions' && (S.params || {}).id === 'APP-B', S.route + ' ' + J(S.params));
    S.variant = 'B'; const a0 = ADMIN.audit.length, sub = MAND(w).filter(d => d.status === 'Submitted').length; ACT.approveAllDocs(); const rows = succ(since(a0), /Document decision/);
    ok('AC2-LB for the Academic Admin the shortcut uses the real decision: only submitted mandatory documents are approved, each logged naming the Academic Admin', rows.length === sub && rows.every(a => a.actor === ADMIN.me.name) && MAND(w).filter(d => d.status === 'Approved').length >= sub, J({ sub, rows: rows.length }));
    ACT.approveAdmission(); ok('AC2-LB ... and the admission shortcut keeps the mandatory-document rule', !admDocsWhy(w.docs) ? w.admission.status === 'Approved' : w.admission.status !== 'Approved', w.admission.status);
    // An Admissions Officer's authority counts in the admin portal only
    const me = ADMIN.me; ADMIN.me = { ...me, roles: ['Admissions Officer (custom)'] }; const aca = ADMIN.aca; ADMIN.aca = false;
    const inAdmin = admCanDecide(); S.portal = 'learner'; const inLearner = admCanDecide(); S.portal = 'admin'; ADMIN.me = me; ADMIN.aca = aca;
    ok('AC2-LB the Admissions Officer role grants admission decisions in the admin portal only (no stale authority in another portal)', inAdmin && !inLearner);
    // A dialog opened by the Super Administrator, confirmed after switching to the learner
    const wC = STORE.worlds.B; SA(); if (['Awaiting review', 'Under Review', 'Pending — Documents Required'].includes(wC.admission.status)) { ACT.appReject({ dataset: { id: 'APP-B' } }); const g = hold(); learner('B'); const x = g('learner replay'); ok('AC2-LB a reject dialog opened by the Super Administrator and confirmed as the learner is refused', x === false && wC.admission.status !== 'Rejected'); }
  });

  await T('AC2-HL the agency demo panel (legacy)', async () => {
    closeModal(); agyEnter('AG-01', true); S.signedIn = true;
    S.demoOpen = true; renderDemo(); ok('AC2-H screen: the agency demo panel offers "Review the admission as the Academic Admin", not "Simulate admission rejected"', !!$1('#demo-root [data-act="ac2AgyReview"]') && !$1('#demo-root [data-act="agySimReject"]'), J({ p: S.portal, s: S.signedIn, r: S.route, h: ($1('#demo-root') || {}).textContent.slice(0, 200) })); S.demoOpen = false; render();
  });

  await T('AC2-C a Coordinator\'s queue decision names the Coordinator (legacy)', async () => {
    const i = Q('AQ-9201'), r = i && chOrOf(i.data.req); ok('AC2-C setup: the office observation request is open', !!r && isOpen(i)); if (!r) return;
    const v = ['A', 'B'].find(x => { COO(x); return chIsMyBatchLid(r.lid); }); COO(v); const co = CME().name, a0 = ADMIN.audit.length;
    applyDecision(i, 'approve', 'AC-2 Coordinator decision', {}); const rows = since(a0), j = Q(i.id);
    ok('AC2-C approved by ' + co + ' in the Coordinator portal: every audit entry, the queue history and "decided by" name ' + co, j.status === 'Approved' && rows.length > 0 && rows.every(a => a.actor === co && a.role === 'Academic Coordinator') && j.history[j.history.length - 1][0] === co && j.decidedBy === co, J({ rows: rows.map(a => [a.actor, a.action]), by: j.decidedBy }));
    ACA(); const q = Q('AQ-R-1077-F'); applyDecision(q, 'reject', 'AC-2', {});
    ok('AC2-C a learner request decided by the Academic Admin shows that Academic Admin as the decider (it showed "Rachel Hughes" whoever decided)', Q(q.id).status === 'Rejected' && Q(q.id).decidedBy === ADMIN.me.name, Q(q.id).decidedBy);
  });

  // B4-D6: every decided item type that showed "Override decision"
  await T('AC2-OV override inventory (B4-D6)', async () => {
    SA(); const fp = () => J({ w: Object.keys(STORE.worlds).map(v => { const w = STORE.worlds[v]; return [v, w.nvq && w.nvq.status, w.admission && w.admission.status, (w.certs || []).map(c => [c.no, c.status, (c.lineage || []).length]), (w.enrolments || []).map(e => [e.status, e.end]), (w.requests || []).map(x => x.status), (w.assignments || []).map(a => [a.status, a.resubMax, a.limit])]; }), b: (ADMIN.bundles || []).map(b => [b.id, b.used, b.price, b.vat]), fin: ((STORE.fin || {}).tx || []).length, led: (STORE.agy && STORE.agy.ledger || []).length, disc: J(discNow()), cfg: (ADMIN.config || []).map(c => c.value) });
    const dec = allQueue().filter(i => !isOpen(i) && !['No approval (direct)', 'No approval'].includes(i.first) && i.status !== 'Paid/Processed' && !['Refund', E1_T].includes(i.type));
    const types = {}; dec.forEach(i => { (types[i.type] = types[i.type] || []).push(i.id); });
    ok('AC2-OV setup: decided items of ' + Object.keys(types).length + ' types', Object.keys(types).length >= 10, J(Object.keys(types)));
    for (const i of dec) {
      const why = ac2OvWhy(i); if (!why) continue;
      const f0 = fp(), st = i.status, a0 = ADMIN.audit.length; ACT.qOverride({ dataset: { id: i.id } }); const m = !!MODAL; closeModal(); const j = Q(i.id) || i;
      if (types[i.type][0] === i.id || !(j.status === st && f0 === fp() && !m)) ok('AC2-OV ' + i.type + ' (' + i.id + ', ' + st + '): override refused — status, records, certificates, seats and money unchanged; a refusal is recorded', !m && j.status === st && fp() === f0 && blocked(since(a0)).length === 1 && !succ(since(a0), /Override/).length, why.slice(0, 90));
    }
    const shown = Object.values(types).map(ids => ids.find(id => ac2OvWhy(Q(id)))).filter(Boolean).filter(id => { go('a-queue', { id }); return !$1('main .ac2-ovn') || !!$1('main [data-act="qOverride"]'); });
    ok('AC2-OV screen: every refused type shows "Override not available" with its reason instead of the Override button', !shown.length, J(shown));
    // Defined: a rejected request's normal approval, once
    const i = Q('AQ-R-0960'), rq = i && i.req, rm = rq && shReqMod(STORE.worlds[i.v], rq), max0 = rm && rm.m.quiz.max, was = rq && rq.decision;
    ok('AC2-OV setup: a rejected extra-attempts request', !!rm && i.status === 'Rejected'); if (!rm) return;
    ACT.qOverride({ dataset: { id: i.id } }); const opts = $a('#modal-root #ovr option').map(o => o.value), g = hold();
    ok('AC2-OV the override dialog offers Approved only, and says it applies the normal approval once', J(opts) === J(['Approved']) && /normal approval once/.test($1('#modal-root').textContent), J(opts));
    const a0 = ADMIN.audit.length; reason('Exceptional circumstances'); const j = Q(i.id);
    ok('AC2-OV the Super Administrator\'s override grants the attempts once; the original decision and the override are kept in the history', rq.status === 'Granted' && rm.m.quiz.max === rm.m.quiz.attempts.length + 3 && j.status === 'Approved' && j.override && j.override.from === 'Rejected' && j.decision === was && j.history.some(h => h[2] !== 'Raised' && !/Grant/.test(h[2])) && j.history.some(h => /Grant attempts/.test(h[2])) && succ(since(a0), /Override decision/).length === 1 && succ(since(a0), /Override decision/)[0].actor === ADMIN.me.name, J({ max: [max0, rm.m.quiz.max], st: j.status, ov: j.override, decOk: j.decision === was, hist: j.history.map(h => h[2]), ovr: succ(since(a0), /Override decision/).map(a => a.actor) }));
    const s0 = sec(), x = g('replayed'); ACT.qOverride({ dataset: { id: i.id } }); const m2 = !!MODAL; closeModal();
    const max1 = J(j.history.length); ok('AC2-OV replaying the override dialog, or overriding again, is refused: no second grant', x === false && !m2 && rm.m.quiz.max === rm.m.quiz.attempts.length + 3 && J(Q(i.id).history.length) === max1 && rq.status === 'Granted' && sec() === s0, J({ x, m2, max: rm.m.quiz.max, sec: sec() - s0 }));
    const p = Q('AQ-R-0998'); ok('AC2-OV a rejected "Full name" profile change is refused (its approval would update nothing — label only)', !!p && /label only/.test(ac2OvWhy(p)));
    // Certificates: a Data Correction that re-issued a certificate is never re-issued again by an override
    const dc = Q('AQ-1004'), cw = STORE.worlds[dc.data.v], c = cw.certs.find(x => x.id === dc.data.cert);
    AS('SY'); ACT.qDo({ dataset: { id: dc.id, a: 'forward' } }); reason('First review'); SA(); ACT.qDo({ dataset: { id: dc.id, a: 'approveFinal' } }); reason('Final');
    const no1 = c.no, l1 = (c.lineage || []).length; ACT.qOverride({ dataset: { id: dc.id } }); const m3 = !!MODAL; closeModal();
    ok('AC2-OV certificates: after a Data Correction re-issued the certificate, an override neither re-issues nor reverses it', dc.status === 'Approved' && !m3 && c.no === no1 && (c.lineage || []).length === l1, no1);
    // Admission: the decision stands
    const wB = STORE.worlds.B; if (['Awaiting review', 'Under Review', 'Pending — Documents Required'].includes(wB.admission.status)) { applyDecision(Q('AQ-ADM-B'), 'reject', 'AC-2'); }
    const ad = Q('AQ-ADM-B'); if (ad && !isOpen(ad)) { const st = wB.admission.status; ACT.qOverride({ dataset: { id: ad.id } }); const m4 = !!MODAL; closeModal(); ok('AC2-OV admission: an override of a decided admission is refused; the admission stands', !m4 && wB.admission.status === st); }
    // Money: a refund keeps FI-2's rule (the dialog opens; a paid refund can't be taken back)
    const rf = allQueue().find(x => x.type === 'Refund' && x.status === 'Approved' && x.processed); if (rf) { ACT.qOverride({ dataset: { id: rf.id } }); const m5 = !!MODAL; if (MODAL) { $1('#ovr').value = 'Rejected'; $1('#rsn').value = 'take back'; } const r5 = MODAL ? prim() : 'no dialog'; closeModal(); ok('AC2-OV refunds keep FI-2\'s override: the dialog opens and taking back a paid refund is refused', m5 && r5 === false && rf.status === 'Approved'); }
  });

  /* ================= Legacy baseline reproductions ================= */
  fxLoadLegacy();
  await T('AC2-0 legacy baseline reproductions', async () => {
    const w = STORE.worlds.B; chQuickSignup(w); learner('B'); AC2_OLD.approveAllDocs(); AC2_OLD.approveAdmission();
    ok('AC2-0 baseline: before AC-2 learner B approved their own documents and admission with the demo shortcuts (B1-D8)', MAND(w).every(d => d.status === 'Approved') && w.admission.status === 'Approved');
    SA(); const k = Q('AQ-R-1042'), rm = shReqMod(STORE.worlds[k.v], k.req), m0 = rm && rm.m.quiz.max; _qoAC2({ dataset: { id: k.id } }); if (MODAL) { $1('#ovr').value = 'Rejected'; reason('baseline'); }
    ok('AC2-0 baseline: before AC-2 an override "rejected" granted attempts but left them granted (label only, B4-D6)', k.req.status === 'Rejected' && rm && rm.m.quiz.max === m0, J({ st: k.req.status, max: [m0, rm && rm.m.quiz.max] }));
    const v = Q('AQ-7300'), b0 = J(ADMIN.bundles); _qoAC2({ dataset: { id: v.id } }); if (MODAL) { $1('#ovr').value = 'Rejected'; reason('baseline'); }
    ok('AC2-0 baseline: before AC-2 an override relabelled a bundle VAT decision Rejected with the VAT setting unchanged (B4-D6)', Q(v.id).status === 'Rejected' && J(ADMIN.bundles) === b0);
  });

  /* ================= Reset ================= */
  await T('AC2-Z client demo reset', async () => {
    fxLoadClient(); ok('AC2-Z loading the client demo restores the starting records: Sam and Tom awaiting review with their documents submitted, Amira and Dev admitted, signed terms unchanged', cdSnap() === cd0, cdSnap().slice(0, 240));
    ok('AC2-Z the starting audit has no AC-2 refusals or decisions', !ADMIN.audit.some(a => /AC-2/.test(a.reason || '') || /^Blocked: (approve|decide|reject|withdraw|override)/.test(a.action)));
  });
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
