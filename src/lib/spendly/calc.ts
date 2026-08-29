import type { ExpenseCategory, Goal, SpendlyState, Transaction } from "./types";

export const CATEGORY_META: Record<ExpenseCategory, { emoji: string; color: string }> = {
  Food: { emoji: "🍔", color: "var(--color-chart-1)" },
  Travel: { emoji: "🚌", color: "var(--color-chart-2)" },
  Shopping: { emoji: "🛍️", color: "var(--color-chart-3)" },
  Education: { emoji: "📚", color: "var(--color-chart-4)" },
  Entertainment: { emoji: "🎮", color: "var(--color-chart-5)" },
  Bills: { emoji: "🏠", color: "var(--color-chart-6)" },
  Technology: { emoji: "💻", color: "var(--color-chart-2)" },
  Gifts: { emoji: "🎁", color: "var(--color-chart-5)" },
  Other: { emoji: "📦", color: "var(--color-chart-4)" },
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];
export const ESSENTIAL_CATEGORIES: string[] = ["Bills", "Education"];

export const MOOD_META = [
  { key: "Happy", emoji: "😊" },
  { key: "Normal", emoji: "😐" },
  { key: "Excited", emoji: "🤩" },
  { key: "Stressed", emoji: "😫" },
  { key: "Sad", emoji: "😔" },
] as const;

export function todayISO(d = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function daysInMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function remainingDaysInMonth(d = new Date()): number {
  return Math.max(1, daysInMonth(d) - d.getDate() + 1);
}

export function formatMoney(amount: number, currency = "₹", opts?: { decimals?: boolean }): string {
  const abs = Math.abs(amount);
  const value = abs.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  });
  return `${amount < 0 ? "-" : ""}${currency}${value}`;
}

export function isSameMonth(dateISO: string, ref = new Date()): boolean {
  const d = new Date(dateISO);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export type Period = "today" | "week" | "month" | "year";

export function inPeriod(dateISO: string, period: Period, ref = new Date()): boolean {
  const d = new Date(dateISO);
  if (period === "today") return dateISO === todayISO(ref);
  if (period === "year") return d.getFullYear() === ref.getFullYear();
  if (period === "month") return isSameMonth(dateISO, ref);
  const diff = daysBetween(dateISO, todayISO(ref));
  return diff >= 0 && diff < 7;
}

export function sum(list: Transaction[]): number {
  return list.reduce((t, x) => t + x.amount, 0);
}

export function goalSaved(goal: Goal): number {
  return goal.contributions.reduce((t, c) => t + c.amount, 0);
}

export interface GoalPlan {
  saved: number;
  remaining: number;
  percent: number;
  daysLeft: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
  monthlyCommitment: number;
  completed: boolean;
  estimatedDate: string;
}

export function goalPlan(goal: Goal, ref = new Date()): GoalPlan {
  const saved = goalSaved(goal);
  const remaining = Math.max(0, goal.target - saved);
  const daysLeft = Math.max(0, daysBetween(todayISO(ref), goal.deadline));
  const effDays = Math.max(1, daysLeft);
  const perDay = remaining / effDays;
  return {
    saved,
    remaining,
    percent: goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0,
    daysLeft,
    perDay,
    perWeek: perDay * 7,
    perMonth: perDay * 30,
    monthlyCommitment: Math.min(remaining, perDay * 30),
    completed: remaining <= 0,
    estimatedDate: goal.deadline,
  };
}

export interface MoneyPlan {
  monthlyIncome: number;
  extraIncomeThisMonth: number;
  totalIncome: number;
  essentials: number;
  savings: number;
  goals: number;
  flexible: number;
  spentThisMonth: number;
  flexibleSpent: number;
  flexibleRemaining: number;
  availableBalance: number;
  safeToday: number;
  safeWeek: number;
  remainingDays: number;
}

export function computeMoneyPlan(state: SpendlyState, ref = new Date()): MoneyPlan {
  const { profile, transactions, goals } = state;
  const monthlyIncome = profile.incomes.reduce((t, i) => t + i.amount, 0);
  const monthTx = transactions.filter((t) => isSameMonth(t.date, ref));
  const extraIncomeThisMonth = sum(monthTx.filter((t) => t.kind === "income"));
  const totalIncome = monthlyIncome + extraIncomeThisMonth;

  const expenses = monthTx.filter((t) => t.kind === "expense");
  const spentThisMonth = sum(expenses);
  const flexibleSpent = sum(expenses.filter((t) => !ESSENTIAL_CATEGORIES.includes(t.label)));

  const goalsCommitment = goals.reduce((t, g) => t + goalPlan(g, ref).monthlyCommitment, 0);
  const essentials = profile.essentials;
  const savings = profile.savingsTarget;
  const flexible = Math.max(0, totalIncome - essentials - savings - goalsCommitment);

  const remainingDays = remainingDaysInMonth(ref);
  const flexibleRemaining = Math.max(0, flexible - flexibleSpent);
  const safeToday = (flexibleRemaining / remainingDays) * (profile.safeToSpendAdjust || 1);
  const safeWeek = safeToday * Math.min(7, remainingDays);

  const monthFraction = ref.getDate() / daysInMonth(ref);
  const allocatedSoFar = (savings + goalsCommitment) * monthFraction;
  const availableBalance = Math.max(0, totalIncome - spentThisMonth - allocatedSoFar);

  return {
    monthlyIncome,
    extraIncomeThisMonth,
    totalIncome,
    essentials,
    savings,
    goals: goalsCommitment,
    flexible,
    spentThisMonth,
    flexibleSpent,
    flexibleRemaining,
    availableBalance,
    safeToday: Math.max(0, safeToday),
    safeWeek: Math.max(0, safeWeek),
    remainingDays,
  };
}

export function categoryTotals(transactions: Transaction[], period: Period, ref = new Date()) {
  const map = new Map<string, number>();
  transactions
    .filter((t) => t.kind === "expense" && inPeriod(t.date, period, ref))
    .forEach((t) => map.set(t.label, (map.get(t.label) ?? 0) + t.amount));
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
      emoji: CATEGORY_META[label as ExpenseCategory]?.emoji ?? "📦",
      color: CATEGORY_META[label as ExpenseCategory]?.color ?? "var(--color-chart-1)",
    }))
    .sort((a, b) => b.value - a.value);
}

