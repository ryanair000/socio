import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import type { Brand, Platform, PostFormat, PostStatus } from "@/lib/types";

const MAX_CAPTION_LENGTH = 2_200;
const MAX_MEDIA_ITEMS = 10;

export type SmmproSyncResult = {
  platform: Platform;
  status: "Success" | string;
  providerPostId: string | null;
};

export type SmmproSyncEvent = {
  eventId: string;
  accountId: Brand;
  caption: string;
  mode: PostFormat;
  imageUrls: string[];
  scheduledAt: string | null;
  publishedAt: string;
  source: "composer" | "telegram";
  results: SmmproSyncResult[];
};

export type MirroredMedia = {
  imageUrl: string;
  imagePathname: string;
};

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  const result = value.trim();
  if (result.length > maxLength) throw new Error(`${field} is too long.`);
  return result;
}

function parseInstant(value: unknown, field: string, nullable = false) {
  if (nullable && (value === null || value === undefined || value === "")) {
    return null;
  }
  const date = new Date(requiredString(value, field, 100));
  if (!Number.isFinite(date.getTime())) throw new Error(`${field} is invalid.`);
  return date.toISOString();
}

function parseImageUrls(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_MEDIA_ITEMS) {
    throw new Error(`imageUrls must contain at most ${MAX_MEDIA_ITEMS} items.`);
  }
  return value.map((item) => {
    const url = requiredString(item, "imageUrl", 2_048);
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("imageUrl must use HTTP or HTTPS.");
    }
    return parsed.toString();
  });
}

export function parseSmmproSyncEvent(value: unknown): SmmproSyncEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A sync event is required.");
  }
  const data = value as Record<string, unknown>;
  const accountId = data.accountId;
  const mode = data.mode;
  const source = data.source;
  if (accountId !== "chezahub" && accountId !== "jengasites") {
    throw new Error("accountId is invalid.");
  }
  if (mode !== "single" && mode !== "carousel" && mode !== "story") {
    throw new Error("mode is invalid.");
  }
  if (source !== "composer" && source !== "telegram") {
    throw new Error("source is invalid.");
  }
  if (
    !Array.isArray(data.results) ||
    data.results.length < 1 ||
    data.results.length > 2
  ) {
    throw new Error("results must contain one or two platform results.");
  }
  const platforms = new Set<Platform>();
  const results = data.results.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("A platform result is invalid.");
    }
    const result = item as Record<string, unknown>;
    const platform = result.platform;
    if (platform !== "facebook" && platform !== "instagram") {
      throw new Error("A result platform is invalid.");
    }
    const typedPlatform = platform as Platform;
    if (platforms.has(typedPlatform))
      throw new Error("Result platforms must be unique.");
    platforms.add(typedPlatform);
    return {
      platform: typedPlatform,
      status: requiredString(result.status, "result status", 1_000),
      providerPostId:
        result.providerPostId === null || result.providerPostId === undefined
          ? null
          : requiredString(result.providerPostId, "providerPostId", 300),
    };
  });
  if (!results.some((result) => result.status === "Success")) {
    throw new Error("At least one platform must have published successfully.");
  }

  return {
    eventId: requiredString(data.eventId, "eventId", 200),
    accountId,
    caption:
      typeof data.caption === "string"
        ? data.caption.trim().slice(0, MAX_CAPTION_LENGTH)
        : "",
    mode,
    imageUrls: parseImageUrls(data.imageUrls ?? []),
    scheduledAt: parseInstant(data.scheduledAt, "scheduledAt", true),
    publishedAt: parseInstant(data.publishedAt, "publishedAt")!,
    source,
    results,
  };
}

export function validSyncSecret(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function postTitle(event: SmmproSyncEvent) {
  const firstLine = event.caption
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim();
  return (
    firstLine ||
    `${event.accountId === "chezahub" ? "ChezaHub" : "JengaSites"} post`
  ).slice(0, 120);
}

export async function hasSmmproEvent(eventId: string) {
  const sourceRef = `smmpro:${eventId}`;
  const rows =
    await getSql()`SELECT id FROM posts WHERE source_ref = ${sourceRef} LIMIT 1`;
  return rows[0] ? String(rows[0].id) : null;
}

export async function createSmmproCalendarPost(
  event: SmmproSyncEvent,
  media: MirroredMedia[],
) {
  const sql = getSql();
  const id = randomUUID();
  const sourceRef = `smmpro:${event.eventId}`;
  const failed = event.results.filter((result) => result.status !== "Success");
  const status: PostStatus = failed.length
    ? "partially_published"
    : "published";
  const calendarAt = event.scheduledAt ?? event.publishedAt;
  const fallback = { imageUrl: "/smmpro-placeholder.svg", imagePathname: "" };
  const postMedia = media.length ? media : [fallback];
  try {
    await sql.transaction([
      sql`INSERT INTO posts (
          id, title, caption, brand, image_url, image_pathname, post_format, status,
          scheduled_at, schedule_version, qa_status, source_week, source_ref,
          approved_at, published_at
        ) VALUES (
          ${id}, ${postTitle(event)}, ${event.caption}, ${event.accountId},
          ${postMedia[0].imageUrl}, ${postMedia[0].imagePathname}, ${event.mode}, ${status},
          ${calendarAt}, 0, 'ready', 'SMMPro', ${sourceRef}, ${event.publishedAt}, ${event.publishedAt}
        )`,
      ...postMedia.map(
        (
          item,
          position,
        ) => sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
          VALUES (${id}, ${position}, ${item.imageUrl}, ${item.imagePathname})`,
      ),
      ...event.results.map((result) => {
        const targetStatus =
          result.status === "Success" ? "published" : "failed";
        const lastError =
          result.status === "Success"
            ? null
            : result.status.replace(/^Failed:\s*/i, "");
        return sql`INSERT INTO post_targets (
            post_id, platform, status, provider_post_id, last_error, attempts,
            idempotency_key, published_at
          ) VALUES (
            ${id}, ${result.platform}, ${targetStatus}, ${result.providerPostId}, ${lastError}, 1,
            ${`${id}:${result.platform}`},
            ${result.status === "Success" ? event.publishedAt : null}
          )`;
      }),
    ]);
    return { id, created: true };
  } catch (error) {
    const existingId = await hasSmmproEvent(event.eventId);
    if (existingId) return { id: existingId, created: false };
    throw error;
  }
}
