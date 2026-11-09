import { loadProjectsRegistry } from "./project-registry.js";
import { getProjectServicesSummary } from "../services/project-services.js";

/*
 * Application-level mediator for the Project Overview.
 * It composes public module contracts; the Projects UI never queries
 * Services-owned tables directly.
 */
export async function loadProjectsWorkspace() {
  const registry = await loadProjectsRegistry();
  if (registry.error) return { ...registry, serviceCounts: {} };
  const services = await getProjectServicesSummary();
  return {
    projects: registry.projects,
    error: null,
    serviceCounts: services.counts,
    serviceSummaryError: services.error || null
  };
}
