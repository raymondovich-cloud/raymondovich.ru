import { supabase } from "/source/infrastructure/supabase/client.js";
import { getAuthRedirectUrl } from "/source/platform/bridge.js";
import { renderAuthenticatedApp } from "./authenticated-app-shell.js";

const AUTH_REDIRECT_URL = getAuthRedirectUrl();
const main = document.querySelector("#main");
let currentSession = null;
let recoveryMode = false;
let observerStarted = false;

const messages = {
  invalid_credentials: "Неверная почта или пароль.",
  email_not_confirmed: "Сначала подтвердите электронную почту по ссылке из письма.",
  user_already_exists: "Аккаунт с такой почтой уже существует. Попробуйте войти.",
  weak_password: "Пароль слишком простой. Используйте более надёжный пароль.",
  rate_limit: "Слишком много попыток. Подождите и попробуйте позже."
};

function syncHeaderAccount(session) {
  const accountLink = document.querySelector("[data-header-account]");
  if (!accountLink) return;
  const signedIn = Boolean(session?.user);
  accountLink.href = "/#authorization";
  accountLink.innerHTML = signedIn
    ? 'Личный кабинет <span aria-hidden="true">↗</span>'
    : 'Авторизация <span aria-hidden="true">↗</span>';
}

function errorText(error) {
  const message = String(error?.message || "").toLowerCase();
  const match = Object.entries(messages).find(([key]) => message.includes(key));
  if (match) return match[1];
  if (message.includes("invalid login credentials")) return messages.invalid_credentials;
  if (message.includes("email not confirmed")) return messages.email_not_confirmed;
  if (message.includes("password")) return "Не удалось обработать пароль. Проверьте требования и попробуйте снова.";
  return "Не удалось выполнить действие. Проверьте данные и повторите попытку.";
}

function setNotice(root, message, type = "info") {
  const notice = root?.querySelector("[data-auth-notice]");
  if (!notice) return;
  notice.textContent = message;
  notice.dataset.type = type;
  notice.hidden = !message;
}

function setBusy(root, busy) {
  root?.querySelectorAll("button[type=submit]").forEach((button) => {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
  });
}

function showPanel(root, panel) {
  root.querySelectorAll("[data-auth-panel]").forEach((element) => {
    element.hidden = element.dataset.authPanel !== panel;
  });
  root.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.authSwitch === panel));
  });
  setNotice(root, "");
}

function renderSignedOut(root) {
  document.body.dataset.page = "authorization";
  const shell = root.querySelector("[data-auth-shell]");
  if (!shell) return;
  delete shell.dataset.ownerWorkspace;
  delete shell.dataset.welcomeComplete;
  shell.innerHTML = `
    <div class="auth-heading">
      <p class="overline">RAYMONDOVICH / ACCOUNT</p>
      <h2>Единый аккаунт экосистемы</h2>
      <p>Войдите, чтобы получить доступ к доступным вам пространствам и инструментам.</p>
    </div>
    <div class="auth-card">
      <div class="auth-switches" role="group" aria-label="Выберите действие">
        <button type="button" data-auth-switch="login" aria-pressed="true">Вход</button>
        <button type="button" data-auth-switch="register" aria-pressed="false">Регистрация</button>
      </div>
      <div class="auth-notice" data-auth-notice role="status" aria-live="polite" hidden></div>
      <form data-auth-panel="login" class="auth-form">
        <label>Электронная почта<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" required minlength="10"></label>
        <button class="button primary" type="submit">Войти в аккаунт</button>
        <button class="auth-text-button" type="button" data-auth-switch="forgot">Забыли пароль?</button>
      </form>
      <form data-auth-panel="register" class="auth-form" hidden>
        <label>Имя<input name="display_name" type="text" autocomplete="name" maxlength="80"></label>
        <label>Электронная почта<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <label>Пароль<input name="password" type="password" autocomplete="new-password" required minlength="10"></label>
        <label>Повторите пароль<input name="password_confirm" type="password" autocomplete="new-password" required minlength="10"></label>
        <button class="button primary" type="submit">Создать аккаунт</button>
        <p class="auth-legal">Создание аккаунта не предоставляет автоматически статус партнёра или доступ к закрытым проектам.</p>
      </form>
      <form data-auth-panel="forgot" class="auth-form" hidden>
        <p>Укажите почту аккаунта. Мы отправим ссылку для восстановления пароля.</p>
        <label>Электронная почта<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <button class="button primary" type="submit">Отправить ссылку</button>
        <button class="auth-text-button" type="button" data-auth-switch="login">Вернуться ко входу</button>
      </form>
      <form data-auth-panel="recovery" class="auth-form" hidden>
        <p>Установите новый пароль для аккаунта.</p>
        <label>Новый пароль<input name="password" type="password" autocomplete="new-password" required minlength="10"></label>
        <label>Повторите пароль<input name="password_confirm" type="password" autocomplete="new-password" required minlength="10"></label>
        <button class="button primary" type="submit">Сохранить пароль</button>
      </form>
    </div>
    <p class="auth-footnote">Защищённая авторизация · Supabase Auth</p>`;
  showPanel(shell, recoveryMode ? "recovery" : "login");
}

