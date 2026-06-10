import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CharacteristicsForm from "./characteristics-form";
import MoveHistory from "./move-history";
import type { DonorCharacteristics } from "../actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DonorRow {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  capacity: number | null;
  assigned_solicitor_id: string | null;
  score: number | null;
  tier: string | null;
  is_parent: boolean;
  is_grandparent: boolean;
  is_alumni: boolean;
  is_board_member: boolean;
  is_community_builder: boolean;
  is_program_attendee: boolean;
  is_volunteer: boolean;
  is_donor_advised_fund: boolean;
  is_foundation_trustee: boolean;
}

interface ScoringConfigRow {
  parent_enabled: boolean;
  parent_points: number;
  grandparent_enabled: boolean;
  grandparent_points: number;
  alumni_enabled: boolean;
  alumni_points: number;
  board_member_enabled: boolean;
  board_member_points: number;
  community_builder_enabled: boolean;
  community_builder_points: number;
  program_attendee_enabled: boolean;
  program_attendee_points: number;
  volunteer_enabled: boolean;
  volunteer_points: number;
  donor_advised_fund_enabled: boolean;
  donor_advised_fund_points: number;
  foundation_trustee_enabled: boolean;
  foundation_trustee_points: number;
}

interface ScoreBandConfigRow {
  min_score: number;
  max_score: number;
  moves_needed: number;
}

