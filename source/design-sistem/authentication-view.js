/* Version: 1.1.2 */
/* Updated: 2026-11-16 */

const templates = {
  login: {
    title: "Вход",
    description: "Войдите в аккаунт Raymondovich по логину или электронной почте.",
    fields: [
      { name: "identifier", label: "Логин или электронная почта", type: "text", autocomplete: "username", required: true },
      { name: "password", label: "Пароль", type: "password", autocomplete: "current-password", required: true },
    ],
    submit: "Войти",
    links: '<span>Проблемы с доступом? <a href="#forgot-password">Восстановить аккаунт</a></span><span>Нет аккаунта в экосистеме? <a href="#register">Создать аккаунт</a></span>',
  },
  register: {
    title: "Создать аккаунт",
    description: "Заполните данные. После регистрации мы отправим письмо для подтверждения электронной почты.",
    fields: [
      { name: "fullName", label: "ФИО", type: "text", autocomplete: "name", minlength: 3, maxlength: 160, required: true },
      { name: "birthDate", label: "Дата рождения", type: "date", autocomplete: "bday", required: true },
      { name: "username", label: "Логин", type: "text", autocomplete: "username", minlength: 3, maxlength: 24, pattern: "[a-zA-Z0-9][a-zA-Z0-9._-]{2,23}", required: true },
      { name: "email", label: "Электронная почта", type: "email", autocomplete: "email", required: true },
      { name: "password", label: "Пароль", type: "password", autocomplete: "new-password", minlength: 8, required: true },
      { name: "passwordConfirm", label: "Повторите пароль", type: "password", autocomplete: "new-password", minlength: 8, required: true },
    ],
    submit: "Зарегистрироваться",
    links: '<span>Уже есть аккаунт? <a href="#login">Войти</a></span>',
  },
  "forgot-password": {
    title: "Восстановление аккаунта",
    description: "Укажите электронную почту аккаунта. Мы отправим ссылку для создания нового пароля.",
    fields: [
      { name: "email", label: "Электронная почта", type: "email", autocomplete: "email", required: true },
    ],
    submit: "Отправить ссылку",
    links: '<a href="#login">Вернуться ко входу</a>',
  },
  "reset-password": {
    title: "Новый пароль",
    description: "Задайте новый пароль для аккаунта Raymondovich.",
    fields: [
      { name: "password", label: "Новый пароль", type: "password", autocomplete: "new-password", minlength: 8, required: true },
      { name: "passwordConfirm", label: "Повторите пароль", type: "password", autocomplete: "new-password", minlength: 8, required: true },
    ],
    submit: "Сохранить пароль",
    links: "",
  },
};

function fieldMarkup(field) {
  const attributes = [
    `type="${field.type}"`,
    `name="${field.name}"`,
    `id="auth-${field.name}"`,
    `autocomplete="${field.autocomplete}"`,
    field.minlength ? `minlength="${field.minlength}"` : "",
    field.maxlength ? `maxlength="${field.maxlength}"` : "",
    field.pattern ? `pattern="${field.pattern}"` : "",
    field.required ? "required" : "",
  ].filter(Boolean).join(" ");

  return `<label class="auth-field" for="auth-${field.name}"><span>${field.label}</span><input ${attributes}></label>`;
}

export function renderAuthenticationView(container, mode, message = "", kind = "info") {
  const config = templates[mode];
  if (!config) {
    container.innerHTML = "";
    return;
  }

  const fields = config.fields.map(fieldMarkup).join("");
  container.innerHTML = `
    <section class="auth-panel" aria-labelledby="auth-title">
      <h1 class="auth-heading" id="auth-title">${config.title}</h1>
      <p class="auth-description">${config.description}</p>
      <p class="auth-message" data-auth-message data-kind="${kind}" data-visible="${message ? "true" : "false"}" role="status" aria-live="polite"></p>
      <form class="auth-form" data-auth-form data-mode="${mode}" novalidate>
        ${fields}
        <button class="auth-submit" type="submit">${config.submit}</button>
      </form>
      <nav class="auth-links" aria-label="Действия аккаунта">${config.links}</nav>
    </section>
  `;

  const messageNode = container.querySelector("[data-auth-message]");
  if (messageNode) messageNode.textContent = message;
}

export function renderAuthenticatedView(container, user) {
  const email = user?.email || "Аккаунт Raymondovich";
  container.innerHTML = `
    <section class="auth-panel" aria-labelledby="auth-title">
      <div class="status-indicator">Raymondovich</div>
      <h1 class="auth-heading" id="auth-title">Вы вошли</h1>
      <p class="auth-description">Авторизация выполнена успешно.</p>
      <div class="auth-account">
        <div class="auth-account-email"></div>
        <button class="auth-secondary-button" type="button" data-auth-signout>Выйти из аккаунта</button>
      </div>
    </section>
  `;
  container.querySelector(".auth-account-email").textContent = email;
}

export function setAuthenticationMessage(container, message, kind = "info") {
  const node = container.querySelector("[data-auth-message]");
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  node.dataset.visible = message ? "true" : "false";
}

