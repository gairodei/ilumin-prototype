// CBX — the restructured NVQ course builder (2 Nov 2026; PD-CBX-* in PROVISIONAL-DECISIONS.md). Legacy fixture, then the client demo.
// A real create-to-publish journey through the screens (the build fixture is ft-cbf's, copied unchanged), then the new structure: eight
// steps, states, Resources & Delivery, merged panels, review links, versions, legacy programmes, permissions and the client demo.
(async function () {
  const dmpComply = (pid, mode = 'Fully Assisted') => {
    const pr = s3Pr(pid) || cbPr(pid); if (!pr) return false; const av = ADMIN.av, po = S.portal, aca = typeof isAca === 'function' && isAca();
    const qm1 = k => document.querySelector('#modal-root ' + k), put = (k, v) => { const e = qm1(k); if (e && !e.value) e.value = v; };
    const go1 = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
    const rs = () => { const e = document.querySelector('#rsn'); if (e) e.value = 'Fixture: fee options by delivery mode'; return go1(); };
    setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true;
    if (!pr.durV) { ACT.crDurRec({ dataset: { p: pr.id } }); put('#cr-du-n', '12'); rs(); }
    if (!cb8Managed(pr)) ACT.cb8Start({ dataset: { p: pr.id } });
    if (!crMultiFee(pr)) { ACT.crFoStart({ dataset: { p: pr.id } }); rs(); }
    cb8Work(pr).opts.filter(o => o.status === 'Active' && (o.legacy || !M_MODES.includes(o.mode))).map(o => o.id).forEach(id => {
      const o = cb8Work(pr).opts.find(x => x.id === id);
      if (o.legacy) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String(o.fee); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); ACT.cb8OptRetire({ dataset: { p: pr.id, o: id } }); rs(); }
      else { ACT.cb8Opt({ dataset: { p: pr.id, o: id } }); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-f', '2400'); /* a course without any fee (seeded Level 4): the fixture enters one */ put('#c8-wp', '0'); put('#c8-off', '0'); go1(); }
      closeModal();
    });
    if (!cb8Work(pr).opts.some(o => o.status === 'Active' && !o.legacy && M_MODES.includes(o.mode))) { ACT.cb8Opt({ dataset: { p: pr.id, o: '' } }); const l = qm1('#c8-l'); if (l) l.value = mode; const f = qm1('#c8-f'); if (f) f.value = String((s4PlanCur(pr.id) || {}).fee || 2400); const m = qm1('#c8-m'); if (m) m.value = mode; put('#c8-wp', '0'); put('#c8-off', '0'); go1(); closeModal(); } // no option at all (a Level 3 package starts from the options in force): one at the plan's fee
    cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
    if (!(cb8Wf(pr) && cb8Wf(pr).status === 'Approved')) { ACT.cb8SaApprove({ dataset: { p: pr.id } }); rs(); }
    closeModal(); if (aca) { acaEnter(av); S.signedIn = true; } else setAdminIdentity(av); S.portal = po; return true;
  };
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
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  // ---------------- CBX — the restructured course builder (PD-CBX-*) ----------------
  const secKeys = () => qa('.cb-nav .cb-sec').map(b => b.dataset.tab), cur = () => (q('.cb-sec.cur') || {}).dataset && q('.cb-sec.cur').dataset.tab, pan = () => (q('.cb-panels .tab[aria-selected="true"]') || {}).dataset ? q('.cb-panels .tab[aria-selected="true"]').dataset.tab : null;
  const badge = k => (q(`.cb-sec[data-tab="${k}"]`) || { textContent: '' }).textContent;
  let P = null;
  await T('CBX-A a new course from an empty draft: eight steps with descriptions, states and named Back / Next', async () => {
    fresh(); ACA(); P = make({ obs: true, title: 'CBX Level 3 course' });
    ok('CBX-A1 created as Draft Version 1 and opened in Curriculum & Outcomes', !!P && P.status === 'Draft' && cur() === 'curriculum');
    ok('CBX-A1 eight sections in the approved order, with Resources & Delivery before Review & Publish', J(secKeys()) === J(['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'delivery', 'review']));
    ok('CBX-A1 the labels say what each step is', /Curriculum & Outcomes/.test(badge('curriculum')) && /Assignments & Assessments/.test(badge('assessments')) && /Resources & Delivery/.test(badge('delivery')));
    ok('CBX-A1 every step states its number and purpose', /Step 2 of 8/.test(q('.cbx-desc').textContent) && /Units, modules, Learning Outcomes/.test(q('.cbx-desc').textContent));
    ok('CBX-A1 Back and Next name where they go', /Back: Course Details/.test(q('.cb-foot').textContent) && /Next: Assignments & Assessments →/.test(q('.cb-foot .btn-primary').textContent));
    ok('CBX-A2 states before anything is added: Course Details Complete; Curriculum Not started or to fix (one badge, the stronger); Assignments Optional', /Complete/.test(badge('details')) && /Not started|to fix/.test(badge('curriculum')) && !/Complete/.test(badge('curriculum')) && /Optional|to fix/.test(badge('assessments')), J([badge('details'), badge('curriculum'), badge('assessments')]));
    structure(P, true); go('a-programmes', { id: P.id, tab: 'curriculum' });
    ok('CBX-A3 the curriculum (Unit → Module → LO → criteria) made through Section 2: Curriculum Complete', /Complete/.test(badge('curriculum')) && (cbTree(P) || []).length === 1);
    author(P, 'CBX assignment 1'); go('a-programmes', { id: P.id, tab: 'assessments' });
    ok('CBX-A4 a published assignment: Assignments & Assessments Complete', /Complete/.test(badge('assessments')) && cbAsgOf(P).some(a => a.status === 'Published'));
  });
  await T('CBX-B observations: settings, library category in the builder, Same as Workplace with an exclusion, events', async () => {
    ACA(); const { nvq } = observations(P); go('a-programmes', { id: P.id, tab: 'observations' });
    ok('CBX-B1 Observation settings, Workplace and Academy criteria, Observation events — no legacy library tab', J(qa('.cb-panels .tab').map(t => t.textContent)) === J(['Observation settings', 'Workplace Observation Criteria', 'Academy Observation Criteria', 'Observation events']));
    ok('CBX-B1 settings show the summary by location, not the criteria cards', !!q('.ol1b-map') && !q('.n5-nvq') && !q('.n5-ia'));
    go('a-programmes', { id: P.id, tab: 'wpcrit' }); click(q('[data-act="ol1CbNew"]'));
    fill({ '#ol1-code': 'CBX', '#ol1-name': 'Course builder standards' }); const rows = [...document.querySelectorAll('#modal-root .ol1-row')];
    rows.forEach((r, k) => { r.querySelector('.ol1-rt').value = ['Greets the individual', 'Records the visit'][k]; r.querySelector('.ol1-ri').value = 'Observe it once.'; r.querySelectorAll('.ol1-ev').forEach(x => { x.checked = (k ? ['docs', 'refs'] : ['notes', 'photos']).includes(x.value); }); });
    press(); const c = OL1().cats.find(x => x.code === 'CBX');
    ok('CBX-B2 a new library category made inside the builder (two criteria, own evidence fields) is selected for Workplace', !!c && ol1Resolve(n5Draft(P), 'wp').items.map(i => i.code).join() === 'CBX-01,CBX-02' && J(ol1Resolve(n5Draft(P), 'wp').items.map(i => i.ev)) === J([['notes', 'photos'], ['docs', 'refs']]));
    go('a-programmes', { id: P.id, tab: 'offcrit' }); const inh = ol1Resolve(n5Draft(P), 'off').items.find(i => i.code === 'CBX-02');
    ok('CBX-B3 Academy office inherits Workplace by default (Same as Workplace)', ol1Mode(n5Draft(P)) === 'same' && !!inh && inh.from === 'inherited');
    click(q(`[data-act="ol1Excl"][data-c="${inh.id}"]`)); ok('CBX-B3 an inherited criterion is excluded at the Academy office only', !ol1Resolve(n5Draft(P), 'off').items.some(i => i.code === 'CBX-02') && ol1Resolve(n5Draft(P), 'wp').items.some(i => i.code === 'CBX-02'));
    ok('CBX-B4 the qualification (NVQ) criteria stay separate on both tabs', !!q('.n5-nvq') && nvq.every(code => !!q(`.n5-nvq tr[data-code="${code}"]`)) && !q('.ol1-preview tr[data-code="' + nvq[0] + '"]'));
    go('a-programmes', { id: P.id, tab: 'events' });
    ok('CBX-B5 Observation events: locations shown read-only with a link to Observation settings (one settings editor)', !!q('.cb-locs') && !q('.cb-locs [data-act="n5Settings"]') && !!q('.cb-locs [data-tab="obs"]') && qa('tbody tr[data-e]').length >= 2);
    ok('CBX-B6 a library problem links to the Workplace / Academy criteria tab, not the settings', J(cbRvWhere(P, 'Observations: Workplace Observation Criteria — X is retired')) === J(['observations', 'wpcrit']) && J(cbRvWhere(P, 'Observations: Academy Observation Criteria — Y')) === J(['observations', 'offcrit']));
  });
  await T('CBX-C fees and enrolment, Resources & Delivery, review, publish', async () => {
    ACA(); fees(P, true); documents(P);
    go('a-programmes', { id: P.id, tab: 'payments' });
    ok('CBX-C1 Fees & Payments: the package panels — fee options and the financial history (no separate legacy tab)', J(qa('.cb-panels .tab').map(t => t.dataset.tab)) === J(['fees', 'payhist']));
    go('a-programmes', { id: P.id, tab: 'documents' }); ok('CBX-C2 Offer Letter & Documents: a letter is uploaded — Complete', /Complete/.test(badge('documents')) && chLetters(P.id).length === 2);
    go('a-programmes', { id: P.id, tab: 'delivery' });
    ok('CBX-C3 Resources & Delivery: delivery modes from the fee options, with a link to Fees & Payments', cur() === 'delivery' && pan() === 'delivery' && /Self-Paced/.test(q('.cbx-modes').textContent) && /Fully Assisted/.test(q('.cbx-modes').textContent) && !!q('.cbx-modes [data-tab="payments"]'));
    ok('CBX-C3 …no batches before publication (said so, no Create batch on a Draft); live sessions scheduled per batch, linked', /No batches yet/.test(q('.cbx-batches').textContent) && !q('.cbx-batches [data-act="newBatch"]') && !!q('.cbx-sessions [data-go="a-scheduling"]'));
    click(q('.cb-panels [data-tab="dresources"]')); ok('CBX-C3 Learning resources: an empty state and the way to Learning Resources', /No learning resources are mapped to this course yet/.test(q('.cbx-res').textContent) && !!q('.cbx-res [data-go="a-resources"]'));
    submitAndApprove(P); ACA(); go('a-programmes', { id: P.id, tab: 'review' });
    ok('CBX-C4 Review & Publish summarises all seven sections, including Resources & Delivery', qa('.cb-rv-sec').length === 7 && !!q('.cb-rv-sec[data-sec="delivery"]') && /Delivery modes/.test(q('.cb-rv-sec[data-sec="delivery"]').textContent));
    const blk = cbRvChecks(P).block; ok('CBX-C4 nothing blocks publishing', !blk.length, J(blk.map(b => b.msg)));
    click(q('[data-act="cbPublish"]')); reason('CBX create-to-publish');
    ok('CBX-C5 published from the screen: Active, Version 1, audited', P.status === 'Active' && P.version === 1 && ADMIN.audit.slice(0, 15).some(a => /publish/i.test(a.action) && String(a.entity).includes(P.id)));
    ok('CBX-C5 the version bar points to Section 8 — Review & Publish (never the old Section 7)', (go('a-programmes', { id: P.id, tab: 'details' }), /Section 8 — Review & Publish/.test(q('.cb-ver').textContent) && !/Section 7/.test(q('.cb-ver').textContent)), q('.cb-ver').textContent.slice(0, 200));
    go('a-programmes', { id: P.id, tab: 'delivery' }); ok('CBX-C6 once published, Create batch is offered here', !!q('.cbx-batches [data-act="newBatch"]'));
    const bt = batch(P, 'CBX-B1'); ACA(); go('a-programmes', { id: P.id, tab: 'delivery' });
    ok('CBX-C6 the new batch is listed with its delivery modes and an Open link', !!bt && !!q('.cbx-batches tr[data-b="CBX-B1"] [data-go="a-batches"]'));
  });
  await T('CBX-D version workflow and history', async () => {
    ACA(); const pub0 = J(STORE.n5.pub[P.id]); go('a-programmes', { id: P.id, tab: 'review' }); click(q('[data-act="s3WizVersion"]')); reason('Version 2');
    ok('CBX-D1 "Create new version" makes Version 2 (draft); Version 1 stays published', P.status === 'Active' && P.version === 1 && cbDraftV(P) === 2);
    go('a-programmes', { id: P.id, tab: 'observations' }); ok('CBX-D2 the new draft has to answer Observation required again (PD-N5a-03): it is "to fix", not "Complete"', !/Complete/.test(badge('observations')));
    ok('CBX-D3 Version 1\'s published observation configuration is unchanged', J(STORE.n5.pub[P.id]) === pub0);
    go('a-programmes', { id: P.id, tab: 'versions' }); ok('CBX-D4 version history lists Version 2 (draft) and Version 1', /Version 2 \(draft\)/.test(main()) && /Version 1/.test(main()));
  });
  await T('CBX-E legacy programmes, retired, permissions', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'library' });
    ok('CBX-E1 the old "library" link opens Observation settings, with a link to the legacy list page (no copy in the builder)', cur() === 'observations' && pan() === 'obs' && !!q('.cbx-legacy [data-go="k-obslib"]') && !q('.cb-panels [data-tab="library"]'));
    go('a-programmes', { id: 'NV-L3O', tab: 'curriculum' }); ok('CBX-E2 a retired programme: read-only, no state badges', !qa('.cb-nav .cbx-st').length && !q('[data-act="cbDetSave"]'));
    FA(); const a0 = ADMIN.audit.length, p0 = s3Pr('NV-L3D').status; ACT.cbPublish({ dataset: { id: 'NV-L3D' } }); closeModal();
    ok('CBX-E3 a Finance Admin cannot publish (refused, nothing published)', s3Pr('NV-L3D').status === p0);
    BA(); ACT.ol1CbNew({ dataset: { p: 'NV-L3D', loc: 'wp' } }); ok('CBX-E3 a Business Admin cannot create observation criteria in the builder', !MODAL); closeModal();
  });
  await T('CBX-F the client demo programme is intact in the new structure', async () => {
    fxLoadClient(); ACA(); const pr = ADMIN.programmes.find(p => p.title === 'Level 3 Diploma in Care Practice (client demo)'), b0 = J(ADMIN.batches.map(b => [b.code, b.enrolled, b.status]));
    go('a-programmes', { id: pr.id, tab: 'delivery' });
    ok('CBX-F1 Resources & Delivery lists the demo batch DEMO-L3-JAN27 with both delivery modes', !!q('.cbx-batches tr[data-b="DEMO-L3-JAN27"]') && /Self-Paced/.test(q('.cbx-batches tr[data-b="DEMO-L3-JAN27"]').textContent) && /Fully Assisted/.test(q('.cbx-batches tr[data-b="DEMO-L3-JAN27"]').textContent));
    ['details', 'curriculum', 'assessments', 'observations', 'payments', 'documents', 'delivery', 'review'].forEach(k => go('a-programmes', { id: pr.id, tab: k }));
    ok('CBX-F2 every section opens; nothing in the demo data changed', !/undefined|NaN/.test(main()) && J(ADMIN.batches.map(b => [b.code, b.enrolled, b.status])) === b0 && pr.status === 'Active' && pr.version === 1);
  });

  await T('CBX-G every step: heading, description, Back / Next, Fix-in links; Step 7 is an overview', async () => {
    fresh(); SA(); const id = 'NV-L3D', pr = cbPr(id), keys = CB_SECTIONS.map(s => s[0]), bad = [];
    keys.forEach((k, i) => {
      go('a-programmes', { id, tab: k }); const h = q('h2.cb-h'), d = q('.cbx-desc'), nx = q('.cb-foot .btn-primary'), bk = qa('.cb-foot .btn:not(.btn-primary)')[0];
      if (!h || !h.textContent.includes(CB_SECTIONS[i][1])) bad.push(k + ': heading');
      if (!d || !new RegExp(`Step ${i + 1} of 8`).test(d.textContent) || d.textContent.length < 40) bad.push(k + ': description');
      if (i < keys.length - 1) { if (!nx) bad.push(k + ': no Next'); else { nx.click(); if (cur() !== keys[i + 1]) bad.push(k + ': Next went to ' + cur()); } } else if (nx) bad.push(k + ': Next on the last step');
      go('a-programmes', { id, tab: k }); if (i > 0) { const b = qa('.cb-foot .btn:not(.btn-primary)')[0]; if (!b) bad.push(k + ': no Back'); else { b.click(); if (cur() !== keys[i - 1]) bad.push(k + ': Back went to ' + cur()); } }
    });
    ok('CBX-G1 all eight steps: heading, "Step N of 8" with a description, Next to the following step and Back to the previous', !bad.length, J(bad));
    go('a-programmes', { id, tab: 'review' }); const fixes = qa('.cb-rv-fix').map(b => b.dataset.tab), wrong = fixes.filter(t => { const r = CB_ROUTE[t]; if (!r) return true; const ps = cbPanels(pr, r[0]).map(p => p[0]); return r[1] && !ps.includes(r[1]) && !(t === 'support' && cb8Managed(pr)); });
    ok('CBX-G2 every "Fix in" link on Review & Publish opens an existing step and tab', fixes.length > 0 && !wrong.length, J({ fixes, wrong }));
    fixes.slice(0, 3).forEach(t => { go('a-programmes', { id, tab: t }); }); ok('CBX-G2 …and they open (no missing page)', !/We can't find that page|undefined/.test(main()));
    go('a-programmes', { id, tab: 'delivery' });
    ok('CBX-G3 Step 7 says it is an overview: live sessions are managed within batches, delivery modes come from the fee options', /Overview only — nothing to set up here/.test(q('.cbx-ov').textContent) && /scheduled within each batch/.test(q('.cbx-ov').textContent) && /managed within each batch/.test(q('.cbx-sessions').textContent) && /An overview with links — nothing is set here/.test(q('.cbx-desc').textContent));
    ok('CBX-G3 …its tabs are named for what they show', J(qa('.cb-panels .tab').map(t => t.textContent)) === J(['Batches & live sessions', 'Learning resources (by module)']));
    ok('CBX-G3 …and it has no input of its own (nothing configured here)', !qa('.cb-body input, .cb-body select, .cb-body textarea').filter(x => !x.closest('.dt, .dt-filt')).length);
    click(q('.cb-panels [data-tab="dresources"]')); ok('CBX-G3 Learning resources: managed within modules, in Learning Resources', /managed within modules/.test(q('.cbx-ov').textContent) && /Manage resources by module/.test(q('.cbx-res [data-go="a-resources"]').textContent));
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
