// P3 — learner batch selection, client demo (suites.sh runs it with FIXTURE=client). Phase 0: step 1 lists only eligible batches of
// the learner's programme (each exclusion with its reason), nothing is preselected, the learner picks a later batch than the earliest and
// it is stored; a stale or forged choice is refused; a batch that fills, loses its Coordinator or stops taking the fee option after the
// choice stops payment and the learner chooses again — never reassigned; a stale payment dialog and a payment that completes after the
// batch became unavailable are refused / kept for Finance review without a second charge; the end-to-end enrolment into the chosen batch,
// duplicate completion, P1 and P2 invariants. Phase 1: a real reload keeps the choice; Reset clears it; an in-progress sign-up saved
// with a batch recorded before P3. Phase 2: that copy keeps its batch, labelled as assigned before learner choice.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p3c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $$1 = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const DAY = 864e5, iso = t => new Date(t).toISOString();
  // test batches: copies of the demo batch (same programme, staff, accepted fee options), shifted in time, with overrides
  const mk = (code, days, o = {}) => { const s = B(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start: iso(new Date(s.start).getTime() + days * DAY), end: iso(new Date(s.end).getTime() + days * DAY), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [] }, o); delete c.tz; delete c.tzHist; ADMIN.batches.push(c); return c; };
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); };
  const fillDetails = () => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d && !d.value) d.value = '1992-02-02'; if (a && !a.value) a.value = '5 Test Road, London'; };
  const radios = (n = 'su-batch') => $$1(`main input[name="${n}"]`).map(r => r.value);
  const pick = (code, n = 'su-batch') => { const r = $1(`main input[name="${n}"][value="${code}"]`); if (!r) return false; r.checked = true; (n === 'su-batch' ? INP.suBatch : INP.p3Pick)(r); return true; };
  const docsSign = ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); };
  const click = e => { if (e) e.click(); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const L = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /Lena/.test(w.me.first || ''));
  const seatsJ = () => J(SEATS().recs.map(r => [r.id, r.batch, r.kind, r.state, r.lid]));
  const stepCur = () => { const c = $1('main .ch-su .step.cur .s-l'); return c ? c.textContent : ''; };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };

  if (PH === 0) {
    let set;
    await T('P3C-A eligible batches listed; each exclusion with its reason', async () => {
      reset(); const sp = opt('Self-Paced'), fa = opt('Fully Assisted');
      set = { mar: mk('P3-MAR27', 30), may: mk('P3-MAY27', 90), oth: mk('P3-OTHER', 40, { course: 'Another programme (P3 test)' }), dxb: mk('P3-DXB', 50, { label: 'Dubai Cohort P3', mode: 'Blended' }),
        fao: mk('P3-FAONLY', 55, { w1opts: [fa.id] }), full: mk('P3-FULL', 45), canc: mk('P3-CANC', 35, { status: 'Cancelled' }), done: mk('P3-DONE', 36, { status: 'Completed' }),
        started: mk('P3-STARTED', 0, { start: iso(now().getTime() - 5 * DAY) }), today: mk('P3-TODAY', 0, { start: iso(now().getTime() + 3 * 3600e3) }), noco: mk('P3-NOCO', 65, { coords: [], coord: '' }) };
      seatSetDemo(set.full, set.full.cap, 'P3C: the batch is full');
      as('short'); apply('Self-Paced'); const w = L(); fillDetails();
      ok('P3C-A1 a new sign-up has no batch yet; step 1 asks the learner to choose one', w.signup && !w.signup.batch && /Choose your batch/.test(main()) && /The Academy doesn't choose one for you/.test(main()));
      ok('P3C-A2 exactly the eligible batches are offered, earliest first: the demo batch, then +30 and +90 days', J(radios()) === J(['DEMO-L3-JAN27', 'P3-MAR27', 'P3-MAY27']), J(radios()));
      ok('P3C-A3 nothing is preselected (not even the nearest)', !$1('main input[name="su-batch"]:checked'));
      const t = $1('main .p3-opt').textContent.replace(/\s+/g, ' ');
      ok('P3C-A4 each option: name and code, start date, place, the learner\'s delivery mode, places left from the ledger, the deposit under the provisional rule', /DEMO-L3-JAN27/.test(t) && t.includes('Starts ' + fd(B().start)) && /Your delivery mode: Self-Paced/.test(t) && t.includes(seatFree(B()) + ' places left') && /current provisional rule/.test(t) && /not final/.test(t), t);
      const no = ($1('main .p3-no') || {}).textContent || '';
      ok('P3C-A5 another country excluded with its reason', /P3-DXB — Runs in United Arab Emirates/.test(no));
      ok('P3C-A6 a batch that doesn\'t take the learner\'s fee option (Fully Assisted only) is excluded', /P3-FAONLY — Doesn't take your fee option/.test(no));
      ok('P3C-A7 a full batch (P1 ledger) is excluded', /P3-FULL — Full/.test(no) && seatFree(set.full) === 0);
      ok('P3C-A8 a started batch and a batch starting today (U-05, fail closed) are excluded', /P3-STARTED — Started on/.test(no) && /P3-TODAY — Starts today/.test(no) && !chStarted(set.today));
      ok('P3C-A9 a batch with no Academic Coordinator is excluded', /P3-NOCO — No Academic Coordinator yet/.test(no));
      ok('P3C-A10 cancelled and completed batches and another programme\'s batch aren\'t listed at all, and are refused', !/P3-CANC|P3-DONE|P3-OTHER/.test(main()) && /Cancelled/.test(p3Why(w, set.canc)) && /Completed/.test(p3Why(w, set.done)) && p3Why(w, set.oth) === 'A batch of another programme');
      const fake = { id: 'NV-P3DUP', title: cdPr().title, level: 'Level 3', status: 'Draft' }; s3Progs().push(fake);
      ok('P3C-A11 the programme is matched by ID: when two programmes share the batch\'s title, the batch is refused', p3Why(w, B()) === 'A batch of another programme'); s3Progs().splice(s3Progs().indexOf(fake), 1);
      const fw = { ...w, signup: { ...w.signup, plan: { ...w.signup.plan, opt: fa } } };
      ok('P3C-A12 mixed mode: the demo batch takes both modes; the Fully-Assisted-only batch takes a Fully Assisted learner', !p3Why(w, B()) && !p3Why(fw, B()) && !p3Why(fw, set.fao) && /fee option/.test(p3Why(w, set.fao)));
      ok('P3C-A13 the fee option alone decides the delivery mode: no mode choice on the page', !$1('main input[name*="mode"], main select[id*="mode"]'));
    });

    await T('P3C-B the explicit choice, stale and forged choices', async () => {
      const w = L(), a0 = ADMIN.audit.length;
      ACT.suNext(); ok('P3C-B1 Save and continue without a choice is refused; still on step 1, no batch', stepCur() === 'Personal details' && !w.signup.batch && /Choose a batch to continue/.test(main()));
      setUi('suBatch', 'P3-FULL'); ACT.suNext();
      ok('P3C-B2 a forged choice of a full batch is refused and logged; nothing changes', stepCur() === 'Personal details' && !w.signup.batch && aud('Blocked: choose batch') >= 1 && /P3-FULL can't be chosen: Full/.test(lastToast));
      setUi('suBatch', 'P3-DXB'); ACT.suNext(); ok('P3C-B3 a forged choice of another country\'s batch is refused', !w.signup.batch && /United Arab Emirates/.test(lastToast));
      fillDetails(); ok('P3C-B4 the learner picks the +90-day batch on the page (not the earliest)', pick('P3-MAY27'));
      ACT.suNext();
      ok('P3C-B5 stored: the chosen batch, "Chosen by the learner", time; step 2', w.signup.batch === 'P3-MAY27' && w.signup.p3.code === 'P3-MAY27' && w.signup.p3.how === 'Chosen by the learner' && stepCur() === 'Documents');
      ok('P3C-B6 history and audit name the choice; the earlier batches were not used', w.admission.history.some(h => h[0] === 'Details confirmed — batch chosen (P3-MAY27)') && ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Batch chosen at sign-up' && x.after === 'P3-MAY27'));
      ok('P3C-B7 her fee option, programme and P2 terms version are unchanged by the choice', w.signup.plan.opt.mode === 'Self-Paced' && w.signup.prog === cdPr().id && p2Terms(w).policy === 'LEGACY-1');
      fxFast(ff => docsSign(ff)); go('admission');
      ok('P3C-B8 the payment step is for the chosen batch, with the Pay button', stepCur() === 'Payment' && main().includes('P3-MAY27') && !!$1('main [data-act="suPay"]') && !$1('main .p3-gone'));
    });

    await T('P3C-C the chosen batch fills after the choice', async () => {
      const w = L(), tx0 = w.tx.length;
      seatSetDemo(set.may, set.may.cap, 'P3C: the last place goes before payment'); go('admission'); const s0 = seatsJ();
      ok('P3C-C1 the payment step says it is full, nothing charged, and lists the other batches to choose from — none chosen', /P3-MAY27 is now full/.test(main()) && !$1('main [data-act="suPay"]') && J(radios('p3-re')) === J(['DEMO-L3-JAN27', 'P3-MAR27']) && !$1('main input[name="p3-re"]:checked'));
      ok('P3C-C2 she is not moved', w.signup.batch === 'P3-MAY27' && w.signup.p3.code === 'P3-MAY27');
      ACT.suPay(); closeModal(); ok('P3C-C3 Pay is refused: nothing charged, no seat taken, still not moved', w.tx.length === tx0 && w.signup.batch === 'P3-MAY27' && !w.signup.done);
      ACT.p3Rechoose({ dataset: {} }); ok('P3C-C4 "Choose this batch" without a pick does nothing', !MODAL && /Choose a batch first/.test(lastToast));
      pick('P3-MAR27', 'p3-re'); click($1('main [data-act="p3Rechoose"]'), 'choose'); ok('P3C-C5 a confirmation opens; nothing changes until she confirms', !!MODAL && /Choose P3-MAR27/.test(MODAL.title) && w.signup.batch === 'P3-MAY27');
      prim(); closeModal();
      ok('P3C-C6 confirmed: her batch is P3-MAR27, recorded as her choice, with history; seat records untouched', w.signup.batch === 'P3-MAR27' && /Chosen by the learner/.test(w.signup.p3.how) && w.admission.history.some(h => /Batch chosen again before payment: P3-MAY27 → P3-MAR27/.test(h[0])) && seatsJ() === s0 && w.tx.length === tx0);
      go('admission'); ok('P3C-C7 the payment step is open again for P3-MAR27', !!$1('main [data-act="suPay"]') && main().includes('P3-MAR27'));
    });

    await T('P3C-D the batch stops being eligible for another reason; the fee option changes', async () => {
      const w = L(), tx0 = w.tx.length, co = [set.mar.coords, set.mar.coord];
      set.mar.coords = []; set.mar.coord = ''; go('admission');
      ok('P3C-D1 the Coordinator is removed: the payment step says why and offers a choice, no Pay button', /P3-MAR27 can't take you now: No Academic Coordinator yet/.test(main()) && !$1('main [data-act="suPay"]') && radios('p3-re').includes('DEMO-L3-JAN27'));
      const b0 = aud('Blocked: pay for the sign-up (chosen batch unavailable)'); ACT.suPay(); closeModal();
      ok('P3C-D2 Pay by direct call is refused, logged, nothing charged, not moved', aud('Blocked: pay for the sign-up (chosen batch unavailable)') === b0 + 1 && w.tx.length === tx0 && w.signup.batch === 'P3-MAR27');
      [set.mar.coords, set.mar.coord] = co;
      const p0 = w.signup.plan, o0 = p0.opt, w0 = set.mar.w1opts; set.mar.w1opts = [o0.id]; w.signup.plan = { ...p0, opt: opt('Fully Assisted') }; /* the pinned plan is frozen: replaced, then restored */ go('admission');
      ok('P3C-D3 her fee option changes: P3-MAR27 doesn\'t take it — the choice is invalid, no other batch is chosen for her', /P3-MAR27 can't take you now: Doesn't take your fee option/.test(main()) && w.signup.batch === 'P3-MAR27' && !$1('main input[name="p3-re"]:checked'), J([p3CurWhy(w), w1Accepts(set.mar, w.signup.plan.opt.id), main().slice(0, 500)]));
      w.signup.plan = p0; set.mar.w1opts = w0; go('admission'); ok('P3C-D4 restored: the payment step is open again', !!$1('main [data-act="suPay"]'));
    });

    await T('P3C-E stale payment dialog; a payment that completes after the batch became unavailable', async () => {
      const w = L(), tx0 = w.tx.length;
      fxFast(ff => { setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); set.mar.status = 'Cancelled'; prim(); ff(3000); closeModal(); });
      ok('P3C-E1 the dialog opened before the batch was cancelled is refused when confirmed: nothing charged, not moved', w.tx.length === tx0 && !w.signup.done && w.signup.batch === 'P3-MAR27');
      set.mar.status = 'Open'; const um0 = SEATS().unmatched.length, en0 = set.mar.enrolled;
      fxFast(ff => { go('admission'); ACT.suPay(); prim(); set.mar.coords = []; set.mar.coord = ''; ff(3000); closeModal(); });
      const tx = w.tx[0], u = SEATS().unmatched[0];
      ok('P3C-E2 the card payment that completed is kept and linked to a Finance review with the reason', w.tx.length === tx0 + 1 && tx.status === 'Succeeded' && SEATS().unmatched.length === um0 + 1 && tx.seatReview === u.id && /No Academic Coordinator/.test(u.why) && u.state === 'Finance review');
      ok('P3C-E3 no seat, no enrolment, not moved', !w.signup.done && set.mar.enrolled === en0 && !seatActive('P3-MAR27', w.me.id) && w.signup.batch === 'P3-MAR27');
      const t1 = w.tx.length; ACT.suPay(); closeModal();
      ok('P3C-E4 no second charge while Finance reviews it', w.tx.length === t1);
      go('admission'); ok('P3C-E5 the payment step says the payment is being reviewed', /Your payment is being reviewed/.test(main()));
      ok('P3C-E6 Finance is told; invariants hold', STORE.fin.notifs[0].t === 'Payment received for a batch that can\'t take the learner — Finance review' && seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P3C-F end to end: several eligible batches, one chosen, enrolled; duplicate calls', async () => {
      reset(); const m = mk('P3-MAR27', 30), y = mk('P3-MAY27', 90), n0 = m.enrolled, j0 = B().enrolled; as('short'); const w = L(); apply('Self-Paced'); fillDetails();
      ok('P3C-F1 three eligible batches are offered', J(radios()) === J(['DEMO-L3-JAN27', 'P3-MAR27', 'P3-MAY27']));
      pick('P3-MAR27'); ACT.suNext(); fxFast(ff => docsSign(ff));
      fxFast(ff => { setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); prim(); ff(3000); closeModal(); });
      ok('P3C-F2 enrolled into the chosen batch: sign-up done, one named seat in P3-MAR27, the others unchanged', w.signup.done && w.signup.batch === 'P3-MAR27' && m.enrolled === n0 + 1 && seatActive('P3-MAR27', w.me.id) && B().enrolled === j0 && y.enrolled === 0);
      const s1 = seatsJ(), t1 = w.tx.length; chComplete(w, { opt: 'instalment', method: 'card', amount: 300, ref: 'P3-DUP' }, true); ACT.suPay(); closeModal();
      ok('P3C-F3 a second completion and a second Pay add no seat and no charge', seatsJ() === s1 && w.tx.length === t1 && m.enrolled === n0 + 1);
      as('aca'); go('a-admissions', { id: 'APP-' + w.v }); ok('P3C-F4 the application shows the batch was chosen by the learner', /P3-MAR27/.test(main()) && /Chosen by the learner/.test(main()));
      ok('P3C-F5 P1 invariants; P2: LEGACY-1, the batch\'s compatibility time zone untouched', seatInvariants().length === 0 && p2Terms(w).policy === 'LEGACY-1' && !m.tz && p2Active() === 'LEGACY-1');
      ACT.p3Rechoose({ dataset: { b: 'P3-MAY27' } }); ok('P3C-F6 choosing again from the admin portal or after completion changes nothing', !MODAL && w.signup.batch === 'P3-MAR27');
    });

    await T('P3C-G the enrolled demo learners, cancellation and waitlists', async () => {
      reset(); const ws = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).filter(w => w && w.signup && w.signup.done);
      ok('P3C-G1 the demo learners chose the demo batch on step 1 through the real screen', ws.length >= 4 && ws.every(w => w.signup.batch === 'DEMO-L3-JAN27' && w.signup.p3 && w.signup.p3.how === 'Chosen by the learner'));
      const m = mk('P3-MAR27', 30); as('aca'); ACT.cancelBatch({ dataset: { id: 'DEMO-L3-JAN27' } });
      const sels = $$1('#modal-root .cb-d');
      ok('P3C-G2 the cancel dialog has no default outcome for any learner', !!MODAL && sels.length >= 1 && sels.every(s => s.value === ''), J(sels.map(s => s.value)));
      const st0 = B().status, s0 = seatsJ(), rsn = $1('#rsn') || $1('#cb-r'); if (rsn) rsn.value = 'P3C test'; prim();
      ok('P3C-G3 confirming without an outcome for every learner cancels nothing and moves nobody', B().status === st0 && seatsJ() === s0 && ws.every(w => w.signup.batch === 'DEMO-L3-JAN27')); closeModal();
      m.w1wait = [{ id: 'WL-P3', lid: 'IA-L-P3', name: 'Waiting Person', opt: opt('Self-Paced').id, at: now().toISOString(), from: 'DEMO-L3-JAN27' }]; m.wait = 1;
      ACT.kOffer({ dataset: { id: 'P3-MAR27', n: 'Waiting Person', w1: 'WL-P3' } }); ok('P3C-G4 a place on a batch the waitlisted learner didn\'t choose (moved there) can\'t be offered', !MODAL && m.w1wait.length === 1 && /didn't choose/.test(lastToast));
      mk('P3-JUL27', 150); ACT.kNextIntake({ dataset: { id: 'P3-MAR27', n: 'Waiting Person', w1: 'WL-P3' } }); ok('P3C-G5 moving a waitlisted learner to the next intake is refused; the record is kept', !MODAL && m.w1wait.length === 1 && aud('Blocked: move waitlisted learner to next intake') >= 1);
    });

    await T('P3C-H a learner in progress keeps the choice across a reload', async () => {
      reset(); mk('P3-MAR27', 30); as('short'); apply('Self-Paced'); fillDetails(); pick('P3-MAR27'); ACT.suNext(); render();
      SS.setItem(K + 'lena', J([L().signup.batch, L().signup.p3]));
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('P3C-I reload, Reset, and an in-progress sign-up from before P3', async () => {
      const [b, p3] = JSON.parse(SS.getItem(K + 'lena')), w = L();
      ok('P3C-I1 after a real reload: her chosen batch and its record are the same', w.signup.batch === b && J(w.signup.p3) === J(p3) && b === 'P3-MAR27');
      as('short'); go('admission'); ACT.suBack(); go('admission'); ok('P3C-I2 back on step 1 her own choice is the one selected', ($1('main input[name="su-batch"]:checked') || {}).value === 'P3-MAR27');
      ACT.suNext(); ok('P3C-I3 continuing keeps it, still recorded as her choice', w.signup.batch === 'P3-MAR27' && w.signup.p3.how === 'Chosen by the learner');
      reset(); ok('P3C-I4 Reset: no test batch, no sign-up for Lena', !B('P3-MAR27') && !(L().signup && L().signup.batch));
      // the shape a sign-up started before P3 had: the batch recorded at step 1, no p3 record
      as('short'); apply('Self-Paced'); const v = L(); chSetBatch(v, B()); v.signup.step = 2; v.admission.history.push(['Details confirmed — batch assigned (DEMO-L3-JAN27)', now().toISOString()]); render();
    });
    next(2); return;
  }

  if (PH === 2) {
    await T('P3C-J the pre-P3 in-progress sign-up', async () => {
      const w = L();
      ok('P3C-J1 restored: its batch is kept, no choice is invented for it', w.signup.batch === 'DEMO-L3-JAN27' && !w.signup.p3);
      as('aca'); go('a-admissions', { id: 'APP-' + w.v }); ok('P3C-J2 the application says it was assigned before learner batch choice', /Assigned automatically before learner batch choice \(historical\)/.test(main()));
      as('short'); go('admission'); ACT.suBack(); go('admission');
      ok('P3C-J3 step 1 shows it selected, with the note that she can keep it or choose another', ($1('main input[name="su-batch"]:checked') || {}).value === 'DEMO-L3-JAN27' && /was assigned to your application before you could choose/.test(main()));
      fillDetails(); ACT.suNext(); ok('P3C-J4 kept without a new choice: recorded as kept, not as a choice', w.signup.batch === 'DEMO-L3-JAN27' && /Kept — assigned before learner batch choice/.test(w.signup.p3.how));
      reset(); ok('P3C-J5 Reset afterwards: the starting demo', !(L().signup && L().signup.batch) && seatInvariants().length === 0);
    });
  }

  toast = _t;
  ['phase', 'R', 'lena'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
