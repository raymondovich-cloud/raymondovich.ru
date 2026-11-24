/* Version: 2.18.1 */
/* Updated: 2026-11-24 */
import { renderWorkspaceView } from "../../design-sistem/workspace-view.js";
import { authClient } from "../../infrastructure/supabase/auth-client.js";
import { normalizeTeamInput } from "../../domain/team/team.js";

let profileScrollFrame = 0;
let workspaceMountSequence = 0;
let lastWorkspaceMount = null;
let trashCountdownTimer = 0;

function escapeHtml(value) {
 return String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
 }[character]));
}

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

function installTeamActions(container) {
 if (container.dataset.teamActionsBound === "true") return;
 container.dataset.teamActionsBound = "true";
 container.addEventListener("click", async (event) => {
  const archiveOpen = event.target.closest("[data-team-archive-open]");
  if (archiveOpen) {
   const dialog = container.querySelector("[data-team-archive-dialog]");
   if (dialog && !dialog.open) dialog.showModal();
   return;
  }
  const archiveClose = event.target.closest("[data-team-archive-close]");
  if (archiveClose) {
   const dialog = archiveClose.closest("[data-team-archive-dialog]");
   if (dialog?.open) dialog.close();
   return;
  }
  const archiveDialog = event.target.closest("[data-team-archive-dialog]");
  if (archiveDialog && event.target === archiveDialog) { archiveDialog.close(); return; }
  const cancelInvite = event.target.closest("[data-team-invitation-cancel]");
  if (cancelInvite) {
   cancelInvite.disabled = true;
   try { await authClient.cancelTeamInvitation(cancelInvite.dataset.teamInvitationCancel); if (lastWorkspaceMount) mountWorkspace(container, lastWorkspaceMount.user, currentRoute(), lastWorkspaceMount.profileData); }
   catch (error) { cancelInvite.disabled = false; const feedback = container.querySelector("[data-team-invite-feedback]"); if (feedback) { feedback.textContent = error?.message || "Не удалось отменить приглашение."; feedback.dataset.state = "error"; } }
   return;
  }
  if (event.target.closest("[data-team-invite-open]")) {
   const dialog = container.querySelector("[data-team-invite-dialog]");
   if (dialog && !dialog.open) dialog.showModal();
   return;
  }
  if (event.target.closest("[data-team-invite-close]")) {
   const dialog = event.target.closest("[data-team-invite-dialog]") || container.querySelector("[data-team-invite-dialog]");
   if (dialog?.open) dialog.close();
   return;
  }
  const inviteDialog = event.target.closest("[data-team-invite-dialog]");
  if (inviteDialog && event.target === inviteDialog) inviteDialog.close();
  if (event.target.closest("[data-team-create-open]")) {
   const dialog = container.querySelector("[data-team-create-dialog]");
   if (dialog && !dialog.open) dialog.showModal();
   return;
  }
  if (event.target.closest("[data-team-create-close]")) {
   const dialog = event.target.closest("[data-team-create-dialog]") || container.querySelector("[data-team-create-dialog]");
   if (dialog?.open) dialog.close();
   return;
  }
  const dialog = event.target.closest("[data-team-create-dialog]");
  if (dialog && event.target === dialog) dialog.close();
  if ((event.target.closest("[data-team-retry]") || event.target.closest("[data-team-members-retry]") || event.target.closest("[data-team-invitations-retry]")) && lastWorkspaceMount) {
   mountWorkspace(container, lastWorkspaceMount.user, currentRoute(), lastWorkspaceMount.profileData);
  }
 });
 container.addEventListener("submit", async (event) => {
  const archiveForm = event.target.closest("[data-team-archive-form]");
  if (archiveForm && archiveForm.dataset.submitting !== "true") {
   event.preventDefault();
   const routeParts = currentRoute().split("/");
   const teamId = routeParts[1] ? decodeURIComponent(routeParts[1]) : "";
   if (!teamId) return;
   const feedback = archiveForm.querySelector("[data-team-archive-feedback]");
   const button = archiveForm.querySelector('button[type="submit"]');
   archiveForm.dataset.submitting = "true";
   if (button) { button.disabled = true; button.textContent = "Архивируем…"; }
   if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
   try {
    await authClient.archiveTeam(teamId);
    const dialog = archiveForm.closest("[data-team-archive-dialog]");
    if (dialog?.open) dialog.close();
    window.location.hash = "#team";
   } catch (error) {
    const message = String(error?.message || "");
    if (feedback) {
     feedback.textContent = /Only the Team owner|42501/i.test(message)
      ? "Архивировать команду может только её владелец."
      : message || "Не удалось архивировать команду. Попробуйте ещё раз.";
     feedback.dataset.state = "error";
    }
    archiveForm.dataset.submitting = "false";
    if (button) { button.disabled = false; button.textContent = "Подтвердить архивирование"; }
   }
   return;
  }
  const inviteForm = event.target.closest("[data-team-invite-form]");
  if (inviteForm && inviteForm.dataset.submitting !== "true") {
   event.preventDefault();
   if (!inviteForm.reportValidity()) return;
   const values = Object.fromEntries(new FormData(inviteForm).entries());
   const feedback = inviteForm.querySelector("[data-team-invite-feedback]");
   const button = inviteForm.querySelector('button[type="submit"]');
   inviteForm.dataset.submitting = "true";
   if (button) { button.disabled = true; button.textContent = "Отправляем…"; }
   if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
   try {
    await authClient.inviteToTeam({ teamId: decodeURIComponent(currentRoute().split("/")[1]), username: String(values.username || "").trim().toLowerCase(), role: values.role, message: String(values.message || "").trim() });
    mountWorkspace(container, lastWorkspaceMount.user, currentRoute(), lastWorkspaceMount.profileData);
   } catch (error) {
    const msg = String(error?.message || "");
    if (feedback) { feedback.textContent = /not found|cannot be invited/i.test(msg) ? "Пользователь с таким логином не найден или не может быть приглашён." : /already a Team member/i.test(msg) ? "Этот пользователь уже состоит в команде." : /permission|42501/i.test(msg) ? "Недостаточно прав для выбранной роли." : /limit reached|Wait before resending/i.test(msg) ? "Лимит приглашений достигнут. Попробуйте позже." : msg || "Не удалось отправить приглашение."; feedback.dataset.state = "error"; }
    inviteForm.dataset.submitting = "false";
    if (button) { button.disabled = false; button.textContent = "Отправить приглашение"; }
   }
   return;
  }
  const form = event.target.closest("[data-team-create-form]");
  if (!form || form.dataset.submitting === "true") return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const feedback = form.querySelector("[data-team-create-feedback]");
  const button = form.querySelector('button[type="submit"]');
  form.dataset.submitting = "true";
  if (button) { button.disabled = true; button.textContent = "Создание…"; }
  if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
  try {
   const input = normalizeTeamInput(values);
   const team = await authClient.createTeam(input);
   const dialog = form.closest("[data-team-create-dialog]");
   if (dialog?.open) dialog.close();
   window.location.hash = "team/" + encodeURIComponent(team.id);
  } catch (error) {
   if (feedback) {
    const message = String(error?.message || "");
    feedback.textContent = /42501|entitlement|required/i.test(message)
     ? "Создание команды доступно по подписке. Для владельца экосистемы функция бесплатна."
     : message || "Не удалось создать команду.";
    feedback.dataset.state = "error";
   }
   form.dataset.submitting = "false";
   if (button) { button.disabled = false; button.textContent = "Создать команду"; }
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
function installTrashActions(container) {
 if (container.dataset.trashActionsBound === "true") return;
 container.dataset.trashActionsBound = "true";
 container.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-trash-tab]");
  if (tabButton) {
   const tab = tabButton.dataset.trashTab;
   if (!["projects", "ideas", "teams"].includes(tab)) return;
   container.querySelectorAll("[data-trash-tab]").forEach((button) => {
    const selected = button.dataset.trashTab === tab;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.setAttribute("tabindex", selected ? "0" : "-1");
   });
   container.querySelectorAll(".trash-tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== "trash-panel-" + tab;
   });
   const query = new URLSearchParams(window.location.hash.split("?")[1] || "");
   query.set("tab", tab);
   window.history.replaceState(window.history.state, "", "#trash?" + query.toString());
   return;
  }
  if (event.target.closest("[data-trash-retry]") && lastWorkspaceMount) {
   mountWorkspace(container, lastWorkspaceMount.user, "trash", lastWorkspaceMount.profileData);
   return;
  }
  const restoreButton = event.target.closest("[data-trash-restore]");
  if (restoreButton && !restoreButton.disabled && lastWorkspaceMount) {
   const kind = restoreButton.dataset.trashRestore;
   const id = restoreButton.dataset.trashId;
   if (!id || !["project", "team"].includes(kind)) return;
   restoreButton.disabled = true;
   restoreButton.textContent = "Восстанавливаем…";
   try {
    if (kind === "project") await authClient.restoreProject(id);
    else await authClient.restoreTeam(id);
    mountWorkspace(container, lastWorkspaceMount.user, "trash", lastWorkspaceMount.profileData);
   } catch (error) {
    restoreButton.disabled = false;
    restoreButton.textContent = "Восстановить";
    const feedback = container.querySelector("[data-trash-feedback]");
    if (feedback) {
     feedback.textContent = /permission|42501/i.test(String(error?.message || ""))
      ? "Недостаточно прав для восстановления этого объекта."
      : error?.message || "Не удалось восстановить объект.";
     feedback.dataset.state = "error";
    }
   }
   return;
  }
  const openButton = event.target.closest("[data-trash-delete-open]");
  if (openButton) {
   const dialog = container.querySelector("[data-trash-delete-dialog]");
   const form = dialog?.querySelector("[data-trash-delete-form]");
   if (!dialog || !form) return;
   form.reset();
   form.elements.kind.value = openButton.dataset.trashKind || "";
   form.elements.id.value = openButton.dataset.trashId || "";
   const title = dialog.querySelector("[data-trash-delete-title]");
   const description = dialog.querySelector("[data-trash-delete-description]");
   if (title) title.textContent = "Удалить навсегда?";
   const detail = openButton.dataset.trashKind === "project"
    ? "Проект, все его подпроекты и связанные рабочие данные будут удалены."
    : "Команда, её состав и приглашения будут удалены.";
   if (description) description.textContent = "«" + (openButton.dataset.trashName || "объект") + "». " + detail + " Неизменяемые записи аудита сохраняются в системном журнале. Для подтверждения введите пароль от аккаунта.";
   const feedback = form.querySelector("[data-trash-delete-feedback]");
   if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
   dialog.showModal();
   form.querySelector('input[name="password"]')?.focus();
   return;
  }
  const closeButton = event.target.closest("[data-trash-delete-close]");
  if (closeButton) {
   const dialog = closeButton.closest("[data-trash-delete-dialog]");
   if (dialog?.open) dialog.close();
   dialog?.querySelector("[data-trash-delete-form]")?.reset();
   return;
  }
  const dialog = event.target.closest("[data-trash-delete-dialog]");
  if (dialog && event.target === dialog) {
   dialog.close();
   dialog.querySelector("[data-trash-delete-form]")?.reset();
  }
 });
 container.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-trash-delete-form]");
  if (!form || form.dataset.submitting === "true" || !lastWorkspaceMount) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const kind = form.elements.kind.value;
  const id = form.elements.id.value;
  const password = form.elements.password.value;
  if (!id || !["project", "team"].includes(kind)) return;
  const button = form.querySelector('button[type="submit"]');
  const feedback = form.querySelector("[data-trash-delete-feedback]");
  form.dataset.submitting = "true";
  if (button) { button.disabled = true; button.textContent = "Удаляем…"; }
  if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
  try {
   if (kind === "project") await authClient.permanentlyDeleteProject({ projectId: id, password });
   else await authClient.permanentlyDeleteTeam({ teamId: id, password });
   const dialog = form.closest("[data-trash-delete-dialog]");
   if (dialog?.open) dialog.close();
   mountWorkspace(container, lastWorkspaceMount.user, "trash", lastWorkspaceMount.profileData);
  } catch (error) {
   const message = String(error?.message || "");
   if (feedback) {
    feedback.textContent = /invalid login credentials|invalid_credentials|wrong password/i.test(message)
     ? "Неверный пароль. Проверьте ввод и попробуйте ещё раз."
     : /Recent password confirmation required/i.test(message)
      ? "Не удалось подтвердить пароль. Повторите попытку."
      : /Only the (project|Team) owner|42501/i.test(message)
       ? "Полное удаление доступно только владельцу объекта."
       : /must be archived|not archived/i.test(message)
        ? "Сначала переместите объект в корзину."
        : message || "Не удалось удалить объект. Попробуйте ещё раз.";
    feedback.dataset.state = "error";
   }
   form.querySelector('input[name="password"]')?.focus();
   form.querySelector('input[name="password"]')?.select();
   form.dataset.submitting = "false";
   if (button) { button.disabled = false; button.textContent = "Удалить навсегда"; }
  }
 });
}
function stopTrashCountdown() {
 if (trashCountdownTimer) window.clearInterval(trashCountdownTimer);
 trashCountdownTimer = 0;
}

