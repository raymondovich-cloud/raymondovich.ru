<template>
  <div ref="root" class="products-page">
    <aside class="side" id="side" aria-label="Основная навигация"><div class="side-top"><button class="side-toggle" aria-label="Открыть или закрыть меню" aria-expanded="false"><i class="burger"></i></button><span class="side-brand"><strong>RAYMONDOVICH</strong><em>Навигация</em></span></div>
    <nav class="side-body" aria-label="Основные разделы"><RouterLink class="side-home" to="/" aria-label="Главная страница raymondovich.ru"><span class="badge">HOME</span><span class="pn"><b>Главная страница</b><em>Обзор платформы</em></span></RouterLink><RouterLink class="side-home" to="/products" aria-current="page" aria-label="Продукты экосистемы"><span class="badge">PRD</span><span class="pn"><b>Продукты экосистемы</b><em>Каталог продуктов</em></span></RouterLink>
    <RouterLink class="side-home" to="/cooperation" aria-label="Форматы сотрудничества"><span class="badge">COOP</span><span class="pn"><b>Форматы сотрудничества</b><em>Три формата</em></span></RouterLink>
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
    <RouterLink class="side-home profile-link" to="/profile" aria-label="Профиль пользователя"><span class="badge">USR</span><span class="pn"><b>Профиль</b><em>Личный кабинет</em></span></RouterLink>
    <RouterLink class="side-home settings-link" to="/settings" aria-label="Настройки аккаунта"><span class="badge">SET</span><span class="pn"><b>Настройки</b><em>Профиль и безопасность</em></span></RouterLink>
    <div class="side-home help-link" aria-disabled="true"><span class="badge">HLP</span><span class="pn"><b>Помощь</b><em>Скоро</em></span></div>
    <div class="side-home tariffs-link" aria-disabled="true"><span class="badge">TRF</span><span class="pn"><b>Тарифы и пакеты</b><em>Скоро</em></span></div>
    <div class="side-home theme-link" aria-disabled="true"><span class="badge">THM</span><span class="pn"><b>Светлая тема</b><em>Скоро</em></span></div>
    <div class="side-divider" role="separator" aria-hidden="true"></div>
    <button class="side-home logout-link" type="button" aria-label="Выйти из аккаунта"><span class="badge">OUT</span><span class="pn"><b>Выйти</b><em>Завершить сеанс</em></span></button>
      </nav></aside><div class="scrim"></div>
    <header><div class="wrap"><button class="mob-toggle" aria-label="Открыть меню" aria-expanded="false"><i class="burger"></i></button><RouterLink class="logo" to="/">RAYMONDOVICH</RouterLink><RouterLink to="/" class="back">Главная</RouterLink></div></header>
    <main class="wrap"><p class="eyebrow">Каталог / Направления</p><h1>Продукты<br>экосистемы.</h1><p class="intro">Три направления, объединяющие собственную разработку, партнёрство и независимые цифровые продукты.</p>
    <section class="categories" aria-label="Категории продуктов">
    <article class="category" id="ecosystem"><span class="number">01 / OWN</span><div><h2>Продукты экосистемы</h2><p>Собственные цифровые продукты и разработки Raymondovich, которые мы создаём и развиваем самостоятельно.</p></div></article>
    <article class="category" id="partners"><span class="number">02 / PARTNERS</span><div><h2>Партнёрские проекты</h2><p>Проекты, к развитию и продвижению которых можно присоединиться в качестве партнёра на согласованных условиях.</p></div></article>
    <article class="category" id="external"><span class="number">03 / EXTERNAL</span><div><h2>Проекты сторонних разработчиков</h2><p>Независимые продукты авторов и команд, которые рассматриваются для сотрудничества и размещаются после обсуждения проекта и согласования условий.</p></div></article></section></main>
    <footer><div class="wrap">© 2026 RAYMONDOVICH — цифровая экосистема.</div></footer>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { usePublicNavigation } from "../../composables/usePublicNavigation.js";

const root = ref(null);
usePublicNavigation(root);
</script>

<style scoped src="../../../../design/products.css"></style>
