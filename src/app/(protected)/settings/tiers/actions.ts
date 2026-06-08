"use server";

import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { recalculateAllDonorScores } from "@/lib/scoring";

export type TierInput = {
  name: string;
  min_score: number;
  max_score: number;
};

export type UpdateTierConfigsState = {
  errors: {
    general?: string;
    overlap?: string;
  };
  success?: boolean;
};

export async function updateTierConfigs(
  tiers: TierInput[]
): Promise<UpdateTierConfigsState> {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  if (!organizationId) {
    return {
      errors: {
        general: "No organization found for your account.",
      },
    };
  }

  // Validate: check for overlapping score ranges
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i];
      const b = tiers[j];
      // Ranges [a.min, a.max] and [b.min, b.max] overlap if a.min <= b.max && b.min <= a.max
      if (a.min_score <= b.max_score && b.min_score <= a.max_score) {
        return {
          errors: {
            overlap: "Score ranges cannot overlap",
          },
        };
      }
    }
  }

  const supabase = await createServerClient();

  // Delete existing tier configs for the org
  const { error: deleteError } = await supabase
    .from("tier_configs")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteError) {
    return {
      errors: {
        general: "Failed to update tier configuration. Please try again.",
      },
    };
  }

  // Insert new tier configs (only if there are tiers to insert)
  if (tiers.length > 0) {
    const rows = tiers.map((tier, index) => ({
      organization_id: organizationId,
      name: tier.name,
      label: tier.name,
      min_score: tier.min_score,
      max_score: tier.max_score,
      sort_order: index,
    }));

    const { error: insertError } = await supabase
      .from("tier_configs")
      .insert(rows);

    if (insertError) {
      return {
        errors: {
          general: "Failed to save tier configuration. Please try again.",
        },
      };
    }
  }

  // Recalculate all donor scores/tiers with the updated tier configs
  await recalculateAllDonorScores(organizationId);

  return {
    errors: {},
    success: true,
  };
}
