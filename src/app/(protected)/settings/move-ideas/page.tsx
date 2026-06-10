import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { OrgMoveIdeasClient } from "./org-move-ideas-client";

export interface OrgMoveIdea {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export interface GlobalMoveIdea {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export default async function OrgMoveIdeasPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  const supabase = await createServerClient();

  // Fetch organization-specific move ideas
  let orgIdeas: OrgMoveIdea[] = [];
  if (organizationId) {
    const { data } = await supabase
      .from("move_ideas")
      .select("id, title, category, created_at")
      .eq("organization_id", organizationId)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    orgIdeas = (data ?? []) as OrgMoveIdea[];
  }

  // Fetch global move ideas (organization_id IS NULL)
  const { data: globalData } = await supabase
    .from("move_ideas")
    .select("id, title, category, created_at")
    .is("organization_id", null)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  const globalIdeas = (globalData ?? []) as GlobalMoveIdea[];

  return (
    <OrgMoveIdeasClient
      orgIdeas={orgIdeas}
      globalIdeas={globalIdeas}
      orgId={organizationId ?? ""}
    />
  );
}
