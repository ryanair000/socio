import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { ensureTikTokSchema } from "@/lib/schema";
import { markQueueFailure, saveWorkflowRun } from "@/lib/posts";
import { PHYSICAL_REVIEW_POSTS as POSTS } from "@/lib/physical-review-campaign/posts";

export const maxDuration = 300;
const CAMPAIGN = "physical-review-2026-07-17";
const TOKEN_HASH = "21949d92cc0af0f2b634541e1c7eada916fc303f48e2aacade9e53bbe64c70d5";

function authorized(value: string | null) {
  if (!value) return false;
  return createHash("sha256").update(value).digest("hex") === TOKEN_HASH;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (!authorized(url.searchParams.get("key"))) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await ensureTikTokSchema();
    const sql = getSql();
    const existing = await sql`SELECT id, title, status, scheduled_at FROM posts WHERE source_week = ${CAMPAIGN} ORDER BY scheduled_at`;
    if (existing.length) return NextResponse.json({ ok: true, alreadyImported: true, posts: existing });
    const credential = await getActivePublisherCredential();
    if (!credential) return NextResponse.json({ error: "Publisher session expired. Sign in to Socio once, then run the importer again." }, { status: 409 });
    const latestSchedule = new Date("2026-07-21T20:00:00+03:00");
    if (credential.expiresAt <= latestSchedule) return NextResponse.json({ error: "Publisher session expires before the final scheduled post. Sign in to Socio again." }, { status: 409 });
    const origin = url.origin;
    const now = Date.now();
    const created: Array<{ id: string; title: string; scheduledAt: string; runId?: string; error?: string }> = [];
    for (const item of POSTS) {
      const id = randomUUID();
      const scheduledAt = item.overdueOrder
        ? new Date(now + 45_000 + (item.overdueOrder - 1) * 90_000)
        : new Date(item.scheduledAt!);
      const media = item.slugs.map((slug, position) => ({
        position,
        imageUrl: `${origin}/api/campaign/physical-review/poster/${slug}`,
        imagePathname: `campaign/physical-review/${slug}.png`,
      }));
      const sourceRef = `${CAMPAIGN}:${String(item.overdueOrder ?? item.scheduledAt)}:${item.title}`;
      await sql.transaction([
        sql`INSERT INTO posts (
          id, title, caption, brand, image_url, image_pathname, status, scheduled_at,
          schedule_version, publisher_credential_id, post_format, qa_status, source_week, source_ref
        ) VALUES (
          ${id}, ${item.title}, ${item.caption}, 'chezahub', ${media[0].imageUrl},
          ${media[0].imagePathname}, 'scheduled', ${scheduledAt.toISOString()}, 1,
          ${credential.id}, ${item.format}, 'ready', ${CAMPAIGN}, ${sourceRef}
        )`,
        ...media.map((m) => sql`INSERT INTO post_media (post_id, position, image_url, image_pathname) VALUES (${id}, ${m.position}, ${m.imageUrl}, ${m.imagePathname})`),
        ...item.platforms.map((platform) => sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key) VALUES (${id}, ${platform}, 'scheduled', ${`${id}:${platform}`})`),
      ]);
      try {
        const run = await start(publishScheduledPost, [{ postId: id, version: 1 }]);
        await saveWorkflowRun(id, 1, run.runId);
        created.push({ id, title: item.title, scheduledAt: scheduledAt.toISOString(), runId: run.runId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start publishing workflow.";
        await markQueueFailure(id, message);
        created.push({ id, title: item.title, scheduledAt: scheduledAt.toISOString(), error: message });
      }
    }
    return NextResponse.json({ ok: true, campaign: CAMPAIGN, overdueQueued: POSTS.filter((p) => p.overdueOrder).length, futureScheduled: POSTS.filter((p) => p.scheduledAt).length, created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Campaign import failed." }, { status: 500 });
  }
}
