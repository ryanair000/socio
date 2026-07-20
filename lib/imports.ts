import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { ensureTikTokSchema } from "@/lib/schema";
import {
  applyOverduePolicy,
  type OverduePolicy,
  type ParsedContentPack,
} from "@/lib/content-pack";
import type { PublishPlatform, QaStatus } from "@/lib/types";

export type UploadedImportAsset = {
  filename: string;
  sha256: string;
  contentType: string;
  sizeBytes: number;
  imageUrl: string;
  imagePathname: string;
};

export type ImportSummary = {
  id: string;
  name: string;
  brand: string;
  status: string;
  version: number;
  schemaVersion: string;
  timezone: string;
  sourceWeek: string | null;
  defaultOverduePolicy: OverduePolicy;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  totalEntries: number;
  createdAt: string;
  updatedAt: string;
};

export type ImportDetail = ImportSummary & {
  packHash: string;
  entries: Array<{
    id: string;
    sourceRef: string;
    position: number;
    title: string;
    caption: string;
    format: "single" | "carousel";
    platforms: PublishPlatform[];
    scheduledAt: string | null;
    qaStatus: QaStatus;
    holdReason: string | null;
    status: string;
    postId: string | null;
    media: Array<{
      id: string;
      position: number;
      filename: string;
      imageUrl: string;
      imagePathname: string;
      contentType: string;
      sha256: string;
    }>;
    checks: Array<{
      id: string;
      code: string;
      severity: "info" | "warning" | "error";
      message: string;
      resolved: boolean;
    }>;
  }>;
  checks: Array<{
    id: string;
    entryId: string | null;
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
    resolved: boolean;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    details: unknown;
    createdAt: string;
  }>;
};

let importSchemaPromise: Promise<void> | null = null;

