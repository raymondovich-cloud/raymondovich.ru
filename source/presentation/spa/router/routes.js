import { createRouter, createWebHashHistory } from "vue-router";
import { getRole, getSession } from "../../../application/auth/authentication.js";

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
    name: "products",
    component: Products,
    meta: { space: "public", layout: "standalone", title: "Продукты экосистемы — RAYMONDOVICH" },
  },
  {
    path: "/cooperation",
    name: "cooperation",
    component: Cooperation,
    meta: { space: "public", layout: "standalone", title: "Три формата развития проектов — RAYMONDOVICH" },
  },
  {
    path: "/about",
    name: "about",
    component: About,
    meta: { space: "public", layout: "standalone", title: "Подход к разработке — RAYMONDOVICH" },
  },
  {
    path: "/profile",
    name: "profile",
    component: Profile,
    meta: { space: "public", layout: "standalone", title: "Профиль — RAYMONDOVICH" },
  },
  {
    path: "/settings",
    name: "settings",
    component: Settings,
    meta: { space: "public", layout: "standalone", title: "Настройки — RAYMONDOVICH" },
  },
  {
    path: "/legal/:slug",
    name: "legal-document",
    component: LegalPage,
    meta: { space: "public", layout: "standalone", title: "Документы — RAYMONDOVICH" },
  },
  {
    path: "/auth/login",
    name: "auth-login",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "login", title: "Вход — RAYMONDOVICH" },
  },
  {
    path: "/auth/register",
    name: "auth-register",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "register", title: "Регистрация — RAYMONDOVICH" },
  },
  {
    path: "/auth/reset-password",
    name: "auth-reset",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "reset", title: "Сброс пароля — RAYMONDOVICH" },
  },
  {
    path: "/auth/update-password",
    name: "auth-update",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "update", title: "Новый пароль — RAYMONDOVICH" },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: AuthView,
    meta: { space: "auth", layout: "standalone", authMode: "callback", title: "Авторизация — RAYMONDOVICH" },
  },
  {
    path: "/owner",
    name: "owner-overview",
    component: () => import("../views/owner/OwnerOverview.vue"),
    meta: { space: "owner", requiresAuth: true, title: "Owner Control Center" },
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
    window.location.replace("/pages/auth/auth.html");
    return false;
  }

  if (!session) {
    window.location.replace("/pages/auth/auth.html");
    return false;
  }

  if (to.meta.space === "owner" && getRole(session) !== "admin") {
    return { name: "public-home" };
  }

  return true;
});

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title;
});
