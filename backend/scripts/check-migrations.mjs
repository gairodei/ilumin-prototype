#!/usr/bin/env node
// Migration integrity (static part; the database part is the migration test suite):
//   - every file matches NNNN_lower_snake_case.sql, versions are unique and contiguous from 0001
//   - no file is empty; no file manages transactions itself (the runner wraps each file in one transaction)
//   - no destructive statement against the append-only audit table
//   - with MIGRATION_BASE_REF (CI: the target branch), migrations that exist in the base are unchanged and none was
//     deleted — applied migrations are immutable; corrections are new files
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dir = join(backend, 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const problems = [];

files.forEach((f, i) => {
  const m = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(f);
  if (!m) return problems.push(`${f}: name must match NNNN_lower_snake_case.sql`);
  if (Number(m[1]) !== i + 1) problems.push(`${f}: expected version ${String(i + 1).padStart(4, '0')} (versions must be contiguous)`);
  const sql = readFileSync(join(dir, f), 'utf8');
  const code = sql.replace(/--.*$/gm, '');
  if (!code.trim()) problems.push(`${f}: empty migration`);
  if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;/im.test(code)) problems.push(`${f}: manages its own transaction`);
  if (/\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM)\s+(public\.)?audit_event\b/i.test(code)) problems.push(`${f}: destructive statement on audit_event`);
  if (/\bDISABLE\s+TRIGGER\b/i.test(code)) problems.push(`${f}: disables a trigger`);
});

const base = process.env.MIGRATION_BASE_REF;
if (base) {
  const listed = execFileSync('git', ['ls-tree', '--name-only', `${base}`, '--', 'migrations/'], { cwd: backend, encoding: 'utf8' })
    .split('\n')
    .filter((p) => p.endsWith('.sql'));
  for (const path of listed) {
    const name = path.split('/').pop();
    if (!files.includes(name)) {
      problems.push(`${name}: present in ${base} but deleted (applied migrations are immutable)`);
      continue;
    }
    const before = execFileSync('git', ['show', `${base}:backend/${path.replace(/^backend\//, '')}`], { cwd: backend, encoding: 'utf8' });
    if (before !== readFileSync(join(dir, name), 'utf8')) problems.push(`${name}: changed since ${base} (add a new migration instead)`);
  }
}

if (problems.length) {
  console.error(`migration check: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`migration check: ${files.length} migrations ok${base ? ` (unchanged versus ${base})` : ''}`);
