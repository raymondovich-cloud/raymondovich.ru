// version 1.0
const IDEA_STATUSES = new Set(["new", "review", "launched", "archived"]);
const PRIORITIES = new Set(["low", "normal", "high", "critical"]);
const TEXT_FIELDS = ["name", "description", "goal", "business_model", "concept", "additional_info"];

function text(value) {
  return String(value ?? "").trim();
}

function amount(value, label) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label}: укажи неотрицательное число.`);
  }
  return normalized;
}

export function buildIdeaRecord(input) {
  const ownerId = text(input.ownerId);
  const name = text(input.title);
  if (!ownerId) throw new Error("Не удалось определить владельца идеи.");
  if (!name) throw new Error("Добавь короткое название идеи.");

  return {
    owner_id: ownerId,
    name,
    description: text(input.description),
    goal: text(input.goal),
    expected_revenue: amount(input.expectedRevenue, "Желаемый доход"),
    estimated_cost: amount(input.estimatedCost, "Примерные расходы"),
    business_model: text(input.businessModel),
    concept: text(input.concept),
    additional_info: text(input.additionalInfo),
  };
}

export function buildIdeaUpdate(changes, updatedAt = new Date().toISOString()) {
  const update = {};
  for (const field of TEXT_FIELDS) {
    if (Object.hasOwn(changes, field)) {
      update[field] = text(changes[field]);
    }
  }

  if (Object.hasOwn(changes, "status")) {
    if (!IDEA_STATUSES.has(changes.status)) throw new Error("Недопустимый статус идеи.");
    update.status = changes.status;
  }
  if (Object.hasOwn(changes, "priority")) {
    if (!PRIORITIES.has(changes.priority)) throw new Error("Недопустимый приоритет идеи.");
    update.priority = changes.priority;
  }
  if (Object.hasOwn(changes, "expected_revenue")) {
    update.expected_revenue = amount(changes.expected_revenue, "Желаемый доход");
  }
  if (Object.hasOwn(changes, "estimated_cost")) {
    update.estimated_cost = amount(changes.estimated_cost, "Примерные расходы");
  }

  update.updated_at = updatedAt;
  return update;
}
