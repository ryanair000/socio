import { useEffect, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import {
  Badge,
  Btn,
  Card,
  Field,
  Notice,
  SettingsTabs,
  Shell,
  cx,
} from "./ui";
import type { IntegrationHealth } from "./views-auth";

export function SettingsView({ kind }: { kind: string }) {
  const [notice, setNotice] = useState("");
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [healthError, setHealthError] = useState("");
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState([
    true,
    true,
    true,
    false,
    true,
  ]);

  async function loadHealth() {
    setLoadingHealth(true);
    setHealthError("");
    try {
      const response = await fetch("/api/integrations/status", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection check failed.");
      setHealth(data);
    } catch (reason) {
      setHealthError(
        reason instanceof Error ? reason.message : "Connection check failed.",
      );
    } finally {
      setLoadingHealth(false);
    }
  }

  useEffect(() => {
    if (kind === "integrations") void loadHealth();
  }, [kind]);

  if (kind === "integrations") {
    const accountRows = (health?.accounts || []).flatMap((account) => [
      {
        name: `${account.name} Facebook`,
        description: account.facebook.label || "Facebook Page publishing",
        configured: account.facebook.configured,
        healthy: account.facebook.healthy,
      },
      {
        name: `${account.name} Instagram`,
        description:
          account.instagram.label || "Instagram professional publishing",
        configured: account.instagram.configured,
        healthy: account.instagram.healthy,
      },
    ]);
    const serviceRows = [
      {
        name: "OpenAI",
        description: "Image-aware caption generation",
        configured: Boolean(health?.services?.openai?.configured),
        healthy: health?.services?.openai?.healthy,
      },
      {
        name: "Telegram",
        description: `Secure content intake${
          health?.services?.telegram?.allowedChatCount != null
            ? ` • ${health.services.telegram.allowedChatCount} approved chats`
            : ""
        }`,
        configured: Boolean(health?.services?.telegram?.configured),
        healthy: health?.services?.telegram?.healthy,
      },
      {
        name: "Meta App",
        description: `Token refresh support${
          health?.graphVersion ? ` • Graph ${health.graphVersion}` : ""
        }`,
        configured: Boolean(health?.services?.metaApp?.configured),
        healthy: health?.services?.metaApp?.healthy,
      },
      {
        name: "Administrator session",
        description: "SMMPRO-backed authentication bridge",
        configured: Boolean(health?.services?.auth?.configured),
        healthy: Boolean(health),
      },
    ];
    const rows = [...accountRows, ...serviceRows];

    return (
      <Shell
        route="settings/integrations"
        title="Integrations & Token Health"
        description="Live status from the existing SMMPRO Vercel project. Secret values remain server-only."
        actions={
          <Btn kind="secondary" onClick={loadHealth} disabled={loadingHealth}>
            <RefreshCw size={17} aria-hidden="true" />
            {loadingHealth ? "Checking…" : "Refresh health"}
          </Btn>
        }
      >
        <SettingsTabs active="integrations" />
        {healthError && (
          <div className="mb-5">
            <Notice tone="red">{healthError}</Notice>
          </div>
        )}
        {health && (
          <div className="mb-5">
            <Notice>
              Socio is connected to {health.source || "SMMPRO"}. Credentials
              are used in place and never copied into the browser or repository.
            </Notice>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {rows.length ? (
            rows.map((row) => (
              <Card key={row.name} className="p-5">
                <div className="flex justify-between gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Link2 aria-hidden="true" />
                  </div>
                  <Badge
                    t={
                      row.healthy
                        ? "green"
                        : row.configured
                          ? "amber"
                          : "red"
                    }
                  >
                    {row.healthy
                      ? "Healthy"
                      : row.configured
                        ? "Configured"
                        : "Missing"}
                  </Badge>
                </div>
                <b className="mt-4 block">{row.name}</b>
                <p className="mt-1 text-sm text-slate-500">
                  {row.description}
                </p>
              </Card>
            ))
          ) : (
            <Card className="p-6 md:col-span-2">
              <p className="text-sm text-slate-500">
                {loadingHealth
                  ? "Checking Meta, OpenAI and Telegram connections…"
                  : "Sign in with the SMMPRO administrator account to load live connection health."}
              </p>
            </Card>
          )}
        </div>
      </Shell>
    );
  }

  if (kind === "brand")
    return (
      <Shell
        route="settings/brand"
        title="Brand Settings"
        description="Define design, voice and publishing defaults."
        actions={
          <Btn onClick={() => setNotice("Brand settings saved.")}>
            Save changes
          </Btn>
        }
      >
        <SettingsTabs active="brand" />
        {notice && (
          <div className="mb-5">
            <Notice>{notice}</Notice>
          </div>
        )}
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workspace name" value="ChezaHub" />
              <Field label="Website" value="chezahub.co.ke" />
              <Field label="Primary colour" value="#E6001E" />
              <Field label="Timezone" value="Africa/Nairobi" />
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Brand voice
              <textarea
                rows={5}
                className="mt-2 w-full rounded-lg border border-slate-200 p-3"
                defaultValue="Helpful, price-smart, energetic and locally relevant to Kenyan gamers."
              />
            </label>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold">AI defaults</h2>
            {[
              "Use product facts",
              "Verify prices",
              "Use Kenyan context",
              "Protect logo safe area",
            ].map((x) => (
              <div
                key={x}
                className="mt-3 flex justify-between rounded-xl bg-slate-50 p-4"
              >
                <span>{x}</span>
                <Badge t="green">On</Badge>
              </div>
            ))}
          </Card>
        </div>
      </Shell>
    );

  const notifications = [
    ["Publishing failures", "Immediate", "Email + in-app"],
    ["Approval requests", "Immediate", "In-app"],
    ["Buying-intent conversations", "Immediate", "Email + in-app"],
    ["Daily performance digest", "8:00 AM", "Email"],
    ["Token expiry warnings", "7 days before", "Email + in-app"],
  ];
  return (
    <Shell
      route="settings/notifications"
      title="Notification Preferences"
      description="Choose which events Socio sends and where."
      actions={
        <Btn onClick={() => setNotice("Notification preferences saved.")}>
          Save preferences
        </Btn>
      }
    >
      <SettingsTabs active="notifications" />
      {notice && (
        <div className="mb-5">
          <Notice>{notice}</Notice>
        </div>
      )}
      <Card>
        {notifications.map((r, i) => (
          <div
            key={r[0]}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.3fr_1fr_1fr_64px] md:items-center"
          >
            <b>{r[0]}</b>
            <span className="text-slate-500">{r[1]}</span>
            <span className="text-slate-500">{r[2]}</span>
            <button
              aria-label={`${notificationEnabled[i] ? "Disable" : "Enable"} ${r[0]}`}
              aria-pressed={notificationEnabled[i]}
              onClick={() =>
                setNotificationEnabled((current) =>
                  current.map((value, index) =>
                    index === i ? !value : value,
                  ),
                )
              }
              className={cx(
                "h-8 w-14 rounded-full p-1",
                notificationEnabled[i] ? "bg-emerald-500" : "bg-slate-300",
              )}
            >
              <span
                className={cx(
                  "block h-6 w-6 rounded-full bg-white transition",
                  notificationEnabled[i] && "translate-x-5",
                )}
              />
            </button>
          </div>
        ))}
      </Card>
    </Shell>
  );
}
