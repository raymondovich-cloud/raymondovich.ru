// version 3.0
import { getSession, getRole, logout } from "../../application/auth/authentication.js";
import { createIdea, deleteProject, listProjects, updateProject } from "../../application/projects/project-service.js";

const content = document.querySelector("#workspace-content");
const status = document.querySelector("#control-status");
const logoutButton = document.querySelector("#logout-button");
const accountTrigger = document.querySelector("#account-trigger");
const accountPanel = document.querySelector("#account-panel");
const accountEmail = document.querySelector("#account-email");
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

const state = { user: null, projects: [], view: "overview", projectFilter: "active", busy: false };

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

function statusLabel(value) {
  return ({ idea: "Новая идея", review: "На рассмотрении", active: "В работе", paused: "На паузе", completed: "Завершён", archived: "Архив" })[value] || value;
}

function visibleIdeas() {
  return state.projects.filter((project) => project.status === "idea" || project.status === "review");
}

function visibleProjects() {
  return state.projects.filter((project) => !["idea", "review", "archived"].includes(project.status));
}

function archivedProjects() {
  return state.projects.filter((project) => project.status === "archived");
}

function cardMarkup(project, isIdea) {
  const priority = project.priority || "normal";
  const isArchived = project.status === "archived";
  const actions = isArchived
    ? `<button class="action-button is-primary" type="button" data-action="restore" data-id="${project.id}">Вернуть в проекты</button>
       <button class="action-button is-danger" type="button" data-action="delete" data-id="${project.id}">Удалить навсегда</button>`
    : isIdea
      ? `<button class="action-button is-primary" type="button" data-action="launch" data-id="${project.id}">Запустить проект</button>
         <button class="action-button" type="button" data-action="review" data-id="${project.id}">На рассмотрение</button>
         <button class="action-button" type="button" data-action="priority" data-id="${project.id}">${priority === "high" || priority === "critical" ? "Снять приоритет" : "В приоритет"}</button>
         <button class="action-button" type="button" data-action="archive" data-id="${project.id}">В архив</button>
         <button class="action-button is-danger" type="button" data-action="delete" data-id="${project.id}">Удалить</button>`
      : `<button class="action-button" type="button" data-action="pause" data-id="${project.id}">${project.status === "paused" ? "Возобновить" : "Пауза"}</button>
         <button class="action-button" type="button" data-action="priority" data-id="${project.id}">${priority === "high" || priority === "critical" ? "Снять приоритет" : "В приоритет"}</button>
         <button class="action-button" type="button" data-action="complete" data-id="${project.id}">Завершить</button>
         <button class="action-button" type="button" data-action="archive" data-id="${project.id}">В архив</button>`;

  return `<article class="${isIdea ? "idea-card" : "project-card"}">
    <div class="card-topline"><div>
      <h3 class="card-title">${escapeHtml(project.name)}</h3>
      ${project.description ? `<p class="card-description">${escapeHtml(project.description)}</p>` : ""}
    </div></div>
    <div class="card-meta">
      <span class="badge badge-status">${statusLabel(project.status)}</span>
      <span class="badge ${priority === "high" || priority === "critical" ? "badge-priority" : ""}">${priorityLabel(priority)}</span>
      ${project.target_due_date ? `<span class="card-date">Срок: ${dateLabel(project.target_due_date)}</span>` : ""}
    </div>
    <div class="card-actions">${actions}</div>
  </article>`;
}

function emptyState(title, message, button = true) {
  return `<div class="empty-state"><div><div class="empty-symbol">✳</div><strong>${title}</strong><p>${message}</p>${button ? '<button class="button button-primary empty-add" type="button">＋ Добавить идею</button>' : ""}</div></div>`;
}

