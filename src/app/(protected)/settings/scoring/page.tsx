import { getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import ScoringForm from "./scoring-form";

const FIELD_DEFINITIONS = [
  { key: "parent", label: "Parent" },
  { key: "grandparent", label: "Grandparent" },
  { key: "alumni", label: "Alumni" },
  { key: "board_member", label: "Board Member" },
  { key: "community_builder", label: "Community Builder" },
  { key: "program_attendee", label: "Program Attendee" },
  { key: "volunteer", label: "Volunteer" },
  { key: "donor_advised_fund", label: "Donor Advised Fund" },
  { key: "foundation_trustee", label: "Foundation Trustee" },
] as const;

export default async function ScoringConfigPage() {

  const organizationId = await getUserOrganizationId();

  let scoringConfig: Record<string, unknown> | null = null;

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("scoring_configs")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    scoringConfig = data ?? null;
  }

  // Build initial field values from the config (or default to enabled=true, points=0)
  const initialFields = FIELD_DEFINITIONS.map(({ key, label }) => ({
    key,
    label,
    enabled:
      scoringConfig !== null
        ? (scoringConfig[`${key}_enabled`] as boolean) ?? true
        : true,
    points:
      scoringConfig !== null
        ? (scoringConfig[`${key}_points`] as number) ?? 0
        : 0,
  }));

  return <ScoringForm initialFields={initialFields} />;
}
