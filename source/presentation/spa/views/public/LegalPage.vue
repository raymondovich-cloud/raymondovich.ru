<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();
const pages = {
  privacy: { title: "Политика конфиденциальности", content: "В разработке" },
  terms: { title: "Пользовательское соглашение", content: "В разработке" },
  cookies: { title: "Файлы куки", content: "В разработке" },
  "private-conditions": {
    title: "Условия участия",
    eyebrow: "RAYMONDOVICH | PRIVATE",
    content: "Покупка доступа не гарантирует предоставление проекта или доход. Условия участия и распределение вознаграждения согласовываются отдельно до начала каждого проекта.",
  },
};
const page = computed(() => pages[route.params.slug] || { title: "Документ не найден", content: "Запрошенный документ не найден." });
</script>

<template>
  <main class="legal-page">
    <section class="legal-card">
      <p class="legal-eyebrow">{{ page.eyebrow || "RAYMONDOVICH" }}</p>
      <h1>{{ page.title }}</h1>
      <p>{{ page.content }}</p>
      <RouterLink class="legal-back" to="/">Вернуться на главную</RouterLink>
    </section>
  </main>
</template>

<style scoped src="../../../../design/legal.css"></style>
