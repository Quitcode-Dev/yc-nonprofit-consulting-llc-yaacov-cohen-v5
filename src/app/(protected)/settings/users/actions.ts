"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Deactivates a solicitor by setting their organization_users status to
 * 'inactive' AND their profiles status to 'inactive'.
 * Does NOT delete move records or donor assignments.
 */
export async function deactivateSolicitor(
  userId: string
): Promise<ActionResult> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return { success: false, error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Update organization_users status
  const { error: orgUserError } = await supabase
    .from("organization_users")
    .update({ status: "inactive" })
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (orgUserError) {
    console.error("Failed to deactivate organization_users record:", orgUserError);
    return { success: false, error: "Failed to deactivate user." };
  }

  // Also update profiles status
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ status: "inactive" })
    .eq("id", userId);

  if (profileError) {
    console.error("Failed to update profile status:", profileError);
    // Non-fatal: org_users was updated, log and continue
  }

  revalidatePath("/settings/users");

  return { success: true };
}

/**
 * Reactivates a solicitor by setting their organization_users status to
 * 'active' AND their profiles status to 'active'.
 */
export async function reactivateSolicitor(
  userId: string
): Promise<ActionResult> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return { success: false, error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Update organization_users status
  const { error: orgUserError } = await supabase
    .from("organization_users")
    .update({ status: "active" })
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (orgUserError) {
    console.error("Failed to reactivate organization_users record:", orgUserError);
    return { success: false, error: "Failed to reactivate user." };
  }

  // Also update profiles status
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", userId);

  if (profileError) {
    console.error("Failed to update profile status:", profileError);
    // Non-fatal: org_users was updated, log and continue
  }

  revalidatePath("/settings/users");

  return { success: true };
}
