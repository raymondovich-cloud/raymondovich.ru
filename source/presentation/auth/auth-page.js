// version 1.2
import { getSession, login, getRole } from "../../application/auth/authentication.js";

const form = document.querySelector("#auth-form");
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
    const data = await login({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });
    if (!getRole(data.session)) throw new Error("Не удалось определить роль пользователя.");
    window.location.replace("./app.html");
  } catch (error) {
    setMessage(error.message || "Не удалось выполнить вход.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

redirectIfAuthenticated();