export function dailySeries(transactions: Transaction[], days: number, ref = new Date()) {
  const out: { date: string; label: string; spent: number; income: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref.getTime() - i * 86400000);
    const iso = todayISO(d);
    const dayTx = transactions.filter((t) => t.date === iso);
    out.push({
      date: iso,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      spent: sum(dayTx.filter((t) => t.kind === "expense")),
      income: sum(dayTx.filter((t) => t.kind === "income")),
    });
  }
  return out;
}

export function savingStreak(state: SpendlyState, ref = new Date()): number {
  const dates = new Set<string>();
  state.goals.forEach((g) => g.contributions.forEach((c) => dates.add(c.date)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const iso = todayISO(new Date(ref.getTime() - i * 86400000));
    if (dates.has(iso)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function trackingStreak(state: SpendlyState, ref = new Date()): number {
  const dates = new Set(state.transactions.map((t) => t.date));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const iso = todayISO(new Date(ref.getTime() - i * 86400000));
    if (dates.has(iso)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function totalSaved(state: SpendlyState): number {
  return state.goals.reduce((t, g) => t + goalSaved(g), 0);
}

export interface HealthScore {
  score: number;
  savingHabits: number;
  goalProgress: number;
  budgetConsistency: number;
  tracking: number;
  improvement: string;
}

export function moneyHealth(state: SpendlyState, plan: MoneyPlan, ref = new Date()): HealthScore {
  const saved = totalSaved(state);
  const savingHabits = clampStars(saved / Math.max(1, state.profile.savingsTarget || 1000));
  const avgGoal =
    state.goals.length > 0
      ? state.goals.reduce((t, g) => t + goalPlan(g, ref).percent, 0) / state.goals.length / 100
      : 0;
  const goalProgress = clampStars(avgGoal * 1.4);
  const budgetConsistency = clampStars(
    plan.flexible > 0 ? 1 - Math.max(0, plan.flexibleSpent / plan.flexible - 0.6) * 1.6 : 0.6,
  );
  const tracking = clampStars(trackingStreak(state, ref) / 7);
  const score = Math.round(
    ((savingHabits + goalProgress + budgetConsistency + tracking) / 20) * 100,
  );
  let improvement = "Keep logging your spending — it powers every Spendly estimate.";
  if (budgetConsistency < 4)
    improvement = `Try keeping this week's flexible spending ${formatMoney(100, state.profile.currency)} lower.`;
  else if (goalProgress < 4) improvement = "A small top-up to your closest goal keeps momentum going.";
  else if (savingHabits < 4) improvement = "Set aside a little on the days you spend less.";
  return { score, savingHabits, goalProgress, budgetConsistency, tracking, improvement };
}

function clampStars(ratio: number): number {
  return Math.max(1, Math.min(5, Math.round(ratio * 5)));
}

export interface Insight {
  emoji: string;
  title: string;
  body: string;
}

export function buildInsights(state: SpendlyState, plan: MoneyPlan, ref = new Date()): Insight[] {
  const out: Insight[] = [];
  const currency = state.profile.currency;
  const thisWeek = sum(
    state.transactions.filter((t) => t.kind === "expense" && inPeriod(t.date, "week", ref)),
  );
  const lastWeekRef = new Date(ref.getTime() - 7 * 86400000);
  const lastWeek = sum(
    state.transactions.filter((t) => t.kind === "expense" && inPeriod(t.date, "week", lastWeekRef)),
  );
  if (lastWeek > 0) {
    const diff = lastWeek - thisWeek;
    out.push(
      diff >= 0
        ? {
            emoji: "🌿",
            title: "Lighter week",
            body: `You spent ${formatMoney(Math.abs(diff), currency)} less this week than last week.`,
          }
        : {
            emoji: "📈",
            title: "Spending picked up",
            body: `You're ${formatMoney(Math.abs(diff), currency)} above last week. Nothing to worry about — just worth knowing.`,
          },
    );
  }
  const cats = categoryTotals(state.transactions, "month", ref);
  if (cats[0]) {
    out.push({
      emoji: cats[0].emoji,
      title: "Your biggest category",
      body: `${cats[0].label} is currently your highest spending category at ${formatMoney(cats[0].value, currency)} (${Math.round(cats[0].percent)}%).`,
    });
  }
  const nearest = [...state.goals]
    .map((g) => ({ g, p: goalPlan(g, ref) }))
    .filter((x) => !x.p.completed)
    .sort((a, b) => b.p.percent - a.p.percent)[0];
  if (nearest) {
    out.push({
      emoji: nearest.g.emoji,
      title: "Goal momentum",
      body: `You're ${Math.round(nearest.p.percent)}% of the way to ${nearest.g.name}. About ${formatMoney(Math.ceil(nearest.p.perDay), currency)}/day keeps you on track.`,
    });
  }
  out.push({
    emoji: "🟢",
    title: "Today's room",
    body: `Your plan leaves about ${formatMoney(Math.round(plan.safeToday), currency)} of flexible spending today.`,
  });
  return out;
}

export const REWARDS = [
  { id: "first-saver", emoji: "🏅", name: "First Saver", desc: "Add your first goal contribution" },
  { id: "saved-100", emoji: "🥉", name: "First ₹100 Saved", desc: "Save 100 toward goals" },
  { id: "saved-500", emoji: "🥈", name: "500 Saved", desc: "Save 500 toward goals" },
  { id: "saved-1000", emoji: "🥇", name: "1,000 Saved", desc: "Save 1,000 toward goals" },
  { id: "streak-7", emoji: "🔥", name: "7-Day Saving Streak", desc: "Save 7 days in a row" },
  { id: "goal-started", emoji: "🎯", name: "Goal Started", desc: "Create your first goal" },
  { id: "goal-half", emoji: "🚀", name: "Goal 50% Complete", desc: "Reach halfway on any goal" },
  { id: "goal-done", emoji: "🏆", name: "Goal Completed", desc: "Fully fund a goal" },
  { id: "track-7", emoji: "📊", name: "7 Days of Tracking", desc: "Log expenses 7 days in a row" },
] as const;

export function earnedRewards(state: SpendlyState, ref = new Date()): string[] {
  const saved = totalSaved(state);
  const ids: string[] = [];
  const anyContribution = state.goals.some((g) => g.contributions.length > 0);
  if (anyContribution) ids.push("first-saver");
  if (saved >= 100) ids.push("saved-100");
  if (saved >= 500) ids.push("saved-500");
  if (saved >= 1000) ids.push("saved-1000");
  if (savingStreak(state, ref) >= 7) ids.push("streak-7");
  if (state.goals.length > 0) ids.push("goal-started");
  if (state.goals.some((g) => goalPlan(g, ref).percent >= 50)) ids.push("goal-half");
  if (state.goals.some((g) => goalPlan(g, ref).completed)) ids.push("goal-done");
  if (trackingStreak(state, ref) >= 7) ids.push("track-7");
  return ids;
}

export function rewardProgress(state: SpendlyState, id: string, ref = new Date()): number {
  const saved = totalSaved(state);
  switch (id) {
    case "saved-100":
      return Math.min(1, saved / 100);
    case "saved-500":
      return Math.min(1, saved / 500);
    case "saved-1000":
      return Math.min(1, saved / 1000);
    case "streak-7":
      return Math.min(1, savingStreak(state, ref) / 7);
    case "track-7":
      return Math.min(1, trackingStreak(state, ref) / 7);
    case "goal-half":
      return Math.min(
        1,
        Math.max(0, ...state.goals.map((g) => goalPlan(g, ref).percent / 50), 0),
      );
    case "goal-done":
      return Math.min(1, Math.max(0, ...state.goals.map((g) => goalPlan(g, ref).percent / 100), 0));
    default:
      return state.goals.length > 0 ? 1 : 0;
  }
}

export function buildMission(state: SpendlyState, plan: MoneyPlan, ref = new Date()): string {
  const day = ref.getDate() % 4;
  const c = state.profile.currency;
  if (day === 0) return `Save ${formatMoney(100, c)} toward a goal today`;
  if (day === 1) return `Spend ${formatMoney(50, c)} less than yesterday`;
  if (day === 2) return "Log every expense you make today";
  return `Stay inside today's safe-to-spend of ${formatMoney(Math.round(plan.safeToday), c)}`;
}

export function canIBuy(price: number, state: SpendlyState, plan: MoneyPlan, ref = new Date()) {
  const flexibleLeft = plan.flexibleRemaining;
  const fits = price <= flexibleLeft;
  const nearest = [...state.goals]
    .map((g) => ({ g, p: goalPlan(g, ref) }))
    .filter((x) => !x.p.completed)
    .sort((a, b) => a.p.daysLeft - b.p.daysLeft)[0];
  const overflow = Math.max(0, price - flexibleLeft);
  const delayDays = nearest && nearest.p.perDay > 0 ? Math.ceil(overflow / nearest.p.perDay) : 0;
  return {
    fits,
    flexibleLeft,
    delayDays,
    goalName: nearest?.g.name,
    verdict: fits ? ("fits" as const) : ("wait" as const),
    message: fits
      ? `This fits inside your flexible spending for the rest of the month. You'd still have ${formatMoney(flexibleLeft - price, state.profile.currency)} of flexible money left.`
      : nearest
        ? `This purchase may delay ${nearest.g.name} by approximately ${delayDays} day${delayDays === 1 ? "" : "s"}.`
        : `This is ${formatMoney(overflow, state.profile.currency)} above your flexible money for the rest of the month.`,
  };
}

export function projectSavings(perDay: number) {
  return [30, 90, 180, 365].map((days) => ({ days, amount: perDay * days }));
}

export function simulateInvestment(initial: number, monthly: number, years: number, rate: number) {
  const points: { year: number; invested: number; value: number }[] = [];
  let value = initial;
  let invested = initial;
  const r = rate / 100 / 12;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + r) + monthly;
      invested += monthly;
    }
    points.push({ year: y, invested: Math.round(invested), value: Math.round(value) });
  }
  return points;
}
