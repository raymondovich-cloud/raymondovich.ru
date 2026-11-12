import { supabase } from "./client.js";

const PROJECT_FIELDS = "id,name,deleted_at,created_at";
const IDEA_FIELDS = "id,name,status,archived_at,deleted_at,created_at";

export async function listTrashedProjects() {
  return supabase.from("projects").select(PROJECT_FIELDS).not("deleted_at","is",null).order("deleted_at",{ascending:false});
}

export async function listTrashedIdeas() {
  return supabase.from("ideas").select(IDEA_FIELDS).not("deleted_at","is",null).order("deleted_at",{ascending:false});
}

export async function moveIdeaToTrash(id) {
  return supabase.from("ideas").update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()})
    .eq("id",id).is("deleted_at",null).select("id,deleted_at").single();
}

export async function restoreIdeaFromTrash(id) {
  return supabase.from("ideas").update({deleted_at:null,updated_at:new Date().toISOString()})
    .eq("id",id).not("deleted_at","is",null).select("id,status,archived_at").single();
}

export async function permanentlyDeleteTrashedIdea(id) {
  return supabase.from("ideas").delete().eq("id",id).not("deleted_at","is",null).select("id").single();
}
