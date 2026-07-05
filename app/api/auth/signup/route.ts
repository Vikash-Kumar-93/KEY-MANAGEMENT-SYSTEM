import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  deriveMasterKeyFromPassphrase,
  generateSalt,
  hashPassphrase,
} from "@/lib/crypto/argon2";
import { generateBackupCodes, generateTOTPSecret } from "@/lib/auth/totp";
import {
  createUser,
  storeBackupCodes,
  storeTOTPSecret,
} from "@/lib/auth/db";
import { createPendingSession } from "@/lib/auth/session";

const MIN_PASSPHRASE_LENGTH = 12;
const MAX_PASSPHRASE_LENGTH = 256;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassphrase(passphrase: string): string | null {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`;
  }

  if (passphrase.length > MAX_PASSPHRASE_LENGTH) {
    return `Passphrase must be less than ${MAX_PASSPHRASE_LENGTH} characters`;
  }

  if (!/[A-Z]/.test(passphrase)) {
    return "Passphrase must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(passphrase)) {
    return "Passphrase must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(passphrase)) {
    return "Passphrase must contain at least one digit";
  }

  return null;
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

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

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const passphraseError = validatePassphrase(passphrase);
    if (passphraseError) {
      return NextResponse.json(
        { error: passphraseError },
        { status: 400 }
      );
    }

    const salt = generateSalt(16);
    const { masterKeyHash } = await hashPassphrase(passphrase, salt);
    const masterKey = await deriveMasterKeyFromPassphrase(passphrase, salt);

    const user = await createUser(email, masterKeyHash, salt);
    const { secret: totpSecret, qrCodeUrl } = await generateTOTPSecret(email);
    const backupCodes = generateBackupCodes(10);

    await storeTOTPSecret(user.id, totpSecret, masterKey);
    await storeBackupCodes(user.id, backupCodes, masterKey);

    const pendingSetupId = createPendingSession(
      crypto.randomBytes(32).toString("hex"),
      "setup",
      user.id,
      masterKey,
      masterKeyHash
    );

    const response = NextResponse.json(
      {
        success: true,
        userId: user.id,
        setupData: {
          totpSecret,
          qrCodeUrl,
          backupCodes,
        },
        message: "User created successfully. Complete 2FA setup.",
      },
      { status: 201 }
    );

    response.cookies.set("pendingSetupId", pendingSetupId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Signup error:", error);

    if (getErrorCode(error) === "23505") {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
