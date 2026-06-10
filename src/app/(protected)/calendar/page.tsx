import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import CalendarView, {
  type CalendarMove,
  type SolicitorOption,
} from "./calendar-view";

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function CalendarPage() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    redirect("/dashboard");
  }

  const isAdmin = role === "org_admin" || role === "super_admin";

  const supabase = await createServerClient();

  // ── Fetch org solicitors for admin filter dropdown ──────────────────────────
  let solicitorOptions: SolicitorOption[] = [];
  if (isAdmin) {
    const { data: orgUsers } = await supabase
      .from("organization_users")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("role", "solicitor");

    const solicitorIds = (
      (orgUsers ?? []) as Array<{ user_id: string; role: string }>
    ).map((ou) => ou.user_id);

    if (solicitorIds.length > 0) {
      const { data: solProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", solicitorIds);

      solicitorOptions = (
        (solProfiles ?? []) as Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>
      ).map((p) => ({
        id: p.id,
        name:
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.email ||
          p.id,
      }));

      solicitorOptions.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  // ── Fetch moves ─────────────────────────────────────────────────────────────
  // Fetch all moves with a due_date for the org (RLS applies for solicitors).
  // We load all non-null due_date moves so the client can navigate freely.
  let movesQuery = supabase
    .from("moves")
    .select("id, title, due_date, status, donor_id, solicitor_id")
    .eq("organization_id", organizationId)
    .not("due_date", "is", null);

  // Solicitors only see their own moves (enforced by RLS + explicit filter)
  if (!isAdmin) {
    movesQuery = movesQuery.eq("solicitor_id", currentUser.user.id);
  }

  const { data: movesRaw } = await movesQuery.order("due_date", {
    ascending: true,
  });

  const rawMoves = (movesRaw ?? []) as Array<{
    id: string;
    title: string;
    due_date: string;
    status: "pending" | "completed";
    donor_id: string;
    solicitor_id: string;
  }>;

  // ── Fetch donor names ───────────────────────────────────────────────────────
  const donorIds = [...new Set(rawMoves.map((m) => m.donor_id))];
  const donorMap = new Map<string, string>();

  if (donorIds.length > 0) {
    const { data: donorsData } = await supabase
      .from("donors")
      .select("id, first_name, last_name")
      .in("id", donorIds);

    if (donorsData) {
      for (const d of donorsData as Array<{
        id: string;
        first_name: string;
        last_name: string;
      }>) {
        donorMap.set(
          d.id,
          [d.first_name, d.last_name].filter(Boolean).join(" ")
        );
      }
    }
  }

  // ── Compute overdue & build CalendarMove objects ────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const moves: CalendarMove[] = rawMoves.map((m) => {
    const [y, mo, d] = m.due_date.split("-").map(Number);
    const dueDate = new Date(y, mo - 1, d);
    const isOverdue = m.status === "pending" && dueDate < today;

    return {
      id: m.id,
      title: m.title,
      donorName: donorMap.get(m.donor_id) ?? "Unknown Donor",
      due_date: m.due_date,
      status: m.status,
      isOverdue,
      solicitorId: m.solicitor_id,
    };
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "All moves" : "My moves"} displayed on their due dates
        </p>
      </div>

      {/* ── Calendar Client Component ───────────────────────────────────────── */}
      <CalendarView
        moves={moves}
        isAdmin={isAdmin}
        solicitorOptions={solicitorOptions}
      />
    </div>
  );
}
