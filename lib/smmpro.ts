import { decryptSecret } from "@/lib/crypto";
import type { Brand, PublishPlatform } from "@/lib/types";

const UPSTREAM_COOKIE = "auth-token";

function baseUrl() {
  const value = process.env.SMMPRO_BASE_URL;
  if (!value) throw new Error("SMMPRO_BASE_URL is not configured.");
  return value.replace(/\/$/, "");
}

function upstreamCookie(encryptedToken: string) {
  return `${UPSTREAM_COOKIE}=${decryptSecret(encryptedToken)}`;
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
    headers: { cookie: upstreamCookie(encryptedToken) },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export type TikTokConnectionStatus = {
  configured: boolean;
  connected: boolean;
  accountId?: string;
  username?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  privacyLevelOptions?: string[];
  accessTokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  musicAlwaysOn?: boolean;
  autoAddMusic?: boolean;
  unaudited?: boolean;
  privacyLevel?: string;
  error?: string;
};

export async function getTikTokConnectionStatus(
  encryptedToken: string,
): Promise<TikTokConnectionStatus> {
  const response = await fetch(`${baseUrl()}/api/integrations/tiktok/status`, {
    headers: { cookie: upstreamCookie(encryptedToken) },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as TikTokConnectionStatus & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Could not load the TikTok connection.");
  }
  return body;
}

export async function getTikTokConnectUrl(
  encryptedToken: string,
  returnTo: string,
) {
  const response = await fetch(`${baseUrl()}/api/integrations/tiktok/connect`, {
    method: "POST",
    headers: {
      cookie: upstreamCookie(encryptedToken),
      "content-type": "application/json",
    },
    body: JSON.stringify({ returnTo }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !body.url) {
    throw new Error(body.error || "Could not start TikTok authorization.");
  }
  return body.url;
}

export async function disconnectTikTok(encryptedToken: string) {
  const response = await fetch(`${baseUrl()}/api/integrations/tiktok/disconnect`, {
    method: "POST",
    headers: { cookie: upstreamCookie(encryptedToken) },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Could not disconnect TikTok.");
}

type PublishResult = {
  success: boolean;
  state: "published" | "processing" | "failed";
  providerPostId: string | null;
  providerPublishId: string | null;
  error: string | null;
  response: unknown;
  retryable: boolean;
};

export async function publishWithSmmpro(input: {
  encryptedToken: string;
  brand: Brand;
  platform: PublishPlatform;
  title: string;
  caption: string;
  imageUrls: string[];
  idempotencyKey: string;
}): Promise<PublishResult> {
  try {
    const response =
      input.platform === "tiktok"
        ? await fetch(`${baseUrl()}/api/integrations/tiktok/publish`, {
            method: "POST",
            headers: {
              cookie: upstreamCookie(input.encryptedToken),
              "content-type": "application/json",
            },
            body: JSON.stringify({
              accountId: input.brand,
              title: input.title,
              caption: input.caption,
              imageUrls: input.imageUrls,
              idempotencyKey: input.idempotencyKey,
            }),
            cache: "no-store",
          })
        : await publishMetaTarget(input);
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      results?: Array<{
        id?: string;
        publishId?: string;
        status?: string;
      }>;
    };
    if (!response.ok) {
      return {
        success: false,
        state: "failed",
        providerPostId: null,
        providerPublishId: null,
        error: body.error || `SMMPRO returned HTTP ${response.status}.`,
        response: body,
        retryable: response.status === 429 || response.status >= 500,
      };
    }
    const result = body.results?.[0];
    const processing = result?.status === "Processing";
    const published = result?.status === "Success";
    return {
      success: processing || published,
      state: processing ? "processing" : published ? "published" : "failed",
      providerPostId: published ? (result?.id ?? null) : null,
      providerPublishId: processing
        ? (result?.publishId ?? result?.id ?? null)
        : null,
      error:
        processing || published
          ? null
          : result?.status?.replace(/^Failed:\s*/i, "") ||
            "SMMPRO did not confirm publication.",
      response: body,
      retryable: false,
    };
  } catch (error) {
    return {
      success: false,
      state: "failed",
      providerPostId: null,
      providerPublishId: null,
      error: error instanceof Error ? error.message : "Could not reach SMMPRO.",
      response: null,
      retryable: true,
    };
  }
}

async function publishMetaTarget(input: {
  encryptedToken: string;
  brand: Brand;
  platform: PublishPlatform;
  title: string;
  caption: string;
  imageUrls: string[];
  idempotencyKey: string;
}) {
  const form = new FormData();
  form.set("accountId", input.brand);
  form.set("title", input.title);
  form.set("message", input.caption);
  form.set("imageUrl", input.imageUrls[0]);
  input.imageUrls.forEach((imageUrl) => form.append("imageUrls", imageUrl));
  form.set("publishFacebook", String(input.platform === "facebook"));
  form.set("publishInstagram", String(input.platform === "instagram"));
  form.set("idempotencyKey", input.idempotencyKey);
  return fetch(`${baseUrl()}/api/post`, {
    method: "POST",
    headers: { cookie: upstreamCookie(input.encryptedToken) },
    body: form,
    cache: "no-store",
  });
}

export type TikTokPublishStatus = {
  publishId: string;
  status: string;
  failReason: string | null;
  postIds: string[];
  uploadedBytes: number;
  downloadedBytes: number;
  response: unknown;
};

export async function getTikTokPublishStatus(
  encryptedToken: string,
  publishId: string,
): Promise<TikTokPublishStatus> {
  const response = await fetch(
    `${baseUrl()}/api/integrations/tiktok/publish-status`,
    {
      method: "POST",
      headers: {
        cookie: upstreamCookie(encryptedToken),
        "content-type": "application/json",
      },
      body: JSON.stringify({ publishId }),
      cache: "no-store",
    },
  );
  const body = (await response.json().catch(() => ({}))) as TikTokPublishStatus & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Could not check the TikTok publishing status.");
  }
  return body;
}
