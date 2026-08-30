import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SectionTitle } from "@/components/spendly/bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatMoney, simulateInvestment } from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn investing, simply — Spendly" },
      {
        name: "description",
        content:
          "Understand savings, mutual funds, stocks and risk in plain language, and try a compounding simulator built for learning.",
      },
      { property: "og:title", content: "Learn investing, simply — Spendly" },
      {
        property: "og:description",
        content: "Risk levels, jargon decoded and a hands-on growth simulator — education only.",
      },
    ],
  }),
  component: LearnPage,
});

const OPTIONS = [
  { name: "Savings account", risk: 1, typical: "3–4% a year", note: "Very safe, easy to withdraw." },
  { name: "Fixed deposit", risk: 2, typical: "6–7% a year", note: "Locked for a set time." },
  { name: "Debt mutual fund", risk: 3, typical: "6–8% a year", note: "Lends money to companies/government." },
  { name: "Index fund", risk: 4, typical: "10–12% long term", note: "Follows a whole market index." },
  { name: "Individual stocks", risk: 5, typical: "Very unpredictable", note: "One company's fortunes." },
];

const LESSONS = [
  {
    q: "What is compounding?",
    a: "Your returns start earning returns too. Small amounts kept invested for a long time grow much faster than the same amount kept for a short time.",
  },
  {
    q: "What is risk?",
    a: "Risk is how much your money can move up and down. Higher possible returns almost always come with bigger drops along the way.",
  },
  {
    q: "What is diversification?",
    a: "Spreading money across many things so one bad outcome can't hurt everything at once.",
  },
  {
    q: "What is an emergency fund?",
    a: "Money kept somewhere safe and easy to reach, usually 3–6 months of essential costs, for surprises.",
  },
  {
    q: "SIP vs lump sum?",
    a: "A SIP invests a fixed amount regularly; a lump sum invests everything at once. Regular investing smooths out price ups and downs.",
  },
  {
    q: "Inflation, in one line?",
    a: "Prices rise over time, so money left idle slowly buys less than it does today.",
  },
];

function LearnPage() {
  const { state } = useSpendly();
  const c = state.profile.currency;
  const [monthly, setMonthly] = useState(1000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(10);
  const points = simulateInvestment(0, monthly, years, rate);
  const last = points[points.length - 1];

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle eyebrow="Education only" title="Learn about investing" />
        <div className="glass-card rounded-3xl p-6 text-sm text-muted-foreground">
          Spendly explains how money grows — it never recommends what to buy or sell, and it isn't
          financial advice. Nothing here is a guaranteed return.
        </div>
      </section>

      <section>
        <SectionTitle title="Where money can go" />
        <div className="grid gap-3 md:grid-cols-2">
          {OPTIONS.map((o) => (
            <div key={o.name} className="glass-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-semibold">{o.name}</p>
                <div className="flex gap-1" aria-label={`Risk ${o.risk} of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`size-2 rounded-full ${i <= o.risk ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{o.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">Typically: {o.typical}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Simulator" title="See how compounding works" />
        <div className="glass-card rounded-3xl p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <Label>Monthly amount: {formatMoney(monthly, c)}</Label>
              <Slider
                className="mt-3"
                min={100}
                max={20000}
                step={100}
                value={[monthly]}
                onValueChange={(v) => setMonthly(v[0] ?? 100)}
              />
            </div>
            <div>
              <Label>Years: {years}</Label>
              <Slider
                className="mt-3"
                min={1}
                max={30}
                step={1}
                value={[years]}
                onValueChange={(v) => setYears(v[0] ?? 1)}
              />
            </div>
            <div>
              <Label>Assumed yearly growth: {rate}%</Label>
              <Slider
                className="mt-3"
                min={1}
                max={15}
                step={1}
                value={[rate]}
                onValueChange={(v) => setRate(v[0] ?? 1)}
              />
            </div>
          </div>

          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={60} />
                <Tooltip formatter={(v: number) => formatMoney(v, c)} />
                <Line type="monotone" dataKey="invested" stroke="var(--color-chart-3)" dot={false} />
                <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {last ? (
            <p className="mt-3 text-sm text-muted-foreground">
              You'd put in <strong>{formatMoney(last.invested, c)}</strong> and, at this assumed
              rate, it could become <strong>{formatMoney(last.value, c)}</strong>. Real markets go
              up and down — this is a learning tool, not a promise.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <SectionTitle title="Money words, decoded" />
        <div className="glass-card rounded-3xl px-5 py-2">
          <Accordion type="single" collapsible>
            {LESSONS.map((l) => (
              <AccordionItem key={l.q} value={l.q}>
                <AccordionTrigger className="text-left">{l.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{l.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
