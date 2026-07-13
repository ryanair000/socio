import { NextResponse } from "next/server";
import { createSocioSession } from "@/lib/auth";
import { authenticateWithSmmpro } from "@/lib/smmpro";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const upstreamToken = await authenticateWithSmmpro(email, password);
    const session = await createSocioSession(upstreamToken);
    return NextResponse.json({
      ok: true,
      publisherExpiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed." },
      { status: 401 },
    );
  }
}
