"use server";

import { requireRole, getUserOrganizationId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export type SaveBloomerangApiKeyResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Validates a Bloomerang API key by making a test request, then encrypts
 * and persists it to the integrations table with status='connected'.
 *
 * Returns an error result (without saving) on auth failure or network error.
 */
export async function saveBloomerangApiKey(
  apiKey: string
): Promise<SaveBloomerangApiKeyResult> {
  await requireRole(["org_admin", "super_admin"]);

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    return { success: false, error: "API key cannot be empty." };
  }

  // ── 1. Test the key against the Bloomerang API ──────────────────────────
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    response = await fetch(
      "https://api.bloomerang.co/v2/constituents?take=1",
      {
        method: "GET",
        headers: {
          "X-API-Key": trimmedKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
  } catch {
    return {
      success: false,
      error: "Connection failed — please try again later",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      success: false,
      error: "Invalid API key — please check your credentials",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: "Connection failed — please try again later",
    };
  }

  // ── 2. Encrypt and persist the key ──────────────────────────────────────
  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    return {
      success: false,
      error: "No organization found for your account.",
    };
  }

  let encryptedKey: string;
  try {
    encryptedKey = encrypt(trimmedKey);
  } catch {
    return {
      success: false,
      error: "Failed to secure the API key. Please contact support.",
    };
  }

  const supabase = await createServerClient();

  const { error: upsertError } = await supabase
    .from("integrations")
    .upsert(
      {
        organization_id: organizationId,
        bloomerang_api_key_encrypted: encryptedKey,
        bloomerang_status: "connected",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );

  if (upsertError) {
    return {
      success: false,
      error: "Failed to save integration settings. Please try again.",
    };
  }

  return { success: true };
}