function renderOverview() {
  const ideas = visibleIdeas();
  const projects = visibleProjects();
  const active = projects.filter((item) => item.status === "active").length;
  const priority = state.projects.filter((item) => item.priority === "high" || item.priority === "critical").length;
  const recent = [...state.projects].filter((item) => item.status !== "archived").slice(0, 4);

  content.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">ECOSYSTEM / OVERVIEW</p><h1>Центр управления</h1><p>Все идеи и направления в одном месте. Зафиксируй мысль сейчас — вернись к ней, когда будешь готов.</p></div></div>
    <div class="overview-grid">
      <article class="metric-card"><div class="metric-label">Входящие идеи</div><div class="metric-value">${ideas.length}</div><div class="metric-note">Новые и ожидающие решения</div></article>
      <article class="metric-card"><div class="metric-label">Активные проекты</div><div class="metric-value">${active}</div><div class="metric-note">Направления в реализации</div></article>
      <article class="metric-card"><div class="metric-label">Приоритетные</div><div class="metric-value">${priority}</div><div class="metric-note">Отмечены твоим вниманием</div></article>
    </div>
    <div class="columns-two">
      <section class="section-card"><div class="section-heading"><h2>Недавние записи</h2><button class="text-action" type="button" data-go="ideas">Все идеи →</button></div>
        <div class="list-stack">${recent.length ? recent.map((item) => cardMarkup(item, item.status === "idea" || item.status === "review")).join("") : emptyState("Пока здесь пусто", "Добавь первую идею. Для этого достаточно одного короткого названия.")}</div>
      </section>
      <section class="section-card"><div class="section-heading"><h2>Фокус</h2><span class="badge">Сейчас</span></div>
        <div class="list-stack">${projects.filter((item) => item.status === "active").length ? projects.filter((item) => item.status === "active").slice(0,3).map((item) => cardMarkup(item, false)).join("") : emptyState("Нет активного проекта", "Выбери идею и запусти её, когда будешь готов.", false)}</div>
      </section>
    </div>`;
}

function renderIdeas() {
  const ideas = visibleIdeas();
  const sorted = [...ideas].sort((a,b) => {
    const ap = a.priority === "critical" ? 3 : a.priority === "high" ? 2 : a.priority === "low" ? 0 : 1;
    const bp = b.priority === "critical" ? 3 : b.priority === "high" ? 2 : b.priority === "low" ? 0 : 1;
    return bp - ap || new Date(b.updated_at) - new Date(a.updated_at);
  });
  content.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">CAPTURE / THINK LATER</p><h1>Идеи</h1><p>Быстро фиксируй мысли. Не нужно сразу превращать каждую из них в задачу или бизнес-план.</p></div><button class="button button-primary" type="button" id="page-add-idea">＋ Новая идея</button></div>
    <section class="section-card"><div class="section-heading"><h2>Входящие идеи</h2><span class="badge">${ideas.length} записей</span></div>
      <div class="list-stack">${sorted.length ? sorted.map((item) => cardMarkup(item, true)).join("") : emptyState("Идей пока нет", "Когда появится мысль, просто нажми «Новая идея». Она сохранится здесь и не потеряется.")}</div>
    </section>`;
}

function renderProjects() {
  const archived = state.projectFilter === "archived";
  const projects = archived ? archivedProjects() : visibleProjects();
  const sorted = [...projects].sort((a,b) => {
    const ap = a.priority === "critical" ? 3 : a.priority === "high" ? 2 : 1;
    const bp = b.priority === "critical" ? 3 : b.priority === "high" ? 2 : 1;
    return bp - ap || new Date(b.updated_at) - new Date(a.updated_at);
  });
  content.innerHTML = `
    <div class="page-heading"><div><p class="eyebrow">EXECUTION / PROJECTS</p><h1>Проекты</h1><p>Направления, которые перешли от идеи к реализации. Детальная карта, статистика и документация будут подключаться отдельными этапами.</p></div></div>
    <section class="section-card">
      <div class="section-heading"><h2>${archived ? "Архив" : "Рабочие направления"}</h2><span class="badge">${projects.length} записей</span></div>
      <div class="segmented-control" role="group" aria-label="Фильтр проектов">
        <button class="segment-button ${!archived ? "is-active" : ""}" type="button" data-project-filter="active">Проекты</button>
        <button class="segment-button ${archived ? "is-active" : ""}" type="button" data-project-filter="archived">Архив <span>${archivedProjects().length}</span></button>
      </div>
      <div class="list-stack">${sorted.length ? sorted.map((item) => cardMarkup(item, false)).join("") : emptyState(archived ? "Архив пуст" : "Проектов пока нет", archived ? "Отправленные в архив идеи и проекты появятся здесь. Их можно будет вернуть." : "Выбери идею во входящих и нажми «Запустить проект».", false)}</div>
    </section>`;
}

