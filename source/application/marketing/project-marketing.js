export async function getProjectMarketingSummary(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", label: "Нет добавленных площадок" };
}
export async function getProjectMarketing(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", channels: [] };
}
