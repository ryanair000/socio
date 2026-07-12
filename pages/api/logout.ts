import type { NextApiRequest, NextApiResponse } from "next";
import {
  SMMPRO_BASE_URL,
  clearSessionCookie,
  upstreamHeaders,
} from "../../lib/smmpro";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    await fetch(`${SMMPRO_BASE_URL}/api/logout`, {
      method: "POST",
      headers: upstreamHeaders(req),
    });
  } catch {
    // The local cookie is still cleared when the upstream is unavailable.
  }
  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}
