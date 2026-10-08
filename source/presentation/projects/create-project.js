// version 1.1
import { getSession, getRole } from "../../application/auth/authentication.js";
import { createProject } from "../../application/projects/project-service.js";

const form = document.querySelector("#create-project-form");
const button = form?.querySelector("button[type=\"button\"]");
const status = document.querySelector("#create-status");

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
