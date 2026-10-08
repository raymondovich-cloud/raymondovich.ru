// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";
import { updatePassword } from "../../application/auth/authentication.js";

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

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    enableForm();
  }
});

async function init() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    disableForm("Ссылка восстановления недействительна или срок её действия истёк.");
    return;
  }

  enableForm();
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
    await supabase.auth.signOut();
    window.location.replace("./auth.html?password=updated");
  } catch (error) {
    setMessage(error.message || "Не удалось изменить пароль.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

form.hidden = true;
init();
