import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServerEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv();
  return createClient(url, getServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
