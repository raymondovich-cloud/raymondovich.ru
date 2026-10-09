// version 3.1
import { getSession, getRole } from "../../application/auth/authentication.js";
import { calculateProgress, createChatGptPrompt, deleteProject, getProject, importPlan, listProjects, setProjectPinned, updateProjectName, updateTask } from "../../application/projects/project-service.js";

const listView = document.querySelector("#project-list-view");
const detailView = document.querySelector("#project-detail-view");
const projectList = document.querySelector("#project-list");
const backButton = document.querySelector("#back-button");
const detail = document.querySelector("#project-detail");
let currentProjects = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function progressHtml(progress) {
  const value = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  return '<div class="project-progress" role="group" aria-label="Готовность проекта ' + value + '%"><div class="project-progress-track" role="progressbar" aria-label="Готовность проекта" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + value + '"><span class="project-progress-fill" style="--progress:' + value + '%"></span></div><strong>' + value + '%</strong></div>';
}

function formatDate(value) {
  if (!value) return "Не указано";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderList(projects) {
  projectList.innerHTML = projects.length
    ? projects.map((p) => {
        const progress = calculateProgress(p);
        const pinBadge = p.is_pinned ? '<span class="project-pin-badge">ЗАКРЕПЛЁН</span>' : '';
        return '<div class="project-list-row" data-row-project-id="' + p.id + '">' +
          '<button class="project-list-item" data-project-id="' + p.id + '" type="button">' +
          '<div class="project-list-copy"><div class="project-list-title-line"><strong>' + esc(p.name) + '</strong>' + pinBadge + '</div>' +
          '<small>' + esc(p.description || "Без описания") + '</small></div>' +
          '<div class="project-list-progress" aria-label="Готовность проекта ' + progress + '%">' +
          '<div class="project-list-progress-heading"><span>Готовность</span></div>' +
          progressHtml(progress) + '</div></button></div>';
      }).join("")
    : '<div class="project-empty">Проектов пока нет. Создай первый проект.</div>';

  projectList.querySelectorAll("[data-project-id]").forEach((button) => {
    let timer = null;
    let longPressed = false;

    const open = () => {
      if (longPressed) {
        longPressed = false;
        return;
      }
      openProject(button.dataset.projectId);
    };

    const startLongPress = (event) => {
      if (event.type === "mousedown" && event.button !== 0) return;
      longPressed = false;
      timer = window.setTimeout(() => {
        longPressed = true;
        if (navigator.vibrate) navigator.vibrate(18);
        showProjectMenu(button.dataset.projectId);
      }, 800);
    };

    const cancelLongPress = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    button.addEventListener("click", open);
    button.addEventListener("touchstart", startLongPress, { passive: true });
    button.addEventListener("touchend", cancelLongPress);
    button.addEventListener("touchcancel", cancelLongPress);
    button.addEventListener("mousedown", startLongPress);
    button.addEventListener("mouseup", cancelLongPress);
    button.addEventListener("mouseleave", cancelLongPress);
  });
}

function closeProjectMenus() {
  document.querySelectorAll(".project-context-backdrop").forEach((backdrop) => backdrop.remove());
  projectList.querySelectorAll(".project-list-item.is-selected").forEach((item) => item.classList.remove("is-selected"));
  document.body.classList.remove("project-menu-open");
}

function showProjectMenu(projectId) {
  closeProjectMenus();

  const row = projectList.querySelector('[data-row-project-id="' + projectId + '"]');
  const button = row?.querySelector("[data-project-id]");
  if (!row || !button) return;

  const project = currentProjects.find((item) => String(item.id) === String(projectId));
  if (!project) return;

  button.classList.add("is-selected");

  const backdrop = document.createElement("div");
  backdrop.className = "project-context-backdrop";
  backdrop.setAttribute("role", "presentation");

  const menu = document.createElement("section");
  menu.className = "project-context-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-labelledby", "project-context-title");
  menu.dataset.projectId = String(project.id);
  menu.innerHTML =
    '<div class="project-context-header"><div class="project-context-info"><span>ВЗАИМОДЕЙСТВИЕ С ПРОЕКТОМ</span><h2 id="project-context-title">' + esc(project.name) + '</h2></div>' +
    '<button class="project-context-x" data-project-close type="button" aria-label="Закрыть окно">×</button></div>' +
    '<div class="project-context-info project-context-meta"><strong>Добавлен: ' + esc(formatDate(project.created_at)) +
    '</strong><small>Кем: ' + esc(project.owner_name || project.owner_id || "Неизвестно") + '</small></div>' +
    '<div class="project-context-actions">' +
    '<button class="project-context-action primary" data-project-pin type="button">' + (project.is_pinned ? "Открепить проект" : "Закрепить проект") + '</button>' +
    '<button class="project-context-action" data-project-edit type="button">Изменить название</button>' +
    '<button class="project-context-action danger" data-project-delete type="button">Удалить проект</button>' +
    '</div>';

  backdrop.appendChild(menu);
  document.body.appendChild(backdrop);
  document.body.classList.add("project-menu-open");
  requestAnimationFrame(() => backdrop.classList.add("is-visible"));
  menu.querySelector("[data-project-close]").focus();

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeProjectMenus();
  });
  menu.querySelector("[data-project-close]").addEventListener("click", closeProjectMenus);
  menu.querySelector("[data-project-pin]").addEventListener("click", async () => {
    try {
      await setProjectPinned(project.id, !project.is_pinned);
      closeProjectMenus();
      currentProjects = await listProjects();
      renderList(currentProjects);
    } catch (error) {
      alert(error.message || "Не удалось изменить приоритет проекта.");
    }
  });
  menu.querySelector("[data-project-edit]").addEventListener("click", () => editProjectName(project));
  menu.querySelector("[data-project-delete]").addEventListener("click", () => removeProject(project));
}
async function editProjectName(project) {
  const menu = document.querySelector('.project-context-menu[data-project-id="' + project.id + '"]');
  if (!menu) return;

  menu.innerHTML =
    '<div class="project-context-header"><div class="project-context-info"><span>ИЗМЕНИТЬ ПРОЕКТ</span><h2 id="project-context-title">Название проекта</h2></div>' +
    '<button class="project-context-x" data-project-cancel type="button" aria-label="Закрыть окно">×</button></div>' +
    '<input class="project-context-input" data-project-name-input type="text" maxlength="120" value="' + esc(project.name) + '" aria-label="Название проекта">' +
    '<div class="project-context-actions">' +
    '<button class="project-context-action primary" data-project-save type="button">Сохранить</button>' +
    '<button class="project-context-action" data-project-cancel type="button">Отмена</button></div>';

  const input = menu.querySelector("[data-project-name-input]");
  input.focus();
  input.select();

  menu.querySelectorAll("[data-project-cancel]").forEach((button) => button.addEventListener("click", closeProjectMenus));
  menu.querySelector("[data-project-save]").addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    try {
      await updateProjectName(project.id, value);
      closeProjectMenus();
      currentProjects = await listProjects();
      renderList(currentProjects);
    } catch (error) {
      alert(error.message || "Не удалось изменить название проекта.");
    }
  });
}

