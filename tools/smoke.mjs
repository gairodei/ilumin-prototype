#!/usr/bin/env node
// Deployment smoke test for dist/ (run after `node tools/build.mjs`).
//   node tools/smoke.mjs                → static checks + the site served from an HTTP root, loaded in headless Edge / Chrome
//   node tools/smoke.mjs --static-only  → static checks only (no browser needed)
// Static: dist/ holds exactly the runtime files (no harness, docs, decisions register, screenshots or Git data); every src / href
// resolves in dist/ with exact letter case; the copies are byte-identical to the sources the regression tests.
// Served: dist/ is served at "/" with its _headers (as Cloudflare Pages does); a browser loads it and the test fails on any
// request that isn't 200, any script error, a script that didn't run, or the demo not booting (30 Demo Scenarios, a Level 3
// Schedule tab), and NVQ Programmes navigation by clicking — the sidebar link, a programme, the wizard, a reload on a
// programme that isn't in the fresh data and a direct address change — with no Error 404.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { ROOT, DIST, localRefs, badRef, existsExact, sha } from './build.mjs';

const fails = [], passes = [];
const ok = (name, cond, info = '') => { (cond ? passes : fails).push(name + (cond || !info ? '' : ' — ' + info)); };
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [relative(DIST, p).split('\\').join('/')]; });

/* ---------- Static ---------- */
if (!existsSync(join(DIST, 'index.html'))) { console.error('dist/index.html not found — run `node tools/build.mjs` first.'); process.exit(1); }
const html = readFileSync(join(DIST, 'index.html'), 'utf8'), refs = [...new Set(localRefs(html))], files = walk(DIST);
const CONFIG = ['_headers', 'robots.txt'];
ok('every src / href is a relative path that works from the site root', refs.every(u => !badRef(u)), refs.filter(badRef).join(', '));
ok('every referenced asset is in dist/ with exact letter case', refs.every(u => existsExact(DIST, u)), refs.filter(u => !existsExact(DIST, u)).join(', '));
ok('dist/ holds only index.html, its referenced assets and the Pages config', files.every(f => f === 'index.html' || refs.includes(f) || CONFIG.includes(f)), files.filter(f => f !== 'index.html' && !refs.includes(f) && !CONFIG.includes(f)).join(', '));
ok('no harness, docs, decisions register, screenshots or Git data in dist/', !files.some(f => /^(tools|\.git|deploy)\/|\.(md|png|jpe?g|sh|mjs|log)$|PROVISIONAL|TBD-register|(^|\/)\./i.test(f)), files.filter(f => /^(tools|\.git)\/|\.(md|png|sh|mjs)$|PROVISIONAL|TBD/i.test(f)).join(', '));
ok('every shipped file is byte-identical to its source', ['index.html', ...refs].filter(f => existsSync(join(DIST, f))).every(f => sha(join(ROOT, f)) === sha(join(DIST, f))));
ok('_headers keeps the site out of search engines', /X-Robots-Tag:\s*noindex/i.test(readFileSync(join(DIST, '_headers'), 'utf8')));
ok('every script and stylesheet in index.html is referenced (every script in js/ + styles.css)', refs.filter(u => u.startsWith('js/')).length === readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).length && refs.includes('styles.css'));

