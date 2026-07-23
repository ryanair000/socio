import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import {
  reviewAsMarkdown,
  reviewPackBuffer,
} from "../.codex/skills/socio-content-publisher/scripts/review-pack.mjs";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8WQAAAAASUVORK5CYII=",
  "base64",
);

function pack(overrides: Record<string, unknown> = {}) {
  const manifest = {
    schemaVersion: "1.0",
    brand: "chezahub",
    timezone: "Africa/Nairobi",
    campaign: { name: "Next week", sourceWeek: "2026-07-27/2026-08-02" },
    defaults: {
      platforms: ["facebook", "instagram"],
      overduePolicy: "roll_forward",
    },
    posts: [
      {
        reference: "monday-0830",
        title: "Monday offer",
        caption: "Shop chezahub.co.ke or WhatsApp +254 113 033 475.",
        media: ["Monday/01.png"],
        schedule: { date: "2026-07-27", time: "08:30" },
        qaStatus: "ready",
        ...overrides,
      },
    ],
  };
  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest)));
  zip.addFile("Monday/01.png", png);
  return zip.toBuffer();
}

describe("local content-pack reviewer", () => {
  it("produces a complete ready summary for a valid pack", () => {
    const review = reviewPackBuffer(pack(), "week.zip");
    expect(review.counts).toEqual({
      posts: 1,
      slides: 1,
      ready: 1,
      warning: 0,
      blocked: 0,
    });
    expect(review.canStage).toBe(true);
    expect(reviewAsMarkdown(review)).toContain("2026-07-27 08:30");
  });

  it("blocks incorrect ChezaHub details", () => {
    const review = reviewPackBuffer(
      pack({
        caption: "Visit chezahub.com or call +254 700 000 000.",
      }),
    );
    expect(review.canStage).toBe(false);
    expect(review.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "wrong_chezahub_phone",
          severity: "error",
        }),
        expect.objectContaining({
          code: "wrong_chezahub_website",
          severity: "error",
        }),
      ]),
    );
  });

  it("warns when a schedule is absent", () => {
    const review = reviewPackBuffer(pack({ schedule: null }));
    expect(review.counts.warning).toBe(1);
    expect(review.canStage).toBe(true);
    expect(review.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_schedule",
          severity: "warning",
        }),
      ]),
    );
  });

  it("rejects executable files hidden inside an otherwise valid pack", () => {
    const zip = new AdmZip(pack());
    zip.addFile("notes/setup.exe", Buffer.from("not allowed"));
    expect(() => reviewPackBuffer(zip.toBuffer())).toThrow(
      /nested archive or executable/i,
    );
  });

  it("reviews an Instagram Story pack", () => {
    const review = reviewPackBuffer(
      pack({ format: "story", platforms: ["instagram"], caption: "" }),
    );
    expect(review.posts[0]).toMatchObject({
      format: "story",
      platforms: ["instagram"],
    });
    expect(review.canStage).toBe(true);
  });
});
