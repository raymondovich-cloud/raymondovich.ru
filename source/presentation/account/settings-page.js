// version 1.0
import {
  getAccountSettings,
  updateProfileSettings,
  updateAccountEmail,
  updateAccountPassword,
} from "../../application/account/account-settings.js";

const access = document.querySelector("#settings-access");
const content = document.querySelector("#settings-content");
const profileForm = document.querySelector("#profile-form");
const emailForm = document.querySelector("#email-form");
const passwordForm = document.querySelector("#password-form");

function showMessage(id, text, state = "normal") {
  const element = document.querySelector("#" + id);
  element.textContent = text;
  element.dataset.state = state;
}

function setBusy(form, busy) {
  form.querySelector("button[type=submit]").disabled = busy;
}

function populateTimezones(selected) {
  const select = document.querySelector("#timezone");
  const zones = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC", "Europe/Moscow", "Europe/Berlin", "Europe/Amsterdam", "Asia/Yekaterinburg", "Asia/Vladivostok"];
  if (!zones.includes(selected)) zones.unshift(selected);
  zones.forEach((zone) => {
    const option = document.createElement("option");
    option.value = zone;
    option.textContent = zone.replaceAll("_", " ");
    option.selected = zone === selected;
    select.append(option);
  });
}

async function init() {
  try {
    const settings = await getAccountSettings();
    if (!settings) {
      access.hidden = false;
      access.innerHTML = 'Для управления настройками необходимо <a href="/pages/auth/auth.html">войти в аккаунт</a>.';
      return;
    }
    profileForm.elements.first_name.value = settings.firstName;
    profileForm.elements.last_name.value = settings.lastName;
    populateTimezones(settings.timezone);
    document.querySelector("#current-email").textContent = settings.email || "Не указан";
    content.hidden = false;
  } catch (error) {
    access.hidden = false;
    access.textContent = error.message || "Не удалось загрузить настройки аккаунта.";
  }
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(profileForm, true);
  showMessage("profile-message", "Сохраняем изменения…");
  try {
    await updateProfileSettings({
      firstName: profileForm.elements.first_name.value,
      lastName: profileForm.elements.last_name.value,
      timezone: profileForm.elements.timezone.value,
    });
    showMessage("profile-message", "Данные профиля сохранены.", "success");
  } catch (error) {
    showMessage("profile-message", error.message || "Не удалось сохранить профиль.", "error");
  } finally {
    setBusy(profileForm, false);
  }
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(emailForm, true);
  showMessage("email-message", "Отправляем запрос…");
  try {
    await updateAccountEmail(emailForm.elements.email.value);
    showMessage("email-message", "Запрос принят. Подтвердите новый адрес по ссылке из письма.", "success");
    emailForm.reset();
  } catch (error) {
    showMessage("email-message", error.message || "Не удалось изменить почту.", "error");
  } finally {
    setBusy(emailForm, false);
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordForm.elements.password.value;
  if (password !== passwordForm.elements.password_confirmation.value) {
    showMessage("password-message", "Пароли не совпадают.", "error");
    return;
  }
  setBusy(passwordForm, true);
  showMessage("password-message", "Обновляем пароль…");
  try {
    await updateAccountPassword(password);
    passwordForm.reset();
    showMessage("password-message", "Пароль успешно изменён.", "success");
  } catch (error) {
    showMessage("password-message", error.message || "Не удалось изменить пароль.", "error");
  } finally {
    setBusy(passwordForm, false);
  }
});

init();
