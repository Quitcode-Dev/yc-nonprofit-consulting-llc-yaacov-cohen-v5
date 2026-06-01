import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile, OrganizationUser } from "@/lib/types";

export interface CurrentUser {
  user: {
    id: string;
    email: string;
  };
  profile: Profile | null;
  organizationUser: OrganizationUser | null;
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
  if (currentUser.profile?.is_super_admin) {
    return "super_admin";
  }
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
