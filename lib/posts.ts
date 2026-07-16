import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { ensureTikTokSchema } from "@/lib/schema";
import type { Platform, PublishPlatform, ScheduledPost } from "@/lib/types";
import { validatePostInput } from "@/lib/validation";
import type { Week1ImportPost } from "@/lib/week1-import";

type DbRow = Record<string, unknown>;

function mapPosts(postRows: DbRow[], targetRows: DbRow[], mediaRows: DbRow[]) {
  const targets = new Map<string, ScheduledPost["targets"]>();
  for (const row of targetRows) {
    const postId = String(row.post_id);
    const values = targets.get(postId) ?? [];
    values.push({
      platform: row.platform as Platform,
      status: row.status as ScheduledPost["targets"][number]["status"],
      providerPostId: row.provider_post_id
        ? String(row.provider_post_id)
        : null,
      providerPublishId: row.provider_publish_id
        ? String(row.provider_publish_id)
        : null,
      lastError: row.last_error ? String(row.last_error) : null,
      attempts: Number(row.attempts ?? 0),
      idempotencyKey: String(
        row.idempotency_key ?? `${postId}:${row.platform}`,
      ),
      publishedAt: row.published_at
        ? new Date(String(row.published_at)).toISOString()
        : null,
    });
    targets.set(postId, values);
  }

  const media = new Map<string, ScheduledPost["media"]>();
  for (const row of mediaRows) {
    const postId = String(row.post_id);
    const values = media.get(postId) ?? [];
    values.push({
      imageUrl: String(row.image_url),
      imagePathname: String(row.image_pathname),
      position: Number(row.position),
    });
    media.set(postId, values);
  }

  return postRows.map((row) => {
    const postMedia = media.get(String(row.id)) ?? [
      {
        imageUrl: String(row.image_url),
        imagePathname: String(row.image_pathname),
        position: 0,
      },
    ];
    return {
      id: String(row.id),
      title: String(row.title),
      caption: String(row.caption),
      brand: row.brand as ScheduledPost["brand"],
      format: row.post_format === "carousel" ? "carousel" : ("single" as const),
      imageUrl: postMedia[0].imageUrl,
      imagePathname: postMedia[0].imagePathname,
      media: postMedia,
      status: row.status as ScheduledPost["status"],
      scheduledAt: row.scheduled_at
        ? new Date(String(row.scheduled_at)).toISOString()
        : null,
      scheduleVersion: Number(row.schedule_version),
      workflowRunId: row.workflow_run_id ? String(row.workflow_run_id) : null,
      lastError: row.last_error ? String(row.last_error) : null,
      qaStatus: (row.qa_status ?? "ready") as ScheduledPost["qaStatus"],
      holdReason: row.hold_reason ? String(row.hold_reason) : null,
      sourceWeek: row.source_week ? String(row.source_week) : null,
      sourceRef: row.source_ref ? String(row.source_ref) : null,
      approvedAt: row.approved_at
        ? new Date(String(row.approved_at)).toISOString()
        : null,
      publishedAt: row.published_at
        ? new Date(String(row.published_at)).toISOString()
        : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      targets: targets.get(String(row.id)) ?? [],
    };
  }) satisfies ScheduledPost[];
}

export async function listPosts(start?: Date, end?: Date) {
  await ensureTikTokSchema();
  const sql = getSql();
  const postRows =
    start && end
      ? await sql`SELECT * FROM posts
        WHERE (scheduled_at >= ${start.toISOString()} AND scheduled_at < ${end.toISOString()})
           OR (status = 'draft' AND created_at >= ${start.toISOString()} AND created_at < ${end.toISOString()})
        ORDER BY COALESCE(scheduled_at, created_at), created_at`
      : await sql`SELECT * FROM posts ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 250`;
  if (!postRows.length) return [];
  const ids = postRows.map((row) => String(row.id));
  const targetRows = await sql.query(
    "SELECT * FROM post_targets WHERE post_id = ANY($1::uuid[]) ORDER BY platform",
    [ids],
  );
  const mediaRows = await sql.query(
    "SELECT * FROM post_media WHERE post_id = ANY($1::uuid[]) ORDER BY post_id, position",
    [ids],
  );
  return mapPosts(
    postRows as DbRow[],
    targetRows as DbRow[],
    mediaRows as DbRow[],
  );
}

