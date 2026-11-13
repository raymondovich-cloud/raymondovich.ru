import { assertWorkspaceSection } from "../../contracts/workspace-section.js";
import { workspaceSection as projects } from "../../domain/projects/workspace-section.js";
import { workspaceSection as ideas } from "../../domain/ideas/workspace-section.js";
import { workspaceSection as team } from "../../domain/team/workspace-section.js";
import { workspaceSection as tools } from "../../domain/tools/workspace-section.js";
import { workspaceSection as profile } from "../../domain/profile/workspace-section.js";

const sections = [projects, ideas, team, tools, profile].map(assertWorkspaceSection);
const routeOwners = new Map();

for (const section of sections) {
  for (const route of section.routes) {
    if (routeOwners.has(route)) {
      throw new Error(`Workspace route "${route}" is declared by multiple domains.`);
    }
    routeOwners.set(route, section);
  }
}

/**
 * Resolves a URL route to its owning bounded context.
 * This use case owns cross-domain route coordination; it does not implement
 * business behavior for the individual domains.
 *
 * @param {string} route
 * @returns {{ sectionId: string, route: string, baseRoute: string, subroute: string | null } | null}
 */
export function resolveWorkspaceRoute(route) {
  if (typeof route !== "string") return null;
  const normalized = route.replace(/^\/+|\/+$/g, "");
  const owner = routeOwners.get(normalized);
  if (!owner) return null;

  return Object.freeze({
    sectionId: owner.id,
    route: normalized,
    baseRoute: owner.baseRoute,
    subroute: normalized === owner.baseRoute
      ? null
      : normalized.slice(owner.baseRoute.length + 1),
  });
}

/** Returns the canonical landing route for the workspace. */
export function getDefaultWorkspaceRoute() {
  return "projects";
}
