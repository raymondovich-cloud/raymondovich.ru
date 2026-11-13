import { supabase } from "../../infrastructure/supabase/client.js";
const form = document.querySelector("#password-form");
const status = document.querySelector("#password-status");
const { data } = await supabase.auth.getSession();
if (!data.session) {
  status.hidden = false;
  status.dataset.kind = "error";
  status.textContent = "Ссылка для смены пароля недействительна или устарела. Запросите восстановление повторно.";
  form.hidden = true;
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  const password = new FormData(form).get("password");
  const { error } = await supabase.auth.updateUser({ password: String(password) });
  status.hidden = false;
  status.dataset.kind = error ? "error" : "success";
  status.textContent = error ? error.message : "Пароль обновлён. Перенаправляем на страницу аккаунта…";
  if (!error) setTimeout(() => window.location.replace("/app.html"), 700);
  else button.disabled = false;
});
