create table public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  idea_id uuid references public.ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_favorites_exactly_one_target
    check (num_nonnulls(project_id, idea_id) = 1)
);

create unique index user_favorites_user_project_unique
  on public.user_favorites (user_id, project_id)
  where project_id is not null;

create unique index user_favorites_user_idea_unique
  on public.user_favorites (user_id, idea_id)
  where idea_id is not null;

create index user_favorites_user_created_at_idx
  on public.user_favorites (user_id, created_at desc);

alter table public.user_favorites enable row level security;

create policy "Users read their own favorites"
  on public.user_favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins add their own active project and idea favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and (
      (
        project_id is not null
        and exists (
          select 1
          from public.projects p
          where p.id = project_id
            and p.owner_id = (select auth.uid())
            and p.deleted_at is null
        )
      )
      or
      (
        idea_id is not null
        and exists (
          select 1
          from public.ideas i
          where i.id = idea_id
            and i.owner_id = (select auth.uid())
            and i.deleted_at is null
        )
      )
    )
  );

create policy "Users remove their own favorites"
  on public.user_favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_favorites from anon;
grant select, insert, delete on table public.user_favorites to authenticated;
