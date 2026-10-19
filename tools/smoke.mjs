#!/usr/bin/env node
// Deployment smoke test for dist/ (run after `node tools/build.mjs`).
//   node tools/smoke.mjs                → static checks + the site served from an HTTP root, loaded in headless Edge / Chrome
//   node tools/smoke.mjs --static-only  → static checks only (no browser needed)
// Static: dist/ holds exactly the runtime files (no harness, docs, decisions register, screenshots or Git data); every src / href
// resolves in dist/ with exact letter case; the copies are byte-identical to the sources the regression tests.
// Served: dist/ is served at "/" with its _headers (as Cloudflare Pages does); a browser loads it and the test fails on any
// request that isn't 200, any script error, a script that didn't run, or the demo not booting (30 Demo Scenarios, a Level 3
// Schedule tab).
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
ok('every script and stylesheet in index.html is referenced (80 scripts + styles.css)', refs.filter(u => u.startsWith('js/')).length === readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js')).length && refs.includes('styles.css'));

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
document.getElementById('f').addEventListener('load', () => setTimeout(() => {
  const cw = document.getElementById('f').contentWindow, d = cw.document, r = {};
  try {
    r.errs = (cw.__smokeErrs || []).slice();
    r.scripts = d.querySelectorAll('script[src]').length;
    r.loaded = cw.performance.getEntriesByType('resource').filter(e => /\\.js$/.test(e.name)).length;
    r.css = [...d.styleSheets].some(s => /styles\\.css$/.test(s.href || '') && s.cssRules.length > 100);
    r.app = typeof cw.eval('App') === 'object' && d.querySelector('#app').children.length > 0;
    r.last = cw.eval('typeof r2SchedSection === "function" && typeof r5CohLink === "function" && UXC.some(x => x[0] === "R5 audiences")');
    cw.eval('setAdminIdentity("A"); S.portal = "admin"; S.signedIn = true; ACT.scOpen(); go("demo-scenarios")'); r.scen = d.querySelectorAll('main section[id^="sc-"]').length; r.scList = cw.eval('SC_LIST().length');
    cw.eval('setAdminIdentity("A"); S.portal = "admin"; S.signedIn = true; go("a-batches", { id: "L3AC-NOV26-LEI", tab: "schedule" })');
    r.sched = !!d.querySelector('main .r2-sched') && /Add weekly recurring classes/.test(d.querySelector('main').textContent);
    r.errs2 = (cw.__smokeErrs || []).slice(r.errs.length);
  } catch (e) { r.thrown = String(e && e.stack || e); }
  out(r);
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
  ok('served: the app boots and the last scripts ran (R2 Schedule area, R5 records)', r.app === true && r.last === true);
  ok('served: Demo Scenarios — all 30 listed and rendered', r.scen === 30 && r.scList === 30, r.scen + ' rendered / ' + r.scList + ' listed');
  ok('served: a Level 3 batch Schedule tab renders (unified Schedule area)', r.sched === true);
}

if (!process.argv.includes('--static-only')) await served();
passes.forEach(p => console.log('PASS ' + p)); fails.forEach(f => console.log('FAIL ' + f));
console.log(`deployment smoke: ${passes.length} pass / ${fails.length} fail`);
process.exit(fails.length ? 1 : 0);
