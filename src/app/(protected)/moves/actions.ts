"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateMoveState = {
  errors: {
    donorId?: string;
    moveIdeaId?: string;
    dueDate?: string;
    title?: string;
    general?: string;
  };
};

// ─── Server Action ────────────────────────────────────────────────────────────

export async function createMove(
  _prevState: CreateMoveState,
  formData: FormData
): Promise<CreateMoveState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  const role = getUserRole(currentUser);

  // Extract form fields
  const donorId = (formData.get("donorId") as string | null)?.trim() ?? "";
  const moveIdeaId =
    (formData.get("moveIdeaId") as string | null)?.trim() ?? "";
  const dueDate = (formData.get("dueDate") as string | null)?.trim() ?? "";
  const title = (formData.get("title") as string | null)?.trim() ?? "";

  const errors: CreateMoveState["errors"] = {};

  // Validate required fields
  if (!donorId) {
    errors.donorId = "Please select a donor.";
  }
  if (!moveIdeaId) {
    errors.moveIdeaId = "Please select a Move Idea.";
  }
  if (!dueDate) {
    errors.dueDate = "Due date is required.";
  }
  if (!title) {
    errors.title = "Title is required.";
  }

  // Validate due date is today or in the future
  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(dueDate + "T00:00:00");
    if (selected < today) {
      errors.dueDate = "Due date must be today or in the future.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createServerClient();

  // Verify donor exists and belongs to org
  const { data: donor, error: donorError } = await supabase
    .from("donors")
    .select("id, assigned_solicitor_id, organization_id")
    .eq("id", donorId)
    .eq("organization_id", organizationId)
    .single();

  if (donorError || !donor) {
    return { errors: { donorId: "Donor not found." } };
  }

  // Solicitors may only create moves for their assigned donors
  const isAdmin = role === "org_admin" || role === "super_admin";
  if (
    !isAdmin &&
    (donor as { assigned_solicitor_id: string | null }).assigned_solicitor_id !==
      currentUser.user.id
  ) {
    return {
      errors: {
        donorId: "You are not assigned to this donor.",
      },
    };
  }

  // Verify move idea exists and is accessible (global or belongs to org)
  const { data: moveIdea, error: ideaError } = await supabase
    .from("move_ideas")
    .select("id, title")
    .eq("id", moveIdeaId)
    .single();

  if (ideaError || !moveIdea) {
    return { errors: { moveIdeaId: "Move Idea not found." } };
  }

  // Determine solicitor_id: for admins the current user acts as solicitor,
  // unless we have a better model. Per spec: solicitor_id = current user.
  const solicitorId = currentUser.user.id;

  // Insert the move
  const { error: insertError } = await supabase.from("moves").insert({
    organization_id: organizationId,
    donor_id: donorId,
    solicitor_id: solicitorId,
    move_idea_id: moveIdeaId,
    title: title,
    due_date: dueDate,
    status: "pending",
  });

  if (insertError) {
    return {
      errors: {
        general: "Failed to create move. Please try again.",
      },
    };
  }

  redirect("/moves");
}
