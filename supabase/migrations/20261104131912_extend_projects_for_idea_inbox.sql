-- Extend the existing project lifecycle to support the idea inbox.
-- Ideas and launched projects remain the same entity, avoiding duplicate records.

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('idea', 'review', 'active', 'paused', 'completed', 'archived'));

alter table public.projects
  add column if not exists priority text not null default 'normal',
  add column if not exists target_start_date date,
  add column if not exists target_due_date date;

alter table public.projects
  add constraint projects_priority_check
  check (priority in ('low', 'normal', 'high', 'critical'));

alter table public.projects
  add constraint projects_target_dates_check
  check (
    target_start_date is null
    or target_due_date is null
    or target_due_date >= target_start_date
  );

create index if not exists projects_owner_status_priority_idx
  on public.projects (owner_id, status, priority, updated_at desc);

comment on column public.projects.priority is
  'Planning priority: low, normal, high, critical. Separate from manual pinning.';
comment on column public.projects.target_start_date is
  'Planned project start date.';
comment on column public.projects.target_due_date is
  'Planned project target completion date.';
