import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState, Ring, SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatMoney, goalPlan, todayISO } from "@/lib/spendly/calc";
import { useSpendly } from "@/lib/spendly/store";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Savings goals — Spendly" },
      {
        name: "description",
        content:
          "Create savings goals, see exactly how much to save per day, week and month, and celebrate every milestone.",
      },
      { property: "og:title", content: "Savings goals — Spendly" },
      {
        property: "og:description",
        content: "Turn wishes into plans with per-day savings targets and progress rings.",
      },
    ],
  }),
  component: GoalsPage,
});

const EMOJIS = ["🎯", "🎧", "🏖️", "💻", "📱", "🚲", "🎓", "🎁", "🚗", "🏠"];

function GoalsPage() {
  const { state, goals: _unused, addGoal, deleteGoal, contribute } = useSpendly() as ReturnType<
    typeof useSpendly
  > & { goals?: never };
  const c = state.profile.currency;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  void _unused;

  const create = () => {
    const t = Number(target);
    if (!name.trim() || !t || t <= 0 || !deadline) return;
    addGoal({ name: name.trim(), emoji, target: t, deadline });
    setName("");
    setTarget("");
    setDeadline("");
    setEmoji("🎯");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle eyebrow="Small amounts, saved often" title="Savings goals" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl">
              <Plus className="mr-1 size-4" aria-hidden="true" /> New goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">What are you saving for?</Label>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New headphones"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Icon</span>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      aria-pressed={emoji === e}
                      className={`size-10 rounded-2xl text-lg transition ${
                        emoji === e ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="goal-target">Target amount</Label>
                  <Input
                    id="goal-target"
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-deadline">Target date</Label>
                  <Input
                    id="goal-deadline"
                    type="date"
                    min={todayISO()}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} className="rounded-2xl">
                Create goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {state.goals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="No goals yet"
          body="Add your first goal and Spendly will tell you how much to save each day."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.goals.map((g) => {
            const p = goalPlan(g);
            return (
              <div key={g.id} className="glass-card rounded-3xl p-5">
                <div className="flex items-start gap-4">
                  <Ring value={p.percent} size={78} label={`${g.name} progress`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-semibold">
                          {g.emoji} {g.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatMoney(p.saved, c)} of {formatMoney(g.target, c)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => deleteGoal(g.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Delete {g.name}</span>
                      </Button>
                    </div>
                    <Progress value={p.percent} className="mt-3" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ["Per day", p.perDay],
                    ["Per week", p.perWeek],
                    ["Per month", p.perMonth],
                  ].map(([label, v]) => (
                    <div key={label as string} className="rounded-2xl bg-muted/60 p-3">
                      <p className="text-muted-foreground">{label as string}</p>
                      <p className="font-semibold">{formatMoney(Math.ceil(v as number), c)}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {p.completed
                    ? "Goal complete — amazing work! 🎉"
                    : `${p.daysLeft} days left · ${formatMoney(p.remaining, c)} to go`}
                </p>

                <div className="mt-4 flex gap-2">
                  <Input
                    inputMode="decimal"
                    aria-label={`Amount to add to ${g.name}`}
                    placeholder="Add amount"
                    value={amounts[g.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [g.id]: e.target.value }))}
                  />
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      const v = Number(amounts[g.id]);
                      if (!v || v <= 0) return;
                      contribute(g.id, v);
                      setAmounts((a) => ({ ...a, [g.id]: "" }));
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
