import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeByteaToBase64 } from "@/lib/auth/db";

type GitHubAccount = Database["public"]["Tables"]["github_accounts"]["Row"];
type Repository = Database["public"]["Tables"]["repositories"]["Row"];

function toPostgresBytea(base64: string): string {
  return "\\x" + Buffer.from(base64, "base64").toString("hex");
}

export async function createGitHubAccount(
  ownerUserId: string,
  githubHandle: string,
  profileUrl: string,
  accessTokenCiphertext: string,
  tokenIv: string,
  tokenAuthTag: string
): Promise<GitHubAccount> {
  const { data, error } = await (supabaseAdmin.from("github_accounts" as any) as any)
    .insert({
      owner_user_id: ownerUserId,
      github_handle: githubHandle,
      profile_url: profileUrl,
      access_token_encrypted: toPostgresBytea(accessTokenCiphertext),
      token_iv: toPostgresBytea(tokenIv),
      token_auth_tag: toPostgresBytea(tokenAuthTag),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating GitHub account:", error);
    throw error;
  }

  return {
    ...data,
    access_token_encrypted: normalizeByteaToBase64(data.access_token_encrypted) as string,
    token_iv: normalizeByteaToBase64(data.token_iv) as string,
    token_auth_tag: normalizeByteaToBase64(data.token_auth_tag) as string,
  } as GitHubAccount;
}

export async function getGitHubAccountsForUser(ownerUserId: string): Promise<GitHubAccount[]> {
  const { data, error } = await (supabaseAdmin.from("github_accounts" as any) as any)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching GitHub accounts:", error);
    throw error;
  }

  return (data as GitHubAccount[]).map((row) => ({
    ...row,
    access_token_encrypted: normalizeByteaToBase64(row.access_token_encrypted) as string,
    token_iv: normalizeByteaToBase64(row.token_iv) as string,
    token_auth_tag: normalizeByteaToBase64(row.token_auth_tag) as string,
  }));
}

export async function createRepository(
  projectId: string,
  githubAccountId: string,
  repoUrl: string,
  defaultBranch?: string
): Promise<Repository> {
  const { data, error } = await (supabaseAdmin.from("repositories" as any) as any)
    .insert({
      project_id: projectId,
      github_account_id: githubAccountId,
      repo_url: repoUrl,
      default_branch: defaultBranch || "main",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating repository:", error);
    throw error;
  }

  return data as Repository;
}

export async function getRepositoriesForAccount(githubAccountId: string): Promise<Repository[]> {
  const { data, error } = await (supabaseAdmin.from("repositories" as any) as any)
    .select("*")
    .eq("github_account_id", githubAccountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching repositories:", error);
    throw error;
  }

  return (data as Repository[]) || [];
}

export async function getRepositoryByProjectId(projectId: string): Promise<Repository | null> {
  const { data, error } = await (supabaseAdmin.from("repositories" as any) as any)
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching repository by project id:", error);
    throw error;
  }

  return (data as Repository) || null;
}

export async function getGitHubAccountById(accountId: string): Promise<GitHubAccount | null> {
  const { data, error } = await (supabaseAdmin.from("github_accounts" as any) as any)
    .select("*")
    .eq("id", accountId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching GitHub account by id:", error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    access_token_encrypted: normalizeByteaToBase64(data.access_token_encrypted) as string,
    token_iv: normalizeByteaToBase64(data.token_iv) as string,
    token_auth_tag: normalizeByteaToBase64(data.token_auth_tag) as string,
  } as GitHubAccount;
}

export async function getRepositoryById(repoId: string): Promise<Repository | null> {
  const { data, error } = await (supabaseAdmin.from("repositories" as any) as any)
    .select("*")
    .eq("id", repoId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching repository by id:", error);
    throw error;
  }

  return (data as Repository) || null;
}

export async function updateRepositorySyncStatus(
  repoId: string,
  status: "idle" | "syncing" | "completed" | "failed",
  metadata?: Record<string, any>
) {
  try {
    const { error } = await (supabaseAdmin.from("repositories" as any) as any)
      .update({
        last_sync_status: status,
        last_synced_at: status === "completed" ? new Date().toISOString() : null,
        last_sync_metadata: metadata || null,
      })
      .eq("id", repoId);

    if (error) throw error;
  } catch (err) {
    console.error("Error updating repository sync status:", err);
    throw err;
  }
}
