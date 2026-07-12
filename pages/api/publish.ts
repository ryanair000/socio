import type { NextApiRequest, NextApiResponse } from "next";
import {
  SMMPRO_BASE_URL,
  readUpstreamJson,
  requireSession,
  upstreamHeaders,
} from "../../lib/smmpro";

export const config = { api: { bodyParser: false } };
const MAX_BYTES = 25 * 1024 * 1024;

async function readRaw(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSession(req, res)) return;

  try {
    const body = await readRaw(req);
    const contentType = String(req.headers["content-type"] || "");
    const upstream = await fetch(`${SMMPRO_BASE_URL}/api/post`, {
      method: "POST",
      headers: upstreamHeaders(req, { "content-type": contentType }),
      body,
    });
    const data = await readUpstreamJson(upstream);
    return res.status(upstream.status).json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return res.status(413).json({ error: "Publishing payload is too large." });
    }
    return res.status(502).json({ error: "Publishing service is unavailable." });
  }
}
