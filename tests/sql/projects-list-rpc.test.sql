-- Raymondovich Projects list RPC validation
-- Version: 1.0.0
-- Updated: 2026-11-16
\set ON_ERROR_STOP on

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function pg_temp.run_projects_list_rpc_tests()
returns void
language plpgsql
as $test$
declare
  v_owner uuid := '31000000-0000-4000-8000-000000000001';
  v_member uuid := '31000000-0000-4000-8000-000000000002';
  v_outsider uuid := '31000000-0000-4000-8000-000000000003';
  v_root uuid;
  v_child uuid;
  v_role_id uuid;
  v_result jsonb;
begin
  insert into auth.users(id) values (v_owner), (v_member), (v_outsider);

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  v_result := public.project_create(null, 'List RPC root', null, 'online', array['website']);
  v_root := (v_result->>'id')::uuid;
  v_result := public.project_create(v_root, 'List RPC child', null, 'offline', array[]::text[]);
  v_child := (v_result->>'id')::uuid;

  select id into v_role_id
  from projects.project_roles
  where is_system and scope = 'child' and code = 'developer';

  insert into projects.project_memberships(project_id, user_id, role_id)
  values (v_child, v_member, v_role_id);

  v_result := public.project_list();
  if (v_result->>'total')::integer <> 2 then
    raise exception 'Owner should see both owned projects; received %', v_result->>'total';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_result->'projects') project
    where project->>'id' = v_root::text and project->>'role' = 'owner'
  ) then
    raise exception 'Owner project missing from project_list response';
  end if;

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  v_result := public.project_list();
  if (v_result->>'total')::integer <> 1
     or v_result->'projects'->0->>'id' <> v_child::text
     or v_result->'projects'->0->>'role' <> 'participant' then
    raise exception 'Member should see only the project they can access';
  end if;

  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  v_result := public.project_list();
  if (v_result->>'total')::integer <> 0 then
    raise exception 'Outsider unexpectedly received project rows';
  end if;

  if (select prosecdef from pg_proc where oid = 'public.project_list()'::regprocedure) then
    raise exception 'Public project_list wrapper must be SECURITY INVOKER';
  end if;
  if not (select prosecdef from pg_proc where oid = 'projects.project_list_internal()'::regprocedure) then
    raise exception 'Internal project_list implementation must be SECURITY DEFINER';
  end if;
  if has_function_privilege('anon', 'public.project_list()', 'EXECUTE')
     or has_function_privilege('anon', 'projects.project_list_internal()', 'EXECUTE') then
    raise exception 'Anonymous role unexpectedly has project_list execution';
  end if;
  if not has_function_privilege('authenticated', 'public.project_list()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'projects.project_list_internal()', 'EXECUTE') then
    raise exception 'Authenticated role lacks project_list execution';
  end if;

  raise notice 'PASS: project_list returns owned and permitted projects, excludes outsiders, and preserves invoker/definer privilege boundaries';
end;
$test$;

select pg_temp.run_projects_list_rpc_tests();
