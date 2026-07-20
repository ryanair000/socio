import { createHash, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(createHash("sha256").update(left).digest("hex"));
  const b = Buffer.from(createHash("sha256").update(right).digest("hex"));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireSkillApiKey(value: string | null | undefined) {
  const configured = process.env.SOCIO_SKILL_API_KEY?.trim();
  if (!configured) throw new Error("SKILL_API_DISABLED");
  const supplied = value?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!supplied || !safeEqual(supplied, configured)) throw new Error("UNAUTHORIZED_SKILL");
}

export function skillApiKeyFromRequest(request: Request) {
  return (
    request.headers.get("authorization") ??
    request.headers.get("x-socio-api-key")
  );
}
