// Point 2 — PD-2-09, client demo (FIXTURE=client): the on-demand PD record never applies to the client demo learners. Every NVQ learner
// has a PD record (portal w.pd, or a staff-side STORE.tas.pd record), checking every submission's criteria creates nothing and gives no
// mapping refusal, and the record helper is never called while the Assessors and Coordinators look at their submissions.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const COO = v => { closeModal(); S.coo.v = v; S.coo.batch = 'all'; S.coo.dirty = false; cooEnter(); S.ui = {}; };

  await T('N2RC client demo learners unaffected', async () => {
    closeModal(); ACT.resetDemo(); closeModal();
    const ws = Object.keys(STORE.worlds).map(v => STORE.worlds[v]).filter(w => w && w.me && (w.nvq || (w.flags && w.flags.nvq)));
    const ids = new Set(Object.keys(STORE.worlds).map(v => STORE.worlds[v] && STORE.worlds[v].me && STORE.worlds[v].me.id).filter(Boolean));
    const noRec = []; (ADMIN.batches || []).forEach(b => (b.coh || []).forEach(e => { if (e.lid && !ids.has(e.lid) && !STORE.tas.pd.some(x => x.lid === e.lid)) noRec.push(b.code + '/' + e.lid); }));
    ok('N2RC-1 every client NVQ learner has a PD record (portal or staff-side): the on-demand path can\'t apply', ws.every(w => w.pd && Array.isArray(w.pd.items)) && !noRec.length, J({ worlds: ws.length, noRec }));
    const pd0 = J(STORE.tas.pd), worlds0 = J(ws.map(w => w.pd)), n0 = Object.keys(STORE.worlds).length;
    let calls = 0; const keep = n2PdRecord; n2PdRecord = function () { calls++; return keep.apply(this, arguments); };
    const maps = [];
    try {
      Object.keys(TAS_USERS).forEach(k => { TCH(k); tasSubs(true).forEach(s => { if (s.L.short) return; const a = tasAsg(s); n2Crits(a).forEach(({ code }) => { const why = n2EligWhy(s, a, code); if (!s.live && n2MapWhy(s) && why === n2MapWhy(s)) maps.push(s.key); }); }); go('t-mark', { id: (tasSubs(true)[0] || {}).key }); });
      Object.keys(COO_USERS).forEach(c => { COO(c); mySubmissions(true).forEach(s => { const a = synthAsg(s); n2Crits(a).forEach(({ code }) => { const why = n2EligWhy(s, a, code); if (!s.live && n2MapWhy(s) && why === n2MapWhy(s)) maps.push(s.key); }); }); });
    } finally { n2PdRecord = keep; }
    ok('N2RC-2 checking every client submission\'s criteria creates no PD record, changes no learner\'s PD and gives no mapping refusal', calls === 0 && J(STORE.tas.pd) === pd0 && J(ws.map(w => w.pd)) === worlds0 && Object.keys(STORE.worlds).length === n0 && !maps.length, J({ calls, maps: maps.slice(0, 5) }));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
