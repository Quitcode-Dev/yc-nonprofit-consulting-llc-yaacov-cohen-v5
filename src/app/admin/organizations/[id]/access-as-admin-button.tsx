"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AccessAsAdminButtonProps {
  organizationId: string;
}

export default function AccessAsAdminButton({
  organizationId,
}: AccessAsAdminButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccessAsAdmin() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (response.redirected) {
        router.push(new URL(response.url).pathname);
        router.refresh();
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to impersonate organization.");
        setLoading(false);
        return;
      }

      // Fallback: navigate to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleAccessAsAdmin} disabled={loading}>
        {loading ? "Accessing…" : "Access as Admin"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
