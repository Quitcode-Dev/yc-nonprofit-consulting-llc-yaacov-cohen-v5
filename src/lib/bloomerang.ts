/**
 * BloomerangService
 *
 * Handles fetching constituents and transactions from the Bloomerang v2 API
 * and syncing them into the local donors / donations tables via upsert.
 */

import { createServiceRoleClient } from "@/lib/supabase/admin";

// ─── Bloomerang API response shapes ─────────────────────────────────────────

interface BloomerangConstituent {
  Id: number;
  FirstName?: string | null;
  LastName?: string | null;
  PrimaryEmail?: { Value?: string | null } | null;
  PrimaryPhone?: { Value?: string | null } | null;
  /** ISO date string, used for incremental sync */
  LastModified?: string | null;
}

interface BloomerangTransaction {
  Id: number;
  Amount?: number | null;
  Date?: string | null;
  /** The constituent / account this transaction belongs to */
  AccountId?: number | null;
  /** ISO date string, used for incremental sync */
  LastModified?: string | null;
}

interface BloomerangListResponse<T> {
  Results: T[];
  Total: number;
}

// ─── Internal result types ───────────────────────────────────────────────────

export interface SyncResult {
  constituentsCreated: number;
  constituentsUpdated: number;
  constituentsSkipped: number;
  constituentsErrors: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  transactionsErrors: number;
}

// ─── Concurrency helper ──────────────────────────────────────────────────────

/**
 * Runs `tasks` with at most `concurrency` in-flight at a time.
 */
async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}

// ─── BloomerangService ───────────────────────────────────────────────────────

export class BloomerangService {
  private static readonly BASE_URL = "https://api.bloomerang.co/v2";
  private static readonly PAGE_SIZE = 50;
  private static readonly CONCURRENCY = 3;

  // ── Low-level fetch helpers ──────────────────────────────────────────────

