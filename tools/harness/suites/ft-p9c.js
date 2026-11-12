// P9 — agency finance arrangements and sponsored learner access, client demo (FIXTURE=client). Phase 0: the end-to-end example (20
// entitlements on an invoice purchase; a structured arrangement Finance approves; no payment invented; 5 places reserved; one named
// learner confirmed — one entitlement, the reserved place becomes theirs; access only after the explicit test commencement instant;
// a later instalment overdue without suspending the learner); arrangement validation and approval rules; payments and their
// exceptions; overdue and Finance reviews; the access decision; invariants. Phase 1: a real reload, an older copy, Reset.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p9c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P9 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AGY = (id = 'AG-02') => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const asW = k => { closeModal(); S.edge = 'none'; setVariant(k); S.portal = 'learner'; S.signedIn = true; S.auth = null; S.ui = {}; };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); STORE.agy.offset = 0; window.ILM_P4_HARNESS = true; };
  const create = (name, course, seats) => { BIZ(); go('a-bundles', { tab: 'catalogue' }); click($1('main [data-act="newBundle"]')); $1('#bp-n').value = name; $a('#modal-root .bp-c').forEach(x => { x.checked = x.value === course; }); $1('#bp-s').value = String(seats); INP.bpCalc(); const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal(); return STORE.biz.products[n0]; };
  const publish = p => { BIZ(); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1('main .ag1-pub [data-act="bPublish"]')); reason('P9 publish'); };
  const buyCard = (p, qty, outcome = 'success') => { AGY(); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); $1('#gq').value = String(qty); INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = outcome; prim(); const x = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null; return x; };
  const invReq = (p, qty) => { AGY(); S.agy.buy = { c: AGY_CATALOGUE().find(x => x.id === p.id), qty }; agInvoiceForm(); const bc = $1('#gi-bc'); if (bc && !bc.value) bc.value = 'P9 billing'; prim(); closeModal(); return ADMIN.queue.find(x => x.type === P9_INV && x.data && x.data.portal && x.data.catId === p.id && x.status === 'Pending'); };
  const finApprove = i => { FA(); applyDecision(i, 'approve', 'P9: purchase approved, awaiting payment'); return i; };
  const D0 = () => ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27');
  const mk = (code, start, o = {}) => { const s = D0(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start, end: new Date(Date.parse(start) + 380 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [], mcA: {}, mcH: [], cap: 10, tz: 'Europe/London' }, o); delete c.tzHist; delete c.p5Test; ADMIN.batches.push(c); return c; };
  const NVQ = () => (nvqBundleCourses()[0] || {}).title;
  const opt = mode => r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === mode);
  let nInv = 0; const invite = () => { AGY(); nInv++; return agyCreateLearner(`P9 Learner ${nInv} (demo)`, `p9.learner${nInv}@careplus-staff.example`, '+44 7700 94' + String(1000 + nInv), 'Created', ''); };
  const activate = L => { L.acct = 'Active'; lnPortal(L); ag1Activated(L); return agyWorldKey(L); };
  const appOf = aid => ADMIN.apps.find(x => x.agySeat === aid);
  const approve = aid => { const ap = appOf(aid); if (ap) ap.status = 'Approved'; render(); return ap; }; // the admission decision itself is AC-2's; here its effect
  const act = code => SEATS().recs.filter(r => r.batch === code && seatIsActive(r));
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const audRe = re => ADMIN.audit.filter(x => re.test(x.action)).length;
  const today = () => p9Today();
  const split3 = m => { const a = Math.floor(m / 3); return [a, a, m - 2 * a]; };
  const rows = (ms, offs) => ms.map((minor, k) => ({ due: ymdAdd(today(), offs[k]), minor }));
  const obMinor = i => Math.round(i.amount * 100);
  const commence = (b, iso) => p5HarnessCommence(b, iso, 'P9C: explicit test commencement instant');
  const lk = (r, id) => { const k = S.params; S.params = id ? { id } : {}; try { return lockFor(r); } finally { S.params = k; } };
  const LEARN = [['assignments'], ['assignment'], ['progress'], ['observations'], ['course', 'nvq'], ['quiz', 'nvq']];
  const learnLocked = () => LEARN.every(([r, id]) => { const l = lk(r, id); return !!l && !!l.p5; });
  const learnOpen = () => LEARN.every(([r, id]) => !lk(r, id));
  const inv7 = () => ADMIN.bundles.filter(b => b.agency).every(b => { const x = p7Bal(b), cons = P7().recs.filter(r => r.bundle === b.id && r.type === 'consume' && !r.returned).map(r => r.ref); return new Set(cons).size === cons.length && x.consumed <= x.purchased && (x.expired || x.consumed + x.pending + x.reserved + x.free <= x.purchased); });
  const inv8 = () => P8().recs.every(r => { const s = SEATS().recs.find(z => z.id === r.seat), n = SEATS().recs.filter(z => z.resv === r.id && seatIsActive(z)).length; return P8_LIVE.includes(r.state) ? !!s && seatIsActive(s) && !s.lid && n === 1 : r.state === 'confirmed' ? !!s && seatIsActive(s) && !!s.lid : !s || !seatIsActive(s) || !!s.lid; });
  let I, A, B, L, k, w, mar, a1, a2, a3;

  if (PH === 0) {
    await T('P9C-A the end-to-end example', async () => {
      reset(); D0().tz = 'Europe/London';
      const p = create('P9 NVQ — 20 entitlements (demo)', NVQ(), 20); publish(p);
      I = invReq(p, 20); finApprove(I); const m = obMinor(I), tx0 = STORE.fin.tx.length, nb0 = ADMIN.bundles.length;
      ok('P9C-A1 the agency\'s invoice purchase of 20 entitlements is approved by Finance and awaits payment; no bundle and nothing to reserve from yet', I.stage === 'awaiting' && I.status === 'Approved' && !I.data.bundleId && ADMIN.bundles.length === nb0, J([I.stage, I.status]));
      [a1, a2, a3] = split3(m); AGY();
      const rq = p9Request(I.id, { type: 'instalments', rows: rows([a1, a2, a3], [30, 60, 90]), why: 'Three payments over the intake', key: 'kA' }); A = rq.rec;
      ok('P9C-A2 the agency requests a structured arrangement covering the exact obligation (integer pence, three instalments, totalling it exactly); pending authorises nothing', rq.ok && A.state === P9_PEND && A.totalMinor === m && a1 + a2 + a3 === m && A.sched.every(r => Number.isInteger(r.minor)) && !I.data.bundleId && ADMIN.bundles.length === nb0, J(rq.why || A.sched));
      FA(); const d = p9Decide(A.id, 'approve', 'Approved — three instalments', A.rev); B = ADMIN.bundles.find(b => b.id === d.bundle);
      ok('P9C-A3 Finance approves: the arrangement is in force and authorises the purchase\'s 20 entitlements once (one bundle, one P7 purchase entry, arrangement-backed)', d.ok && A.state === 'Active' && !!B && p7Bal(B).purchased === 20 && P7().recs.filter(r => r.bundle === B.id && r.type === 'purchase').length === 1 && P7().recs.find(r => r.bundle === B.id && r.type === 'purchase').backing === 'arrangement' && B.p9 === A.line, J(d));
      const e = P7().recs.find(r => r.bundle === B.id && r.type === 'purchase');
      ok('P9C-A4 no payment is invented: the invoice stays approved and unpaid, no Finance ledger row, no "Credited" licence row, no receipt; the agency sees it awaiting payment', I.stage === 'awaiting' && I.status === 'Approved' && STORE.fin.tx.length === tx0 && !STORE.fin.tx.some(t => (t.course || '').includes(I.id)) && !STORE.agy.ledger.some(l => l.bundle === B.id && l.type === 'Credited') && e.pay === null && agyPurchases('CarePlus Recruitment (demo)').find(x => x.ref === I.id).status === 'Approved – awaiting payment');
      ok('P9C-A5 approval reserves no place', !SEATS().recs.some(r => r.kind === 'agencyReserved' && r.ent === B.id) && P8().recs.length === 0 && p7Bal(B).reserved === 0 && p7Bal(B).free === 20);
      mar = mk('P9-MAR', '2027-03-10T09:00:00Z'); const SP = opt('Self-Paced');
      AGY(); const r5 = p8Reserve(B.id, 'P9-MAR', SP.id, 5, 'March intake', 'kA5'), x5 = p7Bal(B);
      ok('P9C-A6 the agency reserves 5 places in an eligible future batch against the arrangement: 5 P1 places, 5 reserved, 15 available; the audit names the arrangement', r5.ok && act('P9-MAR').length === 5 && x5.reserved === 5 && x5.free === 15 && aud('Reservation backed by a payment arrangement') === 1 && P8().recs.every(r => (r.auth.evidence || '').includes(A.id)), J([r5, x5]));
      L = invite(); k = activate(L); const rv = P8().recs.find(r => r.state === 'active'), nm = p8Name(rv.id, L.id, 'Named for March'); w = STORE.worlds[k];
      ok('P9C-A7 a named learner on one reservation: admission pending, nothing consumed, no programme in their account (a pending named assignment grants no access)', nm.ok && rv.state === 'named' && p7Bal(B).consumed === 0 && !!w && !w.nvq && !Object.values(STORE.worlds).some(x => x && x.nvq && x.nvq.p9));
      const s0 = rv.seat; approve(nm.assign); const x8 = p7Bal(B), seat = SEATS().recs.find(r => r.id === s0); w = STORE.worlds[k];
      ok('P9C-A8 admission approval: one entitlement consumed, the reserved place converted into the learner\'s confirmed place (same P1 record), 4 still reserved', rv.state === 'confirmed' && x8.consumed === 1 && x8.reserved === 4 && x8.free === 15 && seat.lid === L.id && seat.kind === 'sponsored' && act('P9-MAR').length === 5 && P7().recs.filter(r => r.type === 'consume' && r.ref === nm.assign).length === 1, J(x8));
      ok('P9C-A9 the confirmed enrolment is in the learner\'s account with its programme, batch, fee option, mode and agency references', !!w.nvq && !!w.nvq.p9 && w.nvq.p9.assign === nm.assign && w.nvq.p9.bundle === B.id && w.nvq.p9.batch === 'P9-MAR' && w.nvq.p9.optId === SP.id && w.nvq.p9.mode === 'Self-Paced' && w.signup.batch === 'P9-MAR' && w.signup.done && w.enrolments.includes(w.nvq) && w.nvq.sponsor === B.agency);
      commence(mar, '2027-03-10T09:00:00Z'); asW(k);
      ok('P9C-A10 before the explicit test commencement instant: no learning (P9-NOT-STARTED); admission, payments and messages stay open', p5Decide(w).code === 'P9-NOT-STARTED' && learnLocked() && ['admission', 'payments', 'messages', 'profile'].every(r => !lk(r)), p5Decide(w).code);
      FA(); const pay1 = p9Pay(A.id, { minor: a1, ref: 'BACS-P9-0001', received: today(), why: 'Instalment 1 received' });
      ok('P9C-A11 instalment 1 received and verified by Finance: allocated to instalment 1 exactly; a Finance ledger row with the bank reference; the invoice still unpaid', pay1.ok && J(pay1.alloc) === J([{ inst: A.sched[0].id, minor: a1 }]) && pay1.outstanding === a2 + a3 && STORE.fin.tx.filter(t => t.ref === 'BACS-P9-0001' && t.p9 === A.id && t.amount === a1 / 100).length === 1 && I.stage === 'awaiting', J(pay1));
      Clock.freeze(ymdAdd(A.sched[1].due, 1) + 'T12:00:00Z'); render(); const n2 = (STORE.agy.notifs || []).filter(x => x.t === 'Payment overdue').length, fn2 = STORE.fin.notifs.filter(x => x.t === 'Agency payment overdue').length;
      ok('P9C-A12 instalment 2 unpaid after its due date: overdue recorded once, the agency and Finance told in-app, a Finance review opened listing the learner', A.state === 'Overdue' && !!A.overdue[A.sched[1].id] && n2 === 1 && fn2 === 1 && P9().rev.length === 1 && P9().rev[0].learners.some(x => x.lid === L.id) && aud('Finance review opened (agency overdue)') === 1, J([A.state, n2, fn2]));
      Clock.freeze('2027-03-11T10:00:00Z'); render(); render(); asW(k); const dd = p5Decide(w);
      ok('P9C-A13 after the commencement instant, with two instalments overdue: learning opens (no automatic suspension) — P9-OK, the arrangement named', dd.allowed && dd.code === 'P9-OK' && learnOpen() && A.state === 'Overdue' && (dd.refs.finance === A.id) && /overdue/.test(dd.reason), J(dd));
      const x13 = p7Bal(B);
      ok('P9C-A14 every count: 20 purchased = 1 consumed + 0 reserved (the 4 unnamed places were released at the cutoff) + 19 available; places: 1 learner in P9-MAR', x13.purchased === 20 && x13.consumed === 1 && x13.reserved === 0 && x13.free === 19 && act('P9-MAR').length === 1 && P8().recs.filter(r => r.state === 'released' && r.auto).length === 4, J(x13));
      ok('P9C-A15 every amount: obligation = paid + outstanding in pence; overdue notices once per instalment (2 and 3) after more passes', p9Paid(I.id) === a1 && p9Out(A) === a2 + a3 && (STORE.agy.notifs || []).filter(x => x.t === 'Payment overdue').length === 2 && P9().rev.length === 1 && P9().rev[0].insts.length === 2);
      ok('P9C-A16 every reference: invoice ↔ arrangement ↔ bundle ↔ P7 entry ↔ reservation ↔ assignment ↔ consumption ↔ learner account', I.data.p9 === A.line && I.data.bundleId === B.id && e.src === A.id && e.inv === I.id && rv.assign === nm.assign && p7ConsOf(nm.assign).bundle === B.id && p7ConsOf(nm.assign).enrol === appOf(nm.assign).id && w.nvq.p9.app === appOf(nm.assign).id && w.nvq.p9.resv === rv.id);
      FA(); const pay2 = p9Pay(A.id, { minor: a2 + a3, ref: 'BACS-P9-0002', received: p9Today(), why: 'Balance received' });
      ok('P9C-A17 the rest received: satisfied, the invoice paid in full (no second bundle, no new entitlements); the learner still has access', pay2.ok && A.state === 'Satisfied' && I.stage === 'paid' && I.status === 'Paid/Processed' && ADMIN.bundles.filter(b => b.inv === I.id).length === 1 && p7Bal(B).purchased === 20 && p5Decide(w).allowed, J(pay2));
      Clock.unfreeze(); SS.setItem(K + 'e2e', J({ arr: A.id, inv: I.id, bundle: B.id, k, lid: L.id, state: A.state }));
    });

    await T('P9C-B arrangement rules and approval', async () => {
      Clock.unfreeze(); const p = create('P9 NVQ — 4 entitlements (demo)', NVQ(), 4); publish(p);
      const fresh = () => finApprove(invReq(p, 4));
      const i1 = fresh(), m1 = obMinor(i1); AGY();
      const bad = (o, re) => { const r = p9Request(i1.id, { why: 'x', ...o }); return !r.ok && re.test(r.why); };
      ok('P9C-B1 totals are exact in pence: 1p short or over is refused', bad({ type: 'deferred', rows: [{ due: ymdAdd(today(), 20), minor: m1 - 1 }] }, /exactly/) && bad({ type: 'deferred', rows: [{ due: ymdAdd(today(), 20), minor: m1 + 1 }] }, /exactly/));
      ok('P9C-B2 invalid dates are refused: not a date, in the past, out of order', bad({ type: 'deferred', rows: [{ due: '15/01/2027', minor: m1 }] }, /YYYY-MM-DD/) && bad({ type: 'deferred', rows: [{ due: ymdAdd(today(), -1), minor: m1 }] }, /past/) && bad({ type: 'instalments', rows: [{ due: ymdAdd(today(), 40), minor: m1 - 100 }, { due: ymdAdd(today(), 20), minor: 100 }] }, /order/));
      ok('P9C-B3 invalid amounts are refused: zero, negative, fractional pence', bad({ type: 'instalments', rows: [{ due: ymdAdd(today(), 20), minor: 0 }, { due: ymdAdd(today(), 40), minor: m1 }] }, /positive whole/) && bad({ type: 'instalments', rows: [{ due: ymdAdd(today(), 20), minor: -100 }, { due: ymdAdd(today(), 40), minor: m1 + 100 }] }, /positive whole/) && bad({ type: 'deferred', rows: [{ due: ymdAdd(today(), 20), minor: m1 - 0.5 }] }, /positive whole/));
      ok('P9C-B4 duplicate schedule rows (two instalments on one date) are refused', bad({ type: 'instalments', rows: [{ due: ymdAdd(today(), 20), minor: 100 }, { due: ymdAdd(today(), 20), minor: m1 - 100 }] }, /same|own date|due on/));
      ok('P9C-B5 type rules and currency: a deferred payment with two rows, instalments with one, another currency — refused; no arrangement created', bad({ type: 'deferred', rows: [{ due: ymdAdd(today(), 20), minor: 100 }, { due: ymdAdd(today(), 40), minor: m1 - 100 }] }, /exactly one/) && bad({ type: 'instalments', rows: [{ due: ymdAdd(today(), 20), minor: m1 }] }, /two or more/) && bad({ type: 'deferred', cur: 'USD', rows: [{ due: ymdAdd(today(), 20), minor: m1 }] }, /GBP/) && !P9().arr.some(a => a.inv === i1.id));
      const d1 = p9Request(i1.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 45), minor: m1 }], why: 'Pay in 45 days', key: 'kB1' }), again = p9Request(i1.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 45), minor: m1 }], why: 'Pay in 45 days', key: 'kB1' });
      ok('P9C-B6 a deferred single payment request; repeating it with the same identity creates nothing', d1.ok && again.dup && P9().arr.filter(a => a.inv === i1.id).length === 1);
      BIZ(); const bz = p9Decide(d1.id, 'approve', 'x'); ACA(); const ac = p9Decide(d1.id, 'approve', 'x'); AGY(); const ag = p9Decide(d1.id, 'approve', 'x');
      ok('P9C-B7 nobody but Finance approves: Business Admin, Academic Admin and the agency are refused (logged)', bz.denied && ac.denied && ag.denied && d1.rec.state === P9_PEND && audRe(/^Blocked: approve payment arrangement$/) >= 3);
      FA(); const okd = p9Decide(d1.id, 'approve', 'Deferred to 45 days', d1.rec.rev), dup = p9Decide(d1.id, 'approve', 'again'), b1 = ADMIN.bundles.filter(b => b.inv === i1.id);
      ok('P9C-B8 a Finance Admin approves the deferred payment; a duplicate approval changes nothing (one bundle, one purchase entry)', okd.ok && dup.dup && b1.length === 1 && P7().recs.filter(r => r.bundle === b1[0].id && r.type === 'purchase').length === 1 && p7Bal(b1[0]).purchased === 4);
      const i2 = fresh(), m2 = obMinor(i2); AGY(); const r2 = p9Request(i2.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m2 }], why: 'One payment' });
      FA(); const rf = p9Decide(r2.id, 'refuse', 'Not offered for this agency'), rf2 = p9Decide(r2.id, 'approve', 'x');
      ok('P9C-B9 refusal: no bundle, no entitlement; a later approval of the refused request does nothing; the agency is told', rf.ok && r2.rec.state === 'Refused' && rf2.dup && !i2.data.bundleId && (STORE.agy.notifs || []).some(x => x.t === 'Payment arrangement refused'));
      const i3 = fresh(), m3 = obMinor(i3); AGY(); const r3 = p9Request(i3.id, { type: 'instalments', rows: [{ due: ymdAdd(today(), 30), minor: m3 - 100 }, { due: ymdAdd(today(), 60), minor: 100 }], why: 'Two payments' });
      FA(); const ch = p9Decide(r3.id, 'changes', 'Make the second payment larger', r3.rec.rev); const seen = r3.rec.rev;
      AGY(); const rs = p9Resubmit(r3.id, { type: 'instalments', rows: [{ due: ymdAdd(today(), 30), minor: Math.floor(m3 / 2) }, { due: ymdAdd(today(), 60), minor: m3 - Math.floor(m3 / 2) }], why: 'Halved' });
      ok('P9C-B10 changes requested, then resubmitted: the earlier schedule stays in the history', ch.ok && rs.ok && r3.rec.state === P9_PEND && r3.rec.rev === seen + 1 && r3.rec.hist.some(h => h.prevSched && h.prevSched[1].minor === 100));
      FA(); const st = p9Decide(r3.id, 'approve', 'old dialog', seen);
      ok('P9C-B11 a stale approval dialog (opened before the resubmission) can\'t approve', !st.ok && st.stale && r3.rec.state === P9_PEND);
      FA('FA'); const fq = p9Request(i3.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m3 }], why: 'x' });
      ok('P9C-B12 one open request per obligation', !fq.ok && /already waiting/.test(fq.why));
      FA('FB'); const okr = p9Decide(r3.id, 'approve', 'Agreed', r3.rec.rev);
      ok('P9C-B13 approved with the current dialog', okr.ok && r3.rec.state === 'Active');
      const i4 = fresh(), m4 = obMinor(i4); FA('FA'); const r4 = p9Request(i4.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m4 }], why: 'Requested by Finance for the agency' }); const self = p9Decide(r4.id, 'approve', 'mine', r4.rec.rev);
      ok('P9C-B14 no self-approval: the Finance Admin who requested it can\'t approve it (logged)', !!r4.ok && self.denied && /no self-approval/.test(self.why) && r4.rec.state === P9_PEND);
      SA(); const ov = p9Decide(r4.id, 'override', 'Super Administrator decision — Finance unavailable', r4.rec.rev);
      ok('P9C-B15 Super Administrator override: explicit, reasoned, audited, and still checks the obligation', ov.ok && r4.rec.dec.kind === 'override' && aud('Payment arrangement approved (Super Administrator override)') === 1 && r4.rec.hist.some(h => /override/.test(h.what)));
      const i5 = fresh(), m5 = obMinor(i5); AGY(); const r5 = p9Request(i5.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: m5 }], why: 'x' }); i5.amount = i5.amount + 10;
      FA(); const so = p9Decide(r5.id, 'approve', 'stale', r5.rec.rev);
      ok('P9C-B16 a stale obligation (its amount changed after the request) can\'t be approved: invalidated, nothing authorised', !so.ok && r5.rec.state === 'Invalidated' && !i5.data.bundleId, J(so));
      const pend = invReq(p, 4); AGY(); const pr = p9Request(pend.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: obMinor(pend) }], why: 'x' });
      ok('P9C-B17 a purchase Finance hasn\'t approved yet can\'t get an arrangement (nothing to reserve from)', !pr.ok && /approved/.test(pr.why) && !pend.data.bundleId);
      const B1 = ADMIN.bundles.find(b => b.inv === i1.id), oth = mk('P9-OTHER', '2027-04-14T09:00:00Z', { course: 'Another programme' }); mk('P9-B', '2027-04-14T09:00:00Z'); AGY();
      ok('P9C-B18 the arrangement authorises only its own programme: another programme\'s batch is refused; a bundle whose courses don\'t match the arrangement is refused', /doesn't cover/.test(p8BatchWhy(B1, oth, opt('Self-Paced').id, 1)) && (() => { B1.courses.push('Another programme'); const y = p8Auth(B1); B1.courses.pop(); return !y.ok && /doesn't cover/.test(y.why); })());
      const pc = buyCard(p, 4), Bc = ADMIN.bundles.find(b => b.id === pc.bundle); AGY(); const rc = p8Reserve(Bc.id, 'P9-B', opt('Self-Paced').id, 1, 'card', 'kBc');
      ok('P9C-B19 a paid card purchase still works (P8 unchanged): reserved with the card evidence', rc.ok && /Card payment/.test(P8().recs.find(r => r.id === rc.ids[0]).auth.evidence));
      const qn = buyCard(p, 4, 'pending'); ok('P9C-B20 an unpaid pending card purchase creates no bundle (nothing to reserve)', qn.status === 'Pending' && !qn.bundle);
      AGY(); const rd = p8Reserve(B1.id, 'P9-B', opt('Self-Paced').id, 1, 'deferred', 'kB21');
      ok('P9C-B21 a reservation backed by the approved deferred arrangement', rd.ok && /Approved payment arrangement/.test(P8().recs.find(r => r.id === rd.ids[0]).auth.evidence));
      STORE.agy.offset = agDays(B1.validity) + 1; render(); const ye = p8BatchWhy(B1, chBatch('P9-B'), opt('Self-Paced').id, 1); STORE.agy.offset = 0; render();
      ok('P9C-B22 expired backing is refused (the arrangement doesn\'t revive an expired bundle)', /expired/.test(ye), ye);
      SS.setItem(K + 'B1', B1.id);
    });

    await T('P9C-C payments and exceptions', async () => {
      Clock.unfreeze(); const p = STORE.biz.products.find(x => x.name === 'P9 NVQ — 4 entitlements (demo)'); const i = finApprove(invReq(p, 4)), m = obMinor(i), half = Math.floor(m / 2);
      AGY(); const r = p9Request(i.id, { type: 'instalments', rows: [{ due: ymdAdd(today(), 20), minor: half }, { due: ymdAdd(today(), 50), minor: m - half }], why: 'Two payments' }); FA('FB'); p9Decide(r.id, 'approve', 'ok', r.rec.rev); const a = r.rec, tx0 = STORE.fin.tx.length;
      AGY(); const ag = p9Pay(a.id, { minor: 100, ref: 'AGY-SELF', received: today(), why: 'x' }); BIZ(); const bz = p9Pay(a.id, { minor: 100, ref: 'BIZ-1', received: today(), why: 'x' });
      ok('P9C-C1 only Finance records a verified payment (agency and Business Admin refused, nothing recorded)', ag.denied && bz.denied && STORE.fin.tx.length === tx0 && a.pays.length === 0);
      FA(); const p1 = p9Pay(a.id, { minor: 1000, ref: 'BACS-C-1', received: today(), why: 'Part of instalment 1' });
      ok('P9C-C2 part of an instalment: allocated to instalment 1 only; the rest still due', p1.ok && a.sched[0].paid === 1000 && a.sched[1].paid === 0 && p1.outstanding === m - 1000 && a.state === 'Active');
      const rep = p9Pay(a.id, { minor: 1000, ref: 'BACS-C-1', received: today(), why: 'replayed' });
      ok('P9C-C3 a duplicate (replayed) reference settles nothing twice: refused, a Finance review opened', !rep.ok && rep.dup && a.sched[0].paid === 1000 && STORE.fin.tx.filter(t => t.ref === 'BACS-C-1').length === 1 && P9().exc.some(x => x.id === rep.exc && x.kind === 'Duplicate reference'));
      const wo = p9Pay(a.id, { minor: 500, ref: 'BACS-C-WO', received: today(), why: 'quotes another invoice', inv: 'AQ-OTHER' }), wa = p9Pay(a.id, { minor: 500, ref: 'BACS-C-WA', received: today(), why: 'paid by someone else', payer: 'Another Agency Ltd' });
      ok('P9C-C4 a receipt quoting another obligation, or paid by another agency, isn\'t allocated: each opens a Finance review; nothing moved', !wo.ok && !wa.ok && P9().exc.find(x => x.id === wo.exc).kind === 'Wrong obligation' && P9().exc.find(x => x.id === wa.exc).kind === 'Wrong agency' && a.sched[0].paid === 1000 && !STORE.fin.tx.some(t => ['BACS-C-WO', 'BACS-C-WA'].includes(t.ref)));
      const q0 = ADMIN.queue.filter(x => x.type === 'Refund').length, ov = p9Pay(a.id, { minor: m - 1000 + 2500, ref: 'BACS-C-2', received: today(), why: 'Paid everything and more' });
      ok('P9C-C5 an overpayment settles the outstanding balance only; the £25.00 surplus is held for Finance review — no refund, no credit', ov.ok && ov.over === 2500 && a.state === 'Satisfied' && i.stage === 'paid' && P9().exc.find(x => x.id === ov.exc).kind === 'Overpayment' && ADMIN.queue.filter(x => x.type === 'Refund').length === q0 && a.sched.every(s => s.paid === s.minor), J(ov));
      ok('P9C-C6 fully paid: the invoice is paid once; no new bundle or entitlements', ADMIN.bundles.filter(b => b.inv === i.id).length === 1 && p7Bal(ADMIN.bundles.find(b => b.inv === i.id)).purchased === 4);
      const after = p9Pay(a.id, { minor: 100, ref: 'BACS-C-3', received: today(), why: 'after settlement' });
      ok('P9C-C7 a receipt after the arrangement is satisfied finds no obligation: Finance review, nothing allocated', !after.ok && P9().exc.find(x => x.id === after.exc).kind === 'No matching obligation');
      const rz = p9ExcResolve(ov.exc, 'Surplus to be returned through the refund process'), rz2 = p9ExcResolve(ov.exc, 'again');
      ok('P9C-C8 Finance resolves a review (recorded only); resolving it again changes nothing', rz.ok && rz2.dup && P9().exc.find(x => x.id === ov.exc).state === 'Resolved' && ADMIN.queue.filter(x => x.type === 'Refund').length === q0);
      const i2 = finApprove(invReq(p, 4)); AGY(); const r2 = p9Request(i2.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 30), minor: obMinor(i2) }], why: 'x' }); FA('FB'); p9Decide(r2.id, 'approve', 'ok', r2.rec.rev); FA();
      const bp = ACT.invPay({ dataset: { id: i2.id } });
      ok('P9C-C9 the one-off "record payment" on an invoice under an arrangement is refused (logged) — receipts go through the arrangement', bp === false && !MODAL && i2.stage === 'awaiting' && aud('Blocked: record invoice payment (arrangement in force)') === 1);
      const B2 = ADMIN.bundles.find(b => b.inv === i2.id); FA(); p9Pay(r2.id, { minor: 500, ref: 'BACS-RF', received: today(), why: 'part' }); const rf = { id: 'AQ-P9RF', type: 'Refund', status: 'Pending', data: { tx: 'BACS-RF' } }; ADMIN.queue.push(rf); const y = p8Auth(B2); ADMIN.queue = ADMIN.queue.filter(x => x !== rf);
      ok('P9C-C10 an open refund of a payment under the arrangement is a blocking exception: no new authorisation', !y.ok && /refund/.test(y.why), J(y));
    });

    await T('P9C-D overdue and Finance review', async () => {
      Clock.unfreeze(); const p = STORE.biz.products.find(x => x.name === 'P9 NVQ — 4 entitlements (demo)'); const i = finApprove(invReq(p, 4)), m = obMinor(i);
      AGY(); const r = p9Request(i.id, { type: 'deferred', rows: [{ due: ymdAdd(today(), 10), minor: m }], why: 'Ten days' }); FA('FB'); p9Decide(r.id, 'approve', 'ok', r.rec.rev); const a = r.rec;
      const dep0 = J(STORE.fin.deposits), sched0 = J(a.sched);
      STORE.agy.offset = 400; render(); const ag = a.state; STORE.agy.offset = 0; render();
      ok('P9C-D1 the agency clock doesn\'t decide Finance due dates (agency offset +400 days: not overdue)', ag === 'Active' && !Object.keys(a.overdue).length);
      Clock.freeze(ymdAdd(a.sched[0].due, 0) + 'T22:59:00Z'); render(); const before = a.state;
      Clock.freeze(ymdAdd(a.sched[0].due, 1) + 'T00:00:00Z'); render(); render(); render();
      ok('P9C-D2 overdue on Finance\'s clock: still due during the due date; overdue from the next London day; recorded and notified once', before === 'Active' && a.state === 'Overdue' && (STORE.agy.notifs || []).filter(x => x.t === 'Payment overdue' && x.b.includes(i.id)).length === 1 && STORE.fin.notifs.filter(x => x.t === 'Agency payment overdue' && x.b.includes(a.id)).length === 1);
      ok('P9C-D3 overdue changes nothing else: the schedule, deposits and entitlements are kept; no refund, no cancellation; the arrangement still authorises', J(a.sched) === sched0 && J(STORE.fin.deposits) === dep0 && p7Bal(ADMIN.bundles.find(b => b.inv === i.id)).purchased === 4 && p8Auth(ADMIN.bundles.find(b => b.inv === i.id)).ok && !ADMIN.queue.some(x => x.type === 'Refund' && J(x.data || {}).includes(i.id)));
      const v = P9().rev.find(x => x.inv === i.id); ACA(); const den = p9ReviewDecide(v.id, 'record', 'x');
      FA(); const rec = p9ReviewDecide(v.id, 'record', 'Agency contacted; payment promised'), cl = p9ReviewDecide(v.id, 'close', 'Agency confirmed a payment date'), cl2 = p9ReviewDecide(v.id, 'close', 'again');
      ok('P9C-D4 the review: only Finance decides (Academic Admin refused); decisions recorded with actor, reason, time and "no change to access"; closed once', den.denied && rec.ok && cl.ok && cl2.dup && v.state === 'Closed' && v.dec.length === 2 && v.dec.every(d => d.by && d.at && d.why && /No change to learner access/.test(d.outcome)) && v.hist.length === 3);
      Clock.unfreeze();
      const notes = (STORE.agy.notifs || []).filter(x => x.t === 'Payment overdue'), learners = Object.values(STORE.worlds).filter(w => w && w.me).map(w => chFullName(w));
      ok('P9C-D5 the agency\'s overdue notice carries only its own obligation (no learner or other agency data)', notes.every(n => n.agency === 'CarePlus Recruitment (demo)' && !learners.some(nm => n.b.includes(nm))));
    });

    await T('P9C-E the sponsored access decision', async () => {
      Clock.unfreeze(); const p = STORE.biz.products.find(x => x.name === 'P9 NVQ — 4 entitlements (demo)'); const pc = buyCard(p, 4), Bc = ADMIN.bundles.find(b => b.id === pc.bundle);
      const be = mk('P9-E', '2027-05-12T09:00:00Z'); const L2 = invite(), k2 = activate(L2); AGY(); const rg = p8Register(Bc.id, L2.id, 'P9-E', opt('Fully Assisted').id, 'Direct'); approve(rg.assign); const w2 = STORE.worlds[k2];
      ok('P9C-E1 a direct registration on a paid bundle: confirmed, in the account', !!w2.nvq && !!w2.nvq.p9 && p7ConsOf(rg.assign) && w2.nvq.p9.mode === 'Fully Assisted');
      asW(k2); ok('P9C-E2 before commencement: blocked (P9-NOT-STARTED)', p5Decide(w2).code === 'P9-NOT-STARTED' && learnLocked());
      W.resources = W.resources || []; W.resources.push({ course: W.nvq.title, title: 'P9 test resources', items: [{ id: 'p9-r1', title: 'P9 test resource', kind: 'doc' }] });
      const ev = { id: 'p9-ev1', course: W.nvq.title, title: 'P9 class', link: 'https://zoom.example/j/9', start: '2027-05-13T09:00:00Z', end: '2027-05-13T10:00:00Z', kind: 'class' }; W.events = W.events || []; W.events.push(ev);
      const n0 = audRe(/^Blocked: .*learning access not open/);
      const r1 = ACT.openRes({ dataset: { id: 'p9-r1' } }), r2 = ACT.pdfDl({ dataset: {} }), r3 = ACT.joinZoom({ dataset: { id: 'p9-ev1' } });
      ok('P9C-E3 direct learning actions are refused (resource, assignment download, Zoom) and logged', r1 === false && r2 === false && r3 === false && audRe(/^Blocked: .*learning access not open/) >= n0 + 3);
      ok('P9C-E4 deep links: the Zoom link isn\'t shown; the programme pages show the pre-start page', /disabled/.test(joinBtn(ev)) && (() => { go('assignments'); return /hasn't started/.test(main()); })());
      commence(be, new Date(now().getTime() - 3600e3).toISOString()); asW(k2); const ok1 = p5Decide(w2);
      ok('P9C-E5 a verified payment satisfies the Finance condition: after commencement learning opens (P9-OK, card evidence)', ok1.allowed && /Card payment/.test(ok1.pay.text) && learnOpen(), J(ok1));
      const pur = STORE.agy.purchases.find(x => x.bundle === Bc.id); pur.status = 'Pending'; const pe = p5Decide(w2).code; pur.status = 'Paid';
      ok('P9C-E6 a payment back to "pending verification" with no arrangement blocks (P9-PENDING)', pe === 'P9-PENDING', pe);
      const sp = w2.nvq.sponsor; w2.nvq.sponsor = 'Someone Else Ltd'; const ag1 = p5Decide(w2).code; w2.nvq.sponsor = sp; const ma = w2.nvq.p9.agency; w2.nvq.p9.agency = null; const ag2 = p5Decide(w2).code; w2.nvq.p9.agency = ma;
      ok('P9C-E7 a wrong or missing agency identity blocks (P9-AGENCY)', ag1 === 'P9-AGENCY' && ag2 === 'P9-AGENCY' && p5Decide(w2).allowed);
      const t = be.p5Test; delete be.p5Test; const st = be.start; be.start = new Date(now().getTime() - 864e5).toISOString(); const cu = p5Decide(w2).code; be.start = st; be.p5Test = t;
      ok('P9C-E8 commencement indeterminate (U-05, no test instant) fails closed', cu === 'P9-COMMENCE-UNKNOWN', cu);
      const L3 = invite(), k3 = activate(L3); AGY(); const rg3 = p8Register(Bc.id, L3.id, 'P9-E', opt('Self-Paced').id, 'Pending'); const w3 = STORE.worlds[k3];
      ok('P9C-E9 a pending named assignment and an unnamed reservation grant nothing: no programme in the account, no access decision opens', !w3.nvq && !p5Applies(w3) && P8().recs.filter(r => r.state === 'active').every(r => !r.lid));
      const sr = SEATS().recs.find(s => s.lid === L2.id && s.batch === 'P9-E' && seatIsActive(s)); seatReleaseRec(sr, 'P9C test: the place is gone'); const ns = p5Decide(w2).code;
      ok('P9C-E10 without an active place in the seat ledger: blocked (P9-NO-SEAT)', ns === 'P9-NO-SEAT', ns);
      ok('P9C-E11 every evaluation is audited (open and not open)', aud('Sponsored learning access evaluated (open)') >= 1 && aud('Sponsored learning access evaluated (not open)') >= 1);
      void rg3;
    });

    await T('P9C-F invariants and isolation', async () => {
      Clock.unfreeze(); render();
      ok('P9C-F1 P1: no batch over capacity; invariants hold', seatInvariants().length === 0 && ADMIN.batches.every(b => seatCount(b.code) <= (+b.cap || 0) || !SEATS().recs.some(r => r.batch === b.code)), J(seatInvariants()));
      ok('P9C-F2 P7: no entitlement spent twice; nothing consumed beyond what was purchased (arrangement-backed bundles included)', inv7());
      ok('P9C-F3 P8: each live reservation holds exactly one unnamed place; confirmed ones hold the learner\'s', inv8());
      ok('P9C-F4 an approved arrangement never mints more than its invoice: purchased = the invoice seats, for every arrangement-backed bundle', ADMIN.bundles.filter(b => b.p9).every(b => p7Bal(b).purchased === (p9Inv(b.inv).data.seats)));
      ok('P9C-F5 no unpaid obligation shows as paid: every invoice with an unsatisfied arrangement is still "awaiting"', P9().arr.filter(a => P9_LIVE.includes(a.state)).every(a => p9Inv(a.inv).stage === 'awaiting'));
      const amira = Object.values(STORE.worlds).find(w => w && w.me && /^Amira/.test(w.me.first || '') && w.signup);
      ok('P9C-F6 individual learners unchanged (P5-LEGACY); REVISED-1 can\'t be activated', p5Decide(amira).code === 'P5-LEGACY' && p2Activate('REVISED-1', 'P9') === false && p2Active() === 'LEGACY-1');
      SA(); go('f-agyarr'); const fh = main(); AGY(); go('g-purchase', { id: SS.getItem(K + 'e2e') ? JSON.parse(SS.getItem(K + 'e2e')).inv : '' });
      ok('P9C-F7 Finance sees the arrangements, reviews and exceptions; the agency sees its own arrangement on the purchase', /Agency arrangements/.test(fh) && /FR-0001/.test(fh) && /AX-0001/.test(fh) && !!$1('main .p9-arr'));
    });
    Clock.unfreeze(); next(1); return;
  }

  if (PH === 1) {
    await T('P9C-G reload, an older copy, Reset', async () => {
      const e = JSON.parse(SS.getItem(K + 'e2e') || '{}'), a = p9Arr(e.arr), wk = STORE.worlds[e.k];
      ok('P9C-G1 after a real reload: the arrangement, its payments, the bundle and the learner\'s sponsored enrolment are kept', !!a && a.state === e.state && a.pays.length === 2 && !!ADMIN.bundles.find(b => b.id === e.bundle) && !!wk && !!wk.nvq && !!wk.nvq.p9 && seatInvariants().length === 0);
      const keep = STORE.agy.p9; delete STORE.agy.p9; render();
      ok('P9C-G2 a copy saved before P9 opens with no arrangements and no errors', P9().arr.length === 0 && P9().rev.length === 0); STORE.agy.p9 = keep;
      reset(); ok('P9C-G3 Reset: no arrangements, no reviews, no exceptions', P9().arr.length === 0 && P9().rev.length === 0 && P9().exc.length === 0 && !ADMIN.bundles.some(b => b.p9));
    });
  }

  Clock.unfreeze(); if (STORE.agy) STORE.agy.offset = 0; window.ILM_P4_HARNESS = false;
  ['phase', 'R', 'e2e', 'B1'].forEach(x => SS.removeItem(K + x));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
