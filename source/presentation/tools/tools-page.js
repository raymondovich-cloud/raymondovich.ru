// version 1.1
import { getSession, getRole } from "../../application/auth/authentication.js";
import {
  loadToolsInventory, saveTool, deleteTool, saveResource, deleteResource,
  saveToolRelation, deleteToolRelation, saveResourceRelation, deleteResourceRelation,
} from "../../application/tools/tools-service.js";

const $ = (selector) => document.querySelector(selector);
const message = $("#page-message");
const toolList = $("#tool-list");
const detail = $("#tool-detail");
const toolForm = $("#tool-form");
const resourceForm = $("#resource-form");
const toolRelationForm = $("#tool-relation-form");
const resourceRelationForm = $("#resource-relation-form");
let inventory = { tools: [], resources: [], projects: [], toolRelations: [], resourceRelations: [] };
let selectedToolId = null;

const categoryLabels = {
  ai: "AI", development: "Разработка", domains_dns: "Домены и DNS", database: "Базы данных",
  hosting: "Хостинг и серверы", analytics: "Аналитика", payments: "Платежи",
  communication: "Коммуникации", other: "Другое",
};
const statusLabels = {
  active: "Активен", testing: "Тестируется", paused: "Приостановлен", retired: "Выведен из использования",
  needs_verification: "Требует проверки", unknown: "Неизвестен", planned: "Запланирован",
};
const relationLabels = {
  manual_use: "Ручное использование", technical_integration: "Техническая интеграция",
  infrastructure_dependency: "Инфраструктурная зависимость", other: "Другое",
};
const resourceTypeLabels = {
  repository: "Репозиторий", domain: "Домен", database: "База данных", server: "Сервер",
  api: "API", deployment: "Развёртывание", dns_zone: "DNS-зона", supabase_project: "Проект Supabase", other: "Другое",
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}
function button(text, className, onClick) {
  const element = node("button", "button " + (className || ""), text);
  element.type = "button";
  element.addEventListener("click", onClick);
  return element;
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function linkOrText(parent, value, label) {
  const url = safeUrl(value);
  if (!url) {
    parent.append(node("p", "", label || "Ссылка не указана"));
    return;
  }
  const link = node("a", "resource-link", label || url);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  parent.append(link);
}
function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}
function getTool(id) { return inventory.tools.find((tool) => tool.id === id); }
function getResource(id) { return inventory.resources.find((resource) => resource.id === id); }
function getProject(id) { return inventory.projects.find((project) => project.id === id); }
function formatDate(value) {
  if (!value) return "Не проверено";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function pill(status) { return node("span", "status-pill", statusLabels[status] || status || "Не указан"); }
function meta(label, value) {
  const item = node("div", "meta-item");
  item.append(node("span", "", label), node("strong", "", value || "—"));
  return item;
}

function populateSelect(select, items, labelOf, placeholder) {
  const oldValue = select.value;
  select.replaceChildren();
  if (placeholder) {
    const option = node("option", "", placeholder);
    option.value = "";
    select.append(option);
  }
  for (const item of items) {
    const option = node("option", "", labelOf(item));
    option.value = item.id;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === oldValue)) select.value = oldValue;
}
function updateSelects() {
  const projectLabel = (p) => p.name + (p.status === "active" ? "" : " · " + (statusLabels[p.status] || p.status));
  populateSelect(toolRelationForm.elements.project_id, inventory.projects, projectLabel, "Выберите проект");
  populateSelect(resourceRelationForm.elements.project_id, inventory.projects, projectLabel, "Выберите проект");
  populateSelect(toolRelationForm.elements.tool_id, inventory.tools, (t) => t.name, "Выберите сервис");
  populateSelect(resourceForm.elements.tool_id, inventory.tools, (t) => t.name, "Выберите сервис");
  populateSelect(resourceRelationForm.elements.resource_id, inventory.resources, (r) => {
    const owner = getTool(r.tool_id);
    return (owner ? owner.name + " / " : "") + r.name;
  }, "Выберите ресурс");
  if (selectedToolId) {
    toolRelationForm.elements.tool_id.value = selectedToolId;
    resourceForm.elements.tool_id.value = selectedToolId;
  }
}

function renderStats() {
  $("#stat-tools").textContent = inventory.tools.length;
  $("#stat-resources").textContent = inventory.resources.length;
  const unverified = inventory.tools.filter((x) => x.status === "needs_verification").length
    + inventory.resources.filter((x) => ["needs_verification", "unknown"].includes(x.status)).length
    + inventory.toolRelations.filter((x) => x.status === "needs_verification").length
    + inventory.resourceRelations.filter((x) => x.status === "needs_verification").length;
  $("#stat-review").textContent = unverified;
}

