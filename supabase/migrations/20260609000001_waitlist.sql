-- Waitlist for Pro early access (Stripe goes live July 2026)
create table if not exists public.waitlist (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  source     text        not null default 'pro_cta',
  created_at timestamptz not null default now(),
  constraint waitlist_email_key unique (email)
);

alter table public.waitlist enable row level security;
-- No RLS policies: deny-by-default. Only service_role (server-side) can read/write.
