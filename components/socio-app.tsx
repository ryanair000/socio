"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Facebook,
  Instagram,
  LayoutList,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { PostComposer } from "@/components/post-composer";
import {
  addDays,
  dateKey,
  formatDay,
  formatTime,
  startOfWeek,
} from "@/lib/calendar";
import type {
  PostStatus,
  PublisherConnection,
  ScheduledPost,
} from "@/lib/types";

type Tab = "calendar" | "posts" | "publishing" | "connections";

const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "posts", label: "Posts", icon: LayoutList },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "connections", label: "Connections", icon: Settings2 },
];

const statusLabels: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={`status status-${status}`}>
      {status === "publishing" ? <span className="pulse" /> : null}
      {statusLabels[status]}
    </span>
  );
}

function PlatformIcon({ platform }: { platform: "facebook" | "instagram" }) {
  return platform === "facebook" ? (
    <Facebook size={13} />
  ) : (
    <Instagram size={13} />
  );
}

function PostCard({
  post,
  onEdit,
  onRetry,
}: {
  post: ScheduledPost;
  onEdit: (post: ScheduledPost) => void;
  onRetry: (post: ScheduledPost) => void;
}) {
  return (
    <article className={`calendar-card card-${post.status}`}>
      <Image
        src={post.imageUrl}
        alt=""
        width={400}
        height={500}
        sizes="(max-width: 760px) 175px, 200px"
      />
      <div className="calendar-card-body">
        <div className="card-time">
          <Clock3 size={13} /> {formatTime(post.scheduledAt)}
        </div>
        <strong>{post.title}</strong>
        <div className="card-meta">
          <StatusBadge status={post.status} />
          <span className="platform-icons">
            {post.targets.map((target) => (
              <PlatformIcon platform={target.platform} key={target.platform} />
            ))}
          </span>
        </div>
        {post.status === "failed" ? (
          <button className="inline-action" onClick={() => onRetry(post)}>
            <RotateCcw size={13} /> Retry failed
          </button>
        ) : null}
        {["draft", "scheduled"].includes(post.status) ? (
          <button
            className="card-overlay"
            aria-label={`Edit ${post.title}`}
            onClick={() => onEdit(post)}
          />
        ) : null}
      </div>
    </article>
  );
}

