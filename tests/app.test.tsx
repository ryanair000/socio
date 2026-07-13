import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { LoginForm } from "@/components/login-form";
import { PostComposer } from "@/components/post-composer";
import { SocioApp } from "@/components/socio-app";
import { nairobiInputToIso } from "@/lib/calendar";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { validatePostInput } from "@/lib/validation";
import type { ScheduledPost } from "@/lib/types";
import { fetchMock, uploadMock } from "./setup";

process.env.SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const failedPost: ScheduledPost = {
  id: "post-1",
  title: "Weekend PS5 deal",
  caption: "A prepared caption",
  brand: "chezahub",
  format: "single",
  imageUrl: "https://store.public.blob.vercel-storage.com/poster.jpg",
  imagePathname: "posters/poster.jpg",
  media: [
    {
      imageUrl: "https://store.public.blob.vercel-storage.com/poster.jpg",
      imagePathname: "posters/poster.jpg",
      position: 0,
    },
  ],
  status: "failed",
  scheduledAt: "2026-07-13T16:30:00.000Z",
  scheduleVersion: 1,
  workflowRunId: "wrun_1",
  lastError: "Instagram container failed.",
  qaStatus: "ready",
  holdReason: null,
  sourceWeek: null,
  sourceRef: null,
  approvedAt: null,
  publishedAt: null,
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T16:31:00.000Z",
  targets: [
    {
      platform: "facebook",
      status: "published",
      providerPostId: "fb-1",
      lastError: null,
      attempts: 1,
      idempotencyKey: "post-1:facebook",
      publishedAt: "2026-07-13T16:31:00.000Z",
    },
    {
      platform: "instagram",
      status: "failed",
      providerPostId: null,
      lastError: "Container failed",
      attempts: 1,
      idempotencyKey: "post-1:instagram",
      publishedAt: null,
    },
  ],
};

const draftPost: ScheduledPost = {
  ...failedPost,
  id: "post-2",
  title: "Gift card guide",
  status: "draft",
  scheduledAt: null,
  workflowRunId: null,
  lastError: null,
  targets: [
    {
      platform: "facebook",
      status: "draft",
      providerPostId: null,
      lastError: null,
      attempts: 0,
      idempotencyKey: "post-2:facebook",
      publishedAt: null,
    },
    {
      platform: "instagram",
      status: "draft",
      providerPostId: null,
      lastError: null,
      attempts: 0,
      idempotencyKey: "post-2:instagram",
      publishedAt: null,
    },
  ],
};

const publishedPost: ScheduledPost = {
  ...failedPost,
  status: "published",
  lastError: null,
  targets: failedPost.targets.map((target) => ({
    ...target,
    status: "published",
    providerPostId: `${target.platform}-published`,
    lastError: null,
  })),
};

function renderApp(posts = [failedPost, draftPost]) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ posts }),
  });
  return render(
    <SocioApp
      initialPosts={posts}
      initialConnection={{
        connected: true,
        expiresAt: "2026-07-20T08:00:00.000Z",
        remainingHours: 160,
      }}
    />,
  );
}

function navButton(name: string) {
  return within(
    screen.getByRole("navigation", { name: "Primary navigation" }),
  ).getByRole("button", { name });
}

