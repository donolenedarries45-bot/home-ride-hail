
-- Live rider location, mirror of driver_locations
CREATE TABLE IF NOT EXISTS public.rider_locations (
  rider_id   uuid PRIMARY KEY,
  ride_id    uuid,
  latitude   double precision NOT NULL,
  longitude  double precision NOT NULL,
  heading    double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_locations REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='rider_locations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations';
  END IF;
END $$;

-- Riders can write/read their own location
CREATE POLICY "Riders upsert own location"
  ON public.rider_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders update own location"
  ON public.rider_locations FOR UPDATE TO authenticated
  USING (auth.uid() = rider_id);

CREATE POLICY "Riders view own location"
  ON public.rider_locations FOR SELECT TO authenticated
  USING (auth.uid() = rider_id);

-- Assigned driver may view their rider's location during an active ride
CREATE POLICY "Drivers view their assigned rider location"
  ON public.rider_locations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.rider_id = rider_locations.rider_id
      AND r.driver_id = auth.uid()
      AND r.status IN ('accepted','in_progress')
  ));

CREATE POLICY "Admins view all rider locations"
  ON public.rider_locations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
