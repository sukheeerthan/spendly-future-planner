import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  GraduationCap,
  Home,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AiCoach } from "@/components/spendly/AiCoach";
import { Blobs, Confetti, Logo, Wordmark } from "@/components/spendly/bits";
import { Onboarding } from "@/components/spendly/Onboarding";
import { QuickAdd } from "@/components/spendly/QuickAdd";
import { Button } from "@/components/ui/button";
import { useSpendly, usePrefs } from "@/lib/spendly/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/activity", label: "Activity", icon: BarChart3 },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/plan", label: "Plan", icon: Wallet },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/rewards", label: "Rewards", icon: Trophy },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { state, hydrated, celebration, clearCelebration } = useSpendly();
  const { prefs } = usePrefs();
  const [quickAdd, setQuickAdd] = useState(false);
  const [ai, setAi] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => clearCelebration(), 2600);
    return () => clearTimeout(t);
  }, [celebration, clearCelebration]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <Logo size={56} animated />
        <p className="font-display text-lg font-semibold">Spendly</p>
        <p className="text-sm text-muted-foreground">Spend smarter. Save better. Reach your goals.</p>
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <>
        <Blobs />
        <Onboarding />
      </>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <Blobs />
      <Confetti show={!!celebration && !prefs.reducedMotion} />
      {celebration ? (
        <div
          role="status"
          className="glass-card animate-rise fixed left-1/2 top-6 z-[101] -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-lift"
        >
          {celebration}
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 pb-28 pt-5 md:px-6 lg:pb-10">
        <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col justify-between lg:flex">
          <div>
            <Link to="/" className="mb-8 flex items-center rounded-2xl px-2 py-1">
              <Wordmark />
            </Link>
            <nav aria-label="Main" className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-accent text-accent-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="space-y-2">
            <Button className="h-12 w-full rounded-2xl" onClick={() => setQuickAdd(true)}>
              <Plus className="mr-1 size-4" aria-hidden="true" /> Quick add
            </Button>
            <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={() => setAi(true)}>
              <Sparkles className="mr-1 size-4 text-primary" aria-hidden="true" /> Ask Spendly AI
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 flex items-center justify-between lg:hidden">
            <Wordmark />
            <Button
              variant="outline"
              size="sm"
              className="animate-glow rounded-full"
              onClick={() => setAi(true)}
            >
              <Sparkles className="mr-1 size-4 text-primary" aria-hidden="true" /> AI
            </Button>
          </header>
          <main id="main" className="animate-rise">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="glass-card fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-3xl px-2 py-2 lg:hidden"
      >
        {NAV.slice(0, 2).map((item) => (
          <NavPill key={item.to} item={item} active={pathname === item.to} />
        ))}
        <button
          onClick={() => setQuickAdd(true)}
          className="-mt-8 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform active:scale-95"
        >
          <Plus className="size-6" aria-hidden="true" />
          <span className="sr-only">Add expense or income</span>
        </button>
        {NAV.slice(2, 4).map((item) => (
          <NavPill key={item.to} item={item} active={pathname === item.to} />
        ))}
        <NavPill item={NAV[6]} active={pathname === "/settings"} />
      </nav>

      <Button
        onClick={() => setAi(true)}
        className="animate-glow fixed bottom-24 right-4 z-40 hidden h-12 rounded-full pl-4 pr-5 shadow-lift lg:bottom-6 lg:flex"
      >
        <Sparkles className="mr-2 size-4" aria-hidden="true" /> Ask Spendly AI
      </Button>

      <QuickAdd open={quickAdd} onOpenChange={setQuickAdd} />
      <AiCoach open={ai} onOpenChange={setAi} />
    </div>
  );
}

function NavPill({
  item,
  active,
}: {
  item: { to: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <item.icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