export async function getPost(postId: string) {
  await ensureTikTokSchema();
  const sql = getSql();
  const postRows = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  if (!postRows.length) return null;
  const targetRows = await sql`SELECT * FROM post_targets
    WHERE post_id = ${postId} ORDER BY platform`;
  const mediaRows = await sql`SELECT * FROM post_media
    WHERE post_id = ${postId} ORDER BY position`;
  return mapPosts(
    postRows as DbRow[],
    targetRows as DbRow[],
    mediaRows as DbRow[],
  )[0];
}

export async function createPost(
  rawInput: unknown,
  publisherCredentialId: string | null,
) {
  await ensureTikTokSchema();
  const input = validatePostInput(rawInput);
  const id = randomUUID();
  const status = input.scheduledAt ? "scheduled" : "draft";
  const qaStatus = input.qaStatus ?? "ready";
  const version = input.scheduledAt ? 1 : 0;
  const sql = getSql();
  const queries = [
    sql`INSERT INTO posts (
      id, title, caption, brand, image_url, image_pathname, status, scheduled_at,
      schedule_version, publisher_credential_id, post_format, qa_status, hold_reason, source_week
    ) VALUES (
      ${id}, ${input.title}, ${input.caption}, ${input.brand}, ${input.imageUrl},
      ${input.imagePathname}, ${status}, ${input.scheduledAt?.toISOString() ?? null},
      ${version}, ${publisherCredentialId}, ${input.format}, ${qaStatus}, ${input.holdReason}, ${input.sourceWeek}
    )`,
    ...input.media.map(
      (
        media,
      ) => sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
      VALUES (${id}, ${media.position}, ${media.imageUrl}, ${media.imagePathname})`,
    ),
    ...input.platforms.map(
      (
        platform,
      ) => sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
      VALUES (${id}, ${platform}, ${status}, ${`${id}:${platform}`})`,
    ),
  ];
  await sql.transaction(queries);
  return { id, status, version };
}

export async function saveWorkflowRun(
  postId: string,
  version: number,
  runId: string,
) {
  await getSql()`UPDATE posts SET workflow_run_id = ${runId}, updated_at = now()
    WHERE id = ${postId} AND schedule_version = ${version}`;
}

async function rotateTerminalTikTokKey(postId: string) {
  const sql = getSql();
  await sql`UPDATE post_targets SET idempotency_key = ${`${postId}:tiktok:${randomUUID()}`}
    WHERE post_id = ${postId} AND platform = 'tiktok' AND status = 'failed'
      AND provider_publish_id IS NULL`;
}

export async function prepareRetry(
  postId: string,
  publisherCredentialId: string,
) {
  await ensureTikTokSchema();
  const sql = getSql();
  await rotateTerminalTikTokKey(postId);
  const rows = await sql`UPDATE posts SET
      status = 'scheduled', scheduled_at = now(), schedule_version = schedule_version + 1,
      publisher_credential_id = ${publisherCredentialId}, workflow_run_id = NULL,
      last_error = NULL, updated_at = now()
    WHERE id = ${postId} AND status IN ('failed', 'partially_published')
    RETURNING schedule_version`;
  if (!rows[0]) throw new Error("Only failed posts can be retried.");
  await sql`UPDATE post_targets SET status = 'scheduled', last_error = NULL
    WHERE post_id = ${postId} AND status = 'failed'`;
  return Number(rows[0].schedule_version);
}

export async function updatePost(
  postId: string,
  rawInput: unknown,
  publisherCredentialId: string | null,
) {
  await ensureTikTokSchema();
  const input = validatePostInput(rawInput);
  const sql = getSql();
  const current =
    await sql`SELECT status, schedule_version, qa_status, hold_reason, source_week FROM posts WHERE id = ${postId}`;
  if (!current[0]) throw new Error("Post was not found.");
  if (!["draft", "scheduled"].includes(String(current[0].status))) {
    throw new Error("Only draft or scheduled posts can be edited.");
  }

  const status = input.scheduledAt ? "scheduled" : "draft";
  const qaStatus = input.qaStatus ?? current[0].qa_status;
  const version = Number(current[0].schedule_version) + 1;
  await sql.transaction([
    sql`UPDATE posts SET title = ${input.title}, caption = ${input.caption}, brand = ${input.brand},
        image_url = ${input.imageUrl}, image_pathname = ${input.imagePathname}, status = ${status},
        scheduled_at = ${input.scheduledAt?.toISOString() ?? null}, schedule_version = ${version},
        workflow_run_id = NULL, publisher_credential_id = ${publisherCredentialId}, last_error = NULL,
        post_format = ${input.format}, qa_status = ${qaStatus},
        hold_reason = ${input.holdReason ?? current[0].hold_reason},
        source_week = ${input.sourceWeek ?? current[0].source_week}, updated_at = now()
      WHERE id = ${postId}`,
    sql`DELETE FROM post_targets WHERE post_id = ${postId}`,
    sql`DELETE FROM post_media WHERE post_id = ${postId}`,
    ...input.media.map(
      (
        media,
      ) => sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
      VALUES (${postId}, ${media.position}, ${media.imageUrl}, ${media.imagePathname})`,
    ),
    ...input.platforms.map(
      (
        platform,
      ) => sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
      VALUES (${postId}, ${platform}, ${status}, ${`${postId}:${platform}`})`,
    ),
  ]);
  return { id: postId, status, version };
}

