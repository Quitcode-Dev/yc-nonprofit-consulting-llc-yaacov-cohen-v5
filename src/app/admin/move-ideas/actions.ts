"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function createGlobalMoveIdea(
  title: string,
  category: string
): Promise<{ error?: string }> {
  await requireRole(["super_admin"]);

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

  const supabase = await createServerClient();

  const { error } = await supabase.from("move_ideas").insert({
    title: trimmedTitle,
    category: trimmedCategory,
    organization_id: null,
  });

  if (error) {
    return { error: "Failed to create move idea. Please try again." };
  }

  revalidatePath("/admin/move-ideas");
  return {};
}

export async function updateGlobalMoveIdea(
  id: string,
  title: string,
  category: string
): Promise<{ error?: string }> {
  await requireRole(["super_admin"]);

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

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("move_ideas")
    .update({ title: trimmedTitle, category: trimmedCategory })
    .eq("id", id)
    .is("organization_id", null);

  if (error) {
    return { error: "Failed to update move idea. Please try again." };
  }

  revalidatePath("/admin/move-ideas");
  return {};
}

export async function deleteGlobalMoveIdea(
  id: string
): Promise<{ error?: string }> {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  // Delete only from move_ideas; moves retain their title as plain text
  // because moves.move_idea_id uses ON DELETE SET NULL in the schema.
  const { error } = await supabase
    .from("move_ideas")
    .delete()
    .eq("id", id)
    .is("organization_id", null);

  if (error) {
    return { error: "Failed to delete move idea. Please try again." };
  }

  revalidatePath("/admin/move-ideas");
  return {};
}
