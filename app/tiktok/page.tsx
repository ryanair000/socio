import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TikTokManager } from "@/components/tiktok-manager";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ChezaHub TikTok | Socio",
  description:
    "Connect and schedule ChezaHub TikTok photo posts with recommended music.",
};

export const dynamic = "force-dynamic";

export default async function TikTokPage() {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }
  return <TikTokManager />;
}