export async function markQueueFailure(postId: string, message: string) {
  await ensureTikTokSchema();
  const sql = getSql();
  const published = await sql`SELECT 1 FROM post_targets
    WHERE post_id = ${postId} AND status = 'published' LIMIT 1`;
  const status = published.length ? "partially_published" : "failed";
  await sql.transaction([
    sql`UPDATE posts SET status = ${status}, claimed_at = NULL, last_error = ${message}, updated_at = now() WHERE id = ${postId}`,
    sql`UPDATE post_targets SET status = 'failed', last_error = ${message}
      WHERE post_id = ${postId} AND status <> 'published'`,
  ]);
}

export async function deleteDraft(postId: string) {
  const sql = getSql();
  const rows = await sql`SELECT image_pathname FROM posts
    WHERE id = ${postId} AND status = 'draft'`;
  if (!rows[0]) return null;
  const mediaRows = await sql`SELECT image_pathname FROM post_media
    WHERE post_id = ${postId} ORDER BY position`;
  await sql`DELETE FROM posts WHERE id = ${postId} AND status = 'draft'`;
  return [
    ...new Set(
      (mediaRows.length ? mediaRows : rows).map((row) =>
        String(row.image_pathname),
      ),
    ),
  ];
}

export async function approvePost(postId: string) {
  const rows =
    await getSql()`UPDATE posts SET qa_status = 'ready', approved_at = now(),
      hold_reason = NULL, updated_at = now()
    WHERE id = ${postId} AND status = 'draft' AND qa_status = 'ready_after_qa'
    RETURNING id`;
  if (!rows[0])
    throw new Error("Only a corrected READY AFTER QA draft can be approved.");
}

export async function preparePublishNow(
  postId: string,
  publisherCredentialId: string,
) {
  await ensureTikTokSchema();
  const sql = getSql();
  await rotateTerminalTikTokKey(postId);
  const rows =
    await sql`UPDATE posts SET status = 'scheduled', scheduled_at = now(),
      schedule_version = schedule_version + 1, publisher_credential_id = ${publisherCredentialId},
      workflow_run_id = NULL, last_error = NULL, claimed_at = NULL, updated_at = now()
    WHERE id = ${postId} AND status IN ('draft', 'scheduled', 'failed', 'partially_published')
    RETURNING schedule_version`;
  if (!rows[0]) throw new Error("This post cannot be published now.");
  await sql`UPDATE post_targets SET status = 'scheduled', last_error = NULL
    WHERE post_id = ${postId} AND status <> 'published'`;
  return Number(rows[0].schedule_version);
}

