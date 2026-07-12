import type { NextApiRequest, NextApiResponse } from "next";
import {
  SMMPRO_BASE_URL,
  readUpstreamJson,
  requireSession,
  upstreamHeaders,
} from "../../lib/smmpro";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSession(req, res)) return;

  try {
    const upstream = await fetch(`${SMMPRO_BASE_URL}/api/generate`, {
      method: "POST",
      headers: upstreamHeaders(req, { "content-type": "application/json" }),
      body: JSON.stringify(req.body),
    });
    const data = await readUpstreamJson(upstream);
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: "Caption generation service is unavailable." });
  }
}
