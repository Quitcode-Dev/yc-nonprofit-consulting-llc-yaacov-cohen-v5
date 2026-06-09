import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole, getUserOrganizationId } from "@/lib/auth";
import { BloomerangService } from "@/lib/bloomerang";

/**
 * POST /api/sync/bloomerang
 *
 * Triggers a full Bloomerang sync for the authenticated user's organization.
 * Only org_admin and super_admin roles may call this endpoint.
 *
 * Response (200):
 * {
 *   success: true,
 *   result: {
 *     constituentsCreated, constituentsUpdated, constituentsSkipped, constituentsErrors,
 *     transactionsCreated, transactionsUpdated, transactionsSkipped, transactionsErrors,
 *   }
 * }
 *
 * Response (4xx / 5xx):
 * { success: false, error: string }
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const role = getUserRole(currentUser);

  if (!["org_admin", "super_admin"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: insufficient role" },
      { status: 403 }
    );
  }

  // ── Organization ─────────────────────────────────────────────────────────
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: "No organization associated with your account" },
      { status: 400 }
    );
  }

  // ── Sync ──────────────────────────────────────────────────────────────────
  try {
    const service = new BloomerangService();
    const result = await service.syncAll(organizationId);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("Bloomerang sync error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
