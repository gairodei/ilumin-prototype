// AG-1 — Agency bundle discoverability and seat-to-learner connections (2 Nov 2026; PD-AG1-* in PROVISIONAL-DECISIONS.md).
// suites.sh runs this suite with FIXTURE=client: the client demo first (Business Admin publication, payments, seats for existing,
// already-enrolled and newly invited learners, activation by both links, NVQ applications, refresh and Reset), then the legacy data
// (another agency, seeded NVQ seats, persona learners). Expected values come from the records, not from the code under test.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const main = () => ($1('main') || $1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const app = () => ($1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => (($1('#modal-root') || {}).textContent || '').replace(/\s+/g, ' ');
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'AG-1 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const toasts = []; const _t = toast; toast = function (m, k) { toasts.push(String(m)); return _t.apply(this, arguments); };
  const lastToast = () => toasts[toasts.length - 1] || '';
  const tick = () => new Promise(r => setTimeout(r, 0));
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const FA = () => { closeModal(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const asLearner = k => { closeModal(); S.edge = 'none'; setVariant(k); S.portal = 'learner'; S.signedIn = true; S.auth = 'signin'; S.ui = {}; go('dashboard'); };
  const byName = n => allLearners().find(l => l.name === n);
  const seatsOf = ag => ADMIN.bundles.filter(b => b.agency === ag).reduce((s, b) => s + b.seats, 0);
  const usedOf = b => STORE.agy.assign.filter(a => a.bundle === b.id && !['Unassigned', 'Rejected — seat returned'].includes(a.status)).length;
  const MH = 'Moving and Handling People', NVQ = () => nvqBundleCourses()[0].title;
  // Create (and optionally publish) a bundle through the Business Admin's screens
  const create = (name, course, seats, o = {}) => {
    BIZ(); go('a-bundles', { tab: 'catalogue' }); click($1('main [data-act="newBundle"]'));
    if (o.custom) { click($1('#modal-root [data-act="bpMode"][data-m="custom"]')); $1('#bp-a').value = o.custom; }
    $1('#bp-n').value = name; $a('#modal-root .bp-c').forEach(x => { x.checked = x.value === course; }); $1('#bp-s').value = String(seats); INP.bpCalc();
    if (o.custom && o.total) { $1('#bp-t').value = String(o.total); INP.bpCalc(); if ($1('#bp-j')) $1('#bp-j').value = 'AG-1 justification'; }
    if (o.vat) { $1('#bp-vat').checked = true; INP.chVatCalc(); $1('#bp-vatp').value = String(o.vat); INP.chVatCalc(); }
    const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal();
    return STORE.biz.products[n0];
  };
  const publish = p => { BIZ(); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1('main .ag1-pub [data-act="bPublish"]')); reason('AG-1 publish'); };
  const buyCard = (p, qty, outcome = 'success', ag = 'AG-02') => { AGY(ag); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); $1('#gq').value = String(qty); INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = outcome; prim(); const x = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null; return x; };
  const consent = (L, course) => { AGY('AG-02'); const c = agyRaiseLink(L.email, 'AG-1', course); const k = agyWorldKey(L); asLearner(k); click($1(`#app [data-act="consentDo"][data-id="${c.id}"][data-y="1"]`)); if (c.qid) { BIZ(); applyDecision(ADMIN.queue.find(i => i.id === c.qid), 'approve', 'AG-1'); } return c; };
  const wizard = (b, course, ids) => { AGY('AG-02'); go('g-seats'); click($1('main [data-act="agAssignStart"]')); S.agy.as.b = b.id; S.agy.as.step = 2; S.agy.as.c = course; S.agy.as.step = 3; render(); return $a('main .g-sel input[type="checkbox"]').map(x => [x.value, x.disabled]).filter(x => ids.includes(x[0])); };

  const DEMO = () => STORE.biz.products.find(p => p.name === AG1_DEMO), dc = ADMIN.courses.find(c => c.id === FX_SHORT);
  ok('AG1-0 PD-AG1-11 (restated from PD-FX-02): the client demo has one published bundle, made and published by the Business Admin through the handlers, and no purchase, paid seat or agency seat', FX.mode === 'client' && STORE.biz.products.length === 1 && !!DEMO() && DEMO().status === 'Published' && DEMO().history.some(h => h[2] === 'Sophie Turner' && h[3] === 'Published') && ADMIN.bundles.length === 0 && STORE.agy.assign.length === 0 && STORE.agy.purchases.length === 0);
  ok('AG1-0 its price is the course list price: 5 seats x the approved fee, no discount, no VAT, global, the published short course only', !!DEMO() && J(DEMO().courses) === J([dc.title]) && DEMO().seats === 5 && !DEMO().agency && priceOf(DEMO()).pct === 0 && priceOf(DEMO()).final === 5 * dc.gbp && !DEMO().vat && !DEMO().vatPending);
  agyEnter('AG-02', true); go('g-buy'); ok('AG1-0 the agency sees it in Buy Bundles at a fresh start', AGY_CATALOGUE().some(c => c.id === DEMO().id) && main().includes(AG1_DEMO));
  ok('AG1-0 the five demo learners have no agency link, seat or sponsored enrolment', ['CD1', 'CD2', 'CD3', 'CD4', 'CD5'].every(k => !STORE.worlds[k].enrolments.some(e => e.sponsor)) && !Object.keys(STORE.agy.linked || {}).length);

  let P1, PN, PC, PV, BS, BN;
  await T('AG1-A1 Business Admin: a saved bundle is a Draft that agencies cannot see', async () => {
    toasts.length = 0; P1 = create('AG-1 Moving and Handling seats', MH, 10);
    ok('AG1-A1 Save and continue leaves a Draft', !!P1 && P1.status === 'Draft');
    ok('AG1-A1 the message says Saved as Draft — not yet visible to agencies, and the next step', /Saved as Draft — not yet visible to agencies\. Next: Ready to publish\./.test(lastToast()), lastToast());
    ok('AG1-A1 the bundle page shows the Publication steps, "Not visible to agencies" and a Publish button', /Not visible to agencies/.test($1('main .ag1-pub').textContent) && !!$1('main .ag1-pub [data-act="bPublish"]') && $a('main .ag1-pub .tl li').length === 4);
    go('a-bundles', { tab: 'catalogue' }); ok('AG1-A1 the catalogue says agencies see Published bundles only, and offers Publish beside Open for the ready Draft', /Agencies see Published bundles only/.test(main()) && !!$1(`main [data-act="bPublish"][data-id="${P1.id}"]`));
    AGY('AG-02'); go('g-buy'); ok('AG1-A1 the agency catalogue and Buy Bundles do not show the Draft', !AGY_CATALOGUE().some(c => c.id === P1.id) && !main().includes(P1.name));
  });
  await T('AG1-A2 publication makes it visible to the agency at once, with a confirmation', async () => {
    toasts.length = 0; publish(P1); await tick();
    ok('AG1-A2 published, audited once', P1.status === 'Published' && ADMIN.audit.filter(a => a.entity.includes(P1.id) && a.action === 'Bundle published').length === 1);
    ok('AG1-A2 the confirmation names who can see it', /^Published — AG-1 Moving and Handling seats is now visible to every agency in Buy Bundles\./.test(lastToast()), lastToast());
    ok('AG1-A2 the bundle page shows "Visible to agencies" and the published date', /Visible to agencies/.test($1('main .ag1-pub').textContent) && /Published on/.test($1('main .ag1-pub').textContent) && !$1('main .ag1-pub [data-act="bPublish"]'));
    AGY('AG-02'); go('g-buy'); ok('AG1-A2 the agency sees it in Buy Bundles without a reset', AGY_CATALOGUE().some(c => c.id === P1.id) && main().includes(P1.name));
    ACT.bPublish({ dataset: { id: P1.id } }); ok('AG1-A2 an agency session cannot publish (handler)', !MODAL || !/Publish/.test(mtxt())); closeModal();
  });
  await T('AG1-A3 approvals still gate publication (minimum price, VAT)', async () => {
    toasts.length = 0; PC = create('AG-1 CarePlus deal', MH, 10, { custom: 'CarePlus Recruitment (demo)', total: 100 });
    ok('AG1-A3 a below-minimum customised bundle is Pending approval, and the message says it is not visible', PC.status === 'Pending approval' && /Submitted for System Administrator approval — not yet visible to agencies/.test(lastToast()), lastToast());
    go('a-bundles', { id: PC.id, tab: 'catalogue' }); ok('AG1-A3 its page shows "Awaiting System Administrator approval" and no Publish button', /Awaiting System Administrator approval/.test($1('main .ag1-pub').textContent) && !$1('main .ag1-pub [data-act="bPublish"]'));
    ACT.bPublish({ dataset: { id: PC.id } }); prim(); closeModal(); ok('AG1-A3 publishing it by direct call is refused', PC.status === 'Pending approval');
    AGY('AG-02'); ok('AG1-A3 the agency does not see it', !AGY_CATALOGUE().some(c => c.id === PC.id));
    PV = create('AG-1 VAT seats', MH, 10, { vat: 20 });
    ok('AG1-A3 a VAT change waits for Finance; the Draft says so and Publish is not offered', !!PV.vatPending && /awaiting Finance approval/.test((go('a-bundles', { id: PV.id, tab: 'catalogue' }), $1('main .ag1-pub').textContent)) && !$1('main .ag1-pub [data-act="bPublish"]'));
    ACT.bPublish({ dataset: { id: PV.id } }); closeModal(); ok('AG1-A3 VAT pending: publish refused', PV.status === 'Draft');
  });
  await T('AG1-A4 payment controls the seats', async () => {
    const t0 = STORE.fin.tx.length, s0 = seatsOf('CarePlus Recruitment (demo)'), p = buyCard(P1, 10);
    BS = ADMIN.bundles.find(b => b.id === p.bundle);
    ok('AG1-A4 card success: exactly 10 paid seats and one payment record', p.status === 'Paid' && seatsOf('CarePlus Recruitment (demo)') === s0 + 10 && STORE.fin.tx.length === t0 + 1 && STORE.fin.tx.filter(x => x.ref === p.ref).length === 1);
    const q0 = buyCard(P1, 3, 'pending'); ok('AG1-A4 card pending: no seats until Finance confirms', q0.status === 'Pending' && seatsOf('CarePlus Recruitment (demo)') === s0 + 10);
    AGY('AG-02'); ACT.agBuy({ dataset: { id: P1.id } }); $1('#gq').value = '4'; INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="inv"]').checked = true; prim(); $1('#gi-po').value = 'PO-AG1'; prim(); closeModal();
    const q = ADMIN.queue.find(i => i.data && i.data.po === 'PO-AG1'); FA(); applyDecision(q, 'approve', 'AG-1'); AGY('AG-02'); agyBundles();
    ok('AG1-A4 bank transfer approved but not yet paid: no seats', q.stage === 'awaiting' && seatsOf('CarePlus Recruitment (demo)') === s0 + 10);
  });
  await T('AG1-A5 an existing learner: link with consent, then a short-course seat reaches her portal', async () => {
    const L = byName('Amira Shah (demo)'), k = agyWorldKey(L), w = STORE.worlds[k], n0 = (w.notifs || []).length;
    ok('AG1-A5 her record has no "v": her account is found by her ID', !L.v && k === 'CD1' && w.me.id === L.id);
    const c = consent(L, MH); ok('AG1-A5 she answered the consent on her own dashboard; she is on the roster', c.status === 'Linked' && inRoster(L.id, 'CarePlus Recruitment (demo)'));
    ok('AG1-A5 the consent request reached her own notifications', (w.notifs || []).some(x => /wants to sponsor you/.test(x.title || x.t || '')));
    const u0 = BS.used, r = wizard(BS, MH, [L.id]); ok('AG1-A5 the wizard offers her', r.length === 1 && !r[0][1], J(r));
    S.agy.as.sel = [L.id]; S.agy.as.step = 4; render(); click($1('main [data-act="agAsConfirm"]')); press();
    const a = STORE.agy.assign.find(x => x.lid === L.id && x.bundle === BS.id), e = w.enrolments.find(x => x.agyAssign === (a && a.id)), row = ADMIN.courses.find(x => x.title === MH);
    ok('AG1-A5 one seat used; the assignment is Active and linked to her enrolment', !!a && a.status === 'Active' && BS.used === u0 + 1 && !!e && a.enrolId === e.id);
    ok('AG1-A5 the enrolment comes from the course definition, sponsored, with no price or payment plan', e.courseId === row.id && e.sponsor === 'CarePlus Recruitment (demo)' && e.price === null && e.base === MH && e.content.length === s1Spec(row).items.filter(i => i.status === 'Active').length && e.content.every(x => x.state === 'Not opened') && !w.plans.some(pl => pl.e === e.id));
    ok('AG1-A5 she is notified', (w.notifs || []).length > n0 && w.notifs.some(x => /New course from CarePlus/.test(x.title || x.t || '')));
    asLearner(k); go('courses'); ok('AG1-A5 her Courses screen lists it', main().includes(MH));
    AGY('AG-02'); go('g-seats'); ok('AG1-A5 the agency Seat Assignments list shows it, with the seat / entitlement / access explanation', main().includes('Amira Shah (demo)') && !!$1('main .ag1-seatnote'));
    SA(); go('a-learner', { id: L.id, tab: 'enrolments' }); ok('AG1-A5 the Admin learner record shows the course', main().includes(MH), main().slice(0, 300));
    e.progress = 40; AGY('AG-02'); ok('AG1-A5 the agency sees her progress from her own enrolment', agyAssign().find(x => x.id === a.id).progress === 40);
    const u1 = BS.used, n = agyDoAssign(BS, MH, [L.id]); ok('AG1-A5 repeating the assignment uses no seat', n === 0 && BS.used === u1 && w.enrolments.filter(x => x.base === MH).length === 1);
  });
  await T('AG1-A6 an existing enrolment prevents a seat (no conversion)', async () => {
    const lena = byName('Lena Hart (demo)'), dev = byName('Dev Patel (demo)'), wl = STORE.worlds[agyWorldKey(lena)], wd = STORE.worlds[agyWorldKey(dev)];
    consent(lena, MH); consent(dev, MH);
    const u0 = BS.used, r = wizard(BS, MH, [lena.id]); ok('AG1-A6 the wizard shows Lena (self-funded on the course) as blocked', r.length === 1 && r[0][1], J(r));
    const n = agyDoAssign(BS, MH, [lena.id]); ok('AG1-A6 a direct call is refused too: no seat, no second enrolment, her own enrolment unchanged', n === 0 && BS.used === u0 && wl.enrolments.filter(e => (e.base || e.title).startsWith(MH)).length === 1 && !wl.enrolments.some(e => e.sponsor));
    ok('AG1-A6 the refusal is logged', ADMIN.audit.some(a => /Blocked: assign seats \(already enrolled\)/.test(a.action) && /Lena Hart/.test(a.reason)));
    PN = create('AG-1 NVQ seats', NVQ(), 3); publish(PN); const p = buyCard(PN, 3); BN = ADMIN.bundles.find(b => b.id === p.bundle);
    const plan0 = J(wd.plans), n2 = agyDoAssign(BN, NVQ(), [dev.id]);
    ok('AG1-A6 Dev, self-funded on the programme, gets no NVQ seat; his payment plan is unchanged', n2 === 0 && BN.used === 0 && J(wd.plans) === plan0 && !ADMIN.apps.some(x => x.lid === dev.id));
  });
  let NEW;
  await T('AG1-A7 a newly invited learner: the seat waits for activation, then reaches the portal', async () => {
    AGY('AG-02'); go('g-learners'); ACT.agAddLearner(); $1('#gl-n').value = 'Nina Newstart (demo)'; $1('#gl-e').value = 'nina.newstart@careplus-staff.example'; $1('#gl-m').value = '+44 7700 955301';
    $1('#gl-s').value = `${BS.id}|${MH}`; press(); NEW = byName('Nina Newstart (demo)');
    const a = STORE.agy.assign.find(x => x.lid === NEW.id);
    ok('AG1-A7 created Pending activation; one seat assigned, waiting; no account and no enrolment yet', NEW.acct === 'Pending Verification' && !!a && a.status === 'Active' && a.awaitAct === true && !a.enrolId && !agyWorldKey(NEW));
    go('g-seats'); ok('AG1-A7 Seat Assignments says the seat waits for her to activate', /waiting for the learner to activate/.test(($1('main .ag1-await') || {}).textContent || ''));
    const m = STORE.agy.lmails.find(x => x.lid === NEW.id && !x.kind); closeModal(); ACT.lmSet({ dataset: { id: m.id } });
    ok('AG1-A7 an opened but unfinished activation delivers nothing', NEW.acct === 'Pending Verification' && !agyWorldKey(NEW) && !a.enrolId);
    $a('#app input[type="password"]').forEach(i => { i.value = 'Demo!Pass2026x'; }); $1('#app form[data-submit="agyLearnerSet"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const k = agyWorldKey(NEW), w = k && STORE.worlds[k];
    ok('AG1-A7 setting the password activates her own account (bound to her ID)', NEW.acct === 'Active' && !!w && w.me.id === NEW.id && w.me.email === NEW.email);
    ok('AG1-A7 the waiting seat became her enrolment, once, using no further seat', !!a.enrolId && w.enrolments.filter(e => e.agyAssign === a.id).length === 1 && usedOf(BS) === BS.used);
    ok('AG1-A7 the confirmation no longer mentions the persona Daniel Okafor', !/Daniel Okafor/.test(app()));
    click($1('#app [data-act="agyLearnerGo"]')); ok('AG1-A7 Continue opens her own portal, not a persona', S.portal === 'learner' && S.variant === k && W.me.id === NEW.id && S.variant !== 'A');
    go('courses'); ok('AG1-A7 her Courses screen lists the agency course', main().includes(MH));
  });
  await T('AG1-A8 activation from the Academy link delivers the waiting seat too', async () => {
    AGY('AG-02'); const L = agyCreateLearner('Omar Later (demo)', 'omar.later@careplus-staff.example', '+44 7700 955302', 'Created', ''); agyDoAssign(BS, MH, [L.id]);
    const a = STORE.agy.assign.find(x => x.lid === L.id); ACA(); go('a-learner', { id: L.id }); click($1('main [data-act="lnActLink"]'));
    ok('AG1-A8 the link opens the set-password page; nothing delivered yet', S.auth === 'first' && !a.enrolId);
    $a('#app input[type="password"]').forEach(i => { i.value = 'Demo!Pass2026x'; }); const f = $1('#app form[data-submit="firstSet"]'); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const k = agyWorldKey(L); ok('AG1-A8 active; the course is in his own account', L.acct === 'Active' && !!k && STORE.worlds[k].enrolments.some(e => e.id === a.enrolId));
  });
  await T('AG1-A9 an NVQ seat opens its own admission application at the assignment', async () => {
    AGY('AG-02'); const L = agyCreateLearner('Nadia Nvq (demo)', 'nadia.nvq@careplus-staff.example', '+44 7700 955303', 'Created', ''), apps0 = ADMIN.apps.length;
    const n = agyDoAssign(BN, NVQ(), [L.id]), a = STORE.agy.assign.find(x => x.lid === L.id), ap = ADMIN.apps.find(x => x.agySeat === (a && a.id));
    ok('AG1-A9 assigned: Admission pending, and the application exists before anyone opens Admissions', n === 1 && a.status === 'Admission pending' && !!ap && ADMIN.apps.length === apps0 + 1);
    ok('AG1-A9 it belongs to her, the agency, the programme and the seat; delivery option and batch not chosen', ap.lid === L.id && ap.name === L.name && ap.agency === 'CarePlus Recruitment (demo)' && ap.programme === NVQ() && ap.agyBundle === BN.id && ap.mode === null && ap.batch === null);
    ok('AG1-A9 nothing copied from another applicant: every document pending with no file, no reviewer, no days', ap.docs.length > 0 && ap.docs.every(d => d.status === 'Pending' && !d.file && !d.versions.length) && ap.reviewer === '— Unassigned' && ap.docsOk === 0);
    ok('AG1-A9 no enrolment, batch place or learner payment was created', !ADMIN.batches.some(b => (b.members || []).includes(L.id) || (b.roster || []).some(r => r[1] === L.id)) && !agyWorldKey(L));
    ACA(); go('a-admissions'); ok('AG1-A9 the Academic Admin sees the application in Admissions', main().includes('Nadia Nvq (demo)'));
    go('a-admissions', { id: ap.id }); ok('AG1-A9 its page says the delivery option and batch are not chosen, and admission is not granted by the seat', /not yet chosen/.test(main()) && /never granted by the seat/.test(main()));
    allApplications(); allApplications(); ok('AG1-A9 reading Admissions again creates no copies', ADMIN.apps.filter(x => x.agySeat === a.id).length === 1);
    const n2 = agyDoAssign(BN, NVQ(), [L.id]); ok('AG1-A9 a second NVQ seat for the same learner is refused', n2 === 0 && ADMIN.apps.filter(x => x.lid === L.id).length === 1);
    const u0 = BN.used; ap.status = 'Rejected'; agyAdmSync(); ok('AG1-A9 a rejected admission still returns the seat (G9.5)', a.status === 'Rejected — seat returned' && BN.used === u0 - 1);
  });
  await T('AG1-A10 consent and roster security', async () => {
    const tom = byName('Tom Transfer (demo)'); AGY('AG-02'); const c = agyRaiseLink(tom.email, 'AG-1', MH);
    asLearner(agyWorldKey(byName('Sam Deposit (demo)'))); const s0 = ADMIN.security.length; ACT.consentDo({ dataset: { id: c.id, y: '1' } });
    ok('AG1-A10 another learner cannot accept the consent', c.status === 'Awaiting learner consent');
    AGY('AG-02'); ACT.consentDo({ dataset: { id: c.id, y: '1' } }); ok('AG1-A10 nor can the agency', c.status === 'Awaiting learner consent');
    ok('AG1-A10 the consent reached Tom (his own notifications)', (STORE.worlds[agyWorldKey(tom)].notifs || []).some(x => /wants to sponsor you/.test(x.title || x.t || '')));
    const u0 = BS.used; ok('AG1-A10 a learner not on the roster cannot be given a seat', agyDoAssign(BS, MH, [tom.id]) === 0 && BS.used === u0);
  });
  await T('AG1-A11 refresh keeps it all; Reset returns the empty demo', async () => {
    const want = J([STORE.biz.products.map(p => [p.id, p.status]), STORE.agy.assign.map(a => [a.id, a.status, a.enrolId || null]), ADMIN.apps.filter(x => x.agySeat).map(x => x.id)]);
    render(); fcpSave(); ok('AG1-A11 the changes are saved in this browser', FCP.st === 'saved');
    FCP.busy = true; try { fxLoadClient(); } finally { FCP.busy = false; } const res = fcpRestore();
    const got = J([STORE.biz.products.map(p => [p.id, p.status]), STORE.agy.assign.map(a => [a.id, a.status, a.enrolId || null]), ADMIN.apps.filter(x => x.agySeat).map(x => x.id)]);
    ok('AG1-A11 restored after a reload: bundles, seats, enrolment links and applications', res === 'ok' && got === want, res);
    AGY('AG-02'); ok('AG1-A11 the agency still sees the published bundle after the reload', AGY_CATALOGUE().some(c => c.id === P1.id));
    ACT.resetDemo(); closeModal(); ok('AG1-A11 Reset demo: only the demo bundle again; no purchases, seats or agency applications', STORE.biz.products.length === 1 && !!DEMO() && STORE.agy.purchases.length === 0 && STORE.agy.assign.length === 0 && ADMIN.bundles.length === 0 && !(ADMIN.apps || []).some(x => x.agySeat));
  });

  // ---------------- Legacy data: other agencies, seeded seats, persona learners ----------------
  fxLoadLegacy();
  await T('AG1-L1 an agency-specific bundle is visible only to its agency', async () => {
    const p = create('AG-1 CarePlus only', 'Fire Safety Awareness', 10, { custom: 'CarePlus Recruitment (demo)', total: 2000 }); if (p.status === 'Draft') publish(p);
    AGY('AG-02'); const cp = AGY_CATALOGUE().some(c => c.id === p.id); AGY('AG-03'); const gc = AGY_CATALOGUE().some(c => c.id === p.id);
    ok('AG1-L1 CarePlus sees it, Gulf Care does not', p.status === 'Published' && cp && !gc, J([p.status, cp, gc]));
    AGY('AG-03'); const cpB = ADMIN.bundles.find(b => b.agency === 'CarePlus Recruitment (demo)' && left(b) > 0), gl = agyRoster()[0];
    ok('AG1-L1 Gulf Care cannot assign from a CarePlus bundle', agyDoAssign(cpB, cpB.courses[0], [gl.id]) === 0);
    go('g-bundle', { id: cpB.id }); ok('AG1-L1 nor open it by URL', /Not found/.test(main()));
  });
  await T('AG1-L2 seeded agency NVQ seats have their own applications, never copies', async () => {
    const seats = STORE.agy.assign.filter(x => x.kind === 'nvq' && ['Admission pending', 'Under review'].includes(x.status)), apps = allApplications().filter(x => x.agySeat);
    ok('AG1-L2 one application per waiting NVQ seat, named after its own learner', seats.length > 0 && seats.every(s => apps.filter(x => x.agySeat === s.id).length === 1 && apps.find(x => x.agySeat === s.id).name === s.learner && apps.find(x => x.agySeat === s.id).lid === s.lid), J([seats.length, apps.length]));
    ok('AG1-L2 no application carries the documents of another applicant', apps.every(x => x.docs.every(d => !d.file)));
  });
  await T('AG1-L3 legacy persona learner: link and seat as before', async () => {
    const L = byName('Priya Raman'), w = STORE.worlds[agyWorldKey(L)]; ok('AG1-L3 her account is found by ID and agrees with the v on her record', agyWorldKey(L) === L.v);
    const c = consent(L, MH); AGY('AG-02'); const b = agyBundles().find(x => bStatus(x) !== 'Expired' && left(x) > 0 && x.courses.includes(MH)); const n = agyDoAssign(b, MH, [L.id]); const a = STORE.agy.assign.find(x => x.lid === L.id && x.bundle === b.id);
    ok('AG1-L3 the seat creates her sponsored enrolment from the course definition', c.status === 'Linked' && n === 1 && !!w.enrolments.find(e => e.id === a.enrolId && e.sponsor === 'CarePlus Recruitment (demo)' && e.courseId));
    ok('AG1-L3 a repeat is refused', agyDoAssign(b, MH, [L.id]) === 0);
  });

  toast = _t; ACT.resetDemo(); closeModal();
  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
