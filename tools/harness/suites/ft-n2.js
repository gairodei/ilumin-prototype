// Point 2 — criterion-level "Add to PD" after marking, client demo (FIXTURE=client). Amira (Assessor James) and Dev submit
// Assignment 1; James publishes marking with one criterion Not Met; the Assessor and the learner's own Coordinator each add one
// Not Met criterion to the PD; other roles, Met / Partially Met / already-added criteria, a declared final outcome and direct calls are
// refused; the assignment record is unchanged; the PD outcome stays with the PD assessor and the final Pass / Fail with the Assessor.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (t = 'Point 2 test') => { const x = $1('#rsn'); if (x) x.value = t; return press(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const TCH = v => { signOutUI(); S.returnTo = null; S.tas.dirty = false; S.tas.v = v; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; go('t-dashboard'); };
  const AM = 'IA-L-32000', DV = 'IA-L-32001';
  const keyOf = (lid, aid) => { const s = chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(x => x.L.lid === lid && x.a.id === aid); } finally { S.tas.v = k; } }); return s && s.key; };
  const tasKey = name => Object.keys(TAS_USERS).find(k => TAS_USERS[k].name === name);
  const aud = re => ADMIN.audit.filter(x => re.test(x.action)).length;
  const crit = (w, code) => { let c = null; w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(x => { if (!c && x.code === code) c = x; })))); return c; };
  const states = w => J(allCritOf(w).map(c => [c.code, c.st, !!c.lock]));
  const allCritOf = w => { const out = []; w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => out.push(c))))); return out; };
  // The learner submits Assignment 1; James marks the first criterion Not Met (resubmission), any others Met, and publishes
  const submitAndMark = (p, v, lid, notMet = 'Not Met') => {
    const w = STORE.worlds[v], a = w.assignments.find(x => x.id === 'a10');
    pick(p); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>Point 2 answer: I put the person at the centre of their care.</p>');
    fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
    const key = keyOf(lid, 'a10'); TCH('S'); go('t-mark', { id: key });
    const asg = tasAsg(tasSubs(true).find(s => s.key === key)), codes = n2Crits(asg).map(x => x.code), bad = codes[0];
    markable(asg).forEach((q, i) => {
      const cs = qCrits(q), resub = cs.includes(bad);
      cs.forEach(c => { const r = ACT.mkMet({ dataset: c === q.crit ? { k: key, q: q.id, v: c === bad ? notMet : 'Met' } : { k: key, q: q.id, c, v: c === bad ? notMet : 'Met' } }); });
      ACT.mkRag({ dataset: { k: key, q: q.id, v: resub ? 'R' : 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: `Point 2 comment Q${i + 1}.` });
      INP.mkExit({ dataset: { k: key, q: q.id }, value: resub ? 'resub' : 'pass' });
      if (resub) { INP.mkField({ dataset: { k: key, q: q.id, f: 'corrections' }, value: 'Point 2: show how the plan was agreed.' }); INP.mkField({ dataset: { k: key, q: q.id, f: 'days' }, value: '7' }); }
    });
    INP.mkField({ dataset: { k: key, f: 'overall' }, value: 'Point 2 overall.' }); ACT.mkRelease({ dataset: { k: key } }); press();
    return { w, a, key, asg, codes, bad };
  };
  const coordOf = key => ['coord1', 'coord2'].map(p => { pick(p); const x = mySubmissions(true).find(s => s.key === key); return { p, mine: !!x && mcMineL(x.L) }; }); // MC: the learner's designated Coordinator

  await T('N2 the whole flow', async () => {
    closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal();
    const A = submitAndMark('nvq-sp', 'CD1', AM), w = A.w, a = A.a, key = A.key, bad = A.bad;
    ok('N2-0 setup: James published Amira\'s marking; the first criterion is Not Met (Action Required)', a.status === 'Resubmission Required' && crit(w, bad).st === 'Action Required' && (n2Judg(key, bad) || {}).value === 'Not Met', J([a.status, bad, crit(w, bad).st, A.codes, r3Judg(key).map(j => [j.crit, j.qid, j.value, j.role, j.published])]));
    const hist0 = J([a.qs.map(q => [q.fb, q.state, q.rounds || q.answers || null]), a.status, a.resubDue, a.timeline, a.overall, r3Judg(key), r3Out(key)]);
    const other0 = J(allCritOf(w).filter(c => c.code !== bad).map(c => [c.code, c.st, c.lock || null, c.date || null])), sess0 = J(w.pd.session || null), n0 = w.pd.items.length;

    // Refusals first: unrelated Assessors, unrelated Coordinator, the learner, an agency
    const before = () => J([crit(w, bad).st, w.pd.items.length]); const b0 = before(), x0 = aud(/Blocked: add criterion to PD/);
    TCH('O'); const rO = ACT.n2AddPd({ dataset: { k: key, c: bad } }); const mO = !!MODAL; closeModal();
    TCH('T'); const rT = ACT.n2AddPd({ dataset: { k: key, c: bad } }); const mT = !!MODAL; closeModal();
    ok('N2-4 an Assessor who isn\'t the allocated assignment assessor (Omar) and a Teacher (Marcus) are refused; nothing changes', rO === false && rT === false && !mO && !mT && before() === b0);
    const cs = coordOf(key), mine = cs.find(x => x.mine), other = cs.find(x => !x.mine);
    pick(other.p); const rC = ACT.n2AddPd({ dataset: { k: key, c: bad } }); const mC = !!MODAL; closeModal();
    ok('N2-3 the other Academic Coordinator (not Amira\'s) is refused', !!mine && !!other && rC === false && !mC && before() === b0, J(cs));
    pick('nvq-sp'); const rL = ACT.n2AddPd({ dataset: { k: key, c: bad } }); pick('agency'); const rA = ACT.n2AddPd({ dataset: { k: key, c: bad } }); closeModal();
    ok('N2-14 the learner and an agency account are refused by direct call', rL === false && rA === false && before() === b0);
    ok('N2-14 each refusal is logged', aud(/Blocked: add criterion to PD/) >= x0 + 5);

    // The allocated Assessor: the marking view shows the action for the Not Met criterion only
    TCH('S'); go('t-mark', { id: key });
    const btns = $a('main .n2-pd [data-act="n2AddPd"]').map(b => b.dataset.c);
    ok('N2-1a James\'s marking view: "Add to PD" only on the Not Met criterion', J(btns) === J([bad]), J(btns));
    click($1(`main .n2-pd [data-act="n2AddPd"][data-c="${bad}"]`));
    ok('N2-1b a confirmation with a required reason; nothing changes before it', !!MODAL && /Add .* to the Professional Discussion/.test(MODAL.title) && crit(w, bad).st === 'Action Required');
    const empty = prim(); ok('N2-1c an empty reason is refused', empty === false && crit(w, bad).st === 'Action Required');
    reason('Point 2: discuss how the plan was agreed');
    const it = w.pd.items[0];
    ok('N2-1 James adds the Not Met criterion: Added to PD, one PD item', crit(w, bad).st === 'Added to PD' && w.pd.items.length === n0 + 1 && it.ref === bad && it.status === 'Open');
    ok('N2-8 the PD item records who, when, the role, the assignment, question and criterion', it.by === 'James Pryce' && !!it.at && it.go === 'assignment.a10' && it.aid === 'a10' && /Q\d/.test(it.from) && it.init && it.init.role === 'Assessor' && it.init.crit === bad && it.init.key === key && Object.isFrozen(it.init) && /discuss how the plan/.test(it.reason));
    ok('N2-7 / N2-8 only that criterion changed; every other criterion is exactly as it was', J(allCritOf(w).filter(c => c.code !== bad).map(c => [c.code, c.st, c.lock || null, c.date || null])) === other0);
    ok('N2-9 the assignment record is untouched: answers, feedback, rounds, authors, timestamps, status, deadline, judgements', J([a.qs.map(q => [q.fb, q.state, q.rounds || q.answers || null]), a.status, a.resubDue, a.timeline, a.overall, r3Judg(key), r3Out(key)]) === hist0);
    ok('N2-15b nothing is verified or passed: no lock, no final outcome', !crit(w, bad).lock && !r3Out(key));
    ok('N2-9b the learner is notified', w.notifs.some(n => n.title === 'Added to your Professional Discussion' && n.body.includes(bad)));
    ok('N2-9c audited', ADMIN.audit.some(x => x.action === 'Criterion added to PD' && x.after === `${bad}: Added to PD` && /Assessor James Pryce/.test(x.reason)));
    ok('N2-10 the PD session is unchanged (scheduling unaffected)', J(w.pd.session || null) === sess0);
    const n1 = w.pd.items.length; const rD = ACT.n2AddPd({ dataset: { k: key, c: bad } }); closeModal();
    ok('N2-6 a second Add to PD for the same criterion is refused; one item', rD === false && w.pd.items.length === n1 && w.pd.items.filter(i => i.ref === bad && i.status === 'Open').length === 1);
    go('t-mark', { id: key }); ok('N2-6b the marking view shows it as Added to PD, with no button; the PD panel lists it', !$1(`main .n2-pd [data-act="n2AddPd"][data-c="${bad}"]`) && /Added to PD/.test(($1(`main .n2-pd tr[data-crit="${bad}"]`) || {}).textContent || '') && !!$1(`main .co1-pd .co1-pd-row[data-crit="${bad}"]`));
    if (A.codes.length > 1) { const met = A.codes[1]; const rM = ACT.n2AddPd({ dataset: { k: key, c: met } }); closeModal(); ok('N2-5 a criterion judged Met can\'t be added', rM === false && crit(w, met).st !== 'Added to PD'); }
    const rX = ACT.n2AddPd({ dataset: { k: key, c: 'NO-SUCH 9.9' } }); closeModal(); ok('N2-5b a criterion not mapped to the assignment is refused', rX === false);

    // The learner sees it on their PD checklist; the assignment still asks for the resubmission
    pick('nvq-sp'); go('progress', { tab: 'pd' }); const lp = main();
    ok('N2-9d Amira\'s PD checklist lists the criterion; the assignment still needs the resubmission', lp.includes(bad) && a.status === 'Resubmission Required');

    // PD outcome: the Coordinator can't record it; the allocated PD assessor can
    pick(mine.p); const rPO = ACT.pdOutcome({ dataset: { l: AM } }); const mPO = !!MODAL && /Record PD outcome/.test(MODAL.title || ''); closeModal();
    ok('N2-11a the Coordinator can\'t record the PD outcome', !mPO && it.status === 'Open' && crit(w, bad).st === 'Added to PD');
    const pdName = chEff(AM, 'pd'), pk = tasKey(pdName), notPd = ['S', 'O', 'T'].find(k => TAS_USERS[k] && TAS_USERS[k].name !== pdName && k !== 'T');
    if (notPd) { TCH(notPd); ACT.pdOutcome({ dataset: { l: AM } }); const m2 = !!MODAL && /Record PD outcome/.test(MODAL.title || ''); closeModal(); ok('N2-11b an Assessor who isn\'t the PD assessor can\'t record it', !m2 && it.status === 'Open', pdName); }
    TCH(pk); ACT.pdOutcome({ dataset: { l: AM } });
    const has = !!MODAL && /Record PD outcome/.test(MODAL.title || '') && String(MODAL.body).includes(bad);
    const k = (pdOf(AM).items.filter(i => i[3] === 'Open').findIndex(i => i[0] === bad));
    const radio = $1(`#modal-root input[name="pdo-${k}"][value="Met"]`); if (radio) radio.checked = true; const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
    ok('N2-11 the allocated PD assessor records Met: the criterion is Achieved and locked by them', has && crit(w, bad).st === 'Achieved' && !!crit(w, bad).lock && crit(w, bad).lock.by === pdName && it.outcome && it.outcome.result === 'Met', J([pdName, pk, crit(w, bad).st]));

    TCH('S'); const nM = w.pd.items.length, rMet = ACT.n2AddPd({ dataset: { k: key, c: bad } }); closeModal();
    ok('N2-5 a criterion that is now Met (Achieved by the PD outcome) can\'t be added again', rMet === false && crit(w, bad).st === 'Achieved' && w.pd.items.length === nM);
    // Final Pass / Fail: the Coordinator can't; the allocated Assessor can; afterwards Add to PD is locked
    pick(mine.p); ACT.r3Declare({ dataset: { k: key } }); const mR = !!MODAL; closeModal();
    ok('N2-12 the Coordinator can\'t declare the final Pass / Fail', !mR && !r3Out(key));
    TCH('S'); ACT.r3Declare({ dataset: { k: key } }); const rr = $1('input[name="r3-res"][value="Fail"]'); if (rr) rr.checked = true; const of = $1('#d-ofb'); if (of) of.value = 'Point 2 final.'; reason('Point 2 final outcome');
    ok('N2-13 the allocated Assessor declares the final outcome as before', !!r3Out(key) && r3Out(key).by === 'James Pryce');
  });

  await T('N2 the learner\'s Coordinator adds a criterion; Partially Met is not Not Met', async () => {
    closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal();
    const D = submitAndMark('nvq-fa', 'CD2', DV), w = D.w, key = D.key, bad = D.bad;
    const mine = coordOf(key).find(x => x.mine); pick(mine.p); go('c-sub', { id: key });
    ok('N2-2a the Coordinator\'s submission review shows "Add to PD" on the Not Met criterion', !!$1(`main .n2-pd [data-act="n2AddPd"][data-c="${bad}"]`));
    const others0 = J(allCritOf(w).filter(c => c.code !== bad).map(c => [c.code, c.st, c.lock || null])), n0 = w.pd.items.length;
    ACT.n2AddPd({ dataset: { k: key, c: bad } }); reason('Point 2: Coordinator — cover it in the PD');
    const it = w.pd.items[0];
    ok('N2-2 Dev\'s Coordinator adds it: Added to PD, one item, recorded as the Coordinator', crit(w, bad).st === 'Added to PD' && w.pd.items.length === n0 + 1 && it.init.role === 'Academic Coordinator' && it.by === (CME() || {}).name && J(allCritOf(w).filter(c => c.code !== bad).map(c => [c.code, c.st, c.lock || null])) === others0);
    ok('N2-10b the Coordinator gained no PD-assessment or marking rights (CAN pd / mark unchanged; no outcome dialog)', (ACT.pdOutcome({ dataset: { l: DV } }), !(MODAL && /Record PD outcome/.test(MODAL.title || ''))) && (closeModal(), true));
    // Amira: Partially Met with a resubmission — needs rework, but isn't Not Met
    closeModal(); ACT.resetDemo(); closeModal();
    const P = submitAndMark('nvq-sp', 'CD1', AM, 'Partially Met');
    const why = n2EligWhy(chRaw(() => { const k = S.tas.v; S.tas.v = 'S'; try { return tasSubs(true).find(s => s.key === P.key); } finally { S.tas.v = k; } }), P.asg, P.bad);
    TCH('S'); const rP = ACT.n2AddPd({ dataset: { k: P.key, c: P.bad } }); closeModal();
    ok('N2-5c a Partially Met criterion (Action Required, resubmission) isn\'t Not Met: refused (the Amber meaning is pending the client)', rP === false && crit(P.w, P.bad).st === 'Action Required' && /Partially Met/.test(why), why);
  });

  await T('N2-L PD stays pending through resubmission and re-marking; the PD session lifecycle', async () => {
    closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal();
    const A = submitAndMark('nvq-sp', 'CD1', AM), w = A.w, a = A.a, key = A.key, bad = A.bad;
    TCH('S'); ACT.n2AddPd({ dataset: { k: key, c: bad } }); reason('Point 2: discuss it at the PD'); const it = w.pd.items.find(i => i.ref === bad && i.status === 'Open');
    ok('N2-L0 setup: the criterion is in the PD', !!it && crit(w, bad).st === 'Added to PD');
    // The learner resubmits the answer: the pending-PD criterion isn't moved to In Progress
    pick('nvq-sp'); go('assignment', { id: 'a10' }); typeIn('main .paper .rte-body', '<p>Point 2 resubmission.</p>');
    fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
    ok('N2-L1 resubmitting keeps the criterion Added to PD (not In Progress); the PD item stays open', a.status === 'Submitted' && crit(w, bad).st === 'Added to PD' && it.status === 'Open', J([a.status, crit(w, bad).st]));
    // James re-marks it Met and verifies it, and publishes: the judgement is recorded; the criterion stays with the PD
    const j0 = r3Judg(key).length; TCH('S'); go('t-mark', { id: key });
    ok('N2-L2a the marking view says the criterion is in the PD and won\'t be changed by this marking', /is in the Professional Discussion/.test(($1('main .n2-keep') || {}).textContent || ''));
    const asg = tasAsg(tasSubs(true).find(x => x.key === key)), q = markable(asg).find(z => qCrits(z).includes(bad));
    ACT.mkMet({ dataset: { k: key, q: q.id, v: 'Met' } }); ACT.mkRag({ dataset: { k: key, q: q.id, v: 'G' } }); INP.mkField({ dataset: { k: key, q: q.id, f: 'fb' }, value: 'Point 2 re-mark: now met.' }); INP.mkExit({ dataset: { k: key, q: q.id }, value: 'pass' });
    ACT.mkVerify({ dataset: { k: key, q: q.id } }); press(); INP.mkField({ dataset: { k: key, f: 'overall' }, value: 'Point 2 re-mark overall.' }); ACT.mkRelease({ dataset: { k: key } }); press();
    ok('N2-L2 publishing the re-marking (Met, verified) doesn\'t replace Added to PD or verify the criterion; the PD item stays open', crit(w, bad).st === 'Added to PD' && !crit(w, bad).lock && it.status === 'Open' && w.pd.items.filter(i => i.ref === bad && i.status === 'Open').length === 1, J([crit(w, bad).st, !!crit(w, bad).lock, it.status]));
    ok('N2-L3 the new marking is recorded as history (judgements and feedback kept, nothing deleted)', r3Judg(key).length > j0 && a.qs.some(z => z.fb.some(f => /re-mark: now met/.test(f.text))) && a.qs.some(z => z.fb.some(f => /Point 2 comment/.test(f.text))));
    ok('N2-L3b the kept criterion is audited', ADMIN.audit.some(x => x.action === 'Criteria kept in PD (marking published)' && x.before.includes(bad)));
    // PD session: only the PD assessor proposes; the Coordinator and other Assessors can't
    const pdName = chEff(AM, 'pd'), pk = tasKey(pdName), mine = coordOf(key).find(x => x.mine);
    pick(mine.p); ACT.pdPropose({ dataset: { l: AM } }); const mC = !!MODAL && /Propose PD session/.test(MODAL.title || ''); closeModal();
    const other = ['S', 'O'].find(k => TAS_USERS[k] && TAS_USERS[k].name !== pdName); let mO = false; if (other) { TCH(other); ACT.pdPropose({ dataset: { l: AM } }); mO = !!MODAL && /Propose PD session/.test(MODAL.title || ''); closeModal(); }
    ok('N2-L4 the Coordinator and an Assessor who isn\'t the PD assessor can\'t propose the PD session', !mC && !mO && !(w.pd.session && w.pd.session.status === 'Proposed'));
    TCH(pk); ACT.pdPropose({ dataset: { l: AM } }); const at1 = new Date(now().getTime() + 12 * DAY).toISOString().slice(0, 16); $1('#pd-d').value = at1; $1('#pd-m').value = 'Online'; press();
    ok('N2-L5 the PD assessor proposes: session Proposed, with them, the learner\'s calendar gets it, the learner is notified', w.pd.session && w.pd.session.status === 'Proposed' && w.pd.session.with === pdName && w.events.some(e => e.id === 'epd') && w.notifs.some(n => /Professional Discussion|PD/.test(n.title + ' ' + n.body)));
    pick('nvq-sp'); go('progress', { tab: 'pd' }); ok('N2-L5b the learner\'s PD checklist shows the criterion and the proposed session', main().includes(bad) && /Proposed/.test(main()));
    ACT.pdConfirm(); press(); ok('N2-L6 the learner confirms: session Confirmed, calendar entry confirmed', w.pd.session.status === 'Confirmed' && /confirmed/.test((w.events.find(e => e.id === 'epd') || {}).title || ''));
    TCH(pk); ACT.pdPostpone({ dataset: { l: AM } }); const at2 = new Date(now().getTime() + 20 * DAY).toISOString().slice(0, 16); $1('#pp-d').value = at2; reason('Point 2: moved to a new date');
    ok('N2-L7 the PD assessor reschedules the confirmed session (postpone): new date, reason in the history, items stay open', w.pd.session.at.slice(0, 16) === at2 && w.pd.history.some(h => /new date/.test(h.reason || '')) && it.status === 'Open', J([w.pd.session.at, at2]));
    pick('nvq-sp'); ACT.pdAlt(); $a('#modal-root input, #modal-root textarea').forEach(i => { if (!i.value) i.value = i.type === 'datetime-local' ? at2 : i.type === 'date' ? at2.slice(0, 10) : 'Point 2: clash with work'; }); press();
    ok('N2-L8 the learner asks for another date: Rescheduled, with a history entry', w.pd.session.status === 'Rescheduled' && w.pd.history.some(h => /Alternative requested/.test(h.reason || '')));
    TCH(pk); ACT.pdPostpone({ dataset: { l: AM } }); const mP = !!MODAL && /Postpone/.test(MODAL.title || ''); closeModal();
    ACT.pdPropose({ dataset: { l: AM } }); const at3 = new Date(now().getTime() + 25 * DAY).toISOString().slice(0, 16); $1('#pd-d').value = at3; $1('#pd-m').value = 'Online'; press();
    ok('N2-L8b the existing rule holds: a Rescheduled session isn\'t postponed; the PD assessor proposes the new date (history kept)', !mP && w.pd.session.status === 'Proposed' && w.pd.session.at.slice(0, 16) === at3 && w.pd.history.some(h => h.reason === 'Re-proposed'));
    // Outcome Not Met: back to Action Required with an improvement action; nothing verified
    ACT.pdOutcome({ dataset: { l: AM } }); const k = pdOf(AM).items.filter(i => i[3] === 'Open').findIndex(i => i[0] === bad);
    const rd = $1(`#modal-root input[name="pdo-${k}"][value="Not Met"]`); if (rd) rd.checked = true; const nn = $1('#pdn-' + k); if (nn) nn.value = 'Point 2: not shown in the discussion'; const sg = $1('#pd-sign'); if (sg) sg.checked = true; press();
    ok('N2-L9 the PD assessor records Not Met: the criterion returns to Action Required, not locked; the item is closed with the outcome', crit(w, bad).st === 'Action Required' && !crit(w, bad).lock && it.status !== 'Open' && it.outcome && it.outcome.result === 'Not Met' && it.outcome.by === pdName, J([crit(w, bad).st, it.status, it.outcome]));
    ok('N2-L9b audited with the PD assessor\'s name', ADMIN.audit.some(x => x.action === 'PD outcome recorded' && x.actor === pdName && x.entity.includes(bad)));
    // It can be referred again (a new item; the closed one keeps its outcome); the final outcome stays with the Assessor
    TCH('S'); const n0 = w.pd.items.length, why2 = n2EligWhy(tasSubs(true).find(x => x.key === key), asg, bad), r2 = ACT.n2AddPd({ dataset: { k: key, c: bad } }); closeModal();
    ok('N2-L10 after the PD outcome Not Met the criterion is Action Required again, but its latest published Assessor judgement is the verified Met of the re-marking: not eligible (only a Not Met judgement is); no new item, the closed item keeps its outcome', r2 === false && /judged Met/.test(why2) && w.pd.items.length === n0 && it.outcome.result === 'Not Met', why2);
    ok('N2-L11 the final Pass / Fail is still declared only by the allocated Assessor', (pick(mine.p), ACT.r3Declare({ dataset: { k: key } }), !MODAL) && (closeModal(), TCH('S'), ACT.r3Declare({ dataset: { k: key } }), !!MODAL) && (closeModal(), true));
  });

  await T('N2 points 1A and 1B still hold', async () => {
    ok('N2-15 the 1A gate is loaded and REVISED-1 inactive', typeof n1aDecide === 'function' && p2Active() === 'LEGACY-1');
    ok('N2-16 the 1B purchase path is loaded (details before checkout)', typeof ACT.n1bBuy === 'function' && !!SCREENS['course-info']);
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
