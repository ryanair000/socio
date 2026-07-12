import Link from "next/link";
import { useMemo, useState } from "react";
import { MoreHorizontal, UploadCloud } from "lucide-react";
import { Badge, Btn, Card, LinkButton, Notice, Shell, cx } from "./ui";
import type { Tone } from "./ui";

export function Publishing() {
  const [status, setStatus] = useState("Partially published");
  return (
    <Shell
      route="publishing"
      title="Publishing Job #PUB-2841"
      description="Spider-Man 2 Best Region Deal • Wednesday 7:30 PM"
      actions={
        <Btn onClick={() => setStatus("Published")}>Retry failed target</Btn>
      }
    >
      <div
        className={cx(
          "rounded-xl p-4 text-sm font-semibold",
          status === "Published"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-orange-700",
        )}
      >
        {status === "Published"
          ? "Published successfully to Facebook and Instagram."
          : "Facebook is live; Instagram failed. Retrying targets Instagram only."}
      </div>
      <Card className="mt-5 overflow-hidden">
        {[
          ["Facebook Page", "1 of 3", "Published", "green"],
          [
            "Instagram",
            "2 of 3",
            status === "Published" ? "Published" : "Failed",
            status === "Published" ? "green" : "red",
          ],
        ].map(([a, b, c, d]) => (
          <div
            key={a}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.2fr_1fr_1fr_120px] md:items-center"
          >
            <b>{a}</b>
            <span className="text-slate-500">{b}</span>
            <Badge t={d as Tone}>{c}</Badge>
            <Btn kind="secondary">Open logs</Btn>
          </div>
        ))}
      </Card>
      <Card className="mt-5 p-6">
        <h2 className="text-xl font-bold">Duplicate protection active</h2>
        <p className="mt-2 text-sm text-slate-500">
          Retries reuse approved version 4 and never create another Facebook
          post.
        </p>
      </Card>
    </Shell>
  );
}
export function Products() {
  const [synced, setSynced] = useState(false);
  return (
    <Shell
      route="products"
      title="Product Feed"
      description="Use catalogue, pricing and stock changes to generate timely opportunities."
      actions={
        <Btn kind="secondary" onClick={() => setSynced(true)}>
          Sync Now
        </Btn>
      }
    >
      {synced && (
        <div className="mb-5">
          <Notice>Catalogue synced just now. No conflicts found.</Notice>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["55% price drop", "Marvel’s Spider-Man 2", "red"],
          ["Back in stock", "DualSense Midnight Black", "green"],
          ["Sale ends in 36h", "EA SPORTS FC 26", "amber"],
        ].map(([a, b, c]) => (
          <Card key={a} className="p-5">
            <Badge t={c as Tone}>{a}</Badge>
            <b className="mt-4 block">{b}</b>
            <Link
              href="/studio/post-1"
              className="mt-4 inline-block text-sm font-semibold text-[#ef1d2b]"
            >
              Create post →
            </Link>
          </Card>
        ))}
      </div>
      <Card className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                "Product",
                "Platform",
                "Best price",
                "Change",
                "Stock",
                "Opportunity",
              ].map((x) => (
                <th scope="col" className="p-4" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Marvel’s Spider-Man 2",
                "PS5",
                "KSh 3,790",
                "-55%",
                "Digital",
                "Deal post",
              ],
              [
                "DualSense Midnight Black",
                "PS5",
                "KSh 9,500",
                "Restocked",
                "14",
                "Restock",
              ],
              [
                "EA SPORTS FC 26",
                "PS4 / PS5",
                "KSh 4,250",
                "Ends 36h",
                "Digital",
                "Urgency",
              ],
              [
                "Fortnite 2,800 V-Bucks",
                "Multi-platform",
                "KSh 3,200",
                "Trending",
                "Live",
                "Spotlight",
              ],
            ].map((r) => (
              <tr key={r[0]} className="border-t border-slate-100">
                {r.map((x, i) => (
                  <td key={i} className={cx("p-4", i === 0 && "font-semibold")}>
                    {x}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
export function Assets() {
  const [uploaded, setUploaded] = useState<string[]>([]);
  return (
    <Shell
      route="assets"
      title="Asset Library"
      description="Approved logos, product imagery, reviews and templates."
      actions={
        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#ef1d2b] px-4 text-sm font-semibold text-white hover:bg-[#d71924]">
          <UploadCloud size={17} aria-hidden="true" />
          Upload assets
          <input
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={(event) =>
              setUploaded(
                Array.from(event.target.files || []).map((file) => file.name),
              )
            }
          />
        </label>
      }
    >
      {uploaded.length > 0 && (
        <div className="mb-5">
          <Notice>
            {uploaded.length} asset{uploaded.length === 1 ? "" : "s"} added to
            the review queue.
          </Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          ...uploaded,
          "ChezaHub primary mark",
          "Spider-Man 2 cover",
          "Customer delivery proof",
          "Weekend Picks template",
          "PS5 console cutout",
          "Review screenshot",
          "V-Bucks product image",
          "Controller bundle",
        ].map((x, i) => (
          <Card key={`${x}-${i}`} className="overflow-hidden">
            <div
              className={cx(
                "aspect-[4/3]",
                i % 3 === 0
                  ? "bg-gradient-to-br from-[#ef1d2b] to-[#071426]"
                  : "bg-slate-100",
              )}
            />
            <div className="p-4">
              <b>{x}</b>
              <div className="mt-3 flex items-center justify-between">
                <Badge t={i % 4 === 0 ? "amber" : "green"}>
                  {i % 4 === 0 ? "Review" : "Approved"}
                </Badge>
                <button
                  aria-label={`More actions for ${x}`}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <MoreHorizontal aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
