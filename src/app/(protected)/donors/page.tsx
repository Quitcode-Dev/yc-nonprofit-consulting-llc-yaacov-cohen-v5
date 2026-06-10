import React from "react";
import Link from "next/link";
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
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { redirect } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "score" | "name" | "tier";
type SortDir = "asc" | "desc";

interface DonorRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  score: number | null;
  tier: string | null;
  assigned_solicitor_id: string | null;
  solicitorName: string | null;
}

interface FilterIndicatorProps {
  solicitorName: string;
  clearHref: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SORT_FIELDS: SortField[] = ["score", "name", "tier"];
const VALID_PAGE_SIZES = [25, 50];
const DEFAULT_PAGE_SIZE = 25;

function parseSortField(raw: string | undefined): SortField {
  if (raw && VALID_SORT_FIELDS.includes(raw as SortField)) {
    return raw as SortField;
  }
  return "score";
}

function parseSortDir(raw: string | undefined): SortDir {
  if (raw === "asc" || raw === "desc") return raw;
  return "desc";
}

function parsePageSize(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "", 10);
  return VALID_PAGE_SIZES.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}

function parsePage(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "1", 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

/** Build a URL for this page preserving all current params, but overriding specific ones */
function buildUrl(
  overrides: Record<string, string | number | undefined>,
  current: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  }
  return `/donors?${params.toString()}`;
}

// ─── Filter Indicator Component ───────────────────────────────────────────────

function FilterIndicator({ solicitorName, clearHref }: FilterIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        Filtered by:{" "}
        <span className="font-medium text-foreground">{solicitorName}</span>
      </span>
      <Link
        href={clearHref}
        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
      >
        Clear
      </Link>
    </div>
  );
}

// ─── Sort Header Component ────────────────────────────────────────────────────

