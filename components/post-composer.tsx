"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Rows3,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { isoToNairobiInputs, nairobiInputToIso } from "@/lib/calendar";
import type { Brand, Platform, PostFormat, ScheduledPost } from "@/lib/types";

type CaptionStatus = "idle" | "generating" | "ready" | "error";

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
  captionStatus: CaptionStatus;
  captionError: string;
};

type Props = {
  editing?: ScheduledPost | null;
  onClose: () => void;
  onSaved: (result?: "saved" | "published") => void | Promise<void>;
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

async function compressedCaptionFile(file: File, maxDimension: number) {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.76),
    );
    return blob
      ? new File([blob], `${cleanTitle(file.name) || "poster"}.jpg`, {
          type: "image/jpeg",
        })
      : file;
  } catch {
    return file;
  }
}

export function PostComposer({ editing, onClose, onSaved }: Props) {
  const defaults = suggestedInputs();
  const savedSchedule = isoToNairobiInputs(editing?.scheduledAt ?? null);
  const initialSchedule = savedSchedule.date ? savedSchedule : defaults;
  const initialMedia = editing
    ? editing.media?.length
      ? editing.media
      : [
          {
            imageUrl: editing.imageUrl,
            imagePathname: editing.imagePathname,
            position: 0,
          },
        ]
    : [];
  const [brand, setBrand] = useState<Brand>(editing?.brand ?? "chezahub");
  const [format, setFormat] = useState<PostFormat>(editing?.format ?? "single");
  const [platforms, setPlatforms] = useState<Platform[]>(
    editing?.targets.map((target) => target.platform) ?? [
      "facebook",
      "instagram",
    ],
  );
  const [items, setItems] = useState<DraftItem[]>(
    editing
      ? initialMedia.map((media, index) => ({
          key: `${editing.id}-${index}`,
          file: null,
          preview: media.imageUrl,
          imageUrl: media.imageUrl,
          imagePathname: media.imagePathname,
          title: index === 0 ? editing.title : `Slide ${index + 1}`,
          caption: editing.caption,
          date: initialSchedule.date,
          time: initialSchedule.time,
          captionStatus: "ready" as const,
          captionError: "",
        }))
      : [],
  );
  const [carouselTitle, setCarouselTitle] = useState(editing?.title ?? "");
  const [carouselCaption, setCarouselCaption] = useState(
    editing?.format === "carousel" ? editing.caption : "",
  );
  const [carouselDate, setCarouselDate] = useState(initialSchedule.date);
  const [carouselTime, setCarouselTime] = useState(initialSchedule.time);
  const [carouselCaptionStatus, setCarouselCaptionStatus] =
    useState<CaptionStatus>(editing?.caption ? "ready" : "idle");
  const [carouselCaptionError, setCarouselCaptionError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<
    "draft" | "schedule" | "publish" | null
  >(null);
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

  const isGenerating =
    carouselCaptionStatus === "generating" ||
    items.some((item) => item.captionStatus === "generating");
  const canSubmit =
    items.length > 0 &&
    (format === "single" || items.length >= 2) &&
    platforms.length > 0 &&
    (format === "carousel"
      ? carouselTitle.trim()
      : items.every((item) => item.title.trim())) &&
    !isGenerating;
  const canPublishNow = editing
    ? ["draft", "scheduled"].includes(editing.status)
    : false;
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
        captionStatus: "idle" as const,
        captionError: "",
      };
    });
    const combined = [...items, ...next];
    setItems(combined);
    if (!carouselTitle && combined[0]) setCarouselTitle(combined[0].title);
    if (format === "carousel") {
      if (combined.length >= 2) void generateCarouselCaption(combined);
    } else {
      next.forEach((item) => void generateItemCaption(item));
    }
  }

  function updateItem(
    key: string,
    field: "title" | "caption" | "date" | "time",
    value: string,
  ) {
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

  async function requestCaption(
    sourceItems: DraftItem[],
    mode: PostFormat,
    workingTitle: string,
  ) {
    const form = new FormData();
    form.set("brand", brand);
    form.set("mode", mode);
    form.set("title", workingTitle);
    for (const item of sourceItems) {
      if (item.file) {
        form.append(
          "images",
          await compressedCaptionFile(
            item.file,
            mode === "carousel" ? 800 : 1200,
          ),
        );
      } else if (item.imageUrl) {
        form.append("imageUrls", item.imageUrl);
      }
    }
    const response = await fetch("/api/captions", {
      method: "POST",
      body: form,
    });
    const body = (await response.json()) as {
      caption?: string;
      error?: string;
    };
    if (!response.ok || !body.caption) {
      throw new Error(body.error || "Could not generate a caption.");
    }
    return body.caption;
  }

  async function generateItemCaption(item: DraftItem) {
    setItems((current) =>
      current.map((value) =>
        value.key === item.key
          ? { ...value, captionStatus: "generating", captionError: "" }
          : value,
      ),
    );
    try {
      const caption = await requestCaption([item], "single", item.title);
      setItems((current) =>
        current.map((value) =>
          value.key === item.key
            ? {
                ...value,
                caption,
                captionStatus: "ready",
                captionError: "",
              }
            : value,
        ),
      );
    } catch (captionError) {
      setItems((current) =>
        current.map((value) =>
          value.key === item.key
            ? {
                ...value,
                captionStatus: "error",
                captionError:
                  captionError instanceof Error
                    ? captionError.message
                    : "Could not generate a caption.",
              }
            : value,
        ),
      );
    }
  }

  async function generateCarouselCaption(sourceItems = items) {
    if (sourceItems.length < 2) return;
    setCarouselCaptionStatus("generating");
    setCarouselCaptionError("");
    try {
      setCarouselCaption(
        await requestCaption(
          sourceItems,
          "carousel",
          carouselTitle || sourceItems[0].title,
        ),
      );
      setCarouselCaptionStatus("ready");
    } catch (captionError) {
      setCarouselCaptionStatus("error");
      setCarouselCaptionError(
        captionError instanceof Error
          ? captionError.message
          : "Could not generate a caption.",
      );
    }
  }

  function changeFormat(nextFormat: PostFormat) {
    setFormat(nextFormat);
    setError("");
    if (nextFormat === "carousel") {
      if (!carouselTitle && items[0]) setCarouselTitle(items[0].title);
      if (items.length >= 2 && !carouselCaption) {
        void generateCarouselCaption(items);
      }
    } else {
      items
        .filter((item) => !item.caption)
        .forEach((item) => void generateItemCaption(item));
    }
  }

  async function save(intent: "draft" | "schedule" | "publish") {
    if (!canSubmit) return;
    if (intent === "publish") {
      if (!editing || !canPublishNow) return;
      const targets = platforms.join(" and ");
      if (
        !window.confirm(
          `Post “${format === "carousel" ? carouselTitle : items[0]?.title}” now to ${targets}? Current edits will be saved first.`,
        )
      )
        return;
    }
    if (
      intent === "schedule" &&
      (format === "carousel"
        ? !carouselDate || !carouselTime
        : items.some((item) => !item.date || !item.time))
    ) {
      setError("Choose both a schedule date and time.");
      return;
    }

    setPending(true);
    setPendingIntent(intent);
    setError("");
    setProgress(0);
    try {
      const prepared = [];
      const uploadedMedia: Array<{
        imageUrl: string;
        imagePathname: string;
      }> = [];
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
        uploadedMedia.push({ imageUrl, imagePathname });
        if (format === "single") {
          prepared.push({
            title: item.title,
            caption: item.caption,
            brand,
            format: "single",
            platforms,
            imageUrl,
            imagePathname,
            media: [{ imageUrl, imagePathname }],
            qaStatus: editing?.qaStatus,
            holdReason: editing?.holdReason,
            sourceWeek: editing?.sourceWeek,
            scheduledAt:
              intent === "schedule"
                ? nairobiInputToIso(item.date, item.time)
                : null,
          });
        }
      }
      if (format === "carousel") {
        prepared.push({
          title: carouselTitle,
          caption: carouselCaption,
          brand,
          format: "carousel",
          platforms,
          imageUrl: uploadedMedia[0].imageUrl,
          imagePathname: uploadedMedia[0].imagePathname,
          media: uploadedMedia,
          qaStatus: editing?.qaStatus,
          holdReason: editing?.holdReason,
          sourceWeek: editing?.sourceWeek,
          scheduledAt:
            intent === "schedule"
              ? nairobiInputToIso(carouselDate, carouselTime)
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
      if (intent === "publish" && editing) {
        const publishResponse = await fetch(
          `/api/posts/${editing.id}/publish-now`,
          { method: "POST" },
        );
        const publishBody = (await publishResponse.json()) as {
          error?: string;
        };
        if (!publishResponse.ok)
          throw new Error(publishBody.error || "Could not publish this post.");
      }
      await onSaved(intent === "publish" ? "published" : "saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save posts.",
      );
    } finally {
      setPending(false);
      setPendingIntent(null);
    }
  }

  const countLabel = useMemo(
    () =>
      `${items.length} of 10 ${format === "carousel" ? "slide" : "poster"}${items.length === 1 ? "" : "s"}`,
    [format, items.length],
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
                : format === "carousel"
                  ? "Combine the selected slides into one scheduled carousel."
                  : "Each image becomes its own independently scheduled post."}
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
          <fieldset className="format-setting">
            <legend>Post format</legend>
            <div className="format-options">
              <button
                type="button"
                className={format === "single" ? "format active" : "format"}
                onClick={() => changeFormat("single")}
              >
                <Rows3 size={16} /> Independent
              </button>
              <button
                type="button"
                className={format === "carousel" ? "format active" : "format"}
                onClick={() => changeFormat("carousel")}
              >
                <Layers3 size={16} /> Carousel
              </button>
            </div>
          </fieldset>
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
            <>
              {format === "carousel" ? (
                <article className="carousel-details">
                  <div className="carousel-details-heading">
                    <div>
                      <strong>One carousel post</strong>
                      <span>
                        One caption and one schedule for all {items.length}{" "}
                        slide
                        {items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ai-button"
                      onClick={() => generateCarouselCaption()}
                      disabled={carouselCaptionStatus === "generating"}
                    >
                      {carouselCaptionStatus === "generating" ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      {carouselCaption ? "Regenerate" : "Generate caption"}
                    </button>
                  </div>
                  <label>
                    Title
                    <input
                      value={carouselTitle}
                      maxLength={120}
                      onChange={(event) => setCarouselTitle(event.target.value)}
                    />
                  </label>
                  <label>
                    Instagram caption
                    <textarea
                      value={carouselCaption}
                      maxLength={2200}
                      rows={6}
                      placeholder="ChatGPT will write a complete caption from all slides…"
                      onChange={(event) => {
                        setCarouselCaption(event.target.value);
                        setCarouselCaptionStatus("ready");
                      }}
                    />
                  </label>
                  {carouselCaptionStatus === "generating" ? (
                    <p className="caption-note">
                      <Sparkles size={13} /> Reading all slides and writing the
                      caption…
                    </p>
                  ) : null}
                  {carouselCaptionError ? (
                    <p className="caption-error" role="alert">
                      {carouselCaptionError}
                    </p>
                  ) : null}
                  <div className="date-time-row">
                    <label>
                      Schedule date
                      <input
                        type="date"
                        value={carouselDate}
                        onChange={(event) =>
                          setCarouselDate(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Schedule time (EAT)
                      <input
                        type="time"
                        value={carouselTime}
                        onChange={(event) =>
                          setCarouselTime(event.target.value)
                        }
                      />
                    </label>
                  </div>
                </article>
              ) : null}

              {items.map((item, index) => (
                <article
                  className={`composer-item ${format === "carousel" ? "carousel-slide" : ""}`}
                  key={item.key}
                >
                  <div className="slide-preview">
                    <img
                      src={item.preview}
                      alt={
                        format === "carousel"
                          ? `Carousel slide ${index + 1}`
                          : `Post ${index + 1} preview`
                      }
                    />
                    {format === "carousel" ? <span>{index + 1}</span> : null}
                  </div>
                  <div className="composer-fields">
                    <div className="item-heading">
                      <span>
                        {format === "carousel" ? "Slide" : "Post"} {index + 1}
                      </span>
                      {!editing ? (
                        <button
                          className="text-danger"
                          onClick={() => removeItem(item.key)}
                        >
                          <Trash2 size={15} /> Remove
                        </button>
                      ) : null}
                    </div>
                    {format === "single" ? (
                      <>
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
                        <div className="caption-field">
                          <div className="caption-field-heading">
                            <label htmlFor={`caption-${item.key}`}>
                              Instagram caption
                            </label>
                            <button
                              type="button"
                              className="ai-button compact"
                              onClick={() => generateItemCaption(item)}
                              disabled={item.captionStatus === "generating"}
                            >
                              {item.captionStatus === "generating" ? (
                                <LoaderCircle className="spin" size={14} />
                              ) : (
                                <Sparkles size={14} />
                              )}
                              {item.caption ? "Regenerate" : "Generate"}
                            </button>
                          </div>
                          <textarea
                            id={`caption-${item.key}`}
                            value={item.caption}
                            maxLength={2200}
                            rows={5}
                            placeholder="ChatGPT is preparing a complete caption…"
                            onChange={(event) =>
                              updateItem(
                                item.key,
                                "caption",
                                event.target.value,
                              )
                            }
                          />
                          {item.captionStatus === "generating" ? (
                            <p className="caption-note">
                              <Sparkles size={13} /> Reading poster and writing…
                            </p>
                          ) : null}
                          {item.captionError ? (
                            <p className="caption-error" role="alert">
                              {item.captionError}
                            </p>
                          ) : null}
                        </div>
                        <div className="date-time-row">
                          <label>
                            Schedule date
                            <input
                              type="date"
                              value={item.date}
                              onChange={(event) =>
                                updateItem(item.key, "date", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Schedule time (EAT)
                            <input
                              type="time"
                              value={item.time}
                              onChange={(event) =>
                                updateItem(item.key, "time", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <p className="slide-help">
                        Published in this position. Select files in the order
                        you want people to swipe.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </>
          ) : (
            <div className="empty-composer">
              Choose{" "}
              {format === "carousel" ? "2–10 slides" : "one or more posters"} to
              begin.
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
            {pendingIntent === "draft" ? (
              <LoaderCircle className="spin" size={17} />
            ) : null}{" "}
            Save draft
          </button>
          {editing && ["draft", "scheduled"].includes(editing.status) ? (
            <button
              className="button post-now"
              onClick={() => save("publish")}
              disabled={!canSubmit || !canPublishNow || pending}
              title="Save current edits and publish immediately"
            >
              {pendingIntent === "publish" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Send size={17} />
              )}
              Post now
            </button>
          ) : null}
          <button
            className="button primary"
            onClick={() => save("schedule")}
            disabled={!canSubmit || pending}
          >
            {pendingIntent === "schedule" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <CalendarClock size={17} />
            )}{" "}
            {editing?.status === "scheduled"
              ? "Update schedule"
              : format === "carousel"
                ? "Schedule carousel"
                : "Schedule posts"}
          </button>
        </footer>
      </section>
    </div>
  );
}
