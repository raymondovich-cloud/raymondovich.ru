begin;

alter table public.projects
  add column if not exists deleted_at timestamptz;

comment on column public.projects.deleted_at is
  'Timestamp when the project was moved to the owner trash. NULL means active.';

create index if not exists projects_owner_deleted_at_idx
  on public.projects (owner_id, deleted_at desc)
  where deleted_at is not null;

drop policy if exists "admin manages projects" on public.projects;

create policy "admin reads projects"
  on public.projects
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (select auth.uid()) = owner_id
  );

create policy "admin creates projects"
  on public.projects
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (select auth.uid()) = owner_id
  );

create policy "admin updates projects"
  on public.projects
  for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (select auth.uid()) = owner_id
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (select auth.uid()) = owner_id
  );

create policy "admin permanently deletes trashed projects"
  on public.projects
  for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (select auth.uid()) = owner_id
    and deleted_at is not null
  );

commit;
