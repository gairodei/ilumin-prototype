// Point 2 — "Add to PD" for a learner with staff-side records only (no learner portal record), full legacy test data. A queued
// submission of such a learner is marked Not Met and published by its allocated Assessor; the criterion is added to that learner's
// existing PD record (STORE.tas.pd) — no portal record is created; re-marking doesn't overwrite it or lock it; a learner without a
// PD record is refused safely; the PD assessor records the outcome.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'Point 2 legacy') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const st = (s, a, code) => n2State(s, a, code).st;

  await T('N2L staff-side learner records', async () => {
    fresh();
    // A queued submission of a learner without a portal record whose allocated Assessor can publish and who has a PD record
    let found = null;
    for (const k of Object.keys(TAS_USERS)) {
      TCH(k); if (CAN('mark') !== 'yes') continue;
      const s = tasSubs(true).find(x => !x.live && !x.L.short && !x.L.v && x.toMark && !ta1PubWhy(x.key) && STORE.tas.pd.some(t => t.lid === x.L.lid) && !r3Out(x.key));
      if (s) { found = { k, s }; break; }
    }
    ok('N2L-0 setup: a queued submission of a learner with staff-side records only (no portal record) and a PD record', !!found, found && J([found.k, found.s.key]));
    if (!found) return;
    const { k, s } = found, key = s.key, L = s.L, nw0 = Object.keys(STORE.worlds).length;
    TCH(k); go('t-mark', { id: key }); const asg = tasAsg(tasSubs(true).find(x => x.key === key)), tp = STORE.tas.pd.find(x => x.lid === L.lid), codes = markable(asg).flatMap(q => qCrits(q)), bad = codes.find(c => !tp.items.some(i => i[0] === c && i[3] === 'Open')); // a criterion of an answer being marked in this round, not already in the PD
    markable(asg).forEach(q => { const resub = qCrits(q).includes(bad); qCrits(q).forEach(c => ACT.mkMet({ dataset: c === q.crit ? { k: key, q: q.id, v: c === bad ? 'Not Met' : 'Met' } : { k: key, q: q.id, c, v: c === bad ? 'Not Met' : 'Met' } }));
      ACT.mkRag({ dataset: { k: key, q: q.id, v: resub ? 'R' : 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'Point 2 legacy feedback.' }); INP.mkExit({ dataset: { k: key, q: q.id }, value: resub ? 'resub' : 'pass' });
      if (resub) { INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'Point 2 legacy corrections.' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '7' }); } });
    ACT.mkRelease({ dataset: { k: key } }); press();
    const rel0 = J(STORE.tas.rel[key]);
    ok('N2L-1 published: the criterion is Action Required from the published marking (no portal record)', !!STORE.tas.rel[key] && st(s, asg, bad) === 'Action Required', J([st(s, asg, bad), key, bad]));
    const t = STORE.tas.pd.find(x => x.lid === L.lid), n0 = t.items.length;
    ACT.n2AddPd({ dataset: { k: key, c: bad } }); reason('Point 2 legacy: cover it in the PD');
    const item = t.items.find(i => i[0] === bad && i[3] === 'Open'), meta = t.meta && t.meta[bad];
    ok('N2L-2 the criterion is added to that learner\'s existing PD record (one open item, who / when / role kept)', t.items.length === n0 + 1 && !!item && !!meta && meta.init && meta.init.role === 'Assessor' && meta.by === TME().name);
    ok('N2L-3 the learner\'s criterion shows Added to PD; the published marking record is unchanged; no portal record was created', st(s, asg, bad) === 'Added to PD' && J(STORE.tas.rel[key]) === rel0 && Object.keys(STORE.worlds).length === nw0 && !L.v);
    const r2 = ACT.n2AddPd({ dataset: { k: key, c: bad } }); closeModal(); ok('N2L-4 a second Add to PD is refused', r2 === false && t.items.length === n0 + 1);
    // Re-marking (Met, verified) doesn't lock or replace it
    STORE.tas.marked && delete STORE.tas.marked[key];
    const d = { items: {}, overall: 'Point 2 legacy re-mark.' }; markable(asg).forEach(q => { d.items[q.id] = { met: 'Met', verified: true, vby: TME().name, vat: now().toISOString(), exit: 'pass', rag: 'G', fb: 'Point 2 legacy re-mark.' }; });
    releaseFeedback(s, asg, d);
    ok('N2L-5 published re-marking with a verified Met doesn\'t lock or replace a criterion pending PD', !STORE.tas.locks[L.lid + '|' + bad] && st(s, asg, bad) === 'Added to PD' && item[3] === 'Open');
    // A learner with no PD record (PD-2-09 supersedes PD-2-07's refusal): checking eligibility creates nothing and the missing record is
    // no longer a reason to refuse — the record is created only when an authorised Add to PD is confirmed (ft-n2r)
    const other = tasSubs(true).find(x => !x.live && !x.L.short && !x.L.v && !STORE.tas.pd.some(z => z.lid === x.L.lid));
    if (other) { const why = n2EligWhy(other, tasAsg(other), n2Crits(tasAsg(other))[0].code); ok('N2L-6 (PD-2-09) a learner without a PD record isn\'t refused for the missing record; checking eligibility creates nothing', why !== 'This learner has no Professional Discussion record.' && !STORE.tas.pd.some(z => z.lid === other.L.lid), why); }
    else ok('N2L-6 (every recorded learner in this data has a PD record)', true);
    // The PD assessor records Met → Achieved (locked by them)
    const pdName = chEff(L.lid, 'pd', L.batch), pk = Object.keys(TAS_USERS).find(x => TAS_USERS[x].name === pdName);
    if (pk) { TCH(pk); ACT.pdOutcome({ dataset: { l: L.lid } }); const open = (pdOf(L.lid) || { items: [] }).items.filter(i => i[3] === 'Open'), ix = open.findIndex(i => i[0] === bad);
      const rd = $1(`#modal-root input[name="pdo-${ix}"][value="Met"]`); if (rd) rd.checked = true; open.forEach((i, j) => { if (j !== ix) { const x = $1(`#modal-root input[name="pdo-${j}"][value="Not Met"]`); if (x) x.checked = true; } }); const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
      ok('N2L-7 the PD assessor records Met: the criterion is Achieved for the staff-side record', item[3] !== 'Open' && st(s, asg, bad) === 'Achieved', J([item[3], st(s, asg, bad), pdName])); }
    else ok('N2L-7 (no PD assessor account for this learner in the data)', true, pdName);
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
