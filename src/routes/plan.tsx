import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Money, SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { canIBuy, formatMoney, projectSavings } from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Money plan, Future Me & Can I Buy This? — Spendly" },
      {
        name: "description",
        content:
          "See where every rupee goes, check purchases against your plan, and project what steady saving builds over time.",
      },
      { property: "og:title", content: "Your money plan — Spendly" },
      {
        property: "og:description",
        content: "Essentials, savings, goals and flexible money — planned in one clear view.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { state, plan, update } = useSpendly();
  const c = state.profile.currency;
  const [price, setPrice] = useState("");
  const [perDay, setPerDay] = useState(50);
  const parsed = Number(price);
  const check = parsed > 0 ? canIBuy(parsed, state, plan) : null;

  const buckets = [
    { label: "Essentials", value: plan.essentials, tone: "bg-chart-1" },
    { label: "Savings", value: plan.savings, tone: "bg-chart-2" },
    { label: "Goals", value: plan.goals, tone: "bg-chart-3" },
    { label: "Flexible", value: plan.flexible, tone: "bg-chart-4" },
  ];
  const total = Math.max(1, plan.totalIncome);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle eyebrow="This month" title="Your money plan" />
        <div className="glass-card rounded-3xl p-6">
          <p className="text-sm text-muted-foreground">Total income</p>
          <Money value={plan.totalIncome} currency={c} className="font-display text-3xl font-semibold" />
          <div className="mt-5 space-y-4">
            {buckets.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{b.label}</span>
                  <span className="text-muted-foreground">{formatMoney(b.value, c)}</span>
                </div>
                <Progress value={(b.value / total) * 100} />
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Stat label="Spent this month" value={formatMoney(plan.spentThisMonth, c)} />
            <Stat label="Flexible left" value={formatMoney(plan.flexibleRemaining, c)} />
            <Stat label="Safe today" value={formatMoney(Math.round(plan.safeToday), c)} />
            <Stat label="Safe this week" value={formatMoney(Math.round(plan.safeWeek), c)} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Adjust" title="Tune your plan" />
        <div className="glass-card grid gap-4 rounded-3xl p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="essentials">Monthly essentials</Label>
            <Input
              id="essentials"
              inputMode="decimal"
              value={state.profile.essentials || ""}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  profile: { ...s.profile, essentials: Number(e.target.value) || 0 },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="savings-target">Monthly savings target</Label>
            <Input
              id="savings-target"
              inputMode="decimal"
              value={state.profile.savingsTarget || ""}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  profile: { ...s.profile, savingsTarget: Number(e.target.value) || 0 },
                }))
              }
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Smart check" title="Can I buy this?" />
        <div className="glass-card rounded-3xl p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1 space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                inputMode="decimal"
                placeholder="1200"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <Button variant="outline" className="rounded-2xl" onClick={() => setPrice("")}>
              Clear
            </Button>
          </div>
          {check ? (
            <div
              className={`mt-5 rounded-2xl p-4 text-sm ${
                check.fits ? "bg-primary/10" : "bg-destructive/10"
              }`}
              role="status"
            >
              <p className="font-display text-base font-semibold">
                {check.fits ? "Yes — this fits your plan ✅" : "Maybe wait a little ⏳"}
              </p>
              <p className="mt-1 text-muted-foreground">{check.message}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Enter a price and Spendly checks it against your flexible money and your goals.
            </p>
          )}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Future Me" title="What steady saving builds" />
        <div className="glass-card rounded-3xl p-6">
          <Label htmlFor="perday" className="text-sm">
            If I save {formatMoney(perDay, c)} a day
          </Label>
          <Slider
            id="perday"
            className="mt-4"
            min={10}
            max={1000}
            step={10}
            value={[perDay]}
            onValueChange={(v) => setPerDay(v[0] ?? 10)}
          />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {projectSavings(perDay).map((p) => (
              <div key={p.days} className="rounded-2xl bg-muted/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">{p.days} days</p>
                <p className="font-display text-lg font-semibold">{formatMoney(p.amount, c)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            A simple projection of money set aside — it doesn't include interest or returns.
          </p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
