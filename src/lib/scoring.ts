"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Calculates the donor's score based on the org's scoring_config,
 * then calls assignDonorTier to set the tier.
 */
export async function calculateDonorScore(
  donorId: string,
  orgId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Fetch the donor's boolean fields
  const { data: donor, error: donorError } = await supabase
    .from("donors")
    .select(
      "id, is_parent, is_grandparent, is_alumni, is_board_member, is_community_builder, is_program_attendee, is_volunteer, is_donor_advised_fund, is_foundation_trustee"
    )
    .eq("id", donorId)
    .single();

  if (donorError || !donor) {
    return;
  }

  // Fetch the org's scoring config
  const { data: config, error: configError } = await supabase
    .from("scoring_configs")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  let score = 0;

  if (!configError && config) {
    // Map each boolean field to its enabled/points config keys
    const fields: Array<{
      donorField: keyof typeof donor;
      enabledKey: keyof typeof config;
      pointsKey: keyof typeof config;
    }> = [
      {
        donorField: "is_parent",
        enabledKey: "parent_enabled",
        pointsKey: "parent_points",
      },
      {
        donorField: "is_grandparent",
        enabledKey: "grandparent_enabled",
        pointsKey: "grandparent_points",
      },
      {
        donorField: "is_alumni",
        enabledKey: "alumni_enabled",
        pointsKey: "alumni_points",
      },
      {
        donorField: "is_board_member",
        enabledKey: "board_member_enabled",
        pointsKey: "board_member_points",
      },
      {
        donorField: "is_community_builder",
        enabledKey: "community_builder_enabled",
        pointsKey: "community_builder_points",
      },
      {
        donorField: "is_program_attendee",
        enabledKey: "program_attendee_enabled",
        pointsKey: "program_attendee_points",
      },
      {
        donorField: "is_volunteer",
        enabledKey: "volunteer_enabled",
        pointsKey: "volunteer_points",
      },
      {
        donorField: "is_donor_advised_fund",
        enabledKey: "donor_advised_fund_enabled",
        pointsKey: "donor_advised_fund_points",
      },
      {
        donorField: "is_foundation_trustee",
        enabledKey: "foundation_trustee_enabled",
        pointsKey: "foundation_trustee_points",
      },
    ];

    for (const { donorField, enabledKey, pointsKey } of fields) {
      const isChecked = donor[donorField] as boolean;
      const isEnabled = config[enabledKey] as boolean;
      const points = config[pointsKey] as number;

      if (isChecked && isEnabled) {
        score += points;
      }
    }
  }

  // Update the donor's score
  await supabase
    .from("donors")
    .update({ score })
    .eq("id", donorId);

  // Now assign the tier
  await assignDonorTier(donorId, orgId);
}

/**
 * Recalculates scores and tiers for ALL donors belonging to the given org.
 * Called after a scoring config change to keep all records consistent.
 */
export async function recalculateAllDonorScores(orgId: string): Promise<void> {
  const supabase = await createServerClient();

  // Fetch the org's scoring config
  const { data: config, error: configError } = await supabase
    .from("scoring_configs")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (configError || !config) {
    return;
  }

  // Fetch all donors for the org
  const { data: donors, error: donorsError } = await supabase
    .from("donors")
    .select(
      "id, is_parent, is_grandparent, is_alumni, is_board_member, is_community_builder, is_program_attendee, is_volunteer, is_donor_advised_fund, is_foundation_trustee"
    )
    .eq("organization_id", orgId);

  if (donorsError || !donors || donors.length === 0) {
    return;
  }

  // Fetch tier configs for assignment
  const { data: tiers } = await supabase
    .from("tier_configs")
    .select("*")
    .eq("organization_id", orgId)
    .order("min_score", { ascending: true });

  const scoringFields: Array<{
    donorField: string;
    enabledKey: string;
    pointsKey: string;
  }> = [
    { donorField: "is_parent", enabledKey: "parent_enabled", pointsKey: "parent_points" },
    { donorField: "is_grandparent", enabledKey: "grandparent_enabled", pointsKey: "grandparent_points" },
    { donorField: "is_alumni", enabledKey: "alumni_enabled", pointsKey: "alumni_points" },
    { donorField: "is_board_member", enabledKey: "board_member_enabled", pointsKey: "board_member_points" },
    { donorField: "is_community_builder", enabledKey: "community_builder_enabled", pointsKey: "community_builder_points" },
    { donorField: "is_program_attendee", enabledKey: "program_attendee_enabled", pointsKey: "program_attendee_points" },
    { donorField: "is_volunteer", enabledKey: "volunteer_enabled", pointsKey: "volunteer_points" },
    { donorField: "is_donor_advised_fund", enabledKey: "donor_advised_fund_enabled", pointsKey: "donor_advised_fund_points" },
    { donorField: "is_foundation_trustee", enabledKey: "foundation_trustee_enabled", pointsKey: "foundation_trustee_points" },
  ];

  // Compute score and tier for every donor in memory, then batch-upsert
  const updates: Array<{ id: string; score: number; tier?: string }> = [];

  for (const donor of donors) {
    const donorRecord = donor as Record<string, unknown>;
    let score = 0;

    for (const { donorField, enabledKey, pointsKey } of scoringFields) {
      const isChecked = donorRecord[donorField] as boolean;
      const isEnabled = (config as Record<string, unknown>)[enabledKey] as boolean;
      const points = (config as Record<string, unknown>)[pointsKey] as number;

      if (isChecked && isEnabled) {
        score += points;
      }
    }

    // Determine tier
    let tier: string | undefined;
    if (tiers && tiers.length > 0) {
      const matchedTier = tiers.find(
        (t: { min_score: number; max_score: number; name: string }) =>
          score >= t.min_score && score <= t.max_score
      );
      if (matchedTier) {
        tier = matchedTier.name;
      }
    }

    const update: { id: string; score: number; tier?: string } = {
      id: donor.id as string,
      score,
    };
    if (tier !== undefined) {
      update.tier = tier;
    }
    updates.push(update);
  }

  // Batch-update all donors in a single upsert call
  if (updates.length > 0) {
    await supabase
      .from("donors")
      .upsert(updates, { onConflict: "id" });
  }
}

/**
 * Assigns the donor's tier based on tier_configs for the org.
 * Finds the tier where the donor's score falls within min_score/max_score range.
 */
export async function assignDonorTier(
  donorId: string,
  orgId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Fetch donor's current score
  const { data: donor, error: donorError } = await supabase
    .from("donors")
    .select("id, score")
    .eq("id", donorId)
    .single();

  if (donorError || !donor) {
    return;
  }

  // Fetch tier configs for the org
  const { data: tiers, error: tiersError } = await supabase
    .from("tier_configs")
    .select("*")
    .eq("organization_id", orgId)
    .order("min_score", { ascending: true });

  if (tiersError || !tiers || tiers.length === 0) {
    return;
  }

  const donorScore = donor.score ?? 0;

  // Find the matching tier
  const matchedTier = tiers.find(
    (t: { min_score: number; max_score: number; name: string }) =>
      donorScore >= t.min_score && donorScore <= t.max_score
  );

  if (matchedTier) {
    await supabase
      .from("donors")
      .update({ tier: matchedTier.name })
      .eq("id", donorId);
  }
}
