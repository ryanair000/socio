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
  for (const item of due) {
    try {
      const run = await start(publishScheduledPost, [item]);
      await saveWorkflowRun(item.postId, item.version, run.runId);
      queued.push(item.postId);
    } catch (error) {
      await markQueueFailure(
        item.postId,
        error instanceof Error
          ? error.message
          : "Cron could not start publishing.",
      );
    }
  }
  return NextResponse.json({ ok: true, queued });
}
