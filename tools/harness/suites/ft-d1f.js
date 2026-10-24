// Batch D final correction (PD-D-16…20): workplace permission for every learner — two new learners with distinct contacts, token scope,
// expiry, withdrawal, visits; per-event Academy-office requests (learner and Coordinator routes, no duplicates); isolation; refusals.
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

  // Two newly enrolled learners on the same programme and batch (Daniel A — Fully Assisted; Fatima F — Self-Paced), each with their own workplace contact
  const CA = { home: 'Brookfield House (demo)', cname: 'Ms Ruth Allen', cemail: 'r.allen@brookfield.example' };
  const CF = { home: 'Harbour View Care (demo)', cname: 'Mr Tariq Aziz', cemail: 't.aziz@harbourview.example' };
  const two = () => {
    const P = setup(CA, false), wF = signUp('F', P.pr, P.bt, P.b, 3), lF = wpEnter('F', CF);
    return { P, A: { v: wk(P), w: P.w, lid: P.lid, link: P.link }, F: { v: 'F', w: wF, lid: wF.me.id, link: lF } };
  };
  const permLinks = v => STORE.wpc.links.filter(l => l.v === v && l.kind === 'perm');
  const mails = (l, kind) => STORE.wpc.emails.filter(e => e.token === l.token && (!kind || e.kind === kind));
  const seedSnap = () => J({ links: STORE.wpc.links.filter(l => !l.v || l.v === 'C' || l.v === 'D').map(l => [l.key, l.token, l.status]), C: STORE.worlds.C.workplace, D: STORE.worlds.D.workplace, Cobs: STORE.worlds.C.observations.map(o => [o.id, o.status]), fees: chFees().filter(f => f.lid === STORE.worlds.C.me.id || f.lid === STORE.worlds.D.me.id) });

  await T('D1F-A two new learners, two contacts, separate requests', async () => {
    fresh(); SA(); const P0 = published(true), wA = P0.w, v = wk(P0);
    ok('D1F-A a newly enrolled learner has no workplace (not the seeded Willowbrook "Granted" record) and no seeded Academy criteria', wA.workplace.perm === 'Not entered' && !wA.workplace.name && !/Willowbrook|Whitley/.test(J(wA.workplace)) && J(wA.iaCriteria) === '[]');
    ok('D1F-A nothing is sent for a learner who hasn\'t entered a workplace', !permLinks(v).length);
    learner(v); go('observations', { tab: 'workplace' }); ok('D1F-A the learner is asked to enter their workplace; "What will be observed" lists their own version\'s Academy criterion (IA-16), not the seeded IA-1…IA-4', !!q('form[data-submit="wpSave"]') && /IA-16/.test(main()) && !/IA-1 |IA-2 /.test(main()));
    fresh(); const seed0 = seedSnap(), X = two(), { A, F } = X;
    ok('D1F-A each learner\'s own request: one active permission link each, different tokens, own contact, own learner, allocated assessor', A.link && F.link && A.link.token !== F.link.token && A.link.contact.email === CA.cemail && F.link.contact.email === CF.cemail && A.link.lid === A.lid && F.link.lid === F.lid && A.link.learner === chFullName(A.w) && F.link.learner === chFullName(F.w) && A.link.assessor === 'Sarah Okonkwo');
    wpcSync(); render(); wpcSync();
    ok('D1F-A one request email per contact, to that contact only; repeated syncs and renders add nothing', mails(A.link, 'permRequest').length === 1 && mails(F.link, 'permRequest').length === 1 && mails(A.link)[0].to.email === CA.cemail && permLinks(A.v).length === 1 && permLinks('F').length === 1);
    go('w-permission', { id: A.link.token }); const pa = main();
    ok('D1F-A A\'s contact sees only A\'s request (A\'s name and workplace; nothing of F)', pa.includes(chFullName(A.w)) && pa.includes(CA.home) && !pa.includes(chFullName(F.w)) && !pa.includes(CF.home) && !pa.includes(CF.cname));
    wpGrant(A.link, 'Ruth Allen');
    ok('D1F-A A\'s contact grants: A Granted with A\'s contact as the consent record; audited as the contact; F still pending', A.w.workplace.perm === 'Granted' && A.w.workplace.grantedBy === CA.cname && ADMIN.audit.some(x => x.action === 'Permission granted (secure link)' && x.actor === CA.cname && x.entity.includes(chFullName(A.w))) && F.w.workplace.perm === 'Permission Pending');
    const fp0 = J(F.w.workplace); go('w-permission', { id: A.link.token, tab: 'grant' }); SUBMIT.wpcGrant({ dataset: { t: A.link.token } });
    ok('D1F-A (negative) A\'s used link can\'t be submitted again, and it never touches F', A.link.status === 'Used' && J(F.w.workplace) === fp0);
    go('w-permission', { id: '0000badtoken' }); ok('D1F-A (negative) an invalid token shows "We couldn\'t find this request" and nothing else', /We couldn't find this request/.test(main()) && !main().includes(chFullName(A.w)));
    go('w-visit', { id: A.link.token }); ok('D1F-A (negative) a permission token can\'t open a visit page', /We couldn't find this request/.test(main()));
    ok('D1F-A seeded learners\' links, workplaces, observations and fees are unchanged', seedSnap() === seed0);
  });

  await T('D1F-B expiry, resend and supersession', async () => {
    fresh(); const { A, F } = two(); wpGrant(A.link);
    FA(); ACT.wpcAdvance({ dataset: { d: '8' } });
    ok('D1F-B after 8 days F\'s unanswered link expires; F\'s permission shows Expired; A\'s granted permission is untouched', F.link.status === 'Expired' && F.w.workplace.perm === 'Expired' && A.w.workplace.perm === 'Granted');
    go('w-permission', { id: F.link.token }); ok('D1F-B the expired link says so', /This link has expired/.test(main()));
    go('w-permission', { id: F.link.token, tab: 'grant' }); const d = STORE.wpc.drafts[F.link.token]; if (d) Object.assign(d, { auth: true, agree: true, sig: 'x' }); SUBMIT.wpcGrant({ dataset: { t: F.link.token } });
    ok('D1F-B (negative) granting through the expired link is refused; F stays Expired', F.w.workplace.perm === 'Expired' && F.link.status === 'Expired');
    learner('F'); ACT.resendPerm(); wpcSync(); const nl = permLinks('F').find(l => l.status === 'Active');
    ok('D1F-B the learner resends: a new link to the same contact; exactly one active request', !!nl && nl.token !== F.link.token && nl.contact.email === CF.cemail && permLinks('F').filter(l => l.status === 'Active').length === 1);
    wpGrant(nl, 'Tariq Aziz'); ok('D1F-B F\'s contact grants through the new link', F.w.workplace.perm === 'Granted' && F.w.workplace.grantedBy === CF.cname);
  });

  await T('D1F-C visits and withdrawal stay with their learner', async () => {
    fresh(); const X = two(), { A, F } = X; wpGrant(A.link); wpGrant(F.link);
    const PA = { ...X.P }, PF = { ...X.P, w: F.w, lid: F.lid, ctx: dCtx(F.w) };
    choose(PA, 'EV-1', 'workplace'); choose(PF, 'EV-1', 'workplace');
    propose(PA, 'EV-1'); propose(PF, 'EV-1', D(14, '10:00')); const oA = recOf(PA, 'EV-1'), oF = recOf(PF, 'EV-1'); wpcSync();
    const vA = STORE.wpc.links.find(l => l.kind === 'obs' && l.v === A.v && l.oid === oA.id), vF = STORE.wpc.links.find(l => l.kind === 'obs' && l.v === 'F' && l.oid === oF.id);
    ok('D1F-C each proposed workplace visit gets its own visit link to its own contact (event EV-1, version 1)', !!vA && !!vF && vA.contact.email === CA.cemail && vF.contact.email === CF.cemail && oA.dEv === 'EV-1' && oF.dEv === 'EV-1' && oA.dV === 1);
    go('w-visit', { id: vA.token }); ok('D1F-C A\'s contact sees A\'s visit only', main().includes(chFullName(A.w)) && !main().includes(chFullName(F.w)));
    go('w-visit', { id: vA.token, tab: 'accept' }); SUBMIT.wpcAccept({ dataset: { t: vA.token } });
    ok('D1F-C A\'s contact accepts: A\'s observation Confirmed (responded by the contact); F\'s stays Proposed', oA.status === 'Confirmed' && /Ruth Allen/.test(oA.respBy) && oF.status === 'Proposed');
    TAS('A'); go('t-obsrec', { id: rowId(PA, oA) }); ok('D1F-C the record uses A\'s version, event and checklist (EV-1: the event\'s NVQ criterion and IA-16)', !!q('.d-rec') && /Observation 1 — moving and handling/.test(main()) && main().includes(X.P.c1) && /IA-16/.test(main()));
    const pa = A.link; go('w-withdraw', { id: pa.token }); STORE.wpc.drafts[pa.token] = { wReason: 'Staffing changes' }; const n0 = A.w.notifs.length; SUBMIT.wpcWithdraw({ dataset: { t: pa.token } });
    ok('D1F-C A\'s contact withdraws: A Withdrawn; A\'s planned workplace visit cancelled; A told once; audited', A.w.workplace.perm === 'Withdrawn' && oA.status === 'Cancelled' && A.w.notifs.length === n0 + 1 && ADMIN.audit.some(x => x.action === 'Permission withdrawn (secure link)' && x.actor === CA.cname));
    ok('D1F-C F is untouched: Granted, F\'s visit still Proposed', F.w.workplace.perm === 'Granted' && oF.status === 'Proposed');
    const a1 = ADMIN.audit.length; SUBMIT.wpcWithdraw({ dataset: { t: pa.token } });
    ok('D1F-C (negative) withdrawing again is refused (logged)', ADMIN.audit.length > a1 && /^Blocked: withdraw/.test(ADMIN.audit[0].action) && F.w.workplace.perm === 'Granted');
    const a2 = ADMIN.audit.length; SUBMIT.wpcWithdraw({ dataset: { t: '0000badtoken' } }); SUBMIT.wpcWithdraw({ dataset: { t: vF.token } });
    ok('D1F-C (negative) a bad token or a visit token can\'t withdraw anything (logged); F unchanged', ADMIN.audit.length >= a2 + 2 && F.w.workplace.perm === 'Granted' && oF.status === 'Proposed');
  });

  await T('D1F-D Academy-office requests: learner route, Coordinator route, no duplicates', async () => {
    fresh(); const X = two(), { A, F } = X; wpGrant(A.link); wpGrant(F.link);
    const PA = { ...X.P }, PF = { ...X.P, w: F.w, lid: F.lid, ctx: dCtx(F.w) };
    learner(A.v); go('observations');
    ok('D1F-D the learner can ask for the Academy office only on an event that permits it (EV-2, not EV-1)', !!q('.d-learner [data-e="EV-2"] [data-act="dObsReq"]') && !q('.d-learner [data-e="EV-1"] [data-act="dObsReq"]'));
    const a0 = ADMIN.audit.length; ACT.dObsReq({ dataset: { e: 'EV-1' } });
    ok('D1F-D (negative) asking for the office on EV-1 (workplace only in Version 1) is refused and logged', !MODAL && blocked(a0, /Academy-office request/));
    const cn0 = STORE.coo.notifs.length; ACT.dObsReq({ dataset: { e: 'EV-2' } }); document.querySelector('#d-or-r').value = 'Shift pattern clashes with visits.'; prim(); closeModal();
    const rq = dReq(A.w, X.P.ctx.evs[1]);
    ok('D1F-D the learner\'s request: CH-37 learner route, tied to EV-2 and Version 1, waiting for the Coordinator', rq && rq.source === 'learner' && rq.dEv === 'EV-2' && rq.dV === 1 && rq.status === 'Pending approval' && qItem(rq.qid).first === 'Dr Helen Carter');
    ok('D1F-D the Coordinator is notified once', STORE.coo.notifs.length === cn0 + 1);
    ACT.dObsReq({ dataset: { e: 'EV-2' } }); ok('D1F-D (negative) a second request for the same event is refused (no dialog)', !MODAL && chOrs().filter(r => r.lid === A.lid && r.dEv === 'EV-2').length === 1);
    ACT.chOrRequest(); ok('D1F-D (negative) the free-standing request (no event) is refused for an event-journey learner', chOrs().filter(r => r.lid === A.lid).length === 1);
    COO('A'); go('c-learner', { id: A.lid, tab: 'observations' }); const a1 = ADMIN.audit.length; ACT.dObsLoc({ dataset: { l: A.lid, e: 'EV-2', loc: 'office' } });
    ok('D1F-D (negative) the Coordinator can\'t open a second (Coordinator) request for EV-2 while the learner\'s is open', chOrs().filter(r => r.lid === A.lid && r.dEv === 'EV-2').length === 1 && blocked(a1, /location/));
    ACT.chOrDecide({ dataset: { id: rq.qid, a: 'approve' } }); reason('Agreed.');
    ok('D1F-D the Coordinator approves the learner\'s request: Approved; EV-2 is now at the Academy office and ready to schedule', rq.status === 'Approved' && dSel(A.w, 'EV-2').loc === 'office' && dState(A.w, X.P.ctx, X.P.ctx.evs[1]).k === 'ready');
    propose(PA, 'EV-2'); const oo = recOf(PA, 'EV-2'); ok('D1F-D the assessor proposes EV-2 at the Academy office (NVQ criteria only); the request is Booked', !!oo && oo.locType === 'office' && rq.status === 'Booked');
    // Coordinator route on F: consent, then the Academic Admin; the advising Coordinator can't approve
    choose(PF, 'EV-2', 'office'); const rf = dReq(F.w, X.P.ctx.evs[1]);
    ok('D1F-D the Coordinator chooses the office for F\'s EV-2: a Coordinator request awaiting F\'s agreement', rf && rf.source === 'coord' && rf.status === 'Awaiting consent' && rf.dEv === 'EV-2');
    learner('F'); go('observations'); ok('D1F-D (negative) F can\'t raise a second request for EV-2 while the Coordinator\'s is open', !q('.d-learner [data-e="EV-2"] [data-act="dObsReq"]'));
    ACT.chOrConsent({ dataset: { id: rf.id, a: 'accept' } }); prim(); closeModal();
    ok('D1F-D F agrees: routed to the Academic Admin (not the Coordinator)', rf.status === 'Pending approval' && qItem(rf.qid).first === 'Rachel Hughes');
    COO('A'); ACT.chOrDecide({ dataset: { id: rf.qid, a: 'approve' } }); ok('D1F-D (negative) the advising Coordinator can\'t approve their own recommendation', rf.status === 'Pending approval' && !MODAL);
    ACA(); ACT.qDo({ dataset: { id: rf.qid, a: 'approve' } }); reason('Agreed.'); ok('D1F-D the Academic Admin approves F\'s', rf.status === 'Approved');
    ok('D1F-D A\'s and F\'s requests are separate records; neither changed the other', chOrs().filter(r => r.lid === A.lid).length === 1 && chOrs().filter(r => r.lid === F.lid).length === 1 && rq.status === 'Booked');
  });

  await T('D1F-E fees and records stay with their learner; direct-call refusals', async () => {
    fresh(); const X = two(), { A, F } = X; wpGrant(A.link); wpGrant(F.link); const sA = J({ s: A.w.signup, p: A.w.plans }), sF = J({ s: F.w.signup, p: F.w.plans }), seed0 = seedSnap();
    const PA = { ...X.P }; choose(PA, 'EV-1', 'workplace'); propose(PA, 'EV-1'); const oA = recOf(PA, 'EV-1'); accept(PA, oA); render();
    ok('D1F-E A\'s confirmed workplace observation raises one fee for A only, from A\'s agreed terms (£70); none for F', chFees().filter(f => f.lid === A.lid).length === 1 && chFees().find(f => f.lid === A.lid).amount === 70 && !chFees().some(f => f.lid === F.lid));
    ok('D1F-E A\'s and F\'s signed letters, plans and payment rows are byte-identical; seeded records unchanged', J({ s: A.w.signup, p: A.w.plans }) === sA && J({ s: F.w.signup, p: F.w.plans }) === sF && seedSnap() === seed0);
    learner(A.v); const a0 = ADMIN.audit.length + (STORE.coo ? 0 : 0); ACT.dObsLoc({ dataset: { l: F.lid, e: 'EV-2', loc: 'office' } });
    ok('D1F-E (negative) a learner can\'t choose an observation location (refused)', !dSel(F.w, 'EV-2'));
    BA(); ACT.dObsReq({ dataset: { e: 'EV-2' } }); ok('D1F-E (negative) an admin portal user can\'t raise a learner\'s office request', !chOrs().some(r => r.lid === A.lid || r.lid === F.lid));
    TAS('S'); ACT.obPropose({ dataset: { l: F.lid } }); const opened = !!MODAL; closeModal(); ok('D1F-E (negative) an unallocated assessor can\'t propose for F', !opened);
  });
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
