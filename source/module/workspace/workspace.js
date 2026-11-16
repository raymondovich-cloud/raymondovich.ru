/* Version: 2.1.0 */
/* Updated: 2026-11-16 */
import { renderWorkspaceView } from "../../design-sistem/workspace-view.js";
import { authClient } from "../../infrastructure/supabase/auth-client.js";

let profileScrollFrame = 0;
let workspaceMountSequence = 0;
let lastWorkspaceMount = null;

function syncProfileIdentityCard() {
 const card = document.querySelector(".profile-identity-card");
 if (!card) return;
 const isCollapsed = card.classList.contains("is-collapsed");
 const shouldCollapse = isCollapsed ? window.scrollY > 20 : window.scrollY > 64;
 card.classList.toggle("is-collapsed", shouldCollapse);
}

function installProfileScrollBehavior() {
 if (window.__raymondovichProfileScrollInstalled) return;
 window.__raymondovichProfileScrollInstalled = true;
 window.addEventListener("scroll", () => {
  if (profileScrollFrame) return;
  profileScrollFrame = window.requestAnimationFrame(() => {
   profileScrollFrame = 0;
   syncProfileIdentityCard();
  });
 }, { passive: true });
}

function installProjectRetry(container) {
 if (container.dataset.projectRetryBound === "true") return;
 container.dataset.projectRetryBound = "true";
 container.addEventListener("click", (event) => {
  if (!event.target.closest("[data-project-retry]") || !lastWorkspaceMount) return;
  const { user, profileData } = lastWorkspaceMount;
  mountWorkspace(container, user, "projects", profileData);
 });
}

function installProjectMemberActions(container) {
 if (container.dataset.projectMemberActionsBound === "true") return;
 container.dataset.projectMemberActionsBound = "true";
 container.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-project-member-open]");
  if (openButton) {
   const dialog = container.querySelector("[data-project-member-dialog]");
   if (dialog && !dialog.open) dialog.showModal();
   return;
  }
  if (event.target.closest("[data-project-member-close]")) {
   const dialog = event.target.closest("[data-project-member-dialog]");
   if (dialog?.open) dialog.close();
   return;
  }
  const dialog = event.target.closest("[data-project-member-dialog]");
  if (dialog && event.target === dialog) {
   dialog.close();
   return;
  }
  if (!event.target.closest("[data-project-members-retry]") || !lastWorkspaceMount) return;
  const { user, profileData } = lastWorkspaceMount;
  mountWorkspace(container, user, currentRoute(), profileData);
 });
 container.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-project-member-form]");
  if (!form || form.dataset.submitting === "true") return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const route = currentRoute();
  const projectId = decodeURIComponent(route.split("/")[1]);
  const feedback = form.querySelector("[data-project-member-feedback]");
  const button = form.querySelector('button[type="submit"]');
  form.dataset.submitting = "true";
  if (button) { button.disabled = true; button.textContent = "Добавление…"; }
  if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
  try {
   await authClient.addProjectMember({
    projectId,
    username: new FormData(form).get("username"),
    roleId: new FormData(form).get("role_id")
   });
   mountWorkspace(container, lastWorkspaceMount.user, route, lastWorkspaceMount.profileData);
  } catch (error) {
   if (feedback) {
    const message = error?.message || "";
    feedback.textContent = /User with this username was not found/i.test(message) ? "Пользователь с таким логином не найден." :
     /already a project member/i.test(message) ? "Этот пользователь уже состоит в проекте." :
     /permission|42501/i.test(message) ? "Недостаточно прав для добавления участника или назначения этой роли." :
     message || "Не удалось добавить участника.";
    feedback.dataset.state = "error";
   }
   form.dataset.submitting = "false";
   if (button) { button.disabled = false; button.textContent = "Добавить участника"; }
  }
 });
}

