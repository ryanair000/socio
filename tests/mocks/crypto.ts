export function hashToken(value: string) {
  return `test-hash:${value}`;
}

export function newSessionToken() {
  return "test-session-token";
}

export function encryptSecret(value: string) {
  return Buffer.from(`test-secret:${value}`, "utf8").toString("base64url");
}

export function decryptSecret(value: string) {
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  if (!decoded.startsWith("test-secret:")) throw new Error("Malformed test secret.");
  return decoded.slice("test-secret:".length);
}
