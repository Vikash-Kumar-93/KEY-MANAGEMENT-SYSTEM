import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { getGitHubAccountById } from "@/lib/db/github";
import { decryptAES256GCM } from "@/lib/crypto/index";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const githubAccountId = request.nextUrl.searchParams.get("githubAccountId");
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;

    if (!githubAccountId) {
      return NextResponse.json({ error: "Missing githubAccountId" }, { status: 400 });
    }

    const account = await getGitHubAccountById(githubAccountId);
    if (!account) {
      return NextResponse.json({ error: "GitHub account not found" }, { status: 404 });
    }

    if (account.owner_user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) {
      return NextResponse.json({ error: "Session locked" }, { status: 401 });
    }

    const token = decryptAES256GCM(
      account.access_token_encrypted as string,
      masterKey,
      account.token_iv as string,
      account.token_auth_tag as string
    ).toString("utf8");

    const response = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("GitHub repos fetch failed", response.status, errorBody);
      return NextResponse.json({ error: "Failed to fetch GitHub repositories" }, { status: 502 });
    }

    const repos = await response.json();
    const formatted = (repos || []).map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      owner_login: repo.owner?.login,
      private: repo.private,
    }));

    return NextResponse.json({ success: true, repositories: formatted }, { status: 200 });
  } catch (error: any) {
    console.error("GitHub account repos error:", error);
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
  }
});
