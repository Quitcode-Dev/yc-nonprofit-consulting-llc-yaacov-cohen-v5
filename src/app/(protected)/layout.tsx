import { redirect } from "next/navigation";
import { getCurrentUser, getUserRole } from "@/lib/auth";
import Sidebar from "@/components/sidebar";

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
    fullName: [currentUser.profile?.first_name, currentUser.profile?.last_name]
      .filter(Boolean)
      .join(" ") || null,
  };

  return (
    <div className="flex h-screen">
      <Sidebar role={role} user={sidebarUser} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
