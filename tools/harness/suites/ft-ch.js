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
    ACT.regStart(); const vals = { '#rg-name': 'Reset Tester', '#rg-email': 'reset.tester@example.co.uk', '#rg-mob': '7700 955444', '#rg-country': 'United Kingdom', '#rg-pw': 'Abcdefgh12!x', '#rg-pw2': 'Abcdefgh12!x' };
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
    ok('Decisions Log: Batch 2 applied, CH-11 partly, later batches scheduled', ['CH-07', 'CH-08', 'CH-09', 'CH-10'].every(id => /Applied \(Batch 2\)13 Oct 2026/.test(row(id))) && /Applied \(Batch 2\/3\)13 Oct 2026/.test(row('CH-11')) && /Scheduled \(Batch 6\)/.test(row('CH-06')) && ['CH-12', 'CH-13', 'CH-14'].every(id => /Applied \(Batch 3\)13 Oct 2026/.test(row(id))) && /Scheduled \(Batch 5\)/.test(row('CH-17')));
    ok('Decisions Log: earlier and confirmed items', /Confirmed: already built, no change/.test(row('CH-04')) && /Applied earlier \(C7, b8bce5b\)/.test(row('CH-24')) && /Confirmed: no change/.test(row('CH-30')));
    const pc = secs.find(s => s.querySelector('h2') && s.querySelector('h2').textContent === 'Pending client'), prow = pc ? [...pc.querySelectorAll('tbody tr')].map(r => r.textContent) : [];
    ok('Decisions Log: P-27 … P-30 Pending client', prow.length === 4 && ['P-27', 'P-28', 'P-29', 'P-30'].every((p, i) => prow[i].startsWith(p) && /Pending client/.test(prow[i])) && /Observation fee/.test(prow[0]) && /Mistyped country/.test(prow[1]) && /Data Correction/.test(prow[1]) && /Intake choice at sign-up/.test(prow[3]));
    const fu = secs.find(s => /Follow-up decisions \(P-05 – P-26\)/.test(s.textContent)), st = id => ([...fu.querySelectorAll('tbody tr')].find(tr => tr.firstChild.textContent === id) || {}).textContent || '';
    ok('Decisions Log: F1 Superseded (CH-01); F2, F3b, F8 Resolved; F3a Superseded', /Superseded \(CH-01\)/.test(st('F1')) && /Resolved \(CH-02\)/.test(st('F2')) && /Superseded \(CH-02\)/.test(st('F3a')) && /Resolved \(CH-03\)/.test(st('F3b')) && /Resolved \(CH-05\)/.test(st('F8')));
    ok('Decisions Log: 19 scenarios; #16 is the new sign-up', /All 19 run end to end in the prototype\./.test(main()) && CDL_SCEN.filter(r => r[0] === '16').length === 1 && CDL_SCEN.find(r => r[0] === '16')[1] === 'New sign-up: documents → offer letter → payment → start' && !CDL_SCEN.some(r => r[1] === 'Learner moves country'));
    go('ux-changelog'); const ux = [...app().querySelectorAll('main section.card')].find(s => /Client decisions — Batch 1/.test(s.textContent));
    ok('UX Changelog: Batch 1 entry lists its CH IDs', !!ux && ['CH-01:', 'CH-02:', 'CH-03:', 'CH-05:', 'CH-31:'].every(x => [...ux.querySelectorAll('li')].some(li => li.textContent.startsWith(x))));
    go('demo-scenarios'); ok('Demo Scenarios: "Nineteen", 19 sections, #16 is the new sign-up', /Nineteen end-to-end walkthroughs/.test(main()) && app().querySelectorAll('main section[id^="sc-"]').length === 19 && /New sign-up/.test((app().querySelector('#sc-16') || {}).textContent || ''));
    renderDemo(); AFTER.forEach(f => f()); const b = document.querySelector('#demo-root [data-act="scOpen"]'); ok('Demo panel: "Open the 19 Demo Scenarios"', !b || b.textContent === 'Open the 19 Demo Scenarios', b && b.textContent);
    learner('A'); go('index'); const ix = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Learner index: CH entries (incl. registration confirmation, 1b), each with a purpose line', !!ix && ix.querySelectorAll('li').length === 12 && !!ix.querySelector('[data-act="regStart"]') && [...ix.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && /Demo Scenarios — 19 walkthroughs/.test(main()));
    ix.querySelector('[data-m="chCheckout"]').click(); await wait(150); ok('Learner index: checkout entry opens the checkout with the Stripe line', !!MODAL && !!mroot().querySelector('.ch-stripe')); closeModal();
    SA(); go('a-index'); const ax = [...app().querySelectorAll('.idx-sec')].find(s => s.querySelector('h2').textContent === 'Client decisions (CH)');
    ok('Admin index: Batch 1–3 entries with purposes', !!ax && ax.querySelectorAll('li').length === 10 && ['a-config', 'a-learner.IA-L-31900', 'a-dataprotection..residency', 'a-programmes.NV-L3.letter', 'a-admissions.APP-C', 'a-learner.IA-L-31188.admission'].every(t => ax.querySelector(`[data-t="${t}"]`)) && [...ax.querySelectorAll('li')].every(li => li.querySelector('.idx-purpose')) && !/Priya Nair \(moved country/.test(main()));
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
    const codes = [...app().querySelectorAll('input[name="su-batch"]')].map(i => i.value);
    ok('P-30 intake choice: only intakes with a place', codes.includes('L3AC-DEC26-AUH') && codes.includes('L3AC-NOV26-LEI') && codes.includes('L3AC-OCT26-ONL') && !codes.includes('L3AC-NOV26') && codes.every(c => chHasPlace(chBatch(c))), codes.join());
    ok('P-30 intake shows its start date and whether a deposit can hold the seat', new RegExp('in ' + daysTo(chBatch('L3AC-DEC26-AUH').start) + ' days').test(main()) && /A deposit can hold your seat/.test(main()) && /Starts in under 28 days/.test(main()), [daysTo(chBatch('L3AC-DEC26-AUH').start), (main().match(/in d+ days/g) || []).join()].join(' '));
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
    ok('CH-08 signed copy emailed to the learner and to the Academy (info@welfarehs.co.uk)', lm.some(m => !m.academy && m.email === 'priya.raman@gmail.com' && /signed offer letter/.test(m.subj)) && lm.some(m => m.academy && m.email === 'info@welfarehs.co.uk' && /Priya Raman/.test(m.subj)));
    ok('CH-08 signing audited', ADMIN.audit.some(a => a.action === 'Offer letter signed' && /IA-L-31188/.test(a.entity)));
    ok('CH-07 → step 4 Payment', stepCur() === 'Payment');
  });

  /* ---------- CH-10 payment (deposit case), CH-11 start ---------- */
  await T('CH-10 payment — deposit case, card', async () => {
    ok('CH-10 deposit offered (intake 28+ days away) and instalments; no pay in full', !!$('input[name="su-opt"][value="deposit"]') && !!$('input[name="su-opt"][value="instalment"]') && !/pay in full|full amount/i.test(main()));
    ok('CH-10 methods: card and bank transfer', !!$('input[name="su-m"][value="card"]') && !!$('input[name="su-m"][value="bank"]'));
    setUi('suMethod', 'bank'); render(); ok('CH-10 bank transfer: instructions placeholder (T04), reference, "Awaiting confirmation by Finance"', /Client to supply: bank payment instructions/.test(main()) && /IA-31188-DEP/.test(main()) && /Awaiting confirmation by Finance/.test(main()));
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
    ok('CH-07 chosen intake fills before payment → asked to choose another', /is now full/.test(main()) && !!app().querySelector('[data-act="suGo"][data-s="1"]') && !app().querySelector('[data-act="suPay"]'));
    app().querySelector('[data-act="suGo"][data-s="1"]').click(); await wait(30); ok('CH-07 back to step 1 to choose another intake; documents and signature kept', stepCur() === 'Personal details' && !!W.signup.sig && !chMandMissing(W).length);
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
    ok('CH-08 "Offer letter" tab next to the others', [...app().querySelectorAll('.subtabs [data-tab], .subtabs button')].some(b => /Offer letter/.test(b.textContent)) && /Hierarchy builder/.test(main()));
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
    ok('CH-07 approve dialog shows the intake chosen at sign-up; no placement select', !!MODAL && !$('#ab') && /Abu Dhabi Cohort 1 — L3AC-DEC26-AUH/.test(MODAL.body) && /chosen at sign-up/.test(MODAL.body)); closeModal();
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
    go('cd-log'); ok('Decisions Log: CH-10 assumption note', /Assumption: If the deposit balance isn't paid within the 28-day hold, the seat is released and programme content locks \(prototype assumption, pending client confirmation\)\./.test(main()));
    SA(); go('a-index'); ok('Admin index: Pause access, bank transfers and rejected-after-payment entries', ['a-learner.IA-L-18022.enrolments', 'f-learner.IA-L-31900', 'f-exceptions..bank'].every(t => app().querySelector(`[data-t="${t}"]`)) && !!app().querySelector('[data-act="chSc19Start"]'));
  });

  fresh();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
