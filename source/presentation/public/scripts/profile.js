import { getProjectsSummary } from "/source/application/projects/project-registry.js";
import { changeProfileEmail, changeProfilePassword } from "/source/application/profile/profile-account.js";

const projectCountCache = new Map();

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

const icons = {
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
  favorites: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
  ideas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8.2 14.5a7 7 0 1 1 7.6 0c-.9.6-1.3 1.4-1.3 2.5h-5c0-1.1-.4-1.9-1.3-2.5Z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7"/></svg>',
  reports: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19 13 2 1-2 4-2-1-2 1v2H9v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h6v2l2 1 2-1 2 4-2 1v2Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg>',
  modules: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6 18 10M4 20l7-7m-2-2 7-7a4 4 0 0 1 5 5l-7 7M3 4l6 6m-5-8 7 7"/></svg>',
  control: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.5-3.2 7.7-8 9.5-4.8-1.8-8-5-8-9.5V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>'
};

function row({ icon, title, value = "", route, status = "", description = "" }) {
  const detail = value || status;
  return '<button class="profile-row app-ui-row app-ui-v3-row" type="button" data-profile-route="' + escape(route) + '">' +
    '<span class="profile-row-icon app-ui-row__icon app-ui-v3-tile is-' + icon + '">' + icons[icon] + '</span>' +
    '<span class="profile-row-copy app-ui-row__copy app-ui-v3-row__copy">' +
      '<span class="profile-row-title app-ui-row__title app-ui-v3-row__title">' + escape(title) + '</span>' +
      (description ? '<span class="profile-row-description">' + escape(description) + '</span>' : '') +
    '</span>' +
    (detail ? '<span class="profile-row-value app-ui-row__value app-ui-v3-row__value">' + escape(detail) + '</span>' : '') +
    '<span class="profile-row-chevron app-ui-row__chevron app-ui-v3-row__chevron" aria-hidden="true">›</span>' +
  '</button>';
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
    <section class="profile-screen app-ui-screen app-ui-v3-frame" aria-labelledby="profile-title">
      <div class="profile-toolbar app-ui-screen-header">
        <h1 class="app-ui-v3-heading" id="profile-title">Профиль</h1>
      </div>
      <header class="profile-identity app-ui-card app-ui-card--warm app-ui-v3-group app-ui-v3-group--accent">
        <div class="profile-avatar" aria-hidden="true">
          ${avatar ? `<img src="${escape(avatar)}" alt="">` : `<span>${escape(initials(name))}</span>`}
        </div>
        <div class="profile-identity-copy">
          <h2>${escape(name)}</h2>
          <p>${escape(user.email || "")}</p>
        </div>
        <span class="profile-role">${escape(roleLabel(user))}</span>
      </header>
      <div class="profile-groups" data-profile-groups>
        ${admin ? `<section class="profile-group is-accent app-ui-group app-ui-v3-group" data-profile-group><div class="profile-group-list app-ui-list">${row({icon:"control",title:"Control Center",description:"Управление экосистемой",route:"#authorization/control-center"})}</div></section>` : ""}
        <section class="profile-section" aria-label="Разработка">
          <h2 class="profile-group-heading app-ui-v3-group-label">Разработка</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group>
            <div class="profile-group-list app-ui-list">
              ${row({icon:"projects",title:"Проекты",description:"Реестр проектов",value:cachedProjectCount === undefined ? "…" : String(cachedProjectCount),route:"#authorization/projects"})}
              ${row({icon:"ideas",title:"Идеи",description:"Задумки и предложения",route:"#authorization/ideas"})}
              ${row({icon:"tools",title:"Инструменты",description:"Вся экосистема",route:"#authorization/profile-tools"})}
            </div>
          </div>
        </section>
        <section class="profile-section" aria-label="Действующие проекты">
          <h2 class="profile-group-heading app-ui-v3-group-label">Действующие проекты</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group aria-label="Действующие проекты">
            <div class="profile-empty app-ui-v3-empty"><span class="profile-empty-icon is-success" aria-hidden="true">${icons.chart}</span><span>Здесь появятся проекты, которые уже работают и приносят доход. Пока таких нет.</span></div>
          </div>
        </section>
        <section class="profile-section" aria-label="Избранное">
          <h2 class="profile-group-heading app-ui-v3-group-label">Избранное</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group aria-label="Избранное">
            <div class="profile-empty app-ui-v3-empty"><span class="profile-empty-icon" aria-hidden="true">${icons.favorites}</span><span>Здесь появятся избранные проекты и инструменты. Пока ничего не добавлено.</span></div>
          </div>
        </section>
        <section class="profile-section" aria-label="Аккаунт">
          <h2 class="profile-group-heading app-ui-v3-group-label">Аккаунт</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group>
            <div class="profile-group-list app-ui-list">
              ${row({icon:"reports",title:"Отчёты",value:"Нет данных",route:"#authorization/reports"})}
              ${row({icon:"edit",title:"Редактировать профиль",route:"#authorization/profile-settings"})}
              ${row({icon:"modules",title:"Управление модулями",status:"Скоро",route:"#authorization/modules"})}
            </div>
          </div>
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
  const toolRow = (title, description = "") => `
    <div class="profile-tool-row">
      <span class="profile-tool-row-copy"><strong>${escape(title)}</strong>${description ? `<small>${escape(description)}</small>` : ""}</span>
    </div>`;
  root.dataset.appScreen = "profile-tools";
  root.innerHTML = `
    <section class="profile-subscreen profile-tools-screen app-ui-v3-frame" aria-labelledby="profile-tools-title">
      <header class="profile-subscreen-header">
        <h1 class="app-ui-v3-heading" id="profile-tools-title">Инструменты</h1>
        <p class="profile-tools-intro">Каталог инструментов и сервисов, используемых в экосистеме Raymondovich.</p>
      </header>
      <section class="profile-tools-group" aria-labelledby="profile-tools-development">
        <h2 id="profile-tools-development">Инструменты разработки</h2>
        <div class="profile-tools-list">
          <div class="profile-tool-category">
            <div class="profile-tool-category-heading"><strong>Сервисы</strong><small>Инфраструктура и подключённые сервисы</small></div>
            ${toolRow("Инфраструктура", "Домены, серверы, базы данных и ресурсы")}
            ${toolRow("Подключённые сервисы", "Внешние сервисы, используемые в проектах")}
          </div>
        </div>
      </section>
      <section class="profile-tools-group" aria-labelledby="profile-tools-promotion">
        <h2 id="profile-tools-promotion">Инструменты продвижения</h2>
        <div class="profile-tools-list">
          ${toolRow("Маркетинг", "Маркетинговые площадки, аккаунты и кампании")}
          ${toolRow("Сообщество в Telegram", "Сообщество и коммуникации участников")}
        </div>
      </section>
      <section class="profile-tools-group" aria-labelledby="profile-tools-integration">
        <h2 id="profile-tools-integration">Инструменты интеграции</h2>
        <div class="profile-tools-list">
          ${toolRow("ИИ", "Инструменты искусственного интеллекта")}
          ${toolRow("Telegram-бот", "Автоматизация взаимодействия через Telegram")}
        </div>
      </section>
      <section class="profile-tools-group" aria-labelledby="profile-tools-analysis">
        <h2 id="profile-tools-analysis">Инструменты анализа</h2>
        <div class="profile-tools-list">
          ${toolRow("Бухгалтерия", "Доходы, расходы и финансовые операции")}
          ${toolRow("Аналитика", "Показатели и динамика проектов")}
        </div>
      </section>
    </section>`;
}