function renderToolList() {
  const query = $("#search-tools").value.trim().toLowerCase();
  const category = $("#filter-category").value;
  const tools = inventory.tools.filter((tool) => {
    const resources = inventory.resources.filter((r) => r.tool_id === tool.id);
    const text = [tool.name, tool.slug, tool.description, categoryLabels[tool.category], ...resources.map((r) => r.name)].join(" ").toLowerCase();
    return (!query || text.includes(query)) && (!category || tool.category === category);
  });
  toolList.replaceChildren();
  if (!tools.length) {
    toolList.append(node("p", "muted", inventory.tools.length ? "По заданным фильтрам ничего не найдено." : "Сервисов пока нет. Добавьте первый сервис."));
    return;
  }
  for (const tool of tools) {
    const resourcesCount = inventory.resources.filter((r) => r.tool_id === tool.id).length;
    const item = node("button", "tool-item");
    item.type = "button";
    item.setAttribute("aria-current", tool.id === selectedToolId ? "true" : "false");
    const info = node("span");
    info.append(node("strong", "", tool.name), node("small", "", categoryLabels[tool.category] || tool.category));
    item.append(info, node("span", "tool-count", String(resourcesCount)));
    item.addEventListener("click", () => {
      selectedToolId = tool.id;
      renderToolList();
      renderDetail();
      updateSelects();
    });
    toolList.append(item);
  }
}

function renderResourceRow(resource) {
  const row = node("div", "resource-row");
  const info = node("div");
  info.append(node("strong", "", resource.name), node("p", "", (resourceTypeLabels[resource.resource_type] || resource.resource_type) + " · " + (statusLabels[resource.status] || resource.status)));
  if (resource.description) info.append(node("p", "", resource.description));
  linkOrText(info, resource.resource_url, resource.resource_url ? "Открыть ресурс ↗" : "Ссылка не указана");
  info.append(node("p", "", "Последняя проверка: " + formatDate(resource.last_verified_at)));
  const actions = node("div", "row-actions");
  actions.append(button("Изменить", "quiet", () => editResource(resource)), button("Удалить", "danger", () => removeResource(resource)));
  row.append(info, actions);
  return row;
}

function renderToolConnection(relation) {
  const project = getProject(relation.project_id);
  const row = node("div", "connection-row");
  const info = node("div");
  info.append(node("strong", "", project?.name || "Неизвестный проект"), node("p", "", (relationLabels[relation.relationship_type] || relation.relationship_type) + " · " + (statusLabels[relation.status] || relation.status)));
  if (relation.purpose) info.append(node("p", "", relation.purpose));
  if (relation.evidence_note) info.append(node("p", "", "Основание: " + relation.evidence_note));
  info.append(node("p", "", "Проверено: " + formatDate(relation.last_verified_at)));
  const actions = node("div", "row-actions");
  actions.append(button("Удалить связь", "danger", () => removeToolRelation(relation)));
  row.append(info, actions);
  return row;
}

