import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashToken, newSessionToken } from "../lib/crypto";

beforeAll(() => {
  process.env.SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("server cryptography", () => {
  it("encrypts and authenticates publisher credentials", () => {
    const encrypted = encryptSecret("upstream-cookie");
    expect(encrypted).not.toContain("upstream-cookie");
    expect(decryptSecret(encrypted)).toBe("upstream-cookie");
  });

  it("creates stable hashes and random session tokens", () => {
    expect(hashToken("token")).toHaveLength(64);
    expect(newSessionToken()).not.toBe(newSessionToken());
  });
});
