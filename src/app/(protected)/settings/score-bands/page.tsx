import { getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import ScoreBandForm from "./score-band-form";

interface ScoreBandConfigRow {
  min_score: number;
  max_score: number;
  moves_needed: number;
}

export default async function ScoreBandConfigPage() {
  const organizationId = await getUserOrganizationId();

  let bands: ScoreBandConfigRow[] = [];

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("score_band_configs")
      .select("min_score, max_score, moves_needed")
      .eq("organization_id", organizationId)
      .order("min_score", { ascending: true });

    if (data) {
      bands = data as ScoreBandConfigRow[];
    }
  }

  return <ScoreBandForm initialBands={bands} />;
}
