(function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {};
  go('a-audit'); ACT.dtDP({ dataset: { t: 'audit', p: '7d' } }); const n = dtCompute(DT.audit).rows.length, all = DT.audit.rows.length;
  ACT.aExport({ dataset: { n: 'Audit log', f: 'CSV', tid: 'audit' } });
  ok('export-all offered when filtered', n < all && MODAL.actions.some(a => /Export all 15 rows instead|Export all \d+ rows instead/.test(a.label)), n + '/' + all + ' ' + MODAL.actions.map(a => a.label).join(' | '));
  const allA = MODAL.actions.find(a => /Export all/.test(a.label)); allA.fn(); closeModal(); ok('export all logged', /all \d+ rows \(no filters\)/.test(ADMIN.exportsLog[0].what), ADMIN.exportsLog[0].what);
  go('a-messages'); const word = ADMIN.threads[0].subject.split(' ').find(w => w.length > 4); INP.thQ({ dataset: { k: 'A' }, value: word });
  ok('search finds thread', document.querySelectorAll('.thread-item').length >= 1, word + ' → ' + document.querySelectorAll('.thread-item').length);
  ok('highlight in list', document.querySelectorAll('.thread-list mark').length >= 1);
  go('a-messages', { id: ADMIN.threads[0].id }); ok('open thread keeps highlight', document.querySelectorAll('mark').length >= 1);
  // Agency segregation spot-check (Agency B can't open Agency A thread) — unchanged behaviour
  agyEnter('AG-03', true); S.signedIn = true; const other = ADMIN.threads.find(t => t.party && t.party !== AGN() && ADMIN.agencies.some(a => a.name === t.party));
  if (other) { go('g-messages', { id: other.id }); ok('agency segregation still blocks other agency thread', /permission|don't have access|not available|couldn't find this record/i.test(document.querySelector('main').textContent), other.id); }
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
