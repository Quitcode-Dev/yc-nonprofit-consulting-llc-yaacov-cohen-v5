"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function createOrgMoveIdea(
  title: string,
  category: string,
  orgId: string
): Promise<{ error?: string }> {
  await requireRole(["org_admin", "super_admin"]);

  const trimmedTitle = title.trim();
  const trimmedCategory = category.trim();

  if (!trimmedTitle) {
    return { error: "Title is required." };
  }
  if (trimmedTitle.length > 150) {
    return { error: "Title must be 150 characters or fewer." };
  }
  if (!trimmedCategory) {
    return { error: "Category is required." };
  }

  // Verify the caller belongs to (or is allowed to manage) the given org
  const callerOrgId = await getUserOrganizationId();
  if (callerOrgId !== orgId) {
    return { error: "You do not have permission to create ideas for this organization." };
  }

  const supabase = await createServerClient();

  const { error } = await supabase.from("move_ideas").insert({
    title: trimmedTitle,
    category: trimmedCategory,
    organization_id: orgId,
  });

  if (error) {
    return { error: "Failed to create move idea. Please try again." };
  }

  revalidatePath("/settings/move-ideas");
  return {};
}

export async function updateOrgMoveIdea(
  id: string,
  title: string,
  category: string
): Promise<{ error?: string }> {
  await requireRole(["org_admin", "super_admin"]);

  const trimmedTitle = title.trim();
  const trimmedCategory = category.trim();

  if (!trimmedTitle) {
    return { error: "Title is required." };
  }
  if (trimmedTitle.length > 150) {
    return { error: "Title must be 150 characters or fewer." };
  }
  if (!trimmedCategory) {
    return { error: "Category is required." };
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Verify the idea belongs to the caller's org before updating
  const { data: existing, error: fetchError } = await supabase
    .from("move_ideas")
    .select("id, organization_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return { error: "Move idea not found." };
  }

  if (existing.organization_id !== orgId) {
    return { error: "You do not have permission to edit this move idea." };
  }

  const { error } = await supabase
    .from("move_ideas")
    .update({ title: trimmedTitle, category: trimmedCategory })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    return { error: "Failed to update move idea. Please try again." };
  }

  revalidatePath("/settings/move-ideas");
  return {};
}

export async function deleteOrgMoveIdea(
  id: string
): Promise<{ error?: string }> {
  await requireRole(["org_admin", "super_admin"]);

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { error: "No organization found for your account." };
  }

  const supabase = await createServerClient();

  // Verify the idea belongs to the caller's org before deleting
  const { data: existing, error: fetchError } = await supabase
    .from("move_ideas")
    .select("id, organization_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return { error: "Move idea not found." };
  }

  if (existing.organization_id !== orgId) {
    return { error: "You do not have permission to delete this move idea." };
  }

  // Delete the idea; historical moves retain their title via ON DELETE SET NULL
  const { error } = await supabase
    .from("move_ideas")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    return { error: "Failed to delete move idea. Please try again." };
  }

  revalidatePath("/settings/move-ideas");
  return {};
}
