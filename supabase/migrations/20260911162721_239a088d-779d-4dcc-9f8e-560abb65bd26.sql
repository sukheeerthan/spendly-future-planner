CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'sandbox',
  provider_account_ref text,
  bank_name text NOT NULL,
  masked_number text NOT NULL,
  account_type text NOT NULL DEFAULT 'savings',
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  provider_txn_id text,
  amount numeric NOT NULL,
  direction text NOT NULL DEFAULT 'debit',
  description text NOT NULL DEFAULT '',
  posted_at date NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  source text NOT NULL DEFAULT 'bank',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bank_transactions_provider_unique
  ON public.bank_transactions (account_id, provider_txn_id)
  WHERE provider_txn_id IS NOT NULL;
CREATE INDEX bank_transactions_user_date ON public.bank_transactions (user_id, posted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank transactions" ON public.bank_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bank_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  consent_handle text,
  credentials_ciphertext text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bank_consents TO service_role;
ALTER TABLE public.bank_consents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER bank_accounts_touch BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER bank_consents_touch BEFORE UPDATE ON public.bank_consents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();