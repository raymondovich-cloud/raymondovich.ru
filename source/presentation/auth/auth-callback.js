import { supabase } from "../../infrastructure/supabase/client.js";

const target = document.querySelector("#callback-status");
const { data, error } = await supabase.auth.getSession();
if (error || !data.session) {
  target.textContent = "Ссылка недействительна или устарела. Вернитесь на страницу входа и запросите новое письмо.";
} else {
  target.textContent = "Email подтверждён. Перенаправляем в аккаунт…";
  window.setTimeout(() => window.location.replace((() => { try { const target = window.sessionStorage.getItem("raymondovich-auth-return"); if (target && /^\/#(?:projects|ideas|team|tools|profile(?:\/settings)?)$/.test(target)) { window.sessionStorage.removeItem("raymondovich-auth-return"); return target; } } catch {} return "/#projects"; })()), 700);
}
