import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import CSVImport from "./csv-import";

interface ImportLogRow {
  id: string;
  import_type: string;
  created_at: string;
  records_created: number | null;
  records_skipped: number | null;
  total_rows: number | null;
  file_name: string | null;
}

export default async function CSVImportPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let importLogs: ImportLogRow[] = [];

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("import_logs")
      .select(
        "id, import_type, created_at, records_created, records_skipped, total_rows, file_name"
      )
      .eq("organization_id", organizationId)
      .eq("import_type", "csv")
      .order("created_at", { ascending: false })
      .limit(10);

    importLogs = (data as ImportLogRow[] | null) ?? [];
  }

  return <CSVImport initialImportLogs={importLogs} />;
}
