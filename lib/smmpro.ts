import type { NextApiRequest, NextApiResponse } from "next";

export const SMMPRO_BASE_URL = (
  process.env.SMMPRO_BASE_URL || "https://smmpro.lokimax.top"
).replace(/\/$/, "");

export const LOCAL_SESSION_COOKIE = "socio-smmpro-session";
const UPSTREAM_COOKIE = "auth-token";
const MAX_AGE = 60 * 60 * 24 * 7;

export function getLocalSession(req: NextApiRequest) {
  return req.cookies[LOCAL_SESSION_COOKIE] || "";
}

export function upstreamHeaders(req: NextApiRequest, extra: HeadersInit = {}) {
  const session = getLocalSession(req);
  return {
    ...extra,
    ...(session ? { cookie: `${UPSTREAM_COOKIE}=${session}` } : {}),
  };
}

export function extractUpstreamSession(headers: Headers) {
  const setCookie = headers.get("set-cookie") || "";
  const match = setCookie.match(/(?:^|[,;]\s*)auth-token=([^;]+)/i);
  return match?.[1] || "";
}

function cookieAttributes(maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res: NextApiResponse, value: string) {
  res.setHeader(
    "Set-Cookie",
    `${LOCAL_SESSION_COOKIE}=${value}; ${cookieAttributes(MAX_AGE)}`,
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    `${LOCAL_SESSION_COOKIE}=; ${cookieAttributes(0)}`,
  );
}

export async function readUpstreamJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || response.statusText || "Invalid upstream response" };
  }
}

export function requireSession(req: NextApiRequest, res: NextApiResponse) {
  if (getLocalSession(req)) return true;
  res.status(401).json({ error: "Sign in to connect Socio with SMMPRO." });
  return false;
}
