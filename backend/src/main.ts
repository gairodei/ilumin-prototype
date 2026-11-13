import { ConfigError, loadConfig } from './config/config.js';
import { DatabaseUnavailableError } from './database/pool.js';
import { startServer } from './server.js';

/** Process entry point: validate configuration, start, and shut down gracefully on SIGTERM / SIGINT. */
async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`${err.message}\nSee backend/.env.example and backend/README.md.`);
      process.exit(78); // EX_CONFIG
    }
    throw err;
  }

  let server;
  try {
    server = await startServer(config);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      console.error(`Start-up refused: ${err.message}`);
      process.exit(69); // EX_UNAVAILABLE
    }
    throw err;
  }
  server.app.log.info({ url: server.url, env: config.env }, 'ilumin backend listening');

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      server
        .shutdown(signal)
        .then(() => process.exit(0))
        .catch((err) => {
          console.error('shutdown failed', err);
          process.exit(1);
        });
    });
  }
  process.on('unhandledRejection', (reason) => {
    server.app.log.error({ err: reason }, 'unhandled promise rejection');
  });
}

main().catch((err) => {
  console.error('Fatal start-up error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
