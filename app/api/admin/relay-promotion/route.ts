import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const response = await fetch(
    "https://socio-ii3cuh8i4-qybrrblog-admins-projects.vercel.app/api/admin/promote-preview?key=z7-QFKi3TEiSzLGDC6RIx2yGP6Xqq1iJ3AnRWbNJ5Gg",
    { method: "POST", cache: "no-store" },
  );
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Preserve the upstream response as text.
  }
  return NextResponse.json(
    { ok: response.ok, status: response.status, response: body },
    { status: response.ok ? 200 : response.status },
  );
}
