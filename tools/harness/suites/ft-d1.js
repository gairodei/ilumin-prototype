// Batch D1 — the learner-specific observation journey (PD-D-01…09): pinned-version events, the Coordinator's location choice and the
// learner's notice, workplace permission, Academy-office consent + Academic Admin approval per event, allocated-assessor-only proposal
// and recording, the event's own checklist and evidence, sign-off history, one observation fee from the pin, legacy flow unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const q = s => document.querySelector('main ' + s), qa = s => [...document.querySelectorAll('main ' + s)];
  const mroot = () => document.querySelector('#modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'CB11 test') => { const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };
  const fill = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const as = av => () => { setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = as('A'), FA = as('FA'), BA = as('BA');
  const ACA = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const J = o => JSON.stringify(o);
  const radio = (name, v) => { const r = document.querySelector(`#modal-root input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  const tick = (cls, vals) => document.querySelectorAll('#modal-root ' + cls).forEach(x => { if (!x.disabled) x.checked = vals === true || vals.includes(x.value); });
  const add8 = (act, ds, o) => { ACT[act]({ dataset: ds }); fill(o); return prim(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0), blocked = (a0, re) => since(a0).some(x => /^Blocked/.test(x.action) && (!re || re.test(x.action)));
  const rv = id => go('a-programmes', { id, tab: 'review' });
  const blockers = pr => cbRvChecks(pr).block, secs = pr => [...new Set(blockers(pr).map(x => x.sec))].sort().join(',');

  // Section 1: a new course (Level 3 fee-option rows); obs 'yes' / 'no'
  let codeN = 0;
  const make = (o = {}) => {
    go('a-programmes'); ACT.chProgNew(); const n = ++codeN;
    fill({ '#np-t': o.title || 'CB11 Level 3 course ' + n, '#np-l': 'Level 3', '#np-r': 'QN 610/' + (5500 + n) + '/1', '#np-d': '6', '#np-du': 'months' }); INP.r1NpLevel(document.querySelector('#np-l'));
    document.querySelector('#np-code').value = 'CB11C' + n; document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = ACT.cbDetCreate(); closeModal(); return pr;
  };
  const structure = (pr, obs) => {
    const id = pr.id; go('a-programmes', { id, tab: 'structure' });
    add8('ch8AddUnit', { id }, { '#u-c': 'U5' + codeN, '#u-t': 'Person-centred practice' }); add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Core practice', '#m-ab': 'C/651/5' + codeN });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand person-centred care', '#lo-y': 'Knowledge' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Explain person-centred care', '#c-e': 'Written account' });
    if (obs) { add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Deliver person-centred care', '#lo-y': 'Observation' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Show safe moving and handling', '#c-e': 'Observed at work' }); add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Communicate respectfully', '#c-e': 'Observed at work' }); }
  };
  // Section 3: an assignment with a mapped question (new assignments have References and no template)
  const author = (pr, title) => {
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title, '#cna-d': '2026-12-20T21:59' }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    const crit = s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); reason('Publish'); return d;
  };
  // Section 4: locations, evidence for the NVQ criteria, one Academy criterion, two required observation events
  const observations = pr => {
    const id = pr.id; ACT.n5Settings({ dataset: { p: id } }); radio('n5-req', 'yes'); radio('n5-wp', 'Permitted'); radio('n5-off', 'Available'); press();
    const d = n5Draft(pr), nvq = n5NvqOk(pr, d).map(c => c.code);
    nvq.forEach(c => { ACT.n5NvqEv({ dataset: { p: id, c } }); tick('.n5-ev', ['notes', 'photo']); press(); });
    ACT.n5IaEdit({ dataset: { p: id, c: '' } }); if (MODAL) { document.querySelector('#n5-t').value = 'Arrives on time and in uniform'; const dd = document.querySelector('#n5-d'); if (dd) dd.value = 'Punctual and presentable on shift'; tick('.n5-ev', ['notes']); tick('.n5-map', [nvq[0]]); press(); }
    const ia = n5Draft(pr).ia.filter(c => c.status === 'Active').map(c => c.code);
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 1 — moving and handling'; tick('.ev-l', ['workplace']); tick('.ev-c', [nvq[0]].concat(ia)); tick('.ev-e', ['notes', 'photo']); press();
    ACT.cbObsEv({ dataset: { p: id, e: '' } }); document.querySelector('#ev-n').value = 'Observation 2 — communication'; tick('.ev-l', ['workplace', 'office']); tick('.ev-c', [nvq[1]]); tick('.ev-e', ['notes']); press();
    return { nvq, ia };
  };
  // Section 5: workplace / office observation fees (Fully Assisted £70 / £0; Self-Paced £100 / £45.50), payment choices
  const fees = (pr, obs) => {
    const id = pr.id, [a, b] = cb8Work(pr).opts;
    if (obs) [[a, '70', '0'], [b, '100', '45.50']].forEach(([x, wp, off]) => { ACT.cb8Opt({ dataset: { p: id, o: x.id } }); document.querySelector('#modal-root #c8-wp').value = wp; document.querySelector('#modal-root #c8-off').value = off; press(); });
    const payTo = (oid, ks) => { const x = cb8Work(pr).opts.find(y => y.id === oid); x.pay.map(y => y.k).forEach(k => ACT.cb8PayDel({ dataset: { p: id, o: oid, k: String(k) } })); ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: id, o: oid, k: String(k) } })); };
    payTo(a.id, [1, 4, 6]); payTo(b.id, [1, 3]); return { a: a.id, b: b.id };
  };
  // Section 6: offer letter Version 1 and 2 (with {{payment_terms}}), one more checklist item (a new checklist version)
  const documents = pr => {
    const id = pr.id; go('a-programmes', { id, tab: 'letter' });
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); reason('First version');
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); const t = document.querySelector('#lt-x'); t.value = t.value + '\n\nTo confirm your place, please {{payment_terms}}.'; reason('Payment wording added');
    go('a-programmes', { id, tab: 'docs' }); ACT.s4CkAdd({ dataset: { p: id } }); fill({ '#ck-n': 'Care Certificate (if held)', '#ck-f': 'PDF' }); document.querySelector('#ck-m').value = '0'; reason('Optional prior learning');
  };
  const submitAndApprove = pr => {
    go('a-programmes', { id: pr.id, tab: 'fees' }); ACT.cb8Submit({ dataset: { p: pr.id } }); if (MODAL) press();
    const qid = cb8Wf(pr).qid; FA(); go('a-queue', { id: qid }); ACT.e1Decide({ dataset: { id: qid, a: 'approve' } }); if (MODAL) reason('Checked against the price list'); return qid;
  };
  const batch = (pr, code) => {
    ACA(); go('a-batches'); ACT.newBatch(); fill({ '#nb-c': code }); const co = document.querySelector('#nb-co'); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); prim(); closeModal();
    const bt = ADMIN.batches.find(x => x.code === code); if (bt) { bt.start = D(40, '09:00'); bt.end = D(240, '17:00'); } return bt;
  };
  const signUp = (v, pr, bt, optId, k) => {
    learner(v); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } });
    const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${optId}"]`); if (r) r.checked = true; prim(); closeModal();
    const w = W; chSetBatch(w, bt); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, bt);
    setUi('cb9Pay', String(k)); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; } if (g) g.onSuccess(g.amount, 'TXN-CB11-' + v); closeModal();
    return w;
  };
  const rows = w => { const p = w.plans.find(x => x.e === 'nvq'); return p ? p.rows.map(r => [cbYmdOf(r.due), r.amount, r.status]) : null; };

  /* ================= CB12-F: financial approval precedes publication ================= */
  // A published Level 3 package programme (observations Yes or No), its package approved by Finance, one batch, one learner signed and paid
  const published = obs => {
    ACA(); const pr = make({ obs }); structure(pr, obs); author(pr, 'CBF assignment ' + codeN); if (obs) observations(pr); const fx = fees(pr, obs); documents(pr);
    submitAndApprove(pr); ACA(); ACT.cbPublish({ dataset: { id: pr.id } }); reason('Ready');
    const bt = batch(pr, 'CBF-' + codeN), w = signUp('A', pr, bt, fx.a, 4); ACA();
    return { pr, ...fx, bt, w };
  };
  const snap = w => J({ s: w.signup, p: w.plans });
  const newVersion = pr => { ACA(); ACT.s3WizVersion({ dataset: { id: pr.id } }); reason('2028 changes'); };
  const answer = (pr, yes) => { go('a-programmes', { id: pr.id, tab: 'details' }); document.querySelector('main #np-obs-' + (yes ? 'yes' : 'no')).checked = true; ACT.cbObsSave({ dataset: { id: pr.id } }); };
  const settings = (pr, wp, off) => { ACT.n5Settings({ dataset: { p: pr.id } }); if (!MODAL) return false; radio('n5-req', 'yes'); if (wp) radio('n5-wp', wp); if (off) radio('n5-off', off); press(); return true; };
  const gate = pr => blockers(pr).filter(x => x.sec === 'payments');
  const wf = pr => cb8Wf(pr), planV = pr => (s4PlanCur(pr.id) || {}).v;
  const tryPublish = (pr, how) => { const a0 = ADMIN.audit.length, v0 = pr.version; ACT[how]({ dataset: { id: pr.id } }); const refused = !MODAL || /Can't publish/.test(MODAL.title); if (MODAL && /^Publish/.test(MODAL.title)) closeModal(); else closeModal(); return { refused: refused && pr.version === v0, logged: blocked(a0, /publish/) }; };

  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const TAS = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  // A published Level 3 programme (two events: EV-1 workplace only; EV-2 workplace or office), an enrolled learner, Sarah as observation assessor
  const setup = () => {
    const P = published(true), b = P.bt; b.assessors = ['Sarah Okonkwo']; delete chAllocs()[b.code]; touch(b.code); syncTasBatches();
    const ctx = dCtx(P.w); return { ...P, lid: P.w.me.id, ctx, c1: dEvCrit(ctx, ctx.evs[0]).nvq[0], c2: dEvCrit(ctx, ctx.evs[1]).nvq[0] };
  };
  const choose = (P, ev, loc) => { COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); const s = document.getElementById('d-loc-' + ev); if (s) s.value = loc; ACT.dObsLoc({ dataset: { l: P.lid, e: ev } }); };
  const propose = (P, ev, at = D(12, '10:00')) => { TAS('A'); ACT.obPropose({ dataset: { l: P.lid } }); if (!MODAL) return 'no dialog'; document.querySelector('#op-l').value = P.lid; INP.obPerm(document.querySelector('#op-l')); const s = document.getElementById('d-ev-s'); if (s && ev) { s.value = ev; INP.dEvPick(s); } document.querySelector('#op-d').value = at.slice(0, 16); const r = prim(); if (r !== false) closeModal(); else closeModal(); return r; };
  const recOf = (P, ev) => P.w.observations.find(o => o.dEv === ev && o.status !== 'Cancelled');
  const wk = P => P.w.v || chWorldKey(P.lid);
  const accept = (P, o) => { learner(wk(P)); ACT.obsAccept({ dataset: { id: o.id } }); prim(); closeModal(); };
  const rowId = (P, o) => wk(P) + '-' + o.id;

  await T('D1-A requirements from the pinned version; Coordinator chooses locations', async () => {
    fresh(); const P = setup(), s0 = J({ s: P.w.signup, p: P.w.plans });
    ok('D1-A the learner\'s requirements come from their pinned version: two events, with each event\'s permitted locations', !!P.ctx && P.ctx.v === P.w.nvq.progVersion && P.ctx.evs.length === 2 && J(dLocs(P.ctx, P.ctx.evs[0])) === J(['workplace']) && J(dLocs(P.ctx, P.ctx.evs[1])) === J(['workplace', 'office']));
    COO('A'); go('c-learner', { id: P.lid, tab: 'observations' });
    ok('D1-A the Coordinator\'s Observations tab lists both events "Location to be chosen", with a location picker each', qa('.d-coord tbody tr').length === 2 && (main().match(/Location to be chosen/g) || []).length === 2 && !!q('#d-loc-EV-1') && !!q('#d-loc-EV-2'));
    ok('D1-A the picker offers only the permitted locations (EV-1: workplace only)', [...q('#d-loc-EV-1').options].map(o => o.value).filter(Boolean).join() === 'workplace');
    const n0 = P.w.notifs.length; choose(P, 'EV-1', 'workplace');
    ok('D1-A choosing EV-1 → Workplace: saved, audited, the learner is told', dSel(P.w, 'EV-1').loc === 'workplace' && dSel(P.w, 'EV-1').by === 'Dr Helen Carter' && ADMIN.audit.some(a => a.action === 'Observation location chosen') && P.w.notifs.length === n0 + 1 && /Observation location chosen/.test(P.w.notifs[0].title));
    const a0 = ADMIN.audit.length; COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); ACT.dObsLoc({ dataset: { l: P.lid, e: 'EV-2', loc: 'nowhere' } });
    ok('D1-A (negative) a location the event doesn\'t permit is refused (logged)', !dSel(P.w, 'EV-2') && blocked(a0, /location/));
    SA(); const a1 = ADMIN.audit.length; ACT.dObsLoc({ dataset: { l: P.lid, e: 'EV-2', loc: 'workplace' } });
    ok('D1-A (negative) an administrator (not the learner\'s Coordinator) can\'t choose the location (refused, logged)', !dSel(P.w, 'EV-2') && blocked(a1, /location/));
    learner(wk(P)); go('observations'); ok('D1-A the learner sees their required observations, EV-1 at the workplace, EV-2 not chosen yet', !!q('.d-learner') && /Location: Workplace/.test(q('.d-learner [data-e="EV-1"]').textContent) && /Location not chosen yet/.test(q('.d-learner [data-e="EV-2"]').textContent));
    ok('D1-A no financial or signed-letter record changed', J({ s: P.w.signup, p: P.w.plans }) === s0);
  });

  await T('D1-B workplace event: allocated assessor proposes, learner confirms, the event checklist, sign-off', async () => {
    fresh(); const P = setup(); choose(P, 'EV-1', 'workplace');
    TAS('S'); ACT.obPropose({ dataset: { l: P.lid } }); const refused = !MODAL; closeModal();
    ok('D1-B (negative) another assessor (not allocated) can\'t propose for this learner', refused);
    TAS('T'); ok('D1-B (negative) the Teacher-only persona has no observation list for this learner', !tasObs().some(o => o.lid === P.lid));
    TAS('A'); ACT.obPropose({ dataset: { l: P.lid } }); document.querySelector('#op-l').value = P.lid; INP.obPerm(document.querySelector('#op-l'));
    const fs = document.querySelector('#modal-root .op-c').closest('fieldset'), iaBox = document.getElementById('op-ia');
    ok('D1-B the proposal dialog shows the event picker and hides the free criteria list and the default Academy criteria (not displayed)', !!document.getElementById('d-ev-s') && getComputedStyle(fs).display === 'none' && (!iaBox || getComputedStyle(iaBox).display === 'none')); closeModal();
    propose(P, 'EV-1'); const o = recOf(P, 'EV-1');
    ok('D1-B Sarah (allocated observation assessor) proposes EV-1: tied to the event, version and workplace; scope = the event\'s NVQ criteria; Academy criteria of the version', !!o && o.status === 'Proposed' && o.dV === P.ctx.v && o.locType === 'work' && o.scope === P.c1 && J(o.dIa) === J(['IA-16']) && o.loc === P.w.workplace.name, J(o));
    TAS('A'); ok('D1-B the proposal is in Sarah\'s observation list (before, only the seeded learner\'s were)', !!o && tasObs().some(x => x.id === rowId(P, o)));
    TAS('S'); ok('D1-B …and not in another assessor\'s list', !!o && !tasObs().some(x => x.id === rowId(P, o)));
    if (!o) return;
    const f0 = chFees().filter(f => f.lid === P.lid).length; accept(P, o); render();
    ok('D1-B the learner accepts: Confirmed; one observation fee raised from their pinned terms (Fully Assisted, workplace £70)', o.status === 'Confirmed' && chFees().filter(f => f.lid === P.lid).length === f0 + 1 && chFees().find(f => f.lid === P.lid).amount === 70, J(chFees().filter(f => f.lid === P.lid)));
    TAS('A'); go('t-obsrec', { id: rowId(P, o) });
    ok('D1-B the record checklist is the event\'s own: the NVQ criterion of the event with its evidence requirement, IA-16 (Academy), evidence permitted "Assessor notes"', !!q('.d-rec') && qa('.d-rec .obs-card').length === 2 && main().includes(P.c1) && /Evidence requirement: Observed at work/.test(main()) && /IA-16/.test(main()) && /Evidence permitted: Assessor notes/.test(main()) && !/IA-1 /.test(main()));
    ACT.orSign({ dataset: { id: rowId(P, o) } }); ok('D1-B (negative) sign-off refused until every criterion is set', o.status === 'Confirmed' && !MODAL);
    [['nvq', P.c1], ['ia', 'IA-16']].forEach(([s, c]) => { ['o', 'c'].forEach(k => ACT.orT({ dataset: { s, c, k, v: '1' } })); });
    ACT.orSign({ dataset: { id: rowId(P, o) } }); ok('D1-B (negative) …and until the evidence recorded is ticked', o.status === 'Confirmed' && !MODAL);
    document.querySelector('main .d-evt').checked = true; INP.dEvt(); ACT.orSign({ dataset: { id: rowId(P, o) } }); prim(); closeModal();
    const crit = P.w.tree.flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))).find(c => c.code === P.c1);
    ok('D1-B signed off: Completed and locked, with the event, version, location, criteria results and evidence; the criterion Achieved', o.status === 'Completed' && o.report.dEv.id === 'EV-1' && o.report.dEv.v === P.ctx.v && o.report.dEv.loc === 'workplace' && J(o.report.dEv.types) === J(['notes']) && o.report.nvq[0][0] === P.c1 && o.report.ia[0][0] === 'IA-16' && crit.st === 'Achieved' && !!crit.lock);
    go('t-obsrec', { id: rowId(P, o) }); ok('D1-B the completed report shows the event, version and location', /Observation 1 — moving and handling/.test(main()) && /Version 1/.test(main()) && !!q('.d-recmeta') && /Workplace/.test(q('.d-recmeta').textContent));
    COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); ok('D1-B the Coordinator sees EV-1 Completed and can no longer change its location', /Completed/.test(q('.d-coord [data-e="EV-1"]').textContent) && !q('#d-loc-EV-1'));
    const a2 = ADMIN.audit.length; ACT.dObsLoc({ dataset: { l: P.lid, e: 'EV-1', loc: 'workplace' } }); ok('D1-B (negative) changing a completed event\'s location is refused', blocked(a2, /location/));
  });

  await T('D1-C Academy-office event: consent, Academic Admin approval, booking, one fee', async () => {
    fresh(); const P = setup(); choose(P, 'EV-2', 'office');
    const rq = dReq(P.w, P.ctx.evs[1]);
    ok('D1-C choosing EV-2 → Academy office raises the existing office request for that event, awaiting the learner\'s agreement', !!rq && rq.dEv === 'EV-2' && rq.status === 'Awaiting consent' && rq.source === 'coord');
    propose(P, 'EV-2'); ok('D1-C (negative) the assessor can\'t propose it before consent and approval', !recOf(P, 'EV-2'));
    learner(wk(P)); go('observations'); ok('D1-C the learner sees "Agree to the Academy office" on EV-2', !!q('.d-learner [data-e="EV-2"] [data-act="chOrConsent"][data-a="accept"]'));
    ok('D1-C …once only: the older free-standing office card is not shown to a learner on the event journey', qa('[data-act="chOrConsent"][data-a="accept"]').length === 1 && !q('.ch-orcard'));
    ACT.chOrConsent({ dataset: { id: rq.id, a: 'accept' } }); prim(); closeModal();
    ok('D1-C the learner agrees: the request goes to the Academic Admin (PD-W0-05), not the Coordinator', rq.status === 'Pending approval' && qItem(rq.qid).first === 'Rachel Hughes');
    COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); const a0 = ADMIN.audit.length; ACT.dObsLoc({ dataset: { l: P.lid, e: 'EV-2', loc: 'workplace' } });
    ok('D1-C (negative) the location can\'t change while the request is with the Academic Admin', dSel(P.w, 'EV-2').loc === 'office' && blocked(a0, /location/));
    ACA(); ACT.qDo({ dataset: { id: rq.qid, a: 'approve' } }); reason('Agreed.');
    ok('D1-C the Academic Admin approves', rq.status === 'Approved');
    propose(P, 'EV-2'); const o = recOf(P, 'EV-2');
    ok('D1-C the assessor proposes EV-2 at the Academy office: tied to the event; NVQ criteria only; the request is Booked', !!o && o.locType === 'office' && o.scope === P.c2 && J(o.dIa) === J([]) && rq.status === 'Booked' && o.chReq === rq.id, J(o) + ' ' + rq.status);
    if (!o) return;
    accept(P, o); render(); const fees = chFees().filter(f => f.lid === P.lid);
    ok('D1-C confirmed: the first observation is at the office, where the learner\'s agreed fee is £0 — no charge recorded, nothing to pay', fees.length === 0 && !!P.w.cb9Obs && P.w.cb9Obs.amount === 0, J(fees) + J(P.w.cb9Obs));
    choose(P, 'EV-1', 'workplace'); propose(P, 'EV-1', D(20, '10:00')); const o1 = recOf(P, 'EV-1'); if (o1) accept(P, o1); render();
    ok('D1-C a second confirmed observation (workplace) raises no fee afterwards (one decision per learner per course)', !!o1 && o1.status === 'Confirmed' && chFees().filter(f => f.lid === P.lid).length === 0 && P.w.cb9Obs.loc === 'off');
    TAS('A'); go('t-obsrec', { id: rowId(P, o) }); ok('D1-C the office record checklist has the NVQ criterion only', qa('.d-rec .obs-card').length === 1 && /NVQ criteria only/.test(main()));
  });

  await T('D1-D workplace permission and the legacy flow', async () => {
    fresh(); const P = setup(); P.w.workplace.perm = 'Permission Pending'; choose(P, 'EV-1', 'workplace');
    COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); ok('D1-D without workplace permission the event waits: "Waiting for workplace permission"', /Waiting for workplace permission/.test(q('.d-coord [data-e="EV-1"]').textContent));
    propose(P, 'EV-1'); ok('D1-D (negative) the assessor can\'t propose a workplace observation without permission', !recOf(P, 'EV-1'));
    P.w.workplace.perm = 'Granted'; propose(P, 'EV-1'); ok('D1-D once permission is granted, it can be proposed', !!recOf(P, 'EV-1'));
    const C = STORE.worlds.C; ok('D1-D the seeded learner\'s version has no recorded events: the existing flow applies', !dCtx(C));
    TAS('A'); ACT.obPropose({ dataset: { l: C.me.id } }); document.querySelector('#op-l').value = C.me.id; INP.obPerm(document.querySelector('#op-l'));
    ok('D1-D …the proposal dialog keeps its criteria list for the seeded learner (no event picker)', !document.getElementById('d-ev-s') && !!document.querySelector('#modal-root .op-c') && !document.querySelector('#modal-root .op-c').closest('fieldset').hidden);
    const n0 = C.observations.length; document.querySelector('#op-d').value = D(25, '10:00').slice(0, 16); prim(); closeModal();
    ok('D1-D …and still creates a proposal as before', C.observations.length === n0 + 1 && !C.observations[0].dEv);
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
