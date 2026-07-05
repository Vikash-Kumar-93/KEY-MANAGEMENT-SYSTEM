import { NextRequest, NextResponse } from "next/server";
import { withAuth, getMasterKeyFromRequest } from "@/lib/auth/middleware";
import { getRepositoryById, getGitHubAccountById, updateRepositorySyncStatus } from "@/lib/db/github";
import { decryptAES256GCM } from "@/lib/crypto/index";
import { parseRepoUrl } from "@/lib/github/utils";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const userId = request.headers.get("x-user-id")!;
    const sessionId = request.headers.get("x-session-id")!;
    const body = await request.json();
    const { repositoryId } = body;

    if (!repositoryId) {
      return NextResponse.json({ error: "Missing repositoryId" }, { status: 400 });
    }

    const repo = await getRepositoryById(repositoryId);
    if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

    const account = await getGitHubAccountById(repo.github_account_id as string);
    if (!account) return NextResponse.json({ error: "GitHub account not found" }, { status: 404 });

    const masterKey = getMasterKeyFromRequest(sessionId, userId);
    if (!masterKey) return NextResponse.json({ error: "Session locked" }, { status: 401 });

    // Decrypt PAT
    const token = decryptAES256GCM(
      account.access_token_encrypted as string,
      masterKey,
      account.token_iv as string,
      account.token_auth_tag as string
    ).toString("utf8");

    // Parse repo owner/name from url
    const parsed = parseRepoUrl(repo.repo_url as string);
    if (!parsed) return NextResponse.json({ error: "Invalid repo url" }, { status: 400 });

    const { owner, name } = parsed;

    await updateRepositorySyncStatus(repositoryId, "syncing");

    // Call GitHub API to fetch repo metadata
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });

    if (!ghRes.ok) {
      const meta = { status: ghRes.status, statusText: ghRes.statusText };
      await updateRepositorySyncStatus(repositoryId, "failed", meta);
      return NextResponse.json({ error: "GitHub API error", meta }, { status: 502 });
    }

    const repoData = await ghRes.json();

    // Update repo metadata on success
    await updateRepositorySyncStatus(repositoryId, "completed", { repoData });

    return NextResponse.json({ success: true, repoData }, { status: 200 });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
});
