import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approvePost } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    await approvePost(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not approve this post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
