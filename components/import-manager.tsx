"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ImportDetail, ImportSummary } from "@/lib/imports";
import type { OverduePolicy } from "@/lib/content-pack";

export function ImportManager() {
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [selected, setSelected] = useState<ImportDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [policy, setPolicy] = useState<OverduePolicy>("roll_forward");

  const loadList = useCallback(async () => {
    const response = await fetch("/api/imports", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load imports.");
    setImports(body.imports ?? []);
  }, []);

  const loadOne = useCallback(async (id: string) => {
    const response = await fetch(`/api/imports/${id}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load this import.");
    setSelected(body.import);
  }, []);

  useEffect(() => {
    void loadList().catch((error) => setMessage(error.message));
  }, [loadList]);

  async function upload(formData: FormData) {
    setBusy(true);
    try {
      const response = await fetch("/api/imports", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Import failed.");
      setSelected(body.import);
      setMessage(body.existing ? "This pack was already staged." : "Pack staged for review. Nothing was scheduled.");
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function action(name: "approve" | "commit" | "schedule" | "cancel") {
    if (!selected) return;
    const prompts = {
      approve: "Approve every eligible entry? Blocked entries will remain blocked.",
      commit: "Create Socio drafts only? This will not schedule or publish anything.",
      schedule: `Schedule approved drafts using the ${policy.replaceAll("_", " ")} policy?`,
      cancel: "Cancel this import and every future draft or schedule created from it?",
    };
    if (!window.confirm(prompts[name])) return;
    const confirmations = {
      approve: "approve_selected_entries",
      commit: "create_drafts_only",
      schedule: "schedule_approved_drafts",
      cancel: "cancel_import_and_future_schedules",
    };
    setBusy(true);
    try {
      const response = await fetch(`/api/imports/${selected.id}/${name}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: selected.version,
          confirmation: confirmations[name],
          confirmQa: name === "approve",
          policy,
          staggerMinutes: 120,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `${name} failed.`);
      const next = body.batch ?? body.import;
      if (next) setSelected(next);
      setMessage(
        name === "approve"
          ? `${body.approved?.length ?? 0} entries approved.`
          : name === "commit"
            ? `${body.created?.length ?? 0} drafts created. Nothing was scheduled.`
            : name === "schedule"
              ? `${body.scheduled?.length ?? 0} posts scheduled.`
              : "Import cancelled.",
      );
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${name} failed.`);
      await loadOne(selected.id).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>, entry: ImportDetail["entries"][number]) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const local = String(data.get("scheduledAt") ?? "");
    const platforms = ["facebook", "instagram", "tiktok"].filter((value) => data.get(value) === "on");
    setBusy(true);
    try {
      const response = await fetch(`/api/imports/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: selected.version,
          entryId: entry.id,
          title: data.get("title"),
          caption: data.get("caption"),
          scheduledAt: local ? new Date(local).toISOString() : null,
          platforms,
          qaStatus: data.get("qaStatus"),
          holdReason: data.get("holdReason"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save entry.");
      setSelected(body.import);
      setMessage("Entry saved. Re-approval is required.");
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f5f6f8", color: "#0d1b2a" }}>
      <header style={{ maxWidth: 1440, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div><p className="eyebrow">SOCIO PUBLISHER</p><h1 style={{ margin: 0 }}>Import and review poster packs</h1><p>Uploading creates a staging batch only. Approval, drafts, and scheduling are separate.</p></div>
        <Link className="button ghost" href="/">Back to calendar</Link>
      </header>
      <div style={{ maxWidth: 1440, margin: "auto", display: "grid", gridTemplateColumns: "minmax(260px,330px) minmax(0,1fr)", gap: 18 }}>
        <aside className="data-panel" style={{ padding: 16, height: "max-content" }}>
          <form action={upload} style={{ display: "grid", gap: 10 }}>
            <strong>Stage a content pack</strong>
            <small>ZIP with manifest.json, or a supported legacy day pack.</small>
            <input name="pack" type="file" accept=".zip,application/zip" required />
            <button className="button primary" disabled={busy}>Upload for review</button>
          </form>
          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            {imports.map((item) => <button key={item.id} className="button ghost" style={{ textAlign: "left" }} onClick={() => void loadOne(item.id)}><strong>{item.name}</strong><br/><small>{item.totalEntries} posts · {item.status} · v{item.version}</small></button>)}
          </div>
        </aside>
        <section className="data-panel" style={{ padding: 20, minWidth: 0 }}>
          {!selected ? <div style={{ padding: 60, textAlign: "center" }}>Select an import or upload a ZIP to begin.</div> : <>
            <div className="panel-heading"><div><p className="eyebrow">{selected.brand.toUpperCase()} · VERSION {selected.version}</p><h2>{selected.name}</h2><p>{selected.totalEntries} posts · {selected.readyCount} ready · {selected.warningCount} warnings · {selected.blockedCount} blocked</p></div><span>{selected.status}</span></div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", margin: "16px 0" }}>
              <button className="button ghost" disabled={busy || selected.status === "cancelled"} onClick={() => void action("approve")}>Approve eligible</button>
              <button className="button secondary" disabled={busy || selected.status === "cancelled"} onClick={() => void action("commit")}>Create drafts only</button>
              <select value={policy} onChange={(event) => setPolicy(event.target.value as OverduePolicy)}><option value="roll_forward">Roll past times forward</option><option value="stagger_from_now">Stagger from now</option><option value="keep_draft">Keep overdue as drafts</option><option value="skip_expired">Skip overdue</option></select>
              <button className="button primary" disabled={busy || selected.status === "cancelled"} onClick={() => void action("schedule")}>Schedule approved drafts</button>
              <button className="button ghost" disabled={busy || selected.status === "cancelled"} onClick={() => void action("cancel")}>Cancel import</button>
            </div>
            {selected.checks.filter((check) => !check.entryId).map((check) => <p key={check.id} className={check.severity === "error" ? "error-banner" : "notice-banner"}>{check.message}</p>)}
            <div style={{ display: "grid", gap: 14 }}>
              {selected.entries.map((entry) => <article key={entry.id} style={{ border: "1px solid #e0e4ea", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h3 style={{ margin: 0 }}>{entry.position + 1}. {entry.title}</h3><small>{entry.format} · {entry.status} · {entry.media.length} slide{entry.media.length === 1 ? "" : "s"}</small></div><span className={`qa-badge qa-${entry.qaStatus}`}>{entry.qaStatus.replaceAll("_", " ")}</span></div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 0" }}>{entry.media.map((media) => <img key={media.id} src={media.imageUrl} alt={media.filename} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 9 }} />)}</div>
                {entry.checks.map((check) => <p key={check.id} className={check.severity === "error" ? "error-banner" : "notice-banner"}>{check.message}</p>)}
                <form onSubmit={(event) => void saveEntry(event, entry)} style={{ display: "grid", gap: 9 }}>
                  <label>Title<input name="title" defaultValue={entry.title} maxLength={120} /></label>
                  <label>Instagram caption<textarea name="caption" defaultValue={entry.caption} maxLength={2200} rows={5} /></label>
                  <label>Intended EAT schedule<input name="scheduledAt" type="datetime-local" defaultValue={entry.scheduledAt ? entry.scheduledAt.slice(0,16) : ""} /></label>
                  <div style={{ display: "flex", gap: 12 }}>{["facebook","instagram","tiktok"].map((platform) => <label key={platform}><input name={platform} type="checkbox" defaultChecked={entry.platforms.includes(platform as never)} /> {platform}</label>)}</div>
                  <label>QA status<select name="qaStatus" defaultValue={entry.qaStatus}><option value="ready">Ready</option><option value="ready_after_qa">Ready after QA</option><option value="hold">Hold</option></select></label>
                  <label>QA note<input name="holdReason" defaultValue={entry.holdReason ?? ""} maxLength={500} /></label>
                  <button className="button ghost" disabled={busy || !["staged","blocked","approved"].includes(entry.status)}>Save entry</button>
                </form>
              </article>)}
            </div>
          </>}
        </section>
      </div>
      {message ? <div style={{ position: "fixed", right: 18, bottom: 18, background: "#0d1b2a", color: "white", padding: "12px 15px", borderRadius: 10 }}>{message}</div> : null}
    </main>
  );
}
