<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import {
  completeAuthCallback, getRole, getSession, login, logout, register,
  requestPasswordReset, subscribeToPasswordRecovery, updatePassword,
} from "../../../runtime/auth.js";

const route = useRoute();
const router = useRouter();
const mode = computed(() => route.meta.authMode || "login");
const title = computed(() => ({
  login: "Войти",
  register: "Создать аккаунт",
  reset: "Сбросить пароль",
  update: "Новый пароль",
  callback: "Проверка авторизации",
}[mode.value] || "Авторизация"));
const subtitle = computed(() => ({
  login: "Авторизация в системе Raymondovich.",
  register: "Регистрация пользователя Raymondovich.",
  reset: "Введите email, который использовали при регистрации.",
  update: "Введите новый пароль для аккаунта Raymondovich.",
  callback: "Подождите, выполняется вход в систему.",
}[mode.value] || ""));
const email = ref("");
const password = ref("");
const passwordConfirmation = ref("");
const displayName = ref("");
const message = ref("");
const isError = ref(false);
const busy = ref(false);
const recoveryReady = ref(false);
let unsubscribeRecovery = null;

function setMessage(value, error = false) {
  message.value = value;
  isError.value = error;
}

function safeRedirect(session) {
  const requested = typeof route.query.redirect === "string" ? route.query.redirect : "";
  if (requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/pages/auth/")) {
    return requested;
  }
  return getRole(session) === "admin" ? "/owner" : "/";
}

async function submitLogin() {
  busy.value = true;
  setMessage("");
  try {
    const result = await login({ email: email.value.trim(), password: password.value });
    await router.replace(safeRedirect(result.session));
  } catch (error) {
    setMessage(error.message || "Не удалось выполнить вход.", true);
  } finally {
    busy.value = false;
  }
}

async function submitRegistration() {
  busy.value = true;
  setMessage("");
  try {
    const result = await register({
      email: email.value.trim(),
      password: password.value,
      displayName: displayName.value.trim(),
    });
    if (!result.session) {
      setMessage("Аккаунт создан. Проверьте почту и подтвердите email.");
      return;
    }
    await router.replace("/");
  } catch (error) {
    setMessage(error.message || "Не удалось выполнить регистрацию.", true);
  } finally {
    busy.value = false;
  }
}

async function submitReset() {
  busy.value = true;
  setMessage("");
  try {
    await requestPasswordReset(email.value.trim());
    setMessage("Если аккаунт с этим email существует, письмо для сброса пароля отправлено. Проверьте почту.");
    email.value = "";
  } catch (error) {
    setMessage(error.message || "Не удалось отправить письмо.", true);
  } finally {
    busy.value = false;
  }
}

async function submitUpdate() {
  if (!recoveryReady.value) return;
  if (password.value !== passwordConfirmation.value) {
    setMessage("Пароли не совпадают.", true);
    return;
  }
  busy.value = true;
  setMessage("");
  try {
    await updatePassword(password.value);
    await logout();
    await router.replace({ name: "auth-login", query: { password: "updated" } });
  } catch (error) {
    setMessage(error.message || "Не удалось изменить пароль.", true);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (route.query.password === "updated") {
    setMessage("Пароль успешно изменён. Войдите с новым паролем.");
  }
  if (mode.value === "callback") {
    try {
      const session = await completeAuthCallback();
      await router.replace(getRole(session) === "admin" ? "/owner" : "/");
    } catch {
      setMessage("Ссылка авторизации недействительна или срок её действия истёк.", true);
    }
    return;
  }
  if (mode.value === "update") {
    unsubscribeRecovery = subscribeToPasswordRecovery(() => {
      recoveryReady.value = true;
      setMessage("Ссылка действительна. Задайте новый пароль.");
    });
    try {
      const session = await getSession();
      if (session) {
        recoveryReady.value = true;
        setMessage("Ссылка действительна. Задайте новый пароль.");
      } else {
        setMessage("Ссылка восстановления недействительна или срок её действия истёк.", true);
      }
    } catch {
      setMessage("Не удалось проверить ссылку восстановления.", true);
    }
  }
});

onBeforeUnmount(() => unsubscribeRecovery?.());
</script>

<template>
  <main class="spa-auth-page">
    <section class="auth-shell">
      <div class="auth-brand">RAYMONDOVICH</div>
      <section class="auth-panel">
        <h1 class="auth-title">{{ title }}</h1>
        <p class="auth-subtitle">{{ subtitle }}</p>

        <form v-if="mode === 'login'" class="auth-form" @submit.prevent="submitLogin">
          <div class="auth-field"><label for="auth-email">Email</label><input id="auth-email" v-model="email" type="email" autocomplete="email" required></div>
          <div class="auth-field"><label for="auth-password">Пароль</label><input id="auth-password" v-model="password" type="password" autocomplete="current-password" minlength="8" required></div>
          <button class="auth-submit" type="submit" :disabled="busy">Войти</button>
        </form>

        <form v-else-if="mode === 'register'" class="auth-form" @submit.prevent="submitRegistration">
          <div class="auth-field"><label for="auth-name">Имя</label><input id="auth-name" v-model="displayName" type="text" autocomplete="name" required></div>
          <div class="auth-field"><label for="auth-register-email">Email</label><input id="auth-register-email" v-model="email" type="email" autocomplete="email" required></div>
          <div class="auth-field"><label for="auth-register-password">Пароль</label><input id="auth-register-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required></div>
          <button class="auth-submit" type="submit" :disabled="busy">Зарегистрироваться</button>
        </form>

        <form v-else-if="mode === 'reset'" class="auth-form" @submit.prevent="submitReset">
          <div class="auth-field"><label for="reset-email">Email</label><input id="reset-email" v-model="email" type="email" autocomplete="email" required></div>
          <button class="auth-submit" type="submit" :disabled="busy">Отправить письмо</button>
        </form>

        <form v-else-if="mode === 'update' && recoveryReady" class="auth-form" @submit.prevent="submitUpdate">
          <div class="auth-field"><label for="new-password">Новый пароль</label><input id="new-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required></div>
          <div class="auth-field"><label for="confirm-password">Повторите пароль</label><input id="confirm-password" v-model="passwordConfirmation" type="password" autocomplete="new-password" minlength="8" required></div>
          <button class="auth-submit" type="submit" :disabled="busy">Изменить пароль</button>
        </form>

        <div class="auth-message" :data-state="isError ? 'error' : 'normal'" aria-live="polite">{{ message }}</div>

        <RouterLink v-if="mode === 'login'" class="auth-switch" to="/auth/reset-password">Забыли пароль?</RouterLink>
        <RouterLink v-if="mode === 'login'" class="auth-switch" to="/auth/register">Создать аккаунт</RouterLink>
        <RouterLink v-if="['register','reset','update'].includes(mode)" class="auth-switch" to="/auth/login">Вернуться к авторизации</RouterLink>
        <RouterLink v-if="mode !== 'callback'" class="auth-switch" to="/">На главную</RouterLink>
      </section>
    </section>
  </main>
</template>

<style scoped src="../../../../design/spa-auth.css"></style>
