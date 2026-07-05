import crypto from "crypto";
import argon2 from "argon2";


export function generateSalt(length: number = 16): Buffer {
  return crypto.randomBytes(length);
}


export async function deriveMasterKeyFromPassphrase(
  passphrase: string,
  salt: Buffer
): Promise<Buffer> {
  try {
    const hashBuffer = await argon2.hash(passphrase, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
      salt, 
      raw: true,
      hashLength: 32,
    });

    return Buffer.from(hashBuffer);
  } catch (error) {
    throw new Error(`Key derivation (argon2) failed: ${error}`);
  }
}


export async function verifyPassphrase(
  passphrase: string,
  salt: Buffer,
  storedKeyHash: string
): Promise<boolean> {
  try {
    const derivedKey = await deriveMasterKeyFromPassphrase(passphrase, salt);
    const derivedKeyHash = derivedKey.toString("base64");

    const stored = Buffer.from(storedKeyHash, "base64");
    const derived = Buffer.from(derivedKeyHash, "base64");

    return crypto.timingSafeEqual(stored, derived);
  } catch (error) {
    console.error("Passphrase verification error:", error);
    return false;
  }
}


export async function hashPassphrase(
  passphrase: string,
  salt: Buffer = generateSalt()
): Promise<{ masterKeyHash: string; salt: Buffer }> {
  const masterKey = await deriveMasterKeyFromPassphrase(passphrase, salt);
  const masterKeyHash = masterKey.toString("base64");

  return { masterKeyHash, salt };
}


export function deriveSessionKey(masterKey: Buffer): Buffer {

  return crypto
    .createHmac("sha256", Buffer.from("PKMS_SESSION_KEY_DERIVATION"))
    .update(masterKey)
    .digest()
    .slice(0, 32);
}