function renderSignedIn(root, user) {
  const shell = root.matches?.("[data-auth-shell]") ? root : root.querySelector("[data-auth-shell]");
  if (!shell) return;
  renderAuthenticatedApp(shell, user);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function ensureProfile(user) {
  const displayName = user.user_metadata?.display_name || null;
  const { error } = await supabase.from("user_profiles").upsert(
    { user_id: user.id, display_name: displayName },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (error) console.warn("Profile initialization skipped:", error.message);
}

function bindForms(root) {
  root.addEventListener("click", async (event) => {
    const ownerModule = event.target.closest("[data-owner-module]");
    if (ownerModule) {
      event.preventDefault();
      const route = ownerModule.getAttribute("href");
      if (!route || !route.startsWith("#authorization/")) return;
      window.RaymondovichNavigation?.navigateRoute(route);
      if (!window.RaymondovichNavigation) location.hash = route;
      return;
    }
    if (event.target.closest("[data-coming-soon]")) {
      event.preventDefault();
      return;
    }
    const switcher = event.target.closest("[data-auth-switch]");
    if (switcher) {
      showPanel(root, switcher.dataset.authSwitch);
      return;
    }
    if (event.target.closest("[data-pin-change]")) {
      window.RaymondovichPinGuard?.changePin();
      return;
    }
    if (event.target.closest("[data-auth-lock]")) {
      window.RaymondovichPinGuard?.lock();
      return;
    }
    if (event.target.closest("[data-auth-signout]")) {
      const { error } = await supabase.auth.signOut();
      if (error) setNotice(root, errorText(error), "error");
    }
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-auth-panel]");
    if (!form) return;
    event.preventDefault();
    const panel = form.dataset.authPanel;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    setNotice(root, "");
    setBusy(root, true);

    try {
      if (panel === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (panel === "register") {
        const confirmation = String(data.get("password_confirm") || "");
        if (password !== confirmation) throw new Error("Пароли не совпадают.");
        if (password.length < 10) throw new Error("Пароль должен содержать не менее 10 символов.");
        const displayName = String(data.get("display_name") || "").trim();
        const { data: result, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            data: displayName ? { display_name: displayName } : {}
          }
        });
        if (error) throw error;
        if (result.session) {
          currentSession = result.session;
          await ensureProfile(result.user);
          renderSignedIn(root, result.user);
        } else {
          showPanel(root, "login");
          setNotice(root, "Аккаунт создан. Проверьте электронную почту и подтвердите адрес по ссылке из письма.", "success");
        }
      } else if (panel === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: AUTH_REDIRECT_URL
        });
        if (error) throw error;
        setNotice(root, "Если аккаунт с таким адресом существует, письмо для восстановления будет отправлено. Проверьте также папку «Спам».", "success");
      } else if (panel === "recovery") {
        const confirmation = String(data.get("password_confirm") || "");
        if (password !== confirmation) throw new Error("Пароли не совпадают.");
        if (password.length < 10) throw new Error("Пароль должен содержать не менее 10 символов.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        recoveryMode = false;
        showPanel(root, "login");
        setNotice(root, "Пароль успешно изменён. Теперь можно пользоваться аккаунтом.", "success");
      }
    } catch (error) {
      setNotice(root, errorText(error), "error");
    } finally {
      setBusy(root, false);
    }
  });
}

