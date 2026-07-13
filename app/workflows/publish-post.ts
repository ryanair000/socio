import { randomUUID } from "node:crypto";
import { sleep } from "workflow";
import { getSql } from "@/lib/db";
import { publishWithSmmpro } from "@/lib/smmpro";
import type { Brand, Platform } from "@/lib/types";

type PublishPayload = {
  postId: string;
  version: number;
};

async function loadSchedule(postId: string, version: number) {
  "use step";
  const rows = await getSql()`SELECT scheduled_at FROM posts
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'`;
  return rows[0]?.scheduled_at
    ? new Date(String(rows[0].scheduled_at)).toISOString()
    : null;
}

async function claimPost(postId: string, version: number) {
  "use step";
  const sql = getSql();
  const rows =
    await sql`UPDATE posts SET status = 'publishing', updated_at = now(), last_error = NULL
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'
    RETURNING id, brand, caption, image_url, publisher_credential_id`;
  if (!rows[0]) return null;
  await sql`UPDATE post_targets SET status = 'publishing', last_error = NULL
    WHERE post_id = ${postId} AND status = 'scheduled'`;
  return {
    id: String(rows[0].id),
    brand: rows[0].brand as Brand,
    caption: String(rows[0].caption),
    imageUrl: String(rows[0].image_url),
    credentialId: rows[0].publisher_credential_id
      ? String(rows[0].publisher_credential_id)
      : null,
  };
}

async function loadCredential(credentialId: string | null) {
  "use step";
  if (!credentialId) return null;
  const rows =
    await getSql()`SELECT encrypted_token, expires_at FROM publisher_credentials
    WHERE id = ${credentialId} AND expires_at > now()`;
  return rows[0]
    ? {
        encryptedToken: String(rows[0].encrypted_token),
        expiresAt: new Date(String(rows[0].expires_at)).toISOString(),
      }
    : null;
}

async function publishTarget(input: {
  postId: string;
  platform: Platform;
  brand: Brand;
  caption: string;
  imageUrl: string;
  encryptedToken: string;
}) {
  "use step";
  const sql = getSql();
  const targetRows = await sql`UPDATE post_targets SET attempts = attempts + 1
    WHERE post_id = ${input.postId} AND platform = ${input.platform} AND status = 'publishing'
    RETURNING attempts`;
  if (!targetRows[0])
    return { platform: input.platform, skipped: true, success: true };

  const attemptNumber = Number(targetRows[0].attempts);
  const attemptId = randomUUID();
  await sql`INSERT INTO publish_attempts (id, post_id, platform, attempt_number, status)
    VALUES (${attemptId}, ${input.postId}, ${input.platform}, ${attemptNumber}, 'publishing')`;

  const result = await publishWithSmmpro(input);
  const finalStatus = result.success ? "published" : "failed";
  await sql.transaction([
    sql`UPDATE post_targets SET status = ${finalStatus}, provider_post_id = ${result.providerPostId},
        last_error = ${result.error}
      WHERE post_id = ${input.postId} AND platform = ${input.platform}`,
    sql`UPDATE publish_attempts SET status = ${finalStatus}, provider_post_id = ${result.providerPostId},
        error = ${result.error}, response = ${JSON.stringify(result.response)}::jsonb, finished_at = now()
      WHERE id = ${attemptId}`,
  ]);
  return {
    platform: input.platform,
    skipped: false,
    success: result.success,
    error: result.error,
  };
}

async function failPendingTargets(postId: string, message: string) {
  "use step";
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE post_targets SET status = 'failed', last_error = ${message}
      WHERE post_id = ${postId} AND status = 'publishing'`,
    sql`UPDATE posts SET status = 'failed', last_error = ${message}, updated_at = now() WHERE id = ${postId}`,
  ]);
}

async function finalizePost(postId: string) {
  "use step";
  const sql = getSql();
  const rows =
    await sql`SELECT status, last_error FROM post_targets WHERE post_id = ${postId}`;
  const failed = rows.filter((row) => row.status === "failed");
  const status = failed.length ? "failed" : "published";
  const error =
    failed
      .map((row) => String(row.last_error || "Publishing failed."))
      .join(" ") || null;
  await sql`UPDATE posts SET status = ${status}, last_error = ${error}, updated_at = now() WHERE id = ${postId}`;
  return status;
}

export async function publishScheduledPost({
  postId,
  version,
}: PublishPayload) {
  "use workflow";
  const scheduledAt = await loadSchedule(postId, version);
  if (!scheduledAt) return { status: "stale" as const };

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate.getTime() > Date.now()) await sleep(scheduledDate);

  const post = await claimPost(postId, version);
  if (!post) return { status: "stale" as const };
  const credential = await loadCredential(post.credentialId);
  if (!credential) {
    const message =
      "Publisher session expired. Sign in again, then retry this post.";
    await failPendingTargets(postId, message);
    return { status: "failed" as const, error: message };
  }

  const rows = await getSqlTargets(postId);
  for (const platform of rows) {
    await publishTarget({
      ...post,
      platform,
      encryptedToken: credential.encryptedToken,
      postId,
    });
  }
  return { status: await finalizePost(postId) };
}

async function getSqlTargets(postId: string) {
  "use step";
  const rows = await getSql()`SELECT platform FROM post_targets
    WHERE post_id = ${postId} AND status = 'publishing' ORDER BY platform`;
  return rows.map((row) => row.platform as Platform);
}
