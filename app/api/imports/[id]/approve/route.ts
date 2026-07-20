import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approveImport } from "@/lib/imports";

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
      confirmQa?: boolean;
      confirmation?: string;
    };
    if (!Number.isInteger(body.expectedVersion)) {
      return NextResponse.json({ error: "Expected import version is required." }, { status: 400 });
    }
    if (body.confirmation !== "approve_selected_entries") {
      return NextResponse.json(
        { error: "Explicit approval confirmation is required." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      await approveImport({
        batchId: id,
        expectedVersion: body.expectedVersion!,
        entryIds: body.entryIds,
        confirmQa: body.confirmQa,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    return NextResponse.json(
      {
        error:
          message === "UNAUTHORIZED"
            ? "Sign in required."
            : message === "STALE_IMPORT_VERSION"
              ? "This import changed. Refresh before approving."
              : message,
      },
      { status: message === "UNAUTHORIZED" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 },
    );
  }
}
