export type PackReview = {
  sourceName: string;
  packHash: string;
  compressedBytes: number;
  expandedBytes: number;
  campaign: string;
  sourceWeek: string | null;
  brand: "chezahub" | "jengasites";
  timezone: "Africa/Nairobi";
  overduePolicy:
    "keep_draft" | "roll_forward" | "skip_expired" | "stagger_from_now";
  counts: {
    posts: number;
    slides: number;
    ready: number;
    warning: number;
    blocked: number;
  };
  posts: Array<{
    reference: string;
    title: string;
    caption: string;
    format: "single" | "carousel" | "story";
    media: string[];
    platforms: Array<"facebook" | "instagram" | "tiktok">;
    schedule: { date: string; time: string } | null;
    qaStatus: "ready" | "ready_after_qa" | "hold";
    reviewState: "ready" | "warning" | "blocked";
  }>;
  checks: Array<{
    severity: "info" | "warning" | "error";
    code: string;
    message: string;
    reference: string | null;
  }>;
  canStage: boolean;
};

export function reviewPackBuffer(
  buffer: Buffer,
  sourceName?: string,
): PackReview;
export function reviewAsMarkdown(review: PackReview): string;
