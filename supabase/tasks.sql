-- Tasks table + RLS policies for a per-user Kanban board.
-- Run this in your Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo','in_progress','in_review','done')),
  priority text default 'normal' check (priority in ('low','normal','high')),
  tags text[] default '{}'::text[],
  initial_comment text,
  due_date date,
  user_id uuid,
  assigned_to uuid,
  created_at timestamp with time zone default now()
);

alter table public.tasks add column if not exists assigned_to uuid;
alter table public.tasks add column if not exists tags text[] default '{}'::text[];
alter table public.tasks add column if not exists initial_comment text;

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_user_id_status_idx on public.tasks (user_id, status);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists tasks_tags_gin_idx on public.tasks using gin (tags);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks
for select
using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks
for delete
using (auth.uid() = user_id);

-- Activity log (one row per user-visible action)
create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid not null,
  message text not null,
  created_at timestamp with time zone default now()
);

create index if not exists task_activities_task_id_created_at_idx
on public.task_activities (task_id, created_at desc);

alter table public.task_activities enable row level security;

drop policy if exists "task_activities_select_own" on public.task_activities;
create policy "task_activities_select_own"
on public.task_activities
for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "task_activities_insert_own" on public.task_activities;
create policy "task_activities_insert_own"
on public.task_activities
for insert
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
  )
);

-- Daily tasks (one row per user+task, with "checked" for today's completion)
create table if not exists public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_id uuid not null references public.tasks (id) on delete cascade,
  checked boolean not null default false,
  checked_date date,
  created_at timestamp with time zone default now(),
  unique (user_id, task_id)
);

create index if not exists daily_tasks_user_id_idx on public.daily_tasks (user_id);
create index if not exists daily_tasks_user_id_checked_date_idx
on public.daily_tasks (user_id, checked_date);

alter table public.daily_tasks enable row level security;

drop policy if exists "daily_tasks_select_own" on public.daily_tasks;
create policy "daily_tasks_select_own"
on public.daily_tasks
for select
using (auth.uid() = user_id);

drop policy if exists "daily_tasks_insert_own" on public.daily_tasks;
create policy "daily_tasks_insert_own"
on public.daily_tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "daily_tasks_update_own" on public.daily_tasks;
create policy "daily_tasks_update_own"
on public.daily_tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "daily_tasks_delete_own" on public.daily_tasks;
create policy "daily_tasks_delete_own"
on public.daily_tasks
for delete
using (auth.uid() = user_id);

-- User stats (XP + streak)
create table if not exists public.user_stats (
  user_id uuid primary key,
  coins integer not null default 0,
  streak integer not null default 0,
  last_award_date date,
  last_award_reminder_ms bigint,
  updated_at timestamp with time zone not null default now()
);

-- Backwards compatibility: if an older schema used "xp", rename it to "coins".
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_stats'
      and column_name = 'xp'
  ) then
    execute 'alter table public.user_stats rename column xp to coins';
  end if;
end $$;

alter table public.user_stats
  add column if not exists last_award_reminder_ms bigint;

create index if not exists user_stats_user_id_idx on public.user_stats (user_id);

alter table public.user_stats enable row level security;

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
on public.user_stats
for select
using (auth.uid() = user_id);

drop policy if exists "user_stats_insert_own" on public.user_stats;
create policy "user_stats_insert_own"
on public.user_stats
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own"
on public.user_stats
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Task comments (multiple per task; disabled for daily tasks)
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now()
);

-- Attribute comments to the authenticated user if the client doesn't send user_id.
alter table public.task_comments
  alter column user_id set default auth.uid();

create index if not exists task_comments_task_id_created_at_idx
on public.task_comments (task_id, created_at asc);

create index if not exists task_comments_user_id_idx
on public.task_comments (user_id);

alter table public.task_comments enable row level security;

drop policy if exists "task_comments_select_own" on public.task_comments;
create policy "task_comments_select_own"
on public.task_comments
for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS task_comments_insert_own ON public.task_comments;

CREATE POLICY task_comments_insert_own
ON public.task_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  task_id IN (
    SELECT id
    FROM public.tasks
  )
);

drop policy if exists "task_comments_delete_own" on public.task_comments;
create policy "task_comments_delete_own"
on public.task_comments
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
  )
);

-- Leaderboard (streak only)
create index if not exists user_stats_streak_updated_at_idx
on public.user_stats (streak desc, updated_at asc, user_id);

create or replace function public.get_streak_leaderboard(p_limit integer default 10)
returns table (
  user_id uuid,
  streak integer,
  rank bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    us.user_id,
    us.streak,
    dense_rank() over (order by us.streak desc, us.updated_at asc, us.user_id asc) as rank
  from public.user_stats us
  where us.streak > 0
  order by us.streak desc, us.updated_at asc, us.user_id asc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.get_streak_leaderboard(integer) from public;
grant execute on function public.get_streak_leaderboard(integer) to authenticated;

-- Public profiles for auth users (for leaderboards, display names, etc.)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists user_profiles_display_name_idx
on public.user_profiles (display_name);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Coins leaderboard (coins only)
create index if not exists user_stats_coins_updated_at_idx
on public.user_stats (coins desc, updated_at asc, user_id);

create or replace function public.get_coins_leaderboard(p_limit integer default 10)
returns table (
  user_id uuid,
  display_name text,
  coins integer,
  rank bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    us.user_id,
    up.display_name,
    us.coins,
    dense_rank() over (order by us.coins desc, us.updated_at asc, us.user_id asc) as rank
  from public.user_stats us
  left join public.user_profiles up on up.user_id = us.user_id
  where us.coins > 0
  order by us.coins desc, us.updated_at asc, us.user_id asc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.get_coins_leaderboard(integer) from public;
grant execute on function public.get_coins_leaderboard(integer) to authenticated;
