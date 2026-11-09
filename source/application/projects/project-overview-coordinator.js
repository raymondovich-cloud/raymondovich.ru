import { loadProjectsRegistry } from "./project-registry.js";
import { getProjectServicesSummary } from "../services/project-services.js";
import { getProjectAccountingSummary } from "../accounting/project-accounting.js";
import { getProjectAnalyticsSummary } from "../analytics/project-analytics.js";
import { getProjectMarketingSummary } from "../marketing/project-marketing.js";

/*
 * Application-level mediator for the Project Overview.
 * It composes public module contracts; the Projects UI never queries
 * Services-owned tables directly.
 */
export async function loadProjectsWorkspace() {
  const registry = await loadProjectsRegistry();
  if (registry.error) return { ...registry, moduleSummaries: {} };
  const services = await getProjectServicesSummary();
  const summaries = await Promise.all(registry.projects.map(async project => {
    const [finance,insights,promotion] = await Promise.all([
      getProjectAccountingSummary(project.id),
      getProjectAnalyticsSummary(project.id),
      getProjectMarketingSummary(project.id)
    ]);
    return [project.id,{
      services: { count: services.counts[project.id] || 0, label: services.error ? "Нет данных" : (services.counts[project.id] ? services.counts[project.id]+" подключено" : "Нет подключённых сервисов") },
      accounting: finance,
      analytics: insights,
      marketing: promotion
    }];
  }));
  return {
    projects: registry.projects,
    error: null,
    moduleSummaries: Object.fromEntries(summaries),
    serviceSummaryError: services.error || null
  };
}
