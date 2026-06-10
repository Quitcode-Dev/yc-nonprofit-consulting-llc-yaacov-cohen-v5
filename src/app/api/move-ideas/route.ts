/**
 * GET /api/move-ideas
 *
 * Returns move ideas accessible to the current user's organisation,
 * split into two groups:
 *   { global: MoveIdea[], organization: MoveIdea[] }
 *
 * "Global" ideas have organization_id IS NULL.
 * "Organisation" ideas have organization_id = the caller's org.
 *
 * Response 200:
 *   { global: MoveIdea[], organization: MoveIdea[] }
 *
 * Response 401: user not authenticated
 * Response 403: user has no organisation
 */

import { NextResponse } from "next/server";
import { getCurrentUser, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export interface MoveIdeaRow {
  id: string;
  title: string;
  category: string;
  organization_id: string | null;
}

export async function GET(): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Organisation ───────────────────────────────────────────────────────────
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return NextResponse.json(
      { error: "Forbidden: no organisation associated with your account" },
      { status: 403 }
    );
  }

  // ── Fetch move ideas ───────────────────────────────────────────────────────
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("move_ideas")
    .select("id, title, category, organization_id")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch move ideas:", error);
    return NextResponse.json(
      { error: "Failed to fetch move ideas" },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as MoveIdeaRow[];

  const global = rows.filter((r) => r.organization_id === null);
  const organization = rows.filter((r) => r.organization_id !== null);

  return NextResponse.json({ global, organization }, { status: 200 });
}
