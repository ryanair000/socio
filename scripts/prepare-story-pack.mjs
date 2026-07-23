import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [sourceArg, startDateArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !startDateArg || !outputArg) {
  throw new Error(
    "Usage: node scripts/prepare-story-pack.mjs <extracted-story-pack> <monday-YYYY-MM-DD> <new-output-directory>",
  );
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateArg)) {
  throw new Error("The campaign start date must use YYYY-MM-DD.");
}

const source = path.resolve(sourceArg);
const output = path.resolve(outputArg);
if (!fs.statSync(source).isDirectory()) {
  throw new Error("The extracted Story pack directory was not found.");
}
if (fs.existsSync(output)) {
  throw new Error("The output directory already exists.");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((item) => item.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [rawHeaders, ...records] = rows;
  const headers = rawHeaders.map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
  );
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const schedulePath = path.join(
  source,
  "06_Schedule_and_Guides",
  "ChezaHub_Full_7_Day_Story_Schedule.csv",
);
const ready = parseCsv(fs.readFileSync(schedulePath, "utf8")).filter((row) =>
  row.Status.startsWith("Ready"),
);
if (!ready.length) throw new Error("The schedule contains no ready Story images.");

fs.mkdirSync(output, { recursive: false });
const builder = path.resolve(
  ".codex/skills/socio-content-publisher/scripts/build-pack.mjs",
);
const results = [];
for (const day of [...new Set(ready.map((row) => Number(row.Day)))]) {
  const rows = ready.filter((row) => Number(row.Day) === day);
  const work = path.join(output, `day-${String(day).padStart(2, "0")}`);
  fs.mkdirSync(work);
  const posts = rows.map((row) => {
    const filename = row["Image Filename"];
    const folder = row["Image Folder"];
    const relativeMedia = `stories/${filename}`;
    const sourceImage = path.resolve(source, folder, filename);
    if (!sourceImage.startsWith(`${source}${path.sep}`) || !fs.existsSync(sourceImage)) {
      throw new Error(`Ready Story image is missing: ${folder}/${filename}`);
    }
    fs.mkdirSync(path.join(work, "stories"), { recursive: true });
    fs.copyFileSync(sourceImage, path.join(work, relativeMedia));
    return {
      reference: `story-d${String(day).padStart(2, "0")}-s${String(row.Slide).padStart(2, "0")}`,
      title: row.Title,
      caption: "",
      format: "story",
      media: [relativeMedia],
      platforms: ["instagram"],
      schedule: {
        date: addDays(startDateArg, day - 1),
        time: row["Time (EAT)"],
      },
      qaStatus: "ready",
    };
  });
  const manifest = {
    schemaVersion: "1.0",
    brand: "chezahub",
    timezone: "Africa/Nairobi",
    campaign: {
      name: `ChezaHub Instagram Stories — Day ${day}`,
      sourceWeek: `${startDateArg}/${addDays(startDateArg, 6)}`,
    },
    defaults: {
      platforms: ["instagram"],
      overduePolicy: "roll_forward",
    },
    posts,
  };
  fs.writeFileSync(
    path.join(work, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const zip = path.join(output, `chezahub-stories-day-${String(day).padStart(2, "0")}.zip`);
  const built = spawnSync(process.execPath, [builder, work, zip], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (built.status !== 0) {
    throw new Error(built.stderr || built.stdout || `Could not build Story day ${day}.`);
  }
  results.push({ day, posts: posts.length, zip });
}

process.stdout.write(`${JSON.stringify({ source, startDate: startDateArg, results }, null, 2)}\n`);
