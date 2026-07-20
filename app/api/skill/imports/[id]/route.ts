import { NextResponse } from "next/server";
import { getImport } from "@/lib/imports";
import { requireSkillApiKey, skillApiKeyFromRequest } from "@/lib/skill-auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSkillApiKey(skillApiKeyFromRequest(request));
    const { id } = await context.params;
    const detail = await getImport(id);
    if (!detail) return NextResponse.json({ error: "Import batch was not found." }, { status: 404 });
    return NextResponse.json({ import: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill request failed.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHORIZED_SKILL" ? 401 : 400 });
  }
}
