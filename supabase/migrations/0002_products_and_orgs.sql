create extension if not exists "uuid-ossp";

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('personal', 'business', 'group')),
  parent_org_id uuid references public.organizations(id) on delete set null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business', 'group')),
  plan_locked_price_eur numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create table if not exists public.products (
  sku text primary key,
  brand text not null,
  family text,
  type_geometry text,
  coating text,
  diameter_mm numeric,
  flute_count integer,
  helix_angle_deg numeric,
  shank text,
  length_oal_mm numeric,
  length_loc_mm numeric,
  material_compat text[] not null default '{}',
  machine_type text[] not null default '{}',
  application text[] not null default '{}',
  alternatives_to text[] not null default '{}',
  price_hint_eur numeric,
  source_url text,
  last_updated date,
  curator_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  count integer not null default 0,
  primary key (user_id, month)
);

alter table public.saved_tools
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.ai_quota enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
on public.products
for select
using (true);

create policy "products_authenticated_insert"
on public.products
for insert
to authenticated
with check (true);

create policy "products_authenticated_update"
on public.products
for update
to authenticated
using (true)
with check (true);

create policy "products_authenticated_delete"
on public.products
for delete
to authenticated
using (true);

comment on policy "products_authenticated_insert" on public.products is 'TODO: tighten curator access once dedicated curator roles are live.';
comment on policy "products_authenticated_update" on public.products is 'TODO: tighten curator access once dedicated curator roles are live.';
comment on policy "products_authenticated_delete" on public.products is 'TODO: tighten curator access once dedicated curator roles are live.';

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
  )
);

create policy "organizations_insert_authenticated"
on public.organizations
for insert
to authenticated
with check (true);

create policy "organizations_update_owner_admin"
on public.organizations
for update
to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.memberships m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy "memberships_select_same_org"
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.memberships viewer
    where viewer.org_id = memberships.org_id
      and viewer.user_id = auth.uid()
  )
);

create policy "memberships_insert_owner_admin"
on public.memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.memberships actor
    where actor.org_id = memberships.org_id
      and actor.user_id = auth.uid()
      and actor.role in ('owner', 'admin')
  )
);

create policy "ai_quota_select_own"
on public.ai_quota
for select
to authenticated
using (auth.uid() = user_id);

create policy "ai_quota_update_own"
on public.ai_quota
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ai_quota_insert_own"
on public.ai_quota
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_tools_select_own" on public.saved_tools;
drop policy if exists "saved_tools_insert_own" on public.saved_tools;
drop policy if exists "saved_tools_delete_own" on public.saved_tools;

create policy "saved_tools_select_personal_or_org"
on public.saved_tools
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    org_id is not null
    and exists (
      select 1
      from public.memberships m
      where m.org_id = saved_tools.org_id
        and m.user_id = auth.uid()
    )
  )
);

create policy "saved_tools_insert_own"
on public.saved_tools
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    org_id is null
    or exists (
      select 1
      from public.memberships m
      where m.org_id = saved_tools.org_id
        and m.user_id = auth.uid()
    )
  )
);

create policy "saved_tools_delete_own_or_org_admin"
on public.saved_tools
for delete
to authenticated
using (
  auth.uid() = user_id
  or (
    org_id is not null
    and exists (
      select 1
      from public.memberships m
      where m.org_id = saved_tools.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
);

alter table public.saved_tools
  drop constraint if exists saved_tools_user_id_sku_key;

create unique index if not exists saved_tools_personal_unique_idx
on public.saved_tools (user_id, sku)
where org_id is null;

create unique index if not exists saved_tools_org_unique_idx
on public.saved_tools (user_id, org_id, sku)
where org_id is not null;

create index if not exists memberships_user_idx
on public.memberships (user_id);

create index if not exists memberships_org_idx
on public.memberships (org_id);

create index if not exists organizations_parent_org_idx
on public.organizations (parent_org_id);

create index if not exists products_brand_idx
on public.products (brand);

create index if not exists products_family_idx
on public.products (family);

create index if not exists products_material_compat_idx
on public.products using gin (material_compat);

create index if not exists products_machine_type_idx
on public.products using gin (machine_type);

create index if not exists products_application_idx
on public.products using gin (application);

create index if not exists products_alternatives_to_idx
on public.products using gin (alternatives_to);

create index if not exists ai_quota_user_idx
on public.ai_quota (user_id);

create or replace function public.handle_new_user_personal_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(new.email, new.raw_user_meta_data ->> 'full_name', new.id::text);

  insert into public.organizations (name, type, plan)
  values (org_name, 'personal', 'free')
  returning id into new_org_id;

  insert into public.memberships (user_id, org_id, role)
  values (new.id, new_org_id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_personal_org on auth.users;

create trigger on_auth_user_created_personal_org
after insert on auth.users
for each row
execute function public.handle_new_user_personal_org();