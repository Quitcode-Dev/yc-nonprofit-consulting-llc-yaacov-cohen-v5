"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateFeedbackStatus, type FeedbackStatus } from "./actions";

interface StatusFormProps {
  feedbackId: string;
  currentStatus: FeedbackStatus;
}

const STATUS_TRANSITIONS: Record<
  FeedbackStatus,
  { label: string; next: FeedbackStatus }[]
> = {
  new: [{ label: "Mark as Reviewed", next: "reviewed" }],
  reviewed: [
    { label: "Mark as Resolved", next: "resolved" },
    { label: "Reset to New", next: "new" },
  ],
  resolved: [{ label: "Reopen (Mark as Reviewed)", next: "reviewed" }],
};

export function StatusForm({ feedbackId, currentStatus }: StatusFormProps) {
  const [isPending, startTransition] = useTransition();

  const transitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  function handleStatusChange(next: FeedbackStatus) {
    startTransition(async () => {
      await updateFeedbackStatus(feedbackId, next);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map(({ label, next }) => (
        <Button
          key={next}
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange(next)}
        >
          {isPending ? "Updating…" : label}
        </Button>
      ))}
    </div>
  );
}
