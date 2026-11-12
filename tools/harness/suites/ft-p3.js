// P3 — learner batch selection, legacy fixture. Region: a learner in the UAE is offered online and UAE batches, not Leicester, and
// a full online batch is listed as full; she picks the later Abu Dhabi batch (not the nearest) and it is stored. An in-progress sign-up
// recorded before P3 (Priya Raman) keeps its batch and continues without being forced through a new choice. The seeded signed learners
// (Aisha Rahman, Grace Mensah) and their records are unchanged. A batch that fills, or a batch a demo shortcut fills, never reassigns.
// The agency-sponsored sign-up keeps its existing behaviour (P8). Waitlist: offers on a learner's own batch still work; moving to the
// next intake is refused. P1 and P2 invariants.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; CLOCK_SHIFT = 0; initStore(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'P3 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const learner = v => { closeModal(); S.edge = 'none'; S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const stepCur = () => { const c = $1('main .ch-su .step.cur .s-l'); return c ? c.textContent : ''; };
  const radios = (n = 'su-batch') => $a(`main input[name="${n}"]`).map(r => r.value);
  const B = c => ADMIN.batches.find(b => b.code === c);
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const histJ = () => J(['C', 'D'].map(k => { const w = STORE.worlds[k]; return [k, w.signup, w.plans, w.tx, w.nvq.batch, w.admission && w.admission.deposit]; }));

  await T('P3-A region, full, the explicit choice', async () => {
    fresh(); learner('B'); const w = W, b0 = w.signup.batch; go('admission'); ACT.suBack(); go('admission');
    ok('P3-A1 Priya\'s sign-up from before P3 keeps the batch it recorded; no choice is invented for it', b0 === 'L3AC-DEC26-AUH' && w.signup.batch === b0 && !w.signup.p3);
    const r = radios(), no = ($1('main .p3-no') || {}).textContent || '';
    ok('P3-A2 a learner in the UAE is offered the UAE batches (Abu Dhabi 1 and 2), earliest first', J(r) === J(['L3AC-DEC26-AUH', 'L3AC-FEB27-AUH']), J(r));
    ok('P3-A3 the full online batch is listed as full; UK classroom batches as another country', /L3AC-OCT26-ONL — Full/.test(no) && /Runs in United Kingdom/.test(no), no.slice(0, 400));
    ok('P3-A4 her recorded batch is the one selected, with the note that she can keep it or choose another', ($1('main input[name="su-batch"]:checked') || {}).value === 'L3AC-DEC26-AUH' && /was assigned to your application before you could choose/.test(main()));
    ok('P3-A5 a single-mode programme: no delivery-mode choice on the page', !$1('main input[name*="mode"], main select[id*="mode"]'));
    const rr = $1('main input[name="su-batch"][value="L3AC-FEB27-AUH"]'); rr.checked = true; INP.suBatch(rr); ACT.suNext();
    ok('P3-A6 she picks Abu Dhabi Cohort 2 instead: stored as her choice; nothing assigned the nearest', w.signup.batch === 'L3AC-FEB27-AUH' && w.signup.p3.how === 'Chosen by the learner' && stepCur() === 'Documents' && aud('Batch chosen at sign-up') === 1);
    ACT.suBack(); go('admission'); const r2 = $1('main input[name="su-batch"][value="L3AC-OCT26-ONL"]');
    setUi('suBatch', 'L3AC-OCT26-ONL'); ACT.suNext(); ok('P3-A7 a forged choice of the full online batch is refused; her choice is unchanged', !r2 && w.signup.batch === 'L3AC-FEB27-AUH' && /Full/.test(lastToast));
    setUi('suBatch', 'L3AC-JAN27-MAN'); ACT.suNext(); ok('P3-A8 a forged choice of a UK batch is refused', w.signup.batch === 'L3AC-FEB27-AUH' && /United Kingdom/.test(lastToast));
    ok('P3-A9 P1 and P2: invariants, LEGACY-1, no zone set on the chosen batch', seatInvariants().length === 0 && p2Terms(w).policy === 'LEGACY-1' && !B('L3AC-FEB27-AUH').tz);
  });

  await T('P3-B a pre-P3 sign-up continues unchanged; a batch that fills never reassigns', async () => {
    fresh(); learner('B'); const w = W; go('admission'); ACT.suBack(); go('admission'); ACT.suNext();
    ok('P3-B1 continuing without a new choice keeps her recorded batch, labelled as kept', w.signup.batch === 'L3AC-DEC26-AUH' && /Kept — assigned before learner batch choice/.test(w.signup.p3.how) && stepCur() === 'Documents');
    fresh(); ACT.chStep({ dataset: { s: '4' } }); const v = W, b = B(v.signup.batch); ACT.chIntakeFills(); go('admission');
    ok('P3-B2 the demo "batch fills before payment": she is not moved; the payment step says it is full and lists the batches she could choose', v.signup.batch === b.code && /is now full/.test(main()) && !$1('main [data-act="suPay"]') && !$1('main input[name="p3-re"]:checked') && !/Your batch has changed/.test(main()));
    const tx0 = v.tx.length; ACT.suPay(); closeModal(); ok('P3-B3 Pay is refused; nothing charged; not moved', v.tx.length === tx0 && v.signup.batch === b.code && !v.signup.done);
    ok('P3-B4 her documents and signed offer letter are kept', !!v.signup.sig && !chMandMissing(v).length);
  });

  await T('P3-C historical signed learners unchanged', async () => {
    fresh(); const h0 = histJ(); learner('C'); go('dashboard'); go('admission'); learner('D'); go('admission'); SA(); go('a-learners');
    ok('P3-C1 Aisha and Grace: sign-up, plans, payments, batch and deposit records unchanged by drawing their pages', histJ() === h0);
    ok('P3-C2 neither is put through a batch choice (no p3 record; no step-1 chooser for a completed sign-up)', ['C', 'D'].every(k => !STORE.worlds[k].signup.p3 && STORE.worlds[k].signup.done));
    const h = chSignupSummary(STORE.worlds.C, 'admin');
    ok('P3-C3 their batch is shown as assigned before learner batch choice (historical)', /Assigned automatically before learner batch choice \(historical\)/.test(h));
  });

  await T('P3-D agency-sponsored sign-up: existing behaviour (P8)', async () => {
    fresh(); ACT.chSponsoredSignup(); const w = W;
    ok('P3-D1 the sponsored sign-up keeps the batch the existing rule sets; no learner choice is added', !!w.signup.batch && !w.signup.p3 && chSponsored(w));
    ok('P3-D2 its step 1 has no batch chooser', (go('admission'), ACT.suGo({ dataset: { s: '1' } }), go('admission'), !$1('main input[name="su-batch"]')));
  });

  await T('P3-E waitlists and cancellation', async () => {
    fresh(); SA(); const b = ADMIN.batches.find(x => x.wait > 0 && ['Open', 'Planned'].includes(x.status));
    const a0 = aud('Blocked: move waitlisted learner to next intake'), w0 = b && b.wait;
    ACT.kNextIntake({ dataset: { id: b.code, n: 'Someone' } });
    ok('P3-E1 moving a waitlisted learner to the next intake is refused and logged; the waitlist is unchanged', !MODAL && b.wait === w0 && aud('Blocked: move waitlisted learner to next intake') === a0 + 1 && /waitlist policy/.test(lastToast));
    ACT.kOffer({ dataset: { id: b.code, n: 'Someone' } }); ok('P3-E2 an offer on the learner\'s own waitlisted batch still opens (existing workflow)', !!MODAL); closeModal();
    const c = ADMIN.batches.find(x => ['Planned', 'Open'].includes(x.status) && batchRoster(x).length && new Date(x.start) > now());
    ACT.cancelBatch({ dataset: { id: c.code } }); const sels = $a('#modal-root .cb-d');
    ok('P3-E3 the cancel dialog starts with no outcome chosen for any learner', !!MODAL && sels.length > 0 && sels.every(s => s.value === ''));
    const st = c.status, e0 = c.enrolled; const t = $1('#cb-r'); if (t) t.value = 'P3 test'; prim();
    ok('P3-E4 confirming without every outcome cancels nothing', c.status === st && c.enrolled === e0); closeModal();
  });

  toast = _t;
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
