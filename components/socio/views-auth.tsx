import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Link2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Badge, Brand, Btn, Card, Field, Notice } from "./ui";

export type IntegrationHealth = {
  source?: string;
  graphVersion?: string;
  services?: Record<
    string,
    {
      configured?: boolean;
      healthy?: boolean;
      detail?: string;
      allowedChatCount?: number;
      webhookSecretConfigured?: boolean;
    }
  >;
  accounts?: Array<{
    id: string;
    name: string;
    facebook: { configured: boolean; healthy?: boolean; label?: string; error?: string };
    instagram: { configured: boolean; healthy?: boolean; label?: string; error?: string };
  }>;
};

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      localStorage.setItem("socio-session", "smmpro");
      await router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[.78fr_1.22fr]">
      <div className="hidden bg-[#071426] p-10 text-white lg:block">
        <Brand inverse sub="Social operations" />
        <div className="mt-32 max-w-sm">
          <h1 className="text-4xl font-bold">Plan. Publish. Grow.</h1>
          <p className="mt-4 text-slate-300">
            One workspace for campaigns, content, conversations and sales
            attribution.
          </p>
          {[
            ["Weekly planning", "Generate balanced plans in minutes."],
            ["Safer publishing", "Approval gates, retries and history."],
            ["Revenue clarity", "Connect posts, leads and orders."],
          ].map(([a, b]) => (
            <div key={a} className="mt-10 flex gap-4">
              <div className="h-9 w-9 rounded-xl bg-[#ef1d2b]" />
              <div>
                <b>{a}</b>
                <p className="mt-1 text-sm text-slate-400">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid place-items-center bg-white p-5">
        <Card className="w-full max-w-md p-7">
          <Brand sub="Connected to SMMPRO" />
          <h2 className="mt-8 text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Use the same administrator credentials configured in the SMMPRO
            Vercel project. Socio never receives the Meta, OpenAI or Telegram
            secret values.
          </p>
          <form onSubmit={go} className="mt-6 space-y-4" noValidate>
            <label className="block text-sm font-semibold">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                placeholder="Administrator email"
              />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                placeholder="Administrator password"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-semibold text-rose-600">
                {error}
              </p>
            )}
            <Btn className="w-full" disabled={loading}>
              {loading ? "Connecting…" : "Connect Socio to SMMPRO"}
            </Btn>
          </form>
          <Link
            href="/dashboard"
            className="mt-4 block text-center text-sm text-slate-500 hover:text-[#ef1d2b]"
          >
            Open preview dashboard without publishing
          </Link>
        </Card>
      </div>
    </div>
  );
}

export function Onboarding({ step }: { step: "workspace" | "connections" }) {
  const router = useRouter();
  const [logoName, setLogoName] = useState("");
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [healthError, setHealthError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadHealth() {
    setRefreshing(true);
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
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (step === "connections") void loadHealth();
  }, [step]);

  if (step === "workspace")
    return (
      <div className="min-h-screen bg-slate-50 p-5 md:p-10">
        <div className="mx-auto max-w-6xl">
          <Brand sub="Social operations" />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
            <Card className="p-6">
              <Badge t="red">Step 1 of 3</Badge>
              <h1 className="mt-5 text-3xl font-bold">Create your workspace</h1>
              <p className="mt-2 text-sm text-slate-500">
                Set identity, region and defaults used across publishing.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Workspace name" value="ChezaHub" />
                <Field label="Website" value="chezahub.co.ke" />
                <Field label="Timezone" value="Africa/Nairobi (EAT)" />
                <Field label="Currency" value="KES — Kenyan Shilling" />
              </div>
              <label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-rose-300">
                <UploadCloud className="mx-auto text-slate-400" aria-hidden="true" />
                <b className="mt-3 block">Upload workspace logo</b>
                <p className="text-xs text-slate-500">
                  {logoName || "PNG or SVG • Max 5 MB"}
                </p>
                <input
                  type="file"
                  accept="image/png,image/svg+xml"
                  className="sr-only"
                  onChange={(event) =>
                    setLogoName(event.target.files?.[0]?.name || "")
                  }
                />
              </label>
              <div className="mt-6 flex justify-end">
                <Btn onClick={() => router.push("/onboarding/connections")}>
                  Continue to connections <ChevronRight size={17} aria-hidden="true" />
                </Btn>
              </div>
            </Card>
            <Card className="p-6">
              <h2 className="text-xl font-bold">Socio will configure</h2>
              {[
                "Workspace branding",
                "Local publishing time",
                "Currency formatting",
                "Brand-safe AI",
              ].map((x) => (
                <div key={x} className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <CheckCircle2 className="text-emerald-600" aria-hidden="true" />
                  <span className="font-semibold">{x}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );

  const accounts = health?.accounts || [];
  const openai = health?.services?.openai;
  const telegram = health?.services?.telegram;
  const channelRows = [
    ...accounts.flatMap((account) => [
      {
        name: `${account.name} Facebook`,
        description: account.facebook.label || "Facebook Page publishing",
        connected: account.facebook.configured,
        healthy: account.facebook.healthy,
      },
      {
        name: `${account.name} Instagram`,
        description: account.instagram.label || "Instagram professional publishing",
        connected: account.instagram.configured,
        healthy: account.instagram.healthy,
      },
    ]),
    {
      name: "OpenAI",
      description: "Image-aware caption generation",
      connected: Boolean(openai?.configured),
      healthy: openai?.healthy,
    },
    {
      name: "Telegram",
      description: `Webhook intake${telegram?.allowedChatCount != null ? ` • ${telegram.allowedChatCount} approved chats` : ""}`,
      connected: Boolean(telegram?.configured),
      healthy: telegram?.healthy,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Brand sub="SMMPRO-backed connections" />
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Connect your channels</h1>
            <p className="mt-2 text-sm text-slate-500">
              Socio reads connection health from the existing SMMPRO Vercel
              project. Secret values remain inside that project.
            </p>
          </div>
          <Btn kind="secondary" onClick={loadHealth} disabled={refreshing}>
            <RefreshCw size={17} aria-hidden="true" />
            {refreshing ? "Checking…" : "Refresh status"}
          </Btn>
        </div>
        {healthError && (
          <div className="mt-5">
            <Notice tone="red">{healthError}</Notice>
          </div>
        )}
        {health && (
          <div className="mt-5">
            <Notice>
              Connected to {health.source || "SMMPRO"}
              {health.graphVersion ? ` • Meta Graph ${health.graphVersion}` : ""}
            </Notice>
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {channelRows.length ? (
            channelRows.map((row) => (
              <Card key={row.name} className="p-5">
                <div className="flex justify-between gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Link2 size={20} aria-hidden="true" />
                  </div>
                  <Badge
                    t={
                      row.healthy
                        ? "green"
                        : row.connected
                          ? "amber"
                          : "red"
                    }
                  >
                    {row.healthy
                      ? "Healthy"
                      : row.connected
                        ? "Configured"
                        : "Missing"}
                  </Badge>
                </div>
                <h2 className="mt-4 font-bold">{row.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{row.description}</p>
              </Card>
            ))
          ) : (
            <Card className="p-6 md:col-span-2">
              <p className="text-sm text-slate-500">
                {refreshing
                  ? "Checking configured services…"
                  : "Sign in first, then refresh to load the configured services."}
              </p>
            </Card>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Btn onClick={() => router.push("/dashboard")}>
            Open Socio <ChevronRight size={17} aria-hidden="true" />
          </Btn>
        </div>
      </div>
    </div>
  );
}
