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


-- Keep the atomic conversion RPC from acting on records in the trash.
create or replace function public.convert_idea_to_project(p_idea_id uuid)
returns table(project_id uuid, project_name text, already_created boolean)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text := auth.jwt() -> 'app_metadata' ->> 'role';
  v_idea public.ideas%rowtype;
  v_project public.projects%rowtype;
begin
  if v_user_id is null or v_role is distinct from 'admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select i.* into v_idea
    from public.ideas as i
   where i.id = p_idea_id and i.owner_id = v_user_id
   for update;

  if not found then
    raise exception 'Idea not found' using errcode = 'P0002';
  end if;

  if v_idea.deleted_at is not null then
    raise exception 'Trashed ideas cannot be converted' using errcode = '22023';
  end if;

  select p.* into v_project
    from public.projects as p
   where p.source_idea_id = v_idea.id and p.owner_id = v_user_id;

  if found then
    if v_idea.status <> 'converted' then
      update public.ideas set status = 'converted', updated_at = now() where id = v_idea.id;
      insert into public.idea_activity (idea_id, owner_id, actor_id, event_type, details)
      values (v_idea.id, v_user_id, v_user_id, 'converted',
              jsonb_build_object('project_id', v_project.id, 'reconciled', true));
    end if;
    return query select v_project.id, v_project.name, true;
    return;
  end if;

  if v_idea.status = 'archived' then
    raise exception 'Archived ideas cannot be converted' using errcode = '22023';
  end if;

  insert into public.projects (
    owner_id, name, description, goal, completion_criteria, status, priority,
    source_idea_id, estimated_cost, additional_info, expected_revenue,
    business_model, concept
  ) values (
    v_user_id, v_idea.name, coalesce(v_idea.description, ''), coalesce(v_idea.goal, ''),
    '', 'active', v_idea.priority, v_idea.id, v_idea.estimated_cost,
    coalesce(v_idea.additional_info, ''), v_idea.expected_revenue,
    coalesce(v_idea.business_model, ''), coalesce(v_idea.concept, '')
  )
  returning * into v_project;

  update public.ideas set status = 'converted', updated_at = now() where id = v_idea.id;

  insert into public.idea_activity (idea_id, owner_id, actor_id, event_type, details)
  values (v_idea.id, v_user_id, v_user_id, 'converted',
          jsonb_build_object('project_id', v_project.id, 'project_name', v_project.name));

  return query select v_project.id, v_project.name, false;
end;
$function$;

revoke all on function public.convert_idea_to_project(uuid) from public, anon;
grant execute on function public.convert_idea_to_project(uuid) to authenticated;
