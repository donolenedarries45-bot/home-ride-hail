CREATE TABLE public.sos_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id uuid NOT NULL,
  triggered_by uuid NOT NULL,
  triggered_role text NOT NULL CHECK (triggered_role IN ('rider','driver')),
  latitude double precision,
  longitude double precision,
  message text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own SOS alert"
  ON public.sos_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = triggered_by);

CREATE POLICY "Users view own SOS alerts"
  ON public.sos_alerts FOR SELECT TO authenticated
  USING (auth.uid() = triggered_by);

CREATE POLICY "Admins view all SOS alerts"
  ON public.sos_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins resolve SOS alerts"
  ON public.sos_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sos_alerts_unresolved ON public.sos_alerts (created_at DESC) WHERE resolved = false;
CREATE INDEX idx_sos_alerts_ride ON public.sos_alerts (ride_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;