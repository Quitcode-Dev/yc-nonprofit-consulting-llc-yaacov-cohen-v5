"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
}

const navItemsByRole: Record<string, NavItem[]> = {
  super_admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Organizations", href: "/admin/organizations" },
    { label: "Move Ideas Library", href: "/admin/move-ideas" },
    { label: "Feedback Inbox", href: "/admin/feedback" },
  ],
  org_admin: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Donors", href: "/donors" },
    { label: "Moves", href: "/moves" },
    { label: "Calendar", href: "/calendar" },
    { label: "Settings", href: "/settings" },
    { label: "Import", href: "/settings/import" },
    { label: "Move Ideas", href: "/settings/move-ideas" },
  ],
  fundraiser: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Donors", href: "/my-donors" },
    { label: "My Moves", href: "/my-moves" },
    { label: "Calendar", href: "/calendar" },
  ],
  solicitor: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Donors", href: "/my-donors" },
    { label: "My Moves", href: "/my-moves" },
    { label: "Calendar", href: "/calendar" },
  ],
  viewer: [
    { label: "Dashboard", href: "/dashboard" },
  ],
};

interface SidebarProps {
  role: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

export default function Sidebar({ role, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = navItemsByRole[role] ?? navItemsByRole.viewer;

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Donor Management</h2>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-3">
          <p className="text-sm font-medium truncate">
            {user.fullName || user.email}
          </p>
          {user.fullName && (
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent/50 hover:text-accent-foreground transition-colors text-left"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
