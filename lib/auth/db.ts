import { supabaseAdmin } from "@/lib/supabase/server";
import { encryptAES256GCM } from "@/lib/crypto/index";
import type { Database } from "@/lib/supabase/database.types";

type Users = Database["public"]["Tables"]["users"]["Row"];
type Devices = Database["public"]["Tables"]["devices"]["Row"];

export async function createUser(
  email: string,
  masterKeyHash: string,
  salt: Buffer
) {
  try {
    const { data, error } = await (supabaseAdmin.from("users" as any) as any)
      .insert({
        email: email.toLowerCase(),
        master_key_salt: "\\x" + salt.toString("hex"),
        master_key_hash: masterKeyHash,
        totp_secret_encrypted: null,
        totp_secret_iv: null,
        totp_secret_auth_tag: null,
        backup_codes_encrypted: null,
        backup_codes_iv: null,
        backup_codes_auth_tag: null,
      })
      .select()
      .single() as { data: Users | null; error: any };

    if (error) {
      throw error;
    }

    return data as Users;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function getUserByEmail(
  email: string
): Promise<Users | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users" as const)
      .select("*")
      .eq("email", email.toLowerCase())
      .single() as { data: Users | null; error: any };

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return (data as Users) || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
}

export async function getUserById(
  userId: string
): Promise<Users | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users" as const)
      .select("*")
      .eq("id", userId)
      .single() as { data: Users | null; error: any };

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return (data as Users) || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}


export async function storeTOTPSecret(
  userId: string,
  totpSecret: string,
  masterKey: Buffer
) {
  try {
    const { ciphertext, iv, authTag } = encryptAES256GCM(
      totpSecret,
      masterKey
    );

    const ciphertextBytea = "\\x" + Buffer.from(ciphertext, "base64").toString("hex");
    const ivBytea = "\\x" + Buffer.from(iv, "base64").toString("hex");
    const authTagBytea = "\\x" + Buffer.from(authTag, "base64").toString("hex");

    const { error } = await (supabaseAdmin.from("users" as any) as any)
      .update({
        totp_secret_encrypted: ciphertextBytea,
        totp_secret_iv: ivBytea,
        totp_secret_auth_tag: authTagBytea,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error storing TOTP secret:", error);
    throw error;
  }
}

export async function storeBackupCodes(
  userId: string,
  backupCodes: string[],
  masterKey: Buffer
) {
  try {
    const backupCodesJson = JSON.stringify(backupCodes);
    const { ciphertext, iv, authTag } = encryptAES256GCM(
      backupCodesJson,
      masterKey
    );

    const ciphertextBytea = "\\x" + Buffer.from(ciphertext, "base64").toString("hex");
    const ivBytea = "\\x" + Buffer.from(iv, "base64").toString("hex");
    const authTagBytea = "\\x" + Buffer.from(authTag, "base64").toString("hex");

    const { error } = await (supabaseAdmin.from("users" as any) as any)
      .update({
        backup_codes_encrypted: ciphertextBytea,
        backup_codes_iv: ivBytea,
        backup_codes_auth_tag: authTagBytea,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error storing backup codes:", error);
    throw error;
  }
}


export async function registerDevice(
  userId: string,
  deviceName: string,
  deviceFingerprintHash: string,
  isTrusted: boolean = false
) {
  try {
    const { data, error } = await (supabaseAdmin.from("devices" as any) as any)
      .insert({
        owner_user_id: userId,
        device_name: deviceName,
        device_fingerprint_hashed: deviceFingerprintHash,
        is_trusted: isTrusted,
        last_otp_verified_at: isTrusted ? new Date().toISOString() : null,
      })
      .select()
      .single() as { data: Devices | null; error: any };

    if (error) {
      throw error;
    }

    return data as Devices;
  } catch (error) {
    console.error("Error registering device:", error);
    throw error;
  }
}


export async function getDeviceByFingerprint(
  userId: string,
  fingerprintHash: string
): Promise<Devices | null> {
  try {
    const { data, error } = await (supabaseAdmin.from("devices" as any) as any)
      .select("*")
      .eq("owner_user_id", userId)
      .eq("device_fingerprint_hashed", fingerprintHash)
      .single() as { data: Devices | null; error: any };

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return (data as Devices) || null;
  } catch (error) {
    console.error("Error getting device by fingerprint:", error);
    throw error;
  }
}


export async function updateDeviceOTPVerified(deviceId: string) {
  try {
    const { error } = await (supabaseAdmin.from("devices" as any) as any)
      .update({
        last_otp_verified_at: new Date().toISOString(),
      })
      .eq("id", deviceId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error updating device OTP verified:", error);
    throw error;
  }
}


export async function getUserDevices(userId: string): Promise<Devices[]> {
  try {
    const { data, error } = await (supabaseAdmin.from("devices" as any) as any)
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false }) as { data: Devices[] | null; error: any };

    if (error) {
      throw error;
    }

    return (data as Devices[]) || [];
  } catch (error) {
    console.error("Error getting user devices:", error);
    throw error;
  }
}


export async function writeAuditLog(
  userId: string,
  action: string,
  projectId?: string,
  secretId?: string,
  deviceId?: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await (supabaseAdmin.from("audit_log" as any) as any).insert({
      owner_user_id: userId,
      action,
      project_id: projectId || null,
      secret_id: secretId || null,
      device_id: deviceId || null,
      metadata: metadata || null,
    });

    if (error) {
      console.error("Error writing audit log:", error);
    }
  } catch (error) {
    console.error("Unexpected error writing audit log:", error);
  }
}


function isLikelyBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;
}

function isLikelyHex(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
}

export function normalizeByteaToBuffer(value: any): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === "string") {
    const str = value;

    if (str.startsWith("\\x")) {
      return Buffer.from(str.slice(2), "hex");
    }

    if (isLikelyBase64(str)) {
      const decoded = Buffer.from(str, "base64");
      if (decoded.length === 16) {
        return decoded;
      }

      return decoded;
    }

    if (isLikelyHex(str)) {
      return Buffer.from(str, "hex");
    }

    return Buffer.from(str, "utf8");
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer);
  }

  throw new Error("Unable to normalize BYTEA value to Buffer");
}

export function normalizeByteaToBase64(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const buffer = normalizeByteaToBuffer(value);
  return buffer.toString("base64");
}

export async function getUserMasterKeySalt(
  userId: string
): Promise<Buffer | null> {
  try {
    const user = await getUserById(userId);

    if (!user) {
      return null;
    }

    return normalizeByteaToBuffer(user.master_key_salt);
  } catch (error) {
    console.error("Error getting master key salt:", error);
    throw error;
  }
}
