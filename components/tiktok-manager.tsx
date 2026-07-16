"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ImagePlus,
  LoaderCircle,
  Music2,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Unplug,
  UploadCloud,
} from "lucide-react";
import { isoToNairobiInputs, nairobiInputToIso } from "@/lib/calendar";
import styles from "./tiktok-manager.module.css";

type Connection = {
  configured: boolean;
  connected: boolean;
  username?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  privacyLevel?: string;
  privacyLevelOptions?: string[];
  musicAlwaysOn?: boolean;
  autoAddMusic?: boolean;
  unaudited?: boolean;
  error?: string;
};

type SelectedImage = {
  id: string;
  file: File;
  preview: string;
};

type TikTokPost = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  updatedAt: string;
  lastError: string | null;
  media: Array<{ imageUrl: string }>;
  targets: Array<{
    platform: string;
    status: string;
    providerPublishId?: string | null;
    lastError?: string | null;
  }>;
};

function cleanName(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "poster";
}

async function loadHtmlImage(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);
  return image;
}

async function prepareTikTokImage(file: File) {
  const maxDimension = 1080;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare TikTok images.");

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
  } else {
    const image = await loadHtmlImage(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9),
  );
  if (webp) {
    return new File([webp], `${cleanName(file.name)}.webp`, {
      type: "image/webp",
    });
  }
  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!jpeg) throw new Error("Could not convert this image for TikTok.");
  return new File([jpeg], `${cleanName(file.name)}.jpg`, {
    type: "image/jpeg",
  });
}

