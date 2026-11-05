import { createRouter, createWebHashHistory } from "vue-router";
import { getRole, getSession } from "../../runtime/auth.js";

const PublicHome = () => import("../views/public/PublicHome.vue");
const NotFound = () => import("../views/system/NotFound.vue");
const Products = () => import("../views/public/Products.vue");
const Cooperation = () => import("../views/public/Cooperation.vue");
const About = () => import("../views/public/About.vue");
const Profile = () => import("../views/public/Profile.vue");
const Settings = () => import("../views/public/Settings.vue");
const LegalPage = () => import("../views/public/LegalPage.vue");
const AuthView = () => import("../views/public/AuthView.vue");

export const routeRecords = [
  {
    path: "/",
    name: "public-home",
    component: PublicHome,
    meta: { space: "public", layout: "standalone", title: "RAYMONDOVICH" },
  },
  {
    path: "/products",
    alias: "/pages/products/products.html",
    name: "products",
    component: Products,
    meta: { space: "public", layout: "standalone", title: "Продукты экосистемы — RAYMONDOVICH" },
  },
  {
    path: "/cooperation",
    alias: "/pages/cooperation/cooperation.html",
    name: "cooperation",
    component: Cooperation,
    meta: { space: "public", layout: "standalone", title: "Три формата развития проектов — RAYMONDOVICH" },
  },
  {
    path: "/about",
    alias: "/pages/about/about.html",
    name: "about",
    component: About,
    meta: { space: "public", layout: "standalone", title: "Подход к разработке — RAYMONDOVICH" },
  },
  {
    path: "/profile",
    alias: "/pages/profile/profile.html",
    name: "profile",
    component: Profile,
    meta: { space: "public", layout: "standalone", title: "Профиль — RAYMONDOVICH" },
  },
  {
    path: "/settings",
    alias: "/pages/settings/settings.html",
    name: "settings",
    component: Settings,
    meta: { space: "public", layout: "standalone", title: "Настройки — RAYMONDOVICH" },
  },
  {
    path: "/legal/:slug",
    alias: "/pages/legal/:slug.html",
    name: "legal-document",
    component: LegalPage,
    meta: { space: "public", layout: "standalone", title: "Документы — RAYMONDOVICH" },
  },
  {
    path: "/auth/login",
    alias: "/pages/auth/auth.html",
    name: "auth-login",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "login", title: "Вход — RAYMONDOVICH" },
  },
  {
    path: "/auth/register",
    alias: "/pages/auth/register.html",
    name: "auth-register",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "register", title: "Регистрация — RAYMONDOVICH" },
  },
  {
    path: "/auth/reset-password",
    alias: "/pages/auth/reset-password.html",
    name: "auth-reset",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "reset", title: "Сброс пароля — RAYMONDOVICH" },
  },
  {
    path: "/auth/update-password",
    alias: "/pages/auth/update-password.html",
    name: "auth-update",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "update", title: "Новый пароль — RAYMONDOVICH" },
  },
  {
    path: "/auth/callback",
    alias: "/pages/auth/auth-callback.html",
    name: "auth-callback",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "callback", title: "Авторизация — RAYMONDOVICH" },
  },
  {
    path: "/owner",
    alias: "/pages/account/app.html",
    name: "owner-overview",
    component: () => import("../views/owner/OwnerOverview.vue"),
    meta: { space: "owner", layout: "standalone", requiresAuth: true, title: "Owner Control Center" },
  },
  {
    path: "/partner",
    name: "partner-workspace",
    component: () => import("../views/partner/PartnerWorkspace.vue"),
    meta: { space: "partner", requiresAuth: true, title: "Partner Workspace" },
  },
  {
    path: "/external/:projectId",
    name: "external-project",
    component: () => import("../views/external/ExternalProjectWorkspace.vue"),
    meta: { space: "external", requiresAuth: true, title: "External Project Workspace" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFound,
    meta: { space: "system", title: "Страница не найдена" },
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: routeRecords,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  let session;
  try {
    session = await getSession();
  } catch {
    return { name: "auth-login", query: { redirect: to.fullPath } };
  }

  if (!session) {
    return { name: "auth-login", query: { redirect: to.fullPath } };
  }

  if (to.meta.space === "owner" && getRole(session) !== "admin") {
    return { name: "public-home" };
  }

  return true;
});

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title;
});
