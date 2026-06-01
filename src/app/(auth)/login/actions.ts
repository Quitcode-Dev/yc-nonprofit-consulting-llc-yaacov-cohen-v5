"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function getUserRole(): Promise<{
  success: boolean;
  role: string | null;
  error: string | null;
}> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, role: null, error: "Not authenticated" };
  }

  const userId = user.id;

  // Check if user is a super admin via profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, role: null, error: "Unable to retrieve user profile" };
  }

  if (profile.is_super_admin) {
    return { success: true, role: "super_admin", error: null };
  }

  // Check organization_users for org-level role (org_admin, fundraiser/solicitor)
  const { data: orgUser } = await supabase
    .from("organization_users")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  const role = orgUser?.role ?? "solicitor";

  return { success: true, role, error: null };
}
