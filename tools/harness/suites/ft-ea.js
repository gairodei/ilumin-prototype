// Batch E-A — programme lifecycle: archive (PD-E-01…09). Archive with live learners (active batch and classes, outstanding payments,
// signed letters, pending observation, a sign-up in progress); nothing new starts by any route; existing learners carry on;
// permissions; Retired / Suspended unchanged; validated reactivation.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // CR (PD-CR-01, PD-CR-06, PD-CR-12): Course Details asks for the delivery modes offered — Level 3: both (any mode, as
  // before); other levels: the mode of their old default (Support type) — and no longer for a course code; publishing asks for each chosen batch's deadline.
  const crT = f => (...a) => { const l3 = (document.querySelector('main #np-l') || {}).value === 'Level 3', rows = [...document.querySelectorAll('main .r1-np-m')].map(x => x.value).filter(Boolean); document.querySelectorAll('main .cr-dm-c').forEach(x => { const sup = (document.querySelector('main input[name="np-s"]:checked') || {}).value === 'Self-paced' ? 'Self-Paced' : 'Fully Assisted'; x.checked = l3 || x.value === sup; }); return f(...a); };
  const crPd = (v = '2026-12-20T21:59') => document.querySelectorAll('#modal-root .cr-pd').forEach(x => { if (!x.value) x.value = v; });
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
    (document.querySelector('#np-code') || {}).value = 'CB11C' + n; document.querySelector('#np-obs-' + (o.obs ? 'yes' : 'no')).checked = true;
    [{ l: 'Fully Assisted — standard', f: 2400, m: 'Fully Assisted' }, { l: 'Self-Paced — standard', f: 1800, m: 'Self-Paced' }].forEach((x, k) => { if (k) ACT.r1NpAdd(); const r = document.querySelectorAll('main .r1-np-row')[k]; r.querySelector('.r1-np-l').value = x.l; r.querySelector('.r1-np-f').value = String(x.f); r.querySelector('.r1-np-m').value = x.m; });
    const pr = crT(ACT.cbDetCreate)(); closeModal(); return pr;
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
    fill({ '#cna-t': title }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Explain why person-centred care matters.', '#aq-ev': 'A real example from your workplace', '#aq-n': '2' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    const crit = s2Crit(d).find(c => c.type === 'Knowledge').code; INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: crit } });
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); reason('Publish'); return d;
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

  // A published Level 3 programme with: one active batch with an upcoming weekly class; learner A enrolled (4 payments, payment 1 paid,
  // three outstanding), signed letter, workplace granted, an observation proposed and an assignment published to them;
  // learner F mid-sign-up (not completed); a waitlist; an agency bundle that includes the programme.
  const scene = () => {
    const P = setup(), pr = P.pr, b = P.bt;
    ACA(); ACT.n3Weekly({ dataset: { b: b.code } }); if (MODAL) { const set = { '#n3-wd': 'Thursday', '#n3-t': '18:00', '#n3-m': '60', '#n3-te': 'Marcus Bell', '#n3-f': b.start.slice(0, 10), '#n3-to': new Date(new Date(b.start).getTime() + 21 * DAY).toISOString().slice(0, 10), '#n3-n': 'Weekly class', '#n3-r': 'Timetable' }; Object.entries(set).forEach(([k, v]) => { const e = document.querySelector(k); if (e) e.value = v; }); document.querySelectorAll('#modal-root .r2-g').forEach(x => { x.checked = true; }); prim(); prim(); if (MODAL) closeModal(); }
    choose(P, 'EV-1', 'workplace'); propose(P, 'EV-1');
    learner('F'); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); const r = document.querySelector(`#modal-root input[name="r1-opt"][value="${P.b}"]`); if (r) r.checked = true; prim(); closeModal();
    { const w = W; chSetBatch(w, b); ACT.suNext(); w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(w, b); }
    b.wait = 1; STORE.biz.products.push({ id: 'CAT-EA', name: 'EA bundle', courses: [pr.title], seats: 5, days: 365, desc: '', mode: 'auto', pct: null, slabs: null, customTotal: null, cur: 'GBP', agency: null, status: 'Published', version: 1, history: [] });
    return { ...P, wF: STORE.worlds.F };
  };
  const archive = (pr, r = 'Programme replaced by the 2028 specification') => { ACA(); ACT.eArchive({ dataset: { id: pr.id } }); if (!MODAL) return false; return reason(r); };
  const snapL = w => J({ s: w.signup, p: w.plans, a: w.assignments.map(x => [x.id, x.status]), o: w.observations.map(x => [x.id, x.status]), wp: w.workplace.perm, nvq: w.nvq.progVersion });

  await T('EA-A archive with live learners', async () => {
    fresh(); const P = scene(), pr = P.pr, A = P.w, F = P.wF, b = P.bt, sess0 = s4bSess(b.code).length, sA = snapL(A), let0 = J(chLetters(pr.id)), pkg0 = J(s4Plans(pr.id));
    ok('EA-A (setup) active batch with upcoming classes; A enrolled with three payments outstanding and a signed letter; an observation proposed; F mid-sign-up', sess0 > 0 && A.signup.done && !!A.signup.sig && A.plans.find(x => x.e === 'nvq').rows.filter(r => r.status !== 'Paid').length === 3 && A.observations.some(o => o.status === 'Proposed') && F.signup && !F.signup.done, `sess ${sess0}`);
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); ok('EA-A the programme page offers "Archive…" to an Academic Admin', !!q('.cb-vb [data-act="eArchive"]'));
    ACT.eArchive({ dataset: { id: pr.id } }); ok('EA-A the archive dialog shows the impact: 1 active batch continues, learners continue, 1 sign-up paused', !!MODAL && /Active batches<\/dt><dd>1/.test(MODAL.body) && /Sign-ups not yet completed<\/dt><dd>1/.test(MODAL.body));
    ok('EA-A (negative) a reason is required', reason('') === false && pr.status === 'Active'); closeModal();
    const nF = F.notifs.length; archive(pr);
    ok('EA-A archived: status Archived, with who, when, why; audited', pr.status === 'Archived' && pr.archived.by === 'Rachel Hughes' && /2028/.test(pr.archived.reason) && ADMIN.audit.some(x => x.action === 'Programme archived' && x.entity.includes(pr.id)));
    ok('EA-A F (mid-sign-up) is told once that the sign-up can\'t complete for now', F.notifs.length === nF + 1 && /not taking new enrolments/.test(F.notifs[0].title));
    ok('EA-A Archived is its own state: not Retired, not Suspended (the builder\'s retired rule doesn\'t apply)', !cbRetired(pr) && pr.status !== 'Suspended');
    ACA(); go('a-programmes', { id: pr.id, tab: 'details' }); ok('EA-A the page says Archived, read-only; no write controls; no Archive button', /Archived — not taking new enrolments/.test(main()) && !q('[data-act="eArchive"]') && !q('[data-act="s3WizVersion"]'));
    ok('EA-A history preserved: versions, offer letters and plan versions unchanged; A\'s records byte-identical', J(chLetters(pr.id)) === let0 && J(s4Plans(pr.id)) === pkg0 && snapL(A) === sA);
  });

  await T('EA-B nothing new starts', async () => {
    fresh(); const P = scene(), pr = P.pr, b = P.bt, F = P.wF; archive(pr);
    learner('E'); go('browse'); ok('EA-B Browse no longer lists it', !main().includes(pr.title));
    const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title), a0 = ADMIN.audit.length; ACT.applyNvq({ dataset: { id: c.id } });
    ok('EA-B (negative) a direct sign-up call is refused and logged', !MODAL && !STORE.worlds.E.signup && blocked(a0, /start sign-up/));
    learner('F'); const a1 = ADMIN.audit.length; setUi('cb9Pay', '1'); setUi('suMethod', 'card'); ACT.suPay();
    ok('EA-B (negative) F\'s sign-up can\'t be paid / completed while archived; it is kept', !F.signup.done && !!F.signup && blocked(a1, /complete sign-up/));
    go('admission'); ok('EA-B the paused learner Admission page says why, below the header; the sign-up is kept', !!q('.e-paused') && q('.page-h').nextElementSibling === q('.e-paused'));
    ACA(); go('a-batches'); ACT.newBatch(); const opts = [...document.querySelectorAll('#modal-root #nb-co option')].map(o => o.value); closeModal();
    ok('EA-B Create batch doesn\'t offer it', !opts.includes(pr.title));
    ACT.newBatch(); fill({ '#nb-c': 'EA-NEW' }); const co = document.querySelector('#nb-co'); co.insertAdjacentHTML('beforeend', `<option>${esc(pr.title)}</option>`); co.value = pr.title; INP.n2NbCourse(co); document.querySelector('#nb-m').value = 'Online'; prim(); fill({ '#nb-ac': 'Dr Helen Carter' }); prim(); prim(); prim(); const a2 = ADMIN.audit.length; prim(); closeModal();
    ok('EA-B (negative) forcing it into Create batch is refused at the final step (logged); no batch created', !ADMIN.batches.some(x => x.code === 'EA-NEW') && blocked(a2, /create batch/));
    const a3 = ADMIN.audit.length; ACT.addToBatch({ dataset: { id: b.code } }); ACT.kOffer({ dataset: { id: b.code, n: 'Someone' } }); ACT.kNextIntake({ dataset: { id: b.code, n: 'Someone' } });
    ok('EA-B (negative) Add learner, waitlist offer and next intake are refused for its batch (logged x3)', !MODAL && ADMIN.audit.slice(0, ADMIN.audit.length - a3).filter(x => /^Blocked: (add a learner|offer a waitlist place|move a waitlisted)/.test(x.action)).length === 3);
    agyEnter('AG-02', true); ok('EA-B the agency catalogue doesn\'t offer a bundle that includes it', !AGY_CATALOGUE().some(x => x.id === 'CAT-EA'));
    const a4 = ADMIN.audit.length; ACT.agBuy({ dataset: { id: 'CAT-EA' } }); S.agy.buy = { c: { id: 'CAT-EA', name: 'EA bundle', courses: [pr.title], seats: 5, days: 365, unit: 2400 }, qty: 1 }; agBuyDraw(); agPayResult('success');
    ok('EA-B (negative) buying it — directly or through the payment step — is refused (logged)', !MODAL && blocked(a4, /buy a bundle/) && !agyPurchases().some(x => x.name === 'EA bundle'));
    const bun = agyBundles()[0], a5 = ADMIN.audit.length, n = bun ? agyDoAssign(bun, pr.title, [allLearners()[0].id], true) : 0;
    ok('EA-B (negative) agency seats can\'t be assigned to it', n === 0 && blocked(a5, /assign seats/));
  });

  await T('EA-C existing learners carry on', async () => {
    fresh(); const P = scene(), pr = P.pr, A = P.w, b = P.bt, v = wk(P); archive(pr);
    ACA(); const s0 = s4bSess(b.code).length; ACT.n3Weekly({ dataset: { b: b.code } }); const opened = !!MODAL; closeModal();
    ok('EA-C the active batch keeps its upcoming classes and can still be scheduled', s0 > 0 && opened);
    const o = recOf(P, 'EV-1'); accept(P, o); ok('EA-C A\'s pending observation is confirmed as normal (one fee from A\'s terms)', o.status === 'Confirmed' && chFees().filter(f => f.lid === P.lid).length === 1);
    TAS('A'); go('t-obsrec', { id: rowId(P, o) }); ok('EA-C the assessor records it with the event checklist', !!q('.d-rec'));
    learner(v); go('payments'); ok('EA-C A still sees and can pay outstanding payments', /Pay/.test(main()) && A.plans.find(x => x.e === 'nvq').rows.some(r => r.status !== 'Paid'));
    go('assignments'); ok('EA-C A has the Assignments page as before (no lock page)', !q('main .lockpage'));
    go('admission'); ok('EA-C A\'s signed offer letter is still there', !!A.signup.sig);
    FA(); ACT.cb10Advance({ dataset: { d: '78' } }); ok('EA-C payment reminders still run for A (simulated)', STORE.cbRem.log.some(x => x.lid === P.lid));
  });

  await T('EA-D permissions and reactivation', async () => {
    fresh(); const P = scene(), pr = P.pr;
    FA(); const a0 = ADMIN.audit.length + ADMIN.security.length; ACT.eArchive({ dataset: { id: pr.id } }); ok('EA-D (negative) Finance can\'t archive', !MODAL && pr.status === 'Active');
    BA(); ACT.eArchive({ dataset: { id: pr.id } }); ok('EA-D (negative) a Business Admin can\'t archive', !MODAL && pr.status === 'Active');
    COO('A'); ACT.eArchive({ dataset: { id: pr.id } }); ok('EA-D (negative) the Coordinator portal can\'t archive', !MODAL && pr.status === 'Active');
    SA(); ACT.eArchive({ dataset: { id: 'NV-L3O' } }); ok('EA-D (negative) a Retired programme can\'t be archived (stays Retired)', !MODAL && cbPr('NV-L3O').status === 'Retired');
    ACT.eArchive({ dataset: { id: 'NV-L4' } }); ok('EA-D (negative) a Suspended programme can\'t be archived (stays Suspended)', !MODAL && cbPr('NV-L4').status === 'Suspended');
    ACA(); archive(pr); ACT.eReactivate({ dataset: { id: pr.id } }); ok('EA-D (negative) an Academic Admin can\'t reactivate', !MODAL && pr.status === 'Archived');
    ACT.cb8PayAdd({ dataset: { p: pr.id, o: P.a, k: '2' } }); ok('EA-D (negative) the builder\'s write actions refuse an archived programme', !cb8Work(pr).opts[0].pay.some(x => x.k === 2) && /archived/.test(ADMIN.audit[0].action));
    SA(); const L = chLetterCur(pr.id); STORE.chLetters[pr.id].forEach(x => { x._hidden = true; }); const keep = STORE.chLetters[pr.id].slice(); STORE.chLetters[pr.id].length = 0;
    ACT.eReactivate({ dataset: { id: pr.id } }); ok('EA-D (negative) reactivation is refused when it isn\'t valid to sell (no current offer letter)', !MODAL && pr.status === 'Archived' && /offer letter/.test(ADMIN.audit[0].reason));
    STORE.chLetters[pr.id].push(...keep);
    ACT.eReactivate({ dataset: { id: pr.id } }); reason('Specification extended');
    ok('EA-D the Super Administrator reactivates it: Active, history kept, audited', pr.status === 'Active' && pr.archived.hist.length === 2 && ADMIN.audit.some(x => x.action === 'Programme reactivated'));
    learner('E'); go('browse'); ok('EA-D reactivated: back in the catalogue', main().includes(pr.title));
    learner('F'); setUi('cb9Pay', '1'); setUi('suMethod', 'card'); render(); const _co = checkout; let g = null; checkout = o => { g = o; return _co(o); }; try { ACT.suPay(); } finally { checkout = _co; }
    ok('EA-D F\'s paused sign-up can continue to payment again', !!g);
  });
  /* ================= EA-E archive halfway through delivery (final Batch E correction) ================= */
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const draftAsg = (pr, title) => {   // an assignment defined (Draft, with a mapped question) but not yet released
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Describe how you support independence.', '#aq-ev': 'An example from practice', '#aq-n': '1' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: s2Crit(d).find(c => c.type === 'Knowledge').code } }); return d;
  };
  const submitAs = (v, a, resub) => { learner(v); ACT.reviewSubmit({ dataset: { id: a.id } }); const s = MODAL && MODAL.actions.find(x => x.label === 'Submit'); if (!s) return false; s.fn(); clearTimer('undo'); closeModal(); finaliseSubmit(a, !!resub, now().toISOString()); closeModal(); return true; };
  const subOf = (lid, title) => tasSubs(true).find(x => x.L && x.L.lid === lid && x.a && x.a.title === title);
  const markRel = (lid, title, item) => { TCH('A'); const s = subOf(lid, title); if (!s) return null; const d = dft(s.key); markable(tasAsg(s)).forEach(q => { d.items[q.id] = { ...item }; }); ACT.mkRelease({ dataset: { k: s.key } }); prim(); closeModal(); COO('A'); ACT.relOne({ dataset: { k: s.key } }); prim(); closeModal(); return s; };

  await T('EA-E archive halfway through an active batch', async () => {
    fresh(); const P = scene(), pr = P.pr, A = P.w, v = wk(P), lid = P.lid;
    ACA(); const a1 = author(pr, 'EA-E Assignment 1 — released before archive'); const d2 = draftAsg(pr, 'EA-E Assignment 2 — not yet released');
    const A1 = A.assignments.find(x => x.title === a1.title);
    ok('EA-E (setup) halfway: Assignment 1 released to the learner (open); Assignment 2 defined but not released', !!A1 && A1.status === 'Not Started' && !!d2 && d2.status === 'Draft' && !A.assignments.some(x => x.title === d2.title));
    const snap0 = J({ sig: A.signup.sig, pin: A.signup.plan, plans: s4Plans(pr.id), letters: chLetters(pr.id), tree: ch8Tree(pr.id), snaps: s3Snap(pr), cfg: n5ConfigFor(pr.id, 1), events: cbEvOf(n5ConfigFor(pr.id, 1)) });
    archive(pr);
    // 1. new business blocked
    learner('E'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title), a0 = ADMIN.audit.length; ACT.applyNvq({ dataset: { id: c.id } });
    ACA(); ACT.addToBatch({ dataset: { id: P.bt.code } }); agyEnter('AG-02', true); ACT.agBuy({ dataset: { id: 'CAT-EA' } });
    ok('EA-E 1. new admissions, learner allocations and agency sales are refused (logged)', !STORE.worlds.E.signup && ADMIN.audit.slice(0, ADMIN.audit.length - a0).filter(x => /^Blocked: (start sign-up|add a learner|buy a bundle)/.test(x.action)).length === 3);
    // 2. the next existing assignment is released (published) by its authorized role; the learner receives it from the pinned curriculum
    ACA(); go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d2.id } }); crPd(); reason('Release for the next unit');
    const A2 = A.assignments.find(x => x.title === d2.title);
    ok('EA-E 2. the already-defined Assignment 2 is released after archiving and reaches the enrolled learner (their version\'s criteria)', d2.status === 'Published' && !!A2 && A2.status === 'Not Started' && A2.qs.length === 1);
    COO('A'); const p0 = d2.status; ACT.pubAsg({ dataset: { id: d2.id } }); ok('EA-E 2. (negative) the Coordinator can\'t publish assignment definitions (existing role rule)', !MODAL || !/^Publish/.test(MODAL.title)); closeModal();
    // 3–4. submit, mark (resubmission), resubmit, mark, final outcome with feedback
    ok('EA-E 3. the learner submits Assignment 1', submitAs(v, A1) && A1.status === 'Submitted');
    const s1 = markRel(lid, A1.title, { exit: 'resub', rag: 'R', fb: 'Add a workplace example.', met: 'Not Met', corrections: 'Add an example from practice', days: 7 });
    ok('EA-E 4. the allocated Assessor marks it and the Coordinator releases it: Resubmission Required', !!s1 && A1.status === 'Resubmission Required', A1.status);
    ok('EA-E 3. the learner resubmits', submitAs(v, A1, true) && A1.status === 'Submitted' && A1.resubUsed === 1);
    const s2 = markRel(lid, A1.title, { exit: 'pass', rag: 'G', fb: 'Now evidenced.', met: 'Met', verified: true, vby: 'Sarah Okonkwo', vat: now().toISOString() });
    TCH('A'); ACT.r3Declare({ dataset: { k: s2.key } }); const x = document.querySelector('input[name="r3-res"][value="Pass"]'); if (x) x.checked = true; const fb = document.querySelector('#d-ofb'); if (fb) fb.value = 'Well evidenced after resubmission.'; const rs = document.querySelector('#rsn'); if (rs) rs.value = 'Meets the brief'; prim(); closeModal();
    ok('EA-E 4. the Assessor declares the final outcome (Pass, with overall feedback)', r3Out(s2.key) && r3Out(s2.key).result === 'Pass' && r3Out(s2.key).feedback === 'Well evidenced after resubmission.');
    TCH('T'); const o0 = J(r3Out(s2.key)); ACT.r3Declare({ dataset: { k: s2.key } }); ok('EA-E 7. (negative) the Teacher can\'t declare an outcome (refused, logged)', !MODAL && J(r3Out(s2.key)) === o0);
    // 5. observations, sessions, payments continue
    const ob = recOf(P, 'EV-1'); accept(P, ob); TCH('A'); go('t-obsrec', { id: rowId(P, ob) }); [['nvq', P.c1], ['ia', 'IA-16']].forEach(([s, c]) => ['o', 'c'].forEach(k => ACT.orT({ dataset: { s, c, k, v: '1' } }))); document.querySelector('main .d-evt').checked = true; INP.dEvt(); ACT.orSign({ dataset: { id: rowId(P, ob) } }); prim(); closeModal();
    ok('EA-E 5. the remaining observation is confirmed, recorded and signed off', ob.status === 'Completed' && ob.report.dEv.id === 'EV-1');
    ACA(); ACT.n3Weekly({ dataset: { b: P.bt.code } }); const sess = !!MODAL; closeModal(); learner(v); go('payments');
    ok('EA-E 5. sessions can still be scheduled; outstanding payments are still payable', sess && A.plans.find(p => p.e === 'nvq').rows.some(r => r.status !== 'Paid') && /Pay now/.test(main()));
    // 6. frozen records unchanged
    ok('EA-E 6. signed letter, pinned terms, plan versions, offer letters, curriculum and observation configuration are unchanged', J({ sig: A.signup.sig, pin: A.signup.plan, plans: s4Plans(pr.id), letters: chLetters(pr.id), tree: ch8Tree(pr.id), snaps: s3Snap(pr), cfg: n5ConfigFor(pr.id, 1), events: cbEvOf(n5ConfigFor(pr.id, 1)) }) === snap0);
    // 7. configuration stays frozen (direct calls refused and logged)
    ACA(); const a1b = ADMIN.audit.length;
    ACT.cbAsgNew({ dataset: { p: pr.id } }); const n1 = !!MODAL; closeModal();
    ACT.newAsg(); const sel = document.querySelector('#modal-root #na-p'); if (sel) { sel.insertAdjacentHTML('beforeend', `<option>${esc(pr.title)}</option>`); sel.value = pr.title; } fill({ '#na-t': 'EA-E forced new assignment' /* CR (PD-CR-11): no deadline */ }); const nr = prim(); closeModal();
    ACT.kEditBrief({ dataset: { id: d2.id } }); const n3 = !!MODAL; closeModal();
    ACT.s3WizVersion({ dataset: { id: pr.id } }); const n4 = !!MODAL; closeModal();
    ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const n5 = !!MODAL; closeModal();
    ok('EA-E 7. (negative) no new assignment (builder or Assignments page, even forced), no new brief version, no new programme version, no fee change — all refused and logged', !n1 && nr === false && !n3 && !n4 && !n5 && !s2Defs().some(d => d.title === 'EA-E forced new assignment') && ADMIN.audit.slice(0, ADMIN.audit.length - a1b).filter(x => /^Blocked/.test(x.action)).length >= 5);
  });
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
