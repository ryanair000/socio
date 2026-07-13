// @vitest-environment node
import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { parseWeek1Zip } from "@/lib/week1-import";

function mondayPack() {
  const zip = new AdmZip();
  const names = Array.from(
    { length: 10 },
    (_, index) =>
      `${String(index + 1).padStart(2, "0")}_poster_${index + 1}.png`,
  );
  names.forEach((name) =>
    zip.addFile(`02_Monday/Final_Posters/${name}`, Buffer.from("png")),
  );
  const sections = [
    ["8:00 AM", "Opening", names.slice(0, 2), "READY"],
    ["10:30 AM", "Deal", names.slice(2, 3), "READY AFTER QA — verify price"],
    ["1:00 PM", "Carousel", names.slice(3, 6), "READY"],
    ["4:30 PM", "Poll", names.slice(6, 7), "HOLD — fictional artwork"],
    ["7:30 PM", "Evening", names.slice(7, 10), "READY"],
  ]
    .map(([time, title, media, status]) => {
      const filenames = media as string[];
      return `### ${time} — ${title}
**${filenames.length > 1 ? "Slides" : "Slide"}:** ${filenames
        .map((name) => `\`${name}\``)
        .join(", ")}
**Status:** ${status}

**Caption**
Caption for ${title}.
`;
    })
    .join("\n");
  zip.addFile(
    "02_Monday/Captions_and_Schedule/Monday_Captions_and_Schedule.md",
    Buffer.from(sections),
  );
  return zip.toBuffer();
}

describe("Week 1 ZIP import", () => {
  it("preserves five EAT slots, ordered media, captions, and QA holds", () => {
    const pack = mondayPack();
    expect(
      new AdmZip(pack).getEntries().map((entry) => entry.entryName),
    ).toContain(
      "02_Monday/Captions_and_Schedule/Monday_Captions_and_Schedule.md",
    );
    const posts = parseWeek1Zip(pack);
    expect(posts).toHaveLength(5);
    expect(posts[0]).toMatchObject({
      time: "08:00",
      format: "carousel",
      qaStatus: "ready",
    });
    expect(posts[0].scheduledAt.toISOString()).toBe("2026-07-13T05:00:00.000Z");
    expect(posts[0].media.map((media) => media.filename)).toEqual([
      "01_poster_1.png",
      "02_poster_2.png",
    ]);
    expect(posts[1]).toMatchObject({
      qaStatus: "ready_after_qa",
      holdReason: "verify price",
    });
    expect(posts[3]).toMatchObject({
      qaStatus: "hold",
      holdReason: "fictional artwork",
    });
    expect(posts[4].scheduledAt.toISOString()).toBe("2026-07-13T16:30:00.000Z");
  });
});
