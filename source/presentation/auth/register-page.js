// version 1.0
import { getSession, register } from "../../application/auth/authentication.js";

const form = document.querySelector("#registration-form");
const displayNameInput = document.querySelector("#display-name");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const submitButton = form.querySelector(".auth-submit");
const message = document.querySelector("#message");

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

async function redirectIfAuthenticated() {
  const session = await getSession();
  if (session) window.location.replace("./app.html");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  submitButton.disabled = true;

  try {
    const data = await register({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      displayName: displayNameInput.value.trim(),
    });

    if (!data.session) {
      setMessage("Аккаунт создан. Проверьте почту и подтвердите email.");
      return;
    }

    window.location.replace("./app.html");
  } catch (error) {
    setMessage(error.message || "Не удалось выполнить регистрацию.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

redirectIfAuthenticated();
