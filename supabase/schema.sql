-- ================================================================
-- ASTREA CRM – Database Schema
-- ================================================================

create extension if not exists "uuid-ossp";

-- ── COMPANIES ────────────────────────────────────────────────────
create table if not exists public.companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  domain      text,
  industry    text,
  size        text,
  website     text,
  phone       text,
  address     text,
  notes       text,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── CONTACTS ────────────────────────────────────────────────────
create table if not exists public.contacts (
  id          uuid primary key default uuid_generate_v4(),
  first_name  text not null,
  last_name   text not null,
  email       text,
  phone       text,
  title       text,
  company_id  uuid references public.companies(id) on delete set null,
  lead_score  integer not null default 0 check (lead_score between 0 and 100),
  source      text,
  notes       text,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── ENUM TYPES (via DO block to be idempotent) ───────────────────
do $$ begin
  create type public.deal_stage as enum (
    'nuevo', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.activity_type as enum (
    'note', 'call', 'email', 'meeting', 'task'
  );
exception when duplicate_object then null;
end $$;

-- ── DEALS ───────────────────────────────────────────────────────
create table if not exists public.deals (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  value           numeric(12,2) not null default 0,
  stage           public.deal_stage not null default 'nuevo',
  probability     integer not null default 0 check (probability between 0 and 100),
  expected_close  date,
  contact_id      uuid references public.contacts(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  assigned_to     text,
  notes           text,
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── ACTIVITIES ──────────────────────────────────────────────────
create table if not exists public.activities (
  id          uuid primary key default uuid_generate_v4(),
  type        public.activity_type not null default 'note',
  title       text not null,
  description text,
  contact_id  uuid references public.contacts(id) on delete cascade,
  deal_id     uuid references public.deals(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_updated_at on public.companies;
create trigger companies_updated_at
  before update on public.companies
  for each row execute function public.handle_updated_at();

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.handle_updated_at();

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at
  before update on public.deals
  for each row execute function public.handle_updated_at();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────
alter table public.companies  enable row level security;
alter table public.contacts   enable row level security;
alter table public.deals      enable row level security;
alter table public.activities enable row level security;

-- Drop existing policies if any (idempotent)
drop policy if exists "users can manage own companies"  on public.companies;
drop policy if exists "users can manage own contacts"   on public.contacts;
drop policy if exists "users can manage own deals"      on public.deals;
drop policy if exists "users can manage own activities" on public.activities;

create policy "users can manage own companies"
  on public.companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage own contacts"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage own deals"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage own activities"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── INDEXES ─────────────────────────────────────────────────────
create index if not exists contacts_company_id_idx   on public.contacts(company_id);
create index if not exists contacts_user_id_idx      on public.contacts(user_id);
create index if not exists deals_stage_idx           on public.deals(stage);
create index if not exists deals_user_id_idx         on public.deals(user_id);
create index if not exists activities_contact_id_idx on public.activities(contact_id);
create index if not exists activities_deal_id_idx    on public.activities(deal_id);
create index if not exists activities_user_id_idx    on public.activities(user_id);
