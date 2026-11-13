import { z } from 'zod';
import type { OutboxHandler } from './outbox.js';
import { PermanentDeliveryError } from './outbox.js';

/**
 * Notification provider boundary. No email or SMS provider is chosen yet (P10 Stage 4). The outbox topics
 * 'notification.email' and 'notification.sms' are delivered through a NotificationProvider:
 *
 *  - NOTIFICATION_TRANSPORT=none (default): no handler is registered, so notification messages stay 'pending' in the
 *    outbox until a real provider is configured. Nothing is sent and nothing is lost.
 *  - NOTIFICATION_TRANSPORT=capture: the CapturingNotificationProvider keeps messages in memory and logs only the topic
 *    and message id. Development and tests only; refused in production configuration.
 *
 * A real provider must pass `idempotencyKey` (the outbox dedupe key) as the provider's own idempotency key, so a
 * redelivery after a worker crash does not send twice where the provider supports it.
 */

export const NotificationPayload = z
  .object({
    to: z.string().min(3).max(320),
    template: z.string().regex(/^[a-z][a-z0-9_.-]{1,99}$/),
    data: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export interface NotificationMessage extends z.output<typeof NotificationPayload> {
  channel: 'email' | 'sms';
  idempotencyKey: string;
  messageId: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<{ providerMessageId?: string }>;
}

/** Test/development transport: records what would have been sent. */
export class CapturingNotificationProvider implements NotificationProvider {
  readonly name = 'capture';
  readonly sent: NotificationMessage[] = [];
  private failures: Error[] = [];

  /** The next `count` sends throw `err` (to exercise retries). */
  failNext(count: number, err: Error = new Error('simulated provider failure')): void {
    for (let i = 0; i < count; i++) this.failures.push(err);
  }

  async send(message: NotificationMessage): Promise<{ providerMessageId?: string }> {
    const f = this.failures.shift();
    if (f) throw f;
    this.sent.push(message);
    return { providerMessageId: `capture-${this.sent.length}` };
  }
}

export function notificationHandlers(provider: NotificationProvider): Record<string, OutboxHandler> {
  const make =
    (channel: 'email' | 'sms'): OutboxHandler =>
    async (m) => {
      const parsed = NotificationPayload.safeParse(m.payload);
      if (!parsed.success) throw new PermanentDeliveryError('notification payload is malformed');
      await provider.send({ ...parsed.data, channel, idempotencyKey: `${m.topic}:${m.dedupeKey}`, messageId: m.id });
    };
  return { 'notification.email': make('email'), 'notification.sms': make('sms') };
}
