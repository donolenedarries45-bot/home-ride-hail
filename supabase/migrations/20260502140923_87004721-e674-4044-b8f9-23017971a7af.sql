DROP TRIGGER IF EXISTS on_driver_application_approval ON public.driver_applications;

CREATE TRIGGER on_driver_application_approval
AFTER UPDATE OF status ON public.driver_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_application_approval();