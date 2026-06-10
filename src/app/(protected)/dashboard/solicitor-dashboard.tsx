import React from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDisplayStatus } from "@/lib/move-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DonorRow {
  id: string;
  first_name: string;
  last_name: string;
  score: number | null;
  tier: string | null;
}

interface MoveRow {
  id: string;
  title: string;
  due_date: string;
  status: "pending" | "completed";
  donor_id: string;
  donorName: string;
  displayStatus: "pending" | "overdue" | "completed";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Donors Card ─────────────────────────────────────────────────────────────

function DonorsCard({
  donors,
  totalCount,
}: {
  donors: DonorRow[];
  totalCount: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">My Donors</CardTitle>
        {totalCount > 10 && (
          <Link
            href="/donors"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View All ({totalCount})
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {donors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No donors assigned to you yet
          </p>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
              <span>Name</span>
              <span className="text-right">Score</span>
              <span className="w-20 text-center">Tier</span>
            </div>
            {/* Donor rows */}
            {donors.map((donor) => (
              <Link
                key={donor.id}
                href={`/donors/${donor.id}`}
                className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-3 text-sm rounded-md hover:bg-accent/50 transition-colors items-center"
              >
                <span className="font-medium truncate">
                  {[donor.first_name, donor.last_name].filter(Boolean).join(" ")}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {donor.score ?? "—"}
                </span>
                <span className="w-20 flex justify-center">
                  {donor.tier ? (
                    <Badge variant="secondary" className="text-xs">
                      {donor.tier}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </Link>
            ))}
            {/* View All footer when capped at 10 */}
            {totalCount > 10 && (
              <div className="pt-3 border-t">
                <Link
                  href="/donors"
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  View all {totalCount} donors →
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Moves Card ───────────────────────────────────────────────────────────────

function MovesCard({ moves }: { moves: MoveRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Pending Moves</CardTitle>
      </CardHeader>
      <CardContent>
        {moves.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No pending moves — great job!
          </p>
        ) : (
          <div className="space-y-0">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
              <span>Move / Donor</span>
              <span>Due Date</span>
              <span className="w-20 text-center">Status</span>
            </div>
            {/* Move rows */}
            {moves.map((move) => {
              const isOverdue = move.displayStatus === "overdue";
              const isDueToday = move.displayStatus === "pending" && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const [y, mo, d] = move.due_date.split("-").map(Number);
                const due = new Date(y, mo - 1, d);
                return due.getTime() === today.getTime();
              })();

              return (
                <Link
                  key={move.id}
                  href={`/moves/${move.id}`}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-3 text-sm rounded-md hover:bg-accent/50 transition-colors items-center ${
                    isOverdue ? "bg-red-50 hover:bg-red-100" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="font-medium block truncate">{move.title}</span>
                    <span className="text-muted-foreground text-xs truncate block">
                      {move.donorName}
                    </span>
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {formatDate(move.due_date)}
                  </span>
                  <span className="w-20 flex justify-center">
                    {isOverdue ? (
                      <Badge
                        variant="destructive"
                        className="bg-red-100 text-red-800 border-red-200 text-xs"
                      >
                        Overdue
                      </Badge>
                    ) : isDueToday ? (
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"
                      >
                        Due Today
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 border-blue-200 text-xs"
                      >
                        Pending
                      </Badge>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Solicitor Dashboard Server Component ────────────────────────────────────

interface SolicitorDashboardProps {
  userId: string;
  organizationId: string;
  firstName: string | null;
}

export default async function SolicitorDashboard({
  userId,
  organizationId,
  firstName,
}: SolicitorDashboardProps) {
  const supabase = await createServerClient();

  // ── Fetch assigned donors (max 10, ordered by score DESC) ──────────────────
  const { count: donorCount } = await supabase
    .from("donors")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("assigned_solicitor_id", userId);

  const totalDonorCount = donorCount ?? 0;

  const { data: donorsRaw } = await supabase
    .from("donors")
    .select("id, first_name, last_name, score, tier")
    .eq("organization_id", organizationId)
    .eq("assigned_solicitor_id", userId)
    .order("score", { ascending: false, nullsFirst: false })
    .limit(10);

  const donors: DonorRow[] = (
    (donorsRaw ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
      score: number | null;
      tier: string | null;
    }>
  ).map((d) => ({
    id: d.id,
    first_name: d.first_name,
    last_name: d.last_name,
    score: d.score,
    tier: d.tier,
  }));

  // ── Fetch pending moves (ordered by due_date ASC) ─────────────────────────
  const { data: movesRaw } = await supabase
    .from("moves")
    .select("id, title, due_date, status, donor_id")
    .eq("organization_id", organizationId)
    .eq("solicitor_id", userId)
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  const rawMoves = (movesRaw ?? []) as Array<{
    id: string;
    title: string;
    due_date: string;
    status: "pending" | "completed";
    donor_id: string;
  }>;

  // ── Fetch donor names for moves ───────────────────────────────────────────
  const moveDonorIds = [...new Set(rawMoves.map((m) => m.donor_id))];
  const moveDonorMap = new Map<string, string>();

  if (moveDonorIds.length > 0) {
    const { data: moveDonors } = await supabase
      .from("donors")
      .select("id, first_name, last_name")
      .in("id", moveDonorIds);

    if (moveDonors) {
      for (const d of moveDonors as Array<{
        id: string;
        first_name: string;
        last_name: string;
      }>) {
        moveDonorMap.set(
          d.id,
          [d.first_name, d.last_name].filter(Boolean).join(" ")
        );
      }
    }
  }

  const moves: MoveRow[] = rawMoves.map((m) => ({
    id: m.id,
    title: m.title,
    due_date: m.due_date,
    status: m.status,
    donor_id: m.donor_id,
    donorName: moveDonorMap.get(m.donor_id) ?? "Unknown Donor",
    displayStatus: getDisplayStatus(m),
  }));

  const displayName = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s an overview of your donors and moves.
        </p>
      </div>

      {/* Two-column grid: Donors left, Moves right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonorsCard donors={donors} totalCount={totalDonorCount} />
        <MovesCard moves={moves} />
      </div>
    </div>
  );
}
