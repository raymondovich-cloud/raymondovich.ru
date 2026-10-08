// version 1.0
import { requestPasswordReset } from "../../application/auth/authentication.js";

const form = document.querySelector("#reset-form");
const emailInput = document.querySelector("#email");
const submitButton = form.querySelector(".auth-submit");
const message = document.querySelector("#message");

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  submitButton.disabled = true;

  try {
    await requestPasswordReset(emailInput.value.trim());
    setMessage("Если аккаунт с этим email существует, письмо для сброса пароля уже отправлено. Проверьте почту.");
    form.reset();
  } catch (error) {
    setMessage(error.message || "Не удалось отправить письмо.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
