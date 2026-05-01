
CREATE TABLE public.driver_locations (
  driver_id uuid NOT NULL PRIMARY KEY,
  ride_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers upsert own location"
ON public.driver_locations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = driver_id AND public.has_role(auth.uid(), 'driver'));

CREATE POLICY "Drivers update own location"
ON public.driver_locations FOR UPDATE TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Drivers view own location"
ON public.driver_locations FOR SELECT TO authenticated
USING (auth.uid() = driver_id);

CREATE POLICY "Riders view their assigned driver location"
ON public.driver_locations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.rides r
  WHERE r.driver_id = driver_locations.driver_id
    AND r.rider_id = auth.uid()
    AND r.status IN ('accepted','in_progress')
));

CREATE POLICY "Admins view all driver locations"
ON public.driver_locations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
