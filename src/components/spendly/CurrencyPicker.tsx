import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/spendly/calc";
import { CURRENCIES, findCurrency, findCurrencyBySymbol } from "@/lib/spendly/currencies";
import { getExchangeRate, type RateResult } from "@/lib/spendly/rates.functions";
import { useSpendly } from "@/lib/spendly/store";

export function CurrencyPicker() {
  const { state, changeCurrency } = useSpendly();
  const fetchRate = useServerFn(getExchangeRate);

  const current =
    findCurrency(state.profile.currencyCode ?? findCurrencyBySymbol(state.profile.currency)?.code);
  const [target, setTarget] = useState(current.code);
  const [convert, setConvert] = useState(true);
  const [rate, setRate] = useState<RateResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTarget(current.code);
  }, [current.code]);

  useEffect(() => {
    let alive = true;
    if (target === current.code) {
      setRate(null);
      return;
    }
    setLoading(true);
    fetchRate({ data: { base: current.code, target } })
      .then((r) => {
        if (alive) setRate(r);
      })
      .catch(() => {
        if (alive) setRate(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [target, current.code, fetchRate]);

  const next = findCurrency(target);
  const changed = target !== current.code;
  const live = rate?.source === "live";

  function apply() {
    if (!changed) return;
    if (convert && !live) {
      toast.error("Live rate unavailable right now — turn off converting or try again.");
      return;
    }
    changeCurrency({
      code: next.code,
      symbol: next.symbol,
      rate: rate?.rate ?? 1,
      convert,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Current currency</Label>
          <p className="rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
            {current.symbol.trim()} · {current.code} — {current.name}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency-select">Switch to</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="currency-select" className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol.trim()} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
        <div>
          <p className="font-medium">Convert my existing amounts</p>
          <p className="text-sm text-muted-foreground">
            Income, spending and goals are recalculated with today's rate. Turn this off to only
            change the symbol.
          </p>
        </div>
        <Switch
          checked={convert}
          onCheckedChange={setConvert}
          aria-label="Convert my existing amounts"
        />
      </div>

      {changed ? (
        <div className="rounded-2xl bg-primary/10 p-4 text-sm" role="status" aria-live="polite">
          {loading ? (
            <p>Getting today's rate…</p>
          ) : live ? (
            <>
              <p className="font-medium">
                1 {current.code} = {rate?.rate.toFixed(4)} {next.code}
              </p>
              <p className="mt-1 text-muted-foreground">
                Example: {formatMoney(1000, current.symbol)} becomes{" "}
                {formatMoney(Math.round(1000 * (rate?.rate ?? 1)), next.symbol)} · updated{" "}
                {rate?.updated}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Today's rate isn't available right now. You can still switch the symbol without
              converting.
            </p>
          )}
        </div>
      ) : null}

      <Button className="rounded-2xl" disabled={!changed || loading} onClick={apply}>
        {convert ? "Switch & convert" : "Switch currency"}
      </Button>
    </div>
  );
}
