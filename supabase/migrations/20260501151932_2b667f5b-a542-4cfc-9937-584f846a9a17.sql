
-- Trigger functions: never called directly by anyone, only by the trigger itself.
REVOKE EXECUTE ON FUNCTION public.apply_commission_on_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_settlement_to_wallet() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_application_approval() FROM PUBLIC, anon, authenticated;

-- Helpers used inside RLS policies: only need to be callable by signed-in users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.driver_in_good_standing(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_driver_wallet(uuid) FROM PUBLIC, anon;
