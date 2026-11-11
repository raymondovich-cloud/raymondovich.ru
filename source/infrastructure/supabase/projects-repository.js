import { supabase } from "./client.js";

export async function listProjects(){
  return supabase.from("projects").select("id,owner_id,name,description,goal,status,priority,source_idea_id,created_at,updated_at").order("updated_at",{ascending:false});
}
export async function listProjectServiceSummaryRelations(){
  return supabase.from("project_tool_relations").select("project_id,status,monthly_cost,currency");
}
export async function listProjectResourceSummaryRelations(){
  return supabase.from("project_resource_relations").select("project_id,status,monthly_cost,currency");
}
export async function countProjectsSummary(){
  const [total,active]=await Promise.all([
    supabase.from("projects").select("id",{count:"exact",head:true}).neq("status","archived"),
    supabase.from("projects").select("id",{count:"exact",head:true}).eq("status","active")
  ]);
  return {total:total.count||0,activeCount:active.count||0,error:total.error||active.error||null};
}
export async function listProjectServiceDetails(projectId){
  const [services,resources]=await Promise.all([
    supabase.from("project_tool_relations").select("id,tool_id,relationship_type,purpose,status,dependency_level,monthly_cost,currency,next_payment_date,evidence_note,last_verified_at,ecosystem_tools(name,category,official_url)").eq("project_id",projectId).order("created_at",{ascending:false}),
    listProjectResources(projectId)
  ]);
  return {services,resources};
}
export async function listProjectResources(projectId){
  return supabase.from("project_resource_relations").select("id,role,status,dependency_level,monthly_cost,currency,next_payment_date,evidence_note,tool_resources(id,name,resource_type,resource_url,external_id,environment,status,description,ecosystem_tools(id,name))").eq("project_id",projectId).order("created_at",{ascending:false});
}
export async function insertToolResource(payload){return supabase.from("tool_resources").insert(payload).select("id").single();}
export async function insertProjectResourceRelation(payload){return supabase.from("project_resource_relations").insert(payload).select("id").single();}
export async function insertProjectRecord(payload){return supabase.from("projects").insert(payload).select("id").single();}
export async function findEcosystemToolBySlug(ownerId,slug){return supabase.from("ecosystem_tools").select("id,name,slug,category,official_url,status").eq("owner_id",ownerId).eq("slug",slug).maybeSingle();}
export async function insertEcosystemTool(payload){return supabase.from("ecosystem_tools").insert(payload).select("id").single();}
export async function insertProjectToolRelation(payload){return supabase.from("project_tool_relations").insert(payload).select("id").single();}

export async function updateProjectToolRelation(id,payload){return supabase.from("project_tool_relations").update(payload).eq("id",id).select("id").single();}
export async function deleteProjectToolRelation(id){return supabase.from("project_tool_relations").delete().eq("id",id).select("id").single();}
export async function updateEcosystemTool(id,payload){return supabase.from("ecosystem_tools").update(payload).eq("id",id).select("id").single();}
export async function updateToolResource(id,payload){return supabase.from("tool_resources").update(payload).eq("id",id).select("id").single();}
export async function updateProjectResourceRelation(id,payload){return supabase.from("project_resource_relations").update(payload).eq("id",id).select("id").single();}
export async function deleteProjectResourceRelation(id){return supabase.from("project_resource_relations").delete().eq("id",id).select("id").single();}
