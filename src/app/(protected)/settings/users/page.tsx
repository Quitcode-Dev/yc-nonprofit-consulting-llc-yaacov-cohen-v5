import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import InviteDialog from "./invite-dialog";
import UsersTable, { type SolicitorRow } from "./users-table";

// Real schema: members live in `user_roles` (identity + org membership merged).
// Name/email/phone are ON this row; there is no separate profiles table.
interface UserRoleRecord {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export default async function UserManagementPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let solicitors: SolicitorRow[] = [];

  if (organizationId) {
    const supabase = await createServerClient();

    // Fetch all user_roles (members) for this org.
    const { data: members, error: membersError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, is_active, email, full_name, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error("Failed to fetch organization members:", membersError);
    }

    if (members && members.length > 0) {
      solicitors = (members as UserRoleRecord[]).map((m) => {
        // full_name is a single field on user_roles; split into first/last to
        // satisfy the SolicitorRow contract consumed by UsersTable.
        const nameParts = (m.full_name ?? "").trim().split(/\s+/).filter(Boolean);
        const firstName = nameParts.length > 0 ? nameParts[0] : null;
        const lastName =
          nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        return {
          // The membership row id (user_roles.id) is the identifier used by
          // the deactivate/reactivate actions (rule 6).
          userId: m.id,
          firstName,
          lastName,
          email: m.email ?? null,
          // is_active maps to the active/inactive status string.
          status: m.is_active ? "active" : "inactive",
          dateAdded: m.created_at,
        };
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage solicitor accounts for your organization.
          </p>
        </div>
        <InviteDialog />
      </div>

      {/* Solicitors table */}
      <div className="rounded-lg border bg-card">
        <UsersTable solicitors={solicitors} />
      </div>
    </div>
  );
}
