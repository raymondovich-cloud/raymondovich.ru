<template>
  <div ref="root" class="profile-page">
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
    <a class="side-home profile-link" href="/spa.html#/profile" aria-label="Профиль пользователя" aria-current="page"><span class="badge">USR</span><span class="pn"><b>Профиль</b><em>Личный кабинет</em></span></a>
    <a class="side-home settings-link" href="/spa.html#/settings" aria-label="Настройки аккаунта"><span class="badge">SET</span><span class="pn"><b>Настройки</b><em>Профиль и безопасность</em></span></a>
    <div class="side-home help-link" aria-disabled="true"><span class="badge">HLP</span><span class="pn"><b>Помощь</b><em>Скоро</em></span></div>
    <div class="side-home tariffs-link" aria-disabled="true"><span class="badge">TRF</span><span class="pn"><b>Тарифы и пакеты</b><em>Скоро</em></span></div>
    <div class="side-home theme-link" aria-disabled="true"><span class="badge">THM</span><span class="pn"><b>Светлая тема</b><em>Скоро</em></span></div>
    <div class="side-divider" role="separator" aria-hidden="true"></div>
    <button class="side-home logout-link" type="button" aria-label="Выйти из аккаунта"><span class="badge">OUT</span><span class="pn"><b>Выйти</b><em>Завершить сеанс</em></span></button>
      </nav></aside><div class="scrim"></div>
    <header><div class="wrap"><button class="mob-toggle" aria-label="Открыть меню" aria-expanded="false"><i class="burger"></i></button><a class="logo" href="/spa.html#/">RAYMONDOVICH</a><a href="/spa.html#/" class="back">Главная</a></div></header>
    <main class="wrap profile-main">
    <p class="eyebrow">Личный кабинет / Профиль</p>
    <h1>Профиль<br>участника.</h1>
    <p class="intro">Основная информация об аккаунте и статусе участия в экосистеме Raymondovich.</p>
    <section class="profile-card" aria-label="Информация профиля">
      <div class="profile-card-head"><span class="profile-code">ACCOUNT / 001</span><span class="profile-state">ПРОФИЛЬ</span></div>
      <div class="profile-identity"><div class="profile-avatar" aria-hidden="true">USR</div><div><p class="profile-caption">Имя и фамилия</p><h2>{{ displayName }}</h2><p class="profile-hint">{{ profileHint }}</p></div></div>
      <div class="profile-fields">
        <div class="profile-field"><span>Статус партнёра</span><strong>Не определён</strong></div>
        <div class="profile-field"><span>Участие в Private</span><strong>Не подключено</strong></div>
        <div class="profile-field"><span>Дата регистрации</span><strong>{{ registrationDate }}</strong></div>
        <div class="profile-field"><span>ID пользователя</span><strong>{{ user?.id || "—" }}</strong></div>
      </div>
      <p class="profile-note">Статус партнёра и подключение RAYMONDOVICH Private будут отображаться после реализации соответствующих модулей.</p>
    </section>
    </main>
    <footer><div class="wrap">© 2026 RAYMONDOVICH — цифровая экосистема.</div></footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { getSession } from "../../../../application/auth/authentication.js";
import { usePublicNavigation } from "../../composables/usePublicNavigation.js";

const root = ref(null);
const user = ref(null);
usePublicNavigation(root);

const displayName = computed(() => {
  const metadata = user.value?.user_metadata || {};
  const full = [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim()
    || metadata.display_name || metadata.full_name || user.value?.email?.split("@")[0];
  return full || "Не указано";
});
const profileHint = computed(() => user.value
  ? "Основные данные загружены из аккаунта. Изменить имя и фамилию можно в настройках."
  : "Войдите в аккаунт, чтобы увидеть персональные данные.");
const registrationDate = computed(() => {
  const value = user.value?.created_at;
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
});

onMounted(async () => {
  try {
    const session = await getSession();
    user.value = session?.user || null;
  } catch {
    user.value = null;
  }
});
</script>

<style scoped src="../../../../design/profile.css"></style>
