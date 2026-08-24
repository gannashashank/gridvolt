-- Seed Data for GridVolt Supabase Instance
-- Use auth.users insert commands if necessary, but typically profiles are populated for test users.
-- We assume these accounts are created in auth.users and we seed the profiles table.

-- Note: In a real Supabase environment, you would sign up the accounts first.
-- Here is a reference set of profile and provider coordinates matching the local SQLite seed.

-- Rajesh Kumar
INSERT INTO public.profiles (id, name, phone, role, ev_model, license_plate)
VALUES ('00000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '+91 9876543210', 'user', 'Tata Nexon EV', 'DL1CA1234')
ON CONFLICT (id) DO NOTHING;

-- Amit Sharma
INSERT INTO public.profiles (id, name, phone, role, ev_model, license_plate)
VALUES ('00000000-0000-0000-0000-000000000002', 'Amit Sharma', '+91 9876543211', 'user', 'MG ZS EV', 'MH02BD5678')
ON CONFLICT (id) DO NOTHING;

-- Vijay Kumar (Provider in Udaipur)
INSERT INTO public.profiles (id, name, phone, role, vehicle_type, service_capability, license_plate)
VALUES ('00000000-0000-0000-0000-000000000003', 'Vijay Kumar', '+91 8765432100', 'provider', 'van', 'Level 2 DC charging', 'RJ27UA1111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.providers (id, profile_id, availability, latitude, longitude)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', TRUE, 24.5854, 73.7125)
ON CONFLICT (id) DO NOTHING;

-- Sanjay Singh (Provider in Jaipur)
INSERT INTO public.profiles (id, name, phone, role, vehicle_type, service_capability, license_plate)
VALUES ('00000000-0000-0000-0000-000000000004', 'Sanjay Singh', '+91 8765432101', 'provider', 'truck', 'Flatbed towing + AC charging', 'RJ14UB2222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.providers (id, profile_id, availability, latitude, longitude)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000004', TRUE, 26.9124, 75.7873)
ON CONFLICT (id) DO NOTHING;

-- Rajesh Yadav (Provider in Delhi)
INSERT INTO public.profiles (id, name, phone, role, vehicle_type, service_capability, license_plate)
VALUES ('00000000-0000-0000-0000-000000000005', 'Rajesh Yadav', '+91 8765432102', 'provider', 'mobile-charger', 'Level 3 CCS2 Fast Charge', 'DL3CA3333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.providers (id, profile_id, availability, latitude, longitude)
VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000005', TRUE, 28.6139, 77.2090)
ON CONFLICT (id) DO NOTHING;
