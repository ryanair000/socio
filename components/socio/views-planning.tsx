import Link from "next/link";
import { useState } from "react";
import { Badge, Btn, Card, LinkButton, Metric, Notice, Shell, cx } from "./ui";
import type { Tone } from "./ui";

type WeeklyPost = {
  day: string;
  date: string;
  title: string;
  objective: string;
  pillar: string;
  time: string;
  format: string;
  headline: string;
  caption: string;
  story: string;
  cta: string;
  hashtags: string[];
  platforms: string[];
  status: string;
};

const seededWeek: WeeklyPost[] = [
  {
    day: "MON",
    date: "Jul 13",
    title: "This Week at ChezaHub",
    objective: "Discovery",
    pillar: "Weekly Gaming Picks",
    time: "7:30 PM",
    format: "Instagram carousel",
    headline: "WHAT ARE YOU PLAYING THIS WEEK?",
    caption: `A fresh gaming week starts here. Explore this week’s featured games, wallet top-ups, disk picks and gaming gear at chezahub.co.ke.

Comment your platform and budget and we’ll recommend a pick.`,
    story: "New week. New games. What are you playing?",
    cta: "Comment your platform and budget",
    hashtags: ["#ChezaHub", "#GamingKenya", "#PS5", "#Xbox", "#Nintendo"],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Brief Ready",
  },
  {
    day: "TUE",
    date: "Jul 14",
    title: "PS5 vs Xbox Debate",
    objective: "Engagement",
    pillar: "Gamer Debate",
    time: "7:30 PM",
    format: "Feed poster + Story poll",
    headline: "ONE CONSOLE. ONE CHOICE.",
    caption:
      "You can keep only one console for the next five years: PS5 or Xbox Series X? Pick your side and give us one reason.",
    story: "PS5 or Xbox? Vote now.",
    cta: "Defend your choice in the comments",
    hashtags: ["#ChezaHub", "#PS5", "#Xbox", "#GamingDebate", "#KenyanGamers"],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Awaiting Artwork",
  },
  {
    day: "WED",
    date: "Jul 15",
    title: "Best Region Deal",
    objective: "Sales",
    pillar: "Regional Price Intelligence",
    time: "7:30 PM",
    format: "Price comparison carousel",
    headline: "SAME GAME. BETTER PRICE.",
    caption:
      "Use the latest verified ChezaHub regional deal and show customers the original price, current price, supported region and amount saved. Shop the verified offer at chezahub.co.ke.",
    story: "Today’s verified deal is live. Tap to shop.",
    cta: "Shop the verified regional deal",
    hashtags: [
      "#ChezaHubDeals",
      "#PlayStationDeals",
      "#GamingKenya",
      "#DigitalGames",
    ],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Needs Product",
  },
  {
    day: "THU",
    date: "Jul 16",
    title: "How to Check Your PSN Region",
    objective: "Education",
    pillar: "Redeem Smart",
    time: "7:30 PM",
    format: "Educational carousel",
    headline: "DON’T BUY THE WRONG REGION",
    caption:
      "Before buying a PlayStation wallet code, confirm the country or region attached to your PSN account. Save this guide and share it with a gamer who needs it.",
    story: "Know your PSN region before you buy.",
    cta: "Save and share this guide",
    hashtags: ["#PSNTips", "#ChezaHub", "#PlayStationKenya", "#GamingGuide"],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Draft",
  },
  {
    day: "FRI",
    date: "Jul 17",
    title: "Weekend Budget Picks",
    objective: "Sales",
    pillar: "Budget Gaming",
    time: "7:30 PM",
    format: "Three-tier carousel",
    headline: "YOUR WEEKEND GAMING CART",
    caption:
      "Choose three currently verified ChezaHub products for entry, mid-range and premium budgets. Comment your budget and we’ll help you choose.",
    story: "Tell us your budget. We’ll find your weekend game.",
    cta: "Comment your budget",
    hashtags: [
      "#WeekendGaming",
      "#ChezaHub",
      "#GameDealsKenya",
      "#GamingBudget",
    ],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Scheduled",
  },
  {
    day: "SAT",
    date: "Jul 18",
    title: "Guess the Game Challenge",
    objective: "Engagement",
    pillar: "Community Challenge",
    time: "12:30 PM",
    format: "Mystery poster",
    headline: "ONLY REAL GAMERS GET THIS",
    caption:
      "Three clues. One game. Drop your answer before we reveal it tonight. Keep the challenge skill-based and use a current priority title.",
    story: "Can you guess the game from three clues?",
    cta: "Drop your answer below",
    hashtags: [
      "#GuessTheGame",
      "#ChezaHub",
      "#GamingChallenge",
      "#KenyanGamers",
    ],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Draft",
  },
  {
    day: "SUN",
    date: "Jul 19",
    title: "Gamers’ Choice + Customer Proof",
    objective: "Trust",
    pillar: "Customer Social Proof",
    time: "7:00 PM",
    format: "Review carousel",
    headline: "WHAT CHEZAHUB GAMERS BOUGHT THIS WEEK",
    caption:
      "Feature one approved customer review, one popular verified product and one clear Sunday call to action. Remove all private customer information before publishing.",
    story: "This week’s gamers’ choice is here.",
    cta: "Order on the website or WhatsApp",
    hashtags: [
      "#ChezaHubReviews",
      "#GamersChoice",
      "#GamingKenya",
      "#CustomerReview",
    ],
    platforms: ["Instagram", "Facebook", "Story"],
    status: "Awaiting Review",
  },
];

