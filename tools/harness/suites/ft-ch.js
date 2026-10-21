// Client decisions CH-01 … CH-31 — one block per batch.
// Batch 1: CH-01 country fixed, CH-02 GBP only, CH-03 data region, CH-05 VAT invoices, CH-31 contact details,
// the placeholder register (4 topics), CH-24 unchanged, and the CH records. … Batch 6: CH-06 VAT on agency bundles. Batch 7a: CH-32 – CH-36. Batch 7b: CH-37 – CH-41, CH-43. Batch 7c: CH-42, P-32, P-33. Gap fix: new NVQ programme.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const app = () => document.getElementById('app');
  const html = () => app().innerHTML;
  const mroot = () => document.getElementById('modal-root');
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const fresh = () => { closeModal(); S.ui = {}; S.edge = 'none'; S.frame = 'auto'; initStore(); };
  // N5a review (supersedes publishing without it): every new programme and new version records "Observation required" (Yes / No) first
  const obsDecide = (id, v = 'no') => { ACT.n5Settings({ dataset: { p: id } }); const r = document.querySelector(`#modal-root input[name="n5-req"][value="${v}"]`); if (r && MODAL) { r.checked = true; MODAL.actions.find(x => /primary/.test(x.cls || '')).fn(); } closeModal(); };
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

  /* ---------- CH-01 (1b) registration: UK / UAE pinned, country confirmed before the account is created ---------- */
  await T('CH-01 1b registration country confirmation', async () => {
    fresh(); ACT.regStart(); await wait(30);
    const opts = [...$('#rg-country').options].filter(o => o.value && !o.disabled).map(o => o.textContent);
    ok('1b UK and UAE are the first two options', opts[0] === 'United Kingdom' && opts[1] === 'United Arab Emirates', opts.slice(0, 3).join(' | '));
    const all = [...$('#rg-country').options]; ok('1b separated from the rest of the list', all[3] && all[3].disabled && /─/.test(all[3].textContent) && all.slice(4).every(o => !o.disabled));
    const vals = { '#rg-name': 'Nadia Okoro', '#rg-email': 'nadia.okoro@example.ng', '#rg-mob': '803 555 0199', '#rg-country': 'Nigeria', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x', '#rg-ref': '' };
    Object.entries(vals).forEach(([k, v]) => { $(k).value = v; }); $('#rg-dial').value = '+234'; $('#rg-terms').checked = true; $('#rg-priv').checked = true;
    const regs0 = (STORE.regs || []).length;
    SUBMIT.regSubmit();
    ok('1b confirmation names the chosen country', !!MODAL && MODAL.title === 'Confirm your country' && /You selected\s*Nigeria\. This can't be changed later\./.test(mroot().textContent), MODAL && mroot().textContent.trim().slice(0, 120));
    ok('1b Confirm and Go back offered', !!MODAL && MODAL.actions.map(a => a.label).join() === 'Go back,Confirm');
    ok('1b not registered before Confirm', (STORE.regs || []).length === regs0 && S.auth === 'register');
    [...mroot().querySelectorAll('button')].find(b => b.textContent.trim() === 'Go back').click(); await wait(60);
    ok('1b Go back returns to the form', !MODAL && S.auth === 'register' && !!$('#rg-country'));
    ok('1b Go back keeps everything entered', Object.entries(vals).every(([k, v]) => $(k).value === v) && $('#rg-dial').value === '+234' && $('#rg-terms').checked && $('#rg-priv').checked, Object.keys(vals).map(k => k + '=' + $(k).value).join(' '));
    ok('1b still not registered after Go back', (STORE.regs || []).length === regs0);
    SUBMIT.regSubmit(); [...mroot().querySelectorAll('button')].find(b => b.textContent.trim() === 'Confirm').click(); await wait(60);
    ok('1b Confirm completes registration (code step)', !MODAL && S.auth === 'regVerify' && (STORE.regs || []).length === regs0 + 1 && STORE.regs[STORE.regs.length - 1].email === 'nadia.okoro@example.ng');
    $$('.otp-i').forEach((b, i) => b.value = '123456'[i]); SUBMIT.regCode(); ACT.finishWelcome && ACT.finishWelcome();
    ok('1b the account keeps the confirmed country (data region UK)', W.me.country === 'Nigeria' && regionOf(W.me.country) === 'UK');
    ACT.resetDemo(); ACT.regStart(); ['#rg-name', '#rg-email'].forEach(k => { $(k).value = ''; }); SUBMIT.regSubmit();
    ok('1b form errors come first — no confirmation on an invalid form', !MODAL);
    ACT.resetDemo();
  });

  /* ---------- Defect fix (1b): Reset demo data after registering a new learner ---------- */
  await T('1b Reset demo data after registering a new learner', async () => {
    fresh(); const errs = []; const onErr = e => errs.push(e.message); window.addEventListener('error', onErr);
    const learners0 = allLearners().length, worlds0 = Object.keys(STORE.worlds).sort().join();
    ACT.regStart(); const vals = { '#rg-name': 'Reset Tester', '#rg-email': 'reset.tester@uk.example', '#rg-mob': '7700 955444', '#rg-country': 'United Kingdom', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x' };
    const fill = () => { Object.entries(vals).forEach(([k, v]) => { $(k).value = v; }); $('#rg-terms').checked = true; $('#rg-priv').checked = true; };
    fill(); SUBMIT.regSubmit(); MODAL.actions.find(a => a.label === 'Confirm').fn(); $$('.otp-i').forEach((b, i) => b.value = '123456'[i]); SUBMIT.regCode(); ACT.finishWelcome();
    ok('Reset fix: signed in as the new learner first', S.variant === 'G' && S.signedIn && W === STORE.worlds.G && allLearners().length === learners0 + 1);
    renderDemo(); const btn = document.querySelector('#demo-root [data-act="resetDemo"]');
    let threw = ''; try { if (btn) btn.click(); else ACT.resetDemo(); } catch (e) { threw = e.message; } await wait(80);
    ok('Reset fix: no error', !threw && !errs.length, threw || errs.join(' | '));
    ok('Reset fix: demo data restored (worlds rebuilt, new learner and registration gone)', Object.keys(STORE.worlds).sort().join() === worlds0 && !STORE.worlds.G && !allLearners().some(l => l.email === vals['#rg-email']) && allLearners().length === learners0 && !(STORE.regs || []).length, Object.keys(STORE.worlds).join());
    ok('Reset fix: lands on a valid screen (default learner dashboard)', S.variant === 'A' && W === STORE.worlds.A && S.route === 'dashboard' && S.signedIn && app().querySelectorAll('h1').length === 1 && !/Page not found|couldn't find this/i.test(main()), S.variant + ' ' + S.route);
    ACT.regStart(); fill(); SUBMIT.regSubmit(); ok('Reset fix: the same email can register again (not a duplicate)', !!MODAL && MODAL.title === 'Confirm your country'); closeModal();
    learner('H'); ACT.resetDemo(); ok('Reset fix: reset while on Priya Nair (world H) returns to her rebuilt world', S.variant === 'H' && W === STORE.worlds.H && app().querySelectorAll('h1').length === 1);
    window.removeEventListener('error', onErr); fresh();
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
  await T('CH register: 1 topic remains (CH-36)', () => {
    fresh();
    ok('Register: 2 topics, P-31 and P-34 Pending client (CH-36)', TBD_TOPICS.length === 2 && TBD_TOPICS.every(t => t[0] === 'Pending client') && /P-31/.test(TBD_TOPICS[0][1]) && /P-34/.test(TBD_TOPICS[1][1]));
    ok('Register: T04, T06, T07, T08 resolved (CH-32 – CH-35)', !['bank payment instructions', 'privacy notice URL', 'verification domain', 'Academy office address'].some(x => TBD_TOPICS.some(t => t[1] === x)));
    ok('Register: T01, T02, T03, T05 gone', !TBD_TOPICS.some(t => /VAT invoices|storage region|exchange-rate|contact email/.test(t[1])));
    ACT.scOpen(); go('tbd-register'); const t = main();
    ok('TBD register page: 2 topics, 2 Pending client (CH-36)', /Remaining — 2 topics/.test(t) && /2 Pending client · 0 Client to supply/.test(t));
    ok('TBD register page: resolved by the client change list', /Resolved by the client change list/.test(t) && ['T01', 'T02', 'T03', 'T05'].every(x => t.includes(x)) && ['CH-05', 'CH-03', 'CH-02', 'CH-31'].every(x => t.includes(x)));
    learner('C'); go('index'); const items = [...app().querySelectorAll('#main section.card:not(.idx-sec) .idx-list li')];
    ok('Learner index: 2 items pending client confirmation (CH-36)', items.length === 2, items.length);
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
    const ch = secs.find(s => /Client decisions — change list \(CH-01 … CH-43\)/.test(s.textContent)) /* CH-32 – CH-43 extend the list */, rows = ch ? [...ch.querySelectorAll('tbody tr')] : [];
    const row = id => (rows.find(r => r.firstChild.textContent === id) || {}).textContent || '';
    ok('Decisions Log: a row for every CH ID (CH-01 … CH-43)', rows.length === 43 && rows.every((r, i) => r.firstChild.textContent === 'CH-' + String(i + 1).padStart(2, '0')), rows.length);
    ok('Decisions Log: sources S1–S6 listed', !!ch && ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].every(s => ch.textContent.includes(s)));
    ok('Decisions Log: CH-01, 02, 03, 05, 31 Applied (Batch 1), 13 Oct 2026', ['CH-01', 'CH-02', 'CH-03', 'CH-05', 'CH-31'].every(id => /Applied \(Batch 1\)13 Oct 2026/.test(row(id))));
    ok('Decisions Log: sources as in the change list', /S3→S4/.test(row('CH-01')) && /S3→S4\/S5/.test(row('CH-02')) && /S1→S2→S4/.test(row('CH-18')) && /S1\/S6/.test(row('CH-24')));
    ok('Decisions Log: Batch 2 applied, CH-11 partly, later batches scheduled', ['CH-07', 'CH-08', 'CH-09', 'CH-10'].every(id => /Applied \(Batch 2\)13 Oct 2026/.test(row(id))) && /Applied \(Batch 2\/3\)13 Oct 2026/.test(row('CH-11')) && /Applied \(Batch 6\)13 Oct 2026/.test(row('CH-06')) && ['CH-12', 'CH-13', 'CH-14'].every(id => /Applied \(Batch 3\)13 Oct 2026/.test(row(id))) && /Applied \(Batch 5\)13 Oct 2026/.test(row('CH-17')));
    ok('Decisions Log: earlier and confirmed items', /Confirmed: already built, no change/.test(row('CH-04')) && /Applied earlier \(C7, b8bce5b\)/.test(row('CH-24')) && /Confirmed: no change/.test(row('CH-30')));
    const pc = secs.find(s => s.querySelector('h2') && s.querySelector('h2').textContent === 'Open client items'), prow = pc ? [...pc.querySelectorAll('tbody tr')].map(r => r.textContent) : [];
    const pst = id => prow.find(x => x.startsWith(id)) || '';
    ok('Decisions Log: open client items P-27 … P-35 with their status', prow.length === 9 && /Resolved by CH-38 \(built in 7b\)/.test(pst('P-27')) && /Resolved \(Data Correction fallback\)/.test(pst('P-28')) && /Resolved by CH-42 \(built in 7c\)/.test(pst('P-30')) && /Resolved/.test(pst('P-32')) && /does not lock/.test(pst('P-32')) && /Resolved/.test(pst('P-33')) && /can't be its assignment, PD or observation assessor/.test(pst('P-33')) && /Resolved/.test(pst('P-35')));
    ok('Decisions Log: still pending — P-31 and P-34 only', ['P-31', 'P-34'].every(p => /Pending client/.test(pst(p))) && prow.filter(x => /Pending client/.test(x)).length === 2 && /Still pending: P-31, P-34\./.test(pc.textContent));
    const fu = secs.find(s => /Follow-up decisions \(P-05 – P-26\)/.test(s.textContent)), st = id => ([...fu.querySelectorAll('tbody tr')].find(tr => tr.firstChild.textContent === id) || {}).textContent || '';
    ok('Decisions Log: F1 Superseded (CH-01); F2, F3b, F8 Resolved; F3a Superseded', /Superseded \(CH-01\)/.test(st('F1')) && /Resolved \(CH-02\)/.test(st('F2')) && /Superseded \(CH-02\)/.test(st('F3a')) && /Resolved \(CH-03\)/.test(st('F3b')) && /Resolved \(CH-05\)/.test(st('F8')));
    ok('Decisions Log: 30 scenarios (S4a: #29; R5: #30 added); #16 is the new sign-up', /All 30 run end to end in the prototype\./.test(main()) && CDL_SCEN.filter(r => r[0] === '16').length === 1 && CDL_SCEN.find(r => r[0] === '16')[1] === 'New sign-up: documents → offer letter → payment → start' && !CDL_SCEN.some(r => r[1] === 'Learner moves country'));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 1/.test(s.textContent));
    ok('UX Changelog: Batch 1 entry lists its CH IDs', !!ux && ['CH-01:', 'CH-02:', 'CH-03:', 'CH-05:', 'CH-31:'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    go('demo-scenarios'); ok('Demo Scenarios: "Thirty", 30 sections, #16 is the new sign-up (S4a; R5)', /Thirty end-to-end walkthroughs/.test(main()) && app().querySelectorAll('main section[id^="sc-"]').length === 30 && /New sign-up/.test((app().querySelector('#sc-16') || {}).textContent || ''));
    renderDemo(); AFTER.forEach(f => f()); const b = document.querySelector('#demo-root [data-act="scOpen"]'); ok('Demo panel: "Open the 30 Demo Scenarios" (S4a; R5)', !b || b.textContent === 'Open the 30 Demo Scenarios', b && b.textContent);
    learner('A'); go('index'); const ix = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Learner index: CH entries (incl. registration confirmation, 1b), each with a purpose line (S4a / R5: 30 walkthroughs)', !!ix && ix.querySelectorAll('li').length === 21 && !!ix.querySelector('[data-act="regStart"]') && [...ix.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && /Demo Scenarios — 30 walkthroughs/.test(main()));
    ix.querySelector('[data-m="chCheckout"]').click(); await wait(150); ok('Learner index: checkout entry opens the checkout with the Stripe line', !!MODAL && !!mroot().querySelector('.ch-stripe')); closeModal();
    SA(); go('a-index'); const ax = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Admin index: Batch 1–7c and new-programme entries with purposes', !!ax && ax.querySelectorAll('li').length === 29 && ['a-config', 'a-learner.IA-L-31900', 'a-dataprotection..residency', 'a-programmes.NV-L3.letter', 'a-admissions.APP-C', 'a-learner.IA-L-31188.admission'].every(t => ax.querySelector(`[data-t="${t}"]`)) && [...ax.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && !/Priya Nair \(moved country/.test(main()));
  });

  /* ================= Batch 2 ================= */
  const stepCur = () => { const c = app().querySelector('.ch-su .step.cur .s-l'); return c ? c.textContent : ''; };
  const btnAct = a => app().querySelector(`main [data-act="${a}"]`);

  /* ---------- CH-07 stepper: details + intake → documents ---------- */
  await T('CH-07 sign-up: order, intake, documents', async () => {
    fresh(); learner('B'); go('admission');
    ok('CH-07 applicant sees the 5-step sign-up, on step 2 Documents', app().querySelectorAll('.ch-su .step').length === 5 && stepCur() === 'Documents' && [...app().querySelectorAll('.ch-su .s-l')].map(x => x.textContent).join() === 'Personal details,Documents,Offer letter,Payment,Start');
    ok('CH-07 status "Sign-up in progress"; no admission-approval wording', W.admission.status === 'Sign-up in progress' && !/unlocks after admission is approved|deposit card is now visible|All your mandatory documents are approved/.test(html()));
    go('assignments'); ok('CH-10 content locked until the sign-up is done ("Finish your sign-up")', !!app().querySelector('main .lockpage') && /Finish your sign-up/.test(main()) && !/admission is approved/.test(main()));
    go('admission'); const cont = btnAct('suNext');
    ok('CH-07 Continue disabled while a mandatory document is missing, with its reason', !!cont && cont.disabled && /CV/.test(cont.title) && /CV/.test(main()), cont && cont.title);
    ok('CH-07 approval not required: rejected / resubmission documents count as uploaded', chMandMissing(W).map(d => d.id).join() === 'd6' && W.docs.some(d => d.status === 'Rejected'));
    ACT.sampleUpload({ dataset: { id: 'd6' } }); await wait(2000);
    ok('CH-07 every mandatory document uploaded → Continue enabled', !btnAct('suNext').disabled && /6 of 6 mandatory documents uploaded/.test(main()));
    ACT.suBack(); ok('CH-07 Back to step 1', stepCur() === 'Personal details');
    ok('CH-42 no intake choice: the nearest batch is assigned (online or UAE, not Leicester)', !app().querySelector('input[name="su-batch"]') && /Your batch: Abu Dhabi Cohort 1, starts/.test(main()) && !/Leicester/.test(app().querySelector('.ch-batch').textContent));
    ok('CH-42 "Need a different start date? Contact the Academy." with the contact details', /Need a different start date\? Contact the Academy/.test(main()) && /020 3983 0282/.test(main()) && /a deposit can hold your seat/.test(main()));
    ACT.suNext(); ok('CH-07 step 1 saved → step 2', stepCur() === 'Documents' && W.signup.batch === 'L3AC-DEC26-AUH');
    ACT.suNext(); ok('CH-07 → step 3 Offer letter', stepCur() === 'Offer letter');
  });

  /* ---------- CH-08 / CH-09 offer letter, signature, declaration ---------- */
  await T('CH-08 / CH-09 offer letter', async () => {
    const L = app().querySelector('main .ch-letter');
    ok('CH-08 letter filled with name and Student ID; watermark; signatory', !!L && L.textContent.includes('Priya Raman') && L.textContent.includes('IA-L-31188') && /Welfare Academy/.test(L.querySelector('.ch-wm').textContent) && /Jenson Thomas/.test(L.textContent) && !/\{\{/.test(L.textContent));
    ok('CH-08 no decline option', ![...app().querySelectorAll('main button')].some(b => /decline/i.test(b.textContent)));
    ok('CH-09 declaration text', main().includes(CH_DECL));
    const sign = () => $('#su-sign'), why = () => $('#su-why').textContent;
    ok('CH-09 "Sign and continue" disabled with its reason until both are done', sign().disabled && /Type your full name and tick the declaration/.test(sign().title) && !$('#su-why').hidden);
    $('#su-sig').value = 'P Raman'; INP.suSig($('#su-sig')); ok('CH-08 signature must be the full name', sign().disabled && /exactly as registered: Priya Raman/.test(why()));
    $('#su-sig').value = '  priya   raman '; INP.suSig($('#su-sig')); ok('CH-09 declaration still required', sign().disabled && /Tick the declaration/.test(why()));
    $('#su-decl').checked = true; INP.suDecl($('#su-decl')); ok('CH-09 both done → enabled, no reason', !sign().disabled && !sign().title && $('#su-why').hidden);
    const n0 = STORE.agy.lmails.length; ACT.suSign(); const s = W.signup.sig;
    ok('CH-08 signing record: name, date/time, mock IP, letter version', !!s && s.name === 'priya raman' && !!s.at && s.ip === '94.204.18.44' && s.v === 1, JSON.stringify(s));
    const lm = STORE.agy.lmails.slice(0, STORE.agy.lmails.length - n0);
    ok('CH-08 signed copy emailed to the learner and to the Academy (info@welfarehs.co.uk)', lm.some(m => !m.academy && m.email === 'priya.raman@gmail.example' && /signed offer letter/.test(m.subj)) && lm.some(m => m.academy && m.email === 'info@welfarehs.co.uk' && /Priya Raman/.test(m.subj)));
    ok('CH-08 signing audited', ADMIN.audit.some(a => a.action === 'Offer letter signed' && /IA-L-31188/.test(a.entity)));
    ok('CH-07 → step 4 Payment', stepCur() === 'Payment');
  });

  /* ---------- CH-10 payment (deposit case), CH-11 start ---------- */
  await T('CH-10 payment — deposit case, card', async () => {
    ok('CH-10 deposit offered (intake 28+ days away) and instalments; no pay in full', !!$('input[name="su-opt"][value="deposit"]') && !!$('input[name="su-opt"][value="instalment"]') && !/pay in full|full amount/i.test(main()));
    ok('CH-10 methods: card and bank transfer', !!$('input[name="su-m"][value="card"]') && !!$('input[name="su-m"][value="bank"]'));
    setUi('suMethod', 'bank'); render(); ok('CH-10 bank transfer: bank details (CH-35), reference, "Awaiting confirmation by Finance"', /Lloyds Bank · Sort code 30-90-89 · Account number 80060562/.test(main()) && !/Client to supply/.test(main()) && /IA-31188-DEP/.test(main()) && /Awaiting confirmation by Finance/.test(main()));
    setUi('suMethod', 'card'); render(); const b = chBatch('L3AC-DEC26-AUH'), e0 = b.enrolled;
    ACT.suPay(); ok('CH-02 card checkout shows the Stripe line', !!mroot().querySelector('.ch-stripe') && /£300\.00/.test(mroot().textContent));
    prim(); await wait(2500); closeModal();
    ok('CH-07 / CH-11 lands in the LMS straight away', S.route === 'dashboard' && W.signup.done && W.flags.admitted && W.enrolments.includes(W.nvq), S.route);
    ok('CH-10 deposit paid; seat held 28 days; balance due in the hold', W.admission.deposit.paid && daysTo(W.admission.deposit.holdUntil) >= 27 && W.plans.find(p => p.e === 'nvq').rows[0].amount === 2100 && b.enrolled === e0 + 1);
    ok('CH-07 review after payment: "Awaiting review", no reviewer decision yet', W.admission.status === 'Awaiting review' && allApplications().find(a => a.id === 'APP-B').status === 'Awaiting review');
    go('assignments'); ok('CH-10 content open once signed up (not tied to admission)', !app().querySelector('main .lockpage'));
    go('admission'); ok('CH-08 learner\'s Admission & Documents: sign-up summary with the signed PDF', /Sign-up/.test(main()) && !!btnAct('chSignedPdf'));
    btnAct('chSignedPdf').click(); await wait(80);
    ok('CH-08 signed PDF: letter, filled fields, signature block', !!MODAL && /Priya Raman/.test(mroot().textContent) && /IA-L-31188/.test(mroot().textContent) && /Signed electronically/.test(mroot().textContent) && /94\.204\.18\.44/.test(mroot().textContent) && /version 1/.test(mroot().textContent)); closeModal();
    SA(); go('a-admissions', { id: 'APP-B' }); ok('CH-08 admin application: signing record and signed PDF', /Sign-up/.test(main()) && /View signed PDF/.test(main()) && /94\.204\.18\.44/.test(main()));
    go('a-learner', { id: 'IA-L-31188', tab: 'admission' }); ok('CH-08 Learner 360 → Admission & Documents: signing record', /View signed PDF/.test(main()));
  });

  /* ---------- Inboxes ---------- */
  await T('CH-08 Academy inbox (demo)', async () => {
    ACT.switchRole({ dataset: { r: 'ainbox' } }); await wait(30);
    ok('Academy inbox page', S.route === 'm-inbox' && /Academy inbox \(demo\)/.test(main()) && /Offer letter signed — Priya Raman/.test(main()) && !/Your signed offer letter/.test(main()));
    ACT.switchRole({ dataset: { r: 'linbox' } }); await wait(30);
    ok('Learner inbox has the learner copy only', /Learner inbox \(demo\)/.test(main()) && /Your signed offer letter/.test(main()) && !/Offer letter signed — Priya Raman/.test(main()));
    renderDemo(); S.demoOpen = true; renderDemo(); ok('Demo controls: "Academy inbox (demo)"', !!document.querySelector('#demo-root [data-r="ainbox"]')); S.demoOpen = false;
    learner('A');
  });

  /* ---------- CH-10 instalment case + CH-11 bank transfer; intake fills up ---------- */
  await T('CH-10 / CH-11 under 28 days, bank transfer', async () => {
    fresh(); ACT.chScInstalment(); const b = chBatch('L3AC-OCT26-ONL');
    ok('CH-10 intake under 28 days: deposit hidden, with the reason', stepCur() === 'Payment' && !$('input[name="su-opt"][value="deposit"]') && /No deposit for this intake/.test(main()) && new RegExp('starts in ' + daysTo(b.start) + ' days').test(main()));
    ACT.suPay();
    ok('CH-11 bank transfer: starts straight away', S.route === 'dashboard' && W.signup.done && W.flags.admitted && !MODAL);
    const r1 = W.plans.find(p => p.e === 'nvq').rows[0];
    ok('CH-11 first instalment "Awaiting confirmation by Finance"', r1.status === 'Awaiting confirmation by Finance' && r1.amount === 400 && W.plans.find(p => p.e === 'nvq').rows.length === 6);
    go('payments'); ok('CH-11 Payments shows the awaiting status', /Awaiting confirmation by Finance/.test(main()));
    ok('CH-11 bank sign-up recorded for Finance (Batch 3)', (STORE.chBank || []).some(x => x.lid === 'IA-L-31188' && x.status === 'Awaiting confirmation'));
    fresh(); ACT.chStep({ dataset: { s: '4' } }); ACT.chIntakeFills(); go('admission');
    ok('CH-42 batch fills before payment → next nearest assigned, learner told (was: choose another)', W.signup.batch === 'L3AC-FEB27-AUH' && /Your batch has changed/.test(main()) && /Abu Dhabi Cohort 2/.test(main()) && !!app().querySelector('[data-act="suPay"]') && W.notifs.some(n => /Your batch has changed/.test(n.title)));
    ok('CH-42 documents and signature kept', stepCur() === 'Payment' && !!W.signup.sig && !chMandMissing(W).length);
  });

  /* ---------- F4 agency-sponsored ---------- */
  await T('F4 sponsored sign-up: no payment step', async () => {
    fresh(); ACT.chSponsoredSignup();
    ok('F4 4 steps, no Payment', [...app().querySelectorAll('.ch-su .s-l')].map(x => x.textContent).join() === 'Personal details,Documents,Offer letter,Start' && stepCur() === 'Offer letter');
    $('#su-sig').value = 'Grace Mensah'; INP.suSig($('#su-sig')); $('#su-decl').checked = true; INP.suDecl($('#su-decl')); ACT.suSign();
    ok('F4 after signing → Start (no payment)', stepCur() === 'Start' && !app().querySelector('input[name="su-opt"]') && /nothing to pay/.test(main()));
    ACT.suStart(); ok('F4 starts with no payment, deposit or fee schedule', W.signup.done && W.flags.admitted && !W.signup.pay && !W.plans.some(p => p.e === 'nvq'));
  });

  /* ---------- CH-08 admin: Offer letter tab ---------- */
  await T('CH-08 NVQ course editor — Offer letter tab', async () => {
    fresh(); SA(); go('a-programmes', { id: 'NV-L3', tab: 'letter' });
    // CB1 (PD-CB-01) supersedes: was an "Offer letter" tab next to "Hierarchy builder"; now the old "letter" link opens Documents &
    // Contract → Offer letter, with Curriculum (the hierarchy builder) one of the seven sections
    ok('CH-08 "Offer letter" panel of Offer Letter & Documents (CB3 name), next to the other sections', !!app().querySelector('.cb-sec.cur[data-tab="documents"]') && !!app().querySelector('.cb-panels .tab[data-tab="letter"][aria-selected="true"]') && !!app().querySelector('.cb-sec[data-tab="curriculum"]'));
    ok('CH-08 tab: merge fields, current version, template', /\{\{full_name\}\}/.test(main()) && /\{\{student_id\}\}/.test(main()) && /Version 1/.test(main()) && !!app().querySelector('main .ch-letter'));
    ok('CH-08 a letter for every NVQ course (retired one excepted)', ['NV-L2', 'NV-L3', 'NV-L4', 'NV-L5'].every(id => chLetters(id).length === 1) && !chLetters('NV-L3O').length);
    btnAct('chLetterPrev').click(); await wait(60); ok('CH-08 preview filled with a sample learner', !!MODAL && /Aisha Rahman/.test(mroot().textContent) && /IA-L-18022/.test(mroot().textContent)); closeModal();
    ACT.chLetterUp({ dataset: { id: 'NV-L3' } }); $('#rsn').value = 'New fees paragraph'; ok('CH-08 upload needs a file', prim() === false && !!MODAL);
    ACT.chLetterSample(); prim(); ok('CH-08 new version 2, audited', chLetterCur('NV-L3').v === 2 && ADMIN.audit.some(a => a.action === 'Offer letter uploaded' && a.after === 'Version 2'));
    learner('B'); ok('CH-08 an applicant who already started keeps version 1', chLetterFor(W).v === 1);
    STORE.worlds.B = makeWorld('B'); setVariant('B'); ok('CH-08 a new applicant gets version 2', chLetterFor(W).v === 2);
    S.portal = 'admin'; role('acaA'); go('a-programmes', { id: 'NV-L2', tab: 'letter' }); ok('CH-08 Academic Admin has the tab', /Offer letter/.test(main()) && !!btnAct('chLetterUp'));
    fresh();
  });

  /* ---------- CH-07 approval confirms the intake; placement and waitlist removed ---------- */
  await T('CH-07 approval confirms the intake; no placement or waitlist', async () => {
    fresh(); chQuickSignup(STORE.worlds.B); SA(); ACT.appApprove({ dataset: { id: 'APP-B' } });
    ok('CH-07 approve dialog shows the intake chosen at sign-up; no placement select', !!MODAL && !$('#ab') && /Abu Dhabi Cohort 1 — L3AC-DEC26-AUH/.test(MODAL.body) && /assigned at sign-up/.test(MODAL.body) /* CH-42: was "chosen at sign-up" */); closeModal();
    ok('CH-07 waitlist edge, Accept next intake and Place removed', !EDGES.some(e => e[0] === 'waitlist') && !ACT.acceptIntake && !ACT.stayWaitlist && !ACT.kPlace && !ACT.payDeposit);
    role('acaA'); go('k-dashboard'); ok('CH-07 Academic Admin dashboard: no "awaiting batch placement"', !/awaiting batch placement/i.test(main()));
    S.edge = 'underreview'; learner('B'); go('admission'); ok('Demo state "under review" comes after a completed sign-up', W.signup.done && W.admission.status === 'Under Review' && /Signed up/.test(main()) && !app().querySelector('.ch-su')); S.edge = 'none';
    fresh();
  });

  /* ---------- Records (Batch 2) ---------- */
  await T('CH records (Batch 2)', async () => {
    fresh(); ACT.scOpen(); go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 2/.test(s.textContent));
    ok('UX Changelog: Batch 2 entry lists its CH IDs', !!ux && ['CH-07:', 'CH-08:', 'CH-09:', 'CH-10:', 'CH-11'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    const L = SC_LIST(), s16 = L.find(x => x[0] === '16'), s2 = L.find(x => x[0] === '2');
    ok('Scenario #16 replaced: "New sign-up: documents → offer letter → payment → start" with deposit, instalment and bank-transfer steps', !!s16 && s16[1] === 'New sign-up: documents → offer letter → payment → start' && s16[3].some(s => /deposit/.test(s.text)) && s16[3].some(s => /bank transfer/.test(s.text)) && s16[3].some(s => /Awaiting confirmation by Finance/.test(s.text)));
    ok('Scenario #2 in the new order (sign-up and deposit → review → balance)', /finishes her sign-up/.test(s2[3][0].text) && /approves admission/.test(s2[3][1].text) && /balance/.test(s2[3][2].text));
    learner('A'); go('index'); const ix = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Screen index: sign-up steps, signed PDF and Academy inbox, each with a purpose', ['chStep', 'chScInstalment', 'chSponsoredSignup', 'chSignedPdf'].every(a => ix.querySelector(`[data-act="${a}"]`)) && !!ix.querySelector('[data-r="ainbox"]') && [...ix.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')));
    ix.querySelector('[data-act="chStep"][data-s="3"]').click(); await wait(60); ok('Screen index: step 3 entry opens the offer letter step', S.route === 'admission' && stepCur() === 'Offer letter');
  });

  /* ================= Batch 3 ================= */
  // press the dialog's main button (primary or danger) as a click would, closing it unless validation keeps it open
  const act = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const lastAudit = () => ADMIN.audit[0] || {};

  /* ---------- CH-12 / CH-13 rejected after payment ---------- */
  await T('CH-12 / CH-13 rejected after payment', async () => {
    fresh(); ACT.chSc19Start(); ok('#19 start: Priya Raman paid and learning', W.signup.done && W.flags.admitted && chPaidTowards(W) === 300);
    const fin0 = STORE.fin.notifs.length, aca0 = STORE.aca.notifs.length, q0 = ADMIN.queue.filter(x => x.type === 'Refund').length;
    role('acaA'); go('a-admissions', { id: 'APP-B' }); ACT.appReject({ dataset: { id: 'APP-B' } }); $('#rsn').value = 'Entry requirement not met'; act();
    const w = STORE.worlds.B;
    ok('CH-12 rejected; access stays as it is', w.admission.status === 'Rejected' && w.flags.admitted && w.enrolments.includes(w.nvq));
    ok('CH-13 no automatic refund', ADMIN.queue.filter(x => x.type === 'Refund').length === q0);
    const fn = STORE.fin.notifs.slice(0, STORE.fin.notifs.length - fin0).find(n => n.t === 'Admission rejected after payment'), an = STORE.aca.notifs.slice(0, STORE.aca.notifs.length - aca0).find(n => n.t === 'Admission rejected after payment');
    ok('CH-12 Finance Admins notified: learner, course, £ paid, link to the learner', !!fn && fn.to === 'all' && fn.b === 'Priya Raman, Level 3 Diploma in Adult Care (England), £300.00 paid' && fn.go === 'f-learner.IA-L-31188', fn && fn.b);
    ok('CH-12 Academic Admins notified, linking to the learner', !!an && an.b === fn.b && an.go === 'a-learner.IA-L-31188');
    go('a-admissions', { id: 'APP-B' }); ok('CH-13 rejected application: "Refund is a Finance decision" — no Raise refund for the Academic Admin', /Refund is a Finance decision \(raise a refund if appropriate\)\./.test(main()) && !btnAct('chRaiseRefund') && /Finance Admins have been notified/.test(main()));
    learner('B'); go('assignments'); ok('CH-12 learner still opens programme content', !app().querySelector('main .lockpage'));
    FA(); go('f-learner', { id: 'IA-L-31188' }); ok('CH-13 Finance learner record: hint with Raise refund', /Refund is a Finance decision/.test(main()) && !!btnAct('chRaiseRefund'));
    btnAct('chRaiseRefund').click(); await wait(60); ok('CH-13 Raise refund opens the existing refund flow, pre-filled', !!MODAL && /refund/i.test(MODAL.title) && /Will be sent to/.test(mroot().textContent) && /Admission rejected after payment/.test(mroot().innerHTML)); closeModal();
  });

  /* ---------- CH-14 manual Pause access ---------- */
  await T('CH-14 manual Pause access', async () => {
    fresh(); FA(); go('f-learner', { id: 'IA-L-18022' });
    const card = app().querySelector('.ch-access'); ok('CH-14 Finance learner record: Access by enrolment with Pause access', !!card && !!card.querySelector('[data-act="chPause"][data-e="nvq"]'));
    card.querySelector('[data-act="chPause"][data-e="nvq"]').click(); await wait(40); ok('CH-14 reason is mandatory', act() === false && !!MODAL);
    $('#rsn').value = 'Card payment disputed with the bank'; act(); const p = chPaused('IA-L-18022', 'nvq');
    ok('CH-14 paused, audited', !!p && p.reason === 'Card payment disputed with the bank' && lastAudit().action === 'Access paused (manual)' && lastAudit().reason === 'Card payment disputed with the bank');
    ok('CH-14 shown as paused with the reason for staff', /Access paused \(manual\)/.test(main()) && /Card payment disputed/.test(main()) && !!app().querySelector('.ch-access [data-act="chRestore"][data-e="nvq"]'));
    const n = STORE.worlds.C.notifs[0]; ok('CH-14 learner notified, without the reason', n.title === 'Access paused' && !/disputed/.test(n.body));
    learner('C'); go('dashboard'); ok('CH-14 learner sees the paused banner, without the reason', /Access paused\./.test(main()) && /Level 3 Diploma/.test(main()) && !/disputed/.test(html()));
    go('assignments'); ok('CH-14 the paused enrolment\'s content is locked', !!app().querySelector('main .lockpage') && /Access paused/.test(main()));
    const sc = W.enrolments.find(e => e.kind === 'short' && e.status === 'Active'); if (sc) { go('course', { id: sc.id }); ok('CH-14 other enrolments stay open', !app().querySelector('main .lockpage')); }
    ok('CH-14 separate from the automatic pause', !W.accessPaused);
    STORE.worlds.C.accessPaused = true; FA(); go('f-learner', { id: 'IA-L-18022' }); app().querySelector('.ch-access [data-act="chRestore"][data-e="nvq"]').click(); await wait(40); $('#rsn').value = 'Bank confirmed the payment'; act();
    ok('CH-14 Restore access (with a reason) lifts the manual pause only', !chPaused('IA-L-18022', 'nvq') && STORE.worlds.C.accessPaused === true && lastAudit().action === 'Access restored (manual pause lifted)');
    ok('CH-14 learner notified of the restore', STORE.worlds.C.notifs[0].title === 'Access restored');
    STORE.worlds.C.accessPaused = false;
    SA(); go('a-learner', { id: 'IA-L-18022', tab: 'enrolments' }); ok('CH-14 Learner 360 → Enrolments: Pause access on each row (Super Admin)', app().querySelectorAll('main [data-act="chPause"]').length === STORE.worlds.C.enrolments.length);
    role('sysA'); go('f-learner', { id: 'IA-L-31900' }); ok('CH-14 System Admin can pause (Finance learner record)', !!app().querySelector('.ch-access [data-act="chPause"]'));
    role('acaA'); go('a-learner', { id: 'IA-L-18022', tab: 'enrolments' }); ok('CH-14 Academic Admin has no Pause access', !app().querySelector('main [data-act="chPause"]'));
    const a0 = ADMIN.audit.length; ACT.chPause({ dataset: { l: 'IA-L-18022', e: 'nvq' } }); ok('CH-14 direct call by a non-allowed role is refused and logged', !MODAL && !chPaused('IA-L-18022', 'nvq') && ADMIN.audit.length === a0 + 1 && /^Blocked: Pause access/.test(lastAudit().action));
  });

  /* ---------- CH-11 Finance: bank transfers awaiting confirmation ---------- */
  await T('CH-11 bank transfers to confirm', async () => {
    fresh(); ACT.chScInstalment(); ACT.suPay();
    ok('CH-11 Finance told of the new bank transfer', STORE.fin.notifs[0].t === 'Bank transfer awaiting confirmation' && /IA-31188-INS1/.test(STORE.fin.notifs[0].b));
    FA(); go('f-exceptions', { tab: 'bank' }); const rows = [...app().querySelectorAll('main tbody tr')];
    ok('CH-11 tab "Bank transfers to confirm" lists sign-ups "Awaiting confirmation"', /Bank transfers to confirm/.test(main()) && rows.length === 2 && rows.every(r => /Awaiting confirmation/.test(r.textContent)) && rows.some(r => /Kavya Iyer/.test(r.textContent)) && rows.some(r => /Priya Raman/.test(r.textContent)));
    ok('CH-11 each row: Record offline payment and Pause access', rows.every(r => r.querySelector('[data-act="finOffline"]') && r.querySelector('[data-act="chPause"]')));
    const pr = rows.find(r => /Priya Raman/.test(r.textContent)); pr.querySelector('[data-act="finOffline"]').click(); await wait(60);
    ok('CH-11 Record offline payment is pre-selected on her first instalment', $('#op-t').value === 'B|nvq|1' && +$('#op-a').value === 400);
    $('#rsn').value = 'Bank statement 12 Oct'; act(); const w = STORE.worlds.B;
    ok('CH-11 recording clears "Awaiting confirmation"', STORE.chBank.find(x => x.v === 'B').status === 'Confirmed' && w.signup.pay.status === 'Paid' && w.plans.find(p => p.e === 'nvq').rows[0].status === 'Paid');
    go('f-exceptions', { tab: 'bank' }); const kr = [...app().querySelectorAll('main tbody tr')].find(r => /Kavya Iyer/.test(r.textContent)); kr.querySelector('[data-act="chPause"]').click(); await wait(40); $('#rsn').value = 'Transfer never arrived'; act();
    ok('CH-11 / CH-14 Pause access from the same row', !!chPaused('IA-L-31900', 'Level 2 Diploma in Care (England)') && /Access paused/.test([...app().querySelectorAll('main tbody tr')].find(r => /Kavya Iyer/.test(r.textContent)).textContent));
    go('f-exceptions', { tab: 'bank' }); [...app().querySelectorAll('main tbody tr')].find(r => /Kavya Iyer/.test(r.textContent)).querySelector('[data-act="finOffline"]').click(); await wait(60); $('#rsn').value = 'Arrived late'; act();
    ok('CH-11 mock sign-up confirmed and in the ledger', STORE.chBank.find(x => x.lid === 'IA-L-31900').status === 'Confirmed' && STORE.fin.tx[0].payer === 'Kavya Iyer' && STORE.fin.tx[0].amount === 300);
  });

  /* ---------- Records (Batch 3) ---------- */
  await T('CH records (Batch 3)', async () => {
    fresh(); const s19 = SC_LIST().find(x => x[0] === '19');
    ok('Scenario #19 "Rejected after payment": pays → rejected → notified → paused → refund decision', !!s19 && s19[1] === 'Rejected after payment' && s19[3].length === 5 && /rejects/.test(s19[3][1].text) && /pauses/.test(s19[3][3].text) && /refund/.test(s19[3][4].text));
    ACT.scOpen(); go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 3/.test(s.textContent));
    ok('UX Changelog: Batch 3 entry lists its CH IDs', !!ux && ['CH-11:', 'CH-12:', 'CH-13:', 'CH-14:'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    go('cd-log'); ok('Decisions Log: CH-10 note (P-32: content doesn\'t lock; read-only; sign up again)', /Seat released \(deposit paid, balance unpaid after the 28-day hold\): the learner leaves the batch and the seat is freed; the deposit is kept; materials and past work stay read-only/.test(main()) && !/programme content locks/.test(main()));
    SA(); go('a-index'); ok('Admin index: Pause access, bank transfers and rejected-after-payment entries', ['a-learner.IA-L-18022.enrolments', 'f-learner.IA-L-31900', 'f-exceptions..bank'].every(t => app().querySelector(`[data-t="${t}"]`)) && !!app().querySelector('[data-act="chSc19Start"]'));
  });

  /* ================= Batch 4 ================= */
  const take = (eid, mid, pass) => { W.quiz = { e: eid, m: mid, ans: Object.fromEntries(QUIZ_BANK.map((q, i) => [i, pass ? q[2] : (q[2] + 1) % q[1].length])), cur: 0, ends: Date.now() + 6e5, mode: 'one', conn: true }; finishQuiz(false); const r = W.quiz.result; W.quiz = null; return r; };

  /* ---------- CH-16 data and learner screens ---------- */
  await T('CH-16 modules with their own quizzes', async () => {
    fresh(); learner('A'); const sh = W.enrolments.filter(e => e.kind === 'short');
    ok('CH-16 every short course has 2–4 modules, each with its own quiz; no course quiz', sh.every(e => e.modules.length >= 2 && e.modules.length <= 4 && e.modules.every(m => m.quiz && m.quiz.pass && m.quiz.limit && m.quiz.max) && !('quiz' in e)), sh.map(e => e.id + ':' + e.modules.length).join());
    ok('CH-16 module content is the course content (IDs kept)', sh.every(e => e.modules.flatMap(m => m.items).sort().join() === e.content.map(c => c.id).sort().join()));
    ok('CH-16 completed courses have every module quiz passed', sh.filter(e => e.status === 'Completed').every(e => e.modules.every(shPassed)));
    ok('CH-16 earlier attempts moved to Module 1 (bls: Module 1 exhausted)', shModState(W.enrolments.find(e => e.id === 'bls').modules[0]) === 'Attempts exhausted');
    ok('CH-16 completion rule wording', sh.every(e => !e.reqs.some(([r]) => /Pass the quiz|standard quiz/.test(r))) && sh.filter(e => e.reqs.length).every(e => e.reqs.some(([r]) => r === 'Pass every module quiz with 80% or more')));
    go('course', { id: 'mh26', tab: 'content' }); const mods = app().querySelectorAll('main .sh-mod');
    ok('CH-16 Content tab: modules listed with their progress and their quiz', mods.length === 3 && [...mods].every(m => m.querySelector('[role="progressbar"]') && /What is this module about\?/.test(m.textContent) && m.querySelector('[data-act="shModPick"]')));
    go('course', { id: 'mh26', tab: 'quiz' }); const h2 = [...app().querySelectorAll('main h2')].map(h => h.textContent.trim());
    ok('CH-16 / CH-28 Quiz tab: module quizzes; heading "What is this module about?" with the instructions line', h2.includes('Module quizzes') && h2.includes('What is this module about?') && /Module 1 of 3 · The law and your responsibilities/.test(main()) && /The timer starts when you begin and can't be paused/.test(main()) && ['Questions', 'Time limit', 'Pass mark', 'Attempts used'].every(k => main().includes(k)) && !/Course quiz|final quiz/i.test(main().replace('there is no final course quiz', '')));
    go('dashboard'); const tasks = app().querySelector('.cs-card[data-cs="tasks"]'), n = W.enrolments.filter(e => e.status === 'Active').reduce((a, e) => a + (e.modules || []).filter(m => !shPassed(m) && m.quiz.max > m.quiz.attempts.length).length, 0);
    ok('CH-26 Tasks counts module quizzes to complete', !!tasks && tasks.textContent.includes(`${n} module quizzes to complete`), tasks && tasks.textContent);
  });

  /* ---------- Scenario #20 flow: per-module attempts, request, grant, completion, one certificate ---------- */
  await T('CH-16 module quizzes end to end (#20)', async () => {
    fresh(); ACT.chSc20Start(); const e = W.enrolments.find(x => x.id === 'mh26'), [m1, m2, m3] = e.modules, certs0 = W.certs.length;
    ok('#20 start: content done, three module quizzes to pass', e.content.every(c => c.state === 'Completed') && e.modules.length === 3 && !e.modules.some(shPassed));
    ok('#20 Module 1 passed', take('mh26', 'm1', true).result === 'Pass' && shPassed(m1) && e.status === 'Active');
    [1, 2, 3].forEach(() => take('mh26', 'm2', false));
    ok('#20 Module 2: attempts exhausted for that module only', shModState(m2) === 'Attempts exhausted' && shModState(m3) === 'Not started');
    setUi('shMod-mh26', 'm2'); go('course', { id: 'mh26', tab: 'quiz' }); ok('#20 exhausted card for Module 2 with Request more attempts', /All 3 attempts used for this module/.test(main()) && !!app().querySelector('[data-act="reqAttempts"][data-m="m2"]'));
    go('requests'); ok('#20 My Requests offers the request for the module', !!app().querySelector('[data-act="reqAttempts"][data-m="m2"]') && /Moving and Handling People — 2026, Hoists, slings and repositioning/.test(main()));
    ACT.reqAttempts({ dataset: { id: 'mh26', m: 'm2' } }); $('#rq-reason').value = 'Missed the pass mark on the hoist questions.'; prim(); const r = W.requests[0];
    ok('#20 request is for the Module 2 quiz', r.type === 'Extra quiz attempts' && r.mid === 'm2' && r.module === 'Hoists, slings and repositioning');
    go('requests'); ok('#20 My Requests shows the module', /Moving and Handling People — 2026 — Hoists, slings and repositioning/.test(main()));
    const qid = 'AQ-' + r.id, it = qItem(qid); ok('#20 Approvals Queue item names the module; first approver Academic Admin', !!it && /Hoists, slings and repositioning/.test(it.related[0]) && it.first === 'Rachel Hughes');
    role('acaA'); go('a-queue', { id: qid }); ok('#20 queue detail shows the module quiz', /Module 2: Hoists, slings and repositioning/.test(main()));
    ACT.qDo({ dataset: { id: qid, a: 'grant' } }); $('#rsn').value = 'Granted'; prim(); closeModal();
    learner('A'); const e2 = W.enrolments.find(x => x.id === 'mh26'), m2b = e2.modules[1];
    ok('#20 granted: Module 2 attempts available again', r.status === 'Granted' && m2b.quiz.max > m2b.quiz.attempts.length);
    ok('#20 Module 2 passed; course not complete until Module 3', take('mh26', 'm2', true).result === 'Pass' && e2.status === 'Active');
    take('mh26', 'm3', true);
    ok('#20 every module quiz passed → Completed, one certificate issued', e2.status === 'Completed' && e2.progress === 100 && W.certs.length === certs0 + 1 && W.certs[0].enrol === 'mh26' && W.certs[0].status === 'Valid');
    go('certificates'); ok('#20 certificate listed', /Moving and Handling People/.test(main()) && main().includes(W.certs[0].no));
  });

  /* ---------- CH-16 admin: Modules tab ---------- */
  await T('CH-16 short-course editor — Modules tab', async () => {
    fresh(); SA(); go('a-courses', { id: 'SC-01', tab: 'modules' }); const tabs = [...app().querySelectorAll('.subtabs [data-tab], .subtabs button')].map(b => b.textContent.trim());
    ok('CH-16 "Modules" tab; no "Quiz" tab', tabs.includes('Modules') && !tabs.includes('Quiz'), tabs.join());
    ok('CH-16 Modules tab: each module with content and its own quiz settings', app().querySelectorAll('.ch-cmod').length === 3 && /Module quiz — "What is this module about\?"/.test(main()) && !!$('#mq-m1-pass') && !/one quiz per course/i.test(main()));
    ACT.chModAdd({ dataset: { c: 'SC-01' } }); $('#rsn').value = 'Hoist maintenance checks'; prim(); closeModal(); ok('CH-16 add module', chCourseMods(ADMIN.courses[0]).length === 4 && /Hoist maintenance checks/.test(main()));
    ACT.chModMove({ dataset: { c: 'SC-01', m: 'm4', d: '-1' } }); ok('CH-16 reorder', chCourseMods(ADMIN.courses[0])[2].id === 'm4');
    ACT.chModRetire({ dataset: { c: 'SC-01', m: 'm4' } }); $('#rsn').value = 'Merged into Module 3'; prim(); closeModal(); ok('CH-16 retire (kept, not deleted)', chCourseMods(ADMIN.courses[0]).find(m => m.id === 'm4').status === 'Retired' && chCourseMods(ADMIN.courses[0]).length === 4);
    const box = app().querySelector('[data-onchange="chModItem"][data-m="m1"][data-i="c2"]'); box.checked = true; INP.chModItem(box); ok('CH-16 assign content to a module', chCourseMods(ADMIN.courses[0]).find(m => m.id === 'm1').items.includes('c2') && !chCourseMods(ADMIN.courses[0]).find(m => m.id === 'm2').items.includes('c2'));
    const pm = $('#mq-m2-pass'); pm.value = '85'; INP.chModQuiz(pm); ok('CH-16 configure a module quiz (pass mark)', chCourseMods(ADMIN.courses[0]).find(m => m.id === 'm2').quiz.pass === 85);
    go('a-courses', { id: 'SC-01', tab: 'completion' }); ok('CH-16 completion rule: every module quiz passed', /Every module quiz passed/.test(main()) && !/Quiz passed \(/.test(main()));
    go('a-programmes', { id: 'NV-L3', tab: 'tree' }); ok('CH-16 NVQ programmes get no module quizzes', !/module quiz/i.test(main()) && !app().querySelector('[data-act="chModAdd"]'));
  });

  /* ---------- CH-18 answer keys, CH-15 module codes ---------- */
  await T('CH-18 answer keys / CH-15 module codes', async () => {
    fresh(); learner('C'); go('resources'); const keys = W.resources.flatMap(g => g.items.filter(i => i.kind === 'key').map(i => [g.unit, i]));
    ok('CH-18 answer keys in Resources under their module', keys.length === 3 && keys.some(([u, i]) => /^U302/.test(u) && i.title === 'AC M12 Ways of Working in Adult Care — Knowledge Answer Key') && keys.every(([, i]) => i.dl));
    ok('CH-18 shown with Download', /AC M12 Ways of Working in Adult Care — Knowledge Answer Key/.test(main()) && !!app().querySelector('[data-f="AC M12 Ways of Working in Adult Care — Knowledge Answer Key"]'));
    $('#rt').value = 'key'; INP.resT($('#rt')); ok('CH-18 "Answer keys" type filter', app().querySelectorAll('main .li').length >= 3 && !/Class recording/.test(main()));
    INP.resT({ value: '' });
    ok('CH-15 Resources: module title and code by each module group', /Recognising and responding to abuse \(L\/652\/0601\)/.test(main()) && /Duty of care and dilemmas \(J\/652\/0501\)/.test(main()));
    go('assignment', { id: 'a2' }); const kb = app().querySelector('[data-act="chAnsDl"]');
    ok('CH-18 assignment page: "Answer key (guidance)" next to "Download criteria (PDF)"', !!kb && /Answer key \(guidance\)/.test(kb.textContent) && kb.previousElementSibling && kb.previousElementSibling.dataset.act === 'csCritPdf');
    kb.click(); await wait(40); ok('CH-18 downloads the module\'s answer key', /AC M12 Ways of Working in Adult Care — Knowledge Answer Key\.pdf downloaded/.test(document.querySelector('#toasts').textContent));
    ok('CH-18 submitting unchanged: per-criterion answer boxes, no upload template, no references box', !/upload[^.]*template|referenc/i.test([...app().querySelectorAll('main label, main legend, main h2, main h3')].map(l => l.textContent).join(' ')) && app().querySelectorAll('main .q').length === asgById('a2').qs.length);
    ok('CH-15 assignment header shows the module and its code', /U302 · Module 1 — AC M12 Ways of working in adult care \(T\/652\/0001\)/.test(main()));
    go('assignment', { id: 'a6' }); ok('CH-18 no answer key button when the module has none', !app().querySelector('[data-act="chAnsDl"]'));
    go('progress'); ok('CH-15 progress tree: module codes', /AC M12 Ways of working in adult care \(T\/652\/0001\)/.test(main()) && /Safe working \(R\/652\/0701\)/.test(main()));
    // CB4 correction (PD-CB-33) supersedes CH-15 corrections on the published version that were copied into learners' records: the code
    // is corrected in a draft version only; the published version and Aisha's record keep their code. Answer keys stay on the published version (CH-18).
    role('acaA'); go('a-programmes', { id: 'NV-L3', tab: 'tree' });
    ok('CH-15 published Level 3: codes shown read-only (no correction field); CH-18 answer key per module', app().querySelectorAll('[data-onchange="chModCode"]').length === 0 && app().querySelectorAll('[data-act="chAnsUp"]').length === 9 && /R\/652\/0701/.test(main()) && /AC M12 Ways of Working/.test(main()));
    ACT.newProgVersion({ dataset: { id: 'NV-L3' } }); document.querySelector('#rsn').value = 'Code correction'; prim(); closeModal(); go('a-programmes', { id: 'NV-L3', tab: 'tree' });
    ok('CH-15 structure builder (draft version): editable code per module', app().querySelectorAll('[data-onchange="chModCode"]').length === 9);
    const dt = () => s3Draft('NV-L3').tree.find(u => u.code === 'U307').mods[0].ab; const inp = app().querySelector('[data-onchange="chModCode"][data-k="U307 M1"]'); inp.value = 'bad'; INP.chModCode(inp); ok('CH-15 code format checked', dt() === 'R/652/0701' && STORE.worlds.C.tree.find(u => u.code === 'U307').mods[0].ab === 'R/652/0701');
    inp.value = 'Y/652/0799'; INP.chModCode(inp); ok('CH-15 code saved in the draft version, audited; the published version and Aisha\'s record keep R/652/0701', dt() === 'Y/652/0799' && STORE.worlds.C.tree.find(u => u.code === 'U307').mods[0].ab === 'R/652/0701' && ADMIN.audit[0].action === 'Module awarding-body code changed');
    // CB4 (PD-CB-29) supersedes the call without a programme (it fell back to Level 3): the programme is given
    ACT.chAnsUp({ dataset: { k: 'U307 M1', p: 'NV-L3' } }); $('#rsn').value = 'New guidance'; ok('CH-18 upload needs a file', prim() === false); ACT.chAnsSample(); prim(); closeModal();
    learner('C'); go('resources'); ok('CH-18 uploaded answer key appears under its module for learners', W.resources.some(g => /^U307/.test(g.unit) && g.items.some(i => i.kind === 'key' && /Knowledge Answer Key \(updated\)/.test(i.title))) && /Safe working \(R\/652\/0701\)/.test(main()) /* CB4 correction (PD-CB-33): the learner keeps her code */);
    fresh();
  });

  /* ---------- Records (Batch 4) ---------- */
  await T('CH records (Batch 4)', async () => {
    fresh(); ACT.scOpen(); go('cd-log'); const t = main();
    ok('Decisions Log: CH-15, CH-16, CH-18 Applied (Batch 4); CH-26, CH-28 updated', ['CH-15', 'CH-16', 'CH-18'].every(id => new RegExp(id + '[^]*?Applied \\(Batch 4\\)13 Oct 2026').test(t)) && /Tasks counts module quizzes \(Batch 4\)/.test(t) && /"What is this module about\?" \(Batch 4\)/.test(t));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 4/.test(s.textContent));
    ok('UX Changelog: Batch 4 entry lists its CH IDs', !!ux && ['CH-16:', 'CH-26:', 'CH-28:', 'CH-15:', 'CH-18:'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    const s20 = SC_LIST().find(x => x[0] === '20'); ok('Scenario #20 "Module quizzes"', !!s20 && s20[1] === 'Module quizzes' && s20[3].length === 6 && /exhausted/.test(s20[3][2].text) && /certificate/.test(s20[3][5].text));
    SA(); go('a-index'); ok('Admin index: Modules tab, structure builder codes and answer keys', !!app().querySelector('[data-t="a-courses.SC-01.modules"]') && !!app().querySelector('[data-t="a-programmes.NV-L3.tree"]'));
  });

  /* ================= Batch 5 ================= */
  const tas = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const coord = (v = 'B') => { S.coo.v = v; cooEnter(); S.signedIn = true; }; // B = Michael Osei, Croydon Cohort 4's Coordinator
  const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const MAR = () => ADMIN.batches.find(b => b.code === 'L2DC-MAR26'), JAN = () => ADMIN.batches.find(b => b.code === 'L3AC-JAN26');
  const marLids = () => chCohLids(MAR()), janLids = () => chCohLids(JAN());

  /* ---------- CH-17 mock data and the Assessors panel ---------- */
  await T('CH-17 allocations and the Assessors panel', async () => {
    fresh(); const m = chAllocOf(MAR()), j = chAllocOf(JAN());
    ok('CH-17 Croydon Cohort 4: James Pryce (assignments, observations), Sarah Okonkwo (PD) — not its Coordinator (P-33)', m.asg === 'James Pryce' && m.pd === 'Sarah Okonkwo' && m.obs === 'James Pryce');
    ok('CH-17 Leicester Cohort 7: one person holds all three roles', j.asg === 'Sarah Okonkwo' && j.pd === 'Sarah Okonkwo' && j.obs === 'Sarah Okonkwo');
    ok('CH-17 overrides: Olivia Shaw PD → James Pryce (P-33: was Michael Osei); Ben Carter observations → James Pryce', chEff('IA-L-33107', 'pd') === 'James Pryce' && chEff('IA-L-30755', 'obs') === 'James Pryce' && chEff(STORE.worlds.D.me.id, 'pd') === 'Sarah Okonkwo' && chEff(STORE.worlds.D.me.id, 'obs') === 'James Pryce');
    ok('CH-17 batch assessors = everyone allocated; not the Coordinator (P-33)', ['James Pryce', 'Sarah Okonkwo'].every(n => MAR().assessors.includes(n)) && !MAR().assessors.includes('Michael Osei'));
    learner('D'); go('dashboard'); ok('CH-17 learner sees three assessors under Your people', ['Assessor (assignments)', 'Assessor (PD)', 'Assessor (observations)'].every(r => W.nvq.people.some(p => p[0] === r)) && W.nvq.people.find(p => p[0] === 'Assessor (observations)')[1] === 'James Pryce'); /* P-33 */
    coord(); go('c-batches', { id: 'L2DC-MAR26' }); const pan = app().querySelector('.ch-assess');
    ok('CH-17 Coordinator batch detail: Assessors panel with three dropdowns', !!pan && ['asg', 'pd', 'obs'].every(k => pan.querySelector('#ch-as-' + k)) && /Assignment assessor/.test(pan.textContent) && /Learner overrides/.test(pan.textContent));
    $('#ch-as-pd').value = 'James Pryce'; /* P-33: the Coordinator isn't offered */ const tn0 = STORE.tas.notifs.length, cn0 = STORE.coo.notifs.length; ACT.chAssessSave({ dataset: { b: 'L2DC-MAR26' } }); ok('CH-17 change needs a reason', press() === false); $('#rsn').value = 'Sarah on leave'; press();
    ok('CH-17 saved, audited, assessors and Coordinator notified', chAllocOf(MAR()).pd === 'James Pryce' && ADMIN.audit[0].action === 'PD assessor changed' && ADMIN.audit[0].actor === CME().name && STORE.tas.notifs.length >= tn0 + 2 && STORE.coo.notifs.length > cn0);
    ok('CH-17 learner overrides stay in force', chEff('IA-L-33107', 'pd') === 'James Pryce' && chEff('IA-L-30755', 'obs') === 'James Pryce');
    acaEnter('KA'); S.signedIn = true; go('a-batches', { id: 'L3AC-JAN26', tab: 'staff' }); ok('CH-17 Academic Admin edits any batch (Staff tab)', !!app().querySelector('.ch-assess #ch-as-obs'));
    role('sysA'); go('a-batches', { id: 'L3AC-JAN26', tab: 'staff' }); ok('CH-17 System Admin: read-only', !!app().querySelector('.ch-assess') && !app().querySelector('.ch-assess select'));
    const a0 = ADMIN.audit.length; ACT.chAssessSave({ dataset: { b: 'L3AC-JAN26' } }); ok('CH-17 a direct save by a role that can\'t is refused and logged', !MODAL && ADMIN.audit.length === a0 + 1 && /^Blocked: change assessors/.test(ADMIN.audit[0].action));
    coord('B'); ACT.cooStaff({ dataset: { id: 'L2DC-MAR26' } }); ok('CH-17 Edit staff keeps teachers only', !!MODAL && !$('#bs-a') && !!$('#bs-t')); closeModal();
  });

  /* ---------- CH-17 who can act ---------- */
  await T('CH-17 only the allocated assessor acts', async () => {
    fresh();
    tas('S'); const js = tasSubs(true); ok('CH-17 James (assignment assessor, Croydon) sees only Croydon submissions, resubmissions included', js.length > 0 && js.every(r => marLids().includes(r.L.lid)) && js.some(r => r.resub || r.status === 'Submitted'));
    tas('A'); const ss = tasSubs(true); ok('CH-17 Sarah (not Croydon\'s assignment assessor) doesn\'t see Croydon submissions', ss.length > 0 && !ss.some(r => r.L.batch.code === 'L2DC-MAR26'));
    const key = js.find(r => r.status === 'Submitted').key, s0 = ADMIN.security.length; go('t-mark', { id: key });
    ok('CH-17 direct URL to another assessor\'s submission is refused and logged', /You don't have access to this record/.test(main()) && ADMIN.security.length === s0 + 1 && ADMIN.audit[0].action === 'Blocked: not the assignment assessor');
    tas('S'); go('t-mark', { id: key }); ok('CH-17 the assignment assessor can open it', !/You don't have access/.test(main()));
    tas('M'); ok('CH-17 Michael (Croydon\'s Coordinator) has no Croydon PD or observations (P-33)', !tasPdList().some(p => marLids().includes(p.lid) || p.lid === 'IA-L-33107') && !tasObs().some(o => o.id === 'TO-9' || marLids().includes(o.lid)));
    const g = STORE.worlds.D.me.id, a0 = ADMIN.audit.length; ACT.pdPropose({ dataset: { l: g } });
    ok('CH-17 PD: a non-allocated assessor\'s direct call is refused and logged', !MODAL && ADMIN.audit.length === a0 + 1 && ADMIN.audit[0].action === 'Blocked: not the PD assessor');
    tas('S'); ok('CH-17 observations: James (Croydon observation assessor, P-33) has TO-9 and Grace\'s', tasObs().some(o => o.id === 'TO-9') && tasObs().some(o => o.lid === g));
    go('t-obsrec', { id: 'TO-9' }); ok('CH-17 the observation assessor can record it', !/You don't have access/.test(main()));
    tas('A'); ok('CH-17 Sarah: Grace\'s PD (batch default) but not her observations or TO-9; not Olivia\'s PD (override)', !tasObs().some(o => o.lid === g) && !tasObs().some(o => o.id === 'TO-9') && tasPdList().some(p => p.lid === g) && !tasPdList().some(p => p.lid === 'IA-L-33107'));
    const s1 = ADMIN.security.length; go('t-obsrec', { id: 'TO-9' }); ok('CH-17 observation: direct URL by another assessor refused and logged', /You don't have access/.test(main()) && ADMIN.security.length === s1 + 1 && ADMIN.audit[0].action === 'Blocked: not the observation assessor');
    const a1 = ADMIN.audit.length; ACT.orSign({ dataset: { id: 'TO-9' } }); ok('CH-17 sign-off by another assessor refused and logged', !MODAL && ADMIN.audit.length === a1 + 1);
    ACT.obPropose({ dataset: {} }); const opts = [...$('#op-l').options].map(o => o.value); ok('CH-17 propose: only learners whose observation assessor I am', opts.length > 0 && opts.every(l => chEff(l, 'obs') === 'Sarah Okonkwo') && !opts.includes('IA-L-33100')); closeModal();
  });

  /* ---------- CH-17 per-learner override, attribution, IQA ---------- */
  await T('CH-17 override, attribution and IQA conflict', async () => {
    fresh(); coord(); go('c-learner', { id: 'IA-L-33100' }); const card = app().querySelector('.ch-ovcard');
    ok('CH-17 learner record: assessors for this learner; assignment assessor not changeable', !!card && /James Pryce/.test(card.textContent) && /can't be changed for one learner/.test(card.textContent) && !card.querySelector('[data-act="chOvSet"][data-k="asg"]') && !!card.querySelector('[data-act="chOvSet"][data-k="obs"]'));
    ACT.chOvSet({ dataset: { l: 'IA-L-33100', k: 'asg' } }); ok('CH-17 assignment assessor override refused', !MODAL && /^Blocked: assessor override/.test(ADMIN.audit[0].action));
    const tn0 = STORE.tas.notifs.length; ACT.chOvSet({ dataset: { l: 'IA-L-33100', k: 'obs' } }); ok('CH-17 override needs a reason', press() === false); $('#ch-ov-n').value = 'Sarah Okonkwo'; $('#rsn').value = 'James is on leave that week'; press();
    ok('CH-17 observation override saved: chip, audit, assessors notified', chEff('IA-L-33100', 'obs') === 'Sarah Okonkwo' && /override/.test(app().querySelector('.ch-ovcard').textContent) && !!app().querySelector('[data-act="chOvReset"][data-k="obs"]') && ADMIN.audit[0].action === 'Observation assessor override' && STORE.tas.notifs.length >= tn0 + 2);
    tas('S'); go('t-obsrec', { id: 'TO-9' }); ok('CH-17 after the override only the new assessor records: James refused (P-33: was Michael)', /You don't have access/.test(main()));
    tas('A'); go('t-obsrec', { id: 'TO-9' }); ok('CH-17 Sarah can record it', !/You don't have access/.test(main()) && tasObs().some(o => o.id === 'TO-9'));
    coord(); go('c-learner', { id: 'IA-L-33100' }); ACT.chOvReset({ dataset: { l: 'IA-L-33100', k: 'obs' } }); $('#rsn').value = 'James is back'; press(); ok('CH-17 Reset to batch default', chEff('IA-L-33100', 'obs') === 'James Pryce' && !chOvOf('IA-L-33100', 'obs'));
    acaEnter('KA'); S.signedIn = true; go('a-learner', { id: 'IA-L-33107' }); ok('CH-17 Academic Admin → learner: override shown and changeable', /Assessors for this learner/.test(main()) && /James Pryce/.test(main()) && !!app().querySelector('[data-act="chOvReset"][data-k="pd"]'));
    // attribution: a completed submission keeps its marker when the allocation changes
    tas('S'); const done = tasSubs(true).find(r => r.status !== 'Submitted' && !r.L.formerBy && r.markerName === 'James Pryce'), before = done && done.markerName;
    chAllocOf(MAR()).asg = 'Sarah Okonkwo'; chSyncAssessors(MAR()); tas('A'); const after = (tasSubs(true).find(r => r.key === (done || {}).key) || {}).markerName; /* P-33: the new assessor isn't the Coordinator */
    ok('CH-17 attribution: completed records keep the name they were done under', !!done && before === after && after !== 'Sarah Okonkwo', before + ' → ' + after);
    chAllocOf(MAR()).asg = 'James Pryce'; chSyncAssessors(MAR());
    ok('CH-17 IQA conflict: any of the three allocations (P-33 mock)', /^You are the assignment assessor and the observation assessor and the PD assessor for one learner on this batch$/.test(iqaConflict({ batch: 'L2DC-MAR26', assessor: 'X' }, 'James Pryce')) && /PD assessor on this batch/.test(iqaConflict({ batch: 'L2DC-MAR26', assessor: 'X' }, 'Sarah Okonkwo')) && !iqaConflict({ batch: 'L2DC-MAR26', assessor: 'X' }, 'Kevin Doyle'));
    ok('CH-17 IQA conflict: a learner override counts too', /PD assessor for one learner/.test(chRoleOn(MAR(), 'James Pryce')) && /observation assessor for one learner/.test(chRoleOn(JAN(), 'James Pryce')));
    ok('CH-17 IQA conflict: teaching the batch still counts', /Teacher on this batch/.test(iqaConflict({ batch: 'L2DC-MAR26', assessor: 'X' }, MAR().teachers[0])));
  });

  /* ---------- Records (Batch 5) ---------- */
  await T('CH records (Batch 5)', async () => {
    fresh(); const s21 = SC_LIST().find(x => x[0] === '21');
    ok('Scenario #21 "Separate assessors"', !!s21 && s21[1] === 'Separate assessors' && s21[3].length === 6 && /three assessors/.test(s21[3][0].text) && /override|changes one learner/.test(s21[3][4].text) && /refused/.test(s21[3][5].text));
    ACT.scOpen(); go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 5/.test(s.textContent));
    ok('UX Changelog: Batch 5 entry', !!ux && [...ux.querySelectorAll('li')].filter(li => li.textContent.startsWith('CH-17:')).length >= 4);
    coord('A'); go('c-index'); ok('Coordinator index: Assessors panel and learner override entries', !!app().querySelector('[data-t="c-batches.L3AC-JAN26"]') && !!app().querySelector('[data-t="c-learner.IA-L-30755"]'));
    go('c-learner', { id: 'IA-L-30755' }); ok('Coordinator A: Ben Carter\'s observation override with Reset', /James Pryce/.test(main()) && !!app().querySelector('[data-act="chOvReset"][data-k="obs"]'));
  });

  /* ================= Batch 6 ================= */
  // CH-06 VAT on agency bundles
  const P6 = id => STORE.biz.products.find(p => p.id === id);
  const Q6 = id => ADMIN.queue.find(i => i.id === id);
  const openVat = id => ADMIN.queue.find(i => i.type === 'Bundle VAT setting' && isOpen(i) && i.data.productId === id);
  const setVat = (on, pct) => { const c = document.querySelector('#bp-vat'); c.checked = on; INP.chVatCalc(c); const x = document.querySelector('#bp-vatp'); x.value = pct; INP.chVatCalc(x); };
  const vatDlg = (id, on, pct, r) => { ACT.chVatChange({ dataset: { id } }); const c = document.querySelector('#bp-vat'); c.checked = on; INP.chVatDlgCalc(c); const x = document.querySelector('#bp-vatp'); x.value = pct; INP.chVatDlgCalc(x); document.querySelector('#rsn').value = r; return press(); };
  const decide = (i, a, r) => { ACT.qDo({ dataset: { id: i.id, a } }); const t = document.querySelector('#rsn'); if (t) t.value = r; return press(); };

  await T('CH-06 mock data and the approval type', async () => {
    fresh();
    ok('CH-06 mock: CAT-1 VAT 20% approved, CAT-2 VAT 20% pending (published), CAT-3 no VAT', P6('CAT-1').vat.pct === 20 && !P6('CAT-1').vatPending && P6('CAT-2').status === 'Published' && !P6('CAT-2').vat && P6('CAT-2').vatPending.pct === 20 && P6('CAT-2').vatPending.qid === 'AQ-7301' && !P6('CAT-3').vat && !P6('CAT-3').vatPending);
    ok('CH-06 mock queue items: AQ-7300 Approved by Finance, AQ-7301 Pending with Finance Admin', Q6('AQ-7300').status === 'Approved' && Q6('AQ-7300').decidedBy === FIN_A && Q6('AQ-7301').status === 'Pending' && Q6('AQ-7301').first === FIN_A && Q6('AQ-7301').raisedBy === BIZ_A);
    ok('CH-06 type in every list (Super Admin, Finance, Business)', QTYPES.includes('Bundle VAT setting') && FIN_TYPES.includes('Bundle VAT setting') && BIZ_TYPES.includes('Bundle VAT setting') && qLbl('Bundle VAT setting') === 'Bundle VAT');
    SA(); go('a-queue'); ACT.qRouting(); const rows = [...document.querySelectorAll('#modal-root tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()).join(' | '));
    ok('CH-06 "Who approves what": incl. Bundle VAT setting (19 rows from CH-34, CH-35, CH-37, CH-39)', rows.length === 19 && rows.includes('Bundle VAT setting | Business Admin | Finance Admin | Super Admin'), rows.length);
    closeModal();
  });

  await T('CH-06 Business Admin: editor VAT section, validation, preview', async () => {
    fresh(); role('bizA'); go('a-bundles', { id: 'CAT-3', tab: 'catalogue' });
    ACT.newBundle({ dataset: { id: 'CAT-3' } });
    ok('CH-06 editor: "6. VAT" with Add VAT tick-box and VAT % field', !!document.querySelector('#modal-root #bp-vat') && !!document.querySelector('#modal-root #bp-vatp') && /6\. VAT/.test(mroot().textContent));
    ok('CH-06 editor: VAT % disabled until ticked; preview says no VAT', document.querySelector('#bp-vatp').disabled && /No VAT/.test(document.querySelector('#bp-vatout').textContent));
    setVat(true, ''); const n = ADMIN.queue.length; prim();
    ok('CH-06 editor: VAT % required when ticked', !!MODAL && ADMIN.queue.length === n && /Enter the VAT %/.test(mroot().textContent));
    setVat(true, 20); const net = priceOf(P6('CAT-3')).final;
    ok('CH-06 editor preview: "£net + VAT (20%) £vat = £total"', document.querySelector('#bp-vatout').textContent === money(net, 'GBP') + ' + VAT (20%) ' + money(net * 0.2, 'GBP') + ' = ' + money(net * 1.2, 'GBP'), document.querySelector('#bp-vatout').textContent);
    ACT.bpMode({ dataset: { m: 'auto' } }); ok('CH-06 editor: VAT kept when the modal redraws', document.querySelector('#bp-vat').checked && +document.querySelector('#bp-vatp').value === 20);
    closeModal();
  });

  await T('CH-06 Business Admin raises → Finance approves → agency pays VAT', async () => {
    fresh(); role('bizA'); go('a-bundles', { id: 'CAT-3', tab: 'catalogue' });
    ok('CH-06 bundle detail: VAT "No VAT" and Change VAT', /VATNo VAT/.test(main()) && !!app().querySelector('[data-act="chVatChange"][data-id="CAT-3"]'));
    const base = priceOf(P6('CAT-3')).final;
    vatDlg('CAT-3', true, 20, 'HMRC: standard-rated training for agencies.');
    const i = openVat('CAT-3');
    ok('CH-06 Change VAT on a published bundle → "Bundle VAT setting" Pending with Finance', !!i && i.status === 'Pending' && i.first === FIN_A && i.raisedBy === ADMIN.me.name && i.data.to.pct === 20);
    ok('CH-06 published bundle: current price stays until approved (still published, no VAT)', P6('CAT-3').status === 'Published' && !P6('CAT-3').vat && P6('CAT-3').vatPending.qid === i.id);
    go('a-bundles', { id: 'CAT-3', tab: 'catalogue' }); ok('CH-06 detail: pending note with the queue item; Change VAT disabled with a reason', new RegExp('VAT change awaiting Finance approval \\(' + i.id).test(main()) && app().querySelector('[data-act="chVatChange"]').disabled && !!app().querySelector('[data-act="chVatChange"]').title);
    role('agyA'); go('g-buy'); ok('CH-06 agency still sees the current price (no VAT) while pending', /Dementia Awareness seats/.test(main()) && main().includes(money(base, 'GBP') + ' — no VAT on this bundle'));
    role('bizA'); decide(i, 'approve', 'ok'); closeModal(); applyDecision(i, 'approve', 'direct call', {}); ok('CH-06 Business Admin can\'t approve it (Finance decides; self-approval blocked, direct call too)', i.status === 'Pending' && !!P6('CAT-3').vatPending && !P6('CAT-3').vat);
    closeModal(); role('finA'); ok('CH-06 Finance Admin (Leila Haddad) has it in "Awaiting me"', ADMIN.me.name === FIN_A && awaitingMe(i));
    go('a-queue', { id: i.id }); ok('CH-06 queue item panel: change, net and what the agency would pay', /Bundle VAT setting/.test(main()) && /No VAT\s*→\s*VAT 20%/.test(main()) && main().includes(money(base * 1.2, 'GBP')));
    decide(i, 'approve', 'Agreed.');
    ok('CH-06 Finance approves → VAT 20% applies; nothing pending', i.status === 'Approved' && P6('CAT-3').vat.pct === 20 && !P6('CAT-3').vatPending);
    ok('CH-06 Business Admin notified', STORE.biz.notifs.some(n => /Bundle VAT approved/.test(n.t) && n.b.includes(i.id)));
    role('agyA'); go('g-buy'); const pr = priceFor(AGY_CATALOGUE().find(c => c.id === 'CAT-3'), 10);
    ok('CH-06 Buy Bundles: "£net + VAT £vat = £total total"', main().includes(money(pr.net, 'GBP') + ' + VAT ' + money(pr.vat, 'GBP') + ' = ' + money(pr.total, 'GBP') + ' total') && Math.abs(pr.vat - pr.net * 0.2) < 0.005);
    ok('CH-06 Buy Bundles: CAT-1 shows VAT, others without VAT say so', /no VAT on this bundle/.test(main()) && (app().querySelectorAll('.ch-vat').length === AGY_CATALOGUE().length));
    ok('CH-06 pending VAT (CAT-2): Buy Bundles keeps the current price (no VAT)', AGY_CATALOGUE().find(c => c.id === 'CAT-2').vatPct === 0);
    ACT.agBuy({ dataset: { id: 'CAT-3' } }); ok('CH-06 quantity dialog: total includes VAT, with the breakdown', mroot().textContent.includes('Total ' + money(pr.total, 'GBP')) && mroot().textContent.includes(money(pr.net, 'GBP') + ' + VAT ' + money(pr.vat, 'GBP')));
    prim(); ok('CH-06 checkout: pay the total incl. VAT, breakdown shown', mroot().textContent.includes(money(pr.total, 'GBP')) && mroot().textContent.includes('+ VAT ' + money(pr.vat, 'GBP')));
    agPayResult('success'); const p = STORE.agy.purchases[0];
    ok('CH-06 purchase record: amount = total, with net, VAT % and VAT', p.amount === pr.total && p.net === pr.net && p.vatPct === 20 && p.vat === pr.vat);
    const tx = STORE.fin.tx.find(t => t.ref === p.ref), bn = ADMIN.bundles.find(b => b.id === p.bundle);
    ok('CH-06 Finance transaction and credited bundle carry the VAT', tx && tx.amount === pr.total && tx.vatPct === 20 && tx.net === pr.net && bn && bn.vatPct === 20);
    const dl = MODAL.actions.find(a => a.label === 'Download receipt'); dl.fn();
    const rt = mroot().textContent;
    ok('CH-06 receipt: net, VAT % and amount, total paid', /Receipt RCP-/.test(rt) && rt.includes('Net' + money(pr.net, 'GBP')) && rt.includes('VAT20% · ' + money(pr.vat, 'GBP')) && rt.includes('Total paid' + money(pr.total, 'GBP')), rt.slice(0, 200));
    closeModal(); S.agy.buy = null; go('g-purchases');
    const hd = [...app().querySelectorAll('main thead th')].map(th => th.textContent.trim());
    ok('CH-06 Purchases list: Net, VAT %, VAT and Total columns', ['Net', 'VAT %', 'VAT', 'Total'].every(x => hd.includes(x)), hd.join('|'));
    ok('CH-06 Purchases list: the new row shows 20% and the VAT', main().includes('20%') && main().includes(money(pr.vat, 'GBP')));
    ACT.agReceipt({ dataset: { ref: p.ref } }); ok('CH-06 Receipt button opens the breakdown', /Total paid/.test(mroot().textContent) && mroot().textContent.includes('20%')); closeModal();
    go('g-purchase', { id: p.ref }); ok('CH-06 purchase detail: Net, VAT, Total', main().includes('Net' + money(pr.net, 'GBP')) && main().includes('VAT20% · ' + money(pr.vat, 'GBP')) && main().includes('Total' + money(pr.total, 'GBP')));
    role('finA'); go('f-ledger'); const lh = [...app().querySelectorAll('main thead th')].map(th => th.textContent.trim());
    ok('CH-06 Finance ledger: Net, VAT %, VAT and Total columns', ['Net', 'VAT %', 'VAT', 'Total'].every(x => lh.includes(x)), lh.join('|'));
    const row = [...app().querySelectorAll('main tbody tr')].find(tr => tr.textContent.includes(p.ref));
    ok('CH-06 ledger row: agency purchase with 20% VAT', !!row && row.textContent.includes('20%') && row.textContent.includes(money(pr.vat, 'GBP')) && row.textContent.includes(money(pr.net, 'GBP')));
    const lrow = [...app().querySelectorAll('main tbody tr')].find(tr => /Learner/.test(tr.textContent) || STORE.fin.tx.some(t => t.payerType === 'Learner' && tr.textContent.includes(t.ref)));
    ok('CH-06 ledger: learner payments carry no VAT', allTx().filter(t => t.payerType !== 'Agency').every(t => t.vatPct == null) && (!lrow || !/\d%/.test([...lrow.children].map(td => td.textContent).join('|'))));
    go('f-agency'); const ah = [...app().querySelectorAll('main thead th')].map(th => th.textContent.trim());
    ok('CH-06 Agency Payments → Purchase history: Net, VAT %, VAT, Total', ['Net', 'VAT %', 'VAT', 'Total'].every(x => ah.includes(x)) && main().includes('20%'), ah.join('|'));
    go('f-reports', { tab: 'agency' }); const rh = [...app().querySelectorAll('main thead th')].map(th => th.textContent.trim());
    ok('CH-06 Finance Reports → Agency: Net, VAT, Total', ['Net', 'VAT', 'Total'].every(x => rh.includes(x)) && main().includes(money(pr.vat, 'GBP')) && /VAT applies to agency bundle purchases only/.test(main()), rh.join('|'));
  });

  await T('CH-06 publish blocked while VAT pending; reject keeps the current setting', async () => {
    fresh(); role('bizA'); go('a-bundles', { id: 'CAT-2', tab: 'catalogue' });
    ok('CH-06 CAT-2 (published, VAT pending): note says the current price stays', /AQ-7301/.test(main()) && /current price stays in Buy Bundles until it's approved/.test(main()));
    ACT.newBundle({ dataset: { id: 'CAT-2' } }); ok('CH-06 editor: VAT read-only while pending', !document.querySelector('#bp-vat') && /awaiting Finance approval/.test(mroot().textContent)); closeModal();
    go('a-bundles', { id: 'CAT-8', tab: 'catalogue' }); vatDlg('CAT-8', true, 20, 'Add VAT before publishing.'); const i8 = openVat('CAT-8');
    go('a-bundles', { id: 'CAT-8', tab: 'catalogue' }); const pub = app().querySelector('main button[title="VAT change awaiting Finance approval"]');
    ok('CH-06 Draft CAT-8 with VAT pending: Publish disabled with a reason', !!i8 && !!pub && pub.disabled && /Publish/.test(pub.textContent) && !app().querySelector('[data-act="bPublish"][data-id="CAT-8"]'));
    ACT.bPublish({ dataset: { id: 'CAT-8' } }); ok('CH-06 publish refused by the action too', /Can't publish/.test(MODAL.title) && /VAT change is awaiting Finance approval/.test(mroot().textContent) && P6('CAT-8').status === 'Draft'); closeModal();
    role('finA'); decide(Q6('AQ-7301'), 'reject', 'Keep Infection control seats without VAT for now.');
    ok('CH-06 Finance rejects → nothing pending, bundle stays without VAT', Q6('AQ-7301').status === 'Rejected' && !P6('CAT-2').vatPending && !P6('CAT-2').vat);
    decide(i8, 'approve', 'Agreed.'); ok('CH-06 Finance approves CAT-8\'s VAT', i8.status === 'Approved' && P6('CAT-8').vat.pct === 20);
    role('bizA'); go('a-bundles', { id: 'CAT-2', tab: 'catalogue' }); ok('CH-06 rejection shown on the bundle', /VAT change rejected \(AQ-7301\)/.test(main()));
    go('a-bundles', { id: 'CAT-8', tab: 'catalogue' }); ok('CH-06 after approval: Publish available', !!app().querySelector('[data-act="bPublish"][data-id="CAT-8"]'));
  });

  await T('CH-06 new bundle with VAT; escalation; Super Admin immediate', async () => {
    fresh(); role('bizA'); go('a-bundles'); ACT.newBundle(); document.querySelector('#bp-n').value = 'VAT test bundle'; setVat(true, 5); const n = STORE.biz.products.length; prim();
    const p = STORE.biz.products[n], i = p && openVat(p.id);
    ok('CH-06 new bundle with VAT → Draft + pending Finance approval', !!p && p.status === 'Draft' && !!i && i.data.to.pct === 5 && p.vatPending.qid === i.id);
    ACT.bAdvance(); ok('CH-06 left 7 days → escalated to the Super Admin', allQueue().find(x => x.id === i.id).status === 'Escalated');
    role('finA'); ok('CH-06 escalated: no longer awaiting the Finance Admin', !awaitingMe(i));
    SA(); decide(i, 'approve', 'Escalated — approved.'); ok('CH-06 Super Admin decides the escalated item', i.status === 'Approved' && p.vat.pct === 5);
    SA(); go('a-bundles', { id: 'CAT-3', tab: 'catalogue' }); vatDlg('CAT-3', true, 20, 'Super Admin sets VAT.');
    const s = ADMIN.queue.find(x => x.type === 'Bundle VAT setting' && x.data.productId === 'CAT-3');
    ok('CH-06 Super Admin\'s own change applies immediately (no approval)', P6('CAT-3').vat.pct === 20 && !P6('CAT-3').vatPending && s && s.saImmediate && s.status === 'Approved');
  });

  await T('CH-06 learners never pay VAT', async () => {
    fresh(); learner('A'); const seen = ['payments', 'browse', 'courses'].map(r => { go(r); return main(); }).join(' ');
    ok('CH-06 learner payments and catalogue: no VAT added', !/\+ VAT|VAT \d+%|VAT \(\d/.test(seen));
    ok('CH-06 learner transactions carry no VAT fields', Object.values(STORE.worlds).every(w => (w.tx || []).every(t => t.vatPct == null)));
  });

  /* ---------- Records (Batch 6) ---------- */
  await T('CH records (Batch 6)', async () => {
    fresh(); const s22 = SC_LIST().find(x => x[0] === '22');
    ok('Scenario #22 "Bundle VAT approval"', !!s22 && s22[1] === 'Bundle VAT approval' && s22[3].length === 5 && /Add VAT/.test(s22[3][0].text) && /Finance Admin approves/.test(s22[3][1].text) && /receipt/i.test(s22[3][4].text));
    ok('Scenario #22 runs: Business Admin → Finance → agency', (() => { ACT.chSc22Biz(); const a = S.route === 'a-bundles' && isBiz(); ACT.chSc22Fin(); const b = isFin(); ACT.chSc22Agy(); return a && b && S.portal === 'agency' && S.route === 'g-buy'; })());
    ACT.scOpen(); go('demo-scenarios'); ok('Demo Scenarios: #22 present', /Bundle VAT approval/.test((app().querySelector('#sc-22') || {}).textContent || ''));
    go('cd-log'); const r6 = [...app().querySelectorAll('main tr')].find(tr => tr.textContent.trim().startsWith('CH-06')); ok('Decisions Log: CH-06 Applied (Batch 6) 13 Oct 2026', !!r6 && /Applied \(Batch 6\)/.test(r6.textContent) && /13 Oct 2026/.test(r6.textContent), r6 && r6.textContent);
    ok('Decisions Log: #22 client-defined (CH-06)', CDL_SCEN.some(r => r[0] === '22' && r[2] === 'Client-defined (CH-06)'));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 6/.test(s.textContent));
    ok('UX Changelog: Batch 6 entry', !!ux && [...ux.querySelectorAll('li')].filter(li => li.textContent.startsWith('CH-06:')).length >= 4);
    SA(); go('a-index'); ok('Admin index: CH-06 entries with purpose lines', ['a-bundles.CAT-1.catalogue', 'a-bundles.CAT-2.catalogue', 'a-queue.AQ-7301'].every(x => !!app().querySelector('[data-t="' + x + '"]')) && /VAT awaits Finance approval/.test(main()));
    role('bizA'); go('b-index'); ok('Business index: CH-06 entries', !!app().querySelector('[data-t="a-bundles.CAT-3.catalogue"]') && !!app().querySelector('[data-t="a-queue.AQ-7301"]'));
    role('finA'); go('f-index'); ok('Finance index: CH-06 entries', !!app().querySelector('[data-t="a-queue.AQ-7301"]') && !!app().querySelector('[data-t="f-ledger"]'));
    role('agyA'); go('g-index'); ok('Agency index: CH-06 entries', !!app().querySelector('[data-r="g-buy"]') && /net \+ VAT = total/.test(main()));
  });

  /* ================= Batch 7a ================= */
  // CH-32 privacy notice, CH-33 verification address, CH-34 office locations, CH-35 bank details, CH-36 register
  const sys = () => role('sysA');
  const qOf = (type, f = () => true) => ADMIN.queue.find(i => i.type === type && f(i));
  const fill7 = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const NOTAG = () => !/Client to supply/.test(html());

  await T('CH-32 / CH-33 settings, privacy notice and verification link', async () => {
    fresh(); SA(); go('a-config'); const t = main();
    ok('CH-32 setting "Privacy notice" = https://welfarehs.co.uk/privacy-policy', /Privacy notice\s*https:\/\/welfarehs\.co\.uk\/privacy-policy/.test(t));
    ok('CH-33 setting "LMS domain" = lms.welfarehs.co.uk with the deployment note', /LMS domain\s*lms\.welfarehs\.co\.uk/.test(t) && /Set at deployment; the client's IT team points this subdomain to the LMS\./.test(t));
    ok('CH-35 setting "Bank details for transfers" (confirmed, P-35: no Proposed default tag)', /Bank details for transfers\s*Lloyds Bank · Sort code 30-90-89 · Account number 80060562 · Account name Welfare Health and Safety Academy/.test(t) && !/Proposed default/.test(html()));
    ACT.vPrivacy(); ok('CH-32 verification page privacy notice links the URL', MODAL.body.includes('href="https://welfarehs.co.uk/privacy-policy"') && !/Client to supply/.test(MODAL.body)); closeModal();
    ACT.wpcPrivacy(); ok('CH-32 workplace privacy notice links the URL', MODAL.body.includes('href="https://welfarehs.co.uk/privacy-policy"')); closeModal();
    const u = verUrl('WHS-2026-00123');
    ok('CH-33 verification link: https://lms.welfarehs.co.uk/verify/<token>', /^https:\/\/lms\.welfarehs\.co\.uk\/verify\/[a-z0-9]{12}$/.test(u) && u === verUrl('WHS-2026-00123') && u !== verUrl('WHS-2026-00124'), u);
    learner('A'); go('certificates'); const b = app().querySelector('[data-act="copyVerify"]'); ACT.copyVerify(b);
    ok('CH-33 "Copy verification link" shows the LMS link, no placeholder', /https:\/\/lms\.welfarehs\.co\.uk\/verify\//.test(document.querySelector('#vlink').value) && !/Client to supply/.test(MODAL.body)); closeModal();
    SA(); go('a-config'); const c = ADMIN.config.find(x => x.name === 'LMS domain'); ACT.cfgEdit({ dataset: { id: c.id } }); document.querySelector('#cv').value = 'learn.welfarehs.co.uk'; document.querySelector('#rsn').value = 'Deployment'; press();
    ok('CH-33 the link follows the setting', /^https:\/\/learn\.welfarehs\.co\.uk\/verify\//.test(verUrl('X')));
    ACT.policy({ dataset: { p: 'Contact' } }); ok('CH-34 contact modal: Luton office address', /Luton office — 60 Park Street, Luton, LU1 3ET/.test(MODAL.body) && !/Client to supply/.test(MODAL.body)); closeModal();
  });

  await T('CH-34 office locations: approval, booking dropdown, history kept', async () => {
    fresh(); SA(); go('a-config');
    ok('CH-34 Office locations: Luton office Active; Milton Keynes pending (AQ-9001)', /Office locations/.test(main()) && /Luton office\s*60 Park Street, Luton\s*LU1 3ET\s*Active/.test(main()) && /Milton Keynes office[\s\S]*Pending approval/.test(main()));
    sys(); go('a-config'); ACT.chOffAdd(); fill7({ '#ol-n': 'Bedford office', '#ol-a': '5 Mill Street, Bedford', '#ol-p': 'mk40 3ew', '#rsn': 'New site.' }); press();
    const i = qOf('Office location change', x => x.data.after && x.data.after.name === 'Bedford office');
    ok('CH-34 System Admin adds → "Office location change" for the Super Admin; not active yet', !!i && i.status === 'Pending' && i.first === 'Super Administrator' && i.raisedBy === ADMIN.me.name && i.data.after.postcode === 'MK40 3EW' && !chOffices().some(o => o.name === 'Bedford office'));
    ok('CH-34 audited', ADMIN.audit.some(a => a.module === 'System Configuration' && a.action === 'Add requested' && /Bedford office/.test(a.entity)));
    ACT.qDo({ dataset: { id: i.id, a: 'approve' } }); closeModal(); applyDecision(i, 'approve', 'self', {});
    ok('CH-34 the System Admin can\'t approve it', i.status === 'Pending' && !chOffices().some(o => o.name === 'Bedford office'));
    i.raised = D(-8); allQueue(); ok('CH-34 after 7 days: reminder, not escalation', i.status === 'Pending' && i.reminder && !i.escalated);
    SA(); applyDecision(i, 'approve', 'Agreed.', {}); ok('CH-34 Super Admin approves → Bedford office Active', i.status === 'Approved' && chOffices().find(o => o.name === 'Bedford office').status === 'Active');
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; ACT.obPropose({ dataset: {} }); const lid0 = document.querySelector('#op-l').value; closeModal();
    { const r0 = chOrCreate(lid0, 'learner', 'Workplace closed.', 'Learner'); SA(); applyDecision(qItem(r0.qid), 'approve', 'Agreed.', {}); } /* CH-37: an office booking needs an approved request */
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-obs');
    const book = () => { ACT.obPropose({ dataset: {} }); const off = document.querySelector('input[name="op-lt"][value="office"]'); off.checked = true; INP.obLt(off); };
    book(); const lid = document.querySelector('#op-l').value, L = tasLearners(true).find(l => l.lid === lid), list = () => L.v ? STORE.worlds[L.v].observations : STORE.tas.obs, n = list().length;
    ok('CH-34 booking: dropdown of active locations', [...document.querySelectorAll('#op-office option')].map(o => o.textContent).join('|') === 'Luton office — 60 Park Street, Luton, LU1 3ET|Bedford office — 5 Mill Street, Bedford, MK40 3EW');
    prim(); const rec = list()[0];
    ok('CH-34 booked office observation stores its location', list().length === n + 1 && rec.locType === 'office' && rec.office && rec.office.name === 'Luton office');
    SA(); go('a-config'); ACT.chOffRetire({ dataset: { id: 'OL-1' } }); document.querySelector('#rsn').value = 'Lease ended.'; press();
    const ri = qOf('Office location change', x => x.data.kind === 'retire');
    ok('CH-34 Super Admin\'s own retire applies immediately', chOffices().find(o => o.id === 'OL-1').status === 'Retired' && ri && ri.saImmediate && ri.status === 'Approved');
    ok('CH-34 past observation keeps Luton office after it is retired', rec.office.name === 'Luton office' && chOfficeLine(chOfficeOf(rec)) === 'Luton office — 60 Park Street, Luton, LU1 3ET');
    if (L.v) { learner(L.v); go('observations'); ok('CH-34 learner Observations: the booked location, no placeholder', /Luton office — 60 Park Street/.test(main()) && NOTAG()); }
    S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-obs'); book();
    ok('CH-34 booking after retiring: only active locations', [...document.querySelectorAll('#op-office option')].map(o => o.textContent).join('|') === 'Bedford office — 5 Mill Street, Bedford, MK40 3EW'); closeModal();
    go('t-obs'); ok('CH-34 assessor list: office locations shown, no placeholder', /Luton office|Bedford office/.test(main()) && NOTAG());
  });

  await T('CH-35 bank details: change approval, Finance told, shown everywhere', async () => {
    fresh(); SA(); const p = qOf('Bank details change');
    ok('CH-35 mock: AQ-9002 bank change pending for the Super Admin', p && p.id === 'AQ-9002' && p.status === 'Pending' && p.first === 'Super Administrator');
    sys(); go('a-config'); const c = ADMIN.config.find(x => x.name === 'Bank details for transfers'); ACT.cfgEdit({ dataset: { id: c.id } });
    ok('CH-35 a second change is refused while one is pending', !MODAL || !document.querySelector('#bk-a')); closeModal();
    SA(); applyDecision(p, 'reject', 'Wrong account.', {}); ok('CH-35 Super Admin rejects → details unchanged; Finance told', p.status === 'Rejected' && chBankDet().acc === '80060562' && STORE.fin.notifs.some(nn => /Bank details change rejected/.test(nn.t)));
    sys(); go('a-config'); ACT.cfgEdit({ dataset: { id: c.id } }); fill7({ '#bk-a': '1234', '#rsn': 'New account' }); press();
    ok('CH-35 validation: 8-digit account number', !!MODAL && /Enter 8 digits/.test(mroot().textContent));
    fill7({ '#bk-a': '80060599' }); press(); const q = qOf('Bank details change', x => x.status === 'Pending');
    ok('CH-35 System Admin raises "Bank details change" → Super Admin; Finance notified of the request', !!q && q.data.after.acc === '80060599' && chBankDet().acc === '80060562' && STORE.fin.notifs.some(nn => /Bank details change requested/.test(nn.t) && nn.b.includes(q.id)));
    applyDecision(q, 'approve', 'self', {}); ok('CH-35 the System Admin can\'t approve their own change', q.status === 'Pending');
    SA(); go('a-queue', { id: q.id }); ok('CH-35 queue panel: before and after', /Bank details change/.test(main()) && /80060599/.test(main()));
    applyDecision(q, 'approve', 'Confirmed with the bank.', {});
    ok('CH-35 approved → new details used; Finance told of the outcome; audited', chBankDet().acc === '80060599' && /80060599/.test(c.value) && STORE.fin.notifs.some(nn => /Bank details change approved/.test(nn.t)) && ADMIN.audit.some(a => a.action === 'Bank details change approved'));
    learner('C'); go('payments'); const b = app().querySelector('[data-act="chPayBank"]');
    ok('CH-35 learner Payments: "Bank transfer" next to Pay now', !!b);
    ACT.chPayBank(b); ok('CH-35 Pay by bank transfer: bank details and a reference', /Lloyds Bank · Sort code 30-90-89 · Account number 80060599/.test(mroot().textContent) && /Reference IA-/.test(mroot().textContent));
    prim(); const x = STORE.chBank.find(y => y.wv === 'C' && y.status === 'Awaiting confirmation');
    ok('CH-35 transfer recorded as Awaiting confirmation; Pay now hidden for that instalment', !!x && W.plans.find(pl => pl.e === x.e).rows.find(r => r.n === x.n).confirming && /Bank transfer awaiting confirmation/.test(main()));
    FA(); const tg = payTargets().find(t => t.chb === x); ok('CH-35 Finance: the transfer is a payment target', !!tg && /instalment/.test(tg.label));
    recordPayment(tg, x.amount, 'BACS-77001', 'Bank transfer', 'Received');
    const row = STORE.worlds.C.plans.find(pl => pl.e === x.e).rows.find(r => r.n === x.n);
    ok('CH-35 recorded → instalment paid, learner notified, ledger once', x.status === 'Confirmed' && row.status === 'Paid' && !row.confirming && allTx().filter(t => t.ref === 'BACS-77001').length === 1 && STORE.worlds.C.notifs.some(nn => /Bank transfer received/.test(nn.title)));
    role('agyA'); const ap = agyPurchases().find(y => y.status === 'Approved – awaiting payment') || (role('agyB'), agyPurchases().find(y => y.status === 'Approved – awaiting payment'));
    if (ap) { go('g-purchase', { id: ap.ref }); ok('CH-35 agency bank-transfer purchase: bank details with the reference', /Lloyds Bank/.test(main()) && main().includes('Reference ' + ap.ref) && NOTAG()); } else ok('CH-35 agency bank-transfer purchase: bank details (no approved purchase in mock)', /Lloyds Bank/.test(chBankHtml('X')));
  });


  await T('P-28 country corrected only through Data Correction', async () => {
    fresh(); const lid = STORE.worlds.A.me.id, was = STORE.worlds.A.me.country, to = regionOf(was) === 'UAE' ? 'United Kingdom' : 'United Arab Emirates';
    role('sysA'); go('a-learner', { id: lid, tab: 'profile' }); ACT.raiseDC({ dataset: { id: lid } });
    const f = document.querySelector('#dc-f'); ok('P-28 Data Correction offers "Country of residence"', [...f.options].some(o => o.value === 'Country of residence'));
    f.value = 'Country of residence'; INP.chDcField(f);
    ok('P-28 raising shows the region note and a country list', /If the region changes between UK and UAE, an admin moves the learner's data \(audited, one-off\)\./.test(mroot().textContent) && /Only for a genuine mistake at registration/.test(mroot().textContent) && document.querySelector('#dc-p').tagName === 'SELECT');
    document.querySelector('#dc-p').value = to; document.querySelector('#dc-r').value = 'Chose the wrong country at registration — passport and visa show UAE residence.'; prim();
    const i = ADMIN.queue.find(x => x.type === 'Data correction' && x.data && x.data.field === 'Country of residence');
    ok('P-28 a Data Correction item: current → proposed, region move flagged, final Super Admin', !!i && i.data.current === was && i.data.proposed === to && i.data.regionMove === true && i.finalSuper && i.status === 'Pending');
    ok('P-28 nothing changes before final approval', STORE.worlds.A.me.country === was);
    SA(); go('a-queue', { id: i.id }); ok('P-28 queue item: country correction note', /Country correction/.test(main()) && /an admin moves the learner's data \(audited, one-off\)/.test(main()));
    applyDecision(i, 'approveFinal', 'Evidence checked.', {});
    ok('P-28 Super Admin final → country corrected, audited, region move logged once', STORE.worlds.A.me.country === to && ADMIN.audit.some(a => a.action === 'Data correction (final)' && a.after === to) && ADMIN.audit.filter(a => a.action === 'Data region move (one-off)' && a.entity === lid).length === 1);
    learner('A'); go('profile'); const row = [...app().querySelectorAll('main .li')].find(li => /Country of residence/.test(li.textContent));
    ok('P-28 never a profile request: Country stays read-only for the learner', !!row && !row.querySelector('[data-act="reqChange"]') && Object.values(STORE.worlds).every(w => !(w.requests || []).some(r => /Country/.test(r.target))));
  });

  await T('P-34 short-course module lists tagged Pending client', async () => {
    fresh(); SA(); const c = ADMIN.courses.find(x => x.status === 'Published'); go('a-courses', { id: c.id, tab: 'modules' });
    ok('P-34 Courses → Modules: "Pending client: short-course module lists (P-34)"', [...app().querySelectorAll('.tbd')].some(x => x.textContent === 'Pending client: short-course module lists (P-34)'));
  });

  /* ---------- Records (Batch 7a) ---------- */
  await T('CH records (Batch 7a)', async () => {
    fresh(); ACT.scOpen(); go('cd-log');
    const r = id => { const tr = [...app().querySelectorAll('main tr')].find(x => x.textContent.trim().startsWith(id)); return tr ? tr.textContent : ''; };
    ok('Decisions Log: CH-32 – CH-36 Applied (Batch 7a), source S7', ['CH-32', 'CH-33', 'CH-34', 'CH-35', 'CH-36'].every(id => /Applied \(Batch 7a\)/.test(r(id)) && /13 Oct 2026/.test(r(id)) && /S7/.test(r(id))));
    ok('Decisions Log: CH-43 from S8', /S8/.test(r('CH-43')));
    go('tbd-register'); ok('TBD register: T04, T06, T07, T08 resolved by CH-35, CH-32, CH-33, CH-34', ['T04', 'T06', 'T07', 'T08'].every(x => main().includes(x)) && ['CH-32', 'CH-33', 'CH-34', 'CH-35'].every(x => main().includes(x)) && /Remaining: P-31 and P-34/.test(main()));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 7a/.test(s.textContent));
    ok('UX Changelog: Batch 7a entry', !!ux && ['CH-32:', 'CH-33:', 'CH-34:', 'CH-35:', 'CH-36:'].every(k => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(k))));
    SA(); go('a-index'); ok('Admin index: CH-32 – CH-35 entries', !!app().querySelector('[data-t="a-config"]') && !!app().querySelector('[data-t="a-queue.AQ-9001"]') && !!app().querySelector('[data-t="a-queue.AQ-9002"]') && /replace the client placeholders/.test(main()));
    ok('Who approves what: Office location change and Bank details change rows', (ACT.qRouting(), ['Office location change | System Admin | Super Admin | Reminder', 'Bank details change | System Admin | Super Admin | Reminder'].every(x => [...document.querySelectorAll('#modal-root tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()).join(' | ')).includes(x)))); closeModal();
    const pages = [['learner', 'C', 'observations'], ['learner', 'C', 'payments'], ['learner', 'A', 'certificates'], ['admin', null, 'a-observations'], ['admin', null, 'a-config']];
    const bad = pages.filter(([k, v, rt]) => { if (k === 'learner') learner(v); else SA(); go(rt); return /Client to supply/.test(html()); });
    ok('No "Client to supply" tag left on sampled screens (CH-36)', !bad.length, bad.map(b => b[2]).join());
  });

  /* ================= Batch 7b ================= */
  // CH-37 office request/advice/consent/approval, CH-38 fee, CH-39 waiver, CH-40 no refund/transfer, CH-41 cards, CH-43 withdrawal
  const coA = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; };
  const asSarah = () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; };
  const C7 = () => STORE.worlds.C, cid = () => STORE.worlds.C.me.id;
  const book7 = (lid, days) => { ACT.obPropose({ dataset: { l: lid } }); $('#op-l').value = lid; INP.obPerm($('#op-l')); const off = $('input[name="op-lt"][value="office"]'); off.checked = true; INP.obLt(off); $('#op-d').value = D(days, '10:00').slice(0, 16); return prim(); };

  await T('CH-37 learner request → Coordinator approves → assessor books → learner accepts', async () => {
    fresh(); learner('C'); go('observations');
    ok('CH-37 learner Observations: "Request an Academy-office observation"', !!app().querySelector('[data-act="chOrRequest"]'));
    ACT.chOrRequest(); prim(); ok('CH-37 request needs a reason', !!MODAL && /Say why/.test(mroot().textContent));
    document.querySelector('#or-r').value = 'My workplace is closed for refurbishment.'; prim();
    const r = STORE.chOffReq.find(x => x.lid === cid()), i = r && qItem(r.qid);
    ok('CH-37 creates an "Office observation request" for the batch Coordinator', !!i && i.type === 'Office observation request' && i.status === 'Pending' && i.first === 'Dr Helen Carter' && r.status === 'Pending approval');
    ok('CH-37 Coordinator notified', STORE.coo.notifs.some(n => /Academy-office observation to decide/.test(n.t) && n.to === 'Dr Helen Carter'));
    asSarah(); ACT.obPropose({ dataset: { l: cid() } }); $('#op-l').value = cid(); INP.obPerm($('#op-l'));
    const rad = $('input[name="op-lt"][value="office"]'); ok('CH-37 office not bookable before approval (disabled, with a reason)', rad.disabled && rad.title === 'Needs an approved Academy-office observation request');
    rad.disabled = false; rad.checked = true; INP.obLt(rad); const n = C7().observations.length; prim();
    ok('CH-37 a direct booking without approval is refused and logged', C7().observations.length === n && ADMIN.audit.some(a => /Blocked: office observation without an approved request/.test(a.action))); closeModal();
    ok('CH-37 workplace observations unchanged (Workplace still selectable)', (ACT.obPropose({ dataset: {} }), !$('input[name="op-lt"][value="work"]').disabled)); closeModal();
    coA(); go('c-dashboard'); ok('CH-37 Coordinator dashboard: request panel with Approve / Reject', /Academy-office observation requests/.test(main()) && !!app().querySelector('[data-act="chOrDecide"][data-a="approve"][data-id="' + i.id + '"]'));
    go('c-learner', { id: cid() }); ok('CH-37 Coordinator learner record: panel + "Not shown" exception', !!app().querySelector('.ch-orcard [data-act="chOrDecide"]') && /except Academy-office observation requests for your batches/.test(main()));
    ACT.chOrDecide({ dataset: { id: i.id, a: 'approve' } }); prim(); ok('CH-37 reason required to decide', !!MODAL && /Enter a reason/.test(mroot().textContent));
    document.querySelector('#rsn').value = 'Agreed — workplace closed.'; prim();
    ok('CH-37 Coordinator approves → Approved, recorded under the Coordinator', i.status === 'Approved' && r.status === 'Approved' && i.decidedBy === 'Dr Helen Carter' && C7().notifs.some(x => /approved/.test(x.title)));
    closeModal(); S.coo.v = 'B'; cooEnter(); S.signedIn = true; ACT.chOrDecide({ dataset: { id: i.id, a: 'reject' } }); ok('CH-37 another batch\'s Coordinator is refused (logged)', !MODAL && ADMIN.audit.some(a => a.action === 'Blocked: office observation decision'));
    asSarah(); book7(cid(), 9); const o = C7().observations[0];
    ok('CH-37 observation assessor books the office (location dropdown) → request Booked', o.locType === 'office' && o.office && o.office.name === 'Luton office' && r.status === 'Booked' && r.obsId === o.id);
    ok('CH-38 no fee until the observation is confirmed', !STORE.chFees.some(f => f.lid === cid()));
    learner('C'); ACT.obsAccept({ dataset: { id: o.id } }); prim(); render();
    const f = STORE.chFees.find(x => x.lid === cid());
    ok('CH-38 first confirmed observation raises the fee: £70 fully assisted, due on the observation date', !!f && f.amount === 70 && f.support === 'Fully assisted' && f.due === o.at && f.status === 'Due' && C7().notifs.some(x => /Observation fee due/.test(x.title)));
    asSarah(); ACT.obPropose({ dataset: { l: cid() } }); $('#op-l').value = cid(); INP.obPerm($('#op-l')); $('#op-d').value = D(20, '10:00').slice(0, 16); prim(); const w2 = C7().observations[0]; learner('C'); ACT.obsAccept({ dataset: { id: w2.id } }); prim(); render();
    ok('CH-38 a second confirmed observation (workplace) never raises a second fee', STORE.chFees.filter(x => x.lid === cid()).length === 1);
    asSarah(); go('t-obs'); const ob = tasObs().find(x => x.id === 'C-' + o.id) || tasObs().find(x => x.lid === cid() && x.locType === 'office');
    ok('CH-40 rescheduling has no effect on the fee', (() => { const before = JSON.stringify(f); o.status = 'Rescheduled'; o.newAt = D(30); render(); return JSON.stringify(f) === before; })());
  });

  await T('CH-37 Coordinator advice → learner consent; CH-43 withdrawal', async () => {
    fresh(); coA(); go('c-learner', { id: cid() }); ACT.chOrAdvise({ dataset: { id: cid() } }); document.querySelector('#rsn').value = 'Your workplace can\'t host the observation.'; prim();
    const r = STORE.chOffReq.find(x => x.lid === cid());
    ok('CH-37 advice: Awaiting consent, no approval item yet', r && r.status === 'Awaiting consent' && !r.qid && !ADMIN.queue.some(i => i.type === 'Office observation request' && i.data.req === r.id));
    learner('C'); go('dashboard'); ok('CH-37 learner dashboard: Action needed consent item', /Agree to an Academy-office observation\?/.test(main()));
    go('observations'); ok('CH-37 Observations: Accept / Decline', !!app().querySelector('[data-act="chOrConsent"][data-a="accept"]') && !!app().querySelector('[data-act="chOrConsent"][data-a="decline"]'));
    ACT.chOrConsent({ dataset: { id: r.id, a: 'decline' } }); prim();
    ok('CH-37 decline recorded, Coordinator told, no approval item', r.status === 'Declined' && !r.qid && STORE.coo.notifs.some(n => /declined/.test(n.t)));
    coA(); go('c-learner', { id: cid() }); ACT.chOrAdvise({ dataset: { id: cid() } }); document.querySelector('#rsn').value = 'Second try.'; prim(); const r2 = STORE.chOffReq.filter(x => x.lid === cid()).slice(-1)[0];
    learner('C'); ACT.chOrConsent({ dataset: { id: r2.id, a: 'accept' } }); prim();
    ok('CH-37 accept → "Office observation request" item', r2.status === 'Pending approval' && qItem(r2.qid).type === 'Office observation request');
    acaEnter('KA'); S.signedIn = true; ok('CH-37 Academic Admin has it awaiting', awaitingMe(qItem(r2.qid)));
    const q = qItem(r2.qid); q.raised = D(-8); allQueue(); ok('CH-37 after 7 days → escalated to the Super Admin', q.status === 'Escalated');
    coA(); go('c-learner', { id: cid() }); ok('CH-37 escalated: no Approve/Reject for the Coordinator', !app().querySelector('.ch-orcard [data-act="chOrDecide"]') && /Escalated/.test(main()));
  });

  await T('CH-38 settings, support type, sponsored learner, Finance', async () => {
    fresh(); SA(); go('a-config');
    ok('CH-38 settings £70 / £100', /Observation fee — fully assisted\s*£70\.00/.test(main()) && /Observation fee — self-paced\s*£100\.00/.test(main()));
    role('sysA'); go('a-config'); ok('CH-38 fee settings locked for the System Admin', !app().querySelector('[data-act="cfgEdit"][data-id="CF-OFA"]'));
    FA(); go('f-plans'); ok('CH-38 Finance → Payment Plans: fee settings, editable', /Observation fees/.test(main()) && !!app().querySelector('.ch-fees [data-act="cfgEdit"][data-id="CF-OFS"]'));
    ACT.cfgEdit({ dataset: { id: 'CF-OFA' } }); document.querySelector('#cv').value = '£75.00'; document.querySelector('#rsn').value = 'New price list'; press();
    ok('CH-38 fee change audited', ADMIN.audit.some(a => a.entity === 'Observation fee — fully assisted' && a.after === '£75.00') && chFeeAmt('Fully assisted') === 75);
    SA(); go('a-programmes', { id: 'NV-L3D', tab: 'support' });
    // CB1 (PD-CB-01) supersedes the "Support type" tab: was /Support type/ in the tab bar; now the same control is the Fees & Payments
    // section's "Observation fee rate" panel (its Save button still says "Save support type"); the P-31 tag and the saved value are unchanged
    ok('CH-38 programme → Fees & Payments → Observation fee rate (old "support" link), tagged Pending client (P-31), NV-L3D Self-paced', !!app().querySelector('.cb-sec.cur[data-tab="payments"]') && !!app().querySelector('.cb-panels .tab[data-tab="support"][aria-selected="true"]') && /Save support type/.test(main()) && [...app().querySelectorAll('.tbd')].some(x => /P-31/.test(x.textContent)) && document.querySelector('input[name="ch-sup"][value="Self-paced"]').checked);
    ok('CH-38 default Fully assisted; world C\'s programme stays Fully assisted', chSupportOf('NV-L3') === 'Fully assisted' && chSupportOfCourse(STORE.worlds.C.nvq.title) === 'Fully assisted' && chFeeAmt(chSupportOf('NV-L3D')) === 100);
    learner('D'); go('payments'); const fd_ = STORE.chFees.find(x => x.lid === STORE.worlds.D.me.id);
    ok('CH-38 sponsored learner pays the fee: fee card with Pay now', !!fd_ && /Your course fees are covered by/.test(main()) && !!app().querySelector('.ch-feecard [data-act="chFeePay"]') && /Non-refundable/.test(main()));
    ACT.chFeePay({ dataset: { id: fd_.id } }); prim(); await wait(3000); closeModal(); render();
    ok('CH-38 card payment → Paid; transaction "Observation fee"', fd_.status === 'Paid' && W.tx.some(t => /^Observation fee — /.test(t.desc) && t.amount === fd_.amount));
    FA(); go('f-ledger'); const lf = DT.fledger.filters.find(f => f.l === 'For');
    ok('CH-38 ledger "For" filter: Observation fee; no VAT on it', lf.opts.includes('Observation fee') && allTx().filter(t => /^Observation fee/.test(t.course)).every(t => lf.get(t) === 'Observation fee' && t.vatPct == null));
    const k = STORE.chFees.find(x => x.name === 'Kofi Asante'); k.due = D(-3); go('f-overdue');
    ok('CH-38 Finance → Overdue: fees after the due date, with reminder', /Observation fees overdue/.test(main()) && /Kofi Asante/.test(main()) && !!app().querySelector('[data-act="chFeeRemind"]'));
    ok('CH-40 no refund action on a fee (non-refundable)', !app().querySelector('.ch-feecard [data-act*="efund"]') && STORE.chFees.every(x => ['Due', 'Paid', 'Waived'].includes(x.status)));
  });

  await T('CH-38 bank transfer; CH-41 payment cards', async () => {
    fresh(); learner('C'); const f = chFeeRaise(cid(), C7().nvq.title, D(5), 'C'); go('payments');
    ok('CH-41 progress dial + Paid / Pending / Next due cards', !!app().querySelector('.ch-dial') && ['Paid', 'Pending', 'Next due'].every(x => [...app().querySelectorAll('.ch-paycards .card')].some(c => c.textContent.startsWith(x))));
    const t = chPlanTotals(C7()); ok('CH-41 dial = % of the programme fee paid', app().querySelector('.ch-dial').textContent.trim() === Math.round(t.paid / t.total * 100) + '%');
    ok('CH-41 Observation fee card: amount, status, Pay now / Bank transfer', /Observation fee/.test(app().querySelector('.ch-feecard').textContent) && !!app().querySelector('[data-act="chFeeBank"]'));
    ACT.chFeeBank({ dataset: { id: f.id } }); ok('CH-38 bank transfer shows bank details (CH-35) and a reference', /Lloyds Bank/.test(mroot().textContent) && /Reference/.test(mroot().textContent)); prim();
    const x = STORE.chBank.find(y => y.fee === f.id); ok('CH-38 awaiting confirmation; no second Pay now', !!x && x.status === 'Awaiting confirmation' && !app().querySelector('[data-act="chFeePay"]'));
    FA(); const tg = payTargets().find(t2 => t2.chb === x); ok('CH-38 Finance can record it', !!tg && /observation fee/.test(tg.label)); recordPayment(tg, x.amount, 'BACS-88001', 'Bank transfer', 'Received');
    ok('CH-38 recorded → fee Paid; ledger once', f.status === 'Paid' && allTx().filter(t2 => t2.ref === 'BACS-88001').length === 1);
    learner('A'); go('payments'); ok('CH-41 no fee card without a fee', !app().querySelector('.ch-feecard'));
  });

  await T('CH-39 waiver: System Admin → Finance review → Super Admin', async () => {
    fresh(); const k = STORE.chFees.find(x => x.name === 'Kofi Asante'), w = qItem('AQ-9101');
    ok('CH-39 mock: Kofi Asante\'s waiver at Finance review', w && w.type === 'Observation fee waiver' && w.stage === 'review' && w.first === FIN_A && k.waiver === 'AQ-9101');
    FA(); ok('CH-39 awaiting the Finance Admin', awaitingMe(w)); go('a-queue', { id: 'AQ-9101' });
    ok('CH-39 Finance sees "Recommend — forward to Super Admin"', /Recommend — forward to Super Admin/.test(main()));
    applyDecision(w, 'approve', 'Checked.', {});
    ok('CH-39 Finance review → forwarded (still Pending, Super Admin final), fee still Due', w.status === 'Pending' && w.stage === 'final' && w.first === 'Super Administrator' && k.status === 'Due');
    FA(); ok('CH-39 no longer awaiting Finance', !awaitingMe(w));
    SA(); applyDecision(w, 'approve', 'Final approval.', {}); ok('CH-39 Super Admin final → Waived', w.status === 'Approved' && k.status === 'Waived');
    const g = STORE.chFees.find(x => x.lid === STORE.worlds.D.me.id); role('sysA'); go('a-learner', { id: g.lid, tab: 'payments' });
    ok('CH-39 Learner 360 → Payments: fee card with "Waive observation fee" (System Admin)', !!app().querySelector('[data-act="chFeeWaive"][data-id="' + g.id + '"]'));
    ACT.chFeeWaive({ dataset: { id: g.id } }); document.querySelector('#rsn').value = 'Hardship.'; press();
    const wi = qItem(g.waiver); ok('CH-39 System Admin raises → Finance review', wi && wi.status === 'Pending' && wi.stage === 'review' && wi.raisedBy === ADMIN.me.name && g.status === 'Due');
    applyDecision(wi, 'approve', 'self', {}); ok('CH-39 the System Admin can\'t approve their own waiver', wi.status === 'Pending' && wi.stage === 'review');
    wi.raised = D(-8); allQueue(); ok('CH-39 after 7 days: reminder, not escalation', wi.status === 'Pending' && wi.reminder && !wi.escalated);
    FA(); ACT.chFeeWaive({ dataset: { id: g.id } }); ok('CH-39 Finance can\'t raise a waiver', !MODAL || !document.querySelector('#rsn'));
    SA(); const h = chFeeRaise('IA-L-30200', 'Level 3 Diploma in Adult Care (England)', D(4), null, true); h.name = 'Oliver Bennett'; go('a-learner', { id: 'IA-L-30200', tab: 'payments' }); ACT.chFeeWaive({ dataset: { id: h.id } }); document.querySelector('#rsn').value = 'Academy error.'; press();
    ok('CH-39 Super Admin\'s own waiver applies immediately', h.status === 'Waived' && qItem(h.waiver).saImmediate);
  });

  /* ---------- Records (Batch 7b) ---------- */
  await T('CH records (Batch 7b)', async () => {
    fresh(); ACT.scOpen(); go('cd-log');
    const r = id => { const tr = [...app().querySelectorAll('main tr')].find(x => x.textContent.trim().startsWith(id)); return tr ? tr.textContent : ''; };
    ok('Decisions Log: CH-37 – CH-41, CH-43 Applied (Batch 7b)', ['CH-37', 'CH-38', 'CH-39', 'CH-40', 'CH-41', 'CH-43'].every(id => /Applied \(Batch 7b\)/.test(r(id)) && /13 Oct 2026/.test(r(id))) && /S8/.test(r('CH-43')));
    const s23 = SC_LIST().find(x => x[0] === '23'), s7 = SC_LIST().find(x => x[0] === '7');
    ok('Scenario #23 "Academy-office observation and fee" — 8 steps, no transfer step', !!s23 && s23[1] === 'Academy-office observation and fee' && s23[3].length === 8 && !s23[3].some(x => /transfer to new date|moves automatically/i.test(x.text)) && /first confirmed observation/.test(s23[3][3].text) && /waiver/.test(s23[3][5].text));
    // W0 (PD-W0-05) supersedes "Coordinator approves" (step 8): the Coordinator advised the request, so an Academic Admin approves it
    ok('Scenario #7: office steps use the request flow', s7[3].length === 10 && /advises an Academy-office observation/.test(s7[3][5].text) && /An Academic Admin approves it in the Approvals Queue/.test(s7[3][7].text) && !s7[3].some(x => /Assessor proposes an Academy office observation instead/.test(x.text)));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 7b/.test(s.textContent));
    ok('UX Changelog: Batch 7b entry', !!ux && ['CH-37:', 'CH-38:', 'CH-39:', 'CH-40:', 'CH-41:', 'CH-43:'].every(k => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(k))));
    SA(); ACT.qRouting(); const rows = [...document.querySelectorAll('#modal-root tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()).join(' | '));
    ok('Who approves what: 19 rows incl. the two 7b types', rows.length === 19 && rows.includes('Observation fee waiver | System Admin | Finance Admin review, then Super Admin (final) | Reminder') && rows.some(x => x.startsWith('Office observation request |'))); closeModal();
    go('a-index'); ok('Admin index: 7b entries', ['a-queue.AQ-9201', 'a-queue.AQ-9101', 'a-learner.IA-L-30718.payments', 'a-programmes.NV-L3D.support'].every(t => !!app().querySelector('[data-t="' + t + '"]')));
    coA(); go('c-index'); ok('Coordinator index: 7b entries', !!app().querySelector('[data-t="c-learner.' + cid() + '"]') && !!app().querySelector('[data-t="c-dashboard"]'));
    FA(); go('f-index'); ok('Finance index: 7b entries', ['a-queue.AQ-9101', 'f-overdue', 'f-plans'].every(t => !!app().querySelector('[data-t="' + t + '"]')));
  });

  /* ================= Batch 7c ================= */
  // CH-42 nearest batch and admin batch changes, P-32 released seat, P-33 Coordinator ≠ assessor
  const L3T = 'Level 3 Diploma in Adult Care (England)', B7 = c => chBatch(c);
  const signedB = () => { ACT.chStep({ dataset: { s: '5' } }); return STORE.worlds.B; };

  await T('CH-42 nearest batch rule and started', async () => {
    fresh();
    ok('CH-42 UAE learner: nearest online or UAE batch with a place (Abu Dhabi Cohort 1; online batches full; not Leicester)', chNearest(L3T, 'United Arab Emirates').code === 'L3AC-DEC26-AUH');
    ok('CH-42 UK learner: Leicester Cohort 8 (earliest UK/online with a place)', chNearest(L3T, 'United Kingdom').code === 'L3AC-NOV26-LEI');
    ok('CH-42 other country: online only; none with a place → none (Contact the Academy)', chNearest(L3T, 'India') === null);
    B7('L3AC-OCT26-ONL').enrolled--; ok('CH-42 an online batch with a place is nearest for everyone', chNearest(L3T, 'India').code === 'L3AC-OCT26-ONL' && chNearest(L3T, 'United Arab Emirates').code === 'L3AC-OCT26-ONL'); B7('L3AC-OCT26-ONL').enrolled++;
    ok('CH-42 "started": In Progress / Completed, or start date passed', chStarted(B7('L3AC-JAN26')) && chStarted({ status: 'Open', start: D(0, '00:00') }) && !chStarted(B7('L3AC-DEC26-AUH')));
    learner('B'); W.me.country = 'India'; go('admission'); ACT.suBack();
    ok('CH-42 no batch with a place → "Contact the Academy" with the contact details', /No batch has a place right now/.test(main()) && /020 3983 0282/.test(main()));
    ACT.suNext(); ok('CH-42 can\'t continue without a batch', stepCur() === 'Personal details');
    fresh(); ACT.chScInstalment(); ok('CH-42 the nearest batch starts in under 28 days → instalments only', W.signup.batch === 'L3AC-OCT26-ONL' && !$('input[name="su-opt"][value="deposit"]'));
  });

  await T('CH-42 Assign / change batch before the start', async () => {
    fresh(); const w = signedB(), au = B7('L3AC-DEC26-AUH'), fe = B7('L3AC-FEB27-AUH'), e0 = [au.enrolled, fe.enrolled], dep = JSON.stringify(w.admission.deposit), plan = JSON.stringify(w.plans.find(p => p.e === 'nvq')), sig = JSON.stringify(w.signup.sig);
    acaEnter('KA'); S.signedIn = true; go('a-learner', { id: w.me.id, tab: 'enrolments' });
    ok('CH-42 Academic Admin: Learner 360 → Enrolments: "Assign / change batch"', !!app().querySelector('[data-act="chMoveBatch"][data-id="' + w.me.id + '"]'));
    ACT.chMoveBatch({ dataset: { id: w.me.id } }); const opts = [...document.querySelectorAll('#ch-mv-b option')].map(o => o.value);
    ok('CH-42 only not-started batches of the same course with a place', opts.length > 0 && opts.every(c => B7(c).course === L3T && !chStarted(B7(c)) && chHasPlace(B7(c)) && c !== 'L3AC-DEC26-AUH') && !opts.includes('L3AC-JAN26'), opts.join());
    closeModal(); role('bizA'); go('b-batchassign');
    ok('CH-42 Business Admin: "Batch assignment" — learner, course and batch only', S.route === 'b-batchassign' && /Batch assignment/.test(main()) && ['Learner', 'Course', 'Batch', 'Status'].every(x => [...app().querySelectorAll('main thead th')].some(t => t.textContent.trim() === x)) && ![...app().querySelectorAll('main thead th')].some(t => /Payment|Fee|Progress|Grade|Amount/.test(t.textContent)) && !/£|Payments|Assignment \d|Submission/.test(app().querySelector('main table').textContent));
    ACT.chMoveBatch({ dataset: { id: w.me.id } }); document.querySelector('#ch-mv-b').value = 'L3AC-FEB27-AUH'; press(); ok('CH-42 reason required', !!MODAL && /Enter a reason/.test(mroot().textContent));
    document.querySelector('#rsn').value = 'Family commitments in December.'; press();
    ok('CH-42 moved: counts, batch fields; deposit, plan and offer letter unchanged', w.signup.batch === 'L3AC-FEB27-AUH' && /Abu Dhabi Cohort 2/.test(w.nvq.batch) && au.enrolled === e0[0] - 1 && fe.enrolled === e0[1] + 1 && JSON.stringify(w.admission.deposit) === dep && JSON.stringify(w.plans.find(p => p.e === 'nvq')) === plan && JSON.stringify(w.signup.sig) === sig);
    ok('CH-42 audited; learner and both Coordinators notified', ADMIN.audit.some(a => a.action === 'Batch changed (before start)' && a.reason === 'Family commitments in December.') && w.notifs.some(n => /Your batch has changed/.test(n.title)) && STORE.coo.notifs.filter(n => /Learner batch changed/.test(n.t)).length >= 2);
    const c = STORE.worlds.C.me.id; go('b-batchassign'); const row = [...app().querySelectorAll('main tbody tr')].find(tr => tr.textContent.includes(c));
    ok('CH-42 batch started → action hidden', !!row && !row.querySelector('[data-act="chMoveBatch"]') && /Started/.test(row.textContent));
    const a0 = ADMIN.audit.length; ACT.chMoveBatch({ dataset: { id: c } });
    ok('CH-42 direct call after the start refused and logged', !MODAL && ADMIN.audit.length === a0 + 1 && ADMIN.audit[0].action === 'Blocked: batch change' && ADMIN.audit[0].reason === "Learners can't be moved after their batch has started.");
    learner('C'); ACT.chMoveBatch({ dataset: { id: c } }); ok('CH-42 a learner can\'t change a batch', !MODAL);
    acaEnter('KA'); S.signedIn = true; go('a-batches'); ok('CH-42 rule wording: "No batch changes after the batch has started"', /No batch changes after the batch has started/.test(main()) && !/never transferred between batches/.test(main()));
    go('a-transfer'); ok('CH-42 blocked URL page reworded', /No batch changes after the batch has started/.test(main()) && !/Learner transfer is not permitted/.test(main()));
  });

  await T('P-32 released seat: out of the batch, deposit kept, read-only, sign up again', async () => {
    fresh(); const au = B7('L3AC-DEC26-AUH'), n0 = au.enrolled;
    learner('B'); S.edge = 'seatReleased'; setVariant('B'); go('dashboard'); const w = W;
    ok('P-32 1: removed from the batch; seat available; enrolled count back down', !w.signup.batch && w.signup.releasedFrom === 'L3AC-DEC26-AUH' && au.enrolled === n0 && !chCohLids(au).includes(w.me.id));
    ok('P-32 2: deposit kept', w.admission.deposit.paid && w.admission.deposit.kept && w.admission.deposit.released);
    ok('P-32 3: banner and Sign up again', /Your seat was released because the balance wasn't paid\. You can still view your materials\. To continue, sign up again\./.test(html()) && !!app().querySelector('[data-act="chSignAgain"]'));
    go('assignments'); ok('P-32 3: materials and past work stay viewable (no lock page)', !app().querySelector('main .lockpage'));
    const a0 = ADMIN.audit.length; ACT.reviewSubmit({ dataset: { id: (w.assignments[0] || {}).id } }); ACT.chOrRequest(); ACT.pdConfirm();
    ok('P-32 3: no submissions, PD or office requests (refused and logged)', !MODAL && ADMIN.audit.filter(a => a.action === 'Blocked: seat released').length >= 3);
    tas('A'); ok('P-32 3: no marking for the released learner', !tasSubs(true).some(s => s.L.lid === w.me.id));
    ok('P-32 5: learner, Coordinator and Finance notified', w.notifs.some(n => /Your seat was released/.test(n.title)) && STORE.coo.notifs.some(n => n.t === 'Seat released' && n.to === au.coord) && STORE.fin.notifs.some(n => /Seat released — deposit kept/.test(n.t)));
    learner('B'); S.edge = 'seatReleased'; setVariant('B'); ACT.chSignAgain(); S.edge = 'none';
    ok('P-32 4: sign up again — normal flow, step 1 with the nearest batch and instalments only', S.route === 'admission' && stepCur() === 'Personal details' && /Your batch:/.test(main()) && /instalments only/.test(main()));
    ACT.suNext(); ok('P-32 4: documents and signed offer letter reused — straight to Payment', stepCur() === 'Payment' && !!W.signup.sig);
    ok('P-32 4: no deposit option for that course', !$('input[name="su-opt"][value="deposit"]') && /Instalments only/.test(main()));
    const b2 = B7(W.signup.batch), e2 = b2.enrolled; setUi('suMethod', 'bank'); ACT.suPay();
    ok('P-32 4: signed up again with instalments; seat taken; banner gone', W.signup.done && W.signup.pay.opt === 'instalment' && b2.enrolled === e2 + 1 && !W.admission.deposit.released && W.admission.deposit.kept && !document.querySelector('[data-act="chSignAgain"]'));
  });

  await T('P-33 Coordinator can\'t be an assessor on their own batch', async () => {
    fresh(); coord('B'); go('c-batches', { id: 'L2DC-MAR26' }); const pan = app().querySelector('.ch-assess');
    ok('P-33 Assessors panel: the Coordinator is not offered', !!pan && ['asg', 'pd', 'obs'].every(k => ![...pan.querySelectorAll('#ch-as-' + k + ' option')].some(o => o.textContent === 'Michael Osei')) && /can't be its assignment, PD or observation assessor/.test(pan.textContent));
    const sel = document.querySelector('#ch-as-obs'); sel.insertAdjacentHTML('beforeend', '<option>Michael Osei</option>'); sel.value = 'Michael Osei'; const a0 = ADMIN.audit.length; ACT.chAssessSave({ dataset: { b: 'L2DC-MAR26' } });
    ok('P-33 a forced save is refused and logged', !MODAL && chAllocOf(MAR()).obs === 'James Pryce' && ADMIN.audit.length === a0 + 1 && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor');
    go('c-learner', { id: 'IA-L-33100' }); ACT.chOvSet({ dataset: { l: 'IA-L-33100', k: 'pd' } });
    ok('P-33 override: the Coordinator is not offered', ![...document.querySelectorAll('#ch-ov-n option')].some(o => o.textContent === 'Michael Osei'));
    document.querySelector('#ch-ov-n').insertAdjacentHTML('beforeend', '<option>Michael Osei</option>'); document.querySelector('#ch-ov-n').value = 'Michael Osei'; document.querySelector('#rsn').value = 'x'; prim();
    ok('P-33 forced override refused and logged', !chOvOf('IA-L-33100', 'pd') && ADMIN.audit[0].action === 'Blocked: Coordinator as assessor'); closeModal();
    ok('P-33 mock: no batch has its Coordinator as an assessor or override', ADMIN.batches.every(b => !b.coord || !CH_AROLES.some(([k]) => chAllocOf(b)[k] === b.coord)) && Object.entries(STORE.chAssessOv).every(([lid, o]) => { const b = chBatchOfLid(lid); return !b || !Object.values(o).some(x => x.name === b.coord); }));
    const s21 = SC_LIST().find(x => x[0] === '21'); ok('P-33 Scenario #21 text: James Pryce observes, not Michael Osei', /James Pryce \(assignments and observations\)/.test(s21[3][0].text) && /James, the observation assessor/.test(s21[3][3].text));
  });

  /* ---------- Records (Batch 7c) ---------- */
  await T('CH records (Batch 7c)', async () => {
    fresh(); ACT.scOpen(); go('cd-log');
    const r = id => { const tr = [...app().querySelectorAll('main tr')].find(x => x.textContent.trim().startsWith(id)); return tr ? tr.textContent : ''; };
    ok('Decisions Log: CH-42 Applied (Batch 7c)', /Applied \(Batch 7c\)/.test(r('CH-42')) && /13 Oct 2026/.test(r('CH-42')));
    const s16 = SC_LIST().find(x => x[0] === '16'), s24 = SC_LIST().find(x => x[0] === '24');
    ok('Scenario #16: batch assigned automatically', /is assigned the nearest batch with a place — Abu Dhabi Cohort 1/.test(s16[3][0].text) && !s16[3].some(x => /chose Abu Dhabi/.test(x.text)));
    ok('Scenario #24 "Batch reassignment before start": move, refusal, seat released, sign up again', !!s24 && s24[1] === 'Batch reassignment before start' && s24[3].length === 5 && /deposit and seat hold move/.test(s24[3][1].text) && /refused and logged/.test(s24[3][2].text) && /Seat released/.test(s24[3][3].text) && /only instalments/.test(s24[3][4].text));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 7c/.test(s.textContent));
    ok('UX Changelog: Batch 7c entry', !!ux && ['CH-42:', 'P-32', 'P-33:'].every(k => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(k))));
    SA(); go('a-index'); ok('Admin index: 7c entries', !!app().querySelector('[data-t="a-learner.IA-L-31188.enrolments"]') && !!app().querySelector('[data-t="a-batches.L2DC-MAR26.staff"]'));
    role('bizA'); go('b-index'); ok('Business index: Batch assignment', !!app().querySelector('[data-t="b-batchassign"]'));
  });

  /* ================= New NVQ programme (gap fix) ================= */
  const np = () => (STORE.chNewProgs || []).slice(-1)[0];
  const fill8 = o => Object.entries(o).forEach(([k, v]) => { const e = document.querySelector(k); e.value = v; });
  const add8 = (act, ds, vals) => { ACT[act]({ dataset: ds }); fill8(vals); return prim(); };
  // CB2 (PD-CB-14) supersedes the creation dialog: "New NVQ programme" opens Course Details of an unsaved course (no dialog); the
  // observation question is required; "Save and continue" (ACT.cbDetCreate) creates the Draft and returns false when refused
  let codeN = 0; // CB2 correction: a course code is required for a new course
  const create8 = (obs = 'no') => { const r = document.querySelector('#np-obs-' + obs); if (r) r.checked = true; const c = document.querySelector('#np-code'); if (c && !c.value) c.value = 'NP' + (++codeN); return ACT.cbDetCreate(); };

  await T('New NVQ programme: who, details, Draft Version 1', async () => {
    fresh(); acaEnter('KA'); S.signedIn = true; go('a-programmes');
    ok('NP Academic Admin: "New NVQ programme" on NVQ Programmes', !!app().querySelector('[data-act="chProgNew"]'));
    SA(); go('a-programmes'); ok('NP Super Admin: button shown', !!app().querySelector('[data-act="chProgNew"]'));
    role('sysA'); go('a-programmes'); ok('NP System Admin: button shown', !!app().querySelector('[data-act="chProgNew"]'));
    role('finA'); ACT.chProgNew(); ok('NP Finance can\'t create a programme (refused, logged)', !MODAL && ADMIN.audit[0].action === 'Blocked: create programme');
    acaEnter('KA'); S.signedIn = true; go('a-programmes'); ACT.chProgNew();
    ok('NP details (Course Details page, not a dialog): title, level, reference, duration, description, price (GBP), Support type with the P-31 tag, the observation question', !MODAL && S.params.id === 'new' && ['#np-t', '#np-l', '#np-r', '#np-d', '#np-ds', '#np-p', '#np-obs-yes', '#np-obs-no'].every(s => document.querySelector(s)) && document.querySelectorAll('input[name="np-s"]').length === 2 && /Pending client: Fully assisted vs self-paced/.test(main()));
    ok('NP required fields', ACT.cbDetCreate() === false && /Enter a title/.test(main()));
    ACT.chProgNew(); fill8({ '#np-t': 'Level 3 Diploma in Adult Care (England)', '#np-r': 'QN 1', '#np-p': '2000' }); ok('NP title must be unique', create8() === false && /already exists/.test(main()) && !(STORE.chNewProgs || []).some(p => !p.seed)); ACT.chProgNew();
    fill8({ '#np-t': 'Level 4 Certificate in Care Leadership', '#np-l': 'Level 4', '#np-r': 'QN 610/9999/1', '#np-d': '12', '#np-du': 'months' /* E1-A: number + unit (was free text '12 months') */, '#np-p': '2600', '#np-ds': 'For team leaders.' }); document.querySelector('input[name="np-s"][value="Self-paced"]').checked = true; create8();
    const pr = np();
    ok('NP created as Draft, Version 1, with details and Support type', !!pr && pr.status === 'Draft' && pr.version === 1 && pr.price === 2600 && pr.level === 'Level 4' && chSupportOf(pr.id) === 'Self-paced' && S.route === 'a-programmes' && S.params && true);
    ok('NP audited', ADMIN.audit.some(a => a.module === 'NVQ Programmes' && a.action === 'Programme created (Draft, Version 1)' && a.entity.includes(pr.id)));
    // CB1 (PD-CB-01) supersedes: was the seven-step wizard bar with Observations third; now the seven builder sections, Observations fourth
    go('a-programmes', { id: pr.id, tab: 'details' }); ok('NP course builder: seven sections (Observations is section 4), Course Details current, Draft chip', app().querySelectorAll('.cb-nav .cb-sec').length === 7 && app().querySelectorAll('.cb-nav .cb-sec')[3].textContent.includes('Observations') && !!app().querySelector('.cb-sec.cur[data-tab="details"]') && /Draft/.test(main()) && /Version 1/.test(main()));
    document.querySelector('#np-p').value = '2700'; ACT.ch8SaveDetails({ dataset: { id: pr.id } }); ok('NP details editable while Draft, audited', pr.price === 2700 && ADMIN.audit[0].action === 'Details changed');
    go('a-programmes'); ok('NP listed on NVQ Programmes as Draft', /Level 4 Certificate in Care Leadership/.test(main()));
  });

  await T('New NVQ programme: structure, letter, documents, plan, review, publish', async () => {
    fresh(); acaEnter('KA'); S.signedIn = true; go('a-programmes'); ACT.chProgNew();
    fill8({ '#np-t': 'Level 4 Certificate in Care Leadership', '#np-l': 'Level 4', '#np-r': 'QN 610/9999/1', '#np-d': '12', '#np-du': 'months' /* E1-A: number + unit (was free text '12 months') */, '#np-p': '2600' }); create8('yes' /* CB4 (PD-CB-30): an Observation Learning Outcome is chosen below — only offered when the course has observations */); const pr = np(), id = pr.id;
    go('a-programmes', { id, tab: 'review' }); const pub0 = app().querySelector('[data-act="ch8Publish"]');
    ok('NP review: blocking items listed; Publish disabled with a reason', /Add at least one unit/.test(main()) && /No offer letter uploaded/.test(main()) && pub0.disabled && !!pub0.title);
    ACT.ch8Publish({ dataset: { id } }); ok('NP publish refused while items are missing (logged)', /Can't publish/.test(MODAL.title) && pr.status === 'Draft' && ADMIN.audit[0].action === 'Blocked: publish (items missing)'); closeModal();
    go('a-programmes', { id, tab: 'structure' });
    add8('ch8AddUnit', { id }, { '#u-c': 'u410', '#u-t': 'Lead care teams' });
    add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'Team leadership', '#m-ab': 'A/650/4101' });
    add8('ch8AddMod', { id, u: 0 }, { '#m-t': 'No code', '#m-ab': '' }); ok('NP module needs its awarding-body code', !!MODAL && /awarding-body code/.test(mroot().textContent)); closeModal();
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Understand leadership styles', '#lo-y': 'Knowledge' });
    add8('ch8AddLo', { id, u: 0, m: 0 }, { '#lo-t': 'Lead a team shift', '#lo-y': '' });
    add8('ch8AddCrit', { id, u: 0, m: 0, l: 0 }, { '#c-d': 'Compare two leadership styles', '#c-e': 'Written account' });
    add8('ch8AddCrit', { id, u: 0, m: 0, l: 1 }, { '#c-d': 'Allocate tasks fairly', '#c-e': 'Observed during a shift' });
    const t = ch8Tree(id);
    ok('NP structure: unit → module (awarding-body code) → Learning Outcomes → criteria', t.length === 1 && t[0].code === 'U410' && t[0].mods[0].ab === 'A/650/4101' && t[0].mods[0].los.length === 2 && t[0].mods[0].los[0].crit[0].ev === 'Written account');
    ACT.ch8Key({ dataset: { id, u: 0, m: 0 } }); ACT.ch8KeySample(); prim(); ok('NP answer key per module (optional)', t[0].mods[0].key && /sample/.test(t[0].mods[0].key.file));
    go('a-programmes', { id, tab: 'review' }); ok('NP review: Learning Outcome without a type is blocking; uncovered criteria is a warning', /Learning Outcome without a type: U410 M1 LO2/.test(main()) && /not yet covered by assignments/.test(main()) && /Warning/.test(main()));
    go('a-programmes', { id, tab: 'structure' }); const sel = document.querySelector('[data-onchange="ch8LoType"][data-l="1"]'); sel.value = 'Observation'; INP.ch8LoType(sel);
    ok('NP Learning Outcome type set, audited', t[0].mods[0].los[1].type === 'Observation' && ADMIN.audit.some(a => a.action === 'Learning Outcome type set'));
    go('a-programmes', { id, tab: 'letter' }); ok('NP offer letter step: upload (existing tab)', !!app().querySelector('[data-act="chLetterUp"][data-id="' + id + '"]'));
    ACT.chLetterUp({ dataset: { id } }); ACT.chLetterSample(); document.querySelector('#rsn').value = 'First version'; press();
    go('a-programmes', { id, tab: 'letter' }); ok('NP offer letter uploaded: merge fields and preview', !!chLetterCur(id) && /\{\{full_name\}\}/.test(main()) && !!app().querySelector('[data-act="chLetterPrev"]'));
    // CB3 (PD-CB-22) supersedes the CH-8 quick-pick checkboxes: the one Required enrolment documents checklist (S4a) is the editor
    go('a-programmes', { id, tab: 'docs' }); ok('NP document checklist: the Required enrolment documents list (no quick-pick checkboxes)', !document.querySelector('.ch8-doc') && !!document.querySelector('.s4-ck [data-act="s4CkAdd"]'));
    ACT.s4CkAdd({ dataset: { p: id } }); fill8({ '#ck-n': 'Employer reference letter', '#ck-g': 'Optional.' }); document.querySelector('#ck-m').value = '0'; document.querySelector('#rsn').value = 'Optional reference'; press();
    ok('NP checklist saved, audited', ch8Docs(id).includes('Employer reference letter') && ADMIN.audit[0].action === 'Checklist item added');
    go('a-programmes', { id, tab: 'plan' }); ok('NP payment plan: Academic Admin read-only (Finance / Super Admin edit)', !document.querySelector('#pp-d') && /Set by Finance or the Super Admin/.test(main()));
    ACT.ch8SavePlan({ dataset: { id } }); ok('NP plan save refused for the Academic Admin (logged)', ADMIN.audit[0].action === 'Blocked: payment plan');
    // E2 (20 Oct 2026) supersedes: typing an amount while "Use the default deposit" is selected made it the programme's own deposit.
    // A custom deposit is now chosen explicitly ("Set a custom deposit amount for this programme"); the amount field is for that choice.
    SA(); go('a-programmes', { id, tab: 'plan' }); document.querySelector('input[name="pp-wdm"][value="own"]').checked = true; fill8({ '#pp-d': '400', '#pp-n': '8' }); ACT.ch8SavePlan({ dataset: { id } });
    ok('NP Super Admin sets the plan in GBP, audited', pr.plan.deposit === 400 && pr.plan.inst === 8 && ADMIN.audit[0].action === 'Payment plan saved');
    // E1 review correction: "Edit plan" opened NVQ Programmes, which the Finance Admin role can't open (was: '.ch8-plans [data-tab="plan"][data-id=…]');
    // it now opens Finance's own plan editor
    FA(); go('f-plans'); ok('NP Finance → Payment Plans: Edit plan opens Finance\'s plan editor', !!app().querySelector('.ch8-plans [data-act="s4PlanEdit"][data-p="' + id + '"]') && !app().querySelector('.ch8-plans [data-go="a-programmes"]'));
    acaEnter('KA'); S.signedIn = true; obsDecide(id); go('a-programmes', { id, tab: 'review' }); const pub = app().querySelector('[data-act="ch8Publish"]');
    ok('NP review: nothing blocking; Publish enabled', !pub.disabled && !/Blocking/.test(main()));
    ACT.ch8Publish({ dataset: { id } }); document.querySelector('#rsn').value = 'Ready'; press();
    ok('NP published: Active, Version 1, audited', pr.status === 'Active' && pr.version === 1 && ADMIN.audit.some(a => a.action === 'Programme published (Version 1)'));
    ok('NP available for sign-up (Browse) and fees', CATALOGUE.some(c => c.title === pr.title && c.kind === 'nvq' && c.price === 2600) && NVQ_FEES[pr.title] === 2600);
    go('a-programmes', { id }); ok('NP after publishing: links to the existing screens (assignments, batches)', /Published \(Version 1\)/.test(main()) && !!app().querySelector('[data-act="newBatch"]') && !app().querySelector('[data-act="ch8AddUnit"]'));
    ACT.newBatch(); ok('NP Create batch offers the new programme', [...document.querySelectorAll('#nb-co option')].some(o => o.textContent === pr.title)); closeModal();
    learner('A'); go('browse'); ok('NP learner Browse Courses lists it', /Level 4 Certificate in Care Leadership/.test(main()));
    fresh(); ok('NP reset removes created programmes (the two seeded ones stay)', !ADMIN.programmes.some(p => p.chNew && !p.seed) && ADMIN.programmes.filter(p => p.seed).length === 2 && !CATALOGUE.some(c => c.title === 'Level 4 Certificate in Care Leadership'));
  });

  await T('New NVQ programme: sign-up uses its checklist, offer letter and payment plan', async () => {
    fresh(); const pr = ch8Pr('NV-N2');
    ok('NP seeded: NV-N1 Draft (sample) and NV-N2 published with batch L2PW-DEC26-ONL', ch8Pr('NV-N1').status === 'Draft' && pr.status === 'Active' && ADMIN.batches.some(b => b.code === 'L2PW-DEC26-ONL' && b.course === pr.title));
    ok('NP its batches are in the nearest-batch rule', chNearest(pr.title, 'United Kingdom').code === 'L2PW-DEC26-ONL' && chNearest(pr.title, 'India').code === 'L2PW-DEC26-ONL');
    learner('A'); go('browse'); ok('NP Browse Courses lists the published programme', !!app().querySelector('[data-act="applyNvq"][data-id="k-NV-N2"]'));
    ACT.applyNvq({ dataset: { id: 'k-NV-N2' } }); prim(); const w = W;
    ok('NP sign-up started on the new programme', S.route === 'admission' && w.signup && w.signup.prog === 'NV-N2' && w.nvq.title === pr.title && stepCur() === 'Personal details');
    ok('NP step 1: nearest batch of the new programme', /Your batch: Online Cohort 1 \(Preparing to Work\)/.test(main()));
    ACT.suNext(); ok('NP step 2: the programme\'s document checklist', stepCur() === 'Documents' && w.docs.map(d => d.name).join('|') === ch8Docs('NV-N2').join('|') && w.docs.every(d => d.mand));
    w.docs.forEach(d => { d.status = 'Submitted'; d.file = 'doc.pdf'; }); render(); ACT.suNext();
    ok('NP step 3: the programme\'s offer letter', stepCur() === 'Offer letter' && main().includes(pr.title) && chLetterFor(w).file === 'NV-N2 offer letter v1.docx');
    setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign();
    ok('NP step 4: the programme\'s payment plan (deposit £150 or 3 instalments of £300)', stepCur() === 'Payment' && main().includes('Deposit (holds your seat) — ' + money(150, 'GBP')) && main().includes('3 monthly payments of ' + money(300, 'GBP')));
    setUi('suMethod', 'bank'); render(); ACT.suPay();
    const pl = w.plans.find(p => p.e === 'nvq');
    ok('NP completed: deposit £150, balance £750, seat taken', w.signup.done && w.signup.pay.amount === 150 && w.admission.deposit.min === 150 && w.admission.deposit.balance === 750 && pl.total === 900 && pl.rows[0].amount === 750 && chBatch('L2PW-DEC26-ONL').enrolled === 3);
    learner('B'); go('admission'); ok('NP existing demo programmes unchanged (Priya Raman: Level 3, £300 deposit)', W.nvq.title === 'Level 3 Diploma in Adult Care (England)' && !W.signup.prog && W.admission.deposit.min === 300);
    const s8 = SC_LIST().find(x => x[0] === '25')[3]; ok('Scenario #25 steps open the wizard pages (crawl coverage)', ['a-programmes.NV-N1.details', 'a-programmes.NV-N1.structure', 'a-programmes.NV-N1.letter', 'a-programmes.NV-N1.docs', 'a-programmes.NV-N1.plan', 'a-programmes.NV-N1.review', 'a-programmes.NV-N2'].every(t => s8.some(x => x.t === t)));
  });

  await T('New NVQ programme: Scenario #25 and records', async () => {
    fresh(); const s25 = SC_LIST().find(x => x[0] === '25');
    ok('Scenario #25 "Create a new NVQ programme": create → structure → offer letter → checklist → plan → publish → batch', !!s25 && s25[1] === 'Create a new NVQ programme' && s25[3].length === 8 && /signs up/.test(s25[3][7].text) && /New NVQ programme/.test(s25[3][0].text) && /Offer letter/.test(s25[3][2].text) && /Document checklist/.test(s25[3][3].text) && /Payment plan/.test(s25[3][4].text) && /publish/.test(s25[3][5].text) && /Coordinator and assessors/.test(s25[3][6].text));
    ACT.chSc25Structure(); const pr = (STORE.chNewProgs || [])[0]; ok('Scenario #25 sample draft: one Learning Outcome without a type', !!pr && ch8Check(pr).block.some(b => /without a type/.test(b)));
    ACT.scOpen(); go('ux-changelog'); ok('UX Changelog: new NVQ programme entry', /New NVQ programme \(setup wizard\)/.test(main()));
    SA(); go('a-index'); ok('Admin index: new NVQ programme entries with purposes', !!app().querySelector('[data-act="aJump"][data-t="a-programmes"]') && /create a Draft programme/.test(main()));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
