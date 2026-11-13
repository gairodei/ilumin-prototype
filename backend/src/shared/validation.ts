import type { z } from 'zod';
import { errors } from './errors.js';

/** Parses untrusted input with a zod schema; failures become a 400 VALIDATION_FAILED listing each field problem. */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown, where: 'body' | 'params' | 'query'): z.output<S> {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  throw errors.validation(
    r.error.issues.map((i) => ({
      path: [where, ...i.path.map(String)].join('.'),
      message: i.message,
    })),
  );
}
