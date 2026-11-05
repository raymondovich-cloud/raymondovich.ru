// version 4.13
import { getSession, getRole, logout } from "../runtime/auth.js";
import { createIdea, deleteIdea, listIdeas, updateIdea, createProjectFromIdea, deleteProject, listProjects, updateProject } from "../runtime/services.js";

const content = document.querySelector("#workspace-content");
const status = document.querySelector("#control-status");
const logoutButton = document.querySelector("#logout-button");
const accountTrigger = document.querySelector("#account-trigger");
const accountPanel = document.querySelector("#account-panel");
const accountName = document.querySelector("#account-name");
const accountRole = document.querySelector("#account-role");
const accountEmail = document.querySelector("#account-email");
const accountAvatar = document.querySelector("#account-panel-avatar");
const menuToggle = document.querySelector("#menu-toggle");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const dialog = document.querySelector("#idea-dialog");
const ideaForm = document.querySelector("#idea-form");
const saveIdeaButton = document.querySelector("#save-idea");
const titleInput = document.querySelector("#idea-title");
const descriptionInput = document.querySelector("#idea-description");
const goalInput = document.querySelector("#idea-goal");
const expectedRevenueInput = document.querySelector("#idea-expected-revenue");
const estimatedCostInput = document.querySelector("#idea-estimated-cost");
const businessModelInput = document.querySelector("#idea-business-model");
const conceptInput = document.querySelector("#idea-concept");
const additionalInfoInput = document.querySelector("#idea-additional-info");
const additionalParameters = document.querySelector("#idea-additional-parameters");
const ideasCount = document.querySelector("#ideas-count");
const projectsCount = document.querySelector("#projects-count");
const ideaDetailDialog = document.createElement("dialog");
ideaDetailDialog.className = "idea-detail-dialog";
ideaDetailDialog.setAttribute("aria-label", "Подробности идеи");
document.body.append(ideaDetailDialog);
const projectActionDialog = document.createElement("dialog");
projectActionDialog.className = "project-action-dialog";
projectActionDialog.setAttribute("aria-label", "Действия с проектом");
document.body.append(projectActionDialog);

const state = { user: null, ideas: [], projects: [], view: "overview", ideaFilter: "open", projectFilter: "active", busy: false };

