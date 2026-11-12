import { getProjectsSummary } from "/source/application/projects/project-registry.js";

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
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
  bot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v9h-9l-4 4v-4H5z"/></svg>',
  control: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.5-3.2 7.7-8 9.5-4.8-1.8-8-5-8-9.5V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m4 8 8 6 8-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/></svg>'
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
              ${row({icon:"tools",title:"Корзина",description:"Удалённые проекты и идеи",route:"#authorization/trash"})}
              ${row({icon:"reports",title:"Отчёты",value:"Нет данных",route:"#authorization/reports"})}
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
        ${admin ? `<section class="profile-section" aria-label="Избранное">
          <h2 class="profile-group-heading app-ui-v3-group-label">Избранное</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group aria-label="Избранное">
            <div class="profile-group-list app-ui-list">
              ${row({icon:"favorites",title:"Избранное",description:"Сохранённые проекты и идеи",route:"#authorization/favorites"})}
            </div>
          </div>
        </section>` : ""}
        <section class="profile-section" aria-label="Аккаунт">
          <h2 class="profile-group-heading app-ui-v3-group-label">Аккаунт</h2>
          <div class="profile-group app-ui-group app-ui-v3-group" data-profile-group>
            <div class="profile-group-list app-ui-list">
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
  const tools = [
    ["spark", "ИИ", "Ассистенты и автоматизация"],
    ["bot", "Telegram-бот", "Заявки и уведомления"],
    ["chat", "Сообщество в Telegram", "Канал и чат экосистемы"],
    ["modules", "Инфраструктура", "Домены, серверы, базы данных и ресурсы"],
    ["settings", "Подключённые сервисы", "Внешние сервисы, используемые в проектах"],
    ["chart", "Маркетинг", "Маркетинговые площадки, аккаунты и кампании"],
    ["reports", "Бухгалтерия", "Доходы, расходы и финансовые операции"],
    ["chart", "Аналитика", "Показатели и динамика проектов"]
  ];
  root.dataset.appScreen = "profile-tools";
  root.innerHTML = `
    <section class="profile-subscreen profile-tools-screen app-ui-v3-frame" aria-labelledby="profile-tools-title">
      <header class="profile-subscreen-header">
        <h1 class="app-ui-v3-heading" id="profile-tools-title">Инструменты</h1>
      </header>
      <h2 class="profile-group-heading">Инструменты экосистемы</h2>
      <div class="profile-group app-ui-v3-group" aria-label="Каталог инструментов">
        ${tools.map(([icon, title, description]) => `
          <div class="profile-row app-ui-v3-row profile-tool-row">
            <span class="profile-row-icon app-ui-v3-tile is-${icon}">${icons[icon]}</span>
            <span class="profile-row-copy app-ui-v3-row__copy">
              <span class="profile-row-title app-ui-v3-row__title">${escape(title)}</span>
              <span class="profile-row-description">${escape(description)}</span>
            </span>
          </div>`).join("")}
      </div>
    </section>`;
}

function settingsActionRow({ icon, title, value, action }) {
  return `<button class="profile-row app-ui-row app-ui-v3-row" type="button" data-settings-action="${escape(action)}">
    <span class="profile-row-icon app-ui-row__icon app-ui-v3-tile is-${icon}">${icons[icon]}</span>
    <span class="profile-row-copy app-ui-row__copy app-ui-v3-row__copy">
      <span class="profile-row-title app-ui-row__title app-ui-v3-row__title">${escape(title)}</span>
    </span>
    <span class="profile-row-value app-ui-row__value app-ui-v3-row__value">${escape(value)}</span>
    <span class="profile-row-chevron app-ui-row__chevron app-ui-v3-row__chevron" aria-hidden="true">›</span>
  </button>`;
}

function settingsDialogMarkup() {
  return `<dialog class="profile-settings-dialog" data-settings-dialog aria-labelledby="profile-settings-dialog-title">
    <form method="dialog" class="profile-settings-dialog-panel">
      <button class="profile-settings-dialog-close" type="submit" aria-label="Закрыть">×</button>
      <h2 id="profile-settings-dialog-title" data-settings-dialog-title></h2>
      <label class="profile-settings-dialog-field" data-settings-dialog-field>
        <span data-settings-dialog-label></span>
        <input data-settings-dialog-input type="text" autocomplete="off">
      </label>
      <p class="profile-settings-dialog-note">Интерфейс подготовлен. Подключение функции будет выполнено на следующем этапе.</p>
      <button class="profile-submit app-ui-v3-button" type="button" data-settings-dialog-save>Сохранить</button>
    </form>
  </dialog>`;
}

