import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "@/components/pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface OrganizationRow {
  name: string;
}

/** Raw shape returned by Supabase — joined rows may be arrays */
interface FeedbackRowRaw {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  profiles: ProfileRow[] | ProfileRow | null;
  organizations: OrganizationRow[] | OrganizationRow | null;
}

interface FeedbackRow {
  id: string;
  title: string;
  category: string;
  status: "new" | "reviewed" | "resolved";
  created_at: string;
  profiles: ProfileRow | null;
  organizations: OrganizationRow | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getCategoryVariant(
  category: string
): "default" | "secondary" | "outline" | "muted" {
  switch (category) {
    case "bug_report":
      return "default";
    case "feature_request":
      return "secondary";
    case "question":
      return "outline";
    default:
      return "muted";
  }
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "success" | "muted" {
  switch (status) {
    case "new":
      return "default"; // blue
    case "reviewed":
      return "secondary"; // yellow/amber
    case "resolved":
      return "success"; // green
    default:
      return "muted";
  }
}

function getUserName(
  profile: FeedbackRow["profiles"]
): string {
  if (!profile) return "—";
  const name = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ");
  return name || profile.email || "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FeedbackInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["super_admin"]);

  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createServerClient();

  // Fetch total count for pagination
  const { count: totalCount } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Fetch paginated feedback joined with profiles and organizations
  const { data: feedbackData } = await supabase
    .from("feedback")
    .select(
      `
      id,
      title,
      category,
      status,
      created_at,
      profiles (
        first_name,
        last_name,
        email
      ),
      organizations (
        name
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Normalize joined rows: Supabase may return arrays for 1-to-many relations
  const rows: FeedbackRow[] = ((feedbackData ?? []) as unknown as FeedbackRowRaw[]).map(
    (raw) => ({
      id: raw.id,
      title: raw.title,
      category: raw.category,
      status: raw.status as FeedbackRow["status"],
      created_at: raw.created_at,
      profiles: Array.isArray(raw.profiles)
        ? (raw.profiles[0] ?? null)
        : raw.profiles,
      organizations: Array.isArray(raw.organizations)
        ? (raw.organizations[0] ?? null)
        : raw.organizations,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} submission{total !== 1 ? "s" : ""} across all organizations
          </p>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <p className="text-muted-foreground">No feedback submissions yet.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full hover:underline"
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full"
                    >
                      <Badge variant={getCategoryVariant(row.category)}>
                        {formatCategory(row.category)}
                      </Badge>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full"
                    >
                      {getUserName(row.profiles)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full"
                    >
                      {row.organizations?.name ?? (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full"
                    >
                      {formatDate(row.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/feedback/${row.id}`}
                      className="block w-full"
                    >
                      <Badge variant={getStatusVariant(row.status)}>
                        {row.status.charAt(0).toUpperCase() +
                          row.status.slice(1)}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={(page) => `/admin/feedback?page=${page}`}
            />
          )}
        </>
      )}
    </div>
  );
}