async function removeProject(project) {
  if (!window.confirm("Удалить проект «" + project.name + "»?\n\nБудут удалены его этапы, задачи и история. Отменить действие будет нельзя.")) return;

  try {
    await deleteProject(project.id);
    closeProjectMenus();
    currentProjects = await listProjects();
    renderList(currentProjects);
  } catch (error) {
    alert(error.message || "Не удалось удалить проект.");
  }
}

function renderDetail(project) {
  const progress = calculateProgress(project);
  const milestones = project.milestones || [];

  let html =
    '<section class="project-hero"><p class="project-kicker">PROJECT</p><h2>' +
    esc(project.name) + '</h2><p>' + esc(project.description || "Описание не задано.") +
    '</p>' + progressHtml(progress) +
    '<div class="project-progress-meta"><span>Готовность проекта</span><strong>' +
    progress + ' / 100</strong></div></section>';

  html +=
    '<section class="project-definition">' +
    '<div class="project-definition-row"><span>Цель</span><strong>' +
    esc(project.goal || "Не задана") +
    '</strong></div>' +
    '<div class="project-definition-collapsible">' +
    '<button class="project-definition-toggle" id="completion-toggle" type="button" aria-expanded="false" aria-controls="completion-criteria-content">' +
    '<span>100% означает</span><span class="project-definition-chevron" aria-hidden="true">⌄</span>' +
    '</button>' +
    '<div class="project-definition-content" id="completion-criteria-content" hidden><strong>' +
    esc(project.completion_criteria || "Критерии не зафиксированы") +
    '</strong></div>' +
    '</div>' +
    '</section>';

  html +=
    '<section class="project-section"><div class="project-section-header"><div><p class="project-kicker">ROADMAP</p><h3>Карта проекта</h3></div><strong>' +
    milestones.length + ' этапов</strong></div>';

  html += milestones.length
    ? milestones.map((milestone) => {
        const tasks = milestone.tasks || [];
        return '<article class="milestone"><div class="milestone-header"><div><span class="milestone-weight">' +
          Number(milestone.weight) + '%</span><h4>' + esc(milestone.title) +
          '</h4><p>' + esc(milestone.description || "") +
          '</p></div><span>' + tasks.filter((task) => task.completed).length +
          '/' + tasks.length + '</span></div><div class="task-list">' +
          tasks.map((task) =>
            '<label class="task-row"><input type="checkbox" data-task-id="' + task.id +
            '" ' + (task.completed ? "checked" : "") + '><span>' + esc(task.title) +
            '</span></label>'
          ).join("") + '</div></article>';
      }).join("")
    : '<div class="project-empty">Пока нет этапов.</div>';

  html += '</section>';

  detail.innerHTML = html;

  const completionToggle = detail.querySelector("#completion-toggle");
  const completionContent = detail.querySelector("#completion-criteria-content");
  completionToggle.addEventListener("click", () => {
    const expanded = completionToggle.getAttribute("aria-expanded") === "true";
    completionToggle.setAttribute("aria-expanded", String(!expanded));
    completionContent.hidden = expanded;
  });

  detail.querySelectorAll("[data-task-id]").forEach((input) => {
    input.addEventListener("change", async () => {
      try {
        await updateTask(input.dataset.taskId, input.checked);
        await openProject(project.id);
      } catch (error) {
        alert(error.message);
        input.checked = !input.checked;
      }
    });
  });

}

async function openProject(id) {
  listView.hidden = true;
  detailView.hidden = false;
  detail.innerHTML = '<div class="project-loading">Загрузка проекта...</div>';
  renderDetail(await getProject(id));
}

async function init() {
  const session = await getSession();
  if (!session || getRole(session) !== "admin") {
    window.location.replace("./auth.html");
    return;
  }

  currentProjects = await listProjects();
  renderList(currentProjects);

  backButton.addEventListener("click", async () => {
    detailView.hidden = true;
    listView.hidden = false;
    currentProjects = await listProjects();
    renderList(currentProjects);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector(".project-context-backdrop")) {
      closeProjectMenus();
    }
  });
}

init().catch((error) => {
  projectList.innerHTML = '<div class="project-empty">' + esc(error.message) + '</div>';
});
