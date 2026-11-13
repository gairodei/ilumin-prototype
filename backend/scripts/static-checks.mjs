#!/usr/bin/env node
// Lightweight static analysis for the backend (no extra framework). Fails on patterns that are always wrong here:
//   - eval / new Function / child_process in request-handling code
//   - browser storage (localStorage / sessionStorage) anywhere in the backend
//   - imports from the browser prototype (../js, ../../js, …)
//   - console.* in src/ outside the process entry points and CLIs (use the structured logger)
//   - focused or skipped tests (.only / .skip) committed in tests/
//   - routes declared with app.get/post/… directly instead of defineRoute / definePublicRoute (access rule bypass)
//   - TLS verification switched off (rejectUnauthorized: false) outside the explicit DATABASE_SSL=require mapping
//   - production code importing test code (tests/ holds the test-only enrolment prerequisite adapters), or production code
//     touching the database setting that admits test-only enrolment evidence (Stage 2B)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') || p.endsWith('.mjs') ? [p] : [];
  });

const rel = (p) => relative(root, p).split(sep).join('/');
const problems = [];
const check = (file, re, message, allow = () => false) => {
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (re.test(line) && !allow(rel(file), line)) problems.push(`${rel(file)}:${i + 1}: ${message}`);
  });
};

const src = walk(join(root, 'src'));
const tests = walk(join(root, 'tests'));
const consoleAllowed = new Set(['src/main.ts', 'src/worker-main.ts', 'src/database/migrate-cli.ts']);

for (const f of src) {
  check(f, /\beval\s*\(|new\s+Function\s*\(/, 'dynamic code execution');
  check(f, /\b(localStorage|sessionStorage)\b/, 'browser storage in backend code');
  check(f, /from\s+['"](\.\.\/)+js\//, 'import from the browser prototype');
  check(f, /\bconsole\.(log|info|warn|error|debug)\b/, 'console output outside entry points (use the logger)', (r) =>
    consoleAllowed.has(r) || r.startsWith('src/cli/'),
  );
  check(f, /\bapp\.(get|post|put|patch|delete|route)\s*\(/, 'route registered without defineRoute/definePublicRoute', (r) =>
    r === 'src/app/route.ts',
  );
  check(f, /rejectUnauthorized:\s*false/, 'TLS verification disabled', (r) => r === 'src/database/pool.ts');
  check(f, /from\s+['"]node:child_process['"]/, 'child_process outside operations tooling', (r) => r === 'src/ops/backup-drill.ts');
  check(f, /from\s+['"](\.\.\/)+tests\//, 'production code imports test code');
  check(f, /ilumin\.test_evidence/, 'production code touches the test-evidence database setting');
  check(f, /trust:\s*['"]test-only['"]/, 'test-only prerequisite adapter declared in production code');
}
for (const f of tests) {
  check(f, /\b(describe|it|test)\.(only|skip)\s*\(/, 'focused or skipped test');
  check(f, /\b(localStorage|sessionStorage)\b/, 'browser storage');
}

if (problems.length) {
  console.error(`static checks: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`static checks: ${src.length + tests.length} files clean`);
