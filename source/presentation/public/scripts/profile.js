import { getProjectsSummary } from "/source/application/projects/project-registry.js";
import { changeProfileEmail, changeProfilePassword } from "/source/application/profile/profile-account.js";

const projectCountCache = new Map();

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

const icons = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  favorites: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
  reports: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19 13 2 1-2 4-2-1-2 1v2H9v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h6v2l2 1 2-1 2 4-2 1v2Z"/></svg>',
  modules: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6 18 10M4 20l7-7m-2-2 7-7a4 4 0 0 1 5 5l-7 7M3 4l6 6m-5-8 7 7"/></svg>',
  control: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.5-3.2 7.7-8 9.5-4.8-1.8-8-5-8-9.5V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>'
};

function row({ icon, title, value = "", route, status = "", control = false }) {
  return `<button class="profile-row" type="button" data-profile-route="${escape(route)}">
    <span class="profile-row-icon is-${icon}">${icons[icon]}</span>
    <span class="profile-row-title">${escape(title)}</span>
    <span class="profile-row-value">${escape(value || status)}</span>
    <span class="profile-row-chevron" aria-hidden="true">›</span>
  </button>`;
}

function userLabel(user) {
  return user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.email?.split("@")[0]
    || "Пользователь";
}

function roleLabel(user) {
  const labels = { admin: "Владелец", partner: "Партнёр", student: "Ученик", user: "Пользователь" };
  return labels[user.app_metadata?.role] || "Пользователь";
}

