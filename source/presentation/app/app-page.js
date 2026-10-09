// version 1.7
import { getSession, getRole, logout } from "../../application/auth/authentication.js";

const accessLabel = document.querySelector("#access-label");
const appTitle = document.querySelector("#app-title");
const blocks = document.querySelector("#blocks");
const settingsButton = document.querySelector("#settings-button");
const accountPanelBackdrop = document.querySelector("#account-panel-backdrop");
const accountPanelClose = document.querySelector("#account-panel-close");
const accountName = document.querySelector("#account-name");
const accountEmail = document.querySelector("#account-email");
const accountCreatedAt = document.querySelector("#account-created-at");
const accountStatus = document.querySelector("#account-status");
const logoutButton = document.querySelector("#logout-button");

function formatRegistrationDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function render(role, user) {
  const admin = role === "admin";
  accessLabel.textContent = admin ? "ADMINISTRATOR" : "USER";
  appTitle.textContent = admin ? "Raymondovich Control" : "Raymondovich";
  blocks.innerHTML = "";

  const names = admin
    ? ["Аналитика продуктов", "Документация", "Проекты", "Инструменты", "Маркетинг", "Стратегия", "Идеи"]
    : ["Мои продукты", "Мой профиль", "Мои данные"];

  for (const name of names) {
    const item = document.createElement("section");
    item.className = "app-block";
    item.innerHTML = "<span>" + name + "</span><small>" + (admin ? "ADMIN BLOCK" : "USER BLOCK") + "</small>";
    if (admin && name === "Инструменты") {\n      item.setAttribute("role", "button");\n      item.tabIndex = 0;\n      item.addEventListener("click", () => window.location.href = "./tools.html");\n      item.addEventListener("keydown", (event) => {\n        if (event.key === "Enter" || event.key === " ") window.location.href = "./tools.html";\n      });\n    }\n    if (admin && name === "Проекты") {
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.addEventListener("click", () => window.location.href = "./projects.html");
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") window.location.href = "./projects.html";
      });
    }
    blocks.appendChild(item);
  }

  accountName.textContent = user.user_metadata?.display_name || "Не указано";
  accountEmail.textContent = user.email || "—";
  accountCreatedAt.textContent = formatRegistrationDate(user.created_at);
  accountStatus.textContent = "Активен";
}

function openAccountPanel() {
  accountPanelBackdrop.hidden = false;
  settingsButton.setAttribute("aria-expanded", "true");
}

function closeAccountPanel() {
  accountPanelBackdrop.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}

async function init() {
  const session = await getSession();
  if (!session) { window.location.replace("./auth.html"); return; }
  render(getRole(session), session.user);
}

settingsButton.addEventListener("click", openAccountPanel);
accountPanelClose.addEventListener("click", closeAccountPanel);
accountPanelBackdrop.addEventListener("click", (event) => { if (event.target === accountPanelBackdrop) closeAccountPanel(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !accountPanelBackdrop.hidden) closeAccountPanel(); });
logoutButton.addEventListener("click", async () => { await logout(); window.location.replace("./auth.html"); });
init();
