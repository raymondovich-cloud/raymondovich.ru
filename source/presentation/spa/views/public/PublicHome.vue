<template>
  <section class="spa-hero">
    <p class="spa-eyebrow">DIGITAL ECOSYSTEM / 2026</p>
    <h1>Создаём.<br /><span>Развиваем.</span><br />Масштабируем.</h1>
    <p class="spa-lead">
      Платформа Raymondovich объединяет собственные продукты, партнёрские инициативы
      и отобранные внешние проекты.
    </p>
    <div class="spa-actions">
      <RouterLink class="spa-primary" to="/partner">Стать партнёром</RouterLink>
      <RouterLink class="spa-secondary" to="/owner">Вход владельца</RouterLink>
    </div>
    <p class="spa-notice">Технический SPA-контур. Публичный контент переносится отдельным этапом.</p>
  </section>
</template>

<script setup>
import { RouterLink } from "vue-router";
</script>
