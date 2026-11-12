// P7 — agency entitlements, legacy fixture. Opening balances from the seeded bundles (purchased = seats; confirmed assignments consumed;
// provisional NVQ seats waiting; earlier usage without a learner record kept as consumed and marked for reconciliation); the projection
// equals the old count; re-running the migration adds nothing; the expired bundle lapses once and refuses use; the seeded 30-day notice
// isn't repeated; cross-agency calls refused; the sponsored-demo sign-up (P9 dependency) uses no entitlement.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify;
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); if (STORE.agy) STORE.agy.offset = 0; render(); };
  const AGY = id => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const agIdOf = name => (ADMIN.agencies.find(a => a.name === name) || {}).id;
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;

  await T('P7-A opening balances from the legacy bundles', async () => {
    fresh(); const bs = ADMIN.bundles.filter(b => b.agency && STORE.agy.assign.some(a => a.bundle === b.id));
    ok('P7-A1 every seeded agency bundle has one purchase entry equal to its seats', bs.length > 0 && bs.every(b => P7().recs.filter(r => r.bundle === b.id && r.type === 'purchase').reduce((s, r) => s + r.qty, 0) === b.seats), J(bs.map(b => b.id)));
    const diff = bs.filter(b => !p7Expired(b) && b.used !== P7().mig[b.id].raw).map(b => [b.id, b.used, P7().mig[b.id].raw]);
    ok('P7-A2 the projected count equals the count the bundle had before P7 (confirmed + waiting + earlier usage)', diff.length === 0, J(diff));
    const appr = STORE.agy.assign.filter(a => a.kind === 'nvq' && a.status === 'Approved'), pend = STORE.agy.assign.filter(a => a.kind === 'nvq' && ['Admission pending', 'Under review'].includes(a.status)), rej = STORE.agy.assign.filter(a => /Rejected/.test(a.status));
    ok('P7-A3 NVQ seats: approved ones consumed; admission pending / under review waiting (not consumed); rejected ones neither', appr.length > 0 && appr.every(a => !!p7ConsOf(a.id)) && pend.length > 0 && pend.every(a => !p7ConsOf(a.id)) && rej.every(a => !p7ConsOf(a.id)));
    const leg = P7().recs.filter(r => r.type === 'legacy');
    ok('P7-A4 earlier usage without a learner record is kept as consumed and marked for reconciliation — never available', leg.length > 0 && leg.every(r => r.reconcile && r.qty > 0) && leg.every(r => { const b = ADMIN.bundles.find(x => x.id === r.bundle); const x = p7Bal(b); return x.available <= x.purchased - x.consumed; }), J(leg.map(r => [r.bundle, r.qty])));
    ok('P7-A5 no balance is negative', ADMIN.bundles.filter(b => b.agency).every(b => { const x = p7Bal(b); return x.available >= 0 && x.expiredUnused >= 0 && x.pending >= 0; }));
    const n0 = P7().recs.length; p7BindAll(); p7BindAll(); buildAdmin(ADMIN.av || "A"); p7BindAll(); render(); render();
    ok('P7-A6 re-running the migration, rebinding and rebuilding adds no entries', P7().recs.length === n0, `${n0} → ${P7().recs.length}`);
  });

  await T('P7-B expiry and reminders on the legacy data', async () => {
    fresh(); const ex = ADMIN.bundles.filter(b => b.agency && p7Expired(b));
    ok('P7-B1 each expired bundle lapses once (one expire entry), with nothing available', ex.length > 0 && ex.every(b => P7().recs.filter(r => r.bundle === b.id && r.type === 'expire').length === 1 && p7Bal(b).available === 0), J(ex.map(b => b.id)));
    const b = ex[0], ag = agIdOf(b.agency), c = b.courses[0], L = ADMIN.learners.find(l => l.agency === b.agency && l.acct === 'Active');
    AGY(ag); ok('P7-B2 an expired bundle refuses a new assignment (logged); nothing used', !!L && agyDoAssign(b, c, [L.id]) === 0 && aud('Blocked: assign seats') >= 1);
    const n30 = STORE.agy.notifs.filter(n => /expir/i.test(n.t) && /30/.test(n.t)).length; render(); render();
    ok('P7-B3 the seeded 30-day notice isn\'t sent again', STORE.agy.notifs.filter(n => /expir/i.test(n.t) && /30/.test(n.t)).length === n30);
  });

  await T('P7-C ownership', async () => {
    fresh(); const cp = ADMIN.bundles.find(b => b.agency && !p7Expired(b) && ADMIN.bundles.some(o => o.agency && o.agency !== b.agency)), other = ADMIN.bundles.find(b => b.agency && b.agency !== cp.agency);
    AGY(agIdOf(other.agency)); const r = p7ExtRequest(cp.id, '2031-01-01', 'not mine');
    ok('P7-C1 another agency can\'t request an extension of this bundle (refused, logged)', r.ok === false && r.denied && aud('Blocked: request bundle extension') >= 1);
    ok('P7-C2 another agency\'s button call is refused too', ACT.p7ExtAsk({ dataset: { b: cp.id } }) === false && !MODAL);
    const fake = { id: 'SA-X', agency: other.agency, lid: 'IA-L-X', learner: 'X', course: cp.courses[0], bundle: cp.id, status: 'Active' }, c0 = p7Bal(cp).consumed;
    ok('P7-C3 consuming another agency\'s bundle is refused; nothing consumed', p7Consume(cp, fake, 'cross-agency').ok === false && p7Bal(cp).consumed === c0);
    const L = ADMIN.learners.find(l => l.agency === other.agency && l.acct === 'Active');
    ok('P7-C4 assigning from another agency\'s bundle is refused (existing guard); nothing used', !!L && agyDoAssign(cp, cp.courses[0], [L.id]) === 0 && p7Bal(cp).consumed === c0);
  });

  await T('P7-D the sponsored-demo sign-up (P9 dependency) and REVISED-1', async () => {
    fresh(); const l0 = J(P7().recs); S.variant = 'D'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; ACT.chSponsoredSignup(); chComplete(W, { opt: null, method: null });
    ok('P7-D1 the existing sponsored sign-up (no agency bundle involved) uses no entitlement — recorded as a P9 dependency', W.signup.done && J(P7().recs) === l0);
    ok('P7-D2 REVISED-1 still can\'t be activated', p2Activate('REVISED-1', 'P7') === false && p2Active() === 'LEGACY-1');
  });

  if (STORE.agy) STORE.agy.offset = 0;
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
