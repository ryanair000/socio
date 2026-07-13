import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { encryptSecret, hashToken, newSessionToken } from "@/lib/crypto";
import { getSql } from "@/lib/db";

export const SESSION_COOKIE = "socio_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export async function createSocioSession(upstreamToken: string) {
  const sql = getSql();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_SECONDS * 1000);
  const publisherId = randomUUID();
  const sessionId = randomUUID();
  const sessionToken = newSessionToken();

  await sql.transaction([
    sql`INSERT INTO publisher_credentials (id, encrypted_token, expires_at)
        VALUES (${publisherId}, ${encryptSecret(upstreamToken)}, ${expiresAt.toISOString()})`,
    sql`INSERT INTO socio_sessions (id, token_hash, expires_at)
        VALUES (${sessionId}, ${hashToken(sessionToken)}, ${expiresAt.toISOString()})`,
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });

  return { publisherId, expiresAt };
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await getSql()`
    SELECT id, expires_at
    FROM socio_sessions
    WHERE token_hash = ${hashToken(token)} AND expires_at > now()
    LIMIT 1
  `;
  return rows[0]
    ? {
        id: String(rows[0].id),
        expiresAt: new Date(String(rows[0].expires_at)),
      }
    : null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await getSql()`DELETE FROM socio_sessions WHERE token_hash = ${hashToken(token)}`;
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getActivePublisherCredential() {
  const rows = await getSql()`
    SELECT id, encrypted_token, expires_at
    FROM publisher_credentials
    WHERE expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    encryptedToken: String(rows[0].encrypted_token),
    expiresAt: new Date(String(rows[0].expires_at)),
  };
}
