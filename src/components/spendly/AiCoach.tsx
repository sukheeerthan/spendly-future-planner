import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { askSpendlyAi } from "@/lib/spendly/ai.functions";
import {
  categoryTotals,
  formatMoney,
  goalPlan,
  totalSaved,
  trackingStreak,
} from "@/lib/spendly/calc";
import { uid } from "@/lib/spendly/demo";
import { usePrefs, useSpendly } from "@/lib/spendly/store";
import { cn } from "@/lib/utils";

const QUICK = [
  "💰 How can I save more?",
  "📊 Where is my money going?",
  "🎯 How can I reach my goal?",
  "📅 Create my monthly plan",
  "📈 Teach me about investing",
  "🧠 Explain compounding simply",
  "🔮 Show me my future savings",
  "🛒 Can I afford new headphones?",
];

export function AiCoach({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, plan, update } = useSpendly();
  const { prefs } = usePrefs();
  const ask = useServerFn(askSpendlyAi);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = state.aiMessages;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function buildContext() {
    if (!prefs.aiDataAccess) return "The user has turned off AI data access. Answer generally.";
    const c = state.profile.currency;
    const cats = categoryTotals(state.transactions, "month")
      .map((x) => `${x.label}: ${formatMoney(x.value, c)} (${Math.round(x.percent)}%)`)
      .join(", ");
    const goals = state.goals
      .map((g) => {
        const p = goalPlan(g);
        return `${g.name} ${formatMoney(p.saved, c)}/${formatMoney(g.target, c)} (${Math.round(p.percent)}%), due ${g.deadline}, needs ${formatMoney(Math.ceil(p.perDay), c)}/day`;
      })
      .join("; ");
    return [
      `Name: ${state.profile.name || "friend"}`,
      `Currency symbol: ${c}`,
      `Under 18: ${state.profile.under18 ? "yes" : "no"}`,
      `Monthly income: ${formatMoney(plan.totalIncome, c)}`,
      `Essential expenses: ${formatMoney(plan.essentials, c)}`,
      `Savings target: ${formatMoney(plan.savings, c)}`,
      `Goal commitments: ${formatMoney(Math.round(plan.goals), c)}`,
      `Flexible spending budget: ${formatMoney(Math.round(plan.flexible), c)} (${formatMoney(Math.round(plan.flexibleRemaining), c)} left this month)`,
      `Spent this month: ${formatMoney(plan.spentThisMonth, c)}`,
      `Safe to spend today: ${formatMoney(Math.round(plan.safeToday), c)}`,
      `Total saved into goals: ${formatMoney(totalSaved(state), c)}`,
      `Tracking streak: ${trackingStreak(state)} days`,
      `Category spend this month: ${cats || "none yet"}`,
      `Goals: ${goals || "none yet"}`,
    ].join("\n");
  }

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    update((s) => ({
      ...s,
      aiMessages: [...s.aiMessages, { id: uid("m"), role: "user", content: q }],
    }));
    setLoading(true);
    try {
      const res = await ask({
        data: {
          question: q,
          context: buildContext(),
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      update((s) => ({
        ...s,
        aiMessages: [...s.aiMessages, { id: uid("m"), role: "assistant", content: res.text }],
      }));
    } catch {
      update((s) => ({
        ...s,
        aiMessages: [
          ...s.aiMessages,
          {
            id: uid("m"),
            role: "assistant",
            content: "I couldn't reach my brain just now. Please check your connection and try again.",
          },
        ],
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            Spendly AI
          </SheetTitle>
          <SheetDescription>Ask. Understand. Plan. Grow.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="soft-gradient rounded-3xl p-4">
                <p className="font-display text-base font-semibold">What would you like to know?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  I use your Spendly numbers to answer — and I teach, never push products.
                </p>
              </div>
              <div className="grid gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => void send(q.replace(/^\S+\s/, ""))}
                    className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm transition-all hover:bg-muted active:scale-[0.98]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "glass-card mr-auto",
              )}
            >
              {m.content}
            </div>
          ))}

          {loading ? (
            <div className="glass-card mr-auto flex max-w-[60%] items-center gap-2 rounded-3xl px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Thinking it through…
            </div>
          ) : null}
          <div ref={bottom} />
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="ai-input" className="sr-only">
              Ask Spendly AI
            </label>
            <Input
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your money…"
              className="h-12 rounded-2xl"
            />
            <Button type="submit" size="icon" className="size-12 shrink-0 rounded-2xl" disabled={loading}>
              <Send className="size-4" aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] leading-tight text-muted-foreground">
              Spendly AI provides educational information and budgeting guidance, not personalized investment
              advice or guaranteed returns.
            </p>
            {messages.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-xl text-xs"
                onClick={() => update((s) => ({ ...s, aiMessages: [] }))}
              >
                <Trash2 className="mr-1 size-3" aria-hidden="true" /> Clear
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
