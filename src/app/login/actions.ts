"use server";

import { createServerClient } from "@/lib/supabase/server";

export interface LoginResult {
  success: boolean;
  error: string | null;
}

export async function loginAction(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = await createServerClient();

  // Attempt to sign in
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !data.user) {
    return {
      success: false,
      error: authError?.message ?? "Invalid email or password.",
    };
  }

  // Check the user's profile status
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .single();

  if (profile) {
    if (profile.status === "inactive") {
      // Sign out the user since they should not have an active session
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Your account has been deactivated. Contact your administrator.",
      };
    }

    if (profile.status === "pending") {
      // Sign out the user since they haven't completed registration
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Please complete your registration using the invitation link.",
      };
    }
  }

  // Also check organization membership status
  const { data: organizationUser } = await supabase
    .from("organization_users")
    .select("status")
    .eq("user_id", data.user.id)
    .single();

  if (organizationUser) {
    if (organizationUser.status === "inactive") {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Your account has been deactivated. Contact your administrator.",
      };
    }

    if (organizationUser.status === "pending") {
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Please complete your registration using the invitation link.",
      };
    }
  }

  return {
    success: true,
    error: null,
  };
}
