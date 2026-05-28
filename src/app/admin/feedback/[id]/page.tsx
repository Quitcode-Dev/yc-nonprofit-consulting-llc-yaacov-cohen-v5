import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import FeedbackStatusControls from "./feedback-status-controls";

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeedbackDetailPage({
  params,
}: FeedbackDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Validate caller is authenticated and super_admin
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  // Fetch feedback item
  const { data: feedback, error: feedbackError } = await supabase
    .from("feedback")
    .select("*")
    .eq("id", id)
    .single();

  if (feedbackError || !feedback) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Feedback Not Found</h1>
        <p className="text-muted-foreground">
          The feedback item you are looking for does not exist or could not be
          loaded.
        </p>
      </div>
    );
  }

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    new: "default",
    reviewed: "secondary",
    resolved: "outline",
  };

  const statusLabel: Record<string, string> = {
    new: "New",
    reviewed: "Reviewed",
    resolved: "Resolved",
  };

  const currentStatus = feedback.status || "new";
  const updatedAt = feedback.updated_at
    ? new Date(feedback.updated_at).toLocaleString()
    : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <a
          href="/admin/feedback"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Feedback Inbox
        </a>
      </div>

      {/* Status section */}
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Status:
          </span>
          <Badge
            variant={statusVariant[currentStatus] || "default"}
            className="text-base px-4 py-1"
          >
            {statusLabel[currentStatus] || currentStatus}
          </Badge>
        </div>
        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Status updated: {updatedAt}
          </p>
        )}
      </div>

      {/* Status change controls */}
      <FeedbackStatusControls
        feedbackId={id}
        currentStatus={currentStatus}
      />

      {/* Feedback details */}
      <div className="mt-8 space-y-4">
        {feedback.category && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Category
            </h3>
            <p>{feedback.category}</p>
          </div>
        )}

        {feedback.subject && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Subject
            </h3>
            <p className="text-lg font-semibold">{feedback.subject}</p>
          </div>
        )}

        {feedback.message && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Message
            </h3>
            <p className="whitespace-pre-wrap">{feedback.message}</p>
          </div>
        )}

        {feedback.user_id && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Submitted By
            </h3>
            <p className="text-sm">{feedback.user_id}</p>
          </div>
        )}

        {feedback.created_at && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Submitted At
            </h3>
            <p className="text-sm">
              {new Date(feedback.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
