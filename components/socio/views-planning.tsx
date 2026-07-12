import Link from "next/link";
import { useState } from "react";
import { Badge, Btn, Card, LinkButton, Metric, Notice, Shell, cx } from "./ui";
import type { Tone } from "./ui";

const week = [
  ["MON", "This Week at ChezaHub", "Discovery"],
  ["TUE", "PS5 vs Xbox", "Engagement"],
  ["WED", "Best Region Deal", "Sales"],
  ["THU", "Redeem Smart", "Education"],
  ["FRI", "Weekend Budget Picks", "Sales"],
  ["SAT", "Guess the Game", "Engagement"],
  ["SUN", "Gamers' Choice", "Trust"],
];
export function Dashboard() {
  return (
    <Shell
      route="dashboard"
      title="Good evening, Boss"
      description="Here’s what needs attention across ChezaHub this week."
      actions={
        <>
          <LinkButton href="/planner" kind="secondary">
            Generate Week
          </LinkButton>
          <LinkButton href="/campaigns">New Campaign</LinkButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Planned this week" value="14" note="+3 vs last week" />
        <Metric
          label="Awaiting approval"
          value="4"
          note="Needs action"
          t="amber"
        />
        <Metric label="Scheduled" value="9" note="Next at 7:30 PM" />
        <Metric
          label="Attributed revenue"
          value="KSh 84.6K"
          note="+18% this month"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_.9fr]">
        <Card className="p-5">
          <h2 className="text-xl font-bold">Today’s schedule</h2>
          {[
            ["10:30", "Story teaser", "Published", "green"],
            ["13:00", "PS5 vs Xbox debate", "Scheduled", "amber"],
            ["17:00", "Story reminder", "Draft", "slate"],
            ["19:30", "Main engagement poster", "In Review", "violet"],
          ].map(([a, b, c, d]) => (
            <div
              key={a}
              className="mt-3 flex items-center gap-4 rounded-xl border border-slate-100 p-4"
            >
              <b className="w-14 text-slate-500">{a}</b>
              <span className="flex-1 font-semibold">{b}</span>
              <Badge t={d as Tone}>{c}</Badge>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-bold">Content opportunities</h2>
          {[
            ["55% PS5 price drop", "Create a deal post"],
            ["Friday content gap", "Generate budget picks"],
            ["New review approved", "Use Sunday social proof"],
          ].map(([a, b], i) => (
            <div
              key={a}
              className={cx(
                "mt-3 rounded-xl p-4",
                i === 0
                  ? "bg-rose-50"
                  : i === 1
                    ? "bg-amber-50"
                    : "bg-emerald-50",
              )}
            >
              <b>{a}</b>
              <p className="mt-1 text-sm text-slate-500">{b}</p>
              <Link
                href="/studio/post-1"
                className="mt-2 inline-block text-sm font-semibold text-[#ef1d2b]"
              >
                Create post →
              </Link>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
export function Planner() {
  return (
    <Shell
      route="planner"
      title="Weekly Planner"
      description="July 13–19, 2026 • Balanced discovery, engagement, education and sales."
      actions={<LinkButton href="/studio/post-1">Add Post</LinkButton>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {week.map(([d, t, o], i) => (
          <Card key={d} className="p-4">
            <p className="text-xs font-bold text-slate-500">{d}</p>
            <div className="mt-3 h-24 rounded-xl bg-gradient-to-br from-rose-100 to-slate-100" />
            <b className="mt-4 block">{t}</b>
            <p className="mt-1 text-xs text-slate-500">
              {i === 5 ? "12:30 PM" : "7:30 PM"}
            </p>
            <div className="mt-3">
              <Badge
                t={
                  o === "Sales"
                    ? "red"
                    : o === "Engagement"
                      ? "violet"
                      : o === "Education"
                        ? "amber"
                        : o === "Trust"
                          ? "green"
                          : "slate"
                }
              >
                {o}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
const cols = [
  [
    "Ideas",
    [
      "Fortnite item-shop pick",
      "Best disk under KSh 3K",
      "Controller buying guide",
    ],
  ],
  ["Brief Ready", ["Monday gaming picks", "Customer review proof"]],
  ["In Design", ["Weekend Budget Picks", "PSN region guide"]],
  ["Review", ["Spider-Man 2 deal", "PS5 vs Xbox", "V-Bucks bundle"]],
  ["Scheduled", ["Guess the Game", "Gamers' Choice"]],
] as const;
export function ContentBoard() {
  const [ideas, setIdeas] = useState([
    "Fortnite item-shop pick",
    "Best disk under KSh 3K",
    "Controller buying guide",
  ]);
  const boardColumns: Array<[string, readonly string[]]> = cols.map(
    ([heading, items]) =>
      heading === "Ideas" ? [heading, ideas] : [heading, items],
  );
  return (
    <Shell
      route="content"
      title="Content Board"
      description="Move work from idea to published content without losing context."
      actions={
        <Btn
          onClick={() =>
            setIdeas((current) => [
              `Community poll ${current.length + 1}`,
              ...current,
            ])
          }
        >
          New Idea
        </Btn>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {boardColumns.map(([h, items], ci) => (
          <div
            key={h as string}
            className="min-w-[280px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex justify-between px-1">
              <b>{h}</b>
              <Badge>{(items as string[]).length}</Badge>
            </div>
            {(items as string[]).map((x, i) => (
              <Card
                key={x}
                className={cx(
                  "mt-3 p-4",
                  ci === 3 && i !== 1 ? "border-rose-500 bg-rose-50" : "",
                )}
              >
                <Badge
                  t={
                    ci === 0
                      ? "slate"
                      : ci === 1
                        ? "amber"
                        : ci === 2
                          ? "violet"
                          : ci === 4
                            ? "green"
                            : "red"
                  }
                >
                  {h}
                </Badge>
                <b className="mt-3 block">{x}</b>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100" />
                  <p className="text-xs text-slate-500">Ryan • Due tomorrow</p>
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}
export function Campaigns() {
  const [created, setCreated] = useState(false);
  return (
    <Shell
      route="campaigns"
      title="Campaign Manager"
      description="Plan, coordinate and measure every social campaign."
      actions={<Btn onClick={() => setCreated(true)}>New Campaign</Btn>}
    >
      {created && (
        <div className="mb-5">
          <Notice>New campaign draft created and added to planning.</Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Active campaigns"
          value={created ? "5" : "4"}
          note="2 above target"
        />
        <Metric label="Planned posts" value="26" note="18 approved" />
        <Metric label="Campaign spend" value="KSh 45K" note="67% of budget" />
        <Metric
          label="Attributed revenue"
          value="KSh 212K"
          note="4.7× return"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
        <Card className="p-6">
          <Badge t="green">ACTIVE</Badge>
          <h2 className="mt-4 text-2xl font-bold">July Game Deals</h2>
          <p className="mt-2 text-sm text-slate-500">
            Drive qualified traffic and purchases using regional deals, budget
            picks and urgency posts.
          </p>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 bg-[#ef1d2b]" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            18 of 26 posts completed
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">Campaign health</h2>
          {[
            ["Content readiness", "82%"],
            ["Engagement vs target", "+24%"],
            ["Budget utilisation", "67%"],
            ["Conversion rate", "3.8%"],
          ].map(([a, b]) => (
            <div
              key={a}
              className="flex justify-between border-b border-slate-100 py-4 text-sm"
            >
              <span className="text-slate-500">{a}</span>
              <b>{b}</b>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
