import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import { NAIROBI_TIME_ZONE } from "@/lib/calendar";
import type { Brand, PublishPlatform, QaStatus } from "@/lib/types";
import { parseWeek1Zip } from "@/lib/week1-import";

export const CONTENT_PACK_SCHEMA_VERSION = "1.0";
export const MAX_PACK_BYTES = 25 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 80 * 1024 * 1024;
export const MAX_PACK_IMAGES = 70;
export const MAX_POST_MEDIA = 10;

export type ImportSeverity = "info" | "warning" | "error";
export type OverduePolicy =
  | "keep_draft"
  | "roll_forward"
  | "skip_expired"
  | "stagger_from_now";

export type ParsedAsset = {
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Buffer;
  sha256: string;
  sizeBytes: number;
};

export type ParsedCheck = {
  entryRef: string | null;
  code: string;
  severity: ImportSeverity;
  message: string;
};

export type ParsedEntry = {
  reference: string;
  title: string;
  caption: string;
  format: "single" | "carousel";
  media: string[];
  platforms: PublishPlatform[];
  scheduledAt: Date | null;
  qaStatus: QaStatus;
  holdReason: string | null;
  contentHash: string;
};

export type ParsedContentPack = {
  packHash: string;
  schemaVersion: string;
  name: string;
  brand: Brand;
  timezone: string;
  sourceWeek: string | null;
  defaultOverduePolicy: OverduePolicy;
  assets: ParsedAsset[];
  entries: ParsedEntry[];
  checks: ParsedCheck[];
};

type RawManifest = {
  schemaVersion?: unknown;
  brand?: unknown;
  timezone?: unknown;
  campaign?: { name?: unknown; sourceWeek?: unknown };
  defaults?: { platforms?: unknown; overduePolicy?: unknown };
  posts?: unknown;
};

type RawManifestPost = {
  reference?: unknown;
  title?: unknown;
  caption?: unknown;
  format?: unknown;
  media?: unknown;
  platforms?: unknown;
  schedule?: { date?: unknown; time?: unknown } | null;
  qaStatus?: unknown;
  holdReason?: unknown;
  detectedText?: unknown;
  products?: unknown;
};

function hash(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedArchivePath(value: string) {
  const path = value.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!path || path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return path;
}

function contentTypeFromSignature(filename: string, bytes: Buffer): ParsedAsset["contentType"] {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  throw new Error(`${filename} is not a valid PNG, JPEG, or WEBP image.`);
}

function cleanString(value: unknown, label: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} exceeds ${max} characters.`);
  return result;
}

function normalizePlatforms(value: unknown, fallback: PublishPlatform[]) {
  const supported = new Set<PublishPlatform>(["facebook", "instagram", "tiktok"]);
  const values = Array.isArray(value) ? value : fallback;
  const platforms = [...new Set(values.filter((item): item is PublishPlatform => typeof item === "string" && supported.has(item as PublishPlatform)))];
  if (!platforms.length) throw new Error("Every post needs at least one supported platform.");
  return platforms;
}

function normalizeQa(value: unknown): QaStatus {
  return value === "ready_after_qa" || value === "hold" ? value : "ready";
}

function normalizePolicy(value: unknown): OverduePolicy {
  return value === "keep_draft" || value === "skip_expired" || value === "stagger_from_now"
    ? value
    : "roll_forward";
}

function scheduleDate(value: RawManifestPost["schedule"], timezone: string) {
  if (!value) return null;
  const date = cleanString(value.date, "Schedule date", 10, true);
  const time = cleanString(value.time, "Schedule time", 5, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Schedules must use YYYY-MM-DD and HH:mm.");
  }
  if (timezone !== NAIROBI_TIME_ZONE) {
    throw new Error(`Only ${NAIROBI_TIME_ZONE} packs are currently supported.`);
  }
  const parsed = new Date(`${date}T${time}:00+03:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("A scheduled date is invalid.");
  return parsed;
}

function phoneChecks(entryRef: string, value: string): ParsedCheck[] {
  const checks: ParsedCheck[] = [];
  const matches = value.match(/(?:\+?254|0)(?:[\s-]?\d){9}/g) ?? [];
  for (const match of matches) {
    const digits = match.replace(/\D/g, "").replace(/^0/, "254");
    if (digits !== "254113033475") {
      checks.push({
        entryRef,
        code: "wrong_chezahub_phone",
        severity: "error",
        message: `Poster text contains ${match}; ChezaHub must use +254 113 033 475.`,
      });
    }
  }
  return checks;
}

