import { describe, expect, it } from 'vitest';
import { isIanaZone } from '../../src/modules/batches/routes.js';
import { mapDatabaseError } from '../../src/shared/db-errors.js';

describe('Stage 2A helpers', () => {
  it('accepts explicit IANA Area/Location zones only', () => {
    for (const ok of ['Europe/London', 'Asia/Dubai', 'America/Argentina/Buenos_Aires', 'Etc/UTC']) expect(isIanaZone(ok), ok).toBe(true);
    for (const bad of ['', 'UTC', 'GMT', 'BST', '+01:00', 'EST5EDT', 'Europe/Londn', 'posix/Europe/London', 'Europe/London ', '../etc']) {
      expect(isIanaZone(bad), bad).toBe(false);
    }
  });

  it('maps database domain refusals to stable API errors and leaves other errors alone', () => {
    expect(mapDatabaseError({ code: 'IL001' })).toMatchObject({ status: 409, code: 'CAPACITY_CONFLICT' });
    expect(mapDatabaseError({ code: 'IL002' })).toMatchObject({ status: 409, code: 'INVALID_STATE_TRANSITION' });
    expect(mapDatabaseError({ code: 'IL003' })).toMatchObject({ status: 409, code: 'STAFF_ALLOCATION_CONFLICT' });
    expect(mapDatabaseError({ code: 'IL004' })).toMatchObject({ status: 409, code: 'PROGRAMME_VERSION_MISMATCH' });
    expect(mapDatabaseError({ code: 'IL005' })).toMatchObject({ status: 409, code: 'IMMUTABLE_RECORD' });
    expect(mapDatabaseError({ code: 'IL006' })).toMatchObject({ status: 409, code: 'BATCH_NOT_ELIGIBLE' });
    expect(mapDatabaseError({ code: 'IL007' })).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    for (const c of ['55P03', '40001', '40P01']) expect(mapDatabaseError({ code: c })).toMatchObject({ status: 503 });
    expect(mapDatabaseError({ code: '23505' })).toBeNull();
    expect(mapDatabaseError(new Error('x'))).toBeNull();
    // The client never sees the trigger's message text.
    expect(mapDatabaseError({ code: 'IL001', message: 'batch 1234 is full (3 of 3)' })!.message).not.toContain('1234');
  });
});
