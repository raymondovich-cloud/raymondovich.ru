-- version 1.0
-- Private ecosystem tools registry. Applied as migration 20261009132459_create_ecosystem_tools_registry.

create table public.ecosystem_tools (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('ai','development','domains_dns','database','hosting','analytics','payments','communication','other')),
  description text not null default '',
  official_url text,
  status text not null default 'active' check (status in ('active','testing','paused','retired','needs_verification')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug),
  unique (owner_id, id)
);

create table public.tool_resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tool_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  resource_type text not null check (resource_type in ('repository','domain','database','server','api','deployment','dns_zone','supabase_project','other')),
  resource_url text,
  external_id text,
  environment text check (environment is null or environment in ('production','staging','development')),
  status text not null default 'needs_verification' check (status in ('active','testing','paused','retired','unknown','needs_verification')),
  description text not null default '',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tool_resources_tool_owner_fk foreign key (owner_id, tool_id) references public.ecosystem_tools(owner_id, id) on delete cascade,
  unique (owner_id, id)
);

create table public.project_tool_relations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  tool_id uuid not null,
  relationship_type text not null check (relationship_type in ('manual_use','technical_integration','infrastructure_dependency','other')),
  purpose text not null default '',
  status text not null default 'needs_verification' check (status in ('planned','active','paused','retired','needs_verification')),
  evidence_note text not null default '',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_tool_relations_tool_owner_fk foreign key (owner_id, tool_id) references public.ecosystem_tools(owner_id, id) on delete cascade,
  unique (owner_id, project_id, tool_id, relationship_type)
);

create table public.project_resource_relations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_id uuid not null,
  role text not null default '',
  status text not null default 'needs_verification' check (status in ('planned','active','paused','retired','needs_verification')),
  evidence_note text not null default '',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_resource_relations_resource_owner_fk foreign key (owner_id, resource_id) references public.tool_resources(owner_id, id) on delete cascade,
  unique (owner_id, project_id, resource_id)
);

create index ecosystem_tools_owner_status_idx on public.ecosystem_tools(owner_id, status);
create index tool_resources_owner_tool_idx on public.tool_resources(owner_id, tool_id);
create index project_tool_relations_owner_project_idx on public.project_tool_relations(owner_id, project_id);
create index project_tool_relations_owner_tool_idx on public.project_tool_relations(owner_id, tool_id);
create index project_resource_relations_owner_project_idx on public.project_resource_relations(owner_id, project_id);
create index project_resource_relations_owner_resource_idx on public.project_resource_relations(owner_id, resource_id);

alter table public.ecosystem_tools enable row level security;
alter table public.tool_resources enable row level security;
alter table public.project_tool_relations enable row level security;
alter table public.project_resource_relations enable row level security;

create policy "admin manages ecosystem tools" on public.ecosystem_tools for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid()))
with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid()));

create policy "admin manages tool resources" on public.tool_resources for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid()))
with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid())
  and exists (select 1 from public.ecosystem_tools t where t.id = tool_id and t.owner_id = (select auth.uid())));

create policy "admin manages project tool relations" on public.project_tool_relations for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())))
with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  and exists (select 1 from public.ecosystem_tools t where t.id = tool_id and t.owner_id = (select auth.uid())));

create policy "admin manages project resource relations" on public.project_resource_relations for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  and exists (select 1 from public.tool_resources r where r.id = resource_id and r.owner_id = (select auth.uid())))
with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin' and owner_id = (select auth.uid())
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  and exists (select 1 from public.tool_resources r where r.id = resource_id and r.owner_id = (select auth.uid())));

create function public.set_ecosystem_tools_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.set_ecosystem_tools_updated_at() from public, anon;

create trigger ecosystem_tools_updated_at before update on public.ecosystem_tools for each row execute function public.set_ecosystem_tools_updated_at();
create trigger tool_resources_updated_at before update on public.tool_resources for each row execute function public.set_ecosystem_tools_updated_at();
create trigger project_tool_relations_updated_at before update on public.project_tool_relations for each row execute function public.set_ecosystem_tools_updated_at();
create trigger project_resource_relations_updated_at before update on public.project_resource_relations for each row execute function public.set_ecosystem_tools_updated_at();

revoke all privileges on table public.user_profiles from anon, authenticated;
grant select, insert, update on table public.user_profiles to authenticated;
