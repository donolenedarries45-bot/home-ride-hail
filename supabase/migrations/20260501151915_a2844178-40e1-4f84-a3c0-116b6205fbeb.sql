
-- 1) Track actual fare collected
ALTER TABLE public.rides
ADD COLUMN actual_fare numeric;

-- 2) Driver wallet (balance in cents to avoid float issues)
CREATE TABLE public.driver_wallets (
  driver_id uuid NOT NULL PRIMARY KEY,
  balance_cents integer NOT NULL DEFAULT 0,
  lifetime_earned_cents integer NOT NULL DEFAULT 0,
  lifetime_commission_cents integer NOT NULL DEFAULT 0,
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own wallet"
ON public.driver_wallets FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all wallets"
ON public.driver_wallets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update wallets"
ON public.driver_wallets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Wallet transaction ledger
CREATE TYPE public.wallet_tx_type AS ENUM ('commission', 'topup', 'adjustment');

CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL,
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  settlement_id uuid,
  type public.wallet_tx_type NOT NULL,
  amount_cents integer NOT NULL, -- negative = debit (commission), positive = credit (topup)
  balance_after_cents integer NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_driver ON public.wallet_transactions(driver_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Commission settlements
CREATE TYPE public.settlement_method AS ENUM ('eft', 'cash', 'other');

CREATE TABLE public.commission_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  method public.settlement_method NOT NULL,
  reference text,
  notes text,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_driver ON public.commission_settlements(driver_id, created_at DESC);

ALTER TABLE public.commission_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own settlements"
ON public.commission_settlements FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all settlements"
ON public.commission_settlements FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins record settlements"
ON public.commission_settlements FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = recorded_by);

-- 5) Helper: ensure wallet exists
CREATE OR REPLACE FUNCTION public.ensure_driver_wallet(_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.driver_wallets (driver_id) VALUES (_driver_id)
  ON CONFLICT (driver_id) DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public.ensure_driver_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_driver_wallet(uuid) TO authenticated;

-- 6) Auto-deduct commission when driver completes a ride
-- Commission rate: 10% (configurable per-row by changing the constant)
CREATE OR REPLACE FUNCTION public.apply_commission_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_cents integer;
  v_fare_cents integer;
  v_balance integer;
  v_driver uuid;
BEGIN
  -- Only act when transitioning to completed and fare/driver present
  IF NEW.status = 'completed' AND NEW.driver_id IS NOT NULL AND NEW.actual_fare IS NOT NULL
     AND (OLD.status IS DISTINCT FROM 'completed') THEN

    v_driver := NEW.driver_id;
    v_fare_cents := ROUND(NEW.actual_fare * 100)::integer;
    v_commission_cents := ROUND(v_fare_cents * 0.10)::integer;

    -- Make sure wallet row exists
    INSERT INTO public.driver_wallets (driver_id) VALUES (v_driver)
    ON CONFLICT (driver_id) DO NOTHING;

    -- Deduct commission
    UPDATE public.driver_wallets
       SET balance_cents = balance_cents - v_commission_cents,
           lifetime_earned_cents = lifetime_earned_cents + v_fare_cents,
           lifetime_commission_cents = lifetime_commission_cents + v_commission_cents,
           updated_at = now()
     WHERE driver_id = v_driver
     RETURNING balance_cents INTO v_balance;

    -- Auto-suspend if balance below zero
    IF v_balance < 0 THEN
      UPDATE public.driver_wallets SET is_suspended = true WHERE driver_id = v_driver;
    END IF;

    INSERT INTO public.wallet_transactions
      (driver_id, ride_id, type, amount_cents, balance_after_cents, description)
    VALUES
      (v_driver, NEW.id, 'commission', -v_commission_cents, v_balance,
       '10% commission on R' || (NEW.actual_fare)::text || ' fare');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER rides_apply_commission
AFTER UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.apply_commission_on_completion();

-- 7) Apply settlement → credit wallet + lift suspension if balance >= 0
CREATE OR REPLACE FUNCTION public.apply_settlement_to_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  INSERT INTO public.driver_wallets (driver_id) VALUES (NEW.driver_id)
  ON CONFLICT (driver_id) DO NOTHING;

  UPDATE public.driver_wallets
     SET balance_cents = balance_cents + NEW.amount_cents,
         updated_at = now()
   WHERE driver_id = NEW.driver_id
   RETURNING balance_cents INTO v_balance;

  IF v_balance >= 0 THEN
    UPDATE public.driver_wallets SET is_suspended = false WHERE driver_id = NEW.driver_id;
  END IF;

  INSERT INTO public.wallet_transactions
    (driver_id, settlement_id, type, amount_cents, balance_after_cents, description)
  VALUES
    (NEW.driver_id, NEW.id, 'topup', NEW.amount_cents, v_balance,
     'Top-up via ' || NEW.method::text || COALESCE(' · ' || NEW.reference, ''));

  RETURN NEW;
END $$;

CREATE TRIGGER settlements_credit_wallet
AFTER INSERT ON public.commission_settlements
FOR EACH ROW
EXECUTE FUNCTION public.apply_settlement_to_wallet();

-- 8) Helper for RLS: is this driver in good standing?
CREATE OR REPLACE FUNCTION public.driver_in_good_standing(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE((SELECT is_suspended FROM public.driver_wallets WHERE driver_id = _driver_id), false)
$$;

REVOKE EXECUTE ON FUNCTION public.driver_in_good_standing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_in_good_standing(uuid) TO authenticated;

-- 9) Tighten ride policies so suspended drivers can't see/accept open rides
DROP POLICY IF EXISTS "Drivers view open rides in their area" ON public.rides;
CREATE POLICY "Drivers view open rides in their area"
ON public.rides FOR SELECT TO authenticated
USING (
  status = 'requested'::ride_status
  AND public.has_role(auth.uid(), 'driver'::app_role)
  AND public.driver_in_good_standing(auth.uid())
  AND postal_code = (SELECT profiles.postal_code FROM profiles WHERE profiles.id = auth.uid())
);

DROP POLICY IF EXISTS "Drivers update assigned/open rides" ON public.rides;
CREATE POLICY "Drivers update assigned/open rides"
ON public.rides FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'driver'::app_role)
  AND public.driver_in_good_standing(auth.uid())
  AND ((driver_id = auth.uid()) OR (driver_id IS NULL AND status = 'requested'::ride_status))
);
