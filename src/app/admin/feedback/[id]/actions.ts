"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type FeedbackStatus = "new" | "reviewed" | "resolved";

const VALID_STATUSES: FeedbackStatus[] = ["new", "reviewed", "resolved"];

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<{ success?: true; error?: string }> {
  await requireRole(["super_admin"]);

  if (!VALID_STATUSES.includes(status)) {
    return { error: `Invalid status: ${status}` };
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", feedbackId);

  if (error) {
    return { error: `Failed to update feedback status: ${error.message}` };
  }

  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");

  return { success: true };
}
