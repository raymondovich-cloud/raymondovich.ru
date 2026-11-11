begin;

alter table public.ideas
  add column if not exists category_id uuid,
  add column if not exists archived_at timestamptz;

alter table public.ideas
  drop constraint if exists ideas_status_check;

alter table public.ideas
  add constraint ideas_status_check
  check (status = any (array[
    'new'::text,
    'review'::text,
    'selected'::text,
    'in_development'::text,
    'converted'::text,
    'archived'::text,
    'launched'::text
  ]));

create table if not exists public.idea_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_categories_name_check
    check (char_length(btrim(name)) between 1 and 60)
);

create unique index if not exists idea_categories_owner_name_lower_uidx
  on public.idea_categories (owner_id, lower(name));

create index if not exists idea_categories_owner_sort_idx
  on public.idea_categories (owner_id, is_archived, sort_order, name);

alter table public.ideas
  add constraint ideas_category_id_fkey
  foreign key (category_id) references public.idea_categories(id)
  on delete set null;

create index if not exists ideas_owner_category_updated_idx
  on public.ideas (owner_id, category_id, updated_at desc);

create table if not exists public.idea_activity (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint idea_activity_event_type_check
    check (event_type = any (array[
      'created'::text,
      'updated'::text,
      'status_changed'::text,
      'priority_changed'::text,
      'category_changed'::text,
      'archived'::text,
      'restored'::text,
      'converted'::text
    ]))
);

create index if not exists idea_activity_idea_created_idx
  on public.idea_activity (idea_id, created_at desc);

create index if not exists idea_activity_owner_created_idx
  on public.idea_activity (owner_id, created_at desc);

alter table public.idea_categories enable row level security;
alter table public.idea_categories force row level security;
alter table public.idea_activity enable row level security;
alter table public.idea_activity force row level security;

drop policy if exists "admin manages idea categories" on public.idea_categories;
create policy "admin manages idea categories"
on public.idea_categories
for all
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and auth.uid() = owner_id
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and auth.uid() = owner_id
);

drop policy if exists "admin reads idea activity" on public.idea_activity;
create policy "admin reads idea activity"
on public.idea_activity
for select
to authenticated
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and auth.uid() = owner_id
  and exists (
    select 1 from public.ideas i
    where i.id = idea_activity.idea_id
      and i.owner_id = auth.uid()
  )
);

drop policy if exists "admin inserts idea activity" on public.idea_activity;
create policy "admin inserts idea activity"
on public.idea_activity
for insert
to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and auth.uid() = owner_id
  and auth.uid() = actor_id
  and exists (
    select 1 from public.ideas i
    where i.id = idea_activity.idea_id
      and i.owner_id = auth.uid()
  )
);

revoke all on public.idea_categories from anon;
revoke all on public.idea_activity from anon;
grant select, insert, update on public.idea_categories to authenticated;
grant select, insert on public.idea_activity to authenticated;
revoke update, delete, truncate on public.idea_activity from authenticated;

revoke all on public.ideas from anon;
grant select, insert, update on public.ideas to authenticated;
revoke delete, truncate on public.ideas from authenticated;

commit;

