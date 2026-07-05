import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;


const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const supabaseSecretKeyEnvName = process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_SECRET_KEY";


if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY) {
  throw new Error(
    "Refusing to use a Supabase secret provided via NEXT_PUBLIC_* environment variables. Move the key to a server-only env var (e.g. SUPABASE_SERVICE_ROLE_KEY)."
  );
}

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Supabase server client requires NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) environment variables."
  );
}


if (supabaseSecretKeyEnvName === "SUPABASE_SECRET_KEY") {
  
  console.warn(
    "Warning: using SUPABASE_SECRET_KEY for server client. For full admin privileges use SUPABASE_SERVICE_ROLE_KEY (server-only)."
  );
}


export const supabaseAdmin = createClient<
  Database,
  'public',
  'public'
>(
  supabaseUrl,
  supabaseSecretKey
);

/**
 
 */
export function getSupabaseServerKeySource(): string {
  return supabaseSecretKeyEnvName;
}
