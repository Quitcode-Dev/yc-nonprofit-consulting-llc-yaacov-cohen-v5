/**
 * POST /api/import/csv
 *
 * Receives parsed CSV data and field mapping from the client, processes
 * each row (validate → deduplicate → insert), and returns a results summary.
 *
 * Request body (JSON):
 * {
 *   rows: Array<Record<string, string>>,   // parsed CSV rows (header → value)
 *   fieldMapping: Record<string, string>,  // CSV column → platform field key
 *   fileName?: string,                     // original file name for logging
 * }
 *
 * Response (200):
 * { success: true, result: { created, skipped, errors: [{row, reason}] } }
 *
 * Response (4xx / 5xx):
 * { success: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getUserRole, getUserOrganizationId } from "@/lib/auth";
import { processCSVImport, type FieldMapping, type CSVRow } from "@/lib/csv-import";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Auth ───────────────────────────────────────────────────────────────────
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

  // ── Organization ───────────────────────────────────────────────────────────
  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: "No organization associated with your account" },
      { status: 400 }
    );
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let rows: CSVRow[];
  let fieldMapping: FieldMapping;
  let fileName: string | undefined;

  try {
    const body = await request.json();
    rows = body.rows;
    fieldMapping = body.fieldMapping;
    fileName = body.fileName;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: "Invalid request: 'rows' must be an array" },
        { status: 400 }
      );
    }

    if (!fieldMapping || typeof fieldMapping !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request: 'fieldMapping' must be an object" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // ── Process import ─────────────────────────────────────────────────────────
  try {
    const result = await processCSVImport(
      rows,
      fieldMapping,
      organizationId,
      currentUser.user.id,
      fileName
    );

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("CSV import error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
