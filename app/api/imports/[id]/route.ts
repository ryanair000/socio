import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getImport, updateImportEntry } from "@/lib/imports";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Import request failed.";
  return NextResponse.json(
    {
      error:
        message === "UNAUTHORIZED"
          ? "Sign in required."
          : message === "STALE_IMPORT_VERSION"
            ? "This import changed in another tab. Refresh and review it again."
            : message,
    },
    { status: message === "UNAUTHORIZED" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const detail = await getImport(id);
    if (!detail) return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });
    return NextResponse.json({ import: detail });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      expectedVersion?: number;
      entryId?: string;
      title?: string;
      caption?: string;
      scheduledAt?: string | null;
      platforms?: Array<"facebook" | "instagram" | "tiktok">;
      qaStatus?: "ready" | "ready_after_qa" | "hold";
      holdReason?: string | null;
    };
    if (!Number.isInteger(body.expectedVersion) || !body.entryId) {
      return NextResponse.json(
        { error: "Entry ID and expected import version are required." },
        { status: 400 },
      );
    }
    const detail = await updateImportEntry({
      batchId: id,
      entryId: body.entryId,
      expectedVersion: body.expectedVersion!,
      title: body.title,
      caption: body.caption,
      scheduledAt: body.scheduledAt,
      platforms: body.platforms,
      qaStatus: body.qaStatus,
      holdReason: body.holdReason,
    });
    return NextResponse.json({ ok: true, import: detail });
  } catch (error) {
    return errorResponse(error);
  }
}
