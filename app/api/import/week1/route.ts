import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assertImportIsNew, createImportedPosts } from "@/lib/posts";
import { parseWeek1Zip } from "@/lib/week1-import";

export const maxDuration = 300;

export async function POST(request: Request) {
  const uploadedPathnames: string[] = [];
  try {
    await requireSession();
    const form = await request.formData();
    const file = form.get("pack");
    if (!(file instanceof File) || !/\.zip$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Choose one Week 1 day ZIP pack." },
        { status: 400 },
      );
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Day ZIP packs cannot exceed 25 MB." },
        { status: 413 },
      );
    }

    const parsed = parseWeek1Zip(Buffer.from(await file.arrayBuffer()));
    await assertImportIsNew(parsed.map((post) => post.sourceRef));
    const mediaByFilename = new Map<
      string,
      { imageUrl: string; imagePathname: string }
    >();
    for (const media of parsed.flatMap((post) => post.media)) {
      if (mediaByFilename.has(media.filename)) continue;
      const safeName = media.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
      const blob = await put(
        `week1/${parsed[0].day.toLowerCase()}/${randomUUID()}-${safeName}`,
        media.bytes,
        { access: "public", contentType: media.contentType },
      );
      uploadedPathnames.push(blob.pathname);
      mediaByFilename.set(media.filename, {
        imageUrl: blob.url,
        imagePathname: blob.pathname,
      });
    }

    const ids = await createImportedPosts(
      parsed.map((post) => ({
        ...post,
        media: post.media.map((media) => mediaByFilename.get(media.filename)!),
      })),
    );
    return NextResponse.json({
      ok: true,
      day: parsed[0].day,
      imported: ids.length,
      ready: parsed.filter((post) => post.qaStatus === "ready").length,
      blocked: parsed.filter((post) => post.qaStatus !== "ready").length,
    });
  } catch (error) {
    if (uploadedPathnames.length)
      await del(uploadedPathnames).catch(() => undefined);
    const message =
      error instanceof Error
        ? error.message
        : "Could not import the Week 1 pack.";
    return NextResponse.json(
      { error: message },
      {
        status:
          message === "UNAUTHORIZED"
            ? 401
            : /already been imported/i.test(message)
              ? 409
              : 400,
      },
    );
  }
}
