/**
 * @file-version 1.0
 * Immutable in-memory registry for domain tool definitions.
 */

import { assertToolDefinition } from "./tool-contract.js";

/**
 * Creates an isolated registry. Definitions are validated and frozen once,
 * preventing runtime mutation of the catalogue after application startup.
 *
 * @param {object[]} definitions
 * @returns {{ get: (id: string) => object | null, list: (options?: {includeHidden?: boolean}) => object[], has: (id: string) => boolean, size: number }}
 */
export function createToolRegistry(definitions = []) {
  if (!Array.isArray(definitions)) {
    throw new TypeError("Tool registry definitions must be an array.");
  }

  const entries = new Map();
  for (const definition of definitions) {
    const tool = assertToolDefinition(definition);
    if (entries.has(tool.id)) {
      throw new Error(`Duplicate tool id "${tool.id}" in registry.`);
    }
    entries.set(tool.id, tool);
  }

  return Object.freeze({
    get(id) {
      return typeof id === "string" ? entries.get(id) ?? null : null;
    },
    list({ includeHidden = false } = {}) {
      return [...entries.values()]
        .filter((tool) => includeHidden || tool.visibility === "catalog");
    },
    has(id) {
      return typeof id === "string" && entries.has(id);
    },
    get size() {
      return entries.size;
    },
  });
}

/**
 * The catalogue starts empty intentionally. A service integration folder or
 * vendor name is not automatically a user-facing product tool.
 * Register a tool only after its product identity and contract are approved.
 */
export const toolRegistry = createToolRegistry([]);