function avatarUrl(user) {
  const candidate = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function initials(value) {
  return String(value || "Р").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}

export function renderProfileScreen(root, user) {
  const name = userLabel(user);
  const avatar = avatarUrl(user);
  const admin = user.app_metadata?.role === "admin";
  const cachedProjectCount = projectCountCache.get(user.id);
  root.dataset.appScreen = "profile";
  root.innerHTML = `
    <section class="profile-screen" aria-labelledby="profile-title">
      <div class="profile-toolbar">
        <button class="profile-round-action" type="button" data-profile-search-toggle aria-label="Поиск по профилю" aria-expanded="false" aria-controls="profile-search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.5 4.5"/></svg>
        </button>
        <h1 id="profile-title">Профиль</h1>
        <button class="profile-edit-action" type="button" data-profile-route="#authorization/profile-settings">Изм.</button>
      </div>
      <label class="profile-search" id="profile-search-field" hidden>
        <span class="visually-hidden">Поиск по разделам профиля</span>
        <input type="search" data-profile-search placeholder="Поиск по профилю" autocomplete="off">
      </label>
      <header class="profile-identity">
        <div class="profile-avatar" aria-hidden="true">
          ${avatar ? `<img src="${escape(avatar)}" alt="">` : `<span>${escape(initials(name))}</span>`}
        </div>
        <h2>${escape(name)}</h2>
        <p>${escape(user.email || "")}</p>
        <span class="profile-role">${escape(roleLabel(user))}</span>
      </header>
      <div class="profile-groups" data-profile-groups>
        ${admin ? `<section class="profile-group" data-profile-group><div class="profile-group-list">${row({icon:"control",title:"Control Center",route:"#authorization/control-center"})}</div></section>` : ""}
        <section class="profile-group" data-profile-group aria-label="Проекты">
          <div class="profile-group-list">${row({icon:"projects",title:"Мои проекты",value:cachedProjectCount === undefined ? "…" : String(cachedProjectCount),route:"#authorization/projects"})}</div>
        </section>
        <section class="profile-group" data-profile-group aria-label="Инструменты">
          <div class="profile-group-list">${row({icon:"tools",title:"Инструменты",value:"Каталог платформы",route:"#authorization/profile-tools"})}</div>
        </section>
        <section class="profile-group" data-profile-group aria-label="Избранное">
          <div class="profile-group-heading">Избранное</div>
          <div class="profile-empty">Здесь появятся избранные проекты и инструменты. Пока ничего не добавлено.</div>
        </section>
        <section class="profile-group" data-profile-group aria-label="Отчёты">
          <div class="profile-group-list">${row({icon:"reports",title:"Отчёты",value:"Нет данных",route:"#authorization/reports"})}</div>
        </section>
        <section class="profile-group" data-profile-group aria-label="Настройки профиля">
          <div class="profile-group-list">${row({icon:"settings",title:"Настройки профиля",route:"#authorization/profile-settings"})}</div>
        </section>
        <section class="profile-group" data-profile-group aria-label="Управление модулями">
          <div class="profile-group-list">${row({icon:"modules",title:"Управление модулями",status:"Скоро",route:"#authorization/modules"})}</div>
        </section>
      </div>
    </section>`;

  if (admin) {
    getProjectsSummary().then(result => {
      if (root.dataset.appScreen !== "profile") return;
      const value = result.error ? "Недоступно" : String(result.total ?? "—");
      if (!result.error) projectCountCache.set(user.id, result.total ?? "—");
      const counter = root.querySelector('[data-profile-route="#authorization/projects"] .profile-row-value');
      if (counter) counter.textContent = value;
    }).catch(() => {
      const counter = root.querySelector('[data-profile-route="#authorization/projects"] .profile-row-value');
      if (counter) counter.textContent = "Недоступно";
    });
  } else {
    const counter = root.querySelector('[data-profile-route="#authorization/projects"] .profile-row-value');
    if (counter) counter.textContent = "Нет доступа";
  }
}


export function renderProfileToolsScreen(root, user) {
  const owner = user.app_metadata?.role === "admin";
  const accessLabel = owner ? "Доступ владельца" : "Доступ по подписке";
  const toolRow = (title, description = "") => `
    <div class="profile-tool-row">
      <span class="profile-tool-row-copy"><strong>${escape(title)}</strong>${description ? `<small>${escape(description)}</small>` : ""}</span>
      <span class="profile-tool-access">${accessLabel}</span>
    </div>`;
  root.dataset.appScreen = "profile-tools";
  root.innerHTML = `
    <section class="profile-subscreen profile-tools-screen" aria-labelledby="profile-tools-title">
      <header class="profile-subscreen-header">
        <h1 id="profile-tools-title">Инструменты</h1>
        <p class="profile-tools-intro">Каталог инструментов экосистемы Raymondovich. Доступ к использованию определяется ролью и подпиской.</p>
      </header>
      <section class="profile-tools-group" aria-labelledby="profile-tools-services">
        <h2 id="profile-tools-services">Основные инструменты</h2>
        <div class="profile-tools-list">
          <div class="profile-tool-category">
            <div class="profile-tool-category-heading"><strong>Сервисы</strong><small>Инфраструктура и подключённые сервисы</small></div>
            ${toolRow("Инфраструктура", "Домены, серверы, базы данных и ресурсы")}
            ${toolRow("Подключённые сервисы", "Внешние сервисы, используемые в проектах")}
          </div>
          ${toolRow("Бухгалтерия", "Доходы, расходы и финансовые операции")}
          ${toolRow("Аналитика", "Показатели и динамика проектов")}
          ${toolRow("Маркетинг", "Маркетинговые площадки, аккаунты и кампании")}
        </div>
      </section>
      <section class="profile-tools-group" aria-labelledby="profile-tools-integrations">
        <h2 id="profile-tools-integrations">Инструменты интеграции</h2>
        <div class="profile-tools-list">
          ${toolRow("ИИ", "Инструменты искусственного интеллекта")}
          ${toolRow("Telegram-бот", "Автоматизация взаимодействия через Telegram")}
          ${toolRow("Сообщество в Telegram", "Сообщество и коммуникации участников")}
        </div>
      </section>
    </section>`;
}

export function renderProfileSettings(root, user) {
  root.dataset.appScreen = "profile-settings";
  root.innerHTML = `
    <section class="profile-subscreen" aria-labelledby="profile-settings-title">
      <header class="profile-subscreen-header">
        <h1 id="profile-settings-title">Настройки профиля</h1>
      </header>
      <section class="profile-settings-card">
        <h2>Электронная почта</h2>
        <p class="profile-current-value">${escape(user.email || "Адрес не указан")}</p>
        <form data-profile-email-form>
          <label>Новый e-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <button class="profile-submit" type="submit">Изменить e-mail</button>
        </form>
      </section>
      <section class="profile-settings-card">
        <h2>Пароль</h2>
        <form data-profile-password-form>
          <label>Новый пароль<input name="password" type="password" autocomplete="new-password" required minlength="10"></label>
          <label>Повторите пароль<input name="confirmation" type="password" autocomplete="new-password" required minlength="10"></label>
          <button class="profile-submit" type="submit">Изменить пароль</button>
        </form>
      </section>
      <section class="profile-settings-card">
        <h2>Безопасность</h2>
        <p>PIN-код защищает доступ к приложению на этом устройстве.</p>
        <button class="profile-secondary" type="button" data-pin-change>Изменить PIN-код</button>
        <button class="profile-secondary" type="button" data-auth-lock>Заблокировать приложение</button>
        <button class="profile-secondary" type="button" data-auth-signout>Выйти из аккаунта</button>
      </section>
      <p class="profile-form-notice" data-profile-notice role="status" aria-live="polite" hidden></p>
    </section>`;
}

export function renderProfileEmptyScreen(root, title, message) {
  root.dataset.appScreen = title.toLowerCase().replace(/\s+/g, "-");
  root.innerHTML = `
    <section class="profile-subscreen" aria-labelledby="profile-empty-title">
      <header class="profile-subscreen-header">
        <h1 id="profile-empty-title">${escape(title)}</h1>
      </header>
      <div class="profile-empty-panel">${escape(message)}</div>
    </section>`;
}

export function bindProfileInteractions(root, navigate) {
  if (root.dataset.profileInteractions === "bound") return;
  root.dataset.profileInteractions = "bound";
  root.addEventListener("click", async event => {
    const routeButton = event.target.closest("[data-profile-route]");
    if (routeButton) {
      navigate(routeButton.dataset.profileRoute);
      return;
    }
    if (event.target.closest("[data-profile-search-toggle]")) {
      const search = root.querySelector(".profile-search");
      if (!search) return;
      search.hidden = !search.hidden;
      event.target.closest("[data-profile-search-toggle]")?.setAttribute("aria-expanded", String(!search.hidden));
      if (!search.hidden) search.querySelector("input")?.focus();
      return;
    }
  });
  root.addEventListener("input", event => {
    if (!event.target.matches("[data-profile-search]")) return;
    const query = event.target.value.trim().toLocaleLowerCase("ru");
    root.querySelectorAll("[data-profile-group]").forEach(group => {
      group.hidden = Boolean(query) && !group.textContent.toLocaleLowerCase("ru").includes(query);
    });
  });
  root.addEventListener("submit", async event => {
    const emailForm = event.target.closest("[data-profile-email-form]");
    const passwordForm = event.target.closest("[data-profile-password-form]");
    if (!emailForm && !passwordForm) return;
    event.preventDefault();
    const form = emailForm || passwordForm;
    const button = form.querySelector('button[type="submit"]');
    const notice = root.querySelector("[data-profile-notice]");
    const data = new FormData(form);
    button.disabled = true;
    notice.hidden = false;
    notice.textContent = "Сохранение…";
    try {
      const result = emailForm
        ? await changeProfileEmail(data.get("email"))
        : await changeProfilePassword(data.get("password"), data.get("confirmation"));
      if (result.error) throw result.error;
      notice.textContent = emailForm
        ? "Запрос принят. Проверьте новую почту и подтвердите адрес по ссылке Supabase Auth."
        : "Пароль успешно изменён.";
      form.reset();
    } catch (error) {
      notice.textContent = error?.message || "Не удалось сохранить изменения.";
    } finally {
      button.disabled = false;
    }
  });
}
