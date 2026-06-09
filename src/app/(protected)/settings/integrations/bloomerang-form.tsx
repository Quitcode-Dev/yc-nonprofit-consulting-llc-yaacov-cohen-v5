"use client";

import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { saveBloomerangApiKey } from "./actions";

interface BloomerangFormProps {
  /** Masked representation of the saved key, e.g. '••••••••••abc123', or null if no key saved */
  maskedKey: string | null;
  /** Current connection status from the database */
  status: "connected" | "not_connected" | "failed";
}

export default function BloomerangForm({
  maskedKey,
  status: initialStatus,
}: BloomerangFormProps) {
  const [isEditing, setIsEditing] = useState(maskedKey === null);
  const [inputValue, setInputValue] = useState("");
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConnected = currentStatus === "connected";

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
        // If auth failure, reflect that in status
        if (result.error.includes("Invalid API key")) {
          setCurrentStatus("failed");
        }
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
          {/* ── Bloomerang Section ───────────────────────────────────────── */}
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

          {/* ── Sync Status Section ──────────────────────────────────────── */}
          {isConnected && (
            <div className="space-y-2">
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-semibold">Sync Status</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Donor data is being synced from Bloomerang.
                  </p>
                </div>
                <ConnectionStatusBadge status={currentStatus} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Helper component ─────────────────────────────────────────────────────────

function ConnectionStatusBadge({
  status,
}: {
  status: "connected" | "not_connected" | "failed";
}) {
  if (status === "connected") {
    return (
      <Badge variant="outline" className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" aria-hidden="true" />
        Connected
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
      Not connected
    </Badge>
  );
}
