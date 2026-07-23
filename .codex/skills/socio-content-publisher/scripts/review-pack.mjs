#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const MAX_PACK_BYTES = 25 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const VALID_PLATFORMS = new Set(["facebook", "instagram", "tiktok"]);
const VALID_QA = new Set(["ready", "ready_after_qa", "hold"]);
const VALID_POLICIES = new Set([
  "keep_draft",
  "roll_forward",
  "skip_expired",
  "stagger_from_now",
]);
const CHEZAHUB_PHONE = "254113033475";
const CHEZAHUB_PHONE_DISPLAY = "+254 113 033 475";
const CHEZAHUB_WEBSITE = "chezahub.co.ke";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeArchivePath(value) {
  const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe archive path: ${value}`);
  }
  return normalized;
}

function imageType(bytes, filename) {
  if (
    bytes.length >= 8 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  throw new Error(`${filename} is not a valid PNG, JPEG, or WEBP image.`);
}

function addCheck(checks, severity, code, message, reference = null) {
  checks.push({ severity, code, message, reference });
}

function validSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return false;
  const date = String(schedule.date ?? "");
  const time = String(schedule.time ?? "");
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return false;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  if (hour > 23 || minute > 59) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function brandChecks(checks, reference, text) {
  const phoneMatches = text.match(/(?:\+?254|0)(?:[\s-]?\d){9}/g) ?? [];
  for (const match of phoneMatches) {
    const digits = match.replace(/\D/g, "").replace(/^0/, "254");
    if (digits !== CHEZAHUB_PHONE) {
      addCheck(
        checks,
        "error",
        "wrong_chezahub_phone",
        `Found ${match}; ChezaHub must use ${CHEZAHUB_PHONE_DISPLAY}.`,
        reference,
      );
    }
  }
  const websiteMatches = text.match(/\b(?:www\.)?chezahub\.[a-z.]+\b/gi) ?? [];
  for (const match of websiteMatches) {
    if (match.toLowerCase().replace(/^www\./, "") !== CHEZAHUB_WEBSITE) {
      addCheck(
        checks,
        "error",
        "wrong_chezahub_website",
        `Found ${match}; ChezaHub must use ${CHEZAHUB_WEBSITE}.`,
        reference,
      );
    }
  }
}

function priceChecks(checks, reference, products) {
  if (!Array.isArray(products)) return;
  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    const displayed = Number(product.displayedPrice);
    const catalogue = Number(product.cataloguePrice);
    if (
      Number.isFinite(displayed) &&
      Number.isFinite(catalogue) &&
      displayed !== catalogue
    ) {
      const name = String(product.name || "Product");
      addCheck(
        checks,
        "error",
        "price_mismatch",
        `${name} displays KSh ${displayed.toLocaleString("en-KE")} but the catalogue value is KSh ${catalogue.toLocaleString("en-KE")}.`,
        reference,
      );
    }
  }
}

function entryState(checks, reference) {
  const entryChecks = checks.filter((check) => check.reference === reference);
  if (entryChecks.some((check) => check.severity === "error")) return "blocked";
  if (entryChecks.some((check) => check.severity === "warning"))
    return "warning";
  return "ready";
}

export function reviewPackBuffer(buffer, sourceName = "content-pack.zip") {
  if (buffer.length > MAX_PACK_BYTES)
    throw new Error("The ZIP exceeds the 25 MB compressed limit.");
  const archive = new AdmZip(buffer);
  const archiveEntries = archive
    .getEntries()
    .filter((entry) => !entry.isDirectory);
  for (const entry of archiveEntries) {
    const filename = safeArchivePath(entry.entryName);
    if (Number(entry.header.flags) & 1) {
      throw new Error(`Encrypted archive entry is not allowed: ${filename}`);
    }
    if (/\.(?:zip|7z|rar|exe|com|bat|cmd|msi|ps1|scr)$/i.test(filename)) {
      throw new Error(`Unexpected nested archive or executable: ${filename}`);
    }
  }
  const expandedBytes = archiveEntries.reduce(
    (sum, entry) => sum + Number(entry.header.size),
    0,
  );
  if (expandedBytes > MAX_EXPANDED_BYTES)
    throw new Error("The ZIP exceeds the 80 MB expanded limit.");

  const manifestEntries = archiveEntries.filter(
    (entry) =>
      safeArchivePath(entry.entryName).toLowerCase() === "manifest.json",
  );
  if (manifestEntries.length !== 1) {
    throw new Error(
      "The canonical ZIP must contain exactly one manifest.json at its root.",
    );
  }
  const manifest = JSON.parse(manifestEntries[0].getData().toString("utf8"));
  if (manifest.schemaVersion !== "1.0")
    throw new Error("schemaVersion must be 1.0.");
  if (!["chezahub", "jengasites"].includes(manifest.brand)) {
    throw new Error("brand must be chezahub or jengasites.");
  }
  if (manifest.timezone !== "Africa/Nairobi")
    throw new Error("timezone must be Africa/Nairobi.");
  if (!manifest.campaign?.name || String(manifest.campaign.name).length > 160) {
    throw new Error(
      "campaign.name is required and must be at most 160 characters.",
    );
  }
  if (
    !Array.isArray(manifest.posts) ||
    manifest.posts.length < 1 ||
    manifest.posts.length > 70
  ) {
    throw new Error("posts must contain 1-70 entries.");
  }
  if (
    manifest.defaults?.overduePolicy &&
    !VALID_POLICIES.has(manifest.defaults.overduePolicy)
  ) {
    throw new Error("defaults.overduePolicy is invalid.");
  }

  const checks = [];
  const assetByPath = new Map();
  const hashes = new Map();
  for (const entry of archiveEntries) {
    const filename = safeArchivePath(entry.entryName);
    if (filename.toLowerCase() === "manifest.json") continue;
    if (!/\.(png|jpe?g|webp)$/i.test(filename)) {
      addCheck(
        checks,
        "info",
        "unused_non_image_file",
        `${filename} is not imported by Socio.`,
      );
      continue;
    }
    const bytes = entry.getData();
    if (bytes.length > MAX_IMAGE_BYTES)
      throw new Error(`${filename} exceeds 12 MB.`);
    imageType(bytes, filename);
    const normalized = filename.toLowerCase();
    if (assetByPath.has(normalized))
      throw new Error(`Duplicate archive path: ${filename}`);
    assetByPath.set(normalized, { filename, bytes });
    const digest = sha256(bytes);
    hashes.set(digest, [...(hashes.get(digest) ?? []), filename]);
  }
  if (assetByPath.size > 70)
    throw new Error("The ZIP contains more than 70 images.");
  for (const filenames of hashes.values()) {
    if (filenames.length > 1) {
      addCheck(
        checks,
        "warning",
        "duplicate_asset",
        `Identical image bytes appear in ${filenames.join(", ")}.`,
      );
    }
  }

  const references = new Set();
  const referencedAssets = new Set();
  const posts = manifest.posts.map((post, index) => {
    const reference = String(post.reference ?? "").trim();
    if (!reference || reference.length > 120) {
      throw new Error(
        `Post ${index + 1} needs a reference of at most 120 characters.`,
      );
    }
    if (references.has(reference))
      throw new Error(`Duplicate post reference: ${reference}`);
    references.add(reference);
    const title = String(post.title ?? "").trim();
    const caption = String(post.caption ?? "").trim();
    if (!title || title.length > 120)
      throw new Error(`${reference} needs a title of at most 120 characters.`);
    if (caption.length > 2200)
      throw new Error(`${reference} caption exceeds 2,200 characters.`);
    if (!caption && post.format !== "story")
      addCheck(
        checks,
        "warning",
        "missing_caption",
        "Caption is empty.",
        reference,
      );
    if (
      !Array.isArray(post.media) ||
      post.media.length < 1 ||
      post.media.length > 10
    ) {
      throw new Error(`${reference} needs 1-10 media files.`);
    }
    const media = post.media.map((value) => safeArchivePath(value));
    for (const filename of media) {
      if (!assetByPath.has(filename.toLowerCase()))
        throw new Error(`${reference} is missing ${filename}.`);
      referencedAssets.add(filename.toLowerCase());
    }
    if (
      post.format !== undefined &&
      !["single", "carousel", "story"].includes(post.format)
    ) {
      throw new Error(`${reference} has an unsupported format.`);
    }
    const format =
      post.format === "story"
        ? "story"
        : post.format === "carousel" || media.length > 1
          ? "carousel"
          : "single";
    if (format === "carousel" && media.length < 2) {
      throw new Error(
        `${reference} carousel needs at least two ordered slides.`,
      );
    }
    if (format === "story" && media.length !== 1) {
      throw new Error(`${reference} Instagram Story needs exactly one image.`);
    }
    const platforms = Array.isArray(post.platforms)
      ? post.platforms
      : manifest.defaults?.platforms;
    if (
      !Array.isArray(platforms) ||
      platforms.length < 1 ||
      platforms.some((platform) => !VALID_PLATFORMS.has(platform))
    ) {
      throw new Error(`${reference} needs at least one supported platform.`);
    }
    if (
      format === "story" &&
      (platforms.length !== 1 || platforms[0] !== "instagram")
    ) {
      throw new Error(
        `${reference} Instagram Story must target Instagram only.`,
      );
    }
    const qaStatus = post.qaStatus ?? "ready";
    if (!VALID_QA.has(qaStatus))
      throw new Error(`${reference} has an invalid qaStatus.`);
    if (qaStatus === "hold") {
      addCheck(
        checks,
        "error",
        "qa_hold",
        String(post.holdReason || "This post is on QA hold."),
        reference,
      );
    } else if (qaStatus === "ready_after_qa") {
      addCheck(
        checks,
        "warning",
        "qa_confirmation_required",
        String(post.holdReason || "Artwork QA must be explicitly confirmed."),
        reference,
      );
    }
    if (post.schedule == null) {
      addCheck(
        checks,
        "warning",
        "missing_schedule",
        "No EAT date/time is assigned.",
        reference,
      );
    } else if (!validSchedule(post.schedule)) {
      throw new Error(
        `${reference} has an invalid schedule; use YYYY-MM-DD and HH:mm.`,
      );
    }
    if (manifest.brand === "chezahub") {
      brandChecks(
        checks,
        reference,
        `${title}\n${caption}\n${String(post.detectedText ?? "")}`,
      );
    }
    priceChecks(checks, reference, post.products);
    return {
      reference,
      title,
      caption,
      format,
      media,
      platforms: [...new Set(platforms)],
      schedule: post.schedule ?? null,
      qaStatus,
    };
  });

  for (const [normalized, asset] of assetByPath) {
    if (!referencedAssets.has(normalized)) {
      addCheck(
        checks,
        "warning",
        "unreferenced_image",
        `${asset.filename} is not assigned to a post.`,
      );
    }
  }

  const reviewedPosts = posts.map((post) => ({
    ...post,
    reviewState: entryState(checks, post.reference),
  }));
  const counts = {
    posts: posts.length,
    slides: posts.reduce((sum, post) => sum + post.media.length, 0),
    ready: reviewedPosts.filter((post) => post.reviewState === "ready").length,
    warning: reviewedPosts.filter((post) => post.reviewState === "warning")
      .length,
    blocked: reviewedPosts.filter((post) => post.reviewState === "blocked")
      .length,
  };
  return {
    sourceName,
    packHash: sha256(buffer),
    compressedBytes: buffer.length,
    expandedBytes,
    campaign: String(manifest.campaign.name),
    sourceWeek: manifest.campaign.sourceWeek ?? null,
    brand: manifest.brand,
    timezone: manifest.timezone,
    overduePolicy: manifest.defaults?.overduePolicy ?? "roll_forward",
    counts,
    posts: reviewedPosts,
    checks,
    canStage: counts.blocked === 0,
  };
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

export function reviewAsMarkdown(review) {
  const lines = [
    `# Socio pack review: ${review.campaign}`,
    "",
    `- Pack: \`${review.sourceName}\``,
    `- SHA-256: \`${review.packHash}\``,
    `- Brand: ${review.brand}`,
    `- Time zone: ${review.timezone}`,
    `- Posts/slides: ${review.counts.posts}/${review.counts.slides}`,
    `- Ready/warning/blocked: ${review.counts.ready}/${review.counts.warning}/${review.counts.blocked}`,
    `- Safe to stage: ${review.canStage ? "yes" : "no"}`,
    "",
    "| State | Reference | Format | Slides | Platforms | EAT schedule | Title |",
    "| --- | --- | --- | ---: | --- | --- | --- |",
  ];
  for (const post of review.posts) {
    const schedule = post.schedule
      ? `${post.schedule.date} ${post.schedule.time}`
      : "Draft only";
    lines.push(
      `| ${post.reviewState} | ${escapeCell(post.reference)} | ${post.format} | ${post.media.length} | ${post.platforms.join(", ")} | ${schedule} | ${escapeCell(post.title)} |`,
    );
  }
  lines.push("", "## Checks", "");
  if (!review.checks.length) {
    lines.push("No automated checks were raised.");
  } else {
    for (const check of review.checks) {
      lines.push(
        `- **${check.severity.toUpperCase()} · ${check.code}**${check.reference ? ` (${check.reference})` : ""}: ${check.message}`,
      );
    }
  }
  lines.push(
    "",
    review.canStage
      ? "Automated preflight passed. Codex must still visually inspect every poster before staging."
      : "Do not stage this pack until every hard blocker is resolved.",
    "",
  );
  return lines.join("\n");
}

async function main() {
  const [zipArg, ...options] = process.argv.slice(2);
  if (!zipArg) {
    console.error(
      "Usage: node review-pack.mjs <pack.zip> [--json <report.json>] [--markdown <report.md>]",
    );
    process.exitCode = 1;
    return;
  }
  const zipPath = path.resolve(zipArg);
  const review = reviewPackBuffer(
    fs.readFileSync(zipPath),
    path.basename(zipPath),
  );
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const output = options[index + 1];
    if ((option === "--json" || option === "--markdown") && !output) {
      throw new Error(`${option} requires an output path.`);
    }
    if (option === "--json") {
      fs.writeFileSync(
        path.resolve(output),
        `${JSON.stringify(review, null, 2)}\n`,
      );
      index += 1;
    } else if (option === "--markdown") {
      fs.writeFileSync(path.resolve(output), reviewAsMarkdown(review));
      index += 1;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  console.log(reviewAsMarkdown(review));
  if (!review.canStage) process.exitCode = 2;
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
