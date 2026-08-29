import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { EmptyState, Money, Ring, SectionTitle, Stars } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CATEGORY_META,
  categoryTotals,
  formatMoney,
  goalPlan,
  inPeriod,
  sum,
  trackingStreak,
} from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spendly — Spend smarter. Save better. Reach your goals." },
      {
        name: "description",
        content:
          "Spendly is a premium money app that shows your safe-to-spend today, your money plan, savings goals, rewards and an AI money coach.",
      },
      { property: "og:title", content: "Spendly — Your money. Your goals. Your future." },
      {
        property: "og:description",
        content: "Track, understand, plan, save, learn and achieve — all in one calm money app.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, plan, health, insights, mission, completeMission } = useSpendly();
  const c = state.profile.currency;
  const today = state.transactions.filter((t) => t.kind === "expense" && inPeriod(t.date, "today"));
  const todayTotal = sum(today);
  const todayCats = categoryTotals(state.transactions, "today");
  const monthCats = categoryTotals(state.transactions, "month");
  const safePercent =
    plan.safeToday > 0 ? Math.min(100, ((plan.safeToday - todayTotal) / plan.safeToday) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const streak = trackingStreak(state);

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-2xl font-semibold">
          {greeting}, {state.profile.name || "friend"} 👋
        </p>
        <p className="text-sm text-muted-foreground">Here's your money today.</p>
      </div>

      {state.demoData ? (
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm">
          <span>
            <span className="mr-2 rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
              Demo data
            </span>
            You're exploring Spendly with a realistic sample month.
          </span>
          <Link to="/settings" className="text-sm font-medium text-primary underline underline-offset-4">
            Use my own data
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="hero-gradient shadow-lift relative overflow-hidden rounded-[2rem] p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Available balance
              </p>
              <Money
                value={plan.availableBalance}
                currency={c}
                className="mt-2 block font-display text-5xl font-semibold tabular-nums"
              />
              <p className="mt-1 text-sm text-muted-foreground">Updated just now</p>
            </div>
            <span className="animate-blob text-4xl" aria-hidden="true">
              👛
            </span>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <Stat label="Income" value={formatMoney(plan.totalIncome, c)} />
            <Stat label="Spent" value={formatMoney(plan.spentThisMonth, c)} />
            <Stat label="Saving plan" value={formatMoney(plan.savings, c)} />
          </dl>
        </section>

        <section className="glass-card rounded-[2rem] p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Safe to spend today
          </p>
          <div className="mt-3 flex justify-center">
            <Ring percent={safePercent}>
              <Money value={plan.safeToday} currency={c} className="font-display text-2xl font-semibold" />
              <span className="text-[11px] text-muted-foreground">left today</span>
            </Ring>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            You can comfortably spend up to{" "}
            <strong className="text-foreground">{formatMoney(Math.round(plan.safeToday), c)}</strong> today while
            staying on track with your plan.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">This week</span>
            <strong>{formatMoney(Math.round(plan.safeWeek), c)}</strong>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Spendly estimate · adjust it in{" "}
            <Link to="/plan" className="underline underline-offset-2">
              My Money Plan
            </Link>
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-card rounded-[2rem] p-6 lg:col-span-2">
          <SectionTitle
            eyebrow="Today"
            title={`Spent ${formatMoney(todayTotal, c)}`}
            action={
              <Link to="/activity" className="text-sm font-medium text-primary">
                All activity
              </Link>
            }
          />
          {todayCats.length === 0 ? (
            <EmptyState
              emoji="✨"
              title="Your money story starts here"
              body="Add your first expense to start understanding your spending."
            />
          ) : (
            <ul className="space-y-2">
              {todayCats.map((cat) => (
                <li
                  key={cat.label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-xl" aria-hidden="true">
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{cat.label}</p>
                    <Progress value={cat.percent} className="mt-1.5 h-1.5" />
                  </div>
                  <span className="font-display text-sm font-semibold tabular-nums">
                    {formatMoney(cat.value, c)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card rounded-[2rem] p-6">
          <SectionTitle eyebrow="Today's money mission" title={mission.text} />
          <p className="text-sm text-muted-foreground">
            Small daily wins beat big restrictions. Keep your streak alive 🔥
          </p>
          <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm">
            🔥 {streak} day tracking streak
          </div>
          <Button
            className="mt-4 h-11 w-full rounded-2xl"
            variant={mission.done ? "outline" : "default"}
            disabled={mission.done}
            onClick={completeMission}
          >
            {mission.done ? "Mission complete 🎉" : "Mark as done"}
          </Button>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-[2rem] p-6">
          <SectionTitle eyebrow="This month" title="Where did my money go?" />
          {monthCats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Log a few expenses and your breakdown appears here.</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthCats}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {monthCats.map((cat) => (
                        <Cell key={cat.label} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [formatMoney(v, c), n]}
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-popover)",
                        color: "var(--color-popover-foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {monthCats.slice(0, 6).map((cat) => (
                  <li key={cat.label} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: cat.color }} aria-hidden="true" />
                    <span className="truncate">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {Math.round(cat.percent)}%
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                💡 <strong>{monthCats[0]!.label}</strong> is currently your highest spending category.
              </div>
            </>
          )}
        </section>

        <div className="space-y-4">
          <section className="glass-card rounded-[2rem] p-6">
            <SectionTitle eyebrow="Money health" title={`${health.score} / 100`} />
            <p className="mb-3 text-sm text-muted-foreground">
              This measures habits, not wealth. It moves when you track, plan and save consistently.
            </p>
            <Progress value={health.score} className="h-2" />
            <div className="mt-4 space-y-2">
              <Stars label="Saving habits" value={health.savingHabits} />
              <Stars label="Goal progress" value={health.goalProgress} />
              <Stars label="Budget consistency" value={health.budgetConsistency} />
              <Stars label="Expense tracking" value={health.tracking} />
            </div>
            <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                One thing to improve
              </p>
              <p className="mt-1">{health.improvement}</p>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-6">
            <SectionTitle eyebrow="Money insight" title="Spendly noticed 💡" />
            <ul className="space-y-2">
              {insights.slice(0, 3).map((ins) => (
                <li key={ins.title} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                  <p className="font-medium">
                    <span aria-hidden="true">{ins.emoji}</span> {ins.title}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{ins.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="glass-card rounded-[2rem] p-6">
        <SectionTitle
          eyebrow="Goals"
          title="What you're saving for"
          action={
            <Link to="/goals" className="text-sm font-medium text-primary">
              Manage goals
            </Link>
          }
        />
        {state.goals.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="What are you saving for?"
            body="Create your first goal and Spendly will work out the daily and weekly savings for you."
            action={
              <Button asChild className="rounded-2xl">
                <Link to="/goals">Create your first goal</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.goals.map((g) => {
              const p = goalPlan(g);
              return (
                <Link
                  key={g.id}
                  to="/goals"
                  className="rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {g.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(p.saved, c)} / {formatMoney(g.target, c)}
                      </p>
                    </div>
                    <span className="font-display text-sm font-semibold">{Math.round(p.percent)}%</span>
                  </div>
                  <Progress value={p.percent} className="mt-3 h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.completed
                      ? "Goal complete 🏆"
                      : `${formatMoney(Math.ceil(p.perDay), c)}/day · ${p.daysLeft} days left`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink to="/plan" emoji="🛒" title="Can I buy this?" body="Check a purchase against your plan." />
        <QuickLink to="/plan" emoji="🔮" title="Future Me" body="See what consistent saving could build." />
        <QuickLink to="/learn" emoji="📈" title="Learn investing" body="Risk, returns and jargon, simply." />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/70 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function QuickLink({
  to,
  emoji,
  title,
  body,
}: {
  to: string;
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="glass-card group flex items-center gap-3 rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
    >
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}
