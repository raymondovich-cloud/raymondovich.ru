create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  goal text not null default '',
  completion_criteria text not null default '',
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  weight numeric(6,2) not null check (weight > 0 and weight <= 100),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.project_milestones(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '',
  weight numeric(6,2) not null default 1 check (weight > 0),
  completed boolean not null default false,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  summary text not null,
  previous_progress numeric(6,2),
  new_progress numeric(6,2),
  created_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects(owner_id);
create index project_milestones_project_id_idx on public.project_milestones(project_id);
create index project_tasks_milestone_id_idx on public.project_tasks(milestone_id);
create index project_history_project_id_idx on public.project_history(project_id);
create index project_history_actor_id_idx on public.project_history(actor_id);

alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_history enable row level security;

revoke all on table public.projects, public.project_milestones, public.project_tasks, public.project_history from anon, authenticated;
grant select, insert, update, delete on public.projects, public.project_milestones, public.project_tasks, public.project_history to authenticated;

create policy "admin manages projects"
on public.projects for all
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id)
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id);

create policy "admin manages project milestones"
on public.project_milestones for all
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "admin manages project tasks"
on public.project_tasks for all
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and exists (
    select 1
    from public.project_milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_id and p.owner_id = (select auth.uid())
  )
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and exists (
    select 1
    from public.project_milestones m
    join public.projects p on p.id = m.project_id
    where m.id = milestone_id and p.owner_id = (select auth.uid())
  )
);

create policy "admin reads project history"
on public.project_history for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = actor_id
);

create policy "admin writes project history"
on public.project_history for insert
to authenticated
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = actor_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);
