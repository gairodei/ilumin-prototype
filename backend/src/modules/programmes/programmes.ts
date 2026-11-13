import type { PoolClient, Queryable } from '../../database/pool.js';
import { errors } from '../../shared/errors.js';
import { type AuditActor, type AuditRequestContext, appendAudit } from '../audit/audit.js';

/**
 * Programmes, immutable programme versions and fee options (Stage 2A, ADR 0012).
 *
 * Publication is INTERNAL ONLY (publishProgrammeVersion): no HTTP route publishes a version. It requires a recorded
 * Finance approval by an active Finance Admin or Super Administrator (PD-R1-05), and the database refuses a published
 * version without one. The Stage 2 Finance workflow (approval requests, review queue, publication UI) will call it;
 * until then, nothing operational can publish a financially unapproved programme.
 */

export type DeliveryMode = 'self_paced' | 'fully_assisted';
export type PricingModel = 'fee_options' | 'single_price';

export interface ActorContext {
  actor: AuditActor;
  request?: AuditRequestContext;
}

export interface FeeOptionView {
  id: string;
  code: string;
  label: string;
  deliveryMode: DeliveryMode;
  status: 'active' | 'retired';
  priceMinor: number | null;
  currency: string | null;
}

export interface VersionView {
  id: string;
  programmeId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'superseded';
  pricingModel: PricingModel;
  singlePrice: { priceMinor: number; currency: string } | null;
  feeOptions: FeeOptionView[];
  publishedAt: string | null;
  publishedBy: string | null;
  financeApproval: { approvedBy: string; approvedAt: string; reference: string } | null;
  snapshot: unknown;
  createdAt: string;
}

