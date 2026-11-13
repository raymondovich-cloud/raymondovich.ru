/**
 * Workspace section contract.
 * Domain modules expose only stable route identity; UI labels and rendering
 * remain in Presentation, while behavior belongs to Application use cases.
 *
 * @typedef {Object} WorkspaceSectionDefinition
 * @property {string} id Stable domain identifier.
 * @property {string} baseRoute Canonical route for the section.
 * @property {string[]} routes Routes owned by this domain module.
 */

export function assertWorkspaceSection(definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError("Workspace section definition must be an object.");
  }

  const { id, baseRoute, routes } = definition;
  if (typeof id !== "string" || !/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new TypeError("Workspace section id is invalid.");
  }
  if (typeof baseRoute !== "string" || !/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(baseRoute)) {
    throw new TypeError(`Workspace section "${id}" has an invalid baseRoute.`);
  }
  if (!Array.isArray(routes) || routes.length === 0 || !routes.includes(baseRoute)) {
    throw new TypeError(`Workspace section "${id}" must declare its baseRoute.`);
  }
  if (routes.some((route) => typeof route !== "string"
    || !/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(route))) {
    throw new TypeError(`Workspace section "${id}" contains an invalid route.`);
  }
  if (new Set(routes).size !== routes.length) {
    throw new TypeError(`Workspace section "${id}" contains duplicate routes.`);
  }

  return Object.freeze({
    id,
    baseRoute,
    routes: Object.freeze([...routes]),
  });
}
