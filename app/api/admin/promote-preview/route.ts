import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Temporary, protected recovery route. Delete after the verified preview is promoted.
const TOKEN_HASH = "a8b91f713a36013c62e3f625ee7d455094f5ad5890998955254d01cdf93538f9";
const PROJECT_ID = "prj_Pn0fsgnopxanHeOMrywFm2q3nSy4";
const TEAM_ID = "team_XqjheFqtugMBMnTdZubPD1T8";

function authorized(value: string | null) {
  if (!value) return false;
  const received = Buffer.from(createHash("sha256").update(value).digest("hex"));
  const expected = Buffer.from(TOKEN_HASH);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function promote(request: Request) {
  const url = new URL(request.url);
  if (!authorized(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (!deploymentId || !oidcToken) {
    return NextResponse.json(
      {
        error: "Vercel deployment identity is unavailable.",
        hasDeploymentId: Boolean(deploymentId),
        hasOidcToken: Boolean(oidcToken),
      },
      { status: 409 },
    );
  }

  const response = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/promote/${deploymentId}?teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${oidcToken}`,
        "content-type": "application/json",
      },
      cache: "no-store",
    },
  );
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Preserve the provider response as text.
  }
  return NextResponse.json(
    { ok: response.ok, status: response.status, deploymentId, response: body },
    { status: response.ok ? 200 : response.status },
  );
}

export const GET = promote;
export const POST = promote;
