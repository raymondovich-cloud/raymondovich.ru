import { listProjectServiceDetails, listProjectToolRelations } from "../../infrastructure/supabase/projects-repository.js";

export async function getProjectServices(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  const result = await listProjectServiceDetails(projectId);
  return {
    services: result.services.data || [],
    resources: result.resources.data || [],
    error: result.services.error || result.resources.error || null
  };
}

export async function getProjectServicesSummary() {
  const result = await listProjectToolRelations();
  if (result.error) return { counts: {}, error: result.error };
  const counts = {};
  for (const relation of result.data || []) {
    if (relation.status !== "active") continue;
    counts[relation.project_id] = (counts[relation.project_id] || 0) + 1;
  }
  return { counts, error: null };
}
