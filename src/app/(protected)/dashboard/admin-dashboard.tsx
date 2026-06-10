import React from "react";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolicitorEntry {
  id: string;
  name: string;
  avgScore: number | null;
  donorCount: number;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </Card>
  );
}

// ─── Admin Dashboard Server Component ────────────────────────────────────────

interface AdminDashboardProps {
  organizationId: string;
  firstName: string | null;
}

export default async function AdminDashboard({
  organizationId,
  firstName,
}: AdminDashboardProps) {
  const supabase = await createServerClient();

  // ── Metric 1: Total Donors ──────────────────────────────────────────────
  const { count: totalDonors } = await supabase
    .from("donors")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  // ── Metric 2: Moves Needed (score band sum) ─────────────────────────────
  // Fetch all donor scores for the org
  const { data: donorScoresRaw } = await supabase
    .from("donors")
    .select("score")
    .eq("organization_id", organizationId);

  const donorScores = (
    (donorScoresRaw ?? []) as Array<{ score: number | null }>
  ).map((d) => d.score ?? 0);

  // Fetch score band configs for the org
  const { data: scoreBandsRaw } = await supabase
    .from("score_band_configs")
    .select("min_score, max_score, moves_needed")
    .eq("organization_id", organizationId);

  const scoreBands = (scoreBandsRaw ?? []) as Array<{
    min_score: number | null;
    max_score: number | null;
    moves_needed: number | null;
  }>;

  // For each donor score, find matching band and sum moves_needed
  let totalMovesNeeded = 0;
  for (const score of donorScores) {
    const band = scoreBands.find(
      (b) =>
        (b.min_score === null || score >= b.min_score) &&
        (b.max_score === null || score <= b.max_score)
    );
    if (band?.moves_needed) {
      totalMovesNeeded += band.moves_needed;
    }
  }

  // ── Metric 3: Total Moves ───────────────────────────────────────────────
  const { count: totalMoves } = await supabase
    .from("moves")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  // ── Metric 4: Moves Completed ───────────────────────────────────────────
  const { count: completedMoves } = await supabase
    .from("moves")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "completed");

  // ── Metric 5: Pending Moves ─────────────────────────────────────────────
  const { count: pendingMoves } = await supabase
    .from("moves")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  // ── Leaderboard: Active solicitors with avg donor score ─────────────────
  // Fetch all active solicitors in the org
  const { data: orgUsersRaw } = await supabase
    .from("organization_users")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("role", "solicitor");

  const solicitorIds = (
    (orgUsersRaw ?? []) as Array<{ user_id: string }>
  ).map((ou) => ou.user_id);

  const solicitorEntries: SolicitorEntry[] = [];

  if (solicitorIds.length > 0) {
    // Fetch solicitor profiles
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", solicitorIds);

    const profiles = (profilesRaw ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>;

    // Fetch all donors assigned to these solicitors in the org
    const { data: assignedDonorsRaw } = await supabase
      .from("donors")
      .select("assigned_solicitor_id, score")
      .eq("organization_id", organizationId)
      .in("assigned_solicitor_id", solicitorIds);

    const assignedDonors = (assignedDonorsRaw ?? []) as Array<{
      assigned_solicitor_id: string | null;
      score: number | null;
    }>;

    // Group donor scores by solicitor
    const scoresBySolicitor = new Map<string, number[]>();
    for (const sid of solicitorIds) {
      scoresBySolicitor.set(sid, []);
    }
    for (const d of assignedDonors) {
      if (d.assigned_solicitor_id) {
        const existing = scoresBySolicitor.get(d.assigned_solicitor_id);
        if (existing !== undefined) {
          existing.push(d.score ?? 0);
        }
      }
    }

    // Build solicitor entries with avg score
    for (const profile of profiles) {
      const scores = scoresBySolicitor.get(profile.id) ?? [];
      const name =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        profile.email ||
        profile.id;

      let avgScore: number | null = null;
      if (scores.length > 0) {
        const sum = scores.reduce((acc, s) => acc + s, 0);
        avgScore = sum / scores.length;
      }

      solicitorEntries.push({
        id: profile.id,
        name,
        avgScore,
        donorCount: scores.length,
      });
    }

    // Sort: solicitors with scores first (DESC), then those without (N/A) at bottom
    solicitorEntries.sort((a, b) => {
      if (a.avgScore !== null && b.avgScore !== null) {
        return b.avgScore - a.avgScore;
      }
      if (a.avgScore !== null) return -1;
      if (b.avgScore !== null) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  const displayName = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organization overview and metrics.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Donors" value={totalDonors ?? 0} />
        <MetricCard label="Moves Needed" value={totalMovesNeeded} />
        <MetricCard label="Total Moves" value={totalMoves ?? 0} />
        <MetricCard label="Moves Completed" value={completedMoves ?? 0} />
        <MetricCard label="Pending Moves" value={pendingMoves ?? 0} />
      </div>

      {/* Two-column grid: leaderboard left, empty right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">
              Top Solicitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitorEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No solicitors found in this organization.
              </p>
            ) : (
              <div className="space-y-0">
                {/* Header row */}
                <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                  <span className="w-6 text-center">#</span>
                  <span>Solicitor</span>
                  <span className="text-right">Avg Score</span>
                </div>
                {/* Solicitor rows */}
                {solicitorEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[auto_1fr_auto] gap-4 px-3 py-3 text-sm rounded-md hover:bg-accent/50 transition-colors items-center"
                  >
                    <span className="w-6 text-center font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <Link
                      href={`/donors?solicitor=${entry.id}`}
                      className="font-medium hover:underline truncate"
                    >
                      {entry.name}
                    </Link>
                    <span className="text-right tabular-nums text-muted-foreground">
                      {entry.avgScore !== null
                        ? entry.avgScore.toFixed(1)
                        : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column placeholder */}
        <div />
      </div>
    </div>
  );
}
