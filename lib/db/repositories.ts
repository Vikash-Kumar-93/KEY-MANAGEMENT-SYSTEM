import { supabaseAdmin } from "@/lib/supabase/server";

export async function getGithubAccounts(ownerUserId: string) {
  const { data, error } = await (supabaseAdmin.from("github_accounts" as any) as any)
    .select("id, owner_user_id, github_handle, profile_url, created_at, updated_at")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching GitHub accounts:", error);
    throw error;
  }

  return data || [];
}

export async function createGithubAccount(
  ownerUserId: string,
  githubHandle: string,
  profileUrl: string,
  encryptedToken: { ciphertext: string; iv: string; authTag: string }
) {
  const toBytea = (value: string) => "\\x" + Buffer.from(value, "base64").toString("hex");
  const { data, error } = await (supabaseAdmin.from("github_accounts" as any) as any)
    .insert({
      owner_user_id: ownerUserId,
      github_handle: githubHandle,
      profile_url: profileUrl,
      access_token_encrypted: toBytea(encryptedToken.ciphertext),
      token_iv: toBytea(encryptedToken.iv),
      token_auth_tag: toBytea(encryptedToken.authTag),
    })
    .select("id, owner_user_id, github_handle, profile_url, created_at, updated_at")
    .single();

  if (error) {
    console.error("Error creating GitHub account:", error);
    throw error;
  }

  return data;
}

export async function getRepository(projectId: string, ownerUserId: string) {
  const { data, error } = await (supabaseAdmin.from("repositories" as any) as any)
    .select("*, github_accounts!inner(owner_user_id, github_handle)")
    .eq("project_id", projectId)
    .eq("github_accounts.owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching repository:", error);
    throw error;
  }

  return data;
}

export async function saveRepository(
  projectId: string,
  ownerUserId: string,
  payload: {
    github_account_id: string;
    repo_url: string;
    default_branch?: string | null;
  }
) {
  const accounts = await getGithubAccounts(ownerUserId);
  if (!accounts.some((account: any) => account.id === payload.github_account_id)) {
    throw new Error("GitHub account not found");
  }

  const existing = await getRepository(projectId, ownerUserId);
  const row = {
    project_id: projectId,
    github_account_id: payload.github_account_id,
    repo_url: payload.repo_url,
    default_branch: payload.default_branch || "main",
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? (supabaseAdmin.from("repositories" as any) as any).update(row).eq("id", existing.id)
    : (supabaseAdmin.from("repositories" as any) as any).insert(row);

  const { data, error } = await query.select().single();

  if (error) {
    console.error("Error saving repository:", error);
    throw error;
  }

  return data;
}
