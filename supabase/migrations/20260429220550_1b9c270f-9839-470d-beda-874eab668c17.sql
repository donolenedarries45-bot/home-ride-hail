-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'rider');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer for role checks (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  postal_code TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Approved postal codes (managed by admins)
CREATE TABLE public.approved_postal_codes (
  postal_code TEXT PRIMARY KEY,
  area_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approved_postal_codes ENABLE ROW LEVEL SECURITY;

-- Seed a few postal codes so the demo works out of the box
INSERT INTO public.approved_postal_codes (postal_code, area_name) VALUES
  ('90026', 'Silver Lake'),
  ('90027', 'Los Feliz'),
  ('90039', 'Atwater Village'),
  ('11201', 'Brooklyn Heights'),
  ('11215', 'Park Slope');

-- Driver applications
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  postal_code TEXT NOT NULL REFERENCES public.approved_postal_codes(postal_code),
  address TEXT NOT NULL,
  vehicle_make_model TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  bio TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Rides
CREATE TYPE public.ride_status AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  notes TEXT,
  fare_estimate NUMERIC(10,2),
  status public.ride_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile + assign rider role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, postal_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'postal_code'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'rider');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS Policies --------------------------------------------------------

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Anyone authed views driver profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(id, 'driver'));
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- approved_postal_codes
CREATE POLICY "Anyone reads approved postal codes" ON public.approved_postal_codes
  FOR SELECT USING (true);
CREATE POLICY "Admins manage postal codes" ON public.approved_postal_codes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- driver_applications
CREATE POLICY "Users view own application" ON public.driver_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own application" ON public.driver_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all applications" ON public.driver_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update applications" ON public.driver_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- When admin approves an application, also assign driver role.
CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'driver')
    ON CONFLICT DO NOTHING;
    -- update profile postal code to the approved one
    UPDATE public.profiles SET postal_code = NEW.postal_code WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_application_approved
AFTER UPDATE ON public.driver_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

-- rides
CREATE POLICY "Riders view own rides" ON public.rides
  FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Drivers view assigned rides" ON public.rides
  FOR SELECT TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Drivers view open rides in their area"
  ON public.rides FOR SELECT TO authenticated
  USING (
    status = 'requested'
    AND public.has_role(auth.uid(), 'driver')
    AND postal_code = (SELECT postal_code FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "Riders create rides" ON public.rides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders cancel own rides" ON public.rides
  FOR UPDATE TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Drivers update assigned/open rides" ON public.rides
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'driver')
    AND (driver_id = auth.uid() OR (driver_id IS NULL AND status = 'requested'))
  );
CREATE POLICY "Admins view all rides" ON public.rides
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER TABLE public.rides REPLICA IDENTITY FULL;