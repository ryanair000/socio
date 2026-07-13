import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import {
  createPost,
  listPosts,
  markQueueFailure,
  saveWorkflowRun,
} from "@/lib/posts";
import { validatePostInput } from "@/lib/validation";

function unauthorized(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const startValue =
      url.searchParams.get("from") ?? url.searchParams.get("start");
    const endValue = url.searchParams.get("to") ?? url.searchParams.get("end");
    const startDate = startValue ? new Date(startValue) : undefined;
    const endDate = endValue ? new Date(endValue) : undefined;
    const status = url.searchParams.get("status");
    const loaded = await listPosts(startDate, endDate);
    const posts = status
      ? loaded.filter((post) => post.status === status)
      : loaded;
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      {
        error: unauthorized(error)
          ? "Sign in required."
          : error instanceof Error
            ? error.message
            : "Could not load posts.",
      },
      { status: unauthorized(error) ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = (await request.json()) as { items?: unknown[] };
    if (
      !Array.isArray(body.items) ||
      body.items.length < 1 ||
      body.items.length > 10
    ) {
      return NextResponse.json(
        { error: "Add between 1 and 10 posts." },
        { status: 400 },
      );
    }

    const validatedItems = body.items.map(validatePostInput);
    const hasScheduled = validatedItems.some((item) => item.scheduledAt);
    const credential = hasScheduled
      ? await getActivePublisherCredential()
      : null;
    if (hasScheduled && !credential) {
      return NextResponse.json(
        {
          error: "Publisher session expired. Sign in again before scheduling.",
        },
        { status: 409 },
      );
    }

    for (const item of validatedItems) {
      if (
        item.scheduledAt &&
        item.scheduledAt.getTime() < Date.now() + 30_000
      ) {
        return NextResponse.json(
          {
            error: "Scheduled times must be at least 30 seconds in the future.",
          },
          { status: 400 },
        );
      }
      if (
        item.scheduledAt &&
        credential &&
        item.scheduledAt >= credential.expiresAt
      ) {
        return NextResponse.json(
          {
            error:
              "A scheduled time is beyond the current publisher session. Sign in closer to that date.",
          },
          { status: 409 },
        );
      }
    }

    const created = [];
    for (let index = 0; index < body.items.length; index += 1) {
      const item = body.items[index];
      const scheduledAtValue = validatedItems[index].scheduledAt;
      const post = await createPost(
        item,
        scheduledAtValue ? (credential?.id ?? null) : null,
      );
      if (post.status === "scheduled") {
        try {
          const run = await start(publishScheduledPost, [
            { postId: post.id, version: post.version },
          ]);
          await saveWorkflowRun(post.id, post.version, run.runId);
        } catch (error) {
          await markQueueFailure(
            post.id,
            error instanceof Error
              ? error.message
              : "Could not start publishing workflow.",
          );
        }
      }
      created.push(post.id);
    }

    return NextResponse.json({ ok: true, ids: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: unauthorized(error)
          ? "Sign in required."
          : error instanceof Error
            ? error.message
            : "Could not save posts.",
      },
      { status: unauthorized(error) ? 401 : 400 },
    );
  }
}
