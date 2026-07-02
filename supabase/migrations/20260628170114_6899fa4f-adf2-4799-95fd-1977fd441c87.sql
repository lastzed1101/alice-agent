-- ============================================================
-- Alice AI Agent — Supabase Cloud Sync Setup
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to set up
-- cloud sync for Alice AI Agent.
--
-- What this does:
--   1. Creates app_state table (stores all user data as JSON)
--   2. Enables Row Level Security (RLS) — users can only see their own data
--   3. Grants permissions for anon + authenticated roles
--   4. Creates indexes for fast lookups
--
-- Required .env variables:
--   VITE_SUPABASE_URL=https://your-project.supabase.co
--   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...  (anon key from Supabase dashboard)
--
-- ============================================================

-- 1. Create app_state table
CREATE TABLE IF NOT EXISTS public.app_state (
  id text PRIMARY KEY DEFAULT 'default',
  user_id text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add user_id column if table already existed without it
DO $$ BEGIN
  ALTER TABLE public.app_state ADD COLUMN IF NOT EXISTS user_id text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Add updated_at default if missing
DO $$ BEGIN
  ALTER TABLE public.app_state ALTER COLUMN updated_at SET DEFAULT now();
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ============================================================
-- Permissions
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_state TO authenticated;
GRANT ALL ON public.app_state TO service_role;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (idempotent)
DROP POLICY IF EXISTS "Public read app_state" ON public.app_state;
DROP POLICY IF EXISTS "Public insert app_state" ON public.app_state;
DROP POLICY IF EXISTS "Public update app_state" ON public.app_state;
DROP POLICY IF EXISTS "Users read own app_state" ON public.app_state;
DROP POLICY IF EXISTS "Users insert own app_state" ON public.app_state;
DROP POLICY IF EXISTS "Users update own app_state" ON public.app_state;
DROP POLICY IF EXISTS "Anonymous read app_state" ON public.app_state;
DROP POLICY IF EXISTS "Anonymous insert app_state" ON public.app_state;
DROP POLICY IF EXISTS "Anonymous update app_state" ON public.app_state;

-- ============================================================
-- Authenticated user policies (per-user isolation)
-- Users can only read/insert/update their own rows
-- ============================================================
CREATE POLICY "Users read own app_state"
  ON public.app_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "Users insert own app_state"
  ON public.app_state FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "Users update own app_state"
  ON public.app_state FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid()::text OR user_id IS NULL);

-- ============================================================
-- Anonymous policies (for users who skip login — local-only mode)
-- These allow the anon role to access all rows
-- ============================================================
CREATE POLICY "Anonymous read app_state"
  ON public.app_state FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous insert app_state"
  ON public.app_state FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous update app_state"
  ON public.app_state FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Indexes for fast lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_app_state_user_id ON public.app_state (user_id);
CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON public.app_state (updated_at);

-- ============================================================
-- Seed default row (for anonymous/local-only mode)
-- ============================================================
INSERT INTO public.app_state (id, data)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Table comment
-- ============================================================
COMMENT ON TABLE public.app_state IS 'Alice AI Agent cloud sync state — one row per user';
COMMENT ON COLUMN public.app_state.user_id IS 'Supabase auth user ID — links row to authenticated user';
COMMENT ON COLUMN public.app_state.data IS 'JSON blob containing all Alice data: threads, memory, providers, settings, skills, tasks, knowledge';
