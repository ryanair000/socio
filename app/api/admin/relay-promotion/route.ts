import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const TOKEN_HASH = "83ca146fae8f8eb457673123197327a2e1597a0f0a80397c6c64bd962caab0e5";

function authorized(value: string | null) {
  if (!value) return false;
  const received = Buffer.from(createHash("sha256").update(value).digest("hex"));
  const expected = Buffer.from(TOKEN_HASH);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!authorized(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
