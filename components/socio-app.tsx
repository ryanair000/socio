"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Facebook,
  FileText,
  Instagram,
  LayoutDashboard,
  LayoutList,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
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

type Tab =
  | "dashboard"
  | "calendar"
  | "new_post"
  | "drafts"
  | "posts"
  | "publishing"
  | "connections";

const tabs: Array<{ id: Tab; label: string; icon: typeof CalendarDays }> = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "new_post", label: "New Post", icon: Plus },
  { id: "publishing", label: "Publishing", icon: Send },
  { id: "connections", label: "Connections", icon: Settings2 },
];

const statusLabels: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  partially_published: "Partially published",
  failed: "Failed",
  cancelled: "Cancelled",
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
  onPublishNow,
  onDuplicate,
  onCancel,
  busy,
}: {
  post: ScheduledPost;
  onEdit: (post: ScheduledPost) => void;
  onRetry: (post: ScheduledPost) => void;
  onPublishNow: (post: ScheduledPost) => void;
  onDuplicate: (post: ScheduledPost) => void;
  onCancel: (post: ScheduledPost) => void;
  busy: boolean;
}) {
  const overdue =
    Boolean(post.scheduledAt) &&
    new Date(String(post.scheduledAt)).getTime() < Date.now() &&
    ["draft", "scheduled"].includes(post.status);
  const editable = ["draft", "scheduled"].includes(post.status);
  return (
    <article
      className={`calendar-card card-${post.status}${overdue ? " overdue" : ""}`}
    >
      <div className="card-media">
        <Image
          src={post.imageUrl}
          alt={`${post.title} poster`}
          width={400}
          height={500}
          sizes="(max-width: 760px) 175px, 200px"
        />
        {post.media.length > 1 ? (
          <span className="slide-count">{post.media.length} slides</span>
        ) : null}
      </div>
      <div className="calendar-card-body">
        <div className="card-time">
          <Clock3 size={13} /> {formatTime(post.scheduledAt)}
          {overdue ? <span className="overdue-flag">Overdue</span> : null}
        </div>
        <strong>{post.title}</strong>
        <div className="card-meta">
          <StatusBadge status={post.status} />
          {post.qaStatus !== "ready" ? (
            <span className={`qa-badge qa-${post.qaStatus}`}>
              {post.qaStatus === "hold" ? "HOLD" : "READY AFTER QA"}
            </span>
          ) : null}
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
        {editable ? (
          <button
            className="inline-action post-now-action"
            onClick={() => onPublishNow(post)}
            disabled={busy}
            title="Publish this post immediately"
          >
            <Send size={13} /> Post now
          </button>
        ) : null}
        {editable ? (
          <div className="card-secondary-actions">
            <button
              className="card-secondary-action"
              onClick={() => onEdit(post)}
              disabled={busy}
            >
              <Pencil size={12} /> Edit
            </button>
            <details className="card-more-actions">
              <summary aria-label={`More actions for ${post.title}`}>
                <MoreHorizontal size={14} /> More
              </summary>
              <div>
                <button onClick={() => onDuplicate(post)} disabled={busy}>
                  <Plus size={12} /> Duplicate
                </button>
                <button
                  className="danger-text"
                  onClick={() => onCancel(post)}
                  disabled={busy}
                >
                  <X size={12} /> Cancel post
                </button>
              </div>
            </details>
          </div>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledPost | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const end = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      const body = (await response.json()) as {
        posts?: ScheduledPost[];
        error?: string;
      };
      if (response.ok && body.posts) {
        setPosts(body.posts);
        setLastSyncedAt(new Date());
      } else if (!quiet) {
        setMessage(body.error || "Could not refresh posts.");
      }
    } catch {
      if (!quiet) setMessage("Could not refresh posts.");
    } finally {
      if (!quiet) setRefreshing(false);
    }
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
  const completedPosts = posts.filter((post) => post.status !== "draft");
  const counts = posts.reduce<Record<PostStatus, number>>(
    (acc, post) => ({ ...acc, [post.status]: acc[post.status] + 1 }),
    {
      draft: 0,
      scheduled: 0,
      publishing: 0,
      published: 0,
      partially_published: 0,
      failed: 0,
      cancelled: 0,
    },
  );
  const terminalTargets = posts.flatMap((post) =>
    post.targets.filter((target) =>
      ["published", "failed"].includes(target.status),
    ),
  );
  const publishedTargets = terminalTargets.filter(
    (target) => target.status === "published",
  ).length;
  const failedTargets = terminalTargets.filter(
    (target) => target.status === "failed",
  ).length;
  const deliveryRate = terminalTargets.length
    ? Math.round((publishedTargets / terminalTargets.length) * 100)
    : null;
  const weeklyActivity = weekDays.map((day) => {
    const items = weekPosts.filter(
      (post) => post.scheduledAt && dateKey(post.scheduledAt) === dateKey(day),
    );
    return {
      day,
      total: items.length,
      published: items.filter((post) => post.status === "published").length,
    };
  });
  const maxWeeklyActivity = Math.max(
    1,
    ...weeklyActivity.map((item) => item.total),
  );
  const channelAnalytics = (["facebook", "instagram"] as const).map(
    (platform) => {
      const targets = posts.flatMap((post) =>
        post.targets.filter((target) => target.platform === platform),
      );
      const published = targets.filter(
        (target) => target.status === "published",
      ).length;
      const failed = targets.filter(
        (target) => target.status === "failed",
      ).length;
      const queued = targets.filter((target) =>
        ["scheduled", "publishing"].includes(target.status),
      ).length;
      const completed = published + failed;
      return {
        platform,
        published,
        failed,
        queued,
        rate: completed ? Math.round((published / completed) * 100) : null,
      };
    },
  );
  const upcomingPosts = posts
    .filter(
      (post) =>
        post.scheduledAt &&
        new Date(post.scheduledAt).getTime() > Date.now() &&
        ["scheduled", "publishing"].includes(post.status),
    )
    .sort(
      (a, b) =>
        new Date(String(a.scheduledAt)).getTime() -
        new Date(String(b.scheduledAt)).getTime(),
    )
    .slice(0, 4);
  const recentPosts = [...posts]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

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

  async function publishNow(post: ScheduledPost) {
    const targets = post.targets.map((target) => target.platform).join(" and ");
    if (
      !window.confirm(
        `Publish post “${post.title}” now to ${targets}? Only unpublished targets will run.`,
      )
    )
      return;
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}/publish-now`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Publishing queued for the confirmed targets."
        : body.error || "Could not publish this post.",
    );
    setBusyId("");
    await refresh(true);
  }

  async function approveQa(post: ScheduledPost) {
    if (
      !window.confirm(
        `Confirm that the QA corrections for “${post.title}” are complete?`,
      )
    )
      return;
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}/approve`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Post approved for scheduling."
        : body.error || "Could not approve post.",
    );
    setBusyId("");
    await refresh(true);
  }

  async function duplicate(post: ScheduledPost) {
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}/duplicate`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Draft duplicate created."
        : body.error || "Could not duplicate post.",
    );
    setBusyId("");
    await refresh(true);
  }

  async function cancel(post: ScheduledPost) {
    if (
      !window.confirm(
        `Cancel “${post.title}”? Any waiting workflow will become stale.`,
      )
    )
      return;
    setBusyId(post.id);
    const response = await fetch(`/api/posts/${post.id}/cancel`, {
      method: "POST",
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok ? "Post cancelled." : body.error || "Could not cancel post.",
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
    <main
      className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
    >
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">S</div>
          <strong>Socio</strong>
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          aria-controls="primary-navigation"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
        <nav id="primary-navigation" aria-label="Primary navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
              title={sidebarCollapsed ? label : undefined}
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

        {tab === "dashboard" ? (
          <div className="page-content dashboard-page">
            <section className="dashboard-intro">
              <div>
                <p className="eyebrow">LIVE CONTENT OPERATIONS</p>
                <h2>Here’s how your publishing is performing.</h2>
                <p>
                  Synced from every draft, schedule, and Facebook or Instagram
                  delivery result.
                </p>
              </div>
              <div className="sync-actions">
                <span className="sync-badge">
                  <span className="sync-dot" /> Synced at{" "}
                  {lastSyncedAt.toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  className="button ghost"
                  onClick={() => refresh()}
                  disabled={refreshing}
                  aria-label="Refresh dashboard analytics"
                >
                  <RefreshCw
                    className={refreshing ? "spin" : undefined}
                    size={16}
                  />
                  Refresh
                </button>
              </div>
            </section>

            <section className="dashboard-kpis" aria-label="Key analytics">
              <MetricCard
                icon={CalendarDays}
                label="Posts this week"
                value={String(weekPosts.length)}
                detail={`${weeklyActivity.filter((item) => item.total).length} active days`}
              />
              <MetricCard
                icon={CircleCheck}
                label="Published targets"
                value={String(publishedTargets)}
                detail={`${terminalTargets.length} completed deliveries`}
                tone="green"
              />
              <MetricCard
                icon={BarChart3}
                label="Delivery rate"
                value={deliveryRate === null ? "—" : `${deliveryRate}%`}
                detail={`${failedTargets} failed ${failedTargets === 1 ? "target" : "targets"}`}
                tone={failedTargets ? "orange" : "green"}
              />
              <MetricCard
                icon={FileText}
                label="Drafts waiting"
                value={String(counts.draft)}
                detail={counts.draft ? "Ready to review" : "Inbox is clear"}
                tone={counts.draft ? "red" : "green"}
              />
            </section>

            <div className="dashboard-main-grid">
              <section className="data-panel analytics-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Weekly content activity</h2>
                    <p>{rangeLabel} · scheduled posts by day</p>
                  </div>
                  <span>{weekPosts.length} posts</span>
                </div>
                <div
                  className="weekly-chart"
                  role="img"
                  aria-label={`Weekly chart showing ${weekPosts.length} scheduled posts`}
                >
                  {weeklyActivity.map((item) => (
                    <div className="chart-day" key={dateKey(item.day)}>
                      <strong>{item.total}</strong>
                      <span className="chart-track">
                        <i
                          style={{
                            height: item.total
                              ? `${Math.max(
                                  14,
                                  Math.round(
                                    (item.total / maxWeeklyActivity) * 100,
                                  ),
                                )}%`
                              : "4px",
                          }}
                        />
                      </span>
                      <small>
                        {item.day.toLocaleDateString("en-KE", {
                          weekday: "short",
                        })}
                      </small>
                    </div>
                  ))}
                </div>
                <div className="chart-footer">
                  <span>
                    <i /> Scheduled volume
                  </span>
                  <strong>
                    {weeklyActivity.reduce(
                      (sum, item) => sum + item.published,
                      0,
                    )}{" "}
                    published this week
                  </strong>
                </div>
              </section>

              <section className="data-panel channel-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Channel health</h2>
                    <p>All completed and queued targets.</p>
                  </div>
                  <span>Live</span>
                </div>
                <div className="channel-list">
                  {channelAnalytics.map((channel) => (
                    <article className="channel-row" key={channel.platform}>
                      <div className={`channel-icon ${channel.platform}`}>
                        <PlatformIcon platform={channel.platform} />
                      </div>
                      <div className="channel-main">
                        <div>
                          <strong>
                            {channel.platform === "facebook"
                              ? "Facebook"
                              : "Instagram"}
                          </strong>
                          <b>
                            {channel.rate === null ? "—" : `${channel.rate}%`}
                          </b>
                        </div>
                        <span className="health-track">
                          <i style={{ width: `${channel.rate ?? 0}%` }} />
                        </span>
                        <p>
                          {channel.published} published · {channel.failed}{" "}
                          failed · {channel.queued} queued
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                <button
                  className="panel-link"
                  onClick={() => setTab("publishing")}
                >
                  View publishing activity <ChevronRight size={15} />
                </button>
              </section>
            </div>

            <div className="dashboard-lower-grid">
              <section className="data-panel dashboard-list-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Coming up</h2>
                    <p>Your next scheduled posts.</p>
                  </div>
                  <button
                    className="panel-link"
                    onClick={() => setTab("calendar")}
                  >
                    Calendar <ChevronRight size={14} />
                  </button>
                </div>
                <div className="dashboard-list">
                  {upcomingPosts.length ? (
                    upcomingPosts.map((post) => (
                      <DashboardPostRow post={post} key={post.id} />
                    ))
                  ) : (
                    <CompactEmpty
                      title="Nothing scheduled next"
                      description="Add posters and choose a future time to fill the queue."
                      onAdd={() => openComposer()}
                    />
                  )}
                </div>
              </section>

              <section className="data-panel dashboard-list-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Latest updates across all content.</p>
                  </div>
                  <button
                    className="panel-link"
                    onClick={() => setTab("posts")}
                  >
                    All posts <ChevronRight size={14} />
                  </button>
                </div>
                <div className="dashboard-list">
                  {recentPosts.length ? (
                    recentPosts.map((post) => (
                      <DashboardPostRow post={post} recent key={post.id} />
                    ))
                  ) : (
                    <CompactEmpty
                      title="No activity yet"
                      description="Your latest content updates will appear here."
                      onAdd={() => openComposer()}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {tab === "new_post" ? (
          <div className="page-content new-post-page">
            <section className="data-panel new-post-start">
              <div>
                <p className="eyebrow">CREATE CONTENT</p>
                <h2>Upload one post or an ordered carousel.</h2>
                <p>
                  Add 1–10 finished images, edit the caption, select Facebook,
                  Instagram or both, then save a draft or schedule in EAT.
                </p>
              </div>
              <button className="button primary" onClick={() => openComposer()}>
                <Plus size={18} /> Create post
              </button>
            </section>
            <Week1Importer
              onImported={async (summary) => {
                setMessage(summary);
                await refresh(true);
                setTab("calendar");
              }}
            />
          </div>
        ) : null}

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
                              onPublishNow={publishNow}
                              onDuplicate={duplicate}
                              onCancel={cancel}
                              busy={busyId === post.id}
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
            {drafts.some((post) => !post.scheduledAt) ? (
              <section className="data-panel unscheduled-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Unscheduled drafts</h2>
                    <p>Drafts that still need an EAT date and time.</p>
                  </div>
                </div>
                <div className="post-list">
                  {drafts
                    .filter((post) => !post.scheduledAt)
                    .map((post) => (
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
                            {post.format === "carousel"
                              ? `${post.media.length} slides`
                              : "Single image"}
                          </span>
                        </div>
                        <StatusBadge status={post.status} />
                        <button
                          className="button ghost small"
                          onClick={() => openComposer(post)}
                        >
                          Edit
                        </button>
                        <button
                          className="button ghost small danger-text"
                          onClick={() => removeDraft(post)}
                          aria-label={`Delete ${post.title}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </article>
                    ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "drafts" ? (
          <div className="page-content">
            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <h2>Drafts</h2>
                  <p>Unscheduled posts waiting for a date.</p>
                </div>
                <span>
                  {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
                </span>
              </div>
              <div className="post-list">
                {drafts.length ? (
                  drafts.map((post) => (
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
                          ·{" "}
                          {post.format === "carousel"
                            ? `${post.media.length} slides`
                            : "Single image"}
                        </span>
                      </div>
                      <div className="target-pills">
                        {post.targets.map((target) => (
                          <span key={target.platform}>
                            <PlatformIcon platform={target.platform} />{" "}
                            {target.platform}
                          </span>
                        ))}
                      </div>
                      <StatusBadge status={post.status} />
                      <div className="row-actions draft-actions">
                        <button
                          className="button ghost small"
                          onClick={() => openComposer(post)}
                        >
                          Edit
                        </button>
                        <button
                          className="button ghost small danger-text"
                          disabled={busyId === post.id}
                          onClick={() => removeDraft(post)}
                          aria-label={`Delete ${post.title}`}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <DraftEmptyState onAdd={() => openComposer()} />
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "posts" ? (
          <div className="page-content">
            <section className="data-panel">
              <div className="panel-heading">
                <div>
                  <h2>Posts</h2>
                  <p>Scheduled, publishing, published, and failed posts.</p>
                </div>
                <span>{completedPosts.length} posts</span>
              </div>
              <div className="post-list">
                {completedPosts.length ? (
                  completedPosts.map((post) => (
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
                {posts.map((post) => (
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
                    {post.qaStatus !== "ready" ? (
                      <div className={`qa-notice qa-${post.qaStatus}`}>
                        <strong>
                          {post.qaStatus === "hold" ? "HOLD" : "READY AFTER QA"}
                        </strong>
                        <span>{post.holdReason}</span>
                      </div>
                    ) : null}
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
                    {["failed", "partially_published"].includes(post.status) ? (
                      <button
                        className="button secondary small"
                        disabled={busyId === post.id}
                        onClick={() => retry(post)}
                      >
                        <RotateCcw size={14} /> Retry failed targets
                      </button>
                    ) : null}
                    {post.qaStatus === "ready_after_qa" ? (
                      <button
                        className="button ghost small"
                        disabled={busyId === post.id}
                        onClick={() => approveQa(post)}
                      >
                        <CircleCheck size={14} /> Confirm QA complete
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
          onSaved={async (result) => {
            setComposerOpen(false);
            setMessage(
              result === "published"
                ? "Publishing queued for the confirmed targets."
                : editing
                  ? "Post updated."
                  : "Posters saved.",
            );
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

function Week1Importer({
  onImported,
}: {
  onImported: (summary: string) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function importPack() {
    if (!file || pending) return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("pack", file);
      const response = await fetch("/api/import/week1", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        day?: string;
        imported?: number;
        ready?: number;
        blocked?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Import failed.");
      await onImported(
        `${body.day}: imported ${body.imported} drafts (${body.ready} ready, ${body.blocked} QA-blocked).`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Import failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="data-panel week1-importer">
      <div>
        <p className="eyebrow">WEEK 1 IMPORT</p>
        <h2>Import one organized day pack</h2>
        <p>
          Select a Monday–Sunday ZIP from Drive. Socio preserves all five
          planned slots, ordered slides, captions, EAT times, and QA holds as
          drafts. HOLD content can never enter the queue.
        </p>
      </div>
      <label className="import-file">
        <span>Day ZIP pack</span>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <small>{file ? file.name : "Maximum 25 MB"}</small>
      </label>
      <button
        className="button secondary"
        onClick={importPack}
        disabled={!file || pending}
      >
        {pending ? (
          <RefreshCw className="spin" size={16} />
        ) : (
          <FileText size={16} />
        )}
        {pending ? "Importing…" : "Import day pack"}
      </button>
      {error ? (
        <p className="row-error" role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      ) : null}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "green" | "orange" | "red";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon">
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function DashboardPostRow({
  post,
  recent = false,
}: {
  post: ScheduledPost;
  recent?: boolean;
}) {
  const dateValue = recent ? post.updatedAt : post.scheduledAt;
  return (
    <article className="dashboard-post-row">
      <Image src={post.imageUrl} alt="" width={88} height={88} sizes="44px" />
      <div>
        <strong>{post.title}</strong>
        <span>
          {post.brand === "chezahub" ? "ChezaHub" : "JengaSites"} ·{" "}
          {formatDashboardDate(dateValue)}
        </span>
      </div>
      <StatusBadge status={post.status} />
    </article>
  );
}

function formatDashboardDate(value: string | null) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  })}, ${date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function CompactEmpty({
  title,
  description,
  onAdd,
}: {
  title: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="compact-empty">
      <CalendarDays size={22} />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button className="button ghost small" onClick={onAdd}>
        <Plus size={14} /> Add posters
      </button>
    </div>
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

function DraftEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <FileText size={28} />
      <h3>No drafts</h3>
      <p>New unfinished posts will be kept here until you schedule them.</p>
      <button className="button primary" onClick={onAdd}>
        <Plus size={16} /> Add posters
      </button>
    </div>
  );
}
