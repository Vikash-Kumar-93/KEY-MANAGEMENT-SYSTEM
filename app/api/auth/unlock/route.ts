import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { decryptAES256GCM } from "@/lib/crypto/index";
import {
  createSession,
  destroyPendingSession,
  getPendingSession,
} from "@/lib/auth/session";
import {
  getDeviceByFingerprint,
  getUserById,
  normalizeByteaToBase64,
  registerDevice,
  storeBackupCodes,
  updateDeviceOTPVerified,
  writeAuditLog,
} from "@/lib/auth/db";
import {
  formatDeviceName,
  getClientIPAddress,
  getDeviceFingerprintHash,
} from "@/lib/auth/device";
import { verifyBackupCode, verifyTOTPCode } from "@/lib/auth/totp";

export async function POST(request: NextRequest) {
  try {
    const pendingUnlockId = request.cookies.get("pendingUnlockId")?.value;
    const body = await request.json();
    const { userId, otpCode, backupCode } = body;

    if (!pendingUnlockId || !userId || (!otpCode && !backupCode)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const pending = getPendingSession(pendingUnlockId, "unlock", userId);
    if (!pending) {
      return NextResponse.json(
        { error: "Unlock session expired. Please login again." },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    let authenticated = false;
    let method = "otp";

    if (otpCode) {
      const encryptedSecret = normalizeByteaToBase64(user.totp_secret_encrypted);
      const iv = normalizeByteaToBase64(user.totp_secret_iv);
      const authTag = normalizeByteaToBase64(user.totp_secret_auth_tag);

      if (!encryptedSecret || !iv || !authTag) {
        return NextResponse.json(
          { error: "TOTP not configured for this account" },
          { status: 400 }
        );
      }

      const totpSecret = decryptAES256GCM(
        encryptedSecret,
        pending.masterKey,
        iv,
        authTag
      ).toString("utf8");
      authenticated = verifyTOTPCode(totpSecret, otpCode);
    } else if (backupCode) {
      const encryptedBackup = normalizeByteaToBase64(user.backup_codes_encrypted);
      const iv = normalizeByteaToBase64(user.backup_codes_iv);
      const authTag = normalizeByteaToBase64(user.backup_codes_auth_tag);

      if (!encryptedBackup || !iv || !authTag) {
        return NextResponse.json(
          { error: "Backup codes not configured for this account" },
          { status: 400 }
        );
      }

      const backupJson = decryptAES256GCM(
        encryptedBackup,
        pending.masterKey,
        iv,
        authTag
      ).toString("utf8");
      const backupCodes = JSON.parse(backupJson) as string[];
      const { valid, updatedCodes } = verifyBackupCode(backupCode, backupCodes);

      if (valid) {
        authenticated = true;
        method = "backup_code";
        await storeBackupCodes(userId, updatedCodes, pending.masterKey);
      }
    }

    if (!authenticated) {
      await writeAuditLog(userId, "otp_verify_failed");

      return NextResponse.json(
        { error: "Invalid authentication code" },
        { status: 401 }
      );
    }

    const headers = Object.fromEntries(request.headers.entries());
    const ipAddress = getClientIPAddress(headers);
    const deviceFingerprintHash = getDeviceFingerprintHash(headers, ipAddress);
    const deviceName = formatDeviceName(headers["user-agent"] as string);

    let device = await getDeviceByFingerprint(user.id, deviceFingerprintHash);

    if (device) {
      await updateDeviceOTPVerified(device.id);
    } else {
      device = await registerDevice(user.id, deviceName, deviceFingerprintHash, true);
    }

    const sessionId = createSession(
      crypto.randomBytes(32).toString("hex"),
      userId,
      Buffer.from(pending.masterKey),
      pending.masterKeyHash,
      device.id
    );

    await writeAuditLog(userId, "unlock", undefined, undefined, device.id, {
      method,
      timestamp: new Date().toISOString(),
    });

    destroyPendingSession(pendingUnlockId);

    const response = NextResponse.json(
      {
        success: true,
        message: "Unlocked successfully",
      },
      { status: 200 }
    );

    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: parseInt(process.env.AUTO_LOCK_TIMEOUT_MINUTES || "15", 10) * 60,
      path: "/",
    });

    response.cookies.set("pendingUnlockId", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Unlock error:", error);

    return NextResponse.json(
      { error: "Unlock failed. Please try again." },
      { status: 500 }
    );
  }
}