function productChecks(entryRef: string, products: unknown): ParsedCheck[] {
  if (!Array.isArray(products)) return [];
  const checks: ParsedCheck[] = [];
  for (const value of products) {
    if (!value || typeof value !== "object") continue;
    const product = value as Record<string, unknown>;
    const displayed = Number(product.displayedPrice);
    const catalogue = Number(product.cataloguePrice);
    if (Number.isFinite(displayed) && Number.isFinite(catalogue) && displayed !== catalogue) {
      checks.push({
        entryRef,
        code: "price_mismatch",
        severity: "error",
        message: `${cleanString(product.name, "Product name", 120) || "A product"} shows KSh ${displayed.toLocaleString("en-KE")} but the manifest catalogue value is KSh ${catalogue.toLocaleString("en-KE")}.`,
      });
    }
  }
  return checks;
}

function parseManifestPack(buffer: Buffer, archive: AdmZip, manifestEntry: AdmZip.IZipEntry): ParsedContentPack {
  const raw = JSON.parse(manifestEntry.getData().toString("utf8")) as RawManifest;
  const schemaVersion = cleanString(raw.schemaVersion, "Schema version", 20, true);
  if (schemaVersion !== CONTENT_PACK_SCHEMA_VERSION) {
    throw new Error(`Unsupported content-pack schema ${schemaVersion}.`);
  }
  const brand = raw.brand === "jengasites" ? "jengasites" : raw.brand === "chezahub" ? "chezahub" : null;
  if (!brand) throw new Error("Manifest brand must be chezahub or jengasites.");
  const timezone = cleanString(raw.timezone, "Timezone", 64) || NAIROBI_TIME_ZONE;
  const name = cleanString(raw.campaign?.name, "Campaign name", 160) || "Imported content pack";
  const sourceWeek = cleanString(raw.campaign?.sourceWeek, "Source week", 64) || null;
  const fallbackPlatforms = normalizePlatforms(raw.defaults?.platforms, ["facebook", "instagram"]);
  const defaultOverduePolicy = normalizePolicy(raw.defaults?.overduePolicy);
  if (!Array.isArray(raw.posts) || raw.posts.length < 1 || raw.posts.length > 70) {
    throw new Error("Manifest must contain between 1 and 70 posts.");
  }

  const entries = archive.getEntries().filter((entry) => !entry.isDirectory);
  const expanded = entries.reduce((total, entry) => total + Number(entry.header.size), 0);
  if (expanded > MAX_EXPANDED_BYTES) throw new Error("The ZIP expands beyond the 80 MB safety limit.");

  const assetEntries = entries.filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry.entryName));
  if (assetEntries.length > MAX_PACK_IMAGES) throw new Error("A content pack cannot contain more than 70 images.");
  const assets: ParsedAsset[] = [];
  const byPath = new Map<string, ParsedAsset>();
  const byBasename = new Map<string, ParsedAsset[]>();
  for (const entry of assetEntries) {
    const filename = normalizedArchivePath(entry.entryName);
    const bytes = entry.getData();
    if (bytes.length > 12 * 1024 * 1024) throw new Error(`${filename} exceeds the 12 MB image limit.`);
    const asset: ParsedAsset = {
      filename,
      bytes,
      contentType: contentTypeFromSignature(filename, bytes),
      sha256: hash(bytes),
      sizeBytes: bytes.length,
    };
    assets.push(asset);
    byPath.set(filename.toLowerCase(), asset);
    const basename = filename.split("/").pop()!.toLowerCase();
    byBasename.set(basename, [...(byBasename.get(basename) ?? []), asset]);
  }

  const checks: ParsedCheck[] = [];
  const duplicateHashes = new Map<string, string[]>();
  for (const asset of assets) duplicateHashes.set(asset.sha256, [...(duplicateHashes.get(asset.sha256) ?? []), asset.filename]);
  for (const filenames of duplicateHashes.values()) {
    if (filenames.length > 1) {
      checks.push({ entryRef: null, code: "duplicate_asset", severity: "warning", message: `Identical image bytes appear in: ${filenames.join(", ")}.` });
    }
  }

  const seenRefs = new Set<string>();
  const normalizedEntries: ParsedEntry[] = (raw.posts as RawManifestPost[]).map((post, index) => {
    const reference = cleanString(post.reference, `Post ${index + 1} reference`, 120, true);
    if (seenRefs.has(reference)) throw new Error(`Duplicate post reference: ${reference}`);
    seenRefs.add(reference);
    const title = cleanString(post.title, `Post ${index + 1} title`, 120, true);
    const caption = cleanString(post.caption, `Post ${index + 1} caption`, 2200);
    if (!Array.isArray(post.media) || post.media.length < 1 || post.media.length > MAX_POST_MEDIA) {
      throw new Error(`${reference} must contain between 1 and 10 media files.`);
    }
    const media = post.media.map((value) => normalizedArchivePath(cleanString(value, `${reference} media`, 240, true)));
    for (const filename of media) {
      const exact = byPath.get(filename.toLowerCase());
      const basenameMatches = byBasename.get(filename.split("/").pop()!.toLowerCase()) ?? [];
      if (!exact && basenameMatches.length !== 1) throw new Error(`${reference} is missing ${filename}.`);
    }
    const format = post.format === "carousel" || media.length > 1 ? "carousel" : "single";
    if (format === "carousel" && media.length < 2) throw new Error(`${reference} carousel needs at least two slides.`);
    if (format === "single" && media.length !== 1) throw new Error(`${reference} independent post must have one image.`);
    const qaStatus = normalizeQa(post.qaStatus);
    const holdReason = cleanString(post.holdReason, `${reference} hold reason`, 500) || null;
    if (qaStatus === "hold") checks.push({ entryRef: reference, code: "qa_hold", severity: "error", message: holdReason || "This post is on QA hold." });
    if (qaStatus === "ready_after_qa") checks.push({ entryRef: reference, code: "qa_confirmation_required", severity: "warning", message: holdReason || "Confirm artwork QA before approval." });
    const detectedText = cleanString(post.detectedText, `${reference} detected text`, 5000);
    if (brand === "chezahub") checks.push(...phoneChecks(reference, `${title}\n${caption}\n${detectedText}`));
    checks.push(...productChecks(reference, post.products));
    const scheduledAt = scheduleDate(post.schedule, timezone);
    const platforms = normalizePlatforms(post.platforms, fallbackPlatforms);
    const contentHash = hash(JSON.stringify({ title, caption, media: media.map((name) => (byPath.get(name.toLowerCase()) ?? byBasename.get(name.split("/").pop()!.toLowerCase())?.[0])?.sha256), platforms }));
    return { reference, title, caption, format, media, platforms, scheduledAt, qaStatus, holdReason, contentHash };
  });

  return { packHash: hash(buffer), schemaVersion, name, brand, timezone, sourceWeek, defaultOverduePolicy, assets, entries: normalizedEntries, checks };
}

