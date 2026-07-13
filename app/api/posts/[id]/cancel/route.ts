import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { cancelPost } from "@/lib/posts";

type Context = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: Context) {
  try {
    await requireSession();
    const { id } = await context.params;
    await cancelPost(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not cancel this post.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
