import { getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import TierForm from "./tier-form";

interface TierConfigRow {
  name: string;
  min_score: number;
  max_score: number;
}

export default async function TierConfigPage() {
  const organizationId = await getUserOrganizationId();

  let tiers: TierConfigRow[] = [];

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("tier_configs")
      .select("name, min_score, max_score")
      .eq("organization_id", organizationId)
      .order("min_score", { ascending: true });

    if (data) {
      tiers = data as TierConfigRow[];
    }
  }

  return <TierForm initialTiers={tiers} />;
}
