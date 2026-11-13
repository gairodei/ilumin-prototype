import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTransaction } from '../../src/database/transaction.js';
import { appendAudit } from '../../src/modules/audit/audit.js';
import { CapturingNotificationProvider, notificationHandlers } from '../../src/modules/outbox/notifications.js';
import {
  backoffMs,
  consumeOnce,
  enqueueOutbox,
  OutboxDispatcher,
  type OutboxHandler,
  PermanentDeliveryError,
} from '../../src/modules/outbox/outbox.js';
import { startWorker } from '../../src/worker/worker.js';
import { createTestContext, type TestContext } from '../support/context.js';

/** Transactional outbox on real PostgreSQL: atomicity, competing workers, retries, dead letters, restarts. */
describe('transactional outbox', () => {
  let ctx: TestContext;
  let topicSeq = 0;
  const topic = () => `test.topic_${++topicSeq}`;
  const row = async (id: string) => (await ctx.owner.query(`SELECT * FROM outbox_message WHERE id = $1`, [id])).rows[0];
  const dispatcher = (handlers: Record<string, OutboxHandler>, workerId = 'w1', leaseSeconds = 60) =>
    new OutboxDispatcher(ctx.pool, handlers, { workerId, leaseSeconds, backoff: { baseMs: 1000, maxMs: 8000 } });
  const makeDue = (id: string) => ctx.owner.query(`UPDATE outbox_message SET available_at = now() WHERE id = $1`, [id]);

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());

  it('is written in the same transaction as the state change: a rollback leaves neither', async () => {
    const t = topic();
    await expect(
      withTransaction(ctx.pool, async (tx) => {
        await appendAudit(tx, { actor: { kind: 'system', label: 'test' }, operation: 'test.state_change', entity: { type: 't', id: t } });
        await enqueueOutbox(tx, { topic: t, dedupeKey: 'k1' });
        throw new Error('business rule failed');
      }),
    ).rejects.toThrow('business rule failed');
    expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = $1`, [t])).rows[0].n).toBe(0);
    expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE entity_id = $1`, [t])).rows[0].n).toBe(0);

    await withTransaction(ctx.pool, async (tx) => {
      await appendAudit(tx, { actor: { kind: 'system', label: 'test' }, operation: 'test.state_change', entity: { type: 't', id: t } });
      await enqueueOutbox(tx, { topic: t, dedupeKey: 'k1' });
    });
    expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = $1`, [t])).rows[0].n).toBe(1);
  });

  it('a duplicate dedupe key creates no second message, including under concurrency', async () => {
    const t = topic();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => withTransaction(ctx.pool, (tx) => enqueueOutbox(tx, { topic: t, dedupeKey: 'same', payload: { n: 1 } }))),
    );
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = $1`, [t])).rows[0].n).toBe(1);
  });

  it('competing workers never claim the same message', async () => {
    const t = topic();
    await withTransaction(ctx.pool, async (tx) => {
      for (let i = 0; i < 40; i++) await enqueueOutbox(tx, { topic: t, dedupeKey: `m${i}` });
    });
    const seen: string[] = [];
    const handler: OutboxHandler = async (m) => {
      seen.push(m.id);
      await new Promise((r) => setTimeout(r, 2));
    };
    const workers = Array.from({ length: 4 }, (_, i) => dispatcher({ [t]: handler }, `w${i}`));
    for (let round = 0; round < 5; round++) await Promise.all(workers.map((w) => w.runOnce()));
    expect(seen).toHaveLength(40);
    expect(new Set(seen).size).toBe(40);
    const states = await ctx.owner.query(`SELECT state, count(*)::int AS n FROM outbox_message WHERE topic = $1 GROUP BY state`, [t]);
    expect(states.rows).toEqual([{ state: 'delivered', n: 40 }]);
  });

  it('a failed delivery is retried with bounded exponential backoff and records attempts and the last error', async () => {
    const t = topic();
    const { id } = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'retry', maxAttempts: 5 });
    let calls = 0;
    const d = dispatcher({
      [t]: async () => {
        calls++;
        if (calls < 3) throw new Error(`provider timeout #${calls}`);
      },
    });
    expect((await d.runOnce()).retried).toBe(1);
    let r = await row(id!);
    expect(r.state).toBe('failed');
    expect(r.attempts).toBe(1);
    expect(r.last_error).toBe('Error: provider timeout #1');
    const delay = (await ctx.owner.query(`SELECT extract(epoch FROM available_at - now()) AS s FROM outbox_message WHERE id = $1`, [id])).rows[0].s;
    expect(Number(delay)).toBeGreaterThan(0.5);
    expect(Number(delay)).toBeLessThanOrEqual(1.1);
    expect((await d.runOnce()).claimed).toBe(0); // not due yet
    await makeDue(id!);
    expect((await d.runOnce()).retried).toBe(1);
    await makeDue(id!);
    expect((await d.runOnce()).delivered).toBe(1);
    r = await row(id!);
    expect(r.state).toBe('delivered');
    expect(r.attempts).toBe(3);
    expect(r.last_error).toBeNull();
  });

  it('backoff is exponential and capped', () => {
    const p = { baseMs: 1000, maxMs: 8000 };
    const top = () => 1;
    expect([1, 2, 3, 4, 5, 9].map((a) => backoffMs(a, p, top))).toEqual([1000, 2000, 4000, 8000, 8000, 8000]);
    expect(backoffMs(3, p, () => 0)).toBe(3200);
  });

  it('dead-letters after max attempts, and at once for a permanent error', async () => {
    const t = topic();
    const { id } = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'dead', maxAttempts: 2 });
    const d = dispatcher({ [t]: async () => Promise.reject(new Error('always fails')) });
    await d.runOnce();
    await makeDue(id!);
    expect((await d.runOnce()).deadLettered).toBe(1);
    const r = await row(id!);
    expect(r.state).toBe('dead_letter');
    expect(r.attempts).toBe(2);
    expect(r.dead_lettered_at).not.toBeNull();
    await makeDue(id!);
    expect((await d.runOnce()).claimed).toBe(0); // dead letters are never retried automatically

    const t2 = topic();
    const p = await enqueueOutbox(ctx.pool, { topic: t2, dedupeKey: 'malformed', maxAttempts: 8 });
    await dispatcher({ [t2]: async () => Promise.reject(new PermanentDeliveryError('malformed payload')) }).runOnce();
    expect((await row(p.id!)).state).toBe('dead_letter');
    expect((await row(p.id!)).attempts).toBe(1);
  });

  it('a worker that dies mid-delivery loses nothing: after the lease expires another worker delivers it', async () => {
    const t = topic();
    const { id } = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'crash' });
    const crashed = dispatcher({ [t]: async () => {} }, 'crashed-worker', 30);
    const claimed = await crashed.claim(); // claimed, then the process "dies" before delivering
    expect(claimed.map((m) => m.id)).toEqual([id]);
    expect((await row(id!)).state).toBe('processing');

    const survivor = dispatcher({ [t]: async () => {} }, 'survivor');
    expect((await survivor.runOnce()).claimed).toBe(0); // lease still held
    await ctx.owner.query(`UPDATE outbox_message SET locked_until = now() - interval '1 second' WHERE id = $1`, [id]);
    expect((await survivor.runOnce()).delivered).toBe(1);
    const r = await row(id!);
    expect(r.state).toBe('delivered');
    expect(r.attempts).toBe(2);

    // The crashed worker coming back late cannot overwrite the newer outcome (fenced by attempt number).
    expect(await crashed.deliver(claimed[0]!)).toBe('lostLease');
    expect((await row(id!)).state).toBe('delivered');
  });

  it('duplicate processing does not duplicate the application effect (idempotent consumer)', async () => {
    const t = topic();
    const { id } = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'effect', payload: { entity: 'E1' } });
    const effect: OutboxHandler = async (m) => {
      await withTransaction(ctx.pool, async (tx) => {
        if (!(await consumeOnce(tx, 'test.effect_writer', m.id))) return;
        await appendAudit(tx, {
          actor: { kind: 'system', label: 'test' },
          operation: 'test.effect_applied',
          entity: { type: 'effect', id: String(m.payload.entity) },
        });
      });
    };
    // First worker applies the effect and dies before completing the message.
    const first = dispatcher({ [t]: effect }, 'first', 30);
    const [m] = await first.claim();
    await effect(m!);
    await ctx.owner.query(`UPDATE outbox_message SET locked_until = now() - interval '1 second' WHERE id = $1`, [id]);
    // Redelivery to a second worker.
    expect((await dispatcher({ [t]: effect }, 'second').runOnce()).delivered).toBe(1);
    const n = (await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'test.effect_applied' AND entity_id = 'E1'`))
      .rows[0].n;
    expect(n).toBe(1);
  });

  it('messages for topics without a handler stay pending (no provider configured = nothing sent, nothing lost)', async () => {
    const { id } = await enqueueOutbox(ctx.pool, {
      topic: 'notification.email',
      dedupeKey: 'no-provider',
      payload: { to: 'learner@example.test', template: 'welcome', data: {} },
    });
    const w = await startWorker(ctx.config, { pool: ctx.pool, autoStart: false });
    await w.tick();
    await w.stop();
    expect((await row(id!)).state).toBe('pending');
  });

  it('delivers notifications through the provider interface with the dedupe key as provider idempotency key', async () => {
    const provider = new CapturingNotificationProvider();
    provider.failNext(1);
    const { id } = await enqueueOutbox(ctx.pool, {
      topic: 'notification.sms',
      dedupeKey: 'reminder:42:2026-11-12',
      payload: { to: '+447700900123', template: 'payment.reminder', data: { n: 1 } },
    });
    const d = new OutboxDispatcher(ctx.pool, notificationHandlers(provider), { workerId: 'n', leaseSeconds: 30 });
    await d.runOnce();
    await makeDue(id!);
    await d.runOnce();
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toMatchObject({ channel: 'sms', template: 'payment.reminder', idempotencyKey: 'notification.sms:reminder:42:2026-11-12' });
    expect((await row(id!)).last_error).toBeNull();
  });

  it('a malformed notification payload is dead-lettered without retries', async () => {
    const { id } = await enqueueOutbox(ctx.pool, { topic: 'notification.email', dedupeKey: 'bad-payload', payload: { nope: true } });
    await new OutboxDispatcher(ctx.pool, notificationHandlers(new CapturingNotificationProvider()), { workerId: 'n', leaseSeconds: 30 }).runOnce();
    expect((await row(id!)).state).toBe('dead_letter');
  });

  it('the API role cannot delete outbox rows; retention purges only delivered messages past retention', async () => {
    const t = topic();
    const a = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'old-delivered' });
    const b = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'recent-delivered' });
    const c = await enqueueOutbox(ctx.pool, { topic: t, dedupeKey: 'old-dead' });
    await expect(ctx.pool.query(`DELETE FROM outbox_message WHERE id = $1`, [a.id])).rejects.toMatchObject({ code: '42501' });
    await ctx.owner.query(
      `UPDATE outbox_message SET state = 'delivered', delivered_at = now() - interval '40 days' WHERE id = $1`,
      [a.id],
    );
    await ctx.owner.query(`UPDATE outbox_message SET state = 'delivered', delivered_at = now() WHERE id = $1`, [b.id]);
    await ctx.owner.query(
      `UPDATE outbox_message SET state = 'dead_letter', dead_lettered_at = now() - interval '400 days' WHERE id = $1`,
      [c.id],
    );
    const n = (await ctx.pool.query(`SELECT purge_delivered_outbox_messages(30, 1000) AS n`)).rows[0].n;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await row(a.id!)).toBeUndefined();
    expect(await row(b.id!)).toBeDefined();
    expect(await row(c.id!)).toBeDefined();
    await expect(ctx.pool.query(`SELECT purge_delivered_outbox_messages(0, 1000)`)).rejects.toThrow(/retention_days/);
  });
});
