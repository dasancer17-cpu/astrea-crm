-- ================================================================
-- ASTREA CRM – Migration: Profiles + create_team + Fixed RLS
-- Ejecutar completo en Supabase SQL Editor
-- ================================================================

-- ── PROFILES ─────────────────────────────────────────────────────
-- Almacena email y nombre de cada usuario para mostrarlo en la UI
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario ve su propio perfil y el de sus compañeros de equipo
drop policy if exists "profiles viewable by team" on public.profiles;
create policy "profiles viewable by team"
  on public.profiles for select
  using (
    id = auth.uid()
    or id in (
      select tm2.user_id
      from public.team_members tm1
      join public.team_members tm2 on tm1.team_id = tm2.team_id
      where tm1.user_id = auth.uid()
        and tm1.status = 'active'
        and tm2.status = 'active'
        and tm2.user_id is not null
    )
  );

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trigger: crea/actualiza el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: sincroniza usuarios ya existentes
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;


-- ── CREATE_TEAM FUNCTION ──────────────────────────────────────────
-- Crea un equipo y añade al creador como owner en una sola transacción.
-- Security definer para bypassear RLS en la inserción del equipo.
create or replace function public.create_team(p_name text)
returns uuid language plpgsql security definer as $$
declare
  v_team_id uuid;
begin
  insert into public.teams (name, created_by)
  values (p_name, auth.uid())
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role, status, joined_at)
  values (v_team_id, auth.uid(), 'owner', 'active', now());

  return v_team_id;
end;
$$;


-- ── RLS CORREGIDO PARA SAAS ───────────────────────────────────────
-- Regla: si un registro tiene team_id → solo accesible por miembros del equipo.
--        si NO tiene team_id (legacy/solo) → solo accesible por su creador.
-- Esto evita que un usuario que cambia de equipo siga viendo datos del equipo anterior.

-- COMPANIES
drop policy if exists "users can manage own companies" on public.companies;
create policy "users can manage own companies"
  on public.companies for all
  using (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  )
  with check (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  );

-- CONTACTS
drop policy if exists "users can manage own contacts" on public.contacts;
create policy "users can manage own contacts"
  on public.contacts for all
  using (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  )
  with check (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  );

-- DEALS
drop policy if exists "users can manage own deals" on public.deals;
create policy "users can manage own deals"
  on public.deals for all
  using (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  )
  with check (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  );

-- ACTIVITIES
drop policy if exists "users can manage own activities" on public.activities;
create policy "users can manage own activities"
  on public.activities for all
  using (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  )
  with check (
    (team_id is not null and team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    ))
    or (team_id is null and user_id = auth.uid())
  );
