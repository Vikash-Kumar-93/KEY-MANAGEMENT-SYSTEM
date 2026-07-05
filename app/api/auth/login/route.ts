import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  deriveMasterKeyFromPassphrase,
  verifyPassphrase,
} from "@/lib/crypto/argon2";
import {
  getDeviceByFingerprint,
  getUserByEmail,
  getUserMasterKeySalt,
} from "@/lib/auth/db";
import {
  formatDeviceName,
  getClientIPAddress,
  getDeviceFingerprintHash,
  isDeviceTrustedToday,
} from "@/lib/auth/device";
import { createPendingSession, createSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, passphrase } = body;

    if (!email || !passphrase) {
      return NextResponse.json(
        { error: "Email and passphrase are required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or passphrase" },
        { status: 401 }
      );
    }

    const salt = await getUserMasterKeySalt(user.id);
    if (!salt) {
      return NextResponse.json(
        { error: "User data corrupted" },
        { status: 500 }
      );
    }

    const passphraseValid = await verifyPassphrase(
      passphrase,
      salt,
      user.master_key_hash
    );

    if (!passphraseValid) {
      return NextResponse.json(
        { error: "Invalid email or passphrase" },
        { status: 401 }
      );
    }

    const derivedMasterKey = await deriveMasterKeyFromPassphrase(
      passphrase,
      salt
    );

    const headers = Object.fromEntries(request.headers.entries());
    const ipAddress = getClientIPAddress(headers);
    const deviceFingerprintHash = getDeviceFingerprintHash(headers, ipAddress);
    const device = await getDeviceByFingerprint(user.id, deviceFingerprintHash);
    const trustedToday =
      !!device && isDeviceTrustedToday(device.last_otp_verified_at);

    if (trustedToday && device) {
      const sessionId = createSession(
        crypto.randomBytes(32).toString("hex"),
        user.id,
        derivedMasterKey,
        derivedMasterKey.toString("base64"),
        device.id
      );

      const response = NextResponse.json(
        {
          success: true,
          userId: user.id,
          requiresOTP: false,
          deviceName: device.device_name,
        },
        { status: 200 }
      );

      response.cookies.set("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge:
          parseInt(process.env.AUTO_LOCK_TIMEOUT_MINUTES || "15", 10) * 60,
        path: "/",
      });

      return response;
    }

    const pendingUnlockId = createPendingSession(
      crypto.randomBytes(32).toString("hex"),
      "unlock",
      user.id,
      derivedMasterKey,
      derivedMasterKey.toString("base64")
    );

    const response = NextResponse.json(
      {
        success: true,
        userId: user.id,
        requiresOTP: true,
        deviceName: device
          ? device.device_name
          : formatDeviceName(headers["user-agent"] as string),
      },
      { status: 200 }
    );

    response.cookies.set("pendingUnlockId", pendingUnlockId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
