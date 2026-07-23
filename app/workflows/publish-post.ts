import { randomUUID } from "node:crypto";
import { getStepMetadata, RetryableError, sleep } from "workflow";
import { getSql } from "@/lib/db";
import {
  getTikTokPublishStatus,
  publishWithSmmpro,
  type TikTokPublishStatus,
} from "@/lib/smmpro";
import { ensureTikTokSchema } from "@/lib/schema";
import type { Brand, PostFormat, PublishPlatform } from "@/lib/types";

type PublishPayload = {
  postId: string;
  version: number;
};

type ClaimedPost = {
  id: string;
  brand: Brand;
  title: string;
  caption: string;
  format: PostFormat;
  imageUrls: string[];
  credentialId: string | null;
};

type PublishTargetOutcome = {
  platform: PublishPlatform;
  skipped: boolean;
  success: boolean;
  processing?: boolean;
  publishId?: string;
  error?: string | null;
};

async function loadSchedule(postId: string, version: number) {
  "use step";
  await ensureTikTokSchema();
  console.log(`[loadSchedule] START postId=${postId} version=${version}`);
  const rows = await getSql()`SELECT scheduled_at FROM posts
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'`;
  const result = rows[0]?.scheduled_at
    ? new Date(String(rows[0].scheduled_at)).toISOString()
    : null;
  console.log(`[loadSchedule] DONE postId=${postId} found=${Boolean(result)}`);
  return result;
}

