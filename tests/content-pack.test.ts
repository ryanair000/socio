import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { applyOverduePolicy, parseContentPack } from "@/lib/content-pack";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8WQAAAAASUVORK5CYII=", "base64");

function pack(overrides: Record<string, unknown> = {}, image = png) {
  const manifest = {
    schemaVersion: "1.0",
    brand: "chezahub",
    timezone: "Africa/Nairobi",
    campaign: { name: "Test week" },
    defaults: { platforms: ["facebook", "instagram"], overduePolicy: "roll_forward" },
    posts: [{
      reference: "monday-0830",
      title: "Test poster",
      caption: "Shop chezahub.co.ke or WhatsApp +254 113 033 475.",
      media: ["Monday/01.png"],
      schedule: { date: "2026-07-20", time: "08:30" },
      qaStatus: "ready",
      ...overrides,
    }],
  };
  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest)));
  zip.addFile("Monday/01.png", image);
  return zip.toBuffer();
}

describe("content-pack parser", () => {
  it("normalizes a valid manifest pack", () => {
    const parsed = parseContentPack(pack());
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].media).toEqual(["Monday/01.png"]);
    expect(parsed.entries[0].platforms).toEqual(["facebook", "instagram"]);
    expect(parsed.checks).toHaveLength(0);
  });

  it("hard-blocks a wrong ChezaHub phone number", () => {
    const parsed = parseContentPack(pack({ detectedText: "+254 700 000 000" }));
    expect(parsed.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "wrong_chezahub_phone", severity: "error" }),
    ]));
  });

  it("rejects corrupt files that only use an image extension", () => {
    expect(() => parseContentPack(pack({}, Buffer.from("not an image")))).toThrow(/valid PNG, JPEG, or WEBP/i);
  });

  it("rejects duplicate post references", () => {
    const zip = new AdmZip(pack());
    const manifestEntry = zip.getEntry("manifest.json")!;
    const manifest = JSON.parse(manifestEntry.getData().toString("utf8"));
    manifest.posts.push({ ...manifest.posts[0] });
    zip.updateFile(manifestEntry, Buffer.from(JSON.stringify(manifest)));
    expect(() => parseContentPack(zip.toBuffer())).toThrow(/Duplicate post reference/i);
  });
});

describe("overdue policy", () => {
  it("rolls past entries forward while preserving order", () => {
    const now = new Date("2026-07-20T10:00:00.000Z");
    const result = applyOverduePolicy([
      new Date("2026-07-20T08:00:00.000Z"),
      new Date("2026-07-20T09:00:00.000Z"),
    ], "roll_forward", now, 120);
    expect(result[0]?.toISOString()).toBe("2026-07-20T10:01:00.000Z");
    expect(result[1]?.toISOString()).toBe("2026-07-20T12:01:00.000Z");
  });

  it("keeps overdue entries as drafts when requested", () => {
    const result = applyOverduePolicy([new Date(0)], "keep_draft", new Date("2026-07-20T10:00:00.000Z"));
    expect(result).toEqual([null]);
  });
});
