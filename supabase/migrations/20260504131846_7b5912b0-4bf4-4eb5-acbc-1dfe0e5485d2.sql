-- Allow riders to view their assigned driver's profile photo (only the profile_photo_path file)
CREATE POLICY "Riders view assigned driver profile photo"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1
    FROM public.rides r
    JOIN public.driver_applications da ON da.user_id = r.driver_id
    WHERE r.rider_id = auth.uid()
      AND r.status IN ('accepted', 'in_progress')
      AND da.profile_photo_path = storage.objects.name
  )
);