export async function listRecoverablePosts() {
  await ensureTikTokSchema();
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE post_targets SET status = 'scheduled', last_error = 'Recovered after a stale publishing lock.'
      WHERE post_id IN (
        SELECT id FROM posts WHERE status = 'publishing' AND claimed_at < now() - interval '20 minutes'
      ) AND status = 'publishing'`,
    sql`UPDATE posts SET status = 'scheduled', schedule_version = schedule_version + 1,
        claimed_at = NULL, workflow_run_id = NULL, updated_at = now()
      WHERE status = 'publishing' AND claimed_at < now() - interval '20 minutes'`,
    sql`UPDATE posts SET status = 'scheduled', schedule_version = schedule_version + 1,
        publisher_credential_id = (
          SELECT id FROM publisher_credentials
          WHERE expires_at > now()
          ORDER BY expires_at DESC
          LIMIT 1
        ),
        workflow_run_id = NULL, last_error = NULL, claimed_at = NULL, updated_at = now()
      WHERE status = 'draft' AND scheduled_at <= now() AND qa_status <> 'hold'
        AND EXISTS (
          SELECT 1 FROM publisher_credentials
          WHERE expires_at > now()
        )`,
    sql`UPDATE post_targets SET status = 'scheduled', last_error = NULL
      WHERE post_id IN (
        SELECT id FROM posts
        WHERE status = 'scheduled' AND scheduled_at <= now() AND qa_status <> 'hold'
      ) AND status = 'draft'`,
  ]);
  const rows = await sql`SELECT id, schedule_version FROM posts
    WHERE status = 'scheduled' AND scheduled_at <= now()
    ORDER BY scheduled_at LIMIT 50`;
  return rows.map((row) => ({
    postId: String(row.id),
    version: Number(row.schedule_version),
  }));
}

export async function assertImportIsNew(sourceRefs: string[]) {
  const rows = await getSql().query(
    "SELECT source_ref FROM posts WHERE source_ref = ANY($1::text[])",
    [sourceRefs],
  );
  if (rows.length)
    throw new Error("This Week 1 day pack has already been imported.");
}

export async function createImportedPosts(
  posts: Array<
    Omit<Week1ImportPost, "media"> & {
      media: Array<{ imageUrl: string; imagePathname: string }>;
    }
  >,
) {
  await ensureTikTokSchema();
  const sql = getSql();
  const queries = [];
  const ids: string[] = [];
  for (const post of posts) {
    const id = randomUUID();
    ids.push(id);
    queries.push(sql`INSERT INTO posts (
      id, title, caption, brand, image_url, image_pathname, post_format, status,
      scheduled_at, schedule_version, qa_status, hold_reason, source_week, source_ref,
      approved_at
    ) VALUES (
      ${id}, ${post.title}, ${post.caption}, 'chezahub', ${post.media[0].imageUrl},
      ${post.media[0].imagePathname}, ${post.format}, 'draft', ${post.scheduledAt.toISOString()},
      0, ${post.qaStatus}, ${post.holdReason}, ${post.sourceWeek}, ${post.sourceRef},
      ${post.qaStatus === "ready" ? new Date().toISOString() : null}
    )`);
    post.media.forEach((media, position) => {
      queries.push(sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
        VALUES (${id}, ${position}, ${media.imageUrl}, ${media.imagePathname})`);
    });
    for (const platform of ["facebook", "instagram"] as const) {
      queries.push(sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
        VALUES (${id}, ${platform}, 'draft', ${`${id}:${platform}`})`);
    }
  }
  await sql.transaction(queries);
  return ids;
}

export async function cancelPost(postId: string) {
  const sql = getSql();
  const rows = await sql`UPDATE posts SET status = 'cancelled',
      schedule_version = schedule_version + 1, workflow_run_id = NULL,
      claimed_at = NULL, updated_at = now()
    WHERE id = ${postId} AND status IN ('draft', 'scheduled')
    RETURNING id`;
  if (!rows[0])
    throw new Error("Only draft or scheduled posts can be cancelled.");
  await sql`UPDATE post_targets SET status = 'cancelled', last_error = NULL
    WHERE post_id = ${postId} AND status <> 'published'`;
}

export async function duplicatePost(postId: string) {
  await ensureTikTokSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  if (!rows[0]) throw new Error("Post was not found.");
  const media = await sql`SELECT image_url, image_pathname FROM post_media
    WHERE post_id = ${postId} ORDER BY position`;
  const targets = await sql`SELECT platform FROM post_targets
    WHERE post_id = ${postId} ORDER BY platform`;
  const id = randomUUID();
  const title = `Copy of ${String(rows[0].title)}`.slice(0, 120);
  await sql.transaction([
    sql`INSERT INTO posts (
      id, title, caption, brand, image_url, image_pathname, post_format, status,
      scheduled_at, schedule_version, qa_status, hold_reason, source_week
    ) VALUES (
      ${id}, ${title}, ${String(rows[0].caption)}, ${String(rows[0].brand)},
      ${String(rows[0].image_url)}, ${String(rows[0].image_pathname)},
      ${String(rows[0].post_format)}, 'draft', NULL, 0,
      ${String(rows[0].qa_status ?? "ready")},
      ${rows[0].hold_reason ? String(rows[0].hold_reason) : null},
      ${rows[0].source_week ? String(rows[0].source_week) : null}
    )`,
    ...(media.length ? media : rows).map(
      (item, position) =>
        sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
          VALUES (${id}, ${position}, ${String(item.image_url)}, ${String(item.image_pathname)})`,
    ),
    ...targets.map((target) => {
      const platform = target.platform as PublishPlatform;
      return sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
        VALUES (${id}, ${platform}, 'draft', ${`${id}:${platform}`})`;
    }),
  ]);
  return id;
}