function showStatus(message, isError = false) {
  status.textContent = message || "";
  status.dataset.state = isError ? "error" : "success";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function priorityLabel(priority) {
  return ({ critical: "Критический", high: "Высокий приоритет", normal: "Обычный приоритет", low: "Низкий приоритет" })[priority] || "Обычный приоритет";
}
function ideaStatusLabel(value) {
  return ({ new: "Новая идея", review: "На рассмотрении", launched: "Передана в проект", archived: "Архив" })[value] || value;
}
function projectStatusLabel(value) {
  return ({ active: "В работе", paused: "На паузе", completed: "Завершён", archived: "Архив" })[value] || value;
}
function openIdeas() { return state.ideas.filter((idea) => ["new", "review"].includes(idea.status)); }
function launchedIdeas() { return state.ideas.filter((idea) => idea.status === "launched"); }
function archivedIdeas() { return state.ideas.filter((idea) => idea.status === "archived"); }
function activeProjects() { return state.projects.filter((project) => ["active", "paused", "completed"].includes(project.status)); }
function archivedProjects() { return state.projects.filter((project) => project.status === "archived"); }

function prioritySort(a, b) {
  const rank = (value) => ({ critical: 3, high: 2, normal: 1, low: 0 })[value] ?? 1;
  return rank(b.priority) - rank(a.priority) || new Date(b.updated_at) - new Date(a.updated_at);
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(amount);
}

function planningDetails(item, label = "Планирование") {
  const fields = [
    ["Цель проекта", item.goal],
    ["Желаемый доход", item.expected_revenue === null || item.expected_revenue === undefined ? "" : formatMoney(item.expected_revenue)],
    ["Примерные расходы", item.estimated_cost === null || item.estimated_cost === undefined ? "" : formatMoney(item.estimated_cost)],
    ["Модель заработка", item.business_model],
    ["Концепция", item.concept],
    ["Дополнительная информация", item.additional_info],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");
  if (!fields.length) return "";
  return `<details class="planning-details">
    <summary>${label}<span>${fields.length} ${fields.length === 1 ? "параметр" : "параметров"}</span></summary>
    <div class="planning-details-grid">${fields.map(([title, value]) => `<div class="planning-detail"><span>${escapeHtml(title)}</span><p>${escapeHtml(value)}</p></div>`).join("")}</div>
  </details>`;
}

function ideaCard(idea) {
  const priority = idea.priority || "normal";
  const actions = idea.status === "launched"
    ? '<span class="badge badge-status">Проект создан</span>'
    : idea.status === "archived"
      ? `<button class="action-button" type="button" data-entity="idea" data-action="restore" data-id="${idea.id}">Вернуть к идеям</button>
         <button class="action-button is-danger" type="button" data-entity="idea" data-action="delete" data-id="${idea.id}">Удалить</button>`
      : `<button class="action-button is-primary" type="button" data-entity="idea" data-action="launch" data-id="${idea.id}">Запустить проект</button>
         <button class="action-button" type="button" data-entity="idea" data-action="review" data-id="${idea.id}">${idea.status === "review" ? "Снять с рассмотрения" : "На рассмотрение"}</button>
         <button class="action-button" type="button" data-entity="idea" data-action="priority" data-id="${idea.id}">${priority === "high" || priority === "critical" ? "Снять приоритет" : "В приоритет"}</button>
         <button class="action-button" type="button" data-entity="idea" data-action="archive" data-id="${idea.id}">В архив</button>
         <button class="action-button is-danger" type="button" data-entity="idea" data-action="delete" data-id="${idea.id}">Удалить</button>`;
  return `<article class="idea-card"><div class="card-topline"><div><h3 class="card-title">${escapeHtml(idea.name)}</h3>${idea.description ? `<p class="card-description">${escapeHtml(idea.description)}</p>` : ""}</div></div>
    ${planningDetails(idea, "План идеи")}
    <div class="card-meta"><span class="badge badge-status">${ideaStatusLabel(idea.status)}</span><span class="badge ${priority === "high" || priority === "critical" ? "badge-priority" : ""}">${priorityLabel(priority)}</span>${idea.launched_at ? `<span class="card-date">Запущена: ${dateLabel(idea.launched_at)}</span>` : ""}</div>
    <div class="card-actions">${actions}</div></article>`;
}

function projectCard(project) {
  const priority = project.priority || "normal";
  const archived = project.status === "archived";
  const actions = archived
    ? `<button class="action-button is-primary" type="button" data-entity="project" data-action="restore" data-id="${project.id}">Восстановить проект</button>
       <button class="action-button is-danger" type="button" data-entity="project" data-action="delete" data-id="${project.id}">Удалить навсегда</button>`
    : `<button class="action-button" type="button" data-entity="project" data-action="pause" data-id="${project.id}">${project.status === "paused" ? "Возобновить" : "Пауза"}</button>
       <button class="action-button" type="button" data-entity="project" data-action="priority" data-id="${project.id}">${priority === "high" || priority === "critical" ? "Снять приоритет" : "В приоритет"}</button>
       <button class="action-button" type="button" data-entity="project" data-action="complete" data-id="${project.id}">Завершить</button>
       <button class="action-button" type="button" data-entity="project" data-action="archive" data-id="${project.id}">В архив</button>
       <button class="action-button is-danger" type="button" data-entity="project" data-action="delete" data-id="${project.id}">Удалить</button>`;
  const source = project.source_idea_id ? '<span class="badge">Создан из идеи</span>' : "";
  return `<article class="project-card"><div class="card-topline"><div><h3 class="card-title">${escapeHtml(project.name)}</h3>${project.description ? `<p class="card-description">${escapeHtml(project.description)}</p>` : ""}</div></div>
    ${planningDetails(project, "План проекта")}
    <div class="card-meta"><span class="badge badge-status">${projectStatusLabel(project.status)}</span><span class="badge ${priority === "high" || priority === "critical" ? "badge-priority" : ""}">${priorityLabel(priority)}</span>${source}${project.target_due_date ? `<span class="card-date">Срок: ${dateLabel(project.target_due_date)}</span>` : ""}</div>
    <div class="card-actions">${actions}</div></article>`;
}

function emptyState(title, message, addIdea = false) {
  return `<div class="empty-state"><div><div class="empty-symbol">✳</div><strong>${title}</strong><p>${message}</p>${addIdea ? '<button class="button button-primary empty-add" type="button">＋ Добавить идею</button>' : ""}</div></div>`;
}

function renderOverview() {
  const ideas = openIdeas();
  const projects = activeProjects();
  const runningProjects = projects.filter((project) => project.status === "active");
  const pausedProjects = projects.filter((project) => project.status === "paused");
  const priorityIdeas = ideas.filter((idea) => ["high", "critical"].includes(idea.priority));
  const recentIdeas = [...state.ideas]
    .filter((idea) => idea.status !== "archived" && idea.status !== "launched")
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 4);
  const recentProjects = [...runningProjects, ...pausedProjects]
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5);
  const focusIdeas = [...priorityIdeas].sort(prioritySort).slice(0, 3);

  const ideaRows = (items) => items.map((idea) => `
    <article class="overview-row overview-idea-row">
      <div class="overview-row-main">
        <span class="overview-row-marker idea-marker" aria-hidden="true"></span>
        <div class="overview-row-copy">
          <strong>${escapeHtml(idea.name)}</strong>
          <span>${ideaStatusLabel(idea.status)} · ${priorityLabel(idea.priority || "normal")}</span>
        </div>
      </div>
      <div class="overview-row-actions">
        <button class="overview-inline-action" type="button" data-entity="idea" data-action="launch" data-id="${idea.id}">Запустить проект</button>
        <button class="overview-chevron" type="button" data-go="ideas" aria-label="Открыть идеи">↗</button>
      </div>
    </article>`).join("");

  const projectRows = (items) => items.map((project) => `
    <article class="overview-row">
      <div class="overview-row-main">
        <span class="overview-row-marker project-marker" aria-hidden="true"></span>
        <div class="overview-row-copy">
          <strong>${escapeHtml(project.name)}</strong>
          <span>${projectStatusLabel(project.status)} · ${priorityLabel(project.priority || "normal")}</span>
        </div>
      </div>
      <div class="overview-row-actions">
        <button class="overview-inline-action" type="button" data-entity="project" data-action="pause" data-id="${project.id}">${project.status === "paused" ? "Возобновить" : "Пауза"}</button>
        <button class="overview-chevron" type="button" data-go="projects" aria-label="Открыть проекты">↗</button>
      </div>
    </article>`).join("");

  const recentIdeaRows = recentIdeas.map((idea) => `
    <article class="overview-recent-row">
      <div><strong>${escapeHtml(idea.name)}</strong><span>${ideaStatusLabel(idea.status)}</span></div>
      <time>${dateLabel(idea.updated_at || idea.created_at)}</time>
    </article>`).join("");

  content.innerHTML = `
    <header class="overview-intro">
      <div>
        <p class="eyebrow">RAYMONDOVICH / CONTROL CENTER</p>
        <h1>Центр управления</h1>
        <p>Общая картина твоих направлений и текущих задач.</p>
      </div>
      <div class="overview-live"><span class="status-dot"></span>РАБОЧЕЕ ПРОСТРАНСТВО</div>
    </header>

    <section class="overview-summary" aria-label="Сводка рабочего пространства">
      <div class="summary-item"><span>Идеи</span><strong>${ideas.length}</strong><small>ожидают решения</small></div>
      <div class="summary-item"><span>Проекты</span><strong>${runningProjects.length}</strong><small>активно в работе</small></div>
      <div class="summary-item"><span>На паузе</span><strong>${pausedProjects.length}</strong><small>приостановлено</small></div>
      <div class="summary-item"><span>Приоритет</span><strong>${priorityIdeas.length + projects.filter((project) => ["high", "critical"].includes(project.priority)).length}</strong><small>направлений</small></div>
    </section>

    <section class="overview-focus">
      <div class="overview-section-heading">
        <div><p class="eyebrow">ATTENTION REQUIRED</p><h2>Требуют внимания</h2></div>
        <button class="text-action" type="button" data-go="ideas">Все идеи <span aria-hidden="true">↗</span></button>
      </div>
      <div class="overview-list">
        ${focusIdeas.length ? ideaRows(focusIdeas) : '<div class="overview-quiet-state">Нет приоритетных идей. Новые направления появятся здесь, когда ты отметишь их как приоритетные.</div>'}
      </div>
    </section>

    <section class="overview-work">
      <div class="overview-section-heading">
        <div><p class="eyebrow">EXECUTION / IN PROGRESS</p><h2>Проекты в работе</h2></div>
        <button class="text-action" type="button" data-go="projects">Все проекты <span aria-hidden="true">↗</span></button>
      </div>
      <div class="overview-list">
        ${recentProjects.length ? projectRows(recentProjects) : '<div class="overview-quiet-state">Пока нет запущенных проектов. Когда идея будет готова к реализации, запусти её в разделе «Идеи».</div>'}
      </div>
    </section>

    <section class="overview-recent">
      <div class="overview-section-heading">
        <div><p class="eyebrow">CAPTURE / LATEST UPDATES</p><h2>Недавние идеи</h2></div>
        <button class="text-action" type="button" data-go="ideas">Открыть идеи <span aria-hidden="true">↗</span></button>
      </div>
      <div class="overview-recent-list">
        ${recentIdeaRows || '<div class="overview-quiet-state">Здесь будут отображаться последние зафиксированные идеи.</div>'}
      </div>
    </section>`;
}

