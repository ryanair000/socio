import {
  BRANDS,
  PLATFORMS,
  POST_FORMATS,
  QA_STATUSES,
  type Brand,
  type PostFormat,
  type PublishPlatform,
  type QaStatus,
} from "@/lib/types";

export function isBrand(value: unknown): value is Brand {
  return typeof value === "string" && BRANDS.includes(value as Brand);
}

export function isPlatform(value: unknown): value is PublishPlatform {
  return (
    typeof value === "string" &&
    PLATFORMS.includes(value as PublishPlatform)
  );
}

export function isPostFormat(value: unknown): value is PostFormat {
  return (
    typeof value === "string" && POST_FORMATS.includes(value as PostFormat)
  );
}

export function isQaStatus(value: unknown): value is QaStatus {
  return typeof value === "string" && QA_STATUSES.includes(value as QaStatus);
}

export function normalizePlatforms(value: unknown): PublishPlatform[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPlatform))];
}

export function parseSchedule(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("Scheduled time is invalid.");
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Scheduled time is invalid.");
  return date;
}

function validateImageUrl(value: unknown) {
  const imageUrl = typeof value === "string" ? value.trim() : "";
  try {
    const parsed = new URL(imageUrl);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".public.blob.vercel-storage.com")
    ) {
      throw new Error();
    }
  } catch {
    throw new Error("A Socio Vercel Blob image URL is required.");
  }
  return imageUrl;
}

function normalizeMedia(data: Record<string, unknown>) {
  const rawMedia = Array.isArray(data.media)
    ? data.media
    : [
        {
          imageUrl: data.imageUrl,
          imagePathname: data.imagePathname,
        },
      ];
  if (rawMedia.length < 1 || rawMedia.length > 10) {
    throw new Error("Add between 1 and 10 images.");
  }
  return rawMedia.map((value, position) => {
    if (!value || typeof value !== "object") {
      throw new Error("Each post image is invalid.");
    }
    const item = value as Record<string, unknown>;
    const imagePathname =
      typeof item.imagePathname === "string" ? item.imagePathname.trim() : "";
    if (!imagePathname) throw new Error("Uploaded image pathname is required.");
    return {
      imageUrl: validateImageUrl(item.imageUrl),
      imagePathname,
      position,
    };
  });
}

export function validatePostInput(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Post details are required.");
  const data = input as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const brand = data.brand;
  const platforms = normalizePlatforms(data.platforms);
  const scheduledAt = parseSchedule(data.scheduledAt);
  const qaStatus = isQaStatus(data.qaStatus) ? data.qaStatus : null;
  const holdReason =
    typeof data.holdReason === "string" ? data.holdReason.trim() : null;
  const sourceWeek =
    typeof data.sourceWeek === "string" ? data.sourceWeek.trim() : null;
  if (data.qaStatus !== undefined && data.qaStatus !== null && !qaStatus)
    throw new Error("Choose a valid QA status.");
  if (holdReason && holdReason.length > 500)
    throw new Error("QA hold reasons cannot exceed 500 characters.");
  if (sourceWeek && sourceWeek.length > 64)
    throw new Error("Source week cannot exceed 64 characters.");
  const media = normalizeMedia(data);
  const format = isPostFormat(data.format)
    ? data.format
    : media.length > 1
      ? "carousel"
      : "single";

  if (!title || title.length > 120)
    throw new Error("Title must be between 1 and 120 characters.");
  if (caption.length > 2200)
    throw new Error("Caption cannot exceed 2,200 characters.");
  if (!isBrand(brand)) throw new Error("Choose a valid brand.");
  if (!platforms.length) throw new Error("Choose at least one platform.");
  if (platforms.includes("tiktok") && brand !== "chezahub") {
    throw new Error("TikTok publishing is currently available for ChezaHub only.");
  }
  if (format === "carousel" && media.length < 2)
    throw new Error("A carousel needs at least two slides.");
  if (format === "single" && media.length !== 1)
    throw new Error("An independent post must contain one image.");
  return {
    title,
    caption,
    brand,
    format,
    platforms,
    imageUrl: media[0].imageUrl,
    imagePathname: media[0].imagePathname,
    media,
    scheduledAt,
    qaStatus,
    holdReason,
    sourceWeek,
  };
}
