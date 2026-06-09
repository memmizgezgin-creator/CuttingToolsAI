-- ============================================================
-- CuttingToolsAI — Freemium quota system
-- Migration: 20260609000000_quota_system
-- Run via: Supabase dashboard → SQL Editor, or supabase db push
-- ============================================================

-- ── 1. profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                text        NOT NULL DEFAULT 'free'
                                  CHECK (plan IN ('free', 'pro')),
  stripe_customer_id  text,
  current_period_end  timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read only their own row.
-- All writes go through the server (service_role bypasses RLS).
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ── 2. usage_daily ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text    NOT NULL CHECK (subject_type IN ('anon', 'user', 'ip')),
  subject_id   text    NOT NULL,
  day          date    NOT NULL,
  count        int     NOT NULL DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (subject_type, subject_id, day)
);

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies → anon/authenticated cannot read or write.
-- Only service_role (bypasses RLS entirely) may access this table.

-- ── 3. usage_monthly ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_monthly (
  subject_id     text    NOT NULL,
  month          date    NOT NULL,   -- always first day of month, e.g. 2026-06-01
  advisor_count  int     NOT NULL DEFAULT 0,
  visual_count   int     NOT NULL DEFAULT 0,
  updated_at     timestamptz DEFAULT now(),
  PRIMARY KEY (subject_id, month)
);

ALTER TABLE public.usage_monthly ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies.

-- ── 4. Atomic daily check-and-increment ─────────────────────────────────────
-- Race-safe: inserts row if absent, then SELECT FOR UPDATE serialises concurrent
-- increments. Only increments when count < p_limit.
CREATE OR REPLACE FUNCTION public.check_and_increment_daily(
  p_type  text,
  p_id    text,
  p_day   date,
  p_limit int
)
RETURNS TABLE (allowed boolean, used int, remaining int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Ensure the row exists (no-op on conflict).
  INSERT INTO public.usage_daily (subject_type, subject_id, day, count, updated_at)
  VALUES (p_type, p_id, p_day, 0, now())
  ON CONFLICT (subject_type, subject_id, day) DO NOTHING;

  -- Lock the row for this transaction so concurrent calls serialise here.
  SELECT count INTO v_count
  FROM public.usage_daily
  WHERE subject_type = p_type
    AND subject_id   = p_id
    AND day          = p_day
  FOR UPDATE;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, v_count, 0;
    RETURN;
  END IF;

  UPDATE public.usage_daily
  SET count      = count + 1,
      updated_at = now()
  WHERE subject_type = p_type
    AND subject_id   = p_id
    AND day          = p_day;

  v_count := v_count + 1;
  RETURN QUERY SELECT true, v_count, (p_limit - v_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_daily(text, text, date, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_and_increment_daily(text, text, date, int) TO service_role;

-- ── 5. Atomic daily refund (called on Anthropic error) ──────────────────────
CREATE OR REPLACE FUNCTION public.refund_daily(
  p_type text,
  p_id   text,
  p_day  date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usage_daily
  SET count      = GREATEST(0, count - 1),
      updated_at = now()
  WHERE subject_type = p_type
    AND subject_id   = p_id
    AND day          = p_day;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_daily(text, text, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.refund_daily(text, text, date) TO service_role;

-- ── 6. Atomic monthly increment for Pro users ───────────────────────────────
-- p_kind: 'advisor' | 'visual'
CREATE OR REPLACE FUNCTION public.increment_monthly(
  p_id          text,
  p_month       date,
  p_kind        text,
  p_advisor_cap int,
  p_visual_cap  int
)
RETURNS TABLE (allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor int;
  v_visual  int;
BEGIN
  IF p_kind NOT IN ('advisor', 'visual') THEN
    RAISE EXCEPTION 'invalid p_kind: %', p_kind;
  END IF;

  INSERT INTO public.usage_monthly (subject_id, month, advisor_count, visual_count, updated_at)
  VALUES (p_id, p_month, 0, 0, now())
  ON CONFLICT (subject_id, month) DO NOTHING;

  SELECT advisor_count, visual_count INTO v_advisor, v_visual
  FROM public.usage_monthly
  WHERE subject_id = p_id AND month = p_month
  FOR UPDATE;

  IF p_kind = 'advisor' THEN
    IF v_advisor >= p_advisor_cap THEN
      RETURN QUERY SELECT false;
      RETURN;
    END IF;
    UPDATE public.usage_monthly
    SET advisor_count = advisor_count + 1, updated_at = now()
    WHERE subject_id = p_id AND month = p_month;

  ELSE  -- visual
    IF v_visual >= p_visual_cap THEN
      RETURN QUERY SELECT false;
      RETURN;
    END IF;
    UPDATE public.usage_monthly
    SET visual_count = visual_count + 1, updated_at = now()
    WHERE subject_id = p_id AND month = p_month;
  END IF;

  RETURN QUERY SELECT true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_monthly(text, date, text, int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_monthly(text, date, text, int, int) TO service_role;

-- ── 7. Helpful index for daily lookups ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS usage_daily_lookup_idx
  ON public.usage_daily (subject_type, subject_id, day);
