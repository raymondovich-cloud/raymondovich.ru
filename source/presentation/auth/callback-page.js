// version 2.0
import { completeAuthCallback } from "../runtime/auth.js";

const message = document.querySelector("#message");

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

async function init() {
  try {
    await completeAuthCallback(window.location.search);
    window.location.replace("/spa.html#/owner");
  } catch {
    setMessage("Ссылка авторизации недействительна или срок её действия истёк.", "error");
  }
}

init();
