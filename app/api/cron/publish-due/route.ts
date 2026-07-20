import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { ensureChezaPointsLaunchCampaign } from "@/lib/cheza-points-campaign";
import {
  listRecoverablePosts,
  markQueueFailure,
  saveWorkflowRun,
} from "@/lib/posts";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  let campaign:
    | Awaited<ReturnType<typeof ensureChezaPointsLaunchCampaign>>
    | null = null;
  let campaignError: string | null = null;

  try {
    campaign = await ensureChezaPointsLaunchCampaign();
  } catch (error) {
    campaignError =
      error instanceof Error
        ? error.message
        : "Could not bridge the Cheza Points campaign into Socio.";
  }

  const due = await listRecoverablePosts();
  const queued: string[] = [];
  const failed: Array<{ postId: string; error: string }> = [];

  for (const item of due) {
    try {
      const run = await start(publishScheduledPost, [item]);
      await saveWorkflowRun(item.postId, item.version, run.runId);
      queued.push(item.postId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cron could not start publishing.";
      await markQueueFailure(item.postId, message);
      failed.push({ postId: item.postId, error: message });
    }
  }

  const ok = failed.length === 0 && !campaignError;
  return NextResponse.json(
    { ok, campaign, campaignError, queued, failed },
    { status: ok ? 200 : 500 },
  );
}
