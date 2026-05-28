"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type FeedbackStatus = "new" | "reviewed" | "resolved";

export async function updateFeedbackStatus(
  feedbackId: string,
  newStatus: FeedbackStatus
) {
  const supabase = await createClient();

  // Validate caller is super_admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized: not authenticated" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "super_admin") {
    return { error: "Unauthorized: only Super Admin can change feedback status" };
  }

  // Validate status value
  const validStatuses: FeedbackStatus[] = ["new", "reviewed", "resolved"];
  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status: ${newStatus}` };
  }

  // Update feedback status and updated_at
  const { error: updateError } = await supabase
    .from("feedback")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  if (updateError) {
    return { error: `Failed to update status: ${updateError.message}` };
  }

  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");

  return { success: true };
}
