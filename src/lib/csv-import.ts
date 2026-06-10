/**
 * CSV Import processing library.
 *
 * Provides processCSVImport() which maps CSV rows to donor fields,
 * validates required fields, checks for duplicate emails, inserts donors,
 * and writes an import_log record.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Maps a CSV column header → platform field key (or "skip") */
export type FieldMapping = Record<string, PlatformField>;

export type PlatformField =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "capacity"
  | "parent"
  | "grandparent"
  | "alumni"
  | "board_member"
  | "community_builder"
  | "program_attendee"
  | "volunteer"
  | "donor_advised_fund"
  | "foundation_trustee"
  | "skip";

export interface CSVRow {
  [column: string]: string;
}

export interface ImportError {
  row: number;
  reason: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

// ─── Boolean helper fields ────────────────────────────────────────────────────

const BOOLEAN_FIELDS: PlatformField[] = [
  "parent",
  "grandparent",
  "alumni",
  "board_member",
  "community_builder",
  "program_attendee",
  "volunteer",
  "donor_advised_fund",
  "foundation_trustee",
];

function parseBooleanValue(val: string): boolean {
  const lower = val.toLowerCase().trim();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "y";
}

// ─── processCSVImport ─────────────────────────────────────────────────────────

/**
 * Processes CSV rows using the provided field mapping, inserting valid donors
 * into the database and returning a summary of created, skipped, and errored rows.
 *
 * @param rows         Array of CSV row objects (header → value)
 * @param fieldMapping Maps CSV column names → platform field keys
 * @param orgId        Organization UUID for the inserting org
 * @param initiatedBy  User ID of the person who initiated the import
 * @param fileName     Original file name (for the import log)
 */
export async function processCSVImport(
  rows: CSVRow[],
  fieldMapping: FieldMapping,
  orgId: string,
  initiatedBy: string,
  fileName?: string
): Promise<ImportResult> {
  const supabase = createServiceRoleClient();

  const result: ImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  // Pre-load all existing emails for the org to detect duplicates in-memory
  const { data: existingDonors } = await supabase
    .from("donors")
    .select("email")
    .eq("organization_id", orgId)
    .not("email", "is", null);

  const existingEmails = new Set<string>(
    (existingDonors ?? [])
      .map((d: { email: string | null }) => d.email?.toLowerCase().trim())
      .filter((e): e is string => !!e)
  );

  // Track emails seen within this import batch to catch intra-batch duplicates
  const seenEmailsThisBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1; // 1-based row number (excluding header)
    const row = rows[i];

    // Build mapped values
    const mapped: Record<string, string | boolean> = {};

    for (const [csvColumn, platformField] of Object.entries(fieldMapping)) {
      if (platformField === "skip") continue;
      const rawValue = (row[csvColumn] ?? "").trim();
      if (BOOLEAN_FIELDS.includes(platformField)) {
        mapped[platformField] = parseBooleanValue(rawValue);
      } else {
        mapped[platformField] = rawValue;
      }
    }

    // ── Validate required fields ─────────────────────────────────────────
    const firstName = (mapped["first_name"] as string | undefined) ?? "";
    const lastName = (mapped["last_name"] as string | undefined) ?? "";

    if (!firstName || !lastName) {
      result.errors.push({
        row: rowNumber,
        reason: `Missing required field(s): ${!firstName ? "First Name" : ""}${!firstName && !lastName ? ", " : ""}${!lastName ? "Last Name" : ""}`.replace(/, $/, ""),
      });
      result.skipped++;
      continue;
    }

    // ── Duplicate email check ────────────────────────────────────────────
    const emailRaw = (mapped["email"] as string | undefined) ?? "";
    const emailNormalized = emailRaw.toLowerCase().trim();

    if (emailNormalized) {
      if (
        existingEmails.has(emailNormalized) ||
        seenEmailsThisBatch.has(emailNormalized)
      ) {
        result.errors.push({
          row: rowNumber,
          reason: `Duplicate email: ${emailNormalized}`,
        });
        result.skipped++;
        continue;
      }
      seenEmailsThisBatch.add(emailNormalized);
    }

    // ── Build donor insert payload ───────────────────────────────────────
    const donorInsert: Record<string, unknown> = {
      organization_id: orgId,
      first_name: firstName,
      last_name: lastName,
      email: emailNormalized || null,
      phone: (mapped["phone"] as string | undefined) || null,
    };

    // Boolean / tag fields
    for (const boolField of BOOLEAN_FIELDS) {
      if (boolField in mapped) {
        donorInsert[boolField] = mapped[boolField];
      }
    }

    // Capacity (stored as custom_fields or capacity column if it exists)
    if ("capacity" in mapped && (mapped["capacity"] as string)) {
      donorInsert["capacity"] = mapped["capacity"];
    }

    // ── Insert donor ─────────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from("donors")
      .insert(donorInsert);

    if (insertError) {
      result.errors.push({
        row: rowNumber,
        reason: insertError.message,
      });
      result.skipped++;
    } else {
      result.created++;
      // Track the email in our existing set so subsequent rows in this batch
      // also detect the duplicate correctly
      if (emailNormalized) {
        existingEmails.add(emailNormalized);
      }
    }
  }

  // ── Write import_log record ──────────────────────────────────────────────
  await supabase.from("import_logs").insert({
    organization_id: orgId,
    import_type: "csv",
    initiated_by: initiatedBy,
    file_name: fileName ?? null,
    records_created: result.created,
    records_skipped: result.skipped,
    total_rows: rows.length,
    errors: result.errors.length > 0 ? result.errors : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });

  return result;
}
