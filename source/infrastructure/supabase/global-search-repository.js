import { supabase } from "./client.js";

const RESULT_LIMIT = 8;

function searchPattern(query) {
  const term = String(query || "")
    .trim()
    .replace(/[(),\\]/g, " ")
    .replace(/[%_]/g, "\\$&")
    .replace(/\s+/g, " ");
  return `%${term}%`;
}

function searchRows(table, select, columns, pattern) {
  const filters = columns.map(column => `${column}.ilike.${pattern}`).join(",");
  return supabase
    .from(table)
    .select(select)
    .or(filters)
    .order("updated_at", { ascending: false })
    .limit(RESULT_LIMIT);
}

/** Queries use the current authenticated Supabase session; RLS remains authoritative. */
export function searchProjects(query) {
  return searchRows("projects", "id,name,description,goal,concept,business_model,additional_info,status,priority,updated_at", ["name", "description", "goal", "concept", "business_model", "additional_info", "status", "priority"], searchPattern(query));
}

export function searchIdeas(query) {
  return searchRows("ideas", "id,name,description,goal,concept,business_model,additional_info,status,priority,updated_at", ["name", "description", "goal", "concept", "business_model", "additional_info", "status", "priority"], searchPattern(query));
}

export function searchEcosystemTools(query) {
  return searchRows("ecosystem_tools", "id,name,description,category,status,updated_at", ["name", "description", "category"], searchPattern(query));
}

export function searchToolResources(query) {
  return searchRows("tool_resources", "id,name,description,resource_type,environment,status,tool_id,external_id,resource_url,updated_at", ["name", "description", "resource_type", "environment", "status", "external_id", "resource_url"], searchPattern(query));
}

export function searchProjectServices(query) {
  return searchRows("project_tool_relations", "id,project_id,purpose,evidence_note,relationship_type,status,updated_at,projects(name),ecosystem_tools(name,description)", ["purpose", "evidence_note", "relationship_type", "status"], searchPattern(query));
}

export function searchProjectResources(query) {
  return searchRows("project_resource_relations", "id,project_id,role,evidence_note,status,updated_at,projects(name),tool_resources(name,description,resource_type)", ["role", "evidence_note", "status"], searchPattern(query));
}
