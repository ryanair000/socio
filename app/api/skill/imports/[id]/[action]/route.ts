import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential } from "@/lib/auth";
import type { OverduePolicy } from "@/lib/content-pack";
import {
  approveImport,
  cancelImport,
  commitImportDrafts,
  scheduleImportEntries,
} from "@/lib/imports";
import { markQueueFailure, saveWorkflowRun } from "@/lib/posts";
import { requireSkillApiKey, skillApiKeyFromRequest } from "@/lib/skill-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  try {
    requireSkillApiKey(skillApiKeyFromRequest(request));
    const { id, action } = await context.params;
    const body = (await request.json()) as {
      expectedVersion?: number;
      entryIds?: string[];
      confirmQa?: boolean;
      confirmation?: string;
      policy?: OverduePolicy;
      staggerMinutes?: number;
    };
    if (!Number.isInteger(body.expectedVersion)) throw new Error("Expected import version is required.");

    if (action === "approve") {
      if (body.confirmation !== "approve_selected_entries") throw new Error("Explicit approval confirmation is required.");
      return NextResponse.json(await approveImport({ batchId: id, expectedVersion: body.expectedVersion!, entryIds: body.entryIds, confirmQa: body.confirmQa }));
    }
    if (action === "commit") {
      if (body.confirmation !== "create_drafts_only") throw new Error("Confirm that this action creates drafts only.");
      return NextResponse.json({ ok: true, ...(await commitImportDrafts({ batchId: id, expectedVersion: body.expectedVersion!, entryIds: body.entryIds })) });
    }
    if (action === "cancel") {
      if (body.confirmation !== "cancel_import_and_future_schedules") throw new Error("Explicit cancellation confirmation is required.");
      return NextResponse.json({ ok: true, import: await cancelImport({ batchId: id, expectedVersion: body.expectedVersion! }) });
    }
    if (action !== "schedule") throw new Error("Unknown import action.");
    if (body.confirmation !== "schedule_approved_drafts") throw new Error("Explicit scheduling confirmation is required.");
    const credential = await getActivePublisherCredential();
    if (!credential) return NextResponse.json({ error: "Publisher session expired. Sign in again before scheduling." }, { status: 409 });
    const result = await scheduleImportEntries({
      batchId: id,
      expectedVersion: body.expectedVersion!,
      publisherCredentialId: credential.id,
      publisherExpiresAt: credential.expiresAt,
      policy: body.policy ?? "roll_forward",
      staggerMinutes: body.staggerMinutes,
      entryIds: body.entryIds,
    });
    const workflows = [];
    for (const item of result.scheduled) {
      try {
        const run = await start(publishScheduledPost, [{ postId: item.postId, version: item.version }]);
        await saveWorkflowRun(item.postId, item.version, run.runId);
        workflows.push({ postId: item.postId, runId: run.runId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start publishing workflow.";
        await markQueueFailure(item.postId, message);
        workflows.push({ postId: item.postId, error: message });
      }
    }
    return NextResponse.json({ ok: true, ...result, workflows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill action failed.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED_SKILL" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 });
  }
}
