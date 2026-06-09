import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import CompleteMoveFlow, { type MoveIdeaOption } from "./complete-move-flow";

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
      "id, organization_id, donor_id, solicitor_id, title, status"
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
    solicitor_id: string;
    title: string;
    status: string;
  };

  // Solicitors can only complete their own moves
  if (role === "solicitor" && move.solicitor_id !== currentUser.user.id) {
    redirect("/moves");
  }

  // Only pending moves can be completed
  if (move.status !== "pending") {
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

  // Fetch move ideas (global + org-specific)
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

  return (
    <CompleteMoveFlow
      moveId={move.id}
      moveTitle={move.title}
      donorName={donorName}
      solicitorName={solicitorName}
      moveIdeas={moveIdeas}
    />
  );
}
