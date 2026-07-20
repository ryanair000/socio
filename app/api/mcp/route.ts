import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { publishScheduledPost } from "@/app/workflows/publish-post";
import { getActivePublisherCredential } from "@/lib/auth";
import { MAX_PACK_BYTES, type OverduePolicy } from "@/lib/content-pack";
import {
  approveImport,
  cancelImport,
  commitImportDrafts,
  getImport,
  listImports,
  scheduleImportEntries,
} from "@/lib/imports";
import { stageContentPackBuffer } from "@/lib/import-upload";
import { markQueueFailure, saveWorkflowRun } from "@/lib/posts";
import { requireSkillApiKey, skillApiKeyFromRequest } from "@/lib/skill-auth";

export const maxDuration = 300;
const protocolVersion = "2025-06-18";

const tools = [
  { name: "list_imports", description: "List Socio content-pack imports and their ready, warning, blocked, and lifecycle counts.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } },
  { name: "get_import", description: "Inspect one staged import, ordered media, captions, schedules, checks, and audit events.", inputSchema: { type: "object", properties: { importId: { type: "string" } }, required: ["importId"], additionalProperties: false }, annotations: { readOnlyHint: true } },
  { name: "stage_import_from_url", description: "Download a ZIP from an approved public Vercel Blob URL and stage it for review. This never creates posts or schedules.", inputSchema: { type: "object", properties: { packUrl: { type: "string", format: "uri" } }, required: ["packUrl"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: "approve_import", description: "Approve eligible staged entries. Blocked entries remain blocked. Requires an explicit confirmation flag.", inputSchema: { type: "object", properties: { importId: { type: "string" }, expectedVersion: { type: "integer" }, entryIds: { type: "array", items: { type: "string" } }, confirmQa: { type: "boolean" }, confirmed: { type: "boolean" } }, required: ["importId", "expectedVersion", "confirmed"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: "create_import_drafts", description: "Create Socio drafts from approved entries. This action does not schedule or publish.", inputSchema: { type: "object", properties: { importId: { type: "string" }, expectedVersion: { type: "integer" }, entryIds: { type: "array", items: { type: "string" } }, confirmed: { type: "boolean" } }, required: ["importId", "expectedVersion", "confirmed"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: "schedule_import", description: "Schedule committed Socio drafts using an explicit overdue policy and active publisher session.", inputSchema: { type: "object", properties: { importId: { type: "string" }, expectedVersion: { type: "integer" }, entryIds: { type: "array", items: { type: "string" } }, policy: { type: "string", enum: ["keep_draft", "roll_forward", "skip_expired", "stagger_from_now"] }, staggerMinutes: { type: "integer", minimum: 15 }, confirmed: { type: "boolean" } }, required: ["importId", "expectedVersion", "policy", "confirmed"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false } },
  { name: "cancel_import", description: "Cancel an import and any future draft or scheduled posts created from it. Published platform posts are not deleted.", inputSchema: { type: "object", properties: { importId: { type: "string" }, expectedVersion: { type: "integer" }, confirmed: { type: "boolean" } }, required: ["importId", "expectedVersion", "confirmed"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: true } },
];

function text(value: unknown, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) };
}

async function stageFromUrl(packUrl: string) {
  const url = new URL(packUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) throw new Error("Pack URLs must be public Vercel Blob HTTPS URLs.");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not download the pack (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_PACK_BYTES) throw new Error("Content packs cannot exceed 25 MB.");
  return stageContentPackBuffer(buffer);
}

async function schedule(args: Record<string, unknown>) {
  if (args.confirmed !== true) throw new Error("Scheduling requires confirmed=true.");
  const credential = await getActivePublisherCredential();
  if (!credential) throw new Error("Publisher session expired. Sign in to Socio again before scheduling.");
  const result = await scheduleImportEntries({
    batchId: String(args.importId),
    expectedVersion: Number(args.expectedVersion),
    publisherCredentialId: credential.id,
    publisherExpiresAt: credential.expiresAt,
    policy: String(args.policy) as OverduePolicy,
    staggerMinutes: args.staggerMinutes ? Number(args.staggerMinutes) : undefined,
    entryIds: Array.isArray(args.entryIds) ? args.entryIds.map(String) : undefined,
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
  return { ...result, workflows };
}

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "list_imports") return listImports();
  if (name === "get_import") return getImport(String(args.importId));
  if (name === "stage_import_from_url") return stageFromUrl(String(args.packUrl));
  if (name === "approve_import") {
    if (args.confirmed !== true) throw new Error("Approval requires confirmed=true.");
    return approveImport({ batchId: String(args.importId), expectedVersion: Number(args.expectedVersion), entryIds: Array.isArray(args.entryIds) ? args.entryIds.map(String) : undefined, confirmQa: args.confirmQa === true });
  }
  if (name === "create_import_drafts") {
    if (args.confirmed !== true) throw new Error("Draft creation requires confirmed=true.");
    return commitImportDrafts({ batchId: String(args.importId), expectedVersion: Number(args.expectedVersion), entryIds: Array.isArray(args.entryIds) ? args.entryIds.map(String) : undefined });
  }
  if (name === "schedule_import") return schedule(args);
  if (name === "cancel_import") {
    if (args.confirmed !== true) throw new Error("Cancellation requires confirmed=true.");
    return cancelImport({ batchId: String(args.importId), expectedVersion: Number(args.expectedVersion) });
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function POST(request: Request) {
  try {
    requireSkillApiKey(skillApiKeyFromRequest(request));
    const rpc = (await request.json()) as { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
    if (rpc.method === "notifications/initialized") return new Response(null, { status: 204 });
    if (rpc.method === "initialize") return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, result: { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "Socio Publisher", version: "1.0.0" } } });
    if (rpc.method === "ping") return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, result: {} });
    if (rpc.method === "tools/list") return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, result: { tools } });
    if (rpc.method === "tools/call") {
      try {
        const result = await callTool(String(rpc.params?.name), rpc.params?.arguments ?? {});
        return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, result: text(result) });
      } catch (error) {
        return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, result: text({ error: error instanceof Error ? error.message : "Tool failed." }, true) });
      }
    }
    return NextResponse.json({ jsonrpc: "2.0", id: rpc.id, error: { code: -32601, message: "Method not found" } }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP request failed.";
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message } }, { status: message === "UNAUTHORIZED_SKILL" ? 401 : 400 });
  }
}

export async function GET() {
  return NextResponse.json({ name: "Socio Publisher MCP", protocolVersion, tools: tools.map((tool) => tool.name) });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,mcp-protocol-version", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" } });
}
