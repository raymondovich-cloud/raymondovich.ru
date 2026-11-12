begin;

alter table public.ideas
  add column if not exists deleted_at timestamptz;

comment on column public.ideas.deleted_at is
  'Timestamp when the idea was moved to the owner trash. NULL means not deleted; archive state remains in status and archived_at.';

create index if not exists ideas_owner_deleted_at_idx
  on public.ideas (owner_id, deleted_at desc)
  where deleted_at is not null;

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
