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
    .select("id, organization_id, donor_id, assigned_to, is_completed, name")
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
    assigned_to: string | null;
    is_completed: boolean;
    name: string;
  };

  if (move.is_completed) {
    return { errors: { general: "Only pending moves can be completed." } };
  }

  // Create follow-up move (a new pending move). The original move cannot be
  // linked back to it because the live schema has no follow_up_move_id column.
  // SCHEMA-GAP: moves has no follow_up_move_id in live schema
  if (followUp) {
    // Fetch move idea name for the follow-up move name
    const { data: ideaRaw, error: ideaError } = await supabase
      .from("move_ideas")
      .select("id, name")
      .eq("id", followUp.moveIdeaId)
      .single();

    if (ideaError || !ideaRaw) {
      return { errors: { followUpMoveIdeaId: "Move Idea not found." } };
    }

    const idea = ideaRaw as { id: string; name: string };

    const { data: newMove, error: createError } = await supabase
      .from("moves")
      .insert({
        organization_id: move.organization_id,
        donor_id: move.donor_id,
        assigned_to: move.assigned_to,
        move_idea_id: followUp.moveIdeaId,
        name: idea.name,
        due_date: followUp.dueDate,
        is_completed: false,
      })
      .select("id")
      .single();

    if (createError || !newMove) {
      return { errors: { general: "Failed to create follow-up move." } };
    }
  }

  // Update the original move to completed.
  // SCHEMA-GAP: moves has no follow_up_move_id in live schema — cannot link
  // the original move to the follow-up move.
  const updatePayload: Record<string, unknown> = {
    is_completed: true,
    completion_notes: trimmedNotes,
    completed_at: new Date().toISOString(),
  };

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
