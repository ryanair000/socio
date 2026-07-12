import { useRouter } from "next/router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Btn, Card, Field, Notice, Shell } from "./ui";

export function Studio() {
  const [notice, setNotice] = useState("");
  return (
    <Shell
      route="studio"
      title="Creative Studio"
      description="Create a product-aware poster and platform-specific copy."
      actions={
        <>
          <Btn
            kind="secondary"
            onClick={() => setNotice("Draft saved in this browser.")}
          >
            Save Draft
          </Btn>
          <Btn onClick={() => setNotice("Sent for approval successfully.")}>
            Send for Approval
          </Btn>
        </>
      }
    >
      {notice && (
        <div className="mb-5">
          <Notice>{notice}</Notice>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Post brief</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Brand" value="ChezaHub" />
            <Field label="Objective" value="Sales" />
            <Field label="Content pillar" value="Best Region Deal" />
            <Field label="Format" value="Instagram 4:5" />
            <Field label="Product" value="Marvel’s Spider-Man 2 — PS5" />
            <Field label="Best region" value="South Africa" />
            <Field label="Sale price" value="KSh 3,790" />
            <Field label="Headline" value="SAME GAME. BETTER PRICE." />
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Instagram caption
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-200 p-3"
              rows={5}
              defaultValue="One of the best PS5 adventures just got cheaper. Shop the best active region at chezahub.co.ke."
            />
          </label>
        </Card>
        <Card className="p-6">
          <div className="mx-auto max-w-md rounded-3xl bg-[#071426] p-8 text-white">
            <p className="text-xs font-semibold">CHEZAHUB DEAL DROP</p>
            <h2 className="mt-5 text-4xl font-bold">
              SAME GAME.
              <br />
              BETTER PRICE.
            </h2>
            <div className="mt-6 aspect-[1.7] rounded-2xl bg-slate-700" />
            <p className="mt-6 text-4xl font-bold">KSh 3,790</p>
            <p className="mt-2 text-sm text-slate-300">
              Was KSh 5,030 • South Africa • PS5
            </p>
            <p className="mt-6 font-bold">SHOP NOW → CHEZAHUB.CO.KE</p>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
export function Approval() {
  const router = useRouter();
  const [comments, setComments] = useState(1);
  const [notice, setNotice] = useState("");
  return (
    <Shell
      route="approvals"
      title="Review: Spider-Man 2 Best Region Deal"
      description="Submitted by Ryan • Version 4 • Due today at 6:30 PM"
      actions={
        <>
          <Btn
            kind="secondary"
            onClick={() => setNotice("Changes requested from Ryan.")}
          >
            Request changes
          </Btn>
          <Btn onClick={() => router.push("/publishing/job-1")}>
            Approve & schedule
          </Btn>
        </>
      }
    >
      {notice && (
        <div className="mb-5">
          <Notice tone="amber">{notice}</Notice>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="p-6">
          <div className="mx-auto max-w-md rounded-2xl bg-[#071426] p-8 text-white">
            <h2 className="text-4xl font-bold">SAME GAME. BETTER PRICE.</h2>
            <div className="mt-6 aspect-video rounded-xl bg-slate-700" />
            <p className="mt-6 text-4xl font-bold">KSh 3,790</p>
          </div>
          <h3 className="mt-6 font-bold">Comments ({comments})</h3>
          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
            Faith: Can we make the original price more visible?
          </div>
          <Btn
            kind="secondary"
            className="mt-3"
            onClick={() => setComments((current) => current + 1)}
          >
            Add comment
          </Btn>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">Approval checklist</h2>
          {[
            "Price current",
            "Region correct",
            "Stock available",
            "Logo protected",
            "Text safe area",
            "Caption matches",
            "CTA tracked",
          ].map((x) => (
            <div
              key={x}
              className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-4"
            >
              <span>{x}</span>
              <CheckCircle2 className="text-emerald-600" aria-hidden="true" />
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
