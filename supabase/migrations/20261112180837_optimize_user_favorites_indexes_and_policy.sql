create index user_favorites_project_id_idx
  on public.user_favorites (project_id)
  where project_id is not null;

create index user_favorites_idea_id_idx
  on public.user_favorites (idea_id)
  where idea_id is not null;

drop policy "Admins add their own active project and idea favorites"
  on public.user_favorites;

create policy "Admins add their own active project and idea favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
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
