import { NextResponse } from "next/server";
import { getActivePublisherCredential, requireSession } from "@/lib/auth";
import { getSmmproIntegrationStatus } from "@/lib/smmpro";

export async function GET() {
  try {
    await requireSession();
    const credential = await getActivePublisherCredential();
    if (!credential)
      return NextResponse.json({
        connected: false,
        expiresAt: null,
        remainingHours: null,
        upstream: null,
      });
    const remainingHours = Math.max(
      0,
      Math.floor((credential.expiresAt.getTime() - Date.now()) / 3_600_000),
    );
    const upstream = await getSmmproIntegrationStatus(
      credential.encryptedToken,
    );
    return NextResponse.json({
      connected: true,
      expiresAt: credential.expiresAt.toISOString(),
      remainingHours,
      upstream,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load connections.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
