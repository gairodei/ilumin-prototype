// P9 — agency finance arrangements, legacy fixture: historical agency purchases, invoices, sponsored learners and short-course access
// unchanged; historical invoices that aren't portal purchases can't be put on an arrangement; the existing invoice payment path still
// works for invoices without one; cross-agency privacy and direct-call bypasses refused at every action.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'P9 test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); if (STORE.agy) STORE.agy.offset = 0; render(); };
  const AGY = id => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const invRequest = (agId, qty) => { AGY(agId); const ag = AGN(), c = AGY_CATALOGUE()[0]; S.agy.buy = { c, qty }; agInvoiceForm(); const bc = $1('#gi-bc'); if (bc && !bc.value) bc.value = 'PO-P9'; prim(); closeModal(); return ADMIN.queue.find(x => x.type === P9_INV && x.data && x.data.portal && x.data.agency === ag && x.status === 'Pending'); };
  const today = () => p9Today();

  await T('P9-A legacy data unchanged', async () => {
    fresh(); const q0 = J(ADMIN.queue.filter(i => i.type === P9_INV).map(i => [i.id, i.status, i.stage, (i.data || {}).bundleId])), tx0 = STORE.fin.tx.length, b7 = J(p8Auth(ADMIN.bundles.find(b => b.id === 'BN-07')));
    render(); render();
    ok('P9-A1 no arrangement, review or exception exists; historical invoices, the Finance ledger and every bundle\'s backing answer are unchanged', P9().arr.length === 0 && P9().rev.length === 0 && P9().exc.length === 0 && J(ADMIN.queue.filter(i => i.type === P9_INV).map(i => [i.id, i.status, i.stage, (i.data || {}).bundleId])) === q0 && STORE.fin.tx.length === tx0 && J(p8Auth(ADMIN.bundles.find(b => b.id === 'BN-07'))) === b7 && !ADMIN.bundles.some(b => b.p9));
    const i7 = qItem('AQ-2006'); FA(); const r = p9Request('AQ-2006', { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: Math.round(i7.amount * 100) }], why: 'x' });
    ok('P9-A2 a historical invoice that isn\'t a portal bundle purchase can\'t be put on an arrangement (its bundle can\'t be identified)', !r.ok && /historical invoice/.test(r.why), r.why);
    const g = Object.values(STORE.worlds).find(w => w && w.me && /^Grace/.test(w.me.first || ''));
    S.edge = 'none'; setVariant('D'); S.portal = 'learner'; const diff = ['assignments', 'assignment', 'progress', 'observations', 'resources', 'dashboard'].filter(rt => J(lockFor(rt)) !== J(p5Base(rt)));
    ok('P9-A3 the historical sponsored learner (Grace, LEGACY-1, no agency workflow record) keeps exactly her access', !!g && chSponsored(g) && !(g.nvq && g.nvq.p9) && p5Decide(g).code === 'P5-LEGACY' && diff.length === 0, diff.join(','));
    // Grace's sponsored short course (BrightCare) and BrightCare's short-course bundle; SA-1001 (an active agency short-course seat)
    const e = g.enrolments.find(x => x.id === 'mh26'), b = ADMIN.bundles.find(x => x.id === 'BN-01'), sa = STORE.agy.assign.find(x => x.id === 'SA-1001'), sb = ADMIN.bundles.find(x => x.id === sa.bundle);
    const e0 = J([e.end, e.status]), s0 = J([sa.end, sa.status]), l0 = (() => { S.params = { id: 'mh26' }; const l = J(lockFor('course')); S.params = {}; return l; })();
    STORE.agy.offset = Math.max(agDays(b.validity), agDays(sb.validity)) + 30; render(); setVariant('D'); S.portal = 'learner';
    const l1 = (() => { S.params = { id: 'mh26' }; const l = J(lockFor('course')); S.params = {}; return l; })();
    ok('P9-A4 short-course sponsored access follows the course’s own validity: the bundles expiring end nothing already confirmed (enrolment, seat, page access unchanged)', p7Expired(b) && p7Expired(sb) && J([e.end, e.status]) === e0 && J([sa.end, sa.status]) === s0 && l1 === l0, J([e0, s0, l0, l1]));
    STORE.agy.offset = 0; render();
  });

  await T('P9-B existing invoice path and arrangements side by side', async () => {
    fresh(); const o = invRequest('AG-02', 10); FA(); applyDecision(o, 'approve', 'ok'); const s0 = ADMIN.bundles.length;
    ACT.invPay({ dataset: { id: o.id } }); const ra = $1('#ip-r'); if (ra) ra.value = 'BACS-P9-L1'; reason('Received'); AGY('AG-02'); reconcileInvoices();
    ok('P9-B1 an invoice without an arrangement is paid exactly as before (the full amount; one bundle credited)', o.stage === 'paid' && ADMIN.bundles.length === s0 + 1 && P9().arr.length === 0);
    const n = invRequest('AG-02', 10); FA(); applyDecision(n, 'approve', 'ok'); const m = Math.round(n.amount * 100);
    AGY('AG-05'); const x1 = p9Request(n.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m }], why: 'not ours' });
    ok('P9-B2 another agency can\'t request an arrangement for this invoice (refused, logged)', x1.denied && aud('Blocked: request payment arrangement') >= 1 && P9().arr.length === 0);
    AGY('AG-02'); const r = p9Request(n.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m }], why: 'Thirty days' });
    AGY('AG-05'); go('g-purchase', { id: n.id }); const leak = !!$1('main .p9-arr') || (($1('main') || {}).textContent || '').includes(r.id);
    ok('P9-B3 another agency can\'t see the purchase or its arrangement', !leak);
    S.portal = 'learner'; const lp = p9Decide(r.id, 'approve', 'x'); BIZ(); const bz = p9Decide(r.id, 'approve', 'x');
    ok('P9-B4 cross-portal and wrong-role decisions are refused (learner portal, Business Admin)', lp.denied && bz.denied && r.rec.state === P9_PEND);
    FA(); p9Decide(r.id, 'approve', 'ok', r.rec.rev); const B = ADMIN.bundles.find(b => b.inv === n.id);
    AGY('AG-05'); const bt = ADMIN.batches.find(b => b.course === 'Level 2 Diploma in Care (England)' && ['Open', 'Planned'].includes(b.status));
    const y = p8Reserve(B.id, bt ? bt.code : 'X', '', 1, 'not ours');
    ok('P9-B5 another agency can\'t reserve from the arrangement-backed bundle (agency clearance isn\'t transferable)', y.denied === true);
    const notes = (STORE.agy.notifs || []).filter(x => /arrangement/i.test(x.t));
    ok('P9-B6 arrangement notices go to the owing agency only', notes.length >= 1 && notes.every(x => x.agency === n.data.agency));
    AGY('AG-02'); const pay = p9Pay(r.id, { minor: m, ref: 'BACS-AGY', received: today(), why: 'x' });
    ok('P9-B7 the agency can\'t record its own payment as verified (direct call refused)', pay.denied && r.rec.pays.length === 0);
    ok('P9-B8 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