function objectiveTone(objective: string): Tone {
  if (objective === "Sales") return "red";
  if (objective === "Engagement") return "violet";
  if (objective === "Education") return "amber";
  if (objective === "Trust") return "green";
  return "slate";
}

export function Dashboard() {
  return (
    <Shell
      route="dashboard"
      title="Good evening, Boss"
      description="Your next seven days are planned and ready for production."
      actions={
        <>
          <LinkButton href="/planner" kind="secondary">
            Open AI Week
          </LinkButton>
          <LinkButton href="/campaigns">New Campaign</LinkButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Planned this week"
          value="7"
          note="Monday–Sunday ready"
        />
        <Metric
          label="Awaiting approval"
          value="2"
          note="Needs action"
          t="amber"
        />
        <Metric label="Scheduled" value="1" note="Friday at 7:30 PM" />
        <Metric
          label="AI drafts available"
          value="7"
          note="Generate fresh versions"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_.9fr]">
        <Card className="p-5">
          <h2 className="text-xl font-bold">Next seven days</h2>
          {seededWeek.slice(0, 4).map((post) => (
            <div
              key={post.day}
              className="mt-3 flex items-center gap-4 rounded-xl border border-slate-100 p-4"
            >
              <b className="w-14 text-slate-500">{post.day}</b>
              <span className="flex-1 font-semibold">{post.title}</span>
              <Badge t={objectiveTone(post.objective)}>{post.status}</Badge>
            </div>
          ))}
          <Link
            href="/planner"
            className="mt-4 inline-block text-sm font-semibold text-[#ef1d2b]"
          >
            View the complete week →
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-bold">AI planning</h2>
          <p className="mt-3 text-sm text-slate-500">
            Add your OpenAI API key in Vercel, then generate a fresh seven-day
            plan using your brand goals and verified product notes.
          </p>
          <Link
            href="/planner"
            className="mt-4 inline-block text-sm font-semibold text-[#ef1d2b]"
          >
            Generate with AI →
          </Link>
        </Card>
      </div>
    </Shell>
  );
}

export function Planner() {
  const [posts, setPosts] = useState<WeeklyPost[]>(seededWeek);
  const [selected, setSelected] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"green" | "amber" | "red">(
    "green",
  );
  const [notes, setNotes] = useState("");

  async function generateWeek() {
    setGenerating(true);
    setNotice("");
    try {
      const response = await fetch("/api/ai/week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: "ChezaHub",
          weekStart: "2026-07-13",
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not generate the week.");
      setPosts(data.posts);
      localStorage.setItem("socio-ai-week", JSON.stringify(data.posts));
      setSelected(0);
      setNotice(
        `AI generated seven complete content briefs using ${data.model}.`,
      );
      setNoticeTone("green");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "AI generation failed.",
      );
      setNoticeTone("red");
    } finally {
      setGenerating(false);
    }
  }

  const post = posts[selected] || posts[0];
  return (
    <Shell
      route="planner"
      title="Weekly Planner"
      description="July 13–19, 2026 • Seven complete content briefs are ready to use."
      actions={
        <>
          <Btn kind="secondary" onClick={generateWeek} disabled={generating}>
            {generating ? "AI is planning…" : "Generate Week with AI"}
          </Btn>
          <LinkButton href="/studio/post-1">Create Post</LinkButton>
        </>
      }
    >
      {notice && (
        <div className="mb-5">
          <Notice tone={noticeTone}>{notice}</Notice>
        </div>
      )}
      <Card className="mb-5 p-5">
        <label className="block text-sm font-semibold">
          Verified product notes for AI
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Paste current products, prices, regions, stock or campaign priorities. AI will not invent missing facts."
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {posts.map((item, i) => (
          <button
            type="button"
            key={`${item.day}-${item.title}`}
            onClick={() => setSelected(i)}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <Card
              className={cx(
                "h-full p-4 transition",
                selected === i && "border-rose-400 ring-2 ring-rose-100",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{item.day}</p>
                <span className="text-[11px] text-slate-400">{item.date}</span>
              </div>
              <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-rose-100 to-slate-100" />
              <b className="mt-4 block">{item.title}</b>
              <p className="mt-1 text-xs text-slate-500">{item.time}</p>
              <div className="mt-3">
                <Badge t={objectiveTone(item.objective)}>
                  {item.objective}
                </Badge>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                {item.status}
              </p>
            </Card>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge t={objectiveTone(post.objective)}>{post.objective}</Badge>
              <h2 className="mt-3 text-2xl font-bold">{post.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {post.pillar} • {post.format} • {post.time}
              </p>
            </div>
            <LinkButton href="/studio/post-1">Open in Studio</LinkButton>
          </div>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
            Poster headline
          </h3>
          <p className="mt-2 text-2xl font-bold">{post.headline}</p>
          <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
            Caption
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {post.caption}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">Publishing brief</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-500">Story copy</dt>
              <dd className="mt-1">{post.story}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Call to action</dt>
              <dd className="mt-1">{post.cta}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Platforms</dt>
              <dd className="mt-1">{post.platforms.join(" • ")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Hashtags</dt>
              <dd className="mt-1 text-[#ef1d2b]">{post.hashtags.join(" ")}</dd>
            </div>
          </dl>
        </Card>
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
