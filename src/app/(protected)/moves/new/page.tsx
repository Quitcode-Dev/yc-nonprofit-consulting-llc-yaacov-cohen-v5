import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import MoveForm, {
  type DonorOption,
  type MoveIdeaOption,
} from "./move-form";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  donorId?: string;
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default async function CreateMovePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    redirect("/dashboard");
  }

  const supabase = await createServerClient();
  const isAdmin = role === "org_admin" || role === "super_admin";

  // ── Fetch donors ────────────────────────────────────────────────────────────
  // Solicitors see only their assigned donors; admins see all org donors.

  let donorsQuery = supabase
    .from("donors")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (!isAdmin) {
    donorsQuery = donorsQuery.eq(
      "assigned_solicitor_id",
      currentUser.user.id
    );
  }

  const { data: donorsRaw } = await donorsQuery;

  const donors: DonorOption[] = (
    (donorsRaw ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>
  ).map((d) => ({
    id: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
  }));

  // ── Fetch move ideas ─────────────────────────────────────────────────────────
  // Global ideas (organization_id IS NULL) + org-specific ideas.

  const { data: ideasRaw } = await supabase
    .from("move_ideas")
    .select("id, title, category, organization_id")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("title", { ascending: true });

  const moveIdeas: MoveIdeaOption[] = (
    (ideasRaw ?? []) as Array<{
      id: string;
      title: string;
      category: string;
      organization_id: string | null;
    }>
  ).map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    organizationId: i.organization_id,
  }));

  // ── Pre-selected donor from query param ──────────────────────────────────────
  const preselectedDonorId = resolvedParams.donorId?.trim() ?? undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Create New Move</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a donor, choose a Move Idea, and set a due date to create a
          new pending move.
        </p>
      </div>

      <MoveForm
        donors={donors}
        moveIdeas={moveIdeas}
        preselectedDonorId={preselectedDonorId}
        organizationId={organizationId}
      />
    </div>
  );
}
