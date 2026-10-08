// version 1.1
import { getSession, login, register, getRole } from "../../application/auth/authentication.js";

const form = document.querySelector("#auth-form");
const title = document.querySelector("#auth-title");
const subtitle = document.querySelector("#auth-subtitle");
const displayNameField = document.querySelector("#display-name-field");
const displayNameInput = document.querySelector("#display-name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitButton = document.querySelector("#submit-button");
const switchButton = document.querySelector("#switch-button");
const message = document.querySelector("#message");

let mode = "login";

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

function renderMode() {
  const registration = mode === "register";

  title.textContent = registration ? "Создать аккаунт" : "Войти";
  subtitle.textContent = registration
    ? "Регистрация пользователя Raymondovich."
    : "Авторизация в системе Raymondovich.";
  displayNameField.hidden = !registration;
  displayNameInput.required = registration;
  submitButton.textContent = registration ? "Зарегистрироваться" : "Войти";
  switchButton.textContent = registration
    ? "У меня уже есть аккаунт"
    : "Создать аккаунт";
  setMessage("");
}

async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) {
    window.location.replace("./app.html");
  }
}

switchButton.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  renderMode();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const displayName = mode === "register" ? displayNameInput.value.trim() : "";

  submitButton.disabled = true;

  try {
    if (mode === "register") {
      const data = await register({ email, password, displayName });

      if (!data.session) {
        setMessage("Аккаунт создан. Проверьте почту и подтвердите email.");
        return;
      }

      window.location.replace("./app.html");
      return;
    }

    const data = await login({ email, password });
    const role = getRole(data.session);

    if (!role) {
      throw new Error("Не удалось определить роль пользователя.");
    }

    window.location.replace("./app.html");
  } catch (error) {
    setMessage(error.message || "Не удалось выполнить операцию.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

renderMode();
redirectIfAuthenticated();
