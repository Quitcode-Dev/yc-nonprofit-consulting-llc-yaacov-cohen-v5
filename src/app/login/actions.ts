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

  // Check the user's organization membership status
  const { data: organizationUser } = await supabase
    .from("organization_users")
    .select("status")
    .eq("user_id", data.user.id)
    .single();

  if (organizationUser) {
    if (organizationUser.status === "disabled") {
      // Sign out the user since they should not have an active session
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Your account has been deactivated. Contact your administrator.",
      };
    }

    if (organizationUser.status === "invited") {
      // Sign out the user since they haven't completed registration
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
