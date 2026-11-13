import { supabase } from "../../infrastructure/supabase/client.js";
import { getDefaultWorkspaceRoute, resolveWorkspaceRoute } from "../../application/workspace/resolve-workspace-route.js";
import { createProfileSettingsUseCases } from "../../application/profile/profile-settings.js";
import { profileSettingsGateway } from "../../infrastructure/supabase/profile-settings-gateway.js";

const THEME_KEY = "raymondovich-theme";
const root = document.documentElement;
const profileSettings = createProfileSettingsUseCases(profileSettingsGateway);
let routeTrail = [];
let currentRenderedRoute = null;
let suppressRouteTrail = false;
const SECTION_TITLES = {
  projects: "Проекты",
  ideas: "Идеи",
  team: "Команда",
  tools: "Инструменты",
  profile: "Профиль",
};

function readTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  try { window.localStorage.setItem(THEME_KEY, nextTheme); } catch {}
}

function readRoute() {
  const route = window.location.hash.slice(1).replace(/^\/+|\/+$/g, "");
  return resolveWorkspaceRoute(route)?.route ?? getDefaultWorkspaceRoute();
}

function navigate(route, { replace = false } = {}) {
  const hash = `#${route}`;
  if (window.location.hash === hash) {
    renderRoute();
    return;
  }
  if (replace) {
    window.history.replaceState(null, "", hash);
    renderRoute();
  } else {
    window.location.hash = route;
  }
}

applyTheme(readTheme());

