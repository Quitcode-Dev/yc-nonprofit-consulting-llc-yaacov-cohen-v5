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
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
    status: string;
    is_super_admin?: boolean;
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
    invitation_token: string | null;
    invitation_expires_at: string | null;
    joined_at: string | null;
    created_at: string;
  } | null;
}

/**
 * Checks whether the given profile represents a super admin.
 * Supports both the `role` enum field (from 00001 schema: role = 'super_admin')
 * and the `is_super_admin` boolean field (from types.ts / 00002 schema).
 */
function isSuperAdmin(
  profile: CurrentUser["profile"]
): boolean {
  if (!profile) return false;
  if (profile.role === "super_admin") return true;
  if (profile.is_super_admin === true) return true;
  return false;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: organizationUser } = await supabase
    .from("organization_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
    },
    profile: profile ?? null,
    organizationUser: organizationUser ?? null,
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
  if (currentUser.organizationUser?.role === "org_admin") {
    return currentUser;
  }

  // For solicitors and other roles, verify assignment
  const supabase = await createServerClient();

  const { data: donor, error } = await supabase
    .from("donors")
    .select("id, assigned_solicitor_id, organization_id")
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

  // Verify the donor is assigned to this solicitor
  if (donor.assigned_solicitor_id !== currentUser.user.id) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return currentUser;
}
