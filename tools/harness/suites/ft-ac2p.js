// AC-2P — admission decisions and audit attribution across real browser refreshes (1 Nov 2026; PD-AC2-*). FIXTURE=client.
// The page reloads between phases (location.reload, same throw-away browser profile), as ft-fcp.js does: the decisions, the
// documents and the audit rows (with their actors) come back identical; a decided application stays decided; Reset demo restores
// the starting records.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'AC-2P test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const code2fa = () => { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) code2fa(); S.ui = {}; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const TK = 'ft-ac2p-test', st = JSON.parse(window.localStorage.getItem(TK) || '{"ph":1,"R":[]}'); R.push(...st.R);
  const next = (ph, extra = {}) => { window.localStorage.setItem(TK, J({ ...st, ...extra, ph, R })); setTimeout(() => location.reload(), 30); };
  const wT = () => STORE.worlds.CD5, wS = () => STORE.worlds.CD4;
  const recs = () => J({ t: [wT().admission.status, wT().admission.history.map(h => h[0]), wT().docs.map(d => [d.id, d.status, d.versions.length])], s: [wS().admission.status, wS().docs.map(d => [d.id, d.status])], n: [wT().notifs.length, wS().notifs.length] });
  const rows = () => ADMIN.audit.filter(a => /Tom Transfer|Sam Deposit|APP-CD[45]/.test(a.entity)).map(a => [a.id, a.actor, a.role, a.action, a.before]);

  if (st.ph === 1) {
    await T('AC2P-1 decisions before the refresh', async () => {
      ok('AC2P-1 a fresh start: Tom and Sam awaiting review, nothing saved', wT().admission.status === 'Awaiting review' && wS().admission.status === 'Awaiting review' && !window.localStorage.getItem(FCP_KEY));
      pick('nvq-dep'); ACT.approveAllDocs(); ACT.approveAdmission(); // Sam's own shortcut: refused, logged as Sam
      pick('aca'); go('a-admissions', { id: 'APP-CD5' }); wT().docs.filter(d => d.mand).forEach(d => { go('a-admissions', { id: 'APP-CD5' }); click($1(`main [data-act="docDec"][data-a="APP-CD5"][data-d="${d.id}"][data-s="Approved"]`)); });
      go('a-admissions', { id: 'APP-CD5' }); click($1('main [data-act="appApprove"]')); reason('Documents checked (AC-2P)'); render();
      const r = rows(), me = ADMIN.me.name;
      ok('AC2P-1 Tom approved by the Academic Admin; Sam\'s refusals and Tom\'s decisions are in the audit naming who acted', wT().admission.status === 'Approved' && r.some(x => x[1] === me && x[3] === 'Admission approved') && r.filter(x => /^Blocked/.test(x[3])).every(x => x[1] === chFullName(wS()) && x[2] === 'Learner') && r.filter(x => /^Blocked/.test(x[3])).length === 2, J(r.map(x => [x[1], x[3]])));
      ok('AC2P-1 the change is saved in this browser', !!window.localStorage.getItem(FCP_KEY));
      next(2, { recs: recs(), rows: r, me });
    });
    return;
  }
  if (st.ph === 2) {
    await T('AC2P-2 after the refresh', async () => {
      ok('AC2P-2 the saved demo was restored', !!FCP.restored);
      ok('AC2P-2 admissions, documents and notices come back identical', recs() === st.recs, recs().slice(0, 200) + ' ≠ ' + String(st.recs).slice(0, 200));
      ok('AC2P-2 the audit entries come back identical: same IDs, actors, roles, actions; none duplicated', J(rows()) === J(st.rows) && new Set(rows().map(x => x[0])).size === rows().length, J(rows()).slice(0, 300));
      pick('aca'); const a0 = ADMIN.audit.length, n0 = wT().notifs.length;
      ['appApprove', 'appReject', 'appWithdraw'].forEach(n => { ACT[n]({ dataset: { id: 'APP-CD5' } }); if (MODAL) reason('after refresh'); });
      ACT.docDec({ dataset: { a: 'APP-CD5', d: wT().docs.find(d => d.mand).id, s: 'Rejected' } }); if (MODAL) reason('after refresh');
      const add = ADMIN.audit.slice(0, ADMIN.audit.length - a0);
      ok('AC2P-2 after the refresh the decided application and documents are still refused a second decision (no success entry, no notice)', wT().admission.status === 'Approved' && wT().docs.filter(d => d.mand).every(d => d.status === 'Approved') && add.length === 4 && add.every(a => /^Blocked/.test(a.action) && a.actor === ADMIN.me.name) && wT().notifs.length === n0, J(add.map(a => [a.actor, a.action])));
      pick('nvq-dep'); ACT.approveAdmission(); ok('AC2P-2 Sam\'s shortcut is still refused after the refresh', wS().admission.status === 'Awaiting review' && ADMIN.audit[0].actor === chFullName(wS()));
      ACT.resetDemo(); ok('AC2P-2 Reset demo deletes the saved copy', !window.localStorage.getItem(FCP_KEY));
      next(3);
    });
    return;
  }
  await T('AC2P-3 refresh after Reset demo', async () => {
    ok('AC2P-3 the starting demo: Tom and Sam awaiting review with their mandatory documents submitted; no AC-2P decisions or refusals', [wT(), wS()].every(w => w.admission.status === 'Awaiting review' && w.docs.filter(d => d.mand).every(d => d.status === 'Submitted')) && !ADMIN.audit.some(a => /AC-2P|after refresh/.test(a.reason || '') || /^Blocked: approve/.test(a.action)) && !FCP.restored);
    ok('AC2P-3 Amira and Dev keep their admissions', ['CD1', 'CD2'].every(v => STORE.worlds[v].admission.status === 'Approved'));
  });
  window.localStorage.removeItem(TK);
  signOutUI();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
