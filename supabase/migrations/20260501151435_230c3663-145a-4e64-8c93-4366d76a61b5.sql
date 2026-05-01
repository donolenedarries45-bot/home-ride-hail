
ALTER TABLE public.driver_applications
ADD COLUMN payfast_merchant_id text;

CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');

ALTER TABLE public.rides
ADD COLUMN payment_status public.payment_status NOT NULL DEFAULT 'pending';

CREATE TABLE public.ride_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL,
  driver_id uuid,
  driver_payfast_merchant_id text,
  amount_cents integer NOT NULL,
  driver_share_cents integer NOT NULL,
  platform_share_cents integer NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  pf_payment_id text,
  m_payment_id text NOT NULL UNIQUE,
  raw_itn jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX idx_ride_payments_ride ON public.ride_payments(ride_id);
CREATE INDEX idx_ride_payments_driver ON public.ride_payments(driver_id);
CREATE INDEX idx_ride_payments_rider ON public.ride_payments(rider_id);

ALTER TABLE public.ride_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders view own payments"
ON public.ride_payments FOR SELECT TO authenticated
USING (auth.uid() = rider_id);

CREATE POLICY "Drivers view own payments"
ON public.ride_payments FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all payments"
ON public.ride_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Riders create own payments"
ON public.ride_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = rider_id);