export interface ProgrammeView {
  id: string;
  code: string;
  title: string;
  level: number;
  status: 'draft' | 'active' | 'closed' | 'archived';
  rowVersion: number;
  currentPublishedVersionId: string | null;
  draftVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProgrammeRow {
  id: string;
  code: string;
  title: string;
  level: number;
  status: ProgrammeView['status'];
  row_version: number;
  published_id: string | null;
  draft_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const PROGRAMME_SELECT = `
  SELECT p.id, p.code, p.title, p.level, p.status, p.row_version, p.created_at, p.updated_at,
         (SELECT id FROM programme_version WHERE programme_id = p.id AND status = 'published') AS published_id,
         (SELECT id FROM programme_version WHERE programme_id = p.id AND status = 'draft') AS draft_id
    FROM programme p`;

const toProgramme = (r: ProgrammeRow): ProgrammeView => ({
  id: r.id,
  code: r.code,
  title: r.title,
  level: r.level,
  status: r.status,
  rowVersion: r.row_version,
  currentPublishedVersionId: r.published_id,
  draftVersionId: r.draft_id,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

export async function getProgramme(db: Queryable, id: string, opts: { forUpdate?: boolean } = {}): Promise<ProgrammeView | null> {
  if (opts.forUpdate) await db.query(`SELECT 1 FROM programme WHERE id = $1 FOR UPDATE`, [id]);
  const r = await db.query<ProgrammeRow>(`${PROGRAMME_SELECT} WHERE p.id = $1`, [id]);
  return r.rows[0] ? toProgramme(r.rows[0]) : null;
}

export async function listProgrammes(
  db: Queryable,
  f: { status?: string; level?: number; after?: string; limit: number },
): Promise<ProgrammeView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace('?', `$${params.length}`));
  };
  if (f.status) add('p.status = ?', f.status);
  if (f.level) add('p.level = ?', f.level);
  if (f.after) add('p.code > ?', f.after);
  params.push(f.limit);
  const r = await db.query<ProgrammeRow>(
    `${PROGRAMME_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.code LIMIT $${params.length}`,
    params,
  );
  return r.rows.map(toProgramme);
}

interface VersionRow {
  id: string;
  programme_id: string;
  version_number: number;
  status: VersionView['status'];
  pricing_model: PricingModel;
  single_price_minor: string | null;
  currency: string | null;
  snapshot: unknown;
  published_at: Date | null;
  published_by: string | null;
  finance_approved_by: string | null;
  finance_approved_at: Date | null;
  finance_approval_ref: string | null;
  created_at: Date;
}

async function versionOptions(db: Queryable, versionId: string): Promise<FeeOptionView[]> {
  const r = await db.query<{
    id: string;
    code: string;
    label: string;
    delivery_mode: DeliveryMode;
    status: FeeOptionView['status'];
    price_minor: string;
    currency: string;
  }>(
    `SELECT o.id, o.code, o.label, o.delivery_mode, o.status, f.price_minor::text AS price_minor, f.currency
       FROM programme_version_fee_option f JOIN fee_option o ON o.id = f.fee_option_id
      WHERE f.programme_version_id = $1 ORDER BY o.code`,
    [versionId],
  );
  return r.rows.map((o) => ({
    id: o.id,
    code: o.code,
    label: o.label,
    deliveryMode: o.delivery_mode,
    status: o.status,
    priceMinor: Number(o.price_minor),
    currency: o.currency,
  }));
}

async function toVersion(db: Queryable, v: VersionRow): Promise<VersionView> {
  return {
    id: v.id,
    programmeId: v.programme_id,
    versionNumber: v.version_number,
    status: v.status,
    pricingModel: v.pricing_model,
    singlePrice:
      v.pricing_model === 'single_price' ? { priceMinor: Number(v.single_price_minor), currency: v.currency! } : null,
    feeOptions: v.pricing_model === 'fee_options' ? await versionOptions(db, v.id) : [],
    publishedAt: v.published_at?.toISOString() ?? null,
    publishedBy: v.published_by,
    financeApproval: v.finance_approved_by
      ? { approvedBy: v.finance_approved_by, approvedAt: v.finance_approved_at!.toISOString(), reference: v.finance_approval_ref! }
      : null,
    snapshot: v.snapshot,
    createdAt: v.created_at.toISOString(),
  };
}

const VERSION_SELECT = `SELECT id, programme_id, version_number, status, pricing_model, single_price_minor::text AS single_price_minor,
  currency, snapshot, published_at, published_by, finance_approved_by, finance_approved_at, finance_approval_ref, created_at
  FROM programme_version`;

/** A version of THIS programme (a version id of another programme is not found: no cross-programme reads). */
export async function getVersion(db: Queryable, programmeId: string, versionId: string): Promise<VersionView | null> {
  const r = await db.query<VersionRow>(`${VERSION_SELECT} WHERE id = $1 AND programme_id = $2`, [versionId, programmeId]);
  return r.rows[0] ? toVersion(db, r.rows[0]) : null;
}

export async function listVersions(db: Queryable, programmeId: string): Promise<VersionView[]> {
  const r = await db.query<VersionRow>(`${VERSION_SELECT} WHERE programme_id = $1 ORDER BY version_number DESC`, [programmeId]);
  return Promise.all(r.rows.map((v) => toVersion(db, v)));
}

export async function programmeFeeOptions(db: Queryable, programmeId: string): Promise<Array<Omit<FeeOptionView, 'priceMinor' | 'currency'>>> {
  const r = await db.query<{ id: string; code: string; label: string; delivery_mode: DeliveryMode; status: FeeOptionView['status'] }>(
    `SELECT id, code, label, delivery_mode, status FROM fee_option WHERE programme_id = $1 ORDER BY code`,
    [programmeId],
  );
  return r.rows.map((o) => ({ id: o.id, code: o.code, label: o.label, deliveryMode: o.delivery_mode, status: o.status }));
}

// ── Drafts ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface NewFeeOption {
  label: string;
  deliveryMode: DeliveryMode;
  priceMinor: number;
  currency: string;
}

export type NewPricing =
  | { model: 'single_price'; priceMinor: number; currency: string }
  | { model: 'fee_options'; options: NewFeeOption[] };

/** PD-R1-08: option ids are numbered per programme (<programme code>-FO-nnn) and never reused. */
async function nextOptionCode(tx: PoolClient, programmeId: string, programmeCode: string): Promise<string> {
  const r = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM fee_option WHERE programme_id = $1`, [programmeId]);
  return `${programmeCode}-FO-${String(r.rows[0]!.n + 1).padStart(3, '0')}`;
}

async function addOption(
  tx: PoolClient,
  p: { id: string; code: string },
  versionId: string,
  o: NewFeeOption,
  userId: string,
): Promise<void> {
  const code = await nextOptionCode(tx, p.id, p.code);
  const r = await tx.query<{ id: string }>(
    `INSERT INTO fee_option (programme_id, code, label, delivery_mode, created_in_version_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [p.id, code, o.label, o.deliveryMode, versionId, userId],
  );
  await tx.query(
    `INSERT INTO programme_version_fee_option (programme_version_id, programme_id, fee_option_id, price_minor, currency)
     VALUES ($1, $2, $3, $4, $5)`,
    [versionId, p.id, r.rows[0]!.id, o.priceMinor, o.currency],
  );
}

