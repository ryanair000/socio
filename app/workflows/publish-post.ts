import { randomUUID } from "node:crypto";
import { getStepMetadata, RetryableError, sleep } from "workflow";
import { getSql } from "@/lib/db";
import { publishWithSmmpro } from "@/lib/smmpro";
import type { Brand, Platform } from "@/lib/types";

type PublishPayload = {
  postId: string;
  version: number;
};

async function loadSchedule(postId: string, version: number) {
  "use step";
  console.log(`[loadSchedule] START postId=${postId} version=${version}`);
  const rows = await getSql()`SELECT scheduled_at FROM posts
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'`;
  const result = rows[0]?.scheduled_at
    ? new Date(String(rows[0].scheduled_at)).toISOString()
    : null;
  console.log(`[loadSchedule] DONE postId=${postId} found=${Boolean(result)}`);
  return result;
}

async function claimPost(postId: string, version: number) {
  "use step";
  console.log(`[claimPost] START postId=${postId} version=${version}`);
  const sql = getSql();
  const rows =
    await sql`UPDATE posts SET status = 'publishing', claimed_at = now(), updated_at = now(), last_error = NULL
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'
    RETURNING id, brand, caption, image_url, publisher_credential_id`;
  if (!rows[0]) {
    console.log(`[claimPost] DONE postId=${postId} claimed=false`);
    return null;
  }
  const mediaRows = await sql`SELECT image_url FROM post_media
    WHERE post_id = ${postId} ORDER BY position`;
  await sql`UPDATE post_targets SET status = 'publishing', last_error = NULL
    WHERE post_id = ${postId} AND status = 'scheduled'`;
  const result = {
    id: String(rows[0].id),
    brand: rows[0].brand as Brand,
    caption: String(rows[0].caption),
    imageUrls: mediaRows.length
      ? mediaRows.map((row) => String(row.image_url))
      : [String(rows[0].image_url)],
    credentialId: rows[0].publisher_credential_id
      ? String(rows[0].publisher_credential_id)
      : null,
  };
  console.log(`[claimPost] DONE postId=${postId} claimed=true`);
  return result;
}

async function loadCredential(credentialId: string | null) {
  "use step";
  console.log(`[loadCredential] START credentialId=${credentialId ?? "none"}`);
  if (!credentialId) return null;
  const rows =
    await getSql()`SELECT encrypted_token, expires_at FROM publisher_credentials
    WHERE id = ${credentialId} AND expires_at > now()`;
  const result = rows[0]
    ? {
        encryptedToken: String(rows[0].encrypted_token),
        expiresAt: new Date(String(rows[0].expires_at)).toISOString(),
      }
    : null;
  console.log(`[loadCredential] DONE valid=${Boolean(result)}`);
  return result;
}

async function publishTarget(input: {
  postId: string;
  platform: Platform;
  brand: Brand;
  caption: string;
  imageUrls: string[];
  encryptedToken: string;
}) {
  "use step";
  const meta = getStepMetadata();
  const retryNumber = meta.attempt;
  console.log(
    `[publishTarget] START postId=${input.postId} platform=${input.platform} retry=${retryNumber}`,
  );
  const sql = getSql();
  const targetRows = await sql`UPDATE post_targets SET attempts = attempts + 1
    WHERE post_id = ${input.postId} AND platform = ${input.platform} AND status = 'publishing'
    RETURNING attempts, idempotency_key`;
  if (!targetRows[0])
    return { platform: input.platform, skipped: true, success: true };

  const attemptNumber = Number(targetRows[0].attempts);
  const attemptId = randomUUID();
  await sql`INSERT INTO publish_attempts (id, post_id, platform, attempt_number, status)
    VALUES (${attemptId}, ${input.postId}, ${input.platform}, ${attemptNumber}, 'publishing')`;

  const result = await publishWithSmmpro({
    ...input,
    idempotencyKey: String(targetRows[0].idempotency_key),
  });
  const finalStatus = result.success ? "published" : "failed";
  await sql.transaction([
    sql`UPDATE post_targets SET status = ${finalStatus}, provider_post_id = ${result.providerPostId},
        last_error = ${result.error}, published_at = CASE WHEN ${result.success} THEN now() ELSE published_at END
      WHERE post_id = ${input.postId} AND platform = ${input.platform}`,
    sql`UPDATE publish_attempts SET status = ${finalStatus}, provider_post_id = ${result.providerPostId},
        error = ${result.error}, response = ${JSON.stringify(result.response)}::jsonb, finished_at = now()
      WHERE id = ${attemptId}`,
  ]);
  if (!result.success && result.retryable && retryNumber < 3) {
    await sql`UPDATE post_targets SET status = 'publishing'
      WHERE post_id = ${input.postId} AND platform = ${input.platform}`;
    throw new RetryableError(result.error || "Transient publishing failure.", {
      retryAfter: `${2 ** retryNumber}s`,
    });
  }
  console.log(
    `[publishTarget] DONE postId=${input.postId} platform=${input.platform} success=${result.success}`,
  );
  return {
    platform: input.platform,
    skipped: false,
    success: result.success,
    error: result.error,
  };
}

async function failPendingTargets(postId: string, message: string) {
  "use step";
  console.log(`[failPendingTargets] START postId=${postId}`);
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE post_targets SET status = 'failed', last_error = ${message}
      WHERE post_id = ${postId} AND status = 'publishing'`,
    sql`UPDATE posts SET status = 'failed', claimed_at = NULL, last_error = ${message}, updated_at = now() WHERE id = ${postId}`,
  ]);
  console.log(`[failPendingTargets] DONE postId=${postId}`);
}

async function finalizePost(postId: string) {
  "use step";
  console.log(`[finalizePost] START postId=${postId}`);
  const sql = getSql();
  const rows =
    await sql`SELECT status, last_error FROM post_targets WHERE post_id = ${postId}`;
  const failed = rows.filter((row) => row.status === "failed");
  const published = rows.filter((row) => row.status === "published");
  const status = failed.length
    ? published.length
      ? "partially_published"
      : "failed"
    : "published";
  const error =
    failed
      .map((row) => String(row.last_error || "Publishing failed."))
      .join(" ") || null;
  await sql`UPDATE posts SET status = ${status}, claimed_at = NULL, last_error = ${error},
      published_at = CASE WHEN ${published.length > 0} THEN COALESCE(published_at, now()) ELSE published_at END,
      updated_at = now() WHERE id = ${postId}`;
  console.log(`[finalizePost] DONE postId=${postId} status=${status}`);
  return status;
}

export async function publishScheduledPost({
  postId,
  version,
}: PublishPayload) {
  "use workflow";
  console.log(
    `[publishScheduledPost] START postId=${postId} version=${version}`,
  );
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
  const status = await finalizePost(postId);
  console.log(`[publishScheduledPost] DONE postId=${postId} status=${status}`);
  return { status };
}

async function getSqlTargets(postId: string) {
  "use step";
  console.log(`[getSqlTargets] START postId=${postId}`);
  const rows = await getSql()`SELECT platform FROM post_targets
    WHERE post_id = ${postId} AND status = 'publishing' ORDER BY platform`;
  const result = rows.map((row) => row.platform as Platform);
  console.log(`[getSqlTargets] DONE postId=${postId} count=${result.length}`);
  return result;
}