function installProjectDeleteActions(container) {
 if (container.dataset.projectDeleteActionsBound === "true") return;
 container.dataset.projectDeleteActionsBound = "true";

 container.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-project-delete-open]");
  if (openButton) {
   const dialog = container.querySelector("[data-project-delete-dialog]");
   if (dialog && !dialog.open) {
    dialog.showModal();
    dialog.querySelector('input[name="password"]')?.focus();
   }
   return;
  }

  const closeButton = event.target.closest("[data-project-delete-close]");
  if (closeButton) {
   const dialog = closeButton.closest("[data-project-delete-dialog]");
   if (dialog?.open) {
    dialog.close();
    dialog.querySelector("[data-project-delete-form]")?.reset();
   }
   return;
  }

  const dialog = event.target.closest("[data-project-delete-dialog]");
  if (dialog && event.target === dialog) {
   dialog.close();
   dialog.querySelector("[data-project-delete-form]")?.reset();
  }
 });

 container.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-project-delete-form]");
  if (!form || form.dataset.submitting === "true") return;
  event.preventDefault();
  if (!form.reportValidity()) return;

  const route = currentRoute();
  const routeParts = route.split("/");
  if (routeParts[0] !== "projects" || !routeParts[1] || routeParts[1] === "create") return;

  const projectId = decodeURIComponent(routeParts[1]);
  const feedback = form.querySelector("[data-project-delete-feedback]");
  const button = form.querySelector('button[type="submit"]');
  const password = new FormData(form).get("password");

  form.dataset.submitting = "true";
  if (button) {
   button.disabled = true;
   button.textContent = "Проверяем пароль…";
  }
  if (feedback) {
   feedback.textContent = "";
   feedback.dataset.state = "";
  }

  try {
   await authClient.deleteProject({ projectId, password });
   const dialog = form.closest("[data-project-delete-dialog]");
   if (dialog?.open) dialog.close();
   window.location.hash = "#projects";
  } catch (error) {
   const message = String(error?.message || "");
   if (feedback) {
    feedback.textContent = /invalid login credentials|invalid_credentials|wrong password/i.test(message)
     ? "Неверный пароль. Проверьте ввод и попробуйте ещё раз."
     : /Recent password confirmation required/i.test(message)
      ? "Не удалось подтвердить пароль. Повторите попытку."
      : /Only the project owner|42501/i.test(message)
       ? "Удалить проект может только его владелец."
       : message || "Не удалось удалить проект. Попробуйте ещё раз.";
    feedback.dataset.state = "error";
   }
   form.querySelector('input[name="password"]')?.focus();
   form.querySelector('input[name="password"]')?.select();
   form.dataset.submitting = "false";
   if (button) {
    button.disabled = false;
    button.textContent = "Подтвердить удаление";
   }
  }
 });
}

function installPublicProfileActions(container) {
 if (container.dataset.publicProfileActionsBound === "true") return;
 container.dataset.publicProfileActionsBound = "true";
 container.addEventListener("click", async (event) => {
  const openButton = event.target.closest("[data-public-profile-open]");
  if (openButton) { const dialog = container.querySelector("[data-public-profile-dialog]"); if (dialog && !dialog.open) dialog.showModal(); return; }
  const closeButton = event.target.closest("[data-public-profile-close]");
  if (closeButton) { const dialog = closeButton.closest("[data-public-profile-dialog]"); if (dialog?.open) dialog.close(); return; }
  const dialog = event.target.closest("[data-public-profile-dialog]");
  if (dialog && event.target === dialog) { dialog.close(); return; }
  const shareButton = event.target.closest("[data-public-profile-share]");
  if (!shareButton) return;
  const username = shareButton.dataset.username;
  if (!username) return;
  const url = new URL("/#profile/" + encodeURIComponent(username), window.location.origin).toString();
  const feedback = container.querySelector("[data-public-profile-share-feedback]");
  shareButton.disabled = true;
  try {
   if (navigator.share) await navigator.share({ title: "Профиль в Raymondovich", text: "Мой публичный профиль в экосистеме Raymondovich", url });
   else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); if (feedback) { feedback.textContent = "Ссылка скопирована."; feedback.dataset.state = "success"; } }
   else if (feedback) { feedback.textContent = url; feedback.dataset.state = "success"; }
  } catch (error) {
   if (error?.name !== "AbortError" && feedback) { feedback.textContent = "Не удалось открыть меню отправки. Скопируйте ссылку выше."; feedback.dataset.state = "error"; }
  } finally { shareButton.disabled = false; }
 });
}
function currentRoute() {
 return window.location.hash.replace(/^#/, "").split("?")[0] || "home";
}

export function mountWorkspace(container, user, section = "projects", profileData = null) {
 const sequence = ++workspaceMountSequence;
 lastWorkspaceMount = { user, profileData };
 renderWorkspaceView(
  container,
  user,
  section,
  profileData,
  (section === "projects" || section.startsWith("projects/") || section === "profile/settings/public-info") ? { status: "loading" } : null
 );
 installProfileScrollBehavior();
 installProjectRetry(container);
 installProjectMemberActions(container);
 installProjectDeleteActions(container);
 installPublicProfileActions(container);
 syncProfileIdentityCard();

 const needsProjects = section === "projects" || section.startsWith("projects/") || section === "profile/settings/public-info";
 if (!needsProjects) return;

 authClient.getProjects().then(async (payload) => {
  if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  if (section === "profile/settings/public-info") {
   renderWorkspaceView(container, user, section, profileData, { status: "ready", projects: projects.filter((project) => project.role === "owner" && project.status === "active") });
  } else if (section.startsWith("projects/")) {
   const projectId = decodeURIComponent(section.split("/")[1]);
   const project = projects.find((item) => String(item.id) === projectId) || null;
   let membersData = { status: "ready", members: [], roles: [], can_invite: false };
   if (project) {
    try {
     membersData = { status: "ready", ...(await authClient.getProjectMembers(projectId)) };
    } catch (error) {
     membersData = { status: "error", message: error?.message || "Не удалось загрузить участников." };
    }
   }
   if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
   renderWorkspaceView(container, user, section, profileData, { status: "ready", project, membersData });
  } else {
   renderWorkspaceView(container, user, section, profileData, { status: "ready", projects });
  }
  syncProfileIdentityCard();
 }).catch((error) => {
  if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
  renderWorkspaceView(container, user, section, profileData, {
   status: "error",
   message: error?.message || "Не удалось получить список проектов."
  });
 });
}
