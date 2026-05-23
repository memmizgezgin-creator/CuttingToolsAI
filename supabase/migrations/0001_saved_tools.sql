create extension if not exists "uuid-ossp";

create table if not exists public.saved_tools (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  created_at timestamptz not null default now(),
  unique (user_id, sku)
);

alter table public.saved_tools enable row level security;

create policy "saved_tools_select_own"
on public.saved_tools
for select
using (auth.uid() = user_id);

create policy "saved_tools_insert_own"
on public.saved_tools
for insert
with check (auth.uid() = user_id);

create policy "saved_tools_delete_own"
on public.saved_tools
for delete
using (auth.uid() = user_id);