export function renderProfileSettings(root, user) {
  const themeIsDark = document.documentElement.dataset.theme !== "light";
  const login = user.user_metadata?.username || user.user_metadata?.login || "Не задан";
  root.dataset.appScreen = "profile-settings";
  root.innerHTML = `
    <section class="profile-subscreen profile-settings-screen app-ui-v3-frame" aria-labelledby="profile-settings-title">
      <header class="profile-subscreen-header">
        <h1 class="app-ui-v3-heading" id="profile-settings-title">Настройки</h1>
      </header>
      <section class="profile-settings-section" aria-labelledby="profile-settings-appearance">
        <h2 class="profile-settings-heading" id="profile-settings-appearance">Оформление</h2>
        <div class="profile-settings-card app-ui-v3-group profile-appearance-settings">
          <button class="profile-theme-toggle" type="button" role="switch" data-theme-toggle aria-checked="${themeIsDark}">
            <span data-theme-label>Тёмная тема</span>
            <span class="rv3-switch" aria-hidden="true"></span>
          </button>
        </div>
      </section>
      <section class="profile-settings-section" aria-labelledby="profile-settings-data">
        <h2 class="profile-settings-heading" id="profile-settings-data">Пользовательские данные</h2>
        <div class="profile-settings-card app-ui-v3-group profile-settings-list">
          ${settingsActionRow({icon:"user",title:"Логин",value:login,action:"login"})}
          ${settingsActionRow({icon:"mail",title:"Почта",value:user.email || "Не указана",action:"email"})}
          ${settingsActionRow({icon:"lock",title:"Пароль",value:"••••••••",action:"password"})}
        </div>
      </section>
      <section class="profile-settings-section" aria-labelledby="profile-settings-privacy">
        <h2 class="profile-settings-heading" id="profile-settings-privacy">Конфиденциальность</h2>
        <div class="profile-settings-card app-ui-v3-group profile-settings-list">
          ${row({icon:"key",title:"Секреты",description:"Ключи и токены",value:"",route:"#authorization/profile-secrets"})}
        </div>
      </section>
    </section>
    ${settingsDialogMarkup()}`;
}

export function renderProfileSecretsScreen(root) {
  root.dataset.appScreen = "profile-secrets";
  root.innerHTML = `
    <section class="profile-subscreen profile-secrets-screen app-ui-v3-frame" aria-labelledby="profile-secrets-title">
      <header class="profile-subscreen-header">
        <h1 class="app-ui-v3-heading" id="profile-secrets-title">Секреты</h1>
      </header>
      <p class="profile-secrets-intro">Здесь будут отображаться подключённые ключи и токены. Значения секретов не будут показываться в интерфейсе.</p>
      <div class="profile-settings-card app-ui-v3-group profile-secrets-empty" role="status">
        <span class="profile-secrets-empty-icon" aria-hidden="true">${icons.key}</span>
        <span>Хранилище секретов будет подключено позже. Пока здесь нет добавленных ключей и токенов.</span>
      </div>
      <button class="profile-submit app-ui-v3-button profile-secrets-add" type="button" data-settings-action="secret">Добавить секрет</button>
    </section>
    ${settingsDialogMarkup()}`;
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

  root.addEventListener("click", event => {
    const routeButton = event.target.closest("[data-profile-route]");
    if (routeButton) {
      navigate(routeButton.dataset.profileRoute);
      return;
    }

    const actionButton = event.target.closest("[data-settings-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.settingsAction;
    const dialog = root.querySelector("[data-settings-dialog]");
    if (!dialog) return;

    const config = {
      login: ["Изменить логин", "Новый логин", "text"],
      email: ["Изменить почту", "Новая почта", "email"],
      password: ["Изменить пароль", "Новый пароль", "password"],
      secret: ["Добавить секрет", "Название секрета", "text"]
    }[action];
    if (!config) return;

    dialog.querySelector("[data-settings-dialog-title]").textContent = config[0];
    dialog.querySelector("[data-settings-dialog-label]").textContent = config[1];
    const input = dialog.querySelector("[data-settings-dialog-input]");
    input.type = config[2];
    input.value = "";
    dialog.showModal();
    input.focus();
  });

  root.addEventListener("click", event => {
    if (event.target.closest("[data-settings-dialog-save]")) {
      const dialog = root.querySelector("[data-settings-dialog]");
      const note = dialog?.querySelector(".profile-settings-dialog-note");
      if (note) note.textContent = "Сохранение пока не подключено. Введённые данные не отправлены и не сохранены.";
    }
  });
}
