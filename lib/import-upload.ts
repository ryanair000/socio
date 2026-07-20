import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { parseContentPack } from "@/lib/content-pack";
import {
  findImportByHash,
  getImport,
  stageImport,
  type UploadedImportAsset,
} from "@/lib/imports";

export async function stageContentPackBuffer(buffer: Buffer) {
  const uploadedPathnames: string[] = [];
  try {
    const parsed = parseContentPack(buffer);
    const existingId = await findImportByHash(parsed.packHash);
    if (existingId) {
      return {
        existing: true,
        import: await getImport(existingId),
      };
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
    return {
      existing: staged.existing,
      import: await getImport(staged.id),
    };
  } catch (error) {
    if (uploadedPathnames.length) {
      await del([...new Set(uploadedPathnames)]).catch(() => undefined);
    }
    throw error;
  }
}
