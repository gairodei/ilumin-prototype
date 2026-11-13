import { describe, expect, it } from 'vitest';
import { canonicalJson, fingerprint, validateIdempotencyKey } from '../../src/shared/idempotency.js';

describe('idempotency helpers', () => {
  it('canonical JSON ignores key order and undefined members', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe('{"a":{"d":[1,{"x":1,"y":2}]},"b":1}');
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(fingerprint({ a: [1, 2] })).not.toBe(fingerprint({ a: [2, 1] }));
  });

  it('validates the Idempotency-Key header', () => {
    expect(validateIdempotencyKey('order-2026-11-12:0001')).toBe('order-2026-11-12:0001');
    expect(() => validateIdempotencyKey(undefined)).toThrow(/requires an Idempotency-Key/);
    expect(() => validateIdempotencyKey('short')).toThrow(/8–255/);
    expect(() => validateIdempotencyKey('has spaces in it')).toThrow(/8–255/);
    expect(() => validateIdempotencyKey(['a', 'b'])).toThrow(/8–255/);
  });
});
