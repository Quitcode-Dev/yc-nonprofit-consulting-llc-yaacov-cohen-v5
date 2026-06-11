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
    // In the live schema, solicitors are rows in `user_roles`. The dropdown's
    // option id must be user_roles.id, since moves.assigned_to references it.
    // SCHEMA-GAP: user_roles.role enum is only 'super_admin' |
    // 'organization_admin' (no 'solicitor'), so we list all active org members
    // rather than filtering on role === 'solicitor'.
    const { data: orgUsers } = await supabase
      .from("user_roles")
      .select("id, full_name, email")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    solicitorOptions = (
      (orgUsers ?? []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>
    ).map((u) => ({
      id: u.id,
      name: u.full_name || u.email || u.id,
    }));

    solicitorOptions.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Fetch moves ─────────────────────────────────────────────────────────────
  // Fetch all moves with a due_date for the org (RLS applies for solicitors).
  // We load all non-null due_date moves so the client can navigate freely.
  let movesQuery = supabase
    .from("moves")
    .select("id, name, due_date, is_completed, donor_id, assigned_to")
    .eq("organization_id", organizationId)
    .not("due_date", "is", null);

  // Solicitors only see their own moves (enforced by RLS + explicit filter).
  // moves.assigned_to references user_roles.id, so filter on the current user's
  // user_roles.id (organizationUser.id), NOT the auth user id.
  if (!isAdmin) {
    movesQuery = movesQuery.eq(
      "assigned_to",
      currentUser.organizationUser?.id ?? ""
    );
  }

  const { data: movesRaw } = await movesQuery.order("due_date", {
    ascending: true,
  });

  const rawMoves = (movesRaw ?? []) as Array<{
    id: string;
    name: string;
    due_date: string;
    is_completed: boolean;
    donor_id: string;
    assigned_to: string;
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
    const isOverdue = !m.is_completed && dueDate < today;

    // CalendarMove (in calendar-view, outside the editable set) uses the legacy
    // `title`/`status` fields; map from the live `name`/`is_completed` columns.
    return {
      id: m.id,
      title: m.name,
      donorName: donorMap.get(m.donor_id) ?? "Unknown Donor",
      due_date: m.due_date,
      status: m.is_completed ? "completed" : "pending",
      isOverdue,
      solicitorId: m.assigned_to,
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
