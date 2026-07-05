import {
  encryptAES256GCM,
  decryptAES256GCM,
  generateDataKey,
} from "@/lib/crypto/index";

export function createProjectDataKey(
  masterKey: Buffer
): {
  wrappedKey: string;
  keyIv: string;
  keyAuthTag: string;
} {
  const dataKey = generateDataKey();
  const {
    ciphertext: wrappedKey,
    iv: keyIv,
    authTag: keyAuthTag,
  } = encryptAES256GCM(dataKey, masterKey);

  return {
    wrappedKey,
    keyIv,
    keyAuthTag,
  };
}


export function unwrapProjectDataKey(
  wrappedKey: string,
  masterKey: Buffer,
  keyIv: string,
  keyAuthTag: string
): Buffer {
  return decryptAES256GCM(wrappedKey, masterKey, keyIv, keyAuthTag);
}


export function encryptSecretWithDataKey(
  secretValue: string,
  dataKey: Buffer
): {
  ciphertext: string;
  secretIv: string;
  secretAuthTag: string;
} {
  const { ciphertext, iv, authTag } = encryptAES256GCM(secretValue, dataKey);
  return {
    ciphertext,
    secretIv: iv,
    secretAuthTag: authTag,
  };
}

export function decryptSecretWithDataKey(
  ciphertext: string,
  dataKey: Buffer,
  secretIv: string,
  secretAuthTag: string
): string {
  return decryptAES256GCM(ciphertext, dataKey, secretIv, secretAuthTag).toString("utf8");
}
