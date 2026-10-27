(function () {
  const out = { snaps: [], errors: [] };
  const errs = [];
  const _ce = console.error; console.error = function () { errs.push([...arguments].map(String).join(' ').slice(0, 200)); return _ce.apply(console, arguments); };
  window.addEventListener('error', e => errs.push('onerror ' + (e.message || '') ));
  const ROLES = [
    ['Learner', () => { ACT.demoSignInAs({ dataset: { r: 'learner' } }); }],
    ['Super Admin', () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard'); }],
    ['System Admin', () => { setAdminIdentity('SY'); S.portal = 'admin'; S.signedIn = true; go('a-dashboard'); }],
    ['Academic Admin', () => { acaEnter('KA'); S.signedIn = true; }],
    ['Finance Admin', () => { setAdminIdentity('FA'); S.portal = 'admin'; S.signedIn = true; go('f-dashboard'); }],
    ['Business Admin', () => { bizEnter('BA'); S.signedIn = true; }],
    ['IQA', () => { iqaEnter('QA'); S.signedIn = true; }],
    ['Coordinator', () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; }],
    ['Teacher/Assessor', () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; }],
    ['Teacher only', () => { S.tas.v = 'T'; tasEnter(); S.signedIn = true; }],
    ['Agency', () => { agyEnter('AG-02', true); S.signedIn = true; }],
  ];
  const FRAME = window.__FRAME || 'desktop';
  const known = r => !!SCREENS[r] || /^(w-|v-|m-inbox|signin|edge:|av:|k-nothing-here|q-nothing)/.test(r);
  function snap(role, tok) {
    errs.length = 0;
    for (const k in DT) delete DT[k];
    let err = null;
    const t0 = performance.now(); try { setRoute(tok); S.frame = FRAME; render(); } catch (e) { err = String(e).slice(0, 200); } const ms = +(performance.now() - t0).toFixed(2);
    const app = document.getElementById('app');
    const main = document.querySelector('main') || app;
    const h1 = ((main && main.querySelector('h1')) || {}).textContent || '';
    const over = app ? app.scrollWidth - app.clientWidth : 0;
    const dead = new Set();
    document.querySelectorAll('[data-go]').forEach(b => { const r = (b.dataset.go || '').split('.')[0]; if (r && !known(r)) dead.add(r); }); document.querySelectorAll('[data-act="goTok"][data-t]').forEach(b => { const r = (b.dataset.t || '').split('.')[0]; if (r && !known(r)) dead.add('tok:' + r); });
    const dts = {}; for (const id in DT) { try { dts[id] = DT[id].rows.length; } catch (e) { } }
    const tables = [...main.querySelectorAll('table')].map(t => t.querySelectorAll('tbody tr').length);
    const reqRoute = tok.split('.')[0];
    // "floor" must not appear for the minimum price rule (Phase 5); the two mock sentences about a physical floor are allowed
    const floorTxt = ((app && app.textContent) || '').replace(/slipped to the floor|left the floor/gi, '');
    // Overflow probe: the deepest elements past the right edge of the app (not inside a scrolling container)
    let wide = [];
    if (over > 1) {
      const lim = app.getBoundingClientRect().right + 1;
      const clipped = e => { for (let p = e.parentElement; p && p !== app; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox !== 'visible') return true; } return false; };
      const past = e => e.getBoundingClientRect().right > lim;
      wide = [...app.querySelectorAll('*')].filter(e => past(e) && !clipped(e) && ![...e.children].some(past)).slice(0, 5).map(e => { const r = e.getBoundingClientRect(), cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).join('.') : ''; return `${e.tagName.toLowerCase()}${cls ? '.' + cls : ''} w${Math.round(r.width)} right${Math.round(r.right)} (${(e.textContent || '').trim().slice(0, 40)})`; });
    }
    // Documentation and record pages quote the old wording on purpose (history) — not checked
    const DOCS = ['ux-changelog', 'cd-log', 'cd-inventory', 'fd-inventory', 'fu-inventory', 'lu-inventory', 'tbd-register', 'tbd-check', 'ux-audit', 'ux-audit-v2'];
    // Template sweep (Phase 5): exactly one main heading per page; every disabled button says why (title)
    const h1n = app ? app.querySelectorAll('h1').length : 0, notip = app ? [...app.querySelectorAll('button[disabled]')].filter(b => !(b.getAttribute('title') || '').trim()).map(b => (b.dataset.act || b.textContent.trim().slice(0, 24))).slice(0, 5) : [];
    out.snaps.push({ role, tok, ms, wide, h1n, notip, nf: /We can.t find that page/.test(h1), floor: !DOCS.includes(reqRoute) && /\bfloor\b/i.test(floorTxt), nodes: document.getElementsByTagName('*').length, h1: h1.trim().slice(0, 80), err, cerr: errs.slice(0, 3), over: over > 1 ? over : 0, dead: [...dead], redirected: S.route !== reqRoute ? S.route : '', dts, tables, perm: /permission/i.test(h1), tbd: [...new Set([...document.querySelectorAll('#app .tbd, #modal-root .tbd')].map(x => x.textContent.trim()))] });
  }
  function routesOnPage() { const s = new Set(); document.querySelectorAll('.side a, .adm-side a, .bnav button, .drawer a').forEach(a => { const g = a.dataset.go || (a.getAttribute('href') || '').replace('#', ''); if (g) s.add(g); }); return [...s]; }
  ROLES.forEach(([role, enter]) => {
    try { S.ui = {}; enter(); S.frame = 'desktop'; render(); } catch (e) { out.errors.push(role + ' enter ' + e); return; }
    const routes = routesOnPage();
    routes.forEach(r => {
      try { enter(); } catch (e) { }
      snap(role, r);
      const tabs = [...document.querySelectorAll('main .subtabs [data-tab]')].map(b => [b.dataset.go, b.dataset.id, b.dataset.tab]);
      const det = [...document.querySelectorAll('main [data-go][data-id]')].map(b => [b.dataset.go, b.dataset.id]).filter(([g]) => g && g !== 'index');
      tabs.forEach(([g, id, t]) => { try { enter(); } catch (e) { } snap(role, g + '.' + (id || '') + '.' + t); });
      const dg = new Set();
      // CB1: a programme page has the course builder's sections (.cb-nav) instead of a tab bar, and each section its panels (.cb-panels)
      det.forEach(([g, id]) => { if (dg.has(g)) return; dg.add(g); try { enter(); } catch (e) { } snap(role, g + '.' + id); const t2 = [...document.querySelectorAll('main .subtabs [data-tab], main .cb-nav [data-tab]')].map(b => [b.dataset.go, b.dataset.id, b.dataset.tab]), seen = new Set(t2.map(x => x[2]));
        t2.forEach(([g2, id2, tt]) => { try { enter(); } catch (e) { } snap(role, g2 + '.' + (id2 || '') + '.' + tt);
          [...document.querySelectorAll('main .cb-panels [data-tab]')].map(b => [b.dataset.go, b.dataset.id, b.dataset.tab]).filter(p => !seen.has(p[2])).forEach(([g3, id3, pt]) => { seen.add(pt); try { enter(); } catch (e) { } snap(role, g3 + '.' + (id3 || '') + '.' + pt); }); }); });
    });
  });
  // Demo Scenarios + record pages, then every scenario step's screen (role switched as the step's Open button does)
  [['Demo Scenarios', 'demo-scenarios'], ['Records', 'cd-log'], ['Records', 'ux-changelog'], ['Records', 'tbd-register'], ['Records', 'fd-inventory'], ['Records', 'fu-inventory'], ['Records', 'tbd-check']].forEach(([r, t]) => { try { S.ui = {}; ACT.scOpen(); } catch (e) { out.errors.push(r + ' enter ' + e); } snap(r, t); });
  try { if (!(typeof fxClient === 'function' && fxClient())) SC_LIST().forEach(([n, , , steps]) => steps.forEach((st, k) => { if (!st.t) return; try { S.ui = {}; ACT.scOpen(); scRole(st.r); } catch (e) { out.errors.push('Scenario ' + n + ' enter ' + e); } snap('Scenario ' + n + '.' + (k + 1), st.t); })); } catch (e) { out.errors.push('scenarios ' + e); }
  const pre = document.createElement('pre'); pre.id = 'crawl-out'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
})();
