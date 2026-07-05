import { describe, expect, it } from "vitest";
import { hashPassphrase, verifyPassphrase } from "@/lib/crypto/argon2";
import {
  decryptAES256GCM,
  encryptAES256GCM,
  generateDataKey,
  unwrapDataKey,
  wrapDataKey,
} from "@/lib/crypto";
import {
  decryptSecretWithDataKey,
  encryptSecretWithDataKey,
} from "@/lib/crypto/envelope";

describe("crypto/argon2", () => {
  it("hashes and verifies a passphrase", async () => {
    const passphrase = "correct Horse battery staple 42";
    const { masterKeyHash, salt } = await hashPassphrase(passphrase);

    await expect(
      verifyPassphrase(passphrase, salt, masterKeyHash)
    ).resolves.toBe(true);
  });

  it("rejects a wrong passphrase", async () => {
    const { masterKeyHash, salt } = await hashPassphrase(
      "correct Horse battery staple 42"
    );

    await expect(
      verifyPassphrase("wrong Horse battery staple 42", salt, masterKeyHash)
    ).resolves.toBe(false);
  });
});

describe("AES-256-GCM", () => {
  it("round-trips plaintext", () => {
    const key = generateDataKey();
    const encrypted = encryptAES256GCM("supabase-service-role", key);

    expect(
      decryptAES256GCM(
        encrypted.ciphertext,
        key,
        encrypted.iv,
        encrypted.authTag
      ).toString("utf8")
    ).toBe("supabase-service-role");
  });

  it("fails when ciphertext is tampered", () => {
    const key = generateDataKey();
    const encrypted = encryptAES256GCM("secret-value", key);
    const tampered = Buffer.from(encrypted.ciphertext, "base64");
    tampered[0] = tampered[0] ^ 1;

    expect(() =>
      decryptAES256GCM(
        tampered.toString("base64"),
        key,
        encrypted.iv,
        encrypted.authTag
      )
    ).toThrow();
  });
});

describe("envelope encryption", () => {
  it("wraps and unwraps project data keys", () => {
    const masterKey = generateDataKey();
    const dataKey = generateDataKey();
    const wrapped = wrapDataKey(dataKey, masterKey);

    expect(
      unwrapDataKey(
        wrapped.wrappedKey,
        masterKey,
        wrapped.iv,
        wrapped.authTag
      ).equals(dataKey)
    ).toBe(true);
  });

  it("encrypts and decrypts a secret with a data key", () => {
    const dataKey = generateDataKey();
    const encrypted = encryptSecretWithDataKey("github_pat_123", dataKey);

    expect(
      decryptSecretWithDataKey(
        encrypted.ciphertext,
        dataKey,
        encrypted.secretIv,
        encrypted.secretAuthTag
      )
    ).toBe("github_pat_123");
  });
});
