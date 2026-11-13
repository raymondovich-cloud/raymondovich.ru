import { supabase } from "../../infrastructure/supabase/client.js";

const target = document.querySelector("#callback-status");
const { data, error } = await supabase.auth.getSession();
if (error || !data.session) {
  target.textContent = "Ссылка недействительна или устарела. Вернитесь на страницу входа и запросите новое письмо.";
} else {
  target.textContent = "Email подтверждён. Перенаправляем в аккаунт…";
  window.setTimeout(() => {
    try {
      const requested = window.sessionStorage.getItem("raymondovich-auth-return");
      window.sessionStorage.removeItem("raymondovich-auth-return");
      window.location.replace(requested && /^\/#(?:projects|ideas|team|tools|profile(?:\/settings)?)$/.test(requested) ? requested : "/#projects");
    } catch {
      window.location.replace("/#projects");
    }
  }, 700);
}