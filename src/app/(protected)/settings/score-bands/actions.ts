"use server";

import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export type ScoreBandInput = {
  min_score: number;
  max_score: number;
  moves_needed: number;
};

export type UpdateScoreBandConfigsState = {
  errors: {
    general?: string;
    validation?: string;
  };
  success?: boolean;
};

export async function updateScoreBandConfigs(
  bands: ScoreBandInput[]
): Promise<UpdateScoreBandConfigsState> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  // Validate: all values must be positive integers
  for (const band of bands) {
    if (
      !Number.isInteger(band.min_score) ||
      band.min_score < 1 ||
      !Number.isInteger(band.max_score) ||
      band.max_score < 1 ||
      !Number.isInteger(band.moves_needed) ||
      band.moves_needed < 1
    ) {
      return {
        errors: {
          validation:
            "All values (min score, max score, moves needed) must be positive integers.",
        },
      };
    }
  }

  const supabase = await createServerClient();

  // Delete existing score band configs for the org
  const { error: deleteError } = await supabase
    .from("score_band_configs")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteError) {
    return {
      errors: {
        general: "Failed to update score band configuration. Please try again.",
      },
    };
  }

  // Insert new score band configs (only if there are bands to insert)
  if (bands.length > 0) {
    const rows = bands.map((band) => ({
      organization_id: organizationId,
      min_score: band.min_score,
      max_score: band.max_score,
      moves_needed: band.moves_needed,
    }));

    const { error: insertError } = await supabase
      .from("score_band_configs")
      .insert(rows);

    if (insertError) {
      return {
        errors: {
          general:
            "Failed to save score band configuration. Please try again.",
        },
      };
    }
  }

  return {
    errors: {},
    success: true,
  };
}
