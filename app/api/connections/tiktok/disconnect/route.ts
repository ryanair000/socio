import { NextResponse } from "next/server";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import { disconnectTikTok } from "@/lib/smmpro";

export async function POST() {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.json(
        { error: "Sign in again to refresh the SMMPRO publisher session." },
        { status: 409 },
      );
    }
    await disconnectTikTok(credential.encryptedToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not disconnect TikTok.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 502 },
    );
  }
}