function renderIdeas() {
  const archived = state.ideaFilter === "archived";
  const items = archived ? archivedIdeas() : openIdeas();
  const launched = archived ? [] : launchedIdeas();
  const reviewCount = openIdeas().filter((idea) => idea.status === "review").length;
  const priorityCount = openIdeas().filter((idea) => ["high", "critical"].includes(idea.priority)).length;
  const latest = [...state.ideas]
    .filter((idea) => idea.status !== "archived")
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];

  const ideaRows = (list) => list.map((idea) => {
    const priority = idea.priority || "normal";
    return `<article class="overview-row idea-workspace-row idea-card-interactive" data-idea-card="${idea.id}" tabindex="0" role="button" aria-label="Открыть идею: ${escapeHtml(idea.name)}">
      <div class="overview-row-main">
        <span class="overview-row-marker idea-marker" aria-hidden="true"></span>
        <div class="overview-row-copy">
          <strong>${escapeHtml(idea.name)}</strong>
          <span>${ideaStatusLabel(idea.status)} · ${priorityLabel(priority)}${idea.updated_at || idea.created_at ? ` · ${dateLabel(idea.updated_at || idea.created_at)}` : ""}</span>
          ${idea.description ? `<p class="idea-row-description">${escapeHtml(idea.description)}</p>` : ""}
        </div>
      </div>
      <span class="idea-card-open-indicator" aria-hidden="true">↗</span>
    </article>`;
  }).join("");

  content.innerHTML = `
    <header class="overview-intro ideas-intro">
      <div>
        <p class="eyebrow">RAYMONDOVICH / IDEA SPACE</p>
        <h1>Идеи</h1>
        <p>Пространство для фиксации мыслей и направлений до их превращения в проекты.</p>
      </div>
    </header>

    <section class="overview-summary ideas-summary" aria-label="Сводка идей">
      <div class="summary-item"><span>Входящие</span><strong>${openIdeas().length}</strong><small>ожидают решения</small></div>
      <div class="summary-item"><span>На рассмотрении</span><strong>${reviewCount}</strong><small>требуют оценки</small></div>
      <div class="summary-item"><span>Приоритет</span><strong>${priorityCount}</strong><small>важные направления</small></div>
      <div class="summary-item"><span>Запущено</span><strong>${launchedIdeas().length}</strong><small>перешли в проекты</small></div>
    </section>

    <section class="overview-focus ideas-section">
      <div class="overview-section-heading">
        <div><p class="eyebrow">CAPTURE / ORGANIZE</p><h2>${archived ? "Архив идей" : "Рабочий список"}</h2></div>
        <div class="ideas-heading-tools">
          <span class="ideas-total">${items.length} ${items.length === 1 ? "запись" : "записей"}</span>
          <button class="text-action ideas-archive-link" type="button" data-idea-filter="${archived ? "open" : "archived"}">${archived ? "К входящим" : `Архив · ${archivedIdeas().length}`} <span aria-hidden="true">↗</span></button>
          <button class="ideas-add-icon" type="button" data-open-idea aria-label="Добавить новую идею" title="Новая идея">＋</button>
        </div>
      </div>
      <div class="overview-list ideas-list">
        ${items.length ? [...items].sort(prioritySort).map((idea) => ideaRows([idea])).join("") : `<div class="overview-quiet-state">${archived ? "Архив пока пуст. Сюда попадают идеи, которые ты отправляешь в архив." : "Пока нет зафиксированных идей. Добавь первую мысль — она появится в этом списке."}</div>`}
      </div>
    </section>

    ${launched.length ? `<section class="overview-recent ideas-section">
      <div class="overview-section-heading">
        <div><p class="eyebrow">EXECUTION / CONVERTED</p><h2>Переданы в проекты</h2></div>
        <span class="ideas-total">${launched.length} ${launched.length === 1 ? "идея" : "идей"}</span>
      </div>
      <div class="overview-list ideas-list">${ideaRows([...launched].sort(prioritySort))}</div>
    </section>` : ""}
    <p class="ideas-latest-note">${latest ? `Последнее обновление: ${dateLabel(latest.updated_at || latest.created_at)}` : "Новые идеи будут собираться здесь."}</p>`;
}

