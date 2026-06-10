import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import ImpersonationBanner from "@/components/impersonation-banner";
import FeedbackButton from "@/components/feedback-button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);

  const sidebarUser = {
    id: currentUser.user.id,
    email: currentUser.user.email,
    fullName: currentUser.profile?.full_name ?? null,
  };

  // Resolve impersonation banner data if cookie is set
  const cookieStore = await cookies();
  const impersonatedOrgId = cookieStore.get("impersonated_org_id")?.value;

  let impersonatedOrgName: string | null = null;

  if (impersonatedOrgId && role === "super_admin") {
    const supabase = await createServerClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", impersonatedOrgId)
      .single();
    impersonatedOrgName = org?.name ?? null;
  }

  return (
    <div className="flex flex-col h-screen">
      {impersonatedOrgName && (
        <ImpersonationBanner orgName={impersonatedOrgName} />
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={role} user={sidebarUser} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <FeedbackButton />
    </div>
  );
}
