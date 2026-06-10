"use client";

import React, { useActionState, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoveIdeaSelector, type MoveIdea } from "@/components/move-idea-selector";
import { createMove, type CreateMoveState } from "../actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DonorOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MoveIdeaOption {
  id: string;
  title: string;
  category: string;
  /** null = global library idea */
  organizationId: string | null;
}

interface MoveFormProps {
  donors: DonorOption[];
  moveIdeas: MoveIdeaOption[];
  /** Pre-selected donor ID from query param */
  preselectedDonorId?: string;
  /** The current user's organisation id, passed to the selector */
  organizationId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const initialState: CreateMoveState = {
  errors: {},
};

/** Returns today's date as YYYY-MM-DD string (local time). */
function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MoveForm({
  donors,
  moveIdeas: _moveIdeas,
  preselectedDonorId,
  organizationId,
}: MoveFormProps) {
  const [state, formAction, isPending] = useActionState(
    createMove,
    initialState
  );

  // Controlled state for donor and move idea to handle auto-populate
  const [selectedDonorId, setSelectedDonorId] = useState<string>(
    preselectedDonorId ?? ""
  );
  const [selectedIdea, setSelectedIdea] = useState<MoveIdea | null>(null);
  const [title, setTitle] = useState<string>("");

  // Donor search filter
  const [donorSearch, setDonorSearch] = useState<string>("");

  // Auto-populate title when a move idea is selected
  useEffect(() => {
    if (selectedIdea) {
      setTitle(selectedIdea.title);
    }
  }, [selectedIdea]);

  // Handler for MoveIdeaSelector — preserves other form state
  function handleIdeaSelect(idea: MoveIdea) {
    setSelectedIdea(idea);
  }

  // Filtered donors
  const filteredDonors = donors.filter((d) => {
    const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
    return fullName.includes(donorSearch.toLowerCase());
  });

  const todayStr = todayString();

  return (
    <form action={formAction} className="space-y-6">
      {/* General error */}
      {state.errors.general && (
        <p className="text-sm text-destructive" role="alert">
          {state.errors.general}
        </p>
      )}

      {/* ── Donor Picker ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Donor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Hidden field for form submission */}
          <input type="hidden" name="donorId" value={selectedDonorId} />

          {/* Search box */}
          <div className="space-y-2">
            <Label htmlFor="donorSearch">Search Donors</Label>
            <Input
              id="donorSearch"
              type="search"
              placeholder="Type to search donors…"
              value={donorSearch}
              onChange={(e) => setDonorSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Donor list */}
          <div
            className="border rounded-md max-h-48 overflow-y-auto"
            role="listbox"
            aria-label="Donors"
          >
            {filteredDonors.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                No donors found.
              </p>
            ) : (
              filteredDonors.map((donor) => {
                const isSelected = donor.id === selectedDonorId;
                const fullName = `${donor.firstName} ${donor.lastName}`;
                return (
                  <button
                    key={donor.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() =>
                      setSelectedDonorId(isSelected ? "" : donor.id)
                    }
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isSelected
                        ? "bg-accent text-accent-foreground font-medium"
                        : ""
                    }`}
                  >
                    {fullName}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected donor display */}
          {selectedDonorId && (
            <p className="text-sm text-muted-foreground">
              Selected:{" "}
              <span className="text-foreground font-medium">
                {(() => {
                  const d = donors.find((d) => d.id === selectedDonorId);
                  return d ? `${d.firstName} ${d.lastName}` : selectedDonorId;
                })()}
              </span>
            </p>
          )}

          {state.errors.donorId && (
            <p className="text-sm text-destructive" role="alert">
              {state.errors.donorId}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Move Idea Selector ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Move Idea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Hidden field for form submission */}
          <input
            type="hidden"
            name="moveIdeaId"
            value={selectedIdea?.id ?? ""}
          />

          <div className="space-y-2">
            <Label htmlFor="moveIdeaSelector">Select Move Idea</Label>
            <MoveIdeaSelector
              value={selectedIdea}
              onSelect={handleIdeaSelect}
              organizationId={organizationId}
            />
          </div>

          {state.errors.moveIdeaId && (
            <p className="text-sm text-destructive" role="alert">
              {state.errors.moveIdeaId}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Title (auto-populated, editable) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Move Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Enter a title for this move"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-describedby={
                state.errors.title ? "title-error" : undefined
              }
              aria-invalid={!!state.errors.title}
              aria-required="true"
            />
            {state.errors.title && (
              <p id="title-error" className="text-sm text-destructive" role="alert">
                {state.errors.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Auto-populated from the selected Move Idea. You can edit it.
            </p>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              min={todayStr}
              defaultValue={todayStr}
              aria-describedby={
                state.errors.dueDate ? "dueDate-error" : undefined
              }
              aria-invalid={!!state.errors.dueDate}
              aria-required="true"
            />
            {state.errors.dueDate && (
              <p
                id="dueDate-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {state.errors.dueDate}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create Move"}
        </Button>
        <a
          href="/moves"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
