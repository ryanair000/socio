import { BRANDS, PLATFORMS, type Brand, type Platform } from "@/lib/types";

export function isBrand(value: unknown): value is Brand {
  return typeof value === "string" && BRANDS.includes(value as Brand);
}

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && PLATFORMS.includes(value as Platform);
}

export function normalizePlatforms(value: unknown): Platform[] {
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

export function validatePostInput(input: unknown) {
  if (!input || typeof input !== "object")
    throw new Error("Post details are required.");
  const data = input as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const imageUrl =
    typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";
  const imagePathname =
    typeof data.imagePathname === "string" ? data.imagePathname.trim() : "";
  const brand = data.brand;
  const platforms = normalizePlatforms(data.platforms);
  const scheduledAt = parseSchedule(data.scheduledAt);

  if (!title || title.length > 120)
    throw new Error("Title must be between 1 and 120 characters.");
  if (caption.length > 2200)
    throw new Error("Caption cannot exceed 2,200 characters.");
  if (!isBrand(brand)) throw new Error("Choose a valid brand.");
  if (!platforms.length) throw new Error("Choose at least one platform.");
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
  if (!imagePathname) throw new Error("Uploaded image pathname is required.");

  return {
    title,
    caption,
    brand,
    platforms,
    imageUrl,
    imagePathname,
    scheduledAt,
  };
}
