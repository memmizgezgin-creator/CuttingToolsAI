# ToolAdvisor Phase 1.2 schema

## Tables

### `public.organizations`

- `id uuid primary key default uuid_generate_v4()`
- `name text not null`
- `type text not null check in ('personal', 'business', 'group')`
- `parent_org_id uuid null references public.organizations(id) on delete set null`
- `plan text not null default 'free' check in ('free', 'pro', 'business', 'group')`
- `plan_locked_price_eur numeric null`
- `created_at timestamptz not null default now()`

Purpose:
- personal workspace for every user
- business accounts with shared access
- group hierarchy via `parent_org_id`
- pricing groundwork with locked launch price support

### `public.memberships`

- `user_id uuid not null references auth.users(id) on delete cascade`
- `org_id uuid not null references public.organizations(id) on delete cascade`
- `role text not null check in ('owner', 'admin', 'member')`
- `created_at timestamptz not null default now()`
- primary key: `(user_id, org_id)`

Purpose:
- maps users into personal, business, and group organizations
- supports role-aware shared saved lists and later seat billing

### `public.products`

- `sku text primary key`
- `brand text not null`
- `family text null`
- `type_geometry text null`
- `coating text null`
- `diameter_mm numeric null`
- `flute_count integer null`
- `helix_angle_deg numeric null`
- `shank text null`
- `length_oal_mm numeric null`
- `length_loc_mm numeric null`
- `material_compat text[] not null default '{}'`
- `machine_type text[] not null default '{}'`
- `application text[] not null default '{}'`
- `alternatives_to text[] not null default '{}'`
- `price_hint_eur numeric null`
- `source_url text null`
- `last_updated date null`
- `curator_id uuid null references auth.users(id) on delete set null`
- `notes text null`
- `created_at timestamptz not null default now()`

Comparison matrix coverage:
- card fields: brand, sku, type_geometry, coating, diameter_mm, price_hint_eur
- detail fields: flute_count, helix_angle_deg, shank, length_oal_mm, length_loc_mm, material_compat, machine_type, application, alternatives_to

Current seeding maps the legacy 36-row directory dataset into this schema. Fields unavailable in the legacy JS source stay `NULL`.

### `public.ai_quota`

- `user_id uuid not null references auth.users(id) on delete cascade`
- `month date not null`
- `count integer not null default 0`
- primary key: `(user_id, month)`

Purpose:
- monthly AI quota groundwork for Free, Pro, Business, and Group plans

### `public.saved_tools`

Existing table from Phase 1.1 plus:

- `org_id uuid null references public.organizations(id) on delete cascade`

Uniqueness:
- personal saves: unique `(user_id, sku)` where `org_id is null`
- shared saves: unique `(user_id, org_id, sku)` where `org_id is not null`

Purpose:
- keeps existing personal saved tools behavior
- adds shared organization lists without breaking single-user mode

## RLS rules

### `public.products`

- `SELECT`: public, including anon
- `INSERT`, `UPDATE`, `DELETE`: authenticated users
- current curator access is intentionally broad for Phase 1.2
- follow-up tightening is marked with TODO comments on the policies

### `public.organizations`

- `SELECT`: authenticated members of the organization only
- `INSERT`: any authenticated user
- `UPDATE`: only `owner` or `admin` members of that organization

### `public.memberships`

- `SELECT`: authenticated users can read their own memberships and memberships inside organizations they belong to
- `INSERT`: self insert is allowed for signup bootstrap, otherwise only `owner` or `admin` of the target org can add members

### `public.ai_quota`

- `SELECT`: own row only
- `INSERT`: own row only
- `UPDATE`: own row only

### `public.saved_tools`

- `SELECT`: own personal saves plus any rows tied to an `org_id` the viewer belongs to
- `INSERT`: only by the row owner, and if `org_id` is set the user must belong to that org
- `DELETE`: row owner, or `owner/admin` of the linked organization

## Signup trigger flow

Function:
- `public.handle_new_user_personal_org()`

Trigger:
- `on_auth_user_created_personal_org`
- fires `AFTER INSERT` on `auth.users`

Flow:
1. new user signs up
2. trigger creates `public.organizations` row with:
   - `type = 'personal'`
   - `plan = 'free'`
   - `name = coalesce(email, full_name, user_id)`
3. trigger inserts `public.memberships` row with:
   - `user_id = auth.users.id`
   - created org id
   - `role = 'owner'`

Result:
- every signup gets an immediate personal org
- current frontend can resolve a default org context with no later retrofit

## Manual SQL execution order

Run in Supabase SQL Editor in this order:

1. `/Users/muratonder/Desktop/ToolAdvisor/supabase/migrations/0001_saved_tools.sql`
2. `/Users/muratonder/Desktop/ToolAdvisor/supabase/migrations/0002_products_and_orgs.sql`
3. `/Users/muratonder/Desktop/ToolAdvisor/supabase/migrations/0003_seed_products.sql`