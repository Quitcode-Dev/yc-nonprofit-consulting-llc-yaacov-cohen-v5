"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateScoreBandConfigs } from "./actions";

export interface ScoreBandRow {
  id: string; // client-side key only
  min_score: number | string;
  max_score: number | string;
  moves_needed: number | string;
}

interface ScoreBandFormProps {
  initialBands: Array<{
    min_score: number;
    max_score: number;
    moves_needed: number;
  }>;
}

let nextId = 0;
function genId() {
  return `band-${++nextId}`;
}

function buildRows(
  bands: Array<{ min_score: number; max_score: number; moves_needed: number }>
): ScoreBandRow[] {
  return bands.map((b) => ({
    id: genId(),
    min_score: b.min_score,
    max_score: b.max_score,
    moves_needed: b.moves_needed,
  }));
}

export default function ScoreBandForm({ initialBands }: ScoreBandFormProps) {
  const [rows, setRows] = useState<ScoreBandRow[]>(() =>
    buildRows(initialBands)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hide success toast after 5 seconds
  useEffect(() => {
    if (!successVisible) return;
    const timer = setTimeout(() => setSuccessVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [successVisible]);

  function handleAddBand() {
    setRows((prev) => [
      ...prev,
      { id: genId(), min_score: "", max_score: "", moves_needed: "" },
    ]);
  }

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleChange(
    id: string,
    field: keyof Omit<ScoreBandRow, "id">,
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    // Clear errors on any change
    setValidationError(null);
    setGeneralError(null);
  }

  function handleSave() {
    setValidationError(null);
    setGeneralError(null);

    // Parse and validate all rows — all values must be positive integers
    const parsed = rows.map((r) => ({
      min_score: Number(r.min_score),
      max_score: Number(r.max_score),
      moves_needed: Number(r.moves_needed),
    }));

    const allValid = parsed.every(
      (b) =>
        Number.isInteger(b.min_score) &&
        b.min_score >= 1 &&
        Number.isInteger(b.max_score) &&
        b.max_score >= 1 &&
        Number.isInteger(b.moves_needed) &&
        b.moves_needed >= 1
    );

    if (!allValid) {
      setValidationError(
        "All values (min score, max score, moves needed) must be positive integers."
      );
      return;
    }

    startTransition(async () => {
      const result = await updateScoreBandConfigs(parsed);
      if (result.errors.validation) {
        setValidationError(result.errors.validation);
      } else if (result.errors.general) {
        setGeneralError(result.errors.general);
      } else if (result.success) {
        setSuccessVisible(true);
      }
    });
  }

  return (
    <>
      {/* Success toast */}
      {successVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className="text-green-600">✓</span>
          Score band configuration saved.
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Score Band Configuration</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Define score bands with the number of moves needed for each range.
            All values must be positive integers.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Error messages */}
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            {generalError && (
              <p className="text-sm text-destructive">{generalError}</p>
            )}

            {/* Column headers */}
            {rows.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs font-medium text-muted-foreground w-28">
                  Min Score
                </span>
                <span className="text-xs font-medium text-muted-foreground w-28">
                  Max Score
                </span>
                <span className="text-xs font-medium text-muted-foreground w-28">
                  Moves Needed
                </span>
                {/* spacer for delete button */}
                <span className="w-9" />
              </div>
            )}

            {/* Score band rows */}
            <div className="space-y-3">
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No score bands configured. Click &ldquo;Add Score Band&rdquo;
                  to get started.
                </p>
              )}
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-3">
                  {/* Min Score */}
                  <Input
                    type="number"
                    placeholder="Min score"
                    value={row.min_score}
                    min={1}
                    step={1}
                    onChange={(e) =>
                      handleChange(row.id, "min_score", e.target.value)
                    }
                    aria-label="Minimum score"
                    className="w-28"
                  />
                  {/* Max Score */}
                  <Input
                    type="number"
                    placeholder="Max score"
                    value={row.max_score}
                    min={1}
                    step={1}
                    onChange={(e) =>
                      handleChange(row.id, "max_score", e.target.value)
                    }
                    aria-label="Maximum score"
                    className="w-28"
                  />
                  {/* Moves Needed */}
                  <Input
                    type="number"
                    placeholder="Moves needed"
                    value={row.moves_needed}
                    min={1}
                    step={1}
                    onChange={(e) =>
                      handleChange(row.id, "moves_needed", e.target.value)
                    }
                    aria-label="Moves needed"
                    className="w-28"
                  />
                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(row.id)}
                    aria-label="Delete score band"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBand}
                disabled={isPending}
              >
                Add Score Band
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save Score Bands"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
