// SA-FINAL E — SA-07 Finance Reports "Batchwise" tab (ledger-derived, filters, agency bundles kept apart, reconciles with Coursewise and the
// Ledger) and SA-08 Reports & Analytics (charts from the stored records; no fixed figures; #12, #13, #21; Academic Admin Batch reports).
// suites.sh runs it with FIXTURE=client. Phase 0: client demo. Phase 1: a real refresh, Reset demo, then the legacy fixture.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sae.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sae.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-sae.R', J(R)); SS.setItem('ft-sae.phase', String(ph)); location.reload(); };
  const sel = (s, v) => { const e = $1(s); if (!e) throw new Error('missing ' + s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  const bw = () => { const s = $1('main .sae-bw'); return s ? Object.fromEntries(Object.entries(s.dataset).map(([k, v]) => [k, +v])) : null; };
  const bwRows = () => $a('main .sae-bw-tbl tbody tr[data-k]').map(r => r.dataset.k);
  const tab = t => click($1(`main .subtabs [data-tab="${t}"]`));
  const charts = () => $a('main .sae-chart').map(f => ({ id: f.dataset.chart, t: +f.dataset.total, tt: +f.dataset.tableTotal, o: f.dataset.totalOut, to: f.dataset.tableOut }));
  const chartsOk = cs => cs.length && cs.every(c => c.t === c.tt && c.o === c.to);
  const BAD = /undefined|null%|NaN/;
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const CDB = 'DEMO-L3-JAN27';

  if (PH === 0) {
    /* ================= SA-07 Batchwise (client demo) ================= */
    await T('SAE-07 batchwise tab', async () => {
      pick('super'); go('f-reports', { tab: 'datewise' }); tab('batchwise');
      const sel0 = $1('main .subtabs [data-tab="batchwise"]');
      ok('SAE-07 Finance Reports has its own Batchwise tab next to Coursewise, opened with a click (Super Admin)', S.params.tab === 'batchwise' && sel0 && sel0.getAttribute('aria-selected') === 'true' && $1('main .subtabs [data-tab="coursewise"]').getAttribute('aria-selected') === 'false' && !!$1('main .sae-bw'));
      const th = $a('main .sae-bw-tbl thead th').map(t => t.textContent.trim());
      ok('SAE-07 columns: batch, course, learners / seats, received, refunded, net, outstanding, overdue', J(th) === J(['Batch', 'Course', 'Learners / seats', 'Received', 'Refunded', 'Net', 'Outstanding now', 'Overdue now']), J(th));
      const d = bw(), L = fiLedger(fcRepF());
      ok('SAE-07 KPIs reconcile with the ledger read model (received, refunded, net) — client £1,078.33', d.received === L.received && d.refunded === L.refunded && d.net === L.net && d.received === 107833, J(d));
      ok('SAE-07 rows: the demo batch (4 / 16 seats) and "Not batch-specific" (Lena\'s short course)', J(bwRows()) === J([CDB, FC_NB]) && /4 \/ 16/.test($1(`main .sae-bw-tbl tr[data-k="${CDB}"]`).textContent) && d.enrolled === 4 && d.cap === 16, J(bwRows()));
      const r = saeBatchwise(fcRepF()).rows, sum = k => r.reduce((a, x) => a + x[k], 0);
      ok('SAE-07 row figures add up to the KPI totals', sum('rec') === d.received && sum('out') === d.outstanding && sum('net') === d.net && d.outstanding === 696667, J([sum('rec'), sum('out')]));
      go('f-reports', { tab: 'coursewise' }); const cw = $1('main .fi-rep').dataset;
      ok('SAE-07 Batchwise totals equal Coursewise (received, refunded, outstanding, overdue)', +cw.received === d.received && +cw.refunded === d.refunded && +cw.outstanding === d.outstanding && +cw.overdue === d.overdue, J(cw));
      const th2 = $a('main .fi-rep thead th').map(t => t.textContent.trim());
      ok('SAE-07 Coursewise: "Payers" renamed "Learners (paid or owing)"', !th2.includes('Payers') && th2.filter(t => t === 'Learners (paid or owing)').length === 2, J(th2));
      go('f-ledger'); const lf = $1('main .fc-led-foot').dataset;
      ok('SAE-07 the Ledger footer received equals the Batchwise total', +lf.received === d.received, J(lf));
    });
    await T('SAE-07 filters', async () => {
      go('f-reports', { tab: 'batchwise' }); sel('#fcB-fr', CDB); let d = bw();
      ok('SAE-07 batch filter (UI select): one row, KPIs £1,033.33 received, £6,966.67 outstanding', J(bwRows()) === J([CDB]) && d.received === 103333 && d.outstanding === 696667 && d.enrolled === 4, J([bwRows(), d]));
      setUi('fcB-fl', CDB); go('f-ledger'); const lf = +$1('main .fc-led-foot').dataset.received; setUi('fcB-fl', '');
      ok('SAE-07 the same batch in the Ledger gives the same received figure', lf === 103333, lf);
      go('f-reports', { tab: 'batchwise' }); sel('#fcB-fr', FC_NB); d = bw();
      ok('SAE-07 "Not batch-specific": no batch row, £45.00, no seats', J(bwRows()) === J([FC_NB]) && d.received === 4500 && d.cap === 0, J([bwRows(), d]));
      click($1('main [data-act="fcClr"]')); sel('#fcT-fr', 'Short course'); d = bw();
      ok('SAE-07 course type "Short course": no batch rows, £45.00', !bwRows().includes(CDB) && d.received === 4500, J([bwRows(), d]));
      click($1('main [data-act="fcClr"]')); sel('#fcC-fr', cdPr().id); d = bw();
      ok('SAE-07 course filter (the demo programme): the batch only, £1,033.33', J(bwRows()) === J([CDB]) && d.received === 103333, J(bwRows()));
      click($1('main [data-act="fcClr"]')); ok('SAE-07 Clear restores the totals', bw().received === 107833 && bwRows().length === 2);
      ok('SAE-07 the export is named for the batchwise report', /Finance report — batchwise/.test($1('main [data-act="aExport"]').dataset.n), $1('main [data-act="aExport"]').dataset.n);
    });
    await T('SAE-07 Finance Admin parity', async () => {
      go('f-reports', { tab: 'batchwise' }); const sa = bw();
      pick('fin'); go('f-reports', { tab: 'batchwise' }); const fa = bw();
      ok('SAE-07 Finance Admin sees the same Batchwise figures as the Super Admin', J(sa) === J(fa) && !!fa, J([sa, fa]));
      go('a-reports'); ok('SAE-08 role scope: Finance Admin is still refused Reports & Analytics', /isn't part of the Finance Admin role/.test(main()) && !$1('main .sae-chart'));
    });

    /* ================= SA-08 Reports & Analytics (client demo) ================= */
    await T('SAE-08 overview charts', async () => {
      pick('super'); go('a-reports'); const cs = charts();
      ok('SAE-08 Overview opens by default with five charts (enrolments, occupancy, money, assignments, attendance)', J(cs.map(c => c.id)) === J(['enrol', 'occupancy', 'money', 'assign', 'attendance']), J(cs.map(c => c.id)));
      ok('SAE-08 every chart total equals its table total', chartsOk(cs), J(cs));
      const tf = id => { const t = $1(`main .sae-chart[data-chart="${id}"] .sae-tot`); return t ? [...t.querySelectorAll('td')].map(x => x.textContent.trim()) : []; };
      ok('SAE-08 the table views\' Total rows print the chart totals (enrolments 5, enrolled 4 of 16, records 8)', tf('enrol')[1] === '5' && tf('occupancy')[2] === '4' && tf('occupancy')[3] === '16' && tf('assign').slice(-1)[0] === '8', J([tf('enrol'), tf('occupancy'), tf('assign')]));
      const m = cs.find(c => c.id === 'money'), B = saeBatchwise({ days: 180 }).T;
      ok('SAE-08 money chart = Finance Batchwise (net £1,078.33, outstanding £6,966.67)', m.t === B.net && +m.o === B.out && m.t === 107833 && +m.o === 696667, J([m, B]));
      ok('SAE-08 enrolments: all five share one date — said honestly, one month bar', /All 5 enrolments were recorded on/.test(main()) && $a('main .sae-chart[data-chart="enrol"] .sae-col').length === 1);
      ok('SAE-08 attendance: "Not available — no recorded registers" (nothing estimated)', /Not available — no recorded registers/.test(main()));
      ok('SAE-08 observations: a clear empty state', /no observation records yet/.test(main()));
      ok('SAE-08 labelled as counted from the prototype\'s records', /Counted from the records stored in this prototype \(client demo data\)/.test(main()));
      ok('SAE-08 no fixed figures (86%, 58%, 71%) and no "undefined"/"null%"', !/86%|58%|71%/.test(main()) && !BAD.test(main()));
    });
    await T('SAE-08 tabs, deep links, invented figures', async () => {
      for (const t of ['progress', 'completion', 'staff', 'registered', 'other', 'exports']) { go('a-reports', { tab: t }); ok('SAE-08 Super Admin tab ' + t + ': no "undefined", "null%", "NaN"', !BAD.test(main()) && $1(`main .subtabs [data-tab="${t}"]`).getAttribute('aria-selected') === 'true'); }
      for (const t of ['batch', 'coverage', 'decisions']) { go('a-reports', { tab: t }); ok('SAE-21 Super Admin deep link a-reports.' + t + ' opens the Overview (no "undefined")', !/undefined/.test(main()) && $1('main .subtabs [data-tab="overview"]').getAttribute('aria-selected') === 'true'); }
      go('a-reports', { tab: 'other' }); ok('SAE-12 Attendance card: no literal 86%; "Not available — no recorded registers"', !/86%/.test(main()) && /Not available — no recorded registers/.test($1('main .sae-att').textContent));
      go('a-reports', { tab: 'staff' }); const sr = $a('main .sae-staff tbody tr').find(r => /Sarah Okonkwo/.test(r.textContent)), cells = sr ? [...sr.querySelectorAll('td')].slice(3).map(x => x.textContent.trim()) : [];
      ok('SAE-12 Staff performance: counted from records (Sarah 0 marked — nothing marked in the client demo); no invented turnaround or rate', J(cells) === J(['0', '0', '0', '0']) && !/days|\d+%/.test($1('main .sae-staff').textContent) && /not available in the prototype/.test(main()), J(cells));
      go('a-reports', { tab: 'progress' }); ok('SAE-12 Progress: per batch from assignment records (0 / 8 marked); no formula competency split', /0 \/ 8/.test($1('main .sae-prog').textContent) && !$1('main .sae-prog .fivebar, main .sae-prog [class*="five"]') && /competency distribution is not calculated/i.test(main()));
    });
    await T('SAE-21 completion', async () => {
      go('a-reports', { tab: 'completion' }); const tb = () => $1('main .sae-comp');
      ok('SAE-21 Completion: from enrolment records (5 enrolments, 0 completed), no "null%"', tb() && +tb().dataset.total === 5 && +tb().dataset.done === 0 && !/null%/.test(main()), tb() && J(tb().dataset));
      sel('main select[data-onchange="saeCG"]', 'type'); const ks = $a('main .sae-comp tbody tr:not(.sae-tot) td:first-child').map(t => t.textContent);
      ok('SAE-21 Group by course type works (NVQ programme 4, Short course 1)', J(ks) === J(['NVQ programme', 'Short course']) && /NVQ programme\s*4/.test(main()), J(ks));
      sel('#sae-cf', '2027-01-01'); ok('SAE-21 the From date filters the enrolments (none after 1 Jan 2027)', !tb() && /No enrolments for these dates/.test(main()));
      click($1('main [data-act="saeCClr"]')); ok('SAE-21 Clear restores the filters', +tb().dataset.total === 5 && !ui('saeCF', ''));
      sel('#sae-ct', '2026-12-31'); role('bizA'); SA(); go('a-reports', { tab: 'completion' });
      ok('SAE-21 the completion filters reset on an identity change', +tb().dataset.total === 5 && !$1('#sae-ct').value);
    });
    await T('SAE-13 pending markings', async () => {
      pick('super'); go('a-dashboard'); const kv = l => { const k = $a('main .adm-kpis .kpi').find(x => x.querySelector('.xs').textContent.startsWith(l)); return k ? k.querySelector('.big-num').textContent.trim() : null; };
      ok('SAE-13 baseline: Pending markings 0, Average progress "—"', kv('Pending markings') === '0' && kv('Average progress') === '—');
      ok('SAE-13 allSubmissions now reads the client demo learners (8 assignment records)', allSubmissions().length === 8 && allSubmissions().every(s => /^CD\d-/.test(s.id)), allSubmissions().length);
      const w = drLearnerW('CD1'), a = w.assignments[0]; a.status = 'Submitted'; a.submittedAt = now().toISOString(); render();
      go('a-dashboard'); ok('SAE-13 a client-demo submission counts in Pending markings (1); Average progress is counted (0% marked)', kv('Pending markings') === '1' && kv('Average progress') === '0%', J([kv('Pending markings'), kv('Average progress')]));
      ok('SAE-13 it is listed in Assessment Records with its batch', allSubmissions().some(s => s.id === 'CD1-' + a.id && s.status === 'Submitted' && s.batch === CDB));
      go('a-reports', { tab: 'progress' }); ok('SAE-08 the assignment chart counts it as submitted (chart total = table total)', chartsOk(charts()) && /Submitted, awaiting marking/.test(main()));
      go('a-dashboard'); ok('SAE-08 dashboard: "Reports at a glance" with two charts whose totals match their tables', $a('main .sae-dash .sae-chart').length === 2 && chartsOk(charts()));
    });
    await T('SAE-08 role scope', async () => {
      pick('aca'); go('a-reports', { tab: 'batch' });
      const bt = $1('main .sae-brep') ? $1('main .sae-brep').textContent.replace(/\s+/g, ' ') : '';
      ok('SAE-12 Academic Admin Batch reports: enrolment 4/16, "No registers recorded", 1 / 8 records submitted shows 0 / 8 marked; no invented 78% / 50% / 87%', /4\/16/.test(bt) && /No registers recorded/.test(bt) && /0 \/ 8/.test(bt) && !/78%|87%|50%/.test(bt), bt.slice(0, 200));
      go('a-reports'); ok('SAE-08 Academic Admin sees the Overview without money figures', !!$1('main .sae-chart[data-chart="assign"]') && !$1('main .sae-chart[data-chart="money"]') && /Money figures are in Finance → Reports/.test(main()) && chartsOk(charts()));
      go('f-reports', { tab: 'batchwise' }); ok('SAE-07 Academic Admin cannot open Finance Reports', S.route !== 'f-reports' && !$1('main .sae-bw'));
      pick('biz'); go('a-reports'); ok('SAE-08 Business Admin is refused Reports & Analytics', /isn't part of the Business Admin role/.test(main()) && !$1('main .sae-chart'));
      pick('coord1'); go('a-reports'); ok('SAE-08 a Coordinator cannot open Reports & Analytics', S.route !== 'a-reports' && !$1('main .sae-chart'));
      pick('sys'); go('a-reports'); ok('SAE-08 System Admin keeps Reports & Analytics with the money chart', !!$1('main .sae-chart[data-chart="money"]'));
    });
    await T('SAE 390px', async () => {
      pick('super'); S.frame = 'mobile'; go('a-reports'); render();
      const fit = s => $a(s).every(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().width <= 391);
      ok('SAE 390px: the app is 390px wide; every chart and KPI row fits without sideways overflow', $1('#app').getBoundingClientRect().width <= 391 && fit('main .sae-chart') && fit('main .sae-kpis') && fit('main .sae-row'), J($a('main .sae-chart').map(e => [e.scrollWidth, e.clientWidth])));
      go('f-reports', { tab: 'batchwise' }); ok('SAE 390px: Batchwise section fits (its table scrolls inside its own wrapper)', fit('main .sae-bw') && fit('main .sae-bw .sae-chart'));
      S.frame = 'auto'; render();
    });
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    await T('SAE refresh', async () => {
      SA(); const w = drLearnerW('CD1');
      ok('SAE after a real refresh: the submitted record is still counted (from the saved records)', w.assignments[0].status === 'Submitted' && allSubmissions().filter(s => s.status === 'Submitted').length === 1);
      go('f-reports', { tab: 'batchwise' }); ok('SAE after a refresh: Batchwise figures recomputed, unchanged', bw().received === 107833 && bw().outstanding === 696667);
    });
    await T('SAE Reset demo', async () => {
      signOutUI(); ACT.resetDemo(); SA();
      ok('SAE Reset demo: no submission; Pending markings source back to 0 submitted', allSubmissions().filter(s => s.status === 'Submitted').length === 0 && allSubmissions().length === 8);
      go('a-reports'); ok('SAE Reset demo: charts recomputed, totals equal tables', chartsOk(charts()));
    });

    /* ================= Legacy fixture ================= */
    await T('SAE legacy batchwise', async () => {
      fxLoadLegacy(); signOutUI(); SA(); go('f-reports', { tab: 'batchwise' }); const d = bw(), L = fiLedger(fcRepF());
      ok('SAE legacy: Batchwise KPIs = the ledger read model (received, refunded, net)', d.received === L.received && d.refunded === L.refunded && d.net === L.net && d.received > 0, J([d, L.received, L.refunded]));
      go('f-reports', { tab: 'coursewise' }); const cw = $1('main .fi-rep').dataset;
      ok('SAE legacy: Batchwise totals = Coursewise totals', +cw.received === d.received && +cw.refunded === d.refunded && +cw.outstanding === d.outstanding && +cw.overdue === d.overdue, J(cw));
      const B = saeBatchwise(fcRepF()), ag = B.rows.find(r => r.k === '__agency__'), agL = L.rows.filter(e => e.payerType === 'Agency');
      ok('SAE legacy: agency bundle purchases are in the "Agency bundles" row, never in a batch', !!ag && agL.length > 0 && agL.every(e => !e.bk) && ag.rec === agL.filter(e => e.kind === 'receipt').reduce((a, e) => a + e.p, 0), J([ag && ag.rec, agL.length]));
      const batches = B.rows.filter(r => r.b), per = batches.map(r => { setUi('fcB-fr', r.k); const x = saeBatchwise(fcRepF()).T.rec; return x === r.rec; }); setUi('fcB-fr', '');
      ok('SAE legacy: filtering to each batch gives that batch\'s row figure', per.length > 5 && per.every(Boolean), J(per));
      go('f-reports', { tab: 'batchwise' }); ok('SAE legacy: the Agency bundles row is labelled as not attributed to a batch', /Bundle purchases — not attributed to a batch/.test(main()));
    });
    await T('SAE legacy reports', async () => {
      go('a-reports'); const cs = charts();
      ok('SAE legacy: Overview chart totals equal their tables', chartsOk(cs) && cs.length === 5, J(cs));
      ok('SAE legacy: labelled as legacy demo data', /\(legacy demo data\)/.test(main()));
      go('a-reports', { tab: 'other' }); ok('SAE legacy: no literal 86% attendance', !/86%/.test(main()) && /Not available — no recorded registers/.test(main()));
      go('a-reports', { tab: 'progress' }); ok('SAE legacy: Progress has no seeded drill-down figures (61%, 54%)', !/Leicester Cohort 7\s*61%|54%/.test(main()) && /L3AC-JAN26/.test(main()));
      go('a-reports', { tab: 'staff' }); const sr = $a('main .sae-staff tbody tr').find(r => /Sarah Okonkwo/.test(r.textContent)), marked = sr ? +sr.querySelectorAll('td')[3].textContent : -1;
      const exp = allSubmissions().filter(s => s.assessor === 'Sarah Okonkwo' && saeAgOf(s.status) === 'marked').length;
      ok('SAE legacy: Staff marked counts come from the assignment records (no 40 + 7k formula)', marked === exp && !/ days/.test($1('main .sae-staff').textContent), J([marked, exp]));
      go('a-reports', { tab: 'completion' }); ok('SAE legacy: Completion from enrolment records; no "null%"; the seeded totals are said to be unused', !/null%/.test(main()) && /seeded course totals/.test(main()) && !/\b412\b/.test($1('main .sae-comp').textContent));
      ok('SAE legacy: allSubmissions still reads worlds C and D (14 records)', allSubmissions().length === 14);
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem('ft-sae.phase'); SS.removeItem('ft-sae.R');
})();
