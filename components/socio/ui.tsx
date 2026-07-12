import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Cloud,
  Columns3,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  Target,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

export type RouteProps = { route: string };
export type Tone = "slate" | "red" | "amber" | "green" | "violet";
export const routes = [
  "login",
  "onboarding/workspace",
  "onboarding/connections",
  "dashboard",
  "planner",
  "campaigns",
  "content",
  "studio/post-1",
  "approvals/post-1",
  "publishing/job-1",
  "assets",
  "products",
  "engagement",
  "analytics",
  "automations",
  "automations/rule-1",
  "team",
  "settings/integrations",
  "settings/brand",
  "settings/notifications",
];
export const href = (r: string) => `/${r}`;
const nav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["planner", "Planner", CalendarDays],
  ["campaigns", "Campaigns", Target],
  ["content", "Content Board", Columns3],
  ["studio/post-1", "Creative Studio", WandSparkles],
  ["approvals/post-1", "Approvals", ListChecks],
  ["publishing/job-1", "Publishing", Cloud],
  ["assets", "Assets", FolderOpen],
  ["products", "Product Feed", Package],
  ["engagement", "Engagement", MessageCircle],
  ["analytics", "Analytics", BarChart3],
  ["automations", "Automations", Bot],
  ["team", "Team", Users],
  ["settings/integrations", "Settings", Settings],
] as const;
const tone: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-600",
  red: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-orange-700",
  green: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
};
export const cx = (...x: (string | false | undefined)[]) =>
  x.filter(Boolean).join(" ");
export function Badge({
  children,
  t = "slate",
}: {
  children: React.ReactNode;
  t?: Tone;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone[t],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
export function Btn({
  children,
  kind = "primary",
  className = "",
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50",
        kind === "primary"
          ? "bg-[#ef1d2b] text-white hover:bg-[#d71924]"
          : kind === "secondary"
            ? "border border-slate-200 bg-white hover:bg-slate-50"
            : "text-slate-600 hover:bg-slate-100",
        className,
      )}
    >
      {children}
    </button>
  );
}
export function LinkButton({
  href: target,
  children,
  kind = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  kind?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href={target}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        kind === "primary"
          ? "bg-[#ef1d2b] text-white hover:bg-[#d71924]"
          : kind === "secondary"
            ? "border border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
            : "text-slate-600 hover:bg-slate-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
export function Notice({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red";
}) {
  const style =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-orange-700"
        : "bg-rose-50 text-rose-700";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx("rounded-xl p-4 text-sm font-semibold", style)}
    >
      {children}
    </div>
  );
}
export function SettingsTabs({
  active,
}: {
  active: "integrations" | "brand" | "notifications";
}) {
  const tabs = [
    ["integrations", "Integrations", "/settings/integrations"],
    ["brand", "Brand", "/settings/brand"],
    ["notifications", "Notifications", "/settings/notifications"],
  ] as const;
  return (
    <nav aria-label="Settings sections" className="mb-5 flex flex-wrap gap-2">
      {tabs.map(([key, label, target]) => (
        <Link
          key={key}
          href={target}
          aria-current={active === key ? "page" : undefined}
          className={cx(
            "rounded-lg border px-4 py-2 text-sm font-semibold transition",
            active === key
              ? "border-rose-200 bg-rose-50 text-[#ef1d2b]"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function Brand({
  inverse = false,
  sub = "ChezaHub workspace",
}: {
  inverse?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-[#ef1d2b]" />
      <div>
        <b className={inverse ? "text-white" : "text-slate-950"}>Socio</b>
        <p
          className={cx(
            "text-[11px]",
            inverse ? "text-slate-400" : "text-slate-500",
          )}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  t = "green",
}: {
  label: string;
  value: string;
  note: string;
  t?: Tone;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className={cx("mt-3 text-xs font-semibold", tone[t].split(" ")[1])}>
        {note}
      </p>
    </Card>
  );
}
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        defaultValue={value}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}
export function Shell({
  route,
  title,
  description,
  actions,
  children,
}: {
  route: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const active = route.split("/")[0];
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nav
      .filter(([, label]) => label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);
  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-950 lg:pb-0">
      <aside
        aria-label="Primary navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#071426] p-4 lg:flex"
      >
        <Brand inverse />
        <nav className="mt-8 space-y-1">
          {nav.map(([r, l, I]) => (
            <Link
              key={r}
              href={href(r)}
              aria-current={active === r.split("/")[0] ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                active === r.split("/")[0]
                  ? "bg-[#152640] text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <I size={18} aria-hidden="true" />
              {l}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="mt-auto flex gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </Link>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:left-64 lg:px-6">
        <button
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
        >
          <Menu aria-hidden="true" />
        </button>
        <div className="relative hidden md:block">
          <div className="flex w-80 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
            <Search size={16} className="text-slate-400" aria-hidden="true" />
            <input
              aria-label="Search Socio"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() =>
                window.setTimeout(() => setSearchFocused(false), 120)
              }
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search Socio…"
            />
          </div>
          {searchFocused && query.trim() && (
            <div className="absolute left-0 top-12 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              {searchResults.length ? (
                searchResults.map(([r, l, I]) => (
                  <Link
                    key={r}
                    href={href(r)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <I size={16} aria-hidden="true" />
                    {l}
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  No matching Socio view.
                </p>
              )}
            </div>
          )}
        </div>
        <LinkButton href="/studio/post-1" className="min-h-10">
          <Plus size={17} aria-hidden="true" />
          Create Post
        </LinkButton>
      </header>
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-72 overflow-y-auto bg-[#071426] p-4">
            <div className="flex justify-between">
              <Brand inverse />
              <button
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <nav
              aria-label="Mobile primary navigation"
              className="mt-8 space-y-1"
            >
              {nav.map(([r, l, I]) => (
                <Link
                  onClick={() => setOpen(false)}
                  key={r}
                  href={href(r)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  <I size={18} aria-hidden="true" />
                  {l}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
      <main className="min-h-screen pt-16 lg:ml-64">
        <div className="mx-auto max-w-[1440px] px-4 py-7 md:px-7">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white p-2 lg:hidden"
      >
        {[
          ["dashboard", "Home", LayoutDashboard],
          ["planner", "Plan", CalendarDays],
          ["studio/post-1", "Create", Plus],
          ["engagement", "Inbox", MessageCircle],
          ["settings/integrations", "More", Settings],
        ].map(([r, l, I]: any) => (
          <Link
            key={r}
            href={href(r)}
            aria-current={active === r.split("/")[0] ? "page" : undefined}
            className={cx(
              "flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px]",
              active === r.split("/")[0]
                ? "bg-rose-50 text-[#ef1d2b]"
                : "text-slate-500",
            )}
          >
            <I size={19} aria-hidden="true" />
            {l}
          </Link>
        ))}
      </nav>
    </div>
  );
}
