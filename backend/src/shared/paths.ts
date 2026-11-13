import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The backend package root (the directory holding backend/package.json), from source or from the compiled dist/. */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'migrations'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('Cannot locate the backend package root (package.json + migrations/)');
}

export const migrationsDir = () => join(packageRoot(), 'migrations');
