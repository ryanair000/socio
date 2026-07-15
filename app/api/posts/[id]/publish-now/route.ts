import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import {
  markQueueFailure,
  preparePublishNow,
  saveWorkflowRun,
} from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Context) {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.json(
        {
          error: "Publisher session expired. Sign in again before publishing.",
        },
        { status: 409 },
      );
    }
    const { id } = await context.params;
    const version = await preparePublishNow(id, credential.id);
    try {
      const run = await start(publishScheduledPost, [{ postId: id, version }]);
      await saveWorkflowRun(id, version, run.runId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not start the publishing workflow.";
      await markQueueFailure(id, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not publish this post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
