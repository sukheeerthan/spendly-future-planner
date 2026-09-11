import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import type { BankAccountRow, BankTxnRow } from "./bank-shared";

const connectSchema = z.object({ bankName: z.string().min(2).max(80) });
const idSchema = z.object({ accountId: z.string().uuid() });
const disconnectSchema = z.object({
  accountId: z.string().uuid(),
  keepTransactions: z.boolean().default(true),
});
const importSchema = z.object({
  accountId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        amount: z.number().positive(),
        direction: z.enum(["debit", "credit"]),
        description: z.string().max(200),
        postedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        category: z.string().max(40),
      }),
    )
    .min(1)
    .max(1000),
});
const manualAccountSchema = z.object({
  bankName: z.string().min(2).max(80),
  maskedNumber: z.string().min(2).max(40),
  balance: z.number(),
  currency: z.string().min(1).max(6).default("INR"),
});

type AccountRecord = {
  id: string;
  provider: string;
  bank_name: string;
  masked_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
  last_synced_at: string | null;
};

function toAccount(row: AccountRecord): BankAccountRow {
  return {
    id: row.id,
    provider: row.provider,
    bankName: row.bank_name,
    maskedNumber: row.masked_number,
    accountType: row.account_type,
    balance: Number(row.balance),
    currency: row.currency,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
  };
}

const ACCOUNT_COLUMNS =
  "id, provider, bank_name, masked_number, account_type, balance, currency, status, last_synced_at";

export const listBankData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: accounts, error: accErr }, { data: txns, error: txErr }] = await Promise.all([
      supabase.from("bank_accounts").select(ACCOUNT_COLUMNS).eq("user_id", userId).order("created_at"),
      supabase
        .from("bank_transactions")
        .select("id, account_id, amount, direction, description, posted_at, category, source")
        .eq("user_id", userId)
        .order("posted_at", { ascending: false })
        .limit(500),
    ]);
    if (accErr) throw accErr;
    if (txErr) throw txErr;
    const { hasLiveProvider } = await import("./bank.server");
    return {
      live: hasLiveProvider(),
      accounts: ((accounts ?? []) as AccountRecord[]).map(toAccount),
      transactions: ((txns ?? []) as Array<Record<string, unknown>>).map(
        (t): BankTxnRow => ({
          id: String(t["id"]),
          accountId: String(t["account_id"]),
          amount: Number(t["amount"]),
          direction: t["direction"] === "credit" ? "credit" : "debit",
          description: String(t["description"]),
          postedAt: String(t["posted_at"]),
          category: String(t["category"]),
          source: String(t["source"]),
        }),
      ),
    };
  });

export const connectBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => connectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getProvider } = await import("./bank.server");
    const provider = getProvider();
    const linked = await provider.linkAccounts({ bankName: data.bankName, userRef: userId });
    if (linked.length === 0) throw new Error("No accounts were shared by your bank.");

    const inserted: BankAccountRow[] = [];
    for (const acc of linked) {
      const { data: row, error } = await supabase
        .from("bank_accounts")
        .insert({
          user_id: userId,
          provider: provider.id,
          provider_account_ref: acc.providerAccountRef,
          bank_name: acc.bankName,
          masked_number: acc.maskedNumber,
          account_type: acc.accountType,
          balance: acc.balance,
          currency: acc.currency,
          status: "active",
        })
        .select(ACCOUNT_COLUMNS)
        .single();
      if (error) throw error;
      inserted.push(toAccount(row as AccountRecord));
    }
    return { accounts: inserted };
  });

export const addManualAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => manualAccountSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: userId,
        provider: "manual",
        bank_name: data.bankName,
        masked_number: data.maskedNumber,
        balance: data.balance,
        currency: data.currency,
      })
      .select(ACCOUNT_COLUMNS)
      .single();
    if (error) throw error;
    return { account: toAccount(row as AccountRecord) };
  });

export const syncBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: account, error } = await supabase
      .from("bank_accounts")
      .select("id, provider, provider_account_ref, last_synced_at")
      .eq("id", data.accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!account) throw new Error("Account not found.");
    const ref = (account as { provider_account_ref: string | null }).provider_account_ref;
    if (!ref) return { added: 0, manual: true };

    const { getProvider } = await import("./bank.server");
    const provider = getProvider();
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const txns = await provider.fetchTransactions({ providerAccountRef: ref, since });

    if (txns.length > 0) {
      const { error: upErr } = await supabase.from("bank_transactions").upsert(
        txns.map((t) => ({
          user_id: userId,
          account_id: data.accountId,
          provider_txn_id: t.providerTxnId,
          amount: t.amount,
          direction: t.direction,
          description: t.description,
          posted_at: t.postedAt,
          category: t.category,
          source: "bank",
        })),
        { onConflict: "account_id,provider_txn_id", ignoreDuplicates: true },
      );
      if (upErr) throw upErr;
    }

    await supabase
      .from("bank_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", data.accountId)
      .eq("user_id", userId);

    return { added: txns.length, manual: false };
  });

export const importStatementRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => importSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: exErr } = await supabase
      .from("bank_transactions")
      .select("amount, description, posted_at")
      .eq("user_id", userId)
      .eq("account_id", data.accountId);
    if (exErr) throw exErr;
    const seen = new Set(
      ((existing ?? []) as Array<Record<string, unknown>>).map(
        (t) => `${t["posted_at"]}|${Number(t["amount"])}|${String(t["description"]).toLowerCase()}`,
      ),
    );

    const fresh = data.rows.filter((r) => {
      const key = `${r.postedAt}|${r.amount}|${r.description.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fresh.length === 0) return { added: 0, skipped: data.rows.length };

    const { error } = await supabase.from("bank_transactions").insert(
      fresh.map((r) => ({
        user_id: userId,
        account_id: data.accountId,
        amount: r.amount,
        direction: r.direction,
        description: r.description,
        posted_at: r.postedAt,
        category: r.category,
        source: "import",
      })),
    );
    if (error) throw error;
    return { added: fresh.length, skipped: data.rows.length - fresh.length };
  });

export const disconnectBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => disconnectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: account } = await supabase
      .from("bank_accounts")
      .select("provider_account_ref")
      .eq("id", data.accountId)
      .eq("user_id", userId)
      .maybeSingle();

    const ref = (account as { provider_account_ref: string | null } | null)?.provider_account_ref;
    if (ref) {
      const { getProvider } = await import("./bank.server");
      try {
        await getProvider().revoke({ providerAccountRef: ref });
      } catch (err) {
        console.error("Consent revoke failed", err);
      }
    }

    if (data.keepTransactions) {
      // Keep the history: mark the account disconnected so syncing stops but
      // past transactions stay in Activity.
      const { error: stopErr } = await supabase
        .from("bank_accounts")
        .update({ status: "disconnected", provider_account_ref: null })
        .eq("id", data.accountId)
        .eq("user_id", userId);
      if (stopErr) throw stopErr;
      return { ok: true, removed: false };
    }

    // Deleting the account cascades its transactions away.
    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", data.accountId)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true, removed: true };
  });
