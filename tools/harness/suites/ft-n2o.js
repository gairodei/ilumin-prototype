// Point 2 — PD-2-10: the PD outcome decides the criterion state the same way for portal and staff-side learners, full legacy test data.
// Referred to the PD and awaiting the outcome → Added to PD; PD Met → Achieved; PD Not Met → Action Required — even when a published marking
// made after the referral (before the outcome) says Met. A genuinely new marking published after a Not Met outcome still moves the
// criterion on (as a portal learner's resubmission and re-marking does); a PD Met is never reversed by marking. Stored marking history,
// judgements, PD items and outcomes are unchanged; the staff-side improvement plan gets the Not Met next step as the portal plan does.
// Uses an actual staff-side learner of the legacy data (no portal record) and the seeded portal learner (C).
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'PD-2-10 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const TCH = v => { closeModal(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const COO = v => { closeModal(); S.coo.v = v; S.coo.batch = 'all'; S.coo.dirty = false; cooEnter(); S.ui = {}; };
  const LRN = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const recs = lid => STORE.tas.pd.filter(x => x.lid === lid);
  const FIVE_ST = ['Not Started', 'In Progress', 'Action Required', 'Added to PD', 'Achieved'];
  // The status a rendered view shows for a criterion: the row (tree row or marking-view row) whose code is that criterion
  const rowSt = code => { const r = $a('main .crit-row, main tr[data-crit]').find(x => { const c = x.querySelector('.code'); return c && c.textContent.trim() === code; }); if (!r) return null; const t = r.textContent; const hit = FIVE_ST.filter(s => t.includes(s)); return hit.length === 1 ? hit[0] : hit.join('|') || '—'; };
  const lockSnap = () => J(['A', 'B', 'C', 'D', 'E', 'F', 'H'].filter(v => STORE.worlds[v]).map(v => { LRN(v); return ['assignments', 'assignment', 'progress', 'observations', 'resources', 'payments'].map(r => { const k = S.params; S.params = {}; try { return J(lockFor(r)); } finally { S.params = k; } }); }));
  const open = x => { const a = tasAsg(x); return [...new Set(markable(a).flatMap(q => qCrits(q)))].filter(c => !STORE.tas.locks[x.L.lid + '|' + c] && n2State(x, a, c).st !== 'Achieved'); };
  const tasKey = name => Object.keys(TAS_USERS).find(k => TAS_USERS[k].name === name);
  // Publish marking for every markable answer: per criterion { met, verified, exit } (default Met, verified, pass)
  const remark = (o, per, txt) => { TCH(o.k); STORE.tas.marked && delete STORE.tas.marked[o.key]; const d = { items: {}, overall: txt };
    markable(o.asg).forEach(q => { const p = qCrits(q).map(c => per[c]).find(Boolean) || {}; d.items[q.id] = { met: p.met || 'Met', verified: p.verified !== false, vby: TME().name, vat: now().toISOString(), exit: p.exit || 'pass', rag: p.exit === 'resub' ? 'R' : 'G', fb: txt, ...(p.exit === 'resub' ? { corrections: txt, days: 7, deadline: new Date(now().getTime() + 7 * DAY).toISOString().slice(0, 10) } : {}) }; });
    releaseFeedback(o.sub(), o.asg, d); };
  const setup = () => {
    fresh(); let found = null;
    for (const k of Object.keys(TAS_USERS)) {
      TCH(k); if (CAN('mark') !== 'yes') continue;
      const s = tasSubs(true).find(x => !x.live && !x.L.short && !x.L.v && x.toMark && !ta1PubWhy(x.key) && !recs(x.L.lid).length && !r3Out(x.key) && !n2MapWhy(x) && open(x).length >= 2);
      if (s) { found = { k, s }; break; }
    }
    if (!found) return null;
    const { k, s } = found, key = s.key; TCH(k); go('t-mark', { id: key });
    const asg = tasAsg(tasSubs(true).find(x => x.key === key)), codes = [...new Set(markable(asg).flatMap(q => qCrits(q)))], bads = open(s).slice(0, 2);
    markable(asg).forEach(q => { const resub = qCrits(q).some(c => bads.includes(c));
      qCrits(q).forEach(c => ACT.mkMet({ dataset: c === q.crit ? { k: key, q: q.id, v: bads.includes(c) ? 'Not Met' : 'Met' } : { k: key, q: q.id, c, v: bads.includes(c) ? 'Not Met' : 'Met' } }));
      ACT.mkRag({ dataset: { k: key, q: q.id, v: resub ? 'R' : 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'PD-2-10 feedback.' }); INP.mkExit({ dataset: { k: key, q: q.id }, value: resub ? 'resub' : 'pass' });
      if (resub) { INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'PD-2-10 corrections.' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '7' }); } });
    ACT.mkRelease({ dataset: { k: key } }); press();
    // Criteria on this assignment that share no answer with the two Not Met ones (they keep their own state throughout)
    const others = codes.filter(c => !markable(asg).some(q => qCrits(q).includes(c) && qCrits(q).some(b => bads.includes(b))));
    const sub = () => { TCH(k); return tasSubs(true).find(x => x.key === key); };
    return { k, key, L: s.L, asg, bads, others, sub };
  };
  const st = (o, code) => n2State(o.sub(), o.asg, code).st;
  const cell = (L, code) => { const r = co1Rec(L); return r && r.st[code] || null; };

  await T('N2O-17 learners without a PD referral keep their marking-derived state', async () => {
    fresh(); const diff = []; let n = 0, m = 0;
    Object.keys(TAS_USERS).forEach(k => { TCH(k); tasSubs(true).forEach(s => { if (s.live || s.L.short || s.L.v) return; const a = tasAsg(s), t = recs(s.L.lid)[0];
      n2Crits(a).forEach(({ code }) => { if (t && t.items.some(i => i[0] === code)) return; n++;
        const rel = STORE.tas.rel[s.key], its = rel && rel.items ? a.qs.filter(q => qCrits(q).includes(code)).map(q => rel.items[q.id]).filter(Boolean) : [], j = n2Judg(s.key, code), pub = its.length > 0 || (!!rel && (a.acrit || []).includes(code));
        const old = STORE.tas.locks[s.L.lid + '|' + code] ? 'Achieved' : its.some(x => x.exit === 'resub') || (j && j.value === 'Not Met') ? 'Action Required' : pub ? 'In Progress' : null;
        if (n2State(s, a, code).st !== old) diff.push([s.key, code, n2State(s, a, code).st, old]); });
      if (!t && co1Rec(s.L) && co1Rec(s.L).crits.length) { m++; const codes = new Set(co1Rec(s.L).crits.map(c => c.code)); if (J(co1Published(s.L, codes)) !== J(_pubN2(s.L, codes))) diff.push([s.L.lid, 'map']); } }); });
    ok('N2O-17 every staff-side criterion with no PD referral has the marking-derived state as before (submission view and competency map)', n > 0 && m > 0 && !diff.length, J({ n, m, diff: diff.slice(0, 5) }));
  });

  await T('N2O-A staff-side learner (actual legacy fixture)', async () => {
    const lock0 = lockSnap();
    const o = setup(); ok('N2O-0 setup: a staff-side learner (no portal record), published marking with two criteria Not Met', !!o && o.bads.length === 2 && o.bads.every(c => st(o, c) === 'Action Required') && !o.L.v, o && J([o.key, o.bads]));
    if (!o) return;
    const { k, key, L, asg, bads: [b1, b2], others } = o;
    TCH(k); ACT.n2AddPd({ dataset: { k: key, c: b1 } }); reason('PD-2-10: first'); ACT.n2AddPd({ dataset: { k: key, c: b2 } }); reason('PD-2-10: second');
    const t = recs(L.lid)[0];
    TCH(k); go('t-mark', { id: key }); const mv = [rowSt(b1), rowSt(b2)];
    go('t-students', { id: L.lid, tab: 'competency' }); const tv = [rowSt(b1), rowSt(b2)];
    ok('N2O-2 staff-side, PD awaiting the outcome → Added to PD (submission state, competency map, marking view, learner competency tab)', [b1, b2].every(c => st(o, c) === 'Added to PD' && cell(L, c) === 'Added to PD') && J(mv) === J(['Added to PD', 'Added to PD']) && J(tv) === J(['Added to PD', 'Added to PD']), J({ mv, tv, map: [cell(L, b1), cell(L, b2)] }));
    // A later ordinary marking (Met, verified) published while the referral is open
    remark(o, {}, 'PD-2-10 later re-mark: Met.');
    ok('N2O-8 a later marking (Met, verified) can\'t overwrite an open PD referral: still Added to PD, not locked', [b1, b2].every(c => st(o, c) === 'Added to PD' && cell(L, c) === 'Added to PD' && !STORE.tas.locks[L.lid + '|' + c]) && t.items.every(i => i[3] === 'Open'));
    const rel0 = J(STORE.tas.rel), judg0 = J(r3Judg(key)), out0 = J(r3Out(key) || null), oth0 = J(others.map(c => [c, st(o, c), cell(L, c)])), relKey0 = STORE.tas.rel[key];
    ok('N2O-7a setup: the latest published marking and Assessor judgement of the second criterion say Met', Object.values(relKey0.items).every(x => x.exit === 'pass') && (n2Judg(key, b2) || {}).value !== 'Not Met', J(n2Judg(key, b2)));
    // Only the allocated PD assessor records the outcome
    const pdName = chEff(L.lid, 'pd', L.batch), pk = tasKey(pdName);
    if (!pk) { ok('N2O (no PD assessor account for this learner in the data)', false, pdName); return; }
    const tried = []; Object.keys(TAS_USERS).filter(u => TAS_USERS[u].name !== pdName).forEach(u => { TCH(u); ACT.pdOutcome({ dataset: { l: L.lid } }); tried.push([u, !!(MODAL && /Record PD outcome/.test(MODAL.title || ''))]); closeModal(); });
    Object.keys(COO_USERS).forEach(c => { COO(c); ACT.pdOutcome({ dataset: { l: L.lid } }); tried.push(['coord ' + c, !!(MODAL && /Record PD outcome/.test(MODAL.title || ''))]); closeModal(); });
    ok('N2O-14 only the allocated PD assessor records PD outcomes: every other Assessor / Teacher and every Coordinator gets no outcome dialog; items stay open', tried.length > 0 && tried.every(x => !x[1]) && t.items.every(i => i[3] === 'Open'), J(tried.filter(x => x[1])));
    TCH(pk); ACT.pdOutcome({ dataset: { l: L.lid } }); const op = t.items.filter(i => i[3] === 'Open');
    op.forEach((i, j) => { const x = $1(`#modal-root input[name="pdo-${j}"][value="${i[0] === b1 ? 'Met' : 'Not Met'}"]`); if (x) x.checked = true; const nt = $1('#pdn-' + j); if (nt && i[0] === b2) nt.value = 'PD-2-10: give a written account of the procedure.'; });
    const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
    ok('N2O-4 staff-side, PD Met → Achieved (submission state and competency map)', st(o, b1) === 'Achieved' && cell(L, b1) === 'Achieved', J([st(o, b1), cell(L, b1)]));
    ok('N2O-6 staff-side, PD Not Met → Action Required (submission state and competency map)', st(o, b2) === 'Action Required' && cell(L, b2) === 'Action Required', J([st(o, b2), cell(L, b2)]));
    TCH(k); go('t-mark', { id: key }); const mv2 = [rowSt(b1), rowSt(b2)];
    TCH(pk); go('t-students', { id: L.lid, tab: 'competency' }); const tv2 = [rowSt(b1), rowSt(b2)];
    const cm = Object.keys(COO_USERS).find(c => { COO(c); return myLearners(true).some(x => x.lid === L.lid); }); let cv = null;
    if (cm) { COO(cm); go('c-learner', { id: L.lid, tab: 'progress' }); cv = [rowSt(b1), rowSt(b2)]; }
    ok('N2O-7 the later Met marking doesn\'t override the PD Not Met: Action Required in the Assessor\'s marking view, the learner\'s competency tab and the Coordinator\'s progress view', J(mv2) === J(['Achieved', 'Action Required']) && J(tv2) === J(['Achieved', 'Action Required']) && (!cm || J(cv) === J(['Achieved', 'Action Required'])), J({ mv2, tv2, cv, cm }));
    ok('N2O-9 previous marking decisions unchanged: published marking records, Assessor judgements and the final outcome are as before the PD outcome', J(STORE.tas.rel) === rel0 && J(r3Judg(key)) === judg0 && J(r3Out(key) || null) === out0 && STORE.tas.rel[key] === relKey0);
    ok('N2O-10 other criteria on the same assignment are unchanged', others.length > 0 ? J(others.map(c => [c, st(o, c), cell(L, c)])) === oth0 : true, J({ others, oth0 }));
    const plan = (STORE.tas.notes[L.lid] || []).filter(n => n[0] === 'Recommendation' && n[1] === 'PD-2-10: give a written account of the procedure.' && String(n[3] || '').includes(b2));
    TCH(pk); go('t-portfolio', { id: L.lid }); const pf = ($1('main') || document.body).textContent;
    ok('N2O-12 the improvement plan reflects the PD Not Met: one recommended action for that criterion with the PD assessor\'s next step (shown with the learner\'s notes)', plan.length === 1 && pf.includes('PD-2-10: give a written account of the procedure.') && !(STORE.tas.notes[L.lid] || []).some(n => String(n[3] || '').includes(b1)), J(STORE.tas.notes[L.lid]));
    const out = t.outcomes || {}, i1 = t.items.find(i => i[0] === b1), i2 = t.items.find(i => i[0] === b2);
    TCH(pk); go('t-pd'); const pv = ($1('main') || document.body).textContent;
    ok('N2O-13 the PD checklist records each outcome and its closure: Achieved / Returned to Action Required, results and notes by the PD assessor, signed off, nothing left open', i1[3] === 'Achieved' && i2[3] === 'Returned to Action Required' && out[b1].result === 'Met' && out[b2].result === 'Not Met' && out[b2].notes === 'PD-2-10: give a written account of the procedure.' && out[b1].by === pdName && out[b2].by === pdName && !t.items.some(i => i[3] === 'Open') && ((t.session && t.session.signedBy === pdName) || (t.signOff && t.signOff.by === pdName)) && pv.includes('Returned to Action Required'), J({ items: t.items, out, s: t.session, so: t.signOff }));
    const asgName = chEff(L.lid, 'asg', L.batch); TCH(pk); const wPd = r3OutWhy(key); TCH(tasKey(asgName) || k); const wAs = r3OutWhy(key);
    ok('N2O-15 only the allocated assignment assessor declares the final Pass / Fail: the PD outcome declared none, and the PD assessor (if someone else) is refused', J(r3Out(key) || null) === out0 && (pdName === asgName || /allocated assignment assessor/.test(wPd)) && !/Only the allocated assignment assessor/.test(wAs), J({ pdName, asgName, wPd, wAs }));
    ok('N2O-16 no duplicate PD records or checklist entries: one record, one item per criterion', recs(L.lid).length === 1 && t.items.length === 2 && [b1, b2].every(c => t.items.filter(i => i[0] === c).length === 1));
    // Marking published after the outcome: a PD Met isn't reversed by it; a PD Not Met criterion follows the genuinely new assessment
    CLOCK_SHIFT += DAY; remark(o, { [b1]: { met: 'Not Met', exit: 'resub' }, [b2]: { met: 'Met', verified: false, exit: 'pass' } }, 'PD-2-10 new assessment after the PD.');
    ok('N2O-11 a PD Met isn\'t overwritten by marking data: still Achieved after a later Not Met marking; the PD item stays Achieved', st(o, b1) === 'Achieved' && cell(L, b1) === 'Achieved' && i1[3] === 'Achieved', J([st(o, b1), cell(L, b1)]));
    ok('N2O-6b a genuinely new assessment published after the PD Not Met still applies (the existing further-evidence route): it follows that marking, not the PD outcome', st(o, b2) === 'In Progress' && cell(L, b2) === 'In Progress' && i2[3] === 'Returned to Action Required', J([st(o, b2), cell(L, b2)]));
    ok('N2O-18 learner access rules (1A / 1B / 5 locks) are exactly as before for every seeded learner', lockSnap() === lock0);
  });

  await T('N2O-B portal learner (seeded learner C)', async () => {
    fresh(); const w = STORE.worlds.C, crit = code => { let c = null; w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(x => { if (!c && x.code === code) c = x; })))); return c; };
    const op = w.pd.items.filter(i => i.status === 'Open').map(i => i.ref), [p1, p2] = op;
    const pdName = chEff(w.me.id, 'pd'), pk = tasKey(pdName);
    if (op.length < 2 || !pk) { ok('N2O-B setup: two open PD items and a PD assessor account', false, J({ op, pdName })); return; }
    TCH(pk); const L = tasLearners(true).find(l => l.v === 'C');
    LRN('C'); go('progress', { tab: 'tree' }); const lv = [rowSt(p1), rowSt(p2)];
    ok('N2O-1 portal, PD awaiting the outcome → Added to PD (criterion record, staff competency map, learner\'s progress view)', [p1, p2].every(c => crit(c).st === 'Added to PD' && cell(L, c) === 'Added to PD') && J(lv) === J(['Added to PD', 'Added to PD']), J({ st: [crit(p1).st, crit(p2).st], lv }));
    const plan0 = w.plan.length, items0 = w.pd.items.length;
    TCH(pk); ACT.pdOutcome({ dataset: { l: w.me.id } }); const open = pdOf(w.me.id).items.filter(i => i[3] === 'Open');
    open.forEach((i, j) => { const x = $1(`#modal-root input[name="pdo-${j}"][value="${i[0] === p1 ? 'Met' : 'Not Met'}"]`); if (x) x.checked = true; const nt = $1('#pdn-' + j); if (nt && i[0] === p2) nt.value = 'PD-2-10 portal: add a workplace example.'; });
    const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
    LRN('C'); go('progress', { tab: 'tree' }); const lv2 = [rowSt(p1), rowSt(p2)];
    ok('N2O-3 portal, PD Met → Achieved and locked (criterion record, staff competency map, learner\'s progress view)', crit(p1).st === 'Achieved' && !!crit(p1).lock && cell(L, p1) === 'Achieved' && lv2[0] === 'Achieved', J([crit(p1).st, cell(L, p1), lv2]));
    ok('N2O-5 portal, PD Not Met → Action Required (criterion record, staff competency map, learner\'s progress view)', crit(p2).st === 'Action Required' && cell(L, p2) === 'Action Required' && lv2[1] === 'Action Required', J([crit(p2).st, cell(L, p2), lv2]));
    const it1 = w.pd.items.find(i => i.ref === p1), it2 = w.pd.items.find(i => i.ref === p2);
    ok('N2O-12p portal: the improvement plan gets the Not Met next step (as before)', w.plan.length === plan0 + 1 && w.plan[0].crit === p2 && w.plan[0].action === 'PD-2-10 portal: add a workplace example.' && (LRN('C'), go('progress', { tab: 'plan' }), ($1('main') || document.body).textContent.includes('PD-2-10 portal: add a workplace example.')));
    ok('N2O-13p portal: the checklist records Achieved / Returned to Action Required with each outcome by the PD assessor; no duplicate items', it1.status === 'Achieved' && it2.status === 'Returned to Action Required' && it1.outcome && it1.outcome.result === 'Met' && it2.outcome && it2.outcome.result === 'Not Met' && it2.outcome.by === pdName && w.pd.items.length === items0 && [p1, p2].every(c => w.pd.items.filter(i => i.ref === c).length === 1));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
