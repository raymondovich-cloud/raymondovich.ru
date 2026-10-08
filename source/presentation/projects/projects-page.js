// version 1.2
import { getSession, getRole } from "../../application/auth/authentication.js";
import { calculateProgress, createChatGptPrompt, createProject, getProject, importPlan, listProjects, updateTask } from "../../application/projects/project-service.js";

const listView = document.querySelector("#project-list-view");
const detailView = document.querySelector("#project-detail-view");
const projectList = document.querySelector("#project-list");
const createForm = document.querySelector("#create-project-form");
const createStatus = document.querySelector("#create-status");
const backButton = document.querySelector("#back-button");
const detail = document.querySelector("#project-detail");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function progressHtml(progress) {
  return '<div class="project-progress"><div class="project-progress-track"><span style="width:' + progress + '%"></span></div><strong>' + progress + '%</strong></div>';
}

function renderList(projects) {
  projectList.innerHTML = projects.length ? projects.map((p) =>
    '<button class="project-list-item" data-project-id="' + p.id + '" type="button"><div><strong>' + esc(p.name) + '</strong><small>' + esc(p.description || "Без описания") + '</small></div><span>Открыть →</span></button>'
  ).join("") : '<div class="project-empty">Проектов пока нет. Создай первый проект.</div>';
  projectList.querySelectorAll("[data-project-id]").forEach((b) => b.addEventListener("click", () => openProject(b.dataset.projectId)));
}

function renderDetail(project) {
  const progress = calculateProgress(project);
  const milestones = project.milestones || [];
  let html = '<section class="project-hero"><p class="project-kicker">PROJECT</p><h2>' + esc(project.name) + '</h2><p>' + esc(project.description || "Описание не задано.") + '</p>' + progressHtml(progress) + '<div class="project-progress-meta"><span>Готовность проекта</span><strong>' + progress + ' / 100</strong></div></section>';
  html += '<section class="project-definition"><div><span>Цель</span><strong>' + esc(project.goal || "Не задана") + '</strong></div><div><span>100% означает</span><strong>' + esc(project.completion_criteria || "Критерии не зафиксированы") + '</strong></div></section>';
  html += '<section class="project-section"><div class="project-section-header"><div><p class="project-kicker">ROADMAP</p><h3>Карта проекта</h3></div><strong>' + milestones.length + ' этапов</strong></div>';
  html += milestones.length ? milestones.map((m) => {
    const tasks = m.tasks || [];
    return '<article class="milestone"><div class="milestone-header"><div><span class="milestone-weight">' + Number(m.weight) + '%</span><h4>' + esc(m.title) + '</h4><p>' + esc(m.description || "") + '</p></div><span>' + tasks.filter((t) => t.completed).length + '/' + tasks.length + '</span></div><div class="task-list">' +
      tasks.map((t) => '<label class="task-row"><input type="checkbox" data-task-id="' + t.id + '" ' + (t.completed ? "checked" : "") + '><span>' + esc(t.title) + '</span></label>').join("") +
      '</div></article>';
  }).join("") : '<div class="project-empty">Пока нет этапов. Сформируй план через ChatGPT ниже.</div>';
  html += '</section><section class="project-section ai-section"><div class="project-section-header"><div><p class="project-kicker">AI PROJECT MANAGER</p><h3>Зафиксировать план</h3></div></div><p class="project-help">Сформируй план в ChatGPT по готовому запросу, затем вставь возвращённый JSON. Система сохранит этапы и будет считать готовность автоматически.</p><button class="project-action" id="prompt-button" type="button">Сформировать запрос для ChatGPT</button><textarea id="prompt-output" rows="10" placeholder="Готовый запрос появится здесь..."></textarea><textarea id="plan-input" rows="12" placeholder="Вставь JSON из ChatGPT..."></textarea><button class="project-action primary" id="import-plan-button" type="button">Импортировать план</button><p class="project-status" id="plan-status"></p></section>';
  detail.innerHTML = html;

  detail.querySelectorAll("[data-task-id]").forEach((input) => input.addEventListener("change", async () => {
    try { await updateTask(input.dataset.taskId, input.checked); await openProject(project.id); }
    catch (error) { alert(error.message); input.checked = !input.checked; }
  }));

  detail.querySelector("#prompt-button").addEventListener("click", async () => {
    const prompt = createChatGptPrompt(project);
    const output = detail.querySelector("#prompt-output");
    output.value = prompt;
    try { await navigator.clipboard.writeText(prompt); } catch {}
    detail.querySelector("#prompt-button").textContent = "Запрос скопирован";
  });

  detail.querySelector("#import-plan-button").addEventListener("click", async () => {
    const status = detail.querySelector("#plan-status");
    try {
      status.textContent = "Импорт...";
      await importPlan(project.id, JSON.parse(detail.querySelector("#plan-input").value));
      status.textContent = "План сохранён.";
      await openProject(project.id);
    } catch (error) { status.textContent = error.message || "Не удалось импортировать план."; }
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
  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      createStatus.textContent = "Создание...";
      const data = new FormData(createForm);
      const project = await createProject({
        name: data.get("name"),
        description: data.get("description"),
        goal: data.get("goal"),
        completionCriteria: data.get("completionCriteria"),
      });
      createForm.reset();
      createStatus.textContent = "Проект создан.";
      renderList(await listProjects());
      await openProject(project.id);
    } catch (error) {\n      console.error("project-create", error);\n      createStatus.textContent = error?.message || error?.details || error?.hint || "Не удалось создать проект.";\n    }
  });
  backButton.addEventListener("click", () => { detailView.hidden = true; listView.hidden = false; renderList(await listProjects()); });
}
init().catch((error) => { projectList.innerHTML = '<div class="project-empty">' + esc(error.message) + '</div>'; });
