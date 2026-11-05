// version 1.0
const PROJECT_STATUSES = new Set(["active", "paused", "completed", "archived"]);
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

export function buildProjectRecordFromIdea(idea, ownerId) {
  const normalizedOwnerId = text(ownerId);
  const name = text(idea?.name);
  if (!normalizedOwnerId) throw new Error("Не удалось определить владельца проекта.");
  if (!idea?.id) throw new Error("Невозможно создать проект без исходной идеи.");
  if (!name) throw new Error("У исходной идеи отсутствует название.");

  return {
    owner_id: normalizedOwnerId,
    source_idea_id: idea.id,
    name,
    description: text(idea.description),
    goal: text(idea.goal),
    expected_revenue: amount(idea.expected_revenue, "Желаемый доход"),
    estimated_cost: amount(idea.estimated_cost, "Примерные расходы"),
    business_model: text(idea.business_model),
    concept: text(idea.concept),
    additional_info: text(idea.additional_info),
    completion_criteria: "",
    status: "active",
    priority: PRIORITIES.has(idea.priority) ? idea.priority : "normal",
  };
}

export function buildProjectUpdate(changes, updatedAt = new Date().toISOString()) {
  const update = {};
  for (const field of TEXT_FIELDS) {
    if (Object.hasOwn(changes, field)) update[field] = text(changes[field]);
  }

  if (Object.hasOwn(changes, "status")) {
    if (!PROJECT_STATUSES.has(changes.status)) throw new Error("Недопустимый статус проекта.");
    update.status = changes.status;
  }
  if (Object.hasOwn(changes, "priority")) {
    if (!PRIORITIES.has(changes.priority)) throw new Error("Недопустимый приоритет проекта.");
    update.priority = changes.priority;
  }
  if (Object.hasOwn(changes, "is_pinned")) {
    if (typeof changes.is_pinned !== "boolean") throw new Error("Признак закрепления проекта должен быть логическим.");
    update.is_pinned = changes.is_pinned;
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
