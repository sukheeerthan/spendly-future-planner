/**
 * Provider-agnostic bank data layer.
 *
 * India's live bank data runs on the RBI Account Aggregator network. Each
 * provider (Setu, Finvu, Perfios) issues keys only to an onboarded business,
 * so the app talks to an adapter interface. When provider keys are absent we
 * fall back to the clearly-labelled sandbox adapter.
 */
import { categoriseDescription, INDIAN_BANKS } from "./bank-shared";

export interface ProviderAccount {
  providerAccountRef: string;
  bankName: string;
  maskedNumber: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface ProviderTxn {
  providerTxnId: string;
  amount: number;
  direction: "debit" | "credit";
  description: string;
  postedAt: string;
  category: string;
}

export interface BankProvider {
  id: string;
  /** Starts consent and returns the accounts the user shared. */
  linkAccounts(input: { bankName: string; userRef: string }): Promise<ProviderAccount[]>;
  fetchTransactions(input: { providerAccountRef: string; since: string }): Promise<ProviderTxn[]>;
  revoke(input: { providerAccountRef: string }): Promise<void>;
}

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

const SAMPLE = [
  { d: "Swiggy order", a: 385, k: "debit" },
  { d: "BigBasket groceries", a: 1240, k: "debit" },
  { d: "Uber ride", a: 210, k: "debit" },
  { d: "Airtel recharge", a: 399, k: "debit" },
  { d: "Netflix subscription", a: 499, k: "debit" },
  { d: "Amazon order", a: 1899, k: "debit" },
  { d: "Electricity bill", a: 1450, k: "debit" },
  { d: "Metro card top-up", a: 300, k: "debit" },
  { d: "Salary credit", a: 30000, k: "credit" },
  { d: "Freelance payment UPI", a: 4500, k: "credit" },
  { d: "Cafe Coffee Day", a: 260, k: "debit" },
  { d: "Croma laptop accessory", a: 2199, k: "debit" },
] as const;

const sandboxProvider: BankProvider = {
  id: "sandbox",
  async linkAccounts({ bankName }) {
    const name = INDIAN_BANKS.includes(bankName as (typeof INDIAN_BANKS)[number])
      ? bankName
      : (INDIAN_BANKS[0] as string);
    const suffix = String(Math.floor(1000 + Math.random() * 8999));
    return [
      {
        providerAccountRef: `sandbox-${suffix}`,
        bankName: name,
        maskedNumber: `XXXX XXXX ${suffix}`,
        accountType: "savings",
        balance: Math.round(18000 + Math.random() * 40000),
        currency: "INR",
      },
    ];
  },
  async fetchTransactions({ providerAccountRef, since }) {
    const out: ProviderTxn[] = [];
    SAMPLE.forEach((s, i) => {
      const postedAt = iso(i * 2 + 1);
      if (postedAt < since) return;
      out.push({
        providerTxnId: `${providerAccountRef}-${postedAt}-${i}`,
        amount: s.a,
        direction: s.k,
        description: s.d,
        postedAt,
        category: s.k === "credit" ? "Other" : categoriseDescription(s.d),
      });
    });
    return out;
  },
  async revoke() {
    /* nothing to revoke in sandbox */
  },
};

/**
 * Live Setu Account Aggregator adapter. Activated automatically once
 * SETU_CLIENT_ID / SETU_CLIENT_SECRET / SETU_PRODUCT_ID are saved as secrets.
 */
function setuProvider(): BankProvider {
  const clientId = process.env["SETU_CLIENT_ID"]!;
  const clientSecret = process.env["SETU_CLIENT_SECRET"]!;
  const productId = process.env["SETU_PRODUCT_ID"]!;
  const base = process.env["SETU_BASE_URL"] ?? "https://fiu-sandbox.setu.co";

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-product-instance-id": productId,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Setu request failed [${res.status}]: ${body}`);
      throw new Error(`Bank provider request failed [${res.status}]: ${body}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  return {
    id: "setu",
    async linkAccounts({ userRef }) {
      const data = (await call("/v2/consents", {
        method: "POST",
        body: JSON.stringify({ consentDuration: { unit: "MONTH", value: "12" }, vua: userRef }),
      })) as { accounts?: ProviderAccount[] };
      return data.accounts ?? [];
    },
    async fetchTransactions({ providerAccountRef, since }) {
      const data = (await call(
        `/v2/accounts/${encodeURIComponent(providerAccountRef)}/transactions?from=${since}`,
      )) as { transactions?: ProviderTxn[] };
      return (data.transactions ?? []).map((t) => ({
        ...t,
        category: t.direction === "credit" ? "Other" : categoriseDescription(t.description),
      }));
    },
    async revoke({ providerAccountRef }) {
      await call(`/v2/consents/${encodeURIComponent(providerAccountRef)}/revoke`, { method: "POST" });
    },
  };
}

export function hasLiveProvider(): boolean {
  return Boolean(
    process.env["SETU_CLIENT_ID"] && process.env["SETU_CLIENT_SECRET"] && process.env["SETU_PRODUCT_ID"],
  );
}

export function getProvider(): BankProvider {
  return hasLiveProvider() ? setuProvider() : sandboxProvider;
}