export async function createProgrammeDraft(
  tx: PoolClient,
  ctx: ActorContext,
  input: { code: string; title: string; level: 2 | 3 | 4 | 5; pricing: NewPricing },
): Promise<{ programme: ProgrammeView; version: VersionView }> {
  const userId = ctx.actor.kind === 'user' ? ctx.actor.principal.userId : null;
  if (!userId) throw new Error('a programme is created by a user');
  if (input.level === 3 && input.pricing.model !== 'fee_options') {
    throw errors.validation([{ path: 'pricing.model', message: 'Level 3 programmes are priced by fee options (R1)' }]);
  }
  let programmeId: string;
  try {
    const p = await tx.query<{ id: string }>(
      `INSERT INTO programme (code, title, level, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.code, input.title, input.level, userId],
    );
    programmeId = p.rows[0]!.id;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw errors.conflict('A programme with this code already exists.');
    throw err;
  }
  const single = input.pricing.model === 'single_price' ? input.pricing : null;
  const v = await tx.query<{ id: string }>(
    `INSERT INTO programme_version (programme_id, version_number, pricing_model, single_price_minor, currency, created_by)
     VALUES ($1, 1, $2, $3, $4, $5) RETURNING id`,
    [programmeId, input.pricing.model, single?.priceMinor ?? null, single?.currency ?? null, userId],
  );
  const versionId = v.rows[0]!.id;
  if (input.pricing.model === 'fee_options') {
    for (const o of input.pricing.options) await addOption(tx, { id: programmeId, code: input.code }, versionId, o, userId);
  }
  const programme = (await getProgramme(tx, programmeId))!;
  const version = (await getVersion(tx, programmeId, versionId))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'programme.created',
    entity: { type: 'programme', id: programmeId },
    after: { code: programme.code, title: programme.title, level: programme.level, status: programme.status, draftVersion: summary(version) },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return { programme, version };
}

const summary = (v: VersionView) => ({
  id: v.id,
  versionNumber: v.versionNumber,
  pricingModel: v.pricingModel,
  singlePrice: v.singlePrice,
  feeOptions: v.feeOptions.map((o) => ({ id: o.id, code: o.code, deliveryMode: o.deliveryMode, priceMinor: o.priceMinor, currency: o.currency })),
});

/**
 * INTERNAL: starts the next draft version from the current published one (same pricing model, active options and
 * prices). For the future course-builder / Finance workflow; not exposed over HTTP in Stage 2A.
 */
export async function createNextDraftVersion(tx: PoolClient, ctx: ActorContext, programmeId: string): Promise<VersionView> {
  const userId = ctx.actor.kind === 'user' ? ctx.actor.principal.userId : null;
  if (!userId) throw new Error('a draft version is created by a user');
  const p = await getProgramme(tx, programmeId, { forUpdate: true });
  if (!p) throw errors.notFound('Programme not found.');
  if (p.draftVersionId) throw errors.conflict('The programme already has a draft version.');
  if (!p.currentPublishedVersionId) throw errors.conflict('The programme has no published version to start from.');
  const cur = (await getVersion(tx, programmeId, p.currentPublishedVersionId))!;
  const n = await tx.query<{ n: number }>(`SELECT max(version_number)::int + 1 AS n FROM programme_version WHERE programme_id = $1`, [programmeId]);
  const v = await tx.query<{ id: string }>(
    `INSERT INTO programme_version (programme_id, version_number, pricing_model, single_price_minor, currency, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [programmeId, n.rows[0]!.n, cur.pricingModel, cur.singlePrice?.priceMinor ?? null, cur.singlePrice?.currency ?? null, userId],
  );
  for (const o of cur.feeOptions.filter((x) => x.status === 'active')) {
    await tx.query(
      `INSERT INTO programme_version_fee_option (programme_version_id, programme_id, fee_option_id, price_minor, currency)
       VALUES ($1, $2, $3, $4, $5)`,
      [v.rows[0]!.id, programmeId, o.id, o.priceMinor, o.currency],
    );
  }
  const version = (await getVersion(tx, programmeId, v.rows[0]!.id))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'programme_version.draft_created',
    entity: { type: 'programme_version', id: version.id },
    after: summary(version),
    metadata: { programmeId, fromVersionId: cur.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return version;
}

/** INTERNAL: adds a fee option to a DRAFT fee-option version (the published versions are immutable). */
export async function addDraftFeeOption(
  tx: PoolClient,
  ctx: ActorContext,
  input: { programmeId: string; versionId: string; option: NewFeeOption },
): Promise<VersionView> {
  const userId = ctx.actor.kind === 'user' ? ctx.actor.principal.userId : null;
  if (!userId) throw new Error('a fee option is added by a user');
  const p = await getProgramme(tx, input.programmeId, { forUpdate: true });
  if (!p) throw errors.notFound('Programme not found.');
  if (p.draftVersionId !== input.versionId) {
    throw errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'Fee options are added to the programme’s draft version only.');
  }
  await addOption(tx, p, input.versionId, input.option, userId);
  const version = (await getVersion(tx, input.programmeId, input.versionId))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'programme_version.fee_option_added',
    entity: { type: 'programme_version', id: version.id },
    after: summary(version),
    metadata: { programmeId: p.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return version;
}

// ── Publication (internal; Finance-approval gated) ──────────────────────────────────────────────────────────────────

export interface FinanceApproval {
  /** The Finance Admin or Super Administrator who approved the version's financial package (PD-R1-05). */
  approvedByUserId: string;
  /** The approval record in the Finance workflow (Stage 2 Finance). */
  reference: string;
}

export async function publishProgrammeVersion(
  tx: PoolClient,
  ctx: ActorContext,
  input: { programmeId: string; versionId: string; approval: FinanceApproval },
): Promise<VersionView> {
  const publisher = ctx.actor.kind === 'user' ? ctx.actor.principal.userId : null;
  if (!publisher) throw new Error('a version is published by a user');
  if (!input.approval?.reference?.trim()) throw errors.validation([{ path: 'approval.reference', message: 'is required' }]);

  const p = await getProgramme(tx, input.programmeId, { forUpdate: true });
  if (!p) throw errors.notFound('Programme not found.');
  const lock = await tx.query<{ status: string }>(
    `SELECT status FROM programme_version WHERE id = $1 AND programme_id = $2 FOR UPDATE`,
    [input.versionId, input.programmeId],
  );
  if (!lock.rows[0]) throw errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'The version does not belong to this programme.');
  if (lock.rows[0].status !== 'draft') throw errors.domain(409, 'INVALID_STATE_TRANSITION', 'Only a draft version is published.');
  if (['archived'].includes(p.status)) throw errors.domain(409, 'INVALID_STATE_TRANSITION', 'The programme is archived.');

  const approver = await tx.query(
    `SELECT 1 FROM app_user u JOIN user_role r ON r.user_id = u.id AND r.revoked_at IS NULL
      WHERE u.id = $1 AND u.status = 'active' AND r.role IN ('finance_admin', 'super_admin')`,
    [input.approval.approvedByUserId],
  );
  if (approver.rowCount === 0) throw errors.forbidden('The Finance approval must come from an active Finance Admin or Super Administrator.');

  const draft = (await getVersion(tx, input.programmeId, input.versionId))!;
  const snapshot = {
    programme: { id: p.id, code: p.code, title: p.title, level: p.level },
    version: { id: draft.id, number: draft.versionNumber, pricingModel: draft.pricingModel, singlePrice: draft.singlePrice },
    feeOptions: draft.feeOptions
      .filter((o) => o.status === 'active')
      .map((o) => ({ id: o.id, code: o.code, label: o.label, deliveryMode: o.deliveryMode, priceMinor: o.priceMinor, currency: o.currency })),
    financeApproval: { approvedBy: input.approval.approvedByUserId, reference: input.approval.reference },
  };
  const before = p.currentPublishedVersionId;
  if (before) await tx.query(`UPDATE programme_version SET status = 'superseded' WHERE id = $1`, [before]);
  await tx.query(
    `UPDATE programme_version
        SET status = 'published', snapshot = $2, finance_approved_by = $3, finance_approved_at = now(),
            finance_approval_ref = $4, published_by = $5, published_at = now()
      WHERE id = $1`,
    [input.versionId, JSON.stringify(snapshot), input.approval.approvedByUserId, input.approval.reference.trim(), publisher],
  );
  const version = (await getVersion(tx, input.programmeId, input.versionId))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'programme_version.published',
    entity: { type: 'programme_version', id: version.id },
    before: { status: 'draft', supersedes: before },
    after: { status: 'published', snapshot },
    metadata: { programmeId: p.id, financeApprovalRef: input.approval.reference },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return version;
}
