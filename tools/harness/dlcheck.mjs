#!/usr/bin/env node
// CDA (PD-CDA-C02): assessment-record downloads in a normal browser session — not the regression pages. Chrome / Edge is started with
// the DevTools protocol and real downloads allowed into a temporary folder; the prototype is loaded as a visitor loads it (client demo,
// no harness pin, so the files really download); the examples are loaded from Demo controls; then, as each role, the actual buttons
// are clicked. Each file is read back from disk and checked: a PDF (structure, xref offsets, embedded font, text through its ToUnicode
// maps, colours, only that learner), a Word package (parts, text, colours), a ZIP (entries, each PDF, only the batch's learners); and
// refused requests (another learner, a role without the right) must produce no file.
//   node tools/harness/dlcheck.mjs            (EDGE=<browser path> as for the harness)
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BROWSER = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const R = [], ok = (n, c, i = '') => { R.push((c ? 'PASS ' : 'FAIL ') + n + (i && !c ? ' — ' + i : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const work = mkdtempSync(join(tmpdir(), 'cda-dl-')), dl = join(work, 'downloads'), prof = join(work, 'profile');

// ---------- the browser, over the DevTools protocol ----------
const br = spawn(BROWSER.replace(/^\/([a-z])\//i, '$1:/'), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--allow-file-access-from-files', '--disable-component-update', '--disable-background-networking', 'about:blank'] /* a fresh profile otherwise fetches browser components into the download folder */, { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => { let b = ''; const t = setTimeout(() => rej(new Error('browser did not start')), 30000); br.stderr.on('data', d => { b += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(b); if (m) { clearTimeout(t); res(m[1]); } }); });
const ws = new WebSocket(wsUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pend = new Map(), events = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } else if (m.method) events.push(m); });
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
await send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: dl, eventsEnabled: true }); // each file saved under its download id: two copies of one record are both kept
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, S); await send('Runtime.enable', {}, S);
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, S); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
const waitFor = async (expr, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await ev(expr)) return true; } catch (e) { /* page loading */ } await sleep(250); } return false; };
// one click → wait for that download to complete; returns the file's bytes and name, or null when no download started
const done = new Set(), got = [];
async function download(expr, ms = 15000) {
  const n0 = events.length; await ev(expr);
  const t = Date.now(); let guid = null, name = null;
  while (Date.now() - t < ms) {
    for (const m of events.slice(n0)) { if (m.method === 'Browser.downloadWillBegin') { guid = guid || m.params.guid; name = name || m.params.suggestedFilename; } if (m.method === 'Browser.downloadProgress' && m.params.guid === guid && m.params.state === 'completed' && !done.has(guid)) { done.add(guid); await sleep(200); got.push({ guid, name }); return { name, bytes: new Uint8Array(readFileSync(join(dl, guid))) }; } }
    if (!guid && Date.now() - t > 2500) return null; // nothing started: refused
    await sleep(100);
  }
  throw new Error('download did not complete: ' + name);
}

