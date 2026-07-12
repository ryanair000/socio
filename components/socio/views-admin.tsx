import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import {
  Badge,
  Btn,
  Card,
  Field,
  LinkButton,
  Metric,
  Notice,
  Shell,
  cx,
} from "./ui";

export function Automations({ builder = false }: { builder?: boolean }) {
  const [enabled, setEnabled] = useState([true, true, true, false]);
  const [saved, setSaved] = useState(false);
  if (builder)
    return (
      <Shell
        route="automations"
        title="Automation Rule Builder"
        description="Create product-aware workflows with clear safeguards."
        actions={<Btn onClick={() => setSaved(true)}>Save & enable</Btn>}
      >
        {saved && (
          <div className="mb-5">
            <Notice>Automation saved and enabled.</Notice>
          </div>
        )}
        <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
          <Card className="p-6">
            <div className="space-y-5">
              <Field label="Rule name" value="High-priority price drop" />
              <Field
                label="When this happens"
                value="Product discount changes"
              />
              <Field
                label="Condition"
                value="Discount ≥ 35% and priority = true"
              />
              <Field
                label="Then do this"
                value="Create Best Region Deal draft"
              />
              <Field label="Assign to" value="Ryan Alfred" />
            </div>
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm">
              Safeguard: never publish automatically. Drafts require price
              validation and approval.
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold">Preview</h2>
            <p className="mt-3 text-sm text-slate-500">
              When a priority product drops at least 35%, Socio creates a sales
              brief, fills product facts, assigns Ryan and sends an approval
              alert.
            </p>
          </Card>
        </div>
      </Shell>
    );
  const rules = [
    ["Price drop opportunity", "Discount ≥ 35%", "Create deal draft"],
    ["Restock notification", "Priority item returns", "Create restock post"],
    ["Sale expiry urgency", "36h before end", "Create urgency post"],
    ["Failed publishing retry", "Platform failure", "Retry failed target"],
  ];
  return (
    <Shell
      route="automations"
      title="Automations"
      description="Turn repetitive social operations into reliable workflows."
      actions={
        <LinkButton href="/automations/rule-1">New automation</LinkButton>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Active rules"
          value={String(enabled.filter(Boolean).length)}
          note="All healthy"
        />
        <Metric label="Runs this week" value="42" note="+12%" />
        <Metric label="Content created" value="17" note="9 approved" />
        <Metric
          label="Failed runs"
          value="1"
          note="Needs attention"
          t="amber"
        />
      </div>
      <Card className="mt-5">
        {rules.map((r, i) => (
          <div
            key={r[0]}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.2fr_1fr_1fr_80px] md:items-center"
          >
            <b>{r[0]}</b>
            <span className="text-sm text-slate-500">{r[1]}</span>
            <span className="text-sm text-slate-500">{r[2]}</span>
            <button
              aria-label={`${enabled[i] ? "Disable" : "Enable"} ${r[0]}`}
              aria-pressed={enabled[i]}
              onClick={() =>
                setEnabled((current) =>
                  current.map((value, index) => (index === i ? !value : value)),
                )
              }
              className={cx(
                "h-8 w-14 rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                enabled[i] ? "bg-emerald-500" : "bg-slate-300",
              )}
            >
              <span
                className={cx(
                  "block h-6 w-6 rounded-full bg-white transition",
                  enabled[i] && "translate-x-5",
                )}
              />
            </button>
          </div>
        ))}
      </Card>
    </Shell>
  );
}
export function Team() {
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <Shell
      route="team"
      title="Team & Roles"
      description="Invite collaborators and keep approvals accountable."
      actions={
        <Btn onClick={() => setShow(true)}>
          <UserPlus size={17} aria-hidden="true" />
          Invite member
        </Btn>
      }
    >
      {sent && (
        <div className="mb-5">
          <Notice>Invitation sent to new.member@example.com.</Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active members" value="6" note="All secure" />
        <Metric
          label="Pending invites"
          value={sent ? "3" : "2"}
          note="Expires in 5 days"
        />
        <Metric label="Custom roles" value="4" note="Least privilege" />
        <Metric label="Workspace seats" value="8 / 10" note="2 available" />
      </div>
      <Card className="mt-5 overflow-hidden">
        {[
          ["Ryan Alfred", "Owner", "All workspaces"],
          ["Faith Njoki", "Approver", "ChezaHub"],
          ["Brian Mwangi", "Designer", "ChezaHub"],
          ["Aisha Karim", "Social Manager", "JengaSites"],
          ["Kevin Otieno", "Analyst", "ChezaHub"],
        ].map((r, i) => (
          <div
            key={r[0]}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1.4fr_1fr_1fr_100px] md:items-center"
          >
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  "h-10 w-10 rounded-full",
                  i === 0 ? "bg-[#ef1d2b]" : "bg-slate-100",
                )}
              />
              <b>{r[0]}</b>
            </div>
            <span>{r[1]}</span>
            <span className="text-slate-500">{r[2]}</span>
            <Badge t="green">Active</Badge>
          </div>
        ))}
      </Card>
      {show && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
        >
          <Card className="w-full max-w-lg p-6">
            <div className="flex justify-between">
              <h2 id="invite-title" className="text-xl font-bold">
                Invite team member
              </h2>
              <button
                aria-label="Close invite dialog"
                onClick={() => setShow(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <Field label="Email" value="new.member@example.com" />
              <Field label="Role" value="Social Manager" />
              <Field label="Workspace" value="ChezaHub" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Btn kind="secondary" onClick={() => setShow(false)}>
                Cancel
              </Btn>
              <Btn
                onClick={() => {
                  setShow(false);
                  setSent(true);
                }}
              >
                Send invite
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
}
