/**
 * @file-version 1.0
 * Pure contract validation for independently registered tools.
 */

const TOOL_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const TOOL_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ROUTE_PATTERN = /^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/;
const VISIBILITIES = new Set(["catalog", "hidden"]);
const AVAILABILITIES = new Set(["available", "temporarily-unavailable", "retired"]);

function requireText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new TypeError(`Tool definition has an invalid ${field}.`);
  }
  return value.trim();
}

function normalizeStringList(value, field, pattern = TOOL_ID_PATTERN) {
  if (!Array.isArray(value)) {
    throw new TypeError(`Tool definition ${field} must be an array.`);
  }

  const normalized = value.map((item) => {
    if (typeof item !== "string" || !pattern.test(item)) {
      throw new TypeError(`Tool definition contains an invalid ${field} item.`);
    }
    return item;
  });

  if (new Set(normalized).size !== normalized.length) {
    throw new TypeError(`Tool definition contains duplicate ${field} items.`);
  }

  return Object.freeze(normalized);
}

/**
 * Validates and returns an immutable tool definition.
 *
 * @param {object} definition
 * @returns {Readonly<object>}
 */
export function assertToolDefinition(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new TypeError("Tool definition must be an object.");
  }

  const id = requireText(definition.id, "id", 64);
  if (!TOOL_ID_PATTERN.test(id)) {
    throw new TypeError("Tool definition has an invalid id.");
  }

  const name = requireText(definition.name, "name", 80);
  const description = requireText(definition.description, "description", 500);
  const category = requireText(definition.category, "category", 64);
  if (!TOOL_ID_PATTERN.test(category)) {
    throw new TypeError("Tool definition has an invalid category.");
  }

  const version = requireText(definition.version, "version", 32);
  if (!TOOL_VERSION_PATTERN.test(version)) {
    throw new TypeError("Tool definition has an invalid version.");
  }

  const visibility = definition.visibility;
  if (!VISIBILITIES.has(visibility)) {
    throw new TypeError("Tool definition has an invalid visibility.");
  }

  const availability = definition.availability;
  if (!AVAILABILITIES.has(availability)) {
    throw new TypeError("Tool definition has an invalid availability.");
  }

  const capabilities = normalizeStringList(definition.capabilities, "capabilities");
  const routes = normalizeStringList(definition.routes ?? [], "routes", ROUTE_PATTERN);
  const integrationKey = definition.integrationKey ?? null;
  if (integrationKey !== null &&
      (typeof integrationKey !== "string" || !TOOL_ID_PATTERN.test(integrationKey))) {
    throw new TypeError("Tool definition has an invalid integrationKey.");
  }

  return Object.freeze({
    id,
    name,
    description,
    category,
    version,
    visibility,
    availability,
    capabilities,
    routes,
    integrationKey,
  });
}