export function setAuthenticationLoading(container, loading) {
  const button = container.querySelector(".auth-submit");
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "Подождите…" : button.dataset.defaultLabel || button.textContent;
  if (!button.dataset.defaultLabel && !loading) button.dataset.defaultLabel = button.textContent;
}


export function renderPublicProfileView(container, payload, error = "") {
  container.innerHTML = "";

  const page = document.createElement("section");
  page.className = "public-profile-page";

  const panel = document.createElement("article");
  panel.className = "auth-panel public-profile-panel";

  const heading = document.createElement("h1");
  heading.className = "auth-heading";
  heading.textContent = error ? "Профиль недоступен" : "Публичный профиль";

  const description = document.createElement("p");
  description.className = "auth-description";

  if (error || !payload) {
    description.textContent = error || "Не удалось загрузить публичный профиль.";
    panel.append(heading, description);
    page.append(panel);
    container.append(page);
    return;
  }

  const profile = payload.profile || payload.user || payload;
  const fullName = profile.full_name || profile.name || profile.username || "Пользователь Raymondovich";
  heading.textContent = fullName;

  const identityRow = document.createElement("div");
  identityRow.className = "public-profile-identity-row";
  identityRow.append(heading);

  if (String(profile.username || "").toLowerCase() === "raymondovich") {
    const ownerBadge = document.createElement("span");
    ownerBadge.className = "public-profile-owner-badge";
    ownerBadge.setAttribute("role", "img");
    ownerBadge.setAttribute("aria-label", "Владелец экосистемы");
    ownerBadge.title = "Владелец экосистемы";
    ownerBadge.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4.5 10.2 3.4 3.4 7.6-7.3"/></svg>';
    identityRow.append(ownerBadge);
  }

  description.textContent = profile.username ? `@${profile.username}` : "Публичный профиль Raymondovich";
  panel.append(identityRow, description);

  if (typeof profile.about === "string" && profile.about.trim()) {
    const aboutSection = document.createElement("section");
    aboutSection.className = "public-profile-about-section";
    aboutSection.setAttribute("aria-labelledby", "public-profile-about-title");

    const aboutHeading = document.createElement("h2");
    aboutHeading.id = "public-profile-about-title";
    aboutHeading.textContent = "О себе";

    const aboutText = document.createElement("p");
    aboutText.className = "public-profile-about";
    aboutText.textContent = profile.about.trim();

    aboutSection.append(aboutHeading, aboutText);
    panel.append(aboutSection);
  }


  const socials = document.createElement("nav");
  socials.className = "public-profile-social-icons";
  socials.setAttribute("aria-label", "Социальные сети");
  const socialLinks = [
    ["Telegram", "telegram_url", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.9-7.1L3 10.1 21 3Z"/><path d="m9.9 13.9 5.2-5.2"/></svg>'],
    ["Instagram", "instagram_url", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>'],
    ["YouTube", "youtube_url", '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z"/></svg>'],
  ];
  for (const [label, key, icon] of socialLinks) {
    const value = profile[key];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", label);
      link.title = label;
      link.innerHTML = icon;
      socials.append(link);
    } catch {
      // Ignore malformed public profile links.
    }
  }



  const projects = Array.isArray(payload.projects) ? payload.projects : Array.isArray(profile.projects) ? profile.projects : [];
  if (projects.length) {
    const priorityProject = projects[0];
    const priorityHeadingRow = document.createElement("div");
    priorityHeadingRow.className = "public-profile-priority-heading-row";

    const projectHeading = document.createElement("h2");
    projectHeading.className = "public-profile-projects-heading";
    projectHeading.textContent = "Приоритетный проект:";

    const priorityProjectName = document.createElement("h3");
    priorityProjectName.className = "public-profile-priority-project-name";
    priorityProjectName.textContent = priorityProject.name || "Проект";
    priorityHeadingRow.append(projectHeading, priorityProjectName);
    panel.append(priorityHeadingRow);

    const prioritySubtitle = document.createElement("p");
    prioritySubtitle.className = "public-profile-priority-project-subtitle";
    prioritySubtitle.textContent = "Краткое описание проекта";
    panel.append(prioritySubtitle);

    if (priorityProject.description) {
      const priorityDescription = document.createElement("p");
      priorityDescription.className = "public-profile-priority-project-description";
      priorityDescription.textContent = priorityProject.description;
      panel.append(priorityDescription);
    }

    if (projects.length > 1) {
      const list = document.createElement("div");
      list.className = "public-profile-projects";
      for (const project of projects.slice(1)) {
        const item = document.createElement("article");
        item.className = "public-profile-project";
        const title = document.createElement("h3");
        title.textContent = project.name || "Проект";
        item.append(title);
        if (project.description) {
          const text = document.createElement("p");
          text.textContent = project.description;
          item.append(text);
        }
        list.append(item);
      }
      panel.append(list);
    }
  }
  if (socials.childElementCount) panel.append(socials);

  page.append(panel);
  container.append(page);
}
