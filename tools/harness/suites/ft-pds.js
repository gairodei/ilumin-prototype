// PDS — PD criterion choice on the legacy test data: historical PD records (the seeded learner's checklist, released PD answers without a
// stored choice) are not rewritten and still show as before; a live learner's referral refers only the chosen criteria; a recorded learner
// (no learner record) gets one checklist item per chosen criterion; the IQA PD-outcome record still lists the checklist. Real reload.
(async function () {
  const SS = window.sessionStorage, K = 'ft-pds.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), q = s => $1('main ' + s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const COO = v => { closeModal(); S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TCH = v => { closeModal(); S.tas.dirty = false; S.tas.v = v; tasEnter(); S.signedIn = true; };
  const aud = () => ADMIN.audit.length, since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  // mark every open answer: the first one "Added to PD" with the given choice, the others passed
  const markPd = (s, choose) => { const a = tasAsg(s), it = markable(a); it.forEach((x, n) => { ACT.mkRag({ dataset: { k: s.key, q: x.id, v: 'A' } }); INP.mkField({ dataset: { k: s.key, q: x.id, f: 'fb' }, value: 'PDS legacy' }); INP.mkExit({ dataset: { k: s.key, q: x.id }, value: n ? 'pass' : 'pd' }); });
    const q0 = it[0]; INP.mkField({ dataset: { k: s.key, q: q0.id, f: 'pdReason' }, value: 'PDS legacy referral' }); const c = choose(pdsOk(s, a, dft(s.key), q0)); c.forEach(code => INP.pdsPick({ checked: true, dataset: { k: s.key, q: q0.id, c: code } })); return { q0, c }; };

  if (PH === 0) {
    const hist = J(STORE.worlds.C.pd.items); let rowsBefore = {};
    await T('PDS-L1 historical records', async () => {
      COO('A'); const subs = mySubmissions(true).filter(s => s.live && s.L.v === 'C' && s.at && synthAsg(s).qs.some(x => x.state === 'pd'));
      subs.forEach(s => { rowsBefore[s.key] = J(co1PdRows(s.L, synthAsg(s), s.key).map(r => [r.crit, r.status, r.from])); });
      ok('PDS-L1 the seeded learner has released PD answers (no stored choice) and a PD checklist', subs.length > 0 && STORE.worlds.C.pd.items.length > 0, String(subs.length));
      ok('PDS-L1 released PD answers without a stored choice show their PD rows as before', subs.every(s => !synthAsg(s).qs.some(x => Array.isArray(x.pdCrit))) && subs.every(s => JSON.parse(rowsBefore[s.key]).length > 0));
    });
    await T('PDS-L2 live referral', async () => {
      let s = null; for (const v of ['A', 'S']) { TCH(v); s = tasSubs(true).find(x => x.live && x.toMark && markable(tasAsg(x)).length && pdsOk(x, tasAsg(x), dft(x.key), markable(tasAsg(x))[0]).length); if (s) break; }
      ok('PDS-L2 a live submission to mark exists', !!s); const w = STORE.worlds[s.L.v], n0 = w.pd.items.length, old = J(w.pd.items);
      const { q0, c } = markPd(s, l => l.slice(0, 1)); S.tas.dirty = false; go('t-mark', { id: s.key }); S.tas.qi = tasAsg(s).qs.findIndex(x => x.id === q0.id); render();
      ok('PDS-L2 the marking page offers the question\'s criteria for the PD', !!q(`.pds-pick[data-q="${q0.id}"]`), J([S.route, S.tas.qi, q0.id, q0.state, (dft(s.key).items[q0.id] || {}).exit, /Learner will NOT rework/.test(main()), /Exit for this item/.test(main()), main().slice(0, 140)]));
      ACT.mkRelease({ dataset: { k: s.key } }); press();
      const fresh = w.pd.items.slice(0, w.pd.items.length - n0);
      ok('PDS-L2 only the chosen criterion is referred; the earlier checklist items are unchanged', J(fresh.map(i => i.ref)) === J(c) && J(w.pd.items.slice(w.pd.items.length - n0)) === old, J(fresh));
      ok('PDS-L2 the seeded historical checklist is unchanged apart from the new item', s.L.v !== 'C' ? J(STORE.worlds.C.pd.items) === hist : J(STORE.worlds.C.pd.items.slice(fresh.length)) === hist);
      COO('A'); ok('PDS-L2 the historical PD rows on the Coordinator\'s review are unchanged', Object.keys(rowsBefore).every(k => { const s2 = mySubmissions(true).find(x => x.key === k); return J(co1PdRows(s2.L, synthAsg(s2), k).map(r => [r.crit, r.status, r.from])) === rowsBefore[k]; }));
    });
    await T('PDS-L3 recorded learner', async () => {
      let s = null; for (const v of ['A', 'S', 'J']) { try { TCH(v); } catch (e) { continue; } s = tasSubs(true).find(x => !x.live && x.toMark && markable(tasAsg(x)).length && !STORE.tas.rel[x.key]); if (s) break; }
      ok('PDS-L3 a recorded learner (no learner record) has a submission to mark', !!s); if (!s) return;
      const t0 = STORE.tas.pd.find(x => x.lid === s.L.lid), n0 = t0 ? t0.items.length : 0, { c } = markPd(s, l => l);
      ACT.mkRelease({ dataset: { k: s.key } }); press();
      const t = STORE.tas.pd.find(x => x.lid === s.L.lid), fresh = t ? t.items.slice(n0) : [];
      // a recorded learner's checklist holds one open item per criterion (CO-1: no learner record, entries keyed by criterion), so a criterion
      // already open isn't added again; each other chosen criterion gets one item
      const was = c.filter(code => t0 && t0.items.some(i => i[0] === code && i[3] === 'Open')), want = c.filter(code => !was.includes(code));
      ok('PDS-L3 one checklist item per chosen criterion not already open, none blank; an open one isn\'t duplicated', J(fresh.map(i => i[0])) === J(want) && fresh.every(i => i[0] && i[3] === 'Open') && want.every(code => (t.meta[code] || {}).aid === s.a.id) && c.every(code => t.items.filter(i => i[0] === code && i[3] === 'Open').length === 1), J([fresh, c, was]));
      ok('PDS-L3 the released marking records the choice', Object.values(STORE.tas.rel[s.key].items).some(x => x.exit === 'pd' && J(x.pdCrit) === J(c)), J(STORE.tas.rel[s.key].items));
      COO('A'); const cs = mySubmissions(true).find(x => x.key === s.key); if (cs) { go('c-sub', { id: s.key }); ok('PDS-L3 the Coordinator\'s PD panel lists the chosen criteria', c.every(code => !!q(`.co1-pd-row[data-crit="${code}"]`))); }
      else ok('PDS-L3 (the learner isn\'t in this Coordinator\'s batches)', true);
      SS.setItem(K + 's', J([s.key, s.L.lid, c]));
    });
    await T('PDS-L4 IQA', async () => {
      const r = recById('L-C-pd'); ok('PDS-L4 the IQA PD-outcome record of the seeded learner lists their PD checklist', !!r && J(r.crit) === J(STORE.worlds.C.pd.items.map(i => i.ref)));
      // the seeded record keeps its shape and id (no second record for the same learner) and still opens for the IQA, read-only
      iqaEnter('QA'); S.signedIn = true; const ids = allIqaRecords().filter(x => x.kind === 'pd' && x.lid === 'IA-L-18022').map(x => x.id); go('q-record', { id: 'L-C-pd' }); const t = main();
      ok('PDS-L4 the seeded PD outcome record is unchanged: one record, its PD outcomes listed, no marking action', J(ids) === J(['L-C-pd']) && !r.pdRows && /PD outcomes/.test(t) && STORE.worlds.C.pd.items.every(i => t.includes(i.ref)) && !document.querySelector('main [data-act^="mk"], main [data-act="pdOutcome"]'), J(ids));
    });
    signOutUI_(); return next(1);
  }
  if (PH === 1) {
    await T('PDS-L-R refresh', async () => {
      const [key, lid, c] = JSON.parse(SS.getItem(K + 's') || '[null,null,[]]');
      const t = lid && STORE.tas.pd.find(x => x.lid === lid);
      ok('PDS-L-R after a real reload the recorded learner\'s chosen PD items are kept', !key || (!!t && c.every(code => t.items.some(i => i[0] === code && i[3] === 'Open'))));
    });
  }
  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R'); SS.removeItem(K + 's');
  function signOutUI_() { closeModal(); }
})();
