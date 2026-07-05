import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { createGitHubAccount, getGitHubAccountsForUser } from "@/lib/db/github";
import { encryptAES256GCM } from "@/lib/crypto/index";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const accounts = await getGitHubAccountsForUser(userId);
    return NextResponse.json({ success: true, accounts }, { status: 200 });
  } catch (error: any) {
    console.error("List GitHub accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { githubHandle, profileUrl, accessToken } = body;

    if (!githubHandle || !accessToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const { ciphertext, iv, authTag } = encryptAES256GCM(accessToken, masterKey);

    const account = await createGitHubAccount(
      userId,
      githubHandle,
      profileUrl || "",
      ciphertext,
      iv,
      authTag
    );

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error: any) {
    console.error("Create GitHub account error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
});

