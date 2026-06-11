import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import CompleteMoveFlow, { type MoveIdeaOption } from "./complete-move-flow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves a solicitor's display name from user_roles.
 * `assignedTo` is a user_roles.id (moves.assigned_to), NOT an auth user id.
 */
async function resolveSolicitorName(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  assignedTo: string | null
): Promise<string> {
  if (!assignedTo) return "Unassigned";

  const { data } = await supabase
    .from("user_roles")
    .select("id, full_name, email")
    .eq("id", assignedTo)
    .single();

  const row = data as {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;

  return row?.full_name || row?.email || assignedTo;
}

// ─── Page Component (Server Component) ────────────────────────────────────────

export default async function CompleteMovePageWrapper({
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

  // Fetch the move
  const { data: moveRaw, error: moveError } = await supabase
    .from("moves")
    .select(
      "id, organization_id, donor_id, assigned_to, name, is_completed"
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (moveError || !moveRaw) {
    redirect("/moves");
  }

  const move = moveRaw as {
    id: string;
    organization_id: string;
    donor_id: string;
    assigned_to: string | null;
    name: string;
    is_completed: boolean;
  };

  // Solicitors can only complete their own moves.
  // moves.assigned_to references user_roles.id (organizationUser.id).
  if (role === "solicitor" && move.assigned_to !== currentUser.organizationUser?.id) {
    redirect("/moves");
  }

  // Only pending (not completed) moves can be completed
  if (move.is_completed) {
    redirect(`/moves/${id}`);
  }

  // Fetch donor
  const { data: donorRaw } = await supabase
    .from("donors")
    .select("id, first_name, last_name")
    .eq("id", move.donor_id)
    .single();

  const donor = donorRaw as {
    id: string;
    first_name: string;
    last_name: string;
  } | null;

  const donorName = donor
    ? [donor.first_name, donor.last_name].filter(Boolean).join(" ")
    : "Unknown Donor";

  // Fetch solicitor display name from user_roles (assigned_to = user_roles.id)
  const solicitorName = await resolveSolicitorName(
    supabase,
    move.assigned_to
  );

  // Fetch move ideas (global + org-specific)
  const { data: ideasRaw } = await supabase
    .from("move_ideas")
    .select("id, name, organization_id")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("name", { ascending: true });

  const moveIdeas: MoveIdeaOption[] = (
    (ideasRaw ?? []) as Array<{
      id: string;
      name: string;
      organization_id: string | null;
    }>
  ).map((i) => ({
    id: i.id,
    title: i.name,
    // SCHEMA-GAP: move_ideas has no `category` column in live schema
    category: "",
    organizationId: i.organization_id,
  }));

  return (
    <CompleteMoveFlow
      moveId={move.id}
      moveTitle={move.name}
      donorName={donorName}
      solicitorName={solicitorName}
      moveIdeas={moveIdeas}
    />
  );
}
