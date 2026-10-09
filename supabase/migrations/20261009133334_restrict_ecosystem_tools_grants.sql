-- version 1.0
-- Explicit least-privilege grants for the private tools registry.
revoke all privileges on table public.ecosystem_tools, public.tool_resources, public.project_tool_relations, public.project_resource_relations from anon, authenticated;
grant select, insert, update, delete on table public.ecosystem_tools, public.tool_resources, public.project_tool_relations, public.project_resource_relations to authenticated;
create index project_tool_relations_project_idx on public.project_tool_relations(project_id);
create index project_resource_relations_project_idx on public.project_resource_relations(project_id);
