"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { completeMove, type CompleteMoveState } from "../actions";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MoveIdeaOption {
  id: string;
  title: string;
  category: string;
  /** null = global library idea */
  organizationId: string | null;
}

interface CompleteMoveFlowProps {
  moveId: string;
  moveTitle: string;
  donorName: string;
  solicitorName: string;
  moveIdeas: MoveIdeaOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD string (local time). */
function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompleteMoveFlow({
  moveId,
  moveTitle,
  donorName,
  solicitorName,
  moveIdeas,
}: CompleteMoveFlowProps) {
  // Step 1: Notes
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);

  // Step 2: Follow-up
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [ideaSearch, setIdeaSearch] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState(todayString());

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<CompleteMoveState["errors"]>({});

  const todayStr = todayString();

  // Filtered move ideas
  const filteredIdeas = moveIdeas.filter((i) =>
    i.title.toLowerCase().includes(ideaSearch.toLowerCase())
  );
  const globalIdeas = filteredIdeas.filter((i) => i.organizationId === null);
  const orgIdeas = filteredIdeas.filter((i) => i.organizationId !== null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation for notes
    if (!notes.trim()) {
      setNotesError("Completion notes are required.");
      return;
    }
    setNotesError(null);
    setFormErrors({});
    setSubmitting(true);

    const followUpData =
      createFollowUp && selectedIdeaId
        ? { moveIdeaId: selectedIdeaId, dueDate: followUpDueDate }
        : undefined;

    // completeMove is a server action. On success it calls redirect() which
    // throws a special Next.js error — we must NOT catch that. On validation
    // failure it returns CompleteMoveState with errors.
    const result = await completeMove(moveId, notes, followUpData);

    // If we reach here, redirect was NOT called — there are validation errors
    if (result && Object.keys(result.errors).length > 0) {
      setFormErrors(result.errors);
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <a
          href="/moves"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Moves
        </a>
        <h1 className="text-2xl font-bold mt-3">Complete Move</h1>
        <p className="text-sm text-muted-foreground mt-1">{moveTitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General error */}
        {formErrors.general && (
          <p className="text-sm text-destructive" role="alert">
            {formErrors.general}
          </p>
        )}

        {/* ── Step 1: Completion Notes ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Completion Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="notes">
                What happened during this move?{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Describe what happened during this move…"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (e.target.value.trim()) setNotesError(null);
                }}
                rows={5}
                aria-required="true"
                aria-describedby={
                  notesError || formErrors.notes ? "notes-error" : undefined
                }
                aria-invalid={!!(notesError || formErrors.notes)}
                className="resize-y"
              />
              {(notesError || formErrors.notes) && (
                <p
                  id="notes-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {notesError ?? formErrors.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Step 2: Follow-Up ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Follow-Up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="createFollowUp"
                checked={createFollowUp}
                onCheckedChange={setCreateFollowUp}
              />
              <Label htmlFor="createFollowUp" className="cursor-pointer">
                Create a follow-up move?
              </Label>
            </div>

            {/* Follow-up inline form */}
            {createFollowUp && (
              <div className="space-y-4 pt-2 border-t">
                {/* Pre-populated read-only donor & solicitor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                      Donor
                    </p>
                    <p className="text-sm font-medium">{donorName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                      Solicitor
                    </p>
                    <p className="text-sm">{solicitorName}</p>
                  </div>
                </div>

                {/* Move Idea Selector */}
                <div className="space-y-2">
                  <Label htmlFor="ideaSearch">
                    Move Idea <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ideaSearch"
                    type="search"
                    placeholder="Search move ideas…"
                    value={ideaSearch}
                    onChange={(e) => setIdeaSearch(e.target.value)}
                    autoComplete="off"
                  />

                  <div
                    className="border rounded-md max-h-48 overflow-y-auto"
                    role="listbox"
                    aria-label="Move Ideas"
                  >
                    {filteredIdeas.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3">
                        No move ideas found.
                      </p>
                    ) : (
                      <>
                        {globalIdeas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1.5 bg-muted/50 sticky top-0">
                              Global Library
                            </p>
                            {globalIdeas.map((idea) => {
                              const isSelected = idea.id === selectedIdeaId;
                              return (
                                <button
                                  key={idea.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() =>
                                    setSelectedIdeaId(
                                      isSelected ? "" : idea.id
                                    )
                                  }
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                                    isSelected
                                      ? "bg-accent text-accent-foreground font-medium"
                                      : ""
                                  }`}
                                >
                                  <span>{idea.title}</span>
                                  {idea.category && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {idea.category}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {orgIdeas.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1.5 bg-muted/50 sticky top-0">
                              Your Organization
                            </p>
                            {orgIdeas.map((idea) => {
                              const isSelected = idea.id === selectedIdeaId;
                              return (
                                <button
                                  key={idea.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() =>
                                    setSelectedIdeaId(
                                      isSelected ? "" : idea.id
                                    )
                                  }
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                                    isSelected
                                      ? "bg-accent text-accent-foreground font-medium"
                                      : ""
                                  }`}
                                >
                                  <span>{idea.title}</span>
                                  {idea.category && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {idea.category}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Selected idea display */}
                  {selectedIdeaId && (
                    <p className="text-sm text-muted-foreground">
                      Selected:{" "}
                      <span className="text-foreground font-medium">
                        {moveIdeas.find((i) => i.id === selectedIdeaId)
                          ?.title ?? selectedIdeaId}
                      </span>
                    </p>
                  )}

                  {formErrors.followUpMoveIdeaId && (
                    <p className="text-sm text-destructive" role="alert">
                      {formErrors.followUpMoveIdeaId}
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="followUpDueDate">
                    Due Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="followUpDueDate"
                    type="date"
                    min={todayStr}
                    value={followUpDueDate}
                    onChange={(e) => setFollowUpDueDate(e.target.value)}
                    aria-required="true"
                    aria-describedby={
                      formErrors.followUpDueDate
                        ? "followUpDueDate-error"
                        : undefined
                    }
                    aria-invalid={!!formErrors.followUpDueDate}
                  />
                  {formErrors.followUpDueDate && (
                    <p
                      id="followUpDueDate-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {formErrors.followUpDueDate}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Saving…"
              : createFollowUp
              ? "Complete & Create Follow-Up"
              : "Complete Move"}
          </Button>
          <a
            href={`/moves/${moveId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
