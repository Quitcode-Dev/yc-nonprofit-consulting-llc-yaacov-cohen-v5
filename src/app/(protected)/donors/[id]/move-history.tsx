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
import { Link2 } from "lucide-react";
import { getDisplayStatus, getStatusBadgeProps } from "@/lib/move-utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MoveRow {
  id: string;
  title: string;
  due_date: string;
  status: "pending" | "completed";
  completion_notes: string | null;
  follow_up_move_id: string | null;
  created_at: string;
  solicitor_id: string;
}

interface EnrichedMove extends MoveRow {
  solicitorName: string | null;
  followUpMoveTitle: string | null;
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

  // Fetch all moves for this donor, ordered by created_at DESC
  const { data: movesRaw } = await supabase
    .from("moves")
    .select(
      "id, title, due_date, status, completion_notes, follow_up_move_id, created_at, solicitor_id"
    )
    .eq("donor_id", donorId)
    .order("created_at", { ascending: false });

  const rawMoves = (movesRaw ?? []) as MoveRow[];

  // Collect unique solicitor IDs for batch profile fetch
  const solicitorIds = [...new Set(rawMoves.map((m) => m.solicitor_id))];
  const solicitorMap = new Map<string, string>();

  if (solicitorIds.length > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", solicitorIds);

    if (profilesRaw) {
      for (const p of profilesRaw as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>) {
        const name =
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.email ||
          p.id;
        solicitorMap.set(p.id, name);
      }
    }
  }

  // Collect follow-up move IDs for batch title fetch
  const followUpIds = rawMoves
    .map((m) => m.follow_up_move_id)
    .filter((id): id is string => id !== null);

  const followUpTitleMap = new Map<string, string>();

  if (followUpIds.length > 0) {
    const { data: followUpMovesRaw } = await supabase
      .from("moves")
      .select("id, title")
      .in("id", followUpIds);

    if (followUpMovesRaw) {
      for (const fm of followUpMovesRaw as Array<{
        id: string;
        title: string;
      }>) {
        followUpTitleMap.set(fm.id, fm.title);
      }
    }
  }

  // Compute display status (pending / completed / overdue) using shared utility
  const moves: EnrichedMove[] = rawMoves.map((m) => ({
    ...m,
    solicitorName: solicitorMap.get(m.solicitor_id) ?? null,
    followUpMoveTitle: m.follow_up_move_id
      ? (followUpTitleMap.get(m.follow_up_move_id) ?? null)
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

                  {/* Follow-up linkage */}
                  {move.follow_up_move_id && move.followUpMoveTitle && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 className="h-3 w-3 flex-shrink-0" />
                      <span>Follow-up to:</span>
                      <Link
                        href={`/moves/${move.follow_up_move_id}`}
                        className="font-medium text-primary hover:underline truncate"
                      >
                        {move.followUpMoveTitle}
                      </Link>
                    </div>
                  )}
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
