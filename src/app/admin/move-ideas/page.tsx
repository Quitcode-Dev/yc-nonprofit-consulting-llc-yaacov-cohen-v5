import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { MoveIdeasClient } from "./move-ideas-client";

export interface GlobalMoveIdea {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export default async function GlobalMoveIdeasPage() {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  const { data } = await supabase
    .from("move_ideas")
    .select("id, title, category, created_at")
    .is("organization_id", null)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  const ideas = (data ?? []) as GlobalMoveIdea[];

  return <MoveIdeasClient ideas={ideas} />;
}
