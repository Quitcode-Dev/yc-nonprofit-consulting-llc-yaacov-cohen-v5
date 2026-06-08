import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import DonorForm, { type Solicitor } from "./donor-form";

export default async function CreateDonorPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let solicitors: Solicitor[] = [];

  if (organizationId) {
    const supabase = await createServerClient();

    // Fetch active solicitors for the org
    const { data: orgUsers } = await supabase
      .from("organization_users")
      .select("user_id, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .eq("role", "solicitor");

    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map((ou: { user_id: string }) => ou.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      if (profiles) {
        solicitors = profiles.map(
          (p: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            email: string | null;
          }) => ({
            userId: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            email: p.email,
          })
        );
      }
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
