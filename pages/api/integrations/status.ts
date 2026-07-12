import type { NextApiRequest, NextApiResponse } from "next";
import {
  SMMPRO_BASE_URL,
  readUpstreamJson,
  requireSession,
  upstreamHeaders,
} from "../../../lib/smmpro";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSession(req, res)) return;

  try {
    const upstream = await fetch(`${SMMPRO_BASE_URL}/api/integrations/status`, {
      headers: upstreamHeaders(req),
      cache: "no-store",
    });
    const data = await readUpstreamJson(upstream);
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: "Could not reach the SMMPRO service." });
  }
}
