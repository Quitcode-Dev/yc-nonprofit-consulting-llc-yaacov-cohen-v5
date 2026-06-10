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
import { FeedbackFilters } from "./feedback-filters";

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

function getUserName(profile: FeedbackRow["profiles"]): string {
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
  searchParams: Promise<{
    page?: string;
    category?: string;
    org?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }>;
}) {
  await requireRole(["super_admin"]);

  const {
    page: pageParam,
    category,
    org,
    status,
    dateFrom,
    dateTo,
    sort,
  } = await searchParams;

  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createServerClient();

  // ── Fetch distinct organization names for the filter dropdown ───────────────
  const { data: orgRows } = await supabase
    .from("organizations")
    .select("name")
    .order("name", { ascending: true });

  const organizationNames: string[] = (orgRows ?? []).map(
    (r: { name: string }) => r.name
  );

  // ── Build base query with optional filters ──────────────────────────────────

  // Helper that constructs a filtered query chain (used for both count + data)
  function buildQuery() {
    let q = supabase.from("feedback").select(
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
      `,
      { count: "exact" }
    );

    if (category) {
      q = q.eq("category", category);
    }

    if (status) {
      q = q.eq("status", status);
    }

    if (dateFrom) {
      // Include full day start
      q = q.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    }

    if (dateTo) {
      // Include full day end
      q = q.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }

    return q;
  }

  // ── Count query ─────────────────────────────────────────────────────────────

  // For org filter we need to filter via the join — get matching org ids first
  let orgIds: string[] | null = null;
  if (org) {
    const { data: matchedOrgs } = await supabase
      .from("organizations")
      .select("id")
      .eq("name", org);
    orgIds = (matchedOrgs ?? []).map((r: { id: string }) => r.id);
  }

  // Build count query
  let countQ = supabase
    .from("feedback")
    .select("id", { count: "exact", head: true });

  if (category) countQ = countQ.eq("category", category);
  if (status) countQ = countQ.eq("status", status);
  if (dateFrom) countQ = countQ.gte("created_at", `${dateFrom}T00:00:00.000Z`);
  if (dateTo) countQ = countQ.lte("created_at", `${dateTo}T23:59:59.999Z`);
  if (orgIds !== null) {
    if (orgIds.length === 0) {
      // No matching org → force zero results
      countQ = countQ.in("organization_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      countQ = countQ.in("organization_id", orgIds);
    }
  }

  const { count: totalCount } = await countQ;
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Data query ──────────────────────────────────────────────────────────────

  const ascending = sort === "oldest";

  let dataQ = buildQuery()
    .order("created_at", { ascending })
    .range(offset, offset + PAGE_SIZE - 1);

  if (orgIds !== null) {
    if (orgIds.length === 0) {
      dataQ = dataQ.in("organization_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      dataQ = dataQ.in("organization_id", orgIds);
    }
  }

  const { data: feedbackData } = await dataQ;

  // Normalize joined rows: Supabase may return arrays for 1-to-many relations
  const rows: FeedbackRow[] = (
    (feedbackData ?? []) as unknown as FeedbackRowRaw[]
  ).map((raw) => ({
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
  }));

  // ── Build pagination href preserving current filters ────────────────────────

  function buildPaginationHref(page: number): string {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (org) params.set("org", org);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (sort) params.set("sort", sort);
    params.set("page", String(page));
    return `/admin/feedback?${params.toString()}`;
  }

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

      {/* Filters */}
      <FeedbackFilters organizations={organizationNames} />

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
              buildHref={buildPaginationHref}
            />
          )}
        </>
      )}
    </div>
  );
}
