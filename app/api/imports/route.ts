import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parseContentPack } from "@/lib/content-pack";
import {
  findImportByHash,
  getImport,
  listImports,
  stageImport,
  type UploadedImportAsset,
} from "@/lib/imports";

export const maxDuration = 300;

function responseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Import failed.";
  const status =
    message === "UNAUTHORIZED"
      ? 401
      : /cannot exceed|safety limit|exceeds|unsafe|invalid|missing|required|unsupported|must contain/i.test(message)
        ? 400
        : 500;
  return NextResponse.json(
    { error: message === "UNAUTHORIZED" ? "Sign in required." : message },
    { status },
  );
}

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json({ imports: await listImports() });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  const uploadedPathnames: string[] = [];
  try {
    await requireSession();
    const form = await request.formData();
    const file = form.get("pack");
    if (!(file instanceof File) || !/\.zip$/i.test(file.name)) {
      return NextResponse.json(
        { error: "Choose one ZIP content pack." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = parseContentPack(bytes);
    const existingId = await findImportByHash(parsed.packHash);
    if (existingId) {
      return NextResponse.json({
        ok: true,
        existing: true,
        import: await getImport(existingId),
      });
    }

    const byHash = new Map<string, { imageUrl: string; imagePathname: string }>();
    const uploadedAssets: UploadedImportAsset[] = [];
    for (const asset of parsed.assets) {
      let uploaded = byHash.get(asset.sha256);
      if (!uploaded) {
        const safeName = asset.filename
          .split("/")
          .pop()!
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .toLowerCase();
        const blob = await put(
          `imports/${parsed.packHash.slice(0, 16)}/${randomUUID()}-${safeName}`,
          asset.bytes,
          { access: "public", contentType: asset.contentType },
        );
        uploaded = { imageUrl: blob.url, imagePathname: blob.pathname };
        byHash.set(asset.sha256, uploaded);
        uploadedPathnames.push(blob.pathname);
      }
      uploadedAssets.push({
        filename: asset.filename,
        sha256: asset.sha256,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        ...uploaded,
      });
    }

    const staged = await stageImport(parsed, uploadedAssets);
    return NextResponse.json(
      {
        ok: true,
        existing: staged.existing,
        import: await getImport(staged.id),
      },
      { status: staged.existing ? 200 : 201 },
    );
  } catch (error) {
    if (uploadedPathnames.length) {
      await del([...new Set(uploadedPathnames)]).catch(() => undefined);
    }
    return responseError(error);
  }
}
