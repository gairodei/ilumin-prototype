// MR-G1 — admin-console authorisation (multi-role audit, 2 Nov 2026; PD-MR-G1-* in PROVISIONAL-DECISIONS.md). FIXTURE=client.
// Client demo first (deny-by-default role matrix over the staff, learner, security, data-request, schedule, observation,
// re-allocation, queue and demo handlers; positive paths; re-checks on confirm; Reset demo), then the legacy data (catalogue,
// Academy messaging, certificate revocation, which the client demo has no records for), then the client demo again.
// Test-only records (a probe security event, a data request, a temporary certificate) are made on data the next fixture load discards.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const primA = () => MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls));
  const prim = () => { const a = primA(); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'MR-G1 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const sec = () => ADMIN.security.length;
  const lastAud = () => ADMIN.audit[0] || {};
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  // Identities (both fixtures). LV: the learner world for the fixture loaded.
  let LV = 'CD1';
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-dashboard'); };
  const ID = {
    learner: () => { closeModal(); S.edge = 'none'; S.variant = LV; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; },
    agency: () => { closeModal(); agyEnter('AG-02', true); S.signedIn = true; S.ui = {}; },
    coord: () => { closeModal(); S.coo.v = 'A'; cooEnter(); S.signedIn = true; S.ui = {}; },
    teacher: () => { closeModal(); S.tas.v = 'T'; tasEnter(); S.signedIn = true; S.ui = {}; },
    assessor: () => { closeModal(); S.tas.v = 'S'; tasEnter(); S.signedIn = true; S.ui = {}; },
    fin: () => AS('FA'),
    aca: () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; },
    biz: () => { closeModal(); bizEnter('BA'); S.ui = {}; },
    iqa: () => { closeModal(); iqaEnter('QA'); S.ui = {}; },
    sys: () => AS('SY'),
    super: () => AS('A'),
  };
  const ALL = Object.keys(ID);
  // State snapshot without the logs (security events, audit rows and their persisted copies grow on a refusal by design)
  const LOGK = ['security', 'audit', 'seq', 'myNotifs', '_saNotifs'];
  const snap = () => J([STORE, ADMIN], (k, v) => (LOGK.includes(k) ? undefined : v));
  // Try to complete whatever dialog opened (fill reasons, tick the first choice, press the primary action up to four times)
  // (a wizard replaces its dialog on each step; any other dialog is done once its primary action didn't return false)
  const drive = () => { for (let k = 0; k < 4 && MODAL; k++) { $a('#modal-root textarea').forEach(t => { if (!t.value) t.value = 'MR-G1 matrix'; }); ['#bp-n', '#bm-s'].forEach(s => { const x = $1('#modal-root ' + s); if (x && !x.value) x.value = 'MR-G1 matrix'; }); $a('#modal-root .kr-n').forEach(c => { c.checked = true; }); const m0 = MODAL, r = prim(); if (MODAL === m0 && r !== false) break; if (!MODAL) break; } closeModal(); };
  // Deny-by-default matrix: every identity not in `allow` is refused before any dialog, changes nothing, and is logged
  // setup() (run as that identity, before the snapshot) prepares the record and returns what call() needs
  const matrix = (name, call, allow, denyOnly, setup) => {
    const res = {};
    ALL.filter(i => !allow.includes(i)).forEach(i => {
      ID[i](); const x = setup ? setup() : undefined; const s0 = snap(), c0 = sec(); let m = false, err = '';
      try { call(x); m = !!MODAL; drive(); } catch (e) { err = e.message; }
      const same = snap() === s0, logged = sec() > c0 && /^Blocked/.test(lastAud().action || '');
      res[i] = !m && same && logged && !err ? 'denied' : `LEAK(${m ? 'dialog ' : ''}${same ? '' : 'changed '}${logged ? '' : 'unlogged '}${err})`;
    });
    if (!denyOnly) allow.forEach(i => { ID[i](); const x = setup ? setup() : undefined; const s0 = snap(), c0 = sec(), a0 = ADMIN.audit.length; let m = false; try { call(x); m = !!MODAL; drive(); } catch (e) { res[i] = 'threw ' + e.message; return; } const nu = ADMIN.audit.slice(0, ADMIN.audit.length - a0), blk = nu.some(a => /^Blocked/.test(a.action)); res[i] = (m || snap() !== s0 || nu.length) && !blk ? 'allowed' : `REFUSED(m=${m} sec+${sec() - c0} ${(ADMIN.audit[0] || {}).action}: ${(ADMIN.audit[0] || {}).reason})`; });
    const bad = Object.entries(res).filter(([i, v]) => allow.includes(i) ? (!denyOnly && v !== 'allowed') : v !== 'denied');
    ok(`MR-G1 matrix ${name}: ${allow.join('/') || '—'} ${denyOnly ? '(item rules apply)' : 'allowed'}; every other role refused before a dialog, nothing changed, logged`, !bad.length, J(bad.length ? bad : res));
  };
  // Confirm-time re-check: open as an authorised role, leave the admin console, then confirm → refused, nothing changed, logged
  const reCheck = (name, open, setup) => {
    open(); if (setup) setup(); const m = !!MODAL; const s0 = snap(), c0 = sec(); S.portal = 'learner';
    let r; try { $a('#modal-root textarea').forEach(t => { if (!t.value) t.value = 'MR-G1 recheck'; }); r = prim(); } finally { S.portal = 'admin'; }
    ok(`MR-G1 re-check on confirm: ${name} (dialog opened by an authorised role, confirmed after leaving the admin console) is refused, nothing changed, logged`, m && r === false && snap() === s0 && sec() > c0, J({ m, r, same: snap() === s0 }));
    closeModal();
  };
  const cdLid = v => STORE.worlds[v].me.id;
  const probeEv = d => { const id = 'SE-G1-' + (ADMIN.security.length + 1) + '-' + Math.random().toString(36).slice(2, 6); ADMIN.security.unshift({ id, sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: d || 'MR-G1 probe event', reviewed: false }); return id; };
  const probeDsr = () => { const id = 'DSR-G1-' + (ADMIN.dsr.length + 1); ADMIN.dsr.unshift({ id, who: VNAME('CD3'), lid: cdLid('CD3'), v: 'CD3', at: now().toISOString(), type: 'Access', status: 'Open', loggedBy: 'MR-G1', note: 'test', decision: '' }); return id; };
  const grSel = v => { const g = $1('#gr'); if (g) g.remove(); document.body.insertAdjacentHTML('beforeend', `<select id="gr"><option>${v}</option></select>`); };

  /* ================= Client demo ================= */
  const b = cdBatch(), code = b.code;
  const ev = () => batchEvents(b).find(e => e.type === 'class') || batchEvents(b)[0];

  await T('MR-06 staff accounts', async () => {
    const ST = id => ADMIN.staff.find(s => s.id === id); // looked up each time (identity switches rebuild the admin records)
    matrix('staffSt (suspend Michael Osei)', () => ACT.staffSt({ dataset: { id: 'ST-017', a: 'Suspended' } }), ['super', 'sys'], false, () => { ST('ST-017').status = 'Active'; });
    matrix('staffReset (2FA, Finance Admin)', () => ACT.staffReset({ dataset: { id: 'ST-011', t: '2fa' } }), ['super', 'sys'], false, () => { ST('ST-011').tfa = 'Enabled'; });
    matrix('grantRole', () => ACT.grantRole({ dataset: { id: 'ST-017' } }), ['super', 'sys'], false, () => { grSel('IQA'); const s = ST('ST-017'); s.roles = s.roles.filter(r => r !== 'IQA'); });
    matrix('revokeRole', () => ACT.revokeRole({ dataset: { id: 'ST-017', r: 'IQA' } }), ['super', 'sys'], false, () => { const s = ST('ST-017'); if (!s.roles.includes('IQA')) s.roles.push('IQA'); });
    const g = $1('#gr'); if (g) g.remove();
    // original reproduction (B-02): a learner deactivated a Coordinator; a Coordinator reset the Finance Admin's 2FA
    fxLoadClient(); const st0 = ST('ST-017').status, a0 = ADMIN.audit.length;
    ID.learner(); ACT.staffSt({ dataset: { id: 'ST-017', a: 'Deactivated' } }); const m1 = !!MODAL; if (MODAL) reason('rogue');
    ID.coord(); const tf0 = ST('ST-011').tfa; ACT.staffReset({ dataset: { id: 'ST-011', t: '2fa' } });
    const acts = ADMIN.audit.slice(0, ADMIN.audit.length - a0).map(x => x.action);
    ok('MR-06 original reproduction: a learner cannot deactivate Michael Osei; a Coordinator cannot reset the Finance Admin’s 2FA (both refused and logged)', !m1 && ST('ST-017').status === st0 && ST('ST-011').tfa === tf0 && !acts.includes('Deactivated') && !acts.includes('2FA reset') && acts.filter(x => /^Blocked/.test(x)).length === 2, J([m1, ST('ST-017').status, acts]));
    ID.super(); ACT.staffSt({ dataset: { id: 'ST-017', a: 'Suspended' } }); reason('Leave'); const a1 = lastAud();
    ok('MR-06 positive: the Super Administrator suspends a staff account (audited under their name)', ST('ST-017').status === 'Suspended' && a1.actor === ADMIN.me.name, J([ST('ST-017').status, a1.actor, a1.action]));
    ID.sys(); ACT.staffSt({ dataset: { id: 'ST-017', a: 'Active' } }); reason('Back'); ok('MR-06 positive: a System Administrator reactivates it', ST('ST-017').status === 'Active', ST('ST-017').status);
    ID.sys(); ACT.staffReset({ dataset: { id: 'ST-011', t: '2fa' } }); ok('MR-06 positive: a System Administrator resets a 2FA', ST('ST-011').tfa === 'Not set up' && lastAud().action === '2FA reset', J([ST('ST-011').tfa, lastAud().action]));
    ID.super(); grSel('IQA'); ACT.grantRole({ dataset: { id: 'ST-017' } }); reason('Cover'); const g2 = $1('#gr'); if (g2) g2.remove(); ok('MR-06 positive: the Super Administrator grants a role', ST('ST-017').roles.includes('IQA'), J(ST('ST-017').roles));
    reCheck('staffSt', () => { ID.super(); ACT.staffSt({ dataset: { id: 'ST-017', a: 'Deactivated' } }); });
    ok('MR-06 … the account is still Active after the refused confirm', ST('ST-017').status === 'Active');
  });

  await T('MR-21 learner accounts (P-07 provisional)', async () => {
    const lid = cdLid('CD3');
    matrix('lAct deactivate', () => ACT.lAct({ dataset: { id: lid, a: 'deactivate' } }), ['super', 'sys']);
    matrix('lAct archive', () => ACT.lAct({ dataset: { id: lid, a: 'archive' } }), ['super', 'sys']);
    matrix('lAct password reset', () => ACT.lAct({ dataset: { id: lid, a: 'reset' } }), ['super', 'sys']);
    reCheck('lAct', () => { ID.sys(); ACT.lAct({ dataset: { id: lid, a: 'deactivate' } }); });
  });

  await T('MR-25 security events (P-07 provisional)', async () => {
    matrix('secReview', id => ACT.secReview({ dataset: { id } }), ['super', 'sys'], false, () => probeEv());
    ID.fin(); ACT.lAct({ dataset: { id: cdLid('CD3'), a: 'deactivate' } }); const own = ADMIN.security[0];
    ID.super(); ACT.secReview({ dataset: { id: own.id } }); ok('MR-25 positive: the Super Administrator reviews the Finance Admin\'s blocked attempt', own.reviewed === true && lastAud().action === 'Security event reviewed');
    ID.sys(); go('a-roles', { id: 'Super Administrator' }); const se = ADMIN.security.find(s => !s.reviewed && /Owen Price/.test(s.detail || '')) || ADMIN.security.find(s => s.id === probeEv('System Administrator Owen Price attempted: probe'));
    go('a-audit', { tab: 'security' }); const btn = $1(`main [data-act="secReview"][data-id="${se.id}"]`); const s0 = snap(); ACT.secReview({ dataset: { id: se.id } });
    ok('MR-25 original reproduction: a System Administrator can\'t review the event of their own blocked attempt (no button; direct call refused and logged)', !btn && !se.reviewed && snap() === s0 && lastAud().action === 'Blocked: review own security event', J([!!btn, se.reviewed, lastAud().action]));
  });

  await T('MR-45 data requests', async () => {
    matrix('dsrDone', id => ACT.dsrDone({ dataset: { id } }), ['super', 'sys'], false, () => probeDsr());
    matrix('dsrArchive', id => ACT.dsrArchive({ dataset: { id } }), ['super', 'sys'], false, () => probeDsr());
    matrix('dsrExport', id => ACT.dsrExport({ dataset: { id } }), ['super', 'sys'], false, () => probeDsr());
    matrix('decideDsr', id => ACT.decideDsr({ dataset: { id } }), ['super', 'sys'], false, () => probeDsr());
    const id = probeDsr(); ID.sys(); ACT.dsrDone({ dataset: { id } }); reason('Sent'); ok('MR-45 positive: a System Administrator completes a data request', ADMIN.dsr.find(d => d.id === id).status === 'Completed');
    reCheck('dsrDone', () => { ID.super(); ACT.dsrDone({ dataset: { id: probeDsr() } }); });
  });

  await T('MR-07 Edit class / session', async () => {
    const e = ev(), s0 = e.start;
    matrix('kEditEv', () => ACT.kEditEv({ dataset: { b: code, id: e.id } }), ['super', 'sys', 'aca']);
    const e2 = ev(), st = e2.start; ID.learner(); ACT.kEditEv({ dataset: { b: code, id: e2.id } }); const m = !!MODAL; closeModal();
    ok('MR-07 original reproduction: a learner gets no "Edit class / session" dialog and the session keeps its date and teacher', !m && ev().start === st, J([m, ev().start]));
    ID.aca(); const e3 = ev(), t3 = new Date(new Date(e3.start).getTime() + 864e5).toISOString().slice(0, 16); ACT.kEditEv({ dataset: { b: code, id: e3.id } }); $1('#ke-n').value = t3; $1('#ke-r').value = 'Room change'; let r = prim(); if (MODAL) r = prim(); closeModal();
    ok('MR-07 positive: the Academic Admin moves the session', ev().start.slice(0, 16) === t3, J([ev().start, t3, r]));
    reCheck('kEditEv', () => { ID.super(); ACT.kEditEv({ dataset: { b: code, id: ev().id } }); }, () => { $1('#ke-n').value = new Date(new Date(ev().start).getTime() + 864e5).toISOString().slice(0, 16); });
    ok('MR-07 … unchanged by the refused confirm', ev().start.slice(0, 16) === t3 || s0 === ev().start);
  });

  await T('MR-08 Create observation entry', async () => {
    matrix('newObs', () => ACT.newObs(), ['super', 'aca']);
    reCheck('newObs', () => { ID.aca(); ACT.newObs(); });
  });

  await T('MR-31 re-allocation wizard', async () => {
    matrix('kRealloc', () => ACT.kRealloc(), ['super', 'aca']);
    ID.aca(); ACT.kRealloc(); $a('#modal-root .kr-n').forEach(c => { c.checked = true; }); prim(); prim(); $1('#kr-r').value = 'Cover'; prim(); closeModal();
    const a = lastAud();
    ok('MR-31 the audit no longer claims "Learners re-allocated": it says what changed (removed from the caseload, or nothing moved)', /^(Learners removed from assessor caseload|Re-allocation recorded — nothing moved)$/.test(a.action) && a.actor === ADMIN.me.name, J([a.action, a.after, a.actor]));
    ID.teacher(); const c0 = sec(); ACT.kRealloc(); ok('MR-31 original reproduction: a Teacher gets no re-allocation wizard (refused, logged)', !MODAL && sec() > c0); closeModal();
    ID.aca(); ACT.kRealloc(); $a('#modal-root .kr-n').forEach(c => { c.checked = true; }); prim(); const s0 = snap(), k0 = sec(); S.portal = 'learner'; const r = prim(); S.portal = 'admin';
    ok('MR-G1 re-check on confirm: kRealloc (next step after leaving the admin console) is refused, nothing changed, logged', r === false && !MODAL && snap() === s0 && sec() > k0); closeModal();
    // Staff record → Re-allocate learners (ACT.realloc): the same caseload-only effect, so the same truthful preview, audit and message
    ID.super(); const from = ADMIN.staff.find(x => x.roles.includes('Assessor') && x.status === 'Active');
    ACT.realloc({ dataset: { id: from.id } }); const pv = (($1('#modal-root') || {}).textContent || '');
    ok('MR-31 staff-record re-allocation: the preview no longer promises that future marking moves to the new assessor', !/future marking moves/.test(pv) && /doesn't allocate them to the new assessor/.test(pv), pv.slice(0, 200));
    $1('#modal-root #ra-r').value = 'Cover'; const to = $1('#modal-root #ra-to').value, tq = []; const k1 = toast; toast = (m) => { tq.push(m); }; let rr; try { rr = prim(); } finally { toast = k1; } closeModal();
    const a2 = lastAud();
    ok('MR-31 staff-record re-allocation: the audit and message say what changed (removed from the caseload, or nothing moved) and name the manual step', /^(Learners removed from assessor caseload|Re-allocation recorded — nothing moved)$/.test(a2.action) && /Staff tab/.test(tq.join(' ')) && !/re-allocated to/.test(tq.join(' ')), J([rr, a2.action, a2.after, to, tq]));
  });

  await T('MR-41 admin queue decision dialog', async () => {
    const it = ADMIN.queue.find(i => isOpen(i)) || ADMIN.queue[0];
    matrix('qDo (approve ' + it.id + ')', () => ACT.qDo({ dataset: { id: it.id, a: 'approve' } }), ['fin', 'aca', 'biz', 'iqa', 'sys', 'super'], true);
    ID.learner(); ACT.qDo({ dataset: { id: it.id, a: 'approve' } }); const m = !!MODAL; closeModal();
    ok('MR-41 original reproduction: a learner gets no admin queue Approve dialog (' + it.id + ')', !m);
    ID.super(); ACT.qDo({ dataset: { id: it.id, a: 'note' } }); ok('MR-41 positive: the Super Administrator still opens the queue dialog', !!MODAL); closeModal();
  });

  await T('MR-37 demo controls', async () => {
    matrix('agyToggleVis', () => ACT.agyToggleVis(), ['agency', 'biz', 'super']);
    matrix('bSimLink', () => ACT.bSimLink(), ['biz', 'super']);
    matrix('bAdvance', () => ACT.bAdvance(), ['biz', 'super'], true);
    ID.agency(); ACT.agyToggleVis(); const a = lastAud();
    ok('MR-37 the agency demo control is audited under the agency, not the Super Administrator', a.action === 'Report visibility (demo control)' && a.role === 'Agency Administrator' && a.actor !== 'Nadia Qureshi', J([a.actor, a.role]));
  });

  await T('MR-37 Reset demo', async () => {
    ID.learner(); ACT.resetDemo(); closeModal();
    ok('MR-37 original reproduction: a direct Reset demo from the learner portal does not leave the caller signed in as the Super Administrator', !(S.signedIn && S.portal === 'admin' && isSA()), J([S.signedIn, S.portal, ADMIN.me && ADMIN.me.name]));
    ID.sys(); ACT.resetDemo(); closeModal(); ok('MR-37 … nor from the System Administrator', !(S.signedIn && isSA()));
    ID.super(); ACT.resetDemo(); closeModal(); ok('MR-37 positive: the Super Administrator resets and stays signed in', S.signedIn && isSA());
  });

  await T('MR-33 revoke a certificate once (client)', async () => {
    const lw = STORE.worlds.CD3; lw.certs.unshift({ id: 'g1c', course: 'Moving and Handling People', no: 'WEL-G1-1', issued: now().toISOString(), expires: null, status: 'Valid' });
    ID.super(); ACT.revokeCert({ dataset: { k: 'CD3:g1c' } }); reason('first'); const rev1 = lw.certs[0].revoked;
    const s0 = snap(); ACT.revokeCert({ dataset: { k: 'CD3:g1c' } }); const op = !!MODAL; if (MODAL) reason('second');
    ok('MR-33 original reproduction: a second revoke is refused (no dialog); the original reason and date are kept; the refusal is logged', lw.certs[0].status === 'Revoked' && !op && lw.certs[0].revoked === rev1 && snap() === s0 && lastAud().action === 'Blocked: revoke a revoked certificate', J([op, rev1, lw.certs[0].revoked, snap() === s0, lastAud().action]));
    lw.certs.shift();
  });

  /* ================= Legacy data: catalogue, messaging, agency certificates ================= */
  fxLoadLegacy(); LV = 'A';
  await T('MR-09 bundle catalogue', async () => {
    const P = id => STORE.biz.products.find(x => x.id === id);
    matrix('bPublish CAT-8', () => ACT.bPublish({ dataset: { id: 'CAT-8' } }), ['biz', 'super'], false, () => { P('CAT-8').status = 'Draft'; }); P('CAT-8').status = 'Draft';
    matrix('bRetire CAT-2', () => ACT.bRetire({ dataset: { id: 'CAT-2' } }), ['biz', 'super'], false, () => { P('CAT-2').status = 'Published'; }); P('CAT-2').status = 'Published';
    matrix('bDup CAT-1', () => ACT.bDup({ dataset: { id: 'CAT-1' } }), ['biz', 'super']);
    matrix('bSubmitFloor CAT-11', () => ACT.bSubmitFloor({ dataset: { id: 'CAT-11' } }), ['biz', 'super'], false, () => { const p = P('CAT-11'); p.status = 'Draft'; p.floor = null; });
    matrix('newBundle', () => ACT.newBundle(), ['biz', 'super']);
    // original reproduction (D-01)
    fxLoadLegacy(); ID.learner(); ACT.bPublish({ dataset: { id: 'CAT-8' } }); if (MODAL) reason('rogue'); ID.agency(); ACT.bRetire({ dataset: { id: 'CAT-6' } }); if (MODAL) reason('rogue');
    ok('MR-09 original reproduction: a learner can\'t publish CAT-8; an agency can\'t retire CAT-6', P('CAT-8').status === 'Draft' && P('CAT-6').status === 'Published', J([P('CAT-8').status, P('CAT-6').status]));
    ID.biz(); ACT.bPublish({ dataset: { id: 'CAT-8' } }); reason('Ready'); ok('MR-09 positive: the Business Admin publishes CAT-8', P('CAT-8').status === 'Published');
    const s0 = snap(); ACT.bPublish({ dataset: { id: 'CAT-8' } }); ok('MR-09 a published bundle can\'t be published again (the screen\'s own rule), nothing changed, logged', !MODAL && snap() === s0 && lastAud().action === 'Blocked: publish a bundle'); closeModal();
    const p11 = P('CAT-1'); const s1 = snap(); ACT.bSubmitFloor({ dataset: { id: 'CAT-1' } }); ok('MR-09 a bundle that isn\'t below the minimum price can\'t be submitted for a below-minimum approval', !MODAL && snap() === s1 && !!p11); closeModal();
    ID.super(); const n = STORE.biz.products.length; ACT.newBundle(); $1('#bp-n').value = 'MR-G1 bundle'; prim(); ok('MR-09 positive: the Super Administrator creates a draft bundle', STORE.biz.products.length === n + 1 && STORE.biz.products[n].status === 'Draft');
    ID.biz(); ACT.newBundle(); $1('#bp-n').value = 'MR-G1 rogue'; const s2 = snap(), c2 = sec(); S.portal = 'learner'; const r = prim(); S.portal = 'admin';
    ok('MR-G1 re-check on confirm: the bundle editor\'s save after leaving the admin console is refused, nothing changed, logged', r === false && snap() === s2 && sec() > c2); closeModal();
    reCheck('bRetire', () => { ID.biz(); ACT.bRetire({ dataset: { id: 'CAT-2' } }); });
  });

  await T('MR-20 Academy messaging', async () => {
    const th = ADMIN.threads.find(t => ADMIN.agencies.some(a => a.name === t.party) && t.status !== 'Closed'), id = th.id;
    const brep = v => { const x = $1('#brep'); if (x) x.remove(); document.body.insertAdjacentHTML('beforeend', `<textarea id="brep">${v}</textarea>`); };
    matrix('bReply', () => SUBMIT.bReply({ dataset: { id } }), ['biz', 'super'], false, () => brep('MR-G1 reply'));
    matrix('bThSt close', () => ACT.bThSt({ dataset: { id, s: 'Closed' } }), ['biz', 'super'], false, () => { th.status = 'Open'; }); th.status = 'Open';
    matrix('bNote', () => ACT.bNote({ dataset: { id } }), ['biz', 'super']);
    matrix('bFwd', () => ACT.bFwd({ dataset: { id } }), ['biz', 'super']);
    matrix('bNewMsg', () => ACT.bNewMsg(), ['biz', 'super']);
    const x = $1('#brep'); if (x) x.remove();
    ID.agency(); brep('spoof'); const n0 = th.msgs.length; SUBMIT.bReply({ dataset: { id } }); ID.fin(); ACT.bThSt({ dataset: { id, s: 'Closed' } }); ID.learner(); const t0 = ADMIN.threads.length; ACT.bNewMsg(); const lm = !!MODAL; closeModal();
    ok('MR-20 original reproduction: an agency can\'t post as the Academy; Finance can\'t close a Business thread; a learner can\'t send an Academy message', th.msgs.length === n0 && th.status === 'Open' && !lm && ADMIN.threads.length === t0, J([th.msgs.length - n0, th.status, lm]));
    ID.biz(); brep('Thanks — on it.'); SUBMIT.bReply({ dataset: { id } }); const last = th.msgs[th.msgs.length - 1];
    ok('MR-20 positive: the Business Admin replies, attributed to themselves', last[0] === ADMIN.me.name && last[2] === 'Thanks — on it.', J(last));
    const y = $1('#brep'); if (y) y.remove();
    reCheck('bNote', () => { ID.biz(); ACT.bNote({ dataset: { id } }); });
  });

  await T('MR-10 / MR-33 agency-sponsored certificate revocation', async () => {
    const c = STORE.agy.certs.find(x => !x.revoked), no = c.no;
    matrix('agRevokeAdm', () => ACT.agRevokeAdm({ dataset: { no } }), ['super'], false, () => { delete c.revoked; }); delete c.revoked;
    ID.agency(); ACT.agRevokeAdm({ dataset: { no } }); if (MODAL) reason('rogue'); ID.fin(); ACT.agRevokeAdm({ dataset: { no } }); if (MODAL) reason('rogue'); ID.aca(); ACT.agRevokeAdm({ dataset: { no } }); if (MODAL) reason('rogue');
    ok('MR-10 original reproduction: an agency, Finance and the Academic Admin can\'t revoke an agency-sponsored certificate', !c.revoked, String(c.revoked));
    ID.super(); ACT.agRevokeAdm({ dataset: { no } }); reason('Issued in error'); const rev = c.revoked;
    ok('MR-10 positive: the Super Administrator revokes it', /^Revoked on .*Issued in error/.test(rev || ''), rev);
    const s0 = snap(); ACT.agRevokeAdm({ dataset: { no } }); const m = !!MODAL; if (MODAL) reason('again');
    ok('MR-33 a second revoke is refused; reason and date kept; logged', !m && c.revoked === rev && snap() === s0 && lastAud().action === 'Blocked: revoke a revoked certificate', J([m, c.revoked]));
    delete c.revoked; reCheck('agRevokeAdm', () => { ID.super(); ACT.agRevokeAdm({ dataset: { no } }); });
    ok('MR-10 … not revoked by the refused confirm', !c.revoked);
  });

  await T('MR-G1 legacy positives: learner account, observation entry', async () => {
    const L = ADMIN.learners.find(l => l.acct === 'Active' && !l.v); ID.super(); ACT.lAct({ dataset: { id: L.id, a: 'deactivate' } }); reason('Left');
    ok('MR-21 positive: the Super Administrator deactivates a learner account', L.acct === 'Deactivated', L.acct);
    ID.sys(); ACT.lAct({ dataset: { id: L.id, a: 'reactivate' } }); reason('Back'); ok('MR-21 positive: a System Administrator reactivates it', L.acct === 'Active', L.acct);
    const w = STORE.worlds.C, n = w.observations.length; ID.aca(); ACT.newObs(); const sel = $1('#no-l'); if (sel) sel.value = 'C'; prim(); closeModal();
    ok('MR-08 positive: the Academic Admin creates a Proposed observation for a learner whose workplace granted permission', w.workplace.perm !== 'Granted' || (w.observations.length === n + 1 && w.observations[0].status === 'Proposed'), J([w.workplace.perm, w.observations.length - n]));
    ID.learner(); const n2 = w.observations.length; ACT.newObs(); const lm = !!MODAL; closeModal();
    ok('MR-08 original reproduction: a learner gets no "Create observation entry" dialog', !lm && w.observations.length === n2);
  });

  fxLoadClient(); signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
