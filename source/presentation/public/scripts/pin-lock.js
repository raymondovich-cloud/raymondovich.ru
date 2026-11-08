import { supabase } from "/source/infrastructure/supabase/client.js";

const RESET_FLAG = "raymondovich.pin.reset-requested";
const UNLOCKED_KEY = "raymondovich.pin.unlocked-user";
const HASH_ITERATIONS = 600_000;

let gateRoot = null;
let initSequence = 0;
let resolveReady;
let changeMode = false;
let resetRequested = false;

function storageGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* A blocked storage area must not break authentication. */ }
}

function storageRemove(key) {
  try { sessionStorage.removeItem(key); } catch { /* A blocked storage area must not break authentication. */ }
}

function isResetRequested() {
  return resetRequested || storageGet(RESET_FLAG) === "1";
}

const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

function decodeAuthTime(token) {
  try {
    const encoded = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!encoded) return null;
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")));
    return Number.isInteger(payload.auth_time) ? payload.auth_time : null;
  } catch {
    return null;
  }
}

function hasRecentPasswordAuth(session) {
  const authTime = decodeAuthTime(session?.access_token || "");
  const now = Math.floor(Date.now() / 1000);
  return Boolean(authTime && authTime <= now + 60 && now - authTime <= 300);
}

async function invoke(action, values = {}) {
  const { data, error } = await supabase.functions.invoke("pin-auth", {
    body: { action, ...values }
  });

  if (error) {
    let payload = null;
    try {
      payload = await error.context?.json();
    } catch {
      // The gateway may return a non-JSON error response.
    }
    const failure = new Error(payload?.error || "pin_service_unavailable");
    failure.status = error.context?.status || 0;
    failure.payload = payload;
    throw failure;
  }

  if (data?.error) {
    const failure = new Error(data.error);
    failure.payload = data;
    throw failure;
  }
  return data;
}

function messageFor(error) {
  const code = error?.message || "";
  const messages = {
    invalid_pin: "Неверный PIN. Проверьте код и попробуйте ещё раз.",
    pin_temporarily_locked: "Слишком много неверных попыток. Ввод временно заблокирован на 15 минут.",
    pin_not_set: "PIN ещё не создан. Обновите страницу.",
    pin_already_exists: "PIN уже создан. Используйте его для входа.",
    recent_password_auth_required: "Для сброса PIN сначала войдите по основному паролю.",
    pin_service_unavailable: "Сервис PIN временно недоступен. Повторите попытку позже."
  };
  return messages[code] || "Не удалось выполнить действие. Повторите попытку.";
}

function ensureRoot() {
  if (gateRoot?.isConnected) return gateRoot;
  gateRoot = document.createElement("div");
  gateRoot.id = "pin-lock-root";
  gateRoot.className = "pin-lock-root";
  gateRoot.hidden = true;
  document.body.append(gateRoot);
  return gateRoot;
}

function setLocked(locked) {
  document.documentElement.classList.toggle("pin-guard-locked", locked);
  document.documentElement.classList.remove("pin-guard-pending");
}

function removeGate() {
  if (gateRoot) {
    gateRoot.remove();
    gateRoot = null;
  }
  setLocked(false);
}

