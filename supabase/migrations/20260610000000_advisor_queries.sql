-- ============================================================
-- CuttingToolsAI — Anonymous advisor query log
-- Migration: 20260610000000_advisor_queries
-- Run via: Supabase dashboard → SQL Editor
--
-- GDPR-safe by design: no user id, no anon cookie id, no IP.
-- Written only by the proxy (service_role); used by the weekly
-- research worker to report "DB misses" (db_hit = false).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.advisor_queries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  query_text       text        NOT NULL,
  db_hit           boolean     NOT NULL DEFAULT false,
  matched_records  int         NOT NULL DEFAULT 0,
  response_time_ms int
);

ALTER TABLE public.advisor_queries ENABLE ROW LEVEL SECURITY;
-- Deny-by-default: no policies → anon/authenticated cannot read or write.
-- Only service_role (bypasses RLS) may access this table.

CREATE INDEX IF NOT EXISTS advisor_queries_created_idx
  ON public.advisor_queries (created_at);

CREATE INDEX IF NOT EXISTS advisor_queries_miss_idx
  ON public.advisor_queries (db_hit, created_at);
