import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import {
  listPosts,
  markQueueFailure,
  prepareRetry,
  saveWorkflowRun,
} from "@/lib/posts";

export async function POST() {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.json(
        { error: "Publisher session expired. Sign in again before retrying." },
        { status: 409 },
      );
    }

    const retryablePosts = (await listPosts()).filter((post) =>
      ["failed", "partially_published"].includes(post.status),
    );
    const errors: Array<{ id: string; title: string; error: string }> = [];
    let queued = 0;

    for (const post of retryablePosts) {
      try {
        const version = await prepareRetry(post.id, credential.id);
        try {
          const run = await start(publishScheduledPost, [
            { postId: post.id, version },
          ]);
          await saveWorkflowRun(post.id, version, run.runId);
          queued += 1;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not restart publishing workflow.";
          await markQueueFailure(post.id, message);
          errors.push({ id: post.id, title: post.title, error: message });
        }
      } catch (error) {
        errors.push({
          id: post.id,
          title: post.title,
          error:
            error instanceof Error ? error.message : "Could not retry post.",
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      total: retryablePosts.length,
      queued,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not retry failed posts.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
