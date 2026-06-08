import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OrgProfileForm from "./org-profile-form";
import ScoringConfigPage from "./scoring/page";
import TierConfigPage from "./tiers/page";
import ScoreBandConfigPage from "./score-bands/page";

interface OrganizationRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
}

export default async function OrgSettingsPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let organization: OrganizationRow | null = null;

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("organizations")
      .select("id, name, contact_name, contact_email")
      .eq("id", organizationId)
      .single();

    organization = (data as OrganizationRow) ?? null;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization profile and configuration.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="score-bands">Score Bands</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="mt-4">
            <OrgProfileForm
              initialName={organization?.name ?? ""}
              initialContactName={organization?.contact_name ?? null}
              initialContactEmail={organization?.contact_email ?? null}
            />
          </div>
        </TabsContent>

        <TabsContent value="scoring">
          <div className="mt-4">
            <ScoringConfigPage />
          </div>
        </TabsContent>

        <TabsContent value="tiers">
          <div className="mt-4">
            <TierConfigPage />
          </div>
        </TabsContent>

        <TabsContent value="score-bands">
          <div className="mt-4">
            <ScoreBandConfigPage />
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="mt-4 text-sm text-muted-foreground">
            Integrations configuration coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
