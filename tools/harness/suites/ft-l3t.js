// L3 safe corrections T-1…T-3, client demo (suites.sh runs it with FIXTURE=client; a real reload, then Reset).
// T-1: Dev (pinned to version 1) moves to a same-day batch on version 1; a batch recording version 2 is refused everywhere (dialog list,
// a dialog left open while the batch's version changes, direct chDoMove, batch cancellation); unknown versions aren't compared and free
// text is never read. T-2: a refusal inside the move never shows "Moved", keeps the dialog open and changes nothing. T-3: the Self-Paced
// period boundaries are 00:00 UTC on the 15th, and the label reads the same in any time zone.
(async function () {
  const SS = window.sessionStorage, K = 'ft-l3t.', PH = +(SS.getItem(K + 'phase') || 0);
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
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') || document.body).textContent.replace(/\s+/g, ' ');
  const mbtn = re => $a('#modal-root [data-mi]').find(b => re.test(b.textContent.trim()));
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  let toasts = []; const _t = toast; toast = function (m, k) { toasts.push([String(m), k || 'ok']); return _t.apply(this, arguments); };
  const B = (c = 'DEMO-L3-JAN27') => ADMIN.batches.find(b => b.code === c);
  const add = (code, extra = {}) => { const c = JSON.parse(J(B())); Object.assign(c, { code, label: code, enrolled: 0, roster: [], coh: [], mcA: {}, mcH: [] }, extra); ADMIN.batches.push(c); return c; };
  const DV = 'IA-L-32001', W2 = () => STORE.worlds.CD2;
  const state = () => J({ s: W2().signup.batch, nvq: W2().nvq, tree: W2().tree, a: W2().assignments, o: W2().observations, p: W2().plans, coh: ADMIN.batches.map(b => [b.code, b.enrolled, (b.coh || []).map(e => e.lid)]) });
  const successes = () => ADMIN.audit.filter(x => x.action === 'Batch changed (before start)').length;
  // Open Assign / change batch for Dev, choose a batch and confirm with a reason by clicking
  const openMove = () => { as('aca'); p6TzAll(); go('a-learner', { id: DV, tab: 'enrolments' }); click($1('main [data-act="chMoveBatch"]'), 'Request batch transfer'); }; // P6 (PD-P6-02): was 'Assign / change batch'
  const confirmMove = (code, why = 'T-1 test') => { $1('#modal-root #ch-mv-b').value = code; $1('#rsn').value = why; toasts = []; click(mbtn(/^Submit request$/), 'Submit request'); }; // P6 (PD-P6-02): the dialog submits a request (was 'Change batch')
  const approve = (why = 'T approval') => { const q = (SEATS().xfer || { reqs: [] }).reqs.find(x => x.state === 'Pending Academic Approval'); return q ? p6AsSA(() => p6Decide(q.id, 'override', why)) : null; };

  if (PH === 0) {
    await T('T1-1 known matching versions: the move works and says so', async () => {
      const same = add('T-SAME'), n0 = successes(); ok('T1-1 setup: the demo batch and the new batch record version 1; Dev is pinned to version 1', B().progVersion === 1 && same.progVersion === 1 && W2().nvq.s3Pinned && W2().nvq.progVersion === 1);
      openMove(); ok('T1-1a the dialog offers T-SAME', !!$1('#modal-root #ch-mv-b option[value="T-SAME"]'));
      confirmMove('T-SAME'); const sub = toasts.filter(([m]) => /^Transfer request TR-/.test(m)).length; const ap = approve();
      // P6 (PD-P6-02): the dialog submits a request (one confirmation) and the move happens on approval. Was: /^Moved to T-SAME/ shown once by the dialog
      ok('T1-1b moved (real clicks, then approval): Dev is in T-SAME, the dialog closed, the request confirmed once, one success entry', W2().signup.batch === 'T-SAME' && !MODAL && sub === 1 && !!ap && ap.ok && successes() === n0 + 1, J(toasts));
    });

    await T('T1-2 known mismatched versions: refused in the list, on direct call; nothing changes', async () => {
      const v2 = add('T-V2', { progVersion: 2 });
      openMove(); ok('T1-2a the dialog doesn\'t offer the version-2 batch and says why', !$1('#modal-root #ch-mv-b option[value="T-V2"]') && /Not available — another programme version/.test(mtxt()) && /T-V2: Dev Patel \(demo\) is on programme version 1/.test(mtxt()));
      closeModal(); const s0 = state(), n0 = successes(), nt = W2().notifs.length; toasts = [];
      const r = chDoMove(DV, B('T-SAME'), v2, 'direct');
      ok('T1-2b a direct chDoMove is refused with both versions named; nothing about Dev or any batch changed; no success entry, no notice', r === false && /version 1.*T-V2 runs version 2/.test(toasts.map(x => x[0]).join(' ')) && state() === s0 && successes() === n0 && W2().notifs.length === nt && /^Blocked: batch change/.test(ADMIN.audit[0].action) && /version/.test(ADMIN.audit[0].reason)); // P6: refused first for having no approved request, with the version reason
    });

    await T('T1-3 a dialog left open while the target batch records another version: refused on confirm, dialog stays open', async () => {
      const s2 = add('T-SAME2'); openMove(); const offered = !!$1('#modal-root #ch-mv-b option[value="T-SAME2"]'); s2.progVersion = 2; const s0 = state();
      confirmMove('T-SAME2');
      ok('T1-3 offered when opened; on confirm refused with the version reason, the dialog still open, nothing changed, no success shown', offered && !!MODAL && state() === s0 && toasts.some(([m, k]) => k === 'err' && /version 1.*T-SAME2 runs version 2/.test(m)) && !toasts.some(([m]) => /^Moved/.test(m)), J(toasts));
      closeModal();
    });

    await T('T1-4 unknown versions aren\'t compared; free text is never read', async () => {
      const nv = add('T-NOVER'); delete nv.progVersion; ok('T1-4a a batch with no recorded version is offered and not refused', l3tVerWhy(DV, nv) === '');
      const n = W2().nvq, keep = { p: n.s3Pinned, v: n.progVersion, t: n.version }; n.s3Pinned = false; n.progVersion = null; n.version = 'Version 2 — enrolled 12 Jan 2026';
      try { ok('T1-4b a learner whose version is only free text ("Version 2 — …") isn\'t compared with a version-1 batch', l3tVerWhy(DV, B('T-V2')) === '' && l3tVerWhy(DV, B()) === ''); }
      finally { Object.assign(n, { s3Pinned: keep.p, progVersion: keep.v, version: keep.t }); }
      ok('T1-4c nothing was re-pinned or migrated', W2().nvq.s3Pinned === true && W2().nvq.progVersion === 1);
    });

    await T('T2-1 a refusal inside the move: no "Moved", the dialog stays open, nothing changes', async () => {
      add('T-SAME3'); openMove(); const s0 = state(), n0 = successes(), real = chDoMove;
      chDoMove = function () { toast('Refused inside the move (test).', 'err'); return false; }; // any check inside the move that refuses
      confirmMove('T-SAME3'); let ap; try { ap = approve(); } finally { chDoMove = real; }
      // P6 (PD-P6-05): the move now runs when the approved request is carried out; a refusal inside it fails the request (reason recorded), nothing changes.
      // Was: the dialog stayed open with the reason, and the corrected dialog then moved him
      ok('T2-1 the reason is recorded once, never a move; no seat count, allocation or success entry changed', !!ap && !ap.ok && /Refused inside the move/.test(ap.why) && state() === s0 && successes() === n0, J(ap));
      openMove(); confirmMove('T-SAME3'); const ap2 = approve(); ok('T2-1b a new request (the check now passes): moved', W2().signup.batch === 'T-SAME3' && !MODAL && !!ap2 && ap2.ok);
    });

    await T('T2-2 signed terms that would change: refused with the reason, dialog stays open', async () => {
      const later = add('T-LATER', { start: new Date(new Date(B().start).getTime() + 60 * 864e5).toISOString() }); openMove(); const offered = !!$1('#modal-root #ch-mv-b option[value="T-LATER"]');
      const s4 = add('T-SAME4'); closeModal(); openMove(); s4.start = later.start; const s0 = state(); confirmMove('T-SAME4');
      ok('T2-2 a later batch isn\'t offered (signed dates); one that moved meanwhile is refused on confirm with the reason; dialog open; nothing changed', !offered && !!MODAL && state() === s0 && toasts.some(([m, k]) => k === 'err' && /signed payment dates would move|signed terms would change/.test(m)) && !toasts.some(([m]) => /^Moved/.test(m)), J(toasts));
      closeModal();
    });

    await T('T1-5 batch cancellation with a version-incompatible move: nothing cancelled', async () => {
      as('aca'); ACT.cancelBatch({ dataset: { id: 'T-SAME3' } }); if (!MODAL) return ok('T1-5 setup: cancel dialog', false);
      $a('#modal-root .cb-d').forEach(s => { s.value = s.dataset.id === DV ? ([...s.options].some(o => o.value === 'T-V2') ? 'T-V2' : '') : 'refund'; }); // P6: no move option, so Dev's row stays undecided
      const r = $1('#cb-r'); if (r) r.value = 'T-1 test'; toasts = []; const out = prim();
      ok('T1-5 refused before cancelling: the batch stays Open and Dev stays in it', out === false && B('T-SAME3').status === 'Open' && W2().signup.batch === 'T-SAME3' && !$a('#modal-root .cb-d option').some(o => o.value === 'T-V2'), J(toasts)); // P6 (PD-P6-07): no move can be chosen. Was: /Not cancelled/ with the version reason
      closeModal();
    });

    await T('T-perm unauthorized roles can\'t move anyone', async () => {
      for (const p of ['fin', 'biz']) { as(p); toasts = []; ACT.chMoveBatch({ dataset: { id: DV } }); ok(`T-perm ${p}: refused, no dialog`, !MODAL && W2().signup.batch === 'T-SAME3'); }
      closeModal(); ACT.demoSignInAsTas({ dataset: { v: 'S' } }); S.signedIn = true; ACT.chMoveBatch({ dataset: { id: DV } }); ok('T-perm staff portal: refused', !MODAL && W2().signup.batch === 'T-SAME3');
    });

    await T('T3 Self-Paced period boundaries and labels', async () => {
      const a = r4Cycle('2026-06-14T23:30:00Z'), b = r4Cycle('2026-06-15T00:00:00Z');
      ok('T3-1 23:30 UTC on 14 Jun is in the May period; 00:00 UTC on 15 Jun starts the June period (rule unchanged)', a.key === '2026-05' && b.key === '2026-06');
      ok('T3-2 the period runs from 00:00 UTC on the 15th to the last moment of the 14th (UTC); review from 00:00 UTC on the 15th', a.start === '2026-05-15T00:00:00.000Z' && a.end === '2026-06-14T23:59:59.999Z' && a.review === '2026-06-15T00:00:00.000Z');
      as('nvq-sp'); const lblL = r4Cycle('2026-06-14T23:30:00Z').label;
      as('aca'); const lblA = r4Cycle('2026-06-14T23:30:00Z').label;
      ok('T3-3 the label reads "15 May – 14 Jun 2026" for a UK learner (summer time) and for staff alike — dates in UTC', lblL === '15 May – 14 Jun 2026' && lblA === lblL, J([lblL, lblA]));
      as('nvq-sp'); go('assignments'); ok('T3-4 the learner\'s note says when periods change (00:00 UTC on the 15th; 01:00 UK summer time)', /Periods change at 00:00 UTC on the 15th \(01:00 UK time during British Summer Time\)/.test(main()));
      ACT.demoSignInAsTas({ dataset: { v: 'S' } }); S.signedIn = true; go('t-queue'); const tz = $1('main .r4-wl .r4-tz'); ok('T3-5 the Assessor\'s monthly worklist marks the periods as UTC, with the change time on the marker', /Self-Paced monthly worklist/.test(main()) && /\(UTC\)/.test(main()) && !!tz && /Periods change at 00:00 UTC on the 15th/.test(tz.title));
    });

    SS.setItem(K + 'v2', 'T-V2'); closeModal(); if (S.signedIn && ACT.logout) ACT.logout(); return next(1);
  }

  if (PH === 1) {
    await T('T-R after a real refresh', async () => {
      ok('T-R1 restored: Dev in T-SAME3, the version-2 batch recorded', FCP.st === 'saved' && !!FCP.restored && W2().signup.batch === 'T-SAME3' && B('T-V2') && B('T-V2').progVersion === 2);
      toasts = []; ok('T-R2 the version check still refuses after the refresh', chDoMove(DV, B('T-SAME3'), B('T-V2'), 'x') === false && W2().signup.batch === 'T-SAME3');
      ACT.resetDemo(); closeModal(); ok('T-R3 Reset demo: Dev back in DEMO-L3-JAN27, the added batches gone', W2().signup.batch === 'DEMO-L3-JAN27' && !B('T-V2') && !B('T-SAME3'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  ['phase', 'R', 'v2'].forEach(k => SS.removeItem(K + k));
})();
