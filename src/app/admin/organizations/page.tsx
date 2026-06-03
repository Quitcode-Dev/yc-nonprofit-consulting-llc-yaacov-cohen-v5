import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Organization } from "@/lib/types";

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

export default async function OrganizationsListPage() {
  await requireRole(["super_admin"]);

  const supabase = await createServerClient();

  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  const orgs = (organizations ?? []) as Organization[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <Button asChild>
          <Link href="/admin/organizations/new">Create Organization</Link>
        </Button>
      </div>

      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-muted-foreground">No organizations yet</p>
          <Button asChild>
            <Link href="/admin/organizations/new">Create Organization</Link>
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization Name</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="block w-full font-medium hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="block w-full"
                  >
                    {formatDate(org.created_at)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="block w-full"
                  >
                    {org.status === "inactive" ? (
                      <Badge variant="muted">inactive</Badge>
                    ) : (
                      <Badge variant="success">active</Badge>
                    )}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