async function claimPost(
  postId: string,
  version: number,
): Promise<ClaimedPost | null> {
  "use step";
  await ensureTikTokSchema();
  console.log(`[claimPost] START postId=${postId} version=${version}`);
  const sql = getSql();
  const rows =
    await sql`UPDATE posts SET status = 'publishing', claimed_at = now(), updated_at = now(), last_error = NULL
    WHERE id = ${postId} AND schedule_version = ${version} AND status = 'scheduled'
    RETURNING id, brand, title, caption, post_format, image_url, publisher_credential_id`;
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
    title: String(rows[0].title),
    caption: String(rows[0].caption),
    format: rows[0].post_format as PostFormat,
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
  platform: PublishPlatform;
  brand: Brand;
  title: string;
  caption: string;
  format: PostFormat;
  imageUrls: string[];
  encryptedToken: string;
}): Promise<PublishTargetOutcome> {
  "use step";
  await ensureTikTokSchema();
  const meta = getStepMetadata();
  const retryNumber = meta.attempt;
  console.log(
    `[publishTarget] START postId=${input.postId} platform=${input.platform} retry=${retryNumber}`,
  );
  const sql = getSql();
  const targetRows = await sql`UPDATE post_targets SET attempts = attempts + 1
    WHERE post_id = ${input.postId} AND platform = ${input.platform} AND status = 'publishing'
    RETURNING attempts, idempotency_key, provider_publish_id`;
  if (!targetRows[0])
    return { platform: input.platform, skipped: true, success: true };

  const existingPublishId = targetRows[0].provider_publish_id
    ? String(targetRows[0].provider_publish_id)
    : null;
  if (input.platform === "tiktok" && existingPublishId) {
    console.log(
      `[publishTarget] RESUME postId=${input.postId} platform=tiktok publishId=${existingPublishId}`,
    );
    return {
      platform: input.platform,
      skipped: false,
      success: true,
      processing: true,
      publishId: existingPublishId,
    };
  }

  const attemptNumber = Number(targetRows[0].attempts);
  const attemptId = randomUUID();
  await sql`INSERT INTO publish_attempts (id, post_id, platform, attempt_number, status)
    VALUES (${attemptId}, ${input.postId}, ${input.platform}, ${attemptNumber}, 'publishing')`;

  const result = await publishWithSmmpro({
    ...input,
    idempotencyKey: String(targetRows[0].idempotency_key),
  });

  if (result.state === "processing" && result.providerPublishId) {
    await sql.transaction([
      sql`UPDATE post_targets SET provider_publish_id = ${result.providerPublishId},
          provider_response = ${JSON.stringify(result.response)}::jsonb, last_error = NULL
        WHERE post_id = ${input.postId} AND platform = ${input.platform}`,
      sql`UPDATE publish_attempts SET response = ${JSON.stringify(result.response)}::jsonb
        WHERE id = ${attemptId}`,
    ]);
    console.log(
      `[publishTarget] PROCESSING postId=${input.postId} platform=${input.platform} publishId=${result.providerPublishId}`,
    );
    return {
      platform: input.platform,
      skipped: false,
      success: true,
      processing: true,
      publishId: result.providerPublishId,
    };
  }

  const finalStatus = result.success ? "published" : "failed";
  await sql.transaction([
    sql`UPDATE post_targets SET status = ${finalStatus}, provider_post_id = ${result.providerPostId},
        provider_publish_id = ${result.providerPublishId},
        provider_response = ${JSON.stringify(result.response)}::jsonb,
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

async function pollTikTokStatus(input: {
  postId: string;
  publishId: string;
  encryptedToken: string;
}) {
  "use step";
  console.log(
    `[pollTikTokStatus] START postId=${input.postId} publishId=${input.publishId}`,
  );
  try {
    const result = await getTikTokPublishStatus(
      input.encryptedToken,
      input.publishId,
    );
    console.log(
      `[pollTikTokStatus] DONE postId=${input.postId} status=${result.status}`,
    );
    return { ok: true as const, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok status check failed.";
    console.log(
      `[pollTikTokStatus] RETRY postId=${input.postId} error=${message}`,
    );
    return { ok: false as const, error: message };
  }
}

async function finalizeTikTokTarget(input: {
  postId: string;
  publishId: string;
  status: TikTokPublishStatus;
}) {
  "use step";
  const sql = getSql();
  const succeeded = input.status.status === "PUBLISH_COMPLETE";
  const providerPostId = input.status.postIds[0] ?? input.publishId;
  const finalStatus = succeeded ? "published" : "failed";
  const error = succeeded
    ? null
    : input.status.failReason || "TikTok reported that publishing failed.";
  await sql.transaction([
    sql`UPDATE post_targets SET status = ${finalStatus},
        provider_post_id = ${succeeded ? providerPostId : null},
        provider_publish_id = ${succeeded ? input.publishId : null},
        provider_response = ${JSON.stringify(input.status.response)}::jsonb,
        last_error = ${error},
        published_at = CASE WHEN ${succeeded} THEN now() ELSE published_at END
      WHERE post_id = ${input.postId} AND platform = 'tiktok'`,
    sql`UPDATE publish_attempts SET status = ${finalStatus},
        provider_post_id = ${succeeded ? providerPostId : null},
        error = ${error}, response = ${JSON.stringify(input.status.response)}::jsonb,
        finished_at = now()
      WHERE id = (
        SELECT id FROM publish_attempts
        WHERE post_id = ${input.postId} AND platform = 'tiktok'
        ORDER BY started_at DESC LIMIT 1
      )`,
  ]);
  return { success: succeeded, error };
}

async function deferTikTokTarget(input: {
  postId: string;
  publishId: string;
  message: string;
}) {
  "use step";
  const sql = getSql();
  await sql.transaction([
    sql`UPDATE post_targets SET status = 'failed', provider_publish_id = ${input.publishId},
        last_error = ${input.message}
      WHERE post_id = ${input.postId} AND platform = 'tiktok'`,
    sql`UPDATE publish_attempts SET status = 'failed', error = ${input.message}, finished_at = now()
      WHERE id = (
        SELECT id FROM publish_attempts
        WHERE post_id = ${input.postId} AND platform = 'tiktok'
        ORDER BY started_at DESC LIMIT 1
      )`,
  ]);
}

async function waitForTikTokCompletion(input: {
  postId: string;
  publishId: string;
  encryptedToken: string;
}) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const checked = await pollTikTokStatus(input);
    if (checked.ok) {
      if (checked.result.status === "PUBLISH_COMPLETE") {
        return finalizeTikTokTarget({
          postId: input.postId,
          publishId: input.publishId,
          status: checked.result,
        });
      }
      if (checked.result.status === "FAILED") {
        return finalizeTikTokTarget({
          postId: input.postId,
          publishId: input.publishId,
          status: checked.result,
        });
      }
    }
    await sleep(new Date(Date.now() + 15_000));
  }
  const message =
    "TikTok is still processing this post. Retry later to resume checking the same publish ID without reposting.";
  await deferTikTokTarget({
    postId: input.postId,
    publishId: input.publishId,
    message,
  });
  return { success: false, error: message };
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
    const outcome = await publishTarget({
      ...post,
      platform,
      encryptedToken: credential.encryptedToken,
      postId,
    });
    if (platform === "tiktok" && outcome.processing && outcome.publishId) {
      await waitForTikTokCompletion({
        postId,
        publishId: outcome.publishId,
        encryptedToken: credential.encryptedToken,
      });
    }
  }
  const status = await finalizePost(postId);
  console.log(`[publishScheduledPost] DONE postId=${postId} status=${status}`);
  return { status };
}

async function getSqlTargets(postId: string) {
  "use step";
  await ensureTikTokSchema();
  console.log(`[getSqlTargets] START postId=${postId}`);
  const rows = await getSql()`SELECT platform FROM post_targets
    WHERE post_id = ${postId} AND status = 'publishing' ORDER BY platform`;
  const result = rows.map((row) => row.platform as PublishPlatform);
  console.log(`[getSqlTargets] DONE postId=${postId} count=${result.length}`);
  return result;
}
