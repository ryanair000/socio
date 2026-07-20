import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { configuredSkillApiKey } from "@/lib/skill-auth";

export async function GET() {
  try {
    await requireSession();
    const configured = configuredSkillApiKey();
    return NextResponse.json({
      apiKey: configured.value,
      source: configured.source,
      mcpUrl: "https://socio.jengasites.com/api/mcp",
      openApiUrl: "https://socio.jengasites.com/socio-publisher.openapi.json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the plugin token.";
    return NextResponse.json(
      { error: message === "UNAUTHORIZED" ? "Sign in required." : message },
      { status: message === "UNAUTHORIZED" ? 401 : 503 },
    );
  }
}
