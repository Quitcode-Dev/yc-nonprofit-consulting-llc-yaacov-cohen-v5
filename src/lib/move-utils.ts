// ─── Move Status Utilities ────────────────────────────────────────────────────
// Shared helpers for determining and displaying move overdue status consistently
// across the moves list, calendar, and donor profile move history views.

export type DisplayStatus = "pending" | "completed" | "overdue";

/**
 * Determines the display status of a move, promoting a pending move to
 * 'overdue' when its due_date is strictly before today (date-only comparison).
 *
 * Completed moves are never considered overdue regardless of their due_date.
 */
export function getDisplayStatus(move: {
  status: string;
  due_date: string;
}): DisplayStatus {
  if (move.status === "completed") {
    return "completed";
  }

  if (move.status === "pending") {
    // Compare dates without time to avoid timezone-related off-by-one issues.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, mo, d] = move.due_date.split("-").map(Number);
    const dueDate = new Date(y, mo - 1, d);

    if (dueDate < today) {
      return "overdue";
    }
  }

  return "pending";
}

export interface StatusBadgeProps {
  variant: string;
  className: string;
  label: string;
}

/**
 * Returns the Badge variant, Tailwind className, and display label for a given
 * display status. These colors are chosen to meet WCAG AA contrast ratios.
 */
export function getStatusBadgeProps(displayStatus: string): StatusBadgeProps {
  switch (displayStatus) {
    case "overdue":
      return {
        variant: "destructive",
        className: "bg-red-100 text-red-800 border-red-200",
        label: "Overdue",
      };
    case "completed":
      return {
        variant: "secondary",
        className: "bg-green-100 text-green-800 border-green-200",
        label: "Completed",
      };
    default:
      return {
        variant: "outline",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Pending",
      };
  }
}
