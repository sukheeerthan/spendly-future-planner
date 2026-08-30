import { createFileRoute } from "@tanstack/react-router";

import { SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSpendly, usePrefs } from "@/lib/spendly/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Spendly" },
      {
        name: "description",
        content:
          "Update your profile and currency, switch theme, tune accessibility, control AI access and manage your Spendly data.",
      },
      { property: "og:title", content: "Settings — Spendly" },
      {
        property: "og:description",
        content: "Personalise Spendly: theme, accessibility, AI privacy and your data.",
      },
    ],
  }),
  component: SettingsPage,
});

const TOGGLES = [
  ["theme", "Dark mode", "A calm, premium night palette."],
  ["reducedMotion", "Reduce motion", "Turns off animations and confetti."],
  ["largeText", "Larger text", "Increases text size across the app."],
  ["notifications", "Reminders", "Gentle nudges to log and save."],
  ["aiInsights", "AI insights", "Let Spendly suggest smarter money moves."],
  ["aiDataAccess", "Let AI read my data", "Share your numbers with the coach for tailored answers."],
  ["moodTracking", "Mood tracking", "Ask how you felt about a spend."],
] as const;

function SettingsPage() {
  const { state, update, loadDemo, resetAll } = useSpendly();
  const { prefs, setPref } = usePrefs();

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle eyebrow="You" title="Profile" />
        <div className="glass-card grid gap-4 rounded-3xl p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={state.profile.name}
              onChange={(e) =>
                update((s) => ({ ...s, profile: { ...s.profile, name: e.target.value } }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency symbol</Label>
            <Input
              id="currency"
              value={state.profile.currency}
              onChange={(e) =>
                update((s) => ({ ...s, profile: { ...s.profile, currency: e.target.value } }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4 md:col-span-2">
            <div>
              <p className="font-medium">I'm under 18</p>
              <p className="text-sm text-muted-foreground">
                Keeps the AI coach focused on learning and safe money habits.
              </p>
            </div>
            <Switch
              checked={state.profile.under18}
              onCheckedChange={(v) =>
                update((s) => ({ ...s, profile: { ...s.profile, under18: v } }))
              }
              aria-label="I'm under 18"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Experience" title="Appearance, access & AI" />
        <div className="glass-card divide-y divide-border/60 rounded-3xl p-2">
          {TOGGLES.map(([key, label, desc]) => {
            const checked = key === "theme" ? prefs.theme === "dark" : Boolean(prefs[key]);
            return (
              <div key={key} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={checked}
                  aria-label={label}
                  onCheckedChange={(v) =>
                    key === "theme" ? setPref("theme", v ? "dark" : "light") : setPref(key, v)
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Data" title="Your data stays on this device" />
        <div className="glass-card flex flex-wrap gap-3 rounded-3xl p-6">
          <Button variant="outline" className="rounded-2xl" onClick={() => loadDemo()}>
            Load demo data
          </Button>
          <Button variant="destructive" className="rounded-2xl" onClick={() => resetAll()}>
            Clear all data
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Spendly saves everything in your browser only. Clearing data can't be undone.
          </p>
        </div>
      </section>
    </div>
  );
}
