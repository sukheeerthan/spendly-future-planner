import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_META, EXPENSE_CATEGORIES, MOOD_META, todayISO } from "@/lib/spendly/calc";
import { useSpendly, usePrefs } from "@/lib/spendly/store";
import type { ExpenseCategory, IncomeType, Mood, PaymentMethod } from "@/lib/spendly/types";
import { cn } from "@/lib/utils";

const METHODS: PaymentMethod[] = ["Cash", "Card", "UPI", "Bank", "Other"];
const INCOME_TYPES: IncomeType[] = ["Salary", "Allowance", "Freelance", "Part-time", "Gift", "Other"];

export function QuickAdd({
  open,
  onOpenChange,
  defaultTab = "expense",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab?: "expense" | "income";
}) {
  const { addTransaction } = useSpendly();
  const { prefs } = usePrefs();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [error, setError] = useState("");

  const [inAmount, setInAmount] = useState("");
  const [source, setSource] = useState<IncomeType>("Freelance");
  const [inDate, setInDate] = useState(todayISO());
  const [inNote, setInNote] = useState("");
  const [inError, setInError] = useState("");

  function reset() {
    setAmount("");
    setNote("");
    setMood(undefined);
    setError("");
    setInAmount("");
    setInNote("");
    setInError("");
  }

  function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Please enter an amount greater than 0.");
      return;
    }
    addTransaction({
      kind: "expense",
      amount: value,
      label: category,
      date,
      method,
      note: note || undefined,
      mood,
    });
    reset();
    onOpenChange(false);
  }

  function submitIncome(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(inAmount);
    if (!value || value <= 0) {
      setInError("Please enter an amount greater than 0.");
      return;
    }
    addTransaction({
      kind: "income",
      amount: value,
      label: source,
      date: inDate,
      note: inNote || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Quick add</DialogTitle>
          <DialogDescription>Log what came in or went out. It updates your whole plan.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="expense" className="rounded-xl">
              💸 Expense
            </TabsTrigger>
            <TabsTrigger value="income" className="rounded-xl">
              💰 Income
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expense">
            <form className="space-y-4 pt-4" onSubmit={submitExpense}>
              <div className="space-y-2">
                <Label htmlFor="exp-amount">Amount</Label>
                <Input
                  id="exp-amount"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  aria-invalid={!!error}
                  aria-describedby={error ? "exp-error" : undefined}
                  className="h-14 rounded-2xl text-2xl font-semibold"
                />
                {error ? (
                  <p id="exp-error" role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Category</legend>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={cn(
                        "rounded-2xl border px-2 py-3 text-xs font-medium transition-all active:scale-95",
                        category === c
                          ? "border-primary bg-accent text-accent-foreground shadow-soft"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <span className="block text-lg" aria-hidden="true">
                        {CATEGORY_META[c].emoji}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="exp-date">Date</Label>
                  <Input
                    id="exp-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-method">Payment</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger id="exp-method" className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exp-note">Note (optional)</Label>
                <Textarea
                  id="exp-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-2xl"
                  placeholder="Lunch with friends"
                />
              </div>

              {prefs.moodTracking ? (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">How did this purchase feel? (optional)</legend>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_META.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        aria-pressed={mood === m.key}
                        onClick={() => setMood(mood === m.key ? undefined : (m.key as Mood))}
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs transition-all active:scale-95",
                          mood === m.key ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
                        )}
                      >
                        <span aria-hidden="true">{m.emoji}</span> {m.key}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <Button type="submit" className="h-12 w-full rounded-2xl text-base">
                Add Expense
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="income">
            <form className="space-y-4 pt-4" onSubmit={submitIncome}>
              <div className="space-y-2">
                <Label htmlFor="inc-amount">Amount</Label>
                <Input
                  id="inc-amount"
                  inputMode="decimal"
                  placeholder="0"
                  value={inAmount}
                  onChange={(e) => {
                    setInAmount(e.target.value);
                    setInError("");
                  }}
                  aria-invalid={!!inError}
                  className="h-14 rounded-2xl text-2xl font-semibold"
                />
                {inError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {inError}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="inc-source">Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as IncomeType)}>
                  <SelectTrigger id="inc-source" className="rounded-2xl">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="inc-date">Date</Label>
                <Input
                  id="inc-date"
                  type="date"
                  value={inDate}
                  onChange={(e) => setInDate(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inc-note">Note (optional)</Label>
                <Textarea
                  id="inc-note"
                  rows={2}
                  value={inNote}
                  onChange={(e) => setInNote(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <Button type="submit" className="h-12 w-full rounded-2xl text-base">
                Add Income
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
