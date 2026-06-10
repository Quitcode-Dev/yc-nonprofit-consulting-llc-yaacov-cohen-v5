"use server";

import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { recalculateAllDonorScores } from "@/lib/scoring";

export type ScoringConfigField = {
  key: string;
  enabled: boolean;
  points: number;
};

export type UpdateScoringConfigState = {
  errors: {
    general?: string;
    fields?: Record<string, string>;
  };
  success?: boolean;
};

export async function updateScoringConfig(
  _prevState: UpdateScoringConfigState,
  formData: FormData
): Promise<UpdateScoringConfigState> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  const fieldKeys = [
    "parent",
    "grandparent",
    "alumni",
    "board_member",
    "community_builder",
    "program_attendee",
    "volunteer",
    "donor_advised_fund",
    "foundation_trustee",
  ];

  const fieldErrors: Record<string, string> = {};
  const updatePayload: Record<string, unknown> = {};

  for (const key of fieldKeys) {
    const enabledValue = formData.get(`${key}_enabled`);
    const enabled = enabledValue === "true" || enabledValue === "on";

    const pointsRaw = formData.get(`${key}_points`) as string | null;
    const pointsNum = pointsRaw !== null ? Number(pointsRaw) : 0;

    if (!Number.isInteger(pointsNum) || pointsNum < 0) {
      fieldErrors[key] = "Must be a non-negative integer.";
    }

    updatePayload[`${key}_enabled`] = enabled;
    updatePayload[`${key}_points`] = pointsNum;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      errors: { fields: fieldErrors },
    };
  }

  const supabase = await createServerClient();

  // Upsert scoring config
  const { error: upsertError } = await supabase
    .from("scoring_configs")
    .upsert(
      { organization_id: organizationId, ...updatePayload },
      { onConflict: "organization_id" }
    );

  if (upsertError) {
    return {
      errors: {
        general: "Failed to save scoring configuration. Please try again.",
      },
    };
  }

  // Recalculate all donor scores with the updated config
  await recalculateAllDonorScores(organizationId);

  return {
    errors: {},
    success: true,
  };
}
