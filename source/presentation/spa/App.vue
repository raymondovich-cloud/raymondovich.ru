<script setup>
import { computed } from "vue";
import { useRoute, RouterLink, RouterView } from "vue-router";

const route = useRoute();
const spaceLabel = computed(() => ({
  public: "PUBLIC SPACE",
  owner: "OWNER CONTROL CENTER",
  partner: "PARTNER WORKSPACE",
  external: "EXTERNAL PROJECT WORKSPACE",
  system: "SYSTEM",
}[route.meta.space] || "RAYMONDOVICH"));
</script>

<template>
  <div class="spa-shell">
    <header class="spa-header">
      <RouterLink class="spa-brand" to="/">RAYMONDOVICH</RouterLink>
      <span class="spa-context">{{ spaceLabel }}</span>
      <RouterLink class="spa-login" to="/owner">OWNER ACCESS</RouterLink>
    </header>
    <main class="spa-main">
      <RouterView />
    </main>
    <footer class="spa-footer">RAYMONDOVICH DIGITAL ECOSYSTEM</footer>
  </div>
</template>
