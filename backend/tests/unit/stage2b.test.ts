import { describe, expect, it } from 'vitest';
import { eligibilityError } from '../../src/modules/applications/applications.js';
import { type ApplicantFacts, type BatchFacts, evaluateBatch } from '../../src/modules/applications/eligibility.js';
import { classifyCommencement, type CommencementStatus, evidenceTrust, PRODUCTION_PREREQUISITES } from '../../src/modules/enrolments/prerequisites.js';

/** Stage 2B pure rules: commencement classification, the P3 eligibility rule, and error mapping. */

const app = (o: Partial<ApplicantFacts> = {}): ApplicantFacts => ({
  programmeId: 'P',
  programmeVersionId: 'V1',
  programmeStatus: 'active',
  pricingModel: 'fee_options',
  feeOptionId: 'SP',
  feeOptionActive: true,
  feeOptionMode: 'self_paced',
  learnerCountry: 'GB',
  ...o,
});
const batch = (o: Partial<BatchFacts> = {}): BatchFacts => ({
  id: 'B',
  code: 'B-1',
  programmeId: 'P',
  programmeVersionId: 'V1',
  status: 'open',
  startDate: '2027-03-01',
  timeZone: 'Europe/London',
  location: 'online',
  deliveryMode: null,
  capacity: 10,
  active: 0,
  coordinators: 1,
  acceptedFeeOptionIds: ['SP', 'FA'],
  ...o,
});
const before: CommencementStatus = { state: 'before_start_date', localDate: '2027-02-01', startDate: '2027-03-01', timeZone: 'Europe/London', basis: 'b' };
const all = { checkRegion: true, checkCapacity: true };
const codes = (a: ApplicantFacts, b: BatchFacts, c = before, o = all) => evaluateBatch(a, b, c, o).reasons.map((r) => r.code);

describe('commencement (U-05 open): no midnight, no 24-hour fallback', () => {
  it('only the calendar is used: before the start date / on it (unresolved) / after it', () => {
    expect(classifyCommencement('2027-02-28', '2027-03-01')).toBe('before_start_date');
    expect(classifyCommencement('2027-03-01', '2027-03-01')).toBe('unresolved');
    expect(classifyCommencement('2027-03-02', '2027-03-01')).toBe('commenced');
    expect(classifyCommencement('2026-12-31', '2027-01-01')).toBe('before_start_date');
  });
});