function renderGate(mode, notice = "") {
  const root = ensureRoot();
  const isSetup = mode === "setup";
  const isReset = mode === "reset";
  const isVerify = mode === "verify";
  root.hidden = false;
  changeMode = false;
  setLocked(true);

  const title = isSetup ? "Создайте PIN-код" : isReset ? "Установите новый PIN" : "Введите PIN-код";
  const description = isSetup
    ? "Создайте единый четырёхзначный код для быстрого доступа к экосистеме."
    : isReset
      ? "Подтверждён вход по основному паролю. Задайте новый PIN для всех платформ."
      : "Для продолжения подтвердите доступ к своей учётной записи.";
  const fields = isVerify
    ? '<label class="pin-lock-label">Четырёхзначный PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required></label>'
    : '<label class="pin-lock-label">Новый PIN<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password" required></label><label class="pin-lock-label">Повторите PIN<input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password" required></label>';

  root.innerHTML = `
    <section class="pin-lock-card" role="dialog" aria-modal="true" aria-labelledby="pin-lock-title">
      <p class="pin-lock-overline">RAYMONDOVICH / SECURITY</p>
      <div class="pin-lock-mark" aria-hidden="true">R.</div>
      <h1 id="pin-lock-title">${title}</h1>
      <p class="pin-lock-description">${description}</p>
      <form data-pin-gate-form>
        ${fields}
        <p class="pin-lock-notice" data-pin-notice role="alert" ${notice ? "" : "hidden"}>${notice}</p>
        <button class="pin-lock-submit" type="submit">${isSetup || isReset ? "Сохранить PIN" : "Разблокировать"}</button>
      </form>
      ${isVerify ? '<button class="pin-lock-link" type="button" data-pin-forgot>Забыли PIN? Войти по паролю</button>' : ""}
      <button class="pin-lock-exit" type="button" data-pin-signout>Выйти из аккаунта</button>
      <p class="pin-lock-footnote">Защищённая сессия · Supabase Auth</p>
    </section>`;

  root.querySelector("[data-pin-gate-form]")?.addEventListener("submit", onGateSubmit);
  root.querySelector("[data-pin-forgot]")?.addEventListener("click", requestPinReset);
  root.querySelector("[data-pin-signout]")?.addEventListener("click", async () => {
    storageRemove(UNLOCKED_KEY);
    await supabase.auth.signOut();
    location.hash = "#authorization";
  });
  root.querySelector('input[name="pin"], input[name="newPin"]')?.focus();
}

function showNotice(message) {
  const notice = gateRoot?.querySelector("[data-pin-notice]");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = !message;
}

function pinValues(form) {
  const values = new FormData(form);
  return {
    pin: String(values.get("pin") || ""),
    newPin: String(values.get("newPin") || ""),
    confirmPin: String(values.get("confirmPin") || "")
  };
}

async function onGateSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const mode = form.querySelector('[name="pin"]') ? "verify" : (isResetRequested() ? "reset" : "setup");
  const values = pinValues(form);

  if (mode !== "verify" && values.newPin !== values.confirmPin) {
    showNotice("PIN-коды не совпадают.");
    return;
  }
  if ((mode === "verify" ? values.pin : values.newPin).length !== 4) {
    showNotice("PIN должен состоять ровно из четырёх цифр.");
    return;
  }

  submit.disabled = true;
  try {
    if (mode === "verify") {
      await invoke("verify", { pin: values.pin });
    } else {
      await invoke(mode, { newPin: values.newPin });
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) storageSet(UNLOCKED_KEY, data.session.user.id);
    resetRequested = false; storageRemove(RESET_FLAG);
    removeGate();
  } catch (error) {
    showNotice(messageFor(error));
    if (error?.payload?.lockedUntil) {
      const until = new Date(error.payload.lockedUntil);
      showNotice(`Слишком много неверных попыток. Повторите после ${until.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.`);
    }
  } finally {
    if (submit.isConnected) submit.disabled = false;
  }
}

async function requestPinReset() {
  resetRequested = true; storageSet(RESET_FLAG, "1");
  storageRemove(UNLOCKED_KEY);
  await supabase.auth.signOut();
  location.hash = "#authorization";
}

