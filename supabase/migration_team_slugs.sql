-- Add slug column to teams
alter table public.teams add column if not exists slug text;

-- Backfill slugs for existing teams (handle collisions)
do $$
declare
  r record;
  base_slug text;
  final_slug text;
  counter int;
begin
  for r in select id, name from public.teams where slug is null loop
    base_slug := lower(
      regexp_replace(
        regexp_replace(r.name, '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then base_slug := 'equipo'; end if;

    final_slug := base_slug;
    counter := 2;
    while exists (select 1 from public.teams where slug = final_slug and id != r.id) loop
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    end loop;

    update public.teams set slug = final_slug where id = r.id;
  end loop;
end $$;

-- Unique constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'teams_slug_unique'
  ) then
    alter table public.teams add constraint teams_slug_unique unique (slug);
  end if;
end $$;

-- Public lookup function (accessible by anon users on the landing page)
create or replace function public.get_team_by_slug(p_slug text)
returns table(id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from public.teams
  where slug = lower(trim(p_slug))
  limit 1;
$$;

grant execute on function public.get_team_by_slug(text) to anon;
grant execute on function public.get_team_by_slug(text) to authenticated;

-- Update create_team to also generate a slug
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id  uuid;
  v_user_id  uuid;
  base_slug  text;
  final_slug text;
  counter    int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'not authenticated'; end if;

  -- Generate URL-safe slug from name
  base_slug := lower(
    regexp_replace(
      regexp_replace(p_name, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'equipo'; end if;

  -- Handle slug collisions
  final_slug := base_slug;
  counter := 2;
  while exists (select 1 from public.teams where slug = final_slug) loop
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  end loop;

  -- Create team with slug
  insert into public.teams(name, slug) values (p_name, final_slug) returning id into v_team_id;

  -- Add creator as owner
  insert into public.team_members(team_id, user_id, role, status)
  values (v_team_id, v_user_id, 'owner', 'active');

  return v_team_id;
end;
$$;
