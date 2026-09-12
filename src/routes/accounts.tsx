import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Link2, RefreshCw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, SectionTitle } from "@/components/spendly/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  categoriseDescription,
  INDIAN_BANKS,
  normaliseDate,
  parseAmount,
  parseCsv,
} from "@/lib/spendly/bank-shared";
import {
  addManualAccount,
  connectBankAccount,
  disconnectBankAccount,
  importStatementRows,
  syncBankAccount,
} from "@/lib/spendly/bank.functions";
import { BANK_QUERY_KEY, useBankData } from "@/lib/spendly/useBankData";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Bank accounts — Spendly" },
      {
        name: "description",
        content:
          "Connect your bank accounts to Spendly so income and spending sync automatically, or import a statement file to catch up in seconds.",
      },
      { property: "og:title", content: "Bank accounts — Spendly" },
      {
        property: "og:description",
        content: "Sync real income and spending from your bank into your Spendly money plan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const { signedIn, authLoading, data, isLoading, refetch } = useBankData();
  const { user, signOut } = useAuth();
  const qc = useQueryClient();
  const connect = useServerFn(connectBankAccount);
  const addManual = useServerFn(addManualAccount);
  const sync = useServerFn(syncBankAccount);
  const disconnect = useServerFn(disconnectBankAccount);
  const importRows = useServerFn(importStatementRows);

  const [bank, setBank] = useState<string>(INDIAN_BANKS[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualNumber, setManualNumber] = useState("");
  const [manualBalance, setManualBalance] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importTarget, setImportTarget] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: BANK_QUERY_KEY });
    void refetch();
  };

  if (authLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!signedIn) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="Accounts" title="Connect your real bank accounts" />
        <div className="glass-card space-y-4 rounded-3xl p-8 text-center">
          <Building2 className="mx-auto size-10 text-primary" aria-hidden="true" />
          <p className="text-lg font-medium">Sign in to link a bank</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Bank data is private, so it lives in your secure Spendly account instead of this
            browser. Your existing budget, goals and manual entries stay exactly as they are.
          </p>
          <Button asChild className="rounded-2xl">
            <Link to="/auth">Sign in or create an account</Link>
          </Button>
        </div>
      </div>
    );
  }

  const accounts = data?.accounts ?? [];
  const txns = data?.transactions ?? [];

  async function handleConnect() {
    setBusy("connect");
    try {
      const res = await connect({ data: { bankName: bank } });
      for (const acc of res.accounts) await sync({ data: { accountId: acc.id } });
      toast.success(`${bank} linked — transactions synced`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link that bank");
    } finally {
      setBusy(null);
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy("manual");
    try {
      await addManual({
        data: {
          bankName: manualName,
          maskedNumber: manualNumber,
          balance: Number(manualBalance) || 0,
          currency: "INR",
        },
      });
      setManualName("");
      setManualNumber("");
      setManualBalance("");
      toast.success("Account added — import a statement to fill it in");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that account");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(id: string) {
    setBusy(id);
    try {
      const res = await sync({ data: { accountId: id } });
      toast.success(res.manual ? "This account updates from statements" : `Synced ${res.added} transactions`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect(id: string) {
    setBusy(id);
    try {
      await disconnect({ data: { accountId: id, keepTransactions: true } });
      toast("Account disconnected — history kept");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(file: File) {
    if (!importTarget) return;
    setBusy(importTarget);
    try {
      const rows = parseCsv(await file.text());
      const header = (rows[0] ?? []).map((c) => c.toLowerCase());
      const idx = (...names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
      const dateI = idx("date");
      const descI = idx("description", "narration", "particulars", "details");
      const debitI = idx("withdraw", "debit");
      const creditI = idx("deposit", "credit");
      const amountI = idx("amount");

      const parsed = rows
        .slice(1)
        .map((r) => {
          const date = normaliseDate(r[dateI] ?? "");
          if (!date) return null;
          const description = (r[descI] ?? "Bank transaction").slice(0, 200);
          const debit = debitI >= 0 ? parseAmount(r[debitI] ?? "") : 0;
          const credit = creditI >= 0 ? parseAmount(r[creditI] ?? "") : 0;
          const fallback = amountI >= 0 ? parseAmount(r[amountI] ?? "") : 0;
          const amount = debit || credit || fallback;
          if (!amount) return null;
          const direction: "debit" | "credit" = credit && !debit ? "credit" : "debit";
          return {
            amount,
            direction,
            description,
            postedAt: date,
            category: direction === "credit" ? "Other" : categoriseDescription(description),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (parsed.length === 0) {
        toast.error("No transactions found in that file.");
        return;
      }
      const res = await importRows({ data: { accountId: importTarget, rows: parsed.slice(0, 1000) } });
      toast.success(`Imported ${res.added} transactions${res.skipped ? `, skipped ${res.skipped} duplicates` : ""}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(null);
      setImportTarget(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          eyebrow="Accounts"
          title="Your money, synced"
          subtitle={
            data?.live
              ? "Connected to your bank through India's secure Account Aggregator network."
              : "Running in safe demo mode — connect real banks by adding your provider keys."
          }
        />
        <div className="glass-card flex flex-wrap items-end gap-3 rounded-3xl p-6">
          <div className="min-w-52 flex-1 space-y-2">
            <Label>Choose your bank</Label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="rounded-2xl" onClick={handleConnect} disabled={busy === "connect"}>
            <Link2 className="mr-1 size-4" aria-hidden="true" />
            {busy === "connect" ? "Linking…" : "Link account"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Spendly only ever receives read-only transaction data, and you can disconnect anytime.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Linked" title="Accounts" />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your accounts…</p>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="No accounts yet"
            body="Link a bank above, or add an account manually and import its statement."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((a) => {
              const count = txns.filter((t) => t.accountId === a.id).length;
              return (
                <div key={a.id} className="glass-card space-y-3 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{a.bankName}</p>
                      <p className="text-sm text-muted-foreground">{a.maskedNumber}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{a.status}</span>
                  </div>
                  <p className="font-display text-2xl font-semibold">
                    {a.currency} {a.balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {count} transactions
                    {a.lastSyncedAt ? ` · synced ${new Date(a.lastSyncedAt).toLocaleDateString()}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl"
                      disabled={busy === a.id}
                      onClick={() => handleSync(a.id)}
                    >
                      <RefreshCw className="mr-1 size-4" aria-hidden="true" /> Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl"
                      disabled={busy === a.id}
                      onClick={() => {
                        setImportTarget(a.id);
                        fileRef.current?.click();
                      }}
                    >
                      <Upload className="mr-1 size-4" aria-hidden="true" /> Import statement
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-2xl text-destructive"
                      disabled={busy === a.id}
                      onClick={() => handleDisconnect(a.id)}
                    >
                      <Trash2 className="mr-1 size-4" aria-hidden="true" /> Disconnect
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </section>

      <section>
        <SectionTitle eyebrow="Manual" title="Add an account yourself" />
        <form onSubmit={handleManual} className="glass-card grid gap-4 rounded-3xl p-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="mname">Bank name</Label>
            <Input id="mname" required value={manualName} onChange={(e) => setManualName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mnum">Last digits</Label>
            <Input id="mnum" required value={manualNumber} onChange={(e) => setManualNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mbal">Current balance</Label>
            <Input
              id="mbal"
              type="number"
              value={manualBalance}
              onChange={(e) => setManualBalance(e.target.value)}
            />
          </div>
          <Button type="submit" className="rounded-2xl md:col-span-3" disabled={busy === "manual"}>
            Add account
          </Button>
        </form>
      </section>

      <section className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        <Button variant="outline" className="rounded-2xl" onClick={() => void signOut()}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
