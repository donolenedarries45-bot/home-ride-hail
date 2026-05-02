-- Customer feedback table
CREATE TABLE public.customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ride_id uuid,
  category text NOT NULL DEFAULT 'general',
  rating integer,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Validate rating range via trigger (avoid CHECK constraint immutability concerns)
CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF length(NEW.message) < 3 OR length(NEW.message) > 1000 THEN
    RAISE EXCEPTION 'Message must be 3-1000 characters';
  END IF;
  IF NEW.category NOT IN ('general','driver','app','safety','pricing','suggestion') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  IF NEW.status NOT IN ('new','reviewed','resolved') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_feedback_trg
BEFORE INSERT OR UPDATE ON public.customer_feedback
FOR EACH ROW EXECUTE FUNCTION public.validate_feedback();

-- RLS policies
CREATE POLICY "Users create own feedback"
  ON public.customer_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
  ON public.customer_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
  ON public.customer_feedback FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update feedback"
  ON public.customer_feedback FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_customer_feedback_user ON public.customer_feedback(user_id);
CREATE INDEX idx_customer_feedback_status ON public.customer_feedback(status);