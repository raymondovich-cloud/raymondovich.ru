// version 4.4
import { getSession, getRole, logout } from "../../application/auth/authentication.js";
import { createIdea, deleteIdea, listIdeas, updateIdea } from "../../application/ideas/idea-service.js";
import { createProjectFromIdea, deleteProject, listProjects, updateProject } from "../../application/projects/project-service.js";

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
const openIdeaButton = document.querySelector("#open-idea-dialog");
const dialog = document.querySelector("#idea-dialog");
const ideaForm = document.querySelector("#idea-form");
const saveIdeaButton = document.querySelector("#save-idea");
const titleInput = document.querySelector("#idea-title");
const descriptionInput = document.querySelector("#idea-description");
const ideasCount = document.querySelector("#ideas-count");
const projectsCount = document.querySelector("#projects-count");

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
  content.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">CAPTURE / THINK LATER</p><h1>Идеи</h1><p>Идеи живут отдельно от проектов. Только команда «Запустить проект» создаёт рабочий проект.</p></div></div>
    <section class="section-card"><div class="section-heading"><h2>${archived ? "Архив идей" : "Входящие идеи"}</h2><span class="badge">${items.length} записей</span></div>
      <div class="segmented-control" role="group" aria-label="Фильтр идей">
        <button class="segment-button ${!archived ? "is-active" : ""}" type="button" data-idea-filter="open">Входящие</button>
        <button class="segment-button ${archived ? "is-active" : ""}" type="button" data-idea-filter="archived">Архив <span>${archivedIdeas().length}</span></button>
      </div>
      <div class="list-stack">${items.length ? [...items].sort(prioritySort).map(ideaCard).join("") : emptyState(archived ? "Архив идей пуст" : "Идей пока нет", archived ? "Архивированные идеи появятся здесь." : "Нажми «Новая идея» в верхней панели, чтобы зафиксировать первую мысль.", false)}</div>
      ${launched.length ? `<div class="section-heading idea-history-heading"><h2>Переданы в проекты</h2><span class="badge">${launched.length}</span></div><div class="list-stack">${launched.sort(prioritySort).map(ideaCard).join("")}</div>` : ""}
    </section>`;
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

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) { state.view = nav.dataset.view; render(); closeSidebar(); return; }
  const go = event.target.closest("[data-go]");
  if (go) { state.view = go.dataset.go; render(); return; }
  if (event.target.closest(".empty-add")) { openDialog(); return; }
  const ideaFilter = event.target.closest("[data-idea-filter]");
  if (ideaFilter) { state.ideaFilter = ideaFilter.dataset.ideaFilter; renderIdeas(); return; }
  const projectFilter = event.target.closest("[data-project-filter]");
  if (projectFilter) { state.projectFilter = projectFilter.dataset.projectFilter; renderProjects(); return; }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) await performAction(actionButton.dataset.entity, actionButton.dataset.action, actionButton.dataset.id);
});

openIdeaButton.addEventListener("click", openDialog);
document.querySelector("#close-idea-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-idea").addEventListener("click", () => dialog.close());

ideaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.busy) return;
  saveIdeaButton.disabled = true;
  state.busy = true;
  try {
    await createIdea({ ownerId: state.user.id, title: titleInput.value, description: descriptionInput.value });
    ideaForm.reset();
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
    window.location.replace("./auth.html");
  } catch (error) {
    logoutButton.disabled = false;
    showStatus(error.message || "Не удалось завершить сеанс.", true);
  }
});

async function init() {
  try {
    const session = await getSession();
    if (!session || getRole(session) !== "admin") {
      window.location.replace("./auth.html");
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
