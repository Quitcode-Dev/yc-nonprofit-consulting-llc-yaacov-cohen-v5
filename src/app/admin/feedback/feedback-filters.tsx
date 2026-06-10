"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackFiltersProps {
  /** Distinct organization names from the feedback table */
  organizations: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "question", label: "Question" },
] as const;

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedbackFilters({ organizations }: FeedbackFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current filter values from URL
  const category = searchParams.get("category") ?? "";
  const org = searchParams.get("org") ?? "";
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const sort = searchParams.get("sort") ?? "";

  // ─── URL update helper ──────────────────────────────────────────────────────

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    // Apply updates — empty string means remove
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 whenever filters change
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  }

  // ─── Individual filter handlers ─────────────────────────────────────────────

  function handleCategory(value: string) {
    pushParams({ category: value === "all" ? "" : value });
  }

  function handleOrg(value: string) {
    pushParams({ org: value === "all" ? "" : value });
  }

  function handleStatus(value: string) {
    pushParams({ status: value === "all" ? "" : value });
  }

  function handleDateFrom(e: React.ChangeEvent<HTMLInputElement>) {
    pushParams({ dateFrom: e.target.value });
  }

  function handleDateTo(e: React.ChangeEvent<HTMLInputElement>) {
    pushParams({ dateTo: e.target.value });
  }

  function handleSort(value: string) {
    pushParams({ sort: value === "newest" ? "" : value });
  }

  // ─── Clear all ──────────────────────────────────────────────────────────────

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    ["category", "org", "status", "dateFrom", "dateTo", "sort", "page"].forEach(
      (k) => params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  }

  // ─── Active filter badges ───────────────────────────────────────────────────

  const activeFilters: { key: string; label: string; removeValue: string }[] =
    [];

  if (category) {
    activeFilters.push({
      key: "category",
      label: `Category: ${labelFor(CATEGORY_OPTIONS, category)}`,
      removeValue: "",
    });
  }
  if (org) {
    activeFilters.push({
      key: "org",
      label: `Organization: ${org}`,
      removeValue: "",
    });
  }
  if (status) {
    activeFilters.push({
      key: "status",
      label: `Status: ${labelFor(STATUS_OPTIONS, status)}`,
      removeValue: "",
    });
  }
  if (dateFrom) {
    activeFilters.push({
      key: "dateFrom",
      label: `From: ${dateFrom}`,
      removeValue: "",
    });
  }
  if (dateTo) {
    activeFilters.push({
      key: "dateTo",
      label: `To: ${dateTo}`,
      removeValue: "",
    });
  }
  if (sort && sort !== "newest") {
    activeFilters.push({
      key: "sort",
      label: `Sort: ${labelFor(SORT_OPTIONS, sort)}`,
      removeValue: "",
    });
  }

  const hasActiveFilters = activeFilters.length > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Category */}
        <Select value={category || "all"} onValueChange={handleCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Organization */}
        <Select value={org || "all"} onValueChange={handleOrg}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status || "all"} onValueChange={handleStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[150px]"
            value={dateFrom}
            onChange={handleDateFrom}
            aria-label="Start Date"
            placeholder="Start Date"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            className="w-[150px]"
            value={dateTo}
            onChange={handleDateTo}
            aria-label="End Date"
            placeholder="End Date"
          />
        </div>

        {/* Sort */}
        <Select value={sort || "newest"} onValueChange={handleSort}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-10">
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer pr-1"
            >
              {filter.label}
              <button
                onClick={() => pushParams({ [filter.key]: "" })}
                className="ml-1 rounded-full hover:bg-secondary/80 p-0.5"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
