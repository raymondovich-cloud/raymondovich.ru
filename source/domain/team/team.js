/* Version: 1.0.0 */
/* Updated: 2026-11-24 */

/**
 * Team domain input rules.
 * Persistence, authentication and UI are intentionally outside this module.
 */
export function normalizeTeamInput({ name, description = "" } = {}) {
  const normalizedName = String(name || "").trim();
  const normalizedDescription = String(description || "").trim();

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new Error("Название команды должно содержать от 2 до 80 символов.");
  }
  if (normalizedDescription.length > 500) {
    throw new Error("Описание команды не должно превышать 500 символов.");
  }

  return {
    name: normalizedName,
    description: normalizedDescription || null,
  };
}