interface DonationRow {
  id: string;
  amount: number;
  donated_at: string | null;
  source: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Score breakdown fields (matches scoring.ts)
const SCORE_FIELDS: Array<{
  donorField: keyof DonorRow;
  enabledKey: keyof ScoringConfigRow;
  pointsKey: keyof ScoringConfigRow;
  label: string;
}> = [
  {
    donorField: "is_parent",
    enabledKey: "parent_enabled",
    pointsKey: "parent_points",
    label: "Parent",
  },
  {
    donorField: "is_grandparent",
    enabledKey: "grandparent_enabled",
    pointsKey: "grandparent_points",
    label: "Grandparent",
  },
  {
    donorField: "is_alumni",
    enabledKey: "alumni_enabled",
    pointsKey: "alumni_points",
    label: "Alumni",
  },
  {
    donorField: "is_board_member",
    enabledKey: "board_member_enabled",
    pointsKey: "board_member_points",
    label: "Board Member",
  },
  {
    donorField: "is_community_builder",
    enabledKey: "community_builder_enabled",
    pointsKey: "community_builder_points",
    label: "Community Builder",
  },
  {
    donorField: "is_program_attendee",
    enabledKey: "program_attendee_enabled",
    pointsKey: "program_attendee_points",
    label: "Program Attendee",
  },
  {
    donorField: "is_volunteer",
    enabledKey: "volunteer_enabled",
    pointsKey: "volunteer_points",
    label: "Volunteer",
  },
  {
    donorField: "is_donor_advised_fund",
    enabledKey: "donor_advised_fund_enabled",
    pointsKey: "donor_advised_fund_points",
    label: "Donor Advised Fund",
  },
  {
    donorField: "is_foundation_trustee",
    enabledKey: "foundation_trustee_enabled",
    pointsKey: "foundation_trustee_points",
    label: "Foundation/Trustee",
  },
];

// ─── Page Component ────────────────────────────────────────────────────────────

export default async function DonorProfilePage({
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
    redirect("/donors");
  }

  const supabase = await createServerClient();

  // Fetch donor, scoped to the org
  const { data: donorRaw, error: donorError } = await supabase
    .from("donors")
    .select(
      "id, organization_id, first_name, last_name, email, phone, capacity, assigned_solicitor_id, score, tier, is_parent, is_grandparent, is_alumni, is_board_member, is_community_builder, is_program_attendee, is_volunteer, is_donor_advised_fund, is_foundation_trustee"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (donorError || !donorRaw) {
    redirect("/donors");
  }

  const donor = donorRaw as DonorRow;

  // For solicitors, verify they are assigned to this donor
  if (role === "solicitor" && donor.assigned_solicitor_id !== currentUser.user.id) {
    redirect("/donors");
  }

  // Fetch assigned solicitor's name (if any)
  let solicitorName: string | null = null;
  if (donor.assigned_solicitor_id) {
    const { data: solicitorProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", donor.assigned_solicitor_id)
      .single();

    if (solicitorProfile) {
      const p = solicitorProfile as {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      };
      solicitorName =
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        p.email ||
        donor.assigned_solicitor_id;
    }
  }

  // Fetch scoring config
  const { data: scoringConfigRaw } = await supabase
    .from("scoring_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  const scoringConfig = scoringConfigRaw as ScoringConfigRow | null;

  // Build score breakdown
  const scoreBreakdown: Array<{ label: string; points: number }> = [];
  if (scoringConfig) {
    for (const { donorField, enabledKey, pointsKey, label } of SCORE_FIELDS) {
      const isChecked = donor[donorField] as boolean;
      const isEnabled = (scoringConfig as unknown as Record<string, unknown>)[enabledKey] as boolean;
      const points = (scoringConfig as unknown as Record<string, unknown>)[pointsKey] as number;
      if (isEnabled && isChecked) {
        scoreBreakdown.push({ label, points });
      }
    }
  }

  // Fetch score band configs to find moves needed
  const { data: scoreBandsRaw } = await supabase
    .from("score_band_configs")
    .select("min_score, max_score, moves_needed")
    .eq("organization_id", organizationId)
    .order("min_score", { ascending: true });

  const scoreBands = (scoreBandsRaw ?? []) as ScoreBandConfigRow[];
  const donorScore = donor.score ?? 0;
  const matchedBand = scoreBands.find(
    (b) => donorScore >= b.min_score && donorScore <= b.max_score
  );
  const movesNeeded = matchedBand?.moves_needed ?? null;

  // Fetch donations
  const { data: donationsRaw } = await supabase
    .from("donations")
    .select("id, amount, donated_at, source")
    .eq("donor_id", id)
    .order("donated_at", { ascending: false });

  const donations = (donationsRaw ?? []) as DonationRow[];

  // Determine editability
  const isAdmin = role === "org_admin" || role === "super_admin";
  const isSolicitorAssigned =
    role === "solicitor" && donor.assigned_solicitor_id === currentUser.user.id;
  const canEditCharacteristics = isAdmin || isSolicitorAssigned;

  const initialCharacteristics: DonorCharacteristics = {
    is_parent: donor.is_parent,
    is_grandparent: donor.is_grandparent,
    is_alumni: donor.is_alumni,
    is_board_member: donor.is_board_member,
    is_community_builder: donor.is_community_builder,
    is_program_attendee: donor.is_program_attendee,
    is_volunteer: donor.is_volunteer,
    is_donor_advised_fund: donor.is_donor_advised_fund,
    is_foundation_trustee: donor.is_foundation_trustee,
  };

  const donorFullName = [donor.first_name, donor.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Back link + Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/donors"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Donors
        </Link>
      </div>

      {/* Donor name + tier badge */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{donorFullName}</h1>
          {donor.email && (
            <p className="text-muted-foreground mt-1">{donor.email}</p>
          )}
        </div>
        {donor.tier && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {donor.tier}
          </Badge>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column (col-span-2) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Donor Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Donor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Email
                  </p>
                  <p className="text-sm mt-1">{donor.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Phone
                  </p>
                  <p className="text-sm mt-1">{donor.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Giving Capacity
                  </p>
                  <p className="text-sm mt-1">
                    {donor.capacity !== null
                      ? formatCurrency(donor.capacity)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Assigned Solicitor
                  </p>
                  <p className="text-sm mt-1">
                    {solicitorName ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Tier
                  </p>
                  <p className="text-sm mt-1">
                    {donor.tier ? (
                      <Badge variant="secondary">{donor.tier}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Score
                  </p>
                  <p className="text-sm mt-1 font-semibold tabular-nums">
                    {donor.score ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Characteristics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Characteristics</CardTitle>
              {!canEditCharacteristics && (
                <p className="text-xs text-muted-foreground">Read-only</p>
              )}
            </CardHeader>
            <CardContent>
              <CharacteristicsForm
                donorId={donor.id}
                editable={canEditCharacteristics}
                initialValues={initialCharacteristics}
              />
            </CardContent>
          </Card>

          {/* Move History */}
          <MoveHistory donorId={donor.id} />
        </div>

        {/* ── Right column (col-span-1) ── */}
        <div className="space-y-6">
          {/* Score Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total score + tier */}
              <div className="text-center space-y-2">
                <p className="text-5xl font-bold tabular-nums">
                  {donor.score ?? 0}
                </p>
                {donor.tier ? (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {donor.tier}
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">No tier assigned</p>
                )}
              </div>

              {/* Moves needed */}
              {movesNeeded !== null && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Moves Needed:{" "}
                    <span className="font-semibold text-foreground">
                      {movesNeeded}
                    </span>
                  </p>
                </div>
              )}

              <Separator />

              {/* Score breakdown */}
              <div>
                <p className="text-sm font-medium mb-3">Score Breakdown</p>
                {scoreBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scored characteristics.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {scoreBreakdown.map(({ label, points }) => (
                      <div
                        key={label}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">
                          +{points}
                        </span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{donor.score ?? 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Donation History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Donation History</CardTitle>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No donations recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {donations.map((donation) => (
                    <div key={donation.id} className="space-y-0.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatDate(donation.donated_at)}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(donation.amount)}
                        </span>
                      </div>
                      {donation.source && (
                        <p className="text-xs text-muted-foreground">
                          {donation.source}
                        </p>
                      )}
                      <Separator className="mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
