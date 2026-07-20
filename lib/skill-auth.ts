import { createHash, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(createHash("sha256").update(left).digest("hex"));
  const b = Buffer.from(createHash("sha256").update(right).digest("hex"));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function configuredSkillApiKey() {
  const explicit = process.env.SOCIO_SKILL_API_KEY?.trim();
  if (explicit) return { value: explicit, source: "SOCIO_SKILL_API_KEY" as const };
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) throw new Error("SKILL_API_DISABLED");
  return {
    value: createHash("sha256")
      .update(`socio-publisher-v1:${cronSecret}`)
      .digest("base64url"),
    source: "derived" as const,
  };
}

export function requireSkillApiKey(value: string | null | undefined) {
  const configured = configuredSkillApiKey().value;
  const supplied = value?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!supplied || !safeEqual(supplied, configured)) throw new Error("UNAUTHORIZED_SKILL");
}

export function skillApiKeyFromRequest(request: Request) {
  return request.headers.get("authorization") ?? request.headers.get("x-socio-api-key");
}
