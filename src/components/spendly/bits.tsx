import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/spendly/calc";

export function Logo({ size = 36, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Spendly logo"
      className={animated ? "animate-rise" : undefined}
    >
      <defs>
        <linearGradient id="spendly-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-chart-3)" />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="4"
        opacity="0.6"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="url(#spendly-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="126"
        strokeDashoffset="40"
        transform="rotate(-90 24 24)"
      >
        {animated ? (
          <animate
            attributeName="stroke-dashoffset"
            from="126"
            to="40"
            dur="1.1s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.22 1 0.36 1"
          />
        ) : null}
      </circle>
      <rect x="13" y="18" width="22" height="15" rx="5" fill="url(#spendly-grad)" opacity="0.16" />
      <rect
        x="13"
        y="18"
        width="22"
        height="15"
        rx="5"
        fill="none"
        stroke="url(#spendly-grad)"
        strokeWidth="2.5"
      />
      <path
        d="M18 29l4.5-5 3.5 3.2 5-6.2"
        fill="none"
        stroke="url(#spendly-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M28 21h3.5v3.5" fill="none" stroke="url(#spendly-grad)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo size={30} />
      <span className="font-display text-xl font-semibold tracking-tight">Spendly</span>
    </span>
  );
}

export function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const initial = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(initial + (value - initial) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function Money({
  value,
  currency = "₹",
  className,
  animate = true,
}: {
  value: number;
  currency?: string;
  className?: string;
  animate?: boolean;
}) {
  const shown = useCountUp(animate ? value : value);
  return <span className={className}>{formatMoney(Math.round(shown), currency)}</span>;
}

export function Ring({
  percent,
  size = 132,
  stroke = 12,
  children,
  tone = "var(--color-primary)",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  tone?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Blobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-blob absolute -left-24 -top-24 h-80 w-80 rounded-full bg-lilac opacity-60 blur-3xl" />
      <div className="animate-blob absolute right-[-6rem] top-32 h-96 w-96 rounded-full bg-sky opacity-50 blur-3xl [animation-delay:-6s]" />
      <div className="animate-blob absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-mint opacity-45 blur-3xl [animation-delay:-11s]" />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-lg font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 26 }, (_, i) => i);
  const colors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute top-0 h-2.5 w-2.5 rounded-[2px]"
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti-fall ${1.8 + (i % 5) * 0.25}s ease-in forwards`,
            animationDelay: `${(i % 7) * 0.08}s`,
            ["--dx" as string]: `${((i % 9) - 4) * 12}px`,
          }}
        />
      ))}
    </div>
  );
}

export function Stars({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        <span aria-hidden="true" className="tracking-tight">
          {"★".repeat(value)}
          <span className="text-muted-foreground/40">{"★".repeat(5 - value)}</span>
        </span>
        <span className="sr-only">{value} out of 5</span>
        <span className="text-xs font-medium text-muted-foreground">{value}/5</span>
      </span>
    </div>
  );
}
