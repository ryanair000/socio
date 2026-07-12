import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Badge, Btn, Card, Field, Metric, Shell, cx } from "./ui";

export function Engagement() {
  const [active, setActive] = useState(0);
  const [reply, setReply] = useState("");
  const [sentReplies, setSentReplies] = useState<Record<number, string>>({});
  const people = [
    ["Brian M.", "Is this still available?", "BUYING INTENT"],
    ["Aisha K.", "Which region is this code?", "QUESTION"],
    ["Kevin T.", "Do you accept M-Pesa?", "BUYING INTENT"],
    ["Moses N.", "Can it work on PS4?", "QUESTION"],
    ["Faith W.", "Received mine, thank you!", "POSITIVE"],
  ];
  const sendReply = () => {
    if (!reply.trim()) return;
    setSentReplies((current) => ({ ...current, [active]: reply.trim() }));
    setReply("");
  };
  return (
    <Shell
      route="engagement"
      title="Engagement Inbox"
      description="Prioritise buying intent and turn comments into leads."
    >
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="p-3">
          {people.map((p, i) => (
            <button
              key={p[0]}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className={cx(
                "mb-2 w-full rounded-xl p-4 text-left",
                active === i ? "bg-rose-50" : "hover:bg-slate-50",
              )}
            >
              <b>{p[0]}</b>
              <p className="mt-1 text-sm text-slate-500">{p[1]}</p>
              <Badge
                t={
                  p[2] === "BUYING INTENT"
                    ? "green"
                    : p[2] === "QUESTION"
                      ? "amber"
                      : "violet"
                }
              >
                {p[2]}
              </Badge>
            </button>
          ))}
        </Card>
        <Card className="flex min-h-[560px] flex-col p-5">
          <div className="flex justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{people[active][0]}</h2>
              <p className="text-xs text-slate-500">
                Instagram comment • Spider-Man 2 deal
              </p>
            </div>
            <Badge t="green">High purchase intent</Badge>
          </div>
          <div className="mt-8 max-w-md rounded-2xl bg-slate-100 p-4">
            {people[active][1]}
          </div>
          <div className="ml-auto mt-5 max-w-xl rounded-2xl bg-rose-50 p-4 text-sm">
            AI suggestion: Yes, the PS5 version is available at KSh 3,790
            through the South Africa region. Confirm your account region before
            ordering.
          </div>
          {sentReplies[active] && (
            <div className="ml-auto mt-3 max-w-xl rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
              You: {sentReplies[active]}
            </div>
          )}
          <div className="mt-auto flex gap-3 pt-5">
            <input
              aria-label="Reply message"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendReply();
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3"
              placeholder="Write a reply…"
            />
            <Btn disabled={!reply.trim()} onClick={sendReply}>
              <Send size={17} aria-hidden="true" />
              Send Reply
            </Btn>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
export function Analytics() {
  return (
    <Shell
      route="analytics"
      title="Analytics & Attribution"
      description="Understand which content, campaigns and channels generate revenue."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Reach" value="284K" note="+22%" />
        <Metric label="Engagement rate" value="6.8%" note="+1.4 pts" />
        <Metric label="WhatsApp leads" value="186" note="+31%" />
        <Metric label="Attributed revenue" value="KSh 384K" note="+18%" />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Content performance</h2>
          <div className="mt-8 flex h-64 items-end gap-5">
            {[35, 58, 50, 72, 62, 88, 78, 100].map((h, i) => (
              <div key={i} className="flex flex-1 items-end gap-1">
                <div
                  className="w-1/2 rounded-t bg-rose-100"
                  style={{ height: `${h}%` }}
                />
                <div
                  className="w-1/2 rounded-t bg-[#ef1d2b]"
                  style={{ height: `${Math.max(20, h - 28)}%` }}
                />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">Social sales funnel</h2>
          {[
            ["Post reach", "284,000"],
            ["Link clicks", "8,420"],
            ["WhatsApp leads", "186"],
            ["Orders", "74"],
            ["Revenue", "KSh 384K"],
          ].map(([a, b], i) => (
            <div key={a} className="mt-4">
              <div className="flex justify-between text-sm">
                <span>{a}</span>
                <b>{b}</b>
              </div>
              <div className="mt-2 h-3 rounded-full bg-slate-100">
                <div
                  className={cx(
                    "h-full rounded-full",
                    i > 2 ? "bg-[#ef1d2b]" : "bg-slate-300",
                  )}
                  style={{ width: `${100 - i * 16}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
