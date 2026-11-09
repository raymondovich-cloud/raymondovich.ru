import { supabase } from "./client.js";

export async function listProjects() {
  return supabase.from("projects")
    .select("id,owner_id,name,description,goal,status,priority,source_idea_id,created_at,updated_at")
    .order("updated_at",{ascending:false});
}

export async function listProjectToolRelations(projectId = null) {
  let query = supabase.from("project_tool_relations").select("project_id,status");
  if (projectId) query = query.eq("project_id",projectId);
  return query;
}

export async function listProjectServiceDetails(projectId) {
  const [services,resources] = await Promise.all([
    supabase.from("project_tool_relations")
      .select("id,tool_id,relationship_type,purpose,status,evidence_note,last_verified_at,ecosystem_tools(name,category,official_url)")
      .eq("project_id",projectId).order("created_at",{ascending:false}),
    listProjectResources(projectId)
  ]);
  return { services, resources };
}

export async function listProjectResources(projectId) {
  return supabase.from("project_resource_relations")
    .select("id,role,status,evidence_note,tool_resources(id,name,resource_type,resource_url,external_id,environment,status,description,ecosystem_tools(id,name))")
    .eq("project_id",projectId).order("created_at",{ascending:false});
}

export async function insertToolResource(payload) {
  return supabase.from("tool_resources").insert(payload).select("id").single();
}

export async function insertProjectResourceRelation(payload) {
  return supabase.from("project_resource_relations").insert(payload).select("id").single();
}

export async function insertProjectRecord(payload) {
  return supabase.from("projects").insert(payload).select("id").single();
}

export async function findEcosystemToolBySlug(ownerId, slug) {
  return supabase.from("ecosystem_tools")
    .select("id,name,slug,category,official_url,status")
    .eq("owner_id",ownerId).eq("slug",slug).maybeSingle();
}

export async function insertEcosystemTool(payload) {
  return supabase.from("ecosystem_tools").insert(payload).select("id").single();
}

export async function insertProjectToolRelation(payload) {
  return supabase.from("project_tool_relations").insert(payload).select("id").single();
}
