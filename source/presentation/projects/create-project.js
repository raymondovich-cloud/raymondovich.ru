// version 1.1
import { getSession, getRole } from "../../application/auth/authentication.js";
import { createChatGptPrompt, createProject, importPlan } from "../../application/projects/project-service.js";

const form = document.querySelector("#create-project-form");
const button = form?.querySelector(".project-action.primary");
const status = document.querySelector("#create-status");
const promptButton = document.querySelector("#create-prompt-button");
const promptOutput = document.querySelector("#create-prompt-output");
const planInput = document.querySelector("#create-plan-input");
const fixPlanButton = document.querySelector("#fix-plan-button");

function getFormValues() {
  return {
    name: form.querySelector('[name="name"]').value.trim(),
    description: form.querySelector('[name="description"]').value.trim(),
    goal: form.querySelector('[name="goal"]').value.trim(),
    completionCriteria: form.querySelector('[name="completionCriteria"]').value.trim(),
  };
}

promptButton?.addEventListener("click", async () => {
  const values = getFormValues();
  if (!values.name || !values.completionCriteria) {
    status.textContent = "Сначала укажи название проекта и критерии 100%.";
    return;
  }

  const prompt = createChatGptPrompt({
    name: values.name,
    description: values.description,
    goal: values.goal,
    completion_criteria: values.completionCriteria,
  });
  promptOutput.value = prompt;
  try { await navigator.clipboard.writeText(prompt); } catch {}
  promptButton.textContent = "Запрос скопирован";
});

if (button) {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const session = await getSession();
      if (!session || getRole(session) !== "admin") {
        status.textContent = "Нет прав для создания проекта.";
        return;
      }

      button.disabled = true;
      status.textContent = "Создание проекта и автоматическая сборка карты...";

      const project = await createProject({
        name: form.querySelector('[name="name"]').value,
        description: form.querySelector('[name="description"]').value,
        goal: form.querySelector('[name="goal"]').value,
        completionCriteria: form.querySelector('[name="completionCriteria"]').value,
      });

      form.querySelectorAll("input, textarea").forEach((field) => { field.value = ""; });
      status.textContent = "Проект создан. Автоматическая карта готова.";
      window.location.href = "./projects.html?project=" + encodeURIComponent(project.id);
    } catch (error) {
      status.textContent = error?.message || error?.details || error?.hint || "Не удалось создать проект.";
    } finally {
      button.disabled = false;
    }
  }, true);
}


const createToggle = document.querySelector("#create-project-toggle");
const createContent = document.querySelector("#create-project-content");

if (createToggle && createContent) {
  createToggle.addEventListener("click", () => {
    const expanded = createToggle.getAttribute("aria-expanded") === "true";
    createToggle.setAttribute("aria-expanded", String(!expanded));
    createContent.hidden = expanded;
  });
}


fixPlanButton?.addEventListener("click", async () => {
  const values = getFormValues();

  try {
    const planText = planInput.value.trim();
    if (!values.name || !values.completionCriteria) {
      throw new Error("Сначала укажи название проекта и критерии 100%.");
    }
    if (!planText) {
      throw new Error("Вставь JSON-план из ChatGPT.");
    }

    const plan = JSON.parse(planText);
    fixPlanButton.disabled = true;
    button.disabled = true;
    status.textContent = "Создание проекта и фиксация AI-плана...";

    const project = await createProject(values);
    await importPlan(project.id, plan);

    form.querySelectorAll("input, textarea").forEach((field) => { field.value = ""; });
    status.textContent = "План зафиксирован. Проект создан.";
    window.location.href = "./projects.html?project=" + encodeURIComponent(project.id);
  } catch (error) {
    status.textContent = error?.message || "Не удалось зафиксировать план.";
    fixPlanButton.disabled = false;
    button.disabled = false;
  }
});
