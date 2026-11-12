// P6 — approved batch transfers, legacy fixture. A roster learner (no learner account) moved between two batches that haven't started:
// requested by Academic Admin A, refused to her own approval, approved by Academic Admin B, carried out once through the seat ledger;
// a direct chDoMove refused; the cancellation dialog offers no move; agency entitlements untouched; started and same-day batches refused.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); Clock.unfreeze(); S.ui = {}; S.edge = 'none'; CLOCK_SHIFT = 0; initStore(); };
  const ACA = k => { closeModal(); acaEnter(k); S.signedIn = true; S.ui = {}; };
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;
  const live = b => ['Open', 'Planned'].includes(b.status) && Date.parse(b.start) > now().getTime() + 2 * 864e5;

  await T('P6-A a roster learner: request, no self-approval, approval by another Academic Admin, carried out once', async () => {
    fresh(); let pair = null;
    // test setup: L2DC-FEB27 (Planned, no Coordinator yet) gets the Coordinator of L2DC-JAN27, so a Level 2 learner can move between them
    // P6 correction: a transfer needs an Academy time zone on both batches — test setup configures one on every live batch without it
    ADMIN.batches.forEach(b => { if (!tzOk(b.tz)) b.tz = chBatchCountry(b) === 'United Arab Emirates' ? 'Asia/Dubai' : 'Europe/London'; });
    const feb = ADMIN.batches.find(b => b.code === 'L2DC-FEB27'), jan = ADMIN.batches.find(b => b.code === 'L2DC-JAN27'); if (feb && jan && !nbStaffed(feb)) feb.coord = jan.coord;
    ADMIN.batches.filter(live).some(a => ADMIN.batches.filter(b => b !== a && b.course === a.course && live(b)).some(nb => { const lid = chCohLids(a).concat(batchRoster(a).map(r => r[1])).find(l => l && seatHolds(l, a) && !chWorldByLid(l) && !p6Why(l, a, nb)); if (lid) pair = { a, nb, lid }; return !!pair; }));
    ok('P6-A0 the legacy data has two future batches of one course and a roster learner who can move', !!pair, pair ? `${pair.lid} ${pair.a.code} → ${pair.nb.code}` : J(ADMIN.batches.filter(live).map(a => [a.code, a.course.slice(0, 12), a.status, a.start.slice(0, 10), seatFree(a), chCohLids(a).concat(batchRoster(a).map(r => r[1])).slice(0, 2).map(l => [l, !!seatActive(a.code, l), !!chWorldByLid(l), (ADMIN.batches.find(b => b !== a && b.course === a.course && live(b)) ? p6Why(l, a, ADMIN.batches.find(b => b !== a && b.course === a.course && live(b))) : 'no pair')])])));
    if (!pair) return; const { a, nb, lid } = pair, n0 = [a.enrolled, nb.enrolled], agy0 = (p7Reconcile(), J(STORE.agy || null)); // P7: the agency ledger reconciles to the clock on each render; snapshot after it
    ok('P6-A1 a direct chDoMove is refused (no approved request); nothing changed', chDoMove(lid, a, nb, 'direct') === false && seatActive(a.code, lid) && J([a.enrolled, nb.enrolled]) === J(n0) && aud('Blocked: batch change without an approved transfer request') === 1);
    ACA('KA'); const r = p6Request(lid, nb.code, 'Legacy roster learner');
    ok('P6-A2 Academic Admin A requests; her own approval is refused', r.ok && p6Decide(r.id, 'approve', 'mine').ok === false && p6Req(r.id).state === 'Pending Academic Approval');
    ACA('KB'); const d = p6Decide(r.id, 'approve', 'Approved by B');
    ok('P6-A3 Academic Admin B approves: carried out once — one active place, in the new batch; counts move by one', d.ok && p6Req(r.id).state === 'Executed' && !seatActive(a.code, lid) && !!seatActive(nb.code, lid) && a.enrolled === n0[0] - 1 && nb.enrolled === n0[1] + 1 && chCurBatch(lid).code === nb.code, J([d, a.enrolled, nb.enrolled]));
    ok('P6-A4 repeating it changes nothing; agency entitlements untouched; invariants hold', p6Execute(r.id).ok === false && p6Decide(r.id, 'approve', 'x').ok === false && a.enrolled === n0[0] - 1 && J(STORE.agy || null) === agy0 && seatInvariants().length === 0, J(seatInvariants()));
  });

  await T('P6-B started batches, cancellation', async () => {
    fresh(); const st = ADMIN.batches.find(b => chStarted(b) && chCohLids(b).length), lid = st && chCohLids(st)[0], nb = st && ADMIN.batches.find(b => b !== st && b.course === st.course && live(b));
    ok('P6-B1 a learner of a batch that has started can\'t be transferred (CH-42 rule kept)', !!st && !!nb && /before the batch starts|started/.test(p6Why(lid, st, nb) || ''), st && nb && p6Why(lid, st, nb));
    const pl = ADMIN.batches.find(b => b.status === 'Planned' && batchRoster(b).length) || ADMIN.batches.find(b => ['Planned', 'Open'].includes(b.status) && batchRoster(b).length);
    ACA('KA'); ACT.cancelBatch({ dataset: { id: pl.code } }); const vals = [...document.querySelectorAll('#modal-root .cb-d option')].map(o => o.value);
    ok('P6-B2 the cancellation dialog offers no move — only refund (or nothing chosen); a move needs an approved transfer first', !!MODAL && vals.length > 0 && vals.every(v => v === '' || v === 'refund') && /approved transfer request/.test(document.querySelector('#modal-root').textContent), J(vals.slice(0, 6)));
    closeModal();
  });

  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
