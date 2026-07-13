import { decryptSecret } from "@/lib/crypto";
import type { Brand, Platform } from "@/lib/types";

const UPSTREAM_COOKIE = "auth-token";

function baseUrl() {
  const value = process.env.SMMPRO_BASE_URL;
  if (!value) throw new Error("SMMPRO_BASE_URL is not configured.");
  return value.replace(/\/$/, "");
}

function readCookie(response: Response, name: string) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = headers.getSetCookie?.() ?? [
    response.headers.get("set-cookie") ?? "",
  ];
  for (const value of values) {
    const match = value.match(new RegExp(`(?:^|,|;)\\s*${name}=([^;]+)`));
    if (match?.[1]) return match[1];
  }
  return null;
}

export async function authenticateWithSmmpro(email: string, password: string) {
  const response = await fetch(`${baseUrl()}/api/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok)
    throw new Error(body.error || "SMMPRO rejected those credentials.");
  const token = readCookie(response, UPSTREAM_COOKIE);
  if (!token) throw new Error("SMMPRO did not return a publisher session.");
  return token;
}

export async function getSmmproIntegrationStatus(encryptedToken: string) {
  const response = await fetch(`${baseUrl()}/api/integrations/status`, {
    headers: { cookie: `${UPSTREAM_COOKIE}=${decryptSecret(encryptedToken)}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

type PublishResult = {
  success: boolean;
  providerPostId: string | null;
  error: string | null;
  response: unknown;
  retryable: boolean;
};

export async function publishWithSmmpro(input: {
  encryptedToken: string;
  brand: Brand;
  platform: Platform;
  caption: string;
  imageUrls: string[];
  idempotencyKey: string;
}): Promise<PublishResult> {
  const form = new FormData();
  form.set("accountId", input.brand);
  form.set("message", input.caption);
  form.set("imageUrl", input.imageUrls[0]);
  input.imageUrls.forEach((imageUrl) => form.append("imageUrls", imageUrl));
  form.set("publishFacebook", String(input.platform === "facebook"));
  form.set("publishInstagram", String(input.platform === "instagram"));
  form.set("idempotencyKey", input.idempotencyKey);

  try {
    const response = await fetch(`${baseUrl()}/api/post`, {
      method: "POST",
      headers: {
        cookie: `${UPSTREAM_COOKIE}=${decryptSecret(input.encryptedToken)}`,
      },
      body: form,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      results?: Array<{ id?: string; status?: string }>;
    };
    if (!response.ok) {
      return {
        success: false,
        providerPostId: null,
        error: body.error || `SMMPRO returned HTTP ${response.status}.`,
        response: body,
        retryable: response.status === 429 || response.status >= 500,
      };
    }
    const result = body.results?.[0];
    const success = result?.status === "Success";
    return {
      success,
      providerPostId: success ? (result?.id ?? null) : null,
      error: success
        ? null
        : result?.status?.replace(/^Failed:\s*/i, "") ||
          "SMMPRO did not confirm publication.",
      response: body,
      retryable: false,
    };
  } catch (error) {
    return {
      success: false,
      providerPostId: null,
      error: error instanceof Error ? error.message : "Could not reach SMMPRO.",
      response: null,
      retryable: true,
    };
  }
}
