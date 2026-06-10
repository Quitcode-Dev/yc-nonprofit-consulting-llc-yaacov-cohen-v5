"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowUpData {
  moveIdeaId: string;
  dueDate: string;
}

export type CompleteMoveState = {
  errors: {
    notes?: string;
    followUpMoveIdeaId?: string;
    followUpDueDate?: string;
    general?: string;
  };
};

// ─── Server Action ────────────────────────────────────────────────────────────

export async function completeMove(
  moveId: string,
  notes: string,
  followUp?: FollowUpData
): Promise<CompleteMoveState> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    return { errors: { general: "No organization found for your account." } };
  }

  const errors: CompleteMoveState["errors"] = {};

  // Validate notes
  const trimmedNotes = notes.trim();
  if (!trimmedNotes) {
    errors.notes = "Completion notes are required.";
  }

  // Validate follow-up if provided
  if (followUp) {
    if (!followUp.moveIdeaId) {
      errors.followUpMoveIdeaId = "Please select a Move Idea for the follow-up.";
    }
    if (!followUp.dueDate) {
      errors.followUpDueDate = "Due date is required for the follow-up move.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(followUp.dueDate + "T00:00:00");
      if (selected < today) {
        errors.followUpDueDate = "Due date must be today or in the future.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createServerClient();

  // Fetch the move to complete — must belong to the same org
  const { data: moveRaw, error: moveError } = await supabase
    .from("moves")
    .select("id, organization_id, donor_id, solicitor_id, status, title")
    .eq("id", moveId)
    .eq("organization_id", organizationId)
    .single();

  if (moveError || !moveRaw) {
    return { errors: { general: "Move not found." } };
  }

  const move = moveRaw as {
    id: string;
    organization_id: string;
    donor_id: string;
    solicitor_id: string;
    status: string;
    title: string;
  };

  if (move.status !== "pending") {
    return { errors: { general: "Only pending moves can be completed." } };
  }

  let followUpMoveId: string | null = null;

  // Create follow-up move first (so we can link it)
  if (followUp) {
    // Fetch move idea title for the follow-up move title
    const { data: ideaRaw, error: ideaError } = await supabase
      .from("move_ideas")
      .select("id, title")
      .eq("id", followUp.moveIdeaId)
      .single();

    if (ideaError || !ideaRaw) {
      return { errors: { followUpMoveIdeaId: "Move Idea not found." } };
    }

    const idea = ideaRaw as { id: string; title: string };

    const { data: newMove, error: createError } = await supabase
      .from("moves")
      .insert({
        organization_id: move.organization_id,
        donor_id: move.donor_id,
        solicitor_id: move.solicitor_id,
        move_idea_id: followUp.moveIdeaId,
        title: idea.title,
        due_date: followUp.dueDate,
        status: "pending",
      })
      .select("id")
      .single();

    if (createError || !newMove) {
      return { errors: { general: "Failed to create follow-up move." } };
    }

    followUpMoveId = (newMove as { id: string }).id;
  }

  // Update the original move to completed
  const updatePayload: Record<string, unknown> = {
    status: "completed",
    completion_notes: trimmedNotes,
    completed_at: new Date().toISOString(),
  };

  if (followUpMoveId) {
    updatePayload.follow_up_move_id = followUpMoveId;
  }

  const { error: updateError } = await supabase
    .from("moves")
    .update(updatePayload)
    .eq("id", moveId)
    .eq("organization_id", organizationId);

  if (updateError) {
    return { errors: { general: "Failed to complete move. Please try again." } };
  }

  redirect("/moves");
}
