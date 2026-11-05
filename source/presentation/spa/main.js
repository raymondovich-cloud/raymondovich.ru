import "./legacy-hash-compat.js";
import { createApp } from "vue";
import { router } from "./router/routes.js";
import App from "./App.vue";
import "../../design/spa.css";

createApp(App).use(router).mount("#app");
