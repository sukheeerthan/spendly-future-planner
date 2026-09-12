import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useAuth } from "@/hooks/useAuth";

import { listBankData } from "./bank.functions";
import type { Transaction } from "./types";

export const BANK_QUERY_KEY = ["bank-data"] as const;

export function useBankData() {
  const { session, loading } = useAuth();
  const fetchBank = useServerFn(listBankData);
  const query = useQuery({
    queryKey: BANK_QUERY_KEY,
    queryFn: () => fetchBank(),
    enabled: !loading && Boolean(session),
    staleTime: 60_000,
  });
  return { ...query, signedIn: Boolean(session), authLoading: loading };
}

/** Maps synced bank rows onto Spendly's transaction shape (read-only). */
export function bankTransactionsToSpendly(
  rows: { id: string; amount: number; direction: "debit" | "credit"; description: string; postedAt: string; category: string }[],
): Transaction[] {
  return rows.map((r) => ({
    id: `bank:${r.id}`,
    kind: r.direction === "credit" ? "income" : "expense",
    amount: r.amount,
    label: r.direction === "credit" ? "Other" : r.category,
    date: r.postedAt,
    note: r.description,
  }));
}
