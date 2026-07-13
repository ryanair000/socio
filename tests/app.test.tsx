import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { LoginForm } from "@/components/login-form";
import { PostComposer } from "@/components/post-composer";
import { SocioApp } from "@/components/socio-app";
import { nairobiInputToIso } from "@/lib/calendar";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { ScheduledPost } from "@/lib/types";
import { fetchMock, uploadMock } from "./setup";

process.env.SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const failedPost: ScheduledPost = {
  id: "post-1",
  title: "Weekend PS5 deal",
  caption: "A prepared caption",
  brand: "chezahub",
  imageUrl: "https://store.public.blob.vercel-storage.com/poster.jpg",
  imagePathname: "posters/poster.jpg",
  status: "failed",
  scheduledAt: "2026-07-13T16:30:00.000Z",
  scheduleVersion: 1,
  workflowRunId: "wrun_1",
  lastError: "Instagram container failed.",
  createdAt: "2026-07-13T08:00:00.000Z",
  updatedAt: "2026-07-13T16:31:00.000Z",
  targets: [
    {
      platform: "facebook",
      status: "published",
      providerPostId: "fb-1",
      lastError: null,
      attempts: 1,
    },
    {
      platform: "instagram",
      status: "failed",
      providerPostId: null,
      lastError: "Container failed",
      attempts: 1,
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
    },
    {
      platform: "instagram",
      status: "draft",
      providerPostId: null,
      lastError: null,
      attempts: 0,
    },
  ],
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
    expect(screen.getByRole("button", { name: /Calendar/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Unscheduled drafts")).toBeInTheDocument();
    expect(screen.getByText("Weekend PS5 deal")).toBeInTheDocument();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.queryByText("Campaign Manager")).not.toBeInTheDocument();
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

  it("opens a draft for scheduling from the posts list", async () => {
    const user = userEvent.setup();
    renderApp([draftPost]);
    await user.click(screen.getByRole("button", { name: "Posts" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("dialog", { name: "Edit post" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Gift card guide")).toBeInTheDocument();
  });

  it("turns a bulk image selection into independent persistent drafts", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
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
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ ids: ["1", "2"] }),
    });
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
