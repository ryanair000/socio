import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { duplicatePost } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    const duplicateId = await duplicatePost(id);
    return NextResponse.json({ ok: true, id: duplicateId }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not duplicate this post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