function renderDetail() {
  const tool = getTool(selectedToolId);
  detail.replaceChildren();
  if (!tool) {
    const empty = node("div", "detail-empty");
    empty.append(node("p", "tools-kicker", "SYSTEM OVERVIEW"), node("h2", "", "Карта взаимодействий"), node("p", "", "Выберите сервис слева, чтобы увидеть его ресурсы, проекты и подтверждённость связей."));
    detail.append(empty);
    return;
  }
  const resources = inventory.resources.filter((r) => r.tool_id === tool.id);
  const relations = inventory.toolRelations.filter((r) => r.tool_id === tool.id);
  const top = node("div", "detail-top");
  const heading = node("div");
  heading.append(node("p", "tools-kicker", categoryLabels[tool.category] || tool.category), node("h2", "", tool.name));
  if (tool.description) heading.append(node("p", "", tool.description));
  top.append(heading);
  const actions = node("div", "detail-actions");
  actions.append(button("Редактировать", "quiet", () => editTool(tool)), button("Добавить ресурс", "quiet", () => openResourceForm(tool.id)), button("Удалить сервис", "danger", () => removeTool(tool)));
  top.append(actions);
  detail.append(top);
  const metaGrid = node("div", "detail-meta");
  metaGrid.append(meta("Статус", statusLabels[tool.status] || tool.status), meta("Последняя проверка", formatDate(tool.last_verified_at)));
  const urlMeta = node("div", "meta-item");
  urlMeta.append(node("span", "", "Официальный сайт"));
  const url = safeUrl(tool.official_url);
  if (url) {
    const anchor = node("a", "resource-link", url);
    anchor.href = url; anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
    urlMeta.append(anchor);
  } else urlMeta.append(node("strong", "", "Не указан"));
  metaGrid.append(urlMeta, meta("Ресурсов", resources.length));
  detail.append(metaGrid);

  const resourceSection = node("section", "detail-section");
  resourceSection.append(node("h3", "", "Ресурсы"));
  const resourceList = node("div", "resource-list");
  if (!resources.length) resourceList.append(node("p", "muted", "Ресурсы ещё не добавлены."));
  resources.forEach((resource) => resourceList.append(renderResourceRow(resource)));
  resourceSection.append(resourceList);
  detail.append(resourceSection);

  const relationSection = node("section", "detail-section");
  relationSection.append(node("h3", "", "Связи с проектами"));
  const connectionList = node("div", "connection-list");
  if (!relations.length) connectionList.append(node("p", "muted", "Связи с проектами ещё не зафиксированы."));
  relations.forEach((relation) => connectionList.append(renderToolConnection(relation)));
  detail.append(relationSection, connectionList);

  const resourceRelations = inventory.resourceRelations.filter((relation) => resources.some((r) => r.id === relation.resource_id));
  if (resourceRelations.length) {
    const section = node("section", "detail-section");
    section.append(node("h3", "", "Связи конкретных ресурсов"));
    const list = node("div", "connection-list");
    resourceRelations.forEach((relation) => {
      const resource = getResource(relation.resource_id);
      const project = getProject(relation.project_id);
      const row = node("div", "connection-row");
      const info = node("div");
      info.append(node("strong", "", (project?.name || "Неизвестный проект") + " — " + (resource?.name || "ресурс")));
      info.append(node("p", "", relation.role + " · " + (statusLabels[relation.status] || relation.status)));
      if (relation.evidence_note) info.append(node("p", "", relation.evidence_note));
      const rowActions = node("div", "row-actions");
      rowActions.append(button("Удалить связь", "danger", () => removeResourceRelation(relation)));
      row.append(info, rowActions);
      list.append(row);
    });
    section.append(list);
    detail.append(section);
  }
}

function renderAllRelations() {
  const root = $("#all-relations");
  root.replaceChildren();
  const combined = [
    ...inventory.toolRelations.map((r) => ({ kind: "tool", relation: r })),
    ...inventory.resourceRelations.map((r) => ({ kind: "resource", relation: r })),
  ];
  if (!combined.length) {
    root.append(node("p", "muted", "Связи пока не добавлены."));
    return;
  }
  for (const item of combined) {
    const relation = item.relation;
    const project = getProject(relation.project_id);
    const resource = item.kind === "resource" ? getResource(relation.resource_id) : null;
    const tool = item.kind === "tool" ? getTool(relation.tool_id) : getTool(resource?.tool_id);
    const row = node("div", "connection-row");
    const info = node("div");
    info.append(node("strong", "", (project?.name || "Проект не найден") + " ↔ " + (resource?.name || tool?.name || "Объект не найден")));
    info.append(node("p", "", (item.kind === "tool" ? relationLabels[relation.relationship_type] : "Ресурс: " + relation.role) + " · " + (statusLabels[relation.status] || relation.status)));
    row.append(info);
    root.append(row);
  }
}

function render() {
  renderStats();
  renderToolList();
  renderDetail();
  renderAllRelations();
  updateSelects();
}

async function reload({ keepSelection = true } = {}) {
  const previous = selectedToolId;
  inventory = await loadToolsInventory();
  if (!keepSelection || !inventory.tools.some((tool) => tool.id === previous)) selectedToolId = inventory.tools[0]?.id || null;
  else selectedToolId = previous;
  render();
}

