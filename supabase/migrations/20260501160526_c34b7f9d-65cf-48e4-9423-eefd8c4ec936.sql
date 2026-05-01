ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pc text;
  ph text;
BEGIN
  pc := NEW.raw_user_meta_data ->> 'postal_code';
  ph := NEW.raw_user_meta_data ->> 'phone';

  IF pc IS NULL OR pc = '' THEN
    RAISE EXCEPTION 'A postal code is required to sign up.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.approved_postal_codes WHERE postal_code = pc) THEN
    RAISE EXCEPTION 'Sign-ups are currently limited to Elsies River (postal code 7490).';
  END IF;

  INSERT INTO public.profiles (id, full_name, postal_code, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    pc,
    ph
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rider');
  RETURN NEW;
END;
$function$;