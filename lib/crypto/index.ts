import crypto from "crypto";


export function generateSalt(length: number = 16): Buffer {
  return crypto.randomBytes(length);
}


export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Buffer
): Promise<Buffer> {

  return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
}


export function encryptAES256GCM(
  plaintext: string | Buffer | Uint8Array,
  key: Buffer
): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const input = typeof plaintext === "string"
    ? Buffer.from(plaintext, "utf8")
    : Buffer.from(plaintext);

  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}


export function decryptAES256GCM(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): Buffer {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const encrypted = Buffer.from(ciphertext, "base64");
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted;
}


export function generateDataKey(): Buffer {
  return crypto.randomBytes(32);
}


export function wrapDataKey(
  dataKey: Buffer,
  masterKey: Buffer
): { wrappedKey: string; iv: string; authTag: string } {
  const { ciphertext, iv, authTag } = encryptAES256GCM(dataKey, masterKey);
  return {
    wrappedKey: ciphertext,
    iv,
    authTag,
  };
}


export function unwrapDataKey(
  wrappedKey: string,
  masterKey: Buffer,
  iv: string,
  authTag: string
): Buffer {
  return decryptAES256GCM(wrappedKey, masterKey, iv, authTag);
}
