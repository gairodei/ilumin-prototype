#!/usr/bin/env node
// Runs the backend test suite against a real, disposable PostgreSQL cluster:
//   initdb into a temporary directory → start on a free loopback port → run vitest → stop → delete the directory.
// Needs the PostgreSQL server binaries (initdb, pg_ctl). Found via PG_BIN, `pg_config --bindir`, PATH, or the default
// Windows install folder. The cluster uses trust authentication and listens on 127.0.0.1 only; it never outlives the run.
// Extra arguments are passed to vitest (e.g. `npm run test:ephemeral -- tests/integration/audit.test.ts`).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Windows: a lower-case drive letter (c:\) in the working directory makes Vite load vitest twice ("Cannot read
// properties of undefined (reading 'config')"). Normalise to upper case.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..').replace(/^([a-z]):/, (_, d) => `${d.toUpperCase()}:`);
const exe = (n) => (process.platform === 'win32' ? `${n}.exe` : n);

function findBin() {
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(process.env.PG_BIN);
  const cfg = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  if (cfg.status === 0) candidates.push(cfg.stdout.trim());
  if (process.platform === 'win32') {
    const base = 'C:\\Program Files\\PostgreSQL';
    if (existsSync(base)) {
      for (const v of readdirSync(base).sort((a, b) => Number(b) - Number(a))) candidates.push(join(base, v, 'bin'));
    }
  }
  for (const d of candidates) if (existsSync(join(d, exe('initdb'))) && existsSync(join(d, exe('pg_ctl')))) return d;
  const onPath = spawnSync(exe('initdb'), ['--version']);
  if (onPath.status === 0) return '';
  throw new Error('PostgreSQL server binaries not found. Set PG_BIN to the directory containing initdb and pg_ctl.');
}

const freePort = () =>
  new Promise((res, rej) => {
    const s = createServer();
    s.once('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`);
  return r;
}

const bin = findBin();
const tool = (n) => (bin ? join(bin, exe(n)) : exe(n));
const dataDir = mkdtempSync(join(tmpdir(), 'ilumin-pg-'));
const port = await freePort();
let started = false;
let code = 1;
try {
  run(tool('initdb'), ['-D', dataDir, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  // stdio 'ignore': the server inherits pg_ctl's handles, so piped stdout would never close and spawnSync would hang.
  // On Linux/macOS the default socket directory (/var/run/postgresql) is often not writable by a normal user (CI
  // runners): keep the socket inside the temporary data directory.
  const socketOpt = process.platform === 'win32' ? '' : ` -c unix_socket_directories=${dataDir}`;
  const startRes = spawnSync(tool('pg_ctl'), [
    '-D', dataDir, '-l', join(dataDir, 'server.log'), '-w', '-t', '60',
    '-o', `-p ${port} -c listen_addresses=127.0.0.1 -c max_connections=400 -c fsync=off${socketOpt}`, 'start',
  ], { stdio: 'ignore' });
  if (startRes.status !== 0) throw new Error(`pg_ctl start failed (see ${join(dataDir, 'server.log')})`);
  started = true;
  const version = run(tool('pg_ctl'), ['--version']).stdout.trim();
  console.log(`ephemeral PostgreSQL: ${version} on 127.0.0.1:${port}`);
  const vitest = join(root, 'node_modules', 'vitest', 'vitest.mjs');
  code = await new Promise((res) => {
    const child = spawn(process.execPath, [vitest, 'run', ...process.argv.slice(2)], {
      cwd: root,
      stdio: 'inherit',
      // PG_BIN lets the backup/restore drill test use pg_dump / pg_restore of the same major version as this server.
      env: {
        ...process.env,
        TEST_DATABASE_ADMIN_URL: `postgres://postgres@127.0.0.1:${port}/postgres`,
        ...(bin ? { PG_BIN: bin } : {}),
      },
    });
    child.on('exit', (c) => res(c ?? 1));
  });
} catch (err) {
  console.error(err.message);
} finally {
  if (started) spawnSync(tool('pg_ctl'), ['-D', dataDir, '-m', 'fast', '-w', 'stop'], { encoding: 'utf8' });
  rmSync(dataDir, { recursive: true, force: true });
}
process.exit(code);
