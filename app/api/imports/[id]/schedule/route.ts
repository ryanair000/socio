import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import type { OverduePolicy } from "@/lib/content-pack";
import { scheduleImportEntries } from "@/lib/imports";
import { markQueueFailure, saveWorkflowRun } from "@/lib/posts";

const POLICIES = new Set<OverduePolicy>([
  "keep_draft",
  "roll_forward",
  "skip_expired",
  "stagger_from_now",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      expectedVersion?: number;
      entryIds?: string[];
      policy?: OverduePolicy;
      staggerMinutes?: number;
      confirmation?: string;
    };
    if (!Number.isInteger(body.expectedVersion)) {
      return NextResponse.json({ error: "Expected import version is required." }, { status: 400 });
    }
    if (!body.policy || !POLICIES.has(body.policy)) {
      return NextResponse.json({ error: "Choose a valid overdue policy." }, { status: 400 });
    }
    if (body.confirmation !== "schedule_approved_drafts") {
      return NextResponse.json(
        { error: "Explicit scheduling confirmation is required." },
        { status: 400 },
      );
    }
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.json(
        { error: "Publisher session expired. Sign in again before scheduling." },
        { status: 409 },
      );
    }
    const result = await scheduleImportEntries({
      batchId: id,
      expectedVersion: body.expectedVersion!,
      publisherCredentialId: credential.id,
      publisherExpiresAt: credential.expiresAt,
      policy: body.policy,
      staggerMinutes: body.staggerMinutes,
      entryIds: body.entryIds,
    });
    const workflows: Array<{
      postId: string;
      runId?: string;
      error?: string;
    }> = [];
    for (const item of result.scheduled) {
      try {
        const run = await start(publishScheduledPost, [
          { postId: item.postId, version: item.version },
        ]);
        await saveWorkflowRun(item.postId, item.version, run.runId);
        workflows.push({ postId: item.postId, runId: run.runId });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not start the publishing workflow.";
        await markQueueFailure(item.postId, message);
        workflows.push({ postId: item.postId, error: message });
      }
    }
    return NextResponse.json({ ok: true, ...result, workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduling failed.";
    return NextResponse.json(
      {
        error:
          message === "UNAUTHORIZED"
            ? "Sign in required."
            : message === "STALE_IMPORT_VERSION"
              ? "This import changed. Refresh before scheduling."
              : message,
      },
      { status: message === "UNAUTHORIZED" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 },
    );
  }
}
