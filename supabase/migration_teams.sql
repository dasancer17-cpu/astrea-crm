-- ── TEAMS ─────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── TEAM MEMBERS ──────────────────────────────────────────────────
create table if not exists public.team_members (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'admin', 'member')),
  invite_email text,
  invite_token text unique,
  status       text not null default 'active' check (status in ('active', 'pending')),
  joined_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- ── ADD team_id TO ENTITY TABLES ──────────────────────────────────
alter table public.companies  add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.contacts   add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.deals      add column if not exists team_id uuid references public.teams(id) on delete cascade;
alter table public.activities add column if not exists team_id uuid references public.teams(id) on delete cascade;

-- ── RLS: TEAMS ────────────────────────────────────────────────────
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "team members can view team" on public.teams;
create policy "team members can view team"
  on public.teams for select
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "users can create teams" on public.teams;
create policy "users can create teams"
  on public.teams for insert
  with check (created_by = auth.uid());

drop policy if exists "owners can update team" on public.teams;
create policy "owners can update team"
  on public.teams for update
  using (
    id in (
      select team_id from public.team_members
      where user_id = auth.uid() and role = 'owner' and status = 'active'
    )
  );

-- ── RLS: TEAM MEMBERS ─────────────────────────────────────────────
drop policy if exists "view team members" on public.team_members;
create policy "view team members"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members tm2
      where tm2.user_id = auth.uid() and tm2.status = 'active'
    )
  );

drop policy if exists "insert team members" on public.team_members;
create policy "insert team members"
  on public.team_members for insert
  with check (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members tm2
      where tm2.user_id = auth.uid() and tm2.role in ('owner', 'admin') and tm2.status = 'active'
    )
  );

drop policy if exists "owners can delete members" on public.team_members;
create policy "owners can delete members"
  on public.team_members for delete
  using (
    team_id in (
      select team_id from public.team_members tm2
      where tm2.user_id = auth.uid() and tm2.role in ('owner', 'admin') and tm2.status = 'active'
    )
    or user_id = auth.uid()
  );

-- ── ACCEPT INVITE FUNCTION (security definer bypasses RLS) ────────
create or replace function public.accept_invite(p_token text)
returns json language plpgsql security definer as $$
declare
  v_member record;
begin
  select id, team_id, status into v_member
  from public.team_members
  where invite_token = p_token and status = 'pending';

  if not found then
    return json_build_object('error', 'Invitación no válida o expirada');
  end if;

  if exists (
    select 1 from public.team_members
    where user_id = auth.uid() and status = 'active'
  ) then
    return json_build_object('error', 'Ya perteneces a un equipo');
  end if;

  update public.team_members
  set user_id    = auth.uid(),
      status     = 'active',
      joined_at  = now(),
      invite_token = null
  where id = v_member.id;

  return json_build_object('team_id', v_member.team_id::text);
end;
$$;

-- ── UPDATE ENTITY TABLE RLS (team-aware, backward compatible) ─────
drop policy if exists "users can manage own companies" on public.companies;
create policy "users can manage own companies"
  on public.companies for all
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "users can manage own contacts" on public.contacts;
create policy "users can manage own contacts"
  on public.contacts for all
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "users can manage own deals" on public.deals;
create policy "users can manage own deals"
  on public.deals for all
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

drop policy if exists "users can manage own activities" on public.activities;
create policy "users can manage own activities"
  on public.activities for all
  using (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    user_id = auth.uid()
    or team_id in (
      select team_id from public.team_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- ── INDEXES ───────────────────────────────────────────────────────
create index if not exists team_members_team_id_idx on public.team_members(team_id);
create index if not exists team_members_user_id_idx on public.team_members(user_id);
create index if not exists team_members_token_idx   on public.team_members(invite_token) where invite_token is not null;
create index if not exists companies_team_id_idx    on public.companies(team_id);
create index if not exists contacts_team_id_idx     on public.contacts(team_id);
create index if not exists deals_team_id_idx        on public.deals(team_id);
create index if not exists activities_team_id_idx   on public.activities(team_id);
