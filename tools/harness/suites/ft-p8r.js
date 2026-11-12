// P8 review closure (before P9), client demo (FIXTURE=client). B: a named but unconfirmed reservation at bundle expiry — it never
// consumed, it doesn't survive as a guaranteed place, it can't be confirmed afterwards (also when the approval arrives in the same
// pass as the expiry), a confirmed learner is unaffected, reconciliation is idempotent and the history is kept. C: a batch moved
// earlier — the old release instant stays in the history, the new one and the reason are recorded and audited, the resulting release
// is audited as such, no confirmed or named learner is released, and no remedy, refund or credit is created.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = (r = 'P8R test') => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const BIZ = () => { closeModal(); bizEnter('BA'); S.ui = {}; };
  const AGY = (id = 'AG-02') => { closeModal(); agyEnter(id, true); S.ui = {}; };
  const reset = () => { closeModal(); Clock.unfreeze(); CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal(); STORE.agy.offset = 0; };
  const create = (name, course, seats) => { BIZ(); go('a-bundles', { tab: 'catalogue' }); click($1('main [data-act="newBundle"]')); $1('#bp-n').value = name; $a('#modal-root .bp-c').forEach(x => { x.checked = x.value === course; }); $1('#bp-s').value = String(seats); INP.bpCalc(); const n0 = STORE.biz.products.length; MODAL.actions.find(x => x.label === 'Save and continue').fn(); if (MODAL) closeModal(); return STORE.biz.products[n0]; };
  const publish = p => { BIZ(); go('a-bundles', { id: p.id, tab: 'catalogue' }); click($1('main .ag1-pub [data-act="bPublish"]')); reason('P8R publish'); };
  const buyCard = (p, qty) => { AGY(); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); $1('#gq').value = String(qty); INP.agBuyQty($1('#gq')); $1('#modal-root input[name="gpm"][value="card"]').checked = true; prim(); $1('#gc-o').value = 'success'; prim(); const x = STORE.agy.purchases[0]; closeModal(); S.agy.buy = null; return x; };
  const D0 = () => ADMIN.batches.find(b => b.code === 'DEMO-L3-JAN27');
  const mk = (code, start, o = {}) => { const s = D0(), c = JSON.parse(J(s)); Object.assign(c, { code, label: code, start, end: new Date(Date.parse(start) + 380 * 864e5).toISOString(), enrolled: 0, roster: [], coh: [], status: 'Open', wait: 0, w1wait: [], mcA: {}, mcH: [], cap: 10, tz: 'Europe/London' }, o); delete c.tzHist; delete c.p5Test; ADMIN.batches.push(c); return c; };
  const NVQ = () => (nvqBundleCourses()[0] || {}).title;
  let nInv = 0; const invite = () => { AGY(); nInv++; return agyCreateLearner(`P8R Learner ${nInv} (demo)`, `p8r.learner${nInv}@careplus-staff.example`, '+44 7700 95' + String(1000 + nInv), 'Created', ''); };
  const appOf = aid => ADMIN.apps.find(x => x.agySeat === aid);
  const approve = aid => { const ap = appOf(aid); if (ap) ap.status = 'Approved'; render(); return ap; }; // the admission decision itself is AC-2's; here its effect
  const seat = r => SEATS().recs.find(s => s.id === r.seat);
  const aud = a => ADMIN.audit.filter(x => x.action === a).length;

  await T('P8R-B named reservation at bundle expiry', async () => {
    reset(); D0().tz = 'Europe/London'; const SP = r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === 'Self-Paced');
    const p = create('P8R NVQ — 6 entitlements (demo)', NVQ(), 6); publish(p); const pu = buyCard(p, 6), B = ADMIN.bundles.find(b => b.id === pu.bundle); render();
    mk('P8R-A', '2027-03-17T09:00:00Z');
    AGY(); const res = p8Reserve(B.id, 'P8R-A', SP.id, 3, 'Spring intake', 'kR1'); const [r1, r2, r3] = res.ids.map(p8Of);
    const Lc = invite(), n1 = p8Name(r1.id, Lc.id, 'confirmed one'); approve(n1.assign);
    const Ln = invite(), n2 = p8Name(r2.id, Ln.id, 'named, not confirmed'); const x0 = p7Bal(B);
    ok('P8R-B1 a named reservation consumes nothing: 1 consumed (the confirmed learner), 2 reserved (named + unnamed), 3 available', r1.state === 'confirmed' && r2.state === 'named' && r3.state === 'active' && x0.consumed === 1 && x0.reserved === 2 && x0.free === 3 && !p7ConsOf(n2.assign), J(x0));
    const s1 = seat(r1), s2 = seat(r2), c1 = p7ConsOf(n1.assign);
    // The approval of the named learner arrives in the same pass as the expiry: the bundle expires first (agency clock), then render
    const ap2 = appOf(n2.assign); ap2.status = 'Approved'; STORE.agy.offset = agDays(B.validity) + 1; render(); const x1 = p7Bal(B);
    ok('P8R-B2 approval arriving with the expiry: no confirmation from expired backing — nothing consumed for the named learner', r2.state === 'expired' && !p7ConsOf(n2.assign) && x1.consumed === 1, J([r2.state, x1]));
    ok('P8R-B3 the named place doesn\'t survive as a guaranteed place: its P1 place is released; no reserved place of the bundle is left', !seatIsActive(s2) && !SEATS().recs.some(s => s.kind === 'agencyReserved' && s.ent === B.id && seatIsActive(s)) && x1.reserved === 0 && x1.expiredUnused === 5, J(x1));
    const a2 = STORE.agy.assign.find(a => a.id === n2.assign);
    ok('P8R-B4 the named assignment is marked not enrolled (reason kept); approval is refused now', /Not enrolled — reservation expired/.test(a2.status) && !!a2.p8Why && !!ac2AppWhy({ ...ap2, status: 'Under Review' }, 'approve'));
    render(); render();
    ok('P8R-B5 later passes don\'t confirm it either (still no consumption, no place)', !p7ConsOf(n2.assign) && !seatIsActive(s2) && r2.state === 'expired');
    ok('P8R-B6 the confirmed learner is unaffected: same place, same single consumption', r1.state === 'confirmed' && seatIsActive(s1) && s1.lid === Lc.id && p7ConsOf(n1.assign) === c1 && P7().recs.filter(e => e.type === 'consume' && e.ref === n1.assign).length === 1);
    const h2 = r2.hist.length, h3 = r3.hist.length, nEnd = aud('Reservation ended (bundle expired)'); render(); render(); render();
    ok('P8R-B7 reconciliation is idempotent: no new history or audit entries', r2.hist.length === h2 && r3.hist.length === h3 && aud('Reservation ended (bundle expired)') === nEnd && nEnd === 2, J([nEnd]));
    ok('P8R-B8 the history is preserved: reserved → named → expired (with the reason)', ['Reserved', 'Learner named (admission pending)', 'Expired with the bundle'].every(w => r2.hist.some(h => h.what === w)) && r2.hist.find(h => h.what === 'Expired with the bundle').why.includes('lapsed'));
    STORE.agy.offset = 0; render(); const x2 = p7Bal(B);
    ok('P8R-B9 moving the agency clock back revives nothing: still expired, place still free, assignment unchanged, nothing reserved', r2.state === 'expired' && r3.state === 'expired' && !seatIsActive(s2) && /Not enrolled/.test(a2.status) && x2.reserved === 0 && x2.consumed === 1, J(x2));
    ok('P8R-B10 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
  });

  await T('P8R-C batch moved earlier', async () => {
    STORE.agy.offset = 0; Clock.unfreeze(); D0().tz = 'Europe/London'; const SP = r1Opts(cdPr().id).find(o => o.status === 'Active' && o.mode === 'Self-Paced');
    const p = create('P8R NVQ — 4 entitlements (demo)', NVQ(), 4); publish(p); const pu = buyCard(p, 4), B = ADMIN.bundles.find(b => b.id === pu.bundle); render();
    const bt = mk('P8R-R', '2027-05-12T09:00:00Z');
    AGY(); const res = p8Reserve(B.id, 'P8R-R', SP.id, 3, 'May intake', 'kR2'); const [ra, rn, rc] = res.ids.map(p8Of);
    const Ln = invite(), nn = p8Name(rn.id, Ln.id, 'named'); const Lc = invite(), nc = p8Name(rc.id, Lc.id, 'to confirm'); approve(nc.assign);
    const cut0 = ra.cutoff, start0 = bt.start, q0 = (ADMIN.queue || []).length, tx0 = J([STORE.fin.tx.length, (STORE.fin.adjust || []).length, (STORE.fin.pending || []).length]), ret0 = P7().recs.filter(e => e.type === 'return').length, val0 = B.validity, x0 = p7Bal(B);
    const nChg = aud('Reservation release date changed');
    bt.start = new Date(now().getTime() + 10 * 864e5).toISOString(); render();
    const h = ra.hist.find(z => z.what === 'Batch schedule changed');
    ok('P8R-C1 the old release instant stays in the history, with the new one, the old and new start and the reason; cutoff0 unchanged', !!h && h.prevCutoff === cut0 && h.newCutoff === ra.cutoff && h.prevStart === start0 && h.newStart === bt.start && /start changed/.test(h.why) && ra.cutoff0 === cut0 && ra.cutoff !== cut0, J(h));
    ok('P8R-C2 each live reservation\'s change is audited (unnamed and named), once', aud('Reservation release date changed') === nChg + 2);
    ok('P8R-C3 the resulting release is explicit: "released (batch rescheduled earlier)", with the previous date in the reason; the place freed', ra.state === 'released' && ra.resch === true && aud('Reservation released (batch rescheduled earlier)') === 1 && ra.hist.some(z => z.what === 'Released after rescheduling' && /moved earlier/.test(z.why) && /previously/.test(z.why)) && !seatIsActive(seat(ra)));
    ok('P8R-C4 no confirmed learner is released, and the named learner keeps the place (not released by the change)', rc.state === 'confirmed' && seatIsActive(seat(rc)) && seat(rc).lid === Lc.id && rn.state === 'named' && seatIsActive(seat(rn)) && rn.hist.some(z => z.what === 'Batch schedule changed'));
    const x1 = p7Bal(B);
    ok('P8R-C5 no remedy, refund or credit is invented: no queue item, no Finance record, no entitlement returned or added, expiry unchanged; the released entitlement is simply available again', (ADMIN.queue || []).length === q0 && J([STORE.fin.tx.length, (STORE.fin.adjust || []).length, (STORE.fin.pending || []).length]) === tx0 && P7().recs.filter(e => e.type === 'return').length === ret0 && B.validity === val0 && x1.purchased === 4 && x1.consumed === x0.consumed && x1.free === x0.free + 1, J([x0, x1]));
    ok('P8R-C6 the agency is told (in-app) about the date change and the release', (STORE.agy.notifs || []).some(n => /Reservation release date changed/.test(n.t || n.title || '')) && (STORE.agy.notifs || []).some(n => /Unnamed place released/.test(n.t || n.title || '')));
    const hl = [ra, rn, rc].map(r => r.hist.length), a0 = aud('Reservation release date changed'); render(); render();
    ok('P8R-C7 later passes add nothing (idempotent)', J([ra, rn, rc].map(r => r.hist.length)) === J(hl) && aud('Reservation release date changed') === a0);
    ok('P8R-C8 P1 invariants', seatInvariants().length === 0, J(seatInvariants()));
    void nn;
  });

  reset();
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
