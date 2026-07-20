import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { cancelImport } from "@/lib/imports";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const body = (await request.json()) as {
      expectedVersion?: number;
      confirmation?: string;
    };
    if (!Number.isInteger(body.expectedVersion)) {
      return NextResponse.json({ error: "Expected import version is required." }, { status: 400 });
    }
    if (body.confirmation !== "cancel_import_and_future_schedules") {
      return NextResponse.json(
        { error: "Explicit cancellation confirmation is required." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      import: await cancelImport({
        batchId: id,
        expectedVersion: body.expectedVersion!,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed.";
    return NextResponse.json(
      {
        error:
          message === "UNAUTHORIZED"
            ? "Sign in required."
            : message === "STALE_IMPORT_VERSION"
              ? "This import changed. Refresh before cancelling."
              : message,
      },
      { status: message === "UNAUTHORIZED" ? 401 : message === "STALE_IMPORT_VERSION" ? 409 : 400 },
    );
  }
}