export function SocioApp({
  initialPosts,
  initialConnection,
}: {
  initialPosts: ScheduledPost[];
  initialConnection: PublisherConnection;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [connection, setConnection] = useState(initialConnection);
  const [tab, setTab] = useState<Tab>("calendar");
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledPost | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const end = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const refresh = useCallback(async (quiet = false) => {
    const response = await fetch("/api/posts", { cache: "no-store" });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    const body = (await response.json()) as {
      posts?: ScheduledPost[];
      error?: string;
    };
    if (response.ok && body.posts) setPosts(body.posts);
    else if (!quiet) setMessage(body.error || "Could not refresh posts.");
  }, []);

  useEffect(() => {
    refresh(true);
    const timer = window.setInterval(() => refresh(true), 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const weekPosts = useMemo(
    () =>
      posts.filter(
        (post) =>
          post.scheduledAt &&
          dateKey(post.scheduledAt) >= dateKey(weekStart) &&
          dateKey(post.scheduledAt) < dateKey(end),
      ),
    [posts, weekStart, end],
  );
  const drafts = posts.filter((post) => post.status === "draft");
  const counts = posts.reduce<Record<PostStatus, number>>(
    (acc, post) => ({ ...acc, [post.status]: acc[post.status] + 1 }),
    { draft: 0, scheduled: 0, publishing: 0, published: 0, failed: 0 },
  );

  async function retry(post: ScheduledPost) {
    if (
      !window.confirm(
        `Retry only the failed platform targets for “${post.title}”?`,
      )
    )
      return;
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}/retry`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Retry queued. Successful platform targets will not be reposted."
        : body.error || "Retry failed.",
    );
    setBusyId("");
    await refresh(true);
  }

  async function removeDraft(post: ScheduledPost) {
    if (
      !window.confirm(
        `Delete the draft “${post.title}” and its uploaded image?`,
      )
    )
      return;
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "DELETE",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok ? "Draft deleted." : body.error || "Could not delete draft.",
    );
    setBusyId("");
    await refresh(true);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.assign("/login");
  }

  async function refreshConnection() {
    const response = await fetch("/api/connections", { cache: "no-store" });
    const body = (await response.json()) as PublisherConnection & {
      error?: string;
    };
    if (response.ok) {
      setConnection(body);
      setMessage(
        body.connected
          ? "SMMPRO connection verified."
          : "Publisher session needs to be refreshed.",
      );
    } else setMessage(body.error || "Could not verify connection.");
  }

  function openComposer(post?: ScheduledPost) {
    setEditing(post ?? null);
    setComposerOpen(true);
  }

  const rangeLabel = `${formatDay(weekStart)} – ${formatDay(addDays(weekStart, 6))}`;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <strong>Socio</strong>
        </div>
        <nav aria-label="Primary navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "publishing" && counts.failed ? (
                <b>{counts.failed}</b>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div
            className={
              connection.connected
                ? "connection-chip connected"
                : "connection-chip"
            }
          >
            {connection.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>
              {connection.connected ? "Publisher ready" : "Reconnect needed"}
            </span>
          </div>
          <button className="nav-item" onClick={logout} aria-label="Sign out">
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">CHEZAHUB + JENGASITES</p>
            <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          </div>
          <button className="button primary" onClick={() => openComposer()}>
            <Plus size={18} /> Add posters
          </button>
        </header>

        {tab === "calendar" ? (
          <div className="page-content">
            <section className="week-toolbar">
              <div className="week-controls">
                <button
                  className="icon-button"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  aria-label="Previous week"
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  className="button ghost"
                  onClick={() => setWeekStart(startOfWeek())}
                >
                  This week
                </button>
                <button
                  className="icon-button"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  aria-label="Next week"
                >
                  <ChevronRight size={19} />
                </button>
              </div>
              <div>
                <h2>{rangeLabel}</h2>
                <p>East Africa Time (EAT)</p>
              </div>
              <button className="button ghost" onClick={() => refresh()}>
                <RefreshCw size={16} /> Refresh
              </button>
            </section>

            <section className="summary-row" aria-label="Weekly post summary">
              <div>
                <span>Drafts</span>
                <strong>{counts.draft}</strong>
              </div>
              <div>
                <span>Scheduled</span>
                <strong>{counts.scheduled}</strong>
              </div>
              <div>
                <span>Publishing</span>
                <strong>{counts.publishing}</strong>
              </div>
              <div>
                <span>Published</span>
                <strong>{counts.published}</strong>
              </div>
              <div className={counts.failed ? "has-failures" : ""}>
                <span>Failed</span>
                <strong>{counts.failed}</strong>
              </div>
            </section>

            {drafts.length ? (
              <section className="draft-tray">
                <div>
                  <strong>Unscheduled drafts</strong>
                  <span>{drafts.length} waiting for a date</span>
                </div>
                <div className="draft-strip">
                  {drafts.map((post) => (
                    <PostCard
                      post={post}
                      onEdit={openComposer}
                      onRetry={retry}
                      key={post.id}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="week-grid">
              {weekDays.map((day) => {
                const key = dateKey(day);
                const dayPosts = weekPosts.filter(
                  (post) =>
                    post.scheduledAt && dateKey(post.scheduledAt) === key,
                );
                const isToday = key === dateKey(new Date());
                return (
                  <div
                    className={isToday ? "day-column today" : "day-column"}
                    key={key}
                  >
                    <header>
                      <span>{formatDay(day)}</span>
                      <b>{dayPosts.length}</b>
                    </header>
                    <div className="day-posts">
                      {dayPosts.length ? (
                        dayPosts
                          .sort((a, b) =>
                            String(a.scheduledAt).localeCompare(
                              String(b.scheduledAt),
                            ),
                          )
                          .map((post) => (
                            <PostCard
                              post={post}
                              onEdit={openComposer}
                              onRetry={retry}
                              key={post.id}
                            />
                          ))
                      ) : (
                        <button
                          className="empty-day"
                          onClick={() => openComposer()}
                        >
                          <Plus size={16} /> Add post
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        ) : null}

        {tab === "posts" ? (
          <div className="page-content">
            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <h2>All posts</h2>
                  <p>Drafts and published work in one clean list.</p>
                </div>
                <span>{posts.length} posts</span>
              </div>
              <div className="post-list">
                {posts.length ? (
                  posts.map((post) => (
                    <article className="post-row" key={post.id}>
                      <Image
                        src={post.imageUrl}
                        alt=""
                        width={104}
                        height={104}
                        sizes="52px"
                      />
                      <div className="post-row-main">
                        <strong>{post.title}</strong>
                        <span>
                          {post.brand === "chezahub"
                            ? "ChezaHub"
                            : "JengaSites"}{" "}
                          · {formatTime(post.scheduledAt)}
                        </span>
                      </div>
                      <div className="target-pills">
                        {post.targets.map((target) => (
                          <span
                            className={`target-${target.status}`}
                            key={target.platform}
                          >
                            <PlatformIcon platform={target.platform} />{" "}
                            {target.status}
                          </span>
                        ))}
                      </div>
                      <StatusBadge status={post.status} />
                      <div className="row-actions">
                        {["draft", "scheduled"].includes(post.status) ? (
                          <button
                            className="button ghost small"
                            onClick={() => openComposer(post)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {post.status === "failed" ? (
                          <button
                            className="button ghost small"
                            disabled={busyId === post.id}
                            onClick={() => retry(post)}
                          >
                            <RotateCcw size={14} /> Retry
                          </button>
                        ) : null}
                        {post.status === "draft" ? (
                          <button
                            className="icon-button danger"
                            disabled={busyId === post.id}
                            onClick={() => removeDraft(post)}
                            aria-label={`Delete ${post.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState onAdd={() => openComposer()} />
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "publishing" ? (
          <div className="page-content publishing-layout">
            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <h2>Publishing activity</h2>
                  <p>Facebook and Instagram are tracked independently.</p>
                </div>
                <button className="button ghost" onClick={() => refresh()}>
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
              <div className="post-list">
                {posts
                  .filter((post) => post.status !== "draft")
                  .map((post) => (
                    <article className="publish-row" key={post.id}>
                      <Image
                        src={post.imageUrl}
                        alt=""
                        width={104}
                        height={104}
                        sizes="52px"
                      />
                      <div>
                        <strong>{post.title}</strong>
                        <span>
                          {post.scheduledAt
                            ? `${formatDay(new Date(post.scheduledAt))}, ${formatTime(post.scheduledAt)}`
                            : "No schedule"}
                        </span>
                      </div>
                      <StatusBadge status={post.status} />
                      <div className="publish-targets">
                        {post.targets.map((target) => (
                          <div key={target.platform}>
                            <span>
                              <PlatformIcon platform={target.platform} />{" "}
                              {target.platform}
                            </span>
                            <b className={`target-text-${target.status}`}>
                              {target.status}
                            </b>
                            <small>
                              {target.attempts} attempt
                              {target.attempts === 1 ? "" : "s"}
                            </small>
                          </div>
                        ))}
                      </div>
                      {post.lastError ? (
                        <p className="row-error">
                          <AlertCircle size={14} /> {post.lastError}
                        </p>
                      ) : null}
                      {post.status === "failed" ? (
                        <button
                          className="button secondary small"
                          disabled={busyId === post.id}
                          onClick={() => retry(post)}
                        >
                          <RotateCcw size={14} /> Retry failed targets
                        </button>
                      ) : null}
                    </article>
                  ))}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "connections" ? (
          <div className="page-content connections-page">
            <section className="connection-card primary-connection">
              <div
                className={
                  connection.connected
                    ? "connection-icon good"
                    : "connection-icon bad"
                }
              >
                {connection.connected ? (
                  <Wifi size={24} />
                ) : (
                  <WifiOff size={24} />
                )}
              </div>
              <div>
                <p className="eyebrow">PUBLISHING BACKEND</p>
                <h2>SMMPRO</h2>
                <p>
                  Meta credentials remain stored in the existing SMMPRO Vercel
                  project.
                </p>
              </div>
              <StatusBadge
                status={connection.connected ? "published" : "failed"}
              />
              <button className="button ghost" onClick={refreshConnection}>
                <RefreshCw size={16} /> Check now
              </button>
            </section>
            <section className="connection-grid">
              <div className="connection-card">
                <Facebook size={21} />
                <div>
                  <strong>Facebook Pages</strong>
                  <span>Published through SMMPRO per brand</span>
                </div>
                <CircleCheck size={18} className="success-icon" />
              </div>
              <div className="connection-card">
                <Instagram size={21} />
                <div>
                  <strong>Instagram</strong>
                  <span>Public Blob image URL + SMMPRO Meta token</span>
                </div>
                <CircleCheck size={18} className="success-icon" />
              </div>
              <div className="connection-card">
                <Clock3 size={21} />
                <div>
                  <strong>Publisher session</strong>
                  <span>
                    {connection.connected
                      ? `${connection.remainingHours} hours remaining`
                      : "Sign in again to refresh"}
                  </span>
                </div>
                {connection.connected ? (
                  <CircleCheck size={18} className="success-icon" />
                ) : (
                  <AlertCircle size={18} className="danger-icon" />
                )}
              </div>
            </section>
            <aside className="info-callout">
              <AlertCircle size={18} />
              <div>
                <strong>Weekly session model</strong>
                <p>
                  SMMPRO sessions last seven days. Socio blocks schedules beyond
                  the active session and asks you to sign in again before
                  retrying an expired job.
                </p>
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      {composerOpen ? (
        <PostComposer
          editing={editing}
          onClose={() => setComposerOpen(false)}
          onSaved={async () => {
            setComposerOpen(false);
            setMessage(editing ? "Post updated." : "Posters saved.");
            await refresh(true);
          }}
        />
      ) : null}
      {message ? (
        <div className="toast" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ) : null}
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <CalendarDays size={28} />
      <h3>No posts yet</h3>
      <p>Upload finished poster images and captions to build the week.</p>
      <button className="button primary" onClick={onAdd}>
        <Plus size={16} /> Add posters
      </button>
    </div>
  );
}