function installTrashCountdown(container) {
 stopTrashCountdown();
 const update = () => {
  if (currentRoute() !== "trash") { stopTrashCountdown(); return; }
  container.querySelectorAll("[data-trash-countdown][data-deadline]").forEach((element) => {
   const deadline = Number(element.dataset.deadline);
   if (!Number.isFinite(deadline)) return;
   const remaining = Math.max(0, deadline - Date.now());
   if (remaining === 0) {
    element.textContent = "Срок хранения истёк. Удаление выполняется автоматически.";
    return;
   }
   const days = Math.floor(remaining / 86400000);
   const hours = Math.floor((remaining % 86400000) / 3600000);
   const minutes = Math.floor((remaining % 3600000) / 60000);
   element.textContent = "Удаление через " + (days ? days + " дн. " : "") + hours + " ч. " + minutes + " мин.";
  });
 };
 update();
 if (container.querySelector("[data-trash-countdown][data-deadline]")) {
  trashCountdownTimer = window.setInterval(update, 30000);
 }
}

async function loadTelegramLinkStatus(container) {
 const target = container.querySelector("[data-telegram-link-status]");
 const button = container.querySelector(".profile-telegram-icon-button");
 if (!target || !button) return;
 target.textContent = "Проверяем подключение Telegram…";
 button.disabled = true;
 try {
  const status = await authClient.getTelegramLinkStatus();
  if (status?.linked) {
   button.removeAttribute("data-telegram-link-start");
   button.setAttribute("data-telegram-link-unlink", "");
   button.setAttribute("aria-label", "Отключить Telegram");
   button.title = "Telegram подключён" + (status.username ? " · @" + status.username : "") + ". Нажмите, чтобы отключить.";
   target.textContent = "Telegram подключён" + (status.username ? " · @" + status.username : "") + ".";
  } else {
   button.removeAttribute("data-telegram-link-unlink");
   button.setAttribute("data-telegram-link-start", "");
   button.setAttribute("aria-label", "Подключить Telegram");
   button.title = "Подключить Telegram";
   target.textContent = "Telegram не подключён. После подключения бот сможет отправлять личные уведомления.";
  }
  button.disabled = false;
 } catch (error) {
  const message = error?.message || "ошибка запроса";
  target.textContent = "Не удалось проверить подключение Telegram: " + message;
  button.title = "Не удалось проверить Telegram: " + message + ". Нажмите, чтобы повторить попытку.";
  button.disabled = false;
 }
}

