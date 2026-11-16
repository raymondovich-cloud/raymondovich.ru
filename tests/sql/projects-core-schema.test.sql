-- Raymondovich Projects core schema validation tests
-- Version: 1.1.0
-- Updated: 2026-11-16
-- Target: disposable PostgreSQL 17.11 with minimal Supabase Auth fixture
-- This test file inserts only synthetic users and project records.

\set ON_ERROR_STOP on

do $test$
declare
  v_count integer;
  v_parent uuid := '10000000-0000-4000-8000-000000000001';
  v_child uuid := '10000000-0000-4000-8000-000000000002';
  v_grandchild uuid := '10000000-0000-4000-8000-000000000003';
  v_custom_role uuid;
begin
  select count(*) into v_count
  from information_schema.tables
  where table_schema = 'projects' and table_type = 'BASE TABLE';
  if v_count <> 8 then
    raise exception 'Expected 8 core tables, found %', v_count;
  end if;

  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'projects'
    and c.relkind = 'r'
    and c.relrowsecurity;
  if v_count <> 8 then
    raise exception 'Expected RLS on all 8 tables, found %', v_count;
  end if;

  select count(*) into v_count from projects.project_roles where is_system;
  if v_count <> 6 then
    raise exception 'Expected 6 system roles, found %', v_count;
  end if;

  select count(*) into v_count from projects.project_permissions;
  if v_count <> 20 then
    raise exception 'Expected 20 permissions, found %', v_count;
  end if;

  select count(*) into v_count from projects.project_role_permissions;
  if v_count <> 54 then
    raise exception 'Expected 54 role-permission mappings, found %', v_count;
  end if;

  if has_schema_privilege('anon', 'projects', 'USAGE')
     or has_schema_privilege('authenticated', 'projects', 'USAGE') then
    raise exception 'Client role unexpectedly has USAGE on internal projects schema';
  end if;

  if has_table_privilege('anon', 'projects.projects', 'SELECT')
     or has_table_privilege('authenticated', 'projects.projects', 'SELECT')
     or has_table_privilege('anon', 'projects.projects', 'INSERT')
     or has_table_privilege('authenticated', 'projects.projects', 'INSERT') then
    raise exception 'Client role unexpectedly has direct access to projects table';
  end if;

  insert into auth.users(id) values
    ('20000000-0000-4000-8000-000000000001'),
    ('20000000-0000-4000-8000-000000000002'),
    ('20000000-0000-4000-8000-000000000003');

  insert into projects.projects(
    id, parent_project_id, owner_user_id, created_by, name, project_type
  ) values (
    v_parent, null,
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Root test project', 'online'
  );

  insert into projects.projects(
    id, parent_project_id, owner_user_id, created_by, name, project_type
  ) values (
    v_child, v_parent,
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Child test project', 'online'
  );

  insert into projects.projects(
    id, parent_project_id, owner_user_id, created_by, name, project_type
  ) values (
    v_grandchild, v_child,
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Grandchild test project', 'offline'
  );

  insert into projects.project_visibility(project_id) values (v_parent);
  if not exists (
    select 1 from projects.project_visibility
    where project_id = v_parent
      and confidentiality = 'private'
      and showcase_visibility = false
      and profile_visibility = false
  ) then
    raise exception 'New visibility row must default to private and hidden';
  end if;

  begin
    insert into projects.projects(
      id, parent_project_id, owner_user_id, created_by, name, project_type
    ) values (
      '10000000-0000-4000-8000-000000000004', v_parent,
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'Invalid project type', 'hybrid'
    );
    raise exception 'Invalid project_type was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into projects.projects(
      id, parent_project_id, owner_user_id, created_by, name, project_type,
      status, archived_at
    ) values (
      '10000000-0000-4000-8000-000000000005', v_parent,
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'Invalid archive state', 'online', 'archived', null
    );
    raise exception 'Inconsistent archive state was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into projects.projects(
      parent_project_id, owner_user_id, created_by, name, project_type
    ) values (
      v_parent,
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000002',
      'Mismatched owner child', 'online'
    );
    raise exception 'Composite parent-owner FK did not reject mismatched owner';
  exception when foreign_key_violation then
    null;
  end;

  begin
    insert into projects.project_memberships(project_id, user_id, role_id)
    select v_parent,
      '20000000-0000-4000-8000-000000000002',
      id
    from projects.project_roles
    where is_system and scope = 'child' and code = 'leader';
    raise exception 'Role-scope trigger did not reject child role on parent';
  exception when check_violation then
    null;
  end;

  begin
    insert into projects.project_memberships(project_id, user_id, role_id)
    select v_child,
      '20000000-0000-4000-8000-000000000001',
      id
    from projects.project_roles
    where is_system and scope = 'child' and code = 'leader';
    raise exception 'Role-scope trigger did not reject owner membership';
  exception when check_violation then
    null;
  end;

  insert into projects.project_memberships(project_id, user_id, role_id)
  select v_parent,
    '20000000-0000-4000-8000-000000000002',
    id
  from projects.project_roles
  where is_system and scope = 'parent' and code = 'manager';

  insert into projects.project_memberships(project_id, user_id, role_id)
  select v_child,
    '20000000-0000-4000-8000-000000000002',
    id
  from projects.project_roles
  where is_system and scope = 'child' and code = 'developer';

  insert into projects.project_roles(
    project_id, scope, code, name, is_system, created_by
  ) values (
    v_child, 'child', 'custom_reviewer', 'Custom Reviewer', false,
    '20000000-0000-4000-8000-000000000001'
  ) returning id into v_custom_role;

  begin
    insert into projects.project_memberships(project_id, user_id, role_id)
    values (
      v_grandchild,
      '20000000-0000-4000-8000-000000000002',
      v_custom_role
    );
    raise exception 'Custom role was assignable outside its project';
  exception when check_violation then
    null;
  end;

  update projects.projects
  set owner_user_id = '20000000-0000-4000-8000-000000000003'
  where id = v_parent;
  if exists (
    select 1 from projects.projects
    where id in (v_parent, v_child, v_grandchild)
      and owner_user_id <> '20000000-0000-4000-8000-000000000003'
  ) then
    raise exception 'Owner update did not cascade consistently through hierarchy';
  end if;

  update projects.projects
  set owner_user_id = '20000000-0000-4000-8000-000000000001'
  where id = v_parent;

  begin
    delete from auth.users where id = '20000000-0000-4000-8000-000000000001';
    raise exception 'Referenced project owner account deletion was not restricted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    delete from auth.users where id = '20000000-0000-4000-8000-000000000002';
    raise exception 'Referenced member account deletion was not restricted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    delete from projects.projects where id = v_parent;
    raise exception 'Parent project deletion was not restricted while children exist';
  exception when foreign_key_violation then
    null;
  end;

  raise notice 'PASS: schema, RLS, grants, seeds, private defaults, type/archive constraints, hierarchy, owner cascade, membership and custom-role scope, Auth deletion blockers and parent delete restriction';
end;
$test$;

select
  'PASS' as result,
  (select count(*) from projects.project_roles where is_system) as system_roles,
  (select count(*) from projects.project_permissions) as permissions,
  (select count(*) from projects.project_role_permissions) as role_permission_mappings,
  (select count(*) from projects.projects) as synthetic_projects,
  (select count(*) from projects.project_memberships) as synthetic_memberships;