async function renderAuth() {
  const root = document.querySelector("#main");
  if (!root || !location.hash.startsWith("#authorization")) return;
  const shell = root.querySelector("[data-auth-shell]");
  if (!shell || shell.dataset.bound === "true") return;
  shell.dataset.bound = "true";
  bindForms(shell);
  if (currentSession?.user) renderSignedIn(root, currentSession.user);
  else renderSignedOut(root);

  const { data, error } = await supabase.auth.getSession();
  if (!error) {
    currentSession = data.session;
    if (data.session?.user) {
      await ensureProfile(data.session.user);
      renderSignedIn(root, data.session.user);
    } else {
      renderSignedOut(root);
    }
  }
}

function watchMain() {
  if (!main || observerStarted) return;
  observerStarted = true;
  const observer = new MutationObserver(() => {
    if (location.hash.startsWith("#authorization")) renderAuth();
  });
  observer.observe(main, { childList: true, subtree: true });
}

supabase.auth.onAuthStateChange((event, session) => {
  currentSession = session;
  syncHeaderAccount(session);
  if (event === "PASSWORD_RECOVERY") recoveryMode = true;
  if (event === "SIGNED_OUT") {
    try { sessionStorage.removeItem("raymondovich.auth-welcome-complete"); } catch { /* Optional session preference. */ }
  }
  if (!["SIGNED_IN", "SIGNED_OUT", "PASSWORD_RECOVERY", "INITIAL_SESSION"].includes(event)) return;
  if (!location.hash.startsWith("#authorization")) return;
  queueMicrotask(() => {
    const root = document.querySelector("#main");
    const shell = root?.querySelector("[data-auth-shell]");
    if (!shell) return;
    if (event === "PASSWORD_RECOVERY") renderSignedOut(root);
    else if (session?.user) {
      ensureProfile(session.user);
      renderSignedIn(root, session.user);
    } else renderSignedOut(root);
  });
});

watchMain();
supabase.auth.getSession().then(({ data, error }) => {
  if (!error) {
    currentSession = data.session;
    syncHeaderAccount(data.session);
  }
});
document.addEventListener("raymondovich:navigation", event => {
  const state = event.detail;
  if (!state?.route?.startsWith("#authorization") || !currentSession?.user) return;

  const activeView = main?.querySelector("[data-app-view]");
  const route = state.route;
  const expectedScreen = route === "#authorization" || route === "#authorization/profile"
    ? "profile"
    : route === "#authorization/profile-settings" ? "profile-settings"
      : route === "#authorization/projects" ? "projects"
        : route === "#authorization/ideas" ? "ideas"
          : route === "#authorization/tools" ? "tools"
            : route === "#authorization/control-center" ? "control-center"
              : route === "#authorization/favorites" ? "избранное"
                : route === "#authorization/reports" ? "отчёты"
                  : route === "#authorization/modules" ? "управление-модулями"
                    : "profile";

  // Existing module controllers restore nested screens themselves while their workspace remains mounted.
  // Rebuild the shell when a route transition or browser Back returns to a workspace that is no longer mounted.
  if (state.screen === "route" || activeView?.dataset.appScreen !== expectedScreen) {
    renderSignedIn(main, currentSession.user);
  }
});
window.addEventListener("hashchange", renderAuth);
if (location.hash.startsWith("#authorization")) renderAuth();
