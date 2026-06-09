"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { saveBloomerangApiKey } from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncResult {
  constituentsCreated: number;
  constituentsUpdated: number;
  constituentsSkipped: number;
  constituentsErrors: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  transactionsErrors: number;
}

interface BloomerangFormProps {
  /** Masked representation of the saved key, e.g. '••••••••••abc123', or null if no key saved */
  maskedKey: string | null;
  /** Current connection status from the database */
  status: "connected" | "not_connected" | "failed";
  /** ISO timestamp of the last successful sync, or null if never synced */
  lastSyncedAt: string | null;
  /** Total records synced in the last run, or null if never synced */
  syncedRecordCount: number | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BloomerangForm({
  maskedKey,
  status: initialStatus,
  lastSyncedAt: initialLastSyncedAt,
  syncedRecordCount: initialSyncedRecordCount,
}: BloomerangFormProps) {
  const [isEditing, setIsEditing] = useState(maskedKey === null);
  const [inputValue, setInputValue] = useState("");
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialLastSyncedAt
  );
  const [syncedRecordCount, setSyncedRecordCount] = useState<number | null>(
    initialSyncedRecordCount
  );

  const isConnected = currentStatus === "connected";

  // ── API key handlers ────────────────────────────────────────────────────

  function handleChangeKey() {
    setIsEditing(true);
    setInputValue("");
    setErrorMessage(null);
  }

  function handleCancel() {
    setIsEditing(false);
    setInputValue("");
    setErrorMessage(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setErrorMessage(null);
    setSuccessVisible(false);

    startTransition(async () => {
      const result = await saveBloomerangApiKey(inputValue);

      if (result.success) {
        setCurrentStatus("connected");
        setIsEditing(false);
        setInputValue("");
        setSuccessVisible(true);
        setTimeout(() => setSuccessVisible(false), 4000);
      } else {
        setErrorMessage(result.error);
        if (result.error.includes("Invalid API key")) {
          setCurrentStatus("failed");
        }
      }
    });
  }

  // ── Sync handler ────────────────────────────────────────────────────────

  async function handleSyncNow() {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/sync/bloomerang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setSyncError(json.error ?? "Sync failed. Please try again.");
      } else {
        const result: SyncResult = json.result;
        setSyncResult(result);

        // Update sync status locally so the user sees results immediately
        const now = new Date().toISOString();
        setLastSyncedAt(now);
        const totalSynced =
          result.constituentsCreated +
          result.constituentsUpdated +
          result.transactionsCreated +
          result.transactionsUpdated;
        setSyncedRecordCount(totalSynced);
      }
    } catch {
      setSyncError("Network error — please check your connection and try again.");
    } finally {
      setIsSyncing(false);
    }
  }

  // ── Timestamp formatter ─────────────────────────────────────────────────

  function formatTimestamp(iso: string): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Success toast — API key saved */}
      {successVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background px-4 py-3 shadow-lg text-sm font-medium"
        >
          <span className="text-green-600">✓</span>
          Bloomerang API key saved successfully
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect external services to sync donor data with your organization.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── Bloomerang Section ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Bloomerang</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sync your Bloomerang constituents and donations.
                </p>
              </div>
              <ConnectionStatusBadge status={currentStatus} />
            </div>

            <Separator />

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* API Key input */}
              <div className="space-y-2">
                <Label htmlFor="bloomerang-api-key">Bloomerang API Key</Label>

                {isEditing ? (
                  <Input
                    id="bloomerang-api-key"
                    type="password"
                    autoComplete="off"
                    placeholder="Enter your Bloomerang API key"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    aria-describedby={
                      errorMessage ? "api-key-error" : undefined
                    }
                    aria-invalid={!!errorMessage}
                    disabled={isPending}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="bloomerang-api-key"
                      type="password"
                      value={maskedKey ?? ""}
                      readOnly
                      disabled
                      className="font-mono"
                      aria-label="Saved Bloomerang API key (masked)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChangeKey}
                      className="shrink-0"
                    >
                      Change Key
                    </Button>
                  </div>
                )}

                {errorMessage && (
                  <p
                    id="api-key-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Action buttons — only shown while editing */}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isPending}
                  >
                    {isPending ? "Saving…" : "Save & Validate"}
                  </Button>
                  {maskedKey !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* ── Sync Section — only shown when connected ───────────────────── */}
          {isConnected && (
            <div className="space-y-4">
              <Separator />

              {/* Sync status display */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Sync Status</h3>
                <p className="text-xs text-muted-foreground">
                  {lastSyncedAt
                    ? `Last synced: ${formatTimestamp(lastSyncedAt)}`
                    : "Never synced"}
                </p>
                {syncedRecordCount !== null && (
                  <p className="text-xs text-muted-foreground">
                    Records synced:{" "}
                    <span className="font-medium text-foreground">
                      {syncedRecordCount.toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              {/* Sync Now button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing}
                aria-busy={isSyncing}
                className="flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <Spinner />
                    Syncing…
                  </>
                ) : (
                  "Sync Now"
                )}
              </Button>

              {/* Sync error */}
              {syncError && (
                <p role="alert" className="text-sm text-destructive">
                  {syncError}
                </p>
              )}

              {/* Sync results summary */}
              {syncResult && !syncError && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-md border bg-muted/40 p-4 text-sm space-y-2"
                >
                  <p className="font-semibold">Sync complete</p>

                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground mt-2">
                      Constituents
                    </p>
                    <p>
                      Created:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.constituentsCreated.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Updated:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.constituentsUpdated.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Skipped:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.constituentsSkipped.toLocaleString()}
                      </span>
                    </p>
                    {syncResult.constituentsErrors > 0 && (
                      <p className="text-destructive">
                        Errors: {syncResult.constituentsErrors.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium text-foreground mt-2">
                      Donations
                    </p>
                    <p>
                      Created:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.transactionsCreated.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Updated:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.transactionsUpdated.toLocaleString()}
                      </span>
                    </p>
                    <p>
                      Skipped:{" "}
                      <span className="font-medium text-foreground">
                        {syncResult.transactionsSkipped.toLocaleString()}
                      </span>
                    </p>
                    {syncResult.transactionsErrors > 0 && (
                      <p className="text-destructive">
                        Errors: {syncResult.transactionsErrors.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function ConnectionStatusBadge({
  status,
}: {
  status: "connected" | "not_connected" | "failed";
}) {
  if (status === "connected") {
    return (
      <Badge variant="outline" className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full bg-green-500 shrink-0"
          aria-hidden="true"
        />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full bg-red-500 shrink-0"
        aria-hidden="true"
      />
      Not connected
    </Badge>
  );
}

/** Inline SVG spinner for the Syncing… button state */
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
