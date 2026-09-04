-- GridVolt Core Database Schema

-- Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT CHECK(role IN ('user', 'provider', 'admin')) NOT NULL,
  ev_model TEXT,
  license_plate TEXT,
  vehicle_type TEXT,
  service_capability TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- Providers Table
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  availability BOOLEAN DEFAULT TRUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for providers" ON public.providers
  FOR SELECT USING (true);

CREATE POLICY "Allow providers to update own record" ON public.providers
  FOR UPDATE USING (auth.uid() = profile_id);


-- Assistance Requests Table
CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_for_self BOOLEAN DEFAULT TRUE,
  onsite_contact_name TEXT,
  onsite_contact_phone TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'requested' CHECK(status IN ('requested', 'accepted', 'en_route', 'arrived', 'servicing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their requests" ON public.assistance_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = provider_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow providers to view unassigned requests" ON public.assistance_requests
  FOR SELECT USING (status = 'requested' OR provider_id = auth.uid());

CREATE POLICY "Allow users to create requests" ON public.assistance_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users/providers to update requests" ON public.assistance_requests
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = provider_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  estimated_distance DOUBLE PRECISION NOT NULL,
  estimated_eta_minutes INTEGER NOT NULL,
  estimated_cost NUMERIC(10, 2) NOT NULL
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow quote view" ON public.quotes
  FOR SELECT USING (true);

CREATE POLICY "Allow quote insertion" ON public.quotes
  FOR INSERT WITH CHECK (true);


-- Request Events Table (Auditing)
CREATE TABLE IF NOT EXISTS public.request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow event read" ON public.request_events
  FOR SELECT USING (true);

CREATE POLICY "Allow event write" ON public.request_events
  FOR INSERT WITH CHECK (true);


-- Service Records Table
CREATE TABLE IF NOT EXISTS public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.assistance_requests(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  final_cost NUMERIC(10, 2) NOT NULL,
  completion_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow records view" ON public.service_records
  FOR SELECT USING (true);

CREATE POLICY "Allow records insertion" ON public.service_records
  FOR INSERT WITH CHECK (true);
