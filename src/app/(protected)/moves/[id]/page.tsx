import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MoveRow {
  id: string;
  organization_id: string;
  donor_id: string;
  assigned_to: string | null;
  move_idea_id: string | null;
  name: string;
  due_date: string;
  is_completed: boolean;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default async function MoveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    redirect("/moves");
  }

  const supabase = await createServerClient();

  // Fetch move scoped to org
  const { data: moveRaw, error: moveError } = await supabase
    .from("moves")
    .select(
      "id, organization_id, donor_id, assigned_to, move_idea_id, name, due_date, is_completed, completion_notes, completed_at, created_at, updated_at"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (moveError || !moveRaw) {
    redirect("/moves");
  }

  const move = moveRaw as MoveRow;

  // Solicitors can only see their own moves.
  // moves.assigned_to references user_roles.id (organizationUser.id).
  if (role === "solicitor" && move.assigned_to !== currentUser.organizationUser?.id) {
    redirect("/moves");
  }

  // Fetch donor
  const { data: donorRaw } = await supabase
    .from("donors")
    .select("id, first_name, last_name, email")
    .eq("id", move.donor_id)
    .single();

  const donor = donorRaw as {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;

  const donorName = donor
    ? [donor.first_name, donor.last_name].filter(Boolean).join(" ")
    : "Unknown Donor";

  // Fetch solicitor display name from user_roles.
  // moves.assigned_to references user_roles.id, not an auth user id.
  let solicitorName: string = "Unassigned";
  if (move.assigned_to) {
    const { data: solicitorRaw } = await supabase
      .from("user_roles")
      .select("id, full_name, email")
      .eq("id", move.assigned_to)
      .single();

    const solicitor = solicitorRaw as {
      id: string;
      full_name: string | null;
      email: string | null;
    } | null;

    solicitorName = solicitor
      ? solicitor.full_name || solicitor.email || move.assigned_to
      : move.assigned_to;
  }

  // SCHEMA-GAP: moves has no follow_up_move_id in live schema — the follow-up
  // move link feature is disabled.
  const followUpMoveTitle: string | null = null;

  const isPending = !move.is_completed;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/moves"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Moves
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{move.name}</h1>
          <p className="text-sm text-muted-foreground">
            Created {formatDateTime(move.created_at)}
          </p>
        </div>
        <Badge
          variant={isPending ? "secondary" : "success"}
          className="text-sm px-3 py-1"
        >
          {isPending ? "Pending" : "Completed"}
        </Badge>
      </div>

      {/* Move Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Move Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Donor
              </p>
              <p className="text-sm mt-1 font-medium">{donorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Solicitor
              </p>
              <p className="text-sm mt-1">{solicitorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Due Date
              </p>
              <p className="text-sm mt-1">{formatDate(move.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Status
              </p>
              <p className="text-sm mt-1 capitalize">
                {move.is_completed ? "completed" : "pending"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Created At
              </p>
              <p className="text-sm mt-1">{formatDateTime(move.created_at)}</p>
            </div>
            {move.completed_at && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Completed At
                </p>
                <p className="text-sm mt-1">
                  {formatDateTime(move.completed_at)}
                </p>
              </div>
            )}
          </div>

          {/* Completion Notes */}
          {move.completion_notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Completion Notes
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {move.completion_notes}
                </p>
              </div>
            </>
          )}

          {/* Follow-up Move */}
          {/* SCHEMA-GAP: moves has no follow_up_move_id in live schema —
              follow-up move display is disabled. */}
          {followUpMoveTitle && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Follow-Up Move
                </p>
                <span className="text-sm font-medium text-primary">
                  {followUpMoveTitle}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions — only show 'Complete Move' for pending moves */}
      {isPending && (
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href={`/moves/${move.id}/complete`}>Complete Move</Link>
          </Button>
          <Link
            href="/moves"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      )}
    </div>
  );
}