describe('P3 eligibility rule (PD-P3-01)', () => {
  it('an eligible batch has no reasons; places are advisory; the fee option decides the mode', () => {
    const r = evaluateBatch(app(), batch({ active: 3 }), before, all);
    expect(r).toMatchObject({ eligible: true, reasons: [], placesLeft: 7, placesLeftAdvisory: true, deliveryMode: 'self_paced', commencement: 'before_start_date' });
  });

  it('lists every reason, never a substitute', () => {
    expect(codes(app(), batch({ programmeId: 'Q' }))).toContain('PROGRAMME_MISMATCH');
    expect(codes(app(), batch({ programmeVersionId: 'V2' }))).toEqual(['PROGRAMME_VERSION_MISMATCH']);
    expect(codes(app({ programmeStatus: 'closed' }), batch())).toEqual(['PROGRAMME_NOT_ACTIVE']);
    expect(codes(app(), batch({ status: 'in_progress' }))).toEqual(['BATCH_STATUS']);
    expect(codes(app(), batch(), { ...before, state: 'commenced' })).toEqual(['BATCH_STARTED']);
    expect(codes(app(), batch({ location: 'AE' }))).toEqual(['REGION_MISMATCH']);
    expect(codes(app(), batch({ location: null }))).toEqual(['LOCATION_NOT_CONFIGURED']);
    expect(codes(app(), batch({ active: 10 }))).toEqual(['BATCH_FULL']);
    expect(codes(app(), batch({ coordinators: 0 }))).toEqual(['NO_COORDINATOR']);
    expect(codes(app({ feeOptionId: null, feeOptionMode: null }), batch())).toEqual(['FEE_OPTION_REQUIRED']);
    expect(codes(app(), batch({ acceptedFeeOptionIds: ['FA'] }))).toEqual(['FEE_OPTION_NOT_ACCEPTED']);
    expect(codes(app({ feeOptionActive: false }), batch())).toEqual(['FEE_OPTION_NOT_ACCEPTED']);
    expect(codes(app(), batch({ status: 'cancelled', location: 'AE', coordinators: 0, active: 10 }))).toEqual([
      'BATCH_STATUS', 'REGION_MISMATCH', 'BATCH_FULL', 'NO_COORDINATOR',
    ]);
  });

  it('an invalid time zone is a reason of its own (the dates cannot be checked)', () => {
    for (const tz of ['UTC', 'GMT+1', '+04:00', 'Mars/Olympus', '']) {
      expect(codes(app(), batch({ timeZone: tz }), { ...before, state: 'unresolved' })).toEqual(['TIME_ZONE_INVALID']);
    }
  });

  it('the start date itself is labelled unresolved, not refused, when a choice is saved (U-05)', () => {
    const r = evaluateBatch(app(), batch(), { ...before, state: 'unresolved' }, all);
    expect(r).toMatchObject({ eligible: true, commencement: 'unresolved' });
  });

  it('single price: no fee option; the batch’s mode is the learner’s', () => {
    const single = app({ pricingModel: 'single_price', feeOptionId: null, feeOptionActive: false, feeOptionMode: null });
    expect(evaluateBatch(single, batch({ deliveryMode: 'fully_assisted', acceptedFeeOptionIds: [] }), before, all)).toMatchObject({ eligible: true, deliveryMode: 'fully_assisted' });
    expect(codes(single, batch({ deliveryMode: null }))).toEqual(['DELIVERY_MODE_UNAVAILABLE']);
  });

  it('region and capacity can be left to later re-checks (PD-P3-09; capacity under the batch lock)', () => {
    expect(codes(app(), batch({ location: 'AE', active: 10 }), before, { checkRegion: false, checkCapacity: false })).toEqual([]);
  });

  it('maps reasons to stable error codes', () => {
    expect(eligibilityError([{ code: 'BATCH_FULL', message: 'x' }]).code).toBe('BATCH_FULL');
    expect(eligibilityError([{ code: 'PROGRAMME_VERSION_MISMATCH', message: 'x' }, { code: 'BATCH_FULL', message: 'y' }]).code).toBe('PROGRAMME_VERSION_MISMATCH');
    const e = eligibilityError([{ code: 'BATCH_FULL', message: 'x' }, { code: 'NO_COORDINATOR', message: 'y' }]);
    expect(e.code).toBe('BATCH_NOT_ELIGIBLE');
    expect(e.details?.map((d) => d.message.split(':')[0])).toEqual(['BATCH_FULL', 'NO_COORDINATOR']);
  });
});

describe('production prerequisites', () => {
  it('never report success', async () => {
    const ctx = { applicationId: 'A', learnerUserId: 'L', programmeId: 'P', programmeVersionId: 'V', termsVersionId: 'T', batchId: 'B', feeOptionId: null, deliveryMode: 'self_paced' };
    expect((await PRODUCTION_PREREQUISITES.agreement.verify(null as never, ctx)).status).toBe('none');
    expect((await PRODUCTION_PREREQUISITES.finance.authorize(null as never, ctx)).status).toBe('none');
    expect((await PRODUCTION_PREREQUISITES.documents.verify(null as never, ctx)).status).toBe('none');
    expect(evidenceTrust(PRODUCTION_PREREQUISITES)).toBe('verified');
    expect(Object.isFrozen(PRODUCTION_PREREQUISITES)).toBe(true);
  });
});
