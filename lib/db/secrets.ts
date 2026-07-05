import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeByteaToBase64 } from "@/lib/auth/db";

type Secret = Database["public"]["Tables"]["secrets"]["Row"];

function toPostgresBytea(base64: string): string {
  return "\\x" + Buffer.from(base64, "base64").toString("hex");
}

function normalizeSecretRow(secret: Secret): Secret {
  return {
    ...secret,
    ciphertext: normalizeByteaToBase64(secret.ciphertext) as string,
    secret_iv: normalizeByteaToBase64(secret.secret_iv) as string,
    secret_auth_tag: normalizeByteaToBase64(secret.secret_auth_tag) as string,
  } as Secret;
}

export async function createSecretRecord(
  projectId: string,
  ownerUserId: string,
  label: string,
  ciphertext: string,
  iv: string,
  authTag: string
): Promise<Secret> {
  const { data, error } = await (supabaseAdmin.from("secrets" as any) as any)
    .insert({
      project_id: projectId,
      owner_user_id: ownerUserId,
      label,
      category: null,
      env_var_name: null,
      source: "manual",
      ciphertext: toPostgresBytea(ciphertext),
      secret_iv: toPostgresBytea(iv),
      secret_auth_tag: toPostgresBytea(authTag),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating secret:", error);
    throw error;
  }

  return normalizeSecretRow(data as Secret);
}

export async function getSecretById(
  secretId: string,
  ownerUserId: string
): Promise<Secret | null> {
  const { data, error } = await (supabaseAdmin.from("secrets" as any) as any)
    .select("*")
    .eq("id", secretId)
    .eq("owner_user_id", ownerUserId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching secret:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeSecretRow(data as Secret);
}

export async function getProjectSecrets(
  projectId: string,
  ownerUserId: string
): Promise<Secret[]> {
  const { data, error } = await (supabaseAdmin.from("secrets" as any) as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching project secrets:", error);
    throw error;
  }

  return (
    (data as Secret[])?.map((secret) => normalizeSecretRow(secret)) || []
  );
}

export async function updateSecretRecord(
  secretId: string,
  ownerUserId: string,
  label: string,
  ciphertext: string,
  iv: string,
  authTag: string
): Promise<Secret> {
  const { data, error } = await (supabaseAdmin.from("secrets" as any) as any)
    .update({
      label,
      ciphertext: toPostgresBytea(ciphertext),
      secret_iv: toPostgresBytea(iv),
      secret_auth_tag: toPostgresBytea(authTag),
    })
    .eq("id", secretId)
    .eq("owner_user_id", ownerUserId)
    .select()
    .single();

  if (error) {
    console.error("Error updating secret:", error);
    throw error;
  }

  return normalizeSecretRow(data as Secret);
}

export async function deleteSecret(
  secretId: string,
  ownerUserId: string
): Promise<void> {
  const { error } = await (supabaseAdmin.from("secrets" as any) as any)
    .delete()
    .eq("id", secretId)
    .eq("owner_user_id", ownerUserId);

  if (error) {
    console.error("Error deleting secret:", error);
    throw error;
  }
}