async function initialize() {
  const sequence = ++initSequence;
  const { data, error } = await supabase.auth.getSession();
  if (sequence !== initSequence) return;
  if (error) {
    renderGate("verify", "Не удалось проверить сессию. Обновите страницу или войдите заново.");
    return;
  }

  const session = data.session;
  if (!session?.user) {
    storageRemove(UNLOCKED_KEY);
    removeGate();
    return;
  }

  if (storageGet(UNLOCKED_KEY) === session.user.id && !isResetRequested()) {
    removeGate();
    return;
  }

  try {
    const status = await invoke("status");
    if (sequence !== initSequence) return;

    if (isResetRequested()) {
      if (!hasRecentPasswordAuth(session)) {
        renderGate("verify", "Для сброса PIN необходимо заново войти по электронной почте и паролю.");
        const form = gateRoot.querySelector("[data-pin-gate-form]");
        form.hidden = true;
        gateRoot.querySelector("[data-pin-lock-title]").textContent = "Требуется повторный вход";
        gateRoot.querySelector(".pin-lock-description").textContent = "Выйдите из аккаунта и выполните вход по основному паролю, чтобы установить новый PIN.";
        gateRoot.querySelector("[data-pin-forgot]")?.remove();
        return;
      }
      renderGate("reset");
      return;
    }

    renderGate(status.hasPin ? "verify" : "setup",
      status.lockedUntil && new Date(status.lockedUntil).getTime() > Date.now()
        ? "Ввод PIN временно заблокирован после нескольких неверных попыток."
        : ""
    );
  } catch (error) {
    renderGate("verify", messageFor(error));
    const form = gateRoot.querySelector("[data-pin-gate-form]");
    form.hidden = true;
    const retry = document.createElement("button");
    retry.className = "pin-lock-submit";
    retry.type = "button";
    retry.textContent = "Ввести PIN-код";
    retry.addEventListener("click", () => renderGate("verify"));
    form.after(retry);
  }
}

async function lock() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  storageRemove(UNLOCKED_KEY);
  renderGate("verify");
}

async function changePin() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  const root = ensureRoot();
  root.hidden = false;
  changeMode = true;
  setLocked(true);
  root.innerHTML = `
    <section class="pin-lock-card" role="dialog" aria-modal="true" aria-labelledby="pin-lock-title">
      <p class="pin-lock-overline">RAYMONDOVICH / SECURITY</p>
      <div class="pin-lock-mark" aria-hidden="true">R.</div>
      <h1 id="pin-lock-title">Изменить PIN</h1>
      <p class="pin-lock-description">Новый PIN сразу станет действительным на всех платформах.</p>
      <form data-pin-change-form>
        <label class="pin-lock-label">Текущий PIN<input name="currentPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
        <label class="pin-lock-label">Новый PIN<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
        <label class="pin-lock-label">Повторите новый PIN<input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
        <p class="pin-lock-notice" data-pin-notice role="alert" hidden></p>
        <button class="pin-lock-submit" type="submit">Сохранить новый PIN</button>
      </form>
      <button class="pin-lock-link" type="button" data-pin-cancel>Отмена</button>
    </section>`;
  root.querySelector("[data-pin-cancel]")?.addEventListener("click", removeGate);
  root.querySelector("[data-pin-change-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const currentPin = String(values.get("currentPin") || "");
    const newPin = String(values.get("newPin") || "");
    const confirmPin = String(values.get("confirmPin") || "");
    if (newPin !== confirmPin) {
      showNotice("Новые PIN-коды не совпадают.");
      return;
    }
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      showNotice("Каждый PIN должен состоять ровно из четырёх цифр.");
      return;
    }
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      await invoke("change", { currentPin, newPin });
      const session = (await supabase.auth.getSession()).data.session;
      if (session?.user) storageSet(UNLOCKED_KEY, session.user.id);
      removeGate();
    } catch (error) {
      showNotice(messageFor(error));
    } finally {
      if (submit.isConnected) submit.disabled = false;
    }
  });
  root.querySelector('input[name="currentPin"]')?.focus();
}

window.RaymondovichPinGuard = { ready, lock, changePin };

function start() {
  document.documentElement.classList.add("pin-guard-pending");
  initialize().finally(() => resolveReady(true));
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      initialize();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
