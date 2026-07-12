import { useState } from "react";
import { Link2 } from "lucide-react";
import { Badge, Btn, Card, Field, Notice, SettingsTabs, Shell, cx } from "./ui";

export function SettingsView({ kind }: { kind: string }) {
  const [notice, setNotice] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState([
    true,
    true,
    true,
    false,
    true,
  ]);
  if (kind === "integrations")
    return (
      <Shell
        route="settings/integrations"
        title="Integrations & Token Health"
        description="Monitor Meta, storage, AI, catalogue and webhooks."
      >
        <SettingsTabs active="integrations" />
        {notice && (
          <div className="mb-5">
            <Notice>{notice}</Notice>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Meta Business", "Facebook and Instagram publishing", "Healthy"],
            ["Media Storage", "Public publishing assets", "Healthy"],
            ["ChezaHub Catalogue", "Products, price and stock", "Healthy"],
            ["OpenAI", "Caption assistance", "Healthy"],
            ["Telegram", "Content intake and alerts", "Offline"],
            ["Webhook signing", "Secure event verification", "Healthy"],
          ].map(([a, b, c]) => (
            <Card key={a} className="p-5">
              <div className="flex justify-between">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Link2 aria-hidden="true" />
                </div>
                <Badge t={c === "Healthy" ? "green" : "slate"}>{c}</Badge>
              </div>
              <b className="mt-4 block">{a}</b>
              <p className="mt-1 text-sm text-slate-500">{b}</p>
              <Btn
                kind="secondary"
                className="mt-5"
                onClick={() => setNotice(`${a} connection settings opened.`)}
              >
                Manage
              </Btn>
            </Card>
          ))}
        </div>
      </Shell>
    );
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
                  current.map((value, index) => (index === i ? !value : value)),
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