  /**
   * Fetches a single page of constituents.
   * @param apiKey  Bloomerang API key (plaintext)
   * @param skip    Number of records to skip (offset)
   * @param take    Number of records to take (page size)
   * @param lastModifiedSince  Optional ISO date to filter by lastModified
   */
  async fetchConstituents(
    apiKey: string,
    skip: number,
    take: number,
    lastModifiedSince?: string
  ): Promise<BloomerangListResponse<BloomerangConstituent>> {
    const url = new URL(`${BloomerangService.BASE_URL}/constituents`);
    url.searchParams.set("take", String(take));
    url.searchParams.set("skip", String(skip));
    if (lastModifiedSince) {
      url.searchParams.set("lastModified", lastModifiedSince);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bloomerang constituents fetch failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<BloomerangListResponse<BloomerangConstituent>>;
  }

  /**
   * Fetches a single page of donation transactions.
   * @param apiKey  Bloomerang API key (plaintext)
   * @param skip    Number of records to skip (offset)
   * @param take    Number of records to take (page size)
   * @param lastModifiedSince  Optional ISO date to filter by lastModified
   */
  async fetchTransactions(
    apiKey: string,
    skip: number,
    take: number,
    lastModifiedSince?: string
  ): Promise<BloomerangListResponse<BloomerangTransaction>> {
    const url = new URL(`${BloomerangService.BASE_URL}/transactions`);
    url.searchParams.set("take", String(take));
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("type", "Donation");
    if (lastModifiedSince) {
      url.searchParams.set("lastModified", lastModifiedSince);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bloomerang transactions fetch failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<BloomerangListResponse<BloomerangTransaction>>;
  }

  // ── Full sync ────────────────────────────────────────────────────────────

  /**
   * Full sync: imports all constituents and transactions for the given org.
   * Upserts into donors and donations tables using bloomerang_id as the
   * conflict key. Creates an import_log record with counts.
   *
   * @param orgId   Organization UUID
   * @returns       SyncResult with created/updated/skipped/error counts
   */
  async syncAll(orgId: string): Promise<SyncResult> {
    const supabase = createServiceRoleClient();

    // ── Retrieve the API key ─────────────────────────────────────────────
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("bloomerang_api_key_encrypted")
      .eq("organization_id", orgId)
      .single();

    if (intError || !integration?.bloomerang_api_key_encrypted) {
      throw new Error("No Bloomerang API key found for organization.");
    }

    // The caller (route handler) decrypts the key before calling syncAll,
    // but to keep the service self-contained we accept the encrypted form
    // and decrypt here.
    const { decrypt } = await import("@/lib/encryption");
    const apiKey = decrypt(integration.bloomerang_api_key_encrypted as string);

    return this._doSync(orgId, apiKey);
  }

  /**
   * Incremental re-sync since a given date.
   * If the Bloomerang API supports lastModified filtering it will be applied;
   * otherwise falls back to a full upsert sync (safe due to ON CONFLICT).
   *
   * @param orgId         Organization UUID
   * @param lastSyncDate  ISO date string — records modified after this are fetched
   */
  async reSyncSince(orgId: string, lastSyncDate: string): Promise<SyncResult> {
    const supabase = createServiceRoleClient();

    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("bloomerang_api_key_encrypted")
      .eq("organization_id", orgId)
      .single();

    if (intError || !integration?.bloomerang_api_key_encrypted) {
      throw new Error("No Bloomerang API key found for organization.");
    }

    const { decrypt } = await import("@/lib/encryption");
    const apiKey = decrypt(integration.bloomerang_api_key_encrypted as string);

    return this._doSync(orgId, apiKey, lastSyncDate);
  }

  // ── Internal sync implementation ─────────────────────────────────────────

  private async _doSync(
    orgId: string,
    apiKey: string,
    lastModifiedSince?: string
  ): Promise<SyncResult> {
    const supabase = createServiceRoleClient();

    const result: SyncResult = {
      constituentsCreated: 0,
      constituentsUpdated: 0,
      constituentsSkipped: 0,
      constituentsErrors: 0,
      transactionsCreated: 0,
      transactionsUpdated: 0,
      transactionsSkipped: 0,
      transactionsErrors: 0,
    };

    // ── 1. Sync constituents → donors ────────────────────────────────────

    const allConstituents = await this._fetchAllPages<BloomerangConstituent>(
      (skip, take) => this.fetchConstituents(apiKey, skip, take, lastModifiedSince)
    );

    // Build upsert batches (page size 50) processed with concurrency limit 3
    const constituentBatches = this._chunk(allConstituents, BloomerangService.PAGE_SIZE);

    const constituentTasks = constituentBatches.map((batch) => async () => {
      for (const c of batch) {
        const firstName = c.FirstName?.trim() ?? null;
        const lastName = c.LastName?.trim() ?? null;

        // Skip records missing both first_name and last_name
        if (!firstName && !lastName) {
          result.constituentsSkipped++;
          continue;
        }

        const bloomerangId = String(c.Id);
        const email = c.PrimaryEmail?.Value?.trim() || null;
        const phone = c.PrimaryPhone?.Value?.trim() || null;

        try {
          // Check whether the donor already exists (for created vs updated count)
          const { data: existing } = await supabase
            .from("donors")
            .select("id")
            .eq("organization_id", orgId)
            .eq("bloomerang_id", bloomerangId)
            .maybeSingle();

          const donorRow = {
            organization_id: orgId,
            bloomerang_id: bloomerangId,
            first_name: firstName ?? "",
            last_name: lastName ?? "",
            email,
            phone,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertError } = await supabase
            .from("donors")
            .upsert(donorRow, { onConflict: "organization_id,bloomerang_id" });

          if (upsertError) {
            console.error("Donor upsert error:", upsertError);
            result.constituentsErrors++;
          } else if (existing) {
            result.constituentsUpdated++;
          } else {
            result.constituentsCreated++;
          }
        } catch (err) {
          console.error("Donor upsert exception:", err);
          result.constituentsErrors++;
        }
      }
    });

    await pLimit(constituentTasks, BloomerangService.CONCURRENCY);

    // ── 2. Sync transactions → donations ────────────────────────────────

    const allTransactions = await this._fetchAllPages<BloomerangTransaction>(
      (skip, take) => this.fetchTransactions(apiKey, skip, take, lastModifiedSince)
    );

    const transactionBatches = this._chunk(allTransactions, BloomerangService.PAGE_SIZE);

    const transactionTasks = transactionBatches.map((batch) => async () => {
      for (const t of batch) {
        if (!t.AccountId) {
          result.transactionsSkipped++;
          continue;
        }

        const bloomerangId = String(t.Id);
        const bloomerangAccountId = String(t.AccountId);

        try {
          // Look up the donor by bloomerang_id
          const { data: donor } = await supabase
            .from("donors")
            .select("id")
            .eq("organization_id", orgId)
            .eq("bloomerang_id", bloomerangAccountId)
            .maybeSingle();

          if (!donor) {
            // Donor not yet synced — skip this transaction
            result.transactionsSkipped++;
            continue;
          }

          // Check if the donation already exists
          const { data: existingDonation } = await supabase
            .from("donations")
            .select("id")
            .eq("organization_id", orgId)
            .eq("bloomerang_id", bloomerangId)
            .maybeSingle();

          const donationRow = {
            donor_id: donor.id,
            organization_id: orgId,
            bloomerang_id: bloomerangId,
            amount: t.Amount ?? null,
            date: t.Date ? t.Date.split("T")[0] : null,
            source: "bloomerang",
          };

          const { error: upsertError } = await supabase
            .from("donations")
            .upsert(donationRow, { onConflict: "organization_id,bloomerang_id" });

          if (upsertError) {
            console.error("Donation upsert error:", upsertError);
            result.transactionsErrors++;
          } else if (existingDonation) {
            result.transactionsUpdated++;
          } else {
            result.transactionsCreated++;
          }
        } catch (err) {
          console.error("Donation upsert exception:", err);
          result.transactionsErrors++;
        }
      }
    });

    await pLimit(transactionTasks, BloomerangService.CONCURRENCY);

    // ── 3. Write import_log record ───────────────────────────────────────

    const totalSynced =
      result.constituentsCreated +
      result.constituentsUpdated +
      result.transactionsCreated +
      result.transactionsUpdated;

    await supabase.from("import_logs").insert({
      organization_id: orgId,
      import_type: "bloomerang",
      records_created:
        result.constituentsCreated + result.transactionsCreated,
      records_updated:
        result.constituentsUpdated + result.transactionsUpdated,
      records_skipped:
        result.constituentsSkipped + result.transactionsSkipped,
      errors: {
        constituentsErrors: result.constituentsErrors,
        transactionsErrors: result.transactionsErrors,
      },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    // ── 4. Update integrations record with sync timestamp ────────────────

    await supabase
      .from("integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        synced_record_count: totalSynced,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId);

    return result;
  }

  // ── Pagination helper ────────────────────────────────────────────────────

  /**
   * Paginates through all pages of a Bloomerang list endpoint using the
   * provided fetch function.
   */
  private async _fetchAllPages<T>(
    fetcher: (skip: number, take: number) => Promise<BloomerangListResponse<T>>
  ): Promise<T[]> {
    const all: T[] = [];
    let skip = 0;
    const take = BloomerangService.PAGE_SIZE;

    // Fetch the first page to learn the total count
    const firstPage = await fetcher(skip, take);
    all.push(...firstPage.Results);

    const total = firstPage.Total;
    skip += take;

    if (skip >= total) {
      return all;
    }

    // Build tasks for the remaining pages
    const remainingTasks: Array<() => Promise<void>> = [];
    while (skip < total) {
      const currentSkip = skip;
      remainingTasks.push(async () => {
        const page = await fetcher(currentSkip, take);
        all.push(...page.Results);
      });
      skip += take;
    }

    await pLimit(remainingTasks, BloomerangService.CONCURRENCY);
    return all;
  }

  // ── Array chunk helper ───────────────────────────────────────────────────

  private _chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
