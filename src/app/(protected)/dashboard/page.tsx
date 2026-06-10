import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import SolicitorDashboard from "./solicitor-dashboard";
import AdminDashboard from "./admin-dashboard";

// ─── Dashboard Page ───────────────────────────────────────────────────────────
//
// Role-aware server component:
//   - solicitor   → SolicitorDashboard (assigned donors + pending moves)
//   - org_admin / super_admin → admin dashboard (placeholder, US-048)
//   - other roles → basic welcome view

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();
  const firstName = currentUser.profile?.first_name ?? null;

  // ── Solicitor dashboard ─────────────────────────────────────────────────────
  if (role === "solicitor") {
    if (!organizationId) {
      // Solicitor with no org: show a basic message
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            You are not currently associated with an organization.
          </p>
        </div>
      );
    }

    return (
      <SolicitorDashboard
        userId={currentUser.user.id}
        organizationId={organizationId}
        firstName={firstName}
      />
    );
  }

  // ── Admin dashboard (org_admin / super_admin) ────────────────────────────────
  if (role === "org_admin" || role === "super_admin") {
    if (!organizationId) {
      const displayName = firstName ? `Welcome back, ${firstName}` : "Welcome back";
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              No organization associated with your account.
            </p>
          </div>
        </div>
      );
    }

    return (
      <AdminDashboard
        organizationId={organizationId}
        firstName={firstName}
      />
    );
  }

  // ── Fallback for other roles (viewer, fundraiser, etc.) ───────────────────
  const displayName = firstName ? `Welcome back, ${firstName}` : "Welcome back";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your dashboard is ready.
        </p>
      </div>
    </div>
  );
}
