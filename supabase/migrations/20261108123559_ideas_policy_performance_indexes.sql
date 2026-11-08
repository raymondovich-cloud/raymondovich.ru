create index if not exists ideas_category_id_idx on public.ideas(category_id);
create index if not exists idea_activity_actor_id_idx on public.idea_activity(actor_id);

drop policy if exists "admin manages idea categories" on public.idea_categories;
create policy "admin manages idea categories"
on public.idea_categories
for all
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = owner_id
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = owner_id
);

drop policy if exists "admin reads idea activity" on public.idea_activity;
create policy "admin reads idea activity"
on public.idea_activity
for select
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = owner_id
  and exists (
    select 1 from public.ideas i
    where i.id = idea_activity.idea_id
      and i.owner_id = (select auth.uid())
  )
);

drop policy if exists "admin inserts idea activity" on public.idea_activity;
create policy "admin inserts idea activity"
on public.idea_activity
for insert
to authenticated
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (select auth.uid()) = owner_id
  and (select auth.uid()) = actor_id
  and exists (
    select 1 from public.ideas i
    where i.id = idea_activity.idea_id
      and i.owner_id = (select auth.uid())
  )
);
