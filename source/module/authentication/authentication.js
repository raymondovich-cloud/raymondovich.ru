/* Version: 1.7.0 */
/* Updated: 2026-11-16 */

import { authClient } from "../../infrastructure/supabase/auth-client.js";
import { mountWorkspace } from "../workspace/workspace.js";
import {
  renderAuthenticationView,
  renderAuthenticatedView,
  setAuthenticationMessage,
  setAuthenticationLoading,
} from "../../design-sistem/authentication-view.js";

const root = document.querySelector("[data-auth-root]");
const statusPanel = document.querySelector(".status-panel");
const pageMain = document.querySelector(".page-main");
const backButton = document.querySelector("[data-page-back]");
const workspaceActions = document.querySelector("[data-workspace-actions]");

if (root && pageMain) {
  const validModes = new Set(["login", "register", "forgot-password", "reset-password"]);
  const workspaceRoutes = new Set(["projects/create", "projects", "ideas", "team", "tools", "profile", "profile/active-projects", "profile/ecosystem-tools", "profile/settings", "profile/settings/personal-data", "profile/settings/privacy", "profile/settings/appearance", "profile/settings/cryptography"]);
  const isProjectDetailRoute = (route) => /^projects\/[0-9a-f-]{36}(?:\/(?:information|settings))?$/i.test(route);
  let currentMode = "login";
  let busy = false;

  function setRoute(mode) {
    currentMode = mode;
    const isAuthRoute = validModes.has(mode);
    const isWorkspaceRoute = mode === "account" || workspaceRoutes.has(mode) || isProjectDetailRoute(mode);
    root.hidden = !(isAuthRoute || isWorkspaceRoute);
    if (statusPanel) statusPanel.hidden = isAuthRoute || isWorkspaceRoute;
    document.body.dataset.appState = isWorkspaceRoute ? "workspace" : "public";
    if (workspaceActions) workspaceActions.hidden = !isWorkspaceRoute;

    if (isWorkspaceRoute) {
      authClient.getUser().then(async (user) => {
        if (!user) {
          window.location.hash = "login";
          return;
        }
        if (mode === "account") {
          window.location.hash = "projects";
          return;
        }
        const profileData = await authClient.getProfile().catch(() => null);
        mountWorkspace(root, user, mode, profileData);
      }).catch(() => {
        window.location.hash = "login";
      });
      return;
    }
    if (!isAuthRoute) return;
    renderAuthenticationView(root, mode);
  }

  const brandLink = document.querySelector(".brand");
  brandLink?.addEventListener("click", (event) => {
    if (document.body.dataset.appState !== "workspace") return;
    event.preventDefault();
    if (window.location.hash !== "#projects") {
      window.location.hash = "projects";
    }
  });

  backButton?.addEventListener("click", () => {
    const route = window.location.hash.replace(/^#/, "").split("?")[0];
    const fallbackRoute = route.startsWith("profile/") ? "profile" : "home";
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = fallbackRoute;
    }
  });

  function showMessage(message, kind = "info") {
    setAuthenticationMessage(root, message, kind);
  }

  function normalizeError(error) {
    const message = error?.message || "";
    if (/already registered|already been registered|user already exists/i.test(message)) {
      return "Этот адрес электронной почты уже зарегистрирован.";
    }
    if (/password should be at least|weak password/i.test(message)) {
      return "Пароль слишком простой. Используйте не менее 8 символов.";
    }
    if (/username|duplicate key|unique constraint/i.test(message)) {
      return "Этот логин уже занят или имеет недопустимый формат.";
    }
    if (/invalid login credentials/i.test(message)) {
      return "Неверный логин или пароль.";
    }
    if (/email not authorized/i.test(message)) {
      return "Отправка писем пока не настроена для этого адреса. Проверьте SMTP в Supabase.";
    }
    return message || "Не удалось выполнить операцию. Попробуйте позже.";
  }

  function parseRedirectSession() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const errorDescription = params.get("error_description");

    if (errorDescription) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.hash = "login";
      window.setTimeout(() => {
        renderAuthenticationView(root, "login", errorDescription.replaceAll("+", " "), "error");
      }, 0);
      return;
    }

    if (!accessToken || !refreshToken) return;

    authClient.acceptRedirectSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number(params.get("expires_in") || 3600),
      token_type: params.get("token_type") || "bearer",
    });

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (type === "recovery") {
      window.location.hash = "reset-password";
    } else {
      window.location.hash = "account";
    }
  }

  root.addEventListener("change", (event) => {
    if (event.target.matches('[name="project_type"]')) {
      const group = root.querySelector("[data-project-components]");
      if (!group) return;
      const online = event.target.value === "online";
      group.hidden = !online;
      if (!online) group.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = false; });
    }
  });

  root.addEventListener("submit", async (event) => {
    const projectForm = event.target.closest("[data-project-create-form]");
    if (!projectForm || busy) return;
    event.preventDefault();
    if (!projectForm.reportValidity()) return;

    const values = Object.fromEntries(new FormData(projectForm).entries());
    const componentCodes = [...projectForm.querySelectorAll('[name="component_codes"]:checked')].map((input) => input.value);
    const feedback = projectForm.querySelector("[data-project-feedback]");
    const submitButton = projectForm.querySelector('button[type="submit"]');
    busy = true;
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Создание…"; }
    if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }

    try {
      const project = await authClient.createProject({
        name: values.project_name,
        description: values.project_description,
        projectType: values.project_type,
        componentCodes,
      });
      const panel = document.createElement("section");
      panel.className = "project-create-success";
      const heading = document.createElement("h2");
      heading.textContent = "Проект создан";
      const name = document.createElement("p");
      name.textContent = project?.name || String(values.project_name).trim();
      const detail = document.createElement("p");
      detail.textContent = "Проект сохранён в Raymondovich. Вы назначены его владельцем.";
      const identifier = document.createElement("small");
      identifier.textContent = "ID проекта: " + (project?.id || "не получен");
      const back = document.createElement("a");
      back.className = "project-primary-button";
      back.href = "#projects";
      back.textContent = "Вернуться к проектам";
      panel.append(heading, name, detail, identifier, back);
      projectForm.replaceWith(panel);
    } catch (error) {
      if (feedback) {
        feedback.textContent = normalizeError(error);
        feedback.dataset.state = "error";
      }
    } finally {
      busy = false;
      const currentButton = root.querySelector('[data-project-create-form] button[type="submit"]');
      if (currentButton) { currentButton.disabled = false; currentButton.textContent = "Создать проект"; }
    }
  });

  root.addEventListener("submit", async (event) => {
    const settingsForm = event.target.closest("[data-profile-settings-form]");
    if (!settingsForm || busy) return;
    event.preventDefault();
    if (!settingsForm.reportValidity()) return;
    const feedback = settingsForm.querySelector("[data-settings-feedback]");
    const values = Object.fromEntries(new FormData(settingsForm).entries());
    busy = true;
    const submit = settingsForm.querySelector('button[type="submit"]');
    if (submit) { submit.disabled = true; submit.textContent = "Сохранение…"; }
    if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
    try {
      await authClient.updateProfile({ full_name: String(values.full_name || "").trim(), ...(values.birth_date ? { birth_date: values.birth_date } : {}) });
      const user = await authClient.getUser();
      const profileData = await authClient.getProfile();
      mountWorkspace(root, user, "profile/settings", profileData);
      const refreshedFeedback = root.querySelector("[data-settings-feedback]");
      if (refreshedFeedback) { refreshedFeedback.textContent = "Изменения сохранены."; refreshedFeedback.dataset.state = "success"; }
    } catch (error) {
      if (feedback) { feedback.textContent = error.message || "Не удалось сохранить изменения."; feedback.dataset.state = "error"; }
    } finally {
      busy = false;
      const currentSubmit = root.querySelector('[data-profile-settings-form] button[type="submit"]');
      if (currentSubmit) { currentSubmit.disabled = false; currentSubmit.textContent = "Сохранить изменения"; }
    }
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-auth-form]");
    if (!form || busy) return;
    event.preventDefault();

    const mode = form.dataset.mode;
    const values = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector(".auth-submit");

    if (!form.reportValidity()) return;
    if (values.password && values.password.length < 8) {
      showMessage("Пароль должен содержать не менее 8 символов.", "error");
      return;
    }
    if (values.password !== values.passwordConfirm && values.passwordConfirm !== undefined) {
      showMessage("Пароли не совпадают.", "error");
      return;
    }
    if (mode === "register" && new Date(values.birthDate).getTime() > Date.now()) {
      showMessage("Дата рождения не может быть в будущем.", "error");
      return;
    }

    busy = true;
    if (submitButton) {
      submitButton.dataset.defaultLabel = submitButton.textContent;
      setAuthenticationLoading(root, true);
    }

    try {
      if (mode === "register") {
        const username = values.username.trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) {
          throw new Error("Логин должен содержать 3–24 символа: латинские буквы, цифры, точку, дефис или подчёркивание.");
        }
        await authClient.signUp({
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          birthDate: values.birthDate,
          username,
        });
        renderAuthenticationView(root, "login", "Аккаунт создан. Проверьте электронную почту и перейдите по ссылке подтверждения, чтобы завершить регистрацию.", "success");
      } else if (mode === "login") {
        await authClient.signIn(values.identifier, values.password);
        window.location.hash = "projects";
      } else if (mode === "forgot-password") {
        await authClient.requestPasswordReset(values.email);
        showMessage("Если аккаунт с таким адресом существует, письмо для восстановления пароля отправлено.", "success");
      } else if (mode === "reset-password") {
        await authClient.updatePassword(values.password);
        window.location.hash = "projects";
      }
    } catch (error) {
      showMessage(normalizeError(error), "error");
    } finally {
      busy = false;
      if (root.querySelector("[data-auth-form]")) setAuthenticationLoading(root, false);
    }
  });

  root.addEventListener("click", async (event) => {
    const passwordResetButton = event.target.closest("[data-password-reset]");
    if (passwordResetButton && !busy) {
      const feedback = root.querySelector("[data-password-feedback]");
      busy = true;
      passwordResetButton.disabled = true;
      passwordResetButton.textContent = "Отправка…";
      if (feedback) { feedback.textContent = ""; feedback.dataset.state = ""; }
      try {
        const user = await authClient.getUser();
        if (!user?.email) throw new Error("В аккаунте не найден адрес электронной почты.");
        await authClient.requestPasswordReset(user.email);
        if (feedback) { feedback.textContent = "Ссылка для смены пароля отправлена на вашу почту."; feedback.dataset.state = "success"; }
      } catch (error) {
        if (feedback) { feedback.textContent = normalizeError(error); feedback.dataset.state = "error"; }
      } finally {
        busy = false;
        passwordResetButton.disabled = false;
        passwordResetButton.textContent = "Сменить пароль";
      }
      return;
    }
    const themeOption = event.target.closest("[data-theme-option]");
    if (themeOption) {
      const preference = themeOption.dataset.themeOption;
      if (preference === "system") window.localStorage.removeItem("raymondovich-theme");
      else window.localStorage.setItem("raymondovich-theme", preference);
      window.dispatchEvent(new CustomEvent("raymondovich:theme-change", { detail: { preference } }));
      return;
    }
    if (!event.target.closest("[data-auth-signout]") || busy) return;
    busy = true;
    try {
      await authClient.signOut();
      window.location.hash = "login";
    } catch (error) {
      showMessage(normalizeError(error), "error");
    } finally {
      busy = false;
    }
  });

  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace(/^#/, "").split("?")[0] || "home";
    setRoute(route);
  });

  parseRedirectSession();
  const initialRoute = window.location.hash.replace(/^#/, "").split("?")[0] || "home";
  setRoute(initialRoute);
}
