import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATEGORY_META,
  categoryTotals,
  dailySeries,
  EXPENSE_CATEGORIES,
  formatMoney,
  inPeriod,
  sum,
  type Period,
} from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";
import type { ExpenseCategory, Transaction } from "@/lib/spendly/types";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity & spending history — Spendly" },
      {
        name: "description",
        content:
          "Filter your spending by day, week, month or year, search transactions and see your spending patterns in Spendly.",
      },
      { property: "og:title", content: "Activity & spending history — Spendly" },
      { property: "og:description", content: "See where your money went, with charts and clear totals." },
    ],
  }),
  component: Activity,
});

function Activity() {
  const { state, deleteTransaction, updateTransaction } = useSpendly();
  const c = state.profile.currency;
  const [period, setPeriod] = useState<Period>("week");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const filtered = useMemo(
    () =>
      state.transactions
        .filter((t) => inPeriod(t.date, period))
        .filter((t) => category === "all" || t.label === category)
        .filter((t) =>
          query
            ? `${t.label} ${t.note ?? ""} ${t.method ?? ""} ${t.amount}`
                .toLowerCase()
                .includes(query.toLowerCase())
            : true,
        )
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.transactions, period, category, query],
  );

  const expenses = filtered.filter((t) => t.kind === "expense");
  const incomes = filtered.filter((t) => t.kind === "income");
  const totalSpent = sum(expenses);
  const byDay = new Map<string, number>();
  expenses.forEach((t) => byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amount));
  const highestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const avgDaily = byDay.size > 0 ? totalSpent / byDay.size : 0;
  const cats = categoryTotals(state.transactions, period);
  const series = dailySeries(state.transactions, period === "today" ? 7 : period === "week" ? 14 : 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">Every rupee, in context.</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid w-full grid-cols-4 rounded-2xl">
          <TabsTrigger value="today" className="rounded-xl">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="rounded-xl">
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="rounded-xl">
            Month
          </TabsTrigger>
          <TabsTrigger value="year" className="rounded-xl">
            Year
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total spending" value={formatMoney(totalSpent, c)} />
        <Metric label="Total income" value={formatMoney(sum(incomes), c)} />
        <Metric label="Average daily" value={formatMoney(Math.round(avgDaily), c)} />
        <Metric
          label="Highest day"
          value={highestDay ? formatMoney(highestDay[1], c) : "—"}
          sub={highestDay ? new Date(highestDay[0]).toDateString().slice(0, 10) : "No spending yet"}
        />
      </div>

      <section className="glass-card rounded-[2rem] p-6">
        <SectionTitle eyebrow="Trend" title="Daily spending" />
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -18, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={54} />
              <Tooltip
                formatter={(v: number) => formatMoney(v, c)}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#spendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {cats[0] ? (
          <p className="mt-3 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            💡 Highest category this {period}: <strong>{cats[0].label}</strong> ({formatMoney(cats[0].value, c)})
          </p>
        ) : null}
      </section>

      <section className="glass-card rounded-[2rem] p-6">
        <SectionTitle eyebrow="History" title={`${filtered.length} transactions`} />
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="rounded-2xl pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full rounded-2xl sm:w-48" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_META[cat].emoji} {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="Nothing here yet"
            body="Try a different period or add a transaction with the + button."
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <span className="text-xl" aria-hidden="true">
                  {t.kind === "income" ? "💰" : (CATEGORY_META[t.label as ExpenseCategory]?.emoji ?? "📦")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t.label}
                    {t.note ? <span className="text-muted-foreground"> · {t.note}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.date}
                    {t.method ? ` · ${t.method}` : ""}
                    {t.mood ? ` · felt ${t.mood}` : ""}
                  </p>
                </div>
                <span
                  className={`font-display text-sm font-semibold tabular-nums ${
                    t.kind === "income" ? "text-success" : ""
                  }`}
                >
                  {t.kind === "income" ? "+" : "−"}
                  {formatMoney(t.amount, c)}
                </span>
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setEditing(t)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  <span className="sr-only">Edit transaction</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => deleteTransaction(t.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Delete transaction</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit transaction</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  inputMode="decimal"
                  value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) || 0 })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              {editing.kind === "expense" ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-cat">Category</Label>
                  <Select
                    value={editing.label}
                    onValueChange={(v) => setEditing({ ...editing, label: v })}
                  >
                    <SelectTrigger id="edit-cat" className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_META[cat].emoji} {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="edit-note">Note</Label>
                <Input
                  id="edit-note"
                  value={editing.note ?? ""}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              onClick={() => {
                if (editing) {
                  updateTransaction(editing.id, {
                    amount: editing.amount,
                    date: editing.date,
                    label: editing.label,
                    note: editing.note,
                  });
                }
                setEditing(null);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-3xl px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
