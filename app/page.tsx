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
  );
}
