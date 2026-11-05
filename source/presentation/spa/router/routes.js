import { createRouter, createWebHashHistory } from "vue-router";

const PublicHome = () => import("../views/public/PublicHome.vue");
const NotFound = () => import("../views/system/NotFound.vue");

export const routeRecords = [
  {
    path: "/",
    name: "public-home",
    component: PublicHome,
    meta: { space: "public", layout: "standalone", title: "RAYMONDOVICH" },
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
