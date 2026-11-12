// P1 — seat ledger foundation, client demo (suites.sh runs it with FIXTURE=client). Phase 0: the demo batch's places are named (one
// counter for both delivery modes), held / secured follows the payment position, the Finance batch report totals the ledger, and a
// card payment that completes after the batch filled is kept for Finance review — no seat, no silent move, no second payment — until
// Finance closes the review. Phase 1: a real reload keeps the ledger and the review; Reset restores the starting places. Phase 2: a
// copy saved before the ledger existed is restored and its counts migrated.
(async function () {
  // P3 (PD-P3-02): the learner chooses their batch on sign-up step 1. Fixtures that relied on the automatic (CH-42) assignment now pick, on
  // the page, the earliest eligible batch (the one CH-42 assigned); a batch the fixture already set, and that is still eligible, is kept
  const p3Pick = () => { const w = W; if (!w || !p3Open(w) || chStepKey(w) !== 'details' || ui('suBatch', null) || (w.signup.batch && !p3Why(w, chBatch(w.signup.batch), { region: w.signup.l3cPin !== w.signup.batch }))) return; const r = S.route === 'admission' && document.querySelector('main input[name="su-batch"]'); if (r) { r.checked = true; INP.suBatch(r); } else { const b = p3Eligible(w)[0]; if (b) setUi('suBatch', b.code); } };
  const SS = window.sessionStorage, K = 'ft-p1c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P1C test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const act = c => SEATS().recs.filter(r => r.batch === c && SEAT_ACTIVE.includes(r.state));
  const later = (code, days) => { const c = JSON.parse(J(B())); Object.assign(c, { code, label: code, start: new Date(new Date(B().start).getTime() + days * 864e5).toISOString(), enrolled: 0, roster: [], coh: [] }); ADMIN.batches.push(c); return c; };
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); };
  const details = () => { go('admission'); $1('#su-dob').value = '1992-02-02'; $1('#su-ad').value = '5 Test Road, London'; (p3Pick(), ACT.suNext()); };
  const toPay = ff => { const w = W; w.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); (p3Pick(), ACT.suNext()); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const recsJ = () => J(SEATS().recs.map(r => [r.id, r.batch, r.kind, r.state, r.lid]));

  if (PH === 0) {
    await T('P1C-A the demo batch', async () => {
      reset(); const b = B(), a = act(b.code), ws = Object.keys(STORE.worlds).map(k => STORE.worlds[k]).filter(w => w && w.signup && w.signup.done && w.signup.batch === b.code);
      ok('P1C-A1 every place in the demo batch is named — the learners who completed their sign-up (' + b.enrolled + ' of ' + b.cap + ')', a.length === b.enrolled && a.every(r => r.lid) && ws.every(w => a.some(r => r.lid === w.me.id)) && a.length === ws.length, J(a.map(r => r.lid)));
      const modes = new Set(ws.map(w => w.signup.plan && w.signup.plan.opt && w.signup.plan.opt.mode));
      ok('P1C-A2 mixed-mode: Self-Paced and Fully Assisted learners share the one counter', modes.has('Self-Paced') && modes.has('Fully Assisted') && b.enrolled === a.length, J([...modes]));
      render(); const dc = dpCounts(b), si = seatInfo(b);
      ok('P1C-A3 held / secured follows the payment position: the deposit-reserved places are "held" (' + si.held + '), the others "occupied"', dc.reserved === si.held && dc.total === si.active && si.held >= 1, J([dc, si]));
      ok('P1C-A4 invariants', seatInvariants().length === 0, J(seatInvariants()));
      as('fin'); go('f-reports', { tab: 'batchwise' }); const el = $1('.sae-bw'), sum = ADMIN.batches.reduce((x, y) => x + y.enrolled, 0);
      ok('P1C-A5 the Finance batchwise report totals the ledger (' + sum + ')', !!el && +el.dataset.enrolled === sum, el ? el.dataset.enrolled : 'no report');
    });

    await T('P1C-B a payment that completes after the batch filled', async () => {
      reset(); later('DEMO-L3-MAR27', 30); as('short'); const w = W;
      fxFast(ff => { apply('Self-Paced'); details(); toPay(ff); });
      const b = B(), tx0 = w.tx.length, um0 = aud('Payment received for a full batch');
      fxFast(ff => { setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); go('admission'); ACT.suPay(); if (MODAL) prim(); seatSetDemo(b, b.cap, 'P1C: the last place is taken while the card payment is processed'); ff(3000); closeModal(); });
      const tx = w.tx[0], u = SEATS().unmatched[0];
      ok('P1C-B1 the payment the checkout recorded is kept (' + (tx && tx.ref) + ', ' + (tx && tx.status) + ') and linked to a Finance review record', w.tx.length === tx0 + 1 && tx.status === 'Succeeded' && u && tx.seatReview === u.id && u.ref === tx.ref && u.state === 'Finance review' && u.amount === tx.amount);
      ok('P1C-B2 no enrolment is fabricated: the sign-up isn\'t complete and she holds no place', !w.signup.done && !seatActive(b.code, w.me.id) && b.enrolled === b.cap);
      ok('P1C-B3 she isn\'t moved: her batch is still ' + b.code + ' though another batch has a place', w.signup.batch === b.code);
      ok('P1C-B4 Finance is told and it is audited', aud('Payment received for a full batch') === um0 + 1 && STORE.fin.notifs[0].t === 'Payment received for a full batch — Finance review');
      go('admission'); ok('P1C-B5 the payment step says the payment is being reviewed, and drawing it doesn\'t reassign her', /Your payment is being reviewed/.test(main()) && w.signup.batch === b.code);
      const t1 = w.tx.length; ACT.suPay(); closeModal();
      ok('P1C-B6 a second payment is refused while the review is open (nothing charged)', w.tx.length === t1 && aud('Blocked: payment under Finance review') >= 1);
      as('fin'); go('f-exceptions'); ok('P1C-B7 Payment Pending & Exceptions lists the review', /Payments received without a seat/.test(main()) && main().includes(u.ref));
      as('aca'); ACT.p1Review({ dataset: { id: u.id } }); closeModal();
      ok('P1C-B8 an Academic Admin can\'t close it (refused and logged)', u.state === 'Finance review');
      as('fin'); ACT.p1Review({ dataset: { id: u.id } }); reason('P1C: refund raised from the ledger');
      ok('P1C-B9 Finance closes the review with a reason; no money moves (the payment still stands)', u.state === 'Closed' && u.closed.why === 'P1C: refund raised from the ledger' && tx.status === 'Succeeded' && aud('Payment review closed') === 1);
      ok('P1C-B10 invariants', seatInvariants().length === 0, J(seatInvariants()));
      SS.setItem(K + 'recs', recsJ()); SS.setItem(K + 'cnt', String(b.enrolled)); SS.setItem(K + 'um', u.id);
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('P1C-C reload, then Reset', async () => {
      ok('P1C-C1 after a real reload the ledger is the same records, and the counts follow', recsJ() === SS.getItem(K + 'recs') && B().enrolled === +SS.getItem(K + 'cnt'), B().enrolled + ' vs ' + SS.getItem(K + 'cnt'));
      const u = SEATS().unmatched.find(x => x.id === SS.getItem(K + 'um'));
      ok('P1C-C2 the closed review is kept', !!u && u.state === 'Closed');
      ok('P1C-C3 invariants after the reload', seatInvariants().length === 0, J(seatInvariants()));
      reset(); const b = B();
      ok('P1C-C4 Reset demo: the starting places again (all named), no review', b.enrolled === act(b.code).length && act(b.code).every(r => r.lid) && !SEATS().unmatched.length && !ADMIN.batches.some(x => x.code === 'DEMO-L3-MAR27'), b.enrolled);
      SS.setItem(K + 'start', String(b.enrolled)); SS.setItem(K + 'named', J(act(b.code).map(r => r.lid).sort()));
      // a copy saved before STORE.seats existed (the previous build): the same shape without the ledger, saved with that build's signature
      seatSetDemo(b, b.enrolled + 2, 'P1C: two historical places'); render();
      const keep = STORE.seats; delete STORE.seats; let s; try { s = JSON.stringify(fcpEncode(fcpRoots())); } finally { STORE.seats = keep; }
      localStorage.setItem(FCP_KEY, JSON.stringify({ v: FCP_V, fx: 'client', sig: cbrSigWithout(['seats']), at: now().toISOString(), clock: now().getTime() - NOW.getTime(), data: s }));
      FCP.busy = true; // nothing else is saved before the reload
    });
    next(2); return;
  }

  if (PH === 2) {
    await T('P1C-D a copy saved before the ledger', async () => {
      const b = B(), named = J(act(b.code).filter(r => r.lid).map(r => r.lid).sort());
      ok('P1C-D1 it is restored (not discarded as another version)', FCP.st === 'saved' && !!FCP.restored && FCP.p1Up === true, FCP.st);
      ok('P1C-D2 its count is migrated exactly: ' + (+SS.getItem(K + 'start') + 2) + ' places', b.enrolled === +SS.getItem(K + 'start') + 2, b.enrolled);
      ok('P1C-D3 the learners with a completed sign-up are named again; the two extra places stay unattributed', named === SS.getItem(K + 'named') && seatInfo(b).unattributed === 2, named);
      ok('P1C-D4 invariants', seatInvariants().length === 0, J(seatInvariants()));
      reset(); ok('P1C-D5 Reset afterwards: the starting places', B().enrolled === +SS.getItem(K + 'start'));
    });
  }

  ['phase', 'R', 'recs', 'cnt', 'um', 'start', 'named'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
