import { NextResponse } from "next/server";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import { getTikTokConnectionStatus } from "@/lib/smmpro";

export async function GET() {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.json({
        configured: false,
        connected: false,
        error: "Sign in again to refresh the SMMPRO publisher session.",
      });
    }
    return NextResponse.json(
      await getTikTokConnectionStatus(credential.encryptedToken),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load TikTok.";
    return NextResponse.json(
      { error: message, configured: false, connected: false },
      { status: message === "UNAUTHORIZED" ? 401 : 502 },
    );
  }
}
