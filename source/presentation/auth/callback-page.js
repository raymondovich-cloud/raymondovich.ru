// version 2.0
import { completeAuthCallback, getRole } from "../runtime/auth.js";

const message = document.querySelector("#message");

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

async function init() {
  try {
    const session = await completeAuthCallback(window.location.search);
    if (!session) throw new Error("Сессия авторизации не создана.");
    window.location.replace(getRole(session) === "admin" ? "/#/owner" : "/#/");
  } catch {
    setMessage("Ссылка авторизации недействительна или срок её действия истёк.", "error");
  }
}

init();
