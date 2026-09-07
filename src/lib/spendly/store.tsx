import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  buildInsights,
  buildMission,
  computeMoneyPlan,
  earnedRewards,
  moneyHealth,
  REWARDS,
  todayISO,
} from "./calc";
import { createDemoState, createEmptyState, uid } from "./demo";
import type { Goal, Preferences, SpendlyState, Transaction } from "./types";

const STORAGE_KEY = "spendly.state.v1";

interface Ctx {
  state: SpendlyState;
  hydrated: boolean;
  plan: ReturnType<typeof computeMoneyPlan>;
  health: ReturnType<typeof moneyHealth>;
  insights: ReturnType<typeof buildInsights>;
  mission: { text: string; done: boolean };
  update: (fn: (s: SpendlyState) => SpendlyState) => void;
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addGoal: (goal: Omit<Goal, "id" | "contributions" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  contribute: (goalId: string, amount: number) => void;
  completeMission: () => void;
  changeCurrency: (opts: { code: string; symbol: string; rate: number; convert: boolean }) => void;
  loadDemo: () => void;
  resetAll: () => void;
  celebration: string | null;
  clearCelebration: () => void;
}

const contextRegistry = globalThis as typeof globalThis & {
  __spendlyContext?: Context<Ctx | null>;
};
const SpendlyContext = contextRegistry.__spendlyContext ?? createContext<Ctx | null>(null);
contextRegistry.__spendlyContext = SpendlyContext;

export function SpendlyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpendlyState>(() => createDemoState());
  const [hydrated, setHydrated] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SpendlyState;
        if (parsed && parsed.profile) setState({ ...createEmptyState(), ...parsed });
      } else {
        setState(createDemoState());
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked */
    }
  }, [state, hydrated]);

  // theme + a11y classes
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("dark", state.profile ? getPrefs(state).theme === "dark" : false);
    root.classList.toggle("reduce-motion", getPrefs(state).reducedMotion);
    root.style.fontSize = getPrefs(state).largeText ? "18px" : "";
  }, [state, hydrated]);

  const update = useCallback((fn: (s: SpendlyState) => SpendlyState) => {
    setState((prev) => {
      const next = fn(prev);
      const before = earnedRewards(prev);
      const after = earnedRewards(next);
      const fresh = after.find((id) => !before.includes(id));
      if (fresh) {
        const reward = REWARDS.find((r) => r.id === fresh);
        if (reward) {
          setCelebration(`${reward.emoji} ${reward.name}`);
          setTimeout(() => toast.success(`Reward unlocked: ${reward.name} ${reward.emoji}`), 50);
        }
      }
      return { ...next, unlockedRewards: after };
    });
  }, []);

  const addTransaction = useCallback<Ctx["addTransaction"]>(
    (tx) => {
      update((s) => ({ ...s, demoData: false, transactions: [{ ...tx, id: uid("tx") }, ...s.transactions] }));
      toast.success(
        tx.kind === "expense" ? "Got it! Your spending is updated ✨" : "Income added — your plan is refreshed 💰",
      );
    },
    [update],
  );

  const updateTransaction = useCallback<Ctx["updateTransaction"]>(
    (id, patch) => {
      update((s) => ({
        ...s,
        transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      toast.success("Updated ✨");
    },
    [update],
  );

  const deleteTransaction = useCallback<Ctx["deleteTransaction"]>(
    (id) => {
      update((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
      toast("Removed from your history");
    },
    [update],
  );

  const addGoal = useCallback<Ctx["addGoal"]>(
    (goal) => {
      update((s) => ({
        ...s,
        goals: [...s.goals, { ...goal, id: uid("goal"), contributions: [], createdAt: todayISO() }],
      }));
      toast.success("Goal created 🎯");
    },
    [update],
  );

  const updateGoal = useCallback<Ctx["updateGoal"]>(
    (id, patch) => {
      update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
    },
    [update],
  );

  const deleteGoal = useCallback<Ctx["deleteGoal"]>(
    (id) => {
      update((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
      toast("Goal removed");
    },
    [update],
  );

  const contribute = useCallback<Ctx["contribute"]>(
    (goalId, amount) => {
      update((s) => ({
        ...s,
        goals: s.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                contributions: [
                  ...g.contributions,
                  { id: uid("c"), amount, date: todayISO() },
                ],
              }
            : g,
        ),
      }));
      toast.success("Saved! You're getting closer 🎯");
    },
    [update],
  );

  const plan = useMemo(() => computeMoneyPlan(state), [state]);
  const health = useMemo(() => moneyHealth(state, plan), [state, plan]);
  const insights = useMemo(() => buildInsights(state, plan), [state, plan]);

  const missionText = useMemo(() => buildMission(state, plan), [state, plan]);
  const today = todayISO();
  const missionDone = state.missions.some((m) => m.date === today && m.done);

  const completeMission = useCallback(() => {
    update((s) => ({
      ...s,
      missions: [
        ...s.missions.filter((m) => m.date !== todayISO()),
        { date: todayISO(), text: missionText, done: true },
      ],
    }));
    setCelebration("🎉 Mission complete!");
  }, [update, missionText]);

  const changeCurrency = useCallback<Ctx["changeCurrency"]>(
    ({ code, symbol, rate, convert }) => {
      const r = convert && rate > 0 ? rate : 1;
      const conv = (n: number) => Math.round(n * r * 100) / 100;
      update((s) => ({
        ...s,
        profile: {
          ...s.profile,
          currency: symbol,
          currencyCode: code,
          essentials: conv(s.profile.essentials),
          savingsTarget: conv(s.profile.savingsTarget),
          incomes: s.profile.incomes.map((i) => ({ ...i, amount: conv(i.amount) })),
        },
        transactions: s.transactions.map((t) => ({ ...t, amount: conv(t.amount) })),
        goals: s.goals.map((g) => ({
          ...g,
          target: conv(g.target),
          contributions: g.contributions.map((c) => ({ ...c, amount: conv(c.amount) })),
        })),
      }));
      toast.success(
        convert && r !== 1
          ? `Switched to ${code} — amounts converted at ${r.toFixed(4)}`
          : `Switched to ${code}`,
      );
    },
    [update],
  );

  const loadDemo = useCallback(() => {
    setState(createDemoState());
    toast.success("Demo data loaded");
  }, []);

  const resetAll = useCallback(() => {
    setState({ ...createEmptyState(), onboarded: true });
    toast("Your data was cleared");
  }, []);

  const value: Ctx = {
    state,
    hydrated,
    plan,
    health,
    insights,
    mission: { text: missionText, done: missionDone },
    update,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addGoal,
    updateGoal,
    deleteGoal,
    contribute,
    completeMission,
    changeCurrency,
    loadDemo,
    resetAll,
    celebration,
    clearCelebration: () => setCelebration(null),
  };

  return <SpendlyContext.Provider value={value}>{children}</SpendlyContext.Provider>;
}

const DEFAULT_PREFS: Preferences = {
  theme: "light",
  notifications: true,
  reducedMotion: false,
  largeText: false,
  aiInsights: true,
  aiDataAccess: true,
  moodTracking: true,
};

export function getPrefs(state: SpendlyState): Preferences {
  return { ...DEFAULT_PREFS, ...state.preferences };
}

export function useSpendly() {
  const ctx = useContext(SpendlyContext);
  if (!ctx) throw new Error("useSpendly must be used inside SpendlyProvider");
  return ctx;
}

export function usePrefs() {
  const { state, update } = useSpendly();
  const prefs = getPrefs(state);
  const setPref = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    update((s) => ({ ...s, preferences: { ...getPrefs(s), [key]: value } }));
  return { prefs, setPref };
}
