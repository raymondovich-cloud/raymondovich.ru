<template>
  <div ref="root" class="settings-page">
    <aside class="side" id="side" aria-label="Основная навигация"><div class="side-top"><button class="side-toggle" aria-label="Открыть или закрыть меню" aria-expanded="false"><i class="burger"></i></button><span class="side-brand"><strong>RAYMONDOVICH</strong><em>Навигация</em></span></div>
    <nav class="side-body" aria-label="Основные разделы">
    <a class="side-home" href="/spa.html#/" aria-label="Главная страница raymondovich.ru"><span class="badge">HOME</span><span class="pn"><b>Главная страница</b><em>Обзор платформы</em></span></a>
    <a class="side-home" href="/spa.html#/products" aria-label="Продукты экосистемы"><span class="badge">PRD</span><span class="pn"><b>Продукты экосистемы</b><em>Каталог продуктов</em></span></a>
    <a class="side-home" href="/spa.html#/cooperation" aria-label="Форматы сотрудничества"><span class="badge">COOP</span><span class="pn"><b>Форматы сотрудничества</b><em>Три формата</em></span></a>
    <details class="p partner-guide">
      <summary aria-label="Как стать партнёром — четыре шага"><span class="badge">HOW</span><span class="pn"><b>Как стать партнёром</b><em>Четыре шага</em></span></summary>
      <div class="pd">
        <ol class="ss">
          <li><div><b>Вступление</b>Получите доступ к RAYMONDOVICH Private и личному кабинету на raymondovich.ru.</div></li>
          <li><div><b>Знакомство с проектами</b>Изучите доступные партнёрские предложения, условия участия и информацию о проектах.</div></li>
          <li><div><b>Выбор проекта</b>Выберите подходящее направление и отправьте заявку на участие.</div></li>
          <li><div><b>Сотрудничество</b>После рассмотрения заявки и взаимного согласия согласуйте условия и приступайте к работе с выбранным проектом.</div></li>
        </ol>
        <p class="n">Условия и вознаграждение определяются отдельно для каждого проекта.</p>
      </div>
    </details>
    
    <details class="p faq-sidebar">
      <summary aria-label="Частые вопросы — FAQ"><span class="badge">FAQ</span><span class="pn"><b>Частые вопросы</b><em>FAQ</em></span></summary>
      <div class="pd">
        <ol class="ss">
          <li><div><b>Что я получаю в RAYMONDOVICH Private?</b>Доступ к закрытому пространству, партнёрским предложениям и личному кабинету с рабочей инфраструктурой подключённых проектов.</div></li>
          <li><div><b>Гарантируется ли доход?</b>Нет. Доход не гарантируется: результат зависит от условий конкретного проекта, модели вознаграждения и результатов вашей работы.</div></li>
          <li><div><b>Нужен ли собственный продукт или бизнес?</b>Нет. Вы можете присоединиться к развитию и продвижению действующих проектов экосистемы в качестве партнёра.</div></li>
          <li><div><b>Сколько стоит доступ?</b>Доступ в RAYMONDOVICH Private будет платным. Стоимость и порядок оплаты будут объявлены отдельно.</div></li>
          <li><div><b>Можно ли предложить свой проект?</b>Да. Вы можете представить свой проект для рассмотрения. Сначала мы обсудим его цели и условия возможного сотрудничества; публикация возможна после согласования условий и оформления договорённостей.</div></li>
        </ol>
      </div>
    </details>
    <div class="side-divider" role="separator" aria-hidden="true"></div>
    <a class="side-home profile-link" href="/spa.html#/profile" aria-label="Профиль пользователя"><span class="badge">USR</span><span class="pn"><b>Профиль</b><em>Личный кабинет</em></span></a>
    <a class="side-home settings-link" href="/spa.html#/settings" aria-current="page" aria-label="Настройки аккаунта"><span class="badge">SET</span><span class="pn"><b>Настройки</b><em>Профиль и безопасность</em></span></a>
    <div class="side-home help-link" aria-disabled="true"><span class="badge">HLP</span><span class="pn"><b>Помощь</b><em>Скоро</em></span></div>
    <div class="side-home tariffs-link" aria-disabled="true"><span class="badge">TRF</span><span class="pn"><b>Тарифы и пакеты</b><em>Скоро</em></span></div>
    <div class="side-home theme-link" aria-disabled="true"><span class="badge">THM</span><span class="pn"><b>Светлая тема</b><em>Скоро</em></span></div>
    <div class="side-divider" role="separator" aria-hidden="true"></div>
    <button class="side-home logout-link" type="button" aria-label="Выйти из аккаунта"><span class="badge">OUT</span><span class="pn"><b>Выйти</b><em>Завершить сеанс</em></span></button>
      </nav></aside><div class="scrim"></div>
    <header><div class="wrap"><button class="mob-toggle" aria-label="Открыть меню" aria-expanded="false"><i class="burger"></i></button><a class="logo" href="/spa.html#/">RAYMONDOVICH</a><a href="/spa.html#/" class="back">Главная</a></div></header>
    <main class="wrap settings-main">
    <p class="eyebrow">Личный кабинет / Настройки</p>
    <h1>Настройки<br>аккаунта.</h1>
    <p class="intro">Управление персональными данными, контактной информацией и безопасностью учётной записи.</p>
    <div class="settings-access" role="status" v-if="accessMessage">{{ accessMessage }} <a href="/pages/auth/auth.html">Войти</a></div>
    <div id="settings-content" v-else>
    <section class="settings-section" aria-labelledby="settings-profile-title">
      <div class="settings-section-head"><span class="settings-index">01 / PROFILE</span><div><h2 id="settings-profile-title">Профиль</h2><p>Персональные данные и часовой пояс.</p></div></div>
      <form class="settings-card" id="profile-form" @submit.prevent="saveProfile">
        <div class="settings-grid">
          <label class="settings-field"><span>Имя</span><input name="first_name" v-model="profile.firstName" autocomplete="given-name" maxlength="80" required></label>
          <label class="settings-field"><span>Фамилия</span><input name="last_name" v-model="profile.lastName" autocomplete="family-name" maxlength="80" required></label>
          <label class="settings-field settings-field-wide"><span>Часовой пояс</span><select name="timezone" id="timezone" v-model="profile.timezone" required><option v-for="zone in timezones" :key="zone" :value="zone">{{ zone.replaceAll("_", " ") }}</option></select></label>
        </div>
        <div class="settings-actions"><p class="settings-message" aria-live="polite">{{ profileMessage }}</p><button class="settings-submit" type="submit" :disabled="busy">Сохранить изменения</button></div>
      </form>
    </section>
    <section class="settings-section" aria-labelledby="settings-security-title">
      <div class="settings-section-head"><span class="settings-index">02 / SECURITY</span><div><h2 id="settings-security-title">Безопасность</h2><p>Управление электронной почтой и паролем.</p></div></div>
      <form class="settings-card settings-form" id="email-form" @submit.prevent="changeEmail">
        <div class="settings-card-title"><h3>Электронная почта</h3><p>Текущий адрес: <strong>{{ currentEmail || "—" }}</strong></p></div>
        <label class="settings-field"><span>Новый адрес электронной почты</span><input type="email" name="email" v-model="newEmail" autocomplete="email" placeholder="name@example.com" required></label>
        <div class="settings-actions"><p class="settings-message" aria-live="polite">{{ emailMessage }}</p><button class="settings-submit" type="submit" :disabled="busy">Изменить почту</button></div>
      </form>
      <form class="settings-card settings-form" id="password-form" @submit.prevent="changePassword">
        <div class="settings-card-title"><h3>Пароль</h3><p>Используйте не менее 8 символов.</p></div>
        <div class="settings-grid">
          <label class="settings-field"><span>Новый пароль</span><input type="password" name="password" v-model="newPassword" autocomplete="new-password" minlength="8" required></label>
          <label class="settings-field"><span>Повторите новый пароль</span><input type="password" name="password_confirmation" v-model="passwordConfirmation" autocomplete="new-password" minlength="8" required></label>
        </div>
        <div class="settings-actions"><p class="settings-message" aria-live="polite">{{ passwordMessage }}</p><button class="settings-submit" type="submit" :disabled="busy">Изменить пароль</button></div>
      </form>
    </section>
    </div>
    </main>
    <footer><div class="wrap">© 2026 RAYMONDOVICH — цифровая экосистема.</div></footer>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import {
  getAccountSettings, updateProfileSettings, updateAccountEmail, updateAccountPassword,
} from "../../../../application/account/account-settings.js";
import { usePublicNavigation } from "../../composables/usePublicNavigation.js";

