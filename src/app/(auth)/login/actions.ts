"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, role: null, error: "Email and password are required" };
  }

  const supabase = await createServerClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { success: false, role: null, error: "Invalid email or password" };
  }

  const userId = authData.user.id;

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
    return { success: true, role: "super_admin" as const, error: null };
  }

  // Check organization_users for org-level role (org_admin, fundraiser/solicitor)
  const { data: orgUser } = await supabase
    .from("organization_users")
    .select("role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  // Map to spec roles: org_admin → /dashboard, solicitor/fundraiser → /dashboard
  const role = orgUser?.role ?? "solicitor";

  return { success: true, role, error: null };
}
