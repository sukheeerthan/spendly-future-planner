import { todayISO } from "./calc";
import type { SpendlyState, Transaction } from "./types";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

function shift(days: number): string {
  return todayISO(new Date(Date.now() - days * 86400000));
}

const seedExpenses: [number, number, string, string, string?][] = [
  // [daysAgo, amount, category, method, note]
  [0, 120, "Food", "UPI", "Lunch with friends"],
  [0, 50, "Travel", "Cash", "Bus fare"],
  [0, 80, "Shopping", "Card", "Notebook"],
  [0, 100, "Other", "UPI"],
  [1, 260, "Food", "UPI"],
  [1, 150, "Entertainment", "Card", "Movie"],
  [2, 320, "Shopping", "Card"],
  [2, 90, "Travel", "UPI"],
  [3, 210, "Food", "Cash"],
  [3, 400, "Education", "Bank", "Online course"],
  [4, 180, "Food", "UPI"],
  [4, 250, "Entertainment", "UPI"],
  [5, 300, "Shopping", "Card"],
  [5, 140, "Travel", "Cash"],
  [6, 190, "Food", "UPI"],
  [7, 400, "Education", "Bank"],
  [8, 260, "Shopping", "Card"],
  [9, 220, "Food", "UPI"],
  [10, 300, "Entertainment", "Card"],
  [11, 160, "Travel", "UPI"],
  [12, 240, "Food", "Cash"],
  [13, 320, "Shopping", "UPI"],
  [14, 200, "Other", "Cash"],
  [15, 300, "Food", "UPI"],
];

export function createDemoState(): SpendlyState {
  const transactions: Transaction[] = seedExpenses.map(([d, amount, label, method, note]) => ({
    id: uid("tx"),
    kind: "expense",
    amount,
    label,
    date: shift(d),
    method: method as Transaction["method"],
    note,
    mood: d % 3 === 0 ? "Happy" : d % 3 === 1 ? "Normal" : "Excited",
  }));
  transactions.push({
    id: uid("tx"),
    kind: "income",
    amount: 2000,
    label: "Freelance",
    date: shift(6),
    note: "Design gig",
  });

  return {
    version: 1,
    onboarded: true,
    demoData: true,
    profile: {
      name: "Aarav",
      currency: "₹",
      under18: false,
      incomes: [
        { id: uid("inc"), type: "Salary", amount: 30000 },
        { id: uid("inc"), type: "Freelance", amount: 5000 },
        { id: uid("inc"), type: "Other", amount: 2000 },
      ],
      essentials: 12000,
      savingsTarget: 8000,
      safeToSpendAdjust: 1,
    },
    transactions,
    goals: [
      {
        id: uid("goal"),
        name: "New Headphones",
        emoji: "🎧",
        target: 5000,
        deadline: shift(-22),
        createdAt: shift(30),
        contributions: [
          { id: uid("c"), amount: 1000, date: shift(20) },
          { id: uid("c"), amount: 900, date: shift(9) },
          { id: uid("c"), amount: 400, date: shift(2) },
          { id: uid("c"), amount: 200, date: shift(1) },
        ],
      },
      {
        id: uid("goal"),
        name: "Beach Trip",
        emoji: "🏖️",
        target: 25000,
        deadline: shift(-120),
        createdAt: shift(40),
        contributions: [
          { id: uid("c"), amount: 4000, date: shift(25) },
          { id: uid("c"), amount: 3000, date: shift(12) },
        ],
      },
    ],
    missions: [],
    unlockedRewards: [],
    trackedDays: [],
    aiMessages: [],
  };
}

export function createEmptyState(): SpendlyState {
  return {
    version: 1,
    onboarded: false,
    demoData: false,
    profile: {
      name: "",
      currency: "₹",
      under18: false,
      incomes: [],
      essentials: 0,
      savingsTarget: 0,
      safeToSpendAdjust: 1,
    },
    transactions: [],
    goals: [],
    missions: [],
    unlockedRewards: [],
    trackedDays: [],
    aiMessages: [],
  };
}
