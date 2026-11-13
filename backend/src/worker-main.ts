import { ConfigError, loadConfig } from './config/config.js';
import { DatabaseUnavailableError } from './database/pool.js';
import { startWorker } from './worker/worker.js';

/** Worker process entry point (`npm run worker` / `npm run worker:prod`). Same configuration as the API. */
async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${err.message}\nSee backend/.env.example and backend/README.md.`);
      process.exit(78);
    }
    throw err;
  }
  const log = {
    info: (obj: object, msg: string) => console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), msg, ...obj })),
    error: (obj: object, msg: string) => console.error(JSON.stringify({ level: 'error', time: new Date().toISOString(), msg, ...obj })),
  };
  let worker;
  try {
    worker = await startWorker(config, { logger: log });
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      console.error(`Start-up refused: ${err.message}`);
      process.exit(69);
    }
    throw err;
  }
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      worker
        .stop()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  }
}

main().catch((err) => {
  console.error('Fatal worker error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