describe("Socio weekly scheduler", () => {
  it("shows upstream authentication failures without storing credentials in the browser", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "SMMPRO rejected those credentials." }),
    });
    render(<LoginForm />);
    await user.type(
      screen.getByLabelText("Email address"),
      "admin@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SMMPRO rejected those credentials.",
    );
    expect(window.localStorage).toHaveLength(0);
  });

  it("renders the focused navigation and weekly operational states", async () => {
    renderApp();
    expect(navButton("Calendar")).toHaveAttribute("aria-current", "page");
    expect(navButton("New Post")).toBeInTheDocument();
    expect(navButton("Publishing")).toBeInTheDocument();
    expect(navButton("Connections")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("navigation", { name: "Primary navigation" }),
      ).getAllByRole("button"),
    ).toHaveLength(4);
    expect(screen.getByText("Unscheduled drafts")).toBeInTheDocument();
    expect(screen.getByText("Weekend PS5 deal")).toBeInTheDocument();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.queryByText("Campaign Manager")).not.toBeInTheDocument();
  });

  it("refreshes the calendar from the live posts endpoint", async () => {
    const user = userEvent.setup();
    renderApp([draftPost]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ posts: [publishedPost] }),
    });

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/posts", {
        cache: "no-store",
      }),
    );
    expect(await screen.findByText("Weekend PS5 deal")).toBeInTheDocument();
  });

  it("retries the failed post through the target-safe retry endpoint", async () => {
    const user = userEvent.setup();
    renderApp([failedPost]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ posts: [failedPost] }),
    });
    await user.click(screen.getByRole("button", { name: "Retry failed" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/posts/post-1/retry", {
        method: "POST",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Successful platform targets will not be reposted",
    );
  });

  it("opens an unscheduled draft for editing from Calendar", async () => {
    const user = userEvent.setup();
    renderApp([draftPost]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("dialog", { name: "Edit post" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Gift card guide")).toBeInTheDocument();
  });

  it("deletes an unscheduled draft from Calendar", async () => {
    const user = userEvent.setup();
    renderApp([draftPost]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ posts: [] }),
    });

    await user.click(
      screen.getByRole("button", { name: "Delete Gift card guide" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/posts/post-2", {
        method: "DELETE",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Draft deleted.",
    );
  });

  it("turns a bulk image selection into independent persistent drafts", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      input === "/api/captions"
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              caption: "Ready-to-publish AI caption #Gaming",
            }),
          }
        : {
            ok: true,
            status: 201,
            json: async () => ({ ids: ["1", "2"] }),
          },
    );
    render(<PostComposer onClose={() => undefined} onSaved={onSaved} />);
    const files = [
      new File(["one"], "morning-deal.jpg", { type: "image/jpeg" }),
      new File(["two"], "evening-poll.png", { type: "image/png" }),
    ];
    await user.upload(
      screen.getByLabelText(/Choose finished poster images/),
      files,
    );
    expect(screen.getByText("2 of 10 posters")).toBeInTheDocument();
    expect(
      await screen.findAllByDisplayValue("Ready-to-publish AI caption #Gaming"),
    ).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(uploadMock).toHaveBeenCalledTimes(2);
    const request = fetchMock.mock.calls.find(
      (call) => call[0] === "/api/posts",
    );
    const body = JSON.parse((request?.[1] as RequestInit).body as string) as {
      items: unknown[];
    };
    expect(body.items).toHaveLength(2);
    expect(body.items.every((item: any) => item.scheduledAt === null)).toBe(
      true,
    );
    expect(body.items.every((item: any) => item.format === "single")).toBe(
      true,
    );
  });

  it("combines selected slides into one AI-captioned carousel and one schedule", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
      input === "/api/captions"
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              caption:
                "Swipe through this week’s highlights. #ChezaHub #Gaming",
            }),
          }
        : {
            ok: true,
            status: 201,
            json: async () => ({ ids: ["carousel-1"] }),
          },
    );
    render(<PostComposer onClose={() => undefined} onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: /Carousel/ }));
    await user.upload(screen.getByLabelText(/Choose finished poster images/), [
      new File(["one"], "slide-one.jpg", { type: "image/jpeg" }),
      new File(["two"], "slide-two.jpg", { type: "image/jpeg" }),
    ]);
    expect(screen.getByText("2 of 10 slides")).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue(
        "Swipe through this week’s highlights. #ChezaHub #Gaming",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Schedule date")).toBeInTheDocument();
    expect(screen.getByLabelText("Schedule time (EAT)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());

    const request = fetchMock.mock.calls.find(
      (call) => call[0] === "/api/posts",
    );
    const body = JSON.parse((request?.[1] as RequestInit).body as string) as {
      items: Array<{ format: string; media: unknown[]; caption: string }>;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      format: "carousel",
      caption: "Swipe through this week’s highlights. #ChezaHub #Gaming",
    });
    expect(body.items[0].media).toHaveLength(2);
    expect(uploadMock).toHaveBeenCalledTimes(2);
  });

  it("converts Nairobi calendar input to the correct UTC instant", () => {
    expect(nairobiInputToIso("2026-07-13", "19:30")).toBe(
      "2026-07-13T16:30:00.000Z",
    );
  });

  it("encrypts publisher sessions with authenticated encryption", () => {
    const encrypted = encryptSecret("upstream-cookie");
    expect(encrypted).not.toContain("upstream-cookie");
    expect(decryptSecret(encrypted)).toBe("upstream-cookie");
  });

  it("blocks HOLD content from entering a schedule", () => {
    expect(() =>
      validatePostInput({
        title: "Unsafe offer",
        caption: "Do not publish",
        brand: "chezahub",
        platforms: ["instagram"],
        format: "single",
        imageUrl: "https://store.public.blob.vercel-storage.com/hold.png",
        imagePathname: "week1/hold.png",
        media: [
          {
            imageUrl: "https://store.public.blob.vercel-storage.com/hold.png",
            imagePathname: "week1/hold.png",
          },
        ],
        qaStatus: "hold",
        holdReason: "Invented price",
        scheduledAt: "2026-07-14T05:00:00.000Z",
      }),
    ).toThrow("QA-blocked posts must remain drafts");
  });

  it("has no serious accessibility violations on the main workflow", async () => {
    renderApp([draftPost]);
    await waitFor(() =>
      expect(screen.getByText("Gift card guide")).toBeInTheDocument(),
    );
    const audit = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact || ""),
      ),
    ).toEqual([]);
  });
});
