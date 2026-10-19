#!/usr/bin/env node
// Static build for Cloudflare Pages: copies the runtime site (index.html, every stylesheet and script it references, and the
// files in deploy/) into dist/. No dependencies, no bundling, no rewriting — the deployed files are byte-for-byte the files the
// regression tests, so the offline prototype and its demo scenarios behave exactly as they do locally.
//   node tools/build.mjs           → dist/
// The build fails if a referenced file is missing, its path wouldn't work from the site root (absolute, "..", backslashes), or its
// letter case differs from the file on disk (Cloudflare serves paths case-sensitively; Windows doesn't).
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = join(ROOT, 'dist');
const DEPLOY = join(ROOT, 'deploy'); // static Pages config shipped as-is (_headers, robots.txt)

// Local src / href values of an HTML page (external links, anchors and data: URIs are not files of the site)
export function localRefs(html) {
  return [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(m => m[1].trim())
    .filter(u => u && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u));
}
// Why a reference wouldn't load from a Pages root URL, or null
export function badRef(u) {
  if (u.startsWith('/')) return 'absolute path (breaks under a sub-path; use a relative path)';
  if (/(^|\/)\.\.(\/|$)/.test(u)) return 'points outside the site ("..")';
  if (u.includes('\\')) return 'contains a backslash';
  if (/[?#]/.test(u)) return 'has a query or fragment';
  return null;
}
// Exact-case existence check (Windows and macOS file systems ignore case; Cloudflare doesn't)
export function existsExact(base, rel) {
  let dir = base;
  for (const part of rel.split('/')) { if (!existsSync(dir) || !readdirSync(dir).includes(part)) return false; dir = join(dir, part); }
  return true;
}
export const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');

export function build() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8'), refs = [...new Set(localRefs(html))], errs = [];
  refs.forEach(u => { const why = badRef(u); if (why) errs.push(`${u}: ${why}`); else if (!existsExact(ROOT, u)) errs.push(`${u}: not found (check the path and its letter case)`); });
  if (errs.length) throw new Error('Build failed — index.html references:\n  ' + errs.join('\n  '));
  // scripts in js/ that index.html doesn't load are not shipped; say so, so nothing is silently dropped
  const unused = readdirSync(join(ROOT, 'js')).filter(f => f.endsWith('.js') && !refs.includes('js/' + f));
  rmSync(DIST, { recursive: true, force: true }); mkdirSync(DIST, { recursive: true });
  const files = ['index.html', ...refs];
  files.forEach(rel => { const to = join(DIST, rel); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(ROOT, rel), to); });
  const extra = existsSync(DEPLOY) ? readdirSync(DEPLOY).filter(f => statSync(join(DEPLOY, f)).isFile()) : [];
  extra.forEach(f => copyFileSync(join(DEPLOY, f), join(DIST, f)));
  // the copies must be identical to the sources the regression runs against
  const diff = files.filter(rel => sha(join(ROOT, rel)) !== sha(join(DIST, rel)));
  if (diff.length) throw new Error('Build failed — copies differ from their sources: ' + diff.join(', '));
  const bytes = files.concat(extra).reduce((n, rel) => n + statSync(join(DIST, rel)).size, 0);
  return { files: files.concat(extra), refs, unused, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const r = build();
    console.log(`dist/: ${r.files.length} files, ${(r.bytes / 1024).toFixed(0)} KiB (index.html, ${r.refs.length} referenced assets, ${r.files.length - r.refs.length - 1} Pages config files)`);
    if (r.unused.length) console.log('Not shipped (not referenced by index.html): ' + r.unused.join(', '));
  } catch (e) { console.error(e.message); process.exit(1); }
}