const root = ref(null);
const loading = ref(true);
const busy = ref(false);
const accessMessage = ref("");
const currentEmail = ref("");
const profile = ref({ firstName: "", lastName: "", timezone: "UTC" });
const timezones = ref([]);
const newEmail = ref("");
const newPassword = ref("");
const passwordConfirmation = ref("");
const profileMessage = ref("");
const emailMessage = ref("");
const passwordMessage = ref("");

usePublicNavigation(root);

function availableTimezones(selected) {
  const zones = typeof Intl.supportedValuesOf === "function"
    ? [...Intl.supportedValuesOf("timeZone")]
    : ["UTC", "Europe/Moscow", "Europe/Berlin", "Europe/Amsterdam", "Asia/Yekaterinburg", "Asia/Vladivostok"];
  if (selected && !zones.includes(selected)) zones.unshift(selected);
  return zones;
}

onMounted(async () => {
  try {
    const settings = await getAccountSettings();
    if (!settings) {
      accessMessage.value = "Для управления настройками необходимо войти в аккаунт.";
      return;
    }
    currentEmail.value = settings.email;
    profile.value = {
      firstName: settings.firstName,
      lastName: settings.lastName,
      timezone: settings.timezone,
    };
    timezones.value = availableTimezones(settings.timezone);
  } catch (error) {
    accessMessage.value = error.message || "Не удалось загрузить настройки аккаунта.";
  } finally {
    loading.value = false;
  }
});

