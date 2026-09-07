import { createServerFn } from "@tanstack/react-start";

export interface RateResult {
  base: string;
  target: string;
  rate: number;
  updated: string;
  source: "live" | "unavailable";
  error?: string;
}

/** Live exchange rate between two currency codes (free, key-less provider). */
export const getExchangeRate = createServerFn({ method: "GET" })
  .inputValidator((input: { base: string; target: string }) => {
    const clean = (v: string) => String(v ?? "").toUpperCase().slice(0, 3);
    const base = clean(input.base);
    const target = clean(input.target);
    if (base.length !== 3 || target.length !== 3) throw new Error("Invalid currency code");
    return { base, target };
  })
  .handler(async ({ data }): Promise<RateResult> => {
    const { base, target } = data;
    if (base === target) {
      return { base, target, rate: 1, updated: new Date().toISOString(), source: "live" };
    }
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!res.ok) throw new Error(`rate service responded ${res.status}`);
      const json = (await res.json()) as {
        result?: string;
        time_last_update_utc?: string;
        rates?: Record<string, number>;
      };
      const rate = json.rates?.[target];
      if (json.result !== "success" || typeof rate !== "number") {
        throw new Error("rate unavailable");
      }
      return {
        base,
        target,
        rate,
        updated: json.time_last_update_utc ?? new Date().toISOString(),
        source: "live",
      };
    } catch (err) {
      return {
        base,
        target,
        rate: 1,
        updated: new Date().toISOString(),
        source: "unavailable",
        error: err instanceof Error ? err.message : "Could not reach the rate service",
      };
    }
  });
