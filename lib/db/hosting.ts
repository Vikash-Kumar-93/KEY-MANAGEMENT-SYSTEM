import { supabaseAdmin } from "@/lib/supabase/server";

export async function getHosting(projectId: string, ownerUserId: string) {
  const { data, error } = await (supabaseAdmin.from("hosting" as any) as any)
    .select("*, projects!inner(owner_user_id)")
    .eq("project_id", projectId)
    .eq("projects.owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching hosting:", error);
    throw error;
  }

  return data;
}

export async function saveHosting(
  projectId: string,
  ownerUserId: string,
  payload: {
    host_type: "vercel" | "vps" | "other" | null;
    vercel_url?: string | null;
    vps_host?: string | null;
    vps_sso_login_url?: string | null;
    notes?: string | null;
  }
) {
  const existing = await getHosting(projectId, ownerUserId);
  const row = {
    project_id: projectId,
    host_type: payload.host_type,
    vercel_url: payload.vercel_url || null,
    vps_host: payload.vps_host || null,
    vps_sso_login_url: payload.vps_sso_login_url || null,
    notes: payload.notes || null,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? (supabaseAdmin.from("hosting" as any) as any).update(row).eq("id", existing.id)
    : (supabaseAdmin.from("hosting" as any) as any).insert(row);

  const { data, error } = await query.select().single();

  if (error) {
    console.error("Error saving hosting:", error);
    throw error;
  }

  return data;
}
