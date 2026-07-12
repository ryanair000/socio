import type { NextApiRequest, NextApiResponse } from "next";
import {
  SMMPRO_BASE_URL,
  extractUpstreamSession,
  readUpstreamJson,
  setSessionCookie,
} from "../../lib/smmpro";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const upstream = await fetch(`${SMMPRO_BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readUpstreamJson(upstream);
    const session = extractUpstreamSession(upstream.headers);

    if (!upstream.ok || !session) {
      return res
        .status(upstream.status || 502)
        .json({ error: data.error || "SMMPRO authentication failed." });
    }

    setSessionCookie(res, session);
    return res.status(200).json({ success: true, backend: "SMMPRO" });
  } catch {
    return res.status(502).json({ error: "Could not reach the SMMPRO service." });
  }
}
