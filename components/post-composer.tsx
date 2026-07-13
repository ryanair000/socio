"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { isoToNairobiInputs, nairobiInputToIso } from "@/lib/calendar";
import type { Brand, Platform, ScheduledPost } from "@/lib/types";

type DraftItem = {
  key: string;
  file: File | null;
  preview: string;
  imageUrl: string;
  imagePathname: string;
  title: string;
  caption: string;
  date: string;
  time: string;
};

type Props = {
  editing?: ScheduledPost | null;
  onClose: () => void;
  onSaved: () => void;
};

function suggestedInputs() {
  const nextHour = isoToNairobiInputs(
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );
  return { date: nextHour.date, time: `${nextHour.time.slice(0, 2)}:00` };
}

function cleanTitle(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function PostComposer({ editing, onClose, onSaved }: Props) {
  const defaults = suggestedInputs();
  const savedSchedule = isoToNairobiInputs(editing?.scheduledAt ?? null);
  const initialSchedule = savedSchedule.date ? savedSchedule : defaults;
  const [brand, setBrand] = useState<Brand>(editing?.brand ?? "chezahub");
  const [platforms, setPlatforms] = useState<Platform[]>(
    editing?.targets.map((target) => target.platform) ?? [
      "facebook",
      "instagram",
    ],
  );
  const [items, setItems] = useState<DraftItem[]>(
    editing
      ? [
          {
            key: editing.id,
            file: null,
            preview: editing.imageUrl,
            imageUrl: editing.imageUrl,
            imagePathname: editing.imagePathname,
            title: editing.title,
            caption: editing.caption,
            date: initialSchedule.date,
            time: initialSchedule.time,
          },
        ]
      : [],
  );
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const previewUrls = useRef(new Set<string>());

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  const canSubmit =
    items.length > 0 &&
    platforms.length > 0 &&
    items.every((item) => item.title.trim());
  const title = editing ? "Edit post" : "Add this week’s posters";

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );
    if (accepted.length !== files.length)
      setError("Only PNG, JPG, and WEBP images are supported.");
    const next = accepted.slice(0, 10 - items.length).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return {
        key: crypto.randomUUID(),
        file,
        preview,
        imageUrl: "",
        imagePathname: "",
        title: cleanTitle(file.name) || "Untitled post",
        caption: "",
        date: defaults.date,
        time: defaults.time,
      };
    });
    setItems((current) => [...current, ...next]);
  }

  function updateItem(key: string, field: keyof DraftItem, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  function removeItem(key: string) {
    setItems((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed?.file && removed.preview.startsWith("blob:")) {
        URL.revokeObjectURL(removed.preview);
        previewUrls.current.delete(removed.preview);
      }
      return current.filter((item) => item.key !== key);
    });
  }

  function togglePlatform(platform: Platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform],
    );
  }

  async function save(intent: "draft" | "schedule") {
    if (!canSubmit) return;
    if (
      intent === "schedule" &&
      items.some((item) => !item.date || !item.time)
    ) {
      setError("Every scheduled post needs a date and time.");
      return;
    }

    setPending(true);
    setError("");
    setProgress(0);
    try {
      const prepared = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        let imageUrl = item.imageUrl;
        let imagePathname = item.imagePathname;
        if (item.file) {
          const safeName = item.file.name
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .toLowerCase();
          const blob = await upload(
            `posters/${item.date || defaults.date}/${safeName}`,
            item.file,
            {
              access: "public",
              handleUploadUrl: "/api/uploads",
              onUploadProgress: ({ percentage }) => {
                setProgress(
                  Math.round(((index + percentage / 100) / items.length) * 100),
                );
              },
            },
          );
          imageUrl = blob.url;
          imagePathname = blob.pathname;
        }
        prepared.push({
          title: item.title,
          caption: item.caption,
          brand,
          platforms,
          imageUrl,
          imagePathname,
          scheduledAt:
            intent === "schedule"
              ? nairobiInputToIso(item.date, item.time)
              : null,
        });
      }

      const response = await fetch(
        editing ? `/api/posts/${editing.id}` : "/api/posts",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(editing ? prepared[0] : { items: prepared }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not save posts.");
      onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save posts.",
      );
    } finally {
      setPending(false);
    }
  }

  const countLabel = useMemo(
    () => `${items.length} of 10 poster${items.length === 1 ? "" : "s"}`,
    [items.length],
  );

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
      >
        <header className="composer-header">
          <div>
            <p className="eyebrow">
              {editing ? "POST DETAILS" : "BULK UPLOAD"}
            </p>
            <h2 id="composer-title">{title}</h2>
            <p>
              {editing
                ? "Update the details or move this post to a new time."
                : "Each image becomes its own independent post."}
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close composer"
          >
            <X size={20} />
          </button>
        </header>

        <div className="composer-settings">
          <label>
            Brand
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value as Brand)}
            >
              <option value="chezahub">ChezaHub</option>
              <option value="jengasites">JengaSites</option>
            </select>
          </label>
          <fieldset>
            <legend>Publish to</legend>
            <div className="platform-options">
              {(["facebook", "instagram"] as Platform[]).map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className={
                    platforms.includes(platform)
                      ? "platform active"
                      : "platform"
                  }
                  onClick={() => togglePlatform(platform)}
                >
                  {platforms.includes(platform) ? <Check size={15} /> : null}
                  {platform[0].toUpperCase() + platform.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {!editing && items.length < 10 ? (
          <label className="upload-dropzone">
            <ImagePlus size={25} />
            <strong>Choose finished poster images</strong>
            <span>
              PNG, JPG, or WEBP · up to 10 MB each · select up to 10 at once
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>
        ) : null}

        <div className="composer-list-header">
          <strong>{countLabel}</strong>
          <span>Times shown in EAT</span>
        </div>
        <div className="composer-list">
          {items.length ? (
            items.map((item, index) => (
              <article className="composer-item" key={item.key}>
                <img src={item.preview} alt="" />
                <div className="composer-fields">
                  <div className="item-heading">
                    <span>Post {index + 1}</span>
                    {!editing ? (
                      <button
                        className="text-danger"
                        onClick={() => removeItem(item.key)}
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    ) : null}
                  </div>
                  <label>
                    Title
                    <input
                      value={item.title}
                      maxLength={120}
                      onChange={(event) =>
                        updateItem(item.key, "title", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Caption
                    <textarea
                      value={item.caption}
                      maxLength={2200}
                      rows={4}
                      placeholder="Paste the finished caption…"
                      onChange={(event) =>
                        updateItem(item.key, "caption", event.target.value)
                      }
                    />
                  </label>
                  <div className="date-time-row">
                    <label>
                      Date
                      <input
                        type="date"
                        value={item.date}
                        onChange={(event) =>
                          updateItem(item.key, "date", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Time
                      <input
                        type="time"
                        value={item.time}
                        onChange={(event) =>
                          updateItem(item.key, "time", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-composer">
              Choose one or more posters to begin.
            </div>
          )}
        </div>

        {error ? (
          <p className="form-error composer-error" role="alert">
            {error}
          </p>
        ) : null}
        {pending ? (
          <div className="upload-progress">
            <span style={{ width: `${Math.max(progress, 5)}%` }} />
          </div>
        ) : null}
        <footer className="composer-footer">
          <button
            className="button secondary"
            onClick={() => save("draft")}
            disabled={!canSubmit || pending}
          >
            {pending ? <LoaderCircle className="spin" size={17} /> : null} Save
            draft
          </button>
          <button
            className="button primary"
            onClick={() => save("schedule")}
            disabled={!canSubmit || pending}
          >
            <CalendarClock size={17} />{" "}
            {editing?.status === "scheduled"
              ? "Update schedule"
              : "Schedule posts"}
          </button>
        </footer>
      </section>
    </div>
  );
}
