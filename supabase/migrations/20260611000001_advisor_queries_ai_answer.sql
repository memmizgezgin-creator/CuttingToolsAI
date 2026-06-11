-- ============================================================
-- CuttingToolsAI — advisor_queries.ai_answer column
-- Migration: 20260611000001_advisor_queries_ai_answer
-- Run via: .github/workflows/db-migrate.yml (psql) or
--          Supabase dashboard → SQL Editor
--
-- Stores the AI's answer text (capped at 2000 chars by the
-- proxy) alongside each logged query, so the daily quality
-- inspector (daily-agents-worker.js) can audit query+answer
-- pairs. proxy.js logAdvisorQuery() already writes this field
-- with a fallback that drops it while the column is missing.
-- Idempotent: safe to re-run whether or not already applied.
-- ============================================================

ALTER TABLE public.advisor_queries
  ADD COLUMN IF NOT EXISTS ai_answer text;
