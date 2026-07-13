export const BRANDS = ["chezahub", "jengasites"] as const;
export const PLATFORMS = ["facebook", "instagram"] as const;
export const POST_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;
export const TARGET_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;

export type Brand = (typeof BRANDS)[number];
export type Platform = (typeof PLATFORMS)[number];
export type PostStatus = (typeof POST_STATUSES)[number];
export type TargetStatus = (typeof TARGET_STATUSES)[number];

export type PostTarget = {
  platform: Platform;
  status: TargetStatus;
  providerPostId: string | null;
  lastError: string | null;
  attempts: number;
};

export type ScheduledPost = {
  id: string;
  title: string;
  caption: string;
  brand: Brand;
  imageUrl: string;
  imagePathname: string;
  status: PostStatus;
  scheduledAt: string | null;
  scheduleVersion: number;
  workflowRunId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  targets: PostTarget[];
};

export type PublisherConnection = {
  connected: boolean;
  expiresAt: string | null;
  remainingHours: number | null;
};
