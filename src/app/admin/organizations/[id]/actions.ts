"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function deactivateOrganization(orgId: string): Promise<void> {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("organizations")
    .update({ status: "inactive" })
    .eq("id", orgId);

  if (error) {
    throw new Error(`Failed to deactivate organization: ${error.message}`);
  }

  revalidatePath(`/admin/organizations/${orgId}`);
}

export async function reactivateOrganization(orgId: string): Promise<void> {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId);

  if (error) {
    throw new Error(`Failed to reactivate organization: ${error.message}`);
  }

  revalidatePath(`/admin/organizations/${orgId}`);
}