export function renderProfileSettings(root, user) {
  const themeIsLight = document.documentElement.dataset.theme === "light";
  root.dataset.appScreen = "profile-settings";
  root.innerHTML = `
    <section class="profile-subscreen app-ui-v3-frame" aria-labelledby="profile-settings-title">
      <header class="profile-subscreen-header">
        <h1 class="app-ui-v3-heading" id="profile-settings-title">Настройки профиля</h1>
      </header>
      <section class="profile-settings-card app-ui-v3-group profile-appearance-settings">
        <h2>Оформление</h2>
        <button class="profile-theme-toggle" type="button" role="switch" data-theme-toggle aria-checked="${!themeIsLight}">
          <span data-theme-label>Тёмная тема</span>
          <span class="rv3-switch" aria-hidden="true"></span>
        </button>
      </section>
      <section class="profile-settings-card app-ui-v3-group">
        <h2>Электронная почта</h2>
        <p class="profile-current-value">${escape(user.email || "Адрес не указан")}</p>
        <form data-profile-email-form>
          <label>Новый e-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <button class="profile-submit app-ui-v3-button" type="submit">Изменить e-mail</button>
        </form>
      </section>
      <section class="profile-settings-card app-ui-v3-group">
        <h2>Пароль</h2>
        <form data-profile-password-form>
          <label>Новый пароль<input name="password" type="password" autocomplete="new-password" required minlength="10"></label>
          <label>Повторите пароль<input name="confirmation" type="password" autocomplete="new-password" required minlength="10"></label>
          <button class="profile-submit app-ui-v3-button" type="submit">Изменить пароль</button>
        </form>
      </section>
      <section class="profile-settings-card app-ui-v3-group">
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
