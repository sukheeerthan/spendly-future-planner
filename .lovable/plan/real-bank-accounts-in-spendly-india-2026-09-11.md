# Real bank accounts in Spendly (India)

Goal: connect real bank accounts so balances and transactions flow in automatically, with multiple accounts shown separately, alongside the manual entries you already have.

## Important reality check

In India, live bank data comes through the RBI Account Aggregator network (providers like Setu, Finvu or Perfios). Those providers issue API keys only to a registered business after an onboarding/approval step. So the app can be fully built now, but real bank data starts flowing the day your provider keys are added.

The plan therefore ships in a way that works immediately and switches to live data with no rebuild:

1. Accounts and syncing are built for real, provider-agnostic.
2. Until provider keys exist, the connect flow runs against the provider's sandbox/sample feed, clearly labelled "Sandbox".
3. A bank-statement upload path is included so you can pull in real transactions today without waiting for approval.

## What you will see

- A new **Accounts** page: each bank account as its own card with bank name, masked account number, live balance, and last-synced time. A combined "total across accounts" at the top.
- **Connect a bank** button: choose your bank, consent to share data, and the account appears in the list.
- **Sync now** per account and automatic refresh when you open the app.
- Synced transactions appear in Activity next to manual ones, tagged with the account they came from, auto-categorised (food, travel, bills...), and folded into your Money Plan, safe-to-spend, health score and AI coach.
- **Upload statement** option: pick a CSV/statement file from your bank; Spendly reads it, previews the rows, skips duplicates and adds them.
- Duplicate protection so a manual entry and its synced twin don't double-count — Spendly flags likely matches and lets you merge.
- **Disconnect account** removes the link and stops syncing; you choose whether to keep past transactions.

## Prerequisites this introduces

- Spendly currently keeps everything in your browser only. Bank data cannot live there safely, so this adds Lovable Cloud (secure backend storage) and a personal login. Existing local data is offered as a one-time import into your account on first sign-in.
- Your provider credentials will be stored as encrypted secrets on the server, never in the app.

## Technical outline

- Enable Lovable Cloud; add email + Google sign-in; move Spendly state to per-user tables with RLS scoped to `auth.uid()` and explicit grants.
- New tables: `bank_accounts` (user_id, provider, provider_account_ref, bank name, masked number, type, balance, currency, last_synced_at, status), `bank_transactions` (user_id, account_id, provider_txn_id unique per account, amount, direction, description, posted_at, category, raw payload), `bank_consents` (consent handle/status/expiry, ciphertext credentials).
- Provider adapter interface (`linkStart`, `linkComplete`, `listAccounts`, `fetchTransactions`, `revoke`) in server-only modules; first implementation targets Setu AA, plus a `sandbox` adapter used when keys are absent.
- All provider calls in `createServerFn` handlers with `requireSupabaseAuth`; consent callback as a server route under `src/routes/api/public/` with signature verification.
- Sync job: incremental fetch by `posted_at` cursor, upsert on `provider_txn_id`, rule-based categoriser mapping merchant strings to existing `ExpenseCategory` values.
- Statement import: client-side CSV parse with column mapping UI, then a validated bulk insert server function reusing the same dedupe and categorisation.
- Existing calculations (`calc.ts`) keep working by feeding synced rows into the same `Transaction` shape, with a new optional `accountId` and `source: "manual" | "bank" | "import"`.
- New routes: `/accounts`, `/accounts/connect`, `/accounts/import`; nav entry in `AppShell`; head metadata per route.

## Suggested order

1. Cloud + auth + data migration from local storage.
2. Accounts page, manual/multi-account model, Activity and Plan integration.
3. Statement upload path (usable immediately).
4. Provider adapter + consent flow, running in sandbox.
5. Flip to live once you supply provider keys.
