-- version 1.0
-- Split the idea inbox from executable projects.
-- Applied to Supabase project yajybgdorhxebbigwjgi on 2026-11-04.

begin;

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '',
  status text not null default 'new' check (status in ('new', 'review', 'launched', 'archived')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  launched_at timestamptz,
  constraint ideas_launched_at_check check ((status = 'launched' and launched_at is not null) or status <> 'launched')
);

create index if not exists ideas_owner_status_priority_updated_idx
  on public.ideas (owner_id, status, priority, updated_at desc);
alter table public.ideas drop constraint if exists ideas_launched_at_check;
alter table public.ideas add constraint ideas_launched_at_check check ((status = 'launched' and launched_at is not null) or status <> 'launched');
alter table public.ideas enable row level security;
drop policy if exists "admin manages ideas" on public.ideas;
create policy "admin manages ideas" on public.ideas for all to authenticated
using ((select (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin' and (select auth.uid()) = owner_id)
with check ((select (auth.jwt() -> 'app_metadata' ->> 'role')) = 'admin' and (select auth.uid()) = owner_id);
grant select, insert, update, delete on public.ideas to authenticated;

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('active', 'paused', 'completed', 'archived'));
alter table public.projects add column if not exists source_idea_id uuid references public.ideas(id) on delete set null;
create unique index if not exists projects_source_idea_id_unique on public.projects (source_idea_id) where source_idea_id is not null;
create index if not exists projects_owner_status_updated_idx on public.projects (owner_id, status, updated_at desc);
comment on table public.ideas is 'Pre-project ideas. A project is created only when an idea is explicitly launched.';
comment on column public.projects.source_idea_id is 'Idea that was explicitly launched to create this project.';

commit;

