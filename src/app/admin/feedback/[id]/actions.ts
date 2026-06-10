"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type FeedbackStatus = "new" | "reviewed" | "resolved";

export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<void> {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", feedbackId);

  if (error) {
    throw new Error(`Failed to update feedback status: ${error.message}`);
  }

  revalidatePath(`/admin/feedback/${feedbackId}`);
  revalidatePath("/admin/feedback");
}
