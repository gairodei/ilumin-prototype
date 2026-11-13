import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enqueueOutbox } from '../../src/modules/outbox/outbox.js';
import {
  DOMAIN_JOB_EXTENSION_POINTS,
  jobHealth,
  JobRegistry,
  JobRunner,
  scheduleJob,
  scheduleRecurring,
} from '../../src/modules/jobs/jobs.js';
import { registerMaintenanceJobs } from '../../src/modules/jobs/maintenance.js';
import { startWorker } from '../../src/worker/worker.js';
import { createTestContext, type TestContext } from '../support/context.js';

/** Database-backed job runner on real PostgreSQL. */
describe('scheduled jobs', () => {
  let ctx: TestContext;
  let seq = 0;
  const name = () => `test.job_${++seq}`;
  const run = async (jobName: string, runKey: string) =>
    (await ctx.owner.query(`SELECT * FROM job_run WHERE job_name = $1 AND run_key = $2`, [jobName, runKey])).rows[0];
  const runner = (registry: JobRegistry, workerId = 'r1', leaseSeconds = 60) =>
    new JobRunner(ctx.pool, registry, { workerId, leaseSeconds, backoff: { baseMs: 1000, maxMs: 4000 } });

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());

  it('runs a due job and leaves a future one alone until the database clock reaches it', async () => {
    const n = name();
    const ran: string[] = [];
    const reg = new JobRegistry().register({ name: n, handler: async ({ run: r }) => void ran.push(r.runKey) });
    await scheduleJob(ctx.pool, { jobName: n, runKey: 'now' });
    const future = new Date(Date.now() + 3_600_000);
    await scheduleJob(ctx.pool, { jobName: n, runKey: 'later', runAt: future });
    expect((await runner(reg).runOnce()).succeeded).toBe(1);
    expect(ran).toEqual(['now']);
    expect((await run(n, 'now')).state).toBe('succeeded');
    expect((await run(n, 'later')).state).toBe('pending');
    // Explicit instants are stored as UTC instants (timestamptz), whatever offset the caller used.
    expect(new Date((await run(n, 'later')).scheduled_for).toISOString()).toBe(future.toISOString());
    await ctx.owner.query(`UPDATE job_run SET available_at = now() WHERE job_name = $1 AND run_key = 'later'`, [n]);
    await runner(reg).runOnce();
    expect(ran).toEqual(['now', 'later']);
  });

  it('recurring slots come from the database clock (UTC) and scheduling them repeatedly is a no-op', async () => {
    const n = name();
    const reg = new JobRegistry().register({ name: n, everySeconds: 3600, handler: async () => {} });
    const created = await Promise.all(Array.from({ length: 5 }, () => scheduleRecurring(ctx.pool, reg)));
    expect(created.reduce((a, b) => a + b, 0)).toBe(1);
    const row = (await ctx.owner.query(`SELECT run_key, scheduled_for FROM job_run WHERE job_name = $1`, [n])).rows[0];
    const dbSlot = (await ctx.owner.query(`SELECT to_timestamp(floor(extract(epoch FROM now()) / 3600) * 3600) AS s`)).rows[0].s as Date;
    expect(new Date(row.scheduled_for).toISOString()).toBe(dbSlot.toISOString());
    expect(row.run_key).toBe(dbSlot.toISOString().replace('.000Z', 'Z'));
    expect(row.run_key).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
  });

  it('a run identity is durable: re-scheduling a finished run does not run it again', async () => {
    const n = name();
    let count = 0;
    const reg = new JobRegistry().register({ name: n, handler: async () => void count++ });
    expect((await scheduleJob(ctx.pool, { jobName: n, runKey: 'once' })).created).toBe(true);
    await runner(reg).runOnce();
    expect((await scheduleJob(ctx.pool, { jobName: n, runKey: 'once' })).created).toBe(false);
    await runner(reg).runOnce();
    expect(count).toBe(1);
  });

  it('a re-executed run (after a crash) does not duplicate its effect when the handler is idempotent', async () => {
    const n = name();
    const reg = new JobRegistry().register({
      name: n,
      handler: async ({ run: r, pool }) => {
        await enqueueOutbox(pool, { topic: 'test.job_effect', dedupeKey: `${r.jobName}:${r.runKey}` });
      },
    });
    await scheduleJob(ctx.pool, { jobName: n, runKey: 'k' });
    const crashed = runner(reg, 'crashed', 30);
    const [claimed] = await crashed.claim();
    await reg.get(n)!.handler({ run: claimed!, pool: ctx.pool }); // effect applied, then the runner dies
    await ctx.owner.query(`UPDATE job_run SET locked_until = now() - interval '1 second' WHERE job_name = $1`, [n]);
    expect((await runner(reg, 'survivor').runOnce()).succeeded).toBe(1);
    expect((await run(n, 'k')).attempts).toBe(2);
    const effects = (await ctx.owner.query(`SELECT count(*)::int AS n FROM outbox_message WHERE dedupe_key = $1`, [`${n}:k`])).rows[0].n;
    expect(effects).toBe(1);
  });

  it('competing runners execute each run exactly once', async () => {
    const n = name();
    const seen: string[] = [];
    const reg = new JobRegistry().register({
      name: n,
      handler: async ({ run: r }) => {
        seen.push(r.runKey);
        await new Promise((res) => setTimeout(res, 3));
      },
    });
    for (let i = 0; i < 30; i++) await scheduleJob(ctx.pool, { jobName: n, runKey: `r${i}` });
    const runners = Array.from({ length: 5 }, (_, i) => runner(reg, `r${i}`));
    for (let round = 0; round < 8; round++) await Promise.all(runners.map((r) => r.runOnce()));
    expect(seen).toHaveLength(30);
    expect(new Set(seen).size).toBe(30);
  });

  it('failure recovery: retries with backoff, then succeeds; exhausting attempts makes the run dead', async () => {
    const n = name();
    let calls = 0;
    const reg = new JobRegistry().register({
      name: n,
      handler: async () => {
        calls++;
        if (calls === 1) throw new Error('database maintenance window');
      },
    });
    await scheduleJob(ctx.pool, { jobName: n, runKey: 'flaky', maxAttempts: 3 });
    expect((await runner(reg).runOnce()).retried).toBe(1);
    let r = await run(n, 'flaky');
    expect(r.state).toBe('failed');
    expect(r.last_error).toBe('Error: database maintenance window');
    await ctx.owner.query(`UPDATE job_run SET available_at = now() WHERE id = $1`, [r.id]);
    expect((await runner(reg).runOnce()).succeeded).toBe(1);
    r = await run(n, 'flaky');
    expect(r.state).toBe('succeeded');
    expect(r.attempts).toBe(2);

    const d = name();
    const dead = new JobRegistry().register({ name: d, handler: async () => Promise.reject(new Error('broken')) });
    await scheduleJob(ctx.pool, { jobName: d, runKey: 'x', maxAttempts: 2 });
    await runner(dead).runOnce();
    await ctx.owner.query(`UPDATE job_run SET available_at = now() WHERE job_name = $1`, [d]);
    expect((await runner(dead).runOnce()).dead).toBe(1);
    expect((await run(d, 'x')).state).toBe('dead');
  });

  it('monitoring reports stuck runs (expired lease) and dead runs', async () => {
    const n = name();
    const reg = new JobRegistry().register({ name: n, handler: async () => {} });
    await scheduleJob(ctx.pool, { jobName: n, runKey: 'stuck' });
    await runner(reg, 'hung-runner', 30).claim();
    await ctx.owner.query(`UPDATE job_run SET locked_until = now() - interval '5 minutes' WHERE job_name = $1`, [n]);
    const h = await jobHealth(ctx.pool);
    expect(h.stuck.some((s) => s.jobName === n && s.lockedBy === 'hung-runner')).toBe(true);
    expect(h.dead.length).toBeGreaterThan(0);
    expect(h.counts.dead).toBeGreaterThan(0);
  });

  it('domain jobs are reserved extension points only: none can be registered or scheduled by default', async () => {
    expect(Object.values(DOMAIN_JOB_EXTENSION_POINTS).sort()).toEqual([
      'deposit.deadline_check',
      'entitlement.expiry',
      'finance.overdue_check',
      'payment.reminder',
      'reservation.cutoff_release',
    ]);
    for (const n of Object.values(DOMAIN_JOB_EXTENSION_POINTS)) {
      expect(() => new JobRegistry().register({ name: n, handler: async () => {} })).toThrow(/reserved Stage 2 extension point/);
    }
    const reg = registerMaintenanceJobs(new JobRegistry(), ctx.config);
    expect(reg.names().filter((x) => !x.startsWith('maintenance.'))).toEqual([]);
  });

  it('the worker runs the built-in maintenance jobs (database-time slots), and the API role cannot delete job rows', async () => {
    const w = await startWorker(ctx.config, { pool: ctx.pool, autoStart: false, workerId: 'maint' });
    await w.tick();
    await w.stop();
    const runs = await ctx.owner.query(`SELECT job_name, state FROM job_run WHERE job_name LIKE 'maintenance.%' ORDER BY job_name`);
    expect(runs.rows.map((r) => r.job_name)).toEqual([
      'maintenance.auth_purge',
      'maintenance.idempotency_purge',
      'maintenance.job_run_purge',
      'maintenance.outbox_purge',
      'maintenance.rate_limit_purge',
    ]);
    expect(runs.rows.every((r) => r.state === 'succeeded')).toBe(true);
    await expect(ctx.pool.query(`DELETE FROM job_run`)).rejects.toMatchObject({ code: '42501' });
  });
});