function renderProjects() {
  const archived = state.projectFilter === "archived";
  const items = archived ? archivedProjects() : activeProjects();
  content.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">EXECUTION / PROJECTS</p><h1>Проекты</h1><p>Здесь находятся только идеи, которые ты явно запустил в реализацию.</p></div></div>
    <section class="section-card"><div class="section-heading"><h2>${archived ? "Архив проектов" : "Рабочие проекты"}</h2><span class="badge">${items.length} записей</span></div>
      <div class="segmented-control" role="group" aria-label="Фильтр проектов">
        <button class="segment-button ${!archived ? "is-active" : ""}" type="button" data-project-filter="active">Проекты</button>
        <button class="segment-button ${archived ? "is-active" : ""}" type="button" data-project-filter="archived">Архив <span>${archivedProjects().length}</span></button>
      </div>
      <div class="list-stack">${items.length ? [...items].sort(prioritySort).map(projectCard).join("") : emptyState(archived ? "Архив проектов пуст" : "Проектов пока нет", archived ? "Архивированные проекты появятся здесь." : "Перейди в раздел «Идеи» и запусти направление, которое готов реализовывать.", false)}</div>
    </section>`;
}

function render() {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  ideasCount.textContent = String(openIdeas().length);
  projectsCount.textContent = String(activeProjects().length);
  if (state.view === "ideas") renderIdeas();
  else if (state.view === "projects") renderProjects();
  else renderOverview();
}

async function refresh() {
  const [ideas, projects] = await Promise.all([listIdeas(state.user.id), listProjects(state.user.id)]);
  state.ideas = ideas;
  state.projects = projects;
  render();
}

function openDialog() {
  if (!dialog.open) dialog.showModal();
  titleInput.focus();
}

async function performAction(entity, action, id) {
  if (state.busy) return;
  const isIdea = entity === "idea";
  const item = (isIdea ? state.ideas : state.projects).find((entry) => entry.id === id);
  if (!item) return;

  if (action === "delete") {
    if (!window.confirm(`Удалить «${item.name}» без возможности восстановления?`)) return;
    state.busy = true;
    try {
      if (isIdea) await deleteIdea(id, state.user.id);
      else await deleteProject(id, state.user.id);
      showStatus(isIdea ? "Идея удалена." : "Проект удалён.");
      await refresh();
    } catch (error) { showStatus(error.message, true); }
    finally { state.busy = false; }
    return;
  }

  if (isIdea && action === "launch") {
    state.busy = true;
    try {
      await createProjectFromIdea(item, state.user.id);
      state.view = "projects";
      showStatus("Проект создан. Исходная идея сохранена в истории.");
      await refresh();
    } catch (error) { showStatus(error.message, true); }
    finally { state.busy = false; }
    return;
  }

  const changes = {};
  if (isIdea) {
    if (action === "review") changes.status = item.status === "review" ? "new" : "review";
    if (action === "archive") changes.status = "archived";
    if (action === "restore") changes.status = "new";
    if (action === "priority") changes.priority = ["high", "critical"].includes(item.priority) ? "normal" : "high";
    if (!Object.keys(changes).length) return;
    state.busy = true;
    try {
      await updateIdea(id, state.user.id, changes);
      showStatus("Статус идеи обновлён.");
      await refresh();
    } catch (error) { showStatus(error.message, true); }
    finally { state.busy = false; }
    return;
  }

  if (action === "restore") changes.status = "active";
  if (action === "pin") changes.is_pinned = !item.is_pinned;
  if (action === "archive") changes.status = "archived";
  if (action === "complete") changes.status = "completed";
  if (action === "pause") changes.status = item.status === "paused" ? "active" : "paused";
  if (action === "priority") changes.priority = ["high", "critical"].includes(item.priority) ? "normal" : "high";
  if (!Object.keys(changes).length) return;
  state.busy = true;
  try {
    await updateProject(id, state.user.id, changes);
    showStatus("Изменения проекта сохранены.");
    await refresh();
  } catch (error) { showStatus(error.message, true); }
  finally { state.busy = false; }
}


function openIdeaActionMenu(ideaId) {
  const idea = state.ideas.find((entry) => entry.id === ideaId);
  if (!idea) return;
  if (idea.status === "launched") { openProjectActionMenu(ideaId); return; }
  const archived = idea.status === "archived";
  const priority = ["high", "critical"].includes(idea.priority);
  const actions = archived
    ? '<button type="button" data-entity="idea" data-action="restore" data-id="' + idea.id + '">↶ <span>Вернуть в рабочий список</span></button>'
    : '<button type="button" data-entity="idea" data-action="launch" data-id="' + idea.id + '">↗ <span>Запустить проект</span></button>' +
      '<button type="button" data-entity="idea" data-action="review" data-id="' + idea.id + '">◷ <span>' + (idea.status === "review" ? "Снять с рассмотрения" : "Отправить на рассмотрение") + '</span></button>' +
      '<button type="button" data-entity="idea" data-action="priority" data-id="' + idea.id + '">★ <span>' + (priority ? "Снять приоритет" : "Присвоить приоритет") + '</span></button>' +
      '<button type="button" data-entity="idea" data-action="archive" data-id="' + idea.id + '">↓ <span>Переместить в архив</span></button>';
  projectActionDialog.innerHTML = '<div class="project-action-panel"><div class="project-action-heading"><div><p class="eyebrow">IDEA CONTROL</p><h2>' + escapeHtml(idea.name) + '</h2><span>' + ideaStatusLabel(idea.status) + ' · ' + priorityLabel(idea.priority || "normal") + '</span></div><button class="project-action-close" type="button" data-close-project-menu aria-label="Закрыть">×</button></div><div class="project-action-list">' + actions + '<button class="is-danger" type="button" data-entity="idea" data-action="delete" data-id="' + idea.id + '">× <span>Удалить идею</span></button></div><p class="project-action-hint">Удерживание открывает меню действий. Обычное нажатие показывает подробности.</p></div>';
  if (!projectActionDialog.open) projectActionDialog.showModal();
}
function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}
function closeAccountPanel() {
  if (!accountPanel || !accountTrigger) return;
  accountPanel.hidden = true;
  accountTrigger.setAttribute("aria-expanded", "false");
}
menuToggle?.addEventListener("click", () => {
  const opened = document.body.classList.toggle("sidebar-open");
  menuToggle.setAttribute("aria-expanded", String(opened));
});
sidebarBackdrop?.addEventListener("click", closeSidebar);
accountTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  const opened = accountPanel.hidden;
  accountPanel.hidden = !opened;
  accountTrigger.setAttribute("aria-expanded", String(opened));
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".account-wrap")) closeAccountPanel();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closeAccountPanel(); closeSidebar(); }
});

let projectPressTimer = null;
let projectPressTarget = null;
let projectPressStart = null;
function cancelProjectPress() { if (projectPressTimer) window.clearTimeout(projectPressTimer); projectPressTimer = null; projectPressTarget = null; projectPressStart = null; }
function openIdeaDetails(ideaId) {
  const idea = state.ideas.find((entry) => entry.id === ideaId);
  if (!idea) return;
  const fields = [
    ["goal", "Цель проекта", "textarea"],
    ["expected_revenue", "Желаемый доход, ₽", "number"],
    ["estimated_cost", "Примерные расходы, ₽", "number"],
    ["business_model", "Модель заработка", "textarea"],
    ["concept", "Подробная концепция", "textarea"],
    ["additional_info", "Дополнительная информация", "textarea"],
  ];
  const input = (key, label, type) => {
    const value = idea[key] ?? "";
    return type === "textarea"
      ? `<label class="idea-detail-field"><span>${label}</span><textarea name="${key}" rows="${key === "concept" ? 5 : 3}" maxlength="8000">${escapeHtml(value)}</textarea></label>`
      : `<label class="idea-detail-field"><span>${label}</span><input name="${key}" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeHtml(value)}" placeholder="Не указано"></label>`;
  };
  ideaDetailDialog.dataset.ideaId = idea.id;
  ideaDetailDialog.innerHTML = `<form class="idea-detail-form" id="idea-detail-form">
    <header class="idea-detail-heading"><div><p class="eyebrow">IDEA / DETAILS</p><h2>Карточка идеи</h2><p>${escapeHtml(ideaStatusLabel(idea.status))} · ${priorityLabel(idea.priority || "normal")}</p></div><button class="project-action-close" type="button" data-close-idea-details aria-label="Закрыть">×</button></header>
    <label class="idea-detail-field"><span>Название идеи</span><input name="name" maxlength="120" required value="${escapeHtml(idea.name)}"></label>
    <label class="idea-detail-field"><span>Краткое описание</span><textarea name="description" rows="3" maxlength="3000">${escapeHtml(idea.description || "")}</textarea></label>
    <div class="idea-detail-divider"><span>ПЛАНИРОВАНИЕ И ЭКОНОМИКА</span></div>
    ${fields.map(([key,label,type]) => input(key,label,type)).join("")}
    <footer class="idea-detail-actions"><button class="button button-quiet" type="button" data-close-idea-details>Отмена</button><button class="button button-primary" type="submit">Сохранить изменения</button></footer>
  </form>`;
  if (!ideaDetailDialog.open) ideaDetailDialog.showModal();
  ideaDetailDialog.querySelector('[name="name"]').focus();
}
ideaDetailDialog.addEventListener("click", (event) => {
  if (event.target === ideaDetailDialog || event.target.closest("[data-close-idea-details]")) ideaDetailDialog.close();
});
ideaDetailDialog.addEventListener("submit", async (event) => {
  if (event.target.id !== "idea-detail-form") return;
  event.preventDefault();
  if (state.busy) return;
  const form = event.target;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) { showStatus("Укажи название идеи.", true); return; }
  const changes = {
    name,
    description: String(data.get("description") || "").trim(),
    goal: String(data.get("goal") || "").trim(),
    expected_revenue: data.get("expected_revenue") === "" ? null : Number(data.get("expected_revenue")),
    estimated_cost: data.get("estimated_cost") === "" ? null : Number(data.get("estimated_cost")),
    business_model: String(data.get("business_model") || "").trim(),
    concept: String(data.get("concept") || "").trim(),
    additional_info: String(data.get("additional_info") || "").trim(),
  };
  state.busy = true;
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    await updateIdea(ideaDetailDialog.dataset.ideaId, state.user.id, changes);
    ideaDetailDialog.close();
    await refresh();
    showStatus("Изменения идеи сохранены.");
  } catch (error) { showStatus(error.message, true); }
  finally { state.busy = false; submit.disabled = false; }
});

