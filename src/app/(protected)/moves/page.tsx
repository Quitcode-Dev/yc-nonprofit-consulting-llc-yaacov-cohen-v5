import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizationId, getUserRole } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/pagination";
import { ChevronUp, ChevronDown } from "lucide-react";
import { getDisplayStatus, getStatusBadgeProps } from "@/lib/move-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";
type StatusFilter = "all" | "pending" | "completed";

interface MoveRow {
  id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
  donor_id: string;
  assigned_to: string | null;
  donorName: string;
  solicitorName: string | null;
  displayStatus: "pending" | "completed" | "overdue";
}

interface SolicitorOption {
  id: string;
  name: string;
}

interface SearchParams {
  status?: string;
  solicitor?: string;
  dateRange?: string;
  dir?: string;
  page?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSortDir(raw: string | undefined): SortDir {
  return raw === "desc" ? "desc" : "asc";
}

function parseStatus(raw: string | undefined): StatusFilter {
  if (raw === "pending" || raw === "completed") return raw;
  return "all";
}

function parsePage(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "1", 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function formatDate(dateStr: string): string {
  // Parse as local date to avoid UTC off-by-one
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildUrl(
  overrides: Record<string, string | number | undefined>,
  current: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && String(value) !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `/moves${qs ? `?${qs}` : ""}`;
}

// ─── Sort Indicator ───────────────────────────────────────────────────────────

function SortIndicator({ dir }: { dir: SortDir }) {
  return dir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 ml-1 inline-block" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 ml-1 inline-block" />
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function MovesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;

  // ── Auth ────────────────────────────────────────────────────────────────────
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const role = getUserRole(currentUser);
  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    redirect("/dashboard");
  }

  const isAdmin = role === "org_admin" || role === "super_admin";

  // ── Parse query params ──────────────────────────────────────────────────────
  const sortDir = parseSortDir(resolvedParams.dir);
  const statusFilter = parseStatus(resolvedParams.status);
  const solicitorFilter = isAdmin
    ? (resolvedParams.solicitor?.trim() ?? "")
    : "";
  const dateRange = resolvedParams.dateRange?.trim() ?? "";
  const page = parsePage(resolvedParams.page);

  // Current params used for building URLs (preserves active filters)
  const currentParams: Record<string, string | undefined> = {
    dir: sortDir,
    status: statusFilter !== "all" ? statusFilter : undefined,
    solicitor: solicitorFilter || undefined,
    dateRange: dateRange || undefined,
  };

  // ── Supabase client ─────────────────────────────────────────────────────────
  const supabase = await createServerClient();

  // ── Fetch org solicitors for admin filter dropdown ──────────────────────────
  let solicitorOptions: SolicitorOption[] = [];
  if (isAdmin) {
    // Assignable solicitors are active org members in user_roles. The id stored
    // on moves.assigned_to = user_roles.id; display name = full_name.
    const { data: orgUsers } = await supabase
      .from("user_roles")
      .select("id, full_name, email")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    solicitorOptions = (
      (orgUsers ?? []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>
    ).map((u) => ({
      id: u.id,
      name: u.full_name || u.email || u.id,
    }));

    solicitorOptions.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Count query ─────────────────────────────────────────────────────────────
  let countQuery = supabase
    .from("moves")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (!isAdmin) {
    // assigned_to references user_roles.id (organizationUser.id).
    countQuery = countQuery.eq("assigned_to", currentUser.organizationUser?.id ?? "");
  } else if (solicitorFilter) {
    countQuery = countQuery.eq("assigned_to", solicitorFilter);
  }

  if (statusFilter !== "all") {
    countQuery = countQuery.eq("is_completed", statusFilter === "completed");
  }

  // dateRange filter: expects "YYYY-MM-DD,YYYY-MM-DD"
  if (dateRange) {
    const parts = dateRange.split(",");
    if (parts.length === 2) {
      const [fromDate, toDate] = parts;
      if (fromDate?.trim()) countQuery = countQuery.gte("due_date", fromDate.trim());
      if (toDate?.trim()) countQuery = countQuery.lte("due_date", toDate.trim());
    }
  }

  const { count: totalCount } = await countQuery;

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // ── Data query ──────────────────────────────────────────────────────────────
  let dataQuery = supabase
    .from("moves")
    .select("id, name, due_date, is_completed, donor_id, assigned_to")
    .eq("organization_id", organizationId);

  if (!isAdmin) {
    // assigned_to references user_roles.id (organizationUser.id).
    dataQuery = dataQuery.eq("assigned_to", currentUser.organizationUser?.id ?? "");
  } else if (solicitorFilter) {
    dataQuery = dataQuery.eq("assigned_to", solicitorFilter);
  }

  if (statusFilter !== "all") {
    dataQuery = dataQuery.eq("is_completed", statusFilter === "completed");
  }

  if (dateRange) {
    const parts = dateRange.split(",");
    if (parts.length === 2) {
      const [fromDate, toDate] = parts;
      if (fromDate?.trim()) dataQuery = dataQuery.gte("due_date", fromDate.trim());
      if (toDate?.trim()) dataQuery = dataQuery.lte("due_date", toDate.trim());
    }
  }

  const { data: movesRaw } = await dataQuery
    .order("due_date", { ascending: sortDir === "asc" })
    .range(from, to);

  const rawMoves = (movesRaw ?? []) as Array<{
    id: string;
    name: string;
    due_date: string;
    is_completed: boolean;
    donor_id: string;
    assigned_to: string | null;
  }>;

  // ── Fetch donor names ───────────────────────────────────────────────────────
  const donorIds = [...new Set(rawMoves.map((m) => m.donor_id))];
  const donorMap = new Map<string, string>();

  if (donorIds.length > 0) {
    const { data: donorsData } = await supabase
      .from("donors")
      .select("id, first_name, last_name")
      .in("id", donorIds);

    if (donorsData) {
      for (const d of donorsData as Array<{
        id: string;
        first_name: string;
        last_name: string;
      }>) {
        donorMap.set(d.id, [d.first_name, d.last_name].filter(Boolean).join(" "));
      }
    }
  }

  // ── Fetch solicitor names (admin view) ──────────────────────────────────────
  // moves.assigned_to references user_roles.id; display name = full_name.
  const solicitorProfileMap = new Map<string, string>();

  if (isAdmin && rawMoves.length > 0) {
    const uniqueSolicitorIds = [
      ...new Set(rawMoves.map((m) => m.assigned_to).filter((v): v is string => !!v)),
    ];
    if (uniqueSolicitorIds.length > 0) {
      const { data: profData } = await supabase
        .from("user_roles")
        .select("id, full_name, email")
        .in("id", uniqueSolicitorIds);

      if (profData) {
        for (const p of profData as Array<{
          id: string;
          full_name: string | null;
          email: string | null;
        }>) {
          const name = p.full_name || p.email || p.id;
          solicitorProfileMap.set(p.id, name);
        }
      }
    }
  }

  // ── Compute display status (pending / completed / overdue) ──────────────────
  const moves: MoveRow[] = rawMoves.map((m) => ({
    id: m.id,
    name: m.name,
    due_date: m.due_date,
    is_completed: m.is_completed,
    donor_id: m.donor_id,
    assigned_to: m.assigned_to,
    donorName: donorMap.get(m.donor_id) ?? "Unknown Donor",
    solicitorName: isAdmin
      ? (m.assigned_to ? solicitorProfileMap.get(m.assigned_to) ?? null : null)
      : null,
    // getDisplayStatus expects a `status` string; derive it from is_completed.
    displayStatus: getDisplayStatus({
      status: m.is_completed ? "completed" : "pending",
      due_date: m.due_date,
    }),
  }));

  // ── URL builders ────────────────────────────────────────────────────────────
  function sortHref(): string {
    const nextDir: SortDir = sortDir === "asc" ? "desc" : "asc";
    return buildUrl({ dir: nextDir, page: 1 }, currentParams);
  }

  function pagHref(p: number): string {
    return buildUrl({ page: p }, currentParams);
  }

  const pageTitle = isAdmin ? "All Moves" : "My Moves";
  const colSpan = isAdmin ? 5 : 4;
  const hasActiveFilters = statusFilter !== "all" || !!solicitorFilter || !!dateRange;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} move{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/moves/new">Create Move</Link>
        </Button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <form
        method="GET"
        action="/moves"
        className="flex flex-wrap items-center gap-3"
      >
        {/* Preserve sort direction across filter submissions */}
        <input type="hidden" name="dir" value={sortDir} />

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="statusFilter"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Status:
          </label>
          <select
            id="statusFilter"
            name="status"
            defaultValue={statusFilter}
            className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Solicitor filter — admins only */}
        {isAdmin && solicitorOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="solicitorFilter"
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              Solicitor:
            </label>
            <select
              id="solicitorFilter"
              name="solicitor"
              defaultValue={solicitorFilter}
              className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Solicitors</option>
              {solicitorOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>

        {hasActiveFilters && (
          <Link
            href="/moves"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset filters
          </Link>
        )}
      </form>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Move Title</TableHead>
              <TableHead>Donor Name</TableHead>
              {isAdmin && <TableHead>Solicitor Name</TableHead>}
              <TableHead>
                <Link
                  href={sortHref()}
                  className="inline-flex items-center hover:text-foreground transition-colors"
                >
                  Due Date
                  <SortIndicator dir={sortDir} />
                </Link>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {moves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground text-sm">
                      No moves found
                    </p>
                    <Button asChild size="sm">
                      <Link href="/moves/new">Create Move</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              moves.map((move) => {
                const badgeProps = getStatusBadgeProps(move.displayStatus);
                return (
                  <TableRow
                    key={move.id}
                    className={
                      move.displayStatus === "overdue"
                        ? "bg-red-50 hover:bg-red-100"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      <Link
                        href={`/moves/${move.id}`}
                        className="hover:underline"
                      >
                        {move.name}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/moves/${move.id}`}
                        className="block w-full hover:underline"
                      >
                        {move.donorName}
                      </Link>
                    </TableCell>

                    {isAdmin && (
                      <TableCell>
                        <Link
                          href={`/moves/${move.id}`}
                          className="block w-full hover:underline"
                        >
                          {move.solicitorName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Link>
                      </TableCell>
                    )}

                    <TableCell>
                      <Link
                        href={`/moves/${move.id}`}
                        className="block w-full hover:underline"
                      >
                        {formatDate(move.due_date)}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/moves/${move.id}`}
                        className="inline-flex items-center gap-2"
                      >
                        <Badge
                          variant={
                            badgeProps.variant as
                              | "destructive"
                              | "secondary"
                              | "outline"
                              | "default"
                          }
                          className={badgeProps.className}
                        >
                          {badgeProps.label}
                        </Badge>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          buildHref={pagHref}
        />
      )}
    </div>
  );
}
