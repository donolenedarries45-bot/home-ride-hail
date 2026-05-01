-- Add new fields to driver_applications
ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS years_driving integer,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS vehicle_seats integer,
  ADD COLUMN IF NOT EXISTS profile_photo_path text,
  ADD COLUMN IF NOT EXISTS vehicle_photo_path text,
  ADD COLUMN IF NOT EXISTS proof_of_address_path text;

-- Create private storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: drivers manage their own folder (path prefix = user id)
DROP POLICY IF EXISTS "Drivers upload own docs" ON storage.objects;
CREATE POLICY "Drivers upload own docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Drivers view own docs" ON storage.objects;
CREATE POLICY "Drivers view own docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Drivers update own docs" ON storage.objects;
CREATE POLICY "Drivers update own docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Drivers delete own docs" ON storage.objects;
CREATE POLICY "Drivers delete own docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all driver documents
DROP POLICY IF EXISTS "Admins view all driver docs" ON storage.objects;
CREATE POLICY "Admins view all driver docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);