const { data, error } = await supabase.auth.getUser();
if (error || !data.user) {
  window.location.replace("/?auth=login");
} else {
  const buttons = [...document.querySelectorAll("[data-section]")];
  const title = document.querySelector("#workspace-title");
  const content = document.querySelector("#workspace-placeholder");
  const globalBack = document.querySelector("#workspace-back");

  function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function showMessage(message) {
    content.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "ds-workspace__placeholder";
    paragraph.textContent = message;
    content.append(paragraph);
  }

  async function showProfile() {
    content.replaceChildren();

    const profileCard = document.createElement("section");
    profileCard.className = "ds-workspace__profile-card";
    profileCard.setAttribute("aria-label", "Профиль пользователя");

    const avatar = document.createElement("div");
    avatar.className = "ds-workspace__profile-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "…";

    const identity = document.createElement("div");
    identity.className = "ds-workspace__profile-identity";
    const fullName = document.createElement("h2");
    fullName.className = "ds-workspace__profile-name";
    fullName.textContent = "Загружаем профиль…";
    const username = document.createElement("p");
    username.className = "ds-workspace__profile-username";
    identity.append(fullName, username);

    const role = document.createElement("span");
    role.className = "ds-badge ds-workspace__profile-role";
    const roleValue = data.user.app_metadata?.role;
    const roleLabels = { admin: "Администратор", user: "Пользователь" };
    role.textContent = roleLabels[roleValue] || "Роль не назначена";
    if (roleValue === "admin") role.classList.add("ds-badge--accent");

    profileCard.append(avatar, identity, role);
    content.append(profileCard);

    try {
      const result = await loadProfile();
      if (!content.contains(profileCard)) return;
      const profile = result.profile;
      const name = (profile.full_name || "").trim();
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => Array.from(part)[0]?.toLocaleUpperCase("ru-RU") || "")
        .join("");
      avatar.textContent = initials || "—";
      avatar.setAttribute("aria-label", name ? `Аватар: ${name}` : "Аватар пользователя");
      fullName.textContent = name || "Имя не указано";
      username.textContent = profile.username ? `@${profile.username}` : "Логин не указан";
    } catch {
      if (!content.contains(profileCard)) return;
      avatar.textContent = "—";
      fullName.textContent = "Не удалось загрузить профиль";
      username.textContent = "Попробуйте открыть раздел позже";
    }

    const controlCenterGroup = document.createElement("section");
    controlCenterGroup.className = "ds-workspace__settings-group";
    controlCenterGroup.setAttribute("aria-label", "Control Center");
    controlCenterGroup.append(
      createCompactSettingRow("Control Center", "Раздел в разработке", () => {}, "Скоро"),
    );
    content.append(controlCenterGroup);

    const developmentGroup = document.createElement("section");
    developmentGroup.className = "ds-workspace__settings-group";
    developmentGroup.setAttribute("aria-labelledby", "profile-development-title");
    const developmentHeading = document.createElement("h2");
    developmentHeading.className = "ds-workspace__settings-heading";
    developmentHeading.id = "profile-development-title";
    developmentHeading.textContent = "Разработка";
    developmentGroup.append(
      developmentHeading,
      createCompactSettingRow("Проекты", "Раздел в разработке", () => {}, "Скоро"),
      createCompactSettingRow("Идеи", "Раздел в разработке", () => {}, "Скоро"),
      createCompactSettingRow("Инструменты", "Раздел в разработке", () => {}, "Скоро"),
    );
    content.append(developmentGroup);

    const settingsButton = makeButton(
      "",
      "ds-button ds-button--secondary ds-workspace__action",
      () => navigate("profile/settings"),
    );
    const settingsLabel = document.createElement("span");
    settingsLabel.className = "ds-workspace__setting-label";
    settingsLabel.textContent = "Настройки";
    const settingsDescription = document.createElement("span");
    settingsDescription.className = "ds-workspace__setting-value";
    settingsDescription.textContent = "Оформление, данные, конфиденциальность";
    settingsButton.append(settingsLabel, settingsDescription);
    content.append(settingsButton);

    const syncCompactRowHeight = () => {
      if (!content.contains(profileCard) || !content.contains(settingsButton)) return;
      const settingsRowHeight = settingsButton.getBoundingClientRect().height;
      if (!settingsRowHeight) return;
      content.style.setProperty("--profile-compact-row-height", settingsRowHeight + "px");
    };
    syncCompactRowHeight();
    if (typeof ResizeObserver !== "undefined") {
      const profileLayoutObserver = new ResizeObserver(() => {
        if (!content.contains(profileCard) || !content.contains(settingsButton)) {
          profileLayoutObserver.disconnect();
          return;
        }
        syncCompactRowHeight();
      });
      profileLayoutObserver.observe(profileCard);
      profileLayoutObserver.observe(settingsButton);
    }
  }

  async function loadProfile() {
    const result = await profileSettings.load();
    if (!result?.profile) throw new Error("Сервис вернул неполные данные профиля.");
    return result;
  }

  function createEditorDialog(field, currentValue, onSave) {
    const dialog = document.createElement("dialog");
    dialog.className = "ds-workspace__dialog";
    dialog.setAttribute("aria-labelledby", "profile-editor-title");
    const form = document.createElement("form");
    form.className = "ds-workspace__editor-form";
    form.noValidate = true;

    const heading = document.createElement("h2");
    heading.className = "ds-workspace__settings-heading";
    heading.id = "profile-editor-title";
    const status = document.createElement("p");
    status.className = "ds-workspace__editor-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const fields = [];
    const addField = (labelText, name, type, value, autocomplete, minLength = null) => {
      const label = document.createElement("label");
      label.className = "ds-field";
      label.textContent = labelText;
      const input = document.createElement("input");
      input.className = "ds-input";
      input.name = name;
      input.type = type;
      input.autocomplete = autocomplete;
      if (value !== undefined && value !== null) input.value = value;
      if (minLength) input.minLength = minLength;
      input.required = true;
      label.append(input);
      form.append(label);
      fields.push(input);
      return input;
    };

    if (field === "full_name") {
      heading.textContent = "Изменить ФИО";
      addField("ФИО", "full_name", "text", currentValue, "name", 3).maxLength = 160;
    } else if (field === "birth_date") {
      heading.textContent = "Изменить дату рождения";
      addField("Дата рождения", "birth_date", "date", currentValue, "bday");
    } else if (field === "email") {
      heading.textContent = "Изменить Email";
      addField("Новый Email", "email", "email", "", "email").maxLength = 254;
      addField("Текущий пароль", "current_password", "password", "", "current-password");
      const note = document.createElement("p");
      note.className = "ds-workspace__settings-description";
      note.textContent = "Для завершения изменения потребуется подтвердить адрес по ссылке из письма.";
      form.append(note);
    } else if (field === "password") {
      heading.textContent = "Изменить пароль";
      addField("Текущий пароль", "current_password", "password", "", "current-password");
      addField("Новый пароль", "password", "password", "", "new-password", 10).maxLength = 128;
      addField("Повторите новый пароль", "password_confirmation", "password", "", "new-password", 10).maxLength = 128;
    }

    const actions = document.createElement("div");
    actions.className = "ds-workspace__editor-actions";
    const cancel = makeButton("Отмена", "ds-button ds-button--secondary", () => dialog.close());
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "ds-button";
    submit.textContent = "Сохранить";
    actions.append(cancel, submit);
    form.append(status, actions);
    dialog.append(form);
    content.append(dialog);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      const values = Object.fromEntries(new FormData(form).entries());
      if (field === "password" && values.password !== values.password_confirmation) {
        status.textContent = "Новые пароли не совпадают.";
        return;
      }
      if (field === "password" && values.password.length < 10) {
        status.textContent = "Новый пароль должен содержать не менее 10 символов.";
        return;
      }
      submit.disabled = true;
      cancel.disabled = true;
      submit.textContent = "Сохранение…";
      try {
        await onSave(values);
        dialog.close();
      } catch (saveError) {
        status.textContent = saveError.message || "Не удалось сохранить изменения.";
      } finally {
        submit.disabled = false;
        cancel.disabled = false;
        submit.textContent = "Сохранить";
      }
    });

    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
    fields[0]?.focus();
  }

  function createCompactSettingRow(label, value, onClick, hint = "") {
    const row = createSettingRow(label, value, onClick, hint);
    row.classList.add("ds-workspace__setting-row--compact");
    return row;
  }

  function createSettingRow(label, value, onClick, hint = "") {
    const row = makeButton("", "ds-workspace__setting-row", onClick);
    const copy = document.createElement("span");
    copy.className = "ds-workspace__setting-copy";
    const name = document.createElement("span");
    name.className = "ds-workspace__setting-label";
    name.textContent = label;
    const detail = document.createElement("span");
    detail.className = "ds-workspace__setting-value";
    detail.textContent = value || "Не указано";
    copy.append(name, detail);
    row.append(copy);
    if (hint) {
      row.disabled = true;
      const meta = document.createElement("span");
      meta.className = "ds-workspace__setting-hint";
      meta.textContent = hint;
      row.append(meta);
    } else {
      const arrow = document.createElement("span");
      arrow.className = "ds-workspace__setting-chevron";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";
      row.append(arrow);
    }
    return row;
  }

  async function showSettings() {
    content.replaceChildren();

    const appearance = document.createElement("section");
    appearance.className = "ds-workspace__settings-group";
    appearance.setAttribute("aria-labelledby", "appearance-title");
    const appearanceHeading = document.createElement("h2");
    appearanceHeading.className = "ds-workspace__settings-heading";
    appearanceHeading.id = "appearance-title";
    appearanceHeading.textContent = "Оформление";

    const themeRow = document.createElement("div");
    themeRow.className = "ds-workspace__switch-row";
    const themeCopy = document.createElement("div");
    themeCopy.className = "ds-workspace__setting-copy";
    const themeLabel = document.createElement("span");
    themeLabel.className = "ds-workspace__setting-label";
    themeLabel.textContent = "Тёмная тема";
    themeCopy.append(themeLabel);
    const themeSwitch = document.createElement("button");
    themeSwitch.type = "button";
    themeSwitch.className = "ds-switch";
    themeSwitch.setAttribute("role", "switch");
    themeSwitch.setAttribute("aria-label", "Тёмная тема");
    themeSwitch.setAttribute("aria-checked", String(root.dataset.theme !== "light"));
    themeSwitch.addEventListener("click", () => {
      const nextTheme = themeSwitch.getAttribute("aria-checked") !== "true" ? "dark" : "light";
      applyTheme(nextTheme);
      const isDark = nextTheme === "dark";
      const nextLabel = isDark ? "Тёмная тема" : "Светлая тема";
      themeLabel.textContent = nextLabel;
      themeSwitch.setAttribute("aria-label", nextLabel);
      themeSwitch.setAttribute("aria-checked", String(isDark));
    });
    themeRow.append(themeCopy, themeSwitch);
    appearance.append(appearanceHeading, themeRow);

    const userGroup = document.createElement("section");
    userGroup.className = "ds-workspace__settings-group";
    userGroup.setAttribute("aria-labelledby", "user-data-title");
    const userHeading = document.createElement("h2");
    userHeading.className = "ds-workspace__settings-heading";
    userHeading.id = "user-data-title";
    userHeading.textContent = "Пользовательские данные";
    const loading = document.createElement("p");
    loading.className = "ds-workspace__settings-description";
    loading.textContent = "Загружаем данные профиля…";
    userGroup.append(userHeading, loading);
    content.append(appearance, userGroup);

    try {
      const result = await loadProfile();
      if (!content.contains(userGroup)) return;
      const profile = result.profile;
      userGroup.replaceChildren(userHeading);
      userGroup.append(
        createSettingRow("ФИО", profile.full_name, () => createEditorDialog("full_name", profile.full_name, async (values) => {
          const updated = await profileSettings.updateDetails({ full_name: values.full_name });
          if (!updated?.profile) throw new Error("Не удалось сохранить ФИО.");
          profile.full_name = updated.profile.full_name;
          await showSettings();
        })),
        createSettingRow("Дата рождения", new Date(profile.birth_date + "T00:00:00").toLocaleDateString("ru-RU"), () => createEditorDialog("birth_date", profile.birth_date, async (values) => {
          const updated = await profileSettings.updateDetails({ birth_date: values.birth_date });
          if (!updated?.profile) throw new Error("Не удалось сохранить дату рождения.");
          profile.birth_date = updated.profile.birth_date;
          await showSettings();
        })),
        createSettingRow("Логин", profile.username, () => {}, "Изменение недоступно"),
        createSettingRow("Пароль", "••••••••••", () => createEditorDialog("password", "", async (values) => {
          await profileSettings.changePassword({
            email: data.user.email,
            currentPassword: values.current_password,
            newPassword: values.password,
          });
          showMessage("Пароль успешно изменён.");
        })),
        createSettingRow("Email", result.email || "Не указан", () => createEditorDialog("email", "", async (values) => {
          await profileSettings.changeEmail({
            email: data.user.email,
            currentPassword: values.current_password,
            newEmail: values.email,
          });
          showMessage("Запрос на изменение Email отправлен. Подтвердите новый адрес по ссылке из письма.");
        })),
      );
    } catch (loadError) {
      loading.textContent = loadError.message || "Не удалось загрузить данные профиля.";
      const retry = makeButton("Повторить", "ds-button ds-button--secondary", () => showSettings());
      userGroup.append(retry);
    }
  }

  function renderRoute() {
    const route = readRoute();
    const resolved = resolveWorkspaceRoute(route);
    const section = resolved?.sectionId ?? "projects";
    if (route !== currentRenderedRoute) {
      if (!suppressRouteTrail && currentRenderedRoute) {
        if (routeTrail.at(-1) === route) routeTrail.pop();
        else routeTrail.push(currentRenderedRoute);
      }
      currentRenderedRoute = route;
    }
    globalBack.hidden = !resolved?.subroute;
    title.textContent = resolved?.subroute === "settings" ? "Настройки" : SECTION_TITLES[section];

    if (resolved?.subroute === "settings") showSettings();
    else if (section === "profile") showProfile();
    else showMessage("Раздел пока в разработке.");

    buttons.forEach((button) => {
      if (button.dataset.section === section) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.title = `${title.textContent} — Raymondovich`;
  }

  globalBack.addEventListener("click", () => {
    const current = resolveWorkspaceRoute(readRoute());
    if (!current?.subroute) return;

    if (current.route === "profile/settings") {
      // Use the browser's hash navigation so both the workspace router and root router
      // receive the same hashchange event and render the Profile root.
      routeTrail = [];
      window.location.hash = "#profile";
      return;
    }

    const parentRoute = current.route.split("/").slice(0, -1).join("/") || current.baseRoute;
    const target = routeTrail.pop() || parentRoute;
    navigate(target, { replace: true });
  });

  buttons.forEach((button) => button.addEventListener("click", () => {
    routeTrail = [];
    currentRenderedRoute = button.dataset.section;
    navigate(button.dataset.section);
  }));
  window.addEventListener("hashchange", renderRoute);

  const initialRoute = window.location.hash.slice(1).replace(/^\/+|\/+$/g, "");
  if (!resolveWorkspaceRoute(initialRoute)) navigate(getDefaultWorkspaceRoute(), { replace: true });
  else renderRoute();

  document.querySelector("#sign-out").addEventListener("click", async () => {
    const button = document.querySelector("#sign-out");
    button.disabled = true;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      button.disabled = false;
      button.textContent = "Не удалось выйти";
      return;
    }
    window.location.replace("/");
  });
}