function currentRoute() {
 return window.location.hash.replace(/^#/, "").split("?")[0] || "home";
}

function loadNotifications(container) {
 const list = container.querySelector("[data-notification-list]");
 if (!list) return Promise.resolve();
 list.innerHTML = '<p class="notification-center-muted">Загружаем уведомления…</p>';
 return authClient.getNotifications().then((result) => {
  const items = Array.isArray(result?.items) ? result.items : [];
  const unread = Number(result?.unread_count || 0);
  const bell = document.querySelector("[data-workspace-notifications]");
  if (bell) {
   bell.dataset.unreadCount = String(unread);
   bell.setAttribute("aria-label", unread ? "Уведомления, непрочитанных: " + unread : "Уведомления");
   bell.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path></svg>' + (unread ? '<span class="notification-unread-badge">' + (unread > 99 ? "99+" : unread) + '</span>' : '');
  }
  if (!items.length) { list.innerHTML = '<div class="notification-center-empty"><strong>Пока нет уведомлений</strong><p>Здесь появятся приглашения и другие события экосистемы.</p></div>'; return; }
  list.innerHTML = items.map((item) => {
   const p = item.payload || {};
   const expiredInvite = item.type === "team.invitation" && p.expires_at && new Date(p.expires_at).getTime() <= Date.now();
   const activeInvite = item.type === "team.invitation" && !item.resolved_at && !expiredInvite;
   const expiry = p.expires_at ? new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"long",year:"numeric"}).format(new Date(p.expires_at)) : "";
   const role = ({admin:"Администратор",manager:"Менеджер",member:"Участник"})[p.requested_role] || "Участник";
   return '<article class="notification-card' + (!item.read_at ? ' is-unread' : '') + '"><div class="notification-card-copy"><div class="notification-card-topline"><strong>' + escapeHtml(item.title || "Уведомление") + '</strong><time>' + escapeHtml(new Intl.DateTimeFormat("ru-RU", {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(item.created_at))) + '</time></div><p>' + escapeHtml(item.body || "") + '</p>' + (p.message ? '<blockquote>' + escapeHtml(p.message) + '</blockquote>' : '') + (activeInvite ? '<small>Роль: ' + escapeHtml(role) + (expiry ? ' · действует до ' + escapeHtml(expiry) : '') + '</small>' : '') + (expiredInvite ? '<small>Срок приглашения истёк</small>' : '') + (item.resolved_at ? '<small>Приглашение обработано</small>' : '') + '</div><div class="notification-card-actions">' + (activeInvite ? '<button class="settings-primary-button" type="button" data-notification-action="accept" data-notification-id="' + escapeHtml(p.invitation_id) + '">Принять</button><button class="settings-secondary-button" type="button" data-notification-action="decline" data-notification-id="' + escapeHtml(p.invitation_id) + '">Отклонить</button>' : (!item.read_at ? '<button class="team-invitation-cancel" type="button" data-notification-mark-read="' + escapeHtml(item.id) + '">Отметить прочитанным</button>' : '')) + '</div></article>';
  }).join("") + '<p class="settings-form-feedback" data-notification-feedback role="status" aria-live="polite"></p>';
 }).catch((error) => { list.innerHTML = '<div class="notification-center-empty"><strong>Не удалось загрузить уведомления</strong><p>' + escapeHtml(error?.message || "Проверьте подключение и попробуйте ещё раз.") + '</p><button class="project-secondary-button" type="button" data-notification-retry>Повторить</button></div>'; });
}