function openProjectActionMenu(ideaId) {
  const project = state.projects.find((entry) => entry.source_idea_id === ideaId);
  if (!project) { showStatus("Связанный проект не найден. Обнови страницу.", true); return; }
  const paused = project.status === "paused"; const archived = project.status === "archived";
  const restore = '<button type="button" data-entity="project" data-action="restore" data-id="' + project.id + '">↶ <span>Восстановить проект</span></button>';
  const controls = '<button type="button" data-entity="project" data-action="pin" data-id="' + project.id + '">' + (project.is_pinned ? "◆" : "◇") + '<span>' + (project.is_pinned ? "Открепить" : "Закрепить") + '</span></button>' + '<button type="button" data-entity="project" data-action="pause" data-id="' + project.id + '">' + (paused ? "▶" : "Ⅱ") + '<span>' + (paused ? "Возобновить" : "Поставить на паузу") + '</span></button>' + '<button type="button" data-entity="project" data-action="priority" data-id="' + project.id + '">★ <span>' + (["high", "critical"].includes(project.priority) ? "Снять приоритет" : "В приоритет") + '</span></button>' + '<button type="button" data-entity="project" data-action="complete" data-id="' + project.id + '">✓ <span>Завершить проект</span></button>' + '<button type="button" data-entity="project" data-action="archive" data-id="' + project.id + '">↓ <span>Переместить в архив</span></button>';
  projectActionDialog.innerHTML = '<div class="project-action-panel"><div class="project-action-heading"><div><p class="eyebrow">PROJECT CONTROL</p><h2>' + escapeHtml(project.name) + '</h2><span>' + projectStatusLabel(project.status) + ' · ' + priorityLabel(project.priority || "normal") + '</span></div><button class="project-action-close" type="button" data-close-project-menu aria-label="Закрыть">×</button></div><div class="project-action-list">' + (archived ? restore : controls) + '<button class="is-danger" type="button" data-entity="project" data-action="delete" data-id="' + project.id + '">× <span>Удалить проект</span></button></div><p class="project-action-hint">Действия применяются к проекту, связанному с этой идеей.</p></div>';
  if (!projectActionDialog.open) projectActionDialog.showModal();
}
let suppressIdeaClickUntil = 0;
content.addEventListener("pointerdown", (event) => {
  const target = event.target.closest("[data-idea-card]");
  if (!target || event.button !== 0) return;
  cancelProjectPress();
  projectPressTarget = target;
  projectPressStart = { x: event.clientX, y: event.clientY };
  projectPressTimer = window.setTimeout(() => {
    const id = projectPressTarget?.dataset.ideaCard;
    cancelProjectPress();
    if (id) { suppressIdeaClickUntil = Date.now() + 850; openIdeaActionMenu(id); }
  }, 550);
});
content.addEventListener("pointermove", (event) => {
  if (projectPressTimer && projectPressStart && Math.hypot(event.clientX-projectPressStart.x,event.clientY-projectPressStart.y)>12) cancelProjectPress();
});
["pointerup","pointercancel","pointerleave"].forEach((type) => content.addEventListener(type,cancelProjectPress));
content.addEventListener("contextmenu", (event) => {
  const target = event.target.closest("[data-idea-card]");
  if (!target) return;
  event.preventDefault();
  suppressIdeaClickUntil = Date.now() + 850;
  openIdeaActionMenu(target.dataset.ideaCard);
});
content.addEventListener("click", (event) => {
  const target = event.target.closest("[data-idea-card]");
  if (!target) return;
  if (Date.now() < suppressIdeaClickUntil) { event.preventDefault(); return; }
  openIdeaDetails(target.dataset.ideaCard);
});
content.addEventListener("keydown", (event) => {
  const target = event.target.closest("[data-idea-card]");
  if (!target || !["Enter"," "].includes(event.key)) return;
  event.preventDefault();
  openIdeaDetails(target.dataset.ideaCard);
});
projectActionDialog.addEventListener("click", async (event) => { if (event.target===projectActionDialog || event.target.closest("[data-close-project-menu]")) { projectActionDialog.close(); return; } const button=event.target.closest("[data-action]"); if (!button) return; projectActionDialog.close(); await performAction(button.dataset.entity,button.dataset.action,button.dataset.id); });
document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) { state.view = nav.dataset.view; render(); closeSidebar(); return; }
  const go = event.target.closest("[data-go]");
  if (go) { state.view = go.dataset.go; render(); return; }
  if (event.target.closest("[data-open-idea], .empty-add")) { openDialog(); return; }
  const ideaFilter = event.target.closest("[data-idea-filter]");
  if (ideaFilter) { state.ideaFilter = ideaFilter.dataset.ideaFilter; renderIdeas(); return; }
  const projectFilter = event.target.closest("[data-project-filter]");
  if (projectFilter) { state.projectFilter = projectFilter.dataset.projectFilter; renderProjects(); return; }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) await performAction(actionButton.dataset.entity, actionButton.dataset.action, actionButton.dataset.id);
});

