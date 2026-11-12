begin;

alter table public.ideas
  add column if not exists deleted_at timestamptz;

comment on column public.ideas.deleted_at is
  'Timestamp when the idea was moved to the owner trash. NULL means not deleted; archive state remains in status and archived_at.';

create index if not exists ideas_owner_deleted_at_idx
  on public.ideas (owner_id, deleted_at desc)
  where deleted_at is not null;

drop policy if exists "admin manages ideas" on public.ideas;

create policy "admin reads ideas" on public.ideas for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id);

create policy "admin creates ideas" on public.ideas for insert to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id);

create policy "admin updates ideas" on public.ideas for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id)
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id);

create policy "admin permanently deletes trashed ideas" on public.ideas for delete to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and (select auth.uid()) = owner_id and deleted_at is not null);

grant delete on public.ideas to authenticated;

alter table public.idea_activity
  drop constraint if exists idea_activity_event_type_check;

alter table public.idea_activity
  add constraint idea_activity_event_type_check
  check (event_type = any (array[
    'created'::text,
    'updated'::text,
    'status_changed'::text,
    'priority_changed'::text,
    'category_changed'::text,
    'archived'::text,
    'restored'::text,
    'converted'::text,
    'moved_to_trash'::text,
    'restored_from_trash'::text
  ]));

commit;
