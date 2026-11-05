import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        spa: "spa.html",
        about: "pages/about/about.html",
        products: "pages/products/products.html",
        cooperation: "pages/cooperation/cooperation.html",
        profile: "pages/profile/profile.html",
        settings: "pages/settings/settings.html",
        ownerApp: "pages/account/app.html",
        auth: "pages/auth/auth.html",
        register: "pages/auth/register.html",
        authCallback: "pages/auth/auth-callback.html",
        resetPassword: "pages/auth/reset-password.html",
        updatePassword: "pages/auth/update-password.html",
        legalCookies: "pages/legal/cookies.html",
        legalPrivacy: "pages/legal/privacy.html",
        legalTerms: "pages/legal/terms.html",
        privateConditions: "pages/legal/private-conditions.html",
      },
    },
  },
});
