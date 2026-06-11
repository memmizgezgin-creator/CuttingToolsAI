-- ============================================================
-- CuttingToolsAI — Inter-agent event bus
-- Migration: 20260611000000_agent_events
-- Run via: Supabase dashboard → SQL Editor (project: tooladvisor)
--
-- Daily/weekly agent Worker'ları bulgularını buraya yazar
-- (from_agent → to_agent), evaluation pass değerlendirir,
-- chief-of-staff digest'i Murat'a e-postalar. service_role only.
-- ============================================================

create table if not exists public.agent_events (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  from_agent         text,
  to_agent           text,
  event_type         text        check (event_type in ('finding','issue','improvement','question')),
  priority           text        check (priority in ('high','normal','low')),
  title              text,
  body               text,
  source_ref         text,
  status             text        not null default 'new'
                                 check (status in ('new','evaluated','escalated','dismissed')),
  evaluation         text,
  recommended_action text
);

-- Deny-by-default: RLS açık, policy yok → anon/authenticated hiçbir şey göremez.
-- service_role RLS'i bypass eder (Worker'lar bu anahtarı kullanır).
alter table public.agent_events enable row level security;
revoke all on public.agent_events from anon, authenticated;

-- Evaluation pass status='new' tarar; digest status'a ve tarihe göre çeker.
create index if not exists agent_events_status_idx     on public.agent_events (status);
create index if not exists agent_events_created_at_idx on public.agent_events (created_at desc);
