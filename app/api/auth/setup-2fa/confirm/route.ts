import { NextRequest, NextResponse } from "next/server";
import { decryptAES256GCM } from "@/lib/crypto/index";
import {
  getUserById,
  normalizeByteaToBase64,
  writeAuditLog,
} from "@/lib/auth/db";
import {
  destroyPendingSession,
  getPendingSession,
} from "@/lib/auth/session";
import { verifyTOTPCode } from "@/lib/auth/totp";

export async function POST(request: NextRequest) {
  try {
    const pendingSetupId = request.cookies.get("pendingSetupId")?.value;
    const body = await request.json();
    const { userId, otpCode } = body;

    if (!pendingSetupId || !userId || !otpCode) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const pending = getPendingSession(pendingSetupId, "setup", userId);
    if (!pending) {
      return NextResponse.json(
        { error: "Setup session expired. Please sign up again." },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    if (!verifyTOTPCode(totpSecret, otpCode)) {
      await writeAuditLog(userId, "totp_setup_failed");
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    await writeAuditLog(userId, "totp_setup_complete");
    destroyPendingSession(pendingSetupId);

    const response = NextResponse.json(
      { success: true, message: "2FA setup saved" },
      { status: 200 }
    );

    response.cookies.set("pendingSetupId", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Setup-2FA confirm error:", error);
    return NextResponse.json(
      { error: "Failed to complete 2FA setup" },
      { status: 500 }
    );
  }
}
