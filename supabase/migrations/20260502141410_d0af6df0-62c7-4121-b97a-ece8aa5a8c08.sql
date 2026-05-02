CREATE OR REPLACE FUNCTION public.driver_in_good_standing(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT NOT COALESCE((SELECT is_suspended FROM public.driver_wallets WHERE driver_id = _driver_id), false)
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_driver_wallet(uuid) FROM PUBLIC, anon, authenticated;