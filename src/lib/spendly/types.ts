export type IncomeType =
  | "Salary"
  | "Allowance"
  | "Freelance"
  | "Part-time"
  | "Gift"
  | "Other";

export type ExpenseCategory =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Education"
  | "Entertainment"
  | "Bills"
  | "Technology"
  | "Gifts"
  | "Other";

export type PaymentMethod = "Cash" | "Card" | "UPI" | "Bank" | "Other";

export type Mood = "Happy" | "Normal" | "Excited" | "Stressed" | "Sad";

export interface IncomeSource {
  id: string;
  type: IncomeType;
  amount: number;
}

export interface Transaction {
  id: string;
  kind: "expense" | "income";
  amount: number;
  /** ExpenseCategory for expenses, IncomeType for income */
  label: string;
  date: string; // yyyy-mm-dd
  method?: PaymentMethod;
  note?: string;
  mood?: Mood;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  deadline: string; // yyyy-mm-dd
  contributions: GoalContribution[];
  createdAt: string;
}

export interface Mission {
  date: string;
  text: string;
  done: boolean;
}

export interface Preferences {
  theme: "light" | "dark";
  notifications: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  aiInsights: boolean;
  aiDataAccess: boolean;
  moodTracking: boolean;
}

export interface Profile {
  name: string;
  currency: string;
  under18: boolean;
  incomes: IncomeSource[];
  essentials: number;
  savingsTarget: number;
  /** manual multiplier for safe-to-spend, 1 = Spendly estimate */
  safeToSpendAdjust: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface SpendlyState {
  version: number;
  onboarded: boolean;
  demoData: boolean;
  profile: Profile;
  transactions: Transaction[];
  goals: Goal[];
  missions: Mission[];
  unlockedRewards: string[];
  trackedDays: string[];
  aiMessages: AiMessage[];
}
