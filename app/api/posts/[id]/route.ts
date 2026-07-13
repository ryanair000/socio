import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import {
  deleteDraft,
  getPost,
  markQueueFailure,
  saveWorkflowRun,
  updatePost,
} from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    const post = await getPost(id);
    if (!post)
      return NextResponse.json(
        { error: "Post was not found." },
        { status: 404 },
      );
    return NextResponse.json({ post });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    const input = await request.json();
    const scheduledAt = input?.scheduledAt
      ? new Date(String(input.scheduledAt))
      : null;
    if (scheduledAt && scheduledAt.getTime() < Date.now() + 30_000) {
      return NextResponse.json(
        { error: "Scheduled time must be at least 30 seconds in the future." },
        { status: 400 },
      );
    }
    const credential = scheduledAt
      ? await getActivePublisherCredential()
      : null;
    if (scheduledAt && !credential) {
      return NextResponse.json(
        {
          error: "Publisher session expired. Sign in again before scheduling.",
        },
        { status: 409 },
      );
    }
    if (scheduledAt && credential && scheduledAt >= credential.expiresAt) {
      return NextResponse.json(
        { error: "Scheduled time exceeds the publisher session." },
        { status: 409 },
      );
    }

    const post = await updatePost(
      id,
      input,
      scheduledAt ? (credential?.id ?? null) : null,
    );
    if (post.status === "scheduled") {
      try {
        const run = await start(publishScheduledPost, [
          { postId: id, version: post.version },
        ]);
        await saveWorkflowRun(id, post.version, run.runId);
      } catch (error) {
        await markQueueFailure(
          id,
          error instanceof Error
            ? error.message
            : "Could not start publishing workflow.",
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    const imagePathnames = await deleteDraft(id);
    if (!imagePathnames)
      return NextResponse.json(
        { error: "Only draft posts can be deleted." },
        { status: 409 },
      );
    await del(imagePathnames).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
