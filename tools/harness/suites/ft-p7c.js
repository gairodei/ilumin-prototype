// P7 — agency entitlements, expiry and extensions, client demo (FIXTURE=client). Phase 0: the Business Admin publishes a short-course
// bundle and an NVQ bundle; CarePlus buys them by card (a pending card purchase gives nothing); a learner invited by the agency is
// provisional until she activates (then one entitlement is used, once); an NVQ seat stays provisional until its application is approved;
// expiry ends unused entitlements only (the confirmed learner keeps her course for the course's own period); reminders at 30 / 14 / 7 days
// and at expiry, once each; extensions requested and approved before expiry by the Business Admin (no self-approval, Super Administrator
// override, refusals); P1 seats, P6 transfers and Finance untouched; a repeated purchase / confirm / expire / extend cycle. Phase 1: a real
// reload keeps the ledger; a copy without it rebuilds the same balances; Reset.
(async function () {
  const SS = window.sessionStorage, K = 'ft-p7c.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const main = () => ($1('main') || $1('#app') || document.body).textContent.replace(/\s+/g, ' ');
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P7 test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { closeModal(); setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AGY = (id = 'AG-02') => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); STORE.agy.offset = 0; };
  const off = d => { STORE.agy.offset = d; render(); }; // the agency demo clock (Clock.scenario('agency'))
  const MH = 'Moving and Handling People', CP = 'CarePlus Recruitment (demo)';
  const create = (name, course, seats) => { BIZ(); go('a-bundles', { tab: 'catalogue' }); click($1('main [data-act="newBundle"]')); $1('#bp-n').value = name; $a('#modal-root .bp-c').forEach(x => { x.checked = x.value === course; }); $1('#bp-s').value = String(seats); INP.bpCalc(); const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal(); return STORE.biz.products[n0]; };
  const publish = p => { BIZ(); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1('main .ag1-pub [data-act="bPublish"]')); reason('P7 publish'); };
  const buyCard = (p, qty, outcome = 'success') => { AGY(); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); $1('#gq').value = String(qty); INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = outcome; prim(); const x = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null; return x; };
  const bundleOf = pur => ADMIN.bundles.find(b => b.id === pur.bundle);
  const recs = b => P7().recs.filter(r => r.bundle === b.id);
  const invite = n => { AGY(); return agyCreateLearner(n + ' (demo)', n.toLowerCase().replace(/ /g, '.') + '@careplus-staff.example', '+44 7700 95' + String(5300 + n.length), 'Created', ''); };
  const activate = L => { ACA(); go('a-learner', { id: L.id }); click($1('main [data-act="lnActLink"]')); $a('#app input[type="password"]').forEach(i => { i.value = 'Demo!Pass2026x'; }); $1('#app form[data-submit="firstSet"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const days = b => agDays(b.validity);

  if (PH === 0) {
    let BS, BN;
    await T('P7C-A purchases create entitlements; a pending card payment creates none', async () => {
      reset(); const p = create('P7 Moving and Handling — 4 seats (demo)', MH, 4); publish(p); const s0 = J(SEATS().recs), r0 = P7().recs.length;
      const q = buyCard(p, 4, 'pending'); ok('P7C-A1 a card payment left pending: no bundle, no entitlement', q.status === 'Pending' && !q.bundle && P7().recs.length === r0);
      const pur = buyCard(p, 4); BS = bundleOf(pur); render(); const x = p7Bal(BS);
      ok('P7C-A2 a paid purchase: one purchase entry of 4, with the purchase reference; 4 available, nothing used', !!BS && x.purchased === 4 && x.consumed === 0 && x.available === 4 && recs(BS).filter(r => r.type === 'purchase').length === 1 && !!recs(BS)[0].src && BS.used === 0, J([x, recs(BS)]));
      ok('P7C-A3 buying entitlements creates no batch place (P1 seat ledger unchanged)', J(SEATS().recs) === s0);
      ok('P7C-A4 the validity is the product\'s configured number of days, not a fixed rule', days(BS) > 0 && days(BS) <= ((p.days || 360) + 1), J([days(BS), p.days]));
      BS.used = 99; ok('P7C-A5 bundle.used is a read-only projection (an older writer can\'t change availability)', BS.used === 0 && p7Bal(BS).available === 4);
    });

    await T('P7C-B confirmed consumption: once, at the confirmed enrolment', async () => {
      const L = invite('Pia Pending'); const n = agyDoAssign(BS, MH, [L.id]), a = STORE.agy.assign.find(x => x.lid === L.id), x0 = p7Bal(BS);
      ok('P7C-B1 a seat for a learner who hasn\'t activated is provisional: nothing consumed, 1 waiting, seats left 3', n === 1 && a.awaitAct && x0.consumed === 0 && x0.pending === 1 && left(BS) === 3, J(x0));
      activate(L); const k = agyWorldKey(L), w = STORE.worlds[k], e = w && w.enrolments.find(z => z.agyAssign === a.id), x1 = p7Bal(BS), c = p7ConsOf(a.id);
      ok('P7C-B2 activation confirms the enrolment: exactly one entitlement consumed, referencing the seat and the enrolment', !!e && x1.consumed === 1 && x1.pending === 0 && !!c && c.ref === a.id && c.enrol === e.id && c.lid === L.id && aud('Entitlement consumed') === 1, J(x1));
      const row = ADMIN.courses.find(z => z.title === MH);
      ok('P7C-B3 her access runs for the course\'s own access period, not to the bundle\'s expiry', Math.abs(Date.parse(e.end) - (Date.parse(e.enrolled) > 0 ? now().getTime() : 0) - ((+row.access || 90) * DAY)) < 2 * DAY && e.end !== BS.validity, J([e.end, BS.validity, row.access]));
      ag1Activated(L); ag1ShortEnrol(k, a, BS); render();
      ok('P7C-B4 confirming again consumes nothing more and creates no second enrolment', p7Bal(BS).consumed === 1 && w.enrolments.filter(z => z.agyAssign === a.id).length === 1 && aud('Entitlement consumed') === 1);
      const L2 = invite('Fay Failed'); agyDoAssign(BS, MH, [L2.id]); const a2 = STORE.agy.assign.find(x => x.lid === L2.id), nl = notifyLearner; notifyLearner = function () { throw new Error('simulated failure'); };
      try { activate(L2); } catch (err) { /* the failure surfaces */ } finally { notifyLearner = nl; }
      ok('P7C-B5 a confirmation that fails part-way consumes nothing', p7Bal(BS).consumed === 1 && !p7ConsOf(a2.id), J(p7Bal(BS)));
      ok('P7C-B6 never negative; consumed + available + waiting = purchased', (z => z.available >= 0 && z.consumed + Math.max(0, z.available - z.pending) + z.pending === z.purchased)(p7Bal(BS)), J(p7Bal(BS)));
    });

    await T('P7C-C NVQ: provisional until the application is approved', async () => {
      const p = create('P7 NVQ — 2 seats (demo)', nvqBundleCourses()[0].title, 2); publish(p); BN = bundleOf(buyCard(p, 2)); render();
      const L = invite('Nina Nvq'), n = agyDoAssign(BN, nvqBundleCourses()[0].title, [L.id]), a = STORE.agy.assign.find(x => x.lid === L.id && x.bundle === BN.id), ap = ADMIN.apps.find(x => x.agySeat === a.id);
      ok('P7C-C1 an NVQ seat (Admission pending) consumes nothing yet; it is waiting', n === 1 && a.status === 'Admission pending' && p7Bal(BN).consumed === 0 && p7Bal(BN).pending === 1);
      ok('P7C-C2 a bundle for another course can\'t be used for it (refused, logged)', agyDoAssign(BS, nvqBundleCourses()[0].title, [invite('Wrong Course').id]) === 0 && aud('Blocked: assign seats') >= 1);
      ap.status = 'Approved'; render(); // the approval itself (documents, option and batch) is AC-2 / NB-1's; here only its effect
      ok('P7C-C3 the approved application confirms the enrolment: one entitlement consumed, once', p7Bal(BN).consumed === 1 && a.status === 'Approved' && !!p7ConsOf(a.id) && (render(), p7Bal(BN).consumed === 1));
    });

    await T('P7C-D expiry: unused entitlements only; confirmed learners keep access', async () => {
      const k = agyWorldKey(ADMIN.learners.find(l => /Pia Pending/.test(l.name))), w = STORE.worlds[k], e = w.enrolments.find(z => z.sponsor === CP), L = invite('Late Lou'); agyDoAssign(BS, MH, [L.id]);
      const a = STORE.agy.assign.find(x => x.lid === L.id), d = days(BS);
      off(d - 1); ok('P7C-D1 the last day before expiry: still usable', !p7Expired(BS) && p7Bal(BS).available > 0);
      off(d + 1); const x = p7Bal(BS), ex = recs(BS).filter(r => r.type === 'expire');
      ok('P7C-D2 after expiry: nothing available; the unused balance lapsed, recorded once', x.expired && x.available === 0 && x.expiredUnused === x.purchased - x.consumed && ex.length === 1 && ex[0].qty === x.expiredUnused, J([x, ex]));
      render(); render(); ok('P7C-D3 repeated reconciliation adds nothing', recs(BS).filter(r => r.type === 'expire').length === 1);
      const n0 = STORE.agy.assign.length; ok('P7C-D4 a new assignment from the expired bundle is refused; nothing used', agyDoAssign(BS, MH, [invite('Too Late').id]) === 0 && STORE.agy.assign.length === n0);
      activate(L); ok('P7C-D5 a learner assigned before expiry who activates after it isn\'t enrolled (her seat was provisional); nothing consumed', !p7ConsOf(a.id) && a.status === 'Not enrolled — no entitlement' && !STORE.worlds[agyWorldKey(L)].enrolments.some(z => z.agyAssign === a.id));
      AGY(); go('g-bundle', { id: BS.id }); const t = main();
      ok('P7C-D6 the confirmed learner keeps her course and access after the bundle expired', e.status === 'Active' && Date.parse(e.end) > now().getTime() && /Lapsed unused/.test(t));
      ok('P7C-D7 no extension can be requested for an expired bundle', p7ExtRequest(BS.id, '2030-01-01', 'late').ok === false);
      off(0);
    });

    await T('P7C-E reminders at 30, 14 and 7 days and at expiry', async () => {
      const p = create('P7 Reminder — 3 seats (demo)', MH, 3); publish(p); const b = bundleOf(buyCard(p, 3)); render(); const d = days(b), N = t => STORE.agy.notifs.filter(n => n.go === 'g-bundle.' + b.id && n.t === t).length;
      off(d - 31); ok('P7C-E1 31 days before: no reminder', N('Bundle expires in 30 days') === 0);
      off(d - 30); ok('P7C-E2 30 days before: one reminder with purchased, used and unused counts', N('Bundle expires in 30 days') === 1 && STORE.agy.notifs.some(n => n.go === 'g-bundle.' + b.id && /3 purchased · 0 used · 3 unused/.test(n.b)));
      render(); render(); ok('P7C-E3 no duplicate', N('Bundle expires in 30 days') === 1);
      off(d - 14); ok('P7C-E4 14 days before', N('Bundle expires in 14 days') === 1);
      off(d - 7); ok('P7C-E5 7 days before', N('Bundle expires in 7 days') === 1 && !/email|SMS/i.test(STORE.agy.notifs.find(n => n.t === 'Bundle expires in 7 days').b.replace(/no email or SMS is sent/, '')));
      off(d - 5); AGY(); const r = p7ExtRequest(b.id, ymdAdd(b.validity.slice(0, 10), 60), 'Cohort delayed'); BIZ(); const dec = p7ExtDecide(r.id, 'approve', 'Agreed');
      ok('P7C-E6 an approved extension: the expiry moves, no entitlement added, earlier reminders kept', dec.ok && days(b) > 5 && p7Bal(b).purchased === 3 && N('Bundle expires in 7 days') === 1 && Object.keys(P7().sent).filter(k => k.startsWith(b.id + '|')).length >= 3);
      const d2 = days(b); off(d - 5 + (d2 - 30)); ok('P7C-E7 future reminders follow the new expiry (30 days before it)', N('Bundle expires in 30 days') === 2, J([d2, N('Bundle expires in 30 days')]));
      off(d - 5 + d2 + 1); ok('P7C-E8 the expiry notice, once', N('Bundle expired') === 1 && (render(), N('Bundle expired') === 1));
      off(0);
    });

    await T('P7C-F extensions: authority, timing, duplicates', async () => {
      const p = create('P7 Extend — 2 seats (demo)', MH, 2); publish(p); const b = bundleOf(buyCard(p, 2)); render(); const v0 = b.validity, to = ymdAdd(v0.slice(0, 10), 90);
      AGY(); const r = p7ExtRequest(b.id, to, 'More time to enrol'), q = p7ExtOf(r.id);
      ok('P7C-F1 the agency requests before expiry: pending; the expiry doesn\'t move', r.ok && q.state === 'Pending Business Admin approval' && b.validity === v0 && q.from === v0);
      ok('P7C-F2 a second request while one is pending is refused', p7ExtRequest(b.id, to, 'again').ok === false);
      ok('P7C-F3 a proposed expiry not later than the current one is refused', (() => { const b2 = bundleOf(buyCard(p, 1)); render(); return p7ExtRequest(b2.id, v0.slice(0, 10), 'same').ok === false && p7ExtRequest(b2.id, ymdAdd(v0.slice(0, 10), -5), 'earlier').ok === false; })());
      for (const [nm, f] of [['agency', AGY], ['Finance', FA], ['Academic Admin', ACA]]) { f(); ok(`P7C-F4 ${nm} can't decide`, p7ExtDecide(r.id, 'approve', 'x').ok === false && q.state === 'Pending Business Admin approval'); }
      BIZ(); ok('P7C-F5 a decision needs a reason', p7ExtDecide(r.id, 'approve', '').ok === false);
      const d = p7ExtDecide(r.id, 'approve', 'Agreed with the agency');
      ok('P7C-F6 the Business Admin approves before expiry: the expiry moves; purchased and used unchanged; audited', d.ok && b.validity.slice(0, 10) === to && p7Bal(b).purchased === 2 && aud('Bundle extended') >= 1 && b.valHist.length === 1);
      ok('P7C-F7 a duplicate approval changes nothing', p7ExtDecide(r.id, 'approve', 'again').ok === false && b.valHist.length === 1);
      BIZ(); const own = p7ExtRequest(b.id, ymdAdd(b.validity.slice(0, 10), 30), 'On the agency\'s behalf');
      ok('P7C-F8 the Business Admin who made a request can\'t approve it (no self-approval)', own.ok && p7ExtDecide(own.id, 'approve', 'mine').ok === false);
      SA(); const o = p7ExtDecide(own.id, 'override', 'Override: urgent');
      ok('P7C-F9 the Super Administrator overrides with a reason: audited as an override; every rule kept', o.ok && p7ExtOf(own.id).dec.kind === 'override' && aud('Bundle extended (Super Administrator override)') === 1);
      AGY(); const r3 = p7ExtRequest(b.id, ymdAdd(b.validity.slice(0, 10), 30), 'late decision'); off(days(b) + 1); BIZ(); const late = p7ExtDecide(r3.id, 'approve', 'too late');
      ok('P7C-F10 a pending request doesn\'t pause expiry: the bundle expired; approval after expiry is refused (Lapsed); nothing revived', !late.ok && p7ExtOf(r3.id).state === 'Lapsed' && p7Expired(b) && p7Bal(b).available === 0);
      AGY(); ok('P7C-F11 a request after expiry is refused', p7ExtRequest(b.id, '2031-01-01', 'after').ok === false);
      off(0);
      BIZ(); go('a-bundleext'); ok('P7C-F12 the Business Admin\'s screen lists the requests and the balances', /Extension requests/.test(main()) && main().includes(r.id) && /Entitlement balances/.test(main()));
      AGY(); go('g-bundle', { id: b.id }); ok('P7C-F13 the agency\'s bundle page shows the entitlements and the extension history', !!$1('main .p7-ent') && main().includes(r.id));
    });

    await T('P7C-G isolation: Finance, P1 seats, P6 transfers, terms', async () => {
      const s0 = J(SEATS().recs), l0 = J(P7().recs), am = ADMIN.learners.find(l => /Amira/.test(l.name));
      const tx0 = (STORE.fin.tx || []).length;
      ok('P7C-G1 the entitlement ledger wrote no Finance transaction and no seat', (STORE.fin.tx || []).length === tx0 && J(SEATS().recs) === s0);
      const nb = (() => { const s = ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27'), c = JSON.parse(J(s)); Object.assign(c, { code: 'P7-B', label: 'P7-B', enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [], mcA: {}, mcH: [], tz: 'Europe/London' }); s.tz = 'Europe/London'; ADMIN.batches.push(c); return c; })();
      SA(); const q = p6Request(am.id, 'P7-B', 'P7 isolation'); const d = q.ok && p6Decide(q.id, 'override', 'P7 isolation');
      ok('P7C-G2 a P6 transfer consumes and returns no entitlement', !!d && d.ok && J(P7().recs) === l0);
      ok('P7C-G3 REVISED-1 still can\'t be activated; P1 invariants hold', p2Activate('REVISED-1', 'P7') === false && p2Active() === 'LEGACY-1' && seatInvariants().length === 0, J(seatInvariants()));
    });

    await T('P7C-H the same cycle twice gives the same ledger', async () => {
      const cycle = () => { reset(); const p = create('P7 Cycle — 2 seats (demo)', MH, 2); publish(p); const b = bundleOf(buyCard(p, 2)); render(); const L = invite('Cy Cle'); agyDoAssign(b, MH, [L.id]); activate(L); off(days(b) - 3); AGY(); const r = p7ExtRequest(b.id, ymdAdd(b.validity.slice(0, 10), 30), 'cycle'); BIZ(); p7ExtDecide(r.id, 'approve', 'ok'); off(days(b) + 1 + (STORE.agy.offset || 0)); render(); const x = p7Bal(b); const out = J([x, P7().recs.map(z => [z.type, z.qty, z.bundle === b.id]), Object.keys(P7().sent).length]); off(0); return out; };
      const a = cycle(), b = cycle(); ok('P7C-H1 purchase → confirm → extend → expire, run twice from Reset: identical balances, entries and reminders', a === b, a.slice(0, 200));
      SS.setItem(K + 'bal', J(ADMIN.bundles.filter(z => z.agency).map(z => [z.id, p7Bal(z), z.used])));
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('P7C-I reload, a copy without the ledger, Reset', async () => {
      const keep = SS.getItem(K + 'bal'), now0 = J(ADMIN.bundles.filter(z => z.agency).map(z => [z.id, p7Bal(z), z.used]));
      ok('P7C-I1 after a real reload: the same balances and projection', now0 === keep, now0.slice(0, 200));
      const n0 = P7().recs.length; p7BindAll(); buildAdmin(ADMIN.av || "A"); p7BindAll(); render();
      ok('P7C-I2 binding and rebuilding again adds no entries', P7().recs.length === n0);
      delete STORE.agy.p7; ADMIN.bundles.filter(z => z.agency).forEach(z => { const v = z.used; Object.defineProperty(z, 'used', { value: v, writable: true, enumerable: true, configurable: true }); }); render();
      const again = ADMIN.bundles.filter(z => z.agency).map(z => [z.id, p7Bal(z).purchased, p7Bal(z).consumed + p7Bal(z).pending]);
      ok('P7C-I3 a copy saved before P7 (no ledger): opening balances rebuilt from the records; purchased and used the same', J(again) === J(JSON.parse(keep).map(([id, x]) => [id, x.purchased, x.consumed + x.pending])), J(again));
      reset(); ok('P7C-I4 Reset: no ledger entries for agency purchases (the client demo has none)', P7().recs.filter(r => r.type !== 'purchase').length === 0 && P7().ext.reqs.length === 0);
    });
  }

  Clock.unfreeze(); if (STORE.agy) STORE.agy.offset = 0;
  ['phase', 'R', 'bal'].forEach(k => SS.removeItem(K + k));
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
