// version 1.2
import { getSession, getRole, logout } from "../../application/auth/authentication.js";
import { supabase } from "../../infrastructure/supabase/client.js";

const accessLabel = document.querySelector("#access-label");
const appTitle = document.querySelector("#app-title");
const blocks = document.querySelector("#blocks");
const logoutButton = document.querySelector("#logout-button");

function render(role, email) {
  const admin = role === "admin";

  accessLabel.textContent = admin ? "ADMINISTRATOR" : "USER";
  appTitle.textContent = admin ? "Raymondovich Control" : "Raymondovich";
  blocks.innerHTML = "";

  const names = admin
    ? ["Продукты", "Маркетинг", "Стратегия", "Идеи", "Аналитика продуктов", "Документация"]
    : ["Мои продукты", "Мой профиль", "Мои данные"];

  for (const name of names) {
    const item = document.createElement("section");
    item.className = "app-block";
    item.innerHTML = `<span>${name}</span><small>${admin ? "ADMIN BLOCK" : "USER BLOCK"}</small>`;
    blocks.appendChild(item);
  }

  document.querySelector("#account-email").textContent = email;
}

async function init() {
  const session = await getSession();

  if (!session) {
    window.location.replace("./auth.html");
    return;
  }

  const role = getRole(session);
  render(role, session.user.email || "");
}

logoutButton.addEventListener("click", async () => {
  await logout();
  window.location.replace("./auth.html");
});

init();
