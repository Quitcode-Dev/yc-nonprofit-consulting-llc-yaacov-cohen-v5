import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import InviteDialog from "./invite-dialog";
import UsersTable, { type SolicitorRow } from "./users-table";

interface OrganizationUserRecord {
  id: string;
  user_id: string;
  role: string;
  status: string;
  invited_email: string | null;
  created_at: string;
  joined_at: string | null;
}

interface ProfileRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export default async function UserManagementPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let solicitors: SolicitorRow[] = [];

  if (organizationId) {
    const supabase = await createServerClient();

    // Fetch all organization_users for this org (excluding org_admin and super_admin rows)
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from("organization_users")
      .select("id, user_id, role, status, invited_email, created_at, joined_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (orgUsersError) {
      console.error("Failed to fetch organization users:", orgUsersError);
    }

    if (orgUsers && orgUsers.length > 0) {
      // Collect unique user_ids to join with profiles
      const userIds = [
        ...new Set(
          (orgUsers as OrganizationUserRecord[])
            .map((u) => u.user_id)
            .filter(Boolean)
        ),
      ];

      let profilesMap: Map<string, ProfileRecord> = new Map();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Failed to fetch profiles:", profilesError);
        }

        if (profiles) {
          for (const p of profiles as ProfileRecord[]) {
            profilesMap.set(p.id, p);
          }
        }
      }

      solicitors = (orgUsers as OrganizationUserRecord[]).map((ou) => {
        const profile = profilesMap.get(ou.user_id);
        return {
          userId: ou.user_id,
          firstName: profile?.first_name ?? null,
          lastName: profile?.last_name ?? null,
          // Prefer profile email, fall back to invited_email for pending users
          email: profile?.email ?? ou.invited_email ?? null,
          status: ou.status,
          dateAdded: ou.created_at,
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
