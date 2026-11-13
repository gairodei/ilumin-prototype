#!/usr/bin/env node
// Secret scan of the files git would commit under backend/ (tracked + untracked, excluding .gitignore'd paths).
// A heuristic first line of defence that runs anywhere (local and CI). CI also runs gitleaks over the repository.
// Fails on: private keys, cloud/provider key formats, credentials embedded in connection URLs, committed .env files,
// and high-entropy values assigned to secret-like names. Placeholders such as <app-password> are allowed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], {
  cwd: backend,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)
  .filter((f) => !f.endsWith('package-lock.json'));

const rules = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
  [/\bsk_(live|test)_[A-Za-z0-9]{16,}\b/, 'Stripe secret key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s:@/'"`]+:(?!<)[^\s@/'"`$<{]{3,}@/, 'credentials in a connection URL'],
  [/\b(client_secret|clientSecret|OIDC_CLIENT_SECRET|api_key|apiKey|SECRET|PASSWORD|TOKEN)\b\s*[:=]\s*['"]?(?![<$({])[A-Za-z0-9+/_=.-]{24,}/, 'secret-like assignment'],
];

const problems = [];
for (const f of files) {
  const base = f.split('/').pop();
  if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') {
    problems.push(`${f}: environment file must not be committed`);
    continue;
  }
  let text;
  try {
    text = readFileSync(join(backend, f), 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue; // binary
  text.split('\n').forEach((line, i) => {
    if (/secret-scan:\s*allow/.test(line)) return;
    for (const [re, what] of rules) if (re.test(line)) problems.push(`${f}:${i + 1}: possible ${what}`);
  });
}

if (problems.length) {
  console.error(`secret scan: ${problems.length} finding(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`secret scan: ${files.length} files clean`);
