// AA-FINAL Workstream E — bundle pricing transparency (AA-14), D14 and the g5 Lows. suites.sh runs it with FIXTURE=client.
// Breakdown on the bundle detail (Business Admin / Super Admin / System Admin) and in the agency buy modal, built from priceOf / priceFor;
// D14 per-agency price named and "below minimum — not checked"; NVQ "undefined"; "From N seats"; Finance Modes; gross labels;
// role boundaries and direct handler calls; AA-1 invoice reconciliation still credited once; a real refresh, Reset demo, the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-aaf-e.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-aaf-e.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-aaf-e.R', J(R)); SS.setItem('ft-aaf-e.phase', String(ph)); location.reload(); };
  const reason = (r = 'AAF-E test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const qBtn = (id, a) => $1(`main [data-act="qDo"][data-id="${id}"][data-a="${a}"]`);
  const sec = () => ADMIN.security.length, aud = () => ADMIN.audit.length;
  const CP = 'CarePlus Recruitment (demo)', P = () => STORE.biz.products.find(x => x.name.startsWith('Moving and Handling People — 5 seats'));
  const bd = sel => { const e = $1(sel + ' .aafe-bd'); return e ? { qty: +e.dataset.qty, net: +e.dataset.net, total: +e.dataset.total, t: e.textContent.replace(/\s+/g, ' ') } : null; };
  const setQ = (q, as) => { const i = $1('#aafe-q'), a = $1('#aafe-a'); if (as !== undefined) a.value = as; i.value = String(q); INP.aafeCalc(i); };
  const detail = p => go('a-bundles', { id: p.id, tab: 'catalogue' });
  const prodSnap = () => J(STORE.biz.products) + J(discData().versions.length);
  const setRate = (agency, pct) => { go('a-bundles', { tab: 'rates' }); const i = $1(`main .dr-ag[data-a="${agency}"]`); if (!i) throw new Error('no rate input for ' + agency); i.value = pct == null ? '' : String(pct); $1('#dr-r').value = 'AAF-E rate'; submit('form[data-submit="discSave"]'); };

  if (PH === 0) {
    const p = P(); if (!p) { ok('AAF-E setup — the client demo bundle exists', false); }
    await T('AAF-E1 Business Admin breakdown', async () => {
      pick('biz'); detail(p); const b = bd('#aafe-out'), own = priceOf(p);
      ok('AAF-E1 the bundle detail shows "How this price is worked out" at the default 5 seats, the same net as priceOf', !!b && b.qty === 5 && b.net === own.final && b.total === 225, J(b && [b.qty, b.net, b.total]));
      ok('AAF-E1 it lists the course and its list price, the quantity, the list total and the one discount (none at 5 seats, with why)', /Moving and Handling People — £45\.00/.test(b.t) && /Quantity5 seats/.test(b.t) && /£45\.00 × 5 = £225\.00/.test(b.t) && /None · Standard price/.test(b.t) && /below the first volume slab/.test(b.t), b.t.slice(0, 400));
      ok('AAF-E1 rounding is stated as the current prototype rule, pending client confirmation (not as approved)', /Rounded to whole pounds \(current prototype rule; pending client confirmation\)/.test(b.t) && !/approved rule/i.test(b.t));
      ok('AAF-E1 VAT: exclusive; none without an approved setting; minimum price shown with its basis', /Prices exclude VAT/.test(b.t) && /No VAT/.test(b.t) && /Minimum price£180\.00 \(list −20%\)/.test(b.t));
      const rows = $a('main .aafe-prev tbody tr').map(r => +r.dataset.q), nets = $a('main .aafe-prev tbody tr').map(r => +(r.children[3].textContent.replace(/[£,]/g, '')));
      ok('AAF-E1 quantity preview: 1 / 5 (default) / 10 / 25 / 50 seats, each net equal to priceOf at that quantity', J(rows) === J([1, 5, 10, 25, 50]) && rows.every((q, k) => nets[k] === priceOf(p, p.cur, q).final), J([rows, nets]));
      ok('AAF-E1 no agency has its own rate yet: said so', /No agency has its own rate/.test(main()));
      const s0 = prodSnap(), a0 = aud(), q0 = ADMIN.queue.length;
      setQ(10); const b10 = bd('#aafe-out');
      ok('AAF-E1 10 seats: list £450, volume −5% with its slab and version, £427.50 rounded to £428, per seat £42.80', b10.qty === 10 && b10.net === 428 && /£450\.00/.test(b10.t) && /−5% · Volume price: 10–24 seats −5%/.test(b10.t) && /Discount rates version \d/.test(b10.t) && /£427\.50 rounded to £428\.00/.test(b10.t) && /£42\.80 net/.test(b10.t), b10.t.slice(0, 600));
      ok('AAF-E1 the chosen quantity is kept when the page is drawn again', (render(), bd('#aafe-out').qty === 10));
      ok('AAF-E1 viewing changes nothing: no product, rate, queue or audit change', prodSnap() === s0 && aud() === a0 && ADMIN.queue.length === q0);
    });

    await T('AAF-E2 VAT after Finance approval', async () => {
      pick('biz'); detail(p); click($1(`main [data-act="chVatChange"][data-id="${p.id}"]`)); $1('#bp-vat').checked = true; $1('#bp-vatp').disabled = false; $1('#bp-vatp').value = '20'; INP.chVatDlgCalc(); reason('AAF-E VAT');
      detail(p); const b0 = bd('#aafe-out');
      ok('AAF-E2 pending VAT: the breakdown still adds no VAT and says the change awaits Finance approval', /No VAT/.test(b0.t) && /awaiting Finance approval/.test(b0.t) && b0.total === 225, b0.t.slice(-500));
      const vq = ADMIN.queue.find(i => i.type === 'Bundle VAT setting' && i.status === 'Pending'); pick('fin'); go('a-queue', { id: vq.id }); click(qBtn(vq.id, 'approve')); reason('ok');
      pick('biz'); detail(p); setQ(10); const b = bd('#aafe-out');
      ok('AAF-E2 approved VAT 20%: £428 + £85.60 = £513.60 for 10 seats; per seat £42.80 net · £51.36 incl. VAT', b.net === 428 && b.total === 513.6 && /20% · £85\.60/.test(b.t) && /£51\.36 incl\. VAT/.test(b.t) && /Finance approved this bundle's VAT setting/.test(b.t), b.t.slice(-600));
      ok('AAF-E2 VAT is worked out with chVatAmt on the rounded net', b.total === Math.round((428 + chVatAmt(428, 20)) * 100) / 100);
    });

    await T('AAF-E3 D14 per-agency rate', async () => {
      pick('super'); const n0 = discData().versions.length; setRate(CP, 25);
      ok('AAF-E3 (setup) the Super Administrator saves a 25% rate for CarePlus', discData().versions.length === n0 + 1 && discNow().agency[CP] === 25, J(discNow().agency));
      detail(p); const t = main();
      ok('AAF-E3 D14 the Pricing card names what CarePlus pays (£169 + VAT = £202.80 for 5 seats) and flags it below minimum — not checked', /Agencies with their own rate.*CarePlus Recruitment \(demo\): £202\.80 for 5 seats \(Agency rate for CarePlus Recruitment \(demo\): −25%\) below minimum — not checked/.test(t) && /final price above is for agencies without their own rate/.test(t), (t.match(/Agencies with their own rate.{0,260}/) || [''])[0]);
      const r = $1('main .aafe-agr tbody tr[data-ag]'), rt = r ? r.textContent.replace(/\s+/g, ' ') : '';
      ok('AAF-E3 the agency-rate row: −25%, net £169, below minimum £180 by £11 — not checked; the client question is stated', /−25%/.test(rt) && /£169\.00/.test(rt) && /Below minimum \(£180\.00\) by £11\.00 — not checked/.test(rt) && /client decision/.test(main()), rt);
      setQ(10, CP); const b = bd('#aafe-out'), pf = aa1AsAgency(CP, () => priceFor(AGY_CATALOGUE().find(c => c.id === p.id), 10));
      ok('AAF-E3 "Price as" CarePlus at 10 seats: exactly priceFor as CarePlus (net £338, total £405.60), the agency rate and why', b.net === pf.net && b.total === pf.total && b.net === 338 && /own rate: −25%/.test(b.t) && /higher than the volume \/ standard rate for 10 seats \(−5%\)/.test(b.t) && /never both/.test(b.t), J([b.net, b.total, pf.net, pf.total]));
      setQ(50, CP); const b50 = bd('#aafe-out');
      ok('AAF-E3 at 50 seats CarePlus\'s 25% beats the 15% volume rate; below minimum flagged, not enforced', b50.net === Math.round(2250 * 0.75) && /below minimum by/.test(b50.t) && /not checked/.test(b50.t), b50.t.slice(0, 300));
      setQ(10, ''); ok('AAF-E3 "Any agency without its own rate" at 10 seats is the volume price again (£428)', bd('#aafe-out').net === 428);
      ok('AAF-E3 the bundle\'s own floor status is unchanged (Above) — nothing was submitted or blocked', floorStatus(p) === 'Above' && p.status === 'Published' && !ADMIN.queue.some(i => i.type === 'Bundle price below minimum' && (i.data || {}).productId === p.id));
      pick('biz'); go('b-reports', { tab: 'pricing' }); const rp = main();
      ok('AAF-E3 Commercial Reports → Pricing lists CarePlus\'s rate on the bundle as "Below minimum — not checked" and says what the average discount is', /Agencies with their own rate/.test(rp) && /CarePlus Recruitment \(demo\)5−25%£169\.00£180\.00Below minimum — not checked/.test(rp) && /each bundle's own price at its default seats/.test(rp), (rp.match(/Agencies with their own rate.{0,500}/) || [''])[0]);
    });

    await T('AAF-E4 agency buy modal', async () => {
      pick('agency'); ok('AAF-E4 the agency is CarePlus', AGN() === CP, AGN()); go('g-buy'); const g = main();
      ok('AAF-E4 the Buy Bundles card states the default quantity and the minimum (no "From 5 seats")', /Priced for 5 seats \(buy 1 or more\)/.test(g) && !/From 5 seats/.test(g));
      click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); let b = bd('#gq-p');
      ok('AAF-E4 the modal shows the breakdown for the default 5 seats with CarePlus\'s own rate', !!b && b.qty === 5 && b.net === 169 && b.total === 202.8, J(b && [b.qty, b.net, b.total]));
      const gq = $1('#gq'); gq.value = '10'; INP.agBuyQty(gq); b = bd('#gq-p'); const pf = priceFor(S.agy.buy.c, 10);
      ok('AAF-E4 10 seats: the breakdown equals the modal total (priceFor): £338 + £67.60 = £405.60, rounding and VAT explained', b.qty === 10 && b.net === pf.net && b.total === pf.total && b.total === 405.6 && /£337\.50 rounded to £338\.00/.test(b.t) && /20% · £67\.60/.test(b.t) && /buy 1 seat or more/.test($1('#gq-p').textContent), J([b.net, b.total, pf.total]));
      ok('AAF-E4 the agency sees no minimum price, no approval wording and no other agency', !/Minimum price|minimum|System Administrator|client decision/i.test($1('#gq-p').textContent) && ADMIN.agencies.filter(a => a.name !== CP).every(a => !$1('#gq-p').textContent.includes(a.name)));
      gq.value = '1'; INP.agBuyQty(gq); b = bd('#gq-p'); ok('AAF-E4 1 seat can be priced: £45 list, CarePlus −25% → £34 (£33.75 rounded)', b.qty === 1 && b.net === 34 && /£33\.75 rounded to £34\.00/.test(b.t), b.t.slice(0, 500));
      gq.value = '10'; INP.agBuyQty(gq); press(); $1('#gc-o').value = 'success'; prim(); closeModal();
      const pu = STORE.agy.purchases[0];
      ok('AAF-E4 the card purchase charges the breakdown total and stores net / VAT (unchanged purchase records)', pu && pu.seats === 10 && pu.amount === 405.6 && pu.net === 338 && pu.vat === 67.6 && pu.status === 'Paid', J(pu));
    });

    await T('AAF-E5 roles and direct calls', async () => {
      const p0 = prodSnap();
      pick('sys'); detail(p); const bs = bd('#aafe-out');
      ok('AAF-E5 the System Administrator sees the same breakdown (read-only)', !!bs && bs.net === priceOf(p).final, J(bs && bs.net));
      pick('super'); detail(p); ok('AAF-E5 the Super Administrator sees the breakdown and the agency-rate row', !!bd('#aafe-out') && !!$1('main .aafe-agr tr[data-ag]'));
      pick('fin'); go('a-bundles', { id: p.id, tab: 'catalogue' }); ok('AAF-E5 Finance has no bundle catalogue (permission page) and no breakdown', !$1('main .aafe-bd') && /permission/i.test(main()));
      let s0 = sec(), a0 = aud(); INP.aafeCalc({ dataset: { id: p.id } });
      ok('AAF-E5 Finance calling the breakdown handler directly is refused and logged', sec() === s0 + 1 && aud() === a0 + 1 && /Blocked: view a bundle price breakdown/.test(ADMIN.audit[0].action), ADMIN.audit[0].action);
      pick('aca'); go('a-bundles', { id: p.id, tab: 'catalogue' }); ok('AAF-E5 the Academic Admin has no bundle access (permission page, no prices)', !$1('main .aafe-bd') && !/£225|£169/.test(main()));
      s0 = sec(); INP.aafeCalc({ dataset: { id: p.id } }); ok('AAF-E5 the Academic Admin\'s direct call is refused and logged', sec() === s0 + 1 && /Academic/.test(ADMIN.security[0].detail), ADMIN.security[0].detail);
      s0 = sec(); ACT.newBundle({ dataset: { id: p.id } }); ok('AAF-E5 the Academic Admin cannot open the bundle editor (existing guard)', !MODAL && sec() === s0 + 1); closeModal();
      pick('agency'); s0 = sec(); INP.aafeCalc({ dataset: { id: p.id } }); ok('AAF-E5 the agency\'s direct call to the internal breakdown is refused and logged', sec() === s0 + 1 && /Agency/.test(ADMIN.security[0].detail), ADMIN.security[0].detail);
      ok('AAF-E5 no product or rate record was changed by any of this', prodSnap() === p0);
    });

    await T('AAF-E6 editor NVQ and labels', async () => {
      pick('biz'); ACT.newBundle(); const f = ($1('#modal-root fieldset') || {}).textContent || '';
      ok('AAF-E6 the bundle editor lists the NVQ programme as "NVQ programme fee", never "undefined"', !/undefined/.test(f) && /Level 3 Diploma in Care Practice \(client demo\) £1,800\.00 · NVQ programme fee/.test(f), f.replace(/\s+/g, ' '));
      closeModal(); go('b-dashboard'); ok('AAF-E6 the Business dashboard says Bundle revenue is paid, incl. VAT', /Bundle revenue \(paid, incl\. VAT\)/.test(main()));
      go('b-reports', { tab: 'sales' }); ok('AAF-E6 Commercial Reports → Sales says its figures are gross (incl. VAT) and where the split is', /gross, including VAT/.test(main()) && /Sales£405\.6010 seats/.test(main()), (main().match(/Sales£[\d,.]+\d+ seats/) || [''])[0]);
    });

    await T('AAF-E7 invoice purchase, Modes, AA-1 idempotency', async () => {
      pick('agency'); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${p.id}"]`)); const gq = $1('#gq'); gq.value = '7'; INP.agBuyQty(gq);
      const bt = bd('#gq-p'); $a('#modal-root input[name="gpm"]').find(x => x.value === 'inv').checked = true; press(); $1('#gi-po').value = 'PO-AAFE'; press();
      const q = ADMIN.queue.find(i => i.type === 'Agency invoice (offline) purchase' && i.data && i.data.po === 'PO-AAFE'); if (!q) throw new Error('no invoice request');
      ok('AAF-E7 the invoice request carries the breakdown total for 7 seats', q.amount === bt.total && bt.qty === 7, J([q.amount, bt.total]));
      const nb = () => ADMIN.bundles.filter(b => b.agency === CP).length, b0 = nb();
      pick('fin'); go('a-queue', { id: q.id }); click(qBtn(q.id, 'approve')); reason('ok'); go('a-queue', { id: q.id }); click($1(`[data-act="invPay"][data-id="${q.id}"]`)); $1('#ip-r').value = 'BANK-AAFE-1'; reason('paid');
      const bn = ADMIN.bundles.find(b => b.id === q.data.bundleId);
      ok('AAF-E7 (AA-1) paying credits the bundle at once, VAT-stamped, once', !!bn && nb() === b0 + 1 && bn.vatPct === 20 && STORE.agy.ledger.filter(l => l.ref === 'Invoice ' + q.id && l.type === 'Credited').length === 1);
      go('f-reports', { tab: 'agency' }); const row = $a('main tr').find(r => r.firstElementChild && r.firstElementChild.textContent.trim() === CP), rt = row ? row.textContent.replace(/\s+/g, ' ') : '';
      ok('AAF-E7 Finance → Agency revenue Modes lists Gateway and Invoice (card + invoice purchase), with Net / VAT / Total', /Gateway, Invoice|Invoice, Gateway/.test(rt) && /^CarePlus Recruitment \(demo\)2/.test(rt) && /<th class="r">Net<\/th><th class="r">VAT<\/th><th class="r">Total<\/th><th>Modes<\/th>/.test($1('main').innerHTML), rt);
      pick('fin'); ACT.invPay({ dataset: { id: q.id } }); closeModal(); reconcileInvoices(); chVatSync(); pick('agency'); go('g-bundles');
      ok('AAF-E7 (AA-1) no replay: a second payment and later reads credit nothing more', nb() === b0 + 1 && STORE.agy.ledger.filter(l => l.ref === 'Invoice ' + q.id).length === 1);
    });

    signOutUI(); SS.setItem('ft-aaf-e.keep', J({ pid: p.id })); next(1); return;
  }

  if (PH === 1) {
    const p = P();
    await T('AAF-E-R refresh', async () => {
      ok('AAF-E-R after a real refresh the demo changes were restored', FCP.st === 'saved' && !!FCP.restored);
      pick('biz'); detail(p); setQ(10, CP); const b = bd('#aafe-out');
      ok('AAF-E-R the rate and VAT come back: CarePlus at 10 seats is still £338 + VAT = £405.60', !!b && b.net === 338 && b.total === 405.6, J(b && [b.net, b.total]));
      ok('AAF-E-R the purchases come back unchanged', STORE.agy.purchases.filter(x => x.agency === CP && x.amount === 405.6 && x.seats === 10).length === 1);
    });
    await T('AAF-E-S Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); pick('biz'); const p2 = P(); detail(p2); const b = bd('#aafe-out');
      ok('AAF-E-S Reset: standard £225 at 5 seats, no VAT, no agency rate rows', !!b && b.net === 225 && b.total === 225 && /No agency has its own rate/.test(main()) && !/Agencies with their own rate<\/dt>/.test($1('main').innerHTML));
      ok('AAF-E-S Reset: no test purchases', !STORE.agy.purchases.some(x => x.amount === 405.6));
    });
    await T('AAF-E-L legacy: agency isolation', async () => {
      fxLoadLegacy(); signOutUI();
      const ags = ADMIN.agencies.filter(a => agStatus(a) === 'Active'); if (ags.length < 2) throw new Error('need two agencies');
      const A = ags[0].name, B = ags[1].name, gp = STORE.biz.products.find(x => x.status === 'Published' && !x.agency && discAuto(x));
      S.portal = 'admin'; setAdminIdentity('A'); S.signedIn = true; S.ui = {}; setRate(A, 30);
      ok('AAF-E-L (setup) a 30% rate for ' + A, discNow().agency[A] === 30);
      S.portal = 'agency'; S.agy.id = ags[1].id; S.signedIn = true; render(); ok('AAF-E-L signed in as the other agency', AGN() === B, AGN());
      go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${gp.id}"]`)); const t = $1('#gq-p').textContent;
      ok('AAF-E-L the other agency\'s breakdown has no trace of ' + A + '\'s rate', !t.includes(A) && !/−30%/.test(t) && !/own rate/.test(t), t.replace(/\s+/g, ' ').slice(0, 300));
      closeModal(); S.agy.id = ags[0].id; render(); go('g-buy'); click($1(`main [data-act="agBuy"][data-id="${gp.id}"]`)); const tA = $1('#gq-p').textContent;
      ok('AAF-E-L ' + A + ' sees its own 30% rate', /−30%/.test(tA) && !tA.includes(B));
      closeModal(); const cu = STORE.biz.products.find(x => x.customTotal && x.agency);
      if (cu) { S.portal = 'admin'; setAdminIdentity('A'); S.signedIn = true; S.ui = {}; detail(cu); const b = bd('#aafe-out'); ok('AAF-E-L a negotiated bundle explains its pro-rated negotiated price for its agency', !!b && /Negotiated price for/.test(b.t) && /÷/.test(b.t) && b.net === priceOf(cu).final, b && b.t.slice(0, 400)); }
      else ok('AAF-E-L (no negotiated bundle in the legacy data — skipped)', true);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-aaf-e.phase'); SS.removeItem('ft-aaf-e.R');
})();
