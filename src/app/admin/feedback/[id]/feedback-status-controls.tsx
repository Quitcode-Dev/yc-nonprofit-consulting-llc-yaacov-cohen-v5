"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateFeedbackStatus, FeedbackStatus } from "./actions";

interface FeedbackStatusControlsProps {
  feedbackId: string;
  currentStatus: string;
}

const statuses: { value: FeedbackStatus; label: string }[] = [
  { value: "new", label: "Mark as New" },
  { value: "reviewed", label: "Mark as Reviewed" },
  { value: "resolved", label: "Mark as Resolved" },
];

export default function FeedbackStatusControls({
  feedbackId,
  currentStatus,
}: FeedbackStatusControlsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleStatusChange(newStatus: FeedbackStatus) {
    startTransition(async () => {
      const result = await updateFeedbackStatus(feedbackId, newStatus);
      if (result?.error) {
        console.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(({ value, label }) => {
        const isActive = currentStatus === value;
        return (
          <Button
            key={value}
            variant="outline"
            disabled={isActive || isPending}
            onClick={() => handleStatusChange(value)}
            className={
              isActive
                ? "border-primary bg-primary/10 font-semibold cursor-default"
                : ""
            }
          >
            {isPending ? "Updating…" : label}
          </Button>
        );
      })}
    </div>
  );
}
