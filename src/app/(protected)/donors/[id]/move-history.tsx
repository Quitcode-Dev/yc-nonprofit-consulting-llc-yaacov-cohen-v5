import React from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisplayStatus, getStatusBadgeProps } from "@/lib/move-utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

// Live `moves` schema fields used here. The legacy UI fields are derived:
//   title  <- name
//   status <- is_completed (boolean) mapped to "pending" | "completed"
//   solicitor_id <- assigned_to (a user_roles.id)
// SCHEMA-GAP: moves has no 'follow_up_move_id' column in live schema.
// SCHEMA-GAP: moves has no 'created_at' column in live schema; order by due_date.
interface MoveDbRow {
  id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
  completion_notes: string | null;
  assigned_to: string | null;
}

interface MoveRow {
  id: string;
  title: string;
  due_date: string;
  status: "pending" | "completed";
  completion_notes: string | null;
  solicitor_id: string | null;
}

interface EnrichedMove extends MoveRow {
  solicitorName: string | null;
  displayStatus: "pending" | "completed" | "overdue";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  // Parse as local date to avoid UTC off-by-one
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default async function MoveHistory({ donorId }: { donorId: string }) {
  const supabase = await createServerClient();

  // Fetch all moves for this donor.
  // SCHEMA-GAP: moves has no 'created_at' column in live schema; order by due_date.
  const { data: movesRaw } = await supabase
    .from("moves")
    .select(
      "id, name, due_date, is_completed, completion_notes, assigned_to"
    )
    .eq("donor_id", donorId)
    .order("due_date", { ascending: false });

  // Map live `moves` rows to the legacy MoveRow shape the UI expects.
  const rawMoves = ((movesRaw ?? []) as MoveDbRow[]).map((m) => ({
    id: m.id,
    title: m.name,
    due_date: m.due_date,
    status: (m.is_completed ? "completed" : "pending") as
      | "pending"
      | "completed",
    completion_notes: m.completion_notes,
    solicitor_id: m.assigned_to,
  }));

  // Collect unique solicitor IDs (assigned_to references user_roles.id).
  const solicitorIds = [
    ...new Set(
      rawMoves
        .map((m) => m.solicitor_id)
        .filter((id): id is string => id !== null)
    ),
  ];
  const solicitorMap = new Map<string, string>();

  if (solicitorIds.length > 0) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id, full_name, email")
      .in("id", solicitorIds);

    if (roleRows) {
      for (const r of roleRows as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>) {
        const name = r.full_name || r.email || r.id;
        solicitorMap.set(r.id, name);
      }
    }
  }

  // Compute display status (pending / completed / overdue) using shared utility
  const moves: EnrichedMove[] = rawMoves.map((m) => ({
    ...m,
    solicitorName: m.solicitor_id
      ? (solicitorMap.get(m.solicitor_id) ?? null)
      : null,
    displayStatus: getDisplayStatus(m),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Move History</CardTitle>
          <Button asChild size="sm">
            <Link href={`/moves/new?donorId=${donorId}`}>Create Move</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {moves.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No moves have been created for this donor yet.
          </p>
        ) : (
          <div>
            {moves.map((move) => (
              <div
                key={move.id}
                className="flex items-start justify-between py-3 border-b last:border-0"
              >
                {/* Left side */}
                <div className="flex-1 min-w-0 pr-4 space-y-1">
                  {/* Title */}
                  <Link
                    href={`/moves/${move.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {move.title}
                  </Link>

                  {/* Solicitor name */}
                  {move.solicitorName && (
                    <p className="text-xs text-muted-foreground">
                      {move.solicitorName}
                    </p>
                  )}

                  {/* Due date */}
                  <p className="text-xs text-muted-foreground">
                    Due: {formatDate(move.due_date)}
                  </p>

                  {/* SCHEMA-GAP: moves has no 'follow_up_move_id' column in live
                      schema; follow-up linkage removed. */}
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {/* Status badge */}
                  {(() => {
                    const badgeProps = getStatusBadgeProps(move.displayStatus);
                    return (
                      <Badge
                        variant={
                          badgeProps.variant as
                            | "destructive"
                            | "secondary"
                            | "outline"
                            | "default"
                        }
                        className={badgeProps.className}
                      >
                        {badgeProps.label}
                      </Badge>
                    );
                  })()}

                  {/* Completion notes (if completed) */}
                  {move.status === "completed" && move.completion_notes && (
                    <details className="text-right">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                        Notes
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs text-left whitespace-pre-wrap">
                        {move.completion_notes}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
