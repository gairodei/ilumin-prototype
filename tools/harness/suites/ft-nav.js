// NVQ Programmes navigation (fix, 20 Oct 2026): the System Administrator — and every other role with NVQ Programmes in its
// sidebar — reaches the real programme list by clicking, never the Error 404 page. Every step is a DOM click on the element a
// user clicks (demo panel role button, the sidebar "More" group, the sidebar link, a programme row, New NVQ programme), so the
// document click handlers, the leave-page guard and the route wrappers all run. Direct navigation (address change) and browser
// refresh (fresh data, route restored from the address after sign-in) are covered, including a link to a programme that
// isn't in the fresh data — the case that showed the 404 — and the negative case for roles without NVQ Programmes.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const main = () => (document.querySelector('main') || document.getElementById('app')).textContent;
  const h1 = () => ((document.querySelector('main h1') || {}).textContent || '').trim();
  const is404 = () => /We can't find that page/.test(main()) || /Error 404/.test(main());
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const tick = () => new Promise(r => setTimeout(r, 0));
  const q = s => document.querySelector(s);
  const clickEl = el => { if (!el) throw new Error('nothing to click'); el.click(); };
  // A page load: the in-memory demo data is rebuilt and the route comes from the address, as in a real refresh
  const reload = hash => { closeModal(); S.signedIn = false; S.portal = 'learner'; S.demoOpen = false; S.ui = {}; S.returnTo = null; history.replaceState(null, '', hash || '#'); App.boot(); };
  // Signs in through the demo panel's role button, as a user does
  const viaPanel = async r => { if (!S.demoOpen) clickEl(q('.demo-fab')); clickEl(q(`#demo-root [data-act="switchRole"][data-r="${r}"]`)); if (S.demoOpen) clickEl(q('#demo-root .demo-fab')); await tick(); };
  const sideLink = r => q(`#app nav [data-go="${r}"]`);
  // The sidebar link, opening its collapsed group first when it's inside one
  const clickSide = async r => { const a = sideLink(r); if (!a) throw new Error('no sidebar link to ' + r); const d = a.closest('details'); if (d && !d.open) clickEl(d.querySelector('summary')); clickEl(sideLink(r)); await tick(); };
  const progRows = () => [...document.querySelectorAll('main table tbody tr')].map(tr => tr.textContent);
  const listShown = () => h1() === 'NVQ Programmes' && !is404() && ['Level 2 Diploma in Care (England)', 'Level 3 Diploma in Adult Care (England)'].every(t => progRows().some(x => x.includes(t)));
  const ROLES = [['sysA', 'System Admin A (Owen Price)'], ['sysB', 'System Admin B (Rhys Talbot)'], ['admin', 'Super Admin'], ['acaA', 'Academic Admin']];

  for (const [r, who] of ROLES) {
    await T(`NAV ${who}: sidebar → NVQ Programmes → programme → New NVQ programme`, async () => {
      reload(); await viaPanel(r);
      ok(`NAV ${who}: signed in through the demo panel, NVQ Programmes is in the sidebar`, S.signedIn && S.portal === 'admin' && !!sideLink('a-programmes'), `portal ${S.portal} route ${S.route}`);
      await clickSide('a-programmes');
      ok(`NAV ${who}: clicking NVQ Programmes in the sidebar shows the programme list (heading, seeded programmes in the table)`, listShown(), `h1 "${h1()}" rows ${progRows().length}`);
      ok(`NAV ${who}: (negative) no Error 404 page`, !is404());
      ok(`NAV ${who}: the address and the selected sidebar item are NVQ Programmes`, location.hash === '#a-programmes' && (q('#app nav [aria-current="page"]') || {}).textContent.trim() === 'NVQ Programmes', location.hash);
      const row = q('main table tbody a[data-go="a-programmes"][data-id]'); const title = row && row.textContent.trim(), id = row && row.dataset.id;
      clickEl(row); await tick();
      ok(`NAV ${who}: clicking a programme in the list opens it (${id})`, S.params.id === id && h1() === title && !is404() && location.hash === '#a-programmes.' + id, `h1 "${h1()}"`);
      ok(`NAV ${who}: the programme's tabs render`, document.querySelectorAll('main .subtabs [data-tab]').length >= 3);
      history.back(); await new Promise(res => setTimeout(res, 50));
      ok(`NAV ${who}: Back returns to the list`, listShown() && location.hash === '#a-programmes', location.hash);
      clickEl(q('main [data-act="chProgNew"]'));
      const m = q('#modal-root');
      ok(`NAV ${who}: New NVQ programme opens the wizard (Step 1 of 6 — Details, title / level / reference / duration / fee fields)`, !!MODAL && /Step 1 of 6/.test(m.textContent) && ['#np-t', '#np-l', '#np-r', '#np-d', '#np-p'].every(s => m.querySelector(s)), m.textContent.slice(0, 120));
      closeModal();
    });
  }

  await T('NAV direct navigation (address change) and refresh as the System Admin', async () => {
    reload(); await viaPanel('sysA'); await clickSide('a-dashboard');
    location.hash = '#a-programmes'; await new Promise(res => setTimeout(res, 50));
    ok('NAV direct: changing the address to #a-programmes shows the list', S.route === 'a-programmes' && listShown(), `route ${S.route} h1 "${h1()}"`);
    location.hash = '#a-programmes.NV-L3.versions'; await new Promise(res => setTimeout(res, 50));
    ok('NAV direct: #a-programmes.NV-L3.versions opens that programme on its tab', S.params.id === 'NV-L3' && S.params.tab === 'versions' && /Level 3 Diploma in Adult Care/.test(h1()) && !is404());
    reload('#a-programmes'); ok('NAV refresh: after a reload the sign-in page shows (demo data is in memory)', !S.signedIn && /Sign in/.test(main()));
    await viaPanel('sysA'); ok('NAV refresh: signing in as the System Admin returns to the NVQ programme list', S.route === 'a-programmes' && listShown(), `route ${S.route} h1 "${h1()}"`);
    reload('#a-programmes.NV-L3'); await viaPanel('sysA');
    ok('NAV refresh: on a seeded programme, signing in returns to that programme', S.params.id === 'NV-L3' && /Level 3 Diploma in Adult Care/.test(h1()) && !is404());
  });

  await T('NAV refresh after creating a programme (the reported 404)', async () => {
    reload(); await viaPanel('sysA'); await clickSide('a-programmes'); clickEl(q('main [data-act="chProgNew"]'));
    Object.entries({ '#np-t': 'Level 4 Certificate in Navigation Checks', '#np-l': 'Level 4', '#np-r': 'QN 610/5040/1', '#np-d': '12', '#np-du': 'months', '#np-p': '2400' }).forEach(([s, v]) => { const e = q('#modal-root ' + s); if (e) e.value = v; });
    clickEl([...document.querySelectorAll('#modal-root button')].find(b => /Create draft/.test(b.textContent))); await tick();
    const id = S.params.id;
    ok('NAV the wizard creates the draft and opens it at #a-programmes.<new id>.structure', /^NV-N\d+$/.test(id || '') && location.hash === `#a-programmes.${id}.structure` && !is404(), location.hash);
    reload(location.hash); await viaPanel('sysA');
    ok('NAV after a reload the created programme is gone, and signing in shows the NVQ programme list — not Error 404', listShown(), `h1 "${h1()}"`);
    ok('NAV (negative) no Error 404 page after the reload', !is404());
    ok('NAV a note says the programme isn\'t in this demo and why', /That programme isn't available/.test(main()) && main().includes(id) && /kept only until the page is reloaded/.test(main()) && !!q(`main [data-nvq-gone="${id}"]`));
    ok('NAV the address is corrected to #a-programmes and NVQ Programmes stays selected', location.hash === '#a-programmes' && S.route === 'a-programmes' && !S.params.id && (q('#app nav [aria-current="page"]') || {}).textContent.trim() === 'NVQ Programmes', location.hash);
    ok('NAV the list keeps New NVQ programme, and it still opens the wizard', (clickEl(q('main [data-act="chProgNew"]')), !!MODAL && /Step 1 of 6/.test(q('#modal-root').textContent))); closeModal();
    reload(location.hash); await viaPanel('sysA');
    ok('NAV a further reload stays on the list, without the note', listShown() && !/That programme isn't available/.test(main()));
    await clickSide('a-programmes'); ok('NAV the sidebar link still opens the list', listShown());
  });

  await T('NAV an unknown programme id for other roles', async () => {
    reload('#a-programmes.NV-ZZ9'); await viaPanel('acaA');
    ok('NAV Academic Admin: an unknown programme shows the Academic programme list with the note', h1() === 'NVQ Programmes' && !is404() && !!q('main [data-nvq-gone="NV-ZZ9"]') && progRows().length > 0);
    reload('#a-programmes.NV-ZZ9'); await viaPanel('finA');
    ok('NAV (negative) Finance Admin: no NVQ Programmes in the sidebar', !sideLink('a-programmes'));
    setRoute('a-programmes.NV-ZZ9'); render();
    ok('NAV (negative) Finance Admin: an NVQ Programmes link still gets the permission page — the list isn\'t shown', /permission/i.test(h1()) && !q('main [data-nvq-gone]') && !progRows().some(x => x.includes('Level 2 Diploma in Care')), `h1 "${h1()}"`);
    reload('#a-programmes.NV-ZZ9'); await viaPanel('bizA'); setRoute('a-programmes.NV-ZZ9'); render();
    ok('NAV (negative) Business Admin: still the permission page', /permission/i.test(h1()) && !q('main [data-nvq-gone]'));
    reload(); await viaPanel('sysA'); go('a-programmes', { id: 'NV-ZZ9' });
    ok('NAV an in-app link to an unknown programme also lands on the list with the note', listShown() && !!q('main [data-nvq-gone="NV-ZZ9"]'));
  });

  await T('NAV every sidebar link of every admin role opens a page, never Error 404', async () => {
    const roles = ['sysA', 'sysB', 'admin', 'acaA', 'finA', 'bizA', 'iqaA']; let n = 0; const bad = [];
    for (const r of roles) {
      reload(); await viaPanel(r);
      const links = [...new Set([...document.querySelectorAll('#app nav a[data-go]')].map(a => a.dataset.go))];
      for (const g of links) { await clickSide(g); n++; if (is404()) bad.push(r + '→' + g); }
    }
    ok(`NAV ${n} sidebar clicks across ${roles.length} roles: no Error 404`, n > 100 && !bad.length, bad.join(', '));
  });

  reload();
  const out = document.createElement('pre'); out.id = 'ft-out'; out.textContent = R.join('\n') + '\n' + R.filter(x => x.startsWith('PASS')).length + '/' + R.length; document.body.appendChild(out);
})();
