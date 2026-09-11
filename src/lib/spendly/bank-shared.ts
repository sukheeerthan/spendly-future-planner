import type { ExpenseCategory } from "./types";

export interface BankAccountRow {
  id: string;
  provider: string;
  bankName: string;
  maskedNumber: string;
  accountType: string;
  balance: number;
  currency: string;
  status: string;
  lastSyncedAt: string | null;
}

export interface BankTxnRow {
  id: string;
  accountId: string;
  amount: number;
  direction: "debit" | "credit";
  description: string;
  postedAt: string;
  category: string;
  source: string;
}

/** Banks available on the India Account Aggregator network. */
export const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDFC FIRST Bank",
  "Union Bank of India",
] as const;

const RULES: { match: RegExp; category: ExpenseCategory }[] = [
  { match: /swiggy|zomato|dominos|cafe|restaurant|bakery|grocer|bigbasket|blinkit|zepto|kirana|food/i, category: "Food" },
  { match: /uber|ola|rapido|irctc|metro|petrol|fuel|indian oil|hpcl|bpcl|toll|bus|flight|indigo/i, category: "Travel" },
  { match: /amazon|flipkart|myntra|ajio|meesho|nykaa|mall|store|shopping/i, category: "Shopping" },
  { match: /school|college|tuition|udemy|coursera|byju|unacademy|book|exam|fee/i, category: "Education" },
  { match: /netflix|spotify|hotstar|prime video|bookmyshow|game|steam|movie|pvr/i, category: "Entertainment" },
  { match: /electricity|water bill|gas|rent|broadband|airtel|jio|vi |bsnl|insurance|emi|loan|maintenance|recharge/i, category: "Bills" },
  { match: /apple|croma|reliance digital|laptop|mobile|hardware|software|hosting|domain/i, category: "Technology" },
  { match: /gift|donation|temple|charity/i, category: "Gifts" },
];

export function categoriseDescription(description: string): ExpenseCategory {
  for (const rule of RULES) if (rule.match.test(description)) return rule.category;
  return "Other";
}

/** Rough CSV parser that handles quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  row.push(field.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

/** Best-effort date normaliser for Indian bank statement formats. */
export function normaliseDate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(raw);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y!.length === 2 ? `20${y}` : y!;
    return `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? Math.abs(value) : 0;
}
