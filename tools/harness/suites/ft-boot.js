// Boot check — runs before every other suite. Loading and Reset must build every portal store completely;
// one exception during set-up skips every later portal's data (phase3 regression, 10 Oct 2026).
(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const STORES = ['worlds', 'acct', 'aca', 'agy', 'biz', 'coo', 'fin', 'iqa', 'sys', 'tas', 'ver', 'wpc'];
  const WORLDS = ['A', 'B', 'C', 'D', 'E', 'F', 'H'];
  const check = when => {
    const missing = STORES.filter(k => !STORE[k]);
    ok(when + ': every portal store exists', !missing.length, missing.join());
    const w = WORLDS.filter(k => !(STORE.worlds && STORE.worlds[k]));
    ok(when + ': every learner world exists', !w.length, w.join());
    ok(when + ': admin data built', !!(typeof ADMIN !== 'undefined' && ADMIN && ADMIN.queue && ADMIN.queue.length && ADMIN.batches && ADMIN.batches.length));
    ok(when + ': key sub-stores', !!(STORE.coo && STORE.coo.threads && STORE.tas && STORE.tas.notifs && STORE.agy && STORE.agy.notifs && STORE.wpc && STORE.wpc.links && STORE.sys && STORE.sys.notifs));
    ok(when + ': teacher identities are plain data', Object.values(TAS_USERS).every(u => { const d = Object.getOwnPropertyDescriptor(u, 'batches'); return d && 'value' in d && d.writable && Array.isArray(u.batches); }));
  };
  check('After load');
  ok('After load: Tom Whitfield teaches Croydon Cohort 4', TAS_USERS.W && TAS_USERS.W.batches.length === 1, TAS_USERS.W && TAS_USERS.W.batches.join());
  let err = null; try { initStore(); } catch (e) { err = e; }
  ok('initStore() runs without throwing', !err, err && (err.message + ' ' + (err.stack || '').split('\n')[1]));
  err = null; try { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; ACT.resetDemo(); } catch (e) { err = e; }
  ok('Reset demo data runs without throwing', !err, err && (err.message + ' ' + (err.stack || '').split('\n')[1]));
  check('After Reset');
  ok('Tom Whitfield teaches Croydon Cohort 4', TAS_USERS.W && TAS_USERS.W.batches.length === 1, TAS_USERS.W && TAS_USERS.W.batches.join());
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
