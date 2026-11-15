// Point 2 — PD-2-09: "Add to PD" for a learner with staff-side records only and no PD record yet, full legacy test data. The marking-time
// PD routes (CO-1 / CMA) create that learner's STORE.tas.pd record when a criterion first goes to the PD; Add to PD now does the same,
// on confirmation only, for an authorised actor, an eligible Not Met criterion and an unambiguous learner / enrolment / programme.
// Covers: eligibility, creation by the Assessor and by the designated Coordinator, reuse, several criteria, duplicates, ambiguous and
// missing mappings, unauthorised actors, Met criteria, later marking, the PD assessor's process, records unchanged, the 55 legacy
// learners, and learner access rules unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'PD-2-09 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const COO = v => { closeModal(); S.coo.v = v; S.coo.batch = 'all'; S.coo.dirty = false; cooEnter(); S.ui = {}; };
  const LRN = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); S.signedIn = true; S.ui = {}; };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const recs = lid => STORE.tas.pd.filter(x => x.lid === lid);
  const aud = re => ADMIN.audit.filter(x => re.test(x.action)).length;
  const OLD = 'This learner has no Professional Discussion record.';
  const allCoordSubs = () => { const seen = {}; Object.keys(COO_USERS).forEach(c => { COO(c); mySubmissions(true).forEach(s => { if (!seen[s.key]) seen[s.key] = s; }); }); return Object.values(seen); };
  const allSubs = () => { const seen = {}; Object.keys(TAS_USERS).forEach(k => { TCH(k); tasSubs(true).forEach(s => { if (!seen[s.key]) seen[s.key] = s; }); }); return Object.values(seen); };

  // A queued submission of a learner with staff-side records only and NO PD record, publishable by its allocated Assessor; two criteria
  // are marked Not Met (resubmission), the rest Met, and published
  // Criteria of the answers being marked that aren't already Achieved / locked (they can become Action Required)
  const open = x => { const a = tasAsg(x); return [...new Set(markable(a).flatMap(q => qCrits(q)))].filter(c => !STORE.tas.locks[x.L.lid + '|' + c] && n2State(x, a, c).st !== 'Achieved'); };
  const setup = () => {
    fresh(); let found = null;
    for (const k of Object.keys(TAS_USERS)) {
      TCH(k); if (CAN('mark') !== 'yes') continue;
      const s = tasSubs(true).find(x => !x.live && !x.L.short && !x.L.v && x.toMark && !ta1PubWhy(x.key) && !recs(x.L.lid).length && !r3Out(x.key) && !n2MapWhy(x) && open(x).length >= 2);
      if (s) { found = { k, s }; break; }
    }
    if (!found) return null;
    const { k, s } = found, key = s.key; TCH(k); go('t-mark', { id: key });
    const asg = tasAsg(tasSubs(true).find(x => x.key === key)), codes = [...new Set(markable(asg).flatMap(q => qCrits(q)))], bads = open(s).slice(0, 2), met = codes.find(c => !bads.includes(c));
    markable(asg).forEach(q => { const resub = qCrits(q).some(c => bads.includes(c));
      qCrits(q).forEach(c => ACT.mkMet({ dataset: c === q.crit ? { k: key, q: q.id, v: bads.includes(c) ? 'Not Met' : 'Met' } : { k: key, q: q.id, c, v: bads.includes(c) ? 'Not Met' : 'Met' } }));
      ACT.mkRag({ dataset: { k: key, q: q.id, v: resub ? 'R' : 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'PD-2-09 feedback.' }); INP.mkExit({ dataset: { k: key, q: q.id }, value: resub ? 'resub' : 'pass' });
      if (resub) { INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'PD-2-09 corrections.' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '7' }); } });
    ACT.mkRelease({ dataset: { k: key } }); press();
    const sub = () => { TCH(k); return tasSubs(true).find(x => x.key === key); };
    return { k, key, L: s.L, asg, bads, met, sub };
  };
  const st = (o, code) => n2State(o.sub(), o.asg, code).st;
  // The learner's designated Coordinator with R3 rights on this submission
  const coordFor = (L, key) => Object.keys(COO_USERS).find(c => { COO(c); return mcOf(L.lid, L.batch) === CME().name && !r3CooWhy(key); });
  const lockSnap = () => J(['A', 'B', 'C', 'D', 'E', 'F', 'H'].filter(v => STORE.worlds[v]).map(v => { LRN(v); return ['assignments', 'assignment', 'progress', 'observations', 'resources', 'payments'].map(r => { const k = S.params; S.params = {}; try { return J(lockFor(r)); } finally { S.params = k; } }); }));

  await T('N2R-A the Assessor creates the record; the Coordinator reuses it', async () => {
    const lock0 = lockSnap();
    const o = setup(); ok('N2R-0 setup: a staff-side learner with no PD record, published marking with two criteria Not Met', !!o && o.bads.length === 2 && o.bads.every(c => st(o, c) === 'Action Required') && !recs(o.L.lid).length, o && J([o.key, o.bads, o.bads.map(c => st(o, c))]));
    if (!o) return;
    const { k, key, L, asg, bads: [b1, b2], met } = o, nW = Object.keys(STORE.worlds).length;
    const rel0 = J(STORE.tas.rel), locks0 = J(STORE.tas.locks), fb0 = J(STORE.coo.fb), judg0 = J(r3Judg(key)), others0 = J(STORE.tas.pd.filter(x => x.lid !== L.lid)), asgs0 = J(Object.keys(STORE.worlds).map(v => (STORE.worlds[v].assignments || []).map(a => [a.id, a.status, (a.qs || []).map(q => [(q.rounds || []).length, (q.fb || []).length])])));
    ok('N2R-1 eligible: the learner has no PD record and the Not Met criterion may be added (no "no PD record" refusal)', n2EligWhy(o.sub(), asg, b1) === '' && !recs(L.lid).length);
    TCH(k); go('t-mark', { id: key }); ok('N2R-1b the marking view offers Add to PD for it', !!$1(`main [data-act="n2AddPd"][data-c="${b1}"]`));
    // Unauthorised staff, the learner portal and an agency can't create the record
    const x0 = aud(/Blocked: add criterion to PD/), refused = [];
    Object.keys(TAS_USERS).filter(u => u !== k && TAS_USERS[u].name !== TAS_USERS[k].name).forEach(u => { TCH(u); const r = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); const m = !!MODAL; closeModal(); refused.push([u, r === false && !m]); });
    const cAll = Object.keys(COO_USERS), cMine = cAll.filter(c => { COO(c); return mcOf(L.lid, L.batch) === CME().name; });
    cAll.filter(c => !cMine.includes(c) && COO_USERS[c].name !== (cMine[0] && COO_USERS[cMine[0]].name)).forEach(c => { COO(c); const r = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); const m = !!MODAL; closeModal(); refused.push(['coord ' + c, r === false && !m]); });
    LRN('C'); refused.push(['learner', ACT.n2AddPd({ dataset: { k: key, c: b1 } }) === false]); closeModal();
    AGY('AG-01'); refused.push(['agency', ACT.n2AddPd({ dataset: { k: key, c: b1 } }) === false]); closeModal();
    ok('N2R-9 other Assessors, Teachers, other Coordinators, a learner and an agency are refused; no record is created; each refusal logged', refused.every(x => x[1]) && !recs(L.lid).length && aud(/Blocked: add criterion to PD/) >= x0 + refused.length, J(refused));
    // A crafted call can't create an arbitrary record
    TCH(k); const rX = ACT.n2AddPd({ dataset: { k: 'IA-L-99999~a1', c: b1 } }); closeModal(); const rY = ACT.n2AddPd({ dataset: { k: key, c: '999 9.9' } }); closeModal();
    ok('N2R-9b a crafted key or an unmapped criterion is refused; no record for anyone', rX === false && rY === false && !recs('IA-L-99999').length && !recs(L.lid).length);
    // Opening the dialog and cancelling, or an empty reason, creates nothing
    ACT.n2AddPd({ dataset: { k: key, c: b1 } }); closeModal(); const c1 = recs(L.lid).length;
    ACT.n2AddPd({ dataset: { k: key, c: b1 } }); const e1 = reason(''); closeModal();
    ok('N2R-6a cancelling, or confirming without a reason, creates no record', c1 === 0 && e1 === false && !recs(L.lid).length);
    // The allocated Assessor confirms
    const pc0 = aud(/^PD record created$/);
    ACT.n2AddPd({ dataset: { k: key, c: b1 } }); reason('PD-2-09: discuss safeguarding duties');
    const t = recs(L.lid)[0], it = t && t.items.find(i => i[0] === b1), m = t && t.meta && t.meta[b1];
    ok('N2R-2 the Assessor creates exactly one PD record in the established shape, with only that criterion', recs(L.lid).length === 1 && t.name === L.name && t.session === null && J(t.history) === '[]' && t.items.length === 1 && !!it && it[3] === 'Open' && it[2] === 'PD-2-09: discuss safeguarding duties' && /Q\d/.test(it[1]), J(t));
    ok('N2R-2b reason, actor, role, time and the assignment / question are recorded', !!m && m.init && m.init.role === 'Assessor' && m.by === TME().name && m.init.by === TME().name && !!m.at && m.aid === asg.id && m.init.aid === asg.id && m.init.key === key && /Q\d/.test(m.init.from) && Object.isFrozen(m.init));
    ok('N2R-2c audited: "PD record created" once and "Criterion added to PD"', aud(/^PD record created$/) === pc0 + 1 && aud(/^Criterion added to PD$/) >= 1);
    ok('N2R-2d the criterion is Added to PD; the other Not Met criterion is unchanged; nothing verified, no session scheduled, no portal record', st(o, b1) === 'Added to PD' && st(o, b2) === 'Action Required' && !STORE.tas.locks[L.lid + '|' + b1] && t.session === null && Object.keys(STORE.worlds).length === nW);
    const r2 = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); closeModal();
    ok('N2R-6 a second Add to PD for the same criterion is refused: one record, one item', r2 === false && recs(L.lid).length === 1 && t.items.length === 1);
    if (met) { const rm = ACT.n2AddPd({ dataset: { k: key, c: met } }); closeModal(); ok('N2R-10 a Met criterion is refused and unchanged', rm === false && st(o, met) !== 'Added to PD' && !t.items.some(i => i[0] === met), J([met, st(o, met)])); }
    // The designated Coordinator adds the second criterion to the same record
    const cm = coordFor(L, key);
    if (cm) { COO(cm); const sc = mySubmissions(true).find(x => x.key === key); ACT.n2AddPd({ dataset: { k: key, c: b2 } }); reason('PD-2-09: coordinator adds the second criterion');
      ok('N2R-4 / N2R-5 the designated Coordinator\'s criterion goes into the existing record: one record, two items, role recorded', !!sc && recs(L.lid).length === 1 && t.items.length === 2 && t.items[1][0] === b2 && t.meta[b2].init.role === 'Academic Coordinator' && aud(/^PD record created$/) === pc0 + 1, J({ sc: !!sc, n: recs(L.lid).length, it: t.items.map(i => i[0]) })); }
    else ok('N2R-4 / N2R-5 (no designated Coordinator account for this learner) — the second criterion by the Assessor reuses the record', (() => { TCH(k); ACT.n2AddPd({ dataset: { k: key, c: b2 } }); reason('PD-2-09 second'); return recs(L.lid).length === 1 && t.items.length === 2; })());
    ok('N2R-13 earlier records unchanged: published marking, judgements, locks, Coordinator feedback, other PD records, every learner\'s assignments', J(STORE.tas.rel) === rel0 && J(r3Judg(key)) === judg0 && J(STORE.tas.locks) === locks0 && J(STORE.coo.fb) === fb0 && J(STORE.tas.pd.filter(x => x.lid !== L.lid)) === others0 && J(Object.keys(STORE.worlds).map(v => (STORE.worlds[v].assignments || []).map(a => [a.id, a.status, (a.qs || []).map(q => [(q.rounds || []).length, (q.fb || []).length])]))) === asgs0);
    // Later marking keeps the PD routing
    TCH(k); STORE.tas.marked && delete STORE.tas.marked[key];
    const d = { items: {}, overall: 'PD-2-09 re-mark.' }; markable(asg).forEach(q => { d.items[q.id] = { met: 'Met', verified: true, vby: TME().name, vat: now().toISOString(), exit: 'pass', rag: 'G', fb: 'PD-2-09 re-mark.' }; });
    releaseFeedback(o.sub(), asg, d);
    ok('N2R-11 later published marking (Met, verified) doesn\'t lock or replace either PD criterion', [b1, b2].every(c => !STORE.tas.locks[L.lid + '|' + c] && st(o, c) === 'Added to PD') && t.items.every(i => i[3] === 'Open'));
    // The allocated PD assessor runs the existing process: listed, proposes, records outcomes
    const pdName = chEff(L.lid, 'pd', L.batch), pk = Object.keys(TAS_USERS).find(x => TAS_USERS[x].name === pdName);
    if (pk) {
      TCH(pk); go('t-pd'); ok('N2R-12a the PD assessor\'s Professional Discussions list the new record (no session yet)', !!pdOf(L.lid) && /No session/.test(($1('main') || document.body).textContent));
      ACT.pdPropose({ dataset: { l: L.lid } }); const send = MODAL && MODAL.actions.find(a => a.label === 'Send proposal'); if (send) send.fn(); closeModal();
      ok('N2R-12b the PD assessor proposes a session (only now is one scheduled)', !!t.session && t.session.status === 'Proposed' && t.session.with === pdName);
      ACT.pdOutcome({ dataset: { l: L.lid } }); const open = t.items.filter(i => i[3] === 'Open');
      open.forEach((i, j) => { const x = $1(`#modal-root input[name="pdo-${j}"][value="${i[0] === b1 ? 'Met' : 'Not Met'}"]`); if (x) x.checked = true; }); const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
      const out = t.outcomes || {};
      ok('N2R-12c outcomes by the PD assessor: Met → Achieved; Not Met → item Returned to Action Required, not locked (the existing PD rules for staff-side records)', st(o, b1) === 'Achieved' && t.items.find(i => i[0] === b1)[3] === 'Achieved' && t.items.find(i => i[0] === b2)[3] === 'Returned to Action Required' && !STORE.tas.locks[L.lid + '|' + b2] && out[b1] && out[b1].by === pdName && out[b2] && out[b2].result === 'Not Met' && out[b2].by === pdName, J([st(o, b1), st(o, b2), t.items.map(i => i[3]), out]));
      ok('N2R-12d after the PD outcome Not Met the criterion is not eligible again: its latest published Assessor judgement is the later Met (PD-2-08)', !!n2EligWhy(o.sub(), asg, b2));
    } else ok('N2R-12 (no PD assessor account for this learner in the data)', true, pdName);
    ok('N2R-16 learner access rules (1A / 1B / 5 locks) are exactly as before for every seeded learner', lockSnap() === lock0);
  });

  await T('N2R-B the designated Coordinator creates the record', async () => {
    const o = setup(); if (!o) { ok('N2R-3 (setup not found)', false); return; }
    const cm = coordFor(o.L, o.key);
    if (!cm) { ok('N2R-3 (no designated Coordinator account for this learner in the data)', true); return; }
    COO(cm); ACT.n2AddPd({ dataset: { k: o.key, c: o.bads[0] } }); reason('PD-2-09: coordinator creates');
    const t = recs(o.L.lid)[0];
    ok('N2R-3 the designated Coordinator creates the record with only that criterion; role and reason recorded; no session', recs(o.L.lid).length === 1 && t.items.length === 1 && t.items[0][0] === o.bads[0] && t.meta[o.bads[0]].init.role === 'Academic Coordinator' && t.items[0][2] === 'PD-2-09: coordinator creates' && t.session === null && st(o, o.bads[1]) === 'Action Required');
  });

  await T('N2R-C ambiguous or missing mappings are refused', async () => {
    const o = setup(); if (!o) { ok('N2R-7 (setup not found)', false); return; }
    const { k, key, L, asg, bads: [b1] } = o; TCH(k);
    const tryIt = () => { const s = o.sub(); const why = s ? n2EligWhy(s, asg, b1) : 'not in marking'; const r = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); const m = !!MODAL; closeModal(); return { why, refused: r === false && !m, none: !recs(L.lid).length }; };
    const rec = ADMIN.learners.find(x => x.id === L.lid);
    ADMIN.learners.push({ ...rec }); const a1 = tryIt(); ADMIN.learners.pop();
    ok('N2R-7a two learner records with the same ID: refused, nothing created', /More than one learner record/.test(a1.why) && a1.refused && a1.none, J(a1));
    STORE.worlds.__n2r = { ...STORE.worlds.C, me: { ...STORE.worlds.C.me, id: L.lid } }; const a2 = tryIt(); delete STORE.worlds.__n2r;
    ok('N2R-7b a portal record with the same ID: refused, nothing created', /learner portal record/.test(a2.why) && a2.refused && a2.none, J(a2));
    STORE.tas.pd.push({ lid: L.lid, name: L.name, items: [], session: null, history: [] }, { lid: L.lid, name: L.name, items: [], session: null, history: [] });
    const s3 = o.sub(), w3 = n2EligWhy(s3, asg, b1), r3 = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); closeModal(); const n3 = recs(L.lid).length; STORE.tas.pd = STORE.tas.pd.filter(x => x.lid !== L.lid);
    ok('N2R-7c two PD records for the learner: refused, neither changed', /more than one Professional Discussion record/.test(w3) && r3 === false && n3 === 2, w3);
    const other = (ADMIN.batches || []).find(b => !b.short && b.code !== L.batch.code && acProgOf(b) !== acProgOf(L.batch));
    if (other) { const s4 = o.sub(); other.coh = other.coh || []; other.coh.push({ lid: L.lid, flags: [], subs: {}, pd: [], seed: 1 }); const w4 = n2EligWhy(s4, asg, b1); other.coh.pop();
      ok('N2R-7d enrolled on two programmes (the record is per learner): refused, nothing created', /more than one programme/.test(w4) && !recs(L.lid).length, w4); }
    else ok('N2R-7d (no second programme batch in the data)', true);
    const s5 = o.sub(), b = ADMIN.batches.find(x => x.code === L.batch.code), ix = b.coh.findIndex(e => e.lid === L.lid), ent = b.coh[ix];
    b.coh.splice(ix, 1); const w5 = n2EligWhy(s5, asg, b1); const r5 = ACT.n2AddPd({ dataset: { k: key, c: b1 } }); closeModal(); b.coh.splice(ix, 0, ent);
    ok('N2R-8a not enrolled in the batch any more: refused (no enrolment mapping), nothing created', /isn't enrolled/.test(w5) && r5 === false && !recs(L.lid).length, w5);
    const ri = ADMIN.learners.indexOf(rec); ADMIN.learners.splice(ri, 1); const w6 = n2MapWhy(s5); ADMIN.learners.splice(ri, 0, rec);
    ok('N2R-8b no learner record: refused', /No learner record/.test(w6), w6);
    const w7 = n2MapWhy({ ...s5, L: { ...s5.L, lid: '' } }), w8 = n2MapWhy({ ...s5, L: { ...s5.L, batch: null } });
    ok('N2R-8c no learner ID, or no batch: refused', /no learner ID/.test(w7) && /isn't enrolled/.test(w8), J([w7, w8]));
    ok('N2R-8d after the faults are removed the same learner is eligible again (nothing was created meanwhile)', n2EligWhy(o.sub(), asg, b1) === '' && !recs(L.lid).length);
  });

  await T('N2R-D the 55 legacy learners', async () => {
    fresh();
    const byId = new Set(Object.keys(STORE.worlds).map(v => STORE.worlds[v] && STORE.worlds[v].me && STORE.worlds[v].me.id).filter(Boolean));
    const missing = new Set(), roster = new Set(), none = lid => lid && !byId.has(lid) && !STORE.tas.pd.some(x => x.lid === lid);
    (ADMIN.batches || []).forEach(b => { (b.coh || []).forEach(e => { if (none(e.lid)) missing.add(e.lid); }); (b.roster || []).forEach(r => { if (none(r[1])) roster.add(r[1]); }); });
    const rosterOnly = [...roster].filter(l => !missing.has(l));
    const pd0 = J(STORE.tas.pd), subs = allSubs().filter(s => !s.live && missing.has(s.L.lid)), res = { eligible: 0, oldMsg: 0, mapping: 0, other: 0, bad: [] };
    subs.forEach(s => { const asg = tasAsg(s); n2Crits(asg).forEach(({ code }) => { const why = n2EligWhy(s, asg, code);
      if (why === OLD) res.oldMsg++; else if (!why) { res.eligible++; const j = n2Judg(s.key, code); if (!j || j.value !== 'Not Met') res.bad.push(s.key + ' ' + code); } else if (n2MapWhy(s)) res.mapping++; else res.other++; }); });
    // The audit's figure of 55 counted batch entries (per batch, coh + roster), treating learners whose portal record isn't flagged NVQ as staff-side
    const nvqIds = new Set(Object.keys(STORE.worlds).map(v => STORE.worlds[v]).filter(w => w && w.me && (w.nvq || (w.flags && w.flags.nvq))).map(w => w.me.id)), entries = [];
    (ADMIN.batches || []).forEach(b => (b.coh || []).map(e => e.lid).concat((b.roster || []).map(r => r[1])).forEach(lid => { if (lid && !nvqIds.has(lid) && !STORE.tas.pd.some(x => x.lid === lid)) entries.push(b.code + '/' + lid); }));
    R.push('INFO N2R-14i audit census method (batch entries, non-NVQ portal records included): ' + entries.length + ' entries; unique learners with staff-side records only and no PD record: ' + (missing.size + rosterOnly.length));
    const coSubs = allCoordSubs().filter(s => !s.live && rosterOnly.includes(s.L.lid) && s.status !== 'Not Started');
    ok('N2R-14 the ' + (missing.size + rosterOnly.length) + ' legacy learners without a PD record (' + missing.size + ' cohort, ' + rosterOnly.length + ' roster-only): none refused for the missing record; any eligible criterion has a published Not Met; evaluating creates nothing', missing.size > 0 && res.oldMsg === 0 && !res.bad.length && J(STORE.tas.pd) === pd0, J({ cohort: missing.size, withSubs: new Set(subs.map(s => s.L.lid)).size, rosterOnly: rosterOnly.length, ...res }));
    ok('N2R-14b the roster-only learners have no submissions, so neither PD route (marking-time or Add to PD) can reach them', coSubs.length === 0, J(coSubs.map(s => s.key)));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
