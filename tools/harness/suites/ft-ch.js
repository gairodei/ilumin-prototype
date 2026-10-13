// Client decisions CH-01 … CH-31 — one block per batch.
// Batch 1: CH-01 country fixed, CH-02 GBP only, CH-03 data region, CH-05 VAT invoices, CH-31 contact details,
// the placeholder register (4 topics), CH-24 unchanged, and the CH records.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const html = () => app().innerHTML;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; initStore(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const SA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const FA = () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { ACT.switchRole({ dataset: { r } }); S.signedIn = true; };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  // currency AED / INR only — "AED" on its own is also the defibrillator in course content
  const MULTI = /AED\s?[\d,]|[\d.]\s?AED\b|\(AED\)|GBP \/ AED|\bINR\b|₹|Converted from the base price|exchange-rate|never combined|per currency|Both currencies|Billing currency/i;
  const CONTACT = '020 3983 0282 · info@welfarehs.co.uk · Mon–Sun 9:30 AM – 6 PM';
  // every tab of a route, as its sub-tab buttons offer them
  const tabs = () => [...app().querySelectorAll('.subtabs [data-tab], .subtabs button[data-go]')].map(b => b.dataset.tab).filter(Boolean);
  const sweep = (route, id) => { const seen = []; go(route, id ? { id } : {}); const ts = tabs(); seen.push([route, main()]); ts.forEach(t => { go(route, { id, tab: t }); seen.push([route + '.' + t, main()]); }); return seen; };

  /* ================= Batch 1 ================= */

  /* ---------- CH-01 Country fixed at registration ---------- */
  await T('CH-01 country never changes', async () => {
    fresh();
    ['A', 'B', 'C', 'F', 'H'].forEach(v => {
      learner(v); go('profile'); const row = [...app().querySelectorAll('main .li')].find(li => /Country of residence/.test(li.textContent));
      ok(`CH-01 ${v}: Country of residence read-only, no Request change`, !!row && !row.querySelector('[data-act="reqChange"]') && /Read-only/.test(row.textContent) && row.textContent.includes(W.me.country), row && row.textContent.trim().slice(0, 90));
    });
    learner('A'); go('profile'); ok('CH-01 other fields keep Request change', app().querySelectorAll('main [data-act="reqChange"]').length >= 5);
    ok('CH-01 no country request anywhere', Object.values(STORE.worlds).every(w => !(w.requests || []).some(r => r.target === 'Country of residence')));
    ok('CH-01 no moved-country state or demo step', typeof ACT.scPriyaBefore !== 'function' && Object.values(STORE.worlds).every(w => !w.me.countryChanged) && allLearners().every(l => !l.countryChanged));
    ok('CH-01 scenario "Learner moves country" removed', !SC_LIST().some(s => /moves country/i.test(s[1])));
    SA(); go('a-learner', { id: 'IA-L-27703' }); ok('CH-01 Learner 360: "Country: United Arab Emirates (set at registration)"', /Country\s*United Arab Emirates\s*\(set at registration\)/.test(main()) && !/Country changed/.test(main()));
    go('a-learner', { id: 'IA-L-27703', tab: 'personal' }); ok('CH-01 Learner 360 personal details: country (set at registration)', /Country\s*United Arab Emirates\s*\(set at registration\)/.test(main()));
    S.signedIn = false; S.portal = 'learner'; ACT.regStart && ACT.regStart(); await wait(30);
    const sel = $('#rg-country'); ok('CH-01 registration keeps the required country list', !!sel && ['United Kingdom', 'United Arab Emirates', 'India', 'Ireland', 'Nigeria', 'Pakistan', 'Philippines', 'South Africa'].every(c => [...sel.options].some(o => o.textContent === c)));
    ok('CH-01 registration hint: country can\'t be changed; prices in GBP', /can't be changed after you register/.test(main()) && /£ GBP/.test(main()) && !/AED/.test(main()));
    fresh();
  });

  /* ---------- CH-02 GBP only ---------- */
  await T('CH-02 GBP only — data', () => {
    fresh();
    const ws = Object.values(STORE.worlds);
    ok('CH-02 every learner world pays in GBP', ws.every(w => w.me.cur === 'GBP'), ws.map(w => w.v + ':' + w.me.cur).join());
    ok('CH-02 every enrolment, plan and payment in GBP', ws.every(w => (w.enrolments || []).every(e => !e.cur || e.cur === 'GBP') && (w.plans || []).every(p => !p.cur || p.cur === 'GBP') && (w.tx || []).every(t => !t.cur || t.cur === 'GBP')));
    ok('CH-02 every admin learner in GBP', allLearners().every(l => l.cur === 'GBP'), allLearners().filter(l => l.cur !== 'GBP').map(l => l.name).join());
    ok('CH-02 courses have one GBP price (no AED field)', ADMIN.courses.every(c => typeof c.gbp === 'number' && !('aed' in c)));
    ok('CH-02 ledger, deposits, overdue, pending, failed, links, duplicates all GBP', allTx().every(t => t.cur === 'GBP') && ['deposits', 'od', 'pending', 'failed', 'links', 'dups'].every(k => (STORE.fin[k] || []).every(r => !r.cur || r.cur === 'GBP')));
    ok('CH-02 queue items with an amount are in GBP', ADMIN.queue.filter(i => i.cur).every(i => i.cur === 'GBP'), ADMIN.queue.filter(i => i.cur && i.cur !== 'GBP').map(i => i.id).join());
    ok('CH-02 agency bundles and purchases in GBP', ADMIN.bundles.every(b => b.cur === 'GBP') && STORE.agy.purchases.every(p => p.cur === 'GBP') && STORE.biz.products.every(p => !p.cur || p.cur === 'GBP'));
    ok('CH-02 plan templates GBP only', STORE.fin.templates.every(t => !('aed' in t) && !('depA' in t)));
    // converted at £1 = AED 4.65 = INR 105, IDs kept
    const q = id => ADMIN.queue.find(i => i.id === id) || {}, dep = id => STORE.fin.deposits.find(d => d.id === id) || {}, bn = id => ADMIN.bundles.find(b => b.id === id) || {};
    ok('CH-02 converted amounts keep their IDs', q('AQ-1013').amount === 180 && q('AQ-1014').amount === 4258.06 && q('AQ-2002').amount === 60 && q('AQ-2003').amount === 300 && q('AQ-2006').amount === 315 && dep('DEP-300').amount === 300 && bn('BN-02').price === 4258.06 && bn('BN-05').price === 2341.94 && bn('BN-15').price === 418.06);
    ok('CH-02 deposits keep their programme', dep('DEP-300').programme === 'Level 3 Diploma in Adult Care (England)' && dep('DEP-302').programme === 'Level 2 Diploma in Care (England)');
    ok('CH-02 India learners keep their IDs', ['IA-L-31900', 'IA-L-31941'].every(id => { const l = learnerById(id); return l && l.country === 'India' && l.cur === 'GBP'; }));
  });

  await T('CH-02 GBP only — learner screens and checkout', async () => {
    fresh();
    ['A', 'B', 'C', 'F', 'H'].forEach(v => { learner(v); ['browse', 'payments', 'dashboard'].forEach(r => { go(r); ok(`CH-02 ${v} ${r}: GBP only`, !MULTI.test(main()) && (r !== 'browse' || /£/.test(main())), (main().match(MULTI) || [''])[0]); }); });
    learner('A'); go('payments'); ok('CH-02 Payments subtitle "All amounts in GBP (£)."', /All amounts in GBP \(£\)\./.test(main()));
    learner('A'); go('browse'); const b = app().querySelector('main [data-act="buyCourse"]'); ACT.buyCourse({ dataset: { ...b.dataset } });
    const line = mroot().querySelector('.ch-stripe');
    ok('CH-02 checkout: grey Stripe line with the GBP amount', !!line && /^Stripe may show this amount in your local currency\. You'll be charged £[\d,]+\.\d\d\.$/.test(line.textContent.trim()) && line.classList.contains('muted'), line && line.textContent);
    ok('CH-02 checkout: no exchange-rate tag', !/exchange-rate|Pending client/.test(MODAL.body)); closeModal();
    learner('C'); go('payments'); const pay = app().querySelector('main [data-act="payInst"]'); if (pay) { ACT.payInst({ dataset: { ...pay.dataset } }); ok('CH-02 instalment checkout has the Stripe line', !!mroot().querySelector('.ch-stripe')); closeModal(); }
  });

  await T('CH-02 GBP only — admin, Finance, Business and agency screens', () => {
    fresh();
    SA(); go('a-courses'); ok('CH-02 Courses: one GBP price, every learner pays it', !MULTI.test(main()) && /Every learner pays the GBP price/.test(main()));
    go('a-courses', { id: ADMIN.courses[0].id }); ok('CH-02 course editor: Price (GBP) only', !$('#cd-a') && /Price \(GBP\)/.test(main()) && !MULTI.test(main()));
    go('a-dashboard'); ok('CH-02 Super Admin dashboard: single GBP revenue', !MULTI.test(main()));
    sweep('a-finance').forEach(([t, txt]) => ok(`CH-02 ${t}: GBP only`, !MULTI.test(txt), (txt.match(MULTI) || [''])[0]));
    ok('CH-02 Super Admin finance: no Currency filter or select', !app().querySelector('select[aria-label="Currency"]'));
    go('a-learners'); ok('CH-02 Learners: no Currency column', !DT.learners.cols.some(c => c.l === 'Currency'));
    FA(); ['f-dashboard', 'f-ledger', 'f-deposits', 'f-overdue', 'f-refunds', 'f-exceptions', 'f-agency', 'f-learners', 'f-plans', 'f-reports'].forEach(r => sweep(r).forEach(([t, txt]) => ok(`CH-02 ${t}: GBP only`, !MULTI.test(txt) && !app().querySelector('select[aria-label="Currency"]'), (txt.match(MULTI) || [''])[0])));
    go('f-learner', { id: 'IA-L-30903' }); ok('CH-02 Finance learner: country and data region, no currency', /Data region\s*UAE/.test(main()) && !MULTI.test(main()));
    FA(); go('f-ledger'); ACT.finOffline(); ok('CH-02 Record offline payment: no currency select', !!MODAL && !$('#op-c') && !/Currency/.test(MODAL.body)); closeModal();
    role('bizA'); ['b-dashboard', 'a-bundles', 'b-reports', 'a-agencies'].forEach(r => sweep(r).forEach(([t, txt]) => ok(`CH-02 ${t}: GBP only`, !MULTI.test(txt), (txt.match(MULTI) || [''])[0])));
    ACT.newBundle(); ok('CH-02 bundle editor: no currency select; GBP note', !!MODAL && !$('#bp-cur') && /every agency bundle is priced in GBP/.test(MODAL.body)); closeModal();
    ACT.newAgency(); ok('CH-02 agency onboarding: no billing currency', !!MODAL && !$('#oa-cur') && !/currency/i.test(mroot().textContent)); closeModal();
    agyEnter('AG-03', true); ['g-dashboard', 'g-buy', 'g-purchases', 'g-reports'].forEach(r => { go(r); ok(`CH-02 Gulf Care ${r}: GBP only`, !MULTI.test(main()), (main().match(MULTI) || [''])[0]); });
  });

  /* ---------- CH-03 Data region ---------- */
  await T('CH-03 data region by country', () => {
    fresh();
    ok('CH-03 rule: UK → UK, UAE → UAE, any other country → UK', regionOf('United Kingdom') === 'UK' && regionOf('United Arab Emirates') === 'UAE' && ['India', 'Nigeria', 'Ireland', 'Pakistan', 'Philippines', 'South Africa'].every(c => regionOf(c) === 'UK'));
    ok('CH-03 every learner has region UK or UAE', allLearners().every(l => ['UK', 'UAE'].includes(regionOf(l.country))));
    SA(); go('a-learner', { id: 'IA-L-31900' }); ok('CH-03 Learner 360 (India): Data region UK, no Pending tag', /Data region\s*UK/.test(main()) && !/storage region|Pending client/.test(html()));
    go('a-learner', { id: 'IA-L-27703' }); ok('CH-03 Learner 360 (UAE): Data region UAE', /Data region\s*UAE/.test(main()));
    go('a-dataprotection', { tab: 'residency' }); const t = main();
    ok('CH-03 Data Protection: rule and UK / UAE counts only', /stored in the UAE/.test(t) && /every other country are stored in the UK/.test(t) && !/no region rule|Other countries/.test(t));
    const n = s => +((t.match(new RegExp('Data region ' + s + ':\\s*(\\d+)')) || [])[1]);
    ok('CH-03 UK + UAE counts = every learner', n('UK') + n('UAE') === allLearners().length, n('UK') + ' + ' + n('UAE') + ' / ' + allLearners().length);
    go('a-learners'); ok('CH-03 Learners note states the rule', /every other country are stored in the UK/.test(main()) && !/no region rule/.test(main()));
  });

  /* ---------- CH-05 VAT invoices outside the system ---------- */
  await T('CH-05 VAT invoices sent by email', () => {
    fresh(); role('agyA'); ACT.agBuy({ dataset: { id: 'CAT-1' } }); const inv = $('#modal-root input[name="gpm"][value="inv"]'); if (inv) inv.checked = true; prim();
    ok('CH-05 bank-transfer purchase: VAT note, no tag', !!MODAL && /VAT invoices are sent by the Academy by email\./.test(MODAL.body) && !/Pending client/.test(MODAL.body)); closeModal();
    const it = ADMIN.queue.find(x => x.type === 'Agency invoice (offline) purchase' && x.stage === 'awaiting'); FA(); go('a-queue', { id: it.id });
    ok('CH-05 Approvals Queue invoice item: "Sent by the Academy by email"', /VAT invoice\s*Sent by the Academy by email/.test(main()) && !/how agencies receive VAT invoices/.test(html()));
    agyEnter('AG-03', true); const p = agyPurchases().find(x => x.status === 'Approved – awaiting payment' || x.stage === 'awaiting');
    if (p) { go('g-purchase', { id: p.ref || p.id }); ok('CH-05 approved bank-transfer purchase: VAT note', /VAT invoices are sent by the Academy by email\./.test(main())); }
  });

  /* ---------- CH-31 Academy contact details ---------- */
  await T('CH-31 configurable contact details', () => {
    fresh();
    const cf = ADMIN.config.find(c => c.name === 'Academy contact details');
    ok('CH-31 System Configuration setting with the agreed value', !!cf && cf.value === CONTACT && cf.group === 'Contact');
    ok('CH-31 existing configuration IDs unchanged', ADMIN.config.find(c => c.name === 'Password policy').id === 'CF-0' && ADMIN.config.find(c => c.name === 'Undo window').id === 'CF-20' && cf.id === 'CF-21');
    SA(); go('a-config'); ok('CH-31 shown and editable in System Configuration', main().includes(CONTACT) && !!app().querySelector(`[data-act="cfgEdit"][data-id="${cf.id}"]`));
    const pages = [];
    learner('C'); go('help'); pages.push(['learner help', html()]);
    agyEnter('AG-03', true); go('g-messages'); pages.push(['agency receive-only messages', html()]); go('g-help'); pages.push(['agency help', html()]);
    role('ver'); pages.push(['verification page', html()]);
    learner('C'); const l = STORE.wpc.links.find(x => x.kind === 'perm' && wState(x) === 'valid'); go('w-permission', { id: l.token }); pages.push(['workplace page', html()]);
    pages.forEach(([n, h]) => ok(`CH-31 ${n}: contact details shown, no placeholder`, h.includes('020 3983 0282') && h.includes('info@welfarehs.co.uk') && !/Academy contact email and phone/.test(h), n));
    learner('C'); go('help'); ok('CH-31 learner contact line has no old hours', !/Mon–Fri 09:00–17:00/.test(main()));
    ACT.policy({ dataset: { p: 'Contact' } }); ok('CH-31 Contact pop-up', !!MODAL && MODAL.body.includes('info@welfarehs.co.uk')); closeModal();
    cf.value = '020 0000 0000 · help@example.org'; learner('C'); go('help'); ok('CH-31 configurable: a new value shows everywhere', main().includes('help@example.org') && !main().includes('info@welfarehs.co.uk'));
    fresh();
  });

  /* ---------- Placeholder register ---------- */
  await T('CH register: 4 topics remain', () => {
    fresh();
    ok('Register: 4 topics, all "Client to supply"', TBD_TOPICS.length === 4 && TBD_TOPICS.every(t => t[0] === 'Client to supply'));
    ok('Register: T04, T06, T07, T08 remain', ['bank payment instructions', 'privacy notice URL', 'verification domain', 'Academy office address'].every(x => TBD_TOPICS.some(t => t[1] === x)));
    ok('Register: T01, T02, T03, T05 gone', !TBD_TOPICS.some(t => /VAT invoices|storage region|exchange-rate|contact email/.test(t[1])));
    ACT.scOpen(); go('tbd-register'); const t = main();
    ok('TBD register page: 4 topics, 0 Pending client', /Remaining — 4 topics/.test(t) && /0 Pending client · 4 Client to supply/.test(t));
    ok('TBD register page: resolved by the client change list', /Resolved by the client change list/.test(t) && ['T01', 'T02', 'T03', 'T05'].every(x => t.includes(x)) && ['CH-05', 'CH-03', 'CH-02', 'CH-31'].every(x => t.includes(x)));
    learner('C'); go('index'); const items = [...app().querySelectorAll('#main section.card:not(.idx-sec) .idx-list li')];
    ok('Learner index: 4 items pending client confirmation', items.length === 4, items.length);
    const seen = new Set(); [['C', 'help'], ['A', 'browse'], ['B', 'payments']].forEach(([v, r]) => { learner(v); go(r); app().querySelectorAll('.tbd').forEach(x => seen.add(x.textContent.trim())); });
    SA(); ['a-learners', 'a-courses', 'a-dataprotection'].forEach(r => { go(r); app().querySelectorAll('.tbd').forEach(x => seen.add(x.textContent.trim())); });
    ok('No "Pending client" tag left on sampled screens', ![...seen].some(x => /^Pending client/.test(x)), [...seen].join(' | '));
  });

  /* ---------- CH-24 already applied (no change) ---------- */
  await T('CH-24 unchanged', () => {
    fresh(); learner('C'); go('dashboard');
    ok('CH-24 "Needs attention" badge by the greeting, no separate card', !!app().querySelector('.hello .cs-status[data-s="attn"]') && ![...app().querySelectorAll('h2')].some(h => h.textContent.trim() === 'Needs attention'));
  });

  /* ---------- Records ---------- */
  await T('CH records (Batch 1)', async () => {
    fresh(); ACT.scOpen(); go('cd-log'); const secs = [...app().querySelectorAll('main section.card')];
    ok('Decisions Log: final decisions list still first', /Final decisions list \(binding\)/.test(secs[0].textContent));
    const ch = secs.find(s => /Client decisions — change list \(CH-01 … CH-31\)/.test(s.textContent)), rows = ch ? [...ch.querySelectorAll('tbody tr')] : [];
    const row = id => (rows.find(r => r.firstChild.textContent === id) || {}).textContent || '';
    ok('Decisions Log: a row for every CH ID', rows.length === 31 && rows.every((r, i) => r.firstChild.textContent === 'CH-' + String(i + 1).padStart(2, '0')), rows.length);
    ok('Decisions Log: sources S1–S6 listed', !!ch && ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].every(s => ch.textContent.includes(s)));
    ok('Decisions Log: CH-01, 02, 03, 05, 31 Applied (Batch 1), 13 Oct 2026', ['CH-01', 'CH-02', 'CH-03', 'CH-05', 'CH-31'].every(id => /Applied \(Batch 1\)13 Oct 2026/.test(row(id))));
    ok('Decisions Log: sources as in the change list', /S3→S4/.test(row('CH-01')) && /S3→S4\/S5/.test(row('CH-02')) && /S1→S2→S4/.test(row('CH-18')) && /S1\/S6/.test(row('CH-24')));
    ok('Decisions Log: later batches scheduled', /Scheduled \(Batch 6\)/.test(row('CH-06')) && /Scheduled \(Batch 2\)/.test(row('CH-07')) && /Scheduled \(Batch 2\/3\)/.test(row('CH-11')) && /Scheduled \(Batch 5\)/.test(row('CH-17')));
    ok('Decisions Log: earlier and confirmed items', /Confirmed: already built, no change/.test(row('CH-04')) && /Applied earlier \(C7, b8bce5b\)/.test(row('CH-24')) && /Confirmed: no change/.test(row('CH-30')));
    const pc = secs.find(s => s.querySelector('h2') && s.querySelector('h2').textContent === 'Pending client'), prow = pc ? [...pc.querySelectorAll('tbody tr')].map(r => r.textContent) : [];
    ok('Decisions Log: P-27 … P-30 Pending client', prow.length === 4 && ['P-27', 'P-28', 'P-29', 'P-30'].every((p, i) => prow[i].startsWith(p) && /Pending client/.test(prow[i])) && /Observation fee/.test(prow[0]) && /Mistyped country/.test(prow[1]) && /Data Correction/.test(prow[1]) && /Intake choice at sign-up/.test(prow[3]));
    const fu = secs.find(s => /Follow-up decisions \(P-05 – P-26\)/.test(s.textContent)), st = id => ([...fu.querySelectorAll('tbody tr')].find(tr => tr.firstChild.textContent === id) || {}).textContent || '';
    ok('Decisions Log: F1 Superseded (CH-01); F2, F3b, F8 Resolved; F3a Superseded', /Superseded \(CH-01\)/.test(st('F1')) && /Resolved \(CH-02\)/.test(st('F2')) && /Superseded \(CH-02\)/.test(st('F3a')) && /Resolved \(CH-03\)/.test(st('F3b')) && /Resolved \(CH-05\)/.test(st('F8')));
    ok('Decisions Log: 17 scenarios, #16 gone', /All 17 run end to end in the prototype\./.test(main()) && !CDL_SCEN.some(r => r[0] === '16'));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 1/.test(s.textContent));
    ok('UX Changelog: Batch 1 entry lists its CH IDs', !!ux && ['CH-01:', 'CH-02:', 'CH-03:', 'CH-05:', 'CH-31:'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    go('demo-scenarios'); ok('Demo Scenarios: "Seventeen", 17 sections, no #16', /Seventeen end-to-end walkthroughs/.test(main()) && app().querySelectorAll('main section[id^="sc-"]').length === 17 && !app().querySelector('#sc-16'));
    renderDemo(); AFTER.forEach(f => f()); const b = document.querySelector('#demo-root [data-act="scOpen"]'); ok('Demo panel: "Open the 17 Demo Scenarios"', !b || b.textContent === 'Open the 17 Demo Scenarios', b && b.textContent);
    learner('A'); go('index'); const ix = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Learner index: CH entries, each with a purpose line', !!ix && ix.querySelectorAll('li').length === 2 && [...ix.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && /Demo Scenarios — 17 walkthroughs/.test(main()));
    ix.querySelector('[data-m="chCheckout"]').click(); await wait(150); ok('Learner index: checkout entry opens the checkout with the Stripe line', !!MODAL && !!mroot().querySelector('.ch-stripe')); closeModal();
    SA(); go('a-index'); const ax = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Admin index: contact setting, country/region and data residency entries with purposes', !!ax && ax.querySelectorAll('li').length === 3 && [...ax.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && !/Priya Nair \(moved country/.test(main()));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
