// AV — agency visibility of final assessment outcomes (31 Oct 2026; PD-AV-*). Runs on the legacy fixture: the client demo has no
// agency-sponsored learner (and none is added to it). Checked: a published Pass and Fail shown to the sponsoring agency at once, with
// the date, the Assessor and the overall feedback; a draft decision hidden; another agency, an unrelated learner in the same batch
// and a self-paid programme refused (page and data accessor, logged); the agency can't declare, edit or publish; the learner's
// and the Assessor's views unchanged.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent.replace(/\s+/g, ' ');
  const $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; if (S.tas) { S.tas.dirty = false; S.tas.qi = 0; } S.saveFail = false; S.offline = false; initStore(); };
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const COO = v => { S.coo.v = v; cooEnter(); S.signedIn = true; };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const AGY = id => agyEnter(id, true);
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  // The Assessor's decision dialog (AR): Pass / Fail, rationale and overall feedback, then "Publish to learner" or "Save draft"
  const decide = (key, res, fb, how = 'Publish to learner', why = 'AV rationale — internal to the Academy') => {
    ACT.r3Declare({ dataset: { k: key } }); if (!MODAL) return false;
    const x = $1(`input[name="r3-res"][value="${res}"]`); if (x) x.checked = true; $1('#d-ofb').value = fb; $1('#rsn').value = why; return act(how);
  };
  const page = (lid, tab = 'progress') => { go('g-learner', { id: lid, tab }); return main(); };
  const card = () => $1('main .av-out');
  const rowOf = title => $a('main .av-out .av-row').find(li => li.textContent.includes(title));
  const sec = () => ADMIN.security.length, J = JSON.stringify;
  const CP = 'AG-02', BC = 'AG-01', GC = 'AG-03';
  const CHLOE = 'IA-L-30237', ISLA = 'IA-L-30459', OLIVER = 'IA-L-30200', JACK = 'IA-L-30274', GRACE = 'IA-L-24560';
  const K = (lid, aid) => lid + '~' + aid, title = aid => BASE_ASGS().find(a => a.id === aid).title;

  fresh();

  await T('AV-0 fixture', async () => {
    ok('AV-0 (setup) Chloe and Isla are CarePlus learners on an NVQ programme sponsored by CarePlus; Oliver is BrightCare\'s; Jack (same batch) has no agency',
      inRoster(CHLOE, 'CarePlus Recruitment (demo)') && inRoster(ISLA, 'CarePlus Recruitment (demo)') && inRoster(OLIVER, 'BrightCare Staffing Ltd (demo)') && !ADMIN.agencies.some(a => inRoster(JACK, a.name))
      && avNvqs(learnerById(CHLOE)).some(e => avSponsors(learnerById(CHLOE), e, 'CarePlus Recruitment (demo)')) && ADMIN.batches.some(b => (b.coh || []).some(c => c.lid === CHLOE) && b.coh.some(c => c.lid === JACK)));
    AGY(CP); page(CHLOE);
    ok('AV-0 before any decision: the Progress tab lists the programme\'s assignments as "Awaiting final assessment" — no Pass or Fail', !!card() && /Final assessment outcomes/.test(card().textContent) && /Level 3 Diploma in Adult Care/.test(card().textContent) && !!rowOf(title('a4')) && /Awaiting final assessment/.test(rowOf(title('a4')).textContent) && !$a('main .av-out .chip').some(c => /^.?(Pass|Fail)$/.test(c.textContent.trim())));
    ok('AV-0 an assignment completed before final outcomes were recorded says so — no Pass is assumed', /No final outcome recorded/.test(rowOf(title('a1')).textContent) && /none is assumed/.test(rowOf(title('a1')).textContent));
    ok('AV-0 the page note says what is shared (outcomes and overall feedback once published; never submissions or criterion feedback)', /Final assignment outcomes and the Assessor's overall feedback are shown once published/.test(main()) && /criterion feedback, scores, assessor notes and IQA are never shared/.test(main()));
  });

  await T('AV-1/2 published Pass and Fail', async () => {
    TCH('A'); decide(K(CHLOE, 'a4'), 'Pass', 'AV overall: a thorough answer with clear examples.'); decide(K(CHLOE, 'a7'), 'Fail', 'AV overall: the reflective account is missing.');
    ok('AV (setup) the allocated Assessor published Pass (a4) and Fail (a7) for Chloe', r3Out(K(CHLOE, 'a4')).result === 'Pass' && r3Out(K(CHLOE, 'a7')).result === 'Fail' && r3Out(K(CHLOE, 'a4')).published === true);
    AGY(CP); page(CHLOE); const p = rowOf(title('a4')), f = rowOf(title('a7')), o = r3Out(K(CHLOE, 'a4'));
    ok('AV-1 CarePlus sees Chloe\'s published Pass for the assignment', !!p && /Pass/.test(p.querySelector('.chip').textContent) && p.textContent.includes(title('a4')));
    ok('AV-1 …with the publication date, the Assessor and the overall feedback', p.textContent.includes('Published ' + fd(o.pubAt)) && /Sarah Okonkwo \(Assessor\)/.test(p.textContent) && /AV overall: a thorough answer/.test(p.textContent));
    ok('AV-2 CarePlus sees Chloe\'s published Fail with its overall feedback', !!f && /Fail/.test(f.querySelector('.chip').textContent) && /AV overall: the reflective account is missing/.test(f.textContent));
    ok('AV-1 the Assessor\'s rationale (internal) and the outcome history are not shown', !/AV rationale/.test(main()) && !/Outcome history/.test(main()));
    const d = agyOutcomes(CHLOE), r4 = d.progs[0].rows.find(r => r.aid === 'a4');
    ok('AV-1 the data accessor returns only the published fields (no rationale, history, judgements or learner record)', r4.result === 'Pass' && r4.by === 'Sarah Okonkwo' && J(Object.keys(r4).sort()) === J(['aid', 'by', 'feedback', 'label', 'pubAt', 'result', 'round', 'title']) && !/AV rationale/.test(J(d)));
    ok('AV-1/2 not derived from criteria: the other assignments stay "Awaiting final assessment"', /Awaiting final assessment/.test(rowOf(title('a5')).textContent) && d.progs[0].rows.filter(r => r.result).length === 2);
    ok('AV-1 the course-level Pass / Fail (G9.4) is still not derived from assignment outcomes', passFail({ status: 'Active' }) === '—');
  });

  await T('AV-3 draft hidden', async () => {
    TCH('A'); decide(K(ISLA, 'a2'), 'Fail', 'AV DRAFT feedback — not for anyone yet.', 'Save draft');
    ok('AV-3 (setup) the Assessor saved a draft decision for Isla (nothing published)', !r3Out(K(ISLA, 'a2')) && R3().odraft[K(ISLA, 'a2')] && R3().odraft[K(ISLA, 'a2')].result === 'Fail');
    AGY(CP); page(ISLA); const r = rowOf(title('a2'));
    ok('AV-3 CarePlus sees "Awaiting final assessment" for it — the draft Fail and its feedback are hidden', !!r && /Awaiting final assessment/.test(r.textContent) && !/Fail/.test(r.textContent) && !/AV DRAFT/.test(main()));
    ok('AV-3 the data accessor never reads the draft', !agyOutcomes(ISLA).progs[0].rows.some(x => x.result) && !/AV DRAFT/.test(J(agyOutcomes(ISLA))));
    // A published outcome that isn't visible under the published-feedback rule stays hidden too (o.published === false)
    const k = K(CHLOE, 'a7'), o = r3Out(k); o.published = false; page(CHLOE);
    ok('AV-3 an outcome not marked published is not shown (the learner\'s visibility rule)', /Awaiting final assessment/.test(rowOf(title('a7')).textContent) && !/reflective account is missing/.test(main()));
    o.published = true;
  });

  await T('AV-4 wrong agency', async () => {
    TCH('A'); decide(K(OLIVER, 'a2'), 'Pass', 'AV overall: Oliver — BrightCare learner.');
    let s0 = sec(); AGY(BC); const h = page(CHLOE);
    ok('AV-4 BrightCare opening Chloe (CarePlus) by URL gets "Not found" — no outcomes', /Not found/.test(h) && !card() && !/AV overall/.test(h) && sec() > s0);
    s0 = sec(); ok('AV-4 BrightCare\'s data accessor refuses Chloe and logs it', agyOutcomes(CHLOE) === null && sec() === s0 + 1 && ADMIN.security[0].type === 'Denied cross-agency access' && ADMIN.security[0].detail.includes(CHLOE));
    page(OLIVER); ok('AV-4 (positive) BrightCare sees its own learner Oliver\'s published Pass', /Pass/.test((rowOf(title('a2')) || {}).textContent || '') && /Oliver — BrightCare learner/.test(main()));
    AGY(GC); s0 = sec(); ok('AV-4 Gulf Care can\'t open Chloe or Oliver (page or accessor)', /Not found/.test(page(CHLOE)) && /Not found/.test(page(OLIVER)) && agyOutcomes(CHLOE) === null && agyOutcomes(OLIVER) === null && sec() >= s0 + 4);
    AGY(CP); s0 = sec(); ok('AV-4 CarePlus can\'t open Oliver (BrightCare) — refused, logged', /Not found/.test(page(OLIVER)) && agyOutcomes(OLIVER) === null && !/Oliver — BrightCare/.test(main()) && sec() >= s0 + 2);
    ok('AV-4 Chloe\'s page shows only Chloe\'s outcomes (not Oliver\'s or Isla\'s)', (page(CHLOE), !/Oliver — BrightCare|AV DRAFT/.test(main())));
  });

  await T('AV-5 unrelated learner', async () => {
    TCH('A'); decide(K(JACK, 'a2'), 'Pass', 'AV overall: Jack — no agency.');
    AGY(CP); let s0 = sec(); const h = page(JACK);
    ok('AV-5 Jack is in Chloe\'s batch but not CarePlus\'s learner: "Not found", nothing shown, logged', /Not found/.test(h) && !/Jack — no agency/.test(h) && sec() > s0);
    s0 = sec(); ok('AV-5 the data accessor refuses an unrelated learner, a missing ID and a made-up ID', agyOutcomes(JACK) === null && agyOutcomes('') === null && agyOutcomes('IA-L-99999') === null && sec() === s0 + 3);
    ok('AV-5 no agency can read Jack\'s outcome', ADMIN.agencies.every(a => { S.agy.id = a.id; return agyOutcomes(JACK) === null; })); AGY(CP);
    ok('AV-5 agency search doesn\'t find him', !/Jack Thompson/.test(agySearchRes('Jack')));
    // On the roster, but the NVQ programme isn't sponsored by this agency (self-paid): no outcomes
    const L = learnerById(CHLOE), e = L._enr.find(x => x.type === 'NVQ / RQF'), sp = e.sponsor; e.sponsor = null; page(CHLOE);
    ok('AV-5 a roster learner\'s self-paid programme shows no outcomes (sponsored programmes only)', !card() && agyOutcomes(CHLOE) === null && !/AV overall/.test(main()));
    e.sponsor = sp;
    // The Academy's per-agency "Pass / Fail result" setting still governs it
    AG().vis.assessment = false; page(CHLOE);
    ok('AV-5 with the Academy\'s "Pass / Fail result" setting off, no outcomes are shared', !card() && agyOutcomes(CHLOE) === null && /Some details are not shared with agencies/.test(main()));
    AG().vis.assessment = true;
    S.portal = 'staff'; ok('AV-5 the accessor works only in the agency portal', agyOutcomes(CHLOE) === null); AGY(CP);
  });

  await T('AV-6 agency cannot publish or edit', async () => {
    AGY(CP); page(CHLOE);
    ok('AV-6 the outcomes card has no control (no button, field or action)', !!card() && !card().querySelector('button, input, select, textarea, [data-act], [contenteditable]'));
    const snap = J(R3()), s0 = sec(), k4 = K(CHLOE, 'a4'), k5 = K(CHLOE, 'a5');
    ACT.r3Declare({ dataset: { k: k5 } }); const m1 = !!MODAL; closeModal();
    ACT.r3Declare({ dataset: { k: k4 } }); const m2 = !!MODAL; closeModal();
    ACT.dOverride({ dataset: { k: k4, q: 'q1' } }); const m3 = !!MODAL; closeModal();
    ACT.r3CooJudge({ dataset: { k: k4, q: 'q1' } }); ACT.mkRelease({ dataset: { k: k4 } }); const m4 = !!MODAL; closeModal();
    ok('AV-6 declaring, re-declaring, overriding, judging or releasing from the agency portal is refused and logged', !m1 && !m2 && !m3 && !m4 && sec() >= s0 + 4);
    ok('AV-6 …and changes nothing (outcomes, drafts, judgements)', J(R3()) === snap && r3Out(k4).result === 'Pass' && !r3Out(k5));
    go('t-mark', { id: k4 }); ok('AV-6 the Assessor workspace isn\'t reachable from the agency portal', !$1('main .r3-out') && !$1('[data-act="r3Declare"]'));
  });

  await T('AV-7 learner and Assessor views unchanged', async () => {
    const k = K(GRACE, 'a4'); TCH('S'); go('t-mark', { id: k });
    ok('AV-7 (Assessor) the decision card and dialog are unchanged: Save draft and Publish to learner', !!$1('main .r3-out [data-act="r3Declare"]') && (ACT.r3Declare({ dataset: { k } }), MODAL && MODAL.actions.some(x => x.label === 'Save draft') && MODAL.actions.some(x => x.label === 'Publish to learner'))); closeModal();
    decide(k, 'Pass', 'AV overall: Grace — clear and complete.'); const o = r3Out(k);
    go('t-mark', { id: k }); ok('AV-7 (Assessor) the workspace shows the published Pass and "Published to the learner"', /Pass/.test($1('main .r3-out').textContent) && /Published to the learner/.test($1('main .r3-out').textContent) && !$1('main .av-out'));
    learner('D'); go('assignment', { id: 'a4' }); const lo = ($1('main .d-lout') || {}).textContent || '';
    ok('AV-7 (learner) Grace still sees her published Pass at once, with the Assessor and overall feedback (AR)', /Pass/.test(lo) && /James Pryce/.test(lo) && /Grace — clear and complete/.test(lo) && STORE.worlds.D.notifs.some(n => n.title === 'Final outcome published'));
    ok('AV-7 (learner) no agency card or wording on the learner\'s pages', !$1('main .av-out') && !/Final assessment outcomes/.test(main()));
    AGY(BC); page(GRACE); const r = rowOf(STORE.worlds.D.assignments.find(a => a.id === 'a4').title);
    ok('AV-7 (agency) BrightCare sees Grace\'s published Pass (a learner with her own record)', !!r && /Pass/.test(r.querySelector('.chip').textContent) && r.textContent.includes('Published ' + fd(o.pubAt)) && /James Pryce/.test(r.textContent));
    COO('A'); ok('AV-7 (Coordinator) still can\'t declare the outcome', (ACT.r3Declare({ dataset: { k: K(CHLOE, 'a5') } }), !MODAL && !r3Out(K(CHLOE, 'a5')))); closeModal();
  });

  await T('AV-8 immediate update', async () => {
    const k = K(CHLOE, 'a5'); AGY(CP); page(CHLOE);
    ok('AV-8 before: "Awaiting final assessment" for a5', /Awaiting final assessment/.test(rowOf(title('a5')).textContent));
    TCH('A'); decide(k, 'Pass', 'AV overall: a5 published while the agency watched.');
    AGY(CP); page(CHLOE); const r = rowOf(title('a5'));
    ok('AV-8 after the Assessor publishes, the agency sees the Pass straight away in the same session (no release, no reload)', /Pass/.test(r.querySelector('.chip').textContent) && /a5 published while the agency watched/.test(r.textContent) && r.textContent.includes('Published ' + fd(r3Out(k).pubAt)));
    TCH('A'); decide(K(ISLA, 'a2'), 'Fail', 'AV overall: Isla — draft now published.');
    AGY(CP); page(ISLA); ok('AV-8 publishing the earlier draft shows it to the agency at once (as published, not the draft text)', /Fail/.test(rowOf(title('a2')).querySelector('.chip').textContent) && /draft now published/.test(main()) && !/AV DRAFT/.test(main()));
    page(CHLOE, 'enrolments'); ok('AV-8 the other learner tabs are unchanged (no outcomes on Enrolments)', !card());
  });

  /* ---------- AV-P: programme-specific ownership (final review) ----------
     Test-only setup on the legacy fixture: Chloe keeps her Level 3 enrolment (sponsored by CarePlus, batch L3AC-JAN26, Assessor
     Sarah) and gains a Level 2 enrolment sponsored by BrightCare (batch L2DC-JAN27) and a self-funded Level 2 Certificate enrolment (L2PW-DEC26-ONL);
     she is linked to BrightCare too. Seeded programmes share assignment IDs, so the outcome's programme stamp decides. */
  const CPN = 'CarePlus Recruitment (demo)', BCN = 'BrightCare Staffing Ltd (demo)', P3 = 'Level 3 Diploma in Adult Care (England)', P2 = 'Level 2 Diploma in Care (England)', P5 = 'Level 2 Certificate in Preparing to Work in Adult Social Care (England)';
  const progsOf = () => { const d = agyOutcomes(CHLOE); return d ? d.progs.map(p => p.prog) : null; };
  const rowIn = (prog, aid) => { const d = agyOutcomes(CHLOE), p = d && d.progs.find(x => x.prog === prog); return p && p.rows.find(r => r.aid === aid); };
  await T('AV-P programme ownership', async () => {
    fresh(); const L = learnerById(CHLOE), cohOf = code => { const b = ADMIN.batches.find(x => x.code === code); return (b.coh = b.coh || []); };
    const join = (code, title, sponsor, id) => { L._enr.push({ id, title, type: 'NVQ / RQF', status: 'Active', enrolled: D(-30), start: D(-30), end: D(300), progress: 10, sponsor, version: 'Version 1' }); cohOf(code).push({ lid: CHLOE, flags: [], last: D(-1), att: 80, pd: [], seed: 7, subs: { a1: 'Submitted', a4: 'Submitted', a5: 'Submitted', a6: 'Submitted' } }); };
    join('L2DC-JAN27', P2, BCN, 'x1'); join('L2PW-DEC26-ONL', P5, null, 'x2'); (STORE.agy.linked[BCN] = STORE.agy.linked[BCN] || []).push(CHLOE);
    // AC-1 (PD-AC-08): each programme has its own assessment record for Chloe (learner~assignment~programme). Was: K(CHLOE, aid), one record per learner and assignment
    const KP = (aid, code) => acKey(CHLOE, aid, ADMIN.batches.find(b => b.code === code));
    ok('AV-P1 (setup) one learner, three NVQ enrolments: Level 3 sponsored by CarePlus, Level 2 by BrightCare, a Level 2 Certificate self-funded; on both agencies\' rosters',
      avNvqs(L).length === 3 && avNvqs(L).filter(e => e.sponsor === CPN).length === 1 && avNvqs(L).filter(e => e.sponsor === BCN).length === 1 && inRoster(CHLOE, CPN) && inRoster(CHLOE, BCN));
    // Programme 1: the real publication by Chloe's Level 3 Assessor, stamped with its programme and batch
    TCH('A'); decide(KP('a4', 'L3AC-JAN26'), 'Pass', 'AVP overall: Level 3 work (CarePlus programme).'); const o4 = r3Out(KP('a4', 'L3AC-JAN26'));
    ok('AV-P publishing stamps the outcome with the programme and batch the Assessor was authorised for', o4 && o4.published && J(o4.own) === J({ prog: P3, batch: 'L3AC-JAN26' }));
    // Programmes 2 and 3: outcomes as the publish step records them (the Level 2 Assessor's declaration check finds her Level 3
    // submission first — an existing R3 limitation, so these two are written in the published shape directly)
    const mk = (aid, res, fb, own) => (R3().out[KP(aid, own.batch)] = { ...JSON.parse(J(o4)), aid, title: title(aid), result: res, feedback: fb, by: 'James Pryce', note: 'internal', own });
    mk('a5', 'Fail', 'AVP overall: Level 2 work (BrightCare programme).', { prog: P2, batch: 'L2DC-JAN27' });
    mk('a6', 'Pass', 'AVP overall: Level 5 work (self-funded).', { prog: P5, batch: 'L2PW-DEC26-ONL' });
    AGY(CP); const cpJ = J(agyOutcomes(CHLOE)); page(CHLOE);
    ok('AV-P2 CarePlus gets only its sponsored Level 3 programme, with its published Pass and feedback', J(progsOf()) === J([P3]) && rowIn(P3, 'a4').result === 'Pass' && /Level 3 work/.test(cpJ) && $a('main .av-out').length === 1 && /Pass/.test(rowOf(title('a4')).querySelector('.chip').textContent));
    ok('AV-P3 CarePlus doesn\'t see the Level 2 (BrightCare) outcome — not in the data, not on the page', !/Level 2 work/.test(cpJ) && rowIn(P3, 'a5').result === null && !/Level 2 work|BrightCare programme/.test(main()) && !/Fail/.test(rowOf(title('a5')).textContent));
    AGY(BC); const bcJ = J(agyOutcomes(CHLOE)); page(CHLOE);
    ok('AV-P2 BrightCare gets only its sponsored Level 2 programme, with its published Fail and feedback', J(progsOf()) === J([P2]) && rowIn(P2, 'a5').result === 'Fail' && /Level 2 work/.test(bcJ) && $a('main .av-out').length === 1 && /Level 2 Diploma in Care/.test($1('main .av-out .av-prog').textContent));
    ok('AV-P3 BrightCare doesn\'t see the Level 3 (CarePlus) outcome', !/Level 3 work/.test(bcJ) && rowIn(P2, 'a4').result === null && !/Level 3 work|CarePlus programme/.test(main()));
    ok('AV-P4 the self-funded programme outcome is shared with neither agency', !/Level 5 work/.test(cpJ + bcJ) && !progsOf().includes(P5) && (AGY(CP), !progsOf().includes(P5) && rowIn(P3, 'a6').result === null));
    ok('AV-P no rationale or note reaches either agency', !/internal|AV rationale/.test(cpJ + bcJ));
    // Same batch alone gives nothing: Rhys (BrightCare) shares Chloe's new Level 2 batch; Jack shares her Level 3 batch
    AGY(CP); let s0 = sec();
    ok('AV-P5 sharing a batch grants nothing: CarePlus can\'t read Rhys (BrightCare, same Level 2 batch) or Jack (no agency, same Level 3 batch)', ADMIN.batches.find(b => b.code === 'L2DC-JAN27').coh.some(c => c.lid === 'IA-L-33100') && agyOutcomes('IA-L-33100') === null && agyOutcomes(JACK) === null && /Not found/.test(page('IA-L-33100')) && sec() >= s0 + 3);
    // Visibility setting OFF: the accessor returns nothing (not just a hidden card); the other agency is unaffected
    AGY(BC); AG().vis.assessment = false; const off = agyOutcomes(CHLOE); page(CHLOE);
    ok('AV-P6 BrightCare with "Pass / Fail result" off: the data accessor returns no outcomes or feedback, and no card', off === null && !card() && !/Level 2 work/.test(main()));
    AGY(CP); ok('AV-P6 …CarePlus (setting on) still gets its own outcome', rowIn(P3, 'a4').result === 'Pass');
    ADMIN.agencies.find(a => a.id === BC).vis.assessment = true;
    // Draft hidden, also for a multi-programme learner
    TCH('A'); decide(KP('a1', 'L3AC-JAN26'), 'Fail', 'AVP DRAFT not for agencies.', 'Save draft');
    AGY(CP); const dj = J(agyOutcomes(CHLOE)); AGY(BC); const dj2 = J(agyOutcomes(CHLOE));
    ok('AV-P7 a saved draft decision is hidden from both agencies', !!R3().odraft[KP('a1', 'L3AC-JAN26')] && !/AVP DRAFT/.test(dj + dj2) && (AGY(CP), rowIn(P3, 'a1').result === null && rowIn(P3, 'a1').label === 'No final outcome recorded' /* a1 was Completed before outcomes: the draft doesn't change that */));
    // Invalid or ambiguous ownership fails closed
    const own4 = o4.own; o4.own = { ambiguous: true }; AGY(CP); const a1 = rowIn(P3, 'a4'); page(CHLOE);
    ok('AV-P8 an outcome stamped ambiguous is shown to no agency ("Not available — contact the Academy")', a1.result === null && a1.label === 'Not available — contact the Academy' && !/Level 3 work/.test(J(agyOutcomes(CHLOE)) + main()) && (AGY(BC), rowIn(P2, 'a4').result === null && !/Level 3 work/.test(J(agyOutcomes(CHLOE)))));
    delete o4.own; AGY(CP); const a2 = rowIn(P3, 'a4'); AGY(BC); const b2 = rowIn(P2, 'a4');
    ok('AV-P8 an unstamped (historical) outcome of a learner with several NVQ enrolments fails closed for both agencies', a2.result === null && a2.label === 'Not available — contact the Academy' && b2.result === null && !/Level 3 work/.test(J(agyOutcomes(CHLOE))));
    o4.own = { prog: 'Some other programme', batch: 'X' }; AGY(CP); const a3 = rowIn(P3, 'a4'); AGY(BC);
    ok('AV-P8 an outcome stamped for a programme neither agency sponsors is shown to neither', a3.result === null && rowIn(P2, 'a4').result === null);
    o4.own = { prog: P3, batch: 'L3AC-JAN26' }; L._enr.push({ id: 'x3', title: P3, type: 'NVQ / RQF', status: 'Withdrawn', sponsor: BCN }); AGY(BC);
    ok('AV-P8 two enrolments on the same programme with different sponsors and no batch on the record: fails closed', rowIn(P3, 'a4').result === null && !/Level 3 work/.test(J(agyOutcomes(CHLOE))));
    L._enr.pop(); o4.own = own4;
    // A real ambiguous publication: Sarah is also the allocated Assessor for Chloe in a batch of another programme (Level 5)
    L._enr.push({ id: 'x4', title: 'Level 5 Diploma in Leadership and Management for Adult Care', type: 'NVQ / RQF', status: 'Active', sponsor: null }); cohOf('L5LM-JAN25').push({ lid: CHLOE, flags: [], last: D(-1), att: 80, pd: [], seed: 7, subs: { a7: 'Submitted' } });
    TCH('A'); const k7 = KP('a7', 'L5LM-JAN25'); decide(k7, 'Pass', 'AVP overall: published while Sarah assesses Chloe on two programmes.'); const o7 = r3Out(k7);
    AGY(CP); const cp7 = J(agyOutcomes(CHLOE)); AGY(BC);
    // AC-1 (PD-AC-08): the publication is on the Level 5 programme's own record, so it is stamped with that programme (not ambiguous) and stays out of both agencies' programmes. Was: one record for both programmes, stamped ambiguous, shared with no agency
    ok('AV-P8 publishing when the Assessor assesses the learner on two programmes goes to that programme\'s own record (stamped Level 5) and is shared with no agency', o7 && o7.published && o7.own && !o7.own.ambiguous && o7.own.batch === 'L5LM-JAN25' && !/two programmes/.test(cp7 + J(agyOutcomes(CHLOE))));
  });

  await T('AV-P9 single-programme outcomes still work', async () => {
    fresh();
    TCH('A'); decide(K(ISLA, 'a2'), 'Pass', 'AVP single: Isla.'); delete r3Out(K(ISLA, 'a2')).own; // as published before the stamp existed
    AGY(CP); ok('AV-P9 a historical (unstamped) outcome of a learner with one NVQ enrolment is still shown to her sponsor', agyOutcomes(ISLA).progs[0].rows.find(r => r.aid === 'a2').result === 'Pass' && /AVP single: Isla/.test((page(ISLA), main())));
    // A learner in several batches of the same programme (a repeat cohort) isn't treated as two programmes
    const BETH = 'IA-L-33121'; TCH('S'); decide(K(BETH, 'a4'), 'Pass', 'AVP single: Bethany, repeat cohorts.'); const ob = r3Out(K(BETH, 'a4'));
    ok('AV-P9 (setup) Bethany is in three Level 2 batches; her outcome is stamped with the one programme', ADMIN.batches.filter(b => (b.coh || []).some(c => c.lid === BETH)).length === 3 && ob && ob.own.prog === P2 && !ob.own.ambiguous);
    AGY(BC); ok('AV-P9 BrightCare sees Bethany\'s published Pass', agyOutcomes(BETH).progs[0].rows.find(r => r.aid === 'a4').result === 'Pass' && /repeat cohorts/.test((page(BETH), main())));
    TCH('S'); decide(K(GRACE, 'a4'), 'Pass', 'AVP single: Grace.'); AGY(BC);
    ok('AV-P9 a learner with her own record (Grace): stamped with her batch and shown to BrightCare', J(r3Out(K(GRACE, 'a4')).own) === J({ prog: P2, batch: 'L2DC-MAR26' }) && /AVP single: Grace/.test((page(GRACE), main())));
    fresh();
  });

  const pre = document.createElement('pre'); pre.id = 'ft-out'; pre.textContent = R.join('\n'); document.body.appendChild(pre);
})();