export function ensureImportSchema() {
  if (!importSchemaPromise) {
    importSchemaPromise = (async () => {
      const sql = getSql();
      await sql.transaction([
        sql`SELECT pg_advisory_xact_lock(hashtext('socio:import-schema:v1'))`,
        sql`CREATE TABLE IF NOT EXISTS import_batches (
          id uuid PRIMARY KEY,
          pack_hash text NOT NULL UNIQUE,
          name text NOT NULL,
          brand text NOT NULL,
          timezone text NOT NULL,
          schema_version text NOT NULL,
          source_week text,
          default_overdue_policy text NOT NULL DEFAULT 'roll_forward',
          status text NOT NULL DEFAULT 'needs_review',
          version integer NOT NULL DEFAULT 1,
          ready_count integer NOT NULL DEFAULT 0,
          warning_count integer NOT NULL DEFAULT 0,
          blocked_count integer NOT NULL DEFAULT 0,
          total_entries integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`CREATE TABLE IF NOT EXISTS import_assets (
          id uuid PRIMARY KEY,
          batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
          filename text NOT NULL,
          sha256 text NOT NULL,
          content_type text NOT NULL,
          size_bytes integer NOT NULL,
          image_url text NOT NULL,
          image_pathname text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(batch_id, filename)
        )`,
        sql`CREATE TABLE IF NOT EXISTS import_entries (
          id uuid PRIMARY KEY,
          batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
          source_ref text NOT NULL,
          position integer NOT NULL,
          title text NOT NULL,
          caption text NOT NULL DEFAULT '',
          post_format text NOT NULL,
          platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
          scheduled_at timestamptz,
          qa_status text NOT NULL DEFAULT 'ready',
          hold_reason text,
          content_hash text NOT NULL,
          status text NOT NULL DEFAULT 'staged',
          post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
          approved_at timestamptz,
          committed_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE(batch_id, source_ref)
        )`,
        sql`CREATE TABLE IF NOT EXISTS import_entry_media (
          entry_id uuid NOT NULL REFERENCES import_entries(id) ON DELETE CASCADE,
          asset_id uuid NOT NULL REFERENCES import_assets(id) ON DELETE CASCADE,
          position integer NOT NULL,
          PRIMARY KEY(entry_id, position)
        )`,
        sql`CREATE TABLE IF NOT EXISTS import_checks (
          id uuid PRIMARY KEY,
          batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
          entry_id uuid REFERENCES import_entries(id) ON DELETE CASCADE,
          code text NOT NULL,
          severity text NOT NULL,
          message text NOT NULL,
          resolved boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          resolved_at timestamptz
        )`,
        sql`CREATE TABLE IF NOT EXISTS import_events (
          id uuid PRIMARY KEY,
          batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
          event_type text NOT NULL,
          details jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`CREATE INDEX IF NOT EXISTS import_batches_status_idx ON import_batches(status, updated_at DESC)`,
        sql`CREATE INDEX IF NOT EXISTS import_entries_batch_idx ON import_entries(batch_id, position)`,
        sql`CREATE INDEX IF NOT EXISTS import_entries_post_idx ON import_entries(post_id) WHERE post_id IS NOT NULL`,
        sql`CREATE INDEX IF NOT EXISTS import_checks_batch_idx ON import_checks(batch_id, severity, resolved)`,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS import_entries_content_hash_idx ON import_entries(batch_id, content_hash)`,
      ]);
    })().catch((error) => {
      importSchemaPromise = null;
      throw error;
    });
  }
  return importSchemaPromise;
}

function summaryFromRow(row: Record<string, unknown>): ImportSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    brand: String(row.brand),
    status: String(row.status),
    version: Number(row.version),
    schemaVersion: String(row.schema_version),
    timezone: String(row.timezone),
    sourceWeek: row.source_week ? String(row.source_week) : null,
    defaultOverduePolicy: String(row.default_overdue_policy) as OverduePolicy,
    readyCount: Number(row.ready_count ?? 0),
    warningCount: Number(row.warning_count ?? 0),
    blockedCount: Number(row.blocked_count ?? 0),
    totalEntries: Number(row.total_entries ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function addEvent(batchId: string, eventType: string, details: unknown = {}) {
  await getSql()`INSERT INTO import_events (id, batch_id, event_type, details)
    VALUES (${randomUUID()}, ${batchId}, ${eventType}, ${JSON.stringify(details)}::jsonb)`;
}

async function batchForMutation(batchId: string, expectedVersion: number) {
  const rows = await getSql()`SELECT * FROM import_batches WHERE id = ${batchId}`;
  if (!rows[0]) throw new Error("Import batch was not found.");
  if (Number(rows[0].version) !== expectedVersion) {
    throw new Error("STALE_IMPORT_VERSION");
  }
  return rows[0] as Record<string, unknown>;
}

export async function findImportByHash(packHash: string) {
  await ensureImportSchema();
  const rows = await getSql()`SELECT id FROM import_batches WHERE pack_hash = ${packHash}`;
  return rows[0] ? String(rows[0].id) : null;
}

export async function stageImport(pack: ParsedContentPack, uploadedAssets: UploadedImportAsset[]) {
  await ensureImportSchema();
  await ensureTikTokSchema();
  const existing = await findImportByHash(pack.packHash);
  if (existing) return { id: existing, existing: true };

  const batchId = randomUUID();
  const entryIds = new Map<string, string>();
  const assetIds = new Map<string, string>();
  const assetByName = new Map<string, UploadedImportAsset>();
  for (const asset of uploadedAssets) {
    assetByName.set(asset.filename.toLowerCase(), asset);
    assetByName.set(asset.filename.split("/").pop()!.toLowerCase(), asset);
  }
  const errorsByRef = new Set(pack.checks.filter((check) => check.severity === "error" && check.entryRef).map((check) => check.entryRef));
  const warningRefs = new Set(pack.checks.filter((check) => check.severity === "warning" && check.entryRef).map((check) => check.entryRef));
  const blockedCount = pack.entries.filter((entry) => errorsByRef.has(entry.reference)).length;
  const warningCount = pack.entries.filter((entry) => warningRefs.has(entry.reference) && !errorsByRef.has(entry.reference)).length;
  const readyCount = pack.entries.length - blockedCount - warningCount;
  const sql = getSql();
  const queries = [
    sql`INSERT INTO import_batches (
      id, pack_hash, name, brand, timezone, schema_version, source_week,
      default_overdue_policy, status, version, ready_count, warning_count,
      blocked_count, total_entries
    ) VALUES (
      ${batchId}, ${pack.packHash}, ${pack.name}, ${pack.brand}, ${pack.timezone},
      ${pack.schemaVersion}, ${pack.sourceWeek}, ${pack.defaultOverduePolicy},
      'needs_review', 1, ${readyCount}, ${warningCount}, ${blockedCount}, ${pack.entries.length}
    )`,
  ];

  for (const asset of uploadedAssets) {
    const id = randomUUID();
    assetIds.set(asset.filename.toLowerCase(), id);
    assetIds.set(asset.filename.split("/").pop()!.toLowerCase(), id);
    queries.push(sql`INSERT INTO import_assets (
      id, batch_id, filename, sha256, content_type, size_bytes, image_url, image_pathname
    ) VALUES (
      ${id}, ${batchId}, ${asset.filename}, ${asset.sha256}, ${asset.contentType},
      ${asset.sizeBytes}, ${asset.imageUrl}, ${asset.imagePathname}
    )`);
  }

  for (let position = 0; position < pack.entries.length; position += 1) {
    const entry = pack.entries[position];
    const id = randomUUID();
    entryIds.set(entry.reference, id);
    const status = errorsByRef.has(entry.reference) ? "blocked" : "staged";
    queries.push(sql`INSERT INTO import_entries (
      id, batch_id, source_ref, position, title, caption, post_format, platforms,
      scheduled_at, qa_status, hold_reason, content_hash, status
    ) VALUES (
      ${id}, ${batchId}, ${entry.reference}, ${position}, ${entry.title}, ${entry.caption},
      ${entry.format}, ${JSON.stringify(entry.platforms)}::jsonb,
      ${entry.scheduledAt?.toISOString() ?? null}, ${entry.qaStatus}, ${entry.holdReason},
      ${entry.contentHash}, ${status}
    )`);
    entry.media.forEach((filename, mediaPosition) => {
      const key = filename.toLowerCase();
      const assetId = assetIds.get(key) ?? assetIds.get(filename.split("/").pop()!.toLowerCase());
      if (!assetId || !assetByName.get(key) && !assetByName.get(filename.split("/").pop()!.toLowerCase())) {
        throw new Error(`Uploaded asset mapping is missing ${filename}.`);
      }
      queries.push(sql`INSERT INTO import_entry_media (entry_id, asset_id, position)
        VALUES (${id}, ${assetId}, ${mediaPosition})`);
    });
  }

  for (const check of pack.checks) {
    queries.push(sql`INSERT INTO import_checks (
      id, batch_id, entry_id, code, severity, message
    ) VALUES (
      ${randomUUID()}, ${batchId}, ${check.entryRef ? entryIds.get(check.entryRef) ?? null : null},
      ${check.code}, ${check.severity}, ${check.message}
    )`);
  }
  queries.push(sql`INSERT INTO import_events (id, batch_id, event_type, details)
    VALUES (${randomUUID()}, ${batchId}, 'staged', ${JSON.stringify({ entries: pack.entries.length, assets: uploadedAssets.length, blocked: blockedCount })}::jsonb)`);
  await sql.transaction(queries);
  return { id: batchId, existing: false };
}

export async function listImports(limit = 50) {
  await ensureImportSchema();
  const safeLimit = Math.max(1, Math.min(100, limit));
  const rows = await getSql().query(
    "SELECT * FROM import_batches ORDER BY updated_at DESC LIMIT $1",
    [safeLimit],
  );
  return (rows as Record<string, unknown>[]).map(summaryFromRow);
}

export async function getImport(batchId: string): Promise<ImportDetail | null> {
  await ensureImportSchema();
  const sql = getSql();
  const batchRows = await sql`SELECT * FROM import_batches WHERE id = ${batchId}`;
  if (!batchRows[0]) return null;
  const [entryRows, assetRows, mediaRows, checkRows, eventRows] = await Promise.all([
    sql`SELECT * FROM import_entries WHERE batch_id = ${batchId} ORDER BY position`,
    sql`SELECT * FROM import_assets WHERE batch_id = ${batchId}`,
    sql`SELECT iem.entry_id, iem.position, ia.* FROM import_entry_media iem
      JOIN import_assets ia ON ia.id = iem.asset_id
      WHERE ia.batch_id = ${batchId} ORDER BY iem.entry_id, iem.position`,
    sql`SELECT * FROM import_checks WHERE batch_id = ${batchId} ORDER BY created_at`,
    sql`SELECT * FROM import_events WHERE batch_id = ${batchId} ORDER BY created_at DESC LIMIT 100`,
  ]);
  const assets = new Map(assetRows.map((row) => [String(row.id), row]));
  void assets;
  const mediaByEntry = new Map<string, ImportDetail["entries"][number]["media"]>();
  for (const row of mediaRows) {
    const entryId = String(row.entry_id);
    const values = mediaByEntry.get(entryId) ?? [];
    values.push({
      id: String(row.id),
      position: Number(row.position),
      filename: String(row.filename),
      imageUrl: String(row.image_url),
      imagePathname: String(row.image_pathname),
      contentType: String(row.content_type),
      sha256: String(row.sha256),
    });
    mediaByEntry.set(entryId, values);
  }
  const checks = checkRows.map((row) => ({
    id: String(row.id),
    entryId: row.entry_id ? String(row.entry_id) : null,
    code: String(row.code),
    severity: row.severity as "info" | "warning" | "error",
    message: String(row.message),
    resolved: Boolean(row.resolved),
  }));
  const checksByEntry = new Map<string, ImportDetail["entries"][number]["checks"]>();
  for (const check of checks) {
    if (!check.entryId) continue;
    checksByEntry.set(check.entryId, [...(checksByEntry.get(check.entryId) ?? []), {
      id: check.id,
      code: check.code,
      severity: check.severity,
      message: check.message,
      resolved: check.resolved,
    }]);
  }
  return {
    ...summaryFromRow(batchRows[0] as Record<string, unknown>),
    packHash: String(batchRows[0].pack_hash),
    entries: entryRows.map((row) => ({
      id: String(row.id),
      sourceRef: String(row.source_ref),
      position: Number(row.position),
      title: String(row.title),
      caption: String(row.caption),
      format: row.post_format === "carousel" ? "carousel" : "single",
      platforms: (Array.isArray(row.platforms) ? row.platforms : []) as PublishPlatform[],
      scheduledAt: row.scheduled_at ? new Date(String(row.scheduled_at)).toISOString() : null,
      qaStatus: row.qa_status as QaStatus,
      holdReason: row.hold_reason ? String(row.hold_reason) : null,
      status: String(row.status),
      postId: row.post_id ? String(row.post_id) : null,
      media: mediaByEntry.get(String(row.id)) ?? [],
      checks: checksByEntry.get(String(row.id)) ?? [],
    })),
    checks,
    events: eventRows.map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      details: row.details,
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
  };
}

export async function updateImportEntry(input: {
  batchId: string;
  entryId: string;
  expectedVersion: number;
  title?: string;
  caption?: string;
  scheduledAt?: string | null;
  platforms?: PublishPlatform[];
  qaStatus?: QaStatus;
  holdReason?: string | null;
}) {
  await ensureImportSchema();
  await batchForMutation(input.batchId, input.expectedVersion);
  const current = await getSql()`SELECT * FROM import_entries WHERE id = ${input.entryId} AND batch_id = ${input.batchId}`;
  if (!current[0]) throw new Error("Import entry was not found.");
  if (!["staged", "blocked", "approved"].includes(String(current[0].status))) {
    throw new Error("Committed import entries cannot be edited here.");
  }
  const title = input.title === undefined ? String(current[0].title) : input.title.trim();
  const caption = input.caption === undefined ? String(current[0].caption) : input.caption.trim();
  if (!title || title.length > 120) throw new Error("Title must be between 1 and 120 characters.");
  if (caption.length > 2200) throw new Error("Caption cannot exceed 2,200 characters.");
  const scheduledAt = input.scheduledAt === undefined
    ? current[0].scheduled_at ? new Date(String(current[0].scheduled_at)).toISOString() : null
    : input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;
  const platforms = input.platforms ?? (current[0].platforms as PublishPlatform[]);
  if (!platforms.length) throw new Error("Choose at least one platform.");
  const qaStatus = input.qaStatus ?? (current[0].qa_status as QaStatus);
  const holdReason = input.holdReason === undefined
    ? current[0].hold_reason ? String(current[0].hold_reason) : null
    : input.holdReason?.trim() || null;
  await getSql().transaction([
    getSql()`UPDATE import_entries SET title = ${title}, caption = ${caption},
      scheduled_at = ${scheduledAt}, platforms = ${JSON.stringify(platforms)}::jsonb,
      qa_status = ${qaStatus}, hold_reason = ${holdReason}, status = 'staged',
      approved_at = NULL, updated_at = now()
      WHERE id = ${input.entryId} AND batch_id = ${input.batchId}`,
    getSql()`UPDATE import_batches SET status = 'needs_review', version = version + 1,
      updated_at = now() WHERE id = ${input.batchId}`,
    getSql()`INSERT INTO import_events (id, batch_id, event_type, details)
      VALUES (${randomUUID()}, ${input.batchId}, 'entry_updated', ${JSON.stringify({ entryId: input.entryId })}::jsonb)`,
  ]);
  return getImport(input.batchId);
}

export async function approveImport(input: {
  batchId: string;
  expectedVersion: number;
  entryIds?: string[];
  confirmQa?: boolean;
}) {
  await ensureImportSchema();
  await batchForMutation(input.batchId, input.expectedVersion);
  const sql = getSql();
  const entries = input.entryIds?.length
    ? await sql.query("SELECT * FROM import_entries WHERE batch_id = $1 AND id = ANY($2::uuid[]) ORDER BY position", [input.batchId, input.entryIds])
    : await sql`SELECT * FROM import_entries WHERE batch_id = ${input.batchId} ORDER BY position`;
  if (!entries.length) throw new Error("No import entries were selected.");
  const approved: string[] = [];
  const blocked: Array<{ id: string; reason: string }> = [];
  const queries = [];
  for (const row of entries) {
    const entryId = String(row.id);
    const hardChecks = await sql`SELECT message FROM import_checks
      WHERE entry_id = ${entryId} AND severity = 'error' AND resolved = false`;
    if (hardChecks.length || String(row.qa_status) === "hold") {
      blocked.push({ id: entryId, reason: hardChecks.map((check) => String(check.message)).join(" ") || String(row.hold_reason ?? "QA hold") });
      continue;
    }
    if (String(row.qa_status) === "ready_after_qa" && !input.confirmQa) {
      blocked.push({ id: entryId, reason: "Confirm artwork QA before approval." });
      continue;
    }
    approved.push(entryId);
    queries.push(sql`UPDATE import_entries SET status = 'approved', qa_status = 'ready',
      hold_reason = NULL, approved_at = now(), updated_at = now() WHERE id = ${entryId}`);
    if (input.confirmQa) {
      queries.push(sql`UPDATE import_checks SET resolved = true, resolved_at = now()
        WHERE entry_id = ${entryId} AND code = 'qa_confirmation_required'`);
    }
  }
  if (queries.length) await sql.transaction(queries);
  const remaining = await sql`SELECT count(*)::int AS count FROM import_entries
    WHERE batch_id = ${input.batchId} AND status NOT IN ('approved', 'committed', 'scheduled', 'cancelled')`;
  await sql`UPDATE import_batches SET status = ${Number(remaining[0]?.count ?? 0) ? "needs_review" : "approved"},
    version = version + 1, updated_at = now() WHERE id = ${input.batchId}`;
  await addEvent(input.batchId, "approved", { approved, blocked });
  return { approved, blocked, batch: await getImport(input.batchId) };
}

export async function commitImportDrafts(input: {
  batchId: string;
  expectedVersion: number;
  entryIds?: string[];
}) {
  await ensureImportSchema();
  await ensureTikTokSchema();
  const batch = await batchForMutation(input.batchId, input.expectedVersion);
  const sql = getSql();
  const entries = input.entryIds?.length
    ? await sql.query("SELECT * FROM import_entries WHERE batch_id = $1 AND id = ANY($2::uuid[]) ORDER BY position", [input.batchId, input.entryIds])
    : await sql`SELECT * FROM import_entries WHERE batch_id = ${input.batchId} ORDER BY position`;
  const queries = [];
  const created: Array<{ entryId: string; postId: string }> = [];
  for (const entry of entries) {
    if (entry.post_id) continue;
    if (String(entry.status) !== "approved") continue;
    const media = await sql`SELECT ia.image_url, ia.image_pathname, iem.position
      FROM import_entry_media iem JOIN import_assets ia ON ia.id = iem.asset_id
      WHERE iem.entry_id = ${String(entry.id)} ORDER BY iem.position`;
    if (!media.length) throw new Error(`Import entry ${String(entry.source_ref)} has no media.`);
    const postId = randomUUID();
    const sourceRef = `import:${input.batchId}:${String(entry.source_ref)}`;
    created.push({ entryId: String(entry.id), postId });
    queries.push(sql`INSERT INTO posts (
      id, title, caption, brand, image_url, image_pathname, post_format, status,
      scheduled_at, schedule_version, qa_status, source_week, source_ref, approved_at
    ) VALUES (
      ${postId}, ${String(entry.title)}, ${String(entry.caption)}, ${String(batch.brand)},
      ${String(media[0].image_url)}, ${String(media[0].image_pathname)}, ${String(entry.post_format)},
      'draft', ${entry.scheduled_at ? new Date(String(entry.scheduled_at)).toISOString() : null},
      0, 'ready', ${batch.source_week ? String(batch.source_week) : null}, ${sourceRef}, now()
    )`);
    for (const item of media) {
      queries.push(sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
        VALUES (${postId}, ${Number(item.position)}, ${String(item.image_url)}, ${String(item.image_pathname)})`);
    }
    const platforms = (Array.isArray(entry.platforms) ? entry.platforms : []) as PublishPlatform[];
    for (const platform of platforms) {
      queries.push(sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
        VALUES (${postId}, ${platform}, 'draft', ${`${postId}:${platform}`})`);
    }
    queries.push(sql`UPDATE import_entries SET status = 'committed', post_id = ${postId},
      committed_at = now(), updated_at = now() WHERE id = ${String(entry.id)}`);
  }
  if (!created.length) throw new Error("No approved entries are waiting to become drafts.");
  queries.push(sql`UPDATE import_batches SET status = 'committed', version = version + 1,
    updated_at = now() WHERE id = ${input.batchId}`);
  queries.push(sql`INSERT INTO import_events (id, batch_id, event_type, details)
    VALUES (${randomUUID()}, ${input.batchId}, 'drafts_committed', ${JSON.stringify({ created })}::jsonb)`);
  await sql.transaction(queries);
  return { created, batch: await getImport(input.batchId) };
}

export async function scheduleImportEntries(input: {
  batchId: string;
  expectedVersion: number;
  publisherCredentialId: string;
  publisherExpiresAt: Date;
  policy: OverduePolicy;
  staggerMinutes?: number;
  entryIds?: string[];
}) {
  await ensureImportSchema();
  await batchForMutation(input.batchId, input.expectedVersion);
  const sql = getSql();
  const entries = input.entryIds?.length
    ? await sql.query("SELECT * FROM import_entries WHERE batch_id = $1 AND id = ANY($2::uuid[]) AND post_id IS NOT NULL ORDER BY position", [input.batchId, input.entryIds])
    : await sql`SELECT * FROM import_entries WHERE batch_id = ${input.batchId} AND post_id IS NOT NULL ORDER BY position`;
  const candidates = entries.filter((row) => ["committed", "scheduled"].includes(String(row.status)));
  if (!candidates.length) throw new Error("No committed drafts are available to schedule.");
  const proposed = applyOverduePolicy(
    candidates.map((row) => row.scheduled_at ? new Date(String(row.scheduled_at)) : null),
    input.policy,
    new Date(),
    input.staggerMinutes,
  );
  const queries = [];
  const scheduled: Array<{ entryId: string; postId: string; version: number; scheduledAt: string }> = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    const scheduledAt = proposed[index];
    if (!scheduledAt) continue;
    if (scheduledAt >= input.publisherExpiresAt) {
      throw new Error("A proposed time is beyond the current publisher session. Sign in closer to that date.");
    }
    const postId = String(row.post_id);
    const postRows = await sql`SELECT schedule_version FROM posts WHERE id = ${postId} AND status IN ('draft', 'scheduled')`;
    if (!postRows[0]) continue;
    const version = Number(postRows[0].schedule_version) + 1;
    scheduled.push({ entryId: String(row.id), postId, version, scheduledAt: scheduledAt.toISOString() });
    queries.push(sql`UPDATE posts SET status = 'scheduled', scheduled_at = ${scheduledAt.toISOString()},
      schedule_version = ${version}, publisher_credential_id = ${input.publisherCredentialId},
      workflow_run_id = NULL, claimed_at = NULL, last_error = NULL, updated_at = now()
      WHERE id = ${postId}`);
    queries.push(sql`UPDATE post_targets SET status = 'scheduled', last_error = NULL
      WHERE post_id = ${postId} AND status <> 'published'`);
    queries.push(sql`UPDATE import_entries SET status = 'scheduled', scheduled_at = ${scheduledAt.toISOString()},
      updated_at = now() WHERE id = ${String(row.id)}`);
  }
  if (!scheduled.length) throw new Error("The selected overdue policy left every post as a draft.");
  queries.push(sql`UPDATE import_batches SET status = 'scheduled', version = version + 1,
    updated_at = now() WHERE id = ${input.batchId}`);
  queries.push(sql`INSERT INTO import_events (id, batch_id, event_type, details)
    VALUES (${randomUUID()}, ${input.batchId}, 'scheduled', ${JSON.stringify({ policy: input.policy, scheduled })}::jsonb)`);
  await sql.transaction(queries);
  return { scheduled, batch: await getImport(input.batchId) };
}

export async function cancelImport(input: { batchId: string; expectedVersion: number }) {
  await ensureImportSchema();
  await batchForMutation(input.batchId, input.expectedVersion);
  const sql = getSql();
  const entries = await sql`SELECT id, post_id FROM import_entries WHERE batch_id = ${input.batchId}`;
  const postIds = entries.filter((row) => row.post_id).map((row) => String(row.post_id));
  const queries = [
    sql`UPDATE import_entries SET status = 'cancelled', updated_at = now()
      WHERE batch_id = ${input.batchId} AND status NOT IN ('cancelled')`,
    sql`UPDATE import_batches SET status = 'cancelled', version = version + 1,
      updated_at = now() WHERE id = ${input.batchId}`,
    sql`INSERT INTO import_events (id, batch_id, event_type, details)
      VALUES (${randomUUID()}, ${input.batchId}, 'cancelled', ${JSON.stringify({ postIds })}::jsonb)`,
  ];
  if (postIds.length) {
    queries.push(sql.query("UPDATE posts SET status = 'cancelled', schedule_version = schedule_version + 1, workflow_run_id = NULL, claimed_at = NULL, updated_at = now() WHERE id = ANY($1::uuid[]) AND status IN ('draft', 'scheduled')", [postIds]));
    queries.push(sql.query("UPDATE post_targets SET status = 'cancelled', last_error = NULL WHERE post_id = ANY($1::uuid[]) AND status NOT IN ('published', 'cancelled')", [postIds]));
  }
  await sql.transaction(queries);
  return getImport(input.batchId);
}
