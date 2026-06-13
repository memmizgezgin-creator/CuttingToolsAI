-- Migration: 20260613000000_advisor_memory
-- Per-user advisor conversation memory (a PRO feature).
--
-- Two tables: advisor_sessions (one per conversation) and advisor_messages
-- (the turns). Distinct from advisor_queries, which stays anonymous analytics.
--
-- Pro-gating is enforced AT THE DATABASE via RLS: a user may READ their own
-- rows, but may only WRITE (insert) when they hold an ACTIVE subscription.
-- This means a tampered client cannot persist memory for a free account.

create table if not exists public.advisor_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references public.advisor_sessions(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('user','assistant')),
  content    text        not null,
  params     jsonb,        -- recommended speed/feed/grade etc. (future structured capture)
  db_hit     boolean,
  created_at timestamptz not null default now()
);

create index if not exists advisor_sessions_user_idx
  on public.advisor_sessions (user_id, updated_at desc);
create index if not exists advisor_messages_session_idx
  on public.advisor_messages (session_id, created_at);

alter table public.advisor_sessions enable row level security;
alter table public.advisor_messages enable row level security;

-- Helper: does the current user hold an active subscription? (matches the
-- proxy's isEntitled definition of "Pro".)
create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status = 'active'
  );
$$;

-- ── advisor_sessions policies ────────────────────────────────────────────────
drop policy if exists advisor_sessions_select_own on public.advisor_sessions;
create policy advisor_sessions_select_own on public.advisor_sessions
  for select using (auth.uid() = user_id);

drop policy if exists advisor_sessions_write_pro on public.advisor_sessions;
create policy advisor_sessions_write_pro on public.advisor_sessions
  for insert with check (auth.uid() = user_id and public.is_pro());

drop policy if exists advisor_sessions_update_pro on public.advisor_sessions;
create policy advisor_sessions_update_pro on public.advisor_sessions
  for update using (auth.uid() = user_id and public.is_pro())
  with check (auth.uid() = user_id);

drop policy if exists advisor_sessions_delete_own on public.advisor_sessions;
create policy advisor_sessions_delete_own on public.advisor_sessions
  for delete using (auth.uid() = user_id);

-- ── advisor_messages policies ────────────────────────────────────────────────
drop policy if exists advisor_messages_select_own on public.advisor_messages;
create policy advisor_messages_select_own on public.advisor_messages
  for select using (auth.uid() = user_id);

drop policy if exists advisor_messages_write_pro on public.advisor_messages;
create policy advisor_messages_write_pro on public.advisor_messages
  for insert with check (auth.uid() = user_id and public.is_pro());

drop policy if exists advisor_messages_delete_own on public.advisor_messages;
create policy advisor_messages_delete_own on public.advisor_messages
  for delete using (auth.uid() = user_id);
