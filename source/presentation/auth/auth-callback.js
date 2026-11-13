import { supabase } from "../../infrastructure/supabase/client.js";

const target = document.querySelector("#callback-status");
const { data, error } = await supabase.auth.getSession();
if (error || !data.session) {
  target.textContent = "Ссылка недействительна или устарела. Вернитесь на страницу входа и запросите новое письмо.";
} else {
  target.textContent = "Email подтверждён. Перенаправляем в аккаунт…";
  window.setTimeout(() => window.location.replace("/app.html"), 700);
}
