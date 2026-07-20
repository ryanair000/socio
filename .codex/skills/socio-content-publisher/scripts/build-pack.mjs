#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const MAX_EXPANDED = 80 * 1024 * 1024;
const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error("Usage: node build-pack.mjs <source-directory> <output.zip>");
  process.exit(1);
}

const source = path.resolve(sourceArg);
const output = path.resolve(outputArg);
const manifestPath = path.join(source, "manifest.json");
if (!fs.existsSync(manifestPath)) throw new Error("manifest.json is missing from the source directory.");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.schemaVersion !== "1.0") throw new Error("schemaVersion must be 1.0.");
if (!["chezahub", "jengasites"].includes(manifest.brand)) throw new Error("brand must be chezahub or jengasites.");
if (manifest.timezone !== "Africa/Nairobi") throw new Error("timezone must be Africa/Nairobi.");
if (!Array.isArray(manifest.posts) || manifest.posts.length < 1 || manifest.posts.length > 70) throw new Error("posts must contain 1-70 entries.");

function safeRelative(value) {
  const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error(`Unsafe media path: ${value}`);
  return normalized;
}

function imageType(bytes, filename) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 12 && bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WEBP") return "webp";
  throw new Error(`${filename} is not a valid PNG, JPEG, or WEBP image.`);
}

const refs = new Set();
const media = new Map();
for (const [index, post] of manifest.posts.entries()) {
  if (!post.reference || refs.has(post.reference)) throw new Error(`Post ${index + 1} has a missing or duplicate reference.`);
  refs.add(post.reference);
  if (!post.title || post.title.length > 120) throw new Error(`${post.reference} needs a title of at most 120 characters.`);
  if (String(post.caption ?? "").length > 2200) throw new Error(`${post.reference} caption exceeds 2,200 characters.`);
  if (!Array.isArray(post.media) || post.media.length < 1 || post.media.length > 10) throw new Error(`${post.reference} needs 1-10 media files.`);
  if ((post.format === "carousel" || post.media.length > 1) && post.media.length < 2) throw new Error(`${post.reference} carousel needs at least two slides.`);
  for (const rawName of post.media) {
    const name = safeRelative(rawName);
    const absolute = path.resolve(source, name);
    if (!absolute.startsWith(`${source}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`${post.reference} is missing ${name}.`);
    const bytes = fs.readFileSync(absolute);
    if (bytes.length > 12 * 1024 * 1024) throw new Error(`${name} exceeds 12 MB.`);
    imageType(bytes, name);
    media.set(name, bytes);
  }
}
if (media.size > 70) throw new Error("A pack cannot contain more than 70 unique images.");
const expanded = fs.statSync(manifestPath).size + [...media.values()].reduce((sum, value) => sum + value.length, 0);
if (expanded > MAX_EXPANDED) throw new Error("The pack expands beyond 80 MB.");

const zip = new AdmZip();
zip.addFile("manifest.json", fs.readFileSync(manifestPath));
for (const [name, bytes] of media) zip.addFile(name, bytes);
fs.mkdirSync(path.dirname(output), { recursive: true });
zip.writeZip(output);
const compressed = fs.statSync(output).size;
if (compressed > 25 * 1024 * 1024) {
  fs.rmSync(output, { force: true });
  throw new Error("The generated ZIP exceeds 25 MB.");
}
console.log(JSON.stringify({ output, posts: manifest.posts.length, images: media.size, compressedBytes: compressed, expandedBytes: expanded }, null, 2));
