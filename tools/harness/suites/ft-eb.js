// Batch E-B — access control, batch eligibility and integration (PD-E-10…18): IQA scope and findings, IQA sees every learner's work,
// agency roster and bundles, batch eligibility, G4 for every deciding verb, cross-learner / programme isolation, stale links.
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
  // The learner's own workplace and contact, sent through the permission request (secure link); grant or not
  const wpEnter = (v, o) => { learner(v); go('observations', { tab: 'workplace' }); fill({ '#wp-name': o.home, '#wp-addr': o.addr || '1 Demo Street, Leeds', '#wp-pc': 'ZZ99 9ZZ', '#wp-cn': o.cname, '#wp-ce': o.cemail, '#wp-cp': '0113 496 0000', '#wp-role': 'Care Assistant', '#wp-shift': 'Days' }); SUBMIT.wpSave(); wpcSync(); return STORE.wpc.links.find(l => l.v === v && l.kind === 'perm' && l.status === 'Active') || null; };
  const wpGrant = (l, sig) => { if (!l) return false; go('w-permission', { id: l.token, tab: 'grant' }); const d = STORE.wpc.drafts[l.token]; if (!d) return false; Object.assign(d, { auth: true, agree: true, sig: sig || l.contact.name }); SUBMIT.wpcGrant({ dataset: { t: l.token } }); return true; };
  const setup = (o = { home: 'Brookfield House (demo)', cname: 'Ms Ruth Allen', cemail: 'r.allen@brookfield.example' }, grant = true) => {
    const P = published(true), b = P.bt; b.assessors = ['Sarah Okonkwo']; delete chAllocs()[b.code]; touch(b.code); syncTasBatches();
    // D1-F (PD-D-16): a new learner no longer inherits the seeded "Granted" workplace — was: none needed
    const l = wpEnter(wk({ w: P.w, lid: P.w.me.id }), o); if (grant) wpGrant(l); P.link = l;
    const ctx = dCtx(P.w); return { ...P, lid: P.w.me.id, ctx, c1: dEvCrit(ctx, ctx.evs[0]).nvq[0], c2: dEvCrit(ctx, ctx.evs[1]).nvq[0] };
  };
  const choose = (P, ev, loc) => { COO('A'); go('c-learner', { id: P.lid, tab: 'observations' }); const s = document.getElementById('d-loc-' + ev); if (s) s.value = loc; ACT.dObsLoc({ dataset: { l: P.lid, e: ev } }); };
  const propose = (P, ev, at = D(12, '10:00')) => { TAS('A'); ACT.obPropose({ dataset: { l: P.lid } }); if (!MODAL) return 'no dialog'; document.querySelector('#op-l').value = P.lid; INP.obPerm(document.querySelector('#op-l')); const s = document.getElementById('d-ev-s'); if (s && ev) { s.value = ev; INP.dEvPick(s); } document.querySelector('#op-d').value = at.slice(0, 16); const r = prim(); if (r !== false) closeModal(); else closeModal(); return r; };
  const recOf = (P, ev) => P.w.observations.find(o => o.dEv === ev && o.status !== 'Cancelled');
  const wk = P => P.w.v || chWorldKey(P.lid);
  const accept = (P, o) => { learner(wk(P)); ACT.obsAccept({ dataset: { id: o.id } }); prim(); closeModal(); };
  const rowId = (P, o) => wk(P) + '-' + o.id;

  const sec0 = () => ADMIN.security.length;
  const IQA = k => { iqaEnter(k); S.signedIn = true; S.ui = {}; };

  await T('EB-A IQA scope and findings', async () => {
    fresh(); IQA('QA'); const me = ADMIN.me.name, recs = allIqaRecords(), free = recs.find(r => !iqaConflict(r));
    const other = ADMIN.iqa.find(f => f.by !== me && f.status !== 'Closed');
    const s0 = sec0(); ACT.qEditF({ dataset: { id: other.id } });
    ok('EB-A (negative) an IQA can\'t edit another IQA\'s finding (refused, logged as a security event)', !MODAL && sec0() === s0 + 1 && /edit an IQA finding/.test(ADMIN.audit[0].action));
    ACT.qRecord({ dataset: { id: free.id } }); const d = STORE.iqa.drafts[free.id]; Object.assign(d, { text: 'Feedback does not reference the criterion.', cat: F_CATS[0] }); prim(); closeModal();
    const mine = ADMIN.iqa.find(f => f.by === me && f.rec === free.id);
    ok('EB-A the IQA records a finding on work outside their allocations', !!mine && mine.status === 'Open');
    ACT.qEditF({ dataset: { id: mine.id } }); ok('EB-A …and can edit their own finding', !!MODAL); closeModal();
    ACT.qClose({ dataset: { id: mine.id } }); reason('Assessor updated the feedback.'); ok('EB-A …and close it', mine.status === 'Closed');
    const s1 = sec0(); ACT.qEditF({ dataset: { id: mine.id } }); ACT.qClose({ dataset: { id: mine.id } });
    ok('EB-A (negative) a closed finding can\'t be edited or closed again (both logged)', !MODAL && sec0() === s1 + 2);
    IQA('QC'); const conf = allIqaRecords().find(r => iqaConflict(r)), s2 = sec0(); qAddToSet([conf.id]);
    ok('EB-A (negative) an IQA can\'t add work from a batch where they hold an allocation to a sample set (conflict rule, logged)', !MODAL && sec0() === s2 + 1 && /add to a sample set/.test(ADMIN.audit[0].action));
    const cf = ADMIN.iqa.find(f => f.status !== 'Closed' && iqaConflict(fRec(f))); if (cf) { const s3 = sec0(); ACT.qClose({ dataset: { id: cf.id } }); ok('EB-A (negative) …nor close a finding on such work', !MODAL && sec0() === s3 + 1 && cf.status !== 'Closed'); }
    SA(); const s4 = sec0(); ACT.qRecord({ dataset: { id: free.id } }); ACT.qClose({ dataset: { id: other.id } }); ACT.qNewSet({ dataset: {} });
    ok('EB-A (negative) a non-IQA (Super Admin) can\'t record, close or create sample sets (3 logged)', !MODAL && sec0() === s4 + 3 && other.status !== 'Closed');
    FA(); const s5 = sec0(); ACT.qRecord({ dataset: { id: free.id } }); ok('EB-A (negative) Finance can\'t either', !MODAL && sec0() === s5 + 1);
  });

  await T('EB-A2 IQA sees every enrolled learner\'s work', async () => {
    fresh(); const P = setup(); choose(P, 'EV-1', 'workplace'); propose(P, 'EV-1'); const o = recOf(P, 'EV-1'); accept(P, o);
    TAS('A'); go('t-obsrec', { id: rowId(P, o) }); [['nvq', P.c1], ['ia', 'IA-16']].forEach(([s, c]) => ['o', 'c'].forEach(k => ACT.orT({ dataset: { s, c, k, v: '1' } }))); document.querySelector('main .d-evt').checked = true; INP.dEvt(); ACT.orSign({ dataset: { id: rowId(P, o) } }); prim(); closeModal();
    IQA('QA'); const r = recById('L-' + wk(P) + '-' + o.id);
    ok('EB-A2 a new learner\'s signed-off observation is in the IQA records (before: seeded learners only), with programme, level and assessor', !!r && r.kind === 'obs' && r.lid === P.lid && r.pk === 'L3' && r.assessor === 'Sarah Okonkwo' && /Observation 1/.test(r.title));
    go('q-record', { id: r.id }); ok('EB-A2 …and opens', !/Error 404/.test(main()) && main().includes(chFullName(P.w)));
  });

  await T('EB-B agency roster and bundles', async () => {
    fresh(); agyEnter('AG-02', true); const out = allLearners().find(l => !inRoster(l.id)), mineL = agyRoster()[0], n0 = STORE.agy.lmails.length, s0 = sec0();
    ACT.agResendPw({ dataset: { id: out.id } }); ACT.agCorrect({ dataset: { id: out.id } });
    ok('EB-B (negative) set-password resend and correction requests for a learner outside the roster are refused (logged x2)', STORE.agy.lmails.length === n0 && !MODAL && sec0() === s0 + 2);
    ACT.agResendPw({ dataset: { id: mineL.id } }); ok('EB-B …allowed for the agency\'s own learner', STORE.agy.lmails.length === n0 + 1);
    const theirs = ADMIN.bundles.find(b => b.agency !== AGN() && b.courses), s1 = sec0(), n = agyDoAssign(theirs, theirs.courses[0], [mineL.id], true);
    ok('EB-B (negative) seats can\'t come from another agency\'s bundle', n === 0 && sec0() === s1 + 1);
    const own = agyBundles().find(b => left(b) > 0), s2 = sec0(), n2 = own ? agyDoAssign(own, own.courses[0], [out.id], true) : 0;
    ok('EB-B (negative) seats can\'t be assigned to a learner outside the roster', n2 === 0 && sec0() === s2 + 1);
    go('g-learner', { id: out.id }); ok('EB-B (negative) the agency can\'t open a learner outside its roster', !main().includes(out.email));
  });

  await T('EB-C batch eligibility', async () => {
    fresh(); const P = setup(), b = P.bt;
    learner('F'); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === P.pr.title); ACT.applyNvq({ dataset: { id: c.id } }); const rr = document.querySelector(`#modal-root input[name="r1-opt"][value="${P.b}"]`); if (rr) rr.checked = true; prim(); closeModal(); const F = STORE.worlds.F;
    ok('EB-C (setup) F has started, not completed, a sign-up for this programme', !!F.signup && !F.signup.done && chProgOf(F).id === P.pr.id);
    ACA(); ACT.addToBatch({ dataset: { id: b.code } }); const sel = document.querySelector('#modal-root #ab-l'); sel.insertAdjacentHTML('beforeend', `<option value="${F.me.id}">F</option>`); sel.value = F.me.id; const o = document.querySelector('#modal-root #r2-ab-o'); if (o && o.options[1]) o.value = o.options[1].value;
    const e0 = b.enrolled, a0 = ADMIN.audit.length; prim();
    ok('EB-C (negative) a learner whose sign-up isn\'t complete can\'t be added to a batch (refused, logged)', b.enrolled === e0 && !(b.roster || []).some(r => r[1] === F.me.id) && blocked(a0, /not eligible/), J([MODAL && MODAL.title, b.enrolled, e0, ADMIN.audit.slice(0, 3).map(x => x.action), eEligWhy(b, F.me.id)])); closeModal();
    const t2 = 'Level 2 Diploma in Care (England)', t3 = 'Level 3 Diploma in Adult Care (England)';
    const L2 = ADMIN.learners.find(l => l.acct === 'Active' && l.rec === 'Active' && (l._enr || []).some(e => e.title === t2 && e.status === 'Active'));
    const b3 = ADMIN.batches.find(x => x.course === t3 && ['Open', 'Planned'].includes(x.status) && x.enrolled < x.cap);
    if (L2 && b3) { ACT.addToBatch({ dataset: { id: b3.code } }); const s = document.querySelector('#modal-root #ab-l'); if (![...s.options].some(x => x.value === L2.id)) s.insertAdjacentHTML('beforeend', `<option value="${L2.id}">x</option>`); s.value = L2.id; const oo = document.querySelector('#modal-root #r2-ab-o'); if (oo && oo.options[1]) oo.value = oo.options[1].value; const a1 = ADMIN.audit.length; prim();
      ok('EB-C (negative) a learner enrolled on Level 2 can\'t be added to a Level 3 batch', !batchRoster(b3).some(r => r[1] === L2.id) && blocked(a1, /not eligible/)); closeModal(); }
    const b2 = ADMIN.batches.find(x => x.course === t2 && ['Open', 'Planned'].includes(x.status) && x.enrolled < x.cap);
    if (L2 && b2 && !batchRoster(b2).some(r => r[1] === L2.id)) { ACT.addToBatch({ dataset: { id: b2.code } }); const s = document.querySelector('#modal-root #ab-l'); if (![...s.options].some(x => x.value === L2.id)) s.insertAdjacentHTML('beforeend', `<option value="${L2.id}">x</option>`); s.value = L2.id; const r = prim(); if (MODAL) closeModal();
      ok('EB-C …but can be added to a Level 2 batch (positive)', batchRoster(b2).some(x => x[1] === L2.id) || (b2.w1wait || []).length > 0 || r !== false); }
    const b4 = ADMIN.batches.find(x => x.course === 'Level 4 Diploma in Adult Care (England)'); if (b4) { const s0 = sec0(); ACT.kOffer({ dataset: { id: b4.code, n: 'Someone' } }); ok('EB-C (negative) no waitlist offer for a Suspended programme\'s batch', !MODAL && sec0() === s0 + 1); }
  });

  await T('EB-D G4 separation of duties', async () => {
    fresh(); SA(); const me = ADMIN.me.name, i = { id: 'AQ-EB01', type: 'Data correction', raisedBy: me, raised: now().toISOString(), status: 'Pending', first: 'Rachel Hughes', related: [], notes: [], reason: 'EB', history: [[me, now().toISOString(), 'Raised', 'EB']], data: {} };
    ADMIN.queue.unshift(i); ['reject', 'return', 'decline'].forEach(a => ok(`EB-D (negative) the raiser can't "${a}" their own item (decision path refuses)`, applyDecision(i, a, 'x', {}) === false && i.status === 'Pending'));
    const a0 = ADMIN.audit.length; ACT.qDo({ dataset: { id: i.id, a: 'reject' } }); ok('EB-D (negative) …and the dialog isn\'t opened; the refusal is logged', !MODAL && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Blocked: self-approval'));
    ACA(); ok('EB-D another person isn\'t self-blocked', !decisionBlocked(i, 'reject'));
  });

  await T('EB-E cross-learner and cross-programme isolation', async () => {
    fresh(); const P = setup(); choose(P, 'EV-1', 'workplace'); propose(P, 'EV-1'); const o = recOf(P, 'EV-1');
    COO('B'); go('c-learner', { id: P.lid }); ok('EB-E (negative) a Coordinator of another batch can\'t open the learner', !main().includes(P.w.me.email) && !q('.d-coord'));
    TAS('S'); go('t-obsrec', { id: rowId(P, o) }); ok('EB-E (negative) an unallocated assessor can\'t open the learner\'s observation', !q('.d-rec') && !main().includes('Observation 1 — moving and handling'));
    TAS('T'); ok('EB-E (negative) the Teacher-only persona has no observation access for the learner', !tasObs().some(x => x.lid === P.lid));
    learner('C'); go('observations'); ok('EB-E (negative) another learner (Aisha) sees none of this learner\'s observations', !main().includes('Observation 1 — moving and handling') && !main().includes(chFullName(P.w)));
    const t = P.link.token; go('w-permission', { id: t }); const other = STORE.wpc.links.find(l => l.v === 'C' && l.kind === 'perm');
    ok('EB-E the workplace token shows only its own learner (not Aisha)', main().includes(chFullName(P.w)) && !main().includes(VNAME('C')) && other.token !== t);
  });

  await T('EB-F stale links', async () => {
    fresh(); SA(); go('a-batches', { id: 'GONE-404' });
    ok('EB-F a link to a batch that no longer exists opens the Batches list with a note — no 404, no other batch', !/Error 404/.test(main()) && !!q('.e-gone') && /Batches/.test(q('h1').textContent) && q('.page-h').nextElementSibling === q('.e-gone'));
    go('a-learner', { id: 'IA-L-00000' }); ok('EB-F …the same for a learner record', !/Error 404/.test(main()) && !!q('.e-gone'));
    FA(); go('a-programmes', { id: 'NV-L3' }); ok('EB-F a permission page stays a permission page (Finance on NVQ Programmes)', !q('.e-gone'));
  });
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
