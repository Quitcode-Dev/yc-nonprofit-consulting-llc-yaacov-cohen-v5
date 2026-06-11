import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import DonorForm, { type Solicitor } from "./donor-form";

export default async function CreateDonorPage() {
  await requireRole(["organization_admin", "org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let solicitors: Solicitor[] = [];

  if (organizationId) {
    const supabase = await createServerClient();

    // Fetch active members of the org from user_roles. Identity (full_name,
    // email) lives on user_roles, and the id used for donor assignment
    // (donors.primary_solicitor_id) is user_roles.id.
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id, full_name, email")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (roleRows && roleRows.length > 0) {
      solicitors = roleRows.map(
        (r: {
          id: string;
          full_name: string | null;
          email: string | null;
        }) => ({
          // userId here carries the user_roles.id used for assignment.
          userId: r.id,
          // SCHEMA-GAP: user_roles has no first_name/last_name; only full_name.
          // Put the full name in firstName so the form renders it as-is.
          firstName: r.full_name,
          lastName: null,
          email: r.email,
        })
      );
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add New Donor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below to create a new donor record.
        </p>
      </div>

      <DonorForm solicitors={solicitors} />
    </div>
  );
}
