// version 1.0
import { logout } from "../runtime/auth.js";

const logoutButton = document.querySelector(".logout-link");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.setAttribute("aria-busy", "true");
    const label = logoutButton.querySelector(".pn b");
    const originalLabel = label.textContent;
    label.textContent = "Выходим…";

    try {
      await logout();
      window.location.assign("/");
    } catch (error) {
      label.textContent = originalLabel;
      logoutButton.disabled = false;
      logoutButton.removeAttribute("aria-busy");
      window.alert(error.message || "Не удалось выйти из аккаунта. Попробуйте ещё раз.");
    }
  });
}
