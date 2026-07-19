import { redirect } from "next/navigation";
import { getActivePublisherCredential, getSession } from "@/lib/auth";
import { listPosts } from "@/lib/posts";
import { PublishingRetryControls } from "@/components/publishing-retry-controls";
import { SocioApp } from "@/components/socio-app";
import type { ScheduledPost } from "@/lib/types";

export const dynamic = "force-dynamic";

function escapeCssAttribute(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\"/g, '\\"')
    .replace(/[\r\n]/g, " ");
}

function tikTokTargetStyles(posts: ScheduledPost[]) {
  return posts
    .filter((post) =>
      post.targets.some((target) => String(target.platform) === "tiktok"),
    )
    .map((post) => {
      const encodedImageUrl = escapeCssAttribute(
        encodeURIComponent(post.imageUrl),
      );
      const selector = `.calendar-card:has(.card-media img[src*="${encodedImageUrl}"]) .platform-icons`;
      return `${selector} > svg:last-child { display: none; }
${selector}::after { content: "♪"; display: inline-grid; place-items: center; width: 13px; height: 13px; font-size: 12px; font-weight: 900; line-height: 1; }`;
    })
    .join("\n");
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [posts, credential] = await Promise.all([
    listPosts(),
    getActivePublisherCredential(),
  ]);
  const tikTokStyles = tikTokTargetStyles(posts);
  return (
    <>
      {tikTokStyles ? <style>{tikTokStyles}</style> : null}
      <SocioApp
        initialPosts={posts}
        initialConnection={{
          connected: Boolean(credential),
          expiresAt: credential?.expiresAt.toISOString() ?? null,
          remainingHours: credential
            ? Math.max(
                0,
                Math.floor(
                  (credential.expiresAt.getTime() - Date.now()) / 3_600_000,
                ),
              )
            : null,
        }}
      />
      <PublishingRetryControls />
    </>
  );
}
