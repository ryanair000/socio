import { NextResponse } from "next/server";
import { MAX_PACK_BYTES } from "@/lib/content-pack";
import { listImports } from "@/lib/imports";
import { stageContentPackBuffer } from "@/lib/import-upload";
import { requireSkillApiKey, skillApiKeyFromRequest } from "@/lib/skill-auth";

export const maxDuration = 300;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Skill request failed.";
  const status = message === "UNAUTHORIZED_SKILL" ? 401 : message === "SKILL_API_DISABLED" ? 503 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    requireSkillApiKey(skillApiKeyFromRequest(request));
    return NextResponse.json({ imports: await listImports() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSkillApiKey(skillApiKeyFromRequest(request));
    let buffer: Buffer;
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const pack = (await request.formData()).get("pack");
      if (!(pack instanceof File) || !/\.zip$/i.test(pack.name)) throw new Error("Attach one ZIP file in the pack field.");
      buffer = Buffer.from(await pack.arrayBuffer());
    } else {
      const { packUrl } = (await request.json()) as { packUrl?: string };
      if (!packUrl) throw new Error("Provide packUrl or multipart pack data.");
      const url = new URL(packUrl);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com")) throw new Error("Pack URLs must be public Vercel Blob HTTPS URLs.");
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not download the pack (${response.status}).`);
      buffer = Buffer.from(await response.arrayBuffer());
    }
    if (buffer.length > MAX_PACK_BYTES) throw new Error("Content packs cannot exceed 25 MB.");
    const result = await stageContentPackBuffer(buffer);
    return NextResponse.json({ ok: true, ...result }, { status: result.existing ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
