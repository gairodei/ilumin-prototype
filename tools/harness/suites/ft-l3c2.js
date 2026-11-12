// L3-C2 — batch changes keep signed terms, client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset). Dev (Fully
// Assisted, enrolled, pinned schedule) moves to a batch starting the same day: allowed, nothing contractual changes. Amira (Self-Paced)
// can't move to a batch starting later: her signed dates would change. A dialog left open while the target's start changes is refused
// on confirm. The demo batch's start can't change while signed schedules depend on it; a batch with no signed learners can. A batch
// cancellation that would move someone onto other terms isn't made. Before payment, an automatic reassignment that would change signed
// wording isn't made; a signature that can't be compared fails safe. Tom's released deposit is audited (no policy change).
(async function () {
  // P3 (PD-P3-02): the learner chooses their batch on sign-up step 1. Fixtures that relied on the automatic (CH-42) assignment now pick, on
  // the page, the earliest eligible batch (the one CH-42 assigned); a batch the fixture already set, and that is still eligible, is kept
  const p3Pick = () => { const w = W; if (!w || !p3Open(w) || chStepKey(w) !== 'details' || ui('suBatch', null) || (w.signup.batch && !p3Why(w, chBatch(w.signup.batch), { region: w.signup.l3cPin !== w.signup.batch }))) return; const r = S.route === 'admission' && document.querySelector('main input[name="su-batch"]'); if (r) { r.checked = true; INP.suBatch(r); } else { const b = p3Eligible(w)[0]; if (b) setUi('suBatch', b.code); } };
  const SS = window.sessionStorage, K = 'ft-l3c2.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  // P6 (PD-P6-02): a batch change is a transfer request carried out after approval — in these fixtures a Super Administrator override (audited)
  // P6 correction (PD-P6-05): a transfer needs an explicitly configured Academy time zone on both batches — test setup configures one where missing
  const p6TzAll = () => ADMIN.batches.forEach(b => { if (!tzOk(b.tz)) b.tz = typeof chBatchCountry === 'function' && chBatchCountry(b) === 'United Arab Emirates' ? 'Asia/Dubai' : 'Europe/London'; });
  const p6AsSA = f => { const av = ADMIN.av, po = S.portal, si = S.signedIn; setAdminIdentity('A'); S.portal = 'admin'; try { return f(); } finally { if (av && av !== 'A') setAdminIdentity(av); S.portal = po; S.signedIn = si; } };
  const p6Ok = (why = 'Approved (test)') => p6AsSA(() => { p6TzAll(); const q = (SEATS().xfer || { reqs: [] }).reqs.find(x => x.state === 'Pending Academic Approval'); return q ? p6Decide(q.id, 'override', why) : { ok: false, why: 'no pending request' }; });
  const p6Xfer = (lid, to, why = 'Transfer (test)') => p6AsSA(() => { p6TzAll(); const q = p6Request(lid, typeof to === 'string' ? to : to.code, why); return q.ok ? p6Decide(q.id, 'override', why) : q; });
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = r => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const reset = () => { closeModal(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); };
  const at = iso => { CLOCK_SHIFT += new Date(iso).getTime() - now().getTime(); };
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const add = (code, start, extra = {}) => { const c = JSON.parse(J(B())); Object.assign(c, { code, label: code, start, end: new Date(new Date(start).getTime() + 365 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], mcA: {}, mcH: [] }, extra); ADMIN.batches.push(c); return c; };
  const plus = d => new Date(now().getTime() + d * 864e5).toISOString();
  const WD = v => STORE.worlds[v], rowsJ = v => J(WD(v).plans.find(p => p.e === 'nvq').rows), snapJ = v => J(WD(v).signup.sig.snapshot);
  const txOf = w => allTx().filter(x => x.v === w.v && !x.refund);
  const opt = mode => r1Opts('NV-N1').find(x => x.mode === mode && x.status === 'Active');
  const apply = mode => { go('browse'); ACT.applyNvq({ dataset: { id: CATALOGUE.find(x => x.kind === 'nvq').id } }); const r = $1(`#modal-root input[name="r1-opt"][value="${opt(mode).id}"]`); if (r) r.checked = true; press(); };
  const details = () => { go('admission'); const d = $1('#su-dob'), a = $1('#su-ad'); if (d && !d.value) d.value = '1992-02-02'; if (a && !a.value) a.value = '5 Test Road, London'; lastToast = ''; (p3Pick(), ACT.suNext()); };
  const docsSign = () => { fxFast(ff => { W.docs.filter(d => d.mand).forEach(d => ACT.sampleUpload({ dataset: { id: d.id } })); ff(3000); }); (p3Pick(), ACT.suNext()); setUi('suSig', chFullName(W)); setUi('suDecl', true); ACT.suSign(); };
  const payCard = () => { setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); go('admission'); fxFast(ff => { click($1('main [data-act="suPay"]'), 'Pay'); if (MODAL) prim(); ff(3000); }); closeModal(); };
  const termsLetter = () => { as('aca'); ACT.cbrLetterUp({ dataset: { p: 'NV-N1' } }); setUi('chLetterFile', 'terms.docx'); const x = $1('#lt-x'); if (x) x.value = 'We offer you a place on the {{programme}}.\n\nTo accept, {{payment_terms}}.'; reason('L3C2 letter with payment terms'); };

  if (PH === 0) {
    await T('L3C2-1 enrolled transfer with no contractual change (Dev, Fully Assisted): allowed, through the dialog', async () => {
      reset(); const same = add('DEMO-L3-SAME', B().start), mar = add('DEMO-L3-MAR27', plus(150)), dv = WD('CD2'), r0 = rowsJ('CD2'), s0 = snapJ('CD2'), t0 = txOf(dv).length;
      as('aca'); p6TzAll(); ACT.chMoveBatch({ dataset: { id: dv.me.id } });
      ok('L3C2-1a the dialog offers the batch starting the same day; the later batch is listed as not available (signed terms)', !!$1('#modal-root #ch-mv-b option[value="DEMO-L3-SAME"]') && !$1('#modal-root #ch-mv-b option[value="DEMO-L3-MAR27"]') && /Not available — signed terms would change/.test(mtxt()) && /DEMO-L3-MAR27: signed payment dates would move/.test(mtxt()));
      const a0 = ADMIN.audit.length; $1('#modal-root #ch-mv-b').value = 'DEMO-L3-SAME'; reason('Same start, other cohort'); p6Ok('Same start, other cohort'); // P6 (PD-P6-02): request, then approval
      ok('L3C2-1b moved; his signed letter, pinned schedule and payments are unchanged; the check is audited', dv.signup.batch === 'DEMO-L3-SAME' && rowsJ('CD2') === r0 && snapJ('CD2') === s0 && txOf(dv).length === t0 && since(a0).some(x => x.action === 'Batch change checked against signed terms'));
      SS.setItem(K + 'dv', r0); void mar; void same;
    });

    await T('L3C2-2 a move that would change signed dates (Amira, Self-Paced): refused, nothing changes', async () => {
      const am = WD('CD1'), r0 = rowsJ('CD1'), s0 = snapJ('CD1'), mar = B('DEMO-L3-MAR27'), same = B('DEMO-L3-SAME');
      same.w1opts = [opt('Fully Assisted').id]; // the same-day batch doesn't take her fee option (existing W1 rule), so only MAR27 is left
      as('aca'); const a0 = ADMIN.audit.length; lastToast = ''; ACT.chMoveBatch({ dataset: { id: am.me.id } });
      ok('L3C2-2a no batch is offered: the toast says her signed terms would change and new contractual acceptance is required (logged)', !MODAL && /signed terms would change/.test(lastToast) && /New authorized contractual acceptance is required/.test(lastToast) && since(a0).some(x => x.action === 'Blocked: batch change (signed terms would change)'), lastToast);
      lastToast = ''; const r = chDoMove(am.me.id, B(), mar, 'direct');
      ok('L3C2-2b a direct chDoMove is refused too; her batch, schedule, letter and seat counts unchanged', r === false && am.signup.batch === 'DEMO-L3-JAN27' && rowsJ('CD1') === r0 && snapJ('CD1') === s0 && mar.enrolled === 0, lastToast);
      same.w1opts = B().w1opts.slice();
    });

    await T('L3C2-3 a dialog left open while the target batch\'s start changes is refused on confirm', async () => {
      const am = WD('CD1'), r0 = rowsJ('CD1'), s2 = add('DEMO-L3-SAME2', B().start);
      as('aca'); p6TzAll(); ACT.chMoveBatch({ dataset: { id: am.me.id } }); const offered = !!$1('#modal-root #ch-mv-b option[value="DEMO-L3-SAME2"]');
      $1('#modal-root #ch-mv-b').value = 'DEMO-L3-SAME2'; s2.start = plus(120); s2.end = plus(480); // changed by someone else meanwhile
      const dbg = J([s2.start, l3c2Impact(am, s2), l3c2Redates(am, s2), (cb9Pl(am) || {}).pin ? 'pin' : 'nopin']); lastToast = ''; const r = reason('Stale');
      ok('L3C2-3 offered when opened; refused on confirm after the start moved; nothing changed', offered && r === false && am.signup.batch === 'DEMO-L3-JAN27' && rowsJ('CD1') === r0 && /signed terms would change|can't move/.test(lastToast), lastToast + ' ' + dbg);
      closeModal(); ADMIN.batches = ADMIN.batches.filter(b => b !== s2);
    });

    await T('L3C2-4 batch start date: refused while signed schedules depend on it; allowed for a batch with no signed learners', async () => {
      const s0 = B().start, r0 = rowsJ('CD1'), a0 = ADMIN.audit.length;
      as('aca'); ACT.s4bBatchEdit({ dataset: { id: 'DEMO-L3-JAN27' } }); $1('#bd-s').value = plus(80).slice(0, 10); $1('#bd-e').value = plus(450).slice(0, 10); $1('#bd-r').value = 'Room change'; const r = prim();
      ok('L3C2-4a refused with the learners named and "new authorized contractual acceptance"; start and schedules unchanged; audited', r === false && /Signed payment terms of \d learners? depend on this start date/.test(mtxt()) && /Amira/.test(mtxt()) && /contractual acceptance/.test(mtxt()) && B().start === s0 && rowsJ('CD1') === r0 && since(a0).some(x => x.action === 'Blocked: change batch start date (signed terms would change)'));
      closeModal(); const mar = B('DEMO-L3-MAR27'), m0 = mar.start;
      ACT.s4bBatchEdit({ dataset: { id: 'DEMO-L3-MAR27' } }); $1('#bd-s').value = plus(160).slice(0, 10); $1('#bd-e').value = plus(520).slice(0, 10); $1('#bd-r').value = 'Later start'; prim(); prim(); closeModal();
      ok('L3C2-4b a batch with no signed learners can still change its dates (existing workflow)', mar.start !== m0 && mar.start.slice(0, 10) === plus(160).slice(0, 10));
      lastToast = ''; as('fin'); ACT.s4bBatchEdit({ dataset: { id: 'DEMO-L3-JAN27' } }); ok('L3C2-4c Finance can\'t open the batch editor (existing permission)', !MODAL || !$1('#bd-s')); closeModal();
    });

    await T('L3C2-5 a schedule is never recalculated, even if a batch start changes by other means', async () => {
      const s0 = B().start, r0 = rowsJ('CD4'); B().start = plus(70); render(); render();
      ok('L3C2-5 Sam\'s pinned schedule keeps its signed dates; Finance is told once', rowsJ('CD4') === r0 && ADMIN.audit.filter(x => x.action === 'Batch start differs from the signed payment schedule — dates kept' && x.entity.includes(WD('CD4').me.id)).length === 1);
      B().start = s0; render();
    });

    await T('L3C2-6 cancelling a batch that would move a learner onto other terms isn\'t done', async () => {
      as('aca'); ACT.cancelBatch({ dataset: { id: 'DEMO-L3-JAN27' } }); if (!MODAL) return ok('L3C2-6 setup: cancel dialog', false);
      $a('#modal-root .cb-d').forEach(s => { const am = s.dataset.id === WD('CD1').me.id; s.value = am ? ([...s.options].some(o => o.value === 'DEMO-L3-MAR27') ? 'DEMO-L3-MAR27' : '') : 'refund'; }); // P6: no move option, so her row stays undecided
      const r = $1('#cb-r'); if (r) r.value = 'L3C2 test'; lastToast = ''; const out = prim();
      // P6 (PD-P6-07): cancellation offers no move any more (a move needs an approved transfer first), so Amira's MAR27 option doesn't exist and her
      // row is left without a decision. Was: a move to MAR27 refused for signed terms (/Not cancelled/)
      ok('L3C2-6 refused before anything is cancelled: no move to MAR27 can be chosen; the batch stays Open', out === false && B().status === 'Open' && !$a('#modal-root .cb-d option').some(o => o.value === 'DEMO-L3-MAR27') && WD('CD1').signup.batch === 'DEMO-L3-JAN27', lastToast);
      closeModal();
    });

    await T('L3C2-7 before payment: an automatic reassignment that would change signed wording isn\'t made', async () => {
      reset(); termsLetter(); as('short'); apply('Fully Assisted'); details(); docsSign();
      const mar = add('DEMO-L3-MAR27', plus(150)), cap0 = B().cap; B().enrolled = B().cap; // the batch fills before she pays
      go('admission');
      // P3 (PD-P3-05): no automatic reassignment is attempted any more, so none is recorded as not made; the payment step says the batch is full
      // and names MAR27 as not available with the reason. Was: /Your signed offer letter no longer matches/ and the history line
      // 'Automatic reassignment to DEMO-L3-MAR27 not made'
      ok('L3C2-7a the payment step says her signed letter doesn\'t match the batch she could be moved to; she isn\'t moved', /is now full/.test(main()) && /DEMO-L3-MAR27 — Payment terms differ from the signed offer letter — a new offer letter would be needed/.test(main()) && !$1('main input[name="p3-re"][value="DEMO-L3-MAR27"]') && WD('CD3').signup.batch === 'DEMO-L3-JAN27' && !WD('CD3').admission.history.some(h => /Automatic reassignment/.test(h[0])));
      lastToast = ''; const t0 = txOf(WD('CD3')).length; const r = ACT.suPay();
      ok('L3C2-7b a direct payment is refused; nothing charged', r === false && !WD('CD3').signup.done && txOf(WD('CD3')).length === t0);
      B().enrolled = 4; B().cap = cap0; void mar;
    });

    await T('L3C2-8 a signature whose terms can\'t be compared fails safe', async () => {
      const w = WD('CD3'), snap = w.signup.sig.snapshot; delete w.signup.sig.snapshot; // as a signature made before signed copies were kept
      try {
        as('short'); go('admission');
        ok('L3C2-8a applicant: the version carries payment terms and no copy was kept — payment waits, nothing charged', /Your signed offer letter no longer matches/.test(main()) && /can't be compared/.test(main()) && ACT.suPay() === false);
      } finally { w.signup.sig.snapshot = snap; }
      reset(); const dv = WD('CD2'), s = dv.signup.sig, keep = s.snapshot, v0 = s.v; termsLetter(); const same = add('DEMO-L3-SAME', B().start);
      s.v = chLetterCur('NV-N1').v; delete s.snapshot;
      try { p6TzAll(); lastToast = ''; const r = chDoMove(dv.me.id, B(), same, 'direct'); ok('L3C2-8b enrolled: a move is refused because the signed terms can\'t be checked', r === false && /can't be checked/.test(lastToast) && dv.signup.batch === 'DEMO-L3-JAN27', lastToast); }
      finally { s.snapshot = keep; s.v = v0; }
    });

    await T('L3C2-9 incomplete application recovery still works (default letter)', async () => {
      reset(); as('short'); apply('Fully Assisted'); details(); docsSign(); B().start = plus(-2); add('DEMO-L3-MAR27', plus(90));
      // P3 (PD-P3-05): she chooses MAR27 from the list (was: l3cTake / "Move my application")
      as('short'); go('admission'); { const r = $1('main input[name="p3-re"][value="DEMO-L3-MAR27"]'); if (r) { r.checked = true; INP.p3Pick(r); } } click($1('main [data-act="p3Rechoose"]'), 'Choose'); click(mbtn(/^Choose this batch$/), 'confirm');
      ok('L3C2-9 Lena moves her unpaid application to MAR27 (L3-C)', WD('CD3').signup.batch === 'DEMO-L3-MAR27');
    });

    await T('L3C2-10 deposit audit: Tom paid a deposit, the seat was released after the start (no policy change)', async () => {
      reset(); at('2026-12-10T10:00:00Z'); const tom = WD('CD5'); as('nvq-bank'); go('dashboard');
      as('fin'); ACT.finOffline({ dataset: { k: 'CD5|dep' } }); const r = $1('#op-r'); if (r) r.value = 'BACS-L3C2'; reason('Transfer received');
      const old = tom.plans.find(p => p.e === 'nvq'), dep = allTx().find(x => x.v === 'CD5' && x.ref === 'BACS-L3C2');
      ok('L3C2-10a total paid £100 (the deposit); applied as a £100 credit to payment 1 of the released enrolment; nothing else paid', chReleased(tom) && !!dep && dep.amount === 100 && old.deposit.status === 'Paid' && old.rows[0].paid === 100 && old.rows[0].credit === 100 && old.rows.slice(1).every(x => !(x.paid > 0)), J([dep && dep.amount, old.deposit.status, old.rows.map(x => [x.paid, x.credit])]));
      as('nvq-bank'); ACT.chSignAgain(); as('aca'); const mar = add('DEMO-L3-MAR27', plus(83), { progVersion: tom.nvq.progVersion }); ACT.chMoveBatch({ dataset: { id: tom.me.id } }); reason('Released after start');
      as('nvq-bank'); details(); payCard(); const pl = tom.plans.find(p => p.e === 'nvq'), arch = (tom.plansHist || []).find(p => p.deposit);
      ok('L3C2-10b recovered: enrolled in MAR27; the new plan has no deposit credit; the deposit stays on the earlier record (no duplicate deposit charge)', tom.signup.done && tom.signup.batch === mar.code && !pl.rows.some(x => x.credit > 0) && !!arch && arch.deposit.status === 'Paid' && txOf(tom).filter(x => x.amount === 100).length === 1);
      ok('L3C2-10c the credit stays on the released record (not transferred); no automatic refund or forfeit was raised', !ADMIN.queue.some(i => i.type === 'Refund' && J(i).includes(tom.me.id)) && arch.rows[0].credit === 100 && !pl.rows.some(x => x.credit > 0));
      as('fin'); raiseRefund(dep, { cat: 'Deposit', text: 'L3C2 audit', cons: 'Retain access', amount: 100 }); press();
      ok('L3C2-10d the only recovery path is a manual refund raised by Finance (then approved as usual)', ADMIN.queue.some(i => i.type === 'Refund' && J(i).includes('BACS-L3C2')));
      CLOCK_SHIFT = 0;
    });

    await T('L3C2-11 unauthorized roles', async () => {
      reset(); const same = add('DEMO-L3-SAME', B().start), dv = WD('CD2');
      for (const p of ['fin', 'biz']) { as(p); lastToast = ''; ACT.chMoveBatch({ dataset: { id: dv.me.id } }); ok(`L3C2-11 ${p}: transfer refused`, !MODAL && dv.signup.batch === 'DEMO-L3-JAN27'); }
      closeModal(); ACT.demoSignInAsTas({ dataset: { v: 'S' } }); S.signedIn = true; ACT.chMoveBatch({ dataset: { id: dv.me.id } }); ok('L3C2-11 staff portal: refused', !MODAL && dv.signup.batch === 'DEMO-L3-JAN27');
      void same;
    });

    // For the refresh: Dev moved to the same-day batch
    await T('L3C2-R0 setup', async () => {
      reset(); add('DEMO-L3-SAME', B().start); as('aca'); p6TzAll(); ACT.chMoveBatch({ dataset: { id: WD('CD2').me.id } }); $1('#modal-root #ch-mv-b').value = 'DEMO-L3-SAME'; reason('Refresh setup'); p6Ok('Refresh setup'); // P6 (PD-P6-02)
      ok('L3C2-R0 Dev in DEMO-L3-SAME', WD('CD2').signup.batch === 'DEMO-L3-SAME'); SS.setItem(K + 'rows', rowsJ('CD2')); SS.setItem(K + 'start', B().start);
    });
    closeModal(); if (S.signedIn && ACT.logout) ACT.logout(); return next(1);
  }

  if (PH === 1) {
    await T('L3C2-R after a real refresh', async () => {
      ok('L3C2-R1 restored: Dev in DEMO-L3-SAME, his schedule unchanged, the demo batch start unchanged', FCP.st === 'saved' && !!FCP.restored && WD('CD2').signup.batch === 'DEMO-L3-SAME' && rowsJ('CD2') === SS.getItem(K + 'rows') && B().start === SS.getItem(K + 'start'));
      render(); render(); ok('L3C2-R2 re-rendering after the refresh never recalculates it', rowsJ('CD2') === SS.getItem(K + 'rows'));
      ACT.resetDemo(); closeModal(); ok('L3C2-R3 Reset demo: Dev back in DEMO-L3-JAN27, no added batch', WD('CD2').signup.batch === 'DEMO-L3-JAN27' && !B('DEMO-L3-SAME'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  ['phase', 'R', 'dv', 'rows', 'start'].forEach(k => SS.removeItem(K + k));
})();
