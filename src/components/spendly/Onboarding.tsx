import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_META, EXPENSE_CATEGORIES, formatMoney, todayISO } from "@/lib/spendly/calc";
import { uid } from "@/lib/spendly/demo";
import { useSpendly } from "@/lib/spendly/store";
import type { IncomeSource, IncomeType } from "@/lib/spendly/types";
import { cn } from "@/lib/utils";

const INCOME_TYPES: IncomeType[] = ["Salary", "Allowance", "Freelance", "Part-time", "Gift", "Other"];
const GOAL_IDEAS = [
  { emoji: "🎧", name: "Headphones" },
  { emoji: "💻", name: "Laptop" },
  { emoji: "🏖️", name: "Trip" },
  { emoji: "🎁", name: "Gift" },
  { emoji: "📚", name: "Course" },
];

export function Onboarding() {
  const { update, loadDemo } = useSpendly();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [under18, setUnder18] = useState(false);
  const [incomes, setIncomes] = useState<IncomeSource[]>([
    { id: "seed-1", type: "Salary", amount: 0 },
  ]);
  const [essentials, setEssentials] = useState("");
  const [savings, setSavings] = useState("");
  const [goalName, setGoalName] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("🎧");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDate, setGoalDate] = useState(todayISO(new Date(Date.now() + 60 * 86400000)));

  const totalIncome = incomes.reduce((t, i) => t + (Number(i.amount) || 0), 0);

  function finish() {
    update((s) => ({
      ...s,
      onboarded: true,
      demoData: false,
      transactions: [],
      aiMessages: [],
      profile: {
        ...s.profile,
        name: name.trim() || "friend",
        currency,
        under18,
        incomes: incomes
          .filter((i) => Number(i.amount) > 0)
          .map((i) => ({ ...i, amount: Number(i.amount) })),
        essentials: Number(essentials) || 0,
        savingsTarget: Number(savings) || 0,
        safeToSpendAdjust: 1,
      },
      goals:
        goalName && Number(goalAmount) > 0
          ? [
              {
                id: uid("goal"),
                name: goalName,
                emoji: goalEmoji,
                target: Number(goalAmount),
                deadline: goalDate,
                contributions: [],
                createdAt: todayISO(),
              },
            ]
          : [],
    }));
  }

  const slides = [
    {
      key: "welcome",
      emoji: "👋",
      title: "Welcome to Spendly",
      sub: "Your money. Your goals. Your future.",
      body: (
        <div className="soft-gradient flex items-center justify-center gap-4 rounded-3xl py-10 text-5xl" aria-hidden="true">
          <span className="animate-rise">💰</span>
          <span className="animate-rise [animation-delay:120ms]">🪙</span>
          <span className="animate-rise [animation-delay:240ms]">🎯</span>
        </div>
      ),
      cta: "Get Started",
    },
    {
      key: "journey",
      emoji: "🧭",
      title: "How Spendly works",
      sub: "Six simple steps — you'll move through them naturally.",
      body: (
        <ol className="space-y-2 text-left">
          {JOURNEY.map((j, i) => (
            <li
              key={j.step}
              className="glass-card animate-rise flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="text-xl" aria-hidden="true">
                {j.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold tracking-wide">
                  {i + 1}. {j.step}
                </span>
                <span className="block text-xs text-muted-foreground">{j.desc}</span>
              </span>
            </li>
          ))}
        </ol>
      ),
      cta: "Next",
    },
    {
      key: "spending",
      emoji: "📊",
      title: "Track & understand",
      sub: "Every rupee gets a story, not just a number.",
      body: (
        <div className="grid grid-cols-3 gap-2">
          {EXPENSE_CATEGORIES.slice(0, 6).map((c, i) => (
            <div
              key={c}
              className="glass-card animate-rise rounded-2xl px-2 py-4 text-center text-xs font-medium"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="block text-2xl" aria-hidden="true">
                {CATEGORY_META[c].emoji}
              </span>
              {c}
            </div>
          ))}
        </div>
      ),
      cta: "Next",
    },
    {
      key: "goals",
      emoji: "🎯",
      title: "Save & achieve",
      sub: "Spendly does the maths so you can enjoy the progress.",
      body: (
        <div className="flex flex-wrap justify-center gap-2">
          {GOAL_IDEAS.map((g, i) => (
            <span
              key={g.name}
              className="glass-card animate-rise rounded-full px-4 py-2 text-sm"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span aria-hidden="true">{g.emoji}</span> {g.name}
            </span>
          ))}
        </div>
      ),
      cta: "Next",
    },
    {
      key: "ai",
      emoji: "✨",
      title: "Meet Your AI Money Coach",
      sub: "Ask questions, understand your spending, learn about money and build better plans.",
      body: (
        <div className="glass-card animate-glow rounded-3xl p-5 text-sm text-muted-foreground">
          “You've saved ₹2,800 toward your ₹5,000 goal. Want three gentle ways to close the gap?”
        </div>
      ),
      cta: "Create My Money Plan",
    },
  ];

  const slide = slides[Math.min(step, slides.length - 1)]!;

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo size={34} animated />
          <span className="font-display text-2xl font-semibold">Spendly</span>
        </div>

        {step < slides.length ? (
          <div className="glass-card animate-rise rounded-[2rem] p-6 text-center">
            <div className="text-4xl" aria-hidden="true">
              {slide.emoji}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold">{slide.title}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{slide.sub}</p>
            <div className="my-6">{slide.body}</div>
            <Button className="h-12 w-full rounded-2xl text-base" onClick={() => setStep(step + 1)}>
              {slide.cta} <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </Button>
            <div className="mt-5 flex items-center justify-center gap-2">
              {slides.map((s, i) => (
                <span
                  key={s.key}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>
            <button
              className="mt-4 text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => loadDemo()}
            >
              Skip and explore with demo data
            </button>
          </div>
        ) : (
          <form
            className="glass-card animate-rise space-y-5 rounded-[2rem] p-6"
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <div>
              <h1 className="font-display text-xl font-semibold">Let's build your money plan</h1>
              <p className="text-sm text-muted-foreground">You can change any of this later in Settings.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ob-name">Your name</Label>
                <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl" placeholder="Aarav" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="ob-currency" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["₹", "$", "€", "£", "¥"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Money coming in each month</legend>
              {incomes.map((inc, idx) => (
                <div key={inc.id} className="flex items-center gap-2">
                  <Select
                    value={inc.type}
                    onValueChange={(v) =>
                      setIncomes(incomes.map((x) => (x.id === inc.id ? { ...x, type: v as IncomeType } : x)))
                    }
                  >
                    <SelectTrigger className="w-36 rounded-2xl" aria-label={`Income type ${idx + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    inputMode="decimal"
                    aria-label={`Income amount ${idx + 1}`}
                    value={inc.amount || ""}
                    placeholder="0"
                    onChange={(e) =>
                      setIncomes(
                        incomes.map((x) => (x.id === inc.id ? { ...x, amount: Number(e.target.value) || 0 } : x)),
                      )
                    }
                    className="rounded-2xl"
                  />
                  {incomes.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setIncomes(incomes.filter((x) => x.id !== inc.id))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">Remove income source</span>
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => setIncomes([...incomes, { id: uid("inc"), type: "Other", amount: 0 }])}
              >
                <Plus className="mr-1 size-4" aria-hidden="true" /> Add income source
              </Button>
              <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
                <span className="text-muted-foreground">Total monthly income</span>
                <span className="float-right font-display text-base font-semibold">
                  {formatMoney(totalIncome, currency)}
                </span>
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ob-ess">Regular expenses</Label>
                <Input id="ob-ess" inputMode="decimal" value={essentials} onChange={(e) => setEssentials(e.target.value)} className="rounded-2xl" placeholder="12000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-sav">Savings target</Label>
                <Input id="ob-sav" inputMode="decimal" value={savings} onChange={(e) => setSavings(e.target.value)} className="rounded-2xl" placeholder="8000" />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Your first savings goal (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {GOAL_IDEAS.map((g) => (
                  <button
                    type="button"
                    key={g.name}
                    onClick={() => {
                      setGoalEmoji(g.emoji);
                      setGoalName(g.name);
                    }}
                    aria-pressed={goalName === g.name}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs transition-all active:scale-95",
                      goalName === g.name ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <span aria-hidden="true">{g.emoji}</span> {g.name}
                  </button>
                ))}
              </div>
              <Input
                aria-label="Goal name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Goal name"
                className="rounded-2xl"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="Goal amount"
                  inputMode="decimal"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="Amount"
                  className="rounded-2xl"
                />
                <Input
                  aria-label="Goal deadline"
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </fieldset>

            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <div>
                <Label htmlFor="ob-age" className="text-sm">
                  I'm under 18
                </Label>
                <p className="text-xs text-muted-foreground">Switches investing content to learning mode.</p>
              </div>
              <Switch id="ob-age" checked={under18} onCheckedChange={setUnder18} />
            </div>

            <Button type="submit" className="h-12 w-full rounded-2xl text-base">
              Create my plan
            </Button>
            <button type="button" className="w-full text-xs text-muted-foreground underline underline-offset-4" onClick={() => loadDemo()}>
              Or explore Spendly with demo data
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