async function saveProfile() {
  if (busy.value) return;
  busy.value = true;
  profileMessage.value = "Сохраняем изменения…";
  try {
    await updateProfileSettings(profile.value);
    profileMessage.value = "Данные профиля сохранены.";
  } catch (error) {
    profileMessage.value = error.message || "Не удалось сохранить профиль.";
  } finally {
    busy.value = false;
  }
}

async function changeEmail() {
  if (busy.value) return;
  busy.value = true;
  emailMessage.value = "Отправляем запрос…";
  try {
    await updateAccountEmail(newEmail.value);
    emailMessage.value = "Запрос принят. Подтвердите новый адрес по ссылке из письма.";
    newEmail.value = "";
  } catch (error) {
    emailMessage.value = error.message || "Не удалось изменить почту.";
  } finally {
    busy.value = false;
  }
}

async function changePassword() {
  if (busy.value) return;
  if (newPassword.value !== passwordConfirmation.value) {
    passwordMessage.value = "Пароли не совпадают.";
    return;
  }
  busy.value = true;
  passwordMessage.value = "Обновляем пароль…";
  try {
    await updateAccountPassword(newPassword.value);
    newPassword.value = "";
    passwordConfirmation.value = "";
    passwordMessage.value = "Пароль успешно изменён.";
  } catch (error) {
    passwordMessage.value = error.message || "Не удалось изменить пароль.";
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped src="../../../../design/settings.css"></style>
