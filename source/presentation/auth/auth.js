import { supabase } from "../../infrastructure/supabase/client.js";

const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const statusBox = document.querySelector("#auth-status");
const title = document.querySelector("#auth-title");
const description = document.querySelector("#auth-description");
const modeButtons = [...document.querySelectorAll("[data-mode]")];

function showStatus(message, kind = "success") {
  statusBox.hidden = false;
  statusBox.dataset.kind = kind;
  statusBox.textContent = message;
}
function clearStatus() { statusBox.hidden = true; statusBox.textContent = ""; }
function setBusy(form, busy) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
  button.textContent = busy ? "Подождите…" : (form === loginForm ? "Войти" : "Создать аккаунт");
}
function setMode(mode) {
  const registering = mode === "register";
  loginForm.hidden = registering;
  registerForm.hidden = !registering;
  modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === mode)));
  title.textContent = registering ? "Создайте аккаунт" : "Добро пожаловать";
  description.textContent = registering ? "Заполните данные для регистрации." : "Войдите в своё пространство.";
  clearStatus();
}
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));

const { data: initialSession } = await supabase.auth.getSession();
function getPostAuthTarget() {
  try {
    const target = window.sessionStorage.getItem("raymondovich-auth-return");
    if (target && /^\/#(?:projects|ideas|team|tools|profile(?:\/settings)?)$/.test(target)) {
      window.sessionStorage.removeItem("raymondovich-auth-return");
      return target;
    }
  } catch {
    // Fall back to the default workspace route.
  }
  return "/#projects";
}

if (initialSession.session) window.location.replace(getPostAuthTarget());

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  setBusy(loginForm, true);
  const form = new FormData(loginForm);
  const identifier = String(form.get("identifier")).trim();
  const password = String(form.get("password"));
  try {
    let error;
    if (identifier.includes("@")) {
      ({ error } = await supabase.auth.signInWithPassword({ email: identifier, password }));
    } else {
      const response = await fetch("https://yajybgdorhxebbigwjgi.supabase.co/functions/v1/username-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: "sb_publishable_2d3FG3DEk49zKUdJDm3VrA_SAwLL1pp" },
        body: JSON.stringify({ username: identifier, password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.session) throw new Error(payload.error || "Неверный логин или пароль.");
      ({ error } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      }));
    }
    if (error) throw error;
    window.location.replace(getPostAuthTarget());
  } catch (error) {
    showStatus(error.message || "Не удалось выполнить вход.", "error");
  } finally {
    setBusy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  setBusy(registerForm, true);
  const form = new FormData(registerForm);
  const fullName = String(form.get("full_name")).trim().replace(/\s+/g, " ");
  const birthDate = String(form.get("birth_date"));
  const username = String(form.get("username")).trim().toLowerCase();
  const email = String(form.get("email")).trim().toLowerCase();
  const password = String(form.get("password"));
  const date = new Date(birthDate + "T00:00:00");
  if (!Number.isFinite(date.getTime()) || date > new Date()) {
    showStatus("Укажите корректную дату рождения.", "error");
    setBusy(registerForm, false);
    return;
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) {
    showStatus("Логин должен содержать 3–24 допустимых символа.", "error");
    setBusy(registerForm, false);
    return;
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: new URL("/?auth=callback", window.location.origin).href,
        data: { full_name: fullName, birth_date: birthDate, username },
      },
    });
    if (error) throw error;
    if (data.session) {
      window.location.replace("/#projects");
      return;
    }
    showStatus("Аккаунт создан. Проверьте почту и подтвердите Email, чтобы войти.", "success");
    registerForm.reset();
  } catch (error) {
    const message = /duplicate key|unique constraint/i.test(error.message)
      ? "Этот логин уже занят. Выберите другой."
      : (error.message || "Не удалось создать аккаунт.");
    showStatus(message, "error");
  } finally {
    setBusy(registerForm, false);
  }
});

document.querySelector("#forgot-password").addEventListener("click", async () => {
  clearStatus();
  const identifier = String(new FormData(loginForm).get("identifier") || "").trim();
  if (!identifier.includes("@")) {
    showStatus("Для восстановления пароля укажите Email, привязанный к аккаунту.", "error");
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
    redirectTo: new URL("/?auth=recovery", window.location.origin).href,
  });
  if (error) showStatus(error.message, "error");
  else showStatus("Если аккаунт с таким Email существует, письмо для восстановления отправлено.", "success");
});
