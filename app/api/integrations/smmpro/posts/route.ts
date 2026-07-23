import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  createSmmproCalendarPost,
  hasSmmproEvent,
  parseSmmproSyncEvent,
  validSyncSecret,
  type MirroredMedia,
} from "@/lib/smmpro-sync";

export const maxDuration = 60;

function extensionFor(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function mirrorImage(
  eventId: string,
  imageUrl: string,
  position: number,
): Promise<MirroredMedia> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    const contentType =
      response.headers.get("content-type")?.split(";")[0] || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (
      !response.ok ||
      !contentType.startsWith("image/") ||
      contentLength > 10 * 1024 * 1024
    ) {
      throw new Error("External image could not be copied.");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024)
      throw new Error("External image is too large.");
    const key = createHash("sha256")
      .update(`${eventId}:${position}:${imageUrl}`)
      .digest("hex");
    const blob = await put(
      `smmpro/${key}.${extensionFor(contentType)}`,
      bytes,
      {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );
    return { imageUrl: blob.url, imagePathname: blob.pathname };
  } catch {
    return { imageUrl: "/smmpro-placeholder.svg", imagePathname: "" };
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.SOCIO_SYNC_SECRET?.trim() || "";
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Socio sync is not configured." },
      { status: 503 },
    );
  }
  const authorization = request.headers.get("authorization") || "";
  const providedSecret = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!validSyncSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const event = parseSmmproSyncEvent(await request.json());
    const existingId = await hasSmmproEvent(event.eventId);
    if (existingId) {
      return NextResponse.json({ ok: true, id: existingId, created: false });
    }
    const media = await Promise.all(
      event.imageUrls.map((imageUrl, position) =>
        mirrorImage(event.eventId, imageUrl, position),
      ),
    );
    const result = await createSmmproCalendarPost(event, media);
    return NextResponse.json(
      { ok: true, ...result },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync the SMMPro post.",
      },
      { status: 400 },
    );
  }
}
