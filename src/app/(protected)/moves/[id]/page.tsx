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
  solicitor_id: string;
  move_idea_id: string | null;
  title: string;
  due_date: string;
  status: "pending" | "completed";
  completion_notes: string | null;
  completed_at: string | null;
  follow_up_move_id: string | null;
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
      "id, organization_id, donor_id, solicitor_id, move_idea_id, title, due_date, status, completion_notes, completed_at, follow_up_move_id, created_at, updated_at"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (moveError || !moveRaw) {
    redirect("/moves");
  }

  const move = moveRaw as MoveRow;

  // Solicitors can only see their own moves
  if (role === "solicitor" && move.solicitor_id !== currentUser.user.id) {
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

  // Fetch solicitor profile
  const { data: solicitorRaw } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", move.solicitor_id)
    .single();

  const solicitor = solicitorRaw as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;

  const solicitorName = solicitor
    ? [solicitor.first_name, solicitor.last_name].filter(Boolean).join(" ") ||
      solicitor.email ||
      move.solicitor_id
    : move.solicitor_id;

  // Fetch follow-up move title if linked
  let followUpMoveTitle: string | null = null;
  if (move.follow_up_move_id) {
    const { data: followUpRaw } = await supabase
      .from("moves")
      .select("id, title")
      .eq("id", move.follow_up_move_id)
      .single();
    if (followUpRaw) {
      followUpMoveTitle = (followUpRaw as { id: string; title: string }).title;
    }
  }

  const isPending = move.status === "pending";

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
          <h1 className="text-2xl font-bold">{move.title}</h1>
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
              <p className="text-sm mt-1 capitalize">{move.status}</p>
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
          {move.follow_up_move_id && followUpMoveTitle && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Follow-Up Move
                </p>
                <Link
                  href={`/moves/${move.follow_up_move_id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {followUpMoveTitle}
                </Link>
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
