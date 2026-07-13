import AdmZip from "adm-zip";
import type { PostFormat, QaStatus } from "@/lib/types";

const WEEK_DATES: Record<string, string> = {
  monday: "2026-07-13",
  tuesday: "2026-07-14",
  wednesday: "2026-07-15",
  thursday: "2026-07-16",
  friday: "2026-07-17",
  saturday: "2026-07-18",
  sunday: "2026-07-19",
};

export type ImportedMedia = {
  filename: string;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Buffer;
};

export type Week1ImportPost = {
  title: string;
  caption: string;
  day: string;
  time: string;
  scheduledAt: Date;
  qaStatus: QaStatus;
  holdReason: string | null;
  sourceWeek: string;
  sourceRef: string;
  format: PostFormat;
  media: ImportedMedia[];
};

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Unsupported schedule time: ${value}`);
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function qaDetails(statusLine: string) {
  const normalized = statusLine.trim();
  if (/^HOLD\b/i.test(normalized)) {
    return {
      qaStatus: "hold" as const,
      holdReason:
        normalized.replace(/^HOLD\s*[—-]?\s*/i, "") || "Held by content QA.",
    };
  }
  if (/^READY AFTER QA\b/i.test(normalized)) {
    return {
      qaStatus: "ready_after_qa" as const,
      holdReason:
        normalized.replace(/^READY AFTER QA\s*[—-]?\s*/i, "") ||
        "Complete the listed QA correction before approval.",
    };
  }
  return { qaStatus: "ready" as const, holdReason: null };
}

function contentType(filename: string): ImportedMedia["contentType"] {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  throw new Error(`Unsupported image in import: ${filename}`);
}

export function parseWeek1Zip(buffer: Buffer): Week1ImportPost[] {
  const archive = new AdmZip(buffer);
  const entries = archive.getEntries().filter((entry) => !entry.isDirectory);
  const uncompressedBytes = entries.reduce(
    (total, entry) => total + Number(entry.header.size),
    0,
  );
  if (uncompressedBytes > 80 * 1024 * 1024)
    throw new Error("The ZIP expands beyond the 80 MB safety limit.");

  const markdownEntry = entries.find((entry) =>
    /_Captions_and_Schedule\.md$/i.test(entry.entryName),
  );
  if (!markdownEntry)
    throw new Error("The day caption and schedule document is missing.");

  const dayMatch = markdownEntry.entryName.match(
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)_Captions/i,
  );
  const day = dayMatch?.[1];
  if (!day) throw new Error("Could not determine the Week 1 day from the ZIP.");
  const date = WEEK_DATES[day.toLowerCase()];
  const markdown = markdownEntry.getData().toString("utf8");

  const imageEntries = new Map(
    entries
      .filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry.entryName))
      .map((entry) => [
        entry.entryName.split(/[\\/]/).pop()!.toLowerCase(),
        entry,
      ]),
  );
  if (imageEntries.size !== 10)
    throw new Error(`Expected 10 final posters; found ${imageEntries.size}.`);

  const posts: Week1ImportPost[] = [];
  const sectionPattern =
    /^###\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s+—\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^###\s+|(?![\s\S]))/gim;
  for (const match of markdown.matchAll(sectionPattern)) {
    const time = parseTime(match[1]);
    const body = match[3];
    const mediaLine = body.match(/\*\*Slides?:\*\*\s*([^\r\n]+)/i)?.[1] ?? "";
    const filenames = [...mediaLine.matchAll(/`([^`]+)`/g)].map(
      (value) => value[1],
    );
    if (!filenames.length)
      throw new Error(`No poster is listed for ${day} ${time}.`);
    const media = filenames.map((filename) => {
      const entry = imageEntries.get(filename.toLowerCase());
      if (!entry) throw new Error(`The ZIP is missing ${filename}.`);
      if (Number(entry.header.size) > 12 * 1024 * 1024)
        throw new Error(`${filename} exceeds the 12 MB image limit.`);
      return {
        filename,
        contentType: contentType(filename),
        bytes: entry.getData(),
      };
    });
    const statusLine =
      body.match(/\*\*Status:\*\*\s*([^\r\n]+)/i)?.[1] ??
      "HOLD — Missing QA status.";
    const qa = qaDetails(statusLine);
    const caption =
      body.match(/\*\*Caption\*\*\s*\r?\n([\s\S]*)/i)?.[1].trim() ?? "";
    const title = match[2]
      .replace(/\s+—\s+PAST DUE.*$/i, "")
      .trim()
      .slice(0, 120);
    posts.push({
      title,
      caption,
      day,
      time,
      scheduledAt: new Date(`${date}T${time}:00+03:00`),
      qaStatus: qa.qaStatus,
      holdReason: qa.holdReason,
      sourceWeek: "2026-07-13/2026-07-19",
      sourceRef: `week1:${day.toLowerCase()}:${time.replace(":", "")}`,
      format: media.length > 1 ? "carousel" : "single",
      media,
    });
  }

  if (posts.length !== 5)
    throw new Error(`Expected 5 publishing slots; found ${posts.length}.`);
  return posts;
}
