-- ================================================================
-- ASTREA CRM – Migration: Projects
-- Ejecutar completo en Supabase SQL Editor
-- ================================================================

-- ── TABLA PROJECTS ───────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  color       text not null default '#60A5FA',
  team_id     uuid not null references public.teams(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ── AÑADIR project_id A TODAS LAS TABLAS DE ENTIDADES ────────────
alter table public.contacts   add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.deals      add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.companies  add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.activities add column if not exists project_id uuid references public.projects(id) on delete set null;

-- ── RLS PROJECTS ─────────────────────────────────────────────────
alter table public.projects enable row level security;

drop policy if exists "team members can manage projects" on public.projects;
create policy "team members can manage projects"
  on public.projects for all
  using (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- ── ÍNDICES ───────────────────────────────────────────────────────
create index if not exists projects_team_id_idx      on public.projects(team_id);
create index if not exists contacts_project_id_idx   on public.contacts(project_id);
create index if not exists deals_project_id_idx      on public.deals(project_id);
create index if not exists companies_project_id_idx  on public.companies(project_id);
create index if not exists activities_project_id_idx on public.activities(project_id);
