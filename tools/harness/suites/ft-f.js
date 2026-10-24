// Batch F — final demo-readiness corrections (PD-F-01…08): C1 assignments for learners who join after publication (both orders,
// several assignments, two programmes, versions, batch targeting, transfers, repeat runs, deadlines, history, unauthorized and
// paused routes); I1 IQA portfolio from the learner's own programme; I2 cards below the page heading; K2 greeting.
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
    const bt = ADMIN.batches.find(x => x.code === code); if (bt) { bt.start = D(40, '09:00'); bt.end = D(240, '17:00'); }
    // CR (PD-CR-13): a new batch issues an assignment once it has its own deadline — the administrator sets it (Batch → Assignment deadlines)
    if (bt) crAsgOf(bt).filter(d => d.status === 'Published' && !crEffDue(d, bt.code)).forEach(d => { ACT.crDlEdit({ dataset: { b: bt.code, id: d.id } }); fill({ '#cr-dl-d': '2026-12-20T21:59' }); reason('New batch deadline'); });
    return bt;
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


  /* ================= Batch F — final demo-readiness corrections ================= */
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const IQA = k => { iqaEnter(k); S.signedIn = true; S.ui = {}; };
  const draftAsg = (pr, title, due = '2026-12-20T21:59') => {   // a definition with a mapped question, still Draft
    go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.cbAsgNew({ dataset: { p: pr.id } }); if (!MODAL) return null;
    fill({ '#cna-t': title }); press(); const d = s2Defs().find(x => x.title === title); if (!d) return null;
    ACT.s2QAdd({ dataset: { id: d.id } }); fill({ '#aq-t': 'Describe how you support independence.', '#aq-ev': 'An example from practice', '#aq-n': '1' }); document.querySelectorAll('#modal-root .aq-ty').forEach(c => { c.checked = c.value === 'PDF'; }); press();
    INP.mapChange({ checked: true, dataset: { id: d.id, q: d.qs[0].id, c: s2Crit(d).find(c => c.type === 'Knowledge').code } }); return d;
  };
  const publishTo = (pr, d, codes) => { ACA(); go('a-programmes', { id: pr.id, tab: 'assessments' }); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); if (codes) document.querySelectorAll('#modal-root .s2-pb').forEach(x => { x.checked = codes.includes(x.value); }); return reason('Publish'); };
  const copies = (w, id) => w.assignments.filter(a => a.id === id).length;
  const nNew = (w, id) => w.notifs.filter(n => n.go === 'assignment.' + id && n.title === 'New assignment').length;
  const move = (lid, to) => { ACA(); ACT.chMoveBatch({ dataset: { id: lid } }); if (!MODAL) return false; const s = document.querySelector('#modal-root #ch-mv-b'); if (!s || ![...s.options].some(o => o.value === to)) { closeModal(); return false; } s.value = to; return reason('Transfer test'); };
  const submitAs = (v, a) => { learner(v); ACT.reviewSubmit({ dataset: { id: a.id } }); const s = MODAL && MODAL.actions.find(x => x.label === 'Submit'); if (!s) return false; s.fn(); clearTimer('undo'); closeModal(); finaliseSubmit(a, false, now().toISOString()); closeModal(); return true; };
  // A published Level 3 programme whose first assignment was published BEFORE any batch or learner existed (the builder's natural order)
  const progOnly = () => { ACA(); const pr = make({ obs: true }); structure(pr, true); author(pr, 'CBF assignment ' + codeN); observations(pr); const fx = fees(pr, true); documents(pr); submitAndApprove(pr); ACA(); ACT.cbPublish({ dataset: { id: pr.id } }); reason('Ready'); const bt = batch(pr, 'CBF-' + codeN); ACA(); return { pr, ...fx, bt, d0: s2Defs().find(d => /^CBF assignment/.test(d.title) && cbAsgPid(d) === pr.id) }; };
  const natural = () => { const P = published(true); P.d0 = s2Defs().find(d => /^CBF assignment/.test(d.title) && cbAsgPid(d) === P.pr.id); return P; };

  await T('F-A order A: enrol, then publish (unchanged)', async () => {
    fresh(); const P = natural(), A = P.w; ACA(); const d = draftAsg(P.pr, 'F-A published after enrolment'); const n0 = A.notifs.length; publishTo(P.pr, d);
    ok('F-A an assignment published after the learner enrolled reaches them once, with one notification', d.status === 'Published' && copies(A, d.id) === 1 && nNew(A, d.id) === 1 && d.copies.filter(c => c.v === wk(P)).length === 1);
  });

  await T('F-B order B: publish, then enrol (C1)', async () => {
    fresh(); const P = natural(), A = P.w, d0 = P.d0;
    ok('F-B (setup) the assignment was published before the batch existed (no batches chosen)', !!d0 && d0.status === 'Published' && !(d0.batches || []).length);
    ok('F-B the Fully Assisted learner who enrolled after publication has it, once, with one notification', copies(A, d0.id) === 1 && nNew(A, d0.id) === 1);
    const E = signUp('E', P.pr, P.bt, P.b, 'deposit');
    ok('F-B a Self-Paced learner (deposit) enrolling later also receives it, once', E.signup.done && r2ModeOfW(E) === 'Self-Paced' && copies(E, d0.id) === 1 && nNew(E, d0.id) === 1);
    const a = E.assignments.find(x => x.id === d0.id);
    ok('F-B the copy is the published definition: same deadline, questions, criteria and brief version; status Not Started', a.due === crEffDue(d0, P.bt.code) /* CR (PD-CR-12): the batch's deadline */ && a.qs.length === d0.qs.filter(q => q.status === 'Active').length && a.briefV === d0.briefV && a.status === 'Not Started');
    ok('F-B the definition records both learners; the issue is audited', d0.copies.filter(c => c.id === d0.id).length === 2 && ADMIN.audit.some(x => x.action === 'Issued to a learner who joined after publication' && /IA-L-/.test(x.after)));
    learner('E'); go('assignments'); ok('F-B the learner sees it on Assignments (To do 1)', main().includes(d0.title) || /To do\s*1/.test(main()));
    const b = P.bt; b.assessors = ['Sarah Okonkwo']; delete chAllocs()[b.code]; touch(b.code); syncTasBatches(); // Sarah allocated (as in setup())
    const sub = submitAs('E', a); TCH('A'); ok('F-B …and, once submitted, it reaches the Assessor caseload', sub && !!tasSubs(true).find(x => x.L && x.L.lid === E.me.id && x.a && x.a.title === d0.title));
  });

  await T('F-C several assignments; only Published ones', async () => {
    fresh(); const P = natural(), pr = P.pr; ACA();
    const d1 = draftAsg(pr, 'F-C second'); publishTo(pr, d1); const d2 = draftAsg(pr, 'F-C third'); publishTo(pr, d2);
    const dr = draftAsg(pr, 'F-C still draft'); const dx = draftAsg(pr, 'F-C retired'); publishTo(pr, dx);
    ACA(); ACT.s2Retire({ dataset: { id: dx.id } }); reason('No longer used');
    const E = signUp('E', pr, P.bt, P.b, 1), ids = E.assignments.map(a => a.id);
    ok('F-C a later learner receives every Published assignment of the programme (3)', [P.d0, d1, d2].every(d => ids.filter(x => x === d.id).length === 1));
    ok('F-C (negative) never a Draft or Retired one', dx.status === 'Retired' && !ids.includes(dr.id) && !ids.includes(dx.id));
  });

  await T('F-D two programmes stay apart', async () => {
    fresh(); const P1 = natural(), P2 = progOnly();
    ok('F-D (setup) two published programmes, each with an assignment published before enrolment', P1.d0 && P2.d0 && P1.pr.id !== P2.pr.id && P1.d0.id !== P2.d0.id);
    const E = signUp('E', P2.pr, P2.bt, P2.b, 1);
    ok('F-D a learner on programme 2 gets programme 2\'s assignment and not programme 1\'s', copies(E, P2.d0.id) === 1 && copies(E, P1.d0.id) === 0);
    ok('F-D (negative) the programme 1 learner never gets programme 2\'s', copies(P1.w, P2.d0.id) === 0);
  });

  await T('F-E programme versions', async () => {
    fresh(); const P = natural(), pr = P.pr; ACA(); const d = draftAsg(pr, 'F-E linked to Version 2'); publishTo(pr, d);
    // the definition belongs to a later programme version (set directly here; publishing a new version is covered by the CB suites)
    d.pv = 2; P.w.assignments = P.w.assignments.filter(a => a.id !== d.id);
    const E = signUp('E', pr, P.bt, P.b, 1);
    ok('F-E (negative) a learner pinned to Version 1 doesn\'t receive a Version 2 assignment', E.nvq.progVersion === 1 && copies(E, d.id) === 0 && copies(E, P.d0.id) === 1);
  });

  await T('F-F batch targeting and transfers', async () => {
    fresh(); const P = natural(), pr = P.pr, A = P.w, lid = A.me.id;
    const b2 = batch(pr, 'FF-B2'); ACA(); const d = draftAsg(pr, 'F-F only for FF-B2'); publishTo(pr, d, ['FF-B2']);
    ok('F-F (setup) published to chosen batches only (FF-B2)', d.batchScope === 'chosen' && J(d.batches) === J(['FF-B2']));
    ok('F-F the learner in the other batch doesn\'t receive it', copies(A, d.id) === 0);
    const a0 = A.assignments.find(x => x.id === P.d0.id); submitAs(wk(P), a0); const keep = J(a0);
    const n0 = A.notifs.length; move(lid, 'FF-B2');
    ok('F-F after a transfer to FF-B2 the learner receives it, once', s2BatchCodeOf(A) === 'FF-B2' && copies(A, d.id) === 1);
    ok('F-F the transfer keeps existing work exactly (submitted assignment unchanged, not duplicated)', J(A.assignments.find(x => x.id === P.d0.id)) === keep && copies(A, P.d0.id) === 1);
    move(lid, P.bt.code); move(lid, 'FF-B2');
    ok('F-F moving back and forth adds nothing (no duplicate copies, no repeated notifications)', copies(A, d.id) === 1 && copies(A, P.d0.id) === 1 && nNew(A, d.id) === 1 && d.copies.filter(c => c.v === wk(P)).length === 1);
    const b3 = batch(pr, 'FF-B3'), E = signUp('E', pr, b3, P.b, 1);
    ok('F-F a learner in a batch created after a "chosen batches" publication doesn\'t receive it; one published to every batch they do', copies(E, d.id) === 0 && copies(E, P.d0.id) === 1);
    COO('A'); const m0 = A.signup.batch; ACT.chMoveBatch({ dataset: { id: lid } }); const coo = !MODAL; closeModal(); TCH('T'); ACT.chMoveBatch({ dataset: { id: lid } }); const t = !MODAL; closeModal();
    ok('F-F (negative) a Coordinator or Teacher can\'t move a learner (refused, logged); nothing is issued', coo && t && A.signup.batch === m0 && ADMIN.audit.slice(0, 4).some(x => x.action === 'Blocked: batch change'));
  });

  await T('F-G repeated reconciliation is idempotent', async () => {
    fresh(); const P = natural(), A = P.w, snap = J({ a: A.assignments, n: A.notifs.length, c: P.d0.copies, au: ADMIN.audit.length });
    const r = [fAsgReconcile(A, 'x'), fAsgReconcile(A, 'x'), fAsgReconcile(A, 'x')];
    ok('F-G three more runs add nothing (copies, notifications, definition copies, audit)', r.every(x => x.length === 0) && J({ a: A.assignments, n: A.notifs.length, c: P.d0.copies, au: ADMIN.audit.length }) === snap);
    const B = STORE.worlds.B; ok('F-G (negative) an incomplete sign-up (Priya) receives nothing', fAsgReconcile(B, 'x').length === 0 && !B.signup.done);
  });

  await T('F-H joining after the deadline', async () => {
    fresh(); const P = natural(), pr = P.pr; ACA(); const d = draftAsg(pr, 'F-H early deadline'); publishTo(pr, d);
    // time passes: the deadline is now behind the demo date (the clock is fixed, so the definition's deadline is moved instead)
    const past = new Date(now().getTime() - 3 * DAY).toISOString(); crSetDue(d, P.bt, past, 'F-H'); // CR (PD-CR-12): the batch's deadline is moved (was the definition's)
    const c0 = STORE.coo.notifs.length, E = signUp('E', pr, P.bt, P.b, 1), a = E.assignments.find(x => x.id === d.id);
    ok('F-H the late joiner receives it with the published deadline — none is invented', !!a && a.due === past && !!a.lateJoin);
    const n = E.notifs.find(x => x.go === 'assignment.' + d.id); ok('F-H the learner is told the deadline passed and an extension decision is needed', !!n && /passed before you joined/.test(n.body));
    ok('F-H the batch Coordinator is asked for an extension decision', STORE.coo.notifs.slice(0, STORE.coo.notifs.length - c0).some(x => x.t === 'Extension decision needed'));
    learner('E'); go('assignment', { id: d.id }); ok('F-H the assignment page explains it under the heading', !!q('.f-late') && !q('.page-h .f-late'));
    ok('F-H learners who were enrolled on time aren\'t flagged', !(P.w.assignments.find(x => x.id === d.id) || {}).lateJoin);
    extendAssignment('E', d.id, new Date(now().getTime() + 10 * DAY).toISOString(), 'Joined late'); learner('E'); go('assignment', { id: d.id });
    ok('F-H after an extension (the existing policy) the note goes', !q('.f-late') && a.originalDue === past);
    fresh(); const P2 = natural(); ACA(); const d2 = draftAsg(P2.pr, 'F-H pre-recorded extension'); publishTo(P2.pr, d2); crSetDue(d2, P2.bt, past, 'F-H'); // CR (PD-CR-12)
    const fut = new Date(now().getTime() + 9 * DAY).toISOString(); STORE.s2Ext[STORE.worlds.E.me.id + '|' + d2.id] = fut;
    const E2 = signUp('E', P2.pr, P2.bt, P2.b, 1), a2 = E2.assignments.find(x => x.id === d2.id);
    ok('F-H an extension already recorded for the learner is applied when the copy is issued', a2.due === fut && !fLateOpen(a2));
  });

  await T('F-I historical work is never reopened', async () => {
    fresh(); const P = natural(), A = P.w, a = A.assignments.find(x => x.id === P.d0.id); submitAs(wk(P), a);
    Object.assign(a, { status: 'Completed', closed: true }); const keep = J(A.assignments);
    fAsgReconcile(A, 'x'); batch(P.pr, 'FF-I2'); move(A.me.id, 'FF-I2');
    ok('F-I a completed (closed) assignment stays exactly as it was after reconciliation and a transfer', J(A.assignments.filter(x => x.id === a.id)) === J(JSON.parse(keep).filter(x => x.id === a.id)));
  });

  await T('F-J unauthorized and paused routes issue nothing', async () => {
    fresh(); const P = natural(), pr = P.pr; ACA(); const d = draftAsg(pr, 'F-J draft');
    COO('A'); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); const c1 = !MODAL || !/^Publish/.test(MODAL.title); closeModal();
    learner('C'); ACT.pubAsg({ dataset: { id: d.id } }); crPd(); const c2 = !MODAL || !/^Publish/.test(MODAL.title); closeModal();
    ok('F-J (negative) a Coordinator or a learner can\'t publish (so nothing is issued)', c1 && c2 && d.status === 'Draft' && !Object.values(STORE.worlds).some(w => (w.assignments || []).some(a => a.id === d.id)));
    learner('F'); go('browse'); const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === pr.title); ACT.applyNvq({ dataset: { id: c.id } }); const ro = document.querySelector(`#modal-root input[name="r1-opt"][value="${P.b}"]`); if (ro) ro.checked = true; prim(); closeModal();
    const F = W; chSetBatch(F, P.bt); ACT.suNext(); F.docs.forEach(x => { x.status = 'Submitted'; x.file = 'doc.pdf'; }); render(); ACT.suNext(); setUi('suSig', F.me.first + ' ' + F.me.last); setUi('suDecl', true); ACT.suSign(); chSetBatch(F, P.bt);
    archive(pr); learner('F'); setUi('cb9Pay', '1'); setUi('suMethod', 'card'); render(); try { ACT.suPay(); } catch (e) { /* refused */ } closeModal();
    ok('F-J (negative) a sign-up paused by an archived programme can\'t complete, so no assignment is issued', !F.signup.done && copies(F, P.d0.id) === 0);
  });

  await T('F-K IQA portfolio shows the learner\'s own programme', async () => {
    fresh(); const P = setup(); choose(P, 'EV-1', 'workplace'); propose(P, 'EV-1'); const o = recOf(P, 'EV-1'); accept(P, o);
    TAS('A'); go('t-obsrec', { id: rowId(P, o) }); [['nvq', P.c1], ['ia', 'IA-16']].forEach(([s, c]) => ['o', 'c'].forEach(k => ACT.orT({ dataset: { s, c, k, v: '1' } }))); document.querySelector('main .d-evt').checked = true; INP.dEvt(); ACT.orSign({ dataset: { id: rowId(P, o) } }); prim(); closeModal();
    const codes = () => qa('.tree .code').map(x => x.textContent);
    IQA('QA'); go('q-portfolios', { id: P.lid }); const own = P.w.tree.map(u => u.code);
    ok('F-K a new learner\'s portfolio shows their own units (before: the seeded U301 tree)', own.every(c => codes().includes(c)) && !codes().includes('U301') && main().includes(P.pr.title));
    ok('F-K …and their signed-off observation sits against its criterion', qa('.tree [data-go="q-record"]').length >= 1);
    go('q-portfolios', { id: 'IA-L-18022' }); ok('F-K Aisha (seeded, Level 3 Adult Care) still shows U301', codes().includes('U301'));
    const l5 = allIqaRecords().find(r => /Level 5/.test(r.programme)); go('q-portfolios', { id: l5.lid });
    ok('F-K a Level 5 learner shows the Level 5 curriculum (U501…), never U301', codes().includes('U501') && !codes().includes('U301') && /pinned version isn.t recorded|Version/.test(main()));
    const l5n = allIqaRecords().filter(r => r.lid === l5.lid).length;
    ok('F-K …and none of their evidence is lost: records whose criteria aren\'t in that curriculum are listed separately', qa('.f-port-loose [data-go="q-record"]').length + qa('.tree [data-go="q-record"]').length >= l5n);
    STORE.iqa.recs.push({ ...l5, id: 'F-K-1', lid: 'IA-L-FK001', learner: 'F K Unknown', programme: 'Unlisted programme (F-K)', crit: [] }); go('q-portfolios', { id: 'IA-L-FK001' });
    ok('F-K (negative) a programme that can\'t be resolved shows an honest unavailable state — no other criteria', !!q('.f-port-na') && !qa('.tree .code').length);
    go('q-portfolios', { id: 'IA-L-GONE1' }); ok('F-K a stale learner link opens the list with a note — not another learner under that ID', !!q('.e-gone') && !/Error 404/.test(main()));
    const rec = allIqaRecords().find(r => r.lid === P.lid), s0 = ADMIN.security.length; FA(); ACT.qAddOne({ dataset: { id: rec.id } });
    ok('F-K (negative) a non-IQA (Finance) can\'t add portfolio evidence to a sample set (refused, logged)', ADMIN.security.length === s0 + 1);
  });

  await T('F-L Payments and Finance cards below the heading', async () => {
    fresh(); learner('C'); go('payments'); const t0 = J(chPlanTotals(W));
    const cards = q('.ch-paycards'), h1 = q('h1');
    ok('F-L learner Payments: summary cards sit below the page heading, outside its title row', !!cards && !cards.closest('.page-h') && !!(h1.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING));
    ok('F-L …the figures are unchanged', J(chPlanTotals(W)) === t0 && main().includes(money(chPlanTotals(W).paid, 'GBP')));
    FA(); go('f-plans'); ok('F-L Finance Payment Plans: the observation-fee card is outside the heading', !!q('.ch-fees') && !q('.page-h .ch-fees'));
    go('f-overdue'); ok('F-L Finance Overdue: the observation-fee card is outside the heading', !!q('.ch-feeod') && !q('.page-h .ch-feeod'));
    const P = setup(); learner(wk(P)); go('observations'); ACT.dObsReq({ dataset: { e: 'EV-2' } }); if (MODAL) { document.querySelector('#d-or-r').value = 'Shift pattern.'; prim(); closeModal(); }
    COO('A'); go('c-dashboard'); ok('F-L Coordinator dashboard: the office-request card is outside the heading', !!q('.ch-ordash') && !q('.page-h .ch-ordash'));
    ACA(); go('k-dashboard'); const hr = +fmt(now().toISOString(), { hour: '2-digit', hour12: false });
    ok('F-L Academic Admin greeting follows the hour of the times shown in the console (was always "Good morning")', q('h1').textContent.startsWith(hr < 12 ? 'Good morning' : 'Good afternoon'));
  });
  await T('F-M IQA workspace: viewing authority', async () => {
    fresh(); const routes = [['q-records', {}], ['q-record', { id: 'SUB-1000' }], ['q-findings', {}], ['q-sets', {}], ['q-portfolios', { id: 'IA-L-18022' }]];
    const shown = () => !q('.f-iqa-deny') && (!!q('.tree') || !!q('table') || /Assessment Records|IQA Findings|Sample Sets|Portfolio —|Assignment 1/.test((q('h1') || {}).textContent || ''));
    const probe = enter => routes.map(([r, p]) => { enter(); go(r, p); return { r, deny: !!q('.f-iqa-deny'), leak: !!q('.tree') || main().includes('Abigail Shaw') || main().includes('SUB-1000 ') }; });
    const roles = [['Finance', FA], ['Business Admin', BA], ['System Admin', () => ACT.switchRole({ dataset: { r: 'sysA' } })], ['Academic Admin', ACA]];
    roles.forEach(([n, enter]) => { const s0 = ADMIN.security.length, a0 = ADMIN.audit.length, res = probe(enter);
      ok(`F-M (negative) ${n}: every IQA page (records, a record, findings, sample sets, a portfolio) is refused — access-denied page, nothing rendered`, res.every(x => x.deny && !x.leak), J(res.filter(x => !x.deny || x.leak)));
      ok(`F-M (negative) ${n}: each attempt is logged (security event and audit)`, ADMIN.security.length >= s0 + routes.length && blocked(a0, /open IQA workspace/)); });
    FA(); go('q-portfolios', { id: 'IA-L-18022' }); ok('F-M the denied page offers the role\'s own home (Finance Dashboard)', !!q('.f-iqa-deny [data-go="f-dashboard"]'));
    [['learner', () => learner('C')], ['Teacher', () => TCH('T')], ['Coordinator', () => COO('A')], ['agency', () => agyEnter('AG-02', true)]].forEach(([n, enter]) => {
      const res = routes.map(([r, p]) => { enter(); S.signedIn = true; go(r, p); return (!!q('.f-iqa-deny') || !!q('.rg-deny') || !/^q-/.test(S.route)) && !q('.tree') && !main().includes('Sample evidence across the whole qualification'); });
      // F-N: in the learner portal the cross-portal route guard (.rg-deny) now refuses before the IQA screen's own denied state (.f-iqa-deny)
      ok(`F-M (negative) ${n} portal: no IQA page renders (access-denied state, or the portal's own redirect)`, res.every(Boolean), J(res)); });
    IQA('QA'); ok('F-M an IQA still opens all of them', routes.every(([r, p]) => { go(r, p); return shown(); }));
    SA(); ok('F-M the Super Administrator still opens all of them', routes.every(([r, p]) => { go(r, p); return shown(); }));
    IQA('QC'); const conf = allIqaRecords().find(r => iqaConflict(r)), s2 = ADMIN.security.length; qAddToSet([conf.id]);
    ok('F-M the IQA conflict-of-interest guard is unchanged (refused, logged)', !MODAL && ADMIN.security.length === s2 + 1);
  });

  await T('F-N cross-portal route safeguard (direct navigation)', async () => {
    fresh(); const C = STORE.worlds.C, D = STORE.worlds.D, SY = () => { ACT.switchRole({ dataset: { r: 'sysA' } }); S.signedIn = true; };
    // the outcome of typing a route: "deny" (access-denied page), "home" (the portal returned to its own dashboard) or "open"
    const nav = (enter, r, p = {}) => { enter(); go(r, p); const h = ((q('h1') || {}).textContent || ''); return S.route !== r ? 'home' : (/permission/i.test(h) || !!q('.lockpage')) ? 'deny' : 'open'; };
    const refused = (enter, r, p) => ['deny', 'home'].includes(nav(enter, r, p));
    const L = () => learner('C'), aisha = C.me.email, grace = D.me.email;
    // 1. Admin audit records
    ok('F-N (negative) admin audit: learner, Finance, Academic, Business, IQA, Coordinator, Teacher/Assessor and agency are refused', [L, FA, ACA, BA, () => IQA('QA'), () => COO('A'), () => TCH('A'), () => agyEnter('AG-02', true)].every(e => refused(e, 'a-audit')));
    ok('F-N …the Super Administrator and System Admin open it', nav(SA, 'a-audit') === 'open' && nav(SY, 'a-audit') === 'open');
    // 2. Finance ledger and payment-plan management
    ok('F-N (negative) Finance ledger and Payment Plans: learner, Academic, Business, IQA, Coordinator, Teacher/Assessor and agency are refused', ['f-ledger', 'f-plans'].every(r => [L, ACA, BA, () => IQA('QA'), () => COO('A'), () => TCH('A'), () => agyEnter('AG-02', true)].every(e => refused(e, r))));
    ok('F-N …Finance opens both, the Super Administrator both, System Admin the ledger (its existing scope)', nav(FA, 'f-ledger') === 'open' && nav(FA, 'f-plans') === 'open' && nav(SA, 'f-plans') === 'open' && nav(SY, 'f-ledger') === 'open');
    // 3. IQA portfolios
    ok('F-N (negative) IQA portfolio: learner, Finance, Business, Academic, System Admin, Coordinator and agency are refused', [L, FA, BA, ACA, SY, () => COO('A'), () => agyEnter('AG-02', true)].every(e => refused(e, 'q-portfolios', { id: 'IA-L-18022' })));
    ok('F-N …IQA and the Super Administrator open it', nav(() => IQA('QA'), 'q-portfolios', { id: 'IA-L-18022' }) === 'open' && nav(SA, 'q-portfolios', { id: 'IA-L-18022' }) === 'open');
    // 4. Assessor marking queue
    const sub = (TCH('A'), tasSubs(true).find(x => x.toMark));
    ok('F-N (negative) marking queue and a marking page: learner, Teacher-only, Coordinator, admin and agency are refused', ['t-queue', 't-mark'].every(r => [L, () => TCH('T'), () => COO('A'), SA, FA, () => agyEnter('AG-02', true)].every(e => refused(e, r, r === 't-mark' ? { id: sub.key } : {}))));
    ok('F-N …the allocated Assessor opens the queue and the submission', nav(() => TCH('A'), 't-queue') === 'open' && nav(() => TCH('A'), 't-mark', { id: sub.key }) === 'open');
    // 5. Coordinator learner records
    ok('F-N (negative) a Coordinator learner record: learner, Teacher/Assessor, admin personas and agency are refused', [L, () => TCH('A'), SA, FA, ACA, () => agyEnter('AG-02', true)].every(e => refused(e, 'c-learner', { id: C.me.id })));
    COO('B'); go('c-learner', { id: C.me.id }); const cB = !main().includes(aisha); COO('A'); go('c-learner', { id: C.me.id }); const cA = main().includes(aisha);
    ok('F-N …Aisha\'s own Coordinator opens it; another batch\'s Coordinator sees nothing of hers', cA && cB);
    // 6. Agency rosters
    agyEnter('AG-02', true); const mine = agyRoster()[0];
    ok('F-N (negative) the agency roster and an agency learner: learner, Coordinator, Teacher/Assessor and admin personas are refused', ['g-learners', 'g-learner'].every(r => [L, () => COO('A'), () => TCH('A'), SA, FA, BA].every(e => refused(e, r, r === 'g-learner' ? { id: mine.id } : {}))));
    agyEnter('AG-03', true); go('g-learner', { id: mine.id }); const other = !main().includes(mine.email); agyEnter('AG-02', true); go('g-learner', { id: mine.id });
    ok('F-N …the agency opens its own learner; another agency sees nothing of them', main().includes(mine.email) && other);
    // 7. Learner-specific private records
    ok('F-N (negative) a learner can\'t open another learner\'s admin, Finance, Coordinator or agency record (Grace)', [['a-learner', { id: D.me.id }], ['f-learner', { id: D.me.id }], ['c-learner', { id: D.me.id }], ['g-learner', { id: D.me.id }]].every(([r, p]) => { learner('C'); go(r, p); return !!q('.rg-deny') && !main().includes(grace); }));
    learner('C'); const ownOk = ['payments', 'assignments', 'observations', 'profile'].every(r => { go(r); return !q('.rg-deny') && !main().includes(grace); });
    ok('F-N …her own Payments, Assignments, Observations and Profile still open, with nothing of Grace\'s', ownOk);
    // logging, stale links, legitimate navigation unchanged
    learner('C'); const s0 = ADMIN.security.length, a0 = ADMIN.audit.length; go('a-audit'); render(); render();
    ok('F-N a refused route is logged once per attempt (security event and audit), not on every re-render', ADMIN.security.length === s0 + 1 && blocked(a0, /open screen/));
    learner('C'); go('a-learner', { id: 'IA-L-GONE9' }); ok('F-N (negative) a stale admin link typed by a learner is refused — no fallback to a list or another record', !!q('.rg-deny') && !q('.e-gone') && !main().includes(grace));
    SA(); go('a-learner', { id: 'IA-L-GONE9' }); ok('F-N …the same stale link for an admin still opens the list with a note', !!q('.e-gone') && !q('.rg-deny'));
    const navOk = [[L, ['dashboard', 'courses', 'payments', 'calendar', 'messages', 'w-inbox']], [FA, ['f-dashboard', 'f-ledger', 'a-queue']], [ACA, ['k-dashboard', 'a-learners', 'a-programmes', 'k-staff']], [BA, ['b-dashboard', 'a-agencies', 'b-licences']]].every(([e, rs]) => rs.every(r => nav(e, r) === 'open'));
    ok('F-N every role\'s own navigation still opens (sample per role)', navOk);
    ACA(); go('a-learner', { id: C.me.id }); ok('F-N (negative) W0 action guards unchanged: a learner calling an admin action is still refused', (learner('C'), ACT.eArchive({ dataset: { id: 'NV-L3' } }), !MODAL));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
