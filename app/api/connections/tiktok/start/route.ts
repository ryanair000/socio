import { NextResponse } from "next/server";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import { getTikTokConnectUrl } from "@/lib/smmpro";

export async function GET(request: Request) {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const origin = new URL(request.url).origin;
    const connectUrl = await getTikTokConnectUrl(
      credential.encryptedToken,
      `${origin}/tiktok`,
    );
    return NextResponse.redirect(connectUrl);
  } catch (error) {
    const target = new URL("/tiktok", request.url);
    target.searchParams.set("tiktok", "error");
    target.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Could not connect TikTok.",
    );
    return NextResponse.redirect(target);
  }
}
