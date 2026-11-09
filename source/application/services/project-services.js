import { listProjectServiceDetails } from "../../infrastructure/supabase/projects-repository.js";

export async function getProjectServices(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  const result = await listProjectServiceDetails(projectId);
  return {
    services: result.services.data || [],
    resources: result.resources.data || [],
    error: result.services.error || result.resources.error || null
  };
}