function render() {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  ideasCount.textContent = String(visibleIdeas().length);
  projectsCount.textContent = String(visibleProjects().length);
  if (state.view === "ideas") renderIdeas();
  else if (state.view === "projects") renderProjects();
  else renderOverview();
}

async function refresh() {
  state.projects = await listProjects(state.user.id);
  render();
}

function openDialog() {
  if (!dialog.open) dialog.showModal();
  titleInput.focus();
}

async function performAction(action, id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project || state.busy) return;

  let changes = null;
  if (action === "launch" || action === "restore") changes = { status: "active" };
  if (action === "review") changes = { status: "review" };
  if (action === "archive") changes = { status: "archived" };
  if (action === "complete") changes = { status: "completed" };
  if (action === "pause") changes = { status: project.status === "paused" ? "active" : "paused" };
  if (action === "priority") changes = { priority: project.priority === "high" || project.priority === "critical" ? "normal" : "high" };

  if (action === "delete") {
    if (!window.confirm(`Удалить «${project.name}» без возможности восстановления?`)) return;
    state.busy = true;
    try {
      await deleteProject(id, state.user.id);
      showStatus("Запись удалена.");
      await refresh();
    } catch (error) { showStatus(error.message, true); }
    finally { state.busy = false; }
    return;
  }

  if (!changes) return;
  state.busy = true;
  try {
    await updateProject(id, state.user.id, changes);
    showStatus(action === "launch" ? "Проект запущен." : action === "priority" ? "Приоритет обновлён." : "Изменения сохранены.");
    await refresh();
  } catch (error) { showStatus(error.message, true); }
  finally { state.busy = false; }
}

function closeSidebar() { document.body.classList.remove("sidebar-open"); menuToggle?.setAttribute("aria-expanded", "false"); }
function closeAccountPanel() { accountPanel.hidden = true; accountTrigger.setAttribute("aria-expanded", "false"); }
menuToggle?.addEventListener("click", () => { const opened = document.body.classList.toggle("sidebar-open"); menuToggle.setAttribute("aria-expanded", String(opened)); });
sidebarBackdrop?.addEventListener("click", closeSidebar);
accountTrigger.addEventListener("click", (event) => { event.stopPropagation(); const opened = accountPanel.hidden; accountPanel.hidden = !opened; accountTrigger.setAttribute("aria-expanded", String(opened)); });
document.addEventListener("click", (event) => { if (!event.target.closest(".account-wrap")) closeAccountPanel(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeAccountPanel(); closeSidebar(); } });

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) { state.view = nav.dataset.view; render(); closeSidebar(); return; }

  const go = event.target.closest("[data-go]");
  if (go) { state.view = go.dataset.go; render(); return; }

  if (event.target.closest("#page-add-idea, .empty-add")) { openDialog(); return; }

  const projectFilter = event.target.closest("[data-project-filter]");
  if (projectFilter) {
    state.projectFilter = projectFilter.dataset.projectFilter;
    renderProjects();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) await performAction(actionButton.dataset.action, actionButton.dataset.id);
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
    await refresh();
    showStatus("Идея сохранена. К ней можно вернуться в любой момент.");
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    state.busy = false;
    saveIdeaButton.disabled = false;
  }
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
    accountEmail.textContent = session.user.email || "Email не указан";
    await refresh();
  } catch (error) {
    content.innerHTML = '<div class="empty-state"><div><strong>Не удалось открыть рабочее пространство</strong><p>Проверь подключение и попробуй обновить страницу.</p></div></div>';
    showStatus(error.message || "Ошибка загрузки.", true);
  }
}

init();