export function mountWorkspace(container, user, section = "projects", profileData = null) {
 stopTrashCountdown();
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
 installTeamActions(container);
 installTrashActions(container);
 if (container.dataset.notificationActionsBound !== "true") {
  container.dataset.notificationActionsBound = "true";
  container.addEventListener("click", async (event) => {
   if (event.target.closest("[data-telegram-link-retry]")) { loadTelegramLinkStatus(container); return; }
   if (event.target.closest("[data-telegram-link-start]")) {
    const button = event.target.closest("[data-telegram-link-start]");
    button.disabled = true;
    let telegramWindow = null;
    try {
     const telegramWebApp = window.Telegram?.WebApp;
     const initData = typeof telegramWebApp?.initData === "string" ? telegramWebApp.initData.trim() : "";
     if (initData) {
      telegramWebApp.ready?.();
      await authClient.connectTelegramMiniApp(initData);
      await loadTelegramLinkStatus(container);
      return;
     }
     telegramWindow = window.open("about:blank", "_blank");
     if (!telegramWindow) throw new Error("Браузер заблокировал новое окно. Разрешите открытие ссылок и повторите.");
     const result = await authClient.startTelegramLink();
     if (!result?.url) throw new Error("Сервис не вернул ссылку для подключения.");
     telegramWindow.location.href = result.url;
    } catch (error) {
     if (telegramWindow && !telegramWindow.closed) telegramWindow.close();
     const feedback = container.querySelector("[data-telegram-link-feedback]");
     if (feedback) feedback.textContent = error?.message || "Не удалось создать ссылку.";
     button.disabled = false;
    }
    return;
   }
   if (event.target.closest("[data-telegram-link-unlink]")) {
    const button = event.target.closest("[data-telegram-link-unlink]");
    if (!window.confirm("Отключить Telegram от аккаунта Raymondovich?")) return;
    button.disabled = true;
    try {
     await authClient.unlinkTelegram();
     await loadTelegramLinkStatus(container);
    } catch (error) {
     const feedback = container.querySelector("[data-telegram-link-feedback]");
     if (feedback) feedback.textContent = error?.message || "Не удалось отключить Telegram.";
     button.disabled = false;
    }
    return;
   }
   if (event.target.closest("[data-notification-retry]")) { if (currentRoute() === "profile") loadTelegramLinkStatus(container);
 loadNotifications(container); return; }
   const dialog = event.target.closest("[data-notification-center]");
   if (dialog && event.target === dialog) { dialog.close(); return; }
   if (event.target.closest("[data-notification-center-close]")) { if (dialog?.open) dialog.close(); return; }
   const action = event.target.closest("[data-notification-action]");
   if (action) {
    action.disabled = true;
    try {
     if (action.dataset.notificationAction === "accept") await authClient.acceptTeamInvitation(action.dataset.notificationId);
     else await authClient.declineTeamInvitation(action.dataset.notificationId);
     await loadNotifications(container);
     if (lastWorkspaceMount && /^team(?:\/|$)/.test(currentRoute())) mountWorkspace(container, lastWorkspaceMount.user, currentRoute(), lastWorkspaceMount.profileData);
    } catch (error) { action.disabled = false; const feedback = container.querySelector("[data-notification-feedback]"); if (feedback) { feedback.textContent = error?.message || "Не удалось обработать приглашение."; feedback.dataset.state = "error"; } }
    return;
   }
   const mark = event.target.closest("[data-notification-mark-read]");
   if (mark) { try { await authClient.markNotificationRead(mark.dataset.notificationMarkRead); await loadNotifications(container); } catch (error) { const feedback = container.querySelector("[data-notification-feedback]"); if (feedback) feedback.textContent = error?.message || "Не удалось отметить уведомление."; } }
  });
 }
 const bell = document.querySelector("[data-workspace-notifications]");
 if (bell && bell.dataset.notificationBound !== "true") { bell.dataset.notificationBound = "true"; bell.addEventListener("click", () => { const panel = container.querySelector("[data-notification-center]"); if (panel && !panel.open) panel.showModal(); loadNotifications(container); }); }
 loadNotifications(container);
 syncProfileIdentityCard();

 if (section === "profile") {
  if (container.dataset.telegramRefreshBound !== "true") {
   container.dataset.telegramRefreshBound = "true";
   const refreshTelegramStatus = () => {
    if (document.visibilityState === "visible" && currentRoute() === "profile" && container.isConnected) {
     loadTelegramLinkStatus(container);
    }
   };
   document.addEventListener("visibilitychange", refreshTelegramStatus);
   window.addEventListener("pageshow", refreshTelegramStatus);
   window.addEventListener("focus", refreshTelegramStatus);
  }
  loadTelegramLinkStatus(container);
  return;
 }

 const needsTeams = section === "team" || /^team\/[0-9a-f-]{36}(?:\/(?:information|settings))?$/i.test(section);
 if (needsTeams) {
  const teamId = section.startsWith("team/") ? decodeURIComponent(section.split("/")[1]) : null;
  const load = teamId ? authClient.getTeam(teamId).then(async (team) => {
   let membersState = { status: "hidden", members: [] };
   let invitationsState = { status: "hidden", invitations: [] };
   if (section === "team/" + teamId) {
    membersState = { status: "loading", members: [] };
    try { const payload = await authClient.getTeamMembers(teamId); membersState = { status: "ready", members: Array.isArray(payload) ? payload : Array.isArray(payload?.members) ? payload.members : [] }; }
    catch (error) { membersState = { status: "error", message: error?.message || "Не удалось загрузить участников." }; }
    if (["owner", "admin", "manager"].includes(team.role)) {
     invitationsState = { status: "loading", invitations: [] };
     try { const payload = await authClient.getTeamInvitations(teamId); invitationsState = { status: "ready", invitations: Array.isArray(payload) ? payload : Array.isArray(payload?.invitations) ? payload.invitations : [] }; }
     catch (error) { invitationsState = { status: "error", message: error?.message || "Не удалось загрузить приглашения." }; }
    }
   }
   return { status: "ready", team, membersState, invitationsState };
  }) : authClient.getTeams().then((payload) => ({ status: "ready", teams: Array.isArray(payload) ? payload : Array.isArray(payload?.teams) ? payload.teams : [] }));
  load.then((state) => {
   if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
   renderWorkspaceView(container, user, section, profileData, state);
   syncProfileIdentityCard();
  }).catch((error) => {
   if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
   renderWorkspaceView(container, user, section, profileData, { status: "error", message: error?.message || "Не удалось загрузить команды." });
  });
  return;
 }

 if (section === "trash") {
  Promise.all([authClient.getArchivedProjects(), authClient.getArchivedTeams()]).then(([projectPayload, teamPayload]) => {
   if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
   const projects = Array.isArray(projectPayload?.projects) ? projectPayload.projects : [];
   const teams = Array.isArray(teamPayload) ? teamPayload : Array.isArray(teamPayload?.teams) ? teamPayload.teams : [];
   renderWorkspaceView(container, user, section, profileData, { status: "ready", projects, teams });
   installTrashCountdown(container);
  }).catch((error) => {
   if (sequence !== workspaceMountSequence || currentRoute() !== section) return;
   renderWorkspaceView(container, user, section, profileData, { status: "error", message: error?.message || "Не удалось загрузить корзину." });
  });
  return;
 }

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
