-- 1. Restrict approved postal codes to Elsies River only
DELETE FROM public.approved_postal_codes WHERE postal_code <> '7490';

INSERT INTO public.approved_postal_codes (postal_code, area_name)
VALUES ('7490', 'Elsies River')
ON CONFLICT DO NOTHING;

-- Add a unique constraint so we can rely on postal_code lookups
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approved_postal_codes_postal_code_key'
  ) THEN
    ALTER TABLE public.approved_postal_codes
      ADD CONSTRAINT approved_postal_codes_postal_code_key UNIQUE (postal_code);
  END IF;
END $$;

-- 2. Replace handle_new_user to require an approved postal code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pc text;
BEGIN
  pc := NEW.raw_user_meta_data ->> 'postal_code';

  IF pc IS NULL OR pc = '' THEN
    RAISE EXCEPTION 'A postal code is required to sign up.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.approved_postal_codes WHERE postal_code = pc) THEN
    RAISE EXCEPTION 'Sign-ups are currently limited to Elsies River (postal code 7490).';
  END IF;

  INSERT INTO public.profiles (id, full_name, postal_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    pc
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rider');
  RETURN NEW;
END;
$function$;

-- 3. Ensure the trigger on auth.users exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();