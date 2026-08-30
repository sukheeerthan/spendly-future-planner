import { createFileRoute } from "@tanstack/react-router";

import { SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  earnedRewards,
  formatMoney,
  REWARDS,
  rewardProgress,
  savingStreak,
  totalSaved,
  trackingStreak,
} from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards & streaks — Spendly" },
      {
        name: "description",
        content:
          "Earn badges for saving, keep your tracking streak alive and complete a daily money mission in Spendly.",
      },
      { property: "og:title", content: "Rewards & streaks — Spendly" },
      {
        property: "og:description",
        content: "Good money habits, made genuinely fun with badges, streaks and missions.",
      },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const { state, mission, completeMission } = useSpendly();
  const c = state.profile.currency;
  const earned = earnedRewards(state);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-3">
        <Tile emoji="🔥" label="Saving streak" value={`${savingStreak(state)} days`} />
        <Tile emoji="📊" label="Tracking streak" value={`${trackingStreak(state)} days`} />
        <Tile emoji="💰" label="Total saved" value={formatMoney(totalSaved(state), c)} />
      </section>

      <section>
        <SectionTitle eyebrow="Today" title="Daily money mission" />
        <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-6">
          <p className="font-medium">{mission.text}</p>
          <Button
            className="rounded-2xl"
            disabled={mission.done}
            onClick={() => completeMission()}
          >
            {mission.done ? "Completed 🎉" : "Mark complete"}
          </Button>
        </div>
      </section>

      <section>
        <SectionTitle
          eyebrow={`${earned.length} of ${REWARDS.length} unlocked`}
          title="Your badges"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REWARDS.map((r) => {
            const unlocked = earned.includes(r.id);
            const p = Math.round(rewardProgress(state, r.id) * 100);
            return (
              <div
                key={r.id}
                className={cn(
                  "glass-card rounded-3xl p-5 transition",
                  unlocked ? "shadow-lift" : "opacity-70",
                )}
              >
                <div className={cn("text-3xl", !unlocked && "grayscale")} aria-hidden="true">
                  {r.emoji}
                </div>
                <p className="mt-2 font-display font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
                <Progress value={unlocked ? 100 : p} className="mt-3" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {unlocked ? "Unlocked" : `${p}% there`}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tile({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="text-2xl" aria-hidden="true">
        {emoji}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
