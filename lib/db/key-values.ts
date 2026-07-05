import { normalizeByteaToBase64 } from "@/lib/auth/db";
import { supabaseAdmin } from "@/lib/supabase/server";

function toPostgresBytea(base64: string): string {
  return "\\x" + Buffer.from(base64, "base64").toString("hex");
}

function normalizeRow(row: any) {
  return {
    ...row,
    ciphertext: normalizeByteaToBase64(row.ciphertext),
    kv_iv: normalizeByteaToBase64(row.kv_iv),
    kv_auth_tag: normalizeByteaToBase64(row.kv_auth_tag),
  };
}

export async function getKeyValues(projectId: string, ownerUserId: string) {
  const { data, error } = await (supabaseAdmin.from("key_values" as any) as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching key-values:", error);
    throw error;
  }

  return (data || []).map(normalizeRow);
}

export async function createKeyValueRecord(
  projectId: string,
  ownerUserId: string,
  key: string,
  encrypted: { ciphertext: string; secretIv: string; secretAuthTag: string },
  isSensitive: boolean
) {
  const { data, error } = await (supabaseAdmin.from("key_values" as any) as any)
    .insert({
      project_id: projectId,
      owner_user_id: ownerUserId,
      key,
      ciphertext: toPostgresBytea(encrypted.ciphertext),
      kv_iv: toPostgresBytea(encrypted.secretIv),
      kv_auth_tag: toPostgresBytea(encrypted.secretAuthTag),
      is_sensitive: isSensitive,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating key-value:", error);
    throw error;
  }

  return normalizeRow(data);
}

export async function getKeyValueById(itemId: string, ownerUserId: string) {
  const { data, error } = await (supabaseAdmin.from("key_values" as any) as any)
    .select("*")
    .eq("id", itemId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching key-value:", error);
    throw error;
  }

  return data ? normalizeRow(data) : null;
}

export async function updateKeyValueRecord(
  itemId: string,
  ownerUserId: string,
  key: string,
  encrypted: { ciphertext: string; secretIv: string; secretAuthTag: string },
  isSensitive: boolean
) {
  const { data, error } = await (supabaseAdmin.from("key_values" as any) as any)
    .update({
      key,
      ciphertext: toPostgresBytea(encrypted.ciphertext),
      kv_iv: toPostgresBytea(encrypted.secretIv),
      kv_auth_tag: toPostgresBytea(encrypted.secretAuthTag),
      is_sensitive: isSensitive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("owner_user_id", ownerUserId)
    .select()
    .single();

  if (error) {
    console.error("Error updating key-value:", error);
    throw error;
  }

  return normalizeRow(data);
}

export async function deleteKeyValue(itemId: string, ownerUserId: string) {
  const { error } = await (supabaseAdmin.from("key_values" as any) as any)
    .delete()
    .eq("id", itemId)
    .eq("owner_user_id", ownerUserId);

  if (error) {
    console.error("Error deleting key-value:", error);
    throw error;
  }
}
