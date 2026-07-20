import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { commitImportDrafts } from "@/lib/imports";

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
      confirmation?: string;
    };
    if (!Number.isInteger(body.expectedVersion)) {
      return NextResponse.json({ error: "Expected import version is required." }, { status: 400 });
    }
    if (body.confirmation !== "create_drafts_only") {
      return NextResponse.json(
        { error: "Confirm that this action creates drafts only." },
        { status: 400 },
      );
    }
    const result = await commitImportDrafts({
      batchId: id,
      expectedVersion: body.expectedVersion!,
      entryIds: body.entryIds,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create drafts.";
    return NextResponse.json(
      {
        error:
          message === "UNAUTHORIZED"
            ? "Sign in required."
            : message === "STALE_IMPORT_VERSION"
              ? "This import changed. Refresh before creating drafts."
              : message,
      },
      { status: message === "UNAUTHORIZED" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 },
    );
  }
}
