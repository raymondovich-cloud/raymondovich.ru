// version 2.0
import {
  getSession, logout, subscribeToPasswordRecovery, updatePassword,
} from "../runtime/auth.js";

const form = document.querySelector("#update-password-form");
const passwordInput = document.querySelector("#password");
const confirmationInput = document.querySelector("#password-confirmation");
const submitButton = form.querySelector(".auth-submit");
const message = document.querySelector("#message");

let recoverySession = false;

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

function enableForm() {
  recoverySession = true;
  form.hidden = false;
  setMessage("Ссылка действительна. Задайте новый пароль.");
}

function disableForm(text) {
  recoverySession = false;
  form.hidden = true;
  setMessage(text, "error");
}

const unsubscribeRecovery = subscribeToPasswordRecovery(enableForm);

async function init() {
  try {
    const session = await getSession();
    if (!session) {
      disableForm("Ссылка восстановления недействительна или срок её действия истёк.");
      return;
    }
    enableForm();
  } catch {
    disableForm("Не удалось проверить ссылку восстановления.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!recoverySession) return;

  if (passwordInput.value !== confirmationInput.value) {
    setMessage("Пароли не совпадают.", "error");
    return;
  }

  setMessage("");
  submitButton.disabled = true;

  try {
    await updatePassword(passwordInput.value);
    await logout();
    unsubscribeRecovery();
    window.location.replace("/spa.html#/auth/login?password=updated");
  } catch (error) {
    setMessage(error.message || "Не удалось изменить пароль.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

form.hidden = true;
init();
