-- RLS policies only — the unique constraint already exists, skip it.
-- Run in Supabase Dashboard → SQL Editor

DROP POLICY IF EXISTS user_profiles_anon_insert ON public.user_profiles;
CREATE POLICY user_profiles_anon_insert ON public.user_profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS user_profiles_anon_select ON public.user_profiles;
CREATE POLICY user_profiles_anon_select ON public.user_profiles
  FOR SELECT TO anon, authenticated
  USING (true);
