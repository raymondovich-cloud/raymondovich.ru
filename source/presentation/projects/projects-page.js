// version 1.6
import { getSession, getRole } from "../../application/auth/authentication.js";
import { calculateProgress, createChatGptPrompt, deleteProject, getProject, importPlan, listProjects, updateTask } from "../../application/projects/project-service.js";

const listView = document.querySelector("#project-list-view");
const detailView = document.querySelector("#project-detail-view");
const projectList = document.querySelector("#project-list");
const backButton = document.querySelector("#back-button");
const detail = document.querySelector("#project-detail");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function progressHtml(progress) {
  return '<div class="project-progress"><div class="project-progress-track"><span style="width:' + progress + '%"></span></div><strong>' + progress + '%</strong></div>';
}

function renderList(projects) {
  projectList.innerHTML = projects.length
    ? projects.map((p) =>
        '<div class="project-list-row"><button class="project-list-item" data-project-id="' + p.id + '" type="button"><div><strong>' +
        esc(p.name) + '</strong><small>' + esc(p.description || "Без описания") +
        '</small></div><span>Открыть →</span></button><button class="project-delete" data-delete-project-id="' + p.id + '" type="button" aria-label="Удалить проект">Удалить</button></div>'
      ).join("")
    : '<div class="project-empty">Проектов пока нет. Создай первый проект.</div>';

  projectList.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => openProject(button.dataset.projectId));
  });

  projectList.querySelectorAll("[data-delete-project-id]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const projectId = button.dataset.deleteProjectId;
      const row = button.closest(".project-list-row");
      const name = row?.querySelector(".project-list-item strong")?.textContent || "этот проект";

      if (!window.confirm("Удалить проект «" + name + "»?\n\nБудут удалены его этапы, задачи и история. Отменить действие будет нельзя.")) return;

      button.disabled = true;
      button.textContent = "Удаление...";

      try {
        await deleteProject(projectId);
        renderList(await listProjects());
      } catch (error) {
        button.disabled = false;
        button.textContent = "Удалить";
        alert(error.message || "Не удалось удалить проект.");
      }
    });
  });
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

  html +=
    '</section><section class="project-section ai-section"><div class="project-section-header"><div><p class="project-kicker">AI PROJECT MANAGER</p><h3>Зафиксировать план</h3></div></div>' +
    '<p class="project-help">Сформируй план в ChatGPT по готовому запросу, затем вставь возвращённый JSON.</p>' +
    '<button class="project-action" id="prompt-button" type="button">Сформировать запрос для ChatGPT</button>' +
    '<textarea id="prompt-output" rows="10" placeholder="Готовый запрос появится здесь..."></textarea>' +
    '<textarea id="plan-input" rows="12" placeholder="Вставь JSON из ChatGPT..."></textarea>' +
    '<button class="project-action primary" id="import-plan-button" type="button">Заменить карту проекта</button>' +
    '<p class="project-status" id="plan-status"></p></section>';

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

  detail.querySelector("#prompt-button").addEventListener("click", async () => {
    const prompt = createChatGptPrompt(project);
    detail.querySelector("#prompt-output").value = prompt;
    try { await navigator.clipboard.writeText(prompt); } catch {}
    detail.querySelector("#prompt-button").textContent = "Запрос скопирован";
  });

  detail.querySelector("#import-plan-button").addEventListener("click", async () => {
    const status = detail.querySelector("#plan-status");
    try {
      status.textContent = "Заменяем карту проекта...";
      await importPlan(project.id, JSON.parse(detail.querySelector("#plan-input").value));
      await openProject(project.id);
    } catch (error) {
      status.textContent = error.message || "Не удалось импортировать план.";
    }
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

  renderList(await listProjects());

  backButton.addEventListener("click", async () => {
    detailView.hidden = true;
    listView.hidden = false;
    renderList(await listProjects());
  });
}

init().catch((error) => {
  projectList.innerHTML = '<div class="project-empty">' + esc(error.message) + '</div>';
});
