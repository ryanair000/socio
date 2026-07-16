import { redirect } from "next/navigation";
import { getActivePublisherCredential, getSession } from "@/lib/auth";
import { listPosts } from "@/lib/posts";
import { SocioApp } from "@/components/socio-app";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [posts, credential] = await Promise.all([
    listPosts(),
    getActivePublisherCredential(),
  ]);
  return (
    <>
      <a
        href="/tiktok"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 1000,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
          padding: "0 17px",
          border: "1px solid rgba(37, 244, 238, 0.45)",
          borderRadius: 999,
          color: "#07070a",
          background:
            "linear-gradient(135deg, #25f4ee 0%, #ffffff 55%, #fe2c55 130%)",
          boxShadow: "0 14px 34px rgba(0,0,0,.25)",
          fontWeight: 850,
          textDecoration: "none",
        }}
        aria-label="Open ChezaHub TikTok publishing"
      >
        ♪ ChezaHub TikTok
      </a>
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
    </>
  );
}
