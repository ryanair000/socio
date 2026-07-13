import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import type { Platform, ScheduledPost } from "@/lib/types";
import { validatePostInput } from "@/lib/validation";

type DbRow = Record<string, unknown>;

function mapPosts(postRows: DbRow[], targetRows: DbRow[]) {
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
      lastError: row.last_error ? String(row.last_error) : null,
      attempts: Number(row.attempts ?? 0),
    });
    targets.set(postId, values);
  }

  return postRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    caption: String(row.caption),
    brand: row.brand as ScheduledPost["brand"],
    imageUrl: String(row.image_url),
    imagePathname: String(row.image_pathname),
    status: row.status as ScheduledPost["status"],
    scheduledAt: row.scheduled_at
      ? new Date(String(row.scheduled_at)).toISOString()
      : null,
    scheduleVersion: Number(row.schedule_version),
    workflowRunId: row.workflow_run_id ? String(row.workflow_run_id) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    targets: targets.get(String(row.id)) ?? [],
  })) satisfies ScheduledPost[];
}

export async function listPosts(start?: Date, end?: Date) {
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
  return mapPosts(postRows as DbRow[], targetRows as DbRow[]);
}

export async function createPost(
  rawInput: unknown,
  publisherCredentialId: string | null,
) {
  const input = validatePostInput(rawInput);
  const id = randomUUID();
  const status = input.scheduledAt ? "scheduled" : "draft";
  const version = input.scheduledAt ? 1 : 0;
  const sql = getSql();
  const queries = [
    sql`INSERT INTO posts (
      id, title, caption, brand, image_url, image_pathname, status, scheduled_at,
      schedule_version, publisher_credential_id
    ) VALUES (
      ${id}, ${input.title}, ${input.caption}, ${input.brand}, ${input.imageUrl},
      ${input.imagePathname}, ${status}, ${input.scheduledAt?.toISOString() ?? null},
      ${version}, ${publisherCredentialId}
    )`,
    ...input.platforms.map(
      (platform) => sql`INSERT INTO post_targets (post_id, platform, status)
      VALUES (${id}, ${platform}, ${status})`,
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

export async function prepareRetry(
  postId: string,
  publisherCredentialId: string,
) {
  const sql = getSql();
  const rows = await sql`UPDATE posts SET
      status = 'scheduled', scheduled_at = now(), schedule_version = schedule_version + 1,
      publisher_credential_id = ${publisherCredentialId}, workflow_run_id = NULL,
      last_error = NULL, updated_at = now()
    WHERE id = ${postId} AND status = 'failed'
    RETURNING schedule_version`;
  if (!rows[0]) throw new Error("Only a failed post can be retried.");
  await sql`UPDATE post_targets SET status = 'scheduled', last_error = NULL
    WHERE post_id = ${postId} AND status = 'failed'`;
  return Number(rows[0].schedule_version);
}

export async function updatePost(
  postId: string,
  rawInput: unknown,
  publisherCredentialId: string | null,
) {
  const input = validatePostInput(rawInput);
  const sql = getSql();
  const current =
    await sql`SELECT status, schedule_version FROM posts WHERE id = ${postId}`;
  if (!current[0]) throw new Error("Post was not found.");
  if (!["draft", "scheduled"].includes(String(current[0].status))) {
    throw new Error("Only draft or scheduled posts can be edited.");
  }

  const status = input.scheduledAt ? "scheduled" : "draft";
  const version = Number(current[0].schedule_version) + 1;
  await sql.transaction([
    sql`UPDATE posts SET title = ${input.title}, caption = ${input.caption}, brand = ${input.brand},
        image_url = ${input.imageUrl}, image_pathname = ${input.imagePathname}, status = ${status},
        scheduled_at = ${input.scheduledAt?.toISOString() ?? null}, schedule_version = ${version},
        workflow_run_id = NULL, publisher_credential_id = ${publisherCredentialId}, last_error = NULL,
        updated_at = now()
      WHERE id = ${postId}`,
    sql`DELETE FROM post_targets WHERE post_id = ${postId}`,
    ...input.platforms.map(
      (platform) => sql`INSERT INTO post_targets (post_id, platform, status)
      VALUES (${postId}, ${platform}, ${status})`,
    ),
  ]);
  return { id: postId, status, version };
}

export async function markQueueFailure(postId: string, message: string) {
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE posts SET status = 'failed', last_error = ${message}, updated_at = now() WHERE id = ${postId}`,
    sql`UPDATE post_targets SET status = 'failed', last_error = ${message} WHERE post_id = ${postId}`,
  ]);
}

export async function deleteDraft(postId: string) {
  const rows =
    await getSql()`DELETE FROM posts WHERE id = ${postId} AND status = 'draft' RETURNING image_pathname`;
  return rows[0]?.image_pathname ? String(rows[0].image_pathname) : null;
}
