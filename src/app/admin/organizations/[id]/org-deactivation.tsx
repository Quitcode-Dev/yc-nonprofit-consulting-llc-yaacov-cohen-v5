"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deactivateOrganization, reactivateOrganization } from "./actions";

interface OrgDeactivationProps {
  organizationId: string;
  status: "active" | "inactive";
}

export function OrgDeactivation({ organizationId, status }: OrgDeactivationProps) {
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    startTransition(async () => {
      await deactivateOrganization(organizationId);
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      await reactivateOrganization(organizationId);
    });
  }

  if (status === "inactive") {
    return (
      <Button
        variant="default"
        disabled={isPending}
        onClick={handleReactivate}
      >
        {isPending ? "Reactivating…" : "Reactivate Organization"}
      </Button>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" disabled={isPending}>
          {isPending ? "Deactivating…" : "Deactivate Organization"}
        </Button>
      }
      title="Deactivate Organization"
      description="Are you sure you want to deactivate this organization? All users will lose access immediately."
      onConfirm={handleDeactivate}
      variant="destructive"
      confirmLabel="Deactivate"
    />
  );
}
