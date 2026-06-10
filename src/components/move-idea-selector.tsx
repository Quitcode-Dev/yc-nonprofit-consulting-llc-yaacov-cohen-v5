"use client";

/**
 * MoveIdeaSelector
 *
 * A searchable combobox that fetches move ideas from GET /api/move-ideas and
 * displays them in two grouped sections: "Global Ideas" and "Organization
 * Ideas". Uses a Popover + Command (cmdk-style) pattern built with React state
 * and Tailwind classes so no additional dependencies are required.
 *
 * Props:
 *   value          – currently selected MoveIdea (or null)
 *   onSelect       – called when the user picks an idea
 *   organizationId – the caller's org id (used for display only; the API
 *                    infers the org from the server-side session)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MoveIdea {
  id: string;
  title: string;
  category: string;
  organization_id: string | null;
}

interface GroupedMoveIdeas {
  global: MoveIdea[];
  organization: MoveIdea[];
}

interface MoveIdeaSelectorProps {
  /** Currently selected idea, or null if none. */
  value: MoveIdea | null;
  /** Called when the user selects an idea from the list. */
  onSelect: (idea: MoveIdea) => void;
  /** The caller's organisation id (used only for aria labels / future use). */
  organizationId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MoveIdeaSelector({
  value,
  onSelect,
  organizationId: _organizationId,
}: MoveIdeaSelectorProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ideas, setIdeas] = useState<GroupedMoveIdeas>({
    global: [],
    organization: [],
  });
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Fetch ideas on first open ──────────────────────────────────────────────
  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/move-ideas");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: GroupedMoveIdeas = await res.json();
      setIdeas(data);
    } catch (err) {
      setFetchError("Failed to load move ideas. Please try again.");
      console.error("MoveIdeaSelector fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when the popover opens for the first time (lazy load).
  const hasFetchedRef = useRef(false);

  const openPopover = useCallback(() => {
    setOpen(true);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchIdeas();
    }
  }, [fetchIdeas]);

  // Focus the search input when opened.
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Close on Escape key.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const lowerSearch = search.toLowerCase();

  function filterIdea(idea: MoveIdea): boolean {
    if (!lowerSearch) return true;
    return (
      idea.title.toLowerCase().includes(lowerSearch) ||
      idea.category.toLowerCase().includes(lowerSearch)
    );
  }

  const filteredGlobal = ideas.global.filter(filterIdea);
  const filteredOrg = ideas.organization.filter(filterIdea);
  const totalFiltered = filteredGlobal.length + filteredOrg.length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSelect(idea: MoveIdea) {
    onSelect(idea);
    setOpen(false);
  }

  // ── Trigger label ──────────────────────────────────────────────────────────
  const triggerLabel = value
    ? value.title
    : "Select a move idea…";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Trigger Button ─────────────────────────────────────────────────── */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Move Idea selector"
        onClick={openPopover}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        {/* Chevron icon (inline SVG — no extra dependency) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-2 shrink-0 opacity-50"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* ── Popover Panel ──────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Move idea search"
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
        >
          {/* CommandInput — search box */}
          <div className="flex items-center border-b border-border px-3">
            {/* Search icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 shrink-0 opacity-50"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              role="searchbox"
              aria-label="Search move ideas by title or category"
              placeholder="Search by title or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Command List */}
          <div
            role="listbox"
            aria-label="Move ideas"
            className="max-h-72 overflow-y-auto overflow-x-hidden"
          >
            {/* Loading state */}
            {loading && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            )}

            {/* Error state */}
            {!loading && fetchError && (
              <p className="py-6 text-center text-sm text-destructive">
                {fetchError}
              </p>
            )}

            {/* Empty state */}
            {!loading && !fetchError && totalFiltered === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {ideas.global.length === 0 && ideas.organization.length === 0
                  ? "No move ideas available. Ask your admin to create some."
                  : "No results match your search."}
              </p>
            )}

            {/* Global Ideas group — CommandGroup */}
            {!loading && !fetchError && filteredGlobal.length > 0 && (
              <div>
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Global Ideas
                </p>
                {filteredGlobal.map((idea) => (
                  <IdeaItem
                    key={idea.id}
                    idea={idea}
                    isSelected={value?.id === idea.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Organisation Ideas group — CommandGroup */}
            {!loading && !fetchError && filteredOrg.length > 0 && (
              <div>
                <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Organization Ideas
                </p>
                {filteredOrg.map((idea) => (
                  <IdeaItem
                    key={idea.id}
                    idea={idea}
                    isSelected={value?.id === idea.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IdeaItem ─────────────────────────────────────────────────────────────────

interface IdeaItemProps {
  idea: MoveIdea;
  isSelected: boolean;
  onSelect: (idea: MoveIdea) => void;
}

function IdeaItem({ idea, isSelected, onSelect }: IdeaItemProps) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(idea)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(idea);
        }
      }}
      tabIndex={0}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground font-medium"
      )}
    >
      {/* Check icon when selected */}
      <span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center">
        {isSelected && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>

      {/* Title */}
      <span className="flex-1 truncate">{idea.title}</span>

      {/* Category — muted text */}
      {idea.category && (
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
          {idea.category}
        </span>
      )}
    </div>
  );
}
