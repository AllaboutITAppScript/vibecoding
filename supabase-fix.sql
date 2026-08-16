-- RLS policies only — the unique constraint already exists, skip it.
-- Run in Supabase Dashboard → SQL Editor (safe to run multiple times)

-- Blocked flag used by the admin panel (block/unblock users)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS blocked boolean DEFAULT false;

DROP POLICY IF EXISTS user_profiles_anon_insert ON public.user_profiles;
CREATE POLICY user_profiles_anon_insert ON public.user_profiles
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS user_profiles_anon_select ON public.user_profiles;
CREATE POLICY user_profiles_anon_select ON public.user_profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- UPDATE policy so the admin can block/unblock (needed only if the
-- service_role key is not configured on the server).
DROP POLICY IF EXISTS user_profiles_anon_update ON public.user_profiles;
CREATE POLICY user_profiles_anon_update ON public.user_profiles
  FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
