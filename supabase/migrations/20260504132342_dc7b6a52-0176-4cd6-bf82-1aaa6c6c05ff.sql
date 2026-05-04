-- Chat messages table
CREATE TABLE public.ride_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('rider','driver')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_ride_messages_ride ON public.ride_messages(ride_id, created_at);

ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view messages on their ride
CREATE POLICY "Ride participants view messages"
ON public.ride_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_messages.ride_id
      AND (r.rider_id = auth.uid() OR r.driver_id = auth.uid())
  )
);

-- Participants can send messages on their active ride
CREATE POLICY "Ride participants send messages"
ON public.ride_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_messages.ride_id
      AND r.status IN ('accepted','in_progress')
      AND (
        (r.rider_id = auth.uid() AND sender_role = 'rider')
        OR (r.driver_id = auth.uid() AND sender_role = 'driver')
      )
  )
);

-- Recipient can mark messages as read
CREATE POLICY "Recipient marks read"
ON public.ride_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = ride_messages.ride_id
      AND ((r.rider_id = auth.uid() AND sender_role = 'driver')
        OR (r.driver_id = auth.uid() AND sender_role = 'rider'))
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
ALTER TABLE public.ride_messages REPLICA IDENTITY FULL;

-- Public bucket for rider avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('rider-avatars','rider-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone authed can view rider avatars
CREATE POLICY "Public read rider avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'rider-avatars');

CREATE POLICY "Riders upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rider-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Riders update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rider-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Riders delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rider-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Drivers need to see rider profile (full_name + avatar_url) during active ride
CREATE POLICY "Drivers view assigned rider profile"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.rider_id = profiles.id
      AND r.driver_id = auth.uid()
      AND r.status IN ('accepted','in_progress')
  )
);