function formatDate(value: string | null) {
  if (!value) return "Draft — not scheduled";
  return new Date(value).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TikTokManager() {
  const nextHour = useMemo(
    () =>
      isoToNairobiInputs(
        new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ),
    [],
  );
  const [connection, setConnection] = useState<Connection | null>(null);
  const [posts, setPosts] = useState<TikTokPost[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(nextHour.date);
  const [time, setTime] = useState(nextHour.time);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewUrls = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [connectionResponse, postsResponse] = await Promise.all([
        fetch("/api/connections/tiktok/status", { cache: "no-store" }),
        fetch("/api/posts", { cache: "no-store" }),
      ]);
      if (connectionResponse.status === 401 || postsResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      const connectionBody = (await connectionResponse.json()) as Connection;
      const postsBody = (await postsResponse.json()) as {
        posts?: TikTokPost[];
        error?: string;
      };
      setConnection(connectionBody);
      if (postsResponse.ok && postsBody.posts) {
        setPosts(
          postsBody.posts
            .filter((post) =>
              post.targets.some(
                (target) => String(target.platform).toLowerCase() === "tiktok",
              ),
            )
            .slice(0, 12),
        );
      } else if (!postsResponse.ok) {
        throw new Error(postsBody.error || "Could not load TikTok posts.");
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not load TikTok.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const query = new URLSearchParams(window.location.search);
    const result = query.get("tiktok");
    const returnedMessage = query.get("message");
    if (result === "connected") {
      setMessage("ChezaHub TikTok connected successfully.");
      window.history.replaceState({}, "", "/tiktok");
    } else if (result === "error") {
      setError(returnedMessage || "TikTok connection failed.");
      window.history.replaceState({}, "", "/tiktok");
    }
  }, [refresh]);

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  function chooseImages(files: FileList | null) {
    if (!files) return;
    setError("");
    const accepted = Array.from(files).filter((file) =>
      ["image/png", "image/jpeg", "image/webp"].includes(file.type),
    );
    if (accepted.length !== files.length) {
      setError("Only PNG, JPG, and WebP images are supported.");
    }
    const remaining = Math.max(0, 10 - images.length);
    const next = accepted.slice(0, remaining).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: crypto.randomUUID(), file, preview };
    });
    setImages((current) => [...current, ...next]);
    if (!title && next[0]) setTitle(cleanName(next[0].file.name).replace(/-/g, " "));
  }

  function removeImage(id: string) {
    setImages((current) => {
      const item = current.find((value) => value.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
        previewUrls.current.delete(item.preview);
      }
      return current.filter((value) => value.id !== id);
    });
  }

  async function disconnect() {
    if (!window.confirm("Disconnect the ChezaHub TikTok account from SMMPRO?")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/connections/tiktok/disconnect", {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not disconnect TikTok.");
      setMessage("TikTok disconnected.");
      await refresh();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Could not disconnect TikTok.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createPost(intent: "draft" | "schedule" | "publish") {
    if (!images.length || !title.trim()) {
      setError("Add at least one poster and a title.");
      return;
    }
    if (intent !== "draft" && !connection?.connected) {
      setError("Connect ChezaHub TikTok before scheduling or publishing.");
      return;
    }
    if (intent === "schedule" && (!date || !time)) {
      setError("Choose both a date and time in EAT.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    setProgress(0);
    try {
      const media = [];
      for (let index = 0; index < images.length; index += 1) {
        const prepared = await prepareTikTokImage(images[index].file);
        const blob = await upload(
          `posters/tiktok/${date || nextHour.date}/${prepared.name}`,
          prepared,
          {
            access: "public",
            handleUploadUrl: "/api/uploads",
            onUploadProgress: ({ percentage }) => {
              setProgress(
                Math.round(
                  ((index + percentage / 100) / images.length) * 100,
                ),
              );
            },
          },
        );
        media.push({
          imageUrl: blob.url,
          imagePathname: blob.pathname,
          position: index,
        });
      }

      const scheduledAt =
        intent === "schedule" ? nairobiInputToIso(date, time) : null;
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              title: title.trim(),
              caption: caption.trim(),
              brand: "chezahub",
              format: media.length > 1 ? "carousel" : "single",
              platforms: ["tiktok"],
              imageUrl: media[0].imageUrl,
              imagePathname: media[0].imagePathname,
              media,
              qaStatus: "ready",
              scheduledAt,
            },
          ],
        }),
      });
      const body = (await response.json()) as {
        ids?: string[];
        error?: string;
      };
      if (!response.ok || !body.ids?.[0]) {
        throw new Error(body.error || "Could not save the TikTok post.");
      }
      if (intent === "publish") {
        const publishResponse = await fetch(
          `/api/posts/${body.ids[0]}/publish-now`,
          { method: "POST" },
        );
        const publishBody = (await publishResponse.json()) as { error?: string };
        if (!publishResponse.ok) {
          throw new Error(
            publishBody.error || "The post was saved but could not be queued.",
          );
        }
      }

      images.forEach((item) => {
        URL.revokeObjectURL(item.preview);
        previewUrls.current.delete(item.preview);
      });
      setImages([]);
      setTitle("");
      setCaption("");
      setProgress(0);
      setMessage(
        intent === "draft"
          ? "TikTok draft saved in Socio."
          : intent === "schedule"
            ? "TikTok post scheduled with recommended music enabled."
            : "TikTok publishing queued with recommended music enabled.",
      );
      await refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the TikTok post.",
      );
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <a href="/" className={styles.back}>
          <ArrowLeft size={17} /> Back to Socio
        </a>
        <button className={styles.refresh} onClick={() => refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spin : ""} /> Refresh
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroIcon}>
          <Music2 size={30} />
        </div>
        <div>
          <p className={styles.eyebrow}>CHEZAHUB ONLY</p>
          <h1>TikTok publishing</h1>
          <p>
            Schedule private photo posts and carousels from Socio. TikTok adds
            recommended music automatically to every post.
          </p>
        </div>
        <div className={styles.musicBadge}>
          <Music2 size={16} /> Music always on
        </div>
      </section>

      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.connectionCard}>
        <div className={styles.connectionMain}>
          {connection?.avatarUrl ? (
            <img src={connection.avatarUrl} alt="TikTok profile" />
          ) : (
            <div className={styles.avatarFallback}>
              <Music2 size={23} />
            </div>
          )}
          <div>
            <p className={styles.eyebrow}>CONNECTION</p>
            <h2>
              {connection?.connected
                ? connection.nickname || connection.username || "ChezaHub TikTok"
                : "ChezaHub TikTok"}
            </h2>
            <p>
              {connection?.connected
                ? `Connected${connection.username ? ` as @${connection.username}` : ""}`
                : connection?.configured
                  ? "Ready to connect through TikTok Login Kit."
                  : connection?.error || "TikTok app credentials are not configured in SMMPRO."}
            </p>
          </div>
        </div>
        <div className={styles.connectionActions}>
          {connection?.connected ? (
            <button className={styles.secondaryButton} onClick={disconnect} disabled={busy}>
              <Unplug size={16} /> Disconnect
            </button>
          ) : (
            <a
              className={
                connection?.configured
                  ? styles.primaryButton
                  : `${styles.primaryButton} ${styles.disabled}`
              }
              href={connection?.configured ? "/api/connections/tiktok/start" : undefined}
              aria-disabled={!connection?.configured}
            >
              <ShieldCheck size={16} /> Connect TikTok
            </a>
          )}
        </div>
        <div className={styles.connectionFacts}>
          <span>
            <CheckCircle2 size={14} /> Recommended music forced on
          </span>
          <span>
            <ShieldCheck size={14} /> ChezaHub account only
          </span>
          <span>
            <Clock3 size={14} /> {connection?.unaudited !== false ? "Only me during API testing" : connection?.privacyLevel || "Creator privacy"}
          </span>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.composer}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>NEW TIKTOK POST</p>
              <h2>Poster or photo carousel</h2>
            </div>
            <span>{images.length}/10 images</span>
          </div>

          <label className={styles.dropzone}>
            <ImagePlus size={26} />
            <strong>Choose ChezaHub posters</strong>
            <span>PNG, JPG, or WebP. Socio converts them to TikTok-ready WebP/JPEG at 1080p.</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => chooseImages(event.target.files)}
              disabled={busy || images.length >= 10}
            />
          </label>

          {images.length ? (
            <div className={styles.previews}>
              {images.map((item, index) => (
                <figure key={item.id}>
                  <img src={item.preview} alt={`TikTok slide ${index + 1}`} />
                  <figcaption>{index + 1}</figcaption>
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
                    aria-label={`Remove slide ${index + 1}`}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                  </button>
                </figure>
              ))}
            </div>
          ) : null}

          <label className={styles.field}>
            <span>Post title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="ChezaHub offer or announcement"
              disabled={busy}
            />
          </label>
          <label className={styles.field}>
            <span>Description / caption</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={2200}
              rows={6}
              placeholder="Write the TikTok caption and hashtags…"
              disabled={busy}
            />
          </label>

          <div className={styles.scheduleRow}>
            <label className={styles.field}>
              <span>Schedule date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className={styles.field}>
              <span>Schedule time (EAT)</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <aside className={styles.musicNotice}>
            <Music2 size={19} />
            <div>
              <strong>Music is not optional in this flow</strong>
              <p>
                SMMPRO sends <code>auto_add_music: true</code> on every TikTok
                photo post. TikTok chooses the recommended track; the API cannot
                pick a specific song.
              </p>
            </div>
          </aside>

          {progress > 0 ? (
            <div className={styles.progress}>
              <span style={{ width: `${progress}%` }} />
              <b>{progress}%</b>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button
              className={styles.ghostButton}
              onClick={() => createPost("draft")}
              disabled={busy || !images.length}
            >
              <UploadCloud size={16} /> Save draft
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => createPost("schedule")}
              disabled={busy || !images.length || !connection?.connected}
            >
              <CalendarClock size={16} /> Schedule
            </button>
            <button
              className={styles.primaryButton}
              onClick={() => createPost("publish")}
              disabled={busy || !images.length || !connection?.connected}
            >
              {busy ? <LoaderCircle size={16} className={styles.spin} /> : <Send size={16} />}
              Publish now
            </button>
          </div>
        </section>

        <section className={styles.activity}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>ACTIVITY</p>
              <h2>Recent TikTok posts</h2>
            </div>
            <span>{posts.length}</span>
          </div>
          {posts.length ? (
            <div className={styles.postList}>
              {posts.map((post) => {
                const target = post.targets.find(
                  (value) => String(value.platform).toLowerCase() === "tiktok",
                );
                return (
                  <article key={post.id}>
                    {post.media[0]?.imageUrl ? (
                      <img src={post.media[0].imageUrl} alt="" />
                    ) : null}
                    <div>
                      <strong>{post.title}</strong>
                      <span>{formatDate(post.scheduledAt)}</span>
                      <small>
                        TikTok: {target?.status || post.status}
                        {target?.providerPublishId ? " · publish ID saved" : ""}
                      </small>
                      {target?.lastError || post.lastError ? (
                        <p>{target?.lastError || post.lastError}</p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <Music2 size={24} />
              <strong>No TikTok posts yet</strong>
              <p>Your ChezaHub TikTok drafts and schedules will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
