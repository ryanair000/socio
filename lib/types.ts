export const BRANDS = ["chezahub", "jengasites"] as const;
export const PLATFORMS = ["facebook", "instagram", "tiktok"] as const;
export const POST_FORMATS = ["single", "carousel"] as const;
export const POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "partially_published",
  "failed",
  "cancelled",
] as const;
export const QA_STATUSES = ["ready", "ready_after_qa", "hold"] as const;
export const TARGET_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
] as const;

export type Brand = (typeof BRANDS)[number];
export type Platform = "facebook" | "instagram";
export type PublishPlatform = (typeof PLATFORMS)[number];
export type PostFormat = (typeof POST_FORMATS)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type TargetStatus = (typeof TARGET_STATUSES)[number];
export type QaStatus = (typeof QA_STATUSES)[number];

export type PostTarget = {
  platform: Platform;
  status: TargetStatus;
  providerPostId: string | null;
  providerPublishId: string | null;
  lastError: string | null;
  attempts: number;
  idempotencyKey: string;
  publishedAt: string | null;
};

export type PostMedia = {
  imageUrl: string;
  imagePathname: string;
  position: number;
};

export type ScheduledPost = {
  id: string;
  title: string;
  caption: string;
  brand: Brand;
  format: PostFormat;
  imageUrl: string;
  imagePathname: string;
  media: PostMedia[];
  status: PostStatus;
  scheduledAt: string | null;
  scheduleVersion: number;
  workflowRunId: string | null;
  lastError: string | null;
  qaStatus: QaStatus;
  holdReason: string | null;
  sourceWeek: string | null;
  sourceRef: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
};

export type PublisherConnection = {
  connected: boolean;
  expiresAt: string | null;
  remainingHours: number | null;
};