function parseLegacyPack(buffer: Buffer): ParsedContentPack {
  const posts = parseWeek1Zip(buffer);
  const assetsByHash = new Map<string, ParsedAsset>();
  for (const media of posts.flatMap((post) => post.media)) {
    const sha256 = hash(media.bytes);
    if (!assetsByHash.has(sha256)) {
      assetsByHash.set(sha256, { filename: media.filename, bytes: media.bytes, contentType: media.contentType, sha256, sizeBytes: media.bytes.length });
    }
  }
  const checks: ParsedCheck[] = [];
  const entries = posts.map((post) => {
    if (post.qaStatus === "hold") checks.push({ entryRef: post.sourceRef, code: "qa_hold", severity: "error", message: post.holdReason || "This post is on QA hold." });
    if (post.qaStatus === "ready_after_qa") checks.push({ entryRef: post.sourceRef, code: "qa_confirmation_required", severity: "warning", message: post.holdReason || "Confirm artwork QA before approval." });
    checks.push(...phoneChecks(post.sourceRef, `${post.title}\n${post.caption}`));
    return {
      reference: post.sourceRef,
      title: post.title,
      caption: post.caption,
      format: post.format,
      media: post.media.map((item) => item.filename),
      platforms: ["facebook", "instagram"] as PublishPlatform[],
      scheduledAt: post.scheduledAt,
      qaStatus: post.qaStatus,
      holdReason: post.holdReason,
      contentHash: hash(JSON.stringify({ title: post.title, caption: post.caption, media: post.media.map((item) => hash(item.bytes)) })),
    };
  });
  return {
    packHash: hash(buffer),
    schemaVersion: "legacy-week1",
    name: `${posts[0]?.day ?? "Week 1"} content pack`,
    brand: "chezahub",
    timezone: NAIROBI_TIME_ZONE,
    sourceWeek: posts[0]?.sourceWeek ?? null,
    defaultOverduePolicy: "roll_forward",
    assets: [...assetsByHash.values()],
    entries,
    checks,
  };
}

export function parseContentPack(buffer: Buffer): ParsedContentPack {
  if (buffer.length > MAX_PACK_BYTES) throw new Error("Content packs cannot exceed 25 MB.");
  const archive = new AdmZip(buffer);
  const entries = archive.getEntries().filter((entry) => !entry.isDirectory);
  for (const entry of entries) normalizedArchivePath(entry.entryName);
  const manifest = entries.find((entry) => entry.entryName.replace(/\\/g, "/").toLowerCase().endsWith("manifest.json"));
  return manifest ? parseManifestPack(buffer, archive, manifest) : parseLegacyPack(buffer);
}

export function applyOverduePolicy(
  values: Array<Date | null>,
  policy: OverduePolicy,
  now = new Date(),
  staggerMinutes = 120,
) {
  const floor = now.getTime() + 60_000;
  let next = floor;
  return values.map((value) => {
    if (!value) return null;
    if (value.getTime() > floor) return value;
    if (policy === "keep_draft" || policy === "skip_expired") return null;
    const scheduled = new Date(next);
    next += Math.max(15, staggerMinutes) * 60_000;
    return scheduled;
  });
}
