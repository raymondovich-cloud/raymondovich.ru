export async function getProjectAnalyticsSummary(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", label: "Ожидает источников данных" };
}
export async function getProjectAnalytics(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", snapshots: [] };
}
