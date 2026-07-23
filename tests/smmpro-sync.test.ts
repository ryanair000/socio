import { describe, expect, it } from "vitest";
import { parseSmmproSyncEvent, validSyncSecret } from "@/lib/smmpro-sync";

const event = {
  eventId: "event-123",
  accountId: "chezahub",
  caption: "Weekend console offer",
  mode: "single",
  imageUrls: ["https://cdn.example/poster.jpg"],
  scheduledAt: null,
  publishedAt: "2026-07-15T08:00:00.000Z",
  source: "composer",
  results: [
    { platform: "facebook", status: "Success", providerPostId: "fb-123" },
  ],
};

describe("SMMPro calendar sync events", () => {
  it("accepts a successful SMMPro publication", () => {
    expect(parseSmmproSyncEvent(event)).toMatchObject({
      eventId: "event-123",
      accountId: "chezahub",
      mode: "single",
    });
  });

  it("rejects events where no platform published", () => {
    expect(() =>
      parseSmmproSyncEvent({
        ...event,
        results: [
          {
            platform: "instagram",
            status: "Failed: unavailable",
            providerPostId: null,
          },
        ],
      }),
    ).toThrow(/at least one platform/i);
  });

  it("compares the inbound shared secret without exposing it", () => {
    expect(validSyncSecret("same-secret", "same-secret")).toBe(true);
    expect(validSyncSecret("wrong-secret", "same-secret")).toBe(false);
  });
});
