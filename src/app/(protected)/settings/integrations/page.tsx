import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import BloomerangForm from "./bloomerang-form";

type BloomerangStatus = "connected" | "not_connected" | "failed";

interface IntegrationRow {
  bloomerang_api_key_encrypted: string | null;
  bloomerang_status: BloomerangStatus;
}

/**
 * Derives a masked display value from the last 6 characters of the encrypted
 * blob (which bears no relationship to the plaintext key — we just need a
 * stable, short identifier so the user can confirm a key has been saved).
 *
 * We do NOT decrypt the key here; the masked value is purely cosmetic.
 */
function maskApiKey(encryptedKey: string): string {
  // The encrypted blob is base64; take the last 6 chars as a visual hint
  const hint = encryptedKey.slice(-6);
  return `••••••••••${hint}`;
}

export default async function IntegrationsPage() {
  await requireRole(["org_admin", "super_admin"]);

  const organizationId = await getUserOrganizationId();

  let maskedKey: string | null = null;
  let status: BloomerangStatus = "not_connected";

  if (organizationId) {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("integrations")
      .select("bloomerang_api_key_encrypted, bloomerang_status")
      .eq("organization_id", organizationId)
      .single();

    if (data) {
      const row = data as IntegrationRow;
      status = row.bloomerang_status ?? "not_connected";
      if (row.bloomerang_api_key_encrypted) {
        maskedKey = maskApiKey(row.bloomerang_api_key_encrypted);
      }
    }
  }

  return (
    <BloomerangForm maskedKey={maskedKey} status={status} />
  );
}
