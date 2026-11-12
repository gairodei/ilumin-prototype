// CBR — the saved client demo across the builder's added store (6 Nov 2026; PD-CBR-13). Run with FIXTURE=client (real page reloads).
// Phase 0: changes saved in the browser. Phase 1: a refresh restores them; then a copy exactly as the previous build saved it (the same
// encoding, without STORE.cbr, signed with that build's store names) is put in its place. Phase 2: the upgrade restores it — learner,
// finance, admission, course and assessment records unchanged — and the added store starts empty; then an incompatible copy. Phase 3:
// that copy is still discarded as before; Reset demo removes the saved copy. Phase 4: after Reset and a refresh, the starting demo.
(async function () {
  const SS = window.sessionStorage, K = 'ft-cbr-save.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const ls = window.localStorage, saved = () => { try { return JSON.parse(ls.getItem(FCP_KEY) || 'null'); } catch (e) { return null; } };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  // The records a saved demo carries for learners, finance, admissions, courses and assessments
  const recs = () => J({ w: Object.keys(STORE.worlds).sort().map(v => { const w = STORE.worlds[v]; return [v, w.signup || null, w.plans || null, w.enrolments || null, (w.assignments || []).map(a => [a.id, a.status, a.qs && a.qs.map(q => q.rounds && q.rounds.length)]), w.admission || null, w.docs || null]; }),
    q: ADMIN.queue.map(i => [i.id, i.status]), b: ADMIN.batches.map(b => [b.code, b.enrolled, b.status]), p: ADMIN.programmes.map(p => [p.id, p.status, p.version]), s2: (STORE.s2Defs || []).map(d => [d.id, d.status, d.qs.length]), tx: allTx().map(t => [t.ref, t.amount, t.status]) });

  if (PH === 0) {
    await T('CBR-S0 changes saved in the browser', async () => {
      SA(); logA('Test', 'CBR save probe', 'Probe before refresh', '—', 'saved', 'ft-cbr-save');
      const pr = cbPr('NV-N1'), r = S4B().res.find(x => x.pid === 'NV-N1' && x.status === 'Published'); cbrAtts('NV-N1').push({ id: 'RA-T1', rid: r.id, lvl: 'prog', unit: null, mod: null, status: 'Active', at: now().toISOString(), by: 'test' });
      render(); fcpSave(); const o = saved();
      ok('CBR-S0 the client demo saves its changes, the builder store included', !!o && o.fx === 'client' && o.sig === FCP.sig && /RA-T1/.test(o.data) && !!pr, FCP.st + ' ' + (FCP.why || ''));
      SS.setItem(K + 'recs', recs());
    });
    return next(1);
  }
  if (PH === 1) {
    await T('CBR-S1 refresh', async () => {
      ok('CBR-S1 a refresh restores the saved demo with the builder records', !!FCP.restored && ADMIN.audit.some(a => a.action === 'Probe before refresh') && cbrAtts('NV-N1').some(a => a.id === 'RA-T1') && !FCP.upgraded);
      ok('CBR-S1 …and every learner, finance, admission, course and assessment record as saved', recs() === SS.getItem(K + 'recs'));
      // The copy the previous build would have saved: no STORE.cbr, signed with that build's store names
      logA('Test', 'CBR save probe', 'Probe from the previous build', '—', 'saved', 'ft-cbr-save');
      const roots = fcpRoots(), keep = STORE.cbr; delete STORE.cbr; let data; try { data = J(fcpEncode(roots)); } finally { STORE.cbr = keep; }
      const old = { v: FCP_V, fx: 'client', sig: cbrSigWithout(['cbr']), at: now().toISOString(), clock: now().getTime() - NOW.getTime(), data };
      ok('CBR-S1 (setup) the previous build\'s copy has no builder store and a different signature from this build', !/"cbr"/.test(data) && old.sig !== FCP.sig);
      FCP.busy = true; ls.setItem(FCP_KEY, J(old)); SS.setItem(K + 'recs', recs());
    });
    return next(2);
  }
  if (PH === 2) {
    await T('CBR-S2 upgrade from the previous build', async () => {
      ok('CBR-S2 the previous build\'s copy is restored, not discarded', !!FCP.restored && ADMIN.audit.some(a => a.action === 'Probe from the previous build') && J(FCP.upgraded) === J(['cbr']));
      ok('CBR-S2 …every learner, finance, admission, course and assessment record unchanged', recs() === SS.getItem(K + 'recs'));
      ok('CBR-S2 …the added builder store starts empty (nothing invented)', !!STORE.cbr && !cbrAtts('NV-N1').length && !Object.keys(CBR().cfg).length);
      ok('CBR-S2 …and is saved under this build\'s signature from now on', saved() && saved().sig === FCP.sig);
      SA(); go('a-programmes', { id: 'NV-N1', tab: 'details' }); ok('CBR-S2 the builder works on the upgraded demo', /Learner Types/.test(document.querySelector('main').textContent) /* CBR-2 */);
      FCP.busy = true; const o = saved(); o.sig = '1:incompatible'; ls.setItem(FCP_KEY, J(o));
    });
    return next(3);
  }
  if (PH === 3) {
    await T('CBR-S3 an incompatible copy and Reset demo', async () => {
      ok('CBR-S3 a copy from an incompatible build is still discarded as before (starting demo, said so)', !FCP.restored && !ADMIN.audit.some(a => a.action === 'Probe from the previous build') && !saved());
      SA(); logA('Test', 'CBR save probe', 'Probe before Reset', '—', 'saved', 'ft-cbr-save'); render(); fcpSave();
      ok('CBR-S3 (setup) a new change is saved', !!saved());
      ACT.resetDemo(); closeModal();
      ok('CBR-S3 Reset demo deletes the saved copy and loads the starting demo', !saved() && !ADMIN.audit.some(a => a.action === 'Probe before Reset'));
    });
    return next(4);
  }
  await T('CBR-S4 after Reset and a refresh', async () => {
    ok('CBR-S4 the starting demo loads (nothing restored, the builder store empty)', !FCP.restored && !ADMIN.audit.some(a => /^Probe/.test(a.action)) && !cbrAtts('NV-N1').length);
  });
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  [K + 'phase', K + 'R', K + 'recs'].forEach(k => SS.removeItem(k));
})();
