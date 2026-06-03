import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AccessAsAdminButton from "./access-as-admin-button";

interface OrganizationRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  status: "active" | "inactive";
  created_at: string;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["super_admin"]);

  const { id } = await params;

  const supabase = await createServerClient();

  // Fetch organization by ID
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, contact_name, contact_email, status, created_at")
    .eq("id", id)
    .single();

  if (orgError || !org) {
    notFound();
  }

  const organization = org as OrganizationRow;

  // Count users in this organization
  const { count: userCount } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", id);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back navigation */}
      <div>
        <Button variant="outline" asChild size="sm">
          <Link href="/admin/organizations">← Back to Organizations</Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <Badge variant={organization.status === "active" ? "success" : "muted"}>
          {organization.status}
        </Badge>
      </div>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Organization Name
              </p>
              <p className="text-sm mt-1">{organization.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <div className="mt-1">
                <Badge
                  variant={
                    organization.status === "active" ? "success" : "muted"
                  }
                >
                  {organization.status}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Contact Name
              </p>
              <p className="text-sm mt-1">
                {organization.contact_name ?? (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Contact Email
              </p>
              <p className="text-sm mt-1">
                {organization.contact_email ? (
                  <a
                    href={`mailto:${organization.contact_email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {organization.contact_email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Creation Date
              </p>
              <p className="text-sm mt-1">
                {formatDate(organization.created_at)}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Number of Users
              </p>
              <p className="text-sm mt-1">{userCount ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <AccessAsAdminButton organizationId={organization.id} />
      </div>
    </div>
  );
}
