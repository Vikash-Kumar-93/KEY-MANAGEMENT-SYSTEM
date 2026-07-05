import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeByteaToBase64 } from "@/lib/auth/db";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectDataKey = Database["public"]["Tables"]["project_data_keys"]["Row"];

function toPostgresBytea(base64: string): string {
  return "\\x" + Buffer.from(base64, "base64").toString("hex");
}

function normalizeProjectDataKeyRow(
  row: ProjectDataKey
): ProjectDataKey {
  return {
    ...row,
    wrapped_key: normalizeByteaToBase64(row.wrapped_key),
    key_iv: normalizeByteaToBase64(row.key_iv),
    key_auth_tag: normalizeByteaToBase64(row.key_auth_tag),
  } as ProjectDataKey;
}

export async function createProject(
  ownerUserId: string,
  name: string,
  notes: string | null
): Promise<Project> {
  const { data, error } = await (supabaseAdmin.from("projects" as any) as any)
    .insert({
      owner_user_id: ownerUserId,
      name,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    throw error;
  }

  return data as Project;
}

export async function createProjectDataKeyRecord(
  projectId: string,
  ownerUserId: string,
  wrappedKey: string,
  keyIv: string,
  keyAuthTag: string
): Promise<ProjectDataKey> {
  const { data, error } = await (supabaseAdmin.from("project_data_keys" as any) as any)
    .insert({
      project_id: projectId,
      owner_user_id: ownerUserId,
      wrapped_key: toPostgresBytea(wrappedKey),
      key_iv: toPostgresBytea(keyIv),
      key_auth_tag: toPostgresBytea(keyAuthTag),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating project data key record:", error);
    throw error;
  }

  return normalizeProjectDataKeyRow(data as ProjectDataKey);
}

export async function getProjectDataKeyForUser(
  projectId: string,
  ownerUserId: string
): Promise<ProjectDataKey | null> {
  const { data, error } = await (supabaseAdmin.from("project_data_keys" as any) as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_user_id", ownerUserId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching project data key:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeProjectDataKeyRow(data as ProjectDataKey);
}

export async function getProjectsForUser(
  ownerUserId: string
): Promise<Project[]> {
  const { data, error } = await (supabaseAdmin.from("projects" as any) as any)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects for user:", error);
    throw error;
  }

  return (data as Project[]) || [];
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const { data, error } = await (supabaseAdmin.from("projects" as any) as any)
    .select("*")
    .eq("id", projectId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching project by id:", error);
    throw error;
  }

  return (data as Project) || null;
}

export async function updateProject(
  projectId: string,
  ownerUserId: string,
  name?: string,
  notes?: string | null
): Promise<Project> {
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await (supabaseAdmin.from("projects" as any) as any)
    .update(updateData)
    .eq("id", projectId)
    .eq("owner_user_id", ownerUserId)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    throw error;
  }

  return data as Project;
}

export async function deleteProject(
  projectId: string,
  ownerUserId: string
): Promise<void> {
  const { error } = await (supabaseAdmin.from("projects" as any) as any)
    .delete()
    .eq("id", projectId)
    .eq("owner_user_id", ownerUserId);

  if (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}