document.querySelector("#close-idea-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-idea").addEventListener("click", () => dialog.close());

ideaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.busy) return;
  saveIdeaButton.disabled = true;
  state.busy = true;
  try {
    await createIdea({
      ownerId: state.user.id,
      title: titleInput.value,
      description: descriptionInput.value,
      goal: goalInput.value,
      expectedRevenue: expectedRevenueInput.value === "" ? null : Number(expectedRevenueInput.value),
      estimatedCost: estimatedCostInput.value === "" ? null : Number(estimatedCostInput.value),
      businessModel: businessModelInput.value,
      concept: conceptInput.value,
      additionalInfo: additionalInfoInput.value,
    });
    ideaForm.reset();
    additionalParameters.open = false;
    dialog.close();
    state.view = "ideas";
    state.ideaFilter = "open";
    await refresh();
    showStatus("Идея сохранена отдельно от проектов.");
  } catch (error) { showStatus(error.message, true); }
  finally { state.busy = false; saveIdeaButton.disabled = false; }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await logout();
    window.location.replace("/pages/auth/auth.html");
  } catch (error) {
    logoutButton.disabled = false;
    showStatus(error.message || "Не удалось завершить сеанс.", true);
  }
});

async function init() {
  try {
    const session = await getSession();
    if (!session || getRole(session) !== "admin") {
      window.location.replace("/pages/auth/auth.html");
      return;
    }
    state.user = session.user;
    const displayName = session.user.user_metadata?.display_name?.trim()
      || session.user.user_metadata?.full_name?.trim()
      || session.user.email?.split("@")[0]
      || "Пользователь";
    const role = getRole(session);
    accountName.textContent = displayName;
    accountRole.textContent = role === "admin" ? "Администратор" : "Пользователь";
    accountEmail.textContent = session.user.email || "Email не указан";
    accountAvatar.textContent = displayName.charAt(0).toUpperCase();
    await refresh();
  } catch (error) {
    content.innerHTML = '<div class="empty-state"><div><strong>Не удалось открыть рабочее пространство</strong><p>Проверь подключение и попробуй обновить страницу.</p></div></div>';
    showStatus(error.message || "Ошибка загрузки.", true);
  }
}

init();
