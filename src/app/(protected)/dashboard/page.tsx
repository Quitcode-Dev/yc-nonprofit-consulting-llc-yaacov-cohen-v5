import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import SolicitorDashboard from "./solicitor-dashboard";
import AdminDashboard from "./admin-dashboard";

// ─── Dashboard Page ───────────────────────────────────────────────────────────
//
// Role-aware server component:
//   - solicitor   → SolicitorDashboard (assigned donors + pending moves)
//   - org_admin / super_admin → AdminDashboard (org metrics + leaderboard)
//   - other roles → basic welcome view
//
// Organization isolation: organizationId is always resolved server-side via
// getUserOrganizationId() and passed down to child components. No child
// component may derive or hard-code its own org ID. If a solicitor or
// org_admin lacks an org association, they are redirected to /error.

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();
  const firstName = currentUser.profile?.full_name ?? null;

  // ── Solicitor dashboard ─────────────────────────────────────────────────────
  if (role === "solicitor") {
    if (!organizationId) {
      // Solicitors must belong to an org — redirect to error page
      redirect("/error");
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
      // org_admin must belong to an org — redirect to error page
      redirect("/error");
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
