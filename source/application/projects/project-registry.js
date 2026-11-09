import { listProjects, insertProjectRecord, countProjectsSummary } from "../../infrastructure/supabase/projects-repository.js";

export async function loadProjectsRegistry() {
  const projects = await listProjects();
  if (projects.error) return { error: projects.error, projects: [] };
  return { error: null, projects: projects.data || [] };
}

export async function createProjectRecord(userId, values) {
  const payload = {
    owner_id: userId,
    name: String(values.name || "").trim(),
    description: String(values.description || "").trim(),
    goal: String(values.goal || "").trim(),
    status: values.status,
    priority: values.priority,
    source_idea_id: null
  };
  return insertProjectRecord(payload);
}

export async function getProjectsSummary(){
  const result=await countProjectsSummary();
  return {total:result.total,activeCount:result.activeCount,error:result.error||null};
}
