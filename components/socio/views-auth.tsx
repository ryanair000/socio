import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Link2, UploadCloud } from "lucide-react";
import { Badge, Brand, Btn, Card, Field } from "./ui";

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("boss@socio.app");
  const [password, setPassword] = useState("socio-demo");
  const [error, setError] = useState("");
  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password to continue.");
      return;
    }
    setError("");
    localStorage.setItem("socio-session", "demo");
    router.push("/onboarding/workspace");
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
          <Brand sub="Social operations" />
          <h2 className="mt-8 text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue to your Socio workspace.
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
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-semibold text-rose-600">
                {error}
              </p>
            )}
            <Btn className="w-full">Sign in to Socio</Btn>
          </form>
          <Link
            href="/dashboard"
            className="mt-4 block text-center text-sm text-slate-500 hover:text-[#ef1d2b]"
          >
            Open demo dashboard
          </Link>
        </Card>
      </div>
    </div>
  );
}
export function Onboarding({ step }: { step: "workspace" | "connections" }) {
  const router = useRouter();
  const [logoName, setLogoName] = useState("");
  const initialConnections: Record<string, boolean> = {
    "ChezaHub Catalogue": true,
    OpenAI: true,
  };
  const [connections, setConnections] = useState(initialConnections);
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
                <UploadCloud
                  className="mx-auto text-slate-400"
                  aria-hidden="true"
                />
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
                  Continue to connections{" "}
                  <ChevronRight size={17} aria-hidden="true" />
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
                <div
                  key={x}
                  className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4"
                >
                  <CheckCircle2
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{x}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  const channelRows = [
    ["Meta Business", "Facebook Pages and Instagram", "Required"],
    ["WhatsApp Business", "Tracked links and leads", "Recommended"],
    ["ChezaHub Catalogue", "Products, prices and stock", "Connected"],
    ["Media Storage", "Public publishing assets", "Required"],
    ["OpenAI", "Caption assistance", "Connected"],
    ["Telegram", "Content intake and alerts", "Optional"],
  ];
  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-10">
      <div className="mx-auto max-w-6xl">
        <Brand sub="Social operations" />
        <h1 className="mt-10 text-3xl font-bold">Connect your channels</h1>
        <p className="mt-2 text-sm text-slate-500">
          Secure connections for publishing, engagement and measurement.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {channelRows.map(([a, b, c]) => {
            const connected = Boolean(connections[a]);
            return (
              <Card key={a} className="p-5">
                <div className="flex justify-between">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <Link2 size={20} aria-hidden="true" />
                  </div>
                  <Badge
                    t={connected ? "green" : c === "Required" ? "red" : "amber"}
                  >
                    {connected ? "Connected" : c}
                  </Badge>
                </div>
                <h2 className="mt-4 font-bold">{a}</h2>
                <p className="mt-1 text-sm text-slate-500">{b}</p>
                <Btn
                  kind="secondary"
                  className="mt-5"
                  aria-pressed={connected}
                  onClick={() =>
                    setConnections((current) => ({
                      ...current,
                      [a]: !current[a],
                    }))
                  }
                >
                  {connected ? "Manage" : "Connect"}
                </Btn>
              </Card>
            );
          })}
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
