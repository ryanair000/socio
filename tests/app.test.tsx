import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import App from "../pages/[...slug]";
import { routerPush } from "./setup";

const renderRoute = (route: string) => render(<App route={route} />);

describe("Socio release", () => {
  it("validates both email and password before login", async () => {
    const user = userEvent.setup();
    renderRoute("login");
    const email = screen.getByLabelText("Email address");
    const password = screen.getByLabelText("Password");

    await user.clear(email);
    await user.type(email, "invalid");
    await user.click(screen.getByRole("button", { name: "Sign in to Socio" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );
    expect(routerPush).not.toHaveBeenCalled();

    await user.clear(email);
    await user.type(email, "boss@socio.app");
    await user.clear(password);
    await user.click(screen.getByRole("button", { name: "Sign in to Socio" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your password");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("starts onboarding after valid login", async () => {
    const user = userEvent.setup();
    renderRoute("login");
    await user.click(screen.getByRole("button", { name: "Sign in to Socio" }));
    expect(routerPush).toHaveBeenCalledWith("/onboarding/workspace");
    expect(localStorage.getItem("socio-session")).toBe("demo");
  });

  it("connects workspace channels independently", async () => {
    const user = userEvent.setup();
    renderRoute("onboarding/connections");
    const meta = screen.getAllByRole("button", { name: "Connect" })[0];
    await user.click(meta);
    expect(meta).toHaveTextContent("Manage");
    expect(meta).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getAllByRole("button", { name: "Connect" }).length,
    ).toBeGreaterThan(0);
  });

  it("adds a new content idea", async () => {
    const user = userEvent.setup();
    renderRoute("content");
    await user.click(screen.getByRole("button", { name: "New Idea" }));
    expect(screen.getByText("Community poll 4")).toBeInTheDocument();
  });

  it("saves and submits creative work with visible feedback", async () => {
    const user = userEvent.setup();
    renderRoute("studio/post-1");
    await user.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
    await user.click(screen.getByRole("button", { name: "Send for Approval" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sent for approval successfully",
    );
  });

  it("retries only the failed publishing target", async () => {
    const user = userEvent.setup();
    renderRoute("publishing/job-1");
    expect(screen.getByText(/Instagram failed/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Retry failed target" }),
    );
    expect(
      screen.getByText("Published successfully to Facebook and Instagram."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(2);
  });

  it("sends a reply from the engagement inbox", async () => {
    const user = userEvent.setup();
    renderRoute("engagement");
    const reply = screen.getByLabelText("Reply message");
    await user.type(reply, "Yes, it is available.");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));
    expect(screen.getByText("You: Yes, it is available.")).toBeInTheDocument();
    expect(reply).toHaveValue("");
  });

  it("keeps automation toggles independent", async () => {
    const user = userEvent.setup();
    renderRoute("automations");
    const first = screen.getByRole("button", {
      name: "Disable Price drop opportunity",
    });
    const second = screen.getByRole("button", {
      name: "Disable Restock notification",
    });
    await user.click(first);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens and completes the team invitation dialog", async () => {
    const user = userEvent.setup();
    renderRoute("team");
    await user.click(screen.getByRole("button", { name: "Invite member" }));
    const dialog = screen.getByRole("dialog", { name: "Invite team member" });
    await user.click(
      within(dialog).getByRole("button", { name: "Send invite" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Invitation sent");
  });

  it("exposes settings sections and saves notification preferences", async () => {
    const user = userEvent.setup();
    renderRoute("settings/notifications");
    expect(
      screen.getByRole("navigation", { name: "Settings sections" }),
    ).toBeInTheDocument();
    const digest = screen.getByRole("button", {
      name: "Enable Daily performance digest",
    });
    await user.click(digest);
    expect(digest).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Notification preferences saved",
    );
  });

  it("filters the global search results", async () => {
    const user = userEvent.setup();
    renderRoute("dashboard");
    const search = screen.getByLabelText("Search Socio");
    await user.type(search, "team");
    const teamLinks = screen.getAllByRole("link", { name: "Team" });
    expect(
      teamLinks.some((link) => link.getAttribute("href") === "/team"),
    ).toBe(true);
  });
  it("has no serious accessibility violations on login and dashboard", async () => {
    const login = renderRoute("login");
    let audit = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact || ""),
      ),
    ).toEqual([]);
    login.unmount();
    renderRoute("dashboard");
    audit = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact || ""),
      ),
    ).toEqual([]);
  });
});