function resetForm(formId) {
  const form = document.getElementById(formId);
  form.reset();
  form.elements.id.value = "";
  if (formId === "tool-form") {
    $("#tool-form-summary").textContent = "Добавить сервис";
  } else if (formId === "resource-form") {
    $("#resource-form-summary").textContent = "Добавить ресурс";
    if (selectedToolId) form.elements.tool_id.value = selectedToolId;
  }
}
function openResourceForm(toolId) {
  resetForm("resource-form");
  if (toolId) resourceForm.elements.tool_id.value = toolId;
  $("#resource-editor").open = true;
  $("#resource-form-summary").textContent = "Добавить ресурс";
  $("#resource-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function editTool(tool) {
  toolForm.elements.id.value = tool.id;
  for (const key of ["name", "slug", "category", "official_url", "status", "description"]) toolForm.elements[key].value = tool[key] ?? "";
  $("#tool-form-summary").textContent = "Редактировать сервис";
  toolForm.closest("details").open = true;
  toolForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function editResource(resource) {
  resourceForm.elements.id.value = resource.id;
  for (const key of ["tool_id", "name", "resource_type", "resource_url", "external_id", "environment", "status", "description"]) resourceForm.elements[key].value = resource[key] ?? "";
  $("#resource-form-summary").textContent = "Редактировать ресурс";
  $("#resource-editor").open = true;
  resourceForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
async function withAction(action, successMessage) {
  try {
    setMessage("Сохраняю изменения…");
    await action();
    await reload();
    setMessage(successMessage, "success");
  } catch (error) {
    setMessage(error.message || "Операция не выполнена.", "error");
  }
}
async function removeTool(tool) {
  if (!window.confirm("Удалить сервис «" + tool.name + "»? Его ресурсы и связи также будут удалены.")) return;
  await withAction(async () => {
    await deleteTool(tool.id);
    if (selectedToolId === tool.id) selectedToolId = null;
  }, "Сервис удалён.");
}
async function removeResource(resource) {
  if (!window.confirm("Удалить ресурс «" + resource.name + "» и его связи с проектами?")) return;
  await withAction(() => deleteResource(resource.id), "Ресурс удалён.");
}
async function removeToolRelation(relation) {
  if (!window.confirm("Удалить связь проекта с сервисом?")) return;
  await withAction(() => deleteToolRelation(relation.id), "Связь удалена.");
}
async function removeResourceRelation(relation) {
  if (!window.confirm("Удалить связь проекта с ресурсом?")) return;
  await withAction(() => deleteResourceRelation(relation.id), "Связь удалена.");
}

toolForm.addEventListener("input", (event) => {
  if (event.target.name === "name" && !toolForm.elements.id.value) {
    const slug = toolForm.elements.slug;
    if (!slug.dataset.edited) slug.value = event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
});
toolForm.elements.slug.addEventListener("input", () => { toolForm.elements.slug.dataset.edited = "true"; });
toolForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(toolForm).entries());
  const id = input.id || null;
  delete input.id;
  withAction(async () => {
    await saveTool(input, id);
    resetForm("tool-form");
  }, id ? "Сервис обновлён." : "Сервис добавлен.");
});
resourceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(resourceForm).entries());
  const id = input.id || null;
  delete input.id;
  withAction(async () => {
    await saveResource(input, id);
    resetForm("resource-form");
  }, id ? "Ресурс обновлён." : "Ресурс добавлен.");
});
toolRelationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(toolRelationForm).entries());
  withAction(async () => {
    await saveToolRelation(input);
    toolRelationForm.reset();
    updateSelects();
  }, "Связь проекта с сервисом сохранена.");
});
resourceRelationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(resourceRelationForm).entries());
  withAction(async () => {
    await saveResourceRelation(input);
    resourceRelationForm.reset();
    updateSelects();
  }, "Связь проекта с ресурсом сохранена.");
});
document.querySelectorAll("[data-reset]").forEach((buttonEl) => buttonEl.addEventListener("click", () => resetForm(buttonEl.dataset.reset)));
$("#search-tools").addEventListener("input", renderToolList);
$("#filter-category").addEventListener("change", renderToolList);
$("#refresh-button").addEventListener("click", () => withAction(() => reload(), "Реестр обновлён."));

async function init() {
  try {
    const session = await getSession();
    if (!session) {
      window.location.replace("./auth.html");
      return;
    }
    if (getRole(session) !== "admin") {
      document.body.replaceChildren();
      const denial = node("main", "tools-shell");
      denial.append(node("h1", "", "Доступ запрещён"), node("p", "", "Административный раздел доступен только владельцу."));
      document.body.append(denial);
      return;
    }
    await reload({ keepSelection: false });
    setMessage("Реестр загружен. Связи со статусом «Требует проверки» не считаются подтверждёнными.");
  } catch (error) {
    setMessage(error.message || "Не удалось загрузить реестр.", "error");
    detail.replaceChildren(node("p", "muted", "Не удалось загрузить данные. Проверьте подключение и права доступа."));
  }
}
init();
