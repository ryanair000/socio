import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
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
  return NextResponse.json(
    { ok: failed.length === 0, queued, failed },
    { status: failed.length ? 500 : 200 },
  );
}