function SortIndicator({
  field,
  currentField,
  currentDir,
}: {
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
}) {
  if (field !== currentField) {
    return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
  }
  return currentDir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 ml-1" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 ml-1" />
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

interface SearchParams {
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
  search?: string;
  solicitor?: string;
}

export default async function DonorListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  const role = getUserRole(currentUser);

  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    redirect("/dashboard");
  }

  // Parse query params
  const sortField = parseSortField(resolvedParams.sort);
  const sortDir = parseSortDir(resolvedParams.dir);
  const pageSize = parsePageSize(resolvedParams.pageSize);
  const page = parsePage(resolvedParams.page);
  const search = resolvedParams.search?.trim() ?? "";
  const solicitorFilter = resolvedParams.solicitor?.trim() ?? "";

  // Helper to build page URLs preserving current params
  const currentParams: Record<string, string | undefined> = {
    sort: sortField,
    dir: sortDir,
    pageSize: String(pageSize),
    search: search || undefined,
    solicitor: solicitorFilter || undefined,
  };

  // ─── Build Supabase query ─────────────────────────────────────────────────

  const supabase = await createServerClient();

  // Count query (for pagination)
  let countQuery = supabase
    .from("donors")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (solicitorFilter) {
    countQuery = countQuery.eq("assigned_solicitor_id", solicitorFilter);
  }

  if (search) {
    countQuery = countQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { count: totalCount } = await countQuery;
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  // Data query
  let dataQuery = supabase
    .from("donors")
    .select(
      "id, first_name, last_name, email, score, tier, assigned_solicitor_id"
    )
    .eq("organization_id", organizationId);

  if (solicitorFilter) {
    dataQuery = dataQuery.eq("assigned_solicitor_id", solicitorFilter);
  }

  if (search) {
    dataQuery = dataQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Apply sort
  if (sortField === "score") {
    dataQuery = dataQuery.order("score", {
      ascending: sortDir === "asc",
      nullsFirst: false,
    });
  } else if (sortField === "name") {
    dataQuery = dataQuery
      .order("last_name", { ascending: sortDir === "asc" })
      .order("first_name", { ascending: sortDir === "asc" });
  } else if (sortField === "tier") {
    dataQuery = dataQuery.order("tier", {
      ascending: sortDir === "asc",
      nullsFirst: false,
    });
  }

  dataQuery = dataQuery.range(from, to);

  const { data: donorsRaw } = await dataQuery;
  const rawDonors = (donorsRaw ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    score: number | null;
    tier: string | null;
    assigned_solicitor_id: string | null;
  }>;

  // Fetch solicitor profiles for display names
  const solicitorIds = [
    ...new Set(
      rawDonors
        .map((d) => d.assigned_solicitor_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  const solicitorMap = new Map<string, string>();

  if (solicitorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", solicitorIds);

    if (profiles) {
      for (const p of profiles as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>) {
        const name =
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.email ||
          p.id;
        solicitorMap.set(p.id, name);
      }
    }
  }

  const donors: DonorRow[] = rawDonors.map((d) => ({
    ...d,
    solicitorName: d.assigned_solicitor_id
      ? (solicitorMap.get(d.assigned_solicitor_id) ?? null)
      : null,
  }));

  // Resolve the name for the solicitor filter indicator
  let filteredSolicitorName: string | null = null;
  if (solicitorFilter) {
    // May already be in the map from page results, or we need to fetch it
    filteredSolicitorName = solicitorMap.get(solicitorFilter) ?? null;

    if (!filteredSolicitorName) {
      const { data: solProfile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("id", solicitorFilter)
        .single();

      if (solProfile) {
        const p = solProfile as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        };
        filteredSolicitorName =
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.email ||
          solicitorFilter;
      }
    }
  }

  // ─── Sort header URL builder ──────────────────────────────────────────────

  function sortHref(field: SortField): string {
    const nextDir: SortDir =
      sortField === field && sortDir === "desc" ? "asc" : "desc";
    return buildUrl(
      { sort: field, dir: nextDir, page: 1 },
      currentParams
    );
  }

  function pagHref(p: number): string {
    return buildUrl({ page: p }, currentParams);
  }

  // URL to clear the solicitor filter (preserve all other params)
  const clearSolicitorHref = buildUrl(
    { solicitor: undefined, page: 1 },
    currentParams
  );

  const pageTitle = role === "solicitor" ? "My Donors" : "All Donors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} donor{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/donors/new">Add Donor</Link>
        </Button>
      </div>

      {/* Solicitor filter indicator */}
      {solicitorFilter && filteredSolicitorName && (
        <FilterIndicator
          solicitorName={filteredSolicitorName}
          clearHref={clearSolicitorHref}
        />
      )}

      {/* Search + Page Size controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search — client-side form that replaces the URL */}
        <form method="GET" action="/donors" className="flex-1 min-w-[200px] max-w-sm">
          {/* Preserve sort/dir/pageSize/solicitor when searching */}
          <input type="hidden" name="sort" value={sortField} />
          <input type="hidden" name="dir" value={sortDir} />
          <input type="hidden" name="pageSize" value={String(pageSize)} />
          {solicitorFilter && (
            <input type="hidden" name="solicitor" value={solicitorFilter} />
          )}
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search donors by name or email..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </form>

        {/* Page size selector */}
        <form method="GET" action="/donors">
          <input type="hidden" name="sort" value={sortField} />
          <input type="hidden" name="dir" value={sortDir} />
          {search && <input type="hidden" name="search" value={search} />}
          {solicitorFilter && (
            <input type="hidden" name="solicitor" value={solicitorFilter} />
          )}
          <input type="hidden" name="page" value="1" />
          <div className="flex items-center gap-2">
            <label
              htmlFor="pageSizeSelect"
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              Rows per page:
            </label>
            <select
              id="pageSizeSelect"
              name="pageSize"
              defaultValue={String(pageSize)}
              onChange={undefined}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <button
              type="submit"
              className="h-10 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Name — sortable */}
              <TableHead>
                <Link
                  href={sortHref("name")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Name
                  <SortIndicator
                    field="name"
                    currentField={sortField}
                    currentDir={sortDir}
                  />
                </Link>
              </TableHead>

              <TableHead>Email</TableHead>

              {/* Score — sortable */}
              <TableHead className="text-right">
                <Link
                  href={sortHref("score")}
                  className="flex items-center justify-end hover:text-foreground transition-colors"
                >
                  Score
                  <SortIndicator
                    field="score"
                    currentField={sortField}
                    currentDir={sortDir}
                  />
                </Link>
              </TableHead>

              {/* Tier — sortable */}
              <TableHead>
                <Link
                  href={sortHref("tier")}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Tier
                  <SortIndicator
                    field="tier"
                    currentField={sortField}
                    currentDir={sortDir}
                  />
                </Link>
              </TableHead>

              <TableHead>Assigned Solicitor</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {donors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12"
                >
                  {search
                    ? `No donors found matching "${search}".`
                    : "No donors yet. Add one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              donors.map((donor) => (
                <TableRow
                  key={donor.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/donors/${donor.id}`}
                      className="block w-full hover:underline"
                    >
                      {[donor.first_name, donor.last_name]
                        .filter(Boolean)
                        .join(" ")}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/donors/${donor.id}`}
                      className="block w-full"
                    >
                      {donor.email ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Link>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    <Link
                      href={`/donors/${donor.id}`}
                      className="block w-full text-right"
                    >
                      {donor.score ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/donors/${donor.id}`}
                      className="block w-full"
                    >
                      {donor.tier ? (
                        <Badge variant="secondary">{donor.tier}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/donors/${donor.id}`}
                      className="block w-full"
                    >
                      {donor.solicitorName ? (
                        donor.solicitorName
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Unassigned
                        </span>
                      )}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