// ---------- reading the files ----------
const lat = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; };
const hex = (...v) => v.map(x => Math.round(+x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const u16 = h => { let s = ''; for (let i = 0; i < h.length; i += 4) s += String.fromCharCode(parseInt(h.substr(i, 4), 16)); return s; };
function pdf(u8) {
  const t = lat(u8), sx = +(/startxref\n(\d+)\n%%EOF\n?$/.exec(t) || [])[1], m = /^xref\n0 (\d+)\n/.exec(t.slice(sx)), off = {};
  for (let i = 0; i < +m[1]; i++) { const e = t.substr(sx + m[0].length + 20 * i, 20); if (e[17] === 'n') off[i] = +e.slice(0, 10); }
  const xrefOk = Object.entries(off).every(([k, o]) => t.startsWith(`${k} 0 obj\n`, o));
  const obj = k => { const o = off[k], a = t.indexOf('\n', o) + 1, b = t.indexOf('\n', a), dict = t.slice(a, b); return { dict, s: t.startsWith('stream\n', b + 1) ? t.substr(b + 8, +(/\/Length (\d+)/.exec(dict) || [])[1]) : null }; };
  const tu = s => { const mp = {}; (s.match(/beginbfchar\n[\s\S]*?endbfchar/g) || []).forEach(b => b.replace(/<([0-9A-F]+)> <([0-9A-F]+)>/g, (_, c, u) => { mp[c] = u16(u); })); return mp; };
  const runs = []; let pages = 0;
  for (let k = 1; k < +m[1]; k++) { if (off[k] == null) continue; const o = obj(k); if (!/^<< \/Type \/Page /.test(o.dict)) continue; pages++; const fonts = {};
    o.dict.replace(/\/(F\d|T\d+) (\d+) 0 R/g, (_, nm, r) => { const f = obj(+r), x = /\/ToUnicode (\d+) 0 R/.exec(f.dict); fonts[nm] = { map: x ? tu(obj(+x[1]).s) : {}, w: /Type3/.test(f.dict) ? 2 : 4 }; });
    obj(+/\/Contents (\d+) 0 R/.exec(o.dict)[1]).s.replace(/BT (3 Tr )?\/(\w+) ([\d.]+) Tf (?:[\d.]+ Tz )?(?:([\d.]+) ([\d.]+) ([\d.]+) rg )?[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+) Tm <([0-9A-F]*)> Tj ET/g, (_, inv, f, sz, r, g, b, x, y, h) => { const F = fonts[f]; let s = ''; for (let i = 0; i < h.length; i += F.w) s += F.map[h.substr(i, F.w)] || '\uFFFD'; runs.push({ s, c: r ? hex(r, g, b) : null, y: +y, inv: !!inv }); }); }
  let text = '', y = null; const cols = []; runs.forEach(r => { if (y != null && r.y !== y && !/ $/.test(text)) { text += ' '; cols.push(null); } text += r.s; for (let i = 0; i < r.s.length; i++) cols.push(r.inv ? null : r.c); y = r.y; });
  return { ok: /^%PDF-1\.7\n/.test(t) && /%%EOF\n$/.test(t) && xrefOk, xrefOk, pages, text, colour: f => { const i = text.indexOf(f); return i < 0 ? null : cols[i]; }, font: /\/FontFile2/.test(t) && /\/Encoding \/Identity-H/.test(t) };
}
function unzip(u8) { const out = {}, dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let o = 0; while (o + 30 <= u8.length && dv.getUint32(o, true) === 0x04034b50) { const n = dv.getUint32(o + 18, true), nl = dv.getUint16(o + 26, true), el = dv.getUint16(o + 28, true); out[new TextDecoder().decode(u8.subarray(o + 30, o + 30 + nl))] = u8.subarray(o + 30 + nl + el, o + 30 + nl + el + n); o += 30 + nl + el + n; } return out; }
const docxRun = (u8, frag) => { const x = new TextDecoder().decode(unzip(u8)['word/document.xml'] || new Uint8Array()); const m = new RegExp(`<w:color w:val="([0-9A-F]{6})"/>(?:(?!</w:rPr>).)*</w:rPr><w:t xml:space="preserve">[^<]*${frag}`).exec(x); return { xml: x, colour: m && m[1] }; };

// ---------- the session ----------
try {
  await send('Page.navigate', { url: pathToFileURL(join(ROOT, 'index.html')).href }, S);
  ok('DL-0 the prototype loads as a visitor sees it (client demo; not the harness — downloads are real)', await waitFor("typeof App !== 'undefined' && typeof fxClient === 'function' && fxClient() && !window.ILM_FIXTURE && !!document.querySelector('#app')"));
  const H = `const $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
    const press = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
    const pick = p => { closeModal(); if (S.signedIn) ACT.logout(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } $1('#app .dr-signin [data-act="drAs"][data-p="' + p + '"]').click(); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); $1('form[data-submit="tfaCode"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } S.ui = {}; };`;
  await ev(`(() => { ${H} S.demoOpen = true; render(); $1('#demo-root [data-act="cdaExamples"]').click(); press(); closeModal(); return true; })()`);
  ok('DL-1 Demo controls → Load assessment record examples (made through the normal screens)', await ev(`JSON.stringify(CDA().demoErr) === '[]' && STORE.cda.examples === true`));
  const W2 = await ev(`STORE.worlds.CD2.me.id`), W1 = await ev(`STORE.worlds.CD1.me.id`);

  // the learner: own record, PDF and Word, from the assignment page
  const lp = await download(`(() => { ${H} pick('nvq-fa'); go('assignment', { id: 'a10' }); $1('main [data-act="pdfDl"]').click(); })()`);
  const p1 = lp && pdf(lp.bytes);
  ok('DL-2 learner (Dev): "Download as PDF" saves a real PDF to disk', !!lp && /^Dev Patel \(demo\) \(IA-L-32001\) - Assignment 1 - Person-centred values\.pdf$/.test(lp.name) && p1.ok && p1.font && p1.pages >= 1, lp ? lp.name : 'no download');
  ok('DL-3 …its contents: Dev\'s record only, every round in its colour, feedback in its judgement colour', !!p1 && p1.text.includes(W2) && !p1.text.includes(W1) && p1.colour('centre of their care') === '111111' && p1.colour('ask each person how') === 'C01818' && p1.colour('breakfast') === 'B06500' && p1.colour('Assessor feedback — Not met') === 'AE1E1E' && p1.colour('Assessor feedback — Partially met') === '8A5A00' && p1.colour('Assessor feedback — Met') === '1A6A35');
  const ld = await download(`(() => { $1 = s => document.querySelector(s); document.querySelector('main [data-act="cdaAsgDl"][data-f="docx"]').click(); })()`);
  const d1 = ld && docxRun(ld.bytes, 'breakfast'), z1 = ld && unzip(ld.bytes);
  ok('DL-4 learner: "Word (DOCX)" saves a real Word package (content types, document, properties) with the colours', !!ld && ld.name.endsWith('.docx') && ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'docProps/core.xml'].every(n => z1[n]) && d1.colour === 'B06500' && d1.xml.includes(W2), ld ? ld.name : 'no download');
  ok('DL-5 learner: another learner\'s record — refused, no file', (await download(`ACT.cdaAsgDl({ dataset: { lid: '${W1}', id: 'a10', f: 'pdf' } })`)) === null);

  // the allocated Assessor
  const ap = await download(`(() => { ${H} pick('assessor'); go('t-mark', { id: '${W2}~a10' }); $1('main .cda-dl [data-act="cdaAsgDl"][data-f="pdf"]').click(); })()`);
  ok('DL-6 Assessor: My Marking → submission → Download PDF saves the learner\'s record', !!ap && pdf(ap.bytes).ok && pdf(ap.bytes).text.includes(W2), ap ? ap.name : 'no download');
  ok('DL-7 Teacher: refused, no file', (await download(`(() => { ${H} pick('teacher'); ACT.cdaAsgDl({ dataset: { lid: '${W2}', id: 'a10', f: 'pdf' } }); })()`)) === null);

  // the Coordinator: one record, and the batch ZIP
  const cz = await download(`(() => { ${H} pick('coord1'); go('c-batches', { id: cdBatch().code }); $1('main .cda-bx [data-act="cdaBatchDlg"]').click(); press(); })()`);
  const zz = cz && unzip(cz.bytes), names = zz ? Object.keys(zz).sort() : [];
  ok('DL-8 Coordinator: batch → Export… saves a ZIP with a folder per learner and a README', !!cz && /^DEMO-L3-JAN27 - assessment records - \d{4}-\d\d-\d\d\.zip$/.test(cz.name) && names.includes('README.txt') && names.filter(n => n.endsWith('.pdf')).length === 3, cz ? cz.name + ' ' + JSON.stringify(names) : 'no download');
  const zp = names.filter(n => n.endsWith('.pdf')).map(n => [n, pdf(zz[n])]);
  ok('DL-9 …each PDF in the ZIP opens (structure) and holds only its own learner', zp.length === 3 && zp.every(([n, p]) => p.ok && (n.includes(W2) ? p.text.includes(W2) && !p.text.includes(W1) : p.text.includes(W1) && !p.text.includes(W2))));
  ok('DL-10 Assessor: no batch export (refused, no file)', (await download(`(() => { ${H} pick('assessor'); ACT.cdaBatchDlg({ dataset: { id: cdBatch().code } }); if (MODAL) press(); })()`)) === null);

  // the Academic Admin: the completed module, PDF and Word
  const mp = await download(`(() => { ${H} pick('aca'); go('a-records', { tab: 'modules' }); $1('main .cda-mods li[data-lid="${W2}"] [data-act="cdaModDl"][data-f="pdf"]').click(); })()`);
  const m1 = mp && pdf(mp.bytes);
  ok('DL-11 Academic Admin: Records → Module documents → PDF saves the completed module (cover, both assignments, observation, PD)', !!mp && m1.ok && m1.pages >= 3 && ['Completed module record', 'Assignment 1', 'Assignment 2', 'Observations', 'Professional Discussion outcomes', W2].every(s => m1.text.includes(s)) && !m1.text.includes(W1), mp ? mp.name : 'no download');
  const md = await download(`document.querySelector('main .cda-mods li[data-lid="${W2}"] [data-act="cdaModDl"][data-f="docx"]').click()`);
  ok('DL-12 …and the Word module document', !!md && md.name.endsWith('.docx') && docxRun(md.bytes, 'breakfast').colour === 'B06500');
  ok('DL-13 Amira\'s incomplete module: refused, no file', (await download(`ACT.cdaModDl({ dataset: { lid: '${W1}', u: 'U001', m: 'M1', f: 'pdf' } })`)) === null);
  ok('DL-14 Finance: refused, no file', (await download(`(() => { ${H} pick('fin'); ACT.cdaAsgDl({ dataset: { lid: '${W2}', id: 'a10', f: 'pdf' } }); })()`)) === null);
  // every download the page started (Chrome reports each one), complete on disk; none from a refused request
  const byId = Object.fromEntries(got.map(g => [g.guid, g.name])), files = readdirSync(dl).filter(f => byId[f]);
  const pageDl = events.filter(m => m.method === 'Browser.downloadWillBegin'), extra = pageDl.filter(m => !byId[m.params.guid]).map(m => m.params.suggestedFilename);
  ok('DL-15 the page started exactly the 6 permitted downloads (learner PDF and Word, Assessor PDF, Coordinator ZIP, module PDF and Word), each complete on disk; no download from a refused request', pageDl.length === 6 && got.length === 6 && files.length === 6 && files.every(f => statSync(join(dl, f)).size > 0) && !extra.length, JSON.stringify({ started: pageDl.length, extra }));
  R.push('FILES ' + files.map(f => `${byId[f]} (${statSync(join(dl, f)).size} bytes)`).join(' | '));
  if (process.argv.includes('--keep')) R.push('KEPT ' + dl);
} catch (e) { R.push('FAIL threw ' + e.message); }
finally { try { ws.close(); } catch (e) { /* closing */ } br.kill(); await sleep(500); if (!process.argv.includes('--keep')) try { rmSync(work, { recursive: true, force: true }); } catch (e) { /* the browser may hold the profile briefly */ } }
R.forEach(l => console.log(l));
const p = R.filter(l => l.startsWith('PASS')).length, f = R.filter(l => l.startsWith('FAIL')).length;
console.log(`dlcheck (normal browser session, real downloads): ${p} pass / ${f} fail`);
process.exit(f ? 1 : 0);
