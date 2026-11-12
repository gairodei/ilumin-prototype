// P2 — terms versions, batch time zones and the one clock, client demo (suites.sh runs it with FIXTURE=client). Phase 0: the signed
// learners are linked to LEGACY-1 from their sign-up start, their signed copies untouched; an application in progress keeps its pinned
// terms and its link while REVISED-1 is refused; the demo batch's time zone is configured without moving any date; deposit holds,
// schedules, access and the seat ledger are unchanged. Phase 1: a real reload keeps all of it; Reset restores the start; a copy saved
// before STORE.terms existed. Phase 2: that copy restored.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p2c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const reset = () => { closeModal(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const CD = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).filter(w => w && w.signup && w.signup.done && w.me);
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const o = opt(mode), r = o && $1(`#modal-root input[name="r1-opt"][value="${o.id}"]`); if (r) r.checked = true; const out = prim(); if (out !== false) closeModal(); };
  const fin = () => J(Object.keys(STORE.worlds).map(k => { const w = STORE.worlds[k]; return [k, w.plans, w.tx, w.signup && w.signup.pin, w.signup && w.signup.plan, w.admission && w.admission.deposit]; }));
  const snaps = () => J(CD().map(w => [w.me.id, w.signup.sig]));
  const seatsJ = () => J(SEATS().recs.map(r => [r.id, r.batch, r.kind, r.state, r.lid]));
  const holds = () => J(CD().map(w => [w.me.id, dpSeat(w).st, dpSeat(w).hold || null]));
  const linksJ = () => J(TERMS().links);
  const lena = () => Object.keys(STORE.worlds).map(k => STORE.worlds[k]).find(w => w && w.me && /Lena/.test(w.me.first || ''));

  if (PH === 0) {
    await T('P2C-A signed learners and their links', async () => {
      reset(); const ws = CD(), t = ws.map(p2Terms), s0 = snaps();
      ok('P2C-A1 every learner who signed up in the demo build is linked to LEGACY-1 from their sign-up start (' + ws.length + ')', ws.length >= 4 && t.every(x => x.policy === 'LEGACY-1' && /^TL-\d{5}$/.test(x.ref) && /Sign-up started/.test(x.basis)));
      ok('P2C-A2 their agreements are verified signed copies, not flagged', t.every(x => x.agreement === 'signed (exact copy kept)' && !x.flagged));
      ok('P2C-A3 the links are frozen records; the signed copies are unchanged and still frozen', Object.values(TERMS().links).every(Object.isFrozen) && snaps() === s0 && ws.every(w => Object.isFrozen(w.signup.sig.snapshot)));
      ok('P2C-A4 nothing to reconcile in the demo; the demo batch is listed as needing a time zone (U-04)', !p2Reconcile().length && p2TzPending().includes(B().code));
    });

    await T('P2C-B an application in progress keeps its terms', async () => {
      reset(); as('short'); const w = lena(), n0 = Object.keys(TERMS().links).length; apply('Self-Paced');
      const s = w.signup, ref = s && s.termsRef, plan0 = J(s && s.plan);
      ok('P2C-B1 starting a sign-up links it to the version in force (LEGACY-1) with the programme and offer-letter version', !!ref && TERMS().links[ref].policy === 'LEGACY-1' && TERMS().links[ref].prog === s.prog && TERMS().links[ref].letterV === s.letterV && Object.keys(TERMS().links).length === n0 + 1);
      as('aca'); const a0 = ADMIN.audit.length; p2Activate('REVISED-1', 'P2C test');
      ok('P2C-B2 REVISED-1 can\'t be activated; her application keeps LEGACY-1, the same link and the same pinned terms', p2Active() === 'LEGACY-1' && p2Terms(w).policy === 'LEGACY-1' && w.signup.termsRef === ref && J(w.signup.plan) === plan0 && ADMIN.audit.length === a0 + 1);
      ok('P2C-B3 her agreement reads "in progress"; not flagged', p2Terms(w).agreement === 'in progress (terms pinned at start)' && !p2Terms(w).flagged);
      SS.setItem(K + 'lena', J([ref, plan0]));
    });

    await T('P2C-C the demo batch\'s time zone, nothing else moved', async () => {
      const b = B(), f0 = fin(), s0 = seatsJ(), h0 = holds(), lk0 = (() => { as('nvq-sp'); return ['assignments', 'course', 'payments'].map(r => (lockFor(r) || {}).title || 'OPEN'); })();
      as('aca'); go('a-batches', { id: b.code }); const strip = () => { const m = $1('main').cloneNode(true); m.querySelectorAll('.p2-tz').forEach(x => x.remove()); return m.textContent.replace(/\s+/g, ' '); }, before = strip();
      ACT.p2Tz({ dataset: { id: b.code } }); $1('#p2-tz').value = 'Europe/London'; $1('#rsn').value = 'P2C: classroom and online learners, Academy in the UK'; const out = prim(); closeModal(); go('a-batches', { id: b.code });
      ok('P2C-C1 the Academic Admin sets Europe/London; rendered batch dates unchanged', out !== false && b.tz === 'Europe/London' && strip() === before && /Academy time zone: Europe\/London/.test($1('main .p2-tz').textContent));
      as('nvq-sp'); const lk1 = ['assignments', 'course', 'payments'].map(r => (lockFor(r) || {}).title || 'OPEN');
      ok('P2C-C2 payment schedules, payments, deposits, seats, deposit holds and course access unchanged', fin() === f0 && seatsJ() === s0 && holds() === h0 && J(lk1) === J(lk0) && seatInvariants().length === 0, J([lk0, lk1]));
      ok('P2C-C3 the deposit holds still read Finance\'s simulated date (one reserved by an unconfirmed transfer)', /reserved/.test(holds()));
      SS.setItem(K + 'links', linksJ()); SS.setItem(K + 'seats', seatsJ()); SS.setItem(K + 'fin', fin());
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('P2C-D reload, Reset, and a copy saved before STORE.terms', async () => {
      const w = lena(), [ref, plan0] = JSON.parse(SS.getItem(K + 'lena'));
      ok('P2C-D1 after a real reload: the same links, the same seats, the same financial records', linksJ() === SS.getItem(K + 'links') && seatsJ() === SS.getItem(K + 'seats') && fin() === SS.getItem(K + 'fin'));
      ok('P2C-D2 the application in progress keeps its link and pinned terms; the batch keeps its zone', w && w.signup.termsRef === ref && J(w.signup.plan) === plan0 && B().tz === 'Europe/London' && B().tzHist.length === 1);
      reset();
      ok('P2C-D3 Reset demo: the starting links only, no zone on the demo batch, no application for Lena', !B().tz && Object.keys(TERMS().links).length === CD().length && !(lena().signup && lena().signup.termsRef));
      SS.setItem(K + 'start', J(CD().map(x => [x.me.id, p2Terms(x).policy])));
      // the previous build's copy: the same data without STORE.terms, saved under that build's signature
      CB10().offset = 0; seatSetDemo(B(), B().enrolled + 1, 'P2C: one historical place'); render();
      const keep = STORE.terms; delete STORE.terms; let s; try { s = JSON.stringify(fcpEncode(fcpRoots())); } finally { STORE.terms = keep; }
      localStorage.setItem(FCP_KEY, JSON.stringify({ v: FCP_V, fx: 'client', sig: cbrSigWithout(['terms']), at: now().toISOString(), clock: now().getTime() - NOW.getTime(), data: s }));
      SS.setItem(K + 'cnt', String(B().enrolled)); FCP.busy = true;
    });
    next(2); return;
  }

  if (PH === 2) {
    await T('P2C-E the copy saved before STORE.terms', async () => {
      ok('P2C-E1 it is restored, not discarded', FCP.st === 'saved' && !!FCP.restored && FCP.p2Up === true, FCP.st);
      ok('P2C-E2 every learner still resolves to LEGACY-1; the seat count is the saved one', J(CD().map(x => [x.me.id, p2Terms(x).policy])) === SS.getItem(K + 'start') && B().enrolled === +SS.getItem(K + 'cnt') && seatInvariants().length === 0);
      reset(); ok('P2C-E3 Reset afterwards: the starting demo', Object.keys(TERMS().links).length === CD().length && !B().tz);
    });
  }

  ['phase', 'R', 'lena', 'links', 'seats', 'fin', 'start', 'cnt'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
