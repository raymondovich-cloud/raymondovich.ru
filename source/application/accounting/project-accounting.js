export async function getProjectAccountingSummary(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", label: "Нет финансовых операций" };
}
export async function getProjectAccounting(projectId) {
  if (!projectId) throw new Error("Project context is required.");
  return { state: "not_configured", entries: [] };
}
