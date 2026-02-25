import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireProfileRole(profileId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("profile_access")
    .select("role")
    .eq("profile_id", profileId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    redirect("/profiles");
  }

  return { supabase, user, role: data.role as "owner" | "editor" | "viewer" };
}