/* ---------- Served from an HTTP root, in a real browser ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
function pagesHeaders() { // the "/*" block of _headers, as Cloudflare Pages applies it
  const out = {}; let on = false;
  readFileSync(join(DIST, '_headers'), 'utf8').split(/\r?\n/).forEach(l => { if (/^\S/.test(l) && !l.startsWith('#')) on = l.trim() === '/*'; else if (on && /^\s+\S+:/.test(l)) { const [k, ...v] = l.trim().split(':'); out[k.trim()] = v.join(':').trim(); } });
  return out;
}
// Injected into index.html for the smoke run only (never into dist/): records script errors before any prototype script runs
const TRAP = '<script>window.__smokeErrs=[];addEventListener("error",function(e){__smokeErrs.push((e.message||"resource failed")+" @ "+((e.filename||(e.target&&(e.target.src||e.target.href))||"")+":"+(e.lineno||"")))},true);addEventListener("unhandledrejection",function(e){__smokeErrs.push("unhandled rejection: "+e.reason)});</script>';
const PROBE = `<!doctype html><meta charset="utf-8"><title>smoke</title><body><iframe id="f" src="/?smoke=1" style="width:1280px;height:900px"></iframe><pre id="smoke"></pre><script>
const out = r => { document.getElementById('smoke').textContent = JSON.stringify(r); };
let r = {}, loads = 0;
// NVQ Programmes navigation as a user does it (DOM clicks on the served build): demo panel → System Admin A → sidebar
// NVQ Programmes (opening its collapsed group) → a programme → New NVQ programme. is404 = the in-app Error 404 page.
const nav = (cw, d) => {
  const q = s => d.querySelector(s), h1 = () => ((q('main h1') || {}).textContent || '').trim(), is404 = () => /We can't find that page/.test((q('main') || d.body).textContent);
  const rows = () => d.querySelectorAll('main table tbody tr').length;
  const signIn = () => { q('.demo-fab').click(); q('#demo-root [data-act="switchRole"][data-r="sysA"]').click(); if (cw.eval('S.demoOpen')) q('#demo-root .demo-fab').click(); };
  const side = () => { const a = q('#app nav [data-go="a-programmes"]'), g = a && a.closest('details'); if (g && !g.open) g.querySelector('summary').click(); q('#app nav [data-go="a-programmes"]').click(); };
  return { q, h1, is404, rows, signIn, side };
};
document.getElementById('f').addEventListener('load', () => setTimeout(() => {
  const cw = document.getElementById('f').contentWindow, d = cw.document; loads++;
  if (loads === 2) { // reloaded on a programme that isn't in the fresh demo data (created before the reload, or an old link)
    try {
      const n = nav(cw, d); r.navReloadSignin = /Sign in/.test(d.querySelector('main').textContent); n.signIn();
      r.navStale = n.h1() === 'NVQ Programmes' && !n.is404() && n.rows() > 0 && !!n.q('main [data-nvq-gone="NV-N99"]') && cw.location.hash === '#a-programmes';
      r.navStaleInfo = n.h1() + ' ' + cw.location.hash;
      cw.location.hash = '#a-programmes.NV-L3.versions';
      return setTimeout(() => { r.navDirect = /Level 3 Diploma in Adult Care/.test(n.h1()) && !n.is404() && cw.eval('S.params.tab') === 'versions'; r.errs3 = (cw.__smokeErrs || []).slice(); out(r); }, 300);
    } catch (e) { r.thrown = String(e && e.stack || e); return out(r); }
  }
  try {
    const n = nav(cw, d); n.signIn(); n.side();
    r.navList = n.h1() === 'NVQ Programmes' && !n.is404() && n.rows() > 0 && cw.location.hash === '#a-programmes';
    n.q('main table tbody a[data-go="a-programmes"][data-id]').click();
    r.navOpen = !n.is404() && /^#a-programmes\\.NV-/.test(cw.location.hash) && d.querySelectorAll('main .subtabs [data-tab]').length >= 3;
    n.side(); n.q('main [data-act="chProgNew"]').click();
    r.navWizard = /Step 1 of 6/.test(n.q('#modal-root').textContent) && !!n.q('#modal-root #np-t'); cw.eval('closeModal()');
    r.errs = (cw.__smokeErrs || []).slice();
    r.scripts = d.querySelectorAll('script[src]').length;
    r.loaded = cw.performance.getEntriesByType('resource').filter(e => /\\.js$/.test(e.name)).length;
    r.css = [...d.styleSheets].some(s => /styles\\.css$/.test(s.href || '') && s.cssRules.length > 100);
    r.app = typeof cw.eval('App') === 'object' && d.querySelector('#app').children.length > 0;
    r.last = cw.eval('typeof r2SchedSection === "function" && typeof r5CohLink === "function" && UXC.some(x => x[0] === "R5 audiences") && typeof e1Decide === "function" && UXC.some(x => x[0] === "E1")');
    cw.eval('setAdminIdentity("A"); S.portal = "admin"; S.signedIn = true; ACT.scOpen(); go("demo-scenarios")'); r.scen = d.querySelectorAll('main section[id^="sc-"]').length; r.scList = cw.eval('SC_LIST().length');
    cw.eval('setAdminIdentity("A"); S.portal = "admin"; S.signedIn = true; go("a-batches", { id: "L3AC-NOV26-LEI", tab: "schedule" })');
    r.sched = !!d.querySelector('main .r2-sched') && /Add weekly recurring classes/.test(d.querySelector('main').textContent);
    r.errs2 = (cw.__smokeErrs || []).slice(r.errs.length);
  } catch (e) { r.thrown = String(e && e.stack || e); return out(r); }
  out(r); document.getElementById('f').src = '/?smoke=2#a-programmes.NV-N99';
}, 1500));
</script>`;

async function served() {
  const hdr = pagesHeaders(), log = [];
  const srv = createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
    if (p === '/__smoke__.html') { res.writeHead(200, { 'Content-Type': MIME['.html'] }); return res.end(PROBE); }
    if (p === '/' || p === '') p = '/index.html';
    const f = join(DIST, ...p.split('/').filter(Boolean)), rel = p.slice(1);
    const hit = !p.includes('..') && existsExact(DIST, rel) && statSync(f).isFile();
    log.push([hit ? 200 : 404, req.url]);
    if (!hit) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    let body = readFileSync(f);
    if (rel === 'index.html' && u.searchParams.has('smoke')) body = Buffer.from(body.toString('utf8').replace('<meta charset="utf-8">', '<meta charset="utf-8">' + TRAP));
    res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream', ...hdr }); res.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = [process.env.EDGE, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(b => b && existsSync(b));
  if (!browser) { srv.close(); ok('served: a headless browser is available (set EDGE=… or use --static-only)', false); return; }
  const prof = mkdtempSync(join(tmpdir(), 'smoke-'));
  const dom = await new Promise(res => {
    let s = ''; const p = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${prof}`, '--window-size=1400,1000', '--virtual-time-budget=15000', '--dump-dom', `http://127.0.0.1:${port}/__smoke__.html`]);
    const t = setTimeout(() => p.kill(), 90000); p.stdout.on('data', d => { s += d; }); p.on('close', () => { clearTimeout(t); res(s); });
  });
  srv.close(); try { rmSync(prof, { recursive: true, force: true }); } catch (e) { /* the browser may still hold it */ }
  const m = dom.match(/<pre id="smoke">([\s\S]*?)<\/pre>/), r = m && m[1] ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : null;
  ok('served: the browser loaded the page', !!r, dom.slice(0, 200));
  if (!r) return;
  // the browser asks for /favicon.ico on its own (nothing in the site references it); Pages answers that with its fallback
  const bad = log.filter(x => x[0] !== 200 && x[1] !== '/favicon.ico');
  ok('served: every request from the site root returned 200 (no missing assets or broken paths)', !bad.length, bad.map(x => x.join(' ')).join(', '));
  ok(`served: all ${refs.filter(u => u.startsWith('js/')).length} scripts requested and loaded`, r.scripts === refs.filter(u => u.startsWith('js/')).length && r.loaded >= r.scripts, `${r.loaded} of ${r.scripts}`);
  ok('served: styles.css applied', r.css === true);
  ok('served: no script errors while loading or using the demo', !r.thrown && !r.errs.length && !(r.errs2 || []).length, r.thrown || r.errs.concat(r.errs2 || []).join(' | '));
  ok('served: the app boots and the last scripts ran (R2 Schedule area, R5 records, E1)', r.app === true && r.last === true);
  ok('served: Demo Scenarios — all 30 listed and rendered', r.scen === 30 && r.scList === 30, r.scen + ' rendered / ' + r.scList + ' listed');
  ok('served: a Level 3 batch Schedule tab renders (unified Schedule area)', r.sched === true);
  ok('served: System Admin → sidebar NVQ Programmes (clicked) shows the programme list, not Error 404', r.navList === true);
  ok('served: a programme opens from the list, and New NVQ programme opens the wizard', r.navOpen === true && r.navWizard === true);
  ok('served: after a reload on a programme that isn\'t in the fresh data, signing in shows the list with a note (no Error 404)', r.navReloadSignin === true && r.navStale === true, r.navStaleInfo);
  ok('served: changing the address to a programme tab opens it (direct navigation)', r.navDirect === true);
  ok('served: no script errors after the reload', !(r.errs3 || []).length, (r.errs3 || []).join(' | '));
}

if (!process.argv.includes('--static-only')) await served();
passes.forEach(p => console.log('PASS ' + p)); fails.forEach(f => console.log('FAIL ' + f));
console.log(`deployment smoke: ${passes.length} pass / ${fails.length} fail`);
process.exit(fails.length ? 1 : 0);
