import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";

export interface CurrentUser {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    is_super_admin: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  organizationUser: {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    status: string;
    invited_email: string | null;
    invited_at: string | null;
    invitation_token?: string | null;
    invitation_expires_at?: string | null;
    joined_at: string | null;
    created_at: string;
  } | null;
}

/**
 * Checks whether the given profile represents a super admin.
 * Uses the `is_super_admin` boolean field from the profiles table.
 */
function isSuperAdmin(
  profile: CurrentUser["profile"]
): boolean {
  if (!profile) return false;
  return profile.is_super_admin === true;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Identity, role, and organization membership all live in `user_roles`.
  // A user may have several active rows (one per organization); a super_admin
  // row has organization_id = null. We derive the legacy `profile` /
  // `organizationUser` shapes from these rows so existing callers keep working.
  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (rolesError) {
    console.error("[getCurrentUser] user_roles query failed:", {
      message: rolesError.message,
      code: (rolesError as { code?: string }).code,
      details: (rolesError as { details?: string }).details,
      hint: (rolesError as { hint?: string }).hint,
      userId: user.id,
    });
  }

  const rows = roleRows ?? [];
  const superAdminRow = rows.find((r) => r.role === "super_admin") ?? null;
  const orgRow = rows.find((r) => r.organization_id != null) ?? null;
  const baseRow = superAdminRow ?? orgRow ?? rows[0] ?? null;

  // The live `user_roles.role` uses "organization_admin"; the rest of the app
  // (UserRole enum, requireRole calls, UI branches) speaks "org_admin". Map at
  // this boundary so downstream role checks keep working unchanged.
  const normalizeRole = (role: string | null): string => {
    if (role === "organization_admin") return "org_admin";
    if (role === "organization_solicitor") return "solicitor";
    return role ?? "solicitor";
  };

  const profile: CurrentUser["profile"] = baseRow
    ? {
        id: user.id,
        email: baseRow.email ?? user.email ?? null,
        full_name: baseRow.full_name ?? null,
        avatar_url: null,
        is_super_admin: superAdminRow !== null,
        created_at: baseRow.created_at,
        updated_at: baseRow.updated_at,
      }
    : null;

  const organizationUser: CurrentUser["organizationUser"] = orgRow
    ? {
        id: orgRow.id,
        organization_id: orgRow.organization_id,
        user_id: orgRow.user_id,
        role: normalizeRole(orgRow.role),
        status: orgRow.is_active ? "active" : "inactive",
        invited_email: null,
        invited_at: null,
        invitation_token: null,
        invitation_expires_at: null,
        joined_at: null,
        created_at: orgRow.created_at,
      }
    : null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile,
    organizationUser,
  };
}

export function getUserRole(currentUser: CurrentUser): string {
  // Check profile-level role for super_admin
  if (isSuperAdmin(currentUser.profile)) {
    return "super_admin";
  }
  // Check organization-level role
  if (currentUser.organizationUser?.role) {
    return currentUser.organizationUser.role;
  }
  return "viewer";
}

export async function requireRole(allowedRoles: string[]): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);

  if (!allowedRoles.includes(role)) {
    redirect("/dashboard");
  }

  return currentUser;
}

/**
 * Verifies that the current user has access to the specified organization.
 * Super Admins bypass this check entirely.
 * Returns the CurrentUser if access is granted.
 * Throws a Response with 403 status if the user does not belong to the organization.
 */
export async function requireOrganizationAccess(
  organizationId: string
): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Super Admins bypass organization access checks
  if (isSuperAdmin(currentUser.profile)) {
    return currentUser;
  }

  // Verify the user belongs to the requested organization
  if (
    !currentUser.organizationUser ||
    currentUser.organizationUser.organization_id !== organizationId
  ) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return currentUser;
}

/**
 * Returns the organization_id for the current user.
 * For Super Admins, checks for an impersonated org ID from the cookie
 * named "impersonated_org_id" (also supports legacy "x-org-id").
 * Falls back to the user's own organization_users record.
 * Returns null if no organization is associated.
 */
export async function getUserOrganizationId(): Promise<string | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  // Super Admins may impersonate an organization via cookie
  if (isSuperAdmin(currentUser.profile)) {
    const cookieStore = await cookies();
    const impersonatedOrgId =
      cookieStore.get("impersonated_org_id")?.value ??
      cookieStore.get("x-org-id")?.value;
    if (impersonatedOrgId) {
      return impersonatedOrgId;
    }
    // Fall through to the user's own org membership if no impersonation cookie
  }

  return currentUser.organizationUser?.organization_id ?? null;
}

/**
 * Verifies that the current user (solicitor) has access to the
 * specified donor. The donor's assigned_solicitor_id must match the current
 * user's id. Super Admins and Org Admins bypass this check.
 *
 * Returns the CurrentUser if access is granted.
 * Throws a Response with 403 status if the solicitor is not assigned to the donor.
 * Redirects to /login if the user is not authenticated.
 */
export async function requireSolicitorDonorAccess(
  donorId: string
): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Super Admins bypass donor access checks
  if (isSuperAdmin(currentUser.profile)) {
    return currentUser;
  }

  // Org Admins bypass donor access checks
  if (
    currentUser.organizationUser?.role === "organization_admin" ||
    currentUser.organizationUser?.role === "org_admin"
  ) {
    return currentUser;
  }

  // For solicitors and other roles, verify assignment.
  // NOTE: in the live schema a solicitor is identified by their user_roles row
  // id (organizationUser.id), NOT the auth user id. Donor↔solicitor links live
  // in donors.primary_solicitor_id and the donor_assignments join table, both
  // of which reference user_roles.id.
  const supabase = await createServerClient();
  const userRoleId = currentUser.organizationUser?.id ?? null;

  const { data: donor, error } = await supabase
    .from("donors")
    .select("id, primary_solicitor_id, organization_id")
    .eq("id", donorId)
    .single();

  if (error || !donor) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify the donor belongs to the user's organization
  if (
    !currentUser.organizationUser ||
    currentUser.organizationUser.organization_id !== donor.organization_id
  ) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Assigned as primary solicitor?
  let assigned = userRoleId !== null && donor.primary_solicitor_id === userRoleId;

  // Otherwise check the donor_assignments join table for a secondary assignment.
  if (!assigned && userRoleId !== null) {
    const { data: assignment } = await supabase
      .from("donor_assignments")
      .select("id")
      .eq("donor_id", donorId)
      .eq("user_role_id", userRoleId)
      .limit(1)
      .maybeSingle();
    assigned = assignment != null;
  }

  if (!assigned) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return currentUser;
}
