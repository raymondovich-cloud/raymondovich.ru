/* Version: 1.0.2 */
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
