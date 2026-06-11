"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Deactivates a solicitor by setting their user_roles.is_active to false.
 * `memberId` is the user_roles row id (the membership id, rule 6).
 * Does NOT delete move records or donor assignments.
 */
export async function deactivateSolicitor(
  memberId: string
): Promise<ActionResult> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return { success: false, error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Deactivate the membership row in user_roles (is_active = false).
  const { error: memberError } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (memberError) {
    console.error("Failed to deactivate user_roles record:", memberError);
    return { success: false, error: "Failed to deactivate user." };
  }

  revalidatePath("/settings/users");

  return { success: true };
}

/**
 * Reactivates a solicitor by setting their user_roles.is_active to true.
 * `memberId` is the user_roles row id (the membership id, rule 6).
 */
export async function reactivateSolicitor(
  memberId: string
): Promise<ActionResult> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return { success: false, error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Reactivate the membership row in user_roles (is_active = true).
  const { error: memberError } = await supabase
    .from("user_roles")
    .update({ is_active: true })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (memberError) {
    console.error("Failed to reactivate user_roles record:", memberError);
    return { success: false, error: "Failed to reactivate user." };
  }

  revalidatePath("/settings/users");

  return { success: true };
}
