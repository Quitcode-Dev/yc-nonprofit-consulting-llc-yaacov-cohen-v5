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

  // Roles live in the `user_roles` table. A user may have one row per
  // organization; a super_admin row has organization_id = null. The
  // `is_active` flag gates whether a membership is currently usable.
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role, organization_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (rolesError) {
    console.error("[getUserRole] user_roles query failed:", {
      message: rolesError.message,
      code: (rolesError as { code?: string }).code,
      details: (rolesError as { details?: string }).details,
      hint: (rolesError as { hint?: string }).hint,
      userId,
    });
    return { success: false, role: null, error: "Unable to retrieve user profile" };
  }

  if (!roles || roles.length === 0) {
    console.error("[getUserRole] No active role found for user (none in user_roles or RLS blocked):", {
      userId,
    });
    return { success: false, role: null, error: "Unable to retrieve user profile" };
  }

  // Super admin takes precedence over any organization-level role.
  if (roles.some((r) => r.role === "super_admin")) {
    return { success: true, role: "super_admin", error: null };
  }

  // Otherwise use the first active organization role (e.g. organization_admin).
  const role = roles[0].role ?? "solicitor";

  return { success: true, role, error: null };
}
