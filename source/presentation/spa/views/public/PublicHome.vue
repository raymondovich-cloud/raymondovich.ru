<template>
  <div ref="root" class="public-site">
    <aside class="side" id="side" aria-label="Основная навигация">
      <div class="side-top"><button class="side-toggle" aria-label="Открыть или закрыть меню" aria-expanded="false"><i class="burger"></i></button><span class="side-brand"><strong>RAYMONDOVICH</strong><em>Навигация</em></span></div>
      <nav class="side-body" aria-label="Основные разделы">
        <RouterLink class="side-home" to="/" aria-label="Главная страница raymondovich.ru" aria-current="page"><span class="badge">HOME</span><span class="pn"><b>Главная страница</b><em>Обзор платформы</em></span></RouterLink>
        <RouterLink class="side-home" to="/products" aria-label="Продукты экосистемы"><span class="badge">PRD</span><span class="pn"><b>Продукты экосистемы</b><em>Каталог продуктов</em></span></RouterLink>
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
      </nav>
    </aside>
    <div class="scrim"></div>
    <header>
      <div class="wrap">
        <button class="mob-toggle" aria-label="Продукты" aria-expanded="false"><i class="burger"></i></button><a class="logo" href="#top">RAYMONDOVICH</a>
        <nav aria-label="Разделы"><a href="#private">Private</a><a href="#contact">Контакты</a></nav>
        <a class="login" href="/pages/auth/auth.html">Войти</a>
      </div>
    </header>
    
    <main id="top">
      <div class="hero">
        <div class="wrap">
          <div>
            <div class="label">Цифровая экосистема</div>
            <h1>Продукты, которые мы строим. <span>Проекты, которые растут вместе.</span></h1>
            <p class="lead">RAYMONDOVICH — платформа для создания, развития и продвижения цифровых проектов. Мы самостоятельно разрабатываем собственные продукты, открываем отдельные проекты для участия партнёров и рассматриваем перспективные разработки независимых авторов. Здесь объединяются идеи, проекты и люди, готовые вместе создавать и развивать новые продукты.</p>
            
          </div>
          
        </div>
      </div>
    
      
    
      <section class="private" id="private">
        <div class="wrap">
          <div class="label">Закрытое пространство</div>
          <h2>RAYMONDOVICH Private</h2>
          <p class="intro">Закрытое пространство для участия в партнёрских проектах экосистемы: доступ к коммерческим предложениям и прямая связь с представителями.</p>
          <div class="pr"><strong>4 990 ₽</strong><span>Единоразовая оплата / бессрочный доступ</span></div>
          <a class="btn" href="/pages/legal/private-conditions.html">Условия участия</a>
        </div>
      </section>
    
      
    
      <section class="final" id="contact">
        <div class="wrap">
          <h2>Есть проект или вопрос?</h2>
          <p class="lead">Напишите нам: обсудим партнёрство или рассмотрим ваш проект.</p>
          <div class="btns"><a class="btn" href="https://t.me/BillionsMone">Написать в Telegram</a><a class="lnk" href="https://www.instagram.com/raymondovich.ru">Instagram</a><a class="lnk" href="https://youtube.com/@raymondovichru">YouTube</a></div>
        </div>
      </section>
    </main>
    
    <footer>
      <div class="wrap">
        <div>© 2026 raymondovich.ru (Раймондович.ру). Все права защищены.</div>
        <nav aria-label="Документы">
          <a href="/pages/legal/privacy.html">Политика конфиденциальности</a>
          <a href="/pages/legal/terms.html">Пользовательское соглашение</a>
          <a href="/pages/legal/cookies.html">Файлы куки</a>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { signOutAccount } from "../../../../application/account/account-session.js";

const root = ref(null);
let cleanups = [];

function listen(element, event, handler) {
  if (!element) return;
  element.addEventListener(event, handler);
  cleanups.push(() => element.removeEventListener(event, handler));
}

function setSidebar(open) {
  const element = root.value;
  if (!element) return;
  element.classList.toggle("side-open", open);
  element.querySelector(".side-toggle")?.setAttribute("aria-expanded", String(open));
  element.querySelector(".mob-toggle")?.setAttribute("aria-expanded", String(open));
}

function closeExpandedSections() {
  root.value?.querySelectorAll(".side details[open]").forEach((section) => {
    section.open = false;
  });
}

async function logout() {
  const button = root.value?.querySelector(".logout-link");
  const label = button?.querySelector(".pn b");
  if (!button || !label) return;
  const originalLabel = label.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  label.textContent = "Выходим…";
  try {
    await signOutAccount();
    window.location.assign("/spa.html#/");
  } catch (error) {
    label.textContent = originalLabel;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    window.alert(error.message || "Не удалось выйти из аккаунта. Попробуйте ещё раз.");
  }
}

function onKeydown(event) {
  if (event.key === "Escape") setSidebar(false);
}

onMounted(() => {
  const element = root.value;
  const sideToggle = element.querySelector(".side-toggle");
  const mobileToggle = element.querySelector(".mob-toggle");
  const scrim = element.querySelector(".scrim");
  listen(sideToggle, "click", () => setSidebar(!element.classList.contains("side-open")));
  listen(mobileToggle, "click", () => setSidebar(!element.classList.contains("side-open")));
  listen(scrim, "click", () => setSidebar(false));

  element.querySelectorAll("[data-open-side]").forEach((link) => {
    listen(link, "click", (event) => {
      event.preventDefault();
      setSidebar(true);
    });
  });

  element.querySelectorAll(".side summary").forEach((summary) => {
    listen(summary, "click", (event) => {
      if (!element.classList.contains("side-open")) {
        event.preventDefault();
        setSidebar(true);
        summary.parentElement.open = true;
      }
    });
  });

  element.querySelectorAll("a.side-home[href]").forEach((link) => {
    listen(link, "click", closeExpandedSections);
  });

  element.querySelectorAll(".tablist [role=tab]").forEach((tab) => {
    listen(tab, "click", () => {
      element.querySelectorAll(".tablist [role=tab]").forEach((item) => {
        const active = item === tab;
        item.setAttribute("aria-selected", String(active));
        const panel = element.querySelector("#" + item.getAttribute("aria-controls"));
        if (panel) panel.hidden = !active;
      });
    });
  });

  listen(element.querySelector(".logout-link"), "click", logout);
  listen(document, "keydown", onKeydown);
  if (window.innerWidth > 1100) setSidebar(true);
});

onBeforeUnmount(() => cleanups.forEach((cleanup) => cleanup()));
</script>

<style scoped src="../../../../design/public.css"></style>
