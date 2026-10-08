// version 1.0
import { supabase } from "../../infrastructure/supabase/client.js";

const message = document.querySelector("#message");

function setMessage(text, state = "normal") {
  message.textContent = text;
  message.dataset.state = state;
}

async function init() {
  const { error } = await supabase.auth.exchangeCodeForSession(window.location.search);

  if (error) {
    setMessage("Ссылка авторизации недействительна или срок её действия истёк.", "error");
    return;
  }

  window.location.replace("./app.html");
}